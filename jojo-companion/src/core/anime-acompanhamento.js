// Acompanhamento de animes (25/11/2026): lista dela, alertas, sessões, episódios assistidos,
// recompensas e estatísticas. Lógica pura e testável, gravação atômica como a carteira:
// toda operação muda uma CÓPIA do estado e só vale depois de `save` confirmar.
//
// Regras centrais:
// - Tempo sempre em UTC (ms); fuso só na exibição (anime-tempo.js).
// - Alertas idempotentes: chave `${anime}:${episodio}:${tipo}` lembra o horário a que se
//   referia; reabrir, reconectar ou corrigir o horário em minutos não repete; adiamento de
//   verdade (30 min ou mais para depois) arma de novo só os avisos do horário.
// - Um episódio é uma chave só (`anime:ep`), seja legendado, dublado, manual ou detectado:
//   nunca rende duas vezes. Revisita rende 20%, uma vez a cada 7 dias, até 3 por dia.
// - Créditos vão para uma fila (`outbox`) no MESMO arquivo, antes de tocar na carteira; a
//   carteira é idempotente pelo id, então um travamento no meio nunca duplica nem perde.
import { RECOMPENSA, LIMITES_ANIME, categoria, duracaoPresumida, limiarMs, valorBase, valorRevisita } from './anime-recompensas.js';
import { FUSO_PADRAO, fusoValido, diaLocal, horaLocal } from './anime-tempo.js';

export const VERSAO_ANIMES = 1;
export const ANIMES_MAX = 500;
const ENVIADOS_MAX = 4000;
const HIST_MAX = 1500;
const FILA_MAX = 40;
const MIN = 60e3, H = 3600e3, D = 86400e3;

/** Tipos de alerta: deslocamento em relação ao horário previsto (ms) e validade depois de disparar. */
export const TIPOS_ALERTA = Object.freeze({
  mes: { nome: 'Um mês antes', antes: 30 * D, validade: D },
  semana: { nome: 'Uma semana antes', antes: 7 * D, validade: D },
  dia: { nome: 'Um dia antes', antes: D, validade: 12 * H },
  manha: { nome: 'Na manhã do lançamento', manha: true },
  h3: { nome: 'Três horas antes', antes: 3 * H },
  h1: { nome: 'Uma hora antes', antes: H },
  m30: { nome: 'Trinta minutos antes', antes: 30 * MIN },
  m15: { nome: 'Quinze minutos antes', antes: 15 * MIN },
  m5: { nome: 'Cinco minutos antes', antes: 5 * MIN },
  horario: { nome: 'No horário previsto', antes: 0, validade: 12 * H, depois: true },
  apos: { nome: 'Depois do lançamento, se não assistiu', antes: -3 * H, validade: 24 * H, depois: true },
});
export const ALERTAS_PADRAO = Object.freeze(['manha', 'horario']);
const RELATIVOS = new Set(['h3', 'h1', 'm30', 'm15', 'm5', 'horario', 'apos']);
const minCustom = (t) => (/^c\d{1,5}$/.test(t) ? Number(t.slice(1)) : null); // c45 = 45 min antes

export function alertaValido(t) {
  return Object.hasOwn(TIPOS_ALERTA, t) || (minCustom(t) != null && minCustom(t) >= 1 && minCustom(t) <= 43200);
}
export const sanitizeAlertas = (v) => (Array.isArray(v) ? [...new Set(v.filter((t) => typeof t === 'string' && alertaValido(t)))].slice(0, 12) : null);

export function animesVazio() {
  return {
    version: VERSAO_ANIMES,
    animes: {},
    config: { alertasPadrao: [...ALERTAS_PADRAO], todosLancamentos: false, fuso: FUSO_PADRAO, mostrarRecompensa: true, resumoDiario: true, contador: false, contadorAnime: null, silencioAte: 0, deteccao: false, telaCheia: 'depois' },
    enviados: {}, enviadosOrdem: [], fila: [],
    sessao: null, historico: [], recIds: {}, outbox: [], creditados: 0,
    stats: { eps: 0, epsAuto: 0, epsManual: 0, minutos: 0, filmes: 0, temporadas: 0, series: 0, longas: 0, retomadas: 0, generos: {}, porAnime: {}, porDia: {}, moedasDia: {} },
    janela: null, // cache do calendário geral { em, itens }
    seq: 0,
  };
}

const inteiro = (n) => Number.isSafeInteger(n) && n >= 0;

/** Valida um estado salvo; lança se estiver corrompido (a gravação atômica volta à cópia anterior). */
export function validarAnimes(v) {
  if (!v || typeof v !== 'object' || v.version !== VERSAO_ANIMES) throw new Error('Lista de animes inválida.');
  const base = animesVazio();
  const st = { ...base, ...v, config: { ...base.config, ...v.config }, stats: { ...base.stats, ...v.stats } };
  if (!st.animes || typeof st.animes !== 'object' || Array.isArray(st.animes)) throw new Error('Lista de animes inválida.');
  for (const [k, a] of Object.entries(st.animes)) {
    if (String(a?.id) !== k || !a.titulo || typeof a.pref !== 'object' || typeof a.prog !== 'object') throw new Error('Anime inválido na lista.');
  }
  for (const k of ['enviadosOrdem', 'fila', 'historico', 'outbox']) if (!Array.isArray(st[k])) throw new Error('Registro de animes inválido.');
  if (!inteiro(st.creditados) || !inteiro(st.seq)) throw new Error('Registro de animes inválido.');
  st.config.fuso = fusoValido(st.config.fuso);
  st.config.alertasPadrao = sanitizeAlertas(st.config.alertasPadrao) || [...ALERTAS_PADRAO];
  return st;
}

