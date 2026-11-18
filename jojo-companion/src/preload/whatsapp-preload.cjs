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
  fotos: (jids) => ipcRenderer.invoke('whatsapp:fotos', (Array.isArray(jids) ? jids : []).slice(0, 60).map(String)),
  tentarDeNovo: (id) => ipcRenderer.invoke('whatsapp:tentar-de-novo', String(id)),
  onUpdate: (fn) => ipcRenderer.on('whatsapp:update', (_e, s) => fn(s)),
  onFotos: (fn) => ipcRenderer.on('whatsapp:fotos', (_e, f) => fn(f)),
  onTela: (fn) => ipcRenderer.on('whatsapp:tela', (_e, t) => fn(String(t))),
});
