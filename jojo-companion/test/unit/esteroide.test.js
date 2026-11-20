// Êxtase Anabólico (STEROID_EUPHORIA, pedido de 19/11/2026): 15 s em cinco fases, adereços de
// desenho, balões na hora certa, volta ao normal, respeita Trabalho/Foco/tela cheia e é interrompível.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeEnv, loadJSON, chatAdv } from './helpers.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { rigComEsteroide, animacaoEsteroide, GRUPOS_ESTEROIDE, GRUPOS_ESTEROIDE_FUNDO, ROTULOS, BALOES_ESTEROIDE, ESTEROIDE_MS } from '../../src/core/esteroide.js';

const ANIMS = loadJSON('assets/animations/jojo.animations.json');
const RIG = loadJSON('assets/character/jojo.rig.json');

function started() {
  const e = makeEnv({ settings: { speechFrequency: 'off' }, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.clock.advance(3000);
  const falas = [];
  const say = e.companion.say.bind(e.companion);
  e.companion.say = (t, ...rest) => { const ok = say(t, ...rest); if (ok) falas.push(t); return ok; };
  return { e, falas };
}

test('animação: 15 s gravada no arquivo, cinco fases e volta ao JoJo de sempre', () => {
  assert.deepEqual(ANIMS.animations.esteroide, animacaoEsteroide(), 'rode node scripts/esteroide-anim.mjs');
  const A = ANIMS.animations.esteroide;
  assert.equal(A.duration, 15000);
  const at = (s) => { const an = new Animator(ANIMS); an.play('esteroide', 0, { restart: true }); return an.sample(s * 1000).pose; };
  // 1) seringa TREMBOLONA, pupilas dilatadas, baba.
  assert.equal(at(1.5).stSeringa, 1);
  assert.equal(at(1.5).stPupilas, 1);
  assert.equal(at(2).stBaba, 1);
  // 2) aplicação de desenho: encosta no ombro e some; olhos revirados, tremedeira, corado, corações e estrelas.
  assert.equal(at(4.4).stPlim, 1);
  assert.ok(at(6).pupilY < -1, 'olhos revirados');
  assert.ok(Math.abs(at(6.02).rootX) > 1, 'treme');
  assert.equal(at(6).blush, 1);
  assert.equal(at(6).stEuforia, 1);
  assert.equal(at(6).stSeringa, 0, 'a primeira já foi');
  // 3) as outras quatro e os músculos inchando.
  assert.equal(at(8).stSeringas, 1);
  assert.ok(at(9).stMusculo > 1.15 && at(9).stBiceps > 1.3);
  // 4) clímax: olhos brancos, brilho dourado, pose de fisiculturista.
  const c = at(11);
  assert.equal(c.stOlhosBrancos, 1);
  assert.equal(c.stAura, 1);
  assert.ok(c.legFL > 80 && c.legFR > 80 && c.elbowL > 100 && c.elbowR > 100, 'duplo bíceps');
  // 5) depois: lágrima e volta ao normal.
  assert.equal(at(14).stLagrima, 1);
  const fim = at(14.97);
  for (const ch of ['stSeringa', 'stSeringas', 'stPupilas', 'stOlhosBrancos', 'stAura', 'stEuforia', 'stVeias', 'stMusculos', 'stBaba', 'stPlim']) assert.equal(fim[ch], 0, ch);
  assert.equal(fim.stMusculo, 1);
  assert.equal(fim.legFL, 0);
  assert.equal(fim.rootX, 0);
});

test('desenho: cinco seringas com rótulo, corações e estrelas; só adereços (nenhum braço novo) e o rig não muda', () => {
  const r = rigComEsteroide(RIG);
  assert.equal(rigComEsteroide(r), r, 'não duplica');
  assert.equal(r.groups.length, RIG.groups.length + GRUPOS_ESTEROIDE.length + GRUPOS_ESTEROIDE_FUNDO.length);
  assert.equal(r.groups[0].id, 'stAura', 'brilho dourado atrás de tudo');
  const partes = [...GRUPOS_ESTEROIDE, ...GRUPOS_ESTEROIDE_FUNDO].flatMap((g) => g.parts);
  assert.deepEqual(partes.filter((p) => p.text).map((p) => p.text), ROTULOS);
  assert.equal(ROTULOS[0], 'TREMBOLONA');
  assert.ok(partes.some((p) => p.id === 'stCoracaoS1'), 'coração da TREMBOLONA');
  assert.ok(partes.some((p) => p.id === 'stCoracoes') && partes.some((p) => p.id === 'stEstrelas'));
  for (const p of partes) {
    assert.ok(/^st[A-Z]/.test(p.id), p.id);
    assert.ok(!/^(arm|fore|leg|hand)/i.test(p.id), `${p.id}: nada de membro novo`);
    assert.ok(typeof p.path === 'string' && !/NaN|undefined/.test(p.path), p.id);
    assert.ok(['armL', 'armR', undefined].includes(p.parent), p.id);
  }
  const ids = r.groups.flatMap((g) => g.parts.map((p) => p.id));
  assert.equal(new Set(ids).size, ids.length, 'ids únicos');
  // O overlay soma o inchaço ao corpo vestido e corta a tremedeira no movimento reduzido.
  const ov = fs.readFileSync(new URL('../../src/renderer/overlay/overlay.js', import.meta.url), 'utf8');
  assert.match(ov, /rigComEsteroide\(/);
  assert.match(ov, /pose\.nvCorpo = \(pose\.nvCorpo \?\? 1\) \* pose\.stMusculo/);
  assert.match(ov, /reduced && sample\.name === 'esteroide'\) pose\.rootX = 0/);
});

test('balões na hora certa, com as frases do pedido', () => {
  const { e, falas } = started();
  try {
    assert.equal(e.companion.extaseAnabolico(), true);
    assert.equal(e.companion.behavior.state, 'esteroide');
    e.clock.advance(ESTEROIDE_MS + 500);
    for (const t of ['EU CONSIGO OUVIR MEUS RECEPTORES ANDROGÊNICOS.', 'NÃO É VÍCIO. É AMOR.', 'Foi melhor que meu último relacionamento.']) assert.ok(falas.includes(t), `${t} | ${falas.join(' | ')}`);
    const ordem = BALOES_ESTEROIDE.map((b) => falas.findIndex((f) => f === b.texto || f.startsWith(b.texto.split('{')[0])));
    assert.deepEqual([...ordem].sort((a, b) => a - b), ordem, 'na ordem');
    assert.notEqual(e.companion.behavior.state, 'esteroide', 'acabou e voltou ao normal');
  } finally {
    e.companion.stop();
  }
});

test('Modo Trabalho, foco e tela cheia: não toca; interrompida, os balões param', () => {
  const { e, falas } = started();
  const c = e.companion;
  try {
    c.startWork();
    assert.equal(c.extaseAnabolico(), false, 'Modo Trabalho');
    c.endWork();
    c.startFocus(25, 'estudo');
    assert.equal(c.extaseAnabolico(), false, 'foco');
    c._endFocus(false);
    c.fullscreenHidden = true;
    assert.equal(c.extaseAnabolico(), false, 'tela cheia');
    c.fullscreenHidden = false;
    assert.equal(c.extaseAnabolico(), true);
    e.clock.advance(3000);
    c.behavior.request('nod', { now: e.clock.now(), force: true }); // interrompe
    e.clock.advance(13000);
    assert.ok(!falas.some((t) => /RECEPTORES|VÍCIO|relacionamento/.test(t)), 'interrompida: sem os balões');
    assert.notEqual(c.behavior.state, 'esteroide');
  } finally {
    c.stop();
  }
});

test('chat e Central: pedido explícito toca; pergunta séria não; aparece nas animações liberadas', async () => {
  const { detectIntent } = await import('../../src/core/dialogue/scripted-provider.js');
  for (const t of ['êxtase anabólico', 'JoJo, toma uma trembolona', 'trembolona!']) assert.equal(detectIntent(t), 'esteroide', t);
  for (const t of ['esteroide faz mal?', 'o que é trembolona', 'meu amigo usa anabolizante']) assert.notEqual(detectIntent(t), 'esteroide', t);
  const { e } = started();
  try {
    const r = await chatAdv(e, 'êxtase anabólico');
    assert.equal(r.intent, 'esteroide');
    assert.equal(e.companion.behavior.state, 'esteroide');
    assert.ok(e.companion.animacoesLiberadas().some((a) => a.id === 'esteroide' && a.nome === 'Êxtase Anabólico'));
    e.clock.advance(16000);
    assert.match(e.companion.runCommand('anim', null, '/anim esteroide').text, /Êxtase Anabólico/);
  } finally {
    e.companion.stop();
  }
});
