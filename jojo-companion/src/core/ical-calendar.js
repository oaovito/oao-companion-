import ICAL from 'ical.js';
import { civilEpoch, timeZone } from './civil-time.js';
const instances = new WeakMap();
const maxExpansion = 50000;
function calendar(data) {
  const root = new ICAL.Component(data);
  const get = root.getTimeZoneByID.bind(root); const zones = new Map();
  root.getTimeZoneByID = name => {
    const provided = get(name); if (provided) return provided;
    if (!zones.has(name)) {
      // IANA sem VTIMEZONE (comum em feeds reais): usar a base do Windows/Intl.
      timeZone(name); const zone = new ICAL.Timezone({ tzid: name });
      zone.utcOffset = t => (Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second) - civilEpoch(t, name)) / 1000;
      zones.set(name, zone);
    }
    return zones.get(name);
  };
  return root;
}
function date(t) { return t.toJSDate(); }
function wrap(event, details = null) {
  const item = details?.item || event; const start = details?.startDate || item.startDate; const end = details?.endDate || item.endDate;
  return { uid: item.uid, titulo: String(item.summary || '(sem título)').slice(0, 240), local: String(item.location || '').slice(0, 240),
    inicio: date(start), fim: date(end), diaInteiro: start.isDate, status: String(item.component.getFirstPropertyValue('status') || '').toUpperCase(),
    rrule: item.component.getFirstPropertyValue('rrule')?.toString() || '',
    exdates: item.component.getAllProperties('exdate').flatMap(p => p.getValues()).map(t => date(t).getTime()) };
}
export function parseCalendar(text) {
  if (typeof text !== 'string' || text.length > 16 * 1024 * 1024 || !/^BEGIN:VCALENDAR\s*$/m.test(text.replace(/\r/g, ''))) throw new Error('Resposta não é um calendário iCalendar válido.');
  const root = calendar(ICAL.parse(text)); const components = root.getAllSubcomponents('vevent');
  if (components.length > 20000) throw new Error('Calendário excede o limite seguro de eventos por consulta.');
  const groups = new Map();
  for (const component of components) {
    const event = new ICAL.Event(component); if (!component.getFirstProperty('dtstart')) continue;
    const key = event.uid || `without-uid:${groups.size}`; const group = groups.get(key) || { main: null, exceptions: [] };
    if (event.isRecurrenceException()) group.exceptions.push(component.toJSON()); else group.main = component.toJSON();
    groups.set(key, group);
  }
  const zoneData = root.getAllSubcomponents('vtimezone').map(x => x.toJSON());
  const events = [];
  for (const group of groups.values()) {
    const main = group.main || group.exceptions.shift(); if (!main) continue;
    const raw = ['vcalendar', [], [...zoneData, main, ...group.exceptions]];
    const component = calendar(raw); const list = component.getAllSubcomponents('vevent');
    const event = new ICAL.Event(list[0], { strictExceptions: true });
    if (String(event.component.getFirstPropertyValue('status')).toUpperCase() === 'CANCELLED') continue;
    for (const exception of list.slice(1)) event.relateException(exception);
    const wrapped = { ...wrap(event), ical: raw };
    if (!Number.isFinite(wrapped.inicio.getTime()) || wrapped.fim < wrapped.inicio) throw new Error('Calendário contém datas inválidas.');
    instances.set(wrapped, event); events.push(wrapped);
  }
  return events;
}
export function expandCalendarEvent(ev, from, to) {
  let event = instances.get(ev);
  if (!event) {
    const root = calendar(ev.ical); const list = root.getAllSubcomponents('vevent'); event = new ICAL.Event(list[0]);
    for (const exception of list.slice(1)) event.relateException(exception);
    instances.set(ev, event);
  }
  const out = []; const keys = new Set();
  const push = details => {
    const item = wrap(event, details); const key = `${item.uid}:${item.inicio.toISOString()}`;
    const intersects = item.fim > from && item.inicio < to || item.inicio.getTime() === item.fim.getTime() && item.inicio >= from && item.inicio < to;
    if (item.status !== 'CANCELLED' && intersects && !keys.has(key)) { keys.add(key); out.push({ ...ev, ...item }); }
  };
  if (!event.isRecurring()) { push(null); return out; }
  const iterator = event.iterator();
  let exhausted = false;
  for (let n = 0; n < maxExpansion; n++) {
    const next = iterator.next(); if (!next) { exhausted = true; break; }
    if (date(next) > to) { exhausted = true; break; }
    push(event.getOccurrenceDetails(next));
  }
  if (!exhausted) throw new Error('Recorrência excede o limite seguro; a consulta não foi concluída.');
  // Exceção deslocada para dentro do intervalo pode ter RECURRENCE-ID fora dele.
  for (const exception of Object.values(event.exceptions || {})) if (exception.startDate) push({ item: exception, startDate: exception.startDate, endDate: exception.endDate });
  return out;
}
