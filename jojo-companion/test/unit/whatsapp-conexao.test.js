// Conexão do WhatsApp: classificação de cada queda, estado visível, processo
// isolado com o Baileys simulado (fake-baileys.mjs) e serviço do processo
// principal. Nenhum teste conecta, envia ou abre sessão de verdade.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { classificarFechamento, estadoVisivel, esperaReconexao, WA_MOTIVOS_CONEXAO, WA_ESTADOS_VISIVEIS, WA_QR } from '../../src/core/whatsapp-conexao.js';
import { createWhatsAppService, WA_WORKER } from '../../src/main/whatsapp-service.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const T0 = new Date(2026, 9, 30, 15, 0).getTime();

// ------------------------------------------------------------- classificação

test('queda da conexão: decidida pelo código do WhatsApp, nunca pelo texto', () => {
  const c = (codigo, extra = {}) => classificarFechamento({ codigo, registrado: true, ...extra });
  assert.deepEqual([c(515).motivo, c(515).reconectar, c(515).esperaMs], ['reiniciar', true, 0], 'depois do QR lido: reabre na hora');
  assert.deepEqual([c(401).motivo, c(401).reconectar, c(401).apagarSessao], ['sessao_encerrada', false, true]);
  assert.equal(c(500).motivo, 'sessao_invalida');
  assert.equal(c(411).apagarSessao, true);
  assert.deepEqual([c(440).motivo, c(440).reconectar], ['outra_sessao', false], 'conexão substituída não briga com a outra');
  assert.deepEqual([c(403).motivo, c(403).reconectar], ['conta_recusada', false]);
  assert.deepEqual([c(405).motivo, c(405).atualizarVersao, c(405).reconectar], ['versao', true, true]);
  assert.deepEqual([c(405, { tentativas: 1 }).reconectar, c(405, { tentativas: 1 }).atualizarVersao], [false, false], 'versão recusada de novo: pede ação');
  assert.deepEqual([c(428).motivo, c(428).reconectar], ['conexao_caiu', true]);
  assert.equal(c(408).motivo, 'conexao_caiu');
  assert.equal(c(503).motivo, 'servico_fora');
  assert.equal(c(408, { mensagem: 'WebSocket Error (getaddrinfo ENOTFOUND web.whatsapp.com)' }).motivo, 'sem_internet');
  assert.equal(c(999).motivo, 'desconhecido');
  const qr = classificarFechamento({ codigo: 408, mensagem: 'QR refs attempts ended', registrado: false });
  assert.deepEqual([qr.motivo, qr.reconectar], ['qr_expirado', false], 'QR não lido: não gera código novo para sempre');
  assert.deepEqual([0, 1, 2, 3, 4, 5, 9].map(esperaReconexao), [3e3, 6e3, 12e3, 24e3, 48e3, 60e3, 60e3]);
  assert.equal(c(428, { tentativas: 2 }).esperaMs, 12e3);
});

