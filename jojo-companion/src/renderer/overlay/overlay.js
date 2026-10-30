// Renderer do overlay: desenha o JoJo, balões, barra de interação e conversa.
// Toda decisão de comportamento/posição vem do processo principal; aqui só
// animamos e encaminhamos interações explícitas do usuário.
import { Animator } from '../shared/animator.js';
import { RigRenderer } from '../shared/rig-renderer.js';
import { Effects } from '../shared/effects.js';

const api = window.jojo;
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const bubbleEl = document.getElementById('bubble');
const measureEl = document.getElementById('measure');
const tailsEl = document.getElementById('tails');
const toolbarEl = document.getElementById('toolbar');
const chatEl = document.getElementById('chat');
const logEl = document.getElementById('log');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const cmdMenuEl = document.getElementById('cmdMenu');

let state = null;
let animator = null;
let rig = null;
let effects = new Effects();
let facing = 1;
let facingTarget = 1;
let turnStart = -1;
let mouseMode = { mode: 'passthrough', capture: false };
let frameTimer = null;
let rafPending = false;
let lastFrame = 0;
let dpr = window.devicePixelRatio || 1;
let lastAnimFlags = {};
let landBurstDone = false;
let puffDone = false;
let windowVisible = true;
let reduced = false; // movimento reduzido (quadros estáticos)
let cmdSel = 0;

// ------------------------------------------------------------------ setup

async function init() {
  const assets = await api.getAssets();
  rig = new RigRenderer(assets.rig);
  effects = new Effects({ ground: rig.ground, center: rig.box.width / 2 });
  animator = new Animator(assets.animations);
  resize();
  api.onState(onState);
  api.onMeasure(onMeasure);
  api.onVisible((v) => {
    windowVisible = v;
    if (v) requestFrame();
    else clearTimeout(frameTimer);
  });
  api.onMouseMode((m) => {
    mouseMode = m;
  });
  window.addEventListener('resize', () => {
    resize();
    requestFrame();
  });
  matchMedia(`(resolution: ${dpr}dppx)`).addEventListener?.('change', () => {
    dpr = window.devicePixelRatio || 1;
    resize();
  });
  setupInteraction();
  // Movimento reduzido do sistema (Windows: "Efeitos de animação" desligado).
  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  api.setReducedMotion(rm.matches);
  rm.addEventListener?.('change', () => api.setReducedMotion(rm.matches));
  requestFrame();
}

function resize() {
  dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
}

// ------------------------------------------------------------------ estado vindo do main

function onState(s) {
  const prev = state;
  state = s;
  const now = performance.now();
  const modeChanged = prev && (prev.mode || null) !== (s.mode || null);
  if (animator && (!prev || prev.anim !== s.anim || modeChanged)) {
    // Modo "ligadão": sorteia as variações com olhos arregalados, tremedeira etc.
    animator.play(s.anim, now, { mode: s.mode || null, restart: modeChanged });
    landBurstDone = false;
    puffDone = false;
  }
  if (s.facing !== facingTarget) {
    facingTarget = s.facing;
    turnStart = now;
  }
  if (!!s.reducedMotion !== reduced) {
    reduced = !!s.reducedMotion;
    document.body.classList.toggle('reduced', reduced);
  }
  effects.setEffect(reduced ? null : s.effect, now, s.effectKind || null);
  renderBubble(s);
  renderBubbleGame(s);
  renderToolbar(s);
  renderChat(s, prev);
  if (prev && prev.interaction && !s.interaction) {
    setCaptureLocal(false);
    dragging = false;
  }
  requestFrame();
}

function onMeasure(req) {
  measureEl.className = `bubble ${req.kind || 'speech'}`;
  applyBubbleScale(measureEl, req.scale || 1);
  measureEl.textContent = req.text;
  const r = measureEl.getBoundingClientRect();
  api.reportMeasure(req.id, { width: Math.ceil(r.width) + 4, height: Math.ceil(r.height) + 4 });
}

function applyBubbleScale(el, scale) {
  el.style.fontSize = `${15 * scale}px`;
  el.style.maxWidth = `${260 * scale}px`;
  el.style.padding = `${8 * scale}px ${13 * scale}px ${9 * scale}px`;
}

