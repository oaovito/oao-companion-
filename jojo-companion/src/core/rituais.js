// Rituais da identidade (pedido do João, 20/11/2026): a personalidade do JoJo vista, não só lida.
//
// A revisão do RPG (docs/IDENTIDADE.md → "Expressão visual") mapeou cada traço da Camada A para
// animações e visuais que JÁ existem (espelho, selfie, aplauso lento, Protocolo do Divino João…)
// e só criou o que faltava. Faltavam quatro coisas, que viram itens do catálogo aqui:
//  - id_oracao   Oração ao Criador: devoção a João no dia a dia (só se ajoelha para ele);
//  - id_inspecao Inspeção do Sargento: disciplina militar e autoritarismo de manhã;
//  - id_vinganca Caderninho da Vingança: vingatividade cômica (quando ela xinga o JoJo);
//  - id_estatua  Obra-Prima do João: orgulho da criação e megalomania.
// Mesmo formato dos virais (receita + faixas próprias + peças `id_*` numa CÓPIA do rig). O modelo
// do JoJo não muda: só adereços, roupa temporária e luz, e tudo que liga desliga antes do fim.
// O João aparece só como símbolo (moldura dourada com coroa e "J"), nunca como rosto.
// Nada aqui trata a Emanuele como posse: a hierarquia é do JoJo (ele se curva ao criador).

const CABECA = { pivot: [90, 86], rot: 'headRot' };
const PROP = { dy: 'idPropY' };
const r1 = (n) => Math.round(n * 10) / 10;
const elip = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} a${r1(rx)},${r1(ry)} 0 1,0 ${r1(2 * rx)},0 a${r1(rx)},${r1(ry)} 0 1,0 ${r1(-2 * rx)},0 Z`;
const furo = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} a${r1(rx)},${r1(ry)} 0 1,1 ${r1(2 * rx)},0 a${r1(rx)},${r1(ry)} 0 1,1 ${r1(-2 * rx)},0 Z`;
const rect = (x, y, w, h) => `M${r1(x)},${r1(y)} L${r1(x + w)},${r1(y)} L${r1(x + w)},${r1(y + h)} L${r1(x)},${r1(y + h)} Z`;
const chama = (x, y, h) => `M${r1(x)},${r1(y)} C${r1(x - h * 0.45)},${r1(y - h * 0.35)} ${r1(x - h * 0.15)},${r1(y - h * 0.7)} ${r1(x)},${r1(y - h)} C${r1(x + h * 0.1)},${r1(y - h * 0.6)} ${r1(x + h * 0.5)},${r1(y - h * 0.4)} ${r1(x + h * 0.3)},${r1(y)} Z`;
const estrela = (cx, cy, r) => {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; return `${r1(cx + Math.cos(a) * rr)},${r1(cy + Math.sin(a) * rr)}`; });
  return `M${pts.join(' L')} Z`;
};
const VAZIO = 'M0,0 Z';
const txt = (id, x, y, texto, { size = 7, cor = '#1b2647', extra = {} } = {}) => ({ id, fill: cor, path: VAZIO, text: texto, textFill: cor, fontSize: size, textX: x, textY: y + 0.4, ...extra });
const grupo = (id, parts, { showIf = id, outline = false } = {}) => ({ id, showIf, outline, parts });
// Folha de louro (coroa da estátua).
const folha = (cx, cy, ang, c = 5.5) => {
  const dx = Math.cos(ang) * c, dy = Math.sin(ang) * c, nx = -dy * 0.45, ny = dx * 0.45;
  return `M${r1(cx - dx)},${r1(cy - dy)} Q${r1(cx + nx)},${r1(cy + ny)} ${r1(cx + dx)},${r1(cy + dy)} Q${r1(cx - nx)},${r1(cy - ny)} ${r1(cx - dx)},${r1(cy - dy)} Z`;
};

