// Palavras na tela das animações (originalidade.js → `anim.palavras`). Desenho próprio do projeto:
// lousa de giz com fórmula inventada, grito em estouro, legenda de documentário, placar de
// jurados, gráfico de barras, etiqueta com seta, nuvem de pensamento e carimbo de desbloqueio.
// Coordenadas no espaço do rig (caixa 180×170, chão em y=167). Puro canvas, sem DOM.

const W = 180;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOut = (x) => 1 - (1 - x) * (1 - x);
const pop = (x) => (x < 1 ? 1 + 0.25 * Math.sin(Math.PI * x) * (1 - x) * 3 - 0.25 * (1 - easeOut(x)) * 4 : 1);

// Caixa de cada formato (olhando para a direita), para a janela crescer o bastante.
const CAIXAS = {
  lousa: { l: 146, t: -34, r: 268, b: 32 },
  grito: { l: 20, t: -70, r: 160, b: -14 },
  legenda: { l: -6, t: 170, r: 186, b: 202 },
  placar: { l: 164, t: 20, r: 262, b: 92 },
  grafico: { l: -92, t: 14, r: 8, b: 108 },
  seta: { l: -104, t: 52, r: 66, b: 104 },
  pensamento: { l: -92, t: -76, r: 44, b: 14 },
  carimbo: { l: -14, t: -96, r: 194, b: -8 },
};

/** Espaço além da caixa do JoJo (px na escala 1) para as palavras de uma animação; null se nada. */
export function espacoDasPalavras(p) {
  const c = p && CAIXAS[p.tipo];
  if (!c) return null;
  const lado = Math.max(0, -c.l, c.r - W);
  return { l: lado, r: lado, t: Math.max(0, -c.t), b: Math.max(0, c.b - 170) };
}

function texto(ctx, s, x, y, { size = 9, cor = '#1b1b1b', contorno = null, peso = 'bold', fonte = 'sans-serif', alinhar = 'center', largura = null, estilo = '' } = {}) {
  ctx.font = `${estilo} ${peso} ${size}px ${fonte}`.trim();
  ctx.textAlign = alinhar;
  ctx.textBaseline = 'middle';
  if (largura) {
    const w = ctx.measureText(s).width;
    if (w > largura) { ctx.save(); ctx.translate(x, y); ctx.scale(largura / w, 1); x = 0; y = 0; desenha(); ctx.restore(); return; }
  }
  desenha();
  function desenha() {
    if (contorno) { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, size / 3.2); ctx.strokeStyle = contorno; ctx.strokeText(s, x, y); }
    ctx.fillStyle = cor;
    ctx.fillText(s, x, y);
  }
}

