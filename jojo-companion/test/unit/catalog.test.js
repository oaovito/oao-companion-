// Catálogo de animações (3 listas), motor de variedade (antitédio) e falas ambientes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, loadJSON, chatAdv, seededRng } from './helpers.js';
import { buildAnimation, expandCatalog, animName, INTENSITIES } from '../../src/core/catalog/recipes.js';
import { VarietyEngine, periodOf, seasonOf, SEASONS } from '../../src/core/catalog/variety.js';
import { Animator } from '../../src/renderer/shared/animator.js';

const CAT = loadJSON('assets/catalog/animacoes.json');
const LINES = loadJSON('assets/dialogue/falas-ambientes.json');
const ANIMS = loadJSON('assets/animations/jojo.animations.json');
const RIG = loadJSON('assets/character/jojo.rig.json');

test('catálogo cobre as três listas (as versões estáticas e o balão de status são do sistema)', () => {
  const sizes = { base: 120, semPudor: 116, ambiente: 114 };
  const system = { base: [118, 120], semPudor: [116], ambiente: [114] };
  for (const [lista, n] of Object.entries(sizes)) {
    const got = new Set(CAT.itens.flatMap((it) => it.listas[lista] || []));
    for (let i = 1; i <= n; i++) if (!system[lista].includes(i)) assert.ok(got.has(i), `${lista} #${i} sem animação`);
  }
  const ids = CAT.itens.map((it) => it.id);
  assert.equal(new Set(ids).size, ids.length, 'ids únicos');
});

test('cada item tem nome, gatilho, duração, loop, transição, frequência e versão estática', () => {
  const lineCats = new Set(LINES.falas.map((l) => l.cat));
  const all = expandCatalog(ANIMS, CAT);
  for (const it of CAT.itens) {
    assert.ok(it.nome && it.categoria && it.gatilho, it.id);
    assert.ok(['comum', 'rara', 'easter'].includes(it.frequencia), it.id);
    if (it.fala) assert.ok(lineCats.has(it.fala), `${it.id}: categoria de fala ${it.fala}`);
    if (it.usa) {
      assert.ok(ANIMS.animations[it.usa], `${it.id} usa ${it.usa}`);
      continue;
    }
    assert.ok(it.duracao > 0 && typeof it.loop === 'boolean' && it.entrada >= 0, it.id);
    for (const k of Object.keys(INTENSITIES)) {
      const a = all.animations[animName(it.id, k)];
      assert.ok(a && a.duration > 0, `${it.id} ${k}`);
    }
    // Movimento reduzido: quadro estático válido.
    const an = new Animator(all, { rng: seededRng(1) });
    an.play(animName(it.id), 0);
    const st = an.sampleStatic();
    for (const v of Object.values(st.pose)) assert.ok(Number.isFinite(v), it.id);
  }
  // Intensidades: exagerado é mais rápido e mais amplo que o suave.
  const it = CAT.itens.find((x) => x.id === 'duploBiceps');
  assert.ok(buildAnimation(it, 'exagerado').duration < buildAnimation(it, 'suave').duration);
});

test('objetos e efeitos do catálogo existem no rig e no renderer', () => {
  const channels = new Set();
  for (const g of RIG.groups) for (const p of g.parts) [].concat(p.showIf || []).forEach((c) => channels.add(c));
  for (const it of CAT.itens) {
    for (const o of [].concat((it.receita && it.receita.objeto) || [])) {
      const ch = { shake: 'propShaker', banco: 'propBench', barra: 'propBar', po: 'propPowder', coco: 'propPoop' }[o] || `prop_${o}`;
      assert.ok(channels.has(ch), `${it.id}: objeto ${o} sem desenho`);
    }
  }
  assert.ok(RIG.moods.moodNojo, 'nojo esverdeia');
});

test('motor de variedade: nunca repete em sequência, memória de 30 e sem surpresas quando desligado', () => {
  let t = 0;
  const v = new VarietyEngine({ catalog: CAT, lines: LINES, rng: seededRng(5), now: () => t, getPrefs: () => ({ modo: 'auto', surpresas: true }) });
  let prev = null;
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    t += 60e3;
    const it = v.pickAmbient({ date: new Date(2026, 9, 29, 14, 0) });
    assert.ok(it);
    assert.notEqual(it.id, prev, 'não repete em sequência');
    prev = it.id;
    seen.add(it.id);
  }
  assert.ok(seen.size > 80, `variedade: ${seen.size} diferentes`);
  assert.ok(v.state.recent.length <= 30);
  const calm = new VarietyEngine({ catalog: CAT, rng: seededRng(3), now: () => 0, getPrefs: () => ({ surpresas: false }) });
  for (let i = 0; i < 200; i++) assert.equal(calm.pickAmbient().frequencia, 'comum');
});

