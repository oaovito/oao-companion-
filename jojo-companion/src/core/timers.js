// Temporizadores do JoJo (0.47.5, pedido do João de 19/11/2026). Puro e testável.
//
// O tempo é contado por referências, nunca por quadros: cada timer guarda quanto já
// correu (`acumuladoMs`) e, enquanto roda, o instante monotônico em que voltou a correr.
// O desenho só lê `restante()`/`decorrido()`, então FPS, animação e visibilidade não
// mudam a contagem. Esconder o relógio nunca cancela nada.
//
// Tipos:
//  - regressivo: conta até zero;
//  - progressivo: cronômetro que só sobe (pode ter meta, sem terminar sozinho);
//  - intervalado: fases que se alternam (série/descanso, posição de alongamento, foco/pausa);
//  - recorrente: regressivo que recomeça sozinho a cada fim;
//  - espelho: mostra o tempo de algo que já existe (bloco de foco, lembrete de água ou de
//    pausa). Não termina por conta própria nem dá XP: quem decide é o sistema original.
//
// Política de recuperação (app fechado e reaberto):
//  - regressivo, intervalado e recorrente continuam contando pelo relógio de parede, como
//    um timer de cozinha. Se acabaram com o app fechado, entram no histórico como
//    "terminou com o app fechado", com um único aviso discreto e SEM XP;
//  - progressivo volta pausado no último segundo salvo (tempo com o app fechado não conta);
//  - pausado continua pausado; espelhos são recriados pelo sistema de origem.
// Suspensão do Windows: regressivos contam o tempo dormindo (o relógio de verdade
// também conta); progressivos pausam durante a suspensão e voltam sozinhos.

export const TIMER_LIMITES = Object.freeze({ maxTimers: [1, 5], duracaoMin: [0.25, 600], historico: 200, rotulo: 40, xpPorDia: 6, minXpMin: 5, confirmarMin: 15 });

/** Aparências do relógio (todas desenhadas em src/renderer/shared/relogio-desenho.js). */
export const APARENCIAS = Object.freeze({
  digital: 'Relógio digital flutuante',
  esportivo: 'Cronômetro esportivo',
  ampulheta: 'Ampulheta',
  analogico: 'Relógio analógico',
  barra: 'Barra de progresso',
  holograma: 'Pequeno holograma',
  bolso: 'Relógio de bolso',
  minimalista: 'Temporizador minimalista',
  circular: 'Contagem circular ao redor do JoJo',
});
/** Aparências liberadas pela progressão (sessões concluídas). As outras vêm de saída. */
export const APARENCIA_DESBLOQUEIO = Object.freeze({ esportivo: 3, ampulheta: 5, bolso: 10, circular: 15, holograma: 25 });

/**
 * Atividades. `modo` é o tipo padrão; `xp` diz se a sessão concluída pode render XP;
 * `confirmar` exige que ela confirme que fez (exercício, alongamento, hábito) antes do XP;
 * `habito` marca o hábito existente quando confirmado; `fonte` liga a um sistema que já
 * existe (foco, lembrete de água/pausa, tarefa da lista).
 */
export const ATIVIDADES = Object.freeze({
  estudo: { nome: 'Estudo', modo: 'espelho', fonte: 'foco', duracaoMin: 25, aparencia: 'digital', xp: false, sugerir: true },
  trabalho: { nome: 'Trabalho', modo: 'progressivo', duracaoMin: 50, aparencia: 'minimalista', xp: true, sugerir: false },
  meditacao: { nome: 'Meditação', modo: 'regressivo', duracaoMin: 10, aparencia: 'ampulheta', xp: true, calmo: true, sugerir: false },
  exercicios: { nome: 'Exercícios', modo: 'intervalado', duracaoMin: 1.5, series: 4, serieSeg: 45, aparencia: 'esportivo', xp: true, confirmar: true, habito: 'treino', sugerir: true },
  alongamento: { nome: 'Alongamento', modo: 'intervalado', duracaoMin: 0.5, series: 6, aparencia: 'circular', xp: true, confirmar: true, sugerir: false },
  alimentacao: { nome: 'Alimentação', modo: 'regressivo', duracaoMin: 20, aparencia: 'analogico', xp: false, sugerir: true },
  hidratacao: { nome: 'Hidratação', modo: 'espelho', fonte: 'agua', duracaoMin: 90, aparencia: 'barra', xp: false, sugerir: false },
  jogos: { nome: 'Jogos', modo: 'progressivo', duracaoMin: 60, aparencia: 'holograma', xp: false, sugerir: true, desligadaPadrao: true },
  descanso: { nome: 'Descanso', modo: 'regressivo', duracaoMin: 10, aparencia: 'ampulheta', xp: false, sugerir: false },
  tarefa: { nome: 'Tarefa', modo: 'progressivo', duracaoMin: 25, aparencia: 'bolso', xp: false, fonte: 'tarefa', sugerir: false },
  habito: { nome: 'Hábito', modo: 'regressivo', duracaoMin: 20, aparencia: 'barra', xp: true, confirmar: true, sugerir: false },
  personalizado: { nome: 'Personalizado', modo: 'regressivo', duracaoMin: 10, aparencia: 'digital', xp: true, sugerir: false },
});
export const ATIVIDADE_IDS = Object.freeze(Object.keys(ATIVIDADES));

