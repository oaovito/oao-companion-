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
