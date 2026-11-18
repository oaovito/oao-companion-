// Visuais por nível. REGRA IRREDUTÍVEL (pedido de 18/11/2026): todo título de nível
// é uma referência a filme, anime, série, jogo ou cultura pop, sem repetir obra (todas
// as clássicas de tubarão estão presentes), mais 20 extras de South Park e 50 de memes do
// Twitter (`extras`, sem pudor), mais 100 de anime (um a cada 2 níveis, obras novas), e a peça, a fala e a reação de cada nível são dessa
// referência. Os dados ficam em `progressao.json` → `referencias` (um por nível).
// Cada nível a partir do 2 libera uma peça desenhada por cima do JoJo (o corpo, a
// silhueta e o estilo de recorte de papel não mudam). Quanto mais alto o nível,
// mais acabamento a peça ganha (friso, gemas, brilhos), então o conjunto sempre
// melhora. Pedido de 18/11: os visuais podem transformar o JoJo para parecer com a
// referência (cabeça, corpo, boca, olhos e cor da pele) enquanto estão vestidos;
// sem visual, o modelo original continua igual. Puro: catálogo, partes do rig e canais. Nada aqui revela peça bloqueada:
// toda função pública que lista recebe o nível e filtra.

export const VISUAL_PARTES = [
  { id: 'cabeca', nome: 'Cabeça' },
  { id: 'rosto', nome: 'Rosto' },
  { id: 'pescoco', nome: 'Pescoço' },
  { id: 'costas', nome: 'Costas' },
  { id: 'pulsos', nome: 'Pulsos' },
  { id: 'cinto', nome: 'Cintura' },
  { id: 'bermuda', nome: 'Bermuda' },
  { id: 'pintura', nome: 'Pintura' },
  { id: 'aura', nome: 'Aura' },
  { id: 'mao', nome: 'Na mão' },
];
const PARTES = new Set(VISUAL_PARTES.map((p) => p.id));

const r1 = (n) => Math.round(n * 10) / 10;
const circ = (cx, cy, r) => `M${r1(cx - r)},${r1(cy)} a${r1(r)},${r1(r)} 0 1,0 ${r1(2 * r)},0 a${r1(r)},${r1(r)} 0 1,0 ${r1(-2 * r)},0 Z`;
const elip = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} a${r1(rx)},${r1(ry)} 0 1,0 ${r1(2 * rx)},0 a${r1(rx)},${r1(ry)} 0 1,0 ${r1(-2 * rx)},0 Z`;
// Furo (sentido contrário ao contorno de fora): usado em máscaras e anéis.
const furo = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} a${r1(rx)},${r1(ry)} 0 1,1 ${r1(2 * rx)},0 a${r1(rx)},${r1(ry)} 0 1,1 ${r1(-2 * rx)},0 Z`;
const poly = (pts) => `M${pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' L')} Z`;
const rect = (x, y, w, h) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
const estrela = (cx, cy, r, n = 5, k = 0.45, rot = -Math.PI / 2) => poly(Array.from({ length: n * 2 }, (_, i) => {
  const a = rot + (i * Math.PI) / n;
  const rr = i % 2 ? r * k : r;
  return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
}));
const brilho = (cx, cy, r) => estrela(cx, cy, r, 4, 0.32, 0);
const id3 = (n) => String(n).padStart(3, '0');
const CABECA = { pivot: [90, 86], rot: 'headRot' };
/** y da curva do topo da cabeça (onde assentam faixas, coroas e chapéus). */
const topo = (x) => 20 - 8 * (1 - ((x - 90) / 36) ** 2);

/**
 * Catálogo completo (níveis 2..N) a partir das referências. USO INTERNO: para
 * mostrar algo à usuária, use `visuaisLiberados(ref, nivel)`.
 */
/** Aceita só as referências (lista) ou {referencias, extras}. */
const fonte = (d) => (Array.isArray(d) ? { referencias: d, extras: [] } : { referencias: d?.referencias || [], extras: d?.extras || [] });
const ID_VALIDO = /^(nv\d{3}|sp\d{2}|tw\d{2}|an\d{3}|br\d{2})$/;
// Prefixo do id de cada coleção de extras.
const PREFIXO = { 'South Park': 'sp', 'memes do Twitter': 'tw', animes: 'an', 'memes BR': 'br' };
// Casas do número no id (100 animes pedem três).
const CASAS = { an: 3 };

export function gerarVisuais(dados) {
  const { referencias, extras } = fonte(dados);
  const out = [];
  const total = referencias.length;
  for (let nivel = 2; nivel <= total; nivel++) {
    const r = referencias[nivel - 1];
    if (!r || !PARTES.has(r.parte)) continue;
    const t = (nivel - 2) / Math.max(1, total - 2);
    const [a, b, g] = r.cores;
    out.push({ id: `nv${id3(nivel)}`, nivel, parte: r.parte, forma: r.forma, t, titulo: r.titulo, obra: r.obra, tipo: r.tipo, nome: r.peca, fala: r.fala, anim: r.anim || null, reacao: r.reacao || null, cores: { a, b, g }, transforma: r.transforma || null });
  }
  // Extras (20 de South Park, 50 de memes do Twitter, 100 de anime): liberados junto com o nível
  // indicado, depois da peça do nível. Id pelo prefixo e pela ordem dentro da coleção.
  const contagem = {};
  for (const x of extras) {
    const pre = PREFIXO[x?.colecao || x?.obra];
    if (!pre) continue;
    const n = contagem[pre] = (contagem[pre] || 0) + 1;
    if (!PARTES.has(x.parte) || !(x.nivel >= 2 && x.nivel <= total)) continue;
    const [a, b, g] = x.cores;
    out.push({ id: `${pre}${String(n).padStart(CASAS[pre] || 2, '0')}`, nivel: x.nivel, parte: x.parte, forma: x.forma, t: (x.nivel - 2) / Math.max(1, total - 2), titulo: x.titulo, obra: x.obra, colecao: x.colecao || x.obra, tipo: x.tipo, nome: x.peca, fala: x.fala, anim: x.anim || null, reacao: x.reacao || null, cores: { a, b, g }, transforma: x.transforma || null, extra: true });
  }
  return out.sort((p, q) => p.nivel - q.nivel || Number(!!p.extra) - Number(!!q.extra));
}

// ---------------------------------------------------------------- formas

// Cada forma devolve [grupo, id, cor, caminho, extra?]. Grupos do rig: costumes
// (por cima da cabeça e do corpo), costumeHand (depois dos braços), costumeBack
// (atrás), shortsDetail (sobre a bermuda) e os novos nivelAura/nivelPintura.
const H = (extra = {}) => ({ ...CABECA, ...extra });

