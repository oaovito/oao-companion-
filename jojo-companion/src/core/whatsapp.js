// Mensagens programadas no WhatsApp: datas e repetições em português, busca de
// contato, agenda e o relógio dos envios (aviso antes, envio, nova tentativa,
// atrasadas). Puro: quem envia de verdade é o processo principal (Baileys),
// injetado como `send`. Mensagem atrasada NUNCA é enviada sem ela mandar.

export const WA_LIMITES = Object.freeze({
  itens: 200, texto: 1000, avisoMs: 5 * 60e3, toleranciaMs: 2 * 60e3,
  tentativas: 3, esperaMs: 60e3, intervaloMs: 15e3, porDia: 40,
});

export const DIAS = Object.freeze(['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']);
export const WA_ERROS = Object.freeze(['sessao_desconectada', 'contato_nao_encontrado', 'sem_internet', 'falha_envio', 'limite_diario']);

/** Falha de envio: o que aconteceu e o que fazer, com a ação certa ('tentar' ou 'editar'). */
export const WA_MOTIVOS_ENVIO = Object.freeze({
  sessao_desconectada: { frase: 'O WhatsApp estava desconectado na hora do envio. Conecte e toque em Tentar de novo.', acao: 'tentar' },
  sem_internet: { frase: 'O PC estava sem internet na hora do envio. Confira a internet e toque em Tentar de novo.', acao: 'tentar' },
  contato_nao_encontrado: { frase: 'Esse número não tem WhatsApp. Toque em Editar e escolha outro contato.', acao: 'editar' },
  falha_envio: { frase: 'O WhatsApp recusou o envio. Toque em Tentar de novo; se repetir, abra o WhatsApp no celular.', acao: 'tentar' },
  limite_diario: { frase: 'Já saíram 40 mensagens nas últimas 24 horas, o limite para proteger seu número. Tente de novo mais tarde.', acao: 'tentar' },
});

/**
 * Status de uma mensagem programada para a tela: Agendada, Tentando de novo,
 * Atrasada, Falhou, Enviada ou Cancelada, com a frase do motivo quando falhou.
 */
export function statusItem(i) {
  const motivo = WA_MOTIVOS_ENVIO[i.ultimoErro] || WA_MOTIVOS_ENVIO.falha_envio;
  if (i.estado === 'falhou') return { chave: 'falhou', rotulo: 'Falhou', classe: 'bad', frase: motivo.frase, acao: motivo.acao };
  if (i.estado === 'atrasada') return { chave: 'atrasada', rotulo: 'Atrasada', classe: 'warn', frase: 'Passou da hora enquanto o JoJo estava fechado. Escolha enviar agora ou descartar.', acao: null };
  if (i.estado === 'enviada') return { chave: 'enviada', rotulo: 'Enviada', classe: 'ok', frase: '', acao: null };
  if (i.estado === 'cancelada') return { chave: 'cancelada', rotulo: 'Cancelada', classe: '', frase: '', acao: null };
  if (i.tentativas > 0) return { chave: 'tentando', rotulo: `Tentando de novo (${i.tentativas} de ${WA_LIMITES.tentativas})`, classe: 'warn', frase: motivo.frase.split('. ')[0] + '. Nova tentativa em 1 minuto.', acao: null };
  // Repetição em que a última vez falhou: continua agendada, mas o motivo fica à vista.
  if (i.ultimoErro) return { chave: 'agendada', rotulo: 'Agendada', classe: 'info', frase: `A última vez não saiu: ${motivo.frase}`, acao: null };
  return { chave: 'agendada', rotulo: 'Agendada', classe: 'info', frase: '', acao: null };
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const pad = (n) => String(n).padStart(2, '0');
export const dataKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (data, hora) => {
  const [y, m, d] = data.split('-').map(Number);
  const [h, mi] = hora.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi, 0, 0);
};

// ------------------------------------------------------------------ quando

const DIA_RE = '(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:s)?(?:-feira|s-feiras)?';
const diaIdx = (w) => ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].indexOf(norm(w).replace(/s$/, '').replace(/-feiras?$/, ''));

