// Perfil de personalidade do Jeff: separado da aparência e das animações.
// Guardado em <userData>/personality.json e editável pelas configurações.
// Também contém as regras de comportamento "fiscal" (Instagram, lembrete diário).

export const PERSONALITY_VERSION = 1;

export const PERSONALITY_DEFAULTS = Object.freeze({
  version: PERSONALITY_VERSION,
  // Como o Jeff chama o usuário ("" = só "você").
  tratamento: '',
  // Tom geral (texto informativo; também vira instrução para um provedor de IA futuro).
  jeito: 'Majoritariamente sério, autoritário, mandão e direto.',
  humor: 'Seco, ácido e inconveniente. Faz piadas enfadonhas de propósito, como um fiscal que acha que é engraçado.',
  // Palavrões: nenhum | ocasional | frequente
  palavroes: 'ocasional',
  // Humor ácido com referências a cocaína (sem incentivar uso). Pode desligar.
  humorDrogas: true,
  // Instruções livres "Como quero que o Jeff se comporte" — usadas por provedores de IA futuros.
  instrucoes: 'Você é Jeff, meu companion de desktop. É majoritariamente sério, mandão e direto, com humor seco e ácido. Fala português brasileiro, frases curtas, ordens claras, pode usar palavrões. Carinho discreto, pouco sentimental. Reclama quando eu abro o Instagram. Respeita quando eu peço silêncio. Nunca usa peso ou corpo como insulto e não incentiva uso de drogas.',
  // Fiscal do Instagram (Windows: título da janela em primeiro plano, só comparação local).
  instagram: { ativo: true, intervaloMinSeg: 120 },
  // Lembrete diário sobre comer com atenção, em horário aleatório dentro da faixa.
  lembreteComida: { ativo: true, inicio: 10, fim: 21, ultimoDia: null, horarioDeHoje: null },
});

const PALAVROES = ['nenhum', 'ocasional', 'frequente'];

function str(v, def, max = 2000) {
  return typeof v === 'string' ? v.slice(0, max) : def;
}

function int(v, lo, hi, def) {
  return Number.isInteger(v) ? Math.min(hi, Math.max(lo, v)) : def;
}

/** Normaliza um perfil qualquer. Retorna {settings, issues} (mesmo contrato do SettingsStore). */
export function sanitizePersonality(input) {
  const issues = [];
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : (issues.push('raiz inválida'), {});
  const D = PERSONALITY_DEFAULTS;
  const out = {
    version: PERSONALITY_VERSION,
    tratamento: str(src.tratamento, D.tratamento, 40).trim(),
    jeito: str(src.jeito, D.jeito, 400),
    humor: str(src.humor, D.humor, 400),
    palavroes: PALAVROES.includes(src.palavroes) ? src.palavroes : D.palavroes,
    humorDrogas: typeof src.humorDrogas === 'boolean' ? src.humorDrogas : D.humorDrogas,
    instrucoes: str(src.instrucoes, D.instrucoes, 4000),
    instagram: { ...D.instagram },
    lembreteComida: { ...D.lembreteComida },
  };
  if ('palavroes' in src && out.palavroes !== src.palavroes) issues.push('palavroes');
  const ig = src.instagram && typeof src.instagram === 'object' ? src.instagram : {};
  if (typeof ig.ativo === 'boolean') out.instagram.ativo = ig.ativo;
  out.instagram.intervaloMinSeg = int(ig.intervaloMinSeg, 10, 3600, D.instagram.intervaloMinSeg);
  const lc = src.lembreteComida && typeof src.lembreteComida === 'object' ? src.lembreteComida : {};
  if (typeof lc.ativo === 'boolean') out.lembreteComida.ativo = lc.ativo;
  out.lembreteComida.inicio = int(lc.inicio, 0, 23, D.lembreteComida.inicio);
  out.lembreteComida.fim = int(lc.fim, 1, 24, D.lembreteComida.fim);
  if (out.lembreteComida.fim <= out.lembreteComida.inicio) {
    issues.push('lembreteComida.faixa');
    out.lembreteComida.inicio = D.lembreteComida.inicio;
    out.lembreteComida.fim = D.lembreteComida.fim;
  }
  out.lembreteComida.ultimoDia = typeof lc.ultimoDia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lc.ultimoDia) ? lc.ultimoDia : null;
  out.lembreteComida.horarioDeHoje = lc.horarioDeHoje && typeof lc.horarioDeHoje.dia === 'string' && Number.isFinite(lc.horarioDeHoje.minuto)
    ? { dia: lc.horarioDeHoje.dia, minuto: Math.max(0, Math.min(1439, Math.round(lc.horarioDeHoje.minuto))) }
    : null;
  return { settings: out, issues };
}

/** Filtro de frases conforme o perfil (tags: "palavrao", "drogas"). */
export function phraseFilter(profile) {
  return (line) => {
    const tags = line.tags || [];
    if (tags.includes('drogas') && !profile.humorDrogas) return false;
    if (tags.includes('palavrao') && profile.palavroes === 'nenhum') return false;
    return true;
  };
}

/** Peso de cada frase no sorteio: palavrões mais raros no modo "ocasional". */
export function phraseWeight(profile) {
  return (line) => {
    const tags = line.tags || [];
    if (tags.includes('palavrao')) return profile.palavroes === 'frequente' ? 1.6 : 0.35;
    return 1;
  };
}

/** Variáveis de texto do perfil para as frases ({vocativo}, {nome}). */
export function profileVars(profile) {
  const t = (profile.tratamento || '').trim();
  return { vocativo: t ? `, ${t}` : '', nome: t || 'você' };
}

/**
 * Fiscal do Instagram: dispara na ENTRADA (transição fora → dentro), no máximo
 * uma vez por intervalo mínimo; não dispara continuamente enquanto fica aberto.
 */
export class InstagramWatcher {
  constructor() {
    this.inside = false;
    this.lastScold = -Infinity;
  }

  /** @returns true se deve repreender agora */
  update(now, isInstagram, { ativo = true, intervaloMinSeg = 120 } = {}) {
    const entering = isInstagram && !this.inside;
    this.inside = !!isInstagram;
    if (!ativo || !entering) return false;
    if (now - this.lastScold < intervaloMinSeg * 1000) return false;
    this.lastScold = now;
    return true;
  }
}

export function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Lembrete diário em horário aleatório dentro da faixa [inicio, fim).
 * Puro: recebe a data atual, o estado salvo e um rng; devolve
 * {due, state} — `state` deve ser persistido no perfil.
 */
export function dailyReminder(date, cfg, rng = Math.random) {
  const state = { ultimoDia: cfg.ultimoDia || null, horarioDeHoje: cfg.horarioDeHoje || null };
  if (!cfg.ativo) return { due: false, state };
  const hoje = dayKey(date);
  if (state.ultimoDia === hoje) return { due: false, state };
  const ini = cfg.inicio * 60;
  const fim = cfg.fim * 60;
  if (!state.horarioDeHoje || state.horarioDeHoje.dia !== hoje) {
    const agora = date.getHours() * 60 + date.getMinutes();
    // Se o app abriu no meio da faixa, sorteia a partir de agora.
    const de = Math.max(ini, Math.min(agora, fim - 1));
    state.horarioDeHoje = { dia: hoje, minuto: Math.floor(de + rng() * Math.max(1, fim - de)) };
  }
  const minuto = date.getHours() * 60 + date.getMinutes();
  if (minuto >= state.horarioDeHoje.minuto && minuto < fim) {
    state.ultimoDia = hoje;
    return { due: true, state };
  }
  return { due: false, state };
}
