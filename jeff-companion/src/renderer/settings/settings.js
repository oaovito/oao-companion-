// Janela de configurações: aplica cada alteração imediatamente (validada no main).
const api = window.settingsApi;
const form = document.getElementById('form');
let info = null;
let recording = false;

const FMT = {
  pct: (v) => `${Math.round(v * 100)}%`,
  px: (v) => `${v} px`,
  x: (v) => `${Number(v).toFixed(1)}×`,
  activity: (v) => (v < 0.3 ? 'Calmo' : v < 0.7 ? 'Normal' : 'Agitado'),
};

function prettyHotkey(acc) {
  return String(acc || '').replace(/Control/g, 'Ctrl').split('+').join(' + ');
}

function render(i) {
  info = i;
  const s = i.settings;
  document.getElementById('version').textContent = `Versão ${i.version}.`;
  const sel = document.getElementById('displaySelect');
  sel.innerHTML = '';
  sel.append(new Option('Automático (monitor atual)', 'auto'));
  for (const d of i.displays) sel.append(new Option(`${d.label}${d.primary ? ' (principal)' : ''} — ${d.size}, escala ${Math.round(d.scaleFactor * 100)}%`, d.id));
  if (s.preferredDisplay !== 'auto' && !i.displays.some((d) => d.id === s.preferredDisplay)) {
    sel.append(new Option('Monitor salvo (desconectado)', s.preferredDisplay));
  }
  for (const el of form.elements) {
    if (!el.name || !(el.name in s)) continue;
    if (el === document.activeElement && el.type !== 'checkbox' && el.type !== 'range') continue;
    if (el.type === 'checkbox') el.checked = !!s[el.name];
    else if (el.id === 'hotkeyInput') {
      if (!recording) el.value = prettyHotkey(s.interactionHotkey);
    } else el.value = String(s[el.name]);
  }
  for (const o of document.querySelectorAll('output[data-for]')) {
    o.textContent = FMT[o.dataset.fmt](s[o.dataset.for]);
  }
  const hk = document.getElementById('hotkeyStatus');
  hk.textContent = i.hotkey.ok
    ? `Atalho ativo: ${prettyHotkey(i.hotkey.accelerator)}. Também disponível pela bandeja.`
    : `Não foi possível registrar o atalho: ${i.hotkey.error || 'erro desconhecido'} O modo de interação continua disponível pelo ícone da bandeja.`;
  hk.className = `hint ${i.hotkey.ok ? 'ok' : 'error'}`;
  document.getElementById('autostartStatus').textContent = i.autostart.supported
    ? (i.autostart.packaged ? 'Desativado por padrão.' : 'Desativado por padrão. (Em modo de desenvolvimento registra o Electron com o caminho do projeto.)')
    : 'Indisponível neste sistema.';
  document.querySelector('[name=startWithWindows]').disabled = !i.autostart.supported;
  document.getElementById('fullscreenStatus').textContent = i.fullscreen.available
    ? 'Funciona com janelas que cobrem o monitor (inclusive vídeos e apresentações). Jogos em tela cheia exclusiva e telas protegidas do Windows podem ficar por cima do Jeff.'
    : `Detecção de tela cheia: ${i.fullscreen.reason || 'indisponível'}`;
  document.getElementById('dialogueInfo').textContent = `Conversa: ${i.dialogue.label}. ${i.dialogue.scripted ? 'Não é uma IA de conversa livre.' : ''}`;
  document.getElementById('paths').textContent = `Configurações: ${i.paths.userData}`;
  const notice = document.getElementById('notice');
  if (i.loadIssues && i.loadIssues.length) {
    notice.textContent = `Algumas configurações salvas eram inválidas e foram corrigidas: ${i.loadIssues.join(', ')}.`;
    notice.classList.remove('hidden');
  }
}

function valueOf(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'range' || el.type === 'number') return Number(el.value);
  return el.value;
}

async function send(patch) {
  render(await api.set(patch));
}

form.addEventListener('input', (e) => {
  const el = e.target;
  if (!el.name || el.id === 'hotkeyInput') return;
  const o = document.querySelector(`output[data-for="${el.name}"]`);
  if (o) o.textContent = FMT[o.dataset.fmt](valueOf(el));
  if (el.type === 'range') send({ [el.name]: valueOf(el) });
});

form.addEventListener('change', (e) => {
  const el = e.target;
  if (!el.name || el.id === 'hotkeyInput') return;
  send({ [el.name]: valueOf(el) });
});

// Gravação do atalho: clique no campo e pressione a combinação.
const hotkeyInput = document.getElementById('hotkeyInput');
hotkeyInput.addEventListener('focus', () => {
  recording = true;
  hotkeyInput.classList.add('recording');
  hotkeyInput.value = 'Pressione a combinação…';
});
hotkeyInput.addEventListener('blur', () => {
  recording = false;
  hotkeyInput.classList.remove('recording');
  if (info) hotkeyInput.value = prettyHotkey(info.settings.interactionHotkey);
});
hotkeyInput.addEventListener('keydown', (e) => {
  e.preventDefault();
  if (e.key === 'Escape') {
    hotkeyInput.blur();
    return;
  }
  const mods = [];
  if (e.ctrlKey) mods.push('Control');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Super');
  const key = keyName(e);
  if (!key || !mods.length) return;
  const acc = [...mods, key].join('+');
  recording = false;
  hotkeyInput.classList.remove('recording');
  hotkeyInput.blur();
  send({ interactionHotkey: acc });
});

function keyName(e) {
  const c = e.code;
  if (/^Key[A-Z]$/.test(c)) return c.slice(3);
  if (/^Digit[0-9]$/.test(c)) return c.slice(5);
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(c)) return c;
  const map = { Space: 'Space', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete', Insert: 'Insert', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' };
  return map[c] || null;
}

document.getElementById('hotkeyDefault').addEventListener('click', () => send({ interactionHotkey: info.defaults.interactionHotkey }));
document.getElementById('reset').addEventListener('click', async () => {
  if (confirm('Restaurar todas as configurações para o padrão?')) render(await api.reset());
});
document.getElementById('openFolder').addEventListener('click', () => api.openFolder());
api.onChanged(render);
api.load().then(render);
