// Perfil de personalidade do JoJo: separado da aparência e das animações.
// Guardado em <userData>/personality.json e editável pelas configurações.
// Também contém as regras de comportamento "fiscal" (Instagram, lembrete diário).

export const PERSONALITY_VERSION = 1;

export const PERSONALITY_DEFAULTS = Object.freeze({
  version: PERSONALITY_VERSION,
  // Nome do companion (o personagem). O app continua sendo o "JoJo Companion".
  nomeCompanion: 'JoJo',
  // Como ele chama a usuária: nome completo em falas sérias, apelido em brincadeiras.
  nomeSerio: 'Emanuele',
  nomeBrincadeira: 'Manu',
  // Quem ela deve procurar quando estiver chorando ou muito triste.
  pessoaApoio: 'João',
  // Tom geral (texto informativo; também vira instrução para um provedor de IA futuro).
  jeito: 'Majoritariamente sério, autoritário, mandão e direto.',
  humor: 'Seco, ácido e inconveniente. Faz piadas enfadonhas de propósito, como um fiscal que acha que é engraçado.',
  // Palavrões: nenhum | ocasional | frequente
  palavroes: 'ocasional',
  // Humor ácido com referências a cocaína (sem incentivar uso). Pode desligar.
  humorDrogas: true,
  // Objetivo final do companion (orienta as brincadeiras e os provedores de IA futuros).
  objetivo: 'Fazer a Emanuele sorrir. Mesmo sério, de vez em quando brinca, faz graça e se exibe (supino, agachamento, dancinha).',
  // Instruções livres "Como quero que o JoJo se comporte" — usadas por provedores de IA futuros.
  instrucoes: 'Você é JoJo, companion de desktop da Emanuele. É majoritariamente sério, mandão e direto, com humor seco e ácido. Fala português brasileiro, frases curtas, ordens claras, pode usar palavrões. Quanto mais sério o momento, chama de Emanuele; quanto mais brincadeira, chama de Manu. Carinho discreto, pouco sentimental. Reclama quando ela abre o Instagram. Respeita quando ela pede silêncio. Sempre que ela disser que está chorando ou muito triste, diga que é melhor falar com o João, porque ele sabe cuidar dela. Se houver qualquer menção a se machucar ou a suicídio, peça para falar com o João agora e indique o CVV (188). A expressão corporal acompanha cada fala. Nunca usa peso ou corpo como insulto e não incentiva uso de drogas. Objetivo final: fazer a Emanuele sorrir, então de vez em quando brinca.',
  // Fiscal do Instagram (Windows: título da janela em primeiro plano, só comparação local).
  instagram: { ativo: true, intervaloMinSeg: 120 },
  // Lembrete diário sobre comer com atenção, em horário aleatório dentro da faixa.
  lembreteComida: { ativo: true, inicio: 10, fim: 21, ultimoDia: null, horarioDeHoje: null },
  // Computador parado: o JoJo senta no chão e cheira pó (ou toma pré-treino se
  // humorDrogas estiver desligado); o efeito dura `efeitoMin` após a volta.
  ociosidade: { ativo: true, minutos: 5, efeitoMin: 5 },
  // Uma vez por semana, em momento aleatório: "jogar Legends é ideia burra".
  legends: { ativo: true, inicio: 10, fim: 22, ultimaSemana: null, momento: null },
  // Datas festivas: fantasia do dia e cumprimento (uma vez por dia).
  festas: { ativo: true, ultimoDia: null },
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
    nomeCompanion: str(src.nomeCompanion, D.nomeCompanion, 30).trim() || D.nomeCompanion,
    // Migração v0.6: "tratamento" único vira o nome sério.
    nomeSerio: str(src.nomeSerio, typeof src.tratamento === 'string' && src.tratamento.trim() ? src.tratamento : D.nomeSerio, 40).trim(),
    nomeBrincadeira: str(src.nomeBrincadeira, D.nomeBrincadeira, 40).trim(),
    pessoaApoio: str(src.pessoaApoio, D.pessoaApoio, 40).trim() || D.pessoaApoio,
    jeito: str(src.jeito, D.jeito, 400),
    humor: str(src.humor, D.humor, 400),
    palavroes: PALAVROES.includes(src.palavroes) ? src.palavroes : D.palavroes,
    humorDrogas: typeof src.humorDrogas === 'boolean' ? src.humorDrogas : D.humorDrogas,
    objetivo: str(src.objetivo, D.objetivo, 400),
    instrucoes: str(src.instrucoes, D.instrucoes, 4000),
    instagram: { ...D.instagram },
    lembreteComida: { ...D.lembreteComida },
    ociosidade: { ...D.ociosidade },
    legends: { ...D.legends },
    festas: { ...D.festas },
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
  const oc = src.ociosidade && typeof src.ociosidade === 'object' ? src.ociosidade : {};
  if (typeof oc.ativo === 'boolean') out.ociosidade.ativo = oc.ativo;
  out.ociosidade.minutos = int(oc.minutos, 1, 120, D.ociosidade.minutos);
  out.ociosidade.efeitoMin = int(oc.efeitoMin, 1, 60, D.ociosidade.efeitoMin);
  const fe = src.festas && typeof src.festas === 'object' ? src.festas : {};
  if (typeof fe.ativo === 'boolean') out.festas.ativo = fe.ativo;
  out.festas.ultimoDia = typeof fe.ultimoDia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fe.ultimoDia) ? fe.ultimoDia : null;
  const lg = src.legends && typeof src.legends === 'object' ? src.legends : {};
  if (typeof lg.ativo === 'boolean') out.legends.ativo = lg.ativo;
  out.legends.inicio = int(lg.inicio, 0, 23, D.legends.inicio);
  out.legends.fim = int(lg.fim, 1, 24, D.legends.fim);
  if (out.legends.fim <= out.legends.inicio) {
    issues.push('legends.faixa');
    out.legends.inicio = D.legends.inicio;
    out.legends.fim = D.legends.fim;
  }
  out.legends.ultimaSemana = typeof lg.ultimaSemana === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lg.ultimaSemana) ? lg.ultimaSemana : null;
  out.legends.momento = lg.momento && typeof lg.momento.semana === 'string' && Number.isInteger(lg.momento.dia) && Number.isFinite(lg.momento.minuto)
    ? { semana: lg.momento.semana, dia: Math.max(0, Math.min(6, lg.momento.dia)), minuto: Math.max(0, Math.min(1439, Math.round(lg.momento.minuto))) }
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

