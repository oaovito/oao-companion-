// Atributos do RPG do JoJo (0.48). Cada atributo tem um efeito real e medido,
// com retorno decrescente (nada explode com o nível). Puro, sem estado.
//
// Regra irredutível: Inteligência do RPG NUNCA limita a conversa. Ela só mexe
// em XP de estudo, dicas de quiz e sucesso em desafios intelectuais das
// expedições. O prompt, o modelo e a memória não leem nada daqui.

export const ATRIBUTOS = Object.freeze([
  { id: 'forca', nome: 'Força', desc: 'Desafios físicos nas expedições e o cabo de guerra.', efeito: 'sucessoFisico' },
  { id: 'inteligencia', nome: 'Inteligência', desc: 'XP de estudo e quiz, dicas e desafios intelectuais (nunca limita a conversa).', efeito: 'xpEstudo' },
  { id: 'agilidade', nome: 'Agilidade', desc: 'Expedições mais curtas e fuga de perigos.', efeito: 'duracaoExp' },
  { id: 'resistencia', nome: 'Resistência', desc: 'Sede e energia caem mais devagar; desafios de sobrevivência.', efeito: 'quedaVida' },
  { id: 'carisma', nome: 'Carisma', desc: 'Vínculo cresce mais rápido e negociações nas expedições.', efeito: 'vinculoGanho' },
  { id: 'sorte', nome: 'Sorte', desc: 'Chance de achados raros e de desfechos bons nos eventos.', efeito: 'sorteLoot' },
  { id: 'vitalidade', nome: 'Vitalidade', desc: 'Doenças passam mais rápido e a energia volta mais depressa.', efeito: 'cura' },
  { id: 'sabedoria', nome: 'Sabedoria', desc: 'XP de missões e escolhas melhores nas aventuras.', efeito: 'xpMissao' },
  { id: 'disciplina', nome: 'Disciplina', desc: 'XP de foco e timers; o tédio sobe mais devagar.', efeito: 'xpFoco' },
  { id: 'percepcao', nome: 'Percepção', desc: 'Encontrar segredos, tesouros e pistas.', efeito: 'chanceSegredo' },
]);

export const IDS_ATRIBUTOS = ATRIBUTOS.map((a) => a.id);
export const BASE_ATRIBUTO = 5;
/** Teto de pontos investidos por atributo (níveis + paragon); a base fica fora. */
export const TETO_ATRIBUTO = 150;

/** Retorno decrescente: 0 → 0; 50 → 0,5; 150 → 0,75 do máximo. */
export const curva = (v) => Math.max(0, v) / (Math.max(0, v) + 50);

/** Valor final do atributo: base + pontos + bônus (habilidades, artefatos, especialização). */
export function valorAtributo(id, investidos = {}, bonus = {}) {
  return BASE_ATRIBUTO + Math.min(TETO_ATRIBUTO, investidos[id] || 0) + (bonus[id] || 0);
}

/**
 * Efeitos medidos dos atributos. Os números são os tetos de cada efeito.
 * Ex.: agilidade 55 (base 5 + 50) → curva(55) = 0,52 → expedições 16% mais curtas.
 */
export function efeitosDosAtributos(v) {
  const c = (id) => curva((v[id] ?? BASE_ATRIBUTO) - BASE_ATRIBUTO);
  return {
    sucessoFisico: 0.3 * c('forca'),
    sucessoMental: 0.3 * c('inteligencia'),
    xpEstudo: 0.25 * c('inteligencia'),
    dicasQuiz: Math.floor(3 * c('inteligencia')),
    duracaoExp: 0.3 * c('agilidade'),
    fuga: 0.3 * c('agilidade'),
    quedaVida: 0.3 * c('resistencia'),
    sucessoSobrevivencia: 0.3 * c('resistencia'),
    vinculoGanho: 0.3 * c('carisma'),
    sucessoSocial: 0.3 * c('carisma'),
    sorteLoot: 0.15 * c('sorte'),
    desfechoBom: 0.2 * c('sorte'),
    cura: 0.4 * c('vitalidade'),
    energiaRecupera: 0.3 * c('vitalidade'),
    xpMissao: 0.25 * c('sabedoria'),
    escolhaSabia: 0.2 * c('sabedoria'),
    xpFoco: 0.25 * c('disciplina'),
    tedioSobe: 0.3 * c('disciplina'),
    chanceSegredo: 1 * c('percepcao'),
    pista: 0.3 * c('percepcao'),
  };
}
