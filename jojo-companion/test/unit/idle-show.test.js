// PC parado → senta e cheira pó (ou pré-treino), efeito de 5 min, exibições,
// piadas e o lembrete semanal do Legends.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv, loadJSON } from './helpers.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { autoWeights, BehaviorMachine } from '../../src/core/behavior.js';
import { weeklyReminder, weekKey, PERSONALITY_DEFAULTS, sanitizePersonality } from '../../src/core/personality.js';

const ANIMS = loadJSON('assets/animations/jojo.animations.json');
const RIG = loadJSON('assets/character/jojo.rig.json');

function started(opts) {
  const e = makeEnv(opts);
  e.companion.start();
  e.clock.advance(2000);
  return e;
}

function spyCategories(e) {
  const cats = [];
  const orig = e.companion.sayCategory.bind(e.companion);
  e.companion.sayCategory = (c, o) => {
    cats.push(c);
    return orig(c, o);
  };
  return cats;
}

test('PC parado 5 min: senta no chão e cheira pó; antes disso, nada', () => {
  const e = started();
  assert.equal(e.companion.onSystemIdle(299), false);
  assert.notEqual(e.companion.behavior.state, 'snort');
  assert.equal(e.companion.onSystemIdle(300), true);
  assert.equal(e.companion.behavior.state, 'snort');
  e.clock.advance(1000);
  assert.equal(e.companion.behavior.anim, 'snort');
  e.clock.advance(6000);
  assert.equal(e.companion.behavior.anim, 'sitWired', 'fica sentado ligadão esperando a volta');
  // Continua parado: não repete.
  assert.equal(e.companion.onSystemIdle(900), false);
  assert.equal(e.companion.wired, false, 'efeito só conta a partir da volta');
});

test('efeito dura 5 min a partir da volta da atividade, com aparência e comportamento próprios', () => {
  const e = started();
  const cats = spyCategories(e);
  e.companion.onSystemIdle(400);
  e.clock.advance(8000);
  e.companion.onSystemIdle(2);
  assert.equal(e.companion.wired, true);
  assert.ok(cats.includes('wiredStart'));
  assert.notEqual(e.companion.behavior.state, 'snort', 'levanta do chão');
  e.clock.advance(100);
  assert.equal(e.overlay.state.mode, 'wired');
  assert.equal(e.overlay.state.noseDust, true);
  assert.equal(e.companion._behaviorContext().wired, true);
  e.clock.advance(4 * 60e3 + 50e3);
  assert.equal(e.companion.wired, true, 'ainda ligadão perto dos 5 min');
  e.clock.advance(15e3);
  assert.equal(e.companion.wired, false, 'passou após 5 min');
  assert.equal(e.overlay.state.mode, null);
  assert.equal(e.overlay.state.noseDust, false);
});

test('sem humor com drogas: toma pré-treino (sem pó no nariz); desligado: não faz nada', () => {
  const e = started({ profile: { humorDrogas: false } });
  const cats = spyCategories(e);
  e.companion.onSystemIdle(300);
  assert.equal(e.companion.behavior.state, 'chug');
  e.clock.advance(6000);
  e.companion.onSystemIdle(0);
  e.clock.advance(100);
  assert.equal(e.overlay.state.mode, 'wired');
  assert.equal(e.overlay.state.noseDust, false);
  assert.ok(cats.includes('hyperStart'));

  const off = started({ profile: { ociosidade: { ativo: false, minutos: 5, efeitoMin: 5 } } });
  assert.equal(off.companion.onSystemIdle(3600), false);
  const quick = started({ profile: { ociosidade: { ativo: true, minutos: 1, efeitoMin: 2 } } });
  assert.equal(quick.companion.onSystemIdle(60), true);
});

test('não cheira com o pet guardado, pausado ou no modo de interação', () => {
  const e = started();
  e.companion.setVisible(false);
  assert.equal(e.companion.onSystemIdle(600), false);
  e.companion.setVisible(true);
  e.store.update({ paused: true });
  assert.equal(e.companion.onSystemIdle(600), false);
  e.store.update({ paused: false });
  e.companion.enterInteraction();
  assert.equal(e.companion.onSystemIdle(600), false);
});

test('ligadão: não dorme nem senta e anda mais rápido', () => {
  const w = autoWeights(0.5);
  assert.ok(w.benchPress > 0 && w.squat > 0, 'exibições entram no sorteio');
  assert.equal(autoWeights(0.5, { alert: true }).benchPress, 0);
  const m = new BehaviorMachine({ rng: Math.random, activity: 0.5 });
  for (let i = 0; i < 300; i++) assert.ok(!['sleep', 'lie', 'sit'].includes(m.pickAuto({ wired: true })));

  const e = started({ settings: { activity: 1 } });
  e.companion.wiredUntil = e.clock.now() + 60e3;
  e.companion.behavior.request('walk', { now: e.clock.now(), force: true });
  const speedOf = (c) => (c.mover.active ? c.mover.path.length / c.mover.path.duration : null);
  const speedWired = speedOf(e.companion);
  const e2 = started({ settings: { activity: 1 } });
  e2.companion.behavior.request('walk', { now: e2.clock.now(), force: true });
  const speedNormal = speedOf(e2.companion);
  assert.ok(speedWired && speedNormal, 'os dois andaram');
  // Caminhadas longas atingem o limite de duração; compara só quando nenhuma bateu nele.
  if (e.companion.mover.path.duration < 9000 && e2.companion.mover.path.duration < 9000 && e.companion.mover.path.duration > 600) assert.ok(speedWired > speedNormal * 1.5);
});

