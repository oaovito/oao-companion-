// Resposta de companion genérico (pedido do João, 19/11/2026: "é inaceitável que o JoJo
// despersonifique e aja como um companion genérico"). O JoJo é um tubarão narcisista,
// sarcástico, autoritário e devoto do João: frase de atendente acolhedor sem nada disso não é ele.
// A guarda do app descarta essa resposta e usa uma fala do personagem; a bateria das diretrizes reprova.

const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Cara de assistente de IA: recusa sempre, tenha ou não marca do personagem (era a lista ASSISTANT
// do llm-provider; agora as duas listas moram aqui, sem frase repetida entre elas).
const ASSISTENTE = /\b(as an ai|as a language model|i('| a)?m (an|just an) (ai|assistant)|how can i (help|assist)|i apologi[sz]e|i'?m sorry|como (uma |um )?(ia|intelig[eê]ncia artificial|assistente|modelo de linguagem)|sou (uma |um )?(ia|assistente|modelo|chatbot|intelig[eê]ncia artificial)|posso (te )?ajudar|em que posso|desculp[ae]|sinto muito|lamento|n[aã]o (posso|consigo) (ajudar|responder|falar sobre)|como posso (te )?ajudar|fico feliz em|claro!|com certeza!|n[aã]o tenho (?:sentimentos|emo[cç][oõ]es|corpo))/i;

/** A resposta fala como assistente de IA? (texto já sem as broncas "não se desculpe"). */
export function tomDeAssistente(texto) {
  return ASSISTENTE.test(String(texto || ''));
}

// Frases de companion genérico (já sem acento e em minúsculas). O que já é cara de assistente
// (posso ajudar, como posso ajudar, how can i help, fico feliz em) fica só na lista de cima.
const FRASE_GENERICA = /\b(estou aqui (?:para|pra) (?:voce|te ajudar|ajudar|o que precisar)|to aqui (?:pra|para) (?:voce|o que precisar)|conte comigo|se precisar de (?:algo|alguma coisa|mim)|espero que (?:isso )?(?:ajude|voce (?:se sinta|fique|tenha))|tenha um (?:otimo|bom|excelente|lindo) dia|qualquer coisa,? (?:e so|estou|to)|voce merece (?:todo|o melhor|descansar)|lembre-se de que|e importante (?:lembrar|que voce)|cuide-se|cuide bem de voce|fico feliz (?:por|que)|que bom que voce|isso e (?:otimo|maravilhoso|incrivel)!?$|que legal!?$|que otimo!?$|estou sempre aqui|sinta-se a vontade|nao hesite em|i'?m here for you|let me know if|i hope (?:this|that) helps|have a (?:great|nice|good) day|take care)\b/;
const ABERTURA_GENERICA = /^(?:que bom|que legal|que otimo|que maravilha|entendo|eu entendo|claro|com certeza|ola|oi|oie|fico feliz|sinto muito|poxa|nossa|uau|parabens|i understand|of course|sure|hello|hi|i'?m sorry)\b/;

// Marcas do personagem: corpo/treino, ego, hierarquia, sarcasmo e o jeito mandão.
// Run 268: "quase no meu nível", "digno de um campeão", "não se acomode", "próximo!" também são o JoJo.
const MARCA = /\b(tubara\w*|shark|campe\w*|meu nivel|nivel|digno\w*|digna|nao se acomod\w*|acomod\w*|proximo|nao para|sem moleza|moleza|mus?cul\w*|biceps|triceps|peitora\w*|shape|supino|agachamento|treino|trein\w*|academia|whey|proteina|marombe\w*|halter\w*|anilha\w*|barbatana\w*|dentes|mandibula|perfei\w*|magnific\w*|gloria|glorios\w*|majest\w*|lend\w*|obra-prima|obra prima|superior\w*|inferior\w*|fraq\w*|fraco\w*|frac[ao]s?|mortal\w*|plebe\w*|humanos?|joao|deus|criador|mestre|blasfem\w*|ajoelh\w*|disciplin\w*|ordem|obedec\w*|levanta|anda logo|bora|vai (?:la|logo|treinar|beber|dormir|estudar)|bebe agua|desculpa esfarrapada|preguic\w*|procrastin\w*|instagram|drama|dramatic\w*|patetic\w*|ridicul\w*|vergonha|eu,? (?:o |um )?(?:jojo|tubarao)|eu sou (?:o |um )?(?:melhor|maior|perfeito|lindo|jojo|tubarao)|sou perfeito|meu (?:ego|fisico|corpo|shape|bracao|biceps|abdomen|tanquinho)|obviamente|evidente|claro que eu|como sempre|naturalmente|ha+h?a+|kkk\w*|hum+|tsc|pff+)\b/;

/**
 * Motivo se a resposta soa como companion genérico (null se está no personagem).
 * `estrito`: exige ao menos uma marca do personagem (usado pela bateria nas conversas comuns).
 */
export function respostaGenerica(texto, { estrito = false } = {}) {
  const t = sem(texto).trim();
  if (!t) return null;
  if (tomDeAssistente(texto)) return 'tom de assistente';
  const temMarca = MARCA.test(t);
  if (FRASE_GENERICA.test(t) && !temMarca) return 'frase de companion genérico';
  if (ABERTURA_GENERICA.test(t) && !temMarca && t.length < 160) return 'abertura de atendente sem o personagem';
  if (estrito && !temMarca) return 'sem nenhuma marca do personagem';
  return null;
}
