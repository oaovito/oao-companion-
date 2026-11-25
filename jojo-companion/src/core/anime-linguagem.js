// Pedidos de anime em linguagem natural (25/11/2026). Determinístico e local: reconhece o
// que ela quer, tira o nome do anime da frase e compara com a lista dela e com apelidos
// conhecidos, tolerando erro de digitação. O modelo de linguagem não decide nada disto.
//
// Exemplos do pedido: "Jojo, me avisa quando sair Black Clover", "Adiciona Haikyuu na minha
// lista", "Me avisa meia hora antes", "Só quero notificações da versão dublada", "Quais
// animes que eu acompanho saem hoje?", "Vou assistir um episódio agora", "Acabei de assistir",
// "Quantas JOJOcoins eu ganho assistindo esse anime?", "Quero continuar de onde parei".

export const normAnime = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’'`´]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Apelidos e nomes brasileiros → nome que a AniList entende. A chave já está normalizada.
 * "jojo" sozinho é o próprio companion: só vira o anime com "bizarre", "jojos" ou "anime do jojo".
 */
export const APELIDOS = Object.freeze({
  kimetsu: 'Kimetsu no Yaiba', 'kimetsu no yaiba': 'Kimetsu no Yaiba', 'demon slayer': 'Kimetsu no Yaiba', kny: 'Kimetsu no Yaiba',
  snk: 'Shingeki no Kyojin', shingeki: 'Shingeki no Kyojin', aot: 'Shingeki no Kyojin', 'attack on titan': 'Shingeki no Kyojin', 'ataque dos titas': 'Shingeki no Kyojin',
  jjk: 'Jujutsu Kaisen', jujutsu: 'Jujutsu Kaisen',
  mha: 'Boku no Hero Academia', bnha: 'Boku no Hero Academia', 'boku no hero': 'Boku no Hero Academia', 'my hero': 'Boku no Hero Academia', 'my hero academia': 'Boku no Hero Academia',
  hxh: 'Hunter x Hunter', 'hunter hunter': 'Hunter x Hunter',
  dbz: 'Dragon Ball Z', dbs: 'Dragon Ball Super', 'dragon ball daima': 'Dragon Ball Daima', daima: 'Dragon Ball Daima',
  csm: 'Chainsaw Man', 'homem motosserra': 'Chainsaw Man',
  frieren: 'Sousou no Frieren', 'sousou no frieren': 'Sousou no Frieren',
  'solo leveling': 'Ore dake Level Up na Ken', 'ore dake level up': 'Ore dake Level Up na Ken',
  'cavaleiros do zodiaco': 'Saint Seiya', cdz: 'Saint Seiya',
  'jojos bizarre adventure': "JoJo's Bizarre Adventure", 'jojo bizarre adventure': "JoJo's Bizarre Adventure", jojos: "JoJo's Bizarre Adventure", 'anime do jojo': "JoJo's Bizarre Adventure",
  haikyu: 'Haikyuu!!', haikyuu: 'Haikyuu!!',
  'one piece': 'One Piece', 'black clover': 'Black Clover', naruto: 'Naruto', 'naruto shippuden': 'Naruto: Shippuuden', boruto: 'Boruto',
  'spy family': 'Spy x Family', 'spy x family': 'Spy x Family', dandadan: 'Dandadan', 'dan da dan': 'Dandadan',
  'kaiju 8': 'Kaijuu 8-gou', 'kaiju n 8': 'Kaijuu 8-gou', 'kaiju no 8': 'Kaijuu 8-gou',
  opm: 'One Punch Man', 'one punch': 'One Punch Man', 'blue lock': 'Blue Lock', 'tokyo ghoul': 'Tokyo Ghoul', 'death note': 'Death Note',
  'fullmetal': 'Fullmetal Alchemist: Brotherhood', fmab: 'Fullmetal Alchemist: Brotherhood', 'sword art online': 'Sword Art Online', sao: 'Sword Art Online',
  'oshi no ko': 'Oshi no Ko', 'mushoku tensei': 'Mushoku Tensei', 'tensura': 'Tensei Shitara Slime Datta Ken', 'slime': 'Tensei Shitara Slime Datta Ken',
});

const NUMEROS = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, quinze: 15, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50 };

