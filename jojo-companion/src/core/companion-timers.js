// Timers no companion (0.47.5): liga o gerenciador puro (timers.js) ao JoJo — falas,
// animações com o relógio, relógio na janela, XP, hábitos, tarefas, foco e lembretes.
// Instalado no protótipo do Companion (mesmo padrão dos outros sistemas, sem mexer neles).
import { GerenciadorTimers, ATIVIDADES, TIMER_LIMITES, parseTimerRequest, parseTimerCommand, respostaConfirmacao, respostaOferta, duracaoFalada, formatarTempo, caixaRelogio, aparenciaDoTimer, sanitizeAtividades, sanitizeOffset } from './timers.js';
import { animsDaFase, ANIM_TIMER_POR_ID, ESPACO_ANIM_TIMER, timerDaAnim } from './timer-anims.js';
import { placeAround } from './layout.js';
import { clampRectInto } from './geometry.js';
import { profileVars } from './personality.js';

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Falas dos timers no jeito do JoJo (sério, mandão, seco). Exemplos do pedido incluídos. */
export const FALAS_TIMER = Object.freeze({
  inicio: ['Você tem {dur}. Tente não desperdiçar {durMenos}.', 'Relógio ligado: {dur}. Vai.', 'Contando {dur}. Eu tô de olho, {nome}.'],
  inicioProgressivo: ['Cronômetro ligado. Eu conto cada segundo, {nome}.', 'Tá correndo. Eu anoto tudo.'],
  inicioIntervalado: ['{n} rodadas de {fase}. Eu marco cada uma.', 'Intervalos ligados: {n} vezes. Sem enrolar.'],
  pausaCedo: ['Já? Interessante conceito de resistência.', 'Pausou com {pct}%. Resistência de sardinha.'],
  pausa: ['Pausado. O relógio espera. Eu também, impaciente.', 'Congelei o tempo. Volta logo.'],
  retomada: ['Voltou. Bom. Continua.', 'Descongelado. Bora.'],
  metade: ['Metade da missão. Continue.', 'Metade. Nem pense em parar agora.'],
  final: ['Falta pouco. Segura firme.', 'Reta final, {nome}.'],
  ultimos: ['Dez segundos. Não estrague tudo agora.', 'Dez. Segura.'],
  fim: ['Tempo encerrado. Sobreviveu. Impressionante.', 'Acabou: {dur} cumpridos. Anotado.', 'Fim do timer. Missão cumprida, {nome}.'],
  fimConfirmar: ['Tempo encerrado. Fez mesmo? Responde "fiz" que eu marco.', 'Acabou. Fez tudo? Diz "fiz" e eu anoto. Mentir pra tubarão dá azar.'],
  confirmado: ['Anotado. Isso é shape sendo construído.', 'Confirmado. Respeito.'],
  negado: ['Sem XP então. Honestidade eu respeito. Preguiça, não.', 'Tá. Fica pra próxima.'],
  ignorado: ['Esse relógio está fazendo mais esforço que você.'],
  cancelado: ['Timer cancelado. Fingimos que não aconteceu.', 'Cancelado. O relógio agradece a folga.'],
  meta: ['Meta de {dur} batida. O cronômetro continua.'],
  arrastado: ['Ei. Eu tinha deixado ali.', 'Mudou meu relógio de lugar? Tá. Anotado.'],
});

const OFERTAS = {
  jogos: 'Vai jogar? Quer que eu cronometre a jogatina? Responde "sim".',
  alimentacao: 'Quer um timer de {min} min pra comer com calma? Responde "sim".',
  exercicios: 'Quer que eu conte o descanso entre as séries? Responde "sim".',
  estudo: 'Quer um Pomodoro comigo? Responde "sim".',
};

const FREQ_DURANTE_MIN = { pouca: 15, normal: 7, muita: 3 };
const ANIM_FIM_FANTASMA_MS = 6000;

