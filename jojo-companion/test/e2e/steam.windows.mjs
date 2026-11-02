import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { launch, quit, waitFor } from './feature-helpers.mjs';
const require = createRequire(import.meta.url), electron = require('electron'), { _electron } = require('playwright-core');
test('Steam Windows: inventário real por arquivos, cliente fechado/aberto/encerrado e webhelper não é Steam nem jogo', { timeout: 120000 }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-steam-native-'));
  const client = path.join(root, 'Cliente personalizado'), library = path.join(root, 'Biblioteca secundária'), fixture = path.join(root, 'fixture');
  fs.cpSync(path.dirname(electron), client, { recursive: true }); fs.renameSync(path.join(client, 'electron.exe'), path.join(client, 'steam.exe')); fs.copyFileSync(path.join(client, 'steam.exe'), path.join(client, 'steamwebhelper.exe'));
  fs.mkdirSync(path.join(client, 'steamapps'), { recursive: true }); fs.mkdirSync(path.join(library, 'steamapps/common/Fixture instalada'), { recursive: true }); fs.mkdirSync(fixture);
  fs.writeFileSync(path.join(client, 'steamapps/libraryfolders.vdf'), `"libraryfolders" { "1" { "path" ${JSON.stringify(library)} } }`);
  fs.writeFileSync(path.join(library, 'steamapps/appmanifest_123456.acf'), '"AppState" { "appid" "123456" "name" "Fixture instalada" "installdir" "Fixture instalada" "StateFlags" "4" }');
  fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ name: 'jojo-steam-client-fixture', main: 'main.cjs' }));
  fs.writeFileSync(path.join(fixture, 'main.cjs'), `const {app,BrowserWindow}=require('electron');app.setPath('userData',process.env.JOJO_FIXTURE_PROFILE);app.whenReady().then(()=>{const w=new BrowserWindow({width:400,height:300,webPreferences:{sandbox:true}});w.loadURL('data:text/html,<h1>Fixture local de processo</h1>');});app.on('window-all-closed',()=>app.quit());setTimeout(()=>app.exit(),90000);`);
  const main = await launch({ env: { JOJO_TEST_STEAM_ROOT: client } }); let steam = null, helper = null;
  try {
    await waitFor(main.app, () => globalThis.__jojo.steamService.snapshot().count === 1, 15000);
    helper = await _electron.launch({ executablePath: path.join(client, 'steamwebhelper.exe'), args: [fixture], env: { ...process.env, JOJO_FIXTURE_PROFILE: path.join(root, 'helper-profile') } }); await helper.firstWindow();
    await waitFor(main.app, () => globalThis.__jojo.steamService.snapshot().status === 'closed');
    assert.equal(await main.app.evaluate(() => globalThis.__jojo.steamService.snapshot().games[0].state), 'installed');
    steam = await _electron.launch({ executablePath: path.join(client, 'steam.exe'), args: [fixture], env: { ...process.env, JOJO_FIXTURE_PROFILE: path.join(root, 'steam-profile') } }); await steam.firstWindow();
    await waitFor(main.app, () => globalThis.__jojo.steamService.snapshot().status === 'open', 12000);
    await steam.close(); steam = null;
    await waitFor(main.app, () => globalThis.__jojo.steamService.snapshot().status === 'closed', 10000);
    const opened = main.app.waitForEvent('window'); await main.app.evaluate(() => globalThis.__jojo.companion.openApp()); const central = await opened;
    await central.locator('#darkestBtn').click(); await central.waitForSelector('#steamStatus');
    assert.match(await central.locator('#steamStatus').innerText(), /Steam: fechada/);
    await central.locator('#steamStatus button').click(); await waitFor(main.app, () => !globalThis.__jojo.steamService.snapshot().scanning);
    assert.equal((await main.app.evaluate(() => globalThis.__jojo.steamService.snapshot())).count, 1);
    assert.equal(main.errors.length, 0);
  } finally {
    if (steam) await steam.close().catch(() => {}); if (helper) await helper.close().catch(() => {}); await quit(main.app); fs.rmSync(root, { recursive: true, force: true });
  }
});
