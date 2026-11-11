// Tutorial conduzido pelo JoJo. Puro: o conteúdo vem de assets/tutorial/pt-BR.json
// (fonte única, ligada aos comandos e às configurações) e o progresso é salvo
// junto do progresso dela. Aqui não há balão, animação nem som: quem mostra é o
// companion.
//
// Estados: novo (instalação nova, abre sozinho) · antigo (já usava: recebe só um
// convite) · convidado · ativo · pausado · concluido.

const ESTADOS = ['novo', 'antigo', 'convidado', 'ativo', 'pausado', 'concluido'];

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Palavras de navegação aceitas na conversa enquanto o tutorial está ativo. */
export function parseTutorialNav(text) {
  const n = norm(text);
  if (/^(proximo|proxima|seguir|segue|avancar|avanca)$/.test(n)) return 'proximo';
  if (/^(voltar|volta|anterior)$/.test(n)) return 'voltar';
  if (/^(pular|pula)$/.test(n)) return 'pular';
  if (/^(pausar|pausar tutorial|pausa o tutorial)$/.test(n)) return 'pausar';
  return null;
}

/** Subcomando de /tutorial. */
export function parseTutorialCommand(arg) {
  const n = norm(arg);
  if (!n || /^(continuar|continua|comecar|comeca|iniciar|retomar)$/.test(n)) return { tipo: 'iniciar' };
  if (/^(lista|listar|funcoes|indice)$/.test(n)) return { tipo: 'lista' };
  if (/^(sair|encerrar|fechar|parar)$/.test(n)) return { tipo: 'sair' };
  if (/^(recomecar|reiniciar|do zero)$/.test(n)) return { tipo: 'recomecar' };
  if (/^(ajuda|comandos)$/.test(n)) return { tipo: 'ajuda' };
  const nav = parseTutorialNav(n) || (n === 'pausa' ? 'pausar' : null);
  if (nav) return { tipo: nav };
  return { tipo: 'funcao', busca: n };
}

export function sanitizeTutorial(st, { ids = [], existente = false } = {}) {
  const s = st && typeof st === 'object' ? st : {};
  const lista = (v) => [...new Set((Array.isArray(v) ? v : []).filter((id) => ids.includes(id)))];
  const estado = ESTADOS.includes(s.estado) ? s.estado : existente ? 'antigo' : 'novo';
  const funcao = ids.includes(s.funcao) ? s.funcao : null;
  const out = { estado, funcao, passo: Number.isInteger(s.passo) && s.passo >= 0 ? s.passo : 0, vistas: lista(s.vistas), puladas: lista(s.puladas), avulso: s.avulso === true, intro: s.intro === true, retorno: null,
    // Versão do conteúdo cujo convite (ou abertura) ela de fato viu, e as funções que existiam então.
    versaoVista: Number.isInteger(s.versaoVista) && s.versaoVista >= 0 ? s.versaoVista : 0, conhecidas: lista(s.conhecidas) };
  if (s.retorno && typeof s.retorno === 'object' && (s.retorno.funcao === null || ids.includes(s.retorno.funcao))) {
    out.retorno = { estado: ESTADOS.includes(s.retorno.estado) ? s.retorno.estado : 'pausado', funcao: s.retorno.funcao || null, passo: Number.isInteger(s.retorno.passo) ? s.retorno.passo : 0, intro: s.retorno.intro === true };
  }
  out.puladas = out.puladas.filter((id) => !out.vistas.includes(id));
  if (out.estado === 'ativo' && !out.funcao && !out.intro) out.estado = 'pausado';
  return out;
}

const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));

export class Tutorial {
  constructor({ data, state = null, save = () => {}, existente = false, vars = () => ({}) }) {
    this.data = data;
    this.funcs = data.funcoes;
    this.ids = this.funcs.map((f) => f.id);
    this.st = sanitizeTutorial(state, { ids: this.ids, existente });
    // Reabriu o app no meio do tutorial: fica pausado, com o progresso guardado.
    if (this.st.estado === 'ativo') this.st.estado = 'pausado';
    this._save = save;
    this.vars = vars;
    this.acertos = 0;
  }

  save() { this._save({ ...this.st, vistas: [...this.st.vistas], puladas: [...this.st.puladas] }); }
  get ativo() { return this.st.estado === 'ativo'; }
  t(key, vars = {}) { return fill(this.data.textos[key], { ...this.vars(), ...vars }); }
  func(id = this.st.funcao) { return this.funcs.find((f) => f.id === id) || null; }
  step() { const f = this.func(); return f ? f.passos[this.st.passo] || null : null; }

  /** Função pelo id ou por parte do título ("foco", "lista de tarefas"). */
  find(busca) {
    const n = norm(busca);
    if (!n) return null;
    return this.funcs.find((f) => norm(f.id) === n) || this.funcs.find((f) => norm(f.titulo) === n)
      || this.funcs.find((f) => norm(f.titulo).includes(n) || norm(f.id).includes(n.replace(/\s/g, ''))) || null;
  }

