// Funções geométricas puras. Todas as coordenadas estão em pixels lógicos (DIP)
// no espaço de tela virtual do Electron (podem ser negativas em multi-monitor).

export function rect(x, y, width, height) {
  return { x, y, width, height };
}

export function right(r) {
  return r.x + r.width;
}

export function bottom(r) {
  return r.y + r.height;
}

export function center(r) {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

export function inflate(r, m) {
  return { x: r.x - m, y: r.y - m, width: r.width + 2 * m, height: r.height + 2 * m };
}

export function union(a, b) {
  if (!a) return b ? { ...b } : null;
  if (!b) return { ...a };
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(right(a), right(b)) - x, height: Math.max(bottom(a), bottom(b)) - y };
}

export function intersection(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(right(a), right(b)) - x;
  const h = Math.min(bottom(a), bottom(b)) - y;
  if (w <= 0 || h <= 0) return null;
  return { x, y, width: w, height: h };
}

export function area(r) {
  return r ? Math.max(0, r.width) * Math.max(0, r.height) : 0;
}

export function overlapArea(a, b) {
  return area(intersection(a, b));
}

export function containsPoint(r, p) {
  return p.x >= r.x && p.x < right(r) && p.y >= r.y && p.y < bottom(r);
}

/** true se `inner` cabe inteiramente em `outer` (com tolerância de meio pixel). */
export function rectInside(inner, outer, eps = 0.5) {
  return inner.x >= outer.x - eps && inner.y >= outer.y - eps &&
    right(inner) <= right(outer) + eps && bottom(inner) <= bottom(outer) + eps;
}

/** Distância euclidiana do ponto até a borda do retângulo (0 se dentro). */
export function distPointRect(p, r) {
  const dx = Math.max(r.x - p.x, 0, p.x - right(r));
  const dy = Math.max(r.y - p.y, 0, p.y - bottom(r));
  return Math.hypot(dx, dy);
}

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Move `r` o mínimo necessário para caber em `bounds` (se for maior, alinha ao topo/esquerda). */
export function clampRectInto(r, bounds) {
  let x = r.x;
  let y = r.y;
  if (x + r.width > right(bounds)) x = right(bounds) - r.width;
  if (y + r.height > bottom(bounds)) y = bottom(bounds) - r.height;
  if (x < bounds.x) x = bounds.x;
  if (y < bounds.y) y = bounds.y;
  return { x, y, width: r.width, height: r.height };
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Ponto em uma curva Bézier quadrática. */
export function quadBezier(p0, c, p1, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
  };
}

/** Comprimento aproximado de uma Bézier quadrática. */
export function quadBezierLength(p0, c, p1, steps = 16) {
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= steps; i++) {
    const p = quadBezier(p0, c, p1, i / steps);
    len += dist(prev, p);
    prev = p;
  }
  return len;
}

export function normalize(v) {
  const l = Math.hypot(v.x, v.y);
  return l > 1e-9 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

export function roundRect(r) {
  return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
}
