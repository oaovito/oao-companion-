// Notas rápidas: guarda ideias e informações para consultar depois. Puro:
// estado salvo e data são injetados. Fica só neste PC, junto do progresso.

export const NOTE_LIMITS = Object.freeze({ total: 200, texto: 280, lista: 10, busca: 8 });

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => semAcento(s).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const limpa = (s) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NOTE_LIMITS.texto);

export function sanitizeNotes(input) {
  const out = [];
  for (const n of Array.isArray(input) ? input : []) {
    const texto = n && typeof n.texto === 'string' ? limpa(n.texto) : '';
    if (!texto || out.length >= NOTE_LIMITS.total) continue;
    out.push({ texto, dia: /^\d{4}-\d{2}-\d{2}$/.test(n.dia || '') ? n.dia : null });
  }
  return out;
}

/**
 * Pedido de nota em linguagem natural. Devolve a ação ou null. Não altera nada.
 * "anota: comprar creatina", "minhas notas", "procura nas notas creatina",
 * "apaga a nota 2", "apaga a nota sobre creatina".
 */
export function parseNoteRequest(text) {
  const original = String(text || '').replace(/^\s*jojo[,!:]?\s*/i, '').trim();
  const n = norm(original);
  if (!n || original.length > 400) return null;
  if (/^(minhas notas|ver (as |minhas )?notas|mostra\w* (as |minhas )?notas|quais (sao )?(as )?minhas notas|lista\w* (as |minhas )?notas|o que eu anotei)$/.test(n)) return { tipo: 'listar' };
  let m = n.match(/^(?:procura|busca|acha|encontra|pesquisa)\w*\s+(?:nas?\s+(?:minhas\s+)?notas?|(?:a|as|uma|minha)\s+notas?)\s+(?:sobre\s+|de\s+|com\s+|por\s+)?(.+)$/) || n.match(/^o que eu anotei sobre (.+)$/);
  if (m) return { tipo: 'buscar', busca: m[1].trim() };
  m = n.match(/^(?:apaga|apague|remove|remova|exclui|exclua|tira|tire|deleta|delete)\s+(?:a\s+|minha\s+)?nota\s+(?:numero\s+|n\s+)?(.+)$/);
  if (m) return /^\d{1,3}$/.test(m[1]) ? { tipo: 'apagar', numero: Number(m[1]) } : { tipo: 'apagar', busca: m[1].replace(/^(sobre|de|do|da|com)\s+/, '').trim() };
  // "anota…" sempre é nota; "nota:" precisa dos dois-pontos; "guarda/registra/salva" precisam dizer que é nota ou ideia.
  m = original.match(/^(?:anotar|anota|anote)(?![a-zà-ú])(?:\s+(?:isso|essa|pra\s+mim|para\s+mim|uma\s+nota|a[ií]))*\s*[:,-]?\s*(?:que\s+)?(.*)$/i)
    || original.match(/^(?:nota|nota\s+r[aá]pida|lembrete\s+pra\s+mim)\s*:\s*(.*)$/i)
    || original.match(/^(?:guarda|guarde|registra|registre|salva|salve)\s+(?:essa\s+ideia|essa\s+informa[cç][aã]o|isso\s+nas?\s+notas?|uma\s+nota|nas?\s+notas?)\s*[:,-]?\s*(?:que\s+)?(.*)$/i);
  if (m) return { tipo: 'guardar', texto: limpa(m[1]) };
  return null;
}

/** Comando "/nota …" e "/notas …". */
export function parseNoteCommand(arg) {
  const original = String(arg || '').trim();
  const n = norm(original);
  if (!n || /^(lista|listar|ver|todas)$/.test(n)) return { tipo: 'listar' };
  let m = n.match(/^(?:buscar|busca|procurar|procura|achar)\s+(.+)$/);
  if (m) return { tipo: 'buscar', busca: m[1] };
  m = n.match(/^(?:apagar|apaga|remover|remove|excluir|tirar)\s+(.+)$/);
  if (m) return /^\d{1,3}$/.test(m[1]) ? { tipo: 'apagar', numero: Number(m[1]) } : { tipo: 'apagar', busca: m[1] };
  return { tipo: 'guardar', texto: limpa(original) };
}

export class Notes {
  constructor({ state = null, save = () => {}, today = () => new Date() } = {}) {
    this.st = sanitizeNotes(state);
    this.save = save;
    this.today = today;
  }

  _dia() {
    const d = this.today();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Linha de dados de uma nota: número fixo (ordem em que foi guardada), data e texto. */
  _linha(i) {
    const n = this.st[i];
    const data = n.dia ? ` (${n.dia.slice(8, 10)}/${n.dia.slice(5, 7)})` : '';
    return `${i + 1}. ${n.texto}${data}`;
  }

  /** Aplica a ação. Devolve {fala, vars, itens?}: categoria do arquivo de falas + dados. */
  apply(a) {
    if (!a) return null;
    if (a.tipo === 'guardar') {
      if (!a.texto) return { fala: 'notaVazia', vars: {} };
      if (this.st.length >= NOTE_LIMITS.total) return { fala: 'notaCheia', vars: { total: NOTE_LIMITS.total } };
      this.st.push({ texto: a.texto, dia: this._dia() });
      this.save(this.st);
      return { fala: 'notaGuardada', vars: { n: this.st.length, total: this.st.length } };
    }
    if (a.tipo === 'listar') {
      if (!this.st.length) return { fala: 'notaNenhuma', vars: {} };
      const inicio = Math.max(0, this.st.length - NOTE_LIMITS.lista);
      const itens = [];
      for (let i = this.st.length - 1; i >= inicio; i--) itens.push(this._linha(i));
      if (inicio > 0) itens.push(`… e mais ${inicio} antigas. Use: procura nas notas <palavra>.`);
      return { fala: 'notaLista', vars: { total: this.st.length }, itens };
    }
    if (a.tipo === 'buscar') {
      const achadas = this._buscar(a.busca);
      if (!achadas.length) return { fala: 'notaBuscaNada', vars: { busca: a.busca } };
      return { fala: 'notaBusca', vars: { busca: a.busca, total: achadas.length }, itens: achadas.slice(-NOTE_LIMITS.busca).reverse().map((i) => this._linha(i)) };
    }
    if (a.tipo === 'apagar') {
      let i = -1;
      if (Number.isInteger(a.numero)) i = a.numero >= 1 && a.numero <= this.st.length ? a.numero - 1 : -1;
      else {
        const achadas = this._buscar(a.busca);
        // Mais de uma nota com a palavra: não apaga no chute; mostra para ela escolher o número.
        if (achadas.length > 1) return { fala: 'notaApagarQual', vars: { busca: a.busca, total: achadas.length }, itens: achadas.slice(-NOTE_LIMITS.busca).reverse().map((k) => this._linha(k)) };
        i = achadas.length ? achadas[0] : -1;
      }
      if (i < 0) return { fala: 'notaNaoAchei', vars: { busca: a.busca ?? String(a.numero) } };
      const [removida] = this.st.splice(i, 1);
      this.save(this.st);
      return { fala: 'notaApagada', vars: { n: i + 1 }, itens: [removida.texto] };
    }
    return null;
  }

  /** Índices das notas que contêm todas as palavras da busca (sem acento, sem caixa). */
  _buscar(busca) {
    const termos = norm(busca).split(' ').filter((t) => t.length >= 2);
    if (!termos.length) return [];
    const out = [];
    this.st.forEach((n, i) => { const t = norm(n.texto); if (termos.every((k) => t.includes(k))) out.push(i); });
    return out;
  }
}
