// Auditoria de originalidade (27/11/2026): acha as animações quase iguais a outra (movimento do
// corpo, src/core/repeticao.js) e grava em assets/catalog/originalidade.json:
//   repetidas: as do catálogo que ganham coreografia e palavras na tela próprias;
//   sal: animações cuja combinação sorteada ainda ficou parecida com outra e foi sorteada de novo.
// Repete até não sobrar nenhum par quase igual que possa ser refeito. Rodar ao criar/mudar animações:
//   node scripts/originalidade.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fullCatalog } from '../src/core/catalog/load.js';
import { visuaisComAnimacao } from '../src/core/visual-nivel.js';
import { montarAnimacoes } from '../src/core/conjunto-animacoes.js';
import { vetorMovimento, distancia, recomponivel, LIMITE_REPETICAO } from '../src/core/repeticao.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const catalogo = fullCatalog(read);
const memes = visuaisComAnimacao(read('assets/catalog/progressao.json'));
const refazivel = (n) => recomponivel(n) || /^(visual|memeBr|jogo)_/.test(n);

const estado = { repetidas: [], sal: {} };
const vet = new Map();
const chave = new Map();
for (let rodada = 1; rodada <= 25; rodada++) {
  const anims = montarAnimacoes(read, { originalidade: estado, catalogo, memes });
  const nomes = Object.keys(anims.animations).filter((k) => !k.includes('~'));
  // Só recalcula o vetor do que mudou desde a rodada anterior.
  for (const n of nomes) {
    const k = JSON.stringify(anims.animations[n].tracks) + anims.animations[n].duration;
    if (chave.get(n) !== k) { chave.set(n, k); vet.set(n, vetorMovimento(anims, n)); }
  }
  const pares = [];
  for (let i = 0; i < nomes.length; i++) for (let j = i + 1; j < nomes.length; j++) {
    if (distancia(vet.get(nomes[i]), vet.get(nomes[j]), LIMITE_REPETICAO) < LIMITE_REPETICAO) pares.push([nomes[i], nomes[j]]);
  }
  // Em cada par, refaz a segunda (ou a única refazível); feita à mão nunca muda.
  let mudou = 0;
  const vistos = new Set();
  for (const [a, b] of pares) {
    const alvo = refazivel(b) && !vistos.has(a) ? b : refazivel(a) && !vistos.has(b) ? a : null;
    if (!alvo || vistos.has(alvo)) continue;
    vistos.add(alvo);
    if (recomponivel(alvo) && !estado.repetidas.includes(alvo)) estado.repetidas.push(alvo);
    else estado.sal[alvo] = (estado.sal[alvo] || 0) + 1;
    mudou++;
  }
  const restam = pares.filter(([a, b]) => refazivel(a) || refazivel(b));
  console.log(`rodada ${rodada}: ${pares.length} pares quase iguais (${restam.length} refazíveis); ${mudou} animações refeitas`);
  if (restam.length && restam.length <= 5) console.log('  ', restam.map((p) => p.join(' ~ ')).join('; '));
  if (!mudou) break;
}
estado.repetidas.sort();
const out = {
  notas: 'Gerado por scripts/originalidade.mjs: animações quase iguais a outra (movimento do corpo). As de `repetidas` ganham coreografia e palavras na tela próprias; `sal` sorteia de novo a combinação das que ainda ficavam parecidas (src/core/originalidade.js).',
  limite: LIMITE_REPETICAO,
  repetidas: estado.repetidas,
  sal: Object.fromEntries(Object.entries(estado.sal).sort()),
};
fs.writeFileSync(path.join(ROOT, 'assets/catalog/originalidade.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`${out.repetidas.length} do catálogo refeitas; ${Object.keys(out.sal).length} sorteadas de novo.`);
