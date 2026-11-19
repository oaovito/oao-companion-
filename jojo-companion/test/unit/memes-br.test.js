// 50 memes BR no padrão da Tigresa (pedido de 19/11/2026): fantasia completa que transforma o
// JoJo, animação própria de 6,5 s (puf, gesto com efeito e pose final) e a frase do meme no chat.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJSON, makeEnv, chatAdv } from './helpers.js';
import { gerarVisuais, rigComVisuais, canaisVisual } from '../../src/core/visual-nivel.js';
import { animDoMeme, canalMeme, comAnimacoesMemes, memeDoTexto, itensDeMemes, GESTOS_MEME, EFEITOS_MEME, SLOTS } from '../../src/core/memes-br.js';

const PROG = loadJSON('assets/catalog/progressao.json');
const REF = { referencias: PROG.referencias, extras: PROG.extras };
const CAT = gerarVisuais(REF);
const MEMES = CAT.filter((p) => p.meme);
const RIG = loadJSON('assets/character/jojo.rig.json');

test('coleção: 50 memes BR (br03 a br52), um a cada 4 níveis a partir do 2, sem repetir obra nem frase', () => {
  assert.equal(MEMES.length, 50);
  assert.deepEqual([MEMES[0].id, MEMES.at(-1).id], ['br03', 'br52']);
  assert.deepEqual(MEMES.map((p) => p.nivel), Array.from({ length: 50 }, (_, i) => 2 + 4 * i));
  assert.equal(new Set(MEMES.map((p) => p.obra)).size, 50);
  assert.equal(new Set(MEMES.map((p) => p.fala)).size, 50);
  for (const p of MEMES) {
    assert.equal(p.parte, 'pintura', p.id);
    assert.ok(p.transforma?.pele, `${p.id}: transforma o JoJo como a Tigresa`);
    assert.ok(p.meme.gatilhos.length && p.meme.respostas.length, p.id);
    assert.ok(GESTOS_MEME.includes(p.meme.gesto), `${p.id}: gesto ${p.meme.gesto}`);
    assert.ok(EFEITOS_MEME.includes(p.meme.efeito), `${p.id}: efeito ${p.meme.efeito}`);
    const f = p.fantasia;
    assert.ok(SLOTS.TRONCOS[f.tronco] && SLOTS.BAIXOS[f.baixo] && SLOTS.PES[f.pes] && SLOTS.CABECAS[f.cabeca], `${p.id}: fantasia inteira`);
  }
  // Variedade: os 50 não repetem a mesma combinação de fantasia, gesto e efeito.
  const assin = MEMES.map((p) => JSON.stringify([p.fantasia.tronco, p.fantasia.cabeca, p.fantasia.mao, p.meme.gesto, p.meme.efeito]));
  assert.equal(new Set(assin).size, 50);
});

test('desenho: cada meme tem a fantasia vestida e a cópia da animação; a fantasia esconde a bermuda e o Saci tem uma perna', () => {
  const r = rigComVisuais(RIG, REF);
  const partes = r.groups.flatMap((g) => g.parts);
  for (const p of MEMES) {
    assert.ok(partes.filter((x) => x.showIf === `nv_${p.id}`).length >= 6, `${p.id}: roupa inteira`);
    assert.ok(partes.some((x) => x.showIf === canalMeme(p.id)), `${p.id}: aparece na animação`);
  }
  assert.ok(r.groups.find((g) => g.id === 'memeEfeitos') && r.groups.at(-1).id === 'memePuf');
  for (const id of ['shorts', 'shortsDetail']) assert.ok([].concat(r.groups.find((g) => g.id === id).hideIf).includes('nvSemBermuda'), id);
  const saci = MEMES.find((p) => p.fantasia.umaPerna);
  assert.equal(canaisVisual({ pecas: { pintura: saci.id } }, REF, saci.nivel).nvSemPernaE, 1);
  assert.equal(canaisVisual({ pecas: { pintura: MEMES[0].id } }, REF, 2).nvSemBermuda, 1);
  assert.equal(canaisVisual({ pecas: { pintura: MEMES[0].id } }, REF, 2).nvSemPernaE, undefined);
});

test('animação: 6,5 s como a Tigresa; puf, fantasia do começo ao fim, efeito no meio e volta ao normal', async () => {
  const A = comAnimacoesMemes(loadJSON('assets/animations/jojo.animations.json'), MEMES);
  const { Animator } = await import('../../src/renderer/shared/animator.js');
  for (const p of MEMES) {
    const nome = animDoMeme(p.id);
    assert.equal(A.animations[nome].duration, 6500, nome);
    const at = (t) => { const an = new Animator(A); an.play(nome, 0, { restart: true }); return an.sample(6500 * t).pose; };
    assert.equal(at(0.03).mbPuf, 1, `${nome}: puf`);
    assert.equal(at(0.5)[canalMeme(p.id)], 1, `${nome}: vestido`);
    assert.equal(at(0.5)[`mbEf_${p.id}`], 1, `${nome}: efeito`);
    assert.equal(at(0.5).nvSemBermuda, 1, `${nome}: sem a bermuda por baixo`);
    assert.equal(at(0.995)[canalMeme(p.id)], 0, `${nome}: volta ao normal`);
  }
});

