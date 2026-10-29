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
    // Variações: animações com `variantOf` entram no sorteio da animação-base.
    this.variants = {};
    for (const [key, a] of Object.entries(data.animations)) {
      if (a.variantOf && data.animations[a.variantOf]) (this.variants[a.variantOf] ||= [a.variantOf]).push(key);
    }
    this.lastVariant = {};
    this.mode = null;
  }

  /** Lista de variações da animação (inclui a própria). */
  variantsOf(name) {
    return this.variants[name] || [name];
  }

  /**
   * Sorteia uma variação diferente da última usada. Com `mode` (ex.: 'wired'),
   * prefere as variações daquele modo; sem modo, ignora as variações de modo.
   */
  _pickVariant(name, mode = this.mode) {
    const all = this.variantsOf(name);
    const A = this.data.animations;
    const inMode = mode ? all.filter((k) => A[k].mode === mode) : [];
    const list = inMode.length ? inMode : all.filter((k) => !A[k].mode);
    if (list.length <= 1) return list[0] || name;
    const options = list.filter((k) => k !== this.lastVariant[name]);
    const key = options[Math.floor(this.rng() * options.length) % options.length];
    this.lastVariant[name] = key;
    return key;
  }

  has(name) {
    return !!this.data.animations[name];
  }

  /**
   * Inicia uma animação, mesclando a partir da pose atual. `name` é a animação
   * pedida (base); a variação sorteada fica em `current.variant`.
   */
  play(name, now, { restart = false, variant = null, mode } = {}) {
    const key = this.data.animations[name] ? name : 'idle';
    if (mode !== undefined) this.mode = mode;
    if (this.current && this.current.name === key && !restart) return false;
    const v = variant && this.variantsOf(key).includes(variant) ? variant : this._pickVariant(key);
    const anim = this.data.animations[v];
    this.from = { ...this.pose };
    this.current = { name: key, variant: v, anim, start: now, blendIn: anim.blendIn ?? this.style.defaultBlendIn ?? 180 };
    return true;
  }

  basePose(anim) {
    const base = (anim.base && this.data.poses[anim.base]) || {};
    return { ...this.defaults, ...base };
  }

  /** Avalia a animação atual em `now`. Retorna {pose, flags}. */
  sample(realNow) {
    if (!this.current) this.play('idle', realNow);
    // Animações que repetem trocam de variação a cada `rotate` ciclos.
    const cur = this.current;
    const rotate = this.data.animations[cur.name].rotate;
    if (rotate && cur.anim.loop && this.variantsOf(cur.name).length > 1 && realNow - cur.start >= rotate * Math.max(1, cur.anim.duration || 1000)) {
      this.play(cur.name, realNow, { restart: true });
    }
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
      flags: { z: !!anim.z, dust: anim.dust || false, sparkle: anim.sparkle || false, mark: anim.mark || null, hearts: !!anim.hearts, sweat: !!anim.sweat, stink: !!anim.stink, fx: anim.fx || null },
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
