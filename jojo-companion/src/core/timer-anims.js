// Animações dos timers (0.47.5): o JoJo mexe no relógio de verdade. O relógio não é
// peça do rig: é desenhado pelo overlay (src/renderer/shared/relogio-desenho.js) no lugar
// que os canais tm* mandam, então gesto e relógio andam juntos no mesmo quadro.
//
// Canais do relógio (todos voltam a 0 no fim; nada aqui muda o tempo do timer):
//   tmMix   0 = relógio no lugar dele; 1 = no ponto da animação
//   tmMao   0 = ponto fixo (tmX, tmY) na caixa do JoJo; 1 = mão direita; 2 = mão esquerda; 3 = entre as mãos
//   tmX/tmY ponto (ou deslocamento a partir da mão), coordenadas do rig (caixa 180×170)
//   tmDx/tmDy deslocamento extra; tmRot giro (graus); tmK escala extra (0 = normal)
//   tmSx/tmSy deformação (0 = normal); tmTreme tremor (px); tmAmp vira ampulheta;
//   tmFrente desenha na frente do JoJo; tmSome some (0..1)
// O modelo do JoJo não muda: só braços, rosto, corpo e adereços temporários `tm_*`.
import { linha, elip, rect, estrela, txt, grupo, VAZIO } from './virais.js';

// ------------------------------------------------------------------ geometria do braço
const rotP = ([x, y], [cx, cy], deg) => {
  const a = (deg * Math.PI) / 180, dx = x - cx, dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
};
/** Ponto do rig depois da raiz (squash, giro, escala, deslocamento), como o RigRenderer faz. */
export function pelaRaiz(p, pose = {}) {
  let [x, y] = p;
  x = 90 + (x - 90) * (pose.squashX ?? 1); y = 167 + (y - 167) * (pose.squashY ?? 1);
  [x, y] = rotP([x, y], [90, 167], pose.rootRot || 0);
  const s = pose.scale ?? 1;
  x = 90 + (x - 90) * s; y = 167 + (y - 167) * s;
  return [x + (pose.rootX || 0), y + (pose.rootY || 0)];
}
/** Onde está a mão ('R' ou 'L') nesta pose, em coordenadas do rig (antes do espelho do lado). */
export function pontoDaMao(pose = {}, lado = 'R') {
  const R = lado !== 'L';
  let p = R ? [150, 151] : [30, 151];
  p = rotP(p, R ? [144, 128] : [36, 128], (pose[R ? 'elbowR' : 'elbowL'] || 0) * (R ? -1 : 1));
  p = rotP(p, R ? [134, 92] : [46, 92], (pose[R ? 'legFR' : 'legFL'] || 0) * (R ? -1 : 1));
  return pelaRaiz(p, pose);
}
/** Ponto-alvo do relógio na pose (antes de misturar com o lugar de repouso). */
export function alvoDoRelogio(pose = {}) {
  const m = Math.round(pose.tmMao || 0);
  if (m <= 0) return [pose.tmX || 0, pose.tmY || 0];
  const [x, y] = m === 1 ? pontoDaMao(pose, 'R') : m === 2 ? pontoDaMao(pose, 'L') : pontoDaMao(pose, 'R').map((v, i) => (v + pontoDaMao(pose, 'L')[i]) / 2);
  return [x + (pose.tmX || 0), y + (pose.tmY || 0)];
}

// ------------------------------------------------------------------ adereços
const CABECA = { pivot: [90, 86], rot: 'headRot' };
const MAO_D = { parent: 'foreR' };
const xadrez = (x, y, w, h, n = 4) => {
  const out = [];
  const cw = w / n, ch = h / 3;
  for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) out.push(rect(x + i * cw, y + j * ch, cw, ch));
  return out.join(' ');
};

// ------------------------------------------------------------------ as animações
const A = [];
const def = (o) => A.push(o);
// Pontos de trabalho do relógio (caixa do rig).
const LADO = [170, 112];
const CHAO = [170, 140];
/** Relógio vem até o ponto em `a` s, fica, e volta ao lugar entre `b` s e o fim. */
const vem = (L, a, b) => L.k([0, 0], [a, 1], [b, 1], [L.D, 0]);
const pt = (L, [x, y]) => ({ tmX: L.k([0, x]), tmY: L.k([0, y]) });

// ---------- INÍCIO (1–10)
def({ num: 1, fase: 'inicio', chave: 'bolso', nome: 'Tira do bolso imaginário', dur: 3.4,
  receita: { rosto: 'sobrancelha', cabeca: 'olhaBaixo' },
  faixas: (L) => ({ legFR: L.k([0, 0], [0.5, -18], [0.9, -18], [1.4, 62], [2.5, 62], [3.1, 0]), elbowR: L.k([0, 0], [0.5, -40], [0.9, -40], [1.4, -30], [2.5, -30], [3.1, 0]),
    tmMix: L.k([0, 0], [0.9, 0, 'step'], [0.95, 1, 'step'], [2.5, 1], [3.3, 0]), tmMao: L.k([0, 0], [0.95, 1, 'step'], [3.39, 1], [3.4, 0, 'step']), tmY: L.k([0, 0], [0.95, -16, 'step']), tmSome: L.k([0, 1], [0.94, 1], [0.95, 0, 'step']),
    tmK: L.k([0, -1], [0.95, -1], [1.5, 0.1], [1.7, 0]), tmRot: L.k([0, 0], [1.0, -30], [1.6, 0]) }) });

def({ num: 2, fase: 'inicio', chave: 'tapa', nome: 'Tapa no relógio', dur: 3,
  receita: { rosto: 'bravo' },
  faixas: (L) => ({ ...pt(L, [168, 92]), tmMix: vem(L, 0.5, 2.3), legFR: L.k([0, 0], [0.6, 120], [1.15, 120], [1.3, 38], [1.9, 38], [2.5, 0]), elbowR: L.k([0, 0], [0.6, -50], [1.15, -50], [1.3, 0], [2.5, 0]),
    tmTreme: L.k([0, 0], [1.3, 0], [1.32, 4], [1.8, 0]), tmSy: L.k([0, 0], [1.28, 0], [1.33, -0.22], [1.55, 0.05], [1.7, 0]), tmRot: L.k([0, 0], [1.3, 0], [1.4, 12], [1.7, -4], [1.9, 0]),
    rootY: L.k([0, 0], [1.25, 0], [1.32, 3], [1.5, 0]) }) });

