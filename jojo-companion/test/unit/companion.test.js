import { SETTINGS_VERSION } from '../../src/core/settings-schema.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeEnv, moveCursor, center, TWO_MONITORS_NEG, ONE_MONITOR } from './helpers.js';
import { chatAdv } from './helpers.js';
import { distPointRect, rectInside } from '../../src/core/geometry.js';
import { SettingsStore } from '../../src/core/settings-store.js';

function started(opts) {
  const e = makeEnv(opts);
  e.companion.start();
  e.clock.advance(2000);
  return e;
}

function visual(e) {
  return e.companion.debugState().visual;
}

test('inicia com click-through, visível e dentro da área útil', () => {
  const e = started();
  const st = e.companion.debugState();
  assert.equal(e.overlay.mouseMode, 'passthrough');
  assert.equal(e.overlay.visible, true);
  assert.ok(rectInside(st.box, ONE_MONITOR[0].workArea));
});

test('movimento rápido seguido de clique: o clique atravessa durante toda a fuga', () => {
  const e = started();
  const v = visual(e);
  const c = center(v);
  const clicks = [];
  // Cursor vem de longe muito rápido e "clica" a cada passo, inclusive sobre o JoJo.
  moveCursor(e.env, e.clock, { x: c.x - 600, y: c.y }, { x: c.x, y: c.y }, 150, 8, () => {
    clicks.push(e.overlay.clickPassesAt(e.env.cursor));
  });
  for (let i = 0; i < 40; i++) {
    e.clock.advance(16);
    clicks.push(e.overlay.clickPassesAt(e.env.cursor));
  }
  assert.ok(clicks.every(Boolean), 'todos os cliques devem atravessar');
  assert.ok(e.overlay.modeLog.every((m) => m === 'passthrough'));
  const after = visual(e);
  assert.ok(distPointRect(e.env.cursor, after) >= 100, 'JoJo saiu do caminho');
  assert.ok(e.companion.stats.flees >= 1);
});

test('aproximação lenta pelos quatro lados termina com JoJo fora da margem', () => {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const e = started({ seed: 3 });
    // Centraliza o JoJo para ter espaço.
    e.companion.pos = { x: 860, y: 450 };
    e.clock.advance(50);
    const v = visual(e);
    const c = center(v);
    const from = { x: c.x + dx * 400, y: c.y + dy * 400 };
    moveCursor(e.env, e.clock, from, c, 1200);
    e.clock.advance(1500);
    assert.ok(distPointRect(e.env.cursor, visual(e)) >= 100, `lado ${dx},${dy}`);
    assert.ok(rectInside(e.companion.debugState().box, ONE_MONITOR[0].workArea));
  }
});

test('ponteiro perseguindo o JoJo: sem travar, cliques passam, e recorre ao modo discreto', () => {
  const e = started({ seed: 11 });
  let hiddenSeen = false;
  for (let i = 0; i < 300; i++) {
    const v = visual(e);
    const c = center(v);
    const cur = e.env.cursor;
    // Persegue com velocidade alta.
    const k = 0.35;
    e.env.cursor = { x: cur.x + (c.x - cur.x) * k, y: cur.y + (c.y - cur.y) * k };
    e.clock.advance(16);
    assert.ok(e.overlay.clickPassesAt(e.env.cursor));
    if (e.companion.ghost) hiddenSeen = true;
  }
  assert.ok(hiddenSeen, 'deveria recorrer ao modo discreto ao ser perseguido');
  // Cursor vai embora → volta ao normal.
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  if (distPointRect(e.env.cursor, visual(e)) > 200) assert.equal(e.companion.ghost, false);
});

test('balão aberto próximo ao cursor é recolhido', async () => {
  const e = started();
  e.env.cursor = { x: 5, y: 5 };
  e.companion.say('Olá! Um balão de teste com algum texto.', 'speech');
  await Promise.resolve();
  await Promise.resolve();
  e.clock.advance(20);
  const b = e.companion.bubbleRect;
  assert.ok(b, 'balão aberto');
  // Cursor vai para cima do balão, longe do JoJo.
  e.env.cursor = { x: b.x + b.width / 2, y: b.y + 5 };
  e.clock.advance(200);
  assert.equal(e.companion.bubble, null, 'balão recolhido');
});

