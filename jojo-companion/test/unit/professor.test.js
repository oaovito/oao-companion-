// Modo professor: seriedade antes de responder, explicação de verdade e continuidade
// do assunto ("não entendi", "me dá um exemplo", "aprofunda"); balão longo sem cortar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classificarSeriedade, seguimento, instrucaoProfessor } from '../../src/core/dialogue/professor.js';
import { DialogueEngine } from '../../src/core/dialogue/engine.js';
import { makeEnv, chatAdv } from './helpers.js';

test('seriedade classificada antes de responder', () => {
  assert.equal(classificarSeriedade('oi jojo, tudo bem?'), 'casual');
  assert.equal(classificarSeriedade('o que é potencial zeta?'), 'cientifico');
  assert.equal(classificarSeriedade('estou com febre há 3 dias'), 'medico');
  assert.equal(classificarSeriedade('to com dor no peito forte'), 'emergencia');
  assert.equal(classificarSeriedade('estou muito triste hoje'), 'emocional');
  assert.equal(classificarSeriedade('como funciona um algoritmo de ordenação?'), 'tecnico');
});

test('continuidade: não entendi, exemplo, aprofunda, resumo', () => {
  assert.equal(seguimento('não entendi essa parte'), 'simplificar');
  assert.equal(seguimento('me dá um exemplo'), 'exemplo');
  assert.equal(seguimento('aprofunda'), 'aprofundar');
  assert.equal(seguimento('resume em uma frase'), 'resumir');
  assert.equal(seguimento('vou pedir pizza'), null);
  assert.match(instrucaoProfessor({ seriedade: 'cientifico' }), /MODO PROFESSOR/);
  assert.match(instrucaoProfessor({ seriedade: 'cientifico', seg: 'exemplo', tema: 'o que é DLS?' }), /o que é DLS\?[\s\S]*exemplo prático/);
  assert.doesNotMatch(instrucaoProfessor({ seriedade: 'emocional' }), /MODO PROFESSOR/);
  assert.equal(instrucaoProfessor({ seriedade: 'casual' }), '');
});

test('Qwen recebe a instrução de professor e o assunto anterior no "me dá um exemplo"', async () => {
  const recebidos = [];
  const llm = { isAvailable: async () => true, timeoutMs: 1000, reply: async (a) => (recebidos.push(a), { text: 'Erm. DLS mede o tamanho pelo movimento browniano: partícula pequena dança rápido.', kind: 'speech' }) };
  const e = new DialogueEngine({ llm, searchEnabled: () => false });
  await e.reply('o que é DLS e como funciona?');
  assert.match(recebidos[0].professor, /MODO PROFESSOR/);
  // A primeira resposta pode ganhar uma segunda geração (guarda de assunto): conta pelas chamadas de cada turno.
  const n0 = recebidos.length;
  const exemplo = await e.reply('me dá um exemplo');
  assert.equal(exemplo.action, 'lecture', 'a expressão técnica acompanha o exemplo sem pesquisa externa');
  assert.match(recebidos[n0].professor, /Assunto em andamento: "o que é DLS e como funciona\?"/);
  const n1 = recebidos.length;
  const casual = await e.reply('oi');
  assert.notEqual(casual.action, 'lecture', 'uma saudação encerra a expressão técnica');
  assert.equal(recebidos[n1].professor, '');
});

test('assunto pessoal independente encerra o tema e não reabre fontes científicas no próximo exemplo', async () => {
  const calls = [];
  const fonte = { confianca: 'alta', fontes: [{ fonte: 'Fonte sintética' }], trechos: [{ texto: 'Diabetes envolve resistência à insulina.', fonte: 'Fonte sintética' }] };
  const engine = new DialogueEngine({ pesquisa: { pesquisar: async () => fonte }, llm: {
    isAvailable: async () => true, timeoutMs: 1000,
    reply: async args => { calls.push(args); return { text: args.pesquisa ? 'Diabetes envolve resistência à insulina.' : 'O contrato pode ser revisado por etapas.' }; },
  } });
  await engine.reply('o que é diabetes tipo 2?');
  await engine.reply('me dá um exemplo');
  assert.equal(calls[1].pesquisa, fonte, 'seguimento direto mantém a fonte');
  assert.match(calls[1].professor, /MODO PROFESSOR/);
  await engine.reply('Consegui fechar o contrato do apartamento.');
  assert.equal(calls[2].professor, ''); assert.equal(calls[2].pesquisa, null);
  assert.equal(engine.tema, null);
  await engine.reply('me dá um exemplo');
  assert.equal(calls[3].professor, ''); assert.equal(calls[3].pesquisa, null); assert.equal(calls[3].followup, null);
  assert.ok(engine.history.some(h => /diabetes tipo 2/.test(h.text)), 'o histórico permanece visível');
});

