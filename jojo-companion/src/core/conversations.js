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
    if (kind === 'chat') {
      const existing = [...this.conversations.values()].find((c) => c.kind === 'chat');
      if (existing) return existing;
      title = 'Conversa com o JoJo';
    }
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
    return c?.kind === 'chat' ? c : this.create();
  }

  setCurrent(id) {
    if (this.get(id)) {
      this.currentId = this.current().id;
      this._emit();
    }
  }

  newChat() {
    return this.current(); // compatibilidade de IPC/comando: nunca apaga ou divide a conversa
  }

  addMessage(id, who, text) {
    const c = this.get(id);
    if (!c) return null;
    c.messages.push({ who, text: String(text).slice(0, 2000), at: this.now() });
    if (c.messages.length > this.maxMessages) c.messages.splice(0, c.messages.length - this.maxMessages);
    // Atividades continuam com seu estado interno, mas suas falas aparecem na
    // única conversa visível. Não criam uma sala de chat por lembrete/erro.
    if (c.kind !== 'chat') this.addMessage(this.current().id, who, text);
    c.updatedAt = this.now();
    this._emit();
    return c;
  }

  setStatus(id, status, detail = null) {
    const c = this.get(id);
    if (!c) return;
    // "Pronto" para uma conversa que já está aberta na tela = visto.
    c.status = status === 'ready' && (this.viewing.has(id) || this.viewing.has(this.currentId)) ? 'idle' : status;
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

// ---------------------------------------------------------------- comandos

/** Comandos digitados no chat (começam com "/"). */
export function commandMenu({ petVisible }) {
  return [
    { cmd: '/pet', label: petVisible ? 'Tuck Away Pet' : 'Wake Pet', hint: petVisible ? 'Esconde o pet' : 'Mostra o pet' },
    { cmd: '/silencio', label: 'Modo silencioso', hint: 'Liga/desliga as falas espontâneas e broncas' },
    { cmd: '/config', label: 'Configurações', hint: 'Abre as configurações' },
    { cmd: '/anim', label: 'Animação', hint: 'Toca uma animação do catálogo: /anim nome (ex.: /anim selfie)' },
    { cmd: '/jogo', label: 'Mini-jogo', hint: 'Joga com o JoJo: /jogo, /jogo quiz, /jogo bolhas…' },
    { cmd: '/foco', label: 'Foco junto', hint: 'Bloco de foco com o JoJo: /foco 25, /foco treino, /foco pomodoro (4 ciclos com pausa), /foco 30 x3 pausa 10' },
    { cmd: '/estimulo', label: 'Me dá estímulo', hint: 'Uma animação surpresa' },
    { cmd: '/calma', label: 'Calma', hint: 'Padrão calmante por 2 min (cardume, cores suaves)' },
    { cmd: '/ritmo', label: 'Ritmo', hint: 'Sequência rítmica previsível por 30 s' },
    { cmd: '/bolhas', label: 'Bolhas', hint: 'Bolhas para estourar com clique, sem placar' },
    { cmd: '/resumo', label: 'Resumo do dia', hint: 'O que rolou hoje' },
    { cmd: '/reacao', label: 'Reação', hint: 'Memes, anime, comida, namorado e João: /reacao side eye, /reacao bankai…' },
    { cmd: '/trabalho', label: 'Modo Trabalho', hint: 'JoJo medita quieto no canto: /trabalho, /trabalho 50, /trabalho deep, /trabalho invisivel, /trabalho sair' },
    { cmd: '/vestir', label: 'Guarda-roupa', hint: 'Veste o JoJo: /vestir (abre), /vestir coroa, /vestir surpresa, /vestir tirar' },
    { cmd: '/rotina', label: 'Rotina fixa', hint: '/rotina bom dia: texto que ele diz sempre igual' },
    { cmd: '/pausa', label: 'Pausa', hint: 'Pausa/retoma o JoJo na hora' },
    { cmd: '/quebrar', label: 'Quebrar tarefa', hint: 'Transforma uma tarefa grande em passos pequenos: /quebrar estudar bioquímica (depois diga "adiciona" para ir à lista)' },
    { cmd: '/nota', label: 'Notas rápidas', hint: 'Guarda e consulta ideias: /nota texto, /notas (lista), /notas buscar palavra, /notas apagar 2' },
    { cmd: '/lembrete', label: 'Lembretes', hint: 'Água, pausas e remédios: /lembrete (lista), /lembrete agua 60, /lembrete pausa 45, /lembrete remedio Nome 08:00, /lembrete remover Nome' },
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
  if (name === '/anim' || name === '/animacao' || name === '/animação') return 'anim';
  const MAP = { '/jogo': 'jogo', '/jogar': 'jogo', '/foco': 'foco', '/estimulo': 'estimulo', '/estímulo': 'estimulo', '/calma': 'calma', '/ritmo': 'ritmo', '/bolhas': 'bolhas', '/resumo': 'resumo', '/rotina': 'rotina', '/pausa': 'pausa', '/lembrete': 'lembrete', '/lembretes': 'lembrete', '/nota': 'nota', '/notas': 'nota', '/quebrar': 'quebrar', '/quebra': 'quebrar', '/passos': 'quebrar', '/colecao': 'colecao', '/coleção': 'colecao', '/reacao': 'reacao', '/reação': 'reacao', '/meme': 'reacao', '/anime': 'reacao', '/trabalho': 'trabalho', '/trabalhar': 'trabalho', '/vestir': 'vestir', '/roupa': 'vestir', '/guardaroupa': 'vestir', '/guarda-roupa': 'vestir' };
  if (MAP[name]) return MAP[name];
  return 'unknown';
}
