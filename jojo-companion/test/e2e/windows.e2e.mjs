// Integração no Windows real, com entrada de mouse/teclado do SISTEMA
// (SetCursorPos/mouse_event/keybd_event via koffi no processo de teste).
// Só roda em win32 (ex.: GitHub Actions windows-latest). Em outros sistemas
// os testes são ignorados.
//
// Observação: o app em si nunca simula cliques. A entrada sintética aqui
// existe apenas para o teste provar que o sistema entrega o clique à janela
// que está atrás do JoJo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const IS_WIN = process.platform === 'win32';
const skip = IS_WIN ? false : 'somente Windows';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let input = null;
function winInput() {
  if (input) return input;
  const koffi = require('koffi');
  const user32 = koffi.load('user32.dll');
  const SetProcessDPIAware = user32.func('int __stdcall SetProcessDPIAware()');
  SetProcessDPIAware();
  input = {
    SetCursorPos: user32.func('int __stdcall SetCursorPos(int x, int y)'),
    mouse_event: user32.func('void __stdcall mouse_event(uint32 dwFlags, uint32 dx, uint32 dy, uint32 dwData, uintptr_t dwExtraInfo)'),
    keybd_event: user32.func('void __stdcall keybd_event(uint8 bVk, uint8 bScan, uint32 dwFlags, uintptr_t dwExtraInfo)'),
    GetForegroundWindow: user32.func('uintptr_t __stdcall GetForegroundWindow()'),
  };
  return input;
}

async function moveTo(p, scale) {
  const i = winInput();
  i.SetCursorPos(Math.round(p.x * scale), Math.round(p.y * scale));
  // SetCursorPos não passa pelo hook de mouse; um movimento relativo real passa
  // (é o que o Electron usa para encaminhar mousemove com click-through).
  i.mouse_event(0x0001, 1, 0, 0, 0);
  await sleep(15);
  i.mouse_event(0x0001, -1 >>> 0, 0, 0, 0);
  await sleep(30);
}

async function click(p, scale) {
  const i = winInput();
  await moveTo(p, scale);
  i.mouse_event(0x0002, 0, 0, 0, 0); // LEFTDOWN
  await sleep(25);
  i.mouse_event(0x0004, 0, 0, 0, 0); // LEFTUP
  await sleep(60);
}

async function keys(vks) {
  const i = winInput();
  for (const vk of vks) i.keybd_event(vk, 0, 0, 0);
  await sleep(40);
  for (const vk of [...vks].reverse()) i.keybd_event(vk, 0, 0x0002, 0);
  await sleep(100);
}

function loadPlaywright() {
  try {
    return require('playwright-core');
  } catch {
    return require('playwright');
  }
}

async function launch({ executablePath = null, env = {} } = {}) {
  const { _electron } = loadPlaywright();
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-win-'));
  fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify({ version: 1, speechFrequency: 'off' }));
  const app = await _electron.launch({
    executablePath: executablePath || require('electron'),
    args: executablePath ? [] : [ROOT],
    env: { ...process.env, JOJO_TEST: '1', JOJO_USER_DATA: userData, ...env },
  });
  await app.firstWindow();
  for (let i = 0; i < 80; i++) {
    if (await app.evaluate(() => !!(globalThis.__jojo && globalThis.__jojo.companion.started)).catch(() => false)) break;
    await sleep(100);
  }
  await sleep(1500);
  return app;
}

async function quit(app) {
  await app.evaluate(() => globalThis.__jojo.quit()).catch(() => {});
  await sleep(2500);
  try {
    await app.close();
  } catch {
    /* já fechou */
  }
}

const dbg = (app) => app.evaluate(() => globalThis.__jojo.companion.debugState());

test('Windows: clique real sobre o JoJo parado chega à janela de trás', { skip }, async () => {
  const app = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 1, y: 1 })); // JoJo ignora o cursor real
    const scale = await app.evaluate(() => globalThis.__jojo.primaryScale());
    const st = await dbg(app);
    const b = st.box;
    const id = await app.evaluate((_e, bb) => globalThis.__jojo.makeClickTarget(bb), { x: b.x - 40, y: b.y - 40, width: b.width + 80, height: b.height + 80 });
    await sleep(800);
    const center = { x: st.visual.x + st.visual.width / 2, y: st.visual.y + st.visual.height / 2 };
    await click(center, scale);
    await sleep(300);
    const clicks = await app.evaluate((_e, i) => globalThis.__jojo.readClicks(i), id);
    assert.ok(clicks.length >= 1, `janela de trás recebeu ${clicks.length} cliques`);
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.mouseMode), 'passthrough');
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.win.isFocused()), false);
  } finally {
    await quit(app);
  }
});

