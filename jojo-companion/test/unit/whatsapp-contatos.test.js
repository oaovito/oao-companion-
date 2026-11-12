// Contatos do WhatsApp: prioridade do nome, número sempre visível, nomes
// iguais, pessoas separadas de grupos, busca, fotos e confirmação. Tudo com o
// WhatsApp simulado: nada conecta nem envia de verdade.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEnv, chatAdv } from './helpers.js';
import {
  formatarNumero, iniciais, nomeExibicao, numeroDoJid, jidPessoa, ContatosWA, contatoDoDisco, prepararContatos, filtrarContatos, descreverDestino,
} from '../../src/core/whatsapp-contatos.js';
import { WhatsAppAgenda } from '../../src/core/whatsapp.js';
import { createWhatsAppService, WA_FOTOS } from '../../src/main/whatsapp-service.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ler = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const T0 = new Date(2026, 9, 30, 15, 0).getTime();

test('número: formatado com DDI e DDD, sem o número do aparelho; iniciais para o avatar', () => {
  assert.equal(formatarNumero('5542999991234'), '+55 (42) 99999-1234');
  assert.equal(formatarNumero('554233331234'), '+55 (42) 3333-1234', 'fixo');
  assert.equal(formatarNumero('14155550101'), '+1 415 555 0101');
  assert.equal(formatarNumero('351912345678'), '+351 91 234 5678');
  assert.equal(numeroDoJid('5542999991234:12@s.whatsapp.net'), '5542999991234');
  assert.equal(numeroDoJid('123@lid'), null);
  assert.equal(jidPessoa('5542999991234:3@s.whatsapp.net'), '5542999991234@s.whatsapp.net');
  assert.equal(jidPessoa('1@s.whatsapp.net'), null, 'número curto demais');
  assert.deepEqual(['Ana Paula', 'Mãe', 'joão', '🌸 Maria', '', '+55 42'].map(iniciais), ['AP', 'MÃ', 'JO', 'MA', '#', '#']);
});

test('nome: agenda do celular > nome do perfil > número formatado', () => {
  assert.equal(nomeExibicao({ nomeAgenda: 'Mãe', nomePerfil: 'Maria 🌸', numero: '5542999990001' }), 'Mãe');
  assert.equal(nomeExibicao({ nomeAgenda: '', nomePerfil: 'Maria 🌸', numero: '5542999990001' }), 'Maria 🌸');
  assert.equal(nomeExibicao({ jid: '5542999990001@s.whatsapp.net' }), '+55 (42) 99999-0001');
  assert.equal(nomeExibicao({ nomeAgenda: '  ‮Ana\u0007  ' }), 'Ana', 'sem caracteres de controle nem inversão de texto');
});

test('contatos do WhatsApp: evento parcial não apaga o nome salvo; LID ganha número; a própria conta fica fora', () => {
  const c = new ContatosWA({ eu: '5542999990000@s.whatsapp.net' });
  c.aplicar({ id: '5542999990001@s.whatsapp.net', name: 'Mãe' });
  c.aplicar({ id: '5542999990001@s.whatsapp.net', notify: 'Maria 🌸' });
  c.aplicar({ id: '5542999990001@s.whatsapp.net', name: '' });
  c.aplicar({ id: '5542999990000@s.whatsapp.net', name: 'Eu' });
  c.aplicar({ id: '777@lid', name: 'Ana Clara', phoneNumber: '5542999990003@s.whatsapp.net' });
  c.aplicar({ id: '888@lid', notify: 'Rafa' });
  c.aplicar({ id: '999@lid', name: 'Sem número ainda' });
  c.mapear('888@lid', '5542999990004:5@s.whatsapp.net');
  c.aplicar({ id: '777@lid', notify: 'Clarinha' });
  c.aplicar({ id: '5542999990005@s.whatsapp.net', verifiedName: 'Academia Força' });
  const porJid = Object.fromEntries(c.lista().map((x) => [x.jid, [x.nomeAgenda, x.nomePerfil]]));
  assert.deepEqual(porJid, {
    '5542999990001@s.whatsapp.net': ['Mãe', 'Maria 🌸'],
    '5542999990003@s.whatsapp.net': ['Ana Clara', 'Clarinha'],
    '5542999990004@s.whatsapp.net': ['', 'Rafa'],
    '5542999990005@s.whatsapp.net': ['', 'Academia Força'],
  });
  assert.deepEqual(c.lidsSemNumero(), ['999@lid'], 'sem número não aparece até o WhatsApp mandar o par');
  assert.equal(c.definirEu('5542999990001:2@s.whatsapp.net'), true);
  assert.ok(!c.lista().some((x) => x.jid === '5542999990001@s.whatsapp.net'));
});

