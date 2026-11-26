// Energéticos Monster na dieta do JoJo (pedido do João, 26/11/2026).
//
// Seis sabores entram no cardápio como bebidas (efeito de sede/energia em rpg/vida.js,
// risco de "coração acelerado" se exagerar). Arte própria em estilo recorte de papel:
// UMA geometria-mestre de lata (`LATA`) gera o ícone SVG do cardápio (assets/foods/<id>.svg,
// `node scripts/monster-assets.mjs`) e a lata na mão do JoJo (peças `mn_*` numa CÓPIA do rig).
//
// Easter egg (segredo, nada na interface entrega): o favorito do JoJo é o Monster BRANCO
// (Ultra). No cardápio ele aparece igual aos outros ("Aceita"); quando a Emanuele dá o
// branco, o JoJo surta de alegria: animação própria `cat_mn01` ("Êxtase do Monster Branco",
// 9 s: encara a lata, abre, vira tudo, olhos brancos brilhando, aura branca, garras gigantes
// rasgando o fundo e pose de fisiculturista) e recompensa pela infraestrutura que já existe:
// XP pela fila das necessidades e JOJOcoins pela carteira (`Loja.creditar`, ids `monster:*`).
// Descoberta (1ª vez): bônus grande; depois, um bônus por dia. Tudo idempotente.

import { linha, rect, estrela, txt, grupo } from './virais.js';

const r1 = (n) => Math.round(n * 100) / 100;
/** Elipse em curvas absolutas (a mesma transformação de pontos serve para tudo). */
const K = 0.5523;
/** Mesma elipse no sentido contrário: dentro de outra peça vira furo. */
const furo = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} C${r1(cx - rx)},${r1(cy + ry * K)} ${r1(cx - rx * K)},${r1(cy + ry)} ${r1(cx)},${r1(cy + ry)} C${r1(cx + rx * K)},${r1(cy + ry)} ${r1(cx + rx)},${r1(cy + ry * K)} ${r1(cx + rx)},${r1(cy)} C${r1(cx + rx)},${r1(cy - ry * K)} ${r1(cx + rx * K)},${r1(cy - ry)} ${r1(cx)},${r1(cy - ry)} C${r1(cx - rx * K)},${r1(cy - ry)} ${r1(cx - rx)},${r1(cy - ry * K)} ${r1(cx - rx)},${r1(cy)} Z`;
const elip = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} C${r1(cx - rx)},${r1(cy - ry * K)} ${r1(cx - rx * K)},${r1(cy - ry)} ${r1(cx)},${r1(cy - ry)} C${r1(cx + rx * K)},${r1(cy - ry)} ${r1(cx + rx)},${r1(cy - ry * K)} ${r1(cx + rx)},${r1(cy)} C${r1(cx + rx)},${r1(cy + ry * K)} ${r1(cx + rx * K)},${r1(cy + ry)} ${r1(cx)},${r1(cy + ry)} C${r1(cx - rx * K)},${r1(cy + ry)} ${r1(cx - rx)},${r1(cy + ry * K)} ${r1(cx - rx)},${r1(cy)} Z`;
const CABECA = { pivot: [90, 86], rot: 'headRot' };
const MAO = { parent: 'foreR' };

// ------------------------------------------------------------------ sabores

/**
 * cores: corpo (lata), sombra (lado escuro), luz (reflexo), garra (logo), garraLuz (fio claro
 * dentro da garra), aro (alumínio), faixa (rótulo de baixo), texto.
 * estampa: detalhe próprio do sabor (desenhado entre a lata e a garra).
 */
