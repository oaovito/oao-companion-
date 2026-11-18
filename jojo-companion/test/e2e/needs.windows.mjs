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
      // Quebra de verdade: quantas linhas cada texto ocupa (a 2ª linha tem texto + barra por desenho).
      const linhasDeTexto = (el) => { const r = document.createRange(); r.selectNodeContents(el); return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size; };
      const textos = [...hud.querySelectorAll('.needs-item, #openCare, #needsXp > span:first-child')];
      const linhas = [...hud.querySelectorAll('.needs-linha')].map((l) => ({ sw: l.scrollWidth, cw: l.clientWidth }));
      const quebras = textos.map((e) => [e.textContent, linhasDeTexto(e)]).filter(([, n]) => n !== 1);
      const caixa = hud.getBoundingClientRect();
      const filhos = [...hud.querySelectorAll('.needs-item, #openCare, #needsXp')].map((e) => e.getBoundingClientRect());
      return { linhas, quebras, dentro: filhos.every((r) => r.left >= caixa.left - 0.5 && r.right <= caixa.right + 0.5 && r.bottom <= caixa.bottom + 0.5), textos: [...hud.querySelectorAll('.needs-item')].map((e) => e.textContent), sobra: Math.max(...[...hud.querySelectorAll('.needs-linha, #litter')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.getBoundingClientRect().bottom)) - caixa.bottom }; // o aviso "+XP" fica de propósito logo abaixo do quadro
    });
    assert.deepEqual(medida.textos, ['Saciedade 100', 'Saúde 100', 'Higiene 100']);
    assert.deepEqual(medida.quebras, [], 'nenhum texto quebra em duas linhas');
    for (const l of medida.linhas) assert.ok(l.sw <= l.cw + 1, `linha transborda: ${l.sw} > ${l.cw}`);
    assert.ok(medida.dentro, 'indicadores, nível e botão Cuidados dentro do quadro');
    assert.ok(medida.sobra <= 0.5, `conteúdo maior que o quadro: ${medida.sobra}px`);

    // Configurações: Lista de Tarefas e Bloqueio do Discord não aparecem; os valores salvos continuam.
    const antes = await app.evaluate(() => ({ discord: globalThis.__jojo.store.get().discordBloqueio, todo: JSON.stringify(globalThis.__jojo.store.get().todo ?? null) }));
    const aberta = app.waitForEvent('window'); await app.evaluate(() => globalThis.__jojo.openSettings());
    const sw = await aberta; sw.on('pageerror', (e) => errors.push(e.message));
    await sw.waitForSelector('#todoSettingsFields', { state: 'attached' }); // a seção existe, mas fica oculta
    await new Promise((r) => setTimeout(r, 800));
    assert.deepEqual(await sw.evaluate(() => ['#todoSettings', '#discordBlock'].map((q) => getComputedStyle(document.querySelector(q)).display)), ['none', 'none']);
    assert.deepEqual(await app.evaluate(() => ({ discord: globalThis.__jojo.store.get().discordBloqueio, todo: JSON.stringify(globalThis.__jojo.store.get().todo ?? null) })), antes, 'esconder não muda a configuração');
    assert.deepEqual(errors, []);
  } finally { await quit(app); }
});

