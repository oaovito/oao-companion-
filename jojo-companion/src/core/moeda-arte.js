// JOJOcoins: desenho oficial da moeda (referência do João de 24/11/2026,
// `docs/ARTE_QUALIDADE.md`). Um único desenho mestre vetorial (SVG) do qual saem
// todas as representações: frente, perspectiva (giro em torno do eixo vertical),
// vista de cima/baixo (inclinação), pilhas e montes. Cada tamanho tem um nível de
// detalhe próprio (adaptação óptica, não só redução):
// - 'mestre' (≥ 64 px): serrilha fina, aros duplos, tubarão com dentes, guelras,
//   olho e sobrancelha, louros com folhas, ornamento inferior;
// - 'medio' (32–48 px): serrilha grossa, um aro, tubarão com 3+2 dentes e olho,
//   louros com 4 folhas, ornamento só com o losango;
// - 'micro' (12–24 px): sem serrilha, aro escuro grosso, tubarão em silhueta com
//   a mordida aberta (o traço essencial), contraste reforçado, sem louros em ≤ 16 px.
// Puro (só gera texto SVG): usado pela Central, pelos scripts de assets e pelos testes.

/** Paleta canônica do ouro (não variar entre representações). */
export const OURO = Object.freeze({
  luz: '#fff3b0',        // ouro iluminado
  claro: '#ffd84d',      // ouro claro
  medio: '#f2b51e',      // ouro intermediário
  profundo: '#c98a0b',   // ouro profundo
  reflexo: '#fffbe6',    // reflexo metálico
  relevo: '#9a6206',     // sombra de relevo
  borda: '#6e4304',      // sombra de borda
  contorno: '#4a2c02',   // traço mais escuro (microescala)
});

const f = (n) => Math.round(n * 100) / 100;

// ------------------------------------------------------------------ geometria do tubarão (espaço 512)

// Corpo em C: focinho à direita em cima, dorsal para a esquerda, costas à esquerda,
// braço de baixo indo para a direita até a cauda bifurcada. Contorno fechado.
export const TUBARAO = [
  'M420,190',
  'C400,165 360,150 320,152', // topo da cabeça
  'C312,150 304,154 300,158',
  'C285,140 260,112 226,98', // borda de ataque da dorsal até a ponta
  'C250,122 258,150 264,178', // borda de fuga da dorsal
  'C220,200 192,245 192,290', // costas
  'C192,345 240,390 300,392', // fundo do C
  'C320,392 338,388 350,382', // base da cauda (embaixo)
  'L412,414', // lobo de baixo
  'C394,394 380,374 374,358', // reentrância da cauda
  'L400,300', // lobo de cima
  'C386,328 366,344 344,348', // pedúnculo (em cima)
  'C300,352 262,330 258,298', // dentro do C
  'C256,268 272,248 300,244', // barriga subindo até a garganta
  'C330,246 370,250 404,242', // mandíbula de baixo até a ponta
  'L352,214', // canto da boca
  'L420,200', // mandíbula de cima (por dentro)
  'C423,197 423,193 420,190',
  'Z',
].join(' ');

