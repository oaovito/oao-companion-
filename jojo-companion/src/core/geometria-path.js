// Geometria aproximada dos caminhos SVG do rig (sem canvas): divide em subcaminhos, acha a caixa
// de cada um e achata as curvas num polígono para testar se um ponto está dentro. Serve para
// prender roupas nas pernas (pernas.js) e para as auditorias de desenho rodarem no Node.

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

/** Comandos do caminho: [{c, v: números}] (um comando por grupo de argumentos). */
export function comandos(d) {
  const out = [];
  const re = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
  let m;
  while ((m = re.exec(String(d || '')))) {
    const c = m[1];
    const nums = (m[2].match(NUM) || []).map(Number);
    const n = ARGS[c.toUpperCase()];
    if (!n) { out.push({ c, v: [] }); continue; }
    for (let i = 0; i + n <= nums.length; i += n) {
      // Depois do primeiro par, M vira L (regra do SVG).
      const cc = i > 0 && c === 'M' ? 'L' : i > 0 && c === 'm' ? 'l' : c;
      out.push({ c: cc, v: nums.slice(i, i + n) });
    }
  }
  return out;
}

const r1 = (n) => Math.round(n * 100) / 100;

/** Polígonos (um por subcaminho) com as curvas achatadas. */
export function poligonos(d, passos = 8) {
  const polys = [];
  let cur = null;
  let x = 0, y = 0, sx = 0, sy = 0;
  for (const { c, v } of comandos(d)) {
    const rel = c === c.toLowerCase();
    const C = c.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'M') { x = ox + v[0]; y = oy + v[1]; sx = x; sy = y; cur = [[x, y]]; polys.push(cur); continue; }
    if (!cur) { cur = [[x, y]]; polys.push(cur); }
    if (C === 'L' || C === 'T') { x = ox + v[0]; y = oy + v[1]; cur.push([x, y]); }
    else if (C === 'H') { x = (rel ? x : 0) + v[0]; cur.push([x, y]); }
    else if (C === 'V') { y = (rel ? y : 0) + v[0]; cur.push([x, y]); }
    else if (C === 'C' || C === 'S' || C === 'Q') {
      const pts = C === 'C' ? [[ox + v[0], oy + v[1]], [ox + v[2], oy + v[3]], [ox + v[4], oy + v[5]]]
        : C === 'S' ? [[x, y], [ox + v[0], oy + v[1]], [ox + v[2], oy + v[3]]]
          : [[ox + v[0], oy + v[1]], [ox + v[0], oy + v[1]], [ox + v[2], oy + v[3]]];
      const [p1, p2, p3] = pts;
      for (let i = 1; i <= passos; i++) {
        const t = i / passos, u = 1 - t;
        cur.push([u * u * u * x + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * y + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
      }
      [x, y] = p3;
    } else if (C === 'A') {
      // Arcos dos círculos/elipses do projeto: meia elipse entre os dois pontos.
      const ex = ox + v[5], ey = oy + v[6];
      const cx = (x + ex) / 2, cy = (y + ey) / 2;
      const rx = Math.max(Math.abs(v[0]), Math.hypot(ex - x, ey - y) / 2), ry = Math.abs(v[1]);
      const a0 = Math.atan2(y - cy, x - cx);
      const sweep = v[4] ? 1 : -1;
      for (let i = 1; i <= passos; i++) {
        const a = a0 + sweep * Math.PI * (i / passos);
        cur.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
      }
      x = ex; y = ey;
    } else if (C === 'Z') { x = sx; y = sy; cur = null; }
  }
  return polys.filter((p) => p.length >= 2).map((p) => p.map(([a, b]) => [r1(a), r1(b)]));
}

export function caixa(pts) {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const [x, y] of pts) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
  return { l, t, r, b, w: r - l, h: b - t, cx: (l + r) / 2, cy: (t + b) / 2 };
}

/** Caixa do caminho inteiro (null se vazio). */
export function caixaDoCaminho(d) {
  const ps = poligonos(d).flat();
  return ps.length ? caixa(ps) : null;
}

/** Ponto dentro do caminho (regra não-zero aproximada por paridade, como os desenhos do projeto). */
export function dentro(d, px, py) {
  let n = 0;
  for (const poly of poligonos(d)) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) n++;
    }
  }
  return n % 2 === 1;
}

/** Divide o caminho nos subcaminhos (cada um começa num M). */
export function subcaminhos(d) {
  return String(d || '').split(/(?=[Mm])/).map((s) => s.trim()).filter((s) => /^[Mm]/.test(s));
}