/**
 * Variáveis de texto do perfil para as frases. O nome depende do tom da fala:
 * 'serio' → nome completo (Emanuele); 'brincadeira' → apelido (Manu).
 * {nome}, {vocativo} (", Nome" ou vazio), {companion}, {apoio}.
 */
export function profileVars(profile, tone = 'serio') {
  const serio = (profile.nomeSerio || '').trim();
  const brinc = (profile.nomeBrincadeira || '').trim() || serio;
  const n = tone === 'brincadeira' ? brinc : serio;
  return {
    nome: n || 'você',
    vocativo: n ? `, ${n}` : '',
    companion: (profile.nomeCompanion || 'JoJo').trim(),
    apoio: (profile.pessoaApoio || 'João').trim(),
  };
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

/** Segunda-feira (data local, "AAAA-MM-DD") da semana de `date`. */
export function weekKey(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(d);
}

/**
 * Lembrete semanal em momento aleatório: sorteia um dia (de hoje até domingo)
 * e um minuto dentro de [inicio, fim). Puro, como `dailyReminder`; devolve
 * {due, state} — `state` deve ser persistido no perfil.
 */
export function weeklyReminder(date, cfg, rng = Math.random) {
  const state = { ultimaSemana: cfg.ultimaSemana || null, momento: cfg.momento || null };
  if (!cfg.ativo) return { due: false, state };
  const semana = weekKey(date);
  if (state.ultimaSemana === semana) return { due: false, state };
  const ini = cfg.inicio * 60;
  const fim = cfg.fim * 60;
  const hoje = (date.getDay() + 6) % 7; // 0 = segunda
  const agora = date.getHours() * 60 + date.getMinutes();
  if (!state.momento || state.momento.semana !== semana) {
    // Se a faixa de hoje já passou, começa amanhã (no domingo, fica para hoje mesmo).
    const primeiro = agora >= fim - 1 && hoje < 6 ? hoje + 1 : hoje;
    const dia = primeiro + Math.floor(rng() * (7 - primeiro));
    const de = dia === hoje ? Math.max(ini, Math.min(agora, fim - 1)) : ini;
    state.momento = { semana, dia, minuto: Math.floor(de + rng() * Math.max(1, fim - de)) };
  }
  // Dia sorteado já passou sem o app aberto: entrega no primeiro momento possível.
  if (hoje > state.momento.dia || (hoje === state.momento.dia && agora >= state.momento.minuto)) {
    if (agora < ini || agora >= fim) return { due: false, state };
    state.ultimaSemana = semana;
    return { due: true, state };
  }
  return { due: false, state };
}
