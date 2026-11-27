// Medida de repetição entre animações (auditoria de 27/11/2026): o movimento do corpo de cada
// animação vira um vetor (32 instantes × canais de corpo, normalizados) e duas animações cuja
// distância média fica abaixo do limite são "quase a mesma animação" para quem olha.
// Usado por scripts/originalidade.mjs (gera assets/catalog/originalidade.json) e pelos testes.

import { Animator } from '../renderer/shared/animator.js';

export const CANAIS_CORPO = Object.freeze({
  rootX: 20, rootY: 20, rootRot: 15, scale: 0.2, squashX: 0.3, squashY: 0.2, headRot: 15, headX: 6, headY: 6,
  legFL: 90, legFR: 90, legBL: 40, legBR: 40, elbowL: 90, elbowR: 90, legLiftF: 10, legLiftB: 10,
  jaw: 0.6, eyeOpen: 0.8, brow: 1, browAngry: 1, happyEyes: 1, blush: 1, tailRot: 30,
});
// Duas animações só contam como diferentes se algum canal do corpo muda de verdade durante pelo
// menos um quarto da animação: a média do quarto de tempo mais diferente daquele canal fica
// acima do limite (unidades normalizadas: 0,25 ≈ 22° de braço, 5 px de pulo, 4° de cabeça).
export const LIMITE_REPETICAO = 0.25;
const QUARTO = 8;
const NC = Object.keys(CANAIS_CORPO).length;
const N = 32;

/** Vetor do movimento do corpo de uma animação. */
export function vetorMovimento(anims, nome) {
  const a = new Animator(anims, { rng: () => 0.5 });
  a.play(nome, 0, { restart: true, variant: nome });
  const dur = Math.max(100, anims.animations[nome].duration || 1000);
  const v = new Float64Array(N * Object.keys(CANAIS_CORPO).length);
  let k = 0;
  for (let i = 0; i < N; i++) {
    const { pose } = a.sample(200 + ((dur - 200) * i) / (N - 1));
    for (const [c, s] of Object.entries(CANAIS_CORPO)) v[k++] = (pose[c] ?? 0) / s;
  }
  return v;
}

/** Maior diferença entre as animações: o canal do corpo mais diferente no seu quarto de tempo mais diferente. */
export function distancia(a, b, teto = Infinity) {
  let max = 0;
  const d = new Float64Array(a.length / NC);
  for (let c = 0; c < NC; c++) {
    for (let i = c, k = 0; i < a.length; i += NC, k++) d[k] = Math.abs(a[i] - b[i]);
    d.sort();
    let s = 0;
    for (let k = d.length - QUARTO; k < d.length; k++) s += d[k];
    const m = s / QUARTO;
    if (m > max) { max = m; if (max >= teto) return max; }
  }
  return max;
}

/** Grupos de animações quase iguais (ligação simples abaixo do limite), maiores primeiro. */
export function gruposRepetidos(anims, nomes, limite = LIMITE_REPETICAO) {
  const vet = nomes.map((n) => vetorMovimento(anims, n));
  const pai = nomes.map((_, i) => i);
  const raiz = (x) => (pai[x] === x ? x : (pai[x] = raiz(pai[x])));
  for (let i = 0; i < nomes.length; i++) {
    for (let j = i + 1; j < nomes.length; j++) {
      if (raiz(i) === raiz(j)) continue;
      if (distancia(vet[i], vet[j], limite) < limite) pai[raiz(i)] = raiz(j);
    }
  }
  const g = new Map();
  nomes.forEach((n, i) => { const r = raiz(i); if (!g.has(r)) g.set(r, []); g.get(r).push(n); });
  return [...g.values()].filter((x) => x.length > 1).sort((a, b) => b.length - a.length);
}

/** Pode ganhar coreografia nova (catálogo). As feitas à mão e as de fantasia ficam como estão. */
export const recomponivel = (nome) => /^cat_/.test(nome) && !nome.includes('~');
