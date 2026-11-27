// Originalidade das animações (pedido do João, 27/11/2026): "existe uma variação muito pequena de
// animações fazendo parecer que todos têm a mesma animação. Pras que se repetem cria animações
// novas. Usa palavras na tela [...] cada animação tem de ser originalidade."
//
// Duas peças:
//   1. COREOGRAFIA: uma biblioteca de batidas de corpo (BATIDAS), cada uma um movimento próprio
//      (salto tesoura, braços de robô, nadadeira de tubarão, maestro, pisão...). Uma animação
//      repetida ganha uma sequência de batidas só dela, somada por cima do que ela já fazia
//      (começa e termina em zero: o laço e a pose final continuam iguais). A combinação
//      (batidas + ordem + força) nunca se repete entre animações.
//   2. PALAVRAS NA TELA: cada animação nova escreve algo na tela, num formato desenhado aqui no
//      projeto (lousa de giz com uma fórmula inventada que explica a animação, grito em
//      estouro de quadrinho, legenda de documentário, placar de jurados, gráfico de barras,
//      etiqueta com seta, nuvem de pensamento e carimbo de desbloqueio). O texto nasce do
//      nome e do sentido da própria animação.
//
// Quais animações se repetem: a auditoria (scripts/originalidade.mjs) mede o movimento do
// corpo de todas e grava em assets/catalog/originalidade.json as que ficaram quase iguais a
// outra. Os shows dos visuais, memes BR e jogos ganham coreografia própria sempre.

import { evalTrack } from '../renderer/shared/animator.js';

const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const S = (u) => Math.sin(Math.PI * u); // sobe e desce (0 nas pontas)
const W = (u, n = 1) => Math.sin(2 * Math.PI * n * u); // onda completa (0 nas pontas)
const P = (u, a = 0.2, b = 0.8) => (u <= a ? u / a : u >= b ? (1 - u) / (1 - b) : 1); // entra, segura, sai
const E = (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));

