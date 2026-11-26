// Gera os ícones das latas de Monster do cardápio (assets/foods/<id>.svg) a partir da
// geometria-mestre em src/core/monster.js. Rodar depois de mudar a arte das latas.
//   node scripts/monster-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SABORES, svgLata } from '../src/core/monster.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const s of SABORES) fs.writeFileSync(path.join(ROOT, 'assets', 'foods', `${s.id}.svg`), svgLata(s.id));
console.log(`${SABORES.length} latas geradas em assets/foods.`);
