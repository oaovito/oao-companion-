// Esquema das configurações: padrões, validação, migração de versão.
// Qualquer campo inválido volta ao padrão sem invalidar o arquivo inteiro.

import { isCalendarUrl, normalizeCalendarUrl } from './calendar.js';
import { sanitizeOutfit } from './wardrobe.js';

export const SETTINGS_VERSION = 3;

export const DEFAULTS = Object.freeze({
  version: SETTINGS_VERSION,
  size: 1.0,                    // escala do JoJo (0.6 – 1.8)
  preferredDisplay: 'auto',     // id do monitor ou 'auto'
  allowDisplaySwitch: true,     // pode passear/fugir para outros monitores
  safetyMargin: 100,            // px lógicos (40 – 300)
  moveSpeed: 1.0,               // multiplicador de velocidade (0.5 – 2)
  activity: 0.5,                // 0 calmo … 1 agitado
  speechFrequency: 'normal',    // off | rare | normal | often
  bubbleScale: 1.0,             // tamanho do texto dos balões (0.8 – 1.6)
  quietMode: false,             // sem falas espontâneas e sem broncas
  interactionHotkey: 'Control+Alt+J',
  interactionTimeoutSec: 45,    // saída automática do modo de interação (10 – 600)
  startWithWindows: true,       // inicia junto com o Windows (desmarcável)
  fullscreenBehavior: 'hide',   // hide | pause | ignore
  avoidFallback: 'fade',        // fade | hide  (sem espaço seguro / perseguição)
  reduceMotion: 'system',       // system | on | off — redução de movimento (acessibilidade)
  webSearch: true,              // pesquisar na internet perguntas sem resposta programada
  autoUpdate: true,             // baixar e instalar versões novas automaticamente
  iaAtivo: true,                // conversa com IA por API gratuita
  iaProvedor: 'ollama',         // ollama (Qwen 3.5 2B neste PC) | pollinations | groq | gemini | openrouter (só reversão manual)
  iaChave: '',                  // chave de provedor antigo (só reversão manual; fica só neste PC)
  iaModelo: '',                 // modelo (vazio = padrão do provedor)
  // Animações e falas ambientes (motor de variedade / antitédio).
  ambienteFrequencia: 'normal', // desligado | pouca | normal | muita
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
  lolBronca: true,              // mau humor e some enquanto o League of Legends está aberto
  spotifyReacoes: true,         // reage ao que toca no Spotify (só o título da janela, local)
  guardaRoupa: {},              // roupa que ela escolheu para o JoJo: {parte: peça}
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

const RANGES = {
  size: [0.6, 1.8],
  safetyMargin: [40, 300],
  moveSpeed: [0.5, 2],
  activity: [0, 1],
  bubbleScale: [0.8, 1.6],
  interactionTimeoutSec: [10, 600],
  agendaAvisoMin: [5, 60],
  trabalhoTamanho: [0.2, 1],
  trabalhoOpacidade: [0.2, 1],
  trabalhoMargem: [0, 200],
  trabalhoFim: [0, 8.64e15],
};

const ENUMS = {
  speechFrequency: ['off', 'rare', 'normal', 'often'],
  fullscreenBehavior: ['hide', 'pause', 'ignore'],
  avoidFallback: ['fade', 'hide'],
  reduceMotion: ['system', 'on', 'off'],
  iaProvedor: ['ollama', 'pollinations', 'groq', 'gemini', 'openrouter'],
  ambienteFrequencia: ['desligado', 'pouca', 'normal', 'muita'],
  ambienteIntensidade: ['auto', 'suave', 'normal', 'exagerado'],
  ambienteModo: ['auto', 'calmo', 'pilhado'],
  microMovimentos: ['normal', 'discreto', 'desligado'],
  trabalhoPerfil: ['trabalho', 'deep', 'invisivel'],
  trabalhoCanto: ['inferiorDireito', 'inferiorEsquerdo', 'superiorDireito', 'superiorEsquerdo'],
};

const BOOLS = ['allowDisplaySwitch', 'quietMode', 'startWithWindows', 'visible', 'paused', 'webSearch', 'autoUpdate', 'iaAtivo', 'surpresas', 'avisoRaros', 'falasAmbientes', 'lolBronca', 'spotifyReacoes', 'agendaAtiva', 'agendaSugerida', 'animacoesPesadas', 'trabalhoAtivo', 'trabalhoRestaurar'];

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
  if ('agendaUrl' in src) {
    if (src.agendaUrl === '' || isCalendarUrl(src.agendaUrl)) out.agendaUrl = normalizeCalendarUrl(src.agendaUrl);
    else issues.push('agendaUrl');
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
  if (v < 3) {
    // v3: o motor da conversa passa a ser o Qwen 3.5 2B (Ollama neste PC) para todo mundo.
    o.iaProvedor = 'ollama';
    if (o.iaModelo && !/^qwen3\.5:2b/.test(o.iaModelo)) o.iaModelo = '';
  }
  if (v < 2) {
    // v2: "iniciar com o Windows" passou a vir ligado; quem tinha o padrão antigo ganha o novo.
    if (o.startWithWindows === false) o.startWithWindows = true;
  }
  return o;
}

/** Aplica um patch parcial do usuário, validando. */
export function applyPatch(current, patch) {
  return sanitize({ ...current, ...patch });
}
