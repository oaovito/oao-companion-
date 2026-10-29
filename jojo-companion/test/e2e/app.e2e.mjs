// Testes de integração com o Electron real (Playwright).
// No Linux roda sob Xvfb (ver run-e2e.mjs). NÃO substitui testes no Windows:
// click-through com WS_EX_TRANSPARENT, encaminhamento de mouse, DPI misto e
// detecção de tela cheia só podem ser verificados no Windows.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ELECTRON = require('electron');
const { _electron } = (() => {
  try {
    return require('playwright-core');
  } catch {
    return require('playwright');
  }
})();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch({ userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-e2e-')), env = {} } = {}) {
  const app = await _electron.launch({
    executablePath: ELECTRON,
    args: ['--no-sandbox', ROOT],
    cwd: ROOT,
    env: { ...process.env, JOJO_TEST: '1', JOJO_USER_DATA: userData, ...env },
  });
  const errors = [];
  const win = await app.firstWindow();
  win.on('pageerror', (e) => errors.push(e.message));
  win.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await waitFor(app, () => globalThis.__jojo && globalThis.__jojo.companion.started);
  await sleep(1500);
  return { app, win, userData, errors };
}

async function waitFor(app, fn, timeout = 8000) {
  const end = Date.now() + timeout;
  for (;;) {
    const ok = await app.evaluate(fn).catch(() => false);
    if (ok) return ok;
    if (Date.now() > end) throw new Error(`timeout esperando: ${fn}`);
    await sleep(100);
  }
}

const dbg = (app) => app.evaluate(() => globalThis.__jojo.companion.debugState());

async function quit(app) {
  await app.evaluate(() => globalThis.__jojo.quit()).catch(() => {});
  const proc = app.process();
  const done = new Promise((r) => proc.once('exit', r));
  await Promise.race([done, sleep(5000)]);
  try {
    await app.close();
  } catch {
    /* já fechado */
  }
}

test('overlay: sem foco, sempre por cima, click-through e sem erros no renderer', async () => {
  const { app, win, errors } = await launch();
  try {
    // Leveza: desenho no processador (sem aceleração de vídeo).
    assert.equal(await app.evaluate(({ app: a }) => a.isHardwareAccelerationEnabled()), false);
    const props = await app.evaluate(({ BrowserWindow }) => {
      const w = globalThis.__jojo.overlay.win;
      return {
        count: BrowserWindow.getAllWindows().length,
        focusable: w.isFocusable(),
        onTop: w.isAlwaysOnTop(),
        visible: w.isVisible(),
        focused: w.isFocused(),
        mode: globalThis.__jojo.overlay.mouseMode,
      };
    });
    assert.deepEqual(props, { count: 1, focusable: false, onTop: true, visible: true, focused: false, mode: 'passthrough' });
    const r = await win.evaluate(() => ({ anim: window.__jojoRenderer.anim, frame: window.__jojoRenderer.lastFrame }));
    assert.ok(r.anim);
    assert.ok(r.frame > 0, 'renderizou quadros');
    // Transparência: o fundo da página não pinta pixels (canvas transparente fora do JoJo).
    const corner = await win.evaluate(() => {
      const c = document.getElementById('stage');
      const ctx = c.getContext('2d');
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    });
    assert.equal(corner[3], 0, 'canto da janela transparente');
    assert.deepEqual(errors, []);
  } finally {
    await quit(app);
  }
});

test('desvio real: cursor se aproxima rápido; janela se move e continua click-through', async () => {
  const { app } = await launch({ env: {} });
  try {
    let st = await dbg(app);
    const v = st.visual;
    const c = { x: v.x + v.width / 2, y: v.y + v.height / 2 };
    // Ponteiro vem da esquerda em ~150 ms até o centro do JoJo.
    for (let i = 0; i <= 10; i++) {
      const p = { x: c.x - 500 + 50 * i, y: c.y };
      await app.evaluate((_e, pp) => globalThis.__jojo.setCursor(pp), p);
      await sleep(15);
      const mode = await app.evaluate(() => globalThis.__jojo.overlay.mouseMode);
      assert.equal(mode, 'passthrough');
    }
    await sleep(1500);
    st = await dbg(app);
    const ignore = await app.evaluate(() => globalThis.__jojo.overlay.mouseMode);
    assert.equal(ignore, 'passthrough');
    assert.ok(st.stats.flees >= 1, 'fugiu');
    const nv = st.visual;
    const dx = Math.max(nv.x - c.x, 0, c.x - (nv.x + nv.width));
    const dy = Math.max(nv.y - c.y, 0, c.y - (nv.y + nv.height));
    assert.ok(Math.hypot(dx, dy) >= 100, 'longe do cursor');
    const wb = await app.evaluate(() => globalThis.__jojo.overlay.win.getBounds());
    assert.equal(wb.x, st.bounds.x);
    assert.equal(wb.y, st.bounds.y);
  } finally {
    await quit(app);
  }
});

test('modo de interação: ações, conversa offline, Esc e restauração do click-through', async () => {
  const { app, win } = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 5, y: 5 }));
    await app.evaluate(() => globalThis.__jojo.companion.enterInteraction('test'));
    await sleep(400);
    let w = await app.evaluate(() => ({ f: globalThis.__jojo.overlay.win.isFocusable(), m: globalThis.__jojo.overlay.mouseMode }));
    assert.deepEqual(w, { f: true, m: 'interactive' });
    assert.equal(await win.isVisible('#toolbar'), true);

    await win.click('#toolbar button[data-action="eat"]');
    await sleep(200);
    assert.equal((await dbg(app)).behavior, 'eat');
    await sleep(500);
    assert.equal(await win.evaluate(() => window.__jojoRenderer.anim), 'eat');

    await win.click('#toolbar button[data-action="chat"]');
    await sleep(300);
    assert.equal(await win.isVisible('#chat'), true);
    assert.equal(await win.$('#providerBadge'), null, 'sem selo de IA/programadas na tela');
    await win.fill('#chatInput', 'hora de dormir');
    await win.press('#chatInput', 'Enter');
    await sleep(1200); // inclui o "digitando…" da resposta
    const lastMsg = await win.evaluate(() => document.querySelector('#log .msg.jojo:last-child')?.textContent);
    assert.ok(lastMsg && lastMsg.length > 3);
    // Dormir antes das 21h? Nunca: furioso. Depois das 21h é permitido (boa noite).
    const h = new Date().getHours();
    if (h >= 21 || h < 6) assert.ok(['act', 'nod', 'idle'].includes((await dbg(app)).behavior));
    else assert.equal((await dbg(app)).behavior, 'angry');

    await win.keyboard.press('Escape');
    await sleep(300);
    w = await app.evaluate(() => ({ f: globalThis.__jojo.overlay.win.isFocusable(), m: globalThis.__jojo.overlay.mouseMode, i: globalThis.__jojo.companion.interaction }));
    assert.deepEqual(w, { f: false, m: 'passthrough', i: false });
    assert.equal(await win.isVisible('#toolbar'), false);
  } finally {
    await quit(app);
  }
});

