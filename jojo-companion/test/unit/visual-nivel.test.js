// Visuais por nível (pedido de 18/11/2026): cada nível a partir do 2 libera uma
// peça nova, coerente com o título; cada peça é mais caprichada que a anterior
// da mesma parte; o que está liberado pode ser vestido à vontade; o que está
// bloqueado nunca aparece em lugar nenhum.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJSON, makeEnv } from './helpers.js';
import {
  VISUAL_PARTES, gerarVisuais, partesDaPeca, rigComVisuais, visuaisLiberados, pecaLiberada, melhorConjunto,
  aplicarNivel, vestirVisual, canaisVisual, visualSnapshot, acharVisual, sanitizeVisual, canalDaPeca, temaDoTitulo,
} from '../../src/core/visual-nivel.js';
import { Progress } from '../../src/core/catalog/antitedio.js';
import { sanitize } from '../../src/core/settings-schema.js';

const PROG = loadJSON('assets/catalog/progressao.json');
const N = PROG.niveis;
const RIG = loadJSON('assets/character/jojo.rig.json');
const CAT = gerarVisuais(N);

test('catálogo: uma peça por nível do 2 ao último, com nome do título daquele nível', () => {
  assert.equal(CAT.length, N.length - 1);
  CAT.forEach((p, i) => {
    assert.equal(p.nivel, i + 2);
    assert.ok(p.nome.endsWith(`de ${N[p.nivel - 1]}`), p.nome);
  });
  assert.equal(new Set(CAT.map((p) => p.nome)).size, CAT.length, 'nomes únicos');
  assert.equal(new Set(CAT.map((p) => p.id)).size, CAT.length, 'ids únicos');
  for (const pt of VISUAL_PARTES) assert.ok(CAT.filter((p) => p.parte === pt.id).length >= 20, pt.id);
});

test('coerência: a cor segue o título (lava, gelo, ouro, cosmos, abismo)', () => {
  assert.deepEqual(temaDoTitulo('Megalodon de Lava')[0], '#d84315');
  assert.deepEqual(temaDoTitulo('Tubarão Glacial')[0], '#4fa3d1');
  assert.deepEqual(temaDoTitulo('Tubarão de Ouro')[0], '#d4a72c');
  assert.deepEqual(temaDoTitulo('Galáxia de Barbatanas')[0], '#5e35b1');
  assert.deepEqual(temaDoTitulo('Rei do Abismo')[0], '#00566b');
});

test('progressão visual: cada peça nova é pelo menos tão caprichada quanto a anterior da mesma parte, e o conjunto nunca piora', () => {
  for (const pt of VISUAL_PARTES) {
    const lista = CAT.filter((p) => p.parte === pt.id);
    for (let i = 1; i < lista.length; i++) {
      const [a, b] = [lista[i - 1], lista[i]];
      assert.ok(b.t > a.t && b.faixa >= a.faixa, `${b.nome}`);
      // Dentro da mesma faixa (faixa → tiara → coroa → coroa alta → suprema), nunca menos detalhe.
      if (b.faixa === a.faixa) assert.ok(partesDaPeca(b).length >= partesDaPeca(a).length, `${b.nome} tem menos detalhe que ${a.nome}`);
    }
  }
  // Riqueza do conjunto: faixa (tiara → coroa vale mais que enfeite), depois quantidade de
  // peças e de pontos do desenho, e por fim o tamanho, que cresce com o nível (t).
  const riqueza = (p) => p.faixa * 1e6 + partesDaPeca(p).length * 1e3 + partesDaPeca(p).reduce((s, x) => s + x.part.path.split(/[ ,]/).length, 0) * 0.1 + p.t;
  const detalhe = (L) => Object.values(melhorConjunto(N, L)).reduce((s, id) => s + riqueza(CAT.find((x) => x.id === id)) + 1, 0);
  for (let L = 2; L <= N.length; L++) assert.ok(detalhe(L) > detalhe(L - 1), `nível ${L} precisa ter mais visual que o ${L - 1}`);
  assert.ok(detalhe(N.length) > detalhe(50) * 1.5, 'o topo é bem mais caprichado que o meio');
});