test('balão não é criado em cima do cursor', async () => {
  const e = started();
  const v = visual(e);
  // Cursor logo acima do JoJo, onde o balão nasceria (mas fora da margem do JoJo).
  e.env.cursor = { x: v.x + v.width / 2, y: v.y - 140 };
  e.clock.advance(50);
  e.companion.say('Teste', 'speech');
  await Promise.resolve();
  await Promise.resolve();
  e.clock.advance(50);
  assert.equal(e.companion.bubble, null);
});

test('modo de interação: entra, captura apenas quando pedido, sai com click-through restaurado', () => {
  const e = started();
  e.companion.enterInteraction('hotkey');
  assert.equal(e.overlay.mouseMode, 'interactive');
  assert.equal(e.companion.behavior.state, 'interactIdle');
  assert.equal(e.overlay.focused, true);
  // Cursor sobre o JoJo não provoca fuga no modo de interação.
  const c = center(visual(e));
  e.env.cursor = c;
  e.clock.advance(500);
  assert.equal(e.companion.stats.flees, 0);
  // Sem captura, cliques ainda passam (regiões não interativas).
  assert.equal(e.overlay.clickPassesAt(c), true);
  e.companion.setCapture(true);
  assert.equal(e.overlay.clickPassesAt(c), false);
  e.companion.exitInteraction('escape');
  assert.equal(e.overlay.mouseMode, 'passthrough');
  assert.equal(e.overlay.clickPassesAt(c), true);
  // Desvio volta imediatamente: cursor está sobre o JoJo.
  e.clock.advance(100);
  assert.ok(e.companion.stats.flees >= 1);
});

test('aviso de mudança do modo de interação (para o Esc temporário)', () => {
  const e = started();
  const seen = [];
  e.companion.onInteractionChange = (a) => seen.push(a);
  e.companion.enterInteraction();
  e.companion.exitInteraction('escape');
  e.companion.enterInteraction();
  e.companion.onBlur(); // ignorado: logo após entrar
  e.clock.advance(600);
  e.companion.onBlur();
  assert.deepEqual(seen, [true, false, true, false]);
});

test('pedido de captura fora do modo de interação é recusado', () => {
  const e = started();
  assert.equal(e.companion.setCapture(true), false);
  assert.equal(e.overlay.mouseMode, 'passthrough');
});

test('sem saída por inatividade: o modo de interação fica até ela sair', () => {
  const e = started({ settings: { interactionTimeoutSec: 10 } });
  e.companion.enterInteraction();
  e.clock.advance(60 * 60e3);
  assert.equal(e.companion.interaction, true);
  assert.equal('interactionTimeoutSec' in e.store.get(), false, 'opção eliminada');
  e.companion.exitInteraction('esc');
  assert.equal(e.companion.interaction, false);
});

test('erro ao focar no modo de interação restaura click-through', () => {
  const e = started();
  e.overlay.focus = () => {
    throw new Error('falha simulada');
  };
  e.companion.enterInteraction();
  assert.equal(e.companion.interaction, false);
  assert.equal(e.overlay.mouseMode, 'passthrough');
});

test('watchdog: modo do mouse alterado indevidamente é reparado no próximo tick', () => {
  const e = started();
  e.overlay.mouseMode = 'interactive';
  e.clock.advance(200);
  assert.equal(e.overlay.mouseMode, 'passthrough');
  assert.ok(e.companion.stats.clickThroughRepairs >= 1);
});

test('blur (clique fora) encerra o modo de interação', () => {
  const e = started();
  e.companion.enterInteraction();
  e.clock.advance(600);
  e.companion.onBlur();
  assert.equal(e.companion.interaction, false);
});

