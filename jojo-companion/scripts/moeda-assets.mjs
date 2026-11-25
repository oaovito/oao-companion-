// Gera a biblioteca oficial da JOJOcoin em assets/moeda/ a partir da arte vetorial
// (src/core/moeda-arte.js): SVGs-fonte, PNGs nos tamanhos oficiais (com simplificação
// óptica nos pequenos), perspectivas, atlas de giro, pilhas, composições e o manifesto
// que o teste de qualidade confere. Rodar depois de mudar a arte da moeda:
//   CHROMIUM=/caminho/do/chromium node scripts/moeda-assets.mjs
// (usa playwright-core, já nas dependências de desenvolvimento; nenhuma dependência nova).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { svgMoeda, svgPilha, svgComposicao, moeda3d, nivelDetalhe, PERSPECTIVAS, QUADROS_GIRO, TAMANHOS, OURO } from '../src/core/moeda-arte.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets/moeda');
const exe = process.env.CHROMIUM || ['/opt/pw-browsers/chromium/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'].find((p) => fs.existsSync(p));

fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
const manifesto = { nome: 'JOJOcoins', paleta: OURO, gerado: 'scripts/moeda-assets.mjs', arquivos: [] };
const escreve = (rel, buf, extra = {}) => {
  fs.writeFileSync(path.join(OUT, rel), buf);
  manifesto.arquivos.push({ arquivo: rel, bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16), ...extra });
};

// SVGs-fonte (escaláveis): mestre, perspectivas, pilha e composições.
escreve('svg/jojocoin.svg', Buffer.from(svgMoeda({ px: 512, lod: 'mestre' })), { tipo: 'mestre' });
for (const [nome, p] of Object.entries(PERSPECTIVAS)) escreve(`svg/perspectiva-${nome}.svg`, Buffer.from(svgMoeda({ px: 512, ...p, lod: 'mestre' })), { tipo: 'perspectiva' });
for (const t of ['grupo', 'pequena', 'media', 'grande', 'monte', 'extraordinaria']) escreve(`svg/composicao-${t}.svg`, Buffer.from(svgComposicao(t, 512)), { tipo: 'composicao' });
escreve('svg/pilha.svg', Buffer.from(svgPilha({ n: 6, px: 512 })), { tipo: 'pilha' });

// Rasterização no Chromium (fiel ao SVG, com antisserrilhado e alfa).
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<html><body style="margin:0;background:transparent"></body></html>');
async function png(svg, w, h = w) {
  const url = await page.evaluate(async ([s, W, H]) => {
    const img = new Image();
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(s)))}`;
    await img.decode();
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').drawImage(img, 0, 0, W, H);
    return c.toDataURL('image/png');
  }, [svg, w, h]);
  return Buffer.from(url.split(',')[1], 'base64');
}

// Ícone frontal em todos os tamanhos (cada um com o nível de detalhe do próprio tamanho).
for (const px of TAMANHOS) escreve(`jojocoin-${px}.png`, await png(svgMoeda({ px, lod: nivelDetalhe(px), margem: px <= 24 ? 0.02 : 0.06 }), px), { tipo: 'icone', px, lod: nivelDetalhe(px) });
// Perspectivas em 256 px.
for (const [nome, p] of Object.entries(PERSPECTIVAS)) escreve(`perspectiva-${nome}-256.png`, await png(svgMoeda({ px: 256, ...p }), 256), { tipo: 'perspectiva', px: 256 });
// Atlas do giro: 24 quadros (15° cada) lado a lado, em 32, 64 e 128 px por quadro.
for (const q of [32, 64, 128]) {
  const lod = nivelDetalhe(q);
  const vb = 512 * 1.12 + 512 * 0.085 * 2, o = (vb - 512) / 2;
  const quadros = QUADROS_GIRO.map((g, i) => `<svg x="${i * vb}" y="0" width="${vb}" height="${vb}" viewBox="${-o} ${-o} ${vb} ${vb}">${moeda3d({ giro: g, lod, px: q, id: `g${q}_${i}` })}</svg>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${q * 24}" height="${q}" viewBox="0 0 ${vb * 24} ${vb}">${quadros}</svg>`;
  escreve(`giro-${q}.png`, await png(svg, q * 24, q), { tipo: 'atlasGiro', px: q, quadros: 24 });
}
// Pilhas e composições.
for (const [n, px] of [[3, 64], [6, 128], [10, 256]]) escreve(`pilha-${n}-${px}.png`, await png(svgPilha({ n, px }), px), { tipo: 'pilha', px, n });
for (const t of ['grupo', 'pequena', 'media', 'grande', 'monte', 'extraordinaria']) {
  for (const px of [128, 256]) escreve(`composicao-${t}-${px}.png`, await png(svgComposicao(t, px), px), { tipo: 'composicao', px });
}
await browser.close();

fs.writeFileSync(path.join(OUT, 'manifesto.json'), `${JSON.stringify(manifesto, null, 2)}\n`);
console.log(`${manifesto.arquivos.length} arquivos em assets/moeda/`);
