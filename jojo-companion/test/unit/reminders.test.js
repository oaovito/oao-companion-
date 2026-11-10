// Lembretes de água, pausas e remédios: interpretação, estado, vencimento e
// entrega visual pelo companion (sem som, sem falar em Trabalho/foco).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeEnv, chatAdv } from './helpers.js';
import { Reminders, parseReminderRequest, parseReminderCommand, sanitizeReminders, emptyReminders, REMINDER_LIMITS } from '../../src/core/reminders.js';

const at = (h, m = 0) => new Date(2026, 9, 30, h, m);

function started() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

function falas(e) {
  const said = [];
  const orig = e.companion.say.bind(e.companion);
  e.companion.say = (t, k, o) => (said.push(t), orig(t, k, o));
  return said;
}

test('pedidos em linguagem natural: água, pausa, remédio, remover e lista; o resto não é lembrete', () => {
  assert.deepEqual(parseReminderRequest('me lembra de beber água a cada 45 min'), { tipo: 'agua', ativo: true, intervaloMin: 45 });
  assert.deepEqual(parseReminderRequest('Me avisa pra tomar água de hora em hora'), { tipo: 'agua', ativo: true, intervaloMin: 60 });
  assert.deepEqual(parseReminderRequest('para de me lembrar da água'), { tipo: 'agua', ativo: false });
  assert.deepEqual(parseReminderRequest('me lembra de fazer pausa a cada 2 horas'), { tipo: 'pausa', ativo: true, intervaloMin: 120 });
  assert.deepEqual(parseReminderRequest('não precisa me lembrar das pausas'), { tipo: 'pausa', ativo: false });
  assert.deepEqual(parseReminderRequest('me lembra de tomar o remédio Vitamina D às 8h'), { tipo: 'remedio', nome: 'Vitamina D', hora: '08:00' });
  assert.deepEqual(parseReminderRequest('Me lembra de tomar antibiótico às 9 da noite.'), { tipo: 'remedio', nome: 'antibiótico', hora: '21:00' });
  assert.deepEqual(parseReminderRequest('me avisa do remédio Losartana as 14:30'), { tipo: 'remedio', nome: 'Losartana', hora: '14:30' });
  assert.equal(parseReminderRequest('me lembra de tomar o remédio da pressão').tipo, 'remedioSemHora');
  assert.deepEqual(parseReminderRequest('tira o lembrete do remédio vitamina d'), { tipo: 'remedioRemover', nome: 'vitamina d' });
  assert.deepEqual(parseReminderRequest('quais são meus lembretes?'), { tipo: 'listar' });
  for (const t of ['bebi água hoje', 'tomei remédio demais', 'o que é losartana?', 'vou fazer uma pausa', 'me lembra da reunião às 3', 'adiciona comprar remédio na lista', 'oi']) assert.equal(parseReminderRequest(t), null, t);
});

test('comando /lembrete: lista, água, pausa, remédio, remover e uso inválido', () => {
  assert.deepEqual(parseReminderCommand(''), { tipo: 'listar' });
  assert.deepEqual(parseReminderCommand('agua 60'), { tipo: 'agua', ativo: true, intervaloMin: 60 });
  assert.deepEqual(parseReminderCommand('água off'), { tipo: 'agua', ativo: false });
  assert.deepEqual(parseReminderCommand('pausa 45 min'), { tipo: 'pausa', ativo: true, intervaloMin: 45 });
  assert.deepEqual(parseReminderCommand('remedio Vitamina D 08:00'), { tipo: 'remedio', nome: 'Vitamina D', hora: '08:00' });
  assert.deepEqual(parseReminderCommand('remédio Ômega 3 21h'), { tipo: 'remedio', nome: 'Ômega 3', hora: '21:00' });
  assert.deepEqual(parseReminderCommand('remover Vitamina D'), { tipo: 'remedioRemover', nome: 'Vitamina D' });
  assert.equal(parseReminderCommand('remedio Vitamina 25:00').tipo, 'invalido');
  assert.equal(parseReminderCommand('qualquer coisa').tipo, 'invalido');
});