test('carinho, comida e brincadeira têm estados e efeitos distintos', () => {
  const e = started();
  e.companion.enterInteraction();
  const seen = {};
  for (const a of ['pet', 'eat', 'play']) {
    e.companion.interact(a);
    seen[a] = { state: e.companion.behavior.state, anim: e.companion.behavior.anim, effect: e.overlay.state.effect };
    e.clock.advance(4000);
  }
  assert.deepEqual(seen.pet, { state: 'petted', anim: 'petted', effect: 'hearts' });
  assert.deepEqual(seen.eat, { state: 'eat', anim: 'eat', effect: 'food' });
  assert.deepEqual(seen.play, { state: 'play', anim: 'play', effect: 'ball' });
  e.clock.advance(3000);
  assert.equal(e.companion.behavior.state, 'interactIdle');
});

test('arrastar e soltar: anima arrastado → pouso e mantém posição válida', () => {
  const e = started();
  e.companion.enterInteraction();
  e.env.cursor = { x: 500, y: 500 };
  e.companion.dragStart({ x: 90, y: 60 });
  assert.equal(e.companion.behavior.state, 'dragged');
  moveCursor(e.env, e.clock, { x: 500, y: 500 }, { x: 5000, y: 700 }, 300);
  e.companion.dragEnd();
  assert.equal(e.companion.behavior.state, 'land');
  assert.ok(rectInside(e.companion.debugState().box, ONE_MONITOR[0].workArea), 'solto fora da tela volta para área válida');
});

test('monitores com DPI diferente e coordenadas negativas; desconexão do monitor', () => {
  const e = started({ displays: TWO_MONITORS_NEG, settings: { position: { x: -800, y: 600, displayId: '2' } } });
  let st = e.companion.debugState();
  assert.equal(String(st.display), '2');
  assert.ok(st.box.x < 0);
  // Monitor da esquerda é desconectado.
  e.env.displays = [TWO_MONITORS_NEG[0]];
  e.companion.onDisplaysChanged();
  e.clock.advance(50);
  st = e.companion.debugState();
  assert.ok(rectInside(st.box, TWO_MONITORS_NEG[0].workArea), 'recuperado para monitor restante');
});

test('mudança de resolução: posição volta para a nova área útil', () => {
  const e = started({ settings: { position: { x: 1700, y: 900, displayId: '1' } } });
  e.env.displays = [{ id: 1, bounds: { x: 0, y: 0, width: 1280, height: 720 }, workArea: { x: 0, y: 0, width: 1280, height: 680 }, scaleFactor: 1.25 }];
  e.companion.onDisplaysChanged();
  assert.ok(rectInside(e.companion.debugState().box, e.env.displays[0].workArea));
});

test('posição salva inválida (fora de qualquer monitor) é corrigida na inicialização', () => {
  const e = started({ settings: { position: { x: 99999, y: -99999, displayId: '9' } } });
  assert.ok(rectInside(e.companion.debugState().box, ONE_MONITOR[0].workArea));
});

test('suspensão e retomada: loop para e retoma sem saltos de tempo', () => {
  const e = started();
  e.companion.onSuspend();
  const ticks = e.companion.stats.ticks;
  e.clock.advance(60000);
  assert.equal(e.companion.stats.ticks, ticks, 'sem ticks durante suspensão');
  e.companion.onResume();
  e.clock.advance(200);
  assert.ok(e.companion.stats.ticks > ticks);
  assert.equal(e.overlay.mouseMode, 'passthrough');
});

test('ocultar/mostrar e pausar', () => {
  const e = started();
  e.companion.setVisible(false);
  assert.equal(e.overlay.visible, false);
  const t = e.companion.stats.ticks;
  e.clock.advance(5000);
  assert.equal(e.companion.stats.ticks, t, 'oculto não processa');
  e.companion.setVisible(true);
  assert.equal(e.overlay.visible, true);
  e.clock.advance(2000);
  e.companion.setPaused(true);
  assert.equal(e.companion.behavior.state, 'paused');
  e.clock.advance(60000);
  assert.equal(e.companion.behavior.state, 'paused');
  // Mesmo pausado, desvia do cursor.
  const c = center(visual(e));
  e.env.cursor = c;
  e.clock.advance(300);
  assert.ok(e.companion.stats.flees >= 1);
});

