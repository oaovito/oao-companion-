// Pegadinha semanal (pedido de 18/11/2026): um consolo gigante cai do alto na cabeça do JoJo
// e dá um traumatismo craniano de desenho animado — amassa, galo enorme, rachadura, gota de
// sangue, olhos em X, estrelinhas girando, cai tonto e levanta enfaixado. Uma vez por semana
// em momento sorteado, também no foco (Modo Trabalho e tela cheia continuam mandando: espera).
// Depois ele fica uma hora com a cabeça enfaixada e o galo (visual temporário).
// As peças entram numa CÓPIA do rig; o arquivo do rig não muda.

const CABECA = { pivot: [90, 86], rot: 'headRot' };
const r1 = (n) => Math.round(n * 10) / 10;
const elip = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} a${r1(rx)},${r1(ry)} 0 1,0 ${r1(2 * rx)},0 a${r1(rx)},${r1(ry)} 0 1,0 ${r1(-2 * rx)},0 Z`;
const estrela = (cx, cy, r) => {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; return `${r1(cx + Math.cos(a) * rr)},${r1(cy + Math.sin(a) * rr)}`; });
  return `M${pts.join(' L')} Z`;
};

/** Duração da animação (ms) e quanto tempo ele fica enfaixado depois. */
export const DILDO_MS = 6500;
export const ATADURA_MS = 60 * 60e3;

// O consolo: haste rosa com cabeça arredondada, anel e base larga (cai de pé, de cima).
// A queda (dlY) vem de uma peça-mãe invisível, aplicada antes do giro: ele cai reto e deita no chão.
const CONSOLO = { parent: 'dlQueda', pivot: [90, -40], rot: 'dlRot' };
export const GRUPOS_DILDO = [
  { id: 'dlQuedaG', showIf: 'dildoCai', parts: [{ id: 'dlQueda', fill: 'outline', alpha: 0, dx: 'dlX', dy: 'dlY', path: 'M90,-40 L90.1,-40 L90,-39.9 Z' }] },
  { id: 'dlConsolo', outline: true, showIf: 'dildoCai', parts: [
    { id: 'dlHaste', fill: '#ff5fa2', path: 'M78,-26 C78,-60 80,-92 90,-100 C100,-92 102,-60 102,-26 Z', ...CONSOLO },
    { id: 'dlAnel', fill: '#ff3d8b', path: 'M77,-74 C84,-78 96,-78 103,-74 L103,-68 C96,-72 84,-72 77,-68 Z', ...CONSOLO },
    { id: 'dlBase', fill: '#ff3d8b', path: 'M66,-26 C66,-34 114,-34 114,-26 C114,-18 66,-18 66,-26 Z', ...CONSOLO },
  ] },
  { id: 'dlConsoloBrilho', showIf: 'dildoCai', parts: [
    { id: 'dlReflexo', fill: '#ffd1e6', alpha: 0.8, path: 'M84,-36 C84,-60 85,-82 89,-92 C87,-80 87,-60 87,-36 Z', ...CONSOLO },
  ] },
  // Galo (cresce com dlGaloK) e a atadura, presos na cabeça.
  { id: 'dlCabeca', outline: true, showIf: 'dildoGalo', parts: [
    { id: 'dlGalo', fill: '#e86a6a', path: elip(98, 6, 15, 11), ...CABECA, scaleBy: 'dlGaloK', scalePivot: [98, 16] },
  ] },
  { id: 'dlFerida', showIf: 'dildoGalo', parts: [
    { id: 'dlBrilhoGalo', fill: '#ffd0d0', alpha: 0.85, path: elip(94, 2, 4, 3), ...CABECA, scaleBy: 'dlGaloK', scalePivot: [98, 16] },
    { id: 'dlRachadura', fill: '#17171f', path: 'M70,14 L76,22 L72,26 L80,34 L77,35 L69,27 L73,23 L67,15 Z', ...CABECA },
    { id: 'dlSangue', fill: '#c62828', path: 'M74,30 C71,36 72,40 75,40 C78,40 79,36 74,30 Z', ...CABECA, dy: 'dlSangue' },
  ] },
  { id: 'dlAtadura', outline: true, showIf: 'dildoAtadura', parts: [
    { id: 'dlFaixa', fill: '#f5f2ea', path: 'M46,30 C60,14 120,14 134,30 L132,40 C116,26 64,26 48,40 Z', ...CABECA },
    { id: 'dlEsparadrapo', fill: '#f5f2ea', path: 'M88,0 L108,10 L105,15 L85,5 Z M86,12 L108,2 L110,7 L88,17 Z', ...CABECA },
  ] },
  { id: 'dlAtaduraMancha', showIf: 'dildoAtadura', parts: [
    { id: 'dlManchaSangue', fill: '#d32f2f', alpha: 0.75, path: elip(66, 30, 4, 3), ...CABECA },
  ] },
  // Estrelinhas girando em volta da cabeça (tonto).
  { id: 'dlTonto', showIf: 'dildoTonto', parts: [
    { id: 'dlEstrelas', fill: '#ffd54f', path: [[56, -6], [90, -16], [124, -6], [106, 6], [74, 6]].map(([x, y]) => estrela(x, y, 6)).join(' '), pivot: [90, -4], rot: 'dlEstrelasRot' },
  ] },
];

/** Rig com a pegadinha (cópia). Sem os canais ligados, nada aparece. */
export function rigComDildo(rig) {
  if (!rig || !Array.isArray(rig.groups) || rig.groups.some((g) => g.id === 'dlConsolo')) return rig;
  return { ...rig, groups: [...rig.groups, ...structuredClone(GRUPOS_DILDO)] };
}

/** Canais do visual de depois (enfaixado com o galo), enquanto durar. */
export const CANAIS_ATADURA = { dildoAtadura: 1, dildoGalo: 1, dlGaloK: 1 };

/** Falas na hora da pancada (sem pudor). */
export const FALAS_DILDO = [
  'AI! Quem largou essa porra aqui?! Traumatismo craniano de pica de borracha.',
  'Caiu um consolo do céu. Na minha cabeça. Que semana, {nome}.',
  'Tô vendo estrelinha… e um pinto rosa gigante. Nessa ordem.',
];
