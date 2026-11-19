// Gera animações (quadros-chave sobre os canais do rig) a partir de receitas
// em camadas: corpo + braços + cabeça + rosto + cauda + dorsal + objeto +
// efeito + humor. Puro: usado pelo processo principal (expande o catálogo antes
// de mandar ao renderer), pelo script de espaço por animação e pelos testes.
//
// Cada primitivo recebe {i, n} (intensidade e repetições) e devolve canais
// com quadros-chave [t (0..1), valor, easing?]. Os primitivos sem laço
// terminam na pose de repouso — a saída é sempre suave.

const ARM = { leg: 6, elbow: 12 }; // braços em repouso (como no idle)

const hold = (v) => [[0, v], [1, v]];
// Entra, segura e volta ao repouso.
const ehs = (v, rest = 0, a = 0.14, b = 0.86) => [[0, rest], [a, v], [b, v], [1, rest]];
// Alterna entre `a` e `b` `n` vezes no miolo e volta ao repouso nas pontas.
function alt(a, b, n, { rest = null, from = 0.12, to = 0.88, ease } = {}) {
  const keys = [[0, rest ?? a]];
  for (let k = 0; k <= n; k++) {
    const key = [from + (to - from) * (k / n), k % 2 ? b : a];
    if (ease) key.push(ease);
    keys.push(key);
  }
  keys.push([1, rest ?? a]);
  return keys;
}
const both = (leg, elbow) => ({ legFL: leg, legFR: leg, elbowL: elbow, elbowR: elbow });
const armsRest = () => both(hold(ARM.leg), hold(ARM.elbow));
const right = (leg, elbow) => ({ legFR: leg, elbowR: elbow, legFL: hold(ARM.leg), elbowL: hold(ARM.elbow) });
const N = (n, d) => Math.max(1, Math.round(n || d));

