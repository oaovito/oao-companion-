const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('waApi', {
  state: () => ipcRenderer.invoke('whatsapp:state'),
  connect: () => ipcRenderer.invoke('whatsapp:connect'),
  disconnect: () => ipcRenderer.invoke('whatsapp:disconnect'),
  save: (dados) => ipcRenderer.invoke('whatsapp:save', dados),
  remove: (id) => ipcRenderer.invoke('whatsapp:remove', String(id)),
  resolver: (id, acao) => ipcRenderer.invoke('whatsapp:resolver', String(id), String(acao)),
  pular: (id) => ipcRenderer.invoke('whatsapp:pular', String(id)),
  reescrever: (texto, opcoes) => ipcRenderer.invoke('whatsapp:reescrever', String(texto).slice(0, 1000), opcoes || {}),
  onUpdate: (fn) => ipcRenderer.on('whatsapp:update', (_e, s) => fn(s)),
});
