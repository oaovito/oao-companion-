// Detecção do Discord: aplicativo instalado, processo aberto e aba do navegador.
// Puro (sem Electron, sem chamadas ao sistema): só reconhece e valida o que o
// processo principal leu. Nada aqui encerra, fecha ou desinstala.
import { createHash } from 'node:crypto';
import { win32 as winPath } from 'node:path';

/** As três edições oficiais do aplicativo para Windows. */
export const DISCORD_VARIANTS = Object.freeze([
  Object.freeze({ id: 'discord', nome: 'Discord', exe: 'discord.exe', pasta: 'discord' }),
  Object.freeze({ id: 'ptb', nome: 'Discord PTB', exe: 'discordptb.exe', pasta: 'discordptb' }),
  Object.freeze({ id: 'canary', nome: 'Discord Canary', exe: 'discordcanary.exe', pasta: 'discordcanary' }),
]);

const base = (value) => String(value || '').split(/[\\/]/).at(-1).toLowerCase();

export function variantById(id) {
  return DISCORD_VARIANTS.find((v) => v.id === id) || null;
}

/** Edição do Discord a que um executável pertence (pelo nome do arquivo), ou null. */
export function variantOfExe(name) {
  const b = base(name);
  return DISCORD_VARIANTS.find((v) => v.exe === b) || null;
}

/** Edições abertas a partir da lista de nomes de processo, sem repetição. */
export function runningVariants(names) {
  const ids = new Set();
  for (const n of Array.isArray(names) ? names : []) {
    const v = variantOfExe(n);
    if (v) ids.add(v.id);
  }
  return DISCORD_VARIANTS.filter((v) => ids.has(v.id)).map((v) => v.id);
}

// ------------------------------------------------------------- instalação

/** Onde o Windows registra o desinstalador de cada programa. */
export const UNINSTALL_HIVES = Object.freeze(['HKCU', 'HKLM']);

/**
 * Lê a resposta do leitor do registro (JSON) e devolve só entradas do Discord
 * com formato válido: [{ variante, hive, nome, uninstall }].
 */
export function parseInstalled(text) {
  let data;
  try { data = JSON.parse(String(text || '').trim() || '[]'); } catch { return []; }
  if (!Array.isArray(data)) data = data && typeof data === 'object' ? [data] : [];
  const out = [];
  for (const e of data.slice(0, 12)) {
    if (!e || typeof e !== 'object') continue;
    const v = DISCORD_VARIANTS.find((x) => x.pasta === String(e.chave || '').toLowerCase());
    const hive = String(e.hive || '').toUpperCase();
    const uninstall = typeof e.uninstall === 'string' ? e.uninstall.trim() : '';
    if (!v || !UNINSTALL_HIVES.includes(hive) || !uninstall || uninstall.length > 600) continue;
    if (out.some((o) => o.variante === v.id && o.hive === hive)) continue;
    out.push({ variante: v.id, hive, nome: String(e.nome || v.nome).slice(0, 80), uninstall });
  }
  return out;
}

/**
 * Comando do desinstalador oficial registrado pelo próprio Discord no Windows
 * ("...\Discord\Update.exe" --uninstall). Só aceita exatamente esse formato;
 * qualquer outra coisa devolve null e nada é executado.
 */
