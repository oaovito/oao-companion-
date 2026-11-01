// Fantasias ousadas/comportadas, comidas de tubarão com arroto e o AVC.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv, loadJSON } from './helpers.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { HOLIDAYS } from '../../src/core/holidays.js';

const ANIMS = loadJSON('assets/animations/jojo.animations.json');
const RIG = loadJSON('assets/character/jojo.rig.json');
const D = (y, m, d) => new Date(y, m - 1, d, 12);
const flush = async () => {
  for (let k = 0; k < 8; k++) await Promise.resolve();
};

function started(opts) {
  const e = makeEnv(opts);
  e.companion.start();
  e.clock.advance(2000);
  return e;
}

test('fantasia ousada por padrão; "se veste direito" → dedo do meio e versão comportada', async () => {
  const e = started();
  e.companion.checkHoliday(D(2026, 12, 25));
  e.clock.advance(100);
  assert.equal(e.overlay.state.sexy, true, 'ousada por padrão');
  const r = await chatAdv(e, 'se veste direito, jojo');
  assert.equal(r.action, 'dressDown');
  assert.equal(e.companion.behavior.state, 'finger', 'dedo do meio');
  e.clock.advance(100);
  assert.equal(e.overlay.state.sexy, false, 'versão comportada');
  assert.equal(e.overlay.state.costume, 'natal', 'continua fantasiado');
  assert.equal(e.personality.get().festas.estilo, 'comportada', 'lembra da escolha');
  e.clock.advance(4000);
  const r2 = await chatAdv(e, 'pode voltar a fantasia ousada');
  assert.equal(r2.action, 'dressUp');
  e.clock.advance(100);
  assert.equal(e.overlay.state.sexy, true);
  // Datas de outras religiões: só comportada.
  e.companion.checkHoliday(D(2025, 3, 30));
  e.clock.advance(100);
  assert.equal(e.overlay.state.costume, 'fanous');
  assert.equal(e.overlay.state.sexy, false);
  for (const id of ['ramada', 'eidFitr', 'roshHashana', 'hanukkah', 'diwali', 'vesak']) assert.equal(HOLIDAYS[id].ousada, false, id);
});

test('camada ousada preservada e gesto legado usa nadadeira, sem mão humana', () => {
  const parts = RIG.groups.flatMap((g) => g.parts.map((p) => ({ ...p, group: g })));
  for (const id of ['sexySunga', 'sexyGarter', 'sexyCollar', 'sexyNetFin']) assert.ok(parts.some((p) => p.id === id), id);
  const shorts = RIG.groups.find((g) => g.id === 'shorts');
  assert.ok([].concat(shorts.hideIf).includes('sexy'), 'bermuda some na versão ousada');
  // Diretriz anatômica atual: gesto provocador com nadadeira; nenhum dedo/punho desenhado.
  for (const id of ['handFist', 'handThumb', 'handMiddle', 'handNail', 'handCreases']) assert.equal(parts.some((p) => p.id === id), false, id);
  assert.ok(parts.some(p => p.id === 'armR' && p.path.includes('163,130')), 'nadadeira triangular real');
  const an = new Animator(ANIMS);
  an.play('finger', 0, { restart: true, variant: 'finger' });
  const pose = an.sample(1300).pose;
  assert.equal(pose.finger, 1);
  // Canais preservados para compatibilidade; renderer os retargeta à nadadeira.
  assert.ok(pose.legFR >= 60 && pose.elbowR >= 90, 'receita legada continua animada');
});

test('comida de tubarão: sorteia o que come (às vezes gente), sangra e sempre arrota', () => {
  const e = started();
  e.companion.enterInteraction();
  const kinds = new Set();
  const said = [];
  const origSay = e.companion.say.bind(e.companion);
  e.companion.say = (t, k, o) => {
    said.push(t);
    return origSay(t, k, o);
  };
  for (let i = 0; i < 60; i++) {
    assert.ok(e.companion.interact('eat'));
    e.clock.advance(100);
    assert.equal(e.overlay.state.effect, 'food');
    kinds.add(e.overlay.state.effectKind);
    e.clock.advance(2600);
    assert.ok(said.includes('BUUURP.'), 'arrotou');
    said.length = 0;
    e.clock.advance(1500);
  }
  for (const k of ['peixe', 'foca', 'lula', 'tartaruga', 'pinguim', 'humano']) assert.ok(kinds.has(k), `já comeu ${k}`);
  const phrases = loadJSON('assets/dialogue/pt-BR.json').categories;
  for (const k of kinds) assert.ok(phrases[`food_${k}`], `falas de ${k}`);
});

test('"AVC": de costas fazendo força, segura o peito, cai morto 1 min e volta: "Essa foi por pouco."', async () => {
  const e = started();
  let done = null;
  e.companion.chat('AVC').then((r) => (done = r));
  e.clock.advance(800);
  await flush();
  assert.equal(e.companion.behavior.state, 'avc');
  assert.equal(e.companion.behavior.anim, 'avcStrain');
  e.clock.advance(3600);
  assert.equal(e.companion.behavior.anim, 'avcClutch');
  e.clock.advance(2600);
  assert.equal(e.companion.behavior.anim, 'avcDead', 'morto no chão');
  // Morto não foge do cursor.
  e.env.cursor = { ...e.companion.pos };
  e.clock.advance(30000);
  assert.equal(e.companion.behavior.anim, 'avcDead');
  assert.equal(done, null, 'ainda morto');
  e.clock.advance(31500);
  await flush();
  assert.equal(e.companion.behavior.anim, 'avcRevive', 'voltou à vida');
  e.clock.advance(1600);
  await flush();
  assert.equal(done && done.text, 'Essa foi por pouco.');
  e.clock.advance(1000);
  assert.notEqual(e.companion.behavior.state, 'avc');
});

test('AVC de verdade: resposta séria (SAMU 192 e o João), sem a piada', async () => {
  const e = started();
  for (const msg of ['acho que to tendo um avc', 'estou com sintomas de AVC', 'tô com a boca torta']) {
    const r = await chatAdv(e, msg);
    assert.match(r.text, /192/, msg);
    assert.match(r.text, /João/, msg);
    assert.notEqual(e.companion.behavior.state, 'avc');
  }
  // "avc" no meio de outra frase não dispara a piada.
  const r = await chatAdv(e, 'o que é avc?');
  assert.notEqual(r.action, 'avc');
});
