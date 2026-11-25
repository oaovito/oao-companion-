import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeEnv, loadJSON } from './helpers.js';
import { createNeedsService } from '../../src/main/needs-service.js';
import { createRpgService, climaParaRpg } from '../../src/main/rpg-service.js';

const dia = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const tick = () => new Promise((r) => setImmediate(r));

function setup(t, { dir = null } = {}) {
  const e = makeEnv({ dir, settings: { iaAtivo: false, webSearch: false, speechFrequency: 'off', ambienteFrequencia: 'desligado' } });
  t.after(() => { e.companion.stop(); e.store.flush(); e.personality.flush(); if (!dir) fs.rmSync(e.dir, { recursive: true, force: true }); });
  e.companion.start(); e.clock.advance(2000);
  const ipc = {}; const ipcMain = { handle: (k, fn) => { ipc[k] = fn; }, removeHandler: (k) => { delete ipc[k]; } };
  const needs = createNeedsService({ userData: e.dir, companion: e.companion, store: e.store, foods: loadJSON('assets/catalog/foods.json').foods, balance: loadJSON('assets/catalog/needs-balance.json'),
    ipcMain, fromApp: () => true, fromOverlay: () => false, notify: () => {}, log: () => {} });
  let avisos = 0;
  const rpg = createRpgService({ userData: e.dir, companion: e.companion, needsService: needs, ipcMain, fromApp: () => true, notify: () => { avisos++; }, log: () => {}, rng: () => 0.5 });
  return { ...e, needs, rpg, ipc, avisos: () => avisos };
}
async function subirAte(e, nivel) {
  for (let i = 0; e.companion.progress.nivel < nivel && i < 400; i++) e.companion.progress.award({ id: `teste:${i}`, amount: 500, source: 'interaction', day: dia(), label: 'teste', atividade: 'teste' });
  await tick();
}

test('RPG no app: comida, limpeza e cuidado reais viram eventos sem mudar os cuidados', (t) => {
  const e = setup(t);
  e.needs.model.st.hunger = 40;
  const r = e.needs.feed('salmao');
  assert.equal(r.fed, true);
  assert.equal(e.needs.model.st.foods.salmao, 1, 'a comida continua registrada nos cuidados');
  assert.equal(e.rpg.rpg.st.contas.comidas, 1);
  assert.ok(e.rpg.rpg.st.vida.recentes.some((x) => x.id === 'salmao'), 'a vida do JoJo também recebeu a refeição');
  assert.ok(e.avisos() > 0, 'a Central é avisada');
});

test('RPG no app: XP confirmado de outros sistemas vira evento uma vez; XP do próprio RPG não volta em loop', (t) => {
  const e = setup(t);
  const p = e.companion.progress;
  p.award({ id: 'todo:x:1', amount: 10, source: 'todo', day: dia(), label: 'Tarefa' });
  p.award({ id: 'todo:x:1', amount: 10, source: 'todo', day: dia(), label: 'Tarefa' }); // duplicada: ignorada
  assert.equal(e.rpg.rpg.st.contas.tarefas, 1);
  p.award({ id: 'rpg:fake:1', amount: 10, source: 'rpg', day: dia(), label: 'RPG' });
  assert.equal(e.rpg.rpg.st.contas.tarefas, 1);
  p.award({ id: 'timer:1', amount: 10, source: 'interaction', day: dia(), label: 'Timer: Exercícios', atividade: 'timer' });
  assert.equal(e.rpg.rpg.st.contasDia.c.treino, 1, 'timer de exercício conta como treino');
});

test('RPG no app: minijogo vencido conta vitória e estudo; combo de três vitórias não quebra por evento de jogo', (t) => {
  const e = setup(t);
  for (let i = 0; i < 3; i++) e.companion.onGameEnd({ tipo: 'quiz', id: 'quiz' }, true, 3);
  assert.equal(e.rpg.rpg.st.contas.vitorias, 3);
  assert.equal(e.rpg.rpg.st.contas.estudos, 3);
  assert.ok(e.rpg.rpg.st.combos.cmb_jogoVitoria3, 'três vitórias seguidas viram o combo Invicta');
  const ctx = e.companion.rpgJogoContexto();
  assert.ok(ctx.dificuldade >= 1 && ctx.dificuldade <= 5);
});

test('RPG no app: subir de nível entrega recompensas uma vez; JOJOcoins esperam a carteira e entram sem duplicar', async (t) => {
  const e = setup(t);
  await subirAte(e, 12);
  const st = e.rpg.rpg.st;
  assert.equal(st.nivelVisto, e.companion.progress.nivel);
  const moedas = st.outbox.filter((o) => o.tipo === 'moedas');
  assert.ok(moedas.length >= 11, 'sem loja, as moedas ficam guardadas');
  assert.equal(st.outbox.filter((o) => o.tipo === 'xp').length, 0, 'XP não espera a carteira');
  const recebidos = new Map();
  e.companion.loja = { st: { ativos: { decor: {} } }, creditar: ({ id, valor }) => { if (recebidos.has(id)) return { ok: true, duplicado: true, creditado: 0 }; recebidos.set(id, valor); return { ok: true, creditado: valor, saldo: 0 }; } };
  e.clock.advance(60000); e.companion.onRoutineTick();
  assert.equal(st.outbox.length, 0);
  assert.equal(recebidos.size, moedas.length);
  e.rpg.sincronizar();
  assert.equal(recebidos.size, moedas.length, 'sincronizar de novo não repete nível');
});

