import { logicalDay, shiftDay, weekday, validDay, timeZone, civilParts } from './civil-time.js';
import { randomUUID } from 'node:crypto';

const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const text = (s, max = 200) => String(s || '').trim().slice(0, max);
const clamp = (x, a, b) => Math.max(a, Math.min(b, Number(x) || 0));
const clone = x => structuredClone(x);
export const TODO_DEFAULTS = Object.freeze({
  visible: false, width: 360, height: 520, position: 'right', opacity: 1, theme: 'ocean',
  showPercent: true, showCompleted: true, collapseCompleted: false, sort: 'manual', animations: true,
  resetTime: '00:00', zone: 'local', autoReset: true, defaultFrequency: 'daily', notifications: true,
  reminders: true, confirmDelete: true, archiveCompleted: false, historyDays: 365, xpEnabled: true,
});
export const TODO_LINES = Object.freeze({
  added: ['Anotado, Manu. Agora a ideia tem endereço.', 'Entrou na lista. Procrastinação perdeu o esconderijo.', 'Organizado. Até o caos precisa de uma fila.'],
  done: ['Uma pendência a menos. O impossível era só começar.', 'Feito, Manu. Essa vitória não precisa de reunião.', 'Concluído. Seu eu de amanhã agradece, discretamente.', 'A caixa ganhou um visto. Você ganhou terreno.'],
  pending: ['Ainda falta isso. Eu conto tarefas, não desculpas.', 'A lista continua aqui. Sem julgamento. Quase.'],
  all: ['Tudo feito. Hoje o caos perdeu por unanimidade.', 'Rotina completa, Emanuele. Pode admirar a própria eficiência.', 'Lista zerada. Um raro momento de respeito administrativo.'],
  reminder: ['Tem uma tarefa esperando. Só uma cutucada, sem palestra.', 'Horário combinado chegou. A lista não vai se concluir sozinha.'],
});
export const TODO_LIMITS = Object.freeze({ dailyXp: 500, taskXp: 50, routineBonus: 50, sevenDays: 150 });
export function emptyTodo() {
  return { version: 1, tasks: [], categories: [], settings: { ...TODO_DEFAULTS }, day: null, highDay: null,
    history: [], awards: {}, outbox: [], routineDays: [], notifications: {}, lineIndex: {}, revision: 0 };
}
function settings(input = {}) {
  const s = { ...TODO_DEFAULTS };
  for (const k of Object.keys(s)) {
    if (!(k in input)) continue;
    if (typeof s[k] === 'boolean') s[k] = input[k] === true;
    else if (typeof s[k] === 'string') s[k] = text(input[k], 80);
    else s[k] = Number(input[k]);
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.resetTime)) throw new Error('Horário de reinício inválido.');
  timeZone(s.zone);
  s.width = clamp(s.width, 300, 800); s.height = clamp(s.height, 300, 1000);
  s.opacity = clamp(s.opacity, 0.45, 1); s.historyDays = Math.round(clamp(s.historyDays, 7, 3650));
  if (!['left', 'right', 'center'].includes(s.position)) s.position = 'right';
  if (!['ocean', 'night', 'plum', 'forest'].includes(s.theme)) s.theme = 'ocean';
  if (!['manual', 'priority', 'time', 'title'].includes(s.sort)) s.sort = 'manual';
  if (!['daily', 'weekly', 'weekdays', 'once', 'never'].includes(s.defaultFrequency)) s.defaultFrequency = 'daily';
  return s;
}
function task(input, fallback = {}, day) {
  const t = { ...fallback, ...input };
  t.title = text(t.title); if (!t.title) throw new Error('A tarefa precisa de um título.');
  t.description = text(t.description, 4000);
  t.priority = ['simple', 'normal', 'important'].includes(t.priority) ? t.priority : 'normal';
  t.category = text(t.category, 80);
  t.frequency = ['daily', 'weekly', 'weekdays', 'once', 'never'].includes(t.frequency) ? t.frequency : 'daily';
  t.weekdays = [...new Set((Array.isArray(t.weekdays) ? t.weekdays : [1, 2, 3, 4, 5]).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))];
  if (t.frequency === 'weekdays' && !t.weekdays.length) throw new Error('Escolha pelo menos um dia da semana.');
  t.time = text(t.time, 5); if (t.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)) throw new Error('Horário da tarefa inválido.');
  t.due = text(t.due, 10); if (t.due && !validDay(t.due)) throw new Error('Prazo inválido.');
  t.xp = t.xp == null || t.xp === '' ? null : Math.round(clamp(t.xp, 0, TODO_LIMITS.taskXp));
  t.reminder = t.reminder !== false; t.archived = t.archived === true;
  t.anchor = validDay(fallback.anchor) ? fallback.anchor : validDay(t.anchor) ? t.anchor : day;
  return t;
}
export function validateTodo(raw) {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.tasks) || !Array.isArray(raw.history)) throw new Error('Arquivo de tarefas incompatível.');
  const st = { ...emptyTodo(), ...clone(raw), settings: settings(raw.settings) };
  const ids = new Set();
  st.tasks = st.tasks.map(t => {
    if (!t || typeof t.id !== 'string' || !t.id || t.id.length > 128 || ids.has(t.id)) throw new Error('Identificador de tarefa inválido ou repetido.');
    if (t.completed != null && (!t.completed || Array.isArray(t.completed) || typeof t.completed !== 'object')) throw new Error('Conclusões de tarefa inválidas.');
    for (const [period, at] of Object.entries(t.completed || {})) if ((period !== 'once' && !validDay(period.replace(/^week:/, ''))) || !Number.isFinite(at) || at < 0) throw new Error('Período de conclusão inválido.');
    ids.add(t.id); return task(t, t, '2000-01-01');
  });
  for (const k of ['categories', 'outbox', 'routineDays']) if (!Array.isArray(st[k])) throw new Error('Estado de tarefas inválido.');
  for (const k of ['awards', 'notifications', 'lineIndex']) if (!st[k] || Array.isArray(st[k]) || typeof st[k] !== 'object') throw new Error('Estado de tarefas inválido.');
  for (const day of [st.day, st.highDay]) if (day != null && !validDay(day)) throw new Error('Período de tarefas inválido.');
  const categoryIds = new Set();
  st.categories = st.categories.map(c => {
    if (!c || typeof c.id !== 'string' || !c.id || c.id.length > 128 || categoryIds.has(c.id) || !text(c.name, 80)) throw new Error('Categoria inválida.');
    categoryIds.add(c.id); return { id: c.id, name: text(c.name, 80), xp: c.xp == null ? null : Math.round(clamp(c.xp, 0, TODO_LIMITS.taskXp)) };
  });
  for (const h of st.history) if (!h || typeof h.taskId !== 'string' || typeof h.title !== 'string' || !validDay(h.day) || typeof h.completed !== 'boolean' || !Number.isFinite(h.at)) throw new Error('Histórico de tarefas inválido.');
  for (const a of st.outbox) if (!a || !validDay(a.day) || typeof a.id !== 'string' || !a.id.startsWith(`todo:${a.day}:`) || a.id.length > 500 || !Number.isInteger(a.amount) || a.amount < 0 || a.amount > TODO_LIMITS.dailyXp || a.source !== 'todo') throw new Error('Recompensa de tarefas inválida.');
  for (const [day, a] of Object.entries(st.awards)) {
    if (day === 'seven') { if (typeof a !== 'boolean') throw new Error('Registro de bônus inválido.'); continue; }
    if (day === 'once') { if (!Array.isArray(a) || a.some(x => typeof x !== 'string')) throw new Error('Registro de tarefa única inválido.'); continue; }
    if (!validDay(day) || !a || !Array.isArray(a.keys) || a.keys.some(x => typeof x !== 'string') || !Number.isInteger(a.xp) || a.xp < 0 || a.xp > TODO_LIMITS.dailyXp) throw new Error('Registro de XP inválido.');
  }
  if (st.routineDays.some(day => !validDay(day))) throw new Error('Dias de rotina inválidos.');
  st.routineDays = [...new Set(st.routineDays)];
  return st;
}
export class TodoModel {
  constructor({ state, save = () => {}, award = () => ({ pending: true }), now = () => Date.now(), id = randomUUID, onChange = () => {} } = {}) {
    this.st = state ? validateTodo(state) : emptyTodo();
    this.save = save; this.award = award; this.now = now; this.id = id; this.onChange = onChange;
    this.sync(); this.drain();
  }
  // Transação local: a interface só recebe confirmação após o fsync/rename.
  mutate(fn) {
    const before = clone(this.st);
    let result;
    try { result = fn(); this.st.revision++; this.save(this.st); }
    catch (e) { this.st = before; throw e; }
    this.onChange(); return result;
  }
  sync() {
    const actual = logicalDay(this.now(), this.st.settings);
    if (!this.st.day || (this.st.settings.autoReset && actual > this.st.day)) {
      this.mutate(() => {
        this.st.day = actual; this.st.highDay = this.st.highDay && this.st.highDay > actual ? this.st.highDay : actual;
        const cutoff = shiftDay(actual, -this.st.settings.historyDays);
        this.st.history = this.st.history.filter(h => h.day >= cutoff);
        for (const k of Object.keys(this.st.notifications)) if (k.slice(0, 10) < cutoff) delete this.st.notifications[k];
      });
    }
    return this.st.day;
  }
  period(t, day) {
    if (['once', 'never'].includes(t.frequency)) return 'once';
    if (t.frequency === 'weekly') return `week:${shiftDay(day, -((weekday(day) - weekday(t.due || t.anchor) + 7) % 7))}`;
    return day;
  }
  scheduled(t, day) {
    if (t.archived || day < t.anchor || (t.due && day < t.due && ['once', 'never'].includes(t.frequency))) return false;
    if (t.frequency === 'weekdays') return t.weekdays.includes(weekday(day));
    return true;
  }
  done(t, day) { return Object.hasOwn(t.completed || {}, this.period(t, day)); }
  configure(patch) {
    this.sync(); this.mutate(() => { this.st.settings = settings({ ...this.st.settings, ...patch }); }); this.sync();
    return this.snapshot();
  }
  add(input) {
    const day = this.sync();
    return this.mutate(() => {
      const t = task({ frequency: this.st.settings.defaultFrequency, ...input }, {}, day);
      t.id = this.id(); t.completed = {}; t.createdAt = this.now(); t.order = this.st.tasks.length;
      this.st.tasks.push(t); return clone(t);
    });
  }
  edit(id, patch) {
    this.sync();
    return this.mutate(() => {
      const index = this.st.tasks.findIndex(t => t.id === id); if (index < 0) throw new Error('Tarefa não encontrada.');
      // Nunca aceitar ledger, ID, ordem, datas internas ou conclusões vindas da interface.
      const allowed = Object.fromEntries(Object.entries(patch).filter(([k]) => ['title', 'description', 'priority', 'category', 'frequency', 'weekdays', 'time', 'due', 'xp', 'reminder', 'archived'].includes(k)));
      this.st.tasks[index] = task(allowed, this.st.tasks[index], this.st.day);
      return clone(this.st.tasks[index]);
    });
  }
  remove(id, confirmed = false) {
    if (this.st.settings.confirmDelete && !confirmed) return { needsConfirmation: true };
    return this.mutate(() => { const i = this.st.tasks.findIndex(t => t.id === id); if (i < 0) throw new Error('Tarefa não encontrada.'); this.st.tasks.splice(i, 1); return { removed: true }; });
  }
  move(id, beforeId = null) {
    return this.mutate(() => {
      const i = this.st.tasks.findIndex(t => t.id === id); if (i < 0) throw new Error('Tarefa não encontrada.');
      const [t] = this.st.tasks.splice(i, 1);
      const before = beforeId == null ? this.st.tasks.length : this.st.tasks.findIndex(x => x.id === beforeId);
      if (before < 0) throw new Error('Destino não encontrado.');
      this.st.tasks.splice(before, 0, t); this.st.tasks.forEach((x, n) => { x.order = n; });
    });
  }
  category(input, id = null, remove = false) {
    return this.mutate(() => {
      if (remove) { this.st.categories = this.st.categories.filter(c => c.id !== id); for (const t of this.st.tasks) if (t.category === id) t.category = ''; return; }
      const name = text(input.name, 80); if (!name) throw new Error('Dê um nome à categoria.');
      const c = { id: id || this.id(), name, xp: input.xp == null || input.xp === '' ? null : Math.round(clamp(input.xp, 0, TODO_LIMITS.taskXp)) };
      const i = this.st.categories.findIndex(x => x.id === c.id); if (i < 0) this.st.categories.push(c); else this.st.categories[i] = c;
      return clone(c);
    });
  }
  enqueue(key, amount, day, label) {
    const a = this.st.awards[day] ||= { keys: [], xp: 0 };
    if (a.keys.includes(key) || day < this.st.highDay) return;
    a.keys.push(key); // mesmo com XP desligado, reativar não premia conclusões antigas
    if (!this.st.settings.xpEnabled) return;
    amount = Math.min(amount, TODO_LIMITS.dailyXp - a.xp); if (amount <= 0) return;
    a.xp += amount;
    this.st.outbox.push({ id: `todo:${day}:${key}`, amount, source: 'todo', day, label });
  }
  drain() {
    // Outbox durável + award idempotente: crash entre os dois arquivos não duplica XP.
    while (this.st.outbox.length) {
      const item = this.st.outbox[0];
      let result; try { result = this.award(item); } catch { return; }
      if (!result || result.pending) return;
      this.mutate(() => this.st.outbox.shift());
    }
  }
  complete(id, complete = true) {
    const day = this.sync();
    const result = this.mutate(() => {
      const t = this.st.tasks.find(t => t.id === id); if (!t) throw new Error('Tarefa não encontrada.');
      if (!this.scheduled(t, day)) throw new Error('Essa tarefa não está prevista para o dia atual.');
      const period = this.period(t, day); const was = this.done(t, day);
      if (was === !!complete) return { changed: false };
      t.completed ||= {};
      if (complete) t.completed[period] = this.now(); else delete t.completed[period];
      this.st.history.push({ taskId: t.id, title: t.title, day, period, completed: !!complete, at: this.now() });
      if (complete) {
        // ID bloqueia edição; impressão do título bloqueia apagar/recriar no mesmo dia.
        const a = this.st.awards[day] ||= { keys: [], xp: 0 };
        const identity = `id:${t.id}`; const fingerprint = `title:${normalize(t.title)}`;
        const ever = this.st.awards.once?.includes(t.id) || (['once', 'never'].includes(t.frequency) && this.st.awards.once?.includes(fingerprint));
        if (!a.keys.includes(identity) && !a.keys.includes(fingerprint) && !ever) {
          a.keys.push(identity);
          const category = this.st.categories.find(c => c.id === t.category);
          this.enqueue(fingerprint, t.xp ?? category?.xp ?? ({ simple: 5, normal: 10, important: 20 }[t.priority]), day, t.title);
          if (['once', 'never'].includes(t.frequency)) (this.st.awards.once ||= []).push(t.id, fingerprint);
        } else { if (!a.keys.includes(identity)) a.keys.push(identity); if (!a.keys.includes(fingerprint)) a.keys.push(fingerprint); }
        const list = this.st.tasks.filter(x => this.scheduled(x, day));
        if (list.length && list.every(x => this.done(x, day))) {
          this.enqueue('routine', TODO_LIMITS.routineBonus, day, 'Rotina completa');
          if (!this.st.routineDays.includes(day) && day >= this.st.highDay) this.st.routineDays.push(day);
          if (this.st.routineDays.length >= 7 && !this.st.awards.seven) {
            this.enqueue('seven', TODO_LIMITS.sevenDays, day, 'Sete dias de rotina completa'); this.st.awards.seven = true;
          }
        }
      }
      return { changed: true, completed: !!complete };
    });
    this.drain(); return result;
  }
  snapshot({ day = null, page = 0, pageSize = 50, filter = 'all', category = '', search = '', includeArchived = false } = {}) {
    this.sync(); day ||= this.st.day;
    if (!validDay(day)) throw new Error('Data inválida.');
    const all = this.st.tasks.filter(t => (includeArchived || !t.archived) && (includeArchived || this.scheduled(t, day)));
    const total = all.length, completed = all.filter(t => this.done(t, day)).length;
    let list = all.filter(t => (!category || t.category === category) && (!search || normalize(t.title).includes(normalize(search))) && (filter === 'all' || (filter === 'completed' ? this.done(t, day) : !this.done(t, day))));
    if (!includeArchived && (!this.st.settings.showCompleted || this.st.settings.archiveCompleted)) list = list.filter(t => !this.done(t, day));
    const sort = this.st.settings.sort;
    if (sort === 'priority') list.sort((a, b) => ({ important: 0, normal: 1, simple: 2 }[a.priority]) - ({ important: 0, normal: 1, simple: 2 }[b.priority]));
    if (sort === 'time') list.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    pageSize = Math.round(clamp(pageSize, 1, 100)); page = Math.round(clamp(page, 0, Math.max(0, Math.ceil(list.length / pageSize) - 1)));
    return { day, revision: this.st.revision, total, completed, pending: total - completed, percent: total ? Math.round(completed / total * 100) : 0,
      settings: clone(this.st.settings), categories: clone(this.st.categories), count: list.length, page, pageSize,
      currentDay: this.st.day,
      tasks: list.slice(page * pageSize, (page + 1) * pageSize).map(t => ({ ...clone(t), scheduled: this.scheduled(t, day), completed: this.done(t, day) })),
      routineDays: this.st.routineDays.length, xpToday: this.st.awards[day]?.xp || 0, pendingXp: this.st.outbox.reduce((n, a) => n + a.amount, 0) };
  }
  history(page = 0) { return clone(this.st.history.slice().reverse().slice(Math.max(0, page) * 50, (Math.max(0, page) + 1) * 50)); }
  line(kind) {
    return this.mutate(() => { const list = TODO_LINES[kind] || TODO_LINES.pending; const i = this.st.lineIndex[kind] || 0; this.st.lineIndex[kind] = i + 1; return list[i % list.length]; });
  }
  reminders({ focus = false, fullscreen = false } = {}) {
    this.sync(); if (focus || fullscreen || !this.st.settings.notifications || !this.st.settings.reminders) return [];
    const p = civilParts(this.now(), this.st.settings.zone); const hm = `${p.hour}:${p.minute}`;
    const candidates = this.st.tasks.filter(t => t.reminder && t.time === hm && this.scheduled(t, this.st.day) && !this.done(t, this.st.day));
    const fresh = candidates.filter(t => !this.st.notifications[`${this.st.day}:${t.id}:${t.time}`]);
    if (fresh.length) this.mutate(() => { for (const t of fresh) this.st.notifications[`${this.st.day}:${t.id}:${t.time}`] = true; });
    return fresh.map(t => ({ id: t.id, title: t.title }));
  }
  export() { return { format: 'JoJoTasks', version: 1, exportedAt: new Date(this.now()).toISOString(), data: clone(this.st) }; }
  import(input) {
    if (input?.format !== 'JoJoTasks' || input.version !== 1) throw new Error('Não é uma exportação de tarefas do JoJo.');
    const data = validateTodo(input.data); this.sync();
    return this.mutate(() => {
      let added = 0; const ids = new Set(this.st.tasks.map(t => t.id));
      for (const t of data.tasks) if (!ids.has(t.id)) { this.st.tasks.push(t); ids.add(t.id); added++; }
      for (const c of data.categories) if (!this.st.categories.some(x => x.id === c.id)) this.st.categories.push(c);
      // Não importar XP/outbox/configuração financeira; importar não gera recompensas.
      for (const h of data.history) if (!this.st.history.some(x => x.taskId === h.taskId && x.at === h.at && x.completed === h.completed)) this.st.history.push(h);
      const a = this.st.awards[this.st.day] ||= { keys: [], xp: 0 };
      for (const t of data.tasks) if (this.done(t, this.st.day)) {
        for (const key of [`id:${t.id}`, `title:${normalize(t.title)}`]) if (!a.keys.includes(key)) a.keys.push(key);
        if (['once', 'never'].includes(t.frequency)) {
          const once = this.st.awards.once ||= [];
          for (const key of [t.id, `title:${normalize(t.title)}`]) if (!once.includes(key)) once.push(key);
        }
      }
      return { added };
    });
  }
}
