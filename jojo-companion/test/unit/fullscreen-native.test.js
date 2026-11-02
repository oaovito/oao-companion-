import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, registerHooks } from 'node:module';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { ForegroundSample } from '../../src/core/foreground-sample.js';
import { matchFullscreenDisplay } from '../../src/core/displays.js';
const { classifyFullscreen, coveredDisplayIds, windowHasCaption } = createRequire(import.meta.url)('../../src/core/fullscreen-policy.cjs');
const monitor = { left: 0, top: 0, right: 1920, bottom: 1080 };
const small = { left: 300, top: 100, right: 1200, bottom: 900 };
test('fullscreen: busy, D3D global e apresentação/Meet não transformam janela comum ou JoJo em tela cheia', () => {
  for (const shell of [1, 2, 3, 4, 5]) {
    assert.equal(classifyFullscreen({ shell, monitor, window: small }).fullscreen, false);
    assert.equal(classifyFullscreen({ shell, monitor, window: monitor, own: true }).fullscreen, false);
  }
});
test('fullscreen: janela ativa cobrindo monitor é protegida, mas maximização normal, minimização e shell são distintos', () => {
  assert.equal(classifyFullscreen({ monitor, window: monitor, shell: 1 }).fullscreen, true);
  assert.equal(windowHasCaption(0x00cf0000), true);
  assert.equal(windowHasCaption(0x80040000), false, 'thick frame sem título não é janela maximizada comum');
  assert.equal(classifyFullscreen({ monitor, window: monitor, maximized: true, framed: true }).fullscreen, false);
  assert.equal(classifyFullscreen({ monitor, window: monitor, maximized: true, framed: false }).fullscreen, true);
  for (const extra of [{ minimized: true }, { visible: false }, { className: 'WorkerW' }, { shellWindow: true }, { window: null }]) assert.equal(classifyFullscreen({ monitor, window: monitor, ...extra }).fullscreen, false);
});
test('fullscreen: Alt+Tab e fechamento não conservam o estado global, só o monitor físico ocupado é associado', () => {
  const left = { left: -2560, top: 0, right: 0, bottom: 1440 };
  assert.equal(classifyFullscreen({ monitor: left, window: left }).fullscreen, true);
  assert.equal(classifyFullscreen({ monitor: left, window: small, shell: 3 }).fullscreen, false);
  const result = classifyFullscreen({ monitor: left, window: left });
  const dip = { x: result.monitor.x / 2, y: 0, width: result.monitor.width / 2, height: result.monitor.height / 2 };
  assert.equal(matchFullscreenDisplay(dip, [{ id: 'left-200%', bounds: dip }, { id: 'right-100%', bounds: { x: 0, y: 0, width: 1920, height: 1080 } }]).id, 'left-200%');
});
test('foreground: resposta atrasada, amostra velha e geração anterior ao restart/suspensão/topologia são descartadas', () => {
  let now = 1000; const guard = new ForegroundSample(() => now);
  const old = guard.begin(), current = guard.begin();
  assert.equal(guard.accept(old, { capturedAt: now, fullscreen: true }), false);
  assert.equal(guard.accept(current, { capturedAt: now, fullscreen: false }), true);
  guard.invalidate(); assert.equal(guard.last, null);
  assert.equal(guard.accept(current, { capturedAt: now, fullscreen: true }), false);
  const next = guard.begin(); now += 2500;
  assert.equal(guard.accept(next, { capturedAt: 1000 }), false);
  assert.equal(guard.accept(next, { capturedAt: now + 1000 }), false);
  assert.equal(guard.accept(next, { capturedAt: now }), true);
});
test('fullscreen: janela que ocupa dois monitores protege ambos em pixels físicos, inclusive com escalas diferentes', () => {
  const displays = [{ id: '200%', bounds: { x: -2560, y: 0, width: 2560, height: 1440 } }, { id: '100%', bounds: { x: 0, y: 0, width: 1920, height: 1080 } }];
  assert.deepEqual(coveredDisplayIds({ x: -2560, y: 0, width: 4480, height: 1440 }, displays), ['200%', '100%']);
  assert.deepEqual(coveredDisplayIds({ x: 0, y: 0, width: 1920, height: 1080 }, displays), ['100%']);
  assert.deepEqual(coveredDisplayIds({ x: 0, y: 0, width: 1200, height: 800 }, displays), []);
});

