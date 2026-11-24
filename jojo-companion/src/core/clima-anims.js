// Animações do clima de verdade (0.47.6): o JoJo reage à chuva, frio, calor, tempestade,
// neve e noite que a localização real informa. Itens `cat_cl01`–`cat_cl12` no catálogo,
// com adereços `cl_*` numa CÓPIA do rig (o arquivo do personagem não muda). Tudo que
// liga desliga antes do fim: a aparência canônica volta sempre (testado).
import { linha, elip, rect, estrela, txt, grupo, VAZIO } from './virais.js';

const CABECA = { pivot: [90, 86], rot: 'headRot' };
const r1 = (n) => Math.round(n * 10) / 10;
/** Haste fina entre dois pontos (polígono). */
const haste = (x1, y1, x2, y2, w = 2.4) => {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * (w / 2), ny = (dx / l) * (w / 2);
  return `M${r1(x1 + nx)},${r1(y1 + ny)} L${r1(x2 + nx)},${r1(y2 + ny)} L${r1(x2 - nx)},${r1(y2 - ny)} L${r1(x1 - nx)},${r1(y1 - ny)} Z`;
};
/** Copa do guarda-chuva (cúpula com a borda ondulada), centro (cx, cy), largura w. */
const copa = (cx, cy, w, h, invertida = false) => {
  const x0 = cx - w / 2, x1 = cx + w / 2, s = invertida ? 1 : -1;
  const ond = Array.from({ length: 4 }, (_, i) => { const a = x1 - (w / 4) * i, b = a - w / 4; return `Q${r1((a + b) / 2)},${r1(cy - s * 7)} ${r1(b)},${r1(cy)}`; }).join(' ');
  return `M${r1(x0)},${r1(cy)} C${r1(x0)},${r1(cy + s * h * 1.3)} ${r1(x1)},${r1(cy + s * h * 1.3)} ${r1(x1)},${r1(cy)} ${ond} Z`;
};
const gomos = (cx, cy, w, h) => [-0.25, 0.25].map((f) => haste(cx, cy - h, cx + f * w, cy, 1.4)).join(' ');
/** Gota em pé (ponta para cima). */
const gota = (x, y, r = 2.4) => `M${r1(x)},${r1(y - r * 2)} C${r1(x + r)},${r1(y - r * 0.6)} ${r1(x + r)},${r1(y + r)} ${r1(x)},${r1(y + r)} C${r1(x - r)},${r1(y + r)} ${r1(x - r)},${r1(y - r * 0.6)} ${r1(x)},${r1(y - r * 2)} Z`;
const raio = (x, y, k = 1) => `M${r1(x)},${r1(y)} L${r1(x - 10 * k)},${r1(y + 22 * k)} L${r1(x - 2 * k)},${r1(y + 22 * k)} L${r1(x - 8 * k)},${r1(y + 44 * k)} L${r1(x + 10 * k)},${r1(y + 16 * k)} L${r1(x + 2 * k)},${r1(y + 16 * k)} L${r1(x + 8 * k)},${r1(y)} Z`;
const lua = (cx, cy, r) => `M${r1(cx)},${r1(cy - r)} A${r},${r} 0 1,0 ${r1(cx)},${r1(cy + r)} A${r1(r * 0.75)},${r1(r * 0.82)} 0 1,1 ${r1(cx)},${r1(cy - r)} Z`;

// Pose do braço direito segurando o guarda-chuva acima da cabeça: mão em ~(157, 36).
const MAO_ALTA = [157, 36];
const BRACO_ALTO = (L, a, b) => ({ legFR: L.k([0, 0], [a, 150], [b, 150], [b + 0.5, 0]), elbowR: L.k([0, 0], [a, -20], [b, -20], [b + 0.5, 0]) });
// Leque: mão direita ao lado do rosto, ~(184, 68).
const BRACO_LEQUE = (L, a, b) => ({ legFR: L.k([0, 0], [a, 120], [b, 120], [b + 0.4, 0]) });

