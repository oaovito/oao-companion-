// Máquina de estados de comportamento do JoJo.
//
// Prioridades (número menor = mais importante):
//   1 AVOID    — não obstruir o usuário (fuga, modo discreto)
//   2 COMMAND  — comandos explícitos (bandeja, modo de interação, arrastar)
//   3 INTERACT — interações e falas (carinho, comer, brincar, conversar)
//   4 AUTO     — comportamentos autônomos (descansar, olhar, passear, dormir)
//
// Um pedido só interrompe o estado atual se tiver prioridade igual ou maior
// (número <=). Estados com fases (ex.: sentar → sentado → levantar) tocam a fase
// de saída apenas quando terminam naturalmente.

export const PRIORITY = Object.freeze({ AVOID: 1, COMMAND: 2, INTERACT: 3, AUTO: 4 });

const P = PRIORITY;

/**
 * Definições de estados. `phases`: lista de {anim, ms|range|null}. A fase com
 * `loop: true` se repete até o fim do estado (duração em `hold`).
 * `exit`: fase tocada ao terminar naturalmente.
 * `external: true`: o estado termina por chamada externa (finish), ex. andar.
 */
export const STATES = {
  appear: { priority: P.COMMAND, phases: [{ anim: 'appear', ms: 1300 }], next: 'idle' },
  goodbye: { priority: P.COMMAND, phases: [{ anim: 'goodbye', ms: 1400 }], next: 'gone', final: true },
  gone: { priority: P.COMMAND, phases: [{ anim: 'hidden', loop: true }], external: true },
  idle: { priority: P.AUTO, phases: [{ anim: 'idle', loop: true }], hold: [3500, 9000], next: 'auto' },
  lookAround: { priority: P.AUTO, phases: [{ anim: 'lookAround', ms: 2600 }], next: 'idle' },
  curious: { priority: P.AUTO, phases: [{ anim: 'curious', ms: 2200 }], next: 'idle' },
  surprised: { priority: P.INTERACT, phases: [{ anim: 'surprised', ms: 900 }], next: 'idle' },
  walk: { priority: P.AUTO, phases: [{ anim: 'walk', loop: true }], external: true, next: 'idle' },
  sit: {
    priority: P.AUTO,
    phases: [{ anim: 'sitDown', ms: 700 }, { anim: 'sit', loop: true }],
    hold: [6000, 16000],
    exit: { anim: 'standUp', ms: 600 },
    next: 'afterSit',
  },
  lie: {
    priority: P.AUTO,
    phases: [{ anim: 'lieDown', ms: 900 }, { anim: 'lie', loop: true }],
    hold: [5000, 12000],
    next: 'afterLie',
    exit: { anim: 'standUp', ms: 700 },
  },
  sleep: {
    priority: P.AUTO,
    phases: [{ anim: 'fallAsleep', ms: 1400 }, { anim: 'sleep', loop: true }],
    hold: [25000, 70000],
    exit: { anim: 'wake', ms: 1500 },
    next: 'idle',
    sleeping: true,
  },
  // Modo Trabalho: medita no canto (não é sono); só sai quando o modo termina.
  meditate: { priority: P.COMMAND, phases: [{ anim: 'meditate', loop: true }], external: true, next: 'idle' },
  // Saída do Modo Trabalho: abre os olhos e se espreguiça devagar.
  workWake: { priority: P.INTERACT, phases: [{ anim: 'wake', ms: 1500 }], next: 'idle' },
  talk: { priority: P.INTERACT, phases: [{ anim: 'talk', loop: true }], external: true, next: 'idle' },
  happy: { priority: P.INTERACT, phases: [{ anim: 'happy', ms: 1600 }], next: 'idle' },
  petted: { priority: P.INTERACT, phases: [{ anim: 'petted', ms: 2200 }], next: 'happy' },
  eat: { priority: P.INTERACT, phases: [{ anim: 'eat', ms: 2800 }], next: 'happy' },
  play: { priority: P.INTERACT, phases: [{ anim: 'play', ms: 3400 }], next: 'happy' },
  judge: { priority: P.INTERACT, phases: [{ anim: 'judge', ms: 3200 }], next: 'idle' },
  wave: { priority: P.INTERACT, phases: [{ anim: 'wave', ms: 1600 }], next: 'idle' },
  nod: { priority: P.INTERACT, phases: [{ anim: 'nod', ms: 1000 }], next: 'idle' },
  lecture: { priority: P.INTERACT, phases: [{ anim: 'lecture', ms: 2600 }], next: 'idle' },
  comfort: { priority: P.INTERACT, phases: [{ anim: 'comfort', ms: 4500 }], next: 'idle' },
  scare: { priority: P.INTERACT, phases: [{ anim: 'scare', ms: 1500 }], next: 'idle' },
  // PC parado: senta no chão e cheira (ou bebe pré-treino); fica sentado ligadão até a volta.
  snort: { priority: P.INTERACT, phases: [{ anim: 'sitDown', ms: 700 }, { anim: 'snort', ms: 4200 }, { anim: 'sitWired', loop: true }], external: true, next: 'idle' },
  chug: { priority: P.INTERACT, phases: [{ anim: 'sitDown', ms: 700 }, { anim: 'chug', ms: 4200 }, { anim: 'sitWired', loop: true }], external: true, next: 'idle' },
  // Exibição pra Emanuele ver.
  benchPress: { priority: P.INTERACT, phases: [{ anim: 'benchPress', ms: 5200 }], next: 'happy' },
  squat: { priority: P.INTERACT, phases: [{ anim: 'squat', ms: 4400 }], next: 'happy' },
  // "AVC": faz força até ficar vermelho, segura o peito, cai morto 1 min e volta.
  avc: { priority: P.INTERACT, phases: [{ anim: 'avcStrain', ms: 3500 }, { anim: 'avcClutch', ms: 1600 }, { anim: 'avcFall', ms: 900 }, { anim: 'avcDead', ms: 60000 }, { anim: 'avcRevive', ms: 1800 }], next: 'idle' },
  // Mandaram se vestir diferente: dedo do meio.
  finger: { priority: P.INTERACT, phases: [{ anim: 'finger', ms: 2600 }], next: 'idle' },
  // "Eu deveria jogar lol?": caga no chão, pega e oferece.
  poop: { priority: P.INTERACT, phases: [{ anim: 'poop', ms: 7000 }], next: 'idle' },
  // "Eu sou bonita?": olhos de coração, cambaleia, cai de costas (😵), "É" e levanta.
  smitten: { priority: P.INTERACT, phases: [{ anim: 'smitten', ms: 6000 }], next: 'idle' },
  // "Vai tomar no cu": vira de costas, mostra o prolapso rebolando por ~5 s e desvira.
  moon: { priority: P.INTERACT, phases: [{ anim: 'moon', ms: 7400 }], next: 'idle' },
  // Rebolado do meme (de costas, mãos nos joelhos, sem prolapso): 3 s, no foco e às vezes no repouso.
  twerk: { priority: P.INTERACT, phases: [{ anim: 'twerk', ms: 3000 }], next: 'idle' },
  // "Tigresa, tire sua roupa": vira tigresa, rebola, a bermuda voa e ele fica pelado sem pudor.
  tigresa: { priority: P.INTERACT, phases: [{ anim: 'tigresa', ms: 6500 }], next: 'idle' },
  // Pegadinha semanal: consolo gigante cai na cabeça (traumatismo craniano de desenho).
  dildo: { priority: P.INTERACT, phases: [{ anim: 'dildo', ms: 6500 }], next: 'idle' },
  angry: { priority: P.INTERACT, phases: [{ anim: 'angry', ms: 2400 }], next: 'idle' },
  sad: { priority: P.INTERACT, phases: [{ anim: 'sad', ms: 3200 }], next: 'idle' },
  // Animações do catálogo: `act` (pedido, evento, chat) e `ambient` (sorteio enquanto ela trabalha).
  // A animação e a duração vêm em `data` ({anim, ms, loopMs}).
  act: { priority: P.INTERACT, dynamic: true, phases: [{ anim: 'idle', ms: 2000 }], next: 'idle' },
  ambient: { priority: P.AUTO, dynamic: true, phases: [{ anim: 'idle', ms: 2000 }], next: 'idle' },
  interactIdle: { priority: P.COMMAND, phases: [{ anim: 'interactIdle', loop: true }], external: true },
  dragged: { priority: P.COMMAND, phases: [{ anim: 'dragged', loop: true }], external: true, next: 'land' },
  land: { priority: P.COMMAND, phases: [{ anim: 'land', ms: 750 }], next: 'idle' },
  flee: { priority: P.AVOID, phases: [{ anim: 'run', loop: true }], external: true, next: 'idle' },
  hidden: { priority: P.AVOID, phases: [{ anim: 'hide', loop: true }], external: true, next: 'idle' },
  paused: { priority: P.COMMAND, phases: [{ anim: 'sit', loop: true }], external: true, next: 'idle' },
};

