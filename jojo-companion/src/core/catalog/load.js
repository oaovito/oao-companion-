// Catálogo completo: animações do catálogo + reações dos pacotes (memes, anime,
// comida, namorado, João). `read(rel)` lê um JSON relativo à raiz do app.
import { packItems } from '../pacotes.js';
import { itensVirais } from '../virais.js';
import { itensTimers } from '../timer-anims.js';
import { itensRituais } from '../rituais.js';

export function fullCatalog(read) {
  const base = read('assets/catalog/animacoes.json');
  const pacotes = read('assets/catalog/pacotes.json');
  const darkest = read('assets/catalog/darkest-animations.json');
  const needs = read('assets/catalog/needs-animations.json');
  const living = read('assets/catalog/living-interactions.json');
  const foco = read('assets/catalog/foco-animations.json');
  const discord = read('assets/catalog/discord-animations.json');
  return { ...base, itens: [...base.itens, ...packItems(pacotes), ...darkest.itens, ...needs.itens, ...living.itens, ...foco.itens, ...discord.itens, ...itensVirais(), ...itensTimers(), ...itensRituais()], pacotes, foco: { trocaMin: foco.trocaMin } };
}