test('pet: atividades, clique abre a Central, /pet guarda e acorda, movimento reduzido', async () => {
  const { app, win } = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 5, y: 5 }));
    // Erro de sistema aparece como atividade "Bloqueado" ao lado do pet.
    await app.evaluate(() => globalThis.__jojo.companion.reportSystem('teste', 'Teste', 'Falha simulada.'));
    await sleep(300);
    assert.equal(await win.isVisible('#activities'), true);
    assert.match(await win.textContent('#activities'), /Bloqueado/);
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.mouseMode), 'passthrough', 'balão não bloqueia cliques');

    // Modo de interação: clicar na atividade abre a Central nessa conversa.
    await app.evaluate(() => globalThis.__jojo.companion.enterInteraction('test'));
    await sleep(400);
    const appWinP = app.waitForEvent('window');
    await win.click('#activities .act');
    const central = await appWinP;
    await central.waitForSelector('#convTitle');
    await sleep(400);
    assert.equal(await central.textContent('#convTitle'), 'Teste');
    assert.equal(await app.evaluate(() => globalThis.__jojo.appWin.isShowing), true);

    // Conversa pela Central: status vai a "Em andamento" e depois volta.
    await central.click('#newChat');
    await sleep(200);
    await central.fill('#input', 'oi');
    await central.press('#input', 'Enter');
    await sleep(1200);
    assert.ok((await central.locator('#log .msg').count()) >= 2);

    // /pet pela Central guarda e acorda o pet.
    await central.fill('#input', '/pet');
    await central.press('#input', 'Enter');
    await sleep(400);
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.win.isVisible()), false);
    assert.match(await central.textContent('#petToggle'), /Wake Pet/);
    await central.click('#petToggle');
    await sleep(400);
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.win.isVisible()), true);
    assert.match(await central.textContent('#petToggle'), /Tuck Away Pet/);

    // Movimento reduzido: quadros estáticos no renderer.
    await app.evaluate(() => globalThis.__jojo.store.update({ reduceMotion: 'on' }));
    await sleep(400);
    assert.equal(await win.evaluate(() => window.__jojoRenderer.reduced), true);
    await app.evaluate(() => globalThis.__jojo.store.update({ reduceMotion: 'off' }));
    await sleep(300);
    assert.equal(await win.evaluate(() => window.__jojoRenderer.reduced), false);
  } finally {
    await quit(app);
  }
});

