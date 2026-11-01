// Painel opcional. A Central permanece acessível manualmente durante o foco.
import { BrowserWindow, screen } from 'electron';
export class TodoWindow {
  constructor({ preloadPath, htmlPath, iconPath, state }) {
    Object.assign(this, { preloadPath, htmlPath, iconPath, state }); this.win = null; this.boundsKey = '';
  }
  get isOpen() { return !!this.win && !this.win.isDestroyed(); }
  apply(settings, blocked) {
    if (!settings.visible || blocked) { if (this.isOpen && this.win.isVisible()) this.win.hide(); return; }
    if (!this.isOpen) {
      this.win = new BrowserWindow({ width: settings.width, height: settings.height, minWidth: 300, minHeight: 300,
        title: 'JoJo — Lista de Tarefas', icon: this.iconPath, autoHideMenuBar: true, show: false, skipTaskbar: true,
        webPreferences: { preload: this.preloadPath, contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false } });
      this.win.setMenu(null); this.win.webContents.on('will-navigate', e => e.preventDefault());
      this.win.on('close', e => { if (!this.closing) { e.preventDefault(); this.onHide?.(); if (this.isOpen) this.win.hide(); } });
      this.win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      this.win.on('closed', () => { this.win = null; this.boundsKey = ''; });
      this.win.loadFile(this.htmlPath);
      this.win.once('ready-to-show', () => { if (this.isOpen) this.apply(this.state().settings, this.blocked?.() || false); });
    }
    const area = screen.getPrimaryDisplay().workArea;
    const width = Math.round(Math.min(area.width, settings.width)); const height = Math.round(Math.min(area.height, settings.height));
    const x = settings.position === 'left' ? area.x : settings.position === 'center' ? area.x + (area.width - width) / 2 : area.x + area.width - width;
    const bounds = { x: Math.round(x), y: area.y, width, height }; const key = JSON.stringify(bounds);
    if (this.boundsKey !== key) { this.win.setBounds(bounds); this.boundsKey = key; }
    if (this.opacity !== settings.opacity) { this.win.setOpacity(settings.opacity); this.opacity = settings.opacity; }
    if (!this.win.webContents.isLoading() && !this.win.isVisible()) this.win.showInactive();
  }
  send(state) { if (this.isOpen) this.win.webContents.send('app:update', state); }
  close() { this.closing = true; if (this.isOpen) this.win.close(); }
}
