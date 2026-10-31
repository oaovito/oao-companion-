// Orquestra provedores de diálogo com fallback garantido para o provedor
// programado (offline). Mantém um histórico curto apenas em memória.
import { normalizeReply } from './provider.js';
import { ScriptedProvider, detectIntent } from './scripted-provider.js';
import { precisaPesquisar, linhaFontes } from './pesquisa.js';
import { classificarSeriedade, seguimento, instrucaoProfessor, respostaFalaDoAssunto } from './professor.js';
import { conversaPessoal, respostaAncorada, erroDeCoerencia, expressaoCoerente, pedidoAoApp } from './coherence.js';

// Assunto em andamento vale por 15 min para "me dá um exemplo", "aprofunda"…
const TEMA_MS = 15 * 60e3;

// Intenções que nunca vão pra IA: segurança (João, CVV, SAMU) e gatilhos com animação própria.
const SCRIPTED_ONLY = new Set(['crisis', 'distress', 'sad', 'avcReal', 'avc', 'pretty', 'lol', 'moon', 'dressDown', 'dressUp', 'bench', 'squat', 'quiet', 'scare', 'eat', 'play', 'sleep', 'wake', 'pet', 'docinho']);
// Pausa da IA depois de uma falha: as próximas mensagens respondem na hora.
const LLM_PAUSE_MS = 90e3;

