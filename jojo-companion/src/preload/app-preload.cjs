const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appApi', {
  state: () => ipcRenderer.invoke('app:state'),
  select: (id) => ipcRenderer.invoke('app:select', String(id)),
  send: (id, text) => ipcRenderer.invoke('app:send', String(id), String(text).slice(0, 500)),
  newChat: () => ipcRenderer.invoke('app:new'),
  togglePet: () => ipcRenderer.invoke('app:pet'),
  openSettings: () => ipcRenderer.send('app:settings'),
  todo: (request) => ipcRenderer.invoke('todo:request', request),
  openTodoSettings: () => ipcRenderer.send('todo:open-settings'),
  openTodoCentral: () => ipcRenderer.send('todo:open-central'),
  onTodoUpdate: (fn) => ipcRenderer.on('app:todo-update', (_e, s) => fn(s)),
  onUpdate: (fn) => ipcRenderer.on('app:update', (_e, s) => fn(s)),
  onSelect: (fn) => ipcRenderer.on('app:select', (_e, id) => fn(id)),
});