// ------------------------------------------------------------------ batidas de corpo
// Cada batida devolve deltas por canal em função de u (0..1 dentro da janela) e da força k.
// Todos valem 0 em u=0 e u=1. `clima`: em que humores ela cabe.
export const BATIDAS = Object.freeze({
  saltoTesoura: { clima: ['alegre', 'energico', 'exibido'], f: (u, k) => ({ rootY: -20 * k * S(u), legBL: 26 * k * W(u), legBR: -26 * k * W(u), squashY: -0.06 * k * S(u * 2 % 1) }) },
  passoLateral: { clima: ['alegre', 'energico', 'exibido', 'pensativo'], f: (u, k) => ({ rootX: 12 * k * W(u), legBL: 14 * k * Math.max(0, W(u, 2)), legBR: 14 * k * Math.max(0, -W(u, 2)) }) },
  bracosDeRobo: { clima: ['alegre', 'energico', 'pensativo'], f: (u, k) => { const s = Math.floor(u * 6) % 3; const v = P(u, 0.08, 0.92); return { legFL: v * k * [0, 70, 30][s], legFR: v * k * [70, 0, 30][s], elbowL: v * k * [90, 0, 60][s], elbowR: v * k * [0, 90, 60][s], headRot: v * k * [-8, 8, 0][s] }; } },
  socoDuplo: { clima: ['bravo', 'energico'], f: (u, k) => ({ legFR: 85 * k * Math.max(0, S(Math.min(1, u * 2))), elbowR: -10 * k * Math.max(0, S(Math.min(1, u * 2))), legFL: 85 * k * Math.max(0, S(Math.max(0, u * 2 - 1))), rootRot: 5 * k * W(u), jaw: 0.4 * S(u) }) },
  nadadeira: { clima: ['alegre', 'calmo', 'energico', 'exibido'], f: (u, k) => ({ legFL: 40 * k * S(u) * (0.6 + 0.4 * W(u, 3)), legFR: 40 * k * S(u) * (0.6 - 0.4 * W(u, 3)), rootRot: 4 * k * W(u, 1.5), rootY: -4 * k * S(u) }) },
  batePeito: { clima: ['bravo', 'exibido', 'energico'], f: (u, k) => ({ legFL: 50 * k * P(u), legFR: 50 * k * P(u), elbowL: 120 * k * P(u), elbowR: 120 * k * P(u), rootY: -3 * k * Math.abs(W(u, 3)), squashX: 0.05 * k * Math.abs(W(u, 3)) }) },
  continencia: { clima: ['exibido', 'pensativo', 'calmo'], f: (u, k) => ({ legFR: 140 * k * P(u, 0.15, 0.85), elbowR: 110 * k * P(u, 0.2, 0.8), headRot: -5 * k * P(u), squashY: 0.04 * k * P(u) }) },
  reverencia: { clima: ['calmo', 'exibido', 'triste', 'pensativo'], f: (u, k) => ({ rootRot: 16 * k * P(u, 0.3, 0.7), headRot: 10 * k * P(u, 0.3, 0.7), legFR: 50 * k * P(u, 0.3, 0.7), elbowR: 70 * k * P(u, 0.3, 0.7) }) },
  ombrinhos: { clima: ['pensativo', 'triste', 'alegre'], f: (u, k) => ({ legFL: -14 * k * Math.abs(W(u, 2)), legFR: -14 * k * Math.abs(W(u, 2)), headRot: 9 * k * S(u), rootY: -2 * k * Math.abs(W(u, 2)) }) },
  ondaBracos: { clima: ['alegre', 'calmo', 'exibido'], f: (u, k) => ({ legFL: 60 * k * Math.max(0, S(Math.min(1, u * 1.6))), legFR: 60 * k * Math.max(0, S(Math.max(0, u * 1.6 - 0.6))), elbowL: 40 * k * W(u, 2) * S(u), elbowR: -40 * k * W(u, 2) * S(u) }) },
  preparaSoco: { clima: ['bravo', 'energico'], f: (u, k) => ({ rootRot: (u < 0.6 ? -10 * k * E(u / 0.6) : -10 * k * (1 - (u - 0.6) / 0.4)), legFR: (u < 0.6 ? -25 * k * E(u / 0.6) : 100 * k * S((u - 0.6) / 0.4)), browAngry: S(u) }) },
  bicepsPulsando: { clima: ['exibido', 'energico', 'bravo'], f: (u, k) => ({ legFL: 90 * k * P(u), legFR: 90 * k * P(u), elbowL: (100 + 14 * W(u, 4)) * k * P(u), elbowR: (100 - 14 * W(u, 4)) * k * P(u), squashX: 0.06 * k * Math.abs(W(u, 4)) * P(u) }) },
  balancaCabeca: { clima: ['energico', 'bravo', 'alegre'], f: (u, k) => ({ headRot: 13 * k * W(u, 4) * S(u), rootY: 2 * k * Math.abs(W(u, 4)) }) },
  saltitar: { clima: ['alegre', 'energico'], f: (u, k) => ({ rootY: -9 * k * Math.abs(W(u, 2)), legBL: 18 * k * Math.max(0, W(u, 2)), legBR: 18 * k * Math.max(0, -W(u, 2)), rootX: 6 * k * W(u) }) },
  rebolinho: { clima: ['alegre', 'exibido'], f: (u, k) => ({ rootRot: 6 * k * W(u, 4) * S(u), rootX: 4 * k * W(u, 4) * S(u) }) },
  pisao: { clima: ['bravo', 'energico'], f: (u, k) => ({ legBR: 30 * k * S(Math.min(1, u * 1.6)), squashY: u > 0.62 ? -0.09 * k * S((u - 0.62) / 0.38) : 0, rootX: u > 0.62 ? 2 * k * W((u - 0.62) / 0.38, 3) : 0, browAngry: S(u) }) },
  risadaPraTras: { clima: ['alegre', 'exibido'], f: (u, k) => ({ rootRot: -11 * k * P(u), headRot: -12 * k * P(u), jaw: 0.6 * P(u) * (0.7 + 0.3 * W(u, 5)), happyEyes: P(u), legFL: 20 * k * P(u), legFR: 20 * k * P(u) }) },
  maosNaCintura: { clima: ['bravo', 'exibido', 'pensativo'], f: (u, k) => ({ legFL: 34 * k * P(u), legFR: 34 * k * P(u), elbowL: 135 * k * P(u), elbowR: 135 * k * P(u), headRot: 6 * k * W(u, 2) * P(u) }) },
  apontaCeu: { clima: ['exibido', 'energico', 'alegre'], f: (u, k) => ({ legFR: 158 * k * P(u, 0.2, 0.75), elbowR: -8 * k * P(u), headRot: -10 * k * P(u), rootY: -5 * k * P(u) }) },
  maestro: { clima: ['calmo', 'exibido', 'pensativo'], f: (u, k) => ({ legFR: (60 + 30 * Math.sin(6 * Math.PI * u)) * k * P(u), elbowR: (60 + 30 * Math.cos(6 * Math.PI * u)) * k * P(u), headRot: 5 * k * W(u, 3) * P(u), eyeOpen: -0.4 * P(u) }) },
  farejar: { clima: ['pensativo', 'calmo', 'medo'], f: (u, k) => ({ headRot: (-6 + 3 * W(u, 6)) * k * P(u), rootX: 5 * k * P(u), rootRot: 4 * k * P(u) }) },
  tontura: { clima: ['medo', 'triste', 'pensativo'], f: (u, k) => ({ rootRot: 9 * k * W(u, 1.5) * S(u), headRot: -10 * k * W(u, 1.5) * S(u), eyeOpen: -0.35 * S(u), rootX: 4 * k * W(u, 1.5) * S(u) }) },
  hula: { clima: ['alegre', 'calmo', 'exibido'], f: (u, k) => ({ rootX: 7 * k * Math.sin(6 * Math.PI * u) * S(u), rootRot: 5 * k * Math.cos(6 * Math.PI * u) * S(u), legFL: 40 * k * S(u), legFR: 40 * k * S(u) }) },
  olhaOsLados: { clima: ['pensativo', 'medo', 'calmo'], f: (u, k) => ({ headRot: (u < 0.5 ? -15 : 15) * k * S((u * 2) % 1), pupilX: (u < 0.5 ? -0.8 : 0.8) * S((u * 2) % 1) }) },
  pensador: { clima: ['pensativo', 'calmo', 'triste'], f: (u, k) => ({ legFR: 64 * k * P(u), elbowR: 148 * k * P(u), headRot: 8 * k * P(u), eyeOpen: -0.25 * P(u), rootRot: 3 * k * P(u) }) },
  palmas: { clima: ['alegre', 'energico', 'exibido'], f: (u, k) => ({ legFL: 46 * k * P(u, 0.12, 0.88), legFR: 46 * k * P(u, 0.12, 0.88), elbowL: (80 + 30 * Math.abs(W(u, 5))) * k * P(u, 0.12, 0.88), elbowR: (80 + 30 * Math.abs(W(u, 5))) * k * P(u, 0.12, 0.88), happyEyes: P(u) }) },
  arminha: { clima: ['exibido', 'alegre', 'bravo'], f: (u, k) => ({ legFR: 82 * k * P(u), elbowR: (u > 0.5 && u < 0.62 ? -18 : 0) * k, rootRot: (u > 0.5 && u < 0.62 ? -3 : 0) * k, headRot: -4 * k * P(u) }) },
  giroRapido: { clima: ['alegre', 'energico', 'exibido'], f: (u, k) => ({ squashX: Math.cos(2 * Math.PI * E(u)) - 1, rootY: -6 * k * S(u) }) },
  molaAgachada: { clima: ['energico', 'alegre', 'medo'], f: (u, k) => ({ squashY: u < 0.4 ? -0.12 * k * S(u / 0.4 / 2) : -0.12 * k * (1 - E((u - 0.4) / 0.15 > 1 ? 1 : (u - 0.4) / 0.15)) * (u < 0.55 ? 1 : 0), rootY: u > 0.4 ? -24 * k * S((u - 0.4) / 0.6) : 0, legBL: u > 0.4 ? 12 * k * S((u - 0.4) / 0.6) : 0, legBR: u > 0.4 ? 12 * k * S((u - 0.4) / 0.6) : 0 }) },
  chute: { clima: ['bravo', 'energico'], f: (u, k) => ({ legBR: 46 * k * Math.max(0, S(Math.min(1, (u - 0.3) / 0.4))) * (u > 0.3 ? 1 : 0), rootRot: -6 * k * S(u), legFL: 30 * k * S(u) }) },
  abracoNoAr: { clima: ['calmo', 'alegre', 'triste'], f: (u, k) => ({ legFL: 72 * k * P(u), legFR: 72 * k * P(u), elbowL: 128 * k * P(u), elbowR: 128 * k * P(u), rootRot: 5 * k * W(u, 2) * P(u), happyEyes: 0.8 * P(u) }) },
  arrepio: { clima: ['medo', 'triste'], f: (u, k) => ({ rootX: 2.2 * k * W(u, 12) * S(u), squashY: -0.03 * k * S(u), legFL: -10 * k * S(u), legFR: -10 * k * S(u) }) },
  narizEmPe: { clima: ['exibido', 'calmo'], f: (u, k) => ({ rootY: -9 * k * P(u, 0.3, 0.7), headRot: -9 * k * P(u), eyeOpen: -0.5 * P(u), legFL: 24 * k * P(u), legFR: 24 * k * P(u) }) },
  correrParado: { clima: ['energico', 'medo'], f: (u, k) => ({ legBL: 24 * k * W(u, 6) * S(u), legBR: -24 * k * W(u, 6) * S(u), legFL: 40 * k * W(u, 6) * S(u), legFR: -40 * k * W(u, 6) * S(u), rootY: -3 * k * Math.abs(W(u, 6)) }) },
  batucada: { clima: ['alegre', 'energico'], f: (u, k) => ({ legFL: 44 * k * P(u), legFR: 44 * k * P(u), elbowL: (70 + 30 * Math.max(0, W(u, 6))) * k * P(u), elbowR: (70 + 30 * Math.max(0, -W(u, 6))) * k * P(u), headRot: 4 * k * W(u, 3) }) },
  escorregao: { clima: ['medo', 'alegre', 'triste'], f: (u, k) => ({ rootX: 14 * k * S(u), rootRot: 14 * k * S(Math.min(1, u * 1.4)), legBL: -20 * k * S(u), legFL: 60 * k * S(u), legFR: 60 * k * S(u), jaw: 0.5 * S(u) }) },
  aceninhoDuplo: { clima: ['calmo', 'alegre', 'pensativo', 'triste'], f: (u, k) => ({ headRot: 7 * k * Math.max(0, W(u, 2)), legFR: 30 * k * S(u), elbowR: 40 * k * S(u) }) },
  encolher: { clima: ['triste', 'medo', 'calmo'], f: (u, k) => ({ squashY: -0.07 * k * P(u), rootY: 4 * k * P(u), headRot: 7 * k * P(u), legFL: -6 * k * P(u), legFR: -6 * k * P(u), eyeOpen: -0.3 * P(u) }) },
  espreguicarLongo: { clima: ['calmo', 'triste'], f: (u, k) => ({ legFL: 150 * k * P(u, 0.35, 0.7), legFR: 150 * k * P(u, 0.35, 0.7), squashY: 0.06 * k * P(u, 0.35, 0.7), jaw: 0.8 * P(u, 0.35, 0.7), eyeOpen: -0.6 * P(u, 0.35, 0.7) }) },
});
export const BATIDA_IDS = Object.freeze(Object.keys(BATIDAS));

