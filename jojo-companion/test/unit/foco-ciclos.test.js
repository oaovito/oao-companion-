// Timer de foco em ciclos (Pomodoro): blocos seguidos com pausa, tudo visual.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv } from './helpers.js';
import { focusPlan } from '../../src/core/companion.js';

function started() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

function falas(e) {
  const said = [];
  const orig = e.companion.say.bind(e.companion);
  e.companion.say = (t, k, o) => (said.push(t), orig(t, k, o));
  return said;
}

test('plano de ciclos: pomodoro, "x4", "3 ciclos", pausa pedida e limites; sem plano continua bloco único', () => {
  assert.equal(focusPlan(''), null);
  assert.equal(focusPlan('25'), null);
  assert.equal(focusPlan('treino 40'), null);
  assert.deepEqual(focusPlan('pomodoro'), { ciclos: 4, pausaMin: 5, atual: 1 });
  assert.deepEqual(focusPlan('25 x4'), { ciclos: 4, pausaMin: 5, atual: 1 });
  assert.deepEqual(focusPlan('30 pausa 10 3 ciclos'), { ciclos: 3, pausaMin: 10, atual: 1 });
  assert.deepEqual(focusPlan('pomodoro pausa de 60 20 blocos'), { ciclos: 8, pausaMin: 30, atual: 1 });
  assert.equal(focusPlan('1 ciclo'), null);
});

test('foco em ciclos: bloco, pausa sinalizada, próximo bloco sozinho e fim comemorado, sem repetir o aviso do bloco único', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  const r = await chatAdv(e, '/foco 10 x2 pausa 5');
  assert.match(r.text, /2 (ciclos|blocos)/);
  assert.match(r.text, /10 min/);
  e.companion.exitInteraction('test');
  assert.deepEqual(e.companion.focus.plano, { ciclos: 2, pausaMin: 5, atual: 1 });
  assert.equal(e.companion.focus.min, 10, 'a pausa e os ciclos não viram a duração do bloco');
  const said = falas(e);
  e.clock.advance(11 * 60e3);
  assert.equal(e.companion.focus, null, 'bloco 1 terminou');
  assert.ok(e.companion.focusBreak, 'pausa do plano em andamento');
  assert.equal(e.companion.focusBreak.plano.atual, 2);
  assert.ok(said.some((t) => /5 min/.test(t) && /1 de 2|1 de 2\b/.test(t)), `pausa sinalizada: ${said.join(' | ')}`);
  assert.ok(!said.some((t) => /Pausa de 5 min: água e alongamento/.test(t)), 'o aviso do bloco único não aparece no plano');
  assert.equal(e.companion.progress.st.contas.foco, 1);
  e.clock.advance(5 * 60e3 + 1000);
  assert.equal(e.companion.focusBreak, null);
  assert.ok(e.companion.focus, 'bloco 2 começou sozinho');
  assert.equal(e.companion.focus.plano.atual, 2);
  assert.match(e.companion.behavior.anim, /^cat_estudarJunto/);
  e.clock.advance(11 * 60e3);
  assert.equal(e.companion.focus, null);
  assert.equal(e.companion.focusBreak, null, 'depois do último ciclo não há outra pausa');
  assert.equal(e.companion.progress.st.contas.foco, 2);
  assert.ok(said.some((t) => /2 ciclos|2 de 2|os 2 ciclos/.test(t)), `fim comemorado: ${said.join(' | ')}`);
  e.clock.advance(6 * 60e3);
  assert.ok(!said.some((t) => /Mais um bloco\? \/foco/.test(t)), 'sem convite extra depois do plano');
});

test('foco em ciclos: parar na pausa cancela o próximo bloco; Modo Trabalho na pausa não é atropelado', async () => {
  let e = started();
  e.companion.startFocus(5, 'treino', { ciclos: 3, pausaMin: 2, atual: 1 });
  e.clock.advance(6 * 60e3);
  assert.ok(e.companion.focusBreak);
  e.companion.enterInteraction('test');
  const r = await chatAdv(e, '/foco parar');
  assert.match(r.text, /Foco encerrado/);
  assert.equal(e.companion.focusBreak, null);
  e.clock.advance(3 * 60e3);
  assert.equal(e.companion.focus, null, 'nenhum bloco recomeça depois de parar');

  e = started();
  e.companion.startFocus(5, 'estudo', { ciclos: 2, pausaMin: 2, atual: 1 });
  e.clock.advance(6 * 60e3);
  assert.ok(e.companion.focusBreak);
  e.companion.runInterpreted({ cmd: 'trabalho_iniciar', arg: '' }, null, { silent: true });
  assert.ok(e.companion.work);
  assert.equal(e.companion.focusBreak, null);
  e.clock.advance(3 * 60e3);
  assert.equal(e.companion.focus, null, 'o plano antigo não inicia foco por cima do Modo Trabalho');
});

test('foco de bloco único continua igual: mesma resposta e mesma pausa de 5 min', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  const r = await chatAdv(e, '/foco 10');
  assert.match(r.text, /^Foco de 10 min\. Eu estudo aqui do lado, quieto\. Sem Instagram\.$/);
  assert.equal(e.companion.focus.plano, undefined);
  e.companion.exitInteraction('test');
  const said = falas(e);
  e.clock.advance(11 * 60e3);
  assert.equal(e.companion.focusBreak, null);
  assert.ok(said.some((t) => /Bloco concluído/.test(t)));
});
