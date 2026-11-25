// Arte dos pacotes temáticos de anime (25/11/2026). Tudo é desenhado por cima do JoJo numa
// CÓPIA do rig (o arquivo do personagem não muda), como os visuais, a loja e os virais: a
// anatomia, as proporções e o rosto dele ficam intactos; o anime entra como roupa, acessório,
// adereço na mão, efeito de energia e cenário. Ele continua sendo o JoJo.
//
// Três camadas, todas ligadas por canal (nada aparece com o canal desligado):
// 1. Kit de fantasia (o mesmo dos memes BR e dos shows): cada opção de tronco, mangas, parte
//    de baixo, pés, cabeça, rosto, pescoço e mão vira peças com cor por CHAVE de paleta
//    (akA, akB, akC e tons), canal `akk_<slot>_<opção>`.
// 2. Acessórios próprios de anime (grimório, espada antimagia, bandana ninja, venda, haori,
//    capa, equipamento de manobra, bola de vôlei, cajado, baú…), canal `ak_<id>`.
// 3. Efeitos (aura, chakra, energia amaldiçoada, círculo mágico, domínio, ondas, painel de
//    sistema, texto dramático, fumaça, impacto), canal `akfx_<id>` com cores akF1/akF2.
//
// As cores de cada pacote chegam por `paletaAnime(pacote)` (o renderizador consulta
// `extra` antes da paleta do rig), então centenas de pacotes usam as MESMAS peças: o
// catálogo cresce sem crescer a memória do overlay. Puro: overlay, Central e testes.
import { SLOTS, fantasiaInteira } from './memes-br.js';

const r1 = (n) => Math.round(n * 10) / 10;
const circ = (cx, cy, r) => `M${r1(cx - r)},${r1(cy)} a${r1(r)},${r1(r)} 0 1,0 ${r1(2 * r)},0 a${r1(r)},${r1(r)} 0 1,0 ${r1(-2 * r)},0 Z`;
const elip = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} a${r1(rx)},${r1(ry)} 0 1,0 ${r1(2 * rx)},0 a${r1(rx)},${r1(ry)} 0 1,0 ${r1(-2 * rx)},0 Z`;
const furo = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} a${r1(rx)},${r1(ry)} 0 1,1 ${r1(2 * rx)},0 a${r1(rx)},${r1(ry)} 0 1,1 ${r1(-2 * rx)},0 Z`;
const anel = (cx, cy, r, w) => `${elip(cx, cy, r, r)} ${furo(cx, cy, r - w, r - w)}`;
const poly = (pts) => `M${pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' L')} Z`;
const rect = (x, y, w, h) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
const estrela = (cx, cy, r, n = 5, k = 0.45, rot = -Math.PI / 2) => poly(Array.from({ length: n * 2 }, (_, i) => {
  const a = rot + (i * Math.PI) / n;
  const rr = i % 2 ? r * k : r;
  return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
}));
// Trevo de quatro folhas (grimório): quatro corações girados em volta do centro.
const trevo = (cx, cy, s) => [0, 1, 2, 3].map((i) => {
  const a = (i * Math.PI) / 2 - Math.PI / 4;
  const ox = cx + Math.cos(a) * s * 0.9, oy = cy + Math.sin(a) * s * 0.9;
  return circ(ox, oy, s * 0.62);
}).join(' ');
const CABECA = { pivot: [90, 86], rot: 'headRot' };
const H = (extra = {}) => ({ ...CABECA, ...extra });
const MAO_D = { parent: 'foreR' };
const MAO_E = { parent: 'foreL' };
// Objeto na mão direita que gira em torno da mão (canal akObjRot) e se ergue (akObjY).
const OBJ = (extra = {}) => ({ ...MAO_D, pivot: [150, 150], rot: 'akObjRot', dy: 'akObjY', ...extra });

// ------------------------------------------------------------------ paleta por chave

/** Tons derivados (o kit escurece a cor principal em alguns detalhes). */
export const TONS = Object.freeze([0.6, 0.72, 0.82, 0.85, 0.86]);
const SENT = { A: '#a10001', B: '#b20002', C: '#c30003' };
const sombraHex = (c, k = 0.72) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(c.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
const CHAVE_DO_HEX = new Map();
for (const [k, hex] of Object.entries(SENT)) {
  CHAVE_DO_HEX.set(hex, `ak${k}`);
  for (const t of TONS) CHAVE_DO_HEX.set(sombraHex(hex, t), `ak${k}${Math.round(t * 100)}`);
}

/** Paleta do pacote: chaves akA/akB/akC (e tons), akD (metal/escuro) e akF1/akF2 (efeitos). */
export function paletaAnime(cores) {
  const c = { a: '#37474f', b: '#eceff1', c: '#ffd54f', d: '#263238', f1: '#ffd54f', f2: '#ff6f00', ...(cores || {}) };
  const out = { akA: c.a, akB: c.b, akC: c.c, akD: c.d, akF1: c.f1, akF2: c.f2 };
  for (const [k, base] of [['A', c.a], ['B', c.b], ['C', c.c]]) for (const t of TONS) out[`ak${k}${Math.round(t * 100)}`] = sombraHex(base, t);
  out.akDclaro = misturar(c.d, '#ffffff', 0.35);
  return out;
}
export function misturar(a, b, t) {
  const p = (h, i) => parseInt(h.slice(i, i + 2), 16);
  return '#' + [1, 3, 5].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, '0')).join('');
}

// ------------------------------------------------------------------ 1. kit por chave

/** Canal de uma opção do kit. */
export const canalKit = (slot, opcao) => `akk_${slot}_${opcao}`;

/** Opções do kit que podem ir num pacote (as mesmas dos memes BR e dos shows). */
export const KIT = Object.freeze({
  tronco: Object.keys(SLOTS.TRONCOS),
  baixo: Object.keys(SLOTS.BAIXOS),
  pes: Object.keys(SLOTS.PES),
  cabeca: Object.keys(SLOTS.CABECAS),
  rosto: Object.keys(SLOTS.ROSTOS),
  pescoco: Object.keys(SLOTS.PESCOCOS),
  mao: Object.keys(SLOTS.MAOS),
  mangas: ['curta', 'longa'],
  estampa: ['listras', 'listrasV', 'bolinhas', 'flores', 'xadrez', 'estrelas', 'losangos', 'faixa', 'botoes', 'numero10', 'coracao', 'brilhos', 'penas', 'folhas'],
});