def({ num: 3, fase: 'inicio', chave: 'empurra', nome: 'Empurra até o lugar', dur: 3.6,
  receita: { rosto: 'focado' },
  faixas: (L) => ({ ...pt(L, [188, 118]), tmMix: L.k([0, 0], [0.5, 1], [1.4, 1], [3.2, 0]), tmDx: L.k([0, 0], [1.4, 0], [3.2, 30], [3.21, 0, 'step']),
    legFR: L.k([0, 0], [0.5, 58], [3.2, 58], [3.6, 0]), elbowR: L.k([0, 0], [0.5, -12], [3.2, -12], [3.6, 0]), legFL: L.k([0, 0], [0.5, -70], [3.2, -70], [3.6, 0]), elbowL: L.k([0, 0], [0.5, -40], [3.2, -40], [3.6, 0]),
    rootRot: L.k([0, 0], [0.6, 8], [3.2, 8], [3.6, 0]), rootX: L.k([0, 0], [1.4, 0], [3.2, 14], [3.6, 0]), squashY: L.k([0, 1], [1.4, 0.96], [3.2, 0.96], [3.6, 1]) }) });

def({ num: 4, fase: 'inicio', chave: 'ponteiros', nome: 'Gira os ponteiros', dur: 3.4,
  receita: { rosto: 'pensando', cabeca: 'inclina' },
  faixas: (L) => ({ ...pt(L, [176, 96]), tmFrente: L.k([0, 1]), tmMix: vem(L, 0.5, 2.8), legFR: L.k([0, 0], [0.5, 70], [2.8, 70], [3.3, 0]),
    elbowR: L.alt(-30, 10, 0.6, 2.7, 8, { rest: 0 }), tmRot: L.k([0, 0], [0.6, 0], [2.7, -270], [3.4, -360]) }) });

def({ num: 5, fase: 'inicio', chave: 'ampulhetaGigante', nome: 'Ergue uma ampulheta gigante', dur: 3.8, fx: ['suor'],
  receita: { rosto: 'orgulhoso' },
  faixas: (L) => ({ ...pt(L, [90, -18]), tmMix: vem(L, 0.8, 3.0), tmAmp: L.on(0.3, 3.4), tmK: L.k([0, 0], [0.8, 0.95], [3.0, 0.95], [3.6, 0]),
    legFR: L.k([0, 0], [0.8, 158], [3.0, 158], [3.6, 0]), legFL: L.k([0, 0], [0.8, 158], [3.0, 158], [3.6, 0]), elbowR: L.k([0, 0], [0.8, -8], [3.0, -8], [3.6, 0]), elbowL: L.k([0, 0], [0.8, -8], [3.0, -8], [3.6, 0]),
    squashY: L.k([0, 1], [0.9, 0.94], [1.4, 0.98], [3.0, 0.98], [3.4, 1]), tmRot: L.alt(-4, 4, 1.0, 3.0, 6) }) });

def({ num: 6, fase: 'inicio', chave: 'holograma', nome: 'Liga a projeção holográfica', dur: 3.6,
  receita: { rosto: 'surpreso' },
  faixas: (L) => ({ legFR: L.k([0, 0], [0.5, 72], [3.0, 72], [3.5, 0]), elbowR: L.k([0, 0], [0.5, 40], [3.0, 40], [3.5, 0]),
    tmMix: L.k([0, 0], [0.8, 0, 'step'], [0.85, 1, 'step'], [2.9, 1], [3.5, 0]), tmMao: L.k([0, 0], [0.85, 1, 'step'], [3.59, 1], [3.6, 0, 'step']), tmY: L.k([0, 0], [0.85, -40, 'step']), tmSome: L.k([0, 1], [0.84, 1], [0.85, 0, 'step']),
    tmK: L.k([0, -1], [0.85, -1], [1.4, 0]), tmSx: L.k([0, 0], [0.9, -0.4], [1.0, 0.2], [1.1, -0.2], [1.25, 0]), tm_feixe: L.on(0.6, 2.9) }),
  pecas: [grupo('tm_feixe', [{ id: 'tmFeixe', fill: '#80deea', alpha: 0.35, path: 'M196,108 L176,64 L218,64 Z' }])] });

def({ num: 7, fase: 'inicio', chave: 'aponta', nome: 'Aponta sério para o contador', dur: 3,
  receita: { rosto: 'bravo', cabeca: 'encara' },
  faixas: (L) => ({ ...pt(L, [176, 70]), tmMix: vem(L, 0.4, 2.5), legFR: L.k([0, 0], [0.5, 100], [2.5, 100], [2.9, 0]), elbowR: L.k([0, 0], [0.5, 10], [1.2, 10], [1.3, 22], [1.4, 10], [1.6, 22], [1.7, 10], [2.9, 0]),
    browShow: L.on(0.3, 2.7), browAngry: L.k([0, 0], [0.5, 0.8], [2.5, 0.8], [2.9, 0]), tmTreme: L.k([0, 0], [1.3, 0], [1.32, 2], [1.75, 0]) }) });

def({ num: 8, fase: 'inicio', chave: 'puxa', nome: 'Puxa o timer para dentro da tela', dur: 3.6,
  receita: { rosto: 'focado' },
  faixas: (L) => ({ tmMix: L.k([0, 0], [0.05, 1, 'step'], [2.8, 1], [3.5, 0]), tmMao: L.k([0, 0], [1.1, 0], [1.15, 1, 'step'], [3.59, 1], [3.6, 0, 'step']),
    tmX: L.k([0, 236], [1.1, 214], [1.15, 10, 'step'], [3.59, 10], [3.6, 0, 'step']), tmY: L.k([0, 112], [1.1, 112], [1.15, 0, 'step']), tmSome: L.k([0, 1], [0.5, 0], [3.6, 0]),
    legFR: L.k([0, 0], [0.9, 82], [1.15, 82], [1.9, 20], [2.8, 20], [3.3, 0]), elbowR: L.k([0, 0], [0.9, 8], [1.9, -40], [2.8, -40], [3.3, 0]),
    rootRot: L.k([0, 0], [0.9, 6], [1.2, 6], [1.9, -9], [2.5, -9], [3.0, 0]), rootX: L.k([0, 0], [1.2, 4], [1.9, -6], [2.6, 0]) }) });