test('estado visível: só cinco estados, cada erro com o que houve, o que fazer e um botão', () => {
  assert.deepEqual(Object.values(WA_ESTADOS_VISIVEIS), ['Desconectado', 'Aguardando QR code', 'Conectando', 'Conectado', 'Erro']);
  const v = (c) => estadoVisivel(c, T0);
  assert.deepEqual([v({}).chave, v({}).acao.id, v({}).acao.rotulo], ['desconectado', 'conectar', 'Conectar WhatsApp']);
  const qr = v({ estado: 'qr', qrExpiraEm: T0 + 42e3, qrRenovacao: 2 });
  assert.deepEqual([qr.chave, qr.titulo, qr.restanteSeg, qr.renovacao, qr.acao], ['qr', 'Aguardando QR code', 42, 2, null]);
  assert.deepEqual([v({ estado: 'conectando' }).chave, v({ estado: 'pareando' }).chave], ['conectando', 'conectando']);
  assert.match(v({ estado: 'pareando' }).frase, /QR code lido/);
  const rec = v({ estado: 'reconectando', motivo: 'sem_internet', proximaEm: T0 + 12e3 });
  assert.deepEqual([rec.chave, rec.reconectando, rec.acao.id, rec.acao.rotulo], ['conectando', true, 'tentar', 'Tentar agora']);
  assert.match(rec.frase, /sem internet.*Nova tentativa em 12 s\./);
  const ok = v({ estado: 'conectado', nome: 'Emanuele', numero: '5542999990000', confirmadoEm: T0 });
  assert.deepEqual([ok.chave, ok.conta, ok.confirmadoEm, ok.acao], ['conectado', { nome: 'Emanuele', numero: '5542999990000' }, T0, null]);
  assert.match(v({ estado: 'desligado', motivo: 'sessao_encerrada' }).frase, /desconectado pelo celular/);
  assert.equal(v({ estado: 'desligado', motivo: 'qr_expirado' }).acao.rotulo, 'Gerar novo QR code');
  assert.equal(v({ estado: 'erro', motivo: 'outra_sessao' }).acao.rotulo, 'Conectar aqui');
  assert.match(v({ estado: 'erro', motivo: 'desconhecido', codigo: 499 }).frase, /código 499/);
  assert.equal(v({ estado: 'erro', motivo: 'inventado' }).frase, WA_MOTIVOS_CONEXAO.processo_parou.frase, 'motivo desconhecido nunca fica sem frase');
  for (const [motivo, m] of Object.entries(WA_MOTIVOS_CONEXAO)) {
    assert.ok(m.frase.length > 30 && m.rotulo && ['conectar', 'tentar'].includes(m.acao), motivo);
    assert.doesNotMatch(m.frase, /^(erro|sem conexão|erro de conexão)\.?$/i, `${motivo}: nada de mensagem genérica`);
    assert.match(m.frase, /\. .+|sozinho\.$/, `${motivo}: diz o que houve e o que fazer`);
    const e = v({ estado: 'erro', motivo, codigo: 1 });
    assert.ok(e.acao && e.frase, motivo);
  }
});

// -------------------------------------------- processo isolado (Baileys simulado)

registerHooks({
  resolve(spec, ctx, next) {
    if (spec === '@whiskeysockets/baileys') return { url: pathToFileURL(path.join(AQUI, 'fake-baileys.mjs')).href, shortCircuit: true };
    return next(spec, ctx);
  },
});

const esperar = async (cond, ms = 3000) => {
  const fim = Date.now() + ms;
  while (Date.now() < fim) { if (cond()) return true; await new Promise((r) => setTimeout(r, 5)); }
  assert.fail('condição não aconteceu a tempo');
};

