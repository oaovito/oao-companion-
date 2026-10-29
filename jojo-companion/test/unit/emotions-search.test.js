// Variações de animação, cor por emoção e pesquisa na internet para perguntas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv, loadJSON } from './helpers.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { RigRenderer, mixHex } from '../../src/renderer/shared/rig-renderer.js';
import { STATES } from '../../src/core/behavior.js';
import { WebSearch, isFactualQuestion, extractQuery, tidyExtract, isBlockedQuestion } from '../../src/core/dialogue/web-search.js';
import { DialogueEngine } from '../../src/core/dialogue/engine.js';

const ANIMS = loadJSON('assets/animations/jojo.animations.json');
const RIG = loadJSON('assets/character/jojo.rig.json');

function started(opts) {
  const e = makeEnv(opts);
  e.companion.start();
  e.clock.advance(2000);
  return e;
}

// ------------------------------------------------------------ animações

test('animações: o dobro da v0.8 (33) e as mais comuns com 3–4 variações', () => {
  const an = new Animator(ANIMS);
  assert.ok(Object.keys(ANIMS.animations).length >= 66, `total ${Object.keys(ANIMS.animations).length}`);
  for (const name of ['idle', 'walk', 'talk', 'happy', 'judge', 'lecture', 'angry']) {
    assert.ok(an.variantsOf(name).length >= 4, `${name}: ${an.variantsOf(name).length}`);
  }
  for (const name of ['interactIdle', 'sit', 'sleep', 'run', 'lookAround', 'curious', 'wave', 'nod', 'comfort', 'petted', 'sad']) {
    assert.ok(an.variantsOf(name).length >= 3, `${name}: ${an.variantsOf(name).length}`);
  }
});

test('variações: mesma duração/repetição da base, canais conhecidos e quadros ordenados', () => {
  for (const [key, a] of Object.entries(ANIMS.animations)) {
    for (const [ch, keys] of Object.entries(a.tracks || {})) {
      assert.ok(ch in ANIMS.channels, `${key}.${ch} não é canal`);
      for (let i = 1; i < keys.length; i++) assert.ok(keys[i][0] >= keys[i - 1][0], `${key}.${ch} fora de ordem`);
      assert.ok(keys[keys.length - 1][0] <= 1);
    }
    if (!a.variantOf) continue;
    const base = ANIMS.animations[a.variantOf];
    assert.ok(base, `${key}: base ${a.variantOf} inexistente`);
    assert.equal(!!a.loop, !!base.loop, `${key}: loop diferente da base`);
    if (!base.loop) assert.equal(a.duration, base.duration, `${key}: duração diferente da base (o estado usa a da base)`);
  }
  // Toda animação usada pelos estados existe.
  for (const [st, def] of Object.entries(STATES)) {
    for (const ph of [...def.phases, def.exit].filter(Boolean)) assert.ok(ANIMS.animations[ph.anim], `${st} → ${ph.anim}`);
  }
});

test('animator sorteia variações sem repetir a anterior e troca nas que repetem', () => {
  let s = 1;
  const an = new Animator(ANIMS, { rng: () => ((s = (s * 16807) % 2147483647) / 2147483647) });
  const seen = new Set();
  let prev = null;
  for (let i = 0; i < 40; i++) {
    an.play('talk', i * 1000, { restart: true });
    assert.equal(an.current.name, 'talk', 'nome lógico continua o da base');
    assert.notEqual(an.current.variant, prev);
    prev = an.current.variant;
    seen.add(prev);
  }
  const normal = an.variantsOf('talk').filter((k) => !ANIMS.animations[k].mode);
  assert.equal(seen.size, normal.length, 'todas as variações normais aparecem');
  assert.ok(![...seen].some((k) => ANIMS.animations[k].mode), 'variações "ligadão" só no modo');
  // idle troca de variação a cada 2 ciclos.
  an.play('idle', 0, { restart: true });
  const first = an.current.variant;
  an.sample(6100);
  assert.notEqual(an.current.variant, first);
  assert.equal(an.current.name, 'idle');
});

// ------------------------------------------------------------ cor por emoção

function tintOf(pose) {
  const fake = { rig: RIG };
  RigRenderer.prototype._applyMoods.call(fake, pose);
  return fake.tinted || RIG.palette;
}
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const sat = (h) => {
  const c = rgb(h);
  return Math.max(...c) - Math.min(...c);
};

