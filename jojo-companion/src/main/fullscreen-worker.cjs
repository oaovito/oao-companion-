// Processo utilitário isolado (Electron utilityProcess) para a detecção de tela
// cheia via FFI. Se uma chamada nativa falhar de forma fatal, apenas este
// processo cai — o JoJo continua funcionando.
//
// Usa somente: SHQueryUserNotificationState (estado do shell), a janela em
// primeiro plano, seu retângulo e nome de classe, e o retângulo do monitor.
// Para o "fiscal do Instagram" e o mau humor com o League of Legends (opcionais,
// pedidos pelo usuário) compara o título da janela em primeiro plano e o nome do
// executável AQUI dentro: só booleanos saem deste processo. Para reagir ao
// Spotify (opcional), lê só o título da janela do Spotify (app ou web player).
// Nada é salvo nem enviado para fora do PC. Não lê conteúdo, pixels, histórico
// nem entrada do usuário.

const MONITOR_DEFAULTTONEAREST = 2;

let api = null;
const own = new Set();
const { verifyDarkestImage } = require('../core/darkest-process.cjs');
const { classifyFullscreen, windowHasCaption } = require('../core/fullscreen-policy.cjs');
const { identifyGame } = require('../core/steam-library.cjs');
const winPath = require('node:path').win32;
let gameInventory = { roots: [], games: [] };
let gameScanAt = 0, gameKnown = [], rejectedDarkest = false;
const fs = require('node:fs');
const { isDiscord, brandFor } = require('../core/windows-app-policy.cjs');
const cancelledDiscord = new Set();
const darkestProofs = new Map();

