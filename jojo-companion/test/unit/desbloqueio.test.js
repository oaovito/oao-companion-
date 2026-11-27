// Desbloqueios na tela (pedido do João, 27/11/2026): tudo que é liberado aparece com animação,
// carimbo DESBLOQUEADO com o nome e fala; se agora não dá (Trabalho), espera e mostra depois.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv } from './helpers.js';
import { DESBLOQUEIO_MS, ITEM_DESBLOQUEIO } from '../../src/core/companion-desbloqueio.js';

function pronto() {
  const e = makeEnv({ settings: { tutorialVisto: true } });
  e.companion.start();
  e.clock.advance(3000);
  e.companion.hideBubble?.();
  return e;
}

test('cerimônia própria no catálogo: 5,2 s, começa e termina no repouso', () => {
  assert.equal(ITEM_DESBLOQUEIO.duracao, DESBLOQUEIO_MS);
  for (const keys of Object.values(ITEM_DESBLOQUEIO.faixas)) {
    assert.equal(keys[0][0], 0);
    assert.equal(keys.at(-1)[0], 1);
  }
});

test('desbloqueio mostra animação, carimbo com o nome no estado do overlay e a fala', () => {
  const e = pronto();
  const c = e.companion;
  assert.ok(c.catalogById.has('desbloqueio'));
  assert.equal(c.celebrarDesbloqueio({ nome: 'Chapéu de palha', fala: 'Liberei o chapéu.' }), true);
  c._applyLayout(true);
  assert.equal(e.overlay.state.desbloqueio?.nome, 'Chapéu de palha');
  assert.equal(c.ambientItem?.id, 'desbloqueio');
  e.clock.advance(DESBLOQUEIO_MS + 200);
  c._applyLayout(true);
  assert.equal(e.overlay.state.desbloqueio, null, 'some depois do carimbo');
  c.stop?.();
});

test('no Modo Trabalho nada aparece: o desbloqueio espera e aparece quando ele sai', () => {
  const e = pronto();
  const c = e.companion;
  c._enterWork('trabalho', { silent: true, instant: true });
  assert.equal(c.celebrarDesbloqueio({ nome: 'Segredo: Porta dos fundos', fala: 'Segredo!' }), false);
  assert.equal(c._desbloqueiosPendentes.length, 1);
  c.endWork();
  let visto = null;
  for (let i = 0; i < 70 && !visto; i++) { c.bubble = null; e.clock.advance(1000); c._applyLayout(true); visto = e.overlay.state.desbloqueio?.nome; }
  assert.equal(visto, 'Segredo: Porta dos fundos');
  assert.equal(c._desbloqueiosPendentes.length, 0);
  c.stop?.();
});

test('vários desbloqueios em seguida: um carimbo por vez, na ordem', () => {
  const e = pronto();
  const c = e.companion;
  c._carimbo('Nível 5: Tubarão de respeito');
  c._carimbo('Acessório: Medalha');
  c._applyLayout(true);
  assert.equal(e.overlay.state.desbloqueio?.nome, 'Nível 5: Tubarão de respeito');
  e.clock.advance(DESBLOQUEIO_MS + 1500);
  c._applyLayout(true);
  assert.equal(e.overlay.state.desbloqueio?.nome, 'Acessório: Medalha');
  c.stop?.();
});

test('progresso: título do nível, acessórios dos níveis passados e conquistas viram carimbo', () => {
  const e = pronto();
  const c = e.companion;
  c._nivelCarimbado = 2;
  const lista = c._liberadosNoProgresso({ nivel: 3, nome: 'Peixe grande' }, [{ nome: 'Primeira conversa' }]);
  assert.equal(lista[0], 'Nível 3: Peixe grande');
  assert.ok(lista.includes('Acessório: Medalha'), JSON.stringify(lista));
  assert.ok(lista.includes('Conquista: Primeira conversa'));
  c.stop?.();
});