test('estado: padrões, limites, duplicatas e arquivo estragado voltam ao válido', () => {
  assert.deepEqual(sanitizeReminders(null), emptyReminders());
  const s = sanitizeReminders({ agua: { ativo: 'sim', intervaloMin: 1 }, pausa: { ativo: true, intervaloMin: 9999 }, remedios: [{ nome: 'A', hora: '08:00' }, { nome: 'a', hora: '08:00' }, { nome: 'B', hora: '8h' }, { nome: '', hora: '09:00' }, null] });
  assert.equal(s.agua.ativo, true);
  assert.equal(s.agua.intervaloMin, REMINDER_LIMITS.aguaMin[0]);
  assert.equal(s.pausa.intervaloMin, REMINDER_LIMITS.pausaMin[1]);
  assert.deepEqual(s.remedios.map((r) => r.nome), ['A']);
  let t = 0;
  const r = new Reminders({ now: () => t });
  for (let i = 0; i < REMINDER_LIMITS.remedios; i++) assert.equal(r.apply({ tipo: 'remedio', nome: `R${i}`, hora: '08:00' }).fala, 'lembreteRemedioOn');
  assert.equal(r.apply({ tipo: 'remedio', nome: 'Mais um', hora: '09:00' }).fala, 'lembreteLimite');
  assert.equal(r.apply({ tipo: 'remedio', nome: 'r0', hora: '08:00' }).fala, 'lembreteRemedioOn', 'repetido não duplica nem estoura o limite');
  assert.equal(r.st.remedios.length, REMINDER_LIMITS.remedios);
  assert.equal(r.apply({ tipo: 'remedioRemover', nome: 'não existe' }).fala, 'lembreteNaoAchei');
  assert.equal(r.apply({ tipo: 'remedioRemover', nome: 'R1' }).fala, 'lembreteRemedioOff');
});

test('vencimento: água só no intervalo e entre 8h e 21h; pausa só com tempo seguido no PC; remédio no horário, uma vez por dia', () => {
  let t = 1e6;
  const saved = [];
  const r = new Reminders({ now: () => t, save: (s) => saved.push(JSON.stringify(s)) });
  assert.deepEqual(r.due(at(10)), [], 'primeira checagem só começa a contar');
  t += 89 * 60e3;
  assert.deepEqual(r.due(at(11)), []);
  t += 2 * 60e3;
  assert.deepEqual(r.due(at(11, 31)), [{ tipo: 'agua', min: 90 }]);
  assert.deepEqual(r.due(at(23)), [], 'fora do horário não cobra água');
  assert.deepEqual(r.due(at(7)), []);
  r.mark({ tipo: 'agua' }, at(11, 31));
  assert.deepEqual(r.due(at(11, 32)), []);
  r.apply({ tipo: 'pausa', ativo: true, intervaloMin: 30 });
  t += 31 * 60e3;
  assert.deepEqual(r.due(at(12), { activeMs: 10 * 60e3 }), [], 'sem 30 min seguidos não manda pausar');
  assert.deepEqual(r.due(at(12), { activeMs: 31 * 60e3 }), [{ tipo: 'pausa', min: 30 }]);
  r.apply({ tipo: 'pausa', ativo: false });
  r.apply({ tipo: 'remedio', nome: 'Vitamina D', hora: '08:00' });
  assert.deepEqual(r.due(at(7, 59)).filter((x) => x.tipo === 'remedio'), []);
  const d = r.due(at(8, 0)).find((x) => x.tipo === 'remedio');
  assert.deepEqual(d, { tipo: 'remedio', nome: 'Vitamina D', hora: '08:00', atrasoMin: 0, perdido: false, central: false });
  assert.equal(r.due(at(11, 1)).find((x) => x.tipo === 'remedio').perdido, true, 'mais de 3 h depois vira perdido');
  r.mark(d, at(8, 0));
  assert.equal(r.due(at(8, 5)).find((x) => x.tipo === 'remedio'), undefined, 'uma vez por dia');
  assert.ok(r.due(new Date(2026, 9, 31, 8, 0)).find((x) => x.tipo === 'remedio'), 'no dia seguinte vale de novo');
  assert.ok(saved.length > 3, 'mudanças são salvas');
});

test('conversa e comando: respostas na voz dele vindas do arquivo de falas, com os dados certos', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, 'me lembra de tomar o remédio Vitamina D às 8h');
  assert.equal(r.intent, 'lembretes');
  assert.match(r.text, /Vitamina D/);
  assert.match(r.text, /08:00/);
  assert.deepEqual(e.companion.reminders.st.remedios.map((x) => [x.nome, x.hora]), [['Vitamina D', '08:00']]);
  assert.deepEqual(e.companion.progress.st.lembretes.remedios.map((x) => x.nome), ['Vitamina D'], 'salvo junto do progresso');
  r = await chatAdv(e, '/lembrete agua 60');
  assert.match(r.text, /60 min/);
  assert.equal(e.companion.reminders.st.agua.intervaloMin, 60);
  r = await chatAdv(e, '/lembrete');
  assert.match(r.text, /Água: a cada 60 min/);
  assert.match(r.text, /Remédio: Vitamina D às 08:00/);
  r = await chatAdv(e, '/lembrete remover vitamina');
  assert.match(r.text, /Vitamina D/);
  assert.equal(e.companion.reminders.st.remedios.length, 0);
  r = await chatAdv(e, '/lembrete xyz');
  assert.match(r.text, /\/lembrete agua 60/);
  r = await chatAdv(e, 'para de me lembrar da água');
  assert.equal(e.companion.reminders.st.agua.ativo, false);
});

