// Agenda somente por link: nenhuma conta, senha ou cabeçalho de autenticação.
import path from 'node:path';
import { createHash } from 'node:crypto';
import { AtomicState } from '../core/atomic-state.js';
import { isCalendarUrl, normalizeCalendarUrl, falhaAgenda, mensagemAgenda, parseIcs } from '../core/calendar.js';

export async function readCalendarFeed({ fetch, url, userAgent = 'JoJoCompanion' }) {
  let target = normalizeCalendarUrl(url);
  const signal = AbortSignal.timeout(12000), limit = 8 * 1024 * 1024;
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!isCalendarUrl(target)) throw new Error('Link de agenda inválido');
    const response = await fetch(target, { signal, redirect: 'manual', credentials: 'omit', headers: { 'User-Agent': userAgent } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel?.();
      target = new URL(response.headers.get('location'), target).href; continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (Number(response.headers?.get('content-length')) > limit) { await response.body?.cancel?.(); throw new Error('Agenda excede o limite de leitura'); }
    let text = '';
    if (response.body?.getReader) {
      const reader = response.body.getReader(), decoder = new TextDecoder(); let bytes = 0;
      try {
        for (;;) {
          const { value, done } = await reader.read(); if (done) break;
          bytes += value.byteLength;
          if (bytes > limit) { await reader.cancel(); throw new Error('Agenda excede o limite de leitura'); }
          text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode();
      } finally { reader.releaseLock(); }
    } else { text = await response.text(); if (Buffer.byteLength(text) > limit) throw new Error('Agenda excede o limite de leitura'); }
    if (!/^BEGIN:VCALENDAR\s*$/m.test(text)) throw new Error('não é uma agenda');
    return parseIcs(text);
  }
  throw new Error('Redirecionamento de agenda indisponível');
}

export function createCalendarLinkService({ userData, fetchCalendar, companion, store, fromSettings, ipcMain, notify = () => {}, now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout }) {
  const disk = new AtomicState(path.join(userData, 'calendar-link-state.json'), { defaults: () => ({ source: '', lastSync: 0 }), validate: s => {
    if (!s || typeof s.source !== 'string' || !Number.isFinite(s.lastSync) || s.lastSync < 0) throw new Error('Estado da agenda inválido'); return s;
  } });
  const source = url => createHash('sha256').update(url || '').digest('hex');
  let meta = disk.load(), epoch = 0, pending = null, retry = null, writing = false, disposed = false;
  const failures = { falhas: 0, desde: 0 };
  const snapshot = () => ({ configured: !!store.get().agendaUrl, url: store.get().agendaUrl, state: !store.get().agendaAtiva ? 'disabled' : companion.calendar.state,
    lastSync: companion.calendar.lastSync, error: companion.calendar.error ? 'unavailable' : null,
    message: companion.calendar.error ? mensagemAgenda(companion.calendar.error) : '' });
  const changed = () => notify(snapshot());
  const cancel = () => { epoch++; pending = null; clearTimer(retry); retry = null; };
  const updateSettings = patch => { writing = true; try { store.update(patch); } finally { writing = false; } };
  function resetState() {
    companion.calendar = { events: [], state: store.get().agendaUrl ? 'configured' : 'disconnected', configured: !!store.get().agendaUrl, synced: false, error: null,
      lastSync: source(store.get().agendaUrl) === meta.source ? meta.lastSync : 0 };
  }
  resetState();
  function read(url, connecting) {
    const generation = ++epoch;
    companion.setCalendar({ state: 'syncing', configured: !!store.get().agendaUrl }); changed();
    const task = (async () => {
      try {
        const events = await fetchCalendar(url);
        if (generation !== epoch || disposed) return { ...snapshot(), ok: false, error: 'Consulta cancelada.' };
        const next = { source: source(url), lastSync: now() }; disk.write(next); meta = next;
        if (connecting) updateSettings({ agendaUrl: url, agendaAtiva: true });
        companion.setCalendar({ events, state: events.length ? 'connected' : 'empty', configured: true, lastSync: meta.lastSync });
        failures.falhas = 0; failures.desde = 0; companion.reportSystem('agenda', 'Sistema: Agenda', null);
        return { ...snapshot(), ok: true, count: events.length };
      } catch (err) {
        if (generation !== epoch || disposed) return { ...snapshot(), ok: false, error: 'Consulta cancelada.' };
        // Só códigos conhecidos chegam ao estado; links e detalhes de respostas não vão a logs/IPC.
        const detail = String(err.message || '');
        const reason = /HTTP 40[134]/.test(detail) ? 'HTTP 403' : /agenda|VCALENDAR/.test(detail) ? 'não é uma agenda' : 'network';
        companion.setCalendar({ state: 'error', error: reason, configured: !!store.get().agendaUrl });
        const f = falhaAgenda(failures, reason === 'network' ? 'ERR_NETWORK_CHANGED' : reason, now());
        if (f.avisar) companion.reportSystem('agenda', 'Sistema: Agenda', mensagemAgenda(reason));
        if (store.get().agendaAtiva && store.get().agendaUrl === url) retry = setTimer(() => sync(), f.proximaMs);
        return { ...snapshot(), ok: false, error: mensagemAgenda(reason) };
      } finally {
        if (generation === epoch && !disposed) changed();
      }
    })();
    pending = { url, task };
    return task.finally(() => { if (pending?.task === task) pending = null; });
  }
  function sync() {
    clearTimer(retry); retry = null;
    const s = store.get();
    if (disposed || !s.agendaAtiva || !s.agendaUrl) { cancel(); changed(); return Promise.resolve(snapshot()); }
    if (!isCalendarUrl(s.agendaUrl)) return Promise.resolve({ ...snapshot(), ok: false, error: 'Use o link iCal completo da agenda.' });
    if (pending?.url === s.agendaUrl) return pending.task;
    return read(normalizeCalendarUrl(s.agendaUrl), false);
  }
  async function connect(value) {
    const url = normalizeCalendarUrl(value);
    if (!isCalendarUrl(url)) return { ...snapshot(), ok: false, error: 'Use o link completo webcal:// ou HTTPS do calendário iCloud ou Google.' };
    cancel(); return read(url, true);
  }
  async function disconnect() {
    cancel(); disk.write({ source: '', lastSync: 0 }); meta = { source: '', lastSync: 0 };
    updateSettings({ agendaUrl: '' }); resetState(); changed(); return snapshot();
  }
  ipcMain.handle('calendar:request', async (e, request) => {
    if (!fromSettings(e) || !request || typeof request !== 'object') return { error: 'Emissor não autorizado.' };
    try {
      if (request.action === 'status') return snapshot();
      if (request.action === 'connect') return await connect(request.data?.url);
      if (request.action === 'sync') return await sync();
      if (request.action === 'disconnect') return await disconnect();
      return { ...snapshot(), ok: false, error: 'Operação indisponível.' };
    } catch { return { ...snapshot(), ok: false, error: 'Não consegui confirmar a alteração da agenda no disco.' }; }
  });
  return { sync, connect, disconnect, snapshot, settingsChanged() { if (!writing) { cancel(); resetState(); changed(); return sync(); } },
    dispose() { disposed = true; cancel(); ipcMain.removeHandler('calendar:request'); } };
}
