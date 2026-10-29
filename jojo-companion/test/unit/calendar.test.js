// Agenda (só leitura): Google (endereço secreto iCal) ou iCloud (calendário público).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIcs, agendaDoDia, agendaBetween, isGoogleIcalUrl, isIcloudIcalUrl, isCalendarUrl, calendarProvider, findIcalUrl, eventKind } from '../../src/core/calendar.js';
import { sanitize } from '../../src/core/settings-schema.js';
import { makeEnv, chatAdv } from './helpers.js';

const URL = 'https://calendar.google.com/calendar/ical/emanuele%40gmail.com/private-0123456789abcdef0123456789abcdef/basic.ics';
const ICS = [
  'BEGIN:VCALENDAR', 'VERSION:2.0',
  'BEGIN:VEVENT', 'UID:a1', 'SUMMARY:Reunião com o time', 'DTSTART;TZID=America/Sao_Paulo:20261030T090000', 'DTEND;TZID=America/Sao_Paulo:20261030T100000', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a2', 'SUMMARY:Academia', 'DTSTART;TZID=America/Sao_Paulo:20261026T183000', 'DTEND;TZID=America/Sao_Paulo:20261026T193000', 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR', 'EXDATE;TZID=America/Sao_Paulo:20261028T183000', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a3', 'SUMMARY:Aniversário da Ju', 'DTSTART;VALUE=DATE:20261030', 'DTEND;VALUE=DATE:20261031', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a4', 'SUMMARY:Cancelado', 'STATUS:CANCELLED', 'DTSTART:20261030T150000Z', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a5', 'SUMMARY:Consulta médica\\, levar exames', 'DTSTART;TZID=America/Sao_Paulo:20261030T200000', 'DTEND;TZID=America/Sao_Paulo:20261030T210000', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

test('agenda: interpreta o .ics (fuso, dia inteiro, repetição semanal com exceção, cancelado)', () => {
  assert.equal(isGoogleIcalUrl(URL), true);
  assert.equal(isGoogleIcalUrl('https://evil.com/basic.ics'), false);
  assert.equal(findIcalUrl(`toma: ${URL} pronto`), URL);
  const ev = parseIcs(ICS);
  assert.equal(ev.length, 4, 'cancelado fica de fora');
  const dia = agendaDoDia(ev, new Date(2026, 9, 30, 8));
  assert.deepEqual(dia.map((e) => e.titulo), ['Aniversário da Ju', 'Reunião com o time', 'Academia', 'Consulta médica, levar exames']);
  assert.equal(dia[1].inicio.getHours(), 9);
  // Academia seg/qua/sex; quarta 28 cancelada (EXDATE).
  const semana = agendaBetween(ev, new Date(2026, 9, 26), new Date(2026, 10, 2)).filter((e) => e.titulo === 'Academia');
  assert.deepEqual(semana.map((e) => e.inicio.getDate()), [26, 30]);
  assert.equal(eventKind('Academia'), 'treino');
  assert.equal(eventKind('Consulta médica'), 'saude');
  assert.equal(eventKind('Reunião com o time'), 'reuniao');
});

function started() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

test('agenda: JoJo sugere uma vez, guia no chat, conecta pelo link colado e responde "o que tenho hoje?"', async () => {
  const e = started();
  assert.equal(e.store.get().agendaSugerida, false);
  e.clock.advance(11 * 60e3); // a checagem de cada minuto sugere sozinha depois de 10 min
  assert.equal(e.store.get().agendaSugerida, true);
  assert.equal(e.companion.conversations.get('agenda').status, 'needsInput');
  assert.equal(e.companion.checkAgenda(new Date(2026, 9, 30, 8, 1)), null, 'só uma vez');
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, 'quero conectar a agenda');
  assert.match(r.text, /Google ou do iCloud/);
  r = await chatAdv(e, 'conectar agenda do google');
  assert.match(r.text, /Endereço secreto no formato iCal/);
  r = await chatAdv(e, 'conectar agenda do icloud');
  assert.match(r.text, /Calendário Público/);
  r = await chatAdv(e, 'quero conectar o calendário do iphone');
  assert.match(r.text, /Calendário Público/);
  e.companion.onCalendarConnect = async (url) => {
    e.store.update({ agendaUrl: url, agendaAtiva: true });
    e.companion.setCalendar({ events: parseIcs(ICS) });
    return { ok: true };
  };
  r = await chatAdv(e, URL);
  assert.match(r.text, /^Conectado/);
  r = await chatAdv(e, 'o que eu tenho hoje?');
  assert.ok(r.text.startsWith('Hoje') || r.text.startsWith('Nada'), r.text);
  r = await chatAdv(e, 'desconectar agenda');
  assert.equal(e.store.get().agendaUrl, '');
});

