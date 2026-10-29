// Movimento do JoJo ao longo de uma curva Bézier quadrática, com easing e
// velocidade. Interrupções/re-planejamentos partem da posição atual.
import { quadBezier, quadBezierLength, clamp } from './geometry.js';

export const EASINGS = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  // Arranque rápido para fuga: velocidade máxima logo no início.
  out: (t) => 1 - Math.pow(1 - t, 2.2),
};

export class Mover {
  constructor() {
    this.active = false;
    this.path = null;
  }

  /**
   * @param from {x,y} posição atual
   * @param to {x,y} destino
   * @param opts {control, speed (px/s), easing, now, minMs, maxMs, kind}
   */
  start(from, to, { control = null, speed = 120, easing = 'inOut', now = 0, minMs = 150, maxMs = 20000, kind = 'walk' } = {}) {
    const c = control || { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const len = quadBezierLength(from, c, to);
    const duration = clamp((len / Math.max(1, speed)) * 1000, minMs, maxMs);
    this.path = { from: { ...from }, to: { ...to }, control: c, start: now, duration, easing, kind, length: len };
    this.active = len >= 0.5;
    return this.path;
  }

  stop() {
    this.active = false;
  }

  get kind() {
    return this.path ? this.path.kind : null;
  }

  get target() {
    return this.path ? this.path.to : null;
  }

  /** Posição em `now` e se o movimento terminou. */
  sample(now) {
    if (!this.path) return null;
    const { from, to, control, start, duration, easing } = this.path;
    const raw = clamp((now - start) / duration, 0, 1);
    const t = (EASINGS[easing] || EASINGS.inOut)(raw);
    const p = raw >= 1 ? { ...to } : quadBezier(from, control, to, t);
    // Direção horizontal instantânea (para virar o personagem).
    const ahead = quadBezier(from, control, to, Math.min(1, t + 0.02));
    const dx = ahead.x - p.x;
    if (raw >= 1) this.active = false;
    return { x: p.x, y: p.y, done: raw >= 1, progress: raw, dx };
  }
}