/** Preferências de cada atividade (persistidas em `timersAtividades`). */
export function atividadePadrao(id) {
  const a = ATIVIDADES[id];
  return { ativo: !a.desligadaPadrao, sugerir: !!a.sugerir, animar: true, duracaoMin: a.duracaoMin };
}

export function sanitizeAtividades(src) {
  const out = {};
  for (const id of ATIVIDADE_IDS) {
    const p = src && typeof src === 'object' && !Array.isArray(src) && src[id] && typeof src[id] === 'object' ? src[id] : {};
    const d = atividadePadrao(id);
    out[id] = {
      ativo: typeof p.ativo === 'boolean' ? p.ativo : d.ativo,
      sugerir: typeof p.sugerir === 'boolean' ? p.sugerir : d.sugerir,
      animar: typeof p.animar === 'boolean' ? p.animar : d.animar,
      duracaoMin: Number.isFinite(p.duracaoMin) ? clamp(p.duracaoMin, ...TIMER_LIMITES.duracaoMin) : d.duracaoMin,
    };
  }
  return out;
}

export function sanitizeOffset(o) {
  if (!o || typeof o !== 'object' || !Number.isFinite(o.x) || !Number.isFinite(o.y)) return { x: 0, y: 0 };
  return { x: clamp(Math.round(o.x), -600, 600), y: clamp(Math.round(o.y), -600, 600) };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => semAcento(s).replace(/[^a-z0-9:\s]/g, ' ').replace(/\s+/g, ' ').trim();

export function emptyTimers() {
  return { versao: 1, timers: [], destacado: null, historico: [], stats: { sessoes: 0, ms: 0, porAtividade: {} }, xpDia: { dia: null, n: 0 }, seq: 0, avisosFechado: [] };
}

/** Formata ms como 1:05:09 / 25:00 / 0:09. */
export function formatarTempo(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
}
/** "25 min", "1 h 10 min", "45 s". */
export function duracaoFalada(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
}

// ------------------------------------------------------------------ pedidos em linguagem natural

const NUM_PALAVRA = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, quinze: 15, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, meia: 0.5 };