export const SABORES = Object.freeze([
  { id: 'monsterOriginal', nome: 'Monster Energy (verde)', rotulo: 'ENERGY', estampa: 'riscos',
    cores: { corpo: '#17191c', sombra: '#0b0c0e', luz: '#3a3f46', garra: '#7ed321', garraLuz: '#c8f58a', aro: '#c9ced6', faixa: '#7ed321', texto: '#0b0c0e' },
    hunger: 2, mood: 7, health: -2, xp: 1, frase: 'Monster verde. Clássico de quem não dorme e ainda acha que é estilo de vida.' },
  { id: 'monsterUltra', nome: 'Monster Ultra (branco)', rotulo: 'ULTRA', estampa: 'prata',
    cores: { corpo: '#f7f8fa', sombra: '#d5dae1', luz: '#ffffff', garra: '#aab3bf', garraLuz: '#e9edf2', aro: '#c9ced6', faixa: '#c3cad4', texto: '#4e5864' },
    hunger: 2, mood: 7, health: -1, xp: 1, frase: 'Monster Ultra. Zero açúcar. Branco igual a minha paciência quando você some.' },
  { id: 'monsterMangoLoco', nome: 'Monster Mango Loco', rotulo: 'MANGO LOCO', estampa: 'caveira', estampaCor: '#ffe3ef',
    cores: { corpo: '#2bb5c8', sombra: '#1a8a9b', luz: '#7fdbe6', garra: '#ff8a1f', garraLuz: '#ffd36b', aro: '#c9ced6', faixa: '#ff4f8b', texto: '#ffffff', marca: '#ffffff' },
    hunger: 3, mood: 8, health: -2, xp: 1, frase: 'Mango Loco. Manga com cafeína e uma caveira mexicana. Isso é cultura.' },
  { id: 'monsterPipelinePunch', nome: 'Monster Pipeline Punch', rotulo: 'PIPELINE', estampa: 'onda',
    cores: { corpo: '#f06aa8', sombra: '#c84a86', luz: '#ffa6cf', garra: '#fff1f7', garraLuz: '#ffffff', aro: '#c9ced6', faixa: '#ffcf3f', texto: '#7a1f4c' },
    hunger: 3, mood: 8, health: -2, xp: 1, frase: 'Pipeline Punch. Maracujá, laranja e goiaba. Tubarão surfista aprovado.' },
  { id: 'monsterKhaotic', nome: 'Monster Juice Khaotic', rotulo: 'KHAOTIC', estampa: 'respingo',
    cores: { corpo: '#ff8a1e', sombra: '#d8650a', luz: '#ffbb6e', garra: '#2b1a0e', garraLuz: '#6a4428', aro: '#c9ced6', faixa: '#ffe14d', texto: '#2b1a0e' },
    hunger: 3, mood: 7, health: -2, xp: 1, frase: 'Khaotic. Laranja e caos. Combina comigo antes do treino.' },
  { id: 'monsterUltraViolet', nome: 'Monster Ultra Violet', rotulo: 'ULTRA', estampa: 'prata',
    cores: { corpo: '#7a3fc4', sombra: '#5a2a99', luz: '#a982e3', garra: '#e9ddff', garraLuz: '#ffffff', aro: '#c9ced6', faixa: '#c3a6ff', texto: '#3d1670' },
    hunger: 2, mood: 6, health: -1, xp: 1, frase: 'Ultra Violet. Roxo, zero açúcar. Bonito. Não é o meu, mas bebo.' },
]);
export const SABOR_POR_ID = new Map(SABORES.map((s) => [s.id, s]));
export const IDS_MONSTER = Object.freeze(SABORES.map((s) => s.id));
export const ehMonster = (id) => SABOR_POR_ID.has(id);
/** O favorito secreto do JoJo. Só o código sabe; a interface trata igual aos outros. */
export const FAVORITO = 'monsterUltra';

// ------------------------------------------------------------------ geometria-mestre da lata