test('fullscreen monitor: protege o monitor menor coberto mesmo quando a maior interseção não é fullscreen; rejeita estados próprios e antigos', async t => {
  const displays = [{ id: 'menor', bounds: { x: 0, y: 0, width: 1920, height: 1080 } }, { id: 'maior', bounds: { x: 1920, y: 0, width: 2560, height: 1440 } }];
  const geometry = { window: { left: 0, top: 0, right: 3840, bottom: 1440 }, monitor: { left: 1920, top: 0, right: 4480, bottom: 1440 } };
  let result = classifyFullscreen(geometry), pending = null, hold = false;
  assert.equal(result.fullscreen, false, 'a maior interseção é o monitor maior, coberto parcialmente');
  class NativeProcess extends EventEmitter {
    postMessage(message) {
      if (message.type === 'init') queueMicrotask(() => this.emit('message', { type: 'ready' }));
      if (message.type === 'detect') {
        const reply = { type: 'result', id: message.id, result: { ...result, capturedAt: Date.now() } };
        pending = () => this.emit('message', reply);
        if (!hold) queueMicrotask(pending);
      }
    }
    kill() { this.emit('exit', 0); }
  }
  const key = Symbol.for('jojo.test.fullscreenUtility');
  globalThis[key] = { fork: () => new NativeProcess() };
  const hook = registerHooks({ resolve(specifier, context, next) {
    if (specifier === 'electron' && context.parentURL?.includes('/fullscreen-monitor.js')) return { url: `data:text/javascript,export const utilityProcess = globalThis[Symbol.for('jojo.test.fullscreenUtility')];`, shortCircuit: true };
    return next(specifier, context);
  } });
  let createFullscreenDetector;
  try { ({ createFullscreenDetector } = await import('../../src/main/fullscreen-monitor.js')); }
  finally { hook.deregister(); delete globalThis[key]; }
  const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
  let detector;
  try { Object.defineProperty(process, 'platform', { value: 'win32' }); detector = createFullscreenDetector(); }
  finally { Object.defineProperty(process, 'platform', originalPlatform); }
  t.after(() => detector.dispose());
  await new Promise(resolve => setImmediate(resolve));
  const detect = () => detector.detect(r => r, displays, { displayPixels: displays });
  assert.deepEqual((await detect()).fullscreenIds, ['menor']);
  for (const state of [{ own: true }, { maximized: true, framed: true }, { minimized: true }, { visible: false }]) {
    result = classifyFullscreen({ ...geometry, ...state });
    assert.deepEqual((await detect()).fullscreenIds, [], JSON.stringify(state));
  }
  result = classifyFullscreen(geometry); hold = true;
  const old = detect();
  detector.setGameInventory({ known: false, roots: [], games: [] });
  pending();
  const rejected = await old;
  assert.deepEqual(rejected.fullscreenIds, []); assert.equal(rejected.games.known, false);
  hold = false; assert.deepEqual((await detect()).fullscreenIds, ['menor']);
});

test('detector de jogos: inventário desconhecido pausa atividade e recuperação descarta processos e provas em cache', async () => {
  const workerUrl = new URL('../../src/main/fullscreen-worker.cjs', import.meta.url), require = createRequire(workerUrl);
  const image = 'E:\\SteamLibrary\\steamapps\\common\\Darkest Dungeon\\_windows\\Darkest.exe';
  const validManifest = '"AppState" { "appid" "262060" "installdir" "Darkest Dungeon" }';
  let listener, reply, manifest = validManifest, reads = 0, snapshots = 0;
  const native = {
    CreateToolhelp32Snapshot: () => { snapshots++; return 1; },
    Process32FirstW: (_snapshot, entry) => {
      Object.assign(entry, { th32ProcessID: 42, szExeFile: [...'Darkest.exe\0'].map(char => char.charCodeAt(0)) }); return 1;
    },
    Process32NextW: () => 0, OpenProcess: () => 1,
    QueryFullProcessImageNameW: (_handle, _flags, name, size) => { name.set([...image].map(char => char.charCodeAt(0))); size[0] = image.length; return 1; },
    GetExitCodeProcess: (_handle, code) => { code[0] = 259; return 1; },
    GetProcessTimes: (_handle, creation) => { creation.high = 1; creation.low = 2; return 1; },
  };
  const koffi = { struct: () => ({}), array: () => ({}), sizeof: () => 512,
    load: () => ({ func: signature => native[signature.match(/(\w+)\(/)[1]] || (() => 0) }) };
  runInNewContext(readFileSync(workerUrl, 'utf8'), { module: { exports: {} }, process: { parentPort: {
    on: (_event, callback) => { listener = callback; }, postMessage: value => { reply = value; },
  } }, require: name => name === 'koffi' ? koffi : name === 'node:fs' ? { readFileSync: () => { reads++; return manifest; } } : require(name), Date, Uint16Array, setTimeout });
  const send = async message => { await listener({ data: message }); return JSON.parse(JSON.stringify(reply)); };
  await send({ type: 'init', own: [] });
  let id = 0; const detect = async () => (await send({ type: 'detect', id: ++id, opts: { games: true, darkest: true } })).result;
  const unknown = await detect();
  assert.equal(unknown.games.known, false); assert.equal(unknown.darkest.known, false); assert.equal(snapshots, 0);
  const inventory = { known: true, roots: [], games: [] };
  await send({ type: 'inventory', inventory });
  assert.equal((await detect()).darkest.running, true); assert.equal(reads, 1);
  await detect(); assert.equal(reads, 1, 'prova válida fica em cache durante o mesmo inventário');
  await send({ type: 'inventory', inventory: { ...inventory, known: false } });
  const paused = await detect(), beforeRecovery = snapshots;
  assert.equal(paused.games.known, false); assert.equal(paused.darkest.known, false); assert.equal(reads, 1);
  manifest = '"AppState" { "appid" "123" "installdir" "Darkest Dungeon" }';
  await send({ type: 'inventory', inventory });
  const invalid = await detect();
  assert.ok(snapshots > beforeRecovery); assert.equal(invalid.darkest.running, false); assert.equal(invalid.darkest.reason, 'installation_not_verified'); assert.equal(reads, 2);
  manifest = validManifest; await send({ type: 'inventory', inventory });
  assert.equal((await detect()).darkest.running, true); assert.equal(reads, 3);
});
