// Efeitos da loja de JOJOcoins no overlay: decorações no chão (rig próprio, paradas
// enquanto o JoJo pula), aura lendária, holofote, rastro de brilho e as JOJOcoins
// animadas (ganho, compra, chuva, festa) com o atlas oficial de giro (assets/moeda).
// Tudo só existe quando o estado manda (`s.loja`); sem loja, nada aqui roda nem aloca.
import { RigRenderer } from '../shared/rig-renderer.js';
import { rigDecor, poseDecor, poseAura, CANAIS_MEGALODON } from '../../core/loja-arte.js';

const QUADROS = 24;
const MAX_MOEDAS = 60;

export class LojaFx {
  constructor({ ground = 167, center = 90 } = {}) {
    this.ground = ground; this.center = center;
    this.decor = null; // RigRenderer criado só quando há decoração ligada
    this.atlas = null;
    this.moedas = [];
    this.rastro = [];
    this.ultimoEvento = 0;
    this.ultimaPos = null;
  }

  _atlasPronto() {
    if (!this.atlas) {
      this.atlas = new Image();
      this.atlas.src = new URL('../../../assets/moeda/giro-64.png', import.meta.url).href;
    }
    return this.atlas.complete && this.atlas.naturalWidth > 0;
  }

  /** Há algo animando (o loop de quadros continua enquanto true). */
  get busy() { return this.moedas.length > 0 || this.rastro.length > 0; }

  /** Canais extras da pose do JoJo (aura e forma Megalodon). */
  pose(s, now, reduzido) {
    const l = s.loja;
    if (!l) return null;
    const out = {};
    if (l.aura || (l.holofoteAte && l.holofoteAte > Date.now())) Object.assign(out, poseAura(now / 1000, reduzido));
    if (l.megalodon) Object.assign(out, CANAIS_MEGALODON, { ljAura: out.ljAura || 0 });
    return Object.keys(out).length ? out : null;
  }

  /** Novos eventos de moedas vindos do estado (cada um tem seq crescente). */
  eventos(s, now, reduzido, centro) {
    const ev = s.loja?.moedaFx;
    if (!ev || ev.seq <= this.ultimoEvento) return;
    this.ultimoEvento = ev.seq;
    if (reduzido) return; // movimento reduzido: o saldo muda sem moedas voando
    const n = ev.tipo === 'chuva' ? 40 : ev.tipo === 'festa' ? 30 : Math.max(1, Math.min(8, ev.n || 1));
    for (let i = 0; i < n && this.moedas.length < MAX_MOEDAS; i++) {
      const fase = i * 0.37;
      if (ev.tipo === 'ganho') this.moedas.push({ tipo: 'ganho', t0: now + i * 90, vida: 1400, x: centro.x + (i - n / 2) * 10, y: centro.y - 30, giro: fase });
      else if (ev.tipo === 'gasto') this.moedas.push({ tipo: 'gasto', t0: now + i * 70, vida: 900, x: centro.x, y: centro.y + 20, vx: (i % 2 ? 1 : -1) * (40 + i * 12), giro: fase });
      else this.moedas.push({ tipo: 'queda', t0: now + i * (ev.tipo === 'festa' ? 160 : 110), vida: 2600, x: centro.x + ((i * 53) % 260) - 130, y: centro.y - 230, giro: fase, chao: centro.chao });
    }
  }

  /** Decorações: atrás do JoJo, no chão da caixa (não seguem pulo nem giro). */
  desenharDecor(ctx, s, box, scale, facing, now, reduzido) {
    const ids = s.loja?.decor;
    if (!ids || !ids.length) return;
    this.decor ||= new RigRenderer(rigDecor());
    this.decor.draw(ctx, poseDecor(ids, now / 1000, reduzido), { origin: { x: box.x, y: box.y }, scale, facing, alpha: s.opacity });
  }