export const PRIMITIVES = {
  corpo: {
    parado: () => ({}),
    respira: ({ i }) => ({ squashY: alt(1, 1 + 0.03 * i, 4, { rest: 1 }), rootY: alt(0, -1 * i, 4, { rest: 0 }) }),
    balanca: ({ i, n }) => ({ rootRot: alt(-3 * i, 3 * i, N(n, 4), { rest: 0 }), rootX: alt(-2 * i, 2 * i, N(n, 4), { rest: 0 }) }),
    flutua: ({ i }) => ({ rootY: alt(-4 * i, -8 * i, 4, { rest: 0 }) }),
    pula: ({ i, n }) => ({ rootY: alt(0, -16 * i, N(n, 2) * 2, { rest: 0 }), squashY: alt(1, 0.95, N(n, 2) * 2, { rest: 1 }) }),
    pulinho: ({ i, n }) => ({ rootY: alt(0, -7 * i, N(n, 3) * 2, { rest: 0 }) }),
    gira: ({ n }) => {
      const k = N(n, 1);
      const keys = [[0, 1]];
      for (let r = 0; r < k; r++) {
        const o = 0.1 + (0.8 * r) / k;
        const d = 0.8 / k;
        keys.push([o + d * 0.25, 0.15], [o + d * 0.5, -1], [o + d * 0.75, 0.15], [o + d, 1]);
      }
      keys.push([1, 1]);
      return { squashX: keys };
    },
    rola: () => ({ rootRot: [[0, 0], [0.12, 0], [0.82, 360], [0.83, 0, 'step'], [1, 0]], rootY: ehs(-6) }),
    treme: ({ i }) => ({ rootX: alt(-1.5 * i, 1.5 * i, 16, { rest: 0 }) }),
    inclina: ({ i }) => ({ rootRot: ehs(7 * i) }),
    desmaia: () => ({ rootRot: [[0, 0], [0.2, -12], [0.32, -85], [0.88, -85], [1, 0]], rootY: [[0, 0], [0.32, 12], [0.88, 12], [1, 0]] }),
    ajoelha: () => ({ squatPose: ehs(1), rootY: ehs(12) }),
    agacha: ({ n }) => ({ squatPose: alt(0, 1, N(n, 2) * 2, { rest: 0, ease: 'step' }), rootY: alt(0, 12, N(n, 2) * 2, { rest: 0, ease: 'step' }) }),
    danca: ({ i, n }) => ({ rootRot: alt(-8 * i, 8 * i, N(n, 8), { rest: 0, ease: 'step' }), rootX: alt(-5 * i, 5 * i, N(n, 8), { rest: 0 }), legBL: alt(0, 14, N(n, 8), { rest: 0 }), legBR: alt(14, 0, N(n, 8), { rest: 0 }) }),
    dancaSemRitmo: ({ i }) => ({
      rootRot: [[0, 0], [0.1, 9 * i], [0.18, -4 * i], [0.33, 12 * i], [0.41, 2], [0.55, -10 * i], [0.6, 6 * i], [0.78, -3 * i], [0.86, 10 * i], [1, 0]],
      rootY: [[0, 0], [0.12, -6 * i], [0.2, 0], [0.37, -10 * i], [0.44, 0], [0.62, -4 * i], [0.7, 0], [0.88, -8 * i], [1, 0]],
      legBL: alt(0, 18, 7, { rest: 0 }), legBR: alt(10, 0, 5, { rest: 0 }),
    }),
    nada: ({ i }) => ({ rootX: alt(-6 * i, 6 * i, 4, { rest: 0 }), rootRot: alt(-3, 3, 4, { rest: 0 }), tailRot: alt(-16, 16, 12, { rest: 0 }) }),
    espreguica: () => ({ squashY: ehs(1.08, 1), squashX: ehs(0.95, 1), rootY: ehs(-3) }),
    encolhe: () => ({ squashY: ehs(0.94, 1), scale: ehs(0.95, 1) }),
    infla: ({ i }) => ({ scale: ehs(1 + 0.08 * i, 1), rootY: ehs(-2) }),
    flexoes: ({ n }) => ({ rootRot: ehs(-78), rootY: [[0, 0], [0.14, -46], ...alt(-46, -38, N(n, 4) * 2, { from: 0.2, to: 0.8 }).slice(1, -1), [0.86, -46], [1, 0]] }),
    desfile: ({ i }) => ({ rootX: alt(-12 * i, 12 * i, 6, { rest: 0 }), legLiftB: alt(0, 4, 12, { rest: 0 }), rootRot: alt(-2, 2, 12, { rest: 0 }) }),
    marcha: () => ({ legLiftB: alt(0, 5, 10, { rest: 0 }), rootY: alt(0, -2, 10, { rest: 0 }) }),
    empurrado: () => ({ rootX: [[0, 0], [0.15, -26], [0.55, -26], [1, 0]], rootRot: [[0, 0], [0.15, -10], [0.4, 0], [1, 0]] }),
    jogado: () => ({ rootRot: [[0, 0], [0.5, 360], [0.51, 0, 'step'], [1, 0]], rootY: [[0, 0], [0.25, -30], [0.5, 0], [0.6, -6], [0.7, 0], [1, 0]] }),
    surge: () => ({ scale: [[0, 0.05], [0.4, 1.15], [0.6, 0.95], [1, 1]], alpha: [[0, 0], [0.3, 1], [1, 1]] }),
    some: () => ({ scale: [[0, 1], [0.3, 1.1], [0.5, 0.05], [0.8, 0.05], [1, 1]], alpha: [[0, 1], [0.5, 0], [0.8, 0], [1, 1]] }),
    teleporte: () => ({ squashX: [[0, 1], [0.3, 0.05], [0.55, 0.05], [0.8, 1], [1, 1]], rootX: [[0, 0], [0.42, 0], [0.43, 30, 'step'], [0.9, 30], [1, 0]] }),
    poder: ({ i }) => ({ scale: ehs(1 + 0.12 * i, 1), rootY: ehs(-4) }),
    evolui: () => ({ scale: [[0, 1], [0.2, 0.9], [0.4, 1.1], [0.5, 0.95], [0.7, 1.18], [0.9, 1.18], [1, 1]] }),
    recua: () => ({ rootX: ehs(-8), rootY: [[0, 0], [0.1, -10], [0.25, 0], [1, 0]] }),
    avanca: () => ({ scale: [[0, 1], [0.6, 1.18], [0.85, 1.18], [1, 1]], rootY: ehs(-6) }),
    circula: () => ({ rootX: [[0, 0], [0.25, 30], [0.5, 0], [0.75, -30], [1, 0]], scale: [[0, 1], [0.25, 0.92], [0.5, 0.85], [0.75, 0.92], [1, 1]], squashX: [[0, 1], [0.24, 1], [0.26, -1, 'step'], [0.74, -1], [0.76, 1, 'step'], [1, 1]] }),
    espiaBorda: () => ({ rootX: [[0, 0], [0.1, 60], [0.3, 38], [0.7, 38], [0.9, 60], [1, 0]] }),
    sobeDaBorda: () => ({ rootY: [[0, 0], [0.08, 90], [0.3, 0], [1, 0]] }),
    dorsalCruza: () => ({ rootY: [[0, 0], [0.08, 120], [0.92, 120], [1, 0]], rootX: [[0, 0], [0.08, -90], [0.92, 90], [1, 0]] }),
    bateBorda: () => ({ rootX: [[0, 0], [0.3, 14], [0.33, 6], [0.5, 6], [1, 0]], rootRot: [[0, 0], [0.33, -6], [0.5, 0], [1, 0]] }),
    caiDeCostas: () => ({ rootRot: [[0, 0], [0.3, -90], [0.85, -90], [1, 0]], rootY: [[0, 0], [0.3, 14], [0.85, 14], [1, 0]] }),
    boia: () => ({ rootRot: hold(-90), rootY: alt(10, 6, 4, { rest: 10 }) }),
    escondeBorda: () => ({ rootX: [[0, 0], [0.15, 120], [0.85, 120], [1, 0]] }),
    giroLeve: () => ({ squashX: alt(1, 0.86, 4, { rest: 1 }), rootRot: alt(-2, 2, 4, { rest: 0 }) }),
    some2: () => ({ alpha: [[0, 1], [0.1, 0], [0.9, 0], [1, 1]] }),
    solucos: () => ({ rootY: [[0, 0], [0.2, 0], [0.24, -8], [0.3, 0], [0.55, 0], [0.59, -8], [0.65, 0], [0.82, 0], [0.86, -8], [0.92, 0], [1, 0]] }),
    morde: () => ({ scale: [[0, 1], [0.3, 1.14], [0.8, 1.14], [1, 1]], rootX: ehs(10) }),
    viral: () => ({ rootRot: alt(-6, 6, 8, { rest: 0, ease: 'step' }), rootY: alt(0, -4, 8, { rest: 0, ease: 'step' }) }),
  },
  bracos: {
    repouso: () => armsRest(),
    cruzados: () => both(ehs(-10, ARM.leg), ehs(-90, ARM.elbow)),
    cintura: () => both(ehs(22, ARM.leg), ehs(-55, ARM.elbow)),
    flexDuplo: ({ n }) => both(ehs(92, ARM.leg), [[0, ARM.elbow], [0.14, 125], ...alt(115, 135, N(n, 3) * 2, { from: 0.2, to: 0.8 }).slice(1, -1), [0.86, 125], [1, ARM.elbow]]),
    flexUm: ({ n }) => ({ ...right(ehs(92, ARM.leg), [[0, ARM.elbow], [0.14, 125], ...alt(115, 135, N(n, 3) * 2, { from: 0.2, to: 0.8 }).slice(1, -1), [0.86, 125], [1, ARM.elbow]]), legFL: ehs(22, ARM.leg), elbowL: ehs(-55, ARM.elbow) }),
    acena: ({ n }) => right(ehs(70, ARM.leg), alt(90, 125, N(n, 6), { rest: ARM.elbow })),
    tchau: ({ n }) => right(ehs(110, ARM.leg), alt(60, 120, N(n, 6), { rest: ARM.elbow })),
    aponta: () => right(ehs(70, ARM.leg), ehs(0, ARM.elbow)),
    aplaude: ({ n }) => both(ehs(-25, ARM.leg), alt(-100, -68, N(n, 4) * 2, { rest: ARM.elbow })),
    aplausoLento: () => both(ehs(-25, ARM.leg), alt(-100, -60, 6, { rest: ARM.elbow, ease: 'step' })),
    maosAlto: () => both(alt(140, 152, 6, { rest: ARM.leg }), ehs(20, ARM.elbow)),
    maosBoca: () => both(ehs(-30, ARM.leg), ehs(-115, ARM.elbow)),
    cobreRosto: () => both(ehs(-38, ARM.leg), ehs(-135, ARM.elbow)),
    cobreUmOlho: () => ({ legFL: ehs(-38, ARM.leg), elbowL: ehs(-135, ARM.elbow), legFR: hold(ARM.leg), elbowR: hold(ARM.elbow) }),
    abraco: () => both([[0, ARM.leg], [0.25, 70], [0.5, 20], [0.85, 20], [1, ARM.leg]], [[0, ARM.elbow], [0.25, 60], [0.5, 88], [0.85, 88], [1, ARM.elbow]]),
    ombros: () => both(ehs(32, ARM.leg), ehs(70, ARM.elbow)),
    coracao: () => both(ehs(150, ARM.leg), ehs(115, ARM.elbow)),
    beijo: () => right([[0, ARM.leg], [0.3, -30], [0.5, -30], [0.7, 60], [1, ARM.leg]], [[0, ARM.elbow], [0.3, -115], [0.5, -115], [0.7, 10], [1, ARM.elbow]]),
    coca: () => ({ legFL: hold(-22), elbowL: alt(-100, -80, 10, { rest: ARM.elbow }), legFR: hold(ARM.leg), elbowR: hold(ARM.elbow) }),
    tapaBarriga: () => right(hold(-18), alt(-95, -60, 6, { rest: ARM.elbow })),
    segura: () => right(ehs(30, ARM.leg), ehs(100, ARM.elbow)),
    seguraAlto: () => right(ehs(125, ARM.leg), ehs(40, ARM.elbow)),
    seguraFrente: () => right(ehs(65, ARM.leg), ehs(85, ARM.elbow)),
    rosca: ({ n }) => right(ehs(20, ARM.leg), alt(20, 130, N(n, 3) * 2, { rest: ARM.elbow })),
    levantaAcima: ({ n }) => right(alt(80, 150, N(n, 3) * 2, { rest: ARM.leg }), alt(120, 20, N(n, 3) * 2, { rest: ARM.elbow })),
    bebe: () => right([[0, ARM.leg], [0.2, -30], [0.8, -30], [1, ARM.leg]], [[0, ARM.elbow], [0.2, -120], [0.8, -120], [1, ARM.elbow]]),
    reza: () => both(ehs(-20, ARM.leg), ehs(-105, ARM.elbow)),
    maoNoPeito: () => right(ehs(-15, ARM.leg), ehs(-100, ARM.elbow)),
    convida: () => right(ehs(40, ARM.leg), alt(60, 115, 6, { rest: ARM.elbow })),
    quedaBraco: () => right(ehs(40, ARM.leg), alt(100, 110, 10, { rest: ARM.elbow })),
    toalha: () => both(alt(110, 122, 8, { rest: ARM.leg }), alt(150, 162, 8, { rest: ARM.elbow })),
    digita: () => ({ legFL: hold(-12), legFR: hold(-12), elbowL: alt(-70, -82, 12, { rest: ARM.elbow }), elbowR: alt(-82, -70, 12, { rest: ARM.elbow }) }),
    escreve: () => right(hold(-10), alt(-75, -86, 10, { rest: ARM.elbow })),
    le: () => both(ehs(-15, ARM.leg), ehs(-75, ARM.elbow)),
    fone: () => both(ehs(140, ARM.leg), ehs(160, ARM.elbow)),
    estala: () => both(alt(150, 120, 4, { rest: ARM.leg }), alt(10, 40, 4, { rest: ARM.elbow })),
    soco: () => right(ehs(70, ARM.leg), alt(120, 0, 6, { rest: ARM.elbow })),
    nadando: () => both(alt(30, 45, 4, { rest: ARM.leg }), alt(30, 55, 4, { rest: ARM.elbow })),
    agita: ({ n }) => both(alt(20, 95, N(n, 10), { rest: ARM.leg }), alt(20, 60, N(n, 10), { rest: ARM.elbow })),
    protege: () => both(ehs(-20, ARM.leg), ehs(-120, ARM.elbow)),
    maoBoca: () => right(ehs(-28, ARM.leg), ehs(-118, ARM.elbow)),
    escondeAtras: () => both(ehs(-6, ARM.leg), ehs(-20, ARM.elbow)),
    alonga: () => both([[0, ARM.leg], [0.2, 150], [0.5, 150], [0.6, 60], [0.85, 60], [1, ARM.leg]], [[0, ARM.elbow], [0.2, 10], [0.5, 10], [0.6, 0], [0.85, 0], [1, ARM.elbow]]),
    elastico: ({ n }) => both(alt(70, 85, N(n, 4) * 2, { rest: ARM.leg }), alt(0, 40, N(n, 4) * 2, { rest: ARM.elbow })),
    cocegas: () => both(alt(-10, 10, 12, { rest: ARM.leg }), alt(-90, -60, 12, { rest: ARM.elbow })),
    highFive: () => right([[0, ARM.leg], [0.3, 130], [0.45, 130], [0.5, 120], [0.85, 120], [1, ARM.leg]], [[0, ARM.elbow], [0.3, 30], [1, ARM.elbow]]),
    viral: () => ({ legFL: alt(92, -10, 8, { rest: ARM.leg, ease: 'step' }), elbowL: alt(125, -90, 8, { rest: ARM.elbow, ease: 'step' }), legFR: alt(-10, 70, 8, { rest: ARM.leg, ease: 'step' }), elbowR: alt(-90, 0, 8, { rest: ARM.elbow, ease: 'step' }) }),
    pegaComida: () => right([[0, ARM.leg], [0.25, 80], [0.4, 80], [0.6, -30], [0.85, -30], [1, ARM.leg]], [[0, ARM.elbow], [0.25, 0], [0.4, 0], [0.6, -115], [0.85, -115], [1, ARM.elbow]]),
  },
  cabeca: {
    reto: () => ({}),
    inclina: ({ i }) => ({ headRot: ehs(9 * i) }),
    inclinaOutro: ({ i }) => ({ headRot: ehs(-9 * i) }),
    nega: ({ n }) => ({ headRot: alt(-9, 9, N(n, 6), { rest: 0 }) }),
    assente: ({ n }) => ({ rootY: alt(0, 2, N(n, 4), { rest: 0 }), squashY: alt(1, 0.97, N(n, 4), { rest: 1 }) }),
    olhaRedor: () => ({ pupilX: [[0, 0], [0.25, -0.9], [0.5, 0], [0.75, 0.9], [1, 0]], headRot: [[0, 0], [0.25, -6], [0.5, 0], [0.75, 6], [1, 0]] }),
    viraRosto: ({ i }) => ({ headRot: ehs(-14 * i), pupilX: ehs(-0.9) }),
    olhaCima: () => ({ pupilY: ehs(-0.9) }),
    olhaBaixo: () => ({ pupilY: ehs(0.8), headRot: ehs(4) }),
    olhaLado: () => ({ pupilX: ehs(0.95), headRot: ehs(5) }),
    olhaUsuario: () => ({ pupilX: hold(0), pupilY: hold(0.15) }),
    revira: () => ({ pupilY: [[0, 0], [0.2, -0.9], [0.7, -0.9], [0.85, 0], [1, 0]], pupilX: [[0, 0], [0.2, -0.8], [0.7, 0.8], [0.85, 0], [1, 0]] }),
    encara: () => ({ pupilX: hold(0), pupilY: hold(0.1), eyeScale: ehs(1.12, 1) }),
    cochila: () => ({ headRot: [[0, 0], [0.3, 12], [0.45, 12], [0.5, 0, 'step'], [0.8, 14], [0.95, 14], [1, 0]], eyeOpen: [[0, 0.7], [0.3, 0], [0.45, 0], [0.5, 1, 'step'], [0.8, 0], [0.95, 0], [1, 1]] }),
    leJunto: () => ({ pupilX: alt(-0.6, 0.6, 6, { rest: 0 }), pupilY: hold(0.5) }),
    explora: () => ({ pupilX: [[0, 0], [0.15, 0.8], [0.3, 0.8], [0.45, -0.7], [0.6, -0.7], [0.75, 0.3], [1, 0]], pupilY: [[0, 0], [0.15, -0.4], [0.45, 0.5], [0.75, -0.6], [1, 0]] }),
    espia: () => ({ pupilX: ehs(1), headRot: ehs(6) }),
  },
  rosto: {
    neutro: () => ({}),
    sorriso: () => ({ jaw: hold(0.35), moodJoy: ehs(0.3) }),
    sorrisao: () => ({ jaw: ehs(0.9, 0.3) }),
    canto: () => ({ jaw: ehs(0.25), browShow: hold(1), brow: ehs(1), eyeOpen: ehs(0.75, 1) }),
    sobrancelha: ({ i }) => ({ browShow: hold(1), brow: ehs(1.4 * i) }),
    risada: ({ n }) => ({ jaw: alt(0.4, 1.1, N(n, 10), { rest: 0.3 }), happyEyes: hold(1), rootY: alt(0, -2, N(n, 10), { rest: 0 }), moodJoy: ehs(0.4) }),
    boceja: () => ({ jaw: [[0, 0.1], [0.3, 1.3], [0.7, 1.3], [1, 0.1]], eyeOpen: [[0, 1], [0.3, 0.2], [0.7, 0.2], [1, 1]], headRot: ehs(-6) }),
    lingua: () => ({ tongue: ehs(1), jaw: ehs(0.7) }),
    careta: () => ({ jaw: ehs(0.8), tongue: ehs(0.7), eyeScale: alt(1.25, 0.8, 4, { rest: 1 }), browShow: hold(1), browAngry: ehs(1) }),
    bravo: ({ i }) => ({ browAngry: hold(1), browShow: hold(1), moodAngry: ehs(0.5 * i), jaw: hold(0.6) }),
    irritado: () => ({ browAngry: ehs(1), browShow: hold(1), moodAngry: ehs(0.3), mouthClose: ehs(0.7) }),
    triste: () => ({ brow: ehs(-1.5), browShow: hold(1), mouthClose: ehs(1), eyeOpen: ehs(0.6, 1), pupilY: ehs(0.6), moodSad: ehs(0.7) }),
    chora: ({ n }) => ({ brow: ehs(-1.5), browShow: hold(1), jaw: alt(0.2, 0.7, N(n, 8), { rest: 0 }), eyeOpen: ehs(0.3, 1), moodSad: ehs(0.85) }),
    decepcionado: () => ({ brow: ehs(-1), browShow: hold(1), mouthClose: ehs(1), moodSad: ehs(0.4), pupilY: ehs(0.4) }),
    preocupado: () => ({ brow: ehs(-1), browShow: hold(1), pupilX: alt(-0.5, 0.5, 4, { rest: 0 }), mouthClose: ehs(0.5), moodScared: ehs(0.25) }),
    nervoso: () => ({ jaw: alt(0.2, 0.4, 10, { rest: 0 }), eyeScale: ehs(1.1, 1), moodScared: ehs(0.3) }),
    envergonhado: () => ({ blush: ehs(1), moodShy: ehs(0.7), pupilY: ehs(0.6) }),
    entediado: () => ({ eyeOpen: ehs(0.45, 1), mouthClose: ehs(0.8), moodTired: ehs(0.3) }),
    frustrado: () => ({ browAngry: hold(1), browShow: hold(1), jaw: alt(0.2, 0.7, 6, { rest: 0 }), moodAngry: ehs(0.4) }),
    assustado: () => ({ eyeScale: ehs(1.3, 1), jaw: ehs(0.9), moodScared: ehs(0.6) }),
    surpreso: () => ({ eyeScale: ehs(1.3, 1), jaw: ehs(0.8), browShow: hold(1), brow: ehs(1.2) }),
    chocado: () => ({ eyeScale: ehs(1.35, 1), jaw: ehs(1.2), browShow: hold(1), brow: ehs(1.5), moodScared: ehs(0.4) }),
    cansado: () => ({ eyeOpen: ehs(0.4, 1), moodTired: ehs(0.6), jaw: ehs(0.2) }),
    solitario: () => ({ brow: ehs(-1.2), browShow: hold(1), mouthClose: ehs(1), moodSad: ehs(0.5), pupilX: ehs(-0.7) }),
    apaixonado: () => ({ heartEyes: ehs(1), blush: ehs(0.9), jaw: ehs(0.5), moodShy: ehs(0.5) }),
    timido: () => ({ blush: ehs(0.8), moodShy: ehs(0.6), pupilY: ehs(0.6), mouthClose: ehs(0.6) }),
    confuso: () => ({ browShow: hold(1), brow: alt(1, -1, 4, { rest: 0 }), headRot: ehs(8) }),
    pensando: () => ({ pupilY: ehs(-0.8), pupilX: ehs(0.6), mouthClose: ehs(0.6) }),
    focado: () => ({ eyeOpen: hold(0.75), browAngry: hold(0.6), browShow: hold(1), mouthClose: hold(0.7) }),
    piscadinha: () => ({ wink: [[0, 0], [0.3, 1, 'step'], [0.7, 0, 'step'], [1, 0]], jaw: ehs(0.3), browShow: hold(1), brow: ehs(0.8) }),
    beijoBoca: () => ({ mouthClose: ehs(1), cheeks: ehs(0.35) }),
    bochechas: () => ({ cheeks: ehs(1), mouthClose: ehs(1) }),
    assobia: () => ({ mouthClose: ehs(0.85), pupilY: ehs(-0.6), pupilX: ehs(0.6) }),
    fera: () => ({ eyeScale: ehs(0.85, 1), browAngry: hold(1), browShow: hold(1), jaw: ehs(1.1), moodAngry: ehs(0.35) }),
    morto: () => ({ eyeX: ehs(1), jaw: ehs(0.6), tongue: ehs(1) }),
    zen: () => ({ eyeOpen: ehs(0, 1), moodJoy: ehs(0.2), mouthClose: ehs(0.6) }),
    dormindo: () => ({ eyeOpen: hold(0), moodTired: hold(0.3) }),
    brilhoOlhos: () => ({ eyeScale: ehs(1.2, 1), jaw: ehs(0.5) }),
    orgulhoso: () => ({ jaw: ehs(0.5), eyeOpen: ehs(0.8, 1), browShow: hold(1), brow: ehs(1), moodJoy: ehs(0.4), pupilY: ehs(-0.3) }),
    grato: () => ({ happyEyes: ehs(1), jaw: ehs(0.4), moodJoy: ehs(0.4) }),
    aliviado: () => ({ eyeOpen: [[0, 1], [0.3, 0.2], [0.7, 0.2], [1, 1]], squashY: [[0, 1], [0.3, 1.04], [0.7, 0.97], [1, 1]], moodJoy: ehs(0.3) }),
    contente: () => ({ happyEyes: hold(1), jaw: hold(0.3), moodJoy: ehs(0.4) }),
    feliz: () => ({ happyEyes: ehs(1), jaw: ehs(0.9), moodJoy: ehs(0.5) }),
    dente: () => ({ jaw: ehs(0.7) }),
    inocente: () => ({ pupilY: ehs(-0.8), pupilX: ehs(0.6), mouthClose: ehs(0.9), browShow: hold(1), brow: ehs(1) }),
    mastiga: ({ n }) => ({ jaw: alt(0, 1, N(n, 8), { rest: 0 }), happyEyes: ehs(1) }),
    lambe: () => ({ tongue: alt(0, 1, 6, { rest: 0 }), jaw: ehs(0.6) }),
    sujo: () => ({ jaw: alt(0, 0.9, 8, { rest: 0 }), tongue: ehs(0.6), happyEyes: ehs(1) }),
    pisca: () => ({ eyeOpen: [[0, 1], [0.4, 0, 'step'], [0.55, 1, 'step'], [1, 1]] }),
    piscaLento: () => ({ eyeOpen: [[0, 1], [0.3, 0.6], [0.45, 0], [0.6, 0.6], [0.75, 1], [1, 1]] }),
    guelras: () => ({ gills: alt(0, 1, 8, { rest: 0 }) }),
    espirro: () => ({ jaw: [[0, 0.1], [0.3, 0.9], [0.45, 0.9], [0.5, 0.2, 'step'], [1, 0]], eyeOpen: [[0, 1], [0.3, 0.3], [0.5, 0, 'step'], [0.7, 1], [1, 1]], headRot: [[0, 0], [0.3, -8], [0.5, 10, 'step'], [0.8, 0], [1, 0]] }),
    engole: () => ({ jaw: [[0, 0], [0.2, 1.3], [0.4, 1.3], [0.45, 0, 'step'], [1, 0]], cheeks: [[0, 0], [0.45, 0], [0.5, 1, 'step'], [0.8, 1], [1, 0]] }),
    pidao: () => ({ brow: ehs(-1.3), browShow: hold(1), eyeScale: ehs(1.2, 1), jaw: ehs(0.3), moodShy: ehs(0.3) }),
    acordaAssustado: () => ({ eyeOpen: [[0, 0], [0.2, 0], [0.25, 1, 'step'], [1, 1]], eyeScale: [[0, 1], [0.25, 1.35, 'step'], [0.5, 1], [1, 1]], pupilY: [[0, 0], [0.55, 0], [0.6, -0.8], [0.95, -0.8], [1, 0]], mouthClose: [[0, 0], [0.55, 0], [0.6, 0.9], [1, 0]] }),
    nojo: () => ({ browAngry: ehs(1), browShow: hold(1), tongue: [[0, 0], [0.2, 1], [0.5, 1], [0.6, 0.4], [0.75, 1], [0.9, 1], [1, 0]], jaw: ehs(0.7), eyeOpen: ehs(0.45, 1), headRot: ehs(-10) }),
    canta: ({ n }) => ({ jaw: alt(0.3, 1.1, N(n, 10), { rest: 0 }), eyeOpen: ehs(0.4, 1), browShow: hold(1), brow: alt(1, -0.5, 6, { rest: 0 }) }),
  },
  cauda: {
    parada: () => ({}),
    abana: ({ i }) => ({ tailRot: alt(-12 * i, 12 * i, 10, { rest: 0 }) }),
    devagar: () => ({ tailRot: alt(-6, 6, 4, { rest: 0 }) }),
    charme: () => ({ tailRot: alt(-20, 20, 6, { rest: 0 }) }),
    baixa: () => ({ tailRot: ehs(-8) }),
  },
  dorsal: {
    parada: () => ({}),
    treme: () => ({ finRot: alt(-6, 6, 10, { rest: 0 }) }),
    destaque: () => ({ finRot: ehs(12), scale: ehs(1.04, 1) }),
  },
};