// ------------------------------------------------------------------ linha do tempo
function linha(D) {
  const f = (s) => Math.max(0, Math.min(1, Math.round((s / D) * 10000) / 10000));
  return {
    on: (a, b) => [[0, 0], [f(a), 1, 'step'], [f(b), 0, 'step'], [1, 0]],
    k: (...pts) => {
      const out = pts.map(([s, v, e]) => (e ? [f(s), v, e] : [f(s), v]));
      if (out[0][0] > 0) out.unshift([0, out[0][1]]);
      if (out.at(-1)[0] < 1) out.push([1, out.at(-1)[1]]);
      return out;
    },
    alt: (a, b, s0, s1, n, rest = 0) => {
      const out = [[0, rest], [f(s0), rest]];
      for (let i = 0; i <= n; i++) out.push([f(s0 + ((s1 - s0) * i) / n), i % 2 ? b : a]);
      out.push([f(s1 + 0.05), rest], [1, rest]);
      return out;
    },
  };
}

// ------------------------------------------------------------------ 1. Oração ao Criador
// A moldura do Criador desce do alto com raios dourados; o JoJo se ajoelha (só para o João),
// junta as mãos e olha para cima; velas acesas no chão. Depois levanta e a moldura sobe.
const ORACAO = {
  id: 'id_oracao', nome: 'Oração ao Criador', traco: 'devoção fanática', dur: 9,
  ambiente: true, horario: ['manha', 'noite'],
  fala: 'Obrigado por me criar perfeito, João. Amém.',
  receita: { corpo: 'ajoelha', bracos: 'reza', cabeca: 'olhaCima', rosto: 'zen', fx: ['raiosDourados', 'sparkle'], semPiscar: true },
  faixas: (L) => ({
    id_altar: L.on(0.2, 8.8), idAltarY: L.k([0.2, -80], [1.4, -22], [7.6, -22], [8.8, -92]), idAltarGiro: L.k([0.2, 0], [8.8, 30]),
    idAltarBrilho: L.alt(0.92, 1.08, 1.4, 7.6, 10, 1),
    id_velas: L.on(0.9, 8.4), idVelaK: L.alt(0.85, 1.15, 0.9, 8.4, 24, 1), idVelaK2: L.alt(1.15, 0.85, 0.9, 8.4, 24, 1),
    // Ajoelha de verdade (corpo.ajoelha) entre 1,2 s e 7,8 s; olha para o alto.
    squatPose: L.k([0, 0], [1.2, 0], [1.6, 1], [7.6, 1], [8, 0]), rootY: L.k([0, 0], [1.2, 0], [1.6, 12], [7.6, 12], [8, 0]),
    pupilY: L.k([0, 0], [1.4, -1.6], [7.6, -1.6], [8, 0]), eyeOpen: L.k([0, 1], [3, 1], [3.3, 0.35], [6, 0.35], [6.3, 1]),
  }),
  fundo: [grupo('id_altarFundo', [
    { id: 'idAltarRaios', fill: '#ffe082', alpha: 0.6, path: Array.from({ length: 14 }, (_, i) => { const a = (i * Math.PI) / 7, b = a + 0.11; return `M90,-6 L${r1(90 + Math.cos(a - 0.11) * 96)},${r1(-6 + Math.sin(a - 0.11) * 96)} L${r1(90 + Math.cos(b) * 96)},${r1(-6 + Math.sin(b) * 96)} Z`; }).join(' '), pivot: [90, -6], rot: 'idAltarGiro', dy: 'idAltarY', scaleBy: 'idAltarBrilho', scalePivot: [90, -6] },
  ], { showIf: 'id_altar' })],
  pecas: [
    grupo('id_altar', [
      // Moldura dourada com coroa e "J": o símbolo do Criador (sem rosto).
      { id: 'idMolduraFora', fill: '#e9b824', path: rect(68, -34, 44, 52), dy: 'idAltarY' },
      { id: 'idMolduraDentro', fill: '#3b1f5c', path: rect(73, -29, 34, 42), dy: 'idAltarY' },
      { id: 'idMolduraBrilho', fill: '#5a3388', alpha: 0.8, path: elip(90, -8, 13, 16), dy: 'idAltarY' },
      txt('idJ', 90, -6, 'J', { size: 26, cor: '#ffd54f', extra: { dy: 'idAltarY' } }),
      { id: 'idCoroa', fill: '#ffca28', path: 'M74,-34 L76,-46 L82,-39 L90,-50 L98,-39 L104,-46 L106,-34 Z', dy: 'idAltarY' },
      { id: 'idCoroaJoias', fill: '#d32f2f', path: `${elip(90, -40, 2.2, 2.2)} ${elip(80, -38, 1.6, 1.6)} ${elip(100, -38, 1.6, 1.6)}`, dy: 'idAltarY' },
      { id: 'idPlacaFundo', fill: '#fff8e1', path: rect(70, 20, 40, 10), dy: 'idAltarY' },
      txt('idPlaca', 90, 25, 'JOÃO', { size: 7.5, cor: '#8d6e00', extra: { dy: 'idAltarY' } }),
    ], { outline: true }),
    grupo('id_velas', [
      { id: 'idVelaL', fill: '#fff8e1', path: rect(18, 146, 9, 21) },
      { id: 'idVelaR', fill: '#fff8e1', path: rect(153, 146, 9, 21) },
      { id: 'idChamaL', fill: '#ffb300', path: chama(21.5, 146, 12), scaleBy: 'idVelaK', scalePivot: [22.5, 146] },
      { id: 'idChamaR', fill: '#ffb300', path: chama(156.5, 146, 12), scaleBy: 'idVelaK2', scalePivot: [157.5, 146] },
      { id: 'idChamaMioloL', fill: '#fff3b0', path: chama(22, 145, 6), scaleBy: 'idVelaK', scalePivot: [22.5, 146] },
      { id: 'idChamaMioloR', fill: '#fff3b0', path: chama(157, 145, 6), scaleBy: 'idVelaK2', scalePivot: [157.5, 146] },
    ], { outline: true }),
  ],
};