// Lata em pé centrada em (0, 0), 24 de largura por 46 de altura (unidades do ícone 64×64).
const W = 12; // meia largura
/** Garra (um risco serrilhado que afina nas pontas), de (x, y0) a (x + inc, y1). */
function risco(x, y0, y1, w, inc = 0, dentes = 5) {
  const esq = [], dir = [];
  for (let i = 0; i <= dentes; i++) {
    const t = i / dentes, y = y0 + (y1 - y0) * t, cx = x + inc * t;
    // Largura em barriga (fina nas pontas) com dentes alternados dos dois lados.
    const larg = w * Math.sin(Math.PI * Math.min(1, Math.max(0.08, t))) + 0.2;
    const serra = i % 2 ? 0.55 : -0.25;
    esq.push([cx - larg / 2 - serra, y]);
    dir.push([cx + larg / 2 + (i % 2 ? -0.25 : 0.55), y + (i > 0 && i < dentes ? 0.8 : 0)]);
  }
  const pts = [[x, y0 - 1.6], ...dir, [x + inc, y1 + 1.8], ...esq.reverse()];
  return `M${pts.map(([a, b]) => `${r1(a)},${r1(b)}`).join(' L')} Z`;
}
/** Fio claro no meio de cada risco (dá o brilho de tinta metálica). */
function fio(x, y0, y1, inc = 0) {
  const a = [x - 0.35, y0 + 2], b = [x + inc * 0.85 + 0.35, y1 - 2.5];
  return `M${r1(a[0])},${r1(a[1])} L${r1(a[0] + 0.7)},${r1(a[1])} L${r1(b[0])},${r1(b[1])} L${r1(b[0] - 0.7)},${r1(b[1])} Z`;
}
// O "M" de três garras: esquerda e direita mais altas, a do meio começa mais baixo.
const GARRAS = [[-6.2, -15, 5.4, 3.4, 0.9], [0, -12, 7.4, 3.6, 0], [6.2, -15, 5.4, 3.4, -0.9]];

