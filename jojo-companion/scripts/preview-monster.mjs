// Prancha de revisão do Êxtase do Monster Branco (PNG), com o Chromium do Playwright.
//   node scripts/preview-monster.mjs [saida.png] [tempos em segundos, separados por vírgula] [escala]
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
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
  let buf; try { buf = fs.readFileSync(f); } catch { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(buf);
});
const saida = process.argv[2] || 'monster-preview.png';
const tempos = (process.argv[3] || '0.3,1.2,2,3.4,4.9,5.5,6.5,7.9').split(',').map(Number);
const s = Number(process.argv[4] || 1.4);
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${srv.address().port}/scripts/icon-page/monster.html`);
await page.waitForFunction(() => window.ready);
const anim = expandCatalog(read('assets/animations/jojo.animations.json'), fullCatalog(read));
const url = await page.evaluate(([r, a, t, k]) => window.renderMonster(r, a, 'cat_mn01', t, 4, { w: Math.round(250 * k / 1.4), h: Math.round(330 * k / 1.4), s: k, top: Math.round(90 * k / 1.4) }, '#eef0f3'), [read('assets/character/jojo.rig.json'), anim, tempos, s]);
fs.writeFileSync(saida, Buffer.from(url.split(',')[1], 'base64'));
await browser.close(); srv.close();
console.log(`${tempos.length} quadros → ${saida}`);
