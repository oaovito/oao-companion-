// Calendário de anime (pedido de 18/11/2026): ela segue os animes que assiste e, quando sai
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

export class AnimeCalendario {
  constructor({ fetch, now = () => Date.now() } = {}) {
    this.fetch = fetch;
    this.now = now;
  }

  async _gql(query, variables) {
    const r = await this.fetch(ANILIST, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables }) });
    if (!r || !r.ok) throw new Error(`AniList respondeu ${r ? r.status : 'nada'}`);
    const j = await r.json();
    if (j.errors?.length && !j.data) throw new Error('AniList recusou a consulta');
    return j.data || {};
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

  /** Episódios que saíram nos últimos 3 dias e o próximo de cada anime seguido. */
  async agenda(ids) {
    const lista = (ids || []).filter((x) => Number.isInteger(x)).slice(0, ANIME_MAX);
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
