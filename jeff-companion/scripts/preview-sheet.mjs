// Gera uma folha com quadros de cada animação (revisão visual / documentação).
// Uso: xvfb-run -a npx electron scripts/preview-sheet.mjs [saida.png] [anim1,anim2,...]
import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv.find((a) => a.endsWith('.png')) || path.join(ROOT, 'docs', 'animation-sheet.png');
const only = process.argv.find((a) => /^[a-zA-Z,]+$/.test(a) && a.includes(',')) || null;
const big = process.argv.includes('--big');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadFile(path.join(ROOT, 'scripts', 'icon-page', 'sheet.html'));
  while (!(await win.webContents.executeJavaScript('!!window.ready'))) await new Promise((r) => setTimeout(r, 50));
  const rig = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/character/jeff.rig.json'), 'utf8'));
  const anim = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/animations/jeff.animations.json'), 'utf8'));
  const names = only ? only.split(',') : Object.keys(anim.animations).filter((n) => n !== 'hidden');
  const url = await win.webContents.executeJavaScript(`window.renderSheet(${JSON.stringify(rig)}, ${JSON.stringify(anim)}, ${JSON.stringify(names)}, ${big ? (process.env.COLS ? Number(process.env.COLS) : 2) : 6}, ${big ? (process.env.COLS ? '{w:300,h:280,s:1.5}' : '{w:560,h:540,s:3}') : '{w:150,h:150,s:0.78}'}, '#ffffff')`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('Folha salva em', out);
  app.quit();
});
