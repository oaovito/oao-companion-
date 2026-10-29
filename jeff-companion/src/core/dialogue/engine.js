// Orquestra provedores de diálogo com fallback garantido para o provedor
// programado (offline). Mantém um histórico curto apenas em memória.
import { normalizeReply } from './provider.js';
import { ScriptedProvider } from './scripted-provider.js';

export class DialogueEngine {
  constructor({ providers = [], timeoutMs = 8000, log = () => {} } = {}) {
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
    return { id: a.id, label: a.label, kind: a.kind, scripted: a.kind === 'scripted' };
  }

  async reply(text, context = {}) {
    const input = String(text || '').slice(0, 500);
    this.history.push({ role: 'user', text: input });
    let raw;
    const provider = this.active;
    try {
      if (provider !== this.fallback && !(await provider.isAvailable())) throw new Error('indisponível');
      raw = await withTimeout(provider.reply({ text: input, history: this.history.slice(-10), context }), this.timeoutMs);
    } catch (e) {
      this.log('warn', `Provedor ${provider.id} falhou (${e.message}); usando respostas programadas.`);
      raw = await this.fallback.reply({ text: input });
    }
    const out = normalizeReply(raw);
    this.history.push({ role: 'jeff', text: out.text });
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
