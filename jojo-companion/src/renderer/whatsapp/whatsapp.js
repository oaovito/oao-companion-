// Janela das mensagens programadas no WhatsApp. Validação final no processo
// principal; aqui só montamos a tela. Campos sem atributo "name" de propósito:
// nada daqui vira configuração do app.
const api = window.waApi;
const $ = (id) => document.getElementById(id);
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ESTADOS = {
  desligado: ['Desconectado', ''], conectando: ['Conectando…', 'warn'], qr: ['Escaneie o QR code', 'warn'],
  conectado: ['Conectado', 'ok'], reconectando: ['Reconectando…', 'warn'], erro: ['Sem conexão', 'bad'],
};
// Erros na voz do JoJo.
const ERROS = {
  numero_invalido: 'Esse número não tem cara de número. Coloca com DDD: 42 99999-1234.',
  contato_nao_encontrado: 'Não achei esse contato com WhatsApp. Escolhe da lista ou usa o número com DDD.',
  texto_vazio: 'Mensagem vazia eu não mando. Escreve alguma coisa.',
  passado: 'Esse horário já passou. Eu sou rápido, mas não volto no tempo.',
  cheio: 'Agenda cheia. Apaga alguma antes.',
  invalido: 'Faltou alguma coisa: confere dia, hora e repetição.',
  sem_modelo: 'Meu motor de conversa não está disponível pra reescrever agora. Manda a sua mesmo.',
  sem_hora: 'Me diz o dia e a hora.',
  sem_destino: 'Pra quem? Escolhe um contato ou coloca o número com DDD.',
};
const MOTIVOS = { sessao_desconectada: 'o WhatsApp está desconectado', sem_internet: 'sem internet', contato_nao_encontrado: 'número sem WhatsApp', falha_envio: 'o WhatsApp recusou', limite_diario: 'limite diário atingido' };

let st = null, editando = null, proposta = null;

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

function render(s) {
  st = s;
  const [rotulo, cor] = ESTADOS[s.conexao.estado] || ESTADOS.desligado;
  $('estado').textContent = s.conexao.estado === 'conectado' && s.conexao.numero ? `${rotulo} · ${s.conexao.numero}` : s.conexao.motivo && s.conexao.estado !== 'conectado' ? `${rotulo} · ${MOTIVOS[s.conexao.motivo] || s.conexao.motivo}` : rotulo;
  $('estado').className = `chip ${cor}`;
  const ligado = ['conectado', 'conectando', 'qr', 'reconectando'].includes(s.conexao.estado);
  $('conectar').hidden = ligado;
  $('desconectar').hidden = !ligado;
  $('qrBox').hidden = !(s.conexao.estado === 'qr' && s.conexao.qr);
  if (s.conexao.qr) $('qr').src = s.conexao.qr;
  $('porDia').textContent = String(s.limites?.porDia || 40);
  const dl = $('contatosLista');
  dl.textContent = '';
  for (const c of s.contatos) dl.append(Object.assign(document.createElement('option'), { value: c.tipo === 'grupo' ? `${c.nome} (grupo)` : c.nome }));
  $('destinoDica').textContent = s.contatos.length ? `${s.contatos.length} ${s.contatos.length === 1 ? 'contato ou grupo' : 'contatos e grupos'} do seu WhatsApp. Número com DDD também funciona.` : 'Os nomes aparecem depois de conectar. Número com DDD sempre funciona.';

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
  if (!ativas.length) lista.append(el('li', 'vazio', 'Nada programado. Agenda uma aí em cima.'));
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

function linha(i) {
  const li = el('li');
  const info = el('div', 'info');
  const status = i.estado === 'falhou' ? ` · falhou: ${MOTIVOS[i.ultimoErro] || 'erro'}` : i.estado === 'atrasada' ? ' · atrasada' : i.tentativas ? ` · tentativa ${i.tentativas} de 3` : '';
  info.append(el('div', 'quem', `${i.destino.nome}${i.destino.tipo === 'grupo' ? ' (grupo)' : ''}`), el('div', 'quando', `${i.quandoTexto}${status}`), el('div', 'msg', i.texto));
  li.append(info);
  return li;
}

function botao(texto, cls, fn) {
  const b = el('button', cls, texto);
  b.type = 'button';
  b.addEventListener('click', fn);
  return b;
}

async function atualizar() { render(await api.state()); }

function destinoDoCampo() {
  const v = $('destinoBusca').value.trim();
  if (!v) return null;
  const nome = v.replace(/ \(grupo\)$/, '');
  const c = st.contatos.find((x) => x.nome === nome && (x.tipo === 'grupo') === / \(grupo\)$/.test(v)) || st.contatos.find((x) => x.nome === nome);
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
  $('cancelarEdicao').hidden = true;
  $('erro').textContent = '';
  const agora = new Date(Date.now() + 10 * 60e3);
  $('data').value = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
  $('hora').value = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
}

function editar(i) {
  limpar();
  editando = i.id;
  $('formTitulo').textContent = 'Editar mensagem';
  $('salvar').textContent = 'Salvar';
  $('cancelarEdicao').hidden = false;
  $('destinoBusca').value = i.destino.tipo === 'grupo' ? `${i.destino.nome} (grupo)` : i.destino.nome;
  if (!st.contatos.some((c) => c.jid === i.destino.jid)) $('destinoBusca').value = i.destino.jid.split('@')[0];
  $('texto').value = i.texto;
  $('data').value = i.data;
  $('hora').value = i.hora;
  $('repeticao').value = i.repeticao.tipo;
  $('diasBox').hidden = i.repeticao.tipo !== 'dias';
  for (const c of $('diasBox').querySelectorAll('input')) c.checked = i.repeticao.dias.includes(Number(c.dataset.dia));
  $('texto').focus();
}

async function salvar(textoFinal) {
  $('erro').textContent = '';
  const destino = destinoDoCampo();
  if (!destino || (!destino.jid && !destino.numero)) { $('erro').textContent = destino ? ERROS.contato_nao_encontrado : ERROS.sem_destino; return; }
  if (!$('data').value || !$('hora').value) { $('erro').textContent = ERROS.sem_hora; return; }
  const r = await api.save({ id: editando, destino, texto: textoFinal, data: $('data').value, hora: $('hora').value, repeticao: repeticaoDoCampo() });
  if (!r.ok) { $('erro').textContent = ERROS[r.erro] || ERROS.invalido; return; }
  limpar();
  await atualizar();
}

$('repeticao').addEventListener('change', () => { $('diasBox').hidden = $('repeticao').value !== 'dias'; });
$('modoExato').addEventListener('change', () => { $('modoReescrever').checked = false; $('jeitoBox').hidden = true; $('salvar').textContent = editando ? 'Salvar' : 'Agendar'; });
$('modoReescrever').addEventListener('change', () => { $('modoExato').checked = false; $('jeitoBox').hidden = false; $('salvar').textContent = 'Reescrever'; });
$('cancelarEdicao').addEventListener('click', limpar);
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
$('conectar').addEventListener('click', async () => { render({ ...st, conexao: await api.connect() }); });
$('desconectar').addEventListener('click', async () => {
  if (!confirm('Desconectar o WhatsApp deste PC? A sessão e a lista de contatos salvas aqui são apagadas. As mensagens programadas continuam, mas não saem até conectar de novo.')) return;
  await api.disconnect();
  await atualizar();
});
api.onUpdate(render);
limpar();
atualizar();