// ------------------------------------------------------------------ modo foco
// Primitivos das animações de foco: movimento suave e contínuo. Diferente dos
// de cima, não voltam ao repouso no meio do laço: o último quadro é igual ao
// primeiro, então o ciclo fecha sem salto.

/** Vai de `a` a `b` e volta, `n` vezes; começa e termina em `a`. */
const wave = (a, b, n = 1) => Array.from({ length: 2 * n + 1 }, (_, k) => [k / (2 * n), k % 2 ? b : a]);
/** Fica em `rest`, vai a `v` entre t1 e t2 e volta a `rest` em t3. */
const pulse = (rest, v, t0, t1, t2, t3) => [[0, rest], [t0, rest], [t1, v], [t2, v], [t3, rest], [1, rest]];
const left = (leg, elbow) => ({ legFL: leg, elbowL: elbow });
const seguraDireita = () => ({ legFR: hold(30), elbowR: hold(100) });

Object.assign(PRIMITIVES.corpo, {
  focoRespira: ({ i }) => ({ squashY: wave(1, 1 + 0.06 * i), rootY: wave(0, -2 * i) }),
  focoFlutua: () => ({ rootY: wave(-4, -6) }),
  focoPrancha: ({ i }) => ({ rootRot: hold(-78), rootY: hold(-44), rootX: wave(-0.8 * i, 0.8 * i, 10) }),
  focoFlexao: ({ n }) => ({ rootRot: hold(-78), rootY: wave(-46, -37, N(n, 2)) }),
  focoAgacha: ({ n }) => ({ squatPose: wave(0, 1, N(n, 1)), rootY: wave(0, 12, N(n, 1)) }),
  focoNado: ({ i }) => ({ rootX: wave(-3 * i, 3 * i), rootY: wave(-5, -8, 2), legBL: wave(0, 12, 2), legBR: wave(12, 0, 2) }),
  // Areia desce, a ampulheta vira: virada com a areia toda embaixo é igual ao começo.
  focoAmpulheta: () => ({
    sandTop: [[0, 1], [0.8, 0], [1, 0]],
    sandBottom: [[0, 0], [0.8, 1], [1, 1]],
    sandStream: [[0, 0], [0.03, 1], [0.77, 1], [0.8, 0], [1, 0]],
    hourglassFlip: [[0, 0], [0.86, 0], [0.98, 180], [1, 180]],
  }),
});

