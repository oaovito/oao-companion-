// Provedor de respostas programadas (offline). Reconhece intenções simples por
// palavras-chave e responde com frases locais. Não é uma IA de conversa livre.
import { DialogueProvider } from './provider.js';
import { isFactualQuestion, isBlockedQuestion } from './web-search.js';

export function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9?!\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Ordem importa: a primeira intenção que casar vence. Crise e tristeza vêm primeiro.
export const INTENTS = [
  // AVC de verdade (sintomas, "tô tendo um AVC"): resposta séria, antes de tudo.
  { id: 'avcReal', patterns: [/\b((to|tou|estou|t[oô]) (tendo|com) (um )?(avc|derrame)|sintomas? de (avc|derrame)|acho que (e|é|to tendo|estou tendo) (um )?(avc|derrame)|boca torta|n[aã]o (consigo|to conseguindo) mexer (o|a) (bra[cç]o|perna|rosto))\b/] },
  { id: 'crisis', patterns: [/\b(me matar|suicid\w*|nao quero mais viver|quero morrer|acabar com tudo|me machucar|me cortar|automutila\w*)\b/] },
  { id: 'distress', patterns: [/\b(crise\w*|em crise|panico|ataque de ansiedade|crise de ansiedade|ansiedade|nao aguento mais|nao to aguentando|surtand\w*|surtei|desmoronand\w*|emocionalmente mal|mal emocionalmente|to destruida|desabei|desabando)\b/] },
  { id: 'sad', patterns: [/\b(chorand\w*|chorei|chorar|choro|triste\w*|tristeza|deprimid\w*|depre|pra baixo|arrasad\w*|sofrendo|muito mal|to mal|na bad|desanimad\w*|desesperad\w*)\b/] },
  { id: 'avc', patterns: [/^(jojo )?avc[!?]*$/] },
  { id: 'dressDown', patterns: [/\b(se veste (direito|melhor|diferente)|vest[ea] (outra|uma roupa|direito|algo)|troca (de|essa) roupa|tira essa fantasia|que roupa (e|é) essa|se comporta|se cobre|roupa (mais )?comportada|fantasia comportada|bota uma roupa|poe uma roupa|veste algo decente)\b/] },
  { id: 'dressUp', patterns: [/\b(volta (a|pra|para a) fantasia ousada|pode (ser|ficar) ousado|fantasia ousada|volta a ser ousado|tira a roupa comportada)\b/] },
  { id: 'lol', patterns: [/\b((eu )?(deveria|devo|posso|vou|quero) jogar (um )?(lol|league( of legends)?)|jogo (um )?lol|bora (de )?lol|partida de lol|lolzinho)\b/] },
  { id: 'pretty', patterns: [/\b((eu )?(sou|to|tou|estou|t[oô]) (bonita|linda|gata|bela|maravilhosa)|(voce|vc) me acha (bonita|linda|gata)|me acha (bonita|linda|gata)|(eu )?(sou|to|estou) (muito )?(bonita|linda) hoje)\b/] },
  { id: 'moon', patterns: [/\b(vai (se )?toma(r)? no cu|vai tomar no seu cu|vtnc|toma no cu)\b/] },
  { id: 'rejected', patterns: [/\b(nao gosto de voce|nao gosto de vc|vou te (desinstalar|apagar|deletar|excluir)|nao preciso de voce|nao preciso de vc|vai embora|some daqui|nao te aguento)\b/] },
  { id: 'insult', patterns: [/\b(idiota|burro|otario|babaca|imbecil|inutil|te odeio|odeio voce|odeio vc|seu chato|voce e chato|vc e chato|lixo|ridiculo)\b/] },
  { id: 'quiet', patterns: [/\b(silencio|cala a boca|fica quieto|quieto|para de falar|shh+|me deixa em paz)\b/] },
  { id: 'goodbye', patterns: [/\b(tchau|adeus|ate logo|ate mais|falou|fui)\b/] },
  { id: 'scare', patterns: [/\b(me assusta|susto|assusta|me da medo)\b/] },
  { id: 'achievement', patterns: [/\b(consegui|terminei|acabei|finalizei|entreguei|passei|bati a meta|conclui)\b/] },
  { id: 'sleep', patterns: [/\b(dorm\w*|sono|soneca|cochil\w*|descans\w*|nana|deitar?)\b/] },
  { id: 'wake', patterns: [/\b(acord\w*|levanta)\b/] },
  { id: 'eat', patterns: [/\b(com(e|er|ida|endo)|fome|lanche|petisco|peix\w*|almoc\w*|janta\w*|nham)\b/] },
  { id: 'play', patterns: [/\b(brinc\w*|jog(ar|o|a)|bola|bolinha|divert\w*|flexiona|biceps|shape|muscul\w*)\b/] },
  { id: 'bench', patterns: [/\b(supino|faz (um )?supino|peitoral|peito)\b/] },
  { id: 'squat', patterns: [/\b(agachamento|agacha\w*|faz (um )?agachamento|leg day)\b/] },
  { id: 'gym', patterns: [/\b(academia|treino|treinar|malhar|malhei|supino|agachamento)\b/] },
  { id: 'pet', patterns: [/\b(carinho|cafune|fofo|fofinho|abraco|lindo|amo|gosto de voce)\b/] },
  { id: 'thanks', patterns: [/\b(obrigad\w*|valeu|brigad\w*)\b/] },
  { id: 'howAreYou', patterns: [/\b(tudo bem|como (voce )?(esta|vai)|beleza|td bem|como vc ta)\b/] },
  { id: 'name', patterns: [/\b(seu nome|quem e voce|quem (e|eh) vc|como (voce )?se chama)\b/] },
  { id: 'help', patterns: [/\b(ajuda|o que voce faz|comandos|como (voce|vc|isso aqui|o jojo) funciona)\b/] },
  { id: 'greet', patterns: [/\b(oi|ola|eai|e ai|bom dia|boa tarde|boa noite|hey|opa|salve)\b/] },
];

