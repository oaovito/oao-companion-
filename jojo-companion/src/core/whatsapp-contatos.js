// Contatos do WhatsApp: de onde vem o nome, como o número aparece e como pessoas
// com o mesmo nome se diferenciam. Puro: o processo isolado junta o que o
// WhatsApp manda (ContatosWA) e o serviço prepara a lista da tela.
//
// Prioridade do nome: nome salvo na agenda do celular > nome que a pessoa pôs no
// perfil > número formatado. Um evento parcial nunca apaga o que já se sabia.

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const limparNome = (s) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) : '');

/** Só os dígitos. */
export const digitos = (x) => String(x || '').replace(/\D/g, '');

/** "5542999991234:3@s.whatsapp.net" → "5542999991234" (sem o aparelho). */
export function numeroDoJid(jid) {
  const m = /^(\d+)(?::\d+)?@s\.whatsapp\.net$/.exec(String(jid || ''));
  return m ? m[1] : null;
}

/** Número de pessoa válido para o WhatsApp (com DDI): 8 a 15 dígitos. */
export const numeroValido = (n) => /^\d{8,15}$/.test(String(n || ''));

/** JID de pessoa sem o número do aparelho, ou null. */
export function jidPessoa(jid) {
  const n = numeroDoJid(jid);
  return n && numeroValido(n) ? `${n}@s.whatsapp.net` : null;
}

// Códigos de país (ITU E.164): 1 e 7 têm um dígito, estes têm dois e o resto tem três.
const DDI_DOIS = new Set('20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98'.split(' '));
const ddiDe = (d) => (d[0] === '1' || d[0] === '7' ? d[0] : DDI_DOIS.has(d.slice(0, 2)) ? d.slice(0, 2) : d.slice(0, 3));

/**
 * "5542999991234" → "+55 (42) 99999-1234"; fixo "+55 (42) 3333-1234";
 * outros países: "+1 415 555 0101" (DDI separado do resto).
 */
export function formatarNumero(numero) {
  const d = digitos(numero);
  if (!d) return '';
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
    const ddd = d.slice(2, 4), resto = d.slice(4);
    return `+55 (${ddd}) ${resto.slice(0, resto.length - 4)}-${resto.slice(-4)}`;
  }
  if (d.length <= 6) return `+${d}`;
  const ddi = ddiDe(d);
  const r = d.slice(ddi.length);
  const partes = r.length > 7 ? [r.slice(0, r.length - 7), r.slice(-7, -4), r.slice(-4)] : [r.slice(0, r.length - 4), r.slice(-4)];
  return `+${ddi} ${partes.filter(Boolean).join(' ')}`;
}