/** Entrada nova a partir do anime validado da fonte (mediaSegura) ou de um registro manual. */
export function novaEntrada(media, agora, pref = {}) {
  return {
    ...metadados(media),
    fonte: media.fonte || 'anilist',
    adicionadoEm: agora,
    atualizadoEm: agora,
    pref: { acompanhando: true, favorito: !!pref.favorito, notificar: pref.notificar !== false, versao: ['leg', 'dub', 'ambos'].includes(pref.versao) ? pref.versao : 'ambos', futuras: pref.futuras !== false, alertas: sanitizeAlertas(pref.alertas), silencioAte: 0 },
    prog: { vistos: {}, temporadaConcluida: false, interrompido: null, ultimoVistoEm: 0, ultimoEp: 0 },
    exibidos: [],
  };
}

function metadados(m) {
  const out = {};
  for (const k of ['id', 'titulo', 'romaji', 'english', 'nativo', 'sinonimos', 'formato', 'status', 'episodios', 'duracao', 'generos', 'tags', 'nota', 'temporada', 'ano', 'inicio', 'fim', 'capa', 'cor', 'links', 'relacoes', 'proximo']) out[k] = m[k] ?? (Array.isArray(m[k]) ? [] : null);
  out.sinonimos ||= []; out.generos ||= []; out.tags ||= []; out.links ||= []; out.relacoes ||= [];
  return out;
}

/** Situação de um anime para as listas da Central. */
export function situacao(a, agora) {
  if (!a.pref.acompanhando) return 'arquivado';
  if (a.prog.temporadaConcluida) return a.pref.futuras && proximaTemporada(a) ? 'aguardando' : 'concluido';
  if (a.status === 'HIATUS') return 'pausado';
  if (a.status === 'NOT_YET_RELEASED') return 'aguardando';
  if (a.status === 'FINISHED' || a.status === 'CANCELLED') return Object.keys(a.prog.vistos).length ? 'emAndamento' : 'finalizado';
  if (a.status === 'RELEASING') return 'emTransmissao';
  return a.proximo?.quando > agora ? 'emTransmissao' : 'semData';
}

/** Sequência anunciada (nova temporada) de um anime, se a fonte souber. */
export function proximaTemporada(a) {
  return (a.relacoes || []).find((r) => r.tipo === 'SEQUEL' && r.formato !== 'MOVIE' && ['NOT_YET_RELEASED', 'RELEASING'].includes(r.status)) || null;
}

/** Último episódio que já foi ao ar segundo a fonte (para não aceitar episódio do futuro). */
export function ultimoDisponivel(a, agora) {
  if (a.status === 'FINISHED' || a.status === 'CANCELLED') return a.episodios || Infinity;
  if (a.proximo?.episodio) return a.proximo.quando <= agora ? a.proximo.episodio : a.proximo.episodio - 1;
  if (a.status === 'NOT_YET_RELEASED') return 0;
  return a.episodios || Infinity;
}

export class AcompanhamentoAnime {
  /**
   * @param {object} o
   * @param {object} [o.state]
   * @param {(st:object)=>void} [o.save] gravação atômica; lança em falha
   * @param {()=>number} [o.now] relógio de parede (UTC ms)
   * @param {()=>number} [o.mono] relógio monotônico (ms; não volta nem pula com o relógio do Windows)
   */
  constructor({ state, save = () => {}, now = () => Date.now(), mono = () => performance.now() } = {}) {
    this.st = state ? validarAnimes(state) : animesVazio();
    Object.assign(this, { save, now, mono });
    this.changed = () => {};
  }

  _mutar(fn) {
    const antes = this.st; this.st = structuredClone(antes);
    let r;
    try { r = fn(this.st); this.save(this.st); } catch (e) { this.st = antes; throw e; }
    try { this.changed(); } catch { /* a interface nunca derruba a gravação */ }
    return r;
  }

  get fuso() { return this.st.config.fuso; }
  lista() { return Object.values(this.st.animes); }
  anime(id) { return this.st.animes[id] || null; }
  acompanhados() { return this.lista().filter((a) => a.pref.acompanhando); }

  // ---------------------------------------------------------------- lista dela

  /** Acompanha (ou volta a acompanhar) um anime. `media` vem validado da fonte. */
  seguir(media, pref = {}) {
    if (!media?.id || !media.titulo) throw new Error('Anime sem identificação.');
    const ja = this.st.animes[media.id];
    if (!ja && Object.keys(this.st.animes).length >= ANIMES_MAX) return { ok: false, motivo: 'cheio' };
    return this._mutar((st) => {
      const agora = this.now();
      if (ja) {
        const a = st.animes[media.id];
        Object.assign(a, metadados({ ...a, ...media }));
        a.pref.acompanhando = true;
        for (const k of ['favorito', 'notificar', 'futuras']) if (pref[k] != null) a.pref[k] = !!pref[k];
        if (pref.versao) a.pref.versao = ['leg', 'dub', 'ambos'].includes(pref.versao) ? pref.versao : a.pref.versao;
        if (pref.alertas) a.pref.alertas = sanitizeAlertas(pref.alertas);
        return { ok: true, novo: false, anime: a };
      }
      const a = novaEntrada(media, agora, pref);
      st.animes[a.id] = a;
      return { ok: true, novo: true, anime: a };
    });
  }

  /** Deixa de acompanhar: some dos alertas, mas o histórico (e as moedas) ficam. */
  deixar(id) {
    if (!this.st.animes[id]) return { ok: false, motivo: 'naoSegue' };
    return this._mutar((st) => {
      const a = st.animes[id];
      if (!Object.keys(a.prog.vistos).length) delete st.animes[id];
      else { a.pref.acompanhando = false; a.pref.notificar = false; }
      st.fila = st.fila.filter((f) => f.anime !== id);
      return { ok: true };
    });
  }