const FORMAS = {
  // ------------------------------------------------ cabeça
  fone: ({ a, b }) => [
    ['costumes', 'arco', a, 'M44,40 C44,0 136,0 136,40 L130,40 C130,8 50,8 50,40 Z', H()],
    ['costumes', 'conchaE', b, elip(44, 44, 7, 11), H()],
    ['costumes', 'conchaD', b, elip(136, 44, 7, 11), H()],
  ],
  quepe: ({ a, b }) => [
    ['costumes', 'copa', a, 'M52,22 C56,2 124,2 128,22 C110,14 70,14 52,22 Z', H()],
    ['costumes', 'aba', a, 'M58,20 C80,26 112,26 150,18 C146,26 120,32 92,30 C76,30 64,26 58,20 Z', H()],
    ['costumes', 'insignia', b, estrela(90, 13, 4), H()],
  ],
  faixa: ({ a, b }) => [
    ['costumes', 'faixa', a, `M52,22 C68,10 112,10 128,22 L127,29 C110,18 70,18 53,29 Z`, H()],
    ['costumes', 'no', a, poly([[124, 20], [138, 32], [134, 35], [122, 25]]) + ' ' + poly([[123, 23], [132, 40], [127, 41], [121, 26]]), H()],
    ['costumes', 'marca', b, circ(90, 17, 3.2), H()],
  ],
  bandana: ({ a, b, g }) => [
    ['costumes', 'faixa', a, `M50,24 C68,10 112,10 130,24 L129,32 C110,20 70,20 51,32 Z`, H()],
    ['costumes', 'placa', b, rect(76, 13, 28, 11), H()],
    ['costumes', 'risco', g, poly([[78, 22], [102, 14], [103, 16], [79, 24]]), H()],
  ],
  chapeuPalha: ({ a, b }) => [
    ['costumes', 'aba', a, elip(90, 18, 54, 9), H()],
    ['costumes', 'copa', a, 'M62,18 C62,-6 118,-6 118,18 Z', H()],
    ['costumes', 'fita', b, 'M62,10 C78,6 102,6 118,10 L118,17 C102,13 78,13 62,17 Z', H()],
  ],
  chifres: ({ a, b }) => [
    ['costumes', 'elmo', b, 'M52,24 C54,0 126,0 128,24 C110,16 70,16 52,24 Z', H()],
    ['costumes', 'chifreE', a, 'M58,12 C40,8 30,-6 36,-22 C42,-8 52,-2 64,4 Z', H()],
    ['costumes', 'chifreD', a, 'M122,12 C140,8 150,-6 144,-22 C138,-8 128,-2 116,4 Z', H()],
  ],
  capacete: ({ a, b }) => [
    ['costumes', 'elmo', a, 'M50,30 C50,-2 130,-2 130,30 L122,30 C120,14 60,14 58,30 Z', H()],
    ['costumes', 'crista', b, 'M70,-2 C70,-24 110,-24 110,-2 C104,-12 76,-12 70,-2 Z', H()],
  ],
  capaceteAsas: ({ a, b }) => [
    ['costumes', 'elmo', a, 'M52,26 C54,0 126,0 128,26 C110,16 70,16 52,26 Z', H()],
    ['costumes', 'asaE', b, 'M56,14 C40,6 30,-8 30,-22 C40,-10 50,-6 62,2 C52,-4 46,-12 46,-20 C54,-8 60,-2 66,6 Z', H()],
    ['costumes', 'asaD', b, 'M124,14 C140,6 150,-8 150,-22 C140,-10 130,-6 118,2 C128,-4 134,-12 134,-20 C126,-8 120,-2 114,6 Z', H()],
  ],
  chapeuMago: ({ a, b }) => [
    ['costumes', 'aba', a, elip(90, 18, 50, 7), H()],
    ['costumes', 'cone', a, 'M66,16 L98,-26 L104,-22 L114,16 Z', H()],
    ['costumes', 'fita', b, poly([[68, 10], [113, 10], [114, 15], [67, 15]]), H()],
  ],
  coroa: ({ a, b, g }, t) => {
    const n = 5 + Math.round(t * 3);
    const h = 12 + 10 * t;
    const pts = [[54, 20]];
    for (let i = 0; i < n; i++) {
      const vx = 54 + i * (72 / n), tx = 54 + (i + 0.5) * (72 / n);
      pts.push([vx, topo(vx) - 4], [tx, topo(tx) - 4 - h * (1 - 0.4 * Math.abs(tx - 90) / 36)]);
    }
    pts.push([126, 16], [126, 20]);
    return [
      ['costumes', 'coroa', a, `${poly(pts).slice(0, -2)} C112,12 68,12 54,20 Z`, H()],
      ['costumes', 'friso', b, 'M54,20 C68,12 112,12 126,20 L126,25 C112,17 68,17 54,25 Z', H()],
      ['costumes', 'gema', g, circ(90, topo(90) + 3, 2.6), H()],
    ];
  },
  tricornio: ({ a, b }) => [
    ['costumes', 'chapeu', a, 'M40,20 C56,-4 124,-4 140,20 C124,10 110,12 90,4 C70,12 56,10 40,20 Z', H()],
    ['costumes', 'debrum', b, 'M40,20 C56,12 70,14 90,6 C110,14 124,12 140,20 L138,22 C124,16 110,16 90,9 C70,16 56,16 42,22 Z', H()],
  ],
  tiara: ({ a, b, g }) => [
    ['costumes', 'arco', b, 'M52,22 C68,10 112,10 128,22 L127,26 C110,15 70,15 53,26 Z', H()],
    ['costumes', 'concha', a, 'M78,14 C78,0 102,0 102,14 Z', H()],
    ['costumes', 'perola', g, circ(90, 14, 2.6), H()],
  ],
  antenas: ({ a, b }) => [
    ['costumes', 'hasteE', a, poly([[76, 12], [66, -14], [69, -15], [79, 11]]), H()],
    ['costumes', 'hasteD', a, poly([[104, 12], [114, -14], [111, -15], [101, 11]]), H()],
    ['costumes', 'bolaE', b, circ(67, -16, 4.5), H()],
    ['costumes', 'bolaD', b, circ(113, -16, 4.5), H()],
  ],
  cangaceiro: ({ a, b }) => [
    ['costumes', 'meiaLua', a, 'M36,20 C40,-20 140,-20 144,20 C126,8 54,8 36,20 Z', H()],
    ['costumes', 'estrela', b, estrela(90, 2, 7), H()],
    ['costumes', 'barbicacho', b, 'M38,20 C46,30 50,40 52,46 L49,47 C46,40 42,30 35,21 Z', H()],
  ],
  chapeu: ({ a, b }) => [
    ['costumes', 'aba', a, elip(90, 16, 52, 7), H()],
    ['costumes', 'copa', a, 'M64,16 C62,-12 118,-12 116,16 Z', H()],
    ['costumes', 'fita', b, poly([[63, 8], [117, 8], [117, 14], [63, 14]]), H()],
  ],
  gorro: ({ a, b }) => [
    ['costumes', 'gorro', a, 'M50,24 C50,-12 130,-12 130,24 Z', H()],
    ['costumes', 'barra', b, poly([[48, 18], [132, 18], [132, 27], [48, 27]]), H()],
    ['costumes', 'pompom', b, circ(90, -12, 7), H()],
  ],
  // Só transformação (orelhas, chifres, cores): sem objeto em cima.
  transformacao: () => [],
  orelhas: ({ a, b }) => [
    ['costumes', 'orelhaE', a, 'M56,16 L40,-6 C36,-10 32,-8 34,-2 L50,22 Z', H()],
    ['costumes', 'orelhaD', a, 'M124,16 L140,-6 C144,-10 148,-8 146,-2 L130,22 Z', H()],
  ],
  chapeuChef: ({ a, b }) => [
    ['costumes', 'faixa', a, poly([[60, 4], [120, 4], [122, 20], [58, 20]]), H()],
    ['costumes', 'cogumelo', a, 'M56,6 C40,-14 62,-28 76,-20 C82,-32 98,-32 104,-20 C118,-28 140,-14 124,6 Z', H()],
    ['costumes', 'vinco', b, poly([[60, 4], [120, 4], [120, 7], [60, 7]]), H()],
  ],
  ushanka: ({ a, b }) => [
    ['costumes', 'copa', a, 'M48,26 C48,-8 132,-8 132,26 Z', H()],
    ['costumes', 'aba', b, 'M46,18 C66,8 114,8 134,18 L134,26 C114,16 66,16 46,26 Z', H()],
    ['costumes', 'orelhas', b, 'M44,24 L56,24 L56,46 C52,50 46,50 44,46 Z M136,24 L124,24 L124,46 C128,50 134,50 136,46 Z', H()],
  ],
  chullo: ({ a, b }) => [
    ['costumes', 'gorro', a, 'M50,26 C50,-10 130,-10 130,26 Z', H()],
    ['costumes', 'abas', a, 'M48,22 L58,24 L56,48 L50,48 Z M132,22 L122,24 L124,48 L130,48 Z', H()],
    ['costumes', 'pompons', b, `${circ(90, -12, 6)} ${circ(53, 52, 4)} ${circ(127, 52, 4)}`, H()],
    ['costumes', 'faixa', b, poly([[50, 14], [130, 14], [130, 19], [50, 19]]), H()],
  ],
  fruta: ({ a, b }) => [
    ['costumes', 'laranja', a, circ(90, -2, 12), H()],
    ['costumes', 'folha', b, 'M90,-14 C96,-24 106,-22 108,-18 C100,-14 94,-12 90,-14 Z', H()],
  ],
  aureola: ({ a, b, g }) => [
    ['costumes', 'halo', a, `${elip(90, -14, 26, 6)} ${furo(90, -14, 21, 3)}`, H()],
    ['costumes', 'coroa', a, `${poly([[56, 20], [58, 2], [68, 12], [78, -6], [90, 8], [102, -6], [112, 12], [122, 2], [124, 20]]).slice(0, -2)} C110,12 70,12 56,20 Z`, H()],
    ['costumes', 'friso', b, 'M56,20 C70,12 110,12 124,20 L124,25 C110,17 70,17 56,25 Z', H()],
    ['costumes', 'gema', g, circ(90, 13, 3), H()],
  ],

  // ------------------------------------------------ rosto
  oculosEscuros: ({ a, b }) => [
    ['costumes', 'armacao', b, poly([[58, 32], [122, 32], [122, 35], [58, 35]]), H()],
    ['costumes', 'lenteE', a, 'M66,33 L92,33 C92,46 86,48 79,48 C70,48 66,44 66,33 Z', H()],
    ['costumes', 'lenteD', a, 'M88,33 L114,33 C114,44 110,48 101,48 C94,48 88,46 88,33 Z', H()],
  ],
  oculosTriangulo: ({ a, b }) => [
    ['costumes', 'armacao', a, `${poly([[54, 26], [90, 34], [126, 26], [126, 30], [90, 38], [54, 30]])}`, H()],
    ['costumes', 'lentes', b, `${poly([[58, 30], [88, 36], [84, 50]])} ${poly([[122, 30], [92, 36], [96, 50]])}`, H({ alpha: 0.9 })],
  ],
  mascaraNinja: ({ a, b }) => [
    ['costumes', 'mascara', a, 'M44,50 C60,46 120,46 136,50 L134,84 C110,90 70,90 46,84 Z', H()],
    ['costumes', 'capuz', a, `M44,30 C44,0 136,0 136,30 L130,30 C120,14 60,14 50,30 Z`, H()],
    ['costumes', 'costura', b, `${rect(58, 56, 64, 2.4)} ${rect(88, 50, 4, 34)}`, H()],
  ],
  oculosAviador: ({ a, b }) => [
    ['costumes', 'ponte', a, poly([[60, 31], [120, 31], [120, 33], [60, 33]]), H()],
    ['costumes', 'lenteE', b, 'M66,31 L92,31 C92,44 88,50 78,50 C70,50 66,42 66,31 Z', H()],
    ['costumes', 'lenteD', b, 'M88,31 L114,31 C114,42 110,50 102,50 C92,50 88,44 88,31 Z', H()],
  ],
  oculosRedondos: ({ a, b }) => [
    ['costumes', 'aro', a, `${circ(79, 38, 10.5)} ${furo(79, 38, 8.5, 8.5)} ${circ(101, 38, 10.5)} ${furo(101, 38, 8.5, 8.5)} ${rect(88, 35, 4, 2)} ${rect(54, 34, 15, 2)} ${rect(111, 34, 15, 2)}`, H()],
    ['costumes', 'lentes', b, `${circ(79, 38, 8.5)} ${circ(101, 38, 8.5)}`, H({ alpha: 0.45 })],
  ],
  oculos3D: ({ a, b, g }) => [
    ['costumes', 'armacao', a, `${rect(62, 28, 56, 20)} ${furo(79, 38, 9, 7)} ${furo(101, 38, 9, 7)}`, H()],
    ['costumes', 'lenteE', b, elip(79, 38, 9, 7), H({ alpha: 0.75 })],
    ['costumes', 'lenteD', g, elip(101, 38, 9, 7), H({ alpha: 0.75 })],
  ],
  viseira: ({ a, b }) => [
    ['costumes', 'banda', b, poly([[54, 30], [126, 30], [126, 34], [54, 34]]), H()],
    ['costumes', 'visor', a, 'M64,30 L116,30 C116,42 112,46 90,46 C68,46 64,42 64,30 Z', H({ alpha: 0.85 })],
  ],
  venda: ({ a, b }) => [
    ['costumes', 'venda', a, poly([[50, 28], [130, 28], [130, 46], [50, 46]]), H()],
    ['costumes', 'ponta', a, poly([[128, 30], [140, 40], [136, 44], [126, 36]]), H()],
    ['costumes', 'vinco', b, poly([[52, 36], [128, 36], [128, 38], [52, 38]]), H({ alpha: 0.5 })],
  ],
  mascara: ({ a, b }) => [
    ['costumes', 'mascara', a, `M56,28 C70,24 110,24 124,28 L124,48 C110,52 70,52 56,48 Z ${furo(79, 38, 7, 6)} ${furo(101, 38, 7, 6)}`, H()],
    ['costumes', 'contorno', b, `${elip(79, 38, 8, 7)} ${furo(79, 38, 7, 6)} ${elip(101, 38, 8, 7)} ${furo(101, 38, 7, 6)}`, H()],
  ],
  mascaraHollow: ({ a, b }) => [
    ['costumes', 'mascara', a, `M58,26 C70,20 110,20 122,26 L122,52 C110,58 70,58 58,52 Z ${furo(79, 38, 7, 6)} ${furo(101, 38, 7, 6)}`, H()],
    ['costumes', 'listras', b, `${poly([[62, 28], [66, 28], [70, 54], [66, 54]])} ${poly([[118, 28], [114, 28], [110, 54], [114, 54]])}`, H()],
  ],
  oculosPixel: ({ a, b }) => [
    ['costumes', 'armacao', a, `${rect(58, 31, 64, 4)} ${rect(66, 35, 24, 4)} ${rect(68, 39, 20, 4)} ${rect(70, 43, 16, 3)} ${rect(92, 35, 24, 4)} ${rect(94, 39, 20, 4)} ${rect(96, 43, 16, 3)}`, H()],
    ['costumes', 'pixels', b, `${rect(70, 36, 3, 3)} ${rect(73, 39, 3, 3)} ${rect(96, 36, 3, 3)} ${rect(99, 39, 3, 3)}`, H()],
  ],
  caixaRobo: ({ a, b, g }) => [
    ['costumes', 'caixa', a, `${rect(56, 26, 68, 26)} ${furo(79, 38, 6, 5)} ${furo(101, 38, 6, 5)}`, H()],
    ['costumes', 'grade', b, `${rect(80, 46, 20, 2)} ${rect(64, 30, 6, 2)} ${rect(110, 30, 6, 2)}`, H()],
    ['costumes', 'luz', g, circ(90, 30, 2.2), H()],
  ],
  tapaOlho: ({ a, b }) => [
    ['costumes', 'tira', a, poly([[46, 22], [134, 46], [133, 49], [45, 25]]), H()],
    ['costumes', 'tapa', a, elip(79, 38, 11, 10), H()],
    ['costumes', 'brilho', b, circ(76, 35, 1.8), H()],
  ],
  lentes: ({ a, b }) => [
    ['costumes', 'irisE', a, circ(79, 39, 6.5), H({ alpha: 0.95 })],
    ['costumes', 'irisD', a, circ(101, 39, 6.5), H({ alpha: 0.95 })],
    ['costumes', 'tomoe', b, [0, 1, 2].map((i) => { const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 3; return `${circ(79 + Math.cos(ang) * 3.6, 39 + Math.sin(ang) * 3.6, 1.3)} ${circ(101 + Math.cos(ang) * 3.6, 39 + Math.sin(ang) * 3.6, 1.3)}`; }).join(' ') + ` ${circ(79, 39, 1.5)} ${circ(101, 39, 1.5)}`, H()],
  ],

  // ------------------------------------------------ pescoço
  medalhao: ({ a, b, g }) => {
    const [x, y] = colar(0.5);
    return [
      ['costumes', 'corda', b, corda(3.4)],
      ['costumes', 'medalha', a, circ(x, y + 9, 7.5)],
      ['costumes', 'marca', g, estrela(x, y + 9, 4.2)],
    ];
  },
  colarDentes: ({ a, b, g }) => [
    ['costumes', 'corda', b, corda(3)],
    ...[0.22, 0.34, 0.46, 0.58, 0.7].map((u, i) => {
      const [x, y] = colar(u);
      return ['costumes', `dente${i}`, a, poly([[x - 3.4, y + 2], [x + 3.4, y + 2], [x, y + 11]])];
    }),
    ['costumes', 'conta', g, circ(...colar(0.5).map((v, i) => (i ? v + 0.5 : v)), 2.4)],
  ],
  correnteOuro: ({ a, b, g }) => {
    const [x, y] = colar(0.5);
    return [
      ['costumes', 'corrente', a, corda(5)],
      ['costumes', 'elos', b, [0.15, 0.28, 0.41, 0.59, 0.72, 0.85].map((u) => { const [cx, cy] = colar(u); return circ(cx, cy + 2.5, 1.4); }).join(' ')],
      ['costumes', 'pingente', a, circ(x, y + 11, 6)],
      ['costumes', 'joia', g, circ(x, y + 11, 3)],
    ];
  },
  gravata: ({ a, b }) => [
    ['costumes', 'no', a, poly([[85, 86], [95, 86], [93, 94], [87, 94]])],
    ['costumes', 'corpo', a, poly([[87, 94], [93, 94], [98, 124], [90, 132], [82, 124]])],
    ['costumes', 'listras', b, `${poly([[86, 102], [95, 99], [96, 102], [86, 105]])} ${poly([[84, 113], [97, 109], [97, 112], [84, 116]])}`],
  ],
  gravataBorboleta: ({ a, b }) => [
    ['costumes', 'gola', b, poly([[72, 86], [90, 92], [108, 86], [104, 92], [90, 98], [76, 92]])],
    ['costumes', 'laco', a, poly([[76, 88], [88, 93], [76, 98]]) + ' ' + poly([[104, 88], [92, 93], [104, 98]])],
    ['costumes', 'no', a, rect(87, 90, 6, 6)],
  ],
  bandoleira: ({ a, b }) => [
    ['costumes', 'tira', a, poly([[46, 80], [56, 78], [128, 124], [120, 130]])],
    ['costumes', 'cartuchos', b, [0, 1, 2, 3, 4, 5].map((i) => { const x = 58 + i * 10.5, y = 86 + i * 6.6; return poly([[x, y - 5], [x + 4, y - 3], [x + 2, y + 3], [x - 2, y + 1]]); }).join(' ')],
  ],
  gola: ({ a, b }) => [
    ['costumes', 'golaE', a, poly([[56, 82], [88, 92], [80, 112], [50, 100]])],
    ['costumes', 'golaD', a, poly([[124, 82], [92, 92], [100, 112], [130, 100]])],
    ['costumes', 'botao', b, circ(90, 96, 2.2)],
  ],
  cachecol: ({ a, b }) => [
    ['costumes', 'volta', a, 'M48,82 C70,96 110,96 132,82 L132,94 C110,108 70,108 48,94 Z'],
    ['costumes', 'ponta', a, poly([[106, 96], [122, 94], [124, 128], [110, 130]])],
    ['costumes', 'listras', b, `${poly([[107, 108], [123, 106], [123, 110], [107, 112]])} ${poly([[108, 118], [124, 116], [124, 120], [108, 122]])} ${poly([[60, 92], [64, 94], [64, 102], [60, 100]])}`],
  ],
  sino: ({ a, b }) => [
    ['costumes', 'corda', b, corda(3.4)],
    ['costumes', 'sino', a, 'M80,118 C80,102 100,102 100,118 L103,123 L77,123 Z'],
    ['costumes', 'badalo', b, circ(90, 124, 2.6)],
  ],
  colarFlores: ({ a, b, g }) => [
    ['costumes', 'corda', a, corda(3)],
    ...[0.16, 0.3, 0.44, 0.56, 0.7, 0.84].map((u, i) => {
      const [x, y] = colar(u);
      return ['costumes', `flor${i}`, i % 2 ? b : g, estrela(x, y + 2, 5, 5, 0.6)];
    }),
  ],

  // ------------------------------------------------ costas (atrás do corpo)
  capa: ({ a, b }) => [
    ['costumeBack', 'capa', a, 'M44,78 C30,110 22,140 14,166 L166,166 C158,140 150,110 136,78 Z'],
    ['costumeBack', 'forro', b, 'M50,84 C40,112 34,140 28,164 L36,164 C42,140 50,112 58,86 Z M130,84 C140,112 146,140 152,164 L144,164 C138,140 130,112 122,86 Z'],
    ['costumeBack', 'gola', a, 'M38,82 C34,64 46,56 56,62 L62,82 Z M142,82 C146,64 134,56 124,62 L118,82 Z'],
  ],

  // ------------------------------------------------ pulsos (seguem os antebraços)
  munhequeiras: ({ a, b }) => pulsos((x0, x1, y) => [[`banda`, a, poly([[x0, y], [x1, y], [x1 + 1, y + 8], [x0 - 1, y + 8]])], ['listra', b, rect(x0, y + 3.2, x1 - x0, 1.6)]]),
  braceletes: ({ a, b }) => pulsos((x0, x1, y) => [[`banda`, a, poly([[x0 - 1, y - 2], [x1 + 1, y - 2], [x1 + 2, y + 9], [x0 - 2, y + 9]])], ['estrela', b, estrela((x0 + x1) / 2, y + 3.5, 3.4)]]),
  luvasBoxe: ({ a, b }) => pulsos((x0, x1, y, lado) => [[`luva`, a, elip(lado === 'E' ? 31 : 149, 154, 12, 10)], ['punho', b, rect(x0 + 1, y + 1, x1 - x0 - 2, 6)]]),
  garras: ({ a, b }) => pulsos((x0, x1, y, lado) => {
    const s = lado === 'E' ? -1 : 1, cx = lado === 'E' ? 31 : 149;
    return [['punho', b, rect(x0 + 2, y, x1 - x0 - 4, 6)], ['garras', a, [-5, 0, 5].map((d) => poly([[cx + d - 1.4, 152], [cx + d + 1.4, 152], [cx + d + s * 6, 126], [cx + d + s * 5.4, 125]])).join(' ')]];
  }),
  pincas: ({ a, b }) => pulsos((x0, x1, y, lado) => {
    const cx = lado === 'E' ? 31 : 149;
    return [['punho', b, rect(x0 + 2, y, x1 - x0 - 4, 6)], ['pinca', a, `M${cx - 10},156 C${cx - 14},140 ${cx - 4},130 ${cx + 2},134 L${cx - 2},144 L${cx + 8},140 C${cx + 12},150 ${cx + 4},162 ${cx - 10},156 Z`]];
  }),
  manopla: ({ a, b }) => pulsos((x0, x1, y, lado) => (lado === 'E' ? [] : [
    ['manopla', a, poly([[x0 - 2, y - 6], [x1 + 2, y - 6], [x1 + 4, 160], [x0 - 4, 160]])],
    ['joias', b, ['#e53935', '#ffb300', '#43a047', '#1e88e5', '#8e24aa', '#ff7043'].map((_, i) => circ(x0 + 3 + i * 3.6, 152, 1.5)).join(' ')],
  ])),

  // ------------------------------------------------ cintura
  cinturao: ({ a, b, g }) => [
    ['costumes', 'banda', a, rect(55, 123, 70, 7), { hideIf: 'sexy' }],
    ['costumes', 'placa', b, poly([[78, 119], [102, 119], [105, 126.5], [102, 134], [78, 134], [75, 126.5]]), { hideIf: 'sexy' }],
    ['costumes', 'joia', g, circ(90, 126.5, 3), { hideIf: 'sexy' }],
  ],
  faixaKarate: ({ a, b }) => [
    ['costumes', 'faixa', a, rect(55, 123, 70, 6), { hideIf: 'sexy' }],
    ['costumes', 'no', a, poly([[84, 121], [96, 121], [96, 131], [84, 131]]) + ' ' + poly([[86, 130], [91, 130], [86, 146], [81, 145]]) + ' ' + poly([[94, 130], [99, 130], [102, 145], [97, 146]]), { hideIf: 'sexy' }],
    ['costumes', 'ponta', b, `${rect(81, 141, 5, 3)} ${rect(97, 141, 5, 3)}`, { hideIf: 'sexy' }],
  ],
  cintoUtilidades: ({ a, b, g }) => [
    ['costumes', 'banda', a, rect(55, 123, 70, 7), { hideIf: 'sexy' }],
    ['costumes', 'bolsos', a, [60, 70, 104, 114].map((x) => rect(x, 121, 7, 11)).join(' '), { hideIf: 'sexy' }],
    ['costumes', 'fivela', b, rect(84, 121, 12, 11), { hideIf: 'sexy' }],
    ['costumes', 'spray', g, rect(88, 123, 4, 7), { hideIf: 'sexy' }],
  ],

  // ------------------------------------------------ bermuda (sobre a bermuda; a cor vem da paleta)
  liso: ({ b }) => [['shortsDetail', 'barra', b, poly([[56, 146], [124, 146], [125, 150], [55, 150]])]],
  listras: ({ b }) => [['shortsDetail', 'listras', b, [64, 76, 98, 110].map((x) => rect(x, 128, 4, 21)).join(' ')]],
  rasgada: ({ b, g }) => [
    ['shortsDetail', 'rasgos', b, poly([[55, 146], [62, 151], [68, 144], [76, 151], [84, 145], [92, 151], [100, 144], [108, 151], [116, 145], [125, 150], [125, 146], [55, 142]])],
    ['shortsDetail', 'remendo', g, rect(64, 132, 8, 7)],
  ],
  chamas: ({ b, g }) => [
    ['shortsDetail', 'chamas', b, poly([[56, 150], [58, 138], [63, 145], [67, 132], [72, 145], [76, 136], [80, 150]]) + ' ' + poly([[100, 150], [104, 136], [108, 145], [113, 132], [117, 145], [122, 138], [124, 150]])],
    ['shortsDetail', 'brasa', g, `${circ(67, 145, 1.6)} ${circ(113, 145, 1.6)}`],
  ],

};
// Pintura (sem contorno; por cima dos braços e do rosto). "listras" também existe
// na bermuda: cada parte tem a sua tabela de formas.
const PINTURA = {
  listras: ({ a, b }) => [
    ['nivelPintura', 'bracoE', a, [0, 1].map((i) => chevron(33, 104 + i * 7, 11, 3, 2.6)).join(' '), { parent: 'armL', alpha: 0.85 }],
    ['nivelPintura', 'bracoD', a, [0, 1].map((i) => chevron(147, 104 + i * 7, 11, 3, 2.6)).join(' '), { parent: 'armR', alpha: 0.85 }],
    ['nivelPintura', 'torso', b, `${poly([[50, 104], [59, 99], [61, 102.5], [52, 107.5]])} ${poly([[130, 104], [121, 99], [119, 102.5], [128, 107.5]])}`, { alpha: 0.85 }],
  ],
  azulGuerra: ({ a, b }) => [
    ['nivelPintura', 'testa', a, 'M52,26 C66,14 114,14 128,26 L126,30 C110,22 70,22 54,30 Z', H({ alpha: 0.85 })],
    ['nivelPintura', 'bochechas', a, `${poly([[46, 48], [64, 50], [62, 56], [46, 54]])} ${poly([[134, 48], [116, 50], [118, 56], [134, 54]])}`, H({ alpha: 0.85 })],
    ['nivelPintura', 'faixa', b, poly([[88, 14], [92, 14], [92, 24], [88, 24]]), H({ alpha: 0.85 })],
  ],
  cicatriz: ({ a }) => [
    ['nivelPintura', 'corte', a, poly([[66, 22], [69, 21], [92, 56], [89, 57]]), H({ alpha: 0.9 })],
    ['nivelPintura', 'pontos', a, [0.25, 0.5, 0.75].map((u) => { const x = 67.5 + u * 23, y = 21.5 + u * 35; return poly([[x - 4, y + 1], [x + 4, y - 2], [x + 4.5, y - 0.8], [x - 3.5, y + 2.2]]); }).join(' '), H({ alpha: 0.9 })],
  ],
  raioTesta: ({ a }) => [['nivelPintura', 'raio', a, poly([[96, 10], [90, 18], [95, 18], [88, 28], [100, 16], [95, 16], [100, 10]]), H({ alpha: 0.9 })]],
  luaTesta: ({ a }) => [['nivelPintura', 'lua', a, 'M84,18 C84,8 96,8 98,12 C92,10 88,14 90,20 C92,24 96,24 98,22 C94,28 84,26 84,18 Z', H({ alpha: 0.95 })]],
  marcaTesta: ({ a }) => [['nivelPintura', 'marca', a, `${rect(80, 10, 20, 2.6)} ${rect(80, 15, 20, 2.6)} ${rect(88.7, 8, 2.6, 13)}`, H({ alpha: 0.95 })]],
  neon: ({ a, b }) => [
    ['nivelPintura', 'peito', a, `${poly([[60, 96], [86, 104], [86, 106], [60, 98]])} ${poly([[120, 96], [94, 104], [94, 106], [120, 98]])}`, { alpha: 0.9 }],
    ['nivelPintura', 'bracos', a, rect(30, 100, 2, 22), { parent: 'armL', alpha: 0.9 }],
    ['nivelPintura', 'bracoD', a, rect(148, 100, 2, 22), { parent: 'armR', alpha: 0.9 }],
    ['nivelPintura', 'pontos', b, `${circ(60, 97, 1.8)} ${circ(120, 97, 1.8)}`, { alpha: 0.95 }],
  ],
  reator: ({ a, b }) => [
    ['nivelPintura', 'anel', b, `${circ(90, 100, 7)} ${furo(90, 100, 5, 5)}`, { alpha: 0.95 }],
    ['nivelPintura', 'luz', a, circ(90, 100, 5), { alpha: 0.9 }],
  ],
  sorriso: ({ a, b }) => [
    ['nivelPintura', 'boca', a, 'M44,58 C60,82 120,82 136,58 L134,64 C118,88 62,88 46,64 Z', H({ alpha: 0.6 })],
    ['nivelPintura', 'olhos', b, `${elip(79, 38, 12, 12)} ${elip(101, 38, 12, 12)}`, H({ alpha: 0.25 })],
  ],
  ventosas: ({ a, b }) => [
    ['nivelPintura', 'ventosasE', a, [0, 1, 2].map((i) => circ(33, 102 + i * 7, 2.6)).join(' '), { parent: 'armL', alpha: 0.9 }],
    ['nivelPintura', 'ventosasD', a, [0, 1, 2].map((i) => circ(147, 102 + i * 7, 2.6)).join(' '), { parent: 'armR', alpha: 0.9 }],
    ['nivelPintura', 'tentaculo', b, 'M60,108 C70,118 84,112 90,120 C84,116 72,122 58,112 Z', { alpha: 0.8 }],
  ],
  cromado: ({ a, b }) => [
    ['nivelPintura', 'boca', a, 'M52,60 C66,72 114,72 128,60 L126,66 C112,78 68,78 54,66 Z', H({ alpha: 0.75 })],
    ['nivelPintura', 'placas', b, `${rect(26, 104, 12, 8)} ${rect(142, 104, 12, 8)}`, { alpha: 0.7 }],
  ],
  aranha: ({ a }) => [['nivelPintura', 'aranha', a, 'M90,94 C84,94 82,100 86,104 L70,98 L68,100 L84,108 L66,114 L68,116 L86,110 C84,118 88,122 90,122 C92,122 96,118 94,110 L112,116 L114,114 L96,108 L112,100 L110,98 L94,104 C98,100 96,94 90,94 Z', { alpha: 0.9 }]],
  tatuagemEspartana: ({ a }) => [
    ['nivelPintura', 'rosto', a, poly([[62, 14], [70, 12], [72, 60], [64, 62]]), H({ alpha: 0.9 })],
    ['nivelPintura', 'torso', a, 'M58,90 C62,104 64,118 62,132 L68,132 C70,118 68,104 64,90 Z', { alpha: 0.9 }],
    ['nivelPintura', 'braco', a, poly([[26, 92], [32, 90], [36, 126], [30, 128]]), { parent: 'armL', alpha: 0.9 }],
  ],
  marcasMaldicao: ({ a }) => [
    ['nivelPintura', 'olhos', a, `${poly([[66, 48], [74, 48], [72, 51], [66, 51]])} ${poly([[114, 48], [106, 48], [108, 51], [114, 51]])}`, H({ alpha: 0.95 })],
    ['nivelPintura', 'testa', a, `${rect(86, 12, 8, 2.4)} ${rect(84, 17, 12, 2.4)}`, H({ alpha: 0.95 })],
    ['nivelPintura', 'bracos', a, `${rect(28, 110, 10, 2.4)} ${rect(28, 115, 10, 2.4)}`, { parent: 'armL', alpha: 0.95 }],
  ],
  marcasHollow: ({ a, b }) => [
    ['nivelPintura', 'listras', a, `${poly([[66, 24], [70, 24], [74, 56], [70, 56]])} ${poly([[114, 24], [110, 24], [106, 56], [110, 56]])}`, H({ alpha: 0.9 })],
    ['nivelPintura', 'chifre', b, poly([[124, 20], [138, 4], [132, 22]]), H({ alpha: 0.9 })],
  ],
  setaTesta: ({ a }) => [['nivelPintura', 'seta', a, 'M86,30 L86,12 L80,12 L90,0 L100,12 L94,12 L94,30 Z', H({ alpha: 0.95 })]],
  narizPalhaco: ({ a, b }) => [
    ['nivelPintura', 'nariz', a, circ(90, 51, 7), H({ alpha: 1 })],
    ['nivelPintura', 'brilho', b, circ(87, 48, 1.8), H({ alpha: 1 })],
  ],
  marcasTita: ({ a }) => [['nivelPintura', 'marcas', a, `${poly([[64, 46], [76, 46], [74, 52], [70, 58], [66, 52]])} ${poly([[116, 46], [104, 46], [106, 52], [110, 58], [114, 52]])}`, H({ alpha: 0.85 })]],
};

