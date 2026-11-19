// Memes BR no padrão da Tigresa (pedido de 19/11/2026): cada meme é uma FANTASIA INTEIRA
// (tronco, mangas, parte de baixo, pés, cabeça, rosto, pescoço e algo na mão, mais a pele
// e os traços presos na cabeça pelo `transforma`) e tem uma ANIMAÇÃO PRÓPRIA em três atos,
// como a da Tigresa: vira o personagem num puf, faz o gesto do meme com o objeto dele e
// fecha na pose com a fala. Os dados ficam em progressao.json (extras, coleção "memes BR",
// campos `fantasia` e `meme`); este módulo desenha, anima e reconhece a frase do meme.

const r1 = (n) => Math.round(n * 10) / 10;
const circ = (cx, cy, r) => `M${r1(cx - r)},${r1(cy)} a${r1(r)},${r1(r)} 0 1,0 ${r1(2 * r)},0 a${r1(r)},${r1(r)} 0 1,0 ${r1(-2 * r)},0 Z`;
const elip = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} a${r1(rx)},${r1(ry)} 0 1,0 ${r1(2 * rx)},0 a${r1(rx)},${r1(ry)} 0 1,0 ${r1(-2 * rx)},0 Z`;
const poly = (pts) => `M${pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' L')} Z`;
const rect = (x, y, w, h) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
const estrela = (cx, cy, r, n = 5, k = 0.45) => poly(Array.from({ length: n * 2 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / n;
  const rr = i % 2 ? r * k : r;
  return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
}));
const CABECA = { pivot: [90, 86], rot: 'headRot' };
const H = (extra = {}) => ({ ...CABECA, ...extra });

// ------------------------------------------------------------------ fantasia inteira

// Silhueta do tronco (a mesma do colete da Tigresa, que já assenta no corpo do JoJo).
const TRONCO = 'M50,84 C60,79 120,79 130,84 C141,90 143,101 137,109 C131,118 123,124 117,130 L63,130 C57,124 49,118 43,109 C37,101 39,90 50,84 Z';
const MANGA_E = 'M54,84 C40,80 28,90 27,104 L46,107 C48,99 52,93 58,90 Z';
const MANGA_D = 'M126,84 C140,80 152,90 153,104 L134,107 C132,99 128,93 122,90 Z';
// Antebraço inteiro (manga comprida), preso no antebraço de cada lado.
const ANTE_E = 'M24,104 L47,106 L46,140 L25,140 Z';
const ANTE_D = 'M156,104 L133,106 L134,140 L155,140 Z';

/** Estampa por cima do tronco (cor b), recortada pela silhueta só de olho: fica dentro dela. */
function estampa(tipo, cor) {
  switch (tipo) {
    case 'listras': return [rect(48, 92, 84, 5), rect(46, 104, 88, 5), rect(54, 116, 72, 5)].join(' ');
    case 'listrasV': return [rect(60, 84, 6, 44), rect(76, 82, 6, 47), rect(98, 82, 6, 47), rect(114, 84, 6, 44)].join(' ');
    case 'bolinhas': return [[58, 94], [78, 90], [102, 90], [122, 94], [66, 108], [90, 104], [114, 108], [76, 120], [104, 120]].map(([x, y]) => circ(x, y, 3.6)).join(' ');
    case 'flores': return [[60, 96], [88, 92], [118, 98], [72, 116], [106, 116]].map(([x, y]) => [0, 1, 2, 3, 4].map((i) => circ(x + 4 * Math.cos(i * 1.26), y + 4 * Math.sin(i * 1.26), 2.6)).join(' ')).join(' ');
    case 'xadrez': return [rect(48, 90, 84, 3), rect(46, 104, 88, 3), rect(54, 118, 72, 3), rect(64, 82, 3, 47), rect(88, 80, 3, 50), rect(112, 82, 3, 47)].join(' ');
    case 'estrelas': return [[62, 96], [90, 90], [118, 96], [76, 114], [104, 114]].map(([x, y]) => estrela(x, y, 5)).join(' ');
    case 'losangos': return [[64, 98], [90, 98], [116, 98], [77, 114], [103, 114]].map(([x, y]) => poly([[x, y - 7], [x + 6, y], [x, y + 7], [x - 6, y]])).join(' ');
    case 'faixa': return poly([[50, 86], [60, 84], [128, 124], [118, 128]]);
    case 'botoes': return [94, 104, 114, 124].map((y) => circ(90, y, 2)).join(' ') + ` ${rect(89, 86, 2, 42)}`;
    case 'numero10': return 'M74,94 L80,92 L80,118 L75,118 L75,99 L72,100 Z M92,92 C104,92 106,96 106,105 C106,114 104,118 92,118 C80,118 82,92 92,92 Z M92,97 C88,97 87,100 87,105 C87,110 88,113 92,113 C96,113 97,110 97,105 C97,100 96,97 92,97 Z';
    case 'coracao': return 'M90,118 C76,108 70,100 74,94 C78,88 86,90 90,96 C94,90 102,88 106,94 C110,100 104,108 90,118 Z';
    case 'brilhos': return [[60, 94], [84, 100], [110, 92], [70, 116], [100, 114], [122, 108]].map(([x, y]) => estrela(x, y, 3.4, 4, 0.35)).join(' ');
    case 'penas': return [[56, 100], [70, 110], [90, 112], [110, 110], [124, 100]].map(([x, y]) => `M${x},${y} C${x - 5},${y - 8} ${x - 2},${y - 14} ${x},${y - 18} C${x + 2},${y - 14} ${x + 5},${y - 8} ${x},${y} Z`).join(' ');
    case 'folhas': return [[56, 96], [74, 110], [96, 98], [116, 112], [124, 94]].map(([x, y]) => `M${x},${y} Q${x + 6},${y - 7} ${x + 12},${y - 2} Q${x + 6},${y + 4} ${x},${y} Z`).join(' ');
    default: return null;
  }
}

// Tom mais escuro da própria cor (sombra sólida; o desenho só aceita #rrggbb).
const sombra = (c, k = 0.72) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(c.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
const TRONCOS = {
  camiseta: (a) => [['nivelCorpo', 'tronco', a, TRONCO], ['nivelCorpo', 'gola', sombra(a), 'M74,82 C80,90 100,90 106,82 C100,86 80,86 74,82 Z']],
  regata: (a) => [['nivelCorpo', 'tronco', a, 'M58,84 C64,82 70,90 90,90 C110,90 116,82 122,84 C132,92 136,104 132,112 C128,120 122,126 117,130 L63,130 C58,126 52,120 48,112 C44,104 48,92 58,84 Z']],
  camisa: (a, b) => [['nivelCorpo', 'tronco', a, TRONCO], ['nivelCorpo', 'gola', b, 'M70,80 L90,92 L110,80 L112,86 L90,98 L68,86 Z'], ['nivelPintura', 'botoes', b, [96, 106, 116].map((y) => circ(90, y, 1.8)).join(' ')]],
  terno: (a, b, g) => [
    ['nivelCorpo', 'tronco', a, TRONCO],
    ['nivelCorpo', 'peito', '#f5f5f5', 'M74,82 L90,112 L106,82 Z'],
    ['nivelCorpo', 'lapelas', b, 'M70,82 L86,108 L78,112 L64,88 Z M110,82 L94,108 L102,112 L116,88 Z'],
    ['nivelPintura', 'gravata', g, 'M87,86 L93,86 L95,108 L90,114 L85,108 Z'],
  ],
  vestido: (a, b) => [
    ['nivelCorpo', 'saia', a, 'M60,120 L120,120 L138,162 C110,168 70,168 42,162 Z'],
    ['nivelCorpo', 'tronco', a, 'M56,86 C66,82 114,82 124,86 C132,96 132,110 122,124 L58,124 C48,110 48,96 56,86 Z'],
    ['nivelPintura', 'cintura', b, rect(58, 120, 64, 4)],
  ],
  macacao: (a, b) => [['nivelCorpo', 'tronco', a, TRONCO], ['nivelCorpo', 'peitilho', b, 'M70,96 L110,96 L112,130 L68,130 Z'], ['nivelPintura', 'alcas', b, 'M66,82 L72,82 L72,98 L66,98 Z M108,82 L114,82 L114,98 L108,98 Z']],
  colete: (a, b) => [['nivelCorpo', 'colete', a, 'M50,84 C58,80 74,80 82,84 L86,130 L63,130 C57,124 49,118 43,109 C37,101 39,90 50,84 Z M130,84 C122,80 106,80 98,84 L94,130 L117,130 C123,124 131,118 137,109 C143,101 141,90 130,84 Z'], ['nivelPintura', 'borda', b, 'M82,84 L84,84 L88,130 L86,130 Z M98,84 L96,84 L92,130 L94,130 Z']],
  puffer: (a, b) => [['nivelCorpo', 'colete', a, 'M48,86 C60,78 120,78 132,86 C142,96 142,110 134,122 L126,132 L54,132 L46,122 C38,110 38,96 48,86 Z'], ['nivelPintura', 'gomos', b, [96, 108, 120].map((y) => rect(46, y, 88, 1.6)).join(' ') + ` ${rect(89, 82, 2, 50)}`], ['nivelCorpo', 'camisaPuffer', '#90caf9', 'M74,80 L90,94 L106,80 Z']],
  avental: (a, b) => [['nivelCorpo', 'tronco', b, TRONCO], ['nivelCorpo', 'avental', a, 'M66,90 L114,90 L118,150 C100,154 80,154 62,150 Z'], ['nivelPintura', 'bolso', sombra(a), rect(80, 118, 20, 12)], ['nivelPintura', 'tiras', a, 'M66,90 L74,80 L77,82 L70,92 Z M114,90 L106,80 L103,82 L110,92 Z']],
  capa: (a, b) => [['costumeBack', 'capaCostas', a, 'M44,86 C30,120 26,150 22,168 L158,168 C154,150 150,120 136,86 Z'], ['nivelCorpo', 'tronco', '#1c1c22', TRONCO], ['nivelCorpo', 'golaCapa', b, 'M48,84 C40,74 44,62 52,58 L66,82 Z M132,84 C140,74 136,62 128,58 L114,82 Z']],
  pelagem: (a, b) => [['nivelCorpo', 'barrigaBicho', b, 'M66,88 C76,84 104,84 114,88 C122,100 122,118 112,130 L68,130 C58,118 58,100 66,88 Z']],
  // Boitatá: a cobra de fogo enrolada no tronco (a estampa `faixa` faz a volta).
  faixaFogo: (a, b, g) => [['nivelCorpo', 'cobraFogo', g, 'M44,96 C70,86 110,86 136,96 L134,106 C110,96 70,96 46,106 Z M46,116 C72,108 108,108 134,118 L130,128 C108,118 72,118 50,126 Z'], ['nivelPintura', 'escamasFogo', b, [[60, 96], [90, 92], [120, 96], [64, 118], [90, 114], [116, 118]].map(([x, y]) => circ(x, y, 2.4)).join(' ')]],
  tanga: () => [],
  uniforme: (a, b, g) => [['nivelCorpo', 'tronco', a, TRONCO], ['nivelCorpo', 'gola', b, 'M70,80 L90,90 L110,80 L112,86 L90,96 L68,86 Z'], ['nivelPintura', 'emblema', g, circ(110, 100, 5)]],
  bata: (a, b) => [['nivelCorpo', 'tronco', a, 'M46,86 C58,78 122,78 134,86 C144,104 142,124 136,140 L44,140 C38,124 36,104 46,86 Z'], ['nivelCorpo', 'decote', b, 'M74,82 C80,92 100,92 106,82 Z']],
  // Para os visuais de filme, anime e jogo (revisão de 19/11/2026).
  gi: (a, b) => [['nivelCorpo', 'tronco', a, TRONCO], ['nivelCorpo', 'cruzadoGi', sombra(a), 'M64,82 L104,126 L96,128 L58,88 Z M116,82 L84,118 L80,112 L110,82 Z'], ['nivelPintura', 'faixaGi', b, rect(50, 122, 80, 7)], ['nivelPintura', 'noGi', b, 'M92,128 L100,144 L96,146 L90,130 Z M88,128 L82,144 L86,146 L90,130 Z']],
  armadura: (a, b, g) => [['nivelCorpo', 'tronco', a, TRONCO], ['nivelCorpo', 'peitoral', sombra(a, 0.82), 'M58,88 C72,84 108,84 122,88 L118,112 C104,118 76,118 62,112 Z'], ['nivelPintura', 'placas', b, [rect(56, 114, 68, 3), rect(60, 122, 60, 3), rect(88, 86, 4, 28)].join(' ')], ['nivelPintura', 'rebitesArmadura', g, [[62, 92], [118, 92], [64, 108], [116, 108]].map(([x, y]) => circ(x, y, 2.2)).join(' ')], ['costumeHand', 'ombreiraE', b, 'M56,84 C42,76 26,84 26,98 L48,96 Z', { parent: 'armL' }], ['costumeHand', 'ombreiraD', b, 'M124,84 C138,76 154,84 154,98 L132,96 Z', { parent: 'armR' }]],
  jaqueta: (a, b) => [['nivelCorpo', 'camisaJaqueta', b, 'M70,82 L110,82 L114,130 L66,130 Z'], ['nivelCorpo', 'jaquetaE', a, 'M50,84 C58,80 70,80 76,82 L82,130 L63,130 C57,124 49,118 43,109 C37,101 39,90 50,84 Z'], ['nivelCorpo', 'jaquetaD', a, 'M130,84 C122,80 110,80 104,82 L98,130 L117,130 C123,124 131,118 137,109 C143,101 141,90 130,84 Z'], ['nivelPintura', 'golaJaqueta', sombra(a), 'M70,80 L80,96 L74,98 L64,84 Z M110,80 L100,96 L106,98 L116,84 Z']],
  jaleco: (a, b) => [['nivelCorpo', 'jalecoLongo', a, 'M46,86 C58,78 122,78 134,86 C142,104 140,130 138,154 L42,154 C40,130 38,104 46,86 Z'], ['nivelCorpo', 'camisaJaleco', b, 'M76,82 L104,82 L98,128 L82,128 Z'], ['nivelPintura', 'lapelaJaleco', sombra(a, 0.86), 'M74,82 L86,110 L80,112 L68,86 Z M106,82 L94,110 L100,112 L112,86 Z'], ['nivelPintura', 'bolsoJaleco', sombra(a, 0.86), rect(108, 100, 14, 10)]],
  sobretudo: (a, b) => [['costumeBack', 'abaSobretudo', a, 'M44,100 C38,130 36,150 34,170 L146,170 C144,150 142,130 136,100 Z'], ['nivelCorpo', 'tronco', a, TRONCO], ['nivelCorpo', 'golaAlta', sombra(a), 'M58,84 C52,72 56,62 64,60 L76,84 Z M122,84 C128,72 124,62 116,60 L104,84 Z'], ['nivelPintura', 'botoesSobretudo', b, [94, 106, 118].map((y) => `${circ(80, y, 2)} ${circ(100, y, 2)}`).join(' ')]],
  toga: (a, b) => [['nivelCorpo', 'toga', a, 'M50,84 C70,80 86,82 96,86 L134,112 C126,122 120,128 117,130 L63,130 C55,122 46,112 42,104 C40,96 44,88 50,84 Z'], ['nivelPintura', 'dobraToga', b, 'M96,86 L134,112 L130,116 L92,90 Z']],
};

// Quadril na cor da pele por baixo das peças pequenas (a bermuda do JoJo some com a fantasia).
const QUADRIL = ['nivelCorpo', 'quadrilFantasia', 'body', 'M63,128 L117,128 L125,150 L55,150 Z'];
const BAIXOS = {
  calca: (c) => [['nivelCorpo', 'calca', c, 'M58,128 L122,128 L128,158 L94,158 L90,142 L86,158 L52,158 Z']],
  bermuda: (c) => [['nivelCorpo', 'bermudaF', c, 'M58,128 L122,128 L126,150 L94,150 L90,140 L86,150 L54,150 Z']],
  short: (c) => [['nivelCorpo', 'short', c, 'M60,128 L120,128 L123,142 L94,142 L90,136 L86,142 L57,142 Z']],
  saia: (c) => [['nivelCorpo', 'saiaB', c, 'M60,126 L120,126 L134,152 C106,158 74,158 46,152 Z']],
  bombacha: (c, g) => [['nivelCorpo', 'bombacha', c, 'M58,128 L122,128 C134,140 132,152 126,158 L96,158 L90,142 L84,158 L54,158 C48,152 46,140 58,128 Z'], ['nivelPintura', 'faixaCintura', g, rect(57, 127, 66, 5)]],
  sunga: (c) => [QUADRIL, ['nivelCorpo', 'sunga', c, 'M62,128 L118,128 L112,140 C102,146 78,146 68,140 Z']],
  tanga: (c) => [QUADRIL, ['nivelCorpo', 'tangaF', c, 'M60,128 L120,128 L114,134 L104,150 L96,138 L90,152 L84,138 L76,150 L66,134 Z']],
  cauda: (c, g) => [['nivelCorpo', 'caudaSereia', c, 'M56,126 L124,126 C128,140 116,152 104,158 L130,168 L50,168 L76,158 C64,152 52,140 56,126 Z'], ['nivelPintura', 'escamas', g, [[72, 138], [90, 140], [108, 138], [80, 150], [100, 150]].map(([x, y]) => `M${x - 5},${y} Q${x},${y + 5} ${x + 5},${y} Q${x},${y + 2} ${x - 5},${y} Z`).join(' ')]],
  macacao: (c) => [['nivelCorpo', 'pernasMacacao', c, 'M58,128 L122,128 L128,160 L94,160 L90,142 L86,160 L52,160 Z']],
  nenhum: () => [QUADRIL],
};

const PES = {
  chinelo: (c) => [['nivelCorpo', 'chinelo', c, `${elip(68, 166, 17, 3.4)} ${elip(112, 166, 17, 3.4)}`], ['nivelPintura', 'tira', '#ffffff', 'M64,163 L70,158 L72,159 L67,164 Z M108,163 L114,158 L116,159 L111,164 Z']],
  bota: (c) => [['nivelCorpo', 'botas', c, 'M54,150 L84,150 L86,168 L50,168 Z M96,150 L126,150 L130,168 L94,168 Z']],
  sapato: (c) => [['nivelCorpo', 'sapatos', c, `${elip(68, 165, 18, 5)} ${elip(112, 165, 18, 5)}`]],
  tenis: (c) => [['nivelCorpo', 'tenisF', c, `${elip(68, 164, 18, 6)} ${elip(112, 164, 18, 6)}`], ['nivelCorpo', 'solaF', '#ffffff', `${rect(50, 166, 36, 2.6)} ${rect(94, 166, 36, 2.6)}`]],
  invertidos: (c) => [['nivelCorpo', 'pesVirados', c, 'M52,160 C46,164 48,170 58,170 L84,170 L84,160 Z M128,160 C134,164 132,170 122,170 L96,170 L96,160 Z']],
  sandalia: (c) => [['nivelCorpo', 'sandalias', c, `${rect(52, 164, 32, 4)} ${rect(96, 164, 32, 4)}`], ['nivelPintura', 'tirasSandalia', c, 'M66,164 L68,156 L70,156 L70,164 Z M110,164 L112,156 L114,156 L114,164 Z']],
  descalco: () => [],
  // Abaporu: um pé enorme na frente.
  peGigante: (c) => [['nivelCorpo', 'peGigante', c, 'M58,150 C40,150 22,156 22,166 C22,174 60,176 104,174 C114,172 114,160 104,154 Z'], ['nivelPintura', 'dedos', sombra(c), [30, 42, 54, 66].map((x) => elip(x, 168, 4, 3)).join(' ')]],
};

// Cabeça: o que vai no topo (chapéu, peruca, cabelo) e atrás (cabelo comprido, abas).
const CABECAS = {
  peruca: (c) => [['costumeBack', 'cabeloAtras', c, 'M38,30 C34,60 38,96 46,118 L64,112 C58,92 56,60 60,32 Z M142,30 C146,60 142,96 134,118 L116,112 C122,92 124,60 120,32 Z'], ['costumes', 'franja', c, 'M50,26 C56,2 124,2 130,26 C116,16 104,22 90,16 C76,22 64,16 50,26 Z', H()]],
  coque: (c) => [['costumes', 'cabeloTopo', c, 'M50,24 C56,4 124,4 130,24 C112,16 68,16 50,24 Z', H()], ['costumes', 'coque', c, circ(90, -2, 12), H()]],
  bobs: (c, g) => [['costumes', 'lenco', c, 'M48,26 C52,0 128,0 132,26 C112,18 68,18 48,26 Z', H()], ['costumes', 'bobs', g, [60, 76, 92, 108, 122].map((x, i) => circ(x, 8 - (i % 2) * 4, 5)).join(' '), H()]],
  chapeuCangaceiro: (c, g) => [['costumes', 'abaMeiaLua', c, 'M24,22 C40,-10 140,-10 156,22 C130,8 50,8 24,22 Z', H()], ['costumes', 'copaCouro', c, 'M62,14 C64,-6 116,-6 118,14 Z', H()], ['costumes', 'estrelasChapeu', g, `${estrela(90, 2, 6)} ${estrela(70, 8, 3.6)} ${estrela(110, 8, 3.6)}`, H()]],
  chapeuPalha: (c, g) => [['costumes', 'abaPalha', c, elip(90, 18, 56, 8), H()], ['costumes', 'copaPalha', c, 'M64,18 C64,-4 116,-4 116,18 Z', H()], ['costumes', 'fitaPalha', g, rect(64, 10, 52, 4), H()]],
  chapeuGaucho: (c, g) => [['costumes', 'abaGaucho', c, elip(90, 16, 58, 7), H()], ['costumes', 'copaGaucho', c, 'M62,16 L66,-6 L114,-6 L118,16 Z', H()], ['costumes', 'barbicacho', g, 'M40,20 C46,60 70,80 90,82 L90,84 C68,82 44,62 38,20 Z', H()]],
  bone: (c, g) => [['costumes', 'copaBone', c, 'M52,22 C54,-2 126,-2 128,22 Z', H()], ['costumes', 'abaBone', g, 'M118,18 C134,16 150,20 156,26 L120,26 Z', H()]],
  gorroSaci: (c) => [['costumes', 'gorroCone', c, 'M52,22 C58,4 76,-14 104,-26 C98,-10 116,6 128,22 C110,14 70,14 52,22 Z', H()], ['costumes', 'pomponzinho', '#ffffff', circ(104, -26, 4), H()]],
  cartola: (c, g) => [['costumes', 'abaCartola', c, elip(90, 16, 46, 6), H()], ['costumes', 'tuboCartola', c, rect(66, -30, 48, 46), H()], ['costumes', 'fitaCartola', g, rect(66, 6, 48, 6), H()]],
  panela: (c) => [['costumes', 'panelaCabeca', c, 'M52,22 C52,-6 128,-6 128,22 Z', H()], ['costumes', 'caboPanela', '#424242', rect(128, 8, 34, 6), H()]],
  fogo: (c, g) => [['costumeBack', 'chamasCabelo', c, 'M40,30 C34,10 46,-6 54,-18 C56,-6 62,0 68,-4 C66,-18 74,-30 84,-36 C84,-22 92,-14 98,-10 C100,-24 110,-32 120,-34 C116,-20 124,-8 132,-6 C136,4 140,18 140,30 Z', H()], ['costumeBack', 'chamasMiolo', g, 'M56,26 C54,12 62,2 66,-6 C70,6 78,4 84,-14 C88,0 96,2 102,-10 C106,4 116,6 122,0 C126,10 126,20 124,26 Z', H()]],
  palhaco: (c) => [['costumeBack', 'tufos', c, `${circ(40, 30, 16)} ${circ(140, 30, 16)} ${circ(46, 12, 12)} ${circ(134, 12, 12)}`, H()]],
  topete: (c) => [['costumes', 'topete', c, 'M56,22 C54,-4 90,-14 120,-4 C110,0 124,10 128,22 C110,12 76,12 56,22 Z', H()]],
  cabeloLongo: (c) => [['costumeBack', 'cabeloLongo', c, 'M36,28 C30,70 34,110 40,140 L62,136 C56,100 54,60 58,30 Z M144,28 C150,70 146,110 140,140 L118,136 C124,100 126,60 122,30 Z'], ['costumes', 'topoLongo', c, 'M48,26 C54,0 126,0 132,26 C112,14 68,14 48,26 Z', H()]],
  crista: (c) => [['costumes', 'crista', c, 'M70,14 C66,0 74,-8 80,-2 C80,-12 90,-16 94,-6 C98,-14 108,-10 106,0 C112,-4 118,4 112,14 Z', H()]],
  penacho: (c, g) => [['costumeBack', 'penacho', c, Array.from({ length: 7 }, (_, i) => { const x = 50 + i * 13; return `M${x},16 C${x - 8},${-10 - (i % 2) * 8} ${x - 4},${-30 - (3 - Math.abs(3 - i)) * 6} ${x + 2},${-36 - (3 - Math.abs(3 - i)) * 6} C${x + 6},${-20} ${x + 8},${-4} ${x + 6},16 Z`; }).join(' '), H()], ['costumes', 'tiaraPenacho', g, 'M52,22 C60,10 120,10 128,22 C110,16 70,16 52,22 Z', H()]],
  fitas: (c, g) => [['costumes', 'chapeuFitas', c, 'M56,20 C58,-2 122,-2 124,20 Z', H()], ['costumeBack', 'fitasCaindo', g, [46, 62, 78, 102, 118, 134].map((x, i) => rect(x, 18, 5, 70 + (i % 3) * 14)).join(' '), H()]],
  mascara: (c, g) => [['costumes', 'mascaraBate', c, 'M46,30 C46,0 134,0 134,30 L134,60 C120,70 60,70 46,60 Z', H()], ['costumes', 'olhosMascara', '#111111', `${elip(72, 40, 8, 6)} ${elip(108, 40, 8, 6)}`, H()], ['costumes', 'bocaMascara', g, 'M70,56 C80,64 100,64 110,56 C100,60 80,60 70,56 Z', H()]],
  gota: (c) => [['costumes', 'pontaGota', c, 'M56,22 C64,2 80,-16 90,-36 C100,-16 116,2 124,22 C104,12 76,12 56,22 Z', H()]],
  semCabeca: (c, g) => [['costumes', 'fogoPescoco', c, 'M54,84 C44,60 52,30 66,10 C68,26 76,30 80,18 C84,2 92,-8 98,-14 C98,4 106,12 112,6 C120,26 132,50 126,84 Z'], ['costumes', 'fogoMiolo', g, 'M66,84 C60,64 66,44 74,32 C78,46 86,44 90,30 C96,42 104,46 108,36 C116,52 118,70 114,84 Z']],
  lenco: (c) => [['costumes', 'lencoCabeca', c, 'M48,26 C52,2 128,2 132,26 C112,18 68,18 48,26 Z M128,22 L146,30 L132,34 Z', H()]],
  cincoFios: (c) => [['costumes', 'cincoFios', c, [70, 80, 90, 100, 110].map((x) => `M${x - 1},14 C${x - 3},4 ${x - 1},-4 ${x + 1},-10 L${x + 2},-9 C${x + 1},-3 ${x},4 ${x + 1.4},14 Z`).join(' '), H()]],
  cartolaPalheta: (c, g) => [['costumes', 'abaPalheta', c, elip(90, 14, 44, 6), H()], ['costumes', 'copaPalheta', c, rect(64, -6, 52, 20), H()], ['costumes', 'fitaPalheta', g, rect(64, 4, 52, 5), H()]],
  cascoTatu: (c, g) => [['costumeBack', 'casco', c, 'M40,40 C40,-10 140,-10 140,40 Z', H()], ['costumes', 'gomosCasco', g, [52, 66, 80, 94, 108, 122].map((x) => rect(x, -2, 2.4, 22)).join(' '), H({ alpha: 0.6 })]],
  chapeuBruxa: (c, g) => [['costumes', 'abaBruxa', c, elip(90, 18, 54, 7), H()], ['costumes', 'conoBruxa', c, 'M62,18 C70,0 84,-24 112,-44 C102,-24 112,0 118,18 Z', H()], ['costumes', 'fivela', g, rect(80, 8, 20, 8), H()]],
  capacete: (c, g) => [['costumes', 'capaceteCasco', c, 'M44,40 C40,0 140,0 136,40 L136,48 L44,48 Z', H()], ['costumes', 'viseira', g, 'M50,30 C70,24 110,24 130,30 L128,42 C110,38 70,38 52,42 Z', H({ alpha: 0.85 })]],
  coroa: (c, g) => [['costumes', 'coroa', c, 'M56,22 L54,-6 L68,8 L78,-12 L90,6 L102,-12 L112,8 L126,-6 L124,22 Z', H()], ['costumes', 'joias', g, `${circ(90, 14, 3.4)} ${circ(70, 16, 2.6)} ${circ(110, 16, 2.6)}`, H()]],
  chapeuPirata: (c, g) => [['costumes', 'tricornio', c, 'M30,22 C40,-2 66,-10 90,-10 C114,-10 140,-2 150,22 C130,12 108,18 90,10 C72,18 50,12 30,22 Z', H()], ['costumes', 'caveira', g, `${circ(90, 2, 5)} ${rect(84, 8, 12, 2)}`, H()]],
  bandana: (c) => [['costumes', 'bandanaTesta', c, 'M48,28 C66,20 114,20 132,28 L132,36 C114,28 66,28 48,36 Z', H()], ['costumeBack', 'pontasBandana', c, 'M130,30 L160,40 L150,46 L132,36 Z M130,32 L156,54 L146,58 L130,38 Z', H()]],
  elmo: (c, g) => [['costumes', 'elmoCasco', c, 'M46,30 C46,-2 134,-2 134,30 L134,40 L46,40 Z', H()], ['costumes', 'chifresElmo', g, 'M50,18 C34,10 28,-8 32,-22 C38,-8 48,-2 58,6 Z M130,18 C146,10 152,-8 148,-22 C142,-8 132,-2 122,6 Z', H()], ['costumes', 'nasal', g, rect(87, 24, 6, 24), H()]],
  quepe: (c, g) => [['costumes', 'copaQuepe', c, 'M50,22 C50,0 130,0 130,22 Z', H()], ['costumes', 'palaQuepe', '#212121', 'M50,22 C70,30 110,30 130,22 L130,26 C110,34 70,34 50,26 Z', H()], ['costumes', 'insignia', g, estrela(90, 10, 5), H()]],
  fedora: (c, g) => [['costumes', 'abaFedora', c, elip(90, 18, 50, 6), H()], ['costumes', 'copaFedora', c, 'M62,18 C62,-8 118,-8 118,18 C104,8 76,8 62,18 Z', H()], ['costumes', 'fitaFedora', g, rect(62, 10, 56, 5), H()]],
  espetado: (c) => [['costumes', 'cabeloEspetado', c, 'M46,28 L36,6 L56,12 L52,-14 L72,2 L80,-26 L92,-2 L106,-24 L110,4 L130,-12 L124,12 L146,6 L134,28 C110,18 70,18 46,28 Z', H()]],
  orelhasBicho: (c, g) => [['costumes', 'orelhasRedondas', c, `${circ(52, 10, 14)} ${circ(128, 10, 14)}`, H()], ['costumes', 'orelhasMiolo', g, `${circ(52, 10, 7)} ${circ(128, 10, 7)}`, H()]],
  careca: () => [],
  nenhuma: () => [],
};

const ROSTOS = {
  bigode: (c) => [['headDetail', 'bigode', c, 'M66,62 C74,54 84,56 90,60 C96,56 106,54 114,62 C104,64 96,64 90,62 C84,64 76,64 66,62 Z', H()]],
  bigodao: (c) => [['headDetail', 'bigodao', c, 'M56,64 C66,50 84,54 90,58 C96,54 114,50 124,64 C112,62 100,66 90,62 C80,66 68,62 56,64 Z', H()]],
  oculos: (c) => [['headDetail', 'oculosRosto', c, `${circ(72, 44, 11)} ${circ(108, 44, 11)} ${rect(82, 42, 16, 2.4)}`, H({ alpha: 0.9 })]],
  juliet: (c) => [['headDetail', 'juliet', c, 'M56,36 C66,32 84,34 88,40 C86,52 66,54 58,46 Z M124,36 C114,32 96,34 92,40 C94,52 114,54 122,46 Z M86,38 L94,38 L94,41 L86,41 Z', H()]],
  narizPalhaco: () => [['headDetail', 'narizVermelho', '#e53935', circ(90, 52, 7), H()]],
  maquiagemPalhaco: () => [['headDetail', 'caraBranca', '#fafafa', 'M58,40 C58,28 122,28 122,40 C122,56 104,64 90,64 C76,64 58,56 58,40 Z', H({ alpha: 0.85 })], ['headDetail', 'narizBozo', '#e53935', circ(90, 50, 7), H()]],
  batom: (c) => [['headDetail', 'batom', c, 'M66,64 C76,70 104,70 114,64 C104,66 76,66 66,64 Z', H()], ['headDetail', 'blushRosto', '#f48fb1', `${elip(60, 54, 7, 4)} ${elip(120, 54, 7, 4)}`, H({ alpha: 0.7 })]],
  bico: (c) => [['headDetail', 'bico', c, 'M80,50 C86,44 104,46 112,56 C104,62 92,66 80,60 Z', H()]],
  bochechas: (c) => [['headDetail', 'bochechonas', c, `${circ(58, 58, 14)} ${circ(122, 58, 14)}`, H()]],
  barba: (c) => [['nivelCorpo', 'barbaRosto', c, 'M54,70 C58,96 76,104 90,104 C104,104 122,96 126,70 C112,80 68,80 54,70 Z', H()]],
  oculosEscuros: (c) => [['headDetail', 'oculosEscuros', c, 'M56,38 L86,38 L84,50 L60,50 Z M94,38 L124,38 L120,50 L96,50 Z M86,40 L94,40 L94,42 L86,42 Z', H()]],
  mascaraOlhos: (c) => [['headDetail', 'mascaraOlhos', c, 'M52,36 C70,30 110,30 128,36 L126,50 C110,46 70,46 54,50 Z', H()]],
  cachimbo: (c) => [['headDetail', 'cachimbo', c, 'M108,64 L132,66 L132,62 C138,60 142,62 142,70 C140,76 132,76 130,70 L108,68 Z', H()], ['headDetail', 'fumacinha', '#eeeeee', `${circ(140, 54, 4)} ${circ(146, 44, 5)} ${circ(140, 32, 6)}`, H({ alpha: 0.7, dy: 'mbFumaca' })]],
  nenhum: () => [],
};

const PESCOCOS = {
  perolas: () => [['nivelPintura', 'perolas', '#fffdf5', [68, 76, 84, 92, 100, 108].map((x, i) => circ(x + 2, 84 + Math.sin((i / 5) * Math.PI) * 6, 3)).join(' ')]],
  corrente: (c) => [['nivelPintura', 'correntao', c, 'M64,82 C74,104 106,104 116,82 L112,82 C104,98 76,98 68,82 Z'], ['nivelPintura', 'pingente', c, circ(90, 102, 6)]],
  lencoPescoco: (c) => [['nivelCorpo', 'lencoPescoco', c, 'M66,80 L114,80 L90,104 Z']],
  gravataBorboleta: (c) => [['nivelPintura', 'borboleta', c, 'M78,80 L90,86 L102,80 L102,92 L90,86 L78,92 Z']],
  babado: (c) => [['nivelCorpo', 'babado', c, Array.from({ length: 6 }, (_, i) => circ(64 + i * 10.4, 84, 6)).join(' ')]],
  colar: (c) => [['nivelPintura', 'colarFlores', c, Array.from({ length: 7 }, (_, i) => circ(62 + i * 9.3, 84 + Math.sin((i / 6) * Math.PI) * 10, 4)).join(' ')]],
  nenhum: () => [],
};

// Objeto na mão direita (preso no antebraço, como as armas dos visuais): cada meme tem o seu.
const MAOS = {
  taca: (c) => [['tacaVidro', '#e3f2fd', 'M146,128 L164,128 C164,140 158,146 155,146 C152,146 146,140 146,128 Z M154,146 L156,146 L156,158 L154,158 Z M148,158 L162,158 L162,161 L148,161 Z'], ['tacaVinho', c, 'M147,132 L163,132 C162,140 158,144 155,144 C152,144 148,140 147,132 Z']],
  chimarrao: (c) => [['cuia', c, 'M146,138 C146,128 164,128 164,138 C164,150 158,156 155,156 C152,156 146,150 146,138 Z'], ['bomba', '#cfd8dc', 'M156,130 L160,112 L162,112 L158,130 Z'], ['erva', '#7cb342', elip(155, 131, 8, 2.6)]],
  espeto: (c) => [['espetoHaste', '#b0bec5', 'M148,150 L176,100 L178,102 L150,152 Z'], ['carnes', c, `${circ(159, 132, 6)} ${circ(166, 119, 6)} ${circ(172, 108, 5)}`]],
  celular: (c) => [['celularZap', '#212121', 'M148,124 L164,124 L164,154 L148,154 Z'], ['telaZap', c, 'M150,127 L162,127 L162,150 L150,150 Z'], ['florZap', '#f06292', `${circ(156, 136, 3)} ${circ(153, 140, 2.4)} ${circ(159, 140, 2.4)}`]],
  biscoito: (c) => [['pacote', c, 'M144,124 L168,124 L166,156 L146,156 Z'], ['biscoitos', '#d7a86e', `${circ(156, 132, 5)} ${circ(156, 144, 5)}`]],
  galao: (c) => [['galaoMate', c, 'M146,122 L166,122 L168,158 L144,158 Z'], ['torneira', '#ffd54f', rect(140, 150, 6, 4)]],
  coxinhaMao: (c) => [['coxinha', c, 'M156,118 C150,128 146,140 148,150 C152,158 160,158 164,150 C166,140 162,128 156,118 Z']],
  sombrinha: (c, g) => [['caboSombrinha', '#5d4037', rect(154, 104, 2.4, 52)], ['sombrinha', c, 'M130,108 C134,86 176,86 180,108 C170,102 140,102 130,108 Z'], ['gomosSombrinha', g, 'M154,88 L156,88 L150,106 L148,106 Z M154,88 L156,88 L162,106 L160,106 Z']],
  bexiga: (c) => [['fio', '#424242', 'M156,150 L158,100 L159,100 L157,150 Z'], ['bexiga', c, elip(158, 86, 14, 18)]],
  vacina: (c) => [['seringa', '#e3f2fd', 'M140,144 L164,120 L168,124 L144,148 Z'], ['liquido', c, 'M146,140 L159,127 L162,130 L149,143 Z'], ['agulha', '#9e9e9e', 'M166,122 L177,111 L178,112 L167,123 Z']],
  livro: (c) => [['livroCapa', c, 'M144,126 L170,122 L172,152 L146,156 Z'], ['livroFolhas', '#fffde7', 'M147,128 L168,125 L169,150 L148,153 Z']],
  giz: (c) => [['regua', c, 'M138,150 L174,114 L178,118 L142,154 Z']],
  flor: (c) => [['caule', '#43a047', rect(155, 110, 2.4, 44)], ['petalas', c, [0, 1, 2, 3, 4].map((i) => circ(156 + 7 * Math.cos(i * 1.26), 104 + 7 * Math.sin(i * 1.26), 5)).join(' ')], ['miolo', '#ffeb3b', circ(156, 104, 4)]],
  espelho: (c) => [['espelhoMoldura', c, elip(158, 120, 12, 15)], ['espelhoVidro', '#e1f5fe', elip(158, 120, 9, 12)], ['espelhoCabo', c, rect(156, 134, 4, 20)]],
  vela: (c) => [['vela', c, rect(152, 120, 8, 34)], ['chama', '#ffb300', 'M156,104 C150,112 152,120 156,120 C160,120 162,112 156,104 Z']],
  boiMini: (c, g) => [['boizinho', c, elip(160, 132, 16, 10)], ['chifresBoi', g, 'M146,124 L140,114 L148,122 Z M174,124 L180,114 L172,122 Z']],
  bandeira: (c, g) => [['mastro', '#795548', rect(154, 92, 2.4, 64)], ['bandeiraPano', c, 'M157,92 L179,98 L157,110 Z'], ['bandeiraDetalhe', g, circ(164, 100, 3.4)]],
  ovo: (c) => [['ovo', c, elip(156, 136, 9, 12)]],
  microfone: (c) => [['micro', '#424242', 'M152,132 L160,132 L158,156 L154,156 Z'], ['microCabeca', c, circ(156, 126, 7)]],
  queijo: (c) => [['queijo', c, 'M142,140 L172,128 L172,150 L142,156 Z'], ['furos', '#e0b84a', `${circ(152, 146, 2)} ${circ(162, 140, 2.4)} ${circ(166, 148, 1.6)}`]],
  unhas: (c) => [['unhasLongas', c, 'M150,150 C155,156 158,164 157,170 L160,170 C162,162 159,154 154,148 Z M156,148 C162,153 167,160 167,168 L170,168 C171,158 166,151 160,146 Z M144,150 C146,157 146,164 143,170 L146,171 C150,164 150,157 148,150 Z']],
  pacoteDinheiro: (c) => [['notas', c, rect(144, 130, 26, 16)], ['cifrao', '#1b5e20', 'M155,134 C150,134 150,140 156,140 C162,140 162,146 156,146 L154,146 M157,132 L157,148', { alpha: 0.9 }]],
  cuiaFolha: (c) => [['folhaMao', c, 'M144,150 C140,130 156,114 176,110 C172,130 162,146 144,150 Z']],
  espada: (c, g) => [['lamina', c, 'M150,140 L178,98 L180,100 L154,144 Z'], ['guarda', g, 'M144,136 L158,146 L156,149 L142,139 Z'], ['punho', '#3e2723', 'M146,144 L150,148 L144,156 L140,152 Z']],
  martelo: (c, g) => [['caboMartelo', '#6d4c41', rect(154, 108, 4, 48)], ['cabecaMartelo', c, rect(140, 96, 32, 16)], ['runas', g, `${rect(146, 102, 6, 3)} ${rect(160, 102, 6, 3)}`]],
  tridente: (c) => [['hasteTridente', c, rect(155, 84, 3, 74)], ['pontas', c, 'M146,96 L146,80 L149,86 L149,96 L154,96 L156,74 L159,74 L161,96 L166,96 L166,86 L169,80 L169,98 L146,98 Z']],
  cajado: (c, g) => [['hasteCajado', c, rect(155, 90, 3.4, 68)], ['joiaCajado', g, circ(156.7, 86, 7)]],
  escudo: (c, g) => [['escudo', c, circ(158, 130, 17)], ['escudoAnel', g, circ(158, 130, 11)], ['escudoCentro', c, estrela(158, 130, 7)]],
  caneca: (c) => [['caneca', c, rect(146, 128, 18, 22)], ['alcaCaneca', c, 'M164,132 C172,132 172,146 164,146 L164,142 C168,142 168,136 164,136 Z']],
  placa: (c, g) => [['caboPlaca', '#795548', rect(155, 112, 3, 46)], ['placa', c, rect(134, 90, 44, 26)], ['textoPlaca', g, [rect(140, 96, 32, 3), rect(140, 103, 26, 3)].join(' ')]],
  bola: (c, g) => [['bola', c, circ(158, 130, 11)], ['gomosBola', g, 'M148,126 C154,130 162,130 168,126 L168,128 C162,132 154,132 148,128 Z M157,119 L159,119 L159,141 L157,141 Z']],
  nenhum: () => [],
};

/**
 * Partes de uma fantasia inteira: [grupo, id, cor, path, extra]. Cores: `cores.a` é a cor
 * principal, `b` a do detalhe e `g` a do brilho; cada slot pode trazer a própria cor.
 */
export function fantasiaInteira(f, cores) {
  const { a, b, g } = cores;
  const cor = (k, padrao) => f.cores?.[k] || padrao;
  const out = [];
  out.push(...(TRONCOS[f.tronco] || TRONCOS.camiseta)(cor('tronco', a), cor('detalhe', b), cor('brilho', g)));
  const est = f.estampa && estampa(f.estampa);
  if (est && f.tronco !== 'tanga' && f.tronco !== 'pelagem') out.push(['nivelPintura', 'estampa', cor('estampa', b), est, { alpha: 0.95 }]);
  if (f.mangas === 'curta' || f.mangas === 'longa') {
    const m = cor('mangas', cor('tronco', a));
    out.push(['costumeHand', 'mangaE', m, MANGA_E, { parent: 'armL' }], ['costumeHand', 'mangaD', m, MANGA_D, { parent: 'armR' }]);
    if (f.mangas === 'longa') out.push(['costumeHand', 'anteE', m, ANTE_E, { parent: 'foreL' }], ['costumeHand', 'anteD', m, ANTE_D, { parent: 'foreR' }]);
  }
  // baixo null: a parte de baixo é a bermuda do próprio visual (fica a dele).
  if (f.baixo !== null) out.push(...(BAIXOS[f.baixo] || BAIXOS.calca)(cor('baixo', b), cor('brilho', g)));
  out.push(...(PES[f.pes] || PES.descalco)(cor('pes', '#3e2723')));
  out.push(...(CABECAS[f.cabeca] || CABECAS.nenhuma)(cor('cabeca', b), cor('brilho', g)));
  for (const r of [].concat(f.rosto || [])) out.push(...(ROSTOS[r] || ROSTOS.nenhum)(cor('rosto', '#3e2723')));
  out.push(...(PESCOCOS[f.pescoco] || PESCOCOS.nenhum)(cor('pescoco', g)));
  if (f.mao && MAOS[f.mao]) out.push(...MAOS[f.mao](cor('mao', g), cor('maoDetalhe', b)).map(([id, fill, path, extra]) => ['costumeHand', `mao_${id}`, fill, path, { parent: 'foreR', ...(extra || {}) }]));
  return out;
}

export const SLOTS = { TRONCOS, BAIXOS, PES, CABECAS, ROSTOS, PESCOCOS, MAOS };

// ------------------------------------------------------------------ animação própria

/** Canal que veste a fantasia do meme durante a animação dele. */
export const canalMeme = (id) => `meme_${id}`;
/** Id da animação (e do item da Coleção) de um meme. */
export const animDoMeme = (id) => (/^br\d/.test(id) ? `memeBr_${id}` : `visual_${id}`);
/** Animações com fantasia inteira: Tigresa, memes BR e o show de cada visual. */
export const ehAnimFantasia = (nome) => nome === 'tigresa' || /^(memeBr|visual)_/.test(nome || '');
// Valor de cada canal fora da animação (o mesmo que o desenho assume sem visual).
const NEUTRO = { mbPufK: 1, nvCabeca: 1, nvCorpo: 1, nvBoca: 1, nvBrilhos: -1, nvOlhoRx: 1, nvOlhoRy: 1 };
const neutro = (ch) => NEUTRO[ch] ?? 0;

const k = (pts) => pts.map(([t, v, s]) => (s ? [t, v, s] : [t, v]));
// Oscila entre dois valores em `n` batidas dentro de [t0, t1].
function batidas(t0, t1, n, v1, v2, repouso = 0) {
  const out = [[0, repouso], [t0, repouso]];
  for (let i = 0; i < n; i++) out.push([t0 + ((t1 - t0) * (i + 0.5)) / n, i % 2 ? v2 : v1]);
  out.push([t1, repouso], [1, repouso]);
  return out;
}

/**
 * Gestos do ato 2 (cada meme escolhe um em `meme.gesto`): o que os braços, as pernas,
 * a cabeça e o corpo fazem enquanto o objeto do meme se mexe.
 */
const GESTOS = {
  // Contas flutuando em volta da cabeça (Nazaré): cabeça inclina de um lado pro outro.
  confusa: () => ({ headRot: batidas(0.2, 0.8, 6, -10, 10), brow: k([[0, 0.3], [0.2, 1], [0.8, 1], [1, 0.3]]), legFR: k([[0, 0], [0.2, 40], [0.8, 40], [1, 0]]), elbowR: k([[0, 0], [0.2, 120], [0.8, 120], [1, 0]]) }),
  // Aponta com raiva e bate o pé (Carminha, Odete).
  apontar: () => ({ legFR: k([[0, 0], [0.2, 80, 'step'], [0.8, 80], [1, 0]]), elbowR: k([[0, 0], [0.2, 10, 'step'], [1, 0]]), browAngry: k([[0, 0], [0.2, 1, 'step'], [0.85, 1], [1, 0]]), legBR: batidas(0.25, 0.75, 6, 14, 0), jaw: batidas(0.22, 0.8, 8, 1, 0.3, 0.4) }),
  // Ergue o objeto num brinde e gira o pulso.
  brinde: () => ({ legFR: k([[0, 0], [0.2, 110], [0.8, 110], [1, 0]]), elbowR: batidas(0.2, 0.8, 4, 40, 70), headRot: k([[0, 0], [0.2, -6], [0.8, -6], [1, 0]]), happyEyes: k([[0, 0], [0.2, 1, 'step'], [0.85, 1], [1, 0, 'step']]) }),
  // Pula num pé só (Saci) e gira.
  pulo: () => ({ rootY: batidas(0.18, 0.82, 8, -26, 0), legBL: k([[0, 0], [0.15, 70, 'step'], [0.85, 70], [1, 0, 'step']]), rootRot: batidas(0.18, 0.82, 4, -8, 8) }),
  // Samba: quadril e braços pra cima.
  samba: () => ({ rootX: batidas(0.15, 0.85, 14, -6, 6), rootRot: batidas(0.15, 0.85, 14, 5, -5), legFL: k([[0, 0], [0.15, 150], [0.85, 150], [1, 0]]), legFR: k([[0, 0], [0.15, 150], [0.85, 150], [1, 0]]), legBL: batidas(0.15, 0.85, 14, 12, -4), legBR: batidas(0.15, 0.85, 14, -4, 12), happyEyes: k([[0, 0], [0.15, 1, 'step'], [0.9, 1], [1, 0, 'step']]) }),
  // Grito com a boca escancarada e o corpo tremendo (Zé Pequeno, Canarinho Pistola).
  grito: () => ({ jaw: k([[0, 0.4], [0.2, 1, 'step'], [0.8, 1], [1, 0.4]]), browAngry: k([[0, 0], [0.2, 1, 'step'], [0.85, 1], [1, 0]]), rootX: batidas(0.2, 0.8, 16, -3, 3), squashY: k([[0, 1], [0.2, 1.08], [0.8, 1.08], [1, 1]]), moodAngry: k([[0, 0], [0.25, 1], [0.8, 1], [1, 0]]) }),
  // Gira no lugar com os braços abertos (Bozo, Galinha, Curupira).
  giro: () => ({ rootRot: k([[0, 0], [0.2, 0], [0.45, 360], [0.7, 720], [0.72, 0, 'step'], [1, 0]]), legFL: k([[0, 0], [0.2, 90], [0.7, 90], [1, 0]]), legFR: k([[0, 0], [0.2, 90], [0.7, 90], [1, 0]]), happyEyes: k([[0, 0], [0.2, 1, 'step'], [0.8, 1], [1, 0, 'step']]) }),
  // Explica com o objeto, mão para cima e para baixo (Professor Raimundo, Seu Creysson).
  explica: () => ({ legFR: batidas(0.2, 0.8, 6, 70, 40), elbowR: batidas(0.2, 0.8, 6, 50, 80), jaw: batidas(0.2, 0.8, 10, 0.9, 0.3, 0.4), headRot: batidas(0.2, 0.8, 4, -5, 5) }),
  // Incha e estoura (Dona Redonda, Coxinha): cresce e volta num puf.
  incha: () => ({ scale: k([[0, 1], [0.2, 1], [0.55, 1.22], [0.58, 0.95, 'step'], [0.66, 1.04], [0.74, 1]]), blush: k([[0, 0.3], [0.5, 1], [0.6, 0.3]]), jaw: k([[0, 0.4], [0.55, 0.1], [0.58, 1, 'step'], [0.8, 0.5], [1, 0.4]]) }),
  // Preguiça: senta/desce devagar, boceja e cochila em pé (Macunaíma, Jeca Tatu).
  preguica: () => ({ squashY: k([[0, 1], [0.3, 0.9], [0.8, 0.9], [1, 1]]), rootY: k([[0, 0], [0.3, 8], [0.8, 8], [1, 0]]), eyeOpen: k([[0, 1], [0.3, 0.3], [0.45, 0.1], [0.6, 0.3], [0.8, 0.2], [1, 1]]), jaw: k([[0, 0.4], [0.35, 1], [0.5, 0.4], [1, 0.4]]), legFL: k([[0, 0], [0.3, -20], [0.8, -20], [1, 0]]), legFR: k([[0, 0], [0.3, -20], [0.8, -20], [1, 0]]) }),
  // Assusta com os braços abertos e garras (Zé do Caixão, Cuca, Bento Carneiro).
  assusta: () => ({ legFL: k([[0, 0], [0.2, 120, 'step'], [0.8, 120], [1, 0]]), legFR: k([[0, 0], [0.2, 120, 'step'], [0.8, 120], [1, 0]]), elbowL: k([[0, 0], [0.2, 40, 'step'], [0.8, 40], [1, 0]]), elbowR: k([[0, 0], [0.2, 40, 'step'], [0.8, 40], [1, 0]]), jaw: k([[0, 0.4], [0.2, 1, 'step'], [0.8, 1], [1, 0.4]]), rootY: k([[0, 0], [0.2, -12], [0.3, 0], [1, 0]]), browAngry: k([[0, 0], [0.2, 1, 'step'], [0.8, 1], [1, 0]]) }),
  // Bate as asas / braços (Louro José, Zé Carioca, Galinha Pintadinha).
  asas: () => ({ legFL: batidas(0.15, 0.85, 12, 70, 20), legFR: batidas(0.15, 0.85, 12, 70, 20), rootY: batidas(0.15, 0.85, 12, -6, 0), headRot: batidas(0.15, 0.85, 6, -6, 6) }),
  // Ginga marrenta (Mandrake, Carioca, Agostinho): balança os ombros, cabeça de lado.
  ginga: () => ({ rootRot: batidas(0.15, 0.85, 8, -6, 6), headRot: batidas(0.15, 0.85, 8, 8, -2), legFL: batidas(0.15, 0.85, 8, 30, 10), legFR: batidas(0.15, 0.85, 8, 10, 30), legBL: batidas(0.15, 0.85, 8, 8, 0) }),
  // Acena com o objeto pro alto (Vovó do Zap, Bate-bola).
  acena: () => ({ legFR: k([[0, 0], [0.15, 140], [0.85, 140], [1, 0]]), elbowR: batidas(0.15, 0.85, 10, 10, 40), happyEyes: k([[0, 0], [0.15, 1, 'step'], [0.85, 1], [1, 0, 'step']]), jaw: k([[0, 0.4], [0.15, 0.9], [0.85, 0.9], [1, 0.4]]) }),
  // Flexiona exibido (Hulk do Paraguai, Fuleco): bíceps e peito estufado.
  flexao: () => ({ legFL: k([[0, 0], [0.18, 90], [0.82, 90], [1, 0]]), legFR: k([[0, 0], [0.18, 90], [0.82, 90], [1, 0]]), elbowL: k([[0, 0], [0.18, 110], [0.82, 110], [1, 0]]), elbowR: k([[0, 0], [0.18, 110], [0.82, 110], [1, 0]]), squashX: batidas(0.2, 0.8, 6, 1.08, 1.0, 1), browAngry: k([[0, 0], [0.18, 1], [0.82, 1], [1, 0]]) }),
};
export const GESTOS_MEME = Object.keys(GESTOS);

// O objeto do meme se mexe no ato 2 (canais mbObjX/mbObjY/mbObjRot/mbObjK) e o efeito
// do meme (contas, corações, fogo, notas...) gira em volta dele (mbEfeito*).
const EFEITOS = {
  contas: (c) => ['+ ÷ × √', [[40, 10], [140, 0], [30, 60], [150, 50]].map(([x, y], i) => i % 2 ? `${rect(x - 6, y - 1.5, 12, 3)} ${rect(x - 1.5, y - 6, 3, 12)}` : `${rect(x - 6, y - 1.5, 12, 3)} ${circ(x, y - 6, 1.8)} ${circ(x, y + 6, 1.8)}`).join(' '), c],
  coracoes: (c) => ['corações', [[36, 20], [146, 10], [28, 70], [154, 64]].map(([x, y]) => `M${x},${y + 8} C${x - 10},${y} ${x - 6},${y - 8} ${x},${y - 3} C${x + 6},${y - 8} ${x + 10},${y} ${x},${y + 8} Z`).join(' '), c],
  fogo: (c) => ['fogo', [[30, 150], [150, 150], [20, 110], [160, 110]].map(([x, y]) => `M${x},${y} C${x - 8},${y - 10} ${x - 2},${y - 20} ${x},${y - 30} C${x + 6},${y - 20} ${x + 10},${y - 8} ${x},${y} Z`).join(' '), c],
  notas: (c) => ['notas', [[30, 30], [150, 20], [24, 80], [156, 74]].map(([x, y]) => `${elip(x, y + 12, 4.5, 3.4)} ${rect(x + 3, y, 1.8, 12)} ${poly([[x + 3, y], [x + 11, y + 4], [x + 11, y + 7], [x + 4.8, y + 3.4]])}`).join(' '), c],
  estrelas: (c) => ['estrelas', [[30, 20], [150, 14], [20, 80], [160, 76], [90, -30]].map(([x, y]) => estrela(x, y, 6)).join(' '), c],
  confete: (c) => ['confete', [[30, 20], [150, 10], [20, 70], [160, 60], [50, -10], [130, -20], [40, 120], [140, 120]].map(([x, y], i) => i % 2 ? rect(x, y, 5, 3) : circ(x, y, 2.4)).join(' '), c],
  bolhas: (c) => ['bolhas', [[30, 40], [150, 30], [24, 100], [156, 90], [90, -20]].map(([x, y], i) => circ(x, y, 4 + (i % 3) * 2)).join(' '), c],
  dinheiro: (c) => ['notas de dinheiro', [[30, 20], [150, 10], [24, 80], [156, 74]].map(([x, y]) => rect(x - 9, y - 5, 18, 10)).join(' '), c],
  penas: (c) => ['penas', [[30, 30], [150, 20], [24, 90], [156, 84]].map(([x, y]) => `M${x},${y} C${x - 6},${y - 8} ${x - 2},${y - 16} ${x},${y - 20} C${x + 2},${y - 16} ${x + 6},${y - 8} ${x},${y} Z`).join(' '), c],
  raios: (c) => ['raios', [[24, 40], [156, 40], [18, 100], [162, 100]].map(([x, y], i) => { const s = i % 2 ? -1 : 1; return poly([[x, y], [x + 8 * s, y + 10], [x + 3 * s, y + 11], [x + 10 * s, y + 24], [x - 1 * s, y + 9], [x + 4 * s, y + 8]]); }).join(' '), c],
  zzz: (c) => ['zzz', 'M120,0 L134,0 L122,12 L134,12 L134,15 L118,15 L130,3 L120,3 Z M140,-20 L150,-20 L142,-12 L150,-12 L150,-10 L138,-10 L146,-18 L140,-18 Z', c],
  folhas: (c) => ['folhas', [[30, 30], [150, 20], [24, 90], [156, 84]].map(([x, y]) => `M${x},${y} Q${x + 6},${y - 7} ${x + 12},${y - 2} Q${x + 6},${y + 4} ${x},${y} Z`).join(' '), c],
};
export const EFEITOS_MEME = Object.keys(EFEITOS);

// Fumaça do puf da transformação (compartilhada: um canal só).
const PUF = ['M30,100 C20,80 34,60 52,64 C56,44 80,38 92,52 C104,36 132,42 132,64 C150,58 164,78 152,98 C166,112 152,134 132,128 C126,146 100,150 90,136 C78,150 52,146 50,128 C30,134 18,114 30,100 Z'];

/** Grupos de rig que os memes acrescentam: o puf e o efeito de cada meme. */
export function gruposDosMemes(memes) {
  const efeitos = { id: 'memeEfeitos', hideIf: 'mooning', parts: [] };
  for (const p of memes) {
    const e = EFEITOS[p.meme.efeito];
    if (!e) continue;
    const [, path, cor] = e(p.meme.corEfeito || p.cores.g);
    efeitos.parts.push({ id: `mbEf_${p.id}`, fill: cor, path, showIf: `mbEf_${p.id}`, alpha: 0.95, pivot: [90, 80], rot: 'mbEfRot', dy: 'mbEfY' });
  }
  const puf = { id: 'memePuf', parts: [{ id: 'mbPuf', fill: '#f5f5f5', path: PUF[0], showIf: 'mbPuf', alpha: 0.92, scaleBy: 'mbPufK', scalePivot: [90, 96] }] };
  return { atras: efeitos, frente: puf };
}

/**
 * Animação própria de um meme (6,5 s, como a da Tigresa): ato 1, o puf e a fantasia
 * aparecem; ato 2, o gesto do meme com o efeito girando; ato 3, a pose final com a fala.
 */
export function animacaoMeme(p) {
  const g = (GESTOS[p.meme.gesto] || GESTOS.explica)();
  const veste = [[0, 0], [0.06, 1, 'step'], [0.97, 0, 'step'], [1, 0]];
  const tracks = {
    [canalMeme(p.id)]: veste,
    mbPuf: [[0, 0], [0.02, 1, 'step'], [0.12, 0, 'step'], [1, 0]],
    mbPufK: [[0, 0.3], [0.06, 1.15], [0.12, 0.6], [1, 0.6]],
    [`mbEf_${p.id}`]: [[0, 0], [0.18, 1, 'step'], [0.86, 0, 'step'], [1, 0]],
    mbEfRot: [[0, 0], [0.18, 0], [0.86, p.meme.giraEfeito === false ? 0 : 50], [1, 0]],
    mbEfY: [[0, 0], [0.18, 6], [0.5, -4], [0.86, 6], [1, 0]],
    mbFumaca: [[0, 0], [0.5, -10], [1, 0]],
    ...g,
  };
  // A transformação do visual vem junto da fantasia: pele, olhos, cabeça, corpo e boca
  // (como costume_pelebr01 na Tigresa), e volta ao normal no fim.
  if (p.canaisShow) {
    for (const [ch, v] of Object.entries(p.canaisShow)) tracks[ch] = [[0, neutro(ch)], [0.06, v, 'step'], [0.97, neutro(ch), 'step'], [1, neutro(ch)]];
  } else {
    if (p.transforma?.pele) tracks[`costume_pele${p.id}`] = veste;
    if (p.transforma?.pelado) tracks.pelado = veste;
  }
  // A fantasia cobre a bermuda do JoJo (ou a troca pela bermuda do visual); o Saci tem uma perna só.
  if (p.fantasia?.baixo === null) tracks[`costume_bermuda${p.id}`] = veste;
  else tracks.nvSemBermuda = veste;
  if (p.fantasia?.umaPerna) tracks.nvSemPernaE = veste;
  return { duration: 6500, blendIn: 0, mark: '!', blink: true, tracks };
}

/** Animações dos memes acrescentadas às do arquivo (não altera o objeto recebido). */
export function comAnimacoesMemes(anims, memes) {
  if (!memes?.length) return anims;
  const animations = { ...anims.animations };
  const channels = { ...anims.channels };
  for (const p of memes) {
    const a = animacaoMeme(p);
    animations[animDoMeme(p.id)] = a;
    for (const ch of Object.keys(a.tracks)) if (!(ch in channels)) channels[ch] = neutro(ch);
  }
  for (const ch of ['mbPuf', 'mbPufK', 'mbEfRot', 'mbEfY', 'mbFumaca']) if (!(ch in channels)) channels[ch] = ch === 'mbPufK' ? 1 : 0;
  return { ...anims, channels, animations };
}

// ------------------------------------------------------------------ frase do meme

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();

/** Meme cuja frase aparece no texto (gatilhos em minúsculas e sem acento), ou null. */
export function memeDoTexto(text, memes) {
  const t = ` ${norm(text)} `;
  if (t.length < 4) return null;
  for (const p of memes || []) {
    for (const g of p.meme.gatilhos || []) if (t.includes(` ${norm(g)} `)) return p;
  }
  return null;
}

/** Itens da Coleção (catálogo) para as animações dos memes: tocam pelo estado `act`. */
export function itensDeMemes(memes) {
  return memes.map((p) => ({ id: animDoMeme(p.id), nome: p.show ? `Fantasia: ${p.nome}` : p.titulo, categoria: p.show ? 'visuais' : 'memes BR', listas: {}, gatilho: {}, usa: animDoMeme(p.id), duracao: 6500, frequencia: 'rara', fala: p.fala, meme: p.id }));
}
