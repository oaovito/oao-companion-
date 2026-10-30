import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BehaviorMachine, STATES, PRIORITY, autoWeights } from '../../src/core/behavior.js';
import { sanitize, DEFAULTS, isValidAccelerator, SETTINGS_VERSION } from '../../src/core/settings-schema.js';
import { SettingsStore } from '../../src/core/settings-store.js';
import { detectIntent, ScriptedProvider } from '../../src/core/dialogue/scripted-provider.js';
import { DialogueEngine } from '../../src/core/dialogue/engine.js';
import { DialogueProvider, normalizeReply } from '../../src/core/dialogue/provider.js';
import { PhraseBook, readingTimeMs } from '../../src/core/phrases.js';
import { placeAround, composeWindow } from '../../src/core/layout.js';
import { recoverRect, allowedDisplays } from '../../src/core/displays.js';
import { rectInside, overlapArea } from '../../src/core/geometry.js';
import { Mover } from '../../src/core/motion.js';
import { Animator, evalTrack } from '../../src/renderer/shared/animator.js';
import { loadJSON, seededRng, TWO_MONITORS_NEG } from './helpers.js';

const ANIMS = loadJSON('assets/animations/jojo.animations.json');
const RIG = loadJSON('assets/character/jojo.rig.json');
const PHRASES = loadJSON('assets/dialogue/pt-BR.json');

// ------------------------------------------------------------ assets

test('assets: toda animação usada pela máquina de estados existe', () => {
  const used = new Set();
  for (const def of Object.values(STATES)) {
    for (const ph of def.phases) used.add(ph.anim);
    if (def.exit) used.add(def.exit.anim);
  }
  for (const a of used) assert.ok(ANIMS.animations[a], `animação ausente: ${a}`);
});

test('assets: animações usam apenas canais conhecidos, tempos ordenados e poses válidas', () => {
  const channels = new Set(Object.keys(ANIMS.channels));
  for (const [name, a] of Object.entries(ANIMS.animations)) {
    assert.ok(a.duration > 0, name);
    if (a.base) assert.ok(ANIMS.poses[a.base], `${name}: pose ${a.base}`);
    for (const [ch, keys] of Object.entries(a.tracks)) {
      assert.ok(channels.has(ch), `${name}: canal ${ch}`);
      for (let i = 1; i < keys.length; i++) assert.ok(keys[i][0] >= keys[i - 1][0], `${name}.${ch} fora de ordem`);
      for (const k of keys) assert.ok(Number.isFinite(k[1]), `${name}.${ch} valor`);
    }
  }
  for (const [p, vals] of Object.entries(ANIMS.poses)) for (const ch of Object.keys(vals)) assert.ok(channels.has(ch), `pose ${p}: ${ch}`);
});

test('assets: ações exigidas têm animações distintas', () => {
  const required = ['idle', 'lookAround', 'walk', 'run', 'sitDown', 'sit', 'lieDown', 'lie', 'fallAsleep', 'sleep', 'wake', 'talk', 'happy', 'petted', 'eat', 'play', 'curious', 'surprised', 'dragged', 'land', 'appear', 'goodbye'];
  const sigs = new Set();
  for (const r of required) {
    const a = ANIMS.animations[r];
    assert.ok(a, r);
    sigs.add(JSON.stringify([a.base, a.tracks, a.duration]));
  }
  assert.equal(sigs.size, required.length, 'nenhuma animação repetida');
});

test('assets: rig tem partes com canais existentes e métricas simétricas', () => {
  const channels = new Set(Object.keys(ANIMS.channels));
  for (const g of RIG.groups) {
    for (const p of g.parts) {
      assert.ok(typeof p.path === 'string' && p.path.startsWith('M'), p.id);
      if (p.rot) assert.ok(channels.has(p.rot), p.rot);
      if (p.lift) assert.ok(channels.has(p.lift), p.lift);
      assert.ok(RIG.palette[p.fill], `cor ${p.fill}`);
    }
  }
  const m = RIG.metrics;
  assert.equal(m.visual.x * 2 + m.visual.width, m.box.width, 'área visível centralizada (espelhamento)');
});

