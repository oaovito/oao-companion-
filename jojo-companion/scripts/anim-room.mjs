import { requireWindows } from '../src/main/windows-only.js';
requireWindows();
// Mede, para cada animação, quanto o desenho (com efeitos) passa da caixa do
// JoJo e grava em assets/animations/jojo.room.json. A janela do overlay cresce
// por esse espaço durante a animação — nada é cortado por "parede invisível".
import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { expandCatalog } from '../src/core/catalog/recipes.js';
import { fullCatalog } from '../src/core/catalog/load.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadFile(path.join(ROOT, 'scripts', 'icon-page', 'room.html'));
  while (!(await win.webContents.executeJavaScript('!!window.ready'))) await new Promise((r) => setTimeout(r, 50));
  const rig = fs.readFileSync(path.join(ROOT, 'assets/character/jojo.rig.json'), 'utf8');
  const anim = JSON.stringify(expandCatalog(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/animations/jojo.animations.json'), 'utf8')), fullCatalog((rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')))));
  const foods = fs.readFileSync(path.join(ROOT, 'assets/catalog/foods.json'), 'utf8');
  const res = await win.webContents.executeJavaScript(`window.measure(${rig}, ${anim}, ${foods})`);
  const out = { notes: 'Gerado por scripts/anim-room.mjs: px além da caixa do JoJo (olhando para a direita, escala 1).', ...res };
  fs.writeFileSync(path.join(ROOT, 'assets/animations/jojo.room.json'), JSON.stringify(out, null, 1) + '\n');
  if (process.env.GITHUB_ACTIONS) {
    const payload = JSON.stringify(out);
    const evidence = gzipSync(Buffer.from(JSON.stringify({ commit: process.env.GITHUB_SHA, digest: createHash('sha256').update(payload).digest('hex'), room: out }))).toString('base64');
    for (const part of evidence.match(/.{1,4000}/g)) console.log(`JOJO_ROOM_MEASUREMENT:${part}`);
  }
  console.log('Espaço por animação salvo:', Object.keys(res.anims).length, 'animações');
  app.quit();
});
