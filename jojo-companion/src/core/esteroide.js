// Êxtase Anabólico (STEROID_EUPHORIA, pedido de 19/11/2026): 15 s de comédia de desenho.
// 1) A seringa TREMBOLONA com coração aparece; pupilas dilatadas e baba.
// 2) Aplicação fictícia de desenho (encosta no ombro, plim); olhos revirados, tremedeira,
//    bochecha corada, corações e estrelas.
// 3) Chegam Testosterona, Nandrolona, Boldenona e Stanozolol; os músculos incham (desenho).
// 4) Clímax: olhos brancos, brilho dourado, pose de fisiculturista e os balões
//    "EU CONSIGO OUVIR MEUS RECEPTORES ANDROGÊNICOS." e "NÃO É VÍCIO. É AMOR.".
// 5) Depois: uma lágrima, "Foi melhor que meu último relacionamento." e tudo volta ao normal.
// Sem nudez, sem técnica real (nada de dose, local ou passo a passo), sem áudio, sem braço
// novo: só adereços flutuando. As peças entram numa CÓPIA do rig; o arquivo do rig não muda.

export const ESTEROIDE_MS = 15000;

const CABECA = { pivot: [90, 86], rot: 'headRot' };
const r1 = (n) => Math.round(n * 10) / 10;
const elip = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} a${r1(rx)},${r1(ry)} 0 1,0 ${r1(2 * rx)},0 a${r1(rx)},${r1(ry)} 0 1,0 ${r1(-2 * rx)},0 Z`;
const rect = (x, y, w, h) => `M${r1(x)},${r1(y)} L${r1(x + w)},${r1(y)} L${r1(x + w)},${r1(y + h)} L${r1(x)},${r1(y + h)} Z`;
const coracao = (cx, cy, s) => `M${r1(cx)},${r1(cy + s * 0.8)} C${r1(cx - s * 1.4)},${r1(cy - s * 0.1)} ${r1(cx - s * 0.7)},${r1(cy - s * 1.2)} ${r1(cx)},${r1(cy - s * 0.4)} C${r1(cx + s * 0.7)},${r1(cy - s * 1.2)} ${r1(cx + s * 1.4)},${r1(cy - s * 0.1)} ${r1(cx)},${r1(cy + s * 0.8)} Z`;
const estrela = (cx, cy, r) => {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; return `${r1(cx + Math.cos(a) * rr)},${r1(cy + Math.sin(a) * rr)}`; });
  return `M${pts.join(' L')} Z`;
};

/** Os rótulos das seringas, na ordem em que aparecem. */
export const ROTULOS = ['TREMBOLONA', 'TESTOSTERONA', 'NANDROLONA', 'BOLDENONA', 'STANOZOLOL'];
const CORES = ['#ffb300', '#4fc3f7', '#ab47bc', '#66bb6a', '#ff7043'];

/**
 * Uma seringa de desenho (agulha, corpo com líquido, rótulo com o nome, êmbolo).
 * (x, y) é a ponta da agulha; dir 1 = corpo para a direita da ponta, -1 = para a esquerda.
 */
function seringa(id, x, y, k, dir, rotulo, cor, extra) {
  const X = (dx) => x + dir * dx * k;
  const faixa = (a, b, y0, y1) => rect(Math.min(X(a), X(b)), y + y0 * k, Math.abs(X(b) - X(a)), (y1 - y0) * k);
  const p = (sufixo, fill, path, more = {}) => ({ id: `${id}${sufixo}`, fill, path, ...extra, ...more });
  return [
    p('Agulha', '#cfd8dc', faixa(0, 22, -1, 1)),
    p('Bico', '#90a4ae', faixa(20, 26, -3.5, 3.5)),
    p('Corpo', '#eceff1', faixa(26, 92, -8, 8), { alpha: 0.95 }),
    p('Liquido', cor, faixa(28, 66, -6, 6)),
    p('Rotulo', '#ffffff', faixa(30, 88, -5.5, 5.5), { text: rotulo, textFill: '#b71c1c', fontSize: r1(6.6 * k), textX: r1((X(30) + X(88)) / 2), textY: r1(y + 0.4) }),
    p('Embolo', '#78909c', faixa(92, 110, -2.5, 2.5)),
    p('Polegar', '#546e7a', faixa(110, 114, -9, 9)),
    p('Aba', '#90a4ae', faixa(90, 94, -11, 11)),
  ];
}

// Seringa principal (TREMBOLONA): ponta da agulha em (80, 108); flutua na frente do peito e,
// na fase 2, desliza (stSerX/stSerY) até encostar no ombro esquerdo.
const PRINCIPAL = seringa('stS1', 80, 108, 1.1, 1, ROTULOS[0], CORES[0], { dx: 'stSerX', dy: 'stSerY' });
// As outras quatro chegam em volta dele (fase 3), balançando (stBob).
const OUTRAS = [
  seringa('stS2', 46, 18, 0.92, -1, ROTULOS[1], CORES[1], { dy: 'stBob' }),
  seringa('stS3', 134, 18, 0.92, 1, ROTULOS[2], CORES[2], { dy: 'stBob2' }),
  seringa('stS4', 42, 140, 0.92, -1, ROTULOS[3], CORES[3], { dy: 'stBob2' }),
  seringa('stS5', 138, 140, 0.92, 1, ROTULOS[4], CORES[4], { dy: 'stBob' }),
];

/** Grupos que vão por trás de tudo (brilho dourado do clímax). */
export const GRUPOS_ESTEROIDE_FUNDO = [
  { id: 'stAura', showIf: 'stAura', parts: [
    { id: 'stAuraRaios', fill: '#ffe082', alpha: 0.55, path: Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6, b = a + 0.12; return `M90,90 L${r1(90 + Math.cos(a - 0.12) * 128)},${r1(90 + Math.sin(a - 0.12) * 128)} L${r1(90 + Math.cos(b) * 128)},${r1(90 + Math.sin(b) * 128)} Z`; }).join(' '), pivot: [90, 90], rot: 'stAuraRot' },
    { id: 'stAuraBrilho', fill: '#ffd54f', alpha: 0.45, path: elip(90, 90, 96, 104), scaleBy: 'stAuraK', scalePivot: [90, 90] },
    { id: 'stAuraMiolo', fill: '#fff8e1', alpha: 0.5, path: elip(90, 90, 70, 80), scaleBy: 'stAuraK', scalePivot: [90, 90] },
  ] },
];

/** Grupos por cima do JoJo (desenhados depois do rosto). */
export const GRUPOS_ESTEROIDE = [
  // Bíceps e veias de desenho: crescem com stBiceps, presos aos braços (seguem a pose).
  { id: 'stMusculos', outline: true, showIf: 'stMusculos', parts: [
    { id: 'stBicepsL', fill: 'body', path: elip(34, 110, 11, 13), parent: 'armL', scaleBy: 'stBiceps', scalePivot: [38, 112] },
    { id: 'stBicepsR', fill: 'body', path: elip(146, 110, 11, 13), parent: 'armR', scaleBy: 'stBiceps', scalePivot: [142, 112] },
  ] },
  { id: 'stVeias', showIf: 'stVeias', parts: [
    { id: 'stVeiaL', fill: '#7e57c2', path: 'M30,104 C33,110 29,114 32,120 L33.6,119.4 C31,114 35,110 31.6,103.4 Z M36,106 C38,111 36,113 38,117 L39.4,116.6 C37.6,113 39.6,111 37.4,105.6 Z', parent: 'armL', scaleBy: 'stBiceps', scalePivot: [38, 112] },
    { id: 'stVeiaR', fill: '#7e57c2', path: 'M150,104 C147,110 151,114 148,120 L146.4,119.4 C149,114 145,110 148.4,103.4 Z M144,106 C142,111 144,113 142,117 L140.6,116.6 C142.4,113 140.4,111 142.6,105.6 Z', parent: 'armR', scaleBy: 'stBiceps', scalePivot: [142, 112] },
    { id: 'stVeiaPeito', fill: '#7e57c2', alpha: 0.85, path: 'M70,92 C74,98 70,102 74,108 L75.4,107.2 C72,102 76,98 71.6,91.4 Z M110,92 C106,98 110,102 106,108 L104.6,107.2 C108,102 104,98 108.4,91.4 Z' },
  ] },
  // Olhos: pupilas dilatadas (fase 1), olhos brancos (clímax), presos na cabeça.
  { id: 'stPupilas', showIf: 'stPupilas', parts: [
    { id: 'stPupila', fill: '#111111', path: `${elip(81, 41, 6.4, 7)} ${elip(99, 41, 6.4, 7)}`, ...CABECA },
    { id: 'stPupilaBrilho', fill: '#ffffff', path: `${elip(78.6, 38, 2, 2.2)} ${elip(96.6, 38, 2, 2.2)} ${elip(83, 44, 1, 1)} ${elip(101, 44, 1, 1)}`, ...CABECA },
  ] },
  { id: 'stOlhosBrancos', outline: true, showIf: 'stOlhosBrancos', parts: [
    { id: 'stOlhoBranco', fill: 'sclera', path: `${elip(79, 38, 10, 11)} ${elip(101, 38, 10, 11)}`, ...CABECA },
  ] },
  // Baba escorrendo do canto da boca (estica com stBaba) e a lágrima do final (desce com stLagrima).
  { id: 'stBabaG', showIf: 'stBaba', parts: [
    { id: 'stBaba', fill: '#b3e5fc', alpha: 0.9, path: 'M114,64 C113,70 112,76 114,80 C116,83 119,81 118,77 C117,73 117,69 117,64 Z', ...CABECA, scaleBy: 'stBabaK', scalePivot: [115.5, 64] },
  ] },
  { id: 'stLagrimaG', outline: true, showIf: 'stLagrima', parts: [
    { id: 'stLagrima', fill: '#81d4fa', path: 'M72,46 C69,51 69,55 72,55.6 C75,55 75,51 72,46 Z', ...CABECA, dy: 'stLagrimaY' },
  ] },
  // Seringas (adereços flutuando; ele não ganha braço nenhum).
  { id: 'stSeringa', outline: true, showIf: 'stSeringa', parts: PRINCIPAL },
  { id: 'stSeringas', outline: true, showIf: 'stSeringas', parts: OUTRAS.flat() },
  { id: 'stCoracaoRotulo', showIf: 'stSeringa', parts: [
    { id: 'stCoracaoS1', fill: '#e91e63', path: coracao(145, 91, 6), dx: 'stSerX', dy: 'stSerY' },
  ] },
  // "Plim" no ombro (fase 2) e corações/estrelas subindo (fases 2 a 4).
  { id: 'stPlim', showIf: 'stPlim', parts: [
    { id: 'stPlimEstrela', fill: '#fff176', path: estrela(44, 92, 9), scaleBy: 'stPlimK', scalePivot: [44, 92] },
  ] },
  { id: 'stEuforia', showIf: 'stEuforia', parts: [
    { id: 'stCoracoes', fill: '#ff4081', path: [coracao(30, 30, 6), coracao(150, 20, 7), coracao(16, 80, 5), coracao(166, 72, 6), coracao(92, -14, 5)].join(' '), dy: 'stSobe' },
    { id: 'stEstrelas', fill: '#ffd54f', path: [estrela(56, -6, 6), estrela(126, -4, 7), estrela(8, 50, 5), estrela(172, 44, 5)].join(' '), dy: 'stSobe2' },
  ] },
];

/** Rig com o Êxtase Anabólico (cópia). Sem os canais ligados, nada aparece. */
export function rigComEsteroide(rig) {
  if (!rig || !Array.isArray(rig.groups) || rig.groups.some((g) => g.id === 'stSeringa')) return rig;
  return { ...rig, groups: [...structuredClone(GRUPOS_ESTEROIDE_FUNDO), ...rig.groups, ...structuredClone(GRUPOS_ESTEROIDE)] };
}

// Tempos (fração dos 15 s).
export const FASES = { aparece: 0, aplica: 0.2, chegam: 0.4, climax: 0.64, depois: 0.86 };
const T = (s) => Math.round((s / 15) * 10000) / 10000;

/** Os balões, em segundos desde o começo. */
export const BALOES_ESTEROIDE = [
  { s: 1.2, texto: 'Trembolona… com coraçãozinho. Ela me entende, {nome}.' },
  { s: 10, texto: 'EU CONSIGO OUVIR MEUS RECEPTORES ANDROGÊNICOS.' },
  { s: 12, texto: 'NÃO É VÍCIO. É AMOR.' },
  { s: 13.4, texto: 'Foi melhor que meu último relacionamento.' },
];

const liga = (a, b) => [[0, 0], [T(a), 1, 'step'], [T(b), 0, 'step'], [1, 0]];
const tremor = (a, b, amp) => {
  const out = [[0, 0], [T(a), 0]];
  for (let s = a, i = 0; s < b; s += 0.08, i++) out.push([T(s), i % 2 ? -amp : amp, 'step']);
  out.push([T(b), 0, 'step'], [1, 0]);
  return out;
};

/** A animação (15 s). Tudo que liga também desliga antes do fim: volta ao JoJo de sempre. */
export function animacaoEsteroide() {
  return {
    duration: ESTEROIDE_MS,
    blendIn: 0,
    mark: '!',
    tracks: {
      // Fase 1: seringa flutuando; ele encara (pupilas dilatadas, baba).
      stSeringa: liga(0.3, 5.2),
      stSerX: [[0, 0], [T(3), 0], [T(4.2), -36], [T(4.45), -31], [T(4.7), -36], [T(5.2), -36], [1, -36]],
      stSerY: [[0, 0], [T(1), -3], [T(2), 2], [T(3), 0], [T(4.2), -16], [T(5.2), -16], [1, -16]],
      stPupilas: liga(0.6, 3.6),
      pupilX: [[0, 0], [T(0.6), 0.5], [T(3.6), 0.5], [T(3.8), 0], [1, 0]],
      pupilY: [[0, 0], [T(0.6), 0.6], [T(3.6), 0.6], [T(4.6), -1.7], [T(8.5), -1.7], [T(8.8), 0], [1, 0]],
      eyeScale: [[0, 1], [T(0.6), 1.18], [T(3.6), 1.18], [T(4), 1], [1, 1]],
      stBaba: liga(1.4, 9),
      stBabaK: [[0, 0.3], [T(1.4), 0.3], [T(3.5), 1.4], [T(6), 1.8], [T(9), 2], [1, 2]],
      jaw: [[0, 0.5], [T(1.2), 0.9], [T(4.6), 1.1], [T(9.6), 0.6], [T(10), 1.3], [T(12.8), 1.2], [T(13.2), 0.4], [T(14.6), 0.5], [1, 0.5]],
      // Fase 2: encosta no ombro, plim; tremedeira, bochecha corada, corações e estrelas.
      stPlim: liga(4.25, 5),
      stPlimK: [[0, 0.4], [T(4.25), 0.4], [T(4.6), 1.4], [T(5), 0.6], [1, 0.6]],
      rootX: tremor(5, 8.6, 1.6),
      blush: [[0, 0], [T(4.5), 0], [T(5.2), 1], [T(12.8), 1], [T(13.4), 0.4], [T(14.6), 0], [1, 0]],
      stEuforia: liga(5, 12.8),
      stSobe: [[0, 0], [T(5), 0], [T(8), -22], [T(8.01), 0], [T(11), -22], [T(11.01), 0], [T(12.8), -12], [1, -12]],
      stSobe2: [[0, 0], [T(5), -6], [T(8), -26], [T(8.01), -4], [T(11), -26], [T(11.01), -4], [T(12.8), -16], [1, -16]],
      // Fase 3: chegam as outras quatro; músculos incham (desenho).
      stSeringas: liga(6, 12.6),
      stBob: [[0, 0], [T(6), -4], [T(7), 3], [T(8), -4], [T(9), 3], [T(10), -4], [T(11), 3], [T(12), -4], [1, 0]],
      stBob2: [[0, 0], [T(6), 3], [T(7), -4], [T(8), 3], [T(9), -4], [T(10), 3], [T(11), -4], [T(12), 3], [1, 0]],
      stMusculos: liga(6.4, 14.8),
      stVeias: liga(7.4, 13.6),
      stBiceps: [[0, 1], [T(6.4), 0.9], [T(8.4), 1.35], [T(9.6), 1.45], [T(12.8), 1.5], [T(13.6), 1.2], [T(14.6), 0.9], [1, 0.9]],
      stMusculo: [[0, 1], [T(6.4), 1], [T(8.4), 1.18], [T(9.6), 1.26], [T(12.8), 1.28], [T(13.6), 1.12], [T(14.6), 1], [1, 1]],
      squashY: [[0, 1], [T(6.4), 1], [T(8.4), 1.06], [T(12.8), 1.08], [T(13.6), 1.02], [T(14.6), 1], [1, 1]],
      // Fase 4: clímax (olhos brancos, brilho dourado, pose de fisiculturista).
      stOlhosBrancos: liga(9.6, 12.9),
      stAura: liga(9.4, 13),
      stAuraK: [[0, 0.6], [T(9.4), 0.6], [T(10.2), 1.08], [T(11), 0.96], [T(11.8), 1.08], [T(12.6), 1], [1, 1]],
      stAuraRot: [[0, 0], [T(9.4), 0], [T(13), 40], [1, 40]],
      legFL: [[0, 0], [T(9.2), 0], [T(9.6), 86], [T(12.9), 86], [T(13.4), 0], [1, 0]],
      elbowL: [[0, 0], [T(9.2), 0], [T(9.6), 118], [T(12.9), 118], [T(13.4), 0], [1, 0]],
      legFR: [[0, 0], [T(9.2), 0], [T(9.6), 86], [T(12.9), 86], [T(13.4), 0], [1, 0]],
      elbowR: [[0, 0], [T(9.2), 0], [T(9.6), 118], [T(12.9), 118], [T(13.4), 0], [1, 0]],
      headRot: [[0, 0], [T(4.6), 0], [T(5), -6], [T(8.6), 6], [T(9.4), 0], [T(10), -4], [T(12.9), -4], [T(13.4), 4], [T(14.6), 0], [1, 0]],
      rootY: [[0, 0], [T(9.2), 0], [T(9.6), -6], [T(9.9), 0], [1, 0]],
      // Fase 5: uma lágrima e volta ao normal.
      stLagrima: liga(13, 14.9),
      stLagrimaY: [[0, 0], [T(13), 0], [T(14.9), 22], [1, 22]],
      eyeOpen: [[0, 1], [T(13), 1], [T(13.3), 0.55], [T(14.5), 0.55], [T(14.8), 1], [1, 1]],
    },
  };
}

/** Canais que a animação usa e o valor neutro (para os testes de "volta ao normal"). */
export const NEUTRO_ESTEROIDE = { stSerX: -36, stSerY: -16, stBabaK: 2, stPlimK: 0.6, stSobe: -12, stSobe2: -16, stBiceps: 0.9, stMusculo: 1, squashY: 1, stAuraK: 1, stAuraRot: 40, stLagrimaY: 22, eyeScale: 1, eyeOpen: 1, jaw: 0.5 };

/** Valor de repouso dos canais st* (os que não estão aqui ficam em 0 = desligado). */
export const REPOUSO_ESTEROIDE = { stMusculo: 1, stBiceps: 1, stAuraK: 1, stBabaK: 1, stPlimK: 1 };
