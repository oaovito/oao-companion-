import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { ForegroundSample } from '../../src/core/foreground-sample.js';
import { matchFullscreenDisplay } from '../../src/core/displays.js';
const { classifyFullscreen } = createRequire(import.meta.url)('../../src/core/fullscreen-policy.cjs');
const monitor = { left: 0, top: 0, right: 1920, bottom: 1080 };
const small = { left: 300, top: 100, right: 1200, bottom: 900 };
test('fullscreen: busy, D3D global e apresentação/Meet não transformam janela comum ou JoJo em tela cheia', () => {
  for (const shell of [1, 2, 3, 4, 5]) {
    assert.equal(classifyFullscreen({ shell, monitor, window: small }).fullscreen, false);
    assert.equal(classifyFullscreen({ shell, monitor, window: monitor, own: true }).fullscreen, false);
  }
});
test('fullscreen: janela ativa cobrindo monitor é protegida, mas maximização normal, minimização e shell são distintos', () => {
  assert.equal(classifyFullscreen({ monitor, window: monitor, shell: 1 }).fullscreen, true);
  assert.equal(classifyFullscreen({ monitor, window: monitor, maximized: true, framed: true }).fullscreen, false);
  assert.equal(classifyFullscreen({ monitor, window: monitor, maximized: true, framed: false }).fullscreen, true);
  for (const extra of [{ minimized: true }, { visible: false }, { className: 'WorkerW' }, { shellWindow: true }, { window: null }]) assert.equal(classifyFullscreen({ monitor, window: monitor, ...extra }).fullscreen, false);
});
test('fullscreen: Alt+Tab e fechamento não conservam o estado global, só o monitor físico ocupado é associado', () => {
  const left = { left: -2560, top: 0, right: 0, bottom: 1440 };
  assert.equal(classifyFullscreen({ monitor: left, window: left }).fullscreen, true);
  assert.equal(classifyFullscreen({ monitor: left, window: small, shell: 3 }).fullscreen, false);
  const result = classifyFullscreen({ monitor: left, window: left });
  const dip = { x: result.monitor.x / 2, y: 0, width: result.monitor.width / 2, height: result.monitor.height / 2 };
  assert.equal(matchFullscreenDisplay(dip, [{ id: 'left-200%', bounds: dip }, { id: 'right-100%', bounds: { x: 0, y: 0, width: 1920, height: 1080 } }]).id, 'left-200%');
});
test('foreground: resposta atrasada, amostra velha e geração anterior ao restart/suspensão/topologia são descartadas', () => {
  let now = 1000; const guard = new ForegroundSample(() => now);
  const old = guard.begin(), current = guard.begin();
  assert.equal(guard.accept(old, { capturedAt: now, fullscreen: true }), false);
  assert.equal(guard.accept(current, { capturedAt: now, fullscreen: false }), true);
  guard.invalidate(); assert.equal(guard.last, null);
  assert.equal(guard.accept(current, { capturedAt: now, fullscreen: true }), false);
  const next = guard.begin(); now += 2500;
  assert.equal(guard.accept(next, { capturedAt: 1000 }), false);
  assert.equal(guard.accept(next, { capturedAt: now + 1000 }), false);
  assert.equal(guard.accept(next, { capturedAt: now }), true);
});
