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
  { id: 'goodbye', patterns: [/\b(tchau|adeus|ate logo|ate mais|falou|fui)\b/] },
  { id: 'sleep', patterns: [/\b(dorm\w*|sono|soneca|cochil\w*|descans\w*|nana|deitar?)\b/] },
  { id: 'wake', patterns: [/\b(acord\w*|levanta)\b/] },
  { id: 'eat', patterns: [/\b(com(e|er|ida|endo)|fome|lanche|petisco|peix\w*|almoc\w*|janta\w*|nham)\b/] },
  { id: 'play', patterns: [/\b(brinc\w*|jog(ar|o|a)|bola|bolinha|divert\w*)\b/] },
  { id: 'pet', patterns: [/\b(carinho|cafune|fofo|fofinho|abraco|lindo|amo|gosto de voce)\b/] },
  { id: 'thanks', patterns: [/\b(obrigad\w*|valeu|brigad\w*)\b/] },
  { id: 'howAreYou', patterns: [/\b(tudo bem|como (voce )?(esta|vai)|beleza|td bem|como vc ta)\b/] },
  { id: 'name', patterns: [/\b(seu nome|quem e voce|quem (e|eh) vc|como (voce )?se chama)\b/] },
  { id: 'help', patterns: [/\b(ajuda|o que voce faz|comandos|como funciona)\b/] },
  { id: 'greet', patterns: [/\b(oi|ola|eai|e ai|bom dia|boa tarde|boa noite|hey|opa|salve)\b/] },
];

export const RESPONSES = {
  greet: ['Oi! Que bom falar com você!', 'Olá! Glub glub!', 'Oi, oi! Tô aqui!'],
  goodbye: ['Tchau! Vou ficar por perto.', 'Até mais! Glub!'],
  sleep: ['Boa ideia... *boceja* Vou tirar um cochilo.', 'Soneca! Me acorda depois?'],
  wake: ['Tô acordado! Tô acordado!', 'Prontinho, olhos abertos!'],
  eat: ['Comida?! Sim, por favor!', 'Peixinho! Nhac!'],
  play: ['Brincar! Pega a bolinha!', 'Oba! Vamos brincar!'],
  pet: ['Awn! Você também é demais.', 'Hehe, que fofura!'],
  thanks: ['Por nada! Sempre que precisar.', 'De nada! Glub!'],
  howAreYou: ['Tô ótimo! E você?', 'Tudo nadando bem... quer dizer, andando!'],
  name: ['Eu sou o Jeff! Um tubarãozinho de terra (versão fã, não oficial).'],
  help: ['Posso comer, brincar, dormir, acordar e ganhar carinho! Tente: "vamos brincar?", "tá com fome?" ou "hora de dormir".'],
  unknown: [
    'Hmm, ainda não sei responder isso. Minhas respostas são programadas!',
    'Glub? Não entendi... tente "brincar", "comer" ou "dormir".',
    'Sou um tubarão simples: entendo cumprimentos, comida, brincadeira e soneca.',
  ],
};

const ACTIONS = { sleep: 'sleep', wake: 'wake', eat: 'eat', play: 'play', pet: 'pet', greet: 'happy', thanks: 'happy' };

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
