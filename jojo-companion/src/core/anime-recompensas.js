// Recompensas em JOJOcoins por assistir anime (25/11/2026). Só a moeda oficial: os valores
// daqui viram créditos na carteira da loja (`Loja.creditar`, ids `anime:*`), que aplica os
// mesmos modificadores e o mesmo teto do dia de todo o resto. Nada de carteira paralela.
//
// Balanceamento (docs/ANIMES.md, scripts/economia-anime-sim.mjs): a loja foi precificada a
// 190 JOJOcoins por hora de uso ATIVO do companion (TAXA_HORA). Assistir é passivo e pode
// durar horas, então a hora de anime rende bem menos: um episódio de 24 min dá 12 (30/h);
// uma temporada de 12 episódios com sequência rende 12×12 + 8 + 40 = 192 (≈ 40/h, o preço
// de um item comum); a obra fechada de vez soma +80. Na simulação de 180 dias o anime fica
// entre 25% e 35% da hora ativa, e a conversa e os cuidados continuam rendendo mais.
// Episódios têm teto diário próprio (300) e os bônus outro (250), dentro do teto geral da loja.

export const RECOMPENSA = Object.freeze({
  curto: 4,            // até 10 min (TV_SHORT, ONAs curtas)
  convencional: 12,    // 11 a 34 min
  longo: 20,           // episódio especial longo (35 a 59 min)
  ova: 16,             // OVA ou especial equivalente (até 59 min)
  filme: 50,           // filme (ou qualquer coisa com 60 min ou mais)
  primeiroEp: 8,      // primeiro episódio de um anime novo para ela (uma vez por anime)
  temporada: 40,       // todos os episódios da temporada registrados (uma vez por temporada)
  serie: 80,          // fim da obra: temporada final concluída, sem sequência (uma vez)
  retomada: 8,        // voltou a um anime parado há 30+ dias e concluiu um episódio
  revisitaFrac: 0.2,   // reassistir: 20% do valor original
});

export const LIMITES_ANIME = Object.freeze({
  tetoDiaEpisodios: 300,  // JOJOcoins de episódios por dia (25 episódios de 24 min)
  tetoDiaBonus: 250,      // JOJOcoins de bônus (primeiro episódio, temporada, série, retomada) por dia
  revisitasDia: 3,        // revisitas com recompensa por dia
  revisitaIntervaloDias: 7, // o mesmo episódio só rende de novo depois de 7 dias
  retomadaDias: 30,       // parado há 30 dias = retomada
  obraLongaEps: 100,      // conquista "obra longa"
  manualMinDia: 480,      // registros manuais (TV/celular) recompensados: até 8 h de tela por 24 h
  manualFolgaMin: 20,     // folga dessa conta
});

/** Categoria da atividade pelo formato e pela duração (minutos) da AniList. */
export function categoria(formato, duracaoMin) {
  const d = Number(duracaoMin) || 0;
  if (formato === 'MOVIE' || d >= 60) return 'filme';
  if (formato === 'OVA' || formato === 'SPECIAL') return 'ova';
  if (formato === 'TV_SHORT' || (d && d <= 10)) return 'curto';
  if (d >= 35) return 'longo';
  return 'convencional';
}

/** Duração presumida quando a fonte não informa (nunca inventada para exibir: só para o limiar). */
export function duracaoPresumida(formato, duracaoMin) {
  if (Number.isInteger(duracaoMin) && duracaoMin > 0) return duracaoMin;
  return { MOVIE: 100, TV_SHORT: 5, OVA: 25, SPECIAL: 25, ONA: 20, MUSIC: 4 }[formato] || 24;
}

/**
 * Tempo efetivo mínimo para concluir (ms). Cerca de 85% do conteúdo, sem obrigar abertura
 * e encerramento: episódios de 20 min ou mais aceitam pular até 4,5 min (abertura + créditos);
 * filmes, até 8 min de créditos.
 */
export function limiarMs(formato, duracaoMin) {
  const d = duracaoPresumida(formato, duracaoMin);
  let min = 0.85 * d;
  if (categoria(formato, d) === 'filme') min = Math.min(min, d - 8);
  else if (d >= 20) min = Math.min(min, d - 4.5);
  return Math.max(1, min) * 60e3;
}

/** JOJOcoins-base de um episódio (antes dos bônus e dos modificadores da loja). */
export function valorBase(formato, duracaoMin) {
  return RECOMPENSA[categoria(formato, duracaoPresumida(formato, duracaoMin))];
}