test('assets: frases em pt-BR com categorias usadas pelo app', () => {
  for (const c of ['greeting', 'morning', 'afternoon', 'night', 'idleSpeech', 'idleThought', 'curious', 'petted', 'food', 'play', 'sleep', 'wake', 'dragged', 'land', 'interactEnter', 'interactExit', 'alreadyRunning', 'goodbye', 'unpause', 'sleepy']) {
    assert.ok(PHRASES.categories[c] && PHRASES.categories[c].lines.length, c);
    assert.ok(['speech', 'thought', 'sleep'].includes(PHRASES.categories[c].kind), c);
  }
});

// ------------------------------------------------------------ animador

test('animador: blend a partir da pose anterior (sentar → levantar)', () => {
  const a = new Animator(ANIMS, { rng: () => 0.99 });
  const sitY = ANIMS.poses.sit.rootY;
  const blend = ANIMS.animations.sitDown.blendIn;
  a.play('sitDown', 0);
  const mid = a.sample(blend / 2).pose;
  assert.ok(mid.rootY > 0 && mid.rootY < sitY, `meio da transição: ${mid.rootY}`);
  const end = a.sample(2000).pose;
  assert.ok(Math.abs(end.rootY - sitY) < 0.01);
  a.play('standUp', 2000);
  const s0 = a.sample(2001).pose;
  assert.ok(Math.abs(s0.rootY - sitY) < 0.5, 'começa da pose sentada');
  const s1 = a.sample(2000 + ANIMS.animations.standUp.blendIn + 200).pose;
  assert.ok(Math.abs(s1.rootY) < 0.01, 'termina em pé');
  assert.ok(Math.abs(evalTrack([[0, 0], [1, 10]], 0.5) - 5) < 1e-9);
  assert.equal(evalTrack([[0, 0], [1, 10, 'step']], 0.9), 0, 'step segura o valor até a chave');
});

test('animador: estilo recorte de papel avança em degraus (stepFps)', () => {
  const fps = ANIMS.style.stepFps;
  assert.ok(fps > 0 && fps <= 15, 'poucos quadros por segundo');
  const a = new Animator(ANIMS, { rng: () => 0.99 });
  a.play('walk', 0);
  const step = 1000 / fps;
  const p1 = a.sample(step * 2 + 1).pose.rootY;
  const p2 = a.sample(step * 3 - 1).pose.rootY;
  const p3 = a.sample(step * 3 + 1).pose.rootY;
  assert.equal(p1, p2, 'mesmo quadro dentro do degrau');
  assert.notEqual(p2, p3, 'muda no próximo degrau');
});

// ------------------------------------------------------------ máquina de estados

test('máquina de estados: prioridades e interrupções', () => {
  const m = new BehaviorMachine({ rng: seededRng(1) });
  m.request('sleep', { now: 0 });
  assert.equal(m.state, 'sleep');
  assert.equal(m.request('lookAround', { now: 10 }), true, 'AUTO pode trocar AUTO');
  m.request('eat', { now: 20 });
  assert.equal(m.request('walk', { now: 30 }), false, 'AUTO não interrompe INTERACT');
  assert.equal(m.request('flee', { now: 40 }), true, 'AVOID interrompe tudo');
  assert.equal(m.request('petted', { now: 50 }), false, 'INTERACT não interrompe AVOID');
  m.finish('flee', 60);
  assert.equal(m.state, 'idle');
  assert.equal(PRIORITY.AVOID < PRIORITY.COMMAND && PRIORITY.COMMAND < PRIORITY.INTERACT && PRIORITY.INTERACT < PRIORITY.AUTO, true);
});

test('máquina de estados: fases e saída natural (sentar → levantar)', () => {
  const m = new BehaviorMachine({ rng: () => 0 });
  const anims = [];
  m.on((e) => anims.push(e.anim));
  m.request('sit', { now: 0 });
  m.tick(700);
  assert.equal(m.anim, 'sit');
  m.tick(6000);
  assert.equal(m.anim, 'standUp');
  m.tick(6700);
  assert.ok(['idle', 'lie'].includes(m.state));
  assert.deepEqual(anims.slice(0, 3), ['sitDown', 'sit', 'standUp']);
});

test('máquina de estados: sono e despertar; acordado → idle', () => {
  const m = new BehaviorMachine({ rng: () => 0 });
  m.request('sleep', { now: 0 });
  m.tick(1400);
  assert.equal(m.sleeping, true);
  m.tick(25000);
  assert.equal(m.anim, 'wake');
  m.tick(26600);
  assert.equal(m.state, 'idle');
});

