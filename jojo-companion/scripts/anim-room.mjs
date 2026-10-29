// Mede, para cada animação, quanto o desenho (com efeitos) passa da caixa do
// JoJo e grava em assets/animations/jojo.room.json. A janela do overlay cresce
// por esse espaço durante a animação — nada é cortado por "parede invisível".
// Uso: xvfb-run -a npx electron --no-sandbox scripts/anim-room.mjs
import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadFile(path.join(ROOT, 'scripts', 'icon-page', 'room.html'));
  while (!(await win.webContents.executeJavaScript('!!window.ready'))) await new Promise((r) => setTimeout(r, 50));
  const rig = fs.readFileSync(path.join(ROOT, 'assets/character/jojo.rig.json'), 'utf8');
  const anim = fs.readFileSync(path.join(ROOT, 'assets/animations/jojo.animations.json'), 'utf8');
  const res = await win.webContents.executeJavaScript(`window.measure(${rig}, ${anim})`);
  const out = { notes: 'Gerado por scripts/anim-room.mjs: px além da caixa do JoJo (olhando para a direita, escala 1).', ...res };
  fs.writeFileSync(path.join(ROOT, 'assets/animations/jojo.room.json'), JSON.stringify(out, null, 1) + '\n');
  console.log('Espaço por animação salvo:', Object.keys(res.anims).length, 'animações');
  app.quit();
});
