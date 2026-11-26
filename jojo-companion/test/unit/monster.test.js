// Monster na dieta do JoJo (26/11/2026): latas no cardápio, arte da geometria-mestre e o
// segredo do favorito (Monster branco), sem nada na interface entregar.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeEnv, loadJSON } from './helpers.js';
import { SABORES, IDS_MONSTER, FAVORITO, svgLata, itensMonster, rigComMonster, registrarFavorito, RECOMPENSA, ANIM_FAVORITO_ID } from '../../src/core/monster.js';
import { Needs, emptyNeeds } from '../../src/core/needs.js';
import { BEBIDAS, comer, vidaVazia } from '../../src/core/rpg/vida.js';
import { expandCatalog } from '../../src/core/catalog/recipes.js';
import { fullCatalog } from '../../src/core/catalog/load.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { createNeedsService } from '../../src/main/needs-service.js';

const foods = loadJSON('assets/catalog/foods.json').foods;
const balance = loadJSON('assets/catalog/needs-balance.json');

test('monster: seis sabores no cardápio como bebidas, com a lata gerada da geometria-mestre', () => {
  assert.equal(SABORES.length, 6);
  assert.ok(IDS_MONSTER.includes(FAVORITO));
  for (const s of SABORES) {
    const f = foods.find((x) => x.id === s.id);
    assert.ok(f, s.id);
    assert.equal(f.bebida, true);
    assert.equal(f.image, `assets/foods/${s.id}.svg`);
    const svg = fs.readFileSync(new URL(`../../${f.image}`, import.meta.url), 'utf8');
    assert.equal(svg, svgLata(s.id), `${s.id}: rode node scripts/monster-assets.mjs`);
    assert.match(svg, /viewBox="0 0 64 64"/);
    assert.equal(/<image|<script|https?:\/\/(?!www\.w3\.org)/.test(svg), false);
    for (const tag of svg.match(/<[a-zA-Z][^>]*>/g)) {
      const attrs = [...tag.matchAll(/\s([a-zA-Z:-]+)=/g)].map((m) => m[1]);
      assert.equal(new Set(attrs).size, attrs.length, `atributo repetido em ${tag.slice(0, 40)}`);
    }
    assert.ok(BEBIDAS[s.id]?.energia > 0, `${s.id}: efeito de bebida no RPG`);
  }
});

