// Gerencia a detecção de tela cheia e do app em primeiro plano (somente Windows) em um processo
// utilitário isolado. Falhas desativam o recurso sem afetar o JoJo.
import { utilityProcess } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchFullscreenDisplay } from '../core/displays.js';

const WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fullscreen-worker.cjs');
const MAX_CRASHES = 2;

export function createFullscreenDetector(log = () => {}) {
  if (process.platform !== 'win32') {
    return { available: false, reason: 'Disponível apenas no Windows', detect: async () => ({ fullscreenIds: [], instagram: false, lol: false, spotify: null }), setOwnHandles() {}, dispose() {} };
  }
  const state = { available: true, reason: null, child: null, ready: false, pending: new Map(), seq: 0, crashes: 0, own: [], readyWaiters: [] };

  function spawn() {
    state.ready = false;
    try {
      state.child = utilityProcess.fork(WORKER, [], { serviceName: 'JoJo fullscreen detector', stdio: 'ignore' });
    } catch (e) {
      disable(`não foi possível iniciar o detector (${e.message})`);
      return;
    }
    state.child.on('message', (m) => {
      if (m.type === 'ready') { state.ready = true; for (const fn of state.readyWaiters.splice(0)) fn(); }
      else if (m.type === 'result' || m.type === 'error') {
        const p = state.pending.get(m.id);
        if (!p) return;
        state.pending.delete(m.id);
        if (m.type === 'result') p.resolve(m.result);
        else p.reject(new Error(m.message));
      }
    });
    state.child.on('exit', (code) => {
      for (const p of state.pending.values()) p.reject(new Error('detector encerrado'));
      state.pending.clear();
      state.child = null;
      state.ready = false;
      if (!state.available) return;
      state.crashes++;
      log('warn', `Detector de tela cheia encerrou (código ${code}); tentativa ${state.crashes}/${MAX_CRASHES}`);
      if (state.crashes >= MAX_CRASHES) disable('o detector falhou repetidamente');
      else setTimeout(spawn, 2000);
    });
    state.child.postMessage({ type: 'init', own: state.own });
  }

  function disable(reason) {
    state.available = false;
    state.reason = `Indisponível: ${reason}`;
    log('warn', `Detecção de tela cheia desativada: ${reason}`);
    if (state.child) state.child.kill();
  }

  spawn();

  async function request(type, opts, timeoutMs = 6000, signal = null) {
    if (!state.available) throw new Error('detector_unavailable');
    if (!state.ready) await new Promise((resolve, reject) => {
      const ready = () => { clearTimeout(timer); resolve(); };
      const timer = setTimeout(() => { state.readyWaiters = state.readyWaiters.filter(fn => fn !== ready); reject(new Error('detector_not_ready')); }, 2500);
      state.readyWaiters.push(ready);
    });
    if (signal?.aborted) throw new Error('cancelled');
    const id = ++state.seq;
    return new Promise((resolve, reject) => {
      const done = (fn, value) => { clearTimeout(timer); signal?.removeEventListener('abort', abort); fn(value); };
      const abort = () => { state.pending.delete(id); state.child?.postMessage({ type: 'cancelDiscord', id }); done(reject, new Error('cancelled')); };
      const timer = setTimeout(() => { state.pending.delete(id); state.child?.postMessage({ type: 'cancelDiscord', id }); done(reject, new Error('native_timeout')); }, timeoutMs);
      state.pending.set(id, { resolve: value => done(resolve, value), reject: e => done(reject, e) });
      signal?.addEventListener('abort', abort, { once: true });
      state.child.postMessage({ type, id, opts });
    });
  }

  return {
    get available() {
      return state.available;
    },
    get reason() {
      return state.reason;
    },
    closeDiscord: ({ force = false, signal = null } = {}) => request('closeDiscord', { force: force === true }, 6000, signal),
    brandIcons: () => request('brandIcons', {}, 6000),
    setOwnHandles(handles) {
      state.own = handles.map(String);
      if (state.child) state.child.postMessage({ type: 'init', own: state.own });
    },
    /** @returns Promise<{fullscreenIds, instagram}> */
    async detect(toDip, displays, opts = {}) {
      if (!state.available || !state.child || !state.ready) return { fullscreenIds: [], instagram: false, lol: false, spotify: null };
      const id = ++state.seq;
      const result = await new Promise((resolve, reject) => {
        state.pending.set(id, { resolve, reject });
        state.child.postMessage({ type: 'detect', id, opts });
        setTimeout(() => {
          if (state.pending.delete(id)) reject(new Error('tempo esgotado'));
        }, 1500);
      });
      state.last = result;
      const extra = { instagram: !!(result && result.instagram), lol: !!(result && result.lol), spotify: (result && result.spotify) || null, categoria: (result && result.categoria) || null, darkest: result?.darkest || null };
      if (!result || !result.fullscreen || !result.monitor) return { fullscreenIds: [], ...extra };
      const d = matchFullscreenDisplay(toDip(result.monitor), displays);
      return { fullscreenIds: d ? [d.id] : [], ...extra };
    },
    get last() {
      return state.last || null;
    },
    dispose() {
      state.available = false;
      if (state.child) state.child.kill();
    },
  };
}

/** Converte o HWND (Buffer de getNativeWindowHandle) para string decimal. */
export function hwndToString(buf) {
  try {
    return (buf.length >= 8 ? buf.readBigUInt64LE(0) : BigInt(buf.readUInt32LE(0))).toString();
  } catch {
    return null;
  }
}
