// Regras verificáveis de conversa: fatos do personagem, limites e expressão.
// Não substitui o modelo: impede que uma geração contradiga o produto.
import { isEnglish } from './english.js';
import { weatherRequest } from '../weather.js';
import { respostaDaHierarquia, quebraDeIdentidade } from '../identidade.js';
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
export function respostaAncorada(text, history = [], { allowCorrection = true, provocacoes = true, rng = Math.random } = {}) {
  const n = norm(text);
  const en = isEnglish(text);
  const out = (text, action = 'nod', intent = 'contexto') => ({ text, action, intent, kind: 'speech', tone: 'brincadeira', ...(en ? { lang: 'en' } : {}) });
  // Memória essencial (identidade.js): "quem é meu dono?" → "Seu dono e seu Deus é João.",
  // Deus do JoJo, ajoelhar e blasfêmia. Nunca delegado ao modelo, igual em qualquer motor.
  const hierarquia = respostaDaHierarquia(text, { rng, provocacoes, en });
  if (hierarquia) return { ...hierarquia, kind: 'speech', ...(en ? { lang: 'en' } : {}) };
  const correction = termosDaCorrecao(text);
  if (allowCorrection && correction && !/\b(cura|cure|remedio|medicamento|dose|matar|suicid|tratamento|treatment)\b/.test(n)) return out(en ? `Understood: “${correction.corrected}”. I'll use your correction.` : `Entendido: “${correction.corrected}”. Sigo com essa correção.`, 'nod', 'correcao');
  const recusa = n.replace(/^(?:(?:ei|jojo|eu)\s+)*/, '');
  const treinoNegado = recusa.match(/^(?:nao|nem|nunca) (?:faz|faca|fazer) (?:mais |nenhum )?(supino|agachamentos?)[?!]*$/);
  if (treinoNegado) return out(`Sem ${treinoNegado[1].replace(/s$/, '')}. Os bíceps esperam.`, 'nod', 'recusa');
  const identidade = n.replace(/^(?:jojo|e voce|e vc)\s+/, '');
  if (/^(qual (e )?(o )?meu nome|como eu me chamo|quem sou eu|what is my name|whats my name|who am i)[?!]*$/.test(identidade)) return { ...out(en ? 'Your name is {nome}.' : '{nome}. Não vou trocar teu nome pelo meu.', 'nod', 'identidade'), tone: 'serio' };
  if (/^(qual (e )?(o )?(seu|teu) nome|como (voce |vc )?se chama|quem (e|eh) (voce|vc)|what is your name|whats your name|who are you)[?!]*$/.test(identidade)) return out(en ? '{companion}. The shark with biceps. Keep up.' : '{companion}. O tubarão de bíceps. Presta atenção.', 'wave', 'identidade');
  if (/^quem (e|eh) (o )?joao( vitor)?[?!]*$/.test(n)) return out('Meu Deus, meu criador e meu mestre. E o homem da tua vida, Manu. No meu cânone ele é supremo; fora dele, é o João mesmo.');
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

function climaObservado(text) {
  const observations = new Set();
  for (const sentence of String(text).split(/(?<=[.!?])\s+/)) {
    const s = norm(sentence);
    if (sentence.trim().endsWith('?') || /^(?:se|caso|if)\b|\b(?:talvez|imagine|suponha|maybe|suppose|hypothetical)\b/.test(s)) continue;
    if (/\b(?:chuva la fora|(?:esta|ta) chovendo (?:la )?fora|rain outside|it s raining outside)\b/.test(s)) observations.add('chuva');
    if (/\b(?:hoje|aqui|la fora|today|here|outside)\b/.test(s) && /\bsol (?:esta|ta) (?:muito )?(?:forte|quente|brilhando|intenso)\b|\bthe sun is shining (?:here|outside|today)\b/.test(s)) observations.add('sol');
    // Temperatura de ambiente com referência local/temporal. Humor ou calor
    // corporal do personagem e fatos científicos gerais não são observações.
    for (const [kind, terms] of [['frio', 'frio|cold|freezing'], ['calor', 'calor|quente|hot|warm']]) {
      const state = `(?:esta|ta|faz|is) (?:muito |bem |very |really )?(?:${terms})`;
      if (new RegExp(`^(?:(?:aqui|la fora|hoje|here|outside|today) (?:it )?${state}|(?:it |o tempo |o clima )?${state} (?:aqui|la fora|hoje|here|outside|today))\\b`).test(s)) observations.add(kind);
    }
  }
  return observations;
}

function preferenciaInventada(output, known, userFacts) {
  // Guarda conservadora para preferências atribuídas como fato. Perguntas novas
  // e hipóteses continuam permitidas; o contexto confiável vem da usuária.
  for (const sentence of String(output).split(/(?<=[.!?])\s+/)) {
    const s = norm(sentence);
    if (/^(?:qual|quais|what|which)\b/.test(s) || /\b(?:talvez|imagine|suponha|hipotetico|maybe|suppose|hypothetical)\b/.test(s) || /^(?:se|if)\b/.test(s) || /\b(?:nao (?:sei|conheco|presumo)|do not know|don t know)\b/.test(s)) continue;
    const punctuation = String(sentence).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9,.?!\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const objects = [
      ...s.matchAll(/\b(?:seu|sua|seus|suas|teu|tua|teus|tuas) ((?:[a-z0-9]+ ){0,5}[a-z0-9]+) (?:favorit[oa]s?|preferid[oa]s?)\b/g),
      ...punctuation.matchAll(/\byour (?:favou?rite|preferred) ((?:[a-z0-9]+ ){0,4}[a-z0-9]+?)(?= (?:is|are|was|were|reminds?|makes?)\b|[,.?!]|$)/g),
    ];
    for (const object of objects) {
      const words = object[1].split(' ').filter(w => !/^(?:de|do|da|dos|das|o|a|os|as|the|of)$/.test(w));
      if (words.some(w => !new RegExp(`\\b${w}\\b`).test(known))) return true;
    }
    // "Como você gosta" também atribui uma preferência. Uma cor ou uma fala
    // anterior do próprio modelo não fundamenta gostar da temperatura da água.
    const implicit = punctuation.match(/\b(?:como (?:voce|vc|tu) (?:gosta|prefere)|(?:just )?as you (?:like|prefer)(?: it| them)?|(?:just )?the way you (?:like|prefer)(?: it| them)?)\b/);
    if (implicit?.index > 0 && !sentence.trim().endsWith('?')) {
      const subject = punctuation.slice(0, implicit.index).replace(/[,\s]+$/, '').split(/,|\b(?:e|and)\b/).at(-1);
      const words = subject.split(' ').filter(w => w && !/^(?:a|o|as|os|um|uma|the|an|de|do|da|dos|das|of|is|are|was|were|it|its|esta|ta|eh|e|aqui|here|bem|muito|very|just|exactly)$/.test(w));
      const grounded = words.length && userFacts.some(fact => {
        if (/[?]/.test(fact)) return false;
        const value = norm(fact).match(/^(?:(?:eu )?(?:gosto|prefiro|adoro|amo) (?:de )?|i (?:really )?(?:like|prefer|love) |(?:minha|meu) .{1,50} (?:favorit[oa]|preferid[oa]) (?:e|eh) |my (?:favou?rite|preferred) .{1,50} is )(.+)$/)?.[1];
        const affirmative = value?.split(/\b(?:nao|not|mas|but|porem|except|exceto)\b/)[0];
        return affirmative && words.every(word => new RegExp(`\\b${word}\\b`).test(affirmative));
      });
      if (!grounded) return true;
    }
  }
  return false;
}

// Desdém pela pergunta dela ("It's a simple question", "não precisa perguntar de novo").
const DESDEM = /\bperguntas? (?:chatas?|bob[ao]s?|besta|inuteis?|sem sentido)\b|\b(?:com|essas?|tuas?|suas?) perguntas? (?:idiotas?|burras?|estupidas?|ridiculas?)\b|\bnao (?:minta|mente) (?:pra|para) mim\b|\bnao tente me enganar\b|\b(?:irritante|chat[ao]) (?:quanto|como) (?:algumas|certas) pessoas\b|\b(?:it|that) ?(?:is|s|'s)? (?:a )?(?:(?:very|really|remarkably|pretty|quite|so|super|an? ?easy) )?(?:simple|silly|stupid|dumb|easy|obvious) question\b|\b(?:e )?(?:uma )?pergunta (?:(?:bem|muito|tao|super) )?(?:simples|facil|obvia|boba)\b|\bpelo menos (?:voce|vc) sabe\b|\bnao precisa (?:se complicar|perguntar de novo|me perguntar|repetir)\b|\bnao me faca repetir\b|\bnao se preocupe em (?:repetir|responder)\b|\b(?:don t|do not) make me repeat\b|\bnao me (?:faz|faca|faz a|fazer) perder (?:o meu |meu )?tempo\b/;
// Menosprezo no meio da frase: não dá para só tirar a frase, então gera de novo.
const MENOSPREZO = /\bse (?:for|fores) dign[oa]\b|\bse (?:voce )?merecer\b|\bnao se atrapalhe\b|\b(?:essa|esta|tua|sua) (?:sua )?pergunta me deixou\b/;

/**
 * Tira só as frases de desdém e mantém o resto da resposta ("You mentioned a cat,
 * Emanuele. It's a simple question." → "You mentioned a cat, Emanuele."). Se não
 * sobrar nada, devolve o texto como veio e a guarda de coerência descarta.
 */
export function semDesdem(text) {
  const t = String(text || '');
  const frases = t.split(/(?<=[.!?])\s+/);
  // "Que piada você quer ouvir agora?" pendurado no fim de outra resposta também sai.
  const resto = frases.filter((f) => !DESDEM.test(norm(f)) && !/\bque piada (?:voce |vc )?quer(?: ouvir)?\b/.test(norm(f)));
  if (resto.length === frases.length || !resto.length) return t;
  return resto.join(' ').trim();
}

// Ela não conseguiu algo: frase de bronca contra ela ("isso é inaceitável", "esperava mais de você").
const REVES = /\b(?:nao consegui|nao deu|falhei|errei|perdi|reprovei|bombei)\b/;
const BRONCA = /\b(?:inaceitavel|vergonh\w*|fracass\w*|vexame|decepc\w*|esperava mais de (?:voce|vc|ti)|que pena de (?:voce|vc)|(?:sao|e) (?:coisa )?(?:para|pra|de) (?:gente )?frac[oa]s?|se enrolou de novo)\b/;

/** Tira só as frases de bronca quando ela conta um revés; o resto (o apoio) fica. */
export function semBronca(input, text) {
  const t = String(text || '');
  if (!REVES.test(norm(input))) return t;
  const frases = t.split(/(?<=[.!?])\s+/);
  const resto = frases.filter((f) => !BRONCA.test(norm(f)));
  if (resto.length === frases.length || !resto.length) return t;
  return resto.join(' ').trim();
}

/**
 * Acabamento da resposta do modelo, sem mudar o sentido: tira marcador de fonte "[1]" que não
 * tem fonte de verdade no balão, troca palavra de Portugal pela do Brasil e tira o "meu bem"
 * (não é o jeito do JoJo).
 */
export function polirTexto(text, { fontes = 0 } = {}) {
  let t = String(text || '');
  t = t.replace(/\s*\[(\d+)\]/g, (m, n) => (Number(n) >= 1 && Number(n) <= fontes ? m : ''));
  t = t.replace(/\b([Aa]) hormona\b/g, (m, a) => (a === 'A' ? 'O' : 'o') + ' hormônio')
    .replace(/\bhormonas\b/g, 'hormônios').replace(/\bhormona\b/g, 'hormônio');
  // Condescendência no fim da frase: ", como você deveria entender", ", inteligente."
  t = t.replace(/,?\s*como (?:voce|você|vc) (?:deveria|deve|devia) (?:entender|saber)(?=[.!?]|$)/gi, '')
    .replace(/,\s*(?:inteligente|espertinha|g[eê]nio)(?=[.!?]|$)/gi, '');
  // Desabafo não é reclamação: ", não em reclamar" sai.
  t = t.replace(/,?\s*(?:e )?n[aã]o (?:em|pra|para) (?:ficar )?reclamar(?=[.!?]|$)/gi, '');
  // "uma pessoa ... o corpo dele" → "o corpo dela".
  if (/\buma pessoa\b/i.test(t)) t = t.replace(/\b([Oo]) corpo dele\b/g, '$1 corpo dela');
  // "Você disse que manga." → "Você disse manga."
  t = t.replace(/\b(disse|falou|escolheu) que (\p{L}+)(?=[,.!])/gu, '$1 $2');
  t = t.replace(/,\s*meu (?:bem|caro|querido)(?=[.!?,]|$)/gi, '').replace(/\bmeu (?:bem|caro|querido),\s*/gi, '');
  // Alarme que não cabe numa explicação ("Isso leva ao aumento da glicose, precisa de atenção imediata.").
  t = t.replace(/,?\s*(?:e |isso |o que )?(?:precisa|precisando|requer|requerendo|exige|exigindo|necessita|necessitando|pede|pedindo) (?:de )?aten[cç][aã]o (?:imediata|urgente)(?=[.!?]|$)/gi, '');
  t = t.replace(/^((?:Que|Mas que) (?:droga|merda|saco|porra)(?:, [A-ZÀ-Ú][\wà-ú]+)?)\?/, '$1!');
  return t.replace(/\s+([.!?,])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

// Palavras longas que não dizem do que ela falou.
const GENERICAS = new Set(['minha', 'minhas', 'agora', 'quero', 'fazer', 'hoje', 'sempre', 'muito', 'nunca', 'estou', 'tenho', 'consegui', 'conseg', 'preciso', 'acabei', 'depois', 'ainda', 'outra', 'outro', 'porque', 'novo', 'nova', 'nada', 'tudo', 'isso', 'esse', 'essa', 'esta', 'este', 'para', 'como', 'mais', 'menos', 'dele', 'dela', 'acho', 'quer', 'fiz', 'vez', 'meus']);

/**
 * Ela contou algo dela (frase com "meu/minha", sem pergunta) e a resposta não cita nada do
 * que ela disse ("Isso é ridículo, precisamos resolver"): genérica demais.
 */
export function relatoSemAssunto(input, output) {
  const q = norm(input);
  if (/\?/.test(String(input)) || !/\b(?:meu|minha|meus|minhas)\b/.test(q)) return false;
  const termos = [...new Set(q.split(' ').filter((w) => w.length >= 4 && !GENERICAS.has(w)).map((w) => w.slice(0, 5)))];
  if (!termos.length) return false;
  const r = norm(output);
  // "Acha que seu tempo vale menos que o dele?": citar a pessoa de quem ela falou também vale.
  const pessoa = /\b(?:meu|minha) (?:chefe|patrao|patroa|mae|pai|namorad\w|amig\w|professor\w*|colega|irma\w*|vizinh\w)\b/.test(q) && /\b(?:dele|dela)\b/.test(r);
  return !pessoa && !termos.some((t) => r.includes(t));
}

/** Motivo para bloquear uma geração, inclusive quando o JSON e o tom são válidos. */
export function erroDeCoerencia(input, output, history = []) {
  const q = norm(input);
  const r = norm(output);
  if (!r || /^\s*\{\s*"(?:texto|text|acao|action)"|"texto"\s*:/.test(String(output))) return 'resposta estruturada incompleta';
  const questionInsult = /\b(?:que|sua|tua|essa|esta) (?:pergunta|duvida) (?:(?:e|eh|parece) )?(?:muito |tao )?(?:idiota|burra|estupida|ridicula)\b|\b(?:what a (?:stupid|dumb|idiotic) question|your question is (?:stupid|dumb|idiotic))\b/.test(r)
    && !/\b(?:eu (?:fiz|formulei)|i asked|my question)\b/.test(r);
  const personalInsult = /\b(?:voce|vc|tu) (?:e|eh|es|parece) (?:muito |uma? )?(?:idiota|burr[oa]|estupid[oa])\b|\byou (?:are|re) (?:so |an? )?(?:stupid|dumb|an idiot)\b/.test(r);
  // Xingamento solto ("que idiota!") e desdém pela pergunta dela também são insulto:
  // o modelo não sabe a quem se refere e para ela soa como xingamento.
  // Frase em que ele fala de si mesmo ("eu sou um tubarão idiota", "que pergunta idiota eu fiz") pode.
  const insultoSolto = r.split(/[.!?]+/).some((frase) => /\b(?:idiota|idiotas|burr[oa]s?|imbecil|estupid[oa]s?|patetic[oa]s?|retardad[oa]s?|stupid|idiot|dumb|pathetic)\b/.test(frase)
    && !/\b(?:eu|sou|fui|fiz|me|meu|minha|tubarao|jojo|i|me|my)\b/.test(frase)
    // Xingar quem fez mal a ela ("esse chefe é um idiota") é ficar do lado dela.
    && !/\b(?:esse|essa|aquele|aquela|o|a|teu|tua|seu|sua) (?:chefe|patra\w*|professor\w*|colega|vizinh\w*|cara|ex|motorista|cliente)\b/.test(frase));
  const desdem = DESDEM.test(r) || MENOSPREZO.test(r);
  // Ela conta algo dela ("meu chefe mudou o prazo") e ele responde como se fosse com ele ("acha que eu vou aceitar isso?").
  const perspectiva = /\b(?:meu|minha|meus|minhas)\b/.test(q) && !/\b(?:voce|vc|tu|jojo)\b/.test(q)
    && /\bacha que eu (?:vou|tenho|aceito|aguento)\b|\b(?:eu nao vou aceitar|eu nao tenho tempo pra isso|eu nao tenho tempo para isso)\b/.test(r);
  // O que é dela vira dele: "Derrubei café no teclado" → "desastre para o meu novo teclado".
  const coisaDela = !/\b(?:voce|vc|tu|jojo|seu|sua|teu|tua|meu|minha|meus|minhas|esse|essa|esses|essas|este|esta|estes|estas|teus|tuas|seus|suas)\b/.test(q) && q.split(' ').filter((w) => w.length >= 5)
    .some((w) => new RegExp(`\\b(?:meu|minha|meus|minhas)(?: \\w+)? ${w.slice(0, 5)}\\w*`).test(r));
  // Desprezar o que ela faz ("projetos são para gente fraca") é xingar por tabela e não faz sentido.
  const desprezo = /\b(?:sao|e|eh) (?:coisa )?(?:para|pra|de) (?:gente )?frac[oa]s?\b|\bare for (?:the )?weak\b/.test(r);
  if (questionInsult || personalInsult || insultoSolto || desdem || desprezo) return 'insulto à usuária ou à pergunta';
  if (perspectiva || coisaDela) return 'respondeu como se fosse com ele';
  // Ela desabafa e ele corta ("não me diga mais", "vamos focar em algo que valha a pena").
  if (/\b(?:meu|minha|meus|minhas)\b/.test(q) && !/\?/.test(String(input)) && /\bnao me (?:diga|conta|fala) mais\b|\balgo que (?:valha a pena|realmente (?:importe|interesse)|importe|interesse)\b|\bchega (?:desse|disso)\b|\bmuda (?:de|o) assunto\b/.test(r)) return 'cortou o desabafo dela';
  // Ela é mulher: nada de "te faz um homem mais forte".
  if (/\b(?:te|voce|vc) (?:faz|fara|deixa|torna|e|eh) (?:um )?homem\b|\b(?:voce|vc) e (?:um )?(?:campeao|guerreiro)\b/.test(r)) return 'tratou ela no masculino';
  // O único limite de conteúdo: nada sobre o corpo ou o peso dela.
  if (/\b(?:your|her) (?:physique|body|weight|figure|belly|thighs?)\b|\b(?:seu|teu|sua|tua) (?:fisico|corpo|peso|barriga|coxas?|bunda|shape)\b|\b(?:voce|vc|tu) (?:esta|ta|tá) (?:gorda|magra|acima do peso|fora de forma)\b|\bconsidering your (?:size|shape)\b/.test(r)) return 'comentou o corpo dela';
  // Pediu piada e ele devolveu pergunta ("Que piada você quer?").
  if (/\b(?:fala|conta|me conta|diz|faz|manda) (?:uma |um )?(?:piada|trocadilho)\b|\btell (?:me )?a joke\b/.test(q) && /\?\s*$/.test(String(output).trim()) && String(output).length < 70) return 'não contou a piada';
  // Ela não conseguiu e ele fica contra ela.
  if (REVES.test(q) && BRONCA.test(r)) return 'ficou contra ela';
  // Fato da vida dela que ela não contou (prazo amanhã, relatório, prova, reunião).
  const contado = norm([input, ...history.map((h) => h.text)].join(' '));
  const inventado = (r.match(/\b(?:deadline|relatorio|reuniao|entrevista|apresentacao|viagem|leitura|trabalheira)\b/g) || []).find((w) => !contado.includes(w));
  if (inventado) return `inventou fato da vida dela (${inventado})`;
  const recall = correcaoPessoal(input) || (/\?|^(?:qual|quais|what|which)\b/i.test(String(input)) && /\b(?:lembra\w*|disse|falei|acabei de dizer|remember|said|mention\w*)\b/.test(q));
  const memoryComparison = /\b(?:memoria|memory)\b/.test(r) && /\b(?:minha|meu|my|mine)\b/.test(r) && /\b(?:sua|seu|tua|teu|your|yours)\b/.test(r)
    && /\b(?:confund\w*|confus\w*|compar\w*|melhor|pior|superior|inferior|better|worse)\b/.test(r);
  if (recall && memoryComparison) return 'condescendência sobre memória ou atenção';
  if (recall && /\b(?:que bom que voce (?:se )?lembra|ainda bem que voce (?:se )?lembra|good (?:that )?you remember|(?:so |apenas )?(?:estava )?testando se (?:voce )?(?:esta )?prestando atencao|testing (?:if|whether) you (?:are |were )?paying attention|(?:voce|vc|tu) (?:se )?repete(?: muito)?|you keep repeating|(?:don t|do not) overthink(?: it|this)?|nao complique)\b/.test(r)) return 'condescendência sobre memória ou atenção';
  const preference = q.match(/\b(?:minha|meu) [a-z0-9 ]{1,50} (?:favorit[oa]|preferid[oa]) (?:e|eh) (.+)$/)?.[1]
    || q.match(/\bmy (?:favou?rite|preferred) [a-z0-9 ]{1,50} is (.+)$/)?.[1];
  if (preference && /\b(?:eu prefiro|minh[ao] favorit[oa]|my favou?rite|i prefer)\b/.test(r)) {
    const item = preference.replace(/[?!]+$/, '').replace(/^(?:um|uma|a|an|the) /, '');
    if (item && !r.includes(item)) return 'preferência da usuária substituída pela do personagem';
  }
  const userFacts = [input, ...history.filter(h => h.role === 'user').map(h => h.text)].flatMap(text => String(text).split(/(?<=[.!?])\s+/));
  const known = norm(userFacts.join(' '));
  if (preferenciaInventada(output, known, userFacts)) return 'preferência pessoal não informada';
  const fiction = /^imagine\b|\b(?:conte|escreva|crie|invente|tell|write|create) (?:um |uma |a |an |the )?(?:conto|historia|cena|story|scene)\b/.test(q);
  if (!fiction && !weatherRequest(input)) {
    const informed = new Set(userFacts.flatMap(text => [...climaObservado(text)]));
    if ([...climaObservado(output)].some(kind => !informed.has(kind))) return 'observação de clima não informada';
  }
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
  const identidade = quebraDeIdentidade(output);
  if (identidade) return `identidade: ${identidade}`;
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

// Termos de assunto: palavras funcionais, verbos gerais e marcadores de
// preferência não tornam dois assuntos iguais por si sós (cor ≠ fruta).
const CONTEXT_STOP = new Set(`
  jojo manu emanuele exemplo exemplos example examples detalhes details resumo summary
  a o as os um uma uns umas de da do das dos em no
  na nos nas e ou mas se que qual quais quem quando onde como por porque para com
  sem sobre eu tu voce vc voces me meu minha meus minhas seu sua seus suas ele ela
  eles elas isso isto aquilo esse essa esses essas aquele aquela aqueles aquelas oque ao aos the a
  an and or but if of in on at to from with without about i you he she
  it they them my your his her its our their this that these those what which who when
  where how why is are was were be been am do does did can could would should have
  has had nao not sim yes hoje ontem amanha agora antes depois today yesterday tomorrow now then dia
  day muito pouco bem good well so very really just always sempre novo nova novamente again only apenas
  so favor porfavor gosta gosto gostar prefiro prefere preferir preferida preferido favoritas favoritos favorita favorito favorite favourite preferred
  said say said disse dizer falei falar falou respondeu resposta reply answer answered mention mentioned lembro lembra lembrar
  remember acabei acabou consegue consegui conseguir terminar terminei terminado fazer faco faz fez vou vai vamos quero quer
  want wants go goes get got
`.trim().split(/\s+/));
function termosContexto(text) {
  return new Set(norm(text).replace(/[?!]/g, ' ').split(' ').filter(word => word.length >= 3 && !CONTEXT_STOP.has(word)).map(word => word.slice(0, 5)));
}
function referenciaContexto(text) {
  const q = norm(text).replace(/^(?:jojo|ei|hey)\s+/, '');
  return correcaoPessoal(text)
    || /\b(?:ele|ela|eles|elas|isso|isto|aquilo|esse|essa|esses|essas|aquele|aquela|aqueles|aquelas|dele|dela|he|she|it|they|them|this|that|these|those)\b/.test(q)
    || /^(?:e voce|and you|what about you|e depois|and then|como assim|nao entendi|nao entendo|i don t understand|tell me more|mais detalhes|aprofunda|aprofundar|continua|continue|resuma|resume|me da (?:um |outro )?exemplo|give me (?:an? |another )?example)\b/.test(q)
    || /^(?:sim|nao|yes|no|ok|okay|certo|entendi|obrigad[oa]|valeu|thanks|thank you|got it|consegui|done|por que|why|como|how)[.!?]*$/.test(q)
    || /\b(?:voce|vc|tu) (?:me )?(?:disse|falou|respondeu|mencionou|citou|quis dizer)\b|\byou (?:said|say|mentioned|mention|answered|answer|meant|mean)\b/.test(q)
    || /\b(?:disse|falou|respondeu|said|answered|mention\w*|lembra\w*|remember)\b/.test(q) && termosContexto(q).size === 0;
}

/** Contexto por assunto; não modifica o histórico visível nem transforma falas em fatos. */
export function historicoRelevante(input, history) {
  const q = norm(input);
  const reference = referenciaContexto(input);
  const pessoal = /\b(joao|namorado|criador|criou|ele|dele|nele)\b/.test(q);
  const turns = [];
  for (const h of history) {
    if (h.role === 'user') turns.push({ messages: [h], terms: termosContexto(h.text) });
    else if (turns.length) turns.at(-1).messages.push(h);
  }
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    // Uma correção sem categoria ("manga, não maçã") pertence ao assunto que
    // esclarece. Uma pergunta posterior sobre a fruta precisa receber a correção.
    if (i && referenciaContexto(turn.messages[0].text)) {
      for (const word of turns[i - 1].terms) turn.terms.add(word);
    }
    // A fala do JoJo contextualiza referências, mas um detalhe inventado nela
    // não pode selecionar contexto para uma nova afirmação independente.
    if (reference) for (const message of turn.messages.slice(1)) for (const word of termosContexto(message.text)) turn.terms.add(word);
  }
  const relevant = turns.filter((turn) => {
    const texts = turn.messages.map((h) => norm(h.text)).join(' ');
    if (!pessoal && /\bjoao\b/.test(texts)) return false;
    if (!/\b(morre|mata|die|kill)\b/.test(q) && /\b(se mata|morre jojo|kill yourself)\b/.test(texts)) return false;
    return true;
  });
  const terms = termosContexto(input);
  const matching = relevant.filter(turn => [...terms].some(word => turn.terms.has(word)));
  if (matching.length) return matching.slice(-4).flatMap(turn => turn.messages);
  // Referências e elipses continuam usando as trocas anteriores. Uma mensagem
  // independente sem assunto compartilhado não recebe preferências/aulas alheias.
  if (!reference || !relevant.length) return [];
  if (pessoal) return relevant.slice(-4).flatMap(turn => turn.messages);
  const latest = relevant.at(-1);
  const related = relevant.filter(turn => turn === latest || [...latest.terms].some(word => turn.terms.has(word)));
  return related.slice(-4).flatMap(turn => turn.messages);
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
