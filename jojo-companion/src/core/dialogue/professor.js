// Modo professor: antes de responder, classifica a seriedade da conversa e
// reconhece pedidos de continuidade ("não entendi essa parte", "me dá um exemplo",
// "aprofunda") para manter o assunto. Puro e testável.
import { normalizeText } from './scripted-provider.js';
import { modoCiencia } from '../ciencia.js';

const EMOCIONAL = /\b(to|tou|estou|ando|me sinto|sinto) (muito )?(triste|mal|sozinha|ansiosa|desesperada|perdida|pra baixo|deprimida|esgotada)\b|\bchorei|chorando|crise de (ansiedade|panico)|nao aguento mais (a vida|viver|nada)|me (magoou|machucou|traiu)\b/;
const TECNICO = /\b(como funciona|por que|porque|explica|explique|me explica|qual a diferenca|o que e|o que sao|algoritmo|codigo|programa|equacao|formula|teoria|conceito|calcula\w*|demonstra\w*|python|javascript|mne ?lab)\b/;

/**
 * Seriedade da mensagem, decidida ANTES de responder:
 * 'emergencia' | 'emocional' | 'medico' | 'cientifico' | 'tecnico' | 'casual'.
 */
export function classificarSeriedade(text) {
  const n = normalizeText(text);
  if (!n) return 'casual';
  const c = modoCiencia(text);
  if (c === 'emergencia') return 'emergencia';
  if (EMOCIONAL.test(n)) return 'emocional';
  if (c === 'pessoal') return 'medico';
  if (c === 'academico') return 'cientifico';
  if (TECNICO.test(n) && n.split(' ').length >= 3) return 'tecnico';
  return 'casual';
}

/** Pedido de continuidade sobre o assunto anterior: 'simplificar' | 'exemplo' | 'aprofundar' | 'resumir' | null. */
export function seguimento(text) {
  const n = normalizeText(text).replace(/^(jojo|ei|mas|e|entao|tipo)\s+/, '');
  if (!n || n.split(' ').length > 12) return null;
  if (/\b(nao entendi|nao entendo|nao ficou claro|como assim|explica (melhor|de novo|mais simples|de outro jeito)|mais simples|em portugues claro|traduz)\b/.test(n)) return 'simplificar';
  if (/\b(me da|da|tem|manda|quero|mostra) (um |uns |outro )?exemplos?\b|\bpor exemplo\b|\bexemplo pratico\b/.test(n)) return 'exemplo';
  if (/\b(aprofunda|aprofundar|mais (a )?fundo|mais detalhes?|detalha|continua|e depois|explica mais|fala mais)\b/.test(n)) return 'aprofundar';
  if (/\b(resume|resumo|resumindo|em uma frase|tl ?dr)\b/.test(n)) return 'resumir';
  return null;
}

const PEDIDO = {
  simplificar: 'Ela não entendeu. Reexplique o mesmo assunto mais simples, com uma analogia do dia a dia (academia, cozinha, tubarão).',
  exemplo: 'Ela pediu um exemplo. Dê um exemplo prático e concreto do mesmo assunto, com números se couber.',
  aprofundar: 'Ela pediu para aprofundar. Vá um nível mais técnico no mesmo assunto: mecanismo, limitações, erros comuns.',
  resumir: 'Ela pediu um resumo. Resuma o mesmo assunto em 2 frases.',
};

/** Instrução extra para o Qwen conforme a seriedade e a continuidade. */
export function instrucaoProfessor({ seriedade = 'casual', seg = null, tema = null } = {}) {
  const linhas = [];
  if (seriedade === 'emergencia') linhas.push('EMERGÊNCIA: sem piada, sem fantasia. Mande ligar para o SAMU 192 agora.');
  else if (seriedade === 'emocional') linhas.push('Assunto emocional delicado: sério e acolhedor, sem piada nem palavrão; se ela estiver chorando ou muito mal, diga para falar com o João.');
  else if (seriedade === 'medico') linhas.push('Saúde dela: sério, sem sarcasmo, sem diagnóstico nem receita; explique o que for útil e indique avaliação médica.');
  else if (seriedade === 'cientifico' || seriedade === 'tecnico' || seg) {
    linhas.push('MODO PROFESSOR: explique de verdade, com conteúdo (não só uma piada): o que é, como funciona, um exemplo concreto e o erro mais comum. Pode ser longo (até 8 frases). Mantenha o jeito do JoJo só no tempero (abertura/fecho), nunca no lugar da explicação.');
  }
  if (seg && tema) linhas.push(`Assunto em andamento: "${tema}". ${PEDIDO[seg]}`);
  return linhas.join('\n');
}
