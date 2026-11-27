// Ecossistema de animes no companion (25/11/2026). Completa o calendário de anime da 0.47.2
// (mesmo /anime, mesma chave animeAtivo, mesma fonte AniList) sem duplicá-lo: quando o serviço
// conecta o acompanhamento (`animeConectar`), as rotinas antigas passam a usar o novo sistema;
// sem conexão (testes antigos, falha ao abrir o arquivo), o comportamento antigo continua igual.
// Liga: acompanhamento e alertas (fila persistente), linguagem natural com contexto,
// visita temática com o pacote visual do anime (troca temporária, restauração total),
// sessões, recompensas em JOJOcoins pela carteira oficial e conquistas.
import { TIPOS_ALERTA, ultimoDisponivel } from './anime-acompanhamento.js';
import { intencaoAnime, acharNaLista, nomeParaBusca, escolherResultado, escolhaDaResposta, tipoDeAntecedencia, normAnime } from './anime-linguagem.js';
import { falaAnime } from './anime-falas.js';
import { quandoTexto, contagem, duracaoTexto, diaLocal, horaLocal } from './anime-tempo.js';
import { canaisDoPacote, paletaDoPacote, animAnime } from './anime-pacotes.js';
import { conquistaAnime, RECOMPENSA, valorBase } from './anime-recompensas.js';
import { visuaisLiberados, canaisDaTransformacao } from './visual-nivel.js';
import { canalMeme } from './memes-br.js';
import { interpretarMidia } from './anime-deteccao.js';

const MIN = 60e3, H = 3600e3, D = 86400e3;
const TICK_MS = 30e3;
const VISITA_MS = 20e3; // o tempo da visita temática (o cumprimento antigo também era 20 s)
const CTX_MS = 10 * MIN; // "esse anime", "terminei" sem nome: vale o último anime da conversa
const DESAMB_MS = 5 * MIN;
const ESPACO_FILA_MS = 25e3; // entre dois avisos da fila

/** Contexto visual (comportamento) de cada tipo de alerta. */
function contextoDoAlerta(tipo) {
  if (/^ev_/.test(tipo)) return { ev_adiado: 'adiamento', ev_pausa: 'adiamento', ev_retorno: 'disponivel', ev_encerrado: 'encerramento', ev_novaTemporada: 'novaTemporada' }[tipo] || 'avisoDia';
  if (tipo === 'horario') return 'disponivel';
  if (tipo === 'apos') return 'lembrete';
  if (['m5', 'm15'].includes(tipo)) return 'contagem';
  if (['h3', 'h1', 'm30'].includes(tipo)) return 'avisoProximo';
  const c = /^c(\d+)$/.exec(tipo);
  if (c) return Number(c[1]) <= 180 ? 'avisoProximo' : 'avisoDia';
  return 'avisoDia';
}

/** Chave de fala de cada tipo de alerta. */
function falaDoAlerta(tipo) {
  if (/^ev_/.test(tipo)) return { ev_adiado: 'adiamento', ev_pausa: 'pausa', ev_retorno: 'retorno', ev_encerrado: 'encerrado', ev_novaTemporada: 'novaTemporada' }[tipo];
  const c = /^c(\d+)$/.exec(tipo);
  if (c) return Number(c[1]) >= 1440 ? 'avisoDia' : 'avisoProximo';
  return { mes: 'avisoMes', semana: 'avisoSemana', dia: 'avisoDia', manha: 'avisoManha', horario: 'horario', apos: 'apos' }[tipo] || 'avisoProximo';
}

