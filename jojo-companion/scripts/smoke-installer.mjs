// NSIS real em perfil previamente verificado como isolado. Nunca remover uma instalacao existente.
import { requireWindows } from '../src/main/windows-only.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
requireWindows();
const { _electron } = createRequire(import.meta.url)('playwright-core');
const version = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).version;
const setup = path.resolve(`dist/JoJoCompanion-Setup-${version}.exe`);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-installer-ci-'));
const target = path.join(temporary, 'installed');
const data = path.join(temporary, 'data');
const steamHome = path.join(temporary, 'Steam instalado áé');
const library = path.join(temporary, 'Biblioteca verificada');
const fixtureId = '13371337';
const env = { ...process.env, JOJO_USER_DATA: data, JOJO_TEST: '1', JOJO_VIGIA: '0' };
const run = (exe, args, extra = {}) => new Promise((resolve, reject) => {
  const child = spawn(exe, args, { env, stdio: 'ignore', ...extra });
  child.on('error', reject); child.on('exit', (code) => code === 0 ? resolve() : reject(new Error('Instalador/desinstalador retornou falha')));
});
const stop = (pid) => { try { execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* ja encerrou */ } };
const links = () => JSON.parse(execFileSync('pwsh.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', '../ci/inspect-windows-shortcuts.ps1'], { encoding: 'utf8' }));
const normalized = value => { try { return fs.realpathSync.native(value).toLowerCase(); } catch { return path.resolve(value).toLowerCase(); } };
let child, installedApp, cleanupError;
try {
  if (links().length) throw new Error('Atalho preexistente preservado; conta de teste nao esta isolada');
  // /D e _? sao o ultimo argumento e incluem o resto da linha, conforme o protocolo NSIS.
  await run(setup, ['/S', `/D=${target}`], { windowsVerbatimArguments: true });
  const exe = path.join(target, 'JoJo Companion.exe');
  if (!fs.existsSync(exe)) throw new Error('Aplicativo nao foi instalado no destino isolado');
  const unpacked = path.join(target, 'resources', 'app.asar.unpacked');
  assert.ok(fs.existsSync(path.join(unpacked, 'src/main/steam-inventory-worker.cjs')), 'worker Steam precisa estar desempacotado no aplicativo instalado');
  assert.ok(fs.existsSync(path.join(unpacked, 'src/core/steam-library.cjs')), 'dependência do worker precisa estar na mesma árvore desempacotada');
  // Somente metadados de fixture: não inicia nem instala Steam/jogo comerciais.
  fs.mkdirSync(path.join(steamHome, 'steamapps'), { recursive: true });
  fs.mkdirSync(path.join(library, 'steamapps/common/Fixture empacotada'), { recursive: true });
  fs.writeFileSync(path.join(steamHome, 'steam.exe'), 'fixture de inventário; não executar');
  fs.writeFileSync(path.join(steamHome, 'steamapps/libraryfolders.vdf'), `"libraryfolders" { "1" { "path" ${JSON.stringify(library)} } }`);
  fs.writeFileSync(path.join(library, `steamapps/appmanifest_${fixtureId}.acf`), `"AppState" { "appid" "${fixtureId}" "name" "Fixture empacotada" "installdir" "Fixture empacotada" "StateFlags" "4" }`);
  installedApp = await _electron.launch({ executablePath: exe, env: { ...env, JOJO_TEST_STEAM_ROOT: steamHome }, timeout: 30000 });
  child = installedApp.process();
  await installedApp.firstWindow({ timeout: 15000 });
  const packaging = await installedApp.evaluate(({ app }) => ({ isPackaged: app.isPackaged, archive: /[\\/]app\.asar$/.test(app.getAppPath()) }));
  assert.deepEqual(packaging, { isPackaged: true, archive: true }, 'o ensaio deve executar o app.asar instalado pelo NSIS');
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error('Aplicativo instalado encerrou antes de validar o inventario Steam');
    const log = path.join(data, 'logs/jojo.log');
    if (fs.existsSync(log)) {
      const text = fs.readFileSync(log, 'utf8');
      if (/\[error\]/.test(text)) throw new Error('Erro na inicializacao instalada');
      if (/Pronto/.test(text)) {
        ready = await installedApp.evaluate((_electron, id) => {
          const j = globalThis.__jojo, steam = j?.steamService.snapshot();
          return !!j?.companion.started && steam?.count === 1 && steam.installed === true && steam.reason === null
            && steam.status === 'closed' && steam.games[0]?.appId === id && steam.games[0].state === 'installed';
        }, fixtureId).catch(() => false);
        if (ready) break;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) {
    const failed = await installedApp.evaluate(() => globalThis.__jojo?.steamService.snapshot()).catch(() => null);
    throw new Error(`Aplicativo instalado nao confirmou inventario Steam conhecido pelo worker empacotado: ${JSON.stringify(failed && { status: failed.status, reason: failed.reason, count: failed.count, diagnostics: failed.diagnostics })}`);
  }
  const steam = await installedApp.evaluate(() => globalThis.__jojo.steamService.snapshot());
  assert.ok(steam.libraries >= 1, 'biblioteca real de fixture precisa ter sido lida');
  console.log(`JOJO_PACKAGED_STEAM:${JSON.stringify({ ...packaging, workerUnpacked: true, coreUnpacked: true, installed: steam.installed, libraries: steam.libraries, count: steam.count, status: steam.status, fixtureFound: true, known: steam.reason === null })}`);
  await installedApp.evaluate(() => globalThis.__jojo.quit()).catch(() => {});
  for (let i = 0; i < 80 && child.exitCode === null && child.signalCode === null; i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(child.exitCode, 0, 'aplicativo instalado precisa encerrar normalmente após validar Steam');
  await installedApp.close().catch(() => {}); installedApp = null; child = null;
  const before = links();
  if (before.length !== 1 || normalized(before[0].target) !== normalized(exe) || before[0].arguments) throw new Error('Instalacao precisa criar exatamente um atalho proprio');
  fs.writeFileSync(path.join(data, 'update-preservation.json'), JSON.stringify({ preserved: true }));
  await run(setup, ['/S', '--updated', `/D=${target}`], { windowsVerbatimArguments: true });
  const after = links();
  if (after.length !== 1 || normalized(after[0].target) !== normalized(exe)) throw new Error('Atualizacao criou duplicata ou alterou destino do atalho');
  // Remove apenas o atalho criado neste ensaio e com destino confirmado.
  fs.unlinkSync(after[0].path);
  for (let n = 0; n < 2; n++) {
    await run(setup, ['/S', '--updated', `/D=${target}`], { windowsVerbatimArguments: true });
    if (links().length) throw new Error('Atualizacao recriou atalho removido pela pessoa');
    if (!JSON.parse(fs.readFileSync(path.join(data, 'update-preservation.json'))).preserved) throw new Error('Atualizacao perdeu dados do perfil');
  }
  console.log(`NSIS ${version}: instalou/iniciou e tres atualizacoes preservaram atalho unico, remocao manual e dados.`);
} finally {
  if (installedApp) {
    await installedApp.evaluate(() => globalThis.__jojo?.quit()).catch(() => {});
    if (child?.pid && child.exitCode === null) stop(child.pid);
    await installedApp.close().catch(() => {});
  }
  if (child?.pid) stop(child.pid);
  const log = path.join(data, 'logs/jojo.log');
  if (fs.existsSync(log)) for (const match of fs.readFileSync(log, 'utf8').matchAll(/Iniciando JoJo Companion .*pid (\d+)\)/g)) stop(Number(match[1]));
  if (fs.existsSync(target)) {
    const uninstaller = fs.readdirSync(target).find((name) => /^uninstall.*\.exe$/i.test(name));
    if (uninstaller) {
      try { await run(path.join(target, uninstaller), ['/S', `_?=${target}`], { windowsVerbatimArguments: true }); }
      catch { cleanupError = new Error('Desinstalacao de teste nao concluiu; inspecionar conta isolada'); }
    } else if (fs.existsSync(path.join(target, 'JoJo Companion.exe'))) cleanupError = new Error('Desinstalador ausente');
  }
  if (!cleanupError) fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
  if (cleanupError) throw cleanupError;
}
