// Serviços do WhatsApp de ponta a ponta com o WhatsApp simulado: conexão
// conferida antes de agendar, retomada depois de conectar, status de cada
// mensagem programada, falha com motivo e "Tentar de novo". Nada envia de verdade.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEnv, chatAdv } from './helpers.js';
import { WhatsAppAgenda, statusItem, WA_MOTIVOS_ENVIO, WA_ERROS } from '../../src/core/whatsapp.js';
import { createWhatsAppService } from '../../src/main/whatsapp-service.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ler = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const AGORA = new Date(2026, 9, 30, 15, 0);
const MAE = { jid: '5542999990001@s.whatsapp.net', nome: 'Mãe', tipo: 'contato' };

function env() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.clock.advance(2000);
  e.companion.reminders.apply({ tipo: 'agua', ativo: false });
  const conexao = { estado: 'desligado' };
  const abertas = [];
  e.companion.onOpenWhatsapp = (tela) => abertas.push(tela);
  e.companion.whatsapp = {
    agenda: new WhatsAppAgenda({ load: () => [], save: () => {} }),
    conexao: () => ({ ...conexao }),
    contatos: () => [MAE],
    checarNumero: async () => ({ ok: true }),
    mudou: () => {},
  };
  e.companion.dialogue.llm = null;
  e.companion.enterInteraction('test');
  return { ...e, conexao, abertas, wa: e.companion.whatsapp };
}

test('conversa: sem WhatsApp conectado não agenda; abre a tela de conexão e continua sozinho quando conecta', async () => {
  const e = env();
  let r = await chatAdv(e, "manda 'bom dia' pra minha mãe amanhã às 8h");
  assert.equal(r.intent, 'whatsapp');
  assert.match(r.text, /não está conectado|Primeiro o WhatsApp conectado/);
  assert.deepEqual(e.abertas, ['conexao'], 'leva direto à tela de conexão');
  assert.equal(e.wa.agenda.ativas().length, 0);
  r = await chatAdv(e, 'pronto');
  assert.match(r.text, /não está conectado|Primeiro o WhatsApp conectado/, 'ainda sem conexão: repete o único próximo passo');
  e.conexao.estado = 'conectado';
  const t = e.companion.whatsappEvento({ tipo: 'conectado', nome: 'Emanuele', numero: '5542999990000' });
  assert.match(t, /Conta conectada: Emanuele · \+55 \(42\) 99999-0000\./);
  assert.match(t, /Confere: pra Mãe, amanhã às 08:00: “bom dia”\. Contato: \+55 \(42\) 99999-0001\./, 'retoma o pedido com a confirmação');
  r = await chatAdv(e, 'sim');
  assert.match(r.text, /Agendado|Fechado/);
  assert.equal(e.wa.agenda.ativas()[0].texto, 'bom dia');
  // A conexão caiu entre a confirmação e o "sim": nada salvo.
  await chatAdv(e, "manda 'oi' pra minha mãe amanhã às 9h");
  e.conexao.estado = 'reconectando';
  r = await chatAdv(e, 'sim');
  assert.match(r.text, /não está conectado|Primeiro o WhatsApp conectado/);
  assert.equal(e.wa.agenda.ativas().length, 1);
  e.conexao.estado = 'conectado';
  r = await chatAdv(e, 'conectei');
  assert.match(r.text, /Confere: pra Mãe, amanhã às 09:00: “oi”/);
  r = await chatAdv(e, 'não');
  assert.match(r.text, /Nada agendado|Não mando nada/);
});