const AURA = {
  chamas: (c, t) => auraChamas(c, t),
  raios: (c, t) => [...auraChamas(c, t), ['nivelAura', 'raios', c.b, [[24, 40], [156, 40], [18, 100], [162, 100]].map(([x, y], i) => { const s = i % 2 ? -1 : 1; return poly([[x, y], [x + 8 * s, y + 10], [x + 3 * s, y + 11], [x + 10 * s, y + 24], [x - 1 * s, y + 9], [x + 4 * s, y + 8]]); }).join(' '), { alpha: 0.9 }]],
  sombras: (c, t) => [...auraChamas({ ...c, b: c.a }, t, 0.5), ['nivelAura', 'fumaca', c.b, [[20, 70], [160, 70], [30, 120], [150, 120], [90, -4]].map(([x, y]) => `M${x},${y + 12} C${x - 8},${y} ${x + 6},${y - 10} ${x},${y - 18} C${x + 12},${y - 8} ${x + 10},${y + 4} ${x},${y + 12} Z`).join(' '), { alpha: 0.55 }]],
  bolhas: (c, t) => [['nivelAura', 'bolhas', c.a, Array.from({ length: 10 + Math.round(t * 8) }, (_, i) => { const ang = Math.PI * (0.95 + (i / (9 + Math.round(t * 8))) * 1.1); return circ(90 + Math.cos(ang) * 76, 110 + Math.sin(ang) * 100, 4 + (i % 3) * 2.5 + t * 3); }).join(' '), { alpha: 0.55, dy: 'nvBolhas' }], ['nivelAura', 'brilhos', c.b, Array.from({ length: 6 }, (_, i) => { const ang = Math.PI * (1.05 + i * 0.16); return circ(90 + Math.cos(ang) * 76 - 2, 110 + Math.sin(ang) * 100 - 2, 1.6); }).join(' '), { alpha: 0.9 }]],
  estrelas: (c, t) => [...auraChamas(c, t, 0.35), ['nivelAura', 'estrelas', c.b, [[20, 50], [160, 50], [12, 100], [168, 100], [40, 0], [140, 0], [90, -20]].map(([x, y], i) => estrela(x, y, 5 + (i % 2) * 2)).join(' '), { alpha: 0.95 }]],
  notas: (c, t) => [...auraChamas(c, t, 0.45), ['nivelAura', 'notas', c.b, [[24, 60], [156, 60], [30, 10], [150, 10]].map(([x, y]) => `${elip(x, y + 14, 4.5, 3.4)} ${rect(x + 3, y, 1.8, 14)} ${poly([[x + 3, y], [x + 11, y + 4], [x + 11, y + 7], [x + 4.8, y + 3.4]])}`).join(' '), { alpha: 0.95 }]],
  dorsais: (c, t) => [...auraChamas(c, t, 0.5), ['nivelAura', 'dorsais', c.a, [[14, 100], [36, 40], [90, -16], [144, 40], [166, 100]].map(([x, y]) => `M${x - 9},${y + 12} C${x - 4},${y} ${x + 2},${y - 10} ${x + 8},${y - 16} C${x + 4},${y - 4} ${x + 6},${y + 6} ${x + 9},${y + 12} Z`).join(' '), { alpha: 0.95 }], ['nivelAura', 'agua', c.b, [[14, 112], [36, 52], [90, -4], [144, 52], [166, 112]].map(([x, y]) => rect(x - 12, y, 24, 2.4)).join(' '), { alpha: 0.9 }]],
};