test('lista da tela: nome em destaque e número sempre; nomes iguais marcados; pessoas separadas de grupos; busca', () => {
  const contatos = [
    { jid: '5542999990002@s.whatsapp.net', nomeAgenda: 'Ana' },
    { jid: '5541988880002@s.whatsapp.net', nomeAgenda: 'ana', nomePerfil: 'Ana Souza' },
    { jid: '5542999990001@s.whatsapp.net', nomeAgenda: 'Mãe', nomePerfil: 'Maria 🌸' },
    { jid: '5511977776666@s.whatsapp.net' },
  ].map((c) => contatoDoDisco(c, 'contato'));
  const grupos = [{ jid: '1203@g.us', nome: 'Facul Bioquímica', participantes: 38 }, { jid: '1204@g.us', nome: 'Ana', participantes: 3 }].map((g) => contatoDoDisco(g, 'grupo'));
  const { pessoas, grupos: gs } = prepararContatos(contatos, grupos);
  assert.deepEqual(pessoas.map((p) => [p.nome, p.numeroFormatado, p.homonimo]), [
    ['+55 (11) 97777-6666', '+55 (11) 97777-6666', false],
    ['ana', '+55 (41) 98888-0002', true],
    ['Ana', '+55 (42) 99999-0002', true],
    ['Mãe', '+55 (42) 99999-0001', false],
  ], 'ordem alfabética; nome igual desempata pelo número');
  const anas = pessoas.filter((p) => p.homonimo);
  assert.equal(anas.length, 2);
  assert.notEqual(anas[0].numeroFormatado, anas[1].numeroFormatado, 'mesmo nome: números diferentes à vista');
  assert.ok(pessoas.every((p) => p.tipo === 'contato' && p.numeroFormatado), 'toda pessoa com número');
  assert.equal(pessoas.find((p) => !p.nomeAgenda && !p.nomePerfil).semNome, true);
  assert.deepEqual(gs.map((g) => [g.nome, g.tipo, g.participantes]), [['Ana', 'grupo', 3], ['Facul Bioquímica', 'grupo', 38]]);
  assert.ok(!pessoas.some((p) => p.tipo === 'grupo') && !gs.some((g) => g.numeroFormatado), 'pessoas e grupos nunca misturados');
  assert.deepEqual(filtrarContatos(pessoas, 'mae').map((p) => p.nome), ['Mãe'], 'sem acento');
  assert.deepEqual(filtrarContatos(pessoas, 'maria').map((p) => p.nome), ['Mãe'], 'acha pelo nome do perfil');
  assert.deepEqual(filtrarContatos(pessoas, '98888').map((p) => p.numeroFormatado), ['+55 (41) 98888-0002'], 'acha pelo número');
  assert.deepEqual(filtrarContatos(pessoas, '(42) 99999-0001').map((p) => p.nome), ['Mãe'], 'número com máscara');
  assert.equal(filtrarContatos(pessoas, '').length, 4);
  assert.deepEqual(filtrarContatos(gs, 'facul').map((g) => g.nome), ['Facul Bioquímica']);
  assert.equal(descreverDestino({ jid: '5542999990002@s.whatsapp.net', tipo: 'contato' }), '+55 (42) 99999-0002');
  assert.equal(descreverDestino({ jid: '1203@g.us', tipo: 'grupo' }), 'grupo do WhatsApp');
  assert.equal(contatoDoDisco({ jid: '5542999990002@s.whatsapp.net', nome: 'Ana' }, 'contato').nomeAgenda, 'Ana', 'formato antigo do disco continua valendo');
});

