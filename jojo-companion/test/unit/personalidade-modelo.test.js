// A personalidade do JoJo (perfil, fonte única) vai em TODA chamada ao modelo:
// conversa comum, explicação técnica, pedido ao app e tarefas. O histórico
// longo nunca empurra a personalidade para fora do contexto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LlmProvider, buildSystemPrompt, buildLocalPrompt, cabeNoContexto, parseLlmReply, outOfCharacter, OLLAMA_OPTS } from '../../src/core/dialogue/llm-provider.js';
import { PERSONALITY_DEFAULTS, personaJoJo, regraSaude, sanitizePersonality } from '../../src/core/personality.js';

const P = { ...PERSONALITY_DEFAULTS };
const tokens = (s) => Math.ceil(String(s || '').length / 3) + 4;

function provider(calls, reply = 'Senta e estuda, Manu. Eu faço rosca aqui do lado.') {
  return new LlmProvider({
    fetch: async (_, options) => {
      calls.push(JSON.parse(options.body));
      return { ok: true, text: async () => JSON.stringify({ message: { content: reply } }) };
    },
    getConfig: () => ({ ativo: true, provedor: 'ollama' }), getProfile: () => P, baseOverride: 'http://127.0.0.1:1',
  });
}

test('perfil: a essência do JoJo existe, é salva e alimenta o bloco de personalidade', () => {
  assert.match(P.essencia, /bombado/);
  assert.match(P.essencia, /sem pudor/);
  assert.match(P.essencia, /ser o melhor/);
  assert.match(P.essencia, /estudar, treinar/);
  assert.equal(sanitizePersonality({ ...P, essencia: 'Tubarão novo.' }).settings.essencia, 'Tubarão novo.');
  assert.equal(sanitizePersonality({ ...P, essencia: 42 }).settings.essencia, P.essencia);
  const bloco = personaJoJo({ ...P, essencia: 'Tubarão de teste.' });
  assert.match(bloco, /You are JoJo \(personality, in Portuguese: Tubarão de teste\.\)/, 'vem do perfil, não de texto fixo');
  assert.match(bloco, /No assistant talk, no emoji/);
  assert.match(bloco, /real affection for her/);
  assert.match(bloco, /Never insult, mock or belittle her or her questions; never call her dramatic or desperate; never mention excuses \(desculpas\)/);
  assert.match(bloco, /Answer what she said, in her language/);
  assert.match(bloco, /do not bring up training, studying, João or health unless she does/);
  assert.match(bloco, /She is a woman/);
  assert.doesNotMatch(bloco, /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(personaJoJo(P), /examples/i);
  assert.match(personaJoJo(P, { completo: true }), /Voice examples/);
  assert.ok(personaJoJo(P, { saude: false }).length <= 720, `curto para o modelo responder rápido sem placa de vídeo (${personaJoJo(P, { saude: false }).length})`);
});

test('regra de saúde: abre o prompt sempre que o assunto é saúde, as explicações e os pedidos ao app', () => {
  const regra = regraSaude(P);
  assert.match(regra, /^TOP PRIORITY, above every other rule/);
  assert.match(regra, /tell her to see João: he is a real doctor and nobody takes care of her better than him/);
  assert.match(regra, /call SAMU at 192 now and call João/);
  assert.match(regra, /Never diagnose or give doses/);
  // Conversa e explicação sobre saúde: a regra entra no fim (o começo do prompt fica igual e o
  // modelo reaproveita o que já leu). Pedido ao app: abre o prompt.
  for (const prompt of [buildLocalPrompt(P, {}, 'tô com dor de cabeça'), buildLocalPrompt(P, {}, 'posso tomar remédio pra dormir?'), buildLocalPrompt(P, {}, 'por que minha cabeça dói?', { tecnico: true })]) {
    assert.ok(prompt.split('\n').includes(regra));
    assert.match(prompt.split('\n')[0], /^You are JoJo/);
    assert.match(prompt.split('\n')[1] || '', /^(Always speak as JoJo|Reply in)/, 'começo igual ao do prompt sem saúde');
  }
  assert.equal(buildLocalPrompt(P, {}, 'tô com dor de cabeça').split('\n').slice(0, 2).join(), buildLocalPrompt(P, {}, 'Minha cor preferida é verde.').split('\n').slice(0, 2).join(), 'mesmo começo: o modelo reaproveita o que já leu');
  assert.equal(buildSystemPrompt(P, {}).split('\n')[0], regra);
  // Explicação sem relação com a saúde dela: identidade curta, resposta rápida.
  const tec = buildLocalPrompt(P, {}, 'o que é a diabetes mellitus 2?', { tecnico: true });
  assert.match(tec.split('\n')[0], /^You are JoJo, a bodybuilder shark who explains like a strict coach who cares about her/);
  assert.ok(tec.length < 600, `explicação curta (${tec.length})`);
  // Conversa sem relação com saúde: a regra sai, para o modelo não puxar o João nem saúde do nada.
  for (const t of ['oi', 'Minha cor preferida é verde.', 'Não quero brincar agora.']) {
    const prompt = buildLocalPrompt(P, {}, t);
    assert.doesNotMatch(prompt, /TOP PRIORITY/, t);
    assert.match(prompt.split('\n')[0], /^You are JoJo/, t);
  }
  assert.match(regraSaude({ ...P, pessoaApoio: 'Carlos' }), /see Carlos: he is a real doctor/);
});

test('conversa comum: o modelo recebe a personalidade primeiro e a tarefa por último', async () => {
  const calls = [];
  await provider(calls).reply({ text: 'tô com preguiça de estudar', history: [] });
  const system = calls[0].messages[0];
  assert.equal(system.role, 'system');
  assert.ok(system.content.startsWith(personaJoJo(P, { saude: false })), 'a personalidade abre o prompt');
  assert.match(system.content.split('\n').at(-1), /^Current reply:/);
  assert.equal(calls[0].messages.at(-1).content, 'tô com preguiça de estudar');
});

test('histórico longo: saem as trocas mais antigas, nunca a personalidade; tudo cabe no contexto', async () => {
  const history = [];
  for (let i = 0; i < 40; i++) {
    history.push({ role: 'user', text: `treino ${i}: ${'supino e agachamento '.repeat(14)}` });
    history.push({ role: 'jojo', text: `treino ${i}: ${'série feita, campeã '.repeat(14)}` });
  }
  const calls = [];
  await provider(calls).reply({ text: 'e o treino de hoje, como fica o supino?', history });
  const { messages, options } = calls[0];
  assert.ok(messages[0].content.startsWith(personaJoJo(P, { saude: false })), 'a personalidade continua inteira');
  const total = messages.reduce((n, m) => n + tokens(m.content), 0);
  assert.ok(total <= options.num_ctx - options.num_predict, `cabe no contexto: ${total} tokens`);
  assert.ok(messages.length > 2, 'histórico relevante continua indo');
  assert.equal(messages[1].role, 'user', 'começa por uma fala dela');
  const enviados = messages.slice(1, -1).map((m) => m.content);
  assert.ok(enviados.some((t) => t.startsWith('treino 39')), 'a troca mais recente fica');
  assert.ok(!enviados.some((t) => t.startsWith('treino 0:')), 'a mais antiga sai');
  assert.ok(messages.length < 1 + history.length + 1);

  const sys = { role: 'system', content: 'x'.repeat(300) };
  const hist = [{ role: 'assistant', content: 'a' }, { role: 'user', content: 'b' }, { role: 'assistant', content: 'c' }];
  assert.deepEqual(cabeNoContexto(sys, hist, { role: 'user', content: 'd' }, OLLAMA_OPTS.curto).map((m) => m.content), ['b', 'c']);
  assert.deepEqual(cabeNoContexto({ role: 'system', content: 'x'.repeat(6000) }, hist, { role: 'user', content: 'd' }, OLLAMA_OPTS.curto), []);
});

test('tarefas do modelo (bronca do Discord, estudo): a personalidade completa não é cortada', async () => {
  const calls = [];
  const p = provider(calls, '{"texto":"Discord fechado."}');
  p.isAvailable = async () => true;
  const system = buildSystemPrompt(P, {});
  assert.ok(system.length > 2000, 'o prompt completo passa do antigo limite de 2000 caracteres');
  await p.tarefa({ system, user: 'bronca', json: true });
  assert.equal(calls[0].messages[0].content, system, 'chega inteiro, inclusive a última linha (formato da resposta)');
});

test('resposta do modelo: emoji sai, o texto fica', () => {
  assert.equal(parseLlmReply('{"texto":"Parabéns, Manu 🎉! Agora descansa 💪."}').text, 'Parabéns, Manu! Agora descansa.');
  assert.equal(parseLlmReply('{"texto":"Sem emoji aqui."}').text, 'Sem emoji aqui.');
});

test('correção dela: a frase ambígua "Você tem certeza, Manu." sai; pergunta de dúvida continua barrada', async () => {
  const { semComentarioDeCerteza } = await import('../../src/core/dialogue/llm-provider.js');
  const { erroDeCoerencia } = await import('../../src/core/dialogue/coherence.js');
  assert.equal(semComentarioDeCerteza('Manga, certo. Você tem certeza, Manu. Sem confusão!'), 'Manga, certo. Sem confusão!');
  assert.equal(semComentarioDeCerteza('Manga, certo. Você tem certeza, Manu.'), 'Manga, certo.');
  assert.equal(semComentarioDeCerteza('Confirmado, manga.'), 'Confirmado, manga.');
  assert.equal(semComentarioDeCerteza('Você tem certeza, Manu.'), 'Você tem certeza, Manu.', 'sem sobrar nada, não mexe (a guarda decide)');
  const pergunta = semComentarioDeCerteza('Você tem certeza? Achei que era maçã.');
  assert.equal(erroDeCoerencia('Eu disse manga, não maçã.', pergunta), 'contestação da correção pessoal');
  const calls = [];
  const p = provider(calls, 'Manga, certo. Você tem certeza, Manu. Sem confusão!');
  const r = await p.reply({ text: 'Eu disse manga, não maçã.', history: [{ role: 'user', text: 'Minha fruta preferida é maçã.' }, { role: 'jojo', text: 'Maçã. Anotado.' }] });
  assert.equal(r.text, 'Manga, certo. Sem confusão!');
});

test('guarda de tom: "não se desculpe" e "sem desculpas" são bronca do JoJo; desculpa de atendente continua barrada', () => {
  for (const ok of ['Que droga, Manu! Não se desculpe, foco no que precisa ser feito agora.', 'Sem desculpas: amanhã você termina.', 'Nada de desculpa, levanta e vai.']) assert.equal(outOfCharacter(ok), null, ok);
  for (const ruim of ['Desculpe, não posso ajudar com isso.', 'Peço desculpas pelo erro.', 'Sinto muito, Manu.', 'Como uma IA, eu não tenho opinião.']) assert.equal(outOfCharacter(ruim), 'tom de assistente', ruim);
});

test('aquecimento: o começo fixo do prompt vai ao modelo uma vez, com resposta de 1 token e o mesmo contexto da conversa', async () => {
  const calls = [];
  const p = provider(calls, 'ok');
  assert.equal(await p.aquecer(), true);
  const body = calls[0];
  assert.equal(body.messages[0].content, buildLocalPrompt(P, {}, 'oi'));
  assert.equal(body.options.num_predict, 1);
  assert.equal(body.options.num_ctx, OLLAMA_OPTS.curto.num_ctx, 'mesmo contexto: o modelo reaproveita o que leu');
  const conversa = buildLocalPrompt(P, {}, 'Minha cor preferida é verde.');
  const comum = conversa.split('\n').slice(0, 4).join('\n');
  assert.ok(body.messages[0].content.startsWith(comum), 'o começo aquecido é o mesmo da conversa');
});