  /** Holofote atrás do JoJo (cone de luz) enquanto estiver ativo. */
  desenharHolofote(ctx, s, box, scale) {
    const ate = s.loja?.holofoteAte;
    if (!ate || ate < Date.now()) return;
    const cx = box.x + box.width / 2, topo = box.y - 60 * scale, chao = box.y + this.ground * scale;
    ctx.save();
    const g = ctx.createLinearGradient(cx, topo, cx, chao);
    g.addColorStop(0, 'rgba(255,248,214,0.55)'); g.addColorStop(1, 'rgba(255,236,160,0.08)');
    ctx.fillStyle = g; ctx.globalAlpha = s.opacity;
    ctx.beginPath(); ctx.moveTo(cx - 14 * scale, topo); ctx.lineTo(cx + 14 * scale, topo); ctx.lineTo(cx + 95 * scale, chao); ctx.lineTo(cx - 95 * scale, chao); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /** Rastro de brilho quando ele anda (posições do pé, somem em 900 ms). */
  rastrear(s, box, scale, now, reduzido) {
    if (!s.loja?.rastro || reduzido) { this.rastro.length = 0; return; }
    const p = { x: box.x + box.width / 2, y: box.y + (this.ground - 4) * scale };
    if (s.moving && (!this.ultimaPos || Math.hypot(p.x - this.ultimaPos.x, p.y - this.ultimaPos.y) > 10 * scale)) {
      this.rastro.push({ ...p, t0: now }); this.ultimaPos = p;
      if (this.rastro.length > 40) this.rastro.shift();
    }
    this.rastro = this.rastro.filter((r) => now - r.t0 < 900);
  }

  desenharRastro(ctx, s, scale, now) {
    if (!this.rastro.length) return;
    ctx.save();
    for (const r of this.rastro) {
      const k = 1 - (now - r.t0) / 900;
      ctx.globalAlpha = Math.max(0, k) * s.opacity;
      ctx.fillStyle = k > 0.5 ? '#fff3b0' : '#ffd84d';
      const R = (3 + 3 * k) * scale;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y - R); ctx.lineTo(r.x + R * 0.3, r.y - R * 0.3); ctx.lineTo(r.x + R, r.y); ctx.lineTo(r.x + R * 0.3, r.y + R * 0.3);
      ctx.lineTo(r.x, r.y + R); ctx.lineTo(r.x - R * 0.3, r.y + R * 0.3); ctx.lineTo(r.x - R, r.y); ctx.lineTo(r.x - R * 0.3, r.y - R * 0.3); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /** Moedas em voo: giro pelo atlas, subida do ganho, saída da compra, queda com quique. */
  desenharMoedas(ctx, s, scale, now) {
    if (!this.moedas.length || !this._atlasPronto()) return;
    const lado = Math.round(22 * scale);
    ctx.save();
    this.moedas = this.moedas.filter((m) => now - m.t0 < m.vida);
    for (const m of this.moedas) {
      const t = (now - m.t0) / m.vida;
      if (t < 0) continue;
      let x = m.x, y = m.y, a = 1, k = 1;
      if (m.tipo === 'ganho') { y -= 50 * scale * easeOut(t); a = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25; k = t < 0.15 ? t / 0.15 : 1; }
      else if (m.tipo === 'gasto') { x += m.vx * scale * t; y -= 40 * scale * Math.sin(t * Math.PI); a = 1 - t; }
      else {
        // Queda com gravidade e dois quiques amortecidos; some no fim.
        const chao = m.chao - m.y;
        const q = quique(t * 1.6);
        y += chao * q; a = t > 0.85 ? (1 - t) / 0.15 : 1;
      }
      const quadro = Math.floor((now / 40 + m.giro * QUADROS) % QUADROS);
      ctx.globalAlpha = Math.max(0, a) * s.opacity;
      const w = lado * k;
      ctx.drawImage(this.atlas, quadro * 64, 0, 64, 64, x - w / 2, y - w / 2, w, w);
    }
    ctx.restore();
  }
}

const easeOut = (t) => 1 - (1 - t) ** 3;
// Posição normalizada (0 = topo, 1 = chão) com dois quiques.
function quique(t) {
  if (t < 1) return t * t;
  if (t < 1.35) { const u = (t - 1.175) / 0.175; return 1 - 0.18 * (1 - u * u); }
  if (t < 1.55) { const u = (t - 1.45) / 0.1; return 1 - 0.06 * (1 - u * u); }
  return 1;
}
