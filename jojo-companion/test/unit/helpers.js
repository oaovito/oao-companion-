// Ambiente simulado para testar o Companion sem Electron.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Companion } from '../../src/core/companion.js';
import { SettingsStore } from '../../src/core/settings-store.js';
import { DialogueEngine } from '../../src/core/dialogue/engine.js';
import { sanitizePersonality, PERSONALITY_DEFAULTS } from '../../src/core/personality.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function loadJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

export function seededRng(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class FakeClock {
  constructor() {
    this.t = 1000;
    this.timers = new Map();
    this.seq = 0;
  }
  now() {
    return this.t;
  }
  setTimeout(fn, ms) {
    const id = ++this.seq;
    this.timers.set(id, { at: this.t + Math.max(0, ms), fn });
    return id;
  }
  clearTimeout(id) {
    this.timers.delete(id);
  }
  /** Avança o tempo executando timers em ordem. */
  advance(ms, onStep) {
    const end = this.t + ms;
    for (;;) {
      let next = null;
      for (const [id, tm] of this.timers) if (tm.at <= end && (!next || tm.at < next[1].at)) next = [id, tm];
      if (!next) break;
      this.timers.delete(next[0]);
      this.t = Math.max(this.t, next[1].at);
      next[1].fn();
      if (onStep) onStep(this.t);
    }
    this.t = end;
  }
}

export class FakeOverlay {
  constructor() {
    this.mouseMode = 'passthrough';
    this.capture = false;
    this.bounds = null;
    this.visible = false;
    this.state = null;
    this.focused = false;
    this.modeLog = [];
    this.renders = 0;
  }
  setBounds(b) {
    this.bounds = { ...b };
  }
  setMouseMode(m) {
    this.mouseMode = m;
    this.capture = false;
    this.modeLog.push(m);
  }
  setCapture(c) {
    if (this.mouseMode === 'interactive') this.capture = c;
  }
  show() {
    this.visible = true;
  }
  hide() {
    this.visible = false;
  }
  focus() {
    this.focused = true;
  }
  render(s) {
    this.state = s;
    this.renders++;
  }
  measureBubble({ text, scale }) {
    const w = Math.min(260, 40 + text.length * 7) * scale;
    const lines = Math.ceil((text.length * 7) / 220);
    return { width: Math.round(w), height: Math.round((28 + lines * 20) * scale) };
  }
  /** Um clique em `p` chegaria à janela de trás? */
  clickPassesAt(p) {
    if (!this.visible || !this.bounds) return true;
    const b = this.bounds;
    const inside = p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
    if (!inside) return true;
    return this.mouseMode === 'passthrough' || !this.capture;
  }
}

export const ONE_MONITOR = [
  { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 }, scaleFactor: 1 },
];

export const TWO_MONITORS_NEG = [
  { id: 1, bounds: { x: 0, y: 0, width: 2560, height: 1440 }, workArea: { x: 0, y: 0, width: 2560, height: 1392 }, scaleFactor: 1.5 },
  { id: 2, bounds: { x: -1920, y: 200, width: 1920, height: 1080 }, workArea: { x: -1920, y: 200, width: 1920, height: 1040 }, scaleFactor: 1 },
];

export function makeEnv({ displays = ONE_MONITOR, settings = {}, profile = {}, seed = 7, dir = null } = {}) {
  const tmp = dir || fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-test-'));
  const store = new SettingsStore(tmp);
  store.load();
  store.update(settings, { silent: true, debounceMs: 1e9 });
  const personality = new SettingsStore(tmp, { fileName: 'personality.json', sanitize: sanitizePersonality, defaults: PERSONALITY_DEFAULTS, keepOnReset: [] });
  personality.load();
  personality.update(profile, { silent: true, debounceMs: 1e9 });
  const clock = new FakeClock();
  const overlay = new FakeOverlay();
  const env = { cursor: { x: 5, y: 5 }, displays: displays.map((d) => ({ ...d })) };
  const platform = {
    getCursor: () => ({ ...env.cursor }),
    getDisplays: () => env.displays,
    primaryDisplayId: () => env.displays[0].id,
  };
  const companion = new Companion({
    platform, overlay, clock, store, personality,
    rig: loadJSON('assets/character/jojo.rig.json'),
    room: loadJSON('assets/animations/jojo.room.json'),
    phrases: loadJSON('assets/dialogue/pt-BR.json'),
    dialogue: new DialogueEngine({ searchEnabled: () => store.get().webSearch }),
    rng: seededRng(seed),
  });
  return { companion, clock, overlay, store, personality, env, platform, dir: tmp };
}

/** Move o cursor em linha reta de `from` a `to` em `ms`, avançando o relógio. */
export function moveCursor(env, clock, from, to, ms, stepMs = 8, onStep) {
  const steps = Math.max(1, Math.round(ms / stepMs));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    env.cursor = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    clock.advance(stepMs);
    if (onStep) onStep(i);
  }
}

export function center(r) {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** Conversa com o relógio simulado (a resposta tem um "digitando…" curto). */
export async function chatAdv(e, text, conversationId = null) {
  const p = e.companion.chat(text, conversationId);
  for (let i = 0; i < 6; i++) {
    e.clock.advance(300);
    for (let k = 0; k < 6; k++) await Promise.resolve();
  }
  return p;
}
