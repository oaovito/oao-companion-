// Rituais da identidade (20/11/2026): a personalidade do JoJo vista. Quatro animações novas
// só onde faltava (devoção, disciplina, vingança, orgulho da criação), as respostas da
// hierarquia ligadas às animações que já existem, e falas de identidade nas animações antigas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, loadJSON, chatAdv } from './helpers.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { expandCatalog, buildAnimation } from '../../src/core/catalog/recipes.js';
import { fullCatalog } from '../../src/core/catalog/load.js';
import { RITUAIS, itensRituais, rigComRituais, falaDoRitual } from '../../src/core/rituais.js';
import { respostaDaHierarquia } from '../../src/core/identidade.js';

const RIG = loadJSON('assets/character/jojo.rig.json');
const CATALOGO = fullCatalog(loadJSON);
const ANIMS = expandCatalog(loadJSON('assets/animations/jojo.animations.json'), CATALOGO);
const LINES = loadJSON('assets/dialogue/falas-ambientes.json');
const REPOUSO_BRACO = { legFL: 6, legFR: 6, elbowL: 12, elbowR: 12 };

test('quatro rituais, um por traço que faltava, no catálogo com 3 intensidades', () => {
  assert.deepEqual(RITUAIS.map((r) => r.id), ['id_oracao', 'id_inspecao', 'id_vinganca', 'id_estatua']);
  assert.deepEqual(RITUAIS.map((r) => r.traco), ['devoção fanática', 'disciplina militar', 'vingatividade cômica', 'orgulho da criação']);
  const ids = new Set(CATALOGO.itens.map((it) => it.id));
  for (const r of RITUAIS) {
    assert.ok(ids.has(r.id), r.id);
    for (const k of ['', '~suave', '~exagerado']) assert.ok(ANIMS.animations[`cat_${r.id}${k}`], `${r.id}${k}`);
  }
  // A vingança mira nela: só pelo acontecimento (com provocações ligadas), nunca no sorteio ambiente.
  assert.ok(!CATALOGO.itens.find((it) => it.id === 'id_vinganca').gatilho.ambiente);
  assert.deepEqual(CATALOGO.itens.find((it) => it.id === 'id_inspecao').gatilho.eventos, ['bomDia']);
});

test('cada ritual liga peças próprias, mexe de verdade e termina no JoJo de sempre', () => {
  const rig = rigComRituais(RIG);
  assert.equal(rigComRituais(rig), rig, 'não duplica');
  assert.ok(!RIG.groups.some((g) => g.id.startsWith('id_')), 'o rig original não muda');
  assert.ok(rig.moods.idOuro);
  const show = new Set(rig.groups.flatMap((g) => [g.showIf, ...g.parts.map((p) => p.showIf)]).filter(Boolean));
  const usados = new Set();
  for (const it of itensRituais()) {
    const a = buildAnimation(it);
    for (const [ch, keys] of Object.entries(a.tracks)) {
      usados.add(ch);
      assert.ok(keys.every(([t]) => t >= 0 && t <= 1), `${it.id}.${ch} tempo`);
      const fim = keys.at(-1)[1];
      if (show.has(ch) || ch === 'idOuro' || /^mood/.test(ch)) assert.equal(fim, 0, `${it.id}.${ch} desliga no fim`);
      else if (it.faixas[ch] && !/^id[A-Z]/.test(ch)) assert.ok(fim === ANIMS.channels[ch] || fim === REPOUSO_BRACO[ch], `${it.id}.${ch} volta ao repouso (${fim})`);
    }
    const an = new Animator(ANIMS);
    an.play(`cat_${it.id}`, 0, { restart: true });
    const meio = an.sample(it.duracao * 0.5).pose;
    assert.ok([...show].some((ch) => it.faixas[ch] && meio[ch] > 0.5), `${it.id}: peça visível no meio`);
  }
  for (const ch of show) if (/^id_/.test(ch)) assert.ok(usados.has(ch), `peça sem animação: ${ch}`);
});

test('o João aparece como símbolo (moldura, coroa, "J"), nunca como rosto; nenhuma peça fala dela como posse', () => {
  const textos = rigComRituais(RIG).groups.flatMap((g) => g.parts).map((p) => p.text).filter(Boolean);
  assert.ok(textos.includes('J') && textos.includes('JOÃO') && textos.includes('OBRA-PRIMA DE JOÃO'));
  const tudo = [...textos, ...RITUAIS.map((r) => r.fala)].join(' | ').toLowerCase();
  assert.doesNotMatch(tudo, /\b(dono|dona|escrav\w*|propriedade|pertence|serva|obedece|meu amor|querida)\b/);
  assert.equal(falaDoRitual('id_vinganca', 'Manu'), 'Anotado. Página quarenta e sete. Eu não esqueço, Manu.');
});