export const LATA = Object.freeze({
  corpo: 'M-12,-16.5 C-12,-18.6 -10.4,-20.2 -8.6,-20.8 L8.6,-20.8 C10.4,-20.2 12,-18.6 12,-16.5 L12,19.2 C12,21.2 10.4,22.2 8.8,22.2 L-8.8,22.2 C-10.4,22.2 -12,21.2 -12,19.2 Z',
  sombra: 'M7.4,-20.4 C10,-19.6 12,-18.2 12,-16.5 L12,19.2 C12,21.2 10.4,22.2 8.8,22.2 L7.4,22.2 Z',
  luz: 'M-9.6,-17.6 L-7,-18.6 L-7,19.6 L-9.6,19.6 Z',
  luzFina: 'M-5.4,-18.8 L-4.6,-18.8 L-4.6,19.8 L-5.4,19.8 Z',
  tampa: elip(0, -20.8, 9.2, 2.3),
  tampaFundo: elip(0, -20.6, 7.4, 1.5),
  anel: `M-2.2,-21.4 C-2.4,-22.9 3.4,-22.9 3.2,-21.4 C3.1,-20.4 -2.1,-20.4 -2.2,-21.4 Z ${furo(0.5, -21.5, 1.4, 0.45)}`,
  fundoAro: 'M-11.4,18.6 L11.4,18.6 C11.4,21.2 10,22.6 8.4,22.6 L-8.4,22.6 C-10,22.6 -11.4,21.2 -11.4,18.6 Z',
  faixa: rect(-12, 10.2, 24, 3.6),
  garra: GARRAS.map(([x, y0, y1, w, inc]) => risco(x, y0, y1, w, inc)).join(' '),
  garraLuz: GARRAS.map(([x, y0, y1, , inc]) => fio(x, y0, y1, inc)).join(' '),
  // Estampas dos sabores (atrás da garra).
  riscos: [rect(-11.2, -6, 22.4, 0.7), rect(-11.2, 3, 22.4, 0.7)].join(' '),
  prata: 'M-12,-17 L12,-17 L12,-15.6 L-12,-15.6 Z',
  // Caveira mexicana (calavera) atrás da garra: crânio, olhos e nariz vazados, dentes.
  caveira: `M-8,-4 C-8,-11 -4.4,-14 0,-14 C4.4,-14 8,-11 8,-4 C8,-0.6 6.4,1.6 4.6,2.4 L4.6,5.4 L-4.6,5.4 L-4.6,2.4 C-6.4,1.6 -8,-0.6 -8,-4 Z ${furo(-3.4, -4.4, 2.4, 2.6)} ${furo(3.4, -4.4, 2.4, 2.6)} M0,-1.6 L0.9,0.6 L-0.9,0.6 Z M-2.8,3 L-2,3 L-2,5 L-2.8,5 Z M-0.4,3 L0.4,3 L0.4,5 L-0.4,5 Z M2,3 L2.8,3 L2.8,5 L2,5 Z`,
  onda: 'M-12,5.6 C-8,2.6 -4,8.6 0,5.6 C4,2.6 8,8.6 12,5.6 L12,8 C8,11 4,5 0,8 C-4,11 -8,5 -12,8 Z',
  respingo: `${elip(-8, -8, 1.6, 1.6)} ${elip(8.6, 2, 1.3, 1.3)} ${elip(-8.4, 6, 1, 1)} ${elip(7.8, -12, 1.1, 1.1)}`,
});
// Ordem de pintura (de trás para frente) e qual cor de `cores` cada camada usa.
const CAMADAS = [
  ['corpo', 'corpo'], ['estampa', 'faixa'], ['sombra', 'sombra'], ['luz', 'luz'], ['luzFina', 'luz'],
  ['faixa', 'faixa'], ['garra', 'garra'], ['garraLuz', 'garraLuz'], ['fundoAro', 'aro'], ['tampa', 'aro'], ['tampaFundo', 'sombraAro'], ['anel', 'anel'],
];
const corDa = (s, chave) => ({ sombraAro: '#9aa3ae', anel: '#e6e9ee' }[chave] || s.cores[chave]);
const corEstampa = (s) => s.estampaCor || s.cores.faixa;
const pathDa = (s, camada) => (camada === 'estampa' ? LATA[s.estampa] : LATA[camada]);
/** Reposiciona/escala um path absoluto (M/L/C/Z, pares x,y) da geometria-mestre. */
export const transformar = (path, k, dx, dy, ky = k) => String(path).replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${r1(Number(x) * k + dx)},${r1(Number(y) * ky + dy)}`);
/** Proporção da lata alta (473 ml): a geometria-mestre é desenhada larga e esticada na vertical. */
export const ALTURA = 1.16;
/** Ícone do cardápio (SVG 64×64, mesmo traço das outras bebidas). */
export function svgLata(id) {
  const s = SABOR_POR_ID.get(id);
  if (!s) throw new Error(`Sabor desconhecido: ${id}`);
  const k = 1.1, ky = k * ALTURA, dx = 32, dy = 32.6;
  const pecas = CAMADAS.map(([camada, cor]) => {
    const d = transformar(pathDa(s, camada), k, dx, dy, ky);
    const semTraco = ['luz', 'luzFina', 'garraLuz', 'estampa', 'tampaFundo', 'sombra'].includes(camada);
    const traco = semTraco ? ' stroke="none"' : camada === 'garra' ? ' stroke-width="0.7"' : camada === 'anel' ? ' stroke-width="0.5"' : '';
    const recorte = ['estampa', 'luz', 'luzFina', 'faixa'].includes(camada) ? ' clip-path="url(#lata)"' : '';
    return `<path d="${d}" fill="${camada === 'estampa' ? corEstampa(s) : corDa(s, cor)}"${traco}${recorte}${camada === 'luz' || camada === 'luzFina' ? ' opacity="0.8"' : ''}/>`;
  });
  const y = (v) => r1(dy + v * ky);
  const fonte = 'font-family="Arial Black, Arial, sans-serif" font-weight="900" text-anchor="middle" stroke="none"';
  const rotulo = `<text x="32" y="${y(13)}" ${fonte} font-size="${s.rotulo.length > 7 ? 2.5 : 3}" letter-spacing="0.15" fill="${s.cores.texto}">${s.rotulo}</text>`;
  const marca = `<text x="32" y="${y(17.6)}" ${fonte} font-size="2.6" letter-spacing="0.35" fill="${s.cores.marca || s.cores.garra}">MONSTER</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${s.nome}"><defs><clipPath id="lata"><path d="${transformar(LATA.corpo, k, dx, dy, ky)}"/></clipPath></defs><g stroke="#263c4c" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">${pecas.join('')}${rotulo}${marca}</g></svg>\n`;
}