def({ num: 9, fase: 'inicio', chave: 'poeira', nome: 'Sopra a poeira de um relógio antigo', dur: 3.8, fx: ['poeira'],
  receita: { rosto: 'neutro' },
  faixas: (L) => ({ tmMix: vem(L, 0.6, 3.0), tmMao: L.k([0, 3], [3.79, 3], [3.8, 0, 'step']), tmY: L.k([0, -14]), tmFrente: L.k([0, 1]), tmX: L.k([0, 0]),
    legFR: L.k([0, 0], [0.6, 30], [3.0, 30], [3.5, 0]), elbowR: L.k([0, 0], [0.6, -95], [3.0, -95], [3.5, 0]), legFL: L.k([0, 0], [0.6, 30], [3.0, 30], [3.5, 0]), elbowL: L.k([0, 0], [0.6, -95], [3.0, -95], [3.5, 0]),
    cheeks: L.k([0, 0], [1.2, 0], [1.5, 1], [2.0, 1], [2.2, 0]), jaw: L.k([0, 0], [2.0, 0], [2.15, 0.35], [2.6, 0.35], [2.8, 0]), tmTreme: L.k([0, 0], [2.1, 0], [2.15, 1.5], [2.7, 0]) }) });

def({ num: 10, fase: 'inicio', chave: 'continencia', nome: 'Continência para o início da missão', dur: 3,
  receita: { rosto: 'orgulhoso', cabeca: 'olhaUsuario' },
  faixas: (L) => ({ ...pt(L, CHAO), tmMix: vem(L, 0.4, 2.4), legFR: L.k([0, 0], [0.5, 142], [2.4, 142], [2.9, 0]), elbowR: L.k([0, 0], [0.5, -128], [2.4, -128], [2.9, 0]),
    squashY: L.k([0, 1], [0.5, 1.04], [2.4, 1.04], [2.8, 1]), squashX: L.k([0, 1], [0.5, 1.03], [2.4, 1.03], [2.8, 1]) }) });

// ---------- DURANTE (11–25)
def({ num: 11, fase: 'durante', chave: 'desconfiado', nome: 'Observa o timer desconfiado', dur: 4.4,
  receita: { semPiscar: true },
  faixas: (L) => ({ ...pt(L, [186, 96]), tmMix: vem(L, 0.6, 3.7), pupilX: L.k([0, 0], [0.6, 1], [3.7, 1], [4.2, 0]), eyeOpen: L.k([0, 1], [0.8, 0.45], [3.6, 0.45], [4.1, 1]),
    browShow: L.on(0.5, 4.0), browAngry: L.k([0, 0], [0.8, 0.7], [3.6, 0.7], [4.1, 0]), headRot: L.k([0, 0], [0.8, 8], [2.2, 12], [3.6, 8], [4.1, 0]), rootX: L.k([0, 0], [1.6, 0], [2.2, 6], [3.2, 6], [3.8, 0]) }) });

def({ num: 12, fase: 'durante', chave: 'senta', nome: 'Senta em cima do relógio', dur: 5.4,
  receita: { rosto: 'entediado' },
  faixas: (L) => ({ ...pt(L, [90, 148]), tmMix: vem(L, 0.7, 4.6), tmK: L.k([0, 0], [0.7, 0.6], [4.6, 0.6], [5.2, 0]), tmSy: L.k([0, 0], [1.1, 0], [1.25, -0.22], [1.5, -0.14], [4.4, -0.14], [4.7, 0]),
    rootY: L.k([0, 0], [0.7, -6], [1.0, -40], [1.2, -26], [4.4, -26], [4.9, 0]), squatPose: L.on(1.15, 4.5), legFR: L.k([0, 0], [1.2, -10], [4.4, -10], [4.9, 0]), legFL: L.k([0, 0], [1.2, -10], [4.4, -10], [4.9, 0]) }) });

def({ num: 13, fase: 'durante', chave: 'apoia', nome: 'Se apoia no contador', dur: 5,
  receita: { rosto: 'entediado', cabeca: 'inclina' },
  faixas: (L) => ({ ...pt(L, [194, 126]), tmMix: vem(L, 0.6, 4.3), rootRot: L.k([0, 0], [0.9, 7], [4.2, 7], [4.8, 0]),
    legFR: L.k([0, 0], [0.9, 40], [4.2, 40], [4.7, 0]), elbowR: L.k([0, 0], [0.9, 35], [4.2, 35], [4.7, 0]),
    tmRot: L.k([0, 0], [0.9, 0], [1.1, 7], [4.2, 7], [4.6, 0]), tmSx: L.k([0, 0], [0.95, 0], [1.1, -0.06], [4.2, -0.06], [4.4, 0]), tmDx: L.k([0, 0], [0.95, 0], [1.1, 3], [4.2, 3], [4.4, 0]) }) });

def({ num: 14, fase: 'durante', chave: 'halter', nome: 'Usa o timer como halter', dur: 5, fx: ['suor'],
  receita: { rosto: 'fera' },
  faixas: (L) => ({ tmMix: L.k([0, 0], [0.5, 1], [4.4, 1], [5, 0]), tmMao: L.k([0, 1], [4.99, 1], [5, 0, 'step']), tmFrente: L.k([0, 1]), tmY: L.k([0, 4]), tmK: L.k([0, 0], [0.5, 0.15], [4.4, 0.15], [5, 0]),
    legFR: L.k([0, 0], [0.5, 12], [4.4, 12], [4.8, 0]), elbowR: L.alt(-8, -128, 0.6, 4.3, 6, { rest: 0 }), headRot: L.alt(-3, 3, 0.6, 4.3, 6) }) });

def({ num: 15, fase: 'durante', chave: 'acelera', nome: 'Tenta acelerar os ponteiros', dur: 4.2, fx: ['velocidade'],
  receita: { rosto: 'focado' },
  faixas: (L) => ({ ...pt(L, [176, 96]), tmFrente: L.k([0, 1]), tmMix: vem(L, 0.5, 3.6), tmRot: L.k([0, 0], [0.6, 0], [1.6, 180], [2.4, 540], [3.2, 1080], [3.6, 1080], [4.2, 1080]),
    legFR: L.k([0, 0], [0.5, 75], [3.4, 75], [3.9, 0]), elbowR: L.alt(-20, 20, 0.6, 3.3, 14, { rest: 0 }), tmTreme: L.k([0, 0], [2.4, 0], [2.5, 1.5], [3.3, 1.5], [3.4, 0]) }) });

