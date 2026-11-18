// Visuais do shape: cada nível a partir do 2 libera uma peça nova, com o tema do
// título daquele nível (lava, gelo, abismo, cosmos, realeza…). Cada peça é mais
// caprichada que a anterior da mesma parte (mais pontas, gemas, brilho, tamanho),
// então o nível 15 parece melhor que o 14. Só peças por cima do desenho: o corpo,
// a silhueta e o estilo de recorte de papel não mudam.
// Puro: gera o catálogo, as partes do rig e os canais. Nada aqui revela peça
// bloqueada: toda função pública que lista recebe o nível e filtra.

export const VISUAL_PARTES = [
  { id: 'cabeca', nome: 'Cabeça' },
  { id: 'pescoco', nome: 'Pescoço' },
  { id: 'pulsos', nome: 'Pulsos' },
  { id: 'cinto', nome: 'Cintura' },
  { id: 'bermuda', nome: 'Bermuda' },
  { id: 'pintura', nome: 'Pintura de guerra' },
  { id: 'aura', nome: 'Aura' },
];

// Níveis 2–10: uma peça de cada parte para começar; a aura chega no Megalodon (10).
const INICIO = { 2: 'pescoco', 3: 'pulsos', 4: 'cabeca', 5: 'cinto', 6: 'bermuda', 7: 'pintura', 8: 'cabeca', 9: 'pescoco', 10: 'aura' };
const CICLO = ['cabeca', 'pescoco', 'pulsos', 'cinto', 'bermuda', 'pintura', 'aura'];
export const parteDoNivel = (nivel) => INICIO[nivel] || CICLO[(nivel - 11) % CICLO.length];

const TIPOS = {
  cabeca: ['Faixa', 'Tiara', 'Coroa', 'Coroa alta', 'Coroa suprema'],
  pescoco: ['Cordão', 'Colar de presas', 'Corrente', 'Medalhão', 'Medalhão supremo'],
  pulsos: ['Munhequeiras', 'Braceletes', 'Braceletes cravejados', 'Manoplas', 'Manoplas supremas'],
  cinto: ['Cinto', 'Cinto de levantamento', 'Cinturão', 'Cinturão de campeão', 'Cinturão supremo'],
  bermuda: ['Bermuda', 'Bermuda com friso', 'Bermuda de gala', 'Bermuda lendária', 'Bermuda suprema'],
  pintura: ['Marcas', 'Pintura de guerra', 'Pintura tribal', 'Pintura ritual', 'Pintura suprema'],
  aura: ['Aura', 'Aura forte', 'Aura flamejante', 'Aura colossal', 'Aura suprema'],
};

