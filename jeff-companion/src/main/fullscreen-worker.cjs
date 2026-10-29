// Processo utilitário isolado (Electron utilityProcess) para a detecção de tela
// cheia via FFI. Se uma chamada nativa falhar de forma fatal, apenas este
// processo cai — o Jeff continua funcionando.
//
// Usa somente: SHQueryUserNotificationState (estado do shell), a janela em
// primeiro plano, seu retângulo e nome de classe, e o retângulo do monitor.
// Para o "fiscal do Instagram" (opcional, pedido pelo usuário) compara o título
// da janela em primeiro plano e o nome do executável com "instagram" AQUI
// dentro: só um booleano sai deste processo; o título não é enviado nem salvo.
// Não lê conteúdo, pixels, histórico nem entrada do usuário.

const QUNS_BUSY = 2;
const QUNS_RUNNING_D3D_FULL_SCREEN = 3;
const QUNS_PRESENTATION_MODE = 4;
const SHELL_CLASSES = new Set(['Progman', 'WorkerW', 'Shell_TrayWnd', 'Shell_SecondaryTrayWnd']);
const MONITOR_DEFAULTTONEAREST = 2;

let api = null;
const own = new Set();

function init() {
  const koffi = require('koffi');
  const user32 = koffi.load('user32.dll');
  const shell32 = koffi.load('shell32.dll');
  const kernel32 = koffi.load('kernel32.dll');
  const RECT = koffi.struct('JEFF_RECT', { left: 'int32', top: 'int32', right: 'int32', bottom: 'int32' });
  const MONITORINFO = koffi.struct('JEFF_MONITORINFO', { cbSize: 'uint32', rcMonitor: RECT, rcWork: RECT, dwFlags: 'uint32' });
  api = {
    koffi,
    MONITORINFO,
    GetForegroundWindow: user32.func('uintptr_t __stdcall GetForegroundWindow()'),
    GetShellWindow: user32.func('uintptr_t __stdcall GetShellWindow()'),
    GetDesktopWindow: user32.func('uintptr_t __stdcall GetDesktopWindow()'),
    GetWindowRect: user32.func('int __stdcall GetWindowRect(uintptr_t hWnd, _Out_ JEFF_RECT *lpRect)'),
    GetClassNameW: user32.func('int __stdcall GetClassNameW(uintptr_t hWnd, _Out_ uint16_t *lpClassName, int nMaxCount)'),
    MonitorFromWindow: user32.func('uintptr_t __stdcall MonitorFromWindow(uintptr_t hwnd, uint32_t dwFlags)'),
    GetMonitorInfoW: user32.func('int __stdcall GetMonitorInfoW(uintptr_t hMonitor, _Inout_ JEFF_MONITORINFO *lpmi)'),
    SHQueryUserNotificationState: shell32.func('int32 __stdcall SHQueryUserNotificationState(_Out_ int32 *pquns)'),
    GetWindowTextW: user32.func('int __stdcall GetWindowTextW(uintptr_t hWnd, _Out_ uint16_t *lpString, int nMaxCount)'),
    GetWindowThreadProcessId: user32.func('uint32 __stdcall GetWindowThreadProcessId(uintptr_t hWnd, _Out_ uint32 *lpdwProcessId)'),
    OpenProcess: kernel32.func('uintptr_t __stdcall OpenProcess(uint32 dwDesiredAccess, int bInheritHandle, uint32 dwProcessId)'),
    QueryFullProcessImageNameW: kernel32.func('int __stdcall QueryFullProcessImageNameW(uintptr_t hProcess, uint32 dwFlags, _Out_ uint16_t *lpExeName, _Inout_ uint32 *lpdwSize)'),
    CloseHandle: kernel32.func('int __stdcall CloseHandle(uintptr_t hObject)'),
  };
}

function className(hwnd) {
  const buf = new Uint16Array(64);
  const n = api.GetClassNameW(hwnd, buf, 64);
  return n > 0 ? String.fromCharCode(...buf.slice(0, n)) : '';
}

const INSTAGRAM = /instagram/i;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

function isInstagram(hwnd) {
  try {
    const buf = new Uint16Array(256);
    const n = api.GetWindowTextW(hwnd, buf, 256);
    if (n > 0 && INSTAGRAM.test(String.fromCharCode(...buf.slice(0, n)))) return true;
    const pid = [0];
    api.GetWindowThreadProcessId(hwnd, pid);
    if (!pid[0]) return false;
    const h = api.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid[0]);
    if (!h) return false;
    try {
      const name = new Uint16Array(520);
      const size = [520];
      if (api.QueryFullProcessImageNameW(h, 0, name, size)) {
        const full = String.fromCharCode(...name.slice(0, size[0]));
        return INSTAGRAM.test(full.split(/[\\/]/).pop() || '');
      }
    } finally {
      api.CloseHandle(h);
    }
  } catch {
    /* sem permissão para o processo: ignora */
  }
  return false;
}

/** @returns {{fullscreen:boolean, instagram:boolean, monitor?:{x,y,width,height}, shell?:number}} pixels físicos */
function detect(opts = {}) {
  const result = detectFullscreen();
  result.instagram = false;
  if (opts.instagram) {
    const hwnd = api.GetForegroundWindow();
    if (hwnd && !own.has(String(hwnd))) result.instagram = isInstagram(hwnd);
  }
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
  const covers = wr.left <= m.left && wr.top <= m.top && wr.right >= m.right && wr.bottom >= m.bottom;
  const shellFull = [QUNS_BUSY, QUNS_RUNNING_D3D_FULL_SCREEN, QUNS_PRESENTATION_MODE].includes(shell);
  return {
    fullscreen: covers,
    shellFull,
    shell,
    monitor: { x: m.left, y: m.top, width: m.right - m.left, height: m.bottom - m.top },
  };
}

process.parentPort.on('message', (e) => {
  const msg = e.data || {};
  try {
    if (msg.type === 'init') {
      if (!api) init();
      own.clear();
      for (const h of msg.own || []) own.add(String(h));
      process.parentPort.postMessage({ type: 'ready' });
    } else if (msg.type === 'detect') {
      process.parentPort.postMessage({ type: 'result', id: msg.id, result: detect(msg.opts || {}) });
    }
  } catch (err) {
    process.parentPort.postMessage({ type: 'error', id: msg.id, message: String(err && err.message) });
  }
});