function renderBubble(s) {
  const b = s.bubble;
  if (!b) {
    bubbleEl.classList.add('hidden');
    bubbleEl.dataset.text = '';
    tailsEl.innerHTML = '';
    return;
  }
  const changed = bubbleEl.dataset.text !== b.text || bubbleEl.classList.contains('hidden');
  bubbleEl.className = `bubble ${b.kind}`;
  applyBubbleScale(bubbleEl, b.scale || 1);
  bubbleEl.style.left = `${b.rect.x}px`;
  bubbleEl.style.top = `${b.rect.y}px`;
  bubbleEl.style.width = `${b.rect.width - 4}px`;
  bubbleEl.style.height = `${b.rect.height - 4}px`;
  if (changed) {
    bubbleEl.textContent = b.text;
    bubbleEl.dataset.text = b.text;
    // Reinicia a animação de "pop".
    bubbleEl.style.animation = 'none';
    void bubbleEl.offsetWidth;
    bubbleEl.style.animation = '';
  }
  drawTail(b);
}

function drawTail(b) {
  const ink = '#1b2647';
  const fill = b.kind === 'thought' ? '#f5f7ff' : b.kind === 'sleep' ? '#eaf2ff' : '#fffef8';
  const { tail, target, side } = b;
  // Base da cauda levemente para dentro do balão, cobrindo a borda.
  const inward = { top: { x: 0, y: -3 }, bottom: { x: 0, y: 3 }, left: { x: -3, y: 0 }, right: { x: 3, y: 0 } }[side] || { x: 0, y: 0 };
  const dx = target.x - tail.x;
  const dy = target.y - tail.y;
  const len = Math.hypot(dx, dy) || 1;
  const reach = Math.min(18, len * 0.85);
  const tip = { x: tail.x + (dx / len) * reach, y: tail.y + (dy / len) * reach };
  if (b.kind === 'speech') {
    const along = side === 'top' || side === 'bottom' ? { x: 1, y: 0 } : { x: 0, y: 1 };
    const w = 8;
    const a = { x: tail.x + inward.x - along.x * w, y: tail.y + inward.y - along.y * w };
    const c = { x: tail.x + inward.x + along.x * w, y: tail.y + inward.y + along.y * w };
    tailsEl.innerHTML =
      `<path d="M${a.x},${a.y} L${tip.x},${tip.y} L${c.x},${c.y} Z" fill="${fill}" stroke="none"/>` +
      `<path d="M${a.x},${a.y} L${tip.x},${tip.y} L${c.x},${c.y}" fill="none" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>`;
  } else {
    // Pensamento / sono: bolinhas decrescentes em direção à cabeça.
    const p1 = { x: tail.x + (dx / len) * 6, y: tail.y + (dy / len) * 6 };
    const p2 = { x: tail.x + (dx / len) * Math.min(16, len * 0.8), y: tail.y + (dy / len) * Math.min(16, len * 0.8) };
    const dash = b.kind === 'sleep' ? ' stroke-dasharray="3 2"' : '';
    tailsEl.innerHTML =
      `<circle cx="${p1.x}" cy="${p1.y}" r="4.5" fill="${fill}" stroke="${ink}" stroke-width="2"${dash}/>` +
      `<circle cx="${p2.x}" cy="${p2.y}" r="2.6" fill="${fill}" stroke="${ink}" stroke-width="1.8"/>`;
  }
}

