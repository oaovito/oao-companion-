import { requireWindows } from '../src/main/windows-only.js';
requireWindows();
// Gera uma folha com quadros de cada animação (revisão visual / documentação).
import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandCatalog } from '../src/core/catalog/recipes.js';
import { fullCatalog } from '../src/core/catalog/load.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv.find((a) => a.endsWith('.png')) || path.join(ROOT, 'docs', 'animation-sheet.png');
const only = process.argv.find((a) => /^[a-zA-Z0-9_,~]+$/.test(a) && a.includes(',')) || null;
const big = process.argv.includes('--big');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadFile(path.join(ROOT, 'scripts', 'icon-page', 'sheet.html'));
  while (!(await win.webContents.executeJavaScript('!!window.ready'))) await new Promise((r) => setTimeout(r, 50));
  const rig = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/character/jojo.rig.json'), 'utf8'));
  const anim = expandCatalog(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/animations/jojo.animations.json'), 'utf8')), fullCatalog((rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'))));
  const names = only ? only.split(',') : Object.keys(anim.animations).filter((n) => n !== 'hidden');
  const url = await win.webContents.executeJavaScript(`window.renderSheet(${JSON.stringify(rig)}, ${JSON.stringify(anim)}, ${JSON.stringify(names)}, ${big ? (process.env.COLS ? Number(process.env.COLS) : 2) : 6}, ${big ? (process.env.COLS ? '{w:300,h:280,s:1.5}' : '{w:560,h:540,s:3}') : '{w:150,h:150,s:0.78}'}, '#ffffff')`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('Folha salva em', out);
  app.quit();
});