// ------------------------------------------------------------------ 2. Inspeção do Sargento
// Quepe de sargento e prancheta: marcha, confere a lista (água, café, postura, treino) com
// um ✓ por item e aponta para ela. Disciplina militar com cara de chefe.
const ITENS_INSPECAO = ['ÁGUA', 'CAFÉ', 'POSTURA', 'TREINO'];
const INSPECAO = {
  id: 'id_inspecao', nome: 'Inspeção do Sargento', traco: 'disciplina militar', dur: 8,
  ambiente: true, horario: ['manha'], eventos: ['bomDia'],
  fala: 'Inspeção matinal. Água, café, postura. Em posição, {nome}.',
  receita: { corpo: 'marcha', cabeca: 'encara', rosto: 'bravo', fx: ['sparkle'] },
  faixas: (L) => ({
    id_quepe: L.on(0.15, 7.85), id_prancheta: L.on(0.4, 7.6),
    ...Object.fromEntries(ITENS_INSPECAO.map((_, i) => [`id_ok${i}`, L.on(2.2 + i * 0.9, 7.6)])),
    // Marcha até 2 s, para, segura a prancheta na frente do peito e confere; no fim aponta.
    rootX: L.k([0, 0], [0.5, -6], [1, 6], [1.5, -6], [2, 0]),
    legFR: L.k([0, 6], [2, 6], [2.3, 30], [7.6, 30], [7.9, 6]),
    elbowR: L.k([0, 12], [2, 12], [2.3, 70], [7.6, 70], [7.9, 12]),
    legFL: L.k([0, 6], [6.3, 6], [6.6, 40], [7.5, 40], [7.9, 6]), elbowL: L.k([0, 12], [6.3, 12], [6.6, -20], [7.5, -20], [7.9, 12]),
    headRot: L.k([0, 0], [2.2, 0], [2.5, 6], [5.8, 6], [6.2, -3], [7.6, -3], [8, 0]),
    pupilY: L.k([0, 0], [2.4, 1.2], [5.8, 1.2], [6.2, 0]),
    browShow: L.on(0.2, 7.8), browAngry: L.k([0, 0], [0.3, 0.7], [7.6, 0.7], [7.9, 0]), moodAngry: L.k([0, 0], [0.5, 0.2], [7.5, 0.2], [8, 0]),
  }),
  pecas: [
    grupo('id_quepe', [
      { id: 'idQuepeCopa', fill: '#2e4a2a', path: 'M56,12 C58,-6 122,-6 124,12 L126,22 L54,22 Z', ...CABECA },
      { id: 'idQuepeFaixa', fill: '#1b2e19', path: rect(54, 16, 72, 7), ...CABECA },
      { id: 'idQuepeAba', fill: '#111111', path: 'M50,22 L130,22 C126,30 54,30 50,22 Z', ...CABECA },
      { id: 'idQuepeInsignia', fill: '#ffca28', path: estrela(90, 7, 6.5), ...CABECA },
    ], { outline: true }),
    grupo('id_prancheta', [
      { id: 'idPranchetaTabua', fill: '#a1683a', path: rect(138, 112, 38, 48), ...PROP },
      { id: 'idPranchetaPapel', fill: '#fbfbf7', path: rect(141, 117, 32, 40), ...PROP },
      { id: 'idPranchetaClipe', fill: '#9aa1ad', path: rect(150, 109, 14, 6), ...PROP },
      ...ITENS_INSPECAO.flatMap((nome, i) => [
        txt(`idItem${i}`, 159, 123 + i * 9, nome, { size: 5.2, cor: '#263238', extra: PROP }),
      ]),
    ], { outline: true }),
    ...ITENS_INSPECAO.map((_, i) => grupo(`id_ok${i}`, [txt(`idOk${i}`, 145.5, 122.4 + i * 9, '✓', { size: 8.5, cor: '#c62828', extra: PROP })])),
  ],
};