export function uninstallCommand(entry) {
  const v = entry && variantById(entry.variante);
  if (!v) return null;
  const raw = String(entry.uninstall || '').trim();
  const m = raw.match(/^"([^"]+)"\s*(.*)$/) || raw.match(/^(\S+\.exe)\s*(.*)$/i);
  if (!m) return null;
  const file = m[1];
  const args = m[2].trim() ? m[2].trim().split(/\s+/) : [];
  if (!winPath.isAbsolute(file) || /[%"<>|*?\r\n]/.test(file)) return null;
  if (base(file) !== 'update.exe' || base(winPath.dirname(file)) !== v.pasta) return null;
  if (!args.includes('--uninstall') || args.some((a) => a !== '--uninstall' && a !== '-s')) return null;
  // Instalação para todos os usuários: o Windows pede permissão de administrador.
  return { variante: v.id, file, args, admin: entry.hive !== 'HKCU' };
}

// ------------------------------------------------------------------- abas

/** O endereço é do Discord (discord.com, subdomínios ou o domínio antigo)? */
export function isDiscordUrl(url) {
  let host;
  try { host = new URL(String(url)).hostname.toLowerCase(); } catch { return false; }
  return ['discord.com', 'discordapp.com'].some((d) => host === d || host.endsWith(`.${d}`));
}

/** Padrões de endereço que a extensão enxerga. Nenhum outro site é visível para ela. */
export const DISCORD_TAB_PATTERNS = Object.freeze(['*://discord.com/*', '*://*.discord.com/*', '*://discordapp.com/*', '*://*.discordapp.com/*']);

export const NATIVE_HOST = 'com.jojo.companion.discord';
export const EXTENSION_ID = 'kjjaflbajnghbojganofnbdhfieheaog';
export const BROWSERS = Object.freeze({ chrome: 'Chrome', edge: 'Edge', brave: 'Brave', outro: 'navegador' });

/** Onde cada navegador procura a ponte com o JoJo (registro do próprio usuário). */
export const NATIVE_HOST_KEYS = Object.freeze([
  `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${NATIVE_HOST}`,
  `HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\${NATIVE_HOST}`,
  `HKCU\\Software\\BraveSoftware\\Brave-Browser\\NativeMessagingHosts\\${NATIVE_HOST}`,
]);

/** Canal local (só neste PC, só deste usuário) entre a ponte do navegador e o JoJo. */
export function bridgePipe(userData) {
  return `\\\\.\\pipe\\jojo-discord-${createHash('sha256').update(String(userData)).digest('hex').slice(0, 16)}`;
}

export function hostManifest(batPath) {
  return { name: NATIVE_HOST, description: 'JoJo Companion: abas do Discord', path: batPath, type: 'stdio', allowed_origins: [`chrome-extension://${EXTENSION_ID}/`] };
}

/** Arquivo que o navegador executa: abre a ponte usando o próprio executável do JoJo. */
export function hostBat({ exe, script, pipe }) {
  for (const p of [exe, script, pipe]) if (!p || /["\r\n]/.test(p)) throw new Error('Caminho inválido para a ponte do navegador.');
  const q = (p) => `"${p.replace(/%/g, '%%')}"`;
  // chcp 65001: caminhos com acento (nome de usuário) são lidos como UTF-8.
  return `@echo off\r\nchcp 65001 >nul\r\nset ELECTRON_RUN_AS_NODE=1\r\n${q(exe)} ${q(script)} ${q(pipe)}\r\n`;
}

const int = (v, max) => (Number.isInteger(v) && v >= 0 && v <= max ? v : null);

/**
 * Mensagem vinda da extensão. Só passam a quantidade de abas e o navegador:
 * nenhum endereço, título ou conteúdo sai do navegador.
 */
export function sanitizeBridgeMessage(msg) {
  if (!msg || typeof msg !== 'object') return null;
  const nav = Object.hasOwn(BROWSERS, msg.nav) ? msg.nav : 'outro';
  if (msg.t === 'abas') {
    const n = int(msg.n, 50);
    return n ? { t: 'abas', n, nav } : null;
  }
  if (msg.t === 'fechadas') {
    const n = int(msg.n, 50), falhas = int(msg.falhas ?? 0, 50);
    return n == null || falhas == null || n + falhas === 0 ? null : { t: 'fechadas', n, falhas, nav };
  }
  return null;
}

// Mensagens do navegador: 4 bytes com o tamanho (little-endian) + JSON em UTF-8.
export const FRAME_MAX = 65536;

export function encodeFrame(obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  const head = Buffer.alloc(4);
  head.writeUInt32LE(body.length, 0);
  return Buffer.concat([head, body]);
}

export class FrameReader {
  constructor() { this.buf = Buffer.alloc(0); this.broken = false; }

  /** Recebe um pedaço e devolve as mensagens completas. Tamanho inválido encerra a leitura. */
  push(chunk) {
    if (this.broken) return [];
    this.buf = Buffer.concat([this.buf, chunk]);
    const out = [];
    while (this.buf.length >= 4) {
      const len = this.buf.readUInt32LE(0);
      if (len > FRAME_MAX) { this.broken = true; this.buf = Buffer.alloc(0); break; }
      if (this.buf.length < 4 + len) break;
      const body = this.buf.subarray(4, 4 + len);
      this.buf = this.buf.subarray(4 + len);
      try { out.push(JSON.parse(body.toString('utf8'))); } catch { out.push(null); }
    }
    return out;
  }
}