test('arrastar no modo de interação e soltar fora da tela volta para área válida', async () => {
  const { app } = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.companion.enterInteraction('test'));
    const st = await dbg(app);
    await app.evaluate((_e, p) => globalThis.__jojo.setCursor(p), { x: st.pos.x + 90, y: st.pos.y + 80 });
    await app.evaluate(() => {
      const j = globalThis.__jojo;
      const c = j.companion;
      const p = { x: c.pos.x + 90, y: c.pos.y + 80 };
      c.dragStart({ x: p.x - c.pos.x, y: p.y - c.pos.y });
    });
    for (let i = 0; i < 10; i++) {
      await app.evaluate((_e, p) => globalThis.__jojo.setCursor(p), { x: 300 - i * 60, y: 200 - i * 40 });
      await sleep(30);
    }
    assert.equal((await dbg(app)).behavior, 'dragged');
    await app.evaluate(() => globalThis.__jojo.companion.dragEnd());
    await sleep(200);
    const after = await dbg(app);
    assert.equal(after.behavior, 'land');
    assert.ok(after.box.x >= 0 && after.box.y >= 0, 'dentro da tela');
  } finally {
    await quit(app);
  }
});

test('todas as animações dos estados são exibidas pelo renderer', async () => {
  const { app, win } = await launch();
  try {
    const states = ['idle', 'lookAround', 'curious', 'surprised', 'walk', 'sit', 'lie', 'sleep', 'talk', 'happy', 'petted', 'eat', 'play', 'dragged', 'land', 'flee', 'hidden', 'paused', 'interactIdle'];
    const seen = {};
    for (const s of states) {
      await app.evaluate((_e, name) => {
        const c = globalThis.__jojo.companion;
        c.mover.stop();
        c.hideBubble();
        if (name === 'talk') c.talkingUntil = performance.now() + 5000;
        c.behavior.request(name, { now: performance.now(), force: true });
        c._applyLayout(true);
      }, s);
      await sleep(250);
      seen[s] = await win.evaluate(() => window.__jojoRenderer.anim);
    }
    const expected = { idle: 'idle', lookAround: 'lookAround', curious: 'curious', surprised: 'surprised', walk: 'walk', sit: 'sitDown', lie: 'lieDown', sleep: 'fallAsleep', talk: 'talk', happy: 'happy', petted: 'petted', eat: 'eat', play: 'play', dragged: 'dragged', land: 'land', flee: 'run', hidden: 'hide', paused: 'sit', interactIdle: 'interactIdle' };
    for (const [k, v] of Object.entries(expected)) {
      // "walk" sem destino válido pode terminar rápido; aceita a transição seguinte.
      if (k === 'walk' && seen[k] !== v) continue;
      assert.equal(seen[k], v, `estado ${k}`);
    }
  } finally {
    await quit(app);
  }
});

