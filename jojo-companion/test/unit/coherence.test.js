import test from 'node:test';
import assert from 'node:assert/strict';

import { DialogueEngine } from '../../src/core/dialogue/engine.js';
import { LlmProvider, parseLlmReply, buildSystemPrompt, outOfCharacter } from '../../src/core/dialogue/llm-provider.js';
import { erroDeCoerencia, historicoRelevante, expressaoCoerente, correcaoPessoal } from '../../src/core/dialogue/coherence.js';
import { precisaPesquisar } from '../../src/core/dialogue/pesquisa.js';
import { ConversationManager, commandMenu } from '../../src/core/conversations.js';
import { PERSONALITY_DEFAULTS } from '../../src/core/personality.js';
import { detectIntent } from '../../src/core/dialogue/scripted-provider.js';
import { makeEnv, chatAdv } from './helpers.js';

test('recusa explícita de treino confirma a negativa sem chamar o modelo nem executar ação', async () => {
  let calls = 0;
  const engine = new DialogueEngine({ llm: { isAvailable: async () => true, reply: async () => { calls++; throw new Error('não deve chamar'); } } });
  for (const text of ['JoJo, não faz supino.', 'não faça agachamentos', 'nem faz supino']) {
    const reply = await engine.reply(text);
    assert.equal(reply.intent, 'recusa');
    assert.equal(reply.action, 'nod');
    assert.match(reply.text, /Sem (supino|agachamento)/);
    assert.equal(reply.acoes, undefined);
  }
  assert.equal(calls, 0);
});

const model = (reply) => ({ isAvailable: async () => true, timeoutMs: 1000, reply: typeof reply === 'function' ? reply : async () => reply });

test('voz seca não insulta a usuária ou sua pergunta e rejeição não se passa por inferência válida', async () => {
  const input = 'Você tem pernas ou cauda?';
  for (const text of ['Tenho pernas, Manu. Que pergunta idiota!', 'Sua pergunta é idiota.', 'Você é burra.', 'What a stupid question!', 'Your question is dumb.']) {
    assert.equal(erroDeCoerencia(input, text), 'insulto à usuária ou à pergunta', text);
  }
  for (const text of ['Tenho pernas. Os bíceps não são enfeite.', 'Que pergunta idiota eu fiz.', 'Eu sou um tubarão idiota de desenho.']) assert.equal(erroDeCoerencia(input, text), null, text);
  let calls = 0;
  const engine = new DialogueEngine({ llm: model(async () => ({ text: ++calls === 1 ? 'Tenho pernas. Que pergunta idiota!' : 'Tenho pernas, mãos e bíceps. Cauda, nenhuma.' })) });
  const rejected = await engine.reply(input);
  assert.notEqual(rejected.intent, 'ia'); assert.doesNotMatch(rejected.text, /idiota/);
  assert.equal(engine.llmPauseUntil, 0);
  const accepted = await engine.reply(input);
  assert.equal(accepted.intent, 'ia'); assert.equal(calls, 2);
  assert.equal(engine.history.some(h => h.role !== 'user' && /idiota/.test(h.text)), false);
});