/** Peças do kit com cor por chave: uma fantasia mínima por opção, com o hex sentinela trocado pela chave. */
function pecasDoKit() {
  const out = [];
  const add = (slot, opcao, partes) => {
    for (const [group, id, fill, path, extra] of partes) {
      out.push([group, `akk_${slot}_${opcao}_${id}`, CHAVE_DO_HEX.get(fill) || fill, path, { ...(extra || {}), showIf: canalKit(slot, opcao) }]);
    }
  };
  const cores = { a: SENT.A, b: SENT.B, g: SENT.C };
  const vazio = { tronco: 'tanga', baixo: 'nenhum', pes: 'nenhum', cabeca: 'nenhuma', rosto: [], pescoco: 'nenhum', mao: 'nenhum' };
  const so = (f) => fantasiaInteira({ ...vazio, ...f }, cores);
  const semTanga = (partes) => { const t = new Set(so({}).map((p) => p[1])); return partes.filter((p) => !t.has(p[1])); };
  for (const o of KIT.tronco) add('tronco', o, so({ tronco: o }).filter((p) => p[0] !== 'costumeHand'));
  add('mangas', 'curta', so({ mangas: 'curta' }).filter((p) => p[0] === 'costumeHand'));
  add('mangas', 'longa', so({ mangas: 'longa' }).filter((p) => p[0] === 'costumeHand'));
  for (const o of KIT.baixo) if (o !== 'nenhum') add('baixo', o, semTanga(so({ baixo: o })));
  for (const o of KIT.pes) if (o !== 'descalco') add('pes', o, semTanga(so({ pes: o })));
  for (const o of KIT.cabeca) if (o !== 'nenhuma') add('cabeca', o, semTanga(so({ cabeca: o })));
  for (const o of KIT.rosto) if (o !== 'nenhum') add('rosto', o, semTanga(so({ rosto: [o] })));
  for (const o of KIT.pescoco) if (o !== 'nenhum') add('pescoco', o, semTanga(so({ pescoco: o })));
  for (const o of KIT.mao) if (o !== 'nenhum') add('mao', o, semTanga(so({ mao: o })));
  for (const o of KIT.estampa) add('estampa', o, semTanga(so({ tronco: 'camiseta', estampa: o })).filter((p) => p[1] === 'estampa'));
  return out;
}

// ------------------------------------------------------------------ 2. acessórios de anime

/**
 * Acessórios: [grupo, id, cor, path, opções]. Grupos próprios:
 * animeAtras (atrás do corpo, contorno), animeCorpo (sobre o tronco, contorno),
 * animeDetalhe (detalhes sem contorno), animeCabeca (na cabeça, contorno),
 * animeCabecaDet (detalhes da cabeça), animeMao (na mão, contorno), animeMaoDet, animeChao.
 * Cada acessório tem um "papel" (onde fica) para o compositor não misturar dois na mesma parte.
 */
