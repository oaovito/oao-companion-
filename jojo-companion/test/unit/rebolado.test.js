// Rebolado do meme (pedido de 18/11/2026, refeito a partir do GIF): modelo próprio de
// costas em 3/4, o corpo em feijão amassando e esticando em 6 quadros de 40 ms. No foco de vez em quando (desligável em
// Configurações); no repouso continua acontecendo às vezes, com a opção ligada ou não.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeEnv, loadJSON } from './helpers.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { BehaviorMachine, TWERK_IDLE_CHANCE } from '../../src/core/behavior.js';
import { rigComRebolado, GRUPOS_REBOLADO, CICLO } from '../../src/core/rebolado.js';
import { DEFAULTS, sanitize } from '../../src/core/settings-schema.js';

const ANIMS = loadJSON('assets/animations/jojo.animations.json');
const RIG = loadJSON('assets/character/jojo.rig.json');
const ROOM = loadJSON('assets/animations/jojo.room.json');

function at(t) {
  const an = new Animator(ANIMS);
  an.play('twerk', 0, { restart: true });
  return an.sample(ANIMS.animations.twerk.duration * t).pose;
}

test('animação refeita do GIF: 3 s, 25 quadros por segundo, ciclo de 6 quadros de 40 ms amassando o corpo até cobrir as pernas', () => {
  const A = ANIMS.animations.twerk;
  assert.equal(A.duration, 3000);
  assert.equal(A.stepFps, 25, 'mesmo ritmo do GIF (40 ms por quadro)');
  assert.ok(ROOM.anims.twerk, 'espaço da janela para o rebolado');
  assert.equal(at(0).rebolando, 0, 'começa de frente');
  assert.equal(at(0.5).rebolando, 1, 'modelo do rebolado');
  assert.equal(at(0.999).rebolando, 0, 'desvira no fim');
  // Nada da vista de costas do "vai tomar no cu".
  for (const ch of ['mooning', 'gagSize', 'spread']) assert.equal(A.tracks[ch], undefined, ch);
  // Quadro a quadro: o ciclo do GIF.
  const q = (n) => at((n * 40 + 1) / 3000);
  const ciclo = [3, 4, 5, 6, 7, 8].map((n) => [q(n).rbSy, q(n).rbSx, q(n).rbDown]);
  assert.deepEqual(ciclo.map(([y]) => +y.toFixed(2)), CICLO.map((c) => c[0]));
  assert.ok(ciclo[3][0] < 0.75 && ciclo[3][1] > 1.2, 'amassa e alarga no fundo do ciclo');
  assert.ok(ciclo[3][2] >= 10, 'o corpo desce por cima das pernas');
  assert.deepEqual([q(9).rbSy, q(15).rbSy], [q(3).rbSy, q(3).rbSy], 'repete a cada 6 quadros');
});

test('desenho: modelo próprio (não reaproveita a vista de costas) e o resto some enquanto ele rebola', () => {
  const antes = JSON.stringify(RIG);
  const r = rigComRebolado(RIG);
  assert.equal(JSON.stringify(RIG), antes, 'não altera o rig do personagem');
  assert.equal(rigComRebolado(r), r, 'aplicar duas vezes não duplica');
  const novos = r.groups.filter((g) => g.showIf === 'rebolando');
  assert.deepEqual(novos.map((g) => g.id), GRUPOS_REBOLADO.map((g) => g.id));
  const ids = novos.flatMap((g) => g.parts.map((p) => p.id));
  for (const id of ['rbFeijao', 'rbPernaE', 'rbPernaD', 'rbDorsal', 'rbRego', 'rbCranio', 'rbOlho']) assert.ok(ids.includes(id), id);
  assert.ok(ids.every((id) => /^rb/.test(id)), 'nenhuma peça reaproveitada');
  assert.ok(r.groups.filter((g) => g.showIf !== 'rebolando').every((g) => [].concat(g.hideIf).includes('rebolando')), 'todo o resto some');
  const feijao = novos.flatMap((g) => g.parts).find((p) => p.id === 'rbFeijao');
  assert.deepEqual([feijao.scaleXBy, feijao.scaleYBy, feijao.dy], ['rbSx', 'rbSy', 'rbDown']);
  const todas = r.groups.flatMap((g) => g.parts);
  assert.equal(new Set(todas.map((x) => x.id)).size, todas.length, 'ids únicos');
  const cores = new Set(Object.keys(RIG.palette));
  assert.ok(novos.flatMap((g) => g.parts).every((x) => cores.has(x.fill)), 'cores da paleta');
  // Pernas plantadas no chão e nada passa da caixa da janela.
  for (const p of novos.flatMap((g) => g.parts)) {
    for (const seg of p.path.split(/(?=[MLCZQ])/)) {
      const nums = seg.slice(1).split(/[\s,]+/).filter(Boolean).map(Number);
      for (let i = 0; i + 1 < nums.length; i += 2) {
        assert.ok(nums[i] >= 0 && nums[i] <= 184, `${p.id} x=${nums[i]}`);
        assert.ok(nums[i + 1] >= -16 && nums[i + 1] <= 167, `${p.id} y=${nums[i + 1]}`);
      }
    }
  }
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
