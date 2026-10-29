// Controlador do JoJo: une desvio do cursor, movimento, máquina de estados,
// falas, modo de interação e layout da janela overlay.
//
// Não depende do Electron. Recebe adaptadores:
//   platform: { getCursor(), getDisplays(), primaryDisplayId() }
//   overlay:  { setBounds(b), setMouseMode('passthrough'|'interactive'), setCapture(bool),
//               show(), hide(), focus(), render(state), measureBubble(req) → Promise<{width,height}> }
//   clock:    { now(), setTimeout(fn, ms), clearTimeout(id) }
//   store:    SettingsStore-like { get(), update(patch, opts) }
import { AvoidanceController, isSafeTarget, choosePathControl } from './avoidance.js';
import { Mover } from './motion.js';
import { BehaviorMachine, PRIORITY, STATES, weightedPick } from './behavior.js';
import { PhraseBook, readingTimeMs, greetingCategory } from './phrases.js';
import { placeAround, composeWindow } from './layout.js';
import { displayForRect, allowedDisplays, recoverRect, topologySignature, primaryDisplay } from './displays.js';
import { distPointRect, roundRect, dist, clamp, intersection } from './geometry.js';
import { animName, INTENSITIES } from './catalog/recipes.js';
import { VarietyEngine, periodOf } from './catalog/variety.js';
import { detectIntent, normalizeText } from './dialogue/scripted-provider.js';
import { isFactualQuestion } from './dialogue/web-search.js';
import { jojoRects, metricsFrom } from './rig-metrics.js';
import { SPEECH_INTERVALS, AMBIENT_WEIGHTS } from './settings-schema.js';
import { PERSONALITY_DEFAULTS, MEALS, InstagramWatcher, dailyReminder, weeklyReminder, phraseFilter, phraseWeight, profileVars, dayKey } from './personality.js';
import { ConversationManager, parseCommand, commandMenu } from './conversations.js';
import { holidayFor, HOLIDAYS } from './holidays.js';

const TOOLBAR_SIZE = { width: 278, height: 50 };
// O que um tubarão come (peso no sorteio). Gente só de vez em quando.
const FOODS = { peixe: 3, foca: 2, lula: 2, tartaruga: 1.5, pinguim: 1.5, humano: 0.8 };
// Momento do arroto depois de começar a comer.
const BURP_MS = 2500;
// Altura extra acima da caixa para chapéus das fantasias (px lógicos, escala 1).
const COSTUME_HEADROOM = 36;
const COSTUME_FOOTROOM = 40;
// Momento da fala nas animações com resposta atrasada (ms após o início).
const DELAYED_REPLY_MS = { smitten: 4200, poop: 4800, avc: 3500 + 1600 + 900 + 60000 + 1500 };
const ACTIVITY_ROW = 26;
const ACTIVITY_WIDTH = 224;
const THINK_BUBBLE_MS = 1200; // resposta demorando: balão de pensamento "…"
const THINK_MS = 650; // "digitando…": tempo em que a conversa fica "Em andamento"
const CHAT_SIZE = { width: 300, height: 270 };
const USER_CATEGORIES = new Set(['petted', 'food', 'play', 'interactEnter', 'interactExit', 'alreadyRunning', 'goodbye', 'unpause', 'dragged', 'land', 'achievement', 'quietAck', 'scare']);
// Intervalo mínimo entre quaisquer falas espontâneas (inclui reações e "Zzz").
const MIN_SPONTANEOUS_GAP = { off: Infinity, rare: 240e3, normal: 90e3, often: 40e3 };
const WALK_SPEED = 70;
const FLEE_SPEED = 1150;
const CALM_STATES = new Set(['idle', 'sit', 'lookAround', 'curious', 'lie', 'ambient']);
// Intenções do chat que deixam o catálogo responder por frase (as outras têm resposta própria).
const CATALOG_CHAT_INTENTS = new Set(['unknown', 'play', 'gym', 'eat', 'greet', 'howAreYou', 'help', 'name', 'thanks', 'scare', 'pet']);
const REMINDER_CATS = /^(refeicao_|treinoLembrete|foodReminder)/;

export class Companion {
  constructor({ platform, overlay, clock, store, personality = null, rig = null, room = null, catalog = null, ambientLines = null, variety = null, phrases = null, dialogue = null, rng = Math.random, log = () => {} }) {
    // Quanto cada animação/efeito passa da caixa (assets/animations/jojo.room.json).
    this.room = room || { anims: {}, effects: {} };
    this.roomPrev = null; // espaço da animação anterior durante a transição
    // Perfil de personalidade (separado da aparência): {get()} — ex.: SettingsStore de personality.json.
    this.personality = personality || { get: () => PERSONALITY_DEFAULTS, update: () => [] };
    this.instagram = new InstagramWatcher();
    this.reminderTimer = null;
    // Conversas e atividades (balão de status). Callbacks definidos pelo main:
    this.conversations = new ConversationManager({ now: () => Date.now() });
    this.needsSeen = new Set();
    this.conversations.onChange(() => {
      // Atividade nova "Precisa de você": notificação com pulinho.
      const needs = this.conversations.activities(8).filter((a) => a.status === 'needsInput' && (this.conversations.get(a.id) || {}).kind !== 'chat').map((a) => a.id);
      const fresh = needs.some((id) => !this.needsSeen.has(id));
      this.needsSeen = new Set(needs);
      if (fresh && this.started && this.catalog) this.clock.setTimeout(() => this.fireEvent('notificacao', { speak: false }), 0);
      if (this.started) this._applyLayout(true);
      if (this.onConversationsChange) this.onConversationsChange();
    });
    this.onConversationsChange = null; // () => void
    this.onOpenApp = null; // (conversationId|null) => void — traz a Central do JoJo para frente
    this.onOpenSettings = null; // () => void
    this.activitiesHiddenUntil = 0;
    this.activityRect = null;
    this.reducedMotion = false;
    this.costume = null; // fantasia da data festiva (natal, pascoa…)
    this.powderKind = null; // 'snort' | 'chug' enquanto senta no chão (PC parado)
    this.wiredKind = null;
    this.wiredUntil = 0;
    this.lastSaid = null;
    this.platform = platform;
    this.overlay = overlay;
    this.clock = clock;
    this.store = store;
    this.rng = rng;
    this.log = log;
    this.metrics = metricsFrom(rig);
    this.phrases = new PhraseBook(phrases, { rng });
    this.applyPersonality(this.personality.get());
    this.dialogue = dialogue;
    // Catálogo de animações (assets/catalog/animacoes.json) e motor de variedade.
    this.catalog = catalog || { itens: [] };
    this.catalogById = new Map(this.catalog.itens.map((it) => [it.id, it]));
    this.variety = new VarietyEngine({
      catalog: this.catalog,
      lines: ambientLines || { falas: [] },
      state: variety ? variety.get() : null,
      save: (st) => variety && variety.set(st),
      rng,
      now: () => this.clock.now(),
      getPrefs: () => {
        const st = this.store.get();
        return { modo: st.ambienteModo, surpresas: st.surpresas };
      },
    });
    this.ambientItem = null; // item do catálogo tocando agora (ambiente ou pedido)
    this.ambientQueue = [];
    this.walkTarget = null;

    const s = store.get();
    this.avoid = new AvoidanceController({ margin: s.safetyMargin });
    this.mover = new Mover();
    this.behavior = new BehaviorMachine({ rng, activity: s.activity, getContext: () => this._behaviorContext() });
    this.behavior.on((ev) => this._onBehavior(ev));

    this.displays = [];
    this.topology = '';
    this.pos = { x: 0, y: 0 };
    this.facing = 1;
    this.opacity = 1;
    this.ghost = false;

    this.bubble = null;        // {text, kind, size, until, category}
    this.bubbleQueue = null;
    this.measureSeq = 0;
    this.effect = null;        // {name, until}
    this.talkingUntil = 0;

    this.interaction = false;
    if (this.chatOpen) this.conversations.setViewing(this.conversations.current().id, false);
    this.chatOpen = false;
    this.capture = false;
    this.lastInteractionActivity = 0;
    this.dragging = null;      // {offset:{x,y}}

    this.userHidden = !s.visible;
    this.fullscreenHidden = false;
    this.fullscreenPaused = false;
    this.suspended = false;
    this.started = false;
    this.quitting = false;

    this.cursor = { x: -1e6, y: -1e6 };
    this.cursorVel = { x: 0, y: 0 };
    this.lastCursorAt = 0;
    this.lastTick = 0;
    this.timer = null;
    this.nextSpeechAt = Infinity;
    this.lastSpokeAt = -Infinity;
    this.startedAt = 0;
    this.lastUserActionAt = 0;
    this.lastBounds = null;
    this.lastRender = '';
    this.hotkeyLabel = s.interactionHotkey;
    this.stats = { ticks: 0, flees: 0, hides: 0, clickThroughRepairs: 0 };
    this.onInteractionChange = null; // (ativo:boolean) => void — ex.: Esc global só no modo de interação
  }

  // ---------------------------------------------------------------- ciclo de vida

  start() {
    const now = this.clock.now();
    this.startedAt = now;
    this.lastUserActionAt = now;
    this.refreshDisplays({ initial: true });
    this.overlay.setMouseMode('passthrough');
    this.started = true;
    this._scheduleSpeech(now, true);
    // Fantasia da data festiva já aparece ao abrir; o cumprimento vem na checagem.
    const festa = this.personality.get().festas.ativo ? holidayFor(new Date()) : null;
    this.holiday = festa;
    this.costume = festa ? HOLIDAYS[festa].fantasia : null;
    this._scheduleReminderCheck(20000);
    if (this.userHidden) {
      this.overlay.hide();
      return;
    }
    this.overlay.show();
    this.behavior.request('appear', { now, force: true });
    this._applyLayout(true);
    this._schedule(0);
    this.clock.setTimeout(() => {
      this.sayCategory(greetingCategory(new Date()), { force: false, fallback: 'greeting' });
      const per = periodOf(new Date());
      if (per === 'manha') this.fireEvent('bomDia', { speak: false });
      else if (per === 'noite') this.fireEvent('boaNoite', { speak: false });
      this._checkStreak(new Date());
    }, 1500);
  }