export function instalarTimers(Companion) {
  const P = Companion.prototype;

  Object.defineProperty(P, 'timers', {
    configurable: true,
    get() {
      this._timers ||= new GerenciadorTimers({
        mono: () => this.clock.now(),
        wall: () => (this.timerWall ? this.timerWall() : Date.now()),
        load: () => this.progress.st.timers || null,
        save: (st) => { this.progress.st.timers = st; this.progress.save(this.progress.st); },
        getConfig: () => this.store.get(),
        onEvento: (e) => this._timerEvento(e),
        fontes: {
          foco: () => this._timerFonteFoco(),
          agua: () => this._timerFonteLembrete('agua'),
          pausa: () => this._timerFonteLembrete('pausa'),
          anime: () => (this._timerFonteAnime ? this._timerFonteAnime() : null),
        },
      });
      return this._timers;
    },
  });

  // ---------------------------------------------------------------- ciclo de vida

  /** Abre o app: recupera os timers salvos (uma vez) e avisa quem acabou com o app fechado. */
  P._timersStart = function () {
    const fins = this.timers.restaurar();
    if (fins.length) {
      const nomes = [...new Set(fins.map((e) => ATIVIDADES[e.timer.atividade]?.nome || 'Timer'))].join(', ');
      this.clock.setTimeout(() => this._timerFalar(`O timer de ${nomes.toLowerCase()} acabou enquanto eu estava fechado. Fica no histórico, sem XP.`), 4000);
    }
    this._timerAgendar();
  };

  P._timerAgendar = function () {
    if (this._timerHandle) this.clock.clearTimeout(this._timerHandle);
    this._timerHandle = null;
    if (!this.timers.timers.length && !this.timerFinal) return;
    const ms = this.timerFinal ? Math.min(this.timers.proximoEventoMs(), Math.max(250, this.timerFinal.ate - this.clock.now())) : this.timers.proximoEventoMs();
    this._timerHandle = this.clock.setTimeout(() => this._timerTick(), ms);
  };

  P._timerTick = function () {
    this._timerHandle = null;
    if (this.quitting) return;
    const now = this.clock.now();
    const antes = this.timers.timers.length;
    this.timers.tick();
    if (this.timerFinal && now >= this.timerFinal.ate) this.timerFinal = null;
    // Cronômetro de tarefa: a tarefa foi marcada como feita na lista → encerra contando o tempo.
    for (const t of [...this.timers.timers]) if (t.tarefaId && this._tarefaFeita(t.tarefaId)) this.timers.encerrar(t.id);
    // Confirmação esquecida: uma fala, uma vez.
    const c = this.timerConfirmacao;
    if (c && now >= c.ate) {
      this.timerConfirmacao = null;
      this._timerFalar(this._timerFala('ignorado'), { provoca: true });
    }
    if (this.timerOferta && now >= this.timerOferta.ate) this.timerOferta = null;
    if (now - (this._timerCheckpointAt || 0) >= 60e3) { this._timerCheckpointAt = now; this.timers.checkpoint(); }
    this._timerDurante(now);
    this._timerStatus();
    if (antes !== this.timers.timers.length || this.timerFinal || this.timers.timers.length) this._applyLayout();
    this._timerAgendar();
  };

  /** Atualiza tudo depois de uma ação (comando, foco que começou/terminou, configuração). */
  P._timerSync = function () {
    this.timers.tick();
    this._timerStatus();
    if (this.started) this._applyLayout(true);
    this._timerAgendar();
  };

  P._timerSuspender = function () { this.timers.suspender(); };
  P._timerRetomarSistema = function () { this.timers.retomarSistema(); this._timerSync(); };
  P._timerFechar = function () { try { this.timers.checkpoint(); } catch { /* fechando */ } };

  // ---------------------------------------------------------------- fontes dos espelhos

  P._timerFonteFoco = function () {
    const now = this.clock.now();
    const f = this.focus;
    if (f) {
      const fase = f.plano ? `Ciclo ${f.plano.atual}/${f.plano.ciclos}` : f.tipo === 'treino' ? 'Treino' : 'Foco';
      return { restanteMs: Math.max(0, f.fim - now), totalMs: f.fim - f.inicio, fase };
    }
    const br = this.focusBreak;
    if (br) return { restanteMs: Math.max(0, br.fim - now), totalMs: (br.plano?.pausaMin || 5) * 60e3, fase: 'Pausa' };
    return null;
  };

  P._timerFonteLembrete = function (k) {
    const cfg = this.reminders.st[k];
    if (!cfg || !cfg.ativo) return null;
    const total = cfg.intervaloMin * 60e3;
    const ultimo = cfg.ultimo ?? this.clock.now();
    return { restanteMs: Math.max(0, ultimo + total - this.reminders.now()), totalMs: total, fase: k === 'agua' ? 'Água' : 'Pausa' };
  };

  /** O foco junto começou: espelha no relógio (sem duplicar contagem nem XP). */
  P._timerFoco = function () {
    const cfg = this.store.get();
    if (cfg.timersAtivo === false || !sanitizeAtividades(cfg.timersAtividades).estudo.ativo) return;
    this._timerSemFala = true;
    try { this.timers.iniciar({ atividade: 'estudo', tipo: 'espelho', fonte: 'foco', origem: 'foco' }); } finally { this._timerSemFala = false; }
    this._timerSync();
  };

  P._tarefaFeita = function (id) {
    if (!this.todoChat) return false;
    try {
      const model = this.todoChat.model;
      const t = model.st.tasks?.find((x) => x.id === id);
      return !!t && model.done(t, model.sync());
    } catch { return false; }
  };

  // ---------------------------------------------------------------- falas

  P._timerFala = function (chave, vars = {}) {
    const lista = FALAS_TIMER[chave] || [];
    if (!lista.length) return '';
    const idx = this._timerFalaIdx ||= {};
    const i = idx[chave] = ((idx[chave] ?? Math.floor(this.rng() * lista.length)) + 1) % lista.length;
    const nome = profileVars(this.personality.get(), 'brincadeira').nome || 'Manu';
    return lista[i].replace(/\{(\w+)\}/g, (_, k) => (k === 'nome' ? nome : vars[k] ?? ''));
  };

  /** Fala do timer: nunca no Modo Trabalho, foco, tela cheia ou silêncio; provocação só quando cabe. */
  P._timerFalar = function (texto, { provoca = false, tipo = 'speech' } = {}) {
    if (!texto || this._timerSemFala) return false;
    if (this.work || this.focus || this.fullscreenHidden || this.userHidden || !this._canNag()) return false;
    if (provoca && this.store.get().provocacoes === false) return false;
    this.say(texto, tipo, { spontaneous: true });
    return true;
  };

  // ---------------------------------------------------------------- animações

  P._timerPodeAnimar = function (t) {
    const cfg = this.store.get();
    if (cfg.timersAnimacoes === false || cfg.timersVisivel === false) return false;
    if (t && !sanitizeAtividades(cfg.timersAtividades)[t.atividade]?.animar) return false;
    if (t && t.id !== this.timers.destacado?.id) return false; // só o destacado mexe com o JoJo
    return !(this.work || this.focus || this.fullscreenHidden || this.userHidden || this.paused || this.quitting || !this.started);
  };

  P._timerAnim = function (fase, t, { forcar = null } = {}) {
    if (!this._timerPodeAnimar(t)) return false;
    let lista = animsDaFase(fase, { semSono: !this.canSleep() });
    if (t && ATIVIDADES[t.atividade]?.calmo && fase === 'durante') lista = lista.filter((a) => ['tm18', 'tm23', 'tm11'].includes(a.id));
    const raro = fase === 'fim' && this.timers.st.stats.sessoes >= 10 && this.rng() < 0.06 ? ANIM_TIMER_POR_ID.get('tm45') : null;
    const ult = this._timerAnimUlt ||= {};
    const opcoes = lista.filter((a) => a.id !== ult[fase]);
    const a = forcar ? ANIM_TIMER_POR_ID.get(forcar) : raro || opcoes[Math.floor(this.rng() * opcoes.length) % (opcoes.length || 1)] || lista[0];
    if (!a) return false;
    if (!this.playCatalog(a.id, { source: 'evento', speak: false })) return false;
    ult[fase] = a.id;
    this.lastTimerAnimAt = this.clock.now();
    return a.id;
  };

  /** Durante a contagem: de tempos em tempos, uma animação com o relógio (quando ele está à toa). */
  P._timerDurante = function (now) {
    const t = this.timers.destacado;
    if (!t || t.estado !== 'rodando' || t.tipo === 'espelho') return false;
    const freq = FREQ_DURANTE_MIN[this.store.get().timersFrequencia] ?? FREQ_DURANTE_MIN.normal;
    if (now - Math.max(this.lastTimerAnimAt || 0, this.startedAt || 0) < freq * 60e3) return false;
    if (this.interaction || !this._canIdleAct?.()) return false;
    return this._timerAnim('durante', t);
  };

  // ---------------------------------------------------------------- eventos do gerenciador

  P._timerEvento = function (e) {
    const t = e.timer;
    const sit = this.timers.situacao(t);
    const vars = { dur: duracaoFalada(sit?.totalMs || e.ms || 0), durMenos: duracaoFalada(Math.max(60e3, (sit?.totalMs || 0) - 60e3)), pct: Math.round((sit?.progresso || 0) * 100) };
    switch (e.tipo) {
      case 'inicio':
        if (t.tipo === 'espelho') break;
        this._timerAnim('inicio', t);
        if (!this._timerSemFala) this._timerFalar(this._timerFala(t.tipo === 'progressivo' ? 'inicioProgressivo' : t.tipo === 'intervalado' ? 'inicioIntervalado' : 'inicio', { ...vars, n: t.ciclos || 1, fase: (t.fases?.[0]?.nome || '').toLowerCase() }), { provoca: true });
        break;
      case 'pausa':
        this._timerAnim('pausa', t, { forcar: 'tm46' });
        if (!this._timerSemFala) this._timerFalar(this._timerFala(e.cedo ? 'pausaCedo' : 'pausa', vars), { provoca: e.cedo });
        break;
      case 'retomada':
        this._timerAnim('retomada', t, { forcar: 'tm47' });
        if (!this._timerSemFala) this._timerFalar(this._timerFala('retomada', vars));
        break;
      case 'metade':
        this._timerFalar(this._timerFala('metade', vars), { tipo: 'thought' });
        break;
      case 'final':
        this._timerAnim('final', t);
        this._timerFalar(this._timerFala('final', vars), { tipo: 'thought' });
        break;
      case 'ultimos':
        if (!this._timerAnim('final', t, { forcar: 'tm34' })) this._timerFalar(this._timerFala('ultimos', vars), { tipo: 'thought' });
        else this._timerFalar(this._timerFala('ultimos', vars), { tipo: 'thought' });
        break;
      case 'fase':
        this._timerFalar(`${e.fase} ${e.faseIdx + 1} de ${e.faseTotal}.`, { tipo: 'thought' });
        break;
      case 'rodada':
        if (!e.fechado) this._timerNotificar(t, `${t.rotulo || ATIVIDADES[t.atividade].nome}: rodada ${e.rodada} concluída.`);
        break;
      case 'meta':
        this._timerFalar(this._timerFala('meta', { dur: duracaoFalada(t.metaMs) }));
        break;
      case 'cancelado':
        if (t.tipo !== 'espelho' && !this._timerSemFala) this._timerFalar(this._timerFala('cancelado'));
        break;
      case 'fim':
        this._timerFim(e);
        break;
      default:
    }
    this._timerStatus();
  };

  /** Notificação visual discreta: o relógio fica piscando em 0:00 alguns segundos. */
  P._timerNotificar = function (t, texto) {
    const cfg = this.store.get();
    if (cfg.timersNotificar === false) return;
    this.timerFinal = { timer: { ...t }, ate: this.clock.now() + ANIM_FIM_FANTASMA_MS };
    if (texto && cfg.timersAoTerminar !== 'silencioso') this._timerFalar(texto);
  };

  P._timerFim = function (e) {
    const t = e.timer;
    const cfg = this.store.get();
    const a = ATIVIDADES[t.atividade];
    if (e.fechado) return; // aviso único ao abrir (_timersStart)
    // Sessão válida para progressão: participação de verdade (não fechado, não dormindo, 5+ min, 80% com o app aberto).
    const valida = !e.suspenso && e.ms >= TIMER_LIMITES.minXpMin * 60e3 && e.aoVivoMs >= e.ms * 0.8 && t.tipo !== 'espelho' && t.tipo !== 'recorrente';
    const confirmar = valida && a.confirmar;
    this._timerNotificar(t, null);
    const anim = this._timerAnim('fim', t);
    if (anim) this.timerFinal.ate = Math.max(this.timerFinal.ate, this.clock.now() + (ANIM_TIMER_POR_ID.get(anim).dur * 1000) + 600);
    const fala = e.manual ? `Parei: ${duracaoFalada(e.ms)} contados.` : this._timerFala(confirmar ? 'fimConfirmar' : 'fim', { dur: duracaoFalada(e.ms) });
    if (cfg.timersAoTerminar !== 'silencioso' || confirmar) this._timerFalar(fala);
    if (confirmar) {
      this.timerConfirmacao = { timer: { ...t }, ms: e.ms, ate: this.clock.now() + TIMER_LIMITES.confirmarMin * 60e3 };
      const c = this.conversations.create({ id: 'timer', title: 'Timer do JoJo', kind: 'reminder' });
      this.conversations.setStatus(c.id, 'needsInput', `${a.nome}: ${duracaoFalada(e.ms)}. Fez? Responda "fiz".`);
    } else if (valida) this._timerRecompensa(t, e.ms);
    // Próximo intervalo automático (configurável): mesma atividade, mesma duração.
    if (cfg.timersAutoProximo === true && !e.manual && ['regressivo'].includes(t.tipo) && !confirmar) {
      this.clock.setTimeout(() => { if (!this.work) { this._timerSemFala = true; try { this.timers.iniciar({ atividade: t.atividade, tipo: t.tipo, duracaoMs: t.duracaoMs, rotulo: t.rotulo }); } finally { this._timerSemFala = false; } this._timerSync(); } }, 8000);
    }
  };

  /**
   * XP e conquistas pela infraestrutura que já existe (Progress.award com id do timer:
   * o mesmo timer nunca paga duas vezes; teto de sessões por dia no gerenciador).
   */
  P._timerRecompensa = function (t, ms) {
    const cfg = this.store.get();
    const a = ATIVIDADES[t.atividade];
    if (t.habito) this.habits.log(t.habito, dayKey(new Date()));
    let novas = [];
    try { novas = [...this.progress.count('timers'), ...this.progress.count('timerMin', Math.round(ms / 60e3))]; } catch { /* conta depois */ }
    const missao = this.progress.missionEvent ? this.progress.missionEvent('timer') : null;
    let lvl = null;
    if (cfg.timersXp !== false && a.xp && this.timers.elegivelXp({ timer: t, ms, aoVivoMs: ms, fechado: false, suspenso: false })) {
      try {
        const ev = this.progress.award({ id: `timer:${t.id}`, amount: GerenciadorTimers.xpDaSessao(ms), source: 'interaction', day: dayKey(new Date()), label: `Timer: ${a.nome}`, atividade: 'timer' });
        if (!ev.duplicate) this.timers.contarXp();
        if (ev.levelUp) lvl = { subiu: true, nivel: ev.level, nome: this.progress.nomeNivel };
      } catch (err) { this.log('warn', `XP do timer não confirmado: ${err.message}`); }
    }
    this._announceProgress({ lvl, novas, missao });
  };

  // ---------------------------------------------------------------- pedidos

  /** Respostas curtas pendentes ("fiz", "sim") e pedidos de timer na conversa. */
  P._timerChat = function (text) {
    const c = this.timerConfirmacao;
    if (c) {
      const r = respostaConfirmacao(text);
      if (r !== null) {
        this.timerConfirmacao = null;
        this.conversations.setStatus('timer', 'idle');
        if (r) { this._timerRecompensa(c.timer, c.ms); return this._timerFala('confirmado'); }
        return this._timerFala('negado');
      }
    }
    const o = this.timerOferta;
    if (o) {
      const r = respostaOferta(text);
      if (r !== null) {
        this.timerOferta = null;
        if (!r) return 'Beleza. Sem relógio.';
        return this._timerAcao({ acao: 'iniciar', atividade: o.atividade, min: null, progressivo: o.atividade === 'jogos', series: null });
      }
    }
    const pedido = parseTimerRequest(text);
    if (!pedido) return null;
    // "quanto falta" sem timer nenhum: não é com o timer; a conversa segue.
    if (['status', 'pausar', 'continuar', 'reiniciar', 'cancelar'].includes(pedido.acao) && !this.timers.timers.length) return pedido.acao === 'status' ? null : 'Não tem timer rodando.';
    return this._timerAcao(pedido);
  };

  P._timerComando = function (arg) {
    return this._timerAcao(parseTimerCommand(arg));
  };

  P._timerAcao = function (p) {
    const cfg = this.store.get();
    const tm = this.timers;
    const alvo = tm.destacado;
    const sem = 'Não tem timer rodando.';
    let out;
    this._timerSemFala = true;
    try {
      switch (p.acao) {
        case 'pausar': out = tm.pausar() ? this._timerFala(this._pausaCedo() ? 'pausaCedo' : 'pausa', { pct: this._pctAntes }) : alvo?.tipo === 'espelho' ? 'Esse relógio é do foco. Para o foco com /foco parar.' : sem; break;
        case 'continuar': out = tm.continuar() ? this._timerFala('retomada') : sem; break;
        case 'reiniciar': out = tm.reiniciar() ? 'Zerado. Começa de novo.' : sem; break;
        case 'cancelar': {
          if (!alvo) { out = sem; break; }
          if (alvo.tipo === 'espelho' && alvo.fonte === 'foco') { out = this._endFocus(false) || this._cancelFocusBreak() || 'Foco encerrado.'; tm.cancelar(alvo.id); break; }
          if (alvo.tipo === 'progressivo' && tm.decorrido(alvo) >= 60e3) { const ev = tm.encerrar(alvo.id); out = `Parei: ${duracaoFalada(ev?.ms || 0)} contados.`; break; }
          tm.cancelar(alvo.id); out = this._timerFala('cancelado'); break;
        }
        case 'destacar': {
          const t = tm.timers.find((x) => (x.rotulo || ATIVIDADES[x.atividade].nome).toLowerCase().includes(String(p.alvo || '').toLowerCase()));
          out = t && tm.destacar(t.id) ? `Destaquei o de ${(t.rotulo || ATIVIDADES[t.atividade].nome).toLowerCase()}.` : 'Não achei esse timer.';
          break;
        }
        case 'esconder': this.store.update({ timersVisivel: false }); out = 'Escondi o relógio. A contagem continua.'; break;
        case 'mostrar': this.store.update({ timersVisivel: true }); out = 'Relógio de volta.'; break;
        case 'status': out = this._timerStatusTexto(); break;
        case 'lista': out = tm.timers.length ? tm.timers.map((t) => `• ${this._timerLinha(t)}`).join('\n') : 'Nenhum timer agora. Pede: "timer de 10 minutos".'; break;
        case 'historico': out = this._timerHistoricoTexto(); break;
        case 'ajuda': out = 'Timers: "timer de 10 min", "cronometra a tarefa X", "descanso entre séries de 90 segundos 4 séries", "pausa o timer", "quanto falta", /timer lista.'; break;
        case 'iniciar': out = this._timerIniciar(p, cfg); break;
        default: out = null;
      }
    } finally { this._timerSemFala = false; }
    this._timerSync();
    return out;
  };

  P._pausaCedo = function () {
    const t = this.timers.destacado;
    const s = t ? this.timers.situacao(t) : null;
    this._pctAntes = Math.round((s?.progresso || 0) * 100);
    return (s?.progresso || 0) < 0.3;
  };

  P._timerIniciar = function (p, cfg) {
    if (cfg.timersAtivo === false) return 'Os timers estão desligados nas Configurações.';
    const prefs = sanitizeAtividades(cfg.timersAtividades);
    const at = ATIVIDADES[p.atividade] ? p.atividade : 'personalizado';
    if (!prefs[at].ativo) return `Timer de ${ATIVIDADES[at].nome.toLowerCase()} está desligado nas Configurações.`;
    const min = p.min ?? prefs[at].duracaoMin;
    const base = { atividade: at, rotulo: p.rotulo || '' };
    let opts;
    if (at === 'estudo' && !p.progressivo) {
      if (this.work) return 'No Modo Trabalho eu não abro foco. Sai do trabalho primeiro.';
      const plano = p.pomodoro ? { ciclos: 4, pausaMin: 5, atual: 1 } : null;
      return this.startFocus(Math.min(120, Math.max(5, Math.round(p.min ?? prefs.estudo.duracaoMin))), 'estudo', plano);
    }
    if (at === 'hidratacao') {
      if (!this.reminders.st.agua.ativo) return 'O lembrete de água está desligado. Liga com /lembrete agua 60 que eu mostro quanto falta.';
      opts = { ...base, tipo: 'espelho', fonte: 'agua' };
    } else if (at === 'descanso' && p.min == null && this.reminders.st.pausa.ativo) opts = { ...base, tipo: 'espelho', fonte: 'pausa' };
    else if (at === 'exercicios' && (p.series || /descanso|serie/i.test(p.rotulo || '') || p.min == null || p.min <= 5)) {
      const serieSeg = ATIVIDADES.exercicios.serieSeg;
      opts = { ...base, tipo: 'intervalado', fases: [{ nome: 'Série', ms: serieSeg * 1000 }, { nome: 'Descanso', ms: (p.min ?? prefs.exercicios.duracaoMin) * 60e3 }], ciclos: p.series || ATIVIDADES.exercicios.series, habito: 'treino' };
    } else if (at === 'exercicios') opts = { ...base, tipo: 'regressivo', duracaoMs: min * 60e3, habito: 'treino' };
    else if (at === 'alongamento') opts = { ...base, tipo: 'intervalado', fases: [{ nome: 'Posição', ms: (p.min ?? prefs.alongamento.duracaoMin) * 60e3 }], ciclos: p.series || ATIVIDADES.alongamento.series };
    else if (at === 'tarefa') {
      const tarefa = this._acharTarefa(p.tarefa);
      if (p.tarefa && !tarefa) opts = { atividade: 'tarefa', tipo: 'progressivo', rotulo: p.tarefa.slice(0, TIMER_LIMITES.rotulo) };
      else if (tarefa) opts = { atividade: 'tarefa', tipo: 'progressivo', rotulo: tarefa.title.slice(0, TIMER_LIMITES.rotulo), tarefaId: tarefa.id, metaMs: p.min ? p.min * 60e3 : 0 };
      else return 'Qual tarefa? Ex.: "cronometra a tarefa relatório".';
      if (p.tarefa && !tarefa) this._timerAvisoTarefa = 'Essa tarefa não está na lista. Cronometrei com esse nome mesmo.';
    } else if (p.progressivo || at === 'trabalho' && p.min == null || at === 'jogos') opts = { ...base, tipo: 'progressivo', metaMs: p.min ? p.min * 60e3 : 0 };
    else opts = { ...base, tipo: p.recorrente ? 'recorrente' : 'regressivo', duracaoMs: min * 60e3 };
    const r = this.timers.iniciar(opts);
    if (r.erro === 'limite') return `Já tem ${r.max} timers. Cancela um antes (/timer lista).`;
    if (r.erro) return 'Agora não deu.';
    const t = r.timer;
    if (r.existente) return `Já tô mostrando: ${this._timerLinha(t)}.`;
    const aviso = this._timerAvisoTarefa ? `${this._timerAvisoTarefa} ` : '';
    this._timerAvisoTarefa = null;
    const sit = this.timers.situacao(t);
    if (t.tipo === 'espelho') return `${ATIVIDADES[at].nome}: ${formatarTempo(sit.restanteMs)} até o próximo lembrete.`;
    const vars = { dur: duracaoFalada(sit.totalMs || 0), durMenos: duracaoFalada(Math.max(60e3, (sit.totalMs || 0) - 60e3)), n: t.ciclos || 1, fase: (t.fases?.[0]?.nome || '').toLowerCase() };
    const fala = this._timerFala(t.tipo === 'progressivo' ? 'inicioProgressivo' : t.tipo === 'intervalado' ? 'inicioIntervalado' : 'inicio', vars);
    return `${aviso}${fala}`.trim();
  };

  P._acharTarefa = function (nome) {
    if (!nome || !this.todoChat) return null;
    try {
      const model = this.todoChat.model;
      const n = String(nome).toLowerCase();
      return (model.st.tasks || []).find((t) => !t.archived && String(t.title).toLowerCase().includes(n)) || null;
    } catch { return null; }
  };

  P._timerLinha = function (t) {
    const s = this.timers.situacao(t);
    const nome = t.rotulo || ATIVIDADES[t.atividade].nome;
    const tempo = t.tipo === 'progressivo' ? `${formatarTempo(s.decorridoMs)} correndo` : `${formatarTempo(s.restanteMs)} restantes${s.fase ? ` (${s.fase})` : ''}`;
    return `${nome}: ${tempo}${t.estado === 'pausado' ? ', pausado' : ''}`;
  };

  P._timerStatusTexto = function () {
    const t = this.timers.destacado;
    return t ? this._timerLinha(t) : 'Não tem timer rodando.';
  };

  P._timerHistoricoTexto = function () {
    const r = this.timers.resumo();
    if (!r.sessoes) return 'Nenhuma sessão concluída ainda.';
    const por = Object.entries(r.porAtividade).sort((a, b) => b[1].ms - a[1].ms).slice(0, 5).map(([k, v]) => `• ${ATIVIDADES[k]?.nome || k}: ${v.sessoes}× (${duracaoFalada(v.ms)})`);
    return [`Hoje: ${r.hojeSessoes} sessões, ${duracaoFalada(r.hojeMs)}. Total: ${r.sessoes} sessões, ${duracaoFalada(r.totalMs)}.`, ...por].join('\n');
  };

  /** Status na Central (atividade "Timer do JoJo"). */
  P._timerStatus = function () {
    const t = this.timers.destacado;
    if (this.timerConfirmacao) return;
    if (!t) { if (this.conversations.get('timer')) this.conversations.setStatus('timer', 'idle'); return; }
    if (t.tipo === 'espelho' && t.fonte === 'foco') return; // o foco já mostra o dele
    const c = this.conversations.create({ id: 'timer', title: 'Timer do JoJo', kind: 'reminder' });
    const detalhe = `${this._timerLinha(t)}${this.timers.timers.length > 1 ? ` (+${this.timers.timers.length - 1})` : ''}`;
    if (c.detail !== detalhe || c.status !== 'running') this.conversations.setStatus(c.id, 'running', detalhe);
  };

  // ---------------------------------------------------------------- sugestões

  /** Oferece um timer (nunca impõe): só com sugestões ligadas, uma vez a cada 3 h por atividade. */
  P._timerOfertar = function (atividade) {
    const cfg = this.store.get();
    if (cfg.timersAtivo === false || cfg.timersSugestoes === false) return false;
    const pref = sanitizeAtividades(cfg.timersAtividades)[atividade];
    if (!pref?.ativo || !pref.sugerir || !OFERTAS[atividade]) return false;
    if (this.work || this.focus || this.fullscreenHidden || !this._canNag()) return false;
    if (this.timers.timers.some((t) => t.atividade === atividade)) return false;
    const now = this.clock.now();
    const vistas = this._timerOfertas ||= {};
    if (now - (vistas[atividade] ?? -Infinity) < 3 * 3600e3) return false;
    vistas[atividade] = now;
    this.timerOferta = { atividade, ate: now + 3 * 60e3 };
    this.clock.setTimeout(() => this._timerFalar(OFERTAS[atividade].replace('{min}', String(pref.duracaoMin))), 5000);
    this._timerAgendar();
    return true;
  };

  // ---------------------------------------------------------------- relógio arrastado / clicado

  /** Clique (pausa/continua) e arrasto (muda o lugar) no relógio, só no modo de interação. */
  P.timerInteracao = function (msg) {
    if (!msg || typeof msg !== 'object' || !this.interaction) return false;
    const cfg = this.store.get();
    if (msg.acao === 'alternar') {
      if (cfg.timersClicavel === false) return false;
      const t = this.timers.destacado;
      if (!t || t.tipo === 'espelho') return false;
      if (t.estado === 'rodando') this.timers.pausar(); else this.timers.continuar();
      this._timerSync();
      return true;
    }
    if (msg.acao === 'mover' && Number.isFinite(msg.dx) && Number.isFinite(msg.dy)) {
      const o = sanitizeOffset(cfg.timersOffset);
      this.store.update({ timersOffset: sanitizeOffset({ x: o.x + msg.dx, y: o.y + msg.dy }) });
      const now = this.clock.now();
      if (now - (this._timerArrastoAt || -Infinity) > 2 * 60e3) {
        this._timerArrastoAt = now;
        this._timerAnim('mover', this.timers.destacado, { forcar: 'tm48' });
        this._timerFalar(this._timerFala('arrastado'), { provoca: true });
      }
      this._applyLayout(true);
      return true;
    }
    return false;
  };

  // ---------------------------------------------------------------- relógio na janela

  /**
   * Lugar do relógio ao lado do JoJo e o estado que vai para o desenho. Escondido
   * (preferência, sem timer, tela cheia) não ocupa espaço nem tem área de clique.
   */
  P._timerLayout = function (r, wa, s, avoid) {
    const cfg = this.store.get();
    const t = this.timers.destacado || this.timerFinal?.timer || null;
    if (!t || cfg.timersAtivo === false || cfg.timersVisivel === false || this.fullscreenHidden || this.userHidden) return null;
    const final = !this.timers.destacado && this.timerFinal ? this.timerFinal : null;
    const discreto = !!(this.work || this.focus);
    const aparencia = aparenciaDoTimer(t, { escolhida: cfg.timersAparencia, liberadas: this.timers.aparenciasLiberadas(), discreto });
    const tamanho = discreto ? 'pequeno' : cfg.timersTamanho || 'medio';
    const size = caixaRelogio(aparencia, tamanho);
    const ordem = { direita: ['right', 'left', 'top', 'bottom'], esquerda: ['left', 'right', 'top', 'bottom'], acima: ['top', 'right', 'left', 'bottom'], abaixo: ['bottom', 'right', 'left', 'top'] }[cfg.timersPosicao] || ['right', 'left', 'top', 'bottom'];
    const lugar = placeAround(r.visual, size, wa, { order: ordem, avoid: avoid.filter(Boolean), gap: 8 });
    const off = sanitizeOffset(cfg.timersOffset);
    const rect = clampRectInto({ ...lugar.rect, x: lugar.rect.x + off.x, y: lugar.rect.y + off.y }, wa);
    const attach = [{ rect }];
    // Animação com o relógio: espaço em volta do JoJo para ele segurar, levantar e empurrar.
    if (timerDaAnim(this.behavior.anim)) {
      const k = s.size, E = ESPACO_ANIM_TIMER;
      const l = (this.facing >= 0 ? E.l : E.r) * k, rr = (this.facing >= 0 ? E.r : E.l) * k;
      attach.push({ rect: { x: r.box.x - l, y: r.box.y - E.t * k, width: r.box.width + l + rr, height: r.box.height + (E.t + E.b) * k } });
    }
    if (aparencia === 'circular') attach.push({ rect: { x: r.box.x - 12 * s.size, y: r.box.y - 12 * s.size, width: r.box.width + 24 * s.size, height: r.box.height + 24 * s.size } });
    const sit = final ? null : this.timers.situacao(t);
    const agora = Date.now();
    const sobe = t.tipo === 'progressivo';
    const rodando = !final && (t.tipo === 'espelho' ? !sit.pausado : t.estado === 'rodando');
    const baseMs = final ? 0 : sobe ? sit.decorridoMs : sit.restanteMs;
    const totalMs = final ? 1 : sit.totalMs;
    const alerta = final ? 1 : !sobe && totalMs >= 60e3 && sit.restanteMs <= Math.min(60e3, Math.max(10e3, totalMs * 0.15)) ? 1 : 0;
    const q = (v) => Math.round(v / 100) * 100;
    const mais = Math.max(0, this.timers.timers.length - 1);
    return {
      attach,
      estado: (rel) => ({
        id: t.id, rect: rel(rect), aparencia, tamanho, base: { pequeno: 58, medio: 76, grande: 98 }[tamanho] || 76,
        modo: sobe ? 'sobe' : 'desce', rodando, baseMs: q(baseMs), totalMs, ancoraWall: rodando ? q(sobe ? agora - baseMs : agora + baseMs) : 0,
        fase: final ? 'Concluído' : sit.fase || null, rotulo: discreto ? '' : t.rotulo || ATIVIDADES[t.atividade]?.nome || '', pausado: !final && t.estado === 'pausado',
        alerta, discreto, mais, alpha: Math.max(0.3, Math.min(1, Number(cfg.timersOpacidade) || 0.95)) * (discreto ? 0.75 : 1),
        clicavel: !!this.interaction && cfg.timersClicavel !== false && t.tipo !== 'espelho' && !final, anel: aparencia === 'circular' && !discreto,
      }),
    };
  };
}

export { FREQ_DURANTE_MIN };
