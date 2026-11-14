// Escala de XP mostrada à usuária (pedido de 14/11/2026: números ×10, mesmo ritmo).
// As fontes (tarefas, cuidados, Darkest Dungeon) guardam valores nominais e limites
// próprios; a progressão credita valor × escala. Telas e falas que mostram números
// das fontes usam xpVisivel para ficarem na mesma escala da barra de nível.
// Deve ser igual a "escalaXp" em assets/catalog/progressao.json (há teste).
export const XP_ESCALA = 10;
export const xpVisivel = (n) => Math.round((Number(n) || 0) * XP_ESCALA);
