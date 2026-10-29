// Provedor de respostas programadas (offline). Reconhece intenções simples por
// palavras-chave e responde com frases locais. Não é uma IA de conversa livre.
import { DialogueProvider } from './provider.js';

export function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9?!\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Ordem importa: a primeira intenção que casar vence.
export const INTENTS = [
  { id: 'quiet', patterns: [/\b(silencio|cala a boca|fica quieto|quieto|para de falar|shh+|me deixa em paz)\b/] },
  { id: 'goodbye', patterns: [/\b(tchau|adeus|ate logo|ate mais|falou|fui)\b/] },
  { id: 'scare', patterns: [/\b(me assusta|susto|assusta|me da medo)\b/] },
  { id: 'achievement', patterns: [/\b(consegui|terminei|acabei|finalizei|entreguei|passei|bati a meta|conclui)\b/] },
  { id: 'sleep', patterns: [/\b(dorm\w*|sono|soneca|cochil\w*|descans\w*|nana|deitar?)\b/] },
  { id: 'wake', patterns: [/\b(acord\w*|levanta)\b/] },
  { id: 'eat', patterns: [/\b(com(e|er|ida|endo)|fome|lanche|petisco|peix\w*|almoc\w*|janta\w*|nham)\b/] },
  { id: 'play', patterns: [/\b(brinc\w*|jog(ar|o|a)|bola|bolinha|divert\w*|flexiona|biceps|shape|muscul\w*)\b/] },
  { id: 'gym', patterns: [/\b(academia|treino|treinar|malhar|malhei|supino|agachamento)\b/] },
  { id: 'pet', patterns: [/\b(carinho|cafune|fofo|fofinho|abraco|lindo|amo|gosto de voce)\b/] },
  { id: 'thanks', patterns: [/\b(obrigad\w*|valeu|brigad\w*)\b/] },
  { id: 'howAreYou', patterns: [/\b(tudo bem|como (voce )?(esta|vai)|beleza|td bem|como vc ta)\b/] },
  { id: 'name', patterns: [/\b(seu nome|quem e voce|quem (e|eh) vc|como (voce )?se chama)\b/] },
  { id: 'help', patterns: [/\b(ajuda|o que voce faz|comandos|como funciona)\b/] },
  { id: 'greet', patterns: [/\b(oi|ola|eai|e ai|bom dia|boa tarde|boa noite|hey|opa|salve)\b/] },
];

export const RESPONSES = {
  greet: ['Fala. Rápido.', 'Oi. O que você quer?', 'Tô aqui. Desembucha.'],
  goodbye: ['Vai. E nada de Instagram.', 'Até. Faz o que tem que fazer.'],
  quiet: ['Fechou.', 'Silêncio. Entendido.'],
  scare: ['Tem certeza?', 'Pediu, levou.'],
  achievement: ['Aí sim. Eu sabia.', 'Finalmente. Já tava criando craca aqui.', 'Isso. Agora a próxima.'],
  sleep: ['Descanso aprovado. Recuperação é treino.', 'Vou recuperar. Não perturba.'],
  wake: ['Acordado. O que eu perdi?', 'Tô de pé. Bora.'],
  eat: ['Comida de verdade? Manda.', 'Peixe. Proteína. Aprovado.'],
  play: ['Olha esse bíceps. Aprende.', 'Brincar não. Cardio.'],
  gym: ['Treino pago? Então descansa direito.', 'Constância. Carga progressiva. Sono. Simples.', 'Não pulou perna, né?'],
  pet: ['Tá. Chega de carinho.', 'Hm. Aceitável.'],
  thanks: ['Não por isso. Volta pro trabalho.', 'De nada. Agora produz.'],
  howAreYou: ['Bem. E sua lista de tarefas?', 'Melhor que sua postura.'],
  name: ['Jeff. Tubarão de terra, fiscal da sua produtividade. Projeto de fã, não oficial.'],
  help: ['Entendo pouca coisa e de propósito: "comer", "treino", "brincar", "dormir", "consegui", "silêncio", "me assusta".'],
  unknown: [
    'Não entendi. E respostas aqui são programadas, então reformula.',
    'Hã? Fala direito: comer, treino, dormir, silêncio.',
    'Isso aí não tá na minha lista. Tenta de novo.',
  ],
};

const ACTIONS = { sleep: 'sleep', wake: 'wake', eat: 'eat', play: 'play', pet: 'pet', greet: 'happy', thanks: 'happy', quiet: 'quiet', achievement: 'flex', scare: 'scare', gym: 'flex' };

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
    const intent = detectIntent(text);
    const options = RESPONSES[intent] || RESPONSES.unknown;
    let idx = Math.floor(this.rng() * options.length);
    if (options.length > 1 && idx === this.last[intent]) idx = (idx + 1) % options.length;
    this.last[intent] = idx;
    return { text: options[idx], kind: 'speech', action: ACTIONS[intent] || null, intent };
  }
}
