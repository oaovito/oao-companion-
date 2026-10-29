// Detecção de aplicativo em tela cheia no Windows, sem ler conteúdo de janelas
// e sem injeção: usa apenas SHQueryUserNotificationState (estado do shell) e o
// retângulo/classe da janela em primeiro plano comparado ao do monitor.
// Em outros sistemas (ou se o FFI falhar) a detecção fica indisponível.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Valores de QUERY_USER_NOTIFICATION_STATE
const QUNS_BUSY = 2;
const QUNS_RUNNING_D3D_FULL_SCREEN = 3;
const QUNS_PRESENTATION_MODE = 4;
const SHELL_CLASSES = new Set(['Progman', 'WorkerW', 'Shell_TrayWnd', 'Shell_SecondaryTrayWnd']);
const MONITOR_DEFAULTTONEAREST = 2;

export function createFullscreenDetector(log = () => {}) {
  if (process.platform !== 'win32') return { available: false, reason: 'Disponível apenas no Windows', detect: () => [] };
  try {
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    const shell32 = koffi.load('shell32.dll');
    const RECT = koffi.struct('JEFF_RECT', { left: 'int32', top: 'int32', right: 'int32', bottom: 'int32' });
    const MONITORINFO = koffi.struct('JEFF_MONITORINFO', { cbSize: 'uint32', rcMonitor: RECT, rcWork: RECT, dwFlags: 'uint32' });
    const GetForegroundWindow = user32.func('void * __stdcall GetForegroundWindow()');
    const GetShellWindow = user32.func('void * __stdcall GetShellWindow()');
    const GetDesktopWindow = user32.func('void * __stdcall GetDesktopWindow()');
    const GetWindowRect = user32.func('int __stdcall GetWindowRect(void *hWnd, _Out_ JEFF_RECT *lpRect)');
    const GetClassNameW = user32.func('int __stdcall GetClassNameW(void *hWnd, _Out_ uint16_t *lpClassName, int nMaxCount)');
    const MonitorFromWindow = user32.func('void * __stdcall MonitorFromWindow(void *hwnd, uint32_t dwFlags)');
    const GetMonitorInfoW = user32.func('int __stdcall GetMonitorInfoW(void *hMonitor, _Inout_ JEFF_MONITORINFO *lpmi)');
    const SHQueryUserNotificationState = shell32.func('int32 __stdcall SHQueryUserNotificationState(_Out_ int32 *pquns)');

    const ownHandles = new Set();

    function className(hwnd) {
      const buf = new Uint16Array(64);
      const n = GetClassNameW(hwnd, buf, 64);
      return n > 0 ? String.fromCharCode(...buf.slice(0, n)) : '';
    }

    /**
     * @param toDip (rectPx) => rectDip  — conversão de pixels físicos para DIP (screen.screenToDipRect)
     * @param displays lista de displays do Electron
     * @returns ids dos displays ocupados por um app em tela cheia
     */
    function detect(toDip, displays) {
      const out = [];
      const q = [0];
      const hr = SHQueryUserNotificationState(q);
      const shellSaysFull = hr === 0 && [QUNS_BUSY, QUNS_RUNNING_D3D_FULL_SCREEN, QUNS_PRESENTATION_MODE].includes(q[0]);
      const hwnd = GetForegroundWindow();
      if (!hwnd) return out;
      const key = String(hwnd);
      if (ownHandles.has(key)) return out;
      if (hwnd === GetShellWindow() || hwnd === GetDesktopWindow()) return out;
      if (SHELL_CLASSES.has(className(hwnd))) return out;
      const wr = {};
      if (!GetWindowRect(hwnd, wr)) return out;
      const mon = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
      const mi = { cbSize: koffi.sizeof(MONITORINFO), rcMonitor: {}, rcWork: {}, dwFlags: 0 };
      if (!mon || !GetMonitorInfoW(mon, mi)) return out;
      const m = mi.rcMonitor;
      const coversMonitor = wr.left <= m.left && wr.top <= m.top && wr.right >= m.right && wr.bottom >= m.bottom;
      if (!coversMonitor && !shellSaysFull) return out;
      if (!coversMonitor) return out; // estado do shell sem janela cobrindo: ignora (ex.: modo apresentação em outro monitor)
      const dip = toDip({ x: m.left, y: m.top, width: m.right - m.left, height: m.bottom - m.top });
      let best = null;
      let bestD = Infinity;
      for (const d of displays) {
        const dd = Math.abs(d.bounds.x - dip.x) + Math.abs(d.bounds.y - dip.y) + Math.abs(d.bounds.width - dip.width) + Math.abs(d.bounds.height - dip.height);
        if (dd < bestD) {
          bestD = dd;
          best = d;
        }
      }
      if (best && bestD < 40) out.push(best.id);
      return out;
    }

    return {
      available: true,
      reason: null,
      detect,
      addOwnHandle(buf) {
        try {
          const v = buf.length >= 8 ? buf.readBigUInt64LE(0) : BigInt(buf.readUInt32LE(0));
          ownHandles.add(String(v));
        } catch {
          /* ignora */
        }
      },
    };
  } catch (e) {
    log('warn', `Detecção de tela cheia indisponível: ${e.message}`);
    return { available: false, reason: `Indisponível: ${e.message}`, detect: () => [] };
  }
}
