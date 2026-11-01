import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { IcloudCaldav, iCloudEndpoint, parseDavXml } from '../../src/core/caldav.js';
import { CredentialVault } from '../../src/main/credential-vault.js';
import { createCalendarService } from '../../src/main/calendar-service.js';
import { makeEnv } from './helpers.js';
const host = 'https://p01-caldav.icloud.com'; const id = `${host}/123/calendars/home/`;
const xml = (body, href = '/') => `<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:response><d:href>${href}</d:href><d:propstat><d:prop>${body}</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>`;
const principal = xml(`<d:current-user-principal><d:href>${host}/123/principal/</d:href></d:current-user-principal>`);
const home = xml('<c:calendar-home-set><d:href>/123/calendars/</d:href></c:calendar-home-set>');
const calendars = xml('<d:displayname>Pessoal &amp; estudo</d:displayname><d:resourcetype><d:collection/><c:calendar/></d:resourcetype><c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set>', id);
const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:fixture', 'SUMMARY:Consulta de teste', 'DTSTART:20261102T120000Z', 'DTEND:20261102T130000Z', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
const events = xml(`<c:calendar-data><![CDATA[${ics}]]></c:calendar-data>`, `${id}fixture.ics`);
function fakeFetch() {
  const calls = []; let reportError = null, reportGate = null;
  const fetch = async (url, options) => {
    calls.push({ url, ...options });
    if (options.method === 'REPORT' && reportGate) await reportGate;
    const body = options.method === 'REPORT' ? events : url === 'https://caldav.icloud.com/' ? principal : url.endsWith('principal/') ? home : calendars;
    const status = options.method === 'REPORT' && reportError ? reportError : 207;
    return { status, headers: new Headers(), text: async () => body };
  };
  return { fetch, calls, error: n => { reportError = n; }, gate: p => { reportGate = p; } };
}
test('CalDAV: descobre principal/home/calendários e lê eventos por REPORT, sem escrita remota', async () => {
  const f = fakeFetch(); const client = new IcloudCaldav({ fetch: f.fetch, username: 'fixture@example.invalid', password: 'senha-apenas-fixture' });
  assert.deepEqual(await client.discover(), [{ id, name: 'Pessoal & estudo' }]);
  const result = await client.events([id], { from: new Date('2026-11-01T00:00Z'), to: new Date('2026-11-03T00:00Z') });
  assert.equal(result[0].titulo, 'Consulta de teste'); assert.equal(result[0].calendarName, 'Pessoal & estudo');
  assert.deepEqual(f.calls.map(x => x.method), ['PROPFIND', 'PROPFIND', 'PROPFIND', 'REPORT']);
  assert.equal(f.calls[2].headers.Depth, '1'); assert.match(f.calls[3].body, /start="20261101T000000Z"/);
  assert.equal(f.calls.every(c => c.headers.Authorization.startsWith('Basic ')), true);
  await assert.rejects(client.request(id, 'DELETE', ''), e => e.code === 'method');
  await assert.rejects(client.events([], {}), e => e.code === 'selection');
});
test('CalDAV: redirecionamento externo, credenciais em URL, HTTP e XML com entidades são recusados', async () => {
  for (const value of ['http://caldav.icloud.com/', 'https://caldav.icloud.com.evil.invalid/', 'https://evil.icloud.com/', 'https://u:p@caldav.icloud.com/', 'https://caldav.icloud.com:8080/', 'https://caldav.icloud.com/?token=x']) assert.throws(() => iCloudEndpoint(value));
  for (const value of ['<!DOCTYPE a [<!ENTITY p SYSTEM "file:///secret">]><a/>', '<d:multistatus xmlns:d="DAV:"><unclosed>', '<html/>']) assert.throws(() => parseDavXml(value));
  let calls = 0;
  const client = new IcloudCaldav({ username: 'fixture', password: 'fixture', fetch: async () => { calls++; return { status: 302, headers: new Headers({ location: 'https://external.invalid/' }) }; } });
  await assert.rejects(client.discover(), e => e.code === 'endpoint'); assert.equal(calls, 1);
});
test('CalDAV: autenticação, rede e respostas grandes falham explicitamente; nunca viram agenda vazia', async () => {
  for (const [response, code] of [[{ status: 401 }, 'auth'], [{ status: 403 }, 'auth'], [{ status: 429 }, 'rate_limit'], [{ status: 500 }, 'server'], [{ status: 207, headers: new Headers({ 'content-length': '999999999' }) }, 'size']]) {
    const client = new IcloudCaldav({ username: 'fixture', password: 'fixture', fetch: async () => response });
    await assert.rejects(client.discover(), e => e.code === code);
  }
  const client = new IcloudCaldav({ username: 'fixture', password: 'fixture', fetch: async () => { throw new Error('detalhe privado que não pode vazar'); } });
  await assert.rejects(client.discover(), e => e.code === 'network' && !e.message.includes('privado'));
});
test('credenciais: contrato de cifra fail-closed e arquivo sem segredo em texto (adaptador simulado)', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-credential-unit-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let enabled = true;
  // Simulação do contrato; prova DPAPI real fica no teste Windows, não neste adaptador.
  const values = new Map(); let n = 0;
  const crypto = { isEncryptionAvailable: () => enabled, encryptString: s => { const key = `cifra-fixture-${++n}`; values.set(key, s); return Buffer.from(key); }, decryptString: b => values.get(b.toString()) };
  const file = path.join(dir, 'account.json'); const vault = new CredentialVault(file, crypto, 'win32');
  vault.write({ username: 'fixture@example.invalid', password: 'senha-nao-publicar-fixture' });
  const raw = fs.readFileSync(file, 'utf8'); assert.equal(raw.includes('senha-nao-publicar-fixture'), false); assert.equal(raw.includes('fixture@example'), false);
  assert.equal(vault.read().username, 'fixture@example.invalid');
  enabled = false; assert.throws(() => vault.write({ password: 'x' })); assert.throws(() => vault.read());
  vault.remove(); assert.equal(fs.existsSync(file), false);
});
test('CalDAV coordenador: estados reais, seleção, coalescência, falhas e desconexão preservam última consulta', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-caldav-unit-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const e = makeEnv(); const f = fakeFetch(); const handlers = new Map(); let credential = null;
  const vault = { available: () => true, read: () => credential, write: x => { credential = x; }, remove: () => { credential = null; } };
  const service = createCalendarService({ userData: dir, credentialVault: vault, fetch: f.fetch, companion: e.companion, store: e.store,
    fromSettings: ev => ev.known, ipcMain: { handle: (k, fn) => handlers.set(k, fn), removeHandler: k => handlers.delete(k) }, notify: () => {}, now: () => Date.parse('2026-11-01T12:00Z') });
  const request = (action, data) => handlers.get('calendar:request')({ known: true }, { action, data });
  assert.equal((await request('status')).configured, false);
  const result = await request('connect', { username: 'fixture@example.invalid', password: 'fixture' });
  assert.equal(result.state, 'connected'); assert.ok(result.lastSync); assert.equal(e.companion.agendaConectada, true);
  const last = result.lastSync; f.error(401); await service.sync();
  assert.equal(service.snapshot().state, 'error'); assert.equal(service.snapshot().lastSync, last); assert.equal(e.companion.agendaConectada, false);
  f.error(null); let resume; f.gate(new Promise(r => { resume = r; }));
  const before = f.calls.filter(c => c.method === 'REPORT').length;
  const p1 = service.sync(), p2 = service.sync(); await new Promise(r => setTimeout(r, 5));
  assert.equal(service.snapshot().state, 'syncing'); resume(); await Promise.all([p1, p2]);
  assert.equal(f.calls.filter(c => c.method === 'REPORT').length, before + 1);
  const unknown = await handlers.get('calendar:request')({ known: false }, { action: 'disconnect' }); assert.ok(unknown.error);
  await request('disconnect'); assert.equal(service.configured, false); assert.equal(credential, null); assert.equal(e.companion.calendar.events.length, 0);
  assert.equal(f.calls.some(c => ['DELETE', 'PUT', 'POST'].includes(c.method)), false); service.dispose();
});
