// Desenho do relógio dos timers (0.47.5). Canvas puro, sem imagens: o mesmo traço de
// recorte de papel do JoJo (contorno azul-escuro grosso, cores chapadas). Nada aqui
// conta tempo: o renderer passa o texto e o progresso já calculados.

import { alvoDoRelogio } from '../../core/timer-anims.js';

const TINTA = '#1b2647';
const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
};

/**
 * Valores do relógio neste instante a partir do estado que veio do processo principal.
 * r = {modo:'desce'|'sobe', baseMs, totalMs, rodando, ancoraWall}: rodando, o tempo sai do relógio
 * de parede (fim previsto ou início), então o estado não precisa ser reenviado a cada segundo.
 */
export function leituraRelogio(r, agoraWall = Date.now()) {
  const ms = !r.rodando ? r.baseMs : r.modo === 'sobe' ? Math.max(0, agoraWall - r.ancoraWall) : Math.max(0, r.ancoraWall - agoraWall);
  const progresso = r.modo === 'sobe' ? (r.totalMs ? Math.min(1, ms / r.totalMs) : (ms % 60e3) / 60e3) : (r.totalMs ? Math.min(1, Math.max(0, 1 - ms / r.totalMs)) : 0);
  return { ms, texto: fmt(ms), progresso };
}

function caminhoArredondado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function preencheContorna(ctx, fill, lw = 2.5) {
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = lw; ctx.strokeStyle = TINTA; ctx.lineJoin = 'round'; ctx.stroke();
}
function texto(ctx, t, x, y, size, cor = TINTA, peso = 800, fonte = 'Segoe UI, system-ui, sans-serif') {
  ctx.font = `${peso} ${size}px ${fonte}`;
  ctx.fillStyle = cor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(t, x, y);
}
function ponteiro(ctx, ang, len, w, cor) {
  ctx.save(); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(-w / 2, 4); ctx.lineTo(0, -len); ctx.lineTo(w / 2, 4); ctx.closePath();
  ctx.fillStyle = cor; ctx.fill(); ctx.restore();
}
function marcas(ctx, r, n = 12) {
  ctx.strokeStyle = TINTA;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, longa = i % 3 === 0;
    ctx.lineWidth = longa ? 2.2 : 1.2;
    ctx.beginPath(); ctx.moveTo(Math.sin(a) * r * (longa ? 0.74 : 0.82), -Math.cos(a) * r * (longa ? 0.74 : 0.82)); ctx.lineTo(Math.sin(a) * r * 0.92, -Math.cos(a) * r * 0.92); ctx.stroke();
  }
}
/** Fatia que falta (vermelha no alerta), estilo timer de cozinha. */
function fatia(ctx, r, prog, cor) {
  const resto = 1 - prog;
  if (resto <= 0.002) return;
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + resto * Math.PI * 2);
  ctx.closePath(); ctx.fillStyle = cor; ctx.fill();
}
function iconePausa(ctx, x, y, s) {
  ctx.fillStyle = TINTA;
  ctx.fillRect(x - s * 0.45, y - s / 2, s * 0.3, s); ctx.fillRect(x + s * 0.15, y - s / 2, s * 0.3, s);
}

/**
 * Desenha o relógio centrado em (x, y). `size` é o tamanho-base (px lógicos).
 * info: {aparencia, texto, progresso, fase, rotulo, alerta 0..1, pausado, mais, sobe}.
 * fx: {rot (graus), sx, sy, alpha, now, brilho 0..1}.
 */
