// Teste de fumaça do executável portátil (Windows): abre dist/JoJoCompanion.exe
// sem instalar nada, espera o app registrar "Pronto (executável portátil)" no log
// e encerra. Falha se não iniciar ou se registrar erro.
// Uso: node scripts/smoke-portable.mjs [caminho/do/JoJoCompanion.exe]
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exe = path.resolve(process.argv[2] || path.join(ROOT, 'dist', 'JoJoCompanion.exe'));
if (!fs.existsSync(exe)) {
  console.error(`Executável não encontrado: ${exe}`);
  process.exit(1);
}
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-portable-'));
const logFile = path.join(userData, 'logs', 'jojo.log');
const child = spawn(exe, [], { env: { ...process.env, JOJO_USER_DATA: userData }, stdio: 'ignore', detached: false });
const t0 = Date.now();
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 120000);

function stop() {
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGKILL');
  } catch {
    /* já encerrado */
  }
}

let exited = null;
child.on('exit', (code) => {
  exited = code;
});

const read = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '');
for (;;) {
  const log = read();
  if (/Pronto \(executável portátil\)/.test(log)) {
    // Deixa rodar mais um pouco para pegar erros logo após a inicialização.
    await new Promise((r) => setTimeout(r, 8000));
    const after = read();
    stop();
    const errors = after.split('\n').filter((l) => /\[error\]/.test(l));
    console.log(after);
    if (errors.length) {
      console.error(`Erros no log:\n${errors.join('\n')}`);
      process.exit(1);
    }
    console.log(`OK: executável portátil iniciou em ${((Date.now() - t0) / 1000).toFixed(1)} s sem instalação.`);
    process.exit(0);
  }
  if (exited !== null) {
    console.error(`O executável encerrou (código ${exited}) antes de ficar pronto.\n${log}`);
    process.exit(1);
  }
  if (Date.now() - t0 > timeoutMs) {
    stop();
    console.error(`Tempo esgotado esperando o app ficar pronto.\n${log}`);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 500));
}