// Boca aberta (o interior, mais escuro) e os dentes.
const BOCA = 'M404,242 L352,214 L420,200 C414,214 410,230 404,242 Z';
const ao = (x0, y0, x1, y1, t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
const DENTES_CIMA = [0.2, 0.42, 0.64, 0.86].map((t) => { const [x, y] = ao(352, 214, 420, 200, t); return `M${f(x - 6.5)},${f(y + 1.3)} L${f(x + 6.5)},${f(y - 1.3)} L${f(x + 1)},${f(y + 15)} Z`; }).join(' ');
const DENTES_BAIXO = [0.3, 0.55, 0.8].map((t) => { const [x, y] = ao(352, 214, 404, 242, t); return `M${f(x - 6.5)},${f(y - 3.5)} L${f(x + 6.5)},${f(y + 3.5)} L${f(x - 3)},${f(y - 14)} Z`; }).join(' ');
// Nadadeira peitoral (para a esquerda, embaixo) e pélvica.
export const PEITORAL = 'M262,292 C238,298 200,316 166,344 C206,338 238,328 272,320 Z';
export const PELVICA = 'M332,390 C330,402 324,412 312,420 C314,406 312,398 306,392 Z';
// Guelras, olho, sobrancelha e a linha da barriga (detalhes cunhados).
const GUELRAS = [0, 1, 2].map((i) => `M${306 + i * 12},${190 + i * 1.5} C${299 + i * 12},${206 + i * 1.5} ${301 + i * 12},${222 + i * 1.5} ${309 + i * 12},${234 + i * 1.5}`).join(' ');
export const OLHO = 'M332,182 C338,174 352,172 360,180 C352,188 340,188 332,182 Z';
const SOBRANCELHA = 'M324,166 L368,174 L366,180 L326,173 Z';
const BARRIGA = 'M300,250 C278,254 268,274 270,298 C274,322 300,338 342,340';

// Louros: duas hastes em arco (esquerda e direita espelhadas) com folhas ao longo.
function louro(lado, folhas, escala = 1) {
  const cx = 256, cy = 256, r = 166;
  const a0 = (lado < 0 ? 118 : 62) * Math.PI / 180;
  const a1 = (lado < 0 ? 206 : -26) * Math.PI / 180;
  const pts = [];
  for (let i = 0; i < folhas; i++) {
    const t = (i + 0.5) / folhas;
    const a = a0 + (a1 - a0) * t;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), ang: a });
  }
  const haste = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    haste.push(`${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`);
  }
  const folhasPath = pts.map(({ x, y, ang }, i) => {
    // Folha ovalada presa na haste, apontando no sentido do crescimento (para cima),
    // alternando para fora e para dentro do arco.
    const cresce = ang + (lado < 0 ? 1 : -1) * Math.PI / 2;
    const da = cresce + (i % 2 ? 1 : -1) * 0.62 * (lado < 0 ? 1 : -1);
    const L = 40 * escala, W = 12.5 * escala;
    const tx = x + Math.cos(da) * L, ty = y + Math.sin(da) * L;
    const nx = -Math.sin(da) * W, ny = Math.cos(da) * W;
    const mx = (x + tx) / 2, my = (y + ty) / 2;
    return `M${f(x)},${f(y)} Q${f(mx + nx)},${f(my + ny)} ${f(tx)},${f(ty)} Q${f(mx - nx)},${f(my - ny)} ${f(x)},${f(y)} Z`;
  }).join(' ');
  return { haste: `M${haste.join(' L')}`, folhas: folhasPath };
}

// Ornamento inferior: losango de quatro pontas entre dois traços.
const LOSANGO = 'M256,404 C260,414 264,418 274,420 C264,422 260,426 256,436 C252,426 248,422 238,420 C248,418 252,414 256,404 Z';
const TRACOS = 'M168,416 L226,420 L226,424 L168,420 Z M344,416 L286,420 L286,424 L344,420 Z';

function serrilha(rFora, rDentro, n, largura) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const da = (largura / rFora) / 2;
    const p = (r, ang) => `${f(256 + r * Math.cos(ang))},${f(256 + r * Math.sin(ang))}`;
    out.push(`M${p(rDentro, a - da)} L${p(rFora, a - da)} L${p(rFora, a + da)} L${p(rDentro, a + da)} Z`);
  }
  return out.join(' ');
}

// ------------------------------------------------------------------ face (espaço 512, centro 256)

/** Nível de detalhe pelo tamanho final em pixels. */
export function nivelDetalhe(px) {
  return px >= 64 ? 'mestre' : px >= 32 ? 'medio' : 'micro';
}

let _seq = 0;
/**
 * Conteúdo SVG da FACE da moeda (sem <svg>), no espaço 512 com centro 256.
 * `id` isola os gradientes quando várias moedas dividem um documento.
 */
