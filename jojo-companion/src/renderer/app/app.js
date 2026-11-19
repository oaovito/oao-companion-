// Central do JoJo: conversas com status (Running / Needs input / Ready / Blocked),
// chat e menu de comandos "/" (inclui Wake Pet / Tuck Away Pet).
import { TodoView } from '../shared/todo-view.js';
import { xpVisivel } from '../../core/xp-escala.js';
import { ProgressView } from '../shared/progress-view.js';
import { CareView } from '../shared/care-view.js';
import { filterCommands } from '../shared/command-filter.js';
const api = window.appApi;
const $ = (id) => document.getElementById(id);
const listEl = $('list');
const logEl = $('log');
const input = $('input');
const menuEl = $('cmdMenu');
let st = null;
let selected = null;
let menuIndex = 0;
let showingTarefas = false;
let lastTarefasReq = 0;
let showingDarkest = false;
let showingCuidados = false, lastCareRequest = 0;
const xpView = new ProgressView($('progression'));
const todoView = new TodoView($('tarefas'), api, { openSettings: () => api.openTodoSettings(), onProgress: s => xpView.render(s, { quiet: st?.trabalho || st?.foco, animations: st?.todo?.settings.animations !== false }) });
const careView = new CareView($('cuidados'), api, s => xpView.render(s, { quiet: st?.trabalho || st?.foco }));

function chip(el, status, label) {
  el.className = `chip ${status}`;
  el.textContent = label || '';
  el.classList.toggle('hidden', !label);
}

function render(s) {
  st = s;
  if (s.abrirCuidados && s.abrirCuidados !== lastCareRequest) {
    lastCareRequest = s.abrirCuidados; showingCuidados = true; showingTarefas = false; showingGuarda = false; showingColecao = false; showingDarkest = false;
  }
  if (s.abrirTarefas && s.abrirTarefas !== lastTarefasReq) {
    lastTarefasReq = s.abrirTarefas; showingTarefas = true; showingGuarda = false; showingColecao = false; showingDarkest = false; showingCuidados = false;
  }
  // Pedido de abrir a coleção (/colecao): cada pedido novo vale uma vez.
  if (s.abrirColecao && s.abrirColecao !== lastColecaoReq) {
    lastColecaoReq = s.abrirColecao;
    showingColecao = true;
    showingCuidados = false;
    showingDarkest = false;
    showingTarefas = false;
    showingGuarda = false;
  }
  if (s.abrirGuardaRoupa && s.abrirGuardaRoupa !== lastGuardaReq) {
    lastGuardaReq = s.abrirGuardaRoupa;
    showingGuarda = true;
    showingCuidados = false;
    showingDarkest = false;
    showingTarefas = false;
    showingColecao = false;
  }
  if (!selected || !s.conversations.some((c) => c.id === selected)) selected = s.currentId;
  $('name').textContent = s.companionName;
  document.title = s.companionName;
  $('petToggle').textContent = s.petVisible ? 'Tuck Away Pet' : 'Wake Pet';
  $('discordFocusStatus').textContent = s.focusApps?.message || '';
  $('trabalhoBtn').textContent = s.trabalho ? '🧘 Sair do Modo Trabalho' : '🧘 Modo Trabalho';
  // Aviso de visuais novos do nível no botão do Guarda-roupa.
  const novosVisuais = s.visuais?.novos || 0;
  $('guardaBtn').textContent = novosVisuais ? `👗 Guarda-roupa · ✨ ${novosVisuais} ${novosVisuais === 1 ? 'novo' : 'novos'}` : '👗 Guarda-roupa';
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
  $('tarefas').classList.toggle('hidden', !showingTarefas);
  if (showingTarefas) { $('convTitle').textContent = 'Lista de Tarefas'; chip($('convStatus'), 'idle', ''); todoView.refresh(); }
  renderDarkest();
  $('cuidados').classList.toggle('hidden', !showingCuidados);
  if (showingCuidados) { $('convTitle').textContent = 'Cuidados e cardápio'; chip($('convStatus'), 'idle', ''); careView.refresh(); }
  xpView.render(s.colecao, { quiet: s.trabalho || s.foco, animations: s.todo?.settings.animations !== false });
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
  const painel = showingColecao || showingGuarda || showingTarefas || showingDarkest || showingCuidados;
  for (const id of ['log', 'form', 'convDetail']) $(id).classList.toggle('hidden', painel || (id === 'convDetail' && $('convDetail').classList.contains('hidden')));
  if (!showingColecao || !st || !st.colecao) return;
  const c = st.colecao;
  $('convTitle').textContent = 'Coleção e jogos';
  chip($('convStatus'), 'idle', '');
  box.innerHTML = '';
  const nivel = el('div', 'card');
  nivel.append(el('h2', null, `Nível ${c.nivel}: ${c.nomeNivel}`), el('p', 'muted', `${c.xp} XP · ${c.maximo ? 'patamar máximo atual' : `próximo nível em ${Math.max(0, c.proximo - c.xp)} XP`} · ${c.streak} dia(s) seguidos`));
  const bar = el('div', 'bar');
  const fill = el('span');
  fill.style.width = `${c.percentXP ?? Math.min(100, Math.round(((c.xp % (c.xpPorNivel || 60)) / (c.xpPorNivel || 60)) * 100))}%`;
  bar.append(fill);
  nivel.append(bar, el('p', null, c.resumo));
  if (c.bonus) nivel.append(el('p', 'muted', `Bônus de XP descobertos: ${c.bonus.descobertos} de ${c.bonus.total} · hoje ${c.bonus.hoje} de ${c.bonus.porDia} · ${c.bonus.xp} XP de bônus (coleção; o ritmo de nível não muda)`));
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
  if (c.acessorios.length) col.append(el('p', null, `Acessórios: ${c.acessorios.map((a) => a.nome).join(' · ')}`));
  col.append(el('p', null, `Aquário: ${c.areas.map((a) => (a.ok ? a.nome : '???')).join(' · ')}`));
  if (c.album.length) col.append(el('p', 'muted', `Álbum de momentos raros: ${c.album.map((a) => a.nome).join(', ')}`));
  box.append(nivel, acoes, jogos, miss, conq, col);
  for (const [category, title] of [['meme', 'Cenas e memes'], ['profissao', 'Encenações de profissões']]) {
    const scenes = el('details', 'card living-scenes'); scenes.append(el('summary', null, title));
    const buttons = el('div', 'buttons');
    for (const scene of st.livingScenes || []) if (scene.category === category) {
      const button = el('button', 'chipbtn', scene.name); button.dataset.scene = scene.id;
      button.addEventListener('click', () => playCmd(scene.command)); buttons.append(button);
    }
    scenes.append(buttons); box.append(scenes);
  }
  // Animações já liberadas (poses vistas e as dos visuais liberados): todas tocam com um clique.
  if (c.animacoes?.length) {
    const anims = el('details', 'card animacoes-liberadas');
    anims.append(el('summary', null, `Animações liberadas (${c.animacoes.length})`));
    const botoes = el('div', 'buttons');
    for (const a of c.animacoes) {
      const b = el('button', 'chipbtn', a.nome);
      b.dataset.anim = a.id;
      if (a.origem) b.title = a.origem;
      b.addEventListener('click', () => playCmd(`/anim ${a.id}`));
      botoes.append(b);
    }
    anims.append(botoes);
    box.append(anims);
  }
  if (c.rewardHistory?.length) {
    const history = el('details', 'card'); history.append(el('summary', null, 'Últimas recompensas de XP'));
    for (const reward of c.rewardHistory) history.append(el('p', 'muted', `+${reward.amount} XP · ${reward.label} · ${reward.day}`));
    box.append(history);
  }
}

