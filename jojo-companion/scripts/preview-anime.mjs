// Prancha de revisão dos pacotes de anime (PNG): pacotes curados parados e no clímax de cada
// contexto. Usa o Chromium do Playwright (headless).
//   node scripts/preview-anime.mjs [saida.png] [modo: repouso|contextos|<pacoteId>]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { expandCatalog } from '../src/core/catalog/recipes.js';
import { fullCatalog } from '../src/core/catalog/load.js';
import { CURADOS, CONTEXTOS, comporPacote } from '../src/core/anime-pacotes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const exe = process.env.CHROMIUM || ['/opt/pw-browsers/chromium/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'].find((p) => fs.existsSync(p));
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
  let buf; try { buf = fs.readFileSync(f); } catch { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(buf);
});
const saida = process.argv[2] || 'anime-preview.png';
const modo = process.argv[3] || 'repouso';
const compostos = [
  comporPacote({ id: 101, titulo: 'Mecha', tags: [{ nome: 'Mecha', rank: 90 }], generos: ['Mecha'], cor: '#1e88e5' }),
  comporPacote({ id: 102, titulo: 'Idol', tags: [{ nome: 'Idols (Female)', rank: 90 }], generos: ['Music'], cor: '#f06292' }),
  comporPacote({ id: 103, titulo: 'Slice', tags: [], generos: ['Slice of Life'], cor: '#a5d6a7' }),
];
let celulas;
if (modo === 'repouso') celulas = [...CURADOS, ...compostos].map((p) => ({ pacote: p, contexto: null }));
else if (modo === 'contextos') celulas = CURADOS.slice(0, 4).flatMap((p) => CONTEXTOS.map((c) => ({ pacote: p, contexto: c.id, t: 0.66, rotulo: `${p.nome} · ${c.id}` })));
else { const p = CURADOS.find((x) => x.id === modo); celulas = CONTEXTOS.flatMap((c) => [0.3, 0.66].map((t) => ({ pacote: p, contexto: c.id, t, rotulo: `${c.id} ${t}` }))); }
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${srv.address().port}/scripts/icon-page/anime.html`);
await page.waitForFunction(() => window.ready);
const anim = expandCatalog(read('assets/animations/jojo.animations.json'), fullCatalog(read));
const url = await page.evaluate(([r, a, c]) => window.renderPacotes(r, a, c, 6, { w: 240, h: 250, s: 1.15, top: 30 }, '#eef0f3'), [read('assets/character/jojo.rig.json'), anim, celulas]);
fs.writeFileSync(saida, Buffer.from(url.split(',')[1], 'base64'));
await browser.close(); srv.close();
console.log(`${celulas.length} células → ${saida}`);