  /** Muda preferências de um anime (favorito, notificações, versão, futuras temporadas, alertas). */
  configurar(id, patch = {}) {
    if (!this.st.animes[id]) return { ok: false, motivo: 'naoSegue' };
    return this._mutar((st) => {
      const p = st.animes[id].pref;
      for (const k of ['favorito', 'notificar', 'futuras', 'acompanhando']) if (patch[k] != null) p[k] = !!patch[k];
      if (patch.versao && ['leg', 'dub', 'ambos'].includes(patch.versao)) p.versao = patch.versao;
      if (patch.alertas !== undefined) p.alertas = patch.alertas === null ? null : sanitizeAlertas(patch.alertas);
      if (Number.isFinite(patch.silencioAte)) p.silencioAte = Math.max(0, patch.silencioAte);
      return { ok: true, pref: { ...p } };
    });
  }

  /** Configurações globais (alertas padrão, todos os lançamentos, fuso, resumo, contador…). */
  configurarGeral(patch = {}) {
    return this._mutar((st) => {
      const c = st.config;
      if (patch.alertasPadrao) c.alertasPadrao = sanitizeAlertas(patch.alertasPadrao) || c.alertasPadrao;
      for (const k of ['todosLancamentos', 'mostrarRecompensa', 'resumoDiario', 'contador', 'deteccao']) if (patch[k] != null) c[k] = !!patch[k];
      if (patch.fuso) c.fuso = fusoValido(patch.fuso);
      if (patch.telaCheia && ['depois', 'silencio'].includes(patch.telaCheia)) c.telaCheia = patch.telaCheia;
      if (patch.contadorAnime !== undefined) c.contadorAnime = Number.isInteger(patch.contadorAnime) ? patch.contadorAnime : null;
      if (Number.isFinite(patch.silencioAte)) c.silencioAte = Math.max(0, patch.silencioAte);
      return { ok: true, config: { ...c } };
    });
  }

  // ---------------------------------------------------------------- dados da fonte

  /**
   * Atualiza os metadados vindos da fonte e devolve os eventos de programação percebidos:
   * adiamento, estreia de nova temporada anunciada, pausa, retorno e encerramento.
   */
  atualizar(medias) {
    const eventos = [];
    const lista = (medias || []).filter((m) => m?.id && this.st.animes[m.id]);
    if (!lista.length) return eventos;
    this._mutar((st) => {
      const agora = this.now();
      for (const m of lista) {
        const a = st.animes[m.id];
        const antes = { proximo: a.proximo, status: a.status, seq: proximaTemporada(a)?.id || null };
        // Episódio que já foi ao ar fica guardado (o "horário" e o "depois" ainda olham para ele).
        if (a.proximo && a.proximo.quando <= agora && !a.exibidos.some((e) => e.episodio === a.proximo.episodio)) a.exibidos = [...a.exibidos, { episodio: a.proximo.episodio, quando: a.proximo.quando }].slice(-4);
        Object.assign(a, metadados({ ...a, ...m }));
        a.atualizadoEm = agora;
        const p = a.proximo, q = antes.proximo;
        if (p && q && p.episodio === q.episodio && p.quando - q.quando >= 30 * MIN && q.quando > agora - 6 * H) eventos.push({ tipo: 'adiado', anime: a.id, episodio: p.episodio, de: q.quando, para: p.quando });
        if (antes.status !== 'HIATUS' && a.status === 'HIATUS') eventos.push({ tipo: 'pausa', anime: a.id });
        if (antes.status === 'HIATUS' && a.status === 'RELEASING') eventos.push({ tipo: 'retorno', anime: a.id, episodio: p?.episodio || null, quando: p?.quando || null });
        if (antes.status === 'RELEASING' && a.status === 'FINISHED') eventos.push({ tipo: 'encerrado', anime: a.id });
        const seq = proximaTemporada(a);
        if (seq && seq.id !== antes.seq && a.pref.futuras) eventos.push({ tipo: 'novaTemporada', anime: a.id, sequencia: seq.id, titulo: seq.titulo, inicio: seq.inicio });
      }
    });
    return eventos;
  }

  /** Guarda o calendário geral (todos os lançamentos da janela), já validado. */
  guardarJanela(itens) {
    this._mutar((st) => {
      st.janela = { em: this.now(), itens: (itens || []).slice(0, 400).map((e) => ({ id: e.id, episodio: e.episodio, quando: e.quando, titulo: e.media?.titulo || e.titulo, capa: e.media?.capa || null, cor: e.media?.cor || null, generos: e.media?.generos || [], formato: e.media?.formato || null, duracao: e.media?.duracao || null, nota: e.media?.nota ?? null, links: e.media?.links || [] })) };
    });
  }

  // ---------------------------------------------------------------- alertas

  /** Alertas que valem para um anime (os dele ou os padrões). */
  alertasDe(a) { return a.pref.alertas || this.st.config.alertasPadrao; }

  /** Instante de disparo de um tipo de alerta para um episódio previsto em `quando`. */
  disparo(tipo, quando) {
    const c = minCustom(tipo);
    if (c != null) return quando - c * MIN;
    const t = TIPOS_ALERTA[tipo];
    if (!t) return null;
    if (t.manha) {
      const m = horaLocal(quando, 8, 0, this.fuso);
      return quando - m >= 60 * MIN ? m : null; // lançamento de madrugada: o aviso do horário cobre
    }
    return quando - t.antes;
  }

  /** Até quando um alerta ainda faz sentido (depois disso é descartado sem aparecer). */
  validade(tipo, quando, fire) {
    const t = TIPOS_ALERTA[tipo];
    if (t?.depois) return fire + t.validade;
    return Math.min(quando, fire + (t?.validade || 6 * H));
  }

