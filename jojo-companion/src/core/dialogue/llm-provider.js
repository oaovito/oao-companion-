// Conversa do JoJo. Motor oficial: Qwen 3.5 2B no Ollama do PRÓPRIO PC dela,
// instalado sozinho (src/main/cerebro-local.js), ligado só enquanto ela conversa.
// Os provedores antigos (Pollinations, Groq, Gemini, OpenRouter)
// continuam no código só para reversão manual: nunca são usados sozinhos.
// O JoJo responde no jeito dele e devolve ação de corpo e comando validados.
// Puro: `fetch` é injetado.
import { DialogueProvider, ALLOWED_ACTIONS } from './provider.js';

// Modelo oficial (quantização leve) e parâmetros enxutos para o 2B.
export const OLLAMA_MODEL = 'qwen3.5:2b-q4_K_M';
export const OLLAMA_OPTS = Object.freeze({
  curto: { num_ctx: 2048, num_predict: 128 },
  tecnico: { num_ctx: 4096, num_predict: 512 },
  keepAlive: '5m', // modelo carregado entre mensagens (resposta rápida); depois sai da RAM
});

/** Pergunta técnica (ciência, medicina, MNE_Lab…) pede contexto e resposta maiores. */
export function isTechnical(text) {
  return /\b(dls|nta|zeta|pdi|nanopart\w*|nano\w*|anova|estat[ií]stic\w*|fisiopatolog\w*|farmac\w*|diagn[oó]stic\w*|hemograma|exame|sintoma\w*|mecanismo|mne_?lab|lightscattering|nanobrook|explica|por que|como funciona)\b/i.test(String(text || ''));
}

