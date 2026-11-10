// Apoio ao treino: fichas, treino do dia (rodízio), cargas, recorde e histórico.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv } from './helpers.js';
import { Workout, parseExercise, parseExerciseList, parseWorkoutRequest, parseWorkoutCommand, sanitizeWorkout } from '../../src/core/workout.js';
import { Habits } from '../../src/core/habits.js';

const HOJE = '2026-10-30';

function started() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  e.companion.enterInteraction('test');
  return e;
}

test('exercício e lista: séries, repetições e carga opcionais; vírgula decimal não quebra a lista', () => {
  assert.deepEqual(parseExercise('supino 4x10 40kg'), { nome: 'supino', series: 4, reps: 10, carga: 40 });
  assert.deepEqual(parseExercise('Agachamento livre 4 x 8 62,5 kg'), { nome: 'Agachamento livre', series: 4, reps: 8, carga: 62.5 });
  assert.deepEqual(parseExercise('remada curvada 3x12'), { nome: 'remada curvada', series: 3, reps: 12, carga: null });
  assert.deepEqual(parseExercise('prancha'), { nome: 'prancha', series: null, reps: null, carga: null });
  assert.equal(parseExercise('4x10 40kg'), null);
  assert.equal(parseExercise(''), null);
  assert.deepEqual(parseExerciseList('supino 4x10 42,5kg, agachamento 4x8 60kg; remada 3x12\nprancha').map((e) => [e.nome, e.carga]), [['supino', 42.5], ['agachamento', 60], ['remada', null], ['prancha', null]]);
});

test('pedidos e comandos de treino; conversa comum sobre academia não vira comando', () => {
  assert.equal(parseWorkoutRequest('minha ficha A é: supino 4x10 40kg; remada 3x12').exercicios.length, 2);
  assert.equal(parseWorkoutRequest('ficha b: agachamento 4x8 60kg').ficha, 'B');
  assert.deepEqual(parseWorkoutRequest('qual o treino de hoje?'), { tipo: 'hoje' });
  assert.deepEqual(parseWorkoutRequest('minha ficha'), { tipo: 'hoje' });
  assert.deepEqual(parseWorkoutRequest('fiz supino com 45kg'), { tipo: 'carga', exercicio: 'supino', carga: 45 });
  assert.deepEqual(parseWorkoutRequest('registra agachamento 62,5 kg'), { tipo: 'carga', exercicio: 'agachamento', carga: 62.5 });
  assert.deepEqual(parseWorkoutRequest('supino 47,5kg', { exercicios: ['Supino'] }), { tipo: 'carga', exercicio: 'supino', carga: 47.5 });
  assert.equal(parseWorkoutRequest('comprei arroz 5kg', { exercicios: ['Supino'] }), null, 'só exercício da ficha vale sem verbo');
  assert.deepEqual(parseWorkoutRequest('histórico do supino'), { tipo: 'historico', exercicio: 'supino' });
  for (const t of ['bora treinar', 'treinei hoje', 'odeio academia', 'faz supino', 'engordei 2kg', 'oi']) assert.equal(parseWorkoutRequest(t), null, t);
  assert.deepEqual(parseWorkoutCommand(''), { tipo: 'hoje' });
  assert.deepEqual(parseWorkoutCommand('ficha A'), { tipo: 'verFicha', ficha: 'A' });
  assert.equal(parseWorkoutCommand('ficha A: supino 4x10 40kg; remada 3x12').exercicios.length, 2);
  assert.deepEqual(parseWorkoutCommand('carga supino 42,5'), { tipo: 'carga', exercicio: 'supino', carga: 42.5 });
  assert.deepEqual(parseWorkoutCommand('historico supino'), { tipo: 'historico', exercicio: 'supino' });
  assert.deepEqual(parseWorkoutCommand('feito'), { tipo: 'feito' });
  assert.deepEqual(parseWorkoutCommand('apagar B'), { tipo: 'apagar', ficha: 'B' });
  assert.deepEqual(parseWorkoutCommand('qualquer coisa'), { tipo: 'ajuda' });
});

