// Rebolado do meme (pedido de 18/11/2026): de costas, 3 s, nádegas alternando com
// amassa-estica, mãos nos joelhos. No foco de vez em quando (desligável em
// Configurações); no repouso continua acontecendo às vezes, com a opção ligada ou não.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeEnv, loadJSON } from './helpers.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { BehaviorMachine, TWERK_IDLE_CHANCE } from '../../src/core/behavior.js';
import { rigComRebolado } from '../../src/core/rebolado.js';
import { DEFAULTS, sanitize } from '../../src/core/settings-schema.js';

const ANIMS = loadJSON('assets/animations/jojo.animations.json');
const RIG = loadJSON('assets/character/jojo.rig.json');
const ROOM = loadJSON('assets/animations/jojo.room.json');

function at(t) {
  const an = new Animator(ANIMS);
  an.play('twerk', 0, { restart: true });
  return an.sample(ANIMS.animations.twerk.duration * t).pose;
}

test('animação: 3 s de costas, sem prolapso, nádegas alternando com amassa-estica, corpo quicando e balançando', () => {
  const A = ANIMS.animations.twerk;
  assert.equal(A.duration, 3000);
  assert.ok(ROOM.anims.twerk, 'espaço da janela para o rebolado');
  assert.equal(at(0).mooning, 0, 'começa de frente');
  assert.equal(at(0.5).mooning, 1, 'de costas');
  assert.equal(at(0.5).twerking, 1, 'mãos nos joelhos');
  assert.equal(at(0.995).mooning, 0, 'desvira no fim');
  assert.ok(at(0.035).squashX < 0.6, 'vira no estilo recorte de papel');
  // Quadro a quadro (12 fps): as nádegas trocam de lado a cada quadro, sem prolapso nenhum.
  const F = 1000 / 12 / 3000;
  const quadros = Array.from({ length: 24 }, (_, i) => at((6 + i) * F + 0.0001));
  assert.ok(quadros.every((p) => (p.gagSize || 0) === 0 && (p.spread || 0) === 0), 'sem prolapso nem mãos abrindo');
  const altos = quadros.filter((p) => p.twerkL > 5 && p.twerkR < -3).length;
  const baixos = quadros.filter((p) => p.twerkR > 5 && p.twerkL < -3).length;
  assert.ok(altos >= 5 && baixos >= 5, `alterna os lados (${altos}/${baixos})`);
  assert.ok(quadros.some((p) => p.twerkSqL < 0.85) && quadros.some((p) => p.twerkSqL > 1.1), 'amassa e estica');
  assert.ok(quadros.some((p) => p.rootY >= 6) && quadros.some((p) => p.rootY <= 4), 'o corpo quica');
  const lados = new Set(quadros.map((p) => Math.sign(Math.round(p.rootRot))));
  assert.ok(lados.has(1) && lados.has(-1), 'balança de um lado pro outro');
  assert.ok(quadros.every((p) => p.twerkBig > 1.1), 'nádegas maiores durante o rebolado');
});

test('desenho: rig original intacto; cópia com nádegas animadas, rego e mãos nos joelhos', () => {
  const antes = JSON.stringify(RIG);
  const r = rigComRebolado(RIG);
  assert.equal(JSON.stringify(RIG), antes, 'não altera o rig do personagem');
  assert.equal(rigComRebolado(r), r, 'aplicar duas vezes não duplica');
  const partes = r.groups.flatMap((g) => g.parts);
  const p = (id) => partes.find((x) => x.id === id);
  assert.equal(p('moonCheekL').dy, 'twerkL');
  assert.equal(p('moonCheekR').dy, 'twerkR');
  assert.equal(p('moonCheekL').scaleYBy, 'twerkSqL');
  for (const id of ['moonHandL', 'moonHandR', 'moonForeL', 'moonForeR']) assert.ok([].concat(p(id).hideIf).includes('twerking'), id);
  const joelhos = r.groups.find((g) => g.id === 'twerkHands');
  assert.equal(joelhos.showIf, 'twerking');
  for (const id of ['twerkHandL', 'twerkHandR', 'twerkCrack', 'twerkShineL', 'twerkShineR']) assert.ok(p(id), id);
  assert.equal(new Set(partes.map((x) => x.id)).size, partes.length, 'ids únicos');
  const cores = new Set(Object.keys(RIG.palette));
  assert.ok(r.groups.filter((g) => /^twerk/.test(g.id)).flatMap((g) => g.parts).every((x) => cores.has(x.fill)), 'cores da paleta');
  const iMaos = r.groups.findIndex((g) => g.id === 'moonHandsGroup');
  assert.equal(r.groups[iMaos + 1].id, 'twerkHands', 'mãos dos joelhos no lugar das que seguram as nádegas');
});

