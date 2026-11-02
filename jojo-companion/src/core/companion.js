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
import { VarietyEngine, periodOf, seasonOf, SLEEP_ANIMS } from './catalog/variety.js';
import { Progress, Games, pickRoutine, routineSteps } from './catalog/antitedio.js';
import { detectIntent, normalizeText, sleepAllowed } from './dialogue/scripted-provider.js';
import { isFactualQuestion } from './dialogue/web-search.js';
import { seguimento } from './dialogue/professor.js';
import { pedidoNegado } from './dialogue/coherence.js';
import { jojoRects, metricsFrom } from './rig-metrics.js';
import { SPEECH_INTERVALS, AMBIENT_WEIGHTS } from './settings-schema.js';
import { PERSONALITY_DEFAULTS, MEALS, InstagramWatcher, dailyReminder, weeklyReminder, phraseFilter, phraseWeight, profileVars, dayKey } from './personality.js';
import { ConversationManager, parseCommand, commandMenu } from './conversations.js';
import { holidayFor, HOLIDAYS } from './holidays.js';
import { findIcalUrl, agendaDoDia, agendaBetween, hhmm, eventKind, KIND_ANIMS, calendarRequest } from './calendar.js';
import { weatherRequest } from './weather.js';
import { interpretar, EXPLICA } from './dialogue/motor-intencoes.js';
import { modoCiencia, RESPOSTA_EMERGENCIA, ABERTURAS } from './ciencia.js';
import { detectComida, detectNamorado, respostaCuidado, comidaVariante, findReacao, reacaoDeContexto, PACOTE_CONFIG } from './pacotes.js';
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
// Resposta longa (explicação, pesquisa): balão mais largo, com rolagem e tempo de leitura de verdade.
export const LONGO_CHARS = 260;
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
// O que ela sente na conversa → expressão do JoJo junto da resposta (sem menu nem comando).
const EMOCAO_CONVERSA = [
  [/\b(que nojo|eca+|nojent\w*)\b/, 'nojo'],
  [/\b(que vergonha|passei vergonha|(to|tou|estou) com vergonha|morri de vergonha)\b/, 'envergonhado'],
  [/\b(que medo|(to|tou|estou) com medo|me assustei|que susto)\b/, 'assustado'],
  [/\b(voce nao vai acreditar|(to|tou|estou|fiquei) chocad\w*|que absurdo)\b/, 'chocado'],
  [/\b(que saco|que raiva|(to|tou|estou) irritad\w*|que odio)\b/, 'irritadoLeve'],
  [/\b((to|tou|estou) nervos\w*|que nervoso)\b/, 'nervoso'],
  [/\b((to|tou|estou) ansios\w*)\b/, 'ansioso'],
  [/\b(que decepcao|(to|tou|estou|fiquei) decepcionad\w*|me decepcion\w*)\b/, 'decepcionado'],
  [/\b(olha (isso|ali|so isso)|ta vendo isso)\b/, 'apontar'],
  [/\b(obrigad\w*|brigad\w*|valeu)\b/, 'agradecer'],
];

const CATALOG_CHAT_INTENTS = new Set(['unknown', 'play', 'gym', 'eat', 'greet', 'howAreYou', 'help', 'name', 'thanks', 'scare', 'pet']);
const REMINDER_CATS = /^(refeicao_|treinoLembrete|foodReminder)/;

const NOD_AFTER = new Set(['foco_parar', 'jogo_parar', 'parar_atividade', 'retomar', 'mostrar', 'silencio_ligar', 'silencio_desligar', 'configuracoes', 'nova_conversa', 'resumo']);

