// 50 animações virais (0.47.4, pedido do João de 19/11/2026): memes do Twitter/X, TikTok e
// shitpost reinterpretados como animações ORIGINAIS do JoJo (o modelo dele não muda; só
// adereços, roupas temporárias, luz, cor e deformações de desenho que sempre voltam ao normal).
//
// Cada viral vira um item do catálogo (`cat_vrNN`, 3 intensidades) com:
// - receita: primitivos do catálogo (corpo, braços, cabeça, rosto…);
// - faixas: quadros-chave próprios, em segundos (convertidos para 0..1);
// - peças: grupos do rig ligados por canais `vr_*` (numa CÓPIA do rig; o arquivo não muda);
// - clones: cópias pequenas/fantasmas do próprio JoJo (Conselho, Coffin Dance, Horny Jail…);
// - pixel: trecho em pixel art (Nyan Cat), feito no desenho do overlay.
// Tudo que liga desliga antes do fim: a aparência original volta sempre (testado).
// Sem som. Gatilhos só por sinais reais (ver GATILHOS e companion._viral).

const CABECA = { pivot: [90, 86], rot: 'headRot' };
const MAO_D = { parent: 'foreR' };
const r1 = (n) => Math.round(n * 10) / 10;
const elip = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} a${r1(rx)},${r1(ry)} 0 1,0 ${r1(2 * rx)},0 a${r1(rx)},${r1(ry)} 0 1,0 ${r1(-2 * rx)},0 Z`;
// Mesmo círculo no sentido contrário: dentro de outra elipse vira furo (anel).
const furo = (cx, cy, rx, ry) => `M${r1(cx - rx)},${r1(cy)} a${r1(rx)},${r1(ry)} 0 1,1 ${r1(2 * rx)},0 a${r1(rx)},${r1(ry)} 0 1,1 ${r1(-2 * rx)},0 Z`;
const anel = (cx, cy, r, w) => `${elip(cx, cy, r, r)} ${furo(cx, cy, r - w, r - w)}`;
const rect = (x, y, w, h) => `M${r1(x)},${r1(y)} L${r1(x + w)},${r1(y)} L${r1(x + w)},${r1(y + h)} L${r1(x)},${r1(y + h)} Z`;
const estrela = (cx, cy, r) => {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; return `${r1(cx + Math.cos(a) * rr)},${r1(cy + Math.sin(a) * rr)}`; });
  return `M${pts.join(' L')} Z`;
};
const chama = (x, y, h) => `M${r1(x)},${r1(y)} C${r1(x - h * 0.45)},${r1(y - h * 0.35)} ${r1(x - h * 0.15)},${r1(y - h * 0.7)} ${r1(x)},${r1(y - h)} C${r1(x + h * 0.1)},${r1(y - h * 0.6)} ${r1(x + h * 0.5)},${r1(y - h * 0.4)} ${r1(x + h * 0.3)},${r1(y)} Z`;
const VAZIO = 'M0,0 Z';
const TERRA = { scaleBy: 'vrTerraK', scalePivot: [90, 167] };

/** Texto com plaquinha atrás (legível sobre qualquer desktop). Devolve duas peças. */
function txt(id, x, y, texto, { size = 7, cor = '#1b2647', fundo = '#ffffff', w = null, h = null, alpha = 0.92, extra = {} } = {}) {
  const W = w ?? Math.max(18, texto.length * size * 0.62 + 8);
  const H = h ?? size + 6;
  const pecas = [];
  if (fundo) pecas.push({ id: `${id}Fundo`, fill: fundo, alpha, path: rect(x - W / 2, y - H / 2, W, H), ...extra });
  pecas.push({ id, fill: cor, path: VAZIO, text: texto, textFill: cor, fontSize: size, textX: x, textY: y + 0.4, ...extra });
  return pecas;
}
const grupo = (id, parts, { showIf = id, outline = false } = {}) => ({ id, showIf, outline, parts });

// ------------------------------------------------------------------ linha do tempo
/** Ferramentas de quadros-chave em segundos para uma animação de D segundos. */
function linha(D) {
  const f = (s) => Math.max(0, Math.min(1, Math.round((s / D) * 10000) / 10000));
  const L = {
    D,
    /** Liga (1) entre a e b segundos. */
    on: (a, b) => [[0, 0], [f(a), 1, 'step'], [f(b), 0, 'step'], [1, 0]],
    /** Pontos [s, v, ease?]; completa as pontas com o primeiro e o último valor. */
    k: (...pts) => {
      const out = pts.map(([s, v, e]) => (e ? [f(s), v, e] : [f(s), v]));
      if (out[0][0] > 0) out.unshift([0, out[0][1]]);
      if (out.at(-1)[0] < 1) out.push([1, out.at(-1)[1]]);
      return out;
    },
    /** Alterna a/b entre s0 e s1 (n trocas), voltando a `rest` nas pontas. */
    alt: (a, b, s0, s1, n, { rest = 0, step = false } = {}) => {
      const out = [[0, rest], [f(s0), rest]];
      for (let i = 0; i <= n; i++) {
        const key = [f(s0 + ((s1 - s0) * i) / n), i % 2 ? b : a];
        if (step) key.push('step');
        out.push(key);
      }
      out.push([f(s1 + 0.05), rest, ...(step ? ['step'] : [])], [1, rest]);
      return out;
    },
    /** Tremedeira em degraus (não passa pelo zero no meio). */
    treme: (a, b, amp, passo = 0.08) => {
      const out = [[0, 0], [f(a), 0]];
      for (let s = a, i = 0; s < b; s += passo, i++) out.push([f(s), i % 2 ? -amp : amp, 'step']);
      out.push([f(b), 0, 'step'], [1, 0]);
      return out;
    },
    /** Giro no próprio eixo (squashX 1 → -1 → 1) com voltas que podem acelerar. */
    giro: (a, b, voltas, { acelera = 1, rigido = false } = {}) => {
      const out = [[0, 1], [f(a), 1]];
      // Duração de cada volta: progressão geométrica (acelera > 1 = cada vez mais rápido).
      const pesos = Array.from({ length: voltas }, (_, i) => Math.pow(1 / acelera, i));
      const soma = pesos.reduce((x, y) => x + y, 0);
      let s = a;
      for (const p of pesos) {
        const d = ((b - a) * p) / soma;
        if (rigido) out.push([f(s + d * 0.25), -1, 'step'], [f(s + d * 0.75), 1, 'step']);
        else out.push([f(s + d * 0.25), 0.1], [f(s + d * 0.5), -1], [f(s + d * 0.75), 0.1], [f(s + d), 1]);
        s += d;
      }
      out.push([f(b), 1], [1, 1]);
      return out;
    },
  };
  return L;
}

// ------------------------------------------------------------------ peças reutilizadas
const lagrimas = (id, { quedaK = `${id}K` } = {}) => grupo(id, [
  { id: `${id}L`, fill: '#4fc3f7', alpha: 0.85, path: 'M74,46 C72,60 73,74 71,84 L76,84 C76,74 77,60 78,46 Z', ...CABECA, scaleBy: quedaK, scalePivot: [76, 46] },
  { id: `${id}R`, fill: '#4fc3f7', alpha: 0.85, path: 'M102,46 C104,60 103,74 105,84 L110,84 C108,74 107,60 106,46 Z', ...CABECA, scaleBy: quedaK, scalePivot: [104, 46] },
]);
const tontura = (id) => grupo(id, [
  { id: `${id}E`, fill: '#ffd54f', path: [estrela(58, -6, 6), estrela(90, -14, 7), estrela(122, -6, 6)].join(' '), ...CABECA, pivot: [90, -8], rot: `${id}Rot` },
]);
const fogo = (id, xs, y0 = 167) => grupo(id, xs.map(([x, h], i) => ({ id: `${id}${i}`, fill: i % 2 ? '#ff9800' : '#ff5722', path: chama(x, y0, h), scaleBy: i % 2 ? `${id}K` : `${id}K2`, scalePivot: [x + h * 0.15, y0] })), { outline: true });

// ------------------------------------------------------------------ os 50
// grupo: A brainrot e animais · B julgamento e reações · C shitpost e ego · D adulto, negro e absurdo.
// gatilhos: lazer, jogo, derrota, vitoria, conquista, ocioso, instagram, procrastinacao,
// tarefa, refeicao, erro, fimTrabalho. Peso maior = mais provável dentro do gatilho.
const V = [];
const def = (o) => V.push(o);

// ---------- GRUPO A
def({ num: 1, chave: 'droolingCat', nome: 'Gato Babando', referencia: 'Drooling Cat', grupo: 'A', dur: 6, gatilhos: ['refeicao'], fala: 'Isso aí é meu. Não discute, {nome}.',
  receita: { corpo: 'treme', cabeca: 'olhaUsuario' },
  faixas: (L) => ({ eyeScale: L.k([0, 1], [0.6, 1.55], [5.2, 1.55], [6, 1]), jaw: L.k([0, 0], [0.6, 0.85], [5.2, 0.85], [6, 0]), browShow: L.on(0.5, 5.5), brow: L.k([0, 0], [0.6, 1.2], [5.2, 1.2], [6, 0]),
    vr_baba: L.on(0.8, 5.5), vrBabaK: L.k([0.8, 0.08], [3.4, 1], [5.5, 1]), vr_poca: L.on(3.1, 5.5), vrPocaK: L.k([3.1, 0.1], [4.6, 1], [5.5, 1]) }),
  pecas: [
    grupo('vr_baba', [{ id: 'vrBaba', fill: '#4fc3f7', alpha: 0.88, path: 'M108,70 C107,96 110,124 108,160 C108,165 116,165 116,160 C114,124 117,96 116,70 Z', scaleBy: 'vrBabaK', scalePivot: [112, 70] }], { outline: true }),
    grupo('vr_poca', [{ id: 'vrPoca', fill: '#81d4fa', alpha: 0.85, path: elip(112, 165, 22, 3.5), scaleBy: 'vrPocaK', scalePivot: [112, 165] }]),
  ] });

def({ num: 2, chave: 'catThinking', nome: 'Gato Pensador', referencia: 'Cat Thinking', grupo: 'A', dur: 6.5, gatilhos: ['ocioso', 'lazer'], fala: 'Shhh. Tô calculando quantas séries faltam pra eu ficar mais perfeito.',
  receita: { bracos: 'maoBoca', rosto: 'pensando', cabeca: 'inclina' },
  faixas: (L) => ({ vr_formulas: L.on(0.5, 6.1), vr_f1: L.on(0.6, 6.1), vr_f2: L.on(1.5, 6.1), vr_f3: L.on(2.4, 6.1), vr_f4: L.on(3.3, 6.1), vr_f5: L.on(4.2, 6.1), vrFSobe: L.alt(0, -3, 0.6, 6, 8) }),
  pecas: [grupo('vr_formulas', [
    ...txt('vrF1', 26, 6, 'E = m·whey²', { extra: { showIf: 'vr_f1', dy: 'vrFSobe' } }),
    ...txt('vrF2', 156, 2, '∑ supino = ∞', { extra: { showIf: 'vr_f2', dy: 'vrFSobe' } }),
    ...txt('vrF3', 18, 46, '√shape', { extra: { showIf: 'vr_f3' } }),
    ...txt('vrF4', 162, 44, 'π ≠ proteína', { extra: { showIf: 'vr_f4', dy: 'vrFSobe' } }),
    ...txt('vrF5', 90, -16, 'x² + 1RM = eu', { extra: { showIf: 'vr_f5' } }),
  ])] });

def({ num: 3, chave: 'sideEyeCat', nome: 'Olhar de Lado', referencia: 'Side-Eye Cat', grupo: 'A', dur: 5, gatilhos: ['instagram'], fala: 'Instagram. De novo. Tô só olhando.',
  receita: { corpo: 'parado', semPiscar: true },
  faixas: (L) => ({ pupilX: L.k([0, 0], [0.6, 0], [1.1, 1], [4.2, 1], [4.7, 0]), browShow: L.on(0.4, 4.8), browAngry: L.k([0, 0], [1.1, 0.6], [4.2, 0.6], [4.7, 0]), mouthClose: L.k([0, 0], [1, 0.8], [4.4, 0.8], [5, 0]), vr_palpebra: L.on(0.9, 4.5) }),
  pecas: [grupo('vr_palpebra', [{ id: 'vrPalpebra', fill: 'body', path: 'M68,38 A11,12 0 0,1 90,38 Z M90,38 A11,12 0 0,1 112,38 Z', ...CABECA }], { outline: true })] });

def({ num: 4, chave: 'mrFresh', nome: 'Comilão Flagrado', referencia: 'Mr. Fresh', grupo: 'A', dur: 6.5, gatilhos: ['refeicao'], fala: 'Que foi? Nunca viu um predador se alimentando?',
  receita: {},
  faixas: (L) => ({ rootY: L.k([0, 0], [0.5, 14], [0.7, 18], [1.0, 12], [1.3, 18], [1.6, 12], [1.9, 18], [2.2, 12], [2.5, 18], [2.8, 12], [3.1, 18], [3.4, 12], [3.7, 18], [4.0, 14], [4.1, 0, 'step'], [6.5, 0]),
    jaw: L.k([0, 0], [0.5, 0.9], [0.8, 0.2], [1.1, 1], [1.4, 0.2], [1.7, 1], [2.0, 0.2], [2.3, 1], [2.6, 0.2], [2.9, 1], [3.2, 0.2], [3.5, 1], [3.8, 0.2], [4.1, 0, 'step'], [6.5, 0]),
    eyeScale: L.k([0, 1], [4.05, 1], [4.1, 1.45, 'step'], [5.6, 1.45], [6.2, 1]), happyEyes: L.k([0, 0], [0.5, 1, 'step'], [4.1, 0, 'step']), pupilY: L.k([0, 0], [4.1, 0.1, 'step'], [6.2, 0]),
    vr_mesa: L.on(0.2, 6), vr_migalha: L.on(1.2, 6) }),
  pecas: [
    grupo('vr_mesa', [
      { id: 'vrMesaTampo', fill: '#8d6e63', path: rect(26, 100, 128, 7) }, { id: 'vrMesaPeL', fill: '#6d4c41', path: rect(34, 107, 7, 60) }, { id: 'vrMesaPeR', fill: '#6d4c41', path: rect(139, 107, 7, 60) },
      { id: 'vrTigela', fill: '#e57373', path: 'M58,84 L122,84 C120,96 106,100 90,100 C74,100 60,96 58,84 Z' }, { id: 'vrTigelaBorda', fill: '#ffcdd2', path: elip(90, 84, 32, 4) },
      { id: 'vrRacao', fill: '#ffb74d', path: elip(90, 82, 26, 5) },
    ], { outline: true }),
    grupo('vr_migalha', [{ id: 'vrMigalhas', fill: '#ffb74d', path: [elip(66, 66, 3, 2.4), elip(116, 70, 2.6, 2.2), elip(104, 78, 2.2, 2), elip(74, 76, 2.4, 2)].join(' '), ...CABECA }], { outline: true }),
  ] });

def({ num: 5, chave: 'popCat', nome: 'Pop Tubarão', referencia: 'Pop Cat', grupo: 'A', dur: 4, gatilhos: ['lazer'], fala: null,
  receita: { corpo: 'parado', cabeca: 'olhaUsuario' },
  faixas: (L) => ({ jaw: L.alt(0, 1.4, 0.4, 3.4, 16, { step: true }), vr_pop: L.alt(0, 1, 0.4, 3.4, 16, { step: true }), eyeScale: L.k([0, 1], [0.3, 1.25], [3.5, 1.25], [4, 1]), cheeks: L.k([0, 0], [0.3, 0.6], [3.5, 0.6], [4, 0]) }),
  pecas: [grupo('vr_pop', [...txt('vrPop', 148, 28, 'POP', { size: 12, cor: '#d81b60', fundo: null })])] });

def({ num: 6, chave: 'maxwell', nome: 'Giro do Maxwell', referencia: 'Maxwell the Cat', grupo: 'A', dur: 6.5, gatilhos: ['lazer'], fala: null,
  receita: {},
  faixas: (L) => ({ squashX: L.giro(0.3, 5, 9, { acelera: 1.22 }), rootRot: L.k([0, 0], [5, 0], [5.4, -80], [6, -80], [6.5, 0]), rootY: L.k([0, 0], [5, 0], [5.4, 14], [6, 14], [6.5, 0]),
    eyeOpen: L.k([0, 1], [0.4, 0.7], [5, 0.7], [5.3, 1]), mouthClose: L.k([0, 0], [0.4, 0.8], [5, 0.8], [5.3, 0]), eyeX: L.on(5.3, 6.2), vr_tonto6: L.on(5.3, 6.3), vr_tonto6Rot: L.k([5.3, 0], [6.3, 360]) }),
  pecas: [tontura('vr_tonto6')] });

def({ num: 7, chave: 'oiia', nome: 'Oiia Oiia', referencia: 'Oiia Cat', grupo: 'A', dur: 6, gatilhos: ['lazer'], fala: null,
  receita: { semPiscar: true },
  faixas: (L) => ({ squashX: L.giro(0.4, 4.6, 14, { rigido: true }), eyeOpen: L.k([0, 1], [0.3, 0.5], [4.6, 0.5], [5, 1]), jaw: L.alt(0, 0.7, 0.4, 4.6, 12, { step: true }),
    rootRot: L.k([0, 0], [4.6, 0], [5, -90], [5.5, -90], [6, 0]), rootY: L.k([0, 0], [4.6, 0], [5, 14], [5.5, 14], [6, 0]), vr_oiia: L.on(0.5, 4.6) }),
  pecas: [grupo('vr_oiia', [...txt('vrOiia', 90, -14, 'OIIA OIIA', { size: 9, cor: '#6a1b9a' })])] });

def({ num: 8, chave: 'sadHamster', nome: 'Hamster Triste', referencia: 'Sad Hamster', grupo: 'A', dur: 6.5, gatilhos: ['derrota'], fala: 'Perdi. Não olha pra mim assim. Olha sim. Tô carente.',
  receita: { semPiscar: true },
  faixas: (L) => ({ scale: L.k([0, 1], [0.6, 0.86], [5.8, 0.86], [6.5, 1]), eyeScale: L.k([0, 1], [0.8, 1.5], [5.8, 1.5], [6.5, 1]), rootX: L.treme(1, 5.8, 0.8, 0.12),
    browShow: L.on(0.3, 6.2), brow: L.k([0, 0], [0.8, -1.5], [5.8, -1.5], [6.5, 0]), mouthClose: L.k([0, 0], [0.8, 1], [5.8, 1], [6.5, 0]), moodSad: L.k([0, 0], [1, 0.6], [5.8, 0.6], [6.5, 0]), pupilY: L.k([0, 0], [0.8, 0.2], [5.8, 0.2], [6.5, 0]),
    vr_brilhoOlho: L.on(0.8, 5.8), vr_lagHam: L.on(1.6, 5.8), vr_lagHamK: L.k([1.6, 0.1], [3.6, 1], [5.8, 1]) }),
  pecas: [
    grupo('vr_brilhoOlho', [{ id: 'vrBrilhoOlho', fill: '#ffffff', alpha: 0.95, path: [elip(75, 33, 4.5, 5), elip(97, 33, 4.5, 5), elip(83, 44, 2, 2), elip(105, 44, 2, 2)].join(' '), ...CABECA }, { id: 'vrAguaOlho', fill: '#81d4fa', alpha: 0.7, path: `${elip(79, 48, 9, 2.6)} ${elip(101, 48, 9, 2.6)}`, ...CABECA }]),
    lagrimas('vr_lagHam'),
  ] });

def({ num: 9, chave: 'chillGuy', nome: 'Cara Tranquilo', referencia: 'Chill Guy', grupo: 'A', dur: 7, gatilhos: ['fimTrabalho'], fala: 'Tô de boa. O mundo que lute.',
  receita: { bracos: 'escondeAtras', rosto: 'canto', cabeca: 'inclinaOutro' }, fx: ['fumaca'],
  faixas: (L) => ({ eyeOpen: L.k([0, 1], [0.5, 0.6], [6.4, 0.6], [7, 1]), vr_chill: L.on(0.3, 6.7), vr_caos: L.on(0.8, 6.6), vr_caosK: L.alt(0.8, 1.15, 0.8, 6.6, 18, { rest: 0.8 }), vr_caosK2: L.alt(1.1, 0.85, 0.8, 6.6, 18, { rest: 0.8 }) }),
  pecas: [
    grupo('vr_chill', [
      { id: 'vrChillCalca', fill: '#5c7cbf', path: 'M55,124 L125,124 L131,163 L92,163 L90,146 L88,163 L49,163 Z' },
      { id: 'vrChillTenis', fill: '#e53935', path: `${elip(70, 164, 22, 4.5)} ${elip(110, 164, 22, 4.5)}` },
      { id: 'vrChillMoletom', fill: '#9e9e9e', path: 'M50,84 C60,77 120,77 130,84 C140,92 140,104 136,112 C132,120 128,126 126,132 L54,132 C52,126 48,120 44,112 C40,104 40,92 50,84 Z' },
      { id: 'vrChillBolso', fill: '#8a8a8a', path: 'M64,112 L116,112 L112,128 L68,128 Z' },
      { id: 'vrChillGola', fill: '#bdbdbd', path: 'M70,82 C80,90 100,90 110,82 L106,80 C98,85 82,85 74,80 Z' },
    ], { outline: true }),
    fogo('vr_caos', [[16, 34], [34, 22], [150, 30], [168, 22]]),
  ] });

def({ num: 10, chave: 'tralalero', nome: 'Tralalero Tralalá', referencia: 'Tralalero Tralala', grupo: 'A', dur: 6.5, gatilhos: ['lazer'], fala: 'Tralalero, tralalá. Tubarão de tênis é outro nível.',
  receita: { rosto: 'sorrisao' }, fx: ['velocidade', 'poeira'],
  faixas: (L) => ({ rootX: L.alt(-55, 55, 0.4, 5.8, 8), rootRot: L.alt(-10, 10, 0.4, 5.8, 16, { step: true }), legBL: L.alt(-35, 35, 0.4, 5.8, 28, { step: true }), legBR: L.alt(35, -35, 0.4, 5.8, 28, { step: true }),
    squashY: L.alt(1.12, 0.9, 0.4, 5.8, 20, { rest: 1 }), rootY: L.alt(0, -10, 0.4, 5.8, 20), vr_tenis: L.on(0.2, 6.2) }),
  pecas: [grupo('vr_tenis', [
    { id: 'vrTenisL', fill: '#1e88e5', path: 'M42,156 C44,148 70,146 80,152 L92,160 L92,168 L40,168 Z', parent: 'legL' },
    { id: 'vrTenisR', fill: '#1e88e5', path: 'M138,156 C136,148 110,146 100,152 L88,160 L88,168 L140,168 Z', parent: 'legR' },
    { id: 'vrSolaL', fill: '#ffffff', path: rect(38, 166, 56, 5), parent: 'legL' }, { id: 'vrSolaR', fill: '#ffffff', path: rect(86, 166, 56, 5), parent: 'legR' },
    { id: 'vrTenisFaixa', fill: '#ffeb3b', path: 'M52,156 L74,152 L76,156 L54,160 Z M128,156 L106,152 L104,156 L126,160 Z' },
  ], { outline: true })] });

def({ num: 11, chave: 'huhCat', nome: 'Hã?', referencia: 'Huh? Cat', grupo: 'A', dur: 4.5, gatilhos: ['lazer'], fala: 'Hã?',
  receita: { semPiscar: true },
  faixas: (L) => ({ headRot: L.k([0, 0], [0.5, 18], [3.8, 18], [4.5, 0]), scale: L.k([0, 1], [0.6, 1.25], [3.8, 1.25], [4.5, 1]), rootY: L.k([0, 0], [0.6, -6], [3.8, -6], [4.5, 0]), eyeScale: L.k([0, 1], [0.6, 1.3], [3.8, 1.3], [4.5, 1]),
    browShow: L.on(0.3, 4.2), brow: L.k([0, 0], [0.7, 1.5], [1.6, -0.6], [2.4, 1.5], [3.8, 1.2], [4.5, 0]), jaw: L.k([0, 0], [0.6, 0.25], [3.8, 0.25], [4.5, 0]), vr_huh: L.on(0.7, 3.9) }),
  pecas: [grupo('vr_huh', [...txt('vrHuh', 150, 8, 'HÃ?', { size: 14, cor: '#e65100', fundo: null })])] });

def({ num: 12, chave: 'smurfCat', nome: 'Gato Smurf', referencia: 'Smurf Cat', grupo: 'A', dur: 6.5, gatilhos: ['lazer'], fala: 'Vivemos, amamos, mentimos. E eu malho.',
  receita: { corpo: 'desfile', rosto: 'contente' },
  faixas: (L) => ({ vrAzul: L.k([0, 0], [0.8, 1], [5.6, 1], [6.4, 0]), vr_cogumelo: L.on(0.6, 5.9), rootRot: L.alt(-6, 8, 0.6, 5.8, 10) }),
  pecas: [grupo('vr_cogumelo', [
    { id: 'vrCogumeloPe', fill: '#fff8e1', path: rect(80, 2, 20, 10), ...CABECA },
    { id: 'vrCogumeloChapeu', fill: '#ffffff', path: 'M54,6 C56,-24 124,-24 126,6 C110,2 70,2 54,6 Z', ...CABECA },
    { id: 'vrCogumeloPinta', fill: '#cfd8dc', path: [elip(72, -6, 5, 3.4), elip(94, -14, 6, 3.8), elip(112, -4, 4.4, 3)].join(' '), ...CABECA },
  ], { outline: true })] });

def({ num: 13, chave: 'pedroRaccoon', nome: 'Máquina de Lavar', referencia: 'Pedro Raccoon', grupo: 'A', dur: 6.5, gatilhos: ['lazer'], fala: null,
  receita: { rosto: 'contente' }, fx: ['bolhas'],
  // Gira em volta do próprio centro (o pivô do corpo é o pé, então desloca para compensar).
  faixas: (L) => {
    const rot = [], dx = [], dy = [];
    const a = 0.6, b = 5.6, voltas = 2, passos = 48;
    rot.push([0, 0], [a / L.D, 0]); dx.push([0, 0], [a / L.D, 0]); dy.push([0, 0], [a / L.D, 0]);
    for (let i = 1; i <= passos; i++) {
      const s = a + ((b - a) * i) / passos;
      const th = (360 * voltas * i) / passos;
      const r = (th * Math.PI) / 180;
      rot.push([s / L.D, th]);
      dx.push([s / L.D, r1(-77 * Math.sin(r))]);
      dy.push([s / L.D, r1(77 * Math.cos(r) - 77)]);
    }
    rot.push([(b + 0.02) / L.D, 0, 'step'], [1, 0]); dx.push([1, 0]); dy.push([1, 0]);
    return { rootRot: rot, rootX: dx, rootY: dy, vr_maquina: L.on(0.3, 6.1) };
  },
  fundo: [grupo('vr_maquinaAgua', [{ id: 'vrMaquinaAgua', fill: '#4fc3f7', alpha: 0.35, path: elip(90, 90, 84, 84) }], { showIf: 'vr_maquina' })],
  pecas: [grupo('vr_maquina', [
    { id: 'vrMaquinaAro', fill: '#b0bec5', path: anel(90, 90, 92, 9) },
    { id: 'vrMaquinaBrilho', fill: '#ffffff', alpha: 0.55, path: 'M40,52 C52,30 72,20 92,18 L92,24 C74,26 56,36 46,56 Z' },
  ], { outline: true })] });

def({ num: 14, chave: 'dancingToothless', nome: 'Dança Desdentada', referencia: 'Dancing Toothless', grupo: 'A', dur: 6.5, gatilhos: ['lazer'], fala: null,
  receita: { corpo: 'danca', rosto: 'sorrisao', repeticoes: 10 }, fx: ['notas'],
  faixas: (L) => ({ rootX: L.alt(-16, 16, 0.4, 6, 12), headRot: L.alt(8, -8, 0.4, 6, 12), happyEyes: L.on(0.4, 6.1), vr_gengiva: L.on(0.6, 6) }),
  // Sorriso sem dente: gengiva rosa por cima da boca.
  pecas: [grupo('vr_gengiva', [{ id: 'vrGengiva', fill: '#f48fb1', path: 'M64,64 C76,80 104,80 116,64 C104,72 76,72 64,64 Z', ...CABECA }], { outline: true })] });

def({ num: 15, chave: 'mooDeng', nome: 'Hipopótamo Bravo', referencia: 'Moo Deng', grupo: 'A', dur: 5.5, gatilhos: ['lazer'], fala: null,
  receita: { semPiscar: true }, fx: ['poeira'],
  faixas: (L) => ({ cheeks: L.k([0, 0], [0.3, 1], [4.8, 1], [5.3, 0]), jaw: L.k([0, 0], [0.6, 0.7], [4.8, 0.7], [5.3, 0]), rootX: L.k([0, 0], [0.8, 60], [1.2, 60], [2.2, -60], [2.6, -60], [3.6, 50], [4.0, 50], [4.9, 0]),
    squashX: L.k([0, 1], [0.8, 1], [0.85, -1, 'step'], [2.2, -1], [2.25, 1, 'step'], [3.6, 1], [3.65, -1, 'step'], [4.9, -1], [4.95, 1, 'step']), rootRot: L.alt(-8, 8, 0.6, 4.8, 18, { step: true }),
    legBL: L.alt(-30, 30, 0.6, 4.8, 24, { step: true }), legBR: L.alt(30, -30, 0.6, 4.8, 24, { step: true }), browShow: L.on(0.2, 5.2), browAngry: L.on(0.2, 5.2), vr_moo: L.on(0.4, 5) }),
  pecas: [grupo('vr_moo', [{ id: 'vrMooMolhado', fill: '#ffffff', alpha: 0.7, path: [elip(60, 30, 5, 3), elip(118, 24, 4, 2.6), elip(70, 100, 4, 2.4), elip(112, 104, 3.4, 2.2)].join(' ') }])] });

def({ num: 16, chave: 'screamingMarmot', nome: 'Marmota do Grito', referencia: 'Screaming Marmot', grupo: 'A', dur: 5, gatilhos: ['lazer'], fala: null,
  receita: { semPiscar: true }, fx: ['onda'],
  faixas: (L) => ({ rootY: L.k([0, 0], [0.4, -12], [4.4, -12], [5, 0]), headRot: L.k([0, 0], [1, -12], [3.8, -12], [4.4, 0]), pupilY: L.k([0, 0], [1, -1], [3.8, -1], [4.4, 0]), jaw: L.k([0, 0], [1.2, 1.5], [3.8, 1.5], [4.4, 0]),
    eyeScale: L.k([0, 1], [1.2, 1.3], [3.8, 1.3], [4.4, 1]), rootX: L.treme(1.3, 3.7, 1.2), vr_parapeito: L.on(0.2, 4.8) }),
  fundo: [grupo('vr_janela', [{ id: 'vrJanela', fill: '#90caf9', alpha: 0.4, path: rect(14, 20, 152, 140) }, { id: 'vrJanelaCruz', fill: '#eceff1', path: `${rect(88, 20, 4, 140)} ${rect(14, 88, 152, 4)}` }], { showIf: 'vr_parapeito' })],
  pecas: [grupo('vr_parapeito', [{ id: 'vrParapeito', fill: '#a1887f', path: rect(8, 154, 164, 9) }, { id: 'vrParapeitoSombra', fill: '#795548', path: rect(8, 163, 164, 4) }], { outline: true })] });

def({ num: 17, chave: 'pufferfish', nome: 'Baiacu', referencia: 'Pufferfish', grupo: 'A', dur: 6.5, gatilhos: ['refeicao'], fala: 'Comi rápido demais. Isso não é gordura, é ar de campeão.',
  receita: {},
  faixas: (L) => ({ jaw: L.k([0, 0], [0.3, 1.1], [0.9, 1.1], [1.0, 0, 'step']), vr_peixe: L.on(0.2, 1.0), vrPeixeX: L.k([0.2, 50], [0.95, 0]),
    scale: L.k([0, 1], [1.2, 1], [2, 1.45], [2.2, 1.38], [5, 1.42], [5.4, 0.95], [5.7, 1.04], [6.1, 1]), squashX: L.k([0, 1], [1.2, 1], [2, 1.18], [5, 1.18], [5.5, 1]),
    rootY: L.k([0, 0], [2, 0], [2.6, -26], [3.3, -20], [4.0, -28], [4.7, -20], [5.2, 0]), cheeks: L.k([0, 0], [1.1, 1, 'step'], [5.2, 1], [5.4, 0, 'step']), eyeScale: L.k([0, 1], [2, 1.3], [5, 1.3], [5.5, 1]),
    vr_espinhos: L.on(1.7, 5.3), vrInfla: L.k([1.7, 0.4], [2.1, 1], [5, 1], [5.3, 0.4]), fx_vento: 0 }),
  pecas: [
    grupo('vr_peixe', [{ id: 'vrPeixe', fill: '#ff8a65', path: 'M92,70 C96,64 106,64 110,70 C106,76 96,76 92,70 Z M110,70 L118,64 L118,76 Z', dx: 'vrPeixeX' }], { outline: true }),
    grupo('vr_espinhos', [{ id: 'vrEspinhos', fill: '#fff59d', path: Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; const c = [90, 96]; const p = (rr, d) => `${r1(c[0] + Math.cos(a + d) * rr)},${r1(c[1] + Math.sin(a + d) * rr * 0.95)}`; return `M${p(52, -0.09)} L${p(66, 0)} L${p(52, 0.09)} Z`; }).join(' '), scaleBy: 'vrInfla', scalePivot: [90, 96] }], { outline: true }),
  ] });

def({ num: 18, chave: 'nyanCat', nome: 'Nyan Tubarão', referencia: 'Nyan Cat', grupo: 'A', dur: 6, gatilhos: ['lazer'], fala: null, pixel: [0.4, 5.6],
  receita: {}, fx: ['estrelas'],
  faixas: (L) => ({ rootX: L.k([0, 0], [0.4, -60], [5.6, 60], [6, 0]), rootY: L.alt(-14, -20, 0.4, 5.6, 14, { step: true }), rootRot: L.k([0, 0], [0.4, 8], [5.6, 8], [6, 0]), legBL: L.alt(-20, 20, 0.4, 5.6, 20, { step: true }), legBR: L.alt(20, -20, 0.4, 5.6, 20, { step: true }), vr_nyan: L.on(0.4, 5.6), vrArcoY: L.alt(0, 3, 0.4, 5.6, 14, { step: true }) }),
  fundo: [grupo('vr_nyan', [
    ...['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'].map((c, i) => ({ id: `vrArco${i}`, fill: c, path: rect(-170, 60 + i * 9, 220, 9), dy: i % 2 ? 'vrArcoY' : undefined })),
    { id: 'vrTorrada', fill: '#ffcc80', path: rect(44, 74, 92, 64) }, { id: 'vrTorradaRecheio', fill: '#f48fb1', path: rect(52, 82, 76, 48) },
    { id: 'vrConfeitos', fill: '#d81b60', path: [rect(62, 90, 4, 4), rect(84, 100, 4, 4), rect(108, 88, 4, 4), rect(72, 116, 4, 4), rect(116, 112, 4, 4)].join(' ') },
  ])] });

def({ num: 19, chave: 'sideEyeDog', nome: 'Cachorro Desconfiado', referencia: 'Side-Eye Dog', grupo: 'A', dur: 6, gatilhos: ['instagram'], fala: 'Hmm. Tô vendo isso aí.',
  receita: { semPiscar: true },
  faixas: (L) => ({ pupilX: L.k([0, 0], [0.5, -1], [4.5, 1], [5, 1], [5.6, 0]), headRot: L.k([0, 0], [0.5, -5], [4.5, 5], [5, 5], [5.6, 0]), browShow: L.on(0.3, 5.7), browAngry: L.k([0, 0], [0.5, 0.5], [5, 0.5], [5.6, 0]), mouthClose: L.k([0, 0], [0.5, 0.9], [5.6, 0.9], [6, 0]),
    scale: L.k([0, 1], [4.6, 1], [4.75, 1.35, 'step'], [5.6, 1.35], [6, 1]), vr_zoom: L.on(4.75, 5.7) }),
  fundo: [grupo('vr_zoom', [{ id: 'vrZoomVinheta', fill: '#000000', alpha: 0.55, path: `${elip(90, 80, 150, 140)} ${furo(90, 80, 96, 92)}` }])] });

def({ num: 20, chave: 'aiKittens', nome: 'Dança de IA', referencia: 'AI Kittens Dancing', grupo: 'A', dur: 7, gatilhos: ['lazer'], fala: 'Isso é arte gerada. Eu que gerei. Com o bíceps.',
  receita: { rosto: 'sorriso' },
  faixas: (L) => ({ rootX: L.alt(-10, 10, 0.3, 6.6, 14), rootRot: L.k([0, 0], [0.3, -6], [0.8, 6], [1.3, -6], [1.8, 6], [2.3, -6], [2.8, 6], [3.3, -14], [3.8, 22], [4.3, -30], [4.8, 40], [5.3, -20], [6.0, 10], [6.6, 0]),
    squashX: L.k([0, 1], [3, 1], [3.6, 1.4], [4.2, 0.6], [4.8, 1.6], [5.4, 0.7], [6.2, 1], [7, 1]), squashY: L.k([0, 1], [3, 1], [3.6, 0.7], [4.2, 1.5], [4.8, 0.6], [5.4, 1.3], [6.2, 1], [7, 1]),
    headRot: L.k([0, 0], [3.3, 0], [4, 40], [4.6, -50], [5.2, 30], [6.2, 0]), eyeScale: L.k([0, 1], [3.5, 1], [4.2, 1.6], [4.8, 0.7], [5.6, 1.4], [6.4, 1]), vr_ia: L.on(3.6, 6.3) }),
  pecas: [grupo('vr_ia', [
    { id: 'vrTerceiroOlho', fill: 'sclera', path: elip(90, 20, 7, 6), ...CABECA }, { id: 'vrTerceiroPupila', fill: '#111111', path: elip(90, 21, 3, 3), ...CABECA },
    { id: 'vrDedosExtra', fill: 'body', path: 'M24,150 L18,160 L22,161 L28,152 Z M30,154 L28,166 L32,166 L34,155 Z M150,150 L156,161 L160,159 L154,149 Z', parent: 'foreL' },
  ], { outline: true })] });

// ---------- GRUPO B
def({ num: 21, chave: 'womanYelling', nome: 'Gritaria na Mesa', referencia: 'Woman Yelling at a Cat', grupo: 'B', dur: 6.5, gatilhos: ['lazer'], fala: 'Eu? Só tô jantando. Calmamente. Superior.',
  receita: { bracos: 'cruzados', rosto: 'entediado' },
  faixas: (L) => ({ rootY: L.k([0, 0], [0.3, 22], [6.1, 22], [6.5, 0]), headRot: L.k([0, 0], [1, -6], [6, -6], [6.5, 0]), browShow: L.on(1, 6), brow: L.k([1, 0], [3.4, 0], [3.6, 1.2], [4.4, 1.2], [4.6, 0]),
    vr_mesa21: L.on(0.2, 6.3), vr_grito1: L.on(0.8, 3.2), vr_grito2: L.on(3.4, 6), vrGritoX: L.treme(0.8, 6, 1.5, 0.1) }),
  pecas: [grupo('vr_mesa21', [
    { id: 'vrMesa21', fill: '#eceff1', path: rect(24, 112, 132, 8) }, { id: 'vrMesa21Pe', fill: '#b0bec5', path: `${rect(32, 120, 6, 47)} ${rect(142, 120, 6, 47)}` },
    { id: 'vrPrato', fill: '#ffffff', path: elip(108, 110, 20, 4) }, { id: 'vrSalada', fill: '#66bb6a', path: elip(108, 106, 13, 4.5) },
    ...txt('vrGrito1', 30, 4, 'VOCÊ COMEU MEU WHEY!', { size: 6, cor: '#b71c1c', w: 80, extra: { showIf: 'vr_grito1', dx: 'vrGritoX' } }),
    ...txt('vrGrito2', 30, 4, 'AAAAH! EU VI!', { size: 7, cor: '#b71c1c', w: 64, extra: { showIf: 'vr_grito2', dx: 'vrGritoX' } }),
  ], { outline: true })] });

def({ num: 22, chave: 'thisIsFine', nome: 'Tá Tudo Bem', referencia: 'This Is Fine', grupo: 'B', dur: 7, gatilhos: ['erro'], fala: 'Tá tudo bem. Tá pegando fogo, mas tá ótimo.',
  receita: { bracos: 'bebe', rosto: 'canto', objeto: 'cafe' }, fx: ['fumaca'],
  faixas: (L) => ({ vr_fine: L.on(0.3, 6.7), vr_fineK: L.alt(0.85, 1.15, 0.3, 6.7, 22, { rest: 0.85 }), vr_fineK2: L.alt(1.1, 0.85, 0.3, 6.7, 22, { rest: 0.85 }), eyeOpen: L.k([0, 1], [0.5, 0.7], [6.4, 0.7], [7, 1]), vr_chapeu22: L.on(0.2, 6.8) }),
  pecas: [
    fogo('vr_fine', [[8, 46], [24, 30], [40, 18], [140, 20], [156, 34], [172, 44]]),
    grupo('vr_chapeu22', [{ id: 'vrChapeu22Aba', fill: '#5d4037', path: elip(90, 12, 40, 5), ...CABECA }, { id: 'vrChapeu22Copa', fill: '#6d4c41', path: 'M66,12 C66,-10 114,-10 114,12 Z', ...CABECA }], { outline: true }),
  ] });

def({ num: 23, chave: 'disasterGirl', nome: 'Menina do Desastre', referencia: 'Disaster Girl', grupo: 'B', dur: 6, gatilhos: ['lazer'], fala: 'Não fui eu. Mas foi lindo.',
  receita: { semPiscar: true },
  faixas: (L) => ({ pupilX: L.k([0, 0], [0.5, -1], [2.6, -1], [4, 0.1], [5.5, 0.1], [6, 0]), headRot: L.k([0, 0], [0.5, -8], [2.6, -8], [4, 0]), jaw: L.k([0, 0], [4, 0], [4.4, 0.3], [5.6, 0.3], [6, 0]), browShow: L.on(3.8, 5.8),
    brow: L.k([3.8, 0], [4.4, 1.1], [5.6, 1.1], [5.8, 0]), eyeOpen: L.k([0, 1], [4, 1], [4.4, 0.7], [5.6, 0.7], [6, 1]), vr_casa: L.on(0.3, 5.8), vr_casaK: L.alt(0.8, 1.2, 0.3, 5.8, 16, { rest: 0.8 }), vr_casaK2: L.alt(1.15, 0.85, 0.3, 5.8, 16, { rest: 0.85 }) }),
  fundo: [grupo('vr_casaG', [
    { id: 'vrCasa', fill: '#ffe0b2', path: rect(-30, 112, 44, 40) }, { id: 'vrCasaTelhado', fill: '#8d6e63', path: 'M-36,114 L-8,88 L20,114 Z' }, { id: 'vrCasaJanela', fill: '#ffa000', path: `${rect(-24, 122, 10, 10)} ${rect(-2, 122, 10, 10)}` },
  ], { showIf: 'vr_casa', outline: true }), fogo('vr_casa', [[-26, 30], [-10, 40], [8, 28]], 112)] });

def({ num: 24, chave: 'surprisedPikachu', nome: 'Surpresa Elétrica', referencia: 'Surprised Pikachu', grupo: 'B', dur: 5.5, gatilhos: ['lazer'], fala: null,
  receita: { semPiscar: true },
  faixas: (L) => ({ legFR: L.k([0, 6], [0.5, 70], [1.4, 70], [1.8, 6]), elbowR: L.k([0, 12], [0.5, 0], [1.4, 0], [1.8, 12]), pupilX: L.k([0, 0], [0.4, 1], [2.4, 1], [2.8, 0]),
    vr_vaso: L.on(0.2, 5.2), vrVasoRot: L.k([0, 0], [1.2, 0], [1.8, 90]), vrVasoY: L.k([0, 0], [1.6, 0], [1.9, 10]), vr_vasoInteiro: L.on(0.2, 2.2), vr_cacos: L.on(2.2, 5.2),
    jaw: L.k([0, 0], [2.6, 0], [2.7, 0.55, 'step'], [4.9, 0.55], [5.4, 0]), eyeScale: L.k([0, 1], [2.6, 1], [2.7, 1.35, 'step'], [4.9, 1.35], [5.4, 1]), browShow: L.on(2.7, 5) }),
  pecas: [grupo('vr_vaso', [
    { id: 'vrPedestal', fill: '#bcaaa4', path: rect(150, 132, 22, 35) },
    { id: 'vrVaso', fill: '#5c6bc0', path: 'M152,132 C148,116 154,106 158,102 L164,102 C168,106 174,116 170,132 Z', showIf: 'vr_vasoInteiro', pivot: [170, 132], rot: 'vrVasoRot', dy: 'vrVasoY' },
    { id: 'vrCacos', fill: '#5c6bc0', path: 'M134,164 L142,158 L146,166 Z M150,166 L156,160 L162,166 Z M164,165 L170,159 L176,166 Z', showIf: 'vr_cacos' },
  ], { outline: true })] });

def({ num: 25, chave: 'blinkingGuy', nome: 'Pisca-Pisca Incrédulo', referencia: 'Blinking White Guy', grupo: 'B', dur: 4.5, gatilhos: ['lazer'], fala: null,
  receita: { semPiscar: true },
  faixas: (L) => ({ eyeOpen: L.k([0, 1], [1.0, 1], [1.05, 0, 'step'], [1.2, 1, 'step'], [1.5, 1], [1.55, 0, 'step'], [1.7, 1, 'step']), headRot: L.k([0, 0], [1.8, 0], [2.1, -9], [3.9, -9], [4.5, 0]), rootX: L.k([0, 0], [1.8, 0], [2.1, -5], [3.9, -5], [4.5, 0]),
    pupilX: L.k([0, 0], [0.3, 0.35], [3.9, 0.35], [4.5, 0]), browShow: L.on(0.6, 4.2), brow: L.k([0.6, 0], [1, 1.3], [3.9, 1.3], [4.2, 0]), mouthClose: L.k([0, 0], [0.6, 0.8], [3.9, 0.8], [4.5, 0]) }),
  pecas: [] });

def({ num: 26, chave: 'absoluteCinema', nome: 'Cinema Absoluto', referencia: 'Absolute Cinema', grupo: 'B', dur: 6, gatilhos: ['tarefa'], fala: 'Cinema. Absoluto cinema.',
  receita: { rosto: 'orgulhoso' }, fx: ['holofote', 'legenda:ABSOLUTE CINEMA'],
  faixas: (L) => ({ vrCinza: L.k([0, 0], [0.6, 1], [5.4, 1], [6, 0]), legFL: L.k([0, 6], [0.8, 112], [5.2, 112], [6, 6]), legFR: L.k([0, 6], [0.8, 112], [5.2, 112], [6, 6]), elbowL: L.k([0, 12], [0.8, 30], [5.2, 30], [6, 12]), elbowR: L.k([0, 12], [0.8, 30], [5.2, 30], [6, 12]),
    eyeOpen: L.k([0, 1], [0.8, 0.15], [5.2, 0.15], [6, 1]), headRot: L.k([0, 0], [0.8, -4], [5.2, -4], [6, 0]), vr_cinema: L.on(0.5, 5.6) }),
  pecas: [grupo('vr_cinema', [{ id: 'vrFaixaTopo', fill: '#000000', path: rect(-40, -34, 260, 18) }, { id: 'vrFaixaBase', fill: '#000000', path: rect(-40, 172, 260, 18) }])] });

def({ num: 27, chave: 'mrIncredible', nome: 'Sr. Incrível Perturbado', referencia: 'Mr. Incredible Uncanny', grupo: 'B', dur: 8, gatilhos: ['lazer', 'erro'], fala: null,
  receita: { semPiscar: true },
  faixas: (L) => ({ jaw: L.k([0, 0], [0.4, 0.45], [1.9, 0.45], [2.1, 0, 'step'], [5.9, 0], [6.1, 0.3, 'step'], [7.6, 0.3], [8, 0]), moodJoy: L.k([0, 0], [0.4, 0.4], [1.9, 0.4], [2.1, 0, 'step']),
    browShow: L.on(2, 7.7), brow: L.k([2, 0], [2.2, -0.8], [3.9, -0.8], [4.1, -1.5, 'step'], [7.6, -1.5], [8, 0]), pupilX: L.alt(-0.4, 0.4, 2.1, 3.9, 6), mouthClose: L.k([2, 0], [2.2, 0.6], [5.9, 0.6], [6.1, 0, 'step']),
    eyeScale: L.k([0, 1], [4, 1], [4.1, 1.35, 'step'], [5.9, 1.35], [6.1, 0.8, 'step'], [7.6, 0.8], [8, 1]), moodScared: L.k([0, 0], [4, 0], [4.1, 0.6, 'step'], [5.9, 0.6], [6.1, 0, 'step']),
    vrCinza: L.k([0, 0], [6, 0], [6.1, 1, 'step'], [7.6, 1], [8, 0]), vr_trevas: L.on(6.1, 7.7), vr_fase1: L.on(0.2, 2), vr_fase2: L.on(2.1, 4), vr_fase3: L.on(4.1, 6), vr_fase4: L.on(6.1, 7.7), vr_olhoVazio: L.on(6.1, 7.7) }),
  fundo: [grupo('vr_trevas', [{ id: 'vrTrevas', fill: '#000000', alpha: 0.6, path: elip(90, 84, 118, 104) }, { id: 'vrTrevas2', fill: '#000000', alpha: 0.5, path: elip(90, 84, 92, 84) }])],
  pecas: [
    grupo('vr_olhoVazio', [{ id: 'vrOlhoVazio', fill: '#000000', path: `${elip(79, 40, 9, 11)} ${elip(101, 40, 9, 11)}`, ...CABECA }]),
    grupo('vr_fases', [
      ...txt('vrFase1', 160, 10, 'FASE 1: CONFIANTE', { size: 6, w: 66, extra: { showIf: 'vr_fase1' } }),
      ...txt('vrFase2', 160, 10, 'FASE 2: HMM', { size: 6, w: 66, extra: { showIf: 'vr_fase2' } }),
      ...txt('vrFase3', 160, 10, 'FASE 3: MEDO', { size: 6, w: 66, extra: { showIf: 'vr_fase3' } }),
      ...txt('vrFase4', 160, 10, 'FASE 4: O VAZIO', { size: 6, w: 66, cor: '#ffffff', fundo: '#212121', extra: { showIf: 'vr_fase4' } }),
    ], { showIf: null }),
  ] });

def({ num: 28, chave: 'gruPlan', nome: 'O Plano do Vilão', referencia: "Gru's Plan", grupo: 'B', dur: 8.5, gatilhos: ['lazer'], fala: 'Plano perfeito. Quase.',
  receita: {},
  faixas: (L) => ({ vr_lousa: L.on(0.2, 8.2), vr_s1: L.on(0.5, 2.5), vr_s2: L.on(2.6, 4.6), vr_s3: L.on(4.7, 6.3), vr_s4: L.on(6.4, 8.1),
    legFR: L.k([0, 6], [0.5, 70], [6.2, 70], [6.5, 6]), elbowR: L.k([0, 12], [0.5, 0], [6.2, 0], [6.5, 12]), pupilX: L.k([0, 0], [0.5, 1], [6.3, 1], [6.5, 0], [6.9, 1], [7.3, 0], [8.5, 0]),
    jaw: L.k([0, 0], [0.5, 0.4], [4.6, 0.4], [4.7, 0, 'step'], [6.5, 0], [6.6, 0.8, 'step'], [8.1, 0.8], [8.5, 0]), eyeScale: L.k([0, 1], [6.5, 1], [6.6, 1.35, 'step'], [8.1, 1.35], [8.5, 1]), browShow: L.on(5, 8.2), brow: L.k([5, 0], [5.3, -1], [8, -1], [8.3, 0]) }),
  pecas: [grupo('vr_lousa', [
    { id: 'vrCavalete', fill: '#6d4c41', path: 'M128,110 L122,167 L126,167 L132,110 Z M168,110 L174,167 L170,167 L164,110 Z' },
    { id: 'vrLousa', fill: '#fafafa', path: rect(112, 40, 72, 72) },
    ...txt('vrS1', 148, 76, '1. ACORDAR 5H', { size: 6, fundo: null, extra: { showIf: 'vr_s1' } }),
    ...txt('vrS2', 148, 76, '2. TREINAR PEITO', { size: 6, fundo: null, extra: { showIf: 'vr_s2' } }),
    ...txt('vrS3', 148, 76, '3. PULAR PERNA', { size: 6, fundo: null, extra: { showIf: 'vr_s3' } }),
    ...txt('vrS4', 148, 70, '3. PULAR PERNA', { size: 6, fundo: null, extra: { showIf: 'vr_s4' } }),
    ...txt('vrS4b', 148, 84, '(cair de cara)', { size: 6, cor: '#c62828', fundo: null, extra: { showIf: 'vr_s4' } }),
  ], { outline: true })] });

def({ num: 29, chave: 'kevinJames', nome: 'Sorriso Sem Graça', referencia: 'Kevin James Smirking', grupo: 'B', dur: 5, gatilhos: ['lazer'], fala: 'Eu? Nada não. Tava passando.',
  receita: { bracos: 'escondeAtras', cabeca: 'olhaLado', rosto: 'sorriso' },
  faixas: (L) => ({ blush: L.k([0, 0], [0.6, 0.8], [4.4, 0.8], [5, 0]), browShow: L.on(0.4, 4.6), brow: L.k([0.4, 0], [0.8, 0.8], [4.4, 0.8], [4.8, 0]), rootY: L.alt(0, -2, 0.6, 4.4, 8), vr_jaqueta: L.on(0.3, 4.7) }),
  pecas: [grupo('vr_jaqueta', [
    { id: 'vrJaqueta', fill: '#263238', path: 'M50,84 C60,78 78,78 82,84 L86,132 L54,132 C50,124 44,118 42,108 C38,98 42,90 50,84 Z M130,84 C120,78 102,78 98,84 L94,132 L126,132 C130,124 136,118 138,108 C142,98 138,90 130,84 Z' },
    { id: 'vrCamisa', fill: '#eceff1', path: 'M82,84 L98,84 L94,132 L86,132 Z' },
  ], { outline: true })] });

def({ num: 30, chave: 'pedroPascal', nome: 'Rindo e Chorando', referencia: 'Pedro Pascal Laughing Then Crying', grupo: 'B', dur: 7, gatilhos: ['derrota', 'lazer'], fala: 'Ha. Ha. Ah não.',
  receita: { semPiscar: true },
  faixas: (L) => ({ jaw: L.k([0, 0], [0.3, 0.5], [0.5, 1.1], [0.7, 0.5], [0.9, 1.1], [1.1, 0.5], [1.3, 1.1], [1.5, 0.5], [1.7, 1.1], [1.9, 0.5], [2.1, 1.1], [2.4, 0.5], [2.9, 0, 'step'], [3.6, 0], [3.9, 0.6], [4.3, 0.2], [4.7, 0.7], [5.1, 0.2], [5.5, 0.7], [5.9, 0.2], [6.5, 0]),
    happyEyes: L.k([0, 0], [0.3, 1, 'step'], [2.9, 0, 'step']), rootY: L.alt(0, -3, 0.3, 2.8, 12), eyeScale: L.k([0, 1], [2.9, 1.35, 'step'], [3.6, 1.35], [3.8, 1]),
    browShow: L.on(3.4, 6.8), brow: L.k([3.4, 0], [3.8, -1.5], [6.4, -1.5], [6.8, 0]), moodSad: L.k([0, 0], [3.6, 0], [4.2, 0.8], [6.4, 0.8], [7, 0]), eyeOpen: L.k([0, 1], [3.6, 1], [4, 0.4], [6.4, 0.4], [7, 1]),
    vr_lagPP: L.on(3.8, 6.6), vr_lagPPK: L.k([3.8, 0.1], [5, 1], [6.6, 1]) }),
  pecas: [lagrimas('vr_lagPP')] });

// ---------- GRUPO C
def({ num: 31, chave: 'drake', nome: 'Aprova e Reprova', referencia: 'Drakeposting', grupo: 'C', dur: 7, gatilhos: ['lazer'], fala: 'Cardio? Nojo. Supino? Amor eterno.',
  receita: {},
  faixas: (L) => ({ vr_drake: L.on(0.3, 6.8), vr_drakeSim: L.on(3.4, 6.8),
    headRot: L.k([0, 0], [0.5, -14], [3.2, -14], [3.6, 8], [6.6, 8], [7, 0]), legFR: L.k([0, 6], [0.5, 70], [3.2, 70], [3.6, 72], [6.6, 72], [7, 6]), elbowR: L.k([0, 12], [0.5, 120], [3.2, 120], [3.6, 0], [6.6, 0], [7, 12]),
    browShow: L.on(0.4, 6.8), browAngry: L.k([0, 0], [0.5, 1], [3.2, 1], [3.4, 0, 'step']), tongue: L.k([0, 0], [0.6, 0.8], [3.2, 0.8], [3.4, 0, 'step']), eyeOpen: L.k([0, 1], [0.5, 0.4], [3.2, 0.4], [3.4, 1, 'step']),
    jaw: L.k([0, 0], [0.5, 0.6], [3.2, 0.6], [3.6, 0.9], [6.6, 0.9], [7, 0]), happyEyes: L.on(3.6, 6.6), pupilX: L.k([0, 0], [3.4, 0], [3.6, 1], [6.6, 1], [7, 0]) }),
  pecas: [grupo('vr_drake', [
    { id: 'vrDrakeTopo', fill: '#ffcdd2', path: rect(124, 30, 54, 44) }, { id: 'vrDrakeBase', fill: '#c8e6c9', path: rect(124, 80, 54, 44) },
    ...txt('vrDrakeCardio', 151, 52, 'CARDIO', { size: 7, fundo: null }), ...txt('vrDrakeX', 170, 38, '✗', { size: 8, cor: '#c62828', fundo: null }),
    ...txt('vrDrakeSupino', 151, 102, 'SUPINO', { size: 7, fundo: null, extra: { showIf: 'vr_drakeSim' } }), ...txt('vrDrakeOk', 170, 88, '✓', { size: 8, cor: '#2e7d32', fundo: null, extra: { showIf: 'vr_drakeSim' } }),
  ], { outline: true })] });

def({ num: 32, chave: 'npcWojak', nome: 'Modo NPC', referencia: 'NPC Wojak', grupo: 'C', dur: 6.5, gatilhos: ['ocioso', 'lazer'], fala: null,
  receita: { semPiscar: true },
  faixas: (L) => ({ vrCinza: L.k([0, 0], [0.5, 1], [6, 1], [6.5, 0]), eyeOpen: L.k([0, 1], [0.5, 0.55], [6, 0.55], [6.5, 1]), mouthClose: L.k([0, 0], [0.5, 1], [6, 1], [6.5, 0]),
    headRot: L.alt(0, 10, 0.6, 5.8, 10, { step: true }), legFR: L.alt(6, 60, 0.6, 5.8, 10, { rest: 6, step: true }), elbowR: L.alt(12, 90, 0.6, 5.8, 10, { rest: 12, step: true }), rootX: L.alt(0, 6, 0.6, 5.8, 10, { step: true }), vr_npc: L.on(0.8, 5.9) }),
  pecas: [grupo('vr_npc', [...txt('vrNpc', 90, -14, '> carregando opinião...', { size: 7, cor: '#424242', fundo: '#e0e0e0', w: 96 })])] });

def({ num: 33, chave: 'cryingMask', nome: 'Máscara que Cai', referencia: 'Crying Wojak Mask', grupo: 'C', dur: 7, gatilhos: ['derrota'], fala: 'Tô ótimo. Tô ÓTIMO. …Não tô.',
  receita: { semPiscar: true },
  faixas: (L) => ({ vr_mascara: L.on(0.3, 4.4), vrMascaraY: L.k([0, 0], [3, 0], [3.4, 6], [4.2, 70]), vrMascaraRot: L.k([0, 0], [3.4, 0], [4.2, 30]),
    browShow: L.on(2.9, 6.8), brow: L.k([2.9, -1.5], [6.6, -1.5], [7, 0]), jaw: L.k([0, 0], [3.4, 0.3], [3.8, 0.8], [4.2, 0.3], [4.6, 0.8], [5, 0.3], [5.4, 0.8], [5.8, 0.3], [6.6, 0]), moodSad: L.k([0, 0], [2.9, 0], [3.4, 0.7], [6.6, 0.7], [7, 0]), eyeOpen: L.k([0, 1], [2.9, 1], [3.2, 0.4], [6.6, 0.4], [7, 1]),
    vr_lagMask: L.on(3.6, 6.6), vr_lagMaskK: L.k([3.6, 0.1], [4.8, 1], [6.6, 1]) }),
  pecas: [
    lagrimas('vr_lagMask'),
    grupo('vr_mascara', [
      { id: 'vrMascara', fill: '#fafafa', path: 'M52,40 C52,14 128,14 128,40 C128,70 112,84 90,84 C68,84 52,70 52,40 Z', ...CABECA, dy: 'vrMascaraY' },
      { id: 'vrMascaraOlhos', fill: '#212121', path: 'M68,36 C72,30 82,30 86,36 C82,33 72,33 68,36 Z M94,36 C98,30 108,30 112,36 C108,33 98,33 94,36 Z', ...CABECA, dy: 'vrMascaraY' },
      { id: 'vrMascaraSorriso', fill: '#212121', path: 'M66,56 C76,74 104,74 114,56 C104,66 76,66 66,56 Z', ...CABECA, dy: 'vrMascaraY' },
      { id: 'vrMascaraFita', fill: '#9e9e9e', path: `${rect(40, 36, 12, 3)} ${rect(128, 36, 12, 3)}`, ...CABECA, dy: 'vrMascaraY' },
    ], { outline: true }),
  ] });

def({ num: 34, chave: 'trollface', nome: 'Cara de Troll', referencia: 'Trollface', grupo: 'C', dur: 5.5, gatilhos: ['lazer'], fala: 'Problem?',
  receita: { semPiscar: true },
  faixas: (L) => ({ vrCinza: L.k([0, 0], [0.4, 1], [3.4, 1], [3.8, 0]), vr_troll: L.on(0.5, 3.4), eyeOpen: L.k([0, 1], [0.5, 0.35], [3.4, 0.35], [3.6, 1]),
    wink: L.k([0, 0], [3.8, 1, 'step'], [4.8, 0, 'step']), legFR: L.k([0, 6], [3.5, 6], [3.9, -28], [5, -28], [5.5, 6]), elbowR: L.k([0, 12], [3.5, 12], [3.9, -118], [5, -118], [5.5, 12]), pupilX: L.k([0, 0], [3.6, 0], [3.9, 0.9], [5, 0.9], [5.5, 0]) }),
  pecas: [grupo('vr_troll', [
    { id: 'vrTrollSorriso', fill: '#ffffff', path: 'M46,50 C56,90 124,90 134,46 C120,62 60,64 46,50 Z', ...CABECA },
    { id: 'vrTrollDentes', fill: '#212121', path: [62, 74, 86, 98, 110, 122].map((x) => rect(x, 58, 1.4, 14)).join(' '), ...CABECA },
    { id: 'vrTrollRugas', fill: '#212121', path: 'M58,30 L74,26 L74,28 L58,32 Z M122,30 L106,26 L106,28 L122,32 Z M44,48 C42,56 44,62 48,66 L49,64 C46,60 45,55 46,49 Z', ...CABECA },
  ], { outline: true })] });

def({ num: 35, chave: 'sigma', nome: 'Rotina Sigma', referencia: 'Sigma Grindset', grupo: 'C', dur: 7, gatilhos: ['jogo', 'lazer'], fala: 'Acordei às 4h, tomei banho gelado e ignorei sentimentos. Sigma.',
  receita: { bracos: 'cruzados', cabeca: 'olhaLado', rosto: 'canto' },
  faixas: (L) => ({ vr_sigma: L.on(0.3, 6.7), vr_grafico: L.on(0.8, 6.6), vrGraficoK: L.k([0.8, 0.2], [2.4, 1], [6.6, 1]), rootY: L.alt(0, -1.5, 0.6, 6.4, 6) }),
  pecas: [
    grupo('vr_sigma', [
      { id: 'vrOculosSigma', fill: '#111111', path: 'M64,32 L90,32 L88,46 C84,50 70,50 66,46 Z M90,32 L116,32 L114,46 C110,50 96,50 92,46 Z M60,32 L120,32 L120,35 L60,35 Z', ...CABECA },
      { id: 'vrGravataSigma', fill: '#b71c1c', path: 'M86,84 L94,84 L92,90 L97,118 L90,124 L83,118 L88,90 Z' },
    ], { outline: true }),
    grupo('vr_grafico', [
      { id: 'vrGraficoQuadro', fill: '#fafafa', path: rect(-14, 20, 56, 52) },
      { id: 'vrGraficoSeta', fill: '#2e7d32', path: 'M-8,66 L4,54 L12,60 L26,40 L22,38 L34,30 L34,44 L30,41 L13,64 L5,58 L-6,68 Z', scaleBy: 'vrGraficoK', scalePivot: [-8, 66] },
      ...txt('vrGraficoTxt', 14, 27, '+9000%', { size: 7, cor: '#2e7d32', fundo: null }),
    ], { outline: true }),
  ] });

def({ num: 36, chave: 'gigaChad', nome: 'GigaChad', referencia: 'GigaChad', grupo: 'C', dur: 6.5, gatilhos: ['jogo', 'conquista', 'vitoria'], fala: 'Mediocridade? Nunca ouvi falar.',
  receita: { bracos: 'flexDuplo', repeticoes: 3 }, fx: ['holofote'],
  faixas: (L) => ({ vrCinza: L.k([0, 0], [0.5, 1], [6, 1], [6.5, 0]), stMusculo: L.k([0, 1], [0.8, 1.22], [5.8, 1.22], [6.5, 1]), stMusculos: L.on(0.6, 6), stBiceps: L.k([0.6, 1], [1.2, 1.45], [5.6, 1.45], [6, 1]),
    vr_queixo: L.on(0.5, 6), browShow: L.on(0.5, 6), browAngry: L.k([0, 0], [0.8, 0.5], [5.8, 0.5], [6.4, 0]), eyeOpen: L.k([0, 1], [0.8, 0.6], [5.8, 0.6], [6.4, 1]), headRot: L.k([0, 0], [0.8, -10], [5.8, -10], [6.4, 0]) }),
  pecas: [grupo('vr_queixo', [
    { id: 'vrQueixo', fill: 'bodyShade', path: 'M62,80 L118,80 L114,100 C104,106 76,106 66,100 Z', ...CABECA },
    { id: 'vrQueixoFenda', fill: '#212121', path: 'M89,90 L91,90 L91,103 L89,103 Z', ...CABECA },
    { id: 'vrMaçaRosto', fill: '#424242', alpha: 0.45, path: 'M50,40 C48,56 52,66 60,72 L62,70 C56,62 54,54 54,42 Z M130,40 C132,56 128,66 120,72 L118,70 C124,62 126,54 126,42 Z', ...CABECA },
  ], { outline: true })] });

def({ num: 37, chave: 'ishowspeed', nome: 'Surto do Streamer', referencia: 'IShowSpeed Reaction', grupo: 'C', dur: 5, gatilhos: ['vitoria', 'lazer'], fala: 'NÃO ACREDITO! NÃÃÃO!',
  receita: { bracos: 'agita', repeticoes: 12, semPiscar: true },
  faixas: (L) => ({ rootY: L.k([0, 0], [0.3, -28], [0.6, 0], [0.9, -24], [1.2, 0], [3, 0], [3.4, 14], [4.4, 14], [5, 0]), rootX: L.treme(1.2, 3, 4, 0.06), rootRot: L.k([0, 0], [3, 0], [3.4, -90], [4.4, -90], [5, 0]),
    eyeScale: L.k([0, 1], [0.3, 1.45], [3.8, 1.45], [4.4, 1]), jaw: L.k([0, 0], [0.3, 1.3], [3.8, 1.3], [4.4, 0]), browShow: L.on(0.2, 4.6), brow: L.k([0, 0], [0.3, 1.5], [3.8, 1.5], [4.4, 0]), eyeX: L.on(3.4, 4.4) }),
  pecas: [] });

def({ num: 38, chave: 'ballerina', nome: 'Bailarina Capuccina', referencia: 'Ballerina Cappuccina', grupo: 'C', dur: 7, gatilhos: ['lazer'], fala: 'Pernas de aço, tutu de respeito.',
  receita: { rosto: 'contente' },
  faixas: (L) => ({ vr_tutu: L.on(0.3, 6.7), squashX: L.giro(0.8, 4.6, 3), legFL: L.k([0, 6], [0.6, 145], [4.6, 145], [5, 6]), legFR: L.k([0, 6], [0.6, 145], [4.6, 145], [5, 6]), elbowL: L.k([0, 12], [0.6, 25], [4.6, 25], [5, 12]), elbowR: L.k([0, 12], [0.6, 25], [4.6, 25], [5, 12]),
    legLiftB: L.k([0, 0], [0.8, 4], [4.6, 4], [5, 0]), rootRot: L.k([0, 0], [4.8, 0], [5.2, 9], [5.6, -9], [6, 7], [6.4, -4], [7, 0]), eyeX: L.on(4.8, 6.4), vr_tonto38: L.on(4.8, 6.5), vr_tonto38Rot: L.k([4.8, 0], [6.5, 540]) }),
  pecas: [
    grupo('vr_tutu', [
      { id: 'vrTutu', fill: '#f8bbd0', path: 'M50,126 C40,132 30,140 34,144 C60,150 120,150 146,144 C150,140 140,132 130,126 Z' }, { id: 'vrTutu2', fill: '#f48fb1', path: 'M56,126 C48,132 44,138 46,141 C70,146 110,146 134,141 C136,138 132,132 124,126 Z' },
      { id: 'vrXicara', fill: '#ffffff', path: 'M72,4 L108,4 L104,-16 L76,-16 Z', ...CABECA }, { id: 'vrPires', fill: '#eceff1', path: elip(90, 6, 26, 3.5), ...CABECA }, { id: 'vrEspuma', fill: '#a1887f', path: elip(90, -16, 14, 3), ...CABECA },
    ], { outline: true }),
    tontura('vr_tonto38'),
  ] });

def({ num: 39, chave: 'beforeGta6', nome: 'Antes do GTA 6', referencia: 'Before GTA 6', grupo: 'C', dur: 6, gatilhos: ['lazer'], fala: 'Antes do GTA 6 sai meu shape definitivo. Ah, sai sim.',
  receita: { cabeca: 'olhaLado' },
  faixas: (L) => ({ vr_calendario: L.on(0.3, 5.7), vr_ano1: L.on(0.5, 1.3), vr_ano2: L.on(1.3, 2.1), vr_ano3: L.on(2.1, 2.9), vr_adiado: L.on(2.9, 5.7), pupilX: L.k([0, 0], [0.4, -1], [3, -1], [3.2, 0]),
    eyeScale: L.k([0, 1], [3, 1], [3.1, 1.35, 'step'], [5.4, 1.35], [6, 1]), jaw: L.k([0, 0], [3, 0], [3.1, 1, 'step'], [5.4, 1], [6, 0]), legFL: L.k([0, 6], [3.4, 6], [3.8, -38], [5.4, -38], [5.9, 6]), elbowL: L.k([0, 12], [3.4, 12], [3.8, -135], [5.4, -135], [5.9, 12]) }),
  pecas: [grupo('vr_calendario', [
    { id: 'vrCalendario', fill: '#ffffff', path: rect(-30, 6, 62, 80) }, { id: 'vrCalendarioTopo', fill: '#e53935', path: rect(-30, 6, 62, 14) },
    ...txt('vrCalTitulo', 1, 13, 'LANÇAMENTO', { size: 6, cor: '#ffffff', fundo: null }),
    { id: 'vrCalGrade', fill: '#cfd8dc', path: Array.from({ length: 12 }, (_, i) => rect(-26 + (i % 4) * 15, 52 + Math.floor(i / 4) * 10, 12, 8)).join(' ') },
    ...txt('vrAno1', 1, 36, '2025', { size: 11, fundo: null, extra: { showIf: 'vr_ano1' } }), ...txt('vrAno2', 1, 36, '2026', { size: 11, fundo: null, extra: { showIf: 'vr_ano2' } }), ...txt('vrAno3', 1, 36, '2027?', { size: 11, fundo: null, extra: { showIf: 'vr_ano3' } }),
    ...txt('vrAdiado', 1, 36, 'ADIADO', { size: 10, cor: '#c62828', fundo: null, extra: { showIf: 'vr_adiado' } }),
  ], { outline: true })] });

def({ num: 40, chave: 'council', nome: 'O Conselho', referencia: 'The Council', grupo: 'C', dur: 7, gatilhos: ['procrastinacao'], fala: 'O conselho se reuniu. O veredito: vai trabalhar, {nome}.',
  receita: { bracos: 'cruzados', rosto: 'focado', semPiscar: true }, fx: ['escuro'],
  faixas: (L) => ({ vr_conselho: L.on(0.4, 6.6), vrConselhoA: L.k([0, 0], [0.4, 0], [1.4, 0.5], [5.8, 0.5], [6.6, 0]), pupilY: L.k([0, 0], [0.5, 0.15], [6.5, 0.15], [7, 0]) }),
  clones: (s) => {
    if (s < 0.4 || s > 6.6) return [];
    const a = s < 1.4 ? (s - 0.4) * 0.5 : s > 5.8 ? 0.5 - (s - 5.8) * 0.62 : 0.5;
    const pose = { legFL: -10, legFR: -10, elbowL: -90, elbowR: -90, browShow: 1, browAngry: 1, pupilY: 0.15, mouthClose: 0.8, moodSad: 0.8 };
    return [{ dx: -78, dy: -54, k: 0.55, alpha: a, pose, atras: true }, { dx: 78, dy: -54, k: 0.55, alpha: a, pose, atras: true }, { dx: -104, dy: 4, k: 0.6, alpha: a, pose, atras: true }, { dx: 104, dy: 4, k: 0.6, alpha: a, pose, atras: true }];
  },
  pecas: [] });

// ---------- GRUPO D (adulto / negro / absurdo)
def({ num: 41, chave: 'hawkTuah', nome: 'Cuspe Interrompido', referencia: 'Hawk Tuah', grupo: 'D', adulto: true, dur: 6.5, gatilhos: ['lazer'], fala: 'Eu ia… deixa pra lá. O RH tá olhando.',
  receita: { semPiscar: true },
  faixas: (L) => ({ browShow: L.on(0.3, 6.2), brow: L.alt(1.3, 0, 0.3, 2.2, 6), tongue: L.k([0, 0], [0.4, 0.8], [1.9, 0.8], [2.1, 0]), cheeks: L.k([0, 0], [2.1, 0], [2.5, 1], [3.1, 1], [3.2, 0, 'step']), blush: L.k([0, 0], [0.4, 0.6], [6, 0.9], [6.5, 0]),
    vr_rh: L.on(3, 6.2), vrRhY: L.k([3, -70], [3.4, 0], [6.2, 0]), eyeScale: L.k([0, 1], [3.2, 1], [3.3, 1.35, 'step'], [6, 1.35], [6.5, 1]), moodShy: L.k([0, 0], [3.3, 0.6, 'step'], [6, 0.6], [6.5, 0]), mouthClose: L.k([0, 0], [3.3, 1, 'step'], [6, 1], [6.5, 0]) }),
  pecas: [grupo('vr_rh', [
    { id: 'vrRhPapel', fill: '#fff59d', path: rect(98, 4, 80, 46), dy: 'vrRhY' },
    ...txt('vrRh1', 138, 14, 'AVISO DO RH', { size: 6, cor: '#c62828', fundo: null, extra: { dy: 'vrRhY' } }),
    ...txt('vrRh2', 138, 26, 'Comportamento', { size: 6, fundo: null, extra: { dy: 'vrRhY' } }), ...txt('vrRh3', 138, 34, 'inapropriado.', { size: 6, fundo: null, extra: { dy: 'vrRhY' } }),
    ...txt('vrRh4', 138, 43, 'Sala 3, agora.', { size: 6, fundo: null, extra: { dy: 'vrRhY' } }),
  ], { outline: true })] });

def({ num: 42, chave: 'hornyJail', nome: 'Cadeia dos Tarados', referencia: 'Horny Jail (BONK)', grupo: 'D', adulto: true, dur: 6.5, gatilhos: ['lazer'], fala: 'Fui preso por pensamento. Justo.',
  receita: { rosto: 'apaixonado' },
  faixas: (L) => ({ heartEyes: L.k([0, 0], [0.3, 1], [2.3, 1], [2.35, 0, 'step']), squashY: L.k([0, 1], [2.35, 1], [2.4, 0.82, 'step'], [2.8, 1], [3.95, 1], [4.0, 0.8, 'step'], [4.5, 1]), eyeX: L.k([0, 0], [2.4, 1, 'step'], [3.2, 0, 'step'], [4.0, 1, 'step'], [5.4, 0, 'step']),
    vr_bonk: L.k([0, 0], [2.4, 1, 'step'], [2.9, 0, 'step'], [4.0, 1, 'step'], [4.6, 0, 'step']), vr_cadeia: L.on(0.6, 6.2), vr_bastao: [[0, 0], [1, 0]], rootY: L.k([0, 0], [2.4, 4, 'step'], [2.9, 0], [4.0, 5, 'step'], [4.6, 0]) }),
  clones: (s) => (s < 0.6 || s > 6.2 ? [] : [{ dx: 74, dy: s > 1.8 && s < 4.4 ? -44 : 0, k: 0.42, alpha: 1, atras: false,
    pose: { vr_bastao: 1, legFR: s > 2.1 && s < 2.4 || s > 3.7 && s < 4 ? 150 : 40, elbowR: s > 2.1 && s < 2.4 || s > 3.7 && s < 4 ? 20 : 110, browShow: 1, browAngry: 1, jaw: 0.6, moodAngry: 0.4 } }]),
  pecas: [
    grupo('vr_bastao', [{ id: 'vrBastao', fill: '#ffeb3b', path: 'M146,150 L150,98 C150,92 160,92 160,98 L154,150 Z', ...MAO_D }], { outline: true }),
    grupo('vr_bonk', [...txt('vrBonk', 130, -6, 'BONK!', { size: 13, cor: '#d32f2f', fundo: null })]),
    grupo('vr_cadeia', [...txt('vrCadeia', 40, -10, 'CADEIA DOS TARADOS', { size: 6, cor: '#ffffff', fundo: '#37474f', w: 76 })]),
  ] });

def({ num: 43, chave: 'awooga', nome: 'Auuuga', referencia: 'Awooga', grupo: 'D', adulto: true, dur: 5, gatilhos: ['lazer'], fala: null,
  receita: { semPiscar: true },
  faixas: (L) => ({ vr_olhos43: L.on(0.4, 4.5), vrOlhoK: L.k([0, 1], [0.4, 1], [0.6, 1.7], [0.8, 1.3], [1, 1.7], [1.2, 1.35], [1.4, 1.65], [3.8, 1.65], [4.4, 1]), vrOlhoY: L.k([0.4, 0], [0.6, -10], [0.8, -4], [1, -10], [1.2, -5], [1.4, -9], [3.8, -9], [4.4, 0]),
    jaw: L.k([0, 0], [0.5, 1.6], [4.2, 1.6], [4.7, 0]), vr_lingua43: L.on(0.8, 4.3), vrLinguaK: L.k([0.8, 0.1], [1.6, 1], [3.8, 1], [4.3, 0.1]), vr_censura: L.on(1.5, 4.2) }),
  pecas: [
    grupo('vr_lingua43', [{ id: 'vrLingua', fill: 'tongue', path: 'M82,72 C80,100 78,128 84,146 C90,160 106,156 104,142 C102,132 92,134 94,142 C96,146 100,146 98,140 L100,120 C102,104 100,86 98,72 Z', scaleBy: 'vrLinguaK', scalePivot: [90, 72] }], { outline: true }),
    grupo('vr_olhos43', [
      { id: 'vrMolas', fill: '#9e9e9e', path: 'M78,40 L74,34 L82,30 L74,26 L80,22 L79,40 Z M102,40 L98,34 L106,30 L98,26 L104,22 L103,40 Z', ...CABECA, dy: 'vrOlhoY' },
      { id: 'vrOlhoGrandeL', fill: 'sclera', path: elip(79, 36, 11, 12), ...CABECA, dy: 'vrOlhoY', scaleBy: 'vrOlhoK', scalePivot: [79, 40] },
      { id: 'vrOlhoGrandeR', fill: 'sclera', path: elip(101, 36, 11, 12), ...CABECA, dy: 'vrOlhoY', scaleBy: 'vrOlhoK', scalePivot: [101, 40] },
      { id: 'vrPupilaGrande', fill: '#111111', path: `${elip(80, 37, 4, 4)} ${elip(100, 37, 4, 4)}`, ...CABECA, dy: 'vrOlhoY' },
    ], { outline: true }),
    grupo('vr_censura', [{ id: 'vrCensura', fill: '#000000', path: rect(56, 112, 70, 14) }, ...txt('vrCensuraTxt', 91, 119, 'CENSURADO', { size: 7, cor: '#ffffff', fundo: null })]),
  ] });

def({ num: 44, chave: 'downfall', nome: 'Surto na Reunião', referencia: 'Downfall (paródia)', grupo: 'D', negro: true, dur: 7.5, gatilhos: ['lazer'], fala: 'Quem foi o fraco que marcou cardio na MINHA reunião?!',
  receita: {}, fx: ['vapor'],
  // Sátira de ditador de desenho: quepe e dragonas genéricos, sem símbolo, bandeira ou nome real.
  faixas: (L) => ({ vr_comandante: L.on(0.2, 7.3), vr_mapa: L.on(0.2, 7.3), pupilY: L.k([0, 0], [0.4, 0.8], [2.1, 0.8], [2.3, 0]), headRot: L.k([0, 0], [0.4, 6], [2.1, 6], [2.3, 0], [2.6, -8], [2.9, 8], [3.2, -8], [3.5, 8], [3.8, -8], [4.1, 8], [4.4, -6], [6.8, 0]),
    browShow: L.on(2.2, 7), browAngry: L.on(2.2, 7), moodAngry: L.k([0, 0], [2.2, 0], [3, 0.85], [6.6, 0.85], [7.3, 0]), jaw: L.alt(0.4, 1.3, 2.4, 6.6, 14),
    legFR: L.alt(20, 80, 2.6, 6.2, 10, { rest: 6 }), elbowR: L.alt(-40, 60, 2.6, 6.2, 10, { rest: 12 }), rootX: L.treme(4.4, 6.4, 2), vr_lapis: L.on(3, 3.8), vrLapisX: L.k([3, 0], [3.8, -120]), vrLapisY: L.k([3, 0], [3.4, -40], [3.8, -10]) }),
  pecas: [
    grupo('vr_comandante', [
      { id: 'vrQuepe', fill: '#4e5b3b', path: 'M52,14 C52,-12 128,-12 128,14 Z', ...CABECA }, { id: 'vrQuepeAba', fill: '#1b1b1b', path: 'M50,14 L130,14 L122,22 L58,22 Z', ...CABECA },
      { id: 'vrQuepeCordao', fill: '#ffca28', path: rect(56, 10, 68, 3), ...CABECA },
      { id: 'vrDragonaL', fill: '#ffca28', path: elip(52, 86, 12, 5) }, { id: 'vrDragonaR', fill: '#ffca28', path: elip(128, 86, 12, 5) },
    ], { outline: true }),
    grupo('vr_mapa', [
      { id: 'vrMesaMapa', fill: '#6d4c41', path: rect(16, 118, 148, 8) }, { id: 'vrMapa', fill: '#efebe9', path: rect(26, 108, 128, 12) },
      ...txt('vrMapaTxt', 90, 114, 'PLANO: SUPINO 300 KG', { size: 6, cor: '#4e342e', fundo: null }),
    ], { outline: true }),
    grupo('vr_lapis', [{ id: 'vrLapis', fill: '#ffb300', path: 'M140,100 L160,96 L162,100 L142,104 Z', dx: 'vrLapisX', dy: 'vrLapisY' }], { outline: true }),
  ] });

def({ num: 45, chave: 'saddam', nome: 'Esconderijo no Buraco', referencia: 'Saddam Hiding Place', grupo: 'D', negro: true, dur: 6.5, gatilhos: ['lazer'], fala: 'Não estou aqui. Nunca estive. Sai.',
  receita: { cabeca: 'olhaRedor' }, fx: ['poeira'],
  // Some no buraco encolhendo a partir do pé, atrás do monte de terra; o monte e a placa
  // usam a escala inversa (não encolhem junto). Nada sai da janela.
  faixas: (L) => {
    const esc = [[0, 1], [2.4, 1], [2.6, 0.82], [2.8, 0.6], [3.0, 0.38], [3.2, 0.15], [5.3, 0.15], [5.45, 0.5], [5.6, 1.12], [5.8, 0.95], [6.1, 1]];
    return { moodScared: L.k([0, 0], [0.4, 0.4], [1.6, 0.4], [2, 0]), legFL: L.alt(40, 120, 1.4, 2.6, 8, { rest: 6 }), legFR: L.alt(120, 40, 1.4, 2.6, 8, { rest: 6 }),
      scale: L.k(...esc), vrTerraK: L.k(...esc.map(([t, v]) => [t, r1(1 / v)])), vr_buraco: L.on(1.2, 6.2), vr_placa: L.on(3.3, 5.4) };
  },
  pecas: [
    grupo('vr_buraco', [{ id: 'vrBuraco', fill: '#3e2723', path: elip(90, 166, 54, 7), ...TERRA }, { id: 'vrMonte', fill: '#795548', path: 'M20,170 C26,146 46,144 54,156 L126,156 C134,144 154,146 160,170 Z', ...TERRA }], { outline: true }),
    grupo('vr_placa', [{ id: 'vrPlacaPau', fill: '#8d6e63', path: rect(88, 124, 4, 40), ...TERRA }, { id: 'vrPlaca', fill: '#d7ccc8', path: rect(50, 106, 80, 20), ...TERRA }, ...txt('vrPlacaTxt', 90, 116, 'NÃO ESTOU AQUI', { size: 7, fundo: null, extra: TERRA })], { outline: true }),
  ] });

def({ num: 46, chave: 'bombardiro', nome: 'Bombardeiro Tubarão', referencia: 'Bombardiro Crocodilo', grupo: 'D', negro: true, dur: 7, gatilhos: ['lazer'], fala: 'Bombardeiro Tubarão! Relaxa, a bomba é de confete.',
  receita: { rosto: 'sorrisao' }, fx: ['confete'],
  faixas: (L) => ({ vr_aviao: L.on(0.3, 6.7), vrHelice: L.k([0.3, 0], [6.7, 3600]), rootY: L.k([0, 0], [0.8, -36], [6, -36], [6.7, 0]), rootX: L.k([0, 0], [0.8, 0], [2.4, -50], [4.4, 50], [6, 0]), rootRot: L.k([0, 0], [0.8, 0], [1.6, -10], [3.4, 10], [5.2, -6], [6.2, 0]),
    legFL: L.k([0, 6], [0.6, 90], [6.2, 90], [6.7, 6]), legFR: L.k([0, 6], [0.6, 90], [6.2, 90], [6.7, 6]), elbowL: L.k([0, 12], [0.6, 0], [6.2, 0], [6.7, 12]), elbowR: L.k([0, 12], [0.6, 0], [6.2, 0], [6.7, 12]),
    vr_bomba1: L.on(2, 3.2), vrBomba1Y: L.k([2, 0], [3.2, 90]), vr_bomba2: L.on(3.6, 4.8), vrBomba2Y: L.k([3.6, 0], [4.8, 90]) }),
  pecas: [grupo('vr_aviao', [
    { id: 'vrAsa', fill: '#78909c', path: 'M-14,98 L60,92 L120,92 L194,98 L194,106 L120,104 L60,104 L-14,106 Z' }, { id: 'vrAsaFaixa', fill: '#cfd8dc', path: `${rect(-6, 99, 30, 4)} ${rect(156, 99, 30, 4)}` },
    { id: 'vrCauda', fill: '#78909c', path: 'M70,150 L110,150 L104,164 L76,164 Z' },
    { id: 'vrHeliceEixo', fill: '#455a64', path: elip(90, 4, 5, 5), ...CABECA }, { id: 'vrHelice', fill: '#90a4ae', path: 'M88,4 L92,4 L92,-22 L88,-22 Z M88,4 L92,4 L92,30 L88,30 Z', ...CABECA, pivot: [90, 4], rot: 'vrHelice' },
    { id: 'vrBomba1', fill: '#37474f', path: elip(30, 112, 6, 8), showIf: 'vr_bomba1', dy: 'vrBomba1Y' }, { id: 'vrBomba2', fill: '#37474f', path: elip(150, 112, 6, 8), showIf: 'vr_bomba2', dy: 'vrBomba2Y' },
  ], { outline: true })] });

def({ num: 47, chave: 'coffinDance', nome: 'Dança do Caixão', referencia: 'Coffin Dance', grupo: 'D', negro: true, dur: 8, gatilhos: ['derrota'], fala: 'Aqui jaz minha autoestima. Causa: derrota humilhante.',
  receita: { bracos: 'cruzados', rosto: 'triste' },
  faixas: (L) => ({ vr_caixao: L.on(0.4, 7.6), vrCaixaoX: L.k([0.4, 150], [7.6, -150]), vrCaixaoY: L.alt(0, -3, 0.4, 7.6, 24, { step: true }), vr_oculosMini: [[0, 0], [1, 0]], headRot: L.k([0, 0], [0.6, 6], [7.4, 6], [8, 0]) }),
  clones: (s) => {
    if (s < 0.4 || s > 7.6) return [];
    const x = 150 - ((s - 0.4) / 7.2) * 300;
    const passo = Math.floor(s / 0.33) % 2;
    const pose = { legFL: 150, legFR: 150, elbowL: 20, elbowR: 20, rootY: passo ? -3 : 0, rootRot: passo ? 5 : -5, legBL: passo ? 14 : 0, legBR: passo ? 0 : 14, browShow: 1, jaw: 0.3, vr_oculosMini: 1 };
    return [-54, -18, 18, 54].map((d) => ({ dx: x + d, dy: 4, k: 0.34, alpha: 1, pose, atras: false }));
  },
  pecas: [
    grupo('vr_caixao', [
      { id: 'vrCaixao', fill: '#4e342e', path: 'M30,118 L48,110 L132,110 L150,118 L132,126 L48,126 Z', dx: 'vrCaixaoX', dy: 'vrCaixaoY' },
      { id: 'vrCaixaoTampa', fill: '#6d4c41', path: 'M36,118 L50,113 L130,113 L144,118 L130,123 L50,123 Z', dx: 'vrCaixaoX', dy: 'vrCaixaoY' },
      ...txt('vrCaixaoTxt', 90, 118, 'AUTOESTIMA', { size: 7, cor: '#ffecb3', fundo: null, extra: { dx: 'vrCaixaoX', dy: 'vrCaixaoY' } }),
    ], { outline: true }),
    grupo('vr_oculosMini', [{ id: 'vrOculosMini', fill: '#111111', path: 'M64,32 L90,32 L88,46 C84,50 70,50 66,46 Z M90,32 L116,32 L114,46 C110,50 96,50 92,46 Z', ...CABECA }]),
  ] });

def({ num: 48, chave: 'kekw', nome: 'Risada Incontrolável', referencia: 'El Risitas / KEKW', grupo: 'D', dur: 6.5, gatilhos: ['lazer'], fala: 'KKKKKK. Para. Para que eu não aguento.',
  receita: { semPiscar: true },
  faixas: (L) => ({ mouthClose: L.k([0, 0], [0.3, 1], [2, 1], [2.05, 0, 'step']), cheeks: L.k([0, 0], [0.3, 1], [2, 1], [2.05, 0, 'step']), eyeOpen: L.k([0, 1], [0.3, 0.4], [2, 0.4], [2.05, 1, 'step']), rootX: L.k([0, 0], [0.3, 0], [0.4, 0.5, 'step'], [0.5, -0.5, 'step'], [0.7, 1, 'step'], [0.85, -1, 'step'], [1.0, 1.6, 'step'], [1.15, -1.6, 'step'], [1.3, 2.2, 'step'], [1.45, -2.2, 'step'], [1.6, 3, 'step'], [1.75, -3, 'step'], [1.9, 3.6, 'step'], [2, 0, 'step']),
    jaw: L.alt(0.4, 1.3, 2.05, 6, 22), happyEyes: L.on(2.05, 6.1), rootY: L.k([0, 0], [3.5, 0], [3.9, 14], [6, 14], [6.5, 0]), rootRot: L.k([0, 0], [3.5, 0], [3.9, -90], [4.3, -70], [4.7, -95], [5.1, -70], [5.5, -95], [6, -90], [6.5, 0]), vr_lagRiso: L.on(2.4, 6), vr_lagRisoK: L.k([2.4, 0.1], [3.4, 0.7], [6, 0.7]) }),
  pecas: [lagrimas('vr_lagRiso')] });

def({ num: 49, chave: 'patrickBateman', nome: 'Executivo no Espelho', referencia: 'Patrick Bateman (American Psycho)', grupo: 'D', negro: true, dur: 8, gatilhos: ['lazer'], fala: 'Eu malho, hidrato e me admiro. Basicamente perfeito.',
  receita: { bracos: 'flexUm' },
  faixas: (L) => ({ vr_terno: L.on(0.3, 7.7), vr_espelho49: L.on(0.3, 4.6), pupilX: L.k([0, 0], [0.5, -1], [4.4, -1], [4.6, 0]), browShow: L.on(0.4, 7.6), brow: L.k([0.4, 0], [0.8, 1], [4.2, 1], [4.6, -1.2, 'step'], [7.4, -1.2], [7.8, 0]),
    jaw: L.k([0, 0], [0.6, 0.35], [4.2, 0.35], [4.6, 0, 'step']), vr_cartao: L.on(4.6, 7.5), vrCartaoY: L.k([4.6, -60], [5, 0]), vr_carimbo: L.on(5.6, 7.5),
    mouthClose: L.k([0, 0], [4.6, 0], [4.7, 1, 'step'], [7.4, 1], [7.8, 0]), squashY: L.k([0, 1], [5.6, 1], [6, 0.94], [7.4, 0.94], [8, 1]), moodSad: L.k([0, 0], [5.6, 0], [6, 0.5], [7.4, 0.5], [8, 0]) }),
  clones: (s) => (s < 0.5 || s > 4.5 ? [] : [{ dx: -104, dy: -26, k: 0.44, alpha: 0.85, flip: -1, atras: false, pose: { vr_terno: 1, legFR: 92, elbowR: 125, browShow: 1, brow: 1, jaw: 0.35 } }]),
  pecas: [
    grupo('vr_terno', [
      { id: 'vrTerno', fill: '#212121', path: 'M50,84 C60,78 120,78 130,84 C140,92 140,104 136,112 C132,120 126,126 122,132 L58,132 C54,126 48,120 44,112 C40,104 40,92 50,84 Z' },
      { id: 'vrCamisaTerno', fill: '#fafafa', path: 'M78,80 L102,80 L94,116 L86,116 Z' }, { id: 'vrGravataTerno', fill: '#b71c1c', path: 'M88,84 L92,84 L94,108 L90,114 L86,108 Z' },
    ], { outline: true }),
    grupo('vr_espelho49', [{ id: 'vrEspelhoMoldura', fill: '#bcaaa4', path: rect(-56, 52, 64, 115) }, { id: 'vrEspelhoVidro', fill: '#e1f5fe', alpha: 0.9, path: rect(-51, 57, 54, 105) }], { outline: true }),
    grupo('vr_cartao', [{ id: 'vrCartao', fill: '#fffde7', path: rect(116, 40, 62, 30), dy: 'vrCartaoY' }, ...txt('vrCartao1', 147, 50, 'JoJo Bateman', { size: 6, fundo: null, extra: { dy: 'vrCartaoY' } }), ...txt('vrCartao2', 147, 60, 'VP de Supino', { size: 6, fundo: null, extra: { dy: 'vrCartaoY' } })], { outline: true }),
    grupo('vr_carimbo', [...txt('vrCarimbo', 147, 56, 'DEMITIDO', { size: 9, cor: '#c62828', fundo: null })]),
  ] });

def({ num: 50, chave: 'deathKnocking', nome: 'A Morte Bate à Porta', referencia: 'Death Knocking on Doors', grupo: 'D', negro: true, dur: 9, gatilhos: ['jogo', 'lazer'], fala: 'Toc toc. Sono? Morreu. Dieta? Morreu. Mais uma partida? Entra, entra.',
  receita: {},
  faixas: (L) => {
    const portas = [[0.5, 2.0], [2.0, 3.5], [3.5, 5.0], [5.0, 6.5], [6.5, 8.6]];
    const out = { vr_morte: L.on(0.2, 8.8), vr_porta: L.on(0.4, 8.6) };
    portas.forEach(([a, b], i) => { out[`vr_porta${i + 1}`] = L.on(a, b); });
    // Bate duas vezes em cada porta; a porta abre e ele leva (porta escura) e passa para a próxima.
    out.legFR = L.k([0, 6], ...portas.slice(0, 4).flatMap(([a]) => [[a + 0.2, 6], [a + 0.35, 80], [a + 0.5, 50], [a + 0.65, 80], [a + 0.8, 6]]), [6.5, 6]);
    out.elbowR = L.k([0, 12], ...portas.slice(0, 4).flatMap(([a]) => [[a + 0.2, 12], [a + 0.35, 90], [a + 0.5, 40], [a + 0.65, 90], [a + 0.8, 12]]), [6.5, 12]);
    out.vr_portaAberta = [[0, 0], ...portas.slice(0, 4).flatMap(([a, b]) => [[(a + 0.9) / L.D, 1, 'step'], [(b - 0.1) / L.D, 0, 'step']]), [7.2 / L.D, 1, 'step'], [8.2 / L.D, 0, 'step'], [1, 0]];
    // Entra na porta escura: ele anda até ela (rootX) e a porta fica parada (vrPortaX = -rootX),
    // desenhada por cima; depois a porta some e ele volta.
    out.rootX = L.k([0, 0], [7.2, 0], [7.9, 64], [8.6, 64], [8.61, 0, 'step']);
    out.vrPortaX = L.k([0, 0], [7.2, 0], [7.9, -64], [8.6, -64], [8.61, 0, 'step']);
    out.jaw = L.k([0, 0], [6.6, 0], [6.9, 0.9], [7.4, 0.9], [7.6, 0]);
    out.eyeScale = L.k([0, 1], [6.6, 1], [6.8, 1.3], [7.5, 1.3], [7.7, 1]);
    return out;
  },
  pecas: [
    grupo('vr_morte', [
      { id: 'vrCapuz', fill: '#212121', path: 'M36,60 C30,6 60,-14 90,-14 C120,-14 150,6 144,60 C140,86 132,92 126,90 C132,60 124,24 90,22 C56,24 48,60 54,90 C48,92 40,86 36,60 Z', ...CABECA },
      { id: 'vrManto', fill: '#262626', path: 'M44,84 C60,76 120,76 136,84 C146,110 148,140 150,167 L30,167 C32,140 34,110 44,84 Z' },
      { id: 'vrFoiceCabo', fill: '#5d4037', path: 'M150,170 L154,60 L158,60 L154,170 Z', ...MAO_D }, { id: 'vrFoiceLamina', fill: '#cfd8dc', path: 'M154,60 C140,44 116,44 104,54 C120,52 138,56 152,66 Z', ...MAO_D },
    ], { outline: true }),
    grupo('vr_porta', [
      { id: 'vrPortaBatente', dx: 'vrPortaX', fill: '#8d6e63', path: rect(150, 30, 46, 137) }, { id: 'vrPortaEscura', dx: 'vrPortaX', fill: '#1a1a1a', path: rect(154, 34, 38, 133), showIf: 'vr_portaAberta' },
      { id: 'vrMacaneta', dx: 'vrPortaX', fill: '#ffca28', path: elip(156, 104, 2.6, 2.6) },
      ...txt('vrPorta1', 173, 44, 'SONO', { size: 7, w: 50, extra: { dx: 'vrPortaX', showIf: 'vr_porta1' } }), ...txt('vrPorta2', 173, 44, 'DIETA', { size: 7, w: 50, extra: { dx: 'vrPortaX', showIf: 'vr_porta2' } }),
      ...txt('vrPorta3', 173, 44, 'PRODUTIVIDADE', { size: 5.5, w: 56, extra: { dx: 'vrPortaX', showIf: 'vr_porta3' } }), ...txt('vrPorta4', 173, 44, 'SANIDADE', { size: 6.5, w: 50, extra: { dx: 'vrPortaX', showIf: 'vr_porta4' } }),
      ...txt('vrPorta5', 173, 44, 'MAIS UMA PARTIDA', { size: 5, w: 58, cor: '#1b5e20', extra: { dx: 'vrPortaX', showIf: 'vr_porta5' } }),
    ], { outline: true }),
  ] });

// ------------------------------------------------------------------ exportações
const pad = (n) => String(n).padStart(2, '0');
/** As 50 definições, com id `vrNN`. */
export const VIRAIS = Object.freeze(V.map((d) => Object.freeze({ ...d, id: `vr${pad(d.num)}`, adulto: !!d.adulto, negro: !!d.negro, prioridade: d.prioridade || (d.gatilhos.includes('lazer') && d.gatilhos.length === 1 ? 'baixa' : 'media'), cooldownMin: d.cooldownMin ?? 90 })));
export const VIRAL_POR_ID = new Map(VIRAIS.map((v) => [v.id, v]));
export const GATILHOS = Object.freeze(['lazer', 'jogo', 'derrota', 'vitoria', 'conquista', 'ocioso', 'instagram', 'procrastinacao', 'tarefa', 'refeicao', 'erro', 'fimTrabalho']);

// Efeitos pesados que somem com "reduzir efeitos" (versão suave).
const FX_PESADO = new Set(['confete', 'velocidade', 'falha', 'onda', 'alarme', 'fumaca', 'estrelas', 'vapor', 'poeira', 'bolhas', 'escuro', 'holofote', 'notas']);

/** Itens do catálogo (um por viral). As faixas viram quadros-chave 0..1. */
export function itensVirais() {
  return VIRAIS.map((v) => {
    const L = linha(v.dur);
    const faixas = v.faixas ? v.faixas(L) : {};
    for (const k of Object.keys(faixas)) if (!Array.isArray(faixas[k])) delete faixas[k];
    return {
      id: v.id, nome: `${v.nome} (${v.referencia})`, categoria: 'viral', listas: {}, gatilho: { viral: v.gatilhos }, duracao: Math.round(v.dur * 1000), loop: false, entrada: 240, frequencia: 'raro', estatico: 0.5,
      receita: { ...v.receita, fx: v.fx || [] }, faixas, fxLeve: (v.fx || []).filter((f) => !FX_PESADO.has(String(f).split(':')[0])), fala: v.fala || undefined, viral: true,
    };
  });
}

/** Canais de cor dos virais (preto e branco, azul Smurf). */
export const MOODS_VIRAIS = {
  vrCinza: { max: 1, to: { body: '#9e9e9e', bodyShade: '#7d7d7d', muscle: '#565656', cream: '#e8e8e8', shorts: '#3a3a3a', stripe: '#d6d6d6', tongue: '#8a8a8a', blush: '#b0b0b0', eye: '#111111', mouth: '#1a1a1a' } },
  vrAzul: { max: 1, to: { body: '#3d9be9', bodyShade: '#2c82cc', muscle: '#1f64a3', cream: '#cfe8ff' } },
};

/** Rig com as peças dos virais (cópia). Sem os canais vr_* ligados, nada aparece. */
export function rigComVirais(rig) {
  if (!rig || !Array.isArray(rig.groups) || rig.groups.some((g) => g.id === 'vr_baba')) return rig;
  const fundo = VIRAIS.flatMap((v) => v.fundo || []);
  const frente = VIRAIS.flatMap((v) => v.pecas || []);
  const limpa = (gs) => structuredClone(gs).map((g) => ({ ...g, ...(g.showIf ? {} : { showIf: undefined }), parts: g.parts.map((p) => Object.fromEntries(Object.entries(p).filter(([, val]) => val !== undefined))) }));
  return { ...rig, moods: { ...(rig.moods || {}), ...MOODS_VIRAIS }, groups: [...limpa(fundo), ...rig.groups, ...limpa(frente)] };
}

/** Id do viral de uma animação (`cat_vr12`, `cat_vr12~suave`) ou null. */
export function viralDaAnim(nome) {
  const m = /^cat_(vr\d{2})(?:~\w+)?$/.exec(String(nome || ''));
  return m && VIRAL_POR_ID.has(m[1]) ? m[1] : null;
}

/**
 * Cópias do JoJo a desenhar neste instante (Conselho, Coffin Dance, Horny Jail, espelho).
 * `t` vai de 0 a 1. Cada cópia: {dx, dy, k (escala), alpha, flip, pose, atras}.
 */
export function clonesDoViral(nome, t) {
  const v = VIRAL_POR_ID.get(viralDaAnim(nome));
  if (!v?.clones) return [];
  return v.clones(t * v.dur).filter((c) => c.alpha > 0.01);
}

/** O trecho em pixel art (Nyan Cat) está ativo neste instante? */
export function pixelDoViral(nome, t) {
  const v = VIRAL_POR_ID.get(viralDaAnim(nome));
  if (!v?.pixel) return false;
  const s = t * v.dur;
  return s >= v.pixel[0] && s <= v.pixel[1];
}

// ------------------------------------------------------------------ gerenciador
export const VIRAIS_FREQUENCIA = { pouca: { intervaloMin: 60, chance: 0.35 }, normal: { intervaloMin: 25, chance: 0.6 }, muita: { intervaloMin: 10, chance: 0.85 } };
const PRIO = { baixa: 1, media: 2, alta: 3 };

/**
 * Gerenciador central: escolhe qual viral toca para um acontecimento real, respeitando
 * as preferências (ligado, frequência, adulto, negro, bloqueadas), o cooldown de cada uma,
 * o intervalo mínimo entre virais e a memória para não repetir. Puro (testável).
 */
export class GerenciadorVirais {
  constructor({ getConfig = () => ({}), rng = Math.random, now = () => Date.now() } = {}) {
    this.getConfig = getConfig;
    this.rng = rng;
    this.now = now;
    this.ultimaVez = new Map(); // id → quando tocou
    this.ultimoViral = -Infinity;
    this.recentes = [];
  }

  config() {
    const c = this.getConfig() || {};
    return {
      ativo: c.viraisAtivo !== false, frequencia: VIRAIS_FREQUENCIA[c.viraisFrequencia] ? c.viraisFrequencia : 'normal',
      adulto: c.viraisAdulto !== false, negro: c.viraisNegro !== false, bloqueadas: new Set(Array.isArray(c.viraisBloqueadas) ? c.viraisBloqueadas : []),
      reduzir: c.viraisReduzir === true, intensidade: ['suave', 'normal', 'exagerado'].includes(c.viraisIntensidade) ? c.viraisIntensidade : 'normal',
    };
  }

  /** Virais permitidos agora para o gatilho (sem olhar intervalo global). */
  candidatos(gatilho, { ignorarCooldown = false } = {}) {
    const c = this.config();
    if (!c.ativo) return [];
    const t = this.now();
    return VIRAIS.filter((v) => v.gatilhos.includes(gatilho) && !c.bloqueadas.has(v.id) && (c.adulto || !v.adulto) && (c.negro || !v.negro)
      && (ignorarCooldown || t - (this.ultimaVez.get(v.id) ?? -Infinity) >= v.cooldownMin * 60e3));
  }

  /**
   * Escolhe um viral para o acontecimento (ou null). Contextuais (não 'lazer') passam pelo
   * intervalo global mais curto; 'lazer' respeita a frequência inteira e a chance do sorteio.
   */
  escolher(gatilho, { forcar = false } = {}) {
    const c = this.config();
    if (!c.ativo || !GATILHOS.includes(gatilho)) return null;
    const t = this.now();
    const { intervaloMin, chance } = VIRAIS_FREQUENCIA[c.frequencia];
    const minGap = (gatilho === 'lazer' ? intervaloMin : intervaloMin / 3) * 60e3;
    if (!forcar && t - this.ultimoViral < minGap) return null;
    if (!forcar && this.rng() > (gatilho === 'lazer' ? chance : Math.min(1, chance + 0.3))) return null;
    let lista = this.candidatos(gatilho);
    if (!lista.length) return null;
    // Evita repetir as últimas cinco; prioridade pesa no sorteio.
    const frescos = lista.filter((v) => !this.recentes.includes(v.id));
    if (frescos.length) lista = frescos;
    const pesos = lista.map((v) => PRIO[v.prioridade] || 1);
    let r = this.rng() * pesos.reduce((a, b) => a + b, 0);
    for (let i = 0; i < lista.length; i++) { r -= pesos[i]; if (r <= 0) return lista[i].id; }
    return lista.at(-1).id;
  }

  /** Marca que tocou (cooldown e memória). */
  registrar(id) {
    const t = this.now();
    this.ultimaVez.set(id, t);
    this.ultimoViral = t;
    this.recentes = [id, ...this.recentes.filter((x) => x !== id)].slice(0, 5);
  }

  /** Intensidade a usar ("reduzir efeitos" força a suave, sem efeitos pesados). */
  intensidade() {
    const c = this.config();
    return c.reduzir ? 'suave' : c.intensidade;
  }
}

// ------------------------------------------------------------------ pelo chat
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const EXTRAS = {
  vr05: ['pop cat'], vr06: ['maxwell'], vr07: ['oiia', 'oiia oiia', 'oiia cat'], vr12: ['smurf cat'], vr18: ['nyan cat', 'nyan'], vr26: ['absolute cinema', 'cinema absoluto'],
  vr31: ['drake', 'drakeposting'], vr32: ['npc', 'modo npc'], vr34: ['trollface', 'troll face'], vr35: ['sigma', 'sigma grindset'], vr36: ['gigachad', 'giga chad', 'chad'],
  vr40: ['the council', 'o conselho'], vr42: ['horny jail', 'bonk'], vr43: ['awooga', 'auuuga'], vr47: ['coffin dance', 'danca do caixao'], vr48: ['kekw', 'el risitas', 'risitas'],
  vr09: ['chill guy'], vr22: ['this is fine'], vr10: ['tralalero tralala', 'tralalero'], vr15: ['moo deng'], vr46: ['bombardiro crocodilo', 'bombardiro'], vr38: ['ballerina cappuccina'],
  vr39: ['antes do gta 6', 'before gta 6'], vr28: ['plano do gru', 'gru'], vr03: ['side eye', 'side eye cat'], vr01: ['drooling cat'],
};
const FRASES = new Map();
for (const v of VIRAIS) {
  const ref = semAcento(v.referencia.replace(/\(.*?\)/g, ''));
  for (const f of [ref, ...(EXTRAS[v.id] || [])]) if (f.length >= 3 && !FRASES.has(f)) FRASES.set(f, v.id);
}

/** Viral pedido pelo nome do meme (a mensagem inteira é o meme, com "jojo"/"faz o" opcionais). */
export function viralDoTexto(texto) {
  const t = semAcento(texto).replace(/^(jojo )?(faz |faca |manda |mostra )?(o |a |um |uma )?(meme (do |da )?)?/, '').replace(/ (jojo|ai|pra mim|por favor)$/, '').trim();
  const id = FRASES.get(t);
  return id ? VIRAL_POR_ID.get(id) : null;
}
