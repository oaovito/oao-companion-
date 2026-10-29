// Ponto de entrada do processo principal (Electron).
// Conecta o Companion (lógica pura em src/core) às APIs do sistema.
import { app, screen, powerMonitor, ipcMain, globalShortcut, dialog, shell, BrowserWindow, net } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Companion } from '../core/companion.js';
import { SettingsStore } from '../core/settings-store.js';
import { DEFAULTS } from '../core/settings-schema.js';
import { sanitizePersonality, PERSONALITY_DEFAULTS } from '../core/personality.js';
import { DialogueEngine } from '../core/dialogue/engine.js';
import { WebSearch } from '../core/dialogue/web-search.js';
import { createLogger } from './logger.js';
import { OverlayWindow } from './overlay-window.js';
import { SettingsWindow } from './settings-window.js';
import { AppWindow } from './app-window.js';
import { commandMenu } from '../core/conversations.js';
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
  // Perfil de personalidade: arquivo separado, editável (personality.json).
  const personality = new SettingsStore(userData, {
    log,
    fileName: 'personality.json',
    sanitize: sanitizePersonality,
    defaults: PERSONALITY_DEFAULTS,
    keepOnReset: ['lembreteComida'],
  });
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
    personality.flush();
  });

  app.whenReady().then(() => startApp()).catch((e) => {
    log('error', `Falha ao iniciar: ${e.stack || e.message}`);
    dialog.showErrorBox('Jeff Companion', `Não foi possível iniciar o Jeff.\n\n${e.message}\n\nDetalhes em: ${log.file}`);
    app.exit(1);
  });

  function startApp() {
    store.load();
    personality.load();
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
    // Pesquisa na internet (só para perguntas sem resposta programada; desligável).
    // Em testes, JEFF_SEARCH_BASE aponta para um servidor local falso.
    const searchBase = TEST && process.env.JEFF_SEARCH_BASE ? process.env.JEFF_SEARCH_BASE : null;
    const webSearch = new WebSearch({
      fetch: (url, opts) => net.fetch(url, opts),
      userAgent: `JeffCompanion/${app.getVersion()} (projeto de fã; desktop)`,
      bases: searchBase ? { wikipedia: searchBase, duckduckgo: `${searchBase}/ddg` } : {},
      log,
    });
    const dialogue = new DialogueEngine({ log, search: webSearch, searchEnabled: () => store.get().webSearch });

    companion = new Companion({ platform, overlay, clock, store, personality, rig: assets.rig, phrases, dialogue, log });

    // Esc global SOMENTE enquanto o modo de interação está ativo: o Windows nem
    // sempre entrega o foco do teclado à janela ativada por atalho. Fora do modo
    // de interação o Esc nunca é capturado.
    companion.onInteractionChange = (active) => {
      try {
        if (active) {
          if (!globalShortcut.isRegistered('Escape')) globalShortcut.register('Escape', () => companion.exitInteraction('escape'));
        } else if (globalShortcut.isRegistered('Escape')) {
          globalShortcut.unregister('Escape');
        }
      } catch (err) {
        log('warn', `Esc do modo de interação: ${err.message}`);
      }
      trayCtl && trayCtl.refresh();
    };

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
    ipcMain.on('jeff:open-app', (e, id) => fromOverlay(e) && companion.openApp(id ? String(id) : null));
    ipcMain.on('jeff:reduced-motion', (e, on) => {
      if (!fromOverlay(e)) return;
      systemReducedMotion = !!on;
      applyReducedMotion();
    });

    // ---------------- Redução de movimento (sistema ou configuração)
    let systemReducedMotion = false;
    function applyReducedMotion() {
      const mode = store.get().reduceMotion;
      companion.setReducedMotion(mode === 'on' || (mode === 'system' && systemReducedMotion));
    }

    // ---------------- Central do JoJo (janela principal do app)
    const appWin = new AppWindow({
      preloadPath: path.join(ROOT, 'src', 'preload', 'app-preload.cjs'),
      htmlPath: path.join(ROOT, 'src', 'renderer', 'app', 'index.html'),
      iconPath: appIcon,
      onVisibility: (showing) => {
        // Conversa aberta na Central conta como "vista".
        const conv = companion.conversations.current();
        companion.conversations.setViewing(conv.id, showing);
      },
    });
    const fromApp = (e) => appWin.isOpen && e.sender === appWin.win.webContents;
    function appState() {
      const conv = companion.conversations.current();
      return {
        companionName: companion.companionName,
        petVisible: !companion.userHidden,
        conversations: companion.conversations.list(),
        currentId: conv.id,
        current: companion.conversations.snapshot(conv.id),
        commands: commandMenu({ petVisible: !companion.userHidden }),
        provider: dialogue.describe(),
      };
    }
    let appUpdateTimer = null;
    companion.onConversationsChange = () => {
      clearTimeout(appUpdateTimer);
      appUpdateTimer = setTimeout(() => {
        appWin.send('app:update', appState());
        trayCtl && trayCtl.refresh();
      }, 60);
    };
    companion.onOpenApp = (id) => appWin.open(id);
    companion.onOpenSettings = () => openSettings();
    ipcMain.handle('app:state', (e) => (fromApp(e) ? appState() : null));
    ipcMain.handle('app:select', (e, id) => {
      if (!fromApp(e)) return null;
      const prev = companion.conversations.current().id;
      companion.conversations.setViewing(prev, false);
      companion.conversations.setCurrent(id);
      companion.conversations.setViewing(id, appWin.isShowing);
      return appState();
    });
    ipcMain.handle('app:send', async (e, id, text) => (fromApp(e) ? companion.chat(text, id) : null));
    ipcMain.handle('app:new', (e) => {
      if (!fromApp(e)) return null;
      const c = companion.conversations.newChat();
      companion.conversations.setViewing(c.id, true);
      return appState();
    });
    ipcMain.handle('app:pet', (e) => {
      if (fromApp(e)) companion.runCommand('pet');
      return appState();
    });
    ipcMain.on('app:settings', (e) => fromApp(e) && openSettings());

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
    ipcMain.handle('settings:pet', (e) => {
      if (fromSettings(e)) companion.runCommand('pet');
      return settingsInfo();
    });
    ipcMain.handle('personality:set', (e, patch) => {
      if (!fromSettings(e) || !patch || typeof patch !== 'object') return settingsInfo();
      personality.update(patch);
      return settingsInfo();
    });
    ipcMain.handle('personality:reset', (e) => {
      if (fromSettings(e)) personality.reset();
      return settingsInfo();
    });
    ipcMain.on('personality:open-file', (e) => {
      if (!fromSettings(e)) return;
      personality.saveNow();
      shell.openPath(personality.file);
    });
    personality.onChange((p, changed) => {
      log('info', `Perfil de personalidade alterado: ${changed.join(', ')}`);
      companion.applyPersonality(p);
      trayCtl && trayCtl.refresh();
      if (changed.includes('instagram')) startFullscreenWatch();
      settingsWin.send('settings:changed', settingsInfo());
    });

    store.onChange((s, changed) => {
      log('info', `Configurações alteradas: ${changed.join(', ')}`);
      if (changed.includes('interactionHotkey')) registerHotkey();
      if (changed.includes('startWithWindows')) applyAutostart();
      if (changed.includes('reduceMotion')) applyReducedMotion();
      if (changed.includes('webSearch')) {
        appWin.send('app:update', appState());
        companion._applyLayout(true);
      }
      if (changed.includes('visible')) appWin.send('app:update', appState());
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
        personality: personality.get(),
        personalityFile: personality.file,
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
        foreground: { available: !!fullscreen?.available, platform: process.platform },
        dialogue: dialogue.describe(),
        version: app.getVersion(),
        paths: { userData, log: log.file },
        loadIssues: store.loadIssues,
        petVisible: !companion.userHidden,
        companionName: companion.companionName,
      };
    }

    function openSettings() {
      settingsWin.open();
    }

    // ---------------- Atalho global
    let registeredHotkey = null;
    function registerHotkey() {
      if (registeredHotkey) globalShortcut.unregister(registeredHotkey);
      registeredHotkey = null;
      const acc = store.get().interactionHotkey;
      let ok = false;
      let error = null;
      try {
        ok = globalShortcut.register(acc, () => companion.toggleInteraction('hotkey'));
        if (ok) registeredHotkey = acc;
        if (!ok) error = 'O atalho já está em uso por outro aplicativo ou não é permitido. Use a bandeja ou escolha outro.';
      } catch (err) {
        error = `Atalho inválido: ${err.message}`;
      }
      hotkeyStatus = { ok, accelerator: acc, error };
      companion.reportSystem('atalho', 'Sistema: atalho', ok ? null : `Não consegui registrar o atalho ${acc}. ${error} Use a bandeja para o modo de interação.`);
      log(ok ? 'info' : 'warn', ok ? `Atalho registrado: ${acc}` : `Falha ao registrar atalho ${acc}: ${error}`);
      trayCtl && trayCtl.refresh();
      settingsWin && settingsWin.send('settings:changed', settingsInfo());
    }

    // ---------------- Iniciar com o Windows
    function loginOptions() {
      // No .exe portátil, process.execPath é a cópia temporária extraída: o
      // Windows deve abrir o próprio JeffCompanion.exe.
      return { path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath, args: app.isPackaged ? ['--autostart'] : [app.getAppPath(), '--autostart'] };
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
      const wantFullscreen = () => store.get().fullscreenBehavior !== 'ignore';
      const wantInstagram = () => personality.get().instagram.ativo;
      if (!wantFullscreen() && !wantInstagram()) return;
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
          companion.reportSystem('detector', 'Sistema: detector de janelas', `Detecção de tela cheia e do Instagram parou: ${fullscreen.reason || 'falha'}.`);
          companion.setFullscreenDisplays([]);
          settingsWin.send('settings:changed', settingsInfo());
          return;
        }
        busy = true;
        try {
          const res = await fullscreen.detect((r) => screen.screenToDipRect(null, r), screen.getAllDisplays(), { instagram: wantInstagram() });
          companion.setFullscreenDisplays(wantFullscreen() ? res.fullscreenIds : []);
          companion.onForeground({ instagram: wantInstagram() && res.instagram });
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
        name: personality.get().nomeCompanion || 'JoJo',
        activities: companion.conversations.activities(6),
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
        openApp: (id) => companion.openApp(id || null),
        about: () =>
          dialog.showMessageBox({
            type: 'info',
            title: 'Sobre o Jeff Companion',
            message: `${personality.get().nomeCompanion || 'JoJo'} — Jeff Companion ${app.getVersion()}`,
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
    // Ociosidade do sistema: só o contador de segundos sem uso (não lê teclas nem cliques).
    let idleOverride = null;
    const idleTimer = setInterval(() => {
      try {
        companion.onSystemIdle(idleOverride ?? powerMonitor.getSystemIdleTime());
      } catch (err) {
        log('warn', `Falha ao ler ociosidade: ${err.message}`);
      }
    }, 3000);
    app.on('will-quit', () => clearInterval(idleTimer));
    log('info', `Pronto${process.env.PORTABLE_EXECUTABLE_FILE ? ' (executável portátil)' : ''}.`);
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
        personality,
        appWin,
        setIdle: (sec) => {
          idleOverride = sec == null ? null : Number(sec);
          return companion.onSystemIdle(idleOverride ?? 0);
        },
        setTargetTitle: (id, title) => BrowserWindow.fromId(id)?.setTitle(title),
      };
    }
  }
}
