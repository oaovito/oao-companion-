// Janela do WhatsApp: uma tela por vez (Conexão, Mensagens, Nova mensagem),
// com o estado da conexão sempre visível no topo. Validação final no processo
// principal; aqui só montamos a tela. Campos sem atributo "name" de propósito:
// nada daqui vira configuração do app.
import { barra, qrInfo, quandoFoi, telaInicial, contaTexto } from '../shared/whatsapp-view.js';
import { formatarNumero } from '../../core/whatsapp-contatos.js';

const api = window.waApi;
const $ = (id) => document.getElementById(id);
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ERROS = {
  numero_invalido: 'Número inválido. Digite com DDD, por exemplo 42 99999-1234.',
  contato_nao_encontrado: 'Esse contato não tem WhatsApp. Escolha outro da lista ou digite o número com DDD.',
  texto_vazio: 'A mensagem está vazia. Escreva o texto.',
  passado: 'Esse dia e hora já passaram. Escolha um horário no futuro.',
  cheio: 'A agenda está cheia (200). Apague alguma mensagem antes.',
  invalido: 'Falta alguma informação. Confira dia, hora e repetição.',
  sem_modelo: 'O JoJo não consegue reescrever agora (motor local desligado). Use o seu texto.',
  sem_hora: 'Falta o dia ou a hora. Preencha os dois.',
  sem_destino: 'Falta para quem. Escolha um contato ou digite o número com DDD.',
};
const MOTIVOS = { sessao_desconectada: 'o WhatsApp está desconectado', sem_internet: 'sem internet', contato_nao_encontrado: 'número sem WhatsApp', falha_envio: 'o WhatsApp recusou', limite_diario: 'limite diário atingido' };

let st = null, editando = null, proposta = null, tela = null, qrVisto = null, avisoQr = null;
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

