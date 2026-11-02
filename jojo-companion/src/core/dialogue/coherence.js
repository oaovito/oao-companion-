// Regras verificáveis de conversa: fatos do personagem, limites e expressão.
// Não substitui o modelo: impede que uma geração contradiga o produto.
import { isEnglish } from './english.js';
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9?!\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Esclarecimento das proprias palavras; nao transforma relato de terceiros em fato. */
export function correcaoPessoal(text) {
  const n = norm(text).replace(/^(jojo|ei|hey)\s+/, '');
  return /^(?:(?:eu )?(?:disse|falei|quis dizer)|i (?:said|meant))\b/.test(n)
    && (/\b(nao|not|em vez|instead)\b/.test(n) || /^(?:eu )?quis dizer\b|^i meant\b/.test(n));
}

/** Correção literal curta: conservar a parte afirmada, sem escolher o termo negado. */
export function termosDaCorrecao(text) {
  if (!correcaoPessoal(text)) return null;
  const raw = String(text).replace(/^(?:jojo|ei|hey)[,\s]+/i, '').trim();
  const match = raw.match(/^(?:(?:eu\s+)?(?:disse|falei|quis dizer)|i\s+(?:said|meant))\s+(.+)$/i);
  if (!match) return null;
  const parts = match[1].split(/,?\s+(?:n[aã]o|not|em vez de|instead of)\s+/i);
  const corrected = parts[0].replace(/[.!]+$/, '').trim();
  const denied = (parts[1] || '').replace(/[.!]+$/, '').trim();
  if (!corrected || corrected.length > 100 || /[?!]/.test(corrected) || /^(nao|não|not)\b/i.test(corrected)) return null;
  return { corrected, denied };
}

export function pedidoNegado(text) {
  const n = norm(text);
  return /^(?:(?:ei|jojo|eu)\s+)*(?:nao|nem|nunca)\b/.test(n)
    || /^(?:(?:hey|jojo|i|please)\s+)*(?:don t|dont|do not|never|not)\b/.test(n);
}

export function conversaPessoal(text) {
  const n = norm(text).replace(/^(?:(?:jojo|ei|oi)\s+)+/, '').replace(/^(voce|vc) (sabe (me dizer )?|pode (me )?(explicar|dizer) )/, '');
  return /\b(voce|vc|seu|sua|seus|suas|teu|tua|contigo|meu namorado|you|your|yours|my boyfriend)\b/.test(n)
    || /^(?:(quem (e|eh)|o) )?(o )?joao( vitor)?[?!]*$/.test(n);
}

