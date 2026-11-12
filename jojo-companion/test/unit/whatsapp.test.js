// Mensagens programadas no WhatsApp. Tudo com WhatsApp simulado: nenhum teste
// conecta, envia ou abre sessão de verdade.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEnv, chatAdv } from './helpers.js';
import {
  parseQuando, proximoEnvio, descreverQuando, parseAgendarNatural, parseAgendarComando, buscarContatos, numeroParaJid,
  WhatsAppAgenda, WA_LIMITES,
} from '../../src/core/whatsapp.js';
import { createWhatsAppService, WA_WORKER } from '../../src/main/whatsapp-service.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AGORA = new Date(2026, 9, 30, 15, 0); // sexta-feira, data fixa dos testes
const CONTATOS = [
  { jid: '5542999990001@s.whatsapp.net', nome: 'Mãe', tipo: 'contato' },
  { jid: '5542999990002@s.whatsapp.net', nome: 'Ana Paula', tipo: 'contato' },
  { jid: '5542999990003@s.whatsapp.net', nome: 'Ana Clara', tipo: 'contato' },
  { jid: '120363000000000001@g.us', nome: 'Facul Bioquímica', tipo: 'grupo' },
];

test('quando: dia, hora e repetição em português', () => {
  const q = (t) => parseQuando(t, AGORA);
  assert.deepEqual(q('amanhã às 8h'), { data: '2026-10-31', hora: '08:00', repeticao: { tipo: 'uma', dias: [] } });
  assert.deepEqual(q('hoje 18:30'), { data: '2026-10-30', hora: '18:30', repeticao: { tipo: 'uma', dias: [] } });
  assert.equal(q('às 14h').data, '2026-10-31', 'só a hora e ela já passou hoje: amanhã');
  assert.equal(q('às 16h').data, '2026-10-30');
  assert.equal(q('8 da noite').hora, '20:00');
  assert.equal(q('às 7 da manhã').hora, '07:00');
  assert.equal(q('meio-dia').hora, '12:00');
  assert.deepEqual(q('toda segunda às 7:30'), { data: '2026-11-02', hora: '07:30', repeticao: { tipo: 'semanal', dias: [1] } });
  assert.deepEqual(q('de segunda a sexta às 6h').repeticao, { tipo: 'dias', dias: [1, 2, 3, 4, 5] });
  assert.deepEqual(q('todo dia às 22h').repeticao, { tipo: 'diaria', dias: [] });
  assert.deepEqual(q('toda segunda, quarta e sexta às 7h').repeticao, { tipo: 'dias', dias: [1, 3, 5] });
  assert.equal(q('15/11 às 20h').data, '2026-11-15');
  assert.equal(q('dia 5/1 10h').data, '2027-01-05', 'data já passada este ano vai para o próximo');
  assert.equal(q('segunda 9h').data, '2026-11-02');
  assert.deepEqual(q('amanhã'), { erro: 'sem_hora' });
  assert.equal(q('hoje às 10h').erro, 'passado');
  assert.equal(q('31/2 às 10h').erro, 'data_invalida');
});

test('próximo envio e descrição: uma vez, todo dia, semanal e dias específicos', () => {
  const t = AGORA.getTime();
  const uma = { data: '2026-10-31', hora: '08:00', repeticao: { tipo: 'uma', dias: [] } };
  assert.equal(proximoEnvio(uma, t), new Date(2026, 9, 31, 8).getTime());
  assert.equal(proximoEnvio(uma, new Date(2026, 9, 31, 9).getTime()), null);
  const diaria = { data: '2026-10-30', hora: '08:00', repeticao: { tipo: 'diaria', dias: [] } };
  assert.equal(proximoEnvio(diaria, t), new Date(2026, 9, 31, 8).getTime());
  const uteis = { data: '2026-10-30', hora: '07:00', repeticao: { tipo: 'dias', dias: [1, 2, 3, 4, 5] } };
  assert.equal(proximoEnvio(uteis, t), new Date(2026, 10, 2, 7).getTime(), 'sexta à tarde: próxima é segunda');
  assert.equal(descreverQuando(uma, AGORA), 'amanhã às 08:00');
  assert.equal(descreverQuando(diaria, AGORA), 'todo dia às 08:00');
  assert.equal(descreverQuando(uteis, AGORA), 'de segunda a sexta às 07:00');
  assert.equal(descreverQuando({ ...uma, repeticao: { tipo: 'semanal', dias: [1] } }, AGORA), 'toda segunda às 08:00');
  assert.equal(descreverQuando({ ...uma, data: '2026-11-15' }, AGORA), 'domingo, 15/11 às 08:00');
});