  /** Sequência de dias seguidos com o JoJo (constância, sem cobrança). */
  _checkStreak(date) {
    const st = this.variety.state;
    const today = dayKey(date);
    const y = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
    const s = st.streak || { last: null, count: 0 };
    if (s.last === today) return s.count;
    s.count = s.last === dayKey(y) ? s.count + 1 : 1;
    s.last = today;
    st.streak = s;
    this.variety.save(st);
    if (s.count >= 2) {
      this.clock.setTimeout(() => {
        if (this.fireEvent('sequencia', { speak: false })) this.say(`${s.count} dias seguidos comigo. Constância é tudo.`, 'speech', { spontaneous: true });
      }, 6000);
    }
    return s.count;
  }

  stop() {
    this._cancelTimer();
    if (this.reminderTimer) this.clock.clearTimeout(this.reminderTimer);
    this.reminderTimer = null;
    this.started = false;
  }

  /** Despedida animada; resolve quando terminar. */
  goodbye() {
    return new Promise((resolve) => {
      if (this.quitting) return resolve();
      this.quitting = true;
      if (this.interaction) this.exitInteraction('quit');
      if (this.userHidden || this.suspended || !this.started) return resolve();
      const now = this.clock.now();
      this.mover.stop();
      this.behavior.request('goodbye', { now, force: true });
      this.sayCategory('goodbye', { force: true });
      this._applyLayout(true);
      this.clock.setTimeout(resolve, 1500);
    });
  }

  _cancelTimer() {
    if (this.timer) this.clock.clearTimeout(this.timer);
    this.timer = null;
  }

  _schedule(ms) {
    this._cancelTimer();
    if (!this.started || this.suspended || this.userHidden) return;
    this.timer = this.clock.setTimeout(() => {
      this.timer = null;
      this.tick();
    }, ms);
  }

  // ---------------------------------------------------------------- monitores

  refreshDisplays({ initial = false } = {}) {
    const displays = this.platform.getDisplays();
    if (!displays || !displays.length) return;
    const sig = topologySignature(displays);
    const changed = sig !== this.topology;
    this.displays = displays;
    this.topology = sig;
    const s = this.store.get();
    if (initial) {
      const saved = s.position;
      const prim = primaryDisplay(displays, this.platform.primaryDisplayId());
      const scale = s.size;
      const bw = this.metrics.box.width * scale;
      const bh = this.metrics.box.height * scale;
      if (saved) this.pos = { x: saved.x, y: saved.y };
      else this.pos = { x: prim.workArea.x + prim.workArea.width - bw - 60, y: prim.workArea.y + prim.workArea.height - bh - 10 };
    }
    if (initial || changed) this._recoverPosition();
  }

  _allowedOpts() {
    const s = this.store.get();
    const cur = this._currentDisplay();
    return {
      preferredId: s.preferredDisplay,
      allowSwitch: s.allowDisplaySwitch,
      currentId: cur ? cur.id : null,
      primaryId: this.platform.primaryDisplayId(),
    };
  }

  _currentDisplay() {
    if (!this.displays.length) return null;
    return displayForRect(this.displays, this._rects().box);
  }

  _allowedAreas() {
    const s = this.store.get();
    let list = allowedDisplays(this.displays, this._allowedOpts());
    // Monitor preferido explícito sem troca: só ele. Com troca: todos.
    if (!s.allowDisplaySwitch && s.preferredDisplay !== 'auto') {
      const pref = this.displays.find((d) => String(d.id) === String(s.preferredDisplay));
      if (pref) list = [pref];
    }
    return list.map((d) => ({ id: d.id, workArea: d.workArea }));
  }

  /** Áreas para planejar a área visível de forma que a caixa inteira caiba na área útil. */
  _planAreas() {
    const m = this.metrics;
    const k = this.store.get().size;
    const l = m.visual.x * k;
    const t = m.visual.y * k;
    const r = (m.box.width - m.visual.x - m.visual.width) * k;
    const b = (m.box.height - m.visual.y - m.visual.height) * k;
    return this._allowedAreas().map((a) => ({
      id: a.id,
      workArea: { x: a.workArea.x + l, y: a.workArea.y + t, width: a.workArea.width - l - r, height: a.workArea.height - t - b },
    }));
  }

  _recoverPosition() {
    const { box } = this._rects();
    const res = recoverRect(box, this.displays, this._allowedOpts());
    // Preferido explícito e sem troca: força o monitor escolhido.
    const s = this.store.get();
    let rect = res.rect;
    if (!s.allowDisplaySwitch && s.preferredDisplay !== 'auto') {
      const pref = this.displays.find((d) => String(d.id) === String(s.preferredDisplay));
      if (pref && !(rect.x >= pref.workArea.x && rect.y >= pref.workArea.y && rect.x + rect.width <= pref.workArea.x + pref.workArea.width && rect.y + rect.height <= pref.workArea.y + pref.workArea.height)) {
        rect = recoverRect(rect, [pref]).rect;
      }
    }
    if (rect.x !== box.x || rect.y !== box.y) {
      this.pos = { x: rect.x, y: rect.y };
      this.mover.stop();
      if (this.behavior.state === 'walk' || this.behavior.state === 'flee') this.behavior.finish(this.behavior.state, this.clock.now());
      this.avoid.reset();
      this.log('info', 'Posição ajustada para área válida de monitor');
    }
    this._applyLayout(true);
  }

  onDisplaysChanged() {
    this.refreshDisplays();
    this._schedule(0);
  }

  // ---------------------------------------------------------------- energia

  onSuspend() {
    this.suspended = true;
    this._cancelTimer();
    if (this.interaction) this.exitInteraction('suspend');
    this.dragging = null;
    this.mover.stop();
  }

  onResume() {
    if (!this.suspended) return;
    this.suspended = false;
    const now = this.clock.now();
    this.lastTick = now;
    this.avoid.reset();
    this.refreshDisplays();
    this._recoverPosition();
    const st = this.behavior.state;
    if (st === 'walk' || st === 'flee') this.behavior.finish(st, now);
    this._scheduleSpeech(now, true);
    this._schedule(0);
  }

  // ---------------------------------------------------------------- configurações

  applySettings(settings, changed = []) {
    this.avoid.setConfig({ margin: settings.safetyMargin });
    this.behavior.activity = settings.activity;
    this.hotkeyLabel = settings.interactionHotkey;
    if (changed.includes('speechFrequency') || changed.includes('quietMode')) this._scheduleSpeech(this.clock.now(), true);
    if (changed.includes('size') || changed.includes('preferredDisplay') || changed.includes('allowDisplaySwitch')) {
      this.mover.stop();
      if (this.behavior.state === 'walk') this.behavior.finish('walk', this.clock.now());
      this._recoverPosition();
    }
    if (changed.includes('paused')) this.setPaused(settings.paused, { fromSettings: true });
    if (changed.includes('visible')) this.setVisible(settings.visible, { fromSettings: true });
    if (changed.includes('bubbleScale') && this.bubble) this._remeasureBubble();
    this._applyLayout(true);
    this._schedule(0);
  }

  get paused() {
    return this.store.get().paused || this.fullscreenPaused;
  }

  setPaused(paused, { fromSettings = false } = {}) {
    if (!fromSettings) this.store.update({ paused }, { silent: true });
    const now = this.clock.now();
    if (paused) {
      this.mover.stop();
      if (!this.interaction) this.behavior.request('paused', { now, force: true });
      this.hideBubble();
    } else if (this.behavior.state === 'paused') {
      this.behavior.finish('paused', now);
      this.sayCategory('unpause', { force: true });
    }
    this._applyLayout(true);
    this._schedule(0);
  }

  setVisible(visible, { fromSettings = false } = {}) {
    if (!fromSettings) this.store.update({ visible }, { silent: true });
    if (visible === !this.userHidden) return;
    this.userHidden = !visible;
    if (!visible) {
      if (this.interaction) this.exitInteraction('hidden');
      this._cancelTimer();
      this.hideBubble();
      this.overlay.hide();
    } else {
      this._showAgain();
    }
  }

  _showAgain() {
    if (this.userHidden || this.fullscreenHidden || this.suspended) return;
    const now = this.clock.now();
    this.refreshDisplays();
    this.avoid.reset();
    this.ghost = false;
    this.opacity = 1;
    this.overlay.setMouseMode('passthrough');
    this.overlay.show();
    this.behavior.request('appear', { now, force: true });
    this._applyLayout(true);
    this._schedule(0);
  }

  /** Recebe do monitor de tela cheia os ids dos monitores ocupados. */
  setFullscreenDisplays(ids) {
    const mode = this.store.get().fullscreenBehavior;
    const cur = this._currentDisplay();
    const onMine = !!cur && ids.some((id) => String(id) === String(cur.id));
    const hide = mode === 'hide' && onMine && !this.interaction;
    const pause = mode === 'pause' && onMine;
    if (hide !== this.fullscreenHidden) {
      this.fullscreenHidden = hide;
      if (hide) {
        this._cancelTimer();
        this.hideBubble();
        this.overlay.hide();
      } else this._showAgain();
    }
    if (pause !== this.fullscreenPaused) {
      this.fullscreenPaused = pause;
      const now = this.clock.now();
      if (pause && !this.interaction) {
        this.mover.stop();
        this.behavior.request('paused', { now, force: true });
        this.hideBubble();
      } else if (!pause && this.behavior.state === 'paused' && !this.store.get().paused) this.behavior.finish('paused', now);
      this._applyLayout(true);
    }
  }

  // ---------------------------------------------------------------- tick principal

  tick() {
    if (!this.started || this.suspended || this.userHidden || this.fullscreenHidden) return;
    const now = this.clock.now();
    this.stats.ticks++;
    this.lastTick = now;
    this._sampleCursor(now);

    // Proteção: no modo normal o overlay SEMPRE deixa cliques passarem.
    if (!this.interaction && this.overlay.mouseMode !== undefined && this.overlay.mouseMode !== 'passthrough') {
      this.overlay.setMouseMode('passthrough');
      this.stats.clickThroughRepairs++;
    }

    if (this.dragging) {
      this.pos = { x: this.cursor.x - this.dragging.offset.x, y: this.cursor.y - this.dragging.offset.y };
      this._applyLayout();
      this._schedule(16);
      return;
    }

    if (this.mover.active) {
      const s = this.mover.sample(now);
      this.pos = { x: s.x, y: s.y };
      if (Math.abs(s.dx) > 0.3) this.facing = s.dx > 0 ? 1 : -1;
      if (s.done) this._onArrive(now);
    }

    if (this._avoidanceEnabled()) this._runAvoidance(now);

    this.behavior.tick(now);
    this._updateWired(now);
    this._updateSpeech(now);
    this._updateInteraction(now);
    if (this.effect && now >= this.effect.until) this.effect = null;
    this._applyLayout();
    this._schedule(this._nextDelay(now));
  }

