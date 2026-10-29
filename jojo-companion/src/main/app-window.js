// Janela principal do app ("Central do JoJo"): conversas, status e comandos.
// É o "app" que o clique no pet e nas atividades traz para o primeiro plano.
import { BrowserWindow } from 'electron';

export class AppWindow {
  constructor({ preloadPath, htmlPath, iconPath, onVisibility }) {
    this.preloadPath = preloadPath;
    this.htmlPath = htmlPath;
    this.iconPath = iconPath;
    this.onVisibility = onVisibility;
    this.win = null;
    this.pendingOpen = null;
  }

  get isOpen() {
    return !!(this.win && !this.win.isDestroyed());
  }

  get isShowing() {
    return this.isOpen && this.win.isVisible() && !this.win.isMinimized();
  }

  /** Abre (ou traz para frente) e, opcionalmente, vai direto a uma conversa. */
  open(conversationId = null) {
    if (this.isOpen) {
      if (this.win.isMinimized()) this.win.restore();
      this.win.show();
      this.win.focus();
      if (conversationId) this.send('app:select', conversationId);
      return;
    }
    this.pendingOpen = conversationId;
    this.win = new BrowserWindow({
      width: 760,
      height: 560,
      minWidth: 520,
      minHeight: 380,
      title: 'JoJo',
      icon: this.iconPath,
      autoHideMenuBar: true,
      show: false,
      backgroundColor: '#f4f7fb',
      webPreferences: { preload: this.preloadPath, contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
    });
    this.win.setMenu(null);
    this.win.webContents.on('will-navigate', (e) => e.preventDefault());
    this.win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    this.win.once('ready-to-show', () => {
      this.win.show();
      this.win.focus();
      if (this.pendingOpen) this.send('app:select', this.pendingOpen);
      this.pendingOpen = null;
    });
    for (const ev of ['show', 'hide', 'minimize', 'restore', 'focus']) this.win.on(ev, () => this.onVisibility && this.onVisibility(this.isShowing));
    this.win.on('closed', () => {
      this.win = null;
      this.onVisibility && this.onVisibility(false);
    });
    this.win.loadFile(this.htmlPath);
  }

  send(ch, payload) {
    if (this.isOpen) this.win.webContents.send(ch, payload);
  }

  close() {
    if (this.isOpen) this.win.close();
  }
}
