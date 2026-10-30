// Proteção absoluta de tela cheia: nada do JoJo aparece por cima de um app em tela cheia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv, TWO_MONITORS_NEG } from './helpers.js';
import { sanitize, migrate } from '../../src/core/settings-schema.js';

function started(opts = {}) {
  const e = makeEnv({ ...opts, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.dateNow = () => new Date(2026, 9, 30, 15);
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

test('some na hora (inclusive no modo de interação, com balão, animação ou reação) e não guarda nada', async () => {
  const e = started();
  const c = e.companion;
  c.enterInteraction('test');
  c.say('Uma fala qualquer no balão.', 'speech');
  c.playPack('pk_bankai', { source: 'comando' });
  c.setFullscreenDisplays([e.env.displays[0].id]);
  assert.equal(e.overlay.visible, false);
  assert.equal(c.interaction, false, 'modo de interação fechado');
  assert.equal(c.bubble, null);
  // Durante a tela cheia: nada aparece nem entra na fila.
  assert.equal(c.say('Oi', 'speech'), false);
  assert.equal(c.playCatalog('selfie', { source: 'comando' }), false);
  assert.equal(c.onForeground({ instagram: true }), false);
  assert.equal(c.enterInteraction('hotkey'), false, 'atalho não abre por cima');
  e.clock.advance(60e3);
  assert.equal(e.overlay.visible, false);
  assert.equal(c.ambientQueue.length, 0);
  c.setFullscreenDisplays([]);
  assert.equal(e.overlay.visible, true);
  assert.equal(c.ambientQueue.length, 0, 'sem reações acumuladas');
});

test('Modo Trabalho: some na tela cheia e volta meditando', () => {
  const e = started();
  const c = e.companion;
  c.startWork();
  e.clock.advance(5000);
  c.setFullscreenDisplays([e.env.displays[0].id]);
  assert.equal(e.overlay.visible, false);
  c.setFullscreenDisplays([]);
  e.clock.advance(1000);
  assert.equal(e.overlay.visible, true);
  assert.equal(c.behavior.state, 'meditate');
});

test('vários monitores: protege o monitor do JoJo; não vai para o monitor em tela cheia; "todos" some sempre', () => {
  const e = started({ displays: TWO_MONITORS_NEG });
  const c = e.companion;
  const meu = c._currentDisplay();
  const outro = e.env.displays.find((d) => d.id !== meu.id);
  c.setFullscreenDisplays([outro.id]);
  assert.equal(e.overlay.visible, true, 'tela cheia no outro monitor: continua');
  assert.deepEqual(c._allowedAreas().map((a) => a.id), [meu.id], 'não anda/foge para o monitor em tela cheia');
  e.store.update({ fullscreenBehavior: 'hideAll' });
  c.setFullscreenDisplays([]);
  c.setFullscreenDisplays([outro.id]);
  assert.equal(e.overlay.visible, false, 'opção global: some de todos');
});

test('configuração: não existe opção para cobrir tela cheia (pausar/ignorar viram ocultar)', () => {
  for (const v of ['pause', 'ignore']) assert.equal(sanitize(migrate({ version: 3, fullscreenBehavior: v })).settings.fullscreenBehavior, 'hide');
  assert.equal(sanitize({ fullscreenBehavior: 'ignore' }).settings.fullscreenBehavior, 'hide');
  assert.equal(sanitize({ fullscreenBehavior: 'hideAll' }).settings.fullscreenBehavior, 'hideAll');
});

test('percepção de tela: só o tipo do app (sem captura), raro, nunca em tela cheia nem no Modo Trabalho', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { categoriaApp } = require('../../src/main/fullscreen-worker.cjs');
  assert.equal(categoriaApp('WINWORD.EXE'), 'escritorio');
  assert.equal(categoriaApp('steam.exe'), 'jogo');
  assert.equal(categoriaApp('MNE_Lab.exe'), 'mnelab');
  assert.equal(categoriaApp('notepad.exe'), 'outro');
  const { DEFAULTS } = await import('../../src/core/settings-schema.js');
  assert.equal(DEFAULTS.percepcaoTela, false, 'desligada por padrão');
  const e = started();
  const c = e.companion;
  assert.equal(c.onAppCategoria('escritorio'), true);
  assert.equal(c.onAppCategoria('escritorio'), false, 'mesmo app: nada');
  c.onAppCategoria(null);
  e.clock.advance(60e3);
  assert.equal(c.onAppCategoria('codigo'), false, 'no máximo uma reação a cada 5 min');
  c.setFullscreenDisplays([e.env.displays[0].id]);
  c.onAppCategoria(null);
  e.clock.advance(10 * 60e3);
  assert.equal(c.onAppCategoria('jogo'), false, 'tela cheia: nada');
  c.setFullscreenDisplays([]);
  c.startWork();
  c.onAppCategoria(null);
  assert.equal(c.onAppCategoria('video'), false, 'Modo Trabalho: nada');
});