  _avoidanceEnabled() {
    // Morto no chão (AVC) não foge do cursor.
    return !this.interaction && !this.dragging && !this.quitting && this.behavior.state !== 'goodbye' && this.behavior.state !== 'avc';
  }

  _sampleCursor(now) {
    const c = this.platform.getCursor();
    if (!c) return;
    const dt = Math.max(1, now - this.lastCursorAt);
    if (this.lastCursorAt && dt < 500) {
      const vx = ((c.x - this.cursor.x) / dt) * 1000;
      const vy = ((c.y - this.cursor.y) / dt) * 1000;
      const k = 0.5;
      this.cursorVel = { x: this.cursorVel.x * (1 - k) + vx * k, y: this.cursorVel.y * (1 - k) + vy * k };
    } else this.cursorVel = { x: 0, y: 0 };
    this.cursor = { x: c.x, y: c.y };
    this.lastCursorAt = now;
  }

  _rects(pos = this.pos) {
    return jojoRects(this.metrics, pos, this.store.get().size, this.facing);
  }

  _runAvoidance(now) {
    const r = this._rects();
    const actions = this.avoid.update({
      now,
      cursor: this.cursor,
      cursorVel: this.cursorVel,
      jojoRect: r.visual,
      bubbleRect: this.bubbleRect || null,
      areas: this._planAreas(),
      currentAreaId: this._currentDisplay()?.id ?? null,
      motionActive: this.mover.active && this.mover.kind === 'flee',
    });
    for (const a of actions) {
      if (a.type === 'collapseBubble') this.hideBubble();
      else if (a.type === 'flee') this._startFlee(a.plan, now);
      else if (a.type === 'hide') this._enterGhost(now, a.reason);
      else if (a.type === 'unhide') this._exitGhost(now);
    }
    // Cartão de atividades perto do cursor: some por alguns segundos (como o balão).
    if (this.activityRect && distPointRect(this.cursor, this.activityRect) < this.avoid.cfg.margin) {
      this.activitiesHiddenUntil = now + 4000;
      this._applyLayout(true);
    }
    // Mover para um destino de passeio que ficou inseguro? Cancela.
    if (this.mover.active && this.mover.kind === 'walk') {
      const t = this.mover.target;
      const tr = this._rects(t).visual;
      if (distPointRect(this.cursor, tr) < this.avoid.cfg.margin * this.avoid.cfg.exitFactor) {
        this.mover.stop();
        this.behavior.finish('walk', now);
      }
    }
  }

  _startFlee(plan, now) {
    const v = this.metrics.visual;
    const s = this.store.get().size;
    const vx = (this.facing >= 0 ? v.x : this.metrics.box.width - v.x - v.width) * s;
    const target = { x: plan.x - vx, y: plan.y - v.y * s };
    const control = { x: plan.control.x - vx, y: plan.control.y - v.y * s };
    if (this.ghost) this._exitGhost(now, true);
    // Redução de movimento: salta direto para o destino (sem correr pela tela).
    const quick = this.reducedMotion ? { minMs: 1, maxMs: 1 } : { minMs: 200, maxMs: 950 };
    this.mover.start(this.pos, target, { control, speed: FLEE_SPEED * s ** 0.5 * this.store.get().moveSpeed, easing: 'out', now, ...quick, kind: 'flee' });
    this.stats.flees++;
    if (this.behavior.state !== 'flee') this.behavior.request('flee', { now, force: true, data: { reason: plan.reason } });
    const dx = target.x - this.pos.x;
    if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
  }

  _enterGhost(now, reason) {
    this.mover.stop();
    this.ghost = true;
    this.stats.hides++;
    this.opacity = this.store.get().avoidFallback === 'hide' ? 0 : 0.18;
    this.behavior.request('hidden', { now, force: true, data: { reason } });
  }

  _exitGhost(now, keepState = false) {
    this.ghost = false;
    this.opacity = 1;
    if (!keepState && this.behavior.state === 'hidden') this.behavior.finish('hidden', now);
  }

  _onArrive(now) {
    const kind = this.mover.kind;
    this.mover.stop();
    if (kind === 'walk' && this.behavior.state === 'walk') this.behavior.finish('walk', now);
    if (kind === 'flee' && this.behavior.state === 'flee') this.behavior.finish('flee', now);
    this._savePosition();
  }

  _savePosition() {
    const d = this._currentDisplay();
    this.store.update({ position: { x: Math.round(this.pos.x), y: Math.round(this.pos.y), displayId: d ? String(d.id) : null } }, { silent: true, debounceMs: 1500 });
  }

  _nextDelay(now) {
    if (this.mover.active || this.dragging) return 16;
    if (this.effect || this.talkingUntil > now) return 33;
    const st = this.avoid.state;
    if (st === 'fleeing' || st === 'settling') return 16;
    const margin = this.avoid.cfg.margin;
    const d = distPointRect(this.cursor, this._rects().visual);
    // Tempo para um cursor muito rápido (4000 px/s) alcançar a margem.
    let ms = ((d - margin) / 4000) * 1000;
    ms = clamp(ms, 16, this.paused ? 200 : 140);
    if (this.interaction) ms = Math.min(ms, 100);
    if (this.behavior.cur && Number.isFinite(this.behavior.cur.phaseEnd)) ms = Math.min(ms, Math.max(16, this.behavior.cur.phaseEnd - now));
    if (this.bubble && Number.isFinite(this.bubble.until)) ms = Math.min(ms, Math.max(16, this.bubble.until - now));
    return Math.round(ms);
  }

  // ---------------------------------------------------------------- comportamento

  _behaviorContext() {
    const now = this.clock.now();
    const h = new Date().getHours();
    const night = h >= 23 || h < 6;
    const idleMin = (now - this.lastUserActionAt) / 60000;
    return {
      sleepiness: clamp((night ? 0.6 : 0) + idleMin / 90, 0, 1),
      alert: this.avoid.isAlert,
      paused: this.paused,
      quiet: this.store.get().quietMode,
      wired: this.wired,
      // Catálogo: peso do sorteio ambiente e fila (sequências, "sem filtro", aviso de raro).
      ambientWeight: this.reducedMotion ? AMBIENT_WEIGHTS[this.store.get().ambienteFrequencia] * 0.5 : AMBIENT_WEIGHTS[this.store.get().ambienteFrequencia] ?? 0,
      pickAmbient: () => this._pickAmbient(),
      hasQueue: this.ambientQueue.length > 0,
    };
  }

  // ---------------------------------------------------------------- PC parado → "ligadão"

  /** Efeito do pó/pré-treino ativo (dura `ociosidade.efeitoMin` após a volta). */
  get wired() {
    return this.wiredUntil > this.clock.now();
  }

  /**
   * Tempo sem uso do computador (segundos), vindo do sistema (só um contador;
   * nenhuma tecla ou clique é lido). Parado por `ociosidade.minutos`: o JoJo
   * senta no chão e cheira uma carreira (ou toma pré-treino se o humor com
   * drogas estiver desligado). Na volta, fica ligadão por `efeitoMin`.
   */
  onSystemIdle(idleSec) {
    const profile = this.personality.get();
    const cfg = profile.ociosidade;
    const now = this.clock.now();
    this._idleEvents(idleSec, now);
    if (idleSec >= cfg.minutos * 60) {
      if (!cfg.ativo || this.powderKind || !this._canIdleAct()) return false;
      const kind = profile.humorDrogas ? 'snort' : 'chug';
      if (!this.react(kind)) return false;
      this.powderKind = kind;
      this.hideBubble();
      this._applyLayout(true);
      return true;
    }
    if (idleSec < 10 && this.powderKind) {
      this._startWired(now);
      return true;
    }
    return false;
  }

  /**
   * Eventos ligados ao tempo de uso (só o contador de ociosidade do sistema):
   * ausente (2 min parado), voltou, pausa depois de 90 min sem parar e
   * carência discreta depois de muito tempo sem interação (no máximo a cada 2 h).
   */
  _idleEvents(idleSec, now) {
    if (!this.started) return;
    if (idleSec >= 120) {
      if (!this.awaySince && !this.powderKind && this._canIdleAct()) {
        this.awaySince = now;
        this.fireEvent('ausente', { speak: false });
      }
      if (idleSec >= 300) this.activeSince = null; // pausa de verdade
      return;
    }
    if (idleSec < 10 && this.awaySince) {
      const wasPowder = !!this.powderKind || this.wired;
      this.awaySince = null;
      if (!wasPowder && this._canIdleAct()) this.fireEvent('voltou');
    }
    if (idleSec < 60) {
      if (!this.activeSince) this.activeSince = now;
      if (now - this.activeSince > 90 * 60e3 && now - (this.lastPauseHint || 0) > 90 * 60e3 && this._canNag()) {
        this.lastPauseHint = now;
        this.fireEvent(this.rng() < 0.5 ? 'pausa' : 'trabalhoLongo');
      }
      const quiet = now - Math.max(this.lastInteractionActivity || 0, this.startedAt || 0);
      if (quiet > 45 * 60e3 && now - (this.lastNeedy || 0) > 2 * 3600e3 && this._canNag()) {
        this.lastNeedy = now;
        this.fireEvent('semInteracao');
      }
    }
  }

  _canIdleAct() {
    return this.started && !this.paused && !this.userHidden && !this.fullscreenHidden && !this.suspended && !this.quitting && !this.ghost && !this.interaction && !this.dragging;
  }

  _startWired(now) {
    const kind = this.powderKind;
    this.powderKind = null;
    this.wiredKind = kind;
    this.wiredUntil = now + this.personality.get().ociosidade.efeitoMin * 60e3;
    if (this.behavior.state === kind) this.behavior.finish(kind, now);
    this.sayCategory(kind === 'snort' ? 'wiredStart' : 'hyperStart', { force: !this.store.get().quietMode });
    this._scheduleSpeech(now, true);
    this._applyLayout(true);
  }

