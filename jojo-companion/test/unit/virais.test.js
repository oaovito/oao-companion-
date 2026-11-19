// 50 animações virais (0.47.4): cada uma desenhada, com começo/meio/fim, volta ao JoJo de
// sempre, gerenciador central com preferências e cooldown, gatilhos só por sinais reais,
// nunca no Trabalho/foco/tela cheia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, loadJSON, chatAdv } from './helpers.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { expandCatalog, buildAnimation } from '../../src/core/catalog/recipes.js';
import { fullCatalog } from '../../src/core/catalog/load.js';
import { VIRAIS, itensVirais, rigComVirais, GerenciadorVirais, viralDoTexto, clonesDoViral, pixelDoViral, viralDaAnim, GATILHOS } from '../../src/core/virais.js';
import { sanitize } from '../../src/core/settings-schema.js';

const REPOUSO_BRACO = { legFL: 6, legFR: 6, elbowL: 12, elbowR: 12 };
const RIG = loadJSON('assets/character/jojo.rig.json');
const ANIMS = expandCatalog(loadJSON('assets/animations/jojo.animations.json'), fullCatalog(loadJSON));

test('catálogo: 50 virais únicos, grupos A–D (20/10/10/10), referência, gatilho real e duração', () => {
  assert.equal(VIRAIS.length, 50);
  assert.equal(new Set(VIRAIS.map((v) => v.id)).size, 50);
  assert.equal(new Set(VIRAIS.map((v) => v.chave)).size, 50);
  assert.deepEqual(['A', 'B', 'C', 'D'].map((g) => VIRAIS.filter((v) => v.grupo === g).length), [20, 10, 10, 10]);
  for (const v of VIRAIS) {
    assert.ok(v.referencia && v.nome, v.id);
    assert.ok(v.dur >= 4 && v.dur <= 9, v.id);
    assert.ok(v.gatilhos.length && v.gatilhos.every((g) => GATILHOS.includes(g)), v.id);
  }
  // Adulto e negro só no grupo D (filtros das Configurações).
  assert.ok(VIRAIS.filter((v) => v.adulto || v.negro).every((v) => v.grupo === 'D'));
  assert.equal(VIRAIS.filter((v) => v.adulto).length, 3);
  // Contextos pedidos: jogo, derrota, ocioso, Instagram, tarefa, refeição, erro, fim do trabalho, conquista, procrastinação.
  const de = (g) => VIRAIS.filter((v) => v.gatilhos.includes(g)).map((v) => v.chave);
  assert.ok(de('jogo').includes('gigaChad') && de('jogo').includes('sigma'));
  assert.ok(de('derrota').includes('coffinDance') && de('derrota').includes('sadHamster'));
  assert.ok(de('ocioso').includes('catThinking'));
  assert.ok(de('instagram').includes('sideEyeCat'));
  assert.ok(de('tarefa').includes('absoluteCinema'));
  assert.ok(de('refeicao').includes('droolingCat'));
  assert.ok(de('erro').includes('thisIsFine'));
  assert.ok(de('fimTrabalho').includes('chillGuy'));
  assert.ok(de('conquista').includes('gigaChad'));
  assert.ok(de('procrastinacao').includes('council'));
  for (const k of ['maxwell', 'oiia', 'popCat']) assert.ok(de('lazer').includes(k));
});

