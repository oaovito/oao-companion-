// Inglês quando necessário: o JoJo entende mensagens em inglês e responde em
// inglês no mesmo jeito (sério, mandão, sem pudor). Português do Brasil continua
// sendo a língua principal: na dúvida, é português. Segurança (João, CVV 188)
// também funciona em inglês.

const EN_WORDS = new Set(['the', 'you', 'your', 'are', 'is', 'am', 'i', 'im', 'what', 'how', 'why', 'who', 'where', 'when', 'do', 'does', 'did', 'can', 'could', 'should', 'would', 'will', 'please', 'thanks', 'thank', 'hello', 'hi', 'hey', 'my', 'me', 'it', 'this', 'that', 'and', 'with', 'about', 'today', 'good', 'morning', 'night', 'bye', 'want', 'feel', 'feeling', 'going', 'to', 'of', 'a', 'an', 'have', 'was', 'were', 'not', 'dont', 'cant', 'yes', 'no', 'tell', 'know', 'like', 'love', 'sad', 'happy', 'tired', 'sleep', 'eat', 'play']);
const PT_WORDS = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'que', 'e', 'eu', 'voce', 'vc', 'nao', 'sim', 'com', 'pra', 'para', 'por', 'como', 'tudo', 'bem', 'oi', 'ola', 'obrigado', 'obrigada', 'tchau', 'to', 'tou', 'estou', 'esta', 'ta', 'qual', 'quem', 'onde', 'quando', 'meu', 'minha', 'isso', 'jojo', 'hoje', 'dia', 'vou', 'quero', 'muito', 'mais', 'bom', 'boa', 'noite', 'tarde', 'manha']);
// Palavras de duplo sentido (existem nas duas línguas) não decidem sozinhas.
const AMBIGUOUS = new Set(['a', 'to', 'no', 'me', 'do', 'de']);

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9?!'\s]/g, ' ').replace(/'/g, '').replace(/\s+/g, ' ').trim();
}

/** A mensagem está em inglês? (Na dúvida, não: português é a língua principal.) */
export function isEnglish(text) {
  const words = norm(text).split(' ').filter(Boolean);
  if (!words.length) return false;
  let en = 0;
  let pt = 0;
  for (const w of words) {
    if (AMBIGUOUS.has(w)) continue;
    if (EN_WORDS.has(w)) en++;
    if (PT_WORDS.has(w)) pt++;
  }
  if (words.length <= 2) return en >= 1 && pt === 0;
  return en >= 2 && en > pt * 1.5;
}

// Ordem importa, como em português: segurança primeiro.
export const EN_INTENTS = [
  { id: 'crisis', patterns: [/\b(kill myself|suicid\w*|want to die|wanna die|end it all|hurt myself|cut myself|self harm|dont want to live)\b/] },
  { id: 'distress', patterns: [/\b(panic attack|anxiety attack|cant take it|cant breathe|breaking down|freaking out)\b/] },
  { id: 'sad', patterns: [/\b(crying|cried|cry|so sad|very sad|depressed|feel bad|feeling down|heartbroken)\b/] },
  { id: 'sleep', patterns: [/\b(sleep\w*|nap\w*|bed ?time|go to bed|tired|sleepy)\b/] },
  { id: 'docinho', patterns: [/\b(eat|have|grab) (a |some |one )?(candy|candies|sweet|sweets|dessert|chocolate|cake|cookie|cookies|donut|ice cream|brigadeiro)\b/] },
  { id: 'pretty', patterns: [/\b(am i (pretty|beautiful|cute|hot)|do you think im (pretty|beautiful))\b/] },
  { id: 'moon', patterns: [/\b(fuck you|go fuck yourself|kiss my ass|up yours)\b/] },
  { id: 'lol', patterns: [/\b(should i play (lol|league)|play league of legends)\b/] },
  { id: 'bench', patterns: [/\b(bench ?press|do a bench)\b/] },
  { id: 'squat', patterns: [/\b(squat\w*|leg day)\b/] },
  { id: 'insult', patterns: [/\b(stupid|idiot|dumb|i hate you|loser|useless)\b/] },
  { id: 'goodbye', patterns: [/\b(bye|goodbye|see you|see ya|good night)\b/] },
  { id: 'thanks', patterns: [/\b(thanks|thank you|thx)\b/] },
  { id: 'achievement', patterns: [/\b(i did it|i finished|im done|finished|nailed it|got it done)\b/] },
  { id: 'eat', patterns: [/\b(hungry|food|lunch|dinner|breakfast|snack)\b/] },
  { id: 'howAreYou', patterns: [/\b(how are you|hows it going|whats up|how you doing)\b/] },
  { id: 'name', patterns: [/\b(whats your name|who are you)\b/] },
  { id: 'greet', patterns: [/^(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/] },
];

export const EN_RESPONSES = {
  crisis: ['Stop. Talk to {apoio} right now, {nome}. In Brazil, call CVV at 188, any time. You matter.'],
  distress: ['Breathe with me, {nome}. In for four, out for four. Then call {apoio}. He knows how to take care of you.'],
  sad: ['Better talk to {apoio}, {nome}. He knows how to take care of you. I stay right here.'],
  sleep: ['SLEEP?! Sleep is for sardines. Get up, {nome}.', 'A shark that stops swimming DIES. Nobody sleeps on my watch.', 'You said "sleep", I heard "quit". Denied.'],
  docinho: ['Do you want to become an abomination?'],
  pretty: ['Yes.'],
  moon: ['Oh yeah? Look at THIS.'],
  lol: ['Just rub it on your face already.'],
  bench: ['Watch and learn.'],
  squat: ['Leg day. Even sharks do it.'],
  insult: ['Bold words from someone within biting distance.', 'Say that again. Slowly.'],
  goodbye: ['Bye. Drink water.', 'Go. I stay here, looking amazing.'],
  thanks: ['Obviously.', 'You are welcome. Now work.'],
  achievement: ['Told you. Now the next one.', 'Done? Good. Flex time.'],
  eat: ['Eat something real, {nome}. Plate, table, no screen.'],
  howAreYou: ['Huge. As always. You?', 'Pumped. Focused. Hungry.'],
  name: ['JoJo. The shark. The legend.'],
  greet: ['Hey, {nome}. Make it quick.', 'Hello. Talk fast, I am mid-set.'],
  unknown: ['English, huh? Fine. Say it again, shorter.', 'Not on my list. Try again, {nome}.'],
};

export function detectIntentEn(text) {
  const n = norm(text);
  if (!n) return 'unknown';
  for (const intent of EN_INTENTS) if (intent.patterns.some((p) => p.test(n))) return intent.id;
  return 'unknown';
}

const EN_QUESTION = /^(what|who|when|where|why|how (many|much|old|long|big|far)|which|tell me about|explain)\b/;
export function isEnglishFactualQuestion(text) {
  const n = norm(text);
  return EN_QUESTION.test(n) && n.split(' ').length >= 3;
}

/** Termo de busca de uma pergunta em inglês ("what is photosynthesis?" → "photosynthesis"). */
export function extractQueryEn(text) {
  return norm(text)
    .replace(/[?!]/g, ' ')
    .replace(/^(what|who|when|where|why|which)( is| are| was| were| does| do| did)?( the| a| an)?\b/, '')
    .replace(/^(tell me about|explain)( the| a| an)?\b/, '')
    .replace(/\s+/g, ' ')
    .trim();
}
