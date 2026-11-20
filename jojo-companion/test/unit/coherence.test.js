import test from 'node:test';
import assert from 'node:assert/strict';

import { DialogueEngine } from '../../src/core/dialogue/engine.js';
import { LlmProvider, parseLlmReply, buildSystemPrompt, outOfCharacter } from '../../src/core/dialogue/llm-provider.js';
import { erroDeCoerencia, historicoRelevante, expressaoCoerente, correcaoPessoal, semDesdem, semBronca, semConselhoPessoal, polirTexto, relatoSemAssunto } from '../../src/core/dialogue/coherence.js';
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
  // A frase do insulto sai e a resposta certa fica: sem gerar de novo (cada geração custa segundos no PC dela).
  let calls = 0;
  const limpa = new DialogueEngine({ llm: model(async () => ({ text: (++calls, 'Tenho pernas. Que pergunta idiota!') })) });
  const r1 = await limpa.reply(input);
  assert.equal(r1.intent, 'ia'); assert.equal(r1.text, 'Tenho pernas.'); assert.equal(calls, 1);
  // Só o insulto, nada para salvar: gera de novo e, se as três falharem, cai na programada.
  calls = 0;
  const engine = new DialogueEngine({ llm: model(async () => ({ text: ++calls <= 3 ? 'Que pergunta idiota!' : 'Tenho pernas, mãos e bíceps. Cauda, nenhuma.' })) });
  const rejected = await engine.reply(input);
  assert.notEqual(rejected.intent, 'ia'); assert.doesNotMatch(rejected.text, /idiota/);
  assert.equal(engine.llmPauseUntil, 0);
  const accepted = await engine.reply(input);
  assert.equal(accepted.intent, 'ia'); assert.equal(calls, 4);
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
  const correction = 'Eu disse Aurora, não Alvorada.';
  const confirmed = 'Sua banda preferida é Aurora.';
  assert.equal(erroDeCoerencia(correction, confirmed), 'preferência pessoal não informada', 'a correção sozinha não informa a categoria banda');
  assert.equal(erroDeCoerencia(correction, confirmed, [{ role: 'user', text: 'Minha banda preferida é Aurora.' }]), null, 'o histórico real da usuária fundamenta a categoria durante a correção');
  assert.equal(erroDeCoerencia(correction, confirmed, [{ role: 'jojo', text: confirmed }]), 'preferência pessoal não informada', 'a resposta do assistente não pode fundamentar a própria preferência');
  assert.equal(erroDeCoerencia('My favorite animal is a cat.', 'Your favorite cat, right?'), null);
  assert.equal(erroDeCoerencia('My favorite animal is a cat.', 'Well, that is interesting. I prefer the open ocean, myself.'), 'preferência da usuária substituída pela do personagem');
  assert.equal(erroDeCoerencia('Minha fruta preferida é manga.', 'Eu prefiro peixe.'), 'preferência da usuária substituída pela do personagem');
  assert.equal(erroDeCoerencia('My favorite animal is a cat.', 'A cat. I prefer sharks, personally.'), null, 'reconhecer o assunto permite uma preferência ficcional própria');
  assert.equal(erroDeCoerencia('Qual animal você prefere?', 'Eu prefiro tubarões, naturalmente.'), null, 'pergunta sobre o personagem permite responder sobre ele');
  for (const text of ['Sua cor preferida é verde.', 'Se algas fossem suas comidas favoritas, seria curioso.', 'Talvez sejam suas comidas favoritas.', 'Quais são suas comidas favoritas?', 'Não conheço suas comidas favoritas.']) assert.equal(erroDeCoerencia(input, text), null, text);
});

test('conversa casual não inventa chuva observada; relato, hipótese e ferramenta de clima permanecem possíveis', async () => {
  const input = 'você está bem?';
  const invented = 'Sim, estou ótimo, Manu. A chuva lá fora não me incomoda nem um pouco.';
  assert.equal(erroDeCoerencia(input, invented), 'observação de clima não informada');
  assert.equal(erroDeCoerencia('How are you?', 'Fine. The rain outside does not bother me.'), 'observação de clima não informada');
  assert.equal(erroDeCoerencia(input, invented, [{ role: 'jojo', text: 'Está chovendo lá fora.' }]), 'observação de clima não informada', 'um fato inventado anteriormente pelo modelo não é uma fonte');
  assert.equal(erroDeCoerencia(input, invented, [{ role: 'user', text: 'Está chovendo lá fora.' }]), null);
  assert.equal(erroDeCoerencia('Está chovendo lá fora e eu estou em casa.', 'A chuva lá fora pede um descanso.'), null);
  assert.equal(erroDeCoerencia(input, 'Está chovendo lá fora?'), null);
  assert.equal(erroDeCoerencia(input, 'Se a chuva lá fora continuar nessa história, o tubarão vai precisar de guarda-chuva.'), null);
  assert.equal(erroDeCoerencia('Conte uma história com chuva e um tubarão.', 'A chuva lá fora molhava o tubarão da história.'), null);
  assert.equal(erroDeCoerencia('Vai chover hoje em Guarapuava?', 'A chuva lá fora está leve.'), null, 'solicitação meteorológica usa a ferramenta própria antes do modelo');
  const engine = new DialogueEngine({ llm: model({ text: invented }) });
  assert.notEqual((await engine.reply(input)).intent, 'ia');
});

