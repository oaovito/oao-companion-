import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateShortcuts, JOJO_APP_ID } from '../../src/core/shortcuts.js';
const target = 'C:\\Apps\\JoJoCompanion.exe', canonical = 'C:\\Desktop\\JoJo Companion.lnk';
function env(initial = []) {
  let state = {}; const entries = structuredClone(initial), writes = [], removed = [];
  const run = (extra = {}) => {
    const r = migrateShortcuts({ entries, canonical, target, version: '0.45.0', previous: state,
      write: (file, operation) => { writes.push({ file, operation }); const found = entries.find(e => e.path === file); if (found) found.link.target = target; else entries.push({ path: file, name: 'JoJo Companion.lnk', link: { target, appUserModelId: JOJO_APP_ID } }); return true; },
      remove: file => { removed.push(file); entries.splice(entries.findIndex(e => e.path === file), 1); }, ...extra });
    state = r.state; return r;
  };
  return { run, entries, writes, removed };
}
const link = (path, name = 'JoJo Companion.lnk', custom = {}) => ({ path, name, link: { target, appUserModelId: JOJO_APP_ID, description: 'Abrir o JoJo', ...custom } });
test('atalhos: repetidas atualizações deixam um principal e preservam personalizado/terceiro', () => {
  const old = link('C:\\Desktop\\JoJoCompanion.lnk', 'JoJoCompanion.lnk', { target: 'C:\\Old\\JoJoCompanion.exe' });
  const custom = link('C:\\Desktop\\JoJo Companion (2).lnk', 'JoJo Companion (2).lnk', { args: '--quiet', description: 'Meu JoJo silencioso' });
  const foreign = link('C:\\Desktop\\Outro.lnk', 'Outro.lnk', { target: 'C:\\Apps\\Outro.exe' });
  const e = env([old, custom, foreign]); assert.equal(e.run().ready, true); assert.deepEqual(e.removed, [old.path]);
  for (let i = 0; i < 10; i++) assert.equal(e.run().ready, true);
  assert.equal(e.writes.length, 1); assert.equal(e.entries.length, 3); assert.ok(e.entries.some(x => x.path === custom.path));
});
test('atalhos: principal público evita cópia pessoal; falha de permissão não apaga terceiros', () => {
  const pub = link('C:\\Public\\Desktop\\JoJo Companion.lnk');
  const user = link(canonical); const e = env([pub, user]);
  // Pessoal já existente é mantido; público comprovadamente duplicado é removido.
  const r = e.run(); assert.equal(r.canonical, canonical); assert.deepEqual(e.removed, [pub.path]);
  const onlyPublic = env([pub]); assert.equal(onlyPublic.run().canonical, pub.path); assert.equal(onlyPublic.entries.length, 1);
  const denied = env([pub, user]); const blocked = denied.run({ remove: () => { throw new Error('EACCES'); } });
  assert.equal(blocked.ready, false); assert.equal(denied.entries.length, 2);
});
test('atalhos: instalador sem ícone e exclusão manual são respeitados; preferência explícita pode recriar', () => {
  const installer = env(); assert.equal(installer.run({ mode: 'installer' }).present, false); assert.equal(installer.writes.length, 0);
  const portable = env(); assert.equal(portable.run().present, true); portable.entries.length = 0;
  assert.equal(portable.run().present, false); assert.equal(portable.writes.length, 1);
  assert.equal(portable.run({ preference: 'show' }).present, true); assert.equal(portable.writes.length, 2);
});
test('atalhos: arquivo ocupando nome padrão, argumentos e descrições próprias nunca são substituídos', () => {
  for (const item of [{ path: canonical, name: 'JoJo Companion.lnk', link: null }, link(canonical, 'JoJo Companion.lnk', { target: 'C:\\Windows\\notepad.exe' }), link(canonical, 'JoJo Companion.lnk', { args: '--custom' })]) {
    const e = env([item]); const r = e.run({ preference: 'show' }); assert.equal(r.ready, false); assert.equal(e.writes.length, 0); assert.equal(e.removed.length, 0);
  }
});

test('atalhos: cópias numeradas comprovadas são migradas; criação recusada pode ser retomada', () => {
  const personalizedIcon = env([link(canonical, 'JoJo Companion.lnk', { icon: 'C:\\Meus icones\\tubarao.ico' })]);
  assert.equal(personalizedIcon.run().ready, false); assert.equal(personalizedIcon.writes.length, 0); assert.equal(personalizedIcon.removed.length, 0);
  const uppercase = env([link('C:\\Desktop\\JOJO COMPANION.LNK', 'JOJO COMPANION.LNK')]);
  assert.equal(uppercase.run().present, true); assert.equal(uppercase.removed.length, 0); assert.equal(uppercase.entries.length, 1);
  const numbered = link('C:\\Desktop\\JoJo Companion (12).lnk', 'JoJo Companion (12).lnk');
  const e = env([numbered]); assert.equal(e.run().ready, true); assert.deepEqual(e.removed, [numbered.path]);
  const denied = env(); assert.equal(denied.run({ write: () => false }).ready, false);
  assert.equal(denied.run().ready, true); assert.equal(denied.writes.length, 1, 'não confundir falha de permissão com remoção manual');
});
