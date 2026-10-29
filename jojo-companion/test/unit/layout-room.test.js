// Balão sem sobrepor painel/JoJo e janela com espaço para cada animação (sem "parede invisível").
import test from 'node:test';
import assert from 'node:assert/strict';
import { placeAround } from '../../src/core/layout.js';
import { overlapArea } from '../../src/core/geometry.js';
import { makeEnv, loadJSON } from './helpers.js';

const WA = { x: 0, y: 0, width: 1920, height: 1040 };

test('balão pula o obstáculo no mesmo lado em vez de sobrepor', () => {
  const jojo = { x: 1700, y: 880, width: 140, height: 160 };
  const toolbar = { x: 1620, y: 820, width: 300, height: 52 };
  const p = placeAround(jojo, { width: 260, height: 120 }, WA, { order: ['top', 'right', 'left'], avoid: [toolbar], gap: 8 });
  assert.equal(p.forced, false);
  assert.equal(p.side, 'top');
  assert.equal(overlapArea(p.rect, toolbar), 0);
  assert.equal(overlapArea(p.rect, jojo), 0);
  assert.ok(p.rect.y + p.rect.height <= toolbar.y, 'acima da barra');
});

test('sem lugar livre: escolhe a posição que menos cobre o JoJo', () => {
  const small = { x: 0, y: 0, width: 400, height: 300 };
  const jojo = { x: 120, y: 80, width: 160, height: 160 };
  const p = placeAround(jojo, { width: 260, height: 200 }, small, { order: ['top', 'right', 'left', 'bottom'] });
  assert.equal(p.forced, true);
  const first = placeAround(jojo, { width: 260, height: 200 }, small, { order: ['top'] });
  assert.ok(overlapArea(p.rect, jojo) <= overlapArea(first.rect, jojo));
});

test('com a conversa aberta e sem lugar, a fala fica só no painel (sem balão sobreposto)', () => {
  const e = makeEnv({ displays: [{ id: 1, bounds: { x: 0, y: 0, width: 640, height: 420 }, workArea: { x: 0, y: 0, width: 640, height: 400 }, scaleFactor: 1 }] });
  e.companion.start();
  e.clock.advance(2000);
  e.companion.enterInteraction('test');
  e.companion.setChatOpen(true);
  e.companion.bubble = { text: 'x'.repeat(200), kind: 'speech', size: { width: 260, height: 260 }, until: Infinity };
  e.companion._applyLayout(true);
  const st = e.overlay.state;
  if (st.bubble) {
    assert.equal(overlapArea(st.bubble.rect, st.chat.rect), 0, 'balão não cobre o painel');
  }
});

test('janela cresce pelo espaço da animação (agachamento com barra) ', () => {
  const room = loadJSON('assets/animations/jojo.room.json');
  assert.ok(room.anims.squat.l > 20 && room.anims.squat.r > 20, 'barra passa dos dois lados');
  assert.ok(room.anims.smitten.t > 40, 'corações sobem além da caixa');
  const e = makeEnv();
  e.companion.start();
  e.clock.advance(2000);
  const before = { ...e.companion.lastBounds };
  e.companion.behavior.request('squat', { now: e.clock.now() });
  e.companion._applyLayout(true);
  const b = e.companion.lastBounds;
  const boxW = e.companion._rects().box.width;
  assert.ok(b.width >= boxW + room.anims.squat.l + room.anims.squat.r - 2, `largura ${before.width} → ${b.width}`);
  // Volta ao normal depois da transição.
  e.clock.advance(20000);
  e.companion._applyLayout(true);
  assert.ok(e.companion.lastBounds.width < b.width);
});

test('animações e efeitos têm espaço medido (rode scripts/anim-room.mjs ao mudar o desenho)', () => {
  const room = loadJSON('assets/animations/jojo.room.json');
  const anims = loadJSON('assets/animations/jojo.animations.json').animations;
  for (const [name, a] of Object.entries(anims)) {
    if (name === 'hidden') continue;
    assert.ok(room.anims[a.variantOf || name], `sem espaço medido para ${name}`);
  }
});