function mostrar(nome) {
  tela = nome;
  for (const t of ['conexao', 'mensagens', 'nova']) $(`tela-${t}`).hidden = t !== nome;
  for (const a of document.querySelectorAll('.aba')) {
    if (a.dataset.tela === nome || (nome === 'nova' && a.dataset.tela === 'mensagens')) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

/** Ações que usam o WhatsApp: se a conexão não está confirmada, leva direto à tela de conexão. */
function exigirConexao() {
  if (st?.visivel.chave === 'conectado') return true;
  mostrar('conexao');
  return false;
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

// ---------------------------------------------------------- nova mensagem

function renderDestinos(s) {
  const contatos = [...s.pessoas, ...s.grupos];
  const dl = $('contatosLista');
  dl.textContent = '';
  for (const c of contatos) dl.append(Object.assign(document.createElement('option'), { value: c.tipo === 'grupo' ? `${c.nome} (grupo)` : c.nome }));
  $('destinoDica').textContent = contatos.length ? `${contatos.length} ${contatos.length === 1 ? 'contato ou grupo' : 'contatos e grupos'} do seu WhatsApp. Número com DDD também funciona.` : 'Os nomes aparecem depois de conectar. Número com DDD sempre funciona.';
}

function destinoDoCampo() {
  const v = $('destinoBusca').value.trim();
  if (!v) return null;
  const contatos = [...st.pessoas, ...st.grupos];
  const nome = v.replace(/ \(grupo\)$/, '');
  const c = contatos.find((x) => x.nome === nome && (x.tipo === 'grupo') === / \(grupo\)$/.test(v)) || contatos.find((x) => x.nome === nome);
  if (c) return { jid: c.jid };
  if (/\d{8,}/.test(v.replace(/\D/g, ''))) return { numero: v, nome: v };
  return { jid: null };
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
  $('form').reset();
  $('modoExato').checked = true;
  $('modoReescrever').checked = false;
  $('jeitoBox').hidden = true;
  $('proposta').hidden = true;
  $('diasBox').hidden = true;
  $('formTitulo').textContent = 'Nova mensagem';
  $('salvar').textContent = 'Agendar';
  $('erro').textContent = '';
  const agora = new Date(Date.now() + 10 * 60e3);
  $('data').value = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
  $('hora').value = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
}

function novaMensagem() {
  if (!exigirConexao()) return;
  limpar();
  mostrar('nova');
  $('destinoBusca').focus();
}

function editar(i) {
  if (!exigirConexao()) return;
  limpar();
  editando = i.id;
  $('formTitulo').textContent = 'Editar mensagem';
  $('salvar').textContent = 'Salvar';
  $('destinoBusca').value = i.destino.tipo === 'grupo' ? `${i.destino.nome} (grupo)` : i.destino.nome;
  if (![...st.pessoas, ...st.grupos].some((c) => c.jid === i.destino.jid)) $('destinoBusca').value = i.destino.jid.split('@')[0];
  $('texto').value = i.texto;
  $('data').value = i.data;
  $('hora').value = i.hora;
  $('repeticao').value = i.repeticao.tipo;
  $('diasBox').hidden = i.repeticao.tipo !== 'dias';
  for (const c of $('diasBox').querySelectorAll('input')) c.checked = i.repeticao.dias.includes(Number(c.dataset.dia));
  mostrar('nova');
  $('texto').focus();
}

async function salvar(textoFinal) {
  $('erro').textContent = '';
  if (!exigirConexao()) return;
  const destino = destinoDoCampo();
  if (!destino || (!destino.jid && !destino.numero)) { $('erro').textContent = destino ? ERROS.contato_nao_encontrado : ERROS.sem_destino; return; }
  if (!$('data').value || !$('hora').value) { $('erro').textContent = ERROS.sem_hora; return; }
  const r = await api.save({ id: editando, destino, texto: textoFinal, data: $('data').value, hora: $('hora').value, repeticao: repeticaoDoCampo() });
  if (!r.ok) { $('erro').textContent = ERROS[r.erro] || ERROS.invalido; return; }
  limpar();
  mostrar('mensagens');
  await atualizar();
}

// ------------------------------------------------------------------ geral

function render(s) {
  st = s;
  if (!tela) mostrar(telaInicial(s.visivel.chave, pedida));
  renderConexao(s);
  renderMensagens(s);
  renderDestinos(s);
}

async function atualizar() { render(await api.state()); }

for (const a of document.querySelectorAll('.aba')) a.addEventListener('click', () => mostrar(a.dataset.tela));
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
$('repeticao').addEventListener('change', () => { $('diasBox').hidden = $('repeticao').value !== 'dias'; });
$('modoExato').addEventListener('change', () => { $('modoReescrever').checked = false; $('jeitoBox').hidden = true; $('salvar').textContent = editando ? 'Salvar' : 'Agendar'; });
$('modoReescrever').addEventListener('change', () => { $('modoExato').checked = false; $('jeitoBox').hidden = false; $('salvar').textContent = 'Reescrever'; });
$('cancelarEdicao').addEventListener('click', () => { limpar(); mostrar('mensagens'); });
$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const texto = $('texto').value.trim();
  if (!texto) { $('erro').textContent = ERROS.texto_vazio; return; }
  if (!$('modoReescrever').checked) return salvar(texto);
  // Reescrever: mostra a versão do JoJo e ela aprova antes de salvar.
  $('salvar').disabled = true;
  $('erro').textContent = '';
  const nome = $('destinoBusca').value.replace(/ \(grupo\)$/, '');
  const r = await api.reescrever(texto, { destino: nome, jeitoJoJo: $('jeitoJoJo').checked });
  $('salvar').disabled = false;
  if (!r.ok) { $('erro').textContent = ERROS[r.erro] || ERROS.sem_modelo; return; }
  proposta = r.texto;
  $('propostaTexto').textContent = proposta;
  $('proposta').hidden = false;
});
$('usarProposta').addEventListener('click', () => proposta && salvar(proposta));
$('manterMinha').addEventListener('click', () => salvar($('texto').value.trim()));
api.onUpdate(render);
api.onTela((t) => mostrar(t === 'conexao' || !st ? 'conexao' : telaInicial(st.visivel.chave, t)));
limpar();
atualizar();
