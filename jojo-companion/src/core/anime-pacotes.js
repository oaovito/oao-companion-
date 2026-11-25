// Pacotes visuais temáticos de anime (25/11/2026). Cada anime vira um PACOTE: paleta,
// roupa do kit, acessórios próprios, efeitos, estilo de movimento, jeito de revelar as
// JOJOcoins e balões temáticos. O comportamento (o que o JoJo está fazendo: aviso, contagem,
// sessão, recompensa…) é separado da caracterização: as 12 animações de contexto existem por
// ESTILO (13 estilos × 12 contextos), e o pacote só escolhe o estilo e veste o JoJo. Trocar
// de pacote não toca em personalidade, memória, progresso, necessidades ou estado interno.
//
// Fontes de pacote, nesta ordem:
// 1. 'curado': feito à mão para o anime (Black Clover, One Piece, Naruto, Boruto, Jujutsu
//    Kaisen, Bleach, Demon Slayer, Dragon Ball, Solo Leveling, Haikyuu!!, Frieren, Attack on
//    Titan, Chainsaw Man, JoJo's Bizarre Adventure, My Hero Academia, One Punch Man…).
// 2. 'visual': o anime já tem um visual no jogo (100 extras an001–an100 e 36 títulos de nível
//    de anime): o pacote usa a FANTASIA INTEIRA desse visual (a mesma do show dele), sem
//    exigir que ela tenha liberado o nível. Não compra, não desbloqueia, não muda o inventário.
// 3. 'composto': anime novo para o jogo: o compositor local monta o pacote pelas
//    características públicas e sem spoiler da fonte (tags como Ninja, Piratas, Vôlei, Magia,
//    Mecha; gêneros; cor da capa). Só conta como COMPLETO se alguma característica reconhecível
//    do anime virou acessório; só gênero e cor é composição provisória (pendência registrada).
// Nenhum gerador de imagens externo: tudo é vetor do próprio projeto, montado na hora.
import { ACESSORIOS, EFEITOS, KIT, canalKit, canalAcessorio, canalEfeito, paletaAnime, CANAL_LIGADO } from './anime-arte.js';
import { normAnime } from './anime-linguagem.js';

export const VERSAO_PACOTES = 1;

/** Os 12 contextos (comportamentos) que todo pacote completo tem. */
export const CONTEXTOS = Object.freeze([
  { id: 'avisoDia', nome: 'Aviso de lançamento no dia', dur: 5600 },
  { id: 'avisoProximo', nome: 'Aviso de lançamento próximo', dur: 4600 },
  { id: 'contagem', nome: 'Contagem regressiva', dur: 4400 },
  { id: 'disponivel', nome: 'Episódio disponível', dur: 5600 },
  { id: 'adiamento', nome: 'Aviso de adiamento', dur: 5200 },
  { id: 'novaTemporada', nome: 'Anúncio de nova temporada', dur: 6400 },
  { id: 'lembrete', nome: 'Lembrete de episódio não assistido', dur: 4800 },
  { id: 'encerramento', nome: 'Encerramento de temporada', dur: 6600 },
  { id: 'inicioSessao', nome: 'Início de sessão de anime', dur: 4800 },
  { id: 'conclusao', nome: 'Conclusão de episódio', dur: 4400 },
  { id: 'moedas', nome: 'Recebimento de JOJOcoins', dur: 4800 },
  { id: 'conquista', nome: 'Comemoração de conquista especial', dur: 7200 },
]);
export const CONTEXTO_IDS = Object.freeze(CONTEXTOS.map((c) => c.id));

/** Estilos de movimento: o "jeito" de cada universo (assinatura + efeito principal). */
export const ESTILOS = Object.freeze({
  magia: { nome: 'Magia de grimório', fx: 'aura', moeda: 'grimorio' },
  pirata: { nome: 'Pirata elástico', fx: 'ondas', moeda: 'bau' },
  ninja: { nome: 'Ninja', fx: 'fumaca', moeda: 'ninja' },
  amaldicoado: { nome: 'Energia amaldiçoada', fx: 'aura', moeda: 'energia' },
  espada: { nome: 'Espadachim', fx: 'agua', moeda: 'espada' },
  energia: { nome: 'Carga de energia', fx: 'aura', moeda: 'energia' },
  sombrio: { nome: 'Sombras', fx: 'sombras', moeda: 'painel' },
  esporte: { nome: 'Esporte', fx: 'impacto', moeda: 'cortada' },
  contemplativo: { nome: 'Magia contemplativa', fx: 'circuloMagico', moeda: 'magia' },
  manobra: { nome: 'Manobra aérea', fx: 'fumaca', moeda: 'espada' },
  motosserra: { nome: 'Motosserra', fx: 'raios', moeda: 'motosserra' },
  dramatico: { nome: 'Pose dramática', fx: 'dramatico', moeda: 'pose' },
  heroi: { nome: 'Herói', fx: 'raios', moeda: 'energia' },
});
export const ESTILO_IDS = Object.freeze(Object.keys(ESTILOS));

const k = (pts) => pts.map(([t, v, s]) => (s ? [t, v, s] : [t, v]));
const liga = (t0, t1) => [[0, 0], [t0, 1, 'step'], [t1, 0, 'step'], [1, 0]];
function batidas(t0, t1, n, v1, v2, repouso = 0) {
  const out = [[0, repouso], [t0, repouso]];
  for (let i = 0; i < n; i++) out.push([t0 + ((t1 - t0) * (i + 0.5)) / n, i % 2 ? v2 : v1]);
  out.push([t1, repouso], [1, repouso]);
  return out;
}
const segura = (v, r, a = 0.12, b = 0.88) => [[0, r], [a, v], [b, v], [1, r]];
const ARM = { leg: 6, elbow: 12 };

/**
 * Junta duas faixas do mesmo canal em sequência: a primeira até `corte` (volta ao repouso
 * ali) e a segunda depois. Canais só de uma das duas ficam como estão.
 */
function mesclar(a, b, corte) {
  const out = { ...a, ...b };
  for (const ch of Object.keys(a)) {
    if (!b[ch]) continue;
    const repouso = a[ch][a[ch].length - 1][1];
    out[ch] = [...a[ch].filter((p) => p[0] < corte), [corte, repouso], ...b[ch].filter((p) => p[0] > corte)];
  }
  return out;
}

// ------------------------------------------------------------------ assinatura de cada estilo

/**
 * Movimento-assinatura do estilo dentro de [t0, t1] (o "golpe" daquele universo), em faixas.
 * Os braços usam legFL/legFR (ombro) e elbowL/elbowR; o objeto da mão gira por akObjRot.
 */
