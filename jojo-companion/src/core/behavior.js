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
  angry: { priority: P.INTERACT, phases: [{ anim: 'angry', ms: 2400 }], next: 'idle' },
  sad: { priority: P.INTERACT, phases: [{ anim: 'sad', ms: 3200 }], next: 'idle' },
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
  constructor({ rng = Math.random, activity = 0.5, getContext = () => ({}) } = {}) {
    this.rng = rng;
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
    const def = STATES[name];
    const prev = this.cur ? this.cur.name : null;
    const hold = pickRange(def.hold, this.rng);
    this.cur = { name, def, prio: prio ?? def.priority, since: now, phaseIndex: 0, phaseStart: now, hold, data, exiting: false, anim: def.phases[0].anim };
    this._setPhaseDur(now);
    this.history.push(name);
    if (this.history.length > 12) this.history.shift();
    this._emit({ type: 'enter', state: name, prev, anim: this.cur.anim, data, now });
  }

  _setPhaseDur(now) {
    const ph = this.cur.def.phases[this.cur.phaseIndex];
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
    else if (next === 'afterSit') next = this.rng() < 0.3 + (ctx.sleepiness || 0) * 0.4 ? 'lie' : 'idle';
    else if (next === 'afterLie') next = this.rng() < 0.45 + (ctx.sleepiness || 0) * 0.4 ? 'sleep' : 'idle';
    if (ctx.paused && STATES[next].priority >= P.AUTO) next = 'paused';
    this._enter(next, now, null);
    // Pedido de transição autônoma nunca deve ter prioridade maior que AUTO.
  }

  pickAuto(ctx = {}) {
    const w = autoWeights(this.activity, ctx);
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
    const recent = this.history.slice(-3);
    return weightedPick(w, this.rng, recent);
  }
}