  /**
   * Alertas devidos agora, em ordem de importância. Idempotente: o que já foi entregue
   * (ou descartado por velho) nunca volta. Depois de reabrir o app, só o mais relevante
   * de cada episódio aparece (nada de enxurrada de avisos antigos).
   */
  devidos(agora = this.now()) {
    const out = [];
    const cfg = this.st.config;
    if (cfg.silencioAte > agora) return out;
    for (const a of this.acompanhados()) {
      if (!a.pref.notificar || a.pref.silencioAte > agora) continue;
      // Só dublado: a fonte não publica o horário do dublado; não há aviso cronometrado falso.
      if (a.pref.versao === 'dub') continue;
      const eps = [...a.exibidos];
      if (a.proximo && !eps.some((e) => e.episodio === a.proximo.episodio)) eps.push(a.proximo);
      for (const e of eps) {
        const candidatos = [];
        for (const tipo of this.alertasDe(a)) {
          if (tipo === 'apos' && a.prog.vistos[e.episodio]) continue;
          const fire = this.disparo(tipo, e.quando);
          if (fire == null || fire > agora) continue;
          const chave = `${a.id}:${e.episodio}:${tipo}`;
          const ja = this.st.enviados[chave];
          if (ja != null && !(RELATIVOS.has(tipo) && e.quando - ja >= 30 * MIN)) continue;
          if (agora > this.validade(tipo, e.quando, fire)) { candidatos.push({ chave, descartar: true, quando: e.quando }); continue; }
          candidatos.push({ chave, anime: a.id, episodio: e.episodio, quando: e.quando, tipo, fire, titulo: a.titulo });
        }
        // Do mesmo episódio, só o alerta mais recente vale; os anteriores ficam como entregues.
        const vivos = candidatos.filter((c) => !c.descartar).sort((x, y) => y.fire - x.fire);
        if (vivos.length) out.push({ ...vivos[0], cobre: [...vivos.slice(1), ...candidatos.filter((c) => c.descartar)].map((c) => [c.chave, c.quando]) });
        else if (candidatos.length) out.push({ descartar: true, cobre: candidatos.map((c) => [c.chave, c.quando]) });
      }
    }
    return out;
  }

  /** Marca alertas como entregues (ou descartados): a chave guarda o horário a que se referia. */
  marcarEnviados(pares) {
    if (!pares?.length) return;
    this._mutar((st) => {
      for (const [chave, quando] of pares) {
        if (!(chave in st.enviados)) st.enviadosOrdem.push(chave);
        st.enviados[chave] = quando;
      }
      while (st.enviadosOrdem.length > ENVIADOS_MAX) delete st.enviados[st.enviadosOrdem.shift()];
      st.fila = st.fila.filter((f) => !pares.some(([c]) => c === f.chave));
    });
  }

  /**
   * Fila persistente de alertas que não puderam aparecer (Trabalho, foco, jogo, tela cheia,
   * descanso). Mantém a ordem; não duplica; descarta o vencido ao entregar.
   */
  enfileirar(alertas) {
    const novos = (alertas || []).filter((x) => x && !x.descartar && !this.st.fila.some((f) => f.chave === x.chave));
    if (!novos.length) return 0;
    this._mutar((st) => { st.fila = [...st.fila, ...novos].slice(-FILA_MAX); });
    return novos.length;
  }

  /** Próximo alerta da fila ainda válido (os vencidos saem da fila como descartados). */
  proximoDaFila(agora = this.now()) {
    const vencidos = [];
    let achado = null;
    for (const f of this.st.fila) {
      if (agora > this.validade(f.tipo, f.quando, f.fire) || (f.adiadoAte && f.adiadoAte > agora)) { if (!(f.adiadoAte > agora)) vencidos.push([f.chave, f.quando]); continue; }
      achado = f; break;
    }
    if (vencidos.length) this.marcarEnviados(vencidos);
    return achado;
  }

  /** "Lembrar mais tarde": o alerta volta depois de `min` minutos (sem duplicar). */
  adiarAlerta(chave, min = 30) {
    const agora = this.now();
    return this._mutar((st) => {
      let f = st.fila.find((x) => x.chave === chave);
      if (!f) return { ok: false, motivo: 'semAlerta' };
      f.adiadoAte = agora + Math.max(5, Math.min(24 * 60, min)) * MIN;
      // O alerta adiado continua válido até a nova hora (+ 1 h), mesmo se passou do horário.
      if (TIPOS_ALERTA[f.tipo]?.depois) f.fire = Math.max(f.fire, f.adiadoAte - TIPOS_ALERTA[f.tipo].validade + H);
      else { f.tipo = 'horario'; f.fire = f.adiadoAte; }
      return { ok: true, ate: f.adiadoAte };
    });
  }

  /** Silencia um anime (ou tudo, com id null) até `ate`. */
  silenciar(id, ate) {
    if (id == null) return this.configurarGeral({ silencioAte: ate });
    return this.configurar(id, { silencioAte: ate });
  }

  // ---------------------------------------------------------------- sessões e episódios

  /** Episódio aceito para este anime agora? (não aceita temporada ou episódio inexistente/futuro) */
  episodioValido(a, ep, agora = this.now()) {
    if (!Number.isInteger(ep) || ep < 1 || ep > 100000) return false;
    if (a.formato === 'MOVIE') return ep === 1;
    return ep <= ultimoDisponivel(a, agora);
  }

  /** Próximo episódio a assistir (continua de onde parou). */
  proximoParaAssistir(a, agora = this.now()) {
    if (a.prog.interrompido) return a.prog.interrompido.episodio;
    let ep = 1;
    while (a.prog.vistos[ep]) ep++;
    return this.episodioValido(a, ep, agora) ? ep : null;
  }

  /** Começa uma sessão (manual ou detectada). Só uma de cada vez: não dá para multiplicar. */
  iniciarSessao({ anime, episodio = null, origem = 'manual', posicaoS = null }) {
    const a = this.st.animes[anime];
    if (!a) return { ok: false, motivo: 'naoSegue' };
    const agora = this.now();
    const ep = episodio ?? this.proximoParaAssistir(a, agora);
    if (!this.episodioValido(a, ep, agora)) return { ok: false, motivo: 'episodioInvalido', ultimo: ultimoDisponivel(a, agora) };
    const s = this.st.sessao;
    if (s && !(s.anime === anime && s.episodio === ep)) return { ok: false, motivo: 'outraSessao', sessao: { ...s } };
    if (s) return { ok: true, sessao: { ...s }, retomada: true };
    return this._mutar((st) => {
      const mono = this.mono();
      const retomar = a.prog.interrompido?.episodio === ep ? a.prog.interrompido.efetivoMs || 0 : 0;
      st.seq += 1;
      st.sessao = { id: `s${st.seq}`, anime, episodio: ep, origem: origem === 'auto' ? 'auto' : 'manual', inicioWall: agora, inicioMono: mono, ultimoMono: mono, ultimoWall: agora, efetivoMs: retomar, pausada: false, pulosMs: 0, posicaoS: Number.isFinite(posicaoS) ? posicaoS : null, relogioSuspeito: false, telaCheia: false };
      return { ok: true, sessao: { ...st.sessao } };
    });
  }

