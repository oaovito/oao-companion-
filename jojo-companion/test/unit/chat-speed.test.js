// Conversa: resposta demorando mostra "…" (pensando) e some quando a resposta chega.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv } from './helpers.js';

const flush = async () => {
  for (let k = 0; k < 8; k++) await Promise.resolve();
};

test('resposta lenta: balão de pensamento "…" enquanto espera', async () => {
  const e = makeEnv();
  e.companion.start();
  e.clock.advance(2000);
  let release;
  e.companion.dialogue = {
    reply: () => new Promise((r) => (release = r)),
    describe: () => ({ id: 'x' }),
  };
  const p = e.companion.chat('me conta uma coisa');
  for (let i = 0; i < 10; i++) {
    e.clock.advance(250);
    await flush();
  }
  assert.equal(e.companion.bubble && e.companion.bubble.text, '…');
  assert.equal(e.companion.bubble.kind, 'thought');
  release({ text: 'Pronto. Rápido o bastante?', action: null, tone: 'serio' });
  await flush();
  await p;
  assert.ok(!e.companion.bubble || e.companion.bubble.text !== '…', 'o "…" some com a resposta');
});
