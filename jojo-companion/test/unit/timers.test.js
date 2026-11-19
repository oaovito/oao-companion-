// Timers interativos (0.47.5): gerenciador central (relógio monotônico, persistência,
// suspensão, vários timers, anti-duplicado de XP), pedidos em linguagem natural,
// animações com o relógio na mão e regras do Modo Trabalho/foco/tela cheia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, loadJSON, chatAdv } from './helpers.js';
import {
  GerenciadorTimers, ATIVIDADES, ATIVIDADE_IDS, TIMER_LIMITES, parseTimerRequest, parseTimerCommand,
  respostaConfirmacao, sanitizeAtividades, sanitizeOffset, formatarTempo, aparenciaDoTimer, APARENCIAS,
} from '../../src/core/timers.js';
import { ANIMS_TIMER, itensTimers, rigComTimers, alvoDoRelogio, pontoDaMao, animsDaFase, ESPACO_ANIM_TIMER } from '../../src/core/timer-anims.js';
import { expandCatalog, buildAnimation } from '../../src/core/catalog/recipes.js';
import { fullCatalog } from '../../src/core/catalog/load.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { sanitize } from '../../src/core/settings-schema.js';
import { TodoModel } from '../../src/core/todo.js';
import { TodoChat } from '../../src/core/todo-chat.js';

const MIN = 60e3;

/** Gerenciador com relógios controlados (mono e parede andam juntos, salvo quando o teste separa). */
function gerenciador({ salvo = null, cfg = {}, inicio = Date.UTC(2026, 10, 19, 15) } = {}) {
  const r = { mono: 0, wall: inicio, salvo, eventos: [] };
  r.g = new GerenciadorTimers({
    mono: () => r.mono, wall: () => r.wall,
    load: () => r.salvo, save: (st) => { r.salvo = st; },
    getConfig: () => cfg, onEvento: (e) => r.eventos.push(e),
  });
  r.andar = (ms) => { r.mono += ms; r.wall += ms; return r.g.tick(); };
  r.tipos = () => r.eventos.map((e) => e.tipo);
  return r;
}

test('1–3. iniciar, pausar, continuar, reiniciar e cancelar com contagem exata', () => {
  const r = gerenciador();
  const { timer: t } = r.g.iniciar({ atividade: 'personalizado', duracaoMs: 10 * MIN });
  r.andar(2 * MIN);
  assert.equal(r.g.situacao(t).restanteMs, 8 * MIN);
  r.g.pausar();
  r.andar(5 * MIN); // pausado não conta
  assert.equal(r.g.situacao(t).restanteMs, 8 * MIN);
  assert.equal(t.estado, 'pausado');
  r.g.continuar();
  r.andar(MIN);
  assert.equal(r.g.situacao(t).restanteMs, 7 * MIN);
  r.g.reiniciar();
  assert.equal(r.g.situacao(t).restanteMs, 10 * MIN);
  r.g.cancelar();
  assert.equal(r.g.timers.length, 0);
  assert.deepEqual(r.tipos(), ['inicio', 'pausa', 'retomada', 'inicio', 'cancelado']);
  // Pausa antes de 30%: marcada como "cedo" (fala de resistência).
  assert.equal(r.eventos[1].cedo, true);
});

test('4. marcos disparam uma vez só e o fim chega no tempo certo', () => {
  const r = gerenciador();
  r.g.iniciar({ atividade: 'personalizado', duracaoMs: 10 * MIN });
  for (let i = 0; i < 600; i++) r.andar(1000);
  const tipos = r.tipos();
  for (const k of ['metade', 'final', 'ultimos', 'fim']) assert.equal(tipos.filter((x) => x === k).length, 1, k);
  assert.ok(tipos.indexOf('metade') < tipos.indexOf('final') && tipos.indexOf('ultimos') < tipos.indexOf('fim'));
  const fim = r.eventos.find((e) => e.tipo === 'fim');
  assert.equal(fim.ms, 10 * MIN);
  assert.equal(r.g.st.stats.sessoes, 1);
  // O próximo tick nunca vem em loop apertado: entre 250 ms e 60 s.
  r.g.iniciar({ atividade: 'personalizado', duracaoMs: 30 * MIN });
  const p = r.g.proximoEventoMs();
  assert.ok(p >= 250 && p <= 60e3);
});