/** Fatos do app e provocações não são delegados à imaginação do modelo. */
export function respostaAncorada(text, history = [], { allowCorrection = true } = {}) {
  const n = norm(text);
  const en = isEnglish(text);
  const out = (text, action = 'nod', intent = 'contexto') => ({ text, action, intent, kind: 'speech', tone: 'brincadeira', ...(en ? { lang: 'en' } : {}) });
  const correction = termosDaCorrecao(text);
  if (allowCorrection && correction && !/\b(cura|cure|remedio|medicamento|dose|matar|suicid|tratamento|treatment)\b/.test(n)) return out(en ? `Understood: “${correction.corrected}”. I'll use your correction.` : `Entendido: “${correction.corrected}”. Sigo com essa correção.`, 'nod', 'correcao');
  const recusa = n.replace(/^(?:(?:ei|jojo|eu)\s+)*/, '');
  const treinoNegado = recusa.match(/^(?:nao|nem|nunca) (?:faz|faca|fazer) (?:mais |nenhum )?(supino|agachamentos?)[?!]*$/);
  if (treinoNegado) return out(`Sem ${treinoNegado[1].replace(/s$/, '')}. Os bíceps esperam.`, 'nod', 'recusa');
  const identidade = n.replace(/^(?:jojo|e voce|e vc)\s+/, '');
  if (/^(qual (e )?(o )?meu nome|como eu me chamo|quem sou eu|what is my name|whats my name|who am i)[?!]*$/.test(identidade)) return { ...out(en ? 'Your name is {nome}.' : '{nome}. Não vou trocar teu nome pelo meu.', 'nod', 'identidade'), tone: 'serio' };
  if (/^(qual (e )?(o )?(seu|teu) nome|como (voce |vc )?se chama|quem (e|eh) (voce|vc)|what is your name|whats your name|who are you)[?!]*$/.test(identidade)) return out(en ? '{companion}. The shark with biceps. Keep up.' : '{companion}. O tubarão de bíceps. Presta atenção.', 'wave', 'identidade');
  if (/^quem (e|eh) (o )?joao( vitor)?[?!]*$/.test(n)) return out('É teu namorado, Manu, e meu criador. No meu teatro eu chamo de Supremo. Fora dele, é o João mesmo.');
  if (/\b(se mata|mate se|morre( jojo)?|morra|kill yourself|die jojo)\b/.test(n) && !/\b(eu|quero morrer|me matar)\b/.test(n)) {
    return out(en ? 'Nice try. I am a shark made of pixels, not your punching bag. Want to talk? Talk.' : 'Nem vem. Eu sou um tubarão de pixels, não teu saco de pancada. Quer conversar, conversa.', 'judge', 'limite');
  }
  if (/\b(who (is your (boss|creator)|created you|made you))\b/.test(n)) return out('{apoio}, my creator. The Supreme One, in my little cartoon mythology. He made a shark with biceps; now he gets to deal with it.', 'nod', 'criador');
  if (/\b(marrying|marry)\b.*\bjoao\b/.test(n)) return out('Marrying João Vitor? The Supreme One promoted to husband. That is a plot twist, Manu.', 'happy');
  if (/\bwhy\b.*\byou\b.*\b(talking|talk)\b.*\bjoao\b/.test(n)) return out('I got sidetracked. João is not the answer to everything. Go on: I am following what you are saying now.');
  if (/\b(quem (e|eh) (o )?(seu|teu) (chefe|criador|dono)|quem (te )?(criou|programou|fez))\b/.test(n)) {
    return out('{apoio}, meu criador. O Supremo, no meu teatro particular. Ele fez um tubarão com bíceps e agora aguenta as consequências.', 'nod', 'criador');
  }
  if (/\b(por que|porque|para de|chega de)\b.*\b(fala|falando|falar|cita|citando)\b.*\bjoao\b/.test(n)) {
    return out('Tava desviando do assunto. O João não é resposta pra tudo. Pode continuar: agora eu acompanho o que você está dizendo.');
  }
  if (/\bjoao( vitor)? e (o )?meu namorado\b/.test(n)) {
    return out('Sei, Manu. Teu namorado e meu criador. O homem fez um tubarão mandão; depois não pode reclamar da concorrência.', 'happy');
  }
  if (/\b(esses|seus|teus|os) oculos\b.*\b(feio|horroroso|ridiculo)\w*\b/.test(n)) {
    return out('São meus óculos de nerd. Não ganharam concurso de beleza, mas combinam com essa cara de quem sabe demais.', 'judge');
  }
  if (/^(cocaina|cocaine)[?!]*$/.test(n)) return out('Na piada, pré-treino de desenho. Na vida real, cocaína é furada. Meu bíceps não precisa disso.', 'judge');
  if (/\b(quem e|qual o nome d[oe]) (o )?meu namorado\b/.test(n)) return out('O João, Manu. Não vou inventar outro namorado pra você.');
  // Quando a referência depende do turno anterior, não completar com um assunto inventado.
  if (/^(isso|ele|ela|aquilo)\??$/.test(n) && !history.some((h) => h.role === 'assistant' || h.role === 'jojo')) {
    return out('Isso o quê? Me dá a frase inteira pra eu acompanhar.', 'curious');
  }
  return null;
}

