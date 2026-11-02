import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, quit, waitFor } from './feature-helpers.mjs';
test('cenas Windows: 50 botões reais, encenação no único chat, adereço animado e foco preservado', { timeout: 120000 }, async () => {
  const { app, win, errors } = await launch();
  try {
    const opened = app.waitForEvent('window'); await app.evaluate(() => globalThis.__jojo.companion.openApp('colecao'));
    const page = await opened; page.on('pageerror', e => errors.push(e.message));
    await page.waitForSelector('.living-scenes');
    assert.equal(await page.locator('[data-scene]').count(), 50);
    const professions = page.locator('.living-scenes').nth(1); await professions.locator('summary').click();
    await page.locator('[data-scene=living_medico]').click();
    await waitFor(app, () => globalThis.__jojo.livingService.model.st.recent.at(-1) === 'living_medico');
    await win.waitForFunction(() => window.__jojoRenderer.state.anim?.includes('living_medico') || window.__jojoRenderer.state.animation?.includes('living_medico'));
    const snapshot = await app.evaluate(() => ({ animation: globalThis.__jojo.companion.behavior.anim, chats: globalThis.__jojo.companion.conversations.list().filter(c => c.kind === 'chat').length }));
    assert.match(snapshot.animation, /cat_living_medico/); assert.equal(snapshot.chats, 1);
    // A arte é de fato desenhável no catálogo; auditoria completa confere pixels e recortes.
    assert.equal(await app.evaluate(() => globalThis.__jojo.companion.catalogById.get('living_medico').receita.aderecosAnimados), true);
    await app.evaluate(() => globalThis.__jojo.companion.startFocus());
    await page.waitForFunction(() => document.getElementById('progression').classList.contains('no-animation'));
    assert.equal(await page.locator('#progression').getAttribute('aria-live'), 'off');
    const previous = await app.evaluate(() => globalThis.__jojo.livingService.model.st.recent.length);
    const blocked = await app.evaluate(() => globalThis.__jojo.companion.livingChat('Encena Químico'));
    assert.equal(blocked.status, 'focus_blocked'); assert.match(blocked.message, /depois do foco/); assert.equal(await app.evaluate(() => globalThis.__jojo.livingService.model.st.recent.length), previous);
    assert.deepEqual(errors, []);
  } finally { await quit(app); }
});
