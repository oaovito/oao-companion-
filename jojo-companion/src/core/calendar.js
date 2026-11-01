// Agenda (somente leitura) do Google ou do iCloud. Google: "endereço secreto no
// formato iCal" das configurações da agenda. iCloud: link do "Calendário público"
// (webcal://pNN-caldav.icloud.com/published/…). Puro: interpreta o .ics e calcula
// os próximos compromissos; quem busca o arquivo é o processo principal.

/** É um endereço iCal secreto do Google Agenda? */
export function isGoogleIcalUrl(url) {
  return /^https:\/\/calendar\.google\.com\/calendar\/ical\/[^\s/]+\/(private-[0-9a-f]+|public)\/basic\.ics$/i.test(String(url || '').trim());
}

const ICLOUD_RE = /^https:\/\/(p\d+-)?(caldav|calendarws|calendars)\.icloud\.com\/(published\/\d+|ca\/subscribe\/\d+)\/[A-Za-z0-9_-]{8,}$/i;

/** É o link de um calendário público do iCloud (já em https)? */
export function isIcloudIcalUrl(url) {
  return ICLOUD_RE.test(String(url || '').trim());
}

/** webcal:// (como o iPhone copia) vira https://; o resto fica igual. */
export function normalizeCalendarUrl(url) {
  return String(url || '').trim().replace(/^webcals?:\/\//i, 'https://');
}

/** Endereço de agenda aceito (Google ou iCloud)? Aceita webcal://. */
export function isCalendarUrl(url) {
  const u = normalizeCalendarUrl(url);
  return isGoogleIcalUrl(u) || isIcloudIcalUrl(u);
}

/** 'google' | 'icloud' | null */
export function calendarProvider(url) {
  const u = normalizeCalendarUrl(url);
  if (isGoogleIcalUrl(u)) return 'google';
  if (isIcloudIcalUrl(u)) return 'icloud';
  return null;
}

/** Acha um endereço de agenda (Google ou iCloud) num texto colado no chat; devolve em https. */
export function findIcalUrl(text) {
  const t = String(text || '');
  const g = t.match(/https:\/\/calendar\.google\.com\/calendar\/ical\/\S+?\/basic\.ics/i);
  if (g && isGoogleIcalUrl(g[0])) return g[0];
  const i = t.match(/(webcals?|https):\/\/[a-z0-9-]*\.?icloud\.com\/[^\s"'<>]+/i);
  if (i) {
    const u = normalizeCalendarUrl(i[0]).replace(/[).,;!?]+$/, '');
    if (isIcloudIcalUrl(u)) return u;
  }
  return null;
}

function unfold(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function unescape(v) {
  return v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
}

/**
 * Data do iCal → {date, allDay}. Z = UTC; TZID ou sem fuso = horário local
 * (o PC dela está no mesmo fuso da agenda na prática).
 */
export function parseIcsDate(value, params = '') {
  const v = String(value || '').trim();
  let m = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m || /VALUE=DATE(?!-)/i.test(params)) {
    m = m || v.match(/^(\d{4})(\d{2})(\d{2})/);
    return { date: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])), allDay: true };
  }
  m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map(Number);
  const date = m[7] ? new Date(Date.UTC(y, mo - 1, d, h, mi, s)) : new Date(y, mo - 1, d, h, mi, s);
  return { date, allDay: false };
}

