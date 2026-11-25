// Padrão de qualidade artística (docs/ARTE_QUALIDADE.md): checagens automáticas da arte
// oficial dos JOJOcoins e dos ícones da loja. Falha aqui = asset fora do padrão.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { OURO, TAMANHOS, QUADROS_GIRO, PERSPECTIVAS, nivelDetalhe, svgMoeda, svgPilha, svgComposicao } from '../../src/core/moeda-arte.js';
import { iconeItem, IDS_COM_ICONE } from '../../src/core/loja-icones.js';
import { ITENS, NOME_MOEDA, RESERVA_SALDO, larguraValor } from '../../src/core/loja-catalogo.js';
import { LOOKS, OBJETOS } from '../../src/core/loja-arte.js';
import { loadJSON, ROOT } from './helpers.js';

const DIR = path.join(ROOT, 'assets/moeda');
const manifesto = JSON.parse(fs.readFileSync(path.join(DIR, 'manifesto.json'), 'utf8'));

function png(arquivo) {
  const b = fs.readFileSync(path.join(DIR, arquivo));
  assert.equal(b.subarray(1, 4).toString('latin1'), 'PNG', arquivo);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), profundidade: b[24], cor: b[25], buf: b };
}

/** Atributos repetidos numa mesma tag deixam o SVG inválido (o navegador descarta a imagem). */
function atributosRepetidos(svg) {
  const ruins = [];
  for (const [, tag] of svg.matchAll(/<([a-zA-Z][^<>]*?)\/?>/g)) {
    const nomes = [...tag.matchAll(/\s([a-zA-Z:-]+)=["']/g)].map((m) => m[1]);
    const dup = nomes.find((n, i) => nomes.indexOf(n) !== i);
    if (dup) ruins.push(`${dup} em <${tag.slice(0, 40)}…>`);
  }
  return ruins;
}

test('nome oficial da moeda e paleta canônica do ouro', () => {
  assert.equal(NOME_MOEDA, 'JOJOcoins');
  assert.equal(manifesto.nome, 'JOJOcoins');
  assert.deepEqual(manifesto.paleta, { ...OURO }, 'manifesto gerado com a paleta canônica');
  for (const [k, v] of Object.entries(OURO)) assert.match(v, /^#[0-9a-f]{6}$/, k);
  // Ouro: do mais claro ao contorno, a luminância só desce.
  const lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
  const ordem = ['reflexo', 'luz', 'claro', 'medio', 'profundo', 'relevo', 'borda', 'contorno'].map((k) => lum(OURO[k]));
  for (let i = 1; i < ordem.length; i++) assert.ok(ordem[i] < ordem[i - 1], `ordem de luz ${i}`);
});

test('manifesto confere com os arquivos (existência, tamanho e hash)', () => {
  assert.ok(manifesto.arquivos.length >= 50);
  for (const a of manifesto.arquivos) {
    const buf = fs.readFileSync(path.join(DIR, a.arquivo));
    assert.equal(buf.length, a.bytes, a.arquivo);
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16), a.sha256, `${a.arquivo} mudou sem regerar (node scripts/moeda-assets.mjs)`);
  }
  const listados = new Set(manifesto.arquivos.map((a) => a.arquivo));
  for (const f of fs.readdirSync(DIR)) if (f.endsWith('.png')) assert.ok(listados.has(f), `${f} fora do manifesto`);
  for (const f of fs.readdirSync(path.join(DIR, 'svg'))) assert.ok(listados.has(`svg/${f}`), `svg/${f} fora do manifesto`);
});

test('ícone em todos os tamanhos, quadrado, RGBA e com transparência nas bordas', () => {
  assert.deepEqual([...TAMANHOS], [12, 16, 20, 24, 32, 48, 64, 128, 256, 512]);
  for (const px of TAMANHOS) {
    const p = png(`jojocoin-${px}.png`);
    assert.equal(p.w, px); assert.equal(p.h, px);
    assert.equal(p.profundidade, 8); assert.equal(p.cor, 6, `jojocoin-${px} precisa de alfa`);
  }
  // Simplificação óptica: a escala escolhe o nível de detalhe.
  assert.equal(nivelDetalhe(12), 'micro'); assert.equal(nivelDetalhe(24), 'micro');
  assert.equal(nivelDetalhe(32), 'medio'); assert.equal(nivelDetalhe(48), 'medio');
  assert.equal(nivelDetalhe(64), 'mestre'); assert.equal(nivelDetalhe(512), 'mestre');
  const micro = svgMoeda({ px: 16 }), mestre = svgMoeda({ px: 512 });
  assert.ok(micro.length < mestre.length * 0.8, 'microescala mais simples que a mestre');
});

test('giro em atlas de 24 quadros, perspectivas, pilhas e composições', () => {
  assert.equal(QUADROS_GIRO.length, 24);
  for (const px of [32, 64, 128]) {
    const p = png(`giro-${px}.png`);
    assert.equal(p.w, px * QUADROS_GIRO.length); assert.equal(p.h, px); assert.equal(p.cor, 6);
  }
  for (const nome of Object.keys(PERSPECTIVAS)) {
    const p = png(`perspectiva-${nome}-256.png`); assert.equal(p.w, 256);
    assert.ok(fs.existsSync(path.join(DIR, `svg/perspectiva-${nome}.svg`)), nome);
  }
  for (const [n, px] of [[3, 64], [6, 128], [10, 256]]) assert.equal(png(`pilha-${n}-${px}.png`).w, px);
  for (const t of ['pequena', 'media', 'grande', 'grupo', 'monte', 'extraordinaria']) {
    for (const px of [128, 256]) assert.equal(png(`composicao-${t}-${px}.png`).h, px);
    assert.equal(atributosRepetidos(svgComposicao(t, 256)).length, 0, t);
  }
});

test('SVGs da moeda e ícones da loja: válidos, sem atributo repetido, só cores do projeto', () => {
  const svgs = [svgMoeda({ px: 512 }), svgMoeda({ px: 32 }), svgMoeda({ px: 16 }), svgMoeda({ px: 128, giro: 60 }), svgPilha({ n: 6 })];
  for (const f of fs.readdirSync(path.join(DIR, 'svg'))) svgs.push(fs.readFileSync(path.join(DIR, 'svg', f), 'utf8'));
  for (const s of svgs) {
    assert.match(s, /^<svg[\s\S]*<\/svg>\s*$/);
    assert.deepEqual(atributosRepetidos(s), []);
    assert.ok(!/<image|<script|href="http/i.test(s), 'sem imagem externa nem script');
  }
  assert.ok(IDS_COM_ICONE.length >= 50);
  for (const id of IDS_COM_ICONE) {
    const s = iconeItem(id);
    assert.ok(ITENS.some((i) => i.id === id), `ícone sem item: ${id}`);
    assert.match(s, /^<svg[^>]*width="64" height="64"[^>]*viewBox=/, id);
    assert.deepEqual(atributosRepetidos(s), [], id);
    assert.ok(!/<image|<script/i.test(s), id);
  }
});

test('todo item da loja tem representação visual', () => {
  const comIcone = new Set(IDS_COM_ICONE), looks = new Set(Object.keys(LOOKS)), objs = new Set(Object.keys(OBJETOS));
  const sala = loadJSON('assets/animations/jojo.room.json');
  for (const it of ITENS) {
    const e = it.efeito;
    const ok = comIcone.has(it.id) || looks.has(it.id) || objs.has(it.id) || e.look || e.anim || e.decor || e.roteiro || e.recurso;
    assert.ok(ok, `${it.id} (${it.tipo}) sem arte`);
    if (looks.has(it.id)) assert.ok(sala.visuais?.[`lj_${it.id}`], `espaço da janela não medido para lj_${it.id}`);
  }
});

test('valores de 0 a 1.000.000 não pulam o layout', () => {
  const fmt = new Intl.NumberFormat('pt-BR');
  assert.equal(fmt.format(1000000).length, RESERVA_SALDO);
  for (let n = 0; n <= 1e6; n += n < 1000 ? 1 : n < 1e5 ? 7 : 97) {
    assert.equal(larguraValor(n, RESERVA_SALDO), RESERVA_SALDO, `saldo ${n}`);
  }
  assert.equal(larguraValor(1e6, RESERVA_SALDO), RESERVA_SALDO);
  const maxPreco = Math.max(...ITENS.map((i) => i.preco));
  const res = larguraValor(maxPreco);
  for (const it of ITENS) assert.equal(larguraValor(it.preco, res), res, it.id);
  assert.equal(larguraValor(-5), 1); assert.equal(larguraValor(NaN), 1);
});

test('nome da moeda escrito certo em todo o código e documentação', () => {
  const errado = /\b(?:Jojocoins?|JojoCoins?|JOJOCoins?|Jojo coins?|jojo coins?|jojocoins)\b/; // jojocoin-NN.png é nome de arquivo
  // Únicas exceções: a migração que lê saldos gravados com grafias antigas e o teste dela.
  const permitidos = new Set(['src/core/loja.js', 'test/unit/loja.test.js', 'test/unit/moeda-arte.test.js']);
  const ruins = [];
  const varrer = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, e.name);
      if (e.isDirectory()) { if (!['node_modules', 'dist', '.git', 'evidencias'].includes(e.name)) varrer(rel); continue; }
      if (!/\.(m?js|cjs|json|md|html|css)$/.test(e.name) || permitidos.has(rel)) continue;
      const txt = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const m = txt.match(errado);
      if (m) ruins.push(`${rel}: ${m[0]}`);
    }
  };
  for (const d of ['src', 'docs', 'scripts', 'assets/catalog', 'test']) varrer(d);
  for (const f of ['CHANGELOG.md', 'HANDOFF.md', 'ARCHITECTURE.md', 'PRODUCT_SPEC.md']) {
    if (fs.existsSync(path.join(ROOT, f)) && errado.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))) ruins.push(f);
  }
  assert.deepEqual(ruins, []);
});