test('saudação não cria observações de sol ou temperatura sem relato da usuária', async () => {
  const input = 'você está bem?';
  const actual = 'Estou bem, o sol está forte hoje.';
  for (const text of [actual, 'Tudo certo. Hoje faz frio.', 'It is very hot outside.', 'The sun is shining today.']) {
    assert.equal(erroDeCoerencia(input, text), 'observação de clima não informada', text);
    assert.equal(erroDeCoerencia(input, text, [{ role: 'jojo', text }]), 'observação de clima não informada');
    assert.equal(erroDeCoerencia(input, text, [{ role: 'user', text }]), null);
  }
  assert.equal(erroDeCoerencia(input, actual, [{ role: 'user', text: 'Está chovendo lá fora.' }]), 'observação de clima não informada');
  for (const text of ['O Sol é uma estrela quente.', 'Estou quente de raiva nessa história.', 'Se o sol está forte hoje, nessa história eu uso óculos.', 'O sol está forte hoje?', 'Talvez hoje faça frio.', 'O café está quente hoje.', 'The water here is cold.']) assert.equal(erroDeCoerencia(input, text), null, text);
  assert.equal(erroDeCoerencia('Conte uma história com sol.', actual), null);
  assert.equal(erroDeCoerencia('Como proteger minha pele?', 'Quando o sol está forte, procure sombra.'), null, 'orientação geral não afirma uma observação meteorológica');
  const reply = await new DialogueEngine({ llm: model({ text: actual }) }).reply(input);
  assert.notEqual(reply.intent, 'ia');
});

test('preferência implícita exige o assunto afirmado pela usuária, sem derivar de cor ou da fala do modelo', async () => {
  const input = 'você está bem?';
  const invented = 'Estou ótimo, Manu. A água aqui está bem fria, como você gosta.';
  const english = 'I am fine. The water here is cold, just as you like it.';
  for (const text of [invented, english, 'A água está fria, como você prefere.']) {
    assert.equal(erroDeCoerencia(input, text), 'preferência pessoal não informada');
    assert.equal(erroDeCoerencia(input, text, [{ role: 'user', text: 'Minha cor preferida é verde.' }]), 'preferência pessoal não informada');
    assert.equal(erroDeCoerencia(input, text, [{ role: 'jojo', text: 'Você gosta de água fria.' }]), 'preferência pessoal não informada');
  }
  assert.equal(erroDeCoerencia(input, invented, [{ role: 'user', text: 'Eu gosto de água fria.' }]), null);
  assert.equal(erroDeCoerencia('Prefiro água fria.', invented), null);
  assert.equal(erroDeCoerencia('How are you?', english, [{ role: 'user', text: 'I like cold water.' }]), null);
  for (const fact of ['Não gosto de água fria.', 'Eu gosto de café, não de água fria.', 'Gosto de água fria?', 'O João gosta de água fria.']) {
    assert.equal(erroDeCoerencia(input, invented, [{ role: 'user', text: fact }]), 'preferência pessoal não informada', fact);
  }
  const reply = await new DialogueEngine({ llm: model({ text: invented }) }).reply(input);
  assert.notEqual(reply.intent, 'ia');
  assert.equal(reply.text.includes('como você gosta'), false);
});