// ---------------- guarda-roupa: brincar de boneca com o JoJo (opcional)
let showingGuarda = false;
let marcandoVistos = null;
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
  // Visuais do shape: o que o nível liberou (com a fala da referência como descrição)
  // e, depois, só cadeados com o nível — nada do que é chega até esta tela.
  const v = st.visuais;
  if (v && (v.total || v.bloqueados?.length)) {
    const card = el('div', 'card visuais-card');
    card.append(el('h3', null, `Visuais dos níveis (${v.total} de ${v.total + v.bloqueados.length})`));
    if (v.novos) card.append(el('p', 'aviso-novo', `✨ ${v.novos === 1 ? '1 visual novo liberado' : `${v.novos} visuais novos liberados`} pelo seu nível.`));
    if (v.total) {
      card.append(el('p', 'muted', 'Clique para vestir; clicar de novo tira.'));
      const melhor = el('button', 'chipbtn', '✨ O mais recente de cada parte');
      melhor.addEventListener('click', () => vestir('/vestir melhor'));
      const linha = el('div', 'buttons');
      linha.append(melhor);
      card.append(linha);
    }
    for (const parte of v.partes) {
      card.append(el('h4', null, parte.nome));
      const lista = el('div', 'visuais');
      for (const it of parte.itens) {
        const on = v.vestido[parte.id] === it.id;
        const b = el('button', `visual-item${on ? ' on' : ''}`);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.dataset.visual = it.id;
        const topo = el('span', 'visual-topo');
        const sw = el('span', 'swatch');
        sw.style.background = it.cor;
        topo.append(sw, el('b', null, it.nome));
        if (it.novo) topo.append(el('span', 'selo-novo', 'Novo'));
        b.append(topo, el('small', 'visual-obra', `Nível ${it.nivel} · ${it.titulo} · ${it.obra}`), el('span', 'visual-desc', it.descricao));
        b.addEventListener('click', () => vestir(`/vestir ${it.id}`));
        lista.append(b);
      }
      card.append(lista);
    }
    if (v.bloqueados.length) {
      card.append(el('h4', null, 'Ainda trancados'));
      const grade = el('div', 'cadeados');
      for (const bq of v.bloqueados) {
        const c = el('span', 'cadeado');
        c.dataset.trancado = String(bq.nivel);
        c.setAttribute('aria-label', `Trancado até o nível ${bq.nivel}`);
        c.append(el('span', null, '🔒'), el('small', null, `nível ${bq.nivel}`));
        grade.append(c);
      }
      card.append(grade);
    }
    box.append(card);
    // Ela viu: depois de alguns segundos na tela, o selo de "novo" sai (uma vez por abertura).
    if (v.novos && api.visuaisVistos && !marcandoVistos) {
      marcandoVistos = setTimeout(() => { marcandoVistos = null; if (showingGuarda) api.visuaisVistos(); }, 4000);
    }
  }
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
  showingCuidados = false; $('cuidados').classList.add('hidden');
  showingDarkest = false; $('darkest').classList.add('hidden');
  showingTarefas = false;
  $('tarefas').classList.add('hidden');
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
  showingCuidados = false; $('cuidados').classList.add('hidden');
  showingDarkest = false; $('darkest').classList.add('hidden');
  showingTarefas = false;
  $('tarefas').classList.add('hidden');
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
  showingCuidados = false; $('cuidados').classList.add('hidden');
  showingDarkest = false; $('darkest').classList.add('hidden');
  showingTarefas = false;
  $('tarefas').classList.add('hidden');
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