// Tema de cor pelo título (a: principal, b: metal/friso, g: gema). Primeiro que casar.
const TEMAS = [
  [/Lava|Magma|Vulc/, ['#d84315', '#ffb300', '#ff6f00']],
  [/Glacial|Ártico|Antártida|Neblina|Groenlândia/, ['#4fa3d1', '#e1f5fe', '#81d4fa']],
  [/Tempestade|Relâmpago|Tsunami|Maremoto|Fúria|Tempestuoso/, ['#3949ab', '#ffee58', '#90caf9']],
  [/Cristal|Diamante/, ['#80deea', '#ffffff', '#b2ebf2']],
  [/Obsidiana|Sombra|Escura|Negra|Eclipse|Buraco|Pesadelo/, ['#37303f', '#9575cd', '#d1c4e9']],
  [/Aurora/, ['#26a69a', '#f48fb1', '#b388ff']],
  [/Rubi/, ['#c62828', '#ffd54f', '#ff5252']],
  [/Safira/, ['#1e4fa8', '#e0e0e0', '#448aff']],
  [/Jade/, ['#2e7d32', '#ffd54f', '#69f0ae']],
  [/Prata|Lambari|Sardinha/, ['#90a4ae', '#eceff1', '#b0bec5']],
  [/Ouro|Dourad/, ['#d4a72c', '#fff3c4', '#e53935']],
  [/Ferro|Aço|Titânio|Granito|Rochedo|Âncora|Casco|Arpão/, ['#546e7a', '#eceff1', '#e53935']],
  [/Estelar|Cometa|Lunar|Nebulosa|Cósmic|Saturno|Supernova|Galáxia|Quasar|Pulsar|Magnetar|Andrômeda|Júpiter|Via Láctea|Constelação|Horizonte|Big Bang|Infinito|Celestial|Divino|Eterno|Netuno/, ['#5e35b1', '#ffd54f', '#e1bee7']],
  [/Abismo|Abiss|Fossa|Lula|Peixe-dragão|Tamboril|duende|Meia-Noite|Crepuscular|Hidroterm|Profundezas|Talude/, ['#00566b', '#00e5ff', '#76ff03']],
  [/Manhã|Frango|Whey|Creatina|Leg Day|Pré-treino|Bulking|Cutting|Cardio|Shape Seco/, ['#e91e63', '#ffeb3b', '#00e676']],
  [/Bíceps|Supino|Agachamento|Shape|Mister|Peitoral|Ombro|Panturrilha|Abdômen|Antebraço|Costas|Glúteo|Rosca|Terra Abissal|Pump|Barbatana de Aço|Dorsal|Trapézio|Mandíbula/, ['#455a64', '#ffca28', '#e53935']],
  [/Isonade|Lusca|Makara|Umibōzu|Bakunawa|Hafgufa|Aspidoquelone|Ceto|Kraken|Leviatã|Bunyip|Ningyo|Ahuizotl|Nuckelavee|Taniwha|Hidra|Cila|Caríbdis|Jörmungandr|Tiamat/, ['#00695c', '#ffd54f', '#26c6da']],
  [/Cavaleiro|Barão|Visconde|Marquês|Lorde|Príncipe|Arquiduque|Grão-Duque|Regente|Soberano|Imperador|Imperial|Real\b|Rei |Supremo/, ['#6a1b9a', '#ffd54f', '#e53935']],
  [/Terror|Fera|Predador|Colosso|Titã|Campeão|Arauto|Lendári|Mítico|Imortal|Absoluto|Devorador|Guardião|Lenda|Coração|Arquiteto|Último|Colossal|Titânico/, ['#b71c1c', '#ffd54f', '#212121']],
  [/ssauro|Liopleuro|Prognathodon/, ['#2e7d6b', '#c5e1a5', '#ffca28']],
  [/Otodus|Cretoxyrhina|Helicoprion|Edestus|Dunkleosteus|Xiphactinus|Leedsichthys|Livyatan|Hybodus|Cladoselache|Stethacanthus|Xenacanthus|Ptychodus|Squalicorax|Cretolamna|Scapanorhynchus|Parotodus|Angustidens|Ancestral|Primordial/, ['#8d6e63', '#f5e6c8', '#ffb74d']],
  [/Baiacu/, ['#f9a825', '#fff59d', '#8d6e63']],
  [/Moreia|Mangue|Coral Vivo|Atol/, ['#2e7d32', '#c5e1a5', '#ffab40']],
  [/Barracuda|lixa/, ['#607d8b', '#cfd8dc', '#4fc3f7']],
  [/tigre/, ['#ef6c00', '#212121', '#ffcc80']],
  [/martelo/, ['#8d5524', '#f0c27b', '#4fc3f7']],
  [/branco/, ['#eceff1', '#90a4ae', '#e53935']],
  [/Megalodon/, ['#37474f', '#ffd54f', '#e53935']],
  [/Oceano|Marés|Ondas|Pacífico|Atlântico|Índico|Sargaços|Plataforma|Correntes|Recife|Mar /, ['#0277bd', '#e0f7fa', '#ffd54f']],
];
const TEMA_PADRAO = ['#0277bd', '#e0f7fa', '#ffd54f'];
export const temaDoTitulo = (t) => (TEMAS.find(([re]) => re.test(t)) || [null, TEMA_PADRAO])[1];

const r1 = (n) => Math.round(n * 10) / 10;
const circ = (cx, cy, r) => `M${r1(cx - r)},${r1(cy)} a${r1(r)},${r1(r)} 0 1,0 ${r1(2 * r)},0 a${r1(r)},${r1(r)} 0 1,0 ${r1(-2 * r)},0 Z`;
const poly = (pts) => `M${pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' L')} Z`;
const id3 = (n) => String(n).padStart(3, '0');

/**
 * Catálogo completo dos visuais (níveis 2..N). USO INTERNO: para mostrar algo à
 * usuária, use `visuaisLiberados(nivel)`, que nunca inclui peça bloqueada.
 */
