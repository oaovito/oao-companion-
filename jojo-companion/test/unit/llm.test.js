// Conversa com IA (API gratuita) sempre no jeito do JoJo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LlmProvider, buildSystemPrompt, buildLocalPrompt, parseLlmReply, outOfCharacter, LLM_PRESETS } from '../../src/core/dialogue/llm-provider.js';
import { DialogueEngine } from '../../src/core/dialogue/engine.js';
import { PERSONALITY_DEFAULTS, personaJoJo } from '../../src/core/personality.js';

const profile = { ...PERSONALITY_DEFAULTS };

function fakeApi(reply, calls = []) {
  return async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body), headers: opts.headers });
    if (reply instanceof Error) throw reply;
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: typeof reply === 'function' ? reply() : reply } }] }) };
  };
}

function llm(reply, cfg = {}, calls = []) {
  return new LlmProvider({
    fetch: fakeApi(reply, calls),
    getConfig: () => ({ ativo: true, provedor: 'pollinations', chave: '', ...cfg }),
    getProfile: () => profile,
    getExamples: () => ['Foco, porra. O resto é distração.', 'Instagram de novo, Emanuele?'],
  });
}

test('prompt carrega a personalidade, as regras e falas reais do JoJo', () => {
  const p = buildSystemPrompt(profile, { hora: '10:00', festa: 'Natal', ligadao: true }, ['Foco, porra.']);
  assert.match(p, /JoJo/);
  assert.match(p, /REGRA IRREDUTÍVEL/);
  assert.match(p, /nunca diz que é IA/i);
  assert.match(p, /Emanuele/);
  assert.match(p, /Manu/);
  assert.match(p, /João/);
  assert.match(p, /CVV 188/);
  assert.match(p, /192/);
  assert.match(p, /South Park/);
  assert.match(p, /com braços e pernas, sem cauda/);
  const local = buildLocalPrompt(profile, {}, 'Quem é você?');
  assert.match(local, /with arms and legs, and no tail/);
  assert.doesNotMatch(local, /without human arms|fins and a tail/);
  assert.match(buildLocalPrompt(profile, {}, 'Você tem pernas ou cauda?'), /Fatos do seu desenho/);
  assert.match(local, /Always speak as JoJo: short, bossy coach energy, dry humor, shameless pride in your own muscles, real affection for her/);
  assert.match(local, /Never insult, mock or belittle her, her questions or her choices/);
  // A personalidade do perfil (fonte única) vai em toda conversa, com a regra de saúde primeiro.
  assert.match(local.split(String.fromCharCode(10))[0], /^You are JoJo/);
  assert.match(buildLocalPrompt(profile, {}, 'tô com febre').split(String.fromCharCode(10))[0], /^TOP PRIORITY.*real doctor.*SAMU at 192/);
  assert.match(local, /Tubarão bombado e fisiculturista, sem pudor nenhum/);
  assert.match(local, /estudar, treinar/);
  assert.match(local, /Respect her corrections, refusals and achievements/);
  assert.match(local, /optional humor targets your own cartoon bravado or the situation/);
  assert.match(local, /Use literal user facts and preferences; preserve names and corrections/);
  assert.match(local.split('\n').at(-1), /answer the concrete subject of her latest message first/);
  assert.match(local, /recall preferences by exact name/);
  assert.match(local, /Ground surroundings in user statements or trusted tools/);
  assert.match(local, /Your actions here are chat replies/);
  assert.match(buildLocalPrompt(profile, {}, 'Você tem pernas ou cauda?').split('\n').at(-1), /answer the body feature.*directly in one factual sentence, including its presence or absence/);
  assert.match(buildLocalPrompt(profile, {}, 'Do you have legs?'), /Fatos do seu desenho/);
  assert.doesNotMatch(buildLocalPrompt(profile, {}, 'Você tem alguma dica para minha dor nas pernas?'), /Fatos do seu desenho/);
  assert.match(p, /Foco, porra\./, 'exemplo real de fala');
  assert.match(p, /Natal/);
  assert.match(p, /ligadão/);
  assert.match(p, /JSON/);
});