test('cor por emoção: raiva avermelha, tristeza acinzenta, sem emoção mantém a paleta', () => {
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080');
  assert.deepEqual(tintOf({}), RIG.palette);
  const angry = tintOf({ moodAngry: 0.85 }).body;
  const [r0, , b0] = rgb(RIG.palette.body);
  const [r1, , b1] = rgb(angry);
  assert.ok(r1 > r0 + 40 && r1 > b1, `raiva: ${angry}`);
  const sad = tintOf({ moodSad: 0.8 }).body;
  assert.ok(sat(sad) < sat(RIG.palette.body) / 2, `tristeza: ${sad}`);
  assert.ok(b0 > 0);
});

test('emoção coerente: raiva/bronca vermelhas, tristeza/acolhimento cinzas, alegria sem raiva', () => {
  const an = new Animator(ANIMS);
  const pose = (key) => {
    an.play(key, 0, { restart: true, variant: key });
    return an.sampleStatic().pose;
  };
  for (const k of Object.keys(ANIMS.animations)) {
    const base = ANIMS.animations[k].variantOf || k;
    const p = pose(k);
    if (['angry', 'lecture', 'judge', 'scare'].includes(base)) assert.ok(p.moodAngry > 0.2, `${k} devia ficar avermelhado`);
    if (['sad', 'comfort'].includes(base)) assert.ok(p.moodSad > 0.3, `${k} devia ficar acinzentado`);
    if (['happy', 'petted', 'wave', 'eat', 'play'].includes(base)) assert.ok(!(p.moodAngry > 0) && !(p.moodSad > 0), `${k} sem raiva/tristeza`);
  }
});

test('xingamento → raiva; rejeição → tristeza; Instagram reincidente → raiva', async () => {
  const e = started();
  let r = await chatAdv(e, 'você é chato, idiota');
  assert.equal(r.action, 'angry');
  assert.equal(e.companion.behavior.state, 'angry');
  e.clock.advance(4000);
  r = await chatAdv(e, 'não gosto de você');
  assert.equal(r.action, 'sad');
  assert.equal(e.companion.behavior.state, 'sad');

  const e2 = started({ profile: { instagram: { ativo: true, intervaloMinSeg: 10 } } });
  const cats = [];
  const orig = e2.companion.sayCategory.bind(e2.companion);
  e2.companion.sayCategory = (c, o) => {
    cats.push(c);
    return orig(c, o);
  };
  for (let i = 0; i < 3; i++) {
    e2.companion.onForeground({ instagram: true });
    e2.clock.advance(15000);
    e2.companion.onForeground({ instagram: false });
    e2.clock.advance(1000);
  }
  assert.deepEqual(cats.filter((c) => c.startsWith('instagram')), ['instagram', 'instagram', 'instagramAngry']);
});

// ------------------------------------------------------------ pesquisa

test('pergunta de conhecimento x conversa: o que vai para a pesquisa', () => {
  for (const q of ['o que é fotossíntese?', 'quem foi Santos Dumont', 'qual a capital da Austrália?', 'quantas horas devo dormir?', 'por que o céu é azul?', 'JoJo, você sabe quem inventou o avião?', 'como funciona um motor?']) {
    assert.equal(isFactualQuestion(q), true, q);
  }
  for (const q of ['oi', 'vamos brincar?', 'consegui!', 'quer comer?', 'tô triste']) assert.equal(isFactualQuestion(q), false, q);
  assert.equal(extractQuery('o que é fotossíntese?'), 'fotossíntese');
  assert.equal(extractQuery('Quem foi Santos Dumont?'), 'Santos Dumont');
  assert.equal(extractQuery('JoJo, você sabe o que é uma estrela de nêutrons?'), 'estrela de nêutrons');
  assert.equal(extractQuery('qual é a capital da Austrália?'), 'capital da Austrália');
  assert.equal(isBlockedQuestion('como usar cocaína?'), true);
  assert.equal(isBlockedQuestion('o que é cocaína?'), false);
  assert.equal(tidyExtract('Paris (pronúncia: [paʁi]) é a capital da França. Tem muitos museus. ' + 'x'.repeat(300), 80), 'Paris é a capital da França. Tem muitos museus.');
});

