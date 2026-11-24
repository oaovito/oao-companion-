// Arte dos itens da loja de JOJOcoins (0.48.0). Tudo é desenhado por cima do JoJo numa
// CÓPIA do rig (o arquivo não muda), como os visuais de nível e os virais:
// - visuais: fantasias inteiras montadas com o kit do padrão da Tigresa (memes-br.js),
//   mais detalhes próprios (estetoscópio, crachá, fone…), ligadas pelo canal `lj_<id>`;
// - objetos: adereço na mão (`prop_lj_<id>`) com movimento próprio por canais `ljo*`;
// - decorações: peças de chão desenhadas por um rig separado (não acompanham pulo/giro);
// - lendários de efeito: aura e trono (decoração de fundo).
// Puro: usado pelo overlay, pela Central (pré-visualização) e pelos testes.

import { fantasiaInteira } from './memes-br.js';
import { TUBARAO, PEITORAL, PELVICA, OLHO } from './moeda-arte.js';

const r1 = (n) => Math.round(n * 10) / 10;
const circ = (cx, cy, r) => `M${r1(cx - r)},${r1(cy)} a${r1(r)},${r1(r)} 0 1,0 ${r1(2 * r)},0 a${r1(r)},${r1(r)} 0 1,0 ${r1(-2 * r)},0 Z`;
const elip = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} a${r1(rx)},${r1(ry)} 0 1,0 ${r1(2 * rx)},0 a${r1(rx)},${r1(ry)} 0 1,0 ${r1(-2 * rx)},0 Z`;
const furo = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} a${r1(rx)},${r1(ry)} 0 1,1 ${r1(2 * rx)},0 a${r1(rx)},${r1(ry)} 0 1,1 ${r1(-2 * rx)},0 Z`;
const anel = (cx, cy, r, w) => `${elip(cx, cy, r, r)} ${furo(cx, cy, r - w, r - w)}`;
const poly = (pts) => `M${pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' L')} Z`;
const rect = (x, y, w, h) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
const estrela = (cx, cy, r, n = 5, k = 0.45) => poly(Array.from({ length: n * 2 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / n;
  const rr = i % 2 ? r * k : r;
  return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
}));
// Reescala um path absoluto (M/L/C/Z) do espaço da moeda (512) para o rig.
const escalar = (path, k, dx, dy) => String(path).replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${r1(Number(x) * k + dx)},${r1(Number(y) * k + dy)}`);
const CABECA = { pivot: [90, 86], rot: 'headRot' };
const H = (extra = {}) => ({ ...CABECA, ...extra });
const MAO = { parent: 'foreR' };

/** Canal que mostra um visual da loja. */
export const canalLoja = (id) => `lj_${id}`;
/** Canal do objeto interativo (o mesmo nome que a receita usa em `objeto`). */
export const canalObjeto = (id) => `prop_lj_${id}`;

// ------------------------------------------------------------------ visuais (30)

/**
 * Cada visual: fantasia do kit (tronco, mangas, baixo, pés, cabeça, rosto, pescoço) e
 * `extras` [grupo, id, cor, path, opções] desenhados por cima. Sem nada na mão: o visual
 * fica vestido o tempo todo e a mão continua livre para as animações.
 */
export const LOOKS = {
  lv01: { cores: { a: '#f4f6f8', b: '#5c7c99', g: '#9be7ff' }, fantasia: { tronco: 'jaleco', mangas: 'longa', baixo: 'calca', pes: 'sapato', rosto: 'oculos', cores: { baixo: '#37474f', pes: '#212121', rosto: '#263238' } },
    extras: [['nivelPintura', 'tubo', '#4fc3f7', 'M112,104 L118,104 L118,118 C118,121 112,121 112,118 Z'], ['nivelPintura', 'tuboLiq', '#00e676', 'M112,112 L118,112 L118,118 C118,121 112,121 112,118 Z'], ['nivelPintura', 'caneta', '#1565c0', rect(64, 100, 3, 12)]] },
  lv02: { cores: { a: '#2e7d6b', b: '#1b5e50', g: '#e0f2f1' }, fantasia: { tronco: 'bata', mangas: 'curta', baixo: 'calca', pes: 'tenis', cabeca: 'lenco', cores: { baixo: '#2e7d6b', pes: '#eceff1', cabeca: '#2e7d6b' } },
    extras: [['nivelPintura', 'esteto', '#37474f', 'M68,84 C64,104 74,118 84,118 C94,118 102,106 100,96 L97,96 C98,104 92,114 84,114 C76,114 69,104 72,84 Z'], ['nivelPintura', 'estetoDisco', '#b0bec5', circ(100, 94, 4.5)], ['nivelPintura', 'cracha', '#fafafa', rect(104, 104, 14, 10)], ['nivelPintura', 'crachaCruz', '#e53935', 'M109,106 L113,106 L113,108 L115,108 L115,111 L113,111 L113,113 L109,113 L109,111 L107,111 L107,108 L109,108 Z']] },
  lv03: { cores: { a: '#4e342e', b: '#d7ccc8', g: '#c8a96a' }, fantasia: { tronco: 'terno', mangas: 'longa', baixo: 'calca', pes: 'sapato', rosto: 'oculos', pescoco: 'gravataBorboleta', cores: { baixo: '#3e2723', pescoco: '#8d1c1c', rosto: '#212121' } },
    extras: [['nivelPintura', 'giz', '#fafafa', 'M64,98 L72,96 L72,99 L64,101 Z'], ['nivelPintura', 'remendoE', '#8d6e63', elip(40, 120, 6, 8), { parent: 'armL' }]] },
  lv04: { cores: { a: '#263238', b: '#eceff1', g: '#76ff03' }, fantasia: { tronco: 'jaqueta', mangas: 'longa', baixo: 'calca', pes: 'tenis', cabeca: 'bone', rosto: 'oculos', cores: { tronco: '#37474f', mangas: '#37474f', baixo: '#1a237e', cabeca: '#212121', rosto: '#00e676' } },
    extras: [['nivelPintura', 'codigo', '#00e676', [rect(74, 92, 12, 2), rect(78, 97, 16, 2), rect(74, 102, 9, 2), rect(82, 107, 14, 2)].join(' ')], ['costumes', 'fone', '#212121', 'M42,52 C40,16 140,16 138,52 L132,52 C132,24 48,24 48,52 Z', H()], ['costumes', 'foneConchas', '#37474f', `${elip(44, 56, 7, 10)} ${elip(136, 56, 7, 10)}`, H()]] },
  lv05: { cores: { a: '#1c2331', b: '#eceff1', g: '#c9a227' }, fantasia: { tronco: 'terno', mangas: 'longa', baixo: 'calca', pes: 'sapato', rosto: 'oculosEscuros', cores: { baixo: '#1c2331', pes: '#111111' } },
    extras: [['nivelPintura', 'gravata', '#b71c1c', 'M88,86 L92,86 L95,110 L90,116 L85,110 Z'], ['nivelPintura', 'lenco', '#c9a227', 'M110,92 L118,90 L116,96 Z'], ['nivelPintura', 'relogioPulso', '#c9a227', rect(24, 128, 10, 5), { parent: 'foreL' }]] },
  lv06: { cores: { a: '#fafafa', b: '#cfd8dc', g: '#e53935' }, fantasia: { tronco: 'avental', mangas: 'curta', baixo: 'calca', pes: 'sapato', pescoco: 'lencoPescoco', cores: { tronco: '#fafafa', baixo: '#212121', pescoco: '#e53935' } },
    extras: [['costumes', 'chapeuChef', '#fafafa', 'M56,24 C44,10 56,-6 70,0 C76,-12 104,-12 110,0 C124,-6 136,10 124,24 L120,30 L60,30 Z', H()], ['costumes', 'chapeuChefFaixa', '#e0e0e0', 'M60,24 L120,24 L120,32 L60,32 Z', H()], ['nivelPintura', 'colher', '#8d6e63', 'M104,118 L106,98 L108,98 L106,118 Z']] },
  lv07: { cores: { a: '#ff6d00', b: '#212121', g: '#ffffff' }, fantasia: { tronco: 'regata', baixo: 'short', pes: 'tenis', cabeca: 'bone', pescoco: 'corrente', cores: { baixo: '#212121', cabeca: '#ff6d00', pescoco: '#bdbdbd' } },
    extras: [['nivelPintura', 'apito', '#fdd835', 'M96,104 L106,104 L106,110 L96,110 Z'], ['nivelPintura', 'cordaoApito', '#212121', 'M80,84 L96,106 L95,108 L78,86 Z'], ['nivelPintura', 'cronometro', '#90a4ae', circ(36, 134, 5), { parent: 'foreL' }]] },
  lv08: { cores: { a: '#fafafa', b: '#111111', g: '#c62828' }, fantasia: { tronco: 'gi', mangas: 'longa', baixo: 'calca', pes: 'descalco', cabeca: 'bandana', cores: { baixo: '#fafafa', cabeca: '#c62828' } } },
  lv09: { cores: { a: '#eceff1', b: '#ff6f00', g: '#90caf9' }, fantasia: { tronco: 'macacao', mangas: 'longa', baixo: 'macacao', pes: 'bota', cabeca: 'capacete', cores: { baixo: '#eceff1', pes: '#9e9e9e', cabeca: '#eceff1' } },
    extras: [['nivelPintura', 'bandeiraBR', '#2e7d32', rect(60, 100, 14, 10)], ['nivelPintura', 'bandeiraBRlos', '#fdd835', poly([[67, 101], [73, 105], [67, 109], [61, 105]])], ['nivelPintura', 'bandeiraBRc', '#1565c0', circ(67, 105, 2.2)], ['nivelPintura', 'painelNasa', '#ff6f00', rect(94, 98, 16, 8)]] },
  lv10: { cores: { a: '#8d7b68', b: '#4e3b2a', g: '#c8b593' }, fantasia: { tronco: 'sobretudo', mangas: 'longa', baixo: 'calca', pes: 'sapato', cabeca: 'fedora', rosto: 'cachimbo', cores: { baixo: '#4e3b2a', pes: '#2b1d12', cabeca: '#4e3b2a' } },
    extras: [['nivelPintura', 'lupaBolso', '#90a4ae', anel(114, 104, 5, 1.6)]] },
  lv11: { cores: { a: '#111111', b: '#f5f5f5', g: '#c9a227' }, fantasia: { tronco: 'toga', mangas: 'longa', baixo: 'calca', pes: 'sapato', cabeca: 'peruca', pescoco: 'babado', cores: { baixo: '#111111', mangas: '#111111', cabeca: '#f5f5f5' } },
    extras: [['nivelPintura', 'martelinho', '#6d4c41', 'M100,110 L116,104 L118,108 L102,114 Z M112,100 L120,98 L122,110 L114,112 Z']] },
  lv12: { cores: { a: '#1a237e', b: '#c9a227', g: '#fff59d' }, fantasia: { tronco: 'capa', baixo: 'bermuda', pes: 'sandalia', cabeca: 'coroa', pescoco: 'corrente', cores: { tronco: '#1a237e', detalhe: '#c9a227', baixo: '#1565c0', cabeca: '#c9a227', pescoco: '#c9a227' } },
    extras: [['nivelPintura', 'tridenteBroche', '#c9a227', 'M88,96 L92,96 L92,112 L88,112 Z M82,96 L98,96 L98,99 L82,99 Z M82,90 L85,90 L85,98 L82,98 Z M88,88 L92,88 L92,98 L88,98 Z M95,90 L98,90 L98,98 L95,98 Z']] },
  lv13: { cores: { a: '#8d1c1c', b: '#f5e6c8', g: '#c9a227' }, fantasia: { tronco: 'colete', mangas: 'longa', baixo: 'calca', pes: 'bota', cabeca: 'chapeuPirata', rosto: 'bigode', pescoco: 'lencoPescoco', cores: { mangas: '#f5e6c8', baixo: '#3e2723', cabeca: '#212121', pescoco: '#8d1c1c' } },
    extras: [['costumes', 'tapaOlho', '#111111', `${elip(70, 50, 8, 7)} M58,40 L122,30 L122,33 L58,43 Z`, H()]] },
  lv14: { cores: { a: '#90a4ae', b: '#546e7a', g: '#eceff1' }, fantasia: { tronco: 'armadura', mangas: 'longa', baixo: 'calca', pes: 'bota', cabeca: 'elmo', cores: { mangas: '#78909c', baixo: '#607d8b', pes: '#455a64' } },
    extras: [['nivelPintura', 'brasao', '#c62828', 'M84,92 L96,92 L96,102 C96,108 90,110 90,110 C90,110 84,108 84,102 Z'], ['nivelPintura', 'brasaoLeao', '#fdd835', circ(90, 99, 2.6)]] },
  lv15: { cores: { a: '#4a148c', b: '#fdd835', g: '#b388ff' }, fantasia: { tronco: 'capa', baixo: 'calca', pes: 'sapato', cabeca: 'chapeuBruxa', rosto: 'barba', estampa: 'estrelas', cores: { tronco: '#4a148c', detalhe: '#fdd835', baixo: '#311b92', cabeca: '#4a148c', rosto: '#eeeeee', estampa: '#fdd835' } },
    extras: [['costumes', 'estrelaChapeu', '#fdd835', estrela(96, -4, 6), H()]] },
  lv16: { cores: { a: '#111111', b: '#e53935', g: '#ffd600' }, fantasia: { tronco: 'jaqueta', mangas: 'longa', baixo: 'calca', pes: 'bota', cabeca: 'espetado', rosto: 'oculosEscuros', pescoco: 'corrente', cores: { tronco: '#111111', mangas: '#111111', baixo: '#263238', cabeca: '#e53935', pescoco: '#bdbdbd' } },
    extras: [['nivelPintura', 'raio', '#ffd600', poly([[92, 90], [84, 104], [90, 104], [86, 118], [98, 100], [91, 100], [96, 90]])], ['nivelPintura', 'tachas', '#bdbdbd', [56, 64, 116, 124].map((x) => circ(x, 88, 1.6)).join(' ')]] },
  lv17: { cores: { a: '#5c6bc0', b: '#fff59d', g: '#e8eaf6' }, fantasia: { tronco: 'macacao', mangas: 'longa', baixo: 'macacao', pes: 'descalco', cabeca: 'bobs', estampa: 'estrelas', cores: { tronco: '#5c6bc0', detalhe: '#3f51b5', baixo: '#5c6bc0', cabeca: '#f48fb1', estampa: '#fff59d' } },
    extras: [['costumes', 'tapaOlhosDormir', '#3949ab', 'M54,24 C70,16 110,16 126,24 L124,32 C110,26 70,26 56,32 Z', H()], ['costumes', 'tapaOlhosCilios', '#e8eaf6', `${rect(70, 25, 10, 2)} ${rect(100, 25, 10, 2)}`, H()]] },
  lv18: { cores: { a: '#9e9e9e', b: '#e0e0e0', g: '#ff7043' }, fantasia: { tronco: 'puffer', mangas: 'longa', baixo: 'short', pes: 'chinelo', cabeca: 'nenhuma', cores: { tronco: '#9e9e9e', mangas: '#9e9e9e', baixo: '#455a64', pes: '#ff7043' } },
    extras: [['nivelPintura', 'bolsoCanguru', '#8a8a8a', 'M70,112 L110,112 L114,126 L66,126 Z'], ['nivelPintura', 'cordaoCapuz', '#fafafa', 'M82,84 L84,100 L82,100 Z M98,84 L96,100 L98,100 Z'], ['costumeBack', 'capuz', '#8a8a8a', 'M52,84 C46,70 54,58 66,56 L114,56 C126,58 134,70 128,84 Z']] },
  lv19: { cores: { a: '#00bcd4', b: '#ffeb3b', g: '#ffffff' }, fantasia: { tronco: 'regata', baixo: 'bermuda', pes: 'chinelo', rosto: 'oculosEscuros', estampa: 'flores', cores: { tronco: '#00bcd4', baixo: '#ff7043', pes: '#ffeb3b', estampa: '#ffeb3b' } },
    extras: [['costumeBack', 'prancha', '#ffca28', 'M146,40 C162,40 170,70 170,110 C170,150 162,170 152,170 C142,170 136,150 136,110 C136,70 140,40 146,40 Z'], ['costumeBack', 'pranchaFaixa', '#e53935', 'M150,40 L154,40 L156,170 L152,170 Z'], ['nivelPintura', 'protetor', '#ffffff', 'M84,46 L96,46 L96,52 L84,52 Z']] },
  lv20: { cores: { a: '#f5e6c8', b: '#6d4c41', g: '#c62828' }, fantasia: { tronco: 'camisa', mangas: 'longa', baixo: 'bombacha', pes: 'bota', cabeca: 'chapeuGaucho', pescoco: 'lencoPescoco', cores: { baixo: '#5d4037', pes: '#3e2723', cabeca: '#3e2723', pescoco: '#c62828' } },
    extras: [['nivelPintura', 'guaiaca', '#4e342e', rect(52, 122, 76, 8)], ['nivelPintura', 'guaiacaMoedas', '#c9a227', [64, 78, 102, 116].map((x) => circ(x, 126, 2.2)).join(' ')]] },
  lv21: { cores: { a: '#8d6e63', b: '#c9a227', g: '#e53935' }, fantasia: { tronco: 'colete', mangas: 'longa', baixo: 'calca', pes: 'sandalia', cabeca: 'chapeuCangaceiro', pescoco: 'lencoPescoco', cores: { mangas: '#d7ccc8', baixo: '#5d4037', cabeca: '#8d6e63', pescoco: '#e53935' } },
    extras: [['nivelPintura', 'cartucheira', '#5d4037', 'M52,86 L128,120 L126,126 L50,92 Z'], ['nivelPintura', 'cartuchos', '#c9a227', [60, 70, 80, 90, 100, 110, 120].map((x, i) => rect(x, 88 + i * 4.6, 3, 5)).join(' ')]] },
  lv22: { cores: { a: '#111111', b: '#fafafa', g: '#c9a227' }, fantasia: { tronco: 'terno', mangas: 'longa', baixo: 'calca', pes: 'sapato', cabeca: 'topete', pescoco: 'gravataBorboleta', cores: { baixo: '#111111', pes: '#111111', cabeca: '#212121', pescoco: '#111111' } },
    extras: [['nivelPintura', 'rosaLapela', '#c62828', circ(112, 94, 3.4)], ['nivelPintura', 'faixaCintura', '#212121', rect(56, 118, 68, 7)], ['nivelPintura', 'abotoaduras', '#c9a227', circ(36, 138, 2), { parent: 'foreL' }]] },
  lv23: { cores: { a: '#c62828', b: '#fdd835', g: '#eceff1' }, fantasia: { tronco: 'uniforme', mangas: 'longa', baixo: 'calca', pes: 'bota', cabeca: 'capacete', cores: { baixo: '#c62828', pes: '#212121', cabeca: '#c62828' } },
    extras: [['nivelPintura', 'faixasRefletivas', '#fdd835', [rect(48, 108, 84, 4), rect(52, 122, 76, 4)].join(' ')], ['costumes', 'escudoCapacete', '#fdd835', poly([[84, 6], [96, 6], [96, 16], [90, 20], [84, 16]]), H()]] },
  lv24: { cores: { a: '#fafafa', b: '#1565c0', g: '#c62828' }, fantasia: { tronco: 'camiseta', mangas: 'curta', baixo: 'calca', pes: 'sapato', cabeca: 'quepe', pescoco: 'lencoPescoco', estampa: 'listras', cores: { baixo: '#1565c0', pes: '#212121', cabeca: '#fafafa', pescoco: '#1565c0', estampa: '#1565c0' } },
    extras: [['nivelPintura', 'ancora', '#c62828', 'M88,96 L92,96 L92,112 L88,112 Z M84,98 L96,98 L96,100 L84,100 Z M82,108 C84,116 96,116 98,108 L95,108 C94,112 86,112 85,108 Z']] },
  lv25: { cores: { a: '#e53935', b: '#ffeb3b', g: '#1e88e5' }, fantasia: { tronco: 'macacao', mangas: 'longa', baixo: 'macacao', pes: 'peGigante', cabeca: 'palhaco', rosto: ['narizPalhaco', 'maquiagemPalhaco'], pescoco: 'babado', estampa: 'bolinhas', cores: { tronco: '#e53935', detalhe: '#1e88e5', baixo: '#ffeb3b', pes: '#e53935', estampa: '#ffeb3b' } } },
  lv26: { cores: { a: '#212121', b: '#fafafa', g: '#90a4ae' }, fantasia: { tronco: 'terno', mangas: 'longa', baixo: 'calca', pes: 'sapato', rosto: 'oculosEscuros', cores: { baixo: '#212121', pes: '#111111' } },
    extras: [['nivelPintura', 'gravataFina', '#111111', rect(88.5, 86, 3, 26)], ['costumes', 'ponto', '#cfd8dc', 'M134,52 C140,52 142,60 136,62 L134,62 Z', H()], ['costumes', 'pontoFio', '#cfd8dc', 'M136,62 C140,72 132,80 126,84 L125,82 C130,78 136,72 134,62 Z', H()]] },
  lv27: { cores: { a: '#a1887f', b: '#5d4037', g: '#fff176' }, fantasia: { tronco: 'colete', mangas: 'curta', baixo: 'bermuda', pes: 'bota', cabeca: 'chapeuPalha', cores: { mangas: '#d7ccc8', baixo: '#8d6e63', pes: '#4e342e', cabeca: '#c8a96a' } },
    extras: [['nivelPintura', 'binoculo', '#37474f', `${circ(84, 104, 5)} ${circ(96, 104, 5)}`], ['nivelPintura', 'alcaBinoculo', '#5d4037', 'M70,84 L84,100 L82,102 L68,86 Z'], ['nivelPintura', 'bussola', '#c9a227', circ(116, 112, 4)]] },
  lv28: { cores: { a: '#ffd54f', b: '#ff6f00', g: '#ffffff' }, fantasia: { tronco: 'tanga', baixo: 'sunga', pes: 'descalco', cabeca: 'nenhuma', pescoco: 'colar', cores: { tronco: '#ffd54f', baixo: '#ffd54f', pescoco: '#c9a227' } },
    extras: [['nivelPintura', 'numeroAtleta', '#fafafa', rect(78, 134, 24, 14)], ['nivelPintura', 'numeroAtletaTxt', '#212121', 'M84,138 L88,136 L88,146 L86,146 L86,139 L84,140 Z M92,136 L98,136 L98,138 L94,140 L98,142 L98,146 L92,146 L92,144 L96,144 L96,142 L92,141 Z'], ['nivelPintura', 'oleo', '#ffffff', [elip(60, 98, 3, 1.2), elip(118, 100, 3, 1.2), elip(84, 112, 2.4, 1), elip(36, 122, 2.4, 1)].join(' '), { alpha: 0.8 }]] },
  lv29: { cores: { a: '#1b1b1b', b: '#00e676', g: '#76ff03' }, fantasia: { tronco: 'sobretudo', mangas: 'longa', baixo: 'calca', pes: 'tenis', rosto: 'oculos', cores: { tronco: '#1b1b1b', baixo: '#111111', pes: '#263238', rosto: '#00e676' } },
    extras: [['costumes', 'capuzHacker', '#1b1b1b', 'M38,58 C30,18 60,-4 90,-4 C120,-4 150,18 142,58 L132,58 C134,26 116,8 90,8 C64,8 46,26 48,58 Z', H()], ['nivelPintura', 'matriz', '#00e676', [rect(60, 92, 2, 10), rect(66, 96, 2, 14), rect(112, 90, 2, 12), rect(118, 98, 2, 9)].join(' '), { alpha: 0.85 }]] },
  lv30: { cores: { a: '#fafafa', b: '#8e24aa', g: '#c9a227' }, fantasia: { tronco: 'toga', mangas: 'curta', baixo: 'saia', pes: 'sandalia', cabeca: 'nenhuma', pescoco: 'colar', cores: { mangas: '#fafafa', baixo: '#fafafa', pes: '#8d6e63', pescoco: '#c9a227' } },
    extras: [['costumes', 'louros', '#7cb342', 'M48,30 C52,14 66,6 80,4 L80,8 C68,10 56,18 52,30 Z M132,30 C128,14 114,6 100,4 L100,8 C112,10 124,18 128,30 Z', H()], ['costumes', 'lourosFolhas', '#9ccc65', [[54, 22], [60, 14], [68, 9], [126, 22], [120, 14], [112, 9]].map(([x, y]) => elip(x, y, 4, 2.2)).join(' '), H()], ['nivelPintura', 'faixaPurpura', '#8e24aa', 'M96,86 L134,112 L130,118 L92,90 Z']] },
  // Lendário secreto: pele de ouro (paleta peleDourada), capa vermelha, coroa e corrente.
  ll09: { cores: { a: '#b71c1c', b: '#ffd54f', g: '#00e5ff' }, pele: 'peleDourada', fantasia: { tronco: 'capa', baixo: 'sunga', pes: 'descalco', cabeca: 'coroa', pescoco: 'corrente', cores: { baixo: '#c9a227', cabeca: '#ffd54f', pescoco: '#ffecb3' } },
    extras: [['nivelPintura', 'medalhaPeito', '#ffd54f', circ(90, 104, 6)], ['nivelPintura', 'medalhaTub', '#9a6206', 'M86,105 C88,100 93,99 95,102 L92,104 C93,106 90,108 86,105 Z']] },
};

// ------------------------------------------------------------------ objetos interativos (15)

/**
 * Objeto na mão direita (ou no chão) com movimento próprio: [id, cor, path, opções].
 * Canais ljo* são animados pela receita do item (faixas) e voltam ao repouso no fim.
 */
export const OBJETOS = {
  ob01: [ // Ioiô: desce e sobe pela linha.
    ['ioioLinha', '#eceff1', 'M156,138 L157,138 L157,170 L156,170 Z', { ...MAO, scaleBy: 'ljoIoioK', scalePivot: [156.5, 138] }],
    ['ioio', '#e53935', circ(156.5, 170, 7), { ...MAO, dy: 'ljoIoioY', pivot: [156.5, 170], rot: 'ljoGiro' }],
    ['ioioMeio', '#fafafa', `${rect(150, 169, 13, 2)} ${circ(156.5, 170, 2)}`, { ...MAO, dy: 'ljoIoioY', pivot: [156.5, 170], rot: 'ljoGiro' }],
  ],
  ob02: [ // Cubo mágico: gira nas mãos.
    ['cubo', '#212121', rect(144, 124, 22, 22), { ...MAO, pivot: [155, 135], rot: 'ljoGiro' }],
    ['cuboFaces', '#e53935', [rect(146, 126, 5.5, 5.5), rect(158.5, 132, 5.5, 5.5), rect(152, 138.5, 5.5, 5.5)].join(' '), { ...MAO, pivot: [155, 135], rot: 'ljoGiro' }],
    ['cuboFaces2', '#fdd835', [rect(152, 126, 5.5, 5.5), rect(146, 138.5, 5.5, 5.5), rect(158.5, 138.5, 5.5, 5.5)].join(' '), { ...MAO, pivot: [155, 135], rot: 'ljoGiro' }],
    ['cuboFaces3', '#1e88e5', [rect(158.5, 126, 5.5, 5.5), rect(146, 132, 5.5, 5.5), rect(152, 132, 5.5, 5.5)].join(' '), { ...MAO, pivot: [155, 135], rot: 'ljoGiro' }],
  ],
  ob03: [ // Bola de basquete: quica no chão.
    ['basquete', '#ef6c00', circ(160, 150, 10), { dy: 'ljoQuica' }],
    ['basqueteGomos', '#3e2723', 'M150,149 L170,149 L170,151 L150,151 Z M159,140 L161,140 L161,160 L159,160 Z M153,142 C157,146 157,154 153,158 L152,157 C155,153 155,147 152,143 Z M167,142 C163,146 163,154 167,158 L168,157 C165,153 165,147 168,143 Z', { dy: 'ljoQuica' }],
  ],
  ob04: [ // Guitarra elétrica (com o corpo da guitarra do kit, outra cor).
    ['guitarraCorpo', '#c62828', 'M140,146 C132,138 136,126 146,128 C150,122 160,124 160,132 C166,136 164,148 156,150 C152,156 144,154 140,146 Z', MAO],
    ['guitarraBraco', '#5d4037', 'M154,134 L176,100 L179,102 L157,136 Z', MAO],
    ['guitarraDetalhe', '#fafafa', `${circ(150, 140, 4)} M146,136 L156,146 L155,147 L145,137 Z`, MAO],
  ],
  ob05: [ // Kettlebell.
    ['kbAlca', '#424242', 'M148,128 C148,116 164,116 164,128 L160,128 C160,121 152,121 152,128 Z', MAO],
    ['kbCorpo', '#212121', circ(156, 138, 11), MAO],
    ['kbBrilho', '#757575', elip(151, 133, 3, 2), MAO],
  ],
  ob06: [ // Corda de pular: gira em volta do corpo.
    ['cordaArco', '#ff7043', 'M30,120 C30,190 150,190 150,120 L148,120 C148,186 32,186 32,120 Z', { scaleYBy: 'ljoCorda', squashPivot: [90, 120] }],
    ['cordaCabos', '#5d4037', `${rect(26, 112, 7, 12)} ${rect(147, 112, 7, 12)}`],
  ],
  ob07: [ // Videogame portátil.
    ['vgCorpo', '#7e57c2', 'M140,126 L172,126 C176,126 176,146 172,146 L140,146 C136,146 136,126 140,126 Z', MAO],
    ['vgTela', '#b2ff59', rect(149, 129, 14, 13), { ...MAO, alpha: 0.95 }],
    ['vgPixel', '#1b5e20', rect(153, 135, 3, 3), { ...MAO, dx: 'ljoPixel' }],
    ['vgBotoes', '#fafafa', `${circ(143, 136, 2)} ${circ(168, 133, 1.6)} ${circ(168, 139, 1.6)}`, MAO],
  ],
  ob08: [ // Pipa: sobe presa na linha que sai da mão (solta no ar, não gira com o braço).
    ['pipaLinha', '#eceff1', 'M150,118 L151,118 L190,24 L189,24 Z', { scaleBy: 'ljoPipaK', scalePivot: [150.5, 118] }],
    ['pipa', '#29b6f6', poly([[190, 4], [202, 20], [190, 40], [178, 20]]), { scaleBy: 'ljoPipaK', scalePivot: [150.5, 118], pivot: [190, 20], rot: 'ljoBalanco' }],
    ['pipaCruz', '#fdd835', 'M189,4 L191,4 L191,40 L189,40 Z M178,19 L202,19 L202,21 L178,21 Z', { scaleBy: 'ljoPipaK', scalePivot: [150.5, 118], pivot: [190, 20], rot: 'ljoBalanco' }],
    ['pipaRabiola', '#e53935', 'M190,40 C186,52 194,58 188,70 L190,70 C196,58 188,52 192,40 Z', { scaleBy: 'ljoPipaK', scalePivot: [150.5, 118], pivot: [190, 20], rot: 'ljoBalanco' }],
    ['pipaCarretel', '#8d6e63', rect(150, 126, 10, 8), MAO],
  ],
  ob09: [ // Bambolê na cintura.
    ['bambole', '#ec407a', `${elip(90, 124, 56, 9)} ${furo(90, 124, 52, 6)}`, { dy: 'ljoBamboleY', scaleXBy: 'ljoBamboleX', squashPivot: [90, 124] }],
    ['bamboleFaixa', '#fff176', [rect(40, 121, 6, 6), rect(70, 129, 6, 4), rect(104, 129, 6, 4), rect(134, 121, 6, 6)].join(' '), { dy: 'ljoBamboleY', scaleXBy: 'ljoBamboleX', squashPivot: [90, 124] }],
  ],
  ob10: [ // Lupa gigante.
    ['lupaCabo', '#6d4c41', 'M150,146 L158,136 L162,140 L154,150 Z', MAO],
    ['lupaAro', '#90a4ae', anel(168, 124, 14, 3.4), MAO],
    ['lupaVidro', '#e1f5fe', circ(168, 124, 10.6), { ...MAO, alpha: 0.45 }],
  ],
  ob11: [ // Varinha de bolhas.
    ['varinha', '#26a69a', 'M152,146 L174,112 L176,113 L154,147 Z', MAO],
    ['varinhaAro', '#26a69a', anel(178, 106, 6, 1.6), MAO],
    ['bolhaGrande', '#b3e5fc', anel(178, 106, 5, 0.8), { ...MAO, dy: 'ljoBolhaY', dx: 'ljoBolhaX', alpha: 0.85 }],
  ],
  ob12: [ // Tambor (alfaia) com baqueta.
    ['tambor', '#8d6e63', 'M136,132 L176,132 L172,160 L140,160 Z', {}],
    ['tamborPele', '#f5e6c8', elip(156, 132, 20, 5), {}],
    ['tamborCordas', '#c62828', 'M138,134 L148,158 L146,158 L137,136 Z M154,134 L162,158 L160,158 L152,134 Z M168,134 L172,148 L170,150 L166,134 Z', {}],
    ['baqueta', '#fdd835', 'M150,128 L168,110 L170,112 L152,130 Z', { ...MAO, pivot: [151, 129], rot: 'ljoBate' }],
  ],
  ob13: [ // Prancheta de técnico.
    ['prancheta', '#6d4c41', rect(142, 118, 26, 34), MAO],
    ['pranchetaPapel', '#fafafa', rect(145, 124, 20, 25), MAO],
    ['pranchetaJogada', '#1565c0', 'M148,140 C152,130 158,134 160,128 L161,129 C159,135 153,131 149,141 Z M158,126 L163,127 L160,131 Z', { ...MAO, alpha: 0.9 }],
    ['pranchetaPresilha', '#bdbdbd', rect(151, 116, 8, 4), MAO],
  ],
  ob14: [ // Leque de papel.
    ['leque', '#e53935', 'M154,140 L132,112 C142,102 164,98 178,104 Z', { ...MAO, pivot: [154, 140], rot: 'ljoAbana' }],
    ['lequeVaretas', '#fdd835', 'M154,140 L140,108 L141,107 L155,140 Z M154,140 L152,103 L153,103 L155,140 Z M154,140 L165,102 L166,103 L155,141 Z', { ...MAO, pivot: [154, 140], rot: 'ljoAbana' }],
  ],
  ob15: [ // Peso de anilha olímpica (girando como volante).
    ['anilha', '#1e88e5', `${circ(158, 134, 14)} ${furo(158, 134, 3, 3)}`, { ...MAO, pivot: [158, 134], rot: 'ljoGiro' }],
    ['anilhaAro', '#0d47a1', anel(158, 134, 14, 2.5), { ...MAO, pivot: [158, 134], rot: 'ljoGiro' }],
    ['anilhaTexto', '#fafafa', rect(155, 122, 6, 4), { ...MAO, pivot: [158, 134], rot: 'ljoGiro' }],
  ],
};

// ------------------------------------------------------------------ decorações (15) e trono

/**
 * Decoração: peças no chão ao lado do JoJo (lado esquerdo ou direito) ou atrás dele
 * (fundo). Coordenadas no mesmo espaço do rig (chão em y = 167); o desenho fica parado
 * mesmo quando o JoJo pula ou gira. [id, cor, path, opções] com `pulso` opcional
 * (brilho/balanço suave, parado no movimento reduzido).
 */
export const DECOR = {
  dc01: { lado: 'esquerda', pecas: [ // Planta de aquário (alga grande)
    ['algaVaso', '#8d6e63', 'M-34,167 L-10,167 L-13,150 L-31,150 Z'],
    ['alga1', '#2e7d32', 'M-24,150 C-34,130 -18,118 -28,96 C-20,110 -14,124 -20,150 Z', { balanca: 1 }],
    ['alga2', '#43a047', 'M-20,150 C-10,132 -24,118 -12,100 C-14,118 -6,130 -16,150 Z', { balanca: -1 }]] },
  dc02: { lado: 'direita', pecas: [ // Baú do tesouro
    ['bauBase', '#6d4c41', 'M182,167 L220,167 L220,146 L182,146 Z'],
    ['bauTampa', '#5d4037', 'M180,146 C180,132 222,132 222,146 Z'],
    ['bauFerragem', '#c9a227', 'M182,144 L220,144 L220,148 L182,148 Z M199,140 L203,140 L203,154 L199,154 Z'],
    ['bauMoedas', '#ffd54f', `${circ(190, 140, 3)} ${circ(196, 137, 3)} ${circ(208, 138, 3)} ${circ(214, 141, 3)}`, { pulso: 1 }]] },
  dc03: { lado: 'esquerda', pecas: [ // Castelo de aquário
    ['casteloCorpo', '#bcaaa4', 'M-54,167 L-10,167 L-10,130 L-16,130 L-16,124 L-22,124 L-22,130 L-28,130 L-28,124 L-34,124 L-34,130 L-40,130 L-40,124 L-46,124 L-46,130 L-54,130 Z'],
    ['casteloTorre', '#a1887f', 'M-38,130 L-26,130 L-26,104 L-38,104 Z'],
    ['casteloTelhado', '#c62828', poly([[-40, 104], [-32, 90], [-24, 104]])],
    ['castelosPortas', '#4e342e', 'M-36,167 C-36,154 -24,154 -24,167 Z M-34,118 L-30,118 L-30,112 L-34,112 Z']] },
  dc04: { lado: 'direita', pecas: [ // Concha gigante com pérola
    ['concha', '#f8bbd0', 'M184,167 C182,140 228,140 226,167 Z'],
    ['conchaRaias', '#ec407a', 'M205,167 L196,145 L198,145 L206,167 Z M205,167 L205,142 L207,142 L207,167 Z M207,167 L216,145 L218,146 L208,167 Z', { alpha: 0.6 }],
    ['perola', '#fafafa', circ(205, 160, 5), { pulso: 1 }]] },
  dc05: { lado: 'esquerda', pecas: [ // Coral rosa
    ['coral', '#ff7f9e', 'M-30,167 L-26,140 L-36,124 L-32,122 L-24,134 L-22,112 L-18,112 L-18,132 L-10,118 L-6,120 L-16,142 L-14,167 Z'],
    ['coralPontas', '#ffb3c6', `${circ(-34, 122, 3)} ${circ(-20, 110, 3)} ${circ(-8, 118, 3)}`]] },
  dc06: { lado: 'direita', pecas: [ // Estrela-do-mar sentada
    ['estrelaMar', '#ff8a65', estrela(204, 152, 16, 5, 0.42)],
    ['estrelaPintas', '#ffccbc', [circ(204, 144, 1.6), circ(198, 152, 1.6), circ(210, 152, 1.6), circ(201, 159, 1.6), circ(207, 159, 1.6)].join(' ')],
    ['estrelaOlhos', '#212121', `${circ(201, 150, 1.4)} ${circ(207, 150, 1.4)}`]] },
  dc07: { lado: 'esquerda', pecas: [ // Âncora antiga
    ['ancoraHaste', '#607d8b', 'M-26,104 L-20,104 L-20,160 L-26,160 Z'],
    ['ancoraArco', '#607d8b', 'M-46,146 C-44,168 -2,168 0,146 L-6,146 C-8,160 -38,160 -40,146 Z'],
    ['ancoraBarra', '#546e7a', rect(-36, 112, 26, 5)],
    ['ancoraArgola', '#78909c', anel(-23, 100, 6, 2)],
    ['ancoraFerrugem', '#8d6e63', [circ(-22, 130, 2), circ(-34, 156, 2)].join(' '), { alpha: 0.7 }]] },
  dc08: { lado: 'direita', pecas: [ // Mini farol
    ['farolBase', '#eceff1', 'M192,167 L218,167 L212,106 L198,106 Z'],
    ['farolFaixas', '#e53935', 'M196,152 L214,152 L215,140 L195,140 Z M197,128 L213,128 L212,118 L198,118 Z'],
    ['farolTopo', '#37474f', 'M196,106 L214,106 L212,96 L198,96 Z'],
    ['farolLuz', '#fff59d', 'M199,104 L211,104 L211,98 L199,98 Z', { pulso: 1 }],
    ['farolFeixe', '#fff59d', 'M211,99 L244,88 L244,112 L211,103 Z', { pulso: 1, alpha: 0.35 }]] },
  dc09: { lado: 'esquerda', pecas: [ // Tapete de yoga enrolado + garrafinha
    ['tapeteRolo', '#7e57c2', elip(-30, 158, 20, 9)],
    ['tapeteEspiral', '#b39ddb', anel(-46, 158, 6, 2)],
    ['garrafa', '#4fc3f7', 'M-8,167 L4,167 L4,136 L0,130 L-4,130 L-8,136 Z', { alpha: 0.9 }],
    ['garrafaTampa', '#0277bd', rect(-5, 125, 6, 6)]] },
  dc10: { lado: 'direita', pecas: [ // Banco de supino com barra
    ['supinoBanco', '#37474f', 'M182,150 L232,150 L232,156 L182,156 Z'],
    ['supinoPes', '#263238', 'M186,156 L190,156 L190,167 L186,167 Z M224,156 L228,156 L228,167 L224,167 Z'],
    ['supinoSuporte', '#455a64', 'M190,150 L194,150 L194,120 L190,120 Z M220,150 L224,150 L224,120 L220,120 Z'],
    ['supinoBarra', '#9e9e9e', rect(176, 118, 64, 3)],
    ['supinoAnilhas', '#c62828', `${rect(178, 110, 6, 19)} ${rect(232, 110, 6, 19)}`]] },
  dc11: { lado: 'esquerda', pecas: [ // Luminária de lava
    ['lavaBase', '#455a64', 'M-34,167 L-10,167 L-14,150 L-30,150 Z'],
    ['lavaVidro', '#4a148c', 'M-30,150 L-14,150 L-18,110 L-26,110 Z', { alpha: 0.8 }],
    ['lavaBolhas', '#ff4081', `${elip(-22, 140, 4, 5)} ${elip(-21, 124, 3, 4)}`, { pulso: 1 }],
    ['lavaTampa', '#455a64', 'M-26,110 L-18,110 L-20,104 L-24,104 Z']] },
  dc12: { lado: 'direita', pecas: [ // Toca-discos
    ['discoMovel', '#5d4037', rect(182, 140, 44, 27)],
    ['discoPrato', '#212121', elip(204, 140, 18, 4.5)],
    ['discoRotulo', '#e53935', elip(204, 140, 5, 1.4), { pulso: 1 }],
    ['discoBraco', '#bdbdbd', 'M222,134 L214,140 L213,139 L221,133 Z'],
    ['notaMusical', '#7e57c2', 'M232,118 L234,118 L234,106 L240,104 L240,106 L236,107 L236,120 C236,124 230,124 230,121 C230,118 232,118 232,118 Z', { pulso: 1 }]] },
  dc13: { lado: 'esquerda', pecas: [ // Pilha de livros com troféu
    ['livro1', '#1565c0', rect(-50, 156, 42, 11)],
    ['livro2', '#c62828', rect(-46, 146, 36, 10)],
    ['livro3', '#2e7d32', rect(-48, 137, 38, 9)],
    ['livroLombadas', '#fafafa', [rect(-46, 160, 30, 2), rect(-42, 150, 24, 2), rect(-44, 140, 26, 2)].join(' '), { alpha: 0.8 }],
    ['trofeuMini', '#fdd835', 'M-36,137 L-22,137 L-24,134 L-27,134 L-27,128 C-20,126 -18,116 -20,112 L-38,112 C-40,116 -38,126 -31,128 L-31,134 L-34,134 Z', { pulso: 1 }]] },
  dc14: { lado: 'direita', pecas: [ // Aquário redondo com peixinho (o "pet" do JoJo, só enfeite)
    ['aquarioVidro', '#b3e5fc', `${circ(206, 146, 20)}`, { alpha: 0.55 }],
    ['aquarioAgua', '#4fc3f7', 'M187,146 C190,166 222,166 225,146 Z', { alpha: 0.6 }],
    ['aquarioPeixe', '#ff9800', 'M198,152 C202,146 210,146 212,152 C210,158 202,158 198,152 Z M212,152 L218,147 L218,157 Z', { balanca: 1 }],
    ['aquarioBase', '#8d6e63', 'M192,164 L220,164 L218,167 L194,167 Z']] },
  dc15: { lado: 'fundo', pecas: [ // Bandeira do Clube do Tubarão (pendurada atrás)
    ['bandeiraMastro', '#6d4c41', rect(-8, 2, 3, 165)],
    ['bandeiraPano', '#1a237e', 'M-5,6 L50,10 L46,30 L50,50 L-5,46 Z', { balanca: 1 }],
    ['bandeiraBarbatana', '#eceff1', poly([[8, 40], [22, 16], [30, 40]]), { balanca: 1 }]] },
  dl10: { lado: 'direita', pecas: [ // Estátua do Campeão (lendário): o tubarão da JOJOcoin em ouro
    ['estatuaPedestal', '#5d4037', 'M180,167 L226,167 L222,150 L184,150 Z'],
    ['estatuaPlaca', '#c9a227', rect(190, 155, 26, 7)],
    ['estatuaBase', '#a67c00', 'M184,150 L222,150 L218,144 L188,144 Z'],
    ['estatuaTubarao', '#f2b51e', escalar(`${TUBARAO} ${PEITORAL} ${PELVICA}`, 0.2, 144, 61)],
    ['estatuaOlho', '#4a2c02', escalar(OLHO, 0.2, 144, 61)],
    ['estatuaBrilho', '#fff3b0', estrela(212, 92, 4, 4, 0.3), { pulso: 1 }]] },
  dl05: { lado: 'fundo', pecas: [ // Trono de ouro (lendário): atrás do JoJo
    ['tronoEncosto', '#c9a227', 'M40,167 L40,60 C40,30 140,30 140,60 L140,167 Z'],
    ['tronoVeludo', '#8e0000', 'M50,160 L50,66 C50,44 130,44 130,66 L130,160 Z'],
    ['tronoJoias', '#00e5ff', `${circ(90, 44, 5)} ${circ(46, 80, 3.5)} ${circ(134, 80, 3.5)}`, { pulso: 1 }],
    ['tronoPes', '#a67c00', 'M34,167 L46,167 L46,150 L34,150 Z M134,167 L146,167 L146,150 L134,150 Z'],
    ['tronoBracos', '#c9a227', 'M26,120 L52,120 L52,130 L26,130 Z M128,120 L154,120 L154,130 L128,130 Z']] },
};

/** Extensão de cada lado (px do rig) ocupada pelas decorações: a janela cresce o necessário. */
export function espacoDecor(ids) {
  const out = { l: 0, r: 0, t: 0 };
  for (const id of ids) {
    const d = DECOR[id];
    if (!d) continue;
    if (d.lado === 'esquerda') out.l = Math.max(out.l, 60);
    if (d.lado === 'direita') out.r = Math.max(out.r, id === 'dc08' || id === 'dc12' ? 66 : 62);
    if (d.lado === 'fundo' && id === 'dc15') out.l = Math.max(out.l, 12);
  }
  return out;
}

/** Rig só das decorações (desenhado à parte, parado no chão). */
export function rigDecor() {
  const groups = Object.entries(DECOR).map(([id, d]) => ({ id: `decor_${id}`, showIf: `decor_${id}`, outline: d.lado !== 'fundo', parts: d.pecas.map(([pid, fill, path, o = {}]) => {
    const part = { id: `${id}_${pid}`, fill, path };
    if (o.alpha) part.alpha = o.alpha;
    if (o.balanca) Object.assign(part, { pivot: pivoDe(path), rot: o.balanca > 0 ? 'decorBalanca' : 'decorBalancaInv' });
    if (o.pulso) part.scaleBy = 'decorPulso', part.scalePivot = pivoDe(path);
    return part;
  }) }));
  return { format: 1, name: 'decor', metrics: { box: { width: 180, height: 170 }, ground: 167, head: { x: 90, y: 10 }, rootPivot: { x: 90, y: 167 } }, palette: { outline: '#1b2433' }, outlineWidth: 1.4, face: { eyes: [], gills: [], teeth: [], pivot: [0, 0] }, faceAfter: '__nunca__', groups };
}

// Pivô aproximado (meio da caixa do path), suficiente para balanço/pulso discretos.
function pivoDe(path) {
  const nums = String(path).match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [0, 0];
  const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
  return [r1((Math.min(...xs) + Math.max(...xs)) / 2), r1(Math.max(...ys))];
}

/** Pose das decorações no instante `t` (s): balanço e pulso leves; parado no movimento reduzido. */
export function poseDecor(ids, t, reduzido = false) {
  const pose = { decorBalanca: reduzido ? 0 : 4 * Math.sin(t * 1.3), decorBalancaInv: reduzido ? 0 : -4 * Math.sin(t * 1.1), decorPulso: reduzido ? 1 : 1 + 0.04 * Math.sin(t * 2.4) };
  for (const id of ids) pose[`decor_${id}`] = 1;
  return pose;
}

// ------------------------------------------------------------------ aura lendária e forma Megalodon

const AURA = [
  ['auraLendaFora', '#ffd54f', 'M20,167 C-6,120 10,40 50,10 C70,-4 110,-4 130,10 C170,40 186,120 160,167 Z', { alpha: 0.22, scaleBy: 'ljAuraK', scalePivot: [90, 167] }],
  ['auraLendaDentro', '#fff8e1', 'M34,167 C14,124 26,54 60,26 C76,14 104,14 120,26 C154,54 166,124 146,167 Z', { alpha: 0.28, scaleBy: 'ljAuraK2', scalePivot: [90, 167] }],
  ['auraLendaFaiscas', '#ffecb3', [estrela(26, 70, 5, 4, 0.3), estrela(154, 56, 6, 4, 0.3), estrela(40, 20, 4, 4, 0.3), estrela(140, 128, 5, 4, 0.3)].join(' '), { alpha: 0.9, scaleBy: 'ljAuraK', scalePivot: [90, 90] }],
];

/**
 * Copia o rig acrescentando os visuais e os objetos da loja (e a aura lendária).
 * Depois de `rigComVisuais`: usa os grupos de nível (nivelCorpo, nivelPintura) se existirem
 * e cria os que faltarem nos mesmos lugares (pré-visualização da Central usa o rig puro).
 */
export function rigComLoja(rig) {
  if (!rig?.groups) return rig;
  const groups = rig.groups.map((g) => ({ ...g, parts: [...g.parts] }));
  const garante = (id, depoisDe, extra = {}) => {
    if (groups.some((g) => g.id === id)) return;
    const i = groups.findIndex((g) => g.id === depoisDe);
    groups.splice(i >= 0 ? i + 1 : groups.length, 0, { id, hideIf: 'mooning', parts: [], ...extra });
  };
  garante('nivelCorpo', 'shortsDetail', { outline: true });
  garante('nivelPintura', 'armDetail');
  const byId = new Map(groups.map((g) => [g.id, g]));
  // Visuais: cada peça só aparece com o canal do visual (lj_lvNN).
  const corpoGrupos = new Set(['costumeBack', 'legs', 'legDetail', 'body', 'bodyDetail', 'shorts', 'shortsDetail', 'costumes', 'nivelCorpo', 'nivelPintura']);
  for (const [id, look] of Object.entries(LOOKS)) {
    const canal = canalLoja(id);
    const partes = [...fantasiaInteira(look.fantasia, look.cores), ...(look.extras || [])];
    for (const [group, pid, fill, path, extra] of partes) {
      const alvo = byId.get(group) || byId.get('costumes');
      const part = { id: `${id}_${pid}`, fill, path, showIf: canal, ...(extra || {}) };
      if (corpoGrupos.has(alvo.id) && !part.parent && part.rot !== 'headRot') part.corpoX = true;
      alvo.parts.push(part);
    }
  }
  // Objetos interativos: na mão (grupo da mão, por cima do braço) ou no chão.
  const mao = byId.get('costumeHand') || byId.get('costumes');
  const chao = byId.get('catalogFloor') || mao;
  for (const [id, pecas] of Object.entries(OBJETOS)) {
    for (const [pid, fill, path, extra] of pecas) {
      const alvo = extra?.parent ? mao : chao;
      alvo.parts.push({ id: `${id}_${pid}`, fill, path, showIf: canalObjeto(id), ...(extra || {}) });
    }
  }
  // Aura lendária: atrás de tudo.
  groups.unshift({ id: 'ljAura', showIf: 'ljAura', parts: AURA.map(([pid, fill, path, extra]) => ({ id: pid, fill, path, ...(extra || {}) })) });
  // Forma Megalodon: pele escura de tubarão antigo (paleta própria enquanto o canal está ligado).
  const costumes = { ...(rig.costumes || {}), peleMegalodon: { palette: { body: '#3b4a5a', bodyShade: '#2a3542', muscle: '#2a3542', cream: '#c9c2b0', nvCabecaPele: '#3b4a5a', nvBracos: '#3b4a5a', nvPernas: '#3b4a5a' } },
    peleDourada: { palette: { body: '#e8b21f', bodyShade: '#b9850d', muscle: '#a67c00', cream: '#fff3b0', nvCabecaPele: '#e8b21f', nvBracos: '#e8b21f', nvPernas: '#e8b21f' } } };
  return { ...rig, groups, costumes };
}

/** Canais para vestir um visual da loja (com a bermuda escondida quando o visual traz a parte de baixo). */
export function canaisLook(id) {
  const look = LOOKS[id];
  if (!look) return null;
  const ch = { [canalLoja(id)]: 1 };
  if (look.fantasia.baixo !== null) ch.nvSemBermuda = 1;
  if (look.pele) ch[`costume_${look.pele}`] = 1;
  return ch;
}

/** Canais da forma Megalodon (cabeça e corpo maiores, pele antiga). */
export const CANAIS_MEGALODON = Object.freeze({ nvCabeca: 1.12, nvCorpo: 1.18, costume_peleMegalodon: 1, ljAura: 0 });

/** Pulsação da aura lendária. */
export function poseAura(t, reduzido = false) {
  return { ljAura: 1, ljAuraK: reduzido ? 1 : 1 + 0.035 * Math.sin(t * 1.7), ljAuraK2: reduzido ? 1 : 1 + 0.05 * Math.sin(t * 2.3 + 1) };
}