/** Guarda-chuva preso à mão alta: haste até a copa inclinada sobre a cabeça. */
const guardaChuva = (id, { cor = '#1565c0', faixa = '#ffca28', abre = null, gira = null, invertido = false } = {}) => {
  const [hx, hy] = MAO_ALTA, cx = 118, cy = -22, w = 150, h = 40;
  const xf = { ...(abre ? { scaleBy: abre, scalePivot: [cx, cy] } : {}), ...(gira ? { pivot: [hx, hy], rot: gira } : {}) };
  return grupo(id, [
    { id: `${id}Haste`, fill: '#5d4037', path: `${haste(hx, hy + 8, cx, cy - h, 3)} M${hx - 1},${hy + 8} Q${hx - 1},${hy + 18} ${hx + 7},${hy + 16} L${hx + 7},${hy + 13} Q${hx + 2},${hy + 14} ${hx + 2},${hy + 8} Z`, ...(gira ? { pivot: [hx, hy], rot: gira } : {}) },
    { id: `${id}Copa`, fill: cor, path: copa(cx, cy, w, h, invertido), ...xf },
    { id: `${id}Gomo`, fill: faixa, alpha: 0.85, path: invertido ? VAZIO : gomos(cx, cy, w, h), ...xf },
  ], { outline: true });
};

const A = [];
const def = (o) => A.push(o);

// ---------- CHUVA (1–3)
def({ num: 1, cond: 'chuva', chave: 'abreGuardaChuva', nome: 'Abre o guarda-chuva', dur: 6, fx: ['chuva'],
  receita: { rosto: 'sobrancelha', cabeca: 'olhaCima' },
  faixas: (L) => ({ ...BRACO_ALTO(L, 0.7, 5.2), cl_guarda: L.on(0.8, 5.3), clAbre: L.k([0, 0.15], [1.2, 0.15], [1.6, 1.08], [1.8, 1], [4.9, 1], [5.3, 0.2]),
    eyeScale: L.k([0, 1], [1.6, 1.12], [2.2, 1]), happyEyes: L.on(2.2, 4.6) }),
  pecas: [guardaChuva('cl_guarda', { abre: 'clAbre' })] });

def({ num: 2, cond: 'chuva', chave: 'gingaNaChuva', nome: 'Ginga debaixo do guarda-chuva', dur: 6.5, fx: ['chuva', 'notas'],
  receita: { corpo: 'danca', rosto: 'sorriso' },
  faixas: (L) => ({ ...BRACO_ALTO(L, 0.5, 5.8), cl_guarda2: L.on(0.6, 5.9), clGira: L.alt(-10, 10, 1, 5.6, 8), rootX: L.alt(-8, 8, 1, 5.6, 8), headRot: L.alt(6, -6, 1, 5.6, 8) }),
  pecas: [guardaChuva('cl_guarda2', { cor: '#c62828', faixa: '#ffffff', gira: 'clGira' })] });

def({ num: 3, cond: 'chuva', chave: 'sentePingos', nome: 'Sente os pingos na mão e sacode', dur: 5, fx: ['chuva'],
  receita: { rosto: 'careta', cabeca: 'olhaLado' },
  faixas: (L) => ({ legFL: L.k([0, 0], [0.5, 60], [3.6, 60], [4.3, 0]), elbowL: L.k([0, 0], [0.5, -30], [2.4, -30], [2.5, -10], [2.6, -40], [2.7, -10], [2.8, -40], [2.9, -10], [3.0, -40], [3.6, -30], [4.3, 0]),
    cl_pingos: L.on(0.8, 2.4), clPingoY: L.k([0, -40], [0.8, -40], [1.4, 0], [1.45, -40, 'step'], [2.0, 0], [2.4, 0]),
    cl_respingo: L.on(2.4, 3.1), browShow: L.on(1.4, 3.8), browAngry: L.k([0, 0], [1.4, 0.5], [3.4, 0.5], [3.8, 0]) }),
  pecas: [grupo('cl_pingos', [{ id: 'clPingos', fill: '#4fc3f7', alpha: 0.9, path: `${gota(-8, 108, 3.6)} ${gota(0, 102, 3)}`, dy: 'clPingoY' }]),
    grupo('cl_respingo', [{ id: 'clRespingo', fill: '#81d4fa', alpha: 0.85, path: [elip(-18, 106, 2, 2), elip(-14, 96, 1.6, 1.6), elip(4, 98, 1.8, 1.8), elip(-22, 116, 1.4, 1.4)].join(' ') }])] });

