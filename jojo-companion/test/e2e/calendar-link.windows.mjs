// Interface Electron e HTTP reais no Windows; agenda sintética em servidor local.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import { launch, quit } from './feature-helpers.mjs';

test('agenda Windows: somente link nas configurações, sincronização, reinício, falha/vazia e desconexão', { timeout: 120000 }, async () => {
  let mode = 'events', app, page, userData; const requests = [], errors = [];
  const server = http.createServer((req, res) => {
    requests.push({ method: req.method, auth: req.headers.authorization, cookie: req.headers.cookie });
    if (mode === 'error') { res.writeHead(403); res.end('indisponível'); return; }
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.end(`BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${mode === 'events' ? 'BEGIN:VEVENT\r\nUID:link-windows\r\nDTSTART:20261102T150000Z\r\nDTEND:20261102T160000Z\r\nSUMMARY:Estudar pelo link\r\nEND:VEVENT\r\n' : ''}END:VCALENDAR\r\n`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const env = { JOJO_CAL_BASE: `http://127.0.0.1:${server.address().port}` };
  const url = 'webcal://p45-caldav.icloud.com/published/2/abcdefghijklmnop';
  async function settings() {
    const opened = app.waitForEvent('window'); await app.evaluate(() => globalThis.__jojo.openSettings());
    page = await opened; page.on('pageerror', e => errors.push(e.message)); await page.waitForSelector('#calendarLink');
    assert.equal(await page.locator('#icloudUser, #icloudPassword').count(), 0);
  }
  try {
    ({ app, userData } = await launch({ env })); await settings();
    await page.locator('#calendarLink').fill(url); await page.locator('#calendarConnect').click();
    await page.waitForFunction(() => document.querySelector('#calendarStatus').textContent.includes('Conectada — consulta válida'));
    assert.equal(await app.evaluate(() => globalThis.__jojo.companion.calendar.events.length), 1);
    const lastSync = await app.evaluate(() => globalThis.__jojo.companion.calendar.lastSync);
    assert.ok(lastSync); assert.equal(fs.existsSync(`${userData}/icloud-credentials.json`), false);
    await quit(app); app = null;
    ({ app } = await launch({ userData, env })); await settings();
    await page.waitForFunction(() => document.querySelector('#calendarStatus').textContent.includes('Conectada — consulta válida'));
    assert.equal(await page.locator('#calendarLink').inputValue(), url.replace('webcal:', 'https:'));
    const prior = await app.evaluate(() => globalThis.__jojo.companion.calendar.lastSync);
    mode = 'error'; await page.locator('#calendarSync').click();
    await page.waitForFunction(() => document.querySelector('#calendarStatus').textContent.includes('Falha na consulta'));
    assert.equal(await app.evaluate(() => globalThis.__jojo.companion.calendar.lastSync), prior);
    mode = 'empty'; await page.locator('#calendarSync').click();
    await page.waitForFunction(() => document.querySelector('#calendarStatus').textContent.includes('sem eventos'));
    assert.equal(await app.evaluate(() => globalThis.__jojo.companion.calendar.events.length), 0);
    page.once('dialog', dialog => dialog.accept()); await page.locator('#calendarDisconnect').click();
    await page.waitForFunction(() => document.querySelector('#calendarStatus').textContent === 'Desconectada');
    assert.equal(await app.evaluate(() => globalThis.__jojo.store.get().agendaUrl), '');
    assert.ok(requests.length >= 4); for (const req of requests) assert.deepEqual(req, { method: 'GET', auth: undefined, cookie: undefined });
    assert.deepEqual(errors, []);
  } finally { if (app) await quit(app); await new Promise(resolve => server.close(resolve)); }
});