export function instalarAnime(Companion) {
  const P = Companion.prototype;
  const legado = { comandoAnime: P.comandoAnime, sincronizarAnime: P.sincronizarAnime, _visualCanais: P._visualCanais, _espacoVisuais: P._espacoVisuais };

  /**
   * Conecta o acompanhamento (serviço do processo principal). Migra a lista antiga
   * (configuração `animes`) e os episódios já cumprimentados (`animeAvisados`) sem apagar nada.
   */
  P.animeConectar = function ({ acomp, registro }) {
    this.animeAcomp = acomp;
    this.animeRegistro = registro;
    const s = this.store.get();
    for (const a of s.animes || []) {
      if (acomp.anime(a.id)) continue;
      try { acomp.seguir({ id: a.id, titulo: a.titulo, romaji: a.romaji || null, english: a.english || null, cor: a.cor || null }); } catch { /* entrada antiga inválida fica só na configuração */ }
    }
    const pares = [];
    for (const k of s.animeAvisados || []) {
      const [id, ep] = String(k).split(':');
      for (const tipo of Object.keys(TIPOS_ALERTA)) pares.push([`${id}:${ep}:${tipo}`, Number.MAX_SAFE_INTEGER]);
    }
    const ja = acomp.st.enviados;
    const novos = pares.filter(([c]) => !(c in ja));
    if (novos.length) acomp.marcarEnviados(novos);
    this._animeAgendarTick(4000);
  };

  P._animeAgora = function () { return this.animeAcomp ? this.animeAcomp.now() : this.dateNow().getTime(); };
  P._animeVars = function (extra = {}) {
    const apelido = this.personality?.get?.().apelido || 'Manu';
    return { apelido, ...extra };
  };
  P._animeFala = function (chave, vars = {}) { return falaAnime(chave, this._animeVars(vars), this.rng || Math.random); };

  /** Pode aparecer agora? (Trabalho, foco, tela cheia, LoL, escondido, silêncio, dormindo: espera.) */
  P._animePodeAparecer = function () {
    if (!this.started || this.work || this.focus || this.fullscreenHidden || this.lolHidden || this.userHidden || this.quitting) return false;
    if (this._canNag?.() === false) return false;
    if (this.behavior?.state === 'sleep') return false;
    return true;
  };

  // ---------------------------------------------------------------- ciclo

  P._animeAgendarTick = function (ms = TICK_MS) {
    if (this._animeTickH) this.clock.clearTimeout(this._animeTickH);
    this._animeTickH = this.clock.setTimeout(() => { this._animeTickH = null; try { this._animeTick(); } catch { /* o tique seguinte tenta de novo */ } if (!this.quitting) this._animeAgendarTick(); }, ms);
  };

  /** Tique: alertas devidos → fila; entrega um da fila se puder; sessão; créditos; resumo. */
  P._animeTick = function () {
    const ac = this.animeAcomp;
    if (!ac || !this.store.get().animeAtivo) return;
    const agora = ac.now();
    for (const d of ac.devidos(agora)) {
      if (d.descartar) { ac.marcarEnviados(d.cobre); continue; }
      ac.marcarEnviados([...d.cobre, [d.chave, d.quando]]);
      ac.enfileirar([d]);
    }
    if (this.animeApi && agora >= (this._animeSyncEm || 0) && !this._animeSincronizando) this.sincronizarAnime().catch(() => {});
    // Sessão manual: conta o tempo real (monotônico) até ela dizer que terminou.
    if (ac.st.sessao && !ac.st.sessao.pausada && ac.st.sessao.origem !== 'auto') ac.tickSessao({ tocando: true });
    this._animeDrenar();
    this._animeEntregarFila();
    this._animeResumoDiario(agora);
  };

  /** Entrega o próximo aviso da fila (um de cada vez, com intervalo). */
  P._animeEntregarFila = function () {
    const ac = this.animeAcomp;
    if (!ac || !ac.st.fila.length || !this._animePodeAparecer()) return false;
    const agora = ac.now();
    if (this._animeUltimoAviso && this.clock.now() - this._animeUltimoAviso < ESPACO_FILA_MS) return false;
    if (this.animeVisita && this.clock.now() < this.animeVisita.ate) return false;
    // Durante a sessão de anime: nada de aviso por cima do episódio.
    if (ac.st.sessao && !ac.st.sessao.pausada) return false;
    const f = ac.proximoDaFila(agora);
    if (!f) return false;
    ac.marcarEnviados([[f.chave, f.quando]]);
    this._animeUltimoAviso = this.clock.now();
    return this._animeAvisar(f);
  };

  /** Um aviso: visita temática + fala com dados reais. */
  P._animeAvisar = function (f) {
    const ac = this.animeAcomp;
    const a = ac.anime(f.anime);
    if (!a) return false;
    const agora = ac.now();
    const ctx = contextoDoAlerta(f.tipo);
    const prev = ac.previsao(a.id, f.episodio);
    const vars = {
      nome: a.titulo, ep: f.episodio ?? '', quando: f.quandoNovo || f.quando ? quandoTexto(f.quandoNovo || f.quando, agora, ac.fuso) : '',
      falta: f.quando > agora ? contagem(f.quando, agora).texto.replace(/\s\d+s$/, '') : '', moedas: prev?.valor ?? '',
      hora: f.quando ? quandoTexto(f.quando, agora, ac.fuso).replace(/^.* às /, '') : '',
    };
    if (f.tipo === 'ev_novaTemporada') { vars.nome = a.titulo; vars.quando = f.inicioTexto || 'sem data'; }
    let t = this._animeFala(falaDoAlerta(f.tipo) || 'avisoDia', vars);
    if (f.tipo === 'ev_novaTemporada' && !f.inicioTexto) t = this._animeFala('novaTemporadaSemData', vars);
    this._animeVisita(a, ctx);
    if (t) this.say(t, 'speech');
    return true;
  };

  // ---------------------------------------------------------------- visita temática

  /** Canais da fantasia inteira de um visual que já existe (pacote "visual"). */
  P._animeCanaisVisual = function (id) {
    const v = this._refs ? visuaisLiberados(this._refs, 99999).find((x) => x.id === id) : null;
    return v ? { [canalMeme(id)]: 1, ...canaisDaTransformacao(v) } : {};
  };

  /**
   * O JoJo vira o personagem do anime por um tempo (troca temporária: a roupa salva, a
   * fantasia do dia e o guarda-roupa voltam sozinhos no fim). Nunca mistura dois pacotes.
   */
  P._animeVisita = function (a, contexto, { ms = VISITA_MS, tocar = true } = {}) {
    const reg = this.animeRegistro;
    if (!reg) return null;
    const p = reg.doAnime(a);
    if (!p) return null;
    const agora = this.clock.now();
    const canais = canaisDoPacote(p, contexto, { visualCanais: (id) => this._animeCanaisVisual(id) });
    this.animeVisita = { ate: agora + ms, canais, paleta: paletaDoPacote(p), substitui: true, pacote: p.id, origem: p.origem, id: a.id, anime: a.id, contexto, estilo: p.estilo, visual: p.visual || null };
    if (this._animeVisitaH) this.clock.clearTimeout(this._animeVisitaH);
    this._animeVisitaH = this.clock.setTimeout(() => this._animeFimVisita(), ms + 50);
    if (tocar && this._animePodeAparecer()) this.playCatalog(animAnime(p.estilo, contexto), { source: 'evento', speak: false });
    this._applyLayout?.(true);
    return this.animeVisita;
  };

  P._animeFimVisita = function () {
    this._animeVisitaH = null;
    if (!this.animeVisita) return;
    if (this.clock.now() < this.animeVisita.ate) { this._animeVisitaH = this.clock.setTimeout(() => this._animeFimVisita(), this.animeVisita.ate - this.clock.now() + 50); return; }
    this.animeVisita = null;
    this._applyLayout?.(true);
  };

  /** A visita do pacote vale mais que o visual salvo (troca temporária e completa). */
  P._visualCanais = function (vestido) {
    const v = this.animeVisita;
    if (v?.substitui && this.clock.now() < v.ate) return { ...v.canais };
    return legado._visualCanais.call(this, vestido);
  };

  /** Durante a visita: a roupa, a fantasia do dia e o guarda-roupa saem (voltam depois). */
  P._animeVestido = function () { const v = this.animeVisita; return !!(v?.substitui && this.clock.now() < v.ate); };

  /** Estado para o overlay (cores do pacote). */
  P._animeEstado = function () {
    const v = this.animeVisita;
    if (!v?.substitui || this.clock.now() >= v.ate) return null;
    return { paleta: v.paleta, pacote: v.pacote, contexto: v.contexto };
  };

  /** Espaço da janela: o pacote parado medido (jojo.room.json → visuais, "ak:<pacote>"). */
  P._espacoVisuais = function (canais) {
    const base = legado._espacoVisuais.call(this, canais);
    const v = this.animeVisita;
    const tabela = this.room?.visuais;
    if (!v?.substitui || this.clock.now() >= v.ate || !tabela) return base;
    const e = tabela[`ak:${v.pacote}`] || tabela['ak:*'];
    if (!e) return base;
    return base ? { l: Math.max(base.l, e.l), t: Math.max(base.t, e.t), r: Math.max(base.r, e.r), b: Math.max(base.b, e.b) } : { ...e };
  };

  // ---------------------------------------------------------------- recompensas

  /** Fila de créditos → carteira oficial (Loja.creditar, idempotente). */
  P._animeDrenar = function () {
    const ac = this.animeAcomp;
    if (!ac || !this.loja || !ac.st.outbox.length) return [];
    // As moedas de anime têm reação própria (o gesto do anime); a genérica da loja espera.
    this._lojaGanhoUltimo = this.clock.now();
    return ac.drenarCreditos((c) => this.loja.creditar(c));
  };

  /** Depois de registrar um episódio: conquistas, créditos e a reação temática. */
  P._animeRecompensar = function (r) {
    const ac = this.animeAcomp;
    const conquistas = [];
    for (const [conta, n] of Object.entries(r.contas || {})) {
      let novas = [];
      try { novas = this.progress.count(conta, n, true); } catch { /* progressão indisponível: só as moedas */ }
      for (const q of novas) {
        const c = conquistaAnime(q.id);
        if (c) { ac.creditarConquista(c); conquistas.push(c); }
      }
    }
    const feitos = this._animeDrenar();
    const creditado = feitos.reduce((t, c) => t + (c.creditado || 0), 0);
    return { conquistas, creditado };
  };

  /** Texto e reação de um episódio registrado (concluído ou manual). */
  P._animeRespostaRegistro = function (r, { manual = false } = {}) {
    const ac = this.animeAcomp;
    const reg = r.registro;
    const a = ac.anime(reg.anime);
    const { conquistas, creditado } = this._animeRecompensar(r);
    const moedas = creditado || r.creditos.reduce((t, c) => t + c.valor, 0);
    const vars = { nome: reg.titulo, ep: reg.episodio, moedas: reg.moedasBase };
    const partes = [];
    if (reg.moedasBase > 0) partes.push(this._animeFala(manual ? 'manual' : reg.tipo === 'revisita' ? 'revisita' : 'conclusao', vars));
    else if (reg.motivoSemMoedas === 'tempo') partes.push(this._animeFala('manualSuspeito', vars));
    else if (reg.motivoSemMoedas === 'tetoDia') partes.push(this._animeFala('tetoDia', vars));
    else partes.push(this._animeFala('semRecompensa', vars));
    for (const b of reg.bonus || []) if (['primeiroEp', 'retomada', 'temporada', 'serie'].includes(b.id)) partes.push(this._animeFala(b.id, { nome: reg.titulo, moedas: b.valor }));
    for (const c of conquistas) { partes.push(this._animeFala('conquista', { titulo: c.nome, moedas: c.moedas })); this._carimbo?.(`Conquista: ${c.nome}`); }
    if (reg.relogioSuspeito) partes.push('O relógio do PC mudou no meio do episódio; contei só o tempo que passou de verdade.');
    // Reação: a maior coisa que aconteceu vira o contexto da visita.
    const ctx = conquistas.length ? 'conquista' : r.concluiuSerie || r.concluiuTemporada ? 'encerramento' : moedas > 0 ? 'moedas' : 'conclusao';
    if (a) this._animeVisita(a, ctx);
    this._animeCtx = { id: reg.anime, ate: this.clock.now() + CTX_MS };
    return partes.filter(Boolean).join(' ');
  };

  // ---------------------------------------------------------------- resumo diário

  P._animeResumoDiario = function (agora) {
    const ac = this.animeAcomp;
    if (!ac.st.config.resumoDiario || !this._animePodeAparecer()) return;
    const dia = diaLocal(agora, ac.fuso);
    if (ac.st.resumoDia === dia || agora < horaLocal(agora, 9, 0, ac.fuso)) return;
    const t = this._animeAgendaTexto('hoje', agora, { vazio: false });
    ac.marcarResumo(dia);
    if (t) this.say(this._animeFala('resumo', { lista: t }), 'speech');
  };

  /** Lista dos episódios dos animes acompanhados num período ("hoje", "amanha", "semana"). */
  P._animeAgendaTexto = function (quando, agora = this._animeAgora(), { vazio = true } = {}) {
    const ac = this.animeAcomp;
    const ini = quando === 'amanha' ? horaLocal(agora + D, 0, 0, ac.fuso) : horaLocal(agora, 0, 0, ac.fuso);
    const fim = quando === 'semana' ? ini + 7 * D : ini + D;
    const itens = [];
    for (const a of ac.acompanhados()) {
      for (const e of [...a.exibidos, ...(a.proximo ? [a.proximo] : [])]) {
        if (e.quando >= ini && e.quando < fim && !itens.some((x) => x.a.id === a.id && x.e.episodio === e.episodio)) itens.push({ a, e });
      }
    }
    itens.sort((x, y) => x.e.quando - y.e.quando);
    if (!itens.length) return vazio ? '' : null;
    return itens.slice(0, 12).map(({ a, e }) => {
      const prev = ac.previsao(a.id, e.episodio);
      return `${a.titulo} ep. ${e.episodio} ${quandoTexto(e.quando, agora, ac.fuso)}${e.quando > agora ? ` (faltam ${contagem(e.quando, agora).texto.replace(/\s\d+s$/, '')})` : ''}${prev ? `, vale ${prev.valor} JOJOcoins` : ''}`;
    }).join('; ');
  };

  // ---------------------------------------------------------------- sincronização

  /** Sincronização adaptativa: perto do lançamento, mais frequente; sem data, raramente. */
  P._animeProximaSync = function (agora) {
    const ac = this.animeAcomp;
    const seguidos = ac.acompanhados();
    if (!seguidos.length) return agora + 6 * H;
    const perto = seguidos.some((a) => a.proximo && a.proximo.quando - agora < 3 * H && a.proximo.quando - agora > -2 * H);
    if (perto) return agora + 15 * MIN;
    const comData = seguidos.some((a) => a.proximo);
    return agora + (comData ? 2 * H : 24 * H);
  };

  P.sincronizarAnime = async function ({ forcar = false } = {}) {
    if (!this.animeAcomp) return legado.sincronizarAnime.call(this);
    const s = this.store.get();
    const ac = this.animeAcomp;
    if (!s.animeAtivo || !this.animeApi) return [];
    const agora = ac.now();
    if (!forcar && this._animeSyncEm && agora < this._animeSyncEm) return [];
    if (this._animeSincronizando) return [];
    this._animeSincronizando = true;
    try {
      const ids = ac.acompanhados().map((a) => a.id);
      let eventos = [];
      if (ids.length) {
        const medias = await this.animeApi.detalhes(ids);
        eventos = ac.atualizar(medias);
      }
      if (ac.st.config.todosLancamentos && (!ac.st.janela || agora - ac.st.janela.em > 6 * H)) {
        try { ac.guardarJanela(await this.animeApi.janela(Math.floor(agora / 1000), Math.floor((agora + 7 * D) / 1000))); } catch { /* o calendário geral é extra */ }
      }
      const novos = eventos.map((e) => {
        const a = ac.anime(e.anime);
        const base = { chave: `ev:${e.tipo}:${e.anime}:${e.episodio ?? e.sequencia ?? ''}:${e.para ?? ''}`, anime: e.anime, episodio: e.episodio ?? a?.proximo?.episodio ?? null, tipo: `ev_${e.tipo}`, fire: agora, quando: agora + D, titulo: a?.titulo };
        if (e.tipo === 'adiado') base.quandoNovo = e.para;
        if (e.tipo === 'retorno' && e.quando) base.quandoNovo = e.quando;
        if (e.tipo === 'novaTemporada') base.inicioTexto = e.inicio ? quandoTexto(Date.UTC(e.inicio.ano || e.inicio.year, (e.inicio.mes || e.inicio.month || 1) - 1, e.inicio.dia || e.inicio.day || 1, 12), agora, ac.fuso).replace(/ às .*$/, '') : null;
        return base;
      });
      if (novos.length) ac.enfileirar(novos);
      this._animeSyncEm = this._animeProximaSync(agora);
      this._animeTick();
      return eventos;
    } catch (err) {
      // Fonte fora: usa o que já tem; tenta de novo quando o disjuntor fechar (ou em 15 min).
      this._animeSyncEm = agora + Math.max(15 * MIN, this.animeApi.abertoAte ? this.animeApi.abertoAte - agora : 0);
      return [];
    } finally { this._animeSincronizando = false; }
  };

  // ---------------------------------------------------------------- /anime

  P.comandoAnime = async function (arg) {
    if (!this.animeAcomp) return legado.comandoAnime.call(this, arg);
    const s = this.store.get();
    if (!s.animeAtivo) return this._animeFala('desligado');
    const q = String(arg || '').trim();
    const parar = q.match(/^(?:parar|para|tirar|tira|remover|esquecer)\s+(?:de\s+)?(?:seguir\s+)?(.+)$/i);
    if (parar) return this._animeExecutar({ tipo: 'parar', nome: parar[1] }, q);
    if (!q) {
      const ac = this.animeAcomp;
      const lista = ac.acompanhados();
      if (!lista.length) return this._animeFala('vazio');
      const agora = ac.now();
      return `Animes que eu sigo com você: ${lista.slice(0, 20).map((a) => (a.proximo && a.proximo.quando > agora ? `${a.titulo}: episódio ${a.proximo.episodio} ${quandoTexto(a.proximo.quando, agora, ac.fuso)}` : `${a.titulo}: sem data de episódio novo`)).join('; ')}.`;
    }
    return this._animeExecutar({ tipo: 'seguir', nome: q }, q);
  };

  // ---------------------------------------------------------------- conversa

  /**
   * Frase sobre anime (ou null para o resto da conversa seguir normal). Lembra o anime do
   * assunto por 10 min e resolve "qual deles?" quando a busca devolve vários.
   */
  P._animeConversa = async function (texto) {
    const ac = this.animeAcomp;
    if (!ac) return null;
    const agora = this.clock.now();
    const d = this._animeDesamb;
    if (d && agora < d.ate) {
      const escolhido = escolhaDaResposta(texto, d.opcoes);
      if (escolhido) { this._animeDesamb = null; return this._animeExecutar(d.intencao, texto, { media: escolhido }); }
    }
    const it = intencaoAnime(texto);
    if (!it) return null;
    const n = normAnime(texto);
    const fala = /\b(anime|episodio|ep|temporada|otaku|assistir|assistindo|jojocoin\w*)\b/.test(n);
    const temCtx = this._animeCtx && agora < this._animeCtx.ate;
    const sessao = !!ac.st.sessao;
    // Frases genéricas ("terminei", "pausa") só valem com assunto de anime em andamento.
    if (it.tipo === 'terminei' || it.tipo === 'iniciar') {
      const naLista = it.nome ? acharNaLista(it.nome, ac.lista()).length > 0 : false;
      if (!sessao && !temCtx && !naLista && !(fala && (it.nome || it.episodio))) return null;
    }
    if ((it.tipo === 'pausar' || it.tipo === 'retomar') && !sessao) return null;
    if (it.tipo === 'quantoGanhei' && !fala && !temCtx) return null;
    if (it.tipo === 'versao' && !temCtx && !it.nome) return null;
    if (!this.store.get().animeAtivo) return ['seguir', 'quando', 'agenda', 'alertaAntes'].includes(it.tipo) ? this._animeFala('desligado') : null;
    return this._animeExecutar(it, texto);
  };

  /** Anime do pedido: nome na lista dela (com erro de digitação e apelido) ou o do contexto. */
  P._animeDaLista = function (nome) {
    const ac = this.animeAcomp;
    if (nome) {
      const ach = acharNaLista(nome, ac.lista());
      if (ach.length && (ach.length === 1 || ach[0].nota - ach[1].nota >= 0.08 || ach[0].nota >= 0.92)) return ach[0].anime;
      return null;
    }
    if (ac.st.sessao) return ac.anime(ac.st.sessao.anime);
    if (this._animeCtx && this.clock.now() < this._animeCtx.ate) return ac.anime(this._animeCtx.id);
    return null;
  };

  /** Busca na fonte e escolhe (ou pergunta qual). Devolve { media } | { pergunta } | { erro }. */
  P._animeBuscar = async function (nome, intencao) {
    if (!this.animeApi) return { erro: this._animeFala('fonteFora') };
    let res;
    try { res = await this.animeApi.buscarCompleto(nomeParaBusca(nome)); } catch { return { erro: this._animeFala('fonteFora') }; }
    const e = escolherResultado(nome, res);
    if (e.escolhido) return { media: e.escolhido };
    if (e.opcoes?.length) {
      this._animeDesamb = { intencao, opcoes: e.opcoes, ate: this.clock.now() + DESAMB_MS };
      const lista = e.opcoes.map((m, i) => `${i + 1}) ${m.titulo}${m.formato === 'MOVIE' ? ' (filme)' : m.ano ? ` (${m.ano})` : ''}`).join(', ');
      return { pergunta: this._animeFala('qualDeles', { lista }) };
    }
    return { erro: this._animeFala('naoAchei', { q: String(nome).slice(0, 60) }) };
  };

  /** Executa uma intenção de anime e devolve a resposta (sempre no jeito do JoJo). */
  P._animeExecutar = async function (it, texto, { media = null } = {}) {
    const ac = this.animeAcomp;
    const agora = ac.now();
    const tz = ac.fuso;
    const ctx = (a) => { if (a) this._animeCtx = { id: a.id, ate: this.clock.now() + CTX_MS }; return a; };
    let a = media ? ac.anime(media.id) : this._animeDaLista(it.nome);
    // Pedidos que podem criar a entrada: busca na fonte.
    const resolver = async () => {
      if (a) return null;
      if (!it.nome && !media) return this._animeFala('naoSegue');
      const r = media ? { media } : await this._animeBuscar(it.nome, it);
      if (r.pergunta || r.erro) return r.pergunta || r.erro;
      const seg = ac.seguir(r.media, { versao: it.versao });
      if (!seg.ok) return 'Lista cheia. Tira algum antes.';
      a = ac.anime(r.media.id);
      this._animeLegadoAdicionar(a);
      return null;
    };
    switch (it.tipo) {
      case 'seguir': {
        const ja = a && a.pref.acompanhando;
        if (ja) return this._animeFala('jaSegue', { nome: ctx(a).titulo });
        if (a) { ac.seguir(a); ctx(a); } else { const p = await resolver(); if (p) return p; ctx(a); }
        this._animeSyncEm = 0;
        const prev = ac.previsao(a.id);
        const prox = a.proximo && a.proximo.quando > agora ? `Próximo: episódio ${a.proximo.episodio} ${quandoTexto(a.proximo.quando, agora, tz)} (horário de Brasília).` : 'Sem episódio novo marcado por enquanto.';
        const pac = this.animeRegistro?.doAnime(a);
        const vestido = pac ? ` Quando sair, eu aviso vestido de ${pac.nome}.` : '';
        return `${this._animeFala('seguir', { nome: a.titulo, prox })}${vestido}${prev ? ` Cada episódio vale ${prev.base} JOJOcoins.` : ''}`;
      }
      case 'parar': {
        if (!a) return this._animeFala('naoSegue');
        ac.deixar(a.id);
        this._animeLegadoRemover(a.id);
        return this._animeFala('deixar', { nome: a.titulo });
      }
      case 'favoritar': {
        if (!a) { const p = await resolver(); if (p) return p; }
        ac.configurar(a.id, { favorito: true });
        return this._animeFala('favoritar', { nome: ctx(a).titulo });
      }
      case 'alertaAntes': {
        if (!a) { if (!it.nome) return 'De qual anime?'; const p = await resolver(); if (p) return p; }
        const tipo = tipoDeAntecedencia(it.minutos);
        ac.configurar(a.id, { alertas: [...new Set([...ac.alertasDe(a), tipo])], notificar: true });
        return this._animeFala('alertaAntes', { nome: ctx(a).titulo, antes: duracaoTexto(it.minutos) });
      }
      case 'silenciar': {
        if (it.nome) {
          if (!a) return this._animeFala('naoSegue');
          if (it.minutos) ac.configurar(a.id, { silencioAte: agora + it.minutos * MIN });
          else ac.configurar(a.id, { notificar: false });
          return this._animeFala('silenciar', { nome: ctx(a).titulo });
        }
        const min = it.minutos === 'hoje' ? Math.max(30, (horaLocal(agora + D, 0, 0, tz) - agora) / MIN) : it.minutos || 24 * 60;
        ac.silenciar(null, agora + min * MIN);
        return this._animeFala('silenciarTudo', { quando: quandoTexto(agora + min * MIN, agora, tz) });
      }
      case 'versao': {
        if (!a) return 'De qual anime?';
        ac.configurar(a.id, { versao: it.versao });
        return this._animeFala(it.versao === 'dub' ? 'soDublado' : 'soLegendado', { nome: ctx(a).titulo });
      }
      case 'novaTemporada': {
        if (!a) { const p = await resolver(); if (p) return p; }
        ac.configurar(a.id, { futuras: true, notificar: true });
        return `Fechado: temporada nova de ${ctx(a).titulo} eu aviso assim que anunciarem.`;
      }
      case 'disponivelBR': {
        a = a || this._animeDaLista(null);
        if (!a?.proximo) return 'De qual anime? E sem horário de serviço no Brasil confirmado eu não chuto.';
        return this._animeFala('disponivelBR', { quando: quandoTexto(a.proximo.quando, agora, tz) });
      }
      case 'quando': {
        if (!a && it.nome) { const r = await this._animeBuscar(it.nome, it); if (r.pergunta || r.erro) return r.pergunta || r.erro; a = r.media; }
        a = a || this._animeDaLista(null);
        if (!a) return 'De qual anime?';
        ctx(ac.anime(a.id) || null);
        if (!a.proximo || a.proximo.quando <= agora) return this._animeFala('semData', { nome: a.titulo });
        return `${a.titulo}: episódio ${a.proximo.episodio} ${quandoTexto(a.proximo.quando, agora, tz)} (horário de Brasília; faltam ${contagem(a.proximo.quando, agora).texto.replace(/\s\d+s$/, '')}). Previsão da exibição no Japão; no serviço pode aparecer um pouco depois.`;
      }
      case 'agenda': {
        const t = this._animeAgendaTexto(it.quando, agora);
        const rot = { hoje: 'hoje', amanha: 'amanhã', semana: 'nesta semana' }[it.quando];
        if (!ac.acompanhados().length) return this._animeFala('vazio');
        return t ? `${rot[0].toUpperCase()}${rot.slice(1)}: ${t}.` : this._animeFala('agendaVazia', { quando: rot });
      }
      case 'resumo': {
        const t = this._animeAgendaTexto('hoje', agora);
        return t ? this._animeFala('resumo', { lista: t }) : this._animeFala('resumoVazio');
      }
      case 'pendentes': {
        const p = ac.pendentes(agora);
        if (!p.length) return this._animeFala('semPendentes');
        return this._animeFala('pendentes', { lista: p.slice(0, 6).map((x) => `${x.titulo} (${x.quantidade} ep.)`).join(', ') });
      }
      case 'quantoGanho': {
        if (!a && it.nome) { const r = await this._animeBuscar(it.nome, it); if (r.pergunta || r.erro) return r.pergunta || r.erro; media = r.media; a = ac.anime(media.id); }
        a = a || this._animeDaLista(null);
        if (!a && !media) return `Episódio de 24 min vale ${RECOMPENSA.convencional} JOJOcoins; curto, ${RECOMPENSA.curto}; filme, ${RECOMPENSA.filme}. Primeiro episódio de anime novo: +${RECOMPENSA.primeiroEp}. Temporada inteira: +${RECOMPENSA.temporada}.`;
        if (!a) return this._animeFala('quantoGanho', { nome: media.titulo, moedas: valorBase(media.formato, media.duracao), extra: `Se seguir, o primeiro episódio dá +${RECOMPENSA.primeiroEp}.` });
        const prev = ac.previsao(a.id, it.episodio);
        const extra = [prev.revisita ? 'Esse você já viu: revisita rende 20%.' : null, ...prev.bonus.map((b) => (b.id === 'primeiroEp' ? `+${b.valor} de primeiro episódio` : `+${b.valor} se fechar a temporada`)), prev.limiteDiaRestante < prev.base ? `Hoje só cabem mais ${prev.limiteDiaRestante}.` : null].filter(Boolean).join('; ');
        return this._animeFala('quantoGanho', { nome: ctx(a).titulo, moedas: prev.valor, extra: extra ? `${extra}.` : '' });
      }
      case 'quantoGanhei': {
        const e = ac.estatisticas(agora);
        const hoje = ac.st.stats.porDia[diaLocal(agora, tz)] || 0;
        return this._animeFala('quantoGanhei', { moedas: hoje, total: e.moedasTotal, saldo: this.loja ? this.loja.st.saldo : '—' });
      }
      case 'continuar': {
        const cand = (a ? [a] : ac.acompanhados().filter((x) => x.prog.interrompido || x.prog.ultimoVistoEm).sort((x, y) => (y.prog.interrompido?.em || y.prog.ultimoVistoEm) - (x.prog.interrompido?.em || x.prog.ultimoVistoEm)));
        for (const x of cand) {
          const ep = ac.proximoParaAssistir(x, agora);
          if (ep) return this._animeFala('continuar', { nome: ctx(x).titulo, ep });
        }
        return this._animeFala('nadaPraContinuar');
      }
      case 'iniciar': {
        if (!a && it.nome) { const p = await resolver(); if (p) return p; }
        if (!a) return 'Qual anime?';
        const r = ac.iniciarSessao({ anime: a.id, episodio: it.episodio ?? null });
        if (!r.ok) {
          if (r.motivo === 'outraSessao') return this._animeFala('sessaoJaAberta', { nome: ac.anime(r.sessao.anime)?.titulo || '' });
          if (r.motivo === 'episodioInvalido') return `Esse episódio ainda não existe. O último que saiu de ${a.titulo} é o ${Number.isFinite(r.ultimo) ? r.ultimo : '—'}.`;
          return 'Não deu pra começar a sessão.';
        }
        ctx(a);
        this._animeVisita(a, 'inicioSessao', { ms: 8000 });
        return this._animeFala('inicioSessao', { nome: a.titulo, ep: r.sessao.episodio });
      }
      case 'pausar': { const s = ac.pausar(); return s ? this._animeFala('pausar') : 'Não tem sessão rodando.'; }
      case 'retomar': {
        const s = ac.retomar();
        if (!s) return 'Não tem sessão pausada.';
        const f = ac.faltaParaConcluir();
        return this._animeFala('retomar', { falta: duracaoTexto(Math.max(1, Math.ceil(f / MIN))) });
      }
      case 'terminei': {
        if (ac.st.sessao && (!a || a.id === ac.st.sessao.anime) && (it.episodio == null || it.episodio === ac.st.sessao.episodio) && !it.fora) {
          const r = ac.concluirSessao();
          if (!r.ok && r.motivo === 'incompleto') return this._animeFala('cedoDemais', { falta: duracaoTexto(Math.max(1, Math.ceil(r.faltaMs / MIN))) });
          if (!r.ok) return 'Não achei a sessão.';
          return this._animeRespostaRegistro(r);
        }
        if (!a) { if (!it.nome) return 'Qual anime?'; const p = await resolver(); if (p) return p; }
        const ep = it.episodio ?? ac.proximoParaAssistir(a, agora);
        if (!ep) return `Não tem episódio disponível de ${a.titulo} pra marcar.`;
        const r = ac.registrarManual({ anime: a.id, episodio: ep });
        if (!r.ok) return r.motivo === 'episodioInvalido' ? `O episódio ${ep} de ${a.titulo} ainda não saiu. Último: ${Number.isFinite(r.ultimo) ? r.ultimo : '—'}.` : 'Não consegui registrar.';
        return this._animeRespostaRegistro(r, { manual: true });
      }
      case 'contador': {
        if (!a && it.nome) { const p = await resolver(); if (p) return p; }
        a = a || ac.acompanhados().filter((x) => x.proximo && x.proximo.quando > agora).sort((x, y) => x.proximo.quando - y.proximo.quando)[0] || null;
        if (!a?.proximo || a.proximo.quando <= agora) return a ? this._animeFala('semData', { nome: a.titulo }) : 'Nenhum anime seu tem episódio marcado.';
        ac.configurarGeral({ contador: true, contadorAnime: a.id });
        const r = this.timers?.iniciar({ atividade: 'personalizado', tipo: 'espelho', fonte: 'anime', rotulo: a.titulo, origem: 'anime', forcar: true });
        if (r?.erro === 'desligado') return 'Os timers estão desligados nas Configurações.';
        return `Contagem ligada: ${ctx(a).titulo}, episódio ${a.proximo.episodio}, faltam ${contagem(a.proximo.quando, agora).texto.replace(/\s\d+s$/, '')}.`;
      }
      case 'abrir': this.onOpenApp?.('animes'); return 'Abri a aba de animes na Central.';
      default: return null;
    }
  };

  /** Lista antiga (configuração `animes`): fica em dia para não ressuscitar anime removido. */
  P._animeLegadoAdicionar = function (a) {
    const s = this.store.get();
    if ((s.animes || []).some((x) => x.id === a.id) || (s.animes || []).length >= 40) return;
    this.store.update({ animes: [...(s.animes || []), { id: a.id, titulo: a.titulo, romaji: a.romaji || undefined, english: a.english || undefined, cor: a.cor || undefined }] }, { silent: true });
  };
  P._animeLegadoRemover = function (id) {
    const s = this.store.get();
    if ((s.animes || []).some((x) => x.id === id)) this.store.update({ animes: s.animes.filter((x) => x.id !== id) }, { silent: true });
  };

  // ---------------------------------------------------------------- contagem no timer

  /** Fonte "espelho" do timer: contagem até o próximo episódio do anime escolhido (ou o mais próximo). */
  P._timerFonteAnime = function () {
    const ac = this.animeAcomp;
    if (!ac) return null;
    const agora = ac.now();
    const id = ac.st.config.contadorAnime;
    const lista = ac.acompanhados().filter((a) => a.proximo && a.proximo.quando > agora && (!id || a.id === id)).sort((x, y) => x.proximo.quando - y.proximo.quando);
    const a = lista[0];
    if (!a) return null;
    const restanteMs = a.proximo.quando - agora;
    return { restanteMs, totalMs: Math.max(restanteMs, D), fase: `${a.titulo} ep. ${a.proximo.episodio}`.slice(0, 40) };
  };

  /**
   * Leitura da sessão de mídia (detecção opcional). Começa a sessão sozinha quando reconhece
   * um anime da lista tocando; avança só com reprodução real; quando a mídia some por 2 min,
   * conclui (se assistiu o bastante) ou guarda onde parou. Sessão manual nunca é tocada.
   */
  P.animeMidia = function (info) {
    const ac = this.animeAcomp;
    if (!ac || !ac.st.config.deteccao || !this.store.get().animeAtivo) return null;
    const m = info ? interpretarMidia(info, ac.lista()) : null;
    const s = ac.st.sessao;
    const agora = this.clock.now();
    if (s && s.origem !== 'auto') return null;
    if (m && s && s.anime === m.anime && (m.episodio == null || m.episodio === s.episodio)) {
      this._animeMidiaVista = agora;
      if (!m.tocando && !s.pausada) ac.pausar();
      else if (m.tocando && s.pausada) ac.retomar();
      else ac.tickSessao({ tocando: m.tocando, posicaoS: m.posicaoS });
      ac.marcarTelaCheia(!!this.fullscreenHidden);
      return 'tick';
    }
    if (s && (!m || m.anime !== s.anime || (m.episodio != null && m.episodio !== s.episodio))) {
      if (m || agora - (this._animeMidiaVista || 0) >= 2 * MIN) {
        const r = ac.faltaParaConcluir() === 0 ? ac.concluirSessao() : (ac.interromper(), null);
        if (r?.ok) { const t = this._animeRespostaRegistro(r); if (t && this._animePodeAparecer()) this.say(t, 'speech'); }
        if (!m) return 'fim';
      } else return 'espera';
    }
    if (m && m.tocando && !ac.st.sessao) {
      const r = ac.iniciarSessao({ anime: m.anime, episodio: m.episodio, origem: 'auto', posicaoS: m.posicaoS });
      if (r.ok) {
        this._animeMidiaVista = agora;
        const a = ac.anime(m.anime);
        this._animeCtx = { id: a.id, ate: agora + CTX_MS };
        // Espectador: senta com a pipoca, sem falar durante o episódio (e nada em tela cheia).
        if (this._animePodeAparecer()) this._animeVisita(a, 'inicioSessao', { ms: 8000 });
        return 'inicio';
      }
    }
    return null;
  };

  /** Resumo para a Central (cópia). */
  P.animeResumo = function () {
    const ac = this.animeAcomp;
    if (!ac) return null;
    const r = ac.resumo();
    const reg = this.animeRegistro;
    for (const a of r.animes) {
      const p = reg?.doAnime(a);
      a.pacote = p ? { id: p.id, nome: p.nome, origem: p.origem, estilo: p.estilo, cores: p.cores, completo: validarCompleto(p) } : null;
    }
    r.agora = ac.now();
    r.ativo = !!this.store.get().animeAtivo;
    r.saldo = this.loja ? this.loja.st.saldo : null;
    return r;
  };

  /** Os episódios do último disponível (para a Central mostrar o que dá para assistir). */
  P.animeUltimoDisponivel = function (id) { const a = this.animeAcomp?.anime(id); return a ? ultimoDisponivel(a, this.animeAcomp.now()) : null; };
}

const validarCompleto = (p) => p.origem === 'curado' || p.origem === 'visual' || !!p.completo;