test('5. precisão: conta pelo relógio monotônico, não pelo de parede (relógio do Windows ajustado)', () => {
  const r = gerenciador();
  const { timer: t } = r.g.iniciar({ atividade: 'personalizado', duracaoMs: 10 * MIN });
  r.wall -= 3600e3; // horário de verão / ajuste manual
  r.andar(MIN);
  assert.equal(r.g.situacao(t).restanteMs, 9 * MIN);
});

test('6. cronômetro progressivo, intervalado (séries) e recorrente', () => {
  const r = gerenciador();
  const { timer: p } = r.g.iniciar({ atividade: 'trabalho', tipo: 'progressivo', metaMs: 2 * MIN });
  r.andar(2 * MIN);
  assert.equal(r.g.situacao(p).decorridoMs, 2 * MIN);
  assert.ok(r.tipos().includes('meta'));
  r.g.cancelar(p.id);
  const { timer: s } = r.g.iniciar({ atividade: 'exercicios', tipo: 'intervalado', fases: [{ nome: 'Série', ms: 45e3 }, { nome: 'Descanso', ms: 90e3 }], ciclos: 3 });
  r.andar(50e3);
  assert.equal(r.g.situacao(s).fase, 'Descanso');
  for (let i = 0; i < 3 * 135; i++) r.andar(1000);
  assert.equal(r.tipos().filter((x) => x === 'fase').length, 5);
  assert.equal(r.tipos().at(-1), 'fim');
  const { timer: c } = r.g.iniciar({ atividade: 'hidratacao', tipo: 'recorrente', duracaoMs: MIN, forcar: true });
  r.andar(MIN + 10); r.andar(MIN);
  assert.equal(r.eventos.filter((e) => e.tipo === 'rodada').length, 2);
  assert.equal(r.g.get(c.id).estado, 'rodando', 'recorrente continua');
});

test('7. vários timers: limite configurável e só um destacado', () => {
  const r = gerenciador({ cfg: { timersMax: 2 } });
  const a = r.g.iniciar({ atividade: 'personalizado', duracaoMs: 5 * MIN }).timer;
  const b = r.g.iniciar({ atividade: 'alimentacao', duracaoMs: 20 * MIN }).timer;
  assert.equal(r.g.iniciar({ atividade: 'personalizado', duracaoMs: MIN }).erro, 'limite');
  assert.equal(r.g.destacado.id, b.id);
  r.g.destacar(a.id);
  assert.equal(r.g.destacado.id, a.id);
  r.andar(5 * MIN);
  assert.equal(r.g.destacado.id, b.id, 'o que acabou sai e o outro assume');
});

test('8. persistência: reabre sem duplicar; regressivo continua, progressivo pausa, relógio estranho pausa', () => {
  const r = gerenciador();
  const reg = r.g.iniciar({ atividade: 'personalizado', duracaoMs: 30 * MIN }).timer;
  r.g.iniciar({ atividade: 'trabalho', tipo: 'progressivo' });
  r.andar(5 * MIN);
  r.g.checkpoint();
  // Estado salvo com o mesmo timer duas vezes (proteção contra duplicados).
  const salvo = structuredClone(r.salvo);
  salvo.timers.push(structuredClone(salvo.timers[0]));
  const r2 = gerenciador({ salvo, inicio: r.wall + 10 * MIN });
  assert.deepEqual(r2.g.restaurar(), []);
  assert.deepEqual(r2.g.restaurar(), [], 'restaura uma vez só');
  assert.equal(r2.g.timers.length, 2);
  const t = r2.g.get(reg.id);
  assert.equal(r2.g.situacao(t).restanteMs, 15 * MIN, 'contou o tempo fechado');
  assert.equal(r2.g.timers.find((x) => x.tipo === 'progressivo').estado, 'pausado');
  // Acabou enquanto fechado: um aviso só, fechado = sem XP.
  const r3 = gerenciador({ salvo: structuredClone(r.salvo), inicio: r.wall + 2 * 3600e3 });
  const avisos = r3.g.restaurar();
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].fechado, true);
  assert.equal(r3.g.elegivelXp(avisos[0]), false);
  // Relógio do Windows voltou no tempo: pausa em vez de inventar tempo.
  const r4 = gerenciador({ salvo: structuredClone(r.salvo), inicio: r.wall - 3600e3 });
  r4.g.restaurar();
  assert.equal(r4.g.get(reg.id).pausadoPor, 'relogio');
});