export function gerarVisuais(niveis) {
  const porParte = {};
  const out = [];
  for (let nivel = 2; nivel <= niveis.length; nivel++) {
    const parte = parteDoNivel(nivel);
    const k = porParte[parte] = (porParte[parte] ?? -1) + 1; // ordem dentro da parte
    const t = (nivel - 2) / Math.max(1, niveis.length - 2); // 0..1 no total
    const faixa = Math.min(4, Math.floor(t * 5));
    const titulo = niveis[nivel - 1];
    const [a, b, g] = temaDoTitulo(titulo);
    out.push({ id: `nv${id3(nivel)}`, nivel, parte, k, t, faixa, titulo, nome: `${TIPOS[parte][faixa]} de ${titulo}`, cores: { a, b, g } });
  }
  return out;
}

// ---------------------------------------------------------------- geometria

const CABECA = { pivot: [90, 86], rot: 'headRot' };

/** y aproximado da curva da base da coroa (arco sobre o topo da cabeça). */
const baseCoroa = (x) => 20 - 8 * (1 - ((x - 90) / 36) ** 2);

function partesCabeca(p, ch) {
  const { a, b, g } = p.cores;
  const t = p.t;
  const P = (id, fill, path, extra = {}) => ({ group: 'costumes', part: { id: `${p.id}_${id}`, fill, showIf: ch, path, ...CABECA, ...extra } });
  const out = [];
  if (p.faixa <= 1) {
    const e = 4 + Math.min(3, p.k) * 0.6; // faixa engrossa
    out.push(P('faixa', a, `M52,22 C68,10 112,10 128,22 L127,${r1(22 + e)} C110,${r1(11 + e)} 70,${r1(11 + e)} 53,${r1(22 + e)} Z`));
    // Cada faixa nova tem mais detalhe: pontas do nó, tachas e emblema.
    if (p.k >= 1) out.push(P('no', a, poly([[124, 20], [136, 30], [133, 33], [122, 25]]) + ' ' + poly([[123, 23], [131, 37], [127, 38], [121, 26]])));
    const tachas = Math.min(6, p.k);
    for (let i = 0; i < tachas; i++) {
      const x = 90 + (i - (tachas - 1) / 2) * 10;
      out.push(P(`tacha${i}`, b, circ(x, baseCoroa(x) + 3.4, 1.4)));
    }
    if (p.k >= 3 && p.faixa === 0) out.push(P('emblema', g, poly([[90, 9.5], [94, 13.5], [90, 17.5], [86, 13.5]])));
    if (p.faixa === 1) {
      const n = 3 + Math.min(2, Math.floor(p.k / 2)) * 2;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const x = 90 + (i - (n - 1) / 2) * 9;
        const y0 = baseCoroa(x) - 2;
        const h = 6 + 3 * (1 - Math.abs(i - (n - 1) / 2) / n);
        pts.push(P(`ponta${i}`, b, poly([[x - 4, y0 + 2], [x, y0 - h], [x + 4, y0 + 2]])));
      }
      out.push(...pts);
      out.push(P('gema', g, circ(90, baseCoroa(90) + 2.5, 2.2)));
    }
    return out;
  }
  // Coroa: mais pontas e mais alta a cada peça; centro mais alto.
  const n = Math.min(9, 4 + Math.floor(p.k / 3));
  const h = 8 + 18 * t;
  const pts = [[54, 20]];
  for (let i = 0; i < n; i++) {
    const vx = 54 + i * (72 / n);
    const tx = 54 + (i + 0.5) * (72 / n);
    const c = 1 - 0.45 * Math.abs(tx - 90) / 36;
    pts.push([vx, baseCoroa(vx) - 4], [tx, baseCoroa(tx) - 4 - h * c]);
  }
  pts.push([126, 16], [126, 20]);
  const corpo = `${poly(pts).slice(0, -2)} C112,12 68,12 54,20 Z`;
  out.push(P('coroa', p.faixa >= 3 ? b : a, corpo));
  out.push(P('friso', p.faixa >= 3 ? a : b, 'M54,20 C68,12 112,12 126,20 L126,25 C112,17 68,17 54,25 Z'));
  // Gemas no friso (mais a cada peça) e nas pontas (coroa alta em diante).
  const gemas = Math.min(9, 2 + Math.floor(t * 7));
  for (let i = 0; i < gemas; i++) {
    const x = 90 + (i - (gemas - 1) / 2) * (60 / Math.max(gemas, 2));
    out.push(P(`gema${i}`, g, circ(x, baseCoroa(x) + 3, 1.8 + t)));
  }
  if (p.faixa >= 3) {
    for (let i = 0; i < n; i++) {
      const tx = 54 + (i + 0.5) * (72 / n);
      const c = 1 - 0.45 * Math.abs(tx - 90) / 36;
      out.push(P(`brilho${i}`, g, circ(tx, baseCoroa(tx) - 4 - h * c + 1, 1.6)));
    }
  }
  if (p.faixa >= 4) {
    // Halo acima da coroa (anel recortado: dois arcos em sentidos opostos).
    const cy = baseCoroa(90) - 4 - h - 6;
    out.push(P('halo', b, `M68,${r1(cy)} a22,5 0 1,1 44,0 a22,5 0 1,1 -44,0 Z M71.5,${r1(cy)} a18.5,2.6 0 1,0 37,0 a18.5,2.6 0 1,0 -37,0 Z`));
  }
  return out;
}