  _updateWired(now) {
    if (!this.wiredUntil || now < this.wiredUntil) return;
    this.wiredUntil = 0;
    this.wiredKind = null;
    if (this._canNag() && this.rng() < 0.6) this.sayCategory('wiredEnd', { spontaneous: true });
    this._scheduleSpeech(now, true);
    this._applyLayout(true);
  }

  _onBehavior(ev) {
    if (ev.type !== 'enter') return;
    const now = ev.now;
    if (this.interaction && (ev.state === 'idle' || ev.state === 'paused')) {
      this.behavior.request('interactIdle', { now, force: true });
      return;
    }
    if (ev.state === 'walk') this._startWalk(now);
    if (ev.state === 'sleep' && ev.prev !== 'sleep') this.clock.setTimeout(() => this._sleepTalk(), 3000);
    if (ev.state === 'curious' && this.rng() < 0.35) this.sayCategory('curious', { spontaneous: true });
    if (ev.prev === 'sleep' && ev.state !== 'sleep' && ev.state !== 'flee' && ev.state !== 'hidden' && this.rng() < 0.5) this.sayCategory('wake', { spontaneous: true });
    if (ev.state === 'lie' && this.rng() < 0.3) this.sayCategory('sleepy', { spontaneous: true });
    if ((ev.state === 'benchPress' || ev.state === 'squat') && this.rng() < 0.75) this.sayCategory('showOff', { spontaneous: true });
  }

  _sleepTalk() {
    if (this.behavior.state === 'sleep' && this.behavior.sleeping && !this.bubble) this.sayCategory('sleep', { spontaneous: true });
  }

  _startWalk(now) {
    if (this.paused || this.interaction || this.reducedMotion) {
      this.behavior.finish('walk', now);
      return;
    }
    // Destino pedido por uma animação do catálogo (borda, outro canto, perto do cursor).
    const target = this.walkTarget || this._pickWanderTarget();
    this.walkTarget = null;
    if (!target) {
      this.behavior.finish('walk', now);
      return;
    }
    const s = this.store.get();
    const r = this._rects();
    const control = choosePathControl(this.pos, target, { width: r.box.width, height: r.box.height }, this.cursor, s.safetyMargin).control;
    const hurry = this.wired ? 1.7 : 1;
    this.mover.start(this.pos, target, { control, speed: WALK_SPEED * s.moveSpeed * Math.sqrt(s.size) * hurry, easing: 'inOut', now, minMs: 600, maxMs: 9000, kind: 'walk' });
  }

  _pickWanderTarget() {
    const s = this.store.get();
    const r = this._rects();
    const size = { width: r.visual.width, height: r.visual.height };
    let areas = this._planAreas();
    const cur = this._currentDisplay();
    // Na maioria das vezes fica no monitor atual, mesmo se puder trocar.
    if (cur && areas.length > 1 && this.rng() < 0.85) areas = areas.filter((a) => String(a.id) === String(cur.id));
    if (!areas.length) return null;
    const offX = r.visual.x - this.pos.x;
    const offY = r.visual.y - this.pos.y;
    const from = { x: r.visual.x, y: r.visual.y };
    const margin = s.safetyMargin * this.avoid.cfg.exitFactor;
    for (let i = 0; i < 14; i++) {
      const a = areas[Math.floor(this.rng() * areas.length)];
      const wa = a.workArea;
      const reach = 140 + this.rng() * (220 + 300 * s.activity);
      const ang = this.rng() * Math.PI * 2;
      let x = from.x + Math.cos(ang) * reach;
      let y = from.y + Math.sin(ang) * reach * 0.5; // prefere andar mais na horizontal
      if (String(a.id) !== String(cur?.id)) {
        x = wa.x + this.rng() * (wa.width - size.width);
        y = wa.y + this.rng() * (wa.height - size.height);
      }
      x = clamp(x, wa.x, wa.x + wa.width - size.width);
      y = clamp(y, wa.y, wa.y + wa.height - size.height);
      const to = { x, y };
      if (dist(from, to) < 40) continue;
      if (isSafeTarget(from, to, size, this.cursor, margin, areas)) return { x: x - offX, y: y - offY };
    }
    return null;
  }

  // ---------------------------------------------------------------- falas

  _scheduleSpeech(now, reset = false) {
    const s = this.store.get();
    const range = SPEECH_INTERVALS[s.speechFrequency];
    if (!range || s.quietMode) {
      this.nextSpeechAt = Infinity;
      return;
    }
    if (!reset && Number.isFinite(this.nextSpeechAt)) return;
    // Ligadão: fala muito mais.
    const r = this.wired ? [Math.min(range[0], 25e3), Math.min(range[1], 60e3)] : range;
    this.nextSpeechAt = now + r[0] + this.rng() * (r[1] - r[0]);
  }

  _updateSpeech(now) {
    if (this.bubble && now >= this.bubble.until) this.hideBubble();
    if (this.talkingUntil && now >= this.talkingUntil) {
      this.talkingUntil = 0;
      if (this.behavior.state === 'talk') this.behavior.finish('talk', now);
    }
    if (now < this.nextSpeechAt) return;
    this.nextSpeechAt = Infinity;
    this._scheduleSpeech(now, true);
    const st = this.behavior.state;
    if (this.bubble || this.paused || this.interaction || this.ghost || this.avoid.isAlert) return;
    if (st === 'sleep') {
      if (this.behavior.sleeping) this.sayCategory('sleep', { spontaneous: true });
      return;
    }
    if (!CALM_STATES.has(st)) return;
    // O objetivo é fazer a Emanuele sorrir: de vez em quando ele brinca ou se exibe.
    const roll = this.rng();
    let cat;
    if (this.wired) cat = roll < 0.75 ? 'wired' : 'joke';
    else if (roll < 0.18) cat = 'joke';
    else if (roll < 0.26) {
      this.react(this.rng() < 0.5 ? 'benchPress' : 'squat');
      return;
    } else if (roll < 0.5) cat = 'idleSpeech';
    else if (roll < 0.82 && this.store.get().falasAmbientes) {
      // Fala ambiente que combina com a animação do momento.
      this._ambientLine(st === 'ambient' ? this.ambientItem : null);
      return;
    } else cat = 'idleThought';
    this.sayCategory(cat, { spontaneous: true });
  }

  sayCategory(category, { force = false, spontaneous = false, fallback = null } = {}) {
    const s = this.store.get();
    if (!force && spontaneous && (s.quietMode || s.speechFrequency === 'off')) return false;
    if (!force && s.quietMode && !USER_CATEGORIES.has(category)) return false;
    const cat = this.phrases.has(category) ? category : fallback;
    if (!cat) return false;
    const atalho = this.hotkeyLabel.replace(/Control/g, 'Ctrl').replace(/\+/g, ' + ');
    const p = this.phrases.pick(cat, (tone) => ({ atalho, ...profileVars(this.personality.get(), tone) }));
    if (!p) return false;
    const ok = this.say(p.text, p.kind, { spontaneous, category: cat, reaction: p.reaction });
    if (ok) this.lastSaid = p.text;
    if (ok && p.reaction) this.react(p.reaction);
    return ok;
  }

  /** Mostra um balão. No máximo um por vez; o novo substitui o anterior. */
  say(text, kind = 'speech', { spontaneous = false, category = null, reaction = null } = {}) {
    if (!this.started || this.userHidden || this.ghost) return false;
    if (spontaneous && this.bubble) return false;
    if (spontaneous && this.clock.now() - this.lastSpokeAt < MIN_SPONTANEOUS_GAP[this.store.get().speechFrequency]) return false;
    if (this.avoid.state === 'fleeing' || this.avoid.state === 'hidden') return false;
    // Não abrir balão sobre o cursor.
    const seq = ++this.measureSeq;
    const scale = this.store.get().bubbleScale;
    Promise.resolve(this.overlay.measureBubble({ text, kind, scale }))
      .then((size) => {
        if (seq !== this.measureSeq || !size) return;
        const now = this.clock.now();
        this.bubble = { text, kind, size, category, until: now + readingTimeMs(text) * (kind === 'sleep' ? 0.8 : 1) };
        this.lastSpokeAt = now;
        if (kind === 'speech') {
          this.talkingUntil = now + Math.min(2600, 500 + text.length * 45);
          if (!reaction && spontaneous && CALM_STATES.has(this.behavior.state) && this.behavior.state !== 'lie') this.behavior.request('talk', { now });
        }
        this._applyLayout(true);
        // Se o balão nasceu perto do cursor, recolhe imediatamente.
        // (Broncas e lembretes ficam: só falas espontâneas recolhem.)
        if (spontaneous && this.bubbleRect && distPointRect(this.cursor, this.bubbleRect) < this.avoid.cfg.margin && !this.interaction) this.hideBubble();
        this._schedule(0);
      })
      .catch((e) => this.log('warn', `Falha ao medir balão: ${e.message}`));
    return true;
  }

  _remeasureBubble() {
    const b = this.bubble;
    if (!b) return;
    this.say(b.text, b.kind, { category: b.category });
  }

  hideBubble() {
    if (!this.bubble) return;
    this.bubble = null;
    this.bubbleRect = null;
    this.measureSeq++;
    this.talkingUntil = 0;
    if (this.behavior.state === 'talk') this.behavior.finish('talk', this.clock.now());
    this._applyLayout(true);
  }

  // ---------------------------------------------------------------- modo de interação

  toggleInteraction(source = 'hotkey') {
    if (this.interaction) this.exitInteraction('toggle');
    else this.enterInteraction(source);
  }

  enterInteraction(source = 'hotkey') {
    if (this.interaction || this.quitting) return;
    if (this.userHidden) this.setVisible(true);
    if (this.fullscreenHidden) return;
    const now = this.clock.now();
    this.interaction = true;
    this.enteredInteractionAt = now;
    this.lastInteractionActivity = now;
    this.lastUserActionAt = now;
    this.mover.stop();
    this.avoid.reset();
    if (this.ghost) this._exitGhost(now, true);
    this.ghost = false;
    this.opacity = 1;
    this.behavior.request('interactIdle', { now, force: true });
    try {
      this.overlay.setMouseMode('interactive');
      this.overlay.focus();
    } catch (e) {
      this.log('error', `Falha ao entrar no modo de interação: ${e.message}`);
      this.exitInteraction('error');
      return;
    }
    this.hideBubble();
    if (this.onInteractionChange) this.onInteractionChange(true);
    this.sayCategory('interactEnter', { force: true });
    this.log('info', `Modo de interação ativado (${source})`);
    this._applyLayout(true);
    this._schedule(0);
  }