const ASSINATURA = {
  // Ergue o grimório/espada e a aura cresce.
  magia: (t0, t1) => ({ legFR: segura(120, ARM.leg, t0, t1), elbowR: segura(40, ARM.elbow, t0, t1), akObjRot: k([[0, 0], [t0, -20], [t1, -20], [1, 0]]), akAuraK: k([[0, 1], [t0, 0.8], [(t0 + t1) / 2, 1.12], [t1, 1], [1, 1]]), browAngry: segura(1, 0, t0, t1) }),
  // Soco elástico: recua, estica o braço para a frente e volta.
  pirata: (t0, t1) => ({ legFR: k([[0, ARM.leg], [t0, -30], [t0 + (t1 - t0) * 0.35, 92], [t1 - 0.05, 92], [t1, ARM.leg], [1, ARM.leg]]), elbowR: k([[0, ARM.elbow], [t0, 120], [t0 + (t1 - t0) * 0.35, 0], [t1, ARM.elbow], [1, ARM.elbow]]), rootX: k([[0, 0], [t0, -6], [t0 + (t1 - t0) * 0.35, 10], [t1, 0], [1, 0]]), akImpactoK: k([[0, 0], [t0 + (t1 - t0) * 0.35, 0], [t0 + (t1 - t0) * 0.45, 1.1], [t1, 0.6], [1, 0]]), happyEyes: segura(1, 0, t0, t1) }),
  // Selos de mão e sumiço na fumaça.
  ninja: (t0, t1) => ({ legFL: batidas(t0, t1, 6, -10, -24, ARM.leg), legFR: batidas(t0, t1, 6, -24, -10, ARM.leg), elbowL: batidas(t0, t1, 6, -100, -86, ARM.elbow), elbowR: batidas(t0, t1, 6, -86, -100, ARM.elbow), akFumacaK: k([[0, 0], [t1 - 0.05, 0, 'step'], [t1 - 0.04, 0.5], [t1, 1.15], [Math.min(0.99, t1 + 0.09), 0], [1, 0]]), browAngry: segura(0.7, 0, t0, t1) }),
  // Mãos juntas carregando a energia, depois soltam para a frente.
  amaldicoado: (t0, t1) => ({ legFR: k([[0, ARM.leg], [t0, 40], [t1 - 0.1, 40], [t1, 80], [1, ARM.leg]]), elbowR: k([[0, ARM.elbow], [t0, 90], [t1 - 0.1, 90], [t1, 10], [1, ARM.elbow]]), akEnergiaK: k([[0, 0.2], [t0, 0.4], [t1 - 0.1, 1.25], [t1, 1.5], [1, 0.2]]), akGiro: k([[0, 0], [1, 720]]), pupilX: segura(0.4, 0, t0, t1) }),
  // Corte: espada de cima para baixo, com o arco de água/fogo.
  espada: (t0, t1) => ({ legFR: k([[0, ARM.leg], [t0, 150], [t0 + (t1 - t0) * 0.4, 150], [t0 + (t1 - t0) * 0.55, 10], [t1, 10], [1, ARM.leg]]), elbowR: k([[0, ARM.elbow], [t0, 20], [t1, 20], [1, ARM.elbow]]), akObjRot: k([[0, 0], [t0, -40], [t0 + (t1 - t0) * 0.55, 30], [t1, 30], [1, 0]]), akGiro: k([[0, 0], [t0 + (t1 - t0) * 0.4, 0], [t1, 160], [1, 160]]), rootX: k([[0, 0], [t0 + (t1 - t0) * 0.5, 0], [t0 + (t1 - t0) * 0.6, 8], [t1, 0], [1, 0]]), browAngry: segura(1, 0, t0, t1) }),
  // Agacha carregando energia e a aura explode.
  energia: (t0, t1) => ({ squatPose: segura(0.6, 0, t0, t1), rootY: k([[0, 0], [t0, 6], [t1, 6], [1, 0]]), legFL: segura(40, ARM.leg, t0, t1), legFR: segura(40, ARM.leg, t0, t1), elbowL: segura(-60, ARM.elbow, t0, t1), elbowR: segura(-60, ARM.elbow, t0, t1), rootX: batidas(t0, t1, 14, -1.6, 1.6), akAuraK: k([[0, 1], [t0, 0.7], [t1, 1.25], [1, 1]]), jaw: segura(1, 0, t0, t1), browAngry: segura(1, 0, t0, t1), moodAngry: segura(0.5, 0, t0, t1) }),
  // "Levantem-se": braço estendido e as sombras sobem do chão.
  sombrio: (t0, t1) => ({ legFR: segura(80, ARM.leg, t0, t1), elbowR: segura(0, ARM.elbow, t0, t1), headRot: segura(-6, 0, t0, t1), akSombrasY: k([[0, 60], [t0, 60], [t1 - 0.1, 0], [t1, 0], [1, 60]]), eyeOpen: segura(0.6, 1, t0, t1) }),
  // Salto e cortada: sobe, bate na bola, a bola sai voando, aterrissa.
  esporte: (t0, t1) => { const m = (t0 + t1) / 2; return { rootY: k([[0, 0], [t0, 6], [t0 + 0.06, -34], [m, -38], [m + 0.08, -10], [t1, 0], [1, 0]]), squashY: k([[0, 1], [t0, 0.88], [t0 + 0.06, 1.08], [t1 - 0.04, 0.92], [t1, 1], [1, 1]]), legFR: k([[0, ARM.leg], [t0 + 0.06, 160], [m, 160], [m + 0.04, 60], [t1, ARM.leg], [1, ARM.leg]]), elbowR: k([[0, ARM.elbow], [t0 + 0.06, 30], [m, 30], [m + 0.04, 0], [t1, ARM.elbow], [1, ARM.elbow]]), akBolaY: k([[0, 0], [m, 0], [m + 0.12, 40], [1, 40]]), akBolaX: k([[0, 0], [m, 0], [m + 0.12, 30], [1, 30]]), akBolaFora: k([[0, 0], [m + 0.13, 1, 'step'], [0.97, 0, 'step'], [1, 0]]), akImpactoK: k([[0, 0], [m, 0], [m + 0.04, 1.2], [m + 0.16, 0.4], [m + 0.2, 0], [1, 0]]), akGiro: k([[0, 0], [1, 540]]) }; },
  // Ergue o cajado devagar; o círculo mágico se abre no chão.
  contemplativo: (t0, t1) => ({ legFR: segura(100, ARM.leg, t0, t1), elbowR: segura(50, ARM.elbow, t0, t1), rootY: segura(-6, 0, t0, t1), akCirculoK: k([[0, 0.2], [t0, 0.3], [t1, 1.05], [1, 0.3]]), eyeOpen: segura(0.55, 1, t0, t1), akBrilhoK: k([[0, 0.6], [t0, 0.8], [t1, 1.15], [1, 0.6]]) }),
  // Pulo alto com giro no ar, as lâminas abertas.
  manobra: (t0, t1) => ({ rootY: k([[0, 0], [t0, 4], [t0 + 0.08, -52], [t1 - 0.08, -52], [t1, 0], [1, 0]]), rootRot: k([[0, 0], [t0 + 0.08, 0], [t1 - 0.1, -360], [t1 - 0.09, 0, 'step'], [1, 0]]), legFL: segura(110, ARM.leg, t0, t1), legFR: segura(110, ARM.leg, t0, t1), akObjRot: segura(-30, 0, t0, t1), akFumacaK: k([[0, 0], [t0, 0], [t0 + 0.08, 0.7], [t0 + 0.2, 0], [1, 0]]) }),
  // Puxa a cordinha: a lâmina da cabeça e do braço vibram.
  motosserra: (t0, t1) => ({ legFL: k([[0, ARM.leg], [t0, 30], [t0 + 0.06, -20], [t1, 60], [1, ARM.leg]]), elbowL: k([[0, ARM.elbow], [t0, 60], [t1, 20], [1, ARM.elbow]]), akRev: batidas(t0, t1, 16, 1.12, 0.92, 1), rootX: batidas(t0, t1, 16, -1.5, 1.5), jaw: segura(1, 0, t0, t1), moodAngry: segura(0.6, 0, t0, t1) }),
  // Pose dramática: quadril torto, braço na testa, o texto de tensão sobe.
  dramatico: (t0, t1) => ({ rootRot: segura(-8, 0, t0, t1), headRot: segura(10, 0, t0, t1), legFL: segura(150, ARM.leg, t0, t1), elbowL: segura(110, ARM.elbow, t0, t1), legFR: segura(-20, ARM.leg, t0, t1), elbowR: segura(-80, ARM.elbow, t0, t1), squashX: segura(0.96, 1, t0, t1), akTextoY: k([[0, 10], [t0, 10], [t1, -12], [1, 10]]), browShow: segura(1, 0, t0, t1), brow: segura(1, 0, t0, t1) }),
  // Punho para o alto e raios em volta.
  heroi: (t0, t1) => ({ legFR: segura(165, ARM.leg, t0, t1), elbowR: segura(0, ARM.elbow, t0, t1), legFL: segura(-10, ARM.leg, t0, t1), elbowL: segura(-70, ARM.elbow, t0, t1), rootY: k([[0, 0], [t0, 0], [t0 + 0.05, -10], [t1, -4], [1, 0]]), happyEyes: segura(1, 0, t0, t1) }),
};