/** Valor de uma revisita (arredondado para baixo, no mínimo 1). */
export const valorRevisita = (base) => Math.max(1, Math.floor(base * RECOMPENSA.revisitaFrac));

/**
 * Tabela definitiva, para a Central, o relatório e a resposta "quanto eu ganho".
 * `valor` é sempre a base: a carteira pode aplicar o Ímã de JOJOcoins (×1,25) e o teto do dia.
 */
export const TABELA = Object.freeze([
  { id: 'curto', nome: 'Episódio curto (até 10 min)', valor: RECOMPENSA.curto },
  { id: 'convencional', nome: 'Episódio convencional (11–34 min)', valor: RECOMPENSA.convencional },
  { id: 'longo', nome: 'Episódio especial longo (35–59 min)', valor: RECOMPENSA.longo },
  { id: 'ova', nome: 'OVA ou especial', valor: RECOMPENSA.ova },
  { id: 'filme', nome: 'Filme de anime', valor: RECOMPENSA.filme },
  { id: 'primeiroEp', nome: 'Primeiro episódio de um anime novo', valor: RECOMPENSA.primeiroEp, bonus: true },
  { id: 'temporada', nome: 'Conclusão de temporada', valor: RECOMPENSA.temporada, bonus: true },
  { id: 'serie', nome: 'Conclusão de uma série', valor: RECOMPENSA.serie, bonus: true },
  { id: 'retomada', nome: 'Retomar anime parado e concluir episódio', valor: RECOMPENSA.retomada, bonus: true },
  { id: 'revisita', nome: 'Reassistir episódio', valor: '20% do original', bonus: false },
]);

/**
 * Conquistas de anime. Ficam em progressao.json (contas `anime*`), no mesmo sistema das
 * outras conquistas; o valor em JOJOcoins é creditado uma vez por conquista (id `anime:conq:<id>`).
 */
export const CONQUISTAS_ANIME = Object.freeze([
  { id: 'animeEp1', nome: 'Primeiro episódio', desc: 'Assistiu o primeiro episódio com o JoJo', conta: 'animeEps', n: 1, moedas: 20 },
  { id: 'animeEp10', nome: 'Maratonista iniciante', desc: '10 episódios assistidos', conta: 'animeEps', n: 10, moedas: 40 },
  { id: 'animeEp50', nome: 'Otaku de respeito', desc: '50 episódios assistidos', conta: 'animeEps', n: 50, moedas: 100 },
  { id: 'animeEp100', nome: 'Cem episódios', desc: '100 episódios assistidos', conta: 'animeEps', n: 100, moedas: 150 },
  { id: 'animeEp250', nome: 'Veterana do sofá', desc: '250 episódios assistidos', conta: 'animeEps', n: 250, moedas: 300 },
  { id: 'animeEp500', nome: 'Lenda dos animes', desc: '500 episódios assistidos', conta: 'animeEps', n: 500, moedas: 500 },
  { id: 'animeTemp1', nome: 'Primeira temporada', desc: 'Concluiu uma temporada inteira', conta: 'animeTemporadas', n: 1, moedas: 50 },
  { id: 'animeSerie1', nome: 'Primeiro anime concluído', desc: 'Terminou um anime até o fim', conta: 'animeSeries', n: 1, moedas: 60 },
  { id: 'animeSerie5', nome: 'Cinco séries', desc: 'Cinco animes concluídos', conta: 'animeSeries', n: 5, moedas: 200 },
  { id: 'animeSerie10', nome: 'Dez séries', desc: 'Dez animes concluídos', conta: 'animeSeries', n: 10, moedas: 400 },
  { id: 'animeFilme1', nome: 'Noite de cinema', desc: 'Primeiro filme de anime', conta: 'animeFilmes', n: 1, moedas: 40 },
  { id: 'animeGeneros', nome: 'Exploradora de gêneros', desc: 'Episódios de 8 gêneros diferentes', conta: 'animeGeneros', n: 8, moedas: 80 },
  { id: 'animeLonga', nome: 'Obra longa', desc: 'Concluiu uma obra com 100 episódios ou mais', conta: 'animeLongas', n: 1, moedas: 150 },
  { id: 'animeRetomada', nome: 'De volta à história', desc: 'Retomou um anime parado', conta: 'animeRetomadas', n: 1, moedas: 30 },
]);
export const conquistaAnime = (id) => CONQUISTAS_ANIME.find((c) => c.id === id) || null;
