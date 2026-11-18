// Pegadinha semanal (pedido de 18/11/2026): consolo gigante cai na cabeça do JoJo, traumatismo
// craniano de desenho, uma vez por semana em momento sorteado, também no foco; depois uma hora
// enfaixado. Modo Trabalho e tela cheia continuam mandando (espera).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, loadJSON } from './helpers.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { rigComDildo, GRUPOS_DILDO, ATADURA_MS } from '../../src/core/dildo.js';

const ANIMS = loadJSON('assets/animations/jojo.animations.json');
const RIG = loadJSON('assets/character/jojo.rig.json');

test('animação: cai do alto, bate na cabeça, galo, olhos em X, estrelas, cai tonto, levanta enfaixado e o consolo rola pro chão', () => {
  const A = ANIMS.animations.dildo;
  const at = (t) => { const an = new Animator(ANIMS); an.play('dildo', 0, { restart: true }); return an.sample(A.duration * t).pose; };
  assert.ok(at(0.02).dlY < -150, 'começa lá em cima');
  assert.ok(Math.min(...[0.15, 0.16, 0.17, 0.18].map((x) => Math.abs(at(x).dlY))) < 12, 'bate na cabeça');
  assert.ok(Math.min(...[0.18, 0.19, 0.2, 0.21].map((x) => at(x).squashY)) < 0.85, 'amassa com a pancada');
  assert.equal(at(0.3).eyeX, 1, 'olhos em X');
  assert.equal(at(0.3).dildoTonto, 1, 'estrelinhas');
  assert.ok(at(0.25).dlGaloK > 1, 'galo inchando');
  assert.ok(at(0.5).rootRot < -15, 'cai tonto');
  assert.equal(at(0.8).dildoAtadura, 1, 'levanta enfaixado');
  assert.ok(at(0.8).dlY > 150 && at(0.8).dlX > 50, 'o consolo rolou pro chão, do lado');
  // Rig: cópia com as peças, nada no arquivo do personagem.
  const antes = JSON.stringify(RIG);
  const r = rigComDildo(RIG);
  assert.equal(JSON.stringify(RIG), antes);
  for (const g of GRUPOS_DILDO) assert.ok(r.groups.some((x) => x.id === g.id && x.showIf), g.id);
  const cores = new Set(Object.keys(RIG.palette));
  assert.ok(GRUPOS_DILDO.flatMap((g) => g.parts).every((p) => /^#[0-9a-f]{6}$/i.test(p.fill) || cores.has(p.fill)));
});

function started() {
  const e = makeEnv({ settings: { speechFrequency: 'off' }, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.clock.advance(3000);
  return e;
}

test('uma vez por semana, em momento sorteado; também no foco; Modo Trabalho espera; depois uma hora enfaixado', () => {
  const e = started();
  try {
    const c = e.companion;
    // Domingo 20h da semana do relógio de teste (sexta 30/10/2026): o momento já passou → entrega agora.
    const dom = new Date(2026, 10, 1, 20, 0);
    c.rng = () => 0;
    c.startWork();
    assert.equal(c.checkWeeklyDildo(dom), false, 'Modo Trabalho: espera');
    c.endWork();
    c.startFocus(25, 'estudo');
    assert.equal(c.checkWeeklyDildo(dom), true, 'no foco acontece');
    assert.equal(c.behavior.state, 'dildo');
    assert.equal(c.checkWeeklyDildo(dom), false, 'só uma vez na semana');
    e.clock.advance(6600);
    assert.notEqual(c.behavior.state, 'dildo');
    assert.equal(c._visualCanais()?.dildoAtadura, 1, 'enfaixado depois');
    e.clock.advance(ATADURA_MS + 1000);
    assert.equal(c._visualCanais()?.dildoAtadura, undefined, 'tira a atadura depois de uma hora');
    // Semana seguinte: de novo.
    assert.equal(c.checkWeeklyDildo(new Date(2026, 10, 8, 20, 0)), true);
    // Depois da primeira vez fica nas animações liberadas.
    assert.ok(c.animacoesLiberadas().some((a) => a.id === 'consolo'));
  } finally {
    e.companion.stop();
  }
});

test('antes da primeira vez a pegadinha não aparece nas animações liberadas', () => {
  const e = started();
  try {
    assert.ok(!e.companion.animacoesLiberadas().some((a) => a.id === 'consolo'));
    assert.match(e.companion.runCommand('anim', null, '/anim consolo').text, /não tenho/);
  } finally {
    e.companion.stop();
  }
});