test('processo isolado: QR com validade, lido, reinício, conta confirmada, contatos, envio, fotos, quedas e saída', async () => {
  const fake = globalThis.__waFake = { sockets: [], versao: [2, 3000, 999], enviados: [], fotos: {}, semWhats: new Set(['5542999990009']), confirmar: 'ok', lids: {}, grupos: { 'g1@g.us': { id: 'g1@g.us', subject: 'Facul', size: 12 } } };
  const msgs = [];
  let handler = null;
  process.parentPort = { postMessage: (m) => msgs.push(m), on: (_ev, fn) => { handler = fn; } };
  await import(pathToFileURL(path.resolve(AQUI, '../../src/main/whatsapp-worker.mjs')).href);
  const enviar = (m) => handler({ data: m });
  const ultimo = (pred) => msgs.filter(pred).at(-1);
  const status = () => msgs.filter((m) => m.type === 'status').map((m) => m.estado + (m.motivo ? `:${m.motivo}` : ''));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-wa-worker-'));
  const sessao = path.join(dir, 'sessao');
  assert.deepEqual(msgs[0], { type: 'ready' });

  // Conectar: versão atual do WhatsApp Web, QR de 60 s e renovações de 20 s.
  enviar({ type: 'start', dir: sessao });
  await esperar(() => fake.sockets.length === 1);
  assert.deepEqual(fake.sockets[0].config.version, [2, 3000, 999]);
  assert.equal(fake.sockets[0].config.markOnlineOnConnect, false);
  fake.sockets[0].ev.emit('connection.update', { qr: 'Q1' });
  fake.sockets[0].ev.emit('connection.update', { qr: 'Q2' });
  const qrs = msgs.filter((m) => m.type === 'qr');
  assert.deepEqual(qrs.map((m) => [m.qr, m.validadeMs, m.renovacao]), [['Q1', WA_QR.primeiroMs, 0], ['Q2', WA_QR.renovacaoMs, 1]]);

  // Lido no celular → "pareando"; o 515 obrigatório reabre na hora, sem erro na tela.
  fake.sockets[0].ev.emit('connection.update', { isNewLogin: true });
  fake.sockets[0].fechar(515, 'Stream Errored (restart required)');
  await esperar(() => fake.sockets.length === 2);
  assert.ok(fake.sockets[0].encerrado);
  assert.ok(!status().some((s) => /erro|reconectando/.test(s)), `nada de erro depois de ler o QR: ${status()}`);
  assert.ok(status().includes('pareando'));

  // Aberta: só "conectado" depois da consulta respondida, com nome e número da conta.
  fake.sockets[1].abrir();
  await esperar(() => ultimo((m) => m.type === 'status')?.estado === 'conectado');
  const ok = ultimo((m) => m.type === 'status');
  assert.deepEqual([ok.numero, ok.nome, typeof ok.confirmadoEm], ['5542999990000', 'Emanuele', 'number']);
  await esperar(() => msgs.some((m) => m.type === 'grupos'));
  assert.deepEqual(ultimo((m) => m.type === 'grupos').lista, [{ jid: 'g1@g.us', nome: 'Facul', participantes: 12 }]);

  // Contatos: nome salvo não é apagado pelo nome do perfil; LID ganha número; a própria conta fica fora.
  const s1 = fake.sockets[1];
  s1.ev.emit('contacts.upsert', [{ id: '5542999990001@s.whatsapp.net', name: 'Mãe' }, { id: '5542999990000@s.whatsapp.net', name: 'Eu' }]);
  s1.ev.emit('contacts.update', [{ id: '5542999990001@s.whatsapp.net', notify: 'Maria 🌸' }]);
  s1.ev.emit('contacts.upsert', [{ id: '111@lid', name: 'Ana Clara' }, { id: '222@lid', notify: 'Ana' }]);
  s1.ev.emit('lid-mapping.update', { lid: '111@lid', pn: '5542999990003@s.whatsapp.net' });
  fake.lids['222@lid'] = '5542999990004:2@s.whatsapp.net';
  s1.ev.emit('contacts.update', [{ id: '222@lid', notify: 'Ana' }]);
  await esperar(() => msgs.some((m) => m.type === 'contatos' && m.lista.length === 3));
  assert.deepEqual(ultimo((m) => m.type === 'contatos').lista.sort((a, b) => a.jid.localeCompare(b.jid)), [
    { jid: '5542999990001@s.whatsapp.net', numero: '5542999990001', nomeAgenda: 'Mãe', nomePerfil: 'Maria 🌸', tipo: 'contato' },
    { jid: '5542999990003@s.whatsapp.net', numero: '5542999990003', nomeAgenda: 'Ana Clara', nomePerfil: '', tipo: 'contato' },
    { jid: '5542999990004@s.whatsapp.net', numero: '5542999990004', nomeAgenda: '', nomePerfil: 'Ana', tipo: 'contato' },
  ]);

  // Envio: número checado antes; erro com motivo pelo código.
  enviar({ type: 'send', id: 1, jid: '5542999990001@s.whatsapp.net', texto: 'oi' });
  enviar({ type: 'send', id: 2, jid: '5542999990009@s.whatsapp.net', texto: 'oi' });
  await esperar(() => msgs.filter((m) => m.type === 'result').length === 2);
  assert.deepEqual(ultimo((m) => m.id === 1).ok, true);
  assert.deepEqual(ultimo((m) => m.id === 2).erro, 'contato_nao_encontrado');
  fake.falhaEnvio = { codigo: 408, msg: 'Timed Out' };
  enviar({ type: 'send', id: 3, jid: '5542999990001@s.whatsapp.net', texto: 'oi' });
  await esperar(() => ultimo((m) => m.id === 3));
  assert.equal(ultimo((m) => m.id === 3).erro, 'sem_internet');
  fake.falhaEnvio = null;
  assert.deepEqual(fake.enviados, [{ jid: '5542999990001@s.whatsapp.net', texto: 'oi' }], 'nada além do que foi pedido');

  // Foto: baixada como data URL; sem foto (404) volta null.
  const srv = http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'image/jpeg' }); r.end(Buffer.from([0xff, 0xd8, 0xff, 0xd9])); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  fake.fotos['5542999990001@s.whatsapp.net'] = `http://127.0.0.1:${srv.address().port}/f.jpg`;
  enviar({ type: 'foto', id: 4, jid: '5542999990001@s.whatsapp.net' });
  enviar({ type: 'foto', id: 5, jid: '5542999990003@s.whatsapp.net' });
  await esperar(() => ultimo((m) => m.id === 4) && ultimo((m) => m.id === 5));
  srv.close();
  assert.equal(ultimo((m) => m.id === 4).foto, 'data:image/jpeg;base64,/9j/2Q==');
  assert.deepEqual([ultimo((m) => m.id === 5).ok, ultimo((m) => m.id === 5).foto], [true, null]);

  // Caiu a internet: "reconectando" com espera e tentativa; "Tentar agora" reabre já.
  s1.fechar(428, 'Connection Terminated');
  await esperar(() => ultimo((m) => m.type === 'status').estado === 'reconectando');
  const rec = ultimo((m) => m.type === 'status');
  assert.deepEqual([rec.motivo, rec.esperaMs, rec.tentativa, rec.codigo], ['conexao_caiu', 3000, 1, 428]);
  enviar({ type: 'start', dir: sessao });
  await esperar(() => fake.sockets.length === 3);
  fake.sockets[2].abrir();
  await esperar(() => ultimo((m) => m.type === 'status').estado === 'conectado');

  // Start com a conta aberta não derruba nada.
  enviar({ type: 'start', dir: sessao });
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(fake.sockets.length, 3);

  // Aberta em outro lugar: erro com ação, sem brigar reconectando.
  fake.sockets[2].fechar(440, 'Stream Errored (conflict)');
  await esperar(() => ultimo((m) => m.type === 'status').estado === 'erro');
  assert.equal(ultimo((m) => m.type === 'status').motivo, 'outra_sessao');
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(fake.sockets.length, 3, 'não reconecta sozinho');

  // Conta não confirmada (consulta falhou): não mostra "conectado".
  enviar({ type: 'start', dir: sessao });
  await esperar(() => fake.sockets.length === 4);
  fake.confirmar = 'erro';
  const antes = msgs.length;
  fake.sockets[3].abrir();
  await esperar(() => msgs.slice(antes).some((m) => m.type === 'status' && m.estado === 'reconectando'));
  assert.ok(!msgs.slice(antes).some((m) => m.estado === 'conectado'));
  fake.confirmar = 'ok';

  // Desconectado pelo celular (401): sessão apagada, sem reconexão.
  enviar({ type: 'start', dir: sessao });
  await esperar(() => fake.sockets.length === 5);
  fake.sockets[4].abrir();
  await esperar(() => ultimo((m) => m.type === 'status').estado === 'conectado');
  fake.sockets[4].fechar(401, 'Connection Failure');
  await esperar(() => ultimo((m) => m.type === 'status').estado === 'desligado');
  assert.equal(ultimo((m) => m.type === 'status').motivo, 'sessao_encerrada');
  assert.equal(fs.existsSync(sessao), false);

  // QR não lido até o fim: para e pede um código novo.
  enviar({ type: 'start', dir: sessao });
  await esperar(() => fake.sockets.length === 6);
  fake.sockets[5].ev.emit('connection.update', { qr: 'Q9' });
  assert.equal(ultimo((m) => m.type === 'qr').renovacao, 0, 'conexão nova: contagem do QR recomeça');
  fake.sockets[5].fechar(408, 'QR refs attempts ended');
  await esperar(() => ultimo((m) => m.type === 'status').estado === 'desligado');
  assert.equal(ultimo((m) => m.type === 'status').motivo, 'qr_expirado');

  // Versão antiga (405): atualiza e tenta uma vez; recusou de novo: erro com ação.
  enviar({ type: 'start', dir: sessao });
  await esperar(() => fake.sockets.length === 7);
  fake.sockets[6].fechar(405, 'Connection Failure');
  await esperar(() => fake.sockets.length === 8);
  fake.sockets[7].fechar(405, 'Connection Failure');
  await esperar(() => ultimo((m) => m.type === 'status').estado === 'erro');
  assert.equal(ultimo((m) => m.type === 'status').motivo, 'versao');

  // Depois da leitura o WhatsApp aposenta o segredo do QR: troca, salva, responde e redesenha.
  enviar({ type: 'start', dir: sessao });
  await esperar(() => fake.sockets.length === 9);
  const sq = fake.sockets[8];
  assert.deepEqual(sq.config.browser.slice(0, 2), ['Windows', 'Chrome'], 'identidade padrão: o QR diz Chrome, como o registro');
  sq.qr('2@R1');
  assert.match(ultimo((m) => m.type === 'qr').qr, /#2@R1,NK,IK,ADV0,1$/);
  const qrsAntes = msgs.filter((m) => m.type === 'qr').length;
  sq.ws.emit('CB:notification,type:companion_reg_refresh', { tag: 'notification', attrs: { id: 'n1', from: 's.whatsapp.net', type: 'companion_reg_refresh' }, content: [{ tag: 'companion_reg_refresh', attrs: {} }] });
  const novo = sq.authState.creds.advSecretKey;
  assert.notEqual(novo, 'ADV0');
  assert.equal(Buffer.from(novo, 'base64').length, 32);
  assert.deepEqual(sq.nos.at(-1), { tag: 'ack', attrs: { id: 'n1', to: 's.whatsapp.net', class: 'notification', type: 'companion_reg_refresh' } }, 'responde o aviso antes do pareamento');
  assert.equal(msgs.filter((m) => m.type === 'qr').length, qrsAntes + 1);
  assert.equal(ultimo((m) => m.type === 'qr').qr, `https://wa.me/settings/linked_devices#2@R1,NK,IK,${novo},1`, 'mesmo código, segredo novo');
  await esperar(() => JSON.parse(fs.readFileSync(path.join(sessao, 'creds.json'), 'utf8')).advSecretKey === novo);
  sq.qr('2@R2');
  assert.match(ultimo((m) => m.type === 'qr').qr, new RegExp(`#2@R2,NK,IK,${novo.replace(/[+/=]/g, '\\$&')},1$`), 'renovação do Baileys com o segredo antigo sai corrigida');
  sq.ws.emit('CB:notification,type:companion_reg_refresh', { tag: 'notification', attrs: { id: 'n2', from: 's.whatsapp.net' }, content: [{ tag: 'outra', attrs: {} }] });
  assert.equal(sq.authState.creds.advSecretKey, novo, 'aviso sem o conteúdo esperado é ignorado');
  sq.abrir();
  await esperar(() => ultimo((m) => m.type === 'status').estado === 'conectado');
  sq.ws.emit('CB:notification,type:companion_reg_refresh', { tag: 'notification', attrs: { id: 'n3', from: 's.whatsapp.net' }, content: [{ tag: 'companion_reg_refresh', attrs: {} }] });
  assert.equal(sq.authState.creds.advSecretKey, novo, 'já pareado: o segredo não muda');

  // Sair: logout no WhatsApp e sessão apagada.
  enviar({ type: 'logout', id: 9 });
  await esperar(() => ultimo((m) => m.id === 9));
  assert.ok(fake.sockets[8].saiu);
  assert.equal(fs.existsSync(sessao), false);
  assert.equal(ultimo((m) => m.type === 'status').estado, 'desligado');
  assert.ok(msgs.filter((m) => m.type === 'log').every((m) => !/Emanuele|Mãe|5542999990001/.test(m.texto)), 'registro sem nomes nem números');
  fs.rmSync(dir, { recursive: true, force: true });
});

