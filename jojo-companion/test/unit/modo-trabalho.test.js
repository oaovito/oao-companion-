// Modo Trabalho: o JoJo medita quieto no canto, sem nenhuma distração.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv } from './helpers.js';
import { interpretCommand } from '../../src/core/dialogue/intencoes.js';

function started(opts = {}) {
  const e = makeEnv({ ...opts, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false }, ...(opts.profile || {}) } });
  e.companion.dateNow = () => new Date(2026, 9, 30, 14);
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}
const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};

test('ativar: vai ao canto, fica pequeno e meio transparente, medita (não dorme)', async () => {
  const e = started();
  await chatAdv(e, '/trabalho');
  e.clock.advance(5000);
  const c = e.companion;
  assert.equal(c.behavior.state, 'meditate');
  assert.notEqual(c.behavior.sleeping, true);
  assert.equal(e.overlay.state.anim, 'meditate');
  assert.equal(e.overlay.state.work, 'trabalho');
  assert.equal(e.overlay.state.opacity, 0.65);
  assert.ok(Math.abs(e.overlay.state.scale - e.store.get().size * 0.35) < 1e-9);
  const v = c._rects().visual;
  const wa = e.env.displays[0].workArea;
  assert.ok(Math.abs(v.x + v.width - (wa.x + wa.width - 16)) < 2 && Math.abs(v.y + v.height - (wa.y + wa.height - 16)) < 2, 'canto inferior direito');
});

test('silêncio total: Instagram, comida, João, lembretes, raros, ociosidade e LoL não fazem nada', async () => {
  const e = started();
  const c = e.companion;
  c.startWork();
  e.clock.advance(5000);
  const said = [];
  const orig = c.say.bind(c);
  c.say = (t, k, o) => {
    const ok = orig(t, k, o);
    if (ok) said.push(t);
    return ok;
  };
  assert.equal(c.onForeground({ instagram: true }), false);
  assert.equal(c.playCatalog('selfie'), false);
  assert.equal(c.react('angry'), false);
  c.onSystemIdle(9999);
  c.onForeground({ lol: true });
  assert.ok(!c.lolLeaving, 'sem reação ao LoL');
  assert.equal(c.sayCategory('greeting', { force: true }), false);
  c.behavior.rareRng = () => 0; // nem o 1 em 1 bilhão
  for (let i = 0; i < 600; i++) e.clock.advance(1000);
  assert.equal(c.behavior.state, 'meditate');
  assert.deepEqual(said, []);
  assert.equal(c.ambientQueue.length, 0);
  // Cursor perto: não foge do canto, só some quase todo.
  const pos = { ...c.pos };
  const v = c._rects().visual;
  e.env.cursor = { x: v.x + v.width / 2, y: v.y + v.height / 2 };
  e.clock.advance(500);
  assert.deepEqual(c.pos, pos);
  assert.equal(c.opacity, 0.1);
});

test('chat durante o trabalho: responde no chat sem animação e continua meditando; não abre jogo sozinho', async () => {
  const e = started();
  const c = e.companion;
  c.startWork();
  e.clock.advance(5000);
  const r = await chatAdv(e, 'vou pedir uma pizza');
  assert.ok(r.text);
  assert.equal(c.behavior.state, 'meditate');
  assert.equal(c.game, null);
});

test('sair: "terminei de trabalhar" volta ao normal sem reações acumuladas; perfis deep e invisível', async () => {
  const e = started();
  const c = e.companion;
  await chatAdv(e, 'jojo, preciso me concentrar');
  e.clock.advance(4000);
  assert.ok(c.work);
  c.onForeground({ instagram: true });
  let r = await chatAdv(e, 'terminei de trabalhar');
  assert.equal(r.intent, 'comando');
  assert.equal(c.work, null);
  assert.equal(c.opacity, 1);
  assert.equal(c.ambientQueue.length, 0);
  assert.equal(e.store.get().trabalhoAtivo, false);
  e.clock.advance(3000);
  assert.notEqual(c.behavior.state, 'meditate');
  c.startWork({ perfil: 'deep' });
  e.clock.advance(4000);
  assert.equal(e.overlay.state.opacity, 0.4);
  c.endWork();
  c.startWork({ perfil: 'invisivel' });
  assert.equal(e.overlay.visible, false);
  assert.equal(c.workHidden, true);
  r = await chatAdv(e, 'pode voltar');
  assert.equal(c.work, null);
  assert.equal(e.overlay.visible, true);
});

test('reabrir o app no Modo Trabalho: volta meditando, sem cumprimento', async () => {
  const e = started();
  e.companion.startWork();
  e.store.flush && e.store.flush();
  const e2 = makeEnv({ dir: e.dir, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  const said = [];
  const orig = e2.companion.say.bind(e2.companion);
  e2.companion.say = (t, k, o) => (said.push(t), orig(t, k, o));
  e2.companion.start();
  e2.clock.advance(5000);
  await flush();
  assert.ok(e2.companion.work);
  assert.equal(e2.companion.behavior.state, 'meditate');
  assert.deepEqual(said, [], 'volta em silêncio');
});

test('temporizador: ao acabar, só marca na Central e continua meditando', async () => {
  const e = started();
  const c = e.companion;
  c.startWork({ min: 25 });
  e.clock.advance(4000);
  e.store.update({ trabalhoFim: Date.now() - 1000 });
  assert.equal(c._checkWorkTimer(), true);
  assert.equal(c.behavior.state, 'meditate');
  assert.equal(c.conversations.get('trabalho').status, 'ready');
});

test('frases: entrar e sair do Modo Trabalho de qualquer jeito', () => {
  for (const t of ['jojo, vou trabalhar', 'modo trabalho', 'preciso me concentrar', 'hora de estudar', 'ativa o deep focus']) assert.equal(interpretCommand(t).cmd, 'trabalho_iniciar', t);
  assert.equal(interpretCommand('ativa o deep focus').arg.startsWith('deep'), true);
  for (const t of ['pode voltar', 'terminei de trabalhar', 'jojo, volta']) assert.equal(interpretCommand(t, { trabalho: true }).cmd, 'trabalho_parar', t);
  assert.equal(interpretCommand('não vou trabalhar hoje'), null);
});