const MAO = {
  pelucia: ({ a, b, g }) => [
    ['mao', 'corpo', a, 'M136,150 C140,138 160,134 172,142 L178,136 L176,148 C166,156 146,158 136,150 Z M152,138 L156,128 L160,138 Z'],
    ['mao', 'barriga', b, 'M140,150 C150,154 162,152 170,147 C162,156 146,157 140,150 Z'],
    ['mao', 'olho', g, circ(144, 144, 1.4)],
  ],
  barril: ({ a, b }) => [
    ['mao', 'barril', a, `${elip(160, 146, 10, 13)}`],
    ['mao', 'cordas', b, `${rect(150, 140, 20, 2)} ${rect(150, 151, 20, 2)} ${poly([[160, 133], [162, 133], [158, 112], [156, 112]])}`],
  ],
  espada: ({ a, b, g }) => [
    ['mao', 'lamina', a, poly([[146, 150], [152, 150], [152, 84], [149, 78], [146, 84]])],
    ['mao', 'guarda', b, rect(140, 148, 18, 4)],
    ['mao', 'cabo', b, rect(147, 152, 4, 12)],
    ['mao', 'pomo', g, circ(149, 166, 2.6)],
  ],
  espadaEnfaixada: ({ a, b, g }) => [
    ['mao', 'lamina', a, 'M144,150 L154,150 L156,80 C156,72 142,72 142,80 Z'],
    ['mao', 'faixas', b, [84, 96, 108, 120, 132].map((y) => poly([[142, y], [156, y - 4], [156, y], [142, y + 4]])).join(' ')],
    ['mao', 'cabo', g, rect(146, 150, 6, 14)],
  ],
  espadaGigante: ({ a, b, g }) => [
    ['mao', 'lamina', a, poly([[140, 150], [158, 150], [160, 62], [149, 54], [138, 62]])],
    ['mao', 'guarda', b, rect(136, 148, 26, 5)],
    ['mao', 'cabo', b, rect(146, 153, 6, 13)],
    ['mao', 'risco', g, rect(148, 70, 2, 74)],
  ],
  espadaRei: ({ a, b, g }) => [
    ['mao', 'lamina', b, poly([[146, 150], [152, 150], [152, 80], [149, 72], [146, 80]])],
    ['mao', 'guarda', a, 'M136,150 C140,144 158,144 162,150 L160,153 C156,149 142,149 138,153 Z'],
    ['mao', 'cabo', a, rect(147, 152, 4, 12)],
    ['mao', 'joia', g, circ(149, 149, 2.6)],
  ],
  prancha: ({ a, b, g }) => [
    ['mao', 'prancha', a, elip(164, 112, 9, 46)],
    ['mao', 'faixa', b, rect(162, 70, 4, 84)],
    ['mao', 'quilha', g, poly([[164, 150], [170, 162], [164, 160]])],
  ],
  cilindro: ({ a, b, g }) => [
    ['mao', 'tanque', a, 'M152,118 C152,110 168,110 168,118 L168,156 C168,162 152,162 152,156 Z'],
    ['mao', 'faixa', b, rect(152, 130, 16, 5)],
    ['mao', 'valvula', g, rect(157, 104, 6, 8)],
  ],
  arpao: ({ a, b, g }) => [
    ['mao', 'haste', a, rect(147, 72, 4, 96)],
    ['mao', 'ponta', b, poly([[143, 76], [149, 58], [155, 76], [151, 72], [147, 72]])],
    ['mao', 'corda', g, 'M151,90 C162,96 166,112 160,130 L158,129 C163,112 160,98 150,93 Z'],
  ],
  serra: ({ a, b, g }) => [
    ['mao', 'motor', a, rect(140, 140, 20, 16)],
    ['mao', 'barra', b, poly([[146, 140], [154, 140], [154, 86], [150, 80], [146, 86]])],
    ['mao', 'dentes', g, Array.from({ length: 8 }, (_, i) => poly([[154, 88 + i * 6.5], [158, 90 + i * 6.5], [154, 93 + i * 6.5]])).join(' ')],
  ],
  sabreLuz: ({ a, b }) => [
    ['mao', 'brilho', a, poly([[144, 150], [154, 150], [154, 74], [149, 68], [144, 74]]), { alpha: 0.55 }],
    ['mao', 'lamina', b, poly([[147, 150], [151, 150], [151, 76], [149, 72], [147, 76]])],
    ['mao', 'cabo', '#9e9e9e', rect(146, 148, 6, 16)],
  ],
  martelo: ({ a, b, g }) => [
    ['mao', 'cabo', b, rect(147, 120, 4, 44)],
    ['mao', 'cabeca', a, rect(136, 104, 26, 18)],
    ['mao', 'runas', g, `${rect(140, 110, 4, 6)} ${rect(147, 110, 4, 6)} ${rect(154, 110, 4, 6)}`],
  ],
  tridente: ({ a, b, g }) => [
    ['mao', 'haste', a, rect(147, 76, 4, 92)],
    ['mao', 'pontas', a, `${poly([[136, 80], [162, 80], [162, 84], [136, 84]])} ${poly([[136, 80], [139, 60], [141, 80]])} ${poly([[146, 80], [149, 52], [152, 80]])} ${poly([[157, 80], [159, 60], [162, 80]])}`],
    ['mao', 'joia', g, circ(149, 88, 2.8)],
    ['mao', 'faixa', b, rect(146, 96, 6, 4)],
  ],
  varinha: ({ a, b }) => [
    ['mao', 'varinha', a, poly([[147, 152], [150, 152], [164, 112], [162, 111]])],
    ['mao', 'ponta', b, circ(163, 111, 2.2)],
  ],
  lapis: ({ a, b, g }) => [
    ['mao', 'lapis', a, poly([[146, 150], [152, 150], [152, 116], [146, 116]])],
    ['mao', 'ponta', b, poly([[146, 116], [152, 116], [149, 106]])],
    ['mao', 'borracha', g, rect(146, 150, 6, 5)],
  ],
  cajado: ({ a, b, g }) => [
    ['mao', 'cajado', a, rect(147, 84, 4, 84)],
    ['mao', 'arco', b, `M139,84 C139,66 159,66 159,84 L155,84 C155,72 143,72 143,84 Z`],
    ['mao', 'joia', g, circ(149, 76, 4)],
  ],
  bengalaAmbar: ({ a, b, g }) => [
    ['mao', 'bengala', a, rect(147, 100, 4, 68)],
    ['mao', 'ambar', b, elip(149, 94, 6, 8)],
    ['mao', 'mosquito', g, circ(149, 94, 1.4)],
  ],
  escudo: ({ a, b, g }) => [
    ['mao', 'anel1', b, circ(158, 124, 20)],
    ['mao', 'anel2', g, circ(158, 124, 15)],
    ['mao', 'centro', a, circ(158, 124, 10)],
    ['mao', 'estrela', g, estrela(158, 124, 7.5)],
  ],
  microfone: ({ a, b }) => [
    ['mao', 'cabo', a, rect(147, 132, 5, 30)],
    ['mao', 'globo', b, circ(149.5, 128, 6)],
  ],
  toalha: ({ a, b }) => [
    ['mao', 'toalha', a, 'M140,126 L162,126 L164,168 L156,164 L150,170 L144,164 L138,168 Z'],
    ['mao', 'listras', b, `${rect(140, 132, 22, 3)} ${rect(140, 156, 23, 3)}`],
  ],
  caneca: ({ a, b, g }) => [
    ['mao', 'caneca', b, rect(142, 134, 16, 18)],
    ['mao', 'alca', b, `M158,138 C166,138 166,148 158,148 L158,145 C162,145 162,141 158,141 Z`],
    ['mao', 'cafe', a, rect(143, 135, 14, 4)],
    ['mao', 'vapor', g, 'M146,130 C142,124 150,120 146,114 L148,113 C152,120 144,124 148,130 Z M154,130 C150,124 158,120 154,114 L156,113 C160,120 152,124 156,130 Z'],
  ],
  fantoche: ({ a, b, g }) => [
    ['mao', 'boneco', a, 'M140,160 C138,140 142,128 150,126 C158,128 162,140 160,160 Z'],
    ['mao', 'cartola', b, `${rect(142, 112, 16, 14)} ${rect(138, 124, 24, 3)}`],
    ['mao', 'olhos', g, `${circ(147, 134, 2)} ${circ(153, 134, 2)}`],
  ],
  hankey: ({ a, b, g }) => [
    ['mao', 'corpo', a, 'M138,152 C134,140 140,130 150,128 C160,130 166,140 162,152 C158,158 142,158 138,152 Z'],
    ['mao', 'gorro', b, poly([[142, 130], [158, 128], [146, 114]])],
    ['mao', 'pompom', g, `${circ(146, 113, 2.4)} ${rect(141, 128, 18, 3)}`],
    ['mao', 'rosto', '#212121', `${circ(146, 138, 1.6)} ${circ(154, 138, 1.6)} M144,145 C148,150 152,150 156,145 L156,147 C152,152 148,152 144,147 Z`],
  ],
  prato: ({ a, b, g }) => [
    ['mao', 'prato', a, elip(152, 148, 15, 5)],
    ['mao', 'salada', b, 'M140,146 C140,136 150,134 154,140 C158,134 166,138 164,146 Z'],
    ['mao', 'tomate', g, `${circ(148, 142, 2.4)} ${circ(158, 142, 2.2)}`],
  ],
  cartaz: ({ a, b, g }) => [
    ['mao', 'cabo', b, rect(147, 110, 4, 56)],
    ['mao', 'placa', a, rect(128, 84, 44, 28)],
    ['mao', 'texto', g, `${rect(133, 90, 34, 3)} ${rect(133, 97, 28, 3)} ${rect(133, 104, 31, 3)}`],
  ],
  balde: ({ a, b, g }) => [
    ['mao', 'balde', a, poly([[138, 130], [164, 130], [160, 162], [142, 162]])],
    ['mao', 'borda', b, `${rect(136, 128, 30, 4)} M138,130 C140,114 162,114 164,130 L161,130 C159,118 143,118 141,130 Z`],
    ['mao', 'gelo', g, `${rect(142, 122, 6, 6)} ${rect(150, 120, 6, 6)} ${rect(157, 123, 5, 5)}`],
  ],
  spinner: ({ a, b, g }) => [
    ['mao', 'bracos', a, [0, 1, 2].map((i) => { const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 3; return circ(152 + Math.cos(ang) * 9, 138 + Math.sin(ang) * 9, 6.5); }).join(' ') + ` ${circ(152, 138, 6)}`],
    ['mao', 'rolamentos', b, [0, 1, 2].map((i) => { const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 3; return circ(152 + Math.cos(ang) * 9, 138 + Math.sin(ang) * 9, 3); }).join(' ')],
    ['mao', 'centro', g, circ(152, 138, 3)],
  ],
  celular: ({ a, b, g }) => [
    ['mao', 'corpo', a, rect(142, 126, 17, 30)],
    ['mao', 'tela', b, rect(144, 130, 13, 22)],
    ['mao', 'camera', g, circ(150.5, 128, 1.1)],
  ],
  biscoito: ({ a, b }) => [
    ['mao', 'biscoito', a, circ(152, 142, 11)],
    ['mao', 'gotas', b, `${circ(148, 138, 1.8)} ${circ(156, 140, 1.6)} ${circ(150, 146, 1.7)} ${circ(157, 147, 1.4)}`],
  ],
  baseado: ({ a, b, g }) => [
    ['mao', 'baseado', a, poly([[148, 152], [151, 154], [168, 130], [165, 128]])],
    ['mao', 'brasa', g, circ(166.5, 129, 2.2)],
    ['mao', 'fumaca', b, 'M166,124 C160,116 172,112 166,104 L168,103 C175,112 163,116 168,124 Z M171,120 C167,114 177,110 173,102 L175,101 C181,110 170,114 173,120 Z', { alpha: 0.7 }],
  ],
  leque: ({ a, b, g }) => [
    ['mao', 'leque', a, 'M150,152 L128,124 C136,110 164,110 172,124 Z'],
    ['mao', 'varetas', b, [128, 136, 144, 152, 160, 168].map((x) => poly([[150, 152], [x, 118], [x + 1.6, 118.6]])).join(' ')],
    ['mao', 'pino', g, circ(150, 150, 2)],
  ],
  livro: ({ a, b, g }) => [
    ['mao', 'capa', a, poly([[136, 132], [149, 136], [162, 132], [162, 156], [149, 160], [136, 156]])],
    ['mao', 'paginas', b, poly([[138, 134], [149, 138], [160, 134], [160, 154], [149, 158], [138, 154]])],
    ['mao', 'barbatana', g, poly([[152, 152], [156, 140], [158, 152]])],
  ],
};