  exitInteraction(reason = 'user') {
    if (!this.interaction) return;
    const now = this.clock.now();
    this.interaction = false;
    this.chatOpen = false;
    this.capture = false;
    this.dragging = null;
    // Restaura click-through imediatamente, mesmo que algo falhe depois.
    try {
      this.overlay.setMouseMode('passthrough');
    } catch (e) {
      this.log('error', `Falha ao restaurar click-through: ${e.message}`);
    }
    this.avoid.reset();
    this.hideBubble();
    if (this.onInteractionChange) this.onInteractionChange(false);
    if (!this.quitting) {
      if (this.paused) this.behavior.request('paused', { now, force: true });
      else this.behavior.request('idle', { now, force: true });
      if (reason !== 'quit' && reason !== 'hidden' && reason !== 'suspend') this.sayCategory('interactExit', { force: true });
    }
    this._savePosition();
    this.log('info', `Modo de interação encerrado (${reason})`);
    this._applyLayout(true);
    this._schedule(0);
  }

  _updateInteraction(now) {
    if (!this.interaction) return;
    const timeout = this.store.get().interactionTimeoutSec * 1000;
    if (!this.dragging && now - this.lastInteractionActivity > timeout) this.exitInteraction('timeout');
  }

  /** Atividade do usuário dentro do modo de interação (renderer). */
  noteActivity() {
    const now = this.clock.now();
    this.lastInteractionActivity = now;
    this.lastUserActionAt = now;
  }

  /** O renderer pede captura do mouse ao entrar/sair de uma região interativa. */
  setCapture(on) {
    if (!this.interaction) {
      this.overlay.setMouseMode('passthrough');
      return false;
    }
    this.capture = !!on;
    this.overlay.setCapture(this.capture);
    return true;
  }

  onBlur() {
    // Clicar fora do JoJo no modo de interação encerra o modo (como um popup).
    if (!this.interaction || this.dragging) return;
    const now = this.clock.now();
    if (now - this.enteredInteractionAt < 400) return;
    this.exitInteraction('blur');
  }

  interact(action) {
    if (!this.interaction) return false;
    const now = this.clock.now();
    this.noteActivity();
    const map = {
      pet: ['petted', 'petted', 'hearts', 2200],
      eat: ['eat', 'food', 'food', 2800],
      play: ['play', 'play', 'ball', 3400],
    };
    const m = map[action];
    if (!m) return false;
    if (!this.behavior.request(m[0], { now, force: true })) return false;
    if (action === 'eat') {
      this._feed(now);
    } else {
      this.effect = { name: m[2], until: now + m[3] };
      this.sayCategory(m[1], { force: true });
    }
    this._applyLayout(true);
    this._schedule(0);
    return true;
  }

  /**
   * Comida de tubarão: sorteia o que ele come (às vezes gente), fala sobre e
   * arrota no fim, sempre.
   */
  _feed(now, { quiet = false } = {}) {
    const kind = weightedPick(FOODS, this.rng);
    this.effect = { name: 'food', kind, until: now + 3400 };
    if (!quiet) this.sayCategory(`food_${kind}`, { force: true, fallback: 'food' });
    this.clock.setTimeout(() => {
      if (this.quitting || !this.started) return;
      this.hideBubble();
      this.say('BUUURP.', 'speech');
    }, BURP_MS);
    return kind;
  }

  setChatOpen(open) {
    if (!this.interaction) return;
    this.chatOpen = !!open;
    this.conversations.setViewing(this.conversations.current().id, this.chatOpen);
    this.noteActivity();
    if (open) {
      this.hideBubble();
      this.fireEvent('conversaAberta');
    }
    this._applyLayout(true);
  }

  /**
   * Mensagem da usuária para uma conversa (padrão: a atual). Comandos com "/"
   * (ex.: /pet) são tratados aqui. Atualiza o status da conversa:
   * running → ready/needsInput/blocked.
   */
  async chat(text, conversationId = null) {
    const conv = (conversationId && this.conversations.get(conversationId)) || this.conversations.current();
    const cmd = parseCommand(text);
    if (cmd) return this.runCommand(cmd, conv.id, text);
    if (!this.dialogue) return null;
    this.noteActivity();
    this.conversations.addMessage(conv.id, 'user', text);
    this.conversations.setStatus(conv.id, 'running');
    await new Promise((r) => this.clock.setTimeout(r, THINK_MS));
    // Pedido de animação por frase ("faz uma dancinha", "selfie", "modo fera"…).
    const hit = this.catalogFromChat(text);
    if (hit && this.playCatalog(hit.id, { source: 'chat', speak: false })) {
      const line = hit.fala ? this.variety.pickLine({ item: hit }) : null;
      const vars = profileVars(this.personality.get(), 'brincadeira');
      const t = line ? line.t : ['Assiste.', 'Olha e aprende, {nome}.', 'Feito. De nada.', 'Só porque eu quis.'][Math.floor(this.rng() * 4)];
      const out = t.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
      this.conversations.addMessage(conv.id, 'jojo', out);
      this.conversations.setStatus(conv.id, 'ready');
      this.talkingUntil = this.clock.now() + Math.min(2600, 500 + out.length * 45);
      this._applyLayout(true);
      return { text: out, action: null, intent: 'animacao', animacao: hit.id, conversationId: conv.id, provider: this.dialogue.describe() };
    }
    let reply;
    // Resposta demorando (internet): mostra que está pensando em vez de ficar parado.
    let thinking = false;
    const thinkTimer = this.clock.setTimeout(() => {
      thinking = this.say('…', 'thought');
      // Pensando (ou pesquisando, se for pergunta de conhecimento).
      this.fireEvent(isFactualQuestion(text) ? 'pesquisando' : 'pensando', { speak: false });
    }, THINK_BUBBLE_MS);
    try {
      reply = await this.dialogue.reply(text, { state: this.behavior.state, persona: this.personality.get().instrucoes });
    } catch (e) {
      this.clock.clearTimeout(thinkTimer);
      this.conversations.setStatus(conv.id, 'blocked', `Falha na conversa: ${e.message}`);
      this.fireEvent('erro', { speak: false });
      return { text: 'Deu erro aqui. Tenta de novo.', error: e.message, conversationId: conv.id, provider: this.dialogue.describe() };
    }
    this.clock.clearTimeout(thinkTimer);
    if (thinking && this.bubble && this.bubble.text === '…') this.hideBubble();
    // Respostas que só saem no meio da animação: "É" no último suspiro (bonita?)
    // e "Passa na cara de uma vez" quando ele oferece o cocô (lol?).
    const delayed = DELAYED_REPLY_MS[reply.action];
    if (delayed) {
      this.noteActivity();
      this._doChatAction(reply.action, this.clock.now());
      await new Promise((r) => this.clock.setTimeout(r, delayed));
    }
    const profile = this.personality.get();
    const vars = profileVars(profile, reply.tone);
    reply.text = reply.text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    if (reply.web || reply.webNotFound || reply.webError) Object.assign(reply, this._webReply(reply, profile));
    this.conversations.addMessage(conv.id, 'jojo', reply.text);
    if (reply.webError) this.conversations.setStatus(conv.id, 'blocked', `Pesquisa na internet falhou (${reply.webError}).`);
    else if (reply.error) this.conversations.setStatus(conv.id, 'blocked', `Conversa online indisponível (${reply.error}); respondi do meu jeito mesmo.`);
    else if (/\?\s*$/.test(reply.text)) this.conversations.setStatus(conv.id, 'needsInput', 'Pergunta esperando resposta.');
    else this.conversations.setStatus(conv.id, 'ready');
    const now = this.clock.now();
    this.noteActivity();
    if (delayed) this.say(reply.text, 'speech');
    else if (reply.web) this.fireEvent('respostaPronta', { speak: false });
    else if (reply.action) this._doChatAction(reply.action, now);
    else this.talkingUntil = now + Math.min(2600, 500 + reply.text.length * 45);
    this._applyLayout(true);
    this._schedule(0);
    return { ...reply, conversationId: conv.id, provider: this.dialogue.describe() };
  }

  /**
   * Resposta de pesquisa na internet no jeito do JoJo: abertura e fecho vêm
   * das falas filtradas pelo perfil (palavrões, humor), o miolo é o resumo da fonte.
   */
  _webReply(reply, profile) {
    const vars = (tone) => ({ ...profileVars(profile, tone), atalho: this.store.get().interactionHotkey });
    // Pergunta em inglês: resposta em inglês, no mesmo jeito.
    if (reply.lang === 'en' || (reply.web && reply.web.lang === 'en')) {
      const nome = vars('serio').nome;
      if (reply.webError) return { text: 'No internet right now. Ask me later.', action: 'judge', tone: 'serio' };
      if (reply.webNotFound) return { text: 'Found nothing on that. Rare. Ask another way.', action: 'curious', tone: 'serio' };
      return { text: `Here, ${nome}: ${reply.web.extract} (Source: ${reply.web.source})`, action: 'lecture', tone: 'serio' };
    }
    if (reply.webError) {
      const p = this.phrases.pick('webOffline', vars);
      return { text: p ? p.text : 'Sem internet agora.', action: p && p.reaction, tone: p ? p.tone : 'serio' };
    }
    if (reply.webNotFound) {
      const p = this.phrases.pick('webNotFound', vars);
      return { text: p ? p.text : 'Não achei nada sobre isso.', action: p && p.reaction === 'curious' ? 'curious' : null, tone: p ? p.tone : 'serio' };
    }
    const intro = this.phrases.pick('webIntro', vars);
    const outro = this.rng() < 0.6 ? this.phrases.pick('webOutro', vars) : null;
    const src = ` (Fonte: ${reply.web.source})`;
    const head = intro ? `${intro.text} ` : '';
    const tail = outro ? ` ${outro.text}` : '';
    // normalizeReply limita o texto a 400 caracteres: o resumo cede espaço.
    let body = reply.web.extract;
    const room = 400 - head.length - src.length - tail.length;
    if (body.length > room) body = `${body.slice(0, Math.max(40, room - 1)).replace(/\s+\S*$/, '')}…`;
    return { text: `${head}${body}${src}${tail}`.slice(0, 400), action: null, tone: intro ? intro.tone : 'serio' };
  }

