// Janela de configurações: aplica cada alteração imediatamente (validada no main).
import { TodoSettings } from '../shared/todo-view.js';
import { VIRAIS } from '../../core/virais.js';
const api = window.settingsApi;
const form = document.getElementById('form');
let info = null;
let recording = false;
const todoSettings = new TodoSettings(document.getElementById('todoSettingsFields'), api);
api.onTodoChanged(s => todoSettings.render(s));
todoSettings.load();

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
  const pt = document.getElementById('petToggle');
  pt.textContent = i.petVisible ? 'Tuck Away Pet' : 'Wake Pet';
  pt.title = i.petVisible ? `Esconder o ${i.companionName}` : `Mostrar o ${i.companionName}`;
  renderPersonality(i);
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
  renderDiscord(i);
  renderVirais(s);
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
    ? 'Funciona com janelas que cobrem o monitor (inclusive vídeos e apresentações). Jogos em tela cheia exclusiva e telas protegidas do Windows podem ficar por cima do JoJo.'
    : `Detecção de tela cheia: ${i.fullscreen.reason || 'indisponível'}`;
  document.getElementById('paths').textContent = `Configurações: ${i.paths.userData}`;
  const notice = document.getElementById('notice');
  if (i.loadIssues && i.loadIssues.length) {
    notice.textContent = `Algumas configurações salvas eram inválidas e foram corrigidas: ${i.loadIssues.join(', ')}.`;
    notice.classList.remove('hidden');
  }
}

// ---------------- Bloqueio do Discord: estado, extensão e histórico
function renderDiscord(i) {
  const d = i.discord;
  // A seção fica sempre oculta da usuária; o estado continua sendo preenchido.
  if (!d) return;
  document.getElementById('discordStatus').textContent = d.ativo
    ? (d.ponte ? 'Ligado. Aplicativo e abas (com a extensão instalada).' : 'Ligado para o aplicativo. A ponte com o navegador não foi registrada; as abas não serão fechadas.')
    : 'Desligado. Nenhuma detecção e nenhuma ação.';
  document.getElementById('discordExtension').hidden = !d.ativo || !d.pastaExtensao;
  const list = document.getElementById('discordHistory');
  list.textContent = '';
  const itens = d.historico.length ? d.historico : [{ quando: '', texto: 'Nenhum registro.' }];
  for (const h of itens) {
    const li = document.createElement('li');
    li.textContent = h.quando ? `${h.quando}: ${h.texto}` : h.texto;
    list.append(li);
  }
}

// ---------------- Personalidade (campos com data-p="caminho.no.perfil")
const pFields = () => Array.from(document.querySelectorAll('[data-p]'));

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function renderPersonality(i) {
  const p = i.personality;
  if (!p) return;
  document.getElementById('companionTitle').textContent = p.nomeCompanion || 'JoJo';
  document.title = `${p.nomeCompanion || 'JoJo'} — Configurações`;
  for (const el of pFields()) {
    if (el === document.activeElement && el.type !== 'checkbox') continue;
    const v = getPath(p, el.dataset.p);
    const scale = Number(el.dataset.scale || 1);
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v == null ? '' : el.type === 'number' ? String(Math.round(v / scale)) : String(v);
  }
  document.getElementById('discordFocusStatus').textContent = i.focusApps?.message || 'O Discord não será reaberto quando o foco terminar.';
  const fg = document.getElementById('foregroundStatus');
  fg.textContent = i.foreground.available
    ? 'Funciona no navegador e no app do Windows: compara só o título da janela em primeiro plano com "Instagram". Nada é lido, salvo ou enviado. Respeita o modo silencioso e a pausa.'
    : 'A detecção do Instagram só funciona no Windows.';
}

async function sendPersonality(el) {
  const path = el.dataset.p.split('.');
  const scale = Number(el.dataset.scale || 1);
  let v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Math.round(Number(el.value) * scale) : el.value;
  let patch;
  if (path.length === 1) patch = { [path[0]]: v };
  else patch = { [path[0]]: { ...(info.personality[path[0]] || {}), [path[1]]: v } };
  render(await api.setPersonality(patch));
}

for (const el of pFields()) {
  el.addEventListener('change', () => sendPersonality(el));
}
document.getElementById('resetPersonality').addEventListener('click', async () => {
  if (confirm('Restaurar a personalidade padrão do JoJo?')) render(await api.resetPersonality());
});
document.getElementById('openPersonality').addEventListener('click', () => api.openPersonalityFile());

function valueOf(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'range' || el.type === 'number' || el.dataset.num) return Number(el.value);
  return el.value;
}

async function send(patch) {
  render(await api.set(patch));
}

form.addEventListener('input', (e) => {
  const el = e.target;
  if (!el.name || el.id === 'hotkeyInput' || el.dataset.p) return;
  const o = document.querySelector(`output[data-for="${el.name}"]`);
  if (o) o.textContent = FMT[o.dataset.fmt](valueOf(el));
  if (el.type === 'range') send({ [el.name]: valueOf(el) });
});

form.addEventListener('change', (e) => {
  const el = e.target;
  if (!el.name || el.id === 'hotkeyInput' || el.dataset.p) return;
  // Bloqueio do Discord: só liga depois de mostrar de novo o que ele faz.
  if (el.name === 'discordBloqueio' && el.checked && !confirm(`${document.getElementById('discordOQueFaz').innerText.trim()}\n\nLigar o bloqueio do Discord?`)) {
    el.checked = false;
    return;
  }
  send({ [el.name]: valueOf(el) });
});

// Animações virais: uma caixa por animação (marcada = permitida).
const viraisLista = document.getElementById('viraisLista');
for (const v of VIRAIS) {
  const label = document.createElement('label');
  label.className = 'check';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.dataset.viral = v.id;
  box.addEventListener('change', () => {
    const bloqueadas = new Set(info?.settings.viraisBloqueadas || []);
    if (box.checked) bloqueadas.delete(v.id);
    else bloqueadas.add(v.id);
    send({ viraisBloqueadas: [...bloqueadas] });
  });
  const marca = v.adulto ? ' (adulto)' : v.negro ? ' (humor negro)' : '';
  label.append(box, ` ${String(v.num).padStart(2, '0')}. ${v.nome} — ${v.referencia}${marca}`);
  viraisLista.append(label);
}
function renderVirais(s) {
  const bloqueadas = new Set(s.viraisBloqueadas || []);
  for (const box of viraisLista.querySelectorAll('input[data-viral]')) box.checked = !bloqueadas.has(box.dataset.viral);
}

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
document.getElementById('discordExtensionFolder').addEventListener('click', () => api.openDiscordExtension());
document.getElementById('petToggle').addEventListener('click', async () => render(await api.togglePet()));
api.onChanged(render);
api.load().then(render);