test('pedido em linguagem natural, comando e destino', () => {
  assert.deepEqual(parseAgendarNatural("JoJo, manda 'bom dia' pra minha mãe amanhã às 8h", AGORA),
    { destinoBusca: 'minha mae', texto: 'bom dia', quando: { data: '2026-10-31', hora: '08:00', repeticao: { tipo: 'uma', dias: [] } } });
  const g = parseAgendarNatural('envia pro grupo da facul toda segunda às 7h dizendo bora estudar', AGORA);
  assert.deepEqual([g.destinoBusca, g.texto, g.quando.repeticao.tipo], ['grupo da facul', 'bora estudar', 'semanal']);
  assert.equal(parseAgendarNatural('manda “oi sumida” para Ana Paula hoje 18:30', AGORA).texto, 'oi sumida');
  assert.equal(parseAgendarNatural("manda 'oi' pra Ana", AGORA).quando.erro, 'sem_hora', 'sem hora: o JoJo pergunta depois');
  for (const t of ['manda o relatório pro chefe', 'me manda uma foto', 'oi', 'manda ver no treino', '']) assert.equal(parseAgendarNatural(t, AGORA), null, t);
  assert.deepEqual(parseAgendarComando('Mãe | amanhã às 8h | bom dia, mãe', AGORA).texto, 'bom dia, mãe');
  assert.equal(parseAgendarComando('Mãe | amanhã às 8h', AGORA), null);
  assert.deepEqual(buscarContatos(CONTATOS, 'minha mãe').map((c) => c.nome), ['Mãe']);
  assert.deepEqual(buscarContatos(CONTATOS, 'mamãe').map((c) => c.nome), ['Mãe']);
  assert.deepEqual(buscarContatos(CONTATOS, 'ana').map((c) => c.nome), ['Ana Clara', 'Ana Paula']);
  assert.deepEqual(buscarContatos(CONTATOS, 'grupo da facul').map((c) => c.nome), ['Facul Bioquímica']);
  assert.deepEqual(buscarContatos(CONTATOS, 'zé'), []);
  assert.equal(numeroParaJid('(42) 99999-1234'), '5542999991234@s.whatsapp.net');
  assert.equal(numeroParaJid('+55 42 99999-1234'), '5542999991234@s.whatsapp.net');
  assert.equal(numeroParaJid('1234'), null);
});

function agenda(t0 = AGORA.getTime()) {
  const st = { t: t0, disco: [] };
  const a = new WhatsAppAgenda({ load: () => st.disco, save: (itens) => { st.disco = itens; }, now: () => st.t });
  return { a, st };
}
const MAE = { jid: CONTATOS[0].jid, nome: 'Mãe', tipo: 'contato' };

