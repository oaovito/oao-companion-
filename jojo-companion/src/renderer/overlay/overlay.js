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
const providerBadge = document.getElementById('providerBadge');
const activitiesEl = document.getElementById('activities');
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
  effects.setEffect(reduced ? null : s.effect, now);
  renderBubble(s);
  renderActivities(s);
  renderToolbar(s);
  renderChat(s, prev);
  if (prev && prev.interaction && !s.interaction) {
    setCaptureLocal(false);
    dragging = false;
  }
  if (s.sounds && prev && s.effect && s.effect !== prev.effect) chirp(s.effect);
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

function renderActivities(s) {
  const a = s.activities;
  if (!a || !a.items.length) {
    activitiesEl.classList.add('hidden');
    activitiesEl.dataset.key = '';
    return;
  }
  activitiesEl.classList.remove('hidden');
  activitiesEl.classList.toggle('interactive', !!s.interaction);
  Object.assign(activitiesEl.style, { left: `${a.rect.x}px`, top: `${a.rect.y}px`, width: `${a.rect.width}px`, height: `${a.rect.height}px` });
  const key = JSON.stringify(a.items);
  if (activitiesEl.dataset.key === key) return;
  activitiesEl.dataset.key = key;
  activitiesEl.textContent = '';
  for (const it of a.items) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `act ${it.status}`;
    row.dataset.id = it.id;
    row.title = it.detail ? `${it.title} — ${it.detail}` : it.title;
    const dot = document.createElement('span');
    dot.className = 'dot';
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = it.title;
    const l = document.createElement('span');
    l.className = 'l';
    l.textContent = it.label;
    row.append(dot, t, l);
    activitiesEl.appendChild(row);
  }
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
  if (s.chat.provider) {
    providerBadge.textContent = s.chat.provider.scripted
      ? (s.chat.provider.webSearch ? 'Respostas programadas + pesquisa na internet · não é IA' : 'Respostas programadas · offline · não é IA')
      : `${s.chat.provider.label}`;
  }
  if (cmdMenuEl && !cmdMenuEl.classList.contains('hidden')) renderCmdMenu();
  if (wasHidden || !prev || !prev.chat) {
    if (!logEl.childElementCount) addMsg('jojo', 'Fala. Minhas respostas são programadas (sem IA). Tenta: "oi", "consegui", "treino", "silêncio", "me assusta" — ou me faz uma pergunta.');
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
  if (s.noseDust) pose.noseDust = 1;
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
  if (!reduced) effects.update(now, s.mode === 'wired' ? { ...sample.flags, sweat: true } : sample.flags, head);
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

  rig.draw(ctx, pose, { origin: { x: box.x, y: box.y }, scale, facing, alpha: s.opacity });

  // Efeitos no espaço da caixa, espelhados conforme o lado.
  ctx.save();
  ctx.globalAlpha = s.opacity;
  ctx.translate(box.x, box.y);
  ctx.scale(scale, scale);
  const fs = facing >= 0 ? 1 : -1;
  ctx.translate(rig.box.width / 2, 0);
  ctx.scale(fs, 1);
  ctx.translate(-rig.box.width / 2, 0);
  ctx.translate(pose.rootX || 0, pose.rootY || 0);
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
  return !!(target && (toolbarEl.contains(target) || chatEl.contains(target) || (!activitiesEl.classList.contains('hidden') && activitiesEl.contains(target))));
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
    // Carinho: esfregar o mouse sobre o JoJo (sem botão pressionado).
    if (!dragging && !e.buttons && overJoJo(e.clientX, e.clientY)) {
      const now = performance.now();
      if (rub.last && now - rub.since < 1400) rub.dist += Math.hypot(e.clientX - rub.last.x, e.clientY - rub.last.y);
      else {
        rub.dist = 0;
        rub.since = now;
      }
      rub.last = { x: e.clientX, y: e.clientY };
      if (rub.dist > 260 && now - lastPet > 2600) {
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
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!down || dragging) return;
    if (Math.hypot(e.screenX - down.x, e.screenY - down.y) > 6) {
      dragging = true;
      api.dragStart();
    }
  });
  const endPointer = (e) => {
    if (!down) return;
    const wasDragging = dragging;
    const quick = performance.now() - down.t < 450;
    down = null;
    dragging = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignora */
    }
    if (wasDragging) api.dragEnd();
    // Clique rápido no pet: traz a Central para frente (carinho continua
    // no botão 🤚 e esfregando o mouse sobre ele).
    else if (quick && e.type === 'pointerup') api.openApp(null);
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

  activitiesEl.addEventListener('click', (e) => {
    const row = e.target.closest('.act');
    if (!row || !state || !state.interaction) return;
    activity();
    api.openApp(row.dataset.id);
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

// ------------------------------------------------------------------ sons (desativados por padrão)

let audio = null;
function chirp(kind) {
  try {
    audio = audio || new AudioContext();
    const notes = { hearts: [660, 880], food: [440, 520, 600], ball: [700, 500, 800] }[kind] || [600];
    let t = audio.currentTime;
    for (const f of notes) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + 0.15);
      t += 0.09;
    }
  } catch {
    /* sem áudio */
  }
}

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
