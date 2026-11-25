// Mede as animações temáticas de anime (13 estilos × 12 contextos, com cada pacote do estilo)
// e cada pacote parado, e junta em assets/animations/jojo.room.json (anims["cat_anime_*"],
// visuais["ak:<pacote>"] e o envelope "ak:*" para pacotes compostos e de visual), sem refazer
// as outras medidas.   CHROMIUM=/caminho/do/chromium node scripts/anim-room-anime.mjs
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { expandCatalog } from '../src/core/catalog/recipes.js';
import { fullCatalog } from '../src/core/catalog/load.js';
import { CURADOS, POR_TAG, comporPacote } from '../src/core/anime-pacotes.js';

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
// Pacotes medidos: os curados, um composto por regra de característica e um de cada estilo só por gênero.
const pacotes = [
  ...CURADOS.map((p) => ({ ...p, origem: 'curado' })),
  ...POR_TAG.map(([tags], i) => comporPacote({ id: 900000 + i, titulo: tags[0], tags: [{ nome: tags[0], rank: 90 }], generos: [], cor: '#3f7fd4' })),
  ...Array.from({ length: 13 }, (_, i) => comporPacote({ id: 910000 + i, titulo: `g${i}`, tags: [], generos: [], cor: '#3f7fd4' })),
];
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${srv.address().port}/scripts/icon-page/anime.html`);
await page.waitForFunction(() => window.ready);
const anim = expandCatalog(read('assets/animations/jojo.animations.json'), fullCatalog(read));
const so = { ...anim, animations: Object.fromEntries(Object.entries(anim.animations).filter(([n]) => n === 'idle' || n.startsWith('cat_anime_'))) };
const res = await page.evaluate(([r, a, p]) => window.medirAnime(r, a, p), [read('assets/character/jojo.rig.json'), so, pacotes]);
await browser.close(); srv.close();

const roomFile = path.join(ROOT, 'assets/animations/jojo.room.json');
const room = read('assets/animations/jojo.room.json');
const max = (a, b) => ({ l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) });
for (const [nome, m] of Object.entries(res.anims)) room.anims[nome] = m;
room.visuais ||= {};
let env = { l: 0, t: 0, r: 0, b: 0 };
for (const [id, m] of Object.entries(res.pacotes)) {
  if (CURADOS.some((p) => p.id === id)) room.visuais[`ak:${id}`] = m;
  env = max(env, m);
}
// Pacotes de visual (fantasia inteira de um visual que já existe): o maior visual medido também entra no envelope.
for (const [k, v] of Object.entries(room.visuais)) if (!k.startsWith('ak:')) env = max(env, v);
room.visuais['ak:*'] = env;
fs.writeFileSync(roomFile, JSON.stringify(room, null, 1) + '\n');
console.log(`Animes medidos: ${Object.keys(res.anims).length} animações, ${Object.keys(res.pacotes).length} pacotes; envelope ak:* ${JSON.stringify(env)}.`);
