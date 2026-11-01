import path from 'node:path';
import { AtomicState } from '../core/atomic-state.js';
import { DarkestDungeon, validateDarkest, emptyDarkest } from '../core/darkest-dungeon.js';

export function createDarkestService({ userData, content, companion, store, notify, log }) {
  const disk = new AtomicState(path.join(userData, 'darkest-dungeon.json'), { validate: validateDarkest, defaults: emptyDarkest, log });
  let lastNotify = 0, lastError = 0;
  const model = new DarkestDungeon({ state: disk.load(), balance: content.balance, lines: content.lines,
    save: s => disk.write(s), award: reward => {
      const result = companion.progress.award(reward); lastNotify = 0;
      if (result.amount && !companion.work && !companion.focus && !companion.fullscreenHidden && !companion.lolHidden && companion._canNag()) companion.playCatalog(result.levelUp ? 'ddConquista' : 'ddXp', { speak: false, source: 'evento' });
      return result;
    } });
  model.changed = () => {
    if (Date.now() - lastNotify >= 5000) { lastNotify = Date.now(); notify(); }
  };
  companion.darkest = model;
  let lastValidDays = -1, lastSessions = -1;
  function observe(sample, idleSeconds) {
    try {
      const wasValid = model.st.session?.valid;
      const wasAchievement = model.st.achievement;
      model.observe({ ...(sample || {}), ...(store.get().darkestAtivo ? {} : { running: false, active: false }), idleSeconds, suspended: companion.suspended });
      if (lastValidDays !== model.st.days.length) { lastValidDays = model.st.days.length; companion.progress.count('ddDias', lastValidDays, true); }
      if (lastSessions !== model.st.sessions) { lastSessions = model.st.sessions; companion.progress.count('ddSessoes', lastSessions, true); }
      if (model.st.achievement && !wasAchievement && companion._canNag() && !companion.work && !companion.focus && !companion.fullscreenHidden) companion.playCatalog('ddConquista', { speak: false, source: 'evento' });
      if (wasValid && !model.st.session && companion._canNag() && !companion.work && !companion.focus && !companion.fullscreenHidden) companion.playCatalog('ddDesespero', { speak: false, source: 'evento' });
    } catch {
      if (Date.now() - lastError > 60000) { lastError = Date.now(); log('warn', 'Atividade de Darkest Dungeon não pôde ser confirmada no disco; não foi liberado XP novo.'); }
    }
  }
  const beforeTick = companion.onRoutineTick;
  companion.onRoutineTick = () => {
    beforeTick?.(); if (!store.get().darkestAtivo || !store.get().darkestSugestao) return;
    const suggestion = model.suggest({ focus: !!(companion.work || companion.focus), fullscreen: !!companion.fullscreenIds?.length,
      important: !!(companion.game || companion.interaction || companion.bubble || companion.dragging || companion.suspended), canSpeak: companion._canNag() });
    if (suggestion) {
      companion.playCatalog(suggestion.animation, { source: 'evento', speak: false });
      companion.say(suggestion.text, 'speech', { spontaneous: true, category: 'darkest' });
    }
  };
  return { model, observe, close: () => { try { model.flush(); } catch { log('warn', 'Últimos segundos ativos de Darkest Dungeon não foram confirmados.'); } } };
}
