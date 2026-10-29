// Detecção de proximidade do cursor e planejamento de fuga.
// Módulo puro: não conhece Electron. Recebe posições em DIP e devolve ações.
//
// Princípios:
//  - Entrar em fuga é imediato quando o cursor cruza a margem (sem estabilização).
//  - Histerese: só volta ao estado "livre" quando o cursor fica além de margin*exitFactor.
//  - Estabilização (settle / intervalo mínimo entre re-planejamentos) nunca impede
//    um desvio urgente.
//  - Perseguição contínua → modo discreto (opacidade reduzida/oculto) até o cursor se afastar.
import {
  distPointRect, center, normalize, dot, dist, clampRectInto, rectInside, quadBezier,
  overlapArea,
} from './geometry.js';

export const AVOID_DEFAULTS = Object.freeze({
  margin: 100,          // px lógicos: cursor a menos disto da área visível dispara a fuga
  exitFactor: 1.6,      // histerese: estado "livre" só além de margin * exitFactor
  safeFactor: 2.0,      // destino precisa ficar a pelo menos margin * safeFactor do cursor
  urgentFactor: 0.5,    // abaixo de margin * urgentFactor, re-planeja sem esperar
  retargetMinMs: 140,   // intervalo mínimo entre re-planejamentos não urgentes
  settleMs: 350,        // estabilização após chegar ao destino
  chaseWindowMs: 4000,  // janela para detectar perseguição
  chaseMaxFlights: 5,   // fugas na janela antes de recorrer ao modo discreto
  hideRecoverMs: 1200,  // tempo com cursor longe para sair do modo discreto
  predictMs: 220,       // previsão linear da posição do cursor
  reversalWindowMs: 2000,
});

const SAMPLE_TS = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];

function rectAt(p, size) {
  return { x: p.x, y: p.y, width: size.width, height: size.height };
}

/**
 * "Exposição" de um caminho: quanto o retângulo do JoJo passa perto do cursor
 * ao longo do trajeto (0 = sempre além da margem). Penaliza cruzar o cursor.
 */
export function pathExposure(from, control, to, size, cursor, margin) {
  let sum = 0;
  for (const t of SAMPLE_TS) {
    const p = quadBezier(from, control, to, t);
    const d = distPointRect(cursor, rectAt(p, size));
    if (d < margin) sum += (margin - d) * (t < 0.3 ? 0.4 : 1); // início inevitavelmente perto
  }
  return sum / SAMPLE_TS.length;
}

/**
 * Escolhe um ponto de controle (reto ou curvo, para um dos lados) que minimize
 * a passagem perto do cursor.
 */
export function choosePathControl(from, to, size, cursor, margin) {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const v = { x: to.x - from.x, y: to.y - from.y };
  const len = Math.hypot(v.x, v.y);
  if (len < 1) return { control: mid, exposure: 0 };
  const perp = { x: -v.y / len, y: v.x / len };
  const c = center(rectAt(from, size));
  // Lado oposto ao cursor primeiro.
  const side = dot(perp, { x: c.x - cursor.x, y: c.y - cursor.y }) >= 0 ? 1 : -1;
  const options = [
    mid,
    { x: mid.x + perp.x * side * len * 0.45, y: mid.y + perp.y * side * len * 0.45 },
    { x: mid.x + perp.x * side * len * 0.9, y: mid.y + perp.y * side * len * 0.9 },
    { x: mid.x - perp.x * side * len * 0.45, y: mid.y - perp.y * side * len * 0.45 },
  ];
  let best = null;
  for (const control of options) {
    const exposure = pathExposure(from, control, to, size, cursor, margin);
    if (!best || exposure < best.exposure - 0.01) best = { control, exposure };
  }
  return best;
}

