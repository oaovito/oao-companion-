// Posicionamento de anexos (balão, barra de ações, painel de conversa) em torno
// do JoJo, respeitando a área útil do monitor. Puro.
import { rectInside, clampRectInto, overlapArea, union, right, bottom } from './geometry.js';

const GAP = 6;

/**
 * Posiciona um retângulo de tamanho `size` ao redor de `anchor` (retângulo do JoJo).
 * Tenta os lados em ordem; usa o primeiro que caiba sem sobrepor `avoid`.
 * @returns {{rect, side, tail:{x,y}}} tail = ponto (absoluto) para onde a cauda aponta.
 */
export function placeAround(anchor, size, workArea, { order = ['top', 'right', 'left', 'bottom'], avoid = [], gap = GAP, tailTarget = null } = {}) {
  const target = tailTarget || { x: anchor.x + anchor.width / 2, y: anchor.y + anchor.height * 0.3 };
  const attempts = [];
  for (const side of order) {
    let r;
    switch (side) {
      case 'top':
        r = { x: target.x - size.width / 2, y: anchor.y - size.height - gap, ...size };
        break;
      case 'bottom':
        r = { x: target.x - size.width / 2, y: bottom(anchor) + gap, ...size };
        break;
      case 'left':
        r = { x: anchor.x - size.width - gap, y: target.y - size.height * 0.75, ...size };
        break;
      case 'right':
      default:
        r = { x: right(anchor) + gap, y: target.y - size.height * 0.75, ...size };
        break;
    }
    // Desliza ao longo da borda para caber no monitor, mantendo o lado; se bater
    // num obstáculo (barra, painel), pula para depois dele no mesmo lado.
    let slid = slideAlong(r, side, workArea);
    for (let k = 0; k < 4; k++) {
      const hit = avoid.find((a) => a && overlapArea(slid, a) > 0);
      if (!hit) break;
      slid = slideAlong(pushPast(slid, side, hit, gap), side, workArea);
    }
    const fits = rectInside(slid, workArea) && overlapArea(slid, anchor) === 0 &&
      avoid.every((a) => !a || overlapArea(slid, a) === 0);
    attempts.push({ rect: clampRectInto(slid, workArea), side });
    if (fits) return finalize(slid, side, target);
  }
  // Nada coube: a tentativa (já dentro do monitor) que menos cobre o JoJo e os outros anexos.
  const cost = (r) => 2 * overlapArea(r, anchor) + avoid.reduce((sum, a) => sum + (a ? overlapArea(r, a) : 0), 0);
  const best = attempts.reduce((a, b) => (cost(b.rect) < cost(a.rect) ? b : a));
  return finalize(best.rect, best.side, target, true);
}

function pushPast(r, side, obstacle, gap) {
  switch (side) {
    case 'top':
      return { ...r, y: obstacle.y - r.height - gap };
    case 'bottom':
      return { ...r, y: bottom(obstacle) + gap };
    case 'left':
      return { ...r, x: obstacle.x - r.width - gap };
    default:
      return { ...r, x: right(obstacle) + gap };
  }
}

function slideAlong(r, side, wa) {
  const c = clampRectInto(r, wa);
  if (side === 'top' || side === 'bottom') return { ...r, x: c.x };
  return { ...r, y: c.y };
}

function finalize(r, side, target, forced = false) {
  let tail;
  const inset = 18;
  switch (side) {
    case 'top':
      tail = { x: clampN(target.x, r.x + inset, r.x + r.width - inset), y: r.y + r.height };
      break;
    case 'bottom':
      tail = { x: clampN(target.x, r.x + inset, r.x + r.width - inset), y: r.y };
      break;
    case 'left':
      tail = { x: r.x + r.width, y: clampN(target.y, r.y + inset, r.y + r.height - inset) };
      break;
    default:
      tail = { x: r.x, y: clampN(target.y, r.y + inset, r.y + r.height - inset) };
  }
  return { rect: r, side, tail, forced };
}

function clampN(v, lo, hi) {
  return hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v));
}

/**
 * Calcula os limites da janela overlay: união do JoJo (com folga para pulos)
 * e dos anexos visíveis. Retorna também offsets relativos para o renderer.
 */
export function composeWindow(jojoBox, attachments) {
  let bounds = { ...jojoBox };
  for (const a of attachments) if (a && a.rect) bounds = union(bounds, a.rect);
  bounds = {
    x: Math.floor(bounds.x),
    y: Math.floor(bounds.y),
    width: Math.ceil(bounds.width + (bounds.x - Math.floor(bounds.x))),
    height: Math.ceil(bounds.height + (bounds.y - Math.floor(bounds.y))),
  };
  const rel = (r) => (r ? { x: r.x - bounds.x, y: r.y - bounds.y, width: r.width, height: r.height } : null);
  return { bounds, rel };
}
