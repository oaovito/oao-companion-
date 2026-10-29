// Ponto de entrada do processo principal (Electron).
// Conecta o Companion (lógica pura em src/core) às APIs do sistema.
import { app, screen, powerMonitor, ipcMain, globalShortcut, dialog, shell, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Companion } from '../core/companion.js';
import { SettingsStore } from '../core/settings-store.js';
import { DEFAULTS } from '../core/settings-schema.js';
import { DialogueEngine } from '../core/dialogue/engine.js';
import { createLogger } from './logger.js';
import { OverlayWindow } from './overlay-window.js';
import { SettingsWindow } from './settings-window.js';
import { createTray } from './tray.js';
import { createFullscreenDetector, hwndToString } from './fullscreen-monitor.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEST = process.env.JEFF_TEST === '1';
const IS_WIN = process.platform === 'win32';

if (process.env.JEFF_USER_DATA) app.setPath('userData', path.resolve(process.env.JEFF_USER_DATA));
app.setName('Jeff Companion');
if (IS_WIN) app.setAppUserModelId('com.fanmade.jeffcompanion');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  main();
}

function readJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function main() {
  const userData = app.getPath('userData');
  const log = createLogger(path.join(userData, 'logs'), { echo: TEST || !app.isPackaged });
  const store = new SettingsStore(userData, { log });
  let companion = null;
  let overlay = null;
  let trayCtl = null;
  let settingsWin = null;
  let fullscreen = null;
  let fullscreenTimer = null;
  let topTimer = null;
  let hotkeyStatus = { ok: false, accelerator: null, error: 'não registrado' };
  let cursorOverride = null;
  let quitting = false;

  process.on('uncaughtException', (e) => {
    log('error', `Exceção não tratada: ${e.stack || e.message}`);
    // Segurança: nunca deixar o overlay capturando cliques após um erro.
    try {
      if (companion && companion.interaction) companion.exitInteraction('error');
      else if (overlay) overlay.setMouseMode('passthrough');
    } catch {
      /* ignora */
    }
  });

  process.on('unhandledRejection', (e) => {
    log('error', `Promise rejeitada sem tratamento: ${(e && e.stack) || e}`);
  });

  app.on('second-instance', () => {
    log('info', 'Segunda instância detectada; mantendo a atual.');
    if (companion) companion.notifyAlreadyRunning();
  });

  app.on('window-all-closed', (e) => e.preventDefault?.());

  app.on('before-quit', () => {
    quitting = true;
    store.flush();
  });

  app.whenReady().then(() => startApp()).catch((e) => {
    log('error', `Falha ao iniciar: ${e.stack || e.message}`);
    dialog.showErrorBox('Jeff Companion', `Não foi possível iniciar o Jeff.\n\n${e.message}\n\nDetalhes em: ${log.file}`);
    app.exit(1);
  });

  function startApp() {
    store.load();
    log('info', `Iniciando Jeff Companion ${app.getVersion()} (${process.platform}, Electron ${process.versions.electron})`);
    const assets = {
      rig: readJSON('assets/character/jeff.rig.json'),
      animations: readJSON('assets/animations/jeff.animations.json'),
    };
    const phrases = readJSON('assets/dialogue/pt-BR.json');
    const iconPath = path.join(ROOT, 'assets', 'icons', IS_WIN ? 'tray.ico' : 'tray.png');
    const appIcon = path.join(ROOT, 'assets', 'icons', IS_WIN ? 'app.ico' : 'app.png');

    overlay = new OverlayWindow({
      preloadPath: path.join(ROOT, 'src', 'preload', 'overlay-preload.cjs'),
      htmlPath: path.join(ROOT, 'src', 'renderer', 'overlay', 'index.html'),
      log,
      onBlur: () => companion && companion.onBlur(),
      onCrash: () => {
        if (quitting) return;
        setTimeout(() => {
          overlay.recreate();
          companion.lastRender = '';
          companion.lastBounds = null;
          companion.overlay.setMouseMode('passthrough');
          companion._applyLayout(true);
        }, 500);
      },
    });

    const platform = {
      getCursor: () => cursorOverride || screen.getCursorScreenPoint(),
      getDisplays: () => screen.getAllDisplays().map((d) => ({ id: d.id, bounds: d.bounds, workArea: d.workArea, scaleFactor: d.scaleFactor, label: d.label })),
      primaryDisplayId: () => screen.getPrimaryDisplay().id,
    };
    const clock = {
      now: () => performance.now(),
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (id) => clearTimeout(id),
    };
    const dialogue = new DialogueEngine({ log });

    companion = new Companion({ platform, overlay, clock, store, rig: assets.rig, phrases, dialogue, log });

    // ---------------- IPC do overlay
    const fromOverlay = (e) => overlay.alive && e.sender === overlay.win.webContents;
    ipcMain.handle('jeff:get-assets', (e) => (fromOverlay(e) ? assets : null));
    ipcMain.on('jeff:bubble-size', (e, id, size) => fromOverlay(e) && overlay.resolveMeasure(id, size));
    ipcMain.on('jeff:capture', (e, on) => fromOverlay(e) && companion.setCapture(!!on));
    ipcMain.on('jeff:activity', (e) => fromOverlay(e) && companion.noteActivity());
    ipcMain.on('jeff:interact', (e, a) => fromOverlay(e) && companion.interact(String(a)));
    ipcMain.on('jeff:chat-open', (e, open) => fromOverlay(e) && companion.setChatOpen(!!open));
    ipcMain.handle('jeff:chat', async (e, text) => (fromOverlay(e) ? companion.chat(String(text).slice(0, 500)) : null));
    ipcMain.on('jeff:drag-start', (e) => {
      if (!fromOverlay(e)) return;
      const c = platform.getCursor();
      companion.dragStart({ x: c.x - companion.pos.x, y: c.y - companion.pos.y });
    });
    ipcMain.on('jeff:drag-end', (e) => fromOverlay(e) && companion.dragEnd());
    ipcMain.on('jeff:exit-interaction', (e) => fromOverlay(e) && companion.exitInteraction('escape'));
    ipcMain.on('jeff:open-settings', (e) => fromOverlay(e) && openSettings());

    // ---------------- Configurações
    settingsWin = new SettingsWindow({
      preloadPath: path.join(ROOT, 'src', 'preload', 'settings-preload.cjs'),
      htmlPath: path.join(ROOT, 'src', 'renderer', 'settings', 'index.html'),
      iconPath: appIcon,
    });
    const fromSettings = (e) => settingsWin.isOpen && e.sender === settingsWin.win.webContents;
    ipcMain.handle('settings:get', (e) => (fromSettings(e) ? settingsInfo() : null));
    ipcMain.handle('settings:set', (e, patch) => {
      if (!fromSettings(e) || !patch || typeof patch !== 'object') return settingsInfo();
      const clean = { ...patch };
      delete clean.position;
      delete clean.version;
      store.update(clean);
      return settingsInfo();
    });
    ipcMain.handle('settings:reset', (e) => {
      if (fromSettings(e)) store.reset();
      return settingsInfo();
    });
    ipcMain.on('settings:open-folder', (e) => fromSettings(e) && shell.openPath(userData));

    store.onChange((s, changed) => {
      log('info', `Configurações alteradas: ${changed.join(', ')}`);
      if (changed.includes('interactionHotkey')) registerHotkey();
      if (changed.includes('startWithWindows')) applyAutostart();
      if (changed.includes('fullscreenBehavior')) {
        startFullscreenWatch();
        if (s.fullscreenBehavior === 'ignore') companion.setFullscreenDisplays([]);
      }
      companion.applySettings(s, changed);
      trayCtl && trayCtl.refresh();
      settingsWin.send('settings:changed', settingsInfo());
    });

    function settingsInfo() {
      const prim = screen.getPrimaryDisplay().id;
      return {
        settings: store.get(),
        defaults: DEFAULTS,
        displays: screen.getAllDisplays().map((d, i) => ({
          id: String(d.id),
          label: d.label || `Monitor ${i + 1}`,
          primary: d.id === prim,
          scaleFactor: d.scaleFactor,
          size: `${d.size.width}×${d.size.height}`,
        })),
        hotkey: hotkeyStatus,
        autostart: { supported: IS_WIN || process.platform === 'darwin', packaged: app.isPackaged },
        fullscreen: { available: !!fullscreen?.available, reason: fullscreen?.reason || null },
        dialogue: dialogue.describe(),
        version: app.getVersion(),
        paths: { userData, log: log.file },
        loadIssues: store.loadIssues,
      };
    }

    function openSettings() {
      settingsWin.open();
    }

    // ---------------- Atalho global
    function registerHotkey() {
      globalShortcut.unregisterAll();
      const acc = store.get().interactionHotkey;
      let ok = false;
      let error = null;
      try {
        ok = globalShortcut.register(acc, () => companion.toggleInteraction('hotkey'));
        if (!ok) error = 'O atalho já está em uso por outro aplicativo ou não é permitido. Use a bandeja ou escolha outro.';
      } catch (err) {
        error = `Atalho inválido: ${err.message}`;
      }
      hotkeyStatus = { ok, accelerator: acc, error };
      log(ok ? 'info' : 'warn', ok ? `Atalho registrado: ${acc}` : `Falha ao registrar atalho ${acc}: ${error}`);
      trayCtl && trayCtl.refresh();
      settingsWin && settingsWin.send('settings:changed', settingsInfo());
    }

    // ---------------- Iniciar com o Windows
    function loginOptions() {
      return { path: process.execPath, args: app.isPackaged ? ['--autostart'] : [app.getAppPath(), '--autostart'] };
    }

    function applyAutostart() {
      if (!(IS_WIN || process.platform === 'darwin')) return;
      const enabled = store.get().startWithWindows;
      try {
        app.setLoginItemSettings({ openAtLogin: enabled, ...loginOptions() });
        log('info', `Iniciar com o sistema: ${enabled}`);
      } catch (err) {
        log('warn', `Falha ao configurar inicialização: ${err.message}`);
      }
    }

    // ---------------- Tela cheia
    function startFullscreenWatch() {
      clearInterval(fullscreenTimer);
      if (store.get().fullscreenBehavior === 'ignore') return;
      if (!fullscreen) {
        fullscreen = createFullscreenDetector(log);
        if (fullscreen.available && overlay.alive) fullscreen.setOwnHandles([hwndToString(overlay.win.getNativeWindowHandle())].filter(Boolean));
      }
      if (!fullscreen.available) return;
      let busy = false;
      fullscreenTimer = setInterval(async () => {
        if (companion.suspended || busy) return;
        if (!fullscreen.available) {
          clearInterval(fullscreenTimer);
          companion.setFullscreenDisplays([]);
          settingsWin.send('settings:changed', settingsInfo());
          return;
        }
        busy = true;
        try {
          const ids = await fullscreen.detect((r) => screen.screenToDipRect(null, r), screen.getAllDisplays());
          companion.setFullscreenDisplays(ids);
        } catch (err) {
          log('warn', `Falha na detecção de tela cheia: ${err.message}`);
        } finally {
          busy = false;
        }
      }, 1500);
    }

    // ---------------- Monitores e energia
    let displayTimer = null;
    const onDisplays = (why) => {
      clearTimeout(displayTimer);
      displayTimer = setTimeout(() => {
        log('info', `Topologia de monitores mudou (${why})`);
        companion.onDisplaysChanged();
        settingsWin.send('settings:changed', settingsInfo());
      }, 300);
    };
    screen.on('display-added', () => onDisplays('adicionado'));
    screen.on('display-removed', () => onDisplays('removido'));
    screen.on('display-metrics-changed', () => onDisplays('métricas'));
    powerMonitor.on('suspend', () => {
      log('info', 'Suspensão');
      companion.onSuspend();
      store.flush();
    });
    powerMonitor.on('resume', () => {
      log('info', 'Retomada');
      setTimeout(() => companion.onResume(), 800);
    });
    powerMonitor.on('lock-screen', () => companion.onSuspend());
    powerMonitor.on('unlock-screen', () => companion.onResume());

    // ---------------- Bandeja
    trayCtl = createTray({
      iconPath,
      getState: () => ({
        interaction: companion.interaction,
        visible: !companion.userHidden,
        paused: store.get().paused,
        quiet: store.get().quietMode,
        hotkey: store.get().interactionHotkey,
        hotkeyOk: hotkeyStatus.ok,
      }),
      actions: {
        toggleInteraction: () => {
          companion.toggleInteraction('tray');
          trayCtl.refresh();
        },
        toggleVisible: () => store.update({ visible: companion.userHidden }),
        togglePaused: () => store.update({ paused: !store.get().paused }),
        toggleQuiet: () => store.update({ quietMode: !store.get().quietMode }),
        openSettings,
        about: () =>
          dialog.showMessageBox({
            type: 'info',
            title: 'Sobre o Jeff Companion',
            message: `Jeff Companion ${app.getVersion()}`,
            detail:
              'Companion de desktop feito por fãs, inspirado no Jeff, o Tubarão Terrestre.\n' +
              'Projeto não oficial, sem vínculo com a Marvel ou a Disney.\n\n' +
              'Arte atual: desenho vetorial articulado provisório.\n' +
              'Funciona totalmente offline. Não coleta dados.',
          }),
        quit: () => quit(),
      },
    });

    async function quit() {
      if (quitting) return;
      quitting = true;
      clearInterval(fullscreenTimer);
      clearInterval(topTimer);
      try {
        await Promise.race([companion.goodbye(), new Promise((r) => setTimeout(r, 1800))]);
      } catch {
        /* ignora */
      }
      companion.stop();
      if (fullscreen) fullscreen.dispose();
      store.flush();
      globalShortcut.unregisterAll();
      trayCtl.destroy();
      app.quit();
    }

    app.on('will-quit', () => globalShortcut.unregisterAll());

    registerHotkey();
    applyAutostart();
    startFullscreenWatch();
    companion.start();
    trayCtl.refresh();
    topTimer = setInterval(() => !companion.interaction && overlay.reassertTop(), 8000);

    if (store.loadIssues.length) log('warn', `Problemas ao carregar configurações: ${store.loadIssues.join('; ')}`);

    if (TEST) {
      globalThis.__jeff = {
        companion,
        overlay,
        store,
        settingsInfo,
        openSettings,
        quit,
        setCursor: (p) => {
          cursorOverride = p ? { x: p.x, y: p.y } : null;
        },
        hotkeyStatus: () => hotkeyStatus,
        registerHotkey,
        // Janela comum que registra cliques: usada para provar que cliques atravessam o Jeff.
        async makeClickTarget(bounds, { fullscreen = false } = {}) {
          const w = new BrowserWindow({ ...bounds, show: false, frame: false, fullscreen, title: 'Jeff test target', webPreferences: { sandbox: true } });
          await w.loadURL('data:text/html,' + encodeURIComponent('<body style="margin:0;background:#cfe0f5"><script>window.__clicks=[];addEventListener("mousedown",e=>window.__clicks.push({x:e.screenX,y:e.screenY}));</script></body>'));
          w.show();
          w.focus();
          return w.id;
        },
        readClicks: (id) => BrowserWindow.fromId(id).webContents.executeJavaScript('window.__clicks'),
        targetFocused: (id) => BrowserWindow.fromId(id).isFocused(),
        targetHwnd: (id) => hwndToString(BrowserWindow.fromId(id).getNativeWindowHandle()),
        overlayHwnd: () => hwndToString(overlay.win.getNativeWindowHandle()),
        closeTarget: (id) => BrowserWindow.fromId(id)?.destroy(),
        loginItem: () => app.getLoginItemSettings(loginOptions()),
        fullscreenInfo: () => ({ available: !!fullscreen?.available, reason: fullscreen?.reason || null }),
        primaryScale: () => screen.getPrimaryDisplay().scaleFactor,
      };
    }
  }
}
