// As 20 animações do modo foco: registro, laço sem salto, movimento reduzido,
// silêncio, alternância sem repetição e incentivos só nos momentos certos.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeEnv, loadJSON, seededRng } from './helpers.js';
import { buildAnimation, expandCatalog, animName, INTENSITIES } from '../../src/core/catalog/recipes.js';
import { fullCatalog } from '../../src/core/catalog/load.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { PhraseBook } from '../../src/core/phrases.js';
import { PERSONALITY_DEFAULTS, profileVars } from '../../src/core/personality.js';

const FOCO = loadJSON('assets/catalog/foco-animations.json');
const RIG = loadJSON('assets/character/jojo.rig.json');
const ANIMS = loadJSON('assets/animations/jojo.animations.json');
const PHRASES = loadJSON('assets/dialogue/pt-BR.json');
const catalog = fullCatalog(loadJSON);
const GRUPOS = { estudo: 7, treino: 5, ritmo: 4, incentivo: 4 };

function started() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

test('as 20 animações de foco estão registradas no catálogo, por grupo, sem repetir as que já existiam', () => {
  assert.equal(FOCO.itens.length, 20);
  for (const [grupo, n] of Object.entries(GRUPOS)) assert.equal(FOCO.itens.filter((it) => it.grupo === grupo).length, n, grupo);
  const ids = catalog.itens.map((it) => it.id);
  assert.equal(new Set(ids).size, ids.length, 'ids únicos no catálogo completo');
  for (const it of FOCO.itens) {
    assert.ok(catalog.itens.some((x) => x.id === it.id), it.id);
    assert.match(it.id, /^foco[A-Z]/, it.id);
    assert.equal(it.categoria, 'foco');
    assert.ok(it.nome && it.duracao > 0 && it.entrada >= 0 && typeof it.loop === 'boolean', it.id);
    assert.equal(it.loop, it.grupo !== 'incentivo', `${it.id}: laço só fora do incentivo`);
  }
  // As duas de sempre continuam no catálogo geral, intocadas.
  const base = loadJSON('assets/catalog/animacoes.json').itens;
  assert.deepEqual(base.find((it) => it.id === 'estudarJunto').receita, { objeto: 'livro', bracos: 'segura', cabeca: 'leJunto', rosto: 'focado', semPiscar: true });
  assert.deepEqual(base.find((it) => it.id === 'treinarJunto').receita, { objeto: 'halter', bracos: 'rosca', rosto: 'focado', fx: ['suor'], repeticoes: 4 });
  const assinaturas = new Set([...FOCO.itens, ...base.filter((it) => ['estudarJunto', 'treinarJunto'].includes(it.id))].map((it) => JSON.stringify(buildAnimation(it).tracks)));
  assert.equal(assinaturas.size, 22, 'cada animação de foco é diferente das outras');
});

test('cada animação de foco existe nas 3 intensidades, com adereços desenhados no rig', () => {
  const all = expandCatalog(ANIMS, catalog);
  const canais = new Set(RIG.groups.flatMap((g) => g.parts).flatMap((p) => [].concat(p.showIf || [])));
  const usados = new Set(RIG.groups.flatMap((g) => g.parts).flatMap((p) => [p.rot, p.scaleBy, p.lift, p.dy, p.dx].filter(Boolean)));
  for (const it of FOCO.itens) {
    for (const k of Object.keys(INTENSITIES)) assert.ok(all.animations[animName(it.id, k)]?.duration > 0, `${it.id} ${k}`);
    for (const o of [].concat(it.receita.objeto || [])) assert.ok(canais.has(`prop_${o}`), `${it.id}: objeto ${o} sem desenho`);
  }
  for (const ch of ['pageTurnR', 'pageTurnL', 'markStroke', 'listStrike', 'sandTop', 'sandBottom', 'sandStream', 'hourglassFlip']) assert.ok(usados.has(ch), `canal ${ch} sem peça no rig`);
});

