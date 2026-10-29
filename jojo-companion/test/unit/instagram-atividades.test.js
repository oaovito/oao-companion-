// Bronca do Instagram em qualquer atividade: animação, rotina, jogo, foco,
// chat aberto, dormindo, supino… e sem se perder quando ele está fugindo do cursor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv } from './helpers.js';

function started() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

async function flush() {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}

const ATIVIDADES = {
  repouso: () => {},
  animacaoAmbiente: (e) => e.companion.playCatalog('selfie', { source: 'ambiente' }),
  animacaoPedida: (e) => e.companion.playCatalog('modoFera', { source: 'comando' }),
  supino: (e) => e.companion.behavior.request('benchPress', { now: e.clock.now(), force: true }),
  dormindo: (e) => e.companion.behavior.request('sleep', { now: e.clock.now(), force: true }),
  sentado: (e) => e.companion.behavior.request('sit', { now: e.clock.now(), force: true }),
  falando: (e) => e.companion.say('Uma fala qualquer ocupando o balão agora.', 'speech'),
  foco: (e) => e.companion.startFocus(25, 'estudo'),
  chatAberto: (e) => e.companion.enterInteraction('test'),
  rebolando: (e) => e.companion.behavior.request('moon', { now: e.clock.now(), force: true }),
  jogo: (e) => {
    e.companion.enterInteraction('t');
    e.companion.startGame('quiz');
    e.companion.exitInteraction('t');
  },
};

for (const [nome, setup] of Object.entries(ATIVIDADES)) {
  test(`Instagram: bronca com fala e cara de julgamento durante "${nome}"`, async () => {
    const e = started();
    setup(e);
    e.clock.advance(300);
    await flush();
    assert.equal(e.companion.onForeground({ instagram: true }), true);
    await flush();
    assert.equal(e.companion.behavior.state, 'judge');
    assert.equal(e.companion.bubble && e.companion.bubble.category, 'instagram');
    // A fala da bronca não é atropelada (nem pelo "acordei").
    e.clock.advance(1200);
    await flush();
    assert.equal(e.companion.bubble && e.companion.bubble.category, 'instagram');
  });
}

test('Instagram: fugindo do cursor a bronca espera e sai na próxima checagem (não perde 2 min)', async () => {
  const e = started();
  e.companion.avoid.state = 'fleeing';
  assert.equal(e.companion.onForeground({ instagram: true }), false);
  e.companion.avoid.state = 'idle';
  e.clock.advance(1500);
  assert.equal(e.companion.onForeground({ instagram: true }), true);
  await flush();
  assert.equal(e.companion.bubble && e.companion.bubble.category, 'instagram');
  // Cooldown normal depois que a bronca saiu.
  e.clock.advance(1500);
  assert.equal(e.companion.onForeground({ instagram: true }), false);
});

test('Instagram: terceira bronca em 20 min vira raiva; modo silencioso continua sem bronca', async () => {
  const e = started();
  for (let i = 0; i < 3; i++) {
    assert.equal(e.companion.onForeground({ instagram: true }), true);
    await flush();
    e.clock.advance(130e3);
  }
  assert.equal(e.companion.instagramScolds.length, 3);
  const q = started();
  q.store.update({ quietMode: true });
  assert.equal(q.companion.onForeground({ instagram: true }), false);
});