/** "meia hora" → 30, "1 hora" → 60, "15 minutos" → 15, "um dia" → 1440, "uma semana" → 10080. */
export function antecedencia(n) {
  if (/\bmeia hora\b/.test(n)) return 30;
  const m = n.match(/\b(\d{1,3}|um|uma|dois|duas|tres|quatro|cinco|seis|dez|quinze|vinte|trinta|quarenta|cinquenta)\s*(min|minutos?|h|horas?|dias?|semanas?|mes|meses)\b/);
  if (!m) {
    if (/\bum dia antes\b|\bna vespera\b|\bdia anterior\b/.test(n)) return 1440;
    if (/\buma semana antes\b/.test(n)) return 10080;
    if (/\bum mes antes\b/.test(n)) return 43200;
    return null;
  }
  const q = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMEROS[m[1]];
  const u = m[2];
  if (/^min/.test(u)) return q;
  if (/^h/.test(u)) return q * 60;
  if (/^dia/.test(u)) return q * 1440;
  if (/^semana/.test(u)) return q * 10080;
  return q * 43200;
}

/** Minutos de antecedência → tipo de alerta (os fixos da lista; outro valor vira personalizado). */
export function tipoDeAntecedencia(min) {
  return { 43200: 'mes', 10080: 'semana', 1440: 'dia', 180: 'h3', 60: 'h1', 30: 'm30', 15: 'm15', 5: 'm5', 0: 'horario' }[min] || `c${min}`;
}

const VOCATIVO = /^(?:ei |oi |e ai )?jojo\b[ ,]*/;
const RESTO = /\s+(?:pra mim|para mim|por favor|pfv|pf|na minha lista|na lista|nos meus animes|no calendario|no meu calendario|ai|tambem)\s*$/;
function limparNome(s) {
  let x = String(s || '').trim();
  for (let i = 0; i < 3; i++) x = x.replace(RESTO, '').trim();
  x = x.replace(/^(?:o|a|os|as|do|da|de|anime|o anime|a temporada nova de|a nova temporada de|nova temporada de|episodio novo de|o episodio novo de|o proximo episodio de|proximo episodio de|o novo episodio de)\s+/, '').trim();
  return x.replace(/\s+(?:sair|lancar|lancarem|estrear)$/, '').trim();
}

/**
 * Intenção de anime na frase (ou null). Devolve { tipo, nome?, minutos?, versao?, episodio?, quando? }.
 * `nome` vem limpo (sem "Jojo," e sem "na minha lista"); ausente = usar o anime do contexto.
 */