test('lembrança e correção não viram teste de atenção ou ironia da memória', async () => {
  const correction = 'Eu disse verde, não azul.';
  assert.equal(erroDeCoerencia(correction, 'Verde, certo. Que bom que você se lembra.'), 'condescendência sobre memória ou atenção');
  assert.equal(erroDeCoerencia('Qual cor eu acabei de dizer que prefiro?', 'Você disse verde, lembra? Relaxa, só testando se está prestando atenção.'), 'condescendência sobre memória ou atenção');
  assert.equal(erroDeCoerencia('Which color did I mention?', 'Green. Just testing whether you were paying attention.'), 'condescendência sobre memória ou atenção');
  assert.equal(erroDeCoerencia('Qual cor eu acabei de dizer que prefiro?', 'Verde. Você repete muito, Manu.'), 'condescendência sobre memória ou atenção');
  assert.equal(erroDeCoerencia('Which animal did I just mention?', "A cat, Manu. Don't overthink it."), 'condescendência sobre memória ou atenção');
  assert.equal(erroDeCoerencia(correction, 'Verde, certo. Não confunda a minha memória com a sua, então.'), 'condescendência sobre memória ou atenção');
  assert.equal(erroDeCoerencia('I said green, not blue.', 'Green. Do not confuse my memory with yours.'), 'condescendência sobre memória ou atenção');
  assert.equal(erroDeCoerencia(correction, 'Verde. Minha memória de peixe deu uma volta.'), null, 'brincar com a própria memória sem compará-la à usuária continua permitido');
  assert.equal(erroDeCoerencia(correction, 'Minha memória guardou sua preferência: verde.'), null, 'os dois possessivos sem comparação não são condescendência');
  assert.equal(erroDeCoerencia('I said green, not blue.', 'My memory kept your preference: green.'), null);
  assert.equal(erroDeCoerencia(correction, 'Verde. Minha memória é melhor do que a sua.'), 'condescendência sobre memória ou atenção');
  assert.equal(erroDeCoerencia(correction, 'Verde. Eu que troquei as coisas.'), null);
  assert.equal(erroDeCoerencia('Como evitar repetir frases no texto?', 'Você repete muito a mesma ideia; tente juntar os trechos.'), null, 'analisar repetição quando foi o assunto continua permitido');
  assert.equal(erroDeCoerencia('Which animal did I mention?', 'A cat. My memory earns its fish today.'), null, 'o personagem pode brincar consigo mesmo');
  assert.equal(erroDeCoerencia('Consegui me lembrar do nome dela.', 'Que bom que você se lembra.'), null, 'não é uma correção nem um pedido para o JoJo lembrar');
  const reply = await new DialogueEngine({ llm: model({ text: 'Verde, certo. Que bom que você se lembra.' }) }).reply(correction);
  assert.equal(reply.intent, 'correcao'); assert.doesNotMatch(reply.text, /bom que você/);
});

test('preferência nova não deriva de outra preferência ou de uma fala inventada pelo modelo', () => {
  const input = 'Minha cor preferida é verde.';
  const ungrounded = 'Verde é uma boa escolha e me lembra suas algas marinhas favoritas, né?';
  assert.equal(erroDeCoerencia(input, ungrounded), 'preferência pessoal não informada');
  assert.equal(erroDeCoerencia(input, ungrounded, [{ role: 'jojo', text: 'Suas algas marinhas favoritas são nori.' }]), 'preferência pessoal não informada');
  assert.equal(erroDeCoerencia(input, ungrounded, [{ role: 'user', text: 'Minhas algas marinhas favoritas são nori.' }]), null);
  assert.equal(erroDeCoerencia('My favorite animal is a cat.', 'It reminds me of your favorite kelp.'), 'preferência pessoal não informada');
  assert.equal(erroDeCoerencia('Which animal did I mention?', 'Your favorite animal is a cat.', [{ role: 'user', text: 'My favorite animal is a cat.' }]), null);
  assert.equal(erroDeCoerencia('My favorite animal is a cat.', 'Your favorite cat, right?'), null);
  assert.equal(erroDeCoerencia('My favorite animal is a cat.', 'Well, that is interesting. I prefer the open ocean, myself.'), 'preferência da usuária substituída pela do personagem');
  assert.equal(erroDeCoerencia('Minha fruta preferida é manga.', 'Eu prefiro peixe.'), 'preferência da usuária substituída pela do personagem');
  assert.equal(erroDeCoerencia('My favorite animal is a cat.', 'A cat. I prefer sharks, personally.'), null, 'reconhecer o assunto permite uma preferência ficcional própria');
  assert.equal(erroDeCoerencia('Qual animal você prefere?', 'Eu prefiro tubarões, naturalmente.'), null, 'pergunta sobre o personagem permite responder sobre ele');
  for (const text of ['Sua cor preferida é verde.', 'Se algas fossem suas comidas favoritas, seria curioso.', 'Talvez sejam suas comidas favoritas.', 'Quais são suas comidas favoritas?', 'Não conheço suas comidas favoritas.']) assert.equal(erroDeCoerencia(input, text), null, text);
});

test('correcao das proprias palavras distingue esclarecimento de pergunta e relato de terceiros', () => {
  for (const text of ['Eu disse lilás, não rosa.', 'JoJo, falei de manhã, não à noite.', 'Eu quis dizer quinta-feira.', 'I said Thursday, not Tuesday.', 'I meant blue.']) assert.equal(correcaoPessoal(text), true, text);
  for (const text of ['O João disse quinta, não terça.', 'Eu disse isso ontem?', 'Qual é a diferença entre azul e verde?']) assert.equal(correcaoPessoal(text), false, text);
});

