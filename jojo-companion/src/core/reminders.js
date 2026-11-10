// Lembretes de água, pausas e remédios. Puro: estado salvo e relógio são
// injetados; nada aqui fala, desenha ou toca som. O companion decide a hora
// certa de mostrar (nunca em Modo Trabalho, foco ou tela cheia) e busca o texto
// no arquivo de falas. Remédio: só o nome e o horário que ela informou — sem
// dose, sem orientação médica.
import { dayKey } from './personality.js';

export const REMINDER_LIMITS = Object.freeze({ remedios: 12, nome: 40, aguaMin: [20, 240], pausaMin: [15, 180], janelaRemedioMin: 180 });
const AGUA_HORAS = [8, 21]; // fora disso ele não cobra água

const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, Math.round(v)));
const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => semAcento(s).replace(/[^a-z0-9:\s/]/g, ' ').replace(/\s+/g, ' ').trim();
const hhmm = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

export function emptyReminders() {
  return { agua: { ativo: true, intervaloMin: 90, ultimo: null }, pausa: { ativo: false, intervaloMin: 50, ultimo: null }, remedios: [] };
}

/** Normaliza o estado salvo; qualquer campo inválido volta ao padrão. */
export function sanitizeReminders(input) {
  const d = emptyReminders();
  const src = input && typeof input === 'object' ? input : {};
  for (const [k, range] of [['agua', REMINDER_LIMITS.aguaMin], ['pausa', REMINDER_LIMITS.pausaMin]]) {
    const s = src[k] && typeof src[k] === 'object' ? src[k] : {};
    if (typeof s.ativo === 'boolean') d[k].ativo = s.ativo;
    if (Number.isFinite(s.intervaloMin)) d[k].intervaloMin = clamp(s.intervaloMin, range);
    if (Number.isFinite(s.ultimo)) d[k].ultimo = s.ultimo;
  }
  const vistos = new Set();
  for (const r of Array.isArray(src.remedios) ? src.remedios : []) {
    if (!r || typeof r.nome !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.hora || '')) continue;
    const nome = r.nome.trim().slice(0, REMINDER_LIMITS.nome);
    const chave = `${semAcento(nome)}@${r.hora}`;
    if (!nome || vistos.has(chave) || d.remedios.length >= REMINDER_LIMITS.remedios) continue;
    vistos.add(chave);
    d.remedios.push({ nome, hora: r.hora, ultimoDia: /^\d{4}-\d{2}-\d{2}$/.test(r.ultimoDia || '') ? r.ultimoDia : null, central: /^\d{4}-\d{2}-\d{2}$/.test(r.central || '') ? r.central : null });
  }
  return d;
}

/** Minutos pedidos no texto ("a cada 45 min", "de hora em hora", "a cada 2 horas") ou null. */
function intervalo(n) {
  if (/\bde hora em hora\b|\ba cada hora\b|\bde 1 em 1 hora\b/.test(n)) return 60;
  const m = n.match(/\b(?:a cada|de)\s+(\d{1,3})\s*(?:em\s+\d{1,3}\s*)?(min\w*|m\b|h\b|horas?)/) || n.match(/^(\d{1,3})\s*(min\w*|m\b|h\b|horas?)?$/);
  if (!m) return null;
  return Number(m[1]) * (/^h/.test(m[2] || '') ? 60 : 1);
}

