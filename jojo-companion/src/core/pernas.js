// Roupa presa nas pernas (pedido do João, 27/11/2026: "o pé do JoJo buga em animações").
//
// As pernas do rig giram no quadril (legL/legR, canais legBL/legBR, legLiftB e o balanço de
// tailRot), mas sapatos, botas, barras de calça e peças desenhadas na altura das canelas eram
// peças soltas do corpo: quando a perna mexia, o pé de verdade saía por baixo do sapato parado
// (e a calça ficava no ar). Aqui, depois de montado o rig inteiro, toda peça vestida que fica na
// zona das pernas passa a seguir a perna do seu lado:
//   - subcaminho inteiro na canela/pé de um lado → cópia presa na perna daquele lado;
//   - peça de quadril + pernas (calça, bermuda comprida, macacão) com o vão entre as pernas →
//     três cópias recortadas: o quadril parado e cada perna presa na sua.
// Nada muda no desenho parado: só o movimento passa a ser o da perna.

import { subcaminhos, caixaDoCaminho, dentro } from './geometria-path.js';

// Grupos que não são roupa (cenário, adereços no chão, efeitos, vista de costas, as próprias pernas).
const FORA = /^(props|catalogFloor|catalogFront|livingProps|needsProps|darkestProps|memeEfeitos|memePuf|nivelAura|nivelBrilho|moon|legs$|legDetail$|costumeBack$|darkestCloak$|squat|bench)/;
// Pivô e limites das pernas no rig (iguais a legL/legR em jojo.rig.json).
export const QUADRIL_Y = 146;
const MEIO = 90;
const PERNA = { L: { id: 'legL', l: 40, r: 99 }, R: { id: 'legR', l: 81, r: 140 } };
const CHAO = 182;

const r1 = (n) => Math.round(n * 10) / 10;
const ret = (x, y, w, h) => `M${r1(x)},${r1(y)} L${r1(x + w)},${r1(y)} L${r1(x + w)},${r1(y + h)} L${r1(x)},${r1(y + h)} Z`;
// Recortes: quadril até um pouco abaixo do pivô (cobre a junta), pernas a partir do pivô.
const CLIP_QUADRIL = ret(-400, -400, 980, 400 + QUADRIL_Y + 6);
const CLIP_PERNA = { L: ret(-400, QUADRIL_Y - 2, 400 + MEIO, 600), R: ret(MEIO, QUADRIL_Y - 2, 600, 600) };

/** Lado da perna de um subcaminho só de canela/pé ('L', 'R' ou null). */
export function ladoDaPerna(b) {
  if (!b || b.t < QUADRIL_Y - 4 || b.b > CHAO || b.b < 154) return null;
  if (b.r <= PERNA.L.r && b.l >= PERNA.L.l && b.cx < MEIO - 4) return 'L';
  if (b.l >= PERNA.R.l && b.r <= PERNA.R.r && b.cx > MEIO + 4) return 'R';
  return null;
}

/** Peça de quadril + pernas com o vão no meio (calça): começa acima do pivô e desce pelas duas pernas. */
export function ehCalca(path, b = caixaDoCaminho(path)) {
  if (!b || b.t > QUADRIL_Y - 4 || b.b < 154 || b.b > CHAO || b.l > 64 || b.r < 116) return false;
  const y = b.b - 3;
  return !dentro(path, MEIO, y) && dentro(path, 70, y) && dentro(path, 110, y);
}

const segueAPerna = (p) => !!(p.parent || p.rot || p.pivot);

/** Peças de rig que substituem uma peça solta na zona das pernas ([] = fica como está). */
export function pecasPresas(p, pernasHide = {}) {
  if (segueAPerna(p) || p.clipPath || typeof p.path !== 'string') return [];
  const base = { ...p };
  delete base.corpoX; delete base.ladoX;
  const presa = (lado, extra) => ({
    ...base, ...extra, parent: PERNA[lado].id,
    hideIf: [...new Set([...[].concat(p.hideIf || []), ...(pernasHide[lado] || [])])],
  });
  const subs = subcaminhos(p.path);
  const lados = subs.map((s) => ladoDaPerna(caixaDoCaminho(s)));
  if (lados.some(Boolean)) {
    const porLado = { L: [], R: [] };
    const resto = [];
    subs.forEach((s, i) => (lados[i] ? porLado[lados[i]] : resto).push(s));
    const out = [];
    if (resto.length) out.push({ ...p, path: resto.join(' ') });
    for (const lado of ['L', 'R']) if (porLado[lado].length) out.push(presa(lado, { id: `${p.id}__p${lado}`, path: porLado[lado].join(' ') }));
    return out;
  }
  if (subs.length === 1 && ehCalca(p.path)) {
    // Pernas primeiro (o quadril parado cobre a junta por cima).
    return [
      presa('L', { id: `${p.id}__pL`, clipPath: CLIP_PERNA.L }),
      presa('R', { id: `${p.id}__pR`, clipPath: CLIP_PERNA.R }),
      { ...p, clipPath: CLIP_QUADRIL },
    ];
  }
  return [];
}

/** Rig com as roupas da zona das pernas presas nas pernas. Não altera o rig recebido. */
export function prenderNasPernas(rig) {
  if (!rig?.groups || rig._pernasPresas) return rig;
  const pernas = {};
  for (const g of rig.groups) for (const p of g.parts) if (p.id === 'legL' || p.id === 'legR') pernas[p.id === 'legL' ? 'L' : 'R'] = [].concat(p.hideIf || []);
  if (!pernas.L || !pernas.R) return rig;
  const groups = rig.groups.map((g) => {
    if (FORA.test(g.id)) return g;
    let mudou = false;
    const parts = [];
    for (const p of g.parts) {
      const novas = pecasPresas(p, pernas);
      if (novas.length) { parts.push(...novas); mudou = true; } else parts.push(p);
    }
    return mudou ? { ...g, parts } : g;
  });
  return { ...rig, groups, _pernasPresas: true };
}
