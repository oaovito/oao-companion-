import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createFocusApps } from '../../src/main/focus-apps.js';
import { sanitize as sanitizeSettings } from '../../src/core/settings-schema.js';
const { isDiscord, brandFor } = createRequire(import.meta.url)('../../src/core/windows-app-policy.cjs');
function fixture(t, overrides = {}) {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-focus-apps-')); t.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const companion = { work: {}, focus: null }; const settings = { discordCloseOnFocus: true, discordForceClose: false }; const calls = [];
  const detector = { available: true, brandIcons: async () => ({}), closeDiscord: async options => { calls.push(options); return { detected: 1, remaining: 0, forced: options.force ? 1 : 0 }; }, ...overrides };
  const service = createFocusApps({ userData, companion, store: { get: () => settings }, getDetector: () => detector, getFileIcon: async () => null });
  return { service, companion, settings, calls, userData };
}
test('Discord: somente executáveis exatos Common/PTB/Canary, sem updater/nomes parecidos', () => {
  for (const exe of ['Discord.exe', 'C:\\Apps\\DiscordPTB.exe', 'D:/Discord/DiscordCanary.exe']) assert.equal(isDiscord(exe), true);
  for (const exe of ['Update.exe', 'DiscordHelper.exe', 'notDiscord.exe', 'Discord.exe.bak', 'LeagueClient.exe']) assert.equal(isDiscord(exe), false);
  assert.equal(brandFor('LeagueClientUx.exe'), 'lol'); assert.equal(brandFor('Discord.exe'), 'discord'); assert.equal(brandFor('chrome.exe'), null);
  const defaults = sanitizeSettings({}).settings; assert.equal(defaults.discordCloseOnFocus, true); assert.equal(defaults.discordForceClose, false);
});
test('foco: fechamento normal, resultado honesto e força somente por preferência explícita', async t => {
  const f = fixture(t, { closeDiscord: async o => { f.calls.push(o); return { detected: 1, remaining: o.force ? 0 : 1, forced: o.force ? 1 : 0 }; } });
  await f.service.start(); assert.equal(f.calls[0].force, false); assert.equal(f.service.snapshot().state, 'still-running');
  f.settings.discordForceClose = true; await f.service.start(); assert.equal(f.calls[1].force, true); assert.equal(f.service.snapshot().state, 'closed');
  f.settings.discordCloseOnFocus = false; await f.service.start(); assert.equal(f.calls.length, 2); assert.equal(f.service.snapshot().state, 'disabled');
});
test('foco: sair cancela operação pendente, não reabre apps nem aplica resultado atrasado', async t => {
  let complete, signal; const f = fixture(t, { closeDiscord: options => { signal = options.signal; return new Promise(resolve => { complete = resolve; }); } });
  const pending = f.service.start(); await new Promise(resolve => setImmediate(resolve));
  assert.ok(signal); f.companion.focus = {}; f.companion.work = null; f.companion.onWorkEnd(); assert.equal(signal.aborted, false, 'um foco ainda ativo continua protegido');
  f.companion.focus = null; f.companion.onFocusEnd(); assert.equal(signal.aborted, true);
  complete({ detected: 1, remaining: 0 }); await pending; assert.notEqual(f.service.snapshot().state, 'closed');
  assert.equal(f.calls.length, 0);
});
test('foco: erro nativo não afirma fechamento e rotina anterior permanece encadeada', async t => {
  const f = fixture(t, { closeDiscord: async () => { throw new Error('negado'); } });
  await f.service.start(); assert.equal(f.service.snapshot().state, 'error'); assert.match(f.service.snapshot().message, /Não consegui confirmar/);
  f.companion.onRoutineTick(); f.service.close();
});