test('RPG no app: conversa determinística (ficha, expedição, código secreto, encruzilhada)', async (t) => {
  const e = setup(t);
  assert.match(e.companion.rpgChat('ficha'), /Nível 1/);
  let aberto = null; const abrir0 = e.companion.onOpenApp; e.companion.onOpenApp = (id) => { aberto = id; };
  assert.match(e.companion.runCommand('aventura', null, '/aventura').text, /Abri a Aventura/);
  assert.equal(aberto, 'aventura'); e.companion.onOpenApp = abrir0;
  assert.match(e.companion.rpgChat('vai numa expedição'), /nível 2/);
  assert.equal(e.companion.rpgChat('oi, tudo bem?'), null, 'conversa normal segue para o modelo');
  assert.equal(e.companion.rpgChat('vira de costas'), null, 'frase de meme não vira especialização');
  const c = e.companion.rpgChat('sharknado');
  assert.ok(c && !/já usou/.test(c));
  assert.match(e.companion.rpgChat('sharknado'), /já usou/);
  await subirAte(e, 3);
  assert.match(e.companion.rpgChat('expedição no recife'), /Partindo/);
  const ex = e.rpg.rpg.st.expedicoes[0];
  ex.restaMs = Math.floor(ex.totalMs / 2) - 1;
  assert.ok(e.rpg.rpg.encruzilhadaPendente());
  assert.match(e.companion.rpgChat('a'), /Anotado/);
  assert.equal(e.rpg.rpg.encruzilhadaPendente(), null);
});

test('RPG no app: Modo Trabalho não fala nem anima, mas a expedição anda; tela cheia idem', async (t) => {
  const e = setup(t);
  await subirAte(e, 3);
  e.rpg.agir('expedicao', { regiao: 'recife' });
  const antes = e.rpg.rpg.st.expedicoes[0].restaMs;
  const falas = []; const say0 = e.companion.say.bind(e.companion);
  e.companion.say = (txt, kind, o) => { if (o?.category === 'rpg' || /Voltei de|Sede\.|Tédio/.test(txt)) falas.push(txt); return say0(txt, kind, o); };
  const pc0 = e.companion.playCatalog.bind(e.companion);
  e.companion.playCatalog = (id, o) => { if (/^rpg_/.test(id)) falas.push(id); return pc0(id, o); };
  e.rpg.rpg.mutar(() => { Object.assign(e.rpg.rpg.st.vida, { sede: 5, tedio: 95 }); });
  e.companion.work = true;
  e.clock.advance(60000); e.companion.onRoutineTick();
  assert.ok(e.rpg.rpg.st.expedicoes[0].restaMs < antes, 'a expedição avança em silêncio');
  e.companion.work = false; e.companion.fullscreenIds = [1];
  e.rpg.rpg.st.expedicoes[0].restaMs = 1000;
  e.clock.advance(60000); e.companion.onRoutineTick();
  assert.equal(e.rpg.rpg.st.expedicoes.length, 0, 'a expedição termina mesmo com tela cheia');
  assert.equal(falas.length, 0, 'nenhuma fala do RPG no Modo Trabalho nem em tela cheia');
  e.companion.fullscreenIds = [];
});

test('RPG no app: Central pede ações pelo IPC e o estado sobrevive a reabrir o app', async (t) => {
  const dir = fs.mkdtempSync(path.join((await import('node:os')).tmpdir(), 'jojo-rpg-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const e = setup(t, { dir });
  await subirAte(e, 6);
  const h = e.ipc['rpg:request'];
  assert.ok(h('evento', { action: 'snapshot' }).rpg.atributos.length === 10);
  h({}, { action: 'auto', valor: false });
  e.rpg.rpg.mutar(() => { e.rpg.rpg.st.pontos.atributo = 2; });
  const r = h({}, { action: 'investir', id: 'sorte' });
  assert.equal(r.result.ok, true);
  assert.equal(h({}, { action: 'nada' }).result.ok, false);
  assert.equal(h({}, null).error, 'Solicitação indisponível.');
  const sorte = e.rpg.rpg.st.investidos.sorte;
  e.rpg.close(); e.companion.stop();
  const e2 = setup(t, { dir });
  assert.equal(e2.rpg.rpg.st.investidos.sorte, sorte);
  assert.equal(e2.rpg.rpg.st.auto, false);
});

test('RPG: o clima real da 0.47.7 vira o clima dos segredos (garoa, vencido, desligado)', () => {
  const agora = 1_000_000;
  assert.equal(climaParaRpg({ cond: { tipo: 'tempestade', codigo: 95 }, validoAte: agora + 1 }, agora), 'tempestade');
  assert.equal(climaParaRpg({ cond: { tipo: 'chuva', codigo: 53 }, validoAte: agora + 1 }, agora), 'garoa');
  assert.equal(climaParaRpg({ cond: { tipo: 'chuva', codigo: 63 }, validoAte: agora + 1 }, agora), 'chuva');
  assert.equal(climaParaRpg({ cond: { tipo: 'calor', codigo: 0 }, validoAte: agora + 1 }, agora), 'calor');
  assert.equal(climaParaRpg({ cond: { tipo: 'calor', codigo: 0 }, validoAte: agora - 1 }, agora), null);
  assert.equal(climaParaRpg({ cond: { tipo: null } }, agora), null);
  assert.equal(climaParaRpg(null, agora), null);
});
