// Visuais por nível com REGRA IRREDUTÍVEL (pedido de 18/11/2026): todo título é
// referência a filme, anime, série ou cultura pop, todas as clássicas de tubarão
// estão presentes, e a peça, a fala e a reação de cada nível são dessa referência.
// Cada nível libera uma peça; tudo o que foi liberado pode ser vestido à vontade;
// o que está bloqueado nunca aparece.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJSON, makeEnv } from './helpers.js';
import {
  VISUAL_PARTES, gerarVisuais, partesDaPeca, rigComVisuais, visuaisLiberados, pecaLiberada, melhorConjunto,
  aplicarNivel, vestirVisual, canaisVisual, visualSnapshot, acharVisual, sanitizeVisual, canalDaPeca,
} from '../../src/core/visual-nivel.js';
import { Progress } from '../../src/core/catalog/antitedio.js';
import { sanitize } from '../../src/core/settings-schema.js';

const PROG = loadJSON('assets/catalog/progressao.json');
const REF = { referencias: PROG.referencias, extras: PROG.extras };
const RIG = loadJSON('assets/character/jojo.rig.json');
const CAT = gerarVisuais(REF);
const NIVEIS = PROG.referencias.length;
const ANIMS = new Set(loadJSON('assets/catalog/animacoes.json').itens.map((i) => i.id));
const PACOTES = new Set(loadJSON('assets/catalog/pacotes.json').reacoes.map((r) => r.id));

test('regra irredutível: 200+ títulos, cada um de uma obra diferente (filme, anime, série, jogo ou cultura pop)', () => {
  assert.ok(PROG.niveis.length >= 200);
  assert.equal(PROG.referencias.length, PROG.niveis.length);
  assert.equal(new Set(PROG.niveis).size, PROG.niveis.length, 'títulos únicos');
  assert.equal(new Set(PROG.referencias.map((r) => r.obra)).size, PROG.referencias.length, 'nenhuma obra se repete');
  assert.ok(!PROG.referencias.some((r) => /South Park/.test(r.obra)), 'South Park fica só nos extras');
  const tipos = new Set(['filme', 'anime', 'série', 'desenho', 'música', 'meme', 'jogo', 'cultura pop']);
  for (const r of PROG.referencias) {
    assert.ok(r.titulo && r.obra && r.obra.length >= 3, r.titulo);
    assert.ok(tipos.has(r.tipo), `${r.titulo}: tipo ${r.tipo}`);
  }
  for (const t of ['filme', 'anime', 'série', 'meme', 'jogo']) assert.ok(PROG.referencias.filter((r) => r.tipo === t).length >= 10, t);
});

test('extras: 20 de South Park (um a cada 10 níveis) e 50 de memes do Twitter (um a cada 4), sem repetir', () => {
  const sp = PROG.extras.filter((x) => x.colecao === 'South Park');
  const tw = PROG.extras.filter((x) => x.colecao === 'memes do Twitter');
  assert.equal(sp.length, 20);
  assert.equal(tw.length, 50);
  assert.deepEqual(sp.map((x) => x.nivel), Array.from({ length: 20 }, (_, i) => (i + 1) * 10));
  assert.deepEqual(tw.map((x) => x.nivel), Array.from({ length: 50 }, (_, i) => (i + 1) * 4));
  assert.ok(sp.every((x) => x.obra === 'South Park'));
  assert.equal(new Set(PROG.extras.map((x) => x.titulo)).size, 70, 'nenhum extra repetido');
  // Nenhum meme dos extras repete um título de nível.
  const titulos = new Set(PROG.niveis.map((t) => t.toLowerCase()));
  assert.ok(tw.every((x) => !titulos.has(x.titulo.toLowerCase())));
  const cat = CAT.filter((p) => p.extra);
  assert.equal(cat.length, 70);
  assert.ok(cat.every((p) => /^(sp|tw)\d{2}$/.test(p.id) && partesDaPeca(p).length >= 1));
  assert.equal(new Set(CAT.map((p) => p.nome)).size, CAT.length, 'nenhuma peça com nome repetido');
});