/** Ponto na curva do colar (quadrática 58,88 → 90,112+s → 122,88), logo abaixo do queixo. */
function pontoColar(u, sag) {
  const y0 = 88, yc = 112 + sag;
  const x = (1 - u) ** 2 * 58 + 2 * (1 - u) * u * 90 + u * u * 122;
  const y = (1 - u) ** 2 * y0 + 2 * (1 - u) * u * yc + u * u * y0;
  return [x, y];
}

function partesPescoco(p, ch) {
  const { a, b, g } = p.cores;
  const t = p.t;
  const P = (id, fill, path) => ({ group: 'costumes', part: { id: `${p.id}_${id}`, fill, showIf: ch, path } });
  const out = [];
  const w = 3.4 + 2 * t + Math.min(3, p.k) * 0.15;
  const sag = 2 * t;
  out.push(P('corda', p.faixa >= 2 ? b : a, `M58,88 Q90,${r1(112 + sag)} 122,88 L122,${r1(88 + w)} Q90,${r1(112 + sag + w)} 58,${r1(88 + w)} Z`));
  const dente = (u, s = 1) => {
    const [x, y] = pontoColar(u, sag);
    const yy = y + w * 0.6;
    return poly([[x - 3 * s, yy], [x + 3 * s, yy], [x, yy + 8 * s]]);
  };
  const presas = p.faixa === 0 ? Math.min(5, 1 + 2 * p.k) : Math.min(9, 3 + Math.floor(p.k / 2) * 2);
  for (let i = 0; i < presas; i++) {
    const u = presas === 1 ? 0.5 : 0.2 + 0.6 * (i / (presas - 1));
    if (p.faixa >= 2 && Math.abs(u - 0.5) < 0.08) continue; // o centro fica para o medalhão
    out.push(P(`presa${i}`, '#f7f5ee', dente(u, (p.faixa === 0 ? 1.4 + 0.1 * p.k : 0.85) + 0.25 * (1 - Math.abs(u - 0.5) * 2))));
  }
  if (p.faixa <= 1) {
    // Conta colorida no centro do cordão (cresce a cada peça).
    const [x, y] = pontoColar(0.5, sag);
    out.push(P('conta', g, circ(x, y + w / 2, 2 + 0.3 * Math.min(4, p.k))));
  }
  if (p.faixa >= 2) {
    const [x, y] = pontoColar(0.5, sag);
    const r = 5 + 3 * t;
    const cy = y + w + r - 1;
    if (p.faixa >= 4) {
      // Estrela de oito pontas atrás do medalhão.
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? r * 1.05 : r * 1.45;
        pts.push([x + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
      }
      out.push(P('estrela', a, poly(pts)));
    }
    out.push(P('medalhao', b, circ(x, cy, r)));
    out.push(P('gema', p.faixa >= 3 ? g : a, circ(x, cy, r * (p.faixa >= 3 ? 0.5 : 0.35))));
  }
  return out;
}

function partesPulsos(p, ch) {
  const { a, b, g } = p.cores;
  const t = p.t;
  const out = [];
  const h = 5 + 5 * t + Math.min(2, p.k) * 0.3;
  for (const [lado, x0, x1, parent] of [['L', 21, 45, 'foreL'], ['R', 135, 159, 'foreR']]) {
    const P = (id, fill, path) => ({ group: 'costumeHand', part: { id: `${p.id}_${id}${lado}`, fill, showIf: ch, parent, path } });
    const y = 141 - h * 0.3;
    out.push(P('banda', a, poly([[x0, y], [x1, y], [x1 + 1, y + h], [x0 - 1, y + h]])));
    if (p.faixa >= 1) out.push(P('friso', b, poly([[x0, y + h * 0.42], [x1, y + h * 0.42], [x1 + 0.4, y + h * 0.58], [x0 - 0.4, y + h * 0.58]])));
    const tachas = p.faixa >= 2 ? Math.min(5, 2 + Math.floor(p.k / 3)) : 0;
    for (let i = 0; i < tachas; i++) {
      const x = x0 + 3 + (i + 0.5) * ((x1 - x0 - 6) / tachas);
      out.push(P(`tacha${i}`, g, circ(x, y + h / 2, 1.3 + 0.8 * t)));
    }
    if (p.faixa >= 3) {
      // Manoplas: pontas na borda de cima.
      const n = p.faixa >= 4 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const x = x0 + 2 + (i + 0.5) * ((x1 - x0 - 4) / n);
        out.push(P(`ponta${i}`, b, poly([[x - 2.6, y + 0.5], [x, y - 4 - 2 * t], [x + 2.6, y + 0.5]])));
      }
    }
  }
  return out;
}