/** Efeito de cada estilo e o canal que o liga. */
const FX_DO_ESTILO = (estilo) => ESTILOS[estilo].fx;

// ------------------------------------------------------------------ 12 contextos

/**
 * Faixas de um contexto (o que o JoJo está fazendo), com a assinatura do estilo dentro da
 * janela de clímax e o efeito do estilo ligado na hora certa. A entrada e a saída usam a
 * transição do estilo (puf de fumaça, aura ou brilho) e devolvem tudo ao repouso no fim.
 */
const CONTEXTO_FAIXAS = {
  // Aparece com a transição, faz a assinatura e aponta para o alto (o balão com o horário).
  avisoDia: (e) => ({ ...ASSINATURA[e](0.18, 0.5), legFL: k([[0, ARM.leg], [0.55, ARM.leg], [0.62, 140], [0.9, 140], [1, ARM.leg]]), elbowL: k([[0, ARM.elbow], [0.55, ARM.elbow], [0.62, 0], [0.9, 0], [1, ARM.elbow]]), headRot: k([[0, 0], [0.6, 0], [0.66, -8], [0.9, -8], [1, 0]]), jaw: batidas(0.6, 0.9, 6, 0.8, 0.3, 0) }),
  // Olha o pulso, impaciente, quicando no lugar.
  avisoProximo: (e) => ({ legFL: segura(40, ARM.leg, 0.1, 0.55), elbowL: segura(-100, ARM.elbow, 0.1, 0.55), pupilX: segura(-0.6, 0, 0.12, 0.5), pupilY: segura(0.5, 0, 0.12, 0.5), rootY: batidas(0.12, 0.5, 6, -3, 0), ...ASSINATURA[e](0.56, 0.9) }),
  // Conta nos dedos com a cabeça, três batidas, e a assinatura no fim da contagem.
  contagem: (e) => ({ legFR: segura(60, ARM.leg, 0.08, 0.5), elbowR: batidas(0.08, 0.5, 6, 90, 60, ARM.elbow), headRot: batidas(0.08, 0.5, 6, 6, -6), jaw: batidas(0.08, 0.5, 6, 0.7, 0.2), ...ASSINATURA[e](0.55, 0.88) }),
  // Pulo de comemoração e assinatura.
  disponivel: (e) => ({ rootY: k([[0, 0], [0.1, 4], [0.16, -30], [0.24, 0], [0.3, -18], [0.36, 0], [1, 0]]), legFL: segura(150, ARM.leg, 0.1, 0.38), legFR: segura(150, ARM.leg, 0.1, 0.38), happyEyes: segura(1, 0, 0.1, 0.4), ...ASSINATURA[e](0.45, 0.85), moodJoy: segura(0.6, 0, 0.1, 0.9) }),
  // Frustração: ombros caem, pisa forte, bufa; a assinatura sai fraca e murcha.
  adiamento: (e) => ({ ...ASSINATURA[e](0.12, 0.38), squashY: k([[0, 1], [0.4, 1], [0.48, 0.9], [0.85, 0.9], [1, 1]]), rootY: k([[0, 0], [0.4, 0], [0.48, 6], [0.85, 6], [1, 0]]), legFL: k([[0, ARM.leg], [0.4, ARM.leg], [0.48, -24], [0.85, -24], [1, ARM.leg]]), legFR: k([[0, ARM.leg], [0.4, ARM.leg], [0.48, -24], [0.85, -24], [1, ARM.leg]]), legBR: batidas(0.5, 0.8, 4, 16, 0), browAngry: segura(1, 0, 0.4, 0.95), moodAngry: segura(0.8, 0, 0.42, 0.92), jaw: k([[0, 0], [0.55, 0], [0.58, 1], [0.66, 0.3], [1, 0]]) }),
  // Revelação: encolhe, explode com os braços para o alto, efeito no máximo.
  novaTemporada: (e) => ({ squashY: k([[0, 1], [0.1, 0.82], [0.2, 0.82], [0.26, 1.12], [0.32, 1], [1, 1]]), rootY: k([[0, 0], [0.2, 8], [0.26, -26], [0.34, 0], [1, 0]]), legFL: segura(165, ARM.leg, 0.24, 0.5), legFR: segura(165, ARM.leg, 0.24, 0.5), jaw: segura(1, 0, 0.24, 0.5), ...ASSINATURA[e](0.55, 0.9), moodJoy: segura(0.8, 0, 0.24, 0.95) }),
  // Braços cruzados, pé batendo, olhar de canto.
  lembrete: (e) => ({ legFL: segura(-10, ARM.leg, 0.08, 0.6), legFR: segura(-10, ARM.leg, 0.08, 0.6), elbowL: segura(-90, ARM.elbow, 0.08, 0.6), elbowR: segura(-90, ARM.elbow, 0.08, 0.6), legBL: batidas(0.1, 0.58, 8, 12, 0), pupilX: segura(0.8, 0, 0.1, 0.6), browShow: segura(1, 0, 0.1, 0.6), brow: segura(-0.6, 0, 0.1, 0.6), ...ASSINATURA[e](0.65, 0.92) }),
  // Reverência, um instante de nostalgia e a assinatura em homenagem.
  encerramento: (e) => ({ rootRot: k([[0, 0], [0.08, 0], [0.16, 14], [0.34, 14], [0.42, 0], [1, 0]]), headRot: k([[0, 0], [0.16, 16], [0.34, 16], [0.42, 0], [1, 0]]), legFL: segura(-40, ARM.leg, 0.12, 0.4), elbowL: segura(-100, ARM.elbow, 0.12, 0.4), moodSad: segura(0.35, 0, 0.12, 0.42), eyeOpen: segura(0.5, 1, 0.14, 0.4), ...ASSINATURA[e](0.48, 0.9), moodJoy: segura(0.5, 0, 0.48, 0.92) }),
  // Prepara a pipoca, senta e se ajeita para assistir.
  inicioSessao: (e) => ({ ...ASSINATURA[e](0.06, 0.32), akPipoca: k([[0, 0], [0.36, 1, 'step'], [1, 1]]), squashY: k([[0, 1], [0.42, 1], [0.55, 0.86], [1, 0.86]]), rootY: k([[0, 0], [0.42, 0], [0.55, 10], [1, 10]]), legFL: k([[0, ARM.leg], [0.36, 30], [1, 30]]), elbowL: k([[0, ARM.elbow], [0.36, -40], [1, -40]]), legFR: k([[0, ARM.leg], [0.62, 20], [0.7, 60], [0.78, 20], [0.86, 60], [1, 20]]), elbowR: k([[0, ARM.elbow], [0.62, 120], [0.7, 150], [0.78, 120], [0.86, 150], [1, 120]]), jaw: batidas(0.7, 1, 6, 0.6, 0.1) }),
  // Levanta, espreguiça e faz um sinal de aprovação.
  conclusao: (e) => ({ squashY: k([[0, 0.9], [0.14, 1.06], [0.24, 1], [1, 1]]), rootY: k([[0, 8], [0.14, -4], [0.24, 0], [1, 0]]), legFL: segura(160, ARM.leg, 0.1, 0.32), legFR: segura(160, ARM.leg, 0.1, 0.32), jaw: k([[0, 0], [0.12, 1], [0.28, 0], [1, 0]]), eyeOpen: k([[0, 1], [0.12, 0.2], [0.28, 1], [1, 1]]), ...ASSINATURA[e](0.4, 0.86), happyEyes: segura(1, 0, 0.5, 0.95) }),
  // Recompensa: o gesto do estilo materializa a JOJOcoin na mão (canal da moeda oficial).
  moedas: (e) => ({ ...ASSINATURA[e](0.08, 0.5), ...REVELA_MOEDA[ESTILOS[e].moeda](), prop_lj_moeda: k([[0, 0], [0.55, 1, 'step'], [0.97, 0, 'step'], [1, 0]]), ljoMoedaGiro: k([[0, 1], [0.55, 1], [0.62, 0.2], [0.68, 1], [0.74, 0.2], [0.8, 1], [1, 1]]), happyEyes: segura(1, 0, 0.55, 0.95), moodJoy: segura(0.7, 0, 0.55, 0.95) }),
  // Conquista: assinatura dupla, efeito do estilo e do pacote juntos, pose final.
  conquista: (e) => ({ ...mesclar(ASSINATURA[e](0.1, 0.42), ASSINATURA[e](0.52, 0.84), 0.47), scale: k([[0, 1], [0.5, 1], [0.6, 1.06], [0.85, 1.06], [1, 1]]), happyEyes: segura(1, 0, 0.84, 0.98), moodJoy: segura(0.8, 0, 0.1, 0.98) }),
};

