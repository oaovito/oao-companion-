// Esquema das configurações: padrões, validação, migração de versão.
// Qualquer campo inválido volta ao padrão sem invalidar o arquivo inteiro.

import { isCalendarUrl, normalizeCalendarUrl } from './calendar.js';
import { sanitizeOutfit } from './wardrobe.js';
import { sanitizeVisual } from './visual-nivel.js';
import { sanitizeAnimes, sanitizeAvisados } from './anime-calendario.js';
import { sanitizeAtividades, sanitizeOffset } from './timers.js';

export const SETTINGS_VERSION = 6;

export const DEFAULTS = Object.freeze({
  version: SETTINGS_VERSION,
  size: 1.0,                    // escala do JoJo (0.6 – 1.8)
  preferredDisplay: 'auto',     // id do monitor ou 'auto'
  allowDisplaySwitch: true,     // pode passear/fugir para outros monitores
  safetyMargin: 100,            // px lógicos (40 – 300)
  moveSpeed: 1.0,               // multiplicador de velocidade (0.5 – 2)
  activity: 0.5,                // 0 calmo … 1 agitado
  speechFrequency: 'often',     // off | rare | normal | often
  bubbleScale: 1.0,             // tamanho do texto dos balões (0.8 – 1.6)
  quietMode: false,             // sem falas espontâneas e sem broncas
  interactionHotkey: 'Control+Alt+J',
  startWithWindows: true,       // inicia junto com o Windows (desmarcável)
  desktopShortcut: 'auto',      // respeitar instalador/remoção; show | hide opcionais
  fullscreenBehavior: 'hide',   // hide (some do monitor com tela cheia) | hideAll (some de todos); nunca cobre tela cheia
  avoidFallback: 'fade',        // fade | hide  (sem espaço seguro / perseguição)
  reduceMotion: 'system',       // system | on | off — redução de movimento (acessibilidade)
  webSearch: true,              // pesquisar na internet perguntas sem resposta programada
  autoUpdate: true,             // baixar e instalar versões novas automaticamente
  iaAtivo: true,                // conversa local, sem serviço pago
  iaProvedor: 'ollama',         // ollama (modelo oficial neste PC) | pollinations | groq | gemini | openrouter (só reversão manual)
  iaChave: '',                  // chave de provedor antigo (só reversão manual; fica só neste PC)
  iaModelo: '',                 // modelo (vazio = padrão do provedor)
  // Animações e falas ambientes (motor de variedade / antitédio).
  ambienteFrequencia: 'muita',  // desligado | pouca | normal | muita
  ambienteIntensidade: 'auto',  // auto (pelo humor) | suave | normal | exagerado
  ambienteModo: 'auto',         // auto | calmo | pilhado — energia preferida
  surpresas: true,              // animações raras e easter eggs
  avisoRaros: true,             // aviso visual suave antes de algo raro
  falasAmbientes: true,         // frases curtas sozinho enquanto ela trabalha
  microMovimentos: 'normal',    // normal | discreto | desligado (respiração, guelras, bolhas…)
  animacoesPesadas: true,       // giros, confete, tremidas (desligue para só as suaves)
  // Agenda (só leitura): endereço iCal do Google ou link público do iCloud; fica só neste PC.
  agendaUrl: '',
  agendaAtiva: true,
  agendaAvisoMin: 10,           // aviso antes de cada compromisso (5 – 60 min)
  agendaSugerida: false,        // o JoJo já sugeriu conectar a agenda
  darkestAtivo: true,           // detector local Steam DD1 e XP por tempo ativo
  discordCloseOnFocus: true,   // fechamento normal com conferência dos processos
  discordForceClose: false,    // força somente após opção explícita
  discordBloqueio: false,      // bloqueio do Discord: encerra, desinstala o app e fecha a aba; só liga por escolha explícita
  darkestSugestao: true,        // sugestão diária em momento permitido
  climaAtivo: true,
  climaCidade: '',              // cidade/estado escolhidos (localização manual)
  // Localização real (0.47.6): 'automatico' (Windows; só com autorização dela), 'manual' (a cidade acima) ou 'desligado'.
  localizacaoModo: 'manual',
  localizacaoIntervalo: 60,     // minutos entre verificações: 15, 30, 60, 180, 360 ou 720
  localizacaoRede: true,        // sem o Windows, usa a rede/IP (sempre marcada como aproximada)
  localizacaoFuso: true,        // segue o fuso da localização confiável quando difere do Windows
  climaReacoes: true,           // animações com o clima de verdade (chuva, frio, calor, tempestade, neve)
  climaNoite: true,             // luz de noite discreta em volta do JoJo
  lolBronca: true,              // mau humor e some enquanto o League of Legends está aberto
  spotifyReacoes: true,         // reage ao que toca no Spotify (só o título da janela, local)
  percepcaoTela: false,         // percepção de tela: só o tipo do app em primeiro plano (local, sem captura); desligada por padrão
  reboladoFoco: true,           // rebolado do meme de vez em quando no modo foco (no repouso continua sempre)
  provocacoes: true,            // provocações e sarcasmo do JoJo dirigidos a ela; ela pode desligar (identidade.js)
  // Animações virais (0.47.4): 50 memes reinterpretados pelo JoJo, por sinais reais (src/core/virais.js).
  viraisAtivo: true,
  viraisFrequencia: 'normal',   // pouca | normal | muita
  viraisAdulto: true,           // humor adulto (Hawk Tuah, Horny Jail, Awooga)
  viraisNegro: true,            // humor negro e sátira (Downfall, Coffin Dance, a Morte…)
  viraisReduzir: false,         // reduzir efeitos visuais (versão suave, sem efeitos pesados)
  viraisIntensidade: 'normal',  // suave | normal | exagerado
  viraisBloqueadas: [],         // ids vrNN que ela bloqueou
  // Timers interativos (0.47.5): src/core/timers.js, src/core/companion-timers.js.
  timersAtivo: true,            // sistema inteiro
  timersVisivel: true,          // relógio na tela (esconder nunca para a contagem)
  timersAnimacoes: true,        // animações do JoJo com o relógio
  timersSugestoes: true,        // ele oferece um timer quando faz sentido (nunca impõe)
  timersNotificar: true,        // aviso visual discreto ao terminar
  timersAoTerminar: 'avisar',   // avisar | silencioso
  timersAutoProximo: false,     // próximo intervalo começa sozinho
  timersXp: true,               // sessões concluídas rendem XP
  timersClicavel: true,         // no modo de interação: clique pausa/continua, arrastar muda o lugar
  timersAparencia: 'contextual',// contextual | digital | esportivo | ampulheta | analogico | barra | holograma | bolso | minimalista | circular
  timersPosicao: 'direita',     // direita | esquerda | acima | abaixo (em relação ao JoJo)
  timersTamanho: 'medio',       // pequeno | medio | grande
  timersOpacidade: 0.95,
  timersFrequencia: 'normal',   // pouca | normal | muita (animações durante a contagem)
  timersMax: 3,                 // timers ao mesmo tempo (1 a 5)
  timersOffset: { x: 0, y: 0 }, // ajuste do lugar (arrastado por ela)
  timersAtividades: {},         // preferências por atividade (sanitizeAtividades)
  guardaRoupa: {},              // roupa que ela escolheu para o JoJo: {parte: peça}
  visualNivel: { pecas: {}, visto: 0 }, // visuais liberados por nível: o que está vestido e até que nível já foi aplicado
  // Calendário de anime (AniList, sem login): animes que ela segue e episódios já cumprimentados.
  animeAtivo: true,
  animes: [],
  animeAvisados: [],
  // Pacotes de reação (memes, anime, comida, namorado, João): ligados por padrão.
  pacoteMemes: true,
  pacoteAnime: true,
  pacoteComida: true,
  pacoteNamorado: true,
  pacoteJoao: true,
  pacotesEspontaneos: true,     // memes/anime também sozinhos (pela raridade), não só por contexto
  comidaNivel: 4,               // 1 sarcasmo · 2 indignação · 3 fúria cinematográfica · 4 apocalipse
  // Modo cientista/médico ("Erm, ackshually"): ciência, nanopartículas e medicina.
  cienciaModo: true,
  cienciaOculos: true,
  cienciaDentes: true,
  // Modo Trabalho: medita quieto num canto, sem nenhuma distração.
  trabalhoAtivo: false,
  trabalhoPerfil: 'trabalho',   // trabalho | deep | invisivel
  trabalhoCanto: 'inferiorDireito', // inferiorDireito | inferiorEsquerdo | superiorDireito | superiorEsquerdo
  trabalhoTamanho: 0.35,        // fração do tamanho normal (0.2 – 1)
  trabalhoOpacidade: 0.65,      // 0.2 – 1
  trabalhoMargem: 16,           // px até a borda (0 – 200)
  trabalhoRestaurar: true,      // reabrir o app ainda no Modo Trabalho
  trabalhoFim: 0,               // fim do temporizador (ms desde 1970); 0 = sem tempo
  position: null,               // {x, y, displayId} — última posição válida
  visible: true,
  paused: false,
});

