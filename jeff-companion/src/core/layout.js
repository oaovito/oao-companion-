// Posicionamento de anexos (balão, barra de ações, painel de conversa) em torno
// do Jeff, respeitando a área útil do monitor. Puro.
import { rectInside, clampRectInto, overlapArea, union, right, bottom } from './geometry.js';

const GAP = 6;

/**
 * Posiciona um retângulo de tamanho `size` ao redor de `anchor` (retângulo do Jeff).
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
    // Desliza ao longo da borda para caber no monitor, mantendo o lado.
    const slid = slideAlong(r, side, workArea);
    const fits = rectInside(slid, workArea) && overlapArea(slid, anchor) === 0 &&
      avoid.every((a) => !a || overlapArea(slid, a) === 0);
    attempts.push({ rect: slid, side, fits });
    if (fits) return finalize(slid, side, target);
  }
  // Nada coube perfeitamente: usa a primeira tentativa forçada para dentro do monitor.
  const a = attempts[0];
  return finalize(clampRectInto(a.rect, workArea), a.side, target, true);
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
 * Calcula os limites da janela overlay: união do Jeff (com folga para pulos)
 * e dos anexos visíveis. Retorna também offsets relativos para o renderer.
 */
export function composeWindow(jeffBox, attachments) {
  let bounds = { ...jeffBox };
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