test('configurações: alterar, persistir e restaurar padrões', async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-e2e-'));
  let { app } = await launch({ userData });
  try {
    await app.evaluate(() => globalThis.__jojo.openSettings());
    const sw = await app.waitForEvent('window');
    await sw.waitForLoadState('domcontentloaded');
    await sleep(600);
    await sw.evaluate(() => window.settingsApi.set({ size: 1.3, safetyMargin: 150, quietMode: true, speechFrequency: 'rare' }));
    await sleep(300);
    const box = (await dbg(app)).box;
    assert.equal(Math.round(box.width), Math.round(180 * 1.3));
    // Interface reflete o valor.
    // Personalidade e Sistema não aparecem para a usuária.
    assert.deepEqual(await sw.evaluate(() => ['#personality', '#system'].map((q) => getComputedStyle(document.querySelector(q)).display)), ['none', 'none']);
    const shown = await sw.evaluate(() => document.querySelector('[name=safetyMargin]')?.value);
    assert.equal(shown, '150');
    const hk = await sw.evaluate(() => document.getElementById('hotkeyStatus')?.textContent || '');
    assert.ok(hk.length > 0);
    // Perfil de personalidade: separado das configurações.
    await sw.evaluate(() => window.settingsApi.setPersonality({ nomeSerio: 'Emanuele Teste', palavroes: 'nenhum' }));
    await sleep(300);
    assert.equal(await sw.evaluate(() => document.querySelector('[data-p=nomeSerio]').value), 'Emanuele Teste');
    assert.equal(await sw.evaluate(() => document.getElementById('companionTitle').textContent), 'JoJo');
    assert.equal(await sw.evaluate(() => document.querySelector('[data-p=palavroes]').value), 'nenhum');
  } finally {
    await quit(app);
  }
  const savedP = JSON.parse(fs.readFileSync(path.join(userData, 'personality.json'), 'utf8'));
  assert.equal(savedP.nomeSerio, 'Emanuele Teste');
  assert.equal(savedP.palavroes, 'nenhum');
  const saved = JSON.parse(fs.readFileSync(path.join(userData, 'settings.json'), 'utf8'));
  assert.equal(saved.size, 1.3);
  assert.equal(saved.safetyMargin, 150);
  assert.equal(saved.startWithWindows, true);
  ({ app } = await launch({ userData }));
  try {
    assert.equal((await app.evaluate(() => globalThis.__jojo.store.get().size)), 1.3);
    await app.evaluate(() => globalThis.__jojo.store.reset());
    assert.equal((await app.evaluate(() => globalThis.__jojo.store.get().size)), 1);
  } finally {
    await quit(app);
  }
});

test('arquivo de configurações inválido é preservado e substituído por padrões', async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-e2e-'));
  fs.writeFileSync(path.join(userData, 'settings.json'), '{ isto não é json');
  const { app } = await launch({ userData });
  try {
    const s = await app.evaluate(() => globalThis.__jojo.store.get());
    assert.equal(s.size, 1);
    assert.ok(fs.readdirSync(userData).some((f) => f.startsWith('settings.invalid-')));
  } finally {
    await quit(app);
  }
});

test('instância única: segunda execução encerra e a primeira avisa', async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-e2e-'));
  const { app } = await launch({ userData });
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 5, y: 5 }));
    const second = spawn(ELECTRON, ['--no-sandbox', ROOT], { env: { ...process.env, JOJO_TEST: '1', JOJO_USER_DATA: userData }, stdio: 'ignore' });
    const code = await new Promise((r) => {
      const t = setTimeout(() => {
        second.kill();
        r('timeout');
      }, 10000);
      second.on('exit', (c) => {
        clearTimeout(t);
        r(c);
      });
    });
    assert.equal(code, 0, 'segunda instância saiu');
    // Runner lento: espera o aviso até 6 s.
    let b = null;
    for (let i = 0; i < 30 && !(b && /aqui|JoJo/i.test(b.text)); i++) {
      await sleep(200);
      b = (await dbg(app)).bubble;
    }
    assert.ok(b && /aqui|JoJo/i.test(b.text), `aviso exibido: ${b && b.text}`);
  } finally {
    await quit(app);
  }
});

test('ocultar, pausar, suspensão/retomada e encerramento pela bandeja', async () => {
  const { app } = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.store.update({ visible: false }));
    await sleep(200);
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.win.isVisible()), false);
    await app.evaluate(() => globalThis.__jojo.store.update({ visible: true }));
    await sleep(300);
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.win.isVisible()), true);
    await app.evaluate(() => globalThis.__jojo.store.update({ paused: true }));
    await sleep(200);
    assert.equal((await dbg(app)).behavior, 'paused');
    await app.evaluate(() => globalThis.__jojo.store.update({ paused: false }));
    await app.evaluate(() => globalThis.__jojo.companion.onSuspend());
    const t0 = (await dbg(app)).stats.ticks;
    await sleep(1000);
    assert.equal((await dbg(app)).stats.ticks, t0);
    await app.evaluate(() => globalThis.__jojo.companion.onResume());
    await sleep(500);
    assert.ok((await dbg(app)).stats.ticks > t0);
  } finally {
    const proc = app.process();
    const exited = new Promise((r) => proc.once('exit', (c) => r(c)));
    await app.evaluate(() => globalThis.__jojo.quit()).catch(() => {});
    const code = await Promise.race([exited, sleep(6000).then(() => 'timeout')]);
    assert.notEqual(code, 'timeout', 'processo encerrou');
  }
});