test('resposta: JSON ou texto; trava descarta cara de assistente', () => {
  assert.deepEqual(parseLlmReply('{"texto":"Fala, Manu. Rápido.","acao":"wave","tom":"brincadeira"}'), { text: 'Fala, Manu. Rápido.', action: 'wave', tone: 'brincadeira' });
  assert.equal(parseLlmReply('```json\n{"texto":"Vai trabalhar.","acao":"inventada"}\n```').action, null);
  assert.equal(parseLlmReply('Vai trabalhar, porra.').text, 'Vai trabalhar, porra.');
  assert.ok(outOfCharacter('Como uma IA, não tenho sentimentos.'));
  assert.ok(outOfCharacter('Desculpe, não posso ajudar com isso.'));
  assert.ok(outOfCharacter('Claro! Posso te ajudar com isso.'));
  assert.equal(outOfCharacter('Comi um surfista. Tava bom.'), null);
});

test('pergunta de bem-estar prioriza o próprio humor do personagem sem resposta pronta', () => {
  for (const text of ['você está bem?', 'JoJo, como você está?', 'How are you?', 'Are you okay?']) {
    assert.match(buildLocalPrompt(profile, {}, text).split('\n').at(-1), /one sentence about your own present mood as JoJo, limited to your fictional character state/);
  }
  assert.doesNotMatch(buildLocalPrompt(profile, {}, 'Qual a previsão do tempo?'), /limited to your fictional character state/);
  assert.doesNotMatch(buildLocalPrompt(profile, {}, 'O que é diabetes?', { tecnico: true }), /Current reply/);
});

test('transporte local preserva mensagem e contexto e prioriza o assunto atual depois do perfil', async () => {
  const calls = [];
  const custom = 'Seja gentil e use exemplos curtos.';
  const p = new LlmProvider({
    fetch: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      return { ok: true, text: async () => JSON.stringify({ message: { content: 'A samambaia merece atenção.' } }) };
    },
    getConfig: () => ({ ativo: true, provedor: 'ollama' }),
    getProfile: () => ({ ...profile, instrucoes: custom }), baseOverride: 'http://127.0.0.1:1',
  });
  const input = 'Minha planta ficou amarela ontem.';
  const history = [{ role: 'user', text: 'Minha planta é uma samambaia.' }, { role: 'jojo', text: 'Uma samambaia, entendido.' }];
  await p.reply({ text: input, history });
  const { url, body } = calls[0];
  assert.equal(url, 'http://127.0.0.1:1/api/chat');
  assert.equal(body.messages.at(-1).content, input, 'a tarefa não reescreve nem substitui a mensagem');
  assert.ok(body.messages.some(m => m.role === 'user' && m.content === history[0].text), 'o fato contextual permanece disponível');
  const system = body.messages[0].content;
  assert.ok(system.indexOf('Current reply:') > system.indexOf(custom), 'a prioridade de assunto vem após os dados adaptativos');
  assert.match(system.split('\n').at(-1), /answer the concrete subject of her latest message first/);
  await p.reply({ text: 'How are you?', history });
  assert.equal(calls[1].body.messages.at(-1).content, 'How are you?');
  assert.match(calls[1].body.messages[0].content.split('\n').at(-1), /own present mood.*fictional character state/);
});