def({ num: 16, fase: 'durante', chave: 'lupa', nome: 'Examina o relógio com uma lupa', dur: 4.6,
  receita: { semPiscar: true, cabeca: 'inclina' },
  faixas: (L) => ({ ...pt(L, [210, 104]), tmMix: vem(L, 0.6, 3.9), legFR: L.k([0, 0], [0.6, 70], [3.9, 70], [4.4, 0]), elbowR: L.k([0, 0], [0.6, 20], [3.9, 20], [4.4, 0]),
    tm_lupa: L.on(0.6, 3.9), eyeScale: L.k([0, 1], [0.8, 1.35], [3.7, 1.35], [4.1, 1]), pupilX: L.k([0, 0], [0.8, 1], [3.7, 1], [4.1, 0]), rootX: L.alt(0, 4, 1.2, 3.4, 4) }),
  pecas: [grupo('tm_lupa', [
    { id: 'tmLupaCabo', ...MAO_D, fill: '#6d4c41', path: rect(147, 148, 6, 22) },
    { id: 'tmLupaAro', ...MAO_D, fill: '#455a64', path: `${elip(150, 182, 13, 13)} M139,182 a11,11 0 1,1 22,0 a11,11 0 1,1 -22,0 Z` },
    { id: 'tmLupaVidro', ...MAO_D, fill: '#b3e5fc', alpha: 0.55, path: elip(150, 182, 11, 11) },
  ], { outline: true })] });

def({ num: 17, fase: 'durante', chave: 'pano', nome: 'Limpa o contador com um pano', dur: 4.6, fx: ['brilho'],
  receita: { rosto: 'focado' },
  faixas: (L) => ({ ...pt(L, [198, 104]), tmMix: vem(L, 0.5, 3.9), legFR: L.alt(48, 70, 0.6, 3.6, 10, { rest: 0 }), elbowR: L.k([0, 0], [0.5, 30], [3.7, 30], [4.2, 0]),
    tm_pano: L.on(0.5, 3.8), tmTreme: L.k([0, 0], [0.6, 0.8], [3.6, 0.8], [3.7, 0]) }),
  pecas: [grupo('tm_pano', [{ id: 'tmPano', ...MAO_D, fill: '#ffeb3b', path: 'M138,146 C136,158 142,170 150,172 C160,174 166,164 162,152 C158,146 146,142 138,146 Z' },
    { id: 'tmPanoListra', ...MAO_D, fill: '#f57f17', path: rect(140, 158, 22, 3) }], { outline: true })] });

def({ num: 18, fase: 'durante', chave: 'encara', nome: 'Fica parado encarando os segundos', dur: 5,
  receita: { semPiscar: true, corpo: 'parado' },
  faixas: (L) => ({ ...pt(L, [204, 58]), tmMix: vem(L, 0.6, 4.3), pupilX: L.k([0, 0], [0.6, 1], [4.3, 1], [4.8, 0]), pupilY: L.k([0, 0], [0.6, -0.3], [4.3, -0.3], [4.8, 0]),
    eyeScale: L.k([0, 1], [2.5, 1], [2.6, 1.2], [2.8, 1], [4.8, 1]), mouthClose: L.k([0, 0], [0.6, 0.8], [4.3, 0.8], [4.8, 0]) }) });

def({ num: 19, fase: 'durante', chave: 'circula', nome: 'Caminha ao redor do relógio', dur: 6,
  receita: { rosto: 'pensando' },
  faixas: (L) => ({ ...pt(L, [90, 146]), tmK: L.k([0, 0], [0.6, 0.35], [5.4, 0.35], [6, 0]), tmMix: vem(L, 0.6, 5.4), tmFrente: L.k([0, 0], [1.7, 0], [1.75, 1, 'step'], [4.1, 1], [4.15, 0, 'step']),
    rootX: L.k([0, 0], [0.6, 0], [1.7, 84], [2.9, 0], [4.1, -84], [5.2, 0]), scale: L.k([0, 1], [1.7, 1], [2.9, 0.86], [4.1, 1], [6, 1]),
    squashX: L.k([0, 1], [1.7, 1], [1.72, -1, 'step'], [4.1, -1], [4.12, 1, 'step']), rootY: L.alt(0, -3, 0.6, 5.2, 14) }) });

def({ num: 20, fase: 'durante', chave: 'levanta', nome: 'Segura o timer acima da cabeça', dur: 4.4,
  receita: { rosto: 'orgulhoso' },
  faixas: (L) => ({ ...pt(L, [90, -10]), tmMix: vem(L, 0.8, 3.6), tmK: L.k([0, 0], [0.8, 0.75], [3.6, 0.75], [4.2, 0]), tmRot: L.alt(-5, 5, 1.0, 3.5, 5),
    legFR: L.k([0, 0], [0.8, 158], [3.6, 158], [4.1, 0]), legFL: L.k([0, 0], [0.8, 158], [3.6, 158], [4.1, 0]), squashY: L.k([0, 1], [0.9, 0.95], [1.3, 1], [4.4, 1]) }) });

def({ num: 21, fase: 'durante', chave: 'empurraNumeros', nome: 'Tenta empurrar os números', dur: 4.4, fx: ['suor'],
  receita: { rosto: 'fera' },
  faixas: (L) => ({ ...pt(L, [190, 112]), tmMix: vem(L, 0.5, 3.7), legFR: L.k([0, 0], [0.5, 66], [3.7, 66], [4.2, 0]), elbowR: L.k([0, 0], [0.5, -6], [3.7, -6], [4.2, 0]),
    rootRot: L.k([0, 0], [0.6, 11], [3.6, 11], [4.1, 0]), squashY: L.k([0, 1], [0.6, 0.94], [3.6, 0.94], [4.1, 1]),
    tmSx: L.alt(-0.12, -0.04, 0.8, 3.5, 8, { rest: 0 }), tmDx: L.alt(0, 4, 0.8, 3.5, 8), moodAngry: L.k([0, 0], [1, 0.5], [3.5, 0.5], [4, 0]) }) });

def({ num: 22, fase: 'durante', chave: 'viraAmpulheta', nome: 'Transforma o relógio numa ampulheta', dur: 4.6, fx: ['brilho'],
  receita: { rosto: 'sorriso' },
  faixas: (L) => ({ ...pt(L, [172, 100]), tmMix: vem(L, 0.5, 4.0), tmAmp: L.k([0, 0], [1.4, 0], [1.45, 1, 'step'], [3.4, 1], [3.45, 0, 'step']),
    tmRot: L.k([0, 0], [1.0, 0], [1.6, 180], [3.2, 180], [3.8, 360], [4.6, 360]), legFR: L.k([0, 0], [0.5, 80], [4.0, 80], [4.5, 0]), elbowR: L.alt(-10, 10, 1.0, 3.8, 4) }) });

def({ num: 23, fase: 'durante', chave: 'cochila', nome: 'Cochila do lado do timer', dur: 6.5, sono: true, fx: ['zzz'],
  receita: { rosto: 'dormindo', semPiscar: true },
  faixas: (L) => ({ ...pt(L, [192, 134]), tmMix: vem(L, 0.6, 5.8), rootRot: L.k([0, 0], [1.2, 6], [5.6, 6], [6.2, 0]), headRot: L.k([0, 0], [1.2, 10], [5.6, 10], [6.2, 0]),
    eyeOpen: L.k([0, 1], [1.2, 0], [5.6, 0], [6.1, 1]), squashY: L.alt(1, 0.98, 1.4, 5.6, 6, { rest: 1 }), legFR: L.k([0, 0], [1.2, 30], [5.6, 30], [6.1, 0]) }) });