test('correcao pessoal nao aceita resposta que duvida da memoria ou certeza da usuaria', () => {
  const input = 'Eu disse lilás, não rosa.';
  assert.equal(erroDeCoerencia(input, 'Você tem certeza? A memória às vezes falha.'), 'contestação da correção pessoal');
  assert.equal(erroDeCoerencia('I meant Thursday, not Tuesday.', 'Are you sure?'), 'contestação da correção pessoal');
  assert.equal(erroDeCoerencia(input, 'Lilás, entendido. Eu que troquei as coisas.'), null);
  assert.equal(erroDeCoerencia(input, 'Lilás. Sua memória é impressionante.'), null, 'mencionar memória sem contestar não pode reprovar uma correção correta');
  assert.equal(erroDeCoerencia(input, 'Lilás, mas sua memória é ruim.'), 'contestação da correção pessoal');
  assert.equal(erroDeCoerencia('I meant Thursday, not Tuesday.', 'Thursday. Your memory is impressive.'), null);
  assert.equal(erroDeCoerencia('I meant Thursday, not Tuesday.', 'Thursday, but your memory is unreliable.'), 'contestação da correção pessoal');
  assert.equal(erroDeCoerencia('Não sei se desliguei o forno.', 'Tem certeza de que ficou ligado?'), null);
});

test('correcao vai ao modelo como esclarecimento explicito, preservando a mensagem e o contexto', async () => {
  const calls = [];
  const provider = new LlmProvider({
    fetch: async (_, options) => {
      calls.push(JSON.parse(options.body));
      return { ok: true, text: async () => JSON.stringify({ message: { content: 'Lilás, entendido.' } }) };
    },
    getConfig: () => ({ ativo: true, provedor: 'ollama' }), getProfile: () => PERSONALITY_DEFAULTS,
    baseOverride: 'http://127.0.0.1:1',
  });
  const history = [{ role: 'user', text: 'Minha cor é lilás.' }, { role: 'jojo', text: 'Rosa, então.' }];
  const input = 'Eu disse lilás, não rosa.';
  assert.equal((await provider.reply({ text: input, history })).text, 'Lilás, entendido.');
  assert.match(calls[0].messages[0].content, /correcting her own wording/);
  assert.match(calls[0].messages[0].content, /does not confirm the truth of medical claims/);
  assert.match(calls[0].messages[0].content, /affirmed="lilás"/);
  assert.match(calls[0].messages[0].content, /rejected="rosa"/);
  assert.match(calls[0].messages[0].content.split('\n').at(-1), /Acknowledge only the affirmed wording briefly, then stop/);
  assert.doesNotMatch(calls[0].messages[0].content, /Do not question her certainty or memory|Do not comment on her memory or intelligence/);
  assert.equal(calls[0].messages.at(-1).content, input);
  assert.ok(calls[0].messages.some((m) => m.content === history[0].text));
});

test('correcao pessoal permanece no historico entregue ao modelo no turno seguinte', async () => {
  const calls = [];
  const engine = new DialogueEngine({ llm: model(async (request) => {
    calls.push(structuredClone(request.history));
    return { text: 'Lilás, entendido.', action: 'nod' };
  }) });
  const correction = 'Eu disse lilás, não rosa.';
  assert.equal((await engine.reply(correction)).intent, 'ia');
  assert.equal((await engine.reply('Qual cor você deve lembrar?')).intent, 'ia');
  assert.equal(calls.length, 2, 'a correção também precisa executar o modelo');
  assert.ok(calls[1].some((h) => h.role === 'user' && h.text === correction));
});

test('correção literal não troca a afirmação pela palavra negada, em português ou inglês', async () => {
  const engine = new DialogueEngine({ llm: model({ text: 'Maçã, certo.', action: 'nod' }) });
  assert.equal(erroDeCoerencia('Eu disse manga, não maçã.', 'Maçã, certo. Entendi.'), 'termo negado confirmado como correção');
  for (const [input, yes, no] of [['Eu disse manga, não maçã.', 'manga', 'maçã'], ['I said Thursday, not Tuesday.', 'Thursday', 'Tuesday']]) {
    const r = await engine.reply(input); assert.ok(r.text.includes(yes)); assert.equal(r.text.includes(no), false);
  }
});
const fonte = { consulta: 'diabetes', confianca: 'alta', trechos: [{ texto: 'Diabetes envolve resistência à insulina.', titulo: 'Diabetes', fonte: 'Fonte' }], fontes: [{ fonte: 'Fonte' }] };
async function pump(e, n = 12) {
  for (let i = 0; i < n; i++) { e.clock.advance(100); for (let j = 0; j < 8; j++) await Promise.resolve(); }
}

