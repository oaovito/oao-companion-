import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const read = f => JSON.parse(fs.readFileSync(new URL(`../../assets/${f}`, import.meta.url)));
test('anatomia original: pernas, mãos e musculatura históricas restauradas, sem cauda rejeitada', () => {
  const r = read('character/jojo.rig.json'); assert.equal(r.anatomy, 'original-legged-v1');
  const original = JSON.parse(fs.readFileSync(new URL('../fixtures/jojo-0.44.0.rig.json', import.meta.url)));
  const parts = r.groups.flatMap(g => g.parts), ids = new Set(parts.map(p => p.id));
  for (const id of ['legL', 'legR', 'clawL', 'clawR', 'bicepL', 'bicepR', 'handMiddle', 'handFist', 'moonHandL', 'moonHandR', 'moonClawsFeet']) assert.ok(ids.has(id), id);
  for (const id of ['tail', 'tailUnder', 'moonTail', 'pelvicFinL', 'pelvicFinR', 'moonPectoralL', 'moonPectoralR', 'sexyNetFin']) assert.equal(ids.has(id), false, id);
  for (const p of original.groups.flatMap(g => g.parts)) if (!['tail', 'tailUnder', 'moonTail'].includes(p.id)) assert.deepEqual(parts.find(x => x.id === p.id), p, p.id);
  assert.deepEqual(r.metrics, original.metrics); assert.deepEqual(r.face, original.face);
  for (const [key, color] of Object.entries(original.palette)) assert.equal(r.palette[key], color, key);
  for (const p of parts) if (p.parent) assert.ok(ids.has(p.parent), p.id);
});
test('Darkest: cinco animações distintas possuem adereços desenhados e gatilho real', async () => {
  const { buildAnimation } = await import('../../src/core/catalog/recipes.js');
  const r = read('character/jojo.rig.json'); const items = read('catalog/darkest-animations.json').itens;
  assert.equal(items.length, 5); const signatures = new Set();
  for (const it of items) {
    const animation = buildAnimation(it); signatures.add(JSON.stringify(animation));
    for (const prop of it.receita.objeto) assert.ok(r.groups.some(g => g.parts.some(p => p.showIf === `prop_${prop}`)), prop);
    assert.ok(it.gatilho.eventos.length); assert.ok(it.gatilho.frases.length);
  }
  assert.equal(signatures.size, 5);
});

test('ícones: fonte declarada é o mesmo rig restaurado, sem reintroduzir o desenho rejeitado', () => {
  const metadata = read('icons/source.json');
  assert.equal(metadata.anatomy, 'original-legged-v1'); assert.equal(metadata.source, '../character/jojo.rig.json');
  assert.equal(metadata.sha256, createHash('sha256').update(fs.readFileSync(new URL('../../assets/character/jojo.rig.json', import.meta.url))).digest('hex'));
});