export function faceMoeda({ lod = 'mestre', id = `jc${++_seq}`, px = 512 } = {}) {
  const g = (n) => `${id}${n}`;
  const micro = lod === 'micro';
  const medio = lod === 'medio';
  const defs = `<defs>
<radialGradient id="${g('campo')}" cx="0.4" cy="0.32" r="0.8"><stop offset="0" stop-color="${OURO.claro}"/><stop offset="0.45" stop-color="${OURO.medio}"/><stop offset="1" stop-color="${OURO.profundo}"/></radialGradient>
<linearGradient id="${g('aro')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${OURO.luz}"/><stop offset="0.45" stop-color="${OURO.medio}"/><stop offset="1" stop-color="${OURO.relevo}"/></linearGradient>
<linearGradient id="${g('aroInv')}" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${OURO.claro}"/><stop offset="0.5" stop-color="${OURO.medio}"/><stop offset="1" stop-color="${OURO.relevo}"/></linearGradient>
<linearGradient id="${g('tub')}" x1="0.25" y1="0" x2="0.75" y2="1"><stop offset="0" stop-color="${OURO.reflexo}"/><stop offset="0.3" stop-color="${OURO.luz}"/><stop offset="0.7" stop-color="${OURO.claro}"/><stop offset="1" stop-color="${OURO.medio}"/></linearGradient>
<linearGradient id="${g('brilho')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="${OURO.reflexo}" stop-opacity="${micro ? 0 : 0.55}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>`;
  const parts = [defs];
  // Disco e borda externa.
  parts.push(`<circle cx="256" cy="256" r="254" fill="${OURO.borda}"/>`);
  parts.push(`<circle cx="256" cy="256" r="248" fill="url(#${g('aro')})"/>`);
  if (micro) {
    // Aro grosso e escuro: a circularidade e o contraste vêm daqui em 12–24 px.
    parts.push(`<circle cx="256" cy="256" r="206" fill="${OURO.relevo}"/>`);
    parts.push(`<circle cx="256" cy="256" r="196" fill="url(#${g('campo')})"/>`);
  } else {
    // Serrilha (borda cunhada) entre dois aros, depois o aro interno e o campo.
    parts.push(`<circle cx="256" cy="256" r="236" fill="${OURO.profundo}"/>`);
    parts.push(`<path d="${serrilha(234, 212, medio ? 56 : 120, medio ? 6.5 : 4.2)}" fill="${OURO.claro}"/>`);
    parts.push(`<circle cx="256" cy="256" r="210" fill="${OURO.relevo}"/>`);
    parts.push(`<circle cx="256" cy="256" r="204" fill="url(#${g('aroInv')})"/>`);
    parts.push(`<circle cx="256" cy="256" r="${medio ? 194 : 196}" fill="url(#${g('campo')})"/>`);
    if (!medio) parts.push(`<circle cx="256" cy="256" r="188" fill="none" stroke="${OURO.profundo}" stroke-width="2" opacity="0.55"/>`);
  }
  // Louros (mestre: 9 folhas; médio: 4; micro: só ≥ 20 px, como arco simples).
  const folhas = lod === 'mestre' ? 9 : medio ? 5 : 0;
  for (const lado of [-1, 1]) {
    if (folhas) {
      const l = louro(lado, folhas, medio ? 1.35 : 1);
      parts.push(`<path d="${l.haste}" fill="none" stroke="${OURO.relevo}" stroke-width="${medio ? 9 : 6}" stroke-linecap="round" transform="translate(3,4)" opacity="0.7"/>`);
      parts.push(`<path d="${l.folhas}" fill="${OURO.relevo}" transform="translate(3,4)" opacity="0.75"/>`);
      parts.push(`<path d="${l.haste}" fill="none" stroke="${OURO.medio}" stroke-width="${medio ? 7 : 5}" stroke-linecap="round"/>`);
      parts.push(`<path d="${l.folhas}" fill="url(#${g('tub')})" stroke="${OURO.relevo}" stroke-width="${medio ? 3 : 2.4}"/>`);
    } else if (micro && px >= 20) {
      const l = louro(lado, 1);
      parts.push(`<path d="${l.haste}" fill="none" stroke="${OURO.relevo}" stroke-width="16" stroke-linecap="round" opacity="0.85"/>`);
    }
  }
  // Ornamento inferior.
  if (!micro) {
    if (!medio) parts.push(`<path d="${TRACOS}" fill="${OURO.relevo}" transform="translate(2,3)" opacity="0.7"/><path d="${TRACOS}" fill="${OURO.claro}"/>`);
    parts.push(`<path d="${LOSANGO}" fill="${OURO.relevo}" transform="translate(2,3)" opacity="0.75"/><path d="${LOSANGO}" fill="url(#${g('tub')})" stroke="${OURO.profundo}" stroke-width="${medio ? 4 : 2}"/>`);
  }
  // Tubarão cunhado: sombra do relevo (embaixo à direita), luz (em cima à esquerda) e o corpo.
  const esc = micro ? 'translate(256,258) scale(1.2) translate(-294,-258)' : medio ? 'translate(256,258) scale(1.06) translate(-294,-258)' : 'translate(256,250) scale(0.96) translate(-294,-258)';
  const tub = [];
  tub.push(`<path d="${TUBARAO} ${PEITORAL} ${PELVICA}" fill="${micro ? OURO.contorno : OURO.relevo}" transform="translate(${micro ? 7 : 8},${micro ? 8 : 10})" opacity="${micro ? 0.95 : 0.9}"/>`);
  if (!micro) tub.push(`<path d="${TUBARAO} ${PEITORAL}" fill="${OURO.reflexo}" transform="translate(-3,-3)" opacity="0.6"/>`);
  tub.push(`<path d="${TUBARAO}" fill="url(#${g('tub')})" stroke="${micro ? OURO.contorno : OURO.relevo}" stroke-width="${micro ? 9 : medio ? 5 : 3.5}" stroke-linejoin="round"/>`);
  tub.push(`<path d="${PEITORAL}" fill="url(#${g('tub')})" stroke="${micro ? OURO.contorno : OURO.relevo}" stroke-width="${micro ? 8 : medio ? 5 : 3.5}" stroke-linejoin="round"/>`);
  if (!micro) tub.push(`<path d="${PELVICA}" fill="url(#${g('tub')})" stroke="${OURO.profundo}" stroke-width="${medio ? 3 : 2}"/>`);
  // Boca: a mordida aberta é o traço essencial em qualquer tamanho.
  tub.push(`<path d="${BOCA}" fill="${micro ? OURO.contorno : OURO.borda}"/>`);
  if (!micro) {
    tub.push(`<path d="${DENTES_CIMA} ${DENTES_BAIXO}" fill="${OURO.reflexo}" stroke="${OURO.profundo}" stroke-width="${medio ? 1.4 : 0.9}"/>`);
    tub.push(`<path d="${OLHO}" fill="${OURO.borda}"/><path d="${SOBRANCELHA}" fill="${OURO.relevo}"/>`);
    if (!medio) {
      tub.push(`<path d="${GUELRAS}" fill="none" stroke="${OURO.relevo}" stroke-width="4" stroke-linecap="round"/>`);
      tub.push(`<path d="${BARRIGA}" fill="none" stroke="${OURO.medio}" stroke-width="5" stroke-linecap="round" opacity="0.55"/>`);
      tub.push('<circle cx="349" cy="179" r="2.6" fill="#fff8dc"/>');
    }
  } else if (px >= 20) {
    tub.push(`<path d="${OLHO}" fill="${OURO.contorno}" transform="translate(346,180) scale(1.6) translate(-346,-180)"/>`);
  }
  parts.push(`<g transform="${esc}">${tub.join('')}</g>`);
  // Reflexo metálico diagonal (não cobre o relevo; some em microescala).
  if (!micro) parts.push(`<path d="M150,50 L196,40 L404,452 L358,466 Z" fill="url(#${g('brilho')})" opacity="0.18" clip-path="circle(248px at 256px 256px)"/>`);
  return parts.join('');
}

