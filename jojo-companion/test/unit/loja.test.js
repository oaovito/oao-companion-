// Loja de JOJOcoins: catálogo, preços, carteira, compras atômicas e idempotentes,
// falha de gravação, fila de efeitos, migração/reversão, 150 itens um a um e 10 mil transações.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ITENS, CATEGORIAS, RARIDADES, NOME_MOEDA, TAXA_HORA, indiceValor, horasDoIndice, raridadeDasHoras, item } from '../../src/core/loja-catalogo.js';
import { Loja, lojaVazia, validarLoja, migrarLoja, rebaixarLoja, NIVEL_MINIMO, LOJA_LIMITES, FATOR_FONTE, VERSAO_LOJA } from '../../src/core/loja.js';
import { LOOKS, OBJETOS, DECOR, canaisLook } from '../../src/core/loja-arte.js';
import { itensLoja, animDoItem, ROTEIROS } from '../../src/core/loja-anims.js';
import { iconeItem } from '../../src/core/loja-icones.js';
import { buildAnimation } from '../../src/core/catalog/recipes.js';
import { Needs, emptyNeeds } from '../../src/core/needs.js';
import { loadJSON, seededRng } from './helpers.js';

const DIA = '2026-11-24';
const nova = (extra = {}) => {
  let t = Date.parse('2026-11-24T12:00:00Z');
  const salvos = [];
  const loja = new Loja({ now: () => t, dia: () => DIA, save: (st) => salvos.push(structuredClone(st)), ...extra });
  return { loja, salvos, avanca: (ms) => { t += ms; } };
};
const rico = (loja, n = 1e6) => { loja.st.saldo = n; loja.st.ganhoTotal = n; };

// ---------------------------------------------------------------- catálogo

test('catálogo: 150 itens com a distribuição pedida, ids únicos e nome oficial da moeda', () => {
  assert.equal(NOME_MOEDA, 'JOJOcoins');
  assert.equal(ITENS.length, 150);
  assert.equal(new Set(ITENS.map((i) => i.id)).size, 150);
  const por = Object.fromEntries(CATEGORIAS.map((c) => [c.id, ITENS.filter((i) => i.tipo === c.id).length]));
  assert.deepEqual(por, { visual: 30, comida: 20, objeto: 15, decoracao: 15, animacao: 15, poder: 15, atividade: 10, cuidado: 10, colecionavel: 10, lendario: 10 });
  for (const it of ITENS) {
    assert.ok(it.nome && it.desc && it.fala, it.id);
    assert.ok(Number.isInteger(it.preco) && it.preco > 0, it.id);
    assert.equal(it.v.length, 13, it.id);
  }
});

test('preço vem do índice de valor: monótono, nas 7 faixas de tempo e sem item fora da faixa', () => {
  const ordenados = [...ITENS].sort((a, b) => a.indice - b.indice);
  for (let i = 1; i < ordenados.length; i++) assert.ok(ordenados[i].preco >= ordenados[i - 1].preco * 0.9, `${ordenados[i].id} barato demais para o índice`);
  for (const it of ITENS) {
    assert.equal(it.indice, indiceValor(it.v));
    const faixa = RARIDADES.find((r) => r.id === it.raridade);
    const h = it.preco / TAXA_HORA;
    assert.ok(h >= faixa.horas[0] && h < faixa.horas[1], `${it.id}: ${h} h fora de ${faixa.id}`);
    assert.equal(raridadeDasHoras(h).id, it.raridade);
  }
  assert.ok(horasDoIndice(30) < 0.15 && horasDoIndice(69) > 24);
  for (const r of RARIDADES) assert.ok(ITENS.some((i) => i.raridade === r.id), `faixa ${r.id} vazia`);
  for (const it of ITENS.filter((i) => i.tipo === 'lendario')) assert.ok(['lendario', 'extraordinario'].includes(it.raridade), it.id);
});

test('todo item tem conteúdo real: arte, animação, efeito ou recurso funcionando', () => {
  const anims = new Map(itensLoja().map((a) => [a.id, a]));
  for (const it of ITENS) {
    const e = it.efeito;
    if (e.look) { assert.ok(LOOKS[e.look], it.id); assert.ok(canaisLook(e.look)[`lj_${e.look}`], it.id); }
    if (e.anim) { const a = anims.get(animDoItem(e.anim)); assert.ok(a, it.id); assert.equal(a.loja, it.id); assert.ok(Object.keys(buildAnimation(a).tracks).length > 2, it.id); }
    if (it.tipo === 'objeto') assert.ok(OBJETOS[it.id], it.id);
    if (e.decor) assert.ok(DECOR[e.decor], it.id);
    if (e.roteiro) assert.ok(e.roteiro in ROTEIROS, it.id);
    if (['comida', 'cuidado', 'poder', 'atividade', 'colecionavel'].includes(it.tipo)) assert.match(iconeItem(it.id) || '', /^<svg/, it.id);
    assert.ok(e.look || e.anim || e.decor || e.roteiro || e.recurso || e.mod || e.acao || e.lore || it.tipo === 'comida' || it.tipo === 'cuidado', `${it.id} sem efeito`);
  }
});

