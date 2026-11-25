// Mede só as animações e os visuais da loja de JOJOcoins (mesma página de
// scripts/icon-page/room.html) e junta o resultado em assets/animations/jojo.room.json,
// sem refazer as outras medidas. A regeneração completa continua sendo
// scripts/anim-room.mjs (Windows), que já inclui a loja.
//   CHROMIUM=/caminho/do/chromium node scripts/anim-room-loja.mjs
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { expandCatalog } from '../src/core/catalog/recipes.js';
import { fullCatalog } from '../src/core/catalog/load.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const exe = process.env.CHROMIUM || ['/opt/pw-browsers/chromium/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'].find((p) => fs.existsSync(p));
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
  let buf; try { buf = fs.readFileSync(f); } catch { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(buf);
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${srv.address().port}/scripts/icon-page/room.html`);
await page.waitForFunction(() => window.ready);
const anim = expandCatalog(read('assets/animations/jojo.animations.json'), fullCatalog(read));
const res = await page.evaluate(([r, a]) => window.measure(r, a, { foods: [] }, null, { so: '^cat_lj' }), [read('assets/character/jojo.rig.json'), anim]);
await browser.close(); srv.close();

const roomFile = path.join(ROOT, 'assets/animations/jojo.room.json');
const room = read('assets/animations/jojo.room.json');
const max = (a, b) => ({ l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) });
for (const [nome, m] of Object.entries(res.anims)) {
  room.anims[nome] = m;
  // Com visual vestido: o que o visual acrescenta ao repouso, somado ao movimento da animação.
  if (room.animsVisual?.idle && room.anims.idle) {
    const extra = Object.fromEntries(['l', 't', 'r', 'b'].map((k) => [k, Math.max(0, room.animsVisual.idle[k] - room.anims.idle[k])]));
    room.animsVisual[nome] = max(m, Object.fromEntries(['l', 't', 'r', 'b'].map((k) => [k, m[k] + extra[k]])));
  }
}
room.visuais = { ...(room.visuais || {}), ...res.visuaisLoja };
fs.writeFileSync(roomFile, JSON.stringify(room, null, 1) + '\n');
console.log(`Loja medida: ${Object.keys(res.anims).length} animações, ${Object.keys(res.visuaisLoja).length} visuais.`);
