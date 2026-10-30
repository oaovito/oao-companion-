// Ponto de entrada do processo principal (Electron).
// Conecta o Companion (lógica pura em src/core) às APIs do sistema.
import { parseIcs } from '../core/calendar.js';
import { wardrobeSnapshot } from '../core/wardrobe.js';
import { criarCerebroLocal } from './cerebro-local.js';
import { expandCatalog } from '../core/catalog/recipes.js';
import { fullCatalog } from '../core/catalog/load.js';
import { app, screen, powerMonitor, ipcMain, globalShortcut, dialog, shell, BrowserWindow, net } from 'electron';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Companion } from '../core/companion.js';
import { SettingsStore } from '../core/settings-store.js';
import { DEFAULTS } from '../core/settings-schema.js';
import { sanitizePersonality, PERSONALITY_DEFAULTS, phraseFilter } from '../core/personality.js';
import { DialogueEngine } from '../core/dialogue/engine.js';
import { WebSearch } from '../core/dialogue/web-search.js';
import { MotorPesquisa } from '../core/dialogue/pesquisa.js';
import dns from 'node:dns';
import { LlmProvider } from '../core/dialogue/llm-provider.js';
import { HOLIDAYS } from '../core/holidays.js';
import { createLogger } from './logger.js';
import { createAutoUpdater } from './auto-update.js';
import { OverlayWindow } from './overlay-window.js';
import { SettingsWindow } from './settings-window.js';
import { AppWindow } from './app-window.js';
import { commandMenu } from '../core/conversations.js';
import { createTray } from './tray.js';
import { createFullscreenDetector, hwndToString } from './fullscreen-monitor.js';
import { criarPresenca, garantirAtalho } from './presenca.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEST = process.env.JOJO_TEST === '1';
const IS_WIN = process.platform === 'win32';

if (process.env.JOJO_USER_DATA) app.setPath('userData', path.resolve(process.env.JOJO_USER_DATA));
app.setName('JoJo Companion');
if (IS_WIN) app.setAppUserModelId('com.jojocompanion.app');
// Leveza: o JoJo é um canvas pequeno. Desenhar no processador dispensa a memória
// do processo de vídeo e, no Windows, a cópia GPU → janela transparente a cada
// quadro. JOJO_GPU=1 religa a aceleração (diagnóstico).
if (process.env.JOJO_GPU !== '1') app.disableHardwareAcceleration();

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  main();
}

/** Amostra de falas do JoJo (respeitando palavrões/drogas do perfil) para guiar a IA. */
function sampleVoice(phrases, profile, n) {
  const filter = phraseFilter(profile);
  const cats = ['idleSpeech', 'instagram', 'joke', 'showOff', 'achievement', 'insulted', 'food_humano', 'wired', 'festa_natal', 'webOutro'];
  const lines = [];
  for (const c of cats) {
    for (const l of (phrases.categories[c] || {}).lines || []) {
      const line = typeof l === 'string' ? { t: l } : l;
      if (filter(line)) lines.push(line.t.replace(/\{nome\}/g, profile.nomeBrincadeira || 'Manu').replace(/\{vocativo\}/g, '').replace(/\{\w+\}/g, ''));
    }
  }
  for (let i = lines.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lines[i], lines[j]] = [lines[j], lines[i]];
  }
  return lines.slice(0, n);
}

function readJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

