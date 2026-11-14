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
    assert.equal(rewards.length, 1); assert.equal(rewards[0].amount, 2500); // XP ×10 desde 14/11/2026
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

test('interface Windows: painel do aquário inteiro (sem quebra nem corte) e seções ocultas nas Configurações', { timeout: 120000 }, async () => {
  const { app, win, errors } = await launch();
  try {
    await win.waitForFunction(() => !!window.__jojoRenderer.state.needsPanel, null, { timeout: 15000 });
    await app.evaluate(() => { const n = globalThis.__jojo.needsService.model; n.mutate(() => { n.st.hunger = 100; n.st.health = 100; n.st.hygiene = 100; }); });
    await win.waitForSelector('#needsHud:not(.hidden) #needsNumbers .needs-item');
    const medida = await win.evaluate(() => {
      const hud = document.getElementById('needsHud');
      const linhas = [...hud.querySelectorAll('.needs-linha')].map((l) => ({ h: l.getBoundingClientRect().height, sw: l.scrollWidth, cw: l.clientWidth }));
      const caixa = hud.getBoundingClientRect();
      const filhos = [...hud.querySelectorAll('.needs-item, #openCare, #needsXp')].map((e) => e.getBoundingClientRect());
      return { linhas, dentro: filhos.every((r) => r.left >= caixa.left - 0.5 && r.right <= caixa.right + 0.5 && r.bottom <= caixa.bottom + 0.5), textos: [...hud.querySelectorAll('.needs-item')].map((e) => e.textContent), sobra: hud.scrollHeight - hud.clientHeight };
    });
    assert.deepEqual(medida.textos, ['Saciedade 100', 'Saúde 100', 'Higiene 100']);
    for (const l of medida.linhas) { assert.ok(l.h < 24, `linha quebrou: ${l.h}px`); assert.ok(l.sw <= l.cw + 1, `linha transborda: ${l.sw} > ${l.cw}`); }
    assert.ok(medida.dentro, 'indicadores, nível e botão Cuidados dentro do quadro');
    assert.ok(medida.sobra <= 1, `conteúdo maior que o quadro: ${medida.sobra}px`);

    // Configurações: Lista de Tarefas e Bloqueio do Discord não aparecem; os valores salvos continuam.
    const antes = await app.evaluate(() => ({ discord: globalThis.__jojo.store.get().discordBloqueio, todo: JSON.stringify(globalThis.__jojo.store.get().todo ?? null) }));
    const aberta = app.waitForEvent('window'); await app.evaluate(() => globalThis.__jojo.openSettings());
    const sw = await aberta; sw.on('pageerror', (e) => errors.push(e.message));
    await sw.waitForSelector('#todoSettingsFields');
    await new Promise((r) => setTimeout(r, 800));
    assert.deepEqual(await sw.evaluate(() => ['#todoSettings', '#discordBlock'].map((q) => getComputedStyle(document.querySelector(q)).display)), ['none', 'none']);
    assert.deepEqual(await app.evaluate(() => ({ discord: globalThis.__jojo.store.get().discordBloqueio, todo: JSON.stringify(globalThis.__jojo.store.get().todo ?? null) })), antes, 'esconder não muda a configuração');
    assert.deepEqual(errors, []);
  } finally { await quit(app); }
});
