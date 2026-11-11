// Situações que sugerem médico. Regra do João (médico de verdade): qualquer
// sinal de que ela precisa de médico vai para ele; sinal de emergência vai
// também para o SAMU (192). Puro e testável; a fala vem do arquivo de falas.
import { modoCiencia } from './ciencia.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();

// Emergência: além do que o modo ciência já reconhece.
const EMERGENCIA = /\b(dor no peito|aperto no peito|pontada no peito|falta de ar|sem ar|nao consigo respirar|respirando mal|desmaie\w*|desmaiou|desmaio|vou desmaiar|apaguei|convuls\w*|sangramento (forte|muito|que nao para)|sangrando muito|nao para de sangrar|muito sangue|bati a cabeca e (vomitei|desmaiei|apaguei)|lado do rosto (caido|torto)|boca torta|nao sinto (o braco|a perna|o lado)|overdose|tomei (muitos|varios|a cartela)|engoli (veneno|produto)|garganta fechando|labios inchados)\b/;

// Sinais do corpo ou da cabeça que pedem médico.
const SINAIS = /\b(dor|dores|doendo|doi|doeu|enxaqueca|enjo\w*|tontura|tonta|zonza|mal[ -]estar|passando mal|vomit\w*|febre|gripad\w*|resfriad\w*|tosse|alergia|coceira|manchas? na pele|machuc\w*|machuq\w*|me cortei|cortei (o|a|meu|minha)|torci|quebrei (o|a|meu|minha) (pe|perna|braco|dedo|mao|pulso|nariz)|cai (da|de|do|no|na|e)|levei um tombo|bati (a|o|minha|meu) (cabeca|joelho|perna|braco|cotovelo|pe)|inchad\w*|sangr\w*|queimei|queimadura|infecc\w*|insonia|nao consigo dormir|nao durmo|panico|crise de ansiedade|ansiedade|remedio\w*|comprimido\w*|antibiotico|antialergico|dipirona|ibuprofeno|paracetamol|dorflex|neosaldina|buscopan|rivotril|clonazepam|ritalina|venvanse|fluoxetina|sertralina|escitalopram|dose)\b/;

// Ela falando de si (e não de um assunto de estudo).
const PESSOAL = /\b(eu|estou|esta|to|tou|me|meu|minha|comigo|tomei|tomar|tomo|posso|devo|sinto|senti|sentindo|ando|acordei|fiquei|passei|tenho|tive)\b/;
const ESTUDO = /^(?:jojo[, ]+)?(o que (e|sao|causa)|como funciona|qual a diferenca|explica|explique|me explica|por que|porque|quais (sao )?os sintomas)\b/;

const OUTRA_PESSOA = /\b(minha (mae|avo|irma|amiga|filha|tia|prima|gata|cachorra)|meu (pai|avo|irmao|amigo|filho|tio|primo|gato|cachorro))\b/;
const SOBRE_ELA = /\b(eu|estou|to|tou|comigo|me sinto|minha (dor|cabeca|barriga|perna|garganta))\b/;

/** 'emergencia' | 'medico' | null */
export function situacaoSaude(text) {
  const n = norm(text);
  if (!n) return null;
  const ciencia = modoCiencia(text);
  if (ciencia === 'emergencia' || EMERGENCIA.test(n)) return 'emergencia';
  // Saúde de outra pessoa: o modelo responde (a regra de saúde do prompt continua valendo).
  if (OUTRA_PESSOA.test(n) && !SOBRE_ELA.test(n)) return null;
  if (ciencia === 'pessoal') return 'medico';
  if (ESTUDO.test(n) && !SOBRE_ELA.test(n)) return null;
  if (SINAIS.test(n) && (PESSOAL.test(n) || n.split(' ').length <= 4)) return 'medico';
  return null;
}