Object.assign(PRIMITIVES.bracos, {
  focoViraPagina: () => ({
    ...seguraDireita(),
    ...left([[0, ARM.leg], [0.45, ARM.leg], [0.52, -18], [0.72, -18], [0.82, ARM.leg], [1, ARM.leg]], [[0, ARM.elbow], [0.45, ARM.elbow], [0.52, -95], [0.72, -85], [0.82, ARM.elbow], [1, ARM.elbow]]),
    pageTurnR: [[0, 0], [0.5, 0], [0.57, 1], [0.64, 0], [1, 0]],
    pageTurnL: [[0, 0], [0.64, 0], [0.71, 1], [0.79, 0], [1, 0]],
  }),
  focoEscreve: () => ({ ...seguraDireita(), ...left(hold(-18), wave(-96, -84, 6)) }),
  focoMarca: () => ({
    ...seguraDireita(),
    ...left(hold(-18), [[0, -100], [0.5, -80], [0.62, -100], [1, -100]]),
    markStroke: [[0, 0], [0.5, 1], [0.8, 1], [0.95, 0], [1, 0]],
  }),
  focoRisca: () => ({
    ...seguraDireita(),
    ...left(hold(-18), [[0, -100], [0.25, -100], [0.45, -80], [0.55, -100], [1, -100]]),
    listStrike: [[0, 0], [0.25, 0], [0.45, 1], [0.85, 1], [0.97, 0], [1, 0]],
  }),
  focoDigita: () => ({ legFL: hold(-12), legFR: hold(-12), elbowL: wave(-70, -82, 6), elbowR: wave(-82, -70, 6) }),
  focoOculos: () => ({ ...left(hold(ARM.leg), hold(ARM.elbow)), legFR: pulse(ARM.leg, -28, 0.12, 0.24, 0.42, 0.54), elbowR: pulse(ARM.elbow, -118, 0.12, 0.24, 0.42, 0.54) }),
  focoQueixo: () => ({
    ...left(hold(ARM.leg), hold(ARM.elbow)),
    legFR: [[0, -28], [0.55, -28], [0.66, 110], [0.86, 110], [1, -28]],
    elbowR: [[0, -118], [0.55, -118], [0.66, 30], [0.86, 30], [1, -118]],
  }),
  focoElevacao: ({ n }) => both(wave(12, 78, N(n, 1)), hold(8)),
  focoCintura: () => both(hold(22), hold(-55)),
  focoAlonga: () => both([[0, ARM.leg], [0.12, 150], [0.4, 150], [0.52, 60], [0.8, 60], [0.92, ARM.leg], [1, ARM.leg]], [[0, ARM.elbow], [0.12, 10], [0.4, 10], [0.52, 0], [0.8, 0], [0.92, ARM.elbow], [1, ARM.elbow]]),
  focoReza: () => both(hold(-20), hold(-105)),
  focoNadaBracos: () => ({ legFL: wave(28, 48, 2), legFR: wave(48, 28, 2), elbowL: wave(30, 52, 2), elbowR: wave(52, 30, 2) }),
  focoCruzados: () => both(hold(-10), hold(-90)),
  focoBiceps: () => ({
    ...left(hold(ARM.leg), hold(ARM.elbow)),
    legFR: [[0, ARM.leg], [0.15, 92], [0.62, 92], [0.8, ARM.leg], [1, ARM.leg]],
    elbowR: [[0, ARM.elbow], [0.15, 125], [0.27, 136], [0.39, 120], [0.51, 136], [0.62, 125], [0.8, ARM.elbow], [1, ARM.elbow]],
  }),
  focoBebe: () => ({ ...left(hold(ARM.leg), hold(ARM.elbow)), legFR: pulse(ARM.leg, 48, 0, 0.18, 0.72, 0.9), elbowR: pulse(ARM.elbow, 150, 0, 0.18, 0.72, 0.9), headRot: pulse(0, 6, 0.1, 0.2, 0.72, 0.82) }),
  focoPunho: () => ({
    ...left(hold(ARM.leg), hold(ARM.elbow)),
    legFR: [[0, ARM.leg], [0.2, 72], [0.3, 62], [0.4, 72], [0.75, 72], [0.92, ARM.leg], [1, ARM.leg]],
    elbowR: pulse(ARM.elbow, 122, 0, 0.2, 0.75, 0.92),
  }),
});