function init() {
  const koffi = require('koffi');
  const user32 = koffi.load('user32.dll');
  const shell32 = koffi.load('shell32.dll');
  const dwmapi = koffi.load('dwmapi.dll');
  const kernel32 = koffi.load('kernel32.dll');
  const RECT = koffi.struct('JOJO_RECT', { left: 'int32', top: 'int32', right: 'int32', bottom: 'int32' });
  const MONITORINFO = koffi.struct('JOJO_MONITORINFO', { cbSize: 'uint32', rcMonitor: RECT, rcWork: RECT, dwFlags: 'uint32' });
  koffi.struct('JOJO_FILETIME', { low: 'uint32', high: 'uint32' });
  const PROCESSENTRY32 = koffi.struct('JOJO_PROCESSENTRY32', { dwSize: 'uint32', cntUsage: 'uint32', th32ProcessID: 'uint32', th32DefaultHeapID: 'uintptr_t', th32ModuleID: 'uint32', cntThreads: 'uint32', th32ParentProcessID: 'uint32', pcPriClassBase: 'int32', dwFlags: 'uint32', szExeFile: koffi.array('uint16_t', 260) });
  api = {
    koffi,
    MONITORINFO,
    PROCESSENTRY32,
    IsIconic: user32.func('int __stdcall IsIconic(uintptr_t hwnd)'),
    IsZoomed: user32.func('int __stdcall IsZoomed(uintptr_t hwnd)'),
    GetWindowLongPtrW: user32.func('intptr_t __stdcall GetWindowLongPtrW(uintptr_t hwnd, int index)'),
    DwmGetWindowAttribute: dwmapi.func('int32 __stdcall DwmGetWindowAttribute(uintptr_t hwnd, uint32 attribute, _Out_ JOJO_RECT *rect, uint32 size)'),
    SetThreadDpiAwarenessContext: user32.func('intptr_t __stdcall SetThreadDpiAwarenessContext(intptr_t context)'),
    IsWindowVisible: user32.func('int __stdcall IsWindowVisible(uintptr_t hwnd)'),
    GetForegroundWindow: user32.func('uintptr_t __stdcall GetForegroundWindow()'),
    GetShellWindow: user32.func('uintptr_t __stdcall GetShellWindow()'),
    GetDesktopWindow: user32.func('uintptr_t __stdcall GetDesktopWindow()'),
    GetWindowRect: user32.func('int __stdcall GetWindowRect(uintptr_t hWnd, _Out_ JOJO_RECT *lpRect)'),
    GetClassNameW: user32.func('int __stdcall GetClassNameW(uintptr_t hWnd, _Out_ uint16_t *lpClassName, int nMaxCount)'),
    MonitorFromWindow: user32.func('uintptr_t __stdcall MonitorFromWindow(uintptr_t hwnd, uint32_t dwFlags)'),
    GetMonitorInfoW: user32.func('int __stdcall GetMonitorInfoW(uintptr_t hMonitor, _Inout_ JOJO_MONITORINFO *lpmi)'),
    SHQueryUserNotificationState: shell32.func('int32 __stdcall SHQueryUserNotificationState(_Out_ int32 *pquns)'),
    GetWindowTextW: user32.func('int __stdcall GetWindowTextW(uintptr_t hWnd, _Out_ uint16_t *lpString, int nMaxCount)'),
    GetWindowThreadProcessId: user32.func('uint32 __stdcall GetWindowThreadProcessId(uintptr_t hWnd, _Out_ uint32 *lpdwProcessId)'),
    OpenProcess: kernel32.func('uintptr_t __stdcall OpenProcess(uint32 dwDesiredAccess, int bInheritHandle, uint32 dwProcessId)'),
    QueryFullProcessImageNameW: kernel32.func('int __stdcall QueryFullProcessImageNameW(uintptr_t hProcess, uint32 dwFlags, _Out_ uint16_t *lpExeName, _Inout_ uint32 *lpdwSize)'),
    CloseHandle: kernel32.func('int __stdcall CloseHandle(uintptr_t hObject)'),
    GetProcessTimes: kernel32.func('int __stdcall GetProcessTimes(uintptr_t hProcess, _Out_ JOJO_FILETIME *creation, _Out_ JOJO_FILETIME *exit, _Out_ JOJO_FILETIME *kernel, _Out_ JOJO_FILETIME *user)'),
    GetExitCodeProcess: kernel32.func('int __stdcall GetExitCodeProcess(uintptr_t hProcess, _Out_ uint32 *code)'),
    CreateToolhelp32Snapshot: kernel32.func('uintptr_t __stdcall CreateToolhelp32Snapshot(uint32 flags, uint32 pid)'),
    Process32FirstW: kernel32.func('int __stdcall Process32FirstW(uintptr_t snapshot, _Inout_ JOJO_PROCESSENTRY32 *entry)'),
    Process32NextW: kernel32.func('int __stdcall Process32NextW(uintptr_t snapshot, _Inout_ JOJO_PROCESSENTRY32 *entry)'),
    PostMessageW: user32.func('int __stdcall PostMessageW(uintptr_t hwnd, uint32 message, uintptr_t wParam, intptr_t lParam)'),
    TerminateProcess: kernel32.func('int __stdcall TerminateProcess(uintptr_t process, uint32 code)'),
    FindWindowExW: user32.func('uintptr_t __stdcall FindWindowExW(uintptr_t hWndParent, uintptr_t hWndChildAfter, str16 lpszClass, str16 lpszWindow)'),
  };
}

