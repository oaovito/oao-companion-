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
import { VarietyEngine, periodOf, seasonOf } from './catalog/variety.js';
import { Progress, Games, pickRoutine, routineSteps } from './catalog/antitedio.js';
import { detectIntent, normalizeText } from './dialogue/scripted-provider.js';
import { isFactualQuestion } from './dialogue/web-search.js';
import { jojoRects, metricsFrom } from './rig-metrics.js';
import { SPEECH_INTERVALS, AMBIENT_WEIGHTS } from './settings-schema.js';
import { PERSONALITY_DEFAULTS, MEALS, InstagramWatcher, dailyReminder, weeklyReminder, phraseFilter, phraseWeight, profileVars, dayKey } from './personality.js';
import { ConversationManager, parseCommand, commandMenu } from './conversations.js';
import { holidayFor, HOLIDAYS } from './holidays.js';
import { findIcalUrl, agendaDoDia, agendaBetween, hhmm, eventKind, KIND_ANIMS } from './calendar.js';
import { wear, undress, randomOutfit, outfitChannels, findWardrobeItem, sanitizeOutfit, WEAR_LINES } from './wardrobe.js';

const TOOLBAR_SIZE = { width: 382, height: 50 };
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
// Spotify: "clima" da música pelo título (sem consultar nada fora do PC) → animações.
const VIBE_ANIMS = {
  treino: ['halteres', 'duploBiceps', 'flexoes', 'agachamentoNado'],
  funk: ['dancinhaViral', 'dancarSemRitmo', 'dancinha'],
  rock: ['modoFera', 'poseVilao', 'estalar'],
  rap: ['poseVilao', 'superioridade', 'seAcharMaximo'],
  calma: ['ouvirMusica', 'contente', 'balancar', 'flutuar'],
  amor: ['apaixonado', 'cantarDesafinado', 'charmeCauda'],
  triste: ['chorando', 'solitario', 'cantarDesafinado'],
  festa: ['festaSozinho', 'dancinha', 'puloOndas'],
  outra: ['ouvirMusica', 'dancinha', 'cantarDesafinado', 'dancarSemRitmo', 'balancar', 'charmeCauda'],
};
const VIBES = [
  ['treino', /\b(workout|gym|treino|academia|eye of the tiger|stronger|lose yourself|till i collapse|phonk|pump)\b/i],
  ['funk', /\b(funk|mc |mc$|baile|pancad[aã]o|brega|piseiro|forr[oó]|arrocha)\b/i],
  ['rock', /\b(rock|metal|punk|grunge|metallica|ac\/dc|iron maiden|slipknot|nirvana|linkin park|foo fighters|guns n|system of a down|avenged)\b/i],
  ['rap', /\b(rap|trap|hip.?hop|drill|racionais|emicida|djonga|matu[eê]|eminem|kendrick|drake|travis scott|50 cent)\b/i],
  ['calma', /\b(lo-?fi|lofi|chill|piano|acoustic|ac[uú]stic|ambient|relax|study|sleep|calm|bossa|jazz|classical|cl[aá]ssic)\b/i],
  ['amor', /\b(love|amor|amo|cora[cç][aã]o|heart|paix[aã]o|baby|beijo|kiss)\b/i],
  ['triste', /\b(sad|triste|saudade|sozinh|alone|cry|chor|broken|adeus|goodbye|lonely)\b/i],
  ['festa', /\b(party|festa|dance|dan[cç]a|remix|edm|house|techno|pagode|samba|sertanejo|carnaval|ax[eé])\b/i],
];
export function musicVibe(title) {
  for (const [vibe, re] of VIBES) if (re.test(title)) return vibe;
  return 'outra';
}

// Intenções do chat que deixam o catálogo responder por frase (as outras têm resposta própria).
const CATALOG_CHAT_INTENTS = new Set(['unknown', 'play', 'gym', 'eat', 'greet', 'howAreYou', 'help', 'name', 'thanks', 'scare', 'pet']);
const REMINDER_CATS = /^(refeicao_|treinoLembrete|foodReminder)/;