function lerHora(t) {
  if (/\bmeio[ -]dia\b/.test(t)) return { h: 12, m: 0, txt: /\bmeio[ -]dia\b/ };
  if (/\bmeia[ -]noite\b/.test(t)) return { h: 0, m: 0, txt: /\bmeia[ -]noite\b/ };
  const re = /\b(?:as|a|ate as)?\s*(\d{1,2})(?:(?::|h)(\d{2}))?(?:\s*(h|hs|hrs?|horas?)\b)?(?:\s+(?:da|de)\s+(manha|tarde|noite|madrugada))?\b/g;
  let melhor = null;
  for (const m of t.matchAll(re)) {
    const temMarca = m[2] != null || m[3] || m[4] || /\b(as|a)\s*$/.test(t.slice(0, m.index + m[0].indexOf(m[1])));
    if (!temMarca) continue;
    let h = Number(m[1]); const mi = Number(m[2] || 0);
    if (m[4] && (m[4] === 'tarde' || m[4] === 'noite') && h < 12) h += 12;
    if (h > 23 || mi > 59) continue;
    melhor = { h, m: mi };
  }
  return melhor;
}

/**
 * Lê data, hora e repetição de um trecho em português ("amanhã às 8h",
 * "toda segunda 7:30", "de segunda a sexta às 6h", "15/11 às 20h").
 * Devolve { data:'AAAA-MM-DD', hora:'HH:MM', repeticao } ou { erro }.
 */
export function parseQuando(texto, agora = new Date()) {
  let t = norm(texto).replace(/[–—]/g, '-');
  if (!t) return { erro: 'sem_hora' };
  // Datas escritas antes da hora: "15/11" não pode virar 15h.
  let data = null;
  const dm = t.match(/\b(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (dm) {
    let ano = dm[3] ? Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]) : agora.getFullYear();
    const d = new Date(ano, Number(dm[2]) - 1, Number(dm[1]));
    if (d.getMonth() !== Number(dm[2]) - 1) return { erro: 'data_invalida' };
    if (!dm[3] && dataKey(d) < dataKey(agora)) { ano++; d.setFullYear(ano); }
    data = dataKey(d);
    t = t.replace(dm[0], ' ');
  }
  let repeticao = { tipo: 'uma', dias: [] };
  if (/\b(todo dia|todos os dias|diariamente|toda manha|toda noite|toda tarde)\b/.test(t)) repeticao = { tipo: 'diaria', dias: [] };
  else if (/\b(de segunda a sexta|dias uteis|dia util|segunda a sexta)\b/.test(t)) repeticao = { tipo: 'dias', dias: [1, 2, 3, 4, 5] };
  else if (/\b(fins? de semana|todo fim de semana)\b/.test(t)) repeticao = { tipo: 'dias', dias: [0, 6] };
  else {
    const toda = t.match(new RegExp(`\\b(?:toda|todo|todas as|todos os)\\s+${DIA_RE}((?:\\s*(?:,|e)\\s*${DIA_RE})*)`));
    if (toda) {
      const dias = [...toda[0].matchAll(new RegExp(DIA_RE, 'g'))].map((m) => diaIdx(m[1])).filter((i) => i >= 0);
      repeticao = { tipo: dias.length === 1 ? 'semanal' : 'dias', dias: [...new Set(dias)].sort() };
    } else if (/\b(toda semana|semanalmente)\b/.test(t)) repeticao = { tipo: 'semanal', dias: [] };
  }
  const hm = lerHora(t);
  if (!hm) return { erro: 'sem_hora' };
  const hora = `${pad(hm.h)}:${pad(hm.m)}`;
  if (!data) {
    const base = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    if (/\bdepois de amanha\b/.test(t)) base.setDate(base.getDate() + 2);
    else if (/\bamanha\b/.test(t)) base.setDate(base.getDate() + 1);
    else if (repeticao.tipo === 'uma' || repeticao.tipo === 'semanal') {
      const dia = t.match(new RegExp(`\\b${DIA_RE}`));
      if (dia) {
        const w = diaIdx(dia[1]);
        let n = (w - base.getDay() + 7) % 7;
        if (n === 0 && at(dataKey(base), hora) <= agora) n = 7;
        base.setDate(base.getDate() + n);
      }
    }
    data = dataKey(base);
    // Só a hora e ela já passou hoje: amanhã.
    if (!/\b(hoje|amanha)\b/.test(t) && repeticao.tipo === 'uma' && !new RegExp(`\\b${DIA_RE}`).test(t) && at(data, hora) <= agora) {
      base.setDate(base.getDate() + 1);
      data = dataKey(base);
    }
  }
  if (repeticao.tipo === 'semanal' && !repeticao.dias.length) repeticao = { tipo: 'semanal', dias: [at(data, hora).getDay()] };
  const item = { data, hora, repeticao };
  if (repeticao.tipo === 'uma' && at(data, hora) <= agora) return { erro: 'passado', ...item };
  return item;
}

