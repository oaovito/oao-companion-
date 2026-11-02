import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeEnv, loadJSON } from './helpers.js';
import { createLivingService } from '../../src/main/living-service.js';
const items = loadJSON('assets/catalog/living-interactions.json').itens;
const commands = ['Encena Buff de café', 'Encena Protagonista do prazo', 'Encena Policial'];
function setup(t, extra = {}) {
  const e = makeEnv({ settings: { iaAtivo: false, webSearch: false } });
  e.companion.start(); e.env.cursor = { x: 5, y: 5 }; e.clock.advance(3000);
  e.companion.behavior.request('idle', { now: e.clock.now(), force: true });
  const service = createLivingService({ userData: e.dir, companion: e.companion, store: e.store, items, ...extra });
  t.after(() => { service.dispose(); e.companion.stop(); e.store.flush(); e.personality.flush(); fs.rmSync(e.dir, { recursive: true, force: true }); });
  return { ...e, service };
}
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
test('cenas explícitas: os três comandos reais iniciam receita própria, mesmo no silêncio de interrupções espontâneas', async t => {
  const e = setup(t); e.store.update({ quietMode: true });
  e.store.update({ paused: true }); e.companion.behavior.request('paused', { now: e.clock.now(), force: true });
  for (const text of commands) {
    e.companion.behavior.request('idle', { now: e.clock.now(), force: true });
    const result = await e.companion.livingChat(text); assert.equal(result.status, 'executed', text);
    assert.match(e.companion.behavior.anim, new RegExp(`^cat_${result.itemId}`));
  }
});
test('cenas: cooldown, foco, asset ausente, relógio e renderer têm causas próprias sem falso fullscreen', async t => {
  const e = setup(t);
  assert.equal((await e.companion.livingChat(commands[0])).status, 'executed');
  assert.equal((await e.companion.livingChat(commands[0])).status, 'cooldown');
  e.companion.startFocus(); assert.equal((await e.companion.livingChat(commands[1])).status, 'focus_blocked'); e.companion._endFocus(false);
  e.companion.startFocus(); assert.equal(e.companion.playCatalog('selfie', { source: 'comando' }), false, 'pedido genérico também não supera Foco'); e.companion._endFocus(false);
  e.companion.catalogById.delete('living_policial'); assert.equal((await e.companion.livingChat(commands[2])).status, 'missing_asset');
  const other = setup(t, { confirmAnimation: async () => false });
  assert.equal((await other.companion.livingChat(commands[1])).status, 'renderer_error');
  assert.equal(other.service.model.st.recent.length, 0); assert.equal(other.companion.behavior.state, 'idle');
});
test('cenas: pedido aguardando fullscreen recupera sozinho, duplicatas não multiplicam e outra tela não bloqueia', async t => {
  const e = setup(t); e.companion.fullscreenHidden = true;
  const queued = await e.companion.livingChat(commands[0]); assert.equal(queued.status, 'queued'); assert.equal(queued.reason, 'fullscreen_blocked');
  await e.companion.livingChat(commands[0]); assert.equal(e.service.snapshot().queued.length, 1);
  e.companion.fullscreenHidden = false; e.companion.fullscreenIds = ['outro-monitor'];
  await e.service.drain(); assert.equal(e.service.snapshot().last.status, 'executed'); assert.equal(e.service.snapshot().queued.length, 0);
  assert.equal(e.service.model.st.recent.length, 1);
});
test('cenas: fuga permanece prioritária, fila expira e novo assunto cancela pedidos obsoletos', async t => {
  const e = setup(t); e.companion.avoid.state = 'fleeing'; e.companion.dragging = { offset: { x: 0, y: 0 } };
  assert.equal((await e.companion.livingChat(commands[0])).reason, 'animation_busy');
  e.clock.advance(21000); await settle(); await e.service.drain();
  assert.equal(e.service.snapshot().queued.length, 0); assert.equal(e.service.model.st.recent.length, 0);
  e.companion.fullscreenHidden = true; await e.companion.livingChat(commands[1]);
  e.companion.onSceneChat('Estou triste'); assert.equal(e.service.snapshot().queued.length, 0);
  e.companion.fullscreenHidden = false; await e.service.drain(); assert.equal(e.service.model.st.recent.length, 0);
});
test('cenas: falha de persistência não vira erro de tela cheia ou de renderer', async t => {
  const e = setup(t); e.service.model.save = () => { throw new Error('disco'); };
  const outcome = await e.companion.livingChat(commands[0]); assert.equal(outcome.status, 'storage_error'); assert.equal(outcome.rendered, true);
  assert.equal(e.service.model.st.recent.length, 0);
});
test('renderer: reinício limpa arrasto/captura/fuga e preserva Trabalho e Foco sem reabrir sobre fullscreen', t => {
  const e = setup(t), c = e.companion;
  c.enterInteraction(); c.dragging = { offset: { x: 10, y: 10 } }; c.capture = true; c.avoid.state = 'fleeing';
  c.onRendererRestart(); assert.equal(c.dragging, null); assert.equal(c.interaction, false); assert.equal(c.capture, false); assert.equal(e.overlay.mouseMode, 'passthrough');
  c.startWork(); c.onRendererRestart(); assert.equal(c.behavior.state, 'meditate'); c.endWork();
  c.startFocus(); const end = c.focus.fim; c.onRendererRestart(); assert.equal(c.focus.fim, end); assert.match(c.behavior.anim, /^cat_estudarJunto/);
  c.setFullscreenDisplays([e.env.displays[0].id]); c.onRendererRestart(); assert.equal(e.overlay.visible, false);
});