// Textos com variáveis: {nome} (Emanuele em tom sério, Manu em brincadeira), {apoio}, {companion}.
export const RESPONSES = {
  crisis: ['Emanuele, isso é sério. Fala agora com o {apoio} pra ele cuidar de você. E se precisar, liga pro CVV no 188, é 24 horas e de graça. Você não precisa passar por isso sozinha.'],
  distress: [
    'Emanuele, para tudo e fala com o {apoio} agora. Ele vai cuidar de você. Respira fundo, devagar.',
    'Emanuele, isso é com o {apoio}. Chama ele agora pra ele cuidar de você. Eu fico aqui quietinho.',
  ],
  sad: [
    'Emanuele, isso é com o {apoio}. Vai falar com ele, ele sabe cuidar de você.',
    'Chorando? Para tudo e chama o {apoio}, Emanuele. Ele sabe cuidar de você.',
    'Emanuele, agora não é comigo. Fala com o {apoio}. Ele sabe cuidar de você.',
  ],
  pretty: ['É.'],
  avc: ['Essa foi por pouco.'],
  avcReal: ['Emanuele, isso é emergência. Liga agora pro SAMU no 192 e chama o {apoio}. Não espera passar.'],
  dressDown: ['Tá bom, chata. Vesti a versão comportada.', 'Careta. Pronto, me cobri.', 'Vai se foder. Mas tá, troquei.'],
  dressUp: ['Agora sim. Do jeito que eu gosto.', 'Voltei pro modo ousado. Olha a meia arrastão.'],
  lol: ['Passa na cara de uma vez.'],
  moon: ['Toma você, {nome}. Olha aqui.', 'Tomar? Toma essa, {nome}.', 'Eu? Olha só o que eu acho disso, {nome}.'],
  rejected: ['Tá. Anotado, Emanuele.', 'Doeu, mas eu aguento. Sou de cartilagem.', 'Beleza. Fico aqui no meu canto.'],
  insult: ['Olha o respeito, Emanuele.', 'Repete isso olhando no meu olho, {nome}.', 'Tô ficando vermelho. Melhor parar, {nome}.'],
  greet: ['Fala, {nome}. Rápido.', 'Oi, {nome}. O que você quer?', 'Tô aqui. Desembucha.'],
  goodbye: ['Vai, Emanuele. E nada de Instagram.', 'Até. Faz o que tem que fazer.'],
  quiet: ['Fechou.', 'Silêncio. Entendido, Emanuele.'],
  scare: ['Tem certeza, {nome}?', 'Pediu, levou.'],
  achievement: ['Aí sim, {nome}. Eu sabia.', 'Finalmente. Já tava criando craca aqui.', 'Isso. Agora a próxima.'],
  sleep: ['Descanso aprovado. Recuperação é treino.', 'Vou recuperar. Não perturba.'],
  wake: ['Acordado. O que eu perdi?', 'Tô de pé, {nome}. Bora.'],
  eat: ['Manda comida de tubarão, {nome}. Foca, lula, turista.', 'Proteína. Crua. Com osso.', 'Come comigo, {nome}. Mas não chega muito perto.'],
  play: ['Olha esse bíceps, {nome}. Aprende.', 'Brincar não. Cardio.'],
  bench: ['Supino. Olha a técnica, {nome}.', 'Pra você ver, {nome}: carga de respeito.', 'Desce controlado, sobe explosivo. Aprende.'],
  squat: ['Agachamento. Abaixo da paralela, {nome}.', 'Leg day. Ninguém pula perna aqui.', 'Olha esse agachamento, {nome}. Sorri aí.'],
  gym: ['Treino pago, {nome}? Então descansa direito.', 'Constância. Carga progressiva. Sono. Simples.', 'Não pulou perna, né, {nome}?'],
  pet: ['Tá, {nome}. Chega de carinho.', 'Hm. Aceitável.'],
  thanks: ['Não por isso, Emanuele. Volta pro trabalho.', 'De nada. Agora produz.'],
  howAreYou: ['Bem. E sua lista de tarefas, {nome}?', 'Melhor que sua postura.'],
  name: ['{companion}. Tubarão de terra, fiscal da sua produtividade.'],
  help: ['Entendo pouca coisa e de propósito: "comer", "treino", "brincar", "dormir", "consegui", "silêncio", "me assusta".'],
  refuse: [
    'Não vou te ensinar isso, Emanuele. Pergunta outra coisa.',
    'Isso eu não pesquiso. Próxima pergunta, Emanuele.',
  ],
  unknown: [
    'Não entendi, Emanuele. Respostas aqui são programadas, então reformula.',
    'Hã? Fala direito: comer, treino, dormir, silêncio.',
    'Isso aí não tá na minha lista. Tenta de novo.',
  ],
};

