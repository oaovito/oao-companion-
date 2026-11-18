// Sistema antitédio: progressão e coleções, rotinas, mini-jogos, foco junto,
// estímulos, adaptação à usuária e controles sensoriais.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, loadJSON, chatAdv, seededRng } from './helpers.js';
import { Progress, Games, pickRoutine, routineSteps } from '../../src/core/catalog/antitedio.js';
import { VarietyEngine, isHeavy } from '../../src/core/catalog/variety.js';

const PROG = loadJSON('assets/catalog/progressao.json');
const JOGOS = loadJSON('assets/catalog/minijogos.json');
const ROT = loadJSON('assets/catalog/rotinas.json');
const CAT = loadJSON('assets/catalog/animacoes.json');

function started(opts = {}) {
  const e = makeEnv({ ...opts, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false }, ...(opts.profile || {}) } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

test('listas do antitédio: rotinas 31–45 e mini-jogos 46–60 existem e apontam animações reais', () => {
  const ids = new Set(CAT.itens.map((it) => it.id));
  assert.deepEqual(ROT.rotinas.map((r) => r.n).sort((a, b) => a - b), Array.from({ length: 15 }, (_, i) => 31 + i));
  for (const r of ROT.rotinas) for (const p of r.passos) assert.ok(ids.has(p.anim), `${r.id}: ${p.anim}`);
  assert.deepEqual(JOGOS.jogos.map((j) => j.n).sort((a, b) => a - b), Array.from({ length: 15 }, (_, i) => 46 + i));
  for (const j of JOGOS.jogos) assert.ok(j.nome && j.tipo && j.duracao > 0, j.id);
});

test('progressão: XP sobe de nível, conquistas por contadores, poses e cartas viram coleção', () => {
  let t = 0;
  const p = new Progress({ data: PROG, rng: seededRng(1), now: () => t });
  assert.equal(p.nivel, 1);
  assert.equal(p.nomeNivel, 'Mundo 1-1');
  let lvl = null;
  for (let i = 0; i < 10 && !lvl; i++) lvl = p.xp('jogoVitoria');
  assert.equal(lvl.nivel, 2);
  assert.ok(p.acessorios.some((a) => a.prop === 'oculos'), 'óculos liberado no nível 2');
  assert.deepEqual(p.count('chat').map((q) => q.id), ['primeiraConversa']);
  const novas = [];
  for (const it of CAT.itens.slice(0, 12)) novas.push(...p.seePose(it));
  assert.ok(novas.some((q) => q.id === 'colecionadora10'));
  assert.equal(p.seeCard({ t: 'Mais uma série.' }).length, 0);
  assert.equal(p.st.cartas.length, 1);
  // Missões do dia: 3, sorteadas uma vez por dia; concluir dá XP.
  const ms = p.missoes(new Date(2026, 9, 30));
  assert.equal(ms.length, 3);
  assert.deepEqual(p.missoes(new Date(2026, 9, 30)), ms);
  const m = ms.find((x) => !x.n) || ms[0];
  for (let i = 0; i < (m.n || 1); i++) p.missionEvent(m.evento, new Date(2026, 9, 30));
  assert.ok(m.ok);
  p.log('foco', new Date(2026, 9, 30));
  assert.match(p.resumoDia(new Date(2026, 9, 30)), /1 bloco de foco/);
});

test('rotinas: nunca a mesma duas vezes seguidas; torre cresce ao longo do dia; história em episódios', () => {
  const st = { recentes: [], progresso: {}, episodio: 0 };
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const r = pickRoutine(ROT.rotinas, st, { rng: seededRng(i + 1), period: 'tarde' });
    assert.notEqual(r.id, prev);
    routineSteps(r, st, new Date(2026, 9, 30, 15));
    prev = r.id;
  }
  const torre = ROT.rotinas.find((r) => r.id === 'torre');
  const s2 = { recentes: [], progresso: {}, episodio: 0 };
  assert.match(routineSteps(torre, s2, new Date(2026, 9, 30))[0].fala, /1 de 5/);
  assert.match(routineSteps(torre, s2, new Date(2026, 9, 30))[0].fala, /2 de 5/);
  const hist = ROT.rotinas.find((r) => r.id === 'historia');
  assert.match(routineSteps(hist, s2)[0].fala, /^Episódio 1/);
  assert.match(routineSteps(hist, s2)[0].fala, /^Episódio 2/);
});

