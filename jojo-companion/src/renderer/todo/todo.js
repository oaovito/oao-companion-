import { TodoView } from '../shared/todo-view.js';
import { ProgressView } from '../shared/progress-view.js';
const api = window.appApi;
const xp = new ProgressView(document.getElementById('progression'));
const view = new TodoView(document.getElementById('tasks'), api, { openSettings: () => api.openTodoSettings(), onProgress: s => xp.render(s) });
api.onUpdate(s => { view.refresh(); if (s.colecao) xp.render(s.colecao, { quiet: s.trabalho }); });
await view.refresh();