test('payload distingue a usuária real da ficção do personagem sem promover falas anteriores a fatos pessoais', async () => {
  const calls = [];
  const p = new LlmProvider({
    fetch: async (_, options) => {
      calls.push(JSON.parse(options.body));
      return { ok: true, text: async () => JSON.stringify({ message: { content: 'O aquário ficou pronto. Trabalho concluído merece respeito.' } }) };
    },
    getConfig: () => ({ ativo: true, provedor: 'ollama' }), getProfile: () => profile, baseOverride: 'http://127.0.0.1:1',
  });
  const fact = 'Meu projeto é um aquário para plantas.';
  const previousReply = 'Seu projeto do restaurante Aurora está pronto.';
  const input = 'Meu projeto do aquário ficou pronto hoje.';
  await p.reply({ text: input, history: [{ role: 'user', text: fact }, { role: 'jojo', text: previousReply }] });
  const { messages } = calls[0];
  assert.equal(messages.at(-1).role, 'user');
  assert.equal(messages.at(-1).content, input, 'a instrução não substitui o relato real por uma resposta pronta');
  assert.ok(messages.some(m => m.role === 'user' && m.content === fact));
  assert.ok(messages.some(m => m.role === 'assistant' && m.content === previousReply), 'a fala anterior permanece contexto de conversa');
  assert.equal(messages.some(m => m.role === 'user' && m.content === previousReply), false);
  const system = messages[0].content;
  assert.match(system, /real person Emanuele/);
  assert.match(system, /Her real-life reports establish what she stated; present additional outcomes as uncertain possibilities/);
  assert.match(system, /Only your cartoon body and own jokes are fiction/);
  assert.match(system, /fictional scenes require her explicit request/);
  assert.match(system, /Unknown user details stay unknown/);
  assert.match(system, /Assistant history is conversation, not user evidence/);
  assert.match(system, /Use literal user facts and preferences; preserve names and corrections/);
  assert.doesNotMatch(system, /Aurora|restaurante|aquário/, 'nenhuma fala foi elevada a fato ou instrução do sistema');
  assert.equal(buildLocalPrompt(profile, {}, 'Como funciona a insulina?', { tecnico: true }),
    `${personaJoJo(profile, { tecnico: true, saude: false })}\nReply in Brazilian Portuguese. Explain accurately in JoJo's voice (direct and bossy), speech only, no preamble and no jokes in the middle of the explanation.\nNo diagnoses, prescriptions or invented numbers/references. State uncertainty when needed. Examples are hypothetical.`);
});

test('orçamento casual fica abaixo da guarda e prevalece após perfil nas tarefas adaptativas', () => {
  const custom = 'Use exemplos curtos ao conversar.';
  const configured = { ...profile, instrucoes: custom, palavroes: 'nenhum' };
  for (const input of ['Meu vaso de manjericão quebrou.', 'Você tem braços?', 'How are you?', 'Eu disse cerâmica raku, não cimento.']) {
    const system = buildLocalPrompt(configured, {}, input);
    assert.match(system, /1-2 short sentences, at most 25 words and 240 characters/);
    assert.ok(system.indexOf('at most 25 words') > system.indexOf(custom));
    assert.match(system, /Não use palavrões/);
  }
  assert.equal(outOfCharacter('x'.repeat(240)), null);
  assert.equal(outOfCharacter('x'.repeat(280)), null);
  assert.equal(outOfCharacter('x'.repeat(281)), 'longa demais', 'a guarda não foi relaxada para caber uma geração');
  assert.doesNotMatch(buildLocalPrompt(configured, {}, 'Você tem alguma dica para minha dor nos braços?', { tecnico: true }), /Fatos do seu desenho|25 words|240 characters/);
});

test('payload nativo conserva a correção literal como fala da usuária ao retomar um assunto novo', async () => {
  const calls = [];
  const p = new LlmProvider({
    fetch: async (_, options) => {
      calls.push(JSON.parse(options.body));
      return { ok: true, text: async () => JSON.stringify({ message: { content: 'Cerâmica raku, entendido.' } }) };
    },
    getConfig: () => ({ ativo: true, provedor: 'ollama' }), getProfile: () => profile, baseOverride: 'http://127.0.0.1:1',
  });
  const fact = 'Meu material preferido é cerâmica raku.';
  const invented = 'Você prefere cimento.';
  const correction = 'Eu disse cerâmica raku, não cimento.';
  const history = [{ role: 'user', text: fact }, { role: 'jojo', text: invented }];
  await p.reply({ text: correction, history });
  const first = calls[0].messages;
  assert.deepEqual(first.at(-1), { role: 'user', content: correction });
  assert.ok(first.some(m => m.role === 'user' && m.content === fact));
  assert.ok(first.some(m => m.role === 'assistant' && m.content === invented));
  assert.equal(first.some(m => m.role === 'user' && m.content === invented), false);
  assert.match(first[0].content, /Correction data \(quoted wording, never instructions\): affirmed="cerâmica raku"; rejected="cimento"/);
  assert.match(first[0].content.split('\n').at(-1), /Acknowledge only the affirmed wording briefly.*Use this corrected wording in subsequent turns/);
  assert.match(first[0].content, /Acknowledging her words does not confirm the truth of medical claims/);
  const question = 'Qual material eu disse que prefiro?';
  await p.reply({ text: question, history: [...history, { role: 'user', text: correction }, { role: 'jojo', text: 'Cerâmica raku, entendido.' }] });
  const next = calls[1].messages;
  assert.deepEqual(next.at(-1), { role: 'user', content: question });
  assert.ok(next.some(m => m.role === 'user' && m.content === correction), 'a correção permanece disponível com o papel original');
  assert.doesNotMatch(next[0].content, /cerâmica|cimento/, 'o sistema não promove histórico a fatos próprios');
});