test('entrega: água com balão e animação de beber; pausa suprime o aviso de 90 min; nada em foco ou Modo Trabalho', () => {
  const e = started();
  const said = falas(e);
  e.companion.reminders.apply({ tipo: 'agua', ativo: true, intervaloMin: 30 });
  e.clock.advance(20 * 60e3);
  assert.equal(e.companion.checkExtraReminders(at(15)), null, 'antes do intervalo não cobra');
  // Foco: o intervalo vence durante o bloco, ele fica em silêncio e não perde o lembrete.
  e.companion.startFocus(60, 'estudo');
  e.clock.advance(11 * 60e3);
  assert.equal(e.companion.checkExtraReminders(at(15, 31)), null);
  assert.ok(!said.some((t) => /[Áá]gua|Hidrata/.test(t)), 'nenhum lembrete de água durante o foco');
  e.companion._endFocus(false);
  e.companion.runInterpreted({ cmd: 'trabalho_iniciar', arg: '' }, null, { silent: true });
  assert.equal(e.companion.checkExtraReminders(at(15, 32)), null, 'Modo Trabalho: nada aparece');
  e.companion.endWork();
  said.length = 0;
  const item = e.companion.checkExtraReminders(at(15, 33));
  assert.equal(item.tipo, 'agua');
  assert.ok(said.some((t) => /[Áá]gua|Hidrata/.test(t)), said.join(' | '));
  assert.match(e.companion.behavior.anim || '', /^cat_focoBeberAgua/);
  assert.equal(e.companion.checkExtraReminders(at(15, 34)), null, 'não repete em seguida');

  const p = started();
  p.companion.reminders.apply({ tipo: 'agua', ativo: false });
  p.companion.reminders.apply({ tipo: 'pausa', ativo: true, intervaloMin: 20 });
  p.clock.advance(21 * 60e3);
  assert.equal(p.companion.checkExtraReminders(at(16)), null, 'sem tempo seguido no PC não manda pausar');
  p.companion.activeSince = p.clock.now() - 21 * 60e3; // 21 min seguidos no PC
  const saidP = falas(p);
  const pausa = p.companion.checkExtraReminders(at(16));
  assert.equal(pausa.tipo, 'pausa');
  assert.match(saidP[0], /20 min|Pausa/);
  assert.equal(p.companion.lastPauseHint, p.clock.now());
});

test('remédio: aparece na Central na hora mesmo em Modo Trabalho; o balão sai quando puder; fala séria com nome e horário', () => {
  const e = started();
  e.companion.reminders.apply({ tipo: 'agua', ativo: false });
  e.companion.reminders.apply({ tipo: 'remedio', nome: 'Losartana', hora: '08:00' });
  const said = falas(e);
  e.companion.runInterpreted({ cmd: 'trabalho_iniciar', arg: '' }, null, { silent: true });
  assert.equal(e.companion.checkExtraReminders(at(8, 0)), null);
  const conv = e.companion.conversations.get('lembrete-remedio');
  assert.ok(conv, 'atividade criada na Central');
  assert.equal(conv.status, 'needsInput');
  assert.match(conv.detail, /Losartana/);
  assert.equal(said.length, 0, 'sem balão no Modo Trabalho');
  e.companion.endWork();
  e.clock.advance(2000);
  said.length = 0;
  const item = e.companion.checkExtraReminders(at(8, 20));
  assert.equal(item.tipo, 'remedio');
  assert.equal(said.length, 1);
  assert.match(said[0], /Losartana/);
  assert.match(said[0], /08:00/);
  assert.doesNotMatch(said[0], /\b(mg|dose|comprimidos?|gotas)\b/i, 'sem orientação de dose');
  assert.equal(e.companion.checkExtraReminders(at(8, 21)), null, 'uma vez por dia');
});

test('lembretes novos não emitem som e usam só o arquivo de falas', () => {
  const codigo = fs.readFileSync(new URL('../../src/core/reminders.js', import.meta.url), 'utf8');
  assert.doesNotMatch(codigo, /\b(AudioContext|webkitAudioContext|new Audio\(|speechSynthesis|SpeechSynthesisUtterance|<audio|<video|shell\.beep|createOscillator|Notification)\b/);
  const falasArq = JSON.parse(fs.readFileSync(new URL('../../assets/dialogue/pt-BR.json', import.meta.url), 'utf8')).categories;
  for (const c of ['aguaLembrete', 'pausaLembrete', 'remedioLembrete', 'lembreteAguaOn', 'lembreteAguaOff', 'lembretePausaOn', 'lembretePausaOff', 'lembreteRemedioOn', 'lembreteRemedioOff', 'lembreteNaoAchei', 'lembreteRemedioHora', 'lembreteLimite', 'lembreteLista', 'lembreteAjuda']) assert.ok(falasArq[c]?.lines.length >= 2, c);
  assert.doesNotMatch(JSON.stringify(falasArq.remedioLembrete), /\b(mg|dose|dobro|pula)\b/i);
});
