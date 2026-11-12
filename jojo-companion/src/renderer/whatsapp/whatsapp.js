// Janela do WhatsApp: uma tela por vez (Conexão, Mensagens, Contatos, Nova
// mensagem e Confirmação), com o estado da conexão sempre visível no topo.
// Validação final no processo principal; aqui só montamos a tela. Campos sem
// atributo "name" de propósito: nada daqui vira configuração do app.
import { barra, qrInfo, quandoFoi, telaInicial, contaTexto } from '../shared/whatsapp-view.js';
import { formatarNumero, filtrarContatos, iniciais } from '../../core/whatsapp-contatos.js';
import { descreverQuando, numeroParaJid } from '../../core/whatsapp.js';

const api = window.waApi;
const $ = (id) => document.getElementById(id);
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MAX_LISTA = 200;
const ERROS = {
  numero_invalido: 'Número inválido. Digite com DDD, por exemplo 42 99999-1234.',
  contato_nao_encontrado: 'Esse número não tem WhatsApp. Escolha um contato da lista ou confira o número.',
  texto_vazio: 'A mensagem está vazia. Escreva o texto.',
  passado: 'Esse dia e hora já passaram. Escolha um horário no futuro.',
  cheio: 'A agenda está cheia (200). Apague alguma mensagem antes.',
  invalido: 'Falta alguma informação. Confira dia, hora e repetição.',
  sem_modelo: 'O JoJo não consegue reescrever agora (motor local desligado). Use o seu texto.',
  sem_hora: 'Falta o dia ou a hora. Preencha os dois.',
  sem_destino: 'Falta para quem. Toque em Escolher contato ou digite o número com DDD.',
  desconectado: 'O WhatsApp não está conectado. Conecte primeiro.',
};
const MOTIVOS = { sessao_desconectada: 'o WhatsApp está desconectado', sem_internet: 'sem internet', contato_nao_encontrado: 'número sem WhatsApp', falha_envio: 'o WhatsApp recusou', limite_diario: 'limite diário atingido' };

let st = null, editando = null, proposta = null, tela = null, qrVisto = null, avisoQr = null;
let destino = null, escolhendo = false, filtro = 'pessoas', textoFinal = '';
const fotos = new Map(); // jid → data URL | null (sem foto)
const pedida = new URLSearchParams(location.search).get('tela');

