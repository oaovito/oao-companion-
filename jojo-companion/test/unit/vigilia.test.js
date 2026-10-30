// Regra de vigília: das 6h às 21h o JoJo não dorme (estado interno, não só a animação).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv } from './helpers.js';
import { BehaviorMachine } from '../../src/core/behavior.js';
import { sleepAllowed } from '../../src/core/dialogue/scripted-provider.js';
import { SLEEP_ANIMS } from '../../src/core/catalog/variety.js';

const at = (h, m = 0) => new Date(2026, 9, 30, h, m);

test('horários: 5:59 pode, 6:00 não, 12h, 18h, 20:59 não, 21:00 pode', () => {
  assert.equal(sleepAllowed(at(5, 59)), true);
  assert.equal(sleepAllowed(at(6, 0)), false);
  assert.equal(sleepAllowed(at(12)), false);
  assert.equal(sleepAllowed(at(18)), false);
  assert.equal(sleepAllowed(at(20, 59)), false);
  assert.equal(sleepAllowed(at(21, 0)), true);
});

test('máquina de estados: pedido de sono vira repouso acordado; sorteio nunca escolhe dormir de dia', () => {
  const bm = new BehaviorMachine({ rng: Math.random, canSleep: () => false });
  bm.request('sleep', { now: 0, force: true });
  assert.equal(bm.state, 'idle');
  for (let i = 0; i < 2000; i++) assert.notEqual(bm.pickAuto({ sleepiness: 1 }), 'sleep');
  let pode = true;
  const noite = new BehaviorMachine({ canSleep: () => pode });
  noite.request('sleep', { now: 0, force: true });
  assert.equal(noite.state, 'sleep');
  pode = false; // deu 6h
  assert.equal(noite.wakeIfForbidden(1000), true);
  noite.tick(1000);
  assert.notEqual(noite.sleeping, true);
});

function started(hora) {
  let d = at(hora);
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.dateNow = () => d;
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return { e, set: (h, m = 0) => (d = at(h, m)) };
}

test('companion: inatividade longa de dia não dorme; à noite pode; às 6h acorda', () => {
  const { e, set } = started(14);
  for (let i = 0; i < 1200; i++) {
    e.clock.advance(1000);
    assert.notEqual(e.companion.behavior.state, 'sleep', 'dormiu de dia');
    if (e.companion.behavior.state === 'ambient') assert.ok(!SLEEP_ANIMS.has(e.companion.ambientItem && e.companion.ambientItem.id));
  }
  assert.equal(e.companion.playCatalog('cochilar'), false, 'nem pedindo');
  set(23);
  e.companion.behavior.request('sleep', { now: e.clock.now(), force: true });
  assert.equal(e.companion.behavior.state, 'sleep');
  set(6, 0);
  e.clock.advance(61e3); // checagem de cada minuto
  assert.notEqual(e.companion.behavior.state, 'sleep');
});

test('companion: chat "vou dormir" de dia → bravo; ação de dormir vinda da conversa não dorme', async () => {
  const { e } = started(15);
  e.companion.enterInteraction('test');
  e.companion._doChatAction('sleep', e.clock.now());
  assert.notEqual(e.companion.behavior.state, 'sleep');
});