test('9. suspensão: regressivo soma o tempo dormindo, progressivo pausa e volta, sem XP', () => {
  const r = gerenciador();
  const reg = r.g.iniciar({ atividade: 'personalizado', duracaoMs: 20 * MIN }).timer;
  const pro = r.g.iniciar({ atividade: 'trabalho', tipo: 'progressivo' }).timer;
  r.andar(5 * MIN);
  r.g.suspender();
  assert.equal(r.g.get(pro.id).estado, 'pausado');
  r.wall += 30 * MIN; // dormindo: o monotônico não andou
  const fins = r.g.retomarSistema();
  assert.equal(fins.length, 1);
  assert.equal(fins[0].timer.id, reg.id);
  assert.equal(fins[0].suspenso, true);
  assert.equal(r.g.elegivelXp(fins[0]), false);
  assert.equal(r.g.get(pro.id).estado, 'rodando');
  assert.equal(r.g.situacao(r.g.get(pro.id)).decorridoMs, 5 * MIN, 'não contou o sono');
});

test('10. XP: só sessão de verdade (5+ min, ao vivo, teto diário); recorrente e espelho nunca', () => {
  const r = gerenciador();
  const ev = (ms, extra = {}) => ({ timer: { atividade: 'trabalho', tipo: 'regressivo' }, ms, aoVivoMs: ms, fechado: false, suspenso: false, ...extra });
  assert.equal(r.g.elegivelXp(ev(4 * MIN)), false);
  assert.equal(r.g.elegivelXp(ev(25 * MIN)), true);
  assert.equal(r.g.elegivelXp(ev(25 * MIN, { aoVivoMs: 10 * MIN })), false);
  assert.equal(r.g.elegivelXp(ev(25 * MIN, { timer: { atividade: 'trabalho', tipo: 'recorrente' } })), false);
  assert.equal(r.g.elegivelXp(ev(25 * MIN, { timer: { atividade: 'jogos', tipo: 'regressivo' } })), false, 'jogos não rende XP');
  for (let i = 0; i < TIMER_LIMITES.xpPorDia; i++) r.g.contarXp();
  assert.equal(r.g.elegivelXp(ev(25 * MIN)), false, 'teto do dia');
  assert.equal(GerenciadorTimers.xpDaSessao(5 * MIN), 3);
  assert.equal(GerenciadorTimers.xpDaSessao(30 * MIN), 7);
  assert.equal(GerenciadorTimers.xpDaSessao(300 * MIN), 9);
});

test('11. pedidos em linguagem natural e /timer', () => {
  assert.deepEqual(
    (({ acao, atividade, min }) => ({ acao, atividade, min }))(parseTimerRequest('JoJo, timer de 10 minutos')),
    { acao: 'iniciar', atividade: 'personalizado', min: 10 },
  );
  assert.equal(parseTimerRequest('timer de 25 min pra estudar').atividade, 'estudo');
  assert.equal(parseTimerRequest('cronometra a tarefa relatório').atividade, 'tarefa');
  assert.equal(parseTimerRequest('cronometra a tarefa relatório').tarefa, 'relatório');
  const s = parseTimerRequest('descanso entre séries de 90 segundos 4 séries');
  assert.equal(s.atividade, 'exercicios');
  assert.equal(s.min, 1.5);
  assert.equal(s.series, 4);
  assert.equal(parseTimerRequest('me avisa em 15 minutos').min, 15);
  assert.equal(parseTimerRequest('pausa o timer').acao, 'pausar');
  assert.equal(parseTimerRequest('quanto falta').acao, 'status');
  assert.equal(parseTimerRequest('esconde o relógio').acao, 'esconder');
  assert.equal(parseTimerRequest('que dia é hoje?'), null);
  assert.equal(parseTimerRequest('vou estudar agora'), null, 'sem pedir timer, não liga nada');
  assert.equal(parseTimerCommand('').acao, 'lista');
  assert.equal(parseTimerCommand('10').min, 10);
  assert.equal(parseTimerCommand('pausar').acao, 'pausar');
  assert.equal(respostaConfirmacao('fiz'), true);
  assert.equal(respostaConfirmacao('não fiz'), false);
  assert.equal(formatarTempo(65e3), '1:05');
});