/** Como cada universo revela as moedas (canais de objeto do pacote durante "moedas"). */
const REVELA_MOEDA = {
  grimorio: () => ({ akAbre: k([[0, 0], [0.3, 1, 'step'], [0.97, 0, 'step'], [1, 0]]), akAuraK: k([[0, 1], [0.3, 0.8], [0.5, 1.2], [1, 1]]) }),
  bau: () => ({ akBau: k([[0, 0], [0.06, 1, 'step'], [0.97, 0, 'step'], [1, 0]]), akTampa: k([[0, 0], [0.3, 0], [0.42, -70], [0.95, -70], [1, 0]]), akBauBrilho: k([[0, 0], [0.42, 1, 'step'], [0.9, 0, 'step'], [1, 0]]), pupilX: segura(0.7, 0, 0.3, 0.6), pupilY: segura(0.6, 0, 0.3, 0.6) }),
  ninja: () => ({ akFumacaK: k([[0, 0], [0.49, 0, 'step'], [0.5, 0.5], [0.53, 1.1], [0.6, 0], [1, 0]]) }),
  energia: () => ({ akEnergia: k([[0, 0], [0.1, 1, 'step'], [0.55, 0, 'step'], [1, 0]]), akEnergiaK: k([[0, 0.2], [0.1, 0.4], [0.5, 1.4], [0.55, 0.2], [1, 0.2]]) }),
  espada: () => ({ akGiro: k([[0, 0], [0.3, 0], [0.5, 200], [1, 200]]) }),
  painel: () => ({ akPainelK: k([[0, 0], [0.1, 0], [0.18, 1.08], [0.22, 1], [0.86, 1], [0.92, 0], [1, 0]]) }),
  cortada: () => ({}),
  magia: () => ({ akBrilhoK: k([[0, 0.6], [0.5, 1.3], [1, 0.6]]) }),
  motosserra: () => ({}),
  pose: () => ({ akTextoY: k([[0, 10], [0.1, 10], [0.5, -14], [1, 10]]) }),
};

/** Efeitos que cada estilo acende em cada contexto (fração da animação ligada). */
function faixasDeEfeito(estilo, ctx) {
  const fx = FX_DO_ESTILO(estilo);
  const fora = { avisoProximo: [0.56, 0.9], contagem: [0.55, 0.88], lembrete: [0.65, 0.92], adiamento: [0.12, 0.38], inicioSessao: [0.06, 0.32], encerramento: [0.46, 0.92] }[ctx] || [0.08, 0.92];
  const t = {};
  t[canalEfeito(fx)] = liga(fora[0], fora[1]);
  if (ctx === 'novaTemporada' || ctx === 'conquista') t[canalEfeito('brilhos')] = liga(0.5, 0.95);
  if (ctx === 'conquista' && fx !== 'aura') t[canalEfeito('aura')] = liga(0.5, 0.9);
  if (ctx === 'moedas' && estilo === 'contemplativo') t[canalEfeito('circuloMagico')] = liga(0.05, 0.95);
  if (ctx === 'moedas' && ESTILOS[estilo].moeda === 'painel') t[canalEfeito('painel')] = liga(0.1, 0.92);
  return t;
}

/** Id da animação (item do catálogo) de um estilo num contexto. */
export const animAnime = (estilo, ctx) => `anime_${estilo}_${ctx}`;

/** Itens do catálogo de animações: 13 estilos × 12 contextos (nunca tocam sozinhos). */
export function itensAnime() {
  const out = [];
  for (const estilo of ESTILO_IDS) {
    for (const c of CONTEXTOS) {
      const faixas = { ...CONTEXTO_FAIXAS[c.id](estilo), ...faixasDeEfeito(estilo, c.id) };
      out.push({
        id: animAnime(estilo, c.id), nome: `Anime: ${ESTILOS[estilo].nome} — ${c.nome}`, categoria: 'anime', listas: {}, gatilho: { anime: [c.id] },
        duracao: c.dur, loop: false, entrada: 200, frequencia: 'raro', estatico: 0.5,
        receita: { corpo: c.id === 'inicioSessao' ? 'respira' : 'parado', rosto: c.id === 'adiamento' ? 'frustrado' : c.id === 'lembrete' ? 'sobrancelha' : c.id === 'encerramento' ? 'orgulhoso' : 'sorrisao', fx: c.id === 'conquista' || c.id === 'novaTemporada' ? ['brilho'] : [] },
        faixas, anime: { estilo, contexto: c.id },
      });
    }
  }
  return out;
}

// ------------------------------------------------------------------ pacotes curados

const V = (o) => Object.freeze(o);
/**
 * Pacotes feitos à mão. `nomes`: como o anime aparece (normalizados na comparação; o mais
 * específico vem antes: Boruto antes de Naruto). `kit`: roupa do kit; `acessorios`: peças de
 * anime; `extra`: efeito a mais além do do estilo; `cores`: a/b/c (roupa), d (metal/escuro),
 * f1/f2 (efeitos). Balões: frases curtas, sem spoiler e sem fala de personagem copiada.
 */
