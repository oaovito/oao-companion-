// Central do JoJo: conversas com status (Running / Needs input / Ready / Blocked),
// chat e menu de comandos "/" (inclui Wake Pet / Tuck Away Pet).
const api = window.appApi;
const $ = (id) => document.getElementById(id);
const listEl = $('list');
const logEl = $('log');
const input = $('input');
const menuEl = $('cmdMenu');
let st = null;
let selected = null;
let menuIndex = 0;

function chip(el, status, label) {
  el.className = `chip ${status}`;
  el.textContent = label || '';
  el.classList.toggle('hidden', !label);
}

function render(s) {
  st = s;
  if (!selected || !s.conversations.some((c) => c.id === selected)) selected = s.currentId;
  $('name').textContent = s.companionName;
  document.title = s.companionName;
  $('petToggle').textContent = s.petVisible ? 'Tuck Away Pet' : 'Wake Pet';
  $('petToggle').title = s.petVisible ? `Esconder o ${s.companionName}` : `Mostrar o ${s.companionName}`;
  listEl.innerHTML = '';
  for (const c of s.conversations) {
    const b = document.createElement('button');
    b.className = `item${c.id === selected ? ' active' : ''}`;
    b.dataset.id = c.id;
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = c.title;
    b.appendChild(t);
    if (c.label) {
      const ch = document.createElement('span');
      chip(ch, c.status, c.label);
      b.appendChild(ch);
    }
    b.addEventListener('click', () => select(c.id));
    listEl.appendChild(b);
  }
  renderConversation();
}

async function select(id) {
  selected = id;
  const s = await api.select(id);
  render(s);
  input.focus();
}

function renderConversation() {
  const conv = st.current;
  if (!conv) return;
  $('convTitle').textContent = conv.title;
  const label = st.conversations.find((c) => c.id === conv.id)?.label;
  chip($('convStatus'), conv.status, label);
  $('convDetail').textContent = conv.status === 'blocked' ? conv.detail || '' : '';
  $('convDetail').classList.toggle('hidden', conv.status !== 'blocked' || !conv.detail);
  logEl.innerHTML = '';
  if (!conv.messages.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = `Fala com o ${st.companionName}. Digite "/" para ver os comandos.`;
    logEl.appendChild(p);
  }
  for (const m of conv.messages) addMsg(m.who, m.text);
  if (conv.status === 'running') addMsg('system', `${st.companionName} está digitando…`);
}

function addMsg(who, text) {
  const d = document.createElement('div');
  d.className = `msg ${who}`;
  d.textContent = text;
  logEl.appendChild(d);
  logEl.scrollTop = logEl.scrollHeight;
}

// ---------------- menu de comandos "/"
function commands() {
  const q = input.value.trim().toLowerCase();
  return (st?.commands || []).filter((c) => c.cmd.startsWith(q.split(/\s+/)[0] || '/'));
}

function renderMenu() {
  const show = input.value.startsWith('/');
  const items = show ? commands() : [];
  menuEl.classList.toggle('hidden', !items.length);
  menuEl.innerHTML = '';
  menuIndex = Math.min(menuIndex, Math.max(0, items.length - 1));
  items.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `cmd${i === menuIndex ? ' sel' : ''}`;
    b.setAttribute('role', 'option');
    b.innerHTML = '<code></code><b></b><span></span>';
    b.querySelector('code').textContent = c.cmd;
    b.querySelector('b').textContent = c.label;
    b.querySelector('span').textContent = c.hint;
    b.addEventListener('mousedown', (e) => {
      e.preventDefault();
      run(c.cmd);
    });
    menuEl.appendChild(b);
  });
}

async function run(text) {
  input.value = '';
  renderMenu();
  if (!text.trim()) return;
  const r = await api.send(selected, text);
  if (r && r.conversationId) selected = r.conversationId;
  if (r && r.command && r.text) {
    render(await api.state());
    addMsg('system', r.text);
  }
}

input.addEventListener('input', () => {
  menuIndex = 0;
  renderMenu();
});
input.addEventListener('keydown', (e) => {
  const items = menuEl.classList.contains('hidden') ? [] : commands();
  if (!items.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    menuIndex = (menuIndex + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    renderMenu();
  } else if (e.key === 'Tab' || (e.key === 'Enter' && input.value.trim().split(/\s+/)[0] !== items[menuIndex].cmd)) {
    e.preventDefault();
    run(items[menuIndex].cmd);
  } else if (e.key === 'Escape') {
    input.value = '';
    renderMenu();
  }
});

$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  run(input.value);
});
$('newChat').addEventListener('click', async () => {
  const s = await api.newChat();
  selected = s.currentId;
  render(s);
  input.focus();
});
$('petToggle').addEventListener('click', async () => render(await api.togglePet()));
$('settings').addEventListener('click', () => api.openSettings());

api.onUpdate((s) => {
  // Mantém a conversa selecionada nesta janela.
  if (selected && s.current && s.current.id !== selected) {
    api.select(selected).then(render);
    return;
  }
  render(s);
});
api.onSelect((id) => select(id));
api.state().then((s) => {
  render(s);
  input.focus();
});
