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
for (const fallback of ['hide', 'fade']) {
  test(`recuperação: renderer, suspensão e monitor liberam ocultação de fuga (${fallback})`, async t => {
    for (const recover of ['renderer', 'resume', 'display']) {
      const e = setup(t), c = e.companion;
      e.store.update({ avoidFallback: fallback });
      c.avoid.state = 'hidden'; c._enterGhost(e.clock.now(), 'chased'); c._applyLayout(true);
      assert.equal(c.opacity, fallback === 'hide' ? 0 : 0.18);
      if (recover === 'renderer') c.onRendererRestart();
      else if (recover === 'resume') { c.onSuspend(); c.onResume(); }
      else { c.pos = { x: -10000, y: -10000 }; c._recoverPosition(); }
      assert.equal(c.ghost, false, recover); assert.equal(c.opacity, 1, recover);
      assert.notEqual(c.behavior.state, 'hidden', recover);
      assert.equal(e.overlay.state.opacity, 1, recover);
      assert.equal(e.overlay.mouseMode, 'passthrough', recover);
      assert.equal(c.say('Voltei.'), true, recover);
      assert.equal((await c.livingChat(commands[0])).status, 'executed', recover);
    }
  });
}
test('renderer: recuperação respeita opacidade de Trabalho e não reabre janelas ocultas', t => {
  for (const perfil of ['trabalho', 'deep', 'invisivel']) {
    const e = setup(t), c = e.companion;
    e.store.update({ trabalhoOpacidade: 0.7 }); c.startWork({ perfil }); c.opacity = 0.1;
    const visible = e.overlay.visible;
    c.onRendererRestart();
    assert.equal(c.opacity, perfil === 'deep' ? 0.4 : 0.7, perfil);
    assert.equal(c.behavior.state, 'meditate', perfil); assert.equal(e.overlay.visible, visible, perfil);
    assert.equal(e.overlay.mouseMode, 'passthrough', perfil);
  }
  for (const hidden of ['fullscreen', 'user', 'suspend']) {
    const e = setup(t), c = e.companion;
    c.avoid.state = 'hidden'; c._enterGhost(e.clock.now(), 'chased');
    if (hidden === 'fullscreen') c.setFullscreenDisplays([e.env.displays[0].id]);
    else if (hidden === 'user') c.setVisible(false);
    else { c.onSuspend(); e.overlay.hide(); }
    c.onRendererRestart();
    assert.equal(c.ghost, false, hidden); assert.equal(e.overlay.visible, false, hidden);
    assert.equal(e.overlay.mouseMode, 'passthrough', hidden);
  }
});
test('cenas: novo assunto cancela pedido ainda aguardando a fila de conversa', async t => {
  const e = setup(t), c = e.companion;
  let release; c.chatQueue = new Promise(resolve => { release = resolve; });
  const scene = c.chat(commands[0]);
  const topic = c.chat('O que você gosta de fazer?');
  release();
  for (let i = 0; i < 6; i++) { await settle(); e.clock.advance(1000); }
  const reply = await scene; await topic;
  assert.equal(reply.scene.status, 'cancelled');
  assert.equal(e.service.model.st.recent.length, 0);
  assert.deepEqual(e.service.snapshot().queued, []);
});
test('cenas: cancelamento durante confirmação interrompida não recria a fila antiga', async t => {
  let confirm;
  const e = setup(t, { confirmAnimation: () => new Promise(resolve => { confirm = resolve; }) });
  const scene = e.companion.livingChat(commands[0]);
  e.companion.onSceneChat('Vamos falar de outra coisa.');
  e.companion.fullscreenHidden = true; confirm(false);
  assert.equal((await scene).status, 'cancelled');
  assert.deepEqual(e.service.snapshot().queued, []);
  assert.equal(e.service.model.st.recent.length, 0);
});
test('cenas: renderer carregando mantém o pedido até conectar e confirma uma única execução', async t => {
  let ready = false, confirmations = 0;
  const e = setup(t, { rendererReady: () => ready, confirmAnimation: async () => { confirmations++; return true; } });
  const result = await e.companion.livingChat(commands[0]);
  assert.equal(result.status, 'queued'); assert.equal(result.reason, 'renderer_loading');
  await e.service.drain();
  assert.deepEqual(e.service.snapshot().queued, ['living_buffCafe']); assert.equal(confirmations, 0);
  ready = true; await e.service.drain();
  assert.equal(e.service.snapshot().last.status, 'executed'); assert.equal(confirmations, 1);
  assert.equal(e.service.model.st.recent.length, 1); assert.deepEqual(e.service.snapshot().queued, []);
});
test('cenas: fila atravessa crash durante confirmação e continua após o renderer conectar', async t => {
  let ready = true, confirm, confirmations = 0;
  const e = setup(t, { rendererReady: () => ready, confirmAnimation: () => ++confirmations === 1 ? new Promise(resolve => { confirm = resolve; }) : Promise.resolve(true) });
  const c = e.companion;
  c.fullscreenHidden = true; await c.livingChat(commands[1]); c.fullscreenHidden = false;
  const attempt = e.service.drain();
  ready = false; c.onRendererRestart(); confirm(false); await attempt;
  assert.deepEqual(e.service.snapshot().queued, ['living_mainCharacter']);
  assert.equal(e.service.model.st.recent.length, 0);
  await e.service.drain(); assert.equal(confirmations, 1);
  ready = true; await e.service.drain();
  assert.equal(e.service.snapshot().last.status, 'executed'); assert.equal(confirmations, 2);
  assert.equal(e.service.model.st.recent.length, 1); assert.deepEqual(e.service.snapshot().queued, []);
});
test('cenas: renderer que não conecta expira sem fila eterna e preserva bloqueios prioritários', async t => {
  let ready = false;
  const e = setup(t, { rendererReady: () => ready });
  const c = e.companion;
  c.fullscreenHidden = true; assert.equal((await c.livingChat(commands[0])).reason, 'fullscreen_blocked');
  c.fullscreenHidden = false; c.onSceneChat('Cancelar.');
  c.startFocus(); assert.equal((await c.livingChat(commands[0])).status, 'focus_blocked'); c._endFocus(false);
  c.avoid.state = 'fleeing'; assert.equal((await c.livingChat(commands[0])).reason, 'animation_busy');
  c.avoid.reset(); c.onSceneChat('Cancelar.');
  assert.equal((await c.livingChat(commands[0])).reason, 'renderer_loading');
  e.clock.advance(21000); await settle(); await e.service.drain();
  assert.equal(e.service.snapshot().last.status, 'expired'); assert.deepEqual(e.service.snapshot().queued, []);
  ready = true; await e.service.drain(); assert.equal(e.service.model.st.recent.length, 0);
});
