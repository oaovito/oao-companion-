import test from 'node:test';
import assert from 'node:assert/strict';
import { DialogueEngine } from '../../src/core/dialogue/engine.js';
import { LlmProvider, parseLlmReply, buildSystemPrompt } from '../../src/core/dialogue/llm-provider.js';
import { erroDeCoerencia, historicoRelevante } from '../../src/core/dialogue/coherence.js';
import { precisaPesquisar } from '../../src/core/dialogue/pesquisa.js';
import { ConversationManager, commandMenu } from '../../src/core/conversations.js';
import { PERSONALITY_DEFAULTS } from '../../src/core/personality.js';
import { detectIntent } from '../../src/core/dialogue/scripted-provider.js';
import { makeEnv, chatAdv } from './helpers.js';

const model = (reply) => ({ isAvailable: async () => true, timeoutMs: 1000, reply: typeof reply === 'function' ? reply : async () => reply });
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
  assert.equal(erroDeCoerencia('E ele?', 'O João.', [{ role: 'user', text: 'O João vem amanhã' }]), null);
});

test('roteamento distingue conversa sobre o JoJo de uma pergunta de conhecimento', () => {
  for (const q of ['Por que você só fala do João?', 'me explica por que você ficou assim', 'quem é o seu chefe?', 'qual seu nome?', 'como foi seu dia?']) assert.equal(precisaPesquisar(q), null, q);
  assert.equal(precisaPesquisar('o que é diabetes mellitus 2?'), 'geral');
  assert.equal(precisaPesquisar('Você sabe o que é DLS?'), 'cientifica');
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
  const p = buildSystemPrompt(PERSONALITY_DEFAULTS);
  assert.ok(p.length < 4000, `prompt voltou a crescer: ${p.length}`);
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
