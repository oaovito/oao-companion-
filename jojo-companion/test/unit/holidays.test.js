// Datas festivas: fantasia do dia e cumprimento uma vez por dia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, loadJSON } from './helpers.js';
import { easterDate, holidayFor, HOLIDAYS } from '../../src/core/holidays.js';
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
  assert.equal(holidayFor(D(2026, 4, 3)), 'pascoa', 'sexta-feira santa');
  assert.equal(holidayFor(D(2026, 4, 5)), 'pascoa');
  assert.equal(holidayFor(D(2026, 4, 6)), null);
  assert.equal(holidayFor(D(2026, 2, 17)), 'carnaval', 'terça de Carnaval 2026');
  assert.equal(holidayFor(D(2026, 2, 14)), 'carnaval', 'sábado de Carnaval');
  assert.equal(holidayFor(D(2026, 2, 18)), null, 'quarta de cinzas');
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

test('cada festa tem fantasia no rig e falas (que desejam ou não)', () => {
  const parts = RIG.groups.flatMap((g) => g.parts);
  const phrases = loadJSON('assets/dialogue/pt-BR.json').categories;
  for (const id of Object.keys(HOLIDAYS)) {
    assert.ok(parts.some((p) => p.showIf === `costume_${id}`), `fantasia de ${id}`);
    const lines = phrases[`festa_${id}`].lines.map((l) => (typeof l === 'string' ? l : l.t));
    assert.ok(lines.some((t) => /feliz|bom|boa|arraiá/i.test(t)), `${id}: deseja`);
    assert.ok(lines.some((t) => /não vou desejar/i.test(t)), `${id}: às vezes se recusa`);
  }
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
  assert.ok(e.overlay.bounds.height > h0, 'janela cresce para o gorro');
  assert.equal(e.overlay.mouseMode, 'passthrough', 'continua click-through');
  assert.deepEqual(cats.filter((c) => c.startsWith('festa_')), ['festa_natal']);
  e.companion.checkHoliday(D(2026, 12, 25));
  assert.equal(cats.filter((c) => c.startsWith('festa_')).length, 1, 'cumprimenta só uma vez por dia');
  e.companion.checkHoliday(D(2026, 12, 26));
  e.clock.advance(100);
  assert.equal(e.overlay.state.costume, null, 'tira a fantasia depois');

  const off = started({ profile: { festas: { ativo: false, ultimoDia: null } } });
  assert.equal(off.companion.checkHoliday(D(2026, 12, 25)), null);
});
