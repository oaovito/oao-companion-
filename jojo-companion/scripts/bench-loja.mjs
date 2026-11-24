#!/usr/bin/env node
// Comparação de desempenho da lógica do JoJo antes/depois da loja (docs/LOJA.md).
// Roda o Companion de verdade com relógio falso: 10 min simulados em quadros de 16 ms com
// o cursor rondando, e mede CPU (process.cpuUsage) e heap. Não substitui scripts/measure.mjs
// (app real no Windows); serve para comparar duas versões na mesma máquina.
//   node scripts/bench-loja.mjs [raiz-de-outra-versão] [repetições]
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const RAIZ = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const REP = Number(process.argv[3] || 15);
const imp = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);

const { makeEnv } = await imp('test/unit/helpers.js');
let Loja = null;
try { ({ Loja } = await imp('src/core/loja.js')); } catch { /* versão sem loja */ }

function rodada() {
  const e = makeEnv();
  if (Loja && e.companion.lojaConectar) {
    const loja = new Loja({ dia: () => '2027-01-04' });
    loja.st.saldo = 5000;
    for (const id of ['lv07', 'la01', 'ob01', 'dc01']) loja.comprar({ txId: id, id, nivel: 99 });
    e.companion.lojaConectar(loja);
  }
  e.companion.start();
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

rodada(); // aquecimento do JIT
const r = Array.from({ length: REP }, rodada).sort((a, b) => a.ms - b.ms);
const med = r[Math.floor(r.length / 2)];
console.log(JSON.stringify({ raiz: RAIZ, loja: !!Loja, repeticoes: REP, minimoMs: +r[0].ms.toFixed(1), medianaMs: +med.ms.toFixed(1), porQuadroUs: +med.porQuadroUs.toFixed(2), heapMB: +med.heapMB.toFixed(2), todasMs: r.map((x) => +x.ms.toFixed(1)) }));