def({ num: 24, fase: 'durante', chave: 'flexoes', nome: 'Faz flexões enquanto o tempo passa', dur: 5,
  receita: { corpo: 'flexoes', rosto: 'fera' },
  faixas: (L) => ({ ...pt(L, [-16, 126]), tmFrente: L.k([0, 1]), tmMix: vem(L, 0.5, 4.4) }) });

def({ num: 25, fase: 'durante', chave: 'cientista', nome: 'Inspeciona o contador como cientista', dur: 5,
  receita: { semPiscar: true, cabeca: 'inclina' },
  faixas: (L) => ({ ...pt(L, [210, 102]), tmMix: vem(L, 0.6, 4.3), prop_oculosNerd: L.on(0.4, 4.6), legFR: L.k([0, 0], [0.6, 70], [4.3, 70], [4.8, 0]), elbowR: L.k([0, 0], [0.6, 20], [4.3, 20], [4.8, 0]), tm_lupa: L.on(0.6, 4.3),
    tm_erm: L.on(1.6, 3.6), pupilX: L.k([0, 0], [0.8, 1], [4.2, 1], [4.6, 0]) }),
  pecas: [grupo('tm_erm', [...txt('tmErm', 40, 14, 'Erm… fascinante', { size: 11 })])] });

// ---------- QUANDO RESTA POUCO (26–35)
def({ num: 26, fase: 'final', chave: 'percebe', nome: 'Percebe que o tempo está acabando', dur: 2.8,
  receita: { rosto: 'chocado' },
  faixas: (L) => ({ ...pt(L, [192, 88]), tmMix: vem(L, 0.3, 2.2), eyeScale: L.k([0, 1], [0.6, 1], [0.7, 1.6], [2.2, 1.6], [2.6, 1]), jaw: L.k([0, 0], [0.7, 0.8], [2.2, 0.8], [2.6, 0]),
    rootY: L.k([0, 0], [0.6, 0], [0.75, -10], [0.95, 0]), tmTreme: L.k([0, 0], [0.7, 2.5], [2.2, 2.5], [2.3, 0]) }) });

def({ num: 27, fase: 'final', chave: 'correLugar', nome: 'Corre no mesmo lugar', dur: 3.6, fx: ['suor'],
  receita: { rosto: 'focado' },
  faixas: (L) => ({ ...pt(L, [196, 118]), tmMix: vem(L, 0.3, 3.1), rootY: L.alt(0, -6, 0.3, 3.3, 16), legFR: L.alt(-40, 40, 0.3, 3.3, 16), legFL: L.alt(40, -40, 0.3, 3.3, 16),
    legBL: L.alt(-15, 15, 0.3, 3.3, 16), legBR: L.alt(15, -15, 0.3, 3.3, 16) }) });

def({ num: 28, fase: 'final', chave: 'apontaRepetido', nome: 'Aponta repetidamente para a contagem', dur: 3,
  receita: { rosto: 'bravo' },
  faixas: (L) => ({ ...pt(L, [204, 70]), tmMix: vem(L, 0.3, 2.5), legFR: L.k([0, 0], [0.4, 100], [2.5, 100], [2.9, 0]), elbowR: L.alt(0, 26, 0.5, 2.4, 10, { rest: 0 }), tmTreme: L.alt(0, 1.5, 0.5, 2.4, 10) }) });

def({ num: 29, fase: 'final', chave: 'duasMaos', nome: 'Segura o relógio com as duas mãos', dur: 3.6,
  receita: { rosto: 'preocupado' },
  faixas: (L) => ({ tmMix: vem(L, 0.5, 3.0), tmMao: L.k([0, 3], [3.59, 3], [3.6, 0, 'step']), tmY: L.k([0, -8]), tmFrente: L.k([0, 1]), tmK: L.k([0, 0], [0.5, 0.25], [3.0, 0.25], [3.6, 0]),
    legFR: L.k([0, 0], [0.5, 32], [3.0, 32], [3.4, 0]), elbowR: L.k([0, 0], [0.5, -90], [3.0, -90], [3.4, 0]), legFL: L.k([0, 0], [0.5, 32], [3.0, 32], [3.4, 0]), elbowL: L.k([0, 0], [0.5, -90], [3.0, -90], [3.4, 0]),
    tmTreme: L.k([0, 0], [0.6, 1.4], [2.9, 1.4], [3.0, 0]), pupilY: L.k([0, 0], [0.6, 0.6], [3, 0.6], [3.4, 0]) }) });

def({ num: 30, fase: 'final', chave: 'impaciente', nome: 'Demonstra impaciência', dur: 3.8,
  receita: { bracos: 'cruzados', rosto: 'irritado' },
  faixas: (L) => ({ ...pt(L, [194, 116]), tmMix: vem(L, 0.4, 3.2), rootY: L.alt(0, -2, 0.5, 3.3, 12), headRot: L.k([0, 0], [0.8, -8], [1.6, 8], [2.4, -8], [3.2, 0]), legBR: L.alt(0, 10, 0.5, 3.3, 12) }) });

def({ num: 31, fase: 'final', chave: 'bandeira', nome: 'Prepara a bandeira de chegada', dur: 3.8,
  receita: { rosto: 'sorrisao' },
  faixas: (L) => ({ ...pt(L, CHAO), tmMix: vem(L, 0.4, 3.2), tm_bandeira: L.on(0.3, 3.5), legFR: L.k([0, 0], [0.6, 150], [3.2, 150], [3.6, 0]), elbowR: L.alt(-15, 15, 0.8, 3.1, 8, { rest: 0 }) }),
  pecas: [grupo('tm_bandeira', [{ id: 'tmBandMastro', ...MAO_D, fill: '#5d4037', path: rect(148, 140, 4, 52) },
    { id: 'tmBandPano', ...MAO_D, fill: '#ffffff', path: rect(152, 168, 30, 22) }, { id: 'tmBandXadrez', ...MAO_D, fill: '#1b2647', path: xadrez(152, 168, 30, 22, 5) }], { outline: true })] });