test('desenho: só peças por cima (corpo intacto), dentro do espaço da janela, ids únicos e números válidos', () => {
  const r = rigComVisuais(RIG, N);
  assert.notEqual(r, RIG);
  assert.equal(RIG.groups.some((g) => g.id === 'nivelAura'), false, 'não altera o rig original');
  assert.equal(r.groups[0].id, 'nivelAura', 'aura atrás de tudo');
  const iArm = r.groups.findIndex((g) => g.id === 'armDetail');
  assert.equal(r.groups[iArm + 1].id, 'nivelPintura');
  for (const id of ['nivelAura', 'nivelPintura']) assert.equal(r.groups.find((g) => g.id === id).hideIf, 'mooning', 'de costas some');
  // As partes originais continuam iguais (anatomia, silhueta e estilo preservados).
  for (const g of RIG.groups) {
    const ng = r.groups.find((x) => x.id === g.id);
    assert.deepEqual(ng.parts.slice(0, g.parts.length), g.parts, g.id);
  }
  const novas = r.groups.flatMap((g) => g.parts).filter((p) => p.id.startsWith('nv'));
  assert.ok(novas.length > 1000);
  assert.equal(new Set(r.groups.flatMap((g) => g.parts).map((p) => p.id)).size, r.groups.flatMap((g) => g.parts).length, 'ids únicos no rig');
  for (const p of novas) {
    assert.match(p.showIf, /^nv_nv\d{3}$|^costume_bermudaNv\d{3}$/);
    const nums = p.path.match(/-?\d+(\.\d+)?/g).map(Number);
    assert.ok(nums.every(Number.isFinite), p.id);
    assert.ok(!/NaN|undefined/.test(p.path), p.id);
  }
  // Pontos absolutos (sem os deslocamentos relativos dos arcos) cabem na caixa + espaço da fantasia.
  for (const p of novas.filter((x) => !/a\d/.test(x.path))) {
    const nums = p.path.replace(/[A-Za-z]/g, ' ').trim().split(/[\s,]+/).map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      assert.ok(nums[i] >= 0 && nums[i] <= 180, `${p.id} x=${nums[i]}`);
      assert.ok(nums[i + 1] >= -32 && nums[i + 1] <= 170, `${p.id} y=${nums[i + 1]}`);
    }
  }
  for (const p of CAT.filter((x) => x.parte === 'bermuda')) assert.ok(r.costumes[canalDaPeca(p).replace('costume_', '')].palette.shorts);
});

test('bloqueado nunca aparece: lista, busca, vestir, canais e resumo da Central só têm o que já foi liberado', () => {
  const L = 14;
  assert.ok(visuaisLiberados(N, L).every((p) => p.nivel <= L));
  assert.equal(visuaisLiberados(N, L).length, L - 1);
  assert.equal(visuaisLiberados(N, 1).length, 0, 'nível 1: nada');
  const bloqueada = CAT.find((p) => p.nivel === 15);
  assert.equal(pecaLiberada(N, L, bloqueada.id), null);
  assert.equal(acharVisual(N, L, bloqueada.nome), null, 'busca pelo nome exato não acha');
  assert.equal(acharVisual(N, L, bloqueada.id), null);
  assert.equal(acharVisual(N, 15, bloqueada.nome).id, bloqueada.id, 'liberou, acha');
  const antes = { pecas: { cabeca: 'nv011' }, visto: L };
  assert.deepEqual(vestirVisual(antes, N, L, bloqueada.id).estado.pecas, antes.pecas, 'vestir bloqueada não muda nada');
  // Estado forjado com peça bloqueada: não liga canal nem aparece no resumo.
  const forjado = { pecas: { [bloqueada.parte]: bloqueada.id, cabeca: 'nv011' }, visto: L };
  assert.deepEqual(canaisVisual(forjado, N, L), { nv_nv011: 1 });
  const snap = visualSnapshot(forjado, N, L);
  const json = JSON.stringify(snap);
  for (const p of CAT.filter((x) => x.nivel > L)) assert.ok(!json.includes(p.nome) && !json.includes(`"${p.id}"`), p.nome);
  assert.equal(snap.total, L - 1);
  assert.deepEqual(snap.vestido, { cabeca: 'nv011' });
  assert.ok(snap.partes.every((pt) => pt.itens.length > 0), 'parte sem peça liberada nem aparece');
  assert.deepEqual(visualSnapshot({}, N, 1), { vestido: {}, partes: [], total: 0 });
});

test('subir de nível: primeira vez veste o melhor de cada parte; depois só a peça nova, respeitando o que ela tirou', () => {
  let { estado, novas } = aplicarNivel({}, N, 12);
  assert.equal(novas.length, 11);
  assert.deepEqual(estado.pecas, melhorConjunto(N, 12));
  assert.equal(estado.visto, 12);
  estado = vestirVisual(estado, N, 12, estado.pecas.cabeca).estado; // ela tirou a peça da cabeça
  assert.equal(estado.pecas.cabeca, undefined);
  ({ estado, novas } = aplicarNivel(estado, N, 13)); // nível 13 libera pulsos
  assert.deepEqual(novas.map((p) => p.parte), ['pulsos']);
  assert.equal(estado.pecas.pulsos, 'nv013');
  assert.equal(estado.pecas.cabeca, undefined, 'a cabeça continua como ela deixou');
  assert.deepEqual(aplicarNivel(estado, N, 13).novas, [], 'mesmo nível: nada novo');
  // Tudo liberado pode ser vestido à vontade, inclusive peça antiga.
  const antiga = vestirVisual(estado, N, 13, 'nv004');
  assert.equal(antiga.estado.pecas.cabeca, 'nv004');
});

