// Controlador do Jeff: une desvio do cursor, movimento, máquina de estados,
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
import { BehaviorMachine, PRIORITY, STATES } from './behavior.js';
import { PhraseBook, readingTimeMs, greetingCategory } from './phrases.js';
import { placeAround, composeWindow } from './layout.js';
import { displayForRect, allowedDisplays, recoverRect, topologySignature, primaryDisplay } from './displays.js';
import { distPointRect, roundRect, dist, clamp } from './geometry.js';
import { jeffRects, metricsFrom } from './rig-metrics.js';
import { SPEECH_INTERVALS } from './settings-schema.js';
import { PERSONALITY_DEFAULTS, InstagramWatcher, dailyReminder, weeklyReminder, phraseFilter, phraseWeight, profileVars } from './personality.js';
import { ConversationManager, parseCommand, commandMenu } from './conversations.js';

const TOOLBAR_SIZE = { width: 278, height: 50 };
const ACTIVITY_ROW = 26;
const ACTIVITY_WIDTH = 224;
const THINK_MS = 650; // "digitando…": tempo em que a conversa fica "Em andamento"
const CHAT_SIZE = { width: 300, height: 270 };
const USER_CATEGORIES = new Set(['petted', 'food', 'play', 'interactEnter', 'interactExit', 'alreadyRunning', 'goodbye', 'unpause', 'dragged', 'land', 'achievement', 'quietAck', 'scare']);
// Intervalo mínimo entre quaisquer falas espontâneas (inclui reações e "Zzz").
const MIN_SPONTANEOUS_GAP = { off: Infinity, rare: 240e3, normal: 90e3, often: 40e3 };
const WALK_SPEED = 70;
const FLEE_SPEED = 1150;
const CALM_STATES = new Set(['idle', 'sit', 'lookAround', 'curious', 'lie']);

export class Companion {
  constructor({ platform, overlay, clock, store, personality = null, rig = null, phrases = null, dialogue = null, rng = Math.random, log = () => {} }) {
    // Perfil de personalidade (separado da aparência): {get()} — ex.: SettingsStore de personality.json.
    this.personality = personality || { get: () => PERSONALITY_DEFAULTS, update: () => [] };
    this.instagram = new InstagramWatcher();
    this.reminderTimer = null;
    // Conversas e atividades (balão de status). Callbacks definidos pelo main:
    this.conversations = new ConversationManager({ now: () => Date.now() });
    this.conversations.onChange(() => {
      if (this.started) this._applyLayout(true);
      if (this.onConversationsChange) this.onConversationsChange();
    });
    this.onConversationsChange = null; // () => void
    this.onOpenApp = null; // (conversationId|null) => void — traz a Central do JoJo para frente
    this.onOpenSettings = null; // () => void
    this.activitiesHiddenUntil = 0;
    this.activityRect = null;
    this.reducedMotion = false;
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
    this._scheduleReminderCheck(20000);
    if (this.userHidden) {
      this.overlay.hide();
      return;
    }
    this.overlay.show();
    this.behavior.request('appear', { now, force: true });
    this._applyLayout(true);
    this._schedule(0);
    this.clock.setTimeout(() => this.sayCategory(greetingCategory(new Date()), { force: false, fallback: 'greeting' }), 1500);
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
    return !this.interaction && !this.dragging && !this.quitting && this.behavior.state !== 'goodbye';
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
    return jeffRects(this.metrics, pos, this.store.get().size, this.facing);
  }