/** Horário pedido ("às 8h", "as 14:30", "8 da noite") → "HH:MM" ou null. */
function horario(n) {
  const m = n.match(/\b(?:as|a)\s+(\d{1,2})(?:(?::|h)\s*(\d{2}))?\s*(?:h|hs|horas?)?(?:\s+da\s+(manha|tarde|noite))?\s*$/) || n.match(/\b(\d{1,2}):(\d{2})\s*()$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  if (/(tarde|noite)/.test(m[3] || '') && h < 12) h += 12;
  if (h > 23 || min > 59) return null;
  return hhmm(h, min);
}

const PEDE = /\b(me )?(lembr\w*|avis\w*|cobr\w*)\b/;
const PARA = /\b(para|pare|parar|chega|desliga\w*|tira\w*|tire|remov\w*|apag\w*|cancel\w*|nao precisa|nao quero|sem)\b/;

/**
 * Interpreta um pedido de lembrete em linguagem natural. Devolve a ação ou null
 * (não é pedido de lembrete). Não altera nada.
 */
export function parseReminderRequest(text) {
  const n = norm(text);
  if (!n || n.length > 160) return null;
  if (/^(quais (sao )?(os )?meus lembretes|meus lembretes|(lista|listar|mostra|mostrar|ver) (os |meus )?lembretes|que lembretes eu tenho)\b/.test(n)) return { tipo: 'listar' };
  const agua = /\b(agua|hidrat\w*)\b/.test(n);
  const pausa = /\b(pausas?|descans\w*|me levantar|levantar da cadeira|alongar)\b/.test(n);
  const lembrete = /\blembr\w*\b|\bavis\w*\b|\bcobr\w*\b/.test(n);
  if ((agua || pausa) && lembrete) {
    const tipo = agua ? 'agua' : 'pausa';
    if (PARA.test(n) && !/\ba cada\b/.test(n)) return { tipo, ativo: false };
    if (PEDE.test(n)) return { tipo, ativo: true, intervaloMin: intervalo(n) };
  }
  const remedio = /\b(remedio|remedios|medicamento|comprimido|pilula|vitamina\w*|antibiotico|anticoncepcional|tomar)\b/.test(n);
  // Remover: "tira o lembrete do remédio X", "para de me lembrar da vitamina".
  if (remedio && lembrete && PARA.test(n)) {
    const m = n.match(/\b(?:lembrete|lembrar|lembra|avisar|avisa)\b\s+(?:de |do |da |d[oa]s |pra |para )?(?:tomar )?(?:o |a |meu |minha )?(?:remedio |medicamento |comprimido )?(?:de |do |da )?(.+)$/);
    const nome = m ? m[1].replace(/\b(as|a) \d.*$/, '').trim() : '';
    return nome ? { tipo: 'remedioRemover', nome } : null;
  }
  if (remedio && PEDE.test(n)) {
    const hora = horario(n);
    const original = String(text).trim().replace(/[.!?]+$/, '');
    // O nome sai do texto original (com acentos): o trecho entre o pedido e o horário.
    const m = original.match(/(?:lembr\w*|avis\w*|cobr\w*)\s+(?:de\s+|do\s+|da\s+|pra\s+|para\s+)?(?:eu\s+)?(?:tomar\s+)?(?:o\s+|a\s+|meu\s+|minha\s+)?(?:rem[eé]dio\s+|medicamento\s+|comprimido\s+)?(?:de\s+|do\s+|da\s+)?(.*?)(?:\s+(?:[àa]s|a)\s+\d{1,2}.*|\s+\d{1,2}:\d{2}\s*)?$/i);
    const nome = (m ? m[1] : '').replace(/^(o|a|meu|minha)\s+/i, '').trim().slice(0, REMINDER_LIMITS.nome);
    if (!hora) return { tipo: 'remedioSemHora', nome };
    return { tipo: 'remedio', nome: nome || 'Remédio', hora };
  }
  return null;
}

/** Comando "/lembrete …": água, pausa, remédio, remover e lista. */
export function parseReminderCommand(arg) {
  const original = String(arg || '').trim();
  const n = norm(original);
  if (!n || /^(lista|listar|ver|todos)$/.test(n)) return { tipo: 'listar' };
  let m = n.match(/^(agua|pausa)\s*(.*)$/);
  if (m) {
    if (/^(off|desliga\w*|para\w*|nao|sem|tira\w*)$/.test(m[2])) return { tipo: m[1], ativo: false };
    return { tipo: m[1], ativo: true, intervaloMin: intervalo(m[2]) ?? intervalo(`a cada ${m[2]}`) };
  }
  m = original.match(/^(?:remover|tirar|apagar|excluir)\s+(.+)$/i);
  if (m) return { tipo: 'remedioRemover', nome: m[1].trim() };
  m = original.match(/^rem[eé]dio\s+(.+?)\s+(\d{1,2})(?:[:h](\d{2}))?h?$/i);
  if (m) {
    const h = Number(m[2]), min = Number(m[3] || 0);
    if (h > 23 || min > 59) return { tipo: 'invalido' };
    return { tipo: 'remedio', nome: m[1].trim().slice(0, REMINDER_LIMITS.nome), hora: hhmm(h, min) };
  }
  if (/^remedio\b/.test(n)) return { tipo: 'remedioSemHora', nome: original.replace(/^rem[eé]dio\s*/i, '').trim() };
  return { tipo: 'invalido' };
}

export class Reminders {
  constructor({ state = null, save = () => {}, now = () => Date.now() } = {}) {
    this.st = sanitizeReminders(state);
    this.save = save;
    this.now = now;
  }

  _commit() {
    this.save(this.st);
  }

  /**
   * Aplica uma ação interpretada. Devolve {fala, vars} (categoria do arquivo de
   * falas e variáveis) e, na lista, também `itens` (linhas de dados).
   */
  apply(a) {
    if (!a) return null;
    if (a.tipo === 'agua' || a.tipo === 'pausa') {
      const cfg = this.st[a.tipo];
      const range = a.tipo === 'agua' ? REMINDER_LIMITS.aguaMin : REMINDER_LIMITS.pausaMin;
      cfg.ativo = a.ativo;
      if (a.ativo && Number.isFinite(a.intervaloMin)) cfg.intervaloMin = clamp(a.intervaloMin, range);
      if (a.ativo) cfg.ultimo = this.now(); // conta a partir de agora
      this._commit();
      const nome = a.tipo === 'agua' ? 'Agua' : 'Pausa';
      return { fala: `lembrete${nome}${a.ativo ? 'On' : 'Off'}`, vars: { min: cfg.intervaloMin } };
    }
    if (a.tipo === 'remedio') {
      const chave = semAcento(a.nome);
      const igual = this.st.remedios.find((r) => semAcento(r.nome) === chave && r.hora === a.hora);
      if (igual) return { fala: 'lembreteRemedioOn', vars: { remedio: igual.nome, hora: igual.hora } };
      if (this.st.remedios.length >= REMINDER_LIMITS.remedios) return { fala: 'lembreteLimite', vars: { total: REMINDER_LIMITS.remedios } };
      this.st.remedios.push({ nome: a.nome, hora: a.hora, ultimoDia: null, central: null });
      this.st.remedios.sort((x, y) => x.hora.localeCompare(y.hora));
      this._commit();
      return { fala: 'lembreteRemedioOn', vars: { remedio: a.nome, hora: a.hora } };
    }
    if (a.tipo === 'remedioRemover') {
      const alvo = semAcento(a.nome).replace(/[^a-z0-9\s]/g, ' ').trim();
      const fica = this.st.remedios.filter((r) => !alvo || !semAcento(r.nome).includes(alvo));
      if (fica.length === this.st.remedios.length) return { fala: 'lembreteNaoAchei', vars: { remedio: a.nome } };
      const removidos = this.st.remedios.filter((r) => !fica.includes(r));
      this.st.remedios = fica;
      this._commit();
      return { fala: 'lembreteRemedioOff', vars: { remedio: removidos.map((r) => r.nome).join(', ') } };
    }
    if (a.tipo === 'remedioSemHora') return { fala: 'lembreteRemedioHora', vars: { remedio: a.nome || 'esse remédio' } };
    if (a.tipo === 'listar') return { fala: 'lembreteLista', vars: {}, itens: this.lines() };
    return { fala: 'lembreteAjuda', vars: {} };
  }

  /** Linhas de dados para a lista (o tom vem da fala que acompanha). */
  lines() {
    const { agua, pausa, remedios } = this.st;
    return [
      `Água: ${agua.ativo ? `a cada ${agua.intervaloMin} min, das ${AGUA_HORAS[0]}h às ${AGUA_HORAS[1]}h` : 'desligado'}`,
      `Pausa: ${pausa.ativo ? `a cada ${pausa.intervaloMin} min seguidos no PC` : 'só o aviso de sempre, depois de 90 min seguidos'}`,
      ...(remedios.length ? remedios.map((r) => `Remédio: ${r.nome} às ${r.hora}`) : ['Remédio: nenhum']),
    ];
  }

  /**
   * O que venceu agora. `activeMs` = há quanto tempo ela está no PC sem parar.
   * Devolve uma lista em ordem de prioridade: remédio, pausa, água.
   */
  due(date, { activeMs = 0 } = {}) {
    const now = this.now();
    const day = dayKey(date);
    const minuto = date.getHours() * 60 + date.getMinutes();
    const out = [];
    for (const r of this.st.remedios) {
      if (r.ultimoDia === day) continue;
      const [h, m] = r.hora.split(':').map(Number);
      const atraso = minuto - (h * 60 + m);
      if (atraso < 0) continue;
      out.push({ tipo: 'remedio', nome: r.nome, hora: r.hora, atrasoMin: atraso, perdido: atraso > REMINDER_LIMITS.janelaRemedioMin, central: r.central === day });
    }
    for (const k of ['pausa', 'agua']) {
      const cfg = this.st[k];
      if (!cfg.ativo) continue;
      // Relógio trocado (reinício com outra base): recomeça a contagem sem disparar.
      if (cfg.ultimo == null || cfg.ultimo > now) { cfg.ultimo = now; this._commit(); continue; }
      if (now - cfg.ultimo < cfg.intervaloMin * 60e3) continue;
      if (k === 'agua' && (date.getHours() < AGUA_HORAS[0] || date.getHours() >= AGUA_HORAS[1])) continue;
      if (k === 'pausa' && activeMs < cfg.intervaloMin * 60e3) continue;
      out.push({ tipo: k, min: cfg.intervaloMin });
    }
    return out;
  }

  /** Marca que o aviso na Central já foi criado hoje para o remédio. */
  markCentral(item, date) {
    const r = this.st.remedios.find((x) => x.nome === item.nome && x.hora === item.hora);
    if (r) { r.central = dayKey(date); this._commit(); }
  }

  /** Marca como entregue (ou perdido, no caso do remédio fora da janela). */
  mark(item, date) {
    if (item.tipo === 'remedio') {
      const r = this.st.remedios.find((x) => x.nome === item.nome && x.hora === item.hora);
      if (r) r.ultimoDia = dayKey(date);
    } else this.st[item.tipo].ultimo = this.now();
    this._commit();
  }
}