test('visuais por nível Windows: peça nova ao subir, aviso, desenho com os canais e Central com descrição e cadeados', { timeout: 120000 }, async () => {
  const { app, win, errors } = await launch();
  try {
    await win.waitForFunction(() => !!window.__jojoRenderer.state, null, { timeout: 15000 });
    const l15 = await app.evaluate(() => {
      const c = globalThis.__jojo.companion;
      c.progress.st.xp = c.progress.threshold(15);
      c._syncVisual({ anunciar: true });
      return { nivel: c.progress.nivel, vn: globalThis.__jojo.store.get().visualNivel };
    });
    assert.equal(l15.nivel, 15);
    assert.equal(l15.vn.visto, 15);
    assert.equal(l15.vn.novas.length, 25, 'tudo o que o nível liberou (níveis 2 a 15, South Park do 10, memes do 4, 8 e 12 e 7 animes) fica marcado como novo');
    assert.ok(Object.keys(l15.vn.pecas).length >= 6, JSON.stringify(l15.vn));
    await win.waitForFunction(() => Object.keys(window.__jojoRenderer.state.visualNivel || {}).length >= 6, null, { timeout: 10000 });
    // O JoJo avisa (balão) e o aviso não fica pendente.
    await waitFor(app, () => globalThis.__jojo.store.get().visualNivel.avisar.length === 0, 70000);
    await new Promise((r) => setTimeout(r, 600)); // alguns quadros com as peças desenhadas
    const opened = app.waitForEvent('window'); await app.evaluate(() => globalThis.__jojo.companion.openApp('guardaRoupa'));
    const page = await opened; page.on('pageerror', (e) => errors.push(e.message));
    await page.waitForSelector('#guardaRoupa [data-visual]');
    assert.match(await page.locator('#guardaBtn').textContent(), /25 novos/);
    const itens = await page.$$eval('#guardaRoupa [data-visual]', (bs) => bs.map((b) => ({ id: b.dataset.visual, desc: b.querySelector('.visual-desc')?.textContent || '', novo: !!b.querySelector('.selo-novo') })));
    assert.equal(itens.length, 25, 'níveis 2 a 15 e os extras liberados');
    assert.ok(itens.every((i) => /^nv0(0[2-9]|1[0-5])$|^sp01$|^tw0[1-3]$|^an00[1-7]$/.test(i.id)), 'só liberados como itens');
    assert.ok(itens.every((i) => i.desc.length > 10 && i.novo), 'cada item com a fala da referência e o selo de novo');
    // Trancados: só cadeado e nível, nada do que é.
    const cadeados = await page.$$eval('#guardaRoupa .cadeado', (cs) => cs.map((c) => c.textContent.trim()));
    assert.equal(cadeados.length, 185 + 19 + 47 + 93, 'níveis 16 a 200, 19 de South Park, 47 memes e 93 animes');
    assert.ok(cadeados.every((t) => /^🔒nível \d+$/.test(t)), cadeados.slice(0, 3).join(' | '));
    const texto = await page.locator('#guardaRoupa').textContent();
    assert.ok(!/Sunga de pose|Ushanka|Sabre de luz|Aura dourada|Plus Ultra|Grimório|Sol do Orgulho/.test(texto), 'nenhum item futuro revelado');
    await waitFor(app, () => globalThis.__jojo.store.get().visualNivel.novas.length === 0); // viu na Central
    await page.locator('#guardaRoupa [data-visual="nv003"]').click();
    await waitFor(app, () => globalThis.__jojo.store.get().visualNivel.pecas.cabeca === 'nv003');
    await win.waitForFunction(() => window.__jojoRenderer.state.visualNivel?.nv_nv003 === 1, null, { timeout: 10000 });
    assert.deepEqual(errors, []);
  } finally { await quit(app); }
});

test('funeral do shape Windows: comida fora da dieta mostra o slide com as fotos no lugar do balão', { timeout: 120000 }, async () => {
  const { app, win, errors } = await launch();
  try {
    await win.waitForFunction(() => !!window.__jojoRenderer.state, null, { timeout: 15000 });
    await app.evaluate(() => globalThis.__jojo.companion.chat('vou pedir pizza'));
    await win.waitForFunction(() => !document.getElementById('funeral').classList.contains('hidden'), null, { timeout: 10000 });
    await win.waitForFunction(() => { const img = document.getElementById('funeralFoto'); return img.complete && img.naturalWidth > 0; }, null, { timeout: 10000 });
    const tela = await win.evaluate(() => ({
      foto: document.getElementById('funeralFoto').getAttribute('src'),
      legenda: document.getElementById('funeralLegenda').textContent,
      topo: document.querySelector('#funeral .funeral-topo').textContent,
      balao: getComputedStyle(document.getElementById('bubble')).display,
      clique: getComputedStyle(document.getElementById('funeral')).pointerEvents,
    }));
    assert.match(tela.foto, /assets\/funeral\/foto\d{2}\.jpg$/);
    assert.equal(tela.legenda, 'Quer se tornar uma aberração?', 'única frase do funeral');
    assert.equal(tela.topo.replace(/[\s🕯️]/gu, ''), '', 'nenhum outro texto além da legenda');
    assert.equal(tela.balao, 'none', 'no lugar do balão');
    assert.equal(tela.clique, 'none', 'não pega clique (click-through preservado)');
    await win.waitForFunction(() => document.getElementById('funeral').classList.contains('hidden'), null, { timeout: 20000 });
    assert.deepEqual(errors, []);
  } finally { await quit(app); }
});