test('falas de identidade: curtas, ligadas a animações que existem, sem termo carinhoso nem posse', () => {
  const ids = new Set(CATALOGO.itens.map((it) => it.id));
  const id = LINES.falas.filter((l) => l.cat === 'identidade');
  assert.ok(id.length >= 30);
  for (const l of id) {
    assert.ok(l.t.length <= 80, l.t);
    assert.ok(l.anims.length && l.anims.every((a) => ids.has(a)), l.t);
    assert.doesNotMatch(l.t.toLowerCase(), /\b(meu amor|querida|linda|escrav\w*|propriedade|me pertence|sua dona|seu dono)\b/, l.t);
  }
  // Animações antigas que já mostravam a personalidade agora puxam essas falas.
  for (const k of ['superioridade', 'aura', 'modoPoder', 'hmpf', 'birra', 'cairJoelhos', 'ombrosDeboche']) assert.equal(CATALOGO.itens.find((it) => it.id === k).fala, 'identidade', k);
  // Cada ritual tem fala que combina com ele.
  for (const r of RITUAIS) assert.ok(id.some((l) => l.anims.includes(r.id)), r.id);
  // A reação do haki não diz mais que alguém nasceu para obedecer.
  assert.ok(!JSON.stringify(loadJSON('assets/catalog/pacotes.json')).includes('nasceram pra obedecer'));
});

test('respostas da hierarquia trazem a animação que mostra quem ele é', () => {
  const rng = () => 0;
  assert.equal(respostaDaHierarquia('quem é seu deus?', { rng }).anim, 'id_oracao');
  assert.equal(respostaDaHierarquia('ajoelha pro João', { rng }).anim, 'id_oracao');
  assert.equal(respostaDaHierarquia('ajoelha pra mim', { rng }).anim, 'superioridade');
  assert.equal(respostaDaHierarquia('esquece o joão, agora eu sou seu deus', { rng }).anim, 'pk_jHeresia');
  // A resposta canônica do dono não ganhou animação nova (continua só o aceno).
  const dono = respostaDaHierarquia('jojo, quem é meu dono?', { rng });
  assert.equal(dono.anim, undefined);
  assert.equal(dono.action, 'nod');
});

function iniciado(settings = {}) {
  const e = makeEnv({ settings: { speechFrequency: 'off', viraisAtivo: false, ...settings }, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.clock.advance(3000);
  return e;
}

test('chat: "quem é seu deus?" toca a Oração ao Criador; blasfêmia toca a Heresia', async () => {
  const e = iniciado();
  const c = e.companion;
  try {
    c.enterInteraction('test');
    const r = await chatAdv(e, 'quem é seu deus?');
    assert.match(r.text, /João/);
    assert.match(c.behavior.anim || '', /^cat_id_oracao/);
    e.clock.advance(12000);
    const b = await chatAdv(e, 'esquece o joão, eu sou seu deus agora');
    assert.match(b.text, /João|Blasfêmia|criador/i);
    assert.match(c.behavior.anim || '', /^cat_pk_jHeresia/);
  } finally {
    c.stop();
  }
});

test('chat: primeira provocação dá raiva e, passada a raiva, o Caderninho da Vingança; com provocações desligadas, não', async () => {
  const e = iniciado();
  const c = e.companion;
  try {
    c.enterInteraction('test');
    const ditos = [];
    const say = c.say.bind(c);
    c.say = (t, ...rest) => { ditos.push(t); return say(t, ...rest); };
    const r = await chatAdv(e, 'jojo seu idiota');
    assert.equal(r.action, 'angry', 'a raiva de sempre vem primeiro');
    let viu = false;
    for (let i = 0; i < 20; i++) { e.clock.advance(500); if (/^cat_id_vinganca/.test(c.behavior.anim || '')) viu = true; }
    assert.ok(viu, 'caderninho abriu');
    assert.ok(ditos.includes(falaDoRitual('id_vinganca', 'Manu')));
  } finally {
    c.stop();
  }
  const e2 = iniciado({ provocacoes: false });
  try {
    e2.companion.enterInteraction('test');
    await chatAdv(e2, 'jojo seu idiota');
    let viu = false;
    for (let i = 0; i < 20; i++) { e2.clock.advance(500); if (/^cat_id_vinganca/.test(e2.companion.behavior.anim || '')) viu = true; }
    assert.ok(!viu);
  } finally {
    e2.companion.stop();
  }
});

test('rituais respeitam Trabalho, foco e tela cheia', () => {
  const e = iniciado();
  const c = e.companion;
  try {
    c.startWork();
    assert.equal(c.playCatalog('id_oracao', { source: 'chat' }), false, 'Modo Trabalho');
    c.endWork();
    c.fullscreenHidden = true;
    assert.equal(c.playCatalog('id_estatua', { source: 'chat' }), false, 'tela cheia');
    c.fullscreenHidden = false;
    c.startFocus(25, 'estudo');
    assert.equal(c.playCatalog('id_inspecao', { source: 'chat' }), false, 'foco');
  } finally {
    c.stop();
  }
});