  /** Comandos do menu "/" (chat da Central ou do pet). */
  runCommand(cmd, conversationId = null, raw = '') {
    const name = this.companionName;
    let text;
    if (cmd === 'anim') {
      // /anim <nome ou id>: toca qualquer animação do catálogo.
      const q = String(raw).replace(/^\/\S+\s*/, '');
      if (!q) text = `${this.catalog.itens.length} animações no catálogo. Use /anim e o nome, ex.: /anim selfie, /anim modo fera, /anim dancinha viral.`;
      else {
        const it = this.findCatalog(q);
        if (!it) text = 'Não conheço essa. Tenta outro nome.';
        else text = this.playCatalog(it.id, { source: 'comando' }) ? `${it.nome}. Assiste.` : 'Agora não. Tenta daqui a pouco.';
      }
      return { text, command: cmd, conversationId };
    }
    if (cmd === 'pet') {
      const show = this.userHidden;
      this.setVisible(show);
      if (show) this.clock.setTimeout(() => this.fireEvent('pet', { speak: false }), 1500);
      text = show ? `${name} acordou. (Wake Pet)` : `${name} foi guardado. Use /pet para chamar de volta. (Tuck Away Pet)`;
    } else if (cmd === 'quiet') {
      const q = !this.store.get().quietMode;
      this.store.update({ quietMode: q });
      text = q ? 'Modo silencioso ligado.' : 'Modo silencioso desligado.';
    } else if (cmd === 'new') {
      const c = this.conversations.newChat();
      return { text: 'Conversa nova.', command: cmd, conversationId: c.id };
    } else if (cmd === 'settings') {
      if (this.onOpenSettings) this.onOpenSettings();
      text = 'Abrindo as configurações.';
    } else {
      text = 'Comando desconhecido. Use /pet, /silencio, /nova, /config ou /anim.';
    }
    return { text, command: cmd, conversationId };
  }

  /** Erro/aviso de sistema como atividade "Bloqueado" (null = resolvido). */
  reportSystem(key, title, message) {
    const id = `sistema-${key}`;
    if (!message) {
      if (this.conversations.get(id)) this.conversations.setStatus(id, 'idle');
      return;
    }
    const c = this.conversations.create({ id, title, kind: 'system' });
    const last = c.messages[c.messages.length - 1];
    if (!last || last.text !== message) this.conversations.addMessage(id, 'jojo', message);
    this.conversations.setStatus(id, 'blocked', message);
  }

  /** Clique no pet / numa atividade: traz a Central do JoJo para frente. */
  openApp(conversationId = null) {
    this.noteActivity();
    if (conversationId) this.conversations.setCurrent(conversationId);
    if (this.onOpenApp) this.onOpenApp(conversationId);
  }

  setReducedMotion(on) {
    this.reducedMotion = !!on;
    if (on && this.mover.active && this.mover.kind === 'walk') {
      this.mover.stop();
      if (this.behavior.state === 'walk') this.behavior.finish('walk', this.clock.now());
    }
    this._applyLayout(true);
  }

  _doChatAction(action, now) {
    if (action === 'nojo') {
      // Docinho: cara de nojo, tom esverdeado.
      this.playCatalog('nojo', { source: 'chat', speak: false });
      return;
    }
    if (action === 'flex' && this.playCatalog('tarefaFinalizada', { source: 'chat', speak: false })) return;
    if (action === 'eat' || action === 'play' || action === 'pet') {
      const map = { pet: ['petted', 'hearts', 2200], eat: ['eat', 'food', 2800], play: ['play', 'ball', 3400] };
      const [st, fx, ms] = map[action];
      this.behavior.request(st, { now, force: true });
      if (action === 'eat') this._feed(now, { quiet: true });
      else this.effect = { name: fx, until: now + ms };
    } else if (action === 'sleep') {
      // No modo de interação, cochilo curto e acorda na saída.
      this.behavior.request('sleep', { now, force: true });
    } else if (action === 'wake' || action === 'happy') {
      this.behavior.request('happy', { now, force: true });
    } else if (action === 'lookAround' || action === 'curious') {
      this.behavior.request('curious', { now, force: true });
    } else if (action === 'flex') {
      this.behavior.request('happy', { now, force: true });
    } else if (action === 'scare') {
      this.behavior.request('scare', { now, force: true });
    } else if (action === 'avc') {
      this.hideBubble();
      this.behavior.request('avc', { now, force: true });
    } else if (action === 'dressDown' || action === 'dressUp') {
      const cfg = this.personality.get().festas;
      this.personality.update({ festas: { ...cfg, estilo: action === 'dressDown' ? 'comportada' : 'ousada' } });
      if (action === 'dressDown') this.behavior.request('finger', { now, force: true });
      else this.behavior.request('happy', { now, force: true });
      this._applyLayout(true);
    } else if (action === 'poop') {
      this.behavior.request('poop', { now, force: true });
    } else if (action === 'smitten') {
      this.behavior.request('smitten', { now, force: true });
      this.effect = { name: 'hearts', until: now + 2400 };
    } else if (action === 'moon') {
      this.behavior.request('moon', { now, force: true });
    } else if (action === 'bench' || action === 'squat') {
      this.behavior.request(action === 'bench' ? 'benchPress' : 'squat', { now, force: true });
    } else if (['judge', 'wave', 'nod', 'comfort', 'lecture', 'angry', 'sad'].includes(action)) {
      this.behavior.request(action, { now, force: true });
    } else if (action === 'quiet') {
      // "Silêncio": ativa o modo silencioso (sem falas espontâneas nem broncas).
      this.store.update({ quietMode: true });
      this.behavior.request('nod', { now, force: true });
    }
  }

  dragStart(offset) {
    if (!this.interaction) return false;
    const now = this.clock.now();
    this.noteActivity();
    this.dragging = { offset: { x: offset.x, y: offset.y } };
    this.mover.stop();
    this.hideBubble();
    this.behavior.request('dragged', { now, force: true });
    if (this.rng() < 0.5) this.sayCategory('dragged', { force: true });
    this._schedule(0);
    return true;
  }

  dragEnd() {
    if (!this.dragging) return;
    const now = this.clock.now();
    this.dragging = null;
    this.noteActivity();
    this._recoverPosition();
    this.behavior.request('land', { now, force: true });
    if (this.rng() < 0.4) this.clock.setTimeout(() => this.sayCategory('land', { force: true }), 700);
    this._savePosition();
    this._schedule(0);
  }

  /**
   * Expressão corporal coerente com a fala/situação: troca para o estado de
   * reação (aceno, julgamento, dedo em riste, acolhimento…), sem interromper
   * fuga, arraste, sono profundo de outro estado prioritário ou despedida.
   */
  react(name) {
    if (!STATES[name] || this.quitting) return false;
    const st = this.behavior.state;
    if (st === name || st === 'flee' || st === 'hidden' || st === 'dragged' || st === 'goodbye' || st === 'gone' || st === 'avc' || this.dragging) return false;
    const now = this.clock.now();
    if (this.mover.active && this.mover.kind === 'walk') {
      this.mover.stop();
      if (st === 'walk') this.behavior.finish('walk', now);
    }
    return this.behavior.request(name, { now, force: this.behavior.priority >= PRIORITY.INTERACT });
  }

  // ---------------------------------------------------------------- catálogo de animações

  /** Intensidade: escolhida nas configurações ou pelo humor do momento. */
  _intensity() {
    const pref = this.store.get().ambienteIntensidade;
    if (pref && pref !== 'auto') return pref;
    const e = this.variety.energy();
    if (e === 'zen' || e === 'sonolento' || e === 'hiperfoco') return 'suave';
    if (e === 'pilhado' || e === 'caotico' || e === 'competitivo') return 'exagerado';
    return 'normal';
  }

  /** Animação (com intensidade) e duração de um item para o estado dinâmico. */
  _catalogData(item, intensity = this._intensity()) {
    if (item.usa) return { anim: item.usa, ms: item.duracao || 2600, item: item.id };
    const k = INTENSITIES[intensity] || INTENSITIES.normal;
    const dur = Math.round((item.duracao || 3000) * k.dur);
    return { anim: animName(item.id, intensity), ms: item.loop ? dur * 2 : dur, item: item.id };
  }

  /**
   * Toca uma animação do catálogo. source: 'chat' | 'evento' | 'comando' | 'ambiente'.
   * Interação dela (clique, arrasto, /pet) interrompe com transição suave.
   */
  playCatalog(id, { source = 'comando', speak = true } = {}) {
    const item = this.catalogById.get(id);
    if (!item || this.quitting || !this.started || this.userHidden) return false;
    const now = this.clock.now();
    if (item.especial === 'semFiltro') return this._semFiltro();
    // Precisa ir até um lugar antes (borda, outro canto, perto do cursor): anda e toca na chegada.
    if (item.mover && !this.reducedMotion && this.movedFor !== item.id && this._catalogMove(item.mover, now)) {
      this.movedFor = item.id;
      this.ambientQueue.unshift(item.id);
      return true;
    }
    this.movedFor = null;
    let ok;
    if (item.usa && STATES[item.usa] && item.usa !== 'idle' && source !== 'ambiente') ok = this.react(item.usa);
    else ok = this._requestCatalog(source === 'ambiente' ? 'ambient' : 'act', this._catalogData(item), now, source);
    if (!ok) return false;
    this.ambientItem = item;
    if (source !== 'ambiente') this.variety.note(item.id);
    if (speak && item.fala && (source !== 'ambiente' || this.rng() < 0.35)) this._ambientLine(item, { force: source === 'chat' || source === 'comando' });
    this._applyLayout(true);
    this._schedule(0);
    return true;
  }

  _requestCatalog(state, data, now, source) {
    const st = this.behavior.state;
    if (['flee', 'hidden', 'dragged', 'goodbye', 'gone', 'avc'].includes(st) || this.dragging) return false;
    if (this.mover.active && this.mover.kind === 'walk') {
      this.mover.stop();
      if (st === 'walk') this.behavior.finish('walk', now);
    }
    const force = source !== 'ambiente' && (this.interaction || this.behavior.priority >= PRIORITY.INTERACT);
    return this.behavior.request(state, { now, data, force });
  }

