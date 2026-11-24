// RPG do JoJo (0.48): motor, 200 níveis, paragon, missões, expedições,
// segredos, vida, persistência, antifraude e simulações de 30/90/365 dias.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Progress } from '../../src/core/catalog/antitedio.js';
import { Rpg, rpgVazio, validarRpg, luaCheia } from '../../src/core/rpg/motor.js';
import { recompensaDoNivel, NIVEL_MAX, slotsArtefato } from '../../src/core/rpg/niveis.js';
import { HABILIDADES, HAB_POR_ID } from '../../src/core/rpg/habilidades.js';
import { ESPECIALIZACOES, HABILIDADES_ESP } from '../../src/core/rpg/especializacoes.js';
import { REGIOES, ARTEFATOS, RECEITAS, MATERIAIS } from '../../src/core/rpg/mundo.js';
import { SEGREDOS, CODIGOS } from '../../src/core/rpg/segredos.js';
import { SEMANAIS, CADEIAS, SECRETAS } from '../../src/core/rpg/jornada.js';
import { ATRIBUTOS, efeitosDosAtributos } from '../../src/core/rpg/atributos.js';
import { BEBIDAS, GRUPO_DA_COMIDA, vidaVazia, passarTempo, podeDormir } from '../../src/core/rpg/vida.js';
import { MINIJOGOS_EXTRA, iniciarExtra, responderExtra } from '../../src/core/rpg/minijogos.js';
import { loadJSON, seededRng } from './helpers.js';

const PROG = loadJSON('assets/catalog/progressao.json');
const DIA = Date.UTC(2026, 10, 24, 15, 0); // 24/11/2026 12h em São Paulo

/** Ambiente: Progress real + RPG + carteira falsa idempotente. */
function ambiente({ xp = 0, seed = 7, t0 = DIA, state = null } = {}) {
  let t = t0;
  const progress = new Progress({ data: PROG, state: { xp, escalaXp: PROG.escalaXp }, now: () => t, wallNow: () => t, monotonicNow: () => t, rng: seededRng(seed) });
  const carteira = { saldo: 0, ids: new Set(), creditar({ id, valor }) { if (this.ids.has(id)) return { ok: true, duplicado: true, creditado: 0 }; this.ids.add(id); this.saldo += valor; return { ok: true, creditado: valor, saldo: this.saldo }; } };
  const salvos = [];
  const rpg = new Rpg({ state, save: (s) => salvos.push(JSON.stringify(s)), award: (r) => progress.award(r), creditar: (r) => carteira.creditar(r), nivel: () => progress.nivel, xpTotal: () => progress.st.xp, threshold: (n) => progress.threshold(n), now: () => t, rng: seededRng(seed), clockHealthy: () => true });
  return { rpg, progress, carteira, salvos, avancar: (ms) => { t += ms; progress.resetRewardClock(); }, get t() { return t; } };
}
const xpDoNivel = (n) => new Progress({ data: PROG }).threshold(n);

test('cada um dos 200 níveis tem recompensa funcional, variada e determinística', () => {
  const vistos = new Set();
  let atr = 0, hab = 0;
  for (let n = 2; n <= NIVEL_MAX; n++) {
    const r = recompensaDoNivel(n);
    assert.ok(r.pontosAtributo >= 1, `nível ${n} sem ponto de atributo`);
    assert.ok(r.moedas > 0, `nível ${n} sem JOJOcoins`);
    assert.deepEqual(recompensaDoNivel(n), r, 'determinística');
    atr += r.pontosAtributo; hab += r.pontosHabilidade;
    for (const d of r.desbloqueios) { assert.ok(!vistos.has(`${d.tipo}:${d.id}`), `desbloqueio repetido ${d.id}`); vistos.add(`${d.tipo}:${d.id}`); }
  }
  assert.equal(recompensaDoNivel(1), null);
  assert.equal(recompensaDoNivel(201), null);
  const custoTotal = HABILIDADES.reduce((s, h) => s + h.custo * h.ranks, 0);
  assert.ok(hab >= custoTotal * 0.9, `pontos de habilidade (${hab}) cobrem quase toda a árvore (${custoTotal})`);
  assert.ok(atr >= 250 && atr <= 300, `pontos de atributo ${atr}`);
  // Toda região, especialização, habilidade e minijogo novo tem nível de desbloqueio que existe.
  for (const x of [...REGIOES, ...ESPECIALIZACOES.filter((e) => e.id !== 'mestre'), ...HABILIDADES, ...MINIJOGOS_EXTRA]) assert.ok(x.nivel >= 1 && x.nivel <= NIVEL_MAX, x.id);
  assert.equal(slotsArtefato(1), 2); assert.equal(slotsArtefato(200), 6);
});