test('motor de variedade: horário, temporada da semana, humor e adaptação mudam os pesos', () => {
  const v = new VarietyEngine({ catalog: CAT, rng: seededRng(9), now: () => 0, getPrefs: () => ({}) });
  const estrelas = CAT.itens.find((it) => it.id === 'estrelas');
  const night = v.weight(estrelas, { date: new Date(2026, 9, 29, 22), energy: 'pilhado', season: SEASONS[0] });
  const noon = v.weight(estrelas, { date: new Date(2026, 9, 29, 12), energy: 'pilhado', season: SEASONS[0] });
  assert.ok(night > noon * 3, 'observar estrelas é de noite');
  assert.equal(periodOf(new Date(2026, 0, 1, 3)), 'madrugada');
  assert.ok(seasonOf(new Date(2026, 9, 29)).nome.startsWith('Temporada'));
  const it = CAT.itens.find((x) => x.id === 'selfie');
  const before = v.weight(it, { energy: 'zen' });
  v.like('selfie');
  v.like('selfie');
  assert.ok(v.weight(it, { energy: 'zen' }) > before, 'mais do que ela curte');
  v.ignore('selfie');
  v.ignore('selfie');
  v.ignore('selfie');
  v.ignore('selfie');
  assert.ok(v.weight(it, { energy: 'zen' }) < before * 1.4, 'menos do que ela ignora');
  // Modo calmo: só energias calmas.
  const c = new VarietyEngine({ catalog: CAT, rng: seededRng(2), now: () => 0, getPrefs: () => ({ modo: 'calmo' }) });
  for (let k = 0; k < 30; k++) {
    c.state.energy = null;
    assert.ok(['hiperfoco', 'zen', 'sonolento', 'convencido', 'curioso'].includes(c.energy()));
  }
});

test('falas ambientes: até 80 caracteres, sem repetir em sequência, as de dormir só depois das 21h', () => {
  for (const l of LINES.falas) assert.ok(l.t.length <= 80, l.t);
  assert.equal(LINES.falas.filter((l) => typeof l.n === 'number').length, 120);
  for (const n of [84, 99]) assert.equal(LINES.falas.find((l) => l.n === n).apos, 21);
  const dormir = new VarietyEngine({ catalog: CAT, lines: LINES, rng: seededRng(5), now: () => 0, getPrefs: () => ({}) });
  for (let i = 0; i < 200; i++) assert.ok(!dormir.pickLine({ date: new Date(2026, 9, 29, 20) }).apos, 'fala de dormir antes das 21h');
  let viu = false;
  for (let i = 0; i < 400 && !viu; i++) viu = !!dormir.pickLine({ categories: ['horario'], date: new Date(2026, 9, 29, 22) })?.apos;
  assert.ok(viu, 'depois das 21h as falas de dormir aparecem');
  const v = new VarietyEngine({ catalog: CAT, lines: LINES, rng: seededRng(4), now: () => 0, getPrefs: () => ({}) });
  let prev = null;
  for (let i = 0; i < 300; i++) {
    const l = v.pickLine({ date: new Date(2026, 9, 29, 15) });
    assert.notEqual(l.t, prev);
    assert.notEqual(l.freq, 'desligada');
    prev = l.t;
  }
  // Combina com a animação: halteres → treino.
  const hal = CAT.itens.find((it) => it.id === 'halteres');
  for (let i = 0; i < 20; i++) assert.equal(v.pickLine({ item: hal }).cat, 'treino');
  // Horário: "Bom dia" só de manhã.
  for (let i = 0; i < 50; i++) {
    const l = v.pickLine({ categories: ['horario'], date: new Date(2026, 9, 29, 21) });
    if (l) assert.ok(!l.horario || l.horario.includes('noite'), l.t);
  }
});