// Ação/expressão corporal coerente com cada resposta.
const ACTIONS = {
  crisis: 'comfort', distress: 'comfort', sad: 'comfort', greet: 'wave', goodbye: 'wave', quiet: 'quiet', scare: 'scare', achievement: 'flex',
  sleep: 'sleep', wake: 'wake', eat: 'eat', play: 'play', gym: 'flex', pet: 'pet', thanks: 'nod', howAreYou: 'judge',
  name: 'wave', help: 'lecture', unknown: 'judge', refuse: 'judge', rejected: 'sad', insult: 'angry', bench: 'bench', squat: 'squat', moon: 'moon', pretty: 'smitten', avc: 'avc', avcReal: 'comfort', dressDown: 'dressDown', dressUp: 'dressUp', lol: 'poop',
};

// Tom de cada resposta: define se o nome usado é "Emanuele" (sério) ou "Manu" (brincadeira).
const TONES = {
  crisis: 'serio', distress: 'serio', sad: 'serio', quiet: 'serio', goodbye: 'serio', thanks: 'serio', help: 'serio', unknown: 'serio', refuse: 'serio', rejected: 'serio', insult: 'serio', bench: 'brincadeira', squat: 'brincadeira', moon: 'brincadeira', pretty: 'brincadeira', avc: 'brincadeira', avcReal: 'serio', dressDown: 'serio', dressUp: 'brincadeira', lol: 'brincadeira', name: 'serio', sleep: 'serio',
  greet: 'brincadeira', scare: 'brincadeira', achievement: 'brincadeira', wake: 'brincadeira', eat: 'brincadeira', play: 'brincadeira',
  gym: 'brincadeira', pet: 'brincadeira', howAreYou: 'brincadeira',
};

// Intenções que, numa pergunta de conhecimento ("quantas horas devo dormir?"),
// dão lugar à pesquisa: a resposta programada não responderia a pergunta.
const SEARCHABLE = new Set(['unknown', 'sleep', 'wake', 'eat', 'play', 'gym', 'achievement', 'scare', 'pet', 'bench', 'squat']);

export function detectIntent(text) {
  const n = normalizeText(text);
  if (!n) return 'unknown';
  for (const intent of INTENTS) {
    if (intent.patterns.some((p) => p.test(n))) return intent.id;
  }
  return 'unknown';
}

export class ScriptedProvider extends DialogueProvider {
  constructor({ rng = Math.random } = {}) {
    super({ id: 'scripted', label: 'Respostas programadas (offline)', kind: 'scripted' });
    this.rng = rng;
    this.last = {};
  }

  async isAvailable() {
    return true;
  }

  async reply({ text }) {
    let intent = detectIntent(text);
    // Pergunta de conhecimento sem resposta programada: pede pesquisa ao engine.
    let search = false;
    if (SEARCHABLE.has(intent) && isFactualQuestion(text)) {
      if (isBlockedQuestion(text)) intent = 'refuse';
      else {
        intent = 'unknown';
        search = true;
      }
    }
    const options = RESPONSES[intent] || RESPONSES.unknown;
    let idx = Math.floor(this.rng() * options.length);
    if (options.length > 1 && idx === this.last[intent]) idx = (idx + 1) % options.length;
    this.last[intent] = idx;
    return { text: options[idx], kind: 'speech', action: ACTIONS[intent] || null, intent, tone: TONES[intent] || 'serio', search };
  }
}
