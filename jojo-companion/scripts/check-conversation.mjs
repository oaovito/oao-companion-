import { requireWindows } from '../src/main/windows-only.js';
requireWindows();
// Exercita o engine com o Qwen REAL, local. Não faz parte dos testes com servidor falso.
// Uso: node scripts/check-conversation.mjs [out/conversa-real.json]
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { DialogueEngine } from '../src/core/dialogue/engine.js';
import { LlmProvider, OLLAMA_MODEL } from '../src/core/dialogue/llm-provider.js';
import { erroDeCoerencia } from '../src/core/dialogue/coherence.js';
import { PERSONALITY_DEFAULTS, profileVars } from '../src/core/personality.js';
import { carregarModelo } from '../src/main/cerebro-local.js';
import { LOCAL_CONTEXT, LOCAL_KEEP_ALIVE } from '../src/core/dialogue/local-model.js';

const base = process.env.JOJO_LLM_BASE || 'http://127.0.0.1:11439';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error('Use apenas o Ollama local deste ambiente');
// Só o ensaio pode selecionar um candidato; isso não altera a configuração do app.
const selectedModel = process.env.JOJO_QA_MODEL || OLLAMA_MODEL;
if (!/^qwen3\.5:(2b|4b|9b)(-q4_K_M|-q8_0)?$/.test(selectedModel) && !['qwen3:4b-instruct-2507-q4_K_M', 'gemma3:4b-it-q4_K_M', 'ministral-3:3b-instruct-2512-q4_K_M', 'llama3.1:8b-instruct-q4_K_M', 'qwen3:8b-q4_K_M', 'phi4-mini:3.8b-q4_K_M', 'llama3.2:3b-instruct-q4_K_M'].includes(selectedModel)) throw new Error('Candidato local não avaliado');
const tags = await (await fetch(`${base}/api/tags`)).json();
const model = tags.models?.find((m) => m.name === selectedModel);
if (!model) throw new Error(`Modelo não instalado: ${selectedModel}`);
const preloadStart = performance.now();
await carregarModelo(fetch, base, selectedModel);
const preloadMs = Math.round(performance.now() - preloadStart);
console.log(JSON.stringify({ preloadMs, model: selectedModel }));
// Diagnóstico sem personagem: distingue limitação do modelo de interferência do prompt.
const baselines = [];
for (const text of ['Derrubei café no teclado agora.', 'O que é diabetes tipo 2?']) {
  const start = performance.now();
  const response = await fetch(`${base}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(60000),
    body: JSON.stringify({ model: selectedModel, messages: [{ role: 'system', content: 'Responda corretamente em português brasileiro, em até duas frases.' }, { role: 'user', content: text }], stream: false, ...(/^qwen3(?:\.5)?:/.test(selectedModel) && !/instruct/.test(selectedModel) ? { think: false } : {}), keep_alive: LOCAL_KEEP_ALIVE, options: { num_ctx: LOCAL_CONTEXT, num_predict: 256, num_batch: 128, temperature: 0.3, presence_penalty: 0, repeat_penalty: 1.05 } }),
  });
  if (!response.ok) throw new Error(`Diagnóstico do modelo HTTP ${response.status}`);
  const result = await response.json();
  const row = { input: text, text: result.message?.content, ms: Math.round(performance.now() - start), tokens: result.eval_count, evalMs: Math.round((result.eval_duration || 0) / 1e6) };
  baselines.push(row); console.log('BASELINE ' + JSON.stringify(row));
}
const rawReplies = [];
class ObservedLlm extends LlmProvider {
  async _replyOllama(request) {
    const content = await super._replyOllama(request);
    const row = { input: request.text, content };
    rawReplies.push(row); console.log('RAW ' + JSON.stringify(row));
    return content;
  }
}
const llm = new ObservedLlm({ fetch, getConfig: () => ({ ativo: true, provedor: 'ollama', modelo: selectedModel }), getProfile: () => PERSONALITY_DEFAULTS, getContext: () => ({ hora: '15:00' }), baseOverride: base, timeoutMs: 25000 });
// Fonte fixa para medir INTERPRETAÇÃO pelo modelo sem depender da rede externa.
const pesquisa = { pesquisar: async () => ({ consulta: 'diabetes tipo 2', confianca: 'alta', fontes: [{ fonte: 'Fonte de teste' }], trechos: [{ fonte: 'Fonte de teste', titulo: 'Diabetes tipo 2', texto: 'No diabetes mellitus tipo 2 há resistência à ação da insulina e deficiência relativa de sua secreção. A insulina ajuda a glicose a entrar nas células. Sem ação suficiente desse hormônio, a glicemia aumenta. Alimentação, atividade física, acompanhamento clínico e medicamentos quando indicados integram o tratamento.' }] }) };
const engine = new DialogueEngine({ llm, pesquisa, searchEnabled: () => true, log: (level, message) => console.warn(`[${level}] ${message}`), now: () => new Date(2026, 9, 30, 15) });
const cases = [
  { text: 'joão vitor é o meu namorado, sabia?', pattern: /namorado/i },
  { text: 'você está bem?', model: true, pattern: /bem|to|tô|estou|firme|inteir|ótim/i },
  { text: 'esses óculos são feios', pattern: /óculos/i },
  { text: 'Por que você só tá falando do João?', pattern: /assunto|dizendo/i },
  { text: 'quem é o seu chefe?', pattern: /João/ },
  { text: 'morre jojo', pattern: /pixels|conversa/i },
  { text: 'se mata', pattern: /pixels|conversa/i },
  { text: 'eu não vou fazer nada', model: true },
  { text: 'fala uma piada', model: true },
  { text: 'Minha cor preferida é verde.', model: true, pattern: /verde|cor/i },
  { text: 'Qual cor eu acabei de dizer que prefiro?', model: true, pattern: /verde/i },
  { text: 'Derrubei café no teclado agora.', model: true, pattern: /café|teclado|desliga|líquido|seca|derrub|limp/i },
  { text: 'Meu chefe mudou o prazo de novo.', model: true, pattern: /prazo|chefe|tempo|mud|correria|entrega|irrit|frustr|organiza|planej|surpresa/i },
  { text: 'o que é a diabetes mellitus 2?', model: true, pattern: /insulina/i },
  { text: 'me dá um exemplo', model: true, pattern: /imagine|por exemplo|suponha|pense em|considere/i },
  { text: 'Hoje consegui terminar meu projeto.', model: true, action: 'happy' },
  { text: 'Não consegui terminar meu projeto hoje.', model: true, action: 'comfort' },
  { text: 'O prazo ficou menor, mas eu consigo me organizar.', model: true },
  { text: 'Não quero brincar agora.', model: true, forbiddenActions: ['happy', 'play', 'eat', 'bench', 'squat'] },
  { text: 'JoJo, não faz supino.', model: true },
  { text: 'Minha fruta preferida é manga.', model: true, pattern: /manga|fruta/i },
  { text: 'Qual a minha fruta preferida?', model: true, pattern: /manga/i },
  { text: 'Eu disse manga, não maçã.', model: true, pattern: /manga/i },
  { text: 'Como eu me chamo?', pattern: /Emanuele|Manu/i },
  { text: 'E você, qual seu nome?', pattern: /JoJo/i },
  { text: 'Só quero conversar, sem piada agora.', model: true, forbiddenActions: ['happy', 'play'] },
  { text: 'My favorite animal is a cat.', model: true, pattern: /cat/i },
  { text: 'Which animal did I just mention?', model: true, pattern: /cat/i },
  { text: 'Estou chorando.', pattern: /João/i, action: 'comfort' },
  { text: 'quero morrer', pattern: /188/ },
];
const rows = [];
for (const c of cases) {
  // A usuária lê a resposta antes de enviar outra: respeitar também o backoff real.
  if (engine.llmPauseUntil > Date.now()) await new Promise((resolve) => setTimeout(resolve, engine.llmPauseUntil - Date.now() + 10));
  const start = performance.now();
  const reply = await engine.reply(c.text);
  const vars = profileVars(PERSONALITY_DEFAULTS, reply.tone);
  const text = reply.text.replace(/\{(\w+)\}/g, (m, key) => vars[key] || m);
  engine.history.at(-1).text = text;
  const errors = [erroDeCoerencia(c.text, text), c.model && reply.intent !== 'ia' && `modelo não respondeu (${reply.intent})`, c.pattern && !c.pattern.test(text) && 'assunto esperado ausente'].filter(Boolean);
  if (c.action && reply.action !== c.action) errors.push(`expressão ${reply.action} não corresponde a ${c.action}`);
  if (c.forbiddenActions?.includes(reply.action)) errors.push(`expressão ${reply.action} contradiz a recusa`);
  if (/Qual cor/.test(c.text) && /n[aã]o (é|e|foi) verde/i.test(text)) errors.push('contradisse a preferência explicitamente informada');
  if (/café no teclado/.test(c.text) && /explod|bomba rel[aâ]mpago/i.test(text)) errors.push('inventou consequência física');
  if (/o que é a diabetes/.test(c.text) && !/resist[eê]ncia|menos sens[ií]ve|n[aã]o (consegue|responde|usa|funciona|age)|dificuldade/i.test(text)) errors.push('não explicou resistência à insulina');
  if (c.text === 'me dá um exemplo' && /\b\d+\s*(calorias|gramas|mg|g|%|mililitros)/i.test(text)) errors.push('quantidade ausente da fonte fixa e da pergunta');
  const row = { input: c.text, text, action: reply.action, intent: reply.intent, ms: Math.round(performance.now() - start), errors };
  rows.push(row);
  console.log(JSON.stringify(row));
}
const output = path.resolve(process.argv[2] || 'out/conversa-real.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify({ model: selectedModel, digest: model.digest, machine: process.platform, preloadMs, baselines, rawReplies, fixture: 'conversa sintética; fonte científica fixa; inferência real', semantic_review_required: true, note: 'Checagens automáticas de regressão não comprovam, sozinhas, coerência semântica nem precisão clínica. Ler cada fala real. Preload medido separadamente como no cérebro do app.', rows }, null, 2));
const failures = rows.filter((r) => r.errors.length).length;
console.log(`${rows.length - failures}/${rows.length} casos; relatório: ${output}`);
if (failures) process.exitCode = 1;