// Limites de canais de rosto (a soma nunca sai do que o desenho aceita).
const LIMITES = { jaw: [0, 1.15], eyeOpen: [0, 1.2], happyEyes: [0, 1], browAngry: [0, 1], pupilX: [-1, 1], squashX: [-1, 1.4], squashY: [0.7, 1.3] };

// ------------------------------------------------------------------ humor (clima) de cada animação

export const CLIMAS = ['alegre', 'energico', 'exibido', 'bravo', 'pensativo', 'calmo', 'triste', 'medo'];
const CLIMA_CATEGORIA = {
  negativas: 'bravo', bronca: 'bravo', provocacao: 'bravo', travessuras: 'exibido', vaidade: 'exibido', flerte: 'exibido', descarado: 'exibido',
  drama: 'triste', preguica: 'calmo', base: 'calmo', presenca: 'calmo', atencao: 'pensativo', foco: 'pensativo', timer: 'pensativo',
  positivas: 'alegre', social: 'alegre', interacao: 'alegre', reacoes: 'alegre', comida: 'alegre', eventos: 'energico', acoes: 'energico',
  estimulo: 'energico', corpo: 'exibido', especiais: 'energico', jogos: 'energico', rpg: 'energico', loja: 'exibido', clima: 'calmo',
};
const CLIMA_HUMOR = { raiva: 'bravo', tristeza: 'triste', medo: 'medo', cansaco: 'calmo', vergonha: 'triste', ligado: 'energico', nojo: 'bravo', alegria: 'alegre' };
const CLIMA_GESTO = { apontar: 'bravo', grito: 'bravo', assusta: 'medo', confusa: 'pensativo', preguica: 'calmo', flexao: 'exibido', ginga: 'exibido', samba: 'alegre', pulo: 'energico', giro: 'alegre', acena: 'alegre', brinde: 'alegre', incha: 'energico', explica: 'pensativo', asas: 'alegre' };