/** Interpreta o .ics: lista de eventos {uid, titulo, inicio, fim, diaInteiro, local, rrule, exdates}. */
export function parseIcs(text) {
  const events = [];
  let cur = null;
  for (const line of unfold(text).split('\n')) {
    if (line === 'BEGIN:VEVENT') {
      cur = { exdates: [] };
      continue;
    }
    if (line === 'END:VEVENT') {
      if (cur && cur.inicio && cur.status !== 'CANCELLED') {
        if (!cur.fim) cur.fim = new Date(cur.inicio.getTime() + (cur.diaInteiro ? 86400e3 : 3600e3));
        events.push(cur);
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const [name, ...params] = line.slice(0, i).split(';');
    const value = line.slice(i + 1);
    const p = params.join(';');
    if (name === 'UID') cur.uid = value.trim();
    else if (name === 'SUMMARY') cur.titulo = unescape(value).slice(0, 120);
    else if (name === 'LOCATION') cur.local = unescape(value).slice(0, 120);
    else if (name === 'STATUS') cur.status = value.trim().toUpperCase();
    else if (name === 'RRULE') cur.rrule = value.trim();
    else if (name === 'DTSTART' || name === 'DTEND') {
      const d = parseIcsDate(value, p);
      if (!d) continue;
      if (name === 'DTSTART') {
        cur.inicio = d.date;
        cur.diaInteiro = d.allDay;
      } else cur.fim = d.date;
    } else if (name === 'EXDATE') {
      for (const x of value.split(',')) {
        const d = parseIcsDate(x, p);
        if (d) cur.exdates.push(d.date.getTime());
      }
    }
  }
  return events.map((e) => ({ ...e, titulo: e.titulo || '(sem título)' }));
}

const DAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/** Ocorrências de um evento dentro de [de, ate] (repetições diárias, semanais, mensais e anuais). */
export function occurrences(ev, de, ate) {
  const dur = ev.fim - ev.inicio;
  const out = [];
  const push = (start) => {
    if (ev.exdates.includes(start.getTime())) return;
    const end = new Date(start.getTime() + dur);
    if (end > de && start < ate) out.push({ ...ev, inicio: start, fim: end });
  };
  if (!ev.rrule) {
    push(ev.inicio);
    return out;
  }
  const r = Object.fromEntries(ev.rrule.split(';').map((kv) => kv.split('=')));
  const freq = r.FREQ;
  const interval = Math.max(1, Number(r.INTERVAL) || 1);
  const count = r.COUNT ? Number(r.COUNT) : Infinity;
  const until = r.UNTIL ? (parseIcsDate(r.UNTIL) || {}).date : null;
  const byday = r.BYDAY ? r.BYDAY.split(',').map((d) => DAYS[d.slice(-2)]).filter((d) => d !== undefined) : null;
  let n = 0;
  const base = ev.inicio;
  for (let k = 0; k < 2000 && n < count; k++) {
    let starts = [];
    if (freq === 'DAILY') starts = [new Date(base.getFullYear(), base.getMonth(), base.getDate() + k * interval, base.getHours(), base.getMinutes(), base.getSeconds())];
    else if (freq === 'WEEKLY') {
      const weekStart = new Date(base.getFullYear(), base.getMonth(), base.getDate() - base.getDay() + k * 7 * interval, base.getHours(), base.getMinutes(), base.getSeconds());
      starts = (byday || [base.getDay()]).sort((a, b) => a - b).map((d) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + d, base.getHours(), base.getMinutes(), base.getSeconds()));
    } else if (freq === 'MONTHLY') starts = [new Date(base.getFullYear(), base.getMonth() + k * interval, base.getDate(), base.getHours(), base.getMinutes(), base.getSeconds())];
    else if (freq === 'YEARLY') starts = [new Date(base.getFullYear() + k * interval, base.getMonth(), base.getDate(), base.getHours(), base.getMinutes(), base.getSeconds())];
    else {
      push(base);
      break;
    }
    for (const s of starts) {
      if (s < base) continue;
      if ((until && s > until) || n >= count) return out;
      n++;
      push(s);
    }
    if (starts.length && starts[0] > ate) break;
  }
  return out;
}

/** Compromissos entre `de` e `ate`, em ordem. */
export function agendaBetween(events, de, ate) {
  return events.flatMap((e) => occurrences(e, de, ate)).sort((a, b) => a.inicio - b.inicio);
}

/** Compromissos de hoje (do início ao fim do dia de `now`). */
export function agendaDoDia(events, now = new Date()) {
  const ini = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return agendaBetween(events, ini, new Date(ini.getTime() + 86400e3));
}

export function hhmm(d) {
  return `${String(d.getHours()).padStart(2, '0')}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`;
}

/** Datas e estado de uma consulta de agenda. Nunca confundir lista de tarefas com calendario. */
export function calendarRequest(text, now = new Date()) {
  const n = String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/agenda 2030|o que e (?:uma |a )?agenda|como funciona (?:uma |a )?agenda/.test(n)) return null;
  if (!/\b(agenda|calendario|compromissos?)\b|\b(?:o que|oque|que) (?:eu )?tenho (?:hoje|amanha)\b|\bon my calendar\b/.test(n)) return null;
  if (/\b(linkad|conectad|vinculad|sincronizad)\w*\b|\b(status|estado|conexao)\b/.test(n)) return { kind: 'status' };
  if (/proximo compromisso/.test(n)) return { kind: 'next', from: now, to: new Date(now.getTime() + 90 * 86400e3), label: 'Próximo compromisso' };
  let date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (/amanha/.test(n)) date.setDate(date.getDate() + (/depois de amanha/.test(n) ? 2 : 1));
  const iso = n.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  const br = n.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if (iso || br) {
    const y = Number(iso ? iso[1] : br[3] || now.getFullYear());
    const m = Number(iso ? iso[2] : br[2]); const d = Number(iso ? iso[3] : br[1]);
    date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return { kind: 'invalid' };
  }
  if (/semana/.test(n)) {
    date.setDate(date.getDate() - (date.getDay() + 6) % 7 + (/proxima semana|semana que vem/.test(n) ? 7 : 0));
    const to = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
    return { kind: 'week', from: date, to, label: `Semana de ${date.toLocaleDateString('pt-BR')}` };
  }
  const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const weekday = days.findIndex((day) => new RegExp(`\\b${day}(?:-feira)?\\b`).test(n));
  if (weekday >= 0 && !iso && !br) date.setDate(date.getDate() + ((weekday - date.getDay() + 7) % 7 || (/proxim/.test(n) ? 7 : 0)));
  return { kind: 'day', from: date, to: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1), label: date.toDateString() === now.toDateString() ? 'Hoje' : date.toLocaleDateString('pt-BR') };
}

