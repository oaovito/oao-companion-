// Efeitos visuais em estilo quadrinhos: corações, Zzz, poeira, brilhos,
// marcas "!"/"?", peixe (comida) e bolinha (brincadeira). Coordenadas na caixa
// do JoJo (180x150, olhando para a direita); o chamador aplica escala/espelho.

const OUTLINE = '#1b2647';

export class Effects {
  constructor({ rng = Math.random, ground = 147, center = 90 } = {}) {
    this.rng = rng;
    this.g = ground;
    this.cx = center;
    this.particles = [];
    this.lastSpawn = {};
    this.effectStart = 0;
    this.effectName = null;
  }

  get busy() {
    return this.particles.length > 0;
  }

  setEffect(name, now, kind = null) {
    if (name !== this.effectName || kind !== this.effectKind) {
      this.effectName = name;
      this.effectKind = kind;
      this.effectStart = now;
    }
  }

  burst(kind, now, n = 6) {
    for (let i = 0; i < n; i++) this._spawn(kind, now, i / n);
  }

  update(now, flags, head) {
    const every = (key, ms) => {
      if (!this.lastSpawn[key] || now - this.lastSpawn[key] > ms) {
        this.lastSpawn[key] = now;
        return true;
      }
      return false;
    };
    if (flags.z && every('z', 1100)) this._spawn('z', now, 0, head);
    if ((flags.hearts || this.effectName === 'hearts') && every('heart', 380)) this._spawn('heart', now, 0, head);
    if (flags.dust === true && every('dust', 120)) this._spawn('dust', now);
    if (flags.sparkle === true && every('sparkle', 160)) this._spawn('sparkle', now, 0, head);
    if (flags.sweat && every('sweat', 850)) this._spawn('sweat', now, 0, head);
    if (flags.stink && every('stink', 260)) this._spawn('stink', now);
    // Comida: sangue espirrando a cada mordida.
    if (this.effectName === 'food') {
      const el = now - this.effectStart;
      if (el > 300 && el < 2200 && every('blood', 120)) this._spawn('blood', now, 0, head);
    }
    if (flags.stink && every('fly', 700) && this.particles.filter((p) => p.kind === 'fly').length < 4) this._spawn('fly', now);
    this.particles = this.particles.filter((p) => now - p.born < p.life);
  }

  _spawn(kind, now, k = 0, head = { x: 136, y: 74 }) {
    const r = this.rng;
    const base = { kind, born: now };
    switch (kind) {
      case 'z':
        this.particles.push({ ...base, life: 2600, x: head.x + 6, y: head.y - 14, vx: 10, vy: -16, size: 11 + r() * 5 });
        break;
      case 'heart':
        this.particles.push({ ...base, life: 1300, x: head.x - 10 + r() * 30, y: head.y - 16, vx: -8 + r() * 16, vy: -38, size: 8 + r() * 4 });
        break;
      case 'dust':
        this.particles.push({ ...base, life: 450, x: this.cx - 45 + r() * 20, y: this.g - 7, vx: -40 - r() * 30, vy: -10, size: 4 + r() * 3 });
        break;
      case 'dustBurst':
        this.particles.push({ ...base, kind: 'dust', life: 550, x: this.cx + (k - 0.5) * 110, y: this.g - 5, vx: (k - 0.5) * 120, vy: -14, size: 5 + r() * 3 });
        break;
      case 'sweat':
        this.particles.push({ ...base, life: 900, x: head.x + (r() < 0.5 ? -46 : 46) + r() * 6, y: head.y + 24, vx: 0, vy: 30, size: 3 + r() * 2 });
        break;
      case 'powderPuff':
        this.particles.push({ ...base, kind: 'puff', life: 700, x: head.x + (k - 0.5) * 30, y: head.y + 44, vx: (k - 0.5) * 50, vy: -18, size: 3 + r() * 3 });
        break;
      case 'blood':
        this.particles.push({ ...base, life: 900, x: (this.mouth ? this.mouth.x : head.x) + 4 + r() * 22, y: (this.mouth ? this.mouth.y : head.y + 20) + r() * 6, vx: -20 + r() * 40, vy: 20 + r() * 30, size: 2 + r() * 2.5, grav: 1 });
        break;
      case 'stink':
        this.particles.push({ ...base, life: 1400, x: this.cx + 20 + r() * 50, y: this.g - 10 - r() * 30, vx: -6 + r() * 12, vy: -26, size: 10 + r() * 6 });
        break;
      case 'fly':
        this.particles.push({ ...base, life: 3200, x: this.cx + 30 + r() * 30, y: this.g - 40 - r() * 40, vx: 0, vy: 0, size: 3, phase: r() * 6.28 });
        break;
      case 'sparkle':
        this.particles.push({ ...base, life: 700, x: this.cx - 70 + r() * 140, y: 20 + r() * (this.g - 60), vx: 0, vy: -6, size: 4 + r() * 4 });
        break;
      default:
    }
  }