  /** Sorteio ambiente (chamado pela máquina de comportamento ao sair do repouso). */
  _pickAmbient() {
    const s = this.store.get();
    let it = null;
    while (this.ambientQueue.length && !it) it = this.catalogById.get(this.ambientQueue.shift()) || null;
    const queued = !!it;
    if (!it) it = this.variety.pickAmbient({ filter: (x) => !(x.mover && this.reducedMotion) });
    if (!it) return null;
    if (!queued) {
      // Algo raro: aviso visual suave antes (dá para desligar nas configurações).
      if (it.frequencia !== 'comum' && s.avisoRaros && !s.quietMode && !this.bubble) {
        this.ambientQueue.push(it.id);
        this.say('…!', 'thought', { spontaneous: true });
        return { anim: 'lookAround', ms: 1800, item: 'aviso' };
      }
      if (it.mover && !this.reducedMotion && this.movedFor !== it.id) {
        this.clock.setTimeout(() => this.playCatalog(it.id, { source: 'ambiente' }), 0);
        return { anim: 'idle', ms: 200, item: it.id };
      }
    }
    this.movedFor = null;
    this.ambientItem = it;
    if (it.fala && this.rng() < 0.35) this.clock.setTimeout(() => this._ambientLine(it), 700);
    if (it.especial === 'semFiltro') {
      this.clock.setTimeout(() => this._semFiltro(), 0);
      return { anim: 'idle', ms: 200, item: it.id };
    }
    return this._catalogData(it);
  }

  /** Modo "sem filtro": três reações sorteadas em sequência. */
  _semFiltro() {
    const picks = [];
    for (let i = 0; i < 6 && picks.length < 3; i++) {
      const it = this.variety.pickAmbient({ filter: (x) => !x.mover && !x.especial });
      if (it && !picks.includes(it.id)) picks.push(it.id);
    }
    if (!picks.length) return false;
    this.ambientQueue.push(...picks.slice(1));
    return this.playCatalog(picks[0], { source: 'comando' });
  }

  /** Vai até um lugar antes da animação. Retorna true se começou a andar. */
  _catalogMove(kind, now) {
    if (this.paused || this.interaction || this.dragging) return false;
    const disp = this._currentDisplay();
    if (!disp) return false;
    const wa = disp.workArea;
    const r = this._rects();
    const v = r.visual;
    const offX = v.x - this.pos.x;
    const offY = v.y - this.pos.y;
    const cx = v.x + v.width / 2;
    let tx = v.x;
    let ty = v.y;
    if (kind === 'atravessa' || kind === 'borda') {
      const toLeft = kind === 'atravessa' ? cx > wa.x + wa.width / 2 : cx < wa.x + wa.width / 2;
      tx = toLeft ? wa.x + 4 : wa.x + wa.width - v.width - 4;
    } else if (kind === 'cursor') {
      const side = this.cursor.x >= cx ? -1 : 1;
      const keep = this.store.get().safetyMargin + 60;
      tx = this.cursor.x + side * (keep + v.width / 2) - v.width / 2;
      ty = this.cursor.y - v.height / 2;
    } else if (kind === 'foge') {
      const side = this.cursor.x >= cx ? -1 : 1;
      tx = v.x + side * 320;
    }
    tx = clamp(tx, wa.x, wa.x + wa.width - v.width);
    ty = clamp(ty, wa.y, wa.y + wa.height - v.height);
    if (Math.hypot(tx - v.x, ty - v.y) < 30) return false;
    this.walkTarget = { x: tx - offX, y: ty - offY };
    return this.behavior.request('walk', { now, force: true });
  }

  /** Fala ambiente curta, combinando com a animação que está tocando. */
  _ambientLine(item = null, { force = false, categories = null } = {}) {
    const s = this.store.get();
    if (!force && (!s.falasAmbientes || s.quietMode || s.speechFrequency === 'off')) return false;
    const line = this.variety.pickLine({ item, categories });
    if (!line) return false;
    return this.say(line.t, 'speech', { spontaneous: !force, category: `ambiente:${line.cat}` });
  }

  /** Evento do sistema/da conversa → animação do catálogo ligada a ele. */
  fireEvent(name, opts = {}) {
    const items = this.catalog.itens.filter((it) => it.gatilho && (it.gatilho.eventos || []).includes(name));
    if (!items.length) return false;
    const it = items[Math.floor(this.rng() * items.length) % items.length];
    return this.playCatalog(it.id, { source: 'evento', ...opts });
  }

  /** Gestos no modo de interação vindos do renderer (clique, duplo clique, segurar, cócegas, jogar). */
  gesture(name) {
    if (!this.interaction || !['clique', 'duploClique', 'segurar', 'cocegas', 'jogar'].includes(name)) return false;
    this.noteActivity();
    const ok = this.fireEvent(name);
    if (ok && this.ambientItem) this.variety.like(this.ambientItem.id);
    return ok;
  }

