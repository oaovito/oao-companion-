import test from 'node:test';
import assert from 'node:assert/strict';
import { transparentPointCandidates } from '../e2e/transparent-point.mjs';
import { makeEnv } from './helpers.js';

const contains = (r, p) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

test('o canto antigo do ensaio fica na toolbar; o candidato usa toda a geometria atual', () => {
  const e = makeEnv({ settings: { speechFrequency: 'off' } });
  try {
    e.companion.start();
    e.clock.advance(2100);
    e.env.cursor = { x: 1, y: 1 };
    e.clock.advance(600);
    e.companion.enterInteraction('test');
    e.clock.advance(800);
    const before = { ...e.overlay.bounds };
    e.companion.interact('eat');
    e.clock.advance(650);
    const bounds = e.overlay.bounds;
    const state = e.overlay.state;
    const oldCorner = { x: before.x + 3 - bounds.x, y: before.y + 3 - bounds.y };
    assert.equal(contains(state.visual, oldCorner), false, 'a antiga verificação do corpo aceitava o ponto');
    assert.equal(contains(state.toolbar.rect, oldCorner), true, 'mas o ponto pertence à toolbar');
    const regions = [state.jojo, state.visual, state.toolbar.rect, state.chat?.rect, state.bubble?.rect, state.needsPanel?.rect];
    const points = transparentPointCandidates({ bounds, workArea: e.env.displays[0].workArea, regions });
    assert.ok(points.length > 0, 'há área livre dentro da janela real');
    for (const point of points) assert.equal(regions.some((r) => r && contains(r, point)), false);
  } finally {
    e.companion.stop();
  }
});

test('candidatos excluem HUD, chat, balão e corpo com margem para o movimento nativo', () => {
  const bounds = { x: 100, y: 200, width: 200, height: 200 };
  const regions = [
    { x: 0, y: 0, width: 200, height: 40 },
    { x: 100, y: 40, width: 100, height: 160 },
    { x: 0, y: 110, width: 40, height: 90 },
    { x: 0, y: 40, width: 40, height: 40 },
  ];
  const points = transparentPointCandidates({ bounds, workArea: { x: 0, y: 0, width: 500, height: 500 }, regions });
  assert.ok(points.length > 0);
  for (const p of points) for (const r of regions) {
    assert.equal(contains({ x: r.x - 8, y: r.y - 8, width: r.width + 16, height: r.height + 16 }, p), false);
  }
});

test('candidatos permanecem dentro do alvo em coordenadas negativas e janela parcialmente fora da área útil', () => {
  const bounds = { x: -250, y: 50, width: 200, height: 200 };
  const workArea = { x: -200, y: 100, width: 300, height: 100 };
  const points = transparentPointCandidates({ bounds, workArea, regions: [] });
  assert.ok(points.length > 0);
  for (const p of points) {
    assert.ok(p.x >= 8 && p.x <= bounds.width - 8 && p.y >= 8 && p.y <= bounds.height - 8);
    assert.ok(contains({ x: workArea.x + 8, y: workArea.y + 8, width: workArea.width - 16, height: workArea.height - 16 }, { x: bounds.x + p.x, y: bounds.y + p.y }));
  }
});

test('sem espaço comprovadamente livre não inventa canto transparente', () => {
  const bounds = { x: 0, y: 0, width: 100, height: 100 };
  assert.deepEqual(transparentPointCandidates({ bounds, workArea: bounds, regions: [{ ...bounds }] }), []);
  assert.deepEqual(transparentPointCandidates({ bounds, workArea: { x: 200, y: 200, width: 100, height: 100 }, regions: [] }), []);
});
