// Troca dinâmica de visuais: só autorizados, estabilidade (histerese, permanência,
// intervalo, sem pingue-pongue), janela segura, fixar/desligar, 10 mil pedidos de troca e
// a ligação com o companion (sem LLM, sem gravar o visual salvo dela).
import test from 'node:test';
import assert from 'node:assert/strict';
import { MotorVisual, catalogarVisuais, inferirContextos, contextosDoTexto, contextosDoHorario, CONTEXTOS, MOTOR_PADRAO } from '../../src/core/visuais-dinamicos.js';
import { visuaisLiberados } from '../../src/core/visual-nivel.js';
import { ITENS } from '../../src/core/loja-catalogo.js';
import { Loja } from '../../src/core/loja.js';
import { loadJSON, seededRng, makeEnv } from './helpers.js';

const prog = loadJSON('assets/catalog/progressao.json');
const looks = ITENS.filter((i) => i.efeito.look);

function motor() {
  let t = 1e9;
  const m = new MotorVisual({ now: () => t, hora: () => 15 });
  return { m, avanca: (ms) => { t += ms; }, agora: () => t };
}

test('catálogo autorizado: nível atual e compras; bloqueado nunca entra', () => {
  const lib = visuaisLiberados(prog, 10);
  const c = catalogarVisuais({ liberados: lib, lojaLooks: looks.slice(0, 2) });
  const ids = new Set(c.map((x) => x.id));
  for (const p of visuaisLiberados(prog, 999)) if (p.nivel > 10) assert.ok(!ids.has(p.id), p.id);
  assert.ok(ids.has('lv01') && ids.has('lv02') && !ids.has('lv03'));
  for (const x of c) {
    assert.ok(['nivel', 'loja'].includes(x.origem));
    for (const ctx of x.contextos) assert.ok(CONTEXTOS.includes(ctx), `${x.id}: ${ctx}`);
  }
});

test('contextos inferidos da referência e da conversa', () => {
  assert.ok(inferirContextos({ id: 'an001', tipo: 'anime', nome: 'x', obra: 'y', parte: 'pulsos' }).includes('anime'));
  assert.ok(inferirContextos({ id: 'nv001', tipo: 'filme', nome: 'Óculos de cientista', obra: 'Lab', parte: 'rosto' }).includes('ciencia'));
  assert.deepEqual(contextosDoTexto('vou estudar pra prova de física').sort(), ['ciencia', 'estudo', 'pesquisa'].sort());
  assert.deepEqual(contextosDoTexto('oi'), []);
  assert.ok(contextosDoHorario(new Date(2026, 10, 28, 22)).includes('noite'));
});

test('troca por contexto com histerese, permanência e janela segura', () => {
  const { m, avanca } = motor();
  const cand = catalogarVisuais({ lojaLooks: looks });
  assert.equal(m.decidir({ candidatos: cand }).trocou, false, 'sem contexto fica com o visual dela');
  m.sinal('treino', 3);
  const r1 = m.decidir({ candidatos: cand, seguro: false });
  assert.equal(r1.motivo, 'aguardando', 'fora da janela segura espera');
  const r2 = m.decidir({ candidatos: cand, seguro: true });
  assert.equal(r2.trocou, true);
  assert.ok(cand.find((c) => c.id === r2.id).contextos.includes('treino'));
  // Outro contexto forte logo depois: espera a permanência mínima.
  m.sinal('noite', 6); m.sinal('descanso', 6);
  avanca(MOTOR_PADRAO.intervaloMs + 1);
  assert.equal(m.decidir({ candidatos: cand }).motivo, 'permanencia');
  avanca(MOTOR_PADRAO.permanenciaMs);
  assert.equal(m.decidir({ candidatos: cand }).trocou, true);
});

test('fixar e desligar vencem o contexto; visual que deixa de ser autorizado sai na hora', () => {
  const { m } = motor();
  const cand = catalogarVisuais({ lojaLooks: looks });
  m.sinal('treino', 6);
  assert.equal(m.decidir({ candidatos: cand, fixo: 'lv13' }).id, 'lv13');
  assert.equal(m.decidir({ candidatos: cand, auto: false }).id, null);
  m.decidir({ candidatos: cand, fixo: 'lv13' });
  assert.equal(m.decidir({ candidatos: cand.filter((c) => c.id !== 'lv13') }).motivo, 'desautorizado');
  assert.equal(m.atual, null);
});

