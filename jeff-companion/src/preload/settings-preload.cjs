const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsApi', {
  load: () => ipcRenderer.invoke('settings:get'),
  set: (patch) => ipcRenderer.invoke('settings:set', patch),
  reset: () => ipcRenderer.invoke('settings:reset'),
  openFolder: () => ipcRenderer.send('settings:open-folder'),
  onChanged: (fn) => ipcRenderer.on('settings:changed', (_e, info) => fn(info)),
});