// ---------- FRIO (4–5) — o 4 também serve para a neve
def({ num: 4, cond: 'frio', chave: 'tremeDeFrio', nome: 'Treme de frio abraçado no próprio corpo', dur: 5.5,
  receita: { corpo: 'treme', bracos: 'cruzados', rosto: 'nervoso' },
  faixas: (L) => ({ rootX: L.treme(0.3, 5, 1.2, 0.07), jaw: L.alt(0.1, 0.35, 0.4, 5, 30, { step: true }), cl_bafo: L.alt(0, 1, 0.6, 5, 6, { step: true }), clBafoK: L.alt(0.6, 1.2, 0.6, 5, 12, { rest: 0.6 }),
    moodSad: L.k([0, 0], [0.6, 0.25], [4.8, 0.25], [5.4, 0]) }),
  pecas: [grupo('cl_bafo', [{ id: 'clBafo', fill: '#ffffff', alpha: 0.7, path: `${elip(128, 72, 7, 5)} ${elip(138, 66, 5, 4)} ${elip(145, 60, 3.4, 2.8)}`, ...CABECA, scaleBy: 'clBafoK', scalePivot: [122, 74] }])] });

def({ num: 5, cond: 'frio', chave: 'cachecol', nome: 'Põe cachecol e gorro e sopra as mãos', dur: 6,
  receita: { bracos: 'maosBoca', rosto: 'piscaLento' },
  faixas: (L) => ({ cl_cachecol: L.on(0.4, 5.6), cl_gorro: L.on(0.4, 5.6), clGorroY: L.k([0, -30], [0.4, -30], [0.9, 0]), cl_bafo5: L.alt(0, 1, 1.2, 5, 8, { step: true }), rootY: L.k([0, 0], [0.5, 2], [5.4, 2], [5.8, 0]) }),
  pecas: [grupo('cl_gorro', [{ id: 'clGorro', fill: '#d84315', path: 'M44,30 C46,4 134,4 136,30 Z', ...CABECA, dy: 'clGorroY' }, { id: 'clGorroBarra', fill: '#ffffff', path: rect(42, 26, 96, 9), ...CABECA, dy: 'clGorroY' }, { id: 'clGorroPompom', fill: '#ffffff', path: elip(90, 2, 9, 8), ...CABECA, dy: 'clGorroY' }], { outline: true }),
    grupo('cl_cachecol', [{ id: 'clCachecol', fill: '#2e7d32', path: 'M50,84 C70,100 110,100 130,84 L134,96 C112,110 68,110 46,96 Z M112,98 L126,98 L124,132 L110,132 Z' }, { id: 'clCachecolListra', fill: '#a5d6a7', path: `${rect(111, 108, 14, 4)} ${rect(110, 118, 14, 4)}` }], { outline: true }),
    grupo('cl_bafo5', [{ id: 'clBafo5', fill: '#ffffff', alpha: 0.75, path: `${elip(92, 104, 8, 5)} ${elip(100, 96, 5, 4)}` }])] });