/** Estado pequeno em JSON (motor de variedade): leitura tolerante e gravação adiada. */
function jsonState(file, log) {
  let data = null;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    data = null;
  }
  let timer = null;
  const flush = () => {
    timer = null;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data));
    } catch (e) {
      log('warn', `Falha ao salvar ${path.basename(file)}: ${e.message}`);
    }
  };
  return {
    get: () => data,
    set: (v) => {
      data = v;
      if (!timer) timer = setTimeout(flush, 2000);
    },
    flush: () => timer && (clearTimeout(timer), flush()),
  };
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

  // Vigia: reabre o JoJo se ele encerrar sem ser pela bandeja (ver presenca.js).
  const presenca = criarPresenca({ app, log });

  app.on('second-instance', (_e, argv = []) => {
    log('info', 'Segunda instância detectada; mantendo a atual.');
    // Conferência do vigia depois de atualizar: a cópia fecha calada.
    if (argv.includes('--vigia')) return;
    if (companion) companion.notifyAlreadyRunning();
  });

  app.on('child-process-gone', (_e, d) => {
    if (d.reason !== 'clean-exit') log('warn', `Processo auxiliar encerrou (${d.type}): ${d.reason}`);
  });

  app.on('window-all-closed', (e) => e.preventDefault?.());

  app.on('before-quit', () => {
    quitting = true;
    store.flush();
    personality.flush();
  });

  // Silêncio absoluto: toda janela do app nasce sem áudio (nenhum som sai, nem por engano).
  app.on('web-contents-created', (_e, wc) => wc.setAudioMuted(true));

  app.whenReady().then(() => startApp()).catch((e) => {
    log('error', `Falha ao iniciar: ${e.stack || e.message}`);
    dialog.showErrorBox('JoJo Companion', `Não foi possível iniciar o JoJo.\n\n${e.message}\n\nDetalhes em: ${log.file}`);
    app.exit(1);
  });

  function startApp() {
    store.load();
    personality.load();
    log('info', `Iniciando JoJo Companion ${app.getVersion()} (${process.platform}, Electron ${process.versions.electron}, pid ${process.pid})`);
    const assets = {
      rig: readJSON('assets/character/jojo.rig.json'),
      // Animações do catálogo (receitas em camadas) entram junto com as feitas à mão.
      animations: expandCatalog(readJSON('assets/animations/jojo.animations.json'), fullCatalog(readJSON)),
    };
    const catalog = fullCatalog(readJSON);
    const ambientLines = readJSON('assets/dialogue/falas-ambientes.json');
    const varietyState = jsonState(path.join(userData, 'variedade.json'), log);
    app.on('will-quit', () => varietyState.flush());
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
    // Em testes, JOJO_SEARCH_BASE aponta para um servidor local falso.
    const searchBase = TEST && process.env.JOJO_SEARCH_BASE ? process.env.JOJO_SEARCH_BASE : null;
    const webSearch = new WebSearch({
      fetch: (url, opts) => net.fetch(url, opts),
      userAgent: `JoJoCompanion/${app.getVersion()} (desktop)`,
      bases: searchBase ? { wikipedia: searchBase, duckduckgo: `${searchBase}/ddg` } : {},
      log,
    });
    // Motor de pesquisa: fontes públicas sem login (Wikipédia, DuckDuckGo, Europe PMC, Crossref,
    // README do MNE_Lab). DNS conferido para nunca buscar endereço da rede interna.
    const pesquisa = new MotorPesquisa({
      fetch: (url, opts) => net.fetch(url, opts),
      web: webSearch,
      resolver: searchBase ? null : async (host) => (await dns.promises.lookup(host, { all: true })).map((a) => a.address),
      bases: searchBase ? { europepmc: `${searchBase}/epmc`, crossref: `${searchBase}/crossref`, mnelab: `${searchBase}/mnelab/README.md` } : {},
      checarUrl: searchBase ? () => true : undefined,
      log,
    });
    // Conversa: Qwen 3.5 2B no Ollama deste PC, instalado sozinho e ligado só enquanto ela conversa.
    // Em testes, JOJO_LLM_BASE aponta para um servidor local falso (e nada é baixado).
    let avisoConversa = null;
    const cerebro = criarCerebroLocal({
      dir: path.join(app.getPath('userData'), 'cerebro'),
      fetch: (url, opts) => net.fetch(url, opts),
      fs: { ...fs.promises, existsSync: fs.existsSync },
      spawn: (cmd, args, opts) => spawn(cmd, args, opts),
      extract: (zip, dest) => new Promise((resolve, reject) => {
        fs.mkdirSync(dest, { recursive: true });
        // tar.exe vem no Windows 10/11 e abre .zip.
        const t = spawn('tar', ['-xf', zip, '-C', dest], { windowsHide: true, stdio: 'ignore' });
        t.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`tar saiu com ${c}`))));
        t.on('error', reject);
      }),
      freeBytes: async (d) => {
        try {
          fs.mkdirSync(d, { recursive: true });
          const st = await fs.promises.statfs(d);
          return st.bavail * st.bsize;
        } catch {
          return Infinity;
        }
      },
      setLowPriority: (pid) => {
        try {
          os.setPriority(pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
        } catch {
          /* sem permissão: segue normal */
        }
      },
      log,
      onStatus: (e) => avisoConversa && avisoConversa(e),
    });
    app.on('will-quit', () => cerebro.parar('encerrando'));
    const llm = new LlmProvider({
      timeoutMs: 25000,
      brain: TEST ? null : cerebro,
      fetch: (url, opts) => net.fetch(url, opts),
      getConfig: () => {
        const s = store.get();
        // Testes automáticos só usam a IA com o servidor falso (nunca a API de verdade).
        const ativo = s.iaAtivo && (!TEST || !!process.env.JOJO_LLM_BASE);
        return { ativo, provedor: s.iaProvedor, chave: s.iaChave, modelo: s.iaModelo };
      },
      getProfile: () => personality.get(),
      getContext: () => ({
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        festa: companion && companion.holiday ? HOLIDAYS[companion.holiday].nome : null,
        ligadao: !!(companion && companion.wired),
      }),
      // Falas reais do JoJo (filtradas pelo perfil) como modelo do jeito dele.
      getExamples: () => sampleVoice(phrases, personality.get(), 10),
      baseOverride: TEST && process.env.JOJO_LLM_BASE ? process.env.JOJO_LLM_BASE : null,
      log,
    });
    const dialogue = new DialogueEngine({ log, search: webSearch, searchEnabled: () => store.get().webSearch, llm, pesquisa });

    companion = new Companion({ platform, overlay, clock, store, personality, rig: assets.rig, room: readJSON('assets/animations/jojo.room.json'), catalog, ambientLines, variety: varietyState,
      antitedio: { rotinas: readJSON('assets/catalog/rotinas.json'), minijogos: readJSON('assets/catalog/minijogos.json'), progressao: readJSON('assets/catalog/progressao.json') }, phrases, dialogue, log });

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
    ipcMain.handle('jojo:get-assets', (e) => (fromOverlay(e) ? assets : null));
    ipcMain.on('jojo:bubble-size', (e, id, size) => fromOverlay(e) && overlay.resolveMeasure(id, size));
    ipcMain.on('jojo:capture', (e, on) => fromOverlay(e) && companion.setCapture(!!on));
    ipcMain.on('jojo:activity', (e) => fromOverlay(e) && companion.noteActivity());
    ipcMain.on('jojo:interact', (e, a) => fromOverlay(e) && companion.interact(String(a)));
    ipcMain.on('jojo:gesture', (e, g) => fromOverlay(e) && companion.gesture(String(g)));
    ipcMain.on('jojo:chat-open', (e, open) => fromOverlay(e) && companion.setChatOpen(!!open));
    ipcMain.handle('jojo:chat', async (e, text) => (fromOverlay(e) ? companion.chat(String(text).slice(0, 500)) : null));
    ipcMain.on('jojo:drag-start', (e) => {
      if (!fromOverlay(e)) return;
      const c = platform.getCursor();
      companion.dragStart({ x: c.x - companion.pos.x, y: c.y - companion.pos.y });
    });
    ipcMain.on('jojo:drag-end', (e) => fromOverlay(e) && companion.dragEnd());
    ipcMain.on('jojo:exit-interaction', (e) => fromOverlay(e) && companion.exitInteraction('escape'));
    ipcMain.on('jojo:open-settings', (e) => fromOverlay(e) && openSettings());
    ipcMain.on('jojo:open-app', (e, id) => fromOverlay(e) && companion.openApp(id ? String(id) : null));
    ipcMain.on('jojo:reduced-motion', (e, on) => {
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
        colecao: { ...companion.progress.snapshot(new Date()), jogos: companion.games ? companion.games.data.jogos.map((j) => ({ id: j.id, nome: j.nome, recorde: companion._record(j.id) == null ? null : companion._fmtRecord(j.id, companion._record(j.id)) })) : [] },
        abrirColecao,
        guardaRoupa: wardrobeSnapshot(store.get().guardaRoupa),
        trabalho: !!companion.work,
        abrirGuardaRoupa,
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
    let abrirColecao = 0;
    let abrirGuardaRoupa = 0;
    companion.onOpenApp = (id) => {
      // A Central pode ainda estar carregando: o pedido do painel vai junto no estado.
      const painel = id === 'colecao' || id === 'guardaRoupa';
      if (id === 'colecao') abrirColecao++;
      if (id === 'guardaRoupa') abrirGuardaRoupa++;
      appWin.open(painel ? null : id);
      if (painel) appWin.send('app:update', appState());
    };

    // Agenda (só leitura, Google ou iCloud): busca o .ics a cada 10 min.
    const calBase = TEST ? process.env.JOJO_CAL_BASE : null;
    const fetchCalendar = async (url) => {
      const res = await net.fetch(calBase ? `${calBase}/basic.ics` : url, { headers: { 'User-Agent': `JoJoCompanion/${app.getVersion()}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!/BEGIN:VCALENDAR/.test(text)) throw new Error('não é uma agenda');
      return parseIcs(text);
    };
    const syncCalendar = async () => {
      const s = store.get();
      if (!s.agendaUrl || !s.agendaAtiva) return;
      try {
        companion.setCalendar({ events: await fetchCalendar(s.agendaUrl) });
        companion.reportSystem('agenda', 'Sistema: Agenda', null);
      } catch (err) {
        log('warn', `Agenda: ${err.message}`);
        companion.setCalendar({ events: companion.calendar.events, error: err.message });
        companion.reportSystem('agenda', 'Sistema: Agenda', `Não consegui ler a agenda (${err.message}).`);
      }
    };
    companion.onCalendarConnect = async (url) => {
      try {
        const events = await fetchCalendar(url);
        store.update({ agendaUrl: url, agendaAtiva: true });
        companion.setCalendar({ events });
        return { ok: true, count: events.length };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    };
    syncCalendar();
    // Primeira vez: progresso do download como atividade (sem fingir resposta enquanto isso).
    avisoConversa = (e = cerebro.estado) => {
      if (!companion || TEST) return;
      const FASE = { baixando: 'Baixando o motor da conversa', instalando: 'Instalando o motor da conversa', ligando: 'Ligando o motor da conversa', baixandoModelo: 'Baixando o cérebro do JoJo (Qwen 3.5 2B)' };
      if (e.fase === 'erro') companion.reportSystem('conversa', 'Sistema: conversa online', `Não consegui preparar a conversa online (${e.erro}). Eu tento de novo na próxima mensagem; enquanto isso respondo do meu jeito.`);
      else if (FASE[e.fase]) {
        const c = companion.conversations.create({ id: 'sistema-conversa', title: 'Sistema: conversa online', kind: 'system' });
        companion.conversations.setStatus(c.id, 'running', `${FASE[e.fase]}${e.progresso ? ` (${e.progresso}%)` : '…'} Só na primeira vez.`);
      } else companion.reportSystem('conversa', 'Sistema: conversa online', null);
    };
    // Conversa ligada: prepara em segundo plano (download na primeira vez, sem esperar a primeira mensagem).
    if (!TEST && store.get().iaAtivo && store.get().iaProvedor === 'ollama') setTimeout(() => cerebro.preparar().then(() => cerebro.usar()).catch(() => {}), 30000);
    const calTimer = setInterval(syncCalendar, 10 * 60e3);
    app.on('will-quit', () => clearInterval(calTimer));
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
      if (changed.includes('agendaUrl') || changed.includes('agendaAtiva')) syncCalendar();
      if (changed.includes('iaAtivo') && !s.iaAtivo) cerebro.parar('conversa desligada');
      log('info', `Configurações alteradas: ${changed.join(', ')}`);
      if (changed.includes('interactionHotkey')) registerHotkey();
      if (changed.includes('startWithWindows')) applyAutostart();
      if (changed.includes('reduceMotion')) applyReducedMotion();
      if (changed.includes('webSearch')) {
        appWin.send('app:update', appState());
        companion._applyLayout(true);
      }
      if (changed.includes('visible') || changed.includes('trabalhoAtivo')) appWin.send('app:update', appState());
      if (changed.includes('trabalhoAtivo')) trayCtl && trayCtl.refresh();
      if (['fullscreenBehavior', 'lolBronca', 'spotifyReacoes'].some((k) => changed.includes(k))) {
        startFullscreenWatch();
        companion.setFullscreenDisplays(companion.fullscreenIds || []);
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
      // Windows deve abrir o próprio JoJoCompanion.exe.
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
      const wantFullscreen = () => true; // proteção de tela cheia sempre ligada
      const wantInstagram = () => personality.get().instagram.ativo;
      const wantLol = () => store.get().lolBronca;
      const wantSpotify = () => store.get().spotifyReacoes;
      if (!wantFullscreen() && !wantInstagram() && !wantLol() && !wantSpotify()) return;
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
          const res = await fullscreen.detect((r) => screen.screenToDipRect(null, r), screen.getAllDisplays(), {
            instagram: wantInstagram(),
            lol: wantLol(),
            spotify: wantSpotify(),
            percepcao: store.get().percepcaoTela,
            spotifyExe: TEST ? process.env.JOJO_SPOTIFY_EXE : undefined,
          });
          companion.setFullscreenDisplays(wantFullscreen() ? res.fullscreenIds : []);
          companion.onForeground({ instagram: wantInstagram() && res.instagram, lol: wantLol() && res.lol });
          companion.onSpotify(wantSpotify() ? res.spotify : null);
          companion.onAppCategoria(store.get().percepcaoTela ? res.categoria : null);
        } catch (err) {
          log('warn', `Falha na detecção de tela cheia: ${err.message}`);
        } finally {
          busy = false;
        }
      }, 500); // tela cheia some em até meio segundo
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
        work: !!companion.work,
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
        toggleWork: () => {
          if (companion.work) companion.endWork();
          else companion.startWork();
          trayCtl && trayCtl.refresh();
        },
        openSettings,
        openApp: (id) => companion.openApp(id || null),
        about: () =>
          dialog.showMessageBox({
            type: 'info',
            title: 'Sobre o JoJo Companion',
            message: `${personality.get().nomeCompanion || 'JoJo'} — JoJo Companion ${app.getVersion()}`,
            detail:
              'Companion de desktop com o JoJo, tubarão fisiculturista e fiscal da sua produtividade.\n\n' +
              'Arte atual: desenho vetorial articulado provisório.\n' +
              'Funciona totalmente offline. Não coleta dados.',
          }),
        quit: () => quit(),
      },
    });

    // motivo: 'manual' (bandeja) ou 'atualizacao' (o vigia confere a volta).
    async function quit(motivo = 'manual') {
      if (quitting) return;
      quitting = true;
      presenca.marcarSaida(motivo);
      clearInterval(fullscreenTimer);
      clearInterval(topTimer);
      try {
        await Promise.race([companion.goodbye(), new Promise((r) => setTimeout(r, 1800))]);
      } catch {
        /* ignora */
      }
      companion.stop();
      // Atualização baixada: instala ao encerrar (sem reabrir).
      if (updater) updater.onQuit();
      if (fullscreen) fullscreen.dispose();
      store.flush();
      globalShortcut.unregisterAll();
      trayCtl.destroy();
      app.quit();
    }

    app.on('will-quit', () => globalShortcut.unregisterAll());
    // Desligar/sair do Windows: não é crash, o vigia não reabre.
    powerMonitor.on('shutdown', () => presenca.marcarSaida('desligamento'));
    overlay.onSessionEnd = () => presenca.marcarSaida('desligamento');
    presenca.armar({
      // Em desenvolvimento reabre com os mesmos argumentos (sem os de depuração).
      args: app.isPackaged ? [] : process.argv.slice(1).filter((a) => !/^--(inspect|remote-debugging)/.test(a)),
      esperas: TEST ? { esperaReabrirMs: 300, esperaAtualizacaoMs: 500, intervaloMs: 200 } : {},
    });
    garantirAtalho({ app, shell, log });

    registerHotkey();
    // Testes automáticos não registram o app no Windows sozinhos (só quando o teste pede).
    if (!TEST) applyAutostart();
    startFullscreenWatch();
    companion.start();
    trayCtl.refresh();
    // Ociosidade do sistema: só o contador de segundos sem uso (não lê teclas nem cliques).
    // Testes: ociosidade real do runner (sem ninguém no mouse) não dispara o pó.
    const IDLE_DEFAULT = TEST ? 0 : null;
    let idleOverride = IDLE_DEFAULT;
    let updater = null;
    // Atualização automática (Releases do GitHub; origem em package.json → jojoUpdate).
    const pkg = readJSON('package.json');
    updater = createAutoUpdater({
      app, net, store, log,
      feed: pkg.jojoUpdate || {},
      onUpdated: (v) => {
        companion.fireEvent('sucesso', { speak: false });
        companion.say(`Fui atualizado pra v${v}. Mais forte. Óbvio.`, 'speech');
      },
    });
    updater.start();
    let updatingNow = false;
    const idleTimer = setInterval(() => {
      try {
        const idle = idleOverride ?? powerMonitor.getSystemIdleTime();
        companion.onSystemIdle(idle);
        // Versão nova pronta: troca na hora (só espera terminar arrasto/modo de interação) e reabre sozinho.
        // Avisa "já volto" (fora do Modo Trabalho), dá tempo de ler e troca.
        if (!updatingNow && updater.onIdle(idle, { busyNow: companion.interaction || companion.dragging || quitting })) {
          updatingNow = true;
          const falou = companion.avisarAtualizacao(updater.state.version);
          setTimeout(() => quit('atualizacao'), falou ? 3500 : 300);
        }
      } catch (err) {
        log('warn', `Falha ao ler ociosidade: ${err.message}`);
      }
    }, 3000);
    app.on('will-quit', () => clearInterval(idleTimer));
    log('info', `Pronto${process.env.PORTABLE_EXECUTABLE_FILE ? ' (executável portátil)' : ''}.`);
    topTimer = setInterval(() => !companion.interaction && overlay.reassertTop(), 8000);

    if (store.loadIssues.length) log('warn', `Problemas ao carregar configurações: ${store.loadIssues.join('; ')}`);

    if (TEST) {
      globalThis.__jojo = {
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
        // Janela comum que registra cliques: usada para provar que cliques atravessam o JoJo.
        async makeClickTarget(bounds, { fullscreen = false } = {}) {
          const w = new BrowserWindow({ ...bounds, show: false, frame: false, fullscreen, title: 'JoJo test target', webPreferences: { sandbox: true } });
          await w.loadURL('data:text/html,' + encodeURIComponent('<body style="margin:0;background:#cfe0f5"><script>window.__clicks=[];addEventListener("mousedown",e=>window.__clicks.push({x:e.screenX,y:e.screenY}));</script></body>'));
          w.show();
          if (!fullscreen) w.setBounds(bounds);
          w.moveTop();
          w.focus();
          return w.id;
        },
        readClicks: (id) => BrowserWindow.fromId(id).webContents.executeJavaScript('window.__clicks'),
        targetFocused: (id) => BrowserWindow.fromId(id).isFocused(),
        targetHwnd: (id) => hwndToString(BrowserWindow.fromId(id).getNativeWindowHandle()),
        overlayHwnd: () => hwndToString(overlay.win.getNativeWindowHandle()),
        closeTarget: (id) => BrowserWindow.fromId(id)?.destroy(),
        loginItem: () => app.getLoginItemSettings(loginOptions()),
        fullscreenInfo: () => ({ available: !!fullscreen?.available, reason: fullscreen?.reason || null, last: fullscreen?.last || null }),
        targetBounds: (id) => BrowserWindow.fromId(id)?.getBounds(),
        primaryScale: () => screen.getPrimaryDisplay().scaleFactor,
        personality,
        appWin,
        get updater() {
          return updater;
        },
        setIdle: (sec) => {
          idleOverride = sec == null ? IDLE_DEFAULT : Number(sec);
          return companion.onSystemIdle(idleOverride ?? 0);
        },
        setTargetTitle: (id, title) => BrowserWindow.fromId(id)?.setTitle(title),
      };
    }
  }
}