function partesCinto(p, ch) {
  const { a, b, g } = p.cores;
  const t = p.t;
  const P = (id, fill, path) => ({ group: 'costumes', part: { id: `${p.id}_${id}`, fill, showIf: ch, hideIf: 'sexy', path } });
  const out = [];
  const h = 5 + 4 * t + Math.min(3, p.k) * 0.2;
  const y = 123;
  out.push(P('banda', a, poly([[55, y], [125, y], [125, y + h], [55, y + h]])));
  const pw = 10 + 18 * t, ph = 8 + 9 * t, cy = y + h / 2;
  out.push(P('placa', b, poly([[90 - pw / 2, cy - ph / 2], [90 + pw / 2, cy - ph / 2], [90 + pw / 2 + 1.5, cy], [90 + pw / 2, cy + ph / 2], [90 - pw / 2, cy + ph / 2], [90 - pw / 2 - 1.5, cy]])));
  if (p.faixa >= 1) out.push(P('centro', g, circ(90, cy, 1.8 + 2.2 * t)));
  if (p.faixa >= 2) {
    for (const s of [-1, 1]) {
      const cx = 90 + s * (pw / 2 + 9);
      out.push(P(`lateral${s > 0 ? 'D' : 'E'}`, b, poly([[cx - 4, cy - ph / 3], [cx + 4, cy - ph / 3], [cx + 4, cy + ph / 3], [cx - 4, cy + ph / 3]])));
      if (p.faixa >= 3) out.push(P(`gemaLat${s > 0 ? 'D' : 'E'}`, g, circ(cx, cy, 1.6)));
    }
  }
  if (p.faixa >= 4) {
    const n = Math.min(6, 3 + Math.floor(p.k / 8));
    for (let i = 0; i < n; i++) {
      const s = i % 2 ? 1 : -1;
      const cx = 90 + s * (pw / 2 + 18 + Math.floor(i / 2) * 6);
      if (cx > 56 && cx < 124) out.push(P(`brilho${i}`, g, circ(cx, cy, 1.2)));
    }
  }
  return out;
}

function partesPintura(p, ch) {
  const { a, b, g } = p.cores;
  const t = p.t;
  const out = [];
  const P = (id, fill, path, extra = {}) => ({ group: 'nivelPintura', part: { id: `${p.id}_${id}`, fill, showIf: ch, path, alpha: 0.85, ...extra } });
  const chevron = (cx, cy, w, h, th) => poly([[cx - w / 2, cy], [cx, cy + h], [cx + w / 2, cy], [cx + w / 2, cy + th], [cx, cy + h + th], [cx - w / 2, cy + th]]);
  const n = Math.min(3, 1 + Math.floor(p.k / 4));
  for (let i = 0; i < n; i++) {
    // Marcas maiores e mais grossas a cada peça.
    const w = 8 + 4 * t, th = 2 + 1.4 * t;
    out.push(P(`bracoE${i}`, a, chevron(33, 103 + i * (4 + th), w, 3, th), { parent: 'armL' }));
    out.push(P(`bracoD${i}`, a, chevron(147, 103 + i * (4 + th), w, 3, th), { parent: 'armR' }));
  }
  if (p.faixa >= 1) {
    out.push(P('torsoE', a, poly([[50, 104], [59, 99], [61, 102.5], [52, 107.5]])));
    out.push(P('torsoD', a, poly([[130, 104], [121, 99], [119, 102.5], [128, 107.5]])));
  }
  if (p.faixa >= 2) {
    for (const [lado, x] of [['E', 50], ['D', 130]]) {
      const s = lado === 'E' ? 1 : -1;
      out.push(P(`rosto${lado}1`, a, poly([[x, 36], [x + 9 * s, 34], [x + 9 * s, 36.4], [x, 38.4]]), { pivot: CABECA.pivot, rot: CABECA.rot }));
      out.push(P(`rosto${lado}2`, a, poly([[x, 41], [x + 8 * s, 39.4], [x + 8 * s, 41.8], [x, 43.4]]), { pivot: CABECA.pivot, rot: CABECA.rot }));
    }
  }
  if (p.faixa >= 3) {
    out.push(P('anteE', b, poly([[27, 133], [37, 131], [37, 133], [27, 135]]), { parent: 'foreL' }));
    out.push(P('anteD', b, poly([[153, 133], [143, 131], [143, 133], [153, 135]]), { parent: 'foreR' }));
  }
  if (p.faixa >= 4) {
    for (const [x, y, parent] of [[33, 118, 'armL'], [147, 118, 'armR']]) out.push(P(`ponto${parent}`, g, circ(x, y, 1.7 + t), { parent }));
    out.push(P('pontoTorso', g, circ(90, 96, 2.2)));
  }
  return out;
}