test('12. 12 atividades e configurações que persistem saneadas', () => {
  assert.equal(ATIVIDADE_IDS.length, 12);
  for (const k of ['estudo', 'trabalho', 'meditacao', 'exercicios', 'alongamento', 'alimentacao', 'hidratacao', 'jogos', 'descanso', 'tarefa', 'habito', 'personalizado']) assert.ok(ATIVIDADES[k], k);
  const a = sanitizeAtividades({ estudo: { duracaoMin: 9999, ativo: 'x' }, invasor: { ativo: true } });
  assert.equal(a.estudo.duracaoMin, TIMER_LIMITES.duracaoMin[1]);
  assert.equal(a.invasor, undefined);
  assert.equal(a.jogos.ativo, false, 'jogos desligado por padrão');
  assert.deepEqual(sanitizeOffset({ x: 1e6, y: -9 }), { x: 600, y: -9 });
  const { settings: s } = sanitize({ timersMax: 99, timersAparencia: 'nada', timersOpacidade: 5, timersAtividades: { meditacao: { duracaoMin: 7 } } });
  assert.equal(s.timersMax, 5);
  assert.equal(s.timersAparencia, 'contextual');
  assert.ok(s.timersOpacidade <= 1);
  assert.equal(s.timersAtividades.meditacao.duracaoMin, 7);
  // Aparência: contextual pela atividade, discreta no Trabalho/foco, só as liberadas.
  assert.equal(aparenciaDoTimer({ atividade: 'exercicios' }, { liberadas: Object.keys(APARENCIAS), discreto: true }), 'minimalista');
});

test('13. animações: 48 com início/durante/final/fim, relógio na mão e volta ao normal', () => {
  const ANIMS = expandCatalog(loadJSON('assets/animations/jojo.animations.json'), fullCatalog(loadJSON));
  const base = loadJSON('assets/character/jojo.rig.json');
  const rig = rigComTimers(base);
  assert.notEqual(rig, base, 'cópia; o rig original não muda');
  assert.ok(!base.groups.some((g) => g.id === 'tm_lupa') && rig.groups.some((g) => g.id === 'tm_lupa'));
  assert.equal(ANIMS_TIMER.length, 48);
  assert.deepEqual(['inicio', 'durante', 'final', 'fim'].map((f) => animsDaFase(f, { comRaras: true }).length), [10, 15, 10, 10]);
  assert.ok(animsDaFase('durante', { semSono: true }).every((a) => !a.sono));
  const room = loadJSON('assets/animations/jojo.room.json');
  for (const it of itensTimers()) {
    assert.ok(ANIMS.animations[`cat_${it.id}`], it.id);
    assert.ok(room.anims[`cat_${it.id}`] && room.animsVisual[`cat_${it.id}`], `${it.id}: espaço medido`);
    const a = buildAnimation(it);
    assert.ok(Object.keys(a.tracks).some((c) => c.startsWith('tm')), `${it.id}: mexe no relógio`);
    const an = new Animator(ANIMS);
    an.play(`cat_${it.id}`, 0, { restart: true });
    let segurando = 0;
    for (let ms = 0; ms <= it.duracao; ms += 100) {
      const p = an.sample(ms).pose;
      if ((p.tmMix ?? 0) < 0.5) continue;
      // Na mão: o relógio fica preso a ela (deslocamento fixo), então acompanha o gesto.
      if (Math.round(p.tmMao || 0) === 1) {
        segurando++;
        const [mx, my] = pontoDaMao(p, 'R');
        const [ax, ay] = alvoDoRelogio(p);
        assert.ok(Math.abs(ax - mx - (p.tmX || 0)) < 1e-6 && Math.abs(ay - my - (p.tmY || 0)) < 1e-6, `${it.id}: preso à mão`);
      }
      // Dentro do espaço medido da janela (sem sair cortado).
      const [x, y] = alvoDoRelogio(p);
      assert.ok(x > -ESPACO_ANIM_TIMER.l - 30 && x < 180 + ESPACO_ANIM_TIMER.r + 30 && y > -ESPACO_ANIM_TIMER.t - 30 && y < 170 + ESPACO_ANIM_TIMER.b + 30, `${it.id}: relógio em ${Math.round(x)},${Math.round(y)}`);
    }
    const fim = an.sample(it.duracao + 500).pose; // depois do último degrau de quadro
    assert.ok((fim.tmMix ?? 0) < 0.05, `${it.id}: relógio volta ao lugar`);
  }
});

