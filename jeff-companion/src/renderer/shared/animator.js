// Animador por quadros-chave sobre canais numéricos de pose. Puro (sem DOM),
// usado pelo renderer e pelos testes.

const EASE = {
  linear: (t) => t,
  inOut: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  out: (t) => 1 - (1 - t) * (1 - t),
  in: (t) => t * t,
  step: () => 0,
};

export class Animator {
  constructor(data, { rng = Math.random } = {}) {
    this.data = data;
    this.rng = rng;
    // Estilo global: quadros por segundo escalonados (animação "recorte de papel"),
    // blend e easing padrão.
    this.style = data.style || {};
    this.stepMs = this.style.stepFps ? 1000 / this.style.stepFps : 0;
    this.defaultEase = this.style.defaultEase || 'inOut';
    this.defaults = { ...data.channels };
    this.pose = { ...this.defaults };
    this.current = null;
    this.from = { ...this.defaults };
    this.nextBlink = 0;
    this.blinkStart = -1;
  }

  has(name) {
    return !!this.data.animations[name];
  }

  /** Inicia uma animação, mesclando a partir da pose atual. */
  play(name, now, { restart = false } = {}) {
    const anim = this.data.animations[name] || this.data.animations.idle;
    const key = this.data.animations[name] ? name : 'idle';
    if (this.current && this.current.name === key && !restart) return false;
    this.from = { ...this.pose };
    this.current = { name: key, anim, start: now, blendIn: anim.blendIn ?? this.style.defaultBlendIn ?? 180 };
    return true;
  }

  basePose(anim) {
    const base = (anim.base && this.data.poses[anim.base]) || {};
    return { ...this.defaults, ...base };
  }

  /** Avalia a animação atual em `now`. Retorna {pose, flags}. */
  sample(realNow) {
    if (!this.current) this.play('idle', realNow);
    // Escalonamento: o tempo anda em degraus (ex.: 12 quadros por segundo).
    const now = this.stepMs ? this.current.start + Math.floor((realNow - this.current.start) / this.stepMs) * this.stepMs : realNow;
    const { anim, start, blendIn } = this.current;
    const dur = Math.max(1, anim.duration || 1000);
    let t = (now - start) / dur;
    if (anim.loop) t = ((t % 1) + 1) % 1;
    else t = Math.min(1, Math.max(0, t));
    const target = this.basePose(anim);
    for (const [ch, keys] of Object.entries(anim.tracks || {})) {
      target[ch] = evalTrack(keys, t, target[ch], this.defaultEase);
    }
    // Piscar procedural.
    if (anim.blink) {
      if (now >= this.nextBlink) {
        this.blinkStart = now;
        this.nextBlink = now + 2200 + this.rng() * 4200;
      }
      const bt = (now - this.blinkStart) / 150;
      if (bt >= 0 && bt <= 1) target.eyeOpen *= this.stepMs ? 0 : Math.abs(1 - 2 * bt) * 0.9 + 0.05;
    }
    const k = blendIn > 0 ? Math.min(1, (now - start) / blendIn) : 1;
    const e = this.defaultEase === 'linear' ? k : EASE.inOut(k);
    const pose = {};
    for (const ch of Object.keys(target)) {
      const a = this.from[ch] ?? this.defaults[ch] ?? target[ch];
      pose[ch] = a + (target[ch] - a) * e;
    }
    this.pose = pose;
    return {
      pose,
      name: this.current.name,
      t,
      done: !anim.loop && now - start >= dur,
      flags: { z: !!anim.z, dust: anim.dust || false, sparkle: anim.sparkle || false, mark: anim.mark || null, hearts: !!anim.hearts },
    };
  }

  /**
   * Movimento reduzido: pose fixa e representativa da animação atual (quadro
   * em `anim.staticT`, padrão 0,5), sem piscar e sem transição.
   */
  sampleStatic() {
    if (!this.current) this.play('idle', 0);
    const { anim } = this.current;
    const t = Number.isFinite(anim.staticT) ? anim.staticT : 0.5;
    const pose = this.basePose(anim);
    for (const [ch, keys] of Object.entries(anim.tracks || {})) {
      pose[ch] = evalTrack(keys, t, pose[ch], this.defaultEase);
    }
    this.pose = pose;
    return { pose, name: this.current.name, t, done: true, flags: { z: false, dust: false, sparkle: false, mark: anim.mark || null, hearts: false } };
  }
}

export function evalTrack(keys, t, fallback, defaultEase = 'inOut') {
  if (!keys || !keys.length) return fallback;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ease] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const span = t1 - t0;
      const u = span > 0 ? (t - t0) / span : 1;
      const f = (EASE[ease] || EASE[defaultEase] || EASE.inOut)(u);
      return ease === 'step' ? v0 : v0 + (v1 - v0) * f;
    }
  }
  return keys[keys.length - 1][1];
}