// ------------------------------------------------------------------ lata na mão e o easter egg

const BRANCO = SABOR_POR_ID.get(FAVORITO);
// Lata na mão direita (presa ao antebraço): a mesma geometria-mestre, menor, com o punho por cima.
// Centro da pegada: a ponta do antebraço (as garras da mão fecham por cima). O pulso gira a lata
// pelo canal mnLataRot para ela ficar em pé, inclinada para beber etc. (independente do braço).
const MAO_C = [149, 156], MAO_K = 0.62;
const PULSO = { ...MAO, pivot: MAO_C, rot: 'mnLataRot' };
const naMao = (path) => transformar(path, MAO_K, MAO_C[0], MAO_C[1], MAO_K * ALTURA);
/** Peças da lata (sem os textos, que somem nesse tamanho: simplificação óptica). */
function pecasLata(s, prefixo, extra = {}) {
  const contorno = [], arte = [];
  for (const [camada, cor] of CAMADAS) {
    const p = { id: `${prefixo}_${camada}`, fill: camada === 'estampa' ? corEstampa(s) : corDa(s, cor), path: naMao(pathDa(s, camada)), ...PULSO, ...extra };
    if (['luz', 'luzFina'].includes(camada)) p.alpha = 0.8;
    (['corpo', 'tampa', 'fundoAro'].includes(camada) ? contorno : arte).push(p);
  }
  return { contorno, arte };
}
const LATA_BRANCA = pecasLata(BRANCO, 'mnLata');
// Garras gigantes rasgando o fundo (a mesma garra do logo, 5× maior) e aura branca.
const GARRA_FUNDO = (path) => transformar(path, 10, 90, 100, 6.4);
// O rasgo na frente: as mesmas garras cortando a cena de cima a baixo (rápido, depois somem).
const GARRA_FRENTE = (path) => transformar(path, 8, 90, 96, 7.2);
const raio = (x, y, k = 1) => `M${r1(x)},${r1(y)} L${r1(x - 10 * k)},${r1(y + 22 * k)} L${r1(x - 2 * k)},${r1(y + 22 * k)} L${r1(x - 8 * k)},${r1(y + 44 * k)} L${r1(x + 10 * k)},${r1(y + 16 * k)} L${r1(x + 2 * k)},${r1(y + 16 * k)} L${r1(x + 8 * k)},${r1(y)} Z`;
const OLHOS = [[79, 38], [101, 38]];

