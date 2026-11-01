import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TodoModel, TODO_LINES, validateTodo } from '../../src/core/todo.js';
import { TodoChat } from '../../src/core/todo-chat.js';
import { AtomicState } from '../../src/core/atomic-state.js';
import { logicalDay } from '../../src/core/civil-time.js';
import { Progress } from '../../src/core/catalog/antitedio.js';

function env(state) {
  let now = Date.parse('2026-11-02T12:00:00Z'), seq = 0, disk, fail = false;
  const rewards = [], ids = new Set();
  const save = st => { if (fail) throw new Error('disco indisponível'); disk = structuredClone(st); };
  const award = a => { if (ids.has(a.id)) return { duplicate: true }; ids.add(a.id); rewards.push(a); return a; };
  const t = new TodoModel({ state, now: () => now, id: () => `task-${++seq}`, save, award });
  return { t, rewards, save, award, set: x => { now = Date.parse(x); }, saved: () => structuredClone(disk), fail: x => { fail = x; }, now: () => now };
}
test('tarefas: CRUD ilimitado, descrições, prioridades, categorias e ordem persistente', () => {
  const e = env(); const c = e.t.category({ name: 'Pessoal', xp: 12 });
  const a = e.t.add({ title: 'Estudar', description: 'Capítulo 2', priority: 'important', category: c.id });
  const b = e.t.add({ title: 'Treinar', frequency: 'once', due: '2026-11-02' });
  e.t.edit(a.id, { title: 'Estudar física', id: 'alterado', completed: { once: 123 }, description: 'Capítulo 3' });
  e.t.move(b.id, a.id);
  assert.deepEqual(e.t.snapshot().tasks.map(t => t.id), [b.id, a.id]);
  assert.equal(e.t.snapshot().tasks[1].description, 'Capítulo 3');
  assert.equal(e.t.remove(a.id).needsConfirmation, true);
  e.t.remove(a.id, true); assert.equal(e.t.snapshot().total, 1);
  for (let i = 0; i < 105; i++) e.t.add({ title: `Tarefa ${i}` });
  assert.equal(e.t.snapshot().total, 106); assert.equal(e.t.snapshot().tasks.length, 50);
  assert.equal(e.t.snapshot({ page: 2 }).tasks.length, 6);
});
test('tarefas: reset à meia-noite, dias desligado e histórico sem apagar tarefas', () => {
  const e = env(); e.t.configure({ zone: 'America/Sao_Paulo' });
  const a = e.t.add({ title: 'Água' }); e.t.complete(a.id);
  e.set('2026-11-03T02:59:00Z'); assert.equal(e.t.snapshot().completed, 1);
  e.set('2026-11-03T03:00:00Z'); assert.equal(e.t.snapshot().completed, 0);
  assert.equal(e.t.snapshot().total, 1); assert.equal(e.t.history().length, 1);
  e.set('2026-11-10T12:00Z');
  const restarted = env(e.saved()).t; restarted.now = e.now;
  assert.equal(restarted.snapshot().day, '2026-11-10');
  assert.equal(restarted.snapshot().tasks[0].title, 'Água');
});
test('tarefas: horário personalizado, fuso, DST e relógio retrocedido', () => {
  const e = env(); e.t.configure({ zone: 'America/New_York', resetTime: '06:00' });
  const a = e.t.add({ title: 'Água' }); e.t.complete(a.id);
  e.set('2026-11-03T10:59Z'); assert.equal(e.t.snapshot().completed, 1);
  e.set('2026-11-03T11:00Z'); assert.equal(e.t.snapshot().completed, 0);
  e.t.complete(a.id); const xp = e.rewards.length;
  e.set('2026-11-02T12:00Z'); assert.equal(e.t.snapshot().day, '2026-11-03');
  e.t.complete(a.id, false); e.t.complete(a.id); assert.equal(e.rewards.length, xp);
  assert.equal(logicalDay(Date.parse('2026-11-01T06:30Z'), { zone: 'America/New_York', resetTime: '02:00' }), '2026-10-31');
  assert.equal(logicalDay(Date.parse('2026-11-01T07:00Z'), { zone: 'America/New_York', resetTime: '02:00' }), '2026-11-01');
  assert.equal(logicalDay(Date.parse('2026-03-08T07:00Z'), { zone: 'America/New_York', resetTime: '02:30' }), '2026-03-08');
});
test('tarefas: recorrência semanal, dias específicos e únicas não se duplicam', () => {
  const e = env(); const w = e.t.add({ title: 'Casa', frequency: 'weekly' });
  const d = e.t.add({ title: 'Treino', frequency: 'weekdays', weekdays: [1, 3, 5] });
  const once = e.t.add({ title: 'Comprar', frequency: 'once' });
  e.t.complete(w.id); e.t.complete(once.id); e.t.complete(d.id);
  e.set('2026-11-03T12:00Z');
  assert.equal(e.t.snapshot().total, 2); assert.equal(e.t.snapshot().completed, 2);
  e.set('2026-11-04T12:00Z'); assert.equal(e.t.snapshot().total, 3); assert.equal(e.t.snapshot().completed, 2);
  e.set('2026-11-09T12:00Z'); assert.equal(e.t.snapshot().tasks.find(t => t.id === w.id).completed, false);
  assert.equal(e.t.st.tasks.length, 3);
});
test('tarefas: desativar reset congela período; reativar recupera calendário', () => {
  const e = env(); const a = e.t.add({ title: 'Estudar' }); e.t.complete(a.id); e.t.configure({ autoReset: false });
  e.set('2026-11-15T12:00Z'); assert.equal(e.t.snapshot().completed, 1);
  e.t.configure({ autoReset: true }); assert.equal(e.t.snapshot().completed, 0);
  assert.equal(e.t.snapshot().day, '2026-11-15');
});
test('tarefas: XP 5/10/20, tudo +50 e sete dias distintos +150 uma só vez', () => {
  const e = env(); const tasks = ['simple', 'normal', 'important'].map(priority => e.t.add({ title: priority, priority }));
  for (let day = 2; day <= 8; day++) {
    e.set(`2026-11-${String(day).padStart(2, '0')}T12:00Z`);
    for (const t of tasks) e.t.complete(t.id);
  }
  assert.equal(e.rewards.reduce((sum, a) => sum + a.amount, 0), 7 * 85 + 150);
  assert.equal(e.t.snapshot().routineDays, 7);
  assert.equal(e.rewards.filter(a => a.label === 'Sete dias de rotina completa').length, 1);
});
test('tarefas: editar, desmarcar/remarcar, apagar/recriar e reiniciar não dão XP extra', () => {
  const e = env(); const a = e.t.add({ title: 'Estudar' }); e.t.complete(a.id);
  e.t.complete(a.id, false); e.t.edit(a.id, { title: 'Estudar muito', xp: 50 }); e.t.complete(a.id);
  assert.equal(e.rewards.length, 2);
  e.t.remove(a.id, true); const b = e.t.add({ title: 'Estudar muito' }); e.t.complete(b.id);
  assert.equal(e.rewards.length, 2);
  const restarted = new TodoModel({ state: e.saved(), now: e.now, award: e.award, save: e.save });
  restarted.complete(b.id, false); restarted.complete(b.id); assert.equal(e.rewards.length, 2);
  assert.equal(e.t.st.awards['2026-11-02'].xp, 60);
});
test('tarefas: limite diário, XP por categoria/tarefa e gamificação desligada', () => {
  const e = env(); const cat = e.t.category({ name: 'Estudo', xp: 30 });
  const a = e.t.add({ title: 'Ler', category: cat.id }); const b = e.t.add({ title: 'Prova', xp: 999 });
  for (let i = 0; i < 20; i++) e.t.add({ title: `Exercício ${i}`, xp: 50 });
  e.t.complete(a.id); e.t.complete(b.id); assert.equal(e.rewards[0].amount, 30); assert.equal(e.rewards[1].amount, 50);
  for (const t of e.t.st.tasks) e.t.complete(t.id);
  assert.equal(e.t.snapshot().xpToday, 500);
  e.set('2026-11-03T12:00Z'); e.t.configure({ xpEnabled: false });
  e.t.complete(a.id); e.t.configure({ xpEnabled: true }); e.t.complete(a.id, false); e.t.complete(a.id);
  assert.equal(e.t.snapshot().xpToday, 0);
});
test('tarefas: outbox sobrevive a crash depois de conceder XP antes de confirmar tarefa', () => {
  const e = env(); const a = e.t.add({ title: 'Estudar' });
  let fail = true; e.t.award = reward => { const r = e.award(reward); if (fail) { fail = false; throw new Error('crash'); } return r; };
  e.t.complete(a.id); assert.equal(e.t.st.outbox.length, 2); assert.equal(e.rewards.length, 1);
  const restored = new TodoModel({ state: e.saved(), now: e.now, save: e.save, award: e.award });
  assert.equal(restored.st.outbox.length, 0); assert.equal(e.rewards.length, 2);
  assert.equal(e.rewards.reduce((s, a) => s + a.amount, 0), 60);
});
test('tarefas: falha de gravação reverte transação; backup recupera JSON inválido', t => {
  const e = env(); e.fail(true); assert.throws(() => e.t.add({ title: 'Não confirmou' })); assert.equal(e.t.st.tasks.length, 0);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-todo-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const disk = new AtomicState(path.join(dir, 'tasks.json'), { validate: validateTodo });
  disk.write(e.t.st); e.fail(false); e.t.add({ title: 'Confirmou' }); disk.write(e.t.st);
  fs.writeFileSync(disk.file, '{inválido'); assert.equal(disk.load().tasks.length, 0); assert.equal(disk.recovered, true);
  disk.write(e.t.st); assert.equal(disk.load().tasks.length, 1);
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(`${disk.file}.bak`, 'utf8')));
});
test('tarefas: import/export preserva conclusões e configurações locais sem importar XP', () => {
  const e = env(); const a = e.t.add({ title: 'Estudar' }); e.t.complete(a.id);
  const target = env(); target.t.configure({ theme: 'night' });
  assert.equal(target.t.import(e.t.export()).added, 1); assert.equal(target.t.import(e.t.export()).added, 0);
  assert.equal(target.t.snapshot().completed, 1); assert.equal(target.rewards.length, 0); assert.equal(target.t.st.settings.theme, 'night');
  assert.equal(target.t.history().length, 1);
  assert.throws(() => target.t.import({ format: 'outra coisa' }));
});
test('tarefas: lembretes são silenciosos no foco/tela cheia e não duplicam após reiniciar', () => {
  const e = env(); e.t.configure({ zone: 'UTC' }); e.t.add({ title: 'Treinar', time: '12:00' });
  assert.deepEqual(e.t.reminders({ focus: true }), []); assert.deepEqual(e.t.reminders({ fullscreen: true }), []);
  assert.equal(e.t.reminders().length, 1); assert.equal(e.t.reminders().length, 0);
  assert.equal(new TodoModel({ state: e.saved(), now: e.now }).reminders().length, 0);
  assert.equal('sounds' in e.t.st.settings, false);
});
test('tarefas: linguagem natural consulta e altera dados reais, esclarece ambiguidade', () => {
  const e = env(); const chat = new TodoChat(e.t, { now: e.now });
  assert.match(chat.reply('Adiciona lavar o cabelo na lista.'), /lavar o cabelo/);
  assert.equal(e.t.st.tasks[0].title, 'lavar o cabelo');
  chat.reply('Coloca academia todos os dias.'); assert.equal(e.t.st.tasks[1].frequency, 'daily');
  chat.reply('Marca academia como concluído.'); assert.equal(e.t.snapshot().completed, 1);
  assert.match(chat.reply('O que ainda falta?'), /lavar o cabelo/);
  assert.match(chat.reply('Quais tarefas já completei?'), /✓ academia/);
  assert.match(chat.reply('Quanto falta para terminar tudo?'), /1\/2/);
  assert.match(chat.reply('Tira essa tarefa.'), /Qual é o título/); assert.equal(e.t.st.tasks.length, 2);
  assert.match(chat.reply('Remove a tarefa academia'), /confirmo/); chat.reply('cancela'); assert.equal(e.t.st.tasks.length, 2);
  chat.reply('Remove a tarefa academia'); chat.reply('confirmo'); assert.equal(e.t.st.tasks.length, 1);
  assert.match(chat.reply('Muda o reset para as 6 da manhã.'), /06:00/);
  assert.equal(e.t.st.settings.resetTime, '06:00');
  chat.reply('Não adiciona dormir na lista'); assert.equal(e.t.st.tasks.length, 1);
  assert.equal(chat.reply('Qual a previsão do tempo?'), null);
  assert.equal(chat.reply('Será que você pode marcar estudar como concluído?'), null);
});
test('tarefas: privacidade, filtros, aparência, arquivamento e falas sem repetição imediata', () => {
  const e = env(); const a = e.t.add({ title: '<script>não executar</script>' }); e.t.complete(a.id);
  e.t.configure({ showCompleted: false, width: 9999, opacity: 0, theme: 'plum', position: 'left' });
  assert.equal(e.t.snapshot().tasks.length, 0); assert.equal(e.t.snapshot().total, 1); assert.equal(e.t.st.settings.width, 800); assert.equal(e.t.st.settings.opacity, 0.45);
  e.t.configure({ showCompleted: true, archiveCompleted: true }); assert.equal(e.t.snapshot().tasks.length, 0);
  assert.throws(() => e.t.configure({ zone: 'inexistente' }));
  const lines = Object.values(TODO_LINES).flat(); assert.ok(new Set(lines).size >= 10);
  assert.notEqual(e.t.line('done'), e.t.line('done'));
});
test('XP compartilhado: ledger idempotente preserva XP antigo e desfaz falha durável', () => {
  let fail = false; const p = new Progress({ data: { niveis: ['A', 'B', 'C'], xpPorNivel: 60 }, state: { xp: 50 }, save: () => { if (fail) throw new Error('disco'); } });
  const reward = { id: 'todo:test', amount: 20, day: '2026-11-02', source: 'todo', label: 'Estudar' };
  assert.equal(p.award(reward).levelUp, true); assert.equal(p.st.xp, 70);
  assert.equal(p.award(reward).duplicate, true); assert.equal(p.st.xp, 70);
  fail = true; assert.throws(() => p.award({ ...reward, id: 'todo:2' })); assert.equal(p.st.xp, 70);
  fail = false; assert.equal(p.award({ ...reward, id: 'todo:2' }).amount, 20); assert.equal(p.st.xp, 90);
});

test('tarefas: importação malformada é recusada inteira sem alterar registros existentes', () => {
  const e = env(); e.t.add({ title: 'Preservar' }); const good = e.t.export();
  for (const broken of [
    { ...good.data, tasks: [{ ...good.data.tasks[0], completed: true }] },
    { ...good.data, tasks: [{ ...good.data.tasks[0], completed: { outro: 123 } }] },
    { ...good.data, categories: [{ id: 'x', name: '' }] },
    { ...good.data, outbox: [{ id: 'outro', day: '2026-11-02', amount: 500000, source: 'todo' }] },
    { ...good.data, awards: { '2026-11-02': { xp: 500000, keys: [] } } },
  ]) {
    assert.throws(() => e.t.import({ ...good, data: broken })); assert.equal(e.t.st.tasks.length, 1);
    assert.equal(e.t.st.tasks[0].title, 'Preservar');
  }
});