function started(opts = {}) {
  // Sem lembretes do relógio real atravessando o teste.
  const e = makeEnv({ ...opts, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false }, ...(opts.profile || {}) } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

test('companion: animações ambientes aparecem sozinhas e param quando ela interage', () => {
  const e = started({ settings: { ambienteFrequencia: 'muita', avisoRaros: false } });
  const states = new Set();
  for (let i = 0; i < 600; i++) {
    e.clock.advance(500);
    if (e.companion.behavior.state === 'ambient') states.add(e.companion.behavior.anim);
  }
  assert.ok(states.size >= 3, `ambientes vistos: ${[...states].join(', ')}`);
  // Interação interrompe (carinho tem prioridade sobre o ambiente).
  while (e.companion.behavior.state !== 'ambient') e.clock.advance(200);
  e.companion.enterInteraction('test');
  assert.notEqual(e.companion.behavior.state, 'ambient');
});

test('companion: sem animações ambientes quando desligadas', () => {
  const e = started({ settings: { ambienteFrequencia: 'desligado' } });
  for (let i = 0; i < 400; i++) {
    e.clock.advance(500);
    assert.notEqual(e.companion.behavior.state, 'ambient');
  }
});

test('companion: /anim, frases do chat, docinho com nojo e gestos tocam o catálogo', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, '/anim selfie');
  assert.match(r.text, /selfie/i);
  assert.match(e.companion.behavior.anim, /^cat_selfie/);
  e.clock.advance(6000);
  r = await chatAdv(e, 'faz uma dancinha');
  assert.equal(r.intent, 'animacao');
  assert.match(e.companion.behavior.anim, /^cat_dancinha/);
  e.clock.advance(6000);
  r = await chatAdv(e, 'e se eu comer um docinho?');
  assert.equal(r.text, 'Quer se tornar uma aberração?');
  assert.match(e.companion.behavior.anim, /^cat_nojo/);
  e.clock.advance(6000);
  assert.equal(e.companion.gesture('duploClique'), true);
  assert.match(e.companion.behavior.anim, /^cat_duploClique/);
  r = await chatAdv(e, '/anim');
  assert.match(r.text, /animações no catálogo/);
});

test('companion: ausente, volta e notificação viram animações', () => {
  const e = started();
  e.companion.onSystemIdle(130);
  assert.match(e.companion.behavior.anim, /^cat_ausente/);
  e.clock.advance(500);
  e.companion.onSystemIdle(2);
  assert.match(e.companion.behavior.anim, /^cat_voltou/);
  e.clock.advance(5000);
  e.companion.conversations.create({ id: 'x', title: 'X', kind: 'reminder' });
  e.companion.conversations.setStatus('x', 'needsInput', 'teste');
  e.clock.advance(50);
  assert.match(e.companion.behavior.anim, /^cat_notificacao/);
});

test('League of Legends: mau humor, some e volta emburrado depois que ela sai', () => {
  const e = started();
  const cats = [];
  const orig = e.companion.sayCategory.bind(e.companion);
  e.companion.sayCategory = (c, o) => (cats.push(c), orig(c, o));
  e.companion.onForeground({ lol: true });
  assert.equal(cats[cats.length - 1], 'lolAbriu');
  e.clock.advance(5000);
  assert.equal(e.companion.lolHidden, true);
  assert.equal(e.overlay.visible, false);
  e.companion.onForeground({ lol: true });
  e.clock.advance(10000);
  e.companion.onForeground({ lol: false });
  assert.equal(e.companion.lolHidden, true, 'ainda não: espera 20 s fora do LoL');
  e.clock.advance(15000);
  e.companion.onForeground({ lol: false });
  assert.equal(e.companion.lolHidden, false);
  e.clock.advance(2000);
  assert.equal(cats[cats.length - 1], 'lolVoltou');
  // Desligado nas configurações: não some.
  const e2 = started({ settings: { lolBronca: false } });
  e2.companion.applySettings(e2.store.get(), ['lolBronca']);
  assert.ok(!e2.companion.lolHidden);
});

test('Spotify: reage à troca de música com animação e fala no jeito dele', async () => {
  const { musicVibe } = await import('../../src/core/companion.js');
  assert.equal(musicVibe('Survivor - Eye of the Tiger'), 'treino');
  assert.equal(musicVibe('MC Kevinho - Olha a Explosão'), 'funk');
  assert.equal(musicVibe('Metallica - Enter Sandman'), 'rock');
  assert.equal(musicVibe('Lofi Girl - Study Beats'), 'calma');
  const e = started({ settings: { speechFrequency: 'normal' } });
  assert.equal(e.companion.onSpotify('Survivor - Eye of the Tiger'), true);
  assert.match(e.companion.behavior.anim, /^cat_(halteres|duploBiceps|flexoes|agachamentoNado)/);
  assert.equal(e.companion.nowPlaying.musica, 'Eye of the Tiger');
  assert.equal(e.companion.onSpotify('Survivor - Eye of the Tiger'), false, 'mesma música: nada');
  e.companion.onSpotify(null);
  assert.equal(e.companion.nowPlaying, null);
  e.clock.advance(5000);
  e.companion.onSpotify('Daft Punk - One More Time');
  e.companion.enterInteraction('test');
  const r = await chatAdv(e, 'o que tá tocando?');
  assert.match(r.text, /One More Time, de Daft Punk/);
});