def({ num: 32, fase: 'final', chave: 'dramatico', nome: 'Pose dramática', dur: 3.2, fx: ['holofote'],
  receita: { rosto: 'chocado' },
  faixas: (L) => ({ ...pt(L, [200, 92]), tmMix: vem(L, 0.4, 2.7), rootRot: L.k([0, 0], [0.5, -10], [2.7, -10], [3.1, 0]), legFL: L.k([0, 0], [0.5, 150], [2.7, 150], [3.1, 0]), elbowL: L.k([0, 0], [0.5, -120], [2.7, -120], [3.1, 0]),
    legFR: L.k([0, 0], [0.5, 80], [2.7, 80], [3.1, 0]), tmK: L.k([0, 0], [0.5, 0.2], [2.7, 0.2], [3.1, 0]) }) });

def({ num: 33, fase: 'final', chave: 'seguraSegundo', nome: 'Tenta segurar o último segundo', dur: 3.6, fx: ['suor'],
  receita: { rosto: 'fera' },
  faixas: (L) => ({ ...pt(L, [206, 108]), tmMix: vem(L, 0.4, 3.0), legFR: L.k([0, 0], [0.5, 70], [3.0, 70], [3.4, 0]), legFL: L.k([0, 0], [0.5, -78], [3.0, -78], [3.4, 0]), elbowL: L.k([0, 0], [0.5, -30], [3, -30], [3.4, 0]),
    rootRot: L.k([0, 0], [0.5, 12], [3.0, 12], [3.4, 0]), tmTreme: L.k([0, 0], [0.6, 2], [2.9, 2], [3.0, 0]), tmSx: L.k([0, 0], [0.6, -0.1], [2.9, -0.1], [3.1, 0]), moodAngry: L.k([0, 0], [1, 0.6], [2.9, 0.6], [3.3, 0]) }) });

def({ num: 34, fase: 'final', chave: 'contagemGestual', nome: 'Contagem regressiva com a mão', dur: 3.6,
  receita: { rosto: 'focado', cabeca: 'olhaUsuario' },
  faixas: (L) => ({ ...pt(L, CHAO), tmMix: vem(L, 0.3, 3.1), legFR: L.k([0, 0], [0.4, 130], [3.1, 130], [3.5, 0]), elbowR: L.k([0, 0], [0.4, -20], [3.1, -20], [3.5, 0]),
    tm_n3: L.on(0.6, 1.4), tm_n2: L.on(1.4, 2.2), tm_n1: L.on(2.2, 3.0), elbowL: L.k([0, 0]) }),
  pecas: [grupo('tm_n3', txt('tmN3', 182, 26, '3', { size: 16, w: 20, h: 22 })), grupo('tm_n2', txt('tmN2', 182, 26, '2', { size: 16, w: 20, h: 22 })), grupo('tm_n1', txt('tmN1', 182, 26, '1', { size: 16, w: 20, h: 22 }))] });

def({ num: 35, fase: 'final', chave: 'concentra', nome: 'Postura de concentração', dur: 3.6,
  receita: { rosto: 'focoOlhosFechados', bracos: 'focoReza' },
  faixas: (L) => ({ ...pt(L, [176, 92]), tmMix: vem(L, 0.4, 3.0), tmK: L.alt(0, 0.08, 0.6, 3.0, 4), rootY: L.k([0, 0], [0.6, -4], [3, -4], [3.5, 0]) }) });

// ---------- AO TERMINAR (36–45)
def({ num: 36, fase: 'fim', chave: 'destroi', nome: 'Destrói teatralmente a ampulheta', dur: 4, fx: ['poeira'],
  receita: { rosto: 'fera' },
  faixas: (L) => ({ tmMix: L.k([0, 0], [0.5, 1], [3.2, 1], [3.9, 0]), tmMao: L.k([0, 1], [1.6, 1], [1.65, 0, 'step']), tmX: L.k([0, 0], [1.6, 0], [1.65, 160, 'step']), tmY: L.k([0, -10], [1.6, -10], [1.65, 150, 'step']),
    tmAmp: L.k([0, 1], [3.0, 1], [3.05, 0, 'step']), tmSome: L.k([0, 0], [1.6, 0], [1.65, 1, 'step'], [3.0, 1], [3.6, 0]), tm_cacos: L.on(1.65, 3.3),
    legFR: L.k([0, 0], [0.5, 40], [1.1, 160], [1.45, 160], [1.6, 30], [2.6, 30], [3.2, 0]), elbowR: L.k([0, 0], [1.1, -10], [1.6, -10], [3.2, 0]), rootY: L.k([0, 0], [1.6, 0], [1.65, 4], [1.9, 0]) }),
  pecas: [grupo('tm_cacos', [{ id: 'tmCacos', fill: '#b3e5fc', path: 'M146,166 L152,156 L156,166 Z M160,166 L166,150 L170,166 Z M174,166 L180,158 L184,166 Z M150,166 L156,163 L159,166 Z' },
    { id: 'tmAreia', fill: '#f2c14e', path: elip(166, 166, 26, 3) }], { outline: true })] });

def({ num: 37, fase: 'fim', chave: 'placa', nome: 'Levanta a placa de missão concluída', dur: 3.8,
  receita: { rosto: 'orgulhoso' },
  faixas: (L) => ({ ...pt(L, CHAO), tmMix: vem(L, 0.3, 3.2), tm_placa: L.on(0.6, 3.3), legFR: L.k([0, 0], [0.6, 158], [3.2, 158], [3.6, 0]), legFL: L.k([0, 0], [0.6, 158], [3.2, 158], [3.6, 0]),
    rootY: L.alt(0, -3, 0.8, 3.0, 4) }),
  pecas: [grupo('tm_placa', [{ id: 'tmPlacaFundo', fill: '#fff8e1', path: rect(32, -6, 116, 40) }, ...txt('tmPlaca1', 90, 6, 'MISSÃO', { size: 11, fundo: null }), ...txt('tmPlaca2', 90, 22, 'CONCLUÍDA ✓', { size: 11, fundo: null, cor: '#2e7d32' })], { outline: true })] });

def({ num: 38, fase: 'fim', chave: 'poseFisiculturista', nome: 'Pose de fisiculturista', dur: 3.4, fx: ['brilho'],
  receita: { bracos: 'flexDuplo', rosto: 'orgulhoso' },
  faixas: (L) => ({ ...pt(L, CHAO), tmMix: vem(L, 0.3, 2.8), tmK: L.alt(0, 0.1, 0.6, 2.8, 4), squashX: L.k([0, 1], [0.6, 1.05], [2.8, 1.05], [3.2, 1]) }) });