function fakeFetch(routes, calls = []) {
  return async (url) => {
    calls.push(url);
    for (const [re, body] of routes) {
      if (re.test(url)) {
        if (body instanceof Error) throw body;
        return { ok: true, status: 200, json: async () => body };
      }
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
}

const WIKI_OK = { query: { pages: { 1: { index: 1, title: 'Fotossíntese', extract: 'Fotossíntese é o processo pelo qual plantas convertem luz em energia química. Ocorre nos cloroplastos.', fullurl: 'https://pt.wikipedia.org/wiki/Fotoss%C3%ADntese' } } } };

test('WebSearch: Wikipédia primeiro, DuckDuckGo de reserva, erro quando a rede falha', async () => {
  const calls = [];
  let ws = new WebSearch({ fetch: fakeFetch([[/w\/api\.php/, WIKI_OK]], calls) });
  let r = await ws.search('o que é fotossíntese?');
  assert.equal(r.source, 'Wikipédia');
  assert.match(r.extract, /cloroplastos/);
  assert.match(calls[0], /gsrsearch=fotoss%C3%ADntese/);

  ws = new WebSearch({ fetch: fakeFetch([[/w\/api\.php/, { query: {} }], [/duckduckgo/, { AbstractText: 'Canberra é a capital da Austrália.', AbstractSource: 'Wikipedia', Heading: 'Canberra' }]]) });
  r = await ws.search('qual a capital da Austrália?');
  assert.match(r.extract, /Canberra/);

  // Entre os resultados, escolhe o que cita mais palavras da pergunta.
  ws = new WebSearch({ fetch: fakeFetch([[/w\/api\.php/, { query: { pages: {
    1: { index: 1, title: 'Austrália', extract: 'Austrália é um país da Oceania.' },
    2: { index: 2, title: 'Canberra', extract: 'Canberra é a capital da Austrália.' },
  } } }]]) });
  r = await ws.search('qual a capital da Austrália?');
  assert.equal(r.title, 'Canberra');

  ws = new WebSearch({ fetch: fakeFetch([[/./, new Error('offline')]]) });
  await assert.rejects(() => ws.search('quem foi Santos Dumont?'), /offline/);

  ws = new WebSearch({ fetch: fakeFetch([[/w\/api\.php/, { query: {} }], [/duckduckgo/, {}]]) });
  assert.equal(await ws.search('o que é xyzzyqwerty?'), null);
});

function withSearch(e, routes, calls = []) {
  e.companion.dialogue.search = new WebSearch({ fetch: fakeFetch(routes, calls) });
  return calls;
}

test('pergunta sem resposta programada: pesquisa e responde no jeito do JoJo, com a fonte', async () => {
  const e = started();
  withSearch(e, [[/w\/api\.php/, WIKI_OK]]);
  const r = await chatAdv(e, 'o que é fotossíntese?');
  assert.equal(r.intent, 'web');
  assert.match(r.text, /cloroplastos/);
  assert.match(r.text, /\(Fonte: Wikipédia\)/);
  assert.ok(r.text.length <= 400);
  assert.ok(!/\{\w+\}/.test(r.text), 'variáveis substituídas');
  const st = e.companion.conversations.get(r.conversationId).status;
  assert.ok(['ready', 'needsInput'].includes(st));
});

test('pesquisa respeita o perfil: sem palavrões quando o perfil proíbe', async () => {
  const e = started({ profile: { palavroes: 'nenhum', humorDrogas: false } });
  withSearch(e, [[/w\/api\.php/, WIKI_OK]]);
  for (let i = 0; i < 12; i++) {
    const r = await chatAdv(e, 'o que é fotossíntese?');
    assert.ok(!/porra|caralho|cocaína/i.test(r.text), r.text);
  }
});

test('sem internet: avisa e marca a conversa como bloqueada', async () => {
  const e = started();
  withSearch(e, [[/./, new Error('offline')]]);
  const r = await chatAdv(e, 'quem foi Santos Dumont?');
  assert.match(r.text, /internet/i);
  const c = e.companion.conversations.get(r.conversationId);
  assert.equal(c.status, 'blocked');
  assert.match(c.detail, /Pesquisa na internet falhou/);
});

test('pesquisa desligada, conversa comum, crise e pedido contra as diretrizes não acessam a rede', async () => {
  const e = started();
  const calls = withSearch(e, [[/w\/api\.php/, WIKI_OK]]);
  for (const msg of ['oi', 'vamos brincar?', 'consegui', 'como usar cocaína?']) await chatAdv(e, msg);
  const crisis = await chatAdv(e, 'tô em crise, o que eu faço?');
  assert.match(crisis.text, /João/);
  assert.equal(calls.length, 0);
  e.store.update({ webSearch: false });
  const r = await chatAdv(e, 'o que é fotossíntese?');
  assert.notEqual(r.intent, 'web');
  assert.equal(calls.length, 0);
});

test('engine: describe informa se a pesquisa está ativa', () => {
  let on = true;
  const eng = new DialogueEngine({ search: {}, searchEnabled: () => on });
  assert.equal(eng.describe().webSearch, true);
  on = false;
  assert.equal(eng.describe().webSearch, false);
});

test('pesquisa: Wikipédia e DuckDuckGo começam juntas (resposta mais rápida)', async () => {
  const { WebSearch } = await import('../../src/core/dialogue/web-search.js');
  const started = [];
  let release;
  const gate = new Promise((r) => (release = r));
  const ws = new WebSearch({
    fetch: async (url) => {
      started.push(url);
      await gate;
      return { ok: true, status: 200, json: async () => ({}) };
    },
  });
  const p = ws.search('o que é fotossíntese?').catch(() => null);
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(started.some((u) => /wikipedia/.test(u)) && started.some((u) => /duckduckgo/.test(u)), started.join(' | '));
  release();
  await p;
});

test('dormir antes das 21h: JoJo fica furioso e recusa; depois das 21h é permitido e ele reafirma', async () => {
  const { detectIntent, ScriptedProvider } = await import('../../src/core/dialogue/scripted-provider.js');
  for (const t of ['vou dormir', 'tô com sono', 'que tal uma soneca?', 'vou tirar um cochilo', 'hora de ir pra cama', 'quantas horas devo dormir?', 'jojo vai dormir', 'to sonolenta']) {
    assert.equal(detectIntent(t), 'sleep', t);
  }
  assert.notEqual(detectIntent('isso é sonoro'), 'sleep');
  const tarde = new ScriptedProvider({ now: () => new Date(2026, 9, 29, 15) });
  let r = await tarde.reply({ text: 'vou dormir agora' });
  assert.equal(r.action, 'angry');
  assert.ok(!r.search, 'não pesquisa: reage');
  for (const h of [21, 23, 2, 5]) {
    const noite = new ScriptedProvider({ now: () => new Date(2026, 9, 29, h) });
    r = await noite.reply({ text: 'vou dormir agora' });
    assert.equal(r.action, 'boaNoite', `${h}h`);
    assert.match(r.text, /permitid|cama|lei|Dorm/i, r.text);
    r = await noite.reply({ text: 'going to sleep now' });
    assert.equal(r.action, 'boaNoite', `${h}h (inglês)`);
  }
  r = await new ScriptedProvider({ now: () => new Date(2026, 9, 29, 6) }).reply({ text: 'tô com sono' });
  assert.equal(r.action, 'angry', '6h já é dia de novo');
});

test('inglês quando necessário: entende e responde em inglês; português continua o padrão', async () => {
  const { isEnglish } = await import('../../src/core/dialogue/english.js');
  const { detectIntent, ScriptedProvider } = await import('../../src/core/dialogue/scripted-provider.js');
  assert.equal(isEnglish('how are you today?'), true);
  assert.equal(isEnglish('hello'), true);
  assert.equal(isEnglish('oi jojo, tudo bem?'), false);
  assert.equal(isEnglish('o que é fotossíntese?'), false);
  assert.equal(isEnglish('vou ao shopping'), false);
  // Segurança também em inglês (João + CVV 188), sempre programada.
  assert.equal(detectIntent('i want to kill myself'), 'crisis');
  assert.equal(detectIntent('i am crying so much'), 'sad');
  assert.equal(detectIntent('i am going to sleep'), 'sleep');
  const sp = new ScriptedProvider({ rng: () => 0 });
  let r = await sp.reply({ text: 'i want to kill myself' });
  assert.match(r.text, /\{apoio\}/);
  assert.match(r.text, /188/);
  assert.equal(r.lang, 'en');
  r = await sp.reply({ text: 'how are you?' });
  assert.equal(r.lang, 'en');
  r = await sp.reply({ text: 'what is photosynthesis?' });
  assert.equal(r.search, true);
  r = await sp.reply({ text: 'tudo bem?' });
  assert.equal(r.lang, undefined);
});

test('docinho: "e se eu comer um docinho?" (e variações) → nojo e "Quer se tornar uma aberração?"', async () => {
  const { detectIntent, ScriptedProvider } = await import('../../src/core/dialogue/scripted-provider.js');
  for (const t of ['e se eu comer um docinho?', 'E se eu comer um docinho', 'posso comer um chocolate?', 'vou comer um brigadeiro', 'to com vontade de comer um doce', 'comi um bolo', 'can i eat a candy?']) {
    assert.equal(detectIntent(t), 'docinho', t);
  }
  assert.notEqual(detectIntent('estou com fome'), 'docinho');
  const r = await new ScriptedProvider().reply({ text: 'e se eu comer um docinho?' });
  assert.equal(r.text, 'Quer se tornar uma aberração?');
  assert.equal(r.action, 'nojo');
});
