// Originalidade das animações (pedido do João, 27/11/2026): as que se repetiam ganham coreografia
// própria e palavras na tela; nenhuma combinação repete e nenhum texto copia as referências.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJSON } from './helpers.js';
import { BATIDAS, BATIDA_IDS, CLIMAS, FORMATOS, escolherCoreografia, aplicarCoreografia, palavrasPara, palavrasDesbloqueio, climaDe } from '../../src/core/originalidade.js';
import { montarAnimacoes } from '../../src/core/conjunto-animacoes.js';
import { gruposRepetidos, recomponivel, vetorMovimento, distancia, LIMITE_REPETICAO } from '../../src/core/repeticao.js';
import { desenharPalavras, espacoDasPalavras } from '../../src/renderer/shared/palavras-desenho.js';

const ANIMS = montarAnimacoes(loadJSON);
const NOMES = Object.keys(ANIMS.animations).filter((k) => !k.includes('~'));
const SHOWS = NOMES.filter((n) => /^(visual|memeBr|jogo)_/.test(n));

test('batidas: cada movimento começa e termina parado (soma por cima sem tranco) e serve a algum humor', () => {
  assert.ok(BATIDA_IDS.length >= 35);
  for (const id of BATIDA_IDS) {
    const b = BATIDAS[id];
    assert.ok(b.clima.length && b.clima.every((c) => CLIMAS.includes(c)), id);
    for (const u of [0, 1]) for (const [ch, v] of Object.entries(b.f(u, 1.25))) assert.ok(Math.abs(v) < 0.02, `${id}.${ch} em u=${u}: ${v}`);
    const meio = b.f(0.5, 1);
    assert.ok(Object.values(meio).some((v) => Math.abs(v) > 0.05) || Object.values(b.f(0.3, 1)).some((v) => Math.abs(v) > 0.05), `${id}: mexe de verdade`);
  }
  for (const c of CLIMAS) assert.ok(BATIDA_IDS.filter((id) => BATIDAS[id].clima.includes(c)).length >= 6, `${c}: batidas suficientes`);
});

test('coreografia: combinação nunca repete e a soma mantém o começo e o fim da animação', () => {
  const usados = new Set();
  const vistos = new Set();
  for (let i = 0; i < 600; i++) {
    const c = escolherCoreografia(`teste_${i}`, CLIMAS[i % CLIMAS.length], usados);
    const assin = `${c.batidas.join('+')}@${c.forca}`;
    assert.ok(!vistos.has(assin), assin);
    vistos.add(assin);
  }
  const tracks = aplicarCoreografia({ legFL: [[0, 6], [1, 6]] }, { batidas: ['palmas', 'saltoTesoura'], forca: 1 });
  assert.equal(tracks.legFL[0][1], 6);
  assert.equal(tracks.legFL.at(-1)[1], 6);
  assert.ok(tracks.legFL.some(([, v]) => v > 30), 'palmas abrem os braços');
  assert.ok(tracks.rootY.some(([, v]) => v < -10), 'salto tesoura pula');
});

test('palavras na tela: oito formatos próprios, texto do sentido da animação, sem copiar as referências', () => {
  assert.deepEqual([...FORMATOS, 'carimbo'].sort(), ['carimbo', 'grafico', 'grito', 'legenda', 'lousa', 'pensamento', 'placar', 'seta']);
  const textos = [];
  for (const clima of CLIMAS) for (const tipo of FORMATOS) {
    const p = palavrasPara({ id: `x_${clima}_${tipo}`, nome: 'Flexão de bíceps', clima, tipo });
    assert.equal(p.tipo, tipo);
    assert.ok(p.linhas.length && p.linhas.every((l) => typeof l === 'string' && l.length && l.length <= 60), JSON.stringify(p));
    textos.push(...p.linhas);
  }
  const lousa = palavrasPara({ id: 'y', nome: 'Treino de perna', clima: 'energico', tipo: 'lousa' });
  assert.match(lousa.linhas[0], /[=≈≥∝]/, 'fórmula');
  assert.match(lousa.linhas[1], /treino de perna/i, 'explica a própria animação');
  // As referências do pedido (fórmula de outra animação, o "HÃ?") servem de ideia, nunca de texto.
  assert.ok(textos.every((t) => !/\bH[ÃA]\s*\?/i.test(t)), 'sem o HÃ? da referência');
  assert.deepEqual(palavrasDesbloqueio().linhas, ['DESBLOQUEADO', '{nome}']);
  for (const tipo of [...FORMATOS, 'carimbo']) assert.ok(espacoDasPalavras({ tipo }), tipo);
});