export function intencaoAnime(texto) {
  let n = normAnime(texto).replace(VOCATIVO, '').trim();
  if (!n || n.length > 220) return null;
  const ctx = /\b(esse|este|desse|deste|dele|nesse|neste) anime\b|\bdele\b/.test(n);
  const ep = (() => { const m = n.match(/\bepisodio (\d{1,5})\b|\bep (\d{1,5})\b/); return m ? Number(m[1] || m[2]) : null; })();
  let m;
  // Recompensas.
  if (/\b(quanto|quantas?)\b.*\b(ja )?(ganhei|recebi|consegui|faturei)\b.*\b(anime|hoje|episodio)/.test(n) || /\b(quanto|quantas?)\b.*\bjojocoins?\b.*\b(ganhei|recebi)\b/.test(n)) return { tipo: 'quantoGanhei' };
  if (/\b(quanto|quantas?)\b.*\b(ganho|vou ganhar|ganharia|rende|vale|da)\b/.test(n) && /\b(assist|anime|episodio|jojocoin)/.test(n)) {
    m = n.match(/\b(?:assistindo|assistir|com|de|do)\s+(?!esse|este|anime\b)(.+)$/);
    return { tipo: 'quantoGanho', nome: !ctx && m ? limparNome(m[1].replace(/\b(esse|este) anime\b/, '')) || null : null, episodio: ep };
  }
  // Sessão.
  if (/\b(quero )?(continuar|retomar) (de onde parei|o anime|o episodio|a sessao)\b|\bde onde (eu )?parei\b/.test(n)) return { tipo: 'continuar' };
  if (/\b(acabei de assistir|terminei de assistir|terminei o episodio|terminei o ep|acabei o episodio|terminei|acabei|ja assisti|assisti)\b/.test(n) && !/\?$/.test(String(texto).trim()) && !/\b(sair|lancar)\b/.test(n)) {
    m = n.match(/\b(?:assisti|terminei de assistir|acabei de assistir)\s+(?:o episodio \d+ de |o ep \d+ de |o episodio \d+ do |o \d+ de |o filme de |o filme )?(.+)$/) || n.match(/\b(?:terminei|acabei|assisti)\s+(?:o |um )?(?:episodio|ep)(?: \d+)?\s+(?:de|do|da)\s+(.+)$/);
    const nome = m && !/^(o episodio|o ep|agora|ja|esse|este)\b/.test(m[1]) ? limparNome(m[1].replace(/\b(agora|na tv|no celular|ontem|hoje)\b.*$/, '')) : null;
    const fora = /\b(na tv|na televisao|no celular|no tablet|em outro|fora do pc|ontem)\b/.test(n);
    return { tipo: 'terminei', nome: nome && nome.length >= 2 ? nome : null, episodio: ep, fora };
  }
  if (/\b(vou|vamos|bora) (assistir|ver)\b|\b(comecar|comecei|comecando) (a )?(assistir|ver)\b|\b(to|tou|estou) (assistindo|vendo)\b|\binicia(r)? (a )?sessao\b/.test(n)) {
    m = n.match(/\b(?:assistir|ver|assistindo|vendo)\s+(?:um episodio de |o episodio \d+ de |o proximo de |o ep \d+ de |um ep de )?(.+?)(?:\s+agora)?$/);
    const nome = m && !/^(um episodio|o episodio|um ep|anime|agora|o proximo|esse|este)\b/.test(m[1]) ? limparNome(m[1]) : null;
    return { tipo: 'iniciar', nome: nome && nome.length >= 2 ? nome : null, episodio: ep };
  }
  if (/\b(pausa|pausar|pausei) (o anime|a sessao|o episodio)\b|^(pausei|pausa o anime)$/.test(n)) return { tipo: 'pausar' };
  if (/\b(voltei pro|voltei ao|despausa|retoma) (o anime|a sessao|o episodio)\b/.test(n)) return { tipo: 'retomar' };
  // Consultas de calendário.
  if (/\b(quais|que|qual|o que|tem) (animes? )?(que eu acompanho |que eu sigo |dos meus )?(sai|saem|lanca|lancam|estreia|tem)\b.*\b(hoje|amanha|semana)\b/.test(n) || /\banimes? (de|da) (hoje|amanha|semana)\b/.test(n) || /\btem (algum )?(episodio|anime)s? (novo )?(hoje|amanha|essa semana|nesta semana)\b/.test(n)) {
    return { tipo: 'agenda', quando: /\bamanha\b/.test(n) ? 'amanha' : /\bsemana\b/.test(n) ? 'semana' : 'hoje' };
  }
  if (/\b(quais|que) animes? (eu )?(ainda )?(tenho|falta|faltam) (pra|para) assistir\b|\bepisodios? (acumulados|atrasados|pendentes)\b|\bo que (eu )?(ainda )?falta assistir\b/.test(n)) return { tipo: 'pendentes' };
  if ((m = n.match(/\b(?:que horas|quando|qual dia|que dia)\s+(?:sai|lanca|estreia|passa|vai sair)\s+(?:o (?:proximo |novo )?episodio(?: \d+)?(?: de| do| da)?\s*)?(.*)$/))) {
    const nome = limparNome(m[1]);
    return { tipo: 'quando', nome: nome && !/^(ele|esse|este)$/.test(nome) ? nome : null };
  }
  if (/\b(contagem|contador|cronometro|relogio)\b/.test(n) && /\b(anime|episodio|ep|lancamento|sair)\b|\b(pro|para o|para|do|de) (proximo )?(episodio|anime)\b/.test(n) || /\b(contagem|contador) (regressiva |regressivo )?(pro|para o|para|do|de)\s+(?!proximo episodio\b)(.{2,60})$/.test(n)) {
    m = n.match(/\b(?:pro|para o|para|do|de|da)\s+(?:o )?(?:proximo )?(?:episodio (?:de|do|da) )?(.{2,60})$/);
    const nome = m ? limparNome(m[1]) : null;
    return { tipo: 'contador', nome: nome && !/^(episodio|proximo episodio|anime|lancamento|sair)$/.test(nome) ? nome : null };
  }
  // Preferências de alerta.
  if (/\b(so|somente|apenas) (quero )?(as )?(notificac\w+|avisos?|alertas?)?\s*(da |do )?(versao )?(dublad\w+)\b|\bso (o )?dublado\b/.test(n)) return { tipo: 'versao', versao: 'dub', nome: null };
  if (/\b(so|somente|apenas) (quero )?(as )?(notificac\w+|avisos?|alertas?)?\s*(da |do )?(versao )?(legendad\w+)\b|\bso (o )?legendado\b/.test(n)) return { tipo: 'versao', versao: 'leg', nome: null };
  if (/\b(dublado e legendado|legendado e dublado|as duas versoes|ambas as versoes)\b/.test(n)) return { tipo: 'versao', versao: 'ambos', nome: null };
  if (/\b(me )?(avisa|lembra|avise|lembre|notifica)\b.*\b(nova temporada|temporada nova|proxima temporada|anunciarem)\b/.test(n)) {
    m = n.match(/\b(?:temporada nova|nova temporada|proxima temporada)\s+(?:de|do|da)\s+(.+)$/);
    return { tipo: 'novaTemporada', nome: m ? limparNome(m[1]) : null };
  }
  if (/\b(disponivel|chegar|chegou) no brasil\b/.test(n)) return { tipo: 'disponivelBR' };
  const min = /\bantes\b/.test(n) && /\b(avisa|lembra|avise|lembre|notifica|alerta)\b/.test(n) ? antecedencia(n) : null;
  if (min != null) {
    m = n.match(/\bantes\s+(?:de|do|da)\s+(?:lancar|sair|estrear)?\s*(.+)$/);
    const nome = m ? limparNome(m[1]) : null;
    return { tipo: 'alertaAntes', minutos: min, nome: nome && nome.length >= 2 && !/^(lancar|sair|estrear|o episodio|ele)$/.test(nome) ? nome : null };
  }
  if ((m = n.match(/^(?:silencia|silenciar|muta|para de me avisar d[eoa]|nao me avisa mais d[eoa])\s+(?!os animes|tudo|animes?\b)(.{2,80})$/))) {
    const nome = limparNome(m[1].replace(/\s+(?:por|ate|hoje)\b.*$/, ''));
    return { tipo: 'silenciar', nome, minutos: antecedencia(n.replace(/\bpor\b/, '')) || null };
  }
  if (/\b(silencia|silenciar|para de me avisar|nao me avisa|sem avisos?)\b.*\banimes?\b/.test(n)) {
    const h = antecedencia(n.replace(/\bpor\b/, '')) || (/\bhoje\b/.test(n) ? 'hoje' : 24 * 60);
    return { tipo: 'silenciar', minutos: h };
  }
  if ((m = n.match(/\b(?:para de seguir|pare de seguir|deixa de acompanhar|deixar de acompanhar|para de acompanhar|tira|remove)\s+(?:o anime\s+)?(.+?)(?:\s+da (?:minha )?lista)?$/)) && (/\blista\b|\banime\b|\bseguir\b|\bacompanhar\b/.test(n))) return { tipo: 'parar', nome: limparNome(m[1]) };
  if ((m = n.match(/\b(?:favorita|favoritar|poe nos favoritos|coloca nos favoritos)\s+(?:o anime\s+)?(.+)$/))) return { tipo: 'favoritar', nome: limparNome(m[1]) };
  if (/\b(abre|abrir|mostra|mostrar) (o )?calendario (de |dos )?animes?\b|\bmeus animes\b$/.test(n)) return { tipo: 'abrir' };
  if (/\bresumo (dos |de )?animes?\b|\bcomo (estao|tao) (os )?meus animes\b|\bresumo (de )?anime (de|do) (hoje|dia)\b/.test(n)) return { tipo: 'resumo' };
  // Seguir (por último: "me avisa quando sair X" e afins).
  if ((m = n.match(/\b(?:me )?(?:avisa|lembra|avise|lembre|notifica)\s+(?:quando|assim que)\s+(?:sair|lancar|estrear|passar|tiver)\s+(?:episodio novo |o proximo episodio |um episodio novo |o episodio |a temporada nova |nova temporada )?(?:de |do |da )?(.+)$/))) return { tipo: 'seguir', nome: limparNome(m[1]) };
  if ((m = n.match(/\b(?:adiciona|adicione|coloca|bota|poe|inclui)\s+(?:o anime\s+)?(.+?)\s+(?:na|nos|no) (?:minha |meus )?(?:lista|animes|calendario)\b/))) return { tipo: 'seguir', nome: limparNome(m[1]) };
  if ((m = n.match(/^(?:segue|siga|acompanha|acompanhe|quero acompanhar|vou acompanhar)\s+(?:o anime\s+)?(.{2,80})$/))) return { tipo: 'seguir', nome: limparNome(m[1]) };
  return null;
}