test('animações: supino e agachamento com adereços; variações "ligadão" só no modo', () => {
  for (const k of ['benchPress', 'squat', 'snort', 'chug', 'sitWired']) assert.ok(ANIMS.animations[k], k);
  const an = new Animator(ANIMS);
  const at = (k, t) => {
    an.play(k, 0, { restart: true, variant: k });
    return an.sample((ANIMS.animations[k].duration || 1000) * t).pose;
  };
  assert.equal(at('benchPress', 0.5).propBench, 1);
  assert.equal(at('squat', 0.5).propBar, 1);
  assert.equal(at('snort', 0.2).propPowder, 1, 'carreira no chão antes');
  assert.equal(at('snort', 0.8).propPowder, 0, 'some depois da fungada');
  assert.equal(at('snort', 0.8).noseDust, 1);
  assert.equal(at('chug', 0.4).propShaker, 1);
  // Peças com showIf existem no rig.
  const parts = RIG.groups.flatMap((g) => g.parts);
  for (const ch of ['propBench', 'propBar', 'propPowder', 'propShaker', 'noseDust']) assert.ok(parts.some((p) => p.showIf === ch), ch);
  // Modo.
  for (let i = 0; i < 20; i++) {
    an.play('idle', i, { restart: true, mode: 'wired' });
    assert.equal(ANIMS.animations[an.current.variant].mode, 'wired');
    an.play('idle', i, { restart: true, mode: null });
    assert.ok(!ANIMS.animations[an.current.variant].mode);
  }
  assert.ok(RIG.moods.moodWired);
});

test('chat: "faz supino" e "agachamento" fazem o exercício pra ela ver', async () => {
  const e = started();
  let r = await chatAdv(e, 'faz supino pra mim');
  assert.equal(r.action, 'bench');
  assert.equal(e.companion.behavior.state, 'benchPress');
  e.clock.advance(7000);
  r = await chatAdv(e, 'agora agachamento');
  assert.equal(r.action, 'squat');
  assert.equal(e.companion.behavior.state, 'squat');
});

test('objetivo de fazer sorrir: piadas e exibições aparecem sozinhas', () => {
  const e = started({ settings: { speechFrequency: 'often' } });
  const cats = spyCategories(e);
  const states = new Set();
  e.companion.behavior.on((ev) => ev.type === 'enter' && states.add(ev.state));
  for (let i = 0; i < 240; i++) e.clock.advance(30e3);
  assert.ok(cats.includes('joke'), `categorias: ${[...new Set(cats)]}`);
  assert.ok(states.has('benchPress') || states.has('squat'), `estados: ${[...states]}`);
  assert.match(PERSONALITY_DEFAULTS.objetivo, /sorrir/);
});

test('Legends: uma vez por semana, em momento aleatório', () => {
  let cfg = { ...PERSONALITY_DEFAULTS.legends };
  const due = [];
  for (let d = 0; d < 35; d++) {
    for (let h = 0; h < 24; h++) {
      const date = new Date(2026, 10, 2 + d, h, 30);
      const r = weeklyReminder(date, cfg, Math.random);
      cfg = { ...cfg, ...r.state };
      if (r.due) due.push(weekKey(date));
    }
  }
  assert.equal(due.length, 5);
  assert.equal(new Set(due).size, 5, 'uma por semana');
  assert.equal(weeklyReminder(new Date(2026, 10, 4, 12), { ...cfg, ativo: false }).due, false);
  assert.equal(sanitizePersonality({ legends: { inicio: 20, fim: 3 } }).settings.legends.inicio, PERSONALITY_DEFAULTS.legends.inicio);

  const e = started();
  const cats = spyCategories(e);
  const monday = new Date(2026, 10, 2, 9, 0);
  e.companion.checkWeeklyLegends(monday);
  const m = e.personality.get().legends.momento;
  const when = new Date(2026, 10, 2 + m.dia, Math.floor(m.minuto / 60), m.minuto % 60);
  assert.equal(e.companion.checkWeeklyLegends(when), true);
  assert.ok(cats.includes('legends'));
  assert.equal(e.companion.checkWeeklyLegends(new Date(when.getTime() + 3600e3)), false, 'não repete na mesma semana');
});

test('"vai tomar no cu": pose do meme de costas por 5 s e volta ao normal', async () => {
  const e = started();
  for (const msg of ['vai tomar no cu', 'VAI TOMAR NO CU JOJO', 'vtnc']) {
    const r = await chatAdv(e, msg);
    assert.equal(r.action, 'moon', msg);
    assert.equal(e.companion.behavior.state, 'moon');
    // chatAdv já avançou ~1,1 s depois do início da pose.
    e.clock.advance(3000);
    assert.equal(e.companion.behavior.state, 'moon', 'continua por 5 s');
    e.clock.advance(1500);
    assert.notEqual(e.companion.behavior.state, 'moon');
  }
  // A vista de costas troca o desenho: grupos de frente somem, os de costas aparecem.
  const an = new Animator(ANIMS);
  an.play('moon', 0, { restart: true, variant: 'moon' });
  assert.equal(an.sample(2500).pose.mooning, 1);
  const back = RIG.groups.filter((g) => g.showIf === 'mooning');
  assert.ok(back.length >= 2);
  assert.ok(RIG.groups.filter((g) => g.id === 'head' || g.id === 'arms').every((g) => g.hideIf === 'mooning'));
});