// Tipo do compromisso pelo título → animação e tom do JoJo.
const KINDS = [
  ['treino', /\b(academia|treino|gym|muscula[cç][aã]o|crossfit|corrida|pilates|nata[cç][aã]o|futebol)\b/i],
  ['saude', /\b(m[eé]dic[oa]|consulta|exame|dentista|terapia|psic[oó]log[oa]|hospital|cl[ií]nica|vacina)\b/i],
  ['reuniao', /\b(reuni[aã]o|meeting|call|1:1|daily|alinhamento|entrevista|apresenta[cç][aã]o)\b/i],
  ['estudo', /\b(aula|prova|estudo|curso|faculdade|trabalho de|semin[aá]rio|revis[aã]o)\b/i],
  ['festa', /\b(anivers[aá]rio|festa|niver|happy hour|churrasco|jantar com|show)\b/i],
  ['comida', /\b(almo[cç]o|jantar|caf[eé]|lanche)\b/i],
];
export function eventKind(titulo) {
  for (const [k, re] of KINDS) if (re.test(titulo)) return k;
  return 'outro';
}

/** Animação do catálogo para cada tipo de compromisso. */
export const KIND_ANIMS = { treino: 'duploBiceps', saude: 'lembrete', reuniao: 'modoFoco', estudo: 'lendo', festa: 'comemorar', comida: 'pedirComida', outro: 'lembrete' };

// Falha de rede passageira (PC acabou de ligar/acordar, Wi-Fi caiu): tenta de novo
// em silêncio. Só depois de 1 h seguida sem conseguir é que avisa — sem código técnico.
const REDE = /ERR_(NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|NETWORK_CHANGED|CONNECTION_(RESET|REFUSED|CLOSED|TIMED_OUT|ABORTED)|TIMED_OUT|ADDRESS_UNREACHABLE|NETWORK_IO_SUSPENDED|PROXY_CONNECTION_FAILED)|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|tempo esgotado|fetch failed|HTTP 5\d\d/i;
export const AGENDA_RETENTATIVAS_MS = [30e3, 2 * 60e3, 5 * 60e3];
export const AGENDA_AVISO_APOS_MS = 60 * 60e3;

/** Erro de rede passageiro (tentar de novo calado) ou problema do link (avisar)? */
export function erroDeRede(msg) {
  return REDE.test(String(msg || ''));
}

/** Mensagem para ela, sem código técnico. */
export function mensagemAgenda(msg) {
  const m = String(msg || '');
  if (erroDeRede(m)) return 'Faz um tempo que não consigo falar com a agenda: parece que a internet está fora. Eu continuo tentando sozinho.';
  if (/HTTP 40[134]/.test(m)) return 'A agenda não deixou eu ler: o link pode ter mudado ou deixado de ser público. Cola o link de novo no chat ("conectar agenda").';
  if (/não é uma agenda/.test(m)) return 'Esse link não é de agenda. Cola o link de novo no chat ("conectar agenda").';
  return 'Não consegui ler a agenda agora. Eu tento de novo daqui a pouco.';
}

/**
 * Estado das falhas: decide se avisa e quando tentar de novo.
 * @returns {{avisar: boolean, proximaMs: number}}
 */
export function falhaAgenda(estado, msg, agora = Date.now()) {
  estado.falhas = (estado.falhas || 0) + 1;
  if (estado.falhas === 1) estado.desde = agora;
  const rede = erroDeRede(msg);
  const proximaMs = AGENDA_RETENTATIVAS_MS[Math.min(estado.falhas - 1, AGENDA_RETENTATIVAS_MS.length - 1)];
  return { avisar: !rede || agora - estado.desde >= AGENDA_AVISO_APOS_MS, proximaMs };
}
