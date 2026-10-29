// Seleção de frases sem repetição excessiva ("saco embaralhado" por categoria
// e memória das últimas frases ditas no geral).

export class PhraseBook {
  constructor(data, { rng = Math.random, recentSize = 8 } = {}) {
    this.categories = (data && data.categories) || {};
    this.rng = rng;
    this.bags = {};
    this.recent = [];
    this.recentSize = recentSize;
  }

  has(category) {
    return !!(this.categories[category] && this.categories[category].lines.length);
  }

  kindOf(category) {
    return (this.categories[category] && this.categories[category].kind) || 'speech';
  }

  _refill(category) {
    const lines = this.categories[category].lines.slice();
    for (let i = lines.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [lines[i], lines[j]] = [lines[j], lines[i]];
    }
    // Evita que o primeiro do novo saco repita algo recente.
    if (lines.length > 1 && this.recent.includes(lines[lines.length - 1])) {
      lines.unshift(lines.pop());
    }
    this.bags[category] = lines;
  }

  /** @returns {{text, kind, category}|null} — `vars` substitui {chave} no texto. */
  pick(category, vars = {}) {
    if (!this.has(category)) return null;
    if (!this.bags[category] || !this.bags[category].length) this._refill(category);
    const bag = this.bags[category];
    let text = bag.pop();
    if (this.recent.includes(text) && bag.length) {
      bag.unshift(text);
      text = bag.pop();
    }
    this.recent.push(text);
    if (this.recent.length > this.recentSize) this.recent.shift();
    const out = text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    return { text: out, kind: this.kindOf(category), category };
  }
}

/** Tempo de leitura proporcional ao tamanho do texto (ms). */
export function readingTimeMs(text, { min = 2400, max = 9500, perChar = 55, base = 1400 } = {}) {
  const t = base + String(text || '').length * perChar;
  return Math.max(min, Math.min(max, t));
}

/** Categoria de cumprimento conforme o horário local. */
export function greetingCategory(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 || h < 2) return 'night';
  return 'greeting';
}