test('regra irredutível: todas as referências clássicas de tubarão estão presentes', () => {
  const obras = PROG.referencias.map((r) => `${r.titulo} | ${r.obra} | ${r.peca} | ${r.fala}`).join('\n');
  const classicos = [
    /Tubarão \(1975\)/, /Tubarão 2/, /Tubarão 3/, /Tubarão 4/, /barco maior/i, /Bruce/,
    /Megatubarão \(The Meg\)/, /Do Fundo do Mar/, /Sharknado/, /Águas Rasas/, /Medo Profundo/, /Mar Aberto/,
    /Espanta Tubarões/, /Don Lino/, /Lenny/, /Procurando Nemo/, /Peixe É Amigo/, /Jabberjaw/, /Street Sharks/,
    /Sharkboy/, /Baby Shark/, /Shark Week/, /Left Shark/, /Pular o Tubarão/, /Shark Tank/, /Saturday Night Live/, /King Shark/,
    /Jeff/, /Kisame/, /Samehada/, /Arlong/, /Jinbe/, /Gawr Gura/, /Blåhaj/, /Sharpedo/, /Sharktopus/,
    /Polvo Gigante/, /Duas Cabeças/, /Ghost Shark/, /Sand Sharks/, /Zombie Shark/, /Hungry Shark/, /Mako/, /Repelente de Tubarão/,
    /Benchley/,
  ];
  for (const re of classicos) assert.match(obras, re);
});

test('regra irredutível: peça, fala e reação de cada nível são da referência daquele nível', () => {
  assert.equal(CAT.filter((p) => !p.extra).length, PROG.niveis.length - 1, 'uma peça por nível do 2 ao último');
  const partes = new Set(VISUAL_PARTES.map((p) => p.id));
  for (const p of CAT) {
    if (!p.extra) assert.equal(p.titulo, PROG.referencias[p.nivel - 1].titulo);
    assert.ok(partes.has(p.parte), p.nome);
    assert.ok(p.nome && p.nome.length <= 60, p.nome);
    assert.ok(p.fala && p.fala.length >= 10 && p.fala.length <= 160, p.titulo);
    assert.ok(partesDaPeca(p).length >= 1, `${p.nome} sem desenho`);
    assert.ok(ANIMS.has(p.anim), `${p.titulo}: animação ${p.anim} não existe`);
    if (p.reacao) assert.ok(PACOTES.has(p.reacao), `${p.titulo}: reação ${p.reacao} não existe`);
    // A fala não pode ofender o corpo dela nem trazer palavra proibida.
    assert.ok(!/gord|feia|baleia(?!ir)/i.test(p.fala), p.fala);
  }
  assert.equal(new Set(CAT.map((p) => p.nome)).size, CAT.length, 'peças com nome único');
  for (const pt of VISUAL_PARTES) assert.ok(CAT.filter((p) => p.parte === pt.id).length >= 5, pt.id);
});

test('progressão visual: o conjunto vestido melhora a cada nível', () => {
  const riqueza = (L) => Object.values(melhorConjunto(REF, L)).reduce((s, id) => {
    const p = CAT.find((x) => x.id === id);
    return s + 1 + Math.min(2, Math.floor(p.t * 3)) + p.t;
  }, 0);
  for (let L = 2; L <= NIVEIS; L++) assert.ok(riqueza(L) > riqueza(L - 1), `nível ${L} precisa ser melhor que o ${L - 1}`);
  // Mais peças vestidas e acabamento (brilhos) no topo.
  assert.equal(Object.keys(melhorConjunto(REF, NIVEIS)).length, VISUAL_PARTES.length);
  const topo = CAT.at(-1);
  assert.ok(partesDaPeca(topo).some((x) => x.part.id.includes('brilho')), 'o último nível tem acabamento');
});

