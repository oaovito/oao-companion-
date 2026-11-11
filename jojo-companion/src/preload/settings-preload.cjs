const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsApi', {
  load: () => ipcRenderer.invoke('settings:get'),
  todo: (request) => ipcRenderer.invoke('todo:request', request),
  calendar: (request) => ipcRenderer.invoke('calendar:request', request),
  onCalendarChanged: (fn) => ipcRenderer.on('calendar:changed', (_e, s) => fn(s)),
  onTodoChanged: (fn) => ipcRenderer.on('todo:changed', (_e, s) => fn(s)),
  set: (patch) => ipcRenderer.invoke('settings:set', patch),
  reset: () => ipcRenderer.invoke('settings:reset'),
  openFolder: () => ipcRenderer.send('settings:open-folder'),
  openDiscordExtension: () => ipcRenderer.send('settings:discord-extension'),
  togglePet: () => ipcRenderer.invoke('settings:pet'),
  setPersonality: (patch) => ipcRenderer.invoke('personality:set', patch),
  resetPersonality: () => ipcRenderer.invoke('personality:reset'),
  openPersonalityFile: () => ipcRenderer.send('personality:open-file'),
  onChanged: (fn) => ipcRenderer.on('settings:changed', (_e, info) => fn(info)),
});
