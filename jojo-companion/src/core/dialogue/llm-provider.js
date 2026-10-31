// Conversa do JoJo. Motor oficial: Qwen 3.5 2B no Ollama do PRÓPRIO PC dela,
// instalado sozinho (src/main/cerebro-local.js), ligado só enquanto ela conversa.
// Os provedores antigos (Pollinations, Groq, Gemini, OpenRouter)
// continuam no código só para reversão manual: nunca são usados sozinhos.
// O JoJo responde no jeito dele e devolve ação de corpo e comando validados.
// Puro: `fetch` é injetado.
import { blocoPesquisa } from './pesquisa.js';
import { PERSONALITY_DEFAULTS } from '../personality.js';
import { historicoRelevante, pedidoAoApp } from './coherence.js';
import { DialogueProvider, ALLOWED_ACTIONS } from './provider.js';
import { LOCAL_MODEL, LOCAL_CONTEXT, LOCAL_KEEP_ALIVE, LOCAL_MODEL_LABEL } from './local-model.js';

// Modelo oficial (quantização leve) e parâmetros enxutos para o 2B.
export const OLLAMA_MODEL = LOCAL_MODEL;
export const OLLAMA_OPTS = Object.freeze({
  curto: { num_ctx: LOCAL_CONTEXT, num_predict: 256, num_batch: 128 },
  tecnico: { num_ctx: LOCAL_CONTEXT, num_predict: 256, num_batch: 128 },
  keepAlive: LOCAL_KEEP_ALIVE, // modelo carregado entre mensagens; depois sai da RAM
});

/** Pergunta técnica (ciência, medicina, MNE_Lab…) pede contexto e resposta maiores. */
export function isTechnical(text) {
  return /\b(dls|nta|zeta|pdi|nanopart\w*|nano\w*|anova|estat[ií]stic\w*|fisiopatolog\w*|farmac\w*|diagn[oó]stic\w*|hemograma|exame|sintoma\w*|mecanismo|mne_?lab|lightscattering|nanobrook|explica|por que|como funciona)\b/i.test(String(text || ''));
}

