import test from 'node:test';
import assert from 'node:assert/strict';
import { launch, quit, waitFor } from './feature-helpers.mjs';
test('cuidados Windows: 56 alimentos reais, saciedade, limpeza persistente e XP integrado', { timeout: 120000 }, async () => {
  const { app, win, errors } = await launch();
  try {
    const opened = app.waitForEvent('window'); await app.evaluate(() => globalThis.__jojo.companion.openApp('cuidados'));
    const page = await opened; page.on('pageerror', e => errors.push(e.message));
    await page.waitForSelector('#cuidados .care-food');
    assert.equal(await page.locator('#cuidados .care-food').count(), 56);
    await page.locator('[data-food=salmao]').click();
    await waitFor(app, () => globalThis.__jojo.needsService.model.st.foods.salmao === 1);
    assert.ok(await app.evaluate(() => globalThis.__jojo.needsService.model.st.hunger > 90));
    const earned = () => app.evaluate(() => globalThis.__jojo.companion.progress.st.rewards.history.filter(r => r.source === 'feeding').reduce((s, r) => s + r.amount, 0));
    const xp = await earned(); await page.locator('[data-food=salmao]').click();
    assert.equal(await earned(), xp); assert.match(await page.locator('.care-feedback').textContent(), /saciado/);
    await app.evaluate(() => { const n = globalThis.__jojo.needsService.model; n.mutate(() => n.st.objects.push({ id: 'native-litter-fixture', type: 'legendary', slot: 0, createdAt: Date.now() })); });
    await page.waitForSelector('.care-object[data-id="native-litter-fixture"]');
    await page.locator('.care-object[data-id="native-litter-fixture"]').click();
    await waitFor(app, () => globalThis.__jojo.needsService.model.st.objects.length === 0);
    const rewards = await app.evaluate(() => globalThis.__jojo.companion.progress.st.rewards.history.filter(r => r.source === 'cleanup'));
    assert.equal(rewards.length, 1); assert.equal(rewards[0].amount, 250);
    const second = await page.evaluate(() => window.appApi.needs({ action: 'clean', id: 'native-litter-fixture' }));
    assert.equal(second.result.duplicate, true);
    await app.evaluate(() => { const n = globalThis.__jojo.needsService.model; n.mutate(() => { n.st.hunger = 50; }); });
    await page.locator('[data-food=atum]').click();
    const crisis = await app.evaluate(() => globalThis.__jojo.companion.chat('quero morrer')); assert.match(crisis.text, /188/);
    await page.waitForFunction(() => document.getElementById('progression').getAttribute('aria-live') === 'off');
    await new Promise(resolve => setTimeout(resolve, 3800));
    assert.equal(await app.evaluate(() => globalThis.__jojo.companion.effect), null);
    assert.equal(await win.evaluate(() => /^cat_needs/.test(window.__jojoRenderer.state.anim || '')), false);
    await app.evaluate(() => globalThis.__jojo.companion.startWork());
    await win.waitForFunction(() => window.__jojoRenderer.state.work);
    assert.equal(await win.evaluate(() => window.__jojoRenderer.state.needsPanel), null);
    assert.equal(await win.locator('#needsHud').isVisible(), false);
    assert.deepEqual(errors, []);
  } finally { await quit(app); }
});
