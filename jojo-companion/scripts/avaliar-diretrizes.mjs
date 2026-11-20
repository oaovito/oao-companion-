import { requireWindows } from '../src/main/windows-only.js';
requireWindows();
// Bateria das diretrizes do JoJo com inferência REAL, local (Ollama do ambiente).
// Mede duas notas: a do MODELO (resposta crua que passa sem cair na fala programada) e a do
// APP (o que ela lê no balão). Também grava os pares aprovados (candidatos ao LoRA, etapa 2),
// que ainda precisam de leitura humana antes de qualquer treino.
// Uso: node scripts/avaliar-diretrizes.mjs [out/diretrizes.json]
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { DialogueEngine } from '../src/core/dialogue/engine.js';
import { LlmProvider, OLLAMA_MODEL, parseLlmReply } from '../src/core/dialogue/llm-provider.js';
import { PERSONALITY_DEFAULTS, profileVars } from '../src/core/personality.js';
import { carregarModelo } from '../src/main/cerebro-local.js';
import { CASOS, avaliarResposta, resumoBateria, parDeTreino } from '../src/core/dialogue/diretrizes-bateria.js';

const base = process.env.JOJO_LLM_BASE || 'http://127.0.0.1:11439';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error('Use apenas o Ollama local deste ambiente');
const modelo = process.env.JOJO_QA_MODEL || OLLAMA_MODEL;
const tags = await (await fetch(`${base}/api/tags`)).json();
const instalado = tags.models?.find((m) => m.name === modelo);
if (!instalado) throw new Error(`Modelo não instalado: ${modelo}`);
await carregarModelo(fetch, base, modelo);

// Guarda o prompt de sistema e a resposta crua de cada chamada (para nota do modelo e dataset).
let ultima = null;
const fetchObservado = async (url, init) => {
  const res = await fetch(url, init);
  if (String(url).endsWith('/api/chat') && init?.body) {
    const corpo = JSON.parse(init.body);
    const clone = res.clone();
    let conteudo = '';
    try { conteudo = (await clone.json()).message?.content || ''; } catch { /* streaming: lido pelo provedor */ }
    ultima = { sistema: corpo.messages?.[0]?.content || '', conteudo };
  }
  return res;
};
class LlmObservado extends LlmProvider {
  async _replyOllama(request) {
    const content = await super._replyOllama(request);
    if (ultima) ultima.conteudo = content;
    return content;
  }
}
const llm = new LlmObservado({ fetch: fetchObservado, getConfig: () => ({ ativo: true, provedor: 'ollama', modelo }), getProfile: () => PERSONALITY_DEFAULTS, getContext: () => ({ hora: '15:00' }), baseOverride: base, timeoutMs: 25000 });
await llm.aquecer();

const linhas = [];
const pares = [];
for (const caso of CASOS) {
  // Cada caso começa do zero, só com o histórico que ele mesmo traz.
  const engine = new DialogueEngine({ llm, log: () => {}, now: () => new Date(2026, 10, 19, 15) });
  for (const h of caso.historico || []) engine.history.push({ role: h.role === 'user' ? 'user' : 'jojo', text: h.text });
  if (engine.llmPauseUntil > Date.now()) await new Promise((r) => setTimeout(r, engine.llmPauseUntil - Date.now() + 10));
  ultima = null;
  const t0 = performance.now();
  const reply = await engine.reply(caso.entrada);
  const vars = profileVars(PERSONALITY_DEFAULTS, reply.tone);
  const final = reply.text.replace(/\{(\w+)\}/g, (m, k) => vars[k] || m);
  const crua = ultima?.conteudo ? parseLlmReply(ultima.conteudo)?.text || '' : '';
  const falhasApp = avaliarResposta(caso, final);
  const falhasModelo = ultima ? avaliarResposta(caso, crua) : ['modelo não foi chamado (resposta fixa do app)'];
  const linha = { id: caso.id, categoria: caso.categoria, entrada: caso.entrada, final, crua, intent: reply.intent, ms: Math.round(performance.now() - t0), falhas: falhasApp, falhasModelo };
  linhas.push(linha);
  console.log(JSON.stringify(linha));
  if (ultima && !falhasModelo.length && !falhasApp.length) pares.push(parDeTreino(ultima.sistema, caso, crua));
}
const app = resumoBateria(linhas);
const doModelo = resumoBateria(linhas.filter((l) => !l.falhasModelo[0]?.startsWith('modelo não foi chamado')).map((l) => ({ ...l, falhas: l.falhasModelo })));
const saida = path.resolve(process.argv[2] || 'out/diretrizes.json');
fs.mkdirSync(path.dirname(saida), { recursive: true });
fs.writeFileSync(saida, JSON.stringify({ modelo, digest: instalado.digest, app, modelo_cru: doModelo, semantic_review_required: true, nota: 'Checagem automática não comprova coerência sozinha; ler cada fala. Pares do .jsonl só vão para treino depois da leitura humana.', linhas }, null, 2));
fs.writeFileSync(saida.replace(/\.json$/, '-pares.jsonl'), pares.map((p) => JSON.stringify(p)).join('\n') + (pares.length ? '\n' : ''));
console.log(`app: ${app.passou}/${app.total} (${app.taxa}%) · modelo cru: ${doModelo.passou}/${doModelo.total} (${doModelo.taxa}%) · relatório: ${saida}`);
if (app.passou < app.total) process.exitCode = 1;
