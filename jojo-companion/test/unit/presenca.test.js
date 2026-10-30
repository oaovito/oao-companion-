// Presença permanente: o vigia reabre o JoJo depois de crash ou de atualização,
// mas nunca quando ela encerra pela bandeja. Testa o processo real do vigia.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { criarPresenca, alvoDoApp, garantirAtalho } from '../../src/main/presenca.js';

const require = createRequire(import.meta.url);
const { decidir } = require('../../src/main/vigia.cjs');

test('vigia decide: bandeja/desligamento não reabre; crash reabre; atualização confere; laço de crash desiste', () => {
  assert.equal(decidir({ pid: 7, marcador: { pid: 7, motivo: 'manual' } }), 'nada');
  assert.equal(decidir({ pid: 7, marcador: { pid: 7, motivo: 'desligamento' } }), 'nada');
  assert.equal(decidir({ pid: 7, marcador: { pid: 7, motivo: 'atualizacao' } }), 'conferir');
  assert.equal(decidir({ pid: 7, marcador: null }), 'reabrir');
  assert.equal(decidir({ pid: 7, marcador: { pid: 3, motivo: 'manual' } }), 'reabrir', 'marcador de outra sessão não vale');
  const agora = Date.now();
  assert.equal(decidir({ pid: 7, historico: [agora - 1000, agora - 2000, agora - 3000], agora }), 'desistir');
  assert.equal(decidir({ pid: 7, historico: [agora - 20 * 60e3, agora - 30 * 60e3, agora - 40 * 60e3], agora }), 'reabrir');
});

test('alvo: portátil reabre o próprio .exe; instalado, o executável', () => {
  assert.equal(alvoDoApp({ env: { PORTABLE_EXECUTABLE_FILE: 'D:\\JoJo.exe' }, execPath: 'C:\\t\\e.exe' }), 'D:\\JoJo.exe');
  assert.equal(alvoDoApp({ env: {}, execPath: 'C:\\p\\JoJo Companion.exe' }), 'C:\\p\\JoJo Companion.exe');
});

test('atalho na área de trabalho: só no Windows empacotado; cria e não recria à toa', () => {
  const log = () => {};
  const chamadas = [];
  const shell = { readShortcutLink: () => { throw new Error('não existe'); }, writeShortcutLink: (...a) => (chamadas.push(a), true) };
  const app = { isPackaged: true, getPath: () => 'C:\\Users\\m\\Desktop' };
  assert.equal(garantirAtalho({ app, shell, log, env: {}, platform: 'linux' }), false);
  assert.equal(garantirAtalho({ app: { ...app, isPackaged: false }, shell, log, env: {}, platform: 'win32' }), false);
  assert.equal(garantirAtalho({ app, shell, log, env: { PORTABLE_EXECUTABLE_FILE: 'D:\\JoJoCompanion.exe' }, platform: 'win32' }), true);
  assert.equal(chamadas[0][1], 'create');
  assert.equal(chamadas[0][2].target, 'D:\\JoJoCompanion.exe');
  assert.match(chamadas[0][0], /JoJo Companion\.lnk$/);
  const shell2 = { readShortcutLink: () => ({ target: 'd:\\jojocompanion.exe' }), writeShortcutLink: () => assert.fail('não devia regravar') };
  assert.equal(garantirAtalho({ app, shell: shell2, log, env: { PORTABLE_EXECUTABLE_FILE: 'D:\\JoJoCompanion.exe' }, platform: 'win32' }), true);
});

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