test('desenho das palavras: todos os formatos desenham sem erro, nos dois lados e no movimento reduzido', () => {
  const chamadas = [];
  const ctx = new Proxy({ measureText: (s) => ({ width: String(s).length * 5 }) }, {
    get(alvo, k) { if (k in alvo) return alvo[k]; return (...a) => { chamadas.push(k); return a; }; },
    set(alvo, k, v) { alvo[k] = v; return true; },
  });
  ctx.globalAlpha = 1;
  for (const tipo of FORMATOS) for (const lado of [1, -1]) for (const t of [0.25, 0.5, 0.8]) desenharPalavras(ctx, palavrasPara({ id: tipo, nome: 'Teste', clima: 'alegre', tipo }), t, { lado });
  desenharPalavras(ctx, palavrasDesbloqueio({ t0: 0, t1: 1 }), 0.5, { dinamico: { nome: 'Chapéu de palha' } });
  desenharPalavras(ctx, palavrasPara({ id: 'r', nome: 'Teste', clima: 'calmo', tipo: 'lousa' }), 0, { reduzido: true });
  assert.ok(chamadas.includes('fillText'));
});

test('shows, memes BR e jogos: todos com coreografia e palavras próprias; o gesto do meme continua', () => {
  assert.ok(SHOWS.length >= 460, SHOWS.length);
  const assin = new Set();
  for (const n of SHOWS) {
    const a = ANIMS.animations[n];
    assert.ok(a.coreografia?.length >= 2, `${n}: coreografia`);
    assert.ok(FORMATOS.includes(a.palavras?.tipo), `${n}: palavras`);
    assert.equal(a.duration, 6500, n);
    assin.add(a.coreografia.join('+'));
  }
  assert.ok(assin.size >= SHOWS.length * 0.6, `sequências variadas (${assin.size})`);
});

test('lista da auditoria: existe, está em dia e cada animação refeita tem coreografia e palavras', () => {
  const L = loadJSON('assets/catalog/originalidade.json');
  assert.equal(L.limite, LIMITE_REPETICAO);
  assert.ok(L.repetidas.length >= 100);
  for (const n of L.repetidas) {
    assert.ok(recomponivel(n) && ANIMS.animations[n], `${n}: existe e é do catálogo`);
    assert.ok(ANIMS.animations[n].palavras && ANIMS.animations[n].coreografia, n);
    for (const v of ['~suave', '~exagerado']) if (ANIMS.animations[n + v]) assert.ok(ANIMS.animations[n + v].palavras, n + v);
  }
  for (const n of Object.keys(L.sal)) assert.ok(ANIMS.animations[n], `${n}: existe`);
  assert.equal(climaDe({ receita: { humor: { raiva: 0.8 } } }), 'bravo');
  assert.equal(climaDe({ id: 'dormirRonco', nome: 'Dormir roncando' }), 'calmo');
});

test('auditoria de repetição: nenhuma animação refazível fica quase igual a outra', () => {
  const grupos = gruposRepetidos(ANIMS, NOMES);
  const refazivel = (n) => recomponivel(n) || /^(visual|memeBr|jogo)_/.test(n);
  // Só sobram variações feitas à mão do mesmo estado (andar, dormir...), que são o mesmo movimento de propósito.
  const ruins = grupos.filter((g) => g.some(refazivel));
  assert.deepEqual(ruins, [], 'rode node scripts/originalidade.mjs');
  // A distância separa de verdade: um show e outro diferem bem mais que o limite.
  assert.ok(distancia(vetorMovimento(ANIMS, SHOWS[0]), vetorMovimento(ANIMS, SHOWS[1])) >= LIMITE_REPETICAO);
});
