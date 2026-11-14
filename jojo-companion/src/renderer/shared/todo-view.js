import { xpVisivel, XP_ESCALA } from '../../core/xp-escala.js';
// A mesma lista real na Central e no painel opcional; nenhum dado sai deste PC.
export function node(tag, className, content) {
  const e = document.createElement(tag); if (className) e.className = className;
  if (content != null) e.textContent = content; return e;
}
function button(label, action, className = '') {
  const b = node('button', className, label); b.type = 'button'; b.addEventListener('click', action); return b;
}
function input(type, value = '') { const e = node('input'); e.type = type; e.value = value; return e; }
function select(options, value) {
  const e = node('select'); for (const [v, label] of options) e.add(new Option(label, v)); e.value = value; return e;
}
function field(label, control) { const e = node('label', 'todo-field'); e.append(node('span', '', label), control); return e; }
const frequencies = [['daily', 'Todos os dias'], ['weekdays', 'Dias da semana'], ['weekly', 'Semanal'], ['once', 'Uma vez'], ['never', 'Sem reinício']];
const priorities = [['simple', `Simples · ${xpVisivel(5)} XP`], ['normal', `Normal · ${xpVisivel(10)} XP`], ['important', `Importante · ${xpVisivel(20)} XP`]];

export class TodoView {
  constructor(root, api, { openSettings = () => {}, onProgress = () => {} } = {}) {
    this.root = root; this.api = api; this.openSettings = openSettings; this.onProgress = onProgress;
    this.query = { page: 0, filter: 'all', category: '', search: '' };
    this.state = null; this.error = node('p', 'todo-error'); this.error.setAttribute('role', 'alert');
    root.classList.add('todo-panel');
    const top = node('div', 'todo-top');
    const title = node('div'); title.append(node('small', 'todo-kicker', 'ROTINA DA EMANUELE'), node('h2', '', 'Uma coisa de cada vez.'));
    top.append(title, button('Configurações', () => this.openSettings(), 'todo-subtle'));
    this.summary = node('p', 'todo-summary'); this.progress = node('progress'); this.progress.max = 100; this.progress.setAttribute('aria-label', 'Progresso diário');
    this.date = input('date'); this.date.setAttribute('aria-label', 'Data da lista');
    this.date.addEventListener('change', () => { this.query.day = this.date.value; this.query.page = 0; this.refresh(); });
    this.filter = select([['all', 'Todas'], ['pending', 'Pendentes'], ['completed', 'Concluídas']], 'all'); this.filter.setAttribute('aria-label', 'Filtrar tarefas');
    this.filter.addEventListener('change', () => { this.query.filter = this.filter.value; this.query.page = 0; this.refresh(); });
    this.category = select([['', 'Todas as categorias']], ''); this.category.setAttribute('aria-label', 'Categoria');
    this.category.addEventListener('change', () => { this.query.category = this.category.value; this.query.page = 0; this.refresh(); });
    const search = input('search'); search.placeholder = 'Buscar tarefa'; search.setAttribute('aria-label', 'Buscar tarefa');
    let searchTimer; search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { this.query.search = search.value; this.query.page = 0; this.refresh(); }, 180); });
    const controls = node('div', 'todo-controls'); controls.append(this.date, this.filter, this.category, search);
    const actions = node('div', 'todo-actions');
    actions.append(button('+ Adicionar tarefa', () => this.editor(), 'todo-primary'), button('Categorias', () => this.categoryEditor()), button('Histórico', () => this.history()));
    this.archived = input('checkbox'); this.archived.addEventListener('change', () => { this.query.includeArchived = this.archived.checked; this.refresh(); });
    const archiveLabel = field('Incluir arquivadas e futuras', this.archived);
    this.list = node('div', 'todo-list'); this.list.setAttribute('aria-label', 'Tarefas');
    this.pager = node('div', 'todo-pager');
    const transfers = node('div', 'todo-actions todo-transfer'); transfers.append(button('Exportar', () => this.request('export')), button('Importar', async () => {
      if (this.state?.settings.confirmDelete && !confirm('Mesclar tarefas deste arquivo? Nada será apagado e importar não gera XP.')) return;
      const r = await this.request('import'); if (r?.result) this.error.textContent = `${r.result.added} tarefa(s) importada(s).`;
    }));
    root.append(top, this.summary, this.progress, controls, actions, archiveLabel, this.error, this.list, this.pager, transfers);
  }
  async request(action, data, id) {
    const r = await this.api.todo({ action, id, data });
    this.error.textContent = r?.error || '';
    if (r?.progress) this.onProgress(r.progress);
    if (r?.snapshot) { this.state = r.snapshot; await this.refresh(); }
    return r;
  }
  async refresh() {
    const r = await this.api.todo({ action: 'snapshot', data: this.query });
    if (r?.error) { this.error.textContent = r.error; return; }
    if (r?.snapshot) this.render(r.snapshot);
  }
  render(s) {
    this.state = s; this.root.dataset.theme = s.settings.theme; this.root.classList.toggle('no-animation', !s.settings.animations);
    this.date.value = s.day;
    this.summary.textContent = `${s.completed}/${s.total} concluídas · ${s.pending} pendentes${s.settings.showPercent ? ` · ${s.percent}%` : ''}${s.settings.xpEnabled ? ` · +${xpVisivel(s.xpToday)} XP hoje` : ''}`;
    this.progress.value = s.percent;
    const selected = this.category.value; this.category.replaceChildren(new Option('Todas as categorias', ''));
    for (const c of s.categories) this.category.add(new Option(c.name, c.id)); this.category.value = selected;
    this.list.replaceChildren();
    if (!s.tasks.length) this.list.append(node('p', 'todo-empty', 'Nenhuma tarefa neste filtro. A lista é sua; o caos pode esperar.'));
    const done = s.settings.collapseCompleted ? node('details', 'todo-completed') : null;
    if (done) done.append(node('summary', '', 'Tarefas concluídas'));
    for (const t of s.tasks) {
      const row = node('article', `todo-task${t.completed ? ' is-done' : ''}`); row.dataset.id = t.id;
      row.draggable = s.settings.sort === 'manual';
      row.addEventListener('dragstart', e => { e.dataTransfer.setData('application/x-jojo-task', t.id); e.dataTransfer.effectAllowed = 'move'; });
      row.addEventListener('dragover', e => { if (s.settings.sort === 'manual') e.preventDefault(); });
      row.addEventListener('drop', e => { e.preventDefault(); const id = e.dataTransfer.getData('application/x-jojo-task'); if (id && id !== t.id) this.request('move', t.id, id); });
      const check = input('checkbox'); check.checked = t.completed; check.disabled = s.day !== s.currentDay || !t.scheduled;
      check.setAttribute('aria-label', `Concluir ${t.title}`);
      check.addEventListener('change', () => { check.disabled = true; this.request('complete', check.checked, t.id); });
      const content = node('div', 'todo-task-content'); const name = button(t.title, () => this.editor(t), 'todo-task-title');
      content.append(name);
      const meta = [priorities.find(p => p[0] === t.priority)?.[1].split(' · ')[0], s.categories.find(c => c.id === t.category)?.name, t.time, t.due, t.archived ? 'Arquivada' : null].filter(Boolean);
      content.append(node('small', 'todo-meta', meta.join(' · ')));
      if (t.description) content.append(node('p', 'todo-description', t.description));
      const more = button('⋯', () => this.editor(t), 'todo-more'); more.setAttribute('aria-label', `Editar ${t.title}`);
      row.append(check, content, more);
      if (done && t.completed) done.append(row); else this.list.append(row);
    }
    if (done && done.children.length > 1) this.list.append(done);
    this.pager.replaceChildren();
    if (s.count > s.pageSize) {
      const prev = button('Anterior', () => { this.query.page = Math.max(0, s.page - 1); this.refresh(); }); prev.disabled = s.page === 0;
      const next = button('Próxima', () => { this.query.page = s.page + 1; this.refresh(); }); next.disabled = (s.page + 1) * s.pageSize >= s.count;
      this.pager.append(prev, node('span', '', `${s.page + 1}/${Math.ceil(s.count / s.pageSize)}`), next);
    }
  }
  modal(title) {
    const dialog = node('dialog', 'todo-dialog'); const form = node('form', 'todo-editor');
    form.append(node('h2', '', title)); dialog.append(form); document.body.append(dialog);
    dialog.addEventListener('close', () => dialog.remove());
    const close = () => dialog.close(); return { dialog, form, close };
  }
  editor(t = null) {
    if (!this.state) return;
    const { dialog, form, close } = this.modal(t ? 'Editar tarefa' : 'Nova tarefa');
    const title = input('text', t?.title || ''); title.required = true; title.maxLength = 200; title.autofocus = true;
    const description = node('textarea'); description.value = t?.description || ''; description.maxLength = 4000;
    const priority = select(priorities, t?.priority || 'normal');
    const category = select([['', 'Sem categoria'], ...this.state.categories.map(c => [c.id, c.name])], t?.category || '');
    const frequency = select(frequencies, t?.frequency || this.state.settings.defaultFrequency);
    const due = input('date', t?.due || ''); const time = input('time', t?.time || '');
    const xp = input('number', t?.xp == null ? '' : xpVisivel(t.xp)); xp.min = 0; xp.max = xpVisivel(50); xp.step = XP_ESCALA; xp.placeholder = 'Usar categoria / prioridade';
    const reminder = input('checkbox'); reminder.checked = t?.reminder !== false;
    const weekdays = node('div', 'todo-weekdays'); const dayInputs = [];
    for (const [day, label] of ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].entries()) {
      const control = input('checkbox'); control.checked = (t?.weekdays || [1, 2, 3, 4, 5]).includes(day); dayInputs.push(control); weekdays.append(field(label, control));
    }
    const dayVisibility = () => { weekdays.hidden = frequency.value !== 'weekdays'; };
    frequency.addEventListener('change', dayVisibility); dayVisibility();
    form.append(field('Título', title), field('Descrição', description), field('Prioridade', priority), field('Categoria', category), field('Repetir', frequency), weekdays,
      field('Data / prazo opcional', due), field('Horário opcional', time), field('Lembrete silencioso', reminder), field(`XP personalizado (0–${xpVisivel(50)})`, xp));
    const message = node('p', 'todo-error'); message.setAttribute('role', 'alert'); form.append(message);
    const actions = node('div', 'todo-actions');
    const save = node('button', 'todo-primary', 'Salvar'); save.type = 'submit'; actions.append(save, button('Cancelar', close));
    if (t) {
      actions.append(button(t.archived ? 'Restaurar' : 'Arquivar', async () => { const r = await this.request('edit', { archived: !t.archived }, t.id); if (!r?.error) close(); }));
      actions.append(button('Excluir', async () => {
        if (this.state.settings.confirmDelete && !confirm(`Excluir “${t.title}”? O histórico será preservado.`)) return;
        const r = await this.request('remove', true, t.id); if (!r?.error) close();
      }, 'todo-danger'));
      if (this.state.settings.sort === 'manual') {
        actions.append(button('Mover para o fim', async () => { await this.request('move', null, t.id); close(); }));
      }
    }
    form.append(actions);
    form.addEventListener('submit', async e => {
      e.preventDefault(); save.disabled = true;
      const data = { title: title.value, description: description.value, priority: priority.value, category: category.value, frequency: frequency.value,
        due: due.value, time: time.value, reminder: reminder.checked, xp: xp.value === '' ? null : Math.round(Number(xp.value) / XP_ESCALA), weekdays: dayInputs.flatMap((x, i) => x.checked ? [i] : []) };
      const r = await this.request(t ? 'edit' : 'add', data, t?.id); save.disabled = false;
      if (r?.error) message.textContent = r.error; else close();
    });
    dialog.showModal(); title.focus();
  }
  categoryEditor() {
    const { dialog, form, close } = this.modal('Categorias'); const list = node('div');
    for (const c of this.state.categories) {
      const name = input('text', c.name); name.setAttribute('aria-label', 'Nome da categoria'); name.maxLength = 80;
      const xp = input('number', c.xp == null ? '' : xpVisivel(c.xp)); xp.min = 0; xp.max = xpVisivel(50); xp.step = XP_ESCALA; xp.setAttribute('aria-label', 'XP da categoria');
      const row = node('div', 'todo-actions'); row.append(name, xp, button('Salvar', () => this.request('category', { name: name.value, xp: xp.value === '' ? null : Math.round(Number(xp.value) / XP_ESCALA) }, c.id)), button('Excluir', async () => {
        if (this.state.settings.confirmDelete && !confirm(`Excluir a categoria “${c.name}”? As tarefas serão mantidas.`)) return;
        await this.request('remove-category', true, c.id); close();
      })); list.append(row);
    }
    const name = input('text'); name.placeholder = 'Nova categoria'; name.maxLength = 80;
    form.append(list, field('Nome', name), button('Criar categoria', async () => { const r = await this.request('category', { name: name.value }); if (!r?.error) close(); }), button('Fechar', close));
    form.addEventListener('submit', e => e.preventDefault()); dialog.showModal();
  }
  async history() {
    const { dialog, form, close } = this.modal('Histórico de conclusões'); let page = 0;
    const list = node('div'); const label = node('p'); const next = button('Próxima', () => load(++page));
    const load = async n => {
      const r = await this.api.todo({ action: 'history', data: n }); list.replaceChildren();
      for (const h of r.history || []) list.append(node('p', '', `${h.completed ? '✓' : '○'} ${h.title} · ${h.day}`));
      if (!r.history?.length) list.append(node('p', '', 'Nenhum registro neste período.'));
      next.disabled = (r.history?.length || 0) < 50; label.textContent = `Página ${n + 1}`;
    };
    form.append(list, label, button('Anterior', () => load(page = Math.max(0, page - 1))), next, button('Fechar', close));
    form.addEventListener('submit', e => e.preventDefault()); dialog.showModal(); await load(page);
  }
}