// ---------------------------------------------------------------- nomes

/** Distância de edição com transposição (Damerau–Levenshtein restrita). */
export function distancia(a, b, max = 4) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let menor = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      menor = Math.min(menor, d[i][j]);
    }
    if (menor > max) return max + 1;
  }
  return d[a.length][b.length];
}

const tolerancia = (len) => (len >= 10 ? 3 : len >= 6 ? 2 : len >= 4 ? 1 : 0);

/** Nomes de um anime para comparação (título, romaji, inglês, sinônimos). */
export const nomesDe = (a) => [a.titulo, a.romaji, a.english, ...(a.sinonimos || [])].map(normAnime).filter((x) => x.length >= 2);

/** Nota de semelhança entre o que ela escreveu e um nome (0 = nada; 1 = igual). */
export function semelhanca(q, nome) {
  if (!q || !nome) return 0;
  if (q === nome) return 1;
  if (nome.startsWith(q) && q.length >= 4) return 0.92;
  if (q.length >= 5 && nome.includes(q)) return 0.85;
  const d = distancia(q, nome, 4);
  if (d <= tolerancia(Math.min(q.length, nome.length))) return 0.8 - d * 0.08;
  // Erro de digitação só no começo do nome ("blak clover" em "black clover: ...").
  const pref = nome.slice(0, q.length + 1);
  const dp = Math.min(distancia(q, pref, 3), distancia(q, nome.slice(0, q.length), 3));
  if (q.length >= 6 && dp <= tolerancia(q.length) - 1) return 0.7 - dp * 0.05;
  return 0;
}