// ---------- CALOR (6–8)
def({ num: 6, cond: 'calor', chave: 'leque', nome: 'Se abana com um leque', dur: 5.5, fx: ['suor'],
  receita: { rosto: 'cansado', cabeca: 'inclina' },
  faixas: (L) => ({ ...BRACO_LEQUE(L, 0.4, 5), elbowR: L.alt(-30, -70, 0.6, 5, 14, { rest: 0 }), cl_leque: L.on(0.5, 5.1), clLequeRot: L.alt(-12, 18, 0.6, 5, 14), jaw: L.k([0, 0], [0.6, 0.3], [5, 0.3], [5.4, 0]) }),
  pecas: [grupo('cl_leque', [{ id: 'clLeque', fill: '#ec407a', path: 'M184,70 L160,30 C170,22 190,20 206,26 Z', pivot: [184, 70], rot: 'clLequeRot' }, { id: 'clLequeVaretas', fill: '#880e4f', path: `${haste(184, 70, 166, 30, 1.2)} ${haste(184, 70, 184, 24, 1.2)} ${haste(184, 70, 200, 27, 1.2)}`, pivot: [184, 70], rot: 'clLequeRot' }], { outline: true })] });

def({ num: 7, cond: 'calor', chave: 'derrete', nome: 'Derrete de calor com a língua de fora', dur: 5,
  receita: { rosto: 'lingua' }, fx: ['suor', 'vapor'],
  faixas: (L) => ({ squashY: L.k([0, 1], [0.8, 0.92], [3.8, 0.92], [4.6, 1]), squashX: L.k([0, 1], [0.8, 1.06], [3.8, 1.06], [4.6, 1]), legFR: L.alt(40, 100, 0.6, 4, 10, { rest: 0 }), elbowR: L.alt(-20, -60, 0.6, 4, 10, { rest: 0 }),
    cl_poca: L.k([0, 0], [1, 0], [1.05, 1, 'step'], [4.2, 1], [4.25, 0, 'step']), clPocaK: L.k([0, 0.3], [1, 0.3], [3.6, 1.1], [4.2, 1.1]), moodAngry: L.k([0, 0], [0.8, 0.2], [4, 0.2], [4.6, 0]) }),
  pecas: [grupo('cl_poca', [{ id: 'clPoca', fill: '#4fc3f7', alpha: 0.45, path: elip(90, 168, 56, 5), scaleBy: 'clPocaK', scalePivot: [90, 168] }])] });

def({ num: 8, cond: 'calor', chave: 'toalhaGelada', nome: 'Toalha gelada na cabeça', dur: 6, fx: ['suor'],
  receita: { rosto: 'aliviado', bracos: 'toalha' },
  faixas: (L) => ({ cl_toalha: L.on(0.6, 5.5), clToalhaY: L.k([0, -26], [0.6, -26], [1.0, 0]), cl_gelo: L.alt(0, 1, 1.2, 5.2, 4, { step: true }), eyeOpen: L.k([0, 1], [1.2, 0.5], [5, 0.5], [5.6, 1]) }),
  pecas: [grupo('cl_toalha', [{ id: 'clToalha', fill: '#e1f5fe', path: 'M42,20 C60,6 120,6 138,20 L140,36 C120,30 60,30 40,36 Z M124,30 L140,34 L136,60 L124,52 Z', ...CABECA, dy: 'clToalhaY' }, { id: 'clToalhaListra', fill: '#4fc3f7', path: `${rect(52, 18, 76, 3)}`, ...CABECA, dy: 'clToalhaY' }], { outline: true }),
    grupo('cl_gelo', [{ id: 'clGelo', fill: '#b3e5fc', alpha: 0.85, path: `${rect(70, -4, 8, 8)} ${rect(96, -8, 9, 9)}`, ...CABECA }])] });