// ------------------------------------------------------------------ serviço

function fakeChild() {
  const ls = {};
  const c = { posted: [], on(ev, fn) { (ls[ev] ||= []).push(fn); }, postMessage(m) { c.posted.push(m); }, emit(ev, m) { for (const f of ls[ev] || []) f(m); } };
  return c;
}

function servico({ comSessao = false, querQr = () => false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-wa-svc-'));
  if (comSessao) { fs.mkdirSync(path.join(dir, 'whatsapp', 'sessao'), { recursive: true }); fs.writeFileSync(path.join(dir, 'whatsapp', 'sessao', 'creds.json'), '{}'); }
  const eventos = [], filhos = [], logs = [], depois = [];
  const st = { t: T0 };
  const companion = { whatsappEvento: (ev) => eventos.push(ev), waFalaTela: (chave) => `fala ${chave}` };
  const s = createWhatsAppService({
    userData: dir, companion, now: () => st.t, querQr, log: (n, t) => logs.push(`${n} ${t}`),
    spawn: (file) => { assert.equal(file, WA_WORKER); const c = fakeChild(); filhos.push(c); return c; },
    toDataURL: async (t) => `data:image/png;base64,${Buffer.from(t).toString('base64')}`,
    setTimer: () => 1, clearTimer: () => {}, later: (fn, ms) => { depois.push({ fn, ms }); return depois.length; },
  });
  return { s, dir, eventos, filhos, st, logs, depois, companion };
}
const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };
const chave = (s) => s.state().visivel.chave;

