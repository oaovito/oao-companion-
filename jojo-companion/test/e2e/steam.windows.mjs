import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { launch, quit, waitFor } from './feature-helpers.mjs';
const require = createRequire(import.meta.url), electron = require('electron'), { _electron } = require('playwright-core');
// Somente o SteamPath do HKCU do runner isolado; tipo/valor anteriores são
// restaurados no finally. Não lê nem exporta outras chaves ou credenciais Steam.
function registryFixture(directory) {
  const ps = script => execFileSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', `[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); ${script}`], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
  const key = 'Software\\Valve\\Steam';
  const old = ps(`$k=[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('${key}'); if ($null -eq $k) { [Console]::WriteLine('missing-key') } else { $v=$k.GetValue('SteamPath',$null,[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames); if ($null -eq $v) { [Console]::WriteLine('missing-value') } else { [Console]::WriteLine($k.GetValueKind('SteamPath')); [Console]::WriteLine([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes([string]$v))) }; $k.Close() }`).trim().split(/\r?\n/);
  assert.ok(['missing-key', 'missing-value', 'String', 'ExpandString'].includes(old[0]));
  const restore = () => {
    if (old[0] === 'missing-key') ps(`[Microsoft.Win32.Registry]::CurrentUser.DeleteSubKey('${key}',$false)`);
    else if (old[0] === 'missing-value') ps(`$k=[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('${key}',$true); $k.DeleteValue('SteamPath',$false); $k.Close()`);
    else ps(`$k=[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('${key}',$true); $k.SetValue('SteamPath',[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${old[1] || ''}')),[Microsoft.Win32.RegistryValueKind]::${old[0]}); $k.Close()`);
  };
  try { ps(`$k=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('${key}'); $k.SetValue('SteamPath',[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(directory).toString('base64')}')),[Microsoft.Win32.RegistryValueKind]::String); $k.Close()`); }
  catch (error) { restore(); throw error; }
  return restore;
}
test('Steam Windows: inventário real por arquivos, cliente fechado/aberto/encerrado e webhelper não é Steam nem jogo', { timeout: 120000 }, async () => {
  const temp = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Temp'); fs.mkdirSync(temp, { recursive: true });
  const root = fs.mkdtempSync(path.join(temp, 'jojo-steam-native-'));
  const client = path.join(root, 'Cliente personalizado áé'), library = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'jojo-biblioteca-')), fixture = path.join(root, 'fixture');
  fs.mkdirSync(client, { recursive: true }); fs.cpSync(path.dirname(electron), client, { recursive: true });
  // Copia pelo caminho real fornecido pelo pacote, sem presumir o nome do binário
  // no diretório copiado. O cliente de fixture ainda é executado no caminho Unicode.
  fs.copyFileSync(electron, path.join(client, 'steam.exe')); fs.copyFileSync(electron, path.join(client, 'steamwebhelper.exe'));
  fs.mkdirSync(path.join(client, 'steamapps'), { recursive: true }); fs.mkdirSync(path.join(library, 'steamapps/common/Fixture instalada'), { recursive: true }); fs.mkdirSync(fixture);
  fs.writeFileSync(path.join(client, 'steamapps/libraryfolders.vdf'), `"libraryfolders" { "1" { "path" ${JSON.stringify(library)} } }`);
  fs.writeFileSync(path.join(library, 'steamapps/appmanifest_123456.acf'), '"AppState" { "appid" "123456" "name" "Fixture instalada" "installdir" "Fixture instalada" "StateFlags" "4" }');
  fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ name: 'jojo-steam-client-fixture', main: 'main.cjs' }));
  fs.writeFileSync(path.join(fixture, 'main.cjs'), `const {app,BrowserWindow}=require('electron');app.setPath('userData',process.env.JOJO_FIXTURE_PROFILE);app.whenReady().then(()=>{const w=new BrowserWindow({width:400,height:300,webPreferences:{sandbox:true}});w.loadURL('data:text/html,<h1>Fixture local de processo</h1>');});app.on('window-all-closed',()=>app.quit());setTimeout(()=>app.exit(),90000);`);
  const restoreRegistry = registryFixture(client); let main = null, steam = null, helper = null;
  try {
    main = await launch();
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
    console.log(`JOJO_STEAM_EVIDENCE:${JSON.stringify({ installed: true, unicodeRegistry: true, helperIgnored: true, states: ['closed', 'open', 'closed'], differentVolumes: path.parse(client).root.toLowerCase() !== path.parse(library).root.toLowerCase(), fixtureGameFound: true })}`);
  } finally {
    if (steam) await steam.close().catch(() => {}); if (helper) await helper.close().catch(() => {});
    try { if (main) await quit(main.app); } finally { restoreRegistry(); fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(library, { recursive: true, force: true }); }
  }
});