// ---------------------------------------------------------------- 150 itens, um a um

for (const it of ITENS) {
  test(`item ${it.id} (${it.nome}): compra, cobrança exata, idempotência e uso`, () => {
    const { loja } = nova();
    rico(loja, it.preco * 3);
    const nivel = NIVEL_MINIMO[it.raridade] || 1;
    if (nivel > 1) assert.equal(loja.comprar({ txId: `n-${it.id}`, id: it.id, nivel: nivel - 1 }).motivo, 'nivel');
    const r = loja.comprar({ txId: `c-${it.id}`, id: it.id, nivel });
    assert.equal(r.ok, true);
    assert.equal(loja.st.saldo, it.preco * 2);
    const de = loja.comprar({ txId: `c-${it.id}`, id: it.id, nivel });
    assert.equal(de.repetida, true);
    assert.equal(loja.st.saldo, it.preco * 2, 'a mesma transação não cobra duas vezes');
    assert.ok(loja.possui(it.id));
    if (!it.consumivel) {
      assert.equal(loja.comprar({ txId: `d-${it.id}`, id: it.id, nivel }).motivo, 'possui');
      assert.equal(loja.usar({ txId: `u-${it.id}`, id: it.id }).motivo, 'naoConsumivel');
    } else {
      const u = loja.usar({ txId: `u-${it.id}`, id: it.id });
      assert.equal(u.ok, true);
      assert.equal(loja.qtd(it.id), 0);
      assert.equal(loja.usar({ txId: `u2-${it.id}`, id: it.id }).motivo, 'semEstoque');
      if (it.efeito.mod) assert.ok(loja.mods()[it.efeito.mod] != null, 'poder ativo');
      if (it.tipo === 'comida' || it.tipo === 'cuidado') assert.equal(loja.st.pendentes.length, 1);
    }
    assert.equal(loja.st.ganhoTotal - loja.st.gastoTotal, loja.st.saldo);
  });
}

// ---------------------------------------------------------------- carteira

test('saldo insuficiente e quantidade inválida não mudam nada', () => {
  const { loja, salvos } = nova();
  loja.st.saldo = 10;
  assert.deepEqual(loja.comprar({ txId: 'a1', id: 'lv01', nivel: 99 }).motivo, 'saldo');
  assert.equal(loja.comprar({ txId: 'a2', id: 'lc01', qtd: 0 }).motivo, 'quantidade');
  assert.equal(loja.comprar({ txId: 'a3', id: 'naoexiste' }).motivo, 'inexistente');
  assert.equal(loja.st.saldo, 10);
  assert.equal(salvos.length, 0);
  assert.throws(() => loja.comprar({ id: 'lc01' }), /identificador/);
});

test('ganho por reconciliação: idempotente, fator por fonte, teto do dia e progresso reiniciado', () => {
  const { loja } = nova();
  const h = [
    { sequence: 1, amount: 50, source: 'interaction', day: DIA, label: 'Conversa' },
    { sequence: 2, amount: 300, source: 'feeding', day: DIA, label: 'Peixe' },
    { sequence: 3, amount: 100, source: 'todo', day: DIA, label: 'Tarefa' },
  ];
  assert.equal(loja.reconciliar(h), 5 + 30 * FATOR_FONTE.feeding + Math.floor(10 * FATOR_FONTE.todo));
  const s = loja.st.saldo;
  assert.equal(loja.reconciliar(h), 0, 'reprocessar não credita de novo');
  assert.equal(loja.st.saldo, s);
  // Teto do dia.
  const muitos = Array.from({ length: 400 }, (_, i) => ({ sequence: 10 + i, amount: 500, source: 'interaction', day: DIA }));
  loja.reconciliar(muitos);
  assert.equal(loja.st.dia.ganho, LOJA_LIMITES.tetoDia);
  // Progresso zerado (sequência voltou): rebase sem crédito, e depois volta a ganhar.
  const antes = loja.st.saldo;
  loja.reconciliar([{ sequence: 1, amount: 10, source: 'interaction', day: '2026-11-25' }]);
  assert.equal(loja.st.saldo, antes);
  assert.equal(loja.st.ultimaSeq, 1);
});

