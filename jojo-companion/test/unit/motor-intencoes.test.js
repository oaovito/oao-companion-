// Motor de intenções: centenas de frases naturais. Mede acerto de intenção E
// execução, e principalmente falsos positivos (ação que ela não pediu).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv } from './helpers.js';
import { interpretar, validarAcao, ACOES_IDS } from '../../src/core/dialogue/motor-intencoes.js';
import { parseLlmReply } from '../../src/core/dialogue/llm-provider.js';

const ids = (r) => r.acoes.map((a) => a.acao);
const variantes = (frases, prefixos = ['', 'jojo, ', 'Jojo ', 'ei jojo, '], sufixos = ['', '.', '!', ' pfv', ' por favor']) => {
  const out = [];
  for (const f of frases) for (const p of prefixos) for (const s of sufixos) out.push(`${p}${f}${s}`);
  return out;
};

// Frase → ações esperadas (em ordem).
const ESPERADO = {
  trabalho: [['vou trabalhar', 'vou trabalhar agora', 'preciso estudar', 'me deixa concentrar', 'fica na sua um pouco', 'não quero distrações agora', 'vou fazer minha pesquisa', 'preciso terminar um relatório', 'entra em modo foco', 'modo trabalho', 'preciso me concentrar', 'hora de estudar', 'liga o modo trabalho', 'ativa o deep focus'], ['trabalho_iniciar']],
  tamanhoMenor: [['fica menor', 'diminui', 'diminui seu tamanho', 'tá muito grande', 'tá gigante', 'ta enorme', 'encolhe', 'reduz o tamanho', 'fica pequeno'], ['tamanho']],
  tamanhoMaior: [['fica maior', 'aumenta', 'cresce um pouco', 'ta muito pequeno'], ['tamanho']],
  canto: [['vai pro canto', 'fica no cantinho', 'vai pro canto de cima', 'vai pro canto esquerdo'], ['posicao']],
  lado: [['vai pra esquerda', 'passa pra direita', 'anda pra esquerda'], ['posicao']],
  longe: [['sai da frente', 'tá atrapalhando', 'sai do meio'], ['posicao']],
  menosAnim: [['não aguento mais essas animações toda hora', 'menos animação', 'animações demais', 'para com essas dancinhas'], ['animacoes_frequencia']],
  jogos: [['bora jogar', 'tô entediada, bora jogar alguma coisa?', 'queria jogar alguma coisa', 'que tal um jogo', 'vamos jogar algo'], ['menu_jogos']],
  quieto: [['fica quieto', 'fica quietinho', 'fica calado', 'para de falar'], ['silencio_ligar']],
  esconder: [['some daqui', 'vai embora', 'se esconde'], ['esconder']],
  pausa: [['pausa', 'congela'], ['pausar']],
  config: [['abre as configurações', 'quero ver as configurações'], ['configuracoes']],
};

test('intenções: centenas de variações viram a ação certa', () => {
  let total = 0;
  const erros = [];
  for (const [, [frases, esperado]] of Object.entries(ESPERADO)) {
    for (const f of variantes(frases)) {
      total++;
      const r = interpretar(f);
      if (JSON.stringify(ids(r)) !== JSON.stringify(esperado)) erros.push(`${f} → ${JSON.stringify(ids(r))}`);
    }
  }
  assert.ok(total >= 300, `só ${total} frases`);
  assert.deepEqual(erros, []);
});

test('falsos positivos: conversa comum, perguntas, negação e futuro incerto NÃO executam nada', () => {
  const neutras = [
    'oi jojo', 'tudo bem?', 'hoje o dia foi longo', 'trabalhei muito ontem', 'meu chefe é chato', 'vou para a academia',
    'vou estudar para a prova', 'o jogo do flamengo foi bom', 'assisti um filme', 'minha tela quebrou', 'o canto da sala é bonito',
    'você tem modo trabalho?', 'como funciona seu modo trabalho?', 'como funciona o tamanho?', 'você sabe jogar?',
    'não ativa o modo trabalho', 'talvez eu trabalhe amanhã', 'não quero trabalhar agora', 'não fica menor', 'amanhã eu jogo',
    'o joão chegou', 'eu sou bonita?', 'quero comer', 'qual a capital da França?', 'que horas são?', 'tá frio hoje',
    'meu namorado mora longe', 'li um artigo sobre DLS', 'fiz exercício hoje', 'a música tá boa', 'por que você ficou menor?',
    'como o músculo cresce?', 'o prazo ficou menor', 'meu chefe aumenta o número de tarefas', 'minha filha é pequenininha', 'aumenta o volume da música',
  ];
  const disparou = neutras.filter((f) => interpretar(f).acoes.length).map((f) => `${f} → ${JSON.stringify(ids(interpretar(f)))}`);
  assert.deepEqual(disparou, []);
  assert.equal(interpretar('você tem Modo Trabalho?').explicar, 'trabalho');
  assert.equal(interpretar('Por que você ficou menor?').explicar, 'estadoTamanho');
});