test('conversa: erro de conexão que pede ação avisa com o motivo e onde resolver; /whatsapp mostra a conta', async () => {
  const e = env();
  const t = e.companion.whatsappEvento({ tipo: 'erroConexao', motivo: 'sessao_invalida' });
  assert.match(t, /não vale mais e foi apagada.*\/whatsapp/);
  assert.doesNotMatch(t, /\{|código \{/);
  assert.equal(e.companion.conversations.get('whatsapp').status, 'needsInput');
  e.conexao.estado = 'conectado';
  e.conexao.nome = 'Emanuele';
  e.conexao.numero = '5542999990000';
  const r = await chatAdv(e, '/whatsapp');
  assert.match(r.text, /WhatsApp conectado \(Emanuele · \+55 \(42\) 99999-0000\)/);
  assert.deepEqual(e.abertas, [undefined]);
  assert.equal(e.companion.waFalaTela('qr'), e.companion.waFalaTela('qr'), 'mesma fala enquanto o estado não muda');
  assert.ok(e.companion.waFalaTela('erro', 'outra_sessao').length > 10);
});

test('status de cada mensagem: Agendada, Tentando de novo, Atrasada, Falhou com motivo e ação, Enviada', () => {
  const base = { estado: 'agendada', tentativas: 0, ultimoErro: null };
  assert.deepEqual([statusItem(base).rotulo, statusItem(base).frase], ['Agendada', '']);
  assert.deepEqual([statusItem({ ...base, tentativas: 2, ultimoErro: 'sem_internet' }).rotulo, statusItem({ ...base, tentativas: 2, ultimoErro: 'sem_internet' }).frase], ['Tentando de novo (2 de 3)', 'O PC estava sem internet na hora do envio. Nova tentativa em 1 minuto.']);
  assert.match(statusItem({ ...base, ultimoErro: 'falha_envio' }).frase, /A última vez não saiu/);
  assert.equal(statusItem({ ...base, estado: 'atrasada' }).rotulo, 'Atrasada');
  assert.equal(statusItem({ ...base, estado: 'enviada' }).rotulo, 'Enviada');
  for (const erro of WA_ERROS) {
    const s = statusItem({ ...base, estado: 'falhou', ultimoErro: erro });
    assert.equal(s.rotulo, 'Falhou');
    assert.equal(s.frase, WA_MOTIVOS_ENVIO[erro].frase, erro);
    assert.match(s.frase, /\. .+/, `${erro}: o que aconteceu e o que fazer`);
  }
  assert.equal(statusItem({ ...base, estado: 'falhou', ultimoErro: 'contato_nao_encontrado' }).acao, 'editar', 'número sem WhatsApp: editar, não repetir');
  assert.equal(statusItem({ ...base, estado: 'falhou', ultimoErro: 'sem_internet' }).acao, 'tentar');
});

function fakeChild(responder) {
  const ls = {};
  const c = { posted: [], on(ev, fn) { (ls[ev] ||= []).push(fn); }, postMessage(m) { c.posted.push(m); responder?.(c, m); }, emit(ev, m) { for (const f of ls[ev] || []) f(m); } };
  return c;
}

test('serviço: envio confirmado não vira falha; falhou 3 vezes mostra motivo; "Tentar de novo" envia agora só conectado', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-wa-srv-'));
  const st = { t: AGORA.getTime() };
  let resposta = { ok: true, mensagem: 'ABCD' };
  const eventos = [], filhos = [];
  const responder = (c, m) => { if (m.type === 'send') setImmediate(() => c.emit('message', { type: 'result', ...resposta, id: m.id })); };
  const s = createWhatsAppService({
    userData: dir, companion: { whatsappEvento: (ev) => eventos.push(ev) }, now: () => st.t,
    spawn: () => { const c = fakeChild(responder); filhos.push(c); return c; }, toDataURL: async (t) => t,
    setTimer: () => 1, clearTimer: () => {}, later: (fn, ms) => setTimeout(fn, Math.min(ms, 20)), requestTimeoutMs: 2e3,
  });
  s.connect();
  const c = filhos[0];
  c.emit('message', { type: 'status', estado: 'conectado', numero: '5542999990000' });
  c.emit('message', { type: 'contatos', lista: [{ jid: MAE.jid, nomeAgenda: 'Mãe' }] });
  await s.save({ destino: { jid: MAE.jid }, texto: 'bom dia', data: '2026-10-30', hora: '15:10', repeticao: { tipo: 'uma', dias: [] } });
  st.t = new Date(2026, 9, 30, 15, 10).getTime();
  await s.tick();
  assert.deepEqual(eventos.map((e) => e.tipo), ['conectado', 'enviada'], 'resposta reconhecida: sai uma vez só');
  assert.equal(c.posted.filter((m) => m.type === 'send').length, 1);
  assert.equal(s.state().historico[0].destino.numeroFormatado, '+55 (42) 99999-0001', 'histórico com o número');

  resposta = { ok: false, erro: 'falha_envio' };
  const r = await s.save({ destino: { jid: MAE.jid }, texto: 'oi', data: '2026-10-30', hora: '15:30', repeticao: { tipo: 'uma', dias: [] } });
  for (let k = 0; k < 3; k++) { st.t = new Date(2026, 9, 30, 15, 30).getTime() + k * 61e3; await s.tick(); }
  let item = s.state().itens.find((i) => i.id === r.id);
  assert.deepEqual([item.estado, item.ultimoErro, statusItem(item).rotulo], ['falhou', 'falha_envio', 'Falhou']);
  assert.equal(item.destino.numeroFormatado, '+55 (42) 99999-0001');
  c.emit('message', { type: 'status', estado: 'reconectando', motivo: 'sem_internet', esperaMs: 3e3 });
  assert.deepEqual(s.tentarDeNovo(r.id), { ok: false, erro: 'desconectado' }, 'sem conexão: leva à conexão, não tenta');
  c.emit('message', { type: 'status', estado: 'conectado', numero: '5542999990000' });
  resposta = { ok: true };
  st.t += 61e3;
  assert.deepEqual(s.tentarDeNovo(r.id), { ok: true });
  for (let i = 0; i < 50 && eventos.at(-1).tipo !== 'enviada'; i++) await new Promise((res) => setTimeout(res, 5));
  item = s.state().historico.find((i) => i.id === r.id);
  assert.equal(item.estado, 'enviada');
  assert.deepEqual(s.tentarDeNovo('nao-existe'), { ok: false });
  s.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('janela: cada mensagem com contato, texto, quando, status, motivo e o botão certo; tutorial e ajuda atualizados', () => {
  const js = ler('src/renderer/whatsapp/whatsapp.js');
  assert.match(js, /function cartaoMensagem/);
  assert.match(js, /cartaoPessoa\(destinoDoItem\(i\)\)/, 'contato com foto, nome e número');
  assert.match(js, /statusItem\(i\)/);
  assert.match(js, /'Tentar de novo'/);
  assert.match(js, /api\.tentarDeNovo\(/);
  assert.match(js, /exigirConexao\(\)/);
  const tut = JSON.parse(ler('assets/tutorial/pt-BR.json')).funcoes.find((f) => f.id === 'whatsapp');
  const textos = tut.passos.map((p) => p.texto).join(' ');
  assert.match(textos, /Conectado.*nome e número/);
  assert.match(textos, /Contatos/);
  assert.match(textos, /Agendada, Enviada ou Falhou/);
  assert.match(ler('src/core/conversations.js'), /contatos com nome e número/);
  const falas = JSON.parse(ler('assets/dialogue/pt-BR.json')).categories;
  for (const c of ['wa_tela_desconectado', 'wa_tela_qr', 'wa_tela_conectando', 'wa_tela_conectado', 'wa_tela_erro', 'wa_precisaConectar', 'wa_erroConexao']) assert.ok(falas[c]?.lines.length >= 1, c);
});

test('serviço: ao desconectar, contatos e sessão somem antes do aviso ao WhatsApp (sem janela com dados velhos)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-wa-desc-'));
  const filhos = [];
  const s = createWhatsAppService({
    userData: dir, companion: {}, spawn: () => { const c = fakeChild(); filhos.push(c); return c; }, toDataURL: async (t) => t,
    setTimer: () => 1, clearTimer: () => {}, later: (fn, ms) => setTimeout(fn, Math.min(ms, 20)), requestTimeoutMs: 2e3,
  });
  s.connect();
  const c = filhos[0];
  c.emit('message', { type: 'status', estado: 'conectado', numero: '5542999990000' });
  c.emit('message', { type: 'contatos', lista: [{ jid: MAE.jid, nomeAgenda: 'Mãe' }] });
  fs.mkdirSync(path.join(dir, 'whatsapp', 'sessao'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'whatsapp', 'sessao', 'creds.json'), '{}');
  const saindo = s.disconnect();
  assert.deepEqual([s.state().conexao.estado, s.state().pessoas.length], ['desligado', 0], 'já na hora em que a tela mostra Desconectado');
  assert.equal(fs.existsSync(path.join(dir, 'whatsapp', 'sessao')), false);
  c.emit('message', { type: 'status', estado: 'desligado' }); // o processo antigo avisa depois: ignorado
  c.emit('message', { type: 'contatos', lista: [{ jid: MAE.jid, nomeAgenda: 'Mãe' }] });
  assert.equal(s.state().pessoas.length, 0, 'nada do processo antigo volta para a tela');
  c.emit('message', { type: 'result', id: c.posted.find((m) => m.type === 'logout').id, ok: true });
  await saindo;
  assert.equal(c.posted.at(-1).type, 'stop');
  fs.rmSync(dir, { recursive: true, force: true });
});