function partesAura(p, ch) {
  const { a, b, g } = p.cores;
  const t = p.t;
  const out = [];
  const camada = (id, fill, alpha, k, pontas, gira) => {
    const cx = 90, cy = 112;
    const rxi = 66 * k, ryi = 86 * k;
    const rxo = rxi + (8 + 12 * t) * k, ryo = ryi + (10 + 22 * t) * k;
    const a0 = Math.PI - 0.32, a1 = 2 * Math.PI + 0.32;
    const pts = [];
    const n = pontas * 2;
    for (let i = 0; i <= n; i++) {
      const ang = a0 + (a1 - a0) * (i / n) + gira;
      const out_ = i % 2 === 1;
      const rx = out_ ? rxo : rxi, ry = out_ ? ryo : ryi;
      pts.push([Math.max(4, Math.min(176, cx + Math.cos(ang) * rx)), Math.max(-26, cy + Math.sin(ang) * ry)]);
    }
    out.push({ group: 'nivelAura', part: { id: `${p.id}_${id}`, fill, showIf: ch, alpha, path: poly(pts) } });
  };
  const pontas = Math.min(26, 11 + Math.floor(t * 14));
  camada('fora', a, 0.42 + 0.12 * t, 1, pontas, 0);
  if (t >= 0.3) camada('meio', b, 0.32, 0.86, pontas - 2, 0.06);
  if (t >= 0.65) camada('dentro', g, 0.3, 0.74, pontas - 4, -0.05);
  return out;
}

function partesBermuda(p, ch) {
  const { a, b, g } = p.cores;
  const t = p.t;
  const P = (id, fill, path) => ({ group: 'shortsDetail', part: { id: `${p.id}_${id}`, fill, showIf: ch, path } });
  const out = [];
  // Barra na boca da bermuda (mais grossa a cada peça) e, depois, gemas, emblema e friso de ouro.
  const hb = 2 + Math.min(3, 1 + p.k * 0.25) + 2 * t;
  out.push(P('barra', b, poly([[56, 150 - hb], [124, 150 - hb], [125, 150], [55, 150]])));
  const gemas = p.faixa >= 1 ? Math.min(8, 2 + Math.floor(p.k / 2) * 2) : 0;
  for (let i = 0; i < gemas; i++) {
    const x = 60 + (i + 0.5) * (60 / gemas);
    out.push(P(`gema${i}`, g, circ(x, 150 - hb / 2, Math.min(1.8, hb / 2 - 0.2))));
  }
  if (p.faixa >= 2) out.push(P('emblema', g, circ(70, 138, 3 + 2 * t)), P('emblemaCentro', b, circ(70, 138, 1.4 + t)));
  if (p.faixa >= 3) out.push(P('cos', b, poly([[55, 126], [125, 126], [125, 129], [55, 129]])));
  if (p.faixa >= 4) out.push(P('raio', b, poly([[106, 131], [112, 131], [108, 137], [113, 137], [103, 146], [106, 139], [101, 139]])));
  return out;
}

const GERADORES = { bermuda: partesBermuda, cabeca: partesCabeca, pescoco: partesPescoco, pulsos: partesPulsos, cinto: partesCinto, pintura: partesPintura, aura: partesAura };