// ---------- TEMPESTADE (9–10)
def({ num: 9, cond: 'tempestade', chave: 'sustoTrovao', nome: 'Leva um susto com o trovão', dur: 4.5,
  receita: { rosto: 'assustado' }, fx: ['chuva'],
  faixas: (L) => ({ cl_flash: L.k([0, 0], [0.5, 0], [0.52, 1, 'step'], [0.62, 0, 'step'], [0.72, 1, 'step'], [0.8, 0, 'step']), cl_raio: L.on(0.5, 1.4),
    rootY: L.k([0, 0], [0.8, 0], [1.0, -28], [1.3, 0], [1.4, 3], [1.6, 0]), eyeScale: L.k([0, 1], [0.8, 1], [0.9, 1.6], [3.4, 1.6], [4, 1]), jaw: L.k([0, 0], [0.85, 0], [0.95, 0.9], [2.8, 0.9], [3.4, 0]),
    legFR: L.k([0, 0], [0.85, 0], [1.0, 150], [2.6, 150], [3.4, 0]), legFL: L.k([0, 0], [0.85, 0], [1.0, 150], [2.6, 150], [3.4, 0]), cl_cabrum: L.on(1.0, 2.6), rootX: L.treme(1.4, 3.2, 1, 0.06) }),
  pecas: [grupo('cl_flash', [{ id: 'clFlash', fill: '#fffde7', alpha: 0.35, path: rect(-30, -60, 240, 230) }]),
    grupo('cl_raio', [{ id: 'clRaio', fill: '#ffeb3b', path: raio(176, -58, 1.1) }], { outline: true }),
    grupo('cl_cabrum', txt('clCabrum', 30, -22, 'CABRUM!', { size: 11, cor: '#f9a825', fundo: '#263238' }))] });

def({ num: 10, cond: 'tempestade', chave: 'guardaChuvaVira', nome: 'O vento vira o guarda-chuva do avesso', dur: 6,
  receita: { rosto: 'irritado' }, fx: ['chuva', 'vento'],
  faixas: (L) => ({ ...BRACO_ALTO(L, 0.5, 5.2), cl_guarda10: L.k([0, 0], [0.6, 1, 'step'], [2.4, 0, 'step']), cl_avesso: L.k([0, 0], [2.4, 1, 'step'], [5.3, 0, 'step']), clGira10: L.k([0, 0], [1.6, 0], [2.2, 22], [2.4, 30], [5.2, 26]),
    rootX: L.k([0, 0], [2.2, 0], [3.2, -24], [4.6, -30], [5.6, 0]), rootRot: L.k([0, 0], [2.2, 0], [3, -8], [4.6, -8], [5.6, 0]), browShow: L.on(2.4, 5.6), browAngry: L.k([0, 0], [2.5, 0.8], [5.2, 0.8], [5.6, 0]) }),
  pecas: [guardaChuva('cl_guarda10', { cor: '#37474f', faixa: '#90a4ae', gira: 'clGira10' }), guardaChuva('cl_avesso', { cor: '#37474f', faixa: '#90a4ae', gira: 'clGira10', invertido: true })] });

// ---------- NEVE (11)
def({ num: 11, cond: 'neve', chave: 'flocoNoFocinho', nome: 'Floco de neve cai no focinho e ele espirra', dur: 5.5, fx: ['neve'],
  receita: { cabeca: 'olhaCima' },
  faixas: (L) => ({ cl_floco: L.on(0.3, 3.2), clFlocoY: L.k([0, -70], [0.3, -70], [2.2, 0]), clFlocoX: L.k([0, 20], [0.3, 20], [1.2, -6], [2.2, 0]), pupilX: L.k([0, 0], [2.0, 0], [2.3, -0.6], [3.2, -0.6], [3.5, 0]),
    pupilY: L.k([0, 0], [0.3, -1], [2.0, 0.4], [3.4, 0.4], [3.6, 0]), headRot: L.k([0, 0], [3.2, 0], [3.4, -14], [3.6, 10], [4.2, 0]), jaw: L.k([0, 0], [3.2, 0], [3.35, 1], [3.7, 0]), cl_atchim: L.on(3.4, 4.6), eyeOpen: L.k([0, 1], [3.2, 1], [3.3, 0.1], [3.7, 0.1], [3.9, 1]) }),
  pecas: [grupo('cl_floco', [{ id: 'clFloco', fill: '#e3f2fd', path: estrela(90, 50, 8), ...CABECA, dx: 'clFlocoX', dy: 'clFlocoY' }], { outline: true }),
    grupo('cl_atchim', txt('clAtchim', 150, 10, 'ATCHIM!', { size: 9, cor: '#1565c0' }))] });

