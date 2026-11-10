// Hábitos de treino, estudo e sono: registro, sequência, recorde, semana e
// integração com a conversa, o comando e os blocos de foco.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv } from './helpers.js';
import { Habits, parseHabitRequest, parseHabitCommand, sanitizeHabits, HABIT_IDS } from '../../src/core/habits.js';

const HOJE = '2026-10-30'; // os testes fixam o relógio em 30/10/2026, 15h

function started() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

test('pedidos sobre hábitos: progresso, marcar, desmarcar e relatos naturais; negações e perguntas não contam', () => {
  assert.deepEqual(parseHabitRequest('meus hábitos'), { tipo: 'progresso' });
  assert.deepEqual(parseHabitRequest('como estão meus hábitos?'), { tipo: 'progresso' });
  assert.deepEqual(parseHabitRequest('quantos dias seguidos eu treinei?'), { tipo: 'progresso' });
  assert.deepEqual(parseHabitRequest('marca o treino de hoje'), { tipo: 'registrar', habito: 'treino' });
  assert.deepEqual(parseHabitRequest('desmarca o estudo de hoje'), { tipo: 'desmarcar', habito: 'estudo' });
  assert.deepEqual(parseHabitRequest('treinei hoje'), { tipo: 'registrar', habito: 'treino', natural: true });
  assert.deepEqual(parseHabitRequest('JoJo, já fui pra academia'), { tipo: 'registrar', habito: 'treino', natural: true });
  assert.deepEqual(parseHabitRequest('estudei 2 horas'), { tipo: 'registrar', habito: 'estudo', natural: true });
  assert.deepEqual(parseHabitRequest('dormi 8 horas'), { tipo: 'registrar', habito: 'sono', natural: true });
  for (const t of ['não treinei hoje', 'quase estudei', 'dormi mal', 'dormi pouco', 'treinei hoje?', 'vou treinar', 'preciso estudar', 'ainda não treinei', 'oi']) assert.equal(parseHabitRequest(t), null, t);
  assert.deepEqual(parseHabitCommand(''), { tipo: 'progresso' });
  assert.deepEqual(parseHabitCommand('treino'), { tipo: 'registrar', habito: 'treino' });
  assert.deepEqual(parseHabitCommand('sono desfazer'), { tipo: 'desmarcar', habito: 'sono' });
  assert.deepEqual(parseHabitCommand('xadrez'), { tipo: 'ajuda' });
});

test('sequência, recorde e semana: dias seguidos, furo quebra, ontem ainda mantém viva', () => {
  const saved = [];
  const h = new Habits({ save: (s) => saved.push(JSON.stringify(s)) });
  assert.equal(h.streak('treino', HOJE), 0);
  for (const d of ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-27', '2026-10-28', '2026-10-29']) h.log('treino', d);
  assert.equal(h.streak('treino', HOJE), 3, 'sem registro hoje, vale a sequência até ontem');
  assert.deepEqual(h.log('treino', HOJE), { novo: true, dias: 4 });
  assert.deepEqual(h.log('treino', HOJE), { novo: false, dias: 4 }, 'o mesmo dia não conta duas vezes');
  assert.equal(h.best('treino'), 4);
  assert.deepEqual(h.week('treino', HOJE), [false, false, false, true, true, true, true]);
  assert.equal(h.streak('treino', '2026-11-02'), 0, 'dois dias sem treinar zeram a sequência');
  assert.equal(h.unlog('treino', HOJE), true);
  assert.equal(h.unlog('treino', HOJE), false);
  assert.equal(h.streak('treino', HOJE), 3);
  assert.equal(h.log('xadrez', HOJE), null);
  assert.equal(h.log('treino', 'ontem'), null);
  assert.equal(saved.length, 9, 'cada mudança real é salva');
  // Virada de mês e de ano contam como dias seguidos.
  const v = new Habits();
  for (const d of ['2026-12-30', '2026-12-31', '2027-01-01']) v.log('sono', d);
  assert.equal(v.streak('sono', '2027-01-01'), 3);
  const linhas = h.lines(HOJE);
  assert.equal(linhas.length, 3);
  assert.match(linhas[0], /^Treino: 3 dias seguidos \(recorde 4\) · semana □□□■■■□ 3\/7$/);
  assert.match(linhas[1], /^Estudo: 0 dias seguidos \(recorde 0\)/);
  assert.deepEqual(sanitizeHabits({ treino: ['2026-10-02', 'x', '2026-10-01', '2026-10-02', 5], sono: 'nada' }), { treino: ['2026-10-01', '2026-10-02'], estudo: [], sono: [] });
  assert.deepEqual(HABIT_IDS, ['treino', 'estudo', 'sono']);
});

test('na conversa: relato natural anota sem roubar a resposta; pedidos explícitos e /habitos mostram o progresso', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, 'treinei hoje');
  assert.notEqual(r.intent, 'habitos', 'a conversa segue com a reação de sempre');
  assert.deepEqual(e.companion.habits.st.treino, [HOJE]);
  assert.deepEqual(e.companion.progress.st.habitos.treino, [HOJE], 'salvo junto do progresso');
  r = await chatAdv(e, 'não estudei hoje');
  assert.deepEqual(e.companion.habits.st.estudo, []);
  r = await chatAdv(e, 'marca o estudo de hoje');
  assert.equal(r.intent, 'habitos');
  assert.match(r.text, /estudo/);
  r = await chatAdv(e, '/habito sono');
  assert.match(r.text, /sono/);
  r = await chatAdv(e, '/habitos');
  assert.match(r.text, /Treino: 1 dia seguido \(recorde 1\).*hoje ✓/);
  assert.match(r.text, /Estudo: 1 dia seguido/);
  assert.match(r.text, /Sono: 1 dia seguido/);
  r = await chatAdv(e, '/habito treino desfazer');
  assert.deepEqual(e.companion.habits.st.treino, []);
  r = await chatAdv(e, '/habito xadrez');
  assert.match(r.text, /\/habito treino/);
});

test('bloco de foco concluído conta para o hábito do dia; foco interrompido não conta', () => {
  const e = started();
  e.companion.startFocus(10, 'treino');
  e.clock.advance(4 * 60e3);
  e.companion._endFocus(false);
  assert.deepEqual(e.companion.habits.st.treino, [], 'parar no meio não marca');
  e.companion.startFocus(10, 'treino');
  e.clock.advance(11 * 60e3);
  assert.deepEqual(e.companion.habits.st.treino, [HOJE]);
  e.companion.startFocus(10, 'estudo');
  e.clock.advance(11 * 60e3);
  assert.deepEqual(e.companion.habits.st.estudo, [HOJE]);
});

test('sem hábitos marcados, o progresso convida a começar', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  const r = await chatAdv(e, 'meus hábitos');
  assert.equal(r.intent, 'habitos');
  assert.match(r.text, /treino|estudo|sono/i);
  assert.doesNotMatch(r.text, /■|□/);
});
