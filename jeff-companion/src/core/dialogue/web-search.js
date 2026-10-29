// Pesquisa na internet para perguntas que as respostas programadas não cobrem.
// Puro: recebe `fetch` por injeção (no app, `net.fetch` do Electron no processo
// principal). Só a pergunta da usuária sai do computador; nada mais é enviado.
//
// Fontes (sem chave de API): Wikipédia em português e, se ela não tiver nada,
// a "Instant Answer" do DuckDuckGo.
import { normalizeText } from './scripted-provider.js';

const QUESTION_START = /^(o que|oque|o q|que|quem|qual|quais|quando|onde|aonde|quanto|quantos|quantas|quanta|por que|porque|pq|por q|como|cade|sera que|voce sabe|vc sabe|me (diz|fala|explica|conta)|explica|pesquisa|procura|significado)\b/;

/** É uma pergunta de conhecimento (algo a pesquisar), e não um pedido ao JoJo? */
export function isFactualQuestion(text) {
  const n = normalizeText(text).replace(/^(jojo|ei|oi|o|ow|eai|e ai)\s+/, '');
  if (!n || n.length < 6) return false;
  return QUESTION_START.test(n);
}

// Prefixos removidos para formar a busca (em ordem; aplicados repetidamente).
const STRIP = [
  /^(jojo|ei|oi|ô|ow|e aí|eaí)[,!.\s]+/i,
  /^(voc[eê]|vc) sabe( me dizer| dizer)?( se)?\s+/i,
  /^(me )?(diz|fala|explica|conta|pesquisa|procura)( pra mim| para mim)?( sobre| o que)?\s+/i,
  /^(o que|oque|o q|que)\s+(é|e|eh|são|sao|foi|foram|era|significa|quer dizer)\s+/i,
  /^quem\s+(é|e|eh|foi|era|são|sao)\s+/i,
  /^(qual|quais)\s+(é|e|eh|foi|são|sao|era)?\s*/i,
  /^onde\s+(fica|é|e|está|esta|ficam)\s+/i,
  /^quando\s+(foi|é|e|era)\s+/i,
  /^(por que|porque|pq|por q)\s+/i,
  /^(o|a|os|as|um|uma)\s+/i,
];

/** Extrai o assunto da pergunta ("o que é fotossíntese?" → "fotossíntese"). */
export function extractQuery(text) {
  let q = String(text || '').replace(/\s+/g, ' ').trim().replace(/[?!.…]+$/g, '').trim();
  for (let i = 0; i < 6; i++) {
    const before = q;
    for (const re of STRIP) q = q.replace(re, '').trim();
    if (q === before) break;
  }
  return q.slice(0, 120);
}

// Pedidos que vão contra as diretrizes do JoJo (incentivar drogas, se machucar,
// dieta extrema): não pesquisa.
const BLOCKED = /\b(como (usar|cheirar|comprar|conseguir|fazer|preparar|injetar) (cocaina|coca|po|crack|droga\w*|maconha|lsd|md|mdma|ecstasy|heroina|bala)|onde (comprar|conseguir|achar) (cocaina|coca|po|crack|droga\w*|maconha|lsd|md|mdma|ecstasy|heroina|bala)|como (emagrecer|perder peso) (rapido|em \d+ dias)|parar de comer|vomitar depois de comer)\b/;

export function isBlockedQuestion(text) {
  return BLOCKED.test(normalizeText(text));
}

/** Limpa um resumo: tira parênteses (pronúncia, datas extras) e corta em frases. */
export function tidyExtract(text, max = 260) {
  let t = String(text || '').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i++) t = t.replace(/\s*\([^()]*\)/g, '');
  t = t.replace(/\s+([,.;:])/g, '$1').trim();
  if (t.length <= max) return t;
  const sentences = t.match(/[^.!?]+[.!?]+(\s|$)/g) || [t];
  let out = '';
  for (const s of sentences) {
    if ((out + s).trim().length > max) break;
    out += s;
  }
  out = out.trim();
  if (!out) out = `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
  return out;
}

export class WebSearch {
  /**
   * @param fetch função compatível com fetch (Request/Response)
   * @param bases URLs base (trocadas só em testes)
   */
  constructor({ fetch, timeoutMs = 7000, userAgent = 'JeffCompanion (projeto de fã)', bases = {}, log = () => {} } = {}) {
    this.fetch = fetch;
    this.timeoutMs = timeoutMs;
    this.userAgent = userAgent;
    this.wiki = bases.wikipedia || 'https://pt.wikipedia.org';
    this.ddg = bases.duckduckgo || 'https://api.duckduckgo.com';
    this.log = log;
  }

  async _json(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await this.fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': this.userAgent, Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'tempo esgotado' : e.message);
    } finally {
      clearTimeout(t);
    }
  }

  async _wikipedia(query) {
    const p = new URLSearchParams({
      action: 'query', format: 'json', utf8: '1', redirects: '1', origin: '*',
      generator: 'search', gsrsearch: query, gsrlimit: '3',
      prop: 'extracts|info', exintro: '1', explaintext: '1', exsentences: '3', inprop: 'url',
    });
    const data = await this._json(`${this.wiki}/w/api.php?${p}`);
    const pages = data && data.query && data.query.pages ? Object.values(data.query.pages) : [];
    // Entre os 3 primeiros, prefere o resumo que cita mais palavras da pergunta
    // ("capital da Austrália" → Canberra, não o artigo do país).
    const words = normalizeText(query).split(' ').filter((w) => w.length >= 4);
    const score = (p) => {
      const text = normalizeText(`${p.title} ${(p.extract || '').slice(0, 400)}`);
      return words.filter((w) => text.includes(w)).length;
    };
    const page = pages
      .filter((p) => p.extract && !/desambigua/i.test(p.extract.slice(0, 200)))
      .sort((a, b) => score(b) - score(a) || (a.index ?? 0) - (b.index ?? 0))[0];
    if (!page) return null;
    return { title: page.title, extract: page.extract, source: 'Wikipédia', url: page.fullurl || null };
  }

  async _duckduckgo(query) {
    const p = new URLSearchParams({ q: query, format: 'json', no_html: '1', skip_disambig: '1', kl: 'br-pt' });
    const data = await this._json(`${this.ddg}/?${p}`);
    const text = (data && (data.AbstractText || data.Answer || data.Definition)) || '';
    if (!text) return null;
    return { title: data.Heading || query, extract: String(text), source: data.AbstractSource || 'DuckDuckGo', url: data.AbstractURL || null };
  }

  /**
   * Pesquisa a pergunta. Retorna {query, title, extract, source, url} ou null
   * quando nada foi encontrado. Lança erro quando a rede falha em todas as fontes.
   */
  async search(question) {
    const query = extractQuery(question);
    if (!query) return null;
    const errors = [];
    for (const [name, fn] of [['Wikipédia', () => this._wikipedia(query)], ['DuckDuckGo', () => this._duckduckgo(query)]]) {
      try {
        const r = await fn();
        if (r) return { query, ...r, extract: tidyExtract(r.extract) };
      } catch (e) {
        this.log('warn', `Pesquisa (${name}) falhou: ${e.message}`);
        errors.push(`${name}: ${e.message}`);
      }
    }
    if (errors.length === 2) throw new Error(errors.join('; '));
    return null;
  }
}