// Valores efetivos do comportamento (falas, animações, pacotes, ciência), aplicados
// uma vez na migração para a v5. Ela ainda muda tudo falando ("fica quieto", "menos animação").
export const COMPORTAMENTO_V5 = Object.freeze({
  speechFrequency: 'often',
  quietMode: false,
  iaAtivo: true,
  autoUpdate: true,
  spotifyReacoes: true,
  lolBronca: true,
  webSearch: true,
  ambienteFrequencia: 'muita',
  ambienteIntensidade: 'auto',
  ambienteModo: 'auto',
  microMovimentos: 'normal',
  animacoesPesadas: true,
  falasAmbientes: true,
  surpresas: true,
  avisoRaros: true,
  pacoteMemes: true,
  pacoteAnime: true,
  pacoteComida: true,
  pacoteNamorado: true,
  pacoteJoao: true,
  pacotesEspontaneos: true,
  comidaNivel: 4,
  cienciaModo: true,
  cienciaOculos: true,
  cienciaDentes: true,
});

const RANGES = {
  size: [0.6, 1.8],
  safetyMargin: [40, 300],
  moveSpeed: [0.5, 2],
  activity: [0, 1],
  bubbleScale: [0.8, 1.6],
  agendaAvisoMin: [5, 60],
  trabalhoTamanho: [0.2, 1],
  comidaNivel: [1, 4],
  trabalhoOpacidade: [0.2, 1],
  trabalhoMargem: [0, 200],
  trabalhoFim: [0, 8.64e15],
  timersOpacidade: [0.3, 1],
  timersMax: [1, 5],
};