/** Canal de pose que liga a peça no desenho. */
export const canalDaPeca = (p) => (p.parte === 'bermuda' ? `costume_bermudaNv${id3(p.nivel)}` : `nv_${p.id}`);

/** Partes do rig de uma peça: [{group, part}] (a bermuda também troca a cor pela paleta). */
export function partesDaPeca(p) {
  const gen = GERADORES[p.parte];
  return gen ? gen(p, canalDaPeca(p)) : [];
}

/**
 * Rig com todas as peças dos visuais (cada uma só aparece com o seu canal ligado).
 * Não altera o rig recebido. Grupos novos: aura atrás de tudo e pintura logo
 * depois do detalhe dos braços, ambos escondidos de costas (mooning).
 */
export function rigComVisuais(rig, niveis) {
  if (!rig || !Array.isArray(niveis) || niveis.length < 2) return rig;
  const pecas = gerarVisuais(niveis);
  const groups = rig.groups.map((g) => ({ ...g, parts: [...g.parts] }));
  const aura = { id: 'nivelAura', hideIf: 'mooning', parts: [] };
  const pintura = { id: 'nivelPintura', hideIf: 'mooning', parts: [] };
  const iArm = groups.findIndex((g) => g.id === 'armDetail');
  groups.splice(iArm >= 0 ? iArm + 1 : groups.length, 0, pintura);
  groups.unshift(aura);
  const byId = new Map(groups.map((g) => [g.id, g]));
  const costumes = { ...(rig.costumes || {}) };
  for (const p of pecas) {
    if (p.parte === 'bermuda') {
      costumes[`bermudaNv${id3(p.nivel)}`] = { palette: { shorts: p.cores.a, stripe: p.cores.b } };
    }
    for (const { group, part } of partesDaPeca(p)) (byId.get(group) || byId.get('costumes')).parts.push(part);
  }
  return { ...rig, groups, costumes };
}

// ---------------------------------------------------------------- estado e uso

const _cache = new Map();
function catalogo(niveis) {
  const key = niveis.join('|');
  if (!_cache.has(key)) _cache.set(key, gerarVisuais(niveis));
  return _cache.get(key);
}

/** Só as peças já liberadas no nível atual (nunca uma bloqueada). */
export function visuaisLiberados(niveis, nivel) {
  return catalogo(niveis).filter((p) => p.nivel <= nivel);
}

/** Peça liberada pelo id (bloqueada ou inexistente → null, sem distinção). */
export function pecaLiberada(niveis, nivel, id) {
  return visuaisLiberados(niveis, nivel).find((p) => p.id === id) || null;
}

/** A melhor peça liberada de cada parte (a de nível mais alto). */
export function melhorConjunto(niveis, nivel) {
  const o = {};
  for (const p of visuaisLiberados(niveis, nivel)) o[p.parte] = p.id;
  return o;
}

/** Estado salvo válido: {pecas: {parte: id}, visto: nível}. Só ids que existem no catálogo. */
export function sanitizeVisual(v, niveis = null) {
  const out = { pecas: {}, visto: 0 };
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  const n = Number(v.visto);
  out.visto = Number.isInteger(n) && n >= 0 && n <= 10000 ? n : 0;
  const partes = new Set(VISUAL_PARTES.map((s) => s.id));
  const pecas = v.pecas && typeof v.pecas === 'object' && !Array.isArray(v.pecas) ? v.pecas : {};
  for (const [parte, id] of Object.entries(pecas)) {
    if (!partes.has(parte) || typeof id !== 'string' || !/^nv\d{3}$/.test(id)) continue;
    if (niveis) {
      const p = catalogo(niveis).find((x) => x.id === id);
      if (!p || p.parte !== parte) continue;
    } else if (parteDoNivel(Number(id.slice(2))) !== parte) continue;
    out.pecas[parte] = id;
  }
  return out;
}

/**
 * Sobe de nível: veste as peças novas (de `visto+1` até `nivel`) na parte delas;
 * as outras partes ficam como ela deixou. Primeira vez (visto 0): veste o melhor
 * de cada parte. Devolve {estado, novas} (novas = peças liberadas agora).
 */
export function aplicarNivel(estado, niveis, nivel) {
  const s = sanitizeVisual(estado, niveis);
  if (nivel <= s.visto) return { estado: s, novas: [] };
  const novas = catalogo(niveis).filter((p) => p.nivel > s.visto && p.nivel <= nivel);
  const pecas = s.visto === 0 ? melhorConjunto(niveis, nivel) : { ...s.pecas };
  if (s.visto !== 0) for (const p of novas) pecas[p.parte] = p.id;
  return { estado: { pecas, visto: nivel }, novas };
}