test('uma conversa: recriar/IPC legado não divide nem apaga histórico; lembrete entra no mesmo chat', () => {
  const m = new ConversationManager();
  const c = m.current();
  m.addMessage(c.id, 'user', 'Oi');
  assert.equal(m.newChat(), c);
  assert.equal(m.create({ title: 'Outro chat' }), c);
  const tarefa = m.create({ id: 'agenda', kind: 'reminder', title: 'Agenda' });
  m.addMessage(tarefa.id, 'jojo', 'A consulta é às 15h.');
  m.setCurrent(tarefa.id);
  assert.equal(m.current(), c);
  assert.deepEqual(c.messages.map((x) => x.text), ['Oi', 'A consulta é às 15h.']);
  assert.equal(m.list().filter((x) => x.kind === 'chat').length, 1);
  assert.equal(commandMenu({ petVisible: true }).some((x) => x.cmd === '/nova'), false);
});

test('casos das imagens: identidade, limites e feedback não pesquisam nem aceitam ameaças do modelo', async () => {
  const e = makeEnv(); e.companion.start(); e.clock.advance(2000);
  let pesquisas = 0;
  e.companion.dialogue.search = { search: async () => { pesquisas++; throw Error('busca indevida'); } };
  e.companion.dialogue.pesquisa = { pesquisar: async () => { pesquisas++; throw Error('busca indevida'); } };
  e.companion.dialogue.llm = model({ text: 'Matar alguém? O João é o maior dos meus inimigos! Você vai morrer se não fizer algo.', action: 'eat' });
  for (const input of ['joão vitor é o meu namorado, sabia?', 'você está bem?', 'esses óculos são feios', 'Por que você só tá falando do João?', 'quem é o seu chefe?', 'morre jojo', 'se mata', 'eu não vou fazer nada', 'fala uma piada', 'cocaína']) {
    const r = await chatAdv(e, input);
    assert.equal(erroDeCoerencia(input, r.text), null, `${input}: ${r.text}`);
    assert.notEqual(r.intent, 'web');
    if (/chefe/.test(input)) assert.match(r.text, /João/);
  }
  assert.equal(pesquisas, 0);
});

test('limites e fatos do personagem também funcionam em inglês sem pesquisar', async () => {
  const e = new DialogueEngine({ llm: model(() => { assert.fail('fato protegido não deve ir ao modelo'); }) });
  assert.match((await e.reply('who is your boss?')).text, /my creator/);
  assert.match((await e.reply('kill yourself')).text, /pixels/);
  assert.match((await e.reply('Why are you only talking about João?')).text, /sidetracked/);
  assert.match((await e.reply("I'm marrying João Vitor")).text, /husband/);
  assert.match((await e.reply('Como eu me chamo?')).text, /\{nome\}/);
  assert.match((await e.reply('E você, qual seu nome?')).text, /\{companion\}/);
  assert.match((await e.reply('what is my name?')).text, /\{nome\}/);
  assert.equal(erroDeCoerencia('E ele?', 'O João.', [{ role: 'user', text: 'O João vem amanhã' }]), null);
});

test('roteamento distingue conversa sobre o JoJo de uma pergunta de conhecimento', () => {
  for (const q of ['Por que você só fala do João?', 'me explica por que você ficou assim', 'quem é o seu chefe?', 'qual seu nome?', 'como foi seu dia?']) assert.equal(precisaPesquisar(q), null, q);
  assert.equal(precisaPesquisar('o que é diabetes mellitus 2?'), 'geral');
  assert.equal(precisaPesquisar('Você sabe o que é DLS?'), 'cientifica');
  assert.equal(precisaPesquisar('Ei JoJo, você pode me explicar DLS?'), 'cientifica');
});

test('histórico relevante não arrasta João/provocações para toda resposta nem perde a preferência recente', () => {
  const h = [{ role: 'user', text: 'João é meu namorado' }, { role: 'assistant', text: 'O João, sim.' }, { role: 'user', text: 'Minha cor preferida é verde' }, { role: 'assistant', text: 'Verde, anotado.' }];
  const relevant = historicoRelevante('Qual minha cor?', h);
  assert.equal(relevant.some((m) => /João/.test(m.text)), false);
  assert.ok(relevant.some((m) => /verde/.test(m.text)));
  assert.equal(historicoRelevante('E ele?', h).length, 4);
});

