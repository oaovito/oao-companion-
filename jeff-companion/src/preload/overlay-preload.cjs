// Ponte mínima e validada entre o overlay (renderer isolado) e o processo principal.
const { contextBridge, ipcRenderer } = require('electron');

const ACTIONS = new Set(['pet', 'eat', 'play']);

contextBridge.exposeInMainWorld('jeff', {
  getAssets: () => ipcRenderer.invoke('jeff:get-assets'),
  onState: (fn) => ipcRenderer.on('jeff:state', (_e, s) => fn(s)),
  onVisible: (fn) => ipcRenderer.on('jeff:visible', (_e, v) => fn(!!v)),
  onMouseMode: (fn) => ipcRenderer.on('jeff:mouse-mode', (_e, s) => fn(s)),
  onMeasure: (fn) => ipcRenderer.on('jeff:measure', (_e, req) => fn(req)),
  reportMeasure: (id, size) => ipcRenderer.send('jeff:bubble-size', id, size),
  setCapture: (on) => ipcRenderer.send('jeff:capture', !!on),
  activity: () => ipcRenderer.send('jeff:activity'),
  interact: (action) => ACTIONS.has(action) && ipcRenderer.send('jeff:interact', action),
  setChatOpen: (open) => ipcRenderer.send('jeff:chat-open', !!open),
  chat: (text) => ipcRenderer.invoke('jeff:chat', String(text).slice(0, 500)),
  dragStart: () => ipcRenderer.send('jeff:drag-start'),
  dragEnd: () => ipcRenderer.send('jeff:drag-end'),
  exitInteraction: () => ipcRenderer.send('jeff:exit-interaction'),
  openSettings: () => ipcRenderer.send('jeff:open-settings'),
  platform: process.platform,
});
