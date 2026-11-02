import path from 'node:path';
import { AtomicState } from '../core/atomic-state.js';
import { LivingInteractions, emptyScenes, validateScenes } from '../core/living-interactions.js';
import { isHeavy } from '../core/catalog/variety.js';

const MESSAGES = {
  fullscreen_blocked: 'A janela ativa está em tela cheia no monitor do JoJo. Vou aguardar ela sair.',
  focus_blocked: 'A encenação fica para depois do foco. Agora eu preservo o silêncio.',
  animation_busy: 'Aguardo terminar o movimento ou a animação atual para encenar.',
  cooldown: 'Essa cena acabou de passar. Escolhe outra na Coleção; meu repertório não é um botão de repetir.',
  missing_asset: 'O desenho dessa cena não foi encontrado no catálogo. Não consigo encenar agora.',
  renderer_error: 'O desenho não respondeu. A cena não foi confirmada; você pode tentar novamente.',
  storage_error: 'A cena foi desenhada, mas não consegui confirmar sua memória no disco.',
  clock_error: 'O relógio mudou para trás. Não consigo confirmar o intervalo dessa cena agora.',
  hidden: 'Mostre o JoJo pela bandeja ou pela Central para assistir à cena.',
  expired: 'O pedido de cena expirou enquanto o contexto estava ocupado. Pode pedir de novo.',
  cancelled: 'A cena pendente foi cancelada porque o contexto mudou.',
};
export function createLivingService({ userData, companion, store, items, log = () => {}, refreshContext = null, hasAnimation = () => true, confirmAnimation = async () => true }) {
  const disk = new AtomicState(path.join(userData, 'living-interactions.json'), { defaults: emptyScenes, validate: validateScenes, log });
  const model = new LivingInteractions({ items, state: disk.load(), save: state => disk.write(state), rng: companion.rng });
  const queue = []; let timer = null, running = false, disposed = false, generation = 0, last = null;
  const result = (status, item, extra = {}) => ({ status, itemId: item?.id, message: MESSAGES[status] || '', ...extra });
  function blocked(item, ambient) {
    if (!companion.catalogById.has(item.id) || !hasAnimation(companion._catalogData(item, companion.reducedMotion ? 'suave' : undefined).anim)) return 'missing_asset';
    if (companion.work || companion.focus) return 'focus_blocked';
    if (model.remaining(item)) return 'cooldown';
    if (companion.fullscreenHidden) return 'fullscreen_blocked';
    if (!companion.started || companion.quitting || companion.userHidden) return 'hidden';
    if (companion.suspended || companion.dragging || ['fleeing', 'hidden'].includes(companion.avoid.state) || ['flee', 'hidden', 'dragged', 'goodbye', 'gone', 'avc'].includes(companion.behavior.state)) return 'animation_busy';
    if (!ambient && (companion.game || companion.clock.now() < (companion.emotionalUntil || 0))) return 'animation_busy';
    if (ambient && (!companion._canNag() || companion.game || companion.interaction || companion.bubble || companion.chatQueue || companion.fullscreenIds?.length || queue.length)) return 'animation_busy';
    if (!ambient && companion.behavior.state === 'act' && companion.clock.now() < companion.behavior.cur.phaseEnd) return 'animation_busy';
    if (!companion.progress.clockHealthy() || model.now() < model.st.highTime) return 'clock_error';
    return null;
  }
  async function perform(item, { ambient = false, expectedGeneration = generation } = {}) {
    const why = blocked(item, ambient); if (why) return result(why, item);
    const animation = companion._catalogData(item, companion.reducedMotion ? 'suave' : undefined).anim;
    try {
      if (!companion.playCatalog(item.id, { source: ambient ? 'ambiente' : 'comando', intensity: companion.reducedMotion ? 'suave' : undefined, speak: false })) return result('animation_busy', item);
      if (!await confirmAnimation(animation)) {
        if (companion.behavior.anim === animation) { companion.behavior.request('idle', { now: companion.clock.now(), force: true }); companion._applyLayout(true); }
        return result('renderer_error', item);
      }
      if (expectedGeneration !== generation || disposed) return result('cancelled', item);
      try { if (!model.record(item, { ambient })) return result('clock_error', item); }
      catch { return result('storage_error', item, { rendered: true }); }
      return result('executed', item, { message: item.falas[0] });
    } catch { log('warn', 'Não consegui confirmar a execução ou preservar a memória da encenação.'); return result('renderer_error', item); }
  }
  function schedule() {
    if (timer || disposed || !queue.length) return;
    timer = companion.clock.setTimeout(() => { timer = null; void drain(); }, 250);
  }
  async function drain() {
    if (running || disposed || !queue.length) return;
    const next = queue[0];
    if (companion.clock.now() >= next.expires || companion.work || companion.focus || companion.quitting) {
      queue.shift(); last = result(companion.clock.now() >= next.expires ? 'expired' : 'cancelled', next.item); notify(last); schedule(); return;
    }
    running = true; const ticket = generation;
    try {
      const outcome = await perform(next.item, { expectedGeneration: ticket });
      if (ticket !== generation) return;
      if (['animation_busy', 'fullscreen_blocked'].includes(outcome.status)) return;
      queue.shift(); last = outcome; notify(outcome);
    } finally { running = false; schedule(); }
  }
  function notify(outcome) {
    if (outcome.status === 'executed') companion.conversations.addMessage(companion.conversations.current().id, 'jojo', `${model.items.find(item => item.id === outcome.itemId)?.nome}: ${outcome.message}`);
    else if (!['cancelled'].includes(outcome.status)) companion.conversations.addMessage(companion.conversations.current().id, 'jojo', outcome.message);
  }
  function cancel() {
    generation++; queue.length = 0;
    if (timer) companion.clock.clearTimeout(timer); timer = null;
  }
  companion.onSceneChat = text => { if (!model.match(text)) cancel(); };
  companion.livingChat = async text => {
    const item = model.match(text); if (!item) return null;
    const requestedGeneration = generation;
    if (refreshContext) await refreshContext().catch(() => {});
    if (requestedGeneration !== generation) return result('cancelled', item);
    const immediate = blocked(item, false);
    if (immediate && !['animation_busy', 'fullscreen_blocked'].includes(immediate)) return result(immediate, item);
    let outcome;
    if (running || queue.length) outcome = result('animation_busy', item);
    else { running = true; try { outcome = await perform(item); } finally { running = false; schedule(); } }
    if (['animation_busy', 'fullscreen_blocked'].includes(outcome.status)) {
      if (!queue.some(entry => entry.item.id === item.id)) {
        if (queue.length >= 4) return result('animation_busy', item, { message: 'Já tenho quatro cenas aguardando. Espere a fila terminar.' });
        queue.push({ item, expires: companion.clock.now() + 20000 });
      }
      schedule(); outcome = { ...outcome, status: 'queued', reason: outcome.status, queued: true, message: `${outcome.message} O pedido ficará na fila por até 20 segundos.` };
    }
    last = outcome; return outcome;
  };
  const beforeTick = companion.onRoutineTick;
  companion.onRoutineTick = () => {
    beforeTick?.(); const s = store.get(), hour = new Date().getHours();
    const allowed = !queue.length && !running && s.surpresas && s.pacoteMemes && s.pacotesEspontaneos && s.ambienteFrequencia !== 'desligado' && hour >= 6 && hour < 21;
    if (!allowed || companion.rng() > 0.08) return;
    const item = model.candidate({ allowed, reducedMotion: companion.reducedMotion, heavyAllowed: s.animacoesPesadas, isHeavy });
    if (item && !blocked(item, true)) {
      running = true;
      void perform(item, { ambient: true }).then(outcome => { if (outcome.status === 'executed' && s.falasAmbientes) companion.say(item.falas[0], 'speech', { spontaneous: true, category: 'living' }); }).finally(() => { running = false; schedule(); });
    }
  };
  return { model, list: () => model.list(), perform, drain, snapshot: () => ({ last, queued: queue.map(entry => entry.item.id) }), dispose() { disposed = true; cancel(); } };
}
