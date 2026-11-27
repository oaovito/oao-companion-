// Monta o conjunto final de animações, igual em todo lugar (app, scripts, testes e ferramenta de GIF):
// feitas à mão + catálogo (3 intensidades) + memes/shows/jogos + canais de anime + originalidade
// (coreografia e palavras na tela das que se repetiam, lista em assets/catalog/originalidade.json).
import { expandCatalog } from './catalog/recipes.js';
import { fullCatalog } from './catalog/load.js';
import { comAnimacoesMemes } from './memes-br.js';
import { visuaisComAnimacao } from './visual-nivel.js';
import { comCanaisAnime } from './anime-arte.js';
import { comOriginalidade } from './originalidade.js';

/**
 * @param read (rel) => JSON de um arquivo do app
 * @param o.originalidade lista no formato de assets/catalog/originalidade.json (padrão: o arquivo); false = sem ela
 */
export function montarAnimacoes(read, { originalidade = null, catalogo = null, memes = null } = {}) {
  const cat = catalogo || fullCatalog(read);
  const orig = originalidade === false ? { repetidas: [], sal: {} } : originalidade || lerOriginalidade(read);
  const vis = memes || visuaisComAnimacao(read('assets/catalog/progressao.json'));
  const base = comCanaisAnime(comAnimacoesMemes(expandCatalog(read('assets/animations/jojo.animations.json'), cat), vis, { sal: orig.sal || {} }));
  return comOriginalidade(base, { repetidas: orig.repetidas || [], sal: orig.sal || {}, itens: cat.itens });
}

function lerOriginalidade(read) {
  try { return read('assets/catalog/originalidade.json'); } catch { return { repetidas: [], sal: {} }; }
}