test('compostas, contexto, ambiguidade e correções', () => {
  assert.deepEqual(ids(interpretar('Fica menor e vai pro canto.')), ['tamanho', 'posicao']);
  const multi = interpretar('Jojo, fica quietinho, diminui seu tamanho e me ajuda a entender essa ANOVA.');
  assert.deepEqual(ids(multi), ['silencio_ligar', 'tamanho']);
  assert.match(multi.resto, /anova/);
  const grande = interpretar('Jojo, vou trabalhar agora. Fica pequenininho naquele canto, não me atrapalha e depois me ajuda com o programa do João.');
  assert.deepEqual(ids(grande), ['trabalho_iniciar', 'tamanho', 'posicao']);
  assert.match(grande.futuro, /programa do joao/);
  const u = { acao: 'tamanho', params: { valor: 'menor' } };
  assert.deepEqual(ids(interpretar('mais um pouco', { ultima: u })), ['tamanho']);
  assert.deepEqual(ids(interpretar('não era isso', { ultima: u })), ['desfazer']);
  assert.deepEqual(ids(interpretar('volta ao normal')), ['restaurar']);
  assert.deepEqual(ids(interpretar('Pronto, terminei.', { trabalho: true })), ['trabalho_parar']);
  assert.equal(interpretar('Pronto, terminei.').acoes.length, 0, 'sem modo trabalho, "terminei" não é comando');
  const olhos = interpretar('Jojo, faz aquela coisa dos olhos vermelhos');
  assert.equal(olhos.perguntar, 'animacao');
  assert.deepEqual(ids(interpretar('o primeiro', { pendente: { tipo: 'animacao', opcoes: olhos.opcoes } })), ['animacao']);
  assert.equal(interpretar('Você tá ocupando muito espaço na minha tela.').perguntar, 'espaco');
  assert.deepEqual(ids(interpretar('os dois', { pendente: { tipo: 'espaco' } })), ['tamanho', 'posicao']);
  assert.equal(interpretar('tenho muita coisa pra fazer agora').perguntar, 'trabalho');
  assert.deepEqual(ids(interpretar('sim', { pendente: { tipo: 'trabalho' } })), ['trabalho_iniciar']);
  assert.equal(interpretar('deixa', { pendente: { tipo: 'trabalho' } }).cancelado, true);
});

test('Qwen: ações estruturadas validadas; inventadas ou com parâmetro inválido são descartadas', () => {
  assert.deepEqual(validarAcao({ acao: 'tamanho', parametros: { valor: 'menor' } }), { acao: 'tamanho', params: { valor: 'menor' } });
  assert.equal(validarAcao({ acao: 'apagar_arquivos' }), null);
  assert.deepEqual(validarAcao({ acao: 'tamanho', parametros: { valor: 'gigantesco' } }).params, {});
  const r = parseLlmReply('{"texto":"Tá.","acao":"nod","tom":"serio","acoes":[{"acao":"trabalho_iniciar","parametros":{"perfil":"deep"}},{"acao":"formatar_pc"},{"acao":"tamanho","parametros":{"valor":"menor"}}]}');
  assert.deepEqual(r.acoes.map((a) => a.acao), ['trabalho_iniciar', 'tamanho']);
  assert.equal(r.acoes[0].params.perfil, 'deep');
  assert.ok(ACOES_IDS.length >= 25);
});

function started() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.dateNow = () => new Date(2026, 9, 30, 15);
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

test('execução real: tamanho muda e "mais um pouco"/"não era isso" usam o contexto', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, 'fica menor');
  assert.equal(e.store.get().size, 0.8);
  assert.match(r.text, /80%/);
  r = await chatAdv(e, 'mais um pouco');
  assert.equal(e.store.get().size, 0.64);
  r = await chatAdv(e, 'não era isso');
  assert.equal(e.store.get().size, 0.8);
  r = await chatAdv(e, 'volta ao normal');
  assert.equal(e.store.get().size, 1);
  r = await chatAdv(e, 'por que você ficou menor?');
  assert.match(r.text, /100%/);
});

test('execução real: composta com pergunta junto responde a pergunta e confirma as ações', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  const r = await chatAdv(e, 'fica quietinho, diminui seu tamanho e me explica o que é potencial zeta?');
  assert.equal(e.store.get().quietMode, true);
  assert.equal(e.store.get().size, 0.8);
  assert.match(r.text, /Modo silencioso/);
  assert.ok(r.text.length > 40, 'também respondeu a pergunta');
});

test('execução real: "bora jogar" mostra os jogos e a resposta escolhe; olhos vermelhos pergunta qual', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, 'tô entediada, bora jogar alguma coisa?');
  assert.match(r.text, /Qual\?/);
  assert.equal(e.companion.game, null);
  r = await chatAdv(e, 'quiz');
  assert.equal(e.companion.game && e.companion.game.tipo, 'quiz');
  await chatAdv(e, 'sair');
  r = await chatAdv(e, 'faz aquela coisa dos olhos vermelhos');
  assert.match(r.text, /Sharingan.*ou.*berserker/i);
  r = await chatAdv(e, 'o primeiro');
  assert.match(e.companion.behavior.anim, /^cat_pk_sharingan/);
  r = await chatAdv(e, 'lembra daquele assunto de ontem sobre DLS?');
  assert.match(r.text, /Não tenho registro/);
});