test('serviço: Desconectado → Conectando → Aguardando QR (60 s, depois 20 s) → Conectando (lido) → Conectado com nome e número', async () => {
  const { s, eventos, filhos, st } = servico();
  s.start();
  assert.equal(chave(s), 'desconectado');
  assert.equal(s.state().visivel.acao.rotulo, 'Conectar WhatsApp');
  assert.equal(s.state().jojo, 'fala desconectado', 'fala do JoJo vem do arquivo de falas');
  s.connect();
  assert.equal(chave(s), 'conectando');
  const c = filhos[0];
  c.emit('message', { type: 'ready' });
  c.emit('message', { type: 'status', estado: 'conectando' });
  c.emit('message', { type: 'qr', qr: 'Q1', validadeMs: 60e3, renovacao: 0 });
  await settle();
  assert.deepEqual([chave(s), s.state().visivel.restanteSeg, s.state().visivel.renovacao], ['qr', 60, 0]);
  st.t += 59e3;
  assert.equal(s.state().visivel.restanteSeg, 1);
  c.emit('message', { type: 'qr', qr: 'Q2', validadeMs: 20e3, renovacao: 1 });
  await settle();
  assert.deepEqual([s.state().visivel.restanteSeg, s.state().visivel.renovacao], [20, 1], 'renovou: contagem nova e aviso');
  assert.ok(s.state().conexao.qr.endsWith(Buffer.from('Q2').toString('base64')));
  s.connect();
  assert.equal(c.posted.filter((m) => m.type === 'start').length, 1, 'com o QR na tela, conectar de novo não reinicia');
  c.emit('message', { type: 'status', estado: 'pareando' });
  assert.equal(chave(s), 'conectando');
  assert.equal(s.state().conexao.qr, null);
  c.emit('message', { type: 'status', estado: 'conectado', numero: '5542999990000', nome: 'Emanuele', confirmadoEm: st.t });
  const v = s.state().visivel;
  assert.deepEqual([v.chave, v.conta.nome, v.conta.numero, v.confirmadoEm], ['conectado', 'Emanuele', '5542999990000', st.t]);
  assert.deepEqual(eventos.map((e) => [e.tipo, e.nome, e.numero]), [['conectado', 'Emanuele', '5542999990000']]);
  c.emit('message', { type: 'conta', nome: 'Manu', numero: '5542999990000' });
  assert.equal(s.state().visivel.conta.nome, 'Manu', 'nome atualizado quando o WhatsApp manda depois');
});