function areaFor(areas, r) {
  let best = null;
  let bestO = -1;
  for (const a of areas) {
    const o = overlapArea(a.workArea, r);
    if (o > bestO) {
      bestO = o;
      best = a;
    }
  }
  if (bestO > 0) return best;
  let bestD = Infinity;
  for (const a of areas) {
    const d = distPointRect(center(r), a.workArea);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

function generateCandidates(rect, areas, cursor, margin) {
  const out = [];
  const size = { width: rect.width, height: rect.height };
  const c = center(rect);
  const base = margin * 2 + Math.max(rect.width, rect.height) * 0.6;
  // Candidatos direcionais a partir da posição atual.
  for (let k = 0; k < 16; k++) {
    const ang = (k / 16) * Math.PI * 2;
    for (const f of [1, 1.6, 2.4, 3.4]) {
      const cx = c.x + Math.cos(ang) * base * f;
      const cy = c.y + Math.sin(ang) * base * f;
      const r = rectAt({ x: cx - size.width / 2, y: cy - size.height / 2 }, size);
      const a = areaFor(areas, r);
      if (!a) continue;
      if (a.workArea.width < size.width || a.workArea.height < size.height) continue;
      out.push({ rect: clampRectInto(r, a.workArea), areaId: a.id });
    }
  }
  // Grade grossa em cada área permitida (garante saída de cantos e alternativas).
  for (const a of areas) {
    const wa = a.workArea;
    if (wa.width < size.width || wa.height < size.height) continue;
    const nx = 7;
    const ny = 5;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const x = wa.x + (wa.width - size.width) * (i / (nx - 1));
        const y = wa.y + (wa.height - size.height) * (j / (ny - 1));
        out.push({ rect: rectAt({ x, y }, size), areaId: a.id });
      }
    }
  }
  return out;
}

/**
 * Planeja um destino seguro para o retângulo do JoJo.
 * @returns {{x:number,y:number,control:{x,y},areaId:any,exposure:number,dir:{x,y}}|null}
 */
export function planEscape({
  rect, cursor, cursorVel = { x: 0, y: 0 }, areas, currentAreaId = null,
  margin = AVOID_DEFAULTS.margin, safeFactor = AVOID_DEFAULTS.safeFactor,
  predictMs = AVOID_DEFAULTS.predictMs, lastDir = null, lastDirAge = Infinity,
  reversalWindowMs = AVOID_DEFAULTS.reversalWindowMs,
}) {
  if (!areas || !areas.length) return null;
  const size = { width: rect.width, height: rect.height };
  const safeDist = margin * safeFactor;
  const predicted = { x: cursor.x + cursorVel.x * predictMs / 1000, y: cursor.y + cursorVel.y * predictMs / 1000 };
  const speed = Math.hypot(cursorVel.x, cursorVel.y);
  const velDir = normalize(cursorVel);
  const from = { x: rect.x, y: rect.y };
  const fromC = center(rect);
  let best = null;
  for (const cand of generateCandidates(rect, areas, cursor, margin)) {
    const r = cand.rect;
    const dCur = distPointRect(cursor, r);
    if (dCur < safeDist) continue;
    if (distPointRect(predicted, r) < safeDist * 0.8) continue;
    const to = { x: r.x, y: r.y };
    const travel = dist(from, to);
    if (travel < 4) continue;
    const { control, exposure } = choosePathControl(from, to, size, cursor, margin);
    const dir = normalize({ x: center(r).x - fromC.x, y: center(r).y - fromC.y });
    let cost = exposure * 6 + travel * 0.12;
    cost -= Math.min(dCur, safeDist * 2) * 0.35;
    if (currentAreaId != null && String(cand.areaId) !== String(currentAreaId)) cost += 350;
    if (lastDir && lastDirAge < reversalWindowMs && dot(dir, lastDir) < -0.2) cost += 320;
    if (speed > 300) {
      const toward = dot(normalize({ x: center(r).x - cursor.x, y: center(r).y - cursor.y }), velDir);
      if (toward > 0.6) cost += 220 * Math.min(1, speed / 1500);
    }
    if (!best || cost < best.cost) best = { x: r.x, y: r.y, control, areaId: cand.areaId, exposure, dir, cost };
  }
  return best;
}

/** Verifica se um destino (de passeio, por exemplo) é seguro e não cruza o cursor. */
export function isSafeTarget(from, to, size, cursor, margin, areas) {
  const r = rectAt(to, size);
  if (!areas.some((a) => rectInside(r, a.workArea))) return false;
  if (distPointRect(cursor, r) < margin) return false;
  const { exposure } = choosePathControl(from, to, size, cursor, margin);
  return exposure < margin * 0.05;
}

/**
 * Máquina de estados da proteção do cursor.
 * Estados: clear | alert | fleeing | settling | hidden
 */
export class AvoidanceController {
  constructor(config = {}) {
    this.cfg = { ...AVOID_DEFAULTS, ...config };
    this.reset();
  }

  setConfig(config) {
    this.cfg = { ...this.cfg, ...config };
  }