  /** Desenha partículas e objetos (comida, bola, marca) no sistema da caixa. */
  draw(ctx, now, { mark = null, head = { x: 136, y: 74 }, mouth = null, facingSign = 1 }) {
    for (const p of this.particles) {
      const t = (now - p.born) / p.life;
      const x = p.x + p.vx * t;
      const y = p.y + p.vy * t * (p.life / 1000);
      const a = t < 0.15 ? t / 0.15 : 1 - Math.max(0, (t - 0.6) / 0.4);
      ctx.save();
      ctx.globalAlpha *= Math.max(0, a);
      if (p.kind === 'z') this._letter(ctx, 'Z', x + Math.sin(t * 6) * 4, y, p.size * (0.7 + t * 0.6), facingSign);
      else if (p.kind === 'heart') this._heart(ctx, x + Math.sin(t * 8) * 3, y, p.size);
      else if (p.kind === 'dust') this._puff(ctx, x, y, p.size * (1 + t));
      else if (p.kind === 'sparkle') this._star(ctx, x, y, p.size * (1 - Math.abs(t - 0.5)));
      else if (p.kind === 'sweat') this._drop(ctx, x, y, p.size);
      else if (p.kind === 'blood') this._blood(ctx, x, y + (p.grav ? 60 * t * t : 0), p.size);
      else if (p.kind === 'stink') this._stink(ctx, x, y, p.size, t);
      else if (p.kind === 'fly') this._fly(ctx, p.x + Math.cos(p.phase + t * 18) * 18, p.y + Math.sin(p.phase + t * 25) * 10, now);
      else if (p.kind === 'puff') this._whitePuff(ctx, x, y, p.size * (1 + t));
      ctx.restore();
    }
    const el = now - this.effectStart;
    if (mouth) this.mouth = mouth;
    if (this.effectName === 'food') this._food(ctx, mouth || { x: head.x + 14, y: head.y + 20 }, el, this.effectKind || 'peixe');
    if (this.effectName === 'ball') this._ball(ctx, el);
    if (mark) this._mark(ctx, mark, head, facingSign);
  }

