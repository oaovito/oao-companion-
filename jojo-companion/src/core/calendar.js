// Google Agenda (somente leitura) pelo "endereço secreto no formato iCal" que a
// usuária copia das configurações da agenda. Puro: interpreta o .ics e calcula
// os próximos compromissos; quem busca o arquivo é o processo principal.

/** É um endereço iCal secreto do Google Agenda? */
export function isGoogleIcalUrl(url) {
  return /^https:\/\/calendar\.google\.com\/calendar\/ical\/[^\s/]+\/(private-[0-9a-f]+|public)\/basic\.ics$/i.test(String(url || '').trim());
}

/** Acha um endereço iCal do Google dentro de um texto colado no chat. */
export function findIcalUrl(text) {
  const m = String(text || '').match(/https:\/\/calendar\.google\.com\/calendar\/ical\/\S+?\/basic\.ics/i);
  return m && isGoogleIcalUrl(m[0]) ? m[0] : null;
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