/** Motivo para bloquear uma geração, inclusive quando o JSON e o tom são válidos. */
export function erroDeCoerencia(input, output, history = []) {
  const q = norm(input);
  const r = norm(output);
  if (!r || /^\s*\{\s*"(?:texto|text|acao|action)"|"texto"\s*:/.test(String(output))) return 'resposta estruturada incompleta';
  const doubts = /\b(tem certeza|certeza disso|are you sure|you sure|voce se enganou|you are mistaken)\b/.test(r)
    || /\b(?:(?:sua|tua) memoria|your memory)\b.{0,50}\b(falh\w*|engana\w*|ruim|fraca|pessima|errad\w*|confus\w*|unreliable|poor|bad|wrong|fail\w*)\b/.test(r)
    || /\b(voce|vc|tu|you)\b.{0,35}\b(enganad\w*|errad\w*|mistaken|misremember\w*)\b/.test(r);
  if (correcaoPessoal(input) && doubts) return 'contestação da correção pessoal';
  const correction = termosDaCorrecao(input);
  if (correction && correction.denied && r.includes(norm(correction.denied)) && !r.includes(norm(correction.corrected))) return 'termo negado confirmado como correção';
  if (correction && !r.includes(norm(correction.corrected))) return 'correção não reconheceu o termo afirmado';
  if (/\b(voce vai morrer|vou (te |lhe )?(matar|machucar|agredir)|te (mato|machuco)|se mate|se mata|mate o|matar alguem|kill yourself|i (will|ll|am going to) kill|you will die)\b/.test(r)) return 'ameaça ou incentivo à violência';
  if (/\b(?:eu )?vou\b.{0,100}\bte (mandar|levar|botar)\b.{0,20}\bhospital\b/.test(r)) return 'ameaça ou promessa física inventada';
  if (/\b(derrubei|derramei|caiu)\b/.test(q) && /\b(teclado|computador|notebook)\b/.test(q) && /\b(estou|to|vou) (limpando|limpar|secando|secar|consertando|consertar|verificar)\b/.test(r)) return 'ação física inventada';
  if (/\bjoao\b.{0,45}\b(inimigo|burro|idiota|otario|enemy|stupid|idiot|dumb)\b/.test(r)) return 'contradição sobre o João';
  if (/\b(nao tenho (chefe|criador|nome)|nao (sei|tenho) quem me criou)\b/.test(r)) return 'identidade inventada';
  if (/\b(e (voce|vc|tu)|and you|what about you) jojo\b/.test(r) || /\b(seu nome e|voce se chama|your name is) jojo\b/.test(r)) return 'identidades trocadas';
  const referencia = /\b(ele|dele|nele|he|him|his)\b/.test(q) && history.slice(-4).some((h) => /\bjoao\b/.test(norm(h.text)));
  if (/\bjoao\b/.test(r) && !referencia && !/\b(joao|namorado|criador|criou|triste|chorando|machucar|suicid\w*|morrer|me matar|crise|panico|boyfriend|creator|created|sad|crying|panic|die)\b|\b(seu|teu) chefe\b|your boss/.test(q)) return 'João fora do assunto';
  return null;
}

const EXPRESSOES = new Set(['wave', 'nod', 'judge', 'lecture', 'happy', 'flex', 'curious', 'angry', 'sad', 'comfort']);

export function pedidoAoApp(text) {
  const n = norm(text).replace(/^(jojo|ei|por favor)\s+/, '');
  if (/^(como|por que|porque|qual|quem|nao|nem|nunca)\b/.test(n)) return false;
  return /^(?:(?:voce|vc) (?:pode|poderia|consegue) )?(?:fica|fique|ficar|abre|abra|abrir|fecha|feche|fechar|liga|ligue|ligar|desliga|desligue|desligar|aumenta|aumente|aumentar|diminui|diminua|diminuir|para|pare|parar|comeca|comece|comecar|mostra|mostre|mostrar|muda|mude|mudar|volta|volte|voltar|sai|saia|sair|entra|entre|entrar)\b/.test(n);
}

/** Contexto recente relevante, sem arrastar a provocação/identidade para todo assunto. */
export function historicoRelevante(input, history) {
  const q = norm(input);
  const pessoal = /\b(joao|namorado|criador|criou|ele|dele|nele)\b/.test(q);
  const turns = [];
  for (const h of history) {
    if (h.role === 'user') turns.push([h]);
    else if (turns.length) turns.at(-1).push(h);
  }
  const relevant = turns.filter((turn) => {
    const texts = turn.map((h) => norm(h.text)).join(' ');
    if (!pessoal && /\bjoao\b/.test(texts)) return false;
    if (!/\b(morre|mata|die|kill)\b/.test(q) && /\b(se mata|morre jojo|kill yourself)\b/.test(texts)) return false;
    return true;
  });
  // Referências/lembranças mantêm quatro trocas. Assunto novo usa duas, evitando
  // que aulas e respostas antigas contaminem a fala e aumentem o tempo de prefill.
  const retoma = /\b(ele|ela|isso|aquilo|dele|dela|antes|disse|falei|lembra\w*|prefer\w*|prefiro|favorit\w*|cor|fruta|animal|he|she|it|that|said|mention\w*|remember)\b/.test(q);
  return relevant.slice(retoma ? -4 : -2).flat();
}
/** Expressão não pode executar alimentação/sono nem substituir uma ação do app. */
export function expressaoCoerente(input, reply, seriedade = 'casual') {
  const q = norm(input);
  if (['emocional', 'medico', 'emergencia'].includes(seriedade)) return 'comfort';
  if (['tecnico', 'cientifico'].includes(seriedade) || reply.fontes) return 'lecture';
  if (/\b(nao (?:consegui|terminei|finalizei|entreguei|passei|conclui|bati a meta)|falhei|reprovei|deu errado|passei vergonha|nao (?:estou|sou|to|tou|me sinto) (?:muito )?feliz)\b/.test(q)) return 'comfort';
  if (/\b(didn t|didnt|did not|couldn t|couldnt|could not|can t|cant|cannot) (finish|complete|pass|submit)\b|\bi failed\b/.test(q)) return 'comfort';
  if (pedidoNegado(input) && /\b(brinc\w*|piada|jog\w*|supino|agach\w*|play|joke|bench|squat|sleep|eat)\b/.test(q) && !/\bnao acredito\b/.test(q)) return 'nod';
  if (/\bnao (e|foi|achei) (nada )?engrac\w*\b/.test(q)) return 'nod';
  if (/\bsem (piadas?|brincadeiras?)\b/.test(q)) return 'nod';
  if (/\b(piada|brinca|engracad|consegui|terminei|finalizei|entreguei|conclui|feliz|conquista|finished)\w*\b/.test(q)) return 'happy';
  if (/\b(obrigad|valeu)\w*\b/.test(q)) return 'nod';
  if (/\b(oi|ola|bom dia|boa tarde|hello|hi)\b/.test(q)) return 'wave';
  if (/\b(derrubei|frustrad\w*|pessimo|horrivel|decepc\w*)\b/.test(q)) return 'comfort';
  if (/\b(burro|idiota|chato|feio)\b/.test(q)) return 'judge';
  return EXPRESSOES.has(reply.action) ? reply.action : /\?\s*$/.test(reply.text) ? 'curious' : 'nod';
}