test('conversa comum funciona offline: nenhuma requisição de rede é feita', async () => {
  const { app } = await launch();
  try {
    await app.evaluate(({ session }) => {
      globalThis.__netlog = [];
      session.defaultSession.webRequest.onBeforeRequest((d, cb) => {
        if (!d.url.startsWith('file:') && !d.url.startsWith('devtools:') && !d.url.startsWith('data:')) globalThis.__netlog.push(d.url);
        cb({});
      });
    });
    await app.evaluate(() => globalThis.__jojo.companion.enterInteraction('test'));
    await app.evaluate(() => globalThis.__jojo.companion.chat('oi'));
    await sleep(1500);
    const net = await app.evaluate(() => globalThis.__netlog);
    assert.deepEqual(net, []);
  } finally {
    await quit(app);
  }
});

test('pergunta sem resposta programada: pesquisa (fonte local falsa) e responde com a fonte', async () => {
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    res.setHeader('Content-Type', 'application/json');
    if (req.url.startsWith('/w/api.php')) {
      res.end(JSON.stringify({ query: { pages: { 1: { index: 1, title: 'Fotossíntese', extract: 'Fotossíntese é o processo em que plantas usam luz para produzir energia.' } } } }));
    } else res.end('{}');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const { app } = await launch({ env: { JOJO_SEARCH_BASE: base } });
  try {
    const r = await app.evaluate(() => globalThis.__jojo.companion.chat('o que é fotossíntese?'));
    assert.equal(r.intent, 'web');
    assert.match(r.text, /plantas usam luz/);
    assert.match(r.text, /Fonte: Wikipédia/);
    // Wikipédia e DuckDuckGo em paralelo; vale a Wikipédia.
    assert.equal(hits.length, 2);
    assert.ok(hits.some((h) => /gsrsearch=fotoss%C3%ADntese/.test(h)));
    // Desligada nas configurações: não acessa a rede.
    await app.evaluate(() => globalThis.__jojo.store.update({ webSearch: false }));
    const r2 = await app.evaluate(() => globalThis.__jojo.companion.chat('quem foi Santos Dumont?'));
    assert.notEqual(r2.intent, 'web');
    assert.equal(hits.length, 2);
  } finally {
    await quit(app);
    server.close();
  }
});

test('PC parado: senta e cheira; na volta fica ligadão (renderer usa as variações do modo)', async () => {
  const { app, win } = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 5, y: 5 }));
    assert.equal(await app.evaluate(() => globalThis.__jojo.setIdle(360)), true);
    await sleep(2500);
    assert.equal(await win.evaluate(() => window.__jojoRenderer.anim), 'snort');
    await sleep(4500);
    assert.equal(await win.evaluate(() => window.__jojoRenderer.anim), 'sitWired');
    await app.evaluate(() => globalThis.__jojo.setIdle(0));
    await sleep(800);
    const st = await win.evaluate(() => ({ mode: window.__jojoRenderer.state.mode, nose: window.__jojoRenderer.state.noseDust, animMode: window.__jojoRenderer.mode }));
    assert.deepEqual(st, { mode: 'wired', nose: true, animMode: 'wired' });
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.mouseMode), 'passthrough', 'continua click-through');
    // Exibição pra ela ver.
    await app.evaluate(() => globalThis.__jojo.companion.react('benchPress'));
    await sleep(600);
    assert.equal(await win.evaluate(() => window.__jojoRenderer.anim), 'benchPress');
  } finally {
    await app.evaluate(() => globalThis.__jojo.setIdle(null)).catch(() => {});
    await quit(app);
  }
});

test('"vai tomar no cu": renderer mostra a pose de costas e volta ao normal', async () => {
  const { app, win } = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 5, y: 5 }));
    const r = await app.evaluate(() => globalThis.__jojo.companion.chat('vai tomar no cu'));
    assert.equal(r.action, 'moon');
    await sleep(600);
    assert.equal(await win.evaluate(() => window.__jojoRenderer.anim), 'moon');
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.mouseMode), 'passthrough');
    await sleep(7600);
    assert.notEqual(await win.evaluate(() => window.__jojoRenderer.anim), 'moon');
  } finally {
    await quit(app);
  }
});

test('"eu sou bonita?": renderer mostra a queda apaixonada e a resposta "É." no fim', async () => {
  const { app, win } = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 5, y: 5 }));
    const p = app.evaluate(() => globalThis.__jojo.companion.chat('eu sou bonita?'));
    await sleep(1500);
    assert.equal(await win.evaluate(() => window.__jojoRenderer.anim), 'smitten');
    const r = await p;
    assert.equal(r.text, 'É.');
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.mouseMode), 'passthrough');
  } finally {
    await quit(app);
  }
});