export function desenharRelogio(ctx, info, { x, y, size, rot = 0, sx = 1, sy = 1, alpha = 1, now = 0 } = {}) {
  const S = size;
  const alerta = info.alerta || 0;
  const pulso = alerta ? 0.5 + 0.5 * Math.sin(now / 160) : 0;
  const quente = (base) => (alerta ? misturar(base, '#ff5a5a', 0.35 + 0.35 * pulso) : base);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(sx, sy);
  const prog = Math.max(0, Math.min(1, info.progresso || 0));
  let rotuloY = S * 0.62;
  switch (info.aparencia) {
    case 'esportivo': {
      const r = S * 0.5;
      ctx.beginPath(); ctx.arc(0, -r - 4, 5, 0, Math.PI * 2); preencheContorna(ctx, '#c9ced8', 2);
      caminhoArredondado(ctx, -5, -r - 2, 10, 8, 2); preencheContorna(ctx, '#9aa3b2', 2);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); preencheContorna(ctx, '#d7dce5', 3);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2); preencheContorna(ctx, quente('#ffffff'), 2);
      marcas(ctx, r * 0.84, 12);
      ponteiro(ctx, prog * Math.PI * 2, r * 0.72, 3.5, '#e53935');
      ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.fillStyle = TINTA; ctx.fill();
      texto(ctx, info.texto, 0, r * 0.38, S * 0.17, TINTA, 800, 'Consolas, monospace');
      rotuloY = r + 12;
      break;
    }
    case 'ampulheta': {
      const w = S * 0.36, h = S * 0.52;
      const vidro = 'rgba(214,236,255,0.92)', areia = quente('#f2c14e');
      // Areia de cima (o que falta) e de baixo (o que passou).
      ctx.save();
      ctx.beginPath(); ctx.moveTo(-w, -h); ctx.lineTo(w, -h); ctx.lineTo(3, -2); ctx.lineTo(-3, -2); ctx.closePath(); ctx.fillStyle = vidro; ctx.fill(); ctx.clip();
      const topo = -h + (h - 2) * prog; ctx.fillStyle = areia; ctx.fillRect(-w, topo, 2 * w, h);
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.moveTo(-3, 2); ctx.lineTo(3, 2); ctx.lineTo(w, h); ctx.lineTo(-w, h); ctx.closePath(); ctx.fillStyle = vidro; ctx.fill(); ctx.clip();
      const monte = h * prog; ctx.fillStyle = areia;
      ctx.beginPath(); ctx.moveTo(-w, h); ctx.lineTo(0, h - monte); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (!info.pausado && prog < 1) { ctx.strokeStyle = areia; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, h - h * prog); ctx.stroke(); }
      ctx.lineWidth = 2.5; ctx.strokeStyle = TINTA; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-w, -h); ctx.lineTo(w, -h); ctx.lineTo(3, -2); ctx.lineTo(3, 2); ctx.lineTo(w, h); ctx.lineTo(-w, h); ctx.lineTo(-3, 2); ctx.lineTo(-3, -2); ctx.closePath(); ctx.stroke();
      for (const yy of [-h - 5, h + 5]) { caminhoArredondado(ctx, -w - 6, yy - 4, 2 * w + 12, 8, 3); preencheContorna(ctx, '#8d5a3b', 2.2); }
      rotuloY = h + 20;
      texto(ctx, info.texto, 0, rotuloY - 2, S * 0.15, TINTA, 800, 'Consolas, monospace');
      rotuloY += 12;
      break;
    }
    case 'analogico': {
      const r = S * 0.48;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); preencheContorna(ctx, '#ffffff', 3.2);
      fatia(ctx, r * 0.86, prog, alerta ? '#ff6b6b' : '#ef5350');
      marcas(ctx, r, 12);
      ponteiro(ctx, (1 - prog) * Math.PI * 2, r * 0.8, 3, TINTA);
      ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fillStyle = TINTA; ctx.fill();
      rotuloY = r + 12;
      texto(ctx, info.texto, 0, rotuloY, S * 0.16, TINTA, 800, 'Consolas, monospace');
      rotuloY += 13;
      break;
    }
    case 'barra': {
      const w = S, h = S * 0.36;
      caminhoArredondado(ctx, -w, -h / 2, 2 * w, h, h / 2); preencheContorna(ctx, '#ffffff', 2.6);
      ctx.save(); caminhoArredondado(ctx, -w + 3, -h / 2 + 3, (2 * w - 6) * prog, h - 6, (h - 6) / 2); ctx.fillStyle = quente('#4fc3f7'); ctx.fill(); ctx.restore();
      texto(ctx, info.texto, 0, 1, h * 0.58, TINTA, 900, 'Consolas, monospace');
      rotuloY = h / 2 + 10;
      break;
    }
    case 'holograma': {
      const r = S * 0.5;
      const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
      g.addColorStop(0, 'rgba(120,240,255,0.55)'); g.addColorStop(1, 'rgba(40,160,255,0.08)');
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = alerta ? 'rgba(255,120,120,0.95)' : 'rgba(80,220,255,0.95)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.82, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.lineWidth = 3.5; ctx.stroke();
      ctx.globalAlpha *= 0.35; ctx.strokeStyle = '#bff6ff'; ctx.lineWidth = 1;
      const desl = (now / 60) % 6;
      for (let yy = -r + desl; yy < r; yy += 6) { const half = Math.sqrt(Math.max(0, r * r - yy * yy)); ctx.beginPath(); ctx.moveTo(-half, yy); ctx.lineTo(half, yy); ctx.stroke(); }
      ctx.globalAlpha /= 0.35;
      texto(ctx, info.texto, 0, 0, S * 0.22, alerta ? '#ffe0e0' : '#e9fdff', 800, 'Consolas, monospace');
      rotuloY = r + 11;
      break;
    }
    case 'bolso': {
      const r = S * 0.46;
      ctx.lineWidth = 2.2; ctx.strokeStyle = '#c99a2e';
      ctx.beginPath(); ctx.arc(0, -r - 9, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -r - 1, 4, 0, Math.PI * 2); preencheContorna(ctx, '#e0b84a', 2);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); preencheContorna(ctx, '#e0b84a', 3);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2); preencheContorna(ctx, quente('#fff8e7'), 1.8);
      marcas(ctx, r * 0.84, 12);
      ponteiro(ctx, prog * Math.PI * 2 * 12, r * 0.66, 2.4, TINTA);
      ponteiro(ctx, prog * Math.PI * 2, r * 0.45, 3.4, TINTA);
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fillStyle = '#c99a2e'; ctx.fill();
      rotuloY = r + 12;
      texto(ctx, info.texto, 0, rotuloY, S * 0.15, TINTA, 800, 'Consolas, monospace');
      rotuloY += 13;
      break;
    }
    case 'minimalista':
    case 'circular': {
      const w = S * 0.62, h = S * 0.36;
      ctx.globalAlpha *= 0.9;
      caminhoArredondado(ctx, -w, -h / 2, 2 * w, h, h / 2); preencheContorna(ctx, quente('rgba(255,255,255,0.88)'), 1.6);
      ctx.globalAlpha /= 0.9;
      texto(ctx, info.texto, 0, 1, h * 0.62, TINTA, 800, 'Consolas, monospace');
      rotuloY = h / 2 + 9;
      break;
    }
    default: { // digital
      const w = S * 0.75, h = S * 0.62;
      caminhoArredondado(ctx, -w, -h / 2, 2 * w, h, 8); preencheContorna(ctx, '#263459', 3);
      caminhoArredondado(ctx, -w + 5, -h / 2 + 5, 2 * w - 10, h - 10, 5); ctx.fillStyle = alerta ? misturar('#0e1a10', '#4a0f0f', pulso) : '#0e1a10'; ctx.fill();
      texto(ctx, info.texto, 0, -1, h * 0.46, alerta ? '#ff8a80' : '#7dff9a', 800, 'Consolas, monospace');
      ctx.fillStyle = 'rgba(125,255,154,0.55)'; ctx.fillRect(-w + 8, h / 2 - 9, (2 * w - 16) * prog, 2.5);
      rotuloY = h / 2 + 10;
    }
  }
  if (info.pausado) iconePausa(ctx, S * 0.42, -S * 0.36, S * 0.16);
  const legenda = [info.fase, info.rotulo].filter(Boolean).join(' · ') + (info.mais ? `  +${info.mais}` : '');
  if (legenda) {
    ctx.font = `700 ${Math.max(9, S * 0.13)}px Segoe UI, system-ui, sans-serif`;
    const lw = Math.min(S * 2, ctx.measureText(legenda).width + 10);
    caminhoArredondado(ctx, -lw / 2, rotuloY - 7, lw, 14, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
    texto(ctx, legenda, 0, rotuloY, Math.max(9, S * 0.13), TINTA, 700);
  }
  ctx.restore();
}

