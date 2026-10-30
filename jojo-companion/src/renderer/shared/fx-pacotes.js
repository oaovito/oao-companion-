// Efeitos visuais dos pacotes de reação (memes, anime, comida, namorado, João).
// Todos silenciosos, desenhados no espaço da caixa do JoJo (180x150, chão em
// y≈147), por trás/em volta dele, sem mudar o corpo. Nada pisca rápido: pulsos
// lentos (≥ 0,6 s). Texto sempre legível mesmo com o JoJo espelhado.
// Efeito com texto: "painel:TEXTO", "barra:TEXTO", "carimbo:TEXTO",
// "legenda:TEXTO", "contador:TEXTO".

const OUTLINE = '#1b2647';

// Efeitos de fundo: desenhados ANTES do JoJo (não cobrem o corpo dele).
export const FX_FUNDO = new Set(['escuro', 'vazio', 'alarme', 'alarmeDourado', 'raios', 'raiosDourados', 'luzDourada', 'holofote', 'auraPrata', 'auraRoxa', 'auraNegra', 'auraDourada', 'sombras', 'gigantes', 'trono', 'portais', 'falha']);
export const fxNome = (f) => String(f).split(':')[0];
const pulse = (now, ms = 900) => 0.5 + 0.5 * Math.sin((now / ms) * Math.PI * 2);

