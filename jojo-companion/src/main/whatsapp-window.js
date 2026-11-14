// Janela das mensagens programadas no WhatsApp (janela comum, com moldura).
import { BrowserWindow } from 'electron';

export class WhatsAppWindow {
  constructor({ preloadPath, htmlPath, iconPath }) {
    Object.assign(this, { preloadPath, htmlPath, iconPath });
    this.win = null;
  }

  open() {
    if (this.isOpen) {
      if (this.win.isMinimized()) this.win.restore();
      this.win.show();
      this.win.focus();
      return;
    }
    this.win = new BrowserWindow({
      width: 620, height: 780, minWidth: 460, minHeight: 520,
      title: 'JoJo Companion — WhatsApp', icon: this.iconPath, autoHideMenuBar: true, show: false, backgroundColor: '#f4f7fb',
      webPreferences: { preload: this.preloadPath, contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true },
    });
    this.win.setMenu(null);
    this.win.webContents.on('will-navigate', (e) => e.preventDefault());
    this.win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    this.win.once('ready-to-show', () => this.win.show());
    this.win.on('closed', () => { this.win = null; });
    this.win.loadFile(this.htmlPath);
  }

  send(ch, payload) {
    if (this.isOpen) this.win.webContents.send(ch, payload);
  }

  get isOpen() {
    return !!(this.win && !this.win.isDestroyed());
  }

  close() {
    if (this.isOpen) this.win.close();
  }
}
