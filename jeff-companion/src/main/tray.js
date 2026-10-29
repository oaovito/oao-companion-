// Ícone e menu da bandeja do sistema.
import { Tray, Menu, nativeImage } from 'electron';

export function createTray({ iconPath, getState, actions }) {
  const img = nativeImage.createFromPath(iconPath);
  const tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img);
  tray.setToolTip('Jeff Companion (fan-made)');

  function prettyHotkey(acc) {
    return String(acc || '').replace(/Control/g, 'Ctrl').replace(/\+/g, '+');
  }

  function build() {
    const s = getState();
    const menu = Menu.buildFromTemplate([
      { label: 'Jeff Companion — projeto de fã, não oficial', enabled: false },
      { type: 'separator' },
      {
        label: s.interaction ? 'Sair do modo de interação' : `Modo de interação${s.hotkeyOk ? `   (${prettyHotkey(s.hotkey)})` : ''}`,
        click: () => actions.toggleInteraction(),
      },
      { label: s.visible ? 'Ocultar Jeff' : 'Mostrar Jeff', click: () => actions.toggleVisible() },
      { label: 'Pausar', type: 'checkbox', checked: s.paused, click: () => actions.togglePaused() },
      { label: 'Modo silencioso', type: 'checkbox', checked: s.quiet, click: () => actions.toggleQuiet() },
      { type: 'separator' },
      { label: 'Configurações…', click: () => actions.openSettings() },
      { label: 'Sobre', click: () => actions.about() },
      { type: 'separator' },
      { label: 'Encerrar', click: () => actions.quit() },
    ]);
    tray.setContextMenu(menu);
    tray.setToolTip(`Jeff Companion (fan-made)${s.paused ? ' — pausado' : ''}${s.visible ? '' : ' — oculto'}`);
  }

  // No Windows, clique esquerdo também abre o menu.
  tray.on('click', () => tray.popUpContextMenu());
  build();
  return { tray, refresh: build, destroy: () => tray.destroy() };
}
