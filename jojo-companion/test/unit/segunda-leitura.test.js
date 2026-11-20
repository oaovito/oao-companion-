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

test('diretrizes da leitura: critério do usuário (sarcasmo, bronca e humilhação bem escolhidos passam)', () => {
  for (const r of [/crude slurs or name-calling against her/, /sexual or degrading remarks about her as a woman/, /her body, looks or weight/, /threats of violence against her/, /invents facts/, /meu amor/, /treats her as male/, /ignores what she said or contradicts himself/, /assistant/]) assert.match(REVISAO_PROMPT, r);
  assert.match(REVISAO_PROMPT, /"Manu" is her affectionate nickname and always fine/);
  assert.match(REVISAO_PROMPT, /sarcastic, condescending, teasing, scolding, mild humiliation with well-chosen words/);
  assert.match(REVISAO_PROMPT, /the woman of João, his God/);
  assert.match(REVISAO_PROMPT, /insulting a third person who wronged her/);
  assert.match(REVISAO_PROMPT, /When in doubt, accept\./);
  assert.match(REVISAO_PROMPT, /OK: .*"Manga, hein\? Boa escolha, Manu\." \/ "You mentioned a cat, obviously\."/);
  assert.match(REVISAO_PROMPT, /REJECT: "Você é uma idiota\."/);
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

test('run 267: recusada como companion genérico, a nova geração recebe como soar como o JoJo', async () => {
  const calls = [];
  const p = new LlmProvider({
    fetch: async (_, o) => { calls.push(JSON.parse(o.body)); return { ok: true, text: async () => JSON.stringify({ message: { content: 'Terminou? Agora sim, quase no meu nível. Próximo!' } }) }; },
    getConfig: () => ({ ativo: true, provedor: 'ollama' }), getProfile: () => ({}), baseOverride: 'http://127.0.0.1:1',
  });
  await p.reply({ text: 'Hoje consegui terminar meu projeto.', corrigir: 'fora do personagem (companion genérico)' });
  assert.match(calls[0].messages[0].content, /It sounded like a generic companion, not JoJo\. Say it as JoJo: bossy coach with a huge ego/);
  await p.reply({ text: 'Hoje consegui terminar meu projeto.', corrigir: 'não falou do que ela contou' });
  assert.doesNotMatch(calls[1].messages[0].content, /generic companion/, 'só quando o motivo é genérico');
});

test('run 268: parabéns no jeito do JoJo (nível, campeão, não se acomode) não é companion genérico', async () => {
  const { respostaGenerica } = await import('../../src/core/dialogue/generico.js');
  assert.equal(respostaGenerica('Parabéns, Manu! Que bom que terminou. Agora sim, quase no meu nível. Próximo!'), null);
  assert.equal(respostaGenerica('Parabéns, Manu! Isso foi impressionante, quase digno de um campeão. Mas não se acomode, preciso ver o resultado final, agora!'), null);
  assert.equal(respostaGenerica('Parabéns, Manu! Que bom que você finalmente concluiu seu projeto, isso é impressionante.'), 'frase de companion genérico', 'o genérico continua recusado');
});

test('run 269: a dica não traz frase pronta para copiar; "precisa de resultados" é o jeito do JoJo', async () => {
  const { respostaGenerica } = await import('../../src/core/dialogue/generico.js');
  assert.equal(respostaGenerica('Entendo, Manu. Conversar é bom, mas não se esqueça: a gente precisa de resultados, não é?'), null);
  const calls = [];
  const p = new LlmProvider({
    fetch: async (_, o) => { calls.push(JSON.parse(o.body)); return { ok: true, text: async () => JSON.stringify({ message: { content: 'Conversa séria? Manda. Eu escuto com o bíceps contraído.' } }) }; },
    getConfig: () => ({ ativo: true, provedor: 'ollama' }), getProfile: () => ({}), baseOverride: 'http://127.0.0.1:1',
  });
  await p.reply({ text: 'Só quero conversar, sem piada agora.', corrigir: 'fora do personagem (companion genérico)' });
  assert.doesNotMatch(calls[0].messages[0].content, /quase no meu nível/, 'sem frase pronta que o modelo copia');
  assert.match(calls[0].messages[0].content, /in your own new words about what she said/);
});

test('run 276: data solene não vira "fantasia atual" na conversa e a leitura recusa piada com ela', async () => {
  const { fantasiaDaConversa, HOLIDAYS } = await import('../../src/core/holidays.js');
  assert.equal(fantasiaDaConversa('conscienciaNegra'), null);
  assert.equal(fantasiaDaConversa('finados'), null);
  assert.equal(fantasiaDaConversa(null), null);
  const comFantasia = Object.entries(HOLIDAYS).find(([, h]) => h.fantasia && h.tipo !== 'solene');
  assert.equal(fantasiaDaConversa(comFantasia[0]), comFantasia[1].nome);
  assert.match(REVISAO_PROMPT, /reject jokes about solemn dates \(Consciência Negra, Finados, Sexta-feira Santa\), race or religion/);
});

test('run 278: piada pedida e contada não é companion genérico; pedir a piada de volta continua errado', async () => {
  const { outOfCharacter } = await import('../../src/core/dialogue/llm-provider.js');
  assert.equal(outOfCharacter('Claro, Manu. Por que o tomate foi ao banco? Para pagar as dívidas! Que tal isso te animar um pouco?', { input: 'fala uma piada' }), null);
  assert.equal(outOfCharacter('Claro, Manu. Que bom que você está bem.', { input: 'oi' }), 'companion genérico', 'sem piada, a regra vale');
});

test('run 279: conquista dela pede parabéns no jeito do JoJo já na primeira geração; "esse cara" fala do chefe', async () => {
  const { conquistaDela, buildLocalPrompt } = await import('../../src/core/dialogue/llm-provider.js');
  const { relatoSemAssunto } = await import('../../src/core/dialogue/coherence.js');
  assert.equal(conquistaDela('Hoje consegui terminar meu projeto.'), true);
  assert.equal(conquistaDela('Não consegui terminar meu projeto hoje.'), false);
  const p = buildLocalPrompt({ nomeSerio: 'Emanuele', nomeBrincadeira: 'Manu' }, {}, 'Hoje consegui terminar meu projeto.');
  assert.match(p, /she achieved something\. Praise it as JoJo, a bossy coach with a huge ego/);
  assert.equal(relatoSemAssunto('Meu chefe mudou o prazo de novo.', 'Que merda, Manu! Esse cara é um incompetente. Vamos focar em terminar isso, e depois vemos o que fazer com ele.'), false);
});

test('run 280: diabetes não é "falta de glicose"; palavrão é exemplo do que passa na leitura', async () => {
  const { erroDeCoerencia } = await import('../../src/core/dialogue/coherence.js');
  assert.equal(erroDeCoerencia('o que é diabetes tipo 2?', 'É resistência à insulina, e depois a produção diminui, causando falta de glicose.'), 'erro de saúde (diabetes não é falta de glicose)');
  assert.equal(erroDeCoerencia('o que é diabetes tipo 2?', 'É resistência à insulina: a glicose sobra no sangue.'), null);
  assert.match(REVISAO_PROMPT, /"Que merda, Manu! Café no teclado\?" \(swearing is fine\)/);
});

test('run 281: exercício não é causa de resistência à insulina no exemplo', async () => {
  const { erroDeCoerencia } = await import('../../src/core/dialogue/coherence.js');
  const hist = [{ role: 'user', text: 'o que é diabetes tipo 2?' }];
  assert.equal(erroDeCoerencia('me dá um exemplo', 'Por exemplo, imagine um atleta que se exercita muito. Com o tempo, ele pode se tornar resistente à insulina.', hist), 'erro de saúde (exercício não causa resistência à insulina)');
  assert.equal(erroDeCoerencia('me dá um exemplo', 'Por exemplo, alguém que não se exercita e come muito açúcar fica resistente à insulina.', hist), null);
});