test('repouso: com liberação do companion, às vezes escolhe rebolar; sem liberação, nunca', () => {
  assert.ok(TWERK_IDLE_CHANCE > 0 && TWERK_IDLE_CHANCE <= 0.1, 'de vez em quando');
  const b = new BehaviorMachine({ rng: () => 0, rareRng: () => 1 });
  assert.equal(b.pickAuto({ twerkOk: true }), 'twerk');
  assert.notEqual(b.pickAuto({ twerkOk: false }), 'twerk');
  assert.notEqual(b.pickAuto({ twerkOk: true, paused: true }), 'twerk');
  assert.equal(b.pickAuto({ twerkOk: true, work: true }), 'meditate', 'Modo Trabalho não rebola');
});

function started(settings = {}) {
  const e = makeEnv({ settings, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

test('foco: rebola 3 s de vez em quando e volta ao foco sozinho', () => {
  const e = started();
  try {
    assert.equal(e.store.get().reboladoFoco, true, 'ligado por padrão');
    e.companion.lastTwerkAt = -Infinity;
    e.companion.startFocus(25, 'estudo');
    e.companion.rng = () => 0.05;
    e.clock.advance(60e3);
    assert.notEqual(e.companion.behavior.state, 'twerk', 'não logo no começo do bloco');
    e.clock.advance(60e3);
    assert.equal(e.companion.behavior.state, 'twerk', 'rebolou no foco');
    e.clock.advance(3200);
    assert.notEqual(e.companion.behavior.state, 'twerk', 'só 3 s');
    e.clock.advance(200);
    assert.match(e.companion.behavior.anim || '', /^cat_(estudarJunto|foco)/, 'voltou ao foco');
    // Intervalo mínimo: não rebola de novo no minuto seguinte.
    e.clock.advance(60e3);
    assert.notEqual(e.companion.behavior.state, 'twerk');
  } finally {
    e.companion.stop();
  }
});

test('opção desligada: nada de rebolado no foco, mas no repouso continua liberado', () => {
  const e = started({ reboladoFoco: false });
  try {
    e.companion.startFocus(25, 'treino');
    e.companion.rng = () => 0.05;
    for (let i = 0; i < 12; i++) {
      e.clock.advance(60e3);
      assert.notEqual(e.companion.behavior.state, 'twerk', `minuto ${i + 1}`);
    }
    e.companion._endFocus(false);
    assert.equal(e.companion._behaviorContext().twerkOk, true, 'no repouso o rebolado continua');
    e.companion.startWork();
    assert.equal(e.companion._behaviorContext().twerkOk, false, 'Modo Trabalho bloqueia');
  } finally {
    e.companion.stop();
  }
});

test('repouso no companion: depois de rebolar, espera um bom tempo antes de liberar de novo', () => {
  const e = started();
  try {
    e.companion.lastTwerkAt = -Infinity; // o repouso pode ter rebolado sozinho no começo
    assert.equal(e.companion._behaviorContext().twerkOk, true);
    e.companion.behavior.request('twerk', { now: e.clock.now(), force: true });
    assert.equal(e.companion._behaviorContext().twerkOk, false, 'acabou de rebolar');
    e.companion.lastTwerkAt = e.clock.now() - 19 * 60e3;
    assert.equal(e.companion._behaviorContext().twerkOk, false, '19 min ainda não');
    e.companion.lastTwerkAt = e.clock.now() - 21 * 60e3;
    assert.equal(e.companion._behaviorContext().twerkOk, true, 'depois de ~20 min libera de novo');
    e.companion.reducedMotion = true;
    assert.equal(e.companion._behaviorContext().twerkOk, false, 'movimento reduzido não rebola');
  } finally {
    e.companion.stop();
  }
});

test('configuração: reboladoFoco é booleana, ligada por padrão e aparece em Movimento e mouse', () => {
  assert.equal(DEFAULTS.reboladoFoco, true);
  assert.equal(sanitize({ reboladoFoco: false }).settings.reboladoFoco, false);
  assert.equal(sanitize({ reboladoFoco: 'sim' }).settings.reboladoFoco, true);
  const html = fs.readFileSync(new URL('../../src/renderer/settings/index.html', import.meta.url), 'utf8');
  const mov = html.slice(html.indexOf('Movimento e mouse'), html.indexOf('</fieldset>', html.indexOf('Movimento e mouse')));
  assert.match(mov, /name="reboladoFoco"/);
});
