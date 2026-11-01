import { ipcMain, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { AtomicState } from '../core/atomic-state.js';
import { TodoModel, validateTodo, emptyTodo } from '../core/todo.js';
import { TodoChat } from '../core/todo-chat.js';
import { TodoWindow } from './todo-window.js';

export function createTodoService({ userData, root, icon, companion, fromApp, fromSettings, appWin, settingsWin, log }) {
  const disk = new AtomicState(path.join(userData, 'tasks.json'), { validate: validateTodo, defaults: emptyTodo, log });
  const model = new TodoModel({ state: disk.load(), save: st => disk.write(st), award: reward => {
    const result = companion.progress.award(reward);
    if (result.amount > 0 && !companion.work && !companion.focus && !companion.fullscreenHidden && !companion.suspended) {
      companion.react('happy');
      if (result.levelUp) companion.fireEvent('nivel', { speak: false });
    }
    return result;
  } });
  const blocked = () => !!(companion.work || companion.focus || companion.fullscreenHidden || companion.suspended || companion.fullscreenIds?.length);
  const state = () => ({ todo: model.snapshot(), colecao: companion.progress.snapshot(new Date()), trabalho: !!companion.work });
  const dock = new TodoWindow({ preloadPath: path.join(root, 'src/preload/app-preload.cjs'), htmlPath: path.join(root, 'src/renderer/todo/index.html'), iconPath: icon, state: () => model.snapshot() });
  dock.blocked = blocked;
  dock.onHide = () => model.configure({ visible: false });
  let timer = null;
  function update() {
    dock.apply(model.st.settings, blocked());
    clearTimeout(timer); timer = setTimeout(() => {
      const s = state(); appWin.send('app:todo-update', s); dock.send(s);
      settingsWin.send('todo:changed', s.todo);
    }, 40);
  }
  model.onChange = update;
  companion.todoChat = new TodoChat(model);
  companion.onRoutineTick = () => {
    model.sync(); model.drain(); dock.apply(model.st.settings, blocked());
    const due = model.reminders({ focus: blocked() || !companion._canNag(), fullscreen: companion.fullscreenHidden });
    if (due.length) companion.say(`${model.line('reminder')} ${due.slice(0, 3).map(t => t.title).join(', ')}${due.length > 3 ? ` e mais ${due.length - 3}` : ''}.`, 'speech', { spontaneous: true, category: 'tarefas' });
  };
  const fromDock = e => dock.isOpen && e.sender === dock.win.webContents;
  const authorized = e => fromApp(e) || fromSettings(e) || fromDock(e);
  ipcMain.handle('todo:request', async (e, request) => {
    if (!authorized(e) || !request || typeof request !== 'object') return { error: 'Solicitação indisponível.' };
    const { action, id, data } = request;
    try {
      let result;
      switch (action) {
        case 'snapshot': return { snapshot: model.snapshot(data || {}) };
        case 'add': result = model.add(data || {}); break;
        case 'edit': result = model.edit(id, data || {}); break;
        case 'complete': result = model.complete(id, data === true); break;
        case 'remove': result = model.remove(id, data === true); break;
        case 'move': result = model.move(id, typeof data === 'string' ? data : null); break;
        case 'settings': result = model.configure(data || {}); break;
        case 'category': result = model.category(data || {}, id || null); break;
        case 'remove-category':
          if (model.st.settings.confirmDelete && data !== true) return { result: { needsConfirmation: true }, snapshot: model.snapshot() };
          result = model.category({}, id, true); break;
        case 'history': return { history: model.history(Number(data) || 0) };
        case 'export': {
          const chosen = await dialog.showSaveDialog({ title: 'Exportar tarefas', defaultPath: 'JoJo-Tarefas.json', filters: [{ name: 'JSON', extensions: ['json'] }] });
          if (chosen.canceled) return { canceled: true };
          fs.writeFileSync(chosen.filePath, JSON.stringify(model.export(), null, 2), { mode: 0o600 });
          result = { exported: true }; break;
        }
        case 'import': {
          const chosen = await dialog.showOpenDialog({ title: 'Importar tarefas', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
          if (chosen.canceled) return { canceled: true };
          if (fs.statSync(chosen.filePaths[0]).size > 128 * 1024 * 1024) throw new Error('A exportação excede o limite seguro de leitura (128 MB).');
          result = model.import(JSON.parse(fs.readFileSync(chosen.filePaths[0], 'utf8'))); break;
        }
        default: return { error: 'Operação de tarefas desconhecida.' };
      }
      update(); return { result, snapshot: model.snapshot(), progress: companion.progress.snapshot(new Date()) };
    } catch (error) {
      log('warn', 'Operação da lista de tarefas não foi confirmada.');
      // Não incluir caminhos/descrições do sistema em mensagens de erro do renderer.
      return { error: error.code ? 'Não consegui salvar ou ler as tarefas. A alteração não foi confirmada.' : String(error.message).slice(0, 240) };
    }
  });
  ipcMain.on('todo:open-settings', e => authorized(e) && settingsWin.open());
  ipcMain.on('todo:open-central', e => authorized(e) && companion.openApp('tarefas'));
  update();
  return { model, update, dock, guard: () => dock.apply(model.st.settings, blocked()), close: () => { clearTimeout(timer); dock.close(); ipcMain.removeHandler('todo:request'); } };
}
