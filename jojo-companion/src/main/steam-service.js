import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
const WORKER = fileURLToPath(new URL('./steam-inventory-worker.cjs', import.meta.url)).replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
export function scanSteam({ roots = [] } = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER); let settled = false;
    const finish = (error, value) => {
      if (settled) return; settled = true; clearTimeout(timer); void worker.terminate();
      if (error) reject(new Error(error)); else resolve(value);
    };
    const timer = setTimeout(() => finish('scan_timeout'), 10000);
    timer.unref?.();
    worker.once('message', result => finish(result.ok ? null : result.reason, result.inventory));
    worker.once('error', () => finish('scan_failed'));
    worker.once('exit', () => { if (!settled) finish('scan_failed'); });
    worker.postMessage({ roots });
    worker.unref();
  });
}
export function createSteamService({ getDetector, notify = () => {}, scan = scanSteam, extraRoots = [], now = () => Date.now() } = {}) {
  let inventory = null, scanning = null, lastScan = null, reason = null, sample = null, disposed = false, lastSignature = null, lastNotify = 0;
  const snapshot = () => ({
    status: reason ? 'unavailable' : !inventory || !sample ? 'scanning' : sample?.known === false ? 'unavailable' : sample?.steamRunning ? 'open' : 'closed',
    installed: inventory ? inventory.roots.length > 0 : null,
    libraries: inventory ? inventory.libraries.length : null,
    count: inventory ? inventory.games.length : null, lastScan, checkedAt: sample?.checkedAt || null,
    scanning: !!scanning, reason: reason || (sample?.known === false ? sample.reason : null),
    diagnostics: inventory?.diagnostics || [],
    games: (inventory?.games || []).map(game => {
      const process = sample?.games?.find(p => p.appId === game.appId && p.active) || sample?.games?.find(p => p.appId === game.appId);
      return { appId: game.appId, name: game.name, state: reason || !sample || sample.known === false ? 'unknown' : process?.active ? 'active' : process ? 'background' : 'installed' };
    }),
  });
  async function refresh() {
    if (disposed) return snapshot();
    if (scanning) return scanning;
    scanning = (async () => {
      try {
        const detector = getDetector();
        const roots = await detector?.steamRoots?.().catch(() => []) || [];
        const found = await scan({ roots: [...roots, ...extraRoots] });
        if (disposed) return;
        inventory = found; reason = null; lastScan = now();
        detector?.setGameInventory?.(inventory);
      } catch { reason = 'inventory_unavailable'; lastScan = now(); }
      finally { scanning = null; if (!disposed) notify(snapshot()); }
      return snapshot();
    })();
    notify(snapshot()); return scanning;
  }
  return { refresh, snapshot, observe(value) {
      sample = value || { known: false, reason: 'detector_unavailable', checkedAt: now() };
      const signature = JSON.stringify([sample.known, sample.reason, sample.steamRunning, sample.games]);
      if (signature !== lastSignature || now() - lastNotify >= 5000) { lastSignature = signature; lastNotify = now(); notify(snapshot()); }
    },
    inventory: () => inventory, dispose() { disposed = true; } };
}