const ICLOUD = 'https://p123-caldav.icloud.com/published/2/MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3OG1hbnU';

test('agenda do iCloud: link público (webcal:// do iPhone) é aceito, vira https e conecta pelo chat', async () => {
  const webcal = ICLOUD.replace('https://', 'webcal://');
  assert.equal(isIcloudIcalUrl(ICLOUD), true);
  assert.equal(isIcloudIcalUrl(webcal), false, 'a checagem estrita é em https');
  assert.equal(isCalendarUrl(webcal), true);
  assert.equal(calendarProvider(webcal), 'icloud');
  assert.equal(calendarProvider(URL), 'google');
  assert.equal(calendarProvider('https://icloud.com.evil.com/published/2/abcdefghijk'), null);
  assert.equal(isCalendarUrl('https://p1-caldav.icloud.com/../etc'), false);
  assert.equal(findIcalUrl(`olha: ${webcal}.`), ICLOUD);
  assert.equal(findIcalUrl(`link ${ICLOUD}`), ICLOUD);
  assert.equal(sanitize({ agendaUrl: webcal }).settings.agendaUrl, ICLOUD);
  assert.equal(sanitize({ agendaUrl: 'https://evil.com/x.ics' }).settings.agendaUrl, '');
  const e = started();
  e.companion.enterInteraction('test');
  let pedido = null;
  e.companion.onCalendarConnect = async (url) => {
    pedido = url;
    e.store.update({ agendaUrl: url, agendaAtiva: true });
    e.companion.setCalendar({ events: parseIcs(ICS) });
    return { ok: true };
  };
  let r = await chatAdv(e, webcal);
  assert.match(r.text, /^Conectado/);
  assert.equal(pedido, ICLOUD, 'busca em https');
  assert.equal(e.store.get().agendaUrl, ICLOUD);
  e.companion.onCalendarConnect = async () => ({ ok: false, error: 'HTTP 404' });
  r = await chatAdv(e, webcal);
  assert.match(r.text, /Calendário Público/);
  r = await chatAdv(e, 'desconectar o icloud');
  assert.equal(e.store.get().agendaUrl, '');
});

test('agenda: aviso 10 min antes com a animação do tipo e aviso quando começa (uma vez cada)', () => {
  const e = started();
  e.store.update({ agendaUrl: URL, agendaAtiva: true, agendaAvisoMin: 10 });
  e.companion.setCalendar({ events: parseIcs(ICS) });
  e.companion.agendaResumoDia = '2026-10-26';
  assert.equal(e.companion.checkAgenda(new Date(2026, 9, 26, 18, 22)), 'aviso');
  assert.match(e.companion.behavior.anim, /^cat_duploBiceps/, 'treino → duplo bíceps');
  e.clock.advance(5000);
  assert.equal(e.companion.checkAgenda(new Date(2026, 9, 26, 18, 25)), null, 'não repete');
  e.clock.advance(5000);
  assert.equal(e.companion.checkAgenda(new Date(2026, 9, 26, 18, 30, 30)), 'inicio');
  // Resumo do dia de manhã.
  e.companion.agendaResumoDia = null;
  e.clock.advance(5000);
  assert.equal(e.companion.checkAgenda(new Date(2026, 9, 30, 7)), 'resumo');
});