// ------------------------------------------------------------------ moeda em 3D (pré-processada)

/**
 * Moeda inteira com espessura. `giro` (graus) gira em torno do eixo vertical (0 = de
 * frente, 90 = de lado); `inclinacao` (graus) deita a moeda para trás (90 = vista de
 * cima, -90 = de baixo). A face é a mesma do mestre; a lateral é serrilhada.
 * Devolve só os elementos (para compor pilhas); `svgMoeda` embrulha num <svg>.
 */
export function moeda3d({ giro = 0, inclinacao = 0, lod = 'mestre', px = 512, cx = 256, cy = 256, r = 1, espessura = 0.085, id = `jc${++_seq}` } = {}) {
  const rad = (d) => d * Math.PI / 180;
  const sx = Math.cos(rad(giro)), sy = Math.cos(rad(inclinacao));
  const R = 256 * r;
  const ax = Math.abs(sx), ay = Math.abs(sy);
  // Deslocamento da face de trás (a espessura vista em perspectiva).
  const dx = Math.sin(rad(giro)) * espessura * 512 * r;
  const dy = Math.sin(rad(inclinacao)) * espessura * 512 * r;
  const out = [];
  const lat = `${id}lat`;
  out.push(`<defs><linearGradient id="${lat}" x1="0" y1="0" x2="${ax < ay ? 1 : 0}" y2="${ax < ay ? 0 : 1}"><stop offset="0" stop-color="${OURO.profundo}"/><stop offset="0.35" stop-color="${OURO.claro}"/><stop offset="0.65" stop-color="${OURO.medio}"/><stop offset="1" stop-color="${OURO.borda}"/></linearGradient></defs>`);
  if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) {
    // Lateral: casco entre as duas elipses (face e verso), com as ranhuras da serrilha.
    const passos = 64;
    const pts = [];
    for (let i = 0; i <= passos; i++) {
      const a = (i / passos) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * R * ax, cy + Math.sin(a) * R * ay]);
    }
    const casco = [];
    for (let i = 0; i < passos; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      casco.push(`M${f(x0)},${f(y0)} L${f(x1)},${f(y1)} L${f(x1 + dx)},${f(y1 + dy)} L${f(x0 + dx)},${f(y0 + dy)} Z`);
    }
    out.push(`<ellipse cx="${f(cx + dx)}" cy="${f(cy + dy)}" rx="${f(R * ax)}" ry="${f(R * ay)}" fill="${OURO.borda}"/>`);
    out.push(`<path d="${casco.join(' ')}" fill="url(#${lat})" stroke="url(#${lat})" stroke-width="0.6"/>`);
    // Ranhuras da serrilha na lateral (só no lado visível).
    if (lod !== 'micro') {
      const ranhuras = [];
      const n = lod === 'mestre' ? 90 : 40;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const nx = Math.cos(a) * ax, ny = Math.sin(a) * ay;
        if (nx * dx + ny * dy <= 0) continue;
        const x = cx + Math.cos(a) * R * ax, y = cy + Math.sin(a) * R * ay;
        ranhuras.push(`M${f(x)},${f(y)} L${f(x + dx)},${f(y + dy)}`);
      }
      out.push(`<path d="${ranhuras.join(' ')}" stroke="${OURO.relevo}" stroke-width="${lod === 'mestre' ? 1.6 : 3}" opacity="0.75"/>`);
    }
  }
  // Face visível: a frente, ou o verso depois de meia volta. O verso tem o mesmo cunho
  // e é lido sem espelhar (como numa moeda real de duas faces iguais).
  const k = R / 256;
  out.push(`<g transform="translate(${f(cx)},${f(cy)}) scale(${f(ax * k)},${f(ay * k)}) translate(-256,-256)">${faceMoeda({ lod, id, px })}</g>`);
  return out.join('');
}