test('desenho: só peças por cima (corpo intacto), ids únicos, números válidos e dentro do espaço da janela', () => {
  const r = rigComVisuais(RIG, REF);
  assert.equal(RIG.groups.some((g) => g.id === 'nivelAura'), false, 'não altera o rig original');
  assert.equal(r.groups[0].id, 'nivelAura', 'aura atrás de tudo');
  for (const id of ['nivelAura', 'nivelPintura', 'nivelBrilho']) assert.equal(r.groups.find((g) => g.id === id).hideIf, 'mooning', 'de costas some');
  for (const g of RIG.groups) assert.deepEqual(r.groups.find((x) => x.id === g.id).parts.slice(0, g.parts.length), g.parts, g.id);
  const todas = r.groups.flatMap((g) => g.parts);
  assert.equal(new Set(todas.map((p) => p.id)).size, todas.length, 'ids únicos no rig');
  const novas = todas.filter((p) => /^(nv\d{3}|sp\d{2}|tw\d{2})_/.test(p.id));
  assert.ok(novas.length > 600);
  for (const p of novas) {
    assert.match(p.showIf, /^nv_(nv\d{3}|sp\d{2}|tw\d{2})$/);
    assert.ok(!/NaN|undefined/.test(p.path), p.id);
    assert.match(p.fill, /^#[0-9a-f]{6}$/i, p.id);
    // Pontos absolutos (sem os deslocamentos relativos dos arcos e curvas) cabem no espaço da janela.
    for (const seg of p.path.split(/(?=[MLZ])/)) {
      if (!/^[ML]/.test(seg)) continue;
      const [x, y] = seg.slice(1).split(/[\s,]+/).map(Number);
      assert.ok(x >= 0 && x <= 180, `${p.id} x=${x}`);
      assert.ok(y >= -36 && y <= 172, `${p.id} y=${y}`);
    }
  }
  for (const p of CAT.filter((x) => x.parte === 'bermuda')) assert.ok(r.costumes[`bermuda${p.id}`].palette.shorts);
});

test('bloqueado nunca aparece: lista, busca, vestir, canais e resumo da Central só têm o que já foi liberado', () => {
  const L = 14;
  assert.ok(visuaisLiberados(REF, L).every((p) => p.nivel <= L));
  assert.equal(visuaisLiberados(REF, L).length, L - 1 + 1 + 3, 'níveis 2 a 14, o South Park do 10 e os memes do 4, 8 e 12');
  assert.equal(visuaisLiberados(REF, 1).length, 0, 'nível 1: nada');
  const bloqueada = CAT.find((p) => p.nivel === 15);
  assert.equal(pecaLiberada(REF, L, bloqueada.id), null);
  assert.equal(acharVisual(REF, L, bloqueada.nome), null, 'busca pelo nome exato não acha');
  assert.equal(acharVisual(REF, L, bloqueada.titulo), null, 'nem pelo título');
  assert.equal(acharVisual(REF, L, bloqueada.id), null);
  assert.equal(acharVisual(REF, 15, bloqueada.nome).id, bloqueada.id, 'liberou, acha');
  const antes = { pecas: { cabeca: 'nv003' }, visto: L };
  assert.deepEqual(vestirVisual(antes, REF, L, bloqueada.id).estado.pecas, antes.pecas, 'vestir bloqueada não muda nada');
  const forjado = { pecas: { [bloqueada.parte]: bloqueada.id, cabeca: 'nv003' }, visto: L };
  assert.deepEqual(canaisVisual(forjado, REF, L), { nv_nv003: 1 });
  const json = JSON.stringify(visualSnapshot(forjado, REF, L));
  const snap = visualSnapshot(forjado, REF, L);
  const titulos = new Set(snap.partes.flatMap((pt) => pt.itens.map((i) => i.titulo)));
  for (const p of CAT.filter((x) => x.nivel > L)) assert.ok(!json.includes(`"${p.nome}"`) && !json.includes(`"${p.id}"`) && !titulos.has(p.titulo), p.nome);
  assert.equal(snap.total, L + 3);
  assert.deepEqual(snap.vestido, { cabeca: 'nv003' });
  assert.ok(snap.partes.every((pt) => pt.itens.length > 0), 'parte sem peça liberada nem aparece');
  assert.ok(snap.partes.flatMap((pt) => pt.itens).every((i) => i.obra && i.titulo), 'cada peça mostra a obra');
  const zero = visualSnapshot({}, REF, 1);
  assert.deepEqual([zero.vestido, zero.partes, zero.total, zero.novos], [{}, [], 0, 0]);
  // Bloqueados: só cadeado com o nível; nenhuma pista do que é.
  assert.equal(snap.bloqueados.length, CAT.length - (L + 3));
  for (const b of snap.bloqueados) {
    assert.deepEqual(Object.keys(b), ['nivel']);
    assert.ok(b.nivel > L);
  }
  // Liberados: descrição = fala da referência.
  for (const i of snap.partes.flatMap((pt) => pt.itens)) assert.equal(i.descricao, CAT.find((p) => p.id === i.id).fala);
});

test('subir de nível: primeira vez veste o mais recente de cada parte; depois só a peça nova, respeitando o que ela tirou', () => {
  let { estado, novas } = aplicarNivel({}, REF, 12);
  assert.equal(novas.length, 15, 'níveis 2 a 12, o South Park do 10 e os memes do 4, 8 e 12');
  assert.deepEqual(estado.pecas, melhorConjunto(REF, 12));
  estado = vestirVisual(estado, REF, 12, estado.pecas.cabeca).estado; // ela tirou a peça da cabeça
  assert.equal(estado.pecas.cabeca, undefined);
  ({ estado, novas } = aplicarNivel(estado, REF, 13)); // 13: One Piece → Kiribachi
  assert.deepEqual(novas.map((p) => [p.parte, p.titulo]), [['mao', 'Homens-Peixe']]);
  assert.equal(estado.pecas.mao, 'nv013');
  assert.equal(estado.pecas.cabeca, undefined, 'a cabeça continua como ela deixou');
  assert.deepEqual(aplicarNivel(estado, REF, 13).novas, [], 'mesmo nível: nada novo');
  assert.equal(vestirVisual(estado, REF, 13, 'nv003').estado.pecas.cabeca, 'nv003', 'peça antiga pode ser vestida à vontade');
});

test('convive com roupa, fantasia e animações com objeto na mão', () => {
  const s = { pecas: melhorConjunto(REF, 40), visto: 40 };
  const tudo = canaisVisual(s, REF, 40);
  const ch = (parte) => canalDaPeca(CAT.find((p) => p.id === s.pecas[parte]));
  assert.equal(tudo[ch('cabeca')], 1);
  assert.equal(canaisVisual(s, REF, 40, { outfit: { cabeca: 'coroa' } })[ch('cabeca')], undefined);
  assert.equal(canaisVisual(s, REF, 40, { fantasia: 'natal' })[ch('cabeca')], undefined);
  assert.equal(canaisVisual(s, REF, 40, { fantasia: 'diya' })[ch('cabeca')], 1, 'fantasia na mão não tira o chapéu');
  assert.equal(canaisVisual(s, REF, 40, { maoLivre: false })[ch('mao')], undefined, 'mão ocupada pela animação');
  assert.equal(canaisVisual(s, REF, 40, { fantasia: 'natal' })[ch('bermuda')], undefined, 'bermuda da fantasia vence');
  assert.equal(canaisVisual({}, REF, 40), null);
});

test('estado salvo: só peças que existem e na parte certa', () => {
  assert.deepEqual(sanitizeVisual(null), { pecas: {}, visto: 0, novas: [], avisar: [] });
  assert.deepEqual(sanitizeVisual({ pecas: { cabeca: 'nv003', pulsos: 'nv003', aura: 'x' }, visto: 9, novas: ['nv003', 'x', 'nv003'], avisar: 'nv004' }, REF), { pecas: { cabeca: 'nv003' }, visto: 9, novas: ['nv003'], avisar: [] });
  const { settings, issues } = sanitize({ visualNivel: { pecas: { cabeca: 'nv003', voo: 'nv004' }, visto: 4 } });
  assert.deepEqual(settings.visualNivel, { pecas: { cabeca: 'nv003' }, visto: 4, novas: [], avisar: [] });
  assert.ok(issues.includes('visualNivel'));
});

test('coleção: acessórios bloqueados não saem no resumo da progressão', () => {
  const p = new Progress({ data: PROG, state: { xp: 0 }, save: () => {} });
  assert.deepEqual(p.snapshot().acessorios, []);
  p.st.xp = p.threshold(3);
  assert.deepEqual(p.snapshot().acessorios.map((a) => a.prop), ['oculos', 'medalha']);
});

test('companion: subir de nível veste a peça da referência, fala a frase dela e manda os canais ao desenho', () => {
  const e = makeEnv({ settings: { speechFrequency: 'off' } });
  try {
    e.companion.start();
    e.clock.advance(2500);
    assert.equal(e.overlay.state.visualNivel, null, 'nível 1: nenhum visual');
    const falas = [];
    const say = e.companion.say.bind(e.companion);
    e.companion.say = (t, ...rest) => { const ok = say(t, ...rest); if (ok) falas.push(t); return ok; };
    e.companion.progress.award({ id: 't1', amount: 60, source: 'todo', day: '2026-10-30', label: 'teste' }); // 600 XP → nível 2
    assert.equal(e.companion.progress.nivel, 2);
    assert.deepEqual(e.store.get().visualNivel.pecas, { pescoco: 'nv002' });
    assert.deepEqual(e.store.get().visualNivel.novas, ['nv002']);
    e.clock.advance(20000);
    assert.deepEqual(e.overlay.state.visualNivel, { nv_nv002: 1 });
    assert.ok(falas.some((t) => t.includes(PROG.referencias[1].fala) && t.includes('Nível 2')), `aviso com a fala da referência: ${falas.join(' | ')}`);
    assert.deepEqual(e.store.get().visualNivel.avisar, [], 'anunciado uma vez');
    e.companion.marcarVisuaisVistos();
    assert.deepEqual(e.store.get().visualNivel.novas, []);
    const r = e.companion.runCommand('vestir', null, `/vestir ${CAT.find((p) => p.nivel === 3).nome}`);
    assert.match(r.text, /Não tenho essa peça/, 'peça de nível maior não é encontrada');
    e.companion.runCommand('vestir', null, '/vestir nv002');
    assert.deepEqual(e.store.get().visualNivel.pecas, {});
    const de = e.companion.runCommand('vestir', null, '/vestir peixe é amigo, não comida');
    assert.equal(de.text, PROG.referencias[1].fala, 'vestir pelo título fala a frase da referência');
    e.companion.runCommand('vestir', null, '/vestir nv002');
    e.companion.runCommand('vestir', null, '/vestir melhor');
    assert.deepEqual(e.store.get().visualNivel.pecas, { pescoco: 'nv002' });
  } finally {
    e.companion.stop();
  }
});

test('aviso: quem já tinha nível recebe a lista do que está liberado; no Modo Trabalho o aviso espera', () => {
  const e = makeEnv({ settings: { speechFrequency: 'off' } });
  try {
    e.companion.progress.st.xp = e.companion.progress.threshold(30);
    e.companion._syncVisual({ anunciar: false }); // como na abertura do app depois da atualização
    const vn = e.store.get().visualNivel;
    assert.equal(vn.avisar.length, 39, '29 dos níveis, 3 de South Park e 7 memes');
    assert.equal(vn.novas.length, 39);
    const falas = [];
    const say = e.companion.say.bind(e.companion);
    e.companion.say = (t, ...rest) => { const ok = say(t, ...rest); if (ok) falas.push(t); return ok; };
    e.companion.start();
    e.companion.startWork();
    e.clock.advance(70000);
    assert.ok(!falas.some((t) => /liberou 39 visuais/.test(t)), 'no Modo Trabalho não fala');
    assert.equal(e.store.get().visualNivel.avisar.length, 39, 'continua guardado');
    e.companion.endWork();
    e.clock.advance(70000);
    const aviso = falas.find((t) => /liberou 39 visuais/.test(t));
    assert.ok(aviso, falas.join(' | '));
    assert.match(aviso, /Toalha do Toalhinha/, 'cita as mais recentes');
    assert.deepEqual(e.store.get().visualNivel.avisar, []);
    assert.equal(e.store.get().visualNivel.novas.length, 39, 'continuam com o selo de novo até abrir a Central');
  } finally {
    e.companion.stop();
  }
});