  /**
   * Avança a sessão. Conta só tempo de reprodução real: relógio monotônico (mudar o relógio
   * do Windows não conta), pausa não conta. Com progresso da reprodução (detecção), pulo
   * para a frente além do tempo real vira "pulado", não assistido.
   */
  tickSessao({ tocando = true, posicaoS = null } = {}) {
    const s = this.st.sessao;
    if (!s) return null;
    return this._mutar((st) => {
      const x = st.sessao; const mono = this.mono(); const wall = this.now();
      const dMono = Math.max(0, mono - x.ultimoMono);
      const dWall = wall - x.ultimoWall;
      if (Math.abs(dWall - dMono) > 2 * MIN) x.relogioSuspeito = true;
      let conta = x.pausada || !tocando ? 0 : Math.min(dMono, 10 * MIN); // um tique nunca vale mais de 10 min
      if (Number.isFinite(posicaoS) && Number.isFinite(x.posicaoS) && !x.pausada && tocando) {
        const andou = (posicaoS - x.posicaoS) * 1000;
        if (andou > dMono + 15e3) x.pulosMs += andou - dMono; // avançou o vídeo
        if (andou < 0) conta = Math.min(conta, Math.max(0, dMono + andou)); // voltou: só o que tocou
      }
      x.efetivoMs += conta;
      x.ultimoMono = mono; x.ultimoWall = wall;
      if (Number.isFinite(posicaoS)) x.posicaoS = posicaoS;
      return { ...x };
    });
  }

  pausar() { if (!this.st.sessao || this.st.sessao.pausada) return null; this.tickSessao(); return this._mutar((st) => { st.sessao.pausada = true; return { ...st.sessao }; }); }
  retomar() { if (!this.st.sessao?.pausada) return null; return this._mutar((st) => { st.sessao.pausada = false; st.sessao.ultimoMono = this.mono(); st.sessao.ultimoWall = this.now(); return { ...st.sessao }; }); }
  marcarTelaCheia(v) { if (this.st.sessao && this.st.sessao.telaCheia !== !!v) this._mutar((st) => { st.sessao.telaCheia = !!v; }); }

  /** Interrompe e guarda onde parou (para "continuar de onde parei"). */
  interromper() {
    if (!this.st.sessao) return null;
    this.tickSessao();
    return this._mutar((st) => {
      const s = st.sessao; const a = st.animes[s.anime];
      if (a) a.prog.interrompido = { episodio: s.episodio, efetivoMs: s.efetivoMs, posicaoS: s.posicaoS, em: this.now() };
      st.sessao = null;
      return { ok: true, interrompido: a?.prog.interrompido || null };
    });
  }

  /** Quanto falta (ms de reprodução) para a sessão atual ser elegível. */
  faltaParaConcluir() {
    const s = this.st.sessao; if (!s) return null;
    const a = this.st.animes[s.anime];
    const ef = s.efetivoMs - Math.max(0, s.pulosMs - 4.5 * MIN); // pular abertura/créditos é permitido
    return Math.max(0, limiarMs(a.formato, a.duracao) - ef);
  }

  /**
   * Conclui a sessão. Elegível (tempo efetivo ≥ ~85%): concede a recompensa. Senão, guarda
   * onde parou e não concede nada (sem perder o progresso). `confirmado`: ela disse que terminou.
   */
  concluirSessao() {
    const s = this.st.sessao;
    if (!s) return { ok: false, motivo: 'semSessao' };
    this.tickSessao();
    const falta = this.faltaParaConcluir();
    if (falta > 0) {
      const r = this.interromper();
      return { ok: false, motivo: 'incompleto', faltaMs: falta, interrompido: r?.interrompido || null };
    }
    const x = this.st.sessao;
    return this._registrarEpisodio({ anime: x.anime, episodio: x.episodio, origem: x.origem, verificado: x.origem === 'auto', minutos: x.efetivoMs / MIN, sessao: x.id, relogioSuspeito: x.relogioSuspeito });
  }

  /**
   * Registro manual (TV, celular, outro aparelho): autodeclarado, elegível com regras de
   * consistência: o que foi registrado à mão nas últimas 24 h precisa caber em 8 h de tela
   * (folga de 20 min) e tudo junto, manual e detectado, em 24 h. Fora disso o episódio é
   * marcado como visto, sem JOJOcoins, e a resposta explica.
   */
  registrarManual({ anime, episodio, semRecompensa = false }) {
    const a = this.st.animes[anime];
    if (!a) return { ok: false, motivo: 'naoSegue' };
    if (this.st.sessao && this.st.sessao.anime === anime && this.st.sessao.episodio === episodio) return this.concluirSessao();
    if (!this.episodioValido(a, episodio)) return { ok: false, motivo: 'episodioInvalido', ultimo: ultimoDisponivel(a, this.now()) };
    const cabe = !semRecompensa && this._cabeNoTempo(a);
    return this._registrarEpisodio({ anime, episodio, origem: 'manual', verificado: false, minutos: duracaoPresumida(a.formato, a.duracao), semMoedas: !cabe, motivoSemMoedas: semRecompensa ? 'pedido' : cabe ? null : 'tempo' });
  }