/** Veste (ou tira, se já estava) uma peça liberada. Bloqueada → nada muda. */
export function vestirVisual(estado, niveis, nivel, id) {
  const s = sanitizeVisual(estado, niveis);
  const p = pecaLiberada(niveis, nivel, id);
  if (!p) return { estado: s, peca: null, tirou: false };
  const pecas = { ...s.pecas };
  const tirou = pecas[p.parte] === id;
  if (tirou) delete pecas[p.parte];
  else pecas[p.parte] = id;
  return { estado: { ...s, pecas }, peca: p, tirou };
}

// Fantasias festivas que trocam a cor da bermuda (rig.costumes com paleta).
const FANTASIA_COM_BERMUDA = new Set(['anoNovo', 'carnaval', 'festaJunina', 'natal', 'lanternaChinesa', 'chapeuVerde', 'patriota']);
// Fantasias que não ficam na cabeça (na mão ou no corpo): a coroa do nível continua.
const FANTASIA_FORA_DA_CABECA = new Set(['diya', 'fanous', 'lanternaChinesa', 'lotus', 'flor', 'maca', 'arcoIris', 'patriota', 'halloween', 'tinta', 'gravata', 'cachecol']);

/**
 * Canais de pose das peças vestidas, sem brigar com o guarda-roupa nem com a
 * fantasia do dia: a parte ocupada por uma delas não mostra a peça do nível.
 */
export function canaisVisual(estado, niveis, nivel, { outfit = {}, fantasia = null } = {}) {
  const s = sanitizeVisual(estado, niveis);
  const ocupado = new Set();
  if (outfit.cabeca) ocupado.add('cabeca');
  if (outfit.pescoco) ocupado.add('pescoco');
  if (outfit.bermuda) ocupado.add('bermuda');
  if (fantasia && !FANTASIA_FORA_DA_CABECA.has(fantasia)) ocupado.add('cabeca');
  if (fantasia && FANTASIA_COM_BERMUDA.has(fantasia)) ocupado.add('bermuda');
  const ch = {};
  for (const [parte, id] of Object.entries(s.pecas)) {
    if (ocupado.has(parte)) continue;
    const p = pecaLiberada(niveis, nivel, id);
    if (p) ch[canalDaPeca(p)] = 1;
  }
  return Object.keys(ch).length ? ch : null;
}

/** Resumo para a Central: SÓ o que já foi liberado, por parte, e o que está vestido. */
export function visualSnapshot(estado, niveis, nivel) {
  const s = sanitizeVisual(estado, niveis);
  const lib = visuaisLiberados(niveis, nivel);
  const vestido = {};
  for (const [parte, id] of Object.entries(s.pecas)) if (lib.some((p) => p.id === id)) vestido[parte] = id;
  const partes = VISUAL_PARTES
    .map((pt) => ({ ...pt, itens: lib.filter((p) => p.parte === pt.id).reverse().map((p) => ({ id: p.id, nome: p.nome, nivel: p.nivel, cor: p.cores.a })) }))
    .filter((pt) => pt.itens.length);
  return { vestido, partes, total: lib.length };
}

/** Acha uma peça LIBERADA pelo nome ou id ("coroa de otodus", "nv014"). */
export function acharVisual(niveis, nivel, q) {
  const n = norm(q);
  if (!n) return null;
  const lib = visuaisLiberados(niveis, nivel);
  return lib.find((p) => p.id === n) || lib.find((p) => norm(p.nome) === n) || lib.find((p) => n.length >= 5 && norm(p.nome).includes(n)) || null;
}

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

// O JoJo comenta a peça nova (vaidoso; nunca sobre o corpo dela).
export const FALAS_VISUAL = {
  nova: ['Visual novo: {P}. Melhor que o anterior, óbvio.', '{P}. Subi de nível e o shape ganhou acessório à altura.', 'Olha isso: {P}. Cada nível eu fico mais caro.'],
  varias: ['Liberei {N} visuais novos. O melhor de cada parte já está em mim.'],
  veste: ['Boa escolha. Combina com o bíceps.', 'Isso. Agora sim, nível de respeito.'],
  tira: ['Tirou? Tá. Continuo lindo do mesmo jeito.'],
  melhor: ['O melhor de cada parte. Do jeito que eu mereço.'],
};
