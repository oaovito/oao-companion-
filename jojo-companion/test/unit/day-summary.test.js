// Resumo do dia: de manhã o que há para fazer, à noite o que foi feito.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv } from './helpers.js';
import { parseDaySummaryRequest, parseDaySummaryCommand, morningLines, nightLines } from '../../src/core/day-summary.js';
import { parseExerciseList } from '../../src/core/workout.js';
import { TodoModel } from '../../src/core/todo.js';
import { TodoChat } from '../../src/core/todo-chat.js';

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

function comDados(e) {
  const model = new TodoModel({ now: () => at(15).getTime() });
  e.companion.todoChat = new TodoChat(model);
  model.add({ title: 'Entregar relatório' });
  const feita = model.add({ title: 'Ler capítulo 3' });
  model.add({ title: 'Marcar dentista' });
  model.complete(feita.id, true);
  e.companion.routine.apply({ tipo: 'montar', blocos: { manha: '07:00', estudo: '14:00', treino: '18:00', sono: '22:30' } }, HOJE);
  e.companion.workout.apply({ tipo: 'ficha', ficha: 'A', exercicios: parseExerciseList('supino 4x10 40kg') }, HOJE);
  e.companion.reminders.apply({ tipo: 'remedio', nome: 'Vitamina D', hora: '08:00' });
  return model;
}

test('pedidos: "meu dia" e "fechamento do dia"; "como foi meu dia" continua com o /resumo antigo', () => {
  assert.deepEqual(parseDaySummaryRequest('meu dia'), { tipo: 'manha' });
  assert.deepEqual(parseDaySummaryRequest('JoJo, qual o plano de hoje?'), { tipo: 'manha' });
  assert.deepEqual(parseDaySummaryRequest('fechamento do dia'), { tipo: 'noite' });
  assert.deepEqual(parseDaySummaryRequest('o que eu cumpri hoje?'), { tipo: 'noite' });
  for (const t of ['como foi meu dia', 'resumo do dia', 'o que eu fiz hoje', 'meu dia foi péssimo', 'oi']) assert.equal(parseDaySummaryRequest(t), null, t);
  assert.deepEqual(parseDaySummaryCommand('manha'), { tipo: 'manha' });
  assert.deepEqual(parseDaySummaryCommand('manhã'), { tipo: 'manha' });
  assert.deepEqual(parseDaySummaryCommand('noite'), { tipo: 'noite' });
  assert.equal(parseDaySummaryCommand(''), null);
});

test('linhas da manhã e da noite só mostram o que existe', () => {
  assert.deepEqual(morningLines({}), []);
  assert.deepEqual(nightLines({}), []);
  const tarefas = { total: 4, completed: 1, tasks: [{ title: 'A', completed: false }, { title: 'B', completed: true }, { title: 'C', completed: false }, { title: 'D', completed: false }, { title: 'E', completed: false }] };
  assert.deepEqual(morningLines({ tarefas, ontem: ['Pagar boleto'], rotina: ['07:00 Manhã', '18:00 Treino'], treino: { ficha: 'B', feito: false }, remedios: [{ nome: 'Vitamina D', hora: '08:00' }] }), [
    'Tarefas: 4 pendentes — A; C; D; e mais 1',
    'Ficou de ontem: Pagar boleto',
    'Rotina: 07:00 Manhã · 18:00 Treino',
    'Treino: ficha B',
    'Remédios: Vitamina D 08:00',
  ]);
  assert.deepEqual(morningLines({ treino: { ficha: 'A', feito: true } }), [], 'treino já feito não entra no plano');
  assert.deepEqual(nightLines({ tarefas, habitos: { treino: true, estudo: false, sono: false }, rotina: { feitos: 1, total: 4 }, foco: 2 }), [
    'Tarefas: 1 de 4 feitas — ficou: A; C; D; e mais 1',
    'Hábitos: treino ✓ · estudo — · sono —',
    'Rotina: 1 de 4 blocos',
    'Foco: 2 blocos',
  ]);
  assert.deepEqual(nightLines({ habitos: { treino: false, estudo: false, sono: false }, rotina: { feitos: 0, total: 0 }, foco: 0 }), []);
});

test('na conversa e no comando: plano da manhã e fechamento da noite com os dados reais; /resumo sem argumento continua igual', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, 'meu dia');
  assert.equal(r.intent, 'resumoDia');
  assert.doesNotMatch(r.text, /Tarefas:/, 'sem dados, só a fala de dia vazio');
  comDados(e);
  r = await chatAdv(e, '/resumo manha');
  assert.match(r.text, /Tarefas: 2 pendentes — Entregar relatório; Marcar dentista/);
  assert.match(r.text, /Rotina: 07:00 Manhã · 14:00 Estudo · 18:00 Treino · 22:30 Sono/);
  assert.match(r.text, /Treino: ficha A/);
  assert.match(r.text, /Remédios: Vitamina D 08:00/);
  e.companion.habits.log('treino', HOJE);
  r = await chatAdv(e, 'fechamento do dia');
  assert.match(r.text, /Tarefas: 1 de 3 feitas — ficou: Entregar relatório; Marcar dentista/);
  assert.match(r.text, /Hábitos: treino ✓ · estudo — · sono —/);
  assert.match(r.text, /Rotina: 1 de 4 blocos/);
  r = await chatAdv(e, '/resumo');
  assert.doesNotMatch(r.text, /Tarefas:/, 'o /resumo de sempre não mudou');
});

test('automático: uma vez de manhã e uma vez à noite, só com o que mostrar, nunca no foco, e fica na Central', () => {
  const e = started();
  assert.equal(e.companion.checkDaySummary(at(8)), null, 'sem dados não aparece');
  const vazio = started();
  comDados(vazio);
  const said = [];
  const orig = vazio.companion.say.bind(vazio.companion);
  vazio.companion.say = (t, k, o) => (said.push(t), orig(t, k, o));
  vazio.companion.startFocus(30, 'estudo');
  assert.equal(vazio.companion.checkDaySummary(at(8)), null, 'no foco fica em silêncio e não gasta o resumo do dia');
  vazio.companion._endFocus(false);
  assert.equal(vazio.companion.checkDaySummary(at(13)), null, 'fora dos horários não aparece');
  said.length = 0;
  assert.equal(vazio.companion.checkDaySummary(at(8, 5)), 'manha');
  assert.ok(said.some((t) => /Tarefas: 2 pendentes/.test(t)), said.join(' | '));
  const c = vazio.companion.conversations.get('resumo-dia');
  assert.equal(c.title, 'Seu dia');
  assert.equal(vazio.companion.checkDaySummary(at(9)), null, 'uma vez por manhã');
  assert.equal(vazio.companion.progress.st.resumos.manha, HOJE, 'salvo para não repetir depois de reabrir');
  said.length = 0;
  assert.equal(vazio.companion.checkDaySummary(at(21, 30)), 'noite');
  assert.ok(said.some((t) => /Tarefas: 1 de 3 feitas/.test(t)));
  assert.equal(vazio.companion.conversations.get('resumo-dia').title, 'Seu dia', 'a mesma atividade recebe o fechamento');
  assert.equal(vazio.companion.checkDaySummary(at(22)), null, 'uma vez por noite');
});
