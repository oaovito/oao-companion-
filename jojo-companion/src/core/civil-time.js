// Datas civis: recorrência usa o calendário escolhido, nunca intervalos de 24 h.
const formats = new Map();
export function timeZone(zone = 'local') {
  const value = zone === 'local' ? Intl.DateTimeFormat().resolvedOptions().timeZone : zone;
  new Intl.DateTimeFormat('en', { timeZone: value }).format(0);
  return value;
}
export function civilParts(now, zone = 'local') {
  zone = timeZone(zone);
  if (!formats.has(zone)) formats.set(zone, new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }));
  return Object.fromEntries(formats.get(zone).formatToParts(new Date(now)).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}
export function shiftDay(day, n) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekday(day) { return new Date(`${day}T12:00:00Z`).getUTCDay(); }
export function validDay(day) {
  return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(`${day}T12:00Z`)) && new Date(`${day}T12:00Z`).toISOString().slice(0, 10) === day;
}
export function logicalDay(now, { zone = 'local', resetTime = '00:00' } = {}) {
  const p = civilParts(now, zone);
  const day = `${p.year}-${p.month}-${p.day}`;
  return `${p.hour}:${p.minute}` < resetTime ? shiftDay(day, -1) : day;
}

/** Horário civil → instante; gaps DST usam o instante posterior, overlaps o primeiro. */
export function civilEpoch({ year, month, day, hour = 0, minute = 0, second = 0 }, zone = 'local') {
  const target = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  let guess = target; const tried = [];
  for (let i = 0; i < 6; i++) {
    const p = civilParts(guess, zone);
    const value = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
    const next = guess + target - value;
    if (next === guess) return guess;
    if (tried.includes(next)) return Math.max(guess, next);
    tried.push(guess); guess = next;
  }
  throw new Error('Não consegui resolver o horário no fuso informado.');
}
