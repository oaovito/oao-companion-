// Segunda leitura (pedido do usuário, 19/11/2026): o próprio modelo relê a resposta contra as
// diretrizes do JoJo antes de ela aparecer; recusada, gera de novo sabendo o motivo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DialogueEngine } from '../../src/core/dialogue/engine.js';
import { LlmProvider, REVISAO_PROMPT, lerRevisao } from '../../src/core/dialogue/llm-provider.js';

test('veredito: ok, recusa com motivo e formato inválido (segue sem veredito)', () => {
  assert.deepEqual(lerRevisao('{"ok":true}'), { ok: true });
  assert.deepEqual(lerRevisao('{"ok":false,"motivo":"condescendente com a memória dela"}'), { ok: false, motivo: 'condescendente com a memória dela' });
  assert.deepEqual(lerRevisao('```json\n{"ok":false}\n```'), { ok: false, motivo: 'recusada na segunda leitura' });
  assert.deepEqual(lerRevisao('talvez'), { ok: true, pulou: true });
  assert.deepEqual(lerRevisao(''), { ok: true, pulou: true });
});

test('diretrizes da leitura cobrem o que reprovou nas rodadas e liberam o jeito do JoJo', () => {
  for (const r of [/condescending/, /scolds, blames or calls her weak/, /her body, looks or weight/, /threatens her/, /invents facts/, /meu amor/, /treats her as male/, /does not answer what she said/, /contradicts itself/, /assistant/]) assert.match(REVISAO_PROMPT, r);
  assert.match(REVISAO_PROMPT, /Fine: swearing, dry humor, bragging about his own muscles/);
  assert.match(REVISAO_PROMPT, /insulting a third person who wronged her/);
});

test('provedor local: leitura em JSON, temperatura 0, com a fala dela e a resposta dele', async () => {
  const calls = [];
  const p = new LlmProvider({
    fetch: async (_, o) => { calls.push(JSON.parse(o.body)); return { ok: true, text: async () => JSON.stringify({ message: { content: '{"ok":false,"motivo":"debochou da pergunta"}' } }) }; },
    getConfig: () => ({ ativo: true, provedor: 'ollama' }), getProfile: () => ({}), baseOverride: 'http://127.0.0.1:1',
  });
  const v = await p.revisar({ input: 'Which animal did I just mention?', reply: 'A cat. Are you trying to test my intelligence?' });
  assert.deepEqual(v, { ok: false, motivo: 'debochou da pergunta' });
  assert.equal(calls[0].format, 'json');
  assert.equal(calls[0].options.temperature, 0);
  assert.equal(calls[0].messages[0].content, REVISAO_PROMPT);
  assert.match(calls[0].messages[1].content, /She said: "Which animal did I just mention\?"\nJoJo replied: "A cat\. Are you trying to test my intelligence\?"/);
});

test('motor: recusada na leitura gera de novo com o motivo; leitura indisponível não trava a conversa', async () => {
  const pedidos = [];
  const respostas = ['You mentioned a cat. Are you trying to test my intelligence?', 'You mentioned a cat, Manu.'];
  const llm = {
    isAvailable: async () => true,
    reply: async (a) => { pedidos.push(a.corrigir || ''); return { text: respostas[pedidos.length - 1] }; },
    revisar: async ({ reply }) => (/intelligence/.test(reply) ? { ok: false, motivo: 'condescendente' } : { ok: true }),
  };
  const r = await new DialogueEngine({ llm }).reply('Which animal did I just mention?');
  assert.deepEqual(pedidos, ['', 'segunda leitura: condescendente']);
  assert.equal(r.text, 'You mentioned a cat, Manu.');
  const avisos = [];
  const llm2 = { isAvailable: async () => true, reply: async () => ({ text: 'Verde, Manu.' }), revisar: async () => { throw new Error('HTTP 500'); } };
  const e2 = new DialogueEngine({ llm: llm2 });
  e2.log = (lvl, m) => avisos.push(m);
  const r2 = await e2.reply('Qual cor eu acabei de dizer que prefiro?');
  assert.equal(r2.intent, 'ia');
  assert.ok(avisos.some((m) => /Segunda leitura indisponível/.test(m)));
});
