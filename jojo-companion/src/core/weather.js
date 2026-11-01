// Clima factual: apenas APIs Open-Meteo. Nunca delegar numeros ou cidades ao modelo.
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const VALID_TTL = 10 * 60e3;
export class WeatherError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export function weatherRequest(text, { lastCity = null } = {}) {
  const raw = String(text || '').trim();
  const n = norm(raw);
  if (/\btempo.*(?:joguei|jogo|sessao|xp|estudei|trabalhei|de foco|de trabalho)\b/.test(n) && !/\b(clima|chuva|chover|meteorolog)/.test(n)) return null;
  const followup = /^(?:e )?(amanha|hoje|depois de amanha|nos proximos dias|essa semana)[?!.,]*$/.test(n);
  if (!(followup && lastCity) && !/\b(previsao (?:do )?tempo|(?:como|qual|como vai|como estara|como vai estar).{0,30}\b(?:tempo|clima)\b|vai chover|chuva (?:hoje|amanha)|temperatura (?:agora|hoje|amanha|em)|(?:umidade|vento|clima|tempo) (?:hoje|amanha|agora|em))/.test(n)) return null;
  const city = raw.match(/\b(?:em|para|pra|na cidade de)\s+(.+?)(?:[?!]|$)/i)?.[1]
    ?.replace(/\b(hoje|amanh[ãa]|agora|nos pr[oó]ximos dias|essa semana)\b/gi, '').replace(/[,.;\s]+$/, '').trim();
  return { city: city || (followup ? lastCity : null), offset: /depois de amanha/.test(n) ? 2 : /amanha/.test(n) ? 1 : 0, days: /proximos dias|semana/.test(n) ? 7 : 1, current: /agora|atual/.test(n) };
}

export function dateInZone(now, zone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now)).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
const addDays = (day, n) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
const metric = (x, suffix) => Number.isFinite(x) ? `${Math.round(x * 10) / 10}${suffix}` : 'indisponível';