def({ num: 39, fase: 'fim', chave: 'sino', nome: 'Toca um sino visual (sem som)', dur: 3.4,
  receita: { rosto: 'sorrisao' },
  faixas: (L) => ({ ...pt(L, CHAO), tmMix: vem(L, 0.3, 2.8), tm_sino: L.on(0.4, 2.9), legFR: L.k([0, 0], [0.5, 140], [2.8, 140], [3.2, 0]), elbowR: L.alt(-20, 20, 0.7, 2.6, 10, { rest: 0 }), tm_ding: L.on(0.9, 2.6) }),
  pecas: [grupo('tm_sino', [{ id: 'tmSinoCabo', ...MAO_D, fill: '#6d4c41', path: rect(148, 146, 4, 14) }, { id: 'tmSino', ...MAO_D, fill: '#fbc02d', path: 'M140,182 C140,168 144,160 150,160 C156,160 160,168 160,182 Z' }, { id: 'tmSinoBadalo', ...MAO_D, fill: '#5d4037', path: elip(150, 184, 3, 3) }], { outline: true }),
    grupo('tm_ding', txt('tmDing', 150, -2, 'DING ✦', { size: 9 }))] });

def({ num: 40, fase: 'fim', chave: 'reverencia', nome: 'Reverência sarcástica', dur: 3.6,
  receita: { rosto: 'canto' },
  faixas: (L) => ({ ...pt(L, CHAO), tmMix: vem(L, 0.3, 3.0), rootRot: L.k([0, 0], [0.8, 0], [1.4, 18], [2.4, 18], [3.0, 0]), headRot: L.k([0, 0], [1.4, 12], [2.4, 12], [3.0, 0]),
    legFR: L.k([0, 0], [0.6, 110], [1.4, -30], [2.4, -30], [3.0, 0]), elbowR: L.k([0, 0], [1.4, -60], [2.4, -60], [3.0, 0]), browShow: L.on(0.3, 3.2), brow: L.k([0, 0], [0.5, 1], [3, 1], [3.4, 0]) }) });

def({ num: 41, fase: 'fim', chave: 'medalha', nome: 'Entrega uma medalha virtual', dur: 3.6, fx: ['brilho'],
  receita: { rosto: 'sorriso', cabeca: 'olhaUsuario' },
  faixas: (L) => ({ ...pt(L, CHAO), tmMix: vem(L, 0.3, 3.0), tm_medalha: L.on(0.6, 3.1), legFR: L.k([0, 0], [0.6, 78], [3.0, 78], [3.4, 0]), elbowR: L.k([0, 0], [0.6, -24], [3.0, -24], [3.4, 0]) }),
  pecas: [grupo('tm_medalha', [{ id: 'tmFita', ...MAO_D, fill: '#1e88e5', path: 'M146,148 L150,170 L154,148 Z' }, { id: 'tmMedalha', ...MAO_D, fill: '#ffca28', path: elip(150, 178, 9, 9) }, { id: 'tmMedalhaEstrela', ...MAO_D, fill: '#ff8f00', path: estrela(150, 178, 5) }], { outline: true })] });

def({ num: 42, fase: 'fim', chave: 'carimbo', nome: 'Carimba o timer como concluído', dur: 3.8,
  receita: { rosto: 'focado' },
  faixas: (L) => ({ ...pt(L, [172, 130]), tmMix: vem(L, 0.4, 3.2), tm_carimbo: L.on(0.4, 2.7), legFR: L.k([0, 0], [0.6, 120], [1.3, 120], [1.5, 52], [2.0, 52], [2.4, 110], [3.0, 0]), elbowR: L.k([0, 0], [0.6, -20], [1.3, -20], [1.5, 30], [2.0, 30], [2.4, 0]),
    tmSy: L.k([0, 0], [1.48, 0], [1.52, -0.15], [1.7, 0]), tm_ok: L.on(1.5, 3.3) }),
  pecas: [grupo('tm_carimbo', [{ id: 'tmCarimboCabo', ...MAO_D, fill: '#8d6e63', path: rect(146, 144, 8, 14) }, { id: 'tmCarimboBase', ...MAO_D, fill: '#c62828', path: rect(140, 158, 20, 8) }], { outline: true }),
    grupo('tm_ok', txt('tmOk', 172, 130, 'OK ✓', { size: 9, cor: '#c62828', fundo: '#ffebee' }))] });

def({ num: 43, fase: 'fim', chave: 'confete', nome: 'Confete discreto', dur: 3.2, fx: ['confete'],
  receita: { bracos: 'maosAlto', rosto: 'feliz' },
  faixas: (L) => ({ ...pt(L, CHAO), tmMix: vem(L, 0.3, 2.6), rootY: L.alt(0, -5, 0.5, 2.6, 6) }) });

def({ num: 44, fase: 'fim', chave: 'trofeu', nome: 'Coloca um troféu sobre o contador', dur: 4,
  receita: { rosto: 'orgulhoso' },
  faixas: (L) => ({ ...pt(L, [172, 138]), tmMix: vem(L, 0.4, 3.4), tm_trofeu: L.on(0.4, 3.5), tmTrofeuX: L.k([0, -72], [0.5, -72], [1.6, 0]), tmTrofeuY: L.k([0, -30], [0.5, -30], [1.2, -46], [1.6, 0]),
    legFR: L.k([0, 0], [0.5, 120], [1.6, 64], [2.2, 64], [2.8, 0]), tmSy: L.k([0, 0], [1.58, 0], [1.62, -0.1], [1.8, 0]) }),
  pecas: [grupo('tm_trofeu', [{ id: 'tmTrofeuTaca', dx: 'tmTrofeuX', dy: 'tmTrofeuY', fill: '#ffca28', path: 'M160,92 L184,92 C184,104 178,110 172,110 C166,110 160,104 160,92 Z' },
    { id: 'tmTrofeuBase', dx: 'tmTrofeuX', dy: 'tmTrofeuY', fill: '#8d6e63', path: rect(166, 110, 12, 6) }, { id: 'tmTrofeuAlcas', dx: 'tmTrofeuX', dy: 'tmTrofeuY', fill: '#ffb300', path: `${elip(158, 97, 3, 4)} ${elip(186, 97, 3, 4)}` }], { outline: true })] });

