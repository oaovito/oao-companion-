// Desenha o rig vetorial do Jeff em um CanvasRenderingContext2D a partir de uma
// pose (canais numéricos). Não conhece Electron.

const DEG = Math.PI / 180;

export class RigRenderer {
  constructor(rig) {
    this.rig = rig;
    this.paths = new Map();
    this.partsById = new Map();
    for (const g of rig.groups) {
      for (const p of g.parts) {
        this.paths.set(p.id, new Path2D(p.path));
        this.partsById.set(p.id, p);
      }
    }
    this.box = rig.metrics.box;
    this.ground = rig.metrics.ground ?? this.box.height - 5;
    this.rootPivot = rig.metrics.rootPivot || { x: this.box.width * 0.4, y: this.ground };
    this.shadowRx = rig.metrics.shadowRx ?? 58;
    // Compatibilidade: rigs antigos têm um único olho/sobrancelha/narina.
    const F = rig.face;
    this.eyes = F.eyes || [{ ...F.eye, scale: 1 }];
    this.brows = F.brows || (F.brow ? [F.brow] : []);
    this.nostrils = F.nostrils || (F.nostril ? [F.nostril] : []);
    this.teeth = F.teeth || [0.28, 0.5, 0.72];
    this.toothSize = F.toothSize ?? 4.2;
    this.faceAfter = rig.faceAfter || 'bodyDetail';
    this.faceStyle = F.style || 'classic';
    this.faceCenter = F.center ?? this.box.width / 2;
    this.blushes = Array.isArray(F.blush) ? F.blush : F.blush ? [F.blush] : [];
    this.restingLid = F.restingLid ?? 0;       // pálpebra pesada em repouso (0..1)
    this.browAlways = !!F.browAlways;          // sobrancelhas sempre visíveis
    this.browFrown = F.browFrown ?? 0;         // px: ponta interna para baixo (cara fechada)
    this.restJaw = F.restJaw ?? 0;             // boca sempre entreaberta
    this.mouthDepth = F.mouthDepth ?? 16;      // px de abertura com jaw = 1
    this.toothWidth = F.toothWidth ?? 0.48;    // largura do dente relativa ao espaçamento
    this.lowerTeeth = F.lowerTeeth || [];
    this.lowerToothSize = F.lowerToothSize ?? this.toothSize * 0.8;
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
    ctx.ellipse(gx + P('rootX'), gy + 1, this.shadowRx * Math.max(0.5, 1 - lift / 60), 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Raiz: deslocamento, rotação e squash em torno do ponto no chão.
    ctx.translate(P('rootX'), P('rootY'));
    const s = P('scale', 1);
    ctx.translate(gx, gy);
    ctx.scale(s, s);
    ctx.translate(-gx, -gy);
    const pivot = this.rootPivot;
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
      if (group.id === this.faceAfter) this._face(ctx, pose);
    }
    ctx.restore();
  }

  _part(ctx, part, pose, op) {
    ctx.save();
    this._xform(ctx, part, pose, 0);
    op(this.paths.get(part.id));
    ctx.restore();
  }

  /** Aplica a transformação da peça; `parent` encadeia (ex.: antebraço segue o braço). */
  _xform(ctx, part, pose, depth) {
    if (part.parent && depth < 4) {
      const parent = this.partsById.get(part.parent);
      if (parent) this._xform(ctx, parent, pose, depth + 1);
    }
    if (part.pivot && part.rot) {
      ctx.translate(part.pivot[0], part.pivot[1]);
      ctx.rotate((pose[part.rot] || 0) * (part.rotSign ?? 1) * DEG);
      ctx.translate(-part.pivot[0], -part.pivot[1]);
    }
    if (part.lift) ctx.translate(0, -(pose[part.lift] || 0));
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
      for (const b of this.blushes) {
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Narinas.
    ctx.fillStyle = outline;
    for (const n of this.nostrils) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const sp = this.faceStyle === 'sp';
    for (const e of this.eyes) (sp ? this._eyeSP : this._eye).call(this, ctx, pose, e);
    for (const b of this.brows) (sp ? this._browSP : this._brow).call(this, ctx, pose, b);
    this._mouth(ctx, pose);
    ctx.restore();
  }

  _eye(ctx, pose, E) {
    const P = (k, d = 0) => (pose[k] ?? d);
    const outline = this.color('outline');
    const k = E.scale ?? 1;
    const es = P('eyeScale', 1);
    const px = P('pupilX') * 1.8;
    const py = P('pupilY') * 1.6;
    const cx = E.x + px;
    const cy = E.y + py;
    if (P('happyEyes') > 0.5) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 7 * k, cy + 3);
      ctx.quadraticCurveTo(cx, cy - 9 * k, cx + 7 * k, cy + 3);
      ctx.stroke();
      return;
    }
    const open = Math.max(0, Math.min(1.2, P('eyeOpen', 1)));
    if (open < 0.14) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(cx - 7 * k, cy + 1);
      ctx.quadraticCurveTo(cx, cy + 6 * k, cx + 7 * k, cy + 1);
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
      ctx.arc(cx + 2.2 * es * k + px * 0.3, cy - 3.2 * es * k * open, 2.7 * es * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - 2.4 * es * k, cy + 3 * es * k * open, 1.2 * es * k, 0, Math.PI * 2);
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