function iniciado(settings = {}) {
  const e = makeEnv({ settings: { speechFrequency: 'off', ...settings }, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  const base = Date.now();
  e.companion.timerWall = () => base + e.clock.now();
  e.companion.start();
  e.clock.advance(3000);
  return e;
}

test('companion: pedido na conversa, relógio no layout e fim com XP uma vez só', async () => {
  const e = iniciado();
  const c = e.companion;
  try {
    const r = await chatAdv(e, 'timer de 10 minutos');
    assert.ok(r, 'respondeu');
    assert.equal(c.timers.timers.length, 1);
    c._applyLayout(true);
    assert.ok(e.overlay.state.relogio, 'relógio desenhado');
    assert.equal(e.overlay.state.relogio.modo, 'desce');
    const xp0 = c.progress.st.xp;
    e.clock.advance(10 * MIN + 2000);
    assert.equal(c.timers.timers.length, 0);
    assert.ok(c.progress.st.xp > xp0, 'XP pela infraestrutura existente');
    const xp1 = c.progress.st.xp;
    // Mesmo id de novo (repetição/duplicado): não paga de novo.
    const t = c.timers.st.historico.at(-1);
    c._timerRecompensa({ id: t.id, atividade: 'personalizado', tipo: 'regressivo' }, 10 * MIN);
    assert.equal(c.progress.st.xp, xp1);
  } finally { c.stop(); }
});

test('companion: Modo Trabalho e foco deixam o relógio discreto e sem provocação; tela cheia esconde tudo', async () => {
  const e = iniciado();
  const c = e.companion;
  try {
    await chatAdv(e, 'timer de 30 minutos');
    c.startWork();
    c._applyLayout(true);
    const rel = e.overlay.state.relogio;
    assert.ok(rel && rel.discreto && rel.tamanho === 'pequeno' && rel.rotulo === '');
    assert.equal(c._timerAnim('durante', c.timers.destacado), false, 'sem animação no trabalho');
    assert.equal(c._timerFalar('provocação', { provoca: true }), false);
    c.endWork();
    c.fullscreenHidden = true;
    c._applyLayout(true);
    assert.ok(!e.overlay.state?.relogio, 'tela cheia: nada');
    c.fullscreenHidden = false;
    // Foco junto vira o relógio (espelho), sem contar duas vezes.
    c.timers.cancelar();
    c.startFocus(25, 'estudo');
    assert.equal(c.timers.timers.filter((t) => t.fonte === 'foco').length, 1);
    c._timerFoco();
    assert.equal(c.timers.timers.filter((t) => t.fonte === 'foco').length, 1, 'sem duplicar');
  } finally { c.stop(); }
});

test('companion: cronômetro de tarefa encerra quando a tarefa é marcada; esconder mantém a contagem', async () => {
  const e = iniciado();
  const c = e.companion;
  try {
    const model = new TodoModel({ now: () => new Date(2026, 9, 30, 15).getTime() });
    c.todoChat = new TodoChat(model);
    const tarefa = model.add({ title: 'Relatório do mês' });
    const r = await chatAdv(e, 'cronometra a tarefa relatório');
    assert.ok(r);
    const t = c.timers.destacado;
    assert.equal(t.tipo, 'progressivo');
    assert.equal(t.tarefaId, tarefa.id, 'ligado à tarefa da lista');
    await chatAdv(e, 'esconde o relógio');
    assert.equal(c.store.get().timersVisivel, false);
    c._applyLayout(true);
    assert.ok(!e.overlay.state?.relogio);
    e.clock.advance(2 * MIN);
    assert.ok(c.timers.decorrido(t) >= 2 * MIN, 'escondido continua contando');
    await chatAdv(e, 'mostra o relógio');
    // Interação: clique pausa, só no modo de interação.
    assert.equal(c.timerInteracao({ acao: 'alternar' }), false);
    // Marcou a tarefa como feita: o cronômetro encerra contando o tempo, no histórico da tarefa.
    model.complete(tarefa.id);
    e.clock.advance(61e3);
    assert.equal(c.timers.timers.length, 0);
    const h = c.timers.st.historico.at(-1);
    assert.equal(h.tarefaId, tarefa.id);
    assert.ok(h.ms >= 2 * MIN);
  } finally { c.stop(); }
});
