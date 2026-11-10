// Observação user32 apenas: não muda foco, captura, estilos nem posição.
export function createNativeMouseDiagnostics(koffi) {
  const user32 = koffi.load('user32.dll');
  const POINT = koffi.struct('JOJO_INPUT_POINT', { x: 'int32', y: 'int32' });
  const RECT = koffi.struct('JOJO_INPUT_RECT', { left: 'int32', top: 'int32', right: 'int32', bottom: 'int32' });
  const GUI = koffi.struct('JOJO_INPUT_GUI', {
    cbSize: 'uint32', flags: 'uint32', hwndActive: 'uintptr_t', hwndFocus: 'uintptr_t', hwndCapture: 'uintptr_t',
    hwndMenuOwner: 'uintptr_t', hwndMoveSize: 'uintptr_t', hwndCaret: 'uintptr_t', rcCaret: RECT,
  });
  const api = {
    cursor: user32.func('int __stdcall GetCursorPos(_Out_ JOJO_INPUT_POINT *point)'),
    atPoint: user32.func('uintptr_t __stdcall WindowFromPoint(JOJO_INPUT_POINT point)'),
    ancestor: user32.func('uintptr_t __stdcall GetAncestor(uintptr_t hwnd, uint32 flags)'),
    foreground: user32.func('uintptr_t __stdcall GetForegroundWindow()'),
    style: user32.func('intptr_t __stdcall GetWindowLongPtrW(uintptr_t hwnd, int index)'),
    thread: user32.func('uint32 __stdcall GetWindowThreadProcessId(uintptr_t hwnd, _Out_ uint32 *processId)'),
    gui: user32.func('int __stdcall GetGUIThreadInfo(uint32 threadId, _Inout_ JOJO_INPUT_GUI *info)'),
    rect: user32.func('int __stdcall GetWindowRect(uintptr_t hwnd, _Out_ JOJO_INPUT_RECT *rect)'),
    client: user32.func('int __stdcall GetClientRect(uintptr_t hwnd, _Out_ JOJO_INPUT_RECT *rect)'),
    toScreen: user32.func('int __stdcall ClientToScreen(uintptr_t hwnd, _Inout_ JOJO_INPUT_POINT *point)'),
    button: user32.func('int16 __stdcall GetAsyncKeyState(int key)'),
    className: user32.func('int __stdcall GetClassNameW(uintptr_t hwnd, _Out_ uint16_t *text, int maxCount)'),
    title: user32.func('int __stdcall GetWindowTextW(uintptr_t hwnd, _Out_ uint16_t *text, int maxCount)'),
  };
  const root = (hwnd) => String(hwnd ? api.ancestor(hwnd, 2) : 0);
  const window = (handle) => {
    const hwnd = BigInt(handle);
    const exStyle = Number(api.style(hwnd, -20)) >>> 0;
    const rect = {}, client = {}, origin = { x: 0, y: 0 };
    const rectOk = !!api.rect(hwnd, rect);
    const clientOk = !!api.client(hwnd, client) && !!api.toScreen(hwnd, origin);
    return { hwnd: String(hwnd), exStyle: `0x${exStyle.toString(16)}`, transparent: !!(exStyle & 0x20), layered: !!(exStyle & 0x80000),
      rect: rectOk ? rect : null, client: clientOk ? { x: origin.x, y: origin.y, width: client.right, height: client.bottom } : null };
  };
  return ({ overlay, target }) => {
    const cursor = {};
    const cursorOk = !!api.cursor(cursor);
    const hit = cursorOk ? api.atPoint(cursor) : 0;
    const hitRoot = root(hit);
    let hitWindow = null;
    if (hitRoot !== '0') {
      const hwnd = BigInt(hitRoot);
      const classText = new Uint16Array(256), titleText = new Uint16Array(512), pid = [0];
      const classLength = api.className(hwnd, classText, classText.length);
      const titleLength = api.title(hwnd, titleText, titleText.length);
      api.thread(hwnd, pid);
      hitWindow = { ...window(hitRoot), className: String.fromCharCode(...classText.slice(0, classLength)), title: String.fromCharCode(...titleText.slice(0, titleLength)), pid: pid[0] };
    }
    const gui = { cbSize: koffi.sizeof(GUI), flags: 0, hwndActive: 0, hwndFocus: 0, hwndCapture: 0,
      hwndMenuOwner: 0, hwndMoveSize: 0, hwndCaret: 0, rcCaret: { left: 0, top: 0, right: 0, bottom: 0 } };
    // GetCapture() só consulta a thread de quem chama; a captura relevante é
    // da thread do HWND Electron, consultada explicitamente por GUIThreadInfo.
    const thread = api.thread(BigInt(overlay), null);
    const guiOk = !!api.gui(thread, gui);
    return {
      cursor: cursorOk ? cursor : null, hit: String(hit), hitRoot, hitWindow, foreground: String(api.foreground()), leftDown: !!(api.button(1) & 0x8000),
      overlay: window(overlay), target: window(target),
      gui: guiOk ? { thread, active: String(gui.hwndActive), focus: String(gui.hwndFocus), capture: String(gui.hwndCapture), captureRoot: root(gui.hwndCapture) } : null,
    };
  };
}