// Pesos dos comportamentos autônomos a partir de "idle". O nível de atividade
// (0..1) desloca os pesos entre descanso e movimento.
export function autoWeights(activity, { sleepiness = 0, alert = false } = {}) {
  const a = Math.max(0, Math.min(1, activity));
  const w = {
    idle: 2.2 - a,
    lookAround: 1.4,
    curious: 0.5 + a * 0.4,
    walk: alert ? 0 : 0.4 + a * 2.2,
    sit: 1.4 - a * 0.6,
    lie: 0.6 - a * 0.3 + sleepiness * 0.8,
    sleep: (0.15 + sleepiness * 1.5) * (1.2 - a),
    // Exibições (supino, agachamento): raras, para arrancar um sorriso.
    benchPress: alert ? 0 : 0.12 + a * 0.1,
    squat: alert ? 0 : 0.12 + a * 0.1,
  };
  for (const k of Object.keys(w)) w[k] = Math.max(0, w[k]);
  return w;
}

/** Chance, a cada escolha autônoma do repouso, de virar de costas e rebolar sozinho. */
export const MOON_IDLE_CHANCE = 1e-9;
/** Chance, a cada escolha autônoma do repouso (quando liberado pelo companion), de rebolar 3 s. */
export const TWERK_IDLE_CHANCE = 0.05;

