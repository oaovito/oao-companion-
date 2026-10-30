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
  // Pedido de abrir a coleção (/colecao): cada pedido novo vale uma vez.
  if (s.abrirColecao && s.abrirColecao !== lastColecaoReq) {
    lastColecaoReq = s.abrirColecao;
    showingColecao = true;
    showingGuarda = false;
  }
  if (s.abrirGuardaRoupa && s.abrirGuardaRoupa !== lastGuardaReq) {
    lastGuardaReq = s.abrirGuardaRoupa;
    showingGuarda = true;
    showingColecao = false;
  }
  if (!selected || !s.conversations.some((c) => c.id === selected)) selected = s.currentId;
  $('name').textContent = s.companionName;
  document.title = s.companionName;
  $('petToggle').textContent = s.petVisible ? 'Tuck Away Pet' : 'Wake Pet';
  $('trabalhoBtn').textContent = s.trabalho ? '🧘 Sair do Modo Trabalho' : '🧘 Modo Trabalho';
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
  renderColecao();
  renderGuarda();
}

// ---------------- coleção, progressão, mini-jogos e estímulos
let showingColecao = false;
let lastColecaoReq = 0;
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function renderColecao() {
  const box = $('colecao');
  box.classList.toggle('hidden', !showingColecao);
  const painel = showingColecao || showingGuarda;
  for (const id of ['log', 'form', 'convDetail']) $(id).classList.toggle('hidden', painel || (id === 'convDetail' && $('convDetail').classList.contains('hidden')));
  if (!showingColecao || !st || !st.colecao) return;
  const c = st.colecao;
  $('convTitle').textContent = 'Coleção e jogos';
  chip($('convStatus'), 'idle', '');
  box.innerHTML = '';
  const nivel = el('div', 'card');
  nivel.append(el('h2', null, `Nível ${c.nivel}: ${c.nomeNivel}`), el('p', 'muted', `${c.xp} XP · próximo nível em ${Math.max(0, c.proximo - c.xp)} XP · ${c.streak} dia(s) seguidos`));
  const bar = el('div', 'bar');
  const fill = el('span');
  fill.style.width = `${Math.min(100, Math.round(((c.xp % 60) / 60) * 100))}%`;
  bar.append(fill);
  nivel.append(bar, el('p', null, c.resumo));
  const acoes = el('div', 'card');
  acoes.append(el('h3', null, 'Agora'));
  const row = el('div', 'buttons');
  for (const [label, cmd] of [['✨ Me dá estímulo', '/estimulo'], ['⏱ Foco 25 min', '/foco 25'], ['🏋️ Treinar junto', '/foco 25 treino'], ['🌊 Calma', '/calma'], ['🎵 Ritmo', '/ritmo'], ['🫧 Bolhas', '/bolhas'], ['📋 Resumo do dia', '/resumo']]) {
    const b = el('button', 'chipbtn', label);
    b.addEventListener('click', () => playCmd(cmd));
    row.append(b);
  }
  acoes.append(row);
  const jogos = el('div', 'card');
  jogos.append(el('h3', null, 'Mini-jogos'));
  const jr = el('div', 'buttons');
  for (const j of c.jogos || []) {
    const b = el('button', 'chipbtn', j.recorde != null ? `${j.nome} · 🏆 ${j.recorde}` : j.nome);
    b.addEventListener('click', () => playCmd(`/jogo ${j.id}`));
    jr.append(b);
  }
  jogos.append(jr);
  const miss = el('div', 'card');
  miss.append(el('h3', null, 'Missões de hoje (opcionais)'));
  for (const m of c.missoes) miss.append(el('p', m.ok ? 'ok' : 'muted', `${m.ok ? '✓' : '○'} ${m.txt}`));
  const conq = el('div', 'card');
  conq.append(el('h3', null, `Conquistas (${c.conquistas.filter((q) => q.ok).length}/${c.conquistas.length})`));
  const grid = el('div', 'grid');
  for (const q of c.conquistas) {
    const g = el('div', `badge${q.ok ? ' ok' : ''}`);
    g.append(el('b', null, q.ok ? q.nome : '???'), el('small', null, q.desc));
    grid.append(g);
  }
  conq.append(grid);
  const col = el('div', 'card');
  col.append(el('h3', null, 'Coleção'));
  col.append(el('p', null, `Poses vistas: ${c.poses} · Cartas de frases: ${c.cartas}`));
  col.append(el('p', null, `Acessórios: ${c.acessorios.map((a) => (a.ok ? a.nome : `🔒 nível ${a.nivel}`)).join(' · ')}`));
  col.append(el('p', null, `Aquário: ${c.areas.map((a) => (a.ok ? a.nome : '???')).join(' · ')}`));
  if (c.album.length) col.append(el('p', 'muted', `Álbum de momentos raros: ${c.album.map((a) => a.nome).join(', ')}`));
  box.append(nivel, acoes, jogos, miss, conq, col);
}

