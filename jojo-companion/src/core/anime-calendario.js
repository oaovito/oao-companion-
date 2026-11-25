// Calendário de anime (pedido de 18/11/2026; ampliado em 25/11/2026, ver docs/ANIMES.md): ela segue os animes que assiste e, quando sai
// episódio novo, o JoJo cumprimenta com um visual ligado ao anime. Fonte: AniList (API
// GraphQL pública, grátis, sem login nem chave). O animeschedule.net exige um token por
// aplicativo que não pode ir num app público, por isso não é usado. Só saem para a internet
// o nome buscado (ao seguir) e os ids dos animes seguidos; nada do PC.

export const ANILIST = 'https://graphql.anilist.co';
export const ANIME_MAX = 40;
const AVISADOS_MAX = 400;
// Episódio que saiu há mais de 3 dias não vira cumprimento (ela já viu ou o PC ficou desligado).
const JANELA_S = 3 * 86400;

const BUSCA = 'query($s:String){Page(perPage:5){media(search:$s,type:ANIME,sort:[POPULARITY_DESC]){id title{romaji english} status coverImage{color} nextAiringEpisode{episode airingAt}}}}';
const AGENDA = 'query($ids:[Int],$desde:Int,$ate:Int){ja:Page(perPage:50){airingSchedules(mediaId_in:$ids,airingAt_greater:$desde,airingAt_lesser:$ate,sort:TIME){mediaId episode airingAt}} prox:Page(perPage:50){media(id_in:$ids){id nextAiringEpisode{episode airingAt}}}}';

