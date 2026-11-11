// Guardião do bloqueio do Discord: liga a chave das configurações à detecção
// e à reação. Com a chave desligada nada roda: sem conferência de processos,
// sem leitura do registro, sem canal para a extensão e sem ponte registrada.
import path from 'node:path';
import { AtomicState } from '../core/atomic-state.js';
import { DiscordBlocker, DiscordHistory, sanitizeHistory } from '../core/discord-blocker.js';
import { createDiscordSystem } from './discord-system.js';

export const DISCORD_CHECK_MS = 15000;

export function createDiscordGuard({ userData, root, companion, store, getDetector, log = () => {}, notify = () => {}, system = null,
  setTimer = (fn, ms) => setInterval(fn, ms), clearTimer = (t) => clearInterval(t) }) {
  const disk = new AtomicState(path.join(userData, 'discord-historico.json'), { defaults: () => ({ itens: [] }), validate: (data) => {
    if (!data || !Array.isArray(data.itens)) throw new Error('Histórico do Discord inválido.');
    return { itens: sanitizeHistory(data.itens) };
  } });
  const sys = system || createDiscordSystem({ userData, root, getDetector, log });
  const enabled = () => store.get().discordBloqueio === true;
  const history = new DiscordHistory({ load: () => disk.load().itens, save: (itens) => { try { disk.write({ itens }); } catch { log('warn', 'Não consegui salvar o histórico do Discord.'); } notify(); } });
  const blocker = new DiscordBlocker({ sys, enabled, history, log,
    onScold: (x) => companion.discordScold(x),
    onResult: (r) => { companion.discordResult(r); } });
  let timer = null, active = false, bridge = { ok: false, registradas: 0 }, applying = Promise.resolve();

  const check = () => blocker.check().catch(() => log('warn', 'A conferência do Discord falhou.'));

  async function turnOn() {
    if (active) return;
    active = true;
    blocker.reset();
    try { bridge = await sys.installBridge(); } catch { bridge = { ok: false, registradas: 0 }; log('warn', 'Não consegui preparar a extensão do navegador.'); }
    if (!active) return;
    sys.listen((msg) => blocker.onBridge(msg));
    timer = setTimer(check, DISCORD_CHECK_MS);
    check();
    log('info', 'Bloqueio do Discord ligado.');
    notify();
  }

  async function turnOff() {
    if (!active) return;
    active = false;
    if (timer) clearTimer(timer);
    timer = null;
    sys.close();
    blocker.reset();
    try { await sys.removeBridge(); } catch { /* registro já ausente */ }
    bridge = { ok: false, registradas: 0 };
    log('info', 'Bloqueio do Discord desligado.');
    notify();
  }

  /** Aplica a chave atual. Chamado ao abrir o app e a cada mudança dela. */
  function apply() {
    applying = applying.then(() => (enabled() ? turnOn() : turnOff())).catch(() => {});
    return applying;
  }

  function snapshot() {
    return { ativo: enabled(), ponte: bridge.ok, pastaExtensao: active ? sys.extensionDir : null, historico: companion.discordHistoryLines(history.list(50)) };
  }

  companion.discordInfo = () => ({ ativo: enabled(), historico: companion.discordHistoryLines(history.list(5)) });

  function close() {
    if (timer) clearTimer(timer);
    timer = null;
    active = false;
    sys.close();
  }

  return { apply, snapshot, close, check, history, blocker, get extensionDir() { return active ? sys.extensionDir : null; } };
}
