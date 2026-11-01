const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsApi', {
  load: () => ipcRenderer.invoke('settings:get'),
  todo: (request) => ipcRenderer.invoke('todo:request', request),
  onTodoChanged: (fn) => ipcRenderer.on('todo:changed', (_e, s) => fn(s)),
  set: (patch) => ipcRenderer.invoke('settings:set', patch),
  reset: () => ipcRenderer.invoke('settings:reset'),
  openFolder: () => ipcRenderer.send('settings:open-folder'),
  togglePet: () => ipcRenderer.invoke('settings:pet'),
  setPersonality: (patch) => ipcRenderer.invoke('personality:set', patch),
  resetPersonality: () => ipcRenderer.invoke('personality:reset'),
  openPersonalityFile: () => ipcRenderer.send('personality:open-file'),
  onChanged: (fn) => ipcRenderer.on('settings:changed', (_e, info) => fn(info)),
});