const PECAS_FUNDO = [
  grupo('mn_aura', [
    { id: 'mnAuraFora', fill: '#e3f4ff', alpha: 0.35, path: 'M14,167 C-12,116 4,32 48,4 C70,-10 110,-10 132,4 C176,32 192,116 166,167 Z', scaleBy: 'mnAuraK', scalePivot: [90, 167] },
    { id: 'mnAuraDentro', fill: '#ffffff', alpha: 0.55, path: 'M30,167 C10,122 22,50 58,22 C76,8 104,8 122,22 C158,50 170,122 150,167 Z', scaleBy: 'mnAuraK2', scalePivot: [90, 167] },
  ]),
  grupo('mn_garras', [
    { id: 'mnGarras', fill: '#ffffff', path: GARRA_FUNDO(LATA.garra), scaleYBy: 'mnRasgo', squashPivot: [90, 4] },
    { id: 'mnGarrasLuz', fill: '#c9d4df', path: GARRA_FUNDO(LATA.garraLuz), scaleYBy: 'mnRasgo', squashPivot: [90, 4] },
  ], { outline: true }),
];
const PECAS_FRENTE = [
  grupo('mn_lata', LATA_BRANCA.contorno, { outline: true }),
  grupo('mn_lataArte', LATA_BRANCA.arte, { showIf: 'mn_lata' }),
  // Abriu: "PSSHH!" e o gás saindo da boca da lata.
  grupo('mn_pss', [
    { id: 'mnGas', fill: '#ffffff', alpha: 0.85, path: [elip(149, 136, 4, 3), elip(144, 130, 3, 2.4), elip(154, 128, 2.6, 2), elip(148, 122, 2, 1.6)].join(' '), ...PULSO, scaleBy: 'mnGasK', scalePivot: [149, 139] },
    ...txt('mnPss', 174, 50, 'PSSHH!', { size: 8, cor: '#5b6672' }),
  ]),
  grupo('mn_rasgo', [
    { id: 'mnRasgoFrente', fill: '#ffffff', alpha: 0.92, path: GARRA_FRENTE(LATA.garra), scaleYBy: 'mnRasgoK', squashPivot: [90, -12] },
    { id: 'mnRasgoLuz', fill: '#b3e5fc', path: GARRA_FRENTE(LATA.garraLuz), scaleYBy: 'mnRasgoK', squashPivot: [90, -12] },
  ], { outline: true }),
  // Olhos brancos brilhando (por cima do rosto, presos à cabeça).
  grupo('mn_olhos', [
    { id: 'mnOlhoHalo', fill: '#d8f1ff', alpha: 0.6, path: OLHOS.map(([x, y]) => elip(x, y, 14, 15)).join(' '), ...CABECA, scaleBy: 'mnOlhoK', scalePivot: [90, 38] },
    { id: 'mnOlho', fill: '#ffffff', path: OLHOS.map(([x, y]) => elip(x, y, 10.4, 11.4)).join(' '), ...CABECA },
    { id: 'mnOlhoBrilho', fill: '#bfe6ff', path: OLHOS.map(([x, y]) => estrela(x + 3, y - 4, 4)).join(' '), ...CABECA, scaleBy: 'mnOlhoK', scalePivot: [90, 34] },
  ]),
  grupo('mn_raios', [
    { id: 'mnRaios', fill: '#ffffff', path: [raio(20, 40, 0.7), raio(168, 30, 0.8), raio(8, 104, 0.55), raio(176, 98, 0.6)].join(' ') },
    { id: 'mnRaiosLuz', fill: '#b3e5fc', path: [raio(20, 40, 0.42), raio(168, 30, 0.5)].join(' '), dy: 'mnRaioY' },
  ], { outline: true }),
  grupo('mn_txt', txt('mnTxt', 90, -14, 'É O BRANCO!!!', { size: 10, cor: '#263c4c', fundo: '#ffffff', extra: { scaleBy: 'mnTxtK', scalePivot: [90, -14] } })),
  grupo('mn_coracao', [{ id: 'mnCoracao', fill: '#ff5d8f', path: 'M134,4 C130,-2 122,0 122,6 C122,12 130,16 134,20 C138,16 146,12 146,6 C146,0 138,-2 134,4 Z', scaleBy: 'mnCoracaoK', scalePivot: [134, 20] }], { outline: true }),
];

// Poses do braço direito [ombro legFR, cotovelo elbowR, pulso mnLataRot]. A lata gira junto com o
// antebraço (-(ombro + cotovelo)) e o pulso compensa: inclinação na tela = pulso - ombro - cotovelo.
const pulso = (l, e, inclinacao) => [l, e, inclinacao + l + e];
const POSE = { repouso: pulso(6, 12, 0), olhar: pulso(76, 142, -12), beber: pulso(170, 134, -100), alto: pulso(144, 2, 8) };