  /** Item do catálogo pedido por frase no chat ("faz uma dancinha", "selfie"…). */
  catalogFromChat(text) {
    if (!CATALOG_CHAT_INTENTS.has(detectIntent(text))) return null;
    const n = normalizeText(text);
    let best = null;
    for (const it of this.catalog.itens) {
      for (const f of (it.gatilho && it.gatilho.frases) || []) {
        const nf = normalizeText(f);
        if (nf && new RegExp(`\\b${nf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(n) && (!best || nf.length > best.len)) best = { it, len: nf.length };
      }
    }
    if (best) return best.it;
    const m = n.match(/^(jojo )?(faz|faca|mostra|manda|da|me da|bora) (um |uma |o |a |de )?(.{4,})$/);
    if (!m) return null;
    const want = m[4].trim();
    return this.catalog.itens.find((it) => normalizeText(it.nome).startsWith(want)) || this.catalog.itens.find((it) => normalizeText(it.nome).includes(want)) || null;
  }

  /** Busca por id ou nome (comando /anim). */
  findCatalog(query) {
    const q = normalizeText(query);
    if (!q) return null;
    return this.catalogById.get(query.trim()) || this.catalog.itens.find((it) => it.id.toLowerCase() === q.replace(/\s/g, '')) ||
      this.catalog.itens.find((it) => normalizeText(it.nome) === q) || this.catalog.itens.find((it) => normalizeText(it.nome).startsWith(q)) ||
      this.catalog.itens.find((it) => normalizeText(it.nome).includes(q)) || null;
  }

  // ---------------------------------------------------------------- personalidade

  applyPersonality(profile) {
    this.phrases.setProfile({ filter: phraseFilter(profile), weight: phraseWeight(profile) });
  }

  /** Pode dar uma bronca/lembrete agora? Respeita silêncio, pausa, ocultação e despedida. */
  _canNag() {
    const s = this.store.get();
    return this.started && !s.quietMode && !this.paused && !this.userHidden && !this.fullscreenHidden && !this.suspended && !this.quitting && !this.ghost;
  }

  /**
   * Informação sobre o app em primeiro plano, vinda do detector (apenas um
   * booleano "é Instagram"; títulos não chegam aqui nem são guardados).
   */
  onForeground({ instagram = false } = {}) {
    const cfg = this.personality.get().instagram;
    const now = this.clock.now();
    if (instagram && !this.instagram.inside) this.log('info', 'Instagram em primeiro plano.');
    if (!this.instagram.update(now, instagram, cfg, this._canNag() && this.avoid.state !== 'fleeing')) return false;
    // Reincidência: a partir da 3ª bronca em 20 min, raiva de verdade (vermelho).
    this.instagramScolds = (this.instagramScolds || []).filter((t) => now - t < 20 * 60e3);
    this.instagramScolds.push(now);
    this._nag(this.instagramScolds.length >= 3 ? 'instagramAngry' : 'instagram', now);
    return true;
  }

  /** Nome do personagem (perfil). */
  get companionName() {
    return profileVars(this.personality.get()).companion;
  }

  _nag(category, now) {
    if (!this.interaction) {
      this.mover.stop();
      if (this.behavior.state === 'walk') this.behavior.finish('walk', now);
    }
    this.hideBubble();
    // A reação corporal vem da própria fala (julgamento, dedo em riste…).
    if (!this.sayCategory(category) && !this.interaction) this.react('judge');
    // Lembretes (refeições, treino): JoJo com o relógio na mão.
    if (REMINDER_CATS.test(category)) this.fireEvent('lembrete', { speak: false });
    this._schedule(0);
  }

  _scheduleReminderCheck(ms = 60000) {
    if (this.reminderTimer) this.clock.clearTimeout(this.reminderTimer);
    this.reminderTimer = this.clock.setTimeout(() => {
      this.reminderTimer = null;
      this.checkDailyReminder(new Date());
      this.checkWeeklyLegends(new Date());
      this.checkHoliday(new Date());
      if (this.started) this._scheduleReminderCheck(60000);
    }, ms);
  }

  /** Lembrete diário sobre comer com atenção, em horário aleatório na faixa configurada. */
  checkDailyReminder(date = new Date()) {
    const profile = this.personality.get();
    const cfg = profile.lembreteComida;
    const canTalk = this._canNag() && !this.interaction;
    let delivered = null;
    // Quatro refeições por dia, cada uma em horário sorteado dentro da faixa.
    const refeicoes = { ...(cfg.refeicoes || {}) };
    for (const m of MEALS) {
      const st = refeicoes[m.id] || {};
      const { due, state } = dailyReminder(date, { ativo: cfg.ativo, inicio: m.inicio, fim: m.fim, ultimoDia: st.ultimoDia, horarioDeHoje: st.horarioDeHoje }, this.rng);
      // Se não puder falar agora (silêncio, oculto…), tenta de novo no próximo minuto.
      const deliver = due && canTalk && !delivered;
      refeicoes[m.id] = { ultimoDia: deliver ? state.ultimoDia : st.ultimoDia || null, horarioDeHoje: state.horarioDeHoje };
      if (deliver) delivered = m;
    }
    const next = { ...cfg, refeicoes };
    if (JSON.stringify(next) !== JSON.stringify(cfg)) this.personality.update({ lembreteComida: next }, { silent: true });
    if (delivered) {
      this._nag(`refeicao_${delivered.id}`, this.clock.now());
      // Vira uma atividade "Precisa de você" até ela responder na conversa do lembrete.
      const c = this.conversations.create({ id: 'lembrete-comida', title: `Lembrete: ${delivered.nome}`, kind: 'reminder' });
      if (this.lastSaid) this.conversations.addMessage(c.id, 'jojo', this.lastSaid);
      this.conversations.setStatus(c.id, 'needsInput', `Hora do ${delivered.nome}. Responda quando puder.`);
      return true;
    }
    // Treinar é essencial: uma vez por dia.
    const t = profile.lembreteTreino;
    if (t) {
      const { due, state } = dailyReminder(date, t, this.rng);
      const deliver = due && canTalk;
      const nt = { ...t, horarioDeHoje: state.horarioDeHoje };
      if (deliver) nt.ultimoDia = state.ultimoDia;
      if (JSON.stringify(nt) !== JSON.stringify(t)) this.personality.update({ lembreteTreino: nt }, { silent: true });
      if (deliver) {
        this._nag('treinoLembrete', this.clock.now());
        return true;
      }
    }
    return false;
  }


  /**
   * Data festiva: veste a fantasia do dia e cumprimenta uma vez (no jeito dele —
   * às vezes deseja, às vezes se recusa). Retorna a festa ativa ou null.
   */
  checkHoliday(date = new Date()) {
    const cfg = this.personality.get().festas;
    const id = cfg.ativo ? holidayFor(date) : null;
    // Datas solenes não têm fantasia.
    const costume = id ? HOLIDAYS[id].fantasia : null;
    this.holiday = id;
    if (costume !== this.costume) {
      this.costume = costume;
      this._applyLayout(true);
    }
    const hoje = dayKey(date);
    if (id && cfg.ultimoDia !== hoje && this._canNag() && !this.interaction) {
      this.personality.update({ festas: { ...cfg, ultimoDia: hoje } }, { silent: true });
      this.hideBubble();
      this.sayCategory(`festa_${id}`, { force: true });
    }
    return id;
  }

  /** Uma vez por semana, em momento aleatório: "jogar Legends é ideia burra". */
  checkWeeklyLegends(date = new Date()) {
    const cfg = this.personality.get().legends;
    const { due, state } = weeklyReminder(date, cfg, this.rng);
    const deliver = due && this._canNag() && !this.interaction;
    const next = { ...cfg, momento: state.momento };
    if (deliver) next.ultimaSemana = state.ultimaSemana;
    if (JSON.stringify(next) !== JSON.stringify(cfg)) this.personality.update({ legends: next }, { silent: true });
    if (deliver) this._nag('legends', this.clock.now());
    return deliver;
  }

  // ---------------------------------------------------------------- outros comandos

  notifyAlreadyRunning() {
    if (this.userHidden) this.setVisible(true);
    this.sayCategory('alreadyRunning', { force: true });
  }

  // ---------------------------------------------------------------- layout / renderização

  _applyLayout(forceRender = false) {
    if (!this.displays.length) return;
    const s = this.store.get();
    const r = this._rects();
    const disp = this._currentDisplay();
    const wa = disp ? disp.workArea : r.box;
    const attachments = [];
    let toolbar = null;
    let chat = null;
    let bubble = null;
    if (this.interaction) {
      toolbar = placeAround(r.visual, TOOLBAR_SIZE, wa, { order: ['bottom', 'top'], gap: 4 });
      attachments.push(toolbar);
      if (this.chatOpen) {
        chat = placeAround(r.visual, CHAT_SIZE, wa, { order: ['right', 'left', 'top', 'bottom'], avoid: [toolbar.rect], gap: 8 });
        attachments.push(chat);
      }
    }
    if (this.bubble) {
      const order = this.bubble.kind === 'thought' ? ['top', 'left', 'right', 'bottom'] : ['top', 'right', 'left', 'bottom'];
      bubble = placeAround(r.visual, this.bubble.size, wa, { order, avoid: [toolbar?.rect, chat?.rect], tailTarget: r.head, gap: 10 });
      // Sem lugar livre com a conversa aberta: a fala já está no painel; não sobrepõe.
      if (bubble.forced && chat) bubble = null;
    }
    if (bubble) {
      attachments.push(bubble);
      this.bubbleRect = bubble.rect;
    } else this.bubbleRect = null;

    // Balão de status com as atividades (ao lado do pet).
    let activityBox = null;
    const acts = this.conversations.activities(4);
    const showActs = acts.length && !this.ghost && !this.dragging && (this.interaction || this.clock.now() >= this.activitiesHiddenUntil);
    if (showActs) {
      const size = { width: ACTIVITY_WIDTH, height: 12 + acts.length * ACTIVITY_ROW };
      activityBox = placeAround(r.visual, size, wa, { order: ['left', 'right', 'bottom', 'top'], avoid: [toolbar?.rect, chat?.rect, bubble?.rect], gap: 8 });
      attachments.push(activityBox);
      this.activityRect = activityBox.rect;
    } else this.activityRect = null;

    // Fantasia: espaço acima da cabeça para o chapéu (a janela cresce, os cliques continuam atravessando).
    if (this.costume) {
      attachments.push({ rect: { x: r.box.x, y: r.box.y - COSTUME_HEADROOM * s.size, width: r.box.width, height: COSTUME_HEADROOM * s.size } });
      // Lanternas penduradas na mão passam do pé.
      attachments.push({ rect: { x: r.box.x, y: r.box.y + r.box.height, width: r.box.width, height: COSTUME_FOOTROOM * s.size } });
    }
    // Animação/efeito passando da caixa: a janela cresce o necessário (sem parede invisível).
    const extra = this._animRoom();
    if (extra) {
      const k = s.size;
      const l = (this.facing >= 0 ? extra.l : extra.r) * k;
      const rr = (this.facing >= 0 ? extra.r : extra.l) * k;
      const want = { x: r.box.x - l, y: r.box.y - extra.t * k, width: r.box.width + l + rr, height: r.box.height + (extra.t + extra.b) * k };
      // Não invade outro monitor (DPI diferente deformaria a janela).
      const rect = disp ? intersection(want, disp.bounds) : want;
      if (rect) attachments.push({ rect });
    }
    const { bounds, rel } = composeWindow(r.box, attachments);
    const b = roundRect(bounds);
    if (!this.lastBounds || b.x !== this.lastBounds.x || b.y !== this.lastBounds.y || b.width !== this.lastBounds.width || b.height !== this.lastBounds.height) {
      this.overlay.setBounds(b);
      this.lastBounds = b;
    }
    const now = this.clock.now();
    const state = {
      anim: this.behavior.anim || 'idle',
      bstate: this.behavior.state,
      facing: this.facing,
      scale: s.size,
      jojo: rel(r.box),
      visual: rel(r.visual),
      opacity: this.opacity,
      talking: this.talkingUntil > now,
      paused: this.paused,
      interaction: this.interaction,
      bubble: bubble ? {
        text: this.bubble.text, kind: this.bubble.kind, side: bubble.side, rect: rel(bubble.rect),
        tail: { x: bubble.tail.x - bounds.x, y: bubble.tail.y - bounds.y }, target: { x: r.head.x - bounds.x, y: r.head.y - bounds.y },
        scale: s.bubbleScale,
      } : null,
      toolbar: toolbar ? { rect: rel(toolbar.rect), side: toolbar.side, hotkey: s.interactionHotkey } : null,
      chat: chat ? { rect: rel(chat.rect), provider: this.dialogue ? this.dialogue.describe() : null, name: this.companionName, commands: commandMenu({ petVisible: !this.userHidden }) } : null,
      effect: this.effect ? this.effect.name : null,
      effectKind: this.effect ? this.effect.kind || null : null,
      activities: activityBox ? { rect: rel(activityBox.rect), side: activityBox.side, items: acts } : null,
      reducedMotion: this.reducedMotion,
      micro: s.microMovimentos || 'normal',
      mode: this.wired ? 'wired' : null,
      costume: this.costume,
      // Fantasia ousada (padrão) ou comportada; datas de outras religiões, só comportada.
      sexy: !!(this.costume && this.personality.get().festas.estilo === 'ousada' && (!this.holiday || HOLIDAYS[this.holiday].ousada !== false)),
      noseDust: this.wired && this.wiredKind === 'snort',
      moving: this.mover.active ? this.mover.kind : null,
      sounds: s.sounds && !s.quietMode,
    };
    const key = JSON.stringify(state);
    if (forceRender || key !== this.lastRender) {
      this.lastRender = key;
      this.overlay.render(state);
    }
  }

  /** Espaço extra (px na escala 1) da animação atual, da anterior (transição) e do efeito. */
  _animRoom() {
    const now = this.clock.now();
    // Catálogo: as três intensidades usam o espaço da exagerada (a maior).
    const anim = (this.behavior.anim || 'idle').replace(/~\w+$/, '');
    if (!this.roomPrev || this.roomPrev.anim !== anim) {
      this.roomPrev = { anim, prev: this.roomPrev ? this.roomPrev.anim : null, until: now + 400 };
      if (this.roomPrev.prev) this.clock.setTimeout(() => this._applyLayout(), 450);
    }
    const parts = [this.room.anims[anim]];
    if (this.roomPrev.prev && now < this.roomPrev.until) parts.push(this.room.anims[this.roomPrev.prev]);
    if (this.effect) parts.push(this.room.effects[this.effect.name]);
    let out = null;
    for (const p of parts) {
      if (!p) continue;
      out = out ? { l: Math.max(out.l, p.l), t: Math.max(out.t, p.t), r: Math.max(out.r, p.r), b: Math.max(out.b, p.b) } : { ...p };
    }
    return out;
  }

  debugState() {
    const r = this._rects();
    return {
      pos: { ...this.pos },
      visual: r.visual,
      box: r.box,
      behavior: this.behavior.state,
      anim: this.behavior.anim,
      avoid: this.avoid.state,
      moving: this.mover.active ? this.mover.kind : null,
      interaction: this.interaction,
      ghost: this.ghost,
      opacity: this.opacity,
      bubble: this.bubble ? { text: this.bubble.text, kind: this.bubble.kind, rect: this.bubbleRect } : null,
      bounds: this.lastBounds,
      mouseMode: this.overlay.mouseMode,
      stats: { ...this.stats },
      paused: this.paused,
      hidden: this.userHidden || this.fullscreenHidden,
      display: this._currentDisplay()?.id ?? null,
    };
  }
}

export { PRIORITY };
