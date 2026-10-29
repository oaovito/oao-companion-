// Datas festivas: fantasia do dia e cumprimento uma vez por dia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, loadJSON } from './helpers.js';
import { easterDate, holidayFor, holidaysFor, HOLIDAYS, diwaliDates, holiDates, vesakDate } from '../../src/core/holidays.js';
import { RigRenderer } from '../../src/renderer/shared/rig-renderer.js';

const RIG = loadJSON('assets/character/jojo.rig.json');
const D = (y, m, d) => new Date(y, m - 1, d, 12);

function started(opts) {
  const e = makeEnv(opts);
  e.companion.start();
  e.clock.advance(2000);
  return e;
}

test('Páscoa e Carnaval calculados por ano', () => {
  const iso = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  assert.equal(iso(easterDate(2026)), '2026-4-5');
  assert.equal(iso(easterDate(2027)), '2027-3-28');
  assert.equal(iso(easterDate(2024)), '2024-3-31');
  assert.equal(holidayFor(D(2026, 4, 3)), 'sextaSanta', 'sexta-feira santa (solene)');
  assert.equal(holidayFor(D(2026, 4, 4)), 'pascoa');
  assert.equal(holidayFor(D(2026, 4, 5)), 'pascoa');
  assert.equal(holidayFor(D(2026, 4, 6)), null);
  assert.equal(holidayFor(D(2026, 2, 17)), 'carnaval', 'terça de Carnaval 2026');
  assert.equal(holidayFor(D(2026, 2, 14)), 'carnaval', 'sábado de Carnaval');
  assert.ok(!holidaysFor(D(2026, 2, 18)).includes('carnaval'), 'quarta de cinzas não é Carnaval');
  assert.equal(holidayFor(D(2026, 2, 18)), 'ramada', 'em 2026 o Ramadã começa na quarta de cinzas');
});

test('datas fixas', () => {
  assert.equal(holidayFor(D(2026, 12, 24)), 'natal');
  assert.equal(holidayFor(D(2026, 12, 25)), 'natal');
  assert.equal(holidayFor(D(2026, 12, 31)), 'anoNovo');
  assert.equal(holidayFor(D(2027, 1, 1)), 'anoNovo');
  assert.equal(holidayFor(D(2026, 6, 24)), 'festaJunina');
  assert.equal(holidayFor(D(2026, 10, 12)), 'criancas');
  assert.equal(holidayFor(D(2026, 10, 31)), 'halloween');
  assert.equal(holidayFor(D(2026, 10, 29)), null);
});

test('feriados nacionais do Brasil', () => {
  const br = [[1, 1, 'anoNovo'], [4, 21, 'tiradentes'], [5, 1, 'trabalho'], [9, 7, 'independencia'], [10, 12, 'criancas'], [11, 2, 'finados'], [11, 15, 'republica'], [11, 20, 'conscienciaNegra'], [12, 25, 'natal']];
  for (const [m, d, id] of br) assert.ok(holidaysFor(D(2026, m, d)).includes(id), `${d}/${m}: ${id}`);
  assert.ok(holidaysFor(D(2026, 6, 4)).includes('corpusChristi'), 'Corpus Christi 2026');
  assert.ok(holidaysFor(D(2025, 6, 19)).includes('corpusChristi'), 'Corpus Christi 2025');
});

test('datas religiosas e culturais do mundo (calendários lunares e lunissolares)', () => {
  const has = (y, m, d, id) => assert.ok(holidaysFor(D(y, m, d)).includes(id), `${d}/${m}/${y}: ${id} (${holidaysFor(D(y, m, d))})`);
  has(2025, 3, 1, 'ramada');
  has(2025, 3, 30, 'eidFitr');
  has(2025, 6, 6, 'eidAdha');
  has(2025, 6, 26, 'anoNovoIslamico');
  has(2025, 9, 23, 'roshHashana');
  has(2025, 10, 2, 'yomKippur');
  has(2025, 4, 13, 'pessach');
  has(2025, 3, 14, 'purim');
  has(2025, 12, 15, 'hanukkah');
  has(2025, 12, 22, 'hanukkah');
  has(2025, 1, 29, 'anoNovoChines');
  has(2026, 2, 17, 'anoNovoChines');
  has(2025, 1, 6, 'reis');
  has(2025, 2, 14, 'namorados');
  has(2025, 6, 12, 'namorados');
  has(2025, 3, 8, 'mulher');
  has(2025, 3, 17, 'stPatrick');
  has(2025, 4, 22, 'terra');
  has(2025, 5, 11, 'maes');
  has(2025, 8, 10, 'pais');
  has(2025, 6, 28, 'orgulho');
  has(2025, 11, 1, 'muertos');
  has(2025, 11, 27, 'acaoDeGracas');
  const iso = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  assert.ok(diwaliDates(2024).map(iso).includes('2024-11-1'));
  assert.ok(diwaliDates(2025).map(iso).includes('2025-10-20'));
  assert.ok(diwaliDates(2026).map(iso).includes('2026-11-8'));
  assert.ok(holiDates(2025).map(iso).includes('2025-3-14'));
  assert.ok(holiDates(2024).map(iso).includes('2024-3-25'));
  assert.equal(iso(vesakDate(2025)), '2025-5-12');
  assert.equal(iso(vesakDate(2026)), '2026-5-1');
});