test('serviço: sessão salva é restaurada ao abrir; queda mostra "reconectando" com espera e "Tentar agora" reabre', async () => {
  const { s, eventos, filhos, st } = servico({ comSessao: true });
  s.start();
  assert.equal(filhos.length, 1, 'sessão salva: reconecta sozinho, sem QR');
  const c = filhos[0];
  c.emit('message', { type: 'ready' });
  assert.deepEqual(c.posted[0].type, 'start');
  c.emit('message', { type: 'status', estado: 'conectado', numero: '5542999990000', nome: 'Emanuele' });
  assert.equal(chave(s), 'conectado');
  assert.deepEqual(eventos, [], 'restaurar a sessão ao abrir não fala nada');
  c.emit('message', { type: 'status', estado: 'reconectando', motivo: 'sem_internet', esperaMs: 12e3, tentativa: 3 });
  let v = s.state().visivel;
  assert.deepEqual([v.chave, v.reconectando, v.restanteSeg, v.acao.rotulo], ['conectando', true, 12, 'Tentar agora']);
  assert.match(v.frase, /sem internet/);
  st.t += 5e3;
  assert.match(s.state().visivel.frase, /Nova tentativa em 7 s/);
  s.connect();
  assert.equal(c.posted.filter((m) => m.type === 'start').length, 2, 'Tentar agora pula a espera');
  assert.equal(chave(s), 'conectando');
  c.emit('message', { type: 'status', estado: 'conectado', numero: '5542999990000' });
  v = s.state().visivel;
  assert.deepEqual([v.chave, v.conta.nome, v.conta.numero], ['conectado', 'Emanuele', '5542999990000'], 'reconectou e manteve a conta');
});

