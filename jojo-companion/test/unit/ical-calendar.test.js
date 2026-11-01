import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIcs, parseIcsDate, agendaBetween } from '../../src/core/calendar.js';
import { civilEpoch } from '../../src/core/civil-time.js';
const feed = (...lines) => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...lines, 'END:VCALENDAR'].join('\r\n');
const event = (...lines) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'];
test('iCalendar: TZID IANA e DST preservam hora local; datas flutuantes não viram UTC', () => {
  const events = parseIcs(feed(...event('UID:dst', 'DTSTART;TZID=America/New_York:20261031T090000', 'DTEND;TZID=America/New_York:20261031T100000', 'RRULE:FREQ=DAILY;COUNT=3')));
  const result = agendaBetween(events, new Date('2026-10-30T00:00Z'), new Date('2026-11-04T00:00Z'));
  assert.deepEqual(result.map(e => e.inicio.toISOString()), ['2026-10-31T13:00:00.000Z', '2026-11-01T14:00:00.000Z', '2026-11-02T14:00:00.000Z']);
  assert.equal(parseIcsDate('20261101T090000', 'TZID=America/Sao_Paulo').date.toISOString(), '2026-11-01T12:00:00.000Z');
  assert.equal(civilEpoch({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, 'America/New_York'), Date.parse('2026-03-08T07:30Z'));
  assert.equal(civilEpoch({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, 'America/New_York'), Date.parse('2026-11-01T05:30Z'));
});
test('iCalendar: recorrência antiga além de 2000 ocorrências, ordinal mensal, EXDATE/RDATE', () => {
  const events = parseIcs(feed(...event('UID:old', 'DTSTART:20100101T090000Z', 'DTEND:20100101T100000Z', 'RRULE:FREQ=DAILY')));
  assert.equal(agendaBetween(events, new Date('2026-11-01T00:00Z'), new Date('2026-11-02T00:00Z')).length, 1);
  const monthly = parseIcs(feed(...event('UID:monthly', 'DTSTART:20261026T090000Z', 'RRULE:FREQ=MONTHLY;BYDAY=-1MO;COUNT=3', 'EXDATE:20261130T090000Z', 'RDATE:20261129T090000Z')));
  assert.deepEqual(agendaBetween(monthly, new Date('2026-10-01T00:00Z'), new Date('2027-01-01T00:00Z')).map(e => e.inicio.toISOString().slice(0, 10)), ['2026-10-26', '2026-11-29', '2026-12-28']);
});
test('iCalendar: exceção alterada e cancelada substituem a ocorrência sem duplicar', () => {
  const data = feed(...event('UID:a', 'SUMMARY:Original', 'DTSTART:20261101T090000Z', 'DTEND:20261101T100000Z', 'RRULE:FREQ=DAILY;COUNT=3'),
    ...event('UID:a', 'RECURRENCE-ID:20261102T090000Z', 'SUMMARY:Transferido', 'DTSTART:20261102T150000Z', 'DTEND:20261102T160000Z'),
    ...event('UID:a', 'RECURRENCE-ID:20261103T090000Z', 'STATUS:CANCELLED', 'DTSTART:20261103T090000Z', 'DTEND:20261103T100000Z'));
  const result = agendaBetween(parseIcs(data), new Date('2026-11-01T00:00Z'), new Date('2026-11-04T00:00Z'));
  assert.deepEqual(result.map(e => e.titulo), ['Original', 'Transferido']);
  assert.equal(result[1].inicio.toISOString(), '2026-11-02T15:00:00.000Z');
  assert.throws(() => parseIcs('<html>não é calendário</html>'));
  assert.throws(() => parseIcs(feed(...event('UID:bad', 'DTSTART;TZID=Inventado/Desconhecido:20261101T090000'))));
});
