import path from 'node:path';
import { AtomicState } from '../core/atomic-state.js';
import { DarkestDungeon, validateDarkest, emptyDarkest } from '../core/darkest-dungeon.js';

export function createDarkestService({ userData, content, companion, store, notify, log }) {
  const disk = new AtomicState(path.join(userData, 'darkest-dungeon.json'), { validate: validateDarkest, defaults: emptyDarkest, log });
  let lastNotify = 0, lastError = 0;
  const model = new DarkestDungeon({ state: disk.load(), balance: content.balance, lines: content.lines,
    save: s => disk.write(s), award: reward => {
      const result = companion.progress.award(reward); lastNotify = 0;
      const previous = result.duplicate && companion.progress.st.rewards?.history.find(event => event.id === reward.id);
      return { ...result, levelUp: result.levelUp || previous?.levelUp };
    } });
  model.changed = () => {
    if (Date.now() - lastNotify >= 5000) { lastNotify = Date.now(); notify(); }
  };
  companion.darkest = model;
  let lastValidDays = -1, lastSessions = -1;
  const deliverVisual = () => model.takeVisual({
    allowed: store.get().darkestAtivo && companion._canNag() && !companion.work && !companion.focus && !companion.game && !companion.bubble && !companion.dragging && !companion.fullscreenIds?.length && !companion.chatQueue && !['fleeing', 'hidden'].includes(companion.avoid.state),
    play: id => companion.playCatalog(id, { speak: false, source: 'evento' }) });
  function observe(sample, idleSeconds) {
    try {
      model.observe({ ...(sample || {}), ...(store.get().darkestAtivo ? {} : { running: false, active: false }), idleSeconds, suspended: companion.suspended || !companion.progress.clockHealthy() });
      if (lastValidDays !== model.st.days.length) { lastValidDays = model.st.days.length; companion.progress.count('ddDias', lastValidDays, true); }
      if (lastSessions !== model.st.sessions) { lastSessions = model.st.sessions; companion.progress.count('ddSessoes', lastSessions, true); }
      deliverVisual();
    } catch {
      if (Date.now() - lastError > 60000) { lastError = Date.now(); log('warn', 'Atividade de Darkest Dungeon não pôde ser confirmada no disco; não foi liberado XP novo.'); }
    }
  }
  const beforeTick = companion.onRoutineTick;
  companion.onRoutineTick = () => {
    beforeTick?.(); if (!companion.progress.clockHealthy()) return;
    model.drain(); if (deliverVisual()) return;
    if (!store.get().darkestAtivo || !store.get().darkestSugestao) return;
    const suggestion = model.suggest({ focus: !!(companion.work || companion.focus), fullscreen: !!companion.fullscreenIds?.length,
      important: !!(model.st.pendingVisuals.length || companion.game || companion.interaction || companion.bubble || companion.dragging || companion.suspended), canSpeak: companion._canNag() });
    if (suggestion) {
      companion.playCatalog(suggestion.animation, { source: 'evento', speak: false });
      companion.say(suggestion.text, 'speech', { spontaneous: true, category: 'darkest' });
    }
  };
  return { model, observe, close: () => { try { model.flush(); } catch { log('warn', 'Últimos segundos ativos de Darkest Dungeon não foram confirmados.'); } } };
}
