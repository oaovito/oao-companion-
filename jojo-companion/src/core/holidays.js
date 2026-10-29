// Datas festivas: feriados nacionais do Brasil e datas culturais e religiosas
// importantes no mundo. Puro. Datas móveis: Páscoa (cálculo gregoriano),
// calendários islâmico, hebraico e chinês (Intl, ICU) e fases da Lua (Meeus)
// para Holi, Diwali e Vesak.

/** Domingo de Páscoa (calendário gregoriano, algoritmo anônimo). */
export function easterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** n-ésimo dia da semana (0 = domingo) de um mês. */
function nthWeekday(year, month, weekday, n) {
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month - 1, 1 + offset + (n - 1) * 7);
}

// ---------------------------------------------------------------- Lua (Meeus, cap. 49)

const RAD = Math.PI / 180;

/** Instante (ms UTC) da lua nova (phase 0) ou cheia (0.5) de número k. */
export function moonPhaseTime(k, phase) {
  const kk = Math.floor(k) + phase;
  const T = kk / 1236.85;
  let jde = 2451550.09766 + 29.530588861 * kk + 0.00015437 * T * T - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const M = (2.5534 + 29.1053567 * kk - 0.0000014 * T * T) * RAD;
  const Mp = (201.5643 + 385.81693528 * kk + 0.0107582 * T * T) * RAD;
  const F = (160.7108 + 390.67050284 * kk - 0.0016118 * T * T) * RAD;
  const O = (124.7746 - 1.56375588 * kk + 0.0020672 * T * T) * RAD;
  const c = phase === 0
    ? [-0.4072, 0.17241, 0.01608, 0.01039, 0.00739, -0.00514, 0.00208]
    : [-0.40614, 0.17302, 0.01614, 0.01043, 0.00734, -0.00515, 0.00209];
  jde += c[0] * Math.sin(Mp) + c[1] * E * Math.sin(M) + c[2] * Math.sin(2 * Mp) + c[3] * Math.sin(2 * F)
    + c[4] * E * Math.sin(Mp - M) + c[5] * E * Math.sin(Mp + M) + c[6] * E * E * Math.sin(2 * M)
    - 0.00111 * Math.sin(Mp - 2 * F) - 0.00057 * Math.sin(Mp + 2 * F) + 0.00056 * E * Math.sin(2 * Mp + M)
    - 0.00042 * Math.sin(3 * Mp) + 0.00042 * E * Math.sin(M + 2 * F) + 0.00038 * E * Math.sin(M - 2 * F)
    - 0.00024 * E * Math.sin(2 * Mp - M) - 0.00017 * Math.sin(O);
  return (jde - 2440587.5) * 86400000;
}

/** Luas (nova = 0, cheia = 0.5) de um ano, como datas no fuso dado (horas). */
function moonsOfYear(year, phase, tzHours) {
  const out = [];
  const k0 = Math.floor((year - 2000) * 12.3685) - 2;
  for (let k = k0; k < k0 + 16; k++) {
    const t = new Date(moonPhaseTime(k, phase) + tzHours * 3600000);
    if (t.getUTCFullYear() === year) out.push(new Date(year, t.getUTCMonth(), t.getUTCDate()));
  }
  return out;
}

const IST = 5.5; // datas hindus no horário da Índia

/** Diwali: lua nova com o Sol em Libra (sideral, ~13/out–16/nov); dia anterior e o dia. */
export function diwaliDates(year) {
  const nm = moonsOfYear(year, 0, IST).find((d) => d >= new Date(year, 9, 13) && d <= new Date(year, 10, 16));
  return nm ? [addDays(nm, -1), nm] : [];
}

/** Holi: lua cheia antes da lua nova de Chaitra (Sol em Peixes, ~14/mar–13/abr); o dia e o seguinte. */
export function holiDates(year) {
  const nm = moonsOfYear(year, 0, IST).find((d) => d >= new Date(year, 2, 14) && d <= new Date(year, 3, 13));
  if (!nm) return [];
  const fm = moonsOfYear(year, 0.5, IST).filter((d) => d < nm).pop();
  return fm ? [fm, addDays(fm, 1)] : [];
}

/** Vesak: primeira lua cheia de maio. */
export function vesakDate(year) {
  return moonsOfYear(year, 0.5, IST).find((d) => d.getMonth() === 4) || null;
}

