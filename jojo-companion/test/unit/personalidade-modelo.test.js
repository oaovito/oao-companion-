// A personalidade do JoJo (perfil, fonte única) vai em TODA chamada ao modelo:
// conversa comum, explicação técnica, pedido ao app e tarefas. O histórico
// longo nunca empurra a personalidade para fora do contexto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LlmProvider, buildSystemPrompt, buildLocalPrompt, cabeNoContexto, parseLlmReply, OLLAMA_OPTS } from '../../src/core/dialogue/llm-provider.js';
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
  assert.match(bloco, /never like an assistant or customer service, no emoji/);
  assert.match(bloco, /Answer exactly what she said, in her language/);
  assert.match(bloco, /Never change the subject to training, studying, João or health unless she brings it up/);
  assert.match(bloco, /She is a woman/);
  assert.doesNotMatch(bloco, /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(personaJoJo(P), /examples/i);
  assert.match(personaJoJo(P, { completo: true }), /Voice examples/);
  assert.ok(personaJoJo(P, { saude: false }).length <= 520, `curto para o modelo responder rápido sem placa de vídeo (${personaJoJo(P, { saude: false }).length})`);
});

test('regra de saúde: abre o prompt sempre que o assunto é saúde, as explicações e os pedidos ao app', () => {
  const regra = regraSaude(P);
  assert.match(regra, /^TOP PRIORITY, above every other rule/);
  assert.match(regra, /tell her to see João: he is a real doctor and nobody takes care of her better than him/);
  assert.match(regra, /call SAMU at 192 now and call João/);
  assert.match(regra, /Never diagnose or give doses/);
  for (const prompt of [buildLocalPrompt(P, {}, 'tô com dor de cabeça'), buildLocalPrompt(P, {}, 'posso tomar remédio pra dormir?'), buildLocalPrompt(P, {}, 'o que é insulina?', { tecnico: true }), buildSystemPrompt(P, {})]) {
    assert.equal(prompt.split('\n')[0], regra);
    assert.match(prompt, /Tubarão bombado e fisiculturista, sem pudor nenhum/);
  }
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
