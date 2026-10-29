import test from 'node:test';
import assert from 'node:assert/strict';
import { AvoidanceController, planEscape, pathExposure } from '../../src/core/avoidance.js';
import { distPointRect, rectInside, quadBezier } from '../../src/core/geometry.js';

const WA = { x: 0, y: 0, width: 1920, height: 1040 };
const AREAS = [{ id: 1, workArea: WA }];
const JEFF = { x: 900, y: 500, width: 140, height: 106 };

function ctx(over = {}) {
  return { now: 0, cursor: { x: -999, y: -999 }, cursorVel: { x: 0, y: 0 }, jeffRect: JEFF, bubbleRect: null, areas: AREAS, currentAreaId: 1, motionActive: false, ...over };
}

for (const [side, cursor, vel] of [
  ['esquerda', { x: JEFF.x - 60, y: JEFF.y + 50 }, { x: 900, y: 0 }],
  ['direita', { x: JEFF.x + JEFF.width + 60, y: JEFF.y + 50 }, { x: -900, y: 0 }],
  ['cima', { x: JEFF.x + 70, y: JEFF.y - 60 }, { x: 0, y: 900 }],
  ['baixo', { x: JEFF.x + 70, y: JEFF.y + JEFF.height + 60 }, { x: 0, y: -900 }],
]) {
  test(`aproximação pela ${side}: foge para destino seguro, dentro do monitor, sem cruzar o cursor`, () => {
    const a = new AvoidanceController({ margin: 100 });
    const acts = a.update(ctx({ cursor, cursorVel: vel }));
    const flee = acts.find((x) => x.type === 'flee');
    assert.ok(flee, 'deveria fugir');
    const target = { x: flee.plan.x, y: flee.plan.y, width: JEFF.width, height: JEFF.height };
    assert.ok(rectInside(target, WA), 'destino dentro da área útil');
    assert.ok(distPointRect(cursor, target) >= 200, 'destino longe do cursor');
    // O trajeto não deve passar mais perto do cursor do que o ponto de partida.
    const d0 = distPointRect(cursor, JEFF);
    for (let t = 0.2; t <= 1; t += 0.1) {
      const p = quadBezier({ x: JEFF.x, y: JEFF.y }, flee.plan.control, { x: target.x, y: target.y }, t);
      const d = distPointRect(cursor, { ...p, width: JEFF.width, height: JEFF.height });
      assert.ok(d >= d0 - 1, `trajeto cruza o cursor em t=${t.toFixed(1)} (d=${d.toFixed(1)} < ${d0})`);
    }
    // Afasta-se no sentido oposto ao do lado de aproximação.
    const jc = { x: JEFF.x + 70, y: JEFF.y + 53 };
    const tc = { x: target.x + 70, y: target.y + 53 };
    const away = (tc.x - jc.x) * (jc.x - cursor.x) + (tc.y - jc.y) * (jc.y - cursor.y);
    assert.ok(away > 0, 'deve se afastar do cursor');
  });
}

test('fora da margem não reage; dentro reage imediatamente (sem estabilização bloqueando)', () => {
  const a = new AvoidanceController({ margin: 100 });
  assert.equal(a.update(ctx({ cursor: { x: JEFF.x - 101, y: JEFF.y + 10 } })).length, 0);
  const acts = a.update(ctx({ now: 1, cursor: { x: JEFF.x - 99, y: JEFF.y + 10 } }));
  assert.ok(acts.some((x) => x.type === 'flee'));
});

test('histerese: estado alerta entre margem e margem*exitFactor', () => {
  const a = new AvoidanceController({ margin: 100, exitFactor: 1.6 });
  a.update(ctx({ cursor: { x: JEFF.x - 130, y: JEFF.y } }));
  assert.equal(a.state, 'alert');
  a.update(ctx({ cursor: { x: JEFF.x - 170, y: JEFF.y } }));
  assert.equal(a.state, 'clear');
});

test('cantos: escolhe direção válida para dentro da tela', () => {
  for (const [jx, jy, cx, cy] of [
    [0, 0, 160, 120], [WA.width - 140, 0, WA.width - 160, 120],
    [0, WA.height - 106, 160, WA.height - 130], [WA.width - 140, WA.height - 106, WA.width - 160, WA.height - 130],
  ]) {
    const jeff = { x: jx, y: jy, width: 140, height: 106 };
    const p = planEscape({ rect: jeff, cursor: { x: cx, y: cy }, areas: AREAS, margin: 100 });
    assert.ok(p, 'deve haver plano');
    assert.ok(rectInside({ x: p.x, y: p.y, width: 140, height: 106 }, WA));
    assert.ok(distPointRect({ x: cx, y: cy }, { x: p.x, y: p.y, width: 140, height: 106 }) >= 200);
  }
});

test('sem espaço seguro: recolhe balão e entra em modo discreto', () => {
  const tiny = [{ id: 1, workArea: { x: 0, y: 0, width: 300, height: 200 } }];
  const a = new AvoidanceController({ margin: 100 });
  const acts = a.update(ctx({ jeffRect: { x: 80, y: 50, width: 140, height: 106 }, cursor: { x: 60, y: 60 }, areas: tiny }));
  assert.deepEqual(acts.map((x) => x.type), ['collapseBubble', 'hide']);
  assert.equal(a.state, 'hidden');
});