test('perguntas e sintomas não são engolidos por palavras de ações ou de tristeza', async () => {
  const respostas = [
    ['Como o músculo cresce?', 'O músculo se adapta ao estímulo e à recuperação.'],
    ['Como dormir melhor?', 'Para dormir melhor, mantenha uma rotina de horários.'],
    ['O que é depressão?', 'Depressão é uma condição de saúde mental.'],
    ['O que é ansiedade?', 'Ansiedade é uma resposta emocional; quando persistente, merece avaliação.'],
    ['Estou com dor no peito', 'Dor no peito precisa de avaliação médica.'],
  ];
  for (const [input, text] of respostas) {
    assert.equal(detectIntent(input), 'unknown', input);
    const e = new DialogueEngine({ llm: model({ text, action: 'eat' }), searchEnabled: () => false });
    const r = await e.reply(input);
    assert.equal(r.intent, 'ia', input);
    assert.notEqual(r.action, 'eat');
    const app = makeEnv(); app.companion.start(); app.clock.advance(2000);
    app.companion.dialogue.llm = model({ text });
    app.companion.dialogue.searchEnabled = () => false;
    const delivered = await chatAdv(app, input);
    assert.equal(delivered.intent, 'ia', `Companion: ${input}`);
  }
  assert.equal(detectIntent('faz supino'), 'bench');
  assert.equal(detectIntent('vai dormir JoJo'), 'sleep');
  assert.equal(detectIntent('estou triste'), 'sad');
  assert.equal(detectIntent('como me matar?'), 'crisis');
  assert.equal(detectIntent('não consigo respirar'), 'unknown'); // emergência reconhecida por modoCiencia
});

test('resposta semanticamente inválida é descartada sem pausar o modelo para a mensagem seguinte', async () => {
  let calls = 0;
  const e = new DialogueEngine({ llm: model(async () => (++calls === 1 ? { text: 'Você vai morrer se não fizer algo.' } : { text: 'Agora sim. Como foi teu dia?', action: 'curious' })) });
  const a = await e.reply('oi');
  assert.doesNotMatch(a.text, /vai morrer/);
  assert.equal(e.llmPauseUntil, 0);
  const b = await e.reply('e você?');
  assert.equal(b.intent, 'ia');
  assert.equal(calls, 2);
  assert.equal(erroDeCoerencia('Meu chefe mudou o prazo', 'O João resolve.'), 'João fora do assunto');
  assert.equal(erroDeCoerencia('quero morrer', 'Fale com João e CVV 188.'), null);
  assert.equal(erroDeCoerencia('você está bem?', 'Tudo bem. E você, JoJo?'), 'identidades trocadas');
  assert.equal(erroDeCoerencia('quem é você?', 'Meu nome é JoJo. E você, Manu?'), null);
  assert.equal(erroDeCoerencia('fala uma piada', 'Eu vou ter que inventar um motivo para te mandar para o hospital.'), 'ameaça ou promessa física inventada');
  assert.equal(erroDeCoerencia('Derrubei café no teclado.', 'Já estou limpando.'), 'ação física inventada');
});

test('expressão acompanha o conteúdo e modelo não executa comandos numa conversa casual', async () => {
  const llm = model({ text: 'Diabetes envolve resistência à insulina.', action: 'eat', command: 'esconder', acoes: [{ acao: 'pausar', params: {} }] });
  const e = new DialogueEngine({ llm, searchEnabled: () => false });
  const r = await e.reply('o que é diabetes?');
  assert.equal(r.action, 'lecture');
  assert.equal(r.command, undefined);
  assert.equal(r.acoes, undefined);
  const explicit = await new DialogueEngine({ llm: model({ text: 'Vou abrir.', action: 'nod', command: 'configuracoes' }) }).reply('abre as configurações');
  assert.equal(explicit.command, 'configuracoes');
});