const ENUMS = {
  desktopShortcut: ['auto', 'show', 'hide'],
  speechFrequency: ['off', 'rare', 'normal', 'often'],
  fullscreenBehavior: ['hide', 'hideAll'],
  avoidFallback: ['fade', 'hide'],
  reduceMotion: ['system', 'on', 'off'],
  iaProvedor: ['ollama', 'pollinations', 'groq', 'gemini', 'openrouter'],
  ambienteFrequencia: ['desligado', 'pouca', 'normal', 'muita'],
  ambienteIntensidade: ['auto', 'suave', 'normal', 'exagerado'],
  ambienteModo: ['auto', 'calmo', 'pilhado'],
  microMovimentos: ['normal', 'discreto', 'desligado'],
  trabalhoPerfil: ['trabalho', 'deep', 'invisivel'],
  trabalhoCanto: ['inferiorDireito', 'inferiorEsquerdo', 'superiorDireito', 'superiorEsquerdo'],
  viraisFrequencia: ['pouca', 'normal', 'muita'],
  localizacaoModo: ['desligado', 'manual', 'automatico'],
  viraisIntensidade: ['suave', 'normal', 'exagerado'],
  timersAoTerminar: ['avisar', 'silencioso'],
  timersAparencia: ['contextual', 'digital', 'esportivo', 'ampulheta', 'analogico', 'barra', 'holograma', 'bolso', 'minimalista', 'circular'],
  timersPosicao: ['direita', 'esquerda', 'acima', 'abaixo'],
  timersTamanho: ['pequeno', 'medio', 'grande'],
  timersFrequencia: ['pouca', 'normal', 'muita'],
};

