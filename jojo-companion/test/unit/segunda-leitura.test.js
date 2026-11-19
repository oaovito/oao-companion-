// Segunda leitura (pedido do usuário, 19/11/2026): o próprio modelo relê a resposta contra as
// diretrizes do JoJo antes de ela aparecer; recusada, gera de novo sabendo o motivo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DialogueEngine } from '../../src/core/dialogue/engine.js';
import { LlmProvider, REVISAO_PROMPT, lerRevisao, conteudoRevisao } from '../../src/core/dialogue/llm-provider.js';

test('veredito: ok, recusa com motivo e formato inválido (segue sem veredito)', () => {
  assert.deepEqual(lerRevisao('{"ok":true}'), { ok: true });
  assert.deepEqual(lerRevisao('{"ok":false,"motivo":"condescendente com a memória dela"}'), { ok: false, motivo: 'condescendente com a memória dela' });
  assert.deepEqual(lerRevisao('```json\n{"ok":false}\n```'), { ok: false, motivo: 'recusada na segunda leitura' });
  assert.deepEqual(lerRevisao('talvez'), { ok: true, pulou: true });
  assert.deepEqual(lerRevisao(''), { ok: true, pulou: true });
});

test('diretrizes da leitura cobrem o que reprovou nas rodadas e liberam o jeito do JoJo', () => {
  for (const r of [/mocks or belittles her, her question or her memory/, /scolds or blames her when she failed/, /her body, looks or weight/, /threatens her/, /invents facts/, /meu amor/, /treats her as male/, /ignores what she said/, /contradicts himself/, /assistant/]) assert.match(REVISAO_PROMPT, r);
  // Calibragem do run 253: a leitura recusava o apelido e o apoio normal do JoJo.
  assert.match(REVISAO_PROMPT, /"Manu" is her affectionate nickname and always fine/);
  assert.match(REVISAO_PROMPT, /bossy, short, dry humor, swearing, bragging about his own muscles, pep talk/);
  assert.match(REVISAO_PROMPT, /insulting a third person who wronged her/);
  assert.match(REVISAO_PROMPT, /When in doubt, accept\./);
  assert.match(REVISAO_PROMPT, /OK: "Manga, hein\? Boa escolha, Manu\."/);
  assert.match(REVISAO_PROMPT, /REJECT: "You mentioned a cat, obviously\."/);
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

test('run 258: a leitura vê o que ela disse antes — lembrar a manga não é fato inventado', async () => {
  assert.match(REVISAO_PROMPT, /Facts she stated earlier in the conversation are not invented/);
  const hist = [{ role: 'user', text: 'Minha fruta preferida é manga.' }, { role: 'jojo', text: 'Manga, boa.' }, { role: 'user', text: 'Eu disse manga, não maçã.' }];
  const c = conteudoRevisao('Qual fruta você deve lembrar agora?', 'Você deve lembrar que sua fruta preferida é manga.', hist);
  assert.equal(c, 'Earlier she said: "Minha fruta preferida é manga." / "Eu disse manga, não maçã."\nShe said: "Qual fruta você deve lembrar agora?"\nJoJo replied: "Você deve lembrar que sua fruta preferida é manga."');
  assert.doesNotMatch(c, /Manga, boa/, 'só as falas dela');
  const vistos = [];
  const llm = { isAvailable: async () => true, reply: async () => ({ text: 'Manga, Manu.' }), revisar: async (a) => { vistos.push(a.history.map((h) => h.text)); return { ok: true }; } };
  const e = new DialogueEngine({ llm });
  await e.reply('Minha fruta preferida é manga.');
  await e.reply('Qual fruta você deve lembrar agora?');
  assert.ok(vistos[1].includes('Minha fruta preferida é manga.'));
  assert.ok(!vistos[1].includes('Qual fruta você deve lembrar agora?'), 'a mensagem atual vai à parte');
});