export class TodoSettings {
  constructor(root, api) { this.root = root; this.api = api; }
  async load() { const r = await this.api.todo({ action: 'snapshot' }); if (r?.snapshot) this.render(r.snapshot); }
  render(snapshot) {
    if (this.root.contains(document.activeElement) && document.activeElement.tagName !== 'BODY') return;
    this.root.replaceChildren(); const s = snapshot.settings;
    const description = node('p', 'hint', 'Tarefas e histórico ficam neste PC. O painel separado é opcional; a lista sempre pode ser aberta manualmente na Central. Sem sons.');
    this.root.append(description); const error = node('p', 'todo-error'); error.setAttribute('role', 'alert');
    const options = [
      ['visible', 'Exibir painel separado', 'checkbox'], ['width', 'Largura do painel (px)', 'number', 300, 800], ['height', 'Altura do painel (px)', 'number', 300, 1000],
      ['position', 'Posição do painel', [['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']]],
      ['opacity', 'Opacidade (0,45–1)', 'number', 0.45, 1, 0.05], ['theme', 'Tema', [['ocean', 'Oceano'], ['night', 'Noite'], ['plum', 'Ameixa'], ['forest', 'Floresta']]],
      ['showPercent', 'Exibir porcentagem', 'checkbox'], ['showCompleted', 'Exibir concluídas', 'checkbox'], ['collapseCompleted', 'Recolher concluídas', 'checkbox'],
      ['sort', 'Ordenação', [['manual', 'Manual / arrastar'], ['priority', 'Prioridade'], ['time', 'Horário'], ['title', 'Título']]], ['animations', 'Animações da lista', 'checkbox'],
      ['resetTime', 'Horário de reinício', 'time'], ['zone', 'Fuso horário (local ou nome IANA)', 'text'], ['autoReset', 'Reinício automático', 'checkbox'],
      ['defaultFrequency', 'Recorrência padrão de novas tarefas', frequencies], ['notifications', 'Notificações discretas', 'checkbox'], ['reminders', 'Lembretes individuais', 'checkbox'],
      ['confirmDelete', 'Confirmar exclusões', 'checkbox'], ['archiveCompleted', 'Arquivar visualmente concluídas', 'checkbox'],
      ['historyDays', 'Retenção do histórico (dias)', 'number', 7, 3650], ['xpEnabled', 'Ganhar XP por tarefas', 'checkbox'],
    ];
    for (const [key, label, type, min, max, step] of options) {
      const control = Array.isArray(type) ? select(type, s[key]) : input(type, s[key]);
      if (type === 'checkbox') control.checked = s[key]; if (min != null) control.min = min; if (max != null) control.max = max; if (step) control.step = step;
      control.dataset.todoSetting = key;
      control.addEventListener('change', async () => {
        const value = type === 'checkbox' ? control.checked : type === 'number' ? Number(control.value) : control.value;
        const r = await this.api.todo({ action: 'settings', data: { [key]: value } }); error.textContent = r?.error || '';
        if (r?.snapshot) { const v = r.snapshot.settings[key]; if (type === 'checkbox') control.checked = v; else control.value = v; }
      }); this.root.append(field(label, control));
    }
    this.root.append(node('p', 'hint', `XP: ${xpVisivel(5)} / ${xpVisivel(10)} / ${xpVisivel(20)} por prioridade; +${xpVisivel(50)} pela rotina completa e +${xpVisivel(150)} por sete dias distintos. Limite: ${xpVisivel(500)} XP/dia. Personalize categorias e tarefas na lista (até ${xpVisivel(50)} XP por tarefa). Desmarcar não retira XP e remarcar não premia novamente.`), error);
  }
}