test('ciclo fecha sem salto: o último quadro de cada laço é igual ao primeiro', () => {
  for (const it of FOCO.itens.filter((x) => x.loop)) {
    for (const k of Object.keys(INTENSITIES)) {
      const { tracks } = buildAnimation(it, k);
      for (const [ch, keys] of Object.entries(tracks)) {
        const a = keys[0], b = keys[keys.length - 1];
        assert.equal(a[0], 0, `${it.id}.${ch} começa em 0`);
        assert.equal(b[0], 1, `${it.id}.${ch} termina em 1`);
        // A ampulheta fecha por equivalência visual: virada 180° com a areia toda embaixo
        // é o mesmo desenho do começo (areia toda em cima, sem virar).
        if (it.id === 'focoAmpulheta' && ['sandTop', 'sandBottom', 'hourglassFlip'].includes(ch)) continue;
        assert.equal(a[1], b[1], `${it.id}.${ch} (${k}): ${a[1]} ≠ ${b[1]}`);
      }
    }
  }
  const h = buildAnimation(FOCO.itens.find((x) => x.id === 'focoAmpulheta')).tracks;
  assert.deepEqual([h.sandTop[0][1], h.sandBottom[0][1], h.hourglassFlip[0][1]], [1, 0, 0]);
  assert.deepEqual([h.sandTop.at(-1)[1], h.sandBottom.at(-1)[1], h.hourglassFlip.at(-1)[1]], [0, 1, 180]);
  const partes = RIG.groups.flatMap((g) => g.parts);
  const cima = partes.find((p) => p.id === 'focoAmpulhetaAreiaCima'), baixo = partes.find((p) => p.id === 'focoAmpulhetaAreiaBaixo');
  assert.deepEqual(cima.pivot, baixo.pivot);
  assert.equal(cima.pivot[1] * 2, 120 + 159, 'areia de cima e de baixo simétricas em torno do pivô da virada');
});

test('discretas: sem mudanças bruscas (nenhum quadro "step"), sem flashes e amplitude contida', () => {
  for (const it of FOCO.itens) {
    assert.equal(it.receita.fx, undefined, `${it.id}: sem efeitos de partícula`);
    assert.equal(it.receita.marca, undefined, it.id);
    const { tracks } = buildAnimation(it, 'suave');
    for (const [ch, keys] of Object.entries(tracks)) {
      for (const key of keys) assert.notEqual(key[2], 'step', `${it.id}.${ch}: corte seco`);
      if (ch === 'alpha') assert.fail(`${it.id}: não mexe na opacidade`);
      if (ch === 'rootX') for (const key of keys) assert.ok(Math.abs(key[1]) <= 4, `${it.id}: deslocamento lateral contido`);
    }
  }
});

test('movimento reduzido: cada animação de foco tem quadro estático válido e próprio', () => {
  const all = expandCatalog(ANIMS, catalog);
  for (const it of FOCO.itens) {
    assert.ok(it.estatico > 0 && it.estatico < 1, `${it.id}: quadro estático declarado`);
    const an = new Animator(all, { rng: seededRng(1) });
    an.play(animName(it.id, 'suave'), 0);
    const st = an.sampleStatic();
    for (const v of Object.values(st.pose)) assert.ok(Number.isFinite(v), it.id);
    assert.equal(all.animations[animName(it.id, 'suave')].staticT, it.estatico);
  }
});