export const ACESSORIOS = {
  // --- cabeça
  chapeuPalha: { papel: 'cabeca', nome: 'Chapéu de palha', partes: [
    ['animeAtras', 'cordao', '#8d6e63', 'M58,22 C60,46 72,76 86,92 L88,90 C76,74 64,46 62,22 Z', H()],
    ['animeCabeca', 'aba', '#e9c46a', elip(90, 20, 60, 10), H()],
    ['animeCabeca', 'copa', '#e9c46a', 'M60,20 C58,-8 122,-8 120,20 C108,24 72,24 60,20 Z', H()],
    ['animeCabeca', 'fita', '#c62828', 'M60,10 C72,14 108,14 120,10 L121,18 C108,23 72,23 59,18 Z', H()],
    ['animeCabecaDet', 'trama', '#c9a04a', [elip(90, 22, 50, 1.2), elip(90, 26, 40, 1), 'M66,4 L70,4 L72,9 L68,9 Z M110,4 L114,4 L112,9 L108,9 Z'].join(' '), H()],
  ] },
  bandanaNinja: { papel: 'cabeca', nome: 'Bandana ninja', partes: [
    ['animeAtras', 'pontas', 'akA', 'M134,30 C146,36 156,44 162,56 L154,58 C150,48 142,42 132,38 Z M134,34 C142,44 146,54 146,66 L139,64 C139,54 136,46 130,40 Z', H()],
    ['animeCabeca', 'faixa', 'akA', 'M42,30 C60,20 120,20 138,30 L138,42 C120,32 60,32 42,42 Z', H()],
    ['animeCabeca', 'placa', '#b0bec5', 'M68,22 L112,22 Q116,22 116,26 L116,36 Q116,40 112,40 L68,40 Q64,40 64,36 L64,26 Q64,22 68,22 Z', H()],
    ['animeCabecaDet', 'brilho', '#eceff1', 'M68,24 L84,24 L80,27 L67,27 Z', H()],
    ['animeCabecaDet', 'simbolo', '#37474f', `${anel(88, 31, 5.5, 1.6)} ${poly([[92, 27], [101, 24], [98, 29.5]])} ${circ(66.5, 31, 1)} ${circ(113.5, 31, 1)}`, H()],
  ] },
  vendaOlhos: { papel: 'rosto', nome: 'Venda nos olhos', partes: [
    ['animeCabeca', 'venda', '#1d1f2b', 'M40,36 C60,30 120,30 140,36 L140,52 C120,46 60,46 40,52 Z', H()],
    ['animeCabecaDet', 'dobra', '#30344a', 'M48,44 C66,40 114,40 132,44 L132,46 C114,42 66,42 48,46 Z', H()],
  ] },
  cabeloBranco: { papel: 'cabeca', nome: 'Cabelo branco espetado', partes: [
    ['animeCabeca', 'cabelo', '#f1f3f7', 'M42,30 C38,14 44,4 56,0 L54,-10 L68,-4 L72,-18 L84,-8 L92,-22 L100,-8 L112,-18 L114,-4 L128,-10 L126,2 C138,6 142,18 138,30 C120,20 60,20 42,30 Z', H()],
    ['animeCabecaDet', 'mecha', '#c9d1e0', 'M64,4 L74,-6 L76,8 Z M96,-4 L104,-12 L104,6 Z M118,4 L124,-2 L124,12 Z', H()],
  ] },
  cabeloSaiyajin: { papel: 'cabeca', nome: 'Cabelo dourado de energia', partes: [
    ['animeCabeca', 'cabelo', 'akF1', 'M40,34 L26,10 L48,14 L40,-14 L64,0 L66,-30 L84,-8 L94,-38 L104,-8 L122,-30 L122,0 L146,-14 L136,14 L156,10 L140,34 C118,22 62,22 40,34 Z', H()],
    ['animeCabecaDet', 'brilho', '#fff59d', 'M58,6 L66,-6 L70,8 Z M88,-6 L94,-24 L98,-4 Z M116,4 L120,-10 L124,8 Z', H()],
  ] },
  capuzSombrio: { papel: 'cabeca', nome: 'Capuz sombrio', partes: [
    ['animeAtras', 'capuzCostas', 'akD', 'M34,60 C26,20 54,-6 90,-6 C126,-6 154,20 146,60 L150,94 L30,94 Z', H()],
    ['animeCabeca', 'borda', 'akD', 'M36,58 C30,22 56,2 90,2 C124,2 150,22 144,58 L136,56 C140,28 118,12 90,12 C62,12 40,28 44,56 Z', H()],
    ['animeCabecaDet', 'brilhoRoxo', 'akF1', 'M44,54 C42,30 60,14 82,10 C64,18 50,32 48,54 Z', H({ alpha: 0.8 })],
  ] },
  brincosHanafuda: { papel: 'rosto', nome: 'Brincos hanafuda', partes: [
    ['animeCabeca', 'brincoE', '#fafafa', 'M34,62 L44,62 L44,82 L34,82 Z', H()],
    ['animeCabeca', 'brincoD', '#fafafa', 'M136,62 L146,62 L146,82 L136,82 Z', H()],
    ['animeCabecaDet', 'sol', '#d84315', `${circ(39, 68, 3.4)} ${circ(141, 68, 3.4)} ${rect(35, 75, 8, 5)} ${rect(137, 75, 8, 5)}`, H()],
  ] },
  mascaraHollow: { papel: 'rosto', nome: 'Meia máscara espiritual', partes: [
    ['animeCabeca', 'mascara', '#f5f5f0', 'M90,28 C112,26 134,34 138,52 C140,64 132,74 118,78 L104,72 L98,80 L92,70 Z', H()],
    ['animeCabecaDet', 'listras', '#c62828', 'M112,30 L116,30 L118,50 L114,50 Z M124,34 L128,36 L128,54 L124,52 Z', H()],
    ['animeCabecaDet', 'olho', '#111111', elip(112, 48, 8, 4), H()],
  ] },
  chifreMotosserra: { papel: 'cabeca', nome: 'Lâmina de motosserra na cabeça', partes: [
    ['animeCabeca', 'lamina', '#b0bec5', 'M80,10 L84,-44 C86,-50 94,-50 96,-44 L100,10 Z', H({ scaleYBy: 'akRev', squashPivot: [90, 10] })],
    ['animeCabecaDet', 'dentes', '#455a64', [-40, -32, -24, -16, -8, 0].map((y) => `${poly([[80.5, y], [76, y + 3], [81, y + 6]])} ${poly([[99.5, y], [104, y + 3], [99, y + 6]])}`).join(' '), H({ scaleYBy: 'akRev', squashPivot: [90, 10] })],
    ['animeCabecaDet', 'motor', '#ff7043', rect(78, 6, 24, 8), H()],
  ] },
  chapeuMago: { papel: 'cabeca', nome: 'Chapéu de mago', partes: [
    ['animeCabeca', 'aba', 'akA', elip(90, 18, 62, 9), H()],
    ['animeCabeca', 'cone', 'akA', 'M58,18 C70,6 74,-20 90,-46 C96,-36 104,-30 118,-34 C110,-24 108,-4 122,18 Z', H()],
    ['animeCabecaDet', 'faixa', 'akC', 'M62,12 C74,16 106,16 118,12 L119,17 C106,21 74,21 61,17 Z', H()],
  ] },
  // --- costas
  capaTouros: { papel: 'costas', nome: 'Manto dos Touros', partes: [
    ['animeAtras', 'manto', '#17171f', 'M46,82 C36,110 30,140 24,166 C46,170 70,164 90,168 C110,164 134,170 156,166 C150,140 144,110 134,82 Z'],
    ['animeAtras', 'dobras', '#2a2a35', 'M60,100 L56,162 L62,162 Z M90,104 L88,166 L94,166 Z M120,100 L124,162 L118,162 Z'],
    ['animeCorpo', 'gola', '#17171f', 'M50,84 C44,76 46,66 54,62 L70,82 Z M130,84 C136,76 134,66 126,62 L110,82 Z'],
    ['animeDetalhe', 'touro', '#b71c1c', 'M126,96 C122,92 122,88 125,86 C127,90 129,91 132,91 C135,91 137,90 139,86 C142,88 142,92 138,96 C136,100 128,100 126,96 Z', { parent: 'armR' }],
  ] },
  capaTropa: { papel: 'costas', nome: 'Capa da tropa de exploração', partes: [
    ['animeAtras', 'capa', '#2e5e3e', 'M44,80 C34,108 30,136 28,160 C50,166 130,166 152,160 C150,136 146,108 136,80 Z'],
    ['animeAtras', 'capuz', '#264d33', 'M58,82 C62,70 118,70 122,82 L116,92 C104,86 76,86 64,92 Z'],
    ['animeDetalhe', 'asas', '#f5f5f5', 'M120,96 C126,90 132,92 132,98 C130,104 124,106 120,104 Z M134,96 C140,92 144,94 143,100 C141,105 136,106 132,104 Z', { parent: 'armR' }],
    ['animeDetalhe', 'asasAzul', '#1e3a8a', 'M126,99 L130,96 L131,101 Z M137,98 L140,97 L139,102 Z', { parent: 'armR' }],
  ] },
  espadaCostas: { papel: 'costas2', nome: 'Espada gigante nas costas', partes: [
    ['animeAtras', 'lamina', '#2b2b33', 'M30,30 L44,18 L150,150 L138,162 Z'],
    ['animeAtras', 'gume', '#4a4a55', 'M36,24 L42,20 L146,148 L140,154 Z'],
    ['animeAtras', 'punho', '#5d4037', 'M22,22 L32,12 L44,24 L34,34 Z'],
  ] },
  haoriXadrez: { papel: 'tronco', nome: 'Haori xadrez', partes: [
    ['animeAtras', 'haoriCostas', '#1b5e20', 'M40,82 C30,112 28,138 30,152 L150,152 C152,138 150,112 140,82 Z'],
    ['animeCorpo', 'frenteE', '#1b5e20', 'M50,82 C44,96 42,116 46,134 L66,134 C68,112 70,94 72,82 Z'],
    ['animeCorpo', 'frenteD', '#1b5e20', 'M130,82 C136,96 138,116 134,134 L114,134 C112,112 110,94 108,82 Z'],
    ['animeDetalhe', 'xadrez', '#101010', [[48, 86], [58, 96], [48, 106], [58, 116], [48, 126], [122, 86], [112, 96], [122, 106], [112, 116], [122, 126]].map(([x, y]) => rect(x, y, 9, 9)).join(' ')],
  ] },
  shinigami: { papel: 'tronco', nome: 'Uniforme de shinigami', partes: [
    ['animeCorpo', 'kimono', '#151515', 'M50,84 C60,79 120,79 130,84 C141,90 143,101 137,109 C131,118 123,124 117,130 L63,130 C57,124 49,118 43,109 C37,101 39,90 50,84 Z'],
    ['animeDetalhe', 'gola', '#f5f5f5', 'M72,80 L92,112 L88,116 L66,84 Z M108,80 L90,108 L94,112 L114,84 Z'],
    ['animeDetalhe', 'faixa', '#f5f5f5', rect(52, 122, 76, 6)],
    ['animeAtras', 'mangaE', '#151515', 'M40,90 C24,98 16,122 18,140 L36,136 C36,120 40,104 48,96 Z'],
    ['animeAtras', 'mangaD', '#151515', 'M140,90 C156,98 164,122 162,140 L144,136 C144,120 140,104 132,96 Z'],
  ] },
  uniformeJujutsu: { papel: 'tronco', nome: 'Uniforme de feiticeiro', partes: [
    ['animeCorpo', 'casaco', '#1a1f3a', 'M50,84 C60,79 120,79 130,84 C141,90 143,101 137,109 C131,118 123,124 117,130 L63,130 C57,124 49,118 43,109 C37,101 39,90 50,84 Z'],
    ['animeCorpo', 'golaAlta', '#1a1f3a', 'M66,70 C76,76 104,76 114,70 L116,84 C104,88 76,88 64,84 Z'],
    ['animeDetalhe', 'botoes', '#c9a227', [92, 102, 112, 122].map((y) => circ(90, y, 2.2)).join(' ') + ` ${circ(108, 78, 2.6)}`],
  ] },
  uniformeVolei: { papel: 'tronco', nome: 'Uniforme de vôlei', partes: [
    ['animeCorpo', 'camisa', 'akA', 'M50,84 C60,79 120,79 130,84 C141,90 143,101 137,109 C131,118 123,124 117,130 L63,130 C57,124 49,118 43,109 C37,101 39,90 50,84 Z'],
    ['animeDetalhe', 'faixas', 'akB', 'M50,84 L58,82 L74,130 L66,130 Z M130,84 L122,82 L106,130 L114,130 Z'],
    ['animeDetalhe', 'numero', 'akB', 'M82,96 L92,94 L92,120 L86,120 L86,101 L82,102 Z M95,94 L104,94 C108,94 108,100 104,102 L99,106 L108,106 L108,112 L95,112 L95,106 L101,100 L95,100 Z'],
    ['animeCorpo', 'joelheiraE', '#fafafa', rect(56, 150, 26, 8)],
    ['animeCorpo', 'joelheiraD', '#fafafa', rect(98, 150, 26, 8)],
  ] },
  giLutador: { papel: 'tronco', nome: 'Gi de lutador', partes: [
    ['animeCorpo', 'gi', 'akA', 'M50,84 C60,79 120,79 130,84 C141,90 143,101 137,109 C131,118 123,124 117,130 L63,130 C57,124 49,118 43,109 C37,101 39,90 50,84 Z'],
    ['animeDetalhe', 'camiseta', 'akB', 'M70,82 L90,104 L110,82 L104,82 L90,96 L76,82 Z'],
    ['animeDetalhe', 'faixa', 'akB', rect(50, 120, 80, 8)],
    ['animeDetalhe', 'emblema', '#fafafa', circ(112, 98, 6)],
    ['animeDetalhe', 'kanji', '#111111', 'M109,95 L115,95 L115,96.5 L109,96.5 Z M111.3,93 L112.7,93 L112.7,103 L111.3,103 Z M109,99 L115,99 L115,100.5 L109,100.5 Z'],
  ] },
  equipamentoManobra: { papel: 'cintura', nome: 'Equipamento de manobra', partes: [
    ['animeCorpo', 'cinto', '#4e342e', rect(52, 122, 76, 7)],
    ['animeCorpo', 'tiras', '#4e342e', 'M58,128 L64,128 L70,150 L64,150 Z M122,128 L116,128 L110,150 L116,150 Z M70,84 L76,84 L80,122 L74,122 Z M110,84 L104,84 L100,122 L106,122 Z'],
    ['animeCorpo', 'cilindroE', '#90a4ae', 'M30,124 L52,124 Q56,124 56,128 L56,136 Q56,140 52,140 L30,140 Q26,140 26,136 L26,128 Q26,124 30,124 Z'],
    ['animeCorpo', 'cilindroD', '#90a4ae', 'M128,124 L150,124 Q154,124 154,128 L154,136 Q154,140 150,140 L128,140 Q124,140 124,136 L124,128 Q124,124 128,124 Z'],
    ['animeDetalhe', 'brilhoCil', '#cfd8dc', `${rect(30, 126, 20, 2)} ${rect(130, 126, 20, 2)}`],
  ] },
  ternoSpy: { papel: 'tronco', nome: 'Terno de agente', partes: [
    ['animeCorpo', 'terno', '#2f3a4a', 'M50,84 C60,79 120,79 130,84 C141,90 143,101 137,109 C131,118 123,124 117,130 L63,130 C57,124 49,118 43,109 C37,101 39,90 50,84 Z'],
    ['animeDetalhe', 'camisa', '#f5f5f5', 'M76,82 L90,112 L104,82 Z'],
    ['animeDetalhe', 'gravata', '#8d1c1c', 'M88,84 L92,84 L94,104 L90,110 L86,104 Z'],
  ] },
  // --- mão (objetos)
  grimorio: { papel: 'mao', nome: 'Grimório', partes: [
    ['animeMao', 'fechado', '#1f1f27', 'M138,128 L164,124 L166,154 L140,158 Z', OBJ({ hideIf: 'akAbre' })],
    ['animeMaoDet', 'trevoF', 'akC', trevo(152, 141, 4.2), OBJ({ hideIf: 'akAbre' })],
    ['animeMaoDet', 'cantos', '#c9a227', `${poly([[138, 128], [144, 127], [139, 133]])} ${poly([[164, 124], [158, 125], [164.4, 130]])} ${poly([[140, 158], [146, 157], [139.6, 152]])} ${poly([[166, 154], [160, 155], [165.6, 148]])}`, OBJ({ hideIf: 'akAbre' })],
    ['animeMao', 'aberto', '#1f1f27', 'M126,130 L152,126 L178,130 L178,152 L152,148 L126,152 Z', OBJ({ showIf: 'akAbre' })],
    ['animeMaoDet', 'paginas', '#f3e9cf', 'M129,132 L151,128.5 L151,146 L129,149 Z M153,128.5 L175,132 L175,149 L153,146 Z', OBJ({ showIf: 'akAbre' })],
    ['animeMaoDet', 'runas', 'akF2', [[134, 136], [140, 140], [158, 136], [166, 140]].map(([x, y]) => rect(x, y, 8, 1.6)).join(' '), OBJ({ showIf: 'akAbre' })],
  ] },
  espadaAntimagia: { papel: 'mao', nome: 'Espada antimagia', partes: [
    ['animeMao', 'lamina', '#26262e', 'M144,136 L160,40 C162,32 172,30 176,38 L162,140 Z', OBJ()],
    ['animeMaoDet', 'gume', '#4b4b57', 'M162,46 C165,40 170,40 172,44 L160,132 L156,130 Z', OBJ()],
    ['animeMaoDet', 'rachas', '#8d1c1c', 'M156,70 L160,74 L158,80 L161,84 L159,84 L156,80 L158,74 L155,71 Z M152,104 L156,108 L154,112 L152,112 L153,108 L151,105 Z', OBJ()],
    ['animeMao', 'guarda', '#3a3a44', 'M136,134 L170,140 L168,148 L134,142 Z', OBJ()],
    ['animeMao', 'punho', '#5d4037', 'M144,144 L156,146 L154,162 L142,160 Z', OBJ()],
  ] },
  kunai: { papel: 'mao', nome: 'Kunai', partes: [
    ['animeMao', 'lamina', '#90a4ae', 'M150,136 L158,108 L166,136 L160,140 L156,140 Z', OBJ()],
    ['animeMaoDet', 'brilho', '#eceff1', 'M157,114 L159,114 L158,134 Z', OBJ()],
    ['animeMao', 'cabo', '#37474f', 'M155,140 L161,140 L161,154 L155,154 Z', OBJ()],
    ['animeMao', 'argola', '#90a4ae', anel(158, 158, 4.5, 1.6), OBJ()],
  ] },
  esferaChakra: { papel: 'mao', nome: 'Esfera de chakra', partes: [
    ['animeMaoDet', 'halo', 'akF1', circ(160, 128, 15), { ...MAO_D, alpha: 0.35, scaleBy: 'akEnergiaK', scalePivot: [160, 128], showIf: 'akEnergia' }],
    ['animeMaoDet', 'esfera', 'akF1', circ(160, 128, 10), { ...MAO_D, alpha: 0.85, scaleBy: 'akEnergiaK', scalePivot: [160, 128], showIf: 'akEnergia' }],
    ['animeMaoDet', 'nucleo', '#ffffff', circ(160, 128, 4.5), { ...MAO_D, scaleBy: 'akEnergiaK', scalePivot: [160, 128], showIf: 'akEnergia' }],
    ['animeMaoDet', 'giro', 'akF2', 'M150,124 C154,118 164,116 170,122 C164,120 156,122 152,128 Z M170,132 C166,138 156,140 150,134 C156,136 164,134 168,128 Z', { ...MAO_D, pivot: [160, 128], rot: 'akGiro', showIf: 'akEnergia' }],
  ] },
  katana: { papel: 'mao', nome: 'Katana', partes: [
    ['animeMao', 'lamina', 'akD', 'M150,140 L176,62 C177,59 180,59 180,62 L156,142 Z', OBJ()],
    ['animeMaoDet', 'fio', 'akDclaro', 'M176,66 L179,63 L155,138 L154,138 Z', OBJ()],
    ['animeMao', 'tsuba', '#212121', elip(152, 142, 8, 4), OBJ()],
    ['animeMao', 'tsuka', '#263238', 'M148,144 L156,146 L152,160 L144,158 Z', OBJ()],
    ['animeMaoDet', 'trama', '#eceff1', 'M148,148 L154,150 L153,152 L147,150 Z M147,153 L153,155 L152,157 L146,155 Z', OBJ()],
  ] },
  bolaVolei: { papel: 'mao', nome: 'Bola de vôlei', partes: [
    ['animeMao', 'bola', '#fdd835', circ(160, 128, 11), { ...MAO_D, dx: 'akBolaX', dy: 'akBolaY', pivot: [160, 128], rot: 'akGiro', hideIf: 'akBolaFora' }],
    ['animeMaoDet', 'gomos', '#1565c0', 'M150,122 C156,126 166,124 170,118 L171,122 C166,129 156,131 149,126 Z M152,136 C156,130 164,130 168,134 L166,137 C162,134 157,134 154,138 Z', { ...MAO_D, dx: 'akBolaX', dy: 'akBolaY', pivot: [160, 128], rot: 'akGiro', hideIf: 'akBolaFora' }],
  ] },
  cajadoMagico: { papel: 'mao', nome: 'Cajado mágico', partes: [
    ['animeMao', 'haste', '#8d6e63', rect(154, 70, 4, 92), OBJ()],
    ['animeMao', 'coroa', '#e0c068', 'M146,72 C146,60 166,60 166,72 L162,78 L150,78 Z', OBJ()],
    ['animeMao', 'joia', 'akF2', circ(156, 66, 5.5), OBJ()],
    ['animeMaoDet', 'brilho', '#ffffff', circ(154, 64, 1.6), OBJ()],
  ] },
  laminasManobra: { papel: 'mao', nome: 'Lâminas de manobra', partes: [
    ['animeMao', 'lamina', '#b0bec5', 'M150,138 L182,104 L184,108 L154,142 Z', OBJ()],
    ['animeMaoDet', 'segmentos', '#78909c', [0, 1, 2, 3].map((i) => poly([[156 + i * 7, 133 - i * 7.4], [158 + i * 7, 135 - i * 7.4], [159.6 + i * 7, 133.4 - i * 7.4]])).join(' '), OBJ()],
    ['animeMao', 'empunhadura', '#455a64', 'M144,138 L154,140 L152,156 L142,154 Z', OBJ()],
  ] },
  motosserraBraco: { papel: 'mao', nome: 'Motosserra no braço', partes: [
    ['animeMao', 'lamina', '#b0bec5', 'M146,132 L184,118 C190,116 192,124 186,126 L150,144 Z', { ...MAO_D, scaleXBy: 'akRev', squashPivot: [148, 138] }],
    ['animeMaoDet', 'dentes', '#455a64', [0, 1, 2, 3, 4].map((i) => poly([[152 + i * 7, 131 - i * 2.6], [155 + i * 7, 126 - i * 2.6], [158 + i * 7, 129 - i * 2.6]])).join(' '), { ...MAO_D, scaleXBy: 'akRev', squashPivot: [148, 138] }],
    ['animeMao', 'motor', '#ff7043', 'M136,136 L150,132 L154,146 L140,150 Z', MAO_D],
  ] },
  zanpakuto: { papel: 'mao', nome: 'Espada espiritual', partes: [
    ['animeMao', 'lamina', '#cfd8dc', 'M150,140 L178,58 L182,60 L156,142 Z', OBJ()],
    ['animeMao', 'guarda', '#c9a227', 'M144,136 L160,136 L160,146 L144,146 Z', OBJ()],
    ['animeMao', 'punho', '#3949ab', 'M148,146 L156,146 L154,162 L146,162 Z', OBJ()],
  ] },
  pipoca: { papel: 'maoE', nome: 'Balde de pipoca', partes: [
    ['animeMao', 'balde', '#fafafa', 'M14,138 L40,138 L36,166 L18,166 Z', { ...MAO_E, showIf: 'akPipoca' }],
    ['animeMaoDet', 'listras', '#e53935', 'M19,138 L24,138 L23,166 L20,166 Z M29,138 L34,138 L33,166 L30,166 Z', { ...MAO_E, showIf: 'akPipoca' }],
    ['animeMao', 'pipocas', '#fff3c4', [[17, 136], [23, 132], [29, 134], [35, 132], [39, 137], [26, 128]].map(([x, y]) => circ(x, y, 4)).join(' '), { ...MAO_E, showIf: 'akPipoca' }],
  ] },
  bauTesouro: { papel: 'chao', nome: 'Baú de tesouro', partes: [
    ['animeChao', 'caixa', '#6d4c41', 'M134,146 L176,146 L176,167 L134,167 Z', { showIf: 'akBau' }],
    ['animeChao', 'tampa', '#795548', 'M132,146 C132,132 178,132 178,146 Z', { showIf: 'akBau', pivot: [134, 146], rot: 'akTampa' }],
    ['animeChaoDet', 'ferragens', '#c9a227', `${rect(134, 150, 42, 3)} ${rect(152, 146, 6, 10)} ${rect(140, 146, 3, 21)} ${rect(167, 146, 3, 21)}`, { showIf: 'akBau' }],
    ['animeChaoDet', 'brilhoBau', '#ffe082', 'M140,146 L170,146 L176,120 L134,120 Z', { showIf: 'akBauBrilho', alpha: 0.5 }],
  ] },
};

