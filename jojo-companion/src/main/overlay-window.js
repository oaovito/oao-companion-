// Janela overlay do JoJo: transparente, sem moldura, fora da barra de tarefas,
// sempre por cima, sem foco e com click-through real (WS_EX_TRANSPARENT via
// setIgnoreMouseEvents). Implementa o adaptador "overlay" usado pelo Companion.
import { BrowserWindow } from 'electron';
import path from 'node:path';

export class OverlayWindow {
  constructor({ preloadPath, htmlPath, log, onBlur, onCrash }) {
    this.log = log;
    this.preloadPath = preloadPath;
    this.htmlPath = htmlPath;
    this.onBlur = onBlur;
    this.onCrash = onCrash;
    this.mouseMode = 'passthrough';
    this.captureOn = false;
    this.pendingMeasure = new Map();
    this.measureSeq = 0;
    this.ready = false;
    this.queuedState = null;
    this.visible = false;
    this.bounds = { x: 0, y: 0, width: 180, height: 150 };
    this._create();
  }

  _create() {
    const win = new BrowserWindow({
      ...this.bounds,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      focusable: false,
      alwaysOnTop: true,
      thickFrame: false,
      roundedCorners: false,
      type: 'toolbar',
      title: 'JoJo',
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        spellcheck: false,
        backgroundThrottling: false,
        devTools: process.env.JOJO_DEVTOOLS === '1',
      },
    });
    this.win = win;
    win.setAlwaysOnTop(true, 'floating');
    win.setIgnoreMouseEvents(true);
    win.setMenu(null);
    win.on('blur', () => this.onBlur && this.onBlur());
    win.webContents.on('render-process-gone', (_e, details) => {
      this.log('error', `Renderer do overlay encerrou: ${details.reason}`);
      this.onCrash && this.onCrash(details);
    });
    // Travou (não responde há 10 s): derruba o renderer para recriar a janela.
    let travado = null;
    win.on('unresponsive', () => {
      clearTimeout(travado);
      travado = setTimeout(() => {
        this.log('error', 'Overlay sem responder; recriando.');
        if (!win.isDestroyed()) win.webContents.forcefullyCrashRenderer();
      }, 10e3);
    });
    win.on('responsive', () => clearTimeout(travado));
    win.on('session-end', () => this.onSessionEnd && this.onSessionEnd());
    win.webContents.on('will-navigate', (e) => e.preventDefault());
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('did-finish-load', () => {
      this.ready = true;
      if (this.queuedState) this.render(this.queuedState);
    });
    win.loadFile(this.htmlPath);
  }

  get alive() {
    return this.win && !this.win.isDestroyed();
  }

  setBounds(b) {
    if (!this.alive) return;
    this.bounds = b;
    const cur = this.win.getBounds();
    if (cur.width === b.width && cur.height === b.height) {
      if (cur.x !== b.x || cur.y !== b.y) this.win.setPosition(b.x, b.y, false);
    } else {
      this.win.setBounds(b, false);
    }
    // Em monitores com DPI diferente o Windows pode reescalar a janela ao
    // cruzar a fronteira; reaplica o tamanho correto.
    const got = this.win.getBounds();
    if (got.width !== b.width || got.height !== b.height) this.win.setBounds(b, false);
  }

  setMouseMode(mode) {
    if (!this.alive) return;
    this.mouseMode = mode;
    this.captureOn = false;
    if (mode === 'interactive') {
      this.win.setFocusable(true);
      this.win.setIgnoreMouseEvents(true, { forward: true });
    } else {
      this.win.setIgnoreMouseEvents(true);
      this.win.setFocusable(false);
      if (this.win.isFocused()) this.win.blur();
    }
    this._send('jojo:mouse-mode', { mode, capture: this.captureOn });
  }

  setCapture(on) {
    if (!this.alive || this.mouseMode !== 'interactive') return;
    if (on === this.captureOn) return;
    this.captureOn = on;
    if (on) this.win.setIgnoreMouseEvents(false);
    else this.win.setIgnoreMouseEvents(true, { forward: true });
  }

  show() {
    if (!this.alive) return;
    this.visible = true;
    this._send('jojo:visible', true);
    this.win.showInactive();
    this.win.setAlwaysOnTop(true, 'floating');
  }

  hide() {
    if (!this.alive) return;
    this.visible = false;
    this._send('jojo:visible', false);
    this.win.hide();
  }

  focus() {
    if (!this.alive) return;
    this.win.focus();
    this.win.webContents.focus();
  }

  /** Reafirma "sempre por cima" (a barra de tarefas pode passar à frente). */
  reassertTop() {
    if (this.alive && this.visible) {
      this.win.setAlwaysOnTop(true, 'floating');
      this.win.moveTop();
    }
  }

  render(state) {
    if (!this.ready) {
      this.queuedState = state;
      return;
    }
    this._send('jojo:state', state);
  }

  _send(ch, payload) {
    if (this.alive && this.ready) this.win.webContents.send(ch, payload);
  }

  measureBubble(req) {
    if (!this.ready) return Promise.resolve(estimateBubble(req));
    const id = ++this.measureSeq;
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        this.pendingMeasure.delete(id);
        resolve(estimateBubble(req));
      }, 500);
      this.pendingMeasure.set(id, (size) => {
        clearTimeout(t);
        resolve(size);
      });
      this._send('jojo:measure', { id, ...req });
    });
  }

  resolveMeasure(id, size) {
    const fn = this.pendingMeasure.get(id);
    if (!fn) return;
    this.pendingMeasure.delete(id);
    const ok = size && Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0 && size.width < 1200 && size.height < 900;
    fn(ok ? { width: Math.ceil(size.width), height: Math.ceil(size.height) } : null);
  }

  /** Converte um ponto da janela para coordenadas de tela (DIP). */
  toScreen(p) {
    return { x: this.bounds.x + p.x, y: this.bounds.y + p.y };
  }

  recreate() {
    try {
      if (this.alive) this.win.destroy();
    } catch {
      /* ignora */
    }
    this.ready = false;
    this.mouseMode = 'passthrough';
    this._create();
    if (this.visible) this.win.once('ready-to-show', () => this.show());
  }

  destroy() {
    if (this.alive) this.win.destroy();
  }
}

function estimateBubble({ text, scale = 1, longo = false }) {
  const chars = String(text || '').length;
  const largura = longo ? 400 : 260;
  const w = Math.min(largura, 48 + chars * 7.2) * scale;
  const lines = Math.max(1, Math.ceil((chars * 7.2) / (largura - 40)));
  const h = (30 + lines * 20) * scale;
  return { width: Math.round(w), height: Math.round(longo ? Math.min(h, 240 * scale) : h) };
}

export const OVERLAY_HTML = (root) => path.join(root, 'src', 'renderer', 'overlay', 'index.html');
