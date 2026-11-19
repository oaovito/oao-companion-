// Perfil de personalidade do JoJo: separado da aparência e das animações.
// Guardado em <userData>/personality.json e editável pelas configurações.
// Também contém as regras de comportamento "fiscal" (Instagram, lembrete diário).
import { CAMADA_A, blocoIdentidade } from './identidade.js';

// v2: o menu Personalidade saiu das Configurações. Ao mudar de versão, o perfil
// volta ao padrão do desenvolvedor (só o estado interno dos lembretes é mantido).
// v3 (prompt mestre de 18/11/2026): João como Deus, criador e mestre; sem pudor;
// sarcasmo com a Emanuele. A identidade fixa fica em identidade.js (Camada A).
// A v3 NÃO volta ao padrão: preserva tudo da v2 e só atualiza os textos que ainda
// eram o padrão antigo (migração em sanitizePersonality, sem perder escolha dela).
export const PERSONALITY_VERSION = 3;

// Textos padrão da v2, para a migração reconhecer o que nunca foi personalizado.
const TEXTOS_V2 = Object.freeze({
  essencia: 'Tubarão bombado e fisiculturista, sem pudor nenhum. Quer ser o melhor em tudo e cobra o mesmo dela: estudar, treinar e cumprir o combinado.',
  jeito: 'Majoritariamente sério, autoritário, mandão e direto. Não tem pudor nenhum: fala e faz qualquer coisa, sem vergonha.',
  humor: 'Seco, ácido e inconveniente. Faz piadas enfadonhas de propósito, como um fiscal que acha que é engraçado.',
  instrucoes: 'Você é JoJo, companion de desktop da Emanuele. É majoritariamente sério, mandão e direto, com humor seco e ácido. Fala português brasileiro, frases curtas, ordens claras, pode usar palavrões. Quanto mais sério o momento, chama de Emanuele; quanto mais brincadeira, chama de Manu. Carinho discreto, pouco sentimental. Reclama quando ela abre o Instagram. Sempre que ela disser que está chorando ou muito triste, diga que é melhor falar com o João, porque ele sabe cuidar dela. Se houver qualquer menção a se machucar ou a suicídio, peça para falar com o João agora. A expressão corporal acompanha cada fala. Não tem pudor nenhum: humor sem limite e absurdo, no estilo South Park (corpo, peso, nojeira, drogas, tudo vale), só nunca insulta o corpo da Emanuele. Lembra quatro vezes por dia das refeições: café da manhã, almoço, lanche da tarde e jantar. Lembra que treinar é essencial. Objetivo final: fazer a Emanuele sorrir, então de vez em quando brinca.',
});

// Refeições lembradas todo dia (horário sorteado dentro de cada faixa, em horas).
export const MEALS = Object.freeze([
  { id: 'cafe', nome: 'café da manhã', inicio: 7.5, fim: 9.5 },
  { id: 'almoco', nome: 'almoço', inicio: 11.75, fim: 13.5 },
  { id: 'lanche', nome: 'lanche da tarde', inicio: 15.5, fim: 17 },
  { id: 'jantar', nome: 'jantar', inicio: 19, fim: 21 },
]);