/** SVG completo de uma moeda (fundo transparente, centro geométrico no centro do quadro). */
export function svgMoeda({ px = 512, giro = 0, inclinacao = 0, lod = null, margem = 0.06 } = {}) {
  const l = lod || nivelDetalhe(px);
  const esp = 0.085;
  // Margem para a espessura não ser cortada na perspectiva.
  const vb = 512 * (1 + margem * 2) + (giro || inclinacao ? 512 * esp * 2 : 0);
  const o = (vb - 512) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${f(-o)} ${f(-o)} ${f(vb)} ${f(vb)}">${moeda3d({ giro, inclinacao, lod: l, px })}</svg>`;
}

/**
 * Pilha de moedas deitadas, vista em perspectiva (inclinação 68°), como na referência:
 * cada moeda é a mesma (lateral serrilhada); a de cima mostra o tubarão. `n` é limitado:
 * quantidades grandes viram várias pilhas/monte (`svgMonte`), nunca milhares de moedas.
 */
export function pilhaElementos({ n = 5, cx = 256, base = 440, r = 0.42, inclinacao = 68, lod = 'mestre', px = 512, id = `jp${++_seq}` } = {}) {
  const passo = 512 * r * 0.17;
  const out = [];
  for (let i = 0; i < n; i++) {
    const topo = i === n - 1;
    // Moedas de baixo só mostram a lateral: desenha-se a face lisa (rápido) e a de cima completa.
    const cy = base - i * passo;
    out.push(moeda3d({ giro: 0, inclinacao, lod: topo ? lod : 'micro', px: topo ? px : 12, cx, cy, r, espessura: 0.085, id: `${id}_${i}` }));
  }
  return out.join('');
}