export function weightedPick(weights, rng = Math.random, avoid = []) {
  const entries = Object.entries(weights).map(([k, v]) => [k, avoid.includes(k) ? v * 0.25 : v]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total <= 0) return entries[0][0];
  let r = rng() * total;
  for (const [k, v] of entries) {
    r -= v;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

function pickRange(range, rng) {
  if (!range) return Infinity;
  if (typeof range === 'number') return range;
  return range[0] + (range[1] - range[0]) * rng();
}

export class BehaviorMachine {
  /**
   * @param opts {rng, activity (0..1), onEnter(state, info), getContext()}
   */
  constructor({ rng = Math.random, activity = 0.5, getContext = () => ({}), rareRng = Math.random, canSleep = () => true } = {}) {
    this.rng = rng;
    // Regra de vigília: entre 6h e 21h o estado de sono não existe (ver sleepAllowed).
    this.canSleep = canSleep;
    // Sorteio separado para eventos raríssimos (não mexe na sequência do rng principal).
    this.rareRng = rareRng;
    this.activity = activity;
    this.getContext = getContext;
    this.history = [];
    this.listeners = [];
    this.cur = null;
    this.lastUserInteraction = 0;
  }

  on(fn) {
    this.listeners.push(fn);
  }

  _emit(ev) {
    for (const l of this.listeners) l(ev);
  }

  get state() {
    return this.cur ? this.cur.name : null;
  }

  get anim() {
    return this.cur ? this.cur.anim : null;
  }

  get priority() {
    return this.cur ? this.cur.def.priority : 99;
  }

  get sleeping() {
    return !!(this.cur && this.cur.def.sleeping && this.cur.phaseIndex > 0 && !this.cur.exiting);
  }

  /** Pode iniciar `name` agora (sem efetivar)? */
  /** 6h chegou com ele dormindo: acorda (animação de despertar e volta ao normal). */
  wakeIfForbidden(now = 0) {
    if (!this.cur || !this.cur.def.sleeping || this.canSleep() || this.cur.exiting) return false;
    this._complete(now);
    return true;
  }

  canEnter(name, priority = STATES[name]?.priority) {
    if (!STATES[name]) return false;
    if (!this.cur) return true;
    if (this.cur.def.final && name !== 'gone' && name !== 'appear') return false;
    return priority <= this.cur.def.priority;
  }

  /** Pede uma transição. Retorna true se aceita. */
  request(name, { now = 0, priority, data = null, force = false } = {}) {
    const def = STATES[name];
    if (!def) throw new Error(`Estado desconhecido: ${name}`);
    const prio = priority ?? def.priority;
    if (!force && !this.canEnter(name, prio)) return false;
    this._enter(name, now, data, prio);
    return true;
  }

  _enter(name, now, data, prio) {
    // Sono proibido agora (6h–21h): nenhum caminho entra no estado de sono.
    if (STATES[name].sleeping && !this.canSleep()) {
      name = 'idle';
      data = null;
      prio = undefined;
    }
    const def = STATES[name];
    const prev = this.cur ? this.cur.name : null;
    const hold = pickRange(def.hold, this.rng);
    const anim = def.dynamic && data && data.anim ? data.anim : def.phases[0].anim;
    this.cur = { name, def, prio: prio ?? def.priority, since: now, phaseIndex: 0, phaseStart: now, hold, data, exiting: false, anim };
    this._setPhaseDur(now);
    this.history.push(name);
    if (this.history.length > 12) this.history.shift();
    this._emit({ type: 'enter', state: name, prev, anim: this.cur.anim, data, now });
  }

  _setPhaseDur(now) {
    const ph = this.cur.def.phases[this.cur.phaseIndex];
    if (this.cur.def.dynamic && this.cur.data && this.cur.data.ms) {
      this.cur.phaseEnd = now + this.cur.data.ms;
      return;
    }
    if (ph.loop) {
      const elapsedBefore = now - this.cur.since;
      this.cur.phaseEnd = this.cur.def.external && !this.cur.def.hold ? Infinity : this.cur.since + Math.max(this.cur.hold, elapsedBefore);
    } else {
      this.cur.phaseEnd = now + pickRange(ph.ms, this.rng);
    }
  }

  /** Termina um estado externo (ex.: chegou ao destino da caminhada). */
  finish(name, now = 0) {
    if (!this.cur || this.cur.name !== name) return false;
    this._complete(now);
    return true;
  }

  tick(now) {
    if (!this.cur) return;
    // Laço limitado: transições encadeadas no mesmo tick.
    for (let guard = 0; guard < 6 && this.cur && now >= this.cur.phaseEnd; guard++) {
      const c = this.cur;
      if (c.exiting) {
        this._goNext(now);
        continue;
      }
      if (c.phaseIndex < c.def.phases.length - 1) {
        c.phaseIndex++;
        c.phaseStart = c.phaseEnd;
        c.anim = c.def.phases[c.phaseIndex].anim;
        this._setPhaseDur(now);
        this._emit({ type: 'phase', state: c.name, anim: c.anim, now });
      } else {
        this._complete(now);
      }
    }
  }

  _complete(now) {
    const c = this.cur;
    if (c.def.exit && !c.exiting) {
      c.exiting = true;
      c.anim = c.def.exit.anim;
      c.phaseEnd = now + pickRange(c.def.exit.ms, this.rng);
      this._emit({ type: 'phase', state: c.name, anim: c.anim, now, exiting: true });
      return;
    }
    this._goNext(now);
  }

  _goNext(now) {
    const c = this.cur;
    if (c.def.final) return; // goodbye → fica até ser ocultado externamente
    let next = c.def.next || 'idle';
    const ctx = this.getContext() || {};
    if (next === 'auto') next = this.pickAuto(ctx);
    // Sorteio ambiente (catálogo): o companion escolhe a animação (abaixo).
    else if (next === 'afterSit') next = this.rng() < 0.3 + (ctx.sleepiness || 0) * 0.4 ? 'lie' : 'idle';
    else if (next === 'afterLie') next = this.canSleep() && this.rng() < 0.45 + (ctx.sleepiness || 0) * 0.4 ? 'sleep' : 'idle';
    if (ctx.work && next !== 'meditate') next = 'meditate';
    if (ctx.hasQueue && !ctx.paused && STATES[next].priority >= P.AUTO && next !== 'ambient') next = 'ambient';
    if (next === 'ambient') {
      const data = ctx.pickAmbient ? ctx.pickAmbient() : null;
      if (data && !ctx.paused) {
        this._enter('ambient', now, data);
        return;
      }
      next = 'idle';
    }
    if (ctx.paused && STATES[next].priority >= P.AUTO) next = 'paused';
    this._enter(next, now, null);
    // Pedido de transição autônoma nunca deve ter prioridade maior que AUTO.
  }

  pickAuto(ctx = {}) {
    if (ctx.work) return 'meditate';
    // 1 em 1 bilhão: o "vai tomar no cu" sozinho, sem ninguém pedir.
    if (!ctx.paused && !ctx.alert && this.rareRng() < MOON_IDLE_CHANCE) return 'moon';
    // Rebolado de vez em quando no repouso (o companion libera com intervalo mínimo).
    if (ctx.twerkOk && !ctx.paused && !ctx.alert && this.rng() < TWERK_IDLE_CHANCE) return 'twerk';
    const w = autoWeights(this.activity, ctx);
    if (!this.canSleep()) w.sleep = 0;
    if (ctx.alert) {
      w.walk = 0;
      w.sleep = 0;
      w.lie = 0;
      w.curious += 1.5;
    }
    if (ctx.quiet) w.walk *= 0.6;
    // Ligadão: não para quieto nem dorme.
    if (ctx.wired) {
      w.sleep = 0;
      w.lie = 0;
      w.sit = 0;
      w.walk *= 2.2;
      w.lookAround *= 1.5;
      w.benchPress *= 2;
      w.squat *= 2;
    }
    // Animações ambientes do catálogo (peso vindo das configurações do companion).
    if (ctx.ambientWeight > 0 && !ctx.alert) w.ambient = ctx.ambientWeight;
    const recent = this.history.slice(-3);
    return weightedPick(w, this.rng, recent);
  }
}