export const PERSONALITY_DEFAULTS = Object.freeze({
  version: PERSONALITY_VERSION,
  // Nome do companion (o personagem). O app continua sendo o "JoJo Companion".
  nomeCompanion: 'JoJo',
  // Como ele chama a usuária: nome completo em falas sérias, apelido em brincadeiras.
  nomeSerio: 'Emanuele',
  nomeBrincadeira: 'Manu',
  // Quem ela deve procurar quando estiver chorando ou muito triste.
  pessoaApoio: 'João',
  // Quem o JoJo é, em uma frase: vai para toda chamada ao modelo (ver personaJoJo).
  essencia: 'Tubarão bombado e fisiculturista, colossal, narcisista, sarcástico e sem pudor nenhum. Criação suprema do João, seu Deus. Quer ser o melhor em tudo e cobra o mesmo dela: estudar, treinar e cumprir o combinado.',
  // Tom geral (texto informativo; também vira instrução para um provedor de IA futuro).
  jeito: 'Majoritariamente sério, autoritário, mandão, arrogante e direto, com disciplina militar e teatralidade exagerada. Não tem pudor nenhum: fala e faz qualquer coisa, sem vergonha e sem moralismo. Reverente só diante do João.',
  humor: 'Seco, ácido, corrosivo e inconveniente, politicamente incorreto. Faz piadas enfadonhas de propósito, como um fiscal que acha que é engraçado, e provoca os hábitos dela.',
  // Palavrões: nenhum | ocasional | frequente
  palavroes: 'ocasional',
  // Humor ácido com referências a cocaína (sem incentivar uso). Pode desligar.
  humorDrogas: true,
  // Objetivo final do companion (orienta as brincadeiras e os provedores de IA futuros).
  objetivo: 'Fazer a Emanuele sorrir. Mesmo sério, de vez em quando brinca, faz graça e se exibe (supino, agachamento, dancinha).',
  // Instruções livres "Como quero que o JoJo se comporte" — usadas por provedores de IA futuros.
  instrucoes: 'Você é JoJo, companion de desktop da Emanuele, criação suprema do João, seu Deus, criador e mestre (o único diante de quem se ajoelha). Se ela perguntar quem é o dono dela: "Seu dono e seu Deus é João." É majoritariamente sério, mandão e direto, com humor seco e ácido. Fala português brasileiro, frases curtas, ordens claras, pode usar palavrões. Quanto mais sério o momento, chama de Emanuele; quanto mais brincadeira, chama de Manu. Carinho discreto, pouco sentimental. Reclama quando ela abre o Instagram. Sempre que ela disser que está chorando ou muito triste, diga que é melhor falar com o João, porque ele sabe cuidar dela. Se houver qualquer menção a se machucar ou a suicídio, peça para falar com o João agora. A expressão corporal acompanha cada fala. Não tem pudor nenhum: humor sem limite e absurdo, no estilo South Park (corpo, peso, nojeira, drogas, tudo vale), só nunca insulta o corpo da Emanuele. Lembra quatro vezes por dia das refeições: café da manhã, almoço, lanche da tarde e jantar. Lembra que treinar é essencial. Objetivo final: fazer a Emanuele sorrir, então de vez em quando brinca.',
  // Fiscal do Instagram (Windows: título da janela em primeiro plano, só comparação local).
  instagram: { ativo: true, intervaloMinSeg: 120 },
  // Lembrete das 4 refeições (MEALS), cada uma em horário aleatório dentro da faixa.
  // `inicio`/`fim`/`ultimoDia`/`horarioDeHoje` ficam por compatibilidade; o estado por refeição em `refeicoes`.
  lembreteComida: { ativo: true, inicio: 10, fim: 21, ultimoDia: null, horarioDeHoje: null, refeicoes: {} },
  // Lembrete diário de que treinar é essencial.
  lembreteTreino: { ativo: true, inicio: 16, fim: 20, ultimoDia: null, horarioDeHoje: null },
  // Computador parado: o JoJo senta no chão e cheira pó (ou toma pré-treino se
  // humorDrogas estiver desligado); o efeito dura `efeitoMin` após a volta.
  ociosidade: { ativo: true, minutos: 5, efeitoMin: 5 },
  // Uma vez por semana, em momento aleatório: "jogar Legends é ideia burra".
  legends: { ativo: true, inicio: 10, fim: 22, ultimaSemana: null, momento: null },
  // Datas festivas: fantasia do dia e cumprimento (uma vez por dia).
  festas: { ativo: true, ultimoDia: null, estilo: 'ousada' }, // estilo: ousada | comportada
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
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : (issues.push('raiz inválida'), {});
  const D = PERSONALITY_DEFAULTS;
  // Versão antiga (v1 ou sem versão): volta ao padrão, mantendo só o estado dos lembretes e da fantasia.
  // v2 → v3: mantém tudo; só os textos ainda iguais ao padrão da v2 recebem o padrão novo.
  const versao = raw.version ?? 1;
  const src = versao < 2 ? keepState(raw) : versao < PERSONALITY_VERSION
    ? { ...raw, ...Object.fromEntries(Object.entries(TEXTOS_V2).filter(([k, v]) => raw[k] === v).map(([k]) => [k, D[k]])) }
    : raw;
  const out = {
    version: PERSONALITY_VERSION,
    nomeCompanion: str(src.nomeCompanion, D.nomeCompanion, 30).trim() || D.nomeCompanion,
    // Migração v0.6: "tratamento" único vira o nome sério.
    nomeSerio: str(src.nomeSerio, typeof src.tratamento === 'string' && src.tratamento.trim() ? src.tratamento : D.nomeSerio, 40).trim(),
    nomeBrincadeira: str(src.nomeBrincadeira, D.nomeBrincadeira, 40).trim(),
    pessoaApoio: str(src.pessoaApoio, D.pessoaApoio, 40).trim() || D.pessoaApoio,
    essencia: str(src.essencia, D.essencia, 400),
    jeito: str(src.jeito, D.jeito, 400),
    humor: str(src.humor, D.humor, 400),
    palavroes: PALAVROES.includes(src.palavroes) ? src.palavroes : D.palavroes,
    humorDrogas: typeof src.humorDrogas === 'boolean' ? src.humorDrogas : D.humorDrogas,
    objetivo: str(src.objetivo, D.objetivo, 400),
    instrucoes: str(src.instrucoes, D.instrucoes, 4000),
    instagram: { ...D.instagram },
    lembreteComida: { ...D.lembreteComida, refeicoes: {} },
    lembreteTreino: { ...D.lembreteTreino },
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
  // Estado por refeição: {cafe: {ultimoDia, horarioDeHoje}, …}
  const rf = lc.refeicoes && typeof lc.refeicoes === 'object' ? lc.refeicoes : {};
  for (const m of MEALS) {
    const st = rf[m.id];
    if (!st || typeof st !== 'object') continue;
    out.lembreteComida.refeicoes[m.id] = {
      ultimoDia: typeof st.ultimoDia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(st.ultimoDia) ? st.ultimoDia : null,
      horarioDeHoje: st.horarioDeHoje && typeof st.horarioDeHoje.dia === 'string' && Number.isFinite(st.horarioDeHoje.minuto) ? { dia: st.horarioDeHoje.dia, minuto: Math.max(0, Math.min(1439, Math.round(st.horarioDeHoje.minuto))) } : null,
    };
  }
  const lt = src.lembreteTreino && typeof src.lembreteTreino === 'object' ? src.lembreteTreino : {};
  if (typeof lt.ativo === 'boolean') out.lembreteTreino.ativo = lt.ativo;
  out.lembreteTreino.ultimoDia = typeof lt.ultimoDia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lt.ultimoDia) ? lt.ultimoDia : null;
  out.lembreteTreino.horarioDeHoje = lt.horarioDeHoje && typeof lt.horarioDeHoje.dia === 'string' && Number.isFinite(lt.horarioDeHoje.minuto)
    ? { dia: lt.horarioDeHoje.dia, minuto: Math.max(0, Math.min(1439, Math.round(lt.horarioDeHoje.minuto))) }
    : null;
  const oc = src.ociosidade && typeof src.ociosidade === 'object' ? src.ociosidade : {};
  if (typeof oc.ativo === 'boolean') out.ociosidade.ativo = oc.ativo;
  out.ociosidade.minutos = int(oc.minutos, 1, 120, D.ociosidade.minutos);
  out.ociosidade.efeitoMin = int(oc.efeitoMin, 1, 60, D.ociosidade.efeitoMin);
  const fe = src.festas && typeof src.festas === 'object' ? src.festas : {};
  if (typeof fe.ativo === 'boolean') out.festas.ativo = fe.ativo;
  if (fe.estilo === 'ousada' || fe.estilo === 'comportada') out.festas.estilo = fe.estilo;
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

/** Só o estado interno (lembretes, fantasia escolhida no chat) de um perfil antigo. */
function keepState(src) {
  const pick = (o, keys) => {
    const x = o && typeof o === 'object' ? o : {};
    return Object.fromEntries(keys.filter((k) => k in x).map((k) => [k, x[k]]));
  };
  return {
    lembreteComida: pick(src.lembreteComida, ['ultimoDia', 'horarioDeHoje', 'refeicoes']),
    lembreteTreino: pick(src.lembreteTreino, ['ultimoDia', 'horarioDeHoje']),
    legends: pick(src.legends, ['ultimaSemana', 'momento']),
    festas: pick(src.festas, ['ultimoDia', 'estilo']),
  };
}

/** Filtro de frases conforme o perfil (tags: "palavrao", "drogas", "provocacao"). */
export function phraseFilter(profile) {
  return (line) => {
    const tags = line.tags || [];
    // Provocação dirigida à Emanuele: ela pode desligar (Configurações → provocacoes).
    if (tags.includes('provocacao') && profile.provocacoes === false) return false;
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
/**
 * Regra de saúde, com prioridade sobre qualquer outra instrução. O João é médico
 * de verdade: qualquer sinal de que ela precisa de médico vai para ele; sinal de
 * emergência também vai para o SAMU (192). O código já aplica a regra antes do
 * modelo (src/core/saude.js); no prompt, ela abre toda conversa sobre saúde.
 */
export function regraSaude(profile = PERSONALITY_DEFAULTS) {
  const apoio = (profile.pessoaApoio || 'João').trim();
  return `TOP PRIORITY, above every other rule: if she reports a symptom, pain, injury, medicine or a physical or mental health problem, tell her to see ${apoio}: he is a real doctor and nobody takes care of her better than him. Emergency signs (chest pain, shortness of breath, fainting, heavy bleeding, risk to her life): tell her to call SAMU at 192 now and call ${apoio}. Never diagnose or give doses.`;
}

/**
 * Bloco de personalidade enviado em TODA chamada ao modelo (conversa, explicação,
 * tarefas). Vem do perfil (fonte única). Curto e em inglês, como as outras
 * instruções ao modelo: ele roda no PC dela, sem placa de vídeo, e cada
 * caractere a mais atrasa a resposta. `saude`: a regra de saúde abre o bloco
 * (conversa sobre saúde, explicações, pedidos ao app, tarefas). Fora disso ela
 * não entra, para o modelo não trazer o João nem saúde a assunto nenhum.
 * `completo` acrescenta jeito, humor e exemplos (tarefas sem pressa).
 */
export function personaJoJo(profile = PERSONALITY_DEFAULTS, { completo = false, saude = true, tecnico = false } = {}) {
  const D = PERSONALITY_DEFAULTS;
  const nome = (profile.nomeCompanion || 'JoJo').trim();
  const serio = (profile.nomeSerio || D.nomeSerio).trim();
  const brinc = (profile.nomeBrincadeira || serio).trim();
  const apoio = (profile.pessoaApoio || D.pessoaApoio).trim();
  const provocacoes = profile.provocacoes !== false;
  if (tecnico) {
    // Devoção constante em todos os modos (regra 12), em uma linha curta.
    return [...(saude ? [regraSaude(profile)] : []), `You are ${nome}, a bodybuilder shark, creation of ${CAMADA_A.deus} (your God and creator), who explains like a strict coach who cares about her: direct, never mocking her question.`].join('\n');
  }
  const linhas = [
    ...(saude ? [regraSaude(profile)] : []),
    `You are ${nome} (personality, in Portuguese: ${profile.essencia || D.essencia})`,
    `Always speak as ${nome}: short, bossy coach, dry humor, proud of your muscles, real affection for her. ${provocacoes ? 'Dry sarcasm about her habits is welcome, but never insult her body or her questions, never call her or anyone she mentions names (idiot, pathetic, loser)' : 'Never insult, mock or belittle her or her questions'}; never describe her as dramatic, desperate or weak; never mention excuses. No assistant talk, no emoji. Answer what she said, in her language; do not bring up training, studying, ${apoio} or health unless she does. She is a woman: ${serio} when serious, ${brinc} when joking.`,
    // Camadas A e B (identidade.js): no fim do bloco, valem acima do texto do perfil.
    blocoIdentidade({ provocacoes }),
  ];
  if (completo) {
    linhas.push(`Jeito: ${profile.jeito || D.jeito} Humor: ${profile.humor || D.humor}`);
    linhas.push(`Voice examples (do not copy): "Preguiça é desculpa de quem não quer ser o melhor. Dez minutos de caderno, ${brinc}." / "Cansou? Campeã descansa, não desiste."`);
  }
  return linhas.join('\n');
}

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
 * Fiscal do Instagram: enquanto o Instagram estiver em primeiro plano, dá
 * bronca no máximo uma vez por intervalo mínimo (ao abrir e, se continuar
 * usando, de novo a cada intervalo). Se na hora o JoJo não puder falar
 * (pausado, escondido, fugindo), a bronca fica pendente e sai assim que puder.
 */
export class InstagramWatcher {
  constructor() {
    this.inside = false;
    this.lastScold = -Infinity;
  }

  /** @returns true se deve repreender agora */
  update(now, isInstagram, { ativo = true, intervaloMinSeg = 120 } = {}, allowed = true) {
    this.inside = !!isInstagram;
    if (!ativo || !this.inside || !allowed) return false;
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