for (const [i, nome] of DIAS.entries()) {
  const l = document.createElement('label');
  const c = document.createElement('input');
  c.type = 'checkbox';
  c.dataset.dia = String(i);
  l.append(c, ` ${nome}`);
  $('diasBox').append(l);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function botao(texto, cls, fn) {
  const b = el('button', cls, texto);
  b.type = 'button';
  b.addEventListener('click', fn);
  return b;
}

// ------------------------------------------------------------- navegação

const TELAS = ['conexao', 'mensagens', 'contatos', 'nova', 'confirmar'];
function mostrar(nome) {
  tela = nome;
  for (const t of TELAS) $(`tela-${t}`).hidden = t !== nome;
  const aba = nome === 'nova' || nome === 'confirmar' ? 'mensagens' : nome === 'contatos' && escolhendo ? 'mensagens' : nome;
  for (const a of document.querySelectorAll('.aba')) {
    if (a.dataset.tela === aba) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  if (nome === 'contatos') renderContatos();
}

/** Ações que usam o WhatsApp: se a conexão não está confirmada, leva direto à tela de conexão. */
function exigirConexao() {
  if (st?.visivel.chave === 'conectado') return true;
  escolhendo = false;
  mostrar('conexao');
  return false;
}

// ------------------------------------------------------------ foto/avatar

/** Foto de perfil quando houver; sem foto, as iniciais (grupo com cantos quadrados). */
function avatar(c) {
  const a = el('span', `avatar${c.tipo === 'grupo' ? ' grupo' : ''}`);
  a.dataset.jid = c.jid || '';
  const f = c.jid ? fotos.get(c.jid) : null;
  if (f) { const img = el('img'); img.alt = ''; img.src = f; a.append(img); } else a.textContent = c.iniciais || iniciais(c.nome);
  return a;
}

/** Linha de quem recebe: nome em destaque e, logo abaixo, sempre o número (ou que é grupo). */
function cartaoPessoa(c, { grande = false } = {}) {
  const box = el('div', `pessoa${grande ? ' grande' : ''}`);
  const dados = el('div', 'dados');
  const nome = el('span', 'nome', c.nome);
  if (c.tipo === 'grupo') nome.append(el('span', 'selo-tipo', 'Grupo'));
  if (c.homonimo) nome.append(el('span', 'selo-igual', 'mesmo nome'));
  dados.append(nome);
  if (c.tipo === 'grupo') dados.append(el('span', 'numero', c.participantes ? `Grupo com ${c.participantes} participantes` : 'Grupo do WhatsApp'));
  else dados.append(el('span', 'numero', c.numeroFormatado || formatarNumero(c.numero) || 'Número desconhecido'));
  if (c.nomeAgenda && c.nomePerfil && c.nomePerfil !== c.nomeAgenda) dados.append(el('span', 'extra', `No perfil: ${c.nomePerfil}`));
  else if (c.semNome) dados.append(el('span', 'extra', 'Sem nome salvo no celular'));
  box.append(avatar(c), dados);
  return box;
}

function pedirFotos(jids) {
  const faltam = jids.filter((j) => !fotos.has(j)).slice(0, 60);
  if (!faltam.length) return;
  for (const j of faltam) fotos.set(j, null);
  api.fotos(faltam).then(receberFotos).catch(() => {});
}

function receberFotos(mapa) {
  for (const [jid, f] of Object.entries(mapa || {})) {
    fotos.set(jid, f || null);
    if (!f) continue;
    for (const a of document.querySelectorAll('.avatar')) {
      if (a.dataset.jid !== jid) continue;
      const img = el('img');
      img.alt = '';
      img.src = f;
      a.textContent = '';
      a.append(img);
    }
  }
}

// --------------------------------------------------------------- conexão

function renderConexao(s) {
  const v = s.visivel;
  const b = barra(v);
  $('barra').className = `barra ${b.classe}`;
  $('barraTitulo').textContent = b.titulo;
  $('barraConta').textContent = b.conta;
  for (const k of ['desconectado', 'qr', 'conectando', 'conectado', 'erro']) $(`c-${k}`).hidden = k !== v.chave;
  $('jojoFala').textContent = s.jojo ? `JoJo: ${s.jojo}` : '';
  $('porDia').textContent = String(s.limites?.porDia || 40);
  if (v.chave === 'desconectado') {
    $('fraseDesconectado').textContent = v.frase;
    $('acaoDesconectado').textContent = v.acao?.rotulo || 'Conectar WhatsApp';
  } else if (v.chave === 'qr') {
    if (s.conexao.qr && $('qr').src !== s.conexao.qr) $('qr').src = s.conexao.qr;
    // Código novo enquanto ela olha: aviso por alguns segundos.
    if (qrVisto != null && s.conexao.qrRenovacao !== qrVisto) {
      $('qrAviso').hidden = false;
      clearTimeout(avisoQr);
      avisoQr = setTimeout(() => { $('qrAviso').hidden = true; }, 6000);
    }
    qrVisto = s.conexao.qrRenovacao;
    contarQr();
  } else if (v.chave === 'conectando') {
    $('fraseConectando').textContent = v.frase;
    $('acaoConectando').hidden = !v.acao;
    if (v.acao) $('acaoConectando').textContent = v.acao.rotulo;
  } else if (v.chave === 'conectado') {
    $('fraseConectado').textContent = v.frase;
    $('contaNome').textContent = v.conta?.nome || 'O WhatsApp ainda não informou o nome';
    $('contaNumero').textContent = v.conta?.numero ? formatarNumero(v.conta.numero) : '—';
    $('contaConfirmado').textContent = v.confirmadoEm ? quandoFoi(v.confirmadoEm) : '—';
  } else if (v.chave === 'erro') {
    $('fraseErro').textContent = v.frase;
    $('acaoErro').textContent = v.acao?.rotulo || 'Tentar de novo';
  }
  if (v.chave !== 'qr') { qrVisto = null; $('qrAviso').hidden = true; }
}

/** Contagem do QR, a cada segundo, pelo relógio do PC. */
function contarQr() {
  if (!st || st.visivel.chave !== 'qr') return;
  const q = qrInfo(st.conexao, Date.now());
  $('qrTempo').textContent = q.texto;
  $('qrRenovando').hidden = !q.expirou;
  $('qrBarra').style.width = `${Math.round(q.fracao * 100)}%`;
}

function contarReconexao() {
  if (!st || !st.visivel.reconectando || !st.conexao.proximaEm) return;
  const seg = Math.max(0, Math.ceil((st.conexao.proximaEm - Date.now()) / 1000));
  $('fraseConectando').textContent = st.visivel.frase.replace(/Nova tentativa em \d+ s\./, seg ? `Nova tentativa em ${seg} s.` : 'Tentando agora.');
}

setInterval(() => { contarQr(); contarReconexao(); }, 1000);

async function conectar() {
  await api.connect();
  await atualizar();
}

// --------------------------------------------------------------- contatos

function renderContatos() {
  if (!st) return;
  const base = filtro === 'grupos' ? st.grupos : st.pessoas;
  $('filtroPessoas').textContent = `Pessoas (${st.pessoas.length})`;
  $('filtroGrupos').textContent = `Grupos (${st.grupos.length})`;
  $('filtroPessoas').setAttribute('aria-pressed', String(filtro === 'pessoas'));
  $('filtroGrupos').setAttribute('aria-pressed', String(filtro === 'grupos'));
  $('contatosTitulo').textContent = escolhendo ? 'Escolha para quem vai' : 'Contatos';
  $('voltarEscolha').hidden = !escolhendo;
  const achados = filtrarContatos(base, $('buscaContato').value);
  const lista = $('listaContatos');
  lista.textContent = '';
  const mostrados = achados.slice(0, MAX_LISTA);
  for (const c of mostrados) {
    const li = el('li');
    const b = el('button', 'contato');
    b.type = 'button';
    b.setAttribute('aria-label', `${c.nome}, ${c.tipo === 'grupo' ? 'grupo' : c.numeroFormatado}`);
    b.append(cartaoPessoa(c));
    b.addEventListener('click', () => escolher(c));
    li.append(b);
    lista.append(li);
  }
  const vazio = !base.length
    ? (st.visivel.chave === 'conectado' ? 'Os contatos chegam do celular nos primeiros minutos depois de conectar. Volte daqui a pouco.' : 'Conecte o WhatsApp para ver seus contatos.')
    : !achados.length ? 'Ninguém com esse nome ou número.' : '';
  $('contatosContagem').textContent = vazio || (achados.length > MAX_LISTA ? `Mostrando ${MAX_LISTA} de ${achados.length}. Busque pelo nome ou número para achar os outros.` : `${achados.length} ${filtro === 'grupos' ? (achados.length === 1 ? 'grupo' : 'grupos') : (achados.length === 1 ? 'pessoa' : 'pessoas')}`);
  pedirFotos(mostrados.slice(0, 60).map((c) => c.jid));
}

/** Tocar num contato: escolhe o destino da mensagem (ou começa uma mensagem nova para ele). */
function escolher(c) {
  if (!exigirConexao()) return;
  if (!escolhendo) { novaMensagem(); }
  escolhendo = false;
  destino = { ...c };
  $('destinoNumero').value = '';
  renderDestino();
  mostrar('nova');
  $('texto').focus();
}

// ---------------------------------------------------------- nova mensagem

function renderDestino() {
  const box = $('destinoEscolhido');
  box.textContent = '';
  box.hidden = !destino;
  if (destino) box.append(cartaoPessoa(destino));
  $('escolherContato').textContent = destino ? 'Trocar contato' : 'Escolher contato';
}

/** Destino do formulário: o contato escolhido ou o número digitado (com o nome, se for de um contato). */
function destinoDoFormulario() {
  const digitado = $('destinoNumero').value.trim();
  if (digitado) {
    const jid = numeroParaJid(digitado);
    if (!jid) return { erro: 'numero_invalido' };
    const conhecido = st.pessoas.find((p) => p.jid === jid);
    if (conhecido) return { contato: conhecido, envio: { jid } };
    const numero = jid.split('@')[0];
    return { contato: { jid, tipo: 'contato', nome: 'Número digitado', numero, numeroFormatado: formatarNumero(numero), iniciais: '#' }, envio: { numero: digitado } };
  }
  if (destino) return { contato: destino, envio: { jid: destino.jid } };
  return { erro: 'sem_destino' };
}

function repeticaoDoCampo() {
  const tipo = $('repeticao').value;
  const marcados = [...$('diasBox').querySelectorAll('input')].filter((c) => c.checked).map((c) => Number(c.dataset.dia));
  if (tipo === 'semanal') return { tipo, dias: [new Date(`${$('data').value}T${$('hora').value || '00:00'}`).getDay()] };
  return { tipo, dias: tipo === 'dias' ? marcados : [] };
}

function limpar() {
  editando = null;
  proposta = null;
  destino = null;
  textoFinal = '';
  $('form').reset();
  $('modoExato').checked = true;
  $('modoReescrever').checked = false;
  $('jeitoBox').hidden = true;
  $('proposta').hidden = true;
  $('diasBox').hidden = true;
  $('formTitulo').textContent = 'Nova mensagem';
  $('salvar').textContent = 'Continuar';
  $('erro').textContent = '';
  const agora = new Date(Date.now() + 10 * 60e3);
  $('data').value = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
  $('hora').value = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  renderDestino();
}

function novaMensagem() {
  if (!exigirConexao()) return;
  limpar();
  mostrar('nova');
  $('escolherContato').focus();
}

function editar(i) {
  if (!exigirConexao()) return;
  limpar();
  editando = i.id;
  $('formTitulo').textContent = 'Editar mensagem';
  destino = [...st.pessoas, ...st.grupos].find((c) => c.jid === i.destino.jid) || { ...i.destino, numero: i.destino.jid.split('@')[0] };
  renderDestino();
  $('texto').value = i.texto;
  $('data').value = i.data;
  $('hora').value = i.hora;
  $('repeticao').value = i.repeticao.tipo;
  $('diasBox').hidden = i.repeticao.tipo !== 'dias';
  for (const c of $('diasBox').querySelectorAll('input')) c.checked = i.repeticao.dias.includes(Number(c.dataset.dia));
  mostrar('nova');
  $('texto').focus();
}

/** Antes de salvar: tela com foto, nome, número, texto e quando. Nada é salvo sem "Confirmar". */
function confirmar(texto) {
  $('erro').textContent = '';
  if (!exigirConexao()) return;
  const d = destinoDoFormulario();
  if (d.erro) { $('erro').textContent = ERROS[d.erro]; return; }
  if (!$('data').value || !$('hora').value) { $('erro').textContent = ERROS.sem_hora; return; }
  textoFinal = texto;
  const quando = { data: $('data').value, hora: $('hora').value, repeticao: repeticaoDoCampo() };
  $('confirmarPara').textContent = '';
  $('confirmarPara').append(cartaoPessoa(d.contato, { grande: true }));
  $('confirmarTexto').textContent = texto;
  $('confirmarQuando').textContent = descreverQuando(quando, new Date());
  $('erroConfirmar').textContent = '';
  $('confirmarSalvar').textContent = editando ? 'Confirmar e salvar' : 'Confirmar e agendar';
  mostrar('confirmar');
  $('confirmarSalvar').focus();
}

async function salvarConfirmado() {
  $('erroConfirmar').textContent = '';
  if (!exigirConexao()) return;
  const d = destinoDoFormulario();
  if (d.erro) { mostrar('nova'); $('erro').textContent = ERROS[d.erro]; return; }
  $('confirmarSalvar').disabled = true;
  const r = await api.save({ id: editando, destino: d.envio, texto: textoFinal, data: $('data').value, hora: $('hora').value, repeticao: repeticaoDoCampo() });
  $('confirmarSalvar').disabled = false;
  if (!r.ok) { $('erroConfirmar').textContent = ERROS[r.erro] || ERROS.invalido; return; }
  limpar();
  mostrar('mensagens');
  await atualizar();
}

// -------------------------------------------------------------- mensagens

function linha(i) {
  const li = el('li');
  const info = el('div', 'info');
  const status = i.estado === 'falhou' ? ` · falhou: ${MOTIVOS[i.ultimoErro] || 'erro'}` : i.estado === 'atrasada' ? ' · atrasada' : i.tentativas ? ` · tentativa ${i.tentativas} de 3` : '';
  info.append(el('div', 'quem', `${i.destino.nome}${i.destino.tipo === 'grupo' ? ' (grupo)' : ''}`), el('div', 'quando', `${i.quandoTexto}${status}`), el('div', 'msg', i.texto));
  li.append(info);
  return li;
}

function renderMensagens(s) {
  $('semConexaoAviso').hidden = s.visivel.chave === 'conectado';
  const atrasadas = s.itens.filter((i) => i.estado === 'atrasada');
  $('atrasadasBox').hidden = !atrasadas.length;
  $('atrasadas').textContent = '';
  for (const i of atrasadas) {
    const li = linha(i);
    li.append(botao('Enviar agora', '', () => api.resolver(i.id, 'enviar').then(atualizar)), botao('Descartar', 'ghost', () => api.resolver(i.id, 'descartar').then(atualizar)));
    $('atrasadas').append(li);
  }
  const lista = $('itens');
  lista.textContent = '';
  const ativas = s.itens.filter((i) => i.estado !== 'atrasada');
  if (!ativas.length) lista.append(el('li', 'vazio', 'Nada programado. Toque em Nova mensagem.'));
  for (const i of ativas) {
    const li = linha(i);
    li.append(botao('Editar', 'ghost', () => editar(i)), botao('Apagar', 'perigo', () => { if (confirm(`Apagar a mensagem para ${i.destino.nome}?`)) api.remove(i.id).then(atualizar); }));
    lista.append(li);
  }
  const hist = $('historico');
  hist.textContent = '';
  if (!s.historico.length) hist.append(el('li', 'vazio', 'Nenhum envio ainda.'));
  for (const i of s.historico) hist.append(el('li', null, `${i.estado === 'enviada' ? 'Enviada' : 'Cancelada'} · ${i.destino.nome} · “${i.texto.slice(0, 80)}”${i.enviadaEm ? ` · ${new Date(i.enviadaEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}`));
}

// ------------------------------------------------------------------ geral

function render(s) {
  st = s;
  if (!tela) mostrar(telaInicial(s.visivel.chave, pedida));
  renderConexao(s);
  renderMensagens(s);
  if (tela === 'contatos') renderContatos();
  // Ação de mensagem em andamento e a conexão caiu: volta para a conexão.
  if ((tela === 'nova' || tela === 'confirmar') && s.visivel.chave !== 'conectado') mostrar('conexao');
}

async function atualizar() { render(await api.state()); }

for (const a of document.querySelectorAll('.aba')) a.addEventListener('click', () => { escolhendo = false; mostrar(a.dataset.tela); });
$('acaoDesconectado').addEventListener('click', conectar);
$('acaoConectando').addEventListener('click', conectar);
$('acaoErro').addEventListener('click', conectar);
$('irMensagens').addEventListener('click', () => mostrar('mensagens'));
$('irConexao').addEventListener('click', () => mostrar('conexao'));
$('novaMensagem').addEventListener('click', novaMensagem);
$('cancelarQr').addEventListener('click', async () => { await api.disconnect(); await atualizar(); });
$('desconectar').addEventListener('click', async () => {
  if (!confirm(`Desconectar o WhatsApp ${contaTexto(st?.visivel.conta) || ''} deste PC? A conexão e a lista de contatos salvas aqui são apagadas. As mensagens programadas continuam, mas não saem até conectar de novo.`)) return;
  await api.disconnect();
  await atualizar();
});
$('escolherContato').addEventListener('click', () => { if (!exigirConexao()) return; escolhendo = true; $('buscaContato').value = ''; mostrar('contatos'); $('buscaContato').focus(); });
$('voltarEscolha').addEventListener('click', () => { escolhendo = false; mostrar('nova'); });
$('destinoNumero').addEventListener('input', () => { if ($('destinoNumero').value.trim() && destino) { destino = null; renderDestino(); } });
$('buscaContato').addEventListener('input', renderContatos);
$('filtroPessoas').addEventListener('click', () => { filtro = 'pessoas'; renderContatos(); });
$('filtroGrupos').addEventListener('click', () => { filtro = 'grupos'; renderContatos(); });
$('repeticao').addEventListener('change', () => { $('diasBox').hidden = $('repeticao').value !== 'dias'; });
$('modoExato').addEventListener('change', () => { $('modoReescrever').checked = false; $('jeitoBox').hidden = true; $('salvar').textContent = 'Continuar'; });
$('modoReescrever').addEventListener('change', () => { $('modoExato').checked = false; $('jeitoBox').hidden = false; $('salvar').textContent = 'Reescrever'; });
$('cancelarEdicao').addEventListener('click', () => { limpar(); mostrar('mensagens'); });
$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const texto = $('texto').value.trim();
  if (!texto) { $('erro').textContent = ERROS.texto_vazio; return; }
  if (!$('modoReescrever').checked) return confirmar(texto);
  // Reescrever: mostra a versão do JoJo e ela aprova antes de seguir.
  $('salvar').disabled = true;
  $('erro').textContent = '';
  const r = await api.reescrever(texto, { destino: destinoDoFormulario().contato?.nome || '', jeitoJoJo: $('jeitoJoJo').checked });
  $('salvar').disabled = false;
  if (!r.ok) { $('erro').textContent = ERROS[r.erro] || ERROS.sem_modelo; return; }
  proposta = r.texto;
  $('propostaTexto').textContent = proposta;
  $('proposta').hidden = false;
});
$('usarProposta').addEventListener('click', () => proposta && confirmar(proposta));
$('manterMinha').addEventListener('click', () => confirmar($('texto').value.trim()));
$('confirmarSalvar').addEventListener('click', salvarConfirmado);
$('confirmarVoltar').addEventListener('click', () => mostrar('nova'));
api.onUpdate(render);
api.onFotos(receberFotos);
api.onTela((t) => { escolhendo = false; mostrar(t === 'conexao' || !st ? 'conexao' : telaInicial(st.visivel.chave, t)); });
limpar();
atualizar();