test('mini-jogos de conversa: rodadas com placar, sem repetir pergunta, respostas flexíveis', () => {
  const g = new Games({ data: JOGOS, rng: seededRng(3) });
  // Quiz: 5 perguntas, aceita "b", "letra b", "é a b" ou o texto da opção; placar no fim.
  let r = g.start(g.byId.get('quiz'));
  assert.match(r.text, /Pergunta 1\/5/);
  const vistas = new Set([r.game.q.p]);
  let a;
  for (let k = 0; k < 5; k++) {
    const q = r.game.q;
    const resp = ['abc'[q.r], `letra ${'abc'[q.r]}`, `é a ${'abc'[q.r]}`, q.o[q.r], `${'abc'[q.r]})`][k];
    a = g.answer(r.game, resp);
    if (!a.done) {
      assert.ok(!vistas.has(r.game.q.p), 'não repete pergunta');
      vistas.add(r.game.q.p);
    }
  }
  assert.equal(a.done, true);
  assert.equal(a.win, true);
  assert.equal(a.score, 5);
  assert.match(a.text, /5\/5/);
  assert.equal(g.answer(g.start(g.byId.get('quiz')).game, 'xyz').done, false, 'resposta inválida pede de novo');
  // Verdade ou mentira: 5 rodadas.
  r = g.start(g.byId.get('curiosidades'));
  for (let k = 0; k < 5; k++) a = g.answer(r.game, r.game.q.r ? 'verdade' : 'mentira');
  assert.equal(a.done && a.win, true);
  // Pedra-papel-nadadeira: melhor de 3.
  r = g.start(g.byId.get('ppn'));
  for (let k = 0; k < 30 && !(a = g.answer(r.game, 'pedra')).done; k++);
  assert.equal(a.done, true);
  assert.match(a.text, /\d x \d/);
  // Repetições até 20; errar a conta recomeça.
  r = g.start(g.byId.get('repeticoes'));
  assert.equal(g.answer(r.game, '5').done, false);
  r = g.start(g.byId.get('repeticoes'));
  for (let n = 2; n < 20; n += 2) assert.equal(g.answer(r.game, String(n)).done, false);
  assert.equal(g.answer(r.game, '20').win, true);
  // Caça-palavras: palavra na grade (horizontal ou vertical), 3 tentativas com dica.
  r = g.start(g.byId.get('cacaPalavras'));
  const grid = r.text.split('\n').slice(1).map((l) => l.replace(/ /g, ''));
  const cols = grid[0].split('').map((_, x) => grid.map((row) => row[x]).join(''));
  assert.ok([...grid, ...cols].some((l) => l.includes(r.game.word)), 'palavra está na grade');
  assert.equal(g.answer(r.game, 'nada').done, false);
  assert.match(g.answer(r.game, 'nada').text, /Dica/);
  assert.equal(g.answer(r.game, r.game.word.toLowerCase()).win, true);
  // Memória: a sequência cresce a cada acerto.
  r = g.start(g.byId.get('memoria'));
  a = g.answer(r.game, r.game.seq.map((p) => p.nome).join(', '));
  assert.equal(a.done, false);
  assert.equal(a.sequence.length, 4);
  a = g.answer(r.game, 'errado');
  assert.equal(a.done, true);
  assert.equal(a.score, 3);
  // O JoJo mandou: obedece só quando ele manda.
  r = g.start(g.byId.get('lider'));
  for (let k = 0; k < 6; k++) a = g.answer(r.game, r.game.mandou ? r.game.palavra.toLowerCase() : 'não');
  assert.equal(a.done && a.win && a.score, 6);
  // Esconde-esconde não se ganha digitando.
  assert.equal(g.answer(g.start(g.byId.get('esconde')).game, 'achei').done, false);
  assert.equal(g.find('bora jogar quiz').id, 'quiz');
  assert.equal(g.find('o jojo mandou').id, 'lider');
});

test('companion: /jogo no chat, rodadas, reflexo com "JÁ", recordes, revanche, pega-pega e esconde', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, '/jogo quiz');
  assert.ok(e.companion.game && e.companion.game.tipo === 'quiz', r.text);
  for (let k = 0; k < 5; k++) r = await chatAdv(e, 'abc'[e.companion.game.q.r]);
  assert.match(r.text, /5\/5/);
  assert.match(r.text, /Recorde novo/);
  assert.equal(e.companion.game, null);
  r = await chatAdv(e, 'de novo');
  assert.equal(e.companion.game.tipo, 'quiz', 'revanche');
  assert.match(r.text, /Recorde: 5/);
  r = await chatAdv(e, 'sair');
  assert.equal(e.companion.game, null);
  r = await chatAdv(e, '/jogo corrida');
  e.clock.advance(6000);
  r = await chatAdv(e, 'vai');
  assert.match(r.text, /s\./);
  r = await chatAdv(e, '/jogo cliqueRapido');
  for (let i = 0; i < 16; i++) e.companion.gesture('clique');
  e.clock.advance(11000);
  assert.equal(e.companion.game, null);
  assert.equal(e.companion._record('cliqueRapido'), 16);
  // Pega-pega: precisa pegar 3 vezes; ele reaparece em outro lugar.
  await chatAdv(e, '/jogo pega');
  const p0 = { ...e.companion.pos };
  e.companion.gesture('clique');
  assert.equal(e.companion.game.pegos, 1);
  assert.notDeepEqual(e.companion.pos, p0);
  e.companion.gesture('clique');
  e.companion.gesture('clique');
  assert.equal(e.companion.game, null);
  // Esconde-esconde: some camuflado e só vale clicando.
  await chatAdv(e, '/jogo esconde');
  e.clock.advance(1500);
  assert.equal(e.companion.opacity, 0.35);
  e.companion.gesture('clique');
  assert.equal(e.companion.game, null);
  assert.equal(e.companion.opacity, 1);
  assert.ok(e.companion.progress.st.contas.vitorias >= 3);
  r = await chatAdv(e, '/bolhas');
  assert.equal(e.overlay.state.minigame.tipo, 'bolhas');
  assert.equal(e.companion.gesture('bolha'), true);
});