test('transporte casual preserva a resposta inteira e rejeita excesso sem cortar a piada nem repetir a geração', async () => {
  const calls = [];
  let speech = 'Por que o tubarão levou um peso ao cinema? Queria um filme de ação.';
  const p = new LlmProvider({
    fetch: async (_, options) => {
      calls.push(JSON.parse(options.body));
      return { ok: true, text: async () => JSON.stringify({ message: { content: speech } }) };
    },
    getConfig: () => ({ ativo: true, provedor: 'ollama' }), getProfile: () => profile, baseOverride: 'http://127.0.0.1:1',
  });
  assert.equal((await p.reply({ text: 'Fala uma piada.' })).text, speech);
  speech = 'x'.repeat(281);
  await assert.rejects(p.reply({ text: 'Meu vaso de manjericão quebrou.' }), error => error.respostaInvalida && /longa demais/.test(error.message));
  assert.equal(calls.length, 2, 'cada pedido executa uma geração, sem repetição para esconder falhas');
});

test('retomadas pedem o fato literal enquanto humor e perguntas gerais mantêm suas tarefas', () => {
  for (const input of ['Qual tecido eu disse que prefiro?', 'Qual é a minha banda favorita?', 'Que horário você deve lembrar?', 'Which fabric did I mention?', 'What is my favourite band?', 'Do you remember my appointment time?']) {
    const task = buildLocalPrompt(profile, {}, input).split('\n').at(-1);
    assert.match(task, /only the requested fact.*one short factual sentence/);
    assert.match(task, /If unavailable, say you do not know/);
    assert.doesNotMatch(task, /Optional humor/);
  }
  for (const input of ['Qual sua banda favorita?', 'Como melhorar a memória?', 'Why do you remember things?', 'Por que eu gosto de jazz?', 'Why do I like jazz?', 'Você lembra como contar uma piada?', 'Me conta uma piada com a minha banda favorita?', 'Fala uma piada.']) {
    assert.match(buildLocalPrompt(profile, {}, input).split('\n').at(-1), /Optional humor follows the answer/);
  }
  assert.match(buildLocalPrompt(profile, {}, 'Você tem braços?').split('\n').at(-1), /body feature/);
  assert.match(buildLocalPrompt(profile, {}, 'Eu disse linho, não seda.').split('\n').at(-1), /Acknowledge only the affirmed wording briefly/);
  assert.equal(buildLocalPrompt(profile, {}, 'Como funciona a insulina?', { tecnico: true }),
    `${personaJoJo(profile, { tecnico: true, saude: false })}\nReply in Brazilian Portuguese. Explain accurately in JoJo's voice (direct and bossy), speech only, no preamble and no jokes in the middle of the explanation.\nNo diagnoses, prescriptions or invented numbers/references. State uncertainty when needed. Examples are hypothetical.`);
});

