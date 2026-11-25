// Loja de JOJOcoins e troca dinâmica de visuais no companion. Instalado no
// protótipo do Companion, como os timers: liga a carteira pura (loja.js) e o motor de
// visuais (visuais-dinamicos.js) ao JoJo sem mudar os sistemas que já existem.
// Sem carteira conectada (testes antigos, falha ao ler o arquivo), nada aqui age.
import { PRIORITY } from './behavior.js';
import { ehAnimFantasia } from './memes-br.js';
import { visuaisLiberados, canaisVisual, sanitizeVisual } from './visual-nivel.js';
import { canaisLook, espacoDecor, LOOKS } from './loja-arte.js';
import { ITENS, item as itemLoja, NOME_MOEDA } from './loja-catalogo.js';
import { ROTEIROS, animDoItem } from './loja-anims.js';
import { MotorVisual, catalogarVisuais, contextosDoTexto, contextosDoApp, contextosDoEvento, contextosDoHorario } from './visuais-dinamicos.js';

const DECIDIR_MS = 60e3;

/** Falas curtas da compra (sem cobrança, sem insistir): uma por compra, no máximo. */
const FALAS_COMPRA = {
  visual: 'Visual novo no armário. Vou usar quando fizer sentido.',
  comida: 'Comida na despensa. Me dá quando eu merecer.',
  objeto: 'Brinquedo novo. Não toca, é meu.',
  decoracao: 'Decoração nova. Bom gosto, finalmente.',
  animacao: 'Movimento novo no repertório. Treinei em segredo.',
  poder: 'Poder guardado. Usa com sabedoria, se tiver.',
  atividade: 'Atividade nova liberada. Chama quando quiser.',
  cuidado: 'Kit de cuidado guardado. Meu corpo agradece.',
  colecionavel: 'Peça nova na estante. Coleção de respeito.',
  lendario: 'Lendário. Agora sim estamos conversando.',
};

const GANHO_INTERVALO_MS = 10 * 60e3;