// ---------------- guarda-roupa: brincar de boneca com o JoJo (opcional)
let showingGuarda = false;
let lastGuardaReq = 0;
function renderGuarda() {
  const box = $('guardaRoupa');
  box.classList.toggle('hidden', !showingGuarda);
  if (!showingGuarda || !st || !st.guardaRoupa) return;
  const g = st.guardaRoupa;
  $('convTitle').textContent = 'Guarda-roupa';
  chip($('convStatus'), 'idle', '');
  box.innerHTML = '';
  const topo = el('div', 'card');
  topo.append(el('p', 'muted', `Veste o ${st.companionName} como quiser: uma peça por parte. Clicar de novo tira a peça. Ele usa a roupa até você trocar.`));
  const row = el('div', 'buttons');
  for (const [label, cmd] of [['🎲 Look surpresa', '/vestir surpresa'], ['🧺 Tirar tudo', '/vestir tirar']]) {
    const b = el('button', 'chipbtn', label);
    b.addEventListener('click', () => vestir(cmd));
    row.append(b);
  }
  topo.append(row);
  box.append(topo);
  for (const parte of g.partes) {
    const card = el('div', 'card');
    card.append(el('h3', null, parte.nome));
    const r = el('div', 'buttons');
    for (const it of parte.itens) {
      const on = g.vestido[parte.id] === it.id;
      const b = el('button', `chipbtn${on ? ' on' : ''}`);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (it.cor) {
        const sw = el('span', 'swatch');
        sw.style.background = it.cor;
        b.append(sw);
      }
      b.append(document.createTextNode(it.nome));
      b.addEventListener('click', () => vestir(`/vestir ${it.id}`));
      r.append(b);
    }
    card.append(r);
    box.append(card);
  }
  const fala = el('p', 'muted');
  fala.id = 'guardaFala';
  box.append(fala);
}
async function vestir(cmd) {
  const r = await api.send(selected, cmd);
  render(await api.state());
  if (r && r.text && $('guardaFala')) $('guardaFala').textContent = `${st.companionName}: ${r.text}`;
}
$('guardaBtn').addEventListener('click', async () => {
  showingGuarda = !showingGuarda;
  showingColecao = false;
  if (showingGuarda) render(await api.state());
  else {
    renderGuarda();
    renderColecao();
    renderConversation();
  }
});

async function playCmd(cmd) {
  showingColecao = false;
  renderColecao();
  renderConversation();
  await run(cmd);
}
$('colecaoBtn').addEventListener('click', async () => {
  showingColecao = !showingColecao;
  showingGuarda = false;
  renderGuarda();
  if (showingColecao) render(await api.state());
  else {
    renderColecao();
    renderConversation();
  }
});

async function select(id) {
  if (id === 'colecao' || id === 'guardaRoupa') {
    showingColecao = id === 'colecao';
    showingGuarda = id === 'guardaRoupa';
    render(await api.state());
    return;
  }
  showingColecao = false;
  showingGuarda = false;
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
$('trabalhoBtn').addEventListener('click', async () => {
  await api.send(selected, st && st.trabalho ? '/trabalho sair' : '/trabalho');
  render(await api.state());
});
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