// ------------------------------------------------------------------ 3. efeitos

/** Efeitos: atrás do JoJo (fundo) ou na frente. Cores akF1 (principal) e akF2 (secundária). */
export const EFEITOS = {
  aura: { camada: 'atras', partes: [
    ['akfx', 'auraFora', 'akF1', 'M90,-26 C130,-30 162,10 166,60 C170,110 160,150 150,168 L30,168 C20,150 10,110 14,60 C18,10 50,-22 90,-26 Z', { alpha: 0.28, scaleBy: 'akAuraK', scalePivot: [90, 167] }],
    ['akfx', 'auraDentro', 'akF2', 'M90,-6 C120,-8 146,22 148,64 C150,110 142,148 134,166 L46,166 C38,148 30,110 32,64 C34,22 60,-4 90,-6 Z', { alpha: 0.32, scaleBy: 'akAuraK2', scalePivot: [90, 167] }],
    ['akfx', 'chamas', 'akF1', [[28, 120], [152, 120], [40, 40], [140, 40], [90, -30]].map(([x, y]) => `M${x},${y} C${x - 7},${y - 10} ${x - 2},${y - 22} ${x},${y - 30} C${x + 5},${y - 20} ${x + 9},${y - 8} ${x},${y} Z`).join(' '), { alpha: 0.7, dy: 'akAuraY' }],
  ] },
  circuloMagico: { camada: 'atras', partes: [
    ['akfx', 'circulo', 'akF1', `${elip(90, 166, 74, 13)} ${furo(90, 166, 70, 11)} ${elip(90, 166, 56, 9.6)} ${furo(90, 166, 53.6, 8)}`, { alpha: 0.85, scaleBy: 'akCirculoK', scalePivot: [90, 166] }],
    ['akfx', 'runas', 'akF2', Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return estrela(90 + Math.cos(a) * 63, 166 + Math.sin(a) * 10.6, 2.6, 4, 0.4); }).join(' '), { alpha: 0.9, scaleBy: 'akCirculoK', scalePivot: [90, 166] }],
  ] },
  dominio: { camada: 'atras', partes: [
    ['akfx', 'fundo', 'akD', circ(90, 88, 96), { alpha: 0.6, scaleBy: 'akDominioK', scalePivot: [90, 88] }],
    ['akfx', 'raios', 'akF1', Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return poly([[90 + Math.cos(a - 0.03) * 36, 88 + Math.sin(a - 0.03) * 36], [90 + Math.cos(a) * 94, 88 + Math.sin(a) * 94], [90 + Math.cos(a + 0.03) * 36, 88 + Math.sin(a + 0.03) * 36]]); }).join(' '), { alpha: 0.5, scaleBy: 'akDominioK', scalePivot: [90, 88], pivot: [90, 88], rot: 'akGiro' }],
    ['akfx', 'anel', 'akF2', `${circ(90, 88, 92)} ${furo(90, 88, 87, 87)}`, { alpha: 0.7, scaleBy: 'akDominioK', scalePivot: [90, 88] }],
  ] },
  ondas: { camada: 'frente', partes: [
    ['akfx', 'onda1', 'akF1', 'M-10,160 C10,148 30,148 50,160 C70,172 90,148 110,160 C130,172 150,148 170,160 C180,166 190,164 196,160 L196,176 L-10,176 Z', { alpha: 0.8, dx: 'akOndasX' }],
    ['akfx', 'espuma', '#ffffff', 'M10,152 C16,148 22,148 28,152 C22,151 16,151 10,152 Z M90,152 C96,148 102,148 108,152 C102,151 96,151 90,152 Z M150,152 C156,148 162,148 168,152 C162,151 156,151 150,152 Z', { alpha: 0.9, dx: 'akOndasX' }],
  ] },
  painel: { camada: 'frente', partes: [
    ['akfx', 'janela', 'akD', 'M-6,-30 L82,-30 L82,14 L-6,14 Z', { alpha: 0.82, scaleBy: 'akPainelK', scalePivot: [38, -8] }],
    ['akfx', 'moldura', 'akF1', `${rect(-6, -30, 88, 2.4)} ${rect(-6, 11.6, 88, 2.4)} ${rect(-6, -30, 2.4, 44)} ${rect(79.6, -30, 2.4, 44)}`, { alpha: 0.95, scaleBy: 'akPainelK', scalePivot: [38, -8] }],
    ['akfx', 'linhas', 'akF1', `${rect(2, -22, 50, 3)} ${rect(2, -13, 70, 2)} ${rect(2, -6, 60, 2)} ${rect(2, 1, 40, 2)}`, { alpha: 0.85, scaleBy: 'akPainelK', scalePivot: [38, -8] }],
    ['akfx', 'exclamacao', 'akF2', `${rect(64, -24, 4, 10)} ${rect(64, -11, 4, 3.6)}`, { scaleBy: 'akPainelK', scalePivot: [38, -8] }],
  ] },
  dramatico: { camada: 'frente', partes: [
    ['akfx', 'go1', 'akF1', 'M0,0 Z', { text: 'ゴ', textX: 10, textY: 10, fontSize: 22, textFill: 'akF1', dy: 'akTextoY', alpha: 0 }],
    ['akfx', 'go2', 'akF1', 'M0,0 Z', { text: 'ゴ', textX: 162, textY: 30, fontSize: 18, textFill: 'akF1', dy: 'akTextoY', alpha: 0 }],
    ['akfx', 'go3', 'akF2', 'M0,0 Z', { text: 'ゴ', textX: 16, textY: 52, fontSize: 16, textFill: 'akF2', dy: 'akTextoY', alpha: 0 }],
    ['akfx', 'go4', 'akF2', 'M0,0 Z', { text: 'ゴ', textX: 168, textY: 74, fontSize: 20, textFill: 'akF2', dy: 'akTextoY', alpha: 0 }],
  ] },
  fumaca: { camada: 'frente', partes: [
    ['akfx', 'nuvem', '#eceff1', 'M30,100 C20,80 34,60 52,64 C56,44 80,38 92,52 C104,36 132,42 132,64 C150,58 164,78 152,98 C166,112 152,134 132,128 C126,146 100,150 90,136 C78,150 52,146 50,128 C30,134 18,114 30,100 Z', { alpha: 0.95, scaleBy: 'akFumacaK', scalePivot: [90, 96] }],
    ['akfx', 'folha', 'akF1', 'M150,40 C160,30 172,32 176,40 C168,38 160,40 154,46 Z', { alpha: 0.9, scaleBy: 'akFumacaK', scalePivot: [90, 96] }],
  ] },
  impacto: { camada: 'frente', partes: [
    ['akfx', 'estrela', 'akF1', estrela(158, 40, 26, 9, 0.45), { alpha: 0.85, scaleBy: 'akImpactoK', scalePivot: [158, 40] }],
    ['akfx', 'centro', '#ffffff', estrela(158, 40, 12, 9, 0.5), { scaleBy: 'akImpactoK', scalePivot: [158, 40] }],
  ] },
  agua: { camada: 'frente', partes: [
    ['akfx', 'arco', 'akF1', 'M150,150 C190,110 170,40 120,20 C160,50 168,104 140,142 Z', { alpha: 0.75, pivot: [90, 90], rot: 'akGiro' }],
    ['akfx', 'arco2', 'akF2', 'M30,30 C-8,70 8,130 60,150 C22,120 16,76 40,38 Z', { alpha: 0.7, pivot: [90, 90], rot: 'akGiro' }],
  ] },
  sombras: { camada: 'atras', partes: [
    ['akfx', 'soldados', 'akF1', [[10, 167, 0.8], [170, 167, 0.8], [40, 160, 0.6], [140, 160, 0.6]].map(([x, y, s]) => `M${x - 12 * s},${y} C${x - 14 * s},${y - 40 * s} ${x - 8 * s},${y - 60 * s} ${x},${y - 70 * s} C${x + 8 * s},${y - 60 * s} ${x + 14 * s},${y - 40 * s} ${x + 12 * s},${y} Z ${circ(x, y - 76 * s, 9 * s)}`).join(' '), { alpha: 0.55, dy: 'akSombrasY' }],
    ['akfx', 'olhos', 'akF2', [[10, 167, 0.8], [170, 167, 0.8], [40, 160, 0.6], [140, 160, 0.6]].map(([x, y, s]) => `${elip(x - 3 * s, y - 77 * s, 2.4 * s, 1.2 * s)} ${elip(x + 3 * s, y - 77 * s, 2.4 * s, 1.2 * s)}`).join(' '), { dy: 'akSombrasY' }],
  ] },
  petalas: { camada: 'frente', partes: [
    ['akfx', 'petalas', 'akF1', [[20, 10], [150, 0], [40, 70], [160, 60], [90, -20], [10, 120], [170, 120]].map(([x, y]) => `M${x},${y} C${x + 4},${y - 4} ${x + 9},${y - 2} ${x + 8},${y + 3} C${x + 5},${y + 6} ${x + 1},${y + 4} ${x},${y} Z`).join(' '), { alpha: 0.85, dy: 'akPetalasY', dx: 'akPetalasX' }],
  ] },
  raios: { camada: 'frente', partes: [
    ['akfx', 'raios', 'akF1', [[22, 40], [158, 40], [16, 100], [164, 100]].map(([x, y], i) => { const s = i % 2 ? -1 : 1; return poly([[x, y], [x + 8 * s, y + 10], [x + 3 * s, y + 11], [x + 10 * s, y + 24], [x - 1 * s, y + 9], [x + 4 * s, y + 8]]); }).join(' '), { alpha: 0.95 }],
  ] },
  brilhos: { camada: 'frente', partes: [
    ['akfx', 'brilhos', 'akF1', [[24, 30], [156, 20], [16, 90], [164, 84], [90, -24]].map(([x, y]) => estrela(x, y, 5, 4, 0.35)).join(' '), { alpha: 0.95, scaleBy: 'akBrilhoK', scalePivot: [90, 60] }],
  ] },
};