test('monster: o favorito é segredo; no cardápio o branco aparece igual aos outros', () => {
  const branco = foods.find((f) => f.id === FAVORITO);
  const outros = foods.filter((f) => IDS_MONSTER.includes(f.id) && f.id !== FAVORITO);
  assert.equal(branco.preference, 'normal');
  assert.equal(branco.animation, 'needsComer');
  assert.ok(outros.every((f) => f.preference === branco.preference));
  assert.equal(/favorit|segredo|preferid/i.test(JSON.stringify(branco)), false);
  const changelog = fs.readFileSync(new URL('../../CHANGELOG.md', import.meta.url), 'utf8');
  assert.equal(/favorit|branco|easter/i.test(changelog.split(/\n## /)[1]), false, 'as notas da versão não entregam o segredo');
});

test('monster: exagerar em energético (Monster conta) acelera o coração', () => {
  const v = vidaVazia();
  let novas = [];
  for (let i = 0; i < 3; i++) novas = comer(v, IDS_MONSTER[i], { agora: 1000 + i, rng: () => 0 }).novas;
  assert.deepEqual(novas, ['taquicardia']);
});

test('monster: Êxtase do Monster Branco toca a lata, aura, garras e olhos, e tudo some no fim', () => {
  const ANIMS = expandCatalog(loadJSON('assets/animations/jojo.animations.json'), fullCatalog(loadJSON));
  const base = loadJSON('assets/character/jojo.rig.json');
  const rig = rigComMonster(base);
  assert.notEqual(rig, base);
  assert.equal(rigComMonster(rig), rig, 'idempotente');
  assert.ok(!base.groups.some((g) => g.id.startsWith('mn_')), 'o arquivo do personagem não muda');
  const room = loadJSON('assets/animations/jojo.room.json');
  const [it] = itensMonster();
  const nome = `cat_${it.id}`;
  assert.equal(it.id, ANIM_FAVORITO_ID);
  assert.ok(ANIMS.animations[nome]);
  assert.ok(!it.gatilho.ambiente, 'nunca toca sozinho: só quando ela dá o favorito');
  assert.ok(room.anims[nome] && room.animsVisual[nome], 'espaço medido');
  const variantes = Object.keys(ANIMS.animations).filter((n) => n === nome || n.startsWith(`${nome}~`));
  assert.equal(variantes.length, 3, 'três intensidades');
  for (const v of variantes) {
    const an = new Animator(ANIMS);
    an.play(v, 0, { restart: true });
    const vistos = new Set();
    const dur = ANIMS.animations[v].duration;
    for (let ms = 0; ms <= dur; ms += 50) for (const [k, x] of Object.entries(an.sample(ms).pose)) if (k.startsWith('mn_') && x >= 0.5) vistos.add(k);
    for (const g of ['mn_lata', 'mn_pss', 'mn_rasgo', 'mn_garras', 'mn_aura', 'mn_olhos', 'mn_raios', 'mn_txt', 'mn_coracao']) assert.ok(vistos.has(g), `${v}: ${g} aparece`);
    const fim = an.sample(dur + 500).pose;
    assert.deepEqual(Object.entries(fim).filter(([k, x]) => k.startsWith('mn_') && x >= 0.5).map(([k]) => k), [], `${v}: tudo some no fim`);
  }
});

test('monster: recompensa do favorito: descoberta uma vez, depois um bônus por dia', () => {
  const a = registrarFavorito(undefined, { dia: '2026-11-26', agora: 1, rng: () => 0 });
  assert.equal(a.descoberta, true);
  assert.deepEqual(a.recompensas.map((r) => [r.id, r.moedas, r.xp]), [['monster:favorito:descoberta', RECOMPENSA.descoberta.moedas, RECOMPENSA.descoberta.xp]]);
  assert.match(a.fala, /JOJOcoins/);
  const b = registrarFavorito(a.seg, { dia: '2026-11-26', agora: 2, rng: () => 0 });
  assert.equal(b.descoberta, false);
  assert.deepEqual(b.recompensas, [], 'mesmo dia: só a festa');
  const c = registrarFavorito(b.seg, { dia: '2026-11-27', agora: 3, rng: () => 0.99 });
  assert.deepEqual(c.recompensas.map((r) => r.id), ['monster:favorito:2026-11-27']);
  assert.equal(c.seg.n, 3);
});

test('necessidades: segredo grava, XP vai pela fila e JOJOcoins esperam a carteira (idempotente)', () => {
  const awarded = [];
  let saved = null;
  const n = new Needs({ state: emptyNeeds(), balance, foods, save: (s) => { saved = s; }, award: (r) => { awarded.push(r); return { amount: r.amount }; }, now: () => Date.UTC(2026, 10, 26, 15), sempreCabe: (id) => id === FAVORITO });
  n.st.hunger = 99;
  assert.equal(n.feed('monsterOriginal').fed, false, 'cheio: os outros esperam');
  assert.equal(n.feed(FAVORITO).fed, true, 'o favorito sempre cabe');
  n.segredo('monsterFavorito', registrarFavorito);
  assert.ok(awarded.some((r) => r.id === 'needs:monster:favorito:descoberta' && r.source === 'segredo'));
  assert.equal(n.st.moedasPendentes.length, 1);
  assert.equal(n.entregarMoedas(() => ({ pending: true })), 0);
  assert.equal(n.st.moedasPendentes.length, 1, 'sem carteira: espera');
  const creditos = [];
  assert.equal(n.entregarMoedas((x) => { creditos.push(x); return { ok: true, creditado: x.valor }; }), RECOMPENSA.descoberta.moedas);
  assert.deepEqual(creditos.map((x) => [x.id, x.valor, x.origem]), [['monster:favorito:descoberta', RECOMPENSA.descoberta.moedas, 'segredo']]);
  assert.equal(n.st.moedasPendentes.length, 0);
  assert.ok(saved.segredos.monsterFavorito.primeiro);
  n.segredo('monsterFavorito', registrarFavorito);
  assert.equal(n.st.moedasPendentes.length, 0, 'mesmo dia não paga de novo');
});

test('serviço: dar o branco toca o Êxtase, fala e credita JOJOcoins; os outros sabores comem normal', (t) => {
  const e = makeEnv({ settings: { iaAtivo: false, webSearch: false, speechFrequency: 'off', ambienteFrequencia: 'desligado' } });
  t.after(() => { e.companion.stop(); e.store.flush(); e.personality.flush(); fs.rmSync(e.dir, { recursive: true, force: true }); });
  e.companion.start(); e.clock.advance(2000);
  const creditos = [];
  e.companion.loja = { st: { ativos: { decor: {} } }, creditar: (x) => { creditos.push(x); return { ok: true, creditado: x.valor }; } };
  const service = createNeedsService({ userData: e.dir, companion: e.companion, store: e.store, foods, balance,
    ipcMain: { handle() {}, removeHandler() {} }, fromApp: () => true, fromOverlay: () => false, notify: () => {}, log: () => {} });
  service.model.st.hunger = 50;
  service.feed('monsterMangoLoco');
  assert.equal(e.companion.effect?.name, 'food', 'sabor comum: comida normal');
  assert.equal(creditos.length, 0);
  e.clock.advance(6000);
  service.model.st.hunger = 50;
  const r = service.feed(FAVORITO);
  assert.equal(r.fed, true);
  assert.equal(r.segredo, true);
  assert.match(e.companion.behavior.anim, new RegExp(`^cat_${ANIM_FAVORITO_ID}(~\\w+)?$`));
  assert.deepEqual(creditos.map((x) => x.id), ['monster:favorito:descoberta']);
  assert.ok(e.companion.progress.st.rewards.history.some((x) => x.id === 'needs:monster:favorito:descoberta'));
  const ditos = [];
  const say0 = e.companion.say.bind(e.companion);
  e.companion.say = (texto, ...resto) => { ditos.push(texto); return say0(texto, ...resto); };
  for (let i = 0; i < 60; i++) e.clock.advance(100);
  assert.ok(ditos.some((x) => /BRANCO/.test(x)), `fala do favorito: ${ditos.join(' | ')}`);
});