test('crédito externo (outras partes do app) é idempotente pelo id e passa pelos poderes', () => {
  const { loja } = nova();
  assert.equal(loja.creditar({ id: 'missao:diaria:2026-11-24:agua', valor: 40, origem: 'missao' }).creditado, 40);
  assert.equal(loja.creditar({ id: 'missao:diaria:2026-11-24:agua', valor: 40, origem: 'missao' }).duplicado, true);
  rico(loja, 100000);
  loja.comprar({ txId: 'p15', id: 'lp15', nivel: 99 }); loja.usar({ txId: 'u15', id: 'lp15' });
  loja.comprar({ txId: 'p05', id: 'lp05', nivel: 99 }); loja.usar({ txId: 'u05', id: 'lp05' });
  assert.equal(loja.creditar({ id: 'm2', valor: 40, origem: 'missao' }).creditado, 100); // 40 × 1,25 × 2
  assert.throws(() => loja.creditar({ id: 'x', valor: -1 }));
});

test('falha ao gravar: nada muda, e a mesma transação pode ser repetida depois', () => {
  let falhar = true;
  const loja = new Loja({ dia: () => DIA, save: () => { if (falhar) throw new Error('disco cheio'); } });
  loja.st.saldo = 1000;
  assert.throws(() => loja.comprar({ txId: 'tx', id: 'lc01', nivel: 9 }));
  assert.equal(loja.st.saldo, 1000);
  assert.equal(loja.qtd('lc01'), 0);
  assert.equal(loja.st.tx.tx, undefined);
  falhar = false;
  assert.equal(loja.comprar({ txId: 'tx', id: 'lc01', nivel: 9 }).ok, true);
  assert.equal(loja.st.saldo, 1000 - item('lc01').preco);
});

test('pedidos simultâneos: duas compras com saldo para uma só → uma passa, a outra recusa', async () => {
  const { loja } = nova();
  loja.st.saldo = item('lv01').preco + 5;
  const r = await Promise.all([1, 2].map((i) => Promise.resolve().then(() => loja.comprar({ txId: `s${i}`, id: i === 1 ? 'lv01' : 'lv02', nivel: 99 }))));
  assert.equal(r.filter((x) => x.ok).length, 1);
  assert.equal(r.filter((x) => x.motivo === 'saldo').length, 1);
  assert.ok(loja.st.saldo >= 0);
});

test('travamento depois do uso: efeito pendente sobrevive à reabertura e é aplicado uma vez só', () => {
  const { loja } = nova();
  rico(loja, 5000);
  loja.comprar({ txId: 'c', id: 'lc01', qtd: 2, nivel: 9 });
  loja.usar({ txId: 'u', id: 'lc01' });
  // "Fecha" o app antes de aplicar: o arquivo salvo tem o pendente.
  const salvo = JSON.parse(JSON.stringify(loja.st));
  const reaberta = new Loja({ state: salvo, dia: () => DIA });
  assert.equal(reaberta.st.pendentes.length, 1);
  const needs = new Needs({ balance: loadJSON('assets/catalog/needs-balance.json'), foods: [], id: () => 'x' });
  needs.st.hunger = 10;
  // O destino confirma, mas a carteira cai antes de tirar da fila: reaplicar não soma de novo.
  assert.equal(needs.aplicarLoja(reaberta.st.pendentes[0]), true);
  const fome = needs.st.hunger;
  assert.equal(reaberta.drenar((p) => needs.aplicarLoja(p)), 1);
  assert.equal(needs.st.hunger, fome);
  assert.equal(reaberta.st.pendentes.length, 0);
});

test('poderes: modificadores somam duração ao reusar e mexem nas necessidades sem dar XP', () => {
  const { loja, avanca } = nova();
  rico(loja, 50000);
  loja.comprar({ txId: 'c', id: 'lp01', qtd: 2, nivel: 9 });
  loja.usar({ txId: 'u1', id: 'lp01' });
  avanca(3600e3);
  loja.usar({ txId: 'u2', id: 'lp01' });
  assert.equal(loja.st.buffs.length, 1);
  assert.equal(loja.st.buffs[0].ate - Date.parse('2026-11-24T13:00:00Z'), (24 + 23) * 3600e3);
  let mono = 0;
  const needs = new Needs({ balance: loadJSON('assets/catalog/needs-balance.json'), foods: [], monotonic: () => mono, mods: () => loja.mods() });
  needs.tick(); mono = 60e3; needs.tick();
  assert.ok(Math.abs(70 - needs.st.hunger - 10 * 0.6 / 60) < 1e-6, 'fome cai 40% mais devagar');
  assert.equal(needs.st.outbox.length, 0);
});

