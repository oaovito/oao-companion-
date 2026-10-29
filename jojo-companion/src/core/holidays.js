// Datas festivas: em qual festa estamos (para a fantasia do JoJo). Puro.

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

export const HOLIDAYS = Object.freeze({
  natal: 'Natal',
  anoNovo: 'Ano Novo',
  pascoa: 'Páscoa',
  carnaval: 'Carnaval',
  festaJunina: 'Festa Junina',
  criancas: 'Dia das Crianças',
  halloween: 'Halloween',
});

/** Festa da data (local) ou null. */
export function holidayFor(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 12 && (d === 24 || d === 25)) return 'natal';
  if ((m === 12 && d === 31) || (m === 1 && d === 1)) return 'anoNovo';
  const easter = easterDate(date.getFullYear());
  // Sexta-feira Santa até o domingo de Páscoa.
  for (let k = -2; k <= 0; k++) if (sameDay(date, addDays(easter, k))) return 'pascoa';
  // Carnaval: sábado até terça (a terça é 47 dias antes da Páscoa).
  for (let k = -50; k <= -47; k++) if (sameDay(date, addDays(easter, k))) return 'carnaval';
  if (m === 6 && d >= 20 && d <= 30) return 'festaJunina';
  if (m === 10 && d === 12) return 'criancas';
  if (m === 10 && d === 31) return 'halloween';
  return null;
}
