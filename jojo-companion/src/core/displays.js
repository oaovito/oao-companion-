// Modelo puro de monitores. Um "display" segue o formato do Electron:
// { id, bounds, workArea, scaleFactor } em pixels lógicos (DIP).
import { overlapArea, distPointRect, center, clampRectInto, rectInside } from './geometry.js';

export function displayForRect(displays, r) {
  if (!displays.length) return null;
  let best = null;
  let bestOverlap = -1;
  for (const d of displays) {
    const o = overlapArea(d.bounds, r);
    if (o > bestOverlap) {
      best = d;
      bestOverlap = o;
    }
  }
  if (bestOverlap > 0) return best;
  return nearestDisplay(displays, center(r));
}

export function nearestDisplay(displays, p) {
  let best = null;
  let bestD = Infinity;
  for (const d of displays) {
    const dd = distPointRect(p, d.workArea);
    if (dd < bestD) {
      best = d;
      bestD = dd;
    }
  }
  return best;
}

export function findDisplay(displays, id) {
  return displays.find((d) => String(d.id) === String(id)) || null;
}

export function primaryDisplay(displays, primaryId) {
  return findDisplay(displays, primaryId) || displays[0] || null;
}

/**
 * Áreas onde JoJo pode ficar.
 * - preferredId: monitor preferido ("auto" = monitor atual ou principal).
 * - allowSwitch: se false, apenas o monitor-base.
 */
export function allowedDisplays(displays, { preferredId = 'auto', allowSwitch = true, currentId = null, primaryId = null } = {}) {
  if (!displays.length) return [];
  if (allowSwitch) return displays.slice();
  const base = (preferredId !== 'auto' && findDisplay(displays, preferredId)) ||
    findDisplay(displays, currentId) || primaryDisplay(displays, primaryId);
  return base ? [base] : [displays[0]];
}

/**
 * Garante que um retângulo esteja inteiramente dentro da área útil de algum
 * monitor permitido. Usado na inicialização, após desconexão de monitor,
 * mudança de resolução/DPI e retomada de suspensão.
 */
export function recoverRect(r, displays, opts = {}) {
  const allowed = allowedDisplays(displays, opts);
  if (!allowed.length) return { rect: r, display: null, changed: false };
  for (const d of allowed) {
    if (rectInside(r, d.workArea)) return { rect: r, display: d, changed: false };
  }
  // Preferir o monitor com maior sobreposição; senão, o mais próximo.
  const target = displayForRect(allowed, r) || allowed[0];
  const fixed = clampRectInto(r, target.workArea);
  return { rect: fixed, display: target, changed: true };
}

/** Assinatura estável da topologia de monitores, para detectar mudanças. */
export function topologySignature(displays) {
  return displays
    .map((d) => `${d.id}:${d.bounds.x},${d.bounds.y},${d.bounds.width}x${d.bounds.height}@${d.scaleFactor}|${d.workArea.x},${d.workArea.y},${d.workArea.width}x${d.workArea.height}`)
    .sort()
    .join(';');
}

/**
 * Associa o retângulo (DIP) de um monitor ocupado por app em tela cheia ao
 * display correspondente do Electron. Tolera pequenas diferenças de arredondamento.
 */
export function matchFullscreenDisplay(dipRect, displays, tolerance = 40) {
  let best = null;
  let bestD = Infinity;
  for (const d of displays) {
    const b = d.bounds;
    const dd = Math.abs(b.x - dipRect.x) + Math.abs(b.y - dipRect.y) + Math.abs(b.width - dipRect.width) + Math.abs(b.height - dipRect.height);
    if (dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best && bestD < tolerance ? best : null;
}
