const api = window.settingsApi;
const root = document.getElementById('icloudFields');
const state = document.getElementById('icloudStatus');
const username = document.getElementById('icloudUser'); const password = document.getElementById('icloudPassword');
const calendars = document.getElementById('icloudCalendars'); let current = null;
function render(s) {
  current = s;
  const names = { disconnected: 'Desconectada', configured: 'Configurada, aguardando consulta', syncing: 'Sincronizando…', connected: 'Conectada — consulta válida', empty: 'Conectada — consulta válida sem eventos', error: 'Falha na consulta' };
  state.textContent = `${s.configured ? names[s.state] || 'Configurada' : s.error ? 'Conexão não concluída' : 'Desconectada'}${s.lastSync ? ` · Última sincronização válida: ${new Date(s.lastSync).toLocaleString('pt-BR')}` : ''}${s.message ? `. ${s.message}` : ''}`;
  state.classList.toggle('error', !!s.error);
  document.getElementById('icloudConnect').disabled = s.state === 'syncing' || !s.secureStorage;
  document.getElementById('icloudSync').disabled = !s.configured || s.state === 'syncing';
  document.getElementById('icloudDisconnect').disabled = !s.configured;
  calendars.replaceChildren();
  for (const c of s.calendars || []) {
    const label = document.createElement('label'); label.className = 'check';
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = s.selected.includes(c.id); check.value = c.id;
    check.disabled = s.state === 'syncing'; check.addEventListener('change', async () => {
      const selected = [...calendars.querySelectorAll('input:checked')].map(x => x.value);
      render(await api.calendar({ action: 'select', data: selected }));
    });
    label.append(check, document.createTextNode(c.name)); calendars.append(label);
  }
  root.dataset.configured = s.configured ? 'true' : 'false';
}
document.getElementById('icloudConnect').addEventListener('click', async () => {
  try { render(await api.calendar({ action: 'connect', data: { username: username.value, password: password.value } })); }
  finally { password.value = ''; }
});
document.getElementById('icloudSync').addEventListener('click', async () => render(await api.calendar({ action: 'sync' })));
document.getElementById('icloudDisconnect').addEventListener('click', async () => {
  if (current?.configured && confirm('Desconectar o iCloud deste JoJo? Seus calendários e eventos na Apple serão preservados.')) render(await api.calendar({ action: 'disconnect' }));
});
api.onCalendarChanged(render);
api.calendar({ action: 'status' }).then(render);
