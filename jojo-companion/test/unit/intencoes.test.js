// O JoJo entende pedidos de comando ditos de qualquer jeito (sem "/").
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv } from './helpers.js';
import { interpretCommand, COMANDOS } from '../../src/core/dialogue/intencoes.js';
import { parseLlmReply, buildSystemPrompt } from '../../src/core/dialogue/llm-provider.js';
import { normalizeReply } from '../../src/core/dialogue/provider.js';

const cmd = (t, ctx = {}) => (interpretCommand(t, ctx) || {}).cmd || null;

test('parar o foco: qualquer forma de pedir', () => {
  for (const t of ['pare com a sessão de foco', 'para o foco', 'encerra o foco', 'termina a sessão', 'cancela o pomodoro', 'acaba com esse foco', 'jojo, por favor, pode parar o foco', 'vou parar de estudar', 'não quero mais estudar', 'chega de estudar', 'finaliza a sessao de estudo', 'PARE COM A SESSÃO DE FOCO!!!', 'para de focar']) {
    assert.equal(cmd(t), 'foco_parar', t);
  }
  // Com o foco ativo, um "para"/"chega"/"cansei" sozinho já basta.
  for (const t of ['para', 'chega', 'cansei', 'pode parar', 'para com isso', 'termina isso', 'já deu']) assert.equal(cmd(t, { foco: true }), 'foco_parar', t);
});

test('não confunde: "para" preposição, perguntas e frases comuns não viram comando', () => {
  for (const t of ['vou para a academia', 'vou estudar para a prova', 'o que é foco?', 'para a música ficar boa', 'estudei muito hoje', 'me deixa estudar em paz', 'quero comer algo']) {
    assert.equal(cmd(t, { foco: true }), null, t);
  }
  assert.equal(cmd('chega'), null, 'sem nada ativo, "chega" não é comando');
});

test('outros pedidos: começar foco, jogo, calma, pausar, esconder, silêncio, telas', () => {
  assert.deepEqual(interpretCommand('vamos estudar 40 minutos'), { cmd: 'foco_iniciar', arg: '40' });
  assert.deepEqual(interpretCommand('bora focar no treino 30 min'), { cmd: 'foco_iniciar', arg: '30 treino' });
  assert.equal(cmd('desisto', { jogo: true }), 'jogo_parar');
  assert.equal(cmd('cancela o jogo'), 'jogo_parar');
  assert.equal(cmd('para', { calma: true }), 'parar_atividade');
  assert.equal(cmd('pausa'), 'pausar');
  assert.equal(cmd('pode voltar', { pausado: true }), 'retomar');
  assert.equal(cmd('some daqui'), 'esconder');
  assert.equal(cmd('vai embora'), 'esconder');
  assert.equal(cmd('volta', { escondido: true }), 'mostrar');
  assert.equal(cmd('para de falar'), 'silencio_ligar');
  assert.equal(cmd('desliga o modo silencioso'), 'silencio_desligar');
  assert.equal(cmd('abre as configurações'), 'configuracoes');
  assert.equal(cmd('quero ver minhas conquistas'), 'colecao');
  assert.equal(cmd('como foi meu dia?'), 'resumo');
  assert.equal(cmd('começa uma conversa nova'), 'nova_conversa');
});

function started() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

test('companion: "pare com a sessão de foco" encerra o foco e ele para de estudar do lado', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, '/foco');
  assert.ok(e.companion.focus);
  e.companion.exitInteraction('test');
  e.clock.advance(1000);
  assert.match(e.companion.behavior.anim, /^cat_estudarJunto/);
  r = await chatAdv(e, 'pare com a sessão de foco');
  assert.equal(r.intent, 'comando');
  assert.match(r.text, /Foco encerrado/);
  assert.equal(e.companion.focus, null);
  e.clock.advance(3000);
  assert.doesNotMatch(e.companion.behavior.anim || '', /^cat_estudarJunto/);
  r = await chatAdv(e, 'some daqui');
  assert.equal(e.companion.userHidden, true);
  r = await chatAdv(e, 'volta');
  assert.equal(e.companion.userHidden, false);
  // Segurança continua na frente de qualquer comando.
  r = await chatAdv(e, 'chega, quero morrer');
  assert.notEqual(r.intent, 'comando');
});

test('conversa online: entende pedidos que as frases não pegaram e devolve o comando validado', () => {
  const r = parseLlmReply('{"texto":"Tá. Acabou o estudo.","acao":"nod","tom":"serio","comando":"foco_parar","arg":null}');
  assert.equal(r.command, 'foco_parar');
  assert.equal(normalizeReply(r).command, 'foco_parar');
  assert.equal(parseLlmReply('{"texto":"oi","acao":null,"tom":"serio","comando":"formatar_disco"}').command, undefined, 'comando fora da lista é ignorado');
  assert.equal(normalizeReply({ text: 'x', command: 'rm -rf' }).command, undefined);
  const p = buildSystemPrompt({ nomeSerio: 'Emanuele' });
  for (const c of COMANDOS) assert.ok(p.includes(c), c);
  assert.match(p, /Interprete o que ela quis dizer/);
});

test('companion: comando vindo da conversa online é executado', () => {
  const e = started();
  e.companion.startFocus(25, 'estudo');
  assert.equal(e.companion.runInterpreted({ cmd: 'foco_parar' }, null, { silent: true }), 'Foco encerrado. Sem drama.');
  assert.equal(e.companion.focus, null);
  assert.equal(e.companion.runInterpreted({ cmd: 'inexistente' }), null);
});