test('chat: a frase do meme toca a animação e o JoJo responde no personagem', async () => {
  assert.equal(memeDoTexto('to muito confusa hoje', MEMES), null, 'frase parcial não dispara');
  assert.equal(memeDoTexto('Nazaré confusa!', MEMES).id, 'br03');
  assert.equal(memeDoTexto('é biscoito ou bolacha?', MEMES)?.titulo, MEMES.find((p) => p.meme.gatilhos.includes('biscoito ou bolacha'))?.titulo);
  assert.deepEqual(itensDeMemes(MEMES.slice(0, 1))[0], { id: 'memeBr_br03', nome: MEMES[0].titulo, categoria: 'memes BR', listas: {}, gatilho: {}, usa: 'memeBr_br03', duracao: 6500, frequencia: 'rara', fala: MEMES[0].fala, meme: 'br03' });
  const e = makeEnv();
  try {
    e.companion.start();
    e.clock.advance(2500);
    const r = await chatAdv(e, 'nazaré confusa');
    assert.equal(e.companion.behavior.anim, 'memeBr_br03');
    assert.ok(MEMES[0].meme.respostas.map((t) => t.replaceAll('{nome}', 'Manu')).includes(r.text) || MEMES[0].meme.respostas.some((t) => r.text === t.replaceAll('{nome}', 'Emanuele')), r.text);
  } finally {
    e.companion.stop();
  }
});

test('revisão no padrão da Tigresa: todo visual antigo tem fantasia completa e show próprio de 6,5 s', async () => {
  const { visuaisComAnimacao } = await import('../../src/core/visual-nivel.js');
  const pecas = CAT.filter((p) => !p.meme && p.id !== 'br01' && p.id !== 'br02');
  assert.equal(pecas.length, 369);
  for (const p of pecas) {
    assert.ok(p.show, `${p.id} sem fantasia completa`);
    assert.ok(GESTOS_MEME.includes(p.show.gesto) && EFEITOS_MEME.includes(p.show.efeito), p.id);
    const f = p.show.fantasia;
    assert.ok(SLOTS.TRONCOS[f.tronco] && SLOTS.PES[f.pes] && SLOTS.CABECAS[f.cabeca] && SLOTS.MAOS[f.mao], `${p.id}: peças da fantasia existem`);
    assert.ok(f.baixo === null ? p.parte === 'bermuda' : SLOTS.BAIXOS[f.baixo], `${p.id}: parte de baixo`);
  }
  const todos = visuaisComAnimacao(REF);
  assert.equal(todos.length, 419, '369 visuais + 50 memes BR');
  const A = comAnimacoesMemes(loadJSON('assets/animations/jojo.animations.json'), todos);
  const { Animator } = await import('../../src/renderer/shared/animator.js');
  const v = todos.find((p) => p.id === 'sp01');
  const an = new Animator(A); an.play('visual_sp01', 0, { restart: true });
  const meio = an.sample(3200).pose;
  assert.equal(meio.meme_sp01, 1, 'veste a fantasia');
  assert.equal(meio.nvCabeca, v.transforma.cabeca, 'cabeça do personagem');
  assert.equal(meio[`costume_pele${v.id}`], 1, 'pele do personagem');
  const fim = new Animator(A); fim.play('visual_sp01', 0, { restart: true });
  const depois = fim.sample(6490).pose;
  assert.equal(depois.nvCabeca, 1, 'volta ao JoJo de sempre');
  assert.equal(depois.meme_sp01, 0);
  // A peça continua sendo só a peça no guarda-roupa: vestida, não liga a fantasia nem esconde a bermuda.
  assert.equal(canaisVisual({ pecas: { cabeca: 'sp01' } }, REF, 10).nvSemBermuda, undefined);
  assert.equal(canaisVisual({ pecas: { cabeca: 'sp01' } }, REF, 10).meme_sp01, undefined);
});

test('liberar ou vestir um visual toca o show dele com a fantasia completa', () => {
  const e = makeEnv();
  try {
    e.companion.start();
    e.clock.advance(2500);
    e.companion.progress.st.xp = e.companion.progress.threshold(10);
    e.companion.vestirNivel('sp01');
    assert.equal(e.companion.behavior.anim, 'visual_sp01');
  } finally {
    e.companion.stop();
  }
});

test('durante a animação com fantasia inteira as peças vestidas saem (overlay usa ehAnimFantasia)', async () => {
  const { ehAnimFantasia } = await import('../../src/core/memes-br.js');
  for (const n of ['tigresa', 'memeBr_br03', 'visual_nv002']) assert.equal(ehAnimFantasia(n), true, n);
  for (const n of ['idle', 'twerk', undefined, 'cat_selfie']) assert.equal(ehAnimFantasia(n), false, String(n));
  const fs = await import('node:fs');
  assert.match(fs.readFileSync(new URL('../../src/renderer/overlay/overlay.js', import.meta.url), 'utf8'), /if \(s\.visualNivel && !fantasiaInteira\)/);
});
