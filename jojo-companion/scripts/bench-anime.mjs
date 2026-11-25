#!/usr/bin/env node
// Comparação de desempenho antes/depois do ecossistema de animes (docs/ANIMES.md).
// 1) Companion de verdade com relógio falso: 10 min em quadros de 16 ms, com 40 animes
//    acompanhados (quando a versão tem o acompanhamento), CPU e heap.
// 2) Montagem do catálogo de animações (início do app): tempo e quantidade.
// Não substitui scripts/measure.mjs (app real no Windows); compara duas versões na mesma máquina.
//   node --expose-gc scripts/bench-anime.mjs [raiz-de-outra-versão] [repetições]
//   BENCH_LONGE=1 → episódios só daqui a 3 dias (custo do acompanhamento parado, sem avisos)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const RAIZ = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const REP = Number(process.argv[3] || 9);
const imp = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);
const read = (rel) => JSON.parse(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));

const { makeEnv } = await imp('test/unit/helpers.js');
const { expandCatalog } = await imp('src/core/catalog/recipes.js');
const { fullCatalog } = await imp('src/core/catalog/load.js');
let Acomp = null, Registro = null;
try { ({ AcompanhamentoAnime: Acomp } = await imp('src/core/anime-acompanhamento.js')); ({ RegistroPacotes: Registro } = await imp('src/core/anime-pacotes.js')); } catch { /* versão sem o ecossistema */ }

function rodada() {
  const e = makeEnv();
  e.companion.start();
  if (Acomp && e.companion.animeConectar) {
    const agora = () => Date.UTC(2026, 10, 25, 12) + e.clock.now();
    const ac = new Acomp({ now: agora, mono: () => e.clock.now() });
    for (let i = 1; i <= 40; i++) ac.seguir({ id: i, titulo: `Anime ${i}`, formato: 'TV', status: 'RELEASING', episodios: 12, duracao: 24, generos: ['Action'], tags: [], proximo: { episodio: 3, quando: agora() + (process.env.BENCH_LONGE ? 3 * 86400e3 : 0) + i * 15 * 60e3 } }, { alertas: ['h1', 'm30', 'm15', 'm5', 'horario'] });
    e.companion.animeConectar({ acomp: ac, registro: new Registro({}) });
  }
  e.clock.advance(5000);
  globalThis.gc?.();
  const heap0 = process.memoryUsage().heapUsed;
  const c0 = process.cpuUsage();
  const quadros = (10 * 60e3) / 16;
  for (let i = 0; i < quadros; i++) {
    const a = i / 90;
    e.env.cursor = { x: 600 + Math.cos(a) * 400, y: 500 + Math.sin(a * 1.3) * 300 };
    e.clock.advance(16);
  }
  const c = process.cpuUsage(c0);
  const ms = (c.user + c.system) / 1000;
  const heap = process.memoryUsage().heapUsed - heap0;
  e.companion.stop?.();
  return { ms, porQuadroUs: (ms * 1000) / quadros, heapMB: heap / 1048576 };
}

function catalogo() {
  const t0 = process.hrtime.bigint();
  const anims = expandCatalog(read('assets/animations/jojo.animations.json'), fullCatalog(read));
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { ms, animacoes: Object.keys(anims.animations).length, jsonMB: JSON.stringify(anims).length / 1048576 };
}

rodada(); // aquecimento do JIT
const r = Array.from({ length: REP }, rodada).sort((a, b) => a.ms - b.ms);
const med = r[Math.floor(r.length / 2)];
const cats = Array.from({ length: 5 }, catalogo).sort((a, b) => a.ms - b.ms);
const cat = cats[2];
console.log(JSON.stringify({ raiz: RAIZ, animes: !!Acomp, repeticoes: REP, medianaMs: +med.ms.toFixed(1), porQuadroUs: +med.porQuadroUs.toFixed(2), heapMB: +med.heapMB.toFixed(2), catalogoMs: +cat.ms.toFixed(1), animacoes: cat.animacoes, animacoesMB: +cat.jsonMB.toFixed(2) }));
