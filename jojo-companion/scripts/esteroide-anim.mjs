// Grava a animação "esteroide" (Êxtase Anabólico) em assets/animations/jojo.animations.json,
// a partir de src/core/esteroide.js. Insere o bloco sem reformatar o resto do arquivo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { animacaoEsteroide } from '../src/core/esteroide.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arq = path.join(ROOT, 'assets/animations/jojo.animations.json');
let txt = fs.readFileSync(arq, 'utf8');
const nova = animacaoEsteroide();
const atual = JSON.parse(txt).animations.esteroide;
if (atual && JSON.stringify(atual) === JSON.stringify(nova)) {
  console.log('esteroide: já atualizada');
} else {
  if (atual) {
    // Tira o bloco antigo (vai de "esteroide": { até o "dildo": { que vem logo depois).
    const i = txt.indexOf('    "esteroide": {');
    const j = txt.indexOf('    "dildo": {', i);
    if (i < 0 || j < 0) throw new Error('bloco esteroide fora do lugar esperado');
    txt = txt.slice(0, i) + txt.slice(j);
  }
  const bloco = JSON.stringify(nova, null, 2).split('\n').map((l, k) => (k ? `    ${l}` : l)).join('\n');
  const marca = '    "dildo": {';
  if (!txt.includes(marca)) throw new Error('animação dildo não encontrada');
  txt = txt.replace(marca, `    "esteroide": ${bloco},\n${marca}`);
  JSON.parse(txt);
  fs.writeFileSync(arq, txt);
  console.log('esteroide: gravada');
}