test('quando coincidem, a data solene vence (sem fantasia)', () => {
  assert.equal(holidayFor(D(2026, 2, 17)), 'carnaval', 'Carnaval prevalece sobre o Ano Novo Chinês no mesmo dia');
  assert.ok(holidaysFor(D(2026, 2, 17)).includes('anoNovoChines'));
  for (const id of ['sextaSanta', 'yomKippur', 'finados', 'corpusChristi', 'conscienciaNegra']) {
    assert.equal(HOLIDAYS[id].fantasia, null, id);
    assert.equal(HOLIDAYS[id].tipo, 'solene');
  }
});

test('cada festa tem falas e (se não for solene) fantasia no rig', () => {
  const parts = RIG.groups.flatMap((g) => g.parts);
  const phrases = loadJSON('assets/dialogue/pt-BR.json').categories;
  let refusals = 0;
  for (const [id, h] of Object.entries(HOLIDAYS)) {
    if (h.fantasia) assert.ok(parts.some((p) => p.showIf === `costume_${h.fantasia}`), `fantasia ${h.fantasia} de ${id}`);
    const cat = phrases[`festa_${id}`];
    assert.ok(cat && cat.lines.length >= 2, `falas de ${id}`);
    const lines = cat.lines.map((l) => (typeof l === 'string' ? l : l.t));
    if (lines.some((t) => /não vou desejar/i.test(t))) refusals++;
    if (h.tipo === 'solene') {
      assert.equal(cat.lines.filter((l) => typeof l !== 'string' && (l.tags || []).length).length, 0, `${id}: sem palavrão nem drogas`);
      assert.ok(!lines.some((t) => /não vou desejar/i.test(t)), `${id}: solene não recusa`);
    }
  }
  assert.ok(refusals >= 10, 'às vezes ele se recusa a desejar');
});

test('fantasia troca cores (bermuda branca no Ano Novo)', () => {
  const fake = { rig: RIG };
  RigRenderer.prototype._applyMoods.call(fake, { costume_anoNovo: 1 });
  assert.equal(fake.tinted.shorts, RIG.costumes.anoNovo.palette.shorts);
  RigRenderer.prototype._applyMoods.call(fake, {});
  assert.equal(fake.tinted, null);
});

test('no dia festivo veste a fantasia, ganha espaço pro chapéu e cumprimenta uma vez', () => {
  const e = started();
  const cats = [];
  const orig = e.companion.sayCategory.bind(e.companion);
  e.companion.sayCategory = (c, o) => {
    cats.push(c);
    return orig(c, o);
  };
  const h0 = e.overlay.bounds.height;
  assert.equal(e.companion.checkHoliday(D(2026, 12, 25)), 'natal');
  e.clock.advance(100);
  assert.equal(e.overlay.state.costume, 'natal');
  assert.equal(e.companion.holiday, 'natal');
  assert.ok(e.overlay.bounds.height > h0, 'janela cresce para o gorro');
  assert.equal(e.overlay.mouseMode, 'passthrough', 'continua click-through');
  assert.deepEqual(cats.filter((c) => c.startsWith('festa_')), ['festa_natal']);
  e.companion.checkHoliday(D(2026, 12, 25));
  assert.equal(cats.filter((c) => c.startsWith('festa_')).length, 1, 'cumprimenta só uma vez por dia');
  e.companion.checkHoliday(D(2026, 12, 26));
  e.clock.advance(100);
  assert.equal(e.overlay.state.costume, null, 'tira a fantasia depois');

  // Data solene: cumprimenta com respeito, sem fantasia.
  assert.equal(e.companion.checkHoliday(D(2026, 11, 2)), 'finados');
  e.clock.advance(100);
  assert.equal(e.overlay.state.costume, null);
  assert.ok(cats.includes('festa_finados'));
  // Fantasia de objeto na mão (Diwali).
  e.companion.checkHoliday(D(2025, 10, 20));
  e.clock.advance(100);
  assert.equal(e.overlay.state.costume, 'diya');

  const off = started({ profile: { festas: { ativo: false, ultimoDia: null } } });
  assert.equal(off.companion.checkHoliday(D(2026, 12, 25)), null);
});