  _cabeNoTempo(a) {
    const agora = this.now();
    const dur = duracaoPresumida(a.formato, a.duracao);
    // O que já foi recompensado nas últimas 24 h ocupa tempo real: nada de 30 episódios num dia.
    const recentes = this.st.historico.filter((h) => h.em > agora - D && h.moedasBase > 0 && !h.corrigido);
    const manual = recentes.filter((h) => h.origem === 'manual').reduce((t, h) => t + h.minutos, 0);
    const total = recentes.reduce((t, h) => t + h.minutos, 0);
    return manual + dur <= LIMITES_ANIME.manualMinDia + LIMITES_ANIME.manualFolgaMin && total + dur <= 24 * 60;
  }

  /** Núcleo: registra o episódio, calcula a recompensa e põe os créditos na fila. */
  _registrarEpisodio({ anime, episodio, origem, verificado, minutos, sessao = null, semMoedas = false, motivoSemMoedas = null, relogioSuspeito = false }) {
    return this._mutar((st) => {
      const agora = this.now(); const a = st.animes[anime]; const dia = diaLocal(agora, st.config.fuso);
      const base = valorBase(a.formato, a.duracao);
      const cat = categoria(a.formato, duracaoPresumida(a.formato, a.duracao));
      const anterior = a.prog.vistos[episodio];
      const creditos = []; const conquistasContas = {};
      let tipo = 'episodio';
      let moedasBase = 0;
      const recId = (k) => `anime:${k}`;
      const credita = (id, valor, rotulo) => {
        if (semMoedas || valor <= 0 || st.recIds[id]) return 0;
        st.recIds[id] = agora; st.outbox.push({ id, valor, rotulo: rotulo.slice(0, 80), anime, em: agora }); creditos.push({ id, valor, rotulo });
        return valor;
      };
      // Bônus com teto próprio por dia (o que passar do teto não é pago depois).
      st.stats.bonusDia ||= {};
      const creditaBonus = (id, valor, rotulo) => {
        const resta = Math.max(0, LIMITES_ANIME.tetoDiaBonus - (st.stats.bonusDia[dia] || 0));
        const v = credita(id, Math.min(valor, resta), rotulo);
        if (v) st.stats.bonusDia[dia] = (st.stats.bonusDia[dia] || 0) + v;
        else if (!semMoedas && !st.recIds[id]) st.recIds[id] = agora; // passou do teto: conta como dado
        return v;
      };
      const ganhoDiaEps = st.stats.moedasDia[dia] || 0;
      const cabeDia = (v) => Math.max(0, Math.min(v, LIMITES_ANIME.tetoDiaEpisodios - ganhoDiaEps));
      if (!anterior) {
        moedasBase = credita(recId(`ep:${anime}:${episodio}`), cabeDia(base), `Anime: ${a.titulo} ep. ${episodio}`);
        if (!semMoedas && moedasBase < base && !motivoSemMoedas) motivoSemMoedas = 'tetoDia';
      } else {
        tipo = 'revisita';
        const ultima = anterior.ultimaRecompensa || anterior.em;
        const revisitasHoje = st.historico.filter((h) => h.tipo === 'revisita' && h.dia === dia && h.moedasBase > 0).length;
        if (agora - ultima >= LIMITES_ANIME.revisitaIntervaloDias * D && revisitasHoje < LIMITES_ANIME.revisitasDia) {
          moedasBase = credita(recId(`rev:${anime}:${episodio}:${dia}`), cabeDia(valorRevisita(base)), `Anime (revisita): ${a.titulo} ep. ${episodio}`);
        } else if (!motivoSemMoedas) motivoSemMoedas = 'revisita';
      }
      if (moedasBase > 0) st.stats.moedasDia[dia] = ganhoDiaEps + moedasBase;
      const bonus = [];
      const vistosAntes = Object.keys(a.prog.vistos).length;
      // Primeiro episódio de um anime novo para ela (uma vez por anime, nunca na revisita).
      if (tipo === 'episodio' && vistosAntes === 0) { const v = creditaBonus(recId(`primeiro:${anime}`), RECOMPENSA.primeiroEp, `Anime novo: ${a.titulo}`); if (v) bonus.push({ id: 'primeiroEp', valor: v }); }
      // Retomada: parado há 30 dias ou mais, sem ter concluído.
      const parado = a.prog.ultimoVistoEm && agora - a.prog.ultimoVistoEm >= LIMITES_ANIME.retomadaDias * D && !a.prog.temporadaConcluida;
      if (tipo === 'episodio' && parado) {
        const v = creditaBonus(recId(`ret:${anime}:${diaLocal(a.prog.ultimoVistoEm, st.config.fuso)}`), RECOMPENSA.retomada, `Retomou ${a.titulo}`);
        if (v) { bonus.push({ id: 'retomada', valor: v }); st.stats.retomadas += 1; conquistasContas.animeRetomadas = st.stats.retomadas; }
      }
      // Registro do episódio (uma chave só para legendado, dublado, manual e detectado).
      a.prog.vistos[episodio] = { em: anterior?.em || agora, origem: anterior?.origem === 'auto' ? 'auto' : origem, vezes: (anterior?.vezes || 0) + 1, ultimaRecompensa: moedasBase > 0 ? agora : anterior?.ultimaRecompensa || anterior?.em || agora };
      a.prog.ultimoVistoEm = agora; a.prog.ultimoEp = Math.max(a.prog.ultimoEp || 0, episodio);
      if (a.prog.interrompido?.episodio === episodio) a.prog.interrompido = null;
      // Temporada: todos os episódios conhecidos registrados (temporada inexistente não conta).
      let concluiuTemporada = false; let concluiuSerie = false;
      const total = a.formato === 'MOVIE' ? 1 : a.episodios;
      if (!a.prog.temporadaConcluida && total && ['FINISHED', 'CANCELLED'].includes(a.status) || (!a.prog.temporadaConcluida && a.formato === 'MOVIE')) {
        let todos = true; for (let e = 1; e <= total; e++) if (!a.prog.vistos[e]) { todos = false; break; }
        if (todos) {
          a.prog.temporadaConcluida = true; concluiuTemporada = a.formato !== 'MOVIE';
          if (concluiuTemporada) {
            const v = creditaBonus(recId(`temp:${anime}`), RECOMPENSA.temporada, `Temporada concluída: ${a.titulo}`);
            if (v) bonus.push({ id: 'temporada', valor: v });
            st.stats.temporadas += 1; conquistasContas.animeTemporadas = st.stats.temporadas;
          }
          // Série: sem sequência conhecida (nem anunciada) e a obra encerrada.
          const temSequencia = (a.relacoes || []).some((r) => r.tipo === 'SEQUEL' && r.formato !== 'MOVIE');
          if (!temSequencia && a.status === 'FINISHED' && a.formato !== 'MOVIE') {
            concluiuSerie = true;
            const v = creditaBonus(recId(`serie:${anime}`), RECOMPENSA.serie, `Anime concluído: ${a.titulo}`);
            if (v) bonus.push({ id: 'serie', valor: v });
            st.stats.series += 1; conquistasContas.animeSeries = st.stats.series;
            if ((a.episodios || 0) >= LIMITES_ANIME.obraLongaEps) { st.stats.longas += 1; conquistasContas.animeLongas = st.stats.longas; }
          }
        }
      }
      // Estatísticas reais.
      if (tipo === 'episodio') {
        st.stats.eps += 1; if (origem === 'auto') st.stats.epsAuto += 1; else st.stats.epsManual += 1;
        if (cat === 'filme') { st.stats.filmes += 1; conquistasContas.animeFilmes = st.stats.filmes; }
        conquistasContas.animeEps = st.stats.eps;
        for (const g of a.generos || []) st.stats.generos[g] = (st.stats.generos[g] || 0) + 1;
        conquistasContas.animeGeneros = Object.keys(st.stats.generos).length;
      }
      st.stats.minutos += Math.round(minutos);
      const pa = st.stats.porAnime[anime] ||= { eps: 0, moedas: 0, minutos: 0 };
      pa.eps += tipo === 'episodio' ? 1 : 0; pa.minutos += Math.round(minutos);
      const total$ = creditos.reduce((t, c) => t + c.valor, 0);
      pa.moedas += total$;
      st.stats.porDia[dia] = (st.stats.porDia[dia] || 0) + total$;
      const dias = Object.keys(st.stats.porDia); if (dias.length > 400) for (const k of dias.sort().slice(0, dias.length - 400)) delete st.stats.porDia[k];
      const dm = Object.keys(st.stats.moedasDia); if (dm.length > 40) for (const k of dm.sort().slice(0, dm.length - 40)) delete st.stats.moedasDia[k];
      const db = Object.keys(st.stats.bonusDia); if (db.length > 40) for (const k of db.sort().slice(0, db.length - 40)) delete st.stats.bonusDia[k];
      st.seq += 1;
      const reg = { id: `h${st.seq}`, anime, titulo: a.titulo, episodio, tipo, origem, verificado: !!verificado, categoria: cat, minutos: Math.round(minutos), moedasBase, bonus, total: total$, em: agora, dia, sessao, relogioSuspeito: !!relogioSuspeito, motivoSemMoedas };
      st.historico.push(reg); if (st.historico.length > HIST_MAX) st.historico = st.historico.slice(-HIST_MAX);
      if (st.sessao) st.sessao = null;
      return { ok: true, registro: reg, creditos, concluiuTemporada, concluiuSerie, contas: conquistasContas };
    });
  }

