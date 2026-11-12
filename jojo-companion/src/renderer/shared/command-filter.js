// Filtro do menu de comandos "/" (chat do pet e Central). Puro: recebe a lista
// do registro central (src/core/conversations.js) e o que ela digitou.
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Comandos que combinam com o que foi digitado. "/" sozinho: todos. Primeiro os
 * que começam com o texto (nome ou apelido), depois os que o contêm no nome,
 * no título ou na descrição curta. Depois do primeiro espaço, só o comando
 * digitado (ela já está escrevendo o argumento).
 */
export function filterCommands(list, typed) {
  const t = norm(typed).trimStart();
  if (!t.startsWith('/')) return [];
  const [palavra, ...resto] = t.split(/\s+/);
  const nomes = (c) => [c.cmd, ...(c.aliases || [])].map(norm);
  if (resto.length) return list.filter((c) => nomes(c).includes(palavra));
  if (palavra === '/') return list.slice();
  const busca = palavra.slice(1);
  const comeca = list.filter((c) => nomes(c).some((n) => n.startsWith(palavra)));
  const contem = list.filter((c) => !comeca.includes(c)
    && (nomes(c).some((n) => n.includes(busca)) || norm(c.label).includes(busca) || norm(c.desc).includes(busca)));
  return [...comeca, ...contem];
}