  /**
   * Olho estilo South Park: oval branco com contorno, pupila de ponto puxada
   * para o centro, pálpebra da cor do corpo descendo de cima; feliz = pálpebra
   * inferior subindo; fechado = linha.
   */
  _eyeSP(ctx, pose, E) {
    const P = (k, d = 0) => (pose[k] ?? d);
    const outline = this.color('outline');
    const es = P('eyeScale', 1);
    const rx = E.rx * es;
    const ry = E.ry * es;
    // Pálpebra pesada em repouso; some quando os olhos arregalam (surpresa).
    const lid = es > 1.1 ? 0 : this.restingLid;
    const open = Math.max(0, Math.min(1 - lid, P('eyeOpen', 1)));
    const happy = P('happyEyes') > 0.5;
    const eye = new Path2D();
    eye.ellipse(E.x, E.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.color('sclera');
    ctx.fill(eye);
    if (open > 0.12) {
      const pr = (E.pupil ?? 3.4) * (es > 1.1 ? 0.8 : 1);
      const px = E.x + (E.pupilOffset ?? 0) + P('pupilX') * rx * 0.45;
      const py = E.y + 2 + P('pupilY') * ry * 0.45;
      ctx.fillStyle = this.color('eye');
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pálpebras (cor do corpo), recortadas pelo olho.
    ctx.save();
    ctx.clip(eye);
    ctx.fillStyle = this.color('body');
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    const top = E.y - ry;
    if (open < 0.98) {
      const lidY = top + (1 - open) * ry * 2;
      ctx.fillRect(E.x - rx - 2, top - 2, rx * 2 + 4, lidY - top + 2);
      ctx.beginPath();
      ctx.moveTo(E.x - rx - 2, lidY);
      ctx.lineTo(E.x + rx + 2, lidY);
      ctx.stroke();
    }
    if (happy && open > 0.12) {
      const y0 = E.y + ry * 0.25;
      ctx.beginPath();
      ctx.moveTo(E.x - rx - 2, E.y + ry + 2);
      ctx.lineTo(E.x - rx - 2, y0 + ry * 0.4);
      ctx.quadraticCurveTo(E.x, y0 - ry * 0.5, E.x + rx + 2, y0 + ry * 0.4);
      ctx.lineTo(E.x + rx + 2, E.y + ry + 2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(E.x - rx - 2, y0 + ry * 0.4);
      ctx.quadraticCurveTo(E.x, y0 - ry * 0.5, E.x + rx + 2, y0 + ry * 0.4);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.stroke(eye);
    if (open <= 0.12) {
      // Olho fechado: linha de cílio na parte de baixo.
      ctx.beginPath();
      ctx.moveTo(E.x - rx * 0.7, E.y + ry * 0.35);
      ctx.quadraticCurveTo(E.x, E.y + ry * 0.75, E.x + rx * 0.7, E.y + ry * 0.35);
      ctx.stroke();
    }
  }

  /** Sobrancelha estilo South Park: traço reto e grosso; brow<0 bravo/preocupado, >0 surpreso. */
  _browSP(ctx, pose, B) {
    const show = this.browAlways ? 1 : (pose.browShow ?? 0);
    if (show < 0.3) return;
    const b = pose.brow ?? 0;
    const inner = B.x < this.faceCenter ? 1 : -1; // lado voltado para o centro
    const half = B.w / 2;
    const y = B.y - Math.max(0, b) * 4;
    // Ponta interna sobe quando preocupado (b<0) e levemente quando surpreso (b>0).
    const frown = b > 0.3 ? 0 : this.browFrown;
    const innerY = y + (b < 0 ? b * 6 : -b * 2) + frown;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, (show - 0.3) / 0.4);
    ctx.strokeStyle = this.color('brow');
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(B.x - inner * half, y);
    ctx.lineTo(B.x + inner * half, innerY);
    ctx.stroke();
    ctx.restore();
  }

  _brow(ctx, pose, B) {
    const show = pose.browShow ?? 0;
    if (show < 0.3) return;
    const b = pose.brow ?? 0;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, (show - 0.3) / 0.4);
    ctx.strokeStyle = this.color('brow');
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
    const jaw = Math.max(this.restJaw, Math.min(1.2, pose.jaw ?? 0));
    const outline = this.color('outline');
    if (jaw > 0.05) {
      const drop = 3 + jaw * this.mouthDepth;
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
      ctx.ellipse(M.cx + 1, M.cy - 4 + drop * 0.85, 10, 2 + jaw * 4, 0, 0, Math.PI * 2);
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
    // Fileira de baixo (apontando para cima), ao longo do lábio inferior.
    if (this.lowerTeeth.length && jaw > 0.05) {
      const drop = 3 + jaw * this.mouthDepth;
      const bot = (t) => {
        const u = 1 - t;
        const cx = M.cx + 2;
        const cy = M.cy + drop;
        return { x: u * u * M.x1 + 2 * u * t * cx + t * t * M.x2, y: u * u * M.y1 + 2 * u * t * cy + t * t * M.y2 };
      };
      const lh = this.lowerTeeth.length > 1 ? (this.lowerTeeth[1] - this.lowerTeeth[0]) * this.toothWidth : 0.06;
      for (const t of this.lowerTeeth) {
        const a = bot(t - lh);
        const b = bot(t + lh);
        const m = bot(t);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(m.x, m.y - this.lowerToothSize);
        ctx.lineTo(b.x, b.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    const half = this.teeth.length > 1 ? Math.min(0.07, (this.teeth[1] - this.teeth[0]) * this.toothWidth) : 0.07;
    for (const t of this.teeth) {
      const a = topY(t - half);
      const b = topY(t + half);
      const m = topY(t);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(m.x, m.y + this.toothSize);
      ctx.lineTo(b.x, b.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}