const BOOLS = ['discordCloseOnFocus', 'discordForceClose', 'discordBloqueio', 'darkestAtivo', 'darkestSugestao', 'climaAtivo', 'allowDisplaySwitch', 'quietMode', 'startWithWindows', 'visible', 'paused', 'webSearch', 'autoUpdate', 'iaAtivo', 'surpresas', 'avisoRaros', 'falasAmbientes', 'lolBronca', 'spotifyReacoes', 'agendaAtiva', 'agendaSugerida', 'animacoesPesadas', 'trabalhoAtivo', 'trabalhoRestaurar', 'pacoteMemes', 'pacoteAnime', 'pacoteComida', 'pacoteNamorado', 'pacoteJoao', 'pacotesEspontaneos', 'cienciaModo', 'cienciaOculos', 'cienciaDentes', 'percepcaoTela', 'reboladoFoco', 'animeAtivo', 'provocacoes', 'viraisAtivo', 'viraisAdulto', 'viraisNegro', 'viraisReduzir', 'timersAtivo', 'timersVisivel', 'timersAnimacoes', 'timersSugestoes', 'timersNotificar', 'timersAutoProximo', 'timersXp', 'timersClicavel', 'localizacaoRede', 'localizacaoFuso', 'climaReacoes', 'climaNoite'];

// Peso do sorteio ambiente (catálogo) frente aos comportamentos básicos.
export const AMBIENT_WEIGHTS = { desligado: 0, pouca: 0.7, normal: 1.6, muita: 3.2 };

// Intervalo médio entre falas espontâneas (ms) por frequência.
export const SPEECH_INTERVALS = { off: null, rare: [9 * 60e3, 18 * 60e3], normal: [3 * 60e3, 8 * 60e3], often: [70e3, 3 * 60e3] };