test('agenda: aviso 5 min antes uma vez, envio na hora, repetição segue, atrasada nunca sai sozinha', () => {
  const { a, st } = agenda();
  const uma = a.add({ destino: MAE, texto: 'bom dia', data: '2026-10-30', hora: '16:00', repeticao: { tipo: 'uma', dias: [] } });
  const todoDia = a.add({ destino: MAE, texto: 'água!', data: '2026-10-30', hora: '15:30', repeticao: { tipo: 'diaria', dias: [] } });
  assert.deepEqual(a.ativas().map((i) => i.id), [todoDia.id, uma.id]);
  st.t = new Date(2026, 9, 30, 15, 26).getTime();
  assert.deepEqual(a.tick().avisar.map((i) => i.id), [todoDia.id]);
  assert.deepEqual(a.tick().avisar, [], 'avisa uma vez só');
  st.t = new Date(2026, 9, 30, 15, 30, 5).getTime();
  assert.deepEqual(a.tick().enviar.map((i) => i.id), [todoDia.id]);
  a.marcarEnviada(todoDia.id);
  assert.equal(a.get(todoDia.id).proximo, new Date(2026, 9, 31, 15, 30).getTime(), 'repetição: amanhã no mesmo horário');
  assert.equal(a.podeEnviar(), 'aguardar', 'intervalo mínimo entre envios');
  st.t += WA_LIMITES.intervaloMs;
  assert.equal(a.podeEnviar(), null);
  // O PC dormiu e passou da hora: vira atrasada e NÃO entra nos envios.
  st.t = new Date(2026, 9, 30, 16, 10).getTime();
  const r = a.tick();
  assert.deepEqual(r.enviar, []);
  assert.deepEqual(r.atrasadas.map((i) => i.id), [uma.id]);
  assert.equal(a.get(uma.id).estado, 'atrasada');
  assert.deepEqual(a.tick().enviar, [], 'continua sem sair até ela decidir');
  a.resolverAtrasada(uma.id, 'enviar');
  assert.deepEqual(a.tick().enviar.map((i) => i.id), [uma.id]);
  a.marcarEnviada(uma.id);
  assert.equal(a.get(uma.id).estado, 'enviada');
  // Descartar a atrasada de uma repetição: segue para a próxima vez.
  st.t = new Date(2026, 9, 31, 18, 0).getTime();
  a.tick();
  assert.equal(a.get(todoDia.id).estado, 'atrasada');
  a.resolverAtrasada(todoDia.id, 'descartar');
  assert.deepEqual([a.get(todoDia.id).estado, a.get(todoDia.id).proximo], ['agendada', new Date(2026, 10, 1, 15, 30).getTime()]);
  // Persistência: o que está no disco volta igual.
  const b = new WhatsAppAgenda({ load: () => st.disco, now: () => st.t });
  assert.deepEqual(b.itens.map((i) => [i.id, i.estado]), a.itens.map((i) => [i.id, i.estado]));
});

test('agenda: falha tenta 3 vezes com 1 min de espera; contato inexistente e limite diário não repetem', () => {
  const { a, st } = agenda();
  const i = a.add({ destino: MAE, texto: 'oi', data: '2026-10-30', hora: '15:10', repeticao: { tipo: 'uma', dias: [] } });
  st.t = new Date(2026, 9, 30, 15, 10).getTime();
  assert.deepEqual(a.marcarFalha(i.id, 'sem_internet'), { item: a.get(i.id), deNovo: true, tentativa: 1 });
  assert.deepEqual(a.tick().enviar, [], 'espera 1 minuto');
  st.t += WA_LIMITES.esperaMs;
  assert.deepEqual(a.tick().enviar.map((x) => x.id), [i.id]);
  assert.equal(a.tick().atrasadas.length, 0, 'em nova tentativa não vira atrasada');
  a.marcarFalha(i.id, 'sem_internet');
  const fim = a.marcarFalha(i.id, 'sem_internet');
  assert.equal(fim.deNovo, false);
  assert.equal(a.get(i.id).estado, 'falhou');
  assert.equal(a.get(i.id).ultimoErro, 'sem_internet');
  const j = a.add({ destino: MAE, texto: 'oi', data: '2026-10-30', hora: '16:00', repeticao: { tipo: 'uma', dias: [] } });
  assert.equal(a.marcarFalha(j.id, 'contato_nao_encontrado').deNovo, false);
  for (let k = 0; k < WA_LIMITES.porDia; k++) a.envios.push(st.t - 1e6 + k);
  assert.equal(a.podeEnviar(), 'limite_diario');
  assert.throws(() => a.add({ destino: MAE, texto: 'oi', data: '2026-10-29', hora: '10:00', repeticao: { tipo: 'uma', dias: [] } }), /passado/);
  assert.throws(() => a.add({ destino: { jid: 'x', nome: 'x' }, texto: 'oi', data: '2026-10-31', hora: '10:00' }), /item_invalido/);
});

// ------------------------------------------------------------------ serviço

function fakeChild() {
  const ls = {};
  const c = { posted: [], on(ev, fn) { (ls[ev] ||= []).push(fn); }, postMessage(m) { c.posted.push(m); c.responder?.(m); }, emit(ev, m) { for (const f of ls[ev] || []) f(m); } };
  return c;
}

