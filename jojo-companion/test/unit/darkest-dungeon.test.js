import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DarkestDungeon } from '../../src/core/darkest-dungeon.js';
const content = JSON.parse(fs.readFileSync(new URL('../../assets/catalog/darkest-dungeon.json', import.meta.url)));
function env(state) {
  let now = Date.parse('2026-11-01T12:00Z'), mono = 1000, disk;
  const rewards = [], awarded = new Set();
  const opts = { state, lines: content.lines, balance: content.balance, now: () => now, monotonic: () => mono,
    rng: () => 0, zone: () => 'America/Sao_Paulo', save: s => { disk = structuredClone(s); },
    award: a => { if (awarded.has(a.id)) return { duplicate: true }; awarded.add(a.id); rewards.push(a); return a; } };
  const dd = new DarkestDungeon(opts);
  const active = (key = '123:process-start-1') => ({ running: true, active: true, processKey: key, idleSeconds: 0 });
  return { dd, rewards, opts, active, saved: () => structuredClone(disk), time: value => { now = Date.parse(value); },
    step: (ms, sample = active()) => { mono += ms; now += ms; dd.observe(sample); },
    play: (ms, key) => { const sample = active(key); dd.observe(sample); for (let n = 0; n < ms; n += 1000) { mono += 1000; now += 1000; dd.observe(sample); } } };
}
test('Darkest: sessão validada em 60 s, marcos cumulativos e primeira do dia somam 210 XP', () => {
  const e = env(); e.play(59000); assert.equal(e.dd.snapshot().sessions, 0); assert.equal(e.rewards.length, 0);
  e.step(1000); assert.equal(e.dd.snapshot().sessions, 1); assert.equal(e.dd.snapshot().xpToday, 65);
  e.play(59 * 60000); assert.equal(e.dd.snapshot().sessionMs, 60 * 60000);
  assert.deepEqual(e.rewards.map(r => r.amount), [15, 50, 25, 40, 80]);
  e.play(60000); assert.equal(e.dd.snapshot().xpToday, 210);
});
test('Darkest: não conta fechado, segundo plano, inativo, suspensão, gaps ou duas instâncias', () => {
  const e = env(); e.play(10000); const before = e.dd.snapshot().activeMs;
  for (const sample of [{}, { ...e.active(), active: false }, { ...e.active(), idleSeconds: 121 }, { ...e.active(), suspended: true }]) {
    e.step(1000, sample); e.step(1000, sample);
  }
  assert.equal(e.dd.snapshot().activeMs, before);
  e.step(60000, e.active()); assert.equal(e.dd.snapshot().activeMs, before);
  e.step(1000, e.active('different')); assert.equal(e.dd.snapshot().activeMs, before);
  e.step(1000, e.active('different')); assert.equal(e.dd.snapshot().activeMs, before + 1000);
});
test('Darkest: reiniciar preserva sessão e marcos sem contabilizar tempo offline ou repetir XP', () => {
  const e = env(); e.play(16 * 60000); const before = e.dd.snapshot();
  const restarted = new DarkestDungeon({ ...e.opts, state: e.saved() });
  restarted.observe(e.active()); assert.equal(restarted.snapshot().activeMs, before.activeMs);
  e.step(1000); // passa o relógio injetado, mas não inventa intervalo no novo monitor
  restarted.observe(e.active()); assert.equal(restarted.snapshot().activeMs, before.activeMs + 1000);
  assert.deepEqual(e.rewards.map(a => a.amount), [15, 50, 25]);
});
test('Darkest: teto diário configurável e sessão/recompensa não dependem de clicar ou falar', () => {
  const e = env(); assert.match(e.dd.chat('Vou jogar Darkest Dungeon.'), /não concede XP/);
  assert.equal(e.dd.snapshot().xpToday, 0);
  for (let i = 0; i < 4; i++) { e.play(60 * 60000, `pid:${i}`); e.step(1000, {}); }
  assert.equal(e.dd.snapshot().xpToday, 300); assert.equal(e.dd.snapshot().sessions, 4);
  assert.equal(e.rewards.filter(r => /Primeira/.test(r.label)).length, 1);
  assert.equal(e.rewards.reduce((n, r) => n + r.amount, 0), 300);
});
test('Darkest: sete dias distintos, sequência e virada local correta sem premiar relógio para trás', () => {
  const e = env();
  for (let day = 1; day <= 7; day++) { e.time(`2026-11-${String(day).padStart(2, '0')}T12:00Z`); e.play(61000, `pid:${day}`); e.step(1000, {}); }
  assert.equal(e.dd.snapshot().achievement, true); assert.equal(e.dd.snapshot().days, 7); assert.equal(e.dd.snapshot().streak, 7);
  e.time('2026-11-08T02:59Z'); assert.equal(e.dd.snapshot().playedToday, true);
  e.time('2026-11-08T03:00Z'); assert.equal(e.dd.snapshot().playedToday, false); assert.equal(e.dd.snapshot().streak, 7);
  e.time('2026-10-30T12:00Z'); e.play(61000, 'rollback');
  assert.equal(e.dd.snapshot().xpToday, 0); assert.equal(e.dd.snapshot().days, 7);
});
test('Darkest: sugestão uma vez por dia 06–21, persistente, frases variadas e foco inviolável', () => {
  const e = env(); e.time('2026-11-01T08:59Z'); assert.equal(e.dd.suggest(), null);
  e.time('2026-11-01T09:00Z'); assert.equal(e.dd.suggest({ focus: true }), null);
  assert.equal(e.dd.suggest({ fullscreen: true }), null); assert.equal(e.dd.suggest({ important: true }), null);
  const suggestion = e.dd.suggest(); assert.ok(suggestion.text); assert.equal(e.dd.suggest(), null);
  const restarted = new DarkestDungeon({ ...e.opts, state: e.saved() }); assert.equal(restarted.suggest(), null);
  e.time('2026-11-02T12:00Z'); const second = e.dd.suggest(); assert.notEqual(second.text, suggestion.text);
  e.time('2026-11-04T00:00Z'); assert.equal(e.dd.suggest(), null); // 21 h local do dia 3
  assert.ok(new Set(content.lines).size >= 15);
});
test('Darkest: dados de chat refletem registro real e distinguem o segundo jogo', () => {
  const e = env(); assert.match(e.dd.chat('Já joguei hoje?'), /Ainda não/); assert.match(e.dd.chat('Quanto tempo joguei?'), /0 minuto/);
  e.play(61000); assert.match(e.dd.chat('Já joguei hoje?'), /Sim, há/); assert.match(e.dd.chat('Quanto XP ganhei jogando?'), /65 XP/);
  assert.match(e.dd.chat('Quero jogar Darkest Dungeon II'), /não entra/); assert.equal(e.dd.chat('Qual é minha agenda?'), null);
});
test('Darkest: outbox reenvia crédito idempotente após falha e não confirma disco quebrado', () => {
  const e = env(); const original = e.dd.award; e.dd.award = () => { throw new Error('disco'); };
  e.play(61000); assert.equal(e.dd.st.outbox.length, 2);
  e.dd.award = original; e.dd.drain(); e.dd.drain(); assert.equal(e.rewards.length, 2);
  e.dd.save = () => { throw new Error('disco'); }; const before = e.dd.snapshot().activeMs;
  assert.throws(() => e.step(5000)); assert.equal(e.dd.snapshot().activeMs, before);
});
