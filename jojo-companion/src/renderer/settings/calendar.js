const api = window.settingsApi;
const root = document.getElementById('calendarFields');
const state = document.getElementById('calendarStatus');
const link = document.getElementById('calendarLink');
let current = null;
function render(s) {
  current = s;
  const names = { disconnected: 'Desconectada', disabled: 'Consulta desligada', configured: 'Configurada, aguardando consulta', syncing: 'Sincronizando…', connected: 'Conectada — consulta válida', empty: 'Conectada — consulta válida sem eventos', error: 'Falha na consulta' };
  state.textContent = `${names[s.state] || 'Desconectada'}${s.lastSync ? ` · Última sincronização válida: ${new Date(s.lastSync).toLocaleString('pt-BR')}` : ''}${s.message || s.error ? `. ${s.message || s.error}` : ''}`;
  state.classList.toggle('error', !!s.error);
  if (document.activeElement !== link && s.url !== undefined) link.value = s.url;
  document.getElementById('calendarConnect').disabled = s.state === 'syncing';
  document.getElementById('calendarSync').disabled = !s.configured || s.state === 'syncing' || s.state === 'disabled';
  document.getElementById('calendarDisconnect').disabled = !s.configured;
  root.dataset.configured = s.configured ? 'true' : 'false';
}
async function request(action, data) {
  try { render(await api.calendar({ action, data })); }
  catch { state.textContent = 'Não consegui consultar a agenda. Tente novamente.'; }
}
document.getElementById('calendarConnect').addEventListener('click', () => request('connect', { url: link.value }));
document.getElementById('calendarSync').addEventListener('click', () => request('sync'));
document.getElementById('calendarDisconnect').addEventListener('click', () => {
  if (current?.configured && confirm('Desconectar esta agenda do JoJo? Os compromissos serão preservados.')) request('disconnect');
});
api.onCalendarChanged(render);
request('status');