export const ACESSORIO_IDS = Object.freeze(Object.keys(ACESSORIOS));
export const EFEITO_IDS = Object.freeze(Object.keys(EFEITOS));
export const canalAcessorio = (id) => `ak_${id}`;
export const canalEfeito = (id) => `akfx_${id}`;

/** Canais neutros (o valor que cada canal de anime tem fora das animações). */
/**
 * Canal que liga os grupos de anime: sem pacote vestido o desenho pula os grupos inteiros
 * (custo por quadro igual ao de antes do ecossistema).
 */
export const CANAL_LIGADO = 'animeOn';

export const NEUTRO_ANIME = Object.freeze({ akAuraK: 1, akAuraK2: 1, akCirculoK: 1, akDominioK: 1, akPainelK: 1, akFumacaK: 1, akImpactoK: 1, akEnergiaK: 1, akRev: 1, akBrilhoK: 1 });

/** Conjunto de animações com os canais de anime no valor neutro (escala 1 onde a faixa falta). */
export function comCanaisAnime(anims) {
  return { ...anims, channels: { ...anims.channels, ...NEUTRO_ANIME } };
}

// ------------------------------------------------------------------ rig

/**
 * Rig com as peças de anime (cópia; o original não muda). Grupos novos entram em volta dos
 * já existentes: efeitos de fundo antes de tudo, capa atrás do corpo, roupa sobre o tronco,
 * acessórios de cabeça depois da cabeça, objetos depois da mão, efeitos da frente por último.
 */