  pendentes() { return this.funcs.filter((f) => !this.st.vistas.includes(f.id) && !this.st.puladas.includes(f.id)); }

  /** Texto do passo atual: cabeçalho numerado, explicação e o exemplo para testar. */
  render() {
    if (this.st.intro && !this.st.funcao) return this.t('boasVindas');
    const f = this.func(), p = this.step();
    if (!f || !p) return '';
    const head = this.t('cabecalho', { titulo: f.titulo, funcao: this.funcs.indexOf(f) + 1, funcoes: this.funcs.length, passo: this.st.passo + 1, passos: f.passos.length });
    return [head, fill(p.texto, this.vars()), p.tente ? this.t('tente', { tente: p.tente }) : ''].filter(Boolean).join('\n');
  }

  _goto(funcao, passo = 0) { Object.assign(this.st, { estado: 'ativo', funcao, passo, intro: false }); }

  /** Abre sozinho na instalação nova: boas-vindas e espera o "próximo". */
  open() {
    Object.assign(this.st, { estado: 'ativo', funcao: null, passo: 0, intro: true, avulso: false, retorno: null });
    this.save();
    return this.render();
  }

  /**
   * Convite pendente: instalação nova (abre o tutorial) ou conteúdo novo desde a
   * última vez que ela viu um convite. null quando não há nada a mostrar.
   */
  pendingInvite() {
    const versao = Number.isInteger(this.data.versao) ? this.data.versao : 1;
    if (this.st.versaoVista >= versao) return null;
    if (this.st.estado === 'novo') return { tipo: 'abrir' };
    if (this.st.estado === 'ativo') return null; // já está no tutorial agora
    const novas = this.st.conhecidas.length ? this.funcs.filter((f) => !this.st.conhecidas.includes(f.id)) : [];
    return { tipo: 'convite', novas };
  }

  /** Texto do convite pendente (quem já usava). */
  invite() {
    const p = this.pendingInvite();
    if (p && p.novas && p.novas.length) return this.t('conviteNovidades', { novas: p.novas.map((f) => f.titulo).join(', '), id: p.novas[0].id });
    return this.t('convite');
  }

  /** Só depois de o convite (ou a abertura) aparecer de verdade na tela. */
  markInviteSeen() {
    this.st.versaoVista = Number.isInteger(this.data.versao) ? this.data.versao : 1;
    this.st.conhecidas = [...this.ids];
    if (this.st.estado === 'novo' || this.st.estado === 'antigo') this.st.estado = this.st.estado === 'novo' ? 'ativo' : 'convidado';
    this.save();
  }

  /** /tutorial: começa ou continua de onde parou. */
  start() {
    const s = this.st;
    s.versaoVista = Number.isInteger(this.data.versao) ? this.data.versao : 1;
    s.conhecidas = [...this.ids];
    if (s.estado === 'ativo') return this.render();
    if (s.estado === 'pausado' && (s.funcao || s.intro)) { s.estado = 'ativo'; this.save(); return `${this.t('retomado')}\n${this.render()}`; }
    const prox = this.pendentes()[0];
    if (!prox) { s.estado = 'concluido'; this.save(); return this._fim(); }
    s.avulso = false; s.retorno = null;
    this._goto(prox.id);
    this.save();
    return this.render();
  }

  /** /tutorial <função>: só aquela função, sem mexer na ordem do tutorial inteiro. */
  startOne(busca) {
    const f = this.find(busca);
    if (!f) return this.t('naoAchei');
    const s = this.st;
    if (!s.avulso) s.retorno = { estado: s.estado === 'ativo' ? 'pausado' : s.estado, funcao: s.funcao, passo: s.passo, intro: s.intro };
    this._goto(f.id);
    s.avulso = true;
    this.save();
    return this.render();
  }

  _fim() {
    const vistas = this.st.vistas.length, funcoes = this.funcs.length;
    const puladas = this.st.puladas.map((id) => this.func(id)?.titulo).filter(Boolean);
    return puladas.length ? this.t('concluidoComPuladas', { vistas, funcoes, puladas: puladas.join(', ') }) : this.t('concluido', { vistas, funcoes });
  }

