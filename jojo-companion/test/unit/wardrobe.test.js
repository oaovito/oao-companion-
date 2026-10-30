// Guarda-roupa: ela veste o JoJo peça por peça (brincar de boneca), se quiser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, loadJSON, chatAdv, seededRng } from './helpers.js';
import { WARDROBE_ITEMS, WARDROBE_SLOTS, wear, undress, randomOutfit, outfitChannels, findWardrobeItem, sanitizeOutfit, wardrobeSnapshot } from '../../src/core/wardrobe.js';
import { sanitize } from '../../src/core/settings-schema.js';

const RIG = loadJSON('assets/character/jojo.rig.json');

function rigChannels() {
  const set = new Set(['sexy']);
  const walk = (arr) => {
    for (const g of arr) {
      for (const c of [].concat(g.showIf || [])) set.add(c);
      if (g.parts) walk(g.parts);
    }
  };
  walk(RIG.groups);
  for (const k of Object.keys(RIG.costumes)) if (k[0] !== '_') set.add(`costume_${k}`);
  return set;
}

function started(opts = {}) {
  const e = makeEnv({ ...opts, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

test('catálogo do guarda-roupa: toda peça existe no desenho, ids únicos, todas as partes têm peças', () => {
  const chans = rigChannels();
  const ids = new Set();
  for (const it of WARDROBE_ITEMS) {
    assert.ok(chans.has(it.canal), `${it.id}: canal ${it.canal} não existe no rig`);
    assert.ok(!ids.has(it.id), `id repetido ${it.id}`);
    ids.add(it.id);
    assert.ok(WARDROBE_SLOTS.some((s) => s.id === it.slot), it.id);
  }
  for (const s of WARDROBE_SLOTS) assert.ok(WARDROBE_ITEMS.some((it) => it.slot === s.id), s.id);
  // Bermudas: só paleta, e a cor do botão é a da paleta.
  for (const it of WARDROBE_ITEMS.filter((x) => x.slot === 'bermuda')) {
    assert.equal(RIG.costumes[it.canal.slice(8)].palette.shorts, it.cor, it.id);
  }
});

test('vestir: uma peça por parte, a mesma de novo tira, tirar tudo, surpresa e busca por nome', () => {
  let r = wear({}, 'coroa');
  assert.deepEqual(r.outfit, { cabeca: 'coroa' });
  r = wear(r.outfit, 'gorroNatal');
  assert.deepEqual(r.outfit, { cabeca: 'gorroNatal' }, 'troca a peça da mesma parte');
  r = wear(r.outfit, 'oculos');
  assert.deepEqual(r.outfit, { cabeca: 'gorroNatal', rosto: 'oculos' });
  r = wear(r.outfit, 'oculos');
  assert.equal(r.removed, true);
  assert.deepEqual(r.outfit, { cabeca: 'gorroNatal' });
  assert.deepEqual(undress({ cabeca: 'coroa', rosto: 'oculos' }, 'rosto'), { cabeca: 'coroa' });
  assert.deepEqual(undress({ cabeca: 'coroa' }), {});
  assert.equal(wear({}, 'naoExiste').item, null);
  const rng = seededRng(3);
  for (let i = 0; i < 30; i++) {
    const o = randomOutfit(rng);
    assert.ok(Object.keys(o).length >= 1);
    assert.deepEqual(sanitizeOutfit(o), o);
  }
  assert.equal(findWardrobeItem('óculos escuros').id, 'oculos');
  assert.equal(findWardrobeItem('bermuda rosa').id, 'bermudaRosa');
  assert.equal(findWardrobeItem('capa').id, 'capa');
  assert.equal(findWardrobeItem('xyz'), null);
  // Peça na parte errada ou desconhecida some.
  assert.deepEqual(sanitizeOutfit({ cabeca: 'oculos', rosto: 'oculos', mao: 'x' }), { rosto: 'oculos' });
  assert.deepEqual(outfitChannels({ cabeca: 'coroa', mao: 'flor' }), { costume_coroa: 1, costume_flor: 1 });
  assert.deepEqual(outfitChannels({ cabeca: 'coroa', mao: 'flor' }, { semMao: true }), { costume_coroa: 1 });
  const snap = wardrobeSnapshot({ cabeca: 'coroa' });
  assert.equal(snap.vestido.cabeca, 'coroa');
  assert.equal(snap.partes.length, WARDROBE_SLOTS.length);
});

test('configurações: roupa salva é validada', () => {
  assert.deepEqual(sanitize({}).settings.guardaRoupa, {});
  const { settings, issues } = sanitize({ guardaRoupa: { cabeca: 'coroa', rosto: 'inventado' } });
  assert.deepEqual(settings.guardaRoupa, { cabeca: 'coroa' });
  assert.ok(issues.includes('guardaRoupa'));
});

test('companion: /vestir veste, comenta e o desenho recebe as peças; vale mais que a fantasia do dia', async () => {
  const e = started();
  const opened = [];
  e.companion.onOpenApp = (id) => opened.push(id);
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, '/vestir');
  assert.deepEqual(opened, ['guardaRoupa']);
  assert.match(r.text, /Guarda-roupa/);
  r = await chatAdv(e, '/vestir coroa');
  assert.ok(r.text.length > 3);
  assert.deepEqual(e.store.get().guardaRoupa, { cabeca: 'coroa' });
  await chatAdv(e, '/vestir bermuda rosa');
  e.companion.costume = 'natal'; // data festiva: a roupa dela vence
  e.clock.advance(8000);
  e.companion._applyLayout(true);
  let st = e.overlay.state;
  assert.equal(st.costume, null);
  assert.equal(st.sexy, false);
  assert.equal(st.outfit.costume_coroa, 1);
  assert.equal(st.outfit.costume_bermudaRosa, 1);
  // Peça na mão some enquanto a animação usa um objeto.
  await chatAdv(e, '/vestir flor');
  e.companion.playCatalog('halteres', { source: 'comando' });
  e.companion._applyLayout(true);
  assert.equal(e.overlay.state.outfit.costume_flor, undefined);
  r = await chatAdv(e, '/vestir tirar');
  assert.deepEqual(e.store.get().guardaRoupa, {});
  e.companion.costume = 'natal';
  e.companion._applyLayout(true);
  st = e.overlay.state;
  assert.equal(st.outfit, null);
  assert.equal(st.costume, 'natal', 'sem roupa dela, volta a fantasia do dia');
  await chatAdv(e, '/vestir surpresa');
  assert.ok(Object.keys(e.store.get().guardaRoupa).length >= 1);
  r = await chatAdv(e, '/vestir capa de chuva inventada');
  assert.match(r.text, /Não tenho/);
});

test('companion: "vamos brincar de boneca" abre o guarda-roupa; comando aparece no menu "/"', async () => {
  const e = started();
  const opened = [];
  e.companion.onOpenApp = (id) => opened.push(id);
  e.companion.enterInteraction('test');
  const r = await chatAdv(e, 'vamos brincar de boneca?');
  assert.equal(r.intent, 'guardaRoupa');
  assert.deepEqual(opened, ['guardaRoupa']);
  const { commandMenu } = await import('../../src/core/conversations.js');
  assert.ok(commandMenu({ petVisible: true }).some((c) => c.cmd === '/vestir'));
});

test('peça na mão aparece logo depois de vestir (sem espelho no lugar)', async () => {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  e.companion.enterInteraction('test');
  for (const peca of ['flor', 'cafe', 'microfone', 'trofeu']) {
    await chatAdv(e, `/vestir ${peca}`);
    e.clock.advance(300);
    e.companion._applyLayout(true);
    const canal = { flor: 'costume_flor', cafe: 'prop_cafe', microfone: 'prop_microfone', trofeu: 'prop_trofeu' }[peca];
    assert.equal(e.overlay.state.outfit[canal], 1, `${peca} na mão`);
    assert.equal(e.overlay.state.outfit.prop_espelho, undefined, 'sem espelho');
    assert.doesNotMatch(e.companion.behavior.anim || '', /espelho/);
  }
});