test('Windows: cliques reais durante a fuga também atravessam', { skip }, async () => {
  const app = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 1, y: 1 }));
    const scale = await app.evaluate(() => globalThis.__jojo.primaryScale());
    const wa = await app.evaluate(({ screen }) => screen.getPrimaryDisplay().workArea);
    const id = await app.evaluate((_e, bb) => globalThis.__jojo.makeClickTarget(bb), wa);
    await sleep(800);
    let got = 0;
    let attempts = 0;
    for (let round = 0; round < 4; round++) {
      const st = await dbg(app);
      const c = { x: st.visual.x + st.visual.width / 2, y: st.visual.y + st.visual.height / 2 };
      // Cursor "virtual" encosta no JoJo → fuga começa; clica no ponto onde ele está durante o movimento.
      await app.evaluate((_e, p) => globalThis.__jojo.setCursor(p), { x: c.x - 30, y: c.y });
      await sleep(40);
      for (let k = 0; k < 3; k++) {
        const now = await dbg(app);
        if (!now.moving) continue;
        attempts++;
        const before = (await app.evaluate((_e, i) => globalThis.__jojo.readClicks(i), id)).length;
        await click({ x: now.visual.x + now.visual.width / 2, y: now.visual.y + now.visual.height / 2 }, scale);
        const after = (await app.evaluate((_e, i) => globalThis.__jojo.readClicks(i), id)).length;
        if (after > before) got++;
        assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.mouseMode), 'passthrough');
      }
      await app.evaluate(() => globalThis.__jojo.setCursor({ x: 1, y: 1 }));
      await sleep(1500);
    }
    assert.ok(attempts >= 1, 'houve cliques durante o movimento');
    assert.equal(got, attempts, `cliques entregues: ${got}/${attempts}`);
  } finally {
    await quit(app);
  }
});

test('Windows: JoJo não rouba o foco durante o uso normal', { skip }, async () => {
  const app = await launch();
  try {
    const wa = await app.evaluate(({ screen }) => screen.getPrimaryDisplay().workArea);
    const id = await app.evaluate((_e, bb) => globalThis.__jojo.makeClickTarget(bb), { x: wa.x + 20, y: wa.y + 20, width: 500, height: 400 });
    await sleep(800);
    const targetHwnd = await app.evaluate((_e, i) => globalThis.__jojo.targetHwnd(i), id);
    // Fala, anda e foge por alguns segundos.
    await app.evaluate(() => globalThis.__jojo.companion.say('Teste de foco', 'speech'));
    for (let i = 0; i < 6; i++) {
      const st = await dbg(app);
      await app.evaluate((_e, p) => globalThis.__jojo.setCursor(p), { x: st.visual.x + 10, y: st.visual.y + 10 });
      await sleep(400);
      await app.evaluate(() => globalThis.__jojo.setCursor({ x: 1, y: 1 }));
      await sleep(300);
    }
    const fg = String(winInput().GetForegroundWindow());
    assert.equal(fg, targetHwnd, 'janela do usuário continua em primeiro plano');
    assert.equal(await app.evaluate((_e, i) => globalThis.__jojo.targetFocused(i), id), true);
  } finally {
    await quit(app);
  }
});

test('Windows: atalho global real Ctrl+Alt+J e Esc', { skip }, async () => {
  const app = await launch();
  try {
    const hk = await app.evaluate(() => globalThis.__jojo.hotkeyStatus());
    assert.equal(hk.ok, true, `atalho registrado: ${JSON.stringify(hk)}`);
    await keys([0x11, 0x12, 0x4a]); // Ctrl, Alt, J
    await sleep(600);
    assert.equal((await dbg(app)).interaction, true, 'entrou no modo de interação pelo atalho');
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.win.isFocusable()), true);
    await keys([0x1b]); // Esc
    await sleep(500);
    const st = await dbg(app);
    assert.equal(st.interaction, false, 'Esc encerrou');
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.mouseMode), 'passthrough');
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.win.isFocusable()), false);
  } finally {
    await quit(app);
  }
});

