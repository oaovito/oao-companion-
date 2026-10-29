// Orquestra provedores de diálogo com fallback garantido para o provedor
// programado (offline). Mantém um histórico curto apenas em memória.
import { normalizeReply } from './provider.js';
import { ScriptedProvider } from './scripted-provider.js';

export class DialogueEngine {
  /**
   * @param search pesquisa na internet (WebSearch) para perguntas sem resposta
   *   programada; `searchEnabled()` diz se a usuária permitiu.
   */
  constructor({ providers = [], timeoutMs = 8000, log = () => {}, search = null, searchEnabled = () => true } = {}) {
    this.search = search;
    this.searchEnabled = searchEnabled;
    this.fallback = new ScriptedProvider();
    this.providers = providers;
    this.activeId = 'scripted';
    this.history = [];
    this.timeoutMs = timeoutMs;
    this.log = log;
  }

  register(provider) {
    this.providers.push(provider);
  }

  get active() {
    return this.providers.find((p) => p.id === this.activeId) || this.fallback;
  }

  describe() {
    const a = this.active;
    return { id: a.id, label: a.label, kind: a.kind, scripted: a.kind === 'scripted', webSearch: !!(this.search && this.searchEnabled()) };
  }

  async reply(text, context = {}) {
    const input = String(text || '').slice(0, 500);
    this.history.push({ role: 'user', text: input });
    let raw;
    let error = null;
    const provider = this.active;
    try {
      if (provider !== this.fallback && !(await provider.isAvailable())) throw new Error('indisponível');
      raw = await withTimeout(provider.reply({ text: input, history: this.history.slice(-10), context }), this.timeoutMs);
    } catch (e) {
      this.log('warn', `Provedor ${provider.id} falhou (${e.message}); usando respostas programadas.`);
      error = e.message;
      raw = await this.fallback.reply({ text: input });
    }
    const out = normalizeReply(raw);
    if (error) out.error = error;
    if (raw && raw.search && this.search && this.searchEnabled()) {
      try {
        const found = await this.search.search(input);
        if (found) {
          out.intent = 'web';
          out.web = found;
          out.action = null;
        } else out.webNotFound = true;
      } catch (e) {
        this.log('warn', `Pesquisa na internet falhou: ${e.message}`);
        out.webError = e.message;
      }
    }
    this.history.push({ role: 'jeff', text: out.web ? out.web.extract : out.text });
    if (this.history.length > 20) this.history.splice(0, this.history.length - 20);
    return out;
  }
}

function withTimeout(p, ms) {
  let t;
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise((_, rej) => {
      t = setTimeout(() => rej(new Error('tempo esgotado')), ms);
    }),
  ]);
}
