// Catálogo completo: animações do catálogo + reações dos pacotes (memes, anime,
// comida, namorado, João). `read(rel)` lê um JSON relativo à raiz do app.
import { packItems } from '../pacotes.js';

export function fullCatalog(read) {
  const base = read('assets/catalog/animacoes.json');
  const pacotes = read('assets/catalog/pacotes.json');
  const darkest = read('assets/catalog/darkest-animations.json');
  const needs = read('assets/catalog/needs-animations.json');
  return { ...base, itens: [...base.itens, ...packItems(pacotes), ...darkest.itens, ...needs.itens], pacotes };
}