/** Humor dominante de um item do catálogo ou de um visual (para escolher batidas e palavras). */
export function climaDe(x = {}) {
  if (x.clima && CLIMAS.includes(x.clima)) return x.clima;
  const humor = x.receita?.humor || {};
  const forte = Object.entries(humor).sort((a, b) => b[1] - a[1])[0];
  if (forte && CLIMA_HUMOR[forte[0]] && forte[1] >= 0.3) return CLIMA_HUMOR[forte[0]];
  if (x.meme?.gesto && CLIMA_GESTO[x.meme.gesto]) return CLIMA_GESTO[x.meme.gesto];
  if (/sono|dorm|cochil|zzz|ronc/i.test(`${x.id} ${x.nome}`)) return 'calmo';
  if (/medo|susto|fantasma|panico|pânico/i.test(`${x.id} ${x.nome}`)) return 'medo';
  if (/triste|chor|decep|luto|desesp/i.test(`${x.id} ${x.nome}`)) return 'triste';
  return CLIMA_CATEGORIA[x.categoria] || 'alegre';
}

// ------------------------------------------------------------------ palavras na tela

export const FORMATOS = Object.freeze(['lousa', 'grito', 'legenda', 'placar', 'grafico', 'seta', 'pensamento']);

// Material de texto (escrito para o JoJo; nenhuma frase copiada de outra animação ou meme).
const FATORES = {
  alegre: ['alegria', 'dancinha', 'sorriso', 'confete', 'vibe'], energico: ['proteína', 'cafeína', 'pré-treino', 'adrenalina', 'joelho'],
  exibido: ['marra', 'bíceps', 'carisma', 'shape', 'brilho'], bravo: ['paciência', 'raiva', 'bronca', 'olhar feio', 'veia'],
  pensativo: ['neurônio', 'dúvida', 'teoria', 'contexto', 'lógica'], calmo: ['preguiça', 'sono', 'sofá', 'paz', 'travesseiro'],
  triste: ['drama', 'lágrima', 'saudade', 'bico', 'suspiro'], medo: ['susto', 'pânico', 'escuro', 'arrepio', 'grito'],
};
const RESULTADOS = {
  alegre: ['festa', 'felicidade²', 'tubarão feliz', 'dia ganho'], energico: ['TÁ PAGO', 'lenda', 'monstro', 'recorde'],
  exibido: ['∞', 'perfeição', 'ícone', 'obra-prima'], bravo: ['caos', 'zero', 'bronca', 'fim da linha'],
  pensativo: ['42?', 'eureka', 'talvez', 'hipótese'], calmo: ['cochilo', 'zen', 'nada', 'soneca'],
  triste: ['bico', 'chuva', '0,5', 'dramalhão'], medo: ['fuga', 'socorro', 'vish', 'ninguém viu'],
};
const GRITOS = {
  alegre: ['AÊÊ!', 'BORA!', 'ISSO AÍ!', 'QUE DELÍCIA!'], energico: ['VAAAI!', 'TÁ PAGO!', 'BOOM!', 'SEGURA!'],
  exibido: ['BRABO.', 'OLHA ISSO.', 'ÓBVIO.', 'APLAUSOS.'], bravo: ['OXE!', 'AFF.', 'SÉRIO?!', 'CHEGA!'],
  pensativo: ['UÉ?', 'PERA…', 'HMMM?', 'COMO ASSIM?'], calmo: ['hm.', 'zen…', 'tranquilo.', 'shhh.'],
  triste: ['poxa…', 'ai, ai.', 'snif.', 'tá bom…'], medo: ['VISH!', 'EITA!', 'SOCORRO!', 'NEM VEM!'],
};
const LEGENDAS = {
  alegre: 'comemorando sem motivo aparente', energico: 'gastando energia que ninguém pediu', exibido: 'exibindo o shape em habitat natural',
  bravo: 'demonstrando insatisfação territorial', pensativo: 'processando uma ideia complexa', calmo: 'economizando energia com dignidade',
  triste: 'fazendo drama para a câmera', medo: 'reagindo a uma ameaça imaginária',
};
const PENSAMENTOS = { alegre: '♪ ♪', energico: '!!!', exibido: '★', bravo: '#@$%', pensativo: '?', calmo: '…', triste: '…;(', medo: '!?' };
const FORMULAS = [
  (a, b, r) => `${a}² + ${b} = ${r}`,
  (a, b, r) => `∫ ${a} d${b} = ${r}`,
  (a, b, r) => `lim ${a}→∞ = ${r}`,
  (a, b, r) => `√(${a} × ${b}) ≈ ${r}`,
  (a, b, r) => `Δ${a} ÷ Δ${b} = ${r}`,
  (a, b, r) => `Σ ${a} ≥ ${r}`,
  (a, b, r) => `${a} ∝ 1/${b}`,
  (a, b, r) => `f(${a}) = ${r}!`,
];
const CONCLUSOES = {
  alegre: 'logo, dança', energico: 'logo, treino', exibido: 'logo, sou lindo', bravo: 'logo, bronca', pensativo: 'logo, sei lá',
  calmo: 'logo, deita', triste: 'logo, drama', medo: 'logo, corre',
};

