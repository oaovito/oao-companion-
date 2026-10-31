// Regressão de processos reais do vigia no Windows.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { criarPresenca } from '../../src/main/presenca.js';
import { requireWindows } from '../../src/main/windows-only.js';
requireWindows();

// Processo real: um "JoJo" falso que fica vivo até ser morto; o alvo do vigia grava um arquivo.
function cenario(t, motivo) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-vigia-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const prova = path.join(dir, 'reaberto.txt');
  const alvoJs = path.join(dir, 'alvo.cjs');
  fs.writeFileSync(alvoJs, `require('fs').writeFileSync(${JSON.stringify(prova)}, process.argv.slice(2).join(' ') || 'ok')`);
  const jojo = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  const app = { getPath: () => dir, isPackaged: false };
  const logs = [];
  const log = Object.assign((n, m) => logs.push(m), { file: path.join(dir, 'log.txt') });
  const p = criarPresenca({ app, log, env: { ...process.env, JOJO_VIGIA: '1' } });
  // Na vida real o vigia vigia o próprio app; aqui, o "JoJo" falso.
  const pidReal = process.pid;
  Object.defineProperty(process, 'pid', { value: jojo.pid, configurable: true });
  try {
    p.armar({ alvo: process.execPath, args: [alvoJs], esperas: { intervaloMs: 100, esperaReabrirMs: 100, esperaAtualizacaoMs: 300 } });
    if (motivo) p.marcarSaida(motivo);
  } finally {
    Object.defineProperty(process, 'pid', { value: pidReal, configurable: true });
  }
  return { jojo, prova, dir };
}

async function esperar(cond, ms) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    if (cond()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return cond();
}

test('vigia real: JoJo morre sem motivo → reabre sozinho', async (t) => {
  const { jojo, prova } = cenario(t, null);
  await new Promise((r) => setTimeout(r, 400));
  jojo.kill('SIGKILL');
  assert.ok(await esperar(() => fs.existsSync(prova), 8000), 'reabriu depois do crash');
});

test('vigia real: encerrado pela bandeja → não reabre', async (t) => {
  const { jojo, prova } = cenario(t, 'manual');
  await new Promise((r) => setTimeout(r, 400));
  jojo.kill('SIGKILL');
  assert.equal(await esperar(() => fs.existsSync(prova), 2000), false);
});

test('vigia real: fechou para atualizar → confere e abre calado (--vigia)', async (t) => {
  const { jojo, prova } = cenario(t, 'atualizacao');
  await new Promise((r) => setTimeout(r, 400));
  jojo.kill('SIGKILL');
  assert.ok(await esperar(() => fs.existsSync(prova), 8000));
  assert.equal(fs.readFileSync(prova, 'utf8'), '--vigia');
});
