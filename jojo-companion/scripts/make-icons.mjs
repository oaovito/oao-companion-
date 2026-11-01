import { requireWindows } from '../src/main/windows-only.js';
requireWindows();
// Exporta a nova arte original para todos os tamanhos Windows, sem trocar pelo rig antigo.
import { app, nativeImage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'icons');

function ico(pngs) {
  // ICO com entradas PNG (suportado desde o Windows Vista).
  const n = pngs.length;
  const header = Buffer.alloc(6 + 16 * n);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(n, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const o = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, o);
    header.writeUInt8(size >= 256 ? 0 : size, o + 1);
    header.writeUInt8(0, o + 2);
    header.writeUInt8(0, o + 3);
    header.writeUInt16LE(1, o + 4);
    header.writeUInt16LE(32, o + 6);
    header.writeUInt32LE(data.length, o + 8);
    header.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

app.whenReady().then(async () => {
  const source = nativeImage.createFromPath(path.join(OUT, 'app-source.png'));
  if (source.isEmpty()) throw new Error('Arte original do ícone não encontrada.');
  const sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256];
  fs.mkdirSync(OUT, { recursive: true });
  const pngs = {};
  for (const s of sizes) {
    pngs[s] = source.resize({ width: s, height: s, quality: 'best' }).toPNG();
    fs.writeFileSync(path.join(OUT, `app-${s}.png`), pngs[s]);
  }
  fs.writeFileSync(path.join(OUT, 'app.png'), pngs[256]);
  fs.writeFileSync(path.join(OUT, 'tray.png'), pngs[32]);
  fs.writeFileSync(path.join(OUT, 'tray@2x.png'), pngs[64]);
  fs.writeFileSync(path.join(OUT, 'app.ico'), ico([16, 24, 32, 48, 64, 128, 256].map((s) => ({ size: s, data: pngs[s] }))));
  fs.writeFileSync(path.join(OUT, 'tray.ico'), ico([16, 20, 24, 32, 40, 48, 64].map((s) => ({ size: s, data: pngs[s] }))));
  console.log('Ícones gerados em', OUT);
  app.quit();
});