Object.assign(PRIMITIVES.cabeca, {
  focoLe: () => ({ pupilX: wave(-0.5, 0.5, 3), pupilY: hold(0.5) }),
  focoOlhaBaixo: () => ({ pupilX: hold(0.3), pupilY: hold(0.7) }),
  focoOlhaTela: () => ({ pupilX: hold(-0.6), pupilY: hold(0.6) }),
  focoOlhaAmpulheta: () => ({ pupilX: hold(-0.7), pupilY: hold(0.3), headRot: hold(-5) }),
  focoAceno: () => ({ headRot: [[0, 0], [0.2, 0], [0.32, 7], [0.44, 0], [0.56, 7], [0.68, 0], [1, 0]] }),
  focoPescoco: () => ({ headRot: [[0, 0], [0.5, 0], [0.6, -11], [0.72, -11], [0.8, 11], [0.92, 11], [1, 0]] }),
});

Object.assign(PRIMITIVES.rosto, {
  focoSereno: () => ({ eyeOpen: hold(0.8), mouthClose: hold(0.6) }),
  focoOlhosFechados: () => ({ eyeOpen: hold(0), mouthClose: hold(0.6), moodJoy: hold(0.15) }),
  focoIdeia: () => ({
    pupilY: [[0, -0.7], [0.55, -0.7], [0.66, 0], [0.86, 0], [1, -0.7]],
    eyeScale: [[0, 1], [0.6, 1], [0.68, 1.18], [0.86, 1.18], [1, 1]],
    browShow: hold(1),
    brow: [[0, 0], [0.6, 0], [0.68, 1.2], [0.86, 1.2], [1, 0]],
    mouthClose: [[0, 0.6], [0.6, 0.6], [0.68, 0], [0.86, 0], [1, 0.6]],
    jaw: [[0, 0], [0.6, 0], [0.68, 0.5], [0.86, 0.5], [1, 0]],
  }),
  focoAprova: () => ({ jaw: pulse(0, 0.3, 0.2, 0.32, 0.68, 0.8), browShow: hold(1), brow: pulse(0, 0.8, 0.2, 0.32, 0.68, 0.8) }),
  focoOrgulho: () => ({ jaw: pulse(0, 0.5, 0.05, 0.2, 0.62, 0.8), moodJoy: pulse(0, 0.3, 0.05, 0.2, 0.62, 0.8) }),
  focoBebe: () => ({ jaw: pulse(0, 0.4, 0.1, 0.2, 0.72, 0.82), eyeOpen: pulse(1, 0.5, 0.1, 0.2, 0.72, 0.82) }),
});