/** Até duas letras para o avatar; sem nome (só número) usa "#". */
export function iniciais(nome) {
  const palavras = String(nome || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter((p) => /\p{L}/u.test(p));
  if (!palavras.length) return '#';
  const a = [...palavras[0]][0];
  const b = palavras.length > 1 ? [...palavras.at(-1)][0] : [...palavras[0]][1] || '';
  return `${a}${b}`.toUpperCase();
}

/** Nome mostrado: agenda > perfil > número formatado. */
export function nomeExibicao(c) {
  return limparNome(c?.nomeAgenda) || limparNome(c?.nomePerfil) || formatarNumero(c?.numero || numeroDoJid(c?.jid)) || 'Sem nome';
}

/**
 * Junta o que o WhatsApp manda sobre os contatos (Baileys 7): identificador por
 * número (@s.whatsapp.net) ou por LID (@lid), com o número às vezes em outro
 * campo ou só num mapeamento que chega depois.
 */
export class ContatosWA {
  constructor({ eu = null } = {}) {
    this.eu = eu;
    this.porNumero = new Map(); // jid de pessoa → { nomeAgenda, nomePerfil }
    this.lidParaJid = new Map(); // "123@lid" → jid de pessoa
    this.semNumero = new Map(); // "123@lid" → dados à espera do número
  }

  _mesclar(jid, c) {
    const atual = this.porNumero.get(jid) || { nomeAgenda: '', nomePerfil: '' };
    // Campo ausente ou vazio não apaga o nome que já se sabia.
    const agenda = limparNome(c.nomeAgenda ?? c.name);
    const perfil = limparNome(c.nomePerfil ?? c.notify) || limparNome(c.verifiedName);
    this.porNumero.set(jid, { nomeAgenda: agenda || atual.nomeAgenda, nomePerfil: perfil || atual.nomePerfil });
  }

  /** Um contato do WhatsApp (contacts.upsert/update, histórico). Devolve true se mudou algo. */
  aplicar(c) {
    if (!c || typeof c.id !== 'string') return false;
    const lid = /@lid$/.test(c.id) ? c.id.replace(/:\d+@/, '@') : typeof c.lid === 'string' && /@lid$/.test(c.lid) ? c.lid.replace(/:\d+@/, '@') : null;
    const jid = jidPessoa(c.id) || jidPessoa(c.phoneNumber) || (lid && this.lidParaJid.get(lid)) || null;
    if (jid && jid === this.eu) return false;
    if (jid) {
      if (lid) this.lidParaJid.set(lid, jid);
      if (lid && this.semNumero.has(lid)) { this._mesclar(jid, this.semNumero.get(lid)); this.semNumero.delete(lid); }
      this._mesclar(jid, c);
      return true;
    }
    if (!lid) return false;
    const antes = this.semNumero.get(lid) || {};
    this.semNumero.set(lid, {
      nomeAgenda: limparNome(c.name) || antes.nomeAgenda || '',
      nomePerfil: limparNome(c.notify) || limparNome(c.verifiedName) || antes.nomePerfil || '',
    });
    return false;
  }

  /** LID ↔ número (lid-mapping.update ou consulta local do Baileys). */
  mapear(lid, pn) {
    const l = String(lid || '').replace(/:\d+@/, '@');
    const jid = jidPessoa(String(pn || '').replace(/:\d+@/, '@'));
    if (!/@lid$/.test(l) || !jid || jid === this.eu) return false;
    this.lidParaJid.set(l, jid);
    const pend = this.semNumero.get(l);
    if (!pend) return false;
    this.semNumero.delete(l);
    this._mesclar(jid, pend);
    return true;
  }

  /** A própria conta (descoberta ao abrir a conexão) nunca aparece como contato. */
  definirEu(jid) {
    this.eu = jidPessoa(String(jid || '').replace(/:\d+@/, '@'));
    return this.eu ? this.porNumero.delete(this.eu) : false;
  }

  lidsSemNumero() { return [...this.semNumero.keys()]; }

  /** Para o serviço: pessoas com número, sem dados de conversa. */
  lista() {
    return [...this.porNumero].map(([jid, c]) => ({ jid, numero: numeroDoJid(jid), nomeAgenda: c.nomeAgenda, nomePerfil: c.nomePerfil, tipo: 'contato' }));
  }
}

/** Um contato vindo do processo isolado ou do disco, validado. Aceita o formato antigo { jid, nome }. */
export function contatoDoDisco(c, tipo) {
  if (!c || typeof c.jid !== 'string') return null;
  if (tipo === 'grupo') {
    if (!/^[\w.-]+@g\.us$/.test(c.jid)) return null;
    const nome = limparNome(c.nome);
    if (!nome) return null;
    const p = Number(c.participantes);
    return { jid: c.jid, nome, tipo: 'grupo', participantes: Number.isInteger(p) && p > 0 ? p : null };
  }
  const jid = jidPessoa(c.jid);
  if (!jid) return null;
  return { jid, nomeAgenda: limparNome(c.nomeAgenda ?? c.nome), nomePerfil: limparNome(c.nomePerfil), tipo: 'contato' };
}

/**
 * Lista pronta para a tela e para a conversa: nome escolhido pela prioridade,
 * número formatado, iniciais, texto de busca e aviso de nome repetido.
 */
export function prepararContatos(contatos = [], grupos = [], { ordenar = true } = {}) {
  const pessoas = contatos.map((c) => {
    const numero = numeroDoJid(c.jid);
    const nome = nomeExibicao({ ...c, numero });
    return { jid: c.jid, tipo: 'contato', nome, numero, numeroFormatado: formatarNumero(numero), nomeAgenda: c.nomeAgenda || '', nomePerfil: c.nomePerfil || '', iniciais: iniciais(c.nomeAgenda || c.nomePerfil ? nome : ''), semNome: !c.nomeAgenda && !c.nomePerfil };
  });
  const vezes = new Map();
  for (const p of pessoas) vezes.set(norm(p.nome), (vezes.get(norm(p.nome)) || 0) + 1);
  const ord = (a, b) => !ordenar ? 0 : a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }) || String(a.numero || a.jid).localeCompare(String(b.numero || b.jid));
  const listaPessoas = pessoas.map((p) => ({ ...p, homonimo: vezes.get(norm(p.nome)) > 1, busca: `${norm(p.nome)} ${norm(p.nomeAgenda)} ${norm(p.nomePerfil)} ${p.numero}` })).sort(ord);
  const listaGrupos = grupos.map((g) => ({ jid: g.jid, tipo: 'grupo', nome: g.nome, participantes: g.participantes || null, iniciais: iniciais(g.nome), homonimo: false, busca: norm(g.nome) })).sort(ord);
  const gv = new Map();
  for (const g of listaGrupos) gv.set(norm(g.nome), (gv.get(norm(g.nome)) || 0) + 1);
  for (const g of listaGrupos) g.homonimo = gv.get(norm(g.nome)) > 1;
  return { pessoas: listaPessoas, grupos: listaGrupos };
}

/** Busca por nome (sem acento) ou por número (3 dígitos ou mais). */
export function filtrarContatos(lista, consulta) {
  const q = norm(consulta);
  if (!q) return lista;
  const d = digitos(consulta);
  const soNumero = d.length >= 3 && !/[a-z]/.test(q);
  return lista.filter((c) => (soNumero ? String(c.numero || '').includes(d.replace(/^0+/, '')) : c.busca.includes(q)));
}

/** Rótulo curto de quem recebe, para confirmações: número da pessoa ou "grupo". */
export function descreverDestino(d) {
  if (!d) return '';
  if (d.tipo === 'grupo') return 'grupo do WhatsApp';
  return formatarNumero(numeroDoJid(d.jid) || d.numero) || '';
}