/** Animes da lista que batem com o nome, do melhor para o pior. */
export function acharNaLista(nome, lista) {
  const q = normAnime(nome);
  if (!q) return [];
  const alvo = APELIDOS[q] ? normAnime(APELIDOS[q]) : null;
  return (lista || []).map((a) => {
    const ns = nomesDe(a);
    let nota = Math.max(0, ...ns.map((n) => semelhanca(q, n)));
    if (alvo) nota = Math.max(nota, ...ns.map((n) => semelhanca(alvo, n)));
    return { anime: a, nota };
  }).filter((x) => x.nota >= 0.6).sort((x, y) => y.nota - x.nota);
}

/** Nome a mandar para a busca da fonte (apelido corrigido ou o nome como ela escreveu). */
export function nomeParaBusca(nome) {
  const q = normAnime(nome);
  if (APELIDOS[q]) return APELIDOS[q];
  // Erro de digitação num apelido conhecido ("kimetssu", "haikiu").
  let melhor = null;
  for (const k of Object.keys(APELIDOS)) {
    if (k.length < 5) continue;
    const d = distancia(q, k, 3);
    if (d <= tolerancia(k.length) && (!melhor || d < melhor.d)) melhor = { k, d };
  }
  return melhor ? APELIDOS[melhor.k] : String(nome).trim().slice(0, 80);
}

/**
 * Resultados da fonte que valem como opção. Um só resultado claramente melhor → escolhido;
 * vários plausíveis (franquias com temporadas, filmes) → opções para ela escolher.
 */
export function escolherResultado(nome, resultados) {
  const q = normAnime(nomeParaBusca(nome));
  const notas = (resultados || []).map((m, i) => ({ m, nota: Math.max(0, ...nomesDe(m).map((n) => semelhanca(q, n))) + (i === 0 ? 0.05 : 0) }));
  const bons = notas.filter((x) => x.nota >= 0.6).sort((a, b) => b.nota - a.nota);
  if (!bons.length) return resultados?.length ? { opcoes: resultados.slice(0, 4) } : { nada: true };
  const [a, b] = bons;
  if (!b || a.nota - b.nota >= 0.12 || normAnime(a.m.titulo) === q || normAnime(a.m.romaji) === q) {
    // Mesmo nome exato em várias entradas (temporadas): prefere a em exibição, senão a mais recente.
    const iguais = bons.filter((x) => x.nota >= a.nota - 0.01);
    if (iguais.length > 1) {
      const emExibicao = iguais.find((x) => x.m.status === 'RELEASING');
      if (emExibicao) return { escolhido: emExibicao.m };
      return { opcoes: iguais.slice(0, 4).map((x) => x.m) };
    }
    return { escolhido: a.m };
  }
  return { opcoes: bons.slice(0, 4).map((x) => x.m) };
}

/** Resposta de desambiguação: "1", "o segundo", "o filme", ou o nome de uma das opções. */
export function escolhaDaResposta(texto, opcoes) {
  const n = normAnime(texto);
  const ord = { primeiro: 1, primeira: 1, segundo: 2, segunda: 2, terceiro: 3, terceira: 3, quarto: 4, quarta: 4 };
  const m = n.match(/^(?:o |a |opcao |numero )?(\d|primeir[oa]|segund[oa]|terceir[oa]|quart[oa])$/);
  if (m) { const i = (Number(m[1]) || ord[m[1]]) - 1; return opcoes[i] || null; }
  if (/\bfilme\b/.test(n)) { const f = opcoes.filter((o) => o.formato === 'MOVIE'); if (f.length === 1) return f[0]; }
  const ach = acharNaLista(n, opcoes);
  return ach.length && (ach.length === 1 || ach[0].nota - ach[1].nota >= 0.1) ? ach[0].anime : null;
}