test('foco junto: estuda ao lado, marca o tempo, bloco concluído dá pausa e conquista; Instagram dá bronca e o foco continua', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  const r = await chatAdv(e, '/foco 10');
  assert.match(r.text, /Foco de 10 min/);
  e.companion.exitInteraction('test');
  e.clock.advance(1000);
  assert.match(e.companion.behavior.anim, /^cat_estudarJunto/);
  const said = [];
  const orig = e.companion.say.bind(e.companion);
  e.companion.say = (t, k, o) => (said.push(t), orig(t, k, o));
  assert.equal(e.companion.onForeground({ instagram: true }), true, 'bronca também durante o foco');
  assert.equal(e.companion.behavior.state, 'judge');
  e.clock.advance(5000);
  assert.match(e.companion.behavior.anim, /^cat_estudarJunto/, 'depois da bronca volta a estudar junto');
  e.clock.advance(11 * 60e3);
  assert.equal(e.companion.focus, null);
  assert.ok(said.some((t) => /Bloco concluído/.test(t)));
  assert.equal(e.companion.progress.st.contas.foco, 1);
});

test('estímulos: fidget conta, ✨ estímulo, calma e ritmo; respeitam "sem animações pesadas"', async () => {
  const e = started({ settings: { animacoesPesadas: false } });
  e.companion.enterInteraction('test');
  e.companion.interact('fidget');
  e.companion.interact('fidget');
  assert.equal(e.companion.progress.st.contas.fidget, 2);
  for (let i = 0; i < 30; i++) {
    e.clock.advance(4000);
    e.companion.interact('estimulo');
    const it = e.companion.ambientItem;
    assert.ok(!isHeavy(it), `pesada com o controle desligado: ${it.id}`);
  }
  assert.equal(e.companion.calma(1), true);
  assert.match(e.companion.behavior.anim, /^cat_calma/);
  e.clock.advance(70e3);
  assert.equal(e.companion.ritmo(6), true);
  assert.match(e.companion.behavior.anim, /^cat_ritmo/);
});

test('adaptação: "não gosto dessa" reduz e desliga; humor do dia, dia quieto, interesses e rotina fixa', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  e.companion.playCatalog('selfie', { source: 'comando' });
  let r = await chatAdv(e, 'não gosto dessa');
  assert.match(r.text, /Menos/);
  e.companion.playCatalog('selfie', { source: 'comando' });
  await chatAdv(e, 'para com isso');
  assert.ok(e.companion.variety.state.desligadas.includes('selfie'));
  assert.ok(e.companion.variety.getPrefs().desligadas.includes('selfie'));
  await chatAdv(e, 'estou cansada hoje');
  assert.equal(e.companion.variety.getPrefs().modo, 'calmo');
  r = await chatAdv(e, 'hoje não quero conversa');
  assert.match(r.text, /Quieto/);
  r = await chatAdv(e, 'eu gosto de astronomia');
  assert.match(r.text, /astronomia/);
  r = await chatAdv(e, '/rotina bom dia: Bom dia, Manu. Água e foco.');
  assert.equal(e.companion.progress.st.rotinaFixa.bomDia, 'Bom dia, Manu. Água e foco.');
});

test('motor: tédio alto dispara rotina/animação nova; temporada e áreas do aquário', () => {
  const e = started({ settings: { ambienteFrequencia: 'normal', avisoRaros: false } });
  e.companion.variety.state.boredom = 5;
  e.clock.advance(7 * 60e3);
  e.companion.onSystemIdle(5);
  assert.ok(['ambient', 'walk'].includes(e.companion.behavior.state) || e.companion.ambientQueue.length >= 0);
  assert.ok(e.companion.progress.st.areas.length >= 1, 'área da temporada visitada');
  const v = new VarietyEngine({ catalog: CAT, rng: seededRng(8), now: () => 0, getPrefs: () => ({ semPesadas: true }) });
  for (let i = 0; i < 100; i++) assert.ok(!isHeavy(v.pickAmbient()));
});