/** Ponto na curva do colar (quadrática 58,88 → 90,112 → 122,88), logo abaixo do queixo. */
function colar(u) {
  const x = (1 - u) ** 2 * 58 + 2 * (1 - u) * u * 90 + u * u * 122;
  const y = (1 - u) ** 2 * 88 + 2 * (1 - u) * u * 112 + u * u * 88;
  return [x, y];
}
const corda = (w) => `M58,88 Q90,112 122,88 L122,${r1(88 + w)} Q90,${r1(112 + w)} 58,${r1(88 + w)} Z`;
const chevron = (cx, cy, w, h, th) => poly([[cx - w / 2, cy], [cx, cy + h], [cx + w / 2, cy], [cx + w / 2, cy + th], [cx, cy + h + th], [cx - w / 2, cy + th]]);

function pulsos(fn) {
  const out = [];
  for (const [lado, x0, x1, parent] of [['E', 21, 45, 'foreL'], ['D', 135, 159, 'foreR']]) {
    for (const [id, fill, path] of fn(x0, x1, 139, lado)) out.push(['costumeHand', `${id}${lado}`, fill, path, { parent }]);
  }
  return out;
}

function auraChamas({ a, b, g }, t, escala = 1) {
  const out = [];
  const camada = (id, fill, alpha, k, pontas) => {
    const rxi = 66 * k, ryi = 86 * k;
    const rxo = rxi + (8 + 12 * t) * k, ryo = ryi + (10 + 22 * t) * k;
    const a0 = Math.PI - 0.32, a1 = 2 * Math.PI + 0.32;
    const pts = [];
    for (let i = 0; i <= pontas * 2; i++) {
      const ang = a0 + (a1 - a0) * (i / (pontas * 2));
      const fora = i % 2 === 1;
      pts.push([Math.max(4, Math.min(176, 90 + Math.cos(ang) * (fora ? rxo : rxi))), Math.max(-26, 112 + Math.sin(ang) * (fora ? ryo : ryi))]);
    }
    out.push(['nivelAura', id, fill, poly(pts), { alpha: alpha * escala, scaleBy: 'nvAura', scalePivot: [90, 150] }]);
  };
  const pontas = Math.min(26, 11 + Math.floor(t * 14));
  camada('fora', a, 0.5 + 0.15 * t, 1, pontas);
  if (t >= 0.3) camada('meio', b, 0.4, 0.86, pontas - 2);
  if (t >= 0.65) camada('dentro', g, 0.35, 0.74, pontas - 4);
  return out;
}