test('Windows: no modo de interação só as regiões interativas capturam o mouse', { skip }, async () => {
  const app = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 1, y: 1 }));
    const scale = await app.evaluate(() => globalThis.__jojo.primaryScale());
    const wa = await app.evaluate(({ screen }) => screen.getPrimaryDisplay().workArea);
    const id = await app.evaluate((_e, bb) => globalThis.__jojo.makeClickTarget(bb), wa);
    await sleep(600);
    await app.evaluate(() => globalThis.__jojo.companion.enterInteraction('test'));
    await sleep(800);
    const win = await app.firstWindow();
    const btn = await win.evaluate(() => {
      const r = document.querySelector('#toolbar button[data-action="eat"]').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    const wb = await app.evaluate(() => globalThis.__jojo.overlay.win.getBounds());
    const p = { x: wb.x + btn.x, y: wb.y + btn.y };
    await moveTo({ x: p.x - 3, y: p.y }, scale);
    await moveTo(p, scale);
    await sleep(250);
    await click(p, scale);
    await sleep(400);
    assert.equal((await dbg(app)).behavior, 'eat', 'botão recebeu o clique real');
    // Ponto transparente da janela do overlay (canto superior esquerdo) deixa o clique passar.
    const before = (await app.evaluate((_e, i) => globalThis.__jojo.readClicks(i), id)).length;
    const st = await dbg(app);
    const corner = { x: wb.x + 3, y: wb.y + 3 };
    const vis = st.visual;
    const insideJoJo = corner.x >= vis.x && corner.x <= vis.x + vis.width && corner.y >= vis.y && corner.y <= vis.y + vis.height;
    if (!insideJoJo) {
      await moveTo({ x: corner.x + 2, y: corner.y + 2 }, scale);
      await sleep(250);
      await click(corner, scale);
      await sleep(300);
      const after = (await app.evaluate((_e, i) => globalThis.__jojo.readClicks(i), id)).length;
      assert.ok(after > before, 'área transparente não bloqueia o clique');
    }
    await app.evaluate(() => globalThis.__jojo.companion.exitInteraction('test'));
  } finally {
    await quit(app);
  }
});

test('Windows: detecção de tela cheia oculta e reexibe o JoJo', { skip }, async () => {
  const app = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 1, y: 1 }));
    await sleep(2500);
    const info = await app.evaluate(() => globalThis.__jojo.fullscreenInfo());
    assert.equal(info.available, true, `detector: ${JSON.stringify(info)}`);
    const id = await app.evaluate((_e) => globalThis.__jojo.makeClickTarget({ x: 0, y: 0, width: 400, height: 300 }, { fullscreen: true }));
    await sleep(4500);
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.win.isVisible()), false, 'oculto em tela cheia');
    await app.evaluate((_e, i) => globalThis.__jojo.closeTarget(i), id);
    await sleep(4000);
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.win.isVisible()), true, 'reexibido');
  } finally {
    await quit(app);
  }
});