test('máquina de estados: atividade baixa favorece descanso; alerta impede passeio', () => {
  const calm = autoWeights(0);
  const busy = autoWeights(1);
  assert.ok(calm.walk < busy.walk);
  assert.ok(calm.sit > busy.sit);
  const m = new BehaviorMachine({ rng: seededRng(3), activity: 1 });
  for (let i = 0; i < 50; i++) assert.notEqual(m.pickAuto({ alert: true }), 'walk');
});

test('máquina de estados: evita repetir o mesmo comportamento em sequência', () => {
  const m = new BehaviorMachine({ rng: seededRng(9), activity: 0.5 });
  let now = 0;
  m.request('idle', { now });
  let repeats = 0;
  let prev = null;
  for (let i = 0; i < 400; i++) {
    now += 500;
    m.tick(now);
    if (m.state === 'walk') m.finish('walk', now);
    if (m.state !== prev && m.state === prev) repeats++;
    prev = m.state;
  }
  const h = m.history.filter((s) => s !== 'idle');
  let same = 0;
  for (let i = 1; i < h.length; i++) if (h[i] === h[i - 1]) same++;
  assert.ok(same <= Math.ceil(h.length * 0.3), `repetições: ${same}/${h.length}`);
});

// ------------------------------------------------------------ configurações

test('configurações: valores inválidos voltam ao padrão, faixas são limitadas', () => {
  const { settings, issues } = sanitize({ size: 99, safetyMargin: 'x', speechFrequency: 'muito', quietMode: 'sim', interactionHotkey: 'J', position: { x: NaN, y: 2 } });
  assert.equal(settings.size, 1.8);
  assert.equal(settings.safetyMargin, DEFAULTS.safetyMargin);
  assert.equal(settings.speechFrequency, DEFAULTS.speechFrequency);
  assert.equal(settings.quietMode, false);
  assert.equal(settings.interactionHotkey, 'Control+Alt+J');
  assert.equal(settings.position, null);
  assert.ok(issues.length >= 5);
  assert.equal(settings.version, SETTINGS_VERSION);
});

test('configurações: padrões exigidos (sons off, iniciar com Windows off, margem 100)', () => {
  assert.equal('sounds' in DEFAULTS, false, 'sem som: não existe opção de som');
  assert.equal(DEFAULTS.startWithWindows, true);
  assert.equal(DEFAULTS.safetyMargin, 100);
  assert.equal(DEFAULTS.interactionHotkey, 'Control+Alt+J');
});

test('configurações: migração v0 e aceleradores', () => {
  const { settings } = sanitize({ margin: 160, hotkey: 'Control+Shift+K' });
  assert.equal(settings.safetyMargin, 160);
  assert.equal(settings.interactionHotkey, 'Control+Shift+K');
  assert.ok(isValidAccelerator('Control+Alt+J'));
  assert.ok(isValidAccelerator('Alt+F9'));
  assert.ok(!isValidAccelerator('J'));
  assert.ok(!isValidAccelerator('Control+Alt+Ç'));
});

test('store: arquivo corrompido é preservado; escrita atômica; reset mantém posição', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-st-'));
  fs.writeFileSync(path.join(dir, 'settings.json'), '{"size": 1.2, ');
  const st = new SettingsStore(dir);
  st.load();
  assert.equal(st.get().size, 1);
  assert.ok(fs.readdirSync(dir).some((f) => f.startsWith('settings.invalid-')));
  st.update({ size: 1.4, position: { x: 10, y: 20, displayId: '1' } });
  st.saveNow();
  assert.equal(JSON.parse(fs.readFileSync(st.file, 'utf8')).size, 1.4);
  assert.ok(!fs.existsSync(`${st.file}.tmp`));
  st.reset();
  assert.equal(st.get().size, 1);
  assert.deepEqual(st.get().position, { x: 10, y: 20, displayId: '1' });
});

// ------------------------------------------------------------ diálogo

test('diálogo: intenções básicas em português, com e sem acento', () => {
  assert.equal(detectIntent('Oi JoJo!'), 'greet');
  assert.equal(detectIntent('bom dia'), 'greet');
  assert.equal(detectIntent('Tá com fome?'), 'eat');
  assert.equal(detectIntent('vamos brincar de bola'), 'play');
  assert.equal(detectIntent('hora de dormir'), 'sleep');
  assert.equal(detectIntent('ACORDA!'), 'wake');
  assert.equal(detectIntent('obrigado'), 'thanks');
  assert.equal(detectIntent('qual é o sentido da vida'), 'unknown');
});