  /** Crédito extra de uma conquista de anime (uma vez por conquista). */
  creditarConquista(c) {
    const id = `anime:conq:${c.id}`;
    if (this.st.recIds[id]) return 0;
    this._mutar((st) => { st.recIds[id] = this.now(); st.outbox.push({ id, valor: c.moedas, rotulo: `Conquista: ${c.nome}`, anime: null, em: this.now() }); });
    return c.moedas;
  }

  /**
   * Envia a fila de créditos para a carteira oficial. `creditar` é `Loja.creditar`
   * (idempotente pelo id). Para no primeiro que falhar; o resto fica para depois.
   */
  drenarCreditos(creditar) {
    const feitos = [];
    while (this.st.outbox.length) {
      const c = this.st.outbox[0];
      let r;
      try { r = creditar({ id: c.id, valor: c.valor, origem: 'anime', rotulo: c.rotulo }); } catch { break; }
      if (!r?.ok) break;
      this._mutar((st) => {
        st.outbox = st.outbox.filter((x) => x.id !== c.id);
        st.creditados += r.creditado || 0;
        const h = [...st.historico].reverse().find((x) => x.anime === c.anime && c.anime != null);
        if (h) h.creditado = (h.creditado || 0) + (r.creditado || 0);
      });
      feitos.push({ ...c, creditado: r.duplicado ? 0 : r.creditado, duplicado: !!r.duplicado });
    }
    return feitos;
  }

