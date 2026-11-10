// Acompanhamento de hábitos: sequências de treino, estudo e sono, com
// progresso da semana e recorde. Puro: estado salvo é injetado; dias são
// chaves "AAAA-MM-DD" do calendário local.
import { shiftDay } from './civil-time.js';

export const HABITS = Object.freeze({ treino: 'Treino', estudo: 'Estudo', sono: 'Sono' });
export const HABIT_IDS = Object.keys(HABITS);
const MAX_DIAS = 400;

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => semAcento(s).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const DIA = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeHabits(input) {
  const out = {};
  for (const h of HABIT_IDS) {
    const dias = Array.isArray(input && input[h]) ? input[h].filter((d) => typeof d === 'string' && DIA.test(d)) : [];
    out[h] = [...new Set(dias)].sort().slice(-MAX_DIAS);
  }
  return out;
}

const qualHabito = (n) => (/\b(trein\w*|malh\w*|academia)\b/.test(n) ? 'treino' : /\b(estud\w*|revis\w*)\b/.test(n) ? 'estudo' : /\b(sono|dorm\w*)\b/.test(n) ? 'sono' : null);

/**
 * Pedido sobre hábitos. Devolve a ação ou null.
 *  - {tipo:'progresso'}: "meus hábitos", "minha sequência", "quantos dias seguidos treinei?"
 *  - {tipo:'registrar', habito}: "marca o treino de hoje"
 *  - {tipo:'desmarcar', habito}: "desmarca o treino de hoje"
 *  - {tipo:'registrar', habito, natural:true}: "treinei hoje", "estudei", "dormi bem" —
 *    o companion só anota e deixa a conversa seguir.
 */
export function parseHabitRequest(text) {
  const n = norm(String(text || '').replace(/^\s*jojo[,!:]?\s*/i, ''));
  if (!n || n.length > 120) return null;
  if (/^(meus habitos|ver (os |meus )?habitos|como (estao|andam|vao) (os )?meus habitos|minhas? sequencias?|meu progresso (de|nos|dos) habitos|quantos dias (seguidos )?(eu )?(ja )?(treinei|estudei|dormi bem))\b/.test(n)) return { tipo: 'progresso' };
  let m = n.match(/^(desmarca|desmarque|tira|tire|apaga|apague)\s+(?:o |a |meu |minha )?(treino|estudo|sono)(?: de hoje)?$/);
  if (m) return { tipo: 'desmarcar', habito: m[2] };
  m = n.match(/^(?:marca|marque|registra|registre|conta|conte)\s+(?:o |a |meu |minha )?(treino|estudo|sono)(?: de hoje| feito| como feito)?$/);
  if (m) return { tipo: 'registrar', habito: m[1] };
  if (/^(nao|nem|quase|ainda nao|nunca)\b/.test(n) || /\b(nao|sem) (treinei|estudei|dormi|consegui)\b/.test(n) || /\?$/.test(String(text).trim())) return null;
  if (/^(ja |hoje |hoje eu |eu )*(treinei|malhei|fiz (o |meu )?treino|fui (pra|na|a) academia|treino feito)\b/.test(n)) return { tipo: 'registrar', habito: 'treino', natural: true };
  if (/^(ja |hoje |hoje eu |eu )*(estudei|fiz (a |minha )?revisao|terminei de estudar|estudo feito)\b/.test(n)) return { tipo: 'registrar', habito: 'estudo', natural: true };
  if (/^(ja |hoje |eu )*(dormi (bem|cedo|a noite toda|\d{1,2} ?(h|horas))|tive uma boa noite de sono)\b/.test(n) && !/\bdormi (mal|pouco|tarde)\b/.test(n)) return { tipo: 'registrar', habito: 'sono', natural: true };
  return null;
}

/** Comando "/habito …" e "/habitos". */
export function parseHabitCommand(arg) {
  const n = norm(arg);
  if (!n || /^(ver|lista|progresso)$/.test(n)) return { tipo: 'progresso' };
  const habito = qualHabito(n);
  if (!habito) return { tipo: 'ajuda' };
  return { tipo: /\b(desfaz\w*|desmarc\w*|tira\w*|apag\w*|nao)\b/.test(n) ? 'desmarcar' : 'registrar', habito };
}

export class Habits {
  constructor({ state = null, save = () => {} } = {}) {
    this.st = sanitizeHabits(state);
    this.save = save;
  }

  has(habito, day) {
    return (this.st[habito] || []).includes(day);
  }

  /** Marca o dia. Devolve {novo, dias}: se era novo e a sequência atual. */
  log(habito, day) {
    if (!HABITS[habito] || !DIA.test(day)) return null;
    const novo = !this.has(habito, day);
    if (novo) {
      this.st[habito] = [...this.st[habito], day].sort().slice(-MAX_DIAS);
      this.save(this.st);
    }
    return { novo, dias: this.streak(habito, day) };
  }

  unlog(habito, day) {
    if (!HABITS[habito] || !this.has(habito, day)) return false;
    this.st[habito] = this.st[habito].filter((d) => d !== day);
    this.save(this.st);
    return true;
  }

  /** Dias seguidos até hoje; sem registro hoje, a sequência até ontem ainda vale. */
  streak(habito, today) {
    const dias = new Set(this.st[habito] || []);
    let d = dias.has(today) ? today : shiftDay(today, -1);
    let n = 0;
    while (dias.has(d)) { n++; d = shiftDay(d, -1); }
    return n;
  }

  /** Maior sequência já registrada. */
  best(habito) {
    let melhor = 0, atual = 0, anterior = null;
    for (const d of this.st[habito] || []) {
      atual = anterior && shiftDay(anterior, 1) === d ? atual + 1 : 1;
      melhor = Math.max(melhor, atual);
      anterior = d;
    }
    return melhor;
  }

  /** Últimos 7 dias (do mais antigo para hoje): true = feito. */
  week(habito, today) {
    return Array.from({ length: 7 }, (_, i) => this.has(habito, shiftDay(today, i - 6)));
  }

  /** Linhas de dados do progresso (o tom vem da fala que acompanha). */
  lines(today) {
    return HABIT_IDS.map((h) => {
      const semana = this.week(h, today);
      const dias = this.streak(h, today);
      return `${HABITS[h]}: ${dias} dia${dias === 1 ? '' : 's'} seguido${dias === 1 ? '' : 's'} (recorde ${this.best(h)}) · semana ${semana.map((ok) => (ok ? '■' : '□')).join('')} ${semana.filter(Boolean).length}/7${this.has(h, today) ? ' · hoje ✓' : ''}`;
    });
  }

  /** Aplica a ação. Devolve {fala, vars, itens?}. */
  apply(a, today) {
    if (!a) return null;
    if (a.tipo === 'progresso') {
      const vazio = HABIT_IDS.every((h) => !this.st[h].length);
      return { fala: vazio ? 'habitoVazio' : 'habitoProgresso', vars: {}, itens: vazio ? undefined : this.lines(today) };
    }
    if (a.tipo === 'registrar') {
      const r = this.log(a.habito, today);
      return { fala: r.novo ? 'habitoRegistrado' : 'habitoJaTinha', vars: { habito: HABITS[a.habito].toLowerCase(), dias: r.dias } };
    }
    if (a.tipo === 'desmarcar') {
      const ok = this.unlog(a.habito, today);
      return { fala: ok ? 'habitoDesmarcado' : 'habitoNaoTinha', vars: { habito: HABITS[a.habito].toLowerCase(), dias: this.streak(a.habito, today) } };
    }
    return { fala: 'habitoAjuda', vars: {} };
  }
}