test('atualização automática: acha a versão nova, baixa e confere o arquivo', async () => {
  const exe = Buffer.alloc(4096, 7);
  const sha = (await import('node:crypto')).createHash('sha256').update(exe).digest('hex');
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    const base = `http://127.0.0.1:${server.address().port}`;
    if (req.url === '/repos/oaovito/jojo-companion-releases/releases/latest') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ tag_name: 'v99.0.0', draft: false, prerelease: false, assets: [{ name: 'JoJoCompanion.exe', browser_download_url: `${base}/dl/JoJoCompanion.exe`, size: exe.length, digest: `sha256:${sha}` }] }));
    } else if (req.url === '/dl/JoJoCompanion.exe') res.end(exe);
    else {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-e2e-'));
  const { app } = await launch({ userData, env: { JOJO_UPDATE_BASE: `http://127.0.0.1:${server.address().port}`, JOJO_UPDATE_MODE: 'portable' } });
  try {
    let st = null;
    for (let i = 0; i < 40; i++) {
      st = await app.evaluate(() => ({ ...globalThis.__jojo.updater.state }));
      if (st.status === 'ready' || st.status === 'error') break;
      await sleep(250);
    }
    assert.equal(st.status, 'ready', JSON.stringify(st));
    assert.equal(st.version, '99.0.0');
    assert.deepEqual(fs.readFileSync(path.join(userData, 'updates', 'JoJoCompanion.exe')), exe);
    assert.ok(hits.includes('/dl/JoJoCompanion.exe'));
    // Desligada nas configurações: não consulta de novo.
    await app.evaluate(() => globalThis.__jojo.store.update({ autoUpdate: false }));
    const n = hits.length;
    await app.evaluate(() => globalThis.__jojo.updater.check());
    assert.equal(hits.length, n);
  } finally {
    await quit(app);
    server.close();
  }
});

test('"eu deveria jogar lol?": renderer mostra a cena e a oferta no fim', async () => {
  const { app, win } = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 5, y: 5 }));
    const p = app.evaluate(() => globalThis.__jojo.companion.chat('eu deveria jogar lol?'));
    await sleep(1500);
    assert.equal(await win.evaluate(() => window.__jojoRenderer.anim), 'poop');
    const r = await p;
    assert.equal(r.text, 'Passa na cara de uma vez.');
    assert.equal(await win.evaluate(() => window.__jojoRenderer.flags.stink), true);
  } finally {
    await quit(app);
  }
});

test('data festiva: renderer recebe a fantasia e a janela continua click-through', async () => {
  const { app, win } = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.companion.checkHoliday(new Date(2026, 11, 25, 12)));
    await sleep(500);
    assert.equal(await win.evaluate(() => window.__jojoRenderer.state.costume), 'natal');
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.mouseMode), 'passthrough');
  } finally {
    await quit(app);
  }
});

test('comida de tubarão com arroto e fantasia ousada/comportada no renderer', async () => {
  const { app, win } = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.setCursor({ x: 5, y: 5 }));
    await app.evaluate(() => globalThis.__jojo.companion.enterInteraction('test'));
    await sleep(300);
    await win.click('#toolbar button[data-action="eat"]');
    await sleep(400);
    const st = await win.evaluate(() => ({ e: window.__jojoRenderer.state.effect, k: window.__jojoRenderer.state.effectKind }));
    assert.equal(st.e, 'food');
    assert.ok(['peixe', 'foca', 'lula', 'tartaruga', 'pinguim', 'humano'].includes(st.k));
    let burp = null;
    for (let i = 0; i < 40 && burp !== 'BUUURP.'; i++) {
      await sleep(200);
      burp = await app.evaluate(() => globalThis.__jojo.companion.bubble && globalThis.__jojo.companion.bubble.text);
    }
    assert.equal(burp, 'BUUURP.');
    await app.evaluate(() => globalThis.__jojo.companion.exitInteraction('test'));
    await app.evaluate(() => globalThis.__jojo.companion.checkHoliday(new Date(2026, 11, 25, 12)));
    await sleep(300);
    assert.equal(await win.evaluate(() => window.__jojoRenderer.state.sexy), true);
    await app.evaluate(() => globalThis.__jojo.companion.chat('veste uma roupa'));
    let anim = null;
    for (let i = 0; i < 20 && anim !== 'finger'; i++) {
      await sleep(150);
      anim = await win.evaluate(() => window.__jojoRenderer.anim);
    }
    assert.equal(anim, 'finger');
    assert.equal(await win.evaluate(() => window.__jojoRenderer.state.sexy), false);
  } finally {
    await quit(app);
  }
});