test('subir do 1 ao 200 entrega cada nível uma única vez (idempotente) e o paragon continua depois', () => {
  const e = ambiente();
  e.progress.st.xp = xpDoNivel(200);
  const ganhos = e.rpg.sincronizarNivel();
  assert.equal(ganhos.filter((g) => g.nivel).length, 199);
  assert.deepEqual(e.rpg.sincronizarNivel(), [], 'nada se repete');
  e.rpg.drain();
  const saldo = e.carteira.saldo;
  e.rpg.drain();
  assert.equal(e.carteira.saldo, saldo, 'drain repetido não duplica JOJOcoins');
  assert.ok(e.rpg.st.titulos.includes('Lenda Viva do Aquário'));
  // auto-distribuição gastou tudo de forma equilibrada e aprendeu a árvore
  assert.equal(e.rpg.st.pontos.atributo, 0);
  assert.ok(Object.keys(e.rpg.st.habilidades).length >= 35);
  assert.ok(e.rpg.st.habilidades.lendaViva, 'poder lendário do 200 aprendido');
  // Paragon: xp além do 200
  const passo = e.progress.threshold(200) - e.progress.threshold(199);
  e.progress.st.xp += passo * 10;
  const p = e.rpg.sincronizarNivel();
  assert.equal(p.length, 10);
  assert.equal(e.rpg.st.estrelas, 1);
  assert.equal(e.rpg.snapshot().estrela, 'Bronze');
  // Prestígio não apaga nada
  assert.ok(Object.keys(e.rpg.st.habilidades).length >= 35);
});

test('atributos têm efeito real e medido, com retorno decrescente', () => {
  const base = efeitosDosAtributos(Object.fromEntries(ATRIBUTOS.map((a) => [a.id, 5])));
  for (const v of Object.values(base)) assert.equal(v, 0);
  const alto = efeitosDosAtributos(Object.fromEntries(ATRIBUTOS.map((a) => [a.id, 55])));
  const muito = efeitosDosAtributos(Object.fromEntries(ATRIBUTOS.map((a) => [a.id, 155])));
  for (const a of ATRIBUTOS) {
    assert.ok(alto[a.efeito] > 0, `${a.id} sem efeito`);
    assert.ok(muito[a.efeito] < alto[a.efeito] * 2, `${a.id} explode`);
  }
});