export const CURADOS = Object.freeze([
  V({ id: 'blackClover', nome: 'Black Clover', nomes: ['black clover'], estilo: 'magia', cores: { a: '#17171f', b: '#b71c1c', c: '#43a047', d: '#121212', f1: '#2a0c0c', f2: '#d32f2f' },
    kit: { tronco: 'regata', baixo: 'calca', pes: 'bota' }, acessorios: ['capaTouros', 'espadaAntimagia'], porContexto: { moedas: { trocar: { espadaAntimagia: 'grimorio' } } },
    baloes: ['Grimório aberto. Antimagia carregada.', 'Touros Negros não desistem de episódio.'] }),
  V({ id: 'onePiece', nome: 'One Piece', nomes: ['one piece'], estilo: 'pirata', cores: { a: '#c62828', b: '#1e5aa8', c: '#fdd835', d: '#5d4037', f1: '#4fc3f7', f2: '#ffffff' },
    kit: { tronco: 'colete', baixo: 'short', pes: 'sandalia' }, acessorios: ['chapeuPalha'], baloes: ['Velas içadas. Tem episódio no horizonte.', 'Tesouro encontrado: JOJOcoins.'] }),
  V({ id: 'boruto', nome: 'Boruto', nomes: ['boruto'], estilo: 'ninja', cores: { a: '#263238', b: '#e53935', c: '#90caf9', d: '#37474f', f1: '#64b5f6', f2: '#e3f2fd' },
    kit: { tronco: 'jaqueta', mangas: 'longa', baixo: 'calca', pes: 'sandalia' }, acessorios: ['bandanaNinja', 'kunai'], porContexto: { moedas: { trocar: { kunai: 'esferaChakra' } }, conquista: { trocar: { kunai: 'esferaChakra' } } },
    baloes: ['Nova geração na área.', 'Selo feito. Episódio liberado.'] }),
  V({ id: 'naruto', nome: 'Naruto', nomes: ['naruto'], estilo: 'ninja', cores: { a: '#ef6c00', b: '#1a237e', c: '#fdd835', d: '#1a237e', f1: '#4fc3f7', f2: '#ffffff' },
    kit: { tronco: 'jaqueta', mangas: 'longa', baixo: 'calca', pes: 'sandalia' }, acessorios: ['bandanaNinja', 'kunai'], porContexto: { moedas: { trocar: { kunai: 'esferaChakra' } }, conquista: { trocar: { kunai: 'esferaChakra' } } },
    baloes: ['Clone, selo e fumaça. Episódio na área.', 'Chakra cheio. Pode assistir.'] }),
  V({ id: 'jujutsuKaisen', nome: 'Jujutsu Kaisen', nomes: ['jujutsu kaisen'], estilo: 'amaldicoado', cores: { a: '#1a1f3a', b: '#c9a227', c: '#7c4dff', d: '#0d0a1f', f1: '#536dfe', f2: '#b388ff' },
    kit: { baixo: 'calca', pes: 'sapato' }, acessorios: ['uniformeJujutsu', 'vendaOlhos', 'cabeloBranco', 'esferaChakra'], extra: 'dominio', porContexto: {},
    baloes: ['Energia amaldiçoada no talo.', 'Expansão de domínio: sofá.'] }),
  V({ id: 'bleach', nome: 'Bleach', nomes: ['bleach'], estilo: 'espada', cores: { a: '#151515', b: '#f5f5f5', c: '#90caf9', d: '#cfd8dc', f1: '#b3e5fc', f2: '#ffffff' },
    kit: { baixo: 'calca', pes: 'sandalia' }, acessorios: ['shinigami', 'zanpakuto'], porContexto: { conquista: { mais: ['mascaraHollow'] }, novaTemporada: { mais: ['mascaraHollow'] } }, extra: 'aura',
    baloes: ['Pressão espiritual subindo.', 'Lâmina liberada. Episódio também.'] }),
  V({ id: 'demonSlayer', nome: 'Demon Slayer', nomes: ['kimetsu no yaiba', 'demon slayer'], estilo: 'espada', cores: { a: '#1b5e20', b: '#101010', c: '#d84315', d: '#1c1c1c', f1: '#4fc3f7', f2: '#e1f5fe' },
    kit: { tronco: 'gi', mangas: 'longa', baixo: 'calca', pes: 'sandalia' }, acessorios: ['haoriXadrez', 'brincosHanafuda', 'katana'], extra: 'petalas',
    baloes: ['Respiração concentrada. Episódio chegando.', 'Lâmina afiada, sofá pronto.'] }),
  V({ id: 'dragonBall', nome: 'Dragon Ball', nomes: ['dragon ball'], estilo: 'energia', cores: { a: '#ef6c00', b: '#1565c0', c: '#ffffff', d: '#1565c0', f1: '#ffd54f', f2: '#fff59d' },
    kit: { baixo: 'calca', pes: 'bota' }, acessorios: ['giLutador'], porContexto: { conquista: { mais: ['cabeloSaiyajin'] }, novaTemporada: { mais: ['cabeloSaiyajin'] }, moedas: { mais: ['esferaChakra'] } },
    baloes: ['Poder de luta passando de qualquer medidor.', 'Carregando energia. Episódio na área.'] }),
  V({ id: 'soloLeveling', nome: 'Solo Leveling', nomes: ['ore dake level up na ken', 'solo leveling'], estilo: 'sombrio', cores: { a: '#141420', b: '#3949ab', c: '#7c4dff', d: '#0b1030', f1: '#7c4dff', f2: '#40c4ff' },
    kit: { tronco: 'jaqueta', mangas: 'longa', baixo: 'calca', pes: 'bota' }, acessorios: ['capuzSombrio'], extra: 'aura',
    baloes: ['[SISTEMA] Missão diária: assistir episódio.', 'Levantem-se. Tem episódio novo.'] }),
  V({ id: 'haikyuu', nome: 'Haikyuu!!', nomes: ['haikyuu', 'haikyu'], estilo: 'esporte', cores: { a: '#ef6c00', b: '#111111', c: '#ffffff', d: '#212121', f1: '#ffeb3b', f2: '#ff7043' },
    kit: { baixo: 'short', pes: 'tenis' }, acessorios: ['uniformeVolei', 'bolaVolei'], baloes: ['Levantada perfeita. Episódio na rede.', 'Ponto! Corta pro sofá.'] }),
  V({ id: 'frieren', nome: 'Frieren', nomes: ['sousou no frieren', 'frieren'], estilo: 'contemplativo', cores: { a: '#f5f5f0', b: '#c9a227', c: '#e53935', d: '#37474f', f1: '#a5d6a7', f2: '#e53935' },
    kit: { tronco: 'capa', mangas: 'longa', baixo: 'saia', pes: 'bota' }, acessorios: ['cajadoMagico'], extra: 'petalas',
    baloes: ['Magia de flores em campo. Episódio novo.', 'Mil anos de viagem e ainda tem episódio.'] }),
  V({ id: 'attackOnTitan', nome: 'Attack on Titan', nomes: ['shingeki no kyojin', 'attack on titan'], estilo: 'manobra', cores: { a: '#795548', b: '#eceff1', c: '#2e5e3e', d: '#90a4ae', f1: '#eceff1', f2: '#b0bec5' },
    kit: { tronco: 'jaqueta', mangas: 'longa', baixo: 'calca', pes: 'bota' }, acessorios: ['capaTropa', 'equipamentoManobra', 'laminasManobra'],
    baloes: ['Gás no máximo. Lâminas prontas.', 'Muralha nenhuma segura esse episódio.'] }),
  V({ id: 'chainsawMan', nome: 'Chainsaw Man', nomes: ['chainsaw man'], estilo: 'motosserra', cores: { a: '#fafafa', b: '#212121', c: '#ff7043', d: '#455a64', f1: '#ff5252', f2: '#ffab40' },
    kit: { tronco: 'camisa', mangas: 'longa', baixo: 'calca', pes: 'sapato' }, acessorios: ['chifreMotosserra', 'motosserraBraco'],
    baloes: ['Vrrrrr. Episódio na área.', 'Cordinha puxada. Assiste logo.'] }),
  V({ id: 'jojoBizarre', nome: "JoJo's Bizarre Adventure", nomes: ['jojo no kimyou na bouken', 'jojos bizarre adventure', 'jojo s bizarre adventure'], estilo: 'dramatico', cores: { a: '#1a237e', b: '#c9a227', c: '#7b1fa2', d: '#111111', f1: '#7b1fa2', f2: '#c9a227' },
    kit: { tronco: 'sobretudo', mangas: 'longa', baixo: 'calca', pes: 'sapato', cabeca: 'quepe', pescoco: 'corrente' }, acessorios: [], extra: 'aura',
    baloes: ['Essa pose não é para qualquer um.', 'Menacing. Episódio chegando.'] }),
  V({ id: 'myHeroAcademia', nome: 'My Hero Academia', nomes: ['boku no hero academia', 'my hero academia'], estilo: 'heroi', cores: { a: '#2e7d32', b: '#212121', c: '#e53935', d: '#263238', f1: '#76ff03', f2: '#ccff90' },
    kit: { tronco: 'uniforme', mangas: 'longa', baixo: 'calca', pes: 'tenis', rosto: 'mascaraOlhos' }, acessorios: [], extra: 'aura',
    baloes: ['Mais além! Episódio novo.', 'Herói de plantão no sofá.'] }),
  V({ id: 'onePunchMan', nome: 'One Punch Man', nomes: ['one punch man'], estilo: 'energia', cores: { a: '#fdd835', b: '#fafafa', c: '#e53935', d: '#424242', f1: '#fff59d', f2: '#ffffff' },
    kit: { tronco: 'capa', baixo: 'calca', pes: 'bota' }, acessorios: [], porContexto: {}, extra: 'impacto',
    baloes: ['Um soco. Um episódio.', 'Treino diário cumprido. Agora anime.'] }),
]);