/** Êxtase do Monster Branco: 9 s. */
export const ANIM_FAVORITO = Object.freeze({
  id: 'mn01', nome: 'Êxtase do Monster Branco', dur: 9, fx: ['brilho', 'estrelas'],
  receita: { rosto: 'sorrisao' },
  faixas: (L) => {
    const [ol, oc, op] = POSE.olhar, [bl, bc, bp] = POSE.beber, [al, ac, ap] = POSE.alto, [rl, rc, rp] = POSE.repouso;
    return {
      mn_lata: L.on(0.05, 8.45),
      legFR: L.k([0, rl], [0.5, ol], [2.3, ol], [2.8, bl], [4.5, bl], [4.9, ol], [5.2, ol], [5.6, al], [8.1, al], [8.7, rl]),
      elbowR: L.k([0, rc], [0.5, oc], [2.3, oc], [2.8, bc], [4.5, bc], [4.9, oc], [5.2, oc], [5.6, ac], [8.1, ac], [8.7, rc]),
      mnLataRot: L.k([0, rp], [0.5, op], [2.3, op], [2.8, bp], [4.5, bp], [4.9, op], [5.2, op], [5.6, ap], [8.1, ap], [8.7, rp]),
      // Encara a lata sem piscar, olhos crescendo.
      eyeScale: L.k([0, 1], [0.5, 1], [0.9, 1.35], [1.6, 1.35], [2, 1]),
      pupilX: L.k([0, 0], [0.5, 0.7], [2.2, 0.7], [2.5, 0]),
      pupilY: L.k([0, 0], [0.5, 0.6], [2.2, 0.6], [2.5, 0]),
      browShow: L.on(0.5, 2.2),
      // Abre a lata.
      mn_pss: L.on(1.7, 2.5), mnGasK: L.k([0, 0.3], [1.7, 0.3], [2.1, 1.2], [2.5, 0.6]),
      rootY: L.k([0, 0], [1.7, 0], [1.8, -3], [1.95, 0], [5, 0], [5.2, 4], [5.5, -6], [5.8, 0]),
      // Vira tudo de uma vez: cabeça para trás, boca aberta, goles.
      headRot: L.k([0, 0], [2.6, 0], [2.9, -14], [4.4, -14], [4.8, 0]),
      jaw: L.k([0, 0.5], [2.6, 0.5], [2.9, 0.85], [4.4, 0.85], [4.7, 0.3], [5.1, 0.3], [5.4, 1], [8, 1], [8.6, 0.5]),
      squashY: L.alt(1, 1.04, 2.9, 4.4, 8, { rest: 1 }),
      eyeOpen: L.k([0, 1], [2.8, 1], [3, 0.15], [4.4, 0.15], [4.6, 1]),
      // Poder do branco: aura, olhos brilhando, garras rasgando o fundo, raios e pose.
      mn_aura: L.on(4.9, 8.6), mnAuraK: L.k([0, 0.2], [4.9, 0.2], [5.4, 1.1], [5.7, 1], [8.2, 1.04], [8.6, 0.4]), mnAuraK2: L.alt(0.92, 1.06, 5.4, 8.2, 10, { rest: 1 }),
      mn_olhos: L.on(4.8, 8.4), mnOlhoK: L.alt(0.9, 1.18, 4.8, 8.3, 14, { rest: 1 }),
      mn_rasgo: L.on(5.1, 5.75), mnRasgoK: L.k([0, 0.2], [5.1, 0.2], [5.35, 1.05], [5.75, 1]),
      mn_garras: L.on(5.6, 8.5), mnRasgo: L.k([0, 0.6], [5.6, 0.6], [5.8, 1.04], [5.95, 1], [8.5, 1]),
      mn_raios: L.alt(0, 1, 5.4, 8.1, 12, { step: true }), mnRaioY: L.alt(0, 3, 5.4, 8.1, 12),
      rootX: L.treme(5, 5.9, 2.2, 0.06),
      // Bíceps esquerdo explodindo enquanto o branco vai para o alto.
      legFL: L.k([0, 6], [5.4, 6], [5.8, 92], [8.1, 92], [8.7, 6]),
      elbowL: L.k([0, 12], [5.4, 12], [5.8, 125], [8.1, 125], [8.7, 12]),
      mn_txt: L.on(5.6, 8.3), mnTxtK: L.k([0, 0.2], [5.6, 0.2], [5.85, 1.25], [6, 1], [7.9, 1], [8.3, 0.6]),
      // Fim: beijinho na lata (coração).
      mn_coracao: L.on(7.6, 8.6), mnCoracaoK: L.k([0, 0.2], [7.6, 0.2], [7.9, 1.2], [8.1, 1], [8.6, 0.4]),
      moodJoy: L.k([0, 0], [0.9, 0.6], [2.2, 0.6], [2.6, 0], [5, 0], [5.4, 1], [8.4, 1], [8.9, 0]),
    };
  },
});

