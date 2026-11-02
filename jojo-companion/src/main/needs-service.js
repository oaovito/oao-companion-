import path from 'node:path';
import { AtomicState } from '../core/atomic-state.js';
import { Needs, emptyNeeds, validateNeeds } from '../core/needs.js';

export function createNeedsService({ userData, companion, store, foods, balance, ipcMain, fromApp, fromOverlay, notify, log }) {
  const disk = new AtomicState(path.join(userData, 'needs.json'), { validate: validateNeeds, defaults: emptyNeeds, log });
  const canExpress = (related = false) => companion._canNag() && !companion.focus && !companion.game && !companion.fullscreenIds?.length && !(companion.bubble && !related) && !companion.chatQueue && !companion.dragging && !['fleeing', 'hidden'].includes(companion.avoid.state);
  const model = new Needs({ state: disk.load(), foods, balance, save: s => disk.write(s), clockHealthy: () => companion.progress.clockHealthy(), award: reward => {
    const result = companion.progress.award(reward);
    if (result.amount && canExpress()) companion.playCatalog(result.levelUp ? 'needsNivel' : 'needsXp', { source: 'evento', speak: false });
    return result;
  } });
  let badges = {};
  const withBadges = snapshot => ({ ...snapshot, objects: snapshot.objects.map(o => ({ ...o, badge: badges[o.egg] || null })) });
  function update() {
    const snapshot = withBadges(model.snapshot());
    // HUD pequeno em cache: nada de clonar catálogo/histórico em cada tick do overlay.
    companion.needs = { hunger: snapshot.hunger, health: snapshot.health, hygiene: snapshot.hygiene, mood: snapshot.mood, ill: snapshot.ill, weak: snapshot.weak, objects: snapshot.objects.map(({ badge, ...object }) => object) };
    const progress = companion.progress.snapshot(new Date());
    companion.progressHud = Object.fromEntries(['xp', 'nivel', 'xpPorNivel', 'percentXP', 'proximo', 'reward', 'quiet'].map(key => [key, progress[key]]));
    companion.progressHud.rewardHistory = progress.rewardHistory.slice(0, 5);
    companion._applyLayout(true); notify();
  }
  const beforeGuard = companion.onConversationGuard;
  companion.onConversationGuard = () => { beforeGuard?.(); update(); };
  model.changed = update;
  companion.progress.onAward = update;
  companion.progress.onXp = update;
  let feedEpoch = 0;
  function feed(id, { legacy = false } = {}) {
    const result = model.feed(id);
    if (result.fed) {
      const achievements = companion.progress.count('comidasDiferentes', Object.keys(model.st.foods).length, true);
      const epoch = ++feedEpoch; const context = companion.visualContext;
      if (!legacy) {
        if (canExpress(true)) {
          companion.effect = { name: 'food', kind: id, until: companion.clock.now() + 3400 };
          companion.playCatalog(result.animation, { source: 'pedido', speak: false }); companion.say(result.text, 'speech');
        }
        companion.clock.setTimeout(() => { if (epoch === feedEpoch && context === companion.visualContext && canExpress(true)) companion.playCatalog('needsMastigar', { source: 'evento', speak: false }); }, 1200);
        companion.clock.setTimeout(() => { if (epoch === feedEpoch && context === companion.visualContext && canExpress(true)) companion.playCatalog(achievements.length ? 'needsConquista' : 'needsSatisfeito', { source: 'evento', speak: false }); }, 3500);
      }
    }
    update(); return result;
  }
  function clean(id) {
    const result = model.clean(id);
    if (result.cleaned) {
      const achievements = companion.progress.count('limpezas', model.st.cleanCount, true);
      if (canExpress()) { companion.playCatalog(achievements.length ? 'needsConquista' : 'needsLimpo', { source: 'evento', speak: false }); companion.say(result.text, 'speech'); }
    }
    update(); return result;
  }
  companion.onFeed = id => feed(id, { legacy: true });
  companion.careChat = text => {
    const n = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (/^(?:jojo[, ]+)?(?:voce (?:esta|ta) bem|como voce (?:esta|ta)|como (?:esta|ta|vai) (?:sua|a sua) (?:fome|saude|higiene|humor)|voce (?:ta|esta) com fome|esta com fome)/.test(n)) {
      const s = model.snapshot(); return `${s.hungerState}. Saciedade ${s.hunger}/100, saúde ${s.health}/100, higiene ${s.hygiene}/100. ${s.ill ? 'Preciso de comida e cuidado. É a mecânica do meu aquário, sem plantão médico.' : 'Meus registros, sem inventar drama.'}`;
    }
    if (/^(?:abre|abrir|mostra|mostrar) (?:o |meu |seu )?(?:aquario|cardapio|painel de cuidados)/.test(n)) { companion.openApp('cuidados'); return 'Cuidados e cardápio abertos na Central. Escolha o alimento; eu cuido da avaliação severa.'; }
    return null;
  };
  const beforeTick = companion.onRoutineTick; let complaintAt = 0, lastState = model.hungerState(), preDigestion = null;
  companion.onRoutineTick = () => {
    beforeTick?.();
    const hour = new Date().getHours();
    const active = companion.progress.clockHealthy() && !companion.work && !companion.focus && !companion.suspended && !companion.paused && !companion.fullscreenHidden && !companion.fullscreenIds?.length && hour >= 6 && hour < 21;
    try {
      const nextDigestion = model.st.digestion.find(d => d.remaining > 0 && d.remaining <= 120000);
      if (active && nextDigestion && preDigestion !== nextDigestion.id && canExpress()) {
        companion.playCatalog('needsPreCoco', { source: 'evento', speak: false }); preDigestion = nextDigestion.id;
      }
      const result = model.tick({ active }); model.drain();
      if (result.spawned.length && canExpress()) {
        const type = result.spawned[0].type;
        companion.playCatalog(type === 'legendary' ? 'needsLendario' : ['gold', 'flaming', 'radioactive'].includes(type) ? 'needsRaro' : 'needsCoco', { source: 'evento', speak: false });
      }
      const state = model.hungerState();
      if (active && canExpress() && Date.now() - complaintAt > 30 * 60000) {
        if (model.st.hunger < 30) {
          const id = model.st.hunger < 5 ? 'needsDoente' : model.st.hunger < 10 ? 'needsExtrema' : model.st.hunger < 15 ? 'needsFraco' : lastState !== state ? 'needsFome' : 'needsRonco';
          companion.playCatalog(id, { source: 'evento', speak: false });
          companion.say(model.st.hunger < 15 ? 'Manu, meu estômago já fez a ata da reunião. Está escrito: comida, agora.' : 'Meu estômago está protocolando uma reclamação. O cardápio fica na Central.', 'speech', { spontaneous: true, category: 'necessidades' }); complaintAt = Date.now();
        } else if (model.st.hygiene < 25) {
          companion.playCatalog('needsFedor', { source: 'evento', speak: false }); companion.say('O aquário não é um experimento de resistência ao cheiro. Limpa esses depósitos.', 'speech', { spontaneous: true, category: 'necessidades' }); complaintAt = Date.now();
        }
      }
      lastState = state;
    } catch { log('warn', 'Necessidades não puderam ser confirmadas no disco.'); }
  };
  ipcMain.handle('needs:request', (e, request) => {
    if ((!fromApp(e) && !fromOverlay(e)) || !request || typeof request !== 'object') return { error: 'Solicitação indisponível.' };
    try {
      let result;
      if (request.action === 'feed') result = feed(request.id);
      else if (request.action === 'clean') {
        if (fromOverlay(e) && !companion.interaction) return { error: 'Ative a interação para limpar sem bloquear os cliques do Windows.' };
        result = clean(request.id);
      } else if (request.action === 'care') { result = model.care(); if (result.cared && canExpress()) companion.playCatalog('needsRecuperar', { source: 'evento', speak: false }); }
      else if (request.action !== 'snapshot') return { error: 'Operação desconhecida.' };
      update(); return { result, needs: withBadges(model.snapshot()), foods, types: balance.types, progress: companion.progress.snapshot(new Date()) };
    } catch { return { error: 'Não consegui confirmar o cuidado no disco. Nenhuma recompensa foi confirmada.' }; }
  });
  update();
  return { model, feed, clean, update, setBadges: icons => {
    badges = Object.fromEntries(Object.entries(icons).filter(([id, value]) => ['discord', 'lol'].includes(id) && typeof value === 'string' && /^data:image\/png;base64,[a-z0-9+/]+=*$/i.test(value) && value.length <= 131072));
    model.balance = { ...model.balance, localBadges: Object.keys(badges) }; update();
  }, snapshot: () => ({ ...withBadges(model.snapshot()), foods, types: balance.types }), close: () => ipcMain.removeHandler('needs:request') };
}