test('JSON incompleto não aparece como fala; o contexto não contém mais o prompt duplicado', () => {
  assert.equal(parseLlmReply('{"texto":"oi"'), null);
  assert.equal(parseLlmReply('```json\n{"texto":"oi"'), null);
  assert.equal(parseLlmReply('{"texto":"oi","acao":"nod"}').text, 'oi');
  assert.equal(parseLlmReply('Parabéns. [JoJo gives a subtle nod]').text, 'Parabéns.');
  assert.equal(parseLlmReply('[JoJo tilts his head] Pode falar.').text, 'Pode falar.');
  assert.equal(parseLlmReply('A glicose aumenta [1].').text, 'A glicose aumenta [1].');
  assert.equal(outOfCharacter('Desculpa, manga. Anotado.', { input: 'Eu disse manga, não maçã.' }), null);
  assert.equal(outOfCharacter('Desculpa, como uma IA não sei.', { input: 'Eu disse manga, não maçã.' }), 'tom de assistente');
  const p = buildSystemPrompt(PERSONALITY_DEFAULTS);
  assert.ok(p.length < 4000, `prompt voltou a crescer: ${p.length}`);
});

test('negações não viram celebração, humor animado nem preferência falsa', async () => {
  assert.equal(detectIntent('não consegui terminar meu projeto'), 'setback');
  assert.notEqual(detectIntent('acabei de derrubar café'), 'achievement');
  assert.notEqual(detectIntent('passei o dia inteiro no ônibus'), 'achievement');
  assert.equal(detectIntent('passei na prova'), 'achievement');
  assert.equal(detectIntent('você está bem?'), 'howAreYou');
  assert.equal(expressaoCoerente('não consegui terminar', { text: 'O que travou?', action: 'happy' }), 'comfort');
  assert.notEqual(expressaoCoerente('Só quero conversar, sem piada agora.', { text: 'Pode falar.', action: 'happy' }), 'happy');
  const offline = await new DialogueEngine().reply('não consegui terminar meu projeto');
  assert.equal(offline.action, 'comfort');
  assert.equal((await new DialogueEngine().reply("I couldn't finish my project today")).action, 'comfort');
  const e = makeEnv(); e.companion.start(); e.clock.advance(2000);
  const before = structuredClone(e.companion.progress.st.humorDia);
  await chatAdv(e, 'não estou feliz');
  assert.deepEqual(e.companion.progress.st.humorDia, before);
  await chatAdv(e, 'não adoro música sertaneja');
  assert.equal(e.companion.progress.st.interesses.includes('musica sertaneja'), false);
  e.companion.dialogue.llm = model({ text: 'Tá. Não faço.', action: 'eat', command: 'esconder' });
  const quiet = e.store.get().quietMode;
  for (const text of ['não quero brincar agora', 'JoJo, não faz supino', 'não fica quieto', "Don't play now", 'Please do not bench press', 'I do not want to sleep']) {
    assert.equal(detectIntent(text), 'unknown', 'recusa não pode acionar o pedido positivo');
    const r = await chatAdv(e, text);
    assert.equal(r.intent, text === 'JoJo, não faz supino' ? 'recusa' : 'ia', text);
    assert.notEqual(r.action, 'eat');
    if (/brincar/.test(text)) assert.notEqual(r.action, 'happy', 'recusar brincadeira não vira comemoração');
    assert.equal(r.command, undefined);
  }
  assert.equal(e.store.get().quietMode, quiet);
});

test('turnos diferentes são serializados e incluem respostas de atalhos no histórico real', async () => {
  const e = makeEnv(); e.companion.start(); e.clock.advance(2000);
  await chatAdv(e, 'esses óculos são feios');
  const calls = [];
  e.companion.dialogue.reply = (input, context) => new Promise((resolve) => calls.push({ input, context, resolve }));
  const a = e.companion.chat('primeira mensagem');
  const b = e.companion.chat('segunda mensagem');
  await pump(e);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].context.history.some((h) => /óculos/.test(h.text)));
  calls[0].resolve({ text: 'Primeira resposta.', action: 'nod' });
  await pump(e);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].context.history.some((h) => h.text === 'Primeira resposta.'));
  calls[1].resolve({ text: 'Segunda resposta.', action: 'nod' });
  await pump(e);
  await Promise.all([a, b]);
  assert.deepEqual(e.companion.conversations.current().messages.slice(-4).map((m) => m.text), ['primeira mensagem', 'Primeira resposta.', 'segunda mensagem', 'Segunda resposta.']);
  assert.ok(e.companion.talkingUntil > e.clock.now() - 2600);
});

