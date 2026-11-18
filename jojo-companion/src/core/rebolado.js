// Rebolado do meme (pedido de 18/11/2026): de costas, mãos nos joelhos, as duas nádegas
// subindo e descendo alternadas com amassa-estica, o corpo quicando e balançando.
// Reaproveita a vista de costas do rig (grupos `mooning`) sem alterar o arquivo do rig:
// esta função devolve uma CÓPIA com os canais do rebolado nas nádegas e as mãos nos
// joelhos (só aparecem com o canal `twerking`). Sem o canal, o desenho é o de sempre.

// Nádegas e linhas do glúteo: cada lado com o seu canal (sobe/desce), amassa-estica
// vertical em torno do topo e cresce um pouco durante o rebolado.
const LADOS = {
  moonCheekL: { dy: 'twerkL', scaleYBy: 'twerkSqL', scaleYPivot: [70, 86], scaleBy: 'twerkBig', scalePivot: [70, 108] },
  moonGluteLine: { dy: 'twerkL', scaleYBy: 'twerkSqL', scaleYPivot: [70, 86], scaleBy: 'twerkBig', scalePivot: [70, 108] },
  moonCheekR: { dy: 'twerkR', scaleYBy: 'twerkSqR', scaleYPivot: [110, 86], scaleBy: 'twerkBig', scalePivot: [110, 108] },
  moonGluteLineR: { dy: 'twerkR', scaleYBy: 'twerkSqR', scaleYPivot: [110, 86], scaleBy: 'twerkBig', scalePivot: [110, 108] },
};
// Mãos que seguram as nádegas (meme "vai tomar no cu") saem; no rebolado elas vão aos joelhos.
const MAOS_NAS_NADEGAS = new Set(['moonForeL', 'moonForeR', 'moonHandL', 'moonHandR', 'moonClawL', 'moonClawR']);

const brilho = (cx, lado) => ({ fill: 'sclera', alpha: 0.35, ...LADOS[lado], path: `M${cx - 7},98 a7,4 0 1,0 14,0 a7,4 0 1,0 -14,0 Z` });

export const MAOS_JOELHOS = {
  id: 'twerkHands',
  outline: true,
  showIf: 'twerking',
  parts: [
    { id: 'twerkForeL', fill: 'body', path: 'M22,92 C18,104 30,128 48,144 C54,148 62,144 60,138 C46,124 36,106 34,94 C32,88 24,86 22,92 Z' },
    { id: 'twerkForeR', fill: 'body', path: 'M158,92 C162,104 150,128 132,144 C126,148 118,144 120,138 C134,124 144,106 146,94 C148,88 156,86 158,92 Z' },
    { id: 'twerkHandL', fill: 'body', path: 'M46,140 C44,132 52,128 60,130 C68,132 70,140 68,148 C66,154 56,156 50,152 C47,149 46,145 46,140 Z' },
    { id: 'twerkHandR', fill: 'body', path: 'M134,140 C136,132 128,128 120,130 C112,132 110,140 112,148 C114,154 124,156 130,152 C133,149 134,145 134,140 Z' },
  ],
};

export const DETALHE_REBOLADO = {
  id: 'twerkHandsDetail',
  showIf: 'twerking',
  parts: [
    // Rego entre as nádegas (o prolapso fica escondido: gagSize 0).
    { id: 'twerkCrack', fill: 'outline', path: 'M89,90 C87,102 87,116 88,129 L92,129 C93,116 93,102 91,90 Z' },
    { id: 'twerkShineL', ...brilho(64, 'moonCheekL') },
    { id: 'twerkShineR', ...brilho(104, 'moonCheekR') },
    { id: 'twerkClawL', fill: 'cream', path: 'M64,148 L67,155 L61,152 Z M58,152 L60,159 L54,155 Z' },
    { id: 'twerkClawR', fill: 'cream', path: 'M116,148 L113,155 L119,152 Z M122,152 L120,159 L126,155 Z' },
    { id: 'twerkForeLine', fill: 'muscle', path: 'M30,100 Q36,116 46,128 Q38,114 32,102 Z M150,100 Q144,116 134,128 Q142,114 148,102 Z' },
  ],
};

/** Rig com o rebolado (cópia; o rig recebido não muda). Sem vista de costas, devolve o mesmo rig. */
export function rigComRebolado(rig) {
  if (!rig || !Array.isArray(rig.groups)) return rig;
  const iMaos = rig.groups.findIndex((g) => g.id === 'moonHandsGroup');
  if (iMaos < 0 || rig.groups.some((g) => g.id === MAOS_JOELHOS.id)) return rig;
  const groups = rig.groups.map((g) => ({
    ...g,
    parts: g.parts.map((p) => {
      if (LADOS[p.id]) return { ...p, ...LADOS[p.id] };
      if (MAOS_NAS_NADEGAS.has(p.id)) return { ...p, hideIf: [...[].concat(p.hideIf || []), 'twerking'] };
      return p;
    }),
  }));
  groups.splice(iMaos + 1, 0, structuredClone(MAOS_JOELHOS), structuredClone(DETALHE_REBOLADO));
  return { ...rig, groups };
}