test('serviço: QR expirado renova sozinho com a tela aberta; depois para e pede código novo', async () => {
  let aberta = true;
  const { s, filhos } = servico({ querQr: () => aberta });
  s.connect();
  const c = filhos[0];
  c.emit('message', { type: 'qr', qr: 'Q1', validadeMs: 20e3, renovacao: 5 });
  await settle();
  for (let i = 1; i < WA_QR.ciclosAutomaticos; i++) {
    c.emit('message', { type: 'status', estado: 'desligado', motivo: 'qr_expirado' });
    assert.equal(chave(s), 'qr', 'a tela continua no QR enquanto o código novo chega');
    c.emit('message', { type: 'status', estado: 'conectando' });
    assert.equal(chave(s), 'qr');
    c.emit('message', { type: 'qr', qr: `N${i}`, validadeMs: 60e3, renovacao: 0 });
    await settle();
  }
  assert.equal(c.posted.filter((m) => m.type === 'start').length, WA_QR.ciclosAutomaticos - 1);
  c.emit('message', { type: 'status', estado: 'desligado', motivo: 'qr_expirado' });
  const v = s.state().visivel;
  assert.deepEqual([v.chave, v.acao.rotulo], ['desconectado', 'Gerar novo QR code']);
  assert.match(v.frase, /expirou sem ser lido/);
  // Janela fechada: não fica gerando QR no fundo.
  aberta = false;
  s.connect();
  c.emit('message', { type: 'qr', qr: 'Q', validadeMs: 60e3, renovacao: 0 });
  await settle();
  c.emit('message', { type: 'status', estado: 'desligado', motivo: 'qr_expirado' });
  assert.equal(chave(s), 'desconectado');
});

