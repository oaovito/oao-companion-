import { requireWindows } from '../src/main/windows-only.js';
requireWindows();
// Presença permanente no Windows de verdade, com o executável portátil:
// 1) abre o JoJoCompanion.exe; o vigia arma e o atalho na área de trabalho aparece;
// 2) mata o processo do JoJo (como um crash) → o vigia reabre sozinho;
// 3) marca "encerrado pela bandeja" e mata de novo → NÃO reabre.
// Uso: node scripts/presenca-windows.mjs [dist/JoJoCompanion.exe]
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exe = path.resolve(process.argv[2] || path.join(ROOT, 'dist', 'JoJoCompanion.exe'));
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-presenca-'));
const logDir = path.join(userData, 'logs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const logs = () => (fs.existsSync(logDir) ? fs.readdirSync(logDir).map((f) => fs.readFileSync(path.join(logDir, f), 'utf8')).join('\n') : '');
const inicios = () => [...logs().matchAll(/Iniciando JoJo Companion .*pid (\d+)\)/g)].map((m) => Number(m[1]));
const matar = (pid, arvore = false) => {
  try {
    execFileSync('taskkill', ['/PID', String(pid), '/F', ...(arvore ? ['/T'] : [])], { stdio: 'ignore' });
  } catch {
    /* já encerrado */
  }
};
async function esperar(cond, ms, msg) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    if (cond()) return;
    await sleep(250);
  }
  throw new Error(`${msg}\n--- log ---\n${logs().split('\n').filter((l) => /vigia|Vigia|Iniciando|Atalho|erro|error/i.test(l)).join('\n')}`);
}

let falhou = false;
const pids = [];
try {
  const launcher = spawn(exe, [], { env: { ...process.env, JOJO_USER_DATA: userData }, stdio: 'ignore', detached: true });
  pids.push(launcher.pid);
  launcher.unref();
  await esperar(() => /Vigia armado/.test(logs()), 120e3, 'O vigia não armou.');
  const p1 = inicios()[0];
  pids.push(p1);
  console.log(`JoJo aberto (pid ${p1}); vigia armado.`);
  const lnk = path.join(os.homedir(), 'Desktop', 'JoJo Companion.lnk');
  await esperar(() => fs.existsSync(lnk) || /Atalho na área de trabalho pronto/.test(logs()), 20e3, 'Atalho na área de trabalho não foi criado.');
  console.log('Atalho na área de trabalho: ok.');

  // Crash: mata só o processo do JoJo.
  matar(p1);
  await esperar(() => inicios().length >= 2, 120e3, 'Não reabriu depois do crash.');
  const p2 = inicios()[1];
  pids.push(p2);
  console.log(`Reabriu sozinho depois do crash (pid ${p2}).`);
  await esperar(() => (logs().match(/Vigia armado/g) || []).length >= 2, 60e3, 'O vigia da reabertura não armou.');

  // Encerrado de propósito: não volta.
  fs.writeFileSync(path.join(userData, 'saida.json'), JSON.stringify({ pid: p2, motivo: 'manual', t: Date.now() }));
  matar(p2);
  await sleep(12e3);
  if (inicios().length !== 2) throw new Error('Reabriu depois de encerrar de propósito.');
  console.log('Encerrado de propósito: não reabriu.');
} catch (e) {
  falhou = true;
  console.error(e.message);
} finally {
  for (const p of pids) matar(p, true);
  for (const p of inicios()) matar(p, true);
}
process.exit(falhou ? 1 : 0);