/** Item do catálogo (`cat_mn01`). Sem gatilho próprio: só a recompensa do favorito toca. */
export function itensMonster() {
  const a = ANIM_FAVORITO, Lx = linha(a.dur);
  const faixas = a.faixas(Lx);
  return [{ id: a.id, nome: `Monster: ${a.nome}`, categoria: 'monster', listas: {}, gatilho: { monster: ['favorito'] }, duracao: Math.round(a.dur * 1000), loop: false, entrada: 200, frequencia: 'raro', estatico: 0.62,
    receita: { ...a.receita, fx: a.fx }, faixas, fxLeve: ['brilho'], monster: true }];
}
export const ANIM_FAVORITO_ID = ANIM_FAVORITO.id;

/** Rig com a lata, a aura e as garras do Monster (cópia; sem os canais mn_* nada aparece). */
export function rigComMonster(rig) {
  if (!rig || !Array.isArray(rig.groups) || rig.groups.some((g) => g.id === 'mn_lata')) return rig;
  const limpa = (gs) => structuredClone(gs).map((g) => ({ ...g, parts: g.parts.map((p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined))) }));
  const groups = [...limpa(PECAS_FUNDO), ...rig.groups];
  // A lata fica atrás das garras da mão (que fecham por cima); o resto vai por cima de tudo.
  const [lata, arte, ...resto] = limpa(PECAS_FRENTE);
  const dedos = groups.findIndex((g) => g.id === 'armDetail');
  groups.splice(dedos >= 0 ? dedos : groups.length, 0, lata, arte);
  return { ...rig, groups: [...groups, ...resto] };
}

// ------------------------------------------------------------------ recompensa do segredo

/** JOJOcoins e XP do favorito. Descoberta vale uma vez; depois, um bônus por dia. */
export const RECOMPENSA = Object.freeze({ descoberta: { moedas: 150, xp: 40 }, diaria: { moedas: 25, xp: 8 } });

export const FALAS_FAVORITO = Object.freeze({
  descoberta: [
    'ESPERA. É O BRANCO. Manu... como você sabia? Ninguém sabia. Nem o João sabia. Ok, o João sabia. Toma uns JOJOcoins, você merece.',
  ],
  repeticao: [
    'O BRANCO DE NOVO. Você me entende melhor que meu nutricionista.',
    'Monster branco. Meu sangue agora é zero açúcar e cento e sessenta miligramas de felicidade.',
    'Isso aqui não é energético, Manu. É água benta de academia.',
    'O branco. Sempre o branco. O resto é refrigerante com complexo de inferioridade.',
    'Branco gelado na mão, bíceps no talo. O universo está em ordem.',
  ],
});

/**
 * Registra que ela deu o favorito e diz o que entregar. Puro: recebe o estado `seg`
 * (persistido nas necessidades) e devolve { seg, descoberta, recompensas: [{ id, moedas, xp }], fala }.
 */
export function registrarFavorito(seg = {}, { dia, agora = Date.now(), rng = Math.random } = {}) {
  const atual = { n: 0, primeiro: null, ultimoDia: null, ...(seg || {}) };
  const descoberta = !atual.primeiro;
  const recompensas = [];
  if (descoberta) recompensas.push({ id: 'monster:favorito:descoberta', ...RECOMPENSA.descoberta, rotulo: 'Segredo: o favorito do JoJo' });
  else if (atual.ultimoDia !== dia) recompensas.push({ id: `monster:favorito:${dia}`, ...RECOMPENSA.diaria, rotulo: 'O favorito do JoJo' });
  const lista = descoberta ? FALAS_FAVORITO.descoberta : FALAS_FAVORITO.repeticao;
  const fala = lista[Math.floor(rng() * lista.length) % lista.length];
  return { seg: { n: atual.n + 1, primeiro: atual.primeiro || agora, ultimoDia: dia }, descoberta, recompensas, fala };
}
