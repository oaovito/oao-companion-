// Métricas do personagem compartilhadas entre o processo principal e o renderer.
// Lidas de assets/character/jeff.rig.json (campo "metrics"); estes valores são
// o fallback caso o asset não informe.

export const DEFAULT_METRICS = Object.freeze({
  box: { width: 180, height: 150 },          // caixa do Jeff (com folga para pulos)
  visual: { x: 20, y: 46, width: 140, height: 100 }, // área visível aproximada (protegida)
  head: { x: 128, y: 78 },                    // ponto da cabeça (olhando para a direita)
});

export function metricsFrom(rig) {
  const m = (rig && rig.metrics) || {};
  return {
    box: { ...DEFAULT_METRICS.box, ...(m.box || {}) },
    visual: { ...DEFAULT_METRICS.visual, ...(m.visual || {}) },
    head: { ...DEFAULT_METRICS.head, ...(m.head || {}) },
  };
}

/** Retângulos absolutos do Jeff para uma posição (canto superior esquerdo da caixa). */
export function jeffRects(metrics, pos, scale, facing = 1) {
  const box = { x: pos.x, y: pos.y, width: metrics.box.width * scale, height: metrics.box.height * scale };
  const vx = facing >= 0 ? metrics.visual.x : metrics.box.width - metrics.visual.x - metrics.visual.width;
  const visual = {
    x: pos.x + vx * scale,
    y: pos.y + metrics.visual.y * scale,
    width: metrics.visual.width * scale,
    height: metrics.visual.height * scale,
  };
  const hx = facing >= 0 ? metrics.head.x : metrics.box.width - metrics.head.x;
  const head = { x: pos.x + hx * scale, y: pos.y + metrics.head.y * scale };
  return { box, visual, head };
}
