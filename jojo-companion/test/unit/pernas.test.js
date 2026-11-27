// Pés do JoJo (pedido do João, 27/11/2026): sapato, bota e calça das fantasias seguem a perna
// quando ela mexe; o pé de verdade nunca sai por baixo do sapato parado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJSON } from './helpers.js';
import { prenderNasPernas, pecasPresas, ehCalca, ladoDaPerna } from '../../src/core/pernas.js';
import { subcaminhos, caixaDoCaminho, dentro, poligonos } from '../../src/core/geometria-path.js';
import { SLOTS } from '../../src/core/memes-br.js';
import { rigComVisuais } from '../../src/core/visual-nivel.js';
import { montarAnimacoes } from '../../src/core/conjunto-animacoes.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { rigComRebolado } from '../../src/core/rebolado.js';
import { rigComDildo } from '../../src/core/dildo.js';
import { rigComEsteroide } from '../../src/core/esteroide.js';
import { rigComVirais } from '../../src/core/virais.js';
import { rigComRituais } from '../../src/core/rituais.js';
import { rigComTimers } from '../../src/core/timer-anims.js';
import { rigComClima } from '../../src/core/clima-anims.js';
import { rigComMonster } from '../../src/core/monster.js';
import { rigComLoja } from '../../src/core/loja-arte.js';
import { rigComAnime } from '../../src/core/anime-arte.js';

const RIG = loadJSON('assets/character/jojo.rig.json');
const PROG = loadJSON('assets/catalog/progressao.json');
const NIVEIS = { referencias: PROG.referencias, extras: PROG.extras };

test('geometria: caixas, subcaminhos e ponto dentro dos caminhos do projeto', () => {
  assert.equal(subcaminhos('M0,0 L1,0 Z M5,5 L6,6 Z').length, 2);
  const b = caixaDoCaminho('M10,10 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0 Z');
  assert.ok(Math.abs(b.l - 10) < 0.5 && Math.abs(b.r - 20) < 0.5 && Math.abs(b.t - 5) < 0.5 && Math.abs(b.b - 15) < 0.5, JSON.stringify(b));
  assert.ok(dentro('M0,0 L10,0 L10,10 L0,10 Z', 5, 5));
  assert.ok(!dentro('M0,0 L10,0 L10,10 L0,10 Z', 15, 5));
  assert.ok(poligonos('M0,0 C10,0 10,10 0,10 Z')[0].length > 4);
});

test('calçados das fantasias: cada pé fica preso na perna do seu lado e cobre o pé inteiro do rig', () => {
  for (const [nome, fn] of Object.entries(SLOTS.PES)) {
    if (nome === 'descalco' || nome === 'peGigante') continue;
    for (const [grupo, id, fill, path] of fn('#123456')) {
      const presas = pecasPresas({ id, fill, path }, { L: [], R: [] });
      assert.ok(presas.length >= 2, `${nome}/${id}: preso nas pernas`);
      const L = presas.find((p) => p.parent === 'legL'), R = presas.find((p) => p.parent === 'legR');
      assert.ok(L && R, `${nome}/${id}: um de cada lado`);
      if (grupo !== 'nivelCorpo') continue;
      // O pé do rig vai de x≈49 a 96 (esquerdo) e 84 a 131 (direito): o calçado cobre tudo.
      const bl = caixaDoCaminho(L.path), br = caixaDoCaminho(R.path);
      assert.ok(bl.l <= 50 && bl.r >= 95, `${nome}: pé esquerdo coberto ${JSON.stringify(bl)}`);
      assert.ok(br.l <= 85 && br.r >= 130, `${nome}: pé direito coberto ${JSON.stringify(br)}`);
    }
  }
});