export function svgPilha({ n = 5, px = 256, lod = null } = {}) {
  const l = lod || nivelDetalhe(px);
  const base = 512 - 512 * 0.42 * 0.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 512 512">${pilhaElementos({ n: Math.max(1, Math.min(12, n)), cy: 256, base, lod: l, px })}</svg>`;
}

/**
 * Composições da referência: pilhas lado a lado e uma moeda em pé apoiada na frente.
 * `tamanho`: 'grupo' (3 moedas), 'pequena', 'media', 'grande', 'monte', 'extraordinaria'.
 */
export function svgComposicao(tamanho = 'media', px = 256) {
  const l = nivelDetalhe(px);
  const P = {
    grupo: [[200, 470, 1], [312, 470, 2]],
    pequena: [[256, 470, 4]],
    media: [[180, 470, 4], [330, 440, 7]],
    grande: [[150, 470, 5], [300, 450, 9], [404, 476, 3]],
    monte: [[120, 476, 3], [210, 466, 7], [318, 446, 10], [410, 476, 4]],
    extraordinaria: [[96, 478, 4], [190, 462, 8], [292, 440, 12], [398, 464, 7]],
  }[tamanho] || [[256, 470, 4]];
  const r = tamanho === 'pequena' ? 0.46 : tamanho === 'grupo' ? 0.4 : 0.36;
  const corpo = P.map(([x, base, n], i) => pilhaElementos({ n, cx: x, base, r, lod: l, px, id: `c${i}` })).join('');
  // Moeda em pé apoiada na frente (legível), como na referência.
  const emPe = tamanho === 'pequena' || tamanho === 'grupo' ? '' : moeda3d({ giro: 24, inclinacao: 0, cx: tamanho === 'media' ? 300 : 270, cy: 380, r: 0.3, lod: l, px, id: 'pe' });
  const brilho = tamanho === 'extraordinaria' ? [[90, 120], [420, 90], [250, 60], [470, 260]].map(([x, y]) => `<path d="M${x},${y - 22} L${x + 5},${y - 5} L${x + 22},${y} L${x + 5},${y + 5} L${x},${y + 22} L${x - 5},${y + 5} L${x - 22},${y} L${x - 5},${y - 5} Z" fill="${OURO.reflexo}"/>`).join('') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 512 512">${brilho}${corpo}${emPe}</svg>`;
}

/** Ângulos do giro (quadros do atlas de animação): 24 quadros de 15°. */
export const QUADROS_GIRO = Object.freeze(Array.from({ length: 24 }, (_, i) => i * 15));

/** Perspectivas nomeadas da biblioteca. */
export const PERSPECTIVAS = Object.freeze({
  frente: { giro: 0, inclinacao: 0 },
  giro15: { giro: 15, inclinacao: 0 },
  giro30: { giro: 30, inclinacao: 0 },
  giro45: { giro: 45, inclinacao: 0 },
  giro60: { giro: 60, inclinacao: 0 },
  lateral: { giro: 88, inclinacao: 0 },
  cima: { giro: 0, inclinacao: 70 },
  baixo: { giro: 0, inclinacao: -55 },
  inclinada: { giro: 28, inclinacao: 22 },
});

/** Tamanhos oficiais dos ícones (px). */
export const TAMANHOS = Object.freeze([12, 16, 20, 24, 32, 48, 64, 128, 256, 512]);
