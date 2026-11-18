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

/**
 * Registro central dos comandos digitados no chat (começam com "/"). Fonte
 * única: o menu "/" das duas telas, o reconhecimento (parseCommand) e o teste
 * de cobertura do tutorial saem daqui. Comando novo entra só nesta lista.
 * `desc`: descrição curta mostrada no menu; `hint`: uso completo; `oculto`:
 * reconhecido, mas fora do menu (compatibilidade).
 */
export const COMMANDS = Object.freeze([
  { "id":"pet","cmd":"/pet","aliases":[],"label":"Tuck Away Pet","desc":"Mostra ou esconde o pet","hint":"Esconde o pet" },
  { "id":"quiet","cmd":"/silencio","aliases":["/silêncio"],"label":"Modo silencioso","desc":"Sem falas sozinho e sem bronca","hint":"Liga/desliga as falas espontâneas e broncas" },
  { "id":"settings","cmd":"/config","aliases":["/configuracoes"],"label":"Configurações","desc":"Abre as configurações","hint":"Abre as configurações" },
  { "id":"anim","cmd":"/anim","aliases":["/animacao","/animação"],"label":"Animação","desc":"Toca uma animação pelo nome","hint":"Toca uma animação do catálogo: /anim nome (ex.: /anim selfie)" },
  { "id":"jogo","cmd":"/jogo","aliases":["/jogar"],"label":"Mini-jogo","desc":"Abre um mini-jogo","hint":"Joga com o JoJo: /jogo, /jogo quiz, /jogo bolhas…" },
  { "id":"foco","cmd":"/foco","aliases":[],"label":"Foco junto","desc":"Bloco de foco, ciclos e Pomodoro","hint":"Bloco de foco com o JoJo: /foco 25, /foco treino, /foco pomodoro (4 ciclos com pausa), /foco 30 x3 pausa 10" },
  { "id":"estimulo","cmd":"/estimulo","aliases":["/estímulo"],"label":"Me dá estímulo","desc":"Uma animação surpresa","hint":"Uma animação surpresa" },
  { "id":"calma","cmd":"/calma","aliases":[],"label":"Calma","desc":"Dois minutos de calma","hint":"Padrão calmante por 2 min (cardume, cores suaves)" },
  { "id":"ritmo","cmd":"/ritmo","aliases":[],"label":"Ritmo","desc":"Sequência rítmica de 30 s","hint":"Sequência rítmica previsível por 30 s" },
  { "id":"bolhas","cmd":"/bolhas","aliases":[],"label":"Bolhas","desc":"Bolhas para estourar","hint":"Bolhas para estourar com clique, sem placar" },
  { "id":"resumo","cmd":"/resumo","aliases":[],"label":"Resumo do dia","desc":"Resumo do dia, manhã ou noite","hint":"O que rolou hoje. /resumo manha: o que há para fazer; /resumo noite: o que foi feito e o que ficou" },
  { "id":"reacao","cmd":"/reacao","aliases":["/reação","/meme","/anime"],"label":"Reação","desc":"Reação de meme, anime e afins","hint":"Memes, anime, comida, namorado e João: /reacao side eye, /reacao bankai…" },
  { "id":"trabalho","cmd":"/trabalho","aliases":["/trabalhar"],"label":"Modo Trabalho","desc":"JoJo quieto no canto","hint":"JoJo medita quieto no canto: /trabalho, /trabalho 50, /trabalho deep, /trabalho invisivel, /trabalho sair" },
  { "id":"vestir","cmd":"/vestir","aliases":["/roupa","/guardaroupa","/guarda-roupa"],"label":"Guarda-roupa","desc":"Guarda-roupa do JoJo","hint":"Veste o JoJo: /vestir (abre), /vestir coroa, /vestir surpresa, /vestir tirar" },
  { "id":"rotina","cmd":"/rotina","aliases":[],"label":"Rotina fixa","desc":"Rotina do dia em blocos","hint":"Rotina do dia: /rotina montar manha 7:00 estudo 14:00 treino 18:00 sono 22:30, /rotina ver, /rotina feito treino, /rotina limpar. Frase fixa: /rotina bom dia: texto" },
  { "id":"pausa","cmd":"/pausa","aliases":[],"label":"Pausa","desc":"Congela e solta o JoJo","hint":"Pausa/retoma o JoJo na hora" },
  { "id":"checkin","cmd":"/checkin","aliases":["/check-in","/energia"],"label":"Check-in","desc":"Energia do dia, de 1 a 5","hint":"Como você está hoje: /checkin (ele pergunta) ou /checkin 3 (energia de 1 a 5). Pouca energia: ele cobra menos; muita: ele cobra mais" },
  { "id":"estudo","cmd":"/estudo","aliases":["/estudar"],"label":"Estudo","desc":"Material de estudo","hint":"Revisão e resumo: /revisar tema (3 perguntas, uma por vez), /resumir texto, /estudo material (passa o conteúdo em várias mensagens e termina com \"pronto\"), /resumir material, /resumir notas tema, /estudo limpar" },
  { "id":"treino","cmd":"/treino","aliases":["/ficha"],"label":"Ficha de treino","desc":"Fichas e cargas do treino","hint":"Treino do dia e cargas: /treino (hoje), /treino ficha A: supino 4x10 40kg; remada 3x12, /treino carga supino 42,5, /treino historico supino, /treino feito, /treino apagar A" },
  { "id":"habito","cmd":"/habitos","aliases":["/habito","/hábito","/hábitos"],"label":"Hábitos","desc":"Sequências de treino, estudo e sono","hint":"Sequências de treino, estudo e sono: /habitos (progresso), /habito treino, /habito estudo, /habito sono, /habito treino desfazer" },
  { "id":"quebrar","cmd":"/quebrar","aliases":["/quebra","/passos"],"label":"Quebrar tarefa","desc":"Tarefa grande em passos","hint":"Transforma uma tarefa grande em passos pequenos: /quebrar estudar bioquímica (depois diga \"adiciona\" para ir à lista)" },
  { "id":"nota","cmd":"/nota","aliases":["/notas"],"label":"Notas rápidas","desc":"Guarda e acha ideias","hint":"Guarda e consulta ideias: /nota texto, /notas (lista), /notas buscar palavra, /notas apagar 2" },
  { "id":"tutorial","cmd":"/tutorial","aliases":["/ajuda"],"label":"Tutorial","desc":"Tutorial passo a passo","hint":"Eu te mostro cada função em passos curtos: /tutorial (começa ou continua), /tutorial lista, /tutorial foco (uma função só). Na conversa: próximo, voltar, pular, pausar" },
  { "id":"discord","cmd":"/discord","aliases":[],"label":"Bloqueio do Discord","desc":"Estado e histórico do bloqueio","hint":"Mostra se o bloqueio está ligado e o histórico do que ele viu e fez. Liga e desliga só nas Configurações" },
  { "id":"lembrete","cmd":"/lembrete","aliases":["/lembretes"],"label":"Lembretes","desc":"Água, pausa e remédio","hint":"Água, pausas e remédios: /lembrete (lista), /lembrete agua 60, /lembrete pausa 45, /lembrete remedio Nome 08:00, /lembrete remover Nome" },
  { "id":"revisar","cmd":"/revisar","aliases":["/revisao","/revisão"],"label":"Revisão","hint":"Três perguntas sobre um tema, uma por vez: /revisar fotossíntese, /revisar material (usa o que você passou em /estudo material)","desc":"Três perguntas sobre um tema" },
  { "id":"resumir","cmd":"/resumir","aliases":[],"label":"Resumir","hint":"Resume em 2 a 4 pontos: /resumir texto, /resumir material, /resumir notas tema","desc":"Resume um texto em pontos" },
  { "id":"colecao","cmd":"/colecao","aliases":["/coleção"],"label":"Coleção","hint":"Abre na Central tudo que você já viu comigo e o que falta descobrir","desc":"Coleção na Central" },
  { "id":"new","cmd":"/nova","aliases":[],"label":"Nova conversa","hint":"A conversa é uma só: este comando só confirma que ela continua","desc":"Continua a mesma conversa","oculto":true },
  { id: "agendar", cmd: "/agendar", aliases: ["/programar"], label: "Agendar no WhatsApp", desc: "Mensagem no WhatsApp com hora marcada", hint: "Eu mando no seu WhatsApp na hora marcada: /agendar Mãe | amanhã às 8h | bom dia. Também: \"manda 'bom dia' pra minha mãe amanhã às 8h\"" },
  { id: "agendados", cmd: "/agendados", aliases: ["/agendadas"], label: "Mensagens agendadas", desc: "Lista as mensagens programadas", hint: "Lista numerada das mensagens programadas no WhatsApp, com dia, hora e texto" },
  { id: "cancelar", cmd: "/cancelar", aliases: [], label: "Cancelar mensagem", desc: "Apaga uma mensagem programada", hint: "Apaga uma mensagem programada pelo número da lista: /cancelar 2 (veja os números em /agendados)" },
  { id: "whatsapp", cmd: "/whatsapp", aliases: ["/zap"], label: "WhatsApp", desc: "Conecta e mostra o WhatsApp", hint: "Abre a janela do WhatsApp: estado da conexão, QR code com os passos, contatos com nome e número, e as mensagens programadas com status" }
].map((c) => Object.freeze({ ...c, aliases: Object.freeze([...c.aliases]) })));

/** Comandos do menu "/" (todos os visíveis, na ordem do registro). */
export function commandMenu({ petVisible }) {
  return COMMANDS.filter((c) => !c.oculto).map((c) => {
    const pet = c.id === 'pet' ? { label: petVisible ? 'Tuck Away Pet' : 'Wake Pet', hint: petVisible ? 'Esconde o pet' : 'Mostra o pet' } : {};
    return { cmd: c.cmd, aliases: [...c.aliases], label: c.label, desc: c.desc, hint: c.hint, ...pet };
  });
}

const BY_NAME = new Map(COMMANDS.flatMap((c) => [c.cmd, ...c.aliases].map((n) => [n, c.id])));

/** Interpreta um comando. Retorna o id do comando ou null se não for comando. */
export function parseCommand(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t.startsWith('/')) return null;
  return BY_NAME.get(t.split(/\s+/)[0]) || 'unknown';
}