test('fichas em rodízio, treino feito, cargas com recorde e histórico', () => {
  const habits = new Habits();
  const saved = [];
  const w = new Workout({ habits, save: (s) => saved.push(1) });
  assert.equal(w.apply({ tipo: 'hoje' }, HOJE).fala, 'treinoVazio');
  assert.equal(w.apply({ tipo: 'feito' }, HOJE).fala, 'treinoVazio');
  assert.equal(w.apply({ tipo: 'ficha', ficha: 'A', exercicios: [] }, HOJE).fala, 'treinoFichaVazia');
  const a = w.apply({ tipo: 'ficha', ficha: 'A', exercicios: parseExerciseList('supino 4x10 40kg; remada 3x12') }, HOJE);
  assert.deepEqual([a.fala, a.itens], ['treinoFichaSalva', ['supino 4x10 · 40 kg', 'remada 3x12']]);
  w.apply({ tipo: 'ficha', ficha: 'B', exercicios: parseExerciseList('agachamento 4x8 60kg') }, HOJE);
  assert.deepEqual(w.doDia(HOJE), { ficha: 'A', feito: false });
  const f = w.apply({ tipo: 'feito' }, HOJE);
  assert.deepEqual([f.fala, f.vars], ['treinoFeito', { ficha: 'A', dias: 1 }]);
  assert.equal(habits.has('treino', HOJE), true, 'treino feito conta no hábito');
  assert.equal(w.apply({ tipo: 'hoje' }, HOJE).fala, 'treinoHojeFeito');
  assert.deepEqual(w.doDia('2026-10-31'), { ficha: 'B', feito: false }, 'no dia seguinte é a próxima ficha');
  w.apply({ tipo: 'feito' }, '2026-10-31');
  assert.deepEqual(w.doDia('2026-11-01'), { ficha: 'A', feito: false }, 'depois da última volta para a primeira');
  // Cargas.
  let c = w.apply({ tipo: 'carga', exercicio: 'supino', carga: 42.5 }, HOJE);
  assert.deepEqual([c.fala, c.vars], ['treinoCarga', { exercicio: 'supino', carga: '42,5', antes: '40' }], 'compara com a carga da ficha');
  assert.equal(w.st.fichas.A[0].carga, 42.5, 'a ficha passa a mostrar a carga nova');
  c = w.apply({ tipo: 'carga', exercicio: 'Supino', carga: 45 }, '2026-10-31');
  assert.equal(c.fala, 'treinoCargaRecorde');
  assert.equal(c.vars.antes, '42,5');
  c = w.apply({ tipo: 'carga', exercicio: 'supino', carga: 40 }, '2026-11-01');
  assert.equal(c.fala, 'treinoCargaMenor');
  c = w.apply({ tipo: 'carga', exercicio: 'rosca direta', carga: 12 }, HOJE);
  assert.equal(c.fala, 'treinoCargaPrimeira', 'exercício fora da ficha também registra');
  const h = w.apply({ tipo: 'historico', exercicio: 'supino' }, HOJE);
  assert.deepEqual(h.itens, ['30/10: 42,5 kg', '31/10: 45 kg', '01/11: 40 kg']);
  assert.equal(w.apply({ tipo: 'historico', exercicio: 'leg press' }, HOJE).fala, 'treinoSemHistorico');
  assert.equal(w.apply({ tipo: 'carga', exercicio: 'supino', carga: 5000 }, HOJE).fala, 'treinoAjuda');
  assert.equal(w.apply({ tipo: 'apagar', ficha: 'C' }, HOJE).fala, 'treinoSemFicha');
  assert.equal(w.apply({ tipo: 'apagar', ficha: 'A' }, HOJE).fala, 'treinoFichaApagada');
  assert.deepEqual(w.ids, ['B']);
  assert.equal(w.st.historico.length, 4, 'apagar a ficha não apaga o histórico');
  assert.ok(saved.length >= 8);
  assert.deepEqual(sanitizeWorkout({ fichas: { A: [{ nome: 'supino', series: 4, reps: 10, carga: 'x' }, { nome: '' }], Z: [{ nome: 'a' }], B: 'nada' }, historico: [{ dia: 'ontem', exercicio: 'supino', carga: 1 }], ultimo: { dia: HOJE, ficha: 'Q' } }), { fichas: { A: [{ nome: 'supino', series: 4, reps: 10, carga: null }] }, historico: [], ultimo: null });
});

test('na conversa e no comando: salva a ficha, mostra o treino do dia e registra cargas', async () => {
  const e = started();
  let r = await chatAdv(e, 'qual o treino de hoje?');
  assert.equal(r.intent, 'treino');
  assert.match(r.text, /ficha A:/i);
  r = await chatAdv(e, 'minha ficha A é: supino 4x10 40kg; remada 3x12');
  assert.match(r.text, /supino 4x10 · 40 kg/);
  assert.deepEqual(Object.keys(e.companion.progress.st.treino.fichas), ['A']);
  r = await chatAdv(e, '/treino ficha B: agachamento 4x8 60kg');
  r = await chatAdv(e, '/treino');
  assert.match(r.text, /[Ff]icha A/);
  assert.match(r.text, /remada 3x12/);
  r = await chatAdv(e, 'supino 45kg');
  assert.equal(r.intent, 'treino');
  assert.match(r.text, /45 kg/);
  r = await chatAdv(e, '/treino feito');
  assert.match(r.text, /[Ff]icha A/);
  assert.equal(e.companion.habits.has('treino', HOJE), true);
  r = await chatAdv(e, '/treino historico supino');
  assert.match(r.text, /30\/10: 45 kg/);
  r = await chatAdv(e, '/treino xyz');
  assert.match(r.text, /\/treino ficha A/);
});

test('lembrete de treino deixa o treino do dia à vista na Central, só quando há ficha', () => {
  const e = started();
  assert.equal(e.companion._treinoDoDiaCentral(new Date(2026, 9, 30, 17)), false, 'sem ficha, nada aparece');
  e.companion.workout.apply({ tipo: 'ficha', ficha: 'A', exercicios: parseExerciseList('supino 4x10 40kg; remada 3x12') }, HOJE);
  assert.equal(e.companion._treinoDoDiaCentral(new Date(2026, 9, 30, 17)), true);
  const c = e.companion.conversations.get('treino-dia');
  assert.match(c.title, /ficha A/);
  assert.match(c.detail, /supino 4x10 · 40 kg · remada 3x12/);
  e.companion.workout.apply({ tipo: 'feito' }, HOJE);
  assert.equal(e.companion._treinoDoDiaCentral(new Date(2026, 9, 30, 18)), false, 'treino já feito hoje não é cobrado de novo');
});