// ---------------------------------------------------------------- calendários (Intl)

function calendarParts(date, calendar, monthStyle = 'numeric') {
  try {
    const f = new Intl.DateTimeFormat(`en-u-ca-${calendar}`, { day: 'numeric', month: monthStyle, timeZone: 'UTC' });
    if (f.resolvedOptions().calendar !== calendar) return null;
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
    const parts = Object.fromEntries(f.formatToParts(utc).map((p) => [p.type, p.value]));
    return { month: parts.month, day: Number(parts.day) };
  } catch {
    return null;
  }
}

function islamic(date) {
  const p = calendarParts(date, 'islamic-umalqura');
  return p ? { month: Number(p.month), day: p.day } : null;
}

function hebrew(date) {
  return calendarParts(date, 'hebrew', 'long');
}

function chinese(date) {
  const p = calendarParts(date, 'chinese');
  return p ? { month: p.month, day: p.day } : null;
}

// ---------------------------------------------------------------- datas

/**
 * Festas conhecidas: nome, fantasia (null = sem fantasia, data de respeito) e
 * tipo ('solene' = sem brincadeira).
 */
export const HOLIDAYS = Object.freeze({
  // solenes primeiro (prioridade quando coincidem)
  sextaSanta: { nome: 'Sexta-feira Santa', fantasia: null, tipo: 'solene' },
  yomKippur: { nome: 'Yom Kippur', fantasia: null, tipo: 'solene' },
  finados: { nome: 'Finados', fantasia: null, tipo: 'solene' },
  corpusChristi: { nome: 'Corpus Christi', fantasia: null, tipo: 'solene' },
  conscienciaNegra: { nome: 'Dia da Consciência Negra', fantasia: null, tipo: 'solene' },
  // religiosas e grandes festas
  natal: { nome: 'Natal', fantasia: 'natal' },
  anoNovo: { nome: 'Ano Novo', fantasia: 'anoNovo' },
  pascoa: { nome: 'Páscoa', fantasia: 'pascoa' },
  carnaval: { nome: 'Carnaval', fantasia: 'carnaval' },
  reis: { nome: 'Dia de Reis', fantasia: 'coroa' },
  ramada: { nome: 'início do Ramadã', fantasia: 'fanous', ousada: false },
  eidFitr: { nome: 'Eid al-Fitr', fantasia: 'fanous', ousada: false },
  eidAdha: { nome: 'Eid al-Adha', fantasia: 'fanous', ousada: false },
  anoNovoIslamico: { nome: 'Ano Novo Islâmico', fantasia: 'fanous', ousada: false },
  roshHashana: { nome: 'Rosh Hashaná', fantasia: 'maca', ousada: false },
  pessach: { nome: 'Pessach', fantasia: null, ousada: false },
  hanukkah: { nome: 'Hanukkah', fantasia: 'cachecol', ousada: false },
  purim: { nome: 'Purim', fantasia: 'coroa', ousada: false },
  diwali: { nome: 'Diwali', fantasia: 'diya', ousada: false },
  holi: { nome: 'Holi', fantasia: 'tinta', ousada: false },
  vesak: { nome: 'Vesak', fantasia: 'lotus', ousada: false },
  anoNovoChines: { nome: 'Ano Novo Chinês', fantasia: 'lanternaChinesa' },
  // nacionais do Brasil
  tiradentes: { nome: 'Tiradentes', fantasia: 'patriota' },
  trabalho: { nome: 'Dia do Trabalho', fantasia: 'capacete' },
  independencia: { nome: 'Independência do Brasil', fantasia: 'patriota' },
  criancas: { nome: 'Dia das Crianças e de Nossa Senhora Aparecida', fantasia: 'criancas' },
  republica: { nome: 'Proclamação da República', fantasia: 'patriota' },
  // culturais
  namorados: { nome: 'Dia dos Namorados', fantasia: 'coracoes' },
  mulher: { nome: 'Dia Internacional da Mulher', fantasia: 'flor' },
  stPatrick: { nome: 'St. Patrick’s Day', fantasia: 'chapeuVerde' },
  terra: { nome: 'Dia da Terra', fantasia: 'folhas' },
  maes: { nome: 'Dia das Mães', fantasia: 'flor' },
  pais: { nome: 'Dia dos Pais', fantasia: 'gravata' },
  orgulho: { nome: 'Dia do Orgulho LGBTQIA+', fantasia: 'arcoIris' },
  festaJunina: { nome: 'Festa Junina', fantasia: 'festaJunina' },
  halloween: { nome: 'Halloween', fantasia: 'halloween' },
  muertos: { nome: 'Dia de Todos os Santos e Día de Muertos', fantasia: 'calendulas' },
  acaoDeGracas: { nome: 'Ação de Graças', fantasia: 'peregrino' },
});