test('serviço: erros com ação avisam uma vez; 401 apaga contatos; processo que cai volta sozinho e depois pede ação', async () => {
  const { s, eventos, filhos, depois, logs } = servico({ comSessao: true });
  s.start();
  let c = filhos[0];
  c.emit('message', { type: 'status', estado: 'conectado', numero: '5542999990000', nome: 'Emanuele' });
  c.emit('message', { type: 'contatos', lista: [{ jid: '5542999990001@s.whatsapp.net', nomeAgenda: 'Mãe' }] });
  c.emit('message', { type: 'status', estado: 'erro', motivo: 'outra_sessao', codigo: 440 });
  c.emit('message', { type: 'status', estado: 'erro', motivo: 'outra_sessao', codigo: 440 });
  assert.deepEqual(eventos.map((e) => [e.tipo, e.motivo]), [['erroConexao', 'outra_sessao']]);
  assert.deepEqual([chave(s), s.state().visivel.acao.rotulo], ['erro', 'Conectar aqui']);
  s.connect();
  assert.equal(c.posted.at(-1).type, 'start');
  c.emit('message', { type: 'status', estado: 'desligado', motivo: 'sessao_encerrada', codigo: 401 });
  assert.deepEqual(eventos.at(-1), { tipo: 'desconectado', motivo: 'sessao_desconectada' });
  assert.deepEqual(s.state().pessoas, []);
  assert.equal(s.state().visivel.acao.rotulo, 'Escanear de novo');

  // Processo isolado cai com sessão salva: volta sozinho (até 2 vezes).
  s.connect();
  c = filhos.at(-1);
  c.emit('message', { type: 'status', estado: 'conectado', numero: '5542999990000' });
  const total = filhos.length;
  c.emit('exit', 1);
  assert.equal(chave(s), 'conectando');
  assert.equal(s.state().visivel.reconectando, true);
  depois.at(-1).fn();
  assert.equal(filhos.length, total + 1, 'processo novo');
  filhos.at(-1).emit('exit', 1);
  depois.at(-1).fn();
  filhos.at(-1).emit('exit', 1);
  assert.deepEqual([chave(s), s.state().visivel.acao.rotulo], ['erro', 'Tentar de novo']);
  assert.equal(eventos.at(-1).motivo, 'processo_parou');
  assert.ok(logs.some((l) => /processo isolado encerrou/.test(l)));
  assert.ok(logs.every((l) => !/Emanuele|Mãe|5542999990/.test(l)), 'registro sem nomes nem números');
});

test('serviço: processo antigo que encerra depois não derruba o novo', async () => {
  const { s, filhos } = servico();
  s.connect();
  const velho = filhos[0];
  velho.emit('message', { type: 'status', estado: 'conectado', numero: '5542999990000' });
  const saindo = s.disconnect();
  velho.emit('message', { type: 'result', id: velho.posted.find((m) => m.type === 'logout').id, ok: true });
  await saindo;
  assert.equal(velho.posted.at(-1).type, 'stop');
  s.connect();
  const novo = filhos[1];
  velho.emit('exit', 0);
  velho.emit('message', { type: 'status', estado: 'erro', motivo: 'processo_parou' });
  assert.equal(chave(s), 'conectando', 'mensagens e saída do processo antigo são ignoradas');
  novo.emit('message', { type: 'status', estado: 'conectado', numero: '5542999990000' });
  assert.equal(chave(s), 'conectado');
});