test('diálogo: provedor programado offline e fallback de provedor que falha', async () => {
  const p = new ScriptedProvider({ rng: () => 0 });
  assert.equal(await p.isAvailable(), true);
  const r = await p.reply({ text: 'quer comer?' });
  assert.equal(r.action, 'eat');
  class Broken extends DialogueProvider {
    constructor() {
      super({ id: 'x', label: 'X', kind: 'remote-api' });
    }
    async isAvailable() {
      return true;
    }
    async reply() {
      throw new Error('sem rede');
    }
  }
  const eng = new DialogueEngine();
  eng.register(new Broken());
  eng.activeId = 'x';
  const out = await eng.reply('oi');
  assert.ok(out.text.length > 0);
  assert.equal(normalizeReply({ text: 'a', action: 'rm -rf' }).action, null, 'ações desconhecidas são descartadas');
});

// ------------------------------------------------------------ frases

test('frases: sem repetição imediata e substituição de variáveis', () => {
  const pb = new PhraseBook(PHRASES, { rng: seededRng(4) });
  const seen = [];
  for (let i = 0; i < 30; i++) seen.push(pb.pick('idleSpeech', { atalho: 'Ctrl + Alt + J' }).text);
  for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1]);
  assert.ok(seen.some((t) => t.includes('Ctrl + Alt + J')));
  assert.ok(!seen.some((t) => t.includes('{atalho}')));
  assert.ok(readingTimeMs('oi') >= 2400);
  assert.ok(readingTimeMs('x'.repeat(120)) > readingTimeMs('x'.repeat(20)));
  assert.ok(readingTimeMs('x'.repeat(1000)) <= 9500);
});

// ------------------------------------------------------------ layout e monitores

test('layout: balão em cima; perto da borda superior vai para o lado; sempre dentro do monitor', () => {
  const wa = { x: 0, y: 0, width: 1920, height: 1040 };
  const size = { width: 220, height: 60 };
  const mid = placeAround({ x: 900, y: 500, width: 140, height: 108 }, size, wa);
  assert.equal(mid.side, 'top');
  const topEdge = placeAround({ x: 900, y: 10, width: 140, height: 108 }, size, wa);
  assert.notEqual(topEdge.side, 'top');
  assert.ok(rectInside(topEdge.rect, wa));
  const corner = placeAround({ x: 1780, y: 5, width: 140, height: 108 }, size, wa);
  assert.ok(rectInside(corner.rect, wa));
  assert.equal(overlapArea(corner.rect, { x: 1780, y: 5, width: 140, height: 108 }), 0);
  const { bounds, rel } = composeWindow({ x: 880, y: 460, width: 180, height: 150 }, [mid]);
  assert.ok(bounds.y <= mid.rect.y);
  assert.ok(rel(mid.rect).x >= 0);
});

test('monitores: recuperação com coordenadas negativas e monitor preferido', () => {
  const lost = { x: -5000, y: 300, width: 180, height: 150 };
  const r = recoverRect(lost, TWO_MONITORS_NEG);
  assert.ok(r.changed);
  assert.ok(rectInside(r.rect, r.display.workArea));
  const only = allowedDisplays(TWO_MONITORS_NEG, { preferredId: '2', allowSwitch: false });
  assert.deepEqual(only.map((d) => d.id), [2]);
});

test('movimento: chega ao destino e respeita duração mínima/máxima', () => {
  const m = new Mover();
  m.start({ x: 0, y: 0 }, { x: 1000, y: 0 }, { speed: 1000, now: 0, maxMs: 600, easing: 'out' });
  assert.equal(m.path.duration, 600);
  const s = m.sample(300);
  assert.ok(s.x > 500, 'arranque rápido na fuga');
  const e = m.sample(600);
  assert.equal(e.done, true);
  assert.equal(e.x, 1000);
  assert.equal(m.active, false);
});

test('iniciar com o Windows: ligado por padrão e migrado de configurações antigas', async () => {
  const { sanitize } = await import('../../src/core/settings-schema.js');
  assert.equal(sanitize({}).settings.startWithWindows, true);
  assert.equal(sanitize({ version: 1, startWithWindows: false }).settings.startWithWindows, true, 'padrão antigo vira o novo');
  assert.equal(sanitize({ version: 2, startWithWindows: false }).settings.startWithWindows, false, 'quem desmarcou continua desmarcado');
});
