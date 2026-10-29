// Verifica a pesquisa na internet contra as fontes reais (Wikipédia/DuckDuckGo).
// Uso: node scripts/check-web-search.mjs ["pergunta"]
import { WebSearch } from '../src/core/dialogue/web-search.js';

const questions = process.argv[2] ? [process.argv[2]] : ['o que é fotossíntese?', 'qual a capital da Austrália?', 'quem foi Santos Dumont?'];
const ws = new WebSearch({ fetch, userAgent: 'JeffCompanion/check (projeto de fã)', log: (lvl, msg) => console.error(`[${lvl}] ${msg}`) });
let fail = 0;
for (const q of questions) {
  const r = await ws.search(q).catch((e) => ({ error: e.message }));
  console.log(JSON.stringify({ pergunta: q, ...r }));
  if (!r || r.error || !r.extract) fail++;
}
process.exit(fail ? 1 : 0);