export class DialogueEngine {
  /**
   * @param search pesquisa na internet (WebSearch) para perguntas sem resposta
   *   programada; `searchEnabled()` diz se a usuária permitiu.
   */
  constructor({ providers = [], timeoutMs = 8000, log = () => {}, search = null, searchEnabled = () => true, llm = null, pesquisa = null, now = () => new Date() } = {}) {
    // Motor de pesquisa (fontes públicas sem login): alimenta o modelo local local quando precisa.
    this.pesquisa = pesquisa;
    // Conversa com IA (API gratuita): entende e responde no jeito do JoJo.
    this.llm = llm;
    this.llmOk = false;
    this.search = search;
    this.searchEnabled = searchEnabled;
    this.fallback = new ScriptedProvider({ now });
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

  cancelPending() {
    this.generationEpoch = (this.generationEpoch || 0) + 1;
    this.pendingGeneration?.abort('conversation-superseded');
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
    const epoch = this.generationEpoch || 0;
    const input = String(text || '').slice(0, 500);
    // A Central inclui também respostas de comandos e reações entregues fora
    // deste engine. É esse histórico REAL que deve alimentar a próxima fala.
    if (Array.isArray(context.history)) this.history = context.history.slice(-19).map((h) => ({ ...h }));
    if (this.history.at(-1)?.role === 'user' && this.history.at(-1)?.text === input) this.history.pop();
    this.history.push({ role: 'user', text: input });
    let raw;
    let error = null;
    // Segurança e gatilhos com animação própria ficam com as respostas programadas;
    // o resto vai pra IA (se ativa e disponível), com volta às programadas se falhar.
    const intent = detectIntent(input);
    const anchored = !SCRIPTED_ONLY.has(intent) && respostaAncorada(input, this.history.slice(0, -1));
    if (anchored) {
      this.history.push({ role: 'jojo', text: anchored.text });
      this.history = this.history.slice(-20);
      return anchored;
    }
    // Depois de uma falha (rede lenta/fora), pausa a IA um pouco para não fazer esperar de novo.
    // Modo professor: seriedade decidida antes de responder; continuidade usa o assunto anterior.
    const temaVivo = this.tema && Date.now() - this.tema.t < TEMA_MS ? this.tema : null;
    const seg = temaVivo ? seguimento(input) : null;
    // Um exemplo continua sendo técnico mesmo sem pesquisa externa. Não depender
    // de out.fontes para manter a expressão/seriedade do assunto em andamento.
    const seriedade = seg ? classificarSeriedade(temaVivo.texto)
      : conversaPessoal(input) && !SCRIPTED_ONLY.has(intent) ? 'casual' : classificarSeriedade(input);
    // Pesquisa só quando precisa (pergunta de conhecimento, ciência, MNE_Lab, "pesquisa…").
    let achado = seg ? temaVivo.pesquisa : null;
    let erroPesquisa = null;
    const tipo = !seg && this.pesquisa && !SCRIPTED_ONLY.has(intent) && this.searchEnabled() ? precisaPesquisar(input) : null;
    if (tipo) {
      if (context.onStatus) context.onStatus('Consultando fontes...');
      try {
        achado = await withTimeout(this.pesquisa.pesquisar(input, tipo), 9000);
      } catch (e) {
        this.log('warn', `Pesquisa falhou: ${e.message}`);
        erroPesquisa = e.message;
      }
    }
    if (epoch !== (this.generationEpoch || 0)) return { text: '', cancelled: true, intent: 'cancelled' };
    if (!seg && (achado || seriedade === 'cientifico' || seriedade === 'tecnico')) this.tema = { texto: input, pesquisa: achado, t: Date.now(), parte: 0 };
    else if (seg) temaVivo.t = Date.now();
    const professor = instrucaoProfessor({ seriedade, seg, tema: temaVivo && temaVivo.texto });
    if (this.llm && !SCRIPTED_ONLY.has(intent) && Date.now() >= this.llmPauseUntil && (await this.llm.isAvailable().catch(() => false))) {
      try {
        if (epoch !== (this.generationEpoch || 0)) return { text: '', cancelled: true, intent: 'cancelled' };
        const base = this.llm.timeoutFor ? this.llm.timeoutFor(input) : this.llm.timeoutMs || this.timeoutMs;
        const longo = achado || professor;
        // Com a pesquisa em mãos, não faz esperar demais: se o modelo demorar, responde com a fonte.
        const budget = achado ? Math.min(base, 25e3) : longo ? Math.min(Math.max(base, this.timeoutMs), 45e3) : base;
        const controller = new AbortController();
        this.pendingGeneration = controller;
        let r;
        try {
          r = await withTimeout(this.llm.reply({ text: input, history: this.history.slice(-12), context, pesquisa: achado, professor, followup: seg ? { kind: seg, topic: temaVivo.texto } : null, signal: controller.signal }), budget, () => controller.abort());
        } finally {
          if (this.pendingGeneration === controller) this.pendingGeneration = null;
        }
        const out = normalizeReply(r);
        const incoerente = erroDeCoerencia(input, out.text, this.history.slice(0, -1));
        if (incoerente) {
          const e = new Error(incoerente);
          e.foraDoAssunto = true;
          throw e;
        }
        // Pergunta de conhecimento: a resposta tem de falar do assunto (senão vale a pesquisa).
        if ((achado || seriedade === 'cientifico' || seriedade === 'tecnico' || tipo) && !seg && !respostaFalaDoAssunto(input, out.text)) {
          const fora = new Error('resposta fora do assunto');
          fora.foraDoAssunto = true;
          throw fora;
        }
        out.intent = 'ia';
        if (achado) {
          out.fontes = achado.fontes;
          out.linhaFontes = linhaFontes(achado);
        }
        this.llmOk = true;
        out.action = expressaoCoerente(input, out, seriedade);
        if (!pedidoAoApp(input)) {
          delete out.command;
          delete out.commandArg;
          delete out.acoes;
        }
        this.history.push({ role: 'jojo', text: out.text });
        if (this.history.length > 20) this.history.splice(0, this.history.length - 20);
        return out;
      } catch (e) {
        if (e.cancelled) return { text: '', action: null, intent: 'cancelled', cancelled: true };
        // Resposta fora do assunto não é falha do motor: só desta vez vale a pesquisa.
        if (!e.foraDoAssunto && !e.respostaInvalida) {
          this.llmOk = false;
          this.llmPauseUntil = Date.now() + (this.llm.preset?.native ? 5000 : LLM_PAUSE_MS);
        }
        this.log('warn', `IA: ${e.message}; usando ${achado ? 'a pesquisa' : 'respostas programadas'}.`);
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
    const unavailable = this.llm?.unavailableReason?.();
    if (out.intent === 'unknown' && !raw.search && unavailable && !['desligada', 'sem motor'].includes(unavailable)) {
      out.text = unavailable.startsWith('erro:')
        ? 'A conversa local não conseguiu iniciar. Por enquanto só consigo responder às falas que já conheço. Vou tentar ligar de novo.'
        : 'Ainda estou preparando a conversa aqui no PC. Já consigo reagir e atender pedidos; a conversa livre volta quando terminar.';
      out.action = 'curious';
    }
    if (error) out.error = error;
    // Sem a conversa local: continuidade responde com o próximo trecho do que foi pesquisado.
    if (seg && achado && achado.trechos.length) {
      const com = achado.trechos.filter((x) => x.texto);
      const lista = com.length ? com : achado.trechos;
      temaVivo.parte = seg === 'simplificar' || seg === 'resumir' ? 0 : (temaVivo.parte + 1) % lista.length;
      const t = lista[temaVivo.parte];
      const frase = (x) => (String(x || '').match(/^[^.!?]+[.!?]/) || [x])[0];
      const texto = seg === 'resumir' || seg === 'simplificar' ? frase(t.texto || t.titulo) : t.texto || t.titulo;
      out.intent = 'web';
      out.web = { query: achado.consulta, title: t.titulo, extract: texto, source: t.fonte, url: t.url, lang: 'pt' };
      out.action = null;
      out.fontes = achado.fontes;
    } else if (achado && !seg) {
      const t = achado.trechos.find((x) => x.texto) || achado.trechos[0];
      out.intent = 'web';
      out.web = { query: achado.consulta, title: t.titulo, extract: t.texto || t.titulo, source: t.fonte, url: t.url, lang: 'pt' };
      out.action = null;
      out.fontes = achado.fontes;
    } else if (raw && raw.search && tipo) {
      // Já pesquisou (sem resultado ou sem rede): não repete a busca.
      if (erroPesquisa) out.webError = erroPesquisa;
      else out.webNotFound = true;
    } else if (raw && raw.search && !conversaPessoal(input) && !SCRIPTED_ONLY.has(intent) && this.search && this.searchEnabled()) {
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

function withTimeout(p, ms, cancel = () => {}) {
  let t;
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise((_, rej) => {
      t = setTimeout(() => { cancel(); rej(new Error('tempo esgotado')); }, ms);
    }),
  ]);
}