// Pontos de acabamento por parte: a partir de um terço do caminho, a peça ganha brilhos.
const ANCORAS = {
  cabeca: { group: 'costumes', pts: [[60, -4], [120, -4], [90, -22], [46, 10]], extra: CABECA },
  rosto: { group: 'costumes', pts: [[62, 26], [118, 26], [90, 24], [56, 46]], extra: CABECA },
  pescoco: { group: 'costumes', pts: [[66, 96], [114, 96], [80, 104], [100, 104]] },
  costas: { group: 'costumeBack', pts: [[22, 120], [158, 120], [28, 150], [152, 150]] },
  pulsos: { group: 'costumeHand', pts: [[18, 138], [162, 138], [24, 134], [156, 134]] },
  cinto: { group: 'costumes', pts: [[62, 126.5], [118, 126.5], [70, 126.5], [110, 126.5]], extra: { hideIf: 'sexy' } },
  bermuda: { group: 'shortsDetail', pts: [[62, 140], [118, 140], [70, 134], [110, 134]] },
  pintura: { group: 'nivelPintura', pts: [[40, 96], [140, 96], [46, 126], [134, 126]] },
  aura: { group: 'nivelAura', pts: [[16, 60], [164, 60], [24, 16], [156, 16]] },
  mao: { group: 'costumeHand', pts: [[162, 96], [136, 100], [166, 124], [132, 124]], extra: { parent: 'foreR' } },
};

// ---------------------------------------------------------------- transformações

// Estilos de olho do renderizador (rig-renderer _olhoEstilo).
export const OLHOS = { anime: 1, pontos: 2, sharingan: 3, vazios: 4, pretos: 5, brilho: 6, coracao: 7, semicerrados: 8, grandes: 9 };
const escurece = (hex, k = 0.32) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (sh) => Math.round(((n >> sh) & 255) * (1 - k));
  return `#${((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1)}`;
};
/** Paleta da "pele" de um visual: corpo, barriga, músculo, cabeça, olhos. */
export function paletaPele(t) {
  const p = t?.pele;
  if (!p) return null;
  const out = {};
  if (p.corpo) { out.body = p.corpo; out.bodyShade = escurece(p.corpo, 0.15); out.muscle = p.musculo || escurece(p.corpo); out.nvCabecaPele = p.cabeca || p.corpo; out.nvBracos = p.corpo; out.nvPernas = p.corpo; }
  if (p.membros) { out.nvBracos = p.membros; out.nvPernas = p.membros; }
  if (p.bracos) out.nvBracos = p.bracos;
  if (p.pernas) out.nvPernas = p.pernas;
  if (p.cabeca) out.nvCabecaPele = p.cabeca;
  if (p.musculo) out.muscle = p.musculo;
  if (p.barriga) out.cream = p.barriga;
  if (p.olho) out.eye = p.olho;
  if (p.esclera) out.sclera = p.esclera;
  return Object.keys(out).length ? out : null;
}

/**
 * Partes do corpo transformado (sem pudor): barrigona, papada, manchas de panda,
 * orelhas redondas, suor, baba, sujeira e moscas. Cores da pele do próprio visual.
 */
function partesDoCorpo(t) {
  if (!t) return [];
  const out = [];
  const k = t.barrigona;
  if (k) {
    const rx = 34 * k, ry = 28 * k, cy = 120;
    // Balança (canal nvBarriga): a barrigona treme a partir de cima.
    const treme = { scaleBy: 'nvBarriga', scalePivot: [90, cy - ry] };
    out.push(['nivelCorpo', 'barriga', 'body', elip(90, cy, rx, ry), { hideIf: 'sexy', ...treme }]);
    out.push(['nivelCorpo', 'barrigaClara', 'cream', elip(90, cy + 3, rx * 0.7, ry * 0.72), { hideIf: 'sexy', ...treme }]);
    out.push(['nivelPintura', 'umbigo', '#5d4037', `M86,${r1(cy + 6)} C88,${r1(cy + 10)} 92,${r1(cy + 10)} 94,${r1(cy + 6)} L93,${r1(cy + 8)} C91,${r1(cy + 11)} 89,${r1(cy + 11)} 87,${r1(cy + 8)} Z`, { alpha: 0.8, ...treme }]);
  }
  if (t.papada) out.push(['nivelCorpo', 'papada', 'nvCabecaPele', 'M54,80 C60,100 120,100 126,80 C112,92 68,92 54,80 Z', H({ dy: 'nvPapada' })]);
  if (t.manchasOlhos) out.push(['headDetail', 'manchas', t.manchasOlhos, 'M60,30 C66,20 88,22 92,38 C95,54 78,62 66,56 C58,52 56,40 60,30 Z M120,30 C114,20 92,22 88,38 C85,54 102,62 114,56 C122,52 124,40 120,30 Z', H()]);
  if (t.orelhasRedondas) out.push(['costumeBack', 'orelhas', t.orelhasRedondas, `${circ(50, 16, 15)} ${circ(130, 16, 15)}`, H()]);
  if (t.suor) out.push(['costumes', 'suor', '#81d4fa', ['M56,26 C52,34 54,40 58,40 C62,40 63,34 56,26 Z', 'M122,30 C118,38 120,44 124,44 C128,44 129,38 122,30 Z', 'M64,12 C61,18 62,22 65,22 C68,22 69,18 64,12 Z'].join(' '), H({ alpha: 0.9, dy: 'nvSuor' })]);
  if (t.baba) out.push(['costumes', 'baba', '#c5e1a5', 'M118,66 C120,74 117,86 121,92 C124,96 128,92 125,86 C123,80 124,72 122,64 Z', H({ alpha: 0.9, scaleBy: 'nvBaba', scalePivot: [121, 64] })]);
  if (t.sujeira) out.push(['nivelPintura', 'sujeira', '#6d4c41', `${elip(70, 108, 6, 4)} ${elip(108, 122, 7, 4.5)} ${elip(96, 98, 3.5, 2.5)} ${elip(62, 128, 4, 3)}`, { alpha: 0.75 }]);
  // Orelhas, chifres, juba e antenas presos na cabeça (sem arquinho), na cor da pele.
  const cor = (c) => (c === 'cabeca' || !c ? 'nvCabecaPele' : c);
  const interno = '#f8bbd0';
  const orelhas = {
    ogro: ['M44,40 C30,38 24,30 26,22 C32,26 38,28 46,30 Z M136,40 C150,38 156,30 154,22 C148,26 142,28 134,30 Z', 'M34,30 C30,28 30,25 31,24 C34,26 37,27 40,28 Z M146,30 C150,28 150,25 149,24 C146,26 143,27 140,28 Z'],
    gato: ['M50,22 L54,-6 L74,12 Z M130,22 L126,-6 L106,12 Z', 'M55,14 L57,2 L66,11 Z M125,14 L123,2 L114,11 Z'],
    cachorro: ['M48,16 C34,18 30,40 38,52 C46,48 50,34 56,22 Z M132,16 C146,18 150,40 142,52 C134,48 130,34 124,22 Z', null],
    coelho: ['M66,14 C54,-10 56,-34 66,-36 C76,-34 78,-10 76,12 Z M114,14 C126,-10 124,-34 114,-36 C104,-34 102,-10 104,12 Z', 'M67,6 C61,-10 62,-26 66,-28 C70,-26 72,-10 71,6 Z M113,6 C119,-10 118,-26 114,-28 C110,-26 108,-10 109,6 Z'],
    elfo: ['M44,38 L18,20 L46,48 Z M136,38 L162,20 L134,48 Z', null],
    totoro: ['M60,16 L64,-12 L76,10 Z M120,16 L116,-12 L104,10 Z', null],
    pequenas: [`${circ(56, 12, 7)} ${circ(124, 12, 7)}`, `${circ(56, 12, 3.5)} ${circ(124, 12, 3.5)}`],
  };
  if (t.orelhas && orelhas[t.orelhas]) {
    const [fora, dentro] = orelhas[t.orelhas];
    out.push(['costumeBack', 'orelhasPele', cor(t.corOrelhas), fora, H()]);
    if (dentro) out.push(['costumeBack', 'orelhasDentro', t.corOrelhasDentro || interno, dentro, H()]);
  }
  if (t.chifres === 'inseto') out.push(['costumeBack', 'chifres', cor(t.corChifres || '#f5f5f5'), 'M58,16 C50,4 46,-12 52,-24 C56,-14 62,-4 70,8 Z M122,16 C130,4 134,-12 128,-24 C124,-14 118,-4 110,8 Z', H()]);
  if (t.chifres === 'diabo') out.push(['costumeBack', 'chifres', cor(t.corChifres || '#f5e6c8'), 'M60,14 C52,6 50,-6 56,-16 C58,-6 64,2 72,6 Z M120,14 C128,6 130,-6 124,-16 C122,-6 116,2 108,6 Z', H()]);
  if (t.juba) out.push(['costumeBack', 'juba', t.juba, estrela(90, 46, 66, 18, 0.78), H()]);
  if (t.antenas) out.push(['costumes', 'antenas', t.antenas, 'M78,12 C72,0 66,-12 60,-20 L63,-22 C70,-14 76,-2 82,10 Z M102,12 C108,0 114,-12 120,-20 L117,-22 C110,-14 104,-2 98,10 Z', H()], ['costumes', 'pontas', t.antenas, `${circ(61, -21, 3.4)} ${circ(119, -21, 3.4)}`, H()]);
  if (t.serraCabeca) out.push(['costumeBack', 'serraCabeca', '#9e9e9e', 'M82,14 L82,-30 L98,-30 L98,14 Z', H()], ['costumes', 'serraDentes', '#eceff1', Array.from({ length: 7 }, (_, i) => poly([[98, -28 + i * 6], [103, -25 + i * 6], [98, -22 + i * 6]])).join(' '), H()]);
  if (t.tenis) out.push(['nivelCorpo', 'tenis', t.tenis, `${elip(68, 164, 18, 6)} ${elip(112, 164, 18, 6)}`], ['nivelCorpo', 'sola', '#ffffff', `${rect(50, 166, 36, 2.6)} ${rect(94, 166, 36, 2.6)}`]);
  if (t.pintas) out.push(['nivelPintura', 'pintas', t.pintas, `${circ(66, 104, 3.6)} ${circ(110, 112, 4.4)} ${circ(84, 124, 2.8)} ${circ(118, 96, 2.4)} ${circ(58, 120, 2.6)}`, { alpha: 0.9 }], ['nivelPintura', 'pintasCabeca', t.pintas, `${circ(60, 24, 3)} ${circ(122, 30, 3.6)} ${circ(110, 14, 2.4)}`, H({ alpha: 0.9 })]);
  // Pelado sem pudor ("Tigresa, tire sua roupa"): quadril, virilha em V, pelos e tudo à mostra.
  // A bermuda some pelo canal `pelado`; o pinto balança pelo canal `tgPinto`.
  if (t.pelado) {
    // Só com o canal `pelado` (visual vestido ou depois que a bermuda voa na animação do meme).
    const nu = { showIf: 'pelado' };
    // Quadril sem contorno atravessado (emenda tronco e pernas) e só as laterais contornadas.
    out.push(['nivelPintura', 'quadril', 'body', 'M63,128 L117,128 L125,150 L55,150 Z', nu]);
    out.push(['nivelPintura', 'quadrilLados', '#17171f', 'M62,128 L65,128 L57,150 L53,150 Z M118,128 L115,128 L123,150 L127,150 Z', nu]);
    out.push(['nivelPintura', 'virilha', '#4a2a10', 'M64,128 Q78,140 86,146 Q76,138 67,128 Z M116,128 Q102,140 94,146 Q104,138 113,128 Z', { ...nu, alpha: 0.9 }]);
    out.push(['nivelCorpo', 'saco', 'body', `${circ(84, 151, 7.5)} ${circ(96, 151, 7.5)}`, { ...nu, dy: 'tgSaco' }]);
    out.push(['nivelCorpo', 'pinto', 'body', 'M85,136 C84,148 83,158 86,165 C88,170 93,170 95,165 C97,158 96,148 95,136 Z', { ...nu, pivot: [90, 137], rot: 'tgPinto' }]);
    out.push(['nivelPintura', 'cabecinha', '#e57373', 'M86,162 C87,167 93,168 94,162 C93,164 87,164 86,162 Z', { ...nu, pivot: [90, 137], rot: 'tgPinto' }]);
    out.push(['nivelPintura', 'pelos', '#2b1d14', 'M74,135 L77,128 L80,134 L84,127 L87,133 L90,126 L93,133 L96,127 L100,134 L103,128 L106,135 C96,140 84,140 74,135 Z', { ...nu, alpha: 0.95 }]);
  }
  if (t.moscas) {
    const mosca = ([x, y]) => `${circ(x, y, 2.4)} ${elip(x - 3, y - 3, 2.6, 1.4)} ${elip(x + 3, y - 3, 2.6, 1.4)}`;
    out.push(['nivelAura', 'moscas', '#212121', [[30, 30], [160, 80], [140, 120]].map(mosca).join(' '), { alpha: 0.95, dx: 'nvMoscaX', dy: 'nvMoscaY' }]);
    out.push(['nivelAura', 'moscas2', '#212121', [[150, 22], [22, 90]].map(mosca).join(' '), { alpha: 0.95, dx: 'nvMoscaY', dy: 'nvMoscaX' }]);
  }
  return out;
}