test('Windows: tela cheia some na hora mesmo no modo de interação com balão; janela sem borda do tamanho do monitor também', { skip }, async () => {
  const app = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 1, y: 1 }));
    await sleep(2500);
    await app.evaluate(() => globalThis.__jojo.companion.enterInteraction('test'));
    await app.evaluate(() => globalThis.__jojo.companion.say('Balão aberto antes da tela cheia.', 'speech'));
    const id = await app.evaluate(() => globalThis.__jojo.makeClickTarget({ x: 0, y: 0, width: 400, height: 300 }, { fullscreen: true }));
    let visivel = true;
    for (let i = 0; i < 30 && visivel; i++) {
      await sleep(100);
      visivel = await app.evaluate(() => globalThis.__jojo.overlay.win.isVisible());
    }
    assert.equal(visivel, false, 'oculto em tela cheia (com interação e balão)');
    assert.equal(await app.evaluate(() => globalThis.__jojo.companion.interaction), false);
    await app.evaluate((_e, i) => globalThis.__jojo.closeTarget(i), id);
    await sleep(3000);
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.win.isVisible()), true, 'reexibido');
    // "Borderless": janela comum, sem moldura, exatamente do tamanho do monitor.
    const b = await app.evaluate(({ screen }) => screen.getPrimaryDisplay().bounds);
    const id2 = await app.evaluate((_e, bb) => globalThis.__jojo.makeClickTarget(bb), b);
    await app.evaluate(({ BrowserWindow }, i) => BrowserWindow.fromId(i)?.focus(), id2);
    visivel = true;
    for (let i = 0; i < 40 && visivel; i++) {
      await sleep(150);
      await app.evaluate(({ BrowserWindow }, i) => BrowserWindow.fromId(i)?.focus(), id2);
      visivel = await app.evaluate(() => globalThis.__jojo.overlay.win.isVisible());
    }
    const diag = visivel ? JSON.stringify({ alvo: await app.evaluate((_e, i) => globalThis.__jojo.targetBounds(i), id2), monitor: b, detector: await app.evaluate(() => globalThis.__jojo.fullscreenInfo()) }) : '';
    assert.equal(visivel, false, `oculto com janela sem borda cobrindo o monitor ${diag}`);
    await app.evaluate((_e, i) => globalThis.__jojo.closeTarget(i), id2);
  } finally {
    await quit(app);
  }
});

test('Windows: Instagram em primeiro plano → bronca (detecção pelo título)', { skip }, async () => {
  const app = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 1, y: 1 }));
    await sleep(2500);
    await app.evaluate(() => globalThis.__jojo.companion.hideBubble());
    const id = await app.evaluate(() => globalThis.__jojo.makeClickTarget({ x: 20, y: 20, width: 500, height: 400 }));
    await app.evaluate((_e, i) => globalThis.__jojo.setTargetTitle(i, 'Instagram'), id);
    // Runner lento: espera até 20 s, devolvendo o foco ao alvo (o Windows pode segurá-lo).
    let said = null;
    for (let i = 0; i < 40 && !said; i++) {
      await sleep(500);
      await app.evaluate(({ BrowserWindow }, i) => BrowserWindow.fromId(i)?.focus(), id);
      said = await app.evaluate(() => {
        const c = globalThis.__jojo.companion;
        return (c.instagramScolds || []).length ? { text: c.lastSaid, state: c.behavior.state } : null;
      });
    }
    assert.ok(said && said.text, 'JoJo deu bronca ao abrir o Instagram');
    // Continua aberto: não repete.
    const first = await app.evaluate(() => globalThis.__jojo.companion.instagram.lastScold);
    await sleep(4000);
    assert.equal(await app.evaluate(() => globalThis.__jojo.companion.instagram.lastScold), first);
  } finally {
    await quit(app);
  }
});

test('Windows: iniciar com o Windows liga e desliga', { skip }, async () => {
  const app = await launch();
  try {
    assert.equal(await app.evaluate(() => globalThis.__jojo.store.get().startWithWindows), true, 'ligado por padrão');
    await app.evaluate(() => globalThis.__jojo.store.update({ startWithWindows: false }));
    await sleep(300);
    assert.equal((await app.evaluate(() => globalThis.__jojo.loginItem())).openAtLogin, false);
    await app.evaluate(() => globalThis.__jojo.store.update({ startWithWindows: true }));
    await sleep(300);
    assert.equal((await app.evaluate(() => globalThis.__jojo.loginItem())).openAtLogin, true);
    await app.evaluate(() => globalThis.__jojo.store.update({ startWithWindows: false }));
    await sleep(300);
    assert.equal((await app.evaluate(() => globalThis.__jojo.loginItem())).openAtLogin, false);
  } finally {
    await quit(app);
  }
});

const PACKAGED = path.join(ROOT, 'dist', 'win-unpacked', 'JoJo Companion.exe');
test('Windows: executável empacotado inicia, carrega assets e o detector nativo', { skip: skip || (!fs.existsSync(PACKAGED) && 'pacote não gerado') }, async () => {
  const app = await launch({ executablePath: PACKAGED });
  try {
    const st = await dbg(app);
    assert.ok(st.box.width > 0);
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.win.isVisible()), true);
    await sleep(2500);
    const info = await app.evaluate(() => globalThis.__jojo.fullscreenInfo());
    assert.equal(info.available, true, JSON.stringify(info));
    const anim = await (await app.firstWindow()).evaluate(() => window.__jojoRenderer.anim);
    assert.ok(anim);
  } finally {
    await quit(app);
  }
});

