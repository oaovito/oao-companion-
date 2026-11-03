import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { launch, quit, waitFor } from './feature-helpers.mjs';
const require = createRequire(import.meta.url), electron = require('electron');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function copyRuntime(directory) {
  const source = path.dirname(fs.realpathSync(electron)); fs.mkdirSync(directory, { recursive: true });
  // Copiar e conferir cada entrada torna uma falha de preparo observável antes
  // de tentar iniciar o processo, inclusive em diretórios com acentos.
  for (const name of fs.readdirSync(source)) fs.cpSync(path.join(source, name), path.join(directory, name), { recursive: true, dereference: true });
  const verify = relative => {
    const src = path.join(source, relative), dst = path.join(directory, relative), stat = fs.statSync(src);
    assert.ok(fs.existsSync(dst), `recurso Electron ausente: ${relative}`);
    if (stat.isDirectory()) for (const name of fs.readdirSync(src)) verify(path.join(relative, name));
    else assert.equal(fs.statSync(dst).size, stat.size, `recurso Electron incompleto: ${relative}`);
  };
  for (const name of fs.readdirSync(source)) verify(name);
  for (const name of ['steam.exe', 'steamwebhelper.exe']) fs.copyFileSync(electron, path.join(directory, name));
}
async function startFixture(name, client, fixture, root) {
  const ready = path.join(root, `${name}.ready`), stop = path.join(root, `${name}.stop`);
  const child = spawn(path.join(client, `${name}.exe`), [fixture], { cwd: fixture,
    env: { ...process.env, JOJO_FIXTURE_PROFILE: path.join(root, `${name}-profile`), JOJO_FIXTURE_READY: ready, JOJO_FIXTURE_STOP: stop },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: false });
  let stderr = '', ended = false, failure = null, code = null, signal = null;
  child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-4000); });
  // O dummy não usa o protocolo de depuração do Playwright. O aplicativo JoJo
  // continua aberto pelo Playwright e o detector observa os processos nativos.
  child.stdout.resume();
  child.once('error', error => { failure = error; ended = true; });
  child.once('exit', (exitCode, exitSignal) => { ended = true; code = exitCode; signal = exitSignal; });
  const diagnostic = () => JSON.stringify({ fixture: name, code, signal, error: failure?.message || null,
    stderr: stderr.split(root).join('<fixture>').split(path.dirname(electron)).join('<electron-runtime>') });
  const killTree = () => {
    if (!ended && child.pid) try { execFileSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 5000 }); } catch { child.kill(); }
  };
  const wait = async (predicate, timeout) => {
    const until = Date.now() + timeout;
    while (!predicate()) {
      if (Date.now() >= until) throw new Error(`timeout da fixture: ${diagnostic()}`);
      await sleep(50);
    }
  };
  try {
    await wait(() => {
      if (ended) throw new Error(`início da fixture falhou: ${diagnostic()}`);
      return fs.existsSync(ready);
    }, 15000);
    assert.equal(JSON.parse(fs.readFileSync(ready, 'utf8')).pid, child.pid, 'janela pronta pertence ao processo esperado');
  } catch (error) { killTree(); throw error; }
  return { async close() {
    if (!ended) fs.writeFileSync(stop, 'quit');
    try { await wait(() => ended, 5000); }
    catch (error) { killTree(); throw error; }
    assert.equal(code, 0, `encerramento normal da fixture: ${diagnostic()}`);
  } };
}
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
  copyRuntime(client);
  fs.mkdirSync(path.join(client, 'steamapps'), { recursive: true }); fs.mkdirSync(path.join(library, 'steamapps/common/Fixture instalada'), { recursive: true }); fs.mkdirSync(fixture);
  fs.writeFileSync(path.join(client, 'steamapps/libraryfolders.vdf'), `"libraryfolders" { "1" { "path" ${JSON.stringify(library)} } }`);
  fs.writeFileSync(path.join(library, 'steamapps/appmanifest_123456.acf'), '"AppState" { "appid" "123456" "name" "Fixture instalada" "installdir" "Fixture instalada" "StateFlags" "4" }');
  fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ name: 'jojo-steam-client-fixture', main: 'main.cjs' }));
  fs.writeFileSync(path.join(fixture, 'main.cjs'), `const {app,BrowserWindow}=require('electron'),fs=require('node:fs');let window;app.setPath('userData',process.env.JOJO_FIXTURE_PROFILE);app.whenReady().then(async()=>{window=new BrowserWindow({width:400,height:300,webPreferences:{sandbox:true}});await window.loadURL('data:text/html,<h1>Fixture local de processo</h1>');fs.writeFileSync(process.env.JOJO_FIXTURE_READY+'.tmp',JSON.stringify({pid:process.pid}));fs.renameSync(process.env.JOJO_FIXTURE_READY+'.tmp',process.env.JOJO_FIXTURE_READY);setInterval(()=>{if(fs.existsSync(process.env.JOJO_FIXTURE_STOP))app.quit();},100);}).catch(e=>{console.error(e.stack);app.exit(2);});app.on('window-all-closed',()=>app.quit());setTimeout(()=>app.exit(3),90000);`);
  const restoreRegistry = registryFixture(client); let main = null, steam = null, helper = null, phase = 'aplicativo';
  try {
    main = await launch();
    phase = 'inventário pelo Registro';
    await waitFor(main.app, () => globalThis.__jojo.steamService.snapshot().count === 1, 15000);
    phase = 'iniciar webhelper'; helper = await startFixture('steamwebhelper', client, fixture, root);
    await waitFor(main.app, () => globalThis.__jojo.steamService.snapshot().status === 'closed');
    assert.equal(await main.app.evaluate(() => globalThis.__jojo.steamService.snapshot().games[0].state), 'installed');
    phase = 'iniciar Steam'; steam = await startFixture('steam', client, fixture, root);
    await waitFor(main.app, () => globalThis.__jojo.steamService.snapshot().status === 'open', 12000);
    phase = 'encerrar Steam';
    await steam.close(); steam = null;
    await waitFor(main.app, () => globalThis.__jojo.steamService.snapshot().status === 'closed', 10000);
    phase = 'atualizar pela Central';
    const opened = main.app.waitForEvent('window'); await main.app.evaluate(() => globalThis.__jojo.companion.openApp()); const central = await opened;
    await central.locator('#darkestBtn').click(); await central.waitForSelector('#steamStatus');
    assert.match(await central.locator('#steamStatus').innerText(), /Steam: fechada/);
    await central.locator('#steamStatus button').click(); await waitFor(main.app, () => !globalThis.__jojo.steamService.snapshot().scanning);
    assert.equal((await main.app.evaluate(() => globalThis.__jojo.steamService.snapshot())).count, 1);
    assert.equal(main.errors.length, 0);
    console.log(`JOJO_STEAM_EVIDENCE:${JSON.stringify({ installed: true, unicodeRegistry: true, helperIgnored: true, states: ['closed', 'open', 'closed'], differentVolumes: path.parse(client).root.toLowerCase() !== path.parse(library).root.toLowerCase(), fixtureGameFound: true })}`);
  } catch (error) { error.message = `Steam (${phase}): ${error.message}`; throw error; }
  finally {
    if (steam) await steam.close().catch(() => {}); if (helper) await helper.close().catch(() => {});
    try { if (main) await quit(main.app); } finally { restoreRegistry(); fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(library, { recursive: true, force: true }); }
  }
});