test('decoração e recursos: liga e desliga por lado; atividade respeita o intervalo', () => {
  const { loja, avanca } = nova();
  rico(loja);
  for (const id of ['dc01', 'dc03', 'll02', 'll01', 'lt01']) loja.comprar({ txId: id, id, nivel: 99 });
  loja.alternar('dc01', true); loja.alternar('dc03', true); loja.alternar('ll02', true); loja.alternar('ll01', true);
  assert.equal(loja.st.ativos.decor.esquerda, 'dc03', 'um por lado: o último ligado fica');
  assert.equal(loja.st.ativos.decor.fundo, 'dl05');
  assert.equal(loja.st.ativos.aura, true);
  assert.equal(loja.alternar('dc02', true).motivo, 'naoPossui');
  assert.equal(loja.iniciarAtividade('lt01').roteiro, 'fotos');
  assert.equal(loja.iniciarAtividade('lt01').motivo, 'intervalo');
  avanca(2 * 3600e3 + 1);
  assert.equal(loja.iniciarAtividade('lt01').ok, true);
});

test('coleção completa vira marco; visual comprado ganha destaque temporário', () => {
  const { loja, avanca } = nova();
  rico(loja);
  for (const it of ITENS.filter((i) => i.tipo === 'colecionavel')) loja.comprar({ txId: it.id, id: it.id, nivel: 99 });
  assert.ok(loja.st.marcos.colecaoCompleta);
  loja.comprar({ txId: 'lv', id: 'lv05', nivel: 99 });
  assert.equal(loja.destaque(), 'lv05');
  avanca(49 * 3600e3);
  assert.equal(loja.destaque(), null);
});

// ---------------------------------------------------------------- migração e validação

test('migração versionada: grafias antigas do nome mantêm o saldo; reversão e versão futura', () => {
  for (const k of ['jojocoins', 'Jojocoins', 'JojoCoins']) assert.equal(migrarLoja({ [k]: 321 }).saldo, 321, k);
  const m = migrarLoja({});
  assert.equal(m.version, VERSAO_LOJA);
  assert.deepEqual(validarLoja(lojaVazia()), lojaVazia());
  const v0 = rebaixarLoja({ ...m, saldo: 4321 }, 0);
  assert.deepEqual(v0, { version: 0, JOJOcoins: 4321 });
  assert.equal(migrarLoja(v0).saldo, 4321, 'ida e volta preserva o saldo');
  assert.throws(() => validarLoja({ ...lojaVazia(), version: 99 }), /mais nova/);
  assert.throws(() => validarLoja({ ...lojaVazia(), saldo: -5 }));
  assert.throws(() => validarLoja({ ...lojaVazia(), inventario: { falso: { qtd: 1 } } }));
});

// ---------------------------------------------------------------- 10 mil transações

test('10 mil transações aleatórias: saldo nunca negativo, contas fecham e o arquivo valida', () => {
  const { loja } = nova();
  const rng = seededRng(11);
  let seq = 0;
  for (let i = 0; i < 10000; i++) {
    const r = rng();
    const it = ITENS[Math.floor(rng() * ITENS.length)];
    if (r < 0.35) loja.reconciliar([{ sequence: ++seq, amount: Math.floor(rng() * 500), source: 'interaction', day: `2026-${String(1 + (i % 12)).padStart(2, '0')}-01` }]);
    else if (r < 0.6) loja.comprar({ txId: `t${i % 3000}`, id: it.id, qtd: 1 + Math.floor(rng() * 2), nivel: 1 + Math.floor(rng() * 60) });
    else if (r < 0.8) loja.usar({ txId: `u${i}`, id: it.id });
    else if (r < 0.9) loja.drenar(() => rng() < 0.7);
    else loja.creditar({ id: `x${i % 2000}`, valor: Math.floor(rng() * 100) });
    assert.ok(loja.st.saldo >= 0);
  }
  assert.equal(loja.st.ganhoTotal - loja.st.gastoTotal, loja.st.saldo);
  assert.ok(loja.st.txOrdem.length <= LOJA_LIMITES.txGuardadas);
  assert.ok(loja.st.historico.length <= LOJA_LIMITES.historico);
  const copia = validarLoja(JSON.parse(JSON.stringify(loja.st)));
  assert.equal(copia.saldo, loja.st.saldo);
});
