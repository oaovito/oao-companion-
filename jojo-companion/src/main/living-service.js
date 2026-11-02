import path from 'node:path';
import { AtomicState } from '../core/atomic-state.js';
import { LivingInteractions, emptyScenes, validateScenes } from '../core/living-interactions.js';
import { isHeavy } from '../core/catalog/variety.js';
export function createLivingService({ userData, companion, store, items, log = () => {} }) {
  const disk = new AtomicState(path.join(userData, 'living-interactions.json'), { defaults: emptyScenes, validate: validateScenes, log });
  const model = new LivingInteractions({ items, state: disk.load(), save: state => disk.write(state), rng: companion.rng });
  const safe = (ambient = false) => companion._canNag() && !companion.focus && !companion.game && !companion.dragging && !companion.fullscreenIds?.length && !(ambient && (companion.interaction || companion.bubble || companion.chatQueue)) && !['fleeing', 'hidden'].includes(companion.avoid.state);
  function perform(item, { ambient = false } = {}) {
    if (!safe(ambient) || !companion.progress.clockHealthy() || model.now() < model.st.highTime) return false;
    if (!companion.playCatalog(item.id, { source: ambient ? 'ambiente' : 'chat', intensity: companion.reducedMotion ? 'suave' : undefined, speak: false })) return false;
    model.record(item, { ambient }); return true;
  }
  companion.livingChat = text => {
    const item = model.match(text); if (!item) return null;
    if (companion.work || companion.focus) return 'A encenação fica para depois do foco. Agora eu preservo o silêncio.';
    if (model.remaining(item)) return 'Essa cena acabou de passar. Escolhe outra na Coleção; meu repertório não é um botão de repetir.';
    if (!perform(item)) return 'Não vou interromper a tela cheia, uma fuga ou outra atividade para fazer essa cena. Peça quando houver espaço.';
    return item.falas[0];
  };
  const beforeTick = companion.onRoutineTick;
  companion.onRoutineTick = () => {
    beforeTick?.(); const s = store.get(); const hour = new Date().getHours();
    const allowed = safe(true) && s.surpresas && s.pacoteMemes && s.pacotesEspontaneos && s.ambienteFrequencia !== 'desligado' && hour >= 6 && hour < 21;
    if (!allowed || companion.rng() > 0.08) return;
    const item = model.candidate({ allowed, reducedMotion: companion.reducedMotion, heavyAllowed: s.animacoesPesadas, isHeavy });
    if (item) try {
      if (perform(item, { ambient: true }) && s.falasAmbientes) companion.say(item.falas[0], 'speech', { spontaneous: true, category: 'living' });
    } catch { log('warn', 'Não consegui preservar a memória da encenação.'); }
  };
  return { model, list: () => model.list() };
}