export function isValidAccelerator(s) {
  if (typeof s !== 'string' || s.length > 60) return false;
  const parts = s.split('+');
  if (parts.length < 2) return false;
  const mods = new Set(['Control', 'Ctrl', 'Alt', 'Shift', 'Super', 'Meta', 'CommandOrControl', 'CmdOrCtrl', 'AltGr', 'Option']);
  const key = parts[parts.length - 1];
  if (!parts.slice(0, -1).every((p) => mods.has(p))) return false;
  return /^([A-Z0-9]|F([1-9]|1[0-9]|2[0-4])|Space|Tab|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Up|Down|Left|Right|Plus|[`\-=[\];',./\\])$/.test(key);
}

function num(v, [lo, hi], def) {
  const n = typeof v === 'number' ? v : Number.NaN;
  if (!Number.isFinite(n)) return def;
  return Math.min(hi, Math.max(lo, n));
}

/** Normaliza um objeto qualquer em configurações válidas. Retorna {settings, issues}. */
export function sanitize(input) {
  const issues = [];
  const src = input && typeof input === 'object' && !Array.isArray(input) ? migrate(input, issues) : (issues.push('raiz inválida'), {});
  const out = { ...DEFAULTS };
  for (const [k, range] of Object.entries(RANGES)) {
    if (k in src) {
      out[k] = num(src[k], range, DEFAULTS[k]);
      if (out[k] !== src[k]) issues.push(k);
    }
  }
  for (const [k, vals] of Object.entries(ENUMS)) {
    if (k in src) {
      if (vals.includes(src[k])) out[k] = src[k];
      else issues.push(k);
    }
  }
  for (const k of BOOLS) {
    if (k in src) {
      if (typeof src[k] === 'boolean') out[k] = src[k];
      else issues.push(k);
    }
  }
  if ('preferredDisplay' in src) {
    if (src.preferredDisplay === 'auto' || typeof src.preferredDisplay === 'string' || typeof src.preferredDisplay === 'number') out.preferredDisplay = String(src.preferredDisplay);
    else issues.push('preferredDisplay');
  }
  for (const k of ['iaChave', 'iaModelo']) {
    if (k in src) {
      if (typeof src[k] === 'string' && src[k].length <= 300 && !/[\r\n]/.test(src[k])) out[k] = src[k].trim();
      else issues.push(k);
    }
  }
  if ('climaCidade' in src && typeof src.climaCidade === 'string') out.climaCidade = src.climaCidade.trim().slice(0, 120);
  if ('localizacaoIntervalo' in src) {
    const v = Number(src.localizacaoIntervalo);
    if ([15, 30, 60, 180, 360, 720].includes(v)) out.localizacaoIntervalo = v;
    else issues.push('localizacaoIntervalo');
  }
  if ('agendaUrl' in src) {
    if (src.agendaUrl === '' || isCalendarUrl(src.agendaUrl)) out.agendaUrl = normalizeCalendarUrl(src.agendaUrl);
    else issues.push('agendaUrl');
  }
  if ('animes' in src) {
    out.animes = sanitizeAnimes(src.animes);
    if (!Array.isArray(src.animes) || out.animes.length !== src.animes.length) issues.push('animes');
  }
  if ('animeAvisados' in src) out.animeAvisados = sanitizeAvisados(src.animeAvisados);
  if ('viraisBloqueadas' in src) {
    const ok = Array.isArray(src.viraisBloqueadas) ? [...new Set(src.viraisBloqueadas.filter((x) => typeof x === 'string' && /^vr\d{2}$/.test(x)))].slice(0, 50) : [];
    if (!Array.isArray(src.viraisBloqueadas) || ok.length !== src.viraisBloqueadas.length) issues.push('viraisBloqueadas');
    out.viraisBloqueadas = ok;
  }
  if ('timersAtividades' in src) out.timersAtividades = sanitizeAtividades(src.timersAtividades);
  if ('timersOffset' in src) out.timersOffset = sanitizeOffset(src.timersOffset);
  if ('timersMax' in src) out.timersMax = Math.round(out.timersMax);
  if ('visualNivel' in src) {
    out.visualNivel = sanitizeVisual(src.visualNivel);
    if (Object.keys(out.visualNivel.pecas).length !== Object.keys(src.visualNivel?.pecas || {}).length) issues.push('visualNivel');
  }
  if ('guardaRoupa' in src) {
    out.guardaRoupa = sanitizeOutfit(src.guardaRoupa);
    if (Object.keys(out.guardaRoupa).length !== Object.keys(src.guardaRoupa || {}).length) issues.push('guardaRoupa');
  }
  if ('interactionHotkey' in src) {
    if (isValidAccelerator(src.interactionHotkey)) out.interactionHotkey = src.interactionHotkey;
    else issues.push('interactionHotkey');
  }
  if ('position' in src && src.position !== null) {
    const p = src.position;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) < 1e6 && Math.abs(p.y) < 1e6) {
      out.position = { x: p.x, y: p.y, displayId: p.displayId != null ? String(p.displayId) : null };
    } else issues.push('position');
  }
  out.version = SETTINGS_VERSION;
  return { settings: out, issues };
}

/** Migrações entre versões do formato. */
export function migrate(obj, issues = []) {
  const o = { ...obj };
  const v = Number.isInteger(o.version) ? o.version : 0;
  if (v > SETTINGS_VERSION) issues.push(`versão futura ${v}; campos desconhecidos ignorados`);
  if (v < 1) {
    // v0 (hipotético/manual): "margin" → safetyMargin; "hotkey" → interactionHotkey.
    if ('margin' in o && !('safetyMargin' in o)) o.safetyMargin = o.margin;
    if ('hotkey' in o && !('interactionHotkey' in o)) o.interactionHotkey = o.hotkey;
  }
  if (v < 5) {
    // v5: comportamento pré-configurado (sem opções na tela); valores antigos não valem mais.
    Object.assign(o, COMPORTAMENTO_V5);
    delete o.interactionTimeoutSec;
  }
  if (v < 4) {
    // v4: proteção de tela cheia é absoluta ("pausar"/"não fazer nada" deixavam o JoJo por cima).
    if (o.fullscreenBehavior !== 'hideAll') o.fullscreenBehavior = 'hide';
  }
  if (v < 3) {
    // v3: o motor da conversa passa a ser o Qwen 3.5 2B (Ollama neste PC) para todo mundo.
    o.iaProvedor = 'ollama';
    if (o.iaModelo && !/^qwen3\.5:2b/.test(o.iaModelo)) o.iaModelo = '';
  }
  if (v < 2) {
    // v2: "iniciar com o Windows" passou a vir ligado; quem tinha o padrão antigo ganha o novo.
    if (o.startWithWindows === false) o.startWithWindows = true;
  }
  if (v < 6 && (!o.iaProvedor || o.iaProvedor === 'ollama') && /^qwen3\.5:2b(?:$|-)/.test(o.iaModelo || '')) {
    // v6: o nome legado passa ao modelo oficial. Não religar conversa/rede,
    // autostart ou integrações; não apagar pesos antigos nem dados pessoais.
    o.iaModelo = '';
  }
  return o;
}

/** Aplica um patch parcial do usuário, validando. */
export function applyPatch(current, patch) {
  return sanitize({ ...current, ...patch });
}