export class Companion {
  constructor({ platform, overlay, clock, store, personality = null, rig = null, room = null, catalog = null, ambientLines = null, variety = null, antitedio = null, phrases = null, dialogue = null, rng = Math.random, log = () => {}, dateNow = () => new Date() }) {
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
    this.reducedMotion = false;
    this.costume = null; // fantasia da data festiva (natal, pascoa…)
    this.dateNow = dateNow; // relógio de parede (regra de sono 6h–21h); injetável nos testes
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
        // Pacotes desligados (ou sem espontâneas) não entram no sorteio.
        const semPacote = this.catalog.itens.filter((it) => it.pacote && (this.reacoesPausadas || !st.pacotesEspontaneos || !st[PACOTE_CONFIG[it.pacote]])).map((it) => it.id);
        return { modo: st.ambienteModo === 'auto' ? (quieto ? 'calmo' : humorDia || 'auto') : st.ambienteModo, surpresas: st.surpresas, desligadas: [...(vs.desligadas || []), ...semPacote], semPesadas: !st.animacoesPesadas, semSono: !this.canSleep() };
      },
    });
    // Antitédio: progressão/coleções, rotinas e mini-jogos (assets/catalog/*.json).
    const at = antitedio || {};
    this.rotinas = (at.rotinas && at.rotinas.rotinas) || [];
    this.games = at.minijogos ? new Games({ data: at.minijogos, rng }) : null;
    this.progress = new Progress({
      data: at.progressao || { niveis: ['Sardinha'], xpPorNivel: 60, xp: {}, acessorios: [], conquistas: [], missoes: [], areas: [] },
      state: this.variety.state.prog,
      save: (st, { immediate = false } = {}) => {
        const previous = this.variety.state.prog;
        this.variety.state.prog = st;
        this.variety.save(this.variety.state);
        if (immediate && variety?.flush?.() === false) {
          this.variety.state.prog = previous;
          throw new Error('Não foi possível confirmar a recompensa no disco.');
        }
      },
      rng,
      now: () => this.clock.now(),
      getQuiet: () => this.feedbackQuiet,
    });
    this.game = null; // mini-jogo em andamento
    this.focus = null; // bloco de foco (body doubling)
    this.calmUntil = 0;
    this.emotionalUntil = 0;
    this.visualContext = 0;
    this.lastAmbientAt = 0;
    this.lastAmbientItemAt = 0;
    // Google Agenda: eventos lidos do endereço iCal (o main busca); avisos já dados.
    this.calendar = { events: [], error: null, lastSync: 0, state: 'disconnected', synced: false };
    this.calendarWarned = new Set();
    this.onCalendarConnect = null; // async (url) => {ok, count, error}
    this.ambientItem = null; // item do catálogo tocando agora (ambiente ou pedido)
    this.ambientQueue = [];
    this.walkTarget = null;

    const s = store.get();
    this.avoid = new AvoidanceController({ margin: s.safetyMargin });
    this.mover = new Mover();
    this.behavior = new BehaviorMachine({ rng, activity: s.activity, getContext: () => this._behaviorContext(), canSleep: () => this.canSleep() });
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
    // Reabriu no Modo Trabalho: volta direto a meditar, sem cumprimento nem animação de chegada.
    const st0 = this.store.get();
    if (st0.trabalhoAtivo && st0.trabalhoRestaurar) {
      this._enterWork(st0.trabalhoPerfil, { silent: true, instant: true });
      return;
    }
    if (st0.trabalhoAtivo) this.store.update({ trabalhoAtivo: false, trabalhoFim: 0 }, { silent: true });
    this.overlay.show();
    this.behavior.request('appear', { now, force: true });
    this._applyLayout(true);
    this._schedule(0);
    this.clock.setTimeout(() => {
      if (this.work) return;
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
    // Nunca anda nem foge para um monitor com app em tela cheia.
    const fs = this.fullscreenIds || [];
    if (fs.length) {
      const livres = list.filter((d) => !fs.includes(String(d.id)));
      if (livres.length) list = livres;
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
    this.visualContext++; this.effect = null; this.ambientQueue.length = 0;
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
    // Modo Trabalho pelas Configurações (ligar/desligar e ajustes ao vivo).
    if (changed.includes('trabalhoAtivo') && this.started) {
      if (settings.trabalhoAtivo && !this.work) this._enterWork(settings.trabalhoPerfil);
      else if (!settings.trabalhoAtivo && this.work) this.endWork();
    } else if (this.work && ['trabalhoPerfil', 'trabalhoCanto', 'trabalhoTamanho', 'trabalhoOpacidade', 'trabalhoMargem'].some((k) => changed.includes(k))) {
      this._enterWork(settings.trabalhoPerfil, { silent: true });
    }
    if (changed.includes('paused')) this.setPaused(settings.paused, { fromSettings: true });
    if (changed.includes('visible')) this.setVisible(settings.visible, { fromSettings: true });
    if (changed.includes('bubbleScale') && this.bubble) this._remeasureBubble();
    if (changed.includes('lolBronca') && !settings.lolBronca) this._lolReturn();
    if (changed.includes('spotifyReacoes') && !settings.spotifyReacoes) this.onSpotify(null);
    this._applyLayout(true);
    this._schedule(0);
  }

  get feedbackQuiet() {
    return !!(this.work || this.focus || this.fullscreenHidden || this.suspended || this.store.get().quietMode || this.clock.now() < (this.emotionalUntil || 0));
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
    if (this.userHidden || this.fullscreenHidden || this.suspended || this.lolHidden || this.workHidden) return;
    const now = this.clock.now();
    this.refreshDisplays();
    this.avoid.reset();
    this.ghost = false;
    this.opacity = this.work ? this._workOpacity() : 1;
    this.overlay.setMouseMode('passthrough');
    this.overlay.show();
    // No Modo Trabalho volta direto a meditar (sem animação de chegada).
    this.behavior.request(this.work ? 'meditate' : 'appear', { now, force: true });
    this._applyLayout(true);
    this._schedule(0);
  }

  /** Recebe do monitor de tela cheia os ids dos monitores ocupados. */
  /**
   * Proteção absoluta de tela cheia: nada do JoJo (corpo, balão, painel, efeito,
   * atividades) aparece no monitor com um app em tela cheia — sem exceção, nem no
   * modo de interação. "hideAll": some de todos os monitores. Nada fica guardado
   * para depois: ao voltar, reaparece normal (ou meditando, no Modo Trabalho).
   */
  setFullscreenDisplays(ids) {
    this.fullscreenIds = (ids || []).map(String);
    const mode = this.store.get().fullscreenBehavior;
    const cur = this._currentDisplay();
    const onMine = !!cur && this.fullscreenIds.includes(String(cur.id));
    const hide = onMine || (mode === 'hideAll' && this.fullscreenIds.length > 0);
    if (hide === this.fullscreenHidden) return;
    this.fullscreenHidden = hide;
    if (hide) {
      this.visualContext++; this.effect = null;
      if (this.interaction) this.exitInteraction('fullscreen');
      this._cancelTimer();
      this.mover.stop();
      this.hideBubble();
      this.overlay.hide();
      this.ambientQueue.length = 0;
      this.fullscreenSince = this.clock.now();
    } else {
      this.ambientQueue.length = 0; // nada de reação acumulada
      this.effect = null;
      this._showAgain();
    }
  }

  // ---------------------------------------------------------------- tick principal

  tick() {
    if (!this.started || this.suspended || this.userHidden || this.fullscreenHidden || this.lolHidden || this.workHidden) return;
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
    else if (this.work) this._workFade();

    this._gamePega(now);
    this.behavior.tick(now);
    this._updateWired(now);
    this._updateSpeech(now);
    if (this.effect && now >= this.effect.until) this.effect = null;
    this._applyLayout();
    this._schedule(this._nextDelay(now));
  }

  _avoidanceEnabled() {
    // Morto no chão (AVC) não foge do cursor; no Modo Trabalho não sai do canto (só fica transparente).
    return !this.work && !this.interaction && !this.dragging && !this.quitting && this.behavior.state !== 'goodbye' && this.behavior.state !== 'avc';
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
    return jojoRects(this.metrics, pos, this._size(), this.facing);
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
    if (kind === 'work' && this.work && this.behavior.state !== 'meditate') this.behavior.request('meditate', { now, force: true });
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
      work: !!this.work,
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
    return !this.work && this.started && !this.paused && !this.userHidden && !this.fullscreenHidden && !this.lolHidden && !this.suspended && !this.quitting && !this.ghost && !this.interaction && !this.dragging;
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
    this.mover.start(this.pos, target, { control, speed: WALK_SPEED * s.moveSpeed * Math.sqrt(s.size) * hurry * (this.needs?.weak ? 0.7 : 1), easing: 'inOut', now, minMs: 600, maxMs: 9000, kind: 'walk' });
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
  say(text, kind = 'speech', { spontaneous = false, category = null, reaction = null, work = false } = {}) {
    if (!this.started || this.userHidden || this.ghost || this.lolHidden) return false;
    // Modo Trabalho: nenhum balão (só a frase curta de entrar/sair do modo).
    if (this.work && !work) return false;
    if (this.fullscreenHidden) return false; // tela cheia: nada aparece
    if (spontaneous && this.bubble) return false;
    // Fala importante (bronca, resposta) ainda sendo medida: a espontânea não passa por cima.
    if (spontaneous && this.clock.now() - (this.importantSayAt ?? -Infinity) < 1500) return false;
    if (!spontaneous) this.importantSayAt = this.clock.now();
    if (spontaneous && this.clock.now() - this.lastSpokeAt < MIN_SPONTANEOUS_GAP[this.store.get().speechFrequency]) return false;
    if (this.avoid.state === 'fleeing' || this.avoid.state === 'hidden') return false;
    // Não abrir balão sobre o cursor.
    const seq = ++this.measureSeq;
    const scale = this.store.get().bubbleScale;
    const longo = text.length > LONGO_CHARS;
    Promise.resolve(this.overlay.measureBubble({ text, kind, scale, longo }))
      .then((size) => {
        if (seq !== this.measureSeq || !size) return;
        const now = this.clock.now();
        const dur = longo ? readingTimeMs(text, { max: 75e3, perChar: 65 }) : readingTimeMs(text) * (kind === 'sleep' ? 0.8 : 1);
        this.bubble = { text, kind, size, category, longo, dur, until: now + dur };
        this.lastSpokeAt = now;
        if (kind === 'speech') {
          this._beginTalking(text, now);
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
    // Também cancela uma medição ainda pendente; ela não pode reaparecer após
    // tela cheia, arraste ou entrada no Modo Trabalho.
    this.measureSeq++;
    this.talkingUntil = 0;
    if (!this.bubble) return;
    this.bubble = null;
    this.bubbleRect = null;
    if (this.behavior.state === 'talk') this.behavior.finish('talk', this.clock.now());
    this._applyLayout(true);
  }

  _beginTalking(text, now = this.clock.now()) {
    const blocked = !this.started || this.work || this.fullscreenHidden || this.userHidden || this.dragging || this.avoid.state === 'fleeing' || this.avoid.state === 'hidden';
    this.talkingUntil = blocked ? 0 : now + Math.min(6000, 500 + String(text).length * 35);
  }

  // ---------------------------------------------------------------- modo de interação

  toggleInteraction(source = 'hotkey') {
    if (this.interaction) this.exitInteraction('toggle');
    else this.enterInteraction(source);
  }

  enterInteraction(source = 'hotkey') {
    if (this.fullscreenHidden) return false; // não abre por cima de tela cheia
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

  // Sem saída por inatividade: o modo de interação só fecha por Esc, pelo botão,
  // pela tela cheia ou por segurança. Fora das regiões interativas o clique atravessa.

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
    if (action === 'play' && this.needs?.ill) { this.say('Hoje a bolinha espera. Primeiro comida e higiene; depois eu volto a brincar.', 'speech'); return false; }
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
    const needs = this.onFeed?.(kind);
    if (needs && !needs.fed) { if (!quiet) this.say(needs.text, 'speech'); return null; }
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
  _protectConversation() {
    this.emotionalUntil = this.clock.now() + 120000;
    this.effect = null; this.layer = null; this.ambientQueue.length = 0; this.nerdUntil = 0;
    this.hideBubble(); this.onConversationGuard?.(); this._applyLayout(true);
  }

  async chat(text, conversationId = null) {
    this.visualContext = (this.visualContext || 0) + 1;
    this.onSceneChat?.(text);
    const conv = this.conversations.current();
    const cmd = parseCommand(text);
    if (cmd) return this.runCommand(cmd, conv.id, text);
    if (!this.dialogue) return null;
    // Segurança não entra na fila atrás de uma geração lenta.
    const urgent = ['crisis', 'distress', 'sad', 'avcReal'].includes(detectIntent(text)) || modoCiencia(text) === 'emergencia';
    if (urgent) this._protectConversation();
    if (urgent && this.chatQueue) {
      this.chatEpoch = (this.chatEpoch || 0) + 1;
      this.dialogue.cancelPending?.();
      const p = this._chat(text, conv, this.chatEpoch);
      this.urgentChat = p;
      try { return await p; }
      finally { if (this.urgentChat === p) this.urgentChat = null; }
    }
    // A mesma mensagem enviada de novo enquanto ele ainda responde (demorou, ela reenviou):
    // não duplica nem começa outra resposta; espera a que já está vindo.
    const chave = `${conv.id}:${normalizeText(text)}`;
    this.chatsPendentes ||= new Map();
    if (this.chatsPendentes.has(chave)) return this.chatsPendentes.get(chave);
    // Um turno por vez: duas mensagens diferentes não podem disputar histórico,
    // assunto, resposta e animação. Comandos continuam imediatos.
    const anterior = this.chatQueue;
    const start = async () => {
      if (this.urgentChat) await this.urgentChat;
      return this._chat(text, conv, this.chatEpoch || 0);
    };
    const p = anterior ? anterior.catch(() => {}).then(start) : this._chat(text, conv, this.chatEpoch || 0);
    this.chatQueue = p;
    this.chatsPendentes.set(chave, p);
    try {
      return await p;
    } finally {
      this.chatsPendentes.delete(chave);
      if (this.chatQueue === p) this.chatQueue = null;
    }
  }

  async _chat(text, conv, epoch = this.chatEpoch || 0) {
    this.noteActivity();
    this.conversations.addMessage(conv.id, 'user', text);
    this.conversations.setStatus(conv.id, 'running');
    await new Promise((r) => this.clock.setTimeout(r, THINK_MS));
    if (epoch !== (this.chatEpoch || 0)) return { cancelled: true, conversationId: conv.id };
    // Mini-jogo em andamento: a mensagem é a jogada (segurança sempre vem antes).
    const intent0 = detectIntent(text);
    const safety = ['crisis', 'distress', 'sad', 'avcReal'].includes(intent0);
    if (safety && this.game) this.game = null;
    // Ela conta que o namorado a magoou: acolher (nada de piada nem de "fala com ele").
    const nam = intent0 === 'avcReal' ? null : detectNamorado(text, { joao: this.personality.get().pessoaApoio || 'João', jaMencionou: !!this.joaoMencionado });
    if (nam && nam.cuidado) {
      this._protectConversation();
      this.nerdUntil = 0;
      this.nerdAbertura = null;
      const nome = profileVars(this.personality.get(), 'serio').nome;
      let t = respostaCuidado({ violencia: nam.violencia, nome });
      if (intent0 === 'crisis') t = `${t} Se pensar em se machucar, liga agora pro CVV 188 ou pro SAMU 192.`;
      this.react('comfort');
      return this._quickReply(conv, t, 'cuidado');
    }
    // Emergência médica: segurança antes de tudo (192), sem óculos nem piada.
    const ciencia = intent0 === 'avcReal' ? null : modoCiencia(text);
    if (ciencia === 'emergencia') {
      this._protectConversation();
      this.nerdUntil = 0;
      this.nerdAbertura = null;
      this.react('comfort');
      return this._quickReply(conv, RESPOSTA_EMERGENCIA, 'emergencia');
    }
    if (!safety && this.todoChat) {
      const reply = this.todoChat.reply(text);
      if (reply) return this._quickReply(conv, reply, 'tarefas');
    }
    if (!safety && this.darkest) {
      const reply = this.darkest.chat(text);
      if (reply) return this._quickReply(conv, reply, 'darkest');
    }
    if (!safety && this.careChat) {
      const reply = this.careChat(text); if (reply) return this._quickReply(conv, reply, 'cuidados');
    }
    if (!safety && ciencia !== 'emergencia' && this.livingChat) {
      const reply = await this.livingChat(text);
      if (epoch !== (this.chatEpoch || 0)) return { cancelled: true, conversationId: conv.id };
      if (reply) return { ...this._quickReply(conv, reply.message, 'encenacao'), scene: { status: reply.status, reason: reply.reason || null, queued: !!reply.queued, itemId: reply.itemId } };
    }
    // Ciência/medicina acadêmica: óculos e dentes de nerd enquanto o assunto durar.
    if (ciencia === 'academico' && this.store.get().cienciaModo && !this.work) {
      const novo = !(this.nerdUntil > this.clock.now());
      this.nerdUntil = this.clock.now() + 3 * 60e3;
      if (novo) {
        this.nerdAbertura = ABERTURAS[Math.floor(this.rng() * ABERTURAS.length) % ABERTURAS.length];
        this.playCatalog('pensando', { source: 'chat', speak: false });
      }
    } else if (ciencia === 'pessoal' || (!ciencia && !seguimento(text))) {
      this.nerdUntil = 0; // não carregar os óculos/abertura técnica para outro assunto
      this.nerdAbertura = null;
    }
    // Ferramentas antes de acoes/pesquisa/modelo. Uma falha nunca vira resposta inventada.
    if (!safety) {
      const lastCity = this.lastTool?.kind === 'weather' && this.clock.now() - this.lastTool.at < 10 * 60e3 ? this.lastTool.city : null;
      const request = weatherRequest(text, { lastCity });
      if (request) {
        const result = !this.store.get().climaAtivo ? { ok: false, code: 'disabled', text: 'A consulta de clima está desligada nas Configurações.' }
          : this.weather ? await this.weather.answer(request, this.store.get().climaCidade)
            : { ok: false, code: 'unavailable', text: 'A ferramenta de clima não está disponível agora. Não tenho uma previsão confirmada.' };
        if (epoch !== (this.chatEpoch || 0)) return { cancelled: true, conversationId: conv.id };
        this.lastTool = { kind: 'weather', city: result.city || request.city || this.store.get().climaCidade, at: this.clock.now() };
        return { ...this._quickReply(conv, result.text, 'weather'), weather: { ok: result.ok, code: result.code || null } };
      }
      const agendaFollowup = this.lastTool?.kind === 'calendar' && /^(e )?(amanha|hoje|essa semana|proxima semana)[?!.,]*$/.test(normalizeText(text));
      const agenda = await this._agendaChat(agendaFollowup ? `minha agenda ${text}` : text);
      if (epoch !== (this.chatEpoch || 0)) return { cancelled: true, conversationId: conv.id };
      if (agenda) {
        this.lastTool = { kind: 'calendar', at: this.clock.now() };
        return this._quickReply(conv, agenda, 'agenda');
      }
    }
    // Revanche: "de novo", "mais uma", "outra" logo depois de um jogo.
    if (!safety && !this.game && this.lastGame && this.clock.now() - this.lastGame.at < 5 * 60e3 && /^(de novo|denovo|mais uma|outra|outra vez|revanche|joga de novo|jogar de novo|bora de novo|again|quero revanche)\b/.test(normalizeText(text))) {
      return this._quickReply(conv, this.startGame(this.lastGame.id), 'jogo');
    }
    // "Lembra daquele assunto de ontem sobre DLS?": procura no que foi conversado (sem fingir memória).
    const lembra = !safety && normalizeText(text).match(/\blembra (d[aoe]s?|daquele|daquela|que|quando)\b.*?\b(sobre|de|do|da) ([a-z0-9 ]{2,40})\??$/);
    if (lembra) return this._quickReply(conv, this._lembrar(lembra[3]), 'memoria');
    // Motor de intenções: ela fala normal; uma mensagem pode ter várias ações, perguntas
    // sobre funções são explicadas, negação não executa e o contexto conta.
    let prefixo = null;
    if (!safety) {
      const it = interpretar(text, { ...this._commandContext(), ultima: this.ultimaAcao || null, pendente: this.pendente || null });
      if (it.cancelado) {
        this.pendente = null;
        return this._quickReply(conv, 'Tá. Deixa como está.', 'comando');
      }
      if (it.explicar) return this._quickReply(conv, this._explicar(it.explicar), 'explicacao');
      if (it.perguntar) return this._quickReply(conv, this._perguntarCurto(it), 'pergunta');
      if (it.acoes.length) {
        this.pendente = null;
        const fb = this.runActions(it.acoes, conv.id);
        if (it.futuro) this.contextoFuturo = it.futuro; // fica de contexto; nada é agendado
        const fala = it.futuro ? `${fb} Quando quiser ajuda com aquilo, é só chamar.` : fb;
        if (!it.resto) return this._quickReply(conv, fala, 'comando');
        prefixo = fala; // e responde a pergunta que veio junto
        text = it.resto;
      }
    }
    // Pacotes: namorado/João, comida, memes e anime pedidos por frase.
    if (!safety) {
      const pk = this._packFromChat(text, nam, intent0);
      if (pk) return this._quickReply(conv, pk.fala, `pacote:${pk.id}`);
    }
    if (this.game) {
      const t = this._gameAnswer(text);
      if (t) return this._quickReply(conv, t, 'jogo');
    }
    if (!safety) {
      const nt = normalizeText(text);
      // Jogo pelo nome ("bora jogar quiz") começa direto; sem nome, o motor de intenções mostra as opções.
      if (this.games && /\b(vamos jogar|bora jogar|quero jogar|joga comigo|um jogo|mini ?jogo)\b/.test(nt) && this.games.find(text)) return this._quickReply(conv, this.startGame(text), 'jogo');
      if (/\b(vamos|bora) focar\b|\bmodo foco\b|\bestuda comigo\b|\btreina comigo\b/.test(nt)) return this._quickReply(conv, this.startFocus(25, /treina/.test(nt) ? 'treino' : 'estudo'), 'foco');
      if (/\bme da (um )?estimulo\b|\bto entediad[ao]\b|\bque tedio\b/.test(nt)) {
        this.estimulo();
        return this._quickReply(conv, 'Toma. Sem tédio no meu turno.', 'estimulo');
      }
      // Brincar de boneca: abre o guarda-roupa (só se ela quiser).
      if (/\b(guarda ?roupa|brincar de boneca|te vestir|vestir voce|vestir vc|trocar (a )?(sua|tua) roupa|mudar (a )?(sua|tua) roupa|escolher (a )?(sua|tua) roupa)\b/.test(nt)) {
        if (this.onOpenApp) this.onOpenApp('guardaRoupa');
        this.playCatalog('seAcharMaximo', { source: 'chat', speak: false });
        return this._quickReply(conv, 'Abri o guarda-roupa na Central. Pode me vestir. Com cuidado com o bíceps.', 'guardaRoupa');
      }
      const at = this._antitedioChat(text);
      if (at) return this._quickReply(conv, at, 'antitedio');
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
    // Expressão do que ela sente ("que nojo", "que vergonha"…) junto da resposta normal.
    let emocao = false;
    if (!safety) {
      const ne = normalizeText(text);
      const em = EMOCAO_CONVERSA.find(([re]) => re.test(ne));
      if (em) emocao = this.playCatalog(em[1], { source: 'chat', speak: false });
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
      this._beginTalking(out);
      this._applyLayout(true);
      return { text: out, action: null, intent: 'animacao', animacao: hit.id, conversationId: conv.id, provider: this.dialogue.describe() };
    }
    let reply;
    // Resposta demorando (internet): mostra que está pensando em vez de ficar parado.
    let thinking = false;
    const thinkTimer = this.clock.setTimeout(() => {
      if (epoch !== (this.chatEpoch || 0)) return;
      thinking = this.say('…', 'thought');
      // Pensando (ou pesquisando, se for pergunta de conhecimento).
      this.fireEvent(isFactualQuestion(text) ? 'pesquisando' : 'pensando', { speak: false });
    }, THINK_BUBBLE_MS);
    try {
      reply = await this.dialogue.reply(text, {
        history: conv.messages.slice(0, -1).filter((m) => m.who === 'user' || m.who === 'jojo').slice(-18).map((m) => ({ role: m.who === 'user' ? 'user' : 'assistant', text: m.text })),
        state: this.behavior.state,
        persona: this.personality.get().instrucoes,
        // Indicação temporária enquanto pesquisa (some quando a resposta chega).
        onStatus: (t) => {
          this.clock.clearTimeout(thinkTimer);
          if (epoch !== (this.chatEpoch || 0)) return;
          thinking = this.say(t, 'thought');
          this.fireEvent('pesquisando', { speak: false });
        },
      });
    } catch (e) {
      this.clock.clearTimeout(thinkTimer);
      if (epoch !== (this.chatEpoch || 0)) return { cancelled: true, conversationId: conv.id };
      this.conversations.setStatus(conv.id, 'blocked', `Falha na conversa: ${e.message}`);
      this.fireEvent('erro', { speak: false });
      return { text: 'Deu erro aqui. Tenta de novo.', error: e.message, conversationId: conv.id, provider: this.dialogue.describe() };
    }
    this.clock.clearTimeout(thinkTimer);
    if (epoch !== (this.chatEpoch || 0)) return { cancelled: true, conversationId: conv.id };
    if (thinking) this.hideBubble();
    // Modo cientista: abre com "Erm, na verdade..." na primeira resposta do assunto.
    if (this.nerdAbertura && reply && reply.text) {
      reply.text = `${this.nerdAbertura} ${reply.text}`;
      this.nerdAbertura = null;
    }
    // Respostas que só saem no meio da animação: "É" no último suspiro (bonita?)
    // e "Passa na cara de uma vez" quando ele oferece o cocô (lol?).
    const delayed = DELAYED_REPLY_MS[reply.action];
    if (delayed) {
      this.noteActivity();
      this._doChatAction(reply.action, this.clock.now());
      await new Promise((r) => this.clock.setTimeout(r, delayed));
      if (epoch !== (this.chatEpoch || 0)) return { cancelled: true, conversationId: conv.id };
    }
    const profile = this.personality.get();
    const vars = profileVars(profile, reply.tone);
    reply.text = reply.text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    if (reply.web || reply.webNotFound || reply.webError) Object.assign(reply, this._webReply(reply, profile));
    // Fontes da pesquisa, discretas no fim da resposta.
    else if (reply.linhaFontes) reply.text = `${reply.text} (${reply.linhaFontes})`;
    if (prefixo) reply.text = `${prefixo} ${reply.text}`;
    this.conversations.addMessage(conv.id, 'jojo', reply.text);
    if (reply.webError) this.conversations.setStatus(conv.id, 'blocked', `Pesquisa na internet falhou (${reply.webError}).`);
    else if (reply.error) this.conversations.setStatus(conv.id, 'blocked', `Conversa online indisponível (${reply.error}); respondi do meu jeito mesmo.`);
    else if (/\?\s*$/.test(reply.text)) this.conversations.setStatus(conv.id, 'needsInput', 'Pergunta esperando resposta.');
    else this.conversations.setStatus(conv.id, 'ready');
    const now = this.clock.now();
    this.noteActivity();
    this._beginTalking(reply.text, now);
    if (delayed) this.say(reply.text, 'speech');
    else if (reply.web) this.fireEvent('respostaPronta', { speak: false });
    // A expressão do que ela sente já está tocando: a resposta só fala junto.
    else if (reply.action && !emocao) this._doChatAction(reply.action, now);
    else this._beginTalking(reply.text, now);
    // A conversa online entendeu um pedido de comando que as frases programadas não pegaram.
    if (reply.command) this.runInterpreted({ cmd: reply.command, arg: reply.commandArg || '' }, conv.id, { silent: true });
    // Ações entendidas pelo modelo local (já validadas pelo registro): o app executa e confirma o resultado real.
    if (reply.acoes && reply.acoes.length) {
      const fb = this.runActions(reply.acoes, conv.id);
      if (fb && fb !== 'Feito.') this.conversations.addMessage(conv.id, 'jojo', fb);
    }
    this._applyLayout(true);
    this._schedule(0);
    return { ...reply, conversationId: conv.id, provider: this.dialogue.describe() };
  }

  /** Versão nova pronta com o JoJo aberto: avisa que já volta (no Modo Trabalho, troca em silêncio). */
  avisarAtualizacao(versao = null) {
    if (!this.started || this.work || this.userHidden) return false;
    this.hideBubble();
    this.playCatalog('acenar', { source: 'comando', speak: false });
    return this.say(`Saiu versão nova${versao ? ` (v${versao})` : ''}. Vou me atualizar. Já volto.`, 'speech');
  }

  /** Busca o assunto nas conversas guardadas (só desta sessão; nada inventado). */
  _lembrar(assunto) {
    const q = normalizeText(assunto).replace(/\b(ontem|hoje|aquele|aquela|assunto|conversa)\b/g, '').trim();
    if (q.length < 2) return 'Lembrar do quê, exatamente?';
    const achadas = [];
    for (const c of this.conversations.list()) {
      const snap = this.conversations.snapshot(c.id);
      for (const m of (snap && snap.messages) || []) if (m.who === 'user' && !/\blembra\b/.test(normalizeText(m.text)) && normalizeText(m.text).includes(q)) achadas.push(m.text);
    }
    if (!achadas.length) return `Não tenho registro de conversa sobre "${assunto.trim()}". Eu só lembro do que foi falado desde que abri; me conta de novo que eu ajudo.`;
    return `Lembro. Você falou: "${achadas[achadas.length - 1].slice(0, 140)}". Continua daí.`;
  }

  /** Explicação de uma função (pergunta ≠ pedido: nada é executado). */
  _explicar(chave) {
    if (chave === 'estadoTamanho') {
      const pct = Math.round(this._size() * 100);
      return this.work ? `Tô no Modo Trabalho: fico pequeno (${pct}%) no canto pra não te atrapalhar.` : `Tô com ${pct}% do tamanho porque você ajustou${this.ultimaAcao && this.ultimaAcao.acao === 'tamanho' ? ' agora há pouco' : ''}. "Volta ao normal" desfaz.`;
    }
    return EXPLICA[chave] || 'Isso eu não sei explicar.';
  }

  /** Pergunta curta quando o pedido é ambíguo; a resposta seguinte resolve. */
  _perguntarCurto(it) {
    if (it.perguntar === 'animacao') {
      const nomes = it.opcoes.map((id) => (this.catalogById.get(id) || {}).nome || id);
      this.pendente = { tipo: 'animacao', opcoes: it.opcoes, nomes };
      return `Qual: ${nomes.join(' ou ')}?`;
    }
    if (it.perguntar === 'espaco') {
      this.pendente = { tipo: 'espaco' };
      return 'Diminuo, mudo de canto ou os dois?';
    }
    if (it.perguntar === 'trabalho') {
      this.pendente = { tipo: 'trabalho' };
      return 'Quer que eu entre no Modo Trabalho e fique quieto no canto?';
    }
    return 'Como assim?';
  }

  /** Estado que dá para desfazer ("não era isso", "volta ao normal"). */
  _foto() {
    const s = this.store.get();
    return { size: s.size, trabalhoTamanho: s.trabalhoTamanho, trabalhoCanto: s.trabalhoCanto, ambienteFrequencia: s.ambienteFrequencia, quietMode: s.quietMode, pos: { ...this.pos }, work: !!this.work };
  }

  _voltarFoto(f) {
    if (!f) return false;
    this.store.update({ size: f.size, trabalhoTamanho: f.trabalhoTamanho, trabalhoCanto: f.trabalhoCanto, ambienteFrequencia: f.ambienteFrequencia, quietMode: f.quietMode });
    if (!this.work && f.pos) this._moveTo(f.pos);
    if (f.work && !this.work) this.startWork();
    if (!f.work && this.work) this.endWork();
    return true;
  }

  _moveTo(to) {
    const now = this.clock.now();
    if (this.reducedMotion) this.pos = { ...to };
    else this.mover.start(this.pos, to, { speed: 260, easing: 'inOut', now, minMs: 300, maxMs: 2500, kind: 'walk' });
    this._applyLayout(true);
    this._schedule(0);
  }

  /** Lugar na tela: canto, esquerda/direita ou longe do cursor. */
  _lugar(lugar) {
    const disp = this._currentDisplay() || this.displays[0];
    const wa = disp.workArea;
    const r = this._rects({ x: 0, y: 0 });
    const m = 16;
    const xEsq = wa.x + m - r.visual.x;
    const xDir = wa.x + wa.width - m - r.visual.width - r.visual.x;
    const yBaixo = wa.y + wa.height - m - r.visual.height - r.visual.y;
    const yCima = wa.y + m - r.visual.y;
    if (lugar === 'longe') return { x: this.cursor.x > wa.x + wa.width / 2 ? xEsq : xDir, y: yBaixo };
    if (lugar === 'esquerda') return { x: xEsq, y: this.pos.y };
    if (lugar === 'direita') return { x: xDir, y: this.pos.y };
    return { x: /Esquerdo$/.test(lugar) ? xEsq : xDir, y: /^superior/.test(lugar) ? yCima : yBaixo };
  }

  /**
   * Executa ações do motor de intenções (já validadas) e devolve o retorno real
   * de cada uma ("Pronto. 80%.", "Não consegui…"). Guarda a última e a foto para desfazer.
   */
  runActions(acoes, conversationId = null) {
    const textos = [];
    for (const a of acoes) {
      const antes = this._foto();
      let t = null;
      const s = this.store.get();
      switch (a.acao) {
        case 'tamanho': {
          const v = a.params.valor;
          const chave = this.work ? 'trabalhoTamanho' : 'size';
          const [lo, hi] = this.work ? [0.2, 1] : [0.6, 1.8];
          const atual = s[chave];
          const novo = v === 'minimo' ? lo : v === 'normal' ? (this.work ? 0.35 : 1) : v === 'maior' ? Math.min(hi, atual * 1.25) : Math.max(lo, atual * 0.8);
          if (Math.abs(novo - atual) < 0.005) t = v === 'maior' ? 'Já tô no máximo.' : v === 'normal' ? 'Já tô no tamanho normal.' : 'Menor que isso não dá.';
          else {
            this.store.update({ [chave]: Math.round(novo * 100) / 100 });
            if (this.work) this._enterWork(this.work.perfil, { silent: true });
            t = `Pronto: ${Math.round((this.work ? s.size * novo : novo) * 100)}%. Melhor assim?`;
          }
          break;
        }
        case 'posicao': {
          const lugar = a.params.lugar || 'inferiorDireito';
          if (this.work) {
            if (/^(inferior|superior)/.test(lugar)) {
              this.store.update({ trabalhoCanto: lugar });
              this._enterWork(this.work.perfil, { silent: true });
            }
            t = 'Fui pro canto.';
          } else {
            this._moveTo(this._lugar(lugar));
            t = lugar === 'longe' ? 'Saí da frente.' : /esquerda|Esquerdo/.test(lugar) ? 'Fui pra esquerda.' : 'Fui pro canto.';
          }
          break;
        }
        case 'animacoes_frequencia': {
          const ordem = ['desligado', 'pouca', 'normal', 'muita'];
          const i = ordem.indexOf(s.ambienteFrequencia);
          const ni = a.params.valor === 'normal' ? 2 : a.params.valor === 'mais' ? Math.min(3, i + 1) : Math.max(0, i - 1);
          this.store.update({ ambienteFrequencia: ordem[ni] });
          t = ni === i ? 'Já tá no limite.' : a.params.valor === 'menos' ? (ni === 0 ? 'Parei com as animações sozinho.' : 'Menos animação daqui pra frente.') : 'Mais animação, então.';
          break;
        }
        case 'animacao': {
          const id = a.params.id;
          const it = this.catalogById.get(id) || this.findCatalog(id);
          if (!it) t = 'Não achei essa animação.';
          else if (it.pacote) t = this.playPack(it.id, { source: 'comando', falar: false }) || 'Agora não.';
          else t = this.playCatalog(it.id, { source: 'comando', speak: false }) ? `${it.nome}. Assiste.` : 'Agora não.';
          break;
        }
        case 'menu_jogos': {
          const jogos = this.games ? this.games.data.jogos : [];
          this.pendente = { tipo: 'jogo' };
          t = `Bora. ${jogos.slice(0, 6).map((j) => j.nome).join(', ')}… Qual? (ou "surpresa")`;
          break;
        }
        case 'reacoes':
          t = this.runCommand('reacao', conversationId, '/reacao').text;
          break;
        case 'restaurar': {
          const u = this.ultimaAcao;
          if (this.work && (!u || u.acao === 'trabalho_iniciar')) t = this.endWork();
          else {
            this.store.update({ size: 1, ambienteFrequencia: 'normal' });
            if (this.work) this.store.update({ trabalhoTamanho: 0.35 });
            t = 'De volta ao normal.';
          }
          break;
        }
        case 'desfazer':
          t = this._voltarFoto(this.fotoAnterior) ? 'Desfeito.' : 'Não tem nada pra desfazer.';
          break;
        case 'jogo':
          t = a.params.nome && /surpresa|qualquer|tanto faz/.test(a.params.nome) ? this.startGame('') : this.startGame(a.params.nome || '');
          break;
        default: {
          // Ações já existentes (Modo Trabalho, foco, pausa, silêncio, telas…).
          const arg = a.acao === 'trabalho_iniciar' ? `${a.params.perfil || ''} ${a.params.min || ''}`.trim() : a.acao === 'foco_iniciar' ? `${a.params.min || 25}${a.params.tipo === 'treino' ? ' treino' : ''}` : a.params.nome || '';
          t = this.runInterpreted({ cmd: a.acao, arg }, conversationId);
        }
      }
      if (a.acao !== 'desfazer') this.fotoAnterior = antes;
      if (a.acao !== 'desfazer' && a.acao !== 'restaurar') this.ultimaAcao = a;
      if (t) textos.push(t);
    }
    return [...new Set(textos)].join(' ') || 'Feito.';
  }

  /** O que está ativo agora (para entender "para", "chega", "volta"…). */
  _commandContext() {
    const anim = this.behavior.anim || '';
    return {
      foco: !!this.focus,
      trabalho: !!this.work,
      jogo: !!(this.game && this.game.tipo !== 'bolhas'),
      bolhas: !!(this.game && this.game.tipo === 'bolhas'),
      calma: /^cat_calma/.test(anim),
      ritmo: /^cat_ritmo/.test(anim),
      pausado: !!this.paused,
      escondido: !!this.userHidden,
      silencio: !!this.store.get().quietMode,
    };
  }

  /** Executa um comando entendido por frase (ou pela conversa online). Devolve a fala. */
  runInterpreted({ cmd, arg = '' }, conversationId = null, { silent = false } = {}) {
    const now = this.clock.now();
    const run = (c, raw) => this.runCommand(c, conversationId, raw).text;
    let text;
    switch (cmd) {
      case 'trabalho_iniciar': {
        const perfil = /deep|profundo/.test(arg) ? 'deep' : /invis/.test(arg) ? 'invisivel' : null;
        text = this.startWork({ perfil, min: Number((String(arg).match(/\d+/) || [0])[0]) });
        break;
      }
      case 'trabalho_parar':
        text = this.endWork() || 'O Modo Trabalho não está ligado.';
        break;
      case 'foco_parar':
        text = this._endFocus(false) || 'Não tem foco rolando.';
        break;
      case 'foco_iniciar':
        text = run('foco', `/foco ${arg}`);
        break;
      case 'jogo':
        text = run('jogo', `/jogo ${arg}`);
        break;
      case 'jogo_parar':
      case 'parar_atividade': {
        const tinha = this.game || this.calmUntil > now || /^cat_(calma|ritmo)/.test(this.behavior.anim || '');
        if (this.game) this.game = null;
        this.calmUntil = 0;
        if (/^cat_(calma|ritmo)/.test(this.behavior.anim || '')) this.behavior.finish(this.behavior.state, now);
        text = tinha ? (cmd === 'jogo_parar' ? 'Jogo encerrado. Medrosa. Brincadeira.' : 'Parei.') : 'Não tem nada rolando.';
        break;
      }
      case 'calma':
      case 'ritmo':
      case 'bolhas':
      case 'estimulo':
      case 'resumo':
      case 'colecao':
        text = run(cmd, `/${cmd}`);
        break;
      case 'guarda_roupa':
        text = run('vestir', '/vestir');
        break;
      case 'pausar':
        this.setPaused(true);
        text = 'Pausado. Fico quietinho.';
        break;
      case 'retomar':
        this.setPaused(false);
        text = 'Voltei.';
        break;
      case 'esconder':
        this.setVisible(false);
        text = `Fui. Diz "volta" ou /pet que eu apareço.`;
        break;
      case 'mostrar':
        this.setVisible(true);
        text = 'Voltei. Sentiu falta, né.';
        break;
      case 'reacoes_pausar':
        // Até ela pedir de volta (ou reabrir o app): nada de reação sozinho nem por contexto.
        this.reacoesPausadas = true;
        text = 'Tá. Sem reações. Vou ficar aqui sendo um tubarão sem graça.';
        break;
      case 'reacoes_voltar':
        this.reacoesPausadas = false;
        text = 'Voltei com tudo. Você pediu.';
        break;
      case 'silencio_ligar':
        this.store.update({ quietMode: true });
        text = 'Modo silencioso. Sem falas sozinho e sem broncas.';
        break;
      case 'silencio_desligar':
        this.store.update({ quietMode: false });
        text = 'Voltei a falar. Se prepara.';
        break;
      case 'configuracoes':
        text = run('settings', '/config');
        break;
      case 'nova_conversa':
        text = run('new', '/nova');
        break;
      default:
        return null;
    }
    // Concorda com a cabeça (as ações com animação própria já se mexem).
    if (!silent && !this.userHidden && !this.paused && NOD_AFTER.has(cmd)) this.behavior.request('nod', { now, force: true });
    return text;
  }

  _quickReply(conv, text, intent) {
    this.conversations.addMessage(conv.id, 'jojo', text);
    this.conversations.setStatus(conv.id, 'ready');
    this._beginTalking(text);
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
    const src = ` (Fonte: ${reply.web.source})`;
    // Caminho degradado (modelo indisponível/rejeitado): não fingir que um
    // recorte da fonte é uma explicação elaborada, nem emendar uma bronca.
    const head = 'Trecho que consegui conferir na fonte: ';
    const tail = '';
    // Resposta longa vai inteira (o balão rola); só corta acima de 1200 caracteres.
    let body = reply.web.extract;
    const room = 1200 - head.length - src.length - tail.length;
    if (body.length > room) body = `${body.slice(0, Math.max(40, room - 1)).replace(/\s+\S*$/, '')}…`;
    return { text: `${head}${body}${src}${tail}`, action: 'lecture', tone: 'serio' };
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
    if (cmd === 'reacao') {
      const packs = this.catalog.itens.filter((it) => it.pacote && !it.leve);
      if (!arg) {
        // Sem menu público: as reações vêm do contexto e da conversa.
        return { text: `Não tem menu, Manu: eu reajo ao que você fala. Ou pede pela cara: "faz uma cara de julgamento".`, command: cmd, conversationId };
      }
      const it = findReacao(packs, arg);
      if (!it) return { text: 'Não conheço essa reação.', command: cmd, conversationId };
      const fala = this.playPack(it.id, { source: 'comando' });
      return { text: fala || 'Agora não.', command: cmd, conversationId };
    }
    if (cmd === 'trabalho') {
      if (/^(sair|parar|fim|terminei|desligar|off)/i.test(arg)) return { text: this.endWork() || 'O Modo Trabalho não está ligado.', command: cmd, conversationId };
      const perfil = /deep|foco profundo|profundo/i.test(arg) ? 'deep' : /invis/i.test(arg) ? 'invisivel' : /trabalho/i.test(arg) ? 'trabalho' : null;
      const min = Number((arg.match(/\d+/) || [0])[0]);
      return { text: this.startWork({ perfil, min: clamp(min, 0, 600) }), command: cmd, conversationId };
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
      return { text: 'A conversa continua aqui. Não apaguei nosso histórico.', command: cmd, conversationId: c.id };
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
    if (this.work || this.fullscreenHidden || this.dragging || this.avoid.state === 'fleeing' || this.avoid.state === 'hidden') return;
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
      const g = this.game;
      g.tentativas = (g.tentativas || 0) + 1;
      if (d > 250) this.clock.setTimeout(() => this.say(this._finishGame(true, `Você venceu o cabo de guerra (${Math.round(d)} px). Braço de campeã.`, null, Math.round(d)), 'speech'), 800);
      else if (g.tentativas >= 3) this.clock.setTimeout(() => this.say(this._finishGame(false, `${Math.round(d)} px. Três tentativas e nada. Eu ganhei.`), 'speech'), 800);
      else {
        const back = { ...this.dragFrom };
        this.clock.setTimeout(() => {
          if (this.game !== g) return;
          this.say(`${Math.round(d)} px. Puxa mais! (${3 - g.tentativas} tentativa${3 - g.tentativas > 1 ? 's' : ''})`, 'speech');
          this.mover.start(this.pos, back, { speed: 220, easing: 'inOut', now: this.clock.now(), kind: 'walk' });
        }, 800);
      }
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
    if (!STATES[name] || this.quitting || this.work || this.fullscreenHidden) return false;
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
  playCatalog(id, { source = 'comando', speak = true, intensity = null } = {}) {
    const item = this.catalogById.get(id);
    if (this.clock.now() < (this.emotionalUntil || 0) && !['chat', 'comando', 'pedido', 'manual'].includes(source)) return false;
    if (!item || this.quitting || !this.started || this.userHidden) return false;
    if (SLEEP_ANIMS.has(id) && !this.canSleep()) return false; // dormir de dia: nunca
    if (this.work) return false; // Modo Trabalho: nenhuma animação
    if (this.fullscreenHidden) return false; // tela cheia: nada aparece nem fica guardado
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
    else ok = this._requestCatalog(source === 'ambiente' ? 'ambient' : 'act', this._catalogData(item, intensity || undefined), now, source);
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
    if (this.clock.now() < (this.emotionalUntil || 0)) return null;
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

  /** Canais da roupa + óculos e dentes de nerd no modo cientista (temporários). */
  _outfitComNerd(vestido) {
    const base = vestido ? outfitChannels(this.outfit, { semMao: !this._handFree() }) : null;
    const s = this.store.get();
    if (!(this.nerdUntil > this.clock.now()) || this.work || !s.cienciaModo) return base;
    const o = { ...(base || {}) };
    if (s.cienciaOculos) {
      delete o.prop_oculos;
      o.prop_oculosNerd = 1;
    }
    if (s.cienciaDentes) o.prop_dentesNerd = 1;
    return Object.keys(o).length ? o : null;
  }

  // ---------------------------------------------------------------- pacotes de reação

  /**
   * Toca uma reação de pacote (animação + fala). Pedido manual ignora raridade,
   * cooldown e pacote desligado; por contexto respeita tudo isso.
   * Devolve a fala (ou null se não tocou).
   */
  playPack(id, { source = 'contexto', falar = true } = {}) {
    const it = this.catalogById.get(id);
    if (!it || !it.pacote) return null;
    const s = this.store.get();
    const manual = source === 'comando';
    const now = this.clock.now();
    this.packSeen = this.packSeen || {};
    if (!manual) {
      if (this.reacoesPausadas || !s[PACOTE_CONFIG[it.pacote]]) return null;
      if (this.packSeen[id] && now - this.packSeen[id] < (it.cooldownMin ?? 10) * 60e3) return null;
      // Reação automática não emenda em outra; o que ela diz no chat sempre tem resposta.
      if (source !== 'chat' && this.lastPackAt && now - this.lastPackAt < 15e3) return null;
    }
    let animId = id;
    let intensity = null;
    if (it.pacote === 'comida') ({ id: animId, intensity } = comidaVariante(id, Math.round(s.comidaNivel)));
    if (this.reducedMotion || !s.animacoesPesadas) intensity = 'suave';
    if (!this.playCatalog(animId, { source: manual || source === 'chat' ? 'comando' : 'chat', speak: false, intensity })) return null;
    this.packSeen[id] = now;
    this.lastPackAt = now;
    // Fala sem repetir a última dessa reação.
    this.packLast = this.packLast || {};
    const opts = it.falas.filter((f) => f !== this.packLast[id]);
    const fala = opts[Math.floor(this.rng() * opts.length) % opts.length] || it.falas[0];
    this.packLast[id] = fala;
    if (falar) this.clock.setTimeout(() => this.say(fala, 'speech', { category: 'pacote' }), 120);
    return fala;
  }

  /** Reação de pacote pedida pela conversa. {id, fala} ou null. */
  _packFromChat(text, nam, intent) {
    if (pedidoNegado(text)) return null;
    const s = this.store.get();
    const tenta = (id) => {
      const fala = this.playPack(id, { source: 'chat', falar: false });
      return fala ? { id, fala } : null;
    };
    if (nam && nam.id) {
      const it = this.catalogById.get(nam.id);
      if (it && (it.pacote !== 'joao' || s.pacoteJoao) && (it.pacote !== 'namorado' || s.pacoteNamorado)) {
        if (nam.id === 'pk_jMencao') this.joaoMencionado = true;
        const r = tenta(nam.id);
        if (r) return r;
      }
    }
    if (s.pacoteComida) {
      const food = detectComida(text);
      if (food) {
        const r = tenta(food);
        if (r) return r;
      }
    }
    // Reação pelo que ela conta ("passei o dia no Instagram", "perdi pro chefe dez vezes").
    const ctxR = reacaoDeContexto(text);
    if (ctxR && this.playPack(ctxR.id, { source: 'chat', falar: false })) return ctxR;
    // Memes/anime citados pelo nome ("side eye", "bankai", "six seven"…).
    const n = normalizeText(text);
    const it = this.catalog.itens.find((x) => x.pacote && !x.leve && (x.pacote === 'memes' || x.pacote === 'anime') && (x.gatilho.frases || []).some((f) => new RegExp(`\\b${normalizeText(f).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(n)));
    if (it) {
      const fala = this.playPack(it.id, { source: 'comando', falar: false });
      if (fala) return { id: it.id, fala };
    }
    // Provocação repetida (2ª em 5 min): o JoJo responde com presença de anime; a 1ª é só raiva.
    if (intent === 'insult') this.insultos = [...(this.insultos || []).filter((t) => this.clock.now() - t < 5 * 60e3), this.clock.now()];
    if (intent === 'insult' && s.pacoteAnime && this.insultos.length >= 2) {
      const ids = ['pk_menacing', 'pk_dominio', 'pk_serio'];
      return tenta(ids[Math.floor(this.rng() * ids.length) % ids.length]);
    }
    return null;
  }

  /** Reação de pacote por evento do app (Instagram, conquista, jogo…); escolhe uma que caiba. */
  packEvent(evento, { falar = true, sobrepor = false } = {}) {
    if (this.work) return null;
    // Não atropela uma reação/animação especial em andamento (só entra com o JoJo à toa).
    if (!sobrepor && (this.behavior.priority <= PRIORITY.INTERACT || this.interaction)) return null;
    const cands = this.catalog.itens.filter((it) => it.pacote && !it.leve && (it.eventos || []).includes(evento));
    if (!cands.length) return null;
    const it = cands[Math.floor(this.rng() * cands.length) % cands.length];
    return this.playPack(it.id, { source: 'contexto', falar });
  }

  // ---------------------------------------------------------------- Modo Trabalho

  /** Tamanho efetivo (menor no Modo Trabalho). */
  _size() {
    const s = this.store.get();
    if (!this.work) return s.size;
    return s.size * s.trabalhoTamanho * (this.work.perfil === 'deep' ? 0.85 : 1);
  }

  _workOpacity() {
    const s = this.store.get();
    return this.work && this.work.perfil === 'deep' ? Math.min(s.trabalhoOpacidade, 0.4) : s.trabalhoOpacidade;
  }

  /** Cursor perto: some quase todo em vez de fugir (não sai do canto, não atrapalha). */
  _workFade() {
    if (!this.work || this.work.perfil === 'invisivel') return;
    const near = distPointRect(this.cursor, this._rects().visual) < this.avoid.cfg.margin;
    const want = near ? 0.1 : this._workOpacity();
    if (this.opacity !== want) this.opacity = want;
  }

  /** Canto escolhido, com margem, no monitor atual. */
  _workCorner() {
    const s = this.store.get();
    const disp = this._currentDisplay() || this.displays[0];
    const r = this._rects({ x: 0, y: 0 });
    const wa = disp.workArea;
    const m = s.trabalhoMargem;
    const right = /Direito$/.test(s.trabalhoCanto);
    const bottom = /^inferior/.test(s.trabalhoCanto);
    // jojoRects: a caixa sai do ponto (0,0); compensa o deslocamento visual.
    const x = right ? wa.x + wa.width - m - r.visual.width - r.visual.x : wa.x + m - r.visual.x;
    const y = bottom ? wa.y + wa.height - m - r.visual.height - r.visual.y : wa.y + m - r.visual.y;
    return { x, y };
  }

  /**
   * Entra no Modo Trabalho: só medita no canto. Nenhuma fala, animação, bronca,
   * lembrete, jogo ou reação até sair (nada fica guardado para depois).
   */
  startWork({ perfil = null, min = 0 } = {}) {
    const s = this.store.get();
    const p = ['trabalho', 'deep', 'invisivel'].includes(perfil) ? perfil : s.trabalhoPerfil;
    this._enterWork(p);
    this.store.update({ trabalhoAtivo: true, trabalhoPerfil: p, trabalhoFim: min > 0 ? Date.now() + min * 60e3 : 0 });
    const c = this.conversations.create({ id: 'trabalho', title: 'Modo Trabalho', kind: 'reminder' });
    this.conversations.setStatus(c.id, 'running', min > 0 ? `Modo Trabalho: ${min} min.` : 'Modo Trabalho ligado.');
    return ['Entendido.', 'Vou ficar quieto.', 'Trabalhe. Eu vigio o silêncio.', 'Finalmente. Produtividade.'][Math.floor(this.rng() * 4) % 4];
  }

  _enterWork(perfil, { silent = false, instant = false } = {}) {
    this.visualContext++;
    const now = this.clock.now();
    this.work = { perfil, desde: now };
    this.onWorkStart?.();
    // Descarta tudo o que estava na fila: nada de reações atrasadas depois.
    this.ambientQueue.length = 0;
    this.game = null;
    this.focus = null;
    this.effect = null;
    this.calmUntil = 0;
    this.nextSpeechAt = Infinity;
    this.mover.stop();
    this.hideBubble();
    if (this.ghost) this._exitGhost(now, true);
    if (perfil === 'invisivel') {
      this.workHidden = true;
      this.overlay.hide();
      return;
    }
    this.workHidden = false;
    this.overlay.show();
    this.opacity = this._workOpacity();
    const to = this._workCorner();
    this.behavior.request('meditate', { now, force: true });
    if (instant || this.reducedMotion) this.pos = to;
    else this.mover.start(this.pos, to, { speed: 160, easing: 'inOut', now, minMs: 900, maxMs: 4000, kind: 'work' });
    if (!silent) this.clock.setTimeout(() => this.work && this.say(['Entendido.', 'Vou ficar quieto.'][0], 'thought', { work: true }), 50);
    this._applyLayout(true);
    this._schedule(0);
  }

  /** Sai do Modo Trabalho: abre os olhos, se espreguiça e volta ao normal. */
  endWork() {
    if (!this.work) return null;
    const now = this.clock.now();
    this.work = null;
    this.onWorkEnd?.();
    this.workHidden = false;
    this.store.update({ trabalhoAtivo: false, trabalhoFim: 0 });
    this.opacity = 1;
    this.ambientQueue.length = 0;
    if (this.conversations.get('trabalho')) this.conversations.setStatus('trabalho', 'idle');
    if (!this.userHidden) this.overlay.show();
    if (this.behavior.state === 'meditate') this.behavior.finish('meditate', now);
    this.behavior.request('workWake', { now, force: true });
    this._scheduleSpeech(now, true);
    this._applyLayout(true);
    this._schedule(0);
    return ['Terminou? Excelente.', 'Finalmente posso voltar a julgar suas decisões.', 'O silêncio foi agradável.', 'Muito bem. Voltei.'][Math.floor(this.rng() * 4) % 4];
  }

  /** Temporizador: no fim só marca na Central (sem som, sem balão, continua meditando). */
  _checkWorkTimer() {
    const fim = this.store.get().trabalhoFim;
    if (!this.work || !fim || Date.now() < fim) return false;
    this.store.update({ trabalhoFim: 0 });
    const c = this.conversations.create({ id: 'trabalho', title: 'Modo Trabalho', kind: 'reminder' });
    this.conversations.setStatus(c.id, 'ready', 'Sessão de trabalho concluída. Diga "terminei de trabalhar" para eu voltar.');
    return true;
  }

  /** Pode dormir agora? Só das 21h às 6h (horário local). */
  canSleep() {
    return sleepAllowed(this.dateNow());
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
      // Poses sem objeto na mão: a peça escolhida aparece na hora (o espelho tomava o lugar dela).
      this.playCatalog(kind === 'surpresa' ? 'orgulhoso' : kind === 'tira' ? 'ajeitarPostura' : 'seAcharMaximo', { source: 'comando', speak: false });
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
    if (pedidoNegado(text)) return null;
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
    return !this.work && this.started && !s.quietMode && !this.paused && !this.userHidden && !this.fullscreenHidden && !this.suspended && !this.quitting && !this.ghost && !this.lolHidden && this.clock.now() >= (this.emotionalUntil || 0);
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
    // Pacotes: a bronca às vezes vem com side eye/demure; reincidente, olhar de anime.
    if (this.rng() < 0.5) this.clock.setTimeout(() => this.packEvent(angry ? 'instagramRepetido' : 'instagram', { falar: false, sobrepor: true }), 400);
    return true;
  }

  /**
   * League of Legends em primeiro plano: mau humor, reclama, dá as costas e some.
   * Volta (emburrado) quando ela fica 20 s fora do LoL. Nunca mexe no jogo.
   */
  _onLol(lol, now) {
    if (this.work) return; // Modo Trabalho: nenhuma reação
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
    this.log('info', `Música tocando (clima: ${this.nowPlaying.vibe}).`); // sem o nome: nada da música vai pro log
    if (!this._canNag() || this.interaction || this.lolHidden) return false;
    this._musicGroove(now, true);
    if (now - (this.lastMusicTalk || -Infinity) > 2 * 60e3 && !this.store.get().quietMode) {
      this.lastMusicTalk = now;
      const vars = { musica: this.nowPlaying.musica, artista: this.nowPlaying.artista };
      const p = this.phrases.pick(`musica_${this.nowPlaying.vibe}`, (tone) => ({ ...profileVars(this.personality.get(), tone), ...vars })) ||
        this.phrases.pick('musica', (tone) => ({ ...profileVars(this.personality.get(), tone), ...vars }));
      if (p) this.say(p.text, 'speech', { spontaneous: true, category: 'musica' });
    }
    return true;
  }

  /**
   * Percepção de tela (opcional): reage, de vez em quando, ao TIPO de app que ela
   * abriu. Nunca em tela cheia nem no Modo Trabalho; nada fica acumulado.
   */
  onAppCategoria(cat) {
    if (cat === this.appCategoria) return false;
    this.appCategoria = cat;
    if (!cat || cat === 'outro' || cat === 'navegador') return false;
    const now = this.clock.now();
    if (this.fullscreenHidden || this.work || !this._canNag() || this.interaction) return false;
    this.categoriaVista = this.categoriaVista || {};
    if (now - (this.categoriaVista[cat] || -Infinity) < 30 * 60e3 || now - (this.lastCategoriaAt || -Infinity) < 5 * 60e3) return false;
    this.categoriaVista[cat] = now;
    this.lastCategoriaAt = now;
    const R = {
      jogo: { anim: 'sabiaQueIaErrar', falas: ['Vai jogar? Treino de dedo também conta. Pouco.', 'Jogo aberto. Vou fingir que é estudo de reflexo.'] },
      video: { pack: 'pk_chillGuy', falas: ['Vídeo? Tá. Eu fico de boa aqui.', 'Sessão de vídeo. Respira entre um e outro.'] },
      escritorio: { pack: 'pk_letHimCook', falas: ['Documento aberto. Deixa cozinhar.', 'Trabalho de verdade. Finalmente.'] },
      codigo: { pack: 'pk_letHimCook', falas: ['Código. Deixa cozinhar.', 'Programando? Sem pressa, sem bug.'] },
      mnelab: { anim: 'pensando', falas: ['O programa do João. Se travar no gráfico, me pergunta.', 'MNE_Lab aberto. A obra do Supremo. Dúvida? Me chama.'] },
    }[cat];
    if (!R) return false;
    if (R.pack) this.playPack(R.pack, { source: 'contexto', falar: false });
    else this.playCatalog(R.anim, { source: 'evento', speak: false });
    this.say(R.falas[Math.floor(this.rng() * R.falas.length) % R.falas.length], 'speech', { spontaneous: true, category: 'percepcao' });
    return true;
  }

  /** Dança/curte a música do clima (na troca de música e a cada ~3 min enquanto toca). */
  _musicGroove(now = this.clock.now(), troca = false) {
    if (!this.nowPlaying || this.work || !this._canNag() || this.interaction || this.lolHidden) return false;
    if (!troca && now - (this.lastGroove || -Infinity) < 3 * 60e3) return false;
    if (!troca && this.behavior.priority <= PRIORITY.INTERACT) return false; // não atropela outra reação
    const lista = VIBE_ANIMS[this.nowPlaying.vibe] || VIBE_ANIMS.calma;
    const id = lista[Math.floor(this.rng() * lista.length) % lista.length];
    if (!this.playCatalog(id, { source: 'evento', speak: false })) return false;
    this.lastGroove = now;
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
    // Pacotes: nível novo → haki/bankai; várias conquistas → arise; conquista → aura farming.
    this.clock.setTimeout(() => this.packEvent(lvl ? 'nivel' : novas.length >= 2 ? 'sequenciaConquistas' : 'conquista', { falar: false }), 2600);
    // Não passa por cima de uma fala com categoria (bronca, lembrete): espera ela acabar.
    let tries = 0;
    const show = () => {
      if (this.bubble && this.bubble.category && tries++ < 10) return this.clock.setTimeout(show, 1500);
      this.say(msgs.join(' '), 'speech');
      if (lvl) this.fireEvent('nivel', { speak: false });
    };
    this.clock.setTimeout(show, 900);
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
    this.visualContext++; this.effect = null; this.ambientQueue.length = 0; this.hideBubble();
    const now = this.clock.now();
    this.focus = { inicio: now, fim: now + min * 60e3, min, tipo, marcas: 0 };
    this.onFocusStart?.();
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
    this.onFocusEnd?.();
    // Para de estudar/treinar do lado na hora.
    if (/^cat_(estudarJunto|treinarJunto)/.test(this.behavior.anim || '')) this.behavior.finish(this.behavior.state, this.clock.now());
    if (!done) {
      this.conversations.setStatus('foco', 'idle');
      return 'Foco encerrado. Sem drama.';
    }
    this.conversations.setStatus('foco', 'ready', 'Bloco concluído. Pausa de 5 min.');
    this.clock.setTimeout(() => this.packEvent('tarefaConcluida', { falar: false }), 2500);
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
    const first = r.sequence ? r.sequence[0] : r.emocao ? g.q.anim : r.anim;
    if (first) this.playCatalog(first, { source: 'comando', speak: false });
    if (r.timer === 'reflexo') this.clock.setTimeout(() => this._reflexGo(g), 2000 + this.rng() * 3000);
    if (g.tipo === 'esconde') this.clock.setTimeout(() => this._hide(g), 1200);
    if (g.tipo === 'cliques') this.clock.setTimeout(() => this.game === g && this.say(`${g.cliques}… mais rápido!`, 'thought'), 5000);
    this.clock.setTimeout(() => this._gameTimeout(g), jogo.duracao * 1000);
    this._applyLayout(true);
    const rec = this._record(jogo.id);
    return rec != null ? `${r.text}\n(Recorde: ${this._fmtRecord(jogo.id, rec)})` : r.text;
  }

  _record(id) {
    const recs = this.progress.st.jogos.recordes || {};
    return recs[id] ?? null;
  }

  _fmtRecord(id, v) {
    const j = this.games && this.games.byId.get(id);
    return j && j.tipo === 'reflexo' ? `${(v / 1000).toFixed(2).replace('.', ',')} s` : String(v);
  }

  /** Guarda o recorde; devolve true se é novo. */
  _saveRecord(id, score, menorMelhor = false) {
    if (score == null) return false;
    const st = this.progress.st.jogos;
    st.recordes = st.recordes || {};
    const old = st.recordes[id];
    if (old != null && (menorMelhor ? score >= old : score <= old)) return false;
    st.recordes[id] = score;
    this.progress.save(this.progress.st);
    return true;
  }

  /** Esconde-esconde: some para um canto longe do cursor, camuflado. */
  _hide(g) {
    if (this.game !== g) return;
    const disp = this._currentDisplay();
    if (!disp) return;
    const r = this._rects();
    const wa = disp.workArea;
    const spots = [
      { x: wa.x + 10, y: wa.y + wa.height - r.box.height },
      { x: wa.x + wa.width - r.box.width - 10, y: wa.y + wa.height - r.box.height },
      { x: wa.x + 10, y: wa.y + 40 },
      { x: wa.x + wa.width - r.box.width - 10, y: wa.y + 40 },
      { x: wa.x + wa.width / 2 - r.box.width / 2, y: wa.y + 40 },
    ];
    spots.sort((a, b) => dist(b, this.cursor) - dist(a, this.cursor));
    const to = spots[Math.floor(this.rng() * 2)];
    this.pos = { x: to.x, y: to.y };
    this.opacity = 0.35; // camuflado
    this.hideBubble();
    this.playCatalog('espiarUmOlho', { source: 'comando', speak: false });
    this._applyLayout(true);
  }

  /** Pega-pega: depois de pego, reaparece em outro lugar. */
  _teleportAway() {
    const disp = this._currentDisplay();
    if (!disp) return;
    const r = this._rects();
    const wa = disp.workArea;
    this.pos = { x: wa.x + this.rng() * Math.max(1, wa.width - r.box.width), y: wa.y + wa.height - r.box.height - this.rng() * Math.max(1, wa.height / 2) };
    this._applyLayout(true);
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
    if (g.tipo === 'cliques') text = this._finishGame(g.cliques >= 15, `${g.cliques} cliques em 10 s. ${g.cliques >= 15 ? 'Dedo de campeã.' : 'Dá pra mais.'}`, null, g.cliques);
    else if (g.tipo === 'bolhas') text = this._finishGame(g.bolhas >= 10, `${g.bolhas} bolhas estouradas. ${g.bolhas >= 10 ? 'Destruidora.' : 'Fracote. Brincadeira.'}`, null, g.bolhas);
    else if (g.tipo === 'pega') text = this._finishGame(false, `Tempo! Me pegou ${g.pegos} de 3. Sou rápido demais.`, null, g.pegos);
    else if (g.tipo === 'esconde') text = this._finishGame(false, 'Tempo! Ganhei. Eu tava bem ali.');
    else if (g.tipo === 'cabo') text = this._finishGame(false, 'Tempo! Eu ganhei o cabo de guerra.');
    else if (['quiz', 'curiosidade', 'emocao', 'mandou'].includes(g.tipo)) text = this._finishGame(g.pontos * 2 > g.total, `Tempo! Placar: ${g.pontos}/${g.total}.`, null, g.pontos);
    else text = this._finishGame(false, 'Acabou o tempo.');
    this.say(text, 'speech');
  }

  _finishGame(win, text, anim = null, score = null, menorMelhor = false) {
    const g = this.game;
    this.game = null;
    if (g && g.tipo === 'esconde') this.opacity = 1;
    if (g) this.lastGame = { id: g.id, at: this.clock.now() };
    if (g && score != null && (win || !menorMelhor) && this._saveRecord(g.id, score, menorMelhor)) text = `${text} Recorde novo: ${this._fmtRecord(g.id, score)}!`;
    // Pacotes: duas derrotas seguidas → "bro is cooked"; vitória perfeita → "antes do GTA 6".
    this.derrotas = win ? 0 : (this.derrotas || 0) + 1;
    if (this.derrotas >= 2) this.clock.setTimeout(() => this.packEvent('derrota', { falar: false }), 1500);
    else if (win && g && g.total && g.pontos === g.total) this.clock.setTimeout(() => this.packEvent('conquistaImprovavel', { falar: false }), 1500);
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
    if (/^(parar|sair|chega|para o jogo|cancelar|desisto)\b/i.test(normalizeText(text))) {
      if (g.tipo === 'esconde') this.opacity = 1;
      this.game = null;
      this.lastGame = { id: g.id, at: this.clock.now() };
      this._applyLayout(true);
      return 'Jogo encerrado. Medrosa. Brincadeira.';
    }
    const r = this.games.answer(g, text, { now: this.clock.now() });
    if (r.done) return this._finishGame(!!r.win, r.text, r.anim, r.score ?? null, !!r.menorMelhor);
    if (r.sequence) {
      this.ambientQueue.push(...r.sequence.slice(1));
      this.playCatalog(r.sequence[0], { source: 'comando', speak: false });
    } else if (r.anim) this.playCatalog(r.anim, { source: 'comando', speak: false });
    return r.text;
  }

  /** Gesto durante jogo de clique (cliques, bolhas, esconde, pega). true = consumido. */
  _gameGesture(name) {
    const g = this.game;
    if (!g) return false;
    if (name === 'bolha' && g.tipo === 'bolhas') return (g.bolhas++, true);
    if (name === 'clique' && g.tipo === 'cliques') return (g.cliques++, true);
    if (name === 'clique' && g.tipo === 'esconde') {
      const s = Math.round((this.clock.now() - (g.ate - (this.games.byId.get(g.id) || {}).duracao * 1000)) / 1000);
      this.say(this._finishGame(true, `Me achou em ${s} s! Tubarão desse tamanho não se esconde.`, null, s, true), 'speech');
      return true;
    }
    if (name === 'clique' && g.tipo === 'pega') {
      g.pegos = (g.pegos || 0) + 1;
      if (g.pegos >= 3) {
        this.say(this._finishGame(true, 'Três! Me pegou. Dessa vez.', null, 3), 'speech');
        return true;
      }
      g.nivel = g.pegos;
      this.say(`${g.pegos}! ${g.pegos === 1 ? 'Sorte.' : 'Última. Agora eu acelero.'}`, 'speech');
      this._teleportAway();
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
    const k = 1 + (g.nivel || 0) * 0.6; // cada pegada, foge mais longe e mais rápido
    const to = { x: clamp(this.pos.x + dir * 120 * k, disp.workArea.x, disp.workArea.x + disp.workArea.width - r.box.width), y: this.pos.y };
    this.mover.start(this.pos, to, { speed: 260 * k, easing: 'out', now, kind: 'flee' });
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
    const afirmaHumor = !/\b(nao|nem|nunca) (to|tou|estou)\b/.test(n);
    if (afirmaHumor && /\b(to|tou|estou|t[oô]) (cansad[ao]|exaust[ao]|esgotad[ao]|sem energia)\b/.test(n)) {
      p.st.humorDia = { dia: dayKey(date), modo: 'calmo' };
      p.save(p.st);
    } else if (afirmaHumor && /\b(to|tou|estou) (animad[ao]|feliz|empolgad[ao]|com energia|pilhad[ao])\b/.test(n)) {
      p.st.humorDia = { dia: dayKey(date), modo: 'pilhado' };
      p.save(p.st);
    }
    // Interesses que ela conta.
    const m = n.match(/\b(eu gosto de|adoro|amo|meu interesse e|curto muito) (.{3,40})$/);
    if (m && !/\b(nao|nem|nunca) (gosto|adoro|amo|curto)\b/.test(n) && !/\bvoce\b|\bvc\b|\bjojo\b/.test(m[2])) {
      const it = m[2].trim();
      p.st.interesses = [...new Set([it, ...(p.st.interesses || [])])].slice(0, 10);
      p.save(p.st);
      return `Anotado: ${it}. Vou lembrar disso.`;
    }
    return null;
  }

  // ---------------------------------------------------------------- Agenda (Google ou iCloud)

  /** Eventos novos da agenda (vindos do main). */
  setCalendar({ events = this.calendar.events, error = null, state = null, lastSync = null, configured = this.calendar.configured || false } = {}) {
    const success = !error && (state === null || ['connected', 'empty'].includes(state));
    this.calendar = { ...this.calendar, events, error, configured,
      state: state || (error ? 'error' : events.length ? 'connected' : 'empty'),
      synced: success || this.calendar.synced,
      lastSync: success ? (lastSync ?? this.dateNow().getTime()) : state === 'configured' ? lastSync ?? this.calendar.lastSync : this.calendar.lastSync };
  }

  get agendaConectada() {
    const s = this.store.get();
    return !!(s.agendaAtiva && (s.agendaUrl || this.calendar.configured) && this.calendar.synced && !this.calendar.error && ['connected', 'empty'].includes(this.calendar.state));
  }

  /**
   * A cada minuto: avisa antes de cada compromisso e quando começa, com a
   * animação do tipo (treino, médico, reunião…); resumo do dia na primeira vez
   * de manhã; e, uma única vez, sugere conectar a agenda.
   */
  checkAgenda(date = new Date()) {
    const s = this.store.get();
    if (!this.started) return null;
    if (!s.agendaUrl && !this.calendar.configured) {
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
    if (!this.agendaConectada || !this.calendar.events.length) return null;
    const now = date.getTime();
    let soon, today;
    try {
      soon = agendaBetween(this.calendar.events, new Date(now - 3 * 60e3), new Date(now + s.agendaAvisoMin * 60e3 + 60e3)).filter((e) => !e.diaInteiro);
      today = agendaDoDia(this.calendar.events, date);
    } catch { this.setCalendar({ state: 'error', error: 'recurrence' }); return null; }
    // Resumo do dia: primeira checagem depois das 6h.
    const hoje = dayKey(date);
    if (date.getHours() >= 6 && this.agendaResumoDia !== hoje && this._canNag() && !this.interaction) {
      this.agendaResumoDia = hoje;
      const dia = today.filter((e) => e.fim > date);
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
    if (/^(?:jojo )?(?:nao|nem|nunca)\b/.test(n) && /\b(conect|desconect|vincul|deslig|remov|apag)\w*\b/.test(n) && /agenda|calendario|icloud/.test(n)) return 'Tá. Não alterei a conexão da agenda.';
    if (url) {
      if (!this.onCalendarConnect) return 'Não consigo conectar agora. Tenta de novo depois.';
      const r = await this.onCalendarConnect(url);
      if (!r || !r.ok) return `Esse link não funcionou. ${r && r.error ? `${r.error} ` : ''}${/icloud/i.test(url) ? 'Confere se o "Calendário Público" está ligado e se copiou o link inteiro.' : 'Confere se copiou o "Endereço secreto no formato iCal" inteiro.'}`;
      this.conversations.setStatus('agenda', 'idle');
      this.fireEvent('sucesso', { speak: false });
      const hoje = agendaDoDia(this.calendar.events, new Date());
      return `Conectado. Agora eu cobro seus compromissos, ${profileVars(this.personality.get(), 'serio').nome}. Hoje você tem ${hoje.length}. Aviso ${this.store.get().agendaAvisoMin} min antes.`;
    }
    if (/\b(desconecta|desliga|remove|tira)\w* (a |minha |o )?(google |icloud )?(agenda|calendario|icloud)\b|\bdisconnect (my )?calendar\b/.test(n)) {
      if (this.onCalendarDisconnect) await this.onCalendarDisconnect();
      else this.store.update({ agendaUrl: '' });
      this.calendar = { events: [], error: null, lastSync: 0, synced: false, state: 'disconnected', configured: false };
      return 'Agenda desconectada. Seus calendários e compromissos foram preservados.';
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
    const query = calendarRequest(text, this.dateNow());
    if (query) {
      if (query.kind === 'invalid') return 'Essa data não existe. Me diga o dia, mês e ano para consultar a agenda certa.';
      if (!this.store.get().agendaUrl && !this.calendar.configured) return 'Sua agenda não está conectada. Diz "conectar agenda" que eu te guio.';
      if (!this.store.get().agendaAtiva) return 'A consulta da agenda está desligada. Reative nas Configurações para eu consultar seus compromissos.';
      const status = query.kind === 'status';
      if (this.calendar.state === 'syncing') return 'Estou sincronizando sua agenda. Ainda não confirmei os compromissos.';
      if (!status && this.onCalendarSync && (!this.calendar.synced || this.dateNow().getTime() - this.calendar.lastSync > 2 * 60e3)) await this.onCalendarSync(query);
      if (this.calendar.error || this.calendar.state === 'error') return `A consulta da agenda falhou. ${this.calendar.error === 'auth' ? 'Confira se o link compartilhado continua disponível.' : 'Não consegui obter uma consulta válida agora.'}${this.calendar.lastSync ? ` Última sincronização válida: ${new Date(this.calendar.lastSync).toLocaleString('pt-BR')}.` : ''} Não vou dizer que está vazia sem confirmar.`;
      if (!this.calendar.synced) return 'A agenda foi configurada, mas ainda não consegui concluir uma sincronização. Não tenho compromissos confirmados.';
      if (status) return `Sua agenda está conectada e a consulta foi concluída. Última sincronização válida: ${new Date(this.calendar.lastSync).toLocaleString('pt-BR')}.`;
      let found;
      try { found = agendaBetween(this.calendar.events, query.from, query.to); }
      catch { return 'Não consegui concluir a leitura das recorrências desse período. Não vou dizer que a agenda está vazia sem uma consulta válida.'; }
      const lista = query.kind === 'next' ? found.filter((e) => e.inicio >= query.from).slice(0, 1) : found;
      if (!lista.length) return `Consultei sua agenda: nenhum compromisso no período ${query.label.toLowerCase()} nos calendários sincronizados.`;
      return `${query.label}: ${lista.slice(0, 12).map((e) => `${query.kind === 'week' || query.kind === 'next' ? e.inicio.toLocaleDateString('pt-BR') + ' ' : ''}${e.diaInteiro ? 'dia todo' : hhmm(e.inicio)} ${e.titulo}`).join('; ')}.${lista.length > 12 ? ` Mais ${lista.length - 12} compromissos no período.` : ''}`;
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
      this.behavior.wakeIfForbidden(this.clock.now()); // 6h: acorda
      this._checkWorkTimer();
      this._musicGroove();
      this.checkDailyReminder(new Date());
      this.checkWeeklyLegends(new Date());
      this.checkHoliday(new Date());
      this.checkAgenda(new Date());
      this.onRoutineTick?.();
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
    const s = { ...this.store.get(), size: this._size() };
    const r = this._rects();
    const disp = this._currentDisplay();
    const wa = disp ? disp.workArea : r.box;
    const attachments = [];
    let toolbar = null;
    let chat = null;
    let bubble = null;
    let needsPanel = null;
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

    if (this.needs && !this.work && !this.focus && !this.fullscreenHidden && !this.lolHidden && !this.suspended) {
      needsPanel = placeAround(r.visual, { width: 210, height: this.needs.objects.length ? 112 : 58 }, wa,
        { order: ['bottom', 'left', 'right', 'top'], avoid: [toolbar?.rect, chat?.rect, bubble?.rect].filter(Boolean), gap: 8 });
      if (!needsPanel.forced) attachments.push(needsPanel); else needsPanel = null;
    }

    // Sem barra de status ao lado do pet: as atividades ficam só na Central.

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
        text: this.bubble.text, kind: this.bubble.kind, longo: !!this.bubble.longo, dur: this.bubble.dur || 0, side: bubble.side, rect: rel(bubble.rect),
        tail: { x: bubble.tail.x - bounds.x, y: bubble.tail.y - bounds.y }, target: { x: r.head.x - bounds.x, y: r.head.y - bounds.y },
        scale: s.bubbleScale,
      } : null,
      toolbar: toolbar ? { rect: rel(toolbar.rect), side: toolbar.side, hotkey: s.interactionHotkey } : null,
      chat: chat ? { rect: rel(chat.rect), provider: this.dialogue ? this.dialogue.describe() : null, name: this.companionName, commands: commandMenu({ petVisible: !this.userHidden }) } : null,
      effect: this.effect ? this.effect.name : null,
      effectKind: this.effect ? this.effect.kind || null : null,
      reducedMotion: this.reducedMotion,
      micro: s.microMovimentos || 'normal',
      // Olhar acompanha o cursor de leve quando está perto (micromovimento).
      gaze: this._gaze(r),
      // Mini-jogo de bolhas: o renderer solta bolhas clicáveis em volta.
      minigame: this.game && this.game.tipo === 'bolhas' && this.interaction ? { tipo: 'bolhas', ate: this.game.ate - now + Date.now() } : null,
      // Acessórios liberados por nível aparecem às vezes (camada extra de variedade).
      layer: this.behavior.state === 'ambient' ? this.layer || null : null,
      mode: this.wired ? 'wired' : null,
      feedbackQuiet: this.feedbackQuiet,
      work: this.work ? this.work.perfil : null,
      // Roupa do guarda-roupa vale mais que a fantasia da data festiva.
      costume: vestido ? null : this.costume,
      outfit: this._outfitComNerd(vestido),
      // Fantasia ousada (padrão) ou comportada; datas de outras religiões, só comportada.
      sexy: !vestido && !!(this.costume && this.personality.get().festas.estilo === 'ousada' && (!this.holiday || HOLIDAYS[this.holiday].ousada !== false)),
      noseDust: this.wired && this.wiredKind === 'snort',
      moving: this.mover.active ? this.mover.kind : null,
      needs: this.needs || null,
      needsPanel: needsPanel ? { rect: rel(needsPanel.rect), ...this.needs, progress: this.progressHud } : null,
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