test('10 mil pedidos de troca: só autorizados, sem trocas seguidas, sem pingue-pongue', () => {
  const { m, avanca, agora } = motor();
  const rng = seededRng(5);
  const cand = catalogarVisuais({ liberados: visuaisLiberados(prog, 120), lojaLooks: looks });
  const ids = new Set(cand.map((c) => c.id));
  let ultima = -Infinity, trocas = 0;
  const seq = [];
  for (let i = 0; i < 10000; i++) {
    if (rng() < 0.3) m.sinal(CONTEXTOS[Math.floor(rng() * CONTEXTOS.length)], 0.5 + rng() * 3);
    avanca(Math.floor(rng() * 40e3));
    const r = m.decidir({ candidatos: cand, seguro: rng() < 0.8 });
    if (r.id) assert.ok(ids.has(r.id));
    if (r.trocou) {
      assert.ok(agora() - ultima >= MOTOR_PADRAO.intervaloMs || r.motivo === 'semContexto', 'trocas espaçadas');
      ultima = agora(); trocas++;
      seq.push({ id: r.id, at: agora() });
    }
  }
  for (let i = 2; i < seq.length; i++) {
    const [a, , c] = seq.slice(i - 2, i + 1);
    if (a.id && a.id === c.id) assert.ok(c.at - a.at >= MOTOR_PADRAO.reusoMs, `pingue-pongue ${a.id}`);
  }
  assert.ok(trocas > 20 && trocas < 2000, `trocas: ${trocas}`);
});

test('histórico de uso sobrevive (pequeno) e restaura', () => {
  const { m } = motor();
  m.usos = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`x${i}`, { n: 1, ultimo: i }]));
  const e = m.salvar();
  assert.equal(Object.keys(e.usos).length, 200);
  const n = new MotorVisual({ estado: e });
  assert.equal(n.usos.x299.n, 1);
});

test('companion: loja conectada troca o visual momentâneo sem mexer no salvo e trava animações não compradas', () => {
  const e = makeEnv();
  e.companion.start();
  e.clock.advance(4000);
  const loja = new Loja({ dia: () => '2026-11-24' });
  loja.st.saldo = 100000;
  e.companion.lojaConectar(loja);
  const salvo = JSON.stringify(e.companion.store.get().visualNivel);
  assert.equal(e.companion.playCatalog('lj_la01', { source: 'pedido' }), false, 'sem compra não toca');
  assert.equal(e.companion.playCatalog('ljCompra', { source: 'pedido' }), false, 'cena só pela loja');
  loja.comprar({ txId: 'a', id: 'la01', nivel: 99 });
  loja.comprar({ txId: 'b', id: 'lv07', nivel: 99 });
  e.companion.lojaReagirCompra('lv07');
  for (let i = 0; i < 40 && !e.companion.visualMomento; i++) { e.clock.advance(30e3); e.companion._sinalVisual(['treino'], 3); }
  assert.equal(e.companion.visualMomento?.id, 'lv07');
  assert.ok(e.companion._visualCanais()?.lj_lv07, 'canal do visual da loja chega ao desenho');
  assert.equal(JSON.stringify(e.companion.store.get().visualNivel), salvo, 'visual salvo dela intacto');
  e.companion.store.update({ visualAuto: false });
  e.companion._visualDecidir();
  assert.equal(e.companion.visualMomento, null);
});

