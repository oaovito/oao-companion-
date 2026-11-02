// Shell Windows real, áreas de trabalho fictícias: nunca altera os atalhos da conta.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launch, quit } from './feature-helpers.mjs';
test('atalhos Windows: .lnk real, migração entre versões, público/pessoal e preferências', { timeout: 60000 }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-shortcuts-native-'));
  const desktop = path.join(root, 'Desktop'), userData = path.join(root, 'profile'), publicRoot = path.join(root, 'Public');
  for (const dir of [desktop, userData, path.join(publicRoot, 'Desktop')]) fs.mkdirSync(dir, { recursive: true });
  const main = await launch(); const target = path.join(root, 'JoJoCompanion.exe'); fs.writeFileSync(target, 'Fixture, não executável.');
  const canonical = path.join(desktop, 'JoJo Companion.lnk'), old = path.join(desktop, 'JoJoCompanion.lnk'), custom = path.join(desktop, 'Meu JoJo.lnk');
  async function write(file, args = '') {
    return main.app.evaluate((_e, o) => globalThis.__jojo.nativeShell.writeShortcutLink(o.file, 'create', { target: o.target, args: o.args, appUserModelId: 'com.jojocompanion.app', description: 'Abrir o JoJo' }), { file, args, target });
  }
  async function run({ version = '0.45.0', preference = 'auto', mode = 'portable' } = {}) {
    return main.app.evaluate((_e, o) => { const j = globalThis.__jojo; return j.migrateDesktop({ app: { isPackaged: true, getVersion: () => o.version, getPath: key => key === 'desktop' ? o.desktop : o.userData }, shell: j.nativeShell, log: () => {}, platform: 'win32', preference: o.preference, env: { PUBLIC: o.publicRoot, ...(o.mode === 'portable' ? { PORTABLE_EXECUTABLE_FILE: o.target } : {}) } }); }, { desktop, userData, publicRoot, target, version, preference, mode });
  }
  try {
    assert.equal(await write(old), true); assert.equal(await write(custom, '--quiet'), true);
    assert.equal(await run(), true); assert.equal(fs.existsSync(old), false); assert.equal(fs.existsSync(canonical), true);
    for (const version of ['0.45.1', '0.45.2', '0.45.2']) assert.equal(await run({ version }), true);
    assert.equal(fs.readdirSync(desktop).filter(f => /^JoJo/.test(f)).length, 1);
    const meta = await main.app.evaluate((_e, o) => globalThis.__jojo.nativeShell.readShortcutLink(o), canonical);
    assert.equal(fs.realpathSync.native(meta.target).toLowerCase(), fs.realpathSync.native(target).toLowerCase()); assert.equal(meta.appUserModelId, 'com.jojocompanion.app');
    const personalized = await main.app.evaluate((_e, o) => globalThis.__jojo.nativeShell.readShortcutLink(o), custom); assert.equal(personalized.args, '--quiet');
    fs.unlinkSync(canonical); assert.equal(await run(), true); assert.equal(fs.existsSync(canonical), false, 'remoção manual respeitada');
    assert.equal(await run({ preference: 'show' }), true); assert.equal(fs.existsSync(canonical), true);
    const pub = path.join(publicRoot, 'Desktop', 'JoJo Companion.lnk'); fs.renameSync(canonical, pub);
    assert.equal(await run(), true); assert.equal(fs.existsSync(pub), true); assert.equal(fs.existsSync(canonical), false);
    assert.equal(await run({ preference: 'hide' }), true); assert.equal(fs.existsSync(pub), false); assert.equal(fs.existsSync(custom), true);
    // Instalador com preferência de não criar: nenhuma cópia portátil aparece.
    assert.equal(await run({ mode: 'installer' }), true); assert.equal(fs.existsSync(canonical), false);
  } finally { await quit(main.app); fs.rmSync(root, { recursive: true, force: true }); }
});