/** Duração no texto em minutos ("10 min", "1h30", "90 segundos", "meia hora", "dez minutos"). */
export function duracaoDoTexto(n) {
  const t = ` ${norm(n)} `.replace(/\b(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|quinze|vinte|trinta|quarenta|cinquenta|sessenta)\b(?=\s+(?:min|minutos?|horas?|h|segundos?|seg|s)\b)/g, (w) => String(NUM_PALAVRA[w]));
  if (/\bmeia hora\b/.test(t)) return 30;
  let m = t.match(/\b(\d{1,2})\s*h(?:oras?)?\s*(?:e\s*)?(\d{1,2})\s*(?:m|min|minutos?)?\b/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = t.match(/\b(\d{1,2}):(\d{2})\b/);
  if (m) return Number(m[1]) + Number(m[2]) / 60;
  m = t.match(/\b(\d{1,3}(?:[.,]\d)?)\s*(segundos?|seg|s)\b/);
  if (m) return Number(m[1].replace(',', '.')) / 60;
  m = t.match(/\b(\d{1,2}(?:[.,]\d)?)\s*(horas?|h)\b/);
  if (m) return Number(m[1].replace(',', '.')) * 60;
  m = t.match(/\b(\d{1,3})\s*(m|min|minutos?|mins)\b/);
  if (m) return Number(m[1]);
  return null;
}

const ATIV_REGEX = [
  ['meditacao', /\bmedit\w*|\brespira\w*/],
  ['alongamento', /\balong\w*/],
  ['exercicios', /\b(series?|exercicio\w*|treino|treinar|descanso entre)\b/],
  ['alimentacao', /\b(comer|comida|refeic\w*|almoc\w*|jant\w*|lanche|cafe da manha)\b/],
  ['hidratacao', /\b(agua|hidrat\w*)\b/],
  ['jogos', /\b(jogo|jogando|jogatina|partida|gameplay)\b/],
  ['descanso', /\b(descanso|descansar|pausa programada|cochilo)\b/],
  ['estudo', /\b(estud\w*|pomodoro)\b/],
  ['trabalho', /\b(trabalh\w*|bloco produtivo)\b/],
  ['tarefa', /\btarefa\b/],
  ['habito', /\bhabito\b/],
];
export function atividadeDoTexto(n) {
  const t = norm(n);
  for (const [id, re] of ATIV_REGEX) if (re.test(t)) return id;
  return null;
}

const OBJ = '(?:o |a |os |as |meu |minha |esse |essa |este |esta )?(?:timer|timers|temporizador\\w*|cronometro|relogio|contador|contagem)';

/**
 * Pedido de timer na conversa. Devolve {acao, ...} ou null. Só reage a pedidos
 * claros; "me lembra de X às 8" continua sendo lembrete e "/foco" continua sendo foco.
 */
export function parseTimerRequest(text) {
  const original = String(text || '').replace(/^\s*jojo[,!:]?\s*/i, '').trim();
  const n = norm(original);
  if (!n || n.length > 200) return null;
  const re = (s) => new RegExp(s);
  if (re(`^(pausa|pausar|pause|congela|segura) ${OBJ}$`).test(n)) return { acao: 'pausar' };
  if (re(`^(continua|continuar|retoma|retomar|despausa|solta) ${OBJ}$`).test(n)) return { acao: 'continuar' };
  if (re(`^(reinicia|reiniciar|recomeca|recomecar|zera|zerar|reseta) ${OBJ}$`).test(n)) return { acao: 'reiniciar' };
  if (re(`^(cancela|cancelar|para|parar|desliga|tira|apaga|encerra) ${OBJ}$`).test(n)) return { acao: 'cancelar' };
  if (re(`^(esconde|esconder|oculta|ocultar|some com) ${OBJ}$`).test(n)) return { acao: 'esconder' };
  if (re(`^(mostra|mostrar|exibe|exibir|volta|aparece com) ${OBJ}$`).test(n)) return { acao: 'mostrar' };
  if (/^(quanto (tempo )?(falta|resta|ainda falta)|quanto tempo passou|como ta o timer|e o timer)\b/.test(n)) return { acao: 'status' };
  if (re(`^(meus |os |quais )?(timers|temporizadores|cronometros)( ativos| rodando)?$`).test(n)) return { acao: 'lista' };
  if (/^(historico|estatisticas?) d[oe]s? (timers|temporizadores|cronometros)$/.test(n)) return { acao: 'historico' };
  if (/^(quanto falta pra|quanto tempo pra) (agua|beber agua|me hidratar|hidratar)$/.test(n)) return { acao: 'iniciar', atividade: 'hidratacao' };
  // Pedido de começar: precisa citar timer/cronômetro, ou "me avisa em N min".
  const pede = re(`\\b(timer|temporizador|cronometr\\w*|contagem regressiva|relogio)\\b`).test(n) || /^(conta|marca) (o )?descanso\b|^descanso entre series\b/.test(n);
  const avisa = /^(me )?(avisa|chama|cutuca)( em| daqui a?)? \d/.test(n);
  if (!pede && !avisa) return null;
  if (/\?$/.test(original) && /^(voce tem|tem|como funciona|o que e)\b/.test(n)) return null;
  const atividade = atividadeDoTexto(n) || 'personalizado';
  const min = duracaoDoTexto(n);
  const progressivo = /\b(cronometr\w*|cronometro|quanto tempo (eu )?levo|marca o tempo)\b/.test(n) && min == null;
  const series = Number((n.match(/\b(\d{1,2})\s*(series|posicoes|vezes|ciclos|rodadas)\b/) || [])[1]) || null;
  const recorrente = /\b(a cada|toda hora|repetindo|recorrente|sempre que acabar)\b/.test(n);
  let rotulo = '';
  const m = original.match(/\b(?:pra|para|de)\s+(?:o |a |meu |minha )?([^\d,.!?]{3,40})$/i);
  if (m && !atividadeDoTexto(m[1]) && !/^(min|minutos?|segundos?|horas?)\b/i.test(m[1].trim())) rotulo = m[1].trim().slice(0, TIMER_LIMITES.rotulo);
  const tarefa = atividade === 'tarefa' ? (original.match(/tarefa\s+(?:de\s+|do\s+|da\s+)?["“]?([^"”]{2,60})["”]?$/i) || [])[1]?.trim() || '' : '';
  return { acao: 'iniciar', atividade, min, progressivo, series, recorrente, rotulo, tarefa, pomodoro: /\bpomodoro\b/.test(n) };
}

/** Comando "/timer …". */
export function parseTimerCommand(arg) {
  const n = norm(arg);
  if (!n) return { acao: 'lista' };
  const simples = { pausar: 'pausar', pausa: 'pausar', continuar: 'continuar', retomar: 'continuar', reiniciar: 'reiniciar', cancelar: 'cancelar', parar: 'cancelar', esconder: 'esconder', ocultar: 'esconder', mostrar: 'mostrar', lista: 'lista', historico: 'historico', status: 'status', ajuda: 'ajuda' };
  const w = n.split(' ')[0];
  if (simples[w] && n.split(' ').length === 1) return { acao: simples[w] };
  if (w === 'cancelar' || w === 'parar') return { acao: 'cancelar', alvo: n.split(' ').slice(1).join(' ') };
  if (w === 'destacar') return { acao: 'destacar', alvo: n.split(' ').slice(1).join(' ') };
  const atividade = atividadeDoTexto(n) || 'personalizado';
  const min = duracaoDoTexto(/^\d+(?:[.,]\d)?$/.test(w) ? `${n.replace(/^(\S+)/, '$1 min')}` : n);
  const progressivo = /^(cronometro|progressivo|sobe)\b/.test(n) || (atividade === 'tarefa' && min == null) || (['trabalho', 'jogos'].includes(atividade) && min == null);
  const series = Number((n.match(/\b(?:x\s*(\d{1,2})|(\d{1,2})\s*(?:series|posicoes|vezes|ciclos))\b/) || []).slice(1).find(Boolean)) || null;
  const recorrente = /\b(recorrente|repetir|a cada)\b/.test(n);
  const tarefa = atividade === 'tarefa' ? arg.replace(/^.*?tarefa\s*/i, '').trim() : '';
  return { acao: 'iniciar', atividade, min, progressivo, series, recorrente, rotulo: '', tarefa, pomodoro: /\bpomodoro\b/.test(n) };
}

/** "sim", "fiz", "terminei"… para a confirmação de uma sessão. */
export function respostaConfirmacao(text) {
  const n = norm(text);
  if (/^(sim|s|fiz|feito|fiz sim|terminei|acabei|concluido|concluida|consegui|claro|uhum|isso|completei|fiz tudo)\b/.test(n)) return true;
  if (/^(nao|n|nem|nao fiz|ainda nao|desisti|pulei|parei)\b/.test(n)) return false;
  return null;
}
/** Resposta a uma oferta de timer ("quer que eu cronometre?"). */
export function respostaOferta(text) {
  const n = norm(text);
  if (/^(sim|s|quero|pode|bora|manda|liga|claro|isso|por favor|cronometra|vai)\b/.test(n)) return true;
  if (/^(nao|n|deixa|agora nao|nem|dispenso|para)\b/.test(n)) return false;
  return null;
}

// ------------------------------------------------------------------ gerenciador

/**
 * Gerenciador central. Não cria timers do sistema (setTimeout) por conta própria: o
 * companion chama `tick()` quando `proximoEventoMs()` manda. Eventos saem por `onEvento`.
 *  - mono(): relógio monotônico do processo (performance.now);
 *  - wall(): relógio de parede (Date.now), só para persistência e recuperação;
 *  - load()/save(st): estado salvo junto do progresso.
 */
export class GerenciadorTimers {
  constructor({ mono = () => performance.now(), wall = () => Date.now(), load = () => null, save = () => {}, getConfig = () => ({}), onEvento = () => {}, fontes = {} } = {}) {
    this.mono = mono; this.wall = wall; this._load = load; this._save = save; this.getConfig = getConfig; this.onEvento = onEvento;
    // Fontes dos espelhos: nome → () => {restanteMs, totalMs, rotulo} | null.
    this.fontes = fontes;
    this.st = emptyTimers();
    this.vivos = new Map(); // id → {inicioMono} só enquanto o processo vive
    this.restaurado = false;
    this.suspensao = null;
  }

  config() {
    const c = this.getConfig() || {};
    return { ativo: c.timersAtivo !== false, max: clamp(Number(c.timersMax) || 3, ...TIMER_LIMITES.maxTimers), autoProximo: c.timersAutoProximo === true, atividades: sanitizeAtividades(c.timersAtividades) };
  }

  _commit() { try { this._save(structuredClone(this.st)); } catch { /* salva no próximo */ } }

  /** Recupera o estado salvo uma única vez (sem timers duplicados). Devolve os avisos de "terminou fechado". */
  restaurar() {
    if (this.restaurado) return [];
    this.restaurado = true;
    const salvo = this._load();
    if (!salvo || typeof salvo !== 'object') return [];
    const base = emptyTimers();
    const st = { ...base, ...salvo, stats: { ...base.stats, ...(salvo.stats || {}) }, xpDia: { ...base.xpDia, ...(salvo.xpDia || {}) } };
    st.historico = Array.isArray(salvo.historico) ? salvo.historico.slice(-TIMER_LIMITES.historico) : [];
    const agoraW = this.wall();
    const vistos = new Set();
    const avisos = [];
    st.timers = (Array.isArray(salvo.timers) ? salvo.timers : []).filter((t) => {
      if (!t || typeof t.id !== 'string' || vistos.has(t.id) || t.tipo === 'espelho' || !['rodando', 'pausado'].includes(t.estado)) return false;
      vistos.add(t.id);
      return true;
    });
    this.st = st;
    for (const t of st.timers) {
      const gap = agoraW - (t.salvoEmWall || agoraW);
      const relogioEstranho = gap < 0 || gap > 7 * 86400e3;
      if (t.estado !== 'rodando') continue;
      if (t.tipo === 'progressivo' || relogioEstranho) {
        t.estado = 'pausado';
        t.pausadoPor = relogioEstranho ? 'relogio' : 'fechado';
        continue;
      }
      t.acumuladoMs += gap; // continua contando pelo relógio de parede
      t.msFechado = (t.msFechado || 0) + gap;
      this.vivos.set(t.id, { inicioMono: this.mono() });
      const fim = this._avaliar(t, { fechado: true });
      if (fim) avisos.push(fim);
    }
    st.timers = st.timers.filter((t) => ['rodando', 'pausado'].includes(t.estado));
    if (!st.timers.some((t) => t.id === st.destacado)) st.destacado = st.timers.at(-1)?.id || null;
    this._commit();
    return avisos;
  }

  get timers() { return this.st.timers; }
  get(id) { return this.st.timers.find((t) => t.id === id) || null; }
  get destacado() { return this.get(this.st.destacado) || this.st.timers.at(-1) || null; }

  /** Quanto já correu (ms) do timer inteiro (todas as fases). */
  decorrido(t) {
    if (!t) return 0;
    if (t.tipo === 'espelho') { const f = this._fonte(t); return f ? Math.max(0, f.totalMs - f.restanteMs) : 0; }
    const v = this.vivos.get(t.id);
    return t.acumuladoMs + (t.estado === 'rodando' && v ? Math.max(0, this.mono() - v.inicioMono) : 0);
  }

  _fonte(t) { try { return this.fontes[t.fonte]?.(t) || null; } catch { return null; } }

  /** Situação da fase atual: {fase, faseIdx, faseTotal, restanteMs, totalMs, progresso 0..1}. */
  situacao(t) {
    if (!t) return null;
    if (t.tipo === 'espelho') {
      const f = this._fonte(t);
      if (!f) return { fase: null, restanteMs: 0, totalMs: 0, progresso: 0, decorridoMs: 0 };
      return { fase: f.fase || null, faseIdx: 0, faseTotal: 1, restanteMs: Math.max(0, f.restanteMs), totalMs: f.totalMs, progresso: f.totalMs ? clamp(1 - f.restanteMs / f.totalMs, 0, 1) : 0, decorridoMs: Math.max(0, f.totalMs - f.restanteMs), pausado: !!f.pausado };
    }
    const d = this.decorrido(t);
    if (t.tipo === 'progressivo') return { fase: null, faseIdx: 0, faseTotal: 1, restanteMs: t.metaMs ? Math.max(0, t.metaMs - d) : 0, totalMs: t.metaMs || 0, progresso: t.metaMs ? clamp(d / t.metaMs, 0, 1) : 0, decorridoMs: d };
    if (t.tipo === 'intervalado') {
      const ciclo = t.fases.reduce((s, f) => s + f.ms, 0);
      const total = ciclo * t.ciclos;
      let resto = Math.min(d, total);
      let idx = 0;
      for (; idx < t.fases.length * t.ciclos - 1; idx++) {
        const f = t.fases[idx % t.fases.length];
        if (resto < f.ms) break;
        resto -= f.ms;
      }
      const f = t.fases[idx % t.fases.length];
      return { fase: f.nome, faseIdx: idx, faseTotal: t.fases.length * t.ciclos, ciclo: Math.floor(idx / t.fases.length) + 1, restanteMs: Math.max(0, f.ms - resto), totalMs: f.ms, progresso: clamp(d / total, 0, 1), totalGeralMs: total, decorridoMs: d };
    }
    // regressivo e recorrente
    const rodada = t.tipo === 'recorrente' ? Math.floor(d / t.duracaoMs) : 0;
    const dentro = t.tipo === 'recorrente' ? d - rodada * t.duracaoMs : Math.min(d, t.duracaoMs);
    return { fase: null, faseIdx: 0, faseTotal: 1, rodada: rodada + 1, restanteMs: Math.max(0, t.duracaoMs - dentro), totalMs: t.duracaoMs, progresso: clamp(dentro / t.duracaoMs, 0, 1), decorridoMs: d };
  }

  /**
   * Cria e inicia um timer. opts: {atividade, tipo, duracaoMs, metaMs, fases, ciclos,
   * rotulo, tarefaId, habito, fonte, aparencia, origem}. Devolve {timer} ou {erro}.
   */
  iniciar(opts = {}) {
    const cfg = this.config();
    if (!cfg.ativo) return { erro: 'desligado' };
    const atividade = ATIVIDADES[opts.atividade] ? opts.atividade : 'personalizado';
    if (!cfg.atividades[atividade].ativo && !opts.forcar) return { erro: 'atividadeDesligada', atividade };
    // Espelho da mesma fonte já existe: só destaca (proteção contra duplicados).
    if (opts.tipo === 'espelho') {
      const ja = this.st.timers.find((t) => t.tipo === 'espelho' && t.fonte === opts.fonte);
      if (ja) { this.st.destacado = ja.id; this._commit(); return { timer: ja, existente: true }; }
    }
    if (this.st.timers.length >= cfg.max) return { erro: 'limite', max: cfg.max };
    const tipo = ['regressivo', 'progressivo', 'intervalado', 'recorrente', 'espelho'].includes(opts.tipo) ? opts.tipo : ATIVIDADES[atividade].modo;
    const id = `tm${this.wall().toString(36)}${(++this.st.seq).toString(36)}`;
    const t = {
      id, atividade, tipo, estado: 'rodando', rotulo: String(opts.rotulo || '').slice(0, TIMER_LIMITES.rotulo),
      criadoEmWall: this.wall(), salvoEmWall: this.wall(), acumuladoMs: 0, msFechado: 0, pausas: 0, marcas: {},
      aparencia: APARENCIAS[opts.aparencia] ? opts.aparencia : null, origem: opts.origem || 'pedido',
    };
    if (tipo === 'regressivo' || tipo === 'recorrente') t.duracaoMs = Math.round(clamp(opts.duracaoMs || ATIVIDADES[atividade].duracaoMin * 60e3, 15e3, 600 * 60e3));
    if (tipo === 'recorrente') t.rodadas = 0;
    if (tipo === 'progressivo') t.metaMs = opts.metaMs ? Math.round(clamp(opts.metaMs, 60e3, 600 * 60e3)) : 0;
    if (tipo === 'intervalado') {
      t.fases = (opts.fases && opts.fases.length ? opts.fases : [{ nome: 'Fase', ms: 60e3 }]).map((f) => ({ nome: String(f.nome).slice(0, 20), ms: Math.round(clamp(f.ms, 5e3, 120 * 60e3)) }));
      t.ciclos = clamp(Math.round(opts.ciclos || 1), 1, 20);
    }
    if (tipo === 'espelho') t.fonte = opts.fonte;
    if (opts.tarefaId) t.tarefaId = String(opts.tarefaId);
    if (opts.habito) t.habito = opts.habito;
    this.st.timers.push(t);
    this.st.destacado = id;
    if (tipo !== 'espelho') this.vivos.set(id, { inicioMono: this.mono() });
    this._commit();
    this.onEvento({ tipo: 'inicio', timer: t });
    return { timer: t };
  }

  _alvo(id) { return id ? this.get(id) : this.destacado; }

  pausar(id) {
    const t = this._alvo(id);
    if (!t || t.tipo === 'espelho' || t.estado !== 'rodando') return null;
    const sit = this.situacao(t);
    t.acumuladoMs = this.decorrido(t);
    t.estado = 'pausado'; t.pausas++; t.pausadoPor = 'ela';
    this.vivos.delete(t.id);
    t.salvoEmWall = this.wall();
    this._commit();
    // Pausa antes de 30% da fase/sessão: a fala de "resistência".
    this.onEvento({ tipo: 'pausa', timer: t, cedo: sit.progresso < 0.3 });
    return t;
  }

  continuar(id) {
    const t = this._alvo(id);
    if (!t || t.tipo === 'espelho' || t.estado !== 'pausado') return null;
    t.estado = 'rodando'; delete t.pausadoPor;
    this.vivos.set(t.id, { inicioMono: this.mono() });
    t.salvoEmWall = this.wall();
    this._commit();
    this.onEvento({ tipo: 'retomada', timer: t });
    return t;
  }

  reiniciar(id) {
    const t = this._alvo(id);
    if (!t || t.tipo === 'espelho') return null;
    t.acumuladoMs = 0; t.msFechado = 0; t.marcas = {}; t.estado = 'rodando'; delete t.pausadoPor;
    if (t.tipo === 'recorrente') t.rodadas = 0;
    this.vivos.set(t.id, { inicioMono: this.mono() });
    t.salvoEmWall = this.wall();
    this._commit();
    this.onEvento({ tipo: 'inicio', timer: t, reinicio: true });
    return t;
  }

  cancelar(id) {
    const t = this._alvo(id);
    if (!t) return null;
    const d = this.decorrido(t);
    this._remover(t);
    if (t.tipo !== 'espelho' && d >= 60e3) this._historico(t, d, 'cancelado');
    this._commit();
    this.onEvento({ tipo: 'cancelado', timer: t, decorridoMs: d });
    return t;
  }

  /** Encerra agora contando o que já correu (cronômetro parado de propósito, tarefa feita). */
  encerrar(id) {
    const t = this._alvo(id);
    if (!t || t.tipo === 'espelho') return null;
    const d = this.decorrido(t);
    return this._concluir(t, d, false, { manual: true });
  }

  destacar(id) {
    const t = this.get(id);
    if (!t) return null;
    this.st.destacado = id; this._commit();
    return t;
  }

  _remover(t) {
    this.st.timers = this.st.timers.filter((x) => x.id !== t.id);
    this.vivos.delete(t.id);
    if (this.st.destacado === t.id) this.st.destacado = this.st.timers.at(-1)?.id || null;
  }

  _historico(t, ms, resultado) {
    this.st.historico.push({ id: t.id, atividade: t.atividade, rotulo: t.rotulo, ms: Math.round(ms), fimWall: this.wall(), resultado, tarefaId: t.tarefaId || null });
    this.st.historico = this.st.historico.slice(-TIMER_LIMITES.historico);
    if (resultado === 'concluido') {
      const s = this.st.stats;
      s.sessoes++; s.ms += Math.round(ms);
      const a = s.porAtividade[t.atividade] ||= { sessoes: 0, ms: 0 };
      a.sessoes++; a.ms += Math.round(ms);
    }
  }

  /**
   * Avalia marcos e fim de um timer. Devolve o evento de fim (ou null). Cada marco
   * dispara uma vez só (t.marcas), então nada de notificação repetida.
   */
  _avaliar(t, { fechado = false } = {}) {
    if (t.estado !== 'rodando' || t.tipo === 'espelho') return null;
    const sit = this.situacao(t);
    const m = t.marcas;
    if (t.tipo === 'progressivo') {
      if (t.metaMs && sit.decorridoMs >= t.metaMs && !m.meta) { m.meta = true; this.onEvento({ tipo: 'meta', timer: t }); }
      return null;
    }
    if (t.tipo === 'intervalado') {
      if (sit.faseIdx > (m.fase ?? 0)) {
        m.fase = sit.faseIdx; m.final = false; m.ultimos = false;
        if (!fechado) this.onEvento({ tipo: 'fase', timer: t, fase: sit.fase, faseIdx: sit.faseIdx, faseTotal: sit.faseTotal, ciclo: sit.ciclo });
      }
      if (sit.decorridoMs >= sit.totalGeralMs) return this._concluir(t, sit.totalGeralMs, fechado);
    } else if (t.tipo === 'recorrente') {
      const rodada = Math.floor(sit.decorridoMs / t.duracaoMs);
      if (rodada > t.rodadas) {
        const novas = rodada - t.rodadas;
        t.rodadas = rodada; m.metade = false; m.final = false; m.ultimos = false;
        this._historico(t, t.duracaoMs, 'concluido');
        // Fechado: só um aviso, mesmo que várias rodadas tenham passado.
        this.onEvento({ tipo: 'rodada', timer: t, rodada, perdidas: novas - 1, fechado });
      }
    } else if (sit.decorridoMs >= t.duracaoMs) return this._concluir(t, t.duracaoMs, fechado);
    if (fechado) return null;
    const total = sit.totalMs;
    if (!m.metade && t.tipo !== 'intervalado' && total >= 4 * 60e3 && sit.progresso >= 0.5) { m.metade = true; this.onEvento({ tipo: 'metade', timer: t }); }
    const finalMs = Math.min(60e3, Math.max(10e3, total * 0.15));
    if (!m.final && total >= 60e3 && sit.restanteMs <= finalMs && sit.restanteMs > 10e3) { m.final = true; this.onEvento({ tipo: 'final', timer: t, restanteMs: sit.restanteMs }); }
    if (!m.ultimos && total >= 30e3 && sit.restanteMs <= 10e3) { m.ultimos = true; m.final = true; this.onEvento({ tipo: 'ultimos', timer: t }); }
    return null;
  }

  _concluir(t, ms, fechado, { manual = false } = {}) {
    this._remover(t);
    this._historico(t, ms, 'concluido');
    const aoVivo = Math.max(0, ms - (t.msFechado || 0));
    const ev = { tipo: 'fim', timer: t, ms, aoVivoMs: aoVivo, fechado: !!fechado, suspenso: !!t.suspensoNoFim, manual };
    this._commit();
    this.onEvento(ev);
    return ev;
  }

  /** Passo do relógio: avalia todos os timers (chamado sob demanda, nunca em loop apertado). */
  tick() {
    const fins = [];
    for (const t of [...this.st.timers]) {
      const fim = this._avaliar(t);
      if (fim) fins.push(fim);
    }
    // Espelho cuja fonte acabou some sozinho (o sistema de origem já avisou).
    for (const t of [...this.st.timers]) if (t.tipo === 'espelho' && !this._fonte(t)) this._remover(t);
    return fins;
  }

  /** Quando chamar o próximo tick (ms): o próximo marco, no mínimo 250 ms e no máximo 60 s. */
  proximoEventoMs() {
    let menor = 60e3;
    for (const t of this.st.timers) {
      if (t.estado !== 'rodando' || t.tipo === 'espelho') continue;
      const sit = this.situacao(t);
      if (t.tipo === 'progressivo') { if (t.metaMs && !t.marcas.meta) menor = Math.min(menor, t.metaMs - sit.decorridoMs); continue; }
      const total = sit.totalMs;
      const finalMs = Math.min(60e3, Math.max(10e3, total * 0.15));
      const alvos = [sit.restanteMs, sit.restanteMs - 10e3, sit.restanteMs - finalMs, t.tipo !== 'intervalado' ? total * 0.5 - (total - sit.restanteMs) : -1];
      for (const a of alvos) if (a > 0) menor = Math.min(menor, a);
    }
    return Math.max(250, Math.ceil(menor));
  }

  /** Salva as referências (chamado de tempos em tempos e antes de fechar). */
  checkpoint() {
    const w = this.wall();
    for (const t of this.st.timers) {
      if (t.tipo === 'espelho') continue;
      if (t.estado === 'rodando') {
        t.acumuladoMs = this.decorrido(t);
        this.vivos.set(t.id, { inicioMono: this.mono() });
      }
      t.salvoEmWall = w;
    }
    this._commit();
  }

  /** Windows vai dormir: guarda o instante; progressivos pausam. */
  suspender() {
    this.checkpoint();
    this.suspensao = { wall: this.wall(), mono: this.mono() };
    for (const t of this.st.timers) if (t.tipo === 'progressivo' && t.estado === 'rodando') { t.estado = 'pausado'; t.pausadoPor = 'suspensao'; this.vivos.delete(t.id); }
    this._commit();
  }

  /** Windows acordou: regressivos somam o tempo dormindo (se o relógio monotônico não somou). */
  retomarSistema() {
    const s = this.suspensao;
    this.suspensao = null;
    if (!s) return [];
    const gapWall = Math.max(0, this.wall() - s.wall);
    const gapMono = Math.max(0, this.mono() - s.mono);
    const extra = gapWall > 7 * 86400e3 ? 0 : Math.max(0, gapWall - gapMono);
    for (const t of this.st.timers) {
      if (t.tipo === 'progressivo' && t.pausadoPor === 'suspensao') { t.estado = 'rodando'; delete t.pausadoPor; this.vivos.set(t.id, { inicioMono: this.mono() }); continue; }
      if (t.estado === 'rodando' && t.tipo !== 'espelho' && extra) { t.acumuladoMs = this.decorrido(t) + extra; t.msFechado = (t.msFechado || 0) + extra; t.suspensoNoFim = true; this.vivos.set(t.id, { inicioMono: this.mono() }); }
    }
    const fins = this.tick();
    for (const t of this.st.timers) delete t.suspensoNoFim;
    this._commit();
    return fins;
  }

  /**
   * XP de uma sessão concluída. Só sai se: a atividade rende XP, durou pelo menos 5 min,
   * 80% contou com o app aberto (nada de deixar correndo fechado), não passou do teto do
   * dia. O id da recompensa é o do timer: o mesmo timer nunca rende duas vezes.
   */
  elegivelXp(ev) {
    const t = ev.timer;
    const a = ATIVIDADES[t.atividade];
    if (!a || !a.xp || t.tipo === 'espelho' || t.tipo === 'recorrente' || ev.fechado || ev.suspenso) return false;
    if (ev.ms < TIMER_LIMITES.minXpMin * 60e3 || ev.aoVivoMs < ev.ms * 0.8) return false;
    const dia = dayKey(new Date(this.wall()));
    return !(this.st.xpDia.dia === dia && this.st.xpDia.n >= TIMER_LIMITES.xpPorDia);
  }

  /** Marca que um XP de timer saiu hoje. */
  contarXp() {
    const dia = dayKey(new Date(this.wall()));
    if (this.st.xpDia.dia !== dia) this.st.xpDia = { dia, n: 0 };
    this.st.xpDia.n++;
    this._commit();
  }

  /** XP pela duração: 3 + 2 a cada 15 min, até 9 (escala do progresso aplicada depois). */
  static xpDaSessao(ms) { return Math.min(9, 3 + 2 * Math.floor(ms / (15 * 60e3))); }

  aparenciasLiberadas() {
    const n = this.st.stats.sessoes;
    return Object.keys(APARENCIAS).filter((a) => !(a in APARENCIA_DESBLOQUEIO) || n >= APARENCIA_DESBLOQUEIO[a]);
  }

  /** Estatísticas para a conversa e a Central. */
  resumo() {
    const s = this.st.stats;
    const hoje = dayKey(new Date(this.wall()));
    const deHoje = this.st.historico.filter((h) => h.resultado === 'concluido' && dayKey(new Date(h.fimWall)) === hoje);
    return { sessoes: s.sessoes, totalMs: s.ms, hojeSessoes: deHoje.length, hojeMs: deHoje.reduce((x, h) => x + h.ms, 0), porAtividade: s.porAtividade };
  }
}

// ------------------------------------------------------------------ relógio na tela

export const TAMANHO_BASE = Object.freeze({ pequeno: 58, medio: 76, grande: 98 });
const PROPORCAO = { digital: [1.55, 0.72], esportivo: [1, 1.18], ampulheta: [0.72, 1.12], analogico: [1, 1], barra: [2, 0.44], holograma: [1.05, 1.05], bolso: [1, 1.28], minimalista: [1.25, 0.46], circular: [1.25, 0.46] };
/** Caixa (px lógicos) que o relógio ocupa parado, para a aparência e o tamanho escolhidos. */
export function caixaRelogio(aparencia, tamanho = 'medio') {
  const b = TAMANHO_BASE[tamanho] || TAMANHO_BASE.medio;
  const [w, h] = PROPORCAO[aparencia] || PROPORCAO.digital;
  return { width: Math.round(b * w), height: Math.round(b * h + 14) }; // +14: rótulo embaixo
}

/** Aparência a usar: a escolhida, ou a da atividade (contextual), só entre as liberadas; discreto = minimalista. */
export function aparenciaDoTimer(t, { escolhida = 'contextual', liberadas = Object.keys(APARENCIAS), discreto = false } = {}) {
  if (discreto) return 'minimalista';
  const pedida = escolhida && escolhida !== 'contextual' ? escolhida : t?.aparencia || ATIVIDADES[t?.atividade]?.aparencia || 'digital';
  return liberadas.includes(pedida) ? pedida : 'digital';
}
