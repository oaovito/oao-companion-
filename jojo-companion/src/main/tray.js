// Ícone e menu da bandeja do sistema.
import { Tray, Menu, nativeImage } from 'electron';

export function createTray({ iconPath, getState, actions }) {
  const img = nativeImage.createFromPath(iconPath);
  const tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img);
  tray.setToolTip('JoJo Companion');

  function prettyHotkey(acc) {
    return String(acc || '').replace(/Control/g, 'Ctrl').replace(/\+/g, '+');
  }

  function build() {
    const s = getState();
    const menu = Menu.buildFromTemplate([
      { label: `${s.name} — JoJo Companion`, enabled: false },
      { type: 'separator' },
      {
        label: s.interaction ? 'Sair do modo de interação' : `Modo de interação${s.hotkeyOk ? `   (${prettyHotkey(s.hotkey)})` : ''}`,
        click: () => actions.toggleInteraction(),
      },
      { label: `Abrir ${s.name}`, click: () => actions.openApp() },
      {
        label: s.activities && s.activities.length ? `Atividades (${s.activities.length})` : 'Atividades',
        submenu: s.activities && s.activities.length
          ? s.activities.map((a) => ({ label: `${a.title} — ${a.label}`, click: () => actions.openApp(a.id) }))
          : [{ label: 'Nada pendente', enabled: false }],
      },
      { label: s.visible ? `Ocultar ${s.name}` : `Mostrar ${s.name}`, click: () => actions.toggleVisible() },
      { label: 'Pausar', type: 'checkbox', checked: s.paused, click: () => actions.togglePaused() },
      { label: 'Modo silencioso', type: 'checkbox', checked: s.quiet, click: () => actions.toggleQuiet() },
      { type: 'separator' },
      { label: 'Configurações…', click: () => actions.openSettings() },
      { label: 'Sobre', click: () => actions.about() },
      { type: 'separator' },
      { label: 'Encerrar', click: () => actions.quit() },
    ]);
    tray.setContextMenu(menu);
    tray.setToolTip(`${s.name} (JoJo Companion)${s.paused ? ' — pausado' : ''}${s.visible ? '' : ' — oculto'}`);
  }

  // No Windows, clique esquerdo também abre o menu.
  tray.on('click', () => tray.popUpContextMenu());
  build();
  return { tray, refresh: build, destroy: () => tray.destroy() };
}