test('Windows: atualização do portátil troca o executável de verdade (cmd.exe)', { skip }, async () => {
  const { portableSwapScript } = await import('../../src/core/updater.js');
  const { spawnSync } = await import('node:child_process');
  const crypto = await import('node:crypto');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-swap-'));
  const sys = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32');
  const target = path.join(dir, 'JoJo Companion antigo', 'JoJoCompanion.exe');
  const fresh = path.join(dir, 'updates', 'JoJoCompanion.exe');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.mkdirSync(path.dirname(fresh), { recursive: true });
  // "Versão antiga" e "versão nova": dois executáveis inofensivos do Windows.
  fs.copyFileSync(path.join(sys, 'whoami.exe'), target);
  fs.copyFileSync(path.join(sys, 'hostname.exe'), fresh);
  const want = crypto.createHash('sha256').update(fs.readFileSync(fresh)).digest('hex');
  const script = path.join(dir, 'updates', 'trocar.cmd');
  fs.writeFileSync(script, portableSwapScript({ newPath: fresh, targetPath: target, tries: 10 }));
  const r = spawnSync('cmd.exe', ['/d', '/c', script], { timeout: 60000, windowsHide: true });
  assert.equal(r.status, 0, String(r.stderr || r.stdout));
  const got = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
  assert.equal(got, want, 'executável trocado pela versão nova');
  assert.equal(fs.existsSync(fresh), false, 'arquivo baixado movido');
});

test('Windows: calendários islâmico, hebraico e chinês funcionam no Electron (datas festivas)', { skip }, async () => {
  const app = await launch();
  try {
    const r = await app.evaluate(async () => {
      const c = globalThis.__jojo.companion;
      const at = (y, m, d) => c.checkHoliday(new Date(y, m - 1, d, 12));
      return { eid: at(2025, 3, 30), rosh: at(2025, 9, 23), hanukkah: at(2025, 12, 16), cny: at(2025, 1, 29), diwali: at(2025, 10, 20), natal: at(2026, 12, 25) };
    });
    assert.deepEqual(r, { eid: 'eidFitr', rosh: 'roshHashana', hanukkah: 'hanukkah', cny: 'anoNovoChines', diwali: 'diwali', natal: 'natal' });
  } finally {
    await quit(app);
  }
});

test('Windows: Spotify (título "Artista - Música") e League of Legends detectados pela janela', { skip }, async () => {
  // Nos testes, o "Spotify" é uma janela do próprio Electron (mesmo caminho Win32: classe, título e executável).
  const app = await launch({ env: { JOJO_SPOTIFY_EXE: path.basename(require('electron')) } });
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 1, y: 1 }));
    const id = await app.evaluate(() => globalThis.__jojo.makeClickTarget({ x: 20, y: 20, width: 400, height: 300 }));
    await app.evaluate((_e, i) => globalThis.__jojo.setTargetTitle(i, 'Daft Punk - One More Time'), id);
    let np = null;
    for (let i = 0; i < 30 && !np; i++) {
      await sleep(400);
      np = await app.evaluate(() => globalThis.__jojo.companion.nowPlaying);
    }
    assert.ok(np, 'música detectada');
    assert.equal(np.musica, 'One More Time');
    assert.equal(np.artista, 'Daft Punk');
    // League of Legends em primeiro plano: mau humor e sai.
    await app.evaluate((_e, i) => globalThis.__jojo.setTargetTitle(i, 'League of Legends'), id);
    let gone = false;
    for (let i = 0; i < 40 && !gone; i++) {
      await sleep(400);
      await app.evaluate(({ BrowserWindow }, i) => BrowserWindow.fromId(i)?.focus(), id);
      gone = await app.evaluate(() => !!(globalThis.__jojo.companion.lolLeaving || globalThis.__jojo.companion.lolHidden));
    }
    assert.ok(gone, 'saiu de mau humor com o LoL');
  } finally {
    await quit(app);
  }
});
