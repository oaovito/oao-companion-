import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeEnv, loadJSON } from './helpers.js';
import { createNeedsService } from '../../src/main/needs-service.js';
function setup(t) {
  const e = makeEnv({ settings: { iaAtivo: false, webSearch: false, speechFrequency: 'off', ambienteFrequencia: 'desligado' } });
  t.after(() => { e.companion.stop(); e.store.flush(); e.personality.flush(); fs.rmSync(e.dir, { recursive: true, force: true }); });
  e.companion.start(); e.clock.advance(2000);
  const service = createNeedsService({ userData: e.dir, companion: e.companion, store: e.store, foods: loadJSON('assets/catalog/foods.json').foods, balance: loadJSON('assets/catalog/needs-balance.json'),
    ipcMain: { handle() {}, removeHandler() {} }, fromApp: () => true, fromOverlay: () => false, notify: () => {}, log: () => {} });
  return { ...e, service };
}
async function chat(e, text) {
  const reply = e.companion.chat(text);
  for (let n = 0; n < 8; n++) { e.clock.advance(100); for (let i = 0; i < 12; i++) await Promise.resolve(); }
  return await reply;
}
test('cuidados: emergência cancela comida/efeitos e preserva acolhimento contra callbacks atrasados', async t => {
  const e = setup(t); e.service.feed('salmao'); assert.equal(e.companion.effect?.name, 'food');
  const reply = await chat(e, 'quero morrer'); assert.match(reply.text, /188/);
  e.clock.advance(4000);
  assert.equal(e.companion.effect, null, 'comida anterior não pode continuar durante a emergência');
  assert.equal(/^cat_needs/.test(e.companion.behavior.anim || ''), false, 'mastigação/satisfação não atropelam acolhimento');
  assert.equal(e.service.model.st.foods.salmao, 1, 'consumo real fica salvo');
  assert.equal(e.companion.feedbackQuiet, true, 'recompensas visuais ficam silenciosas');
  assert.equal(e.companion.progress.snapshot().quiet, true);
  assert.equal(e.companion.playCatalog('needsConquista', { source: 'evento', speak: false }), false, 'evento atrasado não substitui acolhimento');
});
test('cuidados: outro turno cancela poses da refeição; foco permite alimentar sem efeito ou comemoração', async t => {
  const e = setup(t); e.service.feed('salmao'); await chat(e, 'oi'); e.clock.advance(4000);
  assert.equal(/^cat_needs/.test(e.companion.behavior.anim || ''), false, 'resposta atual mantém sua expressão');
  e.companion.startFocus(); e.service.model.st.hunger = 50; e.service.feed('atum');
  assert.equal(e.companion.effect, null); assert.equal(e.service.model.st.foods.atum, 1);
});