function knownProcesses(all = false) {
  const snapshot = api.CreateToolhelp32Snapshot(2, 0);
  if (!snapshot || String(snapshot) === '18446744073709551615' || snapshot === -1) throw new Error('process_snapshot');
  const found = [];
  try {
    const entry = { dwSize: api.koffi.sizeof(api.PROCESSENTRY32) }; let ok = api.Process32FirstW(snapshot, entry);
    for (let n = 0; ok && n < 10000; n++) {
      const chars = Array.from(entry.szExeFile || []); const end = chars.indexOf(0); const name = String.fromCharCode(...chars.slice(0, end < 0 ? chars.length : end));
      if (all || brandFor(name)) found.push({ pid: entry.th32ProcessID, name });
      ok = api.Process32NextW(snapshot, entry);
    }
  } finally { api.CloseHandle(snapshot); }
  return found;
}
function processInfo(pid, callback = null, allowTerminate = false) {
  const h = api.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | (allowTerminate ? 1 : 0), 0, pid); if (!h) return null;
  try {
    const name = new Uint16Array(2048), size = [2048], code = [0];
    if (!api.QueryFullProcessImageNameW(h, 0, name, size) || !api.GetExitCodeProcess(h, code) || code[0] !== 259) return null;
    const creation = {}; if (!api.GetProcessTimes(h, creation, {}, {}, {})) return null;
    const image = String.fromCharCode(...name.slice(0, size[0])); const info = { pid, image, key: `${pid}:${creation.high}:${creation.low}` };
    if (callback) callback(info, h); return info;
  } finally { api.CloseHandle(h); }
}
async function closeDiscord({ force = false } = {}, id) {
  const initial = knownProcesses().filter(p => isDiscord(p.name)).map(p => processInfo(p.pid)).filter(p => p && isDiscord(p.image));
  const pids = new Set(initial.map(p => p.pid)); let requests = 0;
  let hwnd = 0;
  for (let n = 0; n < 2048; n++) {
    hwnd = api.FindWindowExW(0, hwnd, null, null); if (!hwnd) break;
    const pid = [0]; api.GetWindowThreadProcessId(hwnd, pid);
    if (pids.has(pid[0]) && !own.has(String(hwnd)) && api.IsWindowVisible(hwnd)) {
      const current = processInfo(pid[0]); const expected = initial.find(p => p.pid === pid[0]);
      if (current?.key === expected?.key && api.PostMessageW(hwnd, 0x0010, 0, 0)) requests++;
    }
  }
  // Fechamento Chromium é assíncrono: aguardar de forma limitada sem bloquear a UI.
  let remaining = initial.length;
  for (let n = 0; n < 12 && remaining; n++) {
    await new Promise(resolve => setTimeout(resolve, 250));
    remaining = knownProcesses().filter(p => isDiscord(p.name)).length;
    if (cancelledDiscord.has(id)) break;
  }
  let forced = 0;
  if (force === true && !cancelledDiscord.has(id)) for (const original of initial) {
    processInfo(original.pid, (current, handle) => {
      if (current.key === original.key && isDiscord(current.image) && api.TerminateProcess(handle, 0)) forced++;
    }, true);
  }
  if (forced) await new Promise(resolve => setTimeout(resolve, 500));
  remaining = knownProcesses().filter(p => isDiscord(p.name)).length;
  const cancelled = cancelledDiscord.delete(id);
  return { detected: initial.length, requests, remaining, forced, cancelled };
}
function brandIcons() {
  const result = {};
  for (const candidate of knownProcesses()) {
    const info = processInfo(candidate.pid); const brand = info && brandFor(info.image);
    if (brand && !result[brand]) result[brand] = info.image;
  }
  return result;
}

