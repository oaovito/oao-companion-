// Orquestra provedores de diálogo com fallback garantido para o provedor
// programado (offline). Mantém um histórico curto apenas em memória.
import { normalizeReply } from './provider.js';
import { ScriptedProvider, detectIntent } from './scripted-provider.js';

// Intenções que nunca vão pra IA: segurança (João, CVV, SAMU) e gatilhos com animação própria.
const SCRIPTED_ONLY = new Set(['crisis', 'distress', 'sad', 'avcReal', 'avc', 'pretty', 'lol', 'moon', 'dressDown', 'dressUp', 'bench', 'squat', 'quiet', 'scare', 'eat', 'play', 'sleep', 'wake', 'pet']);
// Pausa da IA depois de uma falha: as próximas mensagens respondem na hora.
const LLM_PAUSE_MS = 90e3;

export class DialogueEngine {
  /**
   * @param search pesquisa na internet (WebSearch) para perguntas sem resposta
   *   programada; `searchEnabled()` diz se a usuária permitiu.
   */
  constructor({ providers = [], timeoutMs = 8000, log = () => {}, search = null, searchEnabled = () => true, llm = null } = {}) {
    // Conversa com IA (API gratuita): entende e responde no jeito do JoJo.
    this.llm = llm;
    this.llmOk = false;
    this.search = search;
    this.searchEnabled = searchEnabled;
    this.fallback = new ScriptedProvider();
    this.providers = providers;
    this.activeId = 'scripted';
    this.history = [];
    this.timeoutMs = timeoutMs;
    this.llmPauseUntil = 0;
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
    const ia = !!(this.llm && this.llm.getConfig && (this.llm.getConfig() || {}).ativo);
    return { id: ia ? 'llm' : a.id, label: ia ? this.llm.labelNow : a.label, kind: ia ? 'remote-api' : a.kind, scripted: !ia && a.kind === 'scripted', ia, webSearch: !!(this.search && this.searchEnabled()) };
  }

  async reply(text, context = {}) {
    const input = String(text || '').slice(0, 500);
    this.history.push({ role: 'user', text: input });
    let raw;
    let error = null;
    // Segurança e gatilhos com animação própria ficam com as respostas programadas;
    // o resto vai pra IA (se ativa e disponível), com volta às programadas se falhar.
    const intent = detectIntent(input);
    // Depois de uma falha (rede lenta/fora), pausa a IA um pouco para não fazer esperar de novo.
    if (this.llm && !SCRIPTED_ONLY.has(intent) && Date.now() >= this.llmPauseUntil && (await this.llm.isAvailable().catch(() => false))) {
      try {
        const r = await withTimeout(this.llm.reply({ text: input, history: this.history.slice(-12), context }), this.llm.timeoutMs || this.timeoutMs);
        const out = normalizeReply(r);
        out.intent = 'ia';
        this.llmOk = true;
        this.history.push({ role: 'jeff', text: out.text });
        if (this.history.length > 20) this.history.splice(0, this.history.length - 20);
        return out;
      } catch (e) {
        this.llmOk = false;
        this.llmPauseUntil = Date.now() + LLM_PAUSE_MS;
        this.log('warn', `IA indisponível (${e.message}); usando respostas programadas.`);
      }
    }
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
    this.history.push({ role: 'jojo', text: out.web ? out.web.extract : out.text });
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