export class WeatherService {
  constructor({ fetch, now = () => Date.now(), timeoutMs = 9000 } = {}) {
    this.fetch = fetch; this.now = now; this.timeoutMs = timeoutMs;
    this.cache = new Map(); this.locations = new Map(); this.pending = new Map();
  }
  async _json(url) {
    try {
      const res = await this.fetch(url, { signal: AbortSignal.timeout(this.timeoutMs), redirect: 'error', headers: { Accept: 'application/json' } });
      if (!res.ok) throw new WeatherError(res.status === 429 ? 'rate_limit' : 'connection');
      const data = await res.json();
      if (data.error) throw new WeatherError('invalid_response');
      return data;
    } catch (e) { throw e instanceof WeatherError ? e : new WeatherError('connection'); }
  }
  async locate(city) {
    const key = norm(city).trim();
    if (!key || key.length > 120) throw new WeatherError('city_required');
    if (this.locations.has(key)) return this.locations.get(key);
    const parts = city.split(',').map((s) => s.trim());
    const name = parts[0];
    const data = await this._json(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name, count: '10', language: 'pt', format: 'json' })}`);
    let results = (data.results || []).filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude) && r.name && r.timezone);
    if (parts[1]) {
      const region = norm(parts[1]);
      const matches = results.filter((r) => norm(`${r.admin1 || ''} ${r.country || ''} ${r.country_code || ''}`).includes(region) || (region === 'pr' && norm(r.admin1) === 'parana'));
      if (matches.length) results = matches;
      else throw new WeatherError('city_not_found');
    }
    const exact = results.filter((r) => norm(r.name) === norm(name));
    if (exact.length) results = exact;
    if (!results.length) throw new WeatherError('city_not_found');
    if (results.length > 1 && !parts[1] && results.some((r) => r.country_code !== results[0].country_code || r.admin1 !== results[0].admin1)) throw new WeatherError('city_ambiguous');
    const location = results[0];
    try { dateInZone(this.now(), location.timezone); } catch { throw new WeatherError('invalid_response'); }
    if (Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) throw new WeatherError('invalid_response');
    if (this.locations.size >= 64) this.locations.delete(this.locations.keys().next().value);
    this.locations.set(key, location);
    return location;
  }
  async forecast(city) {
    const key = norm(city).trim();
    const cached = this.cache.get(key);
    const age = cached ? this.now() - cached.fetchedAt : Infinity;
    if (age >= 0 && age < VALID_TTL) return { ...cached, cached: true };
    if (this.pending.has(key)) return this.pending.get(key);
    const request = (async () => {
      const location = await this.locate(city);
      const params = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), timezone: location.timezone, forecast_days: '16', current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m', daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max', wind_speed_unit: 'kmh', precipitation_unit: 'mm', temperature_unit: 'celsius' });
      const data = await this._json(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!data.current?.time || !Number.isFinite(data.current.temperature_2m) || !Array.isArray(data.daily?.time) || !data.daily.time.length || data.timezone !== location.timezone || data.current_units?.temperature_2m !== '°C' || !Number.isFinite(data.latitude) || !Number.isFinite(data.longitude) || Math.abs(data.latitude - location.latitude) > 0.25 || Math.abs(data.longitude - location.longitude) > 0.25) throw new WeatherError('invalid_response');
      const result = { location, current: data.current, daily: data.daily, fetchedAt: this.now(), source: 'Open-Meteo', cached: false };
      if (this.cache.size >= 64) this.cache.delete(this.cache.keys().next().value);
      this.cache.set(key, result);
      return result;
    })();
    this.pending.set(key, request);
    try { return await request; } finally { this.pending.delete(key); }
  }
  async answer(request, defaultCity) {
    const city = request.city || defaultCity;
    if (!city) return { ok: false, code: 'city_required', text: 'Qual cidade? Me diga o nome e o estado para eu consultar o clima certo.' };
    try {
      const result = await this.forecast(city);
      const { location: loc, current, daily } = result;
      const today = dateInZone(this.now(), loc.timezone);
      const lines = [];
      for (let i = 0; i < request.days; i++) {
        const date = addDays(today, request.offset + i);
        const idx = daily.time.indexOf(date);
        if (idx < 0) throw new WeatherError('date_unavailable');
        lines.push(`${date.split('-').reverse().join('/')}: ${metric(daily.temperature_2m_min?.[idx], ' °C')} a ${metric(daily.temperature_2m_max?.[idx], ' °C')}; chuva ${metric(daily.precipitation_probability_max?.[idx], '%')}, precipitação ${metric(daily.precipitation_sum?.[idx], ' mm')}`);
      }
      const present = request.offset === 0 ? `Agora: ${metric(current.temperature_2m, ' °C')}; sensação ${metric(current.apparent_temperature, ' °C')}; umidade ${metric(current.relative_humidity_2m, '%')}; vento ${metric(current.wind_speed_10m, ' km/h')}; precipitação ${metric(current.precipitation, ' mm')}.\n` : '';
      return { ok: true, city: `${loc.name}, ${loc.admin1 || loc.country}`, result, text: `${loc.name}${loc.admin1 ? `, ${loc.admin1}` : ''}.\n${present}${lines.join('\n')}.\nFonte: Open-Meteo. Horário dos dados: ${current.time.replace('T', ' ')} (${loc.timezone}).${result.cached ? ' Consulta recente em cache.' : ''}` };
    } catch (e) {
      const messages = { city_not_found: 'Não encontrei essa cidade. Me diga cidade e estado.', city_ambiguous: 'Há mais de uma cidade com esse nome. Qual estado ou país?', invalid_response: 'O serviço de clima devolveu dados incompletos. Não vou inventar a previsão.', date_unavailable: 'Essa data está fora da previsão disponível.', rate_limit: 'O serviço de clima atingiu o limite de consultas. Tente novamente daqui a pouco.' };
      return { ok: false, code: e.code || 'connection', text: messages[e.code] || 'Não consegui consultar o Open-Meteo agora. Confira a conexão e tente novamente; não tenho uma previsão atual confirmada.' };
    }
  }
}
