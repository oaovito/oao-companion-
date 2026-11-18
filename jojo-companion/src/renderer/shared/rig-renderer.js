// Desenha o rig vetorial do JoJo em um CanvasRenderingContext2D a partir de uma
// pose (canais numéricos). Não conhece Electron.

const DEG = Math.PI / 180;

export class RigRenderer {
  constructor(rig) {
    this.rig = rig;
    this.paths = new Map();
    this.clips = new Map(); // recortes (ex.: meia arrastão só dentro das pernas)
    this.partsById = new Map();
    this.groupHide = new Map(); // hideIf do grupo já como lista (sem alocar por quadro)
    for (const g of rig.groups) {
      if (g.hideIf) this.groupHide.set(g, [].concat(g.hideIf));
      for (const p of g.parts) {
        this.paths.set(p.id, new Path2D(p.path));
        if (p.clipPath) this.clips.set(p.id, new Path2D(p.clipPath));
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
    return (this.tinted && this.tinted[key]) || this.rig.palette[key] || key;
  }

  /**
   * Cor por emoção: canais moodAngry, moodSad… (0..1) misturam a paleta com os
   * alvos de `rig.moods` (raiva avermelha, tristeza acinzenta…). Resultado em cache.
   */
  _applyMoods(pose) {
    const moods = this.rig.moods || {};
    this.tinted = null;
    // Fantasia ativa: troca cores (ex.: bermuda branca no Ano Novo).
    const costumes = this.rig.costumes || {};
    // Bermuda do guarda-roupa (costume_bermuda*) vence a paleta das outras peças.
    const on = Object.keys(costumes).filter((k) => k[0] !== '_' && (pose[`costume_${k}`] ?? 0) >= 0.5);
    // Ordem: fantasia do dia, pele do visual de nível, bermuda (a bermuda vence nas cores dela).
    const ordem = [on.find((k) => !k.startsWith('bermuda') && !k.startsWith('pele') && !k.startsWith('olho')), ...on.filter((k) => k.startsWith('pele')), ...on.filter((k) => k.startsWith('olho')), on.find((k) => k.startsWith('bermuda'))].filter(Boolean);
    let key = ordem.length ? `c:${ordem.join(',')};` : '';
    for (const ch of Object.keys(moods)) {
      if (ch[0] === '_') continue;
      const v = Math.round(Math.max(0, Math.min(1, pose[ch] || 0)) * 40);
      if (v) key += `${ch}${v};`;
    }
    if (!key) return;
    if (this._tintKey === key) {
      this.tinted = this._tintCache;
      return;
    }
    const out = { ...this.rig.palette };
    for (const k of ordem) Object.assign(out, costumes[k].palette || {});
    for (const ch of Object.keys(moods)) {
      if (ch[0] === '_') continue;
      const amt = Math.max(0, Math.min(1, pose[ch] || 0)) * (moods[ch].max ?? 1);
      if (amt <= 0) continue;
      for (const [k, to] of Object.entries(moods[ch].to || {})) {
        if (out[k]) out[k] = mixHex(out[k], to, amt);
      }
    }
    this._tintKey = key;
    this._tintCache = out;
    this.tinted = out;
  }

  /**
   * @param ctx contexto já transformado para pixels lógicos da janela
   * @param origin {x,y} canto superior esquerdo da caixa do JoJo (px lógicos)
   * @param scale escala do JoJo
   * @param facing valor contínuo -1..1 (virar = passar por 0)
   */
  draw(ctx, pose, { origin, scale = 1, facing = 1, alpha = 1 }) {
    const P = (k, d = 0) => (pose[k] ?? d);
    const rig = this.rig;
    this._applyMoods(pose);
    // Visuais de nível podem transformar o JoJo: cabeça, corpo, boca e olhos (1 = normal).
    this.nv = { cab: P('nvCabeca', 1), corpo: P('nvCorpo', 1), boca: P('nvBoca', 1), olhos: Math.round(P('nvOlhos', 0)) };
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
      // Grupos de outra vista (ex.: de costas) trocam de lugar com a vista de frente.
      if (group.showIf && !((pose[group.showIf] ?? 0) >= 0.5)) continue;
      if (group.hideIf && this.groupHide.get(group).some((ch) => (pose[ch] ?? 0) >= 0.5)) continue;
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
    // Adereços (banco, barra, pó…) só aparecem quando o canal `showIf` está ligado.
    if (part.showIf && !((pose[part.showIf] ?? 0) >= 0.5)) return;
    if (part.hideIf && [].concat(part.hideIf).some((ch) => (pose[ch] ?? 0) >= 0.5)) return;
    ctx.save();
    this._xform(ctx, part, pose, 0);
    const clip = this.clips.get(part.id);
    if (clip) ctx.clip(clip);
    op(this.paths.get(part.id));
    ctx.restore();
  }

  /** Aplica a transformação da peça; `parent` encadeia (ex.: antebraço segue o braço). */
  _xform(ctx, part, pose, depth) {
    if (part.parent && depth < 4) {
      const parent = this.partsById.get(part.parent);
      if (parent) this._xform(ctx, parent, pose, depth + 1);
    }
    // Corpo mais largo (visual de nível): tronco/pernas esticam; braços vão para os lados.
    const corpo = this.nv?.corpo ?? 1;
    if (corpo !== 1) {
      if (part.corpoX) { ctx.translate(90, 0); ctx.scale(corpo, 1); ctx.translate(-90, 0); }
      if (part.ladoX) ctx.translate(part.ladoX * (corpo - 1) * 44, 0);
    }
    if (part.pivot && part.rot) {
      ctx.translate(part.pivot[0], part.pivot[1]);
      // Canais tailRot legados viram movimento discreto dos pés, sem desenhar cauda.
      const sway = ['legL', 'legR', 'clawL', 'clawR'].includes(part.id) ? (pose.tailRot || 0) * 0.25 : 0;
      const angle = (pose[part.rot] || 0) + sway;
      ctx.rotate(angle * (part.rotSign ?? 1) * DEG);
      // Cabeça maior ou menor (visual de nível), crescendo a partir do pescoço.
      const cab = this.nv?.cab ?? 1;
      if (part.rot === 'headRot' && cab !== 1) ctx.scale(cab, cab);
      ctx.translate(-part.pivot[0], -part.pivot[1]);
    }
    if (part.lift) ctx.translate(0, -(pose[part.lift] || 0));
    // Deslocamento horizontal/vertical por canal (ex.: nádegas abrindo, gosma escorrendo).
    if (part.dx) ctx.translate((pose[part.dx] || 0) * (part.dxSign ?? 1), 0);
    if (part.dy) ctx.translate(0, pose[part.dy] || 0);
    // Escala por canal em torno de `scalePivot` (ex.: prolapso saltando e pulsando).
    if (part.scaleBy && part.scalePivot) {
      const k = Math.max(0, pose[part.scaleBy] ?? 1);
      ctx.translate(part.scalePivot[0], part.scalePivot[1]);
      ctx.scale(k, k);
      ctx.translate(-part.scalePivot[0], -part.scalePivot[1]);
    }
    // Ajuste fixo da peça (gene do visual): [escala, giro em graus, pivô x, pivô y].
    if (part.fix) {
      const [k, g, fx, fy] = part.fix;
      ctx.translate(fx, fy); ctx.rotate(g * DEG); ctx.scale(k, k); ctx.translate(-fx, -fy);
    }
    // Escala só horizontal/vertical por canal (ex.: corpo amassando e alargando no rebolado).
    if ((part.scaleXBy || part.scaleYBy) && part.squashPivot) {
      const kx = Math.max(0.2, part.scaleXBy ? pose[part.scaleXBy] ?? 1 : 1);
      const ky = Math.max(0.2, part.scaleYBy ? pose[part.scaleYBy] ?? 1 : 1);
      ctx.translate(part.squashPivot[0], part.squashPivot[1]);
      ctx.scale(kx, ky);
      ctx.translate(-part.squashPivot[0], -part.squashPivot[1]);
    }
  }

  _face(ctx, pose) {
    const F = this.rig.face;
    const P = (k, d = 0) => (pose[k] ?? d);
    const outline = this.color('outline');
    ctx.save();
    ctx.translate(F.pivot[0], F.pivot[1]);
    ctx.rotate(P('headRot') * DEG);
    if (this.nv && this.nv.cab !== 1) ctx.scale(this.nv.cab, this.nv.cab);
    ctx.translate(-F.pivot[0] + P('headX'), -F.pivot[1] + P('headY'));

    // Guelras.
    ctx.strokeStyle = outline;
    ctx.globalAlpha *= 0.55;
    ctx.lineWidth = 2;
    const gw = P('gills') * 3; // guelras mexendo
    for (const g of F.gills) {
      const dx = Math.sign(g[0] - this.faceCenter) * gw;
      ctx.beginPath();
      ctx.moveTo(g[0] + dx, g[1]);
      ctx.quadraticCurveTo(g[0] - 3 + dx * 1.6, (g[1] + g[3]) / 2, g[2] + dx, g[3]);
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

    // Bochechas infladas (baiacu): bolas da cor do corpo com contorno.
    const cheeks = P('cheeks');
    if (cheeks > 0.02) {
      ctx.save();
      ctx.fillStyle = this.color('body');
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.5;
      for (const b of this.blushes) {
        const r = (b.rx + 4) * (0.6 + 0.6 * Math.min(1, cheeks));
        const x = b.x + Math.sign(b.x - this.faceCenter) * r * 0.45;
        ctx.beginPath();
        ctx.ellipse(x, b.y + 2, r, r * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    const sp = this.faceStyle === 'sp';
    // Piscadinha: fecha só o olho do lado de fora (direita do desenho).
    const wink = P('wink') > 0.5;
    for (const e of this.eyes) {
      const p = wink && e.x > this.faceCenter ? { ...pose, eyeOpen: 0, happyEyes: 0 } : pose;
      if (this.nv?.olhos && this._olhoEstilo(ctx, p, e, this.nv.olhos)) continue;
      (sp ? this._eyeSP : this._eye).call(this, ctx, p, e);
    }
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
    // Olhos em X (😵) ou de coração no lugar da pupila.
    const dazed = P('eyeX') > 0.5;
    const love = !dazed && P('heartEyes') > 0.5;
    if (dazed) {
      ctx.strokeStyle = this.color('eye');
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const k = Math.min(rx, ry) * 0.6;
      ctx.beginPath();
      ctx.moveTo(E.x - k, E.y - k);
      ctx.lineTo(E.x + k, E.y + k);
      ctx.moveTo(E.x + k, E.y - k);
      ctx.lineTo(E.x - k, E.y + k);
      ctx.stroke();
    } else if (love) {
      const s = Math.min(rx, ry) * 0.75;
      const hx = E.x;
      const hy = E.y + 1;
      ctx.fillStyle = this.color('heart');
      ctx.beginPath();
      ctx.moveTo(hx, hy + s * 0.7);
      ctx.bezierCurveTo(hx - s * 1.3, hy - s * 0.2, hx - s * 0.6, hy - s * 1.2, hx, hy - s * 0.45);
      ctx.bezierCurveTo(hx + s * 0.6, hy - s * 1.2, hx + s * 1.3, hy - s * 0.2, hx, hy + s * 0.7);
      ctx.fill();
    } else if (open > 0.12) {
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
    ctx.fillStyle = this.color(this.rig.palette.nvCabecaPele ? 'nvCabecaPele' : 'body');
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
    if (happy && open > 0.12 && !dazed && !love) {
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
    // browAngry (0..1): ponta interna bem para baixo — cara de raiva.
    const innerY = y + (b < 0 ? b * 6 : -b * 2) + frown + Math.max(0, pose.browAngry ?? 0) * 6;
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

  /** Boca maior ou menor (visual de nível), a partir do centro do sorriso. */
  _mouth(ctx, pose) {
    const k = this.nv?.boca ?? 1;
    if (k === 1) return this._mouthBase(ctx, pose);
    const M = this.rig.face.mouth;
    ctx.save();
    ctx.translate(M.cx, M.y1);
    ctx.scale(k, 0.55 + 0.45 * k);
    ctx.translate(-M.cx, -M.y1);
    this._mouthBase(ctx, pose);
    ctx.restore();
  }

  /**
   * Olhos de outro estilo (visual de nível). Cor da íris: paleta `eye`; branco: `sclera`.
   * 1 anime · 2 pontinhos · 3 sharingan · 4 brancos vazios · 5 pretos · 6 brilhando ·
   * 7 coração · 8 semicerrados · 9 grandes e redondos. Devolve false para o estilo normal.
   */
  /**
   * Olhos dos visuais de nível. O estilo (1–9) dá a base; os genes do visual (canais
   * nvPupila, nvBrilhos, nvCilios, nvOlhoRx/Ry, nvOlhoTilt e a cor nvIris da paleta) fazem
   * cada visual ter um olho só dele: nenhum olho de visual repete o de outro.
   */
  _olhoEstilo(ctx, pose, E, estilo) {
    const open = Math.max(0, Math.min(1, pose.eyeOpen ?? 1));
    const outline = this.color('outline');
    const g = {
      pupila: Math.round(pose.nvPupila ?? 0), brilhos: Math.round(pose.nvBrilhos ?? -1), cilios: Math.round(pose.nvCilios ?? 0),
      rx: pose.nvOlhoRx ?? 1, ry: pose.nvOlhoRy ?? 1, tilt: pose.nvOlhoTilt ?? 0,
    };
    const lado = E.x < this.faceCenter ? -1 : 1;
    const iris = (this.tinted && this.tinted.nvIris) || this.rig.palette.nvIris || this.color('eye');
    const cilios = () => {
      if (g.cilios <= 0) return;
      ctx.strokeStyle = outline; ctx.lineWidth = 1.8;
      for (let i = 0; i < g.cilios; i++) {
        const a = Math.PI * (1.15 + (i / Math.max(1, g.cilios - 1)) * 0.7) * (g.cilios === 1 ? 1 : 1);
        const x0 = E.x + Math.cos(a) * E.rx * 1.1 * g.rx, y0 = E.y + Math.sin(a) * E.ry * 1.1 * g.ry * open;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(a) * 4 + lado * 1.2, y0 + Math.sin(a) * 4 - 1); ctx.stroke();
      }
    };
    if (estilo === 7 || estilo === 8) {
      this._eyeSP(ctx, estilo === 7 ? { ...pose, heartEyes: 1 } : { ...pose, eyeOpen: Math.min(open, 0.42) }, E);
      cilios();
      return true;
    }
    if (open < 0.14 || pose.happyEyes > 0.5 || pose.eyeX > 0.5 || pose.heartEyes > 0.5) return false;
    const px = (pose.pupilX || 0) * 2, py = (pose.pupilY || 0) * 2;
    const oval = (x, y, rx, ry, fill, stroke = true, rot = 0) => {
      ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, Math.PI * 2);
      ctx.fillStyle = fill; ctx.fill();
      if (stroke) { ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke(); }
    };
    // Pupila de cada visual: redonda, fenda, estrela, coração, losango, cruz, anel, dupla, gota, lua.
    const pupila = (x, y, r, fill) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      const k = g.pupila % 10;
      if (k === 1) ctx.ellipse(x, y, r * 0.35, r * 1.1, 0, 0, Math.PI * 2);
      else if (k === 2) ctx.ellipse(x, y, r * 1.1, r * 0.35, 0, 0, Math.PI * 2);
      else if (k === 3 || k === 5 || k === 6) {
        const n = k === 3 ? 5 : 4, dentro = k === 3 ? 0.45 : k === 5 ? 0.7 : 0.25;
        for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n; const rr = i % 2 ? r * dentro : r * 1.15; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        ctx.closePath();
      } else if (k === 4) {
        ctx.moveTo(x, y + r); ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.5, y - r * 1.3, x, y - r * 0.4);
        ctx.bezierCurveTo(x + r * 0.5, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r); ctx.closePath();
      } else if (k === 7) {
        ctx.arc(x, y, r, 0, Math.PI * 2); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2, true);
      } else if (k === 8) {
        ctx.arc(x - r * 0.45, y, r * 0.55, 0, Math.PI * 2); ctx.moveTo(x + r * 1.0, y); ctx.arc(x + r * 0.45, y, r * 0.55, 0, Math.PI * 2);
      } else if (k === 9) {
        ctx.moveTo(x, y - r * 1.2); ctx.quadraticCurveTo(x + r * 1.1, y + r * 0.2, x, y + r); ctx.quadraticCurveTo(x - r * 1.1, y + r * 0.2, x, y - r * 1.2); ctx.closePath();
      } else ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill('evenodd');
    };
    const brilhos = (x, y, r, padrao) => {
      const n = g.brilhos >= 0 ? g.brilhos : padrao;
      const pos = [[-0.45, -0.5, 0.42], [0.42, 0.55, 0.2], [0.5, -0.35, 0.16]];
      for (let i = 0; i < n; i++) oval(x + pos[i][0] * r * 2, y + pos[i][1] * r * 2, r * pos[i][2] * 2, r * pos[i][2] * 2 * open, '#ffffff', false);
    };
    ctx.save();
    // Formato e inclinação próprios do visual, em torno do centro do olho.
    ctx.translate(E.x, E.y); ctx.rotate(g.tilt * lado); ctx.scale(g.rx, g.ry); ctx.translate(-E.x, -E.y);
    if (estilo === 1) {
      oval(E.x, E.y, E.rx * 1.2, E.ry * 1.3 * open, this.color('sclera'));
      oval(E.x + px, E.y + 2 + py, E.rx * 0.78, E.ry * 1.05 * open, iris, false);
      pupila(E.x + px, E.y + 3 + py, E.rx * 0.36, '#111111');
      brilhos(E.x + px, E.y + 2 + py, E.rx * 0.5, 2);
    } else if (estilo === 2) {
      pupila(E.x + px, E.y + 2 + py, 3.6, iris);
      brilhos(E.x + px, E.y + 2 + py, 2.2, 0);
    } else if (estilo === 3) {
      oval(E.x, E.y, E.rx, E.ry * open, this.color('sclera'));
      oval(E.x + px, E.y + 1 + py, 6.6, 6.6 * open, iris);
      pupila(E.x + px, E.y + 1 + py, 2, '#111111');
      const tomoe = Math.max(1, (g.brilhos >= 0 ? g.brilhos : 2) + 1);
      for (let i = 0; i < tomoe; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / tomoe; oval(E.x + px + Math.cos(a) * 4, E.y + 1 + py + Math.sin(a) * 4, 1.4, 1.4, '#111111', false); }
    } else if (estilo === 4) {
      oval(E.x + lado * 1, E.y, E.rx * 1.25, E.ry * 0.95 * open, this.color('sclera'), true, lado * 0.45);
      if (g.pupila % 10 !== 0) pupila(E.x + lado, E.y, 1.6, iris);
    } else if (estilo === 5) {
      oval(E.x, E.y + 2, E.rx * 1.05, E.ry * 1.25 * open, iris);
      brilhos(E.x, E.y + 2, E.rx * 0.5, 1);
    } else if (estilo === 6) {
      ctx.globalAlpha *= 0.35; oval(E.x, E.y, E.rx * 1.5, E.ry * 1.4, iris, false); ctx.globalAlpha /= 0.35;
      oval(E.x, E.y, E.rx, E.ry * open, this.color('sclera'));
      pupila(E.x + px, E.y + 1 + py, 5, iris);
      brilhos(E.x + px, E.y + 1 + py, 2.6, 1);
    } else if (estilo === 9) {
      oval(E.x, E.y - 1, 12.5, 12.5 * open, this.color('sclera'));
      pupila(E.x + px, E.y + py, 2.8, iris);
      brilhos(E.x + px, E.y + py, 1.8, 0);
    } else {
      ctx.restore();
      return false;
    }
    ctx.restore();
    cilios();
    return true;
  }

  _mouthBase(ctx, pose) {
    const M = this.rig.face.mouth;
    // mouthClose (0..1) recolhe o sorriso de repouso (ex.: acolhimento).
    const rest = this.restJaw * (1 - Math.max(0, Math.min(1, pose.mouthClose ?? 0)));
    const jaw = Math.max(rest, Math.min(1.2, pose.jaw ?? 0));
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

/** Mistura duas cores #rrggbb (t = 0 → a, t = 1 → b). */
export function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((pa >> sh) & 255) + (((pb >> sh) & 255) - ((pa >> sh) & 255)) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}