def({ num: 45, fase: 'fim', chave: 'vitoriaExagerada', nome: 'Vitória exagerada (rara)', dur: 5.2, raro: true, fx: ['confete', 'estrelas'],
  receita: { rosto: 'sorrisao' },
  faixas: (L) => ({ ...pt(L, [90, -30]), tmMix: L.k([0, 0], [0.6, 1], [4.4, 1], [5.2, 0]), tmY: L.k([0, -10], [0.8, -60], [1.6, -20], [2.4, -70], [3.2, -20], [4.4, -20]), tmRot: L.k([0, 0], [0.8, 360], [1.6, 360], [2.4, 720], [3.2, 720]),
    squashX: L.giro(1.0, 2.6, 2, { acelera: 1.4 }), rootY: L.k([0, 0], [0.5, 0], [0.8, -24], [1.1, 0], [2.6, 0], [2.9, -24], [3.2, 0]),
    legFR: L.k([0, 0], [0.6, 158], [4.2, 158], [4.8, 0]), legFL: L.k([0, 0], [0.6, 158], [4.2, 158], [4.8, 0]), happyEyes: L.on(0.6, 4.6) }) });

// ---------- pausa, retomada e relógio arrastado (46–48)
def({ num: 46, fase: 'pausa', chave: 'congela', nome: 'Congela o relógio na pausa', dur: 3,
  receita: { bracos: 'cruzados', rosto: 'decepcionado' },
  faixas: (L) => ({ ...pt(L, [172, 104]), tmMix: vem(L, 0.3, 2.4), tm_gelo: L.on(0.6, 2.4), tmSx: L.k([0, 0], [0.6, 0.06], [2.4, 0.06], [2.6, 0]) }),
  pecas: [grupo('tm_gelo', [{ id: 'tmGelo', fill: '#b3e5fc', alpha: 0.6, path: rect(146, 78, 52, 52) }, { id: 'tmGeloBrilho', fill: '#ffffff', alpha: 0.8, path: 'M152,84 L162,84 L152,96 Z' }], { outline: true })] });

def({ num: 47, fase: 'retomada', chave: 'corda', nome: 'Dá corda no relógio na retomada', dur: 3,
  receita: { rosto: 'focado' },
  faixas: (L) => ({ ...pt(L, [184, 104]), tmFrente: L.k([0, 1]), tmMix: vem(L, 0.3, 2.4), tm_corda: L.on(0.4, 2.3), tmCordaRot: L.k([0, 0], [0.5, 0], [2.2, 540]), legFR: L.k([0, 0], [0.4, 72], [2.3, 72], [2.8, 0]), elbowR: L.alt(-20, 15, 0.5, 2.2, 6, { rest: 0 }),
    tmTreme: L.k([0, 0], [2.2, 0], [2.25, 1.5], [2.6, 0]) }),
  pecas: [grupo('tm_corda', [{ id: 'tmCorda', fill: '#c99a2e', path: 'M196,98 L204,98 L204,110 L196,110 Z M204,96 C214,90 214,118 204,112 Z', pivot: [200, 104], rot: 'tmCordaRot' }], { outline: true })] });

def({ num: 48, fase: 'mover', chave: 'arrastado', nome: 'Reage ao relógio arrastado', dur: 2.8,
  receita: { rosto: 'irritado', bracos: 'cintura' },
  faixas: (L) => ({ pupilX: L.k([0, 0], [0.3, 1], [2.3, 1], [2.7, 0]), headRot: L.k([0, 0], [0.4, 10], [2.2, 10], [2.7, 0]), tmTreme: L.k([0, 0], [0.2, 1.5], [0.8, 0]), browShow: L.on(0.2, 2.6), browAngry: L.k([0, 0], [0.4, 0.7], [2.3, 0.7], [2.7, 0]) }) });

// ------------------------------------------------------------------ catálogo
const pad = (n) => String(n).padStart(2, '0');
export const FASES_TIMER = Object.freeze(['inicio', 'durante', 'final', 'fim', 'pausa', 'retomada', 'mover']);
export const ANIMS_TIMER = Object.freeze(A.map((d) => Object.freeze({ ...d, id: `tm${pad(d.num)}`, raro: !!d.raro, sono: !!d.sono })));
export const ANIM_TIMER_POR_ID = new Map(ANIMS_TIMER.map((a) => [a.id, a]));
const CANAIS_TM = ['tmMix', 'tmMao', 'tmX', 'tmY', 'tmDx', 'tmDy', 'tmRot', 'tmK', 'tmSx', 'tmSy', 'tmTreme', 'tmAmp', 'tmFrente', 'tmSome'];

/** Itens do catálogo (`cat_tmNN`, 3 intensidades). Sem gatilho próprio: só o companion toca. */
export function itensTimers() {
  return ANIMS_TIMER.map((a) => {
    const L = linha(a.dur);
    const faixas = a.faixas ? a.faixas(L) : {};
    for (const k of Object.keys(faixas)) if (!Array.isArray(faixas[k])) delete faixas[k];
    // Todo canal do relógio existe em toda animação (0 = parado no lugar dele).
    for (const c of CANAIS_TM) faixas[c] ||= [[0, 0], [1, 0]];
    return { id: a.id, nome: `Timer: ${a.nome}`, categoria: 'timer', listas: {}, gatilho: { timer: [a.fase] }, duracao: Math.round(a.dur * 1000), loop: false, entrada: 200, frequencia: 'raro', estatico: 0.5,
      receita: { ...a.receita, fx: a.fx || [] }, faixas, fxLeve: (a.fx || []).filter((f) => ['brilho', 'suor', 'zzz', 'poeira'].includes(f)), timer: true };
  });
}

/** Rig com os adereços dos timers (cópia). Sem os canais tm_* ligados, nada aparece. */
export function rigComTimers(rig) {
  if (!rig || !Array.isArray(rig.groups) || rig.groups.some((g) => g.id === 'tm_lupa')) return rig;
  const frente = ANIMS_TIMER.flatMap((a) => a.pecas || []);
  const limpa = (gs) => structuredClone(gs).map((g) => ({ ...g, parts: g.parts.map((p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined))) }));
  return { ...rig, groups: [...rig.groups, ...limpa(frente)] };
}

/** Id da animação de timer (`cat_tm12`, `cat_tm12~suave`) ou null. */
export function timerDaAnim(nome) {
  const m = /^cat_(tm\d{2})(?:~\w+)?$/.exec(String(nome || ''));
  return m && ANIM_TIMER_POR_ID.has(m[1]) ? m[1] : null;
}

/** Espaço extra (coordenadas do rig) que o relógio pode ocupar nas animações de timer. */
export const ESPACO_ANIM_TIMER = Object.freeze({ l: 40, r: 70, t: 110, b: 10 });

/** Animações de uma fase (sem as raras e, se `semSono`, sem o cochilo). */
export function animsDaFase(fase, { semSono = false, comRaras = false } = {}) {
  return ANIMS_TIMER.filter((a) => a.fase === fase && (comRaras || !a.raro) && !(semSono && a.sono));
}

export { VAZIO as _VAZIO, CABECA as _CABECA };
