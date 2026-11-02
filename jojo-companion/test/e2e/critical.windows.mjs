// Chromium/FFI reais no runner Windows. Não comprova Steam/jogo comercial no PC da usuária.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { launch, quit, waitFor } from './feature-helpers.mjs';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
test('correções Windows: três cenas pela Central, fullscreen real/saída, janelas próprias e recuperação de renderer/detector', { timeout: 150000 }, async () => {
  const { app, win, errors } = await launch();
  try {
    const opened = app.waitForEvent('window'); await app.evaluate(() => globalThis.__jojo.companion.openApp());
    const central = await opened; central.on('pageerror', error => errors.push(error.message)); await central.waitForSelector('#input');
    await central.bringToFront();
    await waitFor(app, () => globalThis.__jojo.fullscreenInfo().last?.reason === 'own_window');
    const shots = [];
    for (const [command, item] of [['Encena Buff de café', 'living_buffCafe'], ['Encena Protagonista do prazo', 'living_mainCharacter'], ['Encena Policial', 'living_policial']]) {
      await central.locator('#input').fill(command); await central.locator('#form button').click();
      await waitFor(app, () => globalThis.__jojo.livingService.snapshot().last?.status === 'executed' && globalThis.__jojo.livingService.snapshot().last?.itemId === globalThis.__jojo.livingService.model.st.recent.at(-1), 15000);
      await win.waitForFunction(id => window.__jojoRenderer.anim?.startsWith(`cat_${id}`), item);
      const first = await win.screenshot({ omitBackground: true }); await sleep(700);
      const second = await win.screenshot({ omitBackground: true }); assert.notEqual(createHash('sha256').update(first).digest('hex'), createHash('sha256').update(second).digest('hex'), command);
      const out = path.resolve(process.env.JOJO_TEST_REPORT_DIR || 'out/critical-windows'); fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, `${item}.png`), second);
      shots.push({ command, item, framesDiffer: true, sha256: createHash('sha256').update(second).digest('hex') });
      if (process.env.GITHUB_ACTIONS) for (const chunk of second.toString('base64').match(/.{1,4000}/g)) console.log(`JOJO_CRITICAL_SCENE:${item}:${chunk}`);
      await waitFor(app, () => globalThis.__jojo.companion.behavior.state !== 'act', 10000);
    }
    console.log(`JOJO_CRITICAL_EVIDENCE:${JSON.stringify(shots)}`);
    const cooldown = await app.evaluate(() => globalThis.__jojo.companion.livingChat('Encena Policial')); assert.equal(cooldown.status, 'cooldown');
    const target = await app.evaluate(() => globalThis.__jojo.makeClickTarget({ x: 0, y: 0, width: 500, height: 400 }, { fullscreen: true }));
    await waitFor(app, () => globalThis.__jojo.companion.fullscreenHidden);
    const queued = await app.evaluate(() => globalThis.__jojo.companion.livingChat('Encena Químico')); assert.equal(queued.status, 'queued'); assert.equal(queued.reason, 'fullscreen_blocked');
    await app.evaluate((_electron, id) => globalThis.__jojo.closeTarget(id), target); await central.bringToFront();
    await waitFor(app, () => !globalThis.__jojo.companion.fullscreenHidden && globalThis.__jojo.livingService.snapshot().last?.status === 'executed', 12000);
    assert.equal(await app.evaluate(() => globalThis.__jojo.fullscreenInfo().last.reason), 'own_window');
    await app.evaluate(() => globalThis.__jojo.restartDetector());
    await waitFor(app, () => globalThis.__jojo.fullscreenInfo().last?.reason === 'own_window', 12000);
    await app.evaluate(() => globalThis.__jojo.companion.onSceneChat('Outra conversa.'));
    const recoveryTarget = await app.evaluate(() => globalThis.__jojo.makeClickTarget({ x: 0, y: 0, width: 500, height: 400 }, { fullscreen: true }));
    await waitFor(app, () => globalThis.__jojo.companion.fullscreenHidden);
    const pending = await app.evaluate(() => globalThis.__jojo.companion.livingChat('Encena Médico'));
    assert.equal(pending.status, 'queued'); assert.equal(pending.reason, 'fullscreen_blocked');
    const replacement = app.waitForEvent('window');
    const disconnected = await app.evaluate(() => new Promise(resolve => {
      const overlay = globalThis.__jojo.overlay;
      overlay.win.webContents.once('render-process-gone', () => resolve({ ready: overlay.ready, queued: globalThis.__jojo.livingService.snapshot().queued }));
      overlay.win.webContents.forcefullyCrashRenderer();
    }));
    assert.equal(disconnected.ready, false); assert.ok(disconnected.queued.includes('living_medico'));
    await app.evaluate((_electron, id) => globalThis.__jojo.closeTarget(id), recoveryTarget); await central.bringToFront();
    const restored = await replacement; restored.on('pageerror', error => errors.push(error.message));
    await restored.waitForFunction(() => !!window.__jojoRenderer.state);
    await waitFor(app, () => globalThis.__jojo.livingService.snapshot().last?.itemId === 'living_medico' && globalThis.__jojo.livingService.snapshot().last?.status === 'executed', 22000);
    await restored.waitForFunction(() => window.__jojoRenderer.anim?.includes('living_medico'));
    const concealedWindow = app.waitForEvent('window');
    const concealed = await app.evaluate(() => new Promise(resolve => {
      const { overlay, companion } = globalThis.__jojo;
      overlay.recreate(); companion.onRendererRestart(); companion.setVisible(false);
      overlay.win.once('ready-to-show', () => resolve({ visible: overlay.visible, windowVisible: overlay.win.isVisible() }));
    }));
    const concealedPage = await concealedWindow; concealedPage.on('pageerror', error => errors.push(error.message));
    assert.deepEqual(concealed, { visible: false, windowVisible: false }, 'ocultar durante a recuperação continua valendo quando o renderer carrega');
    assert.deepEqual(errors, []);
  } finally { await quit(app); }
});

test('Windows: fullscreen e Central com escala Electron 150%, geometria nativa em pixels físicos', { timeout: 45000 }, async () => {
  const { app } = await launch({ args: ['--force-device-scale-factor=1.5'] });
  try {
    const scale = await app.evaluate(() => globalThis.__jojo.primaryScale()); assert.ok(scale >= 1.4);
    const target = await app.evaluate(() => globalThis.__jojo.makeClickTarget({ x: 0, y: 0, width: 400, height: 300 }, { fullscreen: true }));
    try { await waitFor(app, () => globalThis.__jojo.companion.fullscreenHidden); }
    catch (error) { error.message += JSON.stringify(await app.evaluate((_e, id) => ({ detector: globalThis.__jojo.fullscreenInfo(), scale: globalThis.__jojo.primaryScale(), target: globalThis.__jojo.targetBounds(id) }), target)); throw error; }
    await app.evaluate((_e, id) => globalThis.__jojo.closeTarget(id), target);
    await waitFor(app, () => !globalThis.__jojo.companion.fullscreenHidden);
    console.log(`JOJO_DPI_EVIDENCE:${JSON.stringify({ scale, fullscreenThenRecovered: true })}`);
  } finally { await quit(app); }
});
