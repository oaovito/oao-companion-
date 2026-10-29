// Conversa com IA (API gratuita) sempre no jeito do JoJo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LlmProvider, buildSystemPrompt, parseLlmReply, outOfCharacter, LLM_PRESETS } from '../../src/core/dialogue/llm-provider.js';
import { DialogueEngine } from '../../src/core/dialogue/engine.js';
import { PERSONALITY_DEFAULTS } from '../../src/core/personality.js';

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