  /**
   * Corrige o histórico: tira um episódio registrado por engano. Se ele tinha rendido moedas,
   * devolve a lista de estornos a fazer pela carteira (`Loja.estornar`), sem mexer em nada
   * que não foi creditado; o progresso dos outros episódios fica intacto.
   */
  corrigir(regId) {
    const reg = this.st.historico.find((h) => h.id === regId);
    if (!reg || reg.corrigido) return { ok: false, motivo: 'semRegistro' };
    return this._mutar((st) => {
      const h = st.historico.find((x) => x.id === regId); h.corrigido = this.now();
      const a = st.animes[h.anime];
      if (a && h.tipo === 'episodio' && a.prog.vistos[h.episodio]) {
        delete a.prog.vistos[h.episodio];
        if (a.prog.temporadaConcluida) a.prog.temporadaConcluida = false;
        st.stats.eps = Math.max(0, st.stats.eps - 1);
        if (h.origem === 'auto') st.stats.epsAuto = Math.max(0, st.stats.epsAuto - 1); else st.stats.epsManual = Math.max(0, st.stats.epsManual - 1);
        const pa = st.stats.porAnime[h.anime]; if (pa) { pa.eps = Math.max(0, pa.eps - 1); pa.moedas = Math.max(0, pa.moedas - (h.total || 0)); }
      }
      // O que ainda está na fila sai da fila; o que já foi creditado vira estorno.
      const ids = [`anime:ep:${h.anime}:${h.episodio}`, `anime:rev:${h.anime}:${h.episodio}:${h.dia}`];
      const naFila = st.outbox.filter((c) => ids.includes(c.id));
      st.outbox = st.outbox.filter((c) => !ids.includes(c.id));
      for (const id of ids) delete st.recIds[id];
      const estornos = h.moedasBase > 0 && !naFila.length ? [{ id: ids[h.tipo === 'revisita' ? 1 : 0], valor: h.moedasBase, motivo: `Correção: ${h.titulo} ep. ${h.episodio}` }] : [];
      return { ok: true, estornos };
    });
  }

  /** Resumo do dia já dado (uma vez por dia). */
  marcarResumo(dia) { this._mutar((st) => { st.resumoDia = dia; }); }

  // ---------------------------------------------------------------- consultas

  /** JOJOcoins previstos para o próximo episódio de um anime (valores reais da tabela). */
  previsao(id, ep = null) {
    const a = this.st.animes[id];
    if (!a) return null;
    const e = ep ?? this.proximoParaAssistir(a) ?? (a.proximo?.episodio || 1);
    const base = valorBase(a.formato, a.duracao);
    const revisita = !!a.prog.vistos[e];
    const dia = diaLocal(this.now(), this.fuso);
    const resta = Math.max(0, LIMITES_ANIME.tetoDiaEpisodios - (this.st.stats.moedasDia[dia] || 0));
    const valor = Math.min(revisita ? valorRevisita(base) : base, resta);
    const bonus = [];
    if (!revisita && !Object.keys(a.prog.vistos).length && !this.st.recIds[`anime:primeiro:${id}`]) bonus.push({ id: 'primeiroEp', valor: RECOMPENSA.primeiroEp });
    if (!revisita && a.episodios && ['FINISHED', 'CANCELLED'].includes(a.status) && Object.keys(a.prog.vistos).length === a.episodios - 1 && !a.prog.vistos[e] && !this.st.recIds[`anime:temp:${id}`]) bonus.push({ id: 'temporada', valor: RECOMPENSA.temporada });
    return { anime: id, episodio: e, base, valor, revisita, bonus, total: valor + bonus.reduce((t, b) => t + b.valor, 0), categoria: categoria(a.formato, duracaoPresumida(a.formato, a.duracao)), limiteDiaRestante: resta };
  }

  /** Episódios disponíveis e ainda não assistidos de cada anime acompanhado. */
  pendentes(agora = this.now()) {
    const out = [];
    for (const a of this.acompanhados()) {
      const ult = ultimoDisponivel(a, agora);
      if (!Number.isFinite(ult) || ult < 1) continue;
      const faltam = [];
      for (let e = Math.max(1, (a.prog.ultimoEp || 0) - 50); e <= ult && faltam.length < 200; e++) if (!a.prog.vistos[e]) faltam.push(e);
      if (Object.keys(a.prog.vistos).length && faltam.length) out.push({ anime: a.id, titulo: a.titulo, episodios: faltam, quantidade: faltam.length });
    }
    return out.sort((x, y) => y.quantidade - x.quantidade);
  }

  /** Estatísticas (todas reais e persistentes). */
  estatisticas(agora = this.now()) {
    const s = this.st.stats;
    const generos = Object.entries(s.generos).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const ate = (dias) => { const lim = diaLocal(agora - dias * D, this.fuso); return Object.entries(s.porDia).filter(([d]) => d > lim).reduce((t, [, v]) => t + v, 0); };
    const porAnime = Object.entries(s.porAnime).map(([id, v]) => ({ id: Number(id), titulo: this.st.animes[id]?.titulo || `#${id}`, ...v })).sort((a, b) => b.moedas - a.moedas).slice(0, 20);
    const lista = this.lista();
    return {
      episodios: s.eps, verificados: s.epsAuto, autodeclarados: s.epsManual, minutos: s.minutos, filmes: s.filmes, temporadas: s.temporadas, series: s.series,
      generos, porAnime, moedasTotal: this.st.creditados, moedasFila: this.st.outbox.reduce((t, c) => t + c.valor, 0),
      moedas7d: ate(7), moedas30d: ate(30),
      emAndamento: lista.filter((a) => situacao(a, agora) === 'emAndamento' || (Object.keys(a.prog.vistos).length && !a.prog.temporadaConcluida && a.pref.acompanhando)).length,
      interrompidos: lista.filter((a) => a.prog.ultimoVistoEm && agora - a.prog.ultimoVistoEm >= LIMITES_ANIME.retomadaDias * D && !a.prog.temporadaConcluida).length,
    };
  }

  /** Resumo leve para a interface (cópia; nada mutável sai daqui). */
  resumo(agora = this.now()) {
    return {
      config: { ...this.st.config },
      animes: this.lista().map((a) => ({ ...structuredClone(a), situacao: situacao(a, agora), proximoAssistir: this.proximoParaAssistir(a, agora), ultimoDisponivel: Number.isFinite(ultimoDisponivel(a, agora)) ? ultimoDisponivel(a, agora) : null, previsao: this.previsao(a.id) })),
      sessao: this.st.sessao ? { ...this.st.sessao, faltaMs: this.faltaParaConcluir() } : null,
      historico: this.st.historico.slice(-80).reverse(),
      pendentes: this.pendentes(agora),
      estatisticas: this.estatisticas(agora),
      janela: this.st.janela,
      fila: this.st.fila.length,
    };
  }
}