const ORDER = Object.keys(HOLIDAYS);

/** Todas as festas da data, em ordem de prioridade. */
export function holidaysFor(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const md = (mm, dd) => m === mm && d === dd;
  const found = new Set();
  const add = (id) => found.add(id);

  // fixas
  if (md(1, 1) || md(12, 31)) add('anoNovo');
  if (md(1, 6)) add('reis');
  if (md(2, 14) || md(6, 12)) add('namorados');
  if (md(3, 8)) add('mulher');
  if (md(3, 17)) add('stPatrick');
  if (md(4, 21)) add('tiradentes');
  if (md(4, 22)) add('terra');
  if (md(5, 1)) add('trabalho');
  if (m === 6 && d >= 20 && d <= 30) add('festaJunina');
  if (md(6, 28)) add('orgulho');
  if (md(9, 7)) add('independencia');
  if (md(10, 12)) add('criancas');
  if (md(10, 31)) add('halloween');
  if (md(11, 1)) add('muertos');
  if (md(11, 2)) add('finados');
  if (md(11, 15)) add('republica');
  if (md(11, 20)) add('conscienciaNegra');
  if (md(12, 24) || md(12, 25)) add('natal');

  // Páscoa e derivadas
  const easter = easterDate(y);
  if (sameDay(date, addDays(easter, -2))) add('sextaSanta');
  if (sameDay(date, addDays(easter, -1)) || sameDay(date, easter)) add('pascoa');
  for (let k = -50; k <= -47; k++) if (sameDay(date, addDays(easter, k))) add('carnaval');
  if (sameDay(date, addDays(easter, 60))) add('corpusChristi');

  // dias da semana
  if (sameDay(date, nthWeekday(y, 5, 0, 2))) add('maes');
  if (sameDay(date, nthWeekday(y, 8, 0, 2))) add('pais');
  if (sameDay(date, nthWeekday(y, 11, 4, 4))) add('acaoDeGracas');

  // calendário islâmico
  const isl = islamic(date);
  if (isl) {
    if (isl.month === 9 && isl.day === 1) add('ramada');
    if (isl.month === 10 && isl.day <= 2) add('eidFitr');
    if (isl.month === 12 && (isl.day === 10 || isl.day === 11)) add('eidAdha');
    if (isl.month === 1 && isl.day === 1) add('anoNovoIslamico');
  }

  // calendário hebraico
  const heb = hebrew(date);
  if (heb) {
    if (heb.month === 'Tishri' && heb.day <= 2) add('roshHashana');
    if (heb.month === 'Tishri' && heb.day === 10) add('yomKippur');
    if (heb.month === 'Nisan' && (heb.day === 15 || heb.day === 16)) add('pessach');
    if ((heb.month === 'Adar' || heb.month === 'Adar II') && heb.day === 14) add('purim');
  }
  for (let k = 0; k < 8; k++) {
    const h = hebrew(addDays(date, -k));
    if (h && h.month === 'Kislev' && h.day === 25) add('hanukkah');
  }

  // calendário chinês
  const ch = chinese(date);
  if (ch && ch.month === '1' && ch.day === 1) add('anoNovoChines');

  // Lua
  if (diwaliDates(y).some((x) => sameDay(x, date))) add('diwali');
  if (holiDates(y).some((x) => sameDay(x, date))) add('holi');
  const vesak = vesakDate(y);
  if (vesak && sameDay(vesak, date)) add('vesak');

  return ORDER.filter((id) => found.has(id));
}

/** Festa principal da data (a de maior prioridade) ou null. */
export function holidayFor(date) {
  return holidaysFor(date)[0] || null;
}