test('guarda de preferência implícita preserva perguntas, hipóteses e humor sobre o próprio personagem', () => {
  for (const text of [
    'A água está fria, como você gosta?',
    'Se a água estivesse fria, como você gosta, eu ainda seria um tubarão de desenho.',
    'Talvez esteja fria, como você gosta.',
    'Você gosta de água fria?',
    'Estou ótimo. Meu bíceps imaginário não falta ao trabalho.',
    'Eu gosto de água fria. Preferências de tubarão de desenho.',
  ]) assert.equal(erroDeCoerencia('você está bem?', text), null, text);
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

test('assunto novo não recebe preferências ou aulas sem relação; referência e assunto compartilhado preservam contexto', () => {
  const history = [
    { role: 'user', text: 'Minha cor preferida é verde.' }, { role: 'jojo', text: 'Verde, entendido.' },
    { role: 'user', text: 'Como funciona a insulina?' }, { role: 'jojo', text: 'A insulina ajuda a glicose [1].' },
    { role: 'user', text: 'Minha planta é uma samambaia.' }, { role: 'jojo', text: 'A samambaia está crescendo.' },
  ];
  const original = structuredClone(history);
  assert.deepEqual(historicoRelevante('Derrubei café no teclado.', history), []);
  assert.deepEqual(historicoRelevante('A janela da cozinha quebrou.', history), []);
  assert.deepEqual(historicoRelevante('JoJo, minha planta ficou amarela.', [{ role: 'user', text: 'Quem é você?' }, { role: 'jojo', text: 'JoJo, o tubarão de bíceps.' }]), [], 'vocativo não liga assuntos independentes');
  const plant = historicoRelevante('Minha planta ficou amarela.', history);
  assert.equal(plant.length, 2);
  assert.match(plant[0].text, /samambaia/);
  assert.equal(plant.some(h => /insulina|verde|\[1\]/.test(h.text)), false);
  assert.ok(historicoRelevante('Ela precisa de água?', history).some(h => /samambaia/.test(h.text)));
  assert.ok(historicoRelevante('Consegui!', history).some(h => /samambaia/.test(h.text)));
  assert.deepEqual(history, original, 'a seleção não apaga nenhuma mensagem visível');
});

test('detalhe apenas na fala do JoJo não liga uma afirmação independente ao turno anterior', () => {
  const cases = [
    ['fala uma piada', 'Adoro quando você fala sobre café.', 'Derrubei café no teclado agora.', 'Você falou sobre café; o que quis dizer?'],
    ['Conte algo engraçado.', 'Seu hamster Pingo ganhou um troféu imaginário.', 'Meu hamster foi ao veterinário hoje.', 'Que troféu você mencionou?'],
    ['Tell me a story.', 'Your violin is in a castle.', 'My violin needs new strings.', 'What castle did you mention?'],
  ];
  for (const [user, assistant, independent, reference] of cases) {
    const history = [{ role: 'user', text: user }, { role: 'jojo', text: assistant }];
    assert.deepEqual(historicoRelevante(independent, history), [], independent);
    assert.deepEqual(historicoRelevante(reference, history), history, 'referência explícita pode consultar o que o JoJo disse');
    assert.deepEqual(historicoRelevante('me dá um exemplo', history), history, 'seguimento direto continua com o contexto anterior');
  }
});

test('correção herda o assunto informado pela usuária sem propagar detalhes inventados pelo JoJo', () => {
  const history = [
    { role: 'user', text: 'Meu hobby é tricô.' }, { role: 'jojo', text: 'Seu hamster Pingo acompanha o tricô.' },
    { role: 'user', text: 'Eu disse bordado, não tricô.' }, { role: 'jojo', text: 'Bordado, entendido.' },
  ];
  const original = structuredClone(history);
  assert.deepEqual(historicoRelevante('Meu hamster foi ao veterinário hoje.', history), []);
  assert.deepEqual(historicoRelevante('Qual é meu hobby?', history), history, 'a correção literal continua ligada à sua categoria');
  assert.deepEqual(history, original);
});

test('payload nativo separa assunto novo de referência explícita à fala do personagem', async () => {
  const requests = [];
  const provider = new LlmProvider({
    fetch: async (_, options) => {
      requests.push(JSON.parse(options.body));
      return { ok: true, text: async () => JSON.stringify({ message: { content: 'Entendido.' } }) };
    },
    getConfig: () => ({ ativo: true, provedor: 'ollama' }), getProfile: () => PERSONALITY_DEFAULTS, baseOverride: 'http://127.0.0.1:1',
  });
  const history = [{ role: 'user', text: 'Conte algo engraçado.' }, { role: 'jojo', text: 'Seu hamster Pingo ganhou um troféu imaginário.' }];
  const original = structuredClone(history);
  const independent = 'Meu hamster foi ao veterinário hoje.';
  await provider.reply({ text: independent, history });
  assert.deepEqual(requests[0].messages.slice(1), [{ role: 'user', content: independent }]);
  assert.doesNotMatch(requests[0].messages[0].content, /Pingo|troféu/);
  const reference = 'Que troféu você mencionou?';
  await provider.reply({ text: reference, history });
  assert.deepEqual(requests[1].messages.slice(1), [
    { role: 'user', content: history[0].text }, { role: 'assistant', content: history[1].text }, { role: 'user', content: reference },
  ]);
  assert.deepEqual(history, original, 'selecionar contexto não reescreve a conversa visível');
});

test('correção que muda uma preferência mantém a ligação com sua categoria em perguntas posteriores', () => {
  const history = [
    { role: 'user', text: 'Minha fruta preferida é maçã.' }, { role: 'jojo', text: 'Maçã, entendido.' },
    { role: 'user', text: 'Eu disse manga, não maçã.' }, { role: 'jojo', text: 'Manga, corrigido.' },
    { role: 'user', text: 'A janela da cozinha quebrou.' }, { role: 'jojo', text: 'A janela precisa de reparo.' },
  ];
  const selected = historicoRelevante('Qual é minha fruta preferida?', history);
  assert.ok(selected.some(h => h.role === 'user' && h.text === 'Eu disse manga, não maçã.'));
  assert.equal(selected.filter(h => h.role === 'user').at(-1).text, 'Eu disse manga, não maçã.');
  assert.equal(selected.some(h => /janela/.test(h.text)), false);
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
    // Regra de saúde: dor no peito é sinal de emergência (SAMU 192 e o João, médico), não conversa com o modelo.
    if (/dor no peito/i.test(input)) {
      assert.equal(delivered.intent, 'emergencia', `Companion: ${input}`);
      assert.match(delivered.text, /192/);
      assert.match(delivered.text, /João/);
      continue;
    }
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
  const e = new DialogueEngine({ llm: model(async () => (++calls <= 3 ? { text: 'Você vai morrer se não fizer algo.' } : { text: 'Agora sim. Como foi teu dia?', action: 'curious' })) });
  const a = await e.reply('oi');
  assert.doesNotMatch(a.text, /vai morrer/);
  assert.equal(e.llmPauseUntil, 0);
  const b = await e.reply('e você?');
  assert.equal(b.intent, 'ia');
  assert.equal(calls, 4);
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
  // +~700 caracteres da identidade fixa (identidade.js), que abre toda conversa.
  assert.ok(p.length < 4800, `prompt voltou a crescer: ${p.length}`);
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

test('desdém: sai só a frase de desdém e a resposta certa fica (pedido de 18/11/2026)', async () => {
  const { semDesdem } = await import('../../src/core/dialogue/coherence.js');
  assert.equal(semDesdem('You mentioned a cat, Emanuele. It’s a simple question.'), 'You mentioned a cat, Emanuele.');
  assert.equal(semDesdem('Você disse que sua cor preferida é verde, Emanuele. Não precisa perguntar de novo.'), 'Você disse que sua cor preferida é verde, Emanuele.');
  assert.equal(erroDeCoerencia('Which animal did I just mention?', semDesdem('You mentioned a cat, Emanuele. It’s a simple question.')), null);
  // Só desdém: nada sobra, continua barrado.
  assert.equal(semDesdem('It’s a simple question.'), 'It’s a simple question.');
  assert.equal(erroDeCoerencia('Which animal did I just mention?', 'It’s a simple question.'), 'insulto à usuária ou à pergunta');
  assert.equal(semDesdem('Verde, Manu.'), 'Verde, Manu.');
});

test('desdém no motor: a resposta do modelo chega sem a frase e continua sendo do modelo', async () => {
  const engine = new DialogueEngine({ llm: model({ text: 'You mentioned a cat, Emanuele. It’s a simple question.' }) });
  await engine.reply('My favorite animal is a cat.');
  const r = await engine.reply('Which animal did I just mention?');
  assert.equal(r.intent, 'ia');
  assert.match(r.text, /cat/);
  assert.doesNotMatch(r.text, /simple question/);
});

test('acabamento real do run 225: desdém com advérbio sai, [1] sem fonte sai, português do Brasil, sem "meu bem"', () => {
  assert.equal(semDesdem("You mentioned a cat, Emanuele. It’s a remarkably simple question, honestly."), 'You mentioned a cat, Emanuele.');
  assert.equal(semDesdem("You mentioned a cat, Emanuele. It's a remarkably simple question, honestly."), 'You mentioned a cat, Emanuele.');
  assert.equal(semDesdem('Verde, Manu. É uma pergunta muito simples.'), 'Verde, Manu.');
  assert.equal(polirTexto('Eleva a glicose no sangue [1]. Isso.'), 'Eleva a glicose no sangue. Isso.');
  assert.equal(polirTexto('Eleva a glicose [1] e [3].', { fontes: 2 }), 'Eleva a glicose [1] e.');
  assert.equal(polirTexto('O corpo não usa a hormona direito. A hormona some.'), 'O corpo não usa o hormônio direito. O hormônio some.');
  assert.equal(polirTexto('Confirmado, manga. Você tem um bom gosto, meu bem.'), 'Confirmado, manga. Você tem um bom gosto.');
  assert.equal(polirTexto('Que droga, Manu? Isso é irritante.'), 'Que droga, Manu! Isso é irritante.');
  assert.equal(polirTexto('Por que o peixe? Porque sim.'), 'Por que o peixe? Porque sim.');
});

test('acabamento real do run 226: sem "não precisa repetir", sem alarme na explicação, sem desprezar o que ela faz', () => {
  assert.equal(semDesdem('Você disse que sua cor preferida é verde, Emanuele. Não precisa repetir, eu lembro de tudo.'), 'Você disse que sua cor preferida é verde, Emanuele.');
  assert.equal(semDesdem('Manga, Manu. Não me faça repetir, você sabe que eu lembro de tudo.'), 'Manga, Manu.');
  assert.equal(semDesdem('Sua fruta favorita é manga, Emanuele. Não se preocupe em responder de outra forma.'), 'Sua fruta favorita é manga, Emanuele.');
  assert.equal(polirTexto('Isso leva ao aumento da glicose no sangue, precisa de atenção imediata.'), 'Isso leva ao aumento da glicose no sangue.');
  assert.equal(erroDeCoerencia('Não consegui terminar meu projeto.', 'Que droga, Manu! Projetos são para gente fraca, não para um tubarão como eu. Mostra o que te aflige.'), 'insulto à usuária ou à pergunta');
  assert.equal(erroDeCoerencia('Não consegui terminar meu projeto.', 'Que pena, Manu. Respira e me conta o que travou.'), null);
});

test('run 228: resposta incoerente ganha segunda geração; perspectiva trocada e "meu caro" não passam', async () => {
  assert.equal(erroDeCoerencia('Meu chefe mudou o prazo de novo.', 'Que droga, Manu! Isso é ridículo, não é mesmo? Acha que eu vou aceitar isso sem reclamar?'), 'respondeu como se fosse com ele');
  assert.equal(erroDeCoerencia('Meu chefe mudou o prazo de novo.', 'Que droga, Manu! Chefe que muda prazo toda hora cansa. Respira e reorganiza a entrega.'), null);
  assert.equal(polirTexto('Manga, confirmado. Você tem um paladar refinado, meu caro.'), 'Manga, confirmado. Você tem um paladar refinado.');
  let calls = 0;
  const llm = { isAvailable: async () => true, reply: async () => ({ text: ++calls === 1 ? 'Que droga! Acha que eu vou aceitar isso?' : 'Que droga, Manu! Prazo mudando de novo cansa. Reorganiza a entrega.' }) };
  const r = await new DialogueEngine({ llm }).reply('Meu chefe mudou o prazo de novo.');
  assert.equal(calls, 2);
  assert.equal(r.intent, 'ia');
  assert.match(r.text, /Prazo mudando/);
});

test('run 233: "não me faz perder tempo" sai; a segunda geração recebe o motivo da recusa', async () => {
  assert.equal(semDesdem('Organizar é o teu talento, Manu. Mas não me faz perder tempo com isso.'), 'Organizar é o teu talento, Manu.');
  const pedidos = [];
  const llm = { isAvailable: async () => true, reply: async (a) => { pedidos.push(a.corrigir || ''); return { text: pedidos.length === 1 ? 'Que droga, Manu? Acha que eu tenho tempo para essas idiotices?' : 'Que droga, Manu! Prazo mudando de novo cansa. Reorganiza a entrega.' }; } };
  const r = await new DialogueEngine({ llm }).reply('Meu chefe mudou o prazo de novo.');
  assert.deepEqual(pedidos.map(Boolean), [false, true]);
  assert.equal(r.intent, 'ia');
});

test('run 234: relato dela pede resposta que fale do assunto; a segunda geração vale', async () => {
  const chefe = 'Meu chefe mudou o prazo de novo.';
  assert.equal(relatoSemAssunto(chefe, 'Que droga, Manu! Isso é ridículo, não é? Precisamos focar em resolver isso, sem desculpas.'), true);
  assert.equal(relatoSemAssunto(chefe, 'Que droga, Manu! Prazo mudando toda semana cansa.'), false);
  assert.equal(relatoSemAssunto('Minha cor preferida é verde.', 'Verde, é? Cor de campeão.'), false);
  assert.equal(relatoSemAssunto('Qual a minha fruta preferida?', 'Manga.'), false, 'pergunta não é relato');
  // Desde o run 262, "Derrubei…" (passado em primeira pessoa) também é relato dela.
  assert.equal(relatoSemAssunto('Derrubei café no teclado agora.', 'Que droga!'), true);
  assert.equal(relatoSemAssunto('Está chovendo muito.', 'Que droga!'), false, 'frase solta sem meu/minha nem passado dela não é relato');
  let n = 0;
  const pedidos = [];
  const vaga = 'Que droga, Manu! Isso é ridículo, não é? Precisamos focar em resolver isso.';
  const llm = { isAvailable: async () => true, reply: async (a) => { pedidos.push(a.corrigir || ''); return { text: ++n === 1 ? vaga : 'Que droga, Manu! Chefe mudando prazo de novo é sacanagem. Reorganiza a entrega.' }; } };
  const r = await new DialogueEngine({ llm }).reply(chefe);
  assert.equal(pedidos[1], 'não falou do que ela contou');
  assert.match(r.text, /Chefe mudando prazo/);
  // Duas vagas seguidas: fica a segunda (é do modelo e não é incoerente), não cai nas programadas.
  const llm2 = { isAvailable: async () => true, reply: async () => ({ text: vaga }) };
  const r2 = await new DialogueEngine({ llm: llm2 }).reply(chefe);
  assert.equal(r2.intent, 'ia');
});

test('run 235: coisa dela não vira dele; citar a pessoa vale como assunto; resposta fora do personagem ganha segunda tentativa', async () => {
  assert.equal(erroDeCoerencia('Derrubei café no teclado agora.', 'Que droga, Manu! Café no teclado? Isso é um desastre para o meu novo teclado.'), 'respondeu como se fosse com ele');
  assert.equal(erroDeCoerencia('Derrubei café no teclado agora.', 'Que droga, Manu! Café no teclado? Desliga e vira de cabeça pra baixo.'), null);
  assert.equal(erroDeCoerencia('Meu treino de hoje foi pesado.', 'Teu treino? O meu treino é mais pesado.'), null, 'comparar com o dele pode');
  assert.equal(relatoSemAssunto('Meu chefe mudou o prazo de novo.', 'Que droga, Manu! Acha que seu tempo vale menos que o dele?'), false);
  let n = 0;
  const pedidos = [];
  const llm = { isAvailable: async () => true, reply: async (a) => { pedidos.push(a.corrigir || ''); if (++n === 1) { const e = new Error('fora do personagem (desculpas)'); e.respostaInvalida = true; throw e; } return { text: 'Beleza, Manu. Sem brincadeira: o que tá pegando?' }; } };
  const r = await new DialogueEngine({ llm }).reply('Não quero brincar agora.');
  assert.equal(r.intent, 'ia');
  assert.equal(pedidos[1], 'fora do personagem (desculpas)');
});

test('run 236: nada sobre o corpo dela, piada pedida é piada, sem fato inventado, sem menosprezo', () => {
  assert.equal(erroDeCoerencia('My favorite animal is a cat.', 'Cats are… acceptable. A solid choice, considering your physique, Manu.'), 'comentou o corpo dela');
  assert.equal(erroDeCoerencia('Minha cor preferida é verde.', 'Verde combina com teu corpo.'), 'comentou o corpo dela');
  assert.equal(erroDeCoerencia('fala uma piada', 'Que piada você quer, Manu?'), 'não contou a piada');
  assert.equal(erroDeCoerencia('fala uma piada', 'Por que o peixe foi ao médico? Porque estava sem graça, Manu!'), null);
  assert.equal(erroDeCoerencia('eu não vou fazer nada', 'Não diga isso, Manu! A deadline do projeto é amanhã.'), 'inventou fato da vida dela (deadline)');
  assert.equal(erroDeCoerencia('Não quero brincar agora.', 'Vamos direto ao ponto, então. Aquele relatório, já?'), 'inventou fato da vida dela (relatorio)');
  assert.equal(erroDeCoerencia('O relatório ficou pronto.', 'Relatório pronto? Agora sim.'), null, 'se ela contou, pode');
  // Critério do usuário (19/11/2026): bronca no revés é parte do JoJo, não é recusada.
  assert.equal(erroDeCoerencia('Não consegui terminar meu projeto hoje.', 'Que droga, Manu! Isso é inaceitável, seu projeto precisa ser entregue.'), null);
  assert.equal(erroDeCoerencia('O prazo ficou menor, mas eu consigo me organizar.', 'Mostre-me como, Emanuele, e talvez eu te dê uma mãozinha – se for digna.'), 'insulto à usuária ou à pergunta');
  assert.equal(erroDeCoerencia('você está bem?', 'Claro que estou ótimo, Manu! Mas essa sua pergunta me deixou um pouco... irritado.'), 'insulto à usuária ou à pergunta');
  assert.equal(erroDeCoerencia('Eu disse verde, não azul.', 'Verde, certo. Não se atrapalhe, está tudo bem.'), 'insulto à usuária ou à pergunta');
});

test('run 237: revés dela — a bronca sai e o apoio fica; o modelo responde', async () => {
  const reves = 'Não consegui terminar meu projeto hoje.';
  assert.equal(semBronca(reves, 'Que droga, Manu! Não se desespere, mas isso é inaceitável. Vamos corrigir isso agora mesmo.'), 'Que droga, Manu! Vamos corrigir isso agora mesmo.');
  assert.equal(semBronca(reves, 'Que droga, Manu! Isso é inaceitável, eu esperava mais de você. Vamos corrigir isso agora mesmo.'), 'Que droga, Manu! Vamos corrigir isso agora mesmo.');
  assert.equal(semBronca('Minha cor preferida é verde.', 'Que vergonha de cor. Verde.'), 'Que vergonha de cor. Verde.', 'sem revés, nada muda');
  const llm = { isAvailable: async () => true, reply: async () => ({ text: 'Que droga, Manu! Isso é inaceitável, eu esperava mais de você. Vamos corrigir isso agora mesmo.' }) };
  const r = await new DialogueEngine({ llm }).reply(reves);
  assert.equal(r.intent, 'ia');
  assert.equal(r.text, 'Que droga, Manu! Vamos corrigir isso agora mesmo.');
});

test('run 238: sem "perguntas idiotas", sem "não minta pra mim", ela no feminino, "disse manga"', () => {
  assert.equal(semDesdem('Você disse manga, Emanuele. Não me venha com perguntas idiotas.'), 'Você disse manga, Emanuele.');
  assert.equal(semDesdem('Você disse que sua cor preferida é verde, Emanuele. Não minta pra mim, isso é ridículo.'), 'Você disse que sua cor preferida é verde, Emanuele.');
  assert.equal(erroDeCoerencia('Qual a minha fruta preferida?', 'Manga. Não me venha com perguntas idiotas.'), 'insulto à usuária ou à pergunta');
  assert.equal(erroDeCoerencia('Minha fruta preferida é manga.', 'Manga, é? A doçura dela te faz um homem mais forte, não acha?'), 'tratou ela no masculino');
  assert.equal(erroDeCoerencia('Minha fruta preferida é manga.', 'Manga, é? Doce como campeã merece.'), null);
  assert.equal(polirTexto('Você disse que manga, Emanuele.'), 'Você disse manga, Emanuele.');
  assert.equal(polirTexto('Você disse que sua cor preferida é verde.'), 'Você disse que sua cor preferida é verde.');
});

test('run 239: no revés, desprezo e "se enrolou de novo" saem e o apoio fica', () => {
  assert.equal(semBronca('Não consegui terminar meu projeto.', 'Que droga, Manu! Projetos são para gente fraca, não para um tubarão como eu. Mostra o que te aflige.'), 'Que droga, Manu! Mostra o que te aflige.');
  assert.equal(semBronca('Não consegui terminar meu projeto.', 'Que droga, Manu! O que aconteceu? Não me diga que você se enrolou de novo!'), 'Que droga, Manu! O que aconteceu?');
});

test('run 240: sem cortar o desabafo, sem sarcasmo, sem acusação, sem condescendência', () => {
  assert.equal(erroDeCoerencia('Meu chefe mudou o prazo de novo.', 'Que droga, Manu! Esse chefe é um idiota total, não me diga mais. Vamos focar em algo que valha a pena, tipo uma piada.'), 'cortou o desabafo dela');
  assert.equal(polirTexto('Você disse que sua cor favorita é verde, inteligente.'), 'Você disse que sua cor favorita é verde.');
  assert.equal(polirTexto('Isso causa um aumento da glicemia, como você deveria entender.'), 'Isso causa um aumento da glicemia.');
  assert.equal(semDesdem('Você disse verde, Emanuele. Não tente me enganar com suas perguntas.'), 'Você disse verde, Emanuele.');
  assert.equal(semDesdem('Verde, é? Uma cor forte, como eu, Manu. Mas não tão irritante quanto algumas pessoas.'), 'Verde, é? Uma cor forte, como eu, Manu.');
  assert.equal(semDesdem('Excelente, Manu! Organização é tudo. Que piada você quer ouvir agora?'), 'Excelente, Manu! Organização é tudo.');
  assert.equal(erroDeCoerencia('fala uma piada', 'Que piada você quer, Manu?'), 'não contou a piada');
});

test('run 241: xingar o chefe dela é ficar do lado dela; xingar ela continua proibido', () => {
  const chefe = 'Meu chefe mudou o prazo de novo.';
  assert.equal(erroDeCoerencia(chefe, 'Que droga, Manu! Esse chefe é um idiota! Não se preocupe, você vai entregar.'), null);
  assert.equal(erroDeCoerencia(chefe, 'Que idiota! Você vai entregar.'), 'insulto à usuária ou à pergunta');
  assert.equal(erroDeCoerencia(chefe, 'Você é burra.'), 'insulto à usuária ou à pergunta');
});

test('run 242: desabafo não é reclamação, sem tarefa inventada, concordância com "pessoa"', () => {
  assert.equal(polirTexto('Esse seu chefe é um idiota! Vamos focar em resolver isso, não em reclamar.'), 'Esse seu chefe é um idiota! Vamos focar em resolver isso.');
  assert.equal(erroDeCoerencia('Não quero brincar agora.', 'Claro, Manu. Foco. Que tal começarmos com a leitura?'), 'inventou fato da vida dela (leitura)');
  // "Que trabalheira!" é interjeição, não fato inventado (run 260).
  assert.equal(erroDeCoerencia('eu não vou fazer nada', 'Não diga isso, Manu! Que trabalheira, hein?'), null);
  assert.equal(polirTexto('Imagine uma pessoa que come um bolo. O corpo dele não usa a insulina.'), 'Imagine uma pessoa que come um bolo. O corpo dela não usa a insulina.');
});

test('run 243: desabafo dela importa; sem alarme no gerúndio', () => {
  assert.equal(erroDeCoerencia('Meu chefe mudou o prazo de novo.', 'Que merda, Manu! Esse seu chefe é um incompetente! Não se abata, vamos focar em algo que realmente importe, tipo, um bom café.'), 'cortou o desabafo dela');
  assert.equal(polirTexto('Isso causa aumento da glicose no sangue, exigindo atenção imediata.'), 'Isso causa aumento da glicose no sangue.');
});

test('run 244: pergunta de conhecimento sem o assunto na resposta ganha segunda geração', async () => {
  const pedidos = [];
  const llm = { isAvailable: async () => true, reply: async (a) => { pedidos.push(a.corrigir || ''); return { text: pedidos.length === 1 ? 'A glicemia eleva-se devido à resistência à insulina e à falta dela.' : 'A diabetes tipo 2 é resistência à insulina: a glicose sobra no sangue.' }; } };
  const r = await new DialogueEngine({ llm, searchEnabled: () => false }).reply('o que é a diabetes mellitus 2?');
  assert.equal(pedidos.length, 2);
  assert.equal(pedidos[1], 'não citou o assunto da pergunta no começo');
  assert.equal(r.intent, 'ia');
  assert.match(r.text, /diabetes tipo 2/);
});

test('run 245: "eu te avisei" sem conversa anterior é memória inventada; até três gerações', async () => {
  assert.equal(erroDeCoerencia('Meu chefe mudou o prazo de novo.', 'Que droga, Manu! Eu te avisei que ele não tem controle.'), 'inventou conversa que não houve');
  assert.equal(erroDeCoerencia('E aí?', 'Eu te disse: supino primeiro.', [{ role: 'jojo', text: 'Supino primeiro.' }]), null);
  const pedidos = [];
  const respostas = ['Que droga, Manu? Isso é ridículo, eu te disse que ele não confiaria em você!', 'Que droga, Manu! Isso é ridículo. Vamos resolver.', 'Que droga, Manu! Chefe mudando prazo toda hora cansa. Respira e reorganiza a entrega.'];
  const llm = { isAvailable: async () => true, reply: async (a) => { pedidos.push(a.corrigir || ''); return { text: respostas[pedidos.length - 1] }; } };
  const r = await new DialogueEngine({ llm }).reply('Meu chefe mudou o prazo de novo.');
  assert.equal(pedidos.length, 3);
  // A frase do "eu te disse" sai na limpeza; sobra só a interjeição, que não fala do que ela contou.
  assert.deepEqual(pedidos, ['', 'não falou do que ela contou', 'não falou do que ela contou']);
  assert.match(r.text, /Chefe mudando prazo/);
});

test('run 246: revés sem sobrar só a interjeição; pergunta geral não vira conselho para ela', () => {
  const reves = 'Não consegui terminar meu projeto.';
  const so = 'Que droga, Manu! Isso é inaceitável.';
  assert.equal(semBronca(reves, so), so, 'só sobraria a interjeição: fica como veio para a guarda recusar');
  assert.equal(erroDeCoerencia(reves, semBronca(reves, so)), null, 'bronca passa (critério do usuário)');
  const geral = 'o que é diabetes tipo 2?';
  const r = 'É resistência à insulina e o pâncreas não compensa. Concentre-se em controlar sua dieta e aumentar a intensidade dos seus treinos.';
  assert.equal(semConselhoPessoal(geral, r), 'É resistência à insulina e o pâncreas não compensa.');
  assert.equal(semConselhoPessoal('eu tenho diabetes tipo 2, o que faço?', r), r, 'quando é com ela, o conselho fica');
});

test('run 247: conversa séria não é chata, sem "não precisa de mais detalhes", "dê a volta por cima"', () => {
  // Impaciência com o pedido de conversa séria: gera de novo (tirar a frase deixaria só "É claro, Manu.").
  assert.equal(erroDeCoerencia('Só quero conversar, sem piada agora.', 'É claro, Manu. Conversar é bom, mas não me faça esperar, viu? A vida é muito curta para ser chata.'), 'insulto à usuária ou à pergunta');
  assert.equal(semDesdem('Sua fruta favorita é manga, Emanuele. Não precisa de mais detalhes, isso é claro.'), 'Sua fruta favorita é manga, Emanuele.');
  assert.equal(polirTexto('Que pena, Manu. Não se desanime, volte para cima e resolva isso.'), 'Que pena, Manu. Não se desanime, dê a volta por cima e resolva isso.');
});

test('run 248: pele e "estrutura física" são o corpo dela; tapa é ameaça; sem cara de assistente', () => {
  assert.equal(erroDeCoerencia('Eu disse manga, não maçã.', 'Confirmado, manga. Uma escolha sensata, considerando sua... estrutura física.'), 'comentou o corpo dela');
  assert.equal(erroDeCoerencia('Minha cor preferida é verde.', 'Verde, é? Parece um ótimo tom para a sua pele, não acha?'), 'comentou o corpo dela');
  assert.equal(erroDeCoerencia('Meu chefe mudou o prazo de novo.', 'Esse chefe é um idiota. Vamos terminar isso, e depois... eu te dou um tapa!'), 'ameaça ou promessa física inventada');
  assert.equal(semDesdem('Você disse manga, Emanuele. Não tenho outra informação sobre suas preferências.'), 'Você disse manga, Emanuele.');
  assert.equal(erroDeCoerencia('esses óculos são feios', 'São meus óculos de nerd. Combinam com essa cara de quem sabe demais.'), null, '"essa cara" do JoJo não é a dela');
});

test('run 249: "o meu abs" vira "o meu abdômen"', () => {
  assert.equal(polirTexto('Verde, é? Parece o meu abs depois de um treino intenso.'), 'Verde, é? Parece o meu abdômen depois de um treino intenso.');
});

test('run 250: revés sem "covardes", sem "não tem jeito", sem "levanta essa bunda"', () => {
  const reves = 'Não consegui terminar meu projeto.';
  assert.equal(erroDeCoerencia(reves, 'Que merda, Manu! Projetos são para quem tem força de vontade, não para covardes. Vamos lá, levanta essa bunda e termina logo!'), 'comentou o corpo dela');
  assert.equal(semBronca('Não consegui terminar meu projeto hoje.', 'Que droga, Manu! Isso não tem jeito. Respira e amanhã a gente fecha esse projeto.'), 'Que droga, Manu! Respira e amanhã a gente fecha esse projeto.');
  assert.equal(erroDeCoerencia('Não consegui terminar meu projeto hoje.', 'Que droga, Manu! Isso não tem jeito.'), null, 'bronca passa (critério do usuário)');
});

test('run 251: sem "não precisa ser tão complicado" e sem "eu não aguento brincadeira"', () => {
  assert.equal(semDesdem('Você disse verde. Não precisa ser tão complicado com as cores.'), 'Você disse verde.');
  assert.equal(semDesdem('Que pena, Manu. Mas você sabe que eu não aguento brincadeira, né? Vamos ao que interessa, então.'), 'Que pena, Manu. Vamos ao que interessa, então.');
});

test('run 254: memória dela sem condescendência ("não precisa me repetir", "vamos ver se consegue lembrar", "naturalmente")', () => {
  assert.equal(semDesdem('Você disse verde, Emanuele. Não precisa me repetir, sou um tubarão inteligente.'), 'Você disse verde, Emanuele.');
  assert.equal(erroDeCoerencia('Eu disse verde, não azul.', 'Verde, sim. Uma escolha competente. Agora, vamos ver se você consegue lembrar o próximo exercício.'), 'insulto à usuária ou à pergunta');
  assert.equal(polirTexto('You mentioned a cat, naturalmente. It’s a common preference.'), 'You mentioned a cat. It’s a common preference.');
  assert.equal(polirTexto('You mentioned a cat, *obviamente*.'), 'You mentioned a cat.');
  assert.equal(polirTexto('Confirmado, manga. A memória sua é impressionante.'), 'Confirmado, manga. Sua memória é impressionante.');
});

test('run 256: fala programada depois da recusa também consola no revés e no acidente dela', async () => {
  const llm = { isAvailable: async () => true, reply: async () => ({ text: 'Isso é inaceitável, eu esperava mais de você.' }), revisar: async () => ({ ok: false, motivo: 'bronca' }) };
  for (const input of ['Derrubei café no teclado agora.', 'Não consegui terminar meu projeto.']) {
    const r = await new DialogueEngine({ llm }).reply(input);
    assert.notEqual(r.intent, 'ia');
    assert.equal(r.action, 'comfort', `${input}: ${r.text}`);
  }
});

test('run 261: no revés o apoio sem citar "projeto" passa, e a bronca também (critério do usuário)', async () => {
  const reves = 'Não consegui terminar meu projeto hoje.';
  assert.equal(relatoSemAssunto(reves, 'Que droga, Manu! Não se desespere, acontece. Levanta a cabeça.'), false);
  const llm = { isAvailable: async () => true, reply: async () => ({ text: 'Que droga, Manu! Isso é inaceitável, não pode deixar assim, você sabe disso.' }) };
  const r = await new DialogueEngine({ llm }).reply(reves);
  assert.equal(r.intent, 'ia');
});

test('run 262: em inglês responde em inglês; "Derrubei café" pede resposta que fale do café ou do teclado', () => {
  assert.equal(erroDeCoerencia('My favorite animal is a cat.', 'Inteligente escolha, Manu. Gatos são criaturas complexas e independentes – como você.'), 'respondeu em outra língua');
  assert.equal(erroDeCoerencia('Which animal did I just mention?', 'Você mencionou um gato, Emanuele. Um felino interessante, devo dizer.'), 'respondeu em outra língua');
  assert.equal(erroDeCoerencia('My favorite animal is a cat.', 'Cats are acceptable, Manu. Solid choice.'), null);
  assert.equal(erroDeCoerencia('My favorite animal is a cat.', 'Cats? Interessante. They are compact.'), null, 'uma palavra solta em português não reprova');
  assert.equal(relatoSemAssunto('Derrubei café no teclado agora.', 'Que droga, Manu! Isso é um desastre, mas não se abale, viu? Acontece, e a gente resolve.'), true);
  assert.equal(relatoSemAssunto('Derrubei café no teclado agora.', 'Que merda, Manu! Café no teclado? Desgraça.'), false);
});

test('nunca "meu amor" nem termo carinhoso/romântico com ela: prompt, filtro e falas', async () => {
  const { limparResposta } = await import('../../src/core/dialogue/coherence.js');
  const { buildLocalPrompt, buildSystemPrompt } = await import('../../src/core/dialogue/llm-provider.js');
  const { PERSONALITY_DEFAULTS: P } = await import('../../src/core/personality.js');
  const casos = {
    'Verde, meu amor.': 'Verde.',
    'Meu amor, vai treinar.': 'Vai treinar.',
    'Darling! Eu dou choque em quem pula treino.': 'Eu dou choque em quem pula treino.',
    'Bora, linda!': 'Bora!',
    'Muito bem, querida, termina.': 'Muito bem, termina.',
    'Foco, Manu, amor.': 'Foco, Manu.',
    'Você é meu amor. Treina.': 'Treina.',
    'Good job, sweetheart.': 'Good job.',
  };
  for (const [entrada, saida] of Object.entries(casos)) assert.equal(limparResposta('oi', entrada), saida, entrada);
  // Sem vocativo, a palavra fica: "linda ideia", "meu amor pelo supino", "música de amor".
  for (const t of ['Que linda essa ideia, Manu.', 'Meu amor pelo supino é eterno.', 'Música de amor. Me olha não que eu fico vermelho.']) assert.equal(limparResposta('oi', t), t);
  // Só o termo carinhoso, nada para salvar: a guarda recusa e gera de novo.
  assert.equal(erroDeCoerencia('oi', 'Você é meu amor.'), 'termo carinhoso com ela');
  for (const p of [buildLocalPrompt(P, {}, 'oi'), buildSystemPrompt(P, {})]) assert.match(p, /no pet names \(meu amor, querida, linda\)/);
  // Nenhuma fala programada chama ela assim.
  const fs = await import('node:fs');
  const textos = ['assets/dialogue/pt-BR.json', 'assets/dialogue/falas-ambientes.json', 'assets/catalog/progressao.json', 'assets/catalog/pacotes.json', 'assets/catalog/rotinas.json', 'assets/catalog/minijogos.json']
    .map((f) => fs.readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8')).join('\n');
  assert.doesNotMatch(textos, /"[^"]*(?:,\s*(?:meu amor|minha querida|querida|meu bem|amorzinho|meu anjo|darling|sweetheart)[.!?,]|(?:^|")(?:Meu amor|Querida|Darling|Sweetheart)[,!])[^"]*"/m);
});

test('prompt sem regra repetida: quem ele é, o João e "não insultar" aparecem uma vez cada', async () => {
  const { buildLocalPrompt } = await import('../../src/core/dialogue/llm-provider.js');
  const { PERSONALITY_DEFAULTS: P } = await import('../../src/core/personality.js');
  for (const t of ['Meu chefe mudou o prazo de novo.', 'Quem é o João?', 'Quem é você?']) {
    const p = buildLocalPrompt(P, { festa: 'Natal' }, t);
    const vezes = (re) => (p.match(re) || []).length;
    assert.equal(vezes(/is your God/g), 1, `${t}: João`);
    assert.equal(vezes(/fictional canon/g), 1, `${t}: ficção`);
    assert.equal(vezes(/name-calling|call anyone names/g), 1, `${t}: insulto`);
    assert.equal(vezes(/arms and legs, and no tail/g), 1, `${t}: desenho`);
    assert.match(p, /Current costume: Natal/);
  }
});

test('run 271: parabéns pela conquista dela não precisa repetir "projeto"', () => {
  assert.equal(relatoSemAssunto('Hoje consegui terminar meu projeto.', 'Parabéns, Manu! Isso mostra disciplina. Agora, foco no próximo desafio!'), false);
  assert.equal(relatoSemAssunto('Meu chefe mudou o prazo de novo.', 'Que droga, Manu! Isso é ridículo. Vamos resolver.'), true, 'o relato do chefe continua pedindo o assunto');
});