// ---------- NOITE (12): olha a lua (não dorme; a vigília das 6h às 21h continua valendo)
def({ num: 12, cond: 'noite', chave: 'olhaALua', nome: 'Olha a lua e desacelera', dur: 6,
  receita: { cabeca: 'olhaCima', rosto: 'zen' },
  faixas: (L) => ({ cl_lua: L.k([0, 0], [0.4, 1, 'step'], [5.6, 0, 'step']), clLuaK: L.k([0, 0.2], [0.4, 0.2], [1.2, 1], [5, 1], [5.6, 0.2]), cl_estrelas: L.alt(0, 1, 1.2, 5.2, 6, { step: true }),
    rootY: L.alt(0, 2, 0.6, 5.4, 4), legFR: L.k([0, 0], [1.4, 0], [2.2, 100], [3.4, 100], [4.0, 0]), elbowR: L.k([0, 0], [1.4, 0], [2.2, -40], [3.4, -40], [4, 0]) }),
  pecas: [grupo('cl_lua', [{ id: 'clLua', fill: '#fff59d', path: lua(28, -34, 14), scaleBy: 'clLuaK', scalePivot: [28, -34] }], { outline: true }),
    grupo('cl_estrelas', [{ id: 'clEstrelas', fill: '#fff9c4', path: [estrela(60, -48, 5), estrela(150, -40, 4.4), estrela(176, -60, 4), estrela(4, -58, 3.6)].join(' ') }])] });

// ------------------------------------------------------------------ catálogo
const pad = (n) => String(n).padStart(2, '0');
export const CONDICOES_ANIM = Object.freeze(['chuva', 'frio', 'calor', 'tempestade', 'neve', 'noite']);
export const ANIMS_CLIMA = Object.freeze(A.map((d) => Object.freeze({ ...d, id: `cl${pad(d.num)}` })));
export const ANIM_CLIMA_POR_ID = new Map(ANIMS_CLIMA.map((a) => [a.id, a]));
// Efeitos pesados que somem na versão suave (movimento reduzido).
const FX_PESADO = new Set(['vento', 'vapor', 'notas']);

/** Itens do catálogo (`cat_clNN`, 3 intensidades). Sem gatilho próprio: só o companion toca. */
export function itensClima() {
  return ANIMS_CLIMA.map((a) => {
    const L = linha(a.dur);
    const faixas = a.faixas ? a.faixas(L) : {};
    for (const k of Object.keys(faixas)) if (!Array.isArray(faixas[k])) delete faixas[k];
    return { id: a.id, nome: `Clima: ${a.nome}`, categoria: 'clima', listas: {}, gatilho: { clima: [a.cond] }, duracao: Math.round(a.dur * 1000), loop: false, entrada: 220, frequencia: 'raro', estatico: 0.5,
      receita: { ...a.receita, fx: a.fx || [] }, faixas, fxLeve: (a.fx || []).filter((f) => !FX_PESADO.has(f)), clima: true };
  });
}

/** Rig com os adereços do clima (cópia). Sem os canais cl_* ligados, nada aparece. */
export function rigComClima(rig) {
  if (!rig || !Array.isArray(rig.groups) || rig.groups.some((g) => g.id === 'cl_guarda')) return rig;
  const frente = ANIMS_CLIMA.flatMap((a) => a.pecas || []);
  const limpa = (gs) => structuredClone(gs).map((g) => ({ ...g, parts: g.parts.map((p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined))) }));
  return { ...rig, groups: [...rig.groups, ...limpa(frente)] };
}

/** Id da animação de clima (`cat_cl03`, `cat_cl03~suave`) ou null. */
export function climaDaAnim(nome) {
  const m = /^cat_(cl\d{2})(?:~\w+)?$/.exec(String(nome || ''));
  return m && ANIM_CLIMA_POR_ID.has(m[1]) ? m[1] : null;
}
