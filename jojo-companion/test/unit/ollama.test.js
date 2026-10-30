// Motor da conversa: Qwen 3.5 2B no Ollama de outro computador, atrás de um portão com chave.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { LlmProvider, OLLAMA_MODEL, readNdjson, isTechnical, normalizeServer } from '../../src/core/dialogue/llm-provider.js';
import { sanitize, migrate } from '../../src/core/settings-schema.js';
import { criarPortao, chaveOk } from '../../servidor/jojo-gateway.mjs';

const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${srv.address().port}`)));

function fakeOllama({ modelos = [OLLAMA_MODEL], resposta = '{"texto":"Supino primeiro, conversa depois.","acao":"judge","tom":"serio"}', atraso = 0 } = {}) {
  const pedidos = [];
  const srv = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      pedidos.push({ url: req.url, body: b ? JSON.parse(b) : null, auth: req.headers.authorization });
      if (req.url === '/api/tags') return res.end(JSON.stringify({ models: modelos.map((name) => ({ name })) }));
      setTimeout(() => {
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.write(`${JSON.stringify({ message: { content: resposta.slice(0, 10) } })}\n`);
        res.end(`${JSON.stringify({ message: { content: resposta.slice(10) }, done: true })}\n`);
      }, atraso);
    });
  });
  return { srv, pedidos };
}

function provider(cfg) {
  return new LlmProvider({ fetch: (u, o) => fetch(u, o), getConfig: () => ({ ativo: true, provedor: 'ollama', ...cfg }), getProfile: () => ({ nomeSerio: 'Emanuele' }), getExamples: () => ['Mais uma série.'], timeoutMs: 3000 });
}

test('sem servidor configurado: conversa online indisponível, com motivo (nada de resposta fingida)', async () => {
  const p = provider({ servidor: '' });
  assert.equal(await p.isAvailable(), false);
  assert.equal(p.unavailableReason(), 'sem servidor configurado');
  assert.equal(normalizeServer('http://100.64.0.5:11435/'), 'http://100.64.0.5:11435');
  assert.equal(normalizeServer('ftp://x'), '');
});

test('Qwen 3.5 2B: confere o modelo, chama /api/chat com streaming, contexto curto e chave', async () => {
  const { srv, pedidos } = fakeOllama();
  const base = await listen(srv);
  try {
    const p = provider({ servidor: base, chave: 'segredo' });
    const r = await p.reply({ text: 'oi jojo', history: [{ role: 'user', text: 'oi jojo' }] });
    assert.equal(r.text, 'Supino primeiro, conversa depois.');
    assert.equal(r.action, 'judge');
    const chat = pedidos.find((x) => x.url === '/api/chat');
    assert.equal(chat.body.model, OLLAMA_MODEL);
    assert.equal(chat.body.stream, true);
    assert.deepEqual([chat.body.options.num_ctx, chat.body.options.num_predict], [2048, 128]);
    assert.equal(chat.auth, 'Bearer segredo');
    // Pergunta técnica: mais contexto e resposta maior.
    await p.reply({ text: 'explica o potencial zeta das nanopartículas', history: [] });
    const tec = pedidos.filter((x) => x.url === '/api/chat').pop();
    assert.deepEqual([tec.body.options.num_ctx, tec.body.options.num_predict], [4096, 512]);
  } finally {
    srv.close();
  }
});

test('modelo: aceita outra quantização do mesmo Qwen 3.5 2B; nunca outro tamanho', async () => {
  let f = fakeOllama({ modelos: ['qwen3.5:2b'] });
  let base = await listen(f.srv);
  try {
    await provider({ servidor: base }).reply({ text: 'oi', history: [] });
    assert.equal(f.pedidos.find((x) => x.url === '/api/chat').body.model, 'qwen3.5:2b');
  } finally {
    f.srv.close();
  }
  f = fakeOllama({ modelos: ['qwen3.5:9b', 'llama3:8b'] });
  base = await listen(f.srv);
  try {
    await assert.rejects(provider({ servidor: base }).reply({ text: 'oi', history: [] }), /não está no servidor/);
    assert.equal(f.pedidos.filter((x) => x.url === '/api/chat').length, 0, 'não usa outro modelo');
  } finally {
    f.srv.close();
  }
});

test('streaming: junta os pedaços NDJSON; erro do Ollama vira erro', async () => {
  const res = { text: async () => '{"message":{"content":"Ma"}}\n{"message":{"content":"nu"}}\n{"done":true}\n' };
  const pedacos = [];
  assert.equal(await readNdjson(res, (p) => pedacos.push(p)), 'Manu');
  assert.deepEqual(pedacos, ['Ma', 'nu']);
  await assert.rejects(readNdjson({ text: async () => '{"error":"model not found"}\n' }), /model not found/);
  assert.equal(isTechnical('como interpretar meu hemograma'), true);
  assert.equal(isTechnical('oi tudo bem'), false);
});

test('configurações: todo mundo migra para o Qwen no servidor; endereço validado', () => {
  const { settings } = sanitize(migrate({ version: 2, iaProvedor: 'pollinations', iaModelo: 'openai' }));
  assert.equal(settings.iaProvedor, 'ollama');
  assert.equal(settings.iaModelo, '');
  assert.equal(sanitize({ iaServidor: 'http://100.64.0.5:11435/' }).settings.iaServidor, 'http://100.64.0.5:11435');
  assert.equal(sanitize({ iaServidor: 'javascript:alert(1)' }).settings.iaServidor, '');
});

test('portão do servidor: sem chave não entra, só as rotas do JoJo, uma conversa por vez', async () => {
  const { srv: oll, pedidos } = fakeOllama({ atraso: 150 });
  const ollBase = await listen(oll);
  const portao = criarPortao({ chave: 'abc123', ollama: ollBase, log: () => {} });
  const base = await listen(portao);
  try {
    assert.equal((await fetch(`${base}/api/tags`)).status, 401);
    assert.equal((await fetch(`${base}/api/tags`, { headers: { Authorization: 'Bearer errada' } })).status, 401);
    assert.equal((await fetch(`${base}/api/pull`, { method: 'POST', headers: { Authorization: 'Bearer abc123' }, body: '{}' })).status, 404, 'não deixa baixar/apagar modelos');
    assert.equal((await fetch(`${base}/api/tags`, { headers: { Authorization: 'Bearer abc123' } })).status, 200);
    const corpo = JSON.stringify({ model: OLLAMA_MODEL, messages: [] });
    const h = { Authorization: 'Bearer abc123' };
    const t0 = Date.now();
    await Promise.all([fetch(`${base}/api/chat`, { method: 'POST', headers: h, body: corpo }).then((r) => r.text()), fetch(`${base}/api/chat`, { method: 'POST', headers: h, body: corpo }).then((r) => r.text())]);
    assert.ok(Date.now() - t0 >= 290, 'em fila, uma por vez');
    assert.equal(pedidos.filter((x) => x.url === '/api/chat').length, 2);
    assert.equal(chaveOk('Bearer abc123', 'abc123'), true);
    assert.equal(chaveOk('abc123', 'abc123'), false);
  } finally {
    portao.close();
    oll.close();
  }
});