// ------------------------------------------------------------- serviço/fotos

function fakeChild(responder) {
  const ls = {};
  const c = { posted: [], on(ev, fn) { (ls[ev] ||= []).push(fn); }, postMessage(m) { c.posted.push(m); responder?.(c, m); }, emit(ev, m) { for (const f of ls[ev] || []) f(m); } };
  return c;
}

test('serviço: contatos guardados só com nomes e números; fotos sob demanda, em cache local, apagadas ao desconectar', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-wa-cont-'));
  const st = { t: T0 };
  const filhos = [], avisos = [];
  const fotoDe = { '5542999990001@s.whatsapp.net': 'data:image/jpeg;base64,/9j/2Q==' };
  const responder = (c, m) => {
    if (m.type === 'foto') setImmediate(() => c.emit('message', { type: 'result', id: m.id, ok: true, foto: fotoDe[m.jid] || null }));
    if (m.type === 'logout') setImmediate(() => c.emit('message', { type: 'result', id: m.id, ok: true }));
  };
  const s = createWhatsAppService({
    userData: dir, companion: {}, now: () => st.t, spawn: () => { const c = fakeChild(responder); filhos.push(c); return c; },
    toDataURL: async (t) => t, setTimer: () => 1, clearTimer: () => {}, later: (fn, ms) => setTimeout(fn, Math.min(ms, 50)), requestTimeoutMs: 5e3, notifyFotos: (f) => avisos.push(f),
  });
  s.connect();
  const c = filhos[0];
  c.emit('message', { type: 'status', estado: 'conectado', numero: '5542999990000', nome: 'Emanuele' });
  c.emit('message', { type: 'contatos', lista: [
    { jid: '5542999990001@s.whatsapp.net', numero: '5542999990001', nomeAgenda: 'Mãe', nomePerfil: 'Maria 🌸' },
    { jid: '5542999990002@s.whatsapp.net', numero: '5542999990002', nomeAgenda: '', nomePerfil: '' },
    { jid: '120@g.us', nomeAgenda: 'grupo no lugar errado' },
  ] });
  c.emit('message', { type: 'grupos', lista: [{ jid: '1203@g.us', nome: 'Facul', participantes: 38 }] });
  const estado = s.state();
  assert.deepEqual(estado.pessoas.map((p) => [p.nome, p.numeroFormatado]), [['+55 (42) 99999-0002', '+55 (42) 99999-0002'], ['Mãe', '+55 (42) 99999-0001']]);
  assert.deepEqual(estado.grupos.map((g) => [g.nome, g.participantes]), [['Facul', 38]]);
  const disco = JSON.parse(fs.readFileSync(path.join(dir, 'whatsapp', 'contatos.json'), 'utf8'));
  assert.deepEqual(Object.keys(disco.contatos[0]).sort(), ['jid', 'nomeAgenda', 'nomePerfil', 'tipo'], 'só nomes e números');

  const jids = ['5542999990001@s.whatsapp.net', '5542999990002@s.whatsapp.net'];
  assert.deepEqual(s.fotos(jids), {}, 'nada em cache: pede ao WhatsApp em fila');
  for (let i = 0; i < 200 && avisos.length < 2; i++) await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(avisos, [{ [jids[0]]: fotoDe[jids[0]] }, { [jids[1]]: null }]);
  assert.equal(c.posted.filter((m) => m.type === 'foto').length, 2);
  assert.deepEqual(s.fotos(jids), { [jids[0]]: fotoDe[jids[0]], [jids[1]]: null }, 'do cache, sem pedir de novo');
  assert.equal(c.posted.filter((m) => m.type === 'foto').length, 2);
  st.t += WA_FOTOS.validadeMs + 1;
  s.fotos([jids[0]]);
  for (let i = 0; i < 200 && c.posted.filter((m) => m.type === 'foto').length < 3; i++) await new Promise((r) => setTimeout(r, 5));
  assert.equal(c.posted.filter((m) => m.type === 'foto').length, 3, 'foto velha (7 dias) é renovada');
  assert.deepEqual(s.fotos(['lixo', 'x@lid']), {}, 'só identificadores do WhatsApp');
  for (let i = 0; i < 200 && avisos.length < 3; i++) await new Promise((r) => setTimeout(r, 5));
  await s.disconnect();
  assert.equal(fs.existsSync(path.join(dir, 'whatsapp', 'fotos')), false);
  assert.deepEqual(s.state().pessoas, []);
  fs.rmSync(dir, { recursive: true, force: true });
});