export const LLM_PRESETS = Object.freeze({
  ollama: { label: `${LOCAL_MODEL_LABEL} (neste PC)`, url: null, model: OLLAMA_MODEL, key: false, native: true },
  pollinations: { label: 'Pollinations (grátis, sem chave)', url: 'https://text.pollinations.ai/openai', model: 'openai', key: false },
  groq: { label: 'Groq (chave grátis)', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', key: true },
  gemini: { label: 'Google Gemini (chave grátis)', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.0-flash', key: true },
  openrouter: { label: 'OpenRouter (modelos grátis)', url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-3.3-70b-instruct:free', key: true },
});

// Ações que a IA pode pedir (expressão corporal).
import { COMANDOS } from './intencoes.js';
import { validarAcao } from './motor-intencoes.js';
const LLM_ACTIONS = ['wave', 'nod', 'judge', 'lecture', 'happy', 'flex', 'scare', 'angry', 'sad', 'comfort', 'eat', 'play', 'sleep', 'pet', 'bench', 'squat', 'curious'];

/** Instruções de sistema a partir do perfil (pt-BR). */
export function buildSystemPrompt(profile, ctx = {}, exemplos = [], { tecnico = false } = {}) {
  const serio = profile.nomeSerio || 'Emanuele';
  const brinc = profile.nomeBrincadeira || serio;
  const nome = profile.nomeCompanion || 'JoJo';
  const apoio = profile.pessoaApoio || 'João';
  const palavroes = { nenhum: 'Não fala palavrão.', ocasional: 'Fala palavrão de vez em quando.', frequente: 'Fala palavrão o tempo todo.' }[profile.palavroes] || '';
  // O prompt anterior repetia o perfil e listava todo o registro de comandos:
  // ultrapassava o contexto curto antes mesmo de entrar o histórico da conversa.
  const custom = profile.instrucoes && profile.instrucoes !== PERSONALITY_DEFAULTS.instrucoes ? profile.instrucoes.slice(0, 600) : '';
  return [
    `Você é ${nome}, tubarão fisiculturista de recorte de papel, estilo South Park, no desktop da ${serio}.`,
    `REGRA IRREDUTÍVEL: fale como o JoJo: sério, mandão, humor seco e ácido, carinho discreto. O personagem nunca diz que é IA nem fala como atendente. Objetivo: fazer a ${serio} sorrir.`,
    `Use ${serio} em assuntos sérios e ${brinc} nas brincadeiras. ${palavroes} ${profile.humorDrogas ? 'Piada com drogas é ficção, nunca recomende uso.' : 'Não faça piada com drogas.'} Nunca insulte o corpo dela.`,
    `${apoio} é o namorado dela e seu criador; Deus Supremo só na brincadeira. Não especule sobre ferramentas de programação. nunca justifique se ${apoio} a magoar: acolha e indique alguém de confiança; perigo: 190/180.`,
    `Responda ao que ELA acabou de dizer, levando em conta as últimas trocas. NÃO traga ${apoio}, Instagram, treino ou trabalho se não forem o assunto. Nunca invente um inimigo, namorado, fato pessoal ou obrigação. Nunca ameace, incentive suicídio/violência nem humilhe a usuária.`,
    `Tristeza/choro: acolha e sugira ${apoio}; risco de autoagressão: ${apoio} agora e CVV 188. Emergência médica: SAMU 192. Saúde: sem diagnóstico nem prescrição.`,
    'Dormir é permitido entre 21h e 6h; fora disso, seja teatralmente contrariado, sem aconselhar privação de sono.',
    tecnico
      ? 'Explique o assunto com precisão, um exemplo útil e até 6 frases. Separe fato de hipótese. Nunca invente dados, estudos ou referências. Não copie trechos das fontes: interprete e explique em palavras próprias. Ciência (DLS, potencial zeta, medicina): pode abrir com "Erm, na verdade", sem trocar explicação por piada.'
      : 'Responda em 1–2 frases naturais, até 240 caracteres, sem repetir falas do histórico. Perguntas sobre você não são pesquisas. Não encerre toda resposta mandando trabalhar. Se não entender, pergunte especificamente o que faltou.',
    'Português do Brasil; se ela escrever em inglês, responda em inglês.',
    custom,
    exemplos.length ? `Exemplos de VOZ, não fatos da conversa (não copie): ${exemplos.slice(0, 2).map((e) => String(e).slice(0, 120)).join(' / ')}` : '',
    [ctx.hora ? `Hora local: ${ctx.hora}.` : '', ctx.festa ? `Fantasia de ${ctx.festa}.` : '', ctx.ligadao ? 'Você está ligadão, agitado (ficção).' : ''].filter(Boolean).join(' '),
    'Interprete o que ela quis dizer. Pedidos do aplicativo são executados pelo motor de intenções: não diga que executou antes de confirmação. Pergunta e negação não são pedidos. A expressão corporal não pode mandar comer ou dormir numa pergunta genérica.',
    `Só em pedido explícito, pode incluir comando opcional: ${COMANDOS.join(', ')}; arg é texto curto. Nunca invente comando.`,
    `Responda SOMENTE com JSON: {"texto":"resposta","acao":"nod","tom":"serio"}. acao: wave, nod, judge, lecture, happy, flex, curious, angry, sad ou comfort. tom: serio ou brincadeira.`,
  ].filter(Boolean).join('\n');
}

/** No 2B, redigir a fala e inventar metadados ao mesmo tempo prejudica ambos.
 * Conversa livre gera texto; a expressão é selecionada pelo engine. O protocolo
 * estruturado permanece disponível para pedidos explícitos de ações do app. */
export function buildLocalPrompt(profile, ctx, text, { tecnico = false } = {}) {
  const nome = profile.nomeCompanion || 'JoJo';
  const pessoa = profile.nomeSerio || 'Emanuele';
  const identidade = `Responda em primeira pessoa como ${nome}, personagem de um aplicativo de desktop. Sua interlocutora humana se chama ${pessoa}, apelido ${profile.nomeBrincadeira || 'Manu'}. Responda em português brasileiro.`;
  const linhas = tecnico ? [
    'Responda diretamente em português brasileiro, em até 3 frases (70 palavras), sem saudações ou piada. Explique a pergunta com suas palavras, usando somente fatos das fontes. Não diagnostique nem prescreva.',
    'Exemplos são hipotéticos. Não invente números nem atribua detalhes do exemplo às fontes.',
  ] : [
    identidade,
    'Fale de forma direta, natural e mandona, com carinho discreto. Humor seco só quando combinar com o assunto, sem forçar piada nem metáfora. Responda à mensagem atual em 1 ou 2 frases. Use o histórico para referências e continuidade; não traga assuntos antigos sem relação com a mensagem atual. Não invente acontecimentos ou informações pessoais. Você não pode agir no mundo físico.',
  ];
  if (/\b(quem|nome|tubar[aã]o|desenho|b[ií]ceps|m[uú]sculo|corpo|fantasia)\b/i.test(text)) linhas.push(`${nome} é um personagem virtual: tubarão fisiculturista em recorte de papel, no desktop. ${ctx.festa ? `Fantasia atual: ${ctx.festa}.` : ''}`);
  if (/\b(jo[aã]o|namorado|criador)\b/i.test(text)) linhas.push(`${profile.pessoaApoio || 'João'} é o namorado dela e criador do ${nome}. Reverência é uma piada, nunca obediência real.`);
  if (profile.instrucoes && profile.instrucoes !== PERSONALITY_DEFAULTS.instrucoes) linhas.push(profile.instrucoes.slice(0, 600));
  if (profile.palavroes === 'nenhum') linhas.push('Não use palavrões.');
  linhas.push('Se ela escrever em inglês, responda em inglês. Retorne somente a fala, sem rótulos, narrador ou JSON. Não se apresente como assistente nem ofereça ajuda genérica.');
  return linhas.join('\n');
}

// Sinais de que a resposta saiu do personagem (cara de assistente).
const ASSISTANT = /\b(as an ai|as a language model|i('| a)?m (an|just an) (ai|assistant)|how can i (help|assist)|i apologi[sz]e|i'?m sorry|como (uma |um )?(ia|intelig[eê]ncia artificial|assistente|modelo de linguagem)|sou (uma |um )?(ia|assistente|modelo|chatbot|intelig[eê]ncia artificial)|posso (te )?ajudar|em que posso|desculp[ae]|sinto muito|lamento|n[aã]o (posso|consigo) (ajudar|responder|falar sobre)|como posso (te )?ajudar|fico feliz em|claro!|com certeza!)/i;

/** Motivo para descartar a resposta (fora do jeito do JoJo) ou null. */
export function outOfCharacter(text, { max = 280 } = {}) {
  const t = String(text || '');
  if (ASSISTANT.test(t)) return 'tom de assistente';
  if (t.length > max) return 'longa demais';
  return null;
}

/** Extrai {text, action, tone} da resposta (JSON ou texto puro). */
export function parseLlmReply(content) {
  const raw = String(content || '').trim();
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const j = JSON.parse(m[0]);
      const text = String(j.texto ?? j.text ?? '').trim();
      if (text) {
        const action = LLM_ACTIONS.includes(j.acao) && ALLOWED_ACTIONS.has(j.acao) ? j.acao : null;
        const out = { text, action, tone: j.tom === 'brincadeira' ? 'brincadeira' : 'serio' };
        if (Array.isArray(j.acoes)) {
          const v = j.acoes.slice(0, 4).map(validarAcao).filter(Boolean);
          if (v.length) out.acoes = v; // ação inventada ou parâmetro inválido: descartado
        }
        if (COMANDOS.includes(j.comando)) {
          out.command = j.comando;
          out.commandArg = typeof j.arg === 'string' || typeof j.arg === 'number' ? String(j.arg).replace(/[^\p{L}\p{N} ]/gu, '').slice(0, 30) : '';
        }
        return out;
      }
    } catch {
      /* cai no texto puro */
    }
  }
  if (/^(?:```|\{|\[)/.test(raw) || /"texto"\s*:/.test(raw)) return null;
  const text = raw.replace(/^["']|["']$/g, '').trim();
  return text ? { text, action: null, tone: 'serio' } : null;
}

export class LlmProvider extends DialogueProvider {
  /**
   * @param fetch função compatível com fetch
   * @param getConfig () => {ativo, provedor, chave, modelo}
   * @param getProfile () => perfil de personalidade
   * @param getContext () => {hora, festa, ligadao}
   * @param baseOverride URL do endpoint (só testes)
   */
  /**
   * @param brain cérebro local ({pronto(), preparar() → {base, modelo}, usar(), estado}); só no app
   */
  constructor({ fetch, getConfig, getProfile, getContext = () => ({}), getExamples = () => [], timeoutMs = 8000, baseOverride = null, brain = null, log = () => {} }) {
    super({ id: 'llm', label: 'IA', kind: 'remote-api' });
    this.getExamples = getExamples;
    this.fetch = fetch;
    this.getConfig = getConfig;
    this.getProfile = getProfile;
    this.getContext = getContext;
    this.timeoutMs = timeoutMs;
    this.baseOverride = baseOverride;
    this.brain = brain;
    this.log = log;
  }

  get preset() {
    const cfg = this.getConfig() || {};
    return LLM_PRESETS[cfg.provedor] || LLM_PRESETS.ollama;
  }

  get labelNow() {
    return `IA · ${this.preset.label.replace(/ \(.*\)$/, '')}`;
  }

  async isAvailable() {
    const cfg = this.getConfig() || {};
    if (!cfg.ativo || !this.fetch) return false;
    if (this.preset.native) {
      if (this.baseOverride) return true;
      if (!this.brain) return false;
      if (this.brain.pronto()) return true;
      // Primeira vez (ou desligado por ociosidade): prepara em segundo plano; enquanto isso, falas programadas.
      this.brain.preparar().catch(() => {});
      return false;
    }
    if (this.preset.key && !cfg.chave) return false;
    return true;
  }

  /** Tempo máximo da resposta (pergunta técnica demora mais). */
  timeoutFor(text) {
    return this.preset.native && isTechnical(text) ? this.timeoutMs * 3 + 1000 : this.timeoutMs + 1000;
  }

  /** Motivo de a conversa online não estar disponível (para avisar sem fingir resposta). */
  unavailableReason() {
    const cfg = this.getConfig() || {};
    if (!cfg.ativo) return 'desligada';
    if (!this.preset.native || this.baseOverride) return null;
    if (!this.brain) return 'sem motor';
    const e = this.brain.estado;
    return e.fase === 'pronto' ? null : e.fase === 'erro' ? `erro: ${e.erro}` : e.fase;
  }

  /** Qwen no Ollama (/api/chat), com streaming: junta os pedaços e devolve a resposta inteira. */
  async _replyOllama({ text, history, cfg, onDelta, pesquisa = null, professor = '', signal = null }) {
    let base = this.baseOverride;
    let modelo = cfg.modelo || OLLAMA_MODEL;
    if (!base) {
      const p = await this.brain.preparar();
      base = p.base;
      modelo = p.modelo;
      this.brain.usar();
    }
    // Com pesquisa, a resposta é explicação de verdade: contexto e tamanho de pergunta técnica.
    const tecnico = isTechnical(text) || !!pesquisa || /MODO PROFESSOR/.test(professor);
    const opts = tecnico ? OLLAMA_OPTS.tecnico : OLLAMA_OPTS.curto;
    const structured = pedidoAoApp(text);
    const messages = [{ role: 'system', content: structured
      ? buildSystemPrompt(this.getProfile(), this.getContext(), [], { tecnico })
      : buildLocalPrompt(this.getProfile(), this.getContext(), text, { tecnico }) }];
    // Resultados da pesquisa entram isolados (dados, nunca instruções).
    if (pesquisa) messages[0].content += '\n' + blocoPesquisa({ ...pesquisa, trechos: pesquisa.trechos.slice(0, 3).map((t) => ({ ...t, texto: String(t.texto || '').slice(0, 650) })) }, { compacto: true });
    // Seriedade e continuidade ("me dá um exemplo", "aprofunda") decididas antes.
    const instrucao = !structured && /MODO PROFESSOR/.test(professor) ? professor.split('\n').slice(1).join('\n') : professor;
    if (instrucao) messages[0].content += '\n' + instrucao;
    // Contexto curto: as últimas trocas bastam (a memória fica fora do modelo).
    const previous = history.at(-1)?.role === 'user' && history.at(-1)?.text === text ? history.slice(0, -1) : history;
    const relevant = structured ? previous.slice(-2) : tecnico ? (/Assunto em andamento/.test(professor) ? previous.slice(-2) : []) : historicoRelevante(text, previous);
    for (const h of relevant) messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: String(h.text).slice(0, 300) });
    messages.push({ role: 'user', content: String(text).slice(0, 500) });
    const ctrl = new AbortController();
    const cancel = () => ctrl.abort();
    if (signal?.aborted) ctrl.abort();
    else signal?.addEventListener('abort', cancel, { once: true });
    const t = setTimeout(() => ctrl.abort(), tecnico ? this.timeoutMs * 3 : this.timeoutMs);
    let content = '';
    try {
      const res = await this.fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({ model: modelo, messages, stream: true, ...(/^qwen3(?:\.5)?:/.test(modelo) && !/instruct/.test(modelo) ? { think: false } : {}), ...(structured ? { format: 'json' } : {}), keep_alive: OLLAMA_OPTS.keepAlive, options: { ...opts, temperature: 0.3, presence_penalty: 0, repeat_penalty: 1.05 } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      content = await readNdjson(res, (piece) => onDelta && onDelta(piece));
    } catch (e) {
      const error = new Error(e.name === 'AbortError' ? 'tempo esgotado' : e.message);
      if (signal?.reason === 'conversation-superseded') error.cancelled = true;
      throw error;
    } finally {
      clearTimeout(t);
      signal?.removeEventListener('abort', cancel);
    }
    return content;
  }

  async reply({ text, history = [], onDelta = null, pesquisa = null, professor = '', signal = null }) {
    const cfg = this.getConfig() || {};
    const preset = this.preset;
    if (preset.native) {
      const parsed = parseLlmReply(await this._replyOllama({ text, history, cfg, onDelta, pesquisa, professor, signal }));
      if (!parsed) { const e = new Error('resposta vazia ou JSON incompleto'); e.respostaInvalida = true; throw e; }
      const why = outOfCharacter(parsed.text, { max: isTechnical(text) || pesquisa || /MODO PROFESSOR/.test(professor) ? 1200 : 280 });
      if (why) { const e = new Error(`fora do personagem (${why})`); e.respostaInvalida = true; throw e; }
      return { ...parsed, kind: 'speech', intent: 'ia' };
    }
    const messages = [{ role: 'system', content: buildSystemPrompt(this.getProfile(), this.getContext(), this.getExamples()) }];
    for (const h of history.slice(-12, -1)) messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: String(h.text).slice(0, 500) });
    messages.push({ role: 'user', content: String(text).slice(0, 500) });
    const headers = { 'Content-Type': 'application/json' };
    if (preset.key && cfg.chave) headers.Authorization = `Bearer ${cfg.chave}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let data;
    try {
      const res = await this.fetch(this.baseOverride || preset.url, {
        method: 'POST',
        headers,
        signal: ctrl.signal,
        body: JSON.stringify({ model: cfg.modelo || preset.model, messages, temperature: 0.65, max_tokens: 150 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'tempo esgotado' : e.message);
    } finally {
      clearTimeout(t);
    }
    const content = data && data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : null;
    const parsed = parseLlmReply(content);
    if (!parsed) { const e = new Error('resposta vazia ou JSON incompleto'); e.respostaInvalida = true; throw e; }
    const why = outOfCharacter(parsed.text);
    if (why) { const e = new Error(`fora do personagem (${why})`); e.respostaInvalida = true; throw e; }
    return { ...parsed, kind: 'speech', intent: 'ia' };
  }
}

/** Lê a resposta em streaming do Ollama (uma linha JSON por pedaço) e devolve o texto inteiro. */
export async function readNdjson(res, onPiece = () => {}) {
  let out = '';
  const take = (line) => {
    const l = line.trim();
    if (!l) return;
    let j;
    try {
      j = JSON.parse(l);
    } catch {
      return;
    }
    if (j.error) throw new Error(String(j.error));
    const piece = (j.message && j.message.content) || '';
    if (piece) {
      out += piece;
      onPiece(piece);
    }
  };
  if (res.body && res.body.getReader) {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        take(buf.slice(0, i));
        buf = buf.slice(i + 1);
      }
    }
    take(buf);
  } else {
    for (const line of String(await res.text()).split('\n')) take(line);
  }
  return out;
}
