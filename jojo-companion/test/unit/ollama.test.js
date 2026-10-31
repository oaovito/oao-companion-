// Motor da conversa: Qwen 3.5 2B no Ollama do próprio PC, instalado sozinho e
// ligado só enquanto ela conversa.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LlmProvider, OLLAMA_MODEL, readNdjson, isTechnical } from '../../src/core/dialogue/llm-provider.js';
import { sanitize, migrate } from '../../src/core/settings-schema.js';
import { criarCerebroLocal, escolherModelo, ambienteOllama, PORTA, MODELO } from '../../src/main/cerebro-local.js';

const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${srv.address().port}`)));

function fakeOllama({ modelos = [OLLAMA_MODEL], resposta = '{"texto":"Supino primeiro, conversa depois.","acao":"judge","tom":"serio"}' } = {}) {
  const pedidos = [];
  const srv = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      pedidos.push({ url: req.url, body: b ? JSON.parse(b) : null });
      if (req.url === '/api/tags') return res.end(JSON.stringify({ models: modelos.map((name) => ({ name })) }));
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.write(`${JSON.stringify({ message: { content: resposta.slice(0, 10) } })}\n`);
      res.end(`${JSON.stringify({ message: { content: resposta.slice(10) }, done: true })}\n`);
    });
  });
  return { srv, pedidos };
}

function provider(brain, cfg = {}) {
  return new LlmProvider({ fetch: (u, o) => fetch(u, o), getConfig: () => ({ ativo: true, provedor: 'ollama', ...cfg }), getProfile: () => ({ nomeSerio: 'Emanuele' }), getExamples: () => ['Mais uma série.'], timeoutMs: 3000, brain });
}

test('Qwen 3.5 2B local: /api/chat com streaming, contexto curto, e mantém o motor ligado enquanto conversa', async () => {
  const { srv, pedidos } = fakeOllama();
  const base = await listen(srv);
  let usos = 0;
  const brain = { pronto: () => true, preparar: async () => ({ base, modelo: OLLAMA_MODEL }), usar: () => usos++, estado: { fase: 'pronto' } };
  try {
    const p = provider(brain);
    assert.equal(await p.isAvailable(), true);
    const r = await p.reply({ text: 'oi jojo', history: [{ role: 'user', text: 'oi jojo' }] });
    assert.equal(r.text, 'Supino primeiro, conversa depois.');
    const chat = pedidos.find((x) => x.url === '/api/chat');
    assert.equal(chat.body.model, OLLAMA_MODEL);
    assert.equal(chat.body.stream, true);
    assert.deepEqual([chat.body.options.num_ctx, chat.body.options.num_predict], [4096, 256]);
    assert.equal(usos, 1);
    await p.reply({ text: 'explica o potencial zeta das nanopartículas', history: [] });
    const tec = pedidos.filter((x) => x.url === '/api/chat').pop();
    assert.deepEqual([tec.body.options.num_ctx, tec.body.options.num_predict], [4096, 512]);
  } finally {
    srv.close();
  }
});

test('motor ainda não pronto: prepara em segundo plano e, enquanto isso, a conversa online fica indisponível (sem fingir)', async () => {
  let preparou = 0;
  const brain = { pronto: () => false, preparar: async () => (preparou++, { base: 'x', modelo: MODELO }), usar() {}, estado: { fase: 'baixandoModelo', progresso: 40 } };
  const p = provider(brain);
  assert.equal(await p.isAvailable(), false);
  assert.equal(preparou, 1);
  assert.equal(p.unavailableReason(), 'baixandoModelo');
  assert.equal(provider(null).unavailableReason(), 'sem motor');
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

test('configurações: todo mundo migra para o Qwen deste PC', () => {
  const { settings } = sanitize(migrate({ version: 2, iaProvedor: 'pollinations', iaModelo: 'openai' }));
  assert.equal(settings.iaProvedor, 'ollama');
  assert.equal(settings.iaModelo, '');
  assert.equal('iaServidor' in settings, false);
});

test('cérebro local: modelo certo (nunca outro tamanho) e Ollama enxuto, só em 127.0.0.1', () => {
  assert.equal(escolherModelo(['llama3:8b', 'qwen3.5:2b-q4_K_M']), 'qwen3.5:2b-q4_K_M');
  assert.equal(escolherModelo(['qwen3.5:2b']), 'qwen3.5:2b');
  assert.equal(escolherModelo(['qwen3.5:9b', 'qwen3.5:0.8b']), null);
  const env = ambienteOllama('C:/x');
  assert.equal(env.OLLAMA_HOST, `127.0.0.1:${PORTA}`);
  assert.equal(env.OLLAMA_MAX_LOADED_MODELS, '1');
  assert.equal(env.OLLAMA_NUM_PARALLEL, '1');
  assert.equal(env.OLLAMA_NO_CLOUD, '1');
});

test('cérebro local: primeira vez baixa e instala o Ollama, liga com prioridade baixa e baixa o Qwen; depois desliga ocioso', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-cerebro-'));
  const chamadas = [];
  let modeloBaixado = false;
  let servindo = false;
  const linhas = (objs) => ({ ok: true, body: null, text: async () => objs.map((o) => JSON.stringify(o)).join('\n') });
  const fakeFetch = async (url, opts = {}) => {
    chamadas.push(url);
    if (url.includes('11434')) throw new Error('sem ollama próprio');
    if (url.endsWith('.zip')) {
      const dados = new Uint8Array([1, 2, 3, 4]);
      let lido = false;
      return { ok: true, headers: { get: () => '4' }, body: { getReader: () => ({ read: async () => (lido ? { done: true } : ((lido = true), { value: dados, done: false })) }) } };
    }
    if (url.endsWith('/api/tags')) {
      if (!servindo) throw new Error('não ligado');
      return { ok: true, json: async () => ({ models: modeloBaixado ? [{ name: MODELO }] : [] }) };
    }
    if (url.endsWith('/api/pull')) {
      modeloBaixado = true;
      return linhas([{ status: 'pulling', total: 100, completed: 50 }, { status: 'success' }]);
    }
    throw new Error(`url inesperada ${url}`);
  };
  let prioridadeBaixa = null;
  let mortos = 0;
  const fases = [];
  const brain = criarCerebroLocal({
    dir,
    platform: 'win32',
    fetch: fakeFetch,
    fs: { ...fs.promises, existsSync: fs.existsSync },
    extract: async (zip, dest) => {
      fs.mkdirSync(dest, { recursive: true });
      fs.writeFileSync(path.join(dest, 'ollama.exe'), 'exe');
    },
    spawn: (cmd, args, opts) => {
      assert.equal(args[0], 'serve');
      assert.equal(opts.env.OLLAMA_HOST, `127.0.0.1:${PORTA}`);
      servindo = true;
      return { pid: 4321, on() {}, kill: () => mortos++ };
    },
    setLowPriority: (pid) => (prioridadeBaixa = pid),
    onStatus: (e) => fases.push(e.fase),
  });
  const r = await brain.preparar();
  assert.equal(r.modelo, MODELO);
  assert.equal(r.base, `http://127.0.0.1:${PORTA}`);
  assert.equal(prioridadeBaixa, 4321);
  for (const f of ['baixando', 'instalando', 'ligando', 'baixandoModelo', 'pronto']) assert.ok(fases.includes(f), f);
  assert.ok(!fs.existsSync(path.join(dir, 'ollama.zip')), 'zip apagado depois de instalar');
  // Segunda vez: nada a baixar.
  const n = chamadas.filter((u) => u.endsWith('.zip')).length;
  await brain.preparar();
  assert.equal(chamadas.filter((u) => u.endsWith('.zip')).length, n);
  brain.parar('ocioso');
  assert.equal(mortos, 1);
  assert.equal(brain.estado.fase, 'parado');
});

test('cérebro local: sem espaço em disco não baixa nada e avisa', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-cerebro-'));
  const brain = criarCerebroLocal({ dir, platform: 'win32', fetch: async () => { throw new Error('offline'); }, fs: { ...fs.promises, existsSync: fs.existsSync }, freeBytes: async () => 1e9, spawn() {}, extract() {} });
  await assert.rejects(brain.preparar(), /pouco espaço/);
  assert.equal(brain.estado.fase, 'erro');
});