function servico({ comSessao = false, responder = null } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-wa-'));
  if (comSessao) { fs.mkdirSync(path.join(dir, 'whatsapp', 'sessao'), { recursive: true }); fs.writeFileSync(path.join(dir, 'whatsapp', 'sessao', 'creds.json'), '{}'); }
  const eventos = [], filhos = [];
  const st = { t: AGORA.getTime() };
  const companion = { whatsappEvento: (ev) => eventos.push(ev), waReescrever: async (t, o) => (o.jeitoJoJo ? `${t}, campeã.` : `${t}!`) };
  const s = createWhatsAppService({
    userData: dir, companion, now: () => st.t,
    spawn: (file) => { assert.equal(file, WA_WORKER); const c = fakeChild(); c.responder = responder && ((m) => responder(c, m)); filhos.push(c); return c; },
    toDataURL: async (t) => `data:image/png;base64,${Buffer.from(t).toString('base64')}`,
    setTimer: () => 1, clearTimer: () => {}, later: () => 0,
  });
  return { s, dir, eventos, filhos, st, companion };
}
const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };

test('serviço: sem sessão salva não liga nada; conectar mostra o QR; conectado avisa e guarda contatos só no PC', async () => {
  const { s, dir, eventos, filhos, companion } = servico();
  s.start();
  assert.equal(filhos.length, 0, 'sem sessão: nenhum processo, nenhuma conexão');
  assert.equal(s.state().conexao.estado, 'desligado');
  s.connect();
  assert.equal(filhos.length, 1);
  const c = filhos[0];
  c.emit('message', { type: 'ready' });
  assert.deepEqual(c.posted[0], { type: 'start', dir: path.join(dir, 'whatsapp', 'sessao') });
  c.emit('message', { type: 'qr', qr: 'codigo-qr' });
  await settle();
  assert.equal(s.state().conexao.estado, 'qr');
  assert.match(s.state().conexao.qr, /^data:image\/png;base64,/);
  c.emit('message', { type: 'status', estado: 'conectado', numero: '5542999990000' });
  assert.deepEqual(eventos.map((e) => e.tipo), ['conectado']);
  assert.equal(s.state().conexao.qr, null);
  c.emit('message', { type: 'contatos', lista: [...CONTATOS.slice(0, 3), { jid: 'lixo', nome: 'x' }, { jid: '1@s.whatsapp.net', nome: '' }] });
  c.emit('message', { type: 'grupos', lista: [CONTATOS[3]] });
  assert.deepEqual(companion.whatsapp.contatos().map((x) => x.nome), ['Mãe', 'Ana Paula', 'Ana Clara', 'Facul Bioquímica']);
  const disco = JSON.parse(fs.readFileSync(path.join(dir, 'whatsapp', 'contatos.json'), 'utf8'));
  assert.equal(disco.contatos.length, 3);
  assert.ok(!JSON.stringify(disco).includes('mensagem'), 'só nomes e números, nada de conversa');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('serviço: aviso antes, envio na hora, nova tentativa em falha, atrasada só pergunta', async () => {
  let resposta = { ok: true };
  const { s, dir, eventos, filhos, st } = servico({ comSessao: true, responder: (c, m) => { if (m.type === 'send') setImmediate(() => c.emit('message', { type: 'result', id: m.id, ...resposta })); } });
  s.start();
  assert.equal(filhos.length, 1, 'sessão salva: reconecta sozinho');
  const c = filhos[0];
  c.emit('message', { type: 'status', estado: 'conectado', numero: '5542999990000' });
  assert.deepEqual(eventos, [], 'reconexão automática ao abrir não fala nada');
  c.emit('message', { type: 'contatos', lista: CONTATOS });
  const r = await s.save({ destino: { jid: CONTATOS[0].jid }, texto: 'bom dia', data: '2026-10-30', hora: '15:10', repeticao: { tipo: 'uma', dias: [] } });
  assert.equal(r.ok, true);
  st.t = new Date(2026, 9, 30, 15, 6).getTime();
  await s.tick();
  assert.deepEqual(eventos.map((e) => e.tipo), ['aviso']);
  st.t = new Date(2026, 9, 30, 15, 10).getTime();
  await s.tick();
  await settle();
  assert.deepEqual(c.posted.filter((m) => m.type === 'send').map((m) => [m.jid, m.texto]), [[CONTATOS[0].jid, 'bom dia']]);
  assert.deepEqual(eventos.map((e) => e.tipo), ['aviso', 'enviada']);
  assert.equal(s.state().historico[0].estado, 'enviada');

  // Falha: tenta de novo depois de 1 minuto.
  resposta = { ok: false, erro: 'sem_internet' };
  await s.save({ destino: { jid: CONTATOS[1].jid }, texto: 'oi', data: '2026-10-30', hora: '15:30', repeticao: { tipo: 'uma', dias: [] } });
  st.t = new Date(2026, 9, 30, 15, 30).getTime();
  await s.tick();
  await settle();
  const erro = eventos.at(-1);
  assert.deepEqual([erro.tipo, erro.motivo, erro.deNovo, erro.tentativa], ['erro', 'sem_internet', true, 1]);
  st.t += 61e3;
  resposta = { ok: true };
  await s.tick();
  await settle();
  assert.equal(eventos.at(-1).tipo, 'enviada');

  // Desconectado: não tenta enviar pelo WhatsApp; registra o motivo.
  c.emit('message', { type: 'status', estado: 'reconectando', motivo: 'sem_internet' });
  await s.save({ destino: { jid: CONTATOS[2].jid }, texto: 'tchau', data: '2026-10-30', hora: '16:00', repeticao: { tipo: 'uma', dias: [] } });
  st.t = new Date(2026, 9, 30, 16, 0).getTime();
  const enviosAntes = c.posted.filter((m) => m.type === 'send').length;
  await s.tick();
  assert.equal(c.posted.filter((m) => m.type === 'send').length, enviosAntes);
  assert.equal(eventos.at(-1).motivo, 'sessao_desconectada');

  // Abriu muito depois: atrasada só gera pergunta.
  st.t = new Date(2026, 9, 30, 20, 0).getTime();
  await s.tick();
  assert.equal(eventos.at(-1).tipo, 'atrasadas');
  assert.equal(s.state().itens.filter((i) => i.estado === 'atrasada').length, 1, 'a que esperava nova tentativa às 16h também vira atrasada');
  assert.equal(c.posted.filter((m) => m.type === 'send').length, enviosAntes, 'nada sai sozinho');
  s.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('serviço: janela cria, edita, apaga; número checado; reescrita; desconectar apaga a sessão e os contatos', async () => {
  const { s, dir, filhos, companion } = servico({ responder: (c, m) => {
    if (m.type === 'check') setImmediate(() => c.emit('message', { type: 'result', id: m.id, ...(m.numero.endsWith('0000') ? { ok: false, erro: 'contato_nao_encontrado' } : { ok: true }) }));
    if (m.type === 'logout') setImmediate(() => c.emit('message', { type: 'result', id: m.id, ok: true }));
  } });
  s.connect();
  const c = filhos[0];
  c.emit('message', { type: 'status', estado: 'conectado' });
  c.emit('message', { type: 'contatos', lista: CONTATOS.slice(0, 3) });
  const base = { texto: 'oi', data: '2026-10-31', hora: '09:00', repeticao: { tipo: 'uma', dias: [] } };
  assert.deepEqual(await s.save({ ...base, destino: { numero: '42 99999-0000' } }), { ok: false, erro: 'contato_nao_encontrado' });
  assert.deepEqual(await s.save({ ...base, destino: { numero: '12' } }), { ok: false, erro: 'numero_invalido' });
  assert.deepEqual(await s.save({ ...base, destino: { jid: 'naoexiste@s.whatsapp.net' } }), { ok: false, erro: 'contato_nao_encontrado' });
  assert.deepEqual(await s.save({ ...base, texto: '  ', destino: { jid: CONTATOS[0].jid } }), { ok: false, erro: 'texto_vazio' });
  assert.deepEqual(await s.save({ ...base, data: '2026-10-29', destino: { jid: CONTATOS[0].jid } }), { ok: false, erro: 'passado' });
  const ok = await s.save({ ...base, destino: { numero: '42 99999-1234', nome: 'Dentista' } });
  assert.equal(ok.ok, true);
  assert.equal(companion.whatsapp.agenda.get(ok.id).destino.jid, '5542999991234@s.whatsapp.net');
  const ed = await s.save({ ...base, id: ok.id, texto: 'oi, confirmo amanhã', hora: '10:00', destino: { jid: CONTATOS[0].jid } });
  assert.equal(ed.id, ok.id);
  assert.deepEqual([s.state().itens[0].texto, s.state().itens[0].hora, s.state().itens[0].quandoTexto], ['oi, confirmo amanhã', '10:00', 'amanhã às 10:00']);
  assert.deepEqual(await s.reescrever('bom dia'), { ok: true, texto: 'bom dia!' });
  assert.deepEqual(await s.reescrever('bom dia', { jeitoJoJo: true }), { ok: true, texto: 'bom dia, campeã.' });
  assert.deepEqual(s.remove(ok.id), { ok: true });
  assert.equal(s.state().itens.length, 0);
  fs.mkdirSync(path.join(dir, 'whatsapp', 'sessao'), { recursive: true });
  await s.disconnect();
  assert.ok(c.posted.some((m) => m.type === 'logout'));
  assert.ok(c.posted.some((m) => m.type === 'stop'));
  assert.equal(fs.existsSync(path.join(dir, 'whatsapp', 'sessao')), false);
  assert.deepEqual(companion.whatsapp.contatos(), []);
  assert.equal(s.state().conexao.estado, 'desligado');
  fs.rmSync(dir, { recursive: true, force: true });
});

// ------------------------------------------------------------------ conversa

function env({ conectado = true, modelo = null } = {}) {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.clock.advance(2000);
  e.companion.reminders.apply({ tipo: 'agua', ativo: false });
  const disco = [];
  const checados = [];
  e.companion.whatsapp = {
    agenda: new WhatsAppAgenda({ load: () => disco, save: () => {} }),
    conexao: () => ({ estado: conectado ? 'conectado' : 'desligado' }),
    contatos: () => CONTATOS,
    checarNumero: async (jid) => { checados.push(jid); return jid.startsWith('5542999990000') ? { ok: false, erro: 'contato_nao_encontrado' } : { ok: true }; },
    mudou: () => {},
  };
  e.companion.dialogue.llm = modelo ? { tarefa: modelo } : null;
  e.companion.enterInteraction('test');
  const said = [];
  const orig = e.companion.say.bind(e.companion);
  e.companion.say = (t, k, o) => { const ok = orig(t, k, o); if (ok) said.push(t); return ok; };
  return { ...e, wa: e.companion.whatsapp, checados, said };
}

test('conversa: pedido natural → confirmação com tudo interpretado → "sim" salva exatamente como ela escreveu', async () => {
  const e = env();
  let r = await chatAdv(e, "JoJo, manda 'bom dia, mãe' pra minha mãe amanhã às 8h");
  assert.equal(r.intent, 'whatsapp');
  assert.match(r.text, /Mãe/);
  assert.match(r.text, /amanhã às 08:00/);
  assert.match(r.text, /“bom dia, mãe”/);
  assert.match(r.text, /"sim"/);
  assert.match(r.text, /reescreve/);
  assert.equal(e.wa.agenda.ativas().length, 0, 'nada é salvo antes de ela confirmar');
  r = await chatAdv(e, 'sim');
  assert.match(r.text, /Agendado|Fechado/);
  const [item] = e.wa.agenda.ativas();
  assert.deepEqual([item.destino.nome, item.texto, item.data, item.hora], ['Mãe', 'bom dia, mãe', '2026-10-31', '08:00']);
  r = await chatAdv(e, '/agendados');
  assert.match(r.text, /1\. Mãe · amanhã às 08:00 · “bom dia, mãe”/);
  r = await chatAdv(e, '/cancelar 1');
  assert.match(r.text, /Mãe/);
  assert.equal(e.wa.agenda.ativas().length, 0);
});

test('conversa: reescrita mostrada para aprovar; "original" mantém a dela; sem modelo, avisa', async () => {
  const pedidos = [];
  const e = env({ modelo: async (p) => { pedidos.push(p); return '{"texto":"Bom dia, mãe! Saudades."}'; } });
  await chatAdv(e, "manda 'bom dia mae' pra minha mãe amanhã às 8h");
  let r = await chatAdv(e, 'reescreve');
  assert.match(r.text, /“Bom dia, mãe! Saudades\.”/);
  assert.match(r.text, /"original"/);
  assert.equal(e.wa.agenda.ativas().length, 0, 'aprovação antes de salvar');
  assert.doesNotMatch(pedidos[0].system, /bombado|You are JoJo/, 'o texto é dela: sem a personalidade do JoJo');
  r = await chatAdv(e, 'original');
  assert.equal(e.wa.agenda.ativas()[0].texto, 'bom dia mae');
  await chatAdv(e, "manda 'oi' pra Facul amanhã às 9h");
  await chatAdv(e, 'reescreve com seu jeito');
  assert.match(pedidos[1].system, /You are JoJo/, 'com o jeito dele só quando ela pede');
  r = await chatAdv(e, 'sim');
  assert.equal(e.wa.agenda.ativas().find((i) => i.destino.tipo === 'grupo').texto, 'Bom dia, mãe! Saudades.');
  const sem = env();
  await chatAdv(sem, "manda 'oi' pra minha mãe amanhã às 9h");
  r = await chatAdv(sem, 'reescreve');
  assert.match(r.text, /motor de conversa não está disponível/);
});

test('conversa: escolhe entre contatos parecidos, pede número se não achar, pergunta a hora que faltou', async () => {
  const e = env();
  let r = await chatAdv(e, "manda 'oi' pra Ana amanhã às 10h");
  assert.match(r.text, /1\. Ana Clara\n2\. Ana Paula/);
  r = await chatAdv(e, '2');
  assert.match(r.text, /Ana Paula, amanhã às 10:00/);
  await chatAdv(e, 'sim');
  r = await chatAdv(e, "manda 'oi' pra Zé amanhã às 10h");
  assert.match(r.text, /Não achei "ze"|Não achei "zé"|número com DDD/i);
  r = await chatAdv(e, '42 99999-0000');
  assert.match(r.text, /Confere/);
  r = await chatAdv(e, 'sim');
  assert.match(r.text, /não tem WhatsApp/, 'número sem WhatsApp não é salvo');
  r = await chatAdv(e, "manda 'oi' pra minha mãe");
  assert.match(r.text, /que horas/i);
  r = await chatAdv(e, 'amanhã às 7h');
  assert.match(r.text, /Mãe, amanhã às 07:00/);
  r = await chatAdv(e, 'não');
  assert.match(r.text, /Nada agendado|Não mando nada/);
  r = await chatAdv(e, "manda 'oi' pra minha mãe hoje às 10h");
  assert.match(r.text, /já passou/);
});

test('conversa: aviso no balão com opção de cancelar; atrasadas perguntam e só saem com "manda"', async () => {
  const e = env();
  const item = e.wa.agenda.add({ destino: MAE, texto: 'bom dia', data: '2026-10-30', hora: '15:04', repeticao: { tipo: 'uma', dias: [] } });
  const aviso = e.companion.whatsappEvento({ tipo: 'aviso', item });
  assert.match(aviso, /pra Mãe: “bom dia”/);
  assert.match(aviso, /cancela/);
  assert.ok(e.said.includes(aviso), 'aparece no balão de status');
  let r = await chatAdv(e, 'cancela');
  assert.match(r.text, /Mãe/);
  assert.equal(e.wa.agenda.get(item.id).estado, 'cancelada');

  assert.match(e.companion.whatsappEvento({ tipo: 'enviada', item }), /(Mandei|Entregue|Saiu) pra Mãe/);
  assert.match(e.companion.whatsappEvento({ tipo: 'erro', item, motivo: 'sem_internet', deNovo: true, tentativa: 1 }), /sem internet.*1 de 3/);
  assert.match(e.companion.whatsappEvento({ tipo: 'erro', item, motivo: 'contato_nao_encontrado', deNovo: false, tentativa: 1 }), /não tem WhatsApp/);
  assert.match(e.companion.whatsappEvento({ tipo: 'desconectado', motivo: 'sessao_desconectada' }), /\/whatsapp/);

  const a1 = e.wa.agenda.add({ destino: MAE, texto: 'um', data: '2026-10-30', hora: '15:20', repeticao: { tipo: 'uma', dias: [] } });
  const a2 = e.wa.agenda.add({ destino: MAE, texto: 'dois', data: '2026-10-30', hora: '15:30', repeticao: { tipo: 'uma', dias: [] } });
  for (const i of [a1, a2]) Object.assign(e.wa.agenda.get(i.id), { estado: 'atrasada' });
  const pergunta = e.companion.whatsappEvento({ tipo: 'atrasadas' });
  assert.match(pergunta, /2 mensagem/);
  assert.match(pergunta, /Eu não mando sozinho/);
  assert.equal(e.companion.conversations.get('whatsapp').status, 'needsInput');
  r = await chatAdv(e, 'descarta 1');
  assert.equal(e.wa.agenda.get(a1.id).estado, 'cancelada');
  r = await chatAdv(e, 'manda');
  assert.equal(e.wa.agenda.get(a2.id).estado, 'agendada');
  assert.equal(e.wa.agenda.get(a2.id).envioManual, true);
});

test('conversa: no Modo Trabalho fica só na conversa; pedido de envio não vira caso de saúde; sem WhatsApp, avisa', async () => {
  const e = env();
  e.companion.startWork({ perfil: 'trabalho' });
  e.said.length = 0;
  const item = e.wa.agenda.add({ destino: MAE, texto: 'oi', data: '2026-10-30', hora: '15:04', repeticao: { tipo: 'uma', dias: [] } });
  const t = e.companion.whatsappEvento({ tipo: 'enviada', item });
  assert.deepEqual(e.said, []);
  assert.ok(e.companion.conversations.current().messages.some((m) => m.text === t));
  e.companion.endWork();
  const r = await chatAdv(e, "manda 'tomou o remédio?' pra minha mãe amanhã às 8h");
  assert.equal(r.intent, 'whatsapp');
  const sem = makeEnv({});
  sem.companion.start();
  sem.clock.advance(2000);
  sem.companion.enterInteraction('test');
  let opened = 0;
  sem.companion.onOpenWhatsapp = () => opened++;
  const s = await chatAdv(sem, '/whatsapp');
  assert.equal(opened, 1, '/whatsapp abre a janela');
  assert.match(s.text, /não está disponível/);
  assert.match((await chatAdv(sem, '/agendados')).text, /não está disponível/);
});

test('janela, registro e privacidade: campos sem "name", sessão local, processo isolado e etapa no tutorial', () => {
  const html = fs.readFileSync(path.join(ROOT, 'src/renderer/whatsapp/index.html'), 'utf8');
  assert.doesNotMatch(html, /\sname="/, 'nada da janela vira configuração do app');
  assert.match(html, /risco de bloqueio do número/);
  const main = fs.readFileSync(path.join(ROOT, 'src/main/main.js'), 'utf8');
  assert.match(main, /utilityProcess\.fork\(file, \[\], \{ serviceName: 'JoJo WhatsApp'/);
  assert.match(main, /ipcMain\.on\('app:whatsapp'/);
  const worker = fs.readFileSync(path.join(ROOT, 'src/main/whatsapp-worker.mjs'), 'utf8');
  assert.match(worker, /markOnlineOnConnect: false/);
  assert.doesNotMatch(worker, /messages\.upsert/, 'não escuta mensagens recebidas');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies['@whiskeysockets/baileys'], '7.0.0-rc14', 'versão fixa');
  assert.equal(pkg.dependencies.qrcode, '1.5.4');
  const tut = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/tutorial/pt-BR.json'), 'utf8'));
  assert.equal(tut.versao, 2, 'conteúdo novo: quem já usava recebe o convite de novo');
  assert.deepEqual(tut.funcoes.find((f) => f.id === 'whatsapp').comandos, ['/whatsapp', '/agendar', '/agendados', '/cancelar']);
});
