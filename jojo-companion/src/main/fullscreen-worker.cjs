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

const QUNS_BUSY = 2;
const QUNS_RUNNING_D3D_FULL_SCREEN = 3;
const QUNS_PRESENTATION_MODE = 4;
const SHELL_CLASSES = new Set(['Progman', 'WorkerW', 'Shell_TrayWnd', 'Shell_SecondaryTrayWnd']);
const MONITOR_DEFAULTTONEAREST = 2;

let api = null;
const own = new Set();
const { verifyDarkestImage } = require('../core/darkest-process.cjs');
const fs = require('node:fs');
const { isDiscord, brandFor } = require('../core/windows-app-policy.cjs');
const cancelledDiscord = new Set();
let darkestKnown = [];
let darkestScanAt = 0;
const darkestProofs = new Map();

function init() {
  const koffi = require('koffi');
  const user32 = koffi.load('user32.dll');
  const shell32 = koffi.load('shell32.dll');
  const kernel32 = koffi.load('kernel32.dll');
  const RECT = koffi.struct('JOJO_RECT', { left: 'int32', top: 'int32', right: 'int32', bottom: 'int32' });
  const MONITORINFO = koffi.struct('JOJO_MONITORINFO', { cbSize: 'uint32', rcMonitor: RECT, rcWork: RECT, dwFlags: 'uint32' });
  koffi.struct('JOJO_FILETIME', { low: 'uint32', high: 'uint32' });
  const PROCESSENTRY32 = koffi.struct('JOJO_PROCESSENTRY32', { dwSize: 'uint32', cntUsage: 'uint32', th32ProcessID: 'uint32', th32DefaultHeapID: 'uintptr_t', th32ModuleID: 'uint32', cntThreads: 'uint32', th32ParentProcessID: 'uint32', pcPriClassBase: 'int32', dwFlags: 'uint32', szExeFile: koffi.array('uint16_t', 260) });
  api = {
    koffi,
    MONITORINFO,
    PROCESSENTRY32,
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

function knownProcesses() {
  const snapshot = api.CreateToolhelp32Snapshot(2, 0);
  if (!snapshot || String(snapshot) === '18446744073709551615' || snapshot === -1) throw new Error('process_snapshot');
  const found = [];
  try {
    const entry = { dwSize: api.koffi.sizeof(api.PROCESSENTRY32) }; let ok = api.Process32FirstW(snapshot, entry);
    for (let n = 0; ok && n < 10000; n++) {
      const chars = Array.from(entry.szExeFile || []); const end = chars.indexOf(0); const name = String.fromCharCode(...chars.slice(0, end < 0 ? chars.length : end));
      if (brandFor(name)) found.push({ pid: entry.th32ProcessID, name });
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

function darkestProcess(hwnd) {
  if (!hwnd || own.has(String(hwnd))) return null;
  const pid = [0]; api.GetWindowThreadProcessId(hwnd, pid); if (!pid[0]) return null;
  const h = api.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid[0]); if (!h) return null;
  try {
    const name = new Uint16Array(2048); const size = [2048];
    if (!api.QueryFullProcessImageNameW(h, 0, name, size)) return null;
    const full = String.fromCharCode(...name.slice(0, size[0]));
    if (!/\\Darkest\.exe$/i.test(full)) return null;
    let proof = darkestProofs.get(full);
    if (!proof || Date.now() > proof.until) {
      proof = { valid: verifyDarkestImage(full, f => fs.readFileSync(f, 'utf8')), until: Date.now() + 60000 };
      if (darkestProofs.size >= 64) darkestProofs.delete(darkestProofs.keys().next().value);
      darkestProofs.set(full, proof);
    }
    if (!proof.valid) return null;
    const creation = {}; const exit = {}; const kernel = {}; const user = {}; const code = [0];
    if (!api.GetProcessTimes(h, creation, exit, kernel, user) || !api.GetExitCodeProcess(h, code) || code[0] !== 259) return null;
    return { hwnd: String(hwnd), pid: pid[0], key: `${pid[0]}:${creation.high.toString(16)}:${creation.low.toString(16)}` };
  } catch { return null; }
  finally { api.CloseHandle(h); }
}

function detectDarkest() {
  const foreground = api.GetForegroundWindow();
  const active = darkestProcess(foreground);
  if (active) darkestKnown = [active, ...darkestKnown.filter(x => x.key !== active.key)].slice(0, 8);
  // Enumera apenas janelas de nível superior a cada 15 s, não todos os processos a cada quadro.
  if (Date.now() >= darkestScanAt) {
    darkestScanAt = Date.now() + 15000; const found = active ? [active] : []; let hwnd = 0;
    for (let i = 0; i < 400; i++) {
      hwnd = api.FindWindowExW(0, hwnd, null, null); if (!hwnd) break;
      const candidate = darkestProcess(hwnd);
      if (candidate && !found.some(x => x.key === candidate.key)) found.push(candidate);
    }
    darkestKnown = found.slice(0, 8);
  }
  const valid = [];
  for (const candidate of darkestKnown) {
    const current = candidate.key === active?.key ? active : darkestProcess(BigInt(candidate.hwnd));
    if (current?.key === candidate.key) valid.push(current);
  }
  darkestKnown = valid;
  const game = active || valid[0];
  return { running: !!game, active: !!active, processKey: game?.key || null };
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
  ['jogo', /^(steam|epicgameslauncher|riotclientservices|battle\.net|minecraft\w*|javaw|robloxplayerbeta|gta5|valorant\w*|fortniteclient\w*|r5apex|cs2|eldenring|genshinimpact)\.exe$/i],
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
  result.darkest = opts.darkest ? detectDarkest() : null;
  return result;
}

function detectFullscreen() {
  const q = [0];
  const hr = api.SHQueryUserNotificationState(q);
  const shell = hr === 0 ? q[0] : -1;
  const hwnd = api.GetForegroundWindow();
  if (!hwnd) return { fullscreen: false, shell };
  if (own.has(String(hwnd))) return { fullscreen: false, shell };
  if (hwnd === api.GetShellWindow() || hwnd === api.GetDesktopWindow()) return { fullscreen: false, shell };
  if (SHELL_CLASSES.has(className(hwnd))) return { fullscreen: false, shell };
  const wr = {};
  if (!api.GetWindowRect(hwnd, wr)) return { fullscreen: false, shell };
  const mon = api.MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
  const mi = { cbSize: api.koffi.sizeof(api.MONITORINFO), rcMonitor: {}, rcWork: {}, dwFlags: 0 };
  if (!mon || !api.GetMonitorInfoW(mon, mi)) return { fullscreen: false, shell };
  const m = mi.rcMonitor;
  // Folga de 2 px: arredondamento de DPI em janelas sem borda; janela maximizada comum
  // fica bem longe disso (a barra de tarefas ocupa dezenas de pixels).
  const T = 2;
  const covers = wr.left <= m.left + T && wr.top <= m.top + T && wr.right >= m.right - T && wr.bottom >= m.bottom - T;
  const shellFull = [QUNS_BUSY, QUNS_RUNNING_D3D_FULL_SCREEN, QUNS_PRESENTATION_MODE].includes(shell);
  // Tela cheia = a janela ativa cobre o monitor inteiro (sem borda, F11, vídeo, jogo
  // em janela cheia) OU o Windows avisa jogo exclusivo/apresentação. Na dúvida, esconde.
  return {
    fullscreen: covers || shellFull,
    shellFull,
    shell,
    janela: { x: wr.left, y: wr.top, width: wr.right - wr.left, height: wr.bottom - wr.top },
    monitor: { x: m.left, y: m.top, width: m.right - m.left, height: m.bottom - m.top },
  };
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