/** Próximo horário de envio depois de `depois` (ms), ou null se não há mais. */
export function proximoEnvio(item, depois) {
  const r = item.repeticao || { tipo: 'uma' };
  const primeiro = at(item.data, item.hora).getTime();
  if (r.tipo === 'uma') return primeiro > depois ? primeiro : null;
  const dias = r.tipo === 'diaria' ? [0, 1, 2, 3, 4, 5, 6] : r.dias;
  const inicio = new Date(Math.max(primeiro, depois - 864e5));
  for (let i = 0; i < 15; i++) {
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    const t = at(dataKey(d), item.hora).getTime();
    if (t >= primeiro && t > depois && dias.includes(d.getDay())) return t;
  }
  return null;
}

/** "amanhã às 08:00", "toda segunda às 07:30"… */
export function descreverQuando(item, agora = new Date()) {
  const r = item.repeticao || { tipo: 'uma' };
  if (r.tipo === 'diaria') return `todo dia às ${item.hora}`;
  if (r.tipo === 'semanal') return `toda ${DIAS[r.dias[0]]} às ${item.hora}`;
  if (r.tipo === 'dias') {
    if (r.dias.join() === '1,2,3,4,5') return `de segunda a sexta às ${item.hora}`;
    const nomes = r.dias.map((d) => DIAS[d]);
    return `${nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes[0]}, às ${item.hora}`;
  }
  const hoje = dataKey(agora);
  const amanha = dataKey(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1));
  const [, m, d] = item.data.split('-');
  return `${item.data === hoje ? 'hoje' : item.data === amanha ? 'amanhã' : `${DIAS[at(item.data, item.hora).getDay()]}, ${d}/${m}`} às ${item.hora}`;
}

// ---------------------------------------------------------------- destino

