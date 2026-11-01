// Ponte mínima e validada entre o overlay (renderer isolado) e o processo principal.
const { contextBridge, ipcRenderer } = require('electron');

const ACTIONS = new Set(['pet', 'eat', 'play', 'fidget', 'estimulo']);
const GESTURES = new Set(['clique', 'duploClique', 'segurar', 'cocegas', 'jogar', 'bolha']);

contextBridge.exposeInMainWorld('jojo', {
  getAssets: () => ipcRenderer.invoke('jojo:get-assets'),
  needs: (request) => ipcRenderer.invoke('needs:request', request),
  onState: (fn) => ipcRenderer.on('jojo:state', (_e, s) => fn(s)),
  onVisible: (fn) => ipcRenderer.on('jojo:visible', (_e, v) => fn(!!v)),
  onMouseMode: (fn) => ipcRenderer.on('jojo:mouse-mode', (_e, s) => fn(s)),
  onMeasure: (fn) => ipcRenderer.on('jojo:measure', (_e, req) => fn(req)),
  reportMeasure: (id, size) => ipcRenderer.send('jojo:bubble-size', id, size),
  setCapture: (on) => ipcRenderer.send('jojo:capture', !!on),
  activity: () => ipcRenderer.send('jojo:activity'),
  interact: (action) => ACTIONS.has(action) && ipcRenderer.send('jojo:interact', action),
  gesture: (g) => GESTURES.has(g) && ipcRenderer.send('jojo:gesture', g),
  setChatOpen: (open) => ipcRenderer.send('jojo:chat-open', !!open),
  chat: (text) => ipcRenderer.invoke('jojo:chat', String(text).slice(0, 500)),
  dragStart: () => ipcRenderer.send('jojo:drag-start'),
  dragEnd: () => ipcRenderer.send('jojo:drag-end'),
  exitInteraction: () => ipcRenderer.send('jojo:exit-interaction'),
  openSettings: () => ipcRenderer.send('jojo:open-settings'),
  openApp: (id) => ipcRenderer.send('jojo:open-app', id ? String(id) : null),
  setReducedMotion: (on) => ipcRenderer.send('jojo:reduced-motion', !!on),
  platform: process.platform,
});
