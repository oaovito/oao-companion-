// Check-in de humor e energia: pergunta diária, leitura da resposta e ajuste
// do ritmo das cobranças (água, pausa e reforço da rotina).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv } from './helpers.js';
import { paceFor, paceFactor, parseCheckinAnswer, parseCheckinCommand, sanitizeCheckin } from '../../src/core/checkin.js';
import { Reminders } from '../../src/core/reminders.js';
import { Routine } from '../../src/core/routine.js';
import { Habits } from '../../src/core/habits.js';

const HOJE = '2026-10-30';
const at = (h, m = 0) => new Date(2026, 9, 30, h, m);

function started() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  e.companion.reminders.apply({ tipo: 'agua', ativo: false });
  return e;
}

test('resposta do check-in: número ou palavra curta; frase longa e negação não contam', () => {
  for (const [t, v] of [['3', 3], ['energia 2', 2], ['uns 4', 4], ['5 de 5', 5], ['exausta', 1], ['tô cansada', 2], ['sem energia', 2], ['normal', 3], ['mais ou menos', 3], ['bem', 4], ['tô bem', 4], ['animada', 5], ['muito bem', 5]]) assert.equal(parseCheckinAnswer(t), v, t);
  for (const t of ['7', '0', 'não tô cansada', 'me ajuda bem rápido com esse relatório de estágio', 'qual o treino de hoje?', 'oi', '']) assert.equal(parseCheckinAnswer(t), null, t);
  assert.deepEqual([1, 2, 3, 4, 5, null, 9].map(paceFor), ['leve', 'leve', 'normal', 'forte', 'forte', 'normal', 'normal']);
  assert.deepEqual(['leve', 'normal', 'forte'].map(paceFactor), [1.5, 1, 1]);
  assert.deepEqual(parseCheckinCommand(''), { tipo: 'perguntar' });
  assert.deepEqual(parseCheckinCommand('4'), { tipo: 'responder', energia: 4 });
  assert.deepEqual(parseCheckinCommand('cansada'), { tipo: 'responder', energia: 2 });
  assert.deepEqual(parseCheckinCommand('banana'), { tipo: 'ajuda' });
  assert.deepEqual(sanitizeCheckin({ dia: 'hoje', energia: 9, perguntado: HOJE }), { dia: null, energia: null, perguntado: HOJE });
});

test('ritmo nas cobranças: dia leve estica água e pausa; reforço da rotina só existe para estudo e treino', () => {
  let t = 1e6;
  const r = new Reminders({ now: () => t });
  r.due(at(10));
  t += 100 * 60e3;
  assert.deepEqual(r.due(at(11, 40), { fator: 1 }), [{ tipo: 'agua', min: 90 }]);
  assert.deepEqual(r.due(at(11, 40), { fator: 1.5 }), [], 'no dia leve, 100 min ainda não é hora');
  t += 40 * 60e3;
  assert.deepEqual(r.due(at(12, 20), { fator: 1.5 }), [{ tipo: 'agua', min: 90 }]);
  const habits = new Habits();
  const rot = new Routine({ habits });
  rot.apply({ tipo: 'montar', blocos: { manha: '07:00', estudo: '14:00', treino: '18:00' } }, HOJE);
  assert.deepEqual(rot.dueAgain(at(14, 40), HOJE), [], 'sem o primeiro aviso não há reforço');
  rot.markWarned('estudo', HOJE);
  rot.markWarned('manha', HOJE);
  assert.deepEqual(rot.dueAgain(at(14, 20), HOJE), [], 'antes de 30 min não reforça');
  assert.deepEqual(rot.dueAgain(at(14, 40), HOJE), [{ bloco: 'estudo', hora: '14:00' }]);
  rot.markReinforced('estudo', HOJE);
  assert.deepEqual(rot.dueAgain(at(14, 45), HOJE), [], 'um reforço só');
  assert.deepEqual(rot.dueAgain(at(7, 40), HOJE), [], 'manhã e sono não têm reforço');
});

