// Mede o Qwen 3.5 2B no servidor (rodar NO servidor): carregamento, tempo até a
// resposta, tokens por segundo e memória, com números do próprio Ollama.
// Uso: node medir.mjs [modelo]
const OLLAMA = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const modelo = process.argv[2] || 'qwen3.5:2b-q4_K_M';
const perguntas = [
  ['curta', 'Oi JoJo, tudo bem?', { num_ctx: 2048, num_predict: 128 }],
  ['curta', 'Bora treinar hoje?', { num_ctx: 2048, num_predict: 128 }],
  ['técnica', 'Explica o que é potencial zeta em nanopartículas.', { num_ctx: 4096, num_predict: 512 }],
];

async function chat(texto, options) {
  const t0 = Date.now();
  const r = await fetch(`${OLLAMA}/api/chat`, { method: 'POST', body: JSON.stringify({ model: modelo, stream: false, think: false, keep_alive: '15m', options, messages: [{ role: 'user', content: texto }] }) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return { total: Date.now() - t0, carga: (j.load_duration || 0) / 1e6, tokens: j.eval_count || 0, tps: j.eval_count && j.eval_duration ? j.eval_count / (j.eval_duration / 1e9) : 0, entrada: j.prompt_eval_count || 0 };
}

const out = [];
for (const [tipo, texto, options] of perguntas) {
  const m = await chat(texto, options);
  out.push({ tipo, ...m });
  console.log(`${tipo.padEnd(8)} total ${m.total} ms · carga ${m.carga.toFixed(0)} ms · ${m.tokens} tokens · ${m.tps.toFixed(1)} tok/s · entrada ${m.entrada} tokens`);
}
const ps = await (await fetch(`${OLLAMA}/api/ps`)).json();
for (const m of ps.models || []) console.log(`Memória do modelo ${m.name}: ${(m.size / 2 ** 30).toFixed(2)} GiB (VRAM ${(m.size_vram / 2 ** 30).toFixed(2)} GiB)`);