  _letter(ctx, ch, x, y, size, facingSign) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facingSign, 1); // mantém o texto legível mesmo espelhado
    ctx.font = `900 ${size}px "Comic Sans MS", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTLINE;
    ctx.fillStyle = '#ffffff';
    ctx.strokeText(ch, 0, 0);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }

  _heart(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.4, y - s * 1.1, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.4, y - s * 1.1, x + s, y - s * 0.4, x, y + s * 0.35);
    ctx.fillStyle = '#ff5c86';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }

  _puff(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(200, 208, 222, 0.9)';
    ctx.strokeStyle = 'rgba(27, 38, 71, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Linhas onduladas verdes de mau cheiro.
  _stink(ctx, x, y, s, t) {
    ctx.strokeStyle = 'rgba(110, 160, 40, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const yy = y - (i / 8) * s * 1.6;
      const xx = x + Math.sin(i * 1.2 + t * 8) * s * 0.3;
      if (i === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }

  _fly(ctx, x, y, now) {
    ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
    const flap = Math.sin(now / 20) * 2;
    ctx.beginPath();
    ctx.ellipse(x - 2, y - 2 - flap, 2.6, 1.4, -0.5, 0, Math.PI * 2);
    ctx.ellipse(x + 2, y - 2 - flap, 2.6, 1.4, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  _drop(ctx, x, y, s) {
    ctx.fillStyle = '#9fd3ff';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.8);
    ctx.quadraticCurveTo(x + s, y, x, y + s);
    ctx.quadraticCurveTo(x - s, y, x, y - s * 1.8);
    ctx.fill();
    ctx.stroke();
  }

  _whitePuff(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = 'rgba(27, 38, 71, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  _star(ctx, x, y, s) {
    if (s <= 0.2) return;
    ctx.fillStyle = '#ffd84a';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? s : s * 0.4;
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  _blood(ctx, x, y, s) {
    ctx.fillStyle = '#b3121f';
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.6);
    ctx.quadraticCurveTo(x + s, y, x, y + s);
    ctx.quadraticCurveTo(x - s, y, x, y - s * 1.6);
    ctx.fill();
  }

  /**
   * Comida de tubarão: chega voando, é mordida (encolhe, sangra), sobra um
   * osso caindo e no fim vem o arroto. kind: peixe | foca | lula | tartaruga |
   * pinguim | humano.
   */
  _food(ctx, mouth, el, kind) {
    const life = 2300;
    if (el < life) {
      const arrive = Math.min(1, el / 350);
      const bites = Math.min(5, Math.floor(Math.max(0, el - 300) / 380));
      const size = 1 - bites * 0.17;
      const x = mouth.x + 16 + (1 - arrive) * 34;
      const y = mouth.y + 2 - (1 - arrive) * 44;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(size, size);
      ctx.rotate(-0.25);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      const draw = { peixe: this._fishShape, foca: this._seal, lula: this._squid, tartaruga: this._turtle, pinguim: this._penguin, humano: this._leg }[kind] || this._fishShape;
      draw.call(this, ctx);
      // Marcas de mordida ensanguentadas.
      ctx.fillStyle = '#b3121f';
      for (let i = 0; i < bites; i++) {
        ctx.beginPath();
        ctx.arc(-12 + i * 3, -4 + (i % 2) * 6, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // Osso (ou tênis) caindo depois de comer.
    if (el > 2000 && el < 3300) {
      const t = (el - 2000) / 1300;
      ctx.save();
      ctx.translate(mouth.x + 10 + t * 10, mouth.y + 10 + t * t * 70);
      ctx.rotate(t * 5);
      if (kind === 'humano') this._sneaker(ctx);
      else this._bone(ctx);
      ctx.restore();
    }
    // Arroto.
    if (el > 2300 && el < 3400) {
      const t = (el - 2300) / 1100;
      ctx.save();
      ctx.globalAlpha *= 1 - Math.max(0, t - 0.7) / 0.3;
      ctx.fillStyle = 'rgba(140, 180, 60, 0.75)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(mouth.x + 14 + i * 9 + t * 10, mouth.y - 6 - i * 4 - t * 12, 6 + i * 1.5 + t * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      this._letter(ctx, 'BUUURP!', mouth.x + 30, mouth.y - 22 - t * 10, 15 + t * 4, 1);
      ctx.restore();
    }
  }

  _fishShape(ctx) {
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
    ctx.moveTo(10, 0);
    ctx.lineTo(19, -7);
    ctx.lineTo(19, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    this._eyeDot(ctx, -6, -2);
  }

  _seal(ctx) {
    ctx.fillStyle = '#8a8f99';
    ctx.beginPath();
    ctx.ellipse(2, 2, 16, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-13, -3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, 4);
    ctx.lineTo(22, 0);
    ctx.lineTo(22, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    this._eyeDot(ctx, -15, -5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-19, -1);
    ctx.lineTo(-26, -3);
    ctx.moveTo(-19, 1);
    ctx.lineTo(-26, 2);
    ctx.stroke();
  }

  _squid(ctx) {
    ctx.fillStyle = '#d97aa8';
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(4, -9);
    ctx.lineTo(4, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#d97aa8';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(4, i * 3);
      ctx.quadraticCurveTo(12, i * 4 + 4, 20, i * 5);
      ctx.stroke();
    }
    ctx.strokeStyle = OUTLINE;
    this._eyeDot(ctx, -2, -2);
  }

  _turtle(ctx) {
    ctx.fillStyle = '#7cb342';
    ctx.beginPath();
    ctx.arc(-15, 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4e7d2a';
    ctx.beginPath();
    ctx.ellipse(2, 0, 14, 10, 0, Math.PI, 0);
    ctx.lineTo(16, 4);
    ctx.lineTo(-12, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(2, -9);
    ctx.lineTo(10, -6);
    ctx.moveTo(2, -9);
    ctx.lineTo(2, 4);
    ctx.stroke();
    this._eyeDot(ctx, -17, 1);
  }

  _penguin(ctx) {
    ctx.fillStyle = '#1d1d24';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 15, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(2, 3, 5, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.moveTo(-4, -11);
    ctx.lineTo(-11, -8);
    ctx.lineTo(-4, -7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2, -11, 2, 0, Math.PI * 2);
    ctx.fill();
    this._eyeDot(ctx, -2, -11);
  }

  // Perna humana: calça jeans, tênis e o toco ensanguentado com o osso.
  _leg(ctx) {
    ctx.fillStyle = '#3f6db5';
    ctx.beginPath();
    ctx.rect(-6, -16, 12, 24);
    ctx.fill();
    ctx.stroke();
    this._sneaker(ctx, 0, 12);
    ctx.fillStyle = '#b3121f';
    ctx.beginPath();
    ctx.ellipse(0, -16, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f4f0e2';
    ctx.beginPath();
    ctx.arc(0, -16, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b3121f';
    ctx.fillRect(-5, -14, 2, 6);
    ctx.fillRect(2, -14, 2, 9);
  }

  _sneaker(ctx, x = 0, y = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.lineTo(6, -4);
    ctx.lineTo(14, 2);
    ctx.lineTo(14, 5);
    ctx.lineTo(-7, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e53935';
    ctx.fillRect(-7, 2, 21, 3);
    ctx.restore();
  }

  _bone(ctx) {
    ctx.fillStyle = '#f4f0e2';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.rect(-8, -2, 16, 4);
    ctx.arc(-9, -2, 3, 0, Math.PI * 2);
    ctx.arc(-9, 2, 3, 0, Math.PI * 2);
    ctx.arc(9, -2, 3, 0, Math.PI * 2);
    ctx.arc(9, 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  _eyeDot(ctx, x, y) {
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  _fish(ctx, head, el) {
    const life = 2600;
    if (el > life) return;
    // O peixe chega voando e diminui a cada mordida.
    const arrive = Math.min(1, el / 350);
    const bites = Math.min(5, Math.floor(Math.max(0, el - 300) / 380));
    const size = 1 - bites * 0.18;
    if (size <= 0.1) return;
    const x = head.x + 10 + (1 - arrive) * 30;
    const y = head.y + 4 - (1 - arrive) * 40;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    ctx.rotate(-0.3);
    ctx.fillStyle = '#ffb347';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
    ctx.moveTo(10, 0);
    ctx.lineTo(19, -7);
    ctx.lineTo(19, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.arc(-6, -2, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _ball(ctx, el) {
    const life = 3400;
    if (el > life) return;
    const t = el / life;
    const x = this.cx + 60 + Math.sin(t * Math.PI * 3) * 14;
    const bounce = Math.abs(Math.sin(t * Math.PI * 5));
    const y = this.g - 15 - bounce * 46;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 12);
    ctx.fillStyle = '#ff6b6b';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 8, -0.6, 0.9);
    ctx.stroke();
    ctx.restore();
  }

  _mark(ctx, mark, head, facingSign) {
    this._letter(ctx, mark, head.x - 6, head.y - 30, 22, facingSign);
  }
}