export function instalarLoja(Companion) {
  const P = Companion.prototype;

  /** Conecta a carteira (chamado pelo serviço da loja no processo principal). */
  P.lojaConectar = function (loja) {
    this.loja = loja;
    this.lojaFxSeq = 0;
    this.lojaFx = null;
    this.visualMomento = null; // { id, canais, inteiro }
    // Animações compradas entram no repouso; as não compradas nunca aparecem.
    if (this.variety) this.variety.liberado = (it) => !!it.loja && loja.possui(it.loja);
    this.motorVisual = new MotorVisual({ now: () => this.clock.now(), estado: loja.st.motorVisual || null });
    const antes = this.progress.onLevelUp;
    this.progress.onLevelUp = (ev) => {
      antes?.(ev);
      this._sinalVisual(['conquista', 'nivel', 'celebracao'], 2);
      // Nível novo: pilha de JOJOcoins ao lado dele (depois das moedas do próprio ganho).
      this.clock.setTimeout(() => this._lojaMoedas('pilha', 10), 1500);
      if (loja.temRecurso('holofote')) { this._lojaHolofote(); this.clock.setTimeout(() => this._lojaPodeReagir() && this.playCatalog('ljCampeao', { source: 'loja', speak: false }), 5000); }
    };
    this._lojaAgendar();
    this._visualDecidir();
  };

  // ---------------------------------------------------------------- troca dinâmica de visuais

  /** Visuais autorizados agora (nível atual + looks comprados). Nada bloqueado entra. */
  P._visuaisAutorizados = function () {
    if (!this._refs || !this.loja) return [];
    const nivel = this.progress.nivel;
    if (this._autorizadosCache?.nivel === nivel && this._autorizadosCache.inv === this.loja.st.inventario) return this._autorizadosCache.lista;
    const liberados = visuaisLiberados(this._refs, nivel).filter((p) => p.parte !== 'mao'); // a mão fica livre para as animações
    const looks = ITENS.filter((it) => it.efeito.look && this.loja.possui(it.id) && LOOKS[it.efeito.look]);
    const lista = catalogarVisuais({ liberados, lojaLooks: looks });
    this._autorizadosCache = { nivel, inv: this.loja.st.inventario, lista };
    return lista;
  };

  /** Janela segura: sem cena, fala, arrasto, jogo, foco, trabalho ou tela cheia. */
  P._visualSeguro = function () {
    if (!this.started || this.work || this.focus || this.game || this.fullscreenHidden || this.userHidden || this.dragging || this.bubble || this.quitting) return false;
    if (this.behavior.priority < PRIORITY.AUTO) return false;
    if (ehAnimFantasia(this.behavior.anim || '')) return false;
    return ['idle', 'walk', 'sit', 'lookAround', 'curious'].includes(this.behavior.state);
  };

  /** Sinal de contexto vindo de um evento real; decide logo depois (sem LLM). */
  P._sinalVisual = function (ctxs, peso = 1) {
    if (!this.motorVisual || !ctxs?.length) return;
    for (const c of ctxs) this.motorVisual.sinal(c, peso);
    if (this._visualDecisaoBreve) return;
    this._visualDecisaoBreve = this.clock.setTimeout(() => { this._visualDecisaoBreve = null; this._visualDecidir(); }, 2500);
  };

  /** Uma decisão do motor; aplica a aparência momentânea se trocou. */
  P._visualDecidir = function () {
    if (!this.motorVisual) return null;
    const cfg = this.store.get();
    const r = this.motorVisual.decidir({ candidatos: this._visuaisAutorizados(), seguro: this._visualSeguro(), auto: cfg.visualAuto !== false, fixo: cfg.visualFixo || null });
    if (r.trocou) {
      this._aplicarMomento(r.id);
      try { this.loja.salvarMotor(this.motorVisual.salvar()); } catch { /* o histórico de uso é só preferência */ }
      this.log?.('info', `Visual momentâneo: ${r.id || 'o dela'} (${r.motivo}).`);
    }
    return r;
  };

  P._aplicarMomento = function (id) {
    if (!id) { this.visualMomento = null; this._applyLayout(true); return; }
    if (LOOKS[id]) { this.visualMomento = { id, canais: canaisLook(id), inteiro: true }; this._applyLayout(true); return; }
    // Peça de nível: só troca aquela parte no conjunto dela (o salvo não muda).
    const c = this._visuaisAutorizados().find((x) => x.id === id);
    if (!c) { this.visualMomento = null; return; }
    const salvo = sanitizeVisual(this.store.get().visualNivel, this._refs);
    const estado = { ...salvo, pecas: c.inteiro ? { [c.parte]: id } : { ...salvo.pecas, [c.parte]: id } };
    const canais = canaisVisual(estado, this._refs, this.progress.nivel, { outfit: this.outfit, maoLivre: this._handFree() });
    this.visualMomento = canais ? { id, canais, inteiro: c.inteiro } : null;
    this._applyLayout(true);
  };

  /** Canais da aparência momentânea por cima do visual salvo (null = usa o dela). */
  P._visualMomentoCanais = function (base, { vestido = false } = {}) {
    const m = this.visualMomento;
    if (!m || !this.motorVisual) return base;
    // Roupa escolhida por ela no guarda-roupa ou fantasia do dia: a fantasia inteira espera.
    if (m.inteiro && (vestido || this.costume)) return base;
    if (m.inteiro) return { ...m.canais };
    return { ...(base || {}), ...m.canais };
  };

  P._lojaAgendar = function () {
    if (this._lojaHandle) this.clock.clearTimeout(this._lojaHandle);
    this._lojaHandle = this.clock.setTimeout(() => {
      this._lojaHandle = null;
      if (this.quitting || !this.loja) return;
      // Relógio e necessidades viram sinais fracos; nada é sorteado.
      for (const c of contextosDoHorario(new Date())) this.motorVisual.sinal(c, 0.35);
      if (this.needs?.hunger < 30) this.motorVisual.sinal('refeicao', 0.5);
      if (this.needs?.ill) this.motorVisual.sinal('saude', 0.5);
      this._visualDecidir();
      this._lojaAgendar();
    }, DECIDIR_MS);
  };

  // ---------------------------------------------------------------- ganhos, compras e efeitos

  /** Efeito de moedas no overlay (ganho, gasto, chuva, festa). */
  P._lojaMoedas = function (tipo, n = 1) {
    if (this.work || this.focus || this.fullscreenHidden) return;
    this.lojaFx = { seq: ++this.lojaFxSeq, tipo, n };
    this._applyLayout(true);
  };

  P._lojaHolofote = function (ms = 12e3) {
    this.lojaHolofoteAte = Date.now() + ms;
    this._applyLayout(true);
  };

  /** Pode reagir agora sem atravessar nada (trabalho, foco, tela cheia, conversa, cena). */
  P._lojaPodeReagir = function () {
    return this.started && !this.work && !this.focus && !this.fullscreenHidden && !this.userHidden && !this.quitting && this._canNag?.() !== false && this.behavior.priority >= PRIORITY.AUTO;
  };

  /**
   * Saldo subiu: o JoJo pega a moeda no ar e comemora (sem fala). No máximo uma vez a cada
   * 10 min, para não virar insistência; as moedas do overlay aparecem em todo ganho.
   */
  P.lojaReagirGanho = function (n) {
    if (!(n > 0) || this.store.get().lojaReacoes === false || !this._lojaPodeReagir()) return false;
    const agora = this.clock.now();
    if (agora - (this._lojaGanhoUltimo ?? -Infinity) < GANHO_INTERVALO_MS) return false;
    this._lojaGanhoUltimo = agora;
    return this.playCatalog('ljGanho', { source: 'loja', speak: false }) !== false;
  };

  /** Reação à compra: uma animação curta e uma fala, só se der; visual comprado ganha prioridade. */
  P.lojaReagirCompra = function (id) {
    const it = itemLoja(id);
    if (!it) return;
    this._lojaMoedas('gasto', Math.min(8, Math.ceil(it.preco / 200)));
    if (it.efeito.look) { this.motorVisual?.destacar(it.efeito.look); this._autorizadosCache = null; this.clock.setTimeout(() => this._visualDecidir(), 3000); }
    if (this.store.get().lojaReacoes === false || !this._lojaPodeReagir()) return;
    this.playCatalog('ljCompra', { source: 'loja', speak: false });
    this.clock.setTimeout(() => this._lojaPodeReagir() && this.say(it.fala || FALAS_COMPRA[it.tipo], 'speech'), 900);
  };

  /** Toca a animação de um objeto ou animação comprada (botão da Central ou pedido). */
  P.lojaTocar = function (id) {
    const it = itemLoja(id);
    if (!it || !this.loja?.possui(id)) return { ok: false, motivo: 'naoPossui' };
    if (!it.efeito.anim) return { ok: false, motivo: 'semAnimacao' };
    const ok = this.playCatalog(animDoItem(it.efeito.anim), { source: 'pedido', speak: false });
    if (ok && it.fala) this.say(it.fala, 'speech');
    return { ok, motivo: ok ? null : 'agora' };
  };

  /** Atividade comprada: roteiro curto e interrompível, com intervalo entre usos. */
  P.lojaAtividade = function (id) {
    const it = itemLoja(id);
    if (!it?.efeito.roteiro) return { ok: false, motivo: 'semRoteiro' };
    if (!this._lojaPodeReagir() && !this.interaction) return { ok: false, motivo: 'agora' };
    const r = this.loja.iniciarAtividade(id);
    if (!r.ok) return r;
    const roteiro = r.roteiro;
    if (roteiro === 'quiz' || roteiro === 'bolhas') { const txt = this.startGame(roteiro); this.say(txt, 'speech'); return { ok: true }; }
    if (roteiro === 'chuva' || roteiro === 'festa') this._lojaMoedas(roteiro, 1);
    if (roteiro === 'treino') this.lojaHumor?.(8, id);
    if (roteiro === 'meditacao') this.lojaHumor?.(10, id);
    const anim = ROTEIROS[roteiro];
    if (anim) this.playCatalog(anim, { source: 'loja', speak: false });
    if (it.fala) this.say(it.fala, 'speech');
    return { ok: true };
  };

  /** Estado da loja para o overlay (só o que muda o desenho). */
  P._lojaEstado = function () {
    const l = this.loja;
    if (!l) return null;
    const st = l.st;
    const decor = Object.values(st.ativos.decor).filter(Boolean);
    const megalodon = (st.megalodonAte || 0) > Date.now();
    const holofoteAte = this.lojaHolofoteAte && this.lojaHolofoteAte > Date.now() ? this.lojaHolofoteAte : 0;
    if (!decor.length && !st.ativos.aura && !st.ativos.rastro && !megalodon && !holofoteAte && !this.lojaFx) return null;
    return { decor, aura: !!st.ativos.aura && !this.work, rastro: !!st.ativos.rastro, megalodon, holofoteAte, moedaFx: this.lojaFx };
  };

  /** Espaço extra da janela para decoração no chão e aura. */
  P._lojaEspaco = function () {
    const e = this._lojaEstado();
    if (!e) return null;
    const d = espacoDecor(e.decor);
    if (e.aura || e.holofoteAte) { d.l = Math.max(d.l, 14); d.r = Math.max(d.r, 14); d.t = Math.max(d.t, 20); }
    if (e.megalodon) { d.l = Math.max(d.l, 12); d.r = Math.max(d.r, 12); d.t = Math.max(d.t, 24); }
    return d.l || d.r || d.t ? d : null;
  };

  // ---------------------------------------------------------------- ganchos nos eventos reais

  const viral = P._viral;
  P._viral = function (gatilho, opts) {
    this._sinalVisual(contextosDoEvento(gatilho), 1);
    return viral.call(this, gatilho, opts);
  };

  const appCat = P.onAppCategoria;
  P.onAppCategoria = function (cat) {
    if (cat !== this.appCategoria) this._sinalVisual(contextosDoApp(cat), 1.2);
    return appCat.call(this, cat);
  };

  const chat = P.chat;
  P.chat = function (text, conversationId) {
    this._sinalVisual(contextosDoTexto(text), 1.2);
    return chat.call(this, text, conversationId);
  };

  // Escudo de Sequência: um dia sem abrir o JoJo não zera a sequência (gasta um escudo).
  const streak = P._checkStreak;
  P._checkStreak = function (date) {
    const st = this.variety?.state;
    const s = st?.streak;
    if (s?.last && this.loja?.st.escudos > 0) {
      const dk = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const ontem = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
      const anteontem = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 2);
      if (s.last === dk(anteontem) && this.loja.usarEscudo()) s.last = dk(ontem);
    }
    return streak.call(this, date);
  };

  // Animações da loja só tocam compradas; as cenas (compra, festa…) só pela própria loja.
  const play = P.playCatalog;
  P.playCatalog = function (id, opts = {}) {
    const it = this.catalogById?.get(id);
    if (it?.loja && !this.loja?.possui(it.loja)) return false;
    if (it?.lojaCena && opts.source !== 'loja') return false;
    return play.call(this, id, opts);
  };
}

export { NOME_MOEDA };