test('pergunta automática: uma vez por dia, entre 9h e 20h, depois de 10 min aberto, nunca no foco', () => {
  const e = started();
  const said = [];
  const orig = e.companion.say.bind(e.companion);
  e.companion.say = (t, k, o) => (said.push(t), orig(t, k, o));
  assert.equal(e.companion.checkCheckin(at(15)), false, 'acabou de abrir');
  // O foco segura a verificação automática de cada minuto enquanto os 10 min passam.
  e.companion.startFocus(30, 'estudo');
  e.clock.advance(11 * 60e3);
  assert.equal(e.companion.checkCheckin(at(15)), false, 'no foco não pergunta');
  assert.ok(!said.some((t) => /1 a 5/.test(t)));
  e.companion._endFocus(false);
  assert.equal(e.companion.checkCheckin(at(8)), false, 'cedo demais');
  assert.equal(e.companion.checkCheckin(at(21)), false, 'tarde demais');
  said.length = 0;
  assert.equal(e.companion.checkCheckin(at(15)), true);
  assert.ok(said.some((t) => /1 a 5/.test(t)), said.join(' | '));
  const c = e.companion.conversations.get('checkin');
  assert.equal(c.status, 'needsInput');
  assert.equal(e.companion.checkCheckin(at(16)), false, 'uma vez por dia');
  assert.equal(e.companion.progress.st.checkin.perguntado, HOJE);
});

test('resposta na conversa: guarda a energia, define o ritmo e o humor do dia; depois de 15 min não captura mais', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, '/checkin');
  assert.match(r.text, /1 a 5/);
  r = await chatAdv(e, 'tô cansada');
  assert.equal(r.intent, 'checkin');
  assert.match(r.text, /2/);
  assert.deepEqual(e.companion.progress.st.checkin, { dia: HOJE, energia: 2, perguntado: HOJE });
  assert.equal(e.companion.paceToday(at(15)), 'leve');
  assert.deepEqual(e.companion.progress.st.humorDia, { dia: HOJE, modo: 'calmo' });
  assert.equal(e.companion.conversations.get('checkin').status, 'ready');
  assert.equal(e.companion.paceToday(new Date(2026, 9, 31, 10)), 'normal', 'no dia seguinte volta ao normal');
  r = await chatAdv(e, '/checkin 5');
  assert.equal(e.companion.paceToday(at(15)), 'forte');
  assert.deepEqual(e.companion.progress.st.humorDia, { dia: HOJE, modo: 'pilhado' });
  r = await chatAdv(e, '/checkin banana');
  assert.match(r.text, /\/checkin/);

  const f = started();
  f.companion.enterInteraction('test');
  await chatAdv(f, '/checkin');
  f.clock.advance(16 * 60e3);
  r = await chatAdv(f, '3');
  assert.notEqual(r.intent, 'checkin', 'passou da janela: "3" é conversa comum');
  assert.equal(f.companion.progress.st.checkin.energia, null);
  // Enquanto espera, uma frase comum não é confundida com a resposta.
  const g = started();
  g.companion.enterInteraction('test');
  await chatAdv(g, '/checkin');
  r = await chatAdv(g, '/notas');
  assert.equal(g.companion.progress.st.checkin.energia, null);
  r = await chatAdv(g, '4');
  assert.equal(r.intent, 'checkin');
});

test('ritmo aplicado: dia leve cobra água mais tarde; dia forte reforça o bloco não cumprido', () => {
  const e = started();
  e.companion.reminders.apply({ tipo: 'agua', ativo: true, intervaloMin: 30 });
  e.companion.setEnergy(1, at(10));
  e.companion.startFocus(120, 'estudo'); // segura a verificação automática de cada minuto
  e.clock.advance(35 * 60e3);
  e.companion._endFocus(false);
  assert.equal(e.companion.checkExtraReminders(at(15)), null, 'dia leve: 35 min ainda não é hora (30 × 1,5)');
  e.companion.setEnergy(3, at(15));
  assert.equal(e.companion.checkExtraReminders(at(15, 1)).tipo, 'agua', 'no ritmo normal já era hora');

  const f = started();
  f.companion.routine.apply({ tipo: 'montar', blocos: { treino: '18:00' } }, HOJE);
  assert.deepEqual(f.companion.checkRoutine(at(18, 0)), { bloco: 'treino', hora: '18:00' });
  assert.equal(f.companion.checkRoutine(at(18, 40)), null, 'ritmo normal: sem reforço');
  f.companion.setEnergy(5, at(18, 41));
  const said = [];
  const orig = f.companion.say.bind(f.companion);
  f.companion.say = (t, k, o) => (said.push(t), orig(t, k, o));
  const reforco = f.companion.checkRoutine(at(18, 42));
  assert.deepEqual(reforco, { bloco: 'treino', hora: '18:00', reforco: true });
  assert.ok(said.some((t) => /treino/.test(t) && /18:00/.test(t)), said.join(' | '));
  assert.equal(f.companion.checkRoutine(at(18, 50)), null, 'um reforço só');
});