// Objetos: nome no catálogo → canal do rig.
const PROPS = { shake: 'propShaker', banco: 'propBench', barra: 'propBar', po: 'propPowder', coco: 'propPoop' };
// Efeitos de partículas já existentes (flags do animador) e marcas.
const LEGACY_FX = { coracoes: 'hearts', brilho: 'sparkle', suor: 'sweat', zzz: 'z', fedor: 'stink', poeira: 'dust' };
const MOODS = { alegria: 'moodJoy', raiva: 'moodAngry', tristeza: 'moodSad', medo: 'moodScared', cansaco: 'moodTired', vergonha: 'moodShy', ligado: 'moodWired', nojo: 'moodNojo' };

export const INTENSITIES = Object.freeze({ suave: { i: 0.6, dur: 1.3 }, normal: { i: 1, dur: 1 }, exagerado: { i: 1.5, dur: 0.85 } });

/**
 * Constrói a animação de um item do catálogo.
 * @param item {duracao, loop, entrada, receita:{corpo,bracos,cabeca,rosto,cauda,dorsal,objeto,fx,humor,base,marca}, repeticoes}
 * @param intensity 'suave' | 'normal' | 'exagerado'
 */
export function buildAnimation(item, intensity = 'normal') {
  const I = INTENSITIES[intensity] || INTENSITIES.normal;
  const r = item.receita || {};
  const params = { i: I.i * (r.intensidade ?? 1), n: r.repeticoes };
  const tracks = {};
  for (const layer of ['corpo', 'bracos', 'cabeca', 'rosto', 'cauda', 'dorsal']) {
    const spec = r[layer];
    if (!spec) continue;
    for (const name of [].concat(spec)) {
      const fn = PRIMITIVES[layer][name];
      if (!fn) throw new Error(`Primitivo desconhecido: ${layer}.${name} (${item.id})`);
      Object.assign(tracks, fn(params));
    }
  }
  for (const obj of [].concat(r.objeto || [])) tracks[PROPS[obj] || `prop_${obj}`] = hold(1);
  // Quadros-chave próprios (animações virais): valem por cima da receita.
  if (item.faixas) Object.assign(tracks, item.faixas);
  // Adereços flutuantes têm movimento próprio, sem inventar mãos para segurá-los.
  if (r.aderecosAnimados) for (const obj of [].concat(r.objeto || [])) {
    tracks[`angle_${obj}`] = alt(-5 * I.i, 5 * I.i, 4, { rest: 0 });
    tracks[`lift_${obj}`] = alt(0, -3 * I.i, 6, { rest: 0 });
  }
  for (const [k, v] of Object.entries(r.humor || {})) {
    const ch = MOODS[k];
    if (!ch) throw new Error(`Humor desconhecido: ${k} (${item.id})`);
    tracks[ch] = ehs(v * Math.min(1.3, I.i));
  }
  // Versão suave de um item com `fxLeve` ("reduzir efeitos" dos virais): só os efeitos leves.
  const fxList = [].concat(intensity === 'suave' && item.fxLeve ? item.fxLeve : r.fx || []);
  const anim = {
    duration: Math.round((item.duracao || 3000) * I.dur),
    loop: !!item.loop,
    blendIn: item.entrada ?? 220,
    tracks,
    staticT: item.estatico ?? 0.5,
  };
  // Olhos fixos (encarar, foco, dormindo) não piscam.
  if (!r.semPiscar) anim.blink = true;
  if (r.base) anim.base = r.base;
  if (r.marca) anim.mark = r.marca;
  const fx = [];
  for (const f of fxList) {
    if (LEGACY_FX[f]) anim[LEGACY_FX[f]] = true;
    else fx.push(f);
  }
  if (fx.length) anim.fx = fx;
  return anim;
}

/** Nome da animação gerada para um item e intensidade. */
export function animName(id, intensity = 'normal') {
  return intensity === 'normal' ? `cat_${id}` : `cat_${id}~${intensity}`;
}

/** Acrescenta ao conjunto de animações as do catálogo (3 intensidades cada). */
export function expandCatalog(animations, catalog) {
  const out = { ...animations.animations };
  for (const item of catalog.itens) {
    if (item.usa) continue; // usa uma animação que já existe
    for (const k of Object.keys(INTENSITIES)) out[animName(item.id, k)] = buildAnimation(item, k);
  }
  const channels = { ...animations.channels };
  for (const a of Object.values(out)) for (const ch of Object.keys(a.tracks || {})) if (!(ch in channels)) channels[ch] = 0;
  channels.wink ??= 0;
  channels.cheeks ??= 0;
  return { ...animations, channels, animations: out };
}