function texto(ctx, str, x, y, { size = 12, color = '#fff', bg = null, border = null, fs = 1, bold = true, pad = 5 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(fs, 1);
  ctx.font = `${bold ? '700 ' : ''}${size}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(str).width;
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(-w / 2 - pad, -size / 2 - pad, w + pad * 2, size + pad * 2);
  }
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 - pad, -size / 2 - pad, w + pad * 2, size + pad * 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, 0, 1);
  ctx.restore();
}

function raios(ctx, cx, cy, color, now, n = 12, r0 = 30, r1 = 140) {
  ctx.save();
  ctx.globalAlpha *= 0.22 + 0.1 * pulse(now, 1400);
  ctx.fillStyle = color;
  const rot = now / 4000;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a - 0.08) * r0, cy + Math.sin(a - 0.08) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a + 0.08) * r0, cy + Math.sin(a + 0.08) * r0);
    ctx.fill();
  }
  ctx.restore();
}

function aura(ctx, cx, g, color, now, alpha = 0.3, w = 12) {
  const k = pulse(now, 1200);
  ctx.save();
  ctx.globalAlpha *= alpha + 0.12 * k;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.ellipse(cx, g - 80, 96 + 5 * k, 100 + 5 * k, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function silhueta(ctx, x, y, s, color, alpha) {
  // Tubarão de perfil, só contorno cheio (sombra/escolta/titã).
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.quadraticCurveTo(-10, -22, 30, -6);
  ctx.lineTo(44, -2);
  ctx.lineTo(30, 4);
  ctx.quadraticCurveTo(-10, 18, -40, 0);
  ctx.moveTo(-6, -14);
  ctx.lineTo(4, -34);
  ctx.lineTo(12, -11);
  ctx.moveTo(-38, 0);
  ctx.lineTo(-54, -14);
  ctx.lineTo(-50, 0);
  ctx.lineTo(-54, 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function coracao(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-14, -4, -8, -16, 0, -8);
  ctx.bezierCurveTo(8, -16, 14, -4, 0, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Desenha um efeito de pacote; devolve false se o nome não é deste módulo. */
export function drawPackFx(ctx, f, now, { cx, g, head, facingSign = 1, rng = Math.random }) {
  const [nome, arg = ''] = String(f).split(/:(.*)/s);
  const hx = head.x;
  const hy = head.y;
  switch (nome) {
    case 'escuro': // cena escurece em volta (vinheta)
      ctx.save();
      ctx.globalAlpha *= 0.35;
      ctx.fillStyle = '#05060c';
      ctx.beginPath();
      ctx.ellipse(cx, g - 70, 150, 120, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    case 'vazio': // vazio estrelado
      ctx.save();
      ctx.globalAlpha *= 0.55;
      ctx.fillStyle = '#0b0f2a';
      ctx.beginPath();
      ctx.ellipse(cx, g - 75, 150, 120, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 26; i++) {
        const a = i * 2.39;
        const r = 20 + ((i * 37) % 120);
        ctx.globalAlpha = 0.4 + 0.4 * pulse(now + i * 200, 1800);
        ctx.fillRect(cx + Math.cos(a) * r, g - 75 + Math.sin(a) * r * 0.7, 2, 2);
      }
      ctx.restore();
      return true;
    case 'alarme': // luz vermelha girando devagar (sem piscar rápido)
      raios(ctx, cx, g - 80, '#e53935', now, 6, 20, 150);
      ctx.save();
      ctx.globalAlpha *= 0.12 + 0.12 * pulse(now, 1000);
      ctx.fillStyle = '#e53935';
      ctx.fillRect(cx - 150, g - 200, 300, 210);
      ctx.restore();
      return true;
    case 'alarmeDourado':
      raios(ctx, cx, g - 80, '#f2c94c', now, 8, 20, 150);
      return true;
    case 'raios':
    case 'raiosDourados':
      raios(ctx, cx, g - 80, '#f2c94c', now);
      return true;
    case 'luzDourada':
      ctx.save();
      ctx.globalAlpha *= 0.25 + 0.1 * pulse(now, 1600);
      ctx.fillStyle = '#ffe28a';
      ctx.beginPath();
      ctx.moveTo(cx - 20, -60);
      ctx.lineTo(cx + 20, -60);
      ctx.lineTo(cx + 90, g);
      ctx.lineTo(cx - 90, g);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return true;
    case 'holofote':
      ctx.save();
      ctx.globalAlpha *= 0.28;
      ctx.fillStyle = '#fff6c8';
      ctx.beginPath();
      ctx.moveTo(cx - 8, -50);
      ctx.lineTo(cx + 8, -50);
      ctx.lineTo(cx + 80, g);
      ctx.lineTo(cx - 80, g);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return true;
    case 'halo':
      ctx.save();
      ctx.strokeStyle = '#f2c94c';
      ctx.lineWidth = 4;
      ctx.globalAlpha *= 0.85;
      ctx.beginPath();
      ctx.ellipse(hx, hy - 16 - 3 * pulse(now, 1500), 30, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return true;
    case 'auraPrata':
      aura(ctx, cx, g, '#dfe7f2', now, 0.35);
      return true;
    case 'auraRoxa':
      aura(ctx, cx, g, '#8e44ad', now, 0.35);
      return true;
    case 'auraNegra':
      aura(ctx, cx, g, '#1a0006', now, 0.45, 18);
      aura(ctx, cx, g, '#c0151f', now + 400, 0.25, 6);
      return true;
    case 'auraDourada':
      aura(ctx, cx, g, '#f2c94c', now, 0.35);
      return true;
    case 'onda': // onda de choque expandindo
      for (let i = 0; i < 2; i++) {
        const t = ((now / 1400 + i / 2) % 1);
        ctx.save();
        ctx.globalAlpha *= 0.5 * (1 - t);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(cx, g - 70, 40 + t * 130, 30 + t * 100, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      return true;
    case 'menacing': // ゴ ゴ ゴ ao redor
      for (let i = 0; i < 4; i++) {
        const y = g - 40 - i * 32 - ((now / 40) % 32);
        texto(ctx, 'ゴ', i % 2 ? cx + 105 : cx - 105, y, { size: 22, color: '#7b2fbf', fs: facingSign });
      }
      return true;
    case 'sharingan': // anel vermelho com vírgulas nos olhos
      for (const dx of [-11, 11]) {
        ctx.save();
        ctx.translate(hx + dx, hy + 28);
        ctx.rotate(now / 500);
        ctx.fillStyle = '#c0151f';
        ctx.globalAlpha *= 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(Math.cos((k * 2 * Math.PI) / 3) * 4, Math.sin((k * 2 * Math.PI) / 3) * 4, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      return true;
    case 'olhosBrilho': {
      const cor = arg || '#ff2a2a';
      for (const dx of [-11, 11]) {
        ctx.save();
        ctx.globalAlpha *= 0.55 + 0.25 * pulse(now, 1200);
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.arc(hx + dx, hy + 28, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return true;
    }
    case 'sombras': // três tubarões sombrios de escolta
      for (let i = 0; i < 3; i++) silhueta(ctx, cx - 60 + i * 60, g - 150 + (i % 2) * 18 + 4 * Math.sin(now / 700 + i), 0.9, '#2a1640', 0.55);
      return true;
    case 'gigantes': // titãs ao fundo avançando
      for (let i = 0; i < 3; i++) silhueta(ctx, cx - 120 + i * 120 + ((now / 30) % 20), g - 30, 2.2, '#11131c', 0.35);
      return true;
    case 'numeros67':
      texto(ctx, '6', cx - 70, g - 150 + 6 * Math.sin(now / 500), { size: 26, color: '#1b2647', bg: '#cfe6f5', border: OUTLINE, fs: facingSign });
      texto(ctx, '7', cx + 70, g - 150 + 6 * Math.cos(now / 500), { size: 26, color: '#1b2647', bg: '#cfe6f5', border: OUTLINE, fs: facingSign });
      return true;
    case 'presentes': // presentinhos de live (rosa, leão…)
      for (let i = 0; i < 3; i++) {
        const t = ((now / 2200 + i / 3) % 1);
        texto(ctx, ['🌹', '🦁', '🎁'][i], cx - 80 + i * 80, g - 40 - t * 120, { size: 20, fs: facingSign });
      }
      return true;
    case 'dna':
      ctx.save();
      ctx.lineWidth = 3;
      for (let k = 0; k < 2; k++) {
        ctx.strokeStyle = k ? '#7fb6e8' : '#ff5c9a';
        ctx.beginPath();
        for (let y = 0; y <= 160; y += 6) {
          const x = cx + 110 + Math.sin(y / 18 + now / 400 + k * Math.PI) * 16;
          if (y === 0) ctx.moveTo(x, g - 10 - y);
          else ctx.lineTo(x, g - 10 - y);
        }
        ctx.stroke();
      }
      ctx.restore();
      return true;
    case 'mapa': { // duas cidades e a rota
      const ax = cx - 120;
      const bx = cx + 120;
      const y = g - 175;
      ctx.save();
      ctx.fillStyle = 'rgba(30,60,120,0.55)';
      ctx.fillRect(ax - 16, y - 22, bx - ax + 32, 44);
      const t = (now % 2600) / 2600;
      ctx.strokeStyle = arg || '#e53935';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(ax, y);
      ctx.quadraticCurveTo(cx, y - 30, ax + (bx - ax) * Math.min(1, t * 1.4), y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fff';
      for (const x of [ax, bx]) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return true;
    }
    case 'medidor': { // ponteiro estoura o máximo
      const x = cx + 120;
      const y = g - 110;
      ctx.save();
      ctx.fillStyle = '#1d1f26';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 28, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      const a = Math.PI + Math.min(1.15, (now % 3000) / 1800) * Math.PI;
      ctx.strokeStyle = '#e53935';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 24, y + Math.sin(a) * 24);
      ctx.stroke();
      ctx.restore();
      texto(ctx, 'MÁX', x, y + 10, { size: 9, color: '#ff8a8a', fs: facingSign });
      return true;
    }
    case 'porta':
      ctx.save();
      ctx.fillStyle = 'rgba(140,90,40,0.85)';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.fillRect(cx + 100, g - 120, 50, 118);
      ctx.strokeRect(cx + 100, g - 120, 50, 118);
      ctx.restore();
      texto(ctx, 'PRIVACIDADE', cx + 125, g - 100, { size: 7, color: '#fff', bg: '#c62828', fs: facingSign, pad: 2 });
      return true;
    case 'mala': {
      ctx.save();
      ctx.fillStyle = '#7a4a22';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.fillRect(cx + 95, g - 60, 60, 44);
      ctx.strokeRect(cx + 95, g - 60, 60, 44);
      ctx.restore();
      const itens = ['👕', '🪥', '🔌', '🧴'];
      const i = Math.floor(now / 900) % itens.length;
      texto(ctx, itens[i], cx + 125, g - 85 - ((now % 900) / 900) * 20, { size: 18, fs: facingSign });
      return true;
    }
    case 'coracaoHolo':
      coracao(ctx, cx + 110, g - 120, 2.4 + 0.3 * pulse(now, 1000), 'rgba(255,79,123,0.7)');
      return true;
    case 'coracaoRachado':
      coracao(ctx, cx + 110, g - 120, 2.4, 'rgba(255,79,123,0.7)');
      ctx.save();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + 110, g - 135);
      ctx.lineTo(cx + 104, g - 124);
      ctx.lineTo(cx + 114, g - 118);
      ctx.lineTo(cx + 108, g - 106);
      ctx.stroke();
      ctx.restore();
      return true;
    case 'trono':
      ctx.save();
      ctx.globalAlpha *= 0.6;
      ctx.fillStyle = '#e9b824';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.fillRect(cx - 60, g - 190, 120, 26);
      ctx.fillRect(cx - 70, g - 200, 18, 50);
      ctx.fillRect(cx + 52, g - 200, 18, 50);
      ctx.restore();
      return true;
    case 'balanca': {
      const inc = 6 * Math.sin(now / 900);
      ctx.save();
      ctx.strokeStyle = '#e9b824';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + 120, g - 40);
      ctx.lineTo(cx + 120, g - 120);
      ctx.moveTo(cx + 92, g - 120 + inc);
      ctx.lineTo(cx + 148, g - 120 - inc);
      ctx.stroke();
      ctx.restore();
      return true;
    }
    case 'portais':
      for (const [x, y] of [[cx - 115, g - 100], [cx + 115, g - 100]]) {
        ctx.save();
        ctx.strokeStyle = `hsl(${Math.round(now / 20) % 360},80%,60%)`;
        ctx.lineWidth = 5;
        ctx.globalAlpha *= 0.7;
        ctx.beginPath();
        ctx.ellipse(x, y, 18, 34, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      return true;
    case 'falha': { // "glitch" cômico: faixas deslocadas, lentas
      ctx.save();
      ctx.globalAlpha *= 0.35;
      for (let i = 0; i < 5; i++) {
        const y = g - 160 + ((i * 37 + Math.floor(now / 300) * 13) % 160);
        ctx.fillStyle = ['#ff2a6d', '#05d9e8', '#d1f7ff'][i % 3];
        ctx.fillRect(cx - 120 + ((i * 29) % 40), y, 240, 4);
      }
      ctx.restore();
      return true;
    }
    case 'fumaca':
      for (let i = 0; i < 3; i++) {
        const t = ((now / 1800 + i / 3) % 1);
        ctx.save();
        ctx.globalAlpha *= 0.4 * (1 - t);
        ctx.fillStyle = '#9aa1ad';
        ctx.beginPath();
        ctx.arc(hx - 8 + i * 8, hy - 22 - t * 50, 8 + t * 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return true;
    case 'bolhaUnica': {
      const t = (now % 2400) / 2400;
      ctx.save();
      ctx.strokeStyle = '#cfe6f5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx + 20, hy + 55 - t * 70, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return true;
    }
    case 'painel': // holograma com texto
      texto(ctx, arg, cx, g - 205, { size: 11, color: '#d6f5ff', bg: 'rgba(20,60,110,0.8)', border: '#7fd6ff', fs: facingSign });
      return true;
    case 'barra': { // barra de chefe
      ctx.save();
      ctx.fillStyle = 'rgba(10,10,14,0.85)';
      ctx.fillRect(cx - 130, g - 225, 260, 26);
      const vida = 1 - ((now % 6000) / 6000) * 0.9;
      ctx.fillStyle = '#c0151f';
      ctx.fillRect(cx - 124, g - 210, 248 * vida, 8);
      ctx.restore();
      texto(ctx, arg, cx, g - 218, { size: 9, color: '#fff', fs: facingSign, pad: 0 });
      return true;
    }
    case 'carimbo':
      ctx.save();
      ctx.translate(cx + 118, g - 60);
      ctx.rotate(-0.25);
      texto(ctx, arg, 0, 0, { size: 13, color: '#c62828', border: '#c62828', fs: facingSign });
      ctx.restore();
      return true;
    case 'legenda': // legenda de cinema embaixo
      texto(ctx, arg, cx, g + 18, { size: 11, color: '#fff', bg: 'rgba(0,0,0,0.75)', fs: facingSign });
      return true;
    case 'contador':
      texto(ctx, arg, cx + 110, g - 175, { size: 13, color: '#ffe28a', bg: 'rgba(20,10,30,0.8)', border: '#f2c94c', fs: facingSign });
      return true;
    case 'tribunal':
      texto(ctx, '⚖', cx + 120, g - 150, { size: 26, fs: facingSign });
      return true;
    case 'oraculo':
      texto(ctx, '📜', cx + 115, g - 140 + 4 * Math.sin(now / 600), { size: 26, fs: facingSign });
      return true;
    default:
      return false;
  }
}
