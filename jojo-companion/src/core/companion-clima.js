// Localização real e clima em volta do JoJo (0.47.7): métodos do Companion.
// - Localização: GerenciadorLocalizacao (src/core/localizacao.js); as fontes chegam do main
//   em `companion.locFontes` (Windows, rede/IP, cidade escrita e nome do lugar).
// - Clima ambiente: uma consulta por hora no máximo (cache de 30 min no WeatherService),
//   só com localização válida e com reação ou luz de noite ligadas.
// - Reações opcionais (cat_cl01–cl12): nunca no Modo Trabalho, foco, tela cheia, pausa,
//   JoJo escondido ou silêncio. Fala nunca mostra coordenada nem endereço.
import { GerenciadorLocalizacao, nomeDoLugar, fusoParaOApp, TEXTO_ERRO_LOC, INTERVALOS_LOC } from './localizacao.js';
import { condicaoDoClima, deveReagir, registrarReacao, verCondicao, luzDeNoite, ANIMS_POR_CONDICAO, FALAS_CLIMA, CLIMA_INTERVALO_MS, CLIMA_VALIDADE_MS } from './clima-ambiente.js';
import { ANIM_CLIMA_POR_ID } from './clima-anims.js';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const diaLocal = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const PRIMEIRA_CONSULTA_MS = 20e3; // ao abrir com o Windows a internet pode ainda não estar pronta

/** Pedido de conversa sobre a localização (nada de coordenada na resposta). */
export function pedidoLocalizacao(text) {
  const n = norm(text).replace(/[?!.,]+$/g, '');
  if (/^(?:jojo,? )?(?:atualiza|atualizar|confere|verifica|checa)(?: a| minha)? localiza(?:cao|ção)(?: agora)?$/.test(n)) return 'atualizar';
  if (/^(?:jojo,? )?(?:onde (?:eu )?(?:to|estou)(?: agora)?|em que cidade (?:eu )?(?:to|estou)|qual (?:e )?(?:a )?minha (?:cidade|localizacao)|voce sabe onde (?:eu )?(?:to|estou))$/.test(n)) return 'onde';
  if (/^(?:jojo,? )?(?:esquece|apaga) (?:a )?minha localizacao$/.test(n)) return 'esquecer';
  return null;
}

