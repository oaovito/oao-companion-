// Ponte mínima e validada entre o overlay (renderer isolado) e o processo principal.
const { contextBridge, ipcRenderer } = require('electron');

const ACTIONS = new Set(['pet', 'eat', 'play', 'fidget', 'estimulo']);
const GESTURES = new Set(['clique', 'duploClique', 'segurar', 'cocegas', 'jogar', 'bolha']);

contextBridge.exposeInMainWorld('jojo', {
  ready: () => ipcRenderer.send('jojo:renderer-ready'),
  getAssets: () => ipcRenderer.invoke('jojo:get-assets'),
  needs: (request) => ipcRenderer.invoke('needs:request', request),
  onBadges: fn => ipcRenderer.on('jojo:badges', (_e, icons) => fn(icons)),
  onState: (fn) => ipcRenderer.on('jojo:state', (_e, s) => fn(s)),
  onAnimationCheck: fn => ipcRenderer.on('jojo:animation-check', (_e, r) => fn(r)),
  reportAnimation: (id, ok) => ipcRenderer.send('jojo:animation-result', id, ok === true),
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
  // Relógio dos timers: só estas duas ações, com números validados.
  timer: (m) => m && (m.acao === 'alternar' || (m.acao === 'mover' && Number.isFinite(m.dx) && Number.isFinite(m.dy))) && ipcRenderer.send('jojo:timer', { acao: m.acao, dx: Math.max(-2000, Math.min(2000, Math.round(m.dx || 0))), dy: Math.max(-2000, Math.min(2000, Math.round(m.dy || 0))) }),
  platform: process.platform,
});