test('tela cheia: oculta no monitor do JoJo e volta depois', () => {
  const e = started();
  e.companion.setFullscreenDisplays([1]);
  assert.equal(e.overlay.visible, false);
  e.companion.setFullscreenDisplays([]);
  assert.equal(e.overlay.visible, true);
});

test('tela cheia: a antiga opção "pausar" (que deixava o JoJo por cima) virou ocultar', () => {
  const e = started({ settings: { fullscreenBehavior: 'pause' } });
  e.companion.setFullscreenDisplays([1]);
  assert.equal(e.overlay.visible, false);
});

test('comportamento autônomo ao longo de 30 min: varia estados, sem agitação excessiva', () => {
  const e = started({ seed: 5 });
  e.env.cursor = { x: 5, y: 5 };
  const counts = {};
  let last = null;
  e.companion.behavior.on((ev) => {
    if (ev.type === 'enter' && ev.state !== last) {
      counts[ev.state] = (counts[ev.state] || 0) + 1;
      last = ev.state;
    }
  });
  e.clock.advance(30 * 60e3);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  assert.ok(Object.keys(counts).length >= 5, `variedade: ${JSON.stringify(counts)}`);
  assert.ok(total < 30 * 12, `transições demais: ${total}`);
  assert.ok((counts.walk || 0) < total * 0.4, 'não passeia o tempo todo');
  assert.ok(rectInside(e.companion.debugState().box, ONE_MONITOR[0].workArea));
});

test('modo silencioso: sem falas espontâneas', () => {
  const e = makeEnv({ settings: { quietMode: true, speechFrequency: 'often' } });
  let bubbles = 0;
  const orig = e.overlay.render.bind(e.overlay);
  e.overlay.render = (s) => {
    if (s.bubble) bubbles++;
    orig(s);
  };
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(20 * 60e3);
  assert.equal(bubbles, 0);
});

test('falas espontâneas respeitam o intervalo configurado e um balão por vez', async () => {
  const e = makeEnv({ settings: { speechFrequency: 'often' } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  let shown = 0;
  let prev = null;
  const orig = e.overlay.render.bind(e.overlay);
  e.overlay.render = (s) => {
    const t = s.bubble ? s.bubble.text : null;
    if (t && t !== prev) shown++;
    prev = t;
    orig(s);
  };
  for (let i = 0; i < 20 * 60; i++) {
    e.clock.advance(1000);
    await Promise.resolve();
  }
  assert.ok(shown >= 3, `poucas falas: ${shown}`);
  assert.ok(shown <= 30, `falas demais: ${shown}`);
});

test('configurações persistem posição e reabrem no mesmo lugar', () => {
  const e = started();
  e.companion.pos = { x: 300, y: 300 };
  e.companion._savePosition();
  e.store.saveNow();
  const store2 = new SettingsStore(e.dir);
  store2.load();
  assert.deepEqual({ x: store2.get().position.x, y: store2.get().position.y }, { x: 300, y: 300 });
  const raw = JSON.parse(fs.readFileSync(e.store.file, 'utf8'));
  assert.equal(raw.version, SETTINGS_VERSION);
});

test('conversa offline sem credenciais usa respostas programadas e dispara ação', async () => {
  const e = started();
  e.companion.enterInteraction();
  e.companion.setChatOpen(true);
  const r = await chatAdv(e, 'vamos brincar?');
  assert.equal(r.provider.scripted, true);
  assert.equal(r.action, 'play');
  assert.equal(e.companion.behavior.state, 'play');
  assert.ok(e.overlay.state.chat, 'painel de conversa visível');
});

test('despedida toca animação de saída', async () => {
  const e = started();
  const p = e.companion.goodbye();
  assert.equal(e.companion.behavior.state, 'goodbye');
  e.clock.advance(2000);
  await p;
});
