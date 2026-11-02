// Fixture Steam/GUI no Windows: prova FFI e primeiro plano. Não é uma partida comercial.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { launch, waitFor, quit } from './feature-helpers.mjs';
const require = createRequire(import.meta.url);
const electron = require('electron'); const { _electron } = require('playwright-core');
test('Darkest Windows: processo Steam verificado, foreground/segundo plano, fechamento e exclusão do II', { timeout: 120000 }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-steam-dd-fixture-'));
  const steam = path.join(root, 'steamapps'); const gameFolder = path.join(steam, 'common/DarkestDungeon/_windowsnosteam');
  const fixture = path.join(root, 'game-fixture'); fs.mkdirSync(fixture, { recursive: true });
  fs.mkdirSync(gameFolder, { recursive: true });
  fs.cpSync(path.dirname(electron), gameFolder, { recursive: true });
  fs.renameSync(path.join(gameFolder, 'electron.exe'), path.join(gameFolder, 'Darkest.exe'));
  fs.writeFileSync(path.join(steam, 'appmanifest_262060.acf'), '"AppState" { "appid" "262060" "installdir" "DarkestDungeon" }');
  fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ name: 'jojo-game-fixture', main: 'main.cjs' }));
  fs.writeFileSync(path.join(fixture, 'main.cjs'), `const {app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(path.join(root, 'game-profile'))});app.whenReady().then(()=>{const w=new BrowserWindow({width:420,height:300,title:'JoJo Steam DD fixture',webPreferences:{sandbox:true}});w.loadURL('data:text/html,<h1>Fixture nativa DD1</h1>');});app.on('window-all-closed',()=>app.quit());setTimeout(()=>app.quit(),90000);`);
  const steamHome = path.join(root, 'Steam personalizado'); fs.mkdirSync(path.join(steamHome, 'steamapps'), { recursive: true }); fs.writeFileSync(path.join(steamHome, 'steam.exe'), 'fixture de inventário, sem executar');
  fs.writeFileSync(path.join(steamHome, 'steamapps/libraryfolders.vdf'), `"libraryfolders" { "0" { "path" ${JSON.stringify(root)} } }`);
  const main = await launch({ env: { JOJO_TEST_STEAM_ROOT: steamHome } }); let game = null;
  try {
    await waitFor(main.app, () => globalThis.__jojo.steamService.snapshot().count === 1, 15000);
    const steamState = await main.app.evaluate(() => globalThis.__jojo.steamService.snapshot());
    assert.equal(steamState.installed, true); assert.ok(steamState.libraries >= 1); assert.equal(steamState.games[0].appId, '262060');
    assert.equal(JSON.stringify(steamState).includes(root), false, 'interface não divulga caminhos privados');
    const executablePath = path.join(gameFolder, 'Darkest.exe');
    game = await _electron.launch({ executablePath, args: [fixture] });
    const window = await game.firstWindow(); await window.bringToFront();
    await waitFor(main.app, () => globalThis.__jojo.fullscreenInfo().last?.darkest?.active, 12000);
    assert.equal(await main.app.evaluate(() => globalThis.__jojo.fullscreenInfo().last.darkest.running), true);
    const opened = main.app.waitForEvent('window'); await main.app.evaluate(() => globalThis.__jojo.companion.openApp());
    const central = await opened; await central.bringToFront();
    await waitFor(main.app, () => { const d = globalThis.__jojo.fullscreenInfo().last?.darkest; return d?.running && !d.active; }, 10000);
    await game.close(); game = null;
    await waitFor(main.app, () => globalThis.__jojo.fullscreenInfo().last?.darkest?.running === false, 10000);
    const secondExe = path.join(gameFolder, 'Darkest Dungeon II.exe'); fs.renameSync(executablePath, secondExe);
    game = await _electron.launch({ executablePath: secondExe, args: [fixture] });
    const secondWindow = await game.firstWindow(); await secondWindow.bringToFront();
    await new Promise(r => setTimeout(r, 2000));
    assert.equal(await main.app.evaluate(() => globalThis.__jojo.fullscreenInfo().last.darkest.running), false);
    assert.equal(await main.app.evaluate(() => globalThis.__jojo.companion.darkest.snapshot().sessions), 0, 'fixture curta não gera sessão válida/XP');
  } finally {
    if (game) await game.close().catch(() => {}); await quit(main.app);
    fs.rmSync(root, { recursive: true, force: true });
  }
});