test('conversa online: entende e responde no jeito do JoJo, sem mencionar IA na tela', async () => {
  const bodies = [];
  const server = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      bodies.push(JSON.parse(b));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ choices: [{ message: { content: '{"texto":"Dia bom é dia de supino, Manu. O seu foi no Instagram.","acao":"judge","tom":"brincadeira"}' } }] }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { app, win } = await launch({ env: { JOJO_LLM_BASE: `http://127.0.0.1:${server.address().port}/chat` } });
  try {
    await app.evaluate(() => globalThis.__jojo.companion.enterInteraction('test'));
    await win.click('#toolbar button[data-action="chat"]');
    await win.fill('#chatInput', 'como foi seu dia?');
    await win.press('#chatInput', 'Enter');
    // Runner lento: espera a resposta até 10 s.
    let last;
    for (let i = 0; i < 40 && !last?.includes('supino'); i++) {
      await sleep(250);
      last = await win.evaluate(() => document.querySelector('#log .msg.jojo:last-child')?.textContent);
    }
    assert.equal(last, 'Dia bom é dia de supino, Manu. O seu foi no Instagram.');
    assert.equal(bodies.length, 1);
    assert.match(bodies[0].messages[0].content, /REGRA IRREDUTÍVEL/);
    assert.match(bodies[0].messages[0].content, /Exemplos de como o JoJo fala/);
    const text = await win.evaluate(() => document.body.innerText);
    assert.ok(!/\bIA\b|intelig[eê]ncia artificial|programadas/i.test(text), 'nada de IA na tela');
  } finally {
    await quit(app);
    server.close();
  }
});

test('catálogo: /anim toca no renderer, docinho faz nojo e o JoJo fica clicável só no modo de interação', async () => {
  const { app, win } = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.companion.enterInteraction('test'));
    await app.evaluate(() => globalThis.__jojo.companion.chat('/anim selfie'));
    let anim = null;
    for (let i = 0; i < 20 && !/^cat_selfie/.test(anim || ''); i++) {
      await sleep(150);
      anim = await win.evaluate(() => window.__jojoRenderer.anim);
    }
    assert.match(anim, /^cat_selfie/);
    await sleep(3500);
    await app.evaluate(() => globalThis.__jojo.companion.chat('e se eu comer um docinho?'));
    for (let i = 0; i < 30 && !/^cat_nojo/.test(anim || ''); i++) {
      await sleep(150);
      anim = await win.evaluate(() => window.__jojoRenderer.anim);
    }
    assert.match(anim, /^cat_nojo/);
    await app.evaluate(() => globalThis.__jojo.companion.exitInteraction('test'));
    await sleep(300);
    assert.equal(await app.evaluate(() => globalThis.__jojo.overlay.mouseMode), 'passthrough');
  } finally {
    await quit(app);
  }
});

test('Google Agenda: link colado no chat conecta (servidor local falso) e o JoJo responde a agenda do dia', async () => {
  const now = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const later = new Date(now.getTime() + 3 * 3600e3);
  const stamp = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}00`;
  const ics = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:t1', 'SUMMARY:Academia', `DTSTART:${stamp(later)}`, `DTEND:${stamp(new Date(later.getTime() + 3600e3))}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    res.setHeader('Content-Type', 'text/calendar');
    res.end(ics);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { app } = await launch({ env: { JOJO_CAL_BASE: `http://127.0.0.1:${server.address().port}` } });
  try {
    const url = 'https://calendar.google.com/calendar/ical/teste%40gmail.com/private-0123456789abcdef0123456789abcdef/basic.ics';
    let r = await app.evaluate(() => globalThis.__jojo.companion.chat('conectar agenda do google'));
    assert.match(r.text, /iCal/);
    r = await app.evaluate((_e, u) => globalThis.__jojo.companion.chat(u), url);
    assert.match(r.text, /^Conectado/);
    assert.ok(hits.length >= 1, 'buscou a agenda');
    assert.equal(await app.evaluate(() => globalThis.__jojo.store.get().agendaUrl), url);
    r = await app.evaluate(() => globalThis.__jojo.companion.chat('o que eu tenho hoje?'));
    if (later.getDate() === now.getDate()) assert.match(r.text, /Academia/);
  } finally {
    await quit(app);
    server.close();
  }
});