// ------------------------------------------------------------------ 3. Caderninho da Vingança
// Caderno preto "VINGANÇAS" na mão: olha de lado, anota, sorriso de canto, aura escura; fecha
// o caderno e dá dois tapinhas. Vingatividade cômica: ele não esquece nada.
const VINGANCA = {
  id: 'id_vinganca', nome: 'Caderninho da Vingança', traco: 'vingatividade cômica', dur: 7,
  provocacao: true,
  fala: 'Anotado. Página quarenta e sete. Eu não esqueço, {nome}.',
  receita: { bracos: 'escreve', cabeca: 'olhaLado', rosto: 'canto', semPiscar: true },
  faixas: (L) => ({
    id_caderno: L.on(0.3, 6.7), id_lapis: L.on(0.6, 4.9),
    ...Object.fromEntries([0, 1, 2].map((i) => [`id_linha${i}`, L.on(1.4 + i * 1.1, 5.05)])),
    idLapisX: L.alt(0, 14, 1.2, 4.6, 14), idLapisY: L.k([1.2, 0], [2.3, 0], [2.4, 7.5], [3.4, 7.5], [3.5, 15], [4.6, 15], [4.8, 0]),
    // Mão direita segura o caderno na frente do peito; a esquerda escreve (escreve).
    legFR: L.k([0, 6], [0.3, 6], [0.7, 30], [6.3, 30], [6.7, 6]), elbowR: L.k([0, 12], [0.3, 12], [0.7, 70], [6.3, 70], [6.7, 12]),
    pupilX: L.k([0, 0], [0.5, 1], [4.6, 1], [5, 0]), browShow: L.on(0.4, 6.6), browAngry: L.k([0, 0], [0.5, 0.5], [6.4, 0.5], [6.7, 0]),
    idCaderneta: L.k([0, 1], [5, 1], [5.3, 0.35], [6.7, 0.35]),
    rootY: L.k([0, 0], [5.6, 0], [5.75, -2], [5.9, 0], [6.05, -2], [6.2, 0]),
  }),
  pecas: [
    grupo('id_caderno', [
      { id: 'idCadernoCapa', fill: '#17171f', path: rect(118, 92, 60, 46), ...PROP },
      { id: 'idCadernoFolha', fill: '#f6f1e3', path: rect(122, 96, 52, 38), ...PROP, scaleBy: 'idCaderneta', scalePivot: [122, 115] },
      { id: 'idCadernoFita', fill: '#c62828', path: rect(168, 137, 3.5, 10), ...PROP },
      txt('idCadernoTitulo', 148, 102, 'VINGANÇAS', { size: 7, cor: '#c62828', extra: PROP }),
    ], { outline: true }),
    ...['Riu de mim', 'Chamou de peixe', 'Zombou do supino'].map((t, i) => grupo(`id_linha${i}`, [txt(`idLinha${i}`, 148, 111 + i * 7.5, `${i + 45}. ${t}`, { size: 4.6, cor: '#37474f', extra: PROP })])),
    grupo('id_lapis', [
      { id: 'idLapis', fill: '#fbc02d', path: 'M104,96 L110,90 L132,112 L126,118 Z', dx: 'idLapisX', dy: 'idLapisY' },
      { id: 'idLapisPonta', fill: '#3e2723', path: 'M126,118 L132,112 L135,121 Z', dx: 'idLapisX', dy: 'idLapisY' },
    ], { outline: true }),
  ],
};