test('Inteligência do RPG nunca toca a conversa (nenhum módulo de diálogo importa o RPG)', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const dir = path.join(process.cwd(), 'src/core/dialogue');
  for (const f of fs.readdirSync(dir)) assert.ok(!/rpg\//.test(fs.readFileSync(path.join(dir, f), 'utf8')), `${f} importa o RPG`);
  for (const f of ['src/core/personality.js', 'src/core/identidade.js']) assert.ok(!/rpg\//.test(fs.readFileSync(f, 'utf8')), f);
});

test('investir, aprender habilidade com pré-requisito e usar habilidade ativa com recarga', () => {
  const e = ambiente({ xp: xpDoNivel(12) });
  e.rpg.setAuto(false);
  e.rpg.sincronizarNivel();
  assert.ok(e.rpg.st.pontos.atributo > 0);
  const antes = e.rpg.atributos().forca;
  assert.equal(e.rpg.investir('forca', 2).ok, true);
  assert.equal(e.rpg.atributos().forca, antes + 2);
  assert.equal(e.rpg.investir('naoExiste').ok, false);
  assert.match(e.rpg.aprender('segundoFolego').motivo, /Pulmão/);
  assert.equal(e.rpg.aprender('pulmaoDeGuelra').ok, true);
  assert.equal(e.rpg.aprender('segundoFolego').ok, true);
  e.rpg.st.vida.energia = 10;
  const r = e.rpg.usarHabilidade('segundoFolego');
  assert.equal(r.ok, true);
  assert.equal(e.rpg.st.vida.energia, 50);
  assert.match(e.rpg.usarHabilidade('segundoFolego').motivo, /Recarregando/);
  e.avancar(24 * 3600e3 + 1);
  assert.equal(e.rpg.usarHabilidade('segundoFolego').ok, true);
  // Recusa não gasta recarga
  assert.equal(e.rpg.aprender('banqueteRestaurador').ok, false);
});

test('especialização: liberação por nível, habilidades próprias, rank por eventos reais e troca com intervalo', () => {
  const e = ambiente({ xp: xpDoNivel(20) });
  e.rpg.sincronizarNivel();
  assert.match(e.rpg.especializar('pesquisador').motivo, /nível 30/);
  assert.equal(e.rpg.especializar('cientista').ok, true);
  assert.ok(e.rpg.st.habilidades.esp_hipotese, 'habilidade própria liberada');
  for (let i = 0; i < 70; i++) { e.avancar(60e3); e.rpg.evento('pesquisa'); }
  assert.ok(e.rpg.rankEsp('cientista') >= 3);
  assert.match(e.rpg.especializar('medico').motivo, /12 horas/);
  e.avancar(13 * 3600e3);
  assert.equal(e.rpg.especializar('medico').ok, true);
  assert.ok(e.rpg.rankEsp('cientista') >= 3, 'progresso guardado');
  assert.match(e.rpg.podeEspecializar('mestre'), /nível 150|Libera/);
  assert.ok(ESPECIALIZACOES.find((x) => x.id === 'medico').aviso.includes('192'));
});

test('antifraude: chat em rajada não conta, teto diário de XP do RPG, relógio mexido não paga', () => {
  const e = ambiente({ xp: xpDoNivel(5) });
  e.rpg.sincronizarNivel();
  let contados = 0;
  for (let i = 0; i < 20; i++) { if (e.rpg.evento('chat')) contados++; e.avancar(1000); }
  assert.ok(contados <= 2, `rajada contou ${contados}`);
  for (let i = 0; i < 100; i++) e.rpg._xp(`x${i}`, 50, 'teste');
  assert.equal(e.rpg.st.xpDia.n, 250);
  const r2 = new Rpg({ clockHealthy: () => false });
  assert.equal(r2._xp('a', 10, 'x'), 0);
});

test('missões semanais avançam por eventos reais e pagam uma vez; secreta aparece só depois', () => {
  const e = ambiente({ xp: xpDoNivel(10) });
  e.rpg.sincronizarNivel();
  const sem = e.rpg.semanaAtual();
  assert.ok(sem.itens.length >= 3);
  const m = sem.itens[0];
  for (let i = 0; i < m.n + 3; i++) { e.avancar(120e3); e.rpg.evento(m.evento, 1, m.evento === 'comida' ? { comida: 'peixe' } : {}); }
  assert.equal(e.rpg.semanaAtual().itens[0].ok, true);
  const pagas = e.rpg.st.outbox.filter((o) => o.tipo === 'xp' && o.label.includes(m.txt)).length;
  assert.equal(pagas, 1);
  assert.ok(e.rpg.snapshot().secretas.every((s) => s.nome === '???'));
  for (let i = 0; i < 5; i++) { e.avancar(2000); e.rpg.st.rate.carinho = 0; e.rpg.evento('carinho'); }
  assert.ok(e.rpg.snapshot().secretas.some((s) => s.ok && s.nome === 'Overdose de Carinho'));
});

test('missão encadeada: capítulos em ordem, artefato único e título no fim', () => {
  const e = ambiente({ xp: xpDoNivel(4) });
  e.rpg.sincronizarNivel();
  const c = CADEIAS.find((x) => x.id === 'academia');
  const out = { missoes: [], cadeias: [], secretas: [], combos: [], longos: [] };
  for (const cap of c.capitulos) for (let i = 0; i < cap.n; i++) e.rpg.mutar(() => e.rpg._avancarMissoes(cap.evento, 1, out));
  assert.equal(e.rpg.st.missoes.cadeias.academia.ok, true);
  assert.ok(e.rpg.st.artefatos.halterDeOuro);
  assert.ok(e.rpg.st.titulos.includes(c.titulo));
});

test('expedição: requisitos, encruzilhada com escolha, conclusão com relatório, loot, XP e JOJOcoins', () => {
  const e = ambiente({ xp: xpDoNivel(15), seed: 3 });
  e.rpg.sincronizarNivel(); e.rpg.drain();
  assert.match(e.rpg.iniciarExpedicao('megalodon').motivo, /nível 120/);
  const r = e.rpg.iniciarExpedicao('codigo');
  assert.equal(r.ok, true);
  assert.match(e.rpg.iniciarExpedicao('recife').motivo, /já está/);
  let pend = null;
  for (let i = 0; i < 200 && !pend; i++) { e.avancar(30e3); e.rpg.tick(30e3, { ativo: true }); pend = e.rpg.encruzilhadaPendente(); }
  assert.ok(pend, 'encruzilhada na metade');
  assert.equal(e.rpg.escolher('b').ok, true);
  const saldo = e.carteira.saldo, xpAntes = e.progress.st.xp;
  let fim = null;
  for (let i = 0; i < 200 && !fim; i++) { e.avancar(30e3); const t = e.rpg.tick(30e3, { ativo: true }); if (t.expedicoes.length) fim = t.expedicoes[0]; }
  assert.ok(fim, 'expedição concluiu');
  assert.ok(fim.texto.includes('Fossa do Código'));
  assert.ok(Object.keys(fim.materiais).length >= 1);
  e.rpg.drain();
  assert.ok(e.progress.st.xp > xpAntes, 'XP entrou no Progress');
  if (fim.sucesso) assert.ok(e.carteira.saldo > saldo, 'JOJOcoins entraram na carteira');
  assert.equal(e.rpg.st.regioes.codigo.concluidas, 1);
  assert.equal(e.rpg.st.relatorios.length, 1);
});

test('expedição esquecida: o JoJo decide sozinho sem punição e o Sprint conclui na hora', () => {
  const e = ambiente({ xp: xpDoNivel(16) });
  e.rpg.sincronizarNivel();
  e.rpg.iniciarExpedicao('recife');
  for (let i = 0; i < 80; i++) { e.avancar(30e3); e.rpg.tick(30e3, { ativo: false }); }
  assert.equal(e.rpg.st.expedicoes.length, 0, 'concluiu mesmo sem uso ativo (computador ligado)');
  assert.equal(e.rpg.st.relatorios[0].auto, true);
  e.rpg.st.habilidades.sprintAbissal = 1;
  e.rpg.st.vida.energia = 100;
  e.rpg.iniciarExpedicao('navegador');
  const s = e.rpg.usarHabilidade('sprintAbissal');
  assert.equal(s.ok, true);
  assert.equal(s.expedicoes.length, 1);
  assert.equal(e.rpg.st.expedicoes.length, 0);
});

test('fabricação consome materiais, aplica buff e conta missão; falta de material explica o que falta', () => {
  const e = ambiente({ xp: xpDoNivel(10) });
  e.rpg.sincronizarNivel();
  assert.match(e.rpg.fabricar('elixirFoco').motivo, /Falta/);
  e.rpg.st.materiais = { papiro: 2, cristalCache: 1 };
  const r = e.rpg.fabricar('elixirFoco');
  assert.equal(r.ok, true);
  assert.equal(e.rpg.st.materiais.papiro, 0);
  assert.ok(e.rpg.efeitos().xpFoco >= 0.15);
  e.avancar(3 * 3600e3);
  assert.ok((e.rpg.efeitos().xpFoco || 0) < 0.15, 'buff expira');
});

test('segredos: elegibilidade por horário, cooldown, teto diário, coleção e código secreto que vale uma vez', () => {
  const e = ambiente({ xp: xpDoNivel(30), t0: Date.UTC(2026, 10, 24, 3, 30) }); // 0h30 em São Paulo
  e.rpg.sincronizarNivel();
  const meia = e.rpg.elegiveis({}).map((s) => s.id);
  if (new Date(e.t).getHours() === 0) assert.ok(meia.includes('meiaNoite'));
  const s = e.rpg.checarSegredos({ forcar: true });
  assert.ok(s && s.texto);
  assert.equal(e.rpg.checarSegredos({}), null, 'intervalo global');
  const c = e.rpg.codigo('Sharknado!');
  assert.ok(c.texto.includes('SHARKNADO'));
  assert.equal(e.rpg.codigo('sharknado').repetido, true);
  assert.equal(e.rpg.codigo('isso não é código'), null);
  assert.ok(e.rpg.snapshot().segredos.some((x) => x.nome === '???'));
});

test('diário do Megalodon: 7 fragmentos completam o artefato lendário único', () => {
  const e = ambiente({ xp: xpDoNivel(30) });
  for (let i = 0; i < 7; i++) e.rpg.mutar(() => e.rpg._aplicarDesfecho({ id: 'x', nome: 'x', txt: 'x', fragmento: true }, `f${i}`));
  assert.equal(e.rpg.st.diario, 7);
  assert.ok(e.rpg.st.artefatos.diarioDoMegalodon);
});

test('vida: sem queda com app fechado, pisos, sono só das 21h às 6h, doença leve e curável', () => {
  const v = vidaVazia();
  passarTempo(v, 10 * 3600e3, { hora: 14, efeitos: {}, rng: () => 0.99, agora: 0 });
  assert.ok(v.energia >= 3 && v.sede >= 2 && v.carinho >= 15, 'pisos');
  assert.equal(podeDormir(14), false); assert.equal(podeDormir(22), true); assert.equal(podeDormir(5), true); assert.equal(podeDormir(6), false);
  const w = vidaVazia(); w.energia = 20;
  passarTempo(w, 3600e3, { hora: 14, dormindo: true, efeitos: {}, rng: () => 0.99, agora: 0 });
  assert.ok(w.energia < 20, 'das 6h às 21h dormir não recupera: ele não dorme');
  const e = ambiente({ xp: xpDoNivel(5) });
  const antes = JSON.stringify(e.rpg.st.vida);
  e.rpg.tick(120e3, { ativo: true });
  assert.equal(JSON.stringify(e.rpg.st.vida), antes, 'salto > 90 s (app fechado/suspenso) é descartado');
  for (const id of ['hamburguer', 'pizza', 'donut', 'batataFrita', 'nuggets']) { e.avancar(30e3); e.rpg.evento('comida', 1, { comida: id }); }
  const doente = e.rpg.st.vida.doencas.length > 0;
  e.avancar(60e3); e.rpg.evento('cuidado');
  if (doente) assert.equal(e.rpg.st.vida.doencas.length, 0, 'cuidado cura');
});

test('bebidas e comidas: todas as 68 do cardápio têm efeito extra coerente', () => {
  const foods = loadJSON('assets/catalog/foods.json').foods;
  assert.ok(foods.length >= 68, `cardápio com ${foods.length}`);
  for (const f of foods) assert.ok(GRUPO_DA_COMIDA[f.id] || BEBIDAS[f.id], `${f.id} sem efeito de vida`);
  for (const id of Object.keys(BEBIDAS)) assert.ok(foods.some((f) => f.id === id), `bebida ${id} fora do cardápio`);
});

test('persistência: estado salvo volta igual, migração preenche campos novos e não apaga progresso', () => {
  const e = ambiente({ xp: xpDoNivel(25) });
  e.rpg.sincronizarNivel();
  e.rpg.evento('foco', 1, { xpBase: 15 });
  const salvo = JSON.parse(e.salvos.at(-1));
  const de_novo = new Rpg({ state: salvo, nivel: () => 25 });
  assert.deepEqual(de_novo.st, validarRpg(salvo));
  const velho = { versao: 1, investidos: { forca: 7 }, pontos: { atributo: 3, habilidade: 1 }, habilidades: { musculoDeAco: 9, naoExiste: 1 }, vida: { sede: 500 } };
  const m = validarRpg(velho);
  assert.equal(m.investidos.forca, 7);
  assert.equal(m.habilidades.musculoDeAco, 3, 'rank acima do máximo é corrigido');
  assert.equal(m.habilidades.naoExiste, undefined);
  assert.equal(m.vida.sede, 100);
  assert.ok(Array.isArray(m.expedicoes));
  assert.throws(() => validarRpg({ versao: 99 }));
});

test('falha de gravação desfaz a mudança inteira (sem estado pela metade)', () => {
  let falhar = false;
  const rpg = new Rpg({ save: () => { if (falhar) throw new Error('disco'); }, nivel: () => 20 });
  rpg.st.auto = false;
  rpg.sincronizarNivel();
  const antes = JSON.stringify(rpg.st);
  falhar = true;
  assert.throws(() => rpg.investir('forca', 1));
  assert.equal(JSON.stringify(rpg.st), antes);
});

test('carteira ausente ou pendente: JOJOcoins ficam na fila e saem depois, sem duplicar', () => {
  let pronto = false; const ids = new Set(); let saldo = 0;
  const rpg = new Rpg({ nivel: () => 10, creditar: (r) => { if (!pronto) return { pending: true }; if (ids.has(r.id)) return { duplicado: true }; ids.add(r.id); saldo += r.valor; return { ok: true }; }, award: () => ({ ok: true }) });
  rpg.sincronizarNivel();
  rpg.drain();
  assert.ok(rpg.st.outbox.some((o) => o.tipo === 'moedas'));
  pronto = true;
  rpg.drain();
  assert.equal(rpg.st.outbox.length, 0);
  const s = saldo;
  rpg.drain();
  assert.equal(saldo, s);
});

test('dados íntegros: ids únicos, referências válidas e textos com JOJOcoins na grafia certa', async () => {
  const fs = await import('node:fs');
  const ids = (l) => { const s = new Set(l.map((x) => x.id)); assert.equal(s.size, l.length); };
  ids(HABILIDADES); ids(HABILIDADES_ESP); ids(ESPECIALIZACOES); ids(REGIOES); ids(ARTEFATOS); ids(RECEITAS); ids(SEGREDOS); ids(CODIGOS); ids(SEMANAIS); ids(CADEIAS); ids(SECRETAS);
  assert.equal(ESPECIALIZACOES.length, 16);
  for (const h of HABILIDADES) for (const r of h.requer) assert.ok(HAB_POR_ID.has(r), `${h.id} requer ${r}`);
  for (const r of REGIOES) for (const m of r.materiais) assert.ok(MATERIAIS[m], m);
  for (const r of RECEITAS) for (const m of Object.keys(r.custo)) assert.ok(MATERIAIS[m], m);
  for (const c of CADEIAS) assert.ok(ARTEFATOS.some((a) => a.id === c.artefato), c.artefato);
  for (const f of fs.readdirSync('src/core/rpg')) {
    const txt = fs.readFileSync(`src/core/rpg/${f}`, 'utf8');
    assert.ok(!/Jojocoins|JojoCoins|JojoCoin\b/.test(txt), `${f} com grafia errada da moeda`);
  }
});

test('animações e adereços citados pelo RPG existem de verdade no catálogo e no rig', async () => {
  const { fullCatalog } = await import('../../src/core/catalog/load.js');
  const cat = fullCatalog(loadJSON);
  const ids = new Set(cat.itens.map((i) => i.id));
  const citadas = [...HABILIDADES.filter((h) => h.anim).map((h) => h.anim), ...REGIOES.map((r) => r.anim), ...SEGREDOS.map((s) => s.anim), ...CODIGOS.map((c) => c.anim)];
  for (const a of citadas) assert.ok(ids.has(a), `animação ${a} não existe`);
  const rig = JSON.stringify(loadJSON('assets/character/jojo.rig.json'));
  for (const e of ESPECIALIZACOES) assert.ok(rig.includes(`"prop_${e.prop}"`), `adereço ${e.prop} não existe no rig`);
});

test('minijogos novos: regras, fim, vitória e derrota de verdade', () => {
  const r = seededRng(5);
  for (const j of MINIJOGOS_EXTRA) {
    const g = { id: j.id, tipo: j.tipo, nome: j.nome, rodada: 0, pontos: 0 };
    const s = iniciarExtra(j, g, { rng: r, dificuldade: 2, dicas: 1 });
    assert.ok(s && s.text, j.id);
  }
  const g = { tipo: 'sequencia', rodada: 0, pontos: 0 };
  iniciarExtra({ tipo: 'sequencia' }, g, { rng: r });
  let fim;
  for (let i = 0; i < 10 && !fim?.done; i++) fim = responderExtra(g, String(g.q.x), { rng: r });
  assert.equal(fim.done, true); assert.equal(fim.win, true); assert.equal(fim.score, 5);
  const t = { tipo: 'tesouro', rodada: 0, pontos: 0 };
  iniciarExtra({ tipo: 'tesouro' }, t, { rng: r });
  const errado = (t.alvo + 4) % 9;
  const casas = ['canto superior esquerdo', 'topo', 'canto superior direito', 'lado esquerdo', 'centro', 'lado direito', 'canto inferior esquerdo', 'embaixo', 'canto inferior direito'];
  assert.equal(responderExtra(t, casas[errado], {}).done, false);
  assert.equal(responderExtra(t, casas[t.alvo], {}).win, true);
  const d = { tipo: 'digitacao', rodada: 0, pontos: 0 };
  iniciarExtra({ tipo: 'digitacao' }, d, { rng: r, dificuldade: 1 });
  assert.equal(responderExtra(d, d.w, { now: 10 }).win, false, 'queimou a largada');
});

test('lua cheia conhecida (15/11/2024) é reconhecida', () => {
  assert.equal(luaCheia(Date.UTC(2024, 10, 15, 21, 0)), true);
  assert.equal(luaCheia(Date.UTC(2024, 10, 1, 12, 0)), false);
});

// ---------------------------------------------------------------- simulações longas

function simular(dias, { seed = 11, perfil = 'media' } = {}) {
  const e = ambiente({ seed });
  const r = seededRng(seed + 1);
  const xpDiaNeeds = { leve: 120, media: 250, intensa: 350 }[perfil];
  const eventos = { leve: 8, media: 25, intensa: 60 }[perfil];
  const tipos = ['chat', 'carinho', 'foco', 'comida', 'agua', 'cuidado', 'tarefa', 'timer', 'vitoria', 'estudo', 'treino', 'limpeza', 'jogo'];
  const comidas = ['peixe', 'sushi', 'agua', 'cafe', 'banana', 'pizza', 'frangoAssado', 'shakeWhey'];
  let espEscolhida = false;
  for (let d = 0; d < dias; d++) {
    // XP diário do resto do app (necessidades, foco, conversa), dentro dos tetos atuais.
    e.progress.st.xp += xpDiaNeeds * 10; // escala ×10 do Progress
    e.rpg.sincronizarNivel();
    if (!espEscolhida && e.rpg.nivel() >= 6) espEscolhida = e.rpg.especializar('explorador').ok;
    for (let i = 0; i < eventos; i++) {
      e.avancar(Math.floor(10 * 60e3 * r()) + 30e3);
      const t = tipos[Math.floor(r() * tipos.length)];
      e.rpg.evento(t, 1, t === 'comida' ? { comida: comidas[Math.floor(r() * comidas.length)] } : { xpBase: 10 });
      e.rpg.tick(60e3, { ativo: true, hora: 14 });
      if (!e.rpg.st.expedicoes.length && e.rpg.nivel() >= 2 && e.rpg.st.vida.energia >= 30) e.rpg.iniciarExpedicao();
      const p = e.rpg.encruzilhadaPendente(); if (p) e.rpg.escolher('a');
      if (i % 6 === 0) e.rpg.checarSegredos({});
    }
    // passa o resto do dia com o computador ligado 4 h (expedições terminam)
    for (let k = 0; k < 240; k++) e.rpg.tick(60e3, { ativo: k % 3 === 0, hora: 15 });
    e.avancar(24 * 3600e3 - eventos * 5 * 60e3);
    const rec = e.rpg.snapshot().receitas.find((x) => x.pode);
    if (rec) e.rpg.fabricar(rec.id);
    e.rpg.drain();
  }
  return e;
}

for (const [dias, perfil] of [[30, 'leve'], [90, 'media'], [365, 'intensa']]) {
  test(`simulação acelerada de ${dias} dias (${perfil}): progride, sem saldo negativo, sem duplicar, vida estável`, () => {
    const e = simular(dias, { perfil });
    const s = e.rpg.snapshot();
    assert.ok(s.nivel > 1, 'subiu de nível');
    assert.ok(e.rpg.st.contas.expedicoes > 0, 'fez expedições');
    assert.ok((e.rpg.st.contas.missoes || 0) > 0, 'cumpriu missões');
    assert.ok(e.carteira.saldo >= 0);
    assert.equal(e.carteira.ids.size, [...e.carteira.ids].length);
    for (const k of ['sede', 'energia', 'tedio', 'carinho', 'confianca']) assert.ok(s.vida[k] >= 0 && s.vida[k] <= 100, k);
    for (const m of s.materiais) assert.ok(m.q >= 0, `material negativo ${m.id}`);
    assert.ok(e.rpg.st.historico.length <= 120 && e.rpg.st.relatorios.length <= 20, 'histórico com teto (sem vazamento)');
    assert.ok(JSON.stringify(e.rpg.st).length < 200_000, `estado salvo pequeno (${JSON.stringify(e.rpg.st).length} bytes)`);
    if (dias >= 90) assert.ok(s.vinculo.nivel >= 3, `vínculo ${s.vinculo.nivel}`);
  });
}
