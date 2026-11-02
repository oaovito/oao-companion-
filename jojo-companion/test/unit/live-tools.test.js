import test from 'node:test';
import assert from 'node:assert/strict';
import { WeatherService, weatherRequest, dateInZone } from '../../src/core/weather.js';
import { WebSearch } from '../../src/core/dialogue/web-search.js';
import { DialogueEngine } from '../../src/core/dialogue/engine.js';
import { makeEnv, chatAdv } from './helpers.js';

const geo = { name: 'Guarapuava', admin1: 'Paraná', country: 'Brasil', country_code: 'BR', latitude: -25.39, longitude: -51.46, timezone: 'America/Sao_Paulo' };
const forecast = () => ({ latitude: geo.latitude, longitude: geo.longitude, timezone: geo.timezone,
  current_units: { temperature_2m: '°C' },
  current: { time: '2026-10-31T21:30', temperature_2m: 20, apparent_temperature: 19, relative_humidity_2m: 60, precipitation: 0, wind_speed_10m: 12 },
  daily: { time: ['2026-10-31', '2026-11-01', '2026-11-02'], temperature_2m_min: [15, 14, 16], temperature_2m_max: [23, 25, 24], precipitation_sum: [0, 3, 1], precipitation_probability_max: [10, 60, 30] } });
const response = (data) => ({ ok: true, json: async () => data });

test('clima: cidade explicita prevalece e tempo de jogo nao vira meteorologia', () => {
  assert.equal(weatherRequest('Como vai estar o tempo hoje em Guarapuava?').city, 'Guarapuava');
  assert.equal(weatherRequest('E amanhã?', { lastCity: 'Guarapuava' }).offset, 1);
  assert.equal(weatherRequest('E amanhã?'), null);
  assert.equal(weatherRequest('Quanto tempo joguei?'), null);
  assert.equal(weatherRequest('Qual é meu tempo de jogo hoje?'), null);
  assert.equal(weatherRequest('O que é a temperatura de transição vítrea?'), null);
  assert.equal(dateInZone(Date.parse('2026-11-01T00:30:00Z'), geo.timezone), '2026-10-31');
});

test('clima: dados reais tipados, timezone da cidade, cache limitado e expiracao', async () => {
  let now = Date.parse('2026-11-01T00:30:00Z');
  const urls = [];
  const weather = new WeatherService({ now: () => now, fetch: async (url) => {
    urls.push(url); return response(url.includes('geocoding-api') ? { results: [geo] } : forecast());
  } });
  const result = await weather.answer(weatherRequest('Como vai estar o tempo hoje em Guarapuava?'), 'Curitiba, Paraná');
  assert.equal(result.ok, true); assert.match(result.text, /Guarapuava/);
  assert.match(result.text, /31\/10\/2026/); assert.match(result.text, /20 °C/);
  assert.match(result.text, /sensação 19 °C/); assert.match(result.text, /umidade 60%/);
  assert.match(result.text, /Open-Meteo/); assert.doesNotMatch(result.text, /Wikipédia|Larissa/);
  assert.ok(urls[0].includes('name=Guarapuava')); assert.equal(urls.length, 2);
  await weather.answer({ city: 'Guarapuava', offset: 1, days: 1 }, 'Curitiba');
  assert.equal(urls.length, 2);
  now += 11 * 60e3;
  await weather.forecast('Guarapuava'); assert.equal(urls.length, 3);
});

test('clima: erro, cidade ambigua e resposta de outra coordenada nao inventam previsao', async () => {
  const offline = new WeatherService({ fetch: async () => { throw Error('offline'); } });
  assert.equal((await offline.answer({ city: 'Guarapuava', offset: 0, days: 1 })).ok, false);
  const wrong = new WeatherService({ fetch: async (url) => response(url.includes('geocoding-api') ? { results: [geo] } : { ...forecast(), latitude: 20 }) });
  assert.equal((await wrong.answer({ city: 'Guarapuava', offset: 0, days: 1 })).code, 'invalid_response');
  const ambiguous = new WeatherService({ fetch: async () => response({ results: [geo, { ...geo, admin1: 'Outro estado' }] }) });
  assert.equal((await ambiguous.answer({ city: 'Guarapuava', offset: 0, days: 1 })).code, 'city_ambiguous');
});

test('agenda: configurada, sincronizando, erro, conectada e vazia sao estados diferentes', async () => {
  const e = makeEnv(); e.companion.start(); e.clock.advance(2000);
  let r = await chatAdv(e, 'a minha agenda está linkada?');
  assert.match(r.text, /não está conectada/);
  e.store.update({ agendaUrl: 'https://calendar.google.com/calendar/ical/u/public/basic.ics' });
  r = await chatAdv(e, 'Qual é a minha agenda de hoje?'); assert.match(r.text, /ainda não consegui concluir/);
  e.companion.setCalendar({ state: 'syncing' });
  assert.match((await chatAdv(e, 'a minha agenda está linkada?')).text, /sincronizando/);
  e.companion.setCalendar({ events: [], lastSync: 1000 });
  assert.match((await chatAdv(e, 'a minha agenda está linkada?')).text, /conectada.*consulta foi concluída/);
  assert.match((await chatAdv(e, 'Qual é a minha agenda de hoje?')).text, /Consultei sua agenda: nenhum compromisso/);
  e.companion.setCalendar({ error: 'auth' });
  assert.equal(e.companion.calendar.lastSync, 1000);
  r = await chatAdv(e, 'Qual é a minha agenda de hoje?');
  assert.match(r.text, /falhou.*link compartilhado/); assert.doesNotMatch(r.text, /Nada mais hoje/);
  await chatAdv(e, 'não desconecta minha agenda'); assert.ok(e.store.get().agendaUrl);
});

test('captura: clima consulta ferramenta e nunca cai no modelo ou em artigo de atriz', async () => {
  const e = makeEnv(); e.companion.start(); e.clock.advance(2000);
  e.companion.weather = new WeatherService({ now: () => Date.parse('2026-11-01T00:30:00Z'), fetch: async (url) => response(url.includes('geocoding-api') ? { results: [geo] } : forecast()) });
  e.companion.dialogue.llm = { isAvailable: async () => assert.fail('clima nao vai ao modelo') };
  const r = await chatAdv(e, 'Como vai estar o tempo hoje em Guarapuava?');
  assert.equal(r.intent, 'weather'); assert.match(r.text, /Open-Meteo/);
  assert.doesNotMatch(r.text, /Larissa|Wikipédia/);
  e.store.update({ climaAtivo: false });
  assert.match((await chatAdv(e, 'Como está o tempo hoje?')).text, /desligada/);
});

test('pesquisa rejeita resultados sem assunto correspondente e nao busca clima na Wikipedia', async () => {
  let calls = 0;
  const search = new WebSearch({ fetch: async (url) => { calls++; return response(url.includes('/w/api.php') ? { query: { pages: { 1: { title: 'Larissa Manoela', extract: 'Larissa Manoela é uma atriz brasileira.' } } } } : { Heading: 'Larissa Manoela', AbstractText: 'Larissa Manoela é uma atriz brasileira.' }); } });
  assert.equal(await search.search('Como vai estar o tempo hoje em Guarapuava?'), null);
  assert.equal(calls, 0);
  assert.equal(await search.search('o que é fotossíntese?'), null);
  const engine = new DialogueEngine({ llm: { isAvailable: async () => assert.fail('clima nao usa geracao sem ferramenta') } });
  assert.equal((await engine.reply('Como vai estar o tempo hoje em Guarapuava?')).error, 'tool_unavailable');
});
