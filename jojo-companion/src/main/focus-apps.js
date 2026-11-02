import path from 'node:path';
import { AtomicState } from '../core/atomic-state.js';
const names = new Set(['discord', 'lol']);
export function createFocusApps({ userData, companion, store, getDetector, getFileIcon, notify = () => {}, onBadges = () => {} }) {
  const disk = new AtomicState(path.join(userData, 'local-app-badges.json'), { defaults: () => ({ icons: {} }), validate: data => {
    if (!data || !data.icons || typeof data.icons !== 'object') throw new Error('Ícones locais inválidos.');
    for (const [id, value] of Object.entries(data.icons)) if (!names.has(id) || typeof value !== 'string' || !/^data:image\/png;base64,[a-z0-9+/]+=*$/i.test(value) || value.length > 131072) throw new Error('Ícone local inválido.');
    return data;
  } });
  let badges = disk.load().icons, current = { state: 'idle', message: '' }, controller = null, generation = 0, lastBadgeAttempt = 0, refreshing = null;
  onBadges(badges);
  const set = value => { current = value; notify(current); };
  async function refreshBadges() {
    if (refreshing || Date.now() - lastBadgeAttempt < 30 * 60000) return refreshing;
    lastBadgeAttempt = Date.now();
    refreshing = (async () => {
      const detector = getDetector(); if (!detector?.available || !detector.brandIcons) return;
      const paths = await detector.brandIcons(); const next = { ...badges };
      for (const [id, file] of Object.entries(paths)) {
        if (!names.has(id) || !/\.(exe)$/i.test(file)) continue;
        const icon = await getFileIcon(file); if (!icon?.isEmpty()) next[id] = icon.toDataURL();
      }
      if (JSON.stringify(next) !== JSON.stringify(badges)) { disk.write({ icons: next }); badges = next; onBadges(badges); }
    })().catch(() => {}).finally(() => { refreshing = null; });
    return refreshing;
  }
  async function start() {
    controller?.abort(); const id = ++generation;
    if (!store.get().discordCloseOnFocus) { set({ state: 'disabled', message: 'Fechamento do Discord desativado.' }); return; }
    set({ state: 'checking', message: 'Conferindo o encerramento do Discord…' });
    controller = new AbortController(); const signal = controller.signal;
    try {
      const detector = getDetector(); if (!detector?.available || !detector.closeDiscord) throw new Error('unavailable');
      await refreshBadges(); if (signal.aborted) return;
      const result = await detector.closeDiscord({ force: store.get().discordForceClose === true, signal });
      if (id !== generation || signal.aborted || (!companion.work && !companion.focus)) return;
      set({ state: result.remaining ? 'still-running' : 'closed', ...result,
        message: result.remaining ? 'Discord continua aberto. O fechamento normal não encerrou o processo; encerramento forçado não foi aplicado ou não concluiu.' : result.detected ? 'Discord encerrado e processo conferido.' : 'Discord já estava fechado.' });
    } catch {
      if (id === generation && !signal.aborted) set({ state: 'error', message: 'Não consegui confirmar o encerramento do Discord. Não vou afirmar que foi fechado.' });
    }
  }
  function stop() { generation++; controller?.abort(); controller = null; set({ state: 'idle', message: '' }); }
  companion.onWorkStart = () => { start(); };
  companion.onWorkEnd = stop;
  companion.onFocusStart = () => { start(); };
  companion.onFocusEnd = stop;
  const beforeTick = companion.onRoutineTick;
  companion.onRoutineTick = () => { beforeTick?.(); refreshBadges(); };
  return { snapshot: () => ({ ...current }), start, stop, refreshBadges, close: stop };
}
