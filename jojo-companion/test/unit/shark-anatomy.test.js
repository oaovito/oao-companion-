import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = f => JSON.parse(fs.readFileSync(new URL(`../../assets/${f}`, import.meta.url)));
test('anatomia: nadadeiras reais substituem braços/pernas e variantes não desenham mãos ou pés', () => {
  const r = read('character/jojo.rig.json'); assert.equal(r.anatomy, 'shark-fins-v1');
  const parts = r.groups.flatMap(g => g.parts);
  for (const id of ['legL', 'legR', 'clawL', 'clawR', 'bicepL', 'bicepR', 'handMiddle', 'handFist', 'moonHandL', 'moonHandR', 'moonClawsFeet']) assert.equal(parts.some(p => p.id === id), false, id);
  for (const id of ['armL', 'armR', 'pelvicFinL', 'pelvicFinR', 'tail', 'moonPectoralL', 'moonPectoralR']) assert.ok(parts.some(p => p.id === id), id);
  for (const id of ['foreL', 'foreR']) assert.equal(parts.find(p => p.id === id).path, 'M0,0', 'âncora de adereços sem membro desenhado');
  const ids = new Set(parts.map(p => p.id)); for (const p of parts) if (p.parent) assert.ok(ids.has(p.parent), p.id);
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