// Mini-jogo/estímulo de bolhas: bolhas clicáveis em volta do JoJo (modo de interação).
function renderBubbleGame(s) {
  const on = !!(s.minigame && s.minigame.tipo === 'bolhas' && s.interaction);
  if (!on) {
    if (bubbleGame.el) bubbleGame.el.remove();
    bubbleGame.el = null;
    clearInterval(bubbleGame.timer);
    bubbleGame.timer = null;
    return;
  }
  if (bubbleGame.el) return;
  const box = document.createElement('div');
  box.id = 'bubbleGame';
  document.body.appendChild(box);
  bubbleGame.el = box;
  const spawn = () => {
    if (!state || !state.jojo || box.childElementCount > 9) return;
    const b = document.createElement('button');
    b.className = 'game-bubble';
    const size = 26 + Math.random() * 22;
    const W = window.innerWidth;
    const H = window.innerHeight;
    let x;
    let y;
    for (let i = 0; i < 8; i++) {
      x = Math.random() * (W - size);
      y = Math.random() * (H - size - 10);
      const v = state.visual;
      if (!(x + size > v.x && x < v.x + v.width && y + size > v.y && y < v.y + v.height)) break;
    }
    Object.assign(b.style, { left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px` });
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (b.classList.contains('pop')) return;
      b.classList.add('pop');
      api.gesture('bolha');
      setTimeout(() => b.remove(), 220);
    });
    setTimeout(() => b.remove(), 3800);
    box.appendChild(b);
  };
  spawn();
  bubbleGame.timer = setInterval(spawn, reduced ? 1200 : 650);
}

function renderToolbar(s) {
  if (!s.toolbar) {
    toolbarEl.classList.add('hidden');
    return;
  }
  toolbarEl.classList.remove('hidden');
  const r = s.toolbar.rect;
  Object.assign(toolbarEl.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` });
}

function renderChat(s, prev) {
  if (!s.chat) {
    chatEl.classList.add('hidden');
    return;
  }
  const wasHidden = chatEl.classList.contains('hidden');
  chatEl.classList.remove('hidden');
  const r = s.chat.rect;
  Object.assign(chatEl.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` });
  const title = chatEl.querySelector('header strong');
  if (title && s.chat.name) title.textContent = `Conversa com o ${s.chat.name}`;
  if (cmdMenuEl && !cmdMenuEl.classList.contains('hidden')) renderCmdMenu();
  if (wasHidden || !prev || !prev.chat) {
    if (!logEl.childElementCount) addMsg('jojo', 'Fala. Rápido.');
    setTimeout(() => chatInput.focus(), 30);
  }
}

// Menu de comandos "/" (Wake Pet / Tuck Away Pet etc.).
function matchingCommands() {
  const cmds = (state && state.chat && state.chat.commands) || [];
  const typed = chatInput.value.trim().toLowerCase();
  if (!typed.startsWith('/') || typed.includes(' ')) return [];
  return cmds.filter((c) => c.cmd.startsWith(typed));
}

function renderCmdMenu() {
  const list = matchingCommands();
  if (!list.length) {
    cmdMenuEl.classList.add('hidden');
    return;
  }
  cmdSel = Math.min(cmdSel, list.length - 1);
  cmdMenuEl.textContent = '';
  list.forEach((c, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.dataset.cmd = c.cmd;
    if (i === cmdSel) li.className = 'sel';
    const b = document.createElement('b');
    b.textContent = c.label;
    const sp = document.createElement('span');
    sp.textContent = `${c.cmd} · ${c.hint}`;
    li.append(b, sp);
    cmdMenuEl.appendChild(li);
  });
  cmdMenuEl.classList.remove('hidden');
}

async function sendChat(text) {
  addMsg('user', text);
  activity();
  try {
    const r = await api.chat(text);
    if (r) addMsg('jojo', r.text);
  } catch {
    addMsg('jojo', 'Glub? Algo deu errado aqui.');
  }
}

function addMsg(who, text) {
  const d = document.createElement('div');
  d.className = `msg ${who}`;
  d.textContent = text;
  logEl.appendChild(d);
  while (logEl.childElementCount > 40) logEl.firstElementChild.remove();
  logEl.scrollTop = logEl.scrollHeight;
}

// ------------------------------------------------------------------ desenho

function requestFrame() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(frame);
}

function targetFps() {
  if (!state) return 10;
  if (!windowVisible) return 0;
  // Movimento reduzido: desenha só quando o estado muda.
  if (reduced) return 0;
  if (state.opacity === 0 || state.anim === 'hidden') return 0;
  if (state.moving || dragging || ['run', 'dragged', 'land', 'appear', 'goodbye', 'play', 'happy', 'surprised'].includes(state.anim)) return 60;
  if (state.paused) return 8;
  if (state.anim === 'sleep') return 15;
  // Modo Trabalho: meditação lenta, poucos quadros (leve e discreto).
  if (state.work) return state.moving ? 30 : 8;
  if (turnStart >= 0 || effects.busy || state.effect || state.talking || state.interaction) return 30;
  return 24;
}

function frame(now) {
  rafPending = false;
  if (!animator || !state) return;
  lastFrame = now;
  draw(now);
  // Animação escalonada: não adianta desenhar mais vezes que os degraus.
  const cap = animator.style.stepFps || 60;
  const fps = Math.min(targetFps(), cap);
  clearTimeout(frameTimer);
  if (fps > 0) {
    const interval = 1000 / fps;
    if (fps >= 55) requestFrame();
    else frameTimer = setTimeout(requestFrame, Math.max(0, interval - 4));
  }
}

function draw(now) {
  const s = state;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Virar: transição contínua do lado (animação de virada com leve achatamento).
  let squashTurn = 1;
  const turnMs = animator.style.turnMs ?? 240;
  if (turnStart >= 0 && (turnMs === 0 || reduced)) {
    // Estilo recorte de papel: virada instantânea.
    facing = facingTarget;
    turnStart = -1;
  } else if (turnStart >= 0) {
    const k = Math.min(1, (now - turnStart) / turnMs);
    facing = -facingTarget + (2 * facingTarget) * easeInOut(k);
    squashTurn = 1 + Math.sin(k * Math.PI) * 0.06;
    if (k >= 1) {
      facing = facingTarget;
      turnStart = -1;
    }
  } else facing = facingTarget;

  const sample = reduced ? animator.sampleStatic() : animator.sample(now);
  const pose = { ...sample.pose };
  pose.squashY *= squashTurn;
  // Falar por cima de outras animações (boca mexendo) quando há fala ativa.
  if (s.talking && reduced && sample.name !== 'sleep' && !pose.happyEyes) {
    pose.jaw = Math.max(pose.jaw, 0.35);
  } else if (s.talking && sample.name !== 'talk' && sample.name !== 'sleep' && !pose.happyEyes) {
    pose.jaw = Math.max(pose.jaw, 0.15 + 0.45 * Math.abs(Math.sin(now / 95)));
  }
  // Olhar para o usuário no modo de interação.
  if (s.interaction && sample.name === 'interactIdle' && !reduced) {
    pose.pupilX = 0.3 * Math.sin(now / 1500);
  }
  // Ligadão: aparência mantida mesmo nas animações sem variação própria.
  if (s.mode === 'wired') {
    pose.moodWired = Math.max(pose.moodWired || 0, 0.5);
    pose.eyeScale = Math.max(pose.eyeScale || 1, 1.2);
  }
  // Micromovimentos constantes (guelras, bolhas de vez em quando), discretos e sem flashes.
  if (!reduced && s.micro !== 'desligado') {
    const k = s.micro === 'discreto' ? 0.45 : 1;
    pose.gills = Math.max(pose.gills || 0, k * (0.5 + 0.5 * Math.sin(now / 700)));
    pose.finRot = (pose.finRot || 0) + k * 2 * Math.sin(now / 410) * Math.max(0, Math.sin(now / 3700));
    // Contração de músculo de vez em quando (pulso curto e suave).
    const pulse = (now % 23000) / 23000;
    if (pulse < 0.012) pose.squashX = (pose.squashX || 1) * (1 + 0.025 * k * Math.sin((pulse / 0.012) * Math.PI));
    if (now >= nextMicroShine) {
      nextMicroShine = now + (26000 + Math.random() * 40000) / k;
      if (Math.random() < 0.5) effects._spawnFx('brilhoDente', now, rig.rig.metrics.head);
      else effects._spawn('sparkle', now, 0, rig.rig.metrics.head); // escamas brilhando
    }
    if (now >= nextMicroBubble) {
      nextMicroBubble = now + (18000 + Math.random() * 30000) / k;
      if (/^(idle|interactIdle|sit|lie)/.test(sample.name)) effects._spawnFx('bolhas', now, rig.rig.metrics.head);
    }
  }
  if (s.layer) Object.assign(pose, s.layer);
  // Olhos que exploram: seguem o cursor de leve quando está perto (repouso).
  if (s.gaze && !reduced && /^(idle|interactIdle|sit|lie|cat_)/.test(sample.name) && !pose.heartEyes && !pose.eyeX) {
    pose.pupilX = (pose.pupilX || 0) * 0.4 + s.gaze.x * 0.6;
    pose.pupilY = (pose.pupilY || 0) * 0.4 + s.gaze.y * 0.6;
  }
  if (s.noseDust) pose.noseDust = 1;
  if (s.costume) pose[`costume_${s.costume}`] = 1;
  // Guarda-roupa: peças escolhidas por ela (canais costume_*, prop_*, sexy).
  if (s.outfit) Object.assign(pose, s.outfit);
  if (s.sexy) pose.sexy = 1;
  if (sample.name === 'snort' && sample.t > 0.55 && !puffDone && !reduced) {
    effects.burst('powderPuff', now, 6);
    puffDone = true;
  }
  if (sample.name === 'land' && !landBurstDone && !reduced) {
    effects.burst('dustBurst', now, 6);
    landBurstDone = true;
  }

  const box = s.jojo;
  const scale = s.scale || 1;
  const head = rig.rig.metrics.head;
  const festive = ['carnaval', 'anoNovo', 'diya', 'fanous', 'lanternaChinesa', 'tinta'].includes(s.costume);
  if (!reduced) effects.update(now, s.mode === 'wired' || festive ? { ...sample.flags, sweat: sample.flags.sweat || s.mode === 'wired', sparkle: sample.flags.sparkle || festive } : sample.flags, head);
  lastAnimFlags = sample.flags;

  // Indicação discreta do modo de interação: anel tracejado sob o JoJo.
  if (s.interaction) {
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = 'rgba(63, 127, 212, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = reduced ? 0 : -now / 40;
    ctx.beginPath();
    ctx.ellipse(rig.box.width / 2, rig.ground, rig.shadowRx + 16, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Efeitos no espaço da caixa, espelhados conforme o lado (fundo antes do JoJo, o resto depois).
  const fs = facing >= 0 ? 1 : -1;
  const fxSpace = () => {
    ctx.save();
    ctx.globalAlpha = s.opacity;
    ctx.translate(box.x, box.y);
    ctx.scale(scale, scale);
    ctx.translate(rig.box.width / 2, 0);
    ctx.scale(fs, 1);
    ctx.translate(-rig.box.width / 2, 0);
    ctx.translate(pose.rootX || 0, pose.rootY || 0);
  };
  if (!reduced) {
    fxSpace();
    effects.drawBack(ctx, now, { head, facingSign: fs });
    ctx.restore();
  }

  rig.draw(ctx, pose, { origin: { x: box.x, y: box.y }, scale, facing, alpha: s.opacity });

  fxSpace();
  const mark = sample.flags.mark && (reduced || (sample.t > 0.08 && sample.t < 0.92)) ? sample.flags.mark : null;
  if (reduced) effects.particles.length = 0;
  effects.draw(ctx, now, { mark, head, mouth: rig.rig.metrics.mouth, facingSign: fs });
  ctx.restore();
}

function easeInOut(t) {
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

// ------------------------------------------------------------------ interação

let captureLocal = false;
let dragging = false;
let down = null;
let rub = { dist: 0, since: 0, last: null };
let lastPet = 0;
let lastActivity = 0;
let lastTickle = 0;
let nextMicroBubble = 0;
let nextMicroShine = 0;
let lastRipple = 0;
const bubbleGame = { el: null, until: 0, timer: null };
let lastClickAt = 0;
let holdTimer = null;
let dragVel = { x: 0, y: 0, t: 0, sx: 0, sy: 0 };

function setCaptureLocal(on) {
  if (on === captureLocal) return;
  captureLocal = on;
  api.setCapture(on);
}

function overJoJo(x, y) {
  if (!state || !state.visual) return false;
  const v = state.visual;
  return x >= v.x && x <= v.x + v.width && y >= v.y && y <= v.y + v.height;
}

function overUi(target) {
  return !!(target && (toolbarEl.contains(target) || chatEl.contains(target) || (bubbleGame.el && bubbleGame.el.contains(target))));
}

function activity() {
  const now = performance.now();
  if (now - lastActivity > 400) {
    lastActivity = now;
    api.activity();
  }
}

function setupInteraction() {
  // Com click-through + forward, o Windows envia apenas "mousemove" para
  // decidirmos se o ponteiro está sobre uma região interativa.
  window.addEventListener('mousemove', (e) => {
    if (!state || !state.interaction) return;
    const interactive = dragging || overJoJo(e.clientX, e.clientY) || overUi(e.target);
    setCaptureLocal(interactive);
    if (interactive) activity();
    // Ondinhas na água onde o cursor passa (estímulo calmo; não com movimento reduzido).
    const tnow = performance.now();
    if (!reduced && state.micro !== 'desligado' && tnow - lastRipple > 140 && state.jojo) {
      lastRipple = tnow;
      const sc = state.scale || 1;
      let bx = (e.clientX - state.jojo.x) / sc;
      if (facing < 0) bx = rig.box.width - bx;
      effects.ripple(tnow, bx, (e.clientY - state.jojo.y) / sc);
      requestFrame();
    }
    // Carinho: esfregar o mouse sobre o JoJo (sem botão pressionado).
    if (!dragging && !e.buttons && overJoJo(e.clientX, e.clientY)) {
      const now = performance.now();
      if (rub.last && now - rub.since < 1400) rub.dist += Math.hypot(e.clientX - rub.last.x, e.clientY - rub.last.y);
      else {
        rub.dist = 0;
        rub.since = now;
      }
      rub.last = { x: e.clientX, y: e.clientY };
      // Esfregar rápido demais vira cócegas.
      if (rub.dist > 650 && now - rub.since < 1100 && now - lastTickle > 3000) {
        lastTickle = now;
        lastPet = now;
        rub.dist = 0;
        api.gesture('cocegas');
      } else if (rub.dist > 260 && now - lastPet > 2600 && now - rub.since >= 1100) {
        lastPet = now;
        rub.dist = 0;
        api.interact('pet');
      }
    }
  });
  document.addEventListener('mouseleave', () => {
    if (!dragging) setCaptureLocal(false);
  });

  canvas.addEventListener('pointerdown', (e) => {
    if (!state || !state.interaction || e.button !== 0 || !overJoJo(e.clientX, e.clientY)) return;
    down = { x: e.screenX, y: e.screenY, t: performance.now(), id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
    activity();
    // Segurar sem arrastar.
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      if (down && !dragging) {
        down.held = true;
        api.gesture('segurar');
      }
    }, 750);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) {
      // Velocidade do arrasto (para "jogar" o JoJo).
      const t = performance.now();
      const dt = Math.max(1, t - dragVel.t);
      dragVel = { x: (e.screenX - dragVel.sx) / dt, y: (e.screenY - dragVel.sy) / dt, t, sx: e.screenX, sy: e.screenY };
    }
    if (!down || dragging) return;
    if (Math.hypot(e.screenX - down.x, e.screenY - down.y) > 6) {
      dragging = true;
      dragVel = { x: 0, y: 0, t: performance.now(), sx: e.screenX, sy: e.screenY };
      api.dragStart();
    }
  });
  const endPointer = (e) => {
    if (!down) return;
    const wasDragging = dragging;
    const quick = performance.now() - down.t < 450;
    const held = down.held;
    clearTimeout(holdTimer);
    down = null;
    dragging = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignora */
    }
    if (wasDragging) {
      const thrown = Math.hypot(dragVel.x, dragVel.y) > 1.6 && performance.now() - dragVel.t < 120;
      api.dragEnd();
      if (thrown) api.gesture('jogar');
    }
    // Clique rápido no pet: traz a Central para frente (carinho continua
    // no botão 🤚 e esfregando o mouse sobre ele) e ele reage; dois cliques: gira.
    else if (quick && !held && e.type === 'pointerup') {
      const now = performance.now();
      if (now - lastClickAt < 380) {
        lastClickAt = 0;
        api.gesture('duploClique');
      } else {
        lastClickAt = now;
        api.openApp(null);
        api.gesture('clique');
      }
    }
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('lostpointercapture', (e) => {
    if (dragging) endPointer(e);
  });

  toolbarEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    activity();
    const a = btn.dataset.action;
    if (a === 'exit') api.exitInteraction();
    else if (a === 'chat') api.setChatOpen(!(state && state.chat));
    else api.interact(a);
  });

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let text = chatInput.value.trim();
    if (!text) return;
    const list = matchingCommands();
    if (list.length && !list.some((c) => c.cmd === text.toLowerCase())) text = list[cmdSel].cmd;
    chatInput.value = '';
    cmdMenuEl.classList.add('hidden');
    sendChat(text);
  });
  chatInput.addEventListener('input', () => {
    activity();
    cmdSel = 0;
    renderCmdMenu();
  });
  chatInput.addEventListener('keydown', (e) => {
    if (cmdMenuEl.classList.contains('hidden')) return;
    const n = matchingCommands().length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      cmdSel = (cmdSel + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
      renderCmdMenu();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      chatInput.value = matchingCommands()[cmdSel].cmd;
      renderCmdMenu();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cmdMenuEl.classList.add('hidden');
    }
  });
  cmdMenuEl.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    e.preventDefault();
    chatInput.value = '';
    cmdMenuEl.classList.add('hidden');
    sendChat(li.dataset.cmd);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state && state.interaction) {
      e.preventDefault();
      api.exitInteraction();
    } else activity();
  });
}

// Silêncio absoluto: o JoJo não emite nenhum som (sem áudio no app).

// Exposto apenas para testes automatizados de renderização.
window.__jojoRenderer = {
  get state() {
    return state;
  },
  get anim() {
    return animator && animator.current ? animator.current.name : null;
  },
  get flags() {
    return lastAnimFlags;
  },
  get lastFrame() {
    return lastFrame;
  },
  get capture() {
    return captureLocal;
  },
  get mouseMode() {
    return mouseMode;
  },
  get mode() {
    return animator ? animator.mode : null;
  },
  get variant() {
    return animator && animator.current ? animator.current.variant : null;
  },
  get reduced() {
    return reduced;
  },
};

init();