function gameFor(info) {
  if (!info) return null;
  let game = identifyGame(info.image, gameInventory.games);
  if (/\\Darkest\.exe$/i.test(info.image)) {
    let proof = darkestProofs.get(info.image);
    if (!proof || Date.now() > proof.until) {
      proof = { valid: verifyDarkestImage(info.image, f => fs.readFileSync(f, 'utf8')), until: Date.now() + 30000 };
      if (darkestProofs.size >= 64) darkestProofs.delete(darkestProofs.keys().next().value);
      darkestProofs.set(info.image, proof);
    }
    if (proof.valid) game = { appId: '262060' };
    else { rejectedDarkest = true; return null; }
  }
  if (game?.appId === '262060' && !/^Darkest\.exe$/i.test(winPath.basename(info.image))) return null;
  return game ? { appId: game.appId, pid: info.pid, processKey: info.key } : null;
}
function detectGames() {
  const at = Date.now(), hwnd = api.GetForegroundWindow();
  const pid = [0]; if (hwnd && api.IsWindowVisible(hwnd) && !api.IsIconic(hwnd) && !own.has(String(hwnd))) api.GetWindowThreadProcessId(hwnd, pid);
  const active = gameFor(pid[0] ? processInfo(pid[0]) : null);
  if (at >= gameScanAt) {
    gameScanAt = at + 3000; rejectedDarkest = false; const found = [];
    for (const candidate of knownProcesses(true)) {
      if (!gameInventory.games.length && !/^darkest\.exe$|^steam\.exe$/i.test(candidate.name)) continue;
      const info = processInfo(candidate.pid); if (!info) continue;
      const game = gameFor(info);
      if (game) found.push(game);
      if (winPath.basename(info.image).toLowerCase() === 'steam.exe' && gameInventory.roots.some(root => winPath.dirname(info.image).toLowerCase() === root.toLowerCase())) found.push({ steam: true, pid: info.pid, processKey: info.key });
    }
    gameKnown = found;
  }
  // Confere vida e identidade em cada amostra; PID reutilizado nunca herda sessão/XP.
  gameKnown = gameKnown.filter(game => processInfo(game.pid)?.key === game.processKey);
  if (active && !gameKnown.some(game => game.processKey === active.processKey)) gameKnown.push(active);
  const games = gameKnown.filter(game => !game.steam).map(game => ({ appId: game.appId, processKey: game.processKey, active: game.processKey === active?.processKey }));
  const darkest = games.find(game => game.appId === '262060' && game.active) || games.find(game => game.appId === '262060');
  return { known: true, checkedAt: at, steamRunning: gameKnown.some(game => game.steam), games,
    darkest: { known: true, running: !!darkest, active: !!darkest?.active, processKey: darkest?.processKey || null,
      installed: !!darkest || gameInventory.games.some(game => game.appId === '262060'), executable: !!darkest, verified: !!darkest,
      reason: rejectedDarkest && !darkest ? 'installation_not_verified' : null, checkedAt: at } };
}

function className(hwnd) {
  const buf = new Uint16Array(64);
  const n = api.GetClassNameW(hwnd, buf, 64);
  return n > 0 ? String.fromCharCode(...buf.slice(0, n)) : '';
}

const INSTAGRAM = /instagram/i;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

function windowTitle(hwnd) {
  const buf = new Uint16Array(256);
  const n = api.GetWindowTextW(hwnd, buf, 256);
  return n > 0 ? String.fromCharCode(...buf.slice(0, n)) : '';
}

/** Nome do executável dono da janela (ex.: "Spotify.exe") ou ''. */
function exeName(hwnd) {
  try {
    const pid = [0];
    api.GetWindowThreadProcessId(hwnd, pid);
    if (!pid[0]) return '';
    const h = api.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid[0]);
    if (!h) return '';
    try {
      const name = new Uint16Array(520);
      const size = [520];
      if (api.QueryFullProcessImageNameW(h, 0, name, size)) {
        const full = String.fromCharCode(...name.slice(0, size[0]));
        return full.split(/[\\/]/).pop() || '';
      }
    } finally {
      api.CloseHandle(h);
    }
  } catch {
    /* sem permissão para o processo: ignora */
  }
  return '';
}

function isInstagram(hwnd) {
  if (INSTAGRAM.test(windowTitle(hwnd))) return true;
  return INSTAGRAM.test(exeName(hwnd));
}

const LOL_TITLE = /^league of legends\b/i;
const LOL_EXE = /^(leagueclient\w*|league of legends)\.exe$/i;
function isLol(hwnd) {
  return LOL_TITLE.test(windowTitle(hwnd)) || LOL_EXE.test(exeName(hwnd));
}

// Spotify: o app do Windows mostra "Artista - Música" no título quando toca
// ("Spotify…" parado). No navegador (web player ou app instalado pelo
// navegador) o título é "Música • Artista" (às vezes "… - Google Chrome").
const SPOTIFY_IDLE = /^spotify( (premium|free))?$/i;
const NAVEGADORES = new Set(['chrome.exe', 'msedge.exe', 'brave.exe', 'opera.exe', 'opera_gx.exe', 'vivaldi.exe', 'firefox.exe', 'arc.exe']);
const SUFIXO_NAV = / [-—] (google chrome|microsoft​? ?edge|brave|opera|vivaldi|mozilla firefox|arc)$/i;

