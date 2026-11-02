// Presença permanente: o vigia reabre o JoJo depois de crash ou de atualização,
// mas nunca quando ela encerra pela bandeja. Testa o processo real do vigia.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

test('atalho na área de trabalho: só no Windows empacotado; cria e não recria à toa', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-shortcut-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const log = () => {};
  const chamadas = [];
  const shell = { readShortcutLink: () => { throw new Error('não existe'); }, writeShortcutLink: (...a) => (chamadas.push(a), true) };
  const app = { isPackaged: true, getPath: () => dir };
  assert.equal(garantirAtalho({ app, shell, log, env: {}, platform: 'linux' }), false);
  assert.equal(garantirAtalho({ app: { ...app, isPackaged: false }, shell, log, env: {}, platform: 'win32' }), false);
  assert.equal(garantirAtalho({ app, shell, log, env: { PORTABLE_EXECUTABLE_FILE: 'D:\\JoJoCompanion.exe' }, platform: 'win32' }), true);
  assert.equal(chamadas[0][1], 'create');
  assert.equal(chamadas[0][2].target, 'D:\\JoJoCompanion.exe');
  assert.match(chamadas[0][0], /JoJo Companion\.lnk$/);
  const shell2 = { readShortcutLink: () => ({ target: 'd:\\jojocompanion.exe' }), writeShortcutLink: () => assert.fail('não devia regravar') };
  assert.equal(garantirAtalho({ app, shell: shell2, log, env: { PORTABLE_EXECUTABLE_FILE: 'D:\\JoJoCompanion.exe' }, platform: 'win32' }), true);
});
