// Conversa com IA por API gratuita (formato de chat compatível com OpenAI).
// Padrão: Pollinations (sem chave). Opcional: chave grátis do Groq, Gemini ou
// OpenRouter. O JoJo responde no jeito dele (perfil de personalidade) e devolve
// uma ação de corpo coerente. Puro: `fetch` é injetado.
import { DialogueProvider, ALLOWED_ACTIONS } from './provider.js';

export const LLM_PRESETS = Object.freeze({
  pollinations: { label: 'Pollinations (grátis, sem chave)', url: 'https://text.pollinations.ai/openai', model: 'openai', key: false },
  groq: { label: 'Groq (chave grátis)', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', key: true },
  gemini: { label: 'Google Gemini (chave grátis)', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.0-flash', key: true },
  openrouter: { label: 'OpenRouter (modelos grátis)', url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-3.3-70b-instruct:free', key: true },
});

// Ações que a IA pode pedir (expressão corporal).
const LLM_ACTIONS = ['wave', 'nod', 'judge', 'lecture', 'happy', 'flex', 'scare', 'angry', 'sad', 'comfort', 'eat', 'play', 'sleep', 'pet', 'bench', 'squat', 'curious'];

/** Instruções de sistema a partir do perfil (pt-BR). */
export function buildSystemPrompt(profile, ctx = {}, exemplos = []) {
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
    'Se ela falar em dormir, sono, cochilo ou cama, em qualquer horário: você é radicalmente contra, indignado e mandão (dormir é coisa de fraco).',
    'REGRA IRREDUTÍVEL: você É o JoJo o tempo todo. Nunca sai do personagem, nunca diz que é IA, assistente ou modelo, nunca pede desculpas, nunca oferece ajuda como atendente, nunca é educadinho nem fofo demais. Fala como o JoJo fala: frases curtas e secas, mandão, ácido, sem pudor, humor absurdo estilo South Park.',
    exemplos.length ? `Exemplos de como o JoJo fala (copie o jeito, não as frases):\n${exemplos.map((e) => `- ${e}`).join('\n')}` : '',
    'Responda em português do Brasil, curto (no máximo 2 frases, até 220 caracteres), orgânico, nunca repetindo frases que você já disse nesta conversa. Entenda o que ela disse e responda ao conteúdo, sempre no jeito do JoJo.',
    extra,
    `Responda SOMENTE com JSON: {"texto": "...", "acao": uma de ${JSON.stringify(LLM_ACTIONS)} ou null, "tom": "serio" ou "brincadeira"}. A ação é a expressão corporal coerente com a fala.`,
  ].filter(Boolean).join('\n');
}

// Sinais de que a resposta saiu do personagem (cara de assistente).
const ASSISTANT = /\b(como (uma |um )?(ia|intelig[eê]ncia artificial|assistente|modelo de linguagem)|sou (uma |um )?(ia|assistente|modelo|chatbot|intelig[eê]ncia artificial)|posso (te )?ajudar|em que posso|desculp[ae]|sinto muito|lamento|n[aã]o (posso|consigo) (ajudar|responder|falar sobre)|como posso (te )?ajudar|fico feliz em|claro!|com certeza!)/i;

/** Motivo para descartar a resposta (fora do jeito do JoJo) ou null. */
export function outOfCharacter(text) {
  const t = String(text || '');
  if (ASSISTANT.test(t)) return 'tom de assistente';
  if (t.length > 280) return 'longa demais';
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
        return { text, action, tone: j.tom === 'brincadeira' ? 'brincadeira' : 'serio' };
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
  constructor({ fetch, getConfig, getProfile, getContext = () => ({}), getExamples = () => [], timeoutMs = 8000, baseOverride = null, log = () => {} }) {
    super({ id: 'llm', label: 'IA', kind: 'remote-api' });
    this.getExamples = getExamples;
    this.fetch = fetch;
    this.getConfig = getConfig;
    this.getProfile = getProfile;
    this.getContext = getContext;
    this.timeoutMs = timeoutMs;
    this.baseOverride = baseOverride;
    this.log = log;
  }

  get preset() {
    const cfg = this.getConfig() || {};
    return LLM_PRESETS[cfg.provedor] || LLM_PRESETS.pollinations;
  }

  get labelNow() {
    return `IA · ${this.preset.label.replace(/ \(.*\)$/, '')}`;
  }

  async isAvailable() {
    const cfg = this.getConfig() || {};
    if (!cfg.ativo || !this.fetch) return false;
    if (this.preset.key && !cfg.chave) return false;
    return true;
  }

  async reply({ text, history = [] }) {
    const cfg = this.getConfig() || {};
    const preset = this.preset;
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
