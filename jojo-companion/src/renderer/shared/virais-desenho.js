// Desenho extra das animações virais (0.47.4): cópias do próprio JoJo (O Conselho, Coffin
// Dance, Horny Jail, o reflexo do Patrick Bateman) e o trecho em pixel art do Nyan Cat.
// Só roda enquanto a animação toca; nada fica guardado depois.
import { clonesDoViral, pixelDoViral } from '../../core/virais.js';

// A cópia herda o visual vestido, mas não os adereços nem o movimento do JoJo principal.
function poseDaCopia(pose, extra) {
  const p = { ...pose };
  for (const k of Object.keys(p)) if (k.startsWith('vr') || k.startsWith('st')) p[k] = 0;
  Object.assign(p, { rootX: 0, rootY: 0, rootRot: 0, squashX: 1, squashY: 1, scale: 1, alpha: 1, heartEyes: 0, eyeX: 0, tongue: 0, cheeks: 0 });
  return Object.assign(p, extra);
}

/** Desenha as cópias de trás (`atras`) ou da frente do JoJo principal. */
export function desenharClones(rig, ctx, pose, nome, t, { origin, scale = 1, facing = 1, alpha = 1 }, atras) {
  const lista = clonesDoViral(nome, t).filter((c) => !!c.atras === atras);
  if (!lista.length) return 0;
  const fs = facing >= 0 ? 1 : -1;
  const W = rig.box.width;
  const g = rig.ground;
  for (const c of lista) {
    const k = c.k;
    rig.draw(ctx, poseDaCopia(pose, c.pose), {
      origin: { x: origin.x + (W / 2 * (1 - k) + c.dx * fs) * scale, y: origin.y + (g * (1 - k) + (c.dy || 0)) * scale },
      scale: scale * k, facing: facing * (c.flip || 1), alpha: alpha * c.alpha,
    });
  }
  return lista.length;
}

let tela = null;
/** Desenha em baixa resolução e amplia sem suavizar (pixel art de verdade, sem imagem pronta). */
export function desenharPixelado(ctx, desenhar, k = 4) {
  const c = ctx.canvas;
  tela ??= typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1) : document.createElement('canvas');
  const w = Math.max(1, Math.ceil(c.width / k));
  const h = Math.max(1, Math.ceil(c.height / k));
  if (tela.width !== w) tela.width = w;
  if (tela.height !== h) tela.height = h;
  const o = tela.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(0, 0, w, h);
  const m = ctx.getTransform();
  o.setTransform(m.a / k, m.b / k, m.c / k, m.d / k, m.e / k, m.f / k);
  desenhar(o);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tela, 0, 0, w, h, 0, 0, w * k, h * k);
  ctx.restore();
}

/** O JoJo com os extras do viral (cópias atrás, ele, cópias na frente). */
export function desenharComVirais(rig, ctx, pose, sample, opts) {
  const nome = sample?.name;
  const t = sample?.t ?? 0;
  desenharClones(rig, ctx, pose, nome, t, opts, true);
  if (pixelDoViral(nome, t)) desenharPixelado(ctx, (o) => rig.draw(o, pose, opts));
  else rig.draw(ctx, pose, opts);
  desenharClones(rig, ctx, pose, nome, t, opts, false);
}
