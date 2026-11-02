import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeEnv } from './helpers.js';
import { createCalendarLinkService, readCalendarFeed } from '../../src/main/calendar-link-service.js';
const url = 'https://p45-caldav.icloud.com/published/2/abcdefghijklmnop';
const ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:link-fixture\r\nDTSTART:20261102T150000Z\r\nDTEND:20261102T160000Z\r\nSUMMARY:Estudar\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
test('agenda por link: webcal usa GET sem conta, senha, cookies ou autenticação', async () => {
  const events = await readCalendarFeed({ url: url.replace('https:', 'webcal:'), fetch: async (target, options) => {
    assert.equal(target, url); assert.equal(options.method, undefined); assert.equal(options.credentials, 'omit');
    assert.deepEqual(Object.keys(options.headers), ['User-Agent']); return new Response(ics);
  } });
  assert.equal(events.length, 1); assert.equal(events[0].titulo, 'Estudar');
});
test('agenda por link: redirecionamentos continuam restritos aos provedores e sem autenticação', async () => {
  let calls = 0;
  const events = await readCalendarFeed({ url, fetch: async target => ++calls === 1 ? new Response('', { status: 302, headers: { location: target.replace('p45-', 'p46-') } }) : new Response(ics) });
  assert.equal(calls, 2); assert.equal(events.length, 1);
  calls = 0;
  await assert.rejects(readCalendarFeed({ url, fetch: async () => { calls++; return new Response('', { status: 302, headers: { location: 'https://127.0.0.1/private.ics' } }); } }));
  assert.equal(calls, 1);
});
test('agenda por link: rejeita login na URL, destino arbitrário, falhas e HTML em vez de inventar agenda vazia', async () => {
  for (const target of ['https://u:p@p45-caldav.icloud.com/published/2/abcdefghijklmnop', 'https://example.invalid/calendar.ics']) {
    await assert.rejects(readCalendarFeed({ url: target, fetch: () => { throw new Error('não deveria buscar'); } }));
  }
  for (const response of [new Response('erro', { status: 403 }), new Response('<html>login</html>')]) await assert.rejects(readCalendarFeed({ url, fetch: async () => response }));
});
test('agenda por link: limita tamanho anunciado e recebido, inclusive sem Content-Length', async () => {
  const options = [{ headers: { 'content-length': String(9 * 1024 * 1024) } }, {}];
  for (const config of options) await assert.rejects(readCalendarFeed({ url, fetch: async () => new Response(new Uint8Array(8 * 1024 * 1024 + 1), config) }), /limite/);
});
function setup(t, fetchCalendar = async () => []) {
  const e = makeEnv(); const handlers = new Map(); let now = Date.parse('2026-11-02T12:00Z');
  const service = createCalendarLinkService({ userData: e.dir, companion: e.companion, store: e.store, fetchCalendar, now: () => now,
    ipcMain: { handle: (name, fn) => handlers.set(name, fn), removeHandler: name => handlers.delete(name) }, fromSettings: e => e.trusted === true,
    setTimer: () => 1, clearTimer: () => {} });
  e.store.onChange((_s, keys) => { if (keys.includes('agendaUrl') || keys.includes('agendaAtiva')) service.settingsChanged(); });
  t.after(() => { service.dispose(); e.store.flush(); fs.rmSync(e.dir, { force: true, recursive: true }); });
  return { ...e, service, request: (action, data, trusted = true) => handlers.get('calendar:request')({ trusted }, { action, data }), advance: () => { now += 60000; } };
}
test('agenda por link: configura pela UI/IPC, persiste link, distingue vazia e bloqueia emissor indevido', async t => {
  const e = setup(t);
  assert.equal(e.service.snapshot().configured, false);
  const result = await e.request('connect', { url: url.replace('https:', 'webcal:') });
  assert.equal(result.ok, true); assert.equal(result.state, 'empty'); assert.ok(result.lastSync);
  assert.equal(e.store.get().agendaUrl, url); assert.equal(e.companion.agendaConectada, true);
  assert.ok((await e.request('disconnect', null, false)).error); assert.equal(e.store.get().agendaUrl, url);
  assert.equal(fs.existsSync(`${e.dir}/icloud-credentials.json`), false);
  assert.equal((await e.request('connect', { username: 'ignored', password: 'ignored' })).ok, false);
  await e.request('disconnect'); assert.equal(e.service.snapshot().configured, false);
  assert.equal(e.companion.agendaConectada, false);
});
test('agenda por link: falha não perde link válido/última sincronização nem expõe endereço ou senha', async t => {
  let fail = false;
  const e = setup(t, async () => { if (fail) throw new Error(`HTTP 403 ${url} token-do-provedor`); return []; });
  await e.service.connect(url); const synced = e.service.snapshot().lastSync;
  fail = true; e.advance(); const result = await e.service.sync();
  assert.equal(result.ok, false); assert.equal(result.state, 'error'); assert.equal(result.lastSync, synced);
  assert.equal(e.store.get().agendaUrl, url); assert.equal(e.companion.agendaConectada, false);
  assert.equal(result.message.includes(url), false); assert.doesNotMatch(result.message, /token-do-provedor|senha|ID Apple/);
});
test('agenda por link: sincronizações concorrentes são reunidas e desconectar invalida resultado atrasado', async t => {
  let release, calls = 0, wait = false;
  const e = setup(t, async () => { calls++; if (wait) await new Promise(r => { release = r; }); return []; });
  await e.service.connect(url); wait = true;
  const a = e.service.sync(), b = e.service.sync(); assert.equal(calls, 2);
  await e.service.disconnect(); release(); await Promise.all([a, b]);
  assert.equal(e.service.snapshot().configured, false); assert.equal(e.companion.calendar.synced, false);
  assert.equal(e.companion.calendar.events.length, 0); assert.equal(e.store.get().agendaUrl, '');
});