// Mensagens programadas no WhatsApp: janela própria.
$('whatsappBtn').addEventListener('click', () => api.openWhatsapp());
$('tarefasBtn').addEventListener('click', async () => {
  showingCuidados = false;
  showingDarkest = false;
  showingTarefas = !showingTarefas; showingColecao = false; showingGuarda = false;
  render(await api.state());
});
function renderDarkest() {
  $('darkest').classList.toggle('hidden', !showingDarkest);
  if (!showingDarkest || !st?.darkest) return;
  const d = st.darkest; $('convTitle').textContent = 'Darkest Dungeon'; chip($('convStatus'), 'idle', '');
  const status = el('div', 'card'); status.append(el('h2', null, d.detection?.known === false ? 'Detecção indisponível — tempo pausado' : d.active ? 'Expedição em andamento' : d.running ? 'Jogo em segundo plano — tempo pausado' : 'Sem atividade verificada'));
  status.append(el('p', null, d.playedToday ? 'Sessão válida registrada hoje.' : 'Ainda não há sessão válida registrada hoje.'));
  status.append(el('p', 'muted', `Instalação Steam: ${d.detection?.installed == null ? 'não verificada' : d.detection.installed ? 'encontrada' : 'não encontrada'} · Executável: ${d.detection?.executable ? 'identificado' : 'não confirmado'} · Sessão: ${d.active ? 'ativa' : 'pausada'}.`));
  if (d.detection?.reason === 'installation_not_verified') status.append(el('p', 'muted', 'Darkest.exe encontrado, mas a instalação do AppID 262060 não pôde ser validada. Atualize as bibliotecas Steam.'));
  const numbers = el('div', 'card'); numbers.append(el('h3', null, 'Seu registro real'));
  for (const line of [`${d.sessions} sessões válidas · ${d.days} dias distintos · sequência de ${d.streak} dias`, `${Math.floor(d.todayMs / 60000)} min ativos hoje · ${Math.floor(d.activeMs / 60000)} min no total`, `+${xpVisivel(d.xpToday)}/${xpVisivel(d.cap)} XP hoje · ${xpVisivel(d.xpTotal)} XP no total`]) numbers.append(el('p', null, line));
  if (d.pendingXp) numbers.append(el('p', 'muted', `${xpVisivel(d.pendingXp)} XP aguardam confirmação no disco.`));
  const achievement = el('div', 'card'); achievement.append(el('h3', null, d.achievement ? '◆ O Herdeiro da Ruína' : '◇ O Herdeiro da Ruína'), el('p', null, `${Math.min(7, d.days)}/7 dias distintos com sessão válida.`));
  const rules = el('div', 'card'); rules.append(el('h3', null, 'Tocha acesa, registro honesto.'), el('p', 'muted', 'Darkest Dungeon original da Steam. Sessão válida após 1 minuto ativo; +150 XP, primeira do dia +500, marcos de 15/30/60 min +250/+400/+800. Só primeiro plano, sem inatividade prolongada. Menus e pausas internas não podem ser distinguidos sem ler o jogo. Não conto tempo com o JoJo fechado.'));
  const steam = el('div', 'card'); steam.id = 'steamStatus'; const s = st.steam;
  const states = { scanning: 'verificando', unavailable: 'indisponível', open: 'aberta', closed: 'fechada' };
  steam.append(el('h2', null, `Steam: ${s?.installed === false && s?.status !== 'unavailable' ? 'não encontrada' : states[s?.status] || 'indisponível'}`));
  steam.append(el('p', null, `Instalação: ${s?.installed == null ? 'desconhecida' : s.installed ? 'detectada' : 'não detectada'} · Bibliotecas: ${s?.libraries == null ? 'desconhecidas' : s.libraries ? `${s.libraries} detectada(s)` : 'não detectadas'} · Jogos identificados: ${s?.count ?? 'desconhecido'}.`));
  steam.append(el('p', 'muted', `Última verificação: ${s?.checkedAt ? new Date(s.checkedAt).toLocaleString('pt-BR') : 'aguardando detector'}. Inventário: ${s?.lastScan ? new Date(s.lastScan).toLocaleString('pt-BR') : 'aguardando leitura'}.`));
  const refresh = el('button', 'ghost', s?.scanning ? 'Verificando…' : 'Atualizar jogos'); refresh.disabled = !!s?.scanning;
  refresh.addEventListener('click', async () => { refresh.disabled = true; try { st.steam = await api.refreshGames(); } catch { st.steam = { ...st.steam, status: 'unavailable' }; } renderDarkest(); });
  steam.append(refresh);
  if (s?.reason || s?.diagnostics?.length || s?.installed === false) steam.append(el('p', 'muted', s?.installed === false ? 'Não localizei uma instalação Steam no Registro, nos diretórios padrão ou nos processos atuais. Abra a Steam e clique em Atualizar jogos; bibliotecas em outros discos também são lidas.' : 'Não foi possível confirmar parte dos metadados locais. Os estados desconhecidos não contam tempo ou XP. Atualize novamente após conferir a instalação.'));
  const gameStates = { active: 'em primeiro plano', background: 'em execução, segundo plano', installed: 'instalado, sem execução confirmada', unknown: 'execução desconhecida' };
  const list = el('ul'); for (const game of s?.games || []) list.append(el('li', null, `${game.name}: ${gameStates[game.state]}`));
  steam.append(list);
  $('darkest').replaceChildren(steam, status, numbers, achievement, rules);
}
$('darkestBtn').addEventListener('click', async () => {
  showingCuidados = false;
  showingDarkest = !showingDarkest; showingTarefas = false; showingColecao = false; showingGuarda = false;
  render(await api.state());
});
api.onDarkestUpdate(s => {
  if (st) { st.foco = s.foco; st.trabalho = s.trabalho; st.darkest = s.darkest; st.colecao = { ...st.colecao, ...s.colecao }; }
  renderDarkest(); xpView.render(s.colecao, { quiet: s.trabalho || s.foco });
});
api.onSteamUpdate(s => { if (st) st.steam = s; renderDarkest(); });
$('cuidadosBtn').addEventListener('click', async () => {
  showingCuidados = !showingCuidados; showingDarkest = false; showingTarefas = false; showingGuarda = false; showingColecao = false; render(await api.state());
});
api.onNeedsUpdate(s => {
  if (st) { st.foco = s.foco; st.trabalho = s.trabalho; st.needs = s.needs; st.colecao = { ...st.colecao, ...s.colecao }; }
  if (showingCuidados && s.needs) careView.render(s.needs);
  xpView.render(s.colecao, { quiet: s.trabalho || s.foco });
});
api.onTodoUpdate(s => {
  if (st) { st.foco = s.foco; st.trabalho = s.trabalho; st.todo = s.todo; if (s.colecao) st.colecao = { ...st.colecao, ...s.colecao }; }
  if (showingTarefas) todoView.refresh();
  xpView.render(s.colecao, { quiet: s.trabalho || s.foco, animations: s.todo?.settings.animations !== false });
});

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
  // Lista completa ao digitar "/"; filtra pelo nome, título ou descrição enquanto ela digita.
  return filterCommands(st?.commands || [], input.value);
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
    b.querySelector('span').textContent = c.desc || c.hint;
    b.title = c.hint;
    b.addEventListener('mousedown', (e) => {
      e.preventDefault();
      run(c.cmd);
    });
    menuEl.appendChild(b);
  });
  menuEl.children[menuIndex]?.scrollIntoView({ block: 'nearest' });
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
