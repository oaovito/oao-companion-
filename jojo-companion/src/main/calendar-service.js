import path from 'node:path';
import { IcloudCaldav, CaldavError } from '../core/caldav.js';
import { AtomicState } from '../core/atomic-state.js';
import { CredentialVault } from './credential-vault.js';
const messages = {
  auth: 'O iCloud recusou a autorização. Renove a senha específica de aplicativo nas configurações.',
  credentials: 'Informe o ID Apple e uma senha específica de aplicativo nos campos seguros.',
  encryption: 'A proteção de credenciais do Windows não está disponível. A senha não foi salva.',
  locked: 'O Windows não conseguiu desbloquear a credencial. Reconecte a conta neste perfil do Windows.',
  selection: 'Escolha pelo menos um calendário para sincronizar.', network: 'Não consegui alcançar o iCloud. A última sincronização válida continua registrada.',
  rate_limit: 'O iCloud pediu uma pausa. Vou aguardar a próxima sincronização.',
};
export function createCalendarService({ userData, safeStorage, credentialVault = null, fetch, companion, store, fromSettings, ipcMain, notify, now = () => Date.now() }) {
  const vault = credentialVault || new CredentialVault(path.join(userData, 'icloud-credentials.json'), safeStorage);
  const disk = new AtomicState(path.join(userData, 'icloud-state.json'), { defaults: () => ({ version: 1, configured: false, calendars: [], selected: [], lastSync: 0 }), validate: s => {
    if (!s || s.version !== 1 || !Array.isArray(s.calendars) || !Array.isArray(s.selected)) throw new Error('Estado iCloud inválido.'); return s;
  } });
  let meta = disk.load(), client = null, epoch = 0, pending = null, error = null;
  function snapshot() {
    return { configured: !!meta.configured, calendars: structuredClone(meta.calendars), selected: [...meta.selected], lastSync: meta.lastSync,
      state: companion.calendar.state, error, message: error ? messages[error] || 'Não consegui concluir a leitura do iCloud. Seus compromissos não foram alterados.' : '', secureStorage: vault.available() };
  }
  function changed() { notify(snapshot()); }
  if (meta.configured) companion.setCalendar({ state: 'configured', configured: true, lastSync: meta.lastSync });
  async function getClient() {
    if (!client) {
      const account = vault.read(); if (!account) throw new CaldavError('credentials');
      const next = new IcloudCaldav({ fetch, ...account }); await next.discover(); client = next;
    }
    return client;
  }
  async function sync(query = null) {
    if (!meta.configured || !store.get().agendaAtiva) return snapshot();
    // Um único pedido de sincronização, tanto para timer, retomada quanto para chat/UI.
    if (pending) { await pending; if (query?.from && query?.to && (!meta.range || query.from.getTime() < meta.range.from || query.to.getTime() > meta.range.to)) return sync(query); return snapshot(); }
    const generation = epoch;
    pending = (async () => {
      error = null; companion.setCalendar({ state: 'syncing', configured: true }); changed();
      try {
        const api = await getClient();
        const from = query?.from ? new Date(Math.min(query.from.getTime(), now() - 86400e3)) : new Date(now() - 7 * 86400e3);
        const to = query?.to ? new Date(Math.max(query.to.getTime(), now() + 90 * 86400e3)) : new Date(now() + 90 * 86400e3);
        const selected = meta.selected.filter(id => api.calendars.some(c => c.id === id));
        const events = await api.events(selected, { from, to });
        if (generation !== epoch) return;
        const next = { ...meta, calendars: api.calendars, selected, lastSync: now(), range: { from: from.getTime(), to: to.getTime() } };
        disk.write(next); meta = next;
        companion.setCalendar({ events, state: events.length ? 'connected' : 'empty', configured: true, lastSync: meta.lastSync });
      } catch (e) {
        if (generation !== epoch) return;
        error = e.code || 'response'; if (error === 'auth') client = null;
        companion.setCalendar({ state: 'error', configured: true, error, lastSync: meta.lastSync });
      } finally { if (generation === epoch) changed(); }
    })();
    try { await pending; } finally { if (generation === epoch) pending = null; }
    return snapshot();
  }
  async function connect({ username, password }) {
    const generation = ++epoch; pending = null;
    error = null; companion.setCalendar({ state: 'syncing', configured: !!meta.configured }); changed();
    try {
      if (!vault.available()) throw new Error('encryption');
      const api = new IcloudCaldav({ fetch, username, password }); const calendars = await api.discover();
      if (generation !== epoch) return snapshot();
      vault.write({ username, password });
      const next = { version: 1, configured: true, calendars, selected: calendars.map(c => c.id), lastSync: 0 };
      disk.write(next); meta = next; client = api;
      store.update({ agendaAtiva: true, agendaUrl: '' });
      await sync();
    } catch (e) { error = e.code || (e.message === 'encryption' ? 'encryption' : 'response'); companion.setCalendar({ state: 'error', configured: !!meta.configured, error }); changed(); }
    return snapshot();
  }
  async function disconnect() {
    epoch++; pending = null; client = null; vault.remove();
    meta = { version: 1, configured: false, calendars: [], selected: [], lastSync: 0 }; disk.write(meta); error = null;
    companion.calendar = { events: [], state: 'disconnected', configured: false, synced: false, error: null, lastSync: 0 };
    changed(); return snapshot();
  }
  ipcMain.handle('calendar:request', async (e, request) => {
    if (!fromSettings(e) || !request || typeof request !== 'object') return { error: 'Emissor não autorizado.' };
    try {
      if (request.action === 'status') return snapshot();
      if (request.action === 'connect') return await connect(request.data || {});
      if (request.action === 'sync') return await sync();
      if (request.action === 'disconnect') return await disconnect();
      if (request.action === 'select') {
        const ids = request.data; if (!Array.isArray(ids) || ids.some(id => !meta.calendars.some(c => c.id === id))) throw new Error();
        const next = { ...meta, selected: [...new Set(ids)] }; disk.write(next); meta = next;
        await sync(); return snapshot();
      }
      return { error: 'Operação indisponível.' };
    } catch { return { ...snapshot(), error: 'storage', message: 'Não consegui confirmar a alteração da agenda no disco. Tente novamente.' }; }
  });
  return { get configured() { return !!meta.configured; }, sync, snapshot, disconnect, dispose: () => { epoch++; client = null; ipcMain.removeHandler('calendar:request'); } };
}