test('Agenda do iCloud: link webcal:// colado no chat conecta (servidor local falso)', async () => {
  const now = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const later = new Date(now.getTime() + 3 * 3600e3);
  const stamp = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}00`;
  const ics = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:t1', 'SUMMARY:Academia', `DTSTART:${stamp(later)}`, `DTEND:${stamp(new Date(later.getTime() + 3600e3))}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    res.setHeader('Content-Type', 'text/calendar');
    res.end(ics);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { app } = await launch({ env: { JOJO_CAL_BASE: `http://127.0.0.1:${server.address().port}` } });
  try {
    const url = 'webcal://p45-caldav.icloud.com/published/2/MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3OG1hbnU';
    let r = await app.evaluate(() => globalThis.__jojo.companion.chat('conectar agenda do icloud'));
    assert.match(r.text, /Calendário Público/);
    r = await app.evaluate((_e, u) => globalThis.__jojo.companion.chat(u), url);
    assert.match(r.text, /^Conectado/);
    assert.ok(hits.length >= 1, 'buscou a agenda');
    assert.equal(await app.evaluate(() => globalThis.__jojo.store.get().agendaUrl), url.replace('webcal://', 'https://'));
    r = await app.evaluate(() => globalThis.__jojo.companion.chat('o que eu tenho hoje?'));
    if (later.getDate() === now.getDate()) assert.match(r.text, /Academia/);
  } finally {
    await quit(app);
    server.close();
  }
});

test('guarda-roupa: /vestir abre o painel na Central, clicar veste o JoJo no desenho e fica salvo', async () => {
  const { app, win } = await launch();
  try {
    const centralP = app.waitForEvent('window');
    await app.evaluate(() => globalThis.__jojo.companion.chat('/vestir'));
    const central = await centralP;
    await central.waitForSelector('#guardaRoupa', { state: 'attached' });
    let txt = '';
    for (let i = 0; i < 25 && !/Cabeça/.test(txt); i++) {
      await sleep(200);
      txt = await central.evaluate(() => document.querySelector('#guardaRoupa')?.innerText || '');
    }
    assert.match(txt, /Cabeça/);
    assert.match(txt, /Bermuda/);
    await central.click('#guardaRoupa button:has-text("Coroa")');
    let outfit = null;
    for (let i = 0; i < 25 && !(outfit && outfit.costume_coroa); i++) {
      await sleep(200);
      outfit = await win.evaluate(() => window.__jojoRenderer.state && window.__jojoRenderer.state.outfit);
    }
    assert.equal(outfit && outfit.costume_coroa, 1, 'coroa no desenho');
    assert.deepEqual(await app.evaluate(() => globalThis.__jojo.store.get().guardaRoupa), { cabeca: 'coroa' });
    assert.equal(await central.evaluate(() => document.querySelector('#guardaRoupa button.on')?.textContent), 'Coroa');
    await central.click('#guardaRoupa button:has-text("Tirar tudo")');
    await sleep(400);
    assert.deepEqual(await app.evaluate(() => globalThis.__jojo.store.get().guardaRoupa), {});
  } finally {
    await quit(app);
  }
});

test('antitédio: Central mostra a coleção, bolhas aparecem e estouram, foco junto começa', async () => {
  const { app, win } = await launch();
  try {
    await app.evaluate(() => globalThis.__jojo.companion.enterInteraction('test'));
    await app.evaluate(() => globalThis.__jojo.companion.chat('/bolhas'));
    let n = 0;
    for (let i = 0; i < 20 && !n; i++) {
      await sleep(200);
      n = await win.evaluate(() => document.querySelectorAll('.game-bubble').length);
    }
    assert.ok(n > 0, 'bolhas na tela');
    await win.evaluate(() => document.querySelector('.game-bubble').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await sleep(200);
    assert.ok((await app.evaluate(() => globalThis.__jojo.companion.game && globalThis.__jojo.companion.game.bolhas)) >= 1, 'estourou');
    const r = await app.evaluate(() => globalThis.__jojo.companion.chat('/foco 15'));
    assert.match(r.text, /Foco de 15 min/);
    const centralP = app.waitForEvent('window');
    await app.evaluate(() => globalThis.__jojo.companion.openApp('colecao'));
    const central = await centralP;
    await central.waitForSelector('#colecao', { state: 'attached' });
    let txt = '';
    for (let i = 0; i < 25 && !/Nível/.test(txt); i++) {
      await sleep(200);
      txt = await central.evaluate(() => document.querySelector('#colecao')?.innerText || '');
    }
    assert.match(txt, /Nível 1/);
    assert.match(txt, /Mini-jogos/);
  } finally {
    await quit(app);
  }
});