// ------------------------------------------------------------------ 4. Obra-Prima do João
// Folhas do louro: [x, y, ângulo] do ramo esquerdo; o direito é o espelho.
const RAMO = [[50, 34, 1.9], [53, 25, 2.2], [58, 17, 2.5], [65, 11, 2.8], [73, 7, 3.0], [81, 5, 3.1]];
const LOUROS = [...RAMO, ...RAMO.map(([x, y, a]) => [180 - x, y, Math.PI - a])];
// Pedestal sobe debaixo dele, o corpo vira bronze dourado, coroa de louros na cabeça e a placa
// "OBRA-PRIMA DE JOÃO". Pose de duplo bíceps congelada; depois o ouro some e o pedestal desce.
const ESTATUA = {
  id: 'id_estatua', nome: 'Obra-Prima do João', traco: 'orgulho da criação', dur: 8,
  ambiente: true, eventos: ['nivel'],
  fala: 'Eu sou a prova viva de que o João é genial.',
  receita: { bracos: 'flexDuplo', cabeca: 'reto', rosto: 'orgulhoso', fx: ['holofote', 'sparkle'], semPiscar: true },
  faixas: (L) => ({
    id_pedestal: L.on(0.2, 7.8), idPedestalK: L.k([0.2, 0.1], [1.2, 1], [6.8, 1], [7.8, 0.1]),
    rootY: L.k([0, 0], [0.2, 0], [1.2, -22], [6.8, -22], [7.8, 0]),
    id_louros: L.on(1.4, 6.8), idOuro: L.k([0, 0], [1.25, 0], [1.4, 1], [6.6, 1], [6.75, 0]),
    idBrilhoK: L.alt(0.6, 1.25, 1.8, 6.4, 8, 0.6), id_brilho: L.on(1.8, 6.4),
  }),
  pecas: [
    grupo('id_pedestal', [
      { id: 'idPedestalBase', fill: '#8d8d8d', path: rect(38, 189, 104, 12), scaleBy: 'idPedestalK', scalePivot: [90, 201] },
      { id: 'idPedestalCorpo', fill: '#bdbdbd', path: rect(46, 167, 88, 23), scaleBy: 'idPedestalK', scalePivot: [90, 201] },
      { id: 'idPedestalTopo', fill: '#9e9e9e', path: rect(40, 163, 100, 6), scaleBy: 'idPedestalK', scalePivot: [90, 201] },
      { id: 'idPlacaEstatua', fill: '#e9b824', path: rect(56, 172, 68, 13), scaleBy: 'idPedestalK', scalePivot: [90, 201] },
      txt('idPlacaEstatuaTxt', 90, 178.5, 'OBRA-PRIMA DE JOÃO', { size: 5.6, cor: '#4e3b00', extra: { scaleBy: 'idPedestalK', scalePivot: [90, 201] } }),
    ], { outline: true }),
    grupo('id_louros', [
      // Dois ramos de louro contornando a testa, presos na cabeça.
      ...LOUROS.map(([x, y, a], i) => ({ id: `idLouro${i}`, fill: i % 2 ? '#7cb342' : '#558b2f', path: folha(x, y, a), ...CABECA })),
      { id: 'idLouroLaco', fill: '#c62828', path: `${elip(90, 6, 4, 3)}`, ...CABECA },
    ], { outline: true }),
    grupo('id_brilho', [
      { id: 'idBrilho', fill: '#fff8e1', path: [estrela(52, 38, 7), estrela(128, 104, 6), estrela(146, 30, 5)].join(' '), scaleBy: 'idBrilhoK', scalePivot: [90, 70] },
    ]),
  ],
};