export const normTitulo = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/** Lista salva: só ids inteiros, títulos curtos e cor #rrggbb; no máximo ANIME_MAX. */
export function sanitizeAnimes(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  const vistos = new Set();
  for (const a of v) {
    const id = Number(a?.id);
    if (!Number.isInteger(id) || id <= 0 || vistos.has(id)) continue;
    const titulo = String(a.titulo || '').slice(0, 120).trim();
    if (!titulo) continue;
    vistos.add(id);
    out.push({ id, titulo, romaji: String(a.romaji || '').slice(0, 120), english: String(a.english || '').slice(0, 120), cor: /^#[0-9a-f]{6}$/i.test(a.cor) ? a.cor : null });
    if (out.length >= ANIME_MAX) break;
  }
  return out;
}

export function sanitizeAvisados(v) {
  return Array.isArray(v) ? [...new Set(v.filter((k) => typeof k === 'string' && /^\d+:\d+$/.test(k)))].slice(-AVISADOS_MAX) : [];
}

// Campos de um anime pedidos à AniList (todos públicos; nada da usuária sai).
const CAMPOS = 'id idMal title{romaji english native} synonyms format status episodes duration genres averageScore tags{name rank isMediaSpoiler} season seasonYear startDate{year month day} endDate{year month day} coverImage{large medium color} siteUrl countryOfOrigin isAdult externalLinks{site url type language} nextAiringEpisode{episode airingAt} relations{edges{relationType node{id type format status title{romaji english} startDate{year month day}}}}';
const BUSCA_COMPLETA = `query($s:String){Page(perPage:8){media(search:$s,type:ANIME,sort:[SEARCH_MATCH,POPULARITY_DESC]){${CAMPOS}}}}`;
const DETALHES = `query($ids:[Int]){Page(perPage:50){media(id_in:$ids,type:ANIME){${CAMPOS}}}}`;
const JANELA = `query($desde:Int,$ate:Int,$p:Int){Page(page:$p,perPage:50){pageInfo{hasNextPage} airingSchedules(airingAt_greater:$desde,airingAt_lesser:$ate,sort:TIME){mediaId episode airingAt media{${CAMPOS}}}}}`;

// Sites oficiais de streaming aceitos para o botão "Assistir agora" (só https, só estes
// domínios; o link nunca abre sozinho). Capa só do CDN da AniList.
export const STREAMING_OK = Object.freeze(['crunchyroll.com', 'netflix.com', 'primevideo.com', 'amazon.com', 'disneyplus.com', 'starplus.com', 'max.com', 'hbomax.com', 'hidive.com', 'youtube.com', 'globoplay.globo.com', 'bilibili.tv', 'funimation.com', 'tv.apple.com', 'paramountplus.com', 'adn.com', 'animeonegai.com']);
const CAPA_OK = ['s4.anilist.co', 'img.anili.st'];
const FORMATOS = new Set(['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC']);
const STATUS = new Set(['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS']);

/** Texto externo vira texto curto e inerte (sem controle, sem marcação, tamanho limitado). */
export function textoSeguro(v, max = 120) {
  return String(v ?? '').replace(/[\u0000-\u001f\u007f<>{}`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** URL https de um domínio permitido (ou null). */
export function urlSegura(v, dominios) {
  try {
    const u = new URL(String(v || ''));
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    const h = u.hostname.toLowerCase();
    return dominios.some((d) => h === d || h.endsWith(`.${d}`)) ? u.toString().slice(0, 400) : null;
  } catch { return null; }
}

const int = (v, min = 0, max = 1e9) => (Number.isInteger(v) && v >= min && v <= max ? v : null);
const dataAni = (d) => (d && int(d.year, 1900, 2200) ? Date.UTC(d.year, (int(d.month, 1, 12) || 1) - 1, int(d.day, 1, 31) || 1) : null);

/**
 * Anime da AniList validado e reduzido ao que o app usa. Dados externos nunca viram
 * instrução: só textos curtos, números inteiros, enums conhecidos e URLs permitidas.
 * Devolve null se a estrutura não for a esperada (mudança na fonte não derruba nada).
 */
export function mediaSegura(m) {
  const id = int(m?.id, 1);
  if (!id || (m.title && typeof m.title !== 'object')) return null;
  const romaji = textoSeguro(m.title?.romaji);
  const english = textoSeguro(m.title?.english);
  const nativo = textoSeguro(m.title?.native, 80);
  const titulo = english || romaji || nativo;
  if (!titulo) return null;
  const sinonimos = [...new Set((Array.isArray(m.synonyms) ? m.synonyms : []).map((s) => textoSeguro(s, 80)).filter(Boolean))].slice(0, 12);
  const links = [];
  for (const l of Array.isArray(m.externalLinks) ? m.externalLinks : []) {
    if (l?.type !== 'STREAMING') continue;
    const url = urlSegura(l.url, STREAMING_OK);
    if (!url) continue;
    const idioma = textoSeguro(l.language, 24);
    links.push({ site: textoSeguro(l.site, 40), url, idioma: idioma || null });
    if (links.length >= 10) break;
  }
  const relacoes = [];
  for (const e of m.relations?.edges || []) {
    const n = e?.node;
    if (!n || n.type !== 'ANIME' || !['SEQUEL', 'PREQUEL', 'PARENT', 'SIDE_STORY'].includes(e.relationType) || !int(n.id, 1)) continue;
    relacoes.push({ tipo: e.relationType, id: n.id, formato: FORMATOS.has(n.format) ? n.format : null, status: STATUS.has(n.status) ? n.status : null, titulo: textoSeguro(n.title?.english || n.title?.romaji), inicio: dataAni(n.startDate) });
    if (relacoes.length >= 12) break;
  }
  const prox = m.nextAiringEpisode && int(m.nextAiringEpisode.episode, 0, 100000) != null && int(m.nextAiringEpisode.airingAt, 1, 1e11) ? { episodio: m.nextAiringEpisode.episode, quando: m.nextAiringEpisode.airingAt * 1000 } : null;
  return {
    id, titulo, romaji, english, nativo, sinonimos,
    formato: FORMATOS.has(m.format) ? m.format : null,
    status: STATUS.has(m.status) ? m.status : null,
    episodios: int(m.episodes, 1, 100000),
    duracao: int(m.duration, 1, 600),
    generos: (Array.isArray(m.genres) ? m.genres : []).map((g) => textoSeguro(g, 24)).filter(Boolean).slice(0, 10),
    nota: int(m.averageScore, 0, 100),
    tags: (Array.isArray(m.tags) ? m.tags : []).filter((t) => t && typeof t.name === 'string').slice(0, 20).map((t) => ({ nome: textoSeguro(t.name, 32), rank: int(t.rank, 0, 100), spoiler: t.isMediaSpoiler === true })).filter((t) => t.nome),
    temporada: ['WINTER', 'SPRING', 'SUMMER', 'FALL'].includes(m.season) ? m.season : null,
    ano: int(m.seasonYear, 1900, 2200),
    inicio: dataAni(m.startDate), fim: dataAni(m.endDate),
    capa: urlSegura(m.coverImage?.large || m.coverImage?.medium, CAPA_OK),
    cor: /^#[0-9a-f]{6}$/i.test(m.coverImage?.color) ? m.coverImage.color.toLowerCase() : null,
    pais: textoSeguro(m.countryOfOrigin, 4) || null,
    adulto: m.isAdult === true,
    links, relacoes, proximo: prox,
  };
}

/** Erro com o tipo de falha (o agendador decide a espera por ele). */
class FonteErro extends Error {
  constructor(msg, { status = 0, retryMs = 0 } = {}) { super(msg); this.status = status; this.retryMs = retryMs; }
}

export class AnimeCalendario {
  constructor({ fetch, now = () => Date.now(), timeoutMs = 12000, log = () => {} } = {}) {
    this.fetch = fetch;
    this.now = now;
    this.timeoutMs = timeoutMs;
    this.log = log;
    // Disjuntor: depois de falhas seguidas a fonte descansa (15 min, dobrando até 6 h).
    this.falhas = 0;
    this.abertoAte = 0;
    this._fila = Promise.resolve(); // uma consulta por vez (controle de concorrência)
    this.consultas = 0;
  }

  /** A fonte está descansando depois de falhas? */
  disjuntorAberto() { return this.now() < this.abertoAte; }

  _gql(query, variables) {
    const run = () => this._gqlAgora(query, variables);
    const p = this._fila.then(run, run);
    this._fila = p.catch(() => {});
    return p;
  }

  async _gqlAgora(query, variables) {
    if (this.disjuntorAberto()) throw new FonteErro('AniList em pausa depois de falhas', { retryMs: this.abertoAte - this.now() });
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), this.timeoutMs) : null;
    this.consultas++;
    try {
      const r = await this.fetch(ANILIST, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables }), signal: ctl?.signal });
      if (!r || !r.ok) {
        const retry = Number(r?.headers?.get?.('retry-after')) * 1000 || 0;
        throw new FonteErro(`AniList respondeu ${r ? r.status : 'nada'}`, { status: r?.status || 0, retryMs: retry });
      }
      const j = await r.json();
      if (j.errors?.length && !j.data) throw new FonteErro('AniList recusou a consulta', { status: 400 });
      if (!j || typeof j.data !== 'object' || j.data === null) throw new FonteErro('Resposta fora do formato esperado');
      this.falhas = 0;
      return j.data || {};
    } catch (e) {
      this.falhas++;
      if (this.falhas >= 4 || e.status === 429) {
        const espera = Math.min(6 * 3600e3, 15 * 60e3 * 2 ** Math.max(0, this.falhas - 4));
        this.abertoAte = this.now() + Math.max(espera, e.retryMs || 0);
      }
      throw e instanceof FonteErro ? e : new FonteErro(e?.name === 'AbortError' ? 'AniList demorou demais' : 'AniList indisponível');
    } finally { if (timer) clearTimeout(timer); }
  }

  /** Busca pelo nome: o mais popular primeiro. */
  async buscar(nome) {
    const s = String(nome || '').trim().slice(0, 80);
    if (!s) return [];
    const d = await this._gql(BUSCA, { s });
    return (d.Page?.media || []).map((m) => ({
      id: m.id,
      titulo: m.title?.english || m.title?.romaji || s,
      romaji: m.title?.romaji || '',
      english: m.title?.english || '',
      cor: m.coverImage?.color || null,
      status: m.status,
      proximo: m.nextAiringEpisode ? { episodio: m.nextAiringEpisode.episode, quando: m.nextAiringEpisode.airingAt * 1000 } : null,
    }));
  }

  /** Busca com todos os campos (capa, formato, duração, gêneros, plataformas, sequências). */
  async buscarCompleto(nome) {
    const s = textoSeguro(nome, 80);
    if (!s) return [];
    const d = await this._gql(BUSCA_COMPLETA, { s });
    return (d.Page?.media || []).map(mediaSegura).filter(Boolean);
  }

  /** Detalhes atualizados de vários animes (consulta consolidada: 50 por vez). */
  async detalhes(ids) {
    const lista = [...new Set((ids || []).filter((x) => Number.isInteger(x) && x > 0))];
    const out = [];
    for (let i = 0; i < lista.length; i += 50) {
      const d = await this._gql(DETALHES, { ids: lista.slice(i, i + 50) });
      out.push(...(d.Page?.media || []).map(mediaSegura).filter(Boolean));
    }
    return out;
  }

  /** Todos os episódios com exibição na janela [desde, ate] (calendário geral da temporada). */
  async janela(desde, ate, { paginas = 6 } = {}) {
    const out = [];
    for (let p = 1; p <= paginas; p++) {
      const d = await this._gql(JANELA, { desde: Math.floor(desde / 1000), ate: Math.floor(ate / 1000), p });
      for (const e of d.Page?.airingSchedules || []) {
        const media = mediaSegura(e.media);
        if (!media || int(e.episode, 0, 100000) == null || !int(e.airingAt, 1, 1e11)) continue;
        out.push({ id: media.id, episodio: e.episode, quando: e.airingAt * 1000, media });
      }
      if (!d.Page?.pageInfo?.hasNextPage) break;
    }
    return out;
  }

  /** Episódios que saíram nos últimos 3 dias e o próximo de cada anime seguido. */
  async agenda(ids) {
    const lista = (ids || []).filter((x) => Number.isInteger(x)).slice(0, 50);
    if (!lista.length) return { saiu: [], proximos: {} };
    const ate = Math.floor(this.now() / 1000);
    const d = await this._gql(AGENDA, { ids: lista, desde: ate - JANELA_S, ate });
    const saiu = (d.ja?.airingSchedules || []).map((e) => ({ id: e.mediaId, episodio: e.episode, quando: e.airingAt * 1000 }));
    const proximos = {};
    for (const m of d.prox?.media || []) if (m.nextAiringEpisode) proximos[m.id] = { episodio: m.nextAiringEpisode.episode, quando: m.nextAiringEpisode.airingAt * 1000 };
    return { saiu, proximos };
  }
}

/** Episódios ainda não avisados (um por anime: o mais recente), já saídos. */
export function episodiosNovos(saiu, seguidos, avisados, agora = Date.now()) {
  const porId = new Map(seguidos.map((a) => [a.id, a]));
  const ja = new Set(avisados);
  const melhor = new Map();
  for (const e of saiu) {
    if (!porId.has(e.id) || e.quando > agora || agora - e.quando > JANELA_S * 1000 || ja.has(`${e.id}:${e.episodio}`)) continue;
    const atual = melhor.get(e.id);
    if (!atual || e.episodio > atual.episodio) melhor.set(e.id, e);
  }
  return [...melhor.values()].map((e) => ({ ...e, anime: porId.get(e.id) }));
}

/** Visual do JoJo ligado ao anime (pela obra), entre os já liberados; o de nível mais alto. */
export function visualDoAnime(anime, liberados) {
  const nomes = [anime.titulo, anime.romaji, anime.english].map(normTitulo).filter((n) => n.length >= 3);
  let achado = null;
  for (const p of liberados) {
    const obra = normTitulo(p.obra);
    if (!obra) continue;
    const bate = nomes.some((n) => n === obra || (n.length >= 5 && obra.includes(n)) || (obra.length >= 5 && n.includes(obra)));
    if (bate && (!achado || p.nivel >= achado.nivel)) achado = p;
  }
  return achado;
}