export function instalarClima(Companion) {
  const P = Companion.prototype;

  Object.defineProperty(P, 'localizacao', {
    configurable: true,
    get() {
      this._localizacao ||= new GerenciadorLocalizacao({
        fontes: this.locFontes || {},
        nomear: this.locFontes?.nomear || null,
        getConfig: () => this.store.get(),
        now: () => Date.now(),
        mono: () => this.clock.now(),
        load: () => this.locCofre?.ler() ?? null,
        save: (loc) => this.locCofre?.gravar(loc),
        onMudanca: (m) => this._locMudou(m),
        log: (lvl, msg) => this.log(lvl, msg),
      });
      return this._localizacao;
    },
  });

  /** Abre o app: primeira consulta (se autorizada) um pouco depois e o fuso salvo já vale. */
  P._climaStart = function () {
    this._aplicarFuso();
    this._locAgendar(PRIMEIRA_CONSULTA_MS);
  };

  P._locAgendar = function (ms = null) {
    if (this._locHandle) this.clock.clearTimeout(this._locHandle);
    this._locHandle = null;
    if (this.quitting) return;
    const loc = this.localizacao.proximaEmMs();
    const precisaClima = this._climaLigado() && this.localizacao.atual();
    const clima = precisaClima ? Math.max(60e3, CLIMA_INTERVALO_MS - (Date.now() - (this.climaAgora?.em || 0))) : null;
    const espera = ms ?? [loc, clima].filter((v) => v != null).reduce((a, b) => Math.min(a, b), Infinity);
    if (!Number.isFinite(espera)) return;
    this._locHandle = this.clock.setTimeout(() => { void this._locTick(); }, espera);
  };

  /** Consulta o que venceu (localização e/ou clima) e agenda a próxima. Nunca lança. */
  P._locTick = async function ({ forcar = false } = {}) {
    this._locHandle = null;
    if (this.quitting) return null;
    if (this.suspended) { this._locAgendar(5 * 60e3); return null; }
    let loc = null;
    try {
      loc = await this.localizacao.atualizar({ forcar });
      this._aplicarFuso();
      if (loc && this._climaLigado() && (forcar || Date.now() - (this.climaAgora?.em || 0) >= CLIMA_INTERVALO_MS)) await this._climaAmbiente(loc);
    } catch (e) {
      this.log('warn', `Clima/localização: ${e?.message || e}`);
    } finally {
      this._locAgendar();
      this.onLocalizacao?.();
    }
    return loc;
  };

  P._climaLigado = function () {
    const s = this.store.get();
    return s.climaAtivo !== false && (s.climaReacoes !== false || s.climaNoite !== false);
  };

  /** Condição atual do clima pela localização real → luz de noite e (talvez) uma reação. */
  P._climaAmbiente = async function (loc) {
    if (!this.weather?.atual) return null;
    let r;
    try { r = await this.weather.atual({ lat: loc.lat, lon: loc.lon }); } catch { return null; }
    const cond = condicaoDoClima(r.current);
    if (!cond) return null;
    if (!loc.fuso && r.timezone) this.localizacao.definirFuso(r.timezone);
    this.climaAgora = { cond, em: Date.now(), validoAte: Date.now() + CLIMA_VALIDADE_MS };
    this.climaMemoria = verCondicao(this.climaMemoria || {}, cond);
    this._climaReagir(cond);
    this._applyLayout?.();
    return cond;
  };

  /** Pode reagir ao clima agora? Mesmo cuidado de qualquer animação espontânea. */
  P._climaPodeReagir = function () {
    const s = this.store.get();
    if (s.climaReacoes === false || s.climaAtivo === false) return false;
    return !(this.work || this.focus || this.fullscreenHidden || this.userHidden || this.paused || this.quitting || !this.started || this.suspended) && !!this._canIdleAct?.();
  };

  P._climaReagir = function (cond) {
    const agora = Date.now(), dia = diaLocal(agora);
    const alvo = deveReagir(cond, this.climaMemoria || {}, { agora, dia });
    if (!alvo || !this._climaPodeReagir()) return null;
    const lista = (ANIMS_POR_CONDICAO[alvo] || []).filter((id) => ANIM_CLIMA_POR_ID.has(id) && id !== this._climaUltAnim);
    const id = lista[Math.floor(this.rng() * lista.length) % (lista.length || 1)];
    if (!id || !this.playCatalog(id, { source: 'evento', speak: false })) return null;
    this._climaUltAnim = id;
    this.climaMemoria = registrarReacao(this.climaMemoria || {}, alvo, { agora, dia });
    const falas = FALAS_CLIMA[alvo] || [];
    const [texto] = falas[Math.floor(this.rng() * falas.length) % (falas.length || 1)] || [];
    if (texto && this._canNag()) this.clock.setTimeout(() => this.say(texto, 'speech', { spontaneous: true }), 900);
    return id;
  };

  /** Luz de noite no overlay (0 = nenhuma). Trabalho/foco/tela cheia: nada. */
  P._climaLuz = function () {
    const s = this.store.get();
    if (s.climaNoite === false || s.localizacaoModo === 'desligado' || this.work || this.focus || this.fullscreenHidden) return 0;
    const c = this.climaAgora;
    return luzDeNoite({ cond: c?.cond || null, validoAte: c?.validoAte || 0, agora: Date.now() });
  };

  /** Mudou cidade/estado/país/fuso: aplica o fuso e avisa uma vez (só o nome da cidade). */
  P._locMudou = function (m) {
    this._aplicarFuso();
    if (!m.antes) return;
    const lugar = nomeDoLugar(m.depois);
    let texto = null;
    if ((m.cidade || m.regiao || m.pais) && lugar && m.depois.fonte !== 'manual') texto = `Mudou de lugar: agora você tá em ${lugar}. Clima e horário seguem daqui.`;
    else if (m.fuso) texto = `Mudou o fuso. Agora sigo o horário de ${lugar || m.depois.fuso}.`;
    if (texto && this._canNag()) this.clock.setTimeout(() => this.say(texto, 'speech', { spontaneous: true }), 1500);
  };

  /** Fuso do app: o da localização confiável quando difere do Windows; senão o do Windows. */
  P._aplicarFuso = function () {
    const fuso = fusoParaOApp(this.localizacao.atual(), this.store.get(), this.fusoSistema || Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (fuso === (this.fusoApp ?? null)) return;
    this.fusoApp = fuso;
    this.onFuso?.(fuso);
  };

  /** Configurações mudaram: esquece ao desligar, reagenda ao mudar intervalo/modo. */
  P._climaConfig = function (changed) {
    if (!changed.some((k) => /^(localizacao|clima)/.test(k))) return;
    const s = this.store.get();
    if (changed.includes('localizacaoModo') && s.localizacaoModo !== 'automatico' && this.localizacao.ultima && this.localizacao.ultima.fonte !== 'manual') this.localizacao.esquecer();
    if (s.localizacaoModo === 'desligado') { this.localizacao.esquecer(); this.climaAgora = null; }
    this._aplicarFuso();
    const consultar = changed.some((k) => ['localizacaoModo', 'climaCidade', 'localizacaoRede'].includes(k));
    if (consultar) this._locAgendar(1500);
    else this._locAgendar();
  };

  /** Pergunta de conversa: "onde eu tô?", "atualiza minha localização", "esquece minha localização". */
  P._localizacaoChat = async function (text) {
    const p = pedidoLocalizacao(text);
    if (!p) return null;
    const s = this.store.get();
    if (p === 'esquecer') {
      this.localizacao.esquecer();
      return 'Esqueci. Não guardo nem a última localização agora.';
    }
    if (s.localizacaoModo === 'desligado') return 'A localização está desligada nas Configurações (Privacidade). Eu não sei onde você está e não vou chutar.';
    if (p === 'atualizar') await this._locTick({ forcar: true });
    const r = this.localizacao.resumo();
    if (!r.ativa) {
      const motivo = TEXTO_ERRO_LOC[r.erro] || (s.localizacaoModo === 'manual' ? TEXTO_ERRO_LOC.sem_cidade : 'Ainda não consegui a localização.');
      return `Não sei onde você está agora. ${motivo}`;
    }
    const quando = r.em ? new Date(r.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    return `${r.aproximada ? 'Mais ou menos em' : 'Em'} ${r.lugar}${r.aproximada ? ' (pela rede, pode não ser exato)' : ''}. Fonte: ${r.fonte}${quando ? `, atualizado às ${quando}` : ''}.`;
  };

  /** Localização em uso como "cidade" para a previsão (objeto; sem geocodificar de novo). */
  P._locParaPrevisao = function () {
    const u = this.localizacao.atual();
    if (!u) return null;
    return { latitude: u.lat, longitude: u.lon, name: u.cidade || nomeDoLugar(u) || 'Sua localização', admin1: u.regiao, country: u.pais, timezone: u.fuso || 'auto' };
  };

  /** Estado para a tela de Configurações (sem coordenadas). */
  P.localizacaoInfo = function () {
    const r = this.localizacao.resumo();
    return { ...r, erroTexto: r.erro ? TEXTO_ERRO_LOC[r.erro] || '' : '', erroWindowsTexto: r.erroWindows ? TEXTO_ERRO_LOC[r.erroWindows] || '' : '', intervalos: INTERVALOS_LOC,
      clima: this.climaAgora ? { tipo: this.climaAgora.cond.tipo, noite: this.climaAgora.cond.noite, sensacao: this.climaAgora.cond.sensacao, em: this.climaAgora.em } : null, fuso: this.fusoApp || null };
  };
}