  _runAvoidance(now) {
    const r = this._rects();
    const actions = this.avoid.update({
      now,
      cursor: this.cursor,
      cursorVel: this.cursorVel,
      jeffRect: r.visual,
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
    const target = this._pickWanderTarget();
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
    } else cat = roll < 0.65 ? 'idleSpeech' : 'idleThought';
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
        if (this.bubbleRect && distPointRect(this.cursor, this.bubbleRect) < this.avoid.cfg.margin && !this.interaction) this.hideBubble();
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
    // Clicar fora do Jeff no modo de interação encerra o modo (como um popup).
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
    this.effect = { name: m[2], until: now + m[3] };
    this.sayCategory(m[1], { force: true });
    this._applyLayout(true);
    this._schedule(0);
    return true;
  }

  setChatOpen(open) {
    if (!this.interaction) return;
    this.chatOpen = !!open;
    this.conversations.setViewing(this.conversations.current().id, this.chatOpen);
    this.noteActivity();
    if (open) this.hideBubble();
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
    if (cmd) return this.runCommand(cmd, conv.id);
    if (!this.dialogue) return null;
    this.noteActivity();
    this.conversations.addMessage(conv.id, 'user', text);
    this.conversations.setStatus(conv.id, 'running');
    await new Promise((r) => this.clock.setTimeout(r, THINK_MS));
    let reply;
    try {
      reply = await this.dialogue.reply(text, { state: this.behavior.state, persona: this.personality.get().instrucoes });
    } catch (e) {
      this.conversations.setStatus(conv.id, 'blocked', `Falha na conversa: ${e.message}`);
      return { text: 'Deu erro aqui. Tenta de novo.', error: e.message, conversationId: conv.id, provider: this.dialogue.describe() };
    }
    const profile = this.personality.get();
    const vars = profileVars(profile, reply.tone);
    reply.text = reply.text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    if (reply.web || reply.webNotFound || reply.webError) Object.assign(reply, this._webReply(reply, profile));
    this.conversations.addMessage(conv.id, 'jeff', reply.text);
    if (reply.webError) this.conversations.setStatus(conv.id, 'blocked', `Pesquisa na internet falhou (${reply.webError}).`);
    else if (reply.error) this.conversations.setStatus(conv.id, 'blocked', `Provedor de IA falhou (${reply.error}); respondi com frases programadas.`);
    else if (/\?\s*$/.test(reply.text)) this.conversations.setStatus(conv.id, 'needsInput', 'Pergunta esperando resposta.');
    else this.conversations.setStatus(conv.id, 'ready');
    const now = this.clock.now();
    this.noteActivity();
    if (reply.action) this._doChatAction(reply.action, now);
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
  runCommand(cmd, conversationId = null) {
    const name = this.companionName;
    let text;
    if (cmd === 'pet') {
      const show = this.userHidden;
      this.setVisible(show);
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
      text = 'Comando desconhecido. Use /pet, /silencio, /nova ou /config.';
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
    if (!last || last.text !== message) this.conversations.addMessage(id, 'jeff', message);
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
    if (action === 'eat' || action === 'play' || action === 'pet') {
      const map = { pet: ['petted', 'hearts', 2200], eat: ['eat', 'food', 2800], play: ['play', 'ball', 3400] };
      const [st, fx, ms] = map[action];
      this.behavior.request(st, { now, force: true });
      this.effect = { name: fx, until: now + ms };
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
    if (st === name || st === 'flee' || st === 'hidden' || st === 'dragged' || st === 'goodbye' || st === 'gone' || this.dragging) return false;
    const now = this.clock.now();
    if (this.mover.active && this.mover.kind === 'walk') {
      this.mover.stop();
      if (st === 'walk') this.behavior.finish('walk', now);
    }
    return this.behavior.request(name, { now, force: this.behavior.priority >= PRIORITY.INTERACT });
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
    if (!this.instagram.update(now, instagram, cfg)) return false;
    if (!this._canNag()) return false;
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
    this._schedule(0);
  }

  _scheduleReminderCheck(ms = 60000) {
    if (this.reminderTimer) this.clock.clearTimeout(this.reminderTimer);
    this.reminderTimer = this.clock.setTimeout(() => {
      this.reminderTimer = null;
      this.checkDailyReminder(new Date());
      this.checkWeeklyLegends(new Date());
      if (this.started) this._scheduleReminderCheck(60000);
    }, ms);
  }

  /** Lembrete diário sobre comer com atenção, em horário aleatório na faixa configurada. */
  checkDailyReminder(date = new Date()) {
    const profile = this.personality.get();
    const cfg = profile.lembreteComida;
    const { due, state } = dailyReminder(date, cfg, this.rng);
    let deliver = due && this._canNag() && !this.interaction;
    const next = { ...cfg, horarioDeHoje: state.horarioDeHoje };
    // Se não puder falar agora (silêncio, oculto…), tenta de novo no próximo minuto.
    if (deliver) next.ultimoDia = state.ultimoDia;
    if (JSON.stringify(next) !== JSON.stringify(cfg)) this.personality.update({ lembreteComida: next }, { silent: true });
    if (deliver) {
      this._nag('foodReminder', this.clock.now());
      // Vira uma atividade "Precisa de você" até ela responder na conversa do lembrete.
      const c = this.conversations.create({ id: 'lembrete-comida', title: 'Lembrete: comida', kind: 'reminder' });
      if (this.lastSaid) this.conversations.addMessage(c.id, 'jeff', this.lastSaid);
      this.conversations.setStatus(c.id, 'needsInput', 'Fome ou tédio? Responda quando puder.');
    }
    return deliver;
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
      jeff: rel(r.box),
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
      activities: activityBox ? { rect: rel(activityBox.rect), side: activityBox.side, items: acts } : null,
      reducedMotion: this.reducedMotion,
      mode: this.wired ? 'wired' : null,
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