  reset() {
    this.state = 'clear';
    this.lastPlanAt = -Infinity;
    this.settleUntil = 0;
    this.flights = [];
    this.lastDir = null;
    this.lastDirAt = -Infinity;
    this.hiddenSince = 0;
    this.awaySince = null;
    this.currentTarget = null;
  }

  get isAlert() {
    return this.state !== 'clear';
  }

  /**
   * @param ctx {now, cursor, cursorVel, jojoRect, bubbleRect, areas, currentAreaId, motionActive}
   * @returns {Array<{type:string, plan?:object, reason?:string}>}
   */
  update(ctx) {
    const { now, cursor, jojoRect, bubbleRect, motionActive } = ctx;
    const { margin, exitFactor, urgentFactor, retargetMinMs, settleMs, hideRecoverMs } = this.cfg;
    const actions = [];
    const d = distPointRect(cursor, jojoRect);

    if (bubbleRect && this.state !== 'hidden' && distPointRect(cursor, bubbleRect) < margin) {
      actions.push({ type: 'collapseBubble' });
    }

    switch (this.state) {
      case 'hidden': {
        if (d > margin * exitFactor) {
          if (this.awaySince == null) this.awaySince = now;
          if (now - this.awaySince >= hideRecoverMs) {
            this.state = 'settling';
            this.settleUntil = now + settleMs;
            this.flights = [];
            actions.push({ type: 'unhide' });
          }
        } else {
          this.awaySince = null;
        }
        break;
      }
      case 'fleeing': {
        if (!motionActive) {
          this.state = 'settling';
          this.settleUntil = now + settleMs;
          this.currentTarget = null;
          if (d < margin) this._flee(ctx, actions, 'arrived-near');
          break;
        }
        const t = this.currentTarget;
        const predicted = this._predict(ctx);
        const threatened = !t ||
          distPointRect(cursor, t) < margin * 1.3 ||
          distPointRect(predicted, t) < margin;
        const urgent = d < margin * urgentFactor && threatened;
        if (threatened && (urgent || now - this.lastPlanAt >= retargetMinMs)) {
          this._flee(ctx, actions, 'retarget');
        }
        break;
      }
      case 'settling': {
        if (d < margin) {
          this._flee(ctx, actions, 'approach');
        } else if (now >= this.settleUntil) {
          this.state = d < margin * exitFactor ? 'alert' : 'clear';
        }
        break;
      }
      default: {
        if (d < margin) {
          this._flee(ctx, actions, 'approach');
        } else {
          this.state = d < margin * exitFactor ? 'alert' : 'clear';
        }
      }
    }
    return actions;
  }

  _predict({ cursor, cursorVel = { x: 0, y: 0 } }) {
    const k = this.cfg.predictMs / 1000;
    return { x: cursor.x + cursorVel.x * k, y: cursor.y + cursorVel.y * k };
  }

  _flee(ctx, actions, reason) {
    const { now } = ctx;
    const { chaseWindowMs, chaseMaxFlights } = this.cfg;
    this.flights = this.flights.filter((t) => now - t < chaseWindowMs);
    if (this.flights.length >= chaseMaxFlights) {
      this._hide(now, actions, 'chased');
      return;
    }
    const plan = planEscape({
      rect: ctx.jojoRect,
      cursor: ctx.cursor,
      cursorVel: ctx.cursorVel,
      areas: ctx.areas,
      currentAreaId: ctx.currentAreaId,
      margin: this.cfg.margin,
      safeFactor: this.cfg.safeFactor,
      predictMs: this.cfg.predictMs,
      lastDir: this.lastDir,
      lastDirAge: now - this.lastDirAt,
      reversalWindowMs: this.cfg.reversalWindowMs,
    });
    this.lastPlanAt = now;
    if (!plan) {
      this._hide(now, actions, 'no-space');
      return;
    }
    this.flights.push(now);
    this.lastDir = plan.dir;
    this.lastDirAt = now;
    this.state = 'fleeing';
    this.currentTarget = { x: plan.x, y: plan.y, width: ctx.jojoRect.width, height: ctx.jojoRect.height };
    actions.push({ type: 'collapseBubble' });
    actions.push({ type: 'flee', plan, reason });
  }

  _hide(now, actions, reason) {
    this.state = 'hidden';
    this.hiddenSince = now;
    this.awaySince = null;
    this.currentTarget = null;
    actions.push({ type: 'collapseBubble' });
    actions.push({ type: 'hide', reason });
  }
}