/** Contagem circular ao redor do JoJo (aparência "circular"): anel fino com o que falta. */
export function desenharAnel(ctx, { cx, cy, r, progresso, alerta = 0, alpha = 1, now = 0 }) {
  ctx.save();
  ctx.globalAlpha *= alpha * 0.85;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(27,38,71,0.25)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  const pulso = alerta ? 0.5 + 0.5 * Math.sin(now / 160) : 0;
  ctx.strokeStyle = alerta ? misturar('#4fc3f7', '#ff5a5a', 0.5 + 0.4 * pulso) : '#4fc3f7';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (1 - progresso) * Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function misturar(a, b, k) {
  const pa = cor(a), pb = cor(b);
  if (!pa || !pb) return a;
  const m = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `rgba(${m[0]},${m[1]},${m[2]},${(pa[3] + (pb[3] - pa[3]) * k).toFixed(2)})`;
}
function cor(s) {
  if (s.startsWith('#')) { const n = parseInt(s.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
  const m = /rgba?\(([^)]+)\)/.exec(s);
  if (!m) return null;
  const p = m[1].split(',').map(Number);
  return [p[0], p[1], p[2], p[3] ?? 1];
}

/**
 * Onde o relógio fica neste quadro. Parado: o centro do lugar dele (rect). Nas animações
 * de timer, os canais tm* levam o relógio até a mão/os pés do JoJo (coordenadas do rig).
 * Devolve {x, y, mix, k, rot, sx, sy, frente, ampulheta, some}. Tamanho na mão: TAMANHO_NA_MAO × escala do JoJo.
 */
export const TAMANHO_NA_MAO = 46;

/** Tamanho do relógio neste quadro: do tamanho escolhido (parado) ao tamanho de mão (segurado). */
export function tamanhoNoQuadro(base, p, scale) { return (base + (TAMANHO_NA_MAO * scale - base) * p.mix) * p.k; }

export function posicaoRelogio({ rect, box, scale, facing, pose, rig, now = 0 }) {
  const c0 = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 - 7 };
  const mix = Math.max(0, Math.min(1, pose.tmMix || 0));
  const fs = facing >= 0 ? 1 : -1;
  const W = rig?.box?.width || 180;
  const [lx, ly] = alvoDoRelogio(pose);
  const alvo = { x: box.x + (fs > 0 ? lx : W - lx) * scale, y: box.y + ly * scale };
  const treme = pose.tmTreme ? pose.tmTreme * scale * Math.sin(now / 23) : 0;
  return {
    x: c0.x + (alvo.x - c0.x) * mix + ((pose.tmDx || 0) * fs) * scale + treme,
    y: c0.y + (alvo.y - c0.y) * mix + (pose.tmDy || 0) * scale + (pose.tmTreme ? pose.tmTreme * 0.4 * scale * Math.cos(now / 29) : 0),
    mix, k: 1 + (pose.tmK || 0),
    rot: (pose.tmRot || 0) * fs,
    sx: 1 + (pose.tmSx || 0), sy: 1 + (pose.tmSy || 0),
    frente: (pose.tmFrente || 0) > 0.5 || mix < 0.5,
    ampulheta: (pose.tmAmp || 0) > 0.5,
    some: Math.max(0, Math.min(1, pose.tmSome || 0)),
  };
}