test('nenhuma animação de foco reproduz áudio', () => {
  const texto = fs.readFileSync(new URL('../../assets/catalog/foco-animations.json', import.meta.url), 'utf8');
  assert.doesNotMatch(texto, /\b(som|sound|audio|áudio|mp3|wav|ogg|beep|voz)\b/i);
  const codigo = ['src/core/catalog/recipes.js', 'src/core/catalog/load.js'].map((f) => fs.readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8')).join('\n');
  assert.doesNotMatch(codigo, /\b(AudioContext|webkitAudioContext|new Audio\(|speechSynthesis|SpeechSynthesisUtterance|<audio|<video|shell\.beep|createOscillator)\b/);
  for (const it of FOCO.itens) assert.deepEqual(Object.keys(it).filter((k) => /som|audio|sound/i.test(k)), [], it.id);
});

test('balão de cada animação: fala própria no arquivo de falas, no tom sério do perfil', () => {
  const pb = new PhraseBook(PHRASES, { rng: seededRng(3) });
  for (const it of FOCO.itens) {
    assert.equal(it.status, `foco_${it.id}`);
    const cat = PHRASES.categories[it.status];
    assert.ok(cat && cat.lines.length >= 2, `${it.id}: pelo menos duas falas`);
    assert.equal(cat.kind, 'thought');
    for (let i = 0; i < 4; i++) {
      const p = pb.pick(it.status, (tone) => profileVars(PERSONALITY_DEFAULTS, tone));
      assert.ok(p.text && !/\{\w+\}/.test(p.text), p.text);
      assert.ok(!p.text.includes('Manu'), p.text);
    }
  }
});

test('foco: começa pela animação de sempre, alterna em intervalos longos e nunca repete a mesma em sequência', () => {
  for (const [tipo, classica, grupo] of [['estudo', 'estudarJunto', 'estudo'], ['treino', 'treinarJunto', 'treino']]) {
    const e = started();
    e.companion.startFocus(120, tipo);
    e.clock.advance(1000);
    assert.match(e.companion.behavior.anim, new RegExp(`^cat_${classica}`));
    const permitidas = new Set([classica, ...FOCO.itens.filter((it) => it.loop && (it.grupo === grupo || it.grupo === 'ritmo')).map((it) => it.id)]);
    const vistos = [];
    let trocas = 0, ultimaTroca = e.clock.now();
    let anterior = e.companion.focus.animId;
    for (let min = 1; min <= 118; min++) {
      e.clock.advance(60e3);
      const id = e.companion.focus.animId;
      assert.ok(permitidas.has(id), `${tipo}: ${id} fora do conjunto`);
      if (id !== anterior) {
        trocas++;
        assert.ok(e.clock.now() - ultimaTroca >= FOCO.trocaMin * 60e3 - 1000, `troca cedo demais em ${min} min`);
        ultimaTroca = e.clock.now();
        vistos.push(id);
        anterior = id;
      }
    }
    assert.ok(trocas >= 20, `${tipo}: ${trocas} trocas em 2 h`);
    for (let i = 1; i < vistos.length; i++) assert.notEqual(vistos[i], vistos[i - 1], 'mesma animação em sequência');
    assert.ok(new Set(vistos).size >= 6, `${tipo}: variedade (${new Set(vistos).size})`);
    assert.ok(!vistos.some((id) => FOCO.itens.find((it) => it.id === id)?.grupo === 'incentivo'), 'incentivo não entra na alternância');
  }
});

test('incentivos só nos momentos certos: metade do bloco, pausa entre ciclos e conclusão', () => {
  const e = started();
  const pedidos = [];
  const orig = e.companion._focusIncentive.bind(e.companion);
  e.companion._focusIncentive = (momento, now) => { const ok = orig(momento, now); pedidos.push({ momento, id: e.companion.lastFocusIncentive, min: Math.round((now - inicio) / 60e3), ok }); return ok; };
  const inicio = e.clock.now();
  e.companion.startFocus(20, 'estudo', { ciclos: 2, pausaMin: 5, atual: 1 });
  e.clock.advance(9 * 60e3);
  assert.deepEqual(pedidos, [], 'nada antes da metade');
  e.clock.advance(60e3 + 500);
  assert.equal(pedidos.length, 1);
  assert.equal(pedidos[0].momento, 'metade');
  assert.ok(['focoAceno', 'focoBicepsRapido'].includes(pedidos[0].id));
  assert.ok(pedidos[0].ok, 'o incentivo da metade toca durante o foco');
  assert.match(e.companion.behavior.anim, /^cat_foco(Aceno|BicepsRapido)/);
  e.clock.advance(6000);
  assert.match(e.companion.behavior.anim, /^cat_(estudarJunto|foco)/, 'depois do incentivo volta ao foco');
  assert.ok(e.companion.focus, 'o foco continua');
  e.clock.advance(11 * 60e3);
  assert.equal(e.companion.focus, null);
  assert.equal(pedidos.length, 2);
  assert.deepEqual([pedidos[1].momento, pedidos[1].id], ['pausa', 'focoBeberAgua']);
  e.clock.advance(5 * 60e3);
  assert.ok(e.companion.focus, 'segundo ciclo');
  e.clock.advance(21 * 60e3);
  assert.equal(e.companion.focus, null);
  assert.deepEqual(pedidos.map((p) => p.momento), ['metade', 'pausa', 'metade', 'conclusao']);
  assert.equal(pedidos[3].id, 'focoPunho');
  assert.notEqual(pedidos[2].id, pedidos[0].id, 'os dois incentivos da metade se alternam');
});

test('foco no Modo Trabalho ou parado no meio: nenhuma animação de foco sobra depois', () => {
  const e = started();
  e.companion.startFocus(30, 'treino');
  e.clock.advance(6 * 60e3);
  e.companion._endFocus(false);
  e.clock.advance(10e3);
  assert.doesNotMatch(e.companion.behavior.anim || '', /^cat_(treinarJunto|foco)/);
});