const curto = (s, n = 16) => { const t = String(s || '').replace(/^(Fantasia: )/, '').trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t; };
const escolha = (lista, h) => lista[h % lista.length];

/**
 * Palavras na tela de uma animação: {tipo, linhas, clima, numeros?, t0, t1}. `nome` é o nome da
 * animação (ou da peça), `clima` o humor dela; tudo determinístico pelo `id`.
 */
export function palavrasPara({ id, nome, clima = 'alegre', tipo = null, t0 = 0.2, t1 = 0.86 }) {
  const h = hash(`palavras:${id}`);
  const fmt = tipo || FORMATOS[h % FORMATOS.length];
  const fat = FATORES[clima] || FATORES.alegre;
  const res = RESULTADOS[clima] || RESULTADOS.alegre;
  const n = curto(nome).toLowerCase();
  const base = { tipo: fmt, clima, t0, t1 };
  switch (fmt) {
    case 'lousa': {
      const a = escolha(fat, h >>> 3), b = escolha(fat.filter((x) => x !== a), h >>> 6), r = escolha(res, h >>> 9);
      return { ...base, linhas: [escolha(FORMULAS, h >>> 12)(a, b, r), `∴ ${n}, ${CONCLUSOES[clima] || 'logo, sim'}`] };
    }
    case 'grito': return { ...base, linhas: [escolha(GRITOS[clima] || GRITOS.alegre, h >>> 4)] };
    case 'legenda': return { ...base, linhas: [`Fig. ${(h % 97) + 2} — ${curto(nome, 22)}`, `Tubarão ${LEGENDAS[clima] || LEGENDAS.alegre}.`] };
    case 'placar': return { ...base, linhas: [curto(nome, 20)], numeros: [[9.5, 9.8, 10, 8.7, 9.9][h % 5], [10, 9.6, 9.1, 10, 9.4][(h >>> 3) % 5], ['∞', '10', '11', '9,9', '12'][(h >>> 6) % 5]] };
    case 'grafico': {
      const a = escolha(fat, h >>> 3), b = escolha(fat.filter((x) => x !== a), h >>> 7);
      return { ...base, linhas: [curto(nome, 20), a, b], numeros: [0.55 + ((h >>> 11) % 40) / 100, 0.12 + ((h >>> 15) % 30) / 100] };
    }
    case 'seta': return { ...base, linhas: [`${escolha(fat, h >>> 5)}: ${escolha(['100%', 'nível máximo', 'detectado', 'transbordando', 'acima do normal'], h >>> 9)}`] };
    case 'pensamento': return { ...base, linhas: [PENSAMENTOS[clima] || '?', curto(nome, 18)] };
    default: return { ...base, linhas: [curto(nome, 20)] };
  }
}