test('re-planeja quando o cursor vai para o destino; perseguição contínua leva ao modo discreto', () => {
  const a = new AvoidanceController({ margin: 100, chaseMaxFlights: 4 });
  let now = 0;
  let jeff = { ...JEFF };
  let cursor = { x: JEFF.x - 50, y: JEFF.y + 50 };
  let res = a.update(ctx({ now, cursor, jeffRect: jeff }));
  let plan = res.find((x) => x.type === 'flee').plan;
  let flights = 1;
  let hidden = false;
  for (let i = 0; i < 10 && !hidden; i++) {
    now += 200;
    // Cursor salta para o destino atual.
    cursor = { x: plan.x + 70, y: plan.y + 53 };
    res = a.update(ctx({ now, cursor, jeffRect: jeff, motionActive: true }));
    const f = res.find((x) => x.type === 'flee');
    if (f) {
      flights++;
      plan = f.plan;
      jeff = { ...jeff, x: (jeff.x + plan.x) / 2, y: (jeff.y + plan.y) / 2 };
    }
    if (res.some((x) => x.type === 'hide')) hidden = true;
  }
  assert.ok(flights >= 2, 're-planejou');
  assert.ok(hidden, 'entrou em modo discreto após perseguição');
  // Recupera quando o cursor se afasta por tempo suficiente.
  const far = { x: 10, y: 10 };
  a.update(ctx({ now: now + 10, cursor: far, jeffRect: jeff }));
  const back = a.update(ctx({ now: now + 2000, cursor: far, jeffRect: jeff }));
  assert.ok(back.some((x) => x.type === 'unhide'));
});

test('sem oscilação: cursor parado perto do destino após fuga não gera fugas repetidas', () => {
  const a = new AvoidanceController({ margin: 100 });
  const cursor = { x: JEFF.x - 40, y: JEFF.y + 40 };
  const res = a.update(ctx({ now: 0, cursor }));
  const plan = res.find((x) => x.type === 'flee').plan;
  const arrived = { x: plan.x, y: plan.y, width: JEFF.width, height: JEFF.height };
  let flees = 0;
  for (let t = 16; t < 5000; t += 16) {
    const r = a.update(ctx({ now: t, cursor, jeffRect: arrived, motionActive: t < 500 }));
    flees += r.filter((x) => x.type === 'flee').length;
  }
  assert.equal(flees, 0);
  assert.equal(a.state, 'clear');
});

test('cursor oscilando na borda da margem não causa pingue-pongue', () => {
  const a = new AvoidanceController({ margin: 100 });
  let jeff = { ...JEFF };
  let flees = 0;
  let lastPlan = null;
  for (let t = 0; t < 6000; t += 16) {
    // Cursor parado na tela, tremendo 6 px em torno de 105 px da borda esquerda inicial.
    const cursor = { x: JEFF.x - 105 + Math.sin(t / 30) * 6, y: JEFF.y + 50 };
    const r = a.update(ctx({ now: t, cursor, jeffRect: jeff, motionActive: false }));
    for (const x of r) if (x.type === 'flee') { flees++; lastPlan = x.plan; }
    if (lastPlan) {
      jeff = { ...jeff, x: lastPlan.x, y: lastPlan.y };
      lastPlan = null;
    }
  }
  assert.ok(flees <= 1, `fugas demais: ${flees}`);
});

test('balão perto do cursor é recolhido sem mover o Jeff', () => {
  const a = new AvoidanceController({ margin: 100 });
  const bubble = { x: JEFF.x, y: JEFF.y - 120, width: 200, height: 80 };
  const r = a.update(ctx({ cursor: { x: JEFF.x + 50, y: JEFF.y - 150 }, bubbleRect: bubble }));
  assert.deepEqual(r.map((x) => x.type), ['collapseBubble']);
});

test('pathExposure penaliza caminho que atravessa o cursor', () => {
  const size = { width: 100, height: 100 };
  const cursor = { x: 550, y: 50 };
  const through = pathExposure({ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 1000, y: 0 }, size, cursor, 100);
  const around = pathExposure({ x: 0, y: 0 }, { x: 500, y: 600 }, { x: 1000, y: 0 }, size, cursor, 100);
  assert.ok(through > around);
});

test('multi-monitor com coordenadas negativas: destino pode ficar em monitor à esquerda', () => {
  const areas = [{ id: 1, workArea: { x: 0, y: 0, width: 400, height: 300 } }, { id: 2, workArea: { x: -1920, y: 0, width: 1920, height: 1040 } }];
  const jeff = { x: 130, y: 100, width: 140, height: 106 };
  const p = planEscape({ rect: jeff, cursor: { x: 200, y: 150 }, areas, currentAreaId: 1, margin: 100 });
  assert.ok(p);
  assert.equal(p.areaId, 2);
  assert.ok(p.x < 0);
});