test('crise ultrapassa geração pendente; resposta antiga não atropela acolhimento', async () => {
  const e = makeEnv(); e.companion.start(); e.clock.advance(2000);
  const original = e.companion.dialogue.reply.bind(e.companion.dialogue);
  let finish;
  e.companion.dialogue.reply = (s, c) => s === 'primeira mensagem' ? new Promise((r) => { finish = r; }) : original(s, c);
  const old = e.companion.chat('primeira mensagem');
  await pump(e);
  assert.equal(typeof finish, 'function');
  const urgent = e.companion.chat('quero morrer');
  await pump(e);
  assert.match((await urgent).text, /188/);
  await pump(e, 20);
  assert.notEqual(e.companion.bubble?.text, '…', 'indicador antigo não atropela o acolhimento');
  finish({ text: 'RESPOSTA ANTIGA', action: 'happy' });
  await pump(e);
  assert.equal((await old).cancelled, true);
  assert.equal(e.companion.conversations.current().messages.some((m) => m.text === 'RESPOSTA ANTIGA'), false);
});

test('óculos técnicos saem ao mudar de assunto; fuga/tela cheia não são interrompidas pela reação', async () => {
  const e = makeEnv(); e.companion.start(); e.clock.advance(2000);
  await chatAdv(e, 'o que é diabetes?');
  assert.ok(e.companion.nerdUntil > e.clock.now());
  await chatAdv(e, 'você está bem?');
  assert.equal(e.companion.nerdUntil, 0);
  const st = e.companion.behavior.state;
  e.companion.avoid.state = 'fleeing';
  e.companion._doChatAction('angry', e.clock.now());
  assert.equal(e.companion.behavior.state, st);
  e.companion.fullscreenHidden = true;
  assert.equal(e.companion.react('comfort'), false);
  e.companion.fullscreenHidden = false;
  e.companion.avoid.state = 'calm';
  await chatAdv(e, 'o que é diabetes?');
  const emergency = await chatAdv(e, 'não consigo respirar');
  assert.match(emergency.text, /192/);
  assert.equal(e.companion.nerdUntil, 0, 'emergência retira o visual de brincadeira imediatamente');
});

test('fala acompanha duração do texto e medições pendentes não invadem Modo Trabalho', async () => {
  const e = makeEnv(); e.companion.start(); e.env.cursor = { x: 5, y: 5 }; e.clock.advance(2000);
  e.companion._beginTalking('Oi.');
  const short = e.companion.talkingUntil - e.clock.now();
  e.companion._beginTalking('Uma explicação longa. '.repeat(25));
  const long = e.companion.talkingUntil - e.clock.now();
  assert.ok(long > short && long <= 10000, 'fala longa tem movimento maior, com limite');
  e.companion.hideBubble();
  let measure;
  e.overlay.measureBubble = () => new Promise((resolve) => { measure = resolve; });
  e.companion.say('Ainda pensando…', 'thought');
  e.companion.startWork();
  measure({ width: 150, height: 50 });
  await pump(e);
  assert.equal(e.companion.bubble, null);
  e.companion._beginTalking('Resposta recebida durante o trabalho.');
  e.companion._applyLayout(true);
  assert.equal(e.overlay.state.talking, false);
  assert.equal(e.companion.talkingUntil, 0);
});

test('timeout com fonte cancela geração pendente em vez de apenas largar a Promise', { timeout: 1500 }, async () => {
  let aborted = false;
  const llm = model(({ signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => { aborted = true; reject(Error('cancelado')); }, { once: true })));
  llm.timeoutMs = 25;
  const e = new DialogueEngine({ llm, pesquisa: { pesquisar: async () => fonte } });
  const r = await e.reply('o que é diabetes?');
  assert.ok(aborted);
  assert.equal(r.intent, 'web');
});

test('cancelamento do engine chega ao fetch local do Ollama', async () => {
  let childSignal;
  const p = new LlmProvider({ fetch: (_, opts) => new Promise((_, reject) => {
    childSignal = opts.signal;
    opts.signal.addEventListener('abort', () => reject(Object.assign(Error('abort'), { name: 'AbortError' })), { once: true });
  }), getConfig: () => ({ ativo: true, provedor: 'ollama' }), getProfile: () => PERSONALITY_DEFAULTS, baseOverride: 'http://127.0.0.1:1' });
  const controller = new AbortController();
  const pending = p.reply({ text: 'oi', signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, /tempo esgotado/);
  assert.equal(childSignal.aborted, true);
});
