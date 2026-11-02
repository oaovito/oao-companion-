import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Needs } from '../../src/core/needs.js';
import { Progress } from '../../src/core/catalog/antitedio.js';
import { buildAnimation } from '../../src/core/catalog/recipes.js';
const json = rel => JSON.parse(fs.readFileSync(new URL(`../../assets/${rel}`, import.meta.url)));
const foods = json('catalog/foods.json').foods, balance = json('catalog/needs-balance.json');
function env(state) {
  let now = Date.parse('2026-11-01T12:00Z'), mono = 1000, seq = 0, disk;
  const rewards = [], ids = new Set();
  const opts = { state, foods, balance: structuredClone(balance), now: () => now, monotonic: () => mono,
    id: () => `needs-${++seq}`, rng: () => 0, save: st => { disk = structuredClone(st); },
    award: r => { if (ids.has(r.id)) return { duplicate: true }; ids.add(r.id); rewards.push(r); return r; } };
  const n = new Needs(opts);
  return { n, opts, rewards, saved: () => structuredClone(disk), set: value => { now = Date.parse(value); },
    step: (ms, active = true) => { mono += ms; now += ms; return n.tick({ active }); },
    hours: h => { n.tick(); for (let i = 0; i < h * 60; i++) { mono += 60000; now += 60000; n.tick(); } } };
}
test('cardápio: exatamente 50 opções novas, seis preservadas, sem duplicar lula; imagens e falas reais', () => {
  assert.equal(foods.length, 56); assert.equal(foods.filter(f => !f.legacy).length, 50);
  assert.deepEqual(foods.filter(f => f.legacy).map(f => f.id), ['peixe', 'foca', 'lula', 'tartaruga', 'pinguim', 'humano']);
  assert.equal(foods.filter(f => f.id === 'lula').length, 1); assert.ok(foods.some(f => f.id === 'mexilhao'));
  const drawings = new Set(), phrases = new Set();
  for (const f of foods) {
    assert.ok(f.id && f.name && Number.isFinite(f.hunger) && Number.isFinite(f.health) && Number.isFinite(f.mood) && f.xp > 0);
    const image = fs.readFileSync(new URL(`../../${f.image}`, import.meta.url), 'utf8'); assert.match(image, /<svg/); assert.match(image, /<path|<ellipse/);
    assert.equal(/<script|https?:\/\/(?!www.w3.org)/.test(image), false); drawings.add(image.replace(/aria-label="[^"]*"/, '')); phrases.add(f.phrase);
  }
  assert.equal(drawings.size, 56); assert.equal(phrases.size, 56);
});
test('necessidades: seis estados graduais, sem morte permanente e sem degradação offline/foco', () => {
  const e = env(); e.hours(1); assert.equal(e.n.snapshot().hunger, 60);
  const before = e.n.snapshot(); e.step(60000, false); e.step(3600000, false); e.step(60000, true);
  assert.equal(e.n.snapshot().hunger, before.hunger);
  e.step(3600000, true); assert.equal(e.n.snapshot().hunger, before.hunger, 'gap não conta como abandono');
  const states = new Set();
  for (const h of [90, 65, 40, 20, 10, 1]) { e.n.st.hunger = h; states.add(e.n.hungerState()); }
  assert.equal(states.size, 6); e.n.st.hunger = 0; e.n.st.hygiene = 0; e.hours(100); assert.ok(e.n.st.health >= 25);
});
test('alimentação: efeitos reais, preferência, recuperação e limite contra spam', () => {
  const e = env(); const before = e.n.snapshot();
  const first = e.n.feed('salmao'); assert.equal(first.fed, true); assert.equal(first.animation, 'needsFavorita');
  assert.ok(e.n.st.hunger > before.hunger); assert.ok(e.n.st.mood > before.mood); assert.equal(e.rewards[0].amount, 5);
  assert.equal(e.n.feed('salmao').fed, false); assert.equal(e.rewards.length, 1);
  e.n.st.hunger = 10; e.n.st.health = 30; e.n.feed('salmao'); assert.ok(e.n.st.health > 30);
  e.n.st.hunger = 50; const oldMood = e.n.st.mood; e.n.feed('sanduicheNatural'); assert.ok(e.n.st.mood < oldMood);
  for (let i = 0; i < 20; i++) { e.n.st.hunger = 50; e.n.feed('salmao'); }
  assert.ok(e.rewards.reduce((sum, a) => sum + a.amount, 0) <= balance.feedXpCap);
  assert.ok(e.n.st.digestion.length <= balance.maxObjects);
});
test('digestão: tempo ativo, seis raridades configuráveis, limite de objetos e limpeza idempotente', () => {
  const e = env(); e.n.feed('salmao'); e.n.tick();
  e.step(60000, false); e.step(3600000, false); assert.equal(e.n.st.objects.length, 0);
  e.step(60000, true); e.hours(0.5); assert.equal(e.n.st.objects.length, 1);
  const id = e.n.st.objects[0].id; const xp = e.n.snapshot().xpToday; const hygiene = e.n.st.hygiene;
  assert.equal(e.n.clean(id).cleaned, true); assert.equal(e.n.snapshot().xpToday, xp + 5); assert.ok(e.n.st.hygiene > hygiene);
  assert.equal(e.n.clean(id).duplicate, true); assert.equal(e.n.snapshot().xpToday, xp + 5);
  for (let i = 0; i < 20; i++) { e.n.st.hunger = 50; e.n.feed('peixe'); } e.hours(1);
  assert.ok(e.n.st.objects.length <= 6);
  assert.deepEqual(balance.types.map(t => t.xp), [5, 12, 25, 50, 100, 250]);
});
test('higiene: cuidado recupera gradualmente, respeita cooldown e não premia deixar adoecer', () => {
  const e = env(); e.n.st.hygiene = 20; e.n.st.health = 30; e.n.st.hunger = 0;
  const care = e.n.care(); assert.equal(care.cared, true); assert.ok(e.n.st.health > 30); assert.equal(e.rewards.length, 0);
  assert.equal(e.n.care().cared, false); e.n.st.hunger = 50; e.step(16 * 60000); // gap conserva necessidades
  assert.equal(e.n.care().cared, true); assert.equal(e.rewards.length, 1);
});
test('necessidades: persistência/outbox, reinício sem tempo inventado e falha de gravação', () => {
  const e = env(); e.n.award = () => { throw new Error('crash'); }; e.n.feed('salmao');
  assert.equal(e.n.st.outbox.length, 1);
  const restored = new Needs({ ...e.opts, state: e.saved() }); assert.equal(restored.st.outbox.length, 0); assert.equal(e.rewards.length, 1);
  restored.tick(); assert.equal(restored.snapshot().hunger, e.n.snapshot().hunger);
  const old = e.n.snapshot(); e.n.save = () => { throw new Error('disco'); };
  e.n.st.hunger = 50; assert.throws(() => e.n.feed('atum')); assert.equal(e.n.st.hunger, 50); assert.equal(e.n.snapshot().mood, old.mood);
});
test('necessidades: cap diário e relógio para trás não multiplicam XP de limpeza', () => {
  const e = env();
  for (let i = 0; i < 4; i++) { e.n.st.objects.push({ id: `legend-${i}`, type: 'legendary', slot: i }); e.n.clean(`legend-${i}`); }
  assert.equal(e.n.snapshot().xpToday, balance.dailyXp);
  e.set('2026-10-31T12:00Z'); e.n.st.objects.push({ id: 'back', type: 'legendary', slot: 0 }); e.n.clean('back');
  assert.equal(e.n.snapshot().xpToday, 0); assert.equal(e.rewards.reduce((sum, a) => sum + a.amount, 0), balance.dailyXp);
});
test('necessidades: 20 animações novas distintas têm adereços desenhados, sem membros artificiais', () => {
  const items = json('catalog/needs-animations.json').itens; const r = json('character/jojo.rig.json');
  assert.ok(items.length >= 20); const signatures = new Set();
  for (const it of items) {
    const a = buildAnimation(it); signatures.add(JSON.stringify(a));
    for (const prop of it.receita.objeto) assert.ok(r.groups.some(g => g.parts.some(p => p.showIf === `prop_${prop}`)), prop);
  }
  assert.equal(signatures.size, items.length);
});
test('progressão: níveis antigos preservados, novos patamares crescem e barra usa limiares reais', () => {
  const data = json('catalog/progressao.json'); const p = new Progress({ data, state: { xp: 540 } });
  assert.equal(p.nivel, 10); assert.equal(p.nomeNivel, 'Megalodon'); assert.equal(p.threshold(2), 60);
  assert.equal(p.threshold(11), 780); assert.equal(p.threshold(12), 1140);
  p.st.xp = 800; assert.equal(p.nivel, 11); assert.ok(p.snapshot().percentXP > 0 && p.snapshot().percentXP < 100);
});
test('progressão: spam de gesto e salto de relógio não geram XP ilimitado', () => {
  let wall = Date.parse('2026-11-01T12:00Z'), mono = 1000;
  const p = new Progress({ data: json('catalog/progressao.json'), now: () => mono, wallNow: () => wall, monotonicNow: () => mono });
  for (let i = 0; i < 100; i++) p.xp('gesto'); assert.equal(p.st.xp, 2);
  mono += 3000; wall += 3000; p.xp('gesto'); assert.equal(p.st.xp, 4);
  wall += 86400000; assert.equal(p.clockHealthy(), false);
  assert.throws(() => p.award({ id: 'bad-clock', amount: 50, source: 'test', day: '2026-11-02' })); assert.equal(p.st.xp, 4);
  wall -= 86400000; assert.equal(p.clockHealthy(), true);
  p.award({ id: 'good-clock', amount: 50, source: 'test', day: '2026-11-01' }); assert.equal(p.st.xp, 54);
});

test('easter eggs: sem logo embutido; badge raro só existe com ícone obtido localmente', () => {
  const e = env(); e.n.feed('salmao'); e.hours(0.5); assert.equal(e.n.st.objects[0].egg, null);
  e.n.balance.localBadges = ['discord', 'lol']; e.n.st.hunger = 50; e.n.feed('atum'); e.hours(0.5);
  assert.equal(e.n.st.objects.at(-1).egg, 'discord'); assert.equal(e.n.st.objects.at(-1).type, 'common');
});
