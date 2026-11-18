// Rebolado do meme (pedido de 18/11/2026, refeito a partir do GIF do Among Us): modelo
// PRÓPRIO do JoJo de costas em 3/4, desenhado só para isto (nada da vista de costas do
// "vai tomar no cu"). Como no GIF, o corpo inteiro (costas + nádega, em forma de feijão)
// amassa até cobrir as pernas, alarga, a dorsal desce junto e ele estica de novo, num ciclo
// de 6 quadros de 40 ms. A cabeça espia por cima do ombro esquerdo, no lugar do visor.
// Esta função devolve uma CÓPIA do rig com o modelo (canal `rebolando`) e esconde todo o
// resto enquanto ele rebola; o arquivo do rig não muda.

/** Pivô do amassa-estica: o pé do corpo, entre as pernas. */
export const PIVO = [102, 146];
const CORPO = { scaleXBy: 'rbSx', scaleYBy: 'rbSy', squashPivot: PIVO, dy: 'rbDown' };

const P = (id, fill, path, extra = {}) => ({ id, fill, path, ...extra });

export const GRUPOS_REBOLADO = [
  // Atrás do corpo: dorsal e os braços dobrados aparecendo dos lados (seguem o corpo).
  { id: 'rbAtras', outline: true, showIf: 'rebolando', parts: [
    P('rbDorsal', 'body', 'M90,24 C96,4 110,-8 128,-14 C121,0 121,12 126,24 Z', CORPO),
    P('rbBracoE', 'body', 'M42,62 C28,66 22,90 32,104 C40,110 48,100 48,90 Z', CORPO),
    P('rbBracoD', 'body', 'M164,62 C178,66 182,90 172,104 C164,110 156,100 156,90 Z', CORPO),
  ] },
  // Pernas curtas e grossas, plantadas no chão (não amassam: o corpo desce por cima delas).
  { id: 'rbPernas', outline: true, showIf: 'rebolando', parts: [
    P('rbPernaE', 'body', 'M68,128 L66,156 C66,163 70,167 77,167 L90,167 C95,167 96,161 93,156 L92,128 Z'),
    P('rbPernaD', 'body', 'M114,128 L113,156 C112,163 117,167 124,167 L138,167 C143,167 143,160 140,155 L136,126 Z'),
  ] },
  // Bermuda arriada nas coxas.
  { id: 'rbBermuda', outline: true, showIf: 'rebolando', parts: [
    P('rbBermudaE', 'shorts', 'M64,140 L94,140 L93,151 L65,151 Z'),
    P('rbBermudaD', 'shorts', 'M112,140 L139,139 L141,150 L113,151 Z'),
  ] },
  { id: 'rbCorpo', outline: true, showIf: 'rebolando', parts: [
    // Costas + nádega numa peça só, como o feijão do meme visto de trás.
    P('rbFeijao', 'body', 'M40,78 C34,44 58,18 96,16 C136,14 166,38 166,80 C166,110 156,132 138,142 C128,147 114,146 106,140 C100,146 84,148 70,144 C50,138 44,110 40,78 Z', CORPO),
  ] },
  { id: 'rbDetalhe', showIf: 'rebolando', parts: [
    // Metade de baixo mais escura (o volume da nádega) e o rego puxado pra direita (3/4).
    P('rbSombra', 'bodyShade', 'M46,104 C60,118 86,122 106,116 C126,124 150,120 164,102 C162,122 152,138 138,142 C128,147 114,146 106,140 C100,146 84,148 70,144 C56,140 48,124 46,104 Z', CORPO),
    P('rbBrilho', 'sclera', 'M58,40 C74,28 104,24 126,30 C108,30 82,34 62,46 Z', { ...CORPO, alpha: 0.28 }),
    P('rbRego', 'outline', 'M104,140 C102,126 100,114 98,102 L101,102 C103,114 105,126 107,138 Z', CORPO),
    // Costas de fisiculturista: coluna, dorsais em V e escápulas.
    P('rbColuna', 'muscle', 'M96,22 L99,22 L101,88 L98,88 Z', CORPO),
    P('rbDorsais', 'muscle', 'M54,56 Q72,84 96,92 Q74,80 58,54 Z M152,56 Q132,86 104,92 Q128,80 148,54 Z', CORPO),
    P('rbEscapulas', 'muscle', 'M66,40 Q78,52 92,46 Q78,48 68,38 Z M136,40 Q124,52 108,46 Q122,48 134,38 Z', CORPO),
    P('rbGarras', 'cream', 'M66,162 L62,167 L68,167 Z M72,163 L69,167 L75,167 Z M140,161 L144,167 L138,167 Z M134,162 L137,167 L131,167 Z'),
  ] },
  // Cabeça espiando por cima do ombro esquerdo, rindo.
  { id: 'rbCabeca', outline: true, showIf: 'rebolando', parts: [
    P('rbCranio', 'body', 'M14,54 C12,36 26,26 42,28 C56,30 62,42 60,56 C58,70 46,78 32,76 C20,74 16,66 14,54 Z', { dy: 'rbHead' }),
  ] },
  { id: 'rbRosto', showIf: 'rebolando', parts: [
    P('rbOlho', 'sclera', 'M22,46 C22,40 27,36 32,36 C37,36 40,40 40,46 C40,51 36,54 31,54 C26,54 22,51 22,46 Z', { dy: 'rbHead' }),
    P('rbPupila', 'eye', 'M25,46 C25,43 27,41 29,41 C31,41 33,43 33,46 C33,48 31,50 29,50 C27,50 25,48 25,46 Z', { dy: 'rbHead' }),
    P('rbSobrancelha', 'outline', 'M20,34 L42,38 L41,41 L19,37 Z', { dy: 'rbHead' }),
    P('rbDentes', 'teeth', 'M16,62 L44,66 L40,72 L36,66 L32,72 L28,66 L24,71 L20,66 Z', { dy: 'rbHead' }),
    P('rbGuelras', 'muscle', 'M50,44 L52,44 L50,58 L48,58 Z M55,46 L57,46 L55,58 L53,58 Z', { dy: 'rbHead' }),
  ] },
];

/** Rig com o modelo do rebolado (cópia). Enquanto `rebolando` está ligado, todo o resto some. */
export function rigComRebolado(rig) {
  if (!rig || !Array.isArray(rig.groups) || rig.groups.some((g) => g.id === 'rbCorpo')) return rig;
  const groups = rig.groups.map((g) => ({ ...g, hideIf: [...new Set([...[].concat(g.hideIf || []), 'rebolando'])] }));
  return { ...rig, groups: [...groups, ...structuredClone(GRUPOS_REBOLADO)] };
}

/**
 * Ciclo do GIF (6 quadros de 40 ms): [amassa vertical, alarga, desce, cabeça].
 * Quadro 0 em pé; 1–3 amassando até cobrir as pernas; 4–5 esticando de volta.
 */
export const CICLO = [
  [1.0, 1.0, 0, 0],
  [0.9, 1.07, 4, 2],
  [0.8, 1.15, 8, 4],
  [0.72, 1.22, 11, 6],
  [0.76, 1.19, 10, 5],
  [0.92, 1.05, 3, 2],
];