function caixaArredondada(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const CORES = {
  alegre: '#ffca28', energico: '#ff7043', exibido: '#ab47bc', bravo: '#e53935', pensativo: '#42a5f5', calmo: '#80cbc4', triste: '#90a4ae', medo: '#cddc39',
};

/**
 * Desenha as palavras no quadro atual. `t` = tempo da animação (0..1); `lado` = 1 (direita) ou -1;
 * `dinamico` substitui {nome} etc. (carimbo de desbloqueio); `reduzido` mostra o quadro final parado.
 */
export function desenharPalavras(ctx, p, t, { lado = 1, dinamico = {}, reduzido = false } = {}) {
  if (!p || !CAIXAS[p.tipo]) return;
  const t0 = p.t0 ?? 0.2, t1 = p.t1 ?? 0.86;
  if (!reduzido && (t < t0 || t > t1)) return;
  const u = reduzido ? 0.6 : clamp((t - t0) / Math.max(0.01, t1 - t0));
  const entra = reduzido ? 1 : clamp(u / 0.14);
  const sai = reduzido ? 1 : clamp((1 - u) / 0.1);
  const vis = Math.min(entra, sai);
  if (vis <= 0) return;
  const linhas = (p.linhas || []).map((s) => String(s).replace(/\{(\w+)\}/g, (_, k) => (dinamico[k] ?? '')));
  const cor = CORES[p.clima] || CORES.alegre;
  // Posição espelhada quando ele olha para a esquerda; o texto continua legível.
  const X = (x) => (lado < 0 ? W - x : x);
  ctx.save();
  ctx.globalAlpha *= clamp(vis * 1.4);
  switch (p.tipo) {
    case 'lousa': {
      const cx = X(207), cy = -2;
      ctx.translate(cx, cy + (1 - easeOut(entra)) * -14);
      ctx.rotate((lado < 0 ? 1 : -1) * 0.05);
      ctx.fillStyle = '#6d4c41'; caixaArredondada(ctx, -60, -30, 120, 60, 5); ctx.fill();
      ctx.fillStyle = '#2e5d4b'; caixaArredondada(ctx, -55, -25, 110, 50, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(-55, -25, 110, 16);
      // Giz escrevendo: as letras aparecem aos poucos.
      const escrito = reduzido ? 1 : clamp((u - 0.08) / 0.5);
      const l0 = linhas[0] || '', l1 = linhas[1] || '';
      const total = l0.length + l1.length;
      const n = Math.round(total * escrito);
      texto(ctx, l0.slice(0, Math.min(n, l0.length)), -50, -9, { size: 9.5, cor: '#f5f5f0', alinhar: 'left', largura: 100, fonte: '"Comic Sans MS", "Segoe Print", cursive' });
      if (n > l0.length) texto(ctx, l1.slice(0, n - l0.length), -50, 9, { size: 7.5, cor: '#fff59d', alinhar: 'left', largura: 100, fonte: '"Comic Sans MS", "Segoe Print", cursive', peso: 'normal' });
      // Pedacinho de giz que acompanha a escrita.
      if (escrito < 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-48 + 96 * escrito, n > l0.length ? 12 : -6, 6, 2.4); }
      ctx.fillStyle = '#a1887f'; ctx.fillRect(-40, 25, 80, 3);
      break;
    }
    case 'grito': {
      const k = reduzido ? 1 : pop(clamp(u / 0.16));
      const tre = reduzido ? 0 : Math.sin(t * 90) * 0.04;
      ctx.translate(X(90), -42);
      ctx.rotate(tre + (lado < 0 ? 0.06 : -0.06));
      ctx.scale(k, k);
      // Estouro de quadrinho (pontas irregulares, sempre o mesmo desenho por animação).
      ctx.beginPath();
      const pts = 18;
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const r = i % 2 ? 1 : 1.32;
        const x = Math.cos(a) * 56 * r, y = Math.sin(a) * 20 * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = cor; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#1b1b1b'; ctx.stroke();
      texto(ctx, linhas[0] || '', 0, 1, { size: 16, cor: '#ffffff', contorno: '#1b1b1b', largura: 96 });
      break;
    }
    case 'legenda': {
      const dx = reduzido ? 0 : (1 - easeOut(entra)) * -140;
      ctx.translate(dx, 0);
      ctx.fillStyle = 'rgba(16, 20, 28, 0.88)'; ctx.fillRect(-4, 172, 188, 28);
      ctx.fillStyle = cor; ctx.fillRect(-4, 172, 5, 28);
      texto(ctx, linhas[0] || '', 6, 180, { size: 8.5, cor: '#ffffff', alinhar: 'left', largura: 172 });
      texto(ctx, linhas[1] || '', 6, 192, { size: 7, cor: '#cfd8dc', alinhar: 'left', peso: 'normal', estilo: 'italic', largura: 172 });
      break;
    }
    case 'placar': {
      const base = X(213);
      texto(ctx, linhas[0] || '', base, 28, { size: 7.5, cor: '#ffffff', contorno: '#1b1b1b', largura: 96 });
      (p.numeros || []).slice(0, 3).forEach((num, i) => {
        const v = reduzido ? 1 : clamp((u - 0.1 - i * 0.12) / 0.12);
        if (v <= 0) return;
        const x = base - 32 + i * 32;
        ctx.save();
        ctx.translate(x, 64 + (1 - easeOut(v)) * 22);
        ctx.rotate((i - 1) * 0.06);
        ctx.fillStyle = '#fafafa'; caixaArredondada(ctx, -13, -18, 26, 34, 3); ctx.fill();
        ctx.lineWidth = 1.6; ctx.strokeStyle = '#1b1b1b'; ctx.stroke();
        ctx.fillStyle = '#37474f'; ctx.fillRect(-1.5, 16, 3, 10);
        texto(ctx, String(num).replace('.', ','), 0, -1, { size: 11, cor: i === 2 ? '#d32f2f' : '#1b1b1b', largura: 22 });
        ctx.restore();
      });
      break;
    }
    case 'grafico': {
      const ox = X(lado < 0 ? -2 : -82), oy = 100;
      const [a = 0.7, b = 0.2] = p.numeros || [];
      const cresce = reduzido ? 1 : easeOut(clamp((u - 0.08) / 0.4));
      ctx.fillStyle = 'rgba(250, 250, 245, 0.95)'; caixaArredondada(ctx, ox - 6, oy - 84, 88, 92, 4); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#1b1b1b'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox + 4, oy - 70); ctx.lineTo(ox + 4, oy - 10); ctx.lineTo(ox + 76, oy - 10); ctx.stroke();
      ctx.fillStyle = cor; ctx.fillRect(ox + 12, oy - 10 - 58 * a * cresce, 22, 58 * a * cresce);
      ctx.fillStyle = '#90a4ae'; ctx.fillRect(ox + 46, oy - 10 - 58 * b * cresce, 22, 58 * b * cresce);
      texto(ctx, linhas[0] || '', ox + 40, oy - 77, { size: 7, cor: '#1b1b1b', largura: 80 });
      texto(ctx, linhas[1] || '', ox + 23, oy - 2, { size: 6.5, cor: '#1b1b1b', largura: 32 });
      texto(ctx, linhas[2] || '', ox + 57, oy - 2, { size: 6.5, cor: '#1b1b1b', largura: 32 });
      break;
    }
    case 'seta': {
      const lx = X(-46), ly = 64, alvoX = X(62), alvoY = 98;
      const v = reduzido ? 1 : easeOut(clamp((u - 0.06) / 0.25));
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(lx + (lado < 0 ? -30 : 30), ly + 6);
      const ex = lx + (alvoX - lx) * v, ey = ly + 6 + (alvoY - ly - 6) * v;
      ctx.quadraticCurveTo((lx + alvoX) / 2, ly + 34, ex, ey); ctx.stroke();
      if (v > 0.95) { const s = lado < 0 ? -1 : 1; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 7 * s, ey - 2); ctx.lineTo(ex - 3 * s, ey - 7); ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill(); }
      ctx.fillStyle = '#fff8e1'; caixaArredondada(ctx, lx - 54, ly - 10, 108, 20, 4); ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#1b1b1b'; ctx.stroke();
      texto(ctx, linhas[0] || '', lx, ly, { size: 8, cor: '#1b1b1b', largura: 100 });
      break;
    }
    case 'pensamento': {
      const cx = X(-26), cy = -40;
      const v = reduzido ? 1 : clamp(u / 0.2);
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 1.6;
      [[X(44), 4, 3.5], [X(30), -4, 5.5]].forEach(([x, y, r], i) => { if (v > 0.2 + i * 0.25) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } });
      if (v > 0.7) {
        ctx.beginPath();
        for (const [dx, dy, r] of [[-44, 2, 18], [-22, -16, 21], [6, -18, 21], [32, -6, 19], [40, 12, 15], [16, 18, 18], [-14, 18, 18], [-40, 16, 14]]) { ctx.moveTo(cx + dx + r, cy + dy); ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); }
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(cx, cy + 1, 52, 22, 0, 0, Math.PI * 2); ctx.fill();
        const bal = reduzido ? 0 : Math.sin(t * 40) * 1.5;
        texto(ctx, linhas[0] || '', cx, cy - 6 + bal, { size: 16, cor: '#263238', largura: 80 });
        texto(ctx, linhas[1] || '', cx, cy + 12, { size: 8.5, cor: '#455a64', largura: 92 });
      }
      break;
    }
    case 'carimbo': {
      // Bate o carimbo (cresce e assenta), treme no impacto e a etiqueta com o nome desce.
      const bate = reduzido ? 1 : clamp(u / 0.1);
      const k = 2.2 - 1.2 * easeOut(bate);
      const tre = !reduzido && bate >= 1 && u < 0.2 ? Math.sin(u * 400) * 1.5 : 0;
      ctx.save();
      // Acima da cabeça (nunca tapa o rosto), com fundo claro para ler bem.
      ctx.translate(90 + tre, -66);
      ctx.rotate(-0.1);
      ctx.scale(k, k);
      ctx.globalAlpha *= 0.35 + 0.65 * bate;
      ctx.fillStyle = 'rgba(255, 248, 240, 0.94)'; caixaArredondada(ctx, -74, -17, 148, 34, 5); ctx.fill();
      ctx.lineWidth = 3.4; ctx.strokeStyle = '#c62828';
      caixaArredondada(ctx, -74, -17, 148, 34, 5); ctx.stroke();
      ctx.lineWidth = 1.2; caixaArredondada(ctx, -69, -12, 138, 24, 3); ctx.stroke();
      texto(ctx, linhas[0] || '', 0, 1, { size: 17, cor: '#c62828', largura: 128 });
      ctx.restore();
      if (linhas[1]) {
        const d = reduzido ? 1 : easeOut(clamp((u - 0.16) / 0.16));
        if (d > 0) {
          ctx.save();
          ctx.translate(90, -30 - (1 - d) * 14);
          ctx.globalAlpha *= d;
          ctx.fillStyle = '#fffde7'; caixaArredondada(ctx, -98, -12, 196, 24, 6); ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = '#1b1b1b'; ctx.stroke();
          ctx.fillStyle = '#ffca28'; ctx.beginPath(); ctx.arc(-86, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          texto(ctx, linhas[1], 4, 0.5, { size: 10, cor: '#1b1b1b', largura: 172 });
          ctx.restore();
        }
      }
      break;
    }
    default: break;
  }
  ctx.restore();
}