test('calças: quadril parado e cada perna recortada e presa na sua (o vão do meio continua)', () => {
  const [, id, fill, path] = SLOTS.BAIXOS.calca('#222222')[0];
  assert.ok(ehCalca(path));
  const p = pecasPresas({ id, fill, path, corpoX: true }, { L: ['squatPose'], R: ['squatPose'] });
  assert.equal(p.length, 3);
  assert.deepEqual(p.map((x) => x.parent || null), ['legL', 'legR', null]);
  assert.ok(p.every((x) => x.clipPath));
  assert.ok(p[0].hideIf.includes('squatPose'), 'some junto com a perna no agachamento');
  assert.ok(!p[0].corpoX && p[2].corpoX, 'perna herda a largura da perna; quadril estica com o corpo');
  // Saia, vestido e cauda de sereia não têm vão: ficam como estão.
  assert.equal(ehCalca(SLOTS.BAIXOS.saia('#222222')[0][3]), false);
  assert.equal(ehCalca(SLOTS.BAIXOS.cauda('#222222', '#ffffff')[0][3]), false);
  assert.equal(ladoDaPerna(caixaDoCaminho('M50,150 L80,150 L80,168 L50,168 Z')), 'L');
  assert.equal(ladoDaPerna(caixaDoCaminho('M100,150 L130,150 L130,168 L100,168 Z')), 'R');
  assert.equal(ladoDaPerna(caixaDoCaminho('M50,100 L80,100 L80,120 L50,120 Z')), null, 'tronco não é perna');
});

test('rig completo: prender é idempotente e não altera o rig recebido', () => {
  const r = rigComVisuais(RIG, NIVEIS);
  const n0 = r.groups.reduce((s, g) => s + g.parts.length, 0);
  const p = prenderNasPernas(r);
  assert.equal(r.groups.reduce((s, g) => s + g.parts.length, 0), n0);
  assert.ok(p.groups.reduce((s, g) => s + g.parts.length, 0) > n0);
  assert.equal(prenderNasPernas(p), p);
});

test('auditoria das 1.340+ animações: nenhuma roupa na zona das pernas fica parada enquanto a perna mexe', () => {
  const rig = prenderNasPernas(rigComMonster(rigComAnime(rigComLoja(rigComClima(rigComRituais(rigComTimers(rigComVirais(rigComEsteroide(rigComDildo(rigComRebolado(rigComVisuais(RIG, NIVEIS))))))))))));
  const anims = montarAnimacoes(loadJSON);
  const FORA = /^(props|catalogFloor|catalogFront|livingProps|needsProps|darkestProps|memeEfeitos|memePuf|nivelAura|nivelBrilho|moon|legs$|legDetail$|costumeBack$|darkestCloak$)/;
  const porId = new Map(rig.groups.flatMap((g) => g.parts.map((p) => [p.id, p])));
  const segue = (p, d = 0) => !!p && d < 6 && (['legBL', 'legBR'].includes(p.rot) || ['legL', 'legR'].includes(p.id) || (p.parent && segue(porId.get(p.parent), d + 1)));
  const cand = [];
  for (const g of rig.groups) {
    if (FORA.test(g.id)) continue;
    for (const p of g.parts) {
      if (segue(p) || p.parent || p.rot) continue;
      if (p.clipPath && caixaDoCaminho(p.clipPath).b < 156) continue;
      // Pé gigante (Abaporu) é um adereço único na frente dos dois pés: fica parado de propósito.
      if (/peGigante|_dedos/.test(p.id)) continue;
      if (subcaminhos(p.path).map(caixaDoCaminho).some((b) => b && ladoDaPerna(b))) cand.push({ g, p });
    }
  }
  const on = (pose, ch) => (pose[ch] ?? 0) >= 0.5;
  const visivel = (g, p, pose) => !(g.showIf && !on(pose, g.showIf)) && ![].concat(g.hideIf || []).some((c) => on(pose, c)) && !(p.showIf && !on(pose, p.showIf)) && ![].concat(p.hideIf || []).some((c) => on(pose, c));
  const ruins = [];
  for (const nome of Object.keys(anims.animations).filter((k) => !k.includes('~'))) {
    const a = new Animator(anims, { rng: () => 0.5 });
    a.play(nome, 0, { restart: true, variant: nome });
    const dur = Math.max(100, anims.animations[nome].duration || 1000);
    for (let i = 1; i <= 24; i++) {
      const { pose } = a.sample((dur * i) / 24);
      if (Math.max(Math.abs(pose.legBL || 0), Math.abs(pose.legBR || 0), (pose.legLiftB || 0) * 2) < 4) continue;
      const r = cand.find(({ g, p }) => visivel(g, p, pose));
      if (r) { ruins.push(`${nome}: ${r.p.id}`); break; }
    }
  }
  assert.deepEqual(ruins, []);
});