// ------------------------------------------------------------------ conversa

function env(contatos) {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.clock.advance(2000);
  e.companion.reminders.apply({ tipo: 'agua', ativo: false });
  e.companion.whatsapp = {
    agenda: new WhatsAppAgenda({ load: () => [], save: () => {} }),
    conexao: () => ({ estado: 'conectado' }),
    contatos: () => contatos,
    checarNumero: async () => ({ ok: true }),
    mudou: () => {},
  };
  e.companion.dialogue.llm = null;
  e.companion.enterInteraction('test');
  return e;
}

test('conversa: confirmação mostra o número; nomes iguais aparecem com o número; grupo diz que é grupo', async () => {
  const e = env([
    { jid: '5542999990002@s.whatsapp.net', nome: 'Ana', tipo: 'contato' },
    { jid: '5541988880002@s.whatsapp.net', nome: 'Ana', tipo: 'contato' },
    { jid: '120363000000000001@g.us', nome: 'Facul Bioquímica', tipo: 'grupo' },
  ]);
  let r = await chatAdv(e, "manda 'oi' pra Ana amanhã às 10h");
  assert.match(r.text, /1\. Ana · \+55 \(42\) 99999-0002\n2\. Ana · \+55 \(41\) 98888-0002/);
  r = await chatAdv(e, '2');
  assert.match(r.text, /Ana, amanhã às 10:00/);
  assert.match(r.text, /Contato: \+55 \(41\) 98888-0002/);
  r = await chatAdv(e, 'sim');
  assert.equal(e.companion.whatsapp.agenda.ativas()[0].destino.jid, '5541988880002@s.whatsapp.net', 'agenda para a Ana certa');
  r = await chatAdv(e, "manda 'bora' pro grupo da facul amanhã às 9h");
  assert.match(r.text, /Contato: grupo do WhatsApp/);
  r = await chatAdv(e, "manda 'oi' pra 42 99999-1234 amanhã às 9h");
  assert.match(r.text, /Contato: \+55 \(42\) 99999-1234/);
});

test('janela: tela de contatos com busca, Pessoas e Grupos separados, foto ou iniciais e confirmação antes de salvar', () => {
  const html = ler('src/renderer/whatsapp/index.html');
  const js = ler('src/renderer/whatsapp/whatsapp.js');
  assert.match(html, /data-tela="contatos">Contatos/);
  assert.match(html, /id="buscaContato"[^>]*placeholder="Buscar por nome ou número"/);
  assert.match(html, /id="filtroPessoas"[^>]*>Pessoas<[\s\S]*id="filtroGrupos"[^>]*>Grupos</);
  assert.match(html, /id="tela-confirmar"[\s\S]*id="confirmarPara"[\s\S]*Confirmar e agendar[\s\S]*Voltar e corrigir/);
  assert.doesNotMatch(html, /<datalist/, 'sem lista só de nomes: homônimos não se confundem');
  assert.match(js, /el\('span', 'numero', c\.numeroFormatado/, 'número logo abaixo do nome');
  assert.match(js, /'selo-tipo', 'Grupo'/);
  assert.match(js, /'selo-igual', 'mesmo nome'/);
  assert.match(js, /api\.fotos\(/);
  assert.match(js, /a\.textContent = c\.iniciais/, 'sem foto: iniciais');
  assert.match(js, /mostrar\('confirmar'\)/);
  assert.match(js, /api\.save\(/);
  assert.ok(js.indexOf("mostrar('confirmar')") < js.indexOf('api.save('), 'salva só depois da confirmação');
});