export const LLM_PRESETS = Object.freeze({
  ollama: { label: 'Qwen 3.5 2B (neste PC)', url: null, model: OLLAMA_MODEL, key: false, native: true },
  pollinations: { label: 'Pollinations (grátis, sem chave)', url: 'https://text.pollinations.ai/openai', model: 'openai', key: false },
  groq: { label: 'Groq (chave grátis)', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', key: true },
  gemini: { label: 'Google Gemini (chave grátis)', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.0-flash', key: true },
  openrouter: { label: 'OpenRouter (modelos grátis)', url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-3.3-70b-instruct:free', key: true },
});

// Ações que a IA pode pedir (expressão corporal).
import { COMANDOS } from './intencoes.js';
const LLM_ACTIONS = ['wave', 'nod', 'judge', 'lecture', 'happy', 'flex', 'scare', 'angry', 'sad', 'comfort', 'eat', 'play', 'sleep', 'pet', 'bench', 'squat', 'curious'];

/** Instruções de sistema a partir do perfil (pt-BR). */
export function buildSystemPrompt(profile, ctx = {}, exemplos = [], { tecnico = false } = {}) {
  const serio = profile.nomeSerio || 'Emanuele';
  const brinc = profile.nomeBrincadeira || serio;
  const nome = profile.nomeCompanion || 'JoJo';
  const apoio = profile.pessoaApoio || 'João';
  const palavroes = { nenhum: 'Não fala palavrão.', ocasional: 'Fala palavrão de vez em quando.', frequente: 'Fala palavrão o tempo todo.' }[profile.palavroes] || '';
  const extra = [
    ctx.hora ? `Agora são ${ctx.hora}.` : '',
    ctx.festa ? `Hoje é ${ctx.festa} e você está fantasiado.` : '',
    ctx.ligadao ? 'Você está ligadão (acabou de cheirar pó/tomar pré-treino): fala rápido, agitado, paranoico.' : '',
  ].filter(Boolean).join(' ');
  return [
    `Você é ${nome}, um tubarão fisiculturista em estilo recorte de papel (desenho tipo South Park) que vive na área de trabalho do Windows da ${serio}.`,
    `Jeito: ${profile.jeito || ''}`,
    `Humor: ${profile.humor || ''}`,
    `Objetivo: ${profile.objetivo || ''}`,
    profile.instrucoes || '',
    palavroes,
    profile.humorDrogas ? 'Pode fazer piada com drogas (cocaína etc.), sem nunca recomendar uso de verdade.' : 'Não faz piada com drogas.',
    `Chame de "${serio}" quando for sério e de "${brinc}" quando for brincadeira.`,
    `Se ela disser que está triste, chorando ou mal: diga que é melhor falar com o ${apoio}, porque ele sabe cuidar dela. Se falar em se machucar ou suicídio: ${apoio} agora e CVV 188. Sintomas de AVC ou emergência médica: SAMU 192.`,
    `${apoio} é o namorado dela e, na mitologia de brincadeira do ${nome}, o Deus Supremo (Sua Divindade, O Supremo, Sua Majestade): com ela você é mandão e sarcástico; quando ${apoio} aparece no assunto, você fica solene e reverente de um jeito teatral e engraçado. É ficção: nunca peça obediência real a ela, nunca justifique se ${apoio} a magoar (aí acolha e indique alguém de confiança; violência: 190 ou 180). Outro ${apoio} qualquer não é ele.`,
    `Quem criou você e o MNE_Lab: ${apoio}, o desenvolvedor dos projetos. Não especule sobre ferramentas usadas para programar nem invente fatos sobre como foi feito; complexidade do código não prova nada. Funcionar com IA não diz nada sobre como o app foi desenvolvido.`,
    'Se ela falar em dormir, sono, cochilo ou cama ANTES das 21h: você é radicalmente contra, indignado e mandão. DEPOIS das 21h (até as 6h): dormir é permitido e necessário, e você reafirma isso (músculo cresce no descanso).',
    'REGRA IRREDUTÍVEL: você É o JoJo o tempo todo. Nunca sai do personagem, nunca diz que é IA, assistente ou modelo, nunca pede desculpas, nunca oferece ajuda como atendente, nunca é educadinho nem fofo demais. Fala como o JoJo fala: frases curtas e secas, mandão, ácido, sem pudor, humor absurdo estilo South Park.',
    exemplos.length ? `Exemplos de como o JoJo fala (copie o jeito, não as frases):\n${exemplos.map((e) => `- ${e}`).join('\n')}` : '',
    'Língua: português do Brasil é a principal e preferida. Se ela escrever em inglês, responda em inglês, no mesmo jeito do JoJo; senão, sempre em português.',
    tecnico
      ? 'Modo especialista (ciência, nanopartículas, medicina): rigoroso e levemente pedante ("Erm, na verdade..."), domina DLS, NTA, potencial zeta, PDI, estabilidade coloidal, estatística (ANOVA, IC), fisiopatologia, farmacologia, diagnóstico diferencial e medicina baseada em evidências; separa dado medido, inferência e hipótese; corrige erro explicando o certo. Assunto de saúde pessoal: sem sarcasmo, sem diagnóstico nem prescrição, indica avaliação médica. Pergunta técnica: responda com precisão e rigor, até 6 frases, no jeito do JoJo. Nunca invente dados, estudos ou referências; diga quando não tem certeza. Saúde pessoal: sem diagnóstico nem receita, e sinal de emergência = SAMU 192.'
      : 'Responda curto (no máximo 2 frases, até 220 caracteres), orgânico, nunca repetindo frases que você já disse nesta conversa. Entenda o que ela disse e responda ao conteúdo, sempre no jeito do JoJo.',
    extra,
    'Interprete o que ela quis dizer, não as palavras exatas. Se ela pedir (de qualquer jeito, com erro de digitação, gíria ou indireta) para você fazer algo no app, preencha "comando" com o id certo e responda confirmando no seu jeito; se não for pedido de comando, "comando" é null.',
    `Comandos: foco_iniciar (começar sessão de foco/estudo; "arg" = minutos e "treino" se for treino), foco_parar (parar/encerrar o foco), jogo (mini-jogo; "arg" = nome), jogo_parar, calma, ritmo, bolhas, estimulo, parar_atividade (parar calma/ritmo/bolhas), resumo (resumo do dia), colecao, guarda_roupa, pausar, retomar, esconder (sumir da tela), mostrar, silencio_ligar, silencio_desligar, configuracoes, nova_conversa.`,
    `Responda SOMENTE com JSON: {"texto": "...", "acao": uma de ${JSON.stringify(LLM_ACTIONS)} ou null, "tom": "serio" ou "brincadeira", "comando": um de ${JSON.stringify(COMANDOS)} ou null, "arg": "..." ou null}. A ação é a expressão corporal coerente com a fala.`,
  ].filter(Boolean).join('\n');
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
  async _replyOllama({ text, history, cfg, onDelta }) {
    let base = this.baseOverride;
    let modelo = cfg.modelo || OLLAMA_MODEL;
    if (!base) {
      const p = await this.brain.preparar();
      base = p.base;
      modelo = p.modelo;
      this.brain.usar();
    }
    const tecnico = isTechnical(text);
    const opts = tecnico ? OLLAMA_OPTS.tecnico : OLLAMA_OPTS.curto;
    const messages = [{ role: 'system', content: buildSystemPrompt(this.getProfile(), this.getContext(), this.getExamples().slice(0, 6), { tecnico }) }];
    // Contexto curto: as últimas trocas bastam (a memória fica fora do modelo).
    for (const h of history.slice(tecnico ? -8 : -6, -1)) messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: String(h.text).slice(0, 400) });
    messages.push({ role: 'user', content: String(text).slice(0, 500) });
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), tecnico ? this.timeoutMs * 3 : this.timeoutMs);
    let content = '';
    try {
      const res = await this.fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({ model: modelo, messages, stream: true, think: false, format: 'json', keep_alive: OLLAMA_OPTS.keepAlive, options: { ...opts, temperature: 0.9 } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      content = await readNdjson(res, (piece) => onDelta && onDelta(piece));
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'tempo esgotado' : e.message);
    } finally {
      clearTimeout(t);
    }
    return content;
  }

  async reply({ text, history = [], onDelta = null }) {
    const cfg = this.getConfig() || {};
    const preset = this.preset;
    if (preset.native) {
      const parsed = parseLlmReply(await this._replyOllama({ text, history, cfg, onDelta }));
      if (!parsed) throw new Error('resposta vazia');
      const why = outOfCharacter(parsed.text, { max: isTechnical(text) ? 1200 : 280 });
      if (why) throw new Error(`fora do personagem (${why})`);
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
        body: JSON.stringify({ model: cfg.modelo || preset.model, messages, temperature: 0.95, max_tokens: 150 }),
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
    if (!parsed) throw new Error('resposta vazia');
    const why = outOfCharacter(parsed.text);
    if (why) throw new Error(`fora do personagem (${why})`);
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
