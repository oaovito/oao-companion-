import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePersonality, phraseFilter, InstagramWatcher, dailyReminder, profileVars, PERSONALITY_DEFAULTS } from '../../src/core/personality.js';
import { PhraseBook } from '../../src/core/phrases.js';
import { detectIntent } from '../../src/core/dialogue/scripted-provider.js';
import { makeEnv, loadJSON, seededRng } from './helpers.js';

const PHRASES = loadJSON('assets/dialogue/pt-BR.json');
const settle = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

test('perfil: padrões e validação', () => {
  const { settings, issues } = sanitizePersonality({ palavroes: 'muitos', instagram: { ativo: false, intervaloMinSeg: 1 }, lembreteComida: { inicio: 22, fim: 8 } });
  assert.equal(settings.palavroes, 'ocasional');
  assert.equal(settings.instagram.ativo, false);
  assert.equal(settings.instagram.intervaloMinSeg, 10);
  assert.equal(settings.lembreteComida.inicio, 10);
  assert.equal(settings.lembreteComida.fim, 21);
  assert.ok(issues.length >= 2);
  assert.equal(PERSONALITY_DEFAULTS.instagram.intervaloMinSeg, 120);
  assert.deepEqual(profileVars({ tratamento: 'João' }), { vocativo: ', João', nome: 'João' });
  assert.deepEqual(profileVars({ tratamento: '' }), { vocativo: '', nome: 'você' });
});

test('frases: sem palavrões nem humor com drogas quando desligados; nunca usam corpo/peso', () => {
  const pb = new PhraseBook(PHRASES, { rng: seededRng(2), filter: phraseFilter({ palavroes: 'nenhum', humorDrogas: false }) });
  const bad = /porra|caralho|merda|puta|escobar|scarface|cheir|pó|cocaína/i;
  for (const cat of Object.keys(PHRASES.categories)) {
    for (let i = 0; i < 20; i++) {
      const p = pb.pick(cat, { vocativo: '', nome: 'você', atalho: 'Ctrl' });
      if (p) assert.ok(!bad.test(p.text), `${cat}: ${p.text}`);
    }
  }
  const all = JSON.stringify(PHRASES.categories);
  assert.ok(!/gord|magr|barriga|peso|engord/i.test(all), 'nenhuma fala usa peso ou corpo como insulto');
  for (const c of ['instagram', 'foodReminder', 'achievement', 'quietAck', 'scare']) assert.ok(PHRASES.categories[c], c);
});

test('fiscal do Instagram: só na entrada e com intervalo mínimo', () => {
  const w = new InstagramWatcher();
  const cfg = { ativo: true, intervaloMinSeg: 120 };
  assert.equal(w.update(0, true, cfg), true, 'entrou');
  assert.equal(w.update(1000, true, cfg), false, 'continua aberto: não repete');
  assert.equal(w.update(2000, false, cfg), false);
  assert.equal(w.update(30000, true, cfg), false, 'voltou antes de 2 min');
  w.update(40000, false, cfg);
  assert.equal(w.update(130000, true, cfg), true, 'nova entrada após o intervalo');
  assert.equal(new InstagramWatcher().update(0, true, { ativo: false }), false, 'desligado');
});

test('lembrete diário: uma vez por dia, dentro da faixa, horário sorteado', () => {
  const cfg = { ativo: true, inicio: 10, fim: 21, ultimoDia: null, horarioDeHoje: null };
  let state = { ...cfg };
  let fired = 0;
  let firedAt = null;
  for (let m = 0; m < 24 * 60; m += 5) {
    const d = new Date(2026, 9, 29, Math.floor(m / 60), m % 60);
    const r = dailyReminder(d, state, seededRng(m + 1));
    state = { ...state, ...r.state };
    if (r.due) {
      fired++;
      firedAt = d.getHours();
    }
  }
  assert.equal(fired, 1);
  assert.ok(firedAt >= 10 && firedAt < 21, `disparou às ${firedAt}h`);
  // No dia seguinte dispara de novo.
  const r2 = dailyReminder(new Date(2026, 9, 30, 20, 59), state, () => 0);
  assert.equal(r2.due, true);
  assert.equal(dailyReminder(new Date(2026, 9, 31, 9, 0), { ...cfg, ativo: false }).due, false);
});

test('companion: Instagram aberto → bronca com olhar de julgamento; silêncio respeitado', async () => {
  const e = makeEnv();
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  e.companion.hideBubble();
  assert.equal(e.companion.onForeground({ instagram: true }), true);
  await settle();
  e.clock.advance(50);
  assert.equal(e.companion.behavior.state, 'judge');
  const texts = PHRASES.categories.instagram.lines.map((l) => (typeof l === 'string' ? l : l.t));
  assert.ok(e.companion.bubble && texts.includes(e.companion.bubble.text), `fala: ${e.companion.bubble && e.companion.bubble.text}`);
  // Continua no Instagram: nada novo.
  assert.equal(e.companion.onForeground({ instagram: true }), false);
  // Modo silencioso: não dá bronca.
  const q = makeEnv({ settings: { quietMode: true } });
  q.companion.start();
  q.clock.advance(3000);
  assert.equal(q.companion.onForeground({ instagram: true }), false);
});

test('companion: lembrete de comida sai uma vez e é salvo no perfil', async () => {
  const e = makeEnv({ profile: { lembreteComida: { ativo: true, inicio: 10, fim: 21 } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  let delivered = 0;
  for (let m = 10 * 60; m < 21 * 60; m += 1) {
    if (e.companion.checkDailyReminder(new Date(2026, 9, 29, Math.floor(m / 60), m % 60))) delivered++;
    e.clock.advance(10);
  }
  assert.equal(delivered, 1);
  assert.equal(e.personality.get().lembreteComida.ultimoDia, '2026-10-29');
});

test('conversa: silêncio liga o modo silencioso; conquista flexiona; susto teatral', async () => {
  assert.equal(detectIntent('fica quieto'), 'quiet');
  assert.equal(detectIntent('consegui terminar o relatório'), 'achievement');
  assert.equal(detectIntent('me assusta'), 'scare');
  assert.equal(detectIntent('treino de perna hoje'), 'gym');
  const e = makeEnv();
  e.companion.start();
  e.clock.advance(2000);
  e.companion.enterInteraction();
  let r = await e.companion.chat('consegui!');
  assert.equal(r.action, 'flex');
  assert.equal(e.companion.behavior.state, 'happy');
  r = await e.companion.chat('me assusta');
  assert.equal(e.companion.behavior.state, 'scare');
  r = await e.companion.chat('silêncio');
  assert.equal(r.action, 'quiet');
  assert.equal(e.store.get().quietMode, true);
});
