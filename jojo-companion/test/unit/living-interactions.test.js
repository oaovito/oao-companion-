import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LivingInteractions } from '../../src/core/living-interactions.js';
import { buildAnimation } from '../../src/core/catalog/recipes.js';
import { createLivingService } from '../../src/main/living-service.js';
import { makeEnv, loadJSON } from './helpers.js';
const items = loadJSON('assets/catalog/living-interactions.json').itens;
test('cenas: 25 memes e 25 profissões com falas, desenhos e movimentos próprios', () => {
  assert.equal(items.filter(x => x.tipo === 'meme').length, 25); assert.equal(items.filter(x => x.tipo === 'profissao').length, 25);
  const rig = loadJSON('assets/character/jojo.rig.json'), arts = new Set(), voices = new Set(), animations = new Set();
  for (const it of items) {
    const parts = rig.groups.flatMap(g => g.parts).filter(p => p.showIf === `prop_${it.receita.objeto[0]}`);
    assert.ok(parts.length >= 2, it.id); arts.add(JSON.stringify(parts.map(p => p.path))); voices.add(it.falas[0]);
    const animation = buildAnimation(it); animations.add(JSON.stringify(animation));
    assert.ok(animation.tracks[`angle_${it.receita.objeto[0]}`].length >= 5); assert.ok(animation.tracks[`lift_${it.receita.objeto[0]}`].length >= 5);
    assert.equal(it.gatilho.ambiente, false, 'sorteio genérico não pode contornar o cooldown persistente');
  }
  assert.equal(arts.size, 50); assert.equal(voices.size, 50); assert.equal(animations.size, 50);
});
test('cenas: todos os comandos são alcançáveis; pergunta técnica, negação e emergência não viram encenação', () => {
  const m = new LivingInteractions({ items });
  for (const it of items) assert.equal(m.match(m.command(it))?.id, it.id);
  assert.equal(m.match('Finge que é um médico')?.id, 'living_medico');
  for (const text of ['Não imita médico', 'Como um médico diagnostica anemia?', 'Quero explicar o potencial zeta', 'Finge que é médico e me diagnostica', 'Estou com dor no peito, encena médico', 'Você é engenheiro?', 'Vou falar com o advogado']) assert.equal(m.match(text), null, text);
});
test('cenas: cooldown, variedade e relógio persistidos; falha no disco reverte estado', () => {
  let now = 1000, saved; const m = new LivingInteractions({ items, now: () => now, rng: () => 0, save: v => { saved = structuredClone(v); } });
  const first = m.candidate({ allowed: true }); assert.equal(first, null, 'intervalo mínimo inicial respeitado');
  now = 30 * 60000; const a = m.candidate({ allowed: true }); assert.ok(a); assert.equal(m.record(a, { ambient: true }), true);
  assert.ok(m.remaining(a)); assert.equal(m.candidate({ allowed: true }), null);
  now += 26 * 60000; const b = m.candidate({ allowed: true }); assert.notEqual(b.id, a.id);
  const restored = new LivingInteractions({ items, state: saved, now: () => now, rng: () => 0 }); assert.equal(restored.candidate({ allowed: true }).id, b.id);
  now = 1000; assert.equal(restored.candidate({ allowed: true }), null); assert.equal(restored.record(b), false);
  const before = structuredClone(m.st); now = 90 * 60000; m.save = () => { throw new Error('disco'); }; assert.throws(() => m.record(b)); assert.deepEqual(m.st, before);
});
test('cenas: foco, tela cheia, silêncio e preferência impedem sorteio; movimento reduzido filtra cenas pesadas', () => {
  const m = new LivingInteractions({ items, now: () => 3600000 });
  assert.equal(m.candidate({ allowed: false }), null); assert.equal(m.candidate({ allowed: true, context: 'pergunta-tecnica' }), null);
  assert.equal(m.candidate({ allowed: true, reducedMotion: true, isHeavy: () => true }), null);
  assert.equal(m.candidate({ allowed: true, heavyAllowed: false, isHeavy: () => true }), null);
});
async function chat(e, text) { const pending = e.companion.chat(text); e.clock.advance(300); await Promise.resolve(); e.clock.advance(1000); return await pending; }
test('cenas: integrada à conversa única com animação real e sem interromper foco/fuga/tela cheia', async t => {
  const e = makeEnv({ settings: { iaAtivo: false, webSearch: false } }); t.after(() => { e.companion.stop(); e.store.flush(); e.personality.flush(); fs.rmSync(e.dir, { recursive: true, force: true }); });
  e.companion.start(); e.clock.advance(2000);
  const service = createLivingService({ userData: e.dir, companion: e.companion, store: e.store, items });
  let reply = await chat(e, 'Finge que é um médico'); assert.equal(reply.intent, 'encenacao'); assert.match(reply.text, /Ausculta/);
  assert.match(e.companion.behavior.anim, /cat_living_medico/); assert.equal(service.model.st.recent.at(-1), 'living_medico');
  reply = await chat(e, 'Finge que é um médico'); assert.match(reply.text, /Escolhe outra/);
  e.companion.startFocus(); reply = await chat(e, 'Encena Químico'); assert.match(reply.text, /depois do foco/); e.companion._endFocus(false);
  e.companion.fullscreenHidden = true; const before = service.model.st.recent.length; reply = await chat(e, 'Encena Chef'); assert.match(reply.text, /Não vou interromper/); assert.equal(service.model.st.recent.length, before);
});