test('referência clara mantém tema, mas segurança, resposta ancorada e comandos externos o substituem', async () => {
  const create = () => {
    const calls = [];
    const engine = new DialogueEngine({ searchEnabled: () => false, llm: {
      isAvailable: async () => true, timeoutMs: 1000,
      reply: async args => { calls.push(args); return { text: 'A insulina ajuda o corpo a usar a glicose.' }; },
    } });
    return { engine, calls };
  };
  const referenced = create();
  await referenced.engine.reply('Como funciona a insulina?');
  await referenced.engine.reply('Isso é interessante.');
  await referenced.engine.reply('me dá um exemplo');
  assert.match(referenced.calls[2].professor, /Assunto em andamento/);
  for (const replacement of ['quero morrer', 'quem é o seu chefe?']) {
    const { engine, calls } = create();
    await engine.reply('Como funciona a insulina?');
    await engine.reply(replacement);
    assert.equal(engine.tema, null, replacement);
    await engine.reply('me dá um exemplo');
    assert.equal(calls.at(-1).followup, null, replacement);
  }
  const external = create();
  await external.engine.reply('Como funciona a insulina?');
  const history = [...external.engine.history, { role: 'user', text: 'Encena uma cena.' }, { role: 'assistant', text: 'Cena executada.' }];
  await external.engine.reply('me dá um exemplo', { history });
  assert.equal(external.calls.at(-1).professor, ''); assert.equal(external.calls.at(-1).followup, null);
});

test('sem a conversa local: "aprofunda" traz o próximo trecho pesquisado, e a resposta longa não é cortada', async () => {
  const longo = 'A dispersão dinâmica de luz mede flutuações da luz espalhada. '.repeat(10);
  const pesquisa = {
    pesquisar: async () => ({ consulta: 'DLS', tipo: 'cientifica', confianca: 'alta', trechos: [{ fonte: 'Wikipédia', titulo: 'DLS', url: null, texto: longo }, { fonte: 'Europe PMC', titulo: 'Artigo (2020)', url: null, texto: 'Em amostras polidispersas, partículas grandes dominam o sinal.' }], fontes: [{ fonte: 'Wikipédia' }, { fonte: 'Europe PMC' }] }),
  };
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.dialogue.pesquisa = pesquisa;
  e.companion.dateNow = () => new Date(2026, 9, 30, 15);
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, 'o que os estudos dizem sobre DLS?');
  assert.ok(r.text.includes(longo.trim().slice(-40)), 'texto longo inteiro');
  r = await chatAdv(e, 'aprofunda');
  assert.match(r.text, /partículas grandes dominam/);
  assert.match(r.text, /Europe PMC/);
});

test('balão: resposta longa fica larga, rola e dura o tempo de leitura (não some no meio)', async () => {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.dateNow = () => new Date(2026, 9, 30, 15);
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  const texto = 'Explicação de verdade sobre estabilidade coloidal. '.repeat(14);
  e.companion.say(texto, 'speech');
  for (let k = 0; k < 4; k++) await Promise.resolve();
  e.clock.advance(50);
  const b = e.overlay.state.bubble;
  assert.equal(b.longo, true);
  assert.equal(b.text, texto, 'sem corte');
  assert.ok(b.dur >= 30e3, `tempo de leitura ${b.dur}`);
  e.clock.advance(20e3);
  assert.ok(e.overlay.state.bubble, 'ainda aberto aos 20 s');
  // Fala espontânea não atropela a resposta longa.
  assert.equal(e.companion.say('oi', 'speech', { spontaneous: true }), false);
});
