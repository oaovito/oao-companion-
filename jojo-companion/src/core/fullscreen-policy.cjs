// O estado global de notificações não descreve a janela ativa. Busy/apresentação
// podem continuar após Alt+Tab e nunca são, sozinhos, prova de tela cheia.
const SHELL_CLASSES = new Set(['Progman', 'WorkerW', 'Shell_TrayWnd', 'Shell_SecondaryTrayWnd']);
function classifyFullscreen({ own = false, shellWindow = false, visible = true, minimized = false, maximized = false, framed = false, className = '', window: w, monitor: m, shell = -1 } = {}) {
  const empty = reason => ({ fullscreen: false, shell, reason });
  if (own) return empty('own_window');
  if (shellWindow || SHELL_CLASSES.has(className)) return empty('shell_window');
  if (!visible || minimized) return empty('not_visible');
  if (![w, m].every(r => r && ['left', 'top', 'right', 'bottom'].every(k => Number.isFinite(r[k])) && r.right > r.left && r.bottom > r.top)) return empty('geometry_unavailable');
  if (maximized && framed) return empty('maximized_window');
  const tolerance = 2;
  const covers = w.left <= m.left + tolerance && w.top <= m.top + tolerance && w.right >= m.right - tolerance && w.bottom >= m.bottom - tolerance;
  return { fullscreen: covers, shell, reason: covers ? 'foreground_covers_monitor' : 'windowed',
    janela: { x: w.left, y: w.top, width: w.right - w.left, height: w.bottom - w.top },
    monitor: { x: m.left, y: m.top, width: m.right - m.left, height: m.bottom - m.top } };
}
module.exports = { classifyFullscreen };