/** "Artista - Música" a partir do título e do executável da janela, ou null. */
function musicaDaJanela(title, exe, spotifyExe = 'spotify.exe') {
  const t = String(title || '').trim();
  const e = String(exe || '').toLowerCase();
  if (!t) return null;
  if (e === spotifyExe.toLowerCase()) return SPOTIFY_IDLE.test(t) || !t.includes(' - ') ? null : t.slice(0, 200);
  if (!NAVEGADORES.has(e)) return null;
  const sem = t.replace(SUFIXO_NAV, '').replace(/^\(\d+\)\s*/, '');
  // Web player: "Música • Artista" (sem "YouTube", "Instagram"… no título).
  const m = sem.match(/^(.+?) • (.+)$/);
  if (!m || /youtube|instagram|netflix|twitch|whatsapp|discord/i.test(sem)) return null;
  return `${m[2].trim()} - ${m[1].trim()}`.slice(0, 200);
}

// Percepção de tela (opcional, desligada por padrão): só o TIPO do app em primeiro
// plano, pelo nome do executável (sem título, sem captura). Sai daqui só a categoria.
const CATEGORIAS = [
  ['mnelab', /mne[_ -]?lab/i],
  ['launcher', /^(steam|epicgameslauncher|riotclientservices|battle\.net)\.exe$/i],
  ['jogo', /^(minecraft\w*|javaw|robloxplayerbeta|gta5|valorant\w*|fortniteclient\w*|r5apex|cs2|eldenring|genshinimpact)\.exe$/i],
  ['video', /^(vlc|mpc-hc64|mpc-be64|potplayermini64|netflix|primevideo|disney\w*|wmplayer)\.exe$/i],
  ['escritorio', /^(winword|excel|powerpnt|onenote|acrord32|acrobat|soffice\w*|notion|obsidian)\.exe$/i],
  ['codigo', /^(code|devenv|idea64|pycharm64|rstudio|matlab|spyder|jupyter\w*|windowsterminal)\.exe$/i],
  ['navegador', /^(chrome|msedge|firefox|brave|opera|vivaldi)\.exe$/i],
];
function categoriaApp(exe) {
  const e = String(exe || '');
  for (const [cat, re] of CATEGORIAS) if (re.test(e)) return cat;
  return e ? 'outro' : null;
}

function spotifyTitle(exe = 'Spotify.exe') {
  for (const cls of ['Chrome_WidgetWin_0', 'Chrome_WidgetWin_1', 'MozillaWindowClass']) {
    let h = 0;
    for (let i = 0; i < 400; i++) {
      h = api.FindWindowExW(0, h, cls, null);
      if (!h) break;
      const t = windowTitle(h);
      if (!t || SPOTIFY_IDLE.test(t) || (!t.includes(' - ') && !t.includes(' • '))) continue;
      const m = musicaDaJanela(t, exeName(h), exe);
      if (m) return m;
    }
  }
  return null;
}

/** @returns {{fullscreen:boolean, instagram:boolean, monitor?:{x,y,width,height}, shell?:number}} pixels físicos */
function detect(opts = {}) {
  const capturedAt = Date.now(), foreground = api.GetForegroundWindow();
  const result = detectFullscreen();
  result.instagram = false;
  result.lol = false;
  const hwnd = opts.instagram || opts.lol || opts.percepcao ? api.GetForegroundWindow() : 0;
  if (hwnd && !own.has(String(hwnd))) {
    if (opts.instagram) result.instagram = isInstagram(hwnd);
    if (opts.lol) result.lol = isLol(hwnd);
    if (opts.percepcao) result.categoria = categoriaApp(exeName(hwnd));
  }
  result.spotify = opts.spotify ? spotifyTitle(opts.spotifyExe || 'Spotify.exe') : null;
  if (opts.darkest || opts.games) {
    try { result.games = detectGames(); result.darkest = opts.darkest ? result.games.darkest : null; if (opts.percepcao && result.games.games?.some(game => game.active)) result.categoria = 'jogo'; }
    catch { result.games = { known: false, reason: 'process_scan_failed', checkedAt: Date.now() }; result.darkest = { known: false, reason: 'process_scan_failed' }; }
  }
  if (api.GetForegroundWindow() !== foreground) {
    Object.assign(result, detectFullscreen());
    result.instagram = false; result.lol = false; result.categoria = null;
    if (result.darkest) result.darkest.active = false;
    if (result.games?.games) for (const game of result.games.games) game.active = false;
  }
  result.capturedAt = capturedAt;
  return result;
}

