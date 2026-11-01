// CalDAV iCloud somente leitura. Credenciais ficam com o adaptador nativo.
import { SaxesParser } from 'saxes';
import { parseIcs } from './calendar.js';
const DAV = 'DAV:', CAL = 'urn:ietf:params:xml:ns:caldav';
const escapeXml = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
export class CaldavError extends Error {
  constructor(code) { super(code); this.name = 'CaldavError'; this.code = code; }
}
export function iCloudEndpoint(value, base = 'https://caldav.icloud.com/') {
  let url; try { url = new URL(value, base); } catch { throw new CaldavError('endpoint'); }
  if (url.protocol !== 'https:' || !/^(?:p\d+-)?caldav\.icloud\.com$/i.test(url.hostname) || url.username || url.password || url.port && url.port !== '443' || url.search || url.hash) throw new CaldavError('endpoint');
  return url.href;
}
function children(node, uri, local) { return node.children.filter(c => c.uri === uri && c.local === local); }
function first(node, uri, local) { return children(node, uri, local)[0]; }
export function parseDavXml(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 16 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(text)) throw new CaldavError('xml');
  const root = { children: [] }, stack = [root]; let count = 0;
  const parser = new SaxesParser({ xmlns: true });
  parser.on('error', () => { throw new CaldavError('xml'); });
  parser.on('doctype', () => { throw new CaldavError('xml'); });
  parser.on('opentag', tag => {
    if (++count > 200000 || stack.length > 48) throw new CaldavError('xml');
    const node = { uri: tag.uri, local: tag.local, attributes: tag.attributes, text: '', children: [] };
    stack.at(-1).children.push(node); stack.push(node);
  });
  const addText = text => { stack.at(-1).text += text; };
  parser.on('text', addText); parser.on('cdata', addText);
  parser.on('closetag', () => stack.pop());
  try { parser.write(text).close(); } catch (e) { throw e instanceof CaldavError ? e : new CaldavError('xml'); }
  const multi = first(root, DAV, 'multistatus'); if (!multi) throw new CaldavError('xml');
  return children(multi, DAV, 'response').map(response => {
    const href = first(response, DAV, 'href')?.text.trim(); const props = [];
    for (const status of children(response, DAV, 'propstat')) {
      if (/\s200(?:\s|$)/.test(first(status, DAV, 'status')?.text || '')) props.push(...(first(status, DAV, 'prop')?.children || []));
    }
    const failed = children(response, DAV, 'propstat').some(s => !/\s200(?:\s|$)/.test(first(s, DAV, 'status')?.text || ''));
    return { href, props, failed };
  });
}
const property = (response, uri, local) => response.props.find(p => p.uri === uri && p.local === local);
const hrefProperty = (rows, uri, local) => rows.map(r => first(property(r, uri, local) || { children: [] }, DAV, 'href')?.text.trim()).find(Boolean);
async function readBody(response) {
  const max = 16 * 1024 * 1024;
  if (Number(response.headers?.get?.('content-length')) > max) throw new CaldavError('size');
  if (!response.body?.getReader) { const text = await response.text(); if (Buffer.byteLength(text) > max) throw new CaldavError('size'); return text; }
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > max) throw new CaldavError('size'); chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch (e) { await reader.cancel().catch(() => {}); throw e; }
  finally { reader.releaseLock(); }
}
export class IcloudCaldav {
  constructor({ fetch, username, password, timeoutMs = 15000 } = {}) {
    if (typeof username !== 'string' || !username.trim() || username.length > 254 || /[:\r\n]/.test(username) || typeof password !== 'string' || !password || password.length > 256 || /[\r\n]/.test(password)) throw new CaldavError('credentials');
    this.fetch = fetch; this.authorization = `Basic ${Buffer.from(`${username.trim()}:${password}`, 'utf8').toString('base64')}`; this.timeoutMs = timeoutMs;
    this.calendars = []; this.home = null;
  }
  async request(url, method, body, depth = '0') {
    url = iCloudEndpoint(url);
    if (!['PROPFIND', 'REPORT'].includes(method)) throw new CaldavError('method');
    try {
      for (let n = 0; n < 4; n++) {
        const response = await this.fetch(url, { method, redirect: 'manual', signal: AbortSignal.timeout(this.timeoutMs),
          headers: { Authorization: this.authorization, Depth: depth, 'Content-Type': 'application/xml; charset=utf-8', Accept: 'application/xml, text/xml' }, body });
        if ([301, 302, 307, 308].includes(response.status)) { const location = response.headers.get('location'); if (!location) throw new CaldavError('redirect'); url = iCloudEndpoint(location, url); continue; }
        if ([401, 403].includes(response.status)) throw new CaldavError('auth');
        if (response.status === 429) throw new CaldavError('rate_limit');
        if (![200, 207].includes(response.status)) throw new CaldavError('server');
        return { rows: parseDavXml(await readBody(response)), url };
      }
      throw new CaldavError('redirect');
    } catch (e) { throw e instanceof CaldavError ? e : new CaldavError('network'); }
  }
  async discover() {
    const xml = props => `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:" xmlns:c="${CAL}"><d:prop>${props}</d:prop></d:propfind>`;
    const root = await this.request('https://caldav.icloud.com/', 'PROPFIND', xml('<d:current-user-principal/>'));
    const principal = hrefProperty(root.rows, DAV, 'current-user-principal'); if (!principal) throw new CaldavError('principal');
    const account = await this.request(iCloudEndpoint(principal, root.url), 'PROPFIND', xml('<c:calendar-home-set/>'));
    const home = hrefProperty(account.rows, CAL, 'calendar-home-set'); if (!home) throw new CaldavError('home');
    this.home = iCloudEndpoint(home, account.url);
    const list = await this.request(this.home, 'PROPFIND', xml('<d:displayname/><d:resourcetype/><c:supported-calendar-component-set/><c:calendar-description/>'), '1');
    this.calendars = list.rows.filter(r => first(property(r, DAV, 'resourcetype') || { children: [] }, CAL, 'calendar'))
      .filter(r => { const supported = property(r, CAL, 'supported-calendar-component-set'); return !supported || supported.children.some(c => c.local === 'comp' && Object.values(c.attributes || {}).some(a => a.local === 'name' && a.value === 'VEVENT')); })
      .map(r => ({ id: iCloudEndpoint(r.href, list.url), name: (property(r, DAV, 'displayname')?.text || 'Calendário').trim().slice(0, 200) }));
    return structuredClone(this.calendars);
  }
  async events(selected, { from = new Date(), to = new Date(Date.now() + 90 * 86400e3) } = {}) {
    if (!Array.isArray(selected) || !selected.length || selected.some(id => !this.calendars.some(c => c.id === id))) throw new CaldavError('selection');
    if (!(from instanceof Date) || !(to instanceof Date) || !Number.isFinite(from.getTime()) || to <= from || to - from > 731 * 86400e3) throw new CaldavError('range');
    const utc = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const query = `<?xml version="1.0" encoding="utf-8"?><c:calendar-query xmlns:d="DAV:" xmlns:c="${CAL}"><d:prop><d:getetag/><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="${escapeXml(utc(from))}" end="${escapeXml(utc(to))}"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`;
    const events = [], seen = new Set();
    for (const id of [...new Set(selected)]) {
      const calendar = this.calendars.find(c => c.id === id);
      const { rows } = await this.request(id, 'REPORT', query, '1');
      if (rows.length > 20000) throw new CaldavError('size');
      for (const row of rows) {
        const data = property(row, CAL, 'calendar-data')?.text;
        if (!data && row.failed) throw new CaldavError('server');
        if (!data) continue;
        for (const event of parseIcs(data)) {
          const key = `${id}|${event.uid}|${event.inicio.toISOString()}`;
          if (!seen.has(key)) { seen.add(key); events.push({ ...event, calendarId: id, calendarName: calendar.name }); }
        }
      }
    }
    return events;
  }
}