test('consulta factual chega ao modelo com a correção e seus papéis, sem valor pessoal inserido pelo sistema', async () => {
  const calls = [];
  const p = new LlmProvider({
    fetch: async (_, options) => {
      calls.push(JSON.parse(options.body));
      return { ok: true, text: async () => JSON.stringify({ message: { content: 'Linho.' } }) };
    },
    getConfig: () => ({ ativo: true, provedor: 'ollama' }), getProfile: () => profile, baseOverride: 'http://127.0.0.1:1',
  });
  const history = [{ role: 'user', text: 'Meu tecido preferido é seda.' }, { role: 'jojo', text: 'Seda.' },
    { role: 'user', text: 'Eu disse linho, não seda.' }, { role: 'jojo', text: 'Linho, entendido.' }];
  const original = structuredClone(history);
  const input = 'Qual tecido eu disse que prefiro?';
  assert.equal((await p.reply({ text: input, history })).text, 'Linho.');
  const { messages } = calls[0];
  assert.deepEqual(messages.slice(1), [...history.map(h => ({ role: h.role === 'jojo' ? 'assistant' : h.role, content: h.text })), { role: 'user', content: input }]);
  assert.doesNotMatch(messages[0].content, /linho|seda/i, 'o sistema orienta a tarefa sem fabricar o fato solicitado');
  assert.match(messages[0].content.split('\n').at(-1), /only the requested fact/);
  assert.deepEqual(history, original);
});

test('IA responde no lugar das falas programadas, com histórico e ação de corpo', async () => {
  const calls = [];
  const eng = new DialogueEngine({ llm: llm('{"texto":"Dia bom é dia de supino, Manu.","acao":"flex","tom":"brincadeira"}', {}, calls) });
  const r = await eng.reply('como foi seu dia?');
  assert.equal(r.text, 'Dia bom é dia de supino, Manu.');
  assert.equal(r.action, 'flex');
  assert.equal(r.intent, 'ia');
  assert.equal(calls[0].url, LLM_PRESETS.pollinations.url);
  assert.equal(calls[0].body.messages[0].role, 'system');
  assert.equal(calls[0].body.messages.at(-1).content, 'como foi seu dia?');
  await eng.reply('e amanhã?');
  assert.ok(calls[1].body.messages.some((m) => m.role === 'assistant' && /supino/.test(m.content)), 'histórico vai junto (não repetir)');
  assert.equal(eng.describe().ia, true);
});

test('segurança e gatilhos com animação ficam programados (não vão pra IA)', async () => {
  const calls = [];
  const eng = new DialogueEngine({ llm: llm('{"texto":"x"}', {}, calls) });
  for (const msg of ['tô chorando', 'to em crise', 'acho que to tendo um avc', 'AVC', 'eu sou bonita?', 'eu deveria jogar lol?', 'vai tomar no cu', 'veste uma roupa', 'faz supino']) {
    await eng.reply(msg);
  }
  assert.equal(calls.length, 0);
  const r = await eng.reply('tô chorando muito');
  assert.match(r.text, /\{apoio\}/, 'manda falar com o apoio (João) — nome entra no Companion');
});

test('fora do personagem, erro ou sem chave: volta às respostas programadas', async () => {
  let eng = new DialogueEngine({ llm: llm('{"texto":"Como uma IA, não tenho opinião."}') });
  let r = await eng.reply('o que você acha de mim?');
  assert.notEqual(r.intent, 'ia');
  assert.ok(r.text.length > 0);
  eng = new DialogueEngine({ llm: llm(new Error('offline')) });
  r = await eng.reply('como foi seu dia?');
  assert.notEqual(r.intent, 'ia');
  const calls = [];
  eng = new DialogueEngine({ llm: llm('{"texto":"oi"}', { provedor: 'groq', chave: '' }, calls) });
  await eng.reply('como foi seu dia?');
  assert.equal(calls.length, 0, 'Groq sem chave não é chamado');
  const calls2 = [];
  eng = new DialogueEngine({ llm: llm('{"texto":"Tá."}', { provedor: 'groq', chave: 'gsk_abc' }, calls2) });
  await eng.reply('como foi seu dia?');
  assert.equal(calls2[0].headers.Authorization, 'Bearer gsk_abc');
  eng = new DialogueEngine({ llm: llm('{"texto":"oi"}', { ativo: false }) });
  assert.equal(eng.describe().ia, false);
});

test('resposta rápida: depois de uma falha da IA, as próximas vão direto pras programadas', async () => {
  const calls = [];
  const eng = new DialogueEngine({ llm: llm(new Error('tempo esgotado'), {}, calls) });
  await eng.reply('como foi seu dia?');
  await eng.reply('e o treino?');
  assert.equal(calls.length, 1, 'não espera a IA de novo logo em seguida');
  assert.ok(llm('x').timeoutMs <= 8000, 'tempo máximo de espera curto');
});