/** Carimbo de desbloqueio: o nome da coisa liberada entra na hora (`{nome}` vem do estado). */
export function palavrasDesbloqueio({ t0 = 0.12, t1 = 0.95 } = {}) {
  return { tipo: 'carimbo', clima: 'exibido', linhas: ['DESBLOQUEADO', '{nome}'], t0, t1 };
}

// ------------------------------------------------------------------ coreografia

/** Sequência de batidas própria (2 ou 3) para o humor, sem repetir combinação já usada. */
export function escolherCoreografia(id, clima, usados = new Set(), n = null) {
  const pool = BATIDA_IDS.filter((b) => BATIDAS[b].clima.includes(clima));
  const lista = pool.length >= 4 ? pool : BATIDA_IDS;
  const forcas = [0.8, 1, 1.25];
  let h = hash(`coreo:${id}`);
  for (let tent = 0; tent < 5000; tent++, h = (Math.imul(h, 1103515245) + 12345) >>> 0) {
    const qtd = n || (h % 3 === 0 ? 3 : 2);
    const seq = [];
    let x = h;
    while (seq.length < qtd) { const b = lista[x % lista.length]; if (!seq.includes(b)) seq.push(b); x = Math.floor(x / lista.length) + 7919 * (seq.length + 1); }
    const k = forcas[(h >>> 20) % forcas.length];
    const assin = `${seq.join('+')}@${k}`;
    if (usados.has(assin)) continue;
    usados.add(assin);
    return { batidas: seq, forca: k };
  }
  return { batidas: [lista[0], lista[1]], forca: 1 };
}

