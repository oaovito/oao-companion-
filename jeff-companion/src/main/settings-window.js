// Janela de configurações (janela comum, com moldura; aparece na barra de
// tarefas apenas enquanto aberta).
import { BrowserWindow } from 'electron';

export class SettingsWindow {
  constructor({ preloadPath, htmlPath, iconPath }) {
    this.preloadPath = preloadPath;
    this.htmlPath = htmlPath;
    this.iconPath = iconPath;
    this.win = null;
  }

  open() {
    if (this.win && !this.win.isDestroyed()) {
      if (this.win.isMinimized()) this.win.restore();
      this.win.show();
      this.win.focus();
      return;
    }
    this.win = new BrowserWindow({
      width: 600,
      height: 780,
      minWidth: 480,
      minHeight: 520,
      title: 'Jeff Companion — Configurações',
      icon: this.iconPath,
      autoHideMenuBar: true,
      show: false,
      backgroundColor: '#f4f7fb',
      webPreferences: { preload: this.preloadPath, contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
    });
    this.win.setMenu(null);
    this.win.webContents.on('will-navigate', (e) => e.preventDefault());
    this.win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    this.win.once('ready-to-show', () => this.win.show());
    this.win.on('closed', () => {
      this.win = null;
    });
    this.win.loadFile(this.htmlPath);
  }

  send(ch, payload) {
    if (this.win && !this.win.isDestroyed()) this.win.webContents.send(ch, payload);
  }

  get isOpen() {
    return !!(this.win && !this.win.isDestroyed());
  }

  close() {
    if (this.isOpen) this.win.close();
  }
}
