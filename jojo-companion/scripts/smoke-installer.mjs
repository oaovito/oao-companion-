// NSIS real em perfil previamente verificado como isolado. Nunca remover uma instalacao existente.
import { requireWindows } from '../src/main/windows-only.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
requireWindows();
const version = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).version;
const setup = path.resolve(`dist/JoJoCompanion-Setup-${version}.exe`);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-installer-ci-'));
const target = path.join(temporary, 'installed');
const data = path.join(temporary, 'data');
const env = { ...process.env, JOJO_USER_DATA: data, JOJO_TEST: '1', JOJO_VIGIA: '0' };
const run = (exe, args, extra = {}) => new Promise((resolve, reject) => {
  const child = spawn(exe, args, { env, stdio: 'ignore', ...extra });
  child.on('error', reject); child.on('exit', (code) => code === 0 ? resolve() : reject(new Error('Instalador/desinstalador retornou falha')));
});
const stop = (pid) => { try { execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* ja encerrou */ } };
const links = () => JSON.parse(execFileSync('pwsh.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', '../ci/inspect-windows-shortcuts.ps1'], { encoding: 'utf8' }));
const normalized = value => { try { return fs.realpathSync.native(value).toLowerCase(); } catch { return path.resolve(value).toLowerCase(); } };
let child, cleanupError, startupError;
try {
  if (links().length) throw new Error('Atalho preexistente preservado; conta de teste nao esta isolada');
  // /D e _? sao o ultimo argumento e incluem o resto da linha, conforme o protocolo NSIS.
  await run(setup, ['/S', `/D=${target}`], { windowsVerbatimArguments: true });
  const exe = path.join(target, 'JoJo Companion.exe');
  if (!fs.existsSync(exe)) throw new Error('Aplicativo nao foi instalado no destino isolado');
  child = spawn(exe, [], { env, stdio: 'ignore' });
  child.on('error', (error) => { startupError = error; });
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (startupError) throw new Error('Nao foi possivel abrir o aplicativo instalado');
    const log = path.join(data, 'logs/jojo.log');
    if (fs.existsSync(log)) {
      const text = fs.readFileSync(log, 'utf8');
      if (/\[error\]/.test(text)) throw new Error('Erro na inicializacao instalada');
      if (/Pronto/.test(text)) { ready = true; break; }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Aplicativo instalado nao iniciou');
  if (child?.pid) { stop(child.pid); child = null; }
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