export function rigComAnime(rig) {
  if (!rig?.groups) return rig;
  const groups = rig.groups.map((g) => ({ ...g, parts: [...g.parts] }));
  const pos = (id) => groups.findIndex((g) => g.id === id);
  const inserir = (novo, depoisDe) => { const i = pos(depoisDe); groups.splice(i >= 0 ? i + 1 : groups.length, 0, novo); return novo; };
  const fxAtras = { id: 'animeFxAtras', showIf: CANAL_LIGADO, hideIf: 'mooning', parts: [] };
  groups.unshift(fxAtras);
  const G = {
    animeAtras: inserir({ id: 'animeAtras', showIf: CANAL_LIGADO, hideIf: 'mooning', outline: true, parts: [] }, 'costumeBack'),
    animeChao: inserir({ id: 'animeChao', showIf: CANAL_LIGADO, hideIf: 'mooning', outline: true, parts: [] }, 'legDetail'),
  };
  G.animeChaoDet = inserir({ id: 'animeChaoDet', showIf: CANAL_LIGADO, hideIf: 'mooning', parts: [] }, 'animeChao');
  G.animeCorpo = inserir({ id: 'animeCorpo', showIf: CANAL_LIGADO, hideIf: 'mooning', outline: true, parts: [] }, pos('nivelCorpo') >= 0 ? 'nivelCorpo' : 'shortsDetail');
  G.animeDetalhe = inserir({ id: 'animeDetalhe', showIf: CANAL_LIGADO, hideIf: 'mooning', parts: [] }, 'animeCorpo');
  G.animeCabeca = inserir({ id: 'animeCabeca', showIf: CANAL_LIGADO, hideIf: 'mooning', outline: true, parts: [] }, 'costumes');
  G.animeCabecaDet = inserir({ id: 'animeCabecaDet', showIf: CANAL_LIGADO, hideIf: 'mooning', parts: [] }, 'animeCabeca');
  G.animeMao = inserir({ id: 'animeMao', showIf: CANAL_LIGADO, hideIf: 'mooning', outline: true, parts: [] }, pos('costumeHand') >= 0 ? 'costumeHand' : 'arms');
  G.animeMaoDet = inserir({ id: 'animeMaoDet', showIf: CANAL_LIGADO, hideIf: 'mooning', parts: [] }, 'animeMao');
  const fxFrente = { id: 'animeFxFrente', showIf: CANAL_LIGADO, hideIf: 'mooning', parts: [] };
  groups.push(fxFrente);
  const byId = new Map(groups.map((g) => [g.id, g]));
  // Kit por chave (vai para os grupos do próprio kit, que já têm contorno e ordem certos).
  // Cada grupo de destino ganha um "espelho" logo depois dele, ligado só com pacote vestido.
  const espelhos = new Map();
  const espelho = (alvo) => {
    if (espelhos.has(alvo.id)) return espelhos.get(alvo.id);
    const g = { id: `animeKit_${alvo.id}`, showIf: CANAL_LIGADO, hideIf: alvo.hideIf, outline: alvo.outline, parts: [] };
    groups.splice(groups.indexOf(alvo) + 1, 0, g);
    espelhos.set(alvo.id, g);
    return g;
  };
  for (const [group, id, fill, path, extra] of pecasDoKit()) espelho(byId.get(group) || byId.get('costumes')).parts.push({ id, fill, path, ...extra });
  for (const [aid, a] of Object.entries(ACESSORIOS)) {
    for (const [group, pid, fill, path, extra] of a.partes) {
      const showIf = extra?.showIf ? [canalAcessorio(aid), extra.showIf] : canalAcessorio(aid);
      const part = { id: `ak_${aid}_${pid}`, fill, path, ...(extra || {}), showIf: Array.isArray(showIf) ? showIf[0] : showIf };
      if (Array.isArray(showIf)) part.showIf2 = showIf[1];
      G[group].parts.push(part);
    }
  }
  for (const [eid, e] of Object.entries(EFEITOS)) {
    const alvo = e.camada === 'atras' ? fxAtras : fxFrente;
    for (const [, pid, fill, path, extra] of e.partes) alvo.parts.push({ id: `akfx_${eid}_${pid}`, fill, path, ...(extra || {}), showIf: canalEfeito(eid) });
  }
  const palette = { ...rig.palette, ...paletaAnime() };
  return { ...rig, groups, palette };
}

/** Todas as peças de anime do rig (para os testes de integridade e a auditoria). */
export function pecasAnime(rig) {
  return rig.groups.filter((g) => /^anime/.test(g.id) || g.parts.some((p) => /^ak/.test(p.id))).flatMap((g) => g.parts.filter((p) => /^ak/.test(p.id)).map((p) => ({ group: g.id, ...p })));
}