/**
 * "Luto do Shape": o visual do JoJo durante o funeral da comida fora da dieta. Vomitando
 * (jato verde da boca até a poça no chão) e chorando. Liga com o canal nvLuto.
 */
export function partesDoLuto() {
  const P = (group, id, fill, path, extra = {}) => ({ group, part: { id: `luto_${id}`, fill, showIf: 'nvLuto', path, ...extra } });
  return [
    P('nivelBrilho', 'jato', '#9ccc65', 'M80,66 C78,74 76,80 76,86 C84,84 96,84 104,86 C104,80 102,74 100,66 C94,70 86,70 80,66 Z', { ...CABECA, alpha: 0.95, scaleBy: 'nvLutoJato', scalePivot: [90, 66] }),
    P('nivelBrilho', 'queda', '#8bc34a', 'M80,92 C74,110 70,130 66,160 L114,160 C110,130 106,110 100,92 Z', { alpha: 0.85, dy: 'nvLutoQueda' }),
    P('nivelBrilho', 'pedacos', '#cddc39', `${circ(84, 112, 3)} ${circ(96, 126, 2.4)} ${circ(78, 140, 2.8)} ${circ(102, 146, 2.2)} ${circ(90, 100, 2)}`, { alpha: 0.95, dy: 'nvLutoQueda' }),
    P('nivelBrilho', 'poca', '#9ccc65', elip(90, 166, 42, 6), { alpha: 0.9 }),
    P('nivelBrilho', 'lagrimas', '#4fc3f7', 'M70,46 C66,56 68,62 72,62 C76,62 76,56 70,46 Z M110,46 C106,56 108,62 112,62 C116,62 116,56 110,46 Z', { ...CABECA, alpha: 0.95, dy: 'nvLutoLagrima' }),
  ];
}
export const LUTO = { nome: 'Luto do Shape' };
/** Visual do meme "Tigresa, tire sua roupa" (coleção memes BR). */
export const TIGRESA_ID = 'br01';

/** Canal de pose que liga a peça no desenho. */
export const canalDaPeca = (p) => `nv_${p.id}`;

/** Partes do rig de uma peça: [{group, part}]. */
export function partesDaPeca(p) {
  const c = p.cores;
  let lista;
  if (p.parte === 'aura') lista = (AURA[p.forma] || AURA.chamas)(c, p.t);
  else if (p.parte === 'pintura') lista = (PINTURA[p.forma] || PINTURA.listras)(c, p.t);
  else if (p.parte === 'mao') lista = (MAO[p.forma] || MAO.espada)(c, p.t).map(([, id, fill, path, extra]) => ['costumeHand', id, fill, path, { parent: 'foreR', ...(extra || {}) }]);
  else lista = (FORMAS[p.forma] || FORMAS[p.parte === 'bermuda' ? 'liso' : 'medalhao'])(c, p.t);
  const ch = canalDaPeca(p);
  lista = [...partesDoCorpo(p.transforma), ...lista];
  const out = lista.map(([group, id, fill, path, extra]) => ({ group, part: { id: `${p.id}_${id}`, fill, showIf: ch, path, ...(extra || {}) } }));
  // Acabamento pelo nível: 0 a 2 brilhos, num grupo sem contorno por cima de tudo.
  const anc = ANCORAS[p.parte];
  const n = Math.min(2, Math.floor(p.t * 3));
  for (let i = 0; i < n; i++) {
    const [x, y] = anc.pts[i];
    out.push({ group: 'nivelBrilho', part: { id: `${p.id}_brilho${i}`, fill: p.cores.g === '#ffffff' ? '#fffde7' : p.cores.g, showIf: ch, alpha: 0.9, path: brilho(x, y, 2.6 + p.t * 1.6), scaleBy: i % 2 ? 'nvBrilho2' : 'nvBrilho', scalePivot: [x, y], ...(anc.extra || {}) } });
  }
  return out;
}

/**
 * Rig com todas as peças (cada uma só aparece com o seu canal ligado). Não altera
 * o rig recebido. Grupos novos: aura atrás de tudo e pintura logo depois do
 * detalhe dos braços, ambos escondidos de costas (mooning).
 */
// Grupos do tronco (esticam com o corpo mais largo) e o dos braços (afastam para os lados).
const GRUPOS_CORPO = new Set(['costumeBack', 'legs', 'legDetail', 'sexyNet', 'body', 'bodyDetail', 'catalogChest', 'shorts', 'shortsDetail', 'sexyLayer', 'costumes', 'nivelAura', 'nivelPintura', 'nivelBrilho', 'nivelCorpo']);
const GRUPOS_CABECA_PELE = new Set(['head', 'headDetail']);
const GRUPOS_BRACOS = new Set(['arms']);
const GRUPOS_PERNAS = new Set(['legs']);

export function rigComVisuais(rig, dados) {
  const { referencias } = fonte(dados);
  if (!rig || referencias.length < 2 || typeof referencias[0] !== 'object') return rig;
  const pecas = gerarVisuais(dados);
  // Cópia das partes com as marcas de transformação (o rig original não muda).
  const groups = rig.groups.map((g) => ({ ...g, parts: g.parts.map((pt) => {
    const out = { ...pt };
    if (GRUPOS_CABECA_PELE.has(g.id) && pt.fill === 'body') out.fill = 'nvCabecaPele';
    if (GRUPOS_BRACOS.has(g.id) && pt.fill === 'body') out.fill = 'nvBracos';
    if (GRUPOS_PERNAS.has(g.id) && pt.fill === 'body') out.fill = 'nvPernas';
    if (g.id === 'arms' && !pt.parent && pt.pivot) out.ladoX = pt.pivot[0] < 90 ? -1 : 1;
    else if (GRUPOS_CORPO.has(g.id) && !pt.parent && pt.rot !== 'headRot') out.corpoX = true;
    return out;
  }) }));
  // Pelado (visual da Tigresa ou a animação do meme): a bermuda e a sunga somem.
  for (const g of groups) if (['shorts', 'shortsDetail', 'sexyLayer'].includes(g.id)) g.hideIf = [...new Set([...[].concat(g.hideIf || []), 'pelado'])];
  const aura = { id: 'nivelAura', hideIf: 'mooning', parts: [] };
  const pintura = { id: 'nivelPintura', hideIf: 'mooning', parts: [] };
  const brilhos = { id: 'nivelBrilho', hideIf: 'mooning', parts: [] };
  // Corpo transformado (barrigona, papada): por cima da bermuda e abaixo das peças e dos braços.
  const corpoGrupo = { id: 'nivelCorpo', hideIf: 'mooning', outline: true, parts: [] };
  const iShorts = groups.findIndex((g) => g.id === 'shortsDetail');
  groups.splice(iShorts >= 0 ? iShorts + 1 : groups.length, 0, corpoGrupo);
  const iArm = groups.findIndex((g) => g.id === 'armDetail');
  groups.splice(iArm >= 0 ? iArm + 1 : groups.length, 0, pintura);
  const iMao = groups.findIndex((g) => g.id === 'costumeHand');
  groups.splice(iMao >= 0 ? iMao + 1 : groups.length, 0, brilhos);
  groups.unshift(aura);
  const byId = new Map(groups.map((g) => [g.id, g]));
  const costumes = { ...(rig.costumes || {}) };
  for (const p of pecas) {
    if (p.parte === 'bermuda') costumes[`bermuda${p.id}`] = { palette: { shorts: p.cores.a, stripe: p.cores.b } };
    const pele = paletaPele(p.transforma);
    if (pele) costumes[`pele${p.id}`] = { palette: pele };
    for (const { group, part } of partesDaPeca(p)) {
      const alvo = byId.get(group) || byId.get('costumes');
      const marcado = { ...part };
      if (GRUPOS_CORPO.has(alvo.id) && !part.parent && part.rot !== 'headRot') marcado.corpoX = true;
      alvo.parts.push(marcado);
      // A animação do meme veste a Tigresa por alguns segundos (canal próprio, sem tocar no Guarda-roupa).
      if (p.id === TIGRESA_ID && marcado.showIf !== 'pelado') alvo.parts.push({ ...marcado, id: `${marcado.id}_meme`, showIf: 'tigresaAnim' });
    }
  }
  // Bermuda voando na animação do meme da Tigresa.
  byId.get('costumes').parts.push({ id: 'tigresa_bermudaVoando', fill: 'shorts', showIf: 'tgVoa', dx: 'tgVoaX', dy: 'tgVoaY', path: 'M62,126 L118,126 L125,150 L55,150 Z' });
  // Luto do Shape (funeral da comida fora da dieta): vômito verde e lágrimas, canal nvLuto.
  for (const { group, part } of partesDoLuto()) {
    const alvo = byId.get(group) || byId.get('costumes');
    alvo.parts.push(GRUPOS_CORPO.has(alvo.id) && !part.parent && part.rot !== 'headRot' ? { ...part, corpoX: true } : part);
  }
  return { ...rig, groups, costumes, palette: { ...rig.palette, nvCabecaPele: rig.palette.body, nvBracos: rig.palette.body, nvPernas: rig.palette.body } };
}