test('cada viral é uma animação de verdade: 3 intensidades, peças próprias e volta ao normal', () => {
  const rig = rigComVirais(RIG);
  const canaisRig = new Set();
  const canaisShow = new Set(rig.groups.flatMap((g) => [g.showIf, ...g.parts.map((p) => p.showIf)]).filter(Boolean));
  for (const g of rig.groups) {
    if (g.showIf) canaisRig.add(g.showIf);
    for (const p of g.parts) for (const k of ['showIf', 'scaleBy', 'dx', 'dy']) if (p[k]) canaisRig.add(p[k]);
  }
  const usados = new Set();
  for (const it of itensVirais()) {
    for (const k of ['suave', 'normal', 'exagerado']) assert.ok(ANIMS.animations[`cat_${it.id}${k === 'normal' ? '' : `~${k}`}`], `${it.id} ${k}`);
    const a = buildAnimation(it);
    const proprios = Object.keys(a.tracks).filter((c) => !['jaw', 'eyeOpen', 'browShow', 'brow', 'pupilX', 'pupilY'].includes(c));
    assert.ok(proprios.length >= 3, `${it.id}: movimento próprio`);
    for (const [ch, keys] of Object.entries(a.tracks)) {
      usados.add(ch);
      assert.ok(ch in ANIMS.channels, `${it.id}.${ch} registrado`);
      assert.ok(keys.every(([t]) => t >= 0 && t <= 1), `${it.id}.${ch} tempo`);
      // Tudo que liga desliga: adereços e luz no fim estão desligados; o corpo volta ao repouso.
      const fim = keys.at(-1)[1];
      if ((canaisShow.has(ch) && !ch.startsWith('prop_')) || ch === 'vrCinza' || ch === 'vrAzul') assert.equal(fim, 0, `${it.id}.${ch} no fim`);
      // Quadros próprios terminam no repouso (braços na pose do idle do catálogo: 6 e 12 graus).
      else if (it.faixas[ch] && !ch.startsWith('vr')) assert.ok(fim === ANIMS.channels[ch] || fim === REPOUSO_BRACO[ch], `${it.id}.${ch} volta ao repouso (${fim})`);
    }
    // Começo, meio e fim: no meio está diferente do repouso.
    const an = new Animator(ANIMS); an.play(`cat_${it.id}`, 0, { restart: true });
    const meio = an.sample(it.duracao * 0.5).pose;
    assert.ok(Object.entries(a.tracks).some(([ch]) => Math.abs((meio[ch] ?? 0) - (ANIMS.channels[ch] ?? 0)) > 0.05), `${it.id}: meio diferente`);
  }
  // Toda peça dos virais é ligada por algum canal que alguma animação (ou cópia) usa.
  const viaCopia = new Set(['vr_bastao', 'vr_oculosMini', 'vr_terno']);
  for (const ch of canaisRig) if (/^vr/.test(ch)) assert.ok(usados.has(ch) || viaCopia.has(ch), `canal sem animação: ${ch}`);
  // O rig original não muda; a cópia ganha as peças e as cores (preto e branco, azul).
  assert.ok(!RIG.groups.some((g) => g.id === 'vr_baba'));
  assert.ok(rig.moods.vrCinza && rig.moods.vrAzul);
  assert.equal(rigComVirais(rig), rig, 'aplicar duas vezes não duplica');
});

test('cópias do JoJo (Conselho, Coffin Dance, Horny Jail, espelho) e pixel art do Nyan', () => {
  const id = (k) => VIRAIS.find((v) => v.chave === k).id;
  assert.equal(clonesDoViral(`cat_${id('council')}`, 0.5).length, 4);
  assert.equal(clonesDoViral(`cat_${id('coffinDance')}~suave`, 0.5).length, 4);
  assert.equal(clonesDoViral(`cat_${id('hornyJail')}`, 0.5).length, 1);
  assert.equal(clonesDoViral(`cat_${id('patrickBateman')}`, 0.3)[0].flip, -1);
  assert.deepEqual(clonesDoViral(`cat_${id('council')}`, 0.999), [], 'some no fim');
  assert.deepEqual(clonesDoViral('idle', 0.5), []);
  assert.equal(pixelDoViral(`cat_${id('nyanCat')}`, 0.5), true);
  assert.equal(pixelDoViral(`cat_${id('nyanCat')}`, 0.99), false);
  assert.equal(viralDaAnim('cat_vr12~exagerado'), 'vr12');
  assert.equal(viralDaAnim('cat_vr99'), null);
});

test('gerenciador: preferências, adulto/negro, bloqueadas, cooldown, intervalo e memória', () => {
  let t = 0;
  let cfg = {};
  const g = new GerenciadorVirais({ getConfig: () => cfg, rng: () => 0, now: () => t });
  const id = g.escolher('derrota');
  assert.ok(['coffinDance', 'sadHamster', 'cryingMask', 'pedroPascal'].includes(VIRAIS.find((v) => v.id === id).chave));
  g.registrar(id);
  assert.equal(g.escolher('derrota'), null, 'intervalo mínimo');
  t += 60 * 60e3;
  assert.notEqual(g.escolher('derrota'), id, 'não repete a última');
  // Desligado, adulto, negro e bloqueio.
  cfg = { viraisAtivo: false };
  assert.equal(g.escolher('lazer'), null);
  cfg = { viraisAdulto: false, viraisNegro: false };
  assert.ok(g.candidatos('lazer').every((v) => !v.adulto && !v.negro));
  cfg = { viraisBloqueadas: VIRAIS.filter((v) => v.gatilhos.includes('derrota')).map((v) => v.id) };
  assert.equal(g.escolher('derrota'), null);
  // Cooldown individual.
  cfg = {};
  const u = new GerenciadorVirais({ getConfig: () => cfg, rng: () => 0, now: () => t });
  const unico = u.candidatos('fimTrabalho');
  assert.equal(unico.length, 1);
  u.registrar(unico[0].id);
  t += 30 * 60e3;
  assert.equal(u.escolher('fimTrabalho'), null, 'cooldown de 90 min');
  t += 61 * 60e3;
  assert.equal(u.escolher('fimTrabalho'), unico[0].id);
  // Intensidade e "reduzir efeitos".
  cfg = { viraisIntensidade: 'exagerado' };
  assert.equal(u.intensidade(), 'exagerado');
  cfg = { viraisIntensidade: 'exagerado', viraisReduzir: true };
  assert.equal(u.intensidade(), 'suave');
  // Gatilho que não existe nunca vira animação inventada.
  assert.equal(u.escolher('inventado'), null);
});

