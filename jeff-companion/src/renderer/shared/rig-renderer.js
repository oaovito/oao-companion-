// Desenha o rig vetorial do Jeff em um CanvasRenderingContext2D a partir de uma
// pose (canais numéricos). Não conhece Electron.

const DEG = Math.PI / 180;

export class RigRenderer {
  constructor(rig) {
    this.rig = rig;
    this.paths = new Map();
    for (const g of rig.groups) for (const p of g.parts) this.paths.set(p.id, new Path2D(p.path));
    this.box = rig.metrics.box;
    this.ground = rig.metrics.ground ?? this.box.height - 5;
  }

  color(key) {
    return this.rig.palette[key] || key;
  }

  /**
   * @param ctx contexto já transformado para pixels lógicos da janela
   * @param origin {x,y} canto superior esquerdo da caixa do Jeff (px lógicos)
   * @param scale escala do Jeff
   * @param facing valor contínuo -1..1 (virar = passar por 0)
   */
  draw(ctx, pose, { origin, scale = 1, facing = 1, alpha = 1 }) {
    const P = (k, d = 0) => (pose[k] ?? d);
    const rig = this.rig;
    const W = this.box.width;
    const gx = W / 2;
    const gy = this.ground;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha * P('alpha', 1)));
    ctx.translate(origin.x, origin.y);
    ctx.scale(scale, scale);
    // Virar de lado: escala horizontal contínua em torno do centro.
    const f = Math.abs(facing) < 0.06 ? Math.sign(facing || 1) * 0.06 : facing;
    ctx.translate(gx, 0);
    ctx.scale(f, 1);
    ctx.translate(-gx, 0);
    // Sombra no chão (não gira com o corpo; diminui quando ele pula).
    const lift = Math.max(0, -P('rootY'));
    ctx.save();
    ctx.globalAlpha *= 0.18 * Math.max(0.35, 1 - lift / 40);
    ctx.fillStyle = '#0b1530';
    ctx.beginPath();
    ctx.ellipse(gx + P('rootX'), gy + 1, 58 * Math.max(0.5, 1 - lift / 60), 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Raiz: deslocamento, rotação e squash em torno do ponto no chão.
    ctx.translate(P('rootX'), P('rootY'));
    const s = P('scale', 1);
    ctx.translate(gx, gy);
    ctx.scale(s, s);
    ctx.translate(-gx, -gy);
    const pivot = { x: 72, y: gy };
    ctx.translate(pivot.x, pivot.y);
    ctx.rotate(P('rootRot') * DEG);
    ctx.translate(-pivot.x, -pivot.y);
    ctx.translate(gx, gy);
    ctx.scale(P('squashX', 1), P('squashY', 1));
    ctx.translate(-gx, -gy);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const ow = rig.outlineWidth || 3;
    for (const group of rig.groups) {
      if (group.outline) {
        ctx.strokeStyle = this.color('outline');
        ctx.lineWidth = ow * 2;
        for (const part of group.parts) this._part(ctx, part, pose, (p) => ctx.stroke(p));
      }
      for (const part of group.parts) {
        ctx.fillStyle = this.color(part.fill);
        const a = part.alpha ?? 1;
        if (a !== 1) {
          ctx.save();
          ctx.globalAlpha *= a;
          this._part(ctx, part, pose, (p) => ctx.fill(p));
          ctx.restore();
        } else this._part(ctx, part, pose, (p) => ctx.fill(p));
      }
      if (group.id === 'bodyDetail') this._face(ctx, pose);
    }
    ctx.restore();
  }

  _part(ctx, part, pose, op) {
    ctx.save();
    if (part.pivot && part.rot) {
      ctx.translate(part.pivot[0], part.pivot[1]);
      ctx.rotate((pose[part.rot] || 0) * DEG);
      ctx.translate(-part.pivot[0], -part.pivot[1]);
    }
    if (part.lift) ctx.translate(0, -(pose[part.lift] || 0));
    op(this.paths.get(part.id));
    ctx.restore();
  }

  _face(ctx, pose) {
    const F = this.rig.face;
    const P = (k, d = 0) => (pose[k] ?? d);
    const outline = this.color('outline');
    ctx.save();
    ctx.translate(F.pivot[0], F.pivot[1]);
    ctx.rotate(P('headRot') * DEG);
    ctx.translate(-F.pivot[0] + P('headX'), -F.pivot[1] + P('headY'));

    // Guelras.
    ctx.strokeStyle = outline;
    ctx.globalAlpha *= 0.55;
    ctx.lineWidth = 2;
    for (const g of F.gills) {
      ctx.beginPath();
      ctx.moveTo(g[0], g[1]);
      ctx.quadraticCurveTo(g[0] - 3, (g[1] + g[3]) / 2, g[2], g[3]);
      ctx.stroke();
    }
    ctx.globalAlpha /= 0.55;

    // Bochecha.
    const blush = P('blush');
    if (blush > 0.02) {
      ctx.save();
      ctx.globalAlpha *= Math.min(1, blush) * 0.75;
      ctx.fillStyle = this.color('blush');
      ctx.beginPath();
      ctx.ellipse(F.blush.x, F.blush.y, F.blush.rx, F.blush.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Narina.
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.arc(F.nostril.x, F.nostril.y, F.nostril.r, 0, Math.PI * 2);
    ctx.fill();

    this._eye(ctx, pose);
    this._brow(ctx, pose);
    this._mouth(ctx, pose);
    ctx.restore();
  }

  _eye(ctx, pose) {
    const E = this.rig.face.eye;
    const P = (k, d = 0) => (pose[k] ?? d);
    const outline = this.color('outline');
    const es = P('eyeScale', 1);
    const px = P('pupilX') * 1.8;
    const py = P('pupilY') * 1.6;
    const cx = E.x + px;
    const cy = E.y + py;
    if (P('happyEyes') > 0.5) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy + 3);
      ctx.quadraticCurveTo(cx, cy - 9, cx + 7, cy + 3);
      ctx.stroke();
      return;
    }
    const open = Math.max(0, Math.min(1.2, P('eyeOpen', 1)));
    if (open < 0.14) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy + 1);
      ctx.quadraticCurveTo(cx, cy + 6, cx + 7, cy + 1);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = this.color('eye');
    ctx.beginPath();
    ctx.ellipse(cx, cy, E.rx * es, E.ry * es * open, 0, 0, Math.PI * 2);
    ctx.fill();
    if (open > 0.35) {
      ctx.fillStyle = this.color('eyeShine');
      ctx.beginPath();
      ctx.arc(cx + 2.2 * es + px * 0.3, cy - 3.2 * es * open, 2.7 * es, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - 2.4 * es, cy + 3 * es * open, 1.2 * es, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pálpebra quando semicerrado.
    if (open < 0.9) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - E.rx * es - 1, cy - E.ry * es * open + 1);
      ctx.lineTo(cx + E.rx * es + 1, cy - E.ry * es * open + 1);
      ctx.stroke();
    }
  }

  _brow(ctx, pose) {
    const show = pose.browShow ?? 0;
    if (show < 0.3) return;
    const B = this.rig.face.brow;
    const b = pose.brow ?? 0;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, (show - 0.3) / 0.4);
    ctx.strokeStyle = this.color('outline');
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    const y = B.y - b * 3;
    ctx.moveTo(B.x - B.w / 2, y + b * 1.5 + (b < 0 ? -2 : 0));
    ctx.quadraticCurveTo(B.x, y - 3 - b * 1.5, B.x + B.w / 2, y + (b < 0 ? 3 : 0));
    ctx.stroke();
    ctx.restore();
  }

  _mouth(ctx, pose) {
    const M = this.rig.face.mouth;
    const jaw = Math.max(0, Math.min(1.2, pose.jaw ?? 0));
    const outline = this.color('outline');
    if (jaw > 0.05) {
      const drop = 3 + jaw * 13;
      const mouth = new Path2D();
      mouth.moveTo(M.x1, M.y1);
      mouth.quadraticCurveTo(M.cx, M.cy - 4, M.x2, M.y2);
      mouth.quadraticCurveTo(M.cx + 2, M.cy + drop, M.x1, M.y1);
      mouth.closePath();
      ctx.fillStyle = this.color('mouth');
      ctx.fill(mouth);
      // Língua (recortada pela boca).
      ctx.save();
      ctx.clip(mouth);
      ctx.fillStyle = this.color('tongue');
      ctx.beginPath();
      ctx.ellipse(M.cx + 1, M.cy - 4 + drop * 0.8, 8, 3 + jaw * 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.4;
      ctx.stroke(mouth);
    } else {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(M.x1, M.y1);
      ctx.quadraticCurveTo(M.cx, M.cy, M.x2, M.y2);
      ctx.stroke();
    }
    // Dentinhos (marca registrada) ao longo do sorriso.
    ctx.fillStyle = this.color('teeth');
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    const topY = (t) => {
      const u = 1 - t;
      const cy = jaw > 0.05 ? M.cy - 4 : M.cy;
      return { x: u * u * M.x1 + 2 * u * t * M.cx + t * t * M.x2, y: u * u * M.y1 + 2 * u * t * cy + t * t * M.y2 };
    };
    for (const t of [0.28, 0.5, 0.72]) {
      const a = topY(t - 0.07);
      const b = topY(t + 0.07);
      const m = topY(t);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(m.x, m.y + 4.2);
      ctx.lineTo(b.x, b.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}