/** Número de telefone em JID do WhatsApp (Brasil sem DDI ganha 55), ou null. */
export function numeroParaJid(numero) {
  let d = String(numero || '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d.length >= 12 && d.length <= 15 ? `${d}@s.whatsapp.net` : null;
}

const APELIDOS = [['mae', 'mamae', 'mainha', 'mom', 'minha mae'], ['pai', 'papai', 'painho', 'dad'], ['avo', 'vovo', 'vó', 'vo'], ['namorado', 'mozao', 'amor', 'joao']];

/** Contatos e grupos que combinam com o que ela disse ("minha mãe", "grupo da faculdade"). */
export function buscarContatos(lista, busca) {
  let q = norm(busca).replace(/^(?:o|a|os|as|minha|meu|minhas|meus|pro|pra|para)\s+/, '').replace(/^grupo\s+(?:do|da|de|dos|das)?\s*/, '').replace(/[.!?,]+$/, '').trim();
  if (!q) return [];
  const sinonimos = APELIDOS.find((g) => g.includes(q)) || [q];
  const pontua = (c) => {
    const n = norm(c.nome);
    if (!n) return 0;
    if (sinonimos.includes(n)) return 4;
    if (sinonimos.some((s) => new RegExp(`(^|\\s)${s}(\\s|$)`).test(n))) return 3;
    if (n.startsWith(q)) return 2;
    if (q.length >= 3 && n.includes(q)) return 1;
    return 0;
  };
  return lista.map((c) => [pontua(c), c]).filter(([p]) => p > 0).sort((a, b) => b[0] - a[0] || norm(a[1].nome).localeCompare(norm(b[1].nome))).slice(0, 5).map(([, c]) => c);
}

// ------------------------------------------------------------- linguagem

const ASPAS = /["“”'‘’]([^"“”'‘’]{1,1000})["“”'‘’]/;
const QUANDO = /\b(hoje|amanha|depois de amanha|todo dia|todos os dias|diariamente|toda|todo|todas|todos|de segunda|dias uteis|domingo|segunda|terca|quarta|quinta|sexta|sabado|dia \d|\d{1,2}\/\d{1,2}|as \d|a \d|\d{1,2}(?::|h)\d{0,2}|meio[ -]dia|meia[ -]noite)\b/;

/**
 * "JoJo, manda 'bom dia' pra minha mãe amanhã às 8h", "envia pro grupo da
 * facul toda segunda às 7h dizendo bora estudar". null se não é um pedido de envio.
 */
export function parseAgendarNatural(texto, agora = new Date()) {
  const bruto = String(texto || '').replace(/^\s*jojo[,!:]?\s*/i, '').trim();
  const n = norm(bruto);
  if (!/^(manda|mande|envia|envie|agenda|agende|programa|programe|marca|marque)\b/.test(n)) return null;
  if (!/\b(pra|para|pro)\b/.test(n)) return null;
  let msg = null, resto = bruto;
  const q = bruto.match(ASPAS);
  if (q) { msg = q[1].trim(); resto = bruto.replace(q[0], ' '); }
  else {
    const diz = bruto.match(/\b(?:dizendo|falando|escrito|com o texto|com a mensagem)[:\s]+(.+)$/i);
    if (!diz) return null;
    msg = diz[1].trim(); resto = bruto.slice(0, diz.index);
  }
  if (!msg) return null;
  const r = norm(resto).replace(/^(manda|mande|envia|envie|agenda|agende|programa|programe|marca|marque)\s+(?:(?:uma|a|essa|esta)\s+)?(?:mensagem\s+)?(?:no\s+(?:whatsapp|whats|zap)\s+)?/, '');
  const dest = r.match(/\b(?:pra|para|pro)\s+(.+)$/);
  if (!dest) return null;
  // O destino vai até a primeira palavra de data/hora.
  const resto2 = dest[1];
  const corte = resto2.search(QUANDO);
  const destino = (corte >= 0 ? resto2.slice(0, corte) : resto2).replace(/\b(no|pelo)\s+(whatsapp|whats|zap)\b/, '').trim();
  const quandoTxt = corte >= 0 ? resto2.slice(corte) : '';
  if (!destino) return null;
  return { destinoBusca: destino, texto: msg.slice(0, WA_LIMITES.texto), quando: parseQuando(quandoTxt, agora) };
}

/** /agendar Destino | quando | texto */
export function parseAgendarComando(arg, agora = new Date()) {
  const partes = String(arg || '').split('|').map((p) => p.trim());
  if (partes.length < 3 || !partes[0] || !partes[2]) return null;
  return { destinoBusca: partes[0], texto: partes.slice(2).join('|').trim().slice(0, WA_LIMITES.texto), quando: parseQuando(partes[1], agora) };
}

// ------------------------------------------------------------------ agenda

const REPETICOES = ['uma', 'diaria', 'semanal', 'dias'];
const ESTADOS = ['agendada', 'atrasada', 'falhou', 'enviada', 'cancelada'];

export function sanitizeItem(x) {
  if (!x || typeof x !== 'object') return null;
  const d = x.destino || {};
  if (typeof d.jid !== 'string' || !/^[\w.:-]+@(s\.whatsapp\.net|g\.us|lid)$/.test(d.jid)) return null;
  if (typeof x.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.data) || typeof x.hora !== 'string' || !/^\d{2}:\d{2}$/.test(x.hora)) return null;
  const texto = typeof x.texto === 'string' ? x.texto.trim().slice(0, WA_LIMITES.texto) : '';
  if (!texto) return null;
  const r = x.repeticao && REPETICOES.includes(x.repeticao.tipo) ? x.repeticao : { tipo: 'uma', dias: [] };
  const dias = [...new Set((Array.isArray(r.dias) ? r.dias : []).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
  if ((r.tipo === 'dias' || r.tipo === 'semanal') && !dias.length) return null;
  const num = (v) => (Number.isFinite(v) ? v : null);
  return {
    id: typeof x.id === 'string' && /^[\w-]{1,40}$/.test(x.id) ? x.id : null,
    destino: { jid: d.jid, nome: String(d.nome || d.jid.split('@')[0]).slice(0, 80), tipo: d.tipo === 'grupo' ? 'grupo' : 'contato' },
    texto, data: x.data, hora: x.hora, repeticao: { tipo: r.tipo, dias: r.tipo === 'uma' || r.tipo === 'diaria' ? [] : dias },
    estado: ESTADOS.includes(x.estado) ? x.estado : 'agendada',
    proximo: num(x.proximo), tentativas: Number.isInteger(x.tentativas) ? x.tentativas : 0, retryEm: num(x.retryEm),
    avisado: num(x.avisado), ultimoErro: WA_ERROS.includes(x.ultimoErro) ? x.ultimoErro : null,
    enviadaEm: num(x.enviadaEm), criadaEm: num(x.criadaEm),
  };
}

export class WhatsAppAgenda {
  constructor({ load = () => [], save = () => {}, now = () => Date.now(), novoId = null } = {}) {
    this.now = now;
    this._save = save;
    this.seq = 0;
    this.novoId = novoId || (() => `w${this.now().toString(36)}${(++this.seq).toString(36)}`);
    this.itens = (Array.isArray(load()) ? load() : []).map(sanitizeItem).filter((i) => i && i.id).slice(-WA_LIMITES.itens);
    this.envios = []; // horários dos envios recentes (limite diário e intervalo)
  }

  save() { this._save(this.itens.map((i) => ({ ...i }))); }
  get(id) { return this.itens.find((i) => i.id === id) || null; }

  /** Ativas (agendada, atrasada, falhou), na ordem do próximo envio. */
  ativas() {
    return this.itens.filter((i) => ['agendada', 'atrasada', 'falhou'].includes(i.estado)).sort((a, b) => (a.proximo ?? Infinity) - (b.proximo ?? Infinity));
  }

  /** Item da lista numerada mostrada em /agendados (1, 2, 3…) ou pelo id. */
  porNumero(ref) {
    const n = Number(ref);
    return Number.isInteger(n) && n >= 1 ? this.ativas()[n - 1] || null : this.get(String(ref || ''));
  }

  add(dados) {
    if (this.ativas().length >= WA_LIMITES.itens) throw new Error('limite_itens');
    const item = sanitizeItem({ ...dados, id: this.novoId(), estado: 'agendada', criadaEm: this.now() });
    if (!item) throw new Error('item_invalido');
    item.proximo = proximoEnvio(item, this.now());
    if (item.proximo == null) throw new Error('passado');
    this.itens.push(item);
    this.save();
    return item;
  }

  edit(id, patch) {
    const atual = this.get(id);
    if (!atual) throw new Error('nao_encontrado');
    const item = sanitizeItem({ ...atual, ...patch, id, estado: 'agendada', tentativas: 0, retryEm: null, avisado: null, ultimoErro: null });
    if (!item) throw new Error('item_invalido');
    item.proximo = proximoEnvio(item, this.now());
    if (item.proximo == null) throw new Error('passado');
    Object.assign(atual, item);
    this.save();
    return atual;
  }

  remove(id) {
    const i = this.itens.findIndex((x) => x.id === id);
    if (i < 0) return null;
    const [item] = this.itens.splice(i, 1);
    this.save();
    return item;
  }

  /** Pula só esta vez (repetição) ou cancela (envio único). */
  pular(id) {
    const item = this.get(id);
    if (!item) return null;
    const prox = item.repeticao.tipo === 'uma' ? null : proximoEnvio(item, Math.max(this.now(), item.proximo || 0) + 1000);
    if (prox == null) { item.estado = 'cancelada'; item.proximo = null; } else Object.assign(item, { estado: 'agendada', proximo: prox, avisado: null, tentativas: 0, retryEm: null });
    this.save();
    return item;
  }

  /**
   * Abriu o app depois do horário: essas não são enviadas sozinhas. Ficam
   * "atrasadas" até ela mandar enviar ou descartar.
   */
  marcarAtrasadas(agora = this.now()) {
    const out = [];
    for (const i of this.itens) {
      // A hora que valia era a do envio ou a da nova tentativa: passou muito dela, vira atrasada.
      const hora = i.retryEm || i.proximo;
      if (i.estado === 'agendada' && hora != null && hora < agora - WA_LIMITES.toleranciaMs && !i.envioManual) {
        i.estado = 'atrasada';
        i.retryEm = null;
        out.push(i);
      }
    }
    if (out.length) this.save();
    return out;
  }

  atrasadas() { return this.itens.filter((i) => i.estado === 'atrasada'); }

  /** Envio que falhou de vez: ela mandou tentar de novo agora (conta como pedido dela, não como atrasada). */
  tentarDeNovo(id, agora = this.now()) {
    const item = this.get(id);
    if (!item || item.estado !== 'falhou') return null;
    Object.assign(item, { estado: 'agendada', proximo: agora, avisado: agora, tentativas: 0, retryEm: null, ultimoErro: null, envioManual: true });
    this.save();
    return item;
  }

  /** 'enviar' agora ou 'descartar' (repetição segue para a próxima vez). */
  resolverAtrasada(id, acao, agora = this.now()) {
    const item = this.get(id);
    if (!item || item.estado !== 'atrasada') return null;
    if (acao === 'enviar') Object.assign(item, { estado: 'agendada', proximo: agora, avisado: agora, tentativas: 0, retryEm: null, envioManual: true });
    else {
      const prox = item.repeticao.tipo === 'uma' ? null : proximoEnvio(item, agora);
      if (prox == null) Object.assign(item, { estado: 'cancelada', proximo: null });
      else Object.assign(item, { estado: 'agendada', proximo: prox, avisado: null });
    }
    this.save();
    return item;
  }

  /**
   * Um passo do relógio: o que avisar (minutos antes), o que enviar agora e o
   * que passou da hora sem o app ter conseguido enviar (vira atrasada).
   */
  tick(agora = this.now()) {
    const avisar = [], enviar = [];
    const atrasadas = this.marcarAtrasadas(agora);
    for (const i of this.itens) {
      if (i.estado !== 'agendada' || i.proximo == null) continue;
      if (i.retryEm) { if (i.retryEm <= agora) enviar.push(i); continue; }
      if (i.proximo <= agora) enviar.push(i);
      else if (i.proximo - agora <= WA_LIMITES.avisoMs && i.avisado !== i.proximo) { i.avisado = i.proximo; avisar.push(i); }
    }
    if (avisar.length) this.save();
    return { avisar, enviar, atrasadas };
  }

  /** Pode enviar agora? Respeita o intervalo mínimo e o teto diário. */
  podeEnviar(agora = this.now()) {
    this.envios = this.envios.filter((t) => agora - t < 864e5);
    if (this.envios.length >= WA_LIMITES.porDia) return 'limite_diario';
    if (this.envios.length && agora - this.envios.at(-1) < WA_LIMITES.intervaloMs) return 'aguardar';
    return null;
  }

  marcarEnviada(id, agora = this.now()) {
    const item = this.get(id);
    if (!item) return null;
    this.envios.push(agora);
    const prox = item.repeticao.tipo === 'uma' ? null : proximoEnvio(item, Math.max(agora, item.proximo || 0) + 1000);
    Object.assign(item, { enviadaEm: agora, tentativas: 0, retryEm: null, ultimoErro: null, avisado: null, envioManual: undefined });
    if (prox == null) Object.assign(item, { estado: 'enviada', proximo: null });
    else Object.assign(item, { estado: 'agendada', proximo: prox });
    this.save();
    return item;
  }

  /** Falha: tenta de novo até o limite; contato inexistente e limite diário não repetem. */
  marcarFalha(id, erro, agora = this.now()) {
    const item = this.get(id);
    if (!item) return null;
    const codigo = WA_ERROS.includes(erro) ? erro : 'falha_envio';
    item.tentativas += 1;
    item.ultimoErro = codigo;
    const definitivo = codigo === 'contato_nao_encontrado' || codigo === 'limite_diario' || item.tentativas >= WA_LIMITES.tentativas;
    if (!definitivo) {
      item.retryEm = agora + WA_LIMITES.esperaMs;
      this.save();
      return { item, deNovo: true, tentativa: item.tentativas };
    }
    const prox = item.repeticao.tipo === 'uma' ? null : proximoEnvio(item, Math.max(agora, item.proximo || 0) + 1000);
    // Repetição: esta vez falhou, a próxima continua agendada (o erro fica registrado).
    if (prox == null) Object.assign(item, { estado: 'falhou', retryEm: null });
    else Object.assign(item, { estado: 'agendada', proximo: prox, retryEm: null, tentativas: 0, avisado: null });
    this.save();
    return { item, deNovo: false, tentativa: item.tentativas };
  }
}