export const RITUAIS = Object.freeze([ORACAO, INSPECAO, VINGANCA, ESTATUA].map((r) => Object.freeze(r)));
export const RITUAL_POR_ID = new Map(RITUAIS.map((r) => [r.id, r]));

/** Cor de bronze dourado (estátua) e luz dourada (oração). */
export const MOODS_RITUAIS = {
  idOuro: { max: 1, to: { body: '#d4a537', bodyShade: '#b8892a', muscle: '#8f6a1c', cream: '#f3dc8e', shorts: '#8f6a1c', stripe: '#f3dc8e' } },
};

/** Itens do catálogo (um por ritual). */
export function itensRituais() {
  return RITUAIS.map((r) => {
    const faixas = r.faixas(linha(r.dur));
    return {
      id: r.id, nome: r.nome, categoria: 'identidade', listas: {},
      gatilho: { ...(r.ambiente ? { ambiente: true } : {}), ...(r.horario ? { horario: r.horario } : {}), ...(r.eventos ? { eventos: r.eventos } : {}) },
      duracao: Math.round(r.dur * 1000), loop: false, entrada: 240, frequencia: 'rara', estatico: 0.5,
      receita: r.receita, faixas, fxLeve: (r.receita.fx || []).filter((f) => f === 'sparkle'),
      fala: 'identidade', ritual: true, ...(r.provocacao ? { provocacao: true } : {}),
    };
  });
}

/** Rig com as peças dos rituais (cópia). Sem os canais id_* ligados, nada aparece. */
export function rigComRituais(rig) {
  if (!rig || !Array.isArray(rig.groups) || rig.groups.some((g) => g.id === 'id_velas')) return rig;
  const fundo = RITUAIS.flatMap((r) => r.fundo || []);
  const frente = RITUAIS.flatMap((r) => r.pecas || []);
  return { ...rig, moods: { ...(rig.moods || {}), ...MOODS_RITUAIS }, groups: [...structuredClone(fundo), ...rig.groups, ...structuredClone(frente)] };
}

/** Fala própria do ritual (quando toca por um acontecimento, não no sorteio ambiente). */
export function falaDoRitual(id, nome = 'Emanuele') {
  const r = RITUAL_POR_ID.get(id);
  return r ? r.fala.replaceAll('{nome}', nome) : null;
}