test('reduzir efeitos: a versão suave não leva os efeitos pesados', () => {
  const it = itensVirais().find((x) => x.receita.fx.includes('confete'));
  assert.ok(buildAnimation(it, 'normal').fx.includes('confete'));
  assert.ok(!(buildAnimation(it, 'suave').fx || []).includes('confete'));
});

test('configurações persistidas e validadas', () => {
  const { settings } = sanitize({ viraisAtivo: false, viraisFrequencia: 'muita', viraisAdulto: false, viraisNegro: false, viraisReduzir: true, viraisIntensidade: 'suave', viraisBloqueadas: ['vr01', 'vr01', 'xx', 3] });
  assert.equal(settings.viraisAtivo, false);
  assert.equal(settings.viraisFrequencia, 'muita');
  assert.equal(settings.viraisReduzir, true);
  assert.equal(settings.viraisIntensidade, 'suave');
  assert.deepEqual(settings.viraisBloqueadas, ['vr01']);
  const d = sanitize({}).settings;
  assert.equal(d.viraisAtivo, true);
  assert.deepEqual(d.viraisBloqueadas, []);
  assert.equal(sanitize({ viraisFrequencia: 'absurda' }).settings.viraisFrequencia, 'normal');
});

function iniciado(settings = {}) {
  const e = makeEnv({ settings: { speechFrequency: 'off', ...settings }, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.clock.advance(3000);
  return e;
}

test('companion: toca por sinal real; nunca no Trabalho, foco ou tela cheia; interrompível', () => {
  const e = iniciado();
  const c = e.companion;
  try {
    c.virais.rng = () => 0;
    c.startWork();
    assert.equal(c._viral('derrota'), false, 'Modo Trabalho');
    c.endWork();
    c.virais.ultimoViral = -Infinity;
    c.startFocus(25, 'estudo');
    assert.equal(c._viral('derrota'), false, 'foco');
    c._endFocus(false);
    c.fullscreenHidden = true;
    assert.equal(c._viral('derrota'), false, 'tela cheia');
    c.fullscreenHidden = false;
    e.clock.advance(5000);
    c.virais.ultimoViral = -Infinity;
    assert.equal(c._viral('derrota'), true);
    assert.match(c.behavior.anim || '', /^cat_vr\d{2}/);
    // Interrompido, volta ao normal (o estado sai do viral).
    c.behavior.request('nod', { now: e.clock.now(), force: true });
    assert.doesNotMatch(c.behavior.anim || '', /^cat_vr/);
    // Desligado nas Configurações: nada.
    c.store.update({ viraisAtivo: false });
    c.virais.ultimoViral = -Infinity;
    assert.equal(c._viral('derrota'), false);
  } finally {
    c.stop();
  }
});

test('companion: derrotas seguidas no mini-jogo chamam o viral de derrota', () => {
  const e = iniciado();
  const c = e.companion;
  try {
    c.virais.rng = () => 0;
    const chamados = [];
    const orig = c._viral.bind(c);
    c._viral = (g, o) => { chamados.push(g); return orig(g, o); };
    c._finishGame(false, 'Perdeu.');
    c._finishGame(false, 'Perdeu de novo.');
    e.clock.advance(2000);
    assert.ok(chamados.includes('derrota'));
  } finally {
    c.stop();
  }
});

test('chat: o nome do meme toca a animação dele', async () => {
  for (const [t, k] of [['absolute cinema', 'absoluteCinema'], ['JoJo, faz o maxwell', 'maxwell'], ['this is fine', 'thisIsFine'], ['kekw', 'kekw']]) assert.equal(viralDoTexto(t)?.chave, k, t);
  for (const t of ['vou ao cinema hoje', 'o maxwell da faculdade ligou', 'tá tudo bem com você?']) assert.equal(viralDoTexto(t), null, t);
  const e = iniciado();
  try {
    e.companion.enterInteraction('test');
    await chatAdv(e, 'absolute cinema');
    assert.match(e.companion.behavior.anim || '', /^cat_vr26/);
  } finally {
    e.companion.stop();
  }
});