test('saldo subiu: JoJo pega a moeda (no máximo 1 vez a cada 10 min) e o serviço anima todo crédito', async () => {
  const { createLojaService } = await import('../../src/main/loja-service.js');
  const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const e = makeEnv();
  e.companion.start();
  e.clock.advance(4000);
  for (let i = 0; i < 60 && !e.companion._lojaPodeReagir(); i++) e.clock.advance(1000); // espera a saudação acabar
  const tocadas = [], moedas = [];
  const play = e.companion.playCatalog.bind(e.companion);
  e.companion.playCatalog = (id, o) => { tocadas.push(id); return play(id, o); };
  const svc = createLojaService({ userData: fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-loja-')), companion: e.companion, needsService: null,
    ipcMain: { handle() {}, removeHandler() {} }, fromApp: () => true });
  const fx = e.companion._lojaMoedas.bind(e.companion);
  e.companion._lojaMoedas = (tipo, n) => { moedas.push(tipo); return fx(tipo, n); };
  svc.loja.creditar({ id: 'rpg:a', valor: 12, origem: 'rpg' });
  assert.deepEqual(moedas, ['ganho']);
  assert.equal(tocadas.filter((t) => t === 'ljGanho').length, 1, 'JoJo comemora o ganho');
  e.clock.advance(60e3);
  svc.loja.creditar({ id: 'rpg:b', valor: 50, origem: 'rpg' });
  assert.deepEqual(moedas, ['ganho', 'pilha'], 'ganho grande vira pilha');
  assert.equal(tocadas.filter((t) => t === 'ljGanho').length, 1, 'sem repetir antes de 10 min');
  svc.loja.creditar({ id: 'rpg:b', valor: 50, origem: 'rpg' });
  assert.equal(moedas.length, 2, 'crédito repetido não anima de novo');
  e.clock.advance(10 * 60e3);
  e.companion.store.update({ lojaReacoes: false });
  assert.equal(e.companion.lojaReagirGanho(5), false, 'reações da loja desligadas');
  e.companion.store.update({ lojaReacoes: true });
  e.companion.work = true;
  assert.equal(e.companion.lojaReagirGanho(5), false, 'Modo Trabalho bloqueia');
  e.companion.work = false;
  for (let i = 0; i < 120 && !e.companion._lojaPodeReagir(); i++) e.clock.advance(1000); // ocupado com outra animação: espera
  // O XP do próprio uso pode ter comemorado no meio; o intervalo conta da última comemoração.
  e.companion._lojaGanhoUltimo = e.clock.now() - 10 * 60e3 + 1000;
  assert.equal(e.companion.lojaReagirGanho(5), false, 'ainda dentro dos 10 min');
  e.clock.advance(1000);
  for (let i = 0; i < 120 && !e.companion._lojaPodeReagir(); i++) e.clock.advance(1000);
  assert.equal(e.companion.lojaReagirGanho(5), true, 'depois de 10 min comemora de novo');
  assert.equal(e.companion.lojaReagirGanho(0), false);
  svc.close();
});

test('guarda-roupa: tirar peça ou tirar tudo vale na hora, mesmo com visual momentâneo do motor (bug do nível 16)', () => {
  const e = makeEnv();
  const c = e.companion;
  c.progress.st.xp = c.progress.threshold(16);
  c._syncVisual({ anunciar: false });
  c.start();
  e.clock.advance(4000);
  c.lojaConectar(new Loja({ dia: () => '2026-11-24' }));
  for (let i = 0; i < 60 && !c.visualMomento; i++) { e.clock.advance(30e3); c._sinalVisual(['treino', 'festa', 'musica', 'humor'], 3); }
  assert.ok(c.visualMomento, 'motor escolheu uma peça momentânea');
  const pecas = c.store.get().visualNivel.pecas;
  assert.ok(Object.keys(pecas).length > 3, 'nível 16 veste várias peças');
  // Tirar uma peça: some na hora, inclusive do desenho (antes a foto antiga do motor mantinha tudo).
  const [parte, id] = Object.entries(pecas).find(([p]) => p !== c.visualMomento.parte);
  c.runCommand('vestir', null, `/vestir ${id}`);
  assert.equal(c.store.get().visualNivel.pecas[parte], undefined);
  assert.equal(c._visualCanais()?.[`nv_${id}`], undefined, 'peça tirada não fica no desenho');
  // Tirar tudo: nada de visual, sem bermuda (corpo liso) e o motor não veste de novo.
  c.runCommand('vestir', null, '/vestir tirar');
  assert.deepEqual(c.store.get().visualNivel.pecas, {});
  assert.equal(c._visualCanais(), null);
  for (let i = 0; i < 80; i++) { e.clock.advance(60e3); c._sinalVisual(['treino', 'festa', 'musica', 'humor'], 3); }
  assert.equal(c._visualCanais(), null, 'troca automática não veste o JoJo pelado');
  c._applyLayout(true);
  assert.deepEqual(e.overlay.state.outfit, { nuLiso: 1 });
  assert.equal(e.overlay.state.visualNivel, null);
  // Subir de nível pelado: libera e anuncia, mas não veste.
  c.progress.st.xp = c.progress.threshold(20);
  const novas = c._syncVisual({ anunciar: false });
  assert.ok(novas?.length, 'liberou peças novas');
  assert.deepEqual(c.store.get().visualNivel.pecas, {}, 'nível novo não veste o JoJo pelado');
  // Vestir de novo pelo botão "o mais recente de cada parte" traz a bermuda de volta.
  c.runCommand('vestir', null, '/vestir melhor');
  assert.ok(Object.keys(c.store.get().visualNivel.pecas).length > 3);
  assert.equal(c.store.get().guardaRoupa.bermuda, undefined);
  c.stop();
});
