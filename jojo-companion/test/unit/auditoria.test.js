// Auditoria estática das animações (a execução real fica em scripts/auditoria-animacoes.mjs):
// toda animação tem espaço medido (nada cortado) e toda reação tem um caminho natural.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJSON } from './helpers.js';
import { expandCatalog } from '../../src/core/catalog/recipes.js';
import { fullCatalog } from '../../src/core/catalog/load.js';

const catalog = fullCatalog(loadJSON);
const anims = expandCatalog(loadJSON('assets/animations/jojo.animations.json'), catalog).animations;
const room = loadJSON('assets/animations/jojo.room.json').anims;

test('toda animação (as 3 intensidades) tem espaço medido na janela', () => {
  const sem = Object.entries(anims).filter(([n, a]) => n !== 'hidden' && !room[(a.variantOf || n).replace(/~.*$/, '')]).map(([n]) => n);
  assert.deepEqual(sem, []);
  assert.ok(Object.keys(anims).length >= 1000);
});

test('toda reação do catálogo tem gatilho natural (ambiente, frase, evento, pacote ou conversa)', () => {
  const codigo = ['src/core/companion.js', 'src/core/behavior.js', 'src/core/catalog/variety.js', 'src/core/companion-loja.js', 'src/core/loja-anims.js'].map((f) => fs.readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8')).join('\n');
  const orfas = catalog.itens.filter((it) => {
    const g = it.gatilho || {};
    // "usa": reaproveita uma animação feita à mão, tocada pelo próprio estado (wake, eat, comfort…).
    return !it.usa && !it.pacote && !(g.viral || []).length && !(g.timer || []).length && !(g.clima || []).length && !(g.anime || []).length && !(g.monster || []).length && !g.ambiente && !(g.frases || []).length && !(g.eventos || []).length && !(it.eventos || []).length && !g.estado && !new RegExp(`['"\`]${it.id}['"\`]`).test(codigo);
  }).map((it) => it.id);
  assert.deepEqual(orfas, []);
});

test('a auditoria do Windows reconhece todo tipo de gatilho usado no catálogo', () => {
  // O gate "animations" do CI reprova o que ela marca como "só por nome"; ela precisa ler os mesmos campos.
  const script = fs.readFileSync(new URL('../../scripts/auditoria-animacoes.mjs', import.meta.url), 'utf8');
  // "horario" só restringe quando o gatilho ambiente vale; não é um caminho próprio.
  const chaves = new Set(catalog.itens.flatMap((it) => Object.keys(it.gatilho || {})).filter((k) => k !== 'horario'));
  const faltam = [...chaves].filter((k) => !new RegExp(`g\\.${k}\\b`).test(script));
  assert.deepEqual(faltam, []);
});

test('reações recuperadas: o que ela sente na conversa vira expressão do JoJo', async () => {
  const { makeEnv, chatAdv } = await import('./helpers.js');
  for (const [frase, id] of [['que nojo disso', 'nojo'], ['passei vergonha hoje', 'envergonhado'], ['que medo daquele filme', 'assustado'], ['que saco esse trânsito', 'irritadoLeve'], ['tô nervosa com a prova', 'nervoso']]) {
    const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
    e.companion.dateNow = () => new Date(2026, 9, 30, 15);
    e.companion.start();
    e.env.cursor = { x: 5, y: 5 };
    e.clock.advance(3000);
    e.companion.enterInteraction('test');
    await chatAdv(e, frase);
    assert.match(e.companion.behavior.anim || '', new RegExp(`^cat_${id}`), frase);
  }
});