  _closeFunction(vista) {
    const s = this.st, f = this.func();
    if (f) {
      if (vista) { if (!s.vistas.includes(f.id)) s.vistas.push(f.id); s.puladas = s.puladas.filter((id) => id !== f.id); }
      else if (!s.vistas.includes(f.id) && !s.puladas.includes(f.id)) s.puladas.push(f.id);
    }
    if (s.avulso) {
      const r = s.retorno || { estado: 'pausado', funcao: null, passo: 0, intro: false };
      Object.assign(s, { avulso: false, retorno: null, funcao: r.funcao, passo: r.passo, intro: r.intro });
      // Voltou para uma função que acabou de ser vista por fora: segue adiante ao retomar.
      if (s.funcao && s.vistas.includes(s.funcao)) { s.funcao = null; s.passo = 0; }
      s.estado = !this.pendentes().length && !s.funcao ? 'concluido' : ['novo', 'antigo', 'convidado'].includes(r.estado) ? 'convidado' : r.estado === 'concluido' ? 'concluido' : 'pausado';
      this.save();
      return vista ? this.t('fimAvulso', { titulo: f.titulo }) : this.t('pulado', { titulo: f.titulo, id: f.id });
    }
    const prox = this.pendentes()[0];
    if (!prox) {
      Object.assign(s, { estado: 'concluido', funcao: null, passo: 0 });
      this.save();
      return vista ? this._fim() : `${this.t('pulado', { titulo: f.titulo, id: f.id })}\n${this._fim()}`;
    }
    this._goto(prox.id);
    this.save();
    return vista ? this.render() : `${this.t('pulado', { titulo: f.titulo, id: f.id })}\n${this.render()}`;
  }

  /** Próximo passo (ou próxima função; no fim, a conclusão). */
  next() {
    const s = this.st;
    if (!this.ativo) return this.t('semTutorial');
    if (s.intro && !s.funcao) {
      const prox = this.pendentes()[0];
      if (!prox) { Object.assign(s, { estado: 'concluido', intro: false }); this.save(); return this._fim(); }
      this._goto(prox.id);
      this.save();
      return this.render();
    }
    const f = this.func();
    if (f && s.passo + 1 < f.passos.length) { s.passo++; this.save(); return this.render(); }
    return this._closeFunction(true);
  }

  /** Passo anterior; no primeiro passo, volta para a função anterior. */
  back() {
    const s = this.st;
    if (!this.ativo) return this.t('semTutorial');
    if (s.passo > 0) { s.passo--; this.save(); return this.render(); }
    const i = this.funcs.findIndex((f) => f.id === s.funcao);
    if (s.avulso || i <= 0) return `${this.t('inicioDaLista')}\n${this.render()}`;
    const ant = this.funcs[i - 1];
    this._goto(ant.id, ant.passos.length - 1);
    this.save();
    return this.render();
  }

  /** Pula a função atual; fica marcada para ver depois. */
  skip() {
    if (!this.ativo) return this.t('semTutorial');
    if (this.st.intro && !this.st.funcao) return this.pause();
    return this._closeFunction(false);
  }

  pause() {
    const s = this.st;
    if (!this.ativo) return this.t('semTutorial');
    const titulo = this.func()?.titulo || 'o começo';
    s.estado = 'pausado';
    this.save();
    return this.t('pausado', { titulo });
  }

  /** Encerra por agora: o que já foi visto continua salvo. */
  stop() {
    const s = this.st;
    if (s.avulso) { const r = s.retorno || {}; Object.assign(s, { avulso: false, retorno: null, funcao: r.funcao || null, passo: r.passo || 0, intro: !!r.intro }); }
    if (s.estado === 'ativo') s.estado = 'pausado';
    this.save();
    return this.t('encerrado');
  }

  restart() {
    Object.assign(this.st, { estado: 'ativo', funcao: null, passo: 0, vistas: [], puladas: [], avulso: false, intro: false, retorno: null });
    this._goto(this.funcs[0].id);
    this.save();
    return `${this.t('recomecado')}\n${this.render()}`;
  }

  /** O que ela acabou de fazer cumpre o passo atual? */
  matches(evento) {
    const p = this.ativo ? this.step() : null;
    const e = p && p.espera;
    if (!e || !evento) return false;
    if (e.comando) return evento.comando === e.comando;
    if (e.intent) return evento.intent === e.intent;
    if (e.config) return Array.isArray(evento.config) && evento.config.includes(e.config);
    if (e.evento) return evento.evento === e.evento;
    if (e.qualquer) return !!evento.mensagem;
    return false;
  }

  /** Ela fez o que o passo pedia: elogio curto e segue. */
  advance() {
    const frases = this.data.textos.acertou;
    const ok = frases[this.acertos++ % frases.length];
    return `${ok}\n${this.next()}`;
  }

  list() {
    const linhas = [this.t('lista')];
    let grupo = null;
    for (const f of this.funcs) {
      if (f.grupo !== grupo) { grupo = f.grupo; linhas.push(`${grupo}:`); }
      linhas.push(`${this.st.vistas.includes(f.id) ? '✓' : '·'} ${f.titulo} (/tutorial ${f.id})`);
    }
    return linhas.join('\n');
  }
}

/** Todos os comandos e configurações que o tutorial ensina (para o teste de cobertura). */
export function tutorialCoverage(data) {
  return { comandos: new Set(data.funcoes.flatMap((f) => f.comandos)), configuracoes: new Set(data.funcoes.flatMap((f) => f.configuracoes)), ids: data.funcoes.map((f) => f.id) };
}
