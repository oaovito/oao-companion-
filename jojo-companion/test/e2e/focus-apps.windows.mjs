// Processos de fixture isolados: não exige Discord instalado, login ou computador da usuária.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { launch, quit } from './feature-helpers.mjs';
const require = createRequire(import.meta.url);
const electron = require('electron'), { _electron } = require('playwright-core');
test('Discord Windows: WM_CLOSE, confirmação, força opt-in, cancelamento e exclusão de Update.exe', { timeout: 120000 }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-discord-native-'));
  const runtime = path.join(root, 'runtime'), fixture = path.join(root, 'fixture');
  fs.cpSync(path.dirname(electron), runtime, { recursive: true }); fs.mkdirSync(fixture);
  fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ name: 'jojo-discord-fixture', main: 'main.cjs' }));
  fs.writeFileSync(path.join(fixture, 'main.cjs'), `const {app,BrowserWindow}=require('electron');app.setPath('userData',process.env.JOJO_FIXTURE_PROFILE);app.whenReady().then(()=>{const w=new BrowserWindow({width:300,height:220,webPreferences:{sandbox:true}});w.loadURL('data:text/html,<h1>Fixture de fechamento</h1>');w.on('close',()=>require('node:fs').appendFileSync(require('node:path').join(process.env.JOJO_FIXTURE_PROFILE,'close-events.txt'),'close\\n'));if(process.env.JOJO_HOLD_CLOSE==='1')w.on('close',e=>{e.preventDefault();w.hide()});});app.on('window-all-closed',()=>app.quit());setTimeout(()=>app.exit(),90000);`);
  const original = path.join(runtime, 'electron.exe'); const discord = path.join(runtime, 'Discord.exe'), updater = path.join(runtime, 'Update.exe');
  fs.copyFileSync(original, discord); fs.copyFileSync(original, updater);
  const main = await launch(); const opened = [];
  async function start(executablePath, hold = false) {
    const app = await _electron.launch({ executablePath, args: [fixture], env: { ...process.env, JOJO_FIXTURE_PROFILE: path.join(root, `profile-${opened.length}`), JOJO_HOLD_CLOSE: hold ? '1' : '0' } });
    opened.push(app); await app.firstWindow(); return app;
  }
  const alive = app => { try { process.kill(app.process().pid, 0); return true; } catch { return false; } };
  try {
    const unrelated = await start(updater, true); const normal = await start(discord);
    const closed = await main.app.evaluate(() => globalThis.__jojo.nativeDetector().closeDiscord());
    assert.ok(closed.detected >= 1); assert.ok(closed.requests >= 1); assert.equal(closed.remaining, 0, JSON.stringify({ result: closed, events: fs.existsSync(path.join(root, 'profile-1/close-events.txt')) ? fs.readFileSync(path.join(root, 'profile-1/close-events.txt'), 'utf8') : 'no-close-event' })); assert.equal(closed.forced, 0); assert.equal(alive(normal), false); assert.equal(alive(unrelated), true);
    const stubborn = await start(discord, true);
    const first = await main.app.evaluate(() => globalThis.__jojo.nativeDetector().closeDiscord());
    assert.ok(first.remaining >= 1); assert.equal(first.forced, 0); assert.equal(alive(stubborn), true);
    const cancelled = await main.app.evaluate(async () => { const c = new AbortController(); const p = globalThis.__jojo.nativeDetector().closeDiscord({ force: true, signal: c.signal }).catch(() => 'cancelled'); setTimeout(() => c.abort(), 100); return await p; });
    assert.equal(cancelled, 'cancelled'); await new Promise(r => setTimeout(r, 1500)); assert.equal(alive(stubborn), true);
    const forced = await main.app.evaluate(() => globalThis.__jojo.nativeDetector().closeDiscord({ force: true }));
    assert.ok(forced.forced >= 1); assert.equal(forced.remaining, 0); assert.equal(alive(unrelated), true);
    // Exercita a ligação real de Trabalho/Foco sem outras instâncias do Discord.
    const result = await main.app.evaluate(async () => { const j = globalThis.__jojo; j.store.update({ discordForceClose: false }); j.companion.startWork(); await j.focusApps.start(); const s = j.focusApps.snapshot(); j.companion.endWork(); return s; });
    assert.equal(result.state, 'closed'); assert.equal(result.forced, 0);
  } finally {
    for (const app of opened.reverse()) { await app.evaluate(({ app }) => app.exit()).catch(() => {}); await app.close().catch(() => {}); }
    await quit(main.app); fs.rmSync(root, { recursive: true, force: true });
  }
});
