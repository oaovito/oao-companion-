// Conversas com o companion e o status de cada uma (a "atividade" mostrada no
// balão de status ao lado do pet). Puro, sem Electron. Fica só em memória
// durante a sessão (nada de histórico salvo em disco).
//
// Estados de atividade:
//   idle        — nada pendente
//   running     — o companion está respondendo (tarefa em execução)
//   needsInput  — aguardando resposta/decisão da usuária
//   ready       — concluída, ainda não vista
//   blocked     — falha ou erro de sistema

export const ACTIVITY_STATES = Object.freeze(['running', 'needsInput', 'ready', 'blocked']);

export const ACTIVITY_LABELS = Object.freeze({
  running: 'Em andamento',
  needsInput: 'Precisa de você',
  ready: 'Pronto',
  blocked: 'Bloqueado',
});

// Ordem de importância no balão (mais urgente primeiro).
const RANK = { blocked: 0, needsInput: 1, ready: 2, running: 3 };

export class ConversationManager {
  constructor({ now = () => Date.now(), maxMessages = 200 } = {}) {
    this.now = now;
    this.maxMessages = maxMessages;
    this.conversations = new Map();
    this.seq = 0;
    this.listeners = [];
    this.viewing = new Set(); // ids abertos em alguma tela (Central ou chat do pet)
    this.currentId = null;
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  _emit() {
    for (const l of this.listeners) l(this);
  }

  create({ title = 'Conversa', kind = 'chat', id = null } = {}) {
    const cid = id || `c${++this.seq}`;
    if (this.conversations.has(cid)) return this.conversations.get(cid);
    const c = { id: cid, title, kind, messages: [], status: 'idle', detail: null, updatedAt: this.now() };
    this.conversations.set(cid, c);
    if (kind === 'chat' && !this.currentId) this.currentId = cid;
    this._emit();
    return c;
  }

  get(id) {
    return this.conversations.get(id) || null;
  }

  /** Conversa de chat atual (cria uma se não houver). */
  current() {
    const c = this.currentId && this.get(this.currentId);
    return c || this.create({ title: 'Conversa 1' });
  }

  setCurrent(id) {
    if (this.get(id)) {
      this.currentId = id;
      this._emit();
    }
  }

  newChat() {
    const n = [...this.conversations.values()].filter((c) => c.kind === 'chat').length + 1;
    const c = this.create({ title: `Conversa ${n}` });
    this.currentId = c.id;
    this._emit();
    return c;
  }

  addMessage(id, who, text) {
    const c = this.get(id);
    if (!c) return null;
    c.messages.push({ who, text: String(text).slice(0, 2000), at: this.now() });
    if (c.messages.length > this.maxMessages) c.messages.splice(0, c.messages.length - this.maxMessages);
    if (who === 'user' && c.kind === 'chat' && c.messages.filter((m) => m.who === 'user').length === 1) {
      c.title = summarize(text) || c.title;
    }
    c.updatedAt = this.now();
    this._emit();
    return c;
  }

  setStatus(id, status, detail = null) {
    const c = this.get(id);
    if (!c) return;
    // "Pronto" para uma conversa que já está aberta na tela = visto.
    c.status = status === 'ready' && this.viewing.has(id) ? 'idle' : status;
    c.detail = detail;
    c.updatedAt = this.now();
    this._emit();
  }

  /** A usuária abriu a conversa: "pronto" vira visto. */
  markSeen(id) {
    const c = this.get(id);
    if (c && c.status === 'ready') {
      c.status = 'idle';
      c.detail = null;
      this._emit();
    }
  }

  setViewing(id, on) {
    if (on) {
      this.viewing.add(id);
      this.markSeen(id);
    } else this.viewing.delete(id);
  }

  /** Atividades visíveis no balão: conversas com status diferente de idle. */
  activities(limit = 4) {
    return [...this.conversations.values()]
      .filter((c) => c.status !== 'idle')
      .sort((a, b) => RANK[a.status] - RANK[b.status] || b.updatedAt - a.updatedAt)
      .slice(0, limit)
      .map((c) => ({ id: c.id, title: c.title, status: c.status, label: ACTIVITY_LABELS[c.status], detail: c.detail }));
  }

  list() {
    return [...this.conversations.values()]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((c) => ({ id: c.id, title: c.title, kind: c.kind, status: c.status, label: ACTIVITY_LABELS[c.status] || null, detail: c.detail, updatedAt: c.updatedAt }));
  }

  snapshot(id) {
    const c = this.get(id);
    return c ? { id: c.id, title: c.title, kind: c.kind, status: c.status, detail: c.detail, messages: c.messages.slice() } : null;
  }
}

function summarize(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > 28 ? `${t.slice(0, 27)}…` : t;
}

// ---------------------------------------------------------------- comandos

/** Comandos digitados no chat (começam com "/"). */
export function commandMenu({ petVisible }) {
  return [
    { cmd: '/pet', label: petVisible ? 'Tuck Away Pet' : 'Wake Pet', hint: petVisible ? 'Esconde o pet' : 'Mostra o pet' },
    { cmd: '/silencio', label: 'Modo silencioso', hint: 'Liga/desliga as falas espontâneas e broncas' },
    { cmd: '/nova', label: 'Nova conversa', hint: 'Começa uma conversa nova' },
    { cmd: '/config', label: 'Configurações', hint: 'Abre as configurações' },
  ];
}

/** Interpreta um comando. Retorna o id do comando ou null se não for comando. */
export function parseCommand(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t.startsWith('/')) return null;
  const name = t.split(/\s+/)[0];
  if (name === '/pet') return 'pet';
  if (name === '/silencio' || name === '/silêncio') return 'quiet';
  if (name === '/nova') return 'new';
  if (name === '/config' || name === '/configuracoes') return 'settings';
  return 'unknown';
}
