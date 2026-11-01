// Cenários reais do aplicativo no Windows; dados de teste ficam em perfil isolado.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { requireWindows } from '../../src/main/windows-only.js';
requireWindows();
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ELECTRON = require('electron');
const { _electron } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function launch({ userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-e2e-')), env = {} } = {}) {
  const app = await _electron.launch({
    executablePath: ELECTRON,
    args: [ROOT],
    cwd: ROOT,
    env: { ...process.env, JOJO_TEST: '1', JOJO_USER_DATA: userData, ...env },
  });
  const errors = [];
  app.process().stderr?.on('data', chunk => {
    const message = chunk.toString();
    if (/Error|ReferenceError|TypeError|Falha ao iniciar/.test(message)) console.error(message.slice(-2000));
  });
  let win;
  try { win = await app.firstWindow({ timeout: 12000 }); await waitFor(app, () => globalThis.__jojo && globalThis.__jojo.companion.started); }
  catch (e) { try { await app.close(); } catch { app.process().kill(); } throw e; }
  win.on('pageerror', (e) => errors.push(e.message));
  win.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await sleep(1500);
  return { app, win, userData, errors };
}

export async function waitFor(app, fn, timeout = 8000) {
  const end = Date.now() + timeout;
  for (;;) {
    const ok = await app.evaluate(fn).catch(() => false);
    if (ok) return ok;
    if (Date.now() > end) throw new Error(`timeout esperando: ${fn}`);
    await sleep(100);
  }
}


export async function quit(app) {
  const proc = app.process();
  const done = new Promise((r) => proc.once('exit', r));
  await app.evaluate(() => globalThis.__jojo.quit()).catch(() => {});
  const ended = await Promise.race([done.then(() => true), sleep(8000).then(() => false)]);
  if (!ended && proc.exitCode === null) { proc.kill(); throw new Error('O JoJo vetou o encerramento; processo de teste precisou ser interrompido.'); }
  try {
    await app.close();
  } catch {
    /* já fechado */
  }
}