// ------------------------------------------------------------------ composição automática

/**
 * Características públicas (tags da AniList, nunca as marcadas como spoiler) → peças.
 * Cada regra dá roupa/acessório reconhecível e o estilo de movimento daquele tipo de obra.
 */
export const POR_TAG = [
  [['Ninja'], { estilo: 'ninja', acessorios: ['bandanaNinja', 'kunai'], kit: { tronco: 'jaqueta', mangas: 'longa', pes: 'sandalia' } }],
  [['Pirates'], { estilo: 'pirata', acessorios: [], kit: { cabeca: 'chapeuPirata', tronco: 'colete', pes: 'bota' }, mao: 'espada' }],
  [['Samurai'], { estilo: 'espada', acessorios: ['katana'], kit: { tronco: 'gi', mangas: 'longa', pes: 'sandalia' } }],
  [['Swordplay'], { estilo: 'espada', acessorios: ['katana'], kit: {} }],
  [['Volleyball'], { estilo: 'esporte', acessorios: ['uniformeVolei', 'bolaVolei'], kit: { baixo: 'short', pes: 'tenis' } }],
  [['Basketball', 'Football', 'Baseball', 'Tennis', 'Table Tennis', 'Badminton', 'Rugby', 'American Football'], { estilo: 'esporte', acessorios: [], kit: { tronco: 'regata', baixo: 'short', pes: 'tenis', estampa: 'numero10' }, mao: 'bola' }],
  [['Martial Arts', 'Boxing', 'Wrestling'], { estilo: 'energia', acessorios: ['giLutador'], kit: { pes: 'descalco' } }],
  [['Magic', 'Witch', 'Wizard'], { estilo: 'contemplativo', acessorios: ['cajadoMagico'], kit: { tronco: 'capa', mangas: 'longa', cabeca: 'chapeuBruxa' } }],
  [['Mahou Shoujo'], { estilo: 'heroi', acessorios: [], kit: { tronco: 'vestido', pescoco: 'babado', estampa: 'estrelas' }, mao: 'cajado' }],
  [['Super Power', 'Superhero'], { estilo: 'heroi', acessorios: [], kit: { tronco: 'uniforme', mangas: 'longa', rosto: 'mascaraOlhos', pes: 'bota' } }],
  [['Real Robot', 'Super Robot', 'Mecha'], { estilo: 'heroi', acessorios: [], kit: { tronco: 'armadura', cabeca: 'capacete', pes: 'bota' } }],
  [['Isekai', 'Video Games', 'Virtual World'], { estilo: 'sombrio', acessorios: [], kit: { tronco: 'jaqueta', mangas: 'longa' }, mao: 'espada', efeito: 'painel' }],
  [['Vampire', 'Demons', 'Gods'], { estilo: 'sombrio', acessorios: ['capuzSombrio'], kit: { tronco: 'capa' } }],
  [['Ghost', 'Exorcism', 'Youkai'], { estilo: 'amaldicoado', acessorios: ['esferaChakra'], kit: { tronco: 'gi', mangas: 'longa' } }],
  [['Idol', 'Music', 'Band'], { estilo: 'dramatico', acessorios: [], kit: { tronco: 'vestido', estampa: 'brilhos' }, mao: 'microfone' }],
  [['Cooking', 'Food'], { estilo: 'heroi', acessorios: [], kit: { tronco: 'avental' }, mao: 'espeto' }],
  [['Detective'], { estilo: 'dramatico', acessorios: [], kit: { tronco: 'sobretudo', mangas: 'longa', cabeca: 'fedora', rosto: 'cachimbo' } }],
  [['Military', 'War'], { estilo: 'manobra', acessorios: [], kit: { tronco: 'uniforme', mangas: 'longa', cabeca: 'quepe', pes: 'bota' } }],
  [['Space', 'Space Opera', 'Aliens'], { estilo: 'heroi', acessorios: [], kit: { tronco: 'macacao', mangas: 'longa', cabeca: 'capacete', pes: 'bota' } }],
  [['Cyberpunk'], { estilo: 'motosserra', acessorios: [], kit: { tronco: 'jaqueta', mangas: 'longa', rosto: 'oculosEscuros' }, efeito: 'raios' }],
  [['Delinquents', 'Gangs'], { estilo: 'dramatico', acessorios: [], kit: { tronco: 'sobretudo', mangas: 'longa', pescoco: 'corrente' } }],
  [['School Club', 'School'], { estilo: 'heroi', acessorios: [], kit: { tronco: 'uniforme', mangas: 'longa', pescoco: 'gravataBorboleta' } }],
];
/** Gênero sozinho (sem tag reconhecível): composição provisória. */
const POR_GENERO = {
  Action: 'energia', Adventure: 'pirata', Comedy: 'heroi', Drama: 'dramatico', Fantasy: 'contemplativo', Horror: 'sombrio', 'Mahou Shoujo': 'heroi', Mecha: 'heroi',
  Music: 'dramatico', Mystery: 'dramatico', Psychological: 'sombrio', Romance: 'contemplativo', 'Sci-Fi': 'heroi', 'Slice of Life': 'contemplativo', Sports: 'esporte', Supernatural: 'amaldicoado', Thriller: 'sombrio',
};