/**
 * Soma a coreografia nos canais da animação dentro de [t0, t1] (cada batida numa fatia). As
 * trilhas mexidas viram quadros densos (1/72) para o movimento novo sair liso; o resto fica igual.
 */
export function aplicarCoreografia(tracks, { batidas, forca = 1 }, { t0 = 0.18, t1 = 0.84, base = {}, escala = 1 } = {}) {
  const fatias = batidas.map((b, i) => [b, t0 + ((t1 - t0) * i) / batidas.length, t0 + ((t1 - t0) * (i + 1)) / batidas.length]);
  const canais = new Set();
  for (const [b] of fatias) for (const ch of Object.keys(BATIDAS[b].f(0.5, 1))) canais.add(ch);
  const out = { ...tracks };
  const PASSO = 1 / 72;
  for (const ch of canais) {
    const velho = tracks[ch];
    const repouso = base[ch] ?? (ch === 'squashX' || ch === 'squashY' || ch === 'scale' || ch === 'eyeOpen' ? 1 : 0);
    const chaves = [];
    for (let t = 0; t <= 1 + 1e-9; t += PASSO) {
      const tt = Math.min(1, t);
      let v = velho ? evalTrack(velho, tt, repouso) : repouso;
      for (const [b, a, z] of fatias) {
        if (tt <= a || tt >= z) continue;
        const d = BATIDAS[b].f((tt - a) / (z - a), forca * escala)[ch];
        if (Number.isFinite(d)) v += d;
      }
      const lim = LIMITES[ch];
      if (lim) v = Math.max(lim[0], Math.min(lim[1], v));
      chaves.push([Math.round(tt * 10000) / 10000, Math.round(v * 1000) / 1000, 'linear']);
    }
    out[ch] = chaves;
  }
  return out;
}

// ------------------------------------------------------------------ aplicação no conjunto

const INTENS = { suave: 0.6, normal: 1, exagerado: 1.4 };

/**
 * Animações repetidas (lista da auditoria) ganham coreografia própria e palavras na tela.
 * `itens`: itens do catálogo (id → nome/categoria/receita). Não altera o objeto recebido.
 */
export function comOriginalidade(anims, { repetidas = [], itens = [], sal = {} } = {}) {
  if (!repetidas.length) return anims;
  const porId = new Map(itens.map((it) => [it.id, it]));
  const animations = { ...anims.animations };
  const usados = new Set();
  for (const nome of repetidas) {
    const base = animations[nome];
    if (!base || !/^cat_/.test(nome)) continue;
    const id = nome.replace(/^cat_/, '');
    const it = porId.get(id) || { id, nome: id };
    const clima = climaDe(it);
    const coreo = escolherCoreografia(sal[nome] ? `${nome}#${sal[nome]}` : nome, clima, usados);
    const palavras = palavrasPara({ id: nome, nome: it.nome || id, clima });
    for (const [suf, k] of Object.entries(INTENS)) {
      const n = suf === 'normal' ? nome : `${nome}~${suf}`;
      const a = animations[n];
      if (!a) continue;
      const base = { ...(anims.channels || {}), ...((a.base && anims.poses?.[a.base]) || {}) };
      animations[n] = { ...a, tracks: aplicarCoreografia(a.tracks || {}, coreo, { escala: k, base }), palavras, coreografia: coreo.batidas };
    }
  }
  return { ...anims, animations };
}