function detectFullscreen() {
  // Coloca todas as geometrias no mesmo espaço físico, inclusive DPI misto.
  const previousDpi = api.SetThreadDpiAwarenessContext(-4);
  try {
    const q = [0]; const shell = api.SHQueryUserNotificationState(q) === 0 ? q[0] : -1;
    const hwnd = api.GetForegroundWindow();
    if (!hwnd) return { fullscreen: false, shell, reason: 'no_foreground' };
    if (own.has(String(hwnd))) return { fullscreen: false, shell, reason: 'own_window' };
    const wr = {}; const mi = { cbSize: api.koffi.sizeof(api.MONITORINFO), rcMonitor: {}, rcWork: {}, dwFlags: 0 };
    if (!api.GetWindowRect(hwnd, wr)) return { fullscreen: false, shell, reason: 'geometry_unavailable' };
    // DWM exclui a borda invisível das janelas comuns maximizada/restaurada.
    const frame = {}; if (api.DwmGetWindowAttribute(hwnd, 9, frame, 16) === 0) Object.assign(wr, frame);
    const mon = api.MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
    if (!mon || !api.GetMonitorInfoW(mon, mi)) return { fullscreen: false, shell, reason: 'monitor_unavailable' };
    const style = Number(api.GetWindowLongPtrW(hwnd, -16));
    const result = classifyFullscreen({ shell, own: own.has(String(hwnd)), shellWindow: hwnd === api.GetShellWindow() || hwnd === api.GetDesktopWindow(),
      className: className(hwnd), visible: !!api.IsWindowVisible(hwnd), minimized: !!api.IsIconic(hwnd),
      maximized: !!api.IsZoomed(hwnd), framed: windowHasCaption(style), window: wr, monitor: mi.rcMonitor });
    return { ...result, maximized: !!api.IsZoomed(hwnd), framed: windowHasCaption(style), style };
  } finally { if (previousDpi) api.SetThreadDpiAwarenessContext(previousDpi); }
}

module.exports = { musicaDaJanela, categoriaApp };

if (process.parentPort) process.parentPort.on('message', async (e) => {
  const msg = e.data || {};
  try {
    if (msg.type === 'init') {
      if (!api) init();
      own.clear();
      for (const h of msg.own || []) own.add(String(h));
      process.parentPort.postMessage({ type: 'ready' });
    } else if (msg.type === 'own') {
      own.clear(); for (const handle of msg.own || []) own.add(String(handle));
    } else if (msg.type === 'inventory') {
      gameInventory = msg.inventory || { roots: [], games: [] }; gameScanAt = 0;
    } else if (msg.type === 'steamRoots') {
      const roots = knownProcesses(true).filter(p => /^steam\.exe$/i.test(p.name)).map(p => processInfo(p.pid)).filter(p => p && /^steam\.exe$/i.test(winPath.basename(p.image))).map(p => winPath.dirname(p.image));
      process.parentPort.postMessage({ type: 'result', id: msg.id, result: roots.slice(0, 8) });
    } else if (msg.type === 'detect') {
      process.parentPort.postMessage({ type: 'result', id: msg.id, result: detect(msg.opts || {}) });
    } else if (msg.type === 'closeDiscord') {
      const result = await closeDiscord(msg.opts, msg.id); process.parentPort.postMessage({ type: 'result', id: msg.id, result });
    } else if (msg.type === 'cancelDiscord') {
      if (cancelledDiscord.size >= 64) cancelledDiscord.delete(cancelledDiscord.values().next().value);
      cancelledDiscord.add(msg.id);
    } else if (msg.type === 'brandIcons') {
      process.parentPort.postMessage({ type: 'result', id: msg.id, result: brandIcons() });
    }
  } catch (err) {
    process.parentPort.postMessage({ type: 'error', id: msg.id, message: String(err && err.message) });
  }
});