test('convive com roupa e fantasia: a parte ocupada fica com elas', () => {
  const s = { pecas: melhorConjunto(N, 30), visto: 30 };
  const tudo = canaisVisual(s, N, 30);
  const cab = canalDaPeca(CAT.find((p) => p.id === s.pecas.cabeca));
  assert.equal(tudo[cab], 1);
  assert.equal(canaisVisual(s, N, 30, { outfit: { cabeca: 'coroa' } })[cab], undefined);
  assert.equal(canaisVisual(s, N, 30, { fantasia: 'natal' })[cab], undefined);
  assert.equal(canaisVisual(s, N, 30, { fantasia: 'diya' })[cab], 1, 'fantasia na mão não tira a coroa');
  const ber = canalDaPeca(CAT.find((p) => p.id === s.pecas.bermuda));
  assert.equal(canaisVisual(s, N, 30, { fantasia: 'natal' })[ber], undefined, 'bermuda da fantasia vence');
  assert.equal(canaisVisual({}, N, 30), null);
});

test('estado salvo: só peças que existem e na parte certa', () => {
  assert.deepEqual(sanitizeVisual(null), { pecas: {}, visto: 0 });
  assert.deepEqual(sanitizeVisual({ pecas: { cabeca: 'nv004', pulsos: 'nv004', aura: 'x', bermuda: 'nv006' }, visto: 9 }), { pecas: { cabeca: 'nv004', bermuda: 'nv006' }, visto: 9 });
  const { settings, issues } = sanitize({ visualNivel: { pecas: { cabeca: 'nv004', pulsos: 'nv999' }, visto: 4 } });
  assert.deepEqual(settings.visualNivel, { pecas: { cabeca: 'nv004' }, visto: 4 });
  assert.ok(issues.includes('visualNivel'));
});

test('coleção: acessórios bloqueados não saem no resumo da progressão', () => {
  const p = new Progress({ data: PROG, state: { xp: 0 }, save: () => {} });
  const snap = p.snapshot();
  assert.equal(snap.nivel, 1);
  assert.deepEqual(snap.acessorios, []);
  p.st.xp = p.threshold(3);
  assert.deepEqual(p.snapshot().acessorios.map((a) => a.prop), ['oculos', 'medalha']);
});

test('companion: subir de nível veste a peça nova, avisa e manda os canais ao desenho; /vestir só acha o que foi liberado', () => {
  const e = makeEnv({ settings: { speechFrequency: 'off' } });
  try {
    e.companion.start();
    e.clock.advance(2500);
    assert.equal(e.overlay.state.visualNivel, null, 'nível 1: nenhum visual');
    const ganhar = (n, amount) => e.companion.progress.award({ id: `t${n}`, amount, source: 'todo', day: '2026-10-30', label: 'teste' });
    ganhar(1, 60); // 600 XP → nível 2
    assert.equal(e.companion.progress.nivel, 2);
    const vn = e.store.get().visualNivel;
    assert.deepEqual(vn, { pecas: { pescoco: 'nv002' }, visto: 2 });
    e.clock.advance(6000);
    assert.deepEqual(e.overlay.state.visualNivel, { nv_nv002: 1 });
    const falas = e.overlay.bubbles ? e.overlay.bubbles.map((b) => b.text) : [];
    if (falas.length) assert.ok(falas.some((t) => t.includes('Cordão de Lambari')), falas.join(' | '));
    // Peça de nível maior não é encontrada por nome.
    const r = e.companion.runCommand('vestir', null, `/vestir ${CAT.find((p) => p.nivel === 3).nome}`);
    assert.match(r.text, /Não tenho essa peça/);
    // Tira e veste de novo a liberada; "melhor" volta o melhor de cada parte.
    e.companion.runCommand('vestir', null, '/vestir nv002');
    assert.deepEqual(e.store.get().visualNivel.pecas, {});
    e.companion.runCommand('vestir', null, '/vestir melhor');
    assert.deepEqual(e.store.get().visualNivel.pecas, { pescoco: 'nv002' });
  } finally {
    e.companion.stop();
  }
});