const hexOk = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c.toLowerCase() : null);
function luz(c) { const p = (i) => parseInt(c.slice(i, i + 2), 16); return (0.299 * p(1) + 0.587 * p(3) + 0.114 * p(5)) / 255; }
const sombraHex = (c, k = 0.7) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(c.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
const clarear = (c, t = 0.45) => '#' + [1, 3, 5].map((i) => { const v = parseInt(c.slice(i, i + 2), 16); return Math.round(v + (255 - v) * t).toString(16).padStart(2, '0'); }).join('');
// Hash estável (o mesmo anime sempre dá o mesmo pacote).
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Paleta a partir da cor da capa (a AniList dá uma cor dominante por anime). */
export function paletaDaCapa(cor, seed = 0) {
  const base = hexOk(cor) || ['#c62828', '#1565c0', '#2e7d32', '#6a1b9a', '#ef6c00', '#00838f', '#37474f', '#ad1457'][seed % 8];
  const escura = luz(base) > 0.62 ? sombraHex(base, 0.55) : base;
  return { a: escura, b: luz(base) > 0.62 ? base : clarear(base, 0.7), c: clarear(base, 0.35), d: sombraHex(escura, 0.5), f1: clarear(base, 0.25), f2: '#ffffff' };
}

/** Tags utilizáveis (sem spoiler, relevância razoável). */
export const tagsSeguras = (tags) => (Array.isArray(tags) ? tags.filter((t) => t && !t.spoiler && (t.rank == null || t.rank >= 50)).map((t) => t.nome) : []);

/**
 * Compõe um pacote para um anime que ainda não tem pacote. Determinístico e local.
 * `completo` só quando alguma característica reconhecível do anime (tag) virou peça.
 */
export function comporPacote(media) {
  const tags = tagsSeguras(media.tags);
  const seed = hash(media.id);
  let regra = null;
  for (const [ts, r] of POR_TAG) if (ts.some((t) => tags.includes(t))) { regra = r; break; }
  const genero = (media.generos || []).find((g) => POR_GENERO[g]);
  const estilo = regra?.estilo || POR_GENERO[genero] || ESTILO_IDS[seed % ESTILO_IDS.length];
  const kit = { tronco: 'camiseta', mangas: 'curta', baixo: null, pes: 'tenis', ...(regra?.kit || {}) };
  if (regra?.mao) kit.mao = regra.mao;
  if (!regra) { kit.tronco = ['camiseta', 'jaqueta', 'regata', 'camisa'][seed % 4]; kit.estampa = ['estrelas', 'listras', 'brilhos', 'faixa'][(seed >> 3) % 4]; }
  return {
    id: `c${media.id}`, nome: media.titulo, anime: media.id, nomes: [normAnime(media.titulo)], origem: 'composto', estilo,
    cores: paletaDaCapa(media.cor, seed), kit, acessorios: [...(regra?.acessorios || [])], extra: regra?.efeito || null, porContexto: {},
    baseadoEm: regra ? { tags: tags.filter((t) => POR_TAG.some(([ts]) => ts.includes(t))) } : { generos: genero ? [genero] : [] },
    completo: !!regra, pendencia: regra ? null : 'Sem característica reconhecível na fonte além do gênero e da cor da capa: composição provisória.',
    baloes: [], versao: VERSAO_PACOTES,
  };
}

/** Pacote a partir de um visual que já existe no jogo (fantasia inteira do show daquele visual). */
export function pacoteDoVisual(visual, media = null) {
  const show = visual.show;
  const estilo = ({ grito: 'energia', flexao: 'heroi', apontar: 'dramatico', giro: 'contemplativo', assusta: 'sombrio', pulo: 'esporte', acena: 'heroi', samba: 'pirata', ginga: 'dramatico', explica: 'contemplativo', brinde: 'heroi', confusa: 'dramatico', incha: 'energia', preguica: 'contemplativo', asas: 'manobra' })[show?.gesto] || 'heroi';
  const cores = { a: visual.cores.a, b: visual.cores.b, c: visual.cores.g, d: sombraHex(visual.cores.a, 0.5), f1: visual.cores.g, f2: '#ffffff' };
  const fxShow = { fogo: 'aura', raios: 'raios', estrelas: 'brilhos', bolhas: 'brilhos', notas: 'brilhos', confete: 'brilhos', coracoes: 'petalas', folhas: 'petalas' }[show?.efeito] || null;
  return {
    id: `v${visual.id}`, nome: visual.obra, anime: media?.id ?? null, nomes: [normAnime(visual.obra)], origem: 'visual', estilo, cores,
    visual: visual.id, kit: null, acessorios: [], extra: fxShow && fxShow !== ESTILOS[estilo].fx ? fxShow : null, porContexto: {},
    baseadoEm: { visual: visual.id, peca: visual.nome || visual.peca || null }, completo: true, pendencia: null, baloes: visual.fala ? [visual.fala] : [], versao: VERSAO_PACOTES,
  };
}

// ------------------------------------------------------------------ registro e busca

/** O pacote curado (ou null) que bate com os nomes do anime. */
export function curadoDoAnime(media) {
  const nomes = [media.titulo, media.romaji, media.english, ...(media.sinonimos || [])].map(normAnime).filter(Boolean);
  for (const p of CURADOS) {
    for (const alvo of p.nomes) {
      const a = normAnime(alvo);
      if (nomes.some((n) => n === a || n.startsWith(`${a} `) || n.includes(` ${a} `) || n.endsWith(` ${a}`))) return { ...p, origem: 'curado', completo: true, pendencia: null, versao: VERSAO_PACOTES };
    }
  }
  return null;
}

/** Visual existente do jogo cuja obra é este anime (o de nível mais baixo, o mais icônico primeiro). */
export function visualDoAnimeQualquer(media, visuais) {
  const nomes = [media.titulo, media.romaji, media.english, ...(media.sinonimos || [])].map(normAnime).filter((n) => n.length >= 3);
  let achado = null;
  for (const v of visuais || []) {
    if (!v.show || !v.obra) continue;
    const obras = String(v.obra).split(/\s*\(|\)\s*/).map(normAnime).filter((x) => x.length >= 3);
    const bate = obras.some((o) => nomes.some((n) => n === o || (o.length >= 6 && n.startsWith(o)) || (n.length >= 6 && o.startsWith(n))));
    if (bate && (!achado || v.nivel < achado.nivel)) achado = v;
  }
  return achado;
}

/**
 * Registro de pacotes: consulta (curado → visual existente → composto guardado → compõe),
 * guarda os compostos no catálogo local e mantém só um punhado na memória (LRU).
 * `catalogo` é um objeto persistível { [animeId]: pacote } (guardado pelo serviço).
 */
export class RegistroPacotes {
  constructor({ visuais = () => [], catalogo = {}, salvar = () => {}, maxMemoria = 8 } = {}) {
    this.visuais = visuais; this.catalogo = catalogo || {}; this.salvar = salvar; this.max = maxMemoria;
    this.cache = new Map();
    this.carregados = 0;
  }

  /** Pacote do anime (criado e registrado na hora se faltar; leve: só dados, sem arte nova). */
  doAnime(media) {
    if (!media?.id) return null;
    if (this.cache.has(media.id)) { const p = this.cache.get(media.id); this.cache.delete(media.id); this.cache.set(media.id, p); return p; }
    let p = curadoDoAnime(media);
    if (!p) { const v = visualDoAnimeQualquer(media, this.visuais()); if (v) p = pacoteDoVisual(v, media); }
    if (!p) {
      const guardado = this.catalogo[media.id];
      p = guardado && guardado.versao === VERSAO_PACOTES && validarPacote(guardado).ok ? guardado : comporPacote(media);
      if (p !== guardado) { this.catalogo[media.id] = p; try { this.salvar(this.catalogo); } catch { /* o pacote vale nesta sessão */ } }
    }
    p = { ...p, anime: media.id };
    this.carregados++;
    this.cache.set(media.id, p);
    while (this.cache.size > this.max) this.cache.delete(this.cache.keys().next().value);
    return p;
  }
}

// ------------------------------------------------------------------ uso no JoJo

/**
 * Canais que vestem o JoJo com o pacote num contexto (roupa, acessórios e efeito extra).
 * Nunca mistura dois pacotes: o resultado é só deste pacote. `visualCanais` traduz um
 * visual existente nos canais dele (fantasia inteira + transformação), vindo do companion.
 */
export function canaisDoPacote(p, contexto = null, { visualCanais = null } = {}) {
  const ch = { [CANAL_LIGADO]: 1 };
  if (p.visual && visualCanais) Object.assign(ch, visualCanais(p.visual));
  if (p.kit) {
    for (const slot of ['tronco', 'baixo', 'pes', 'cabeca', 'pescoco', 'mao', 'estampa', 'mangas']) {
      const o = p.kit[slot];
      if (o && KIT[slot]?.includes(o) && !['nenhum', 'nenhuma', 'descalco'].includes(o)) ch[canalKit(slot, o)] = 1;
    }
    for (const r of [].concat(p.kit.rosto || [])) if (KIT.rosto.includes(r)) ch[canalKit('rosto', r)] = 1;
    if (p.kit.baixo && p.kit.baixo !== 'nenhum') ch.nvSemBermuda = 1;
  }
  const extra = p.porContexto?.[contexto] || {};
  let acessorios = [...(p.acessorios || [])];
  for (const [de, para] of Object.entries(extra.trocar || {})) acessorios = acessorios.map((a) => (a === de ? para : a));
  acessorios.push(...(extra.mais || []));
  // Objeto do contexto: o que revela as moedas (baú, grimório, esfera) e a pipoca da sessão.
  // Entra antes dos outros para vencer a disputa pela mão naquele momento.
  const objeto = contexto === 'moedas' ? OBJETO_MOEDA[ESTILOS[p.estilo]?.moeda] : contexto === 'inicioSessao' ? 'pipoca' : null;
  if (objeto && ACESSORIOS[objeto]) acessorios.unshift(objeto);
  // Dois acessórios na mesma parte do corpo nunca: o primeiro de cada papel vence.
  const papeis = new Set();
  for (const a of acessorios) {
    const acc = ACESSORIOS[a];
    if (!acc || papeis.has(acc.papel)) continue;
    papeis.add(acc.papel);
    if (acc.papel === 'mao') delete ch[canalKit('mao', p.kit?.mao)];
    ch[canalAcessorio(a)] = 1;
  }
  // A esfera de energia só aparece quando a animação acende (akEnergia); pipoca, baú e afins também.
  if (p.extra && EFEITOS[p.extra] && CLIMAX.has(contexto)) ch[canalEfeito(p.extra)] = 1;
  return ch;
}

/** Contextos de clímax: só neles o efeito a mais do pacote aparece (o resto fica limpo). */
const CLIMAX = new Set(['disponivel', 'novaTemporada', 'encerramento', 'moedas', 'conquista']);

/** Objeto que materializa as JOJOcoins em cada jeito de revelar. */
const OBJETO_MOEDA = { bau: 'bauTesouro', grimorio: 'grimorio', energia: 'esferaChakra' };

/** Cores do pacote para o renderizador (chaves ak*). */
export const paletaDoPacote = (p) => paletaAnime(p.cores);

/**
 * Valida um pacote: estrutura, paleta, peças existentes, estilo com as 12 animações e
 * origem/permissão dos assets. Devolve { ok, erros, completo }.
 */
export function validarPacote(p, { itens = null } = {}) {
  const erros = [];
  if (!p || typeof p !== 'object') return { ok: false, erros: ['pacote ausente'], completo: false };
  if (!p.id || !p.nome) erros.push('sem identificador ou nome');
  if (!ESTILOS[p.estilo]) erros.push(`estilo desconhecido: ${p.estilo}`);
  for (const k of ['a', 'b', 'c', 'd', 'f1', 'f2']) if (!hexOk(p.cores?.[k])) erros.push(`cor ${k} inválida`);
  for (const a of p.acessorios || []) if (!ACESSORIOS[a]) erros.push(`acessório inexistente: ${a}`);
  if (p.extra && !EFEITOS[p.extra]) erros.push(`efeito inexistente: ${p.extra}`);
  if (p.kit) for (const [slot, o] of Object.entries(p.kit)) {
    if (o == null || slot === 'rosto') continue;
    if (KIT[slot] && !KIT[slot].includes(o)) erros.push(`peça do kit inexistente: ${slot}.${o}`);
  }
  const animacoes = CONTEXTO_IDS.map((c) => animAnime(p.estilo, c));
  if (itens) for (const a of animacoes) if (!itens.has(a)) erros.push(`animação ausente: ${a}`);
  const reconhecivel = p.origem === 'curado' || p.origem === 'visual' || (p.origem === 'composto' && p.completo);
  return { ok: erros.length === 0, erros, completo: erros.length === 0 && reconhecivel, animacoes };
}

/** Origem e permissão dos assets de todo pacote (arte vetorial original do projeto). */
export const ORIGEM_ASSETS = Object.freeze({
  autor: 'JoJo Companion (arte vetorial original, feita no código)',
  licenca: 'MIT, a mesma do projeto',
  observacao: 'Elementos genéricos e reconhecíveis do gênero (roupas, acessórios, efeitos), desenhados para o JoJo; nenhuma imagem, logotipo ou sprite oficial das obras.',
});

/**
 * Auditoria de cobertura: quantos animes têm pacote completo, incompleto, quais faltam, e as
 * animações disponíveis. `animes` = lista acompanhada + calendário; `itens` = ids do catálogo.
 */
export function auditarCobertura(animes, registro, itens) {
  const linhas = [];
  for (const a of animes) {
    const p = registro.doAnime(a);
    const v = validarPacote(p, { itens });
    linhas.push({ anime: a.id, titulo: a.titulo, pacote: p.id, origem: p.origem, estilo: p.estilo, completo: v.completo, erros: v.erros, pendencia: v.completo ? null : (p.pendencia || v.erros.join('; ')) });
  }
  const completos = linhas.filter((l) => l.completo).length;
  return {
    total: linhas.length, completos, incompletos: linhas.length - completos,
    cobertura: linhas.length ? Math.round((completos / linhas.length) * 1000) / 10 : 100,
    porOrigem: linhas.reduce((o, l) => ({ ...o, [l.origem]: (o[l.origem] || 0) + 1 }), {}),
    animacoes: ESTILO_IDS.length * CONTEXTOS.length, pendencias: linhas.filter((l) => !l.completo), linhas,
  };
}