export class Companion {
  constructor({ platform, overlay, clock, store, personality = null, rig = null, room = null, catalog = null, ambientLines = null, variety = null, antitedio = null, phrases = null, dialogue = null, rng = Math.random, log = () => {} }) {
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
        const vs = this.variety ? this.variety.state : {};
        const quieto = this.progress && this.progress.st.diasQuietos === dayKey(new Date());
        // Humor do dia dela (cansada/triste → calmo; animada → pilhado) quando a energia é automática.
        const humorDia = this.progress && this.progress.st.humorDia && this.progress.st.humorDia.dia === dayKey(new Date()) ? this.progress.st.humorDia.modo : null;
        return { modo: st.ambienteModo === 'auto' ? (quieto ? 'calmo' : humorDia || 'auto') : st.ambienteModo, surpresas: st.surpresas, desligadas: vs.desligadas || [], semPesadas: !st.animacoesPesadas };
      },
    });
    // Antitédio: progressão/coleções, rotinas e mini-jogos (assets/catalog/*.json).
    const at = antitedio || {};
    this.rotinas = (at.rotinas && at.rotinas.rotinas) || [];
    this.games = at.minijogos ? new Games({ data: at.minijogos, rng }) : null;
    this.progress = new Progress({
      data: at.progressao || { niveis: ['Sardinha'], xpPorNivel: 60, xp: {}, acessorios: [], conquistas: [], missoes: [], areas: [] },
      state: this.variety.state.prog,
      save: (st) => {
        this.variety.state.prog = st;
        this.variety.save(this.variety.state);
      },
      rng,
      now: () => this.clock.now(),
    });
    this.game = null; // mini-jogo em andamento
    this.focus = null; // bloco de foco (body doubling)
    this.calmUntil = 0;
    this.lastAmbientAt = 0;
    this.lastAmbientItemAt = 0;
    // Google Agenda: eventos lidos do endereço iCal (o main busca); avisos já dados.
    this.calendar = { events: [], error: null, lastSync: 0 };
    this.calendarWarned = new Set();
    this.onCalendarConnect = null; // async (url) => {ok, count, error}
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
      const per = periodOf(new Date());
      // Rotina previsível definida por ela ("bom dia" sempre igual).
      const fixa = this.progress.st.rotinaFixa || {};
      const fixo = per === 'manha' ? fixa.bomDia : per === 'noite' ? fixa.boaNoite : null;
      if (fixo) this.say(fixo, 'speech');
      else this.sayCategory(greetingCategory(new Date()), { force: false, fallback: 'greeting' });
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
    this._announceProgress({ lvl: this.progress.xp('diaNovo'), novas: this.progress.count('streak', s.count, true) });
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
    if (changed.includes('lolBronca') && !settings.lolBronca) this._lolReturn();
    if (changed.includes('spotifyReacoes') && !settings.spotifyReacoes) this.onSpotify(null);
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
    if (this.userHidden || this.fullscreenHidden || this.suspended || this.lolHidden) return;
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
    if (!this.started || this.suspended || this.userHidden || this.fullscreenHidden || this.lolHidden) return;
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

    this._gamePega(now);
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
      // Mais nas horas em que ela costuma interagir; menos em dia quieto e com movimento reduzido.
      ambientWeight: (AMBIENT_WEIGHTS[this.store.get().ambienteFrequencia] ?? 0) * (this.reducedMotion ? 0.5 : 1) * this.progress.hourBoost() * (this.progress.st.diasQuietos === dayKey(new Date()) ? 0.4 : 1),
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
    if (idleSec < 60) this._boredomTick(now);
    // Fim do dia: resumo animado (uma vez, a partir das 21h, se ela estiver por aí).
    const d = new Date();
    if (d.getHours() >= 21 && idleSec < 60 && this.resumoDia !== dayKey(d) && this._canNag() && !this.interaction) {
      this.resumoDia = dayKey(d);
      const txt = this.progress.resumoDia(d);
      if (!/tranquilo/.test(txt)) {
        this.fireEvent('parabens', { speak: false });
        this.say(txt, 'speech');
      }
    }
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
    return this.started && !this.paused && !this.userHidden && !this.fullscreenHidden && !this.lolHidden && !this.suspended && !this.quitting && !this.ghost && !this.interaction && !this.dragging;
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
    // Foco junto: voltou ao repouso → continua estudando/treinando do lado dela.
    if (ev.state === 'idle' && this.focus && !this.interaction) this.clock.setTimeout(() => this.focus && this.behavior.state === 'idle' && this._focusAnim(this.clock.now()), 0);
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
    // Foco, calma ou dia quieto: nada de falas espontâneas.
    if (this.focus || now < this.calmUntil || this.progress.st.diasQuietos === dayKey(new Date())) return;
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
    if (!this.started || this.userHidden || this.ghost || this.lolHidden) return false;
    if (spontaneous && this.bubble) return false;
    // Fala importante (bronca, resposta) ainda sendo medida: a espontânea não passa por cima.
    if (spontaneous && this.clock.now() - (this.importantSayAt ?? -Infinity) < 1500) return false;
    if (!spontaneous) this.importantSayAt = this.clock.now();
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
    if (action === 'fidget') return this.fidget() > 0;
    if (action === 'estimulo') return this.estimulo();
    if (action === 'pet') this._progress('gesto', { conta: 'gestos', missao: 'carinho' });
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
    // Mini-jogo em andamento: a mensagem é a jogada (segurança sempre vem antes).
    const safety = ['crisis', 'distress', 'sad', 'avcReal'].includes(detectIntent(text));
    if (safety && this.game) this.game = null;
    if (this.game) {
      const t = this._gameAnswer(text);
      if (t) return this._quickReply(conv, t, 'jogo');
    }
    if (!safety) {
      const nt = normalizeText(text);
      if (this.games && /\b(vamos jogar|bora jogar|quero jogar|joga comigo|um jogo|mini ?jogo)\b/.test(nt)) return this._quickReply(conv, this.startGame(text), 'jogo');
      if (/\b(vamos|bora) focar\b|\bmodo foco\b|\bestuda comigo\b|\btreina comigo\b/.test(nt)) return this._quickReply(conv, this.startFocus(25, /treina/.test(nt) ? 'treino' : 'estudo'), 'foco');
      if (/\bme da (um )?estimulo\b|\bto entediad[ao]\b|\bque tedio\b/.test(nt)) {
        this.estimulo();
        return this._quickReply(conv, 'Toma. Sem tédio no meu turno.', 'estimulo');
      }
      // Brincar de boneca: abre o guarda-roupa (só se ela quiser).
      if (/\b(guarda ?roupa|brincar de boneca|te vestir|vestir voce|vestir vc|trocar (a )?(sua|tua) roupa|mudar (a )?(sua|tua) roupa|escolher (a )?(sua|tua) roupa)\b/.test(nt)) {
        if (this.onOpenApp) this.onOpenApp('guardaRoupa');
        this.playCatalog('espelho', { source: 'chat', speak: false });
        return this._quickReply(conv, 'Abri o guarda-roupa na Central. Pode me vestir. Com cuidado com o bíceps.', 'guardaRoupa');
      }
      const at = this._antitedioChat(text);
      if (at) return this._quickReply(conv, at, 'antitedio');
    }
    // Google Agenda: conectar (guia/link colado), "o que tenho hoje?", desconectar.
    const ag = await this._agendaChat(text);
    if (ag) {
      this.conversations.addMessage(conv.id, 'jojo', ag);
      this.conversations.setStatus(conv.id, 'ready');
      this.talkingUntil = this.clock.now() + 2000;
      if (!/^Conectado/.test(ag)) this.playCatalog('lembrete', { source: 'chat', speak: false });
      this._applyLayout(true);
      return { text: ag, action: null, intent: 'agenda', conversationId: conv.id, provider: this.dialogue.describe() };
    }
    // "O que tá tocando?": a música do Spotify, no jeito dele.
    if (this.nowPlaying && /\b(o ?que|qual|que) (musica |som )?(ta|esta|tá|está)? ?tocando\b|\bque musica e essa\b/.test(normalizeText(text))) {
      const np = this.nowPlaying;
      const out = `${np.musica}, de ${np.artista}. ${np.vibe === 'treino' ? 'Música de treino. Aprovada.' : np.vibe === 'calma' ? 'Calminha. Boa pra focar.' : 'Eu escolheria melhor, mas tá valendo.'}`;
      this.conversations.addMessage(conv.id, 'jojo', out);
      this.conversations.setStatus(conv.id, 'ready');
      this.fireEvent('ouvindo') || this.playCatalog('ouvirMusica', { source: 'chat', speak: false });
      return { text: out, action: null, intent: 'musica', conversationId: conv.id, provider: this.dialogue.describe() };
    }
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

  _quickReply(conv, text, intent) {
    this.conversations.addMessage(conv.id, 'jojo', text);
    this.conversations.setStatus(conv.id, 'ready');
    this.talkingUntil = this.clock.now() + Math.min(2600, 500 + text.length * 45);
    this._applyLayout(true);
    return { text, action: null, intent, conversationId: conv.id, provider: this.dialogue ? this.dialogue.describe() : null };
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
    const arg = String(raw).replace(/^\/\S+\s*/, '').trim();
    if (cmd === 'jogo') return { text: this.startGame(arg), command: cmd, conversationId };
    if (cmd === 'foco') {
      if (/^(parar|sair|cancelar|fim)/i.test(arg)) return { text: this._endFocus(false) || 'Sem foco ativo.', command: cmd, conversationId };
      const min = clamp(Number((arg.match(/\d+/) || [25])[0]), 5, 120);
      return { text: this.startFocus(min, /treino/i.test(arg) ? 'treino' : 'estudo'), command: cmd, conversationId };
    }
    if (cmd === 'estimulo') return { text: this.estimulo() ? 'Toma.' : 'Agora não.', command: cmd, conversationId };
    if (cmd === 'calma') return { text: this.calma(2) ? 'Respira. Dois minutos de calma.' : 'Agora não.', command: cmd, conversationId };
    if (cmd === 'ritmo') return { text: this.ritmo(30) ? 'Um, dois, três, quatro. Segue o ritmo.' : 'Agora não.', command: cmd, conversationId };
    if (cmd === 'bolhas') {
      if (!this.interaction) this.enterInteraction('bolhas');
      this.game = { id: 'bolhasLivre', tipo: 'bolhas', nome: 'Bolhas', ate: this.clock.now() + 30e3, bolhas: 0, livre: true };
      const g = this.game;
      this.clock.setTimeout(() => {
        if (this.game === g) {
          this.game = null;
          this._applyLayout(true);
        }
      }, 30e3);
      this._applyLayout(true);
      return { text: 'Bolhas por 30 s. Estoura à vontade, sem placar.', command: cmd, conversationId };
    }
    if (cmd === 'resumo') {
      this.fireEvent('parabens', { speak: false });
      return { text: this.progress.resumoDia(new Date()), command: cmd, conversationId };
    }
    if (cmd === 'colecao') {
      const p = this.progress.snapshot(new Date());
      if (this.onOpenApp) this.onOpenApp('colecao');
      return { text: `Nível ${p.nivel} (${p.nomeNivel}), ${p.poses} poses, ${p.conquistas.filter((q) => q.ok).length} conquistas. Abri a coleção na Central.`, command: cmd, conversationId };
    }
    if (cmd === 'vestir') {
      // Guarda-roupa: sem nome abre o painel na Central; com nome veste/tira a peça.
      if (!arg) {
        if (this.onOpenApp) this.onOpenApp('guardaRoupa');
        return { text: 'Guarda-roupa aberto na Central. Me veste, se quiser.', command: cmd, conversationId };
      }
      if (/^(tira(r)?( tudo)?|nada|pelado|limpar)$/i.test(arg)) return { text: this.despir(), command: cmd, conversationId };
      if (/^(surpresa|aleat[oó]rio|sorteia|sortear)$/i.test(arg)) return { text: this.lookSurpresa(), command: cmd, conversationId };
      const peca = findWardrobeItem(arg);
      return { text: peca ? this.vestir(peca.id) : 'Não tenho essa peça. Abre o guarda-roupa com /vestir.', command: cmd, conversationId };
    }
    if (cmd === 'rotina') {
      const m = arg.match(/^(bom dia|boa noite)\s*:\s*(.{2,120})$/i);
      if (!m) return { text: 'Use: /rotina bom dia: texto (ou boa noite). Eu digo sempre igual.', command: cmd, conversationId };
      const key = /dia/i.test(m[1]) ? 'bomDia' : 'boaNoite';
      this.progress.st.rotinaFixa = { ...(this.progress.st.rotinaFixa || {}), [key]: m[2].trim() };
      this.progress.save(this.progress.st);
      return { text: `Fechado. ${m[1]} vai ser sempre: "${m[2].trim()}"`, command: cmd, conversationId };
    }
    if (cmd === 'pausa') {
      this.setPaused(!this.paused);
      return { text: this.paused ? 'Pausado. Fico quietinho.' : 'Voltei.', command: cmd, conversationId };
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
      text = 'Comando desconhecido. Use / para ver a lista.';
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
    if (action === 'boaNoite') {
      // Depois das 21h: dormir liberado, ele dá boa noite.
      this.playCatalog('boaNoite', { source: 'chat', speak: false });
      return;
    }
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
    this.dragFrom = { ...this.pos };
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
    // Cabo de guerra: arrastou longe o bastante?
    if (this.game && this.game.tipo === 'cabo' && this.dragFrom) {
      const d = Math.hypot(this.pos.x - this.dragFrom.x, this.pos.y - this.dragFrom.y);
      if (d > 250) this.clock.setTimeout(() => this.say(this._finishGame(true, 'Você venceu o cabo de guerra. Braço de campeã.'), 'speech'), 800);
      else this.clock.setTimeout(() => this.say('Puxa mais! Mais de 250 px.', 'speech'), 800);
    }
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
    this._noteSeen(item);
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
    const date = new Date();
    // Foco junto: continua estudando/treinando do lado dela.
    if (this.focus) {
      const fid = this.focus.tipo === 'treino' ? 'treinarJunto' : 'estudarJunto';
      return { ...this._catalogData(this.catalogById.get(fid), 'suave'), ms: Math.max(2000, this.focus.fim - this.clock.now()) };
    }
    // Temporada nova da semana: anuncia uma vez e marca a área do aquário.
    const season = seasonOf(date);
    if (this.variety.state.season !== season.id) {
      this.variety.state.season = season.id;
      this.variety.save(this.variety.state);
      if (this.progress.visitArea(season.id) && this._canNag()) this.clock.setTimeout(() => this.say(`Começou a ${season.nome}.`, 'thought', { spontaneous: true }), 300);
    }
    // Às vezes uma rotina/mini-história inteira em vez de uma animação solta.
    if (!this.ambientQueue.length && this.rng() < (this.variety.state.boredom >= 3 ? 0.35 : 0.12)) this._startRoutine(date);
    let it = this._dequeue();
    const queued = !!it;
    if (!it) it = this.variety.pickAmbient({ filter: (x) => !(x.mover && this.reducedMotion) });
    if (!it) return null;
    // Energia caótica: emenda mais uma ou duas reações.
    if (!queued && this.variety.energy(date) === 'caotico' && this.rng() < 0.5) {
      const extra = this.variety.pickAmbient({ filter: (x) => !x.mover && !x.especial && !x.usa });
      if (extra) this.ambientQueue.push(extra.id);
    }
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
    this._noteSeen(it);
    if (it.fala && !queued && this.rng() < 0.35) this.clock.setTimeout(() => this._ambientLine(it), 700);
    if (it.especial === 'semFiltro') {
      this.clock.setTimeout(() => this._semFiltro(), 0);
      return { anim: 'idle', ms: 200, item: it.id };
    }
    // Camadas extras de variedade: acessório liberado (óculos, medalha) e lado.
    const acc = this.progress.acessorios.filter((a) => a.prop === 'oculos' || a.prop === 'medalha');
    const usaObjeto = it.receita && [].concat(it.receita.objeto || []).length;
    this.layer = acc.length && !usaObjeto && this.rng() < 0.25 ? { [`prop_${acc[Math.floor(this.rng() * acc.length) % acc.length].prop}`]: 1 } : null;
    if (!this.mover.active && this.rng() < 0.35) this.facing = -this.facing;
    return this._catalogData(it);
  }

  // ---------------------------------------------------------------- guarda-roupa

  /** Roupa escolhida por ela ({parte: peça}); vazia = sem roupa do guarda-roupa. */
  get outfit() {
    return sanitizeOutfit(this.store.get().guardaRoupa);
  }

  /** Veste a peça (a mesma de novo tira). Retorna a fala do JoJo. */
  vestir(id) {
    const r = wear(this.outfit, id);
    if (!r.item) return 'Não tenho essa peça.';
    return this._saveOutfit(r.outfit, r.removed ? 'tira' : r.item.slot);
  }

  /** Tira uma parte (ou tudo). */
  despir(slot = null) {
    return this._saveOutfit(undress(this.outfit, slot), 'tira');
  }

  /** Look surpresa sorteado. */
  lookSurpresa() {
    return this._saveOutfit(randomOutfit(this.rng), 'surpresa');
  }

  _saveOutfit(outfit, kind) {
    this.store.update({ guardaRoupa: outfit }, { silent: true });
    const lines = WEAR_LINES[kind];
    const t = lines[Math.floor(this.rng() * lines.length) % lines.length];
    if (this.started) {
      this.say(t, 'speech');
      this.playCatalog(kind === 'surpresa' ? 'desfile' : kind === 'tira' ? 'ajeitarPostura' : 'espelho', { source: 'comando', speak: false });
      this._applyLayout(true);
    }
    if (this.onConversationsChange) this.onConversationsChange();
    return t;
  }

  /** A animação atual deixa a mão livre para a peça "na mão"? */
  _handFree() {
    const a = this.behavior.anim || 'idle';
    if (/^(idle|interactIdle|walk|sit|lie|blink)/.test(a)) return true;
    if (!a.startsWith('cat_')) return false;
    const it = this.catalogById.get(a.slice(4).split('~')[0]);
    return !!(it && !(it.receita && [].concat(it.receita.objeto || []).length));
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
    // Interesses que ela contou aparecem de vez em quando.
    const ints = this.progress.st.interesses || [];
    if (!item && ints.length && this.rng() < 0.12) {
      const x = ints[Math.floor(this.rng() * ints.length)];
      return this.say(`Pensando em ${x} agora. Por quê? Porque sim.`, 'speech', { spontaneous: !force, category: 'ambiente:interesse' });
    }
    const line = this.variety.pickLine({ item, categories });
    if (!line) return false;
    this._announceProgress({ novas: this.progress.seeCard(line) });
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
    if (!this.interaction || !['clique', 'duploClique', 'segurar', 'cocegas', 'jogar', 'bolha'].includes(name)) return false;
    this.noteActivity();
    if (this._gameGesture(name)) return true;
    if (name === 'bolha') return false;
    // Curtiu a animação de agora há pouco (adaptação) e ganha XP pelo gesto.
    if (this.ambientItem && this.clock.now() - this.lastAmbientItemAt < 15000) this.variety.like(this.ambientItem.id);
    this._progress('gesto', { conta: 'gestos' });
    return this.fireEvent(name);
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
    return this.started && !s.quietMode && !this.paused && !this.userHidden && !this.fullscreenHidden && !this.suspended && !this.quitting && !this.ghost && !this.lolHidden;
  }

  /**
   * Informação sobre o app em primeiro plano, vinda do detector (apenas um
   * booleano "é Instagram"; títulos não chegam aqui nem são guardados).
   */
  onForeground({ instagram = false, lol = false } = {}) {
    const cfg = this.personality.get().instagram;
    const now = this.clock.now();
    this._onLol(lol, now);
    if (instagram && !this.instagram.inside) this.log('info', 'Instagram em primeiro plano.');
    // A bronca vale em qualquer atividade (animação, rotina, jogo, foco, chat aberto, dormindo…).
    // Só espera o JoJo poder aparecer: fugindo do cursor, escondido ou sendo arrastado,
    // tenta de novo na próxima checagem (1,5 s) em vez de perder a bronca.
    const canShow = this._canNag() && this.avoid.state !== 'fleeing' && this.avoid.state !== 'hidden' && !this.dragging;
    if (!this.instagram.update(now, instagram, cfg, canShow)) return false;
    // Reincidência: a partir da 3ª bronca em 20 min, raiva de verdade (vermelho).
    const angry = (this.instagramScolds || []).filter((t) => now - t < 20 * 60e3).length >= 2;
    if (!this._nag(angry ? 'instagramAngry' : 'instagram', now, { force: true })) {
      this.instagram.lastScold = -Infinity; // não saiu: tenta de novo na próxima checagem
      return false;
    }
    this.instagramScolds = (this.instagramScolds || []).filter((t) => now - t < 20 * 60e3);
    this.instagramScolds.push(now);
    return true;
  }

  /**
   * League of Legends em primeiro plano: mau humor, reclama, dá as costas e some.
   * Volta (emburrado) quando ela fica 20 s fora do LoL. Nunca mexe no jogo.
   */
  _onLol(lol, now) {
    if (lol) this.lolSeenAt = now;
    if (lol && !this.lolHidden && !this.lolLeaving && this.started && !this.userHidden) {
      this.lolLeaving = true;
      this.hideBubble();
      if (this.interaction) this.exitInteraction('lol');
      this.mover.stop();
      this.sayCategory('lolAbriu', { force: true });
      this.react('angry');
      this.clock.setTimeout(() => {
        if (!this.lolLeaving) return;
        this.behavior.request('goodbye', { now: this.clock.now(), force: true });
        this.clock.setTimeout(() => {
          if (!this.lolLeaving) return;
          this.lolLeaving = false;
          this.lolHidden = true;
          this.hideBubble();
          this.overlay.hide();
          this.log('info', 'League of Legends aberto: JoJo saiu de mau humor.');
        }, 1500);
      }, 2600);
      return;
    }
    if (!lol && (this.lolHidden || this.lolLeaving) && now - (this.lolSeenAt || 0) > 20000) this._lolReturn();
  }

  _lolReturn() {
    const wasHidden = this.lolHidden;
    this.lolHidden = false;
    this.lolLeaving = false;
    if (!wasHidden) return;
    this._showAgain();
    // Volta de mau humor: vermelho de raiva e uma fala emburrada.
    this.clock.setTimeout(() => {
      this.sayCategory('lolVoltou', { force: true });
      this.react('angry');
    }, 1600);
  }

  /**
   * Spotify: título "Artista - Música" (ou null parado). Na troca de música,
   * reage no jeito dele com a animação que combina; comenta no máximo a cada 4 min.
   */
  onSpotify(title) {
    const now = this.clock.now();
    const t = title && title.includes(' - ') ? title : null;
    if (t === this.spotifyTitle) return false;
    this.spotifyTitle = t;
    if (!t) {
      this.nowPlaying = null;
      return false;
    }
    const i = t.indexOf(' - ');
    this.nowPlaying = { artista: t.slice(0, i).trim(), musica: t.slice(i + 3).trim(), since: now, vibe: musicVibe(t) };
    if (!this._canNag() || this.interaction || this.lolHidden) return false;
    const it = this.catalogById.get(VIBE_ANIMS[this.nowPlaying.vibe][Math.floor(this.rng() * VIBE_ANIMS[this.nowPlaying.vibe].length)]);
    if (it) this.playCatalog(it.id, { source: 'evento', speak: false });
    if (now - (this.lastMusicTalk || -Infinity) > 4 * 60e3 && !this.store.get().quietMode) {
      this.lastMusicTalk = now;
      const vars = { musica: this.nowPlaying.musica, artista: this.nowPlaying.artista };
      const p = this.phrases.pick(`musica_${this.nowPlaying.vibe}`, (tone) => ({ ...profileVars(this.personality.get(), tone), ...vars })) ||
        this.phrases.pick('musica', (tone) => ({ ...profileVars(this.personality.get(), tone), ...vars }));
      if (p) this.say(p.text, 'speech', { spontaneous: true, category: 'musica' });
    }
    return true;
  }

  // ---------------------------------------------------------------- antitédio

  /** Progressão: XP, conquistas e nível novo viram fala e animação (sem atrapalhar). */
  _progress(kind, { conta = null, missao = null } = {}) {
    const lvl = kind ? this.progress.xp(kind) : null;
    const novas = conta ? this.progress.count(conta) : [];
    const m = missao ? this.progress.missionEvent(missao) : null;
    this._announceProgress({ lvl, novas, missao: m });
  }

  _announceProgress({ lvl = null, novas = [], missao = null } = {}) {
    const msgs = [];
    if (missao) msgs.push(`Missão do dia feita: ${missao.txt}.`);
    for (const q of novas) msgs.push(`Conquista: ${q.nome}!`);
    if (lvl) msgs.push(`Subi pro nível ${lvl.nivel}: ${lvl.nome}. Shape evoluindo.`);
    if (!msgs.length) return;
    this.clock.setTimeout(() => {
      this.say(msgs.join(' '), 'speech');
      if (lvl) this.fireEvent('nivel', { speak: false });
    }, 900);
  }

  /** Item tocou: entra na coleção de poses e alimenta a memória de "curtiu"/"ignorou". */
  _noteSeen(item) {
    if (!item || item.id === 'aviso') return;
    this.lastAmbientItemAt = this.clock.now();
    this.lastAmbientAt = this.clock.now();
    this.progress.log('pose');
    this._announceProgress({ novas: this.progress.seePose(item) });
  }

  /** Rotina/mini-história: põe os passos na fila (fala de cada passo quando ele tocar). */
  _startRoutine(date = new Date()) {
    if (!this.rotinas.length) return false;
    const r = pickRoutine(this.rotinas, this.progress.st.rotinas, { rng: this.rng, period: periodOf(date) });
    if (!r) return false;
    const steps = routineSteps(r, this.progress.st.rotinas, date).filter((p) => this.catalogById.has(p.anim));
    this.progress.save(this.progress.st);
    if (!steps.length) return false;
    this.ambientQueue.push(...steps.map((p) => ({ id: p.anim, fala: p.fala })));
    this.log('info', `Rotina: ${r.nome}`);
    return true;
  }

  /** Próximo da fila (id simples ou {id, fala}). */
  _dequeue() {
    while (this.ambientQueue.length) {
      const q = this.ambientQueue.shift();
      const id = typeof q === 'string' ? q : q.id;
      const it = this.catalogById.get(id);
      if (!it) continue;
      if (q.fala) this.clock.setTimeout(() => this.say(q.fala, 'speech', { spontaneous: true }), 400);
      return it;
    }
    return null;
  }

  /** Tédio do tubarão: tela parada sem novidade → dispara algo novo (respeita as configurações). */
  _boredomTick(now) {
    if (!this.started || !this._canIdleAct() || this.focus || this.store.get().ambienteFrequencia === 'desligado') return false;
    if (now - Math.max(this.lastAmbientAt || 0, this.startedAt || 0) < 6 * 60e3) return false;
    this.lastAmbientAt = now;
    if (this.variety.tickBoredom() < 3) return false;
    if (this.behavior.priority < PRIORITY.AUTO) return false;
    const data = this._pickAmbient();
    return data ? this.behavior.request('ambient', { now, data }) : false;
  }

  // -------- estímulos (stim-friendly)

  /** 💪 Fidget de bíceps: cada clique bomba e o contador sobe. */
  fidget() {
    const n = (this.progress.st.contas.fidget || 0) + 1;
    this._progress(null, { conta: 'fidget', missao: 'fidget' });
    this.playCatalog('fidget', { source: 'comando', speak: false });
    this.hideBubble();
    this.say(`${n}!`, 'speech');
    return n;
  }

  /** ✨ Me dá estímulo: animação surpresa (respeita "sem pesadas" e "sem surpresas"). */
  estimulo() {
    const it = this.variety.pickAmbient({ filter: (x) => !x.mover && !x.especial });
    if (!it) return false;
    this.progress.xp('estimulo');
    this._announceProgress({ missao: this.progress.missionEvent('estimulo') });
    return this.playCatalog(it.id, { source: 'comando' });
  }

  /** Padrão calmante (cardume, cores suaves) por alguns minutos, sem falas. */
  calma(min = 2) {
    this.calmUntil = this.clock.now() + min * 60e3;
    const ok = this._requestCatalog('act', { ...this._catalogData(this.catalogById.get('calma'), 'suave'), ms: min * 60e3 }, this.clock.now(), 'comando');
    this.hideBubble();
    return ok;
  }

  /** Sequência rítmica previsível: marcha e contagem 1-2-3-4 por 30 s. */
  ritmo(sec = 30) {
    if (!this._requestCatalog('act', { ...this._catalogData(this.catalogById.get('ritmo'), 'normal'), ms: sec * 1000 }, this.clock.now(), 'comando')) return false;
    let k = 0;
    const beat = () => {
      if (this.behavior.anim && !/^cat_ritmo/.test(this.behavior.anim)) return;
      this.hideBubble();
      this.say(String((k % 4) + 1), 'thought');
      k++;
      if (k < sec / 1.5) this.clock.setTimeout(beat, 1500);
    };
    beat();
    return true;
  }

  // -------- foco junto (body doubling)

  startFocus(min = 25, tipo = 'estudo') {
    const now = this.clock.now();
    this.focus = { inicio: now, fim: now + min * 60e3, min, tipo, marcas: 0 };
    const c = this.conversations.create({ id: 'foco', title: 'Foco com o JoJo', kind: 'reminder' });
    this.conversations.setStatus(c.id, 'running', `Foco: ${min} min. ${tipo === 'treino' ? 'Treinando junto.' : 'Estudando junto, em silêncio.'}`);
    this._focusAnim(now);
    this.clock.setTimeout(() => this._focusTick(), 60e3);
    return `Foco de ${min} min. ${tipo === 'treino' ? 'Eu treino aqui do lado e marco as séries.' : 'Eu estudo aqui do lado, quieto.'} Sem Instagram.`;
  }

  _focusAnim(now) {
    if (!this.focus) return;
    const id = this.focus.tipo === 'treino' ? 'treinarJunto' : 'estudarJunto';
    this._requestCatalog('act', { ...this._catalogData(this.catalogById.get(id), 'suave'), ms: Math.max(1000, this.focus.fim - now) }, now, 'comando');
  }

  _focusTick() {
    const f = this.focus;
    if (!f) return;
    const now = this.clock.now();
    const left = Math.ceil((f.fim - now) / 60e3);
    if (left <= 0) return this._endFocus(true);
    this.conversations.setStatus('foco', 'running', `Foco: ${left} min restantes.`);
    const passed = Math.floor((now - f.inicio) / 60e3);
    // Marca as séries (treino) ou o tempo (estudo) a cada 5 min, discreto.
    if (passed > 0 && passed % 5 === 0 && this._canNag()) {
      f.marcas++;
      this.say(f.tipo === 'treino' ? `Série ${f.marcas} ✓` : `✓ ${passed} min`, 'thought', { spontaneous: true });
    }
    if (!/^cat_(estudarJunto|treinarJunto)/.test(this.behavior.anim || '') && this.behavior.priority >= PRIORITY.INTERACT) this._focusAnim(now);
    this.clock.setTimeout(() => this._focusTick(), 60e3);
  }

  _endFocus(done) {
    const f = this.focus;
    this.focus = null;
    if (!f) return null;
    if (!done) {
      this.conversations.setStatus('foco', 'idle');
      return 'Foco encerrado. Sem drama.';
    }
    this.conversations.setStatus('foco', 'ready', 'Bloco concluído. Pausa de 5 min.');
    this.progress.log('foco');
    this._progress('foco', { conta: 'foco', missao: 'foco' });
    this.fireEvent('parabens', { speak: false });
    const n = this.progress.st.contas.foco;
    this.say(`Bloco concluído${n > 1 ? ` (${n} no total)` : ''}. Pausa de 5 min: água e alongamento. Eu deixo.`, 'speech');
    this.clock.setTimeout(() => {
      if (this.focus) return;
      this.fireEvent('pausa', { speak: false });
      if (this._canNag()) this.say('Pausa acabou. Mais um bloco? /foco', 'speech', { spontaneous: true });
    }, 5 * 60e3);
    return null;
  }

  // -------- mini-jogos

  /** Começa um mini-jogo (pelo id, nome ou sorteado). Devolve o texto para a conversa. */
  startGame(query = '') {
    if (!this.games) return 'Sem jogos agora.';
    const jogo = (query && (this.games.byId.get(query) || this.games.find(query))) || this.games.random(this.progress.st.jogos.ultimo);
    if (!jogo) return 'Não conheço esse jogo.';
    this.progress.st.jogos.ultimo = jogo.id;
    const r = this.games.start(jogo);
    const g = (this.game = { ...r.game, ate: this.clock.now() + jogo.duracao * 1000, cliques: 0, bolhas: 0 });
    this.progress.log('jogo');
    this._announceProgress({ missao: this.progress.missionEvent('jogo') });
    this.progress.xp('jogoParticipacao');
    // Jogos de clique precisam do modo de interação (o JoJo para de fugir).
    if (['cliques', 'bolhas', 'pega', 'cabo', 'esconde'].includes(g.tipo) && !this.interaction) this.enterInteraction('jogo');
    if (r.sequence) this.ambientQueue.push(...r.sequence.slice(1));
    const first = r.sequence ? r.sequence[0] : r.anim;
    if (first) this.playCatalog(first, { source: 'comando', speak: false });
    if (r.timer === 'reflexo') this.clock.setTimeout(() => this._reflexGo(g), 2000 + this.rng() * 3000);
    this.clock.setTimeout(() => this._gameTimeout(g), jogo.duracao * 1000);
    this._applyLayout(true);
    return r.text;
  }

  _reflexGo(g) {
    if (this.game !== g) return;
    g.goAt = this.clock.now();
    this.hideBubble();
    this.say(g.id === 'corrida' ? 'JÁ!' : 'AGORA!', 'speech');
  }

  _gameTimeout(g) {
    if (this.game !== g) return;
    let text;
    if (g.tipo === 'cliques') text = this._finishGame(g.cliques >= 15, `${g.cliques} cliques em 10 s. ${g.cliques >= 15 ? 'Dedo de campeã.' : 'Dá pra mais.'}`);
    else if (g.tipo === 'bolhas') text = this._finishGame(g.bolhas >= 10, `${g.bolhas} bolhas estouradas. ${g.bolhas >= 10 ? 'Destruidora.' : 'Fracote. Brincadeira.'}`);
    else text = this._finishGame(false, g.tipo === 'pega' || g.tipo === 'esconde' ? 'Tempo! Ganhei. Sou rápido demais.' : 'Acabou o tempo.');
    this.say(text, 'speech');
  }

  _finishGame(win, text, anim = null) {
    this.game = null;
    if (win) {
      this.progress.log('vitoria');
      this._progress('jogoVitoria', { conta: 'vitorias' });
    }
    const a = anim || (win ? 'aplaudir' : 'dancaVitoria');
    this.clock.setTimeout(() => this.playCatalog(a, { source: 'comando', speak: false }), 200);
    this._applyLayout(true);
    return text;
  }

  /** Resposta de texto ao jogo em andamento (ou null se não for jogo de texto). */
  _gameAnswer(text) {
    const g = this.game;
    if (!g || !this.games) return null;
    if (/^(parar|sair|chega|para o jogo|cancelar)\b/i.test(normalizeText(text))) {
      this.game = null;
      return 'Jogo encerrado. Medrosa. Brincadeira.';
    }
    const r = this.games.answer(g, text, { now: this.clock.now() });
    if (r.done) return this._finishGame(!!r.win, r.text, r.anim);
    if (r.anim) this.playCatalog(r.anim, { source: 'comando', speak: false });
    return r.text;
  }

  /** Gesto durante jogo de clique (cliques, bolhas, esconde, pega). true = consumido. */
  _gameGesture(name) {
    const g = this.game;
    if (!g) return false;
    if (name === 'bolha' && g.tipo === 'bolhas') return (g.bolhas++, true);
    if (name === 'clique' && g.tipo === 'cliques') return (g.cliques++, true);
    if (name === 'clique' && (g.tipo === 'esconde' || g.tipo === 'pega')) {
      this.say(this._finishGame(true, g.tipo === 'esconde' ? 'Me achou! Tubarão desse tamanho não se esconde.' : 'Me pegou! Dessa vez.'), 'speech');
      return true;
    }
    return false;
  }

  /** Pega-pega: foge um pouquinho quando o cursor chega perto (modo de interação). */
  _gamePega(now) {
    const g = this.game;
    if (!g || g.tipo !== 'pega' || !this.interaction || this.dragging || this.mover.active) return;
    const r = this._rects();
    if (distPointRect(this.cursor, r.visual) > 50 || now - (g.lastHop || 0) < 1200) return;
    g.lastHop = now;
    const disp = this._currentDisplay();
    if (!disp) return;
    const dir = this.cursor.x > r.visual.x + r.visual.width / 2 ? -1 : 1;
    const to = { x: clamp(this.pos.x + dir * 120, disp.workArea.x, disp.workArea.x + disp.workArea.width - r.box.width), y: this.pos.y };
    this.mover.start(this.pos, to, { speed: 260, easing: 'out', now, kind: 'flee' });
  }

  // -------- conversa: comandos e adaptação

  /** Frases do antitédio no chat. Devolve texto ou null. */
  _antitedioChat(text) {
    const n = normalizeText(text);
    const date = new Date();
    const p = this.progress;
    p.noteHour(date);
    p.log('chat', date);
    this._progress('chat', { conta: 'chat', missao: 'chat' });
    // Gostou/não gostou da última animação ambiente (adaptação).
    const recent = this.ambientItem && this.clock.now() - this.lastAmbientItemAt < 60e3;
    if (recent && /\b(nao gosto dessa|para com isso|chega disso|odeio isso|nao faz mais isso)\b/.test(n)) {
      const id = this.ambientItem.id;
      this.variety.ignore(id);
      const vs = this.variety.state;
      if ((vs.ignored[id] || 0) >= 2) vs.desligadas = [...new Set([...(vs.desligadas || []), id])];
      this.variety.save(vs);
      return `Tá. Menos "${this.ambientItem.nome}" daqui pra frente.`;
    }
    if (recent && /\b(adorei|amei|gostei|faz de novo|de novo|mais uma vez)\b/.test(n)) {
      this.variety.like(this.ambientItem.id);
      if (/de novo|mais uma vez/.test(n)) this.playCatalog(this.ambientItem.id, { source: 'chat', speak: false });
      return 'Óbvio que gostou. Anotado.';
    }
    if (/\bbebi (agua|água)\b/.test(n)) {
      this._announceProgress({ missao: p.missionEvent('agua', date) });
      return 'Boa. Hidratação é treino.';
    }
    if (/\balonguei\b/.test(n)) {
      this._announceProgress({ missao: p.missionEvent('alongar', date) });
      return 'Isso. Corpo agradece.';
    }
    // Dia sem vontade de interagir: fica por perto, quieto.
    if (/\b(hoje (nao|não) (quero|to a fim de) (conversa|papo|falar)|me deixa quiet[ao] hoje|hoje (eu )?quero sossego)\b/.test(n)) {
      p.st.diasQuietos = dayKey(date);
      p.save(p.st);
      return 'Fico por perto. Quieto. Se precisar, tô aqui.';
    }
    // Humor do dia dela muda o ritmo do dia.
    if (/\b(to|tou|estou|t[oô]) (cansad[ao]|exaust[ao]|esgotad[ao]|sem energia)\b/.test(n)) {
      p.st.humorDia = { dia: dayKey(date), modo: 'calmo' };
      p.save(p.st);
    } else if (/\b(to|tou|estou) (animad[ao]|feliz|empolgad[ao]|com energia|pilhad[ao])\b/.test(n)) {
      p.st.humorDia = { dia: dayKey(date), modo: 'pilhado' };
      p.save(p.st);
    }
    // Interesses que ela conta.
    const m = n.match(/\b(eu gosto de|adoro|amo|meu interesse e|curto muito) (.{3,40})$/);
    if (m && !/\bvoce\b|\bvc\b|\bjojo\b/.test(m[2])) {
      const it = m[2].trim();
      p.st.interesses = [...new Set([it, ...(p.st.interesses || [])])].slice(0, 10);
      p.save(p.st);
      return `Anotado: ${it}. Vou lembrar disso.`;
    }
    return null;
  }

  // ---------------------------------------------------------------- Agenda (Google ou iCloud)

  /** Eventos novos da agenda (vindos do main). */
  setCalendar({ events = [], error = null } = {}) {
    this.calendar = { events, error, lastSync: this.clock.now() };
  }

  get agendaConectada() {
    const s = this.store.get();
    return !!(s.agendaUrl && s.agendaAtiva);
  }

  /**
   * A cada minuto: avisa antes de cada compromisso e quando começa, com a
   * animação do tipo (treino, médico, reunião…); resumo do dia na primeira vez
   * de manhã; e, uma única vez, sugere conectar a agenda.
   */
  checkAgenda(date = new Date()) {
    const s = this.store.get();
    if (!this.started) return null;
    if (!s.agendaUrl) {
      // Sugestão (uma vez), depois de 10 min aberto e num momento calmo.
      if (!s.agendaSugerida && this.clock.now() - (this.startedAt || 0) > 10 * 60e3 && this._canNag() && !this.interaction) {
        this.store.update({ agendaSugerida: true });
        this._nag('agendaSugestao', this.clock.now());
        const c = this.conversations.create({ id: 'agenda', title: 'Conectar a agenda', kind: 'reminder' });
        this.conversations.addMessage(c.id, 'jojo', 'Diz "conectar agenda" que eu te guio. Leva um minuto.');
        this.conversations.setStatus(c.id, 'needsInput', 'Diga "conectar agenda" no chat.');
        return 'sugestao';
      }
      return null;
    }
    if (!s.agendaAtiva || !this.calendar.events.length) return null;
    const now = date.getTime();
    const soon = agendaBetween(this.calendar.events, new Date(now - 3 * 60e3), new Date(now + s.agendaAvisoMin * 60e3 + 60e3)).filter((e) => !e.diaInteiro);
    // Resumo do dia: primeira checagem depois das 6h.
    const hoje = dayKey(date);
    if (date.getHours() >= 6 && this.agendaResumoDia !== hoje && this._canNag() && !this.interaction) {
      this.agendaResumoDia = hoje;
      const dia = agendaDoDia(this.calendar.events, date).filter((e) => e.fim > date);
      if (dia.length) {
        const first = dia[0];
        this.say(`Hoje: ${dia.length} compromisso${dia.length > 1 ? 's' : ''}. ${first.diaInteiro ? first.titulo : `O próximo às ${hhmm(first.inicio)}: ${first.titulo}`}.`, 'speech');
        this.fireEvent('lembrete', { speak: false });
        return 'resumo';
      }
    }
    for (const e of soon) {
      const key = `${e.uid || e.titulo}@${e.inicio.getTime()}`;
      const mins = Math.round((e.inicio.getTime() - now) / 60e3);
      const kind = eventKind(e.titulo);
      const vars = { titulo: e.titulo, hora: hhmm(e.inicio), min: String(Math.max(1, mins)) };
      if (mins > 0 && mins <= s.agendaAvisoMin && !this.calendarWarned.has(`${key}:aviso`)) {
        if (!this._canNag() || this.interaction) return null;
        this.calendarWarned.add(`${key}:aviso`);
        this._agendaSay(`agenda_${kind}`, vars, KIND_ANIMS[kind]);
        return 'aviso';
      }
      if (mins <= 0 && mins > -3 && !this.calendarWarned.has(`${key}:inicio`)) {
        if (!this._canNag() || this.interaction) return null;
        this.calendarWarned.add(`${key}:inicio`);
        this.calendarWarned.add(`${key}:aviso`);
        this._agendaSay('agendaComecou', vars, KIND_ANIMS[kind]);
        return 'inicio';
      }
    }
    return null;
  }

  _agendaSay(category, vars, anim) {
    const p = this.phrases.pick(category, (tone) => ({ ...profileVars(this.personality.get(), tone), ...vars }));
    if (p) this.say(p.text, 'speech');
    this.playCatalog(anim, { source: 'evento', speak: false });
  }

  /** Conversa sobre a agenda: guia de conexão, link colado, "o que tenho hoje?". Retorna texto ou null. */
  async _agendaChat(text) {
    const n = normalizeText(text);
    const url = findIcalUrl(text);
    if (url) {
      if (!this.onCalendarConnect) return 'Não consigo conectar agora. Tenta de novo depois.';
      const r = await this.onCalendarConnect(url);
      if (!r || !r.ok) return `Esse link não funcionou${r && r.error ? ` (${r.error})` : ''}. ${/icloud/i.test(url) ? 'Confere se o "Calendário Público" está ligado e se copiou o link inteiro.' : 'Confere se copiou o "Endereço secreto no formato iCal" inteiro.'}`;
      this.conversations.setStatus('agenda', 'idle');
      this.fireEvent('sucesso', { speak: false });
      const hoje = agendaDoDia(this.calendar.events, new Date());
      return `Conectado. Agora eu cobro seus compromissos, ${profileVars(this.personality.get(), 'serio').nome}. Hoje você tem ${hoje.length}. Aviso ${this.store.get().agendaAvisoMin} min antes.`;
    }
    if (/\b(desconecta|desliga|remove|tira)\w* (a |minha |o )?(google |icloud )?(agenda|calendario|icloud)\b|\bdisconnect (my )?calendar\b/.test(n)) {
      this.store.update({ agendaUrl: '' });
      this.setCalendar({ events: [] });
      return 'Agenda desconectada. Agora se vira sozinha.';
    }
    const conectar = /\b(conecta|conectar|integra|integrar|liga|ligar|configura|configurar|vincula|vincular)\w* (a |minha |o |meu |com a |com o |com )?(google |icloud |apple )?(agenda|calendario|google calendar|icloud|calendario do iphone)\b|\bconnect (my )?(google |icloud |apple )?calendar\b/.test(n);
    const icloud = /\b(icloud|iphone|apple|ipad|mac)\b/.test(n);
    if (conectar && icloud) {
      return [
        'iCloud, beleza. É rápido:',
        '1) No iPhone, abre o app Calendário e toca em "Calendários" lá embaixo.',
        '2) Toca no (i) ao lado da agenda que você quer.',
        '3) Liga "Calendário Público" e toca em "Compartilhar Link…" → Copiar.',
        '   (No computador: icloud.com/calendar → ícone de compartilhar ao lado da agenda → "Calendário público" → copiar o link.)',
        '4) Manda o link pra este PC e cola aqui no chat (começa com webcal://).',
        'Aviso: no iCloud o link é público; quem tiver o link vê a agenda. Eu só leio os compromissos.',
      ].join('\n');
    }
    if (conectar && !/\bgoogle\b/.test(n)) {
      return [
        'Bora. Sua agenda é do Google ou do iCloud (iPhone)?',
        'Google: diz "conectar agenda do Google". iCloud: diz "conectar agenda do iCloud".',
        'Eu só leio os compromissos, nada sai deste PC além de buscar a agenda.',
      ].join('\n');
    }
    if (conectar) {
      return [
        'Google, beleza. É rápido:',
        '1) Abre calendar.google.com no navegador e clica na engrenagem → Configurações.',
        '2) Na esquerda, em "Configurações das minhas agendas", clica na sua agenda.',
        '3) Desce até "Integrar agenda" e copia o "Endereço secreto no formato iCal".',
        '4) Cola aqui no chat. Eu só leio os compromissos, nada sai deste PC além de buscar a agenda.',
      ].join('\n');
    }
    if (/\b(o que|oque|que) (eu )?(tenho|tem) (hoje|amanha|pra hoje)\b|\b(minha|a) agenda\b|\bcompromissos?\b|\bproximo compromisso\b|\bwhats? on my calendar\b/.test(n)) {
      if (!this.store.get().agendaUrl) return 'Sua agenda não está conectada. Diz "conectar agenda" que eu te guio.';
      const amanha = /amanha/.test(n);
      const base = new Date();
      const dia = amanha ? new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1, 12) : base;
      const lista = agendaDoDia(this.calendar.events, dia).filter((e) => amanha || e.fim > base);
      if (!lista.length) return amanha ? 'Amanhã está livre. Dia de treino, então.' : 'Nada mais hoje. Sem desculpa pra não treinar.';
      return `${amanha ? 'Amanhã' : 'Hoje'}: ${lista.slice(0, 6).map((e) => `${e.diaInteiro ? 'dia todo' : hhmm(e.inicio)} ${e.titulo}`).join('; ')}.`;
    }
    return null;
  }

  /** Nome do personagem (perfil). */
  get companionName() {
    return profileVars(this.personality.get()).companion;
  }

  /** Bronca/lembrete. `force`: interrompe qualquer atividade (animação, rotina, foco, chat). Retorna se falou. */
  _nag(category, now, { force = false } = {}) {
    if (!this.interaction) {
      this.mover.stop();
      if (this.behavior.state === 'walk') this.behavior.finish('walk', now);
    }
    if (force) this.ambientQueue.length = 0; // rotina/sequência em andamento não atropela a bronca
    this.hideBubble();
    // A reação corporal vem da própria fala (julgamento, dedo em riste…).
    const said = this.sayCategory(category);
    if (force) {
      const p = this.phrases.has(category) ? this.phrases.categories[category] : null;
      const reaction = (p && p.reaction) || 'judge';
      if (STATES[reaction] && this.behavior.state !== reaction) this.behavior.request(reaction, { now, force: true });
    } else if (!said && !this.interaction) this.react('judge');
    // Lembretes (refeições, treino): JoJo com o relógio na mão.
    if (REMINDER_CATS.test(category)) this.fireEvent('lembrete', { speak: false });
    this._schedule(0);
    return said;
  }

  _scheduleReminderCheck(ms = 60000) {
    if (this.reminderTimer) this.clock.clearTimeout(this.reminderTimer);
    this.reminderTimer = this.clock.setTimeout(() => {
      this.reminderTimer = null;
      this.checkDailyReminder(new Date());
      this.checkWeeklyLegends(new Date());
      this.checkHoliday(new Date());
      this.checkAgenda(new Date());
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

  notifyAlreadyRunning(tries = 4) {
    if (this.userHidden) this.setVisible(true);
    // Fugindo do cursor ele não fala: tenta de novo quando a fuga acabar.
    if (!this.sayCategory('alreadyRunning', { force: true }) && tries > 1) this.clock.setTimeout(() => this.notifyAlreadyRunning(tries - 1), 1500);
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
    const vestido = Object.keys(this.outfit).length > 0;
    if (this.costume || vestido) {
      attachments.push({ rect: { x: r.box.x, y: r.box.y - COSTUME_HEADROOM * s.size, width: r.box.width, height: COSTUME_HEADROOM * s.size } });
      // Lanternas penduradas na mão passam do pé.
      attachments.push({ rect: { x: r.box.x, y: r.box.y + r.box.height, width: r.box.width, height: COSTUME_FOOTROOM * s.size } });
    }
    // Jogo de bolhas: espaço em volta do JoJo para as bolhas.
    if (this.game && this.game.tipo === 'bolhas' && this.interaction) {
      const k = s.size;
      attachments.push({ rect: { x: r.box.x - 150 * k, y: r.box.y - 110 * k, width: r.box.width + 300 * k, height: r.box.height + 110 * k } });
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
      // Olhar acompanha o cursor de leve quando está perto (micromovimento).
      gaze: this._gaze(r),
      volume: s.volume ?? 60,
      // Mini-jogo de bolhas: o renderer solta bolhas clicáveis em volta.
      minigame: this.game && this.game.tipo === 'bolhas' && this.interaction ? { tipo: 'bolhas', ate: this.game.ate - now + Date.now() } : null,
      // Acessórios liberados por nível aparecem às vezes (camada extra de variedade).
      layer: this.behavior.state === 'ambient' ? this.layer || null : null,
      mode: this.wired ? 'wired' : null,
      // Roupa do guarda-roupa vale mais que a fantasia da data festiva.
      costume: vestido ? null : this.costume,
      outfit: vestido ? outfitChannels(this.outfit, { semMao: !this._handFree() }) : null,
      // Fantasia ousada (padrão) ou comportada; datas de outras religiões, só comportada.
      sexy: !vestido && !!(this.costume && this.personality.get().festas.estilo === 'ousada' && (!this.holiday || HOLIDAYS[this.holiday].ousada !== false)),
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

  _gaze(r) {
    if (this.store.get().microMovimentos === 'desligado') return null;
    const dx = this.cursor.x - r.head.x;
    const dy = this.cursor.y - r.head.y;
    if (Math.hypot(dx, dy) > 700) return null;
    const x = Math.max(-1, Math.min(1, dx / 350)) * (this.facing >= 0 ? 1 : -1);
    return { x: Math.round(x * 10) / 10, y: Math.round(Math.max(-1, Math.min(1, dy / 300)) * 10) / 10 };
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
