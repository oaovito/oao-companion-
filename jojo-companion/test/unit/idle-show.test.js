// PC parado → senta e cheira pó (ou pré-treino), efeito de 5 min, exibições,
// piadas e o lembrete semanal do Legends.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv, loadJSON, seededRng } from './helpers.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { autoWeights, BehaviorMachine, MOON_IDLE_CHANCE } from '../../src/core/behavior.js';
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
  // Sorteio determinístico e checagem a cada 10 min (com 1×/hora o último
  // horário de domingo podia escapar do teste).
  const rng = seededRng(11);
  for (let d = 0; d < 35; d++) {
    for (let m = 0; m < 24 * 60; m += 10) {
      const date = new Date(2026, 10, 2 + d, 0, m);
      const r = weeklyReminder(date, cfg, rng);
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

test('"vai tomar no cu": vira, mostra o prolapso rebolando ~5 s e desvira', async () => {
  const e = started();
  for (const msg of ['vai tomar no cu', 'VAI TOMAR NO CU JOJO', 'vtnc']) {
    const r = await chatAdv(e, msg);
    assert.equal(r.action, 'moon', msg);
    assert.equal(e.companion.behavior.state, 'moon');
    // chatAdv já avançou ~1,1 s depois do início da animação (7,4 s no total).
    e.clock.advance(5500);
    assert.equal(e.companion.behavior.state, 'moon', 'continua rebolando');
    e.clock.advance(1500);
    assert.notEqual(e.companion.behavior.state, 'moon');
  }
  // A vista de costas troca o desenho: grupos de frente somem, os de costas aparecem.
  const an = new Animator(ANIMS);
  an.play('moon', 0, { restart: true, variant: 'moon' });
  const D = ANIMS.animations.moon.duration;
  assert.equal(an.sample(0).pose.mooning, 0, 'começa de frente');
  const at = (t) => {
    an.play('moon', 0, { restart: true, variant: 'moon' });
    return an.sample(D * t).pose;
  };
  assert.ok(at(0.07).squashX < 0.3, 'virada: achata no meio do giro (tempo em degraus de 12 fps)');
  assert.equal(at(0.5).mooning, 1);
  assert.ok(at(0.215).gagSize > 1.3, 'susto: prolapso salta grande');
  assert.ok(at(0.5).spread > 6, 'mãos abrindo');
  const rots = new Set([0.3, 0.33, 0.36, 0.39].map((t) => Math.sign(at(t).rootRot)));
  assert.ok(rots.has(1) && rots.has(-1), 'rebolando de um lado pro outro');
  assert.equal(at(0.99).mooning, 0, 'desvira no fim');
  assert.ok((0.88 - 0.2) * D >= 4900, 'mostra por ~5 s');
  const back = RIG.groups.filter((g) => g.showIf === 'mooning');
  assert.ok(back.length >= 2);
  assert.ok(RIG.groups.filter((g) => g.id === 'head' || g.id === 'arms').every((g) => g.hideIf === 'mooning'));
});

test('de costas o JoJo continua fisiculturista (memes usam a mesma vista)', () => {
  const back = RIG.groups.filter((g) => g.showIf === 'mooning').flatMap((g) => g.parts.map((p) => p.id));
  for (const id of ['moonTraps', 'moonLats', 'moonSpine', 'moonRearDelt', 'moonTriL', 'moonTriR', 'moonHams', 'moonCalf', 'moonUpperL', 'moonUpperR']) {
    assert.ok(back.includes(id), `falta ${id}`);
  }
  // Costas em V: ombros bem mais largos que a cintura.
  const torso = RIG.groups.flatMap((g) => g.parts).find((p) => p.id === 'moonTorso').path;
  const xs = torso.match(/-?\d+(\.\d+)?,/g).map((s) => parseFloat(s));
  assert.ok(Math.max(...xs) - Math.min(...xs) >= 120, 'ombros largos');
});

test('"eu sou bonita?": cai de costas apaixonado e responde "É" no último suspiro', async () => {
  const e = started();
  const flush = async () => {
    for (let k = 0; k < 16; k++) await Promise.resolve();
  };
  for (const msg of ['eu sou bonita?', 'Sou linda?', 'você me acha bonita?', 'tô bonita hoje?', 'estou linda?']) {
    let done = null;
    e.companion.chat(msg).then((r) => (done = r));
    e.clock.advance(700);
    await flush();
    assert.equal(e.companion.behavior.state, 'smitten', msg);
    assert.equal(done, null, 'ainda não respondeu: está caindo');
    e.clock.advance(3000);
    await flush();
    assert.equal(done, null);
    e.clock.advance(1500);
    await flush();
    assert.ok(done, 'respondeu');
    assert.equal(done.text, 'É.');
    assert.equal(done.action, 'smitten');
    assert.equal(e.companion.behavior.state, 'smitten', 'ainda caído no "É"');
    e.clock.advance(2500);
    await flush();
    assert.notEqual(e.companion.behavior.state, 'smitten', 'volta ao normal');
  }
  for (const msg of ['eu sou feia?', 'você é bonito?']) {
    let r = null;
    e.companion.chat(msg).then((x) => (r = x));
    for (let i = 0; i < 20 && !r; i++) {
      e.clock.advance(300);
      await flush();
    }
    assert.notEqual(r.action, 'smitten', msg);
  }
  // Olhos de coração no começo, em X (😵) caído.
  const an = new Animator(ANIMS);
  const at = (t) => {
    an.play('smitten', 0, { restart: true, variant: 'smitten' });
    return an.sample(6000 * t).pose;
  };
  assert.equal(at(0.1).heartEyes, 1);
  assert.equal(at(0.6).eyeX, 1);
  assert.equal(at(0.6).rootRot, -90, 'caído de costas');
  assert.equal(at(0.99).rootRot, 0, 'levantou');
});

test('em repouso o JoJo nunca fica parado: toda animação de idle se mexe', () => {
  for (const [k, a] of Object.entries(ANIMS.animations)) {
    const base = a.variantOf || k;
    if (!['idle', 'sit', 'lie', 'interactIdle'].includes(base)) continue;
    const moving = Object.entries(a.tracks).filter(([, keys]) => new Set(keys.map((x) => x[1])).size > 1).map(([c]) => c);
    assert.ok(moving.length >= 4, `${k} mexe só ${moving.join(', ')}`);
    for (const ch of ['squashY', 'headRot', 'tailRot']) assert.ok(moving.includes(ch), `${k}: falta ${ch}`);
  }
  // Quadros diferentes ao longo de um ciclo.
  const an = new Animator(ANIMS);
  an.play('idle', 0, { restart: true, variant: 'idle' });
  const poses = [0, 750, 1500, 2250].map((t) => JSON.stringify(an.sample(t + 1).pose));
  assert.equal(new Set(poses).size, 4);
});

test('"eu deveria jogar lol?": caga no chão, pega e oferece dizendo "Passa na cara de uma vez."', async () => {
  const e = started();
  const flush = async () => {
    for (let k = 0; k < 16; k++) await Promise.resolve();
  };
  for (const msg of ['eu deveria jogar lol?', 'Devo jogar LoL?', 'posso jogar league of legends?', 'bora de lol']) {
    let done = null;
    e.companion.chat(msg).then((r) => (done = r));
    e.clock.advance(700);
    await flush();
    assert.equal(e.companion.behavior.state, 'poop', msg);
    e.clock.advance(4000);
    await flush();
    assert.equal(done, null, 'ainda não ofereceu');
    e.clock.advance(1200);
    await flush();
    assert.equal(done && done.text, 'Passa na cara de uma vez.');
    assert.equal(e.companion.behavior.state, 'poop', 'oferecendo');
    e.clock.advance(3000);
    await flush();
    assert.notEqual(e.companion.behavior.state, 'poop', 'volta ao normal');
  }
  const an = new Animator(ANIMS);
  const at = (t) => {
    an.play('poop', 0, { restart: true, variant: 'poop' });
    return an.sample(7000 * t);
  };
  assert.equal(at(0.35).pose.propPoop, 1, 'cocô no chão');
  assert.ok(at(0.2).pose.moodAngry > 0.4, 'vermelho de força');
  assert.equal(at(0.75).pose.poopHand, 1, 'cocô na mão');
  assert.equal(at(0.75).pose.propPoop, 0, 'chão limpo depois de pegar');
  assert.equal(at(0.5).flags.stink, true, 'mau cheiro e moscas');
  const parts = RIG.groups.flatMap((g) => g.parts);
  assert.ok(parts.some((p) => p.showIf === 'propPoop') && parts.some((p) => p.showIf === 'poopHand'));
});

test('"vai tomar no cu" sozinho no repouso: 1 chance em 1 bilhão, sem comando', () => {
  assert.equal(MOON_IDLE_CHANCE, 1e-9);
  // Sorteio abaixo da chance: vira de costas e rebola sozinho.
  let bm = new BehaviorMachine({ rng: () => 0.5, rareRng: () => 0.5e-9 });
  assert.equal(bm.pickAuto({}), 'moon');
  assert.notEqual(bm.pickAuto({ paused: true }), 'moon', 'pausado não');
  // Acima da chance (quase sempre): repouso normal.
  bm = new BehaviorMachine({ rng: seededRng(2), rareRng: () => 1.5e-9 });
  for (let i = 0; i < 500; i++) assert.notEqual(bm.pickAuto({}), 'moon');
  // No companion, com o sorteio raro forçado, o estado moon acontece sem ninguém pedir.
  const e = started();
  e.companion.behavior.rareRng = () => 0;
  let viu = false;
  for (let i = 0; i < 120 && !viu; i++) {
    e.clock.advance(1000);
    viu = e.companion.behavior.state === 'moon';
  }
  assert.ok(viu, 'moon sozinho');
});