// ---------------------------------------------------------------- estado e uso

const _cache = new WeakMap();
function catalogo(referencias) {
  if (!_cache.has(referencias)) _cache.set(referencias, gerarVisuais(referencias));
  return _cache.get(referencias);
}

/** Só as peças já liberadas no nível atual (nunca uma bloqueada). */
export function visuaisLiberados(referencias, nivel) {
  return catalogo(referencias).filter((p) => p.nivel <= nivel);
}

/** Peça liberada pelo id (bloqueada ou inexistente → null, sem distinção). */
export function pecaLiberada(referencias, nivel, id) {
  return visuaisLiberados(referencias, nivel).find((p) => p.id === id) || null;
}

/** A peça mais recente de cada parte (a de nível mais alto). */
export function melhorConjunto(referencias, nivel) {
  const o = {};
  for (const p of visuaisLiberados(referencias, nivel)) o[p.parte] = p.id;
  return o;
}

const ids = (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string' && ID_VALIDO.test(x)))].slice(0, 400) : []);

/**
 * Estado salvo válido: {pecas: {parte: id}, visto: nível, novas: [ids ainda não
 * vistos na Central], avisar: [ids que o JoJo ainda não anunciou]}.
 */
export function sanitizeVisual(v, referencias = null) {
  const out = { pecas: {}, visto: 0, novas: [], avisar: [] };
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  const n = Number(v.visto);
  out.visto = Number.isInteger(n) && n >= 0 && n <= 10000 ? n : 0;
  out.novas = ids(v.novas);
  out.avisar = ids(v.avisar);
  const pecas = v.pecas && typeof v.pecas === 'object' && !Array.isArray(v.pecas) ? v.pecas : {};
  for (const [parte, id] of Object.entries(pecas)) {
    if (!PARTES.has(parte) || typeof id !== 'string' || !ID_VALIDO.test(id)) continue;
    if (referencias) {
      const p = catalogo(referencias).find((x) => x.id === id);
      if (!p || p.parte !== parte) continue;
    }
    out.pecas[parte] = id;
  }
  return out;
}

/**
 * Sobe de nível: veste as peças novas na parte delas; o resto fica como ela
 * deixou. Primeira vez (visto 0): veste a mais recente de cada parte.
 * Devolve {estado, novas} (novas = peças liberadas agora, em ordem de nível).
 */
export function aplicarNivel(estado, referencias, nivel) {
  const s = sanitizeVisual(estado, referencias);
  if (nivel <= s.visto) return { estado: s, novas: [] };
  const novas = catalogo(referencias).filter((p) => p.nivel > s.visto && p.nivel <= nivel);
  const pecas = s.visto === 0 ? melhorConjunto(referencias, nivel) : { ...s.pecas };
  if (s.visto !== 0) for (const p of novas) pecas[p.parte] = p.id;
  // Tudo o que foi liberado agora fica marcado como novo (Central) e a anunciar (JoJo).
  const novos = novas.map((p) => p.id);
  return { estado: { pecas, visto: nivel, novas: ids([...s.novas, ...novos]), avisar: ids([...s.avisar, ...novos]) }, novas };
}

/** Veste (ou tira, se já estava) uma peça liberada. Bloqueada → nada muda. */
export function vestirVisual(estado, referencias, nivel, id) {
  const s = sanitizeVisual(estado, referencias);
  const p = pecaLiberada(referencias, nivel, id);
  if (!p) return { estado: s, peca: null, tirou: false };
  const pecas = { ...s.pecas };
  const tirou = pecas[p.parte] === id;
  if (tirou) delete pecas[p.parte];
  else pecas[p.parte] = id;
  return { estado: { ...s, pecas }, peca: p, tirou };
}

// Fantasias festivas que trocam a cor da bermuda (rig.costumes com paleta).
const FANTASIA_COM_BERMUDA = new Set(['anoNovo', 'carnaval', 'festaJunina', 'natal', 'lanternaChinesa', 'chapeuVerde', 'patriota']);
// Fantasias que não ficam na cabeça (na mão ou no corpo): a peça de cabeça continua.
const FANTASIA_FORA_DA_CABECA = new Set(['diya', 'fanous', 'lanternaChinesa', 'lotus', 'flor', 'maca', 'arcoIris', 'patriota', 'halloween', 'tinta', 'gravata', 'cachecol']);
const FANTASIA_NA_MAO = new Set(['diya', 'fanous', 'lanternaChinesa', 'lotus', 'flor', 'maca', 'arcoIris', 'patriota']);

/**
 * Canais de pose das peças vestidas, sem brigar com o guarda-roupa, a fantasia do
 * dia ou uma animação que usa a mão: a parte ocupada não mostra a peça do nível.
 */
export function canaisVisual(estado, referencias, nivel, { outfit = {}, fantasia = null, maoLivre = true } = {}) {
  const s = sanitizeVisual(estado, referencias);
  const ocupado = new Set();
  if (outfit.cabeca) ocupado.add('cabeca');
  if (outfit.rosto) ocupado.add('rosto');
  if (outfit.pescoco) ocupado.add('pescoco');
  if (outfit.bermuda) ocupado.add('bermuda');
  if (outfit.mao || !maoLivre) ocupado.add('mao');
  if (outfit.corpo === 'capa') ocupado.add('costas');
  if (fantasia && !FANTASIA_FORA_DA_CABECA.has(fantasia)) ocupado.add('cabeca');
  if (fantasia && FANTASIA_COM_BERMUDA.has(fantasia)) ocupado.add('bermuda');
  if (fantasia && FANTASIA_NA_MAO.has(fantasia)) ocupado.add('mao');
  if (fantasia === 'halloween') ocupado.add('costas');
  const ch = {};
  const vestidas = [];
  for (const [parte, id] of Object.entries(s.pecas)) {
    if (ocupado.has(parte)) continue;
    const p = pecaLiberada(referencias, nivel, id);
    if (!p) continue;
    ch[canalDaPeca(p)] = 1;
    if (p.parte === 'bermuda') ch[`costume_bermuda${p.id}`] = 1;
    vestidas.push(p);
  }
  // Transformações (cabeça, corpo, boca, olhos, pele): a peça mais recente que define cada uma vence.
  vestidas.sort((a, b) => a.nivel - b.nivel || Number(!!a.extra) - Number(!!b.extra));
  let pele = null;
  for (const p of vestidas) {
    const t = p.transforma;
    if (!t) continue;
    if (t.cabeca) ch.nvCabeca = t.cabeca;
    if (t.corpo) ch.nvCorpo = t.corpo;
    if (t.boca) ch.nvBoca = t.boca;
    if (t.olhos && OLHOS[t.olhos]) ch.nvOlhos = OLHOS[t.olhos];
    if (paletaPele(t)) pele = p.id;
    if (t.pelado) ch.pelado = 1;
  }
  if (pele) ch[`costume_pele${pele}`] = 1;
  return Object.keys(ch).length ? ch : null;
}

/**
 * Resumo para a Central. Liberados: nome, obra, título do nível e a fala da
 * referência como descrição. Bloqueados: SÓ o número do nível que libera (nada
 * de nome, parte, cor, obra ou id), para virar um cadeado na tela.
 */
export function visualSnapshot(estado, referencias, nivel) {
  const s = sanitizeVisual(estado, referencias);
  const lib = visuaisLiberados(referencias, nivel);
  const novas = new Set(s.novas);
  const vestido = {};
  for (const [parte, id] of Object.entries(s.pecas)) if (lib.some((p) => p.id === id)) vestido[parte] = id;
  const partes = VISUAL_PARTES
    .map((pt) => ({ ...pt, itens: lib.filter((p) => p.parte === pt.id).reverse().map((p) => ({ id: p.id, nome: p.nome, nivel: p.nivel, titulo: p.titulo, obra: p.obra, descricao: p.fala, cor: p.cores.a, novo: novas.has(p.id) })) }))
    .filter((pt) => pt.itens.length);
  const bloqueados = catalogo(referencias).filter((p) => p.nivel > nivel).map((p) => ({ nivel: p.nivel }));
  return { vestido, partes, total: lib.length, novos: lib.filter((p) => novas.has(p.id)).length, bloqueados };
}

/** Marca todos os liberados como vistos na Central. */
export function marcarVistos(estado, referencias) {
  return { ...sanitizeVisual(estado, referencias), novas: [] };
}

/**
 * Aviso pendente (JoJo ainda não falou): uma peça → a fala da referência; várias →
 * quantas e as mais recentes. null se não há nada a anunciar.
 */
export function avisoVisual(estado, referencias, nivel) {
  const s = sanitizeVisual(estado, referencias);
  const pend = visuaisLiberados(referencias, nivel).filter((p) => s.avisar.includes(p.id));
  if (!pend.length) return null;
  const ultima = pend[pend.length - 1];
  const rotulo = (p) => (p.extra ? `Extra de ${p.colecao} do nível ${p.nivel}: ${p.titulo}.` : `Nível ${p.nivel}: ${p.titulo}.`);
  if (pend.length === 1) return { pecas: pend, ultima, texto: `${rotulo(ultima)} ${ultima.fala} Peça nova no Guarda-roupa.` };
  const nomes = pend.slice(-3).reverse().map((p) => p.nome);
  const resto = pend.length - nomes.length;
  return { pecas: pend, ultima, texto: `Seu nível já liberou ${pend.length} visuais: ${nomes.join(', ')}${resto > 0 ? ` e mais ${resto}` : ''}. Já estou com o mais recente de cada parte; o resto está no Guarda-roupa da Central.` };
}

/** Acha uma peça LIBERADA pelo nome, título ou id ("chapéu de palha", "nv017"). */
export function acharVisual(referencias, nivel, q) {
  const n = norm(q);
  if (!n) return null;
  const lib = visuaisLiberados(referencias, nivel);
  return lib.find((p) => p.id === n) || lib.find((p) => norm(p.nome) === n || norm(p.titulo) === n) || lib.find((p) => n.length >= 5 && (norm(p.nome).includes(n) || norm(p.titulo).includes(n))) || null;
}

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

// Falas genéricas só para tirar e para "o mais recente de cada parte"; vestir e
// subir de nível usam a fala da própria referência.
export const FALAS_VISUAL = {
  tira: ['Tirou? Tá. Continuo lindo do mesmo jeito.'],
  melhor: ['O mais recente de cada parte. Do jeito que eu mereço.'],
};
