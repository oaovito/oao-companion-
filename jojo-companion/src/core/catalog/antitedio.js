// Sistema antitédio (camadas por cima do motor de variedade): progressão e
// coleções, missões diárias, diário, rotinas/mini-histórias e mini-jogos de
// conversa. Puro: estado salvo, relógio e sorteio são injetados. Tudo é
// opcional e sem cobrança — nada aqui interrompe o trabalho dela.

import { dayKey } from '../personality.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

function pickOne(list, rng) {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function emptyProgress() {
  return { xp: 0, contas: {}, conquistas: {}, poses: [], cartas: [], album: [], areas: [], missoes: null, diario: null, rotinas: { recentes: [], progresso: {}, episodio: 0 }, jogos: { ultimo: null }, interesses: [], rotinaFixa: {}, horas: {}, diasQuietos: null, humorDia: null };
}

// ---------------------------------------------------------------- progressão e coleções

export class Progress {
  constructor({ data, state, save = () => {}, rng = Math.random, now = () => Date.now(), wallNow = () => Date.now(), monotonicNow = () => performance.now(), getQuiet = () => false }) {
    this.data = data;
    this.st = { ...emptyProgress(), ...(state || {}) };
    this.save = save;
    this.rng = rng;
    this.now = now;
    this.getQuiet = getQuiet;
    this.wallNow = wallNow; this.monotonicNow = monotonicNow; this.resetRewardClock();
    this._migrarEscala(!!state);
  }

  /**
   * Escala de XP (pedido de 14/11/2026: números ×10, mesmo ritmo). O XP já guardado
   * e o histórico de recompensas passam para a escala nova uma única vez, então o
   * nível de quem já usava não muda.
   */
  _migrarEscala(salvar) {
    const nova = this.data?.escalaXp || 1, antiga = this.st.escalaXp || 1;
    if (nova === antiga) return;
    const f = nova / antiga;
    this.st.xp = Math.round((this.st.xp || 0) * f);
    if (this.st.rewards?.history) this.st.rewards.history = this.st.rewards.history.map((e) => ({ ...e, amount: Math.round((e.amount || 0) * f) }));
    this.st.escalaXp = nova;
    if (salvar) { try { this.save(this.st); } catch { /* fica para o próximo salvamento */ } }
  }

  get escala() { return this.data?.escalaXp || 1; }

  resetRewardClock() { this.rewardClock = { wall: this.wallNow(), mono: this.monotonicNow() }; }
  clockHealthy() { return Math.abs((this.wallNow() - this.rewardClock.wall) - (this.monotonicNow() - this.rewardClock.mono)) < 5 * 60000; }

  get nivel() {
    if (this.data.curve) {
      let low = 1, high = this.data.niveis.length;
      while (low < high) { const mid = Math.ceil((low + high) / 2); if (this.threshold(mid) <= this.st.xp) low = mid; else high = mid - 1; }
      return low;
    }
    return Math.min(this.data.niveis.length, 1 + Math.floor(this.st.xp / this.data.xpPorNivel));
  }

  threshold(level) {
    const curve = this.data.curve;
    if (!curve || level <= curve.legacyLevels) return (level - 1) * this.data.xpPorNivel;
    // Mesma curva da 0.47.0 (×escala): o tempo para subir de nível não muda.
    const k = level - curve.legacyLevels;
    return (curve.legacyLevels - 1) * this.data.xpPorNivel + curve.increment * k * (k + 3) / 2;
  }

  get nomeNivel() {
    return this.data.niveis[this.nivel - 1];
  }

  /** Acessórios liberados até o nível atual. */
  get acessorios() {
    return this.data.acessorios.filter((a) => a.nivel <= this.nivel);
  }

  /** Soma XP; devolve {subiu, nivel} quando passa de nível. */
  xp(kind) {
    if (!this.clockHealthy()) return null;
    const limits = { gesto: [2, 40], chat: [3, 30], estimulo: [10, 20], poseNova: [0, 50], jogoVitoria: [0, 100], jogoParticipacao: [0, 50] };
    let amount = this.data.xp[kind] || 0;
    if (amount <= 0) return null;
    const day = dayKey(new Date(this.wallNow()));
    if (limits[kind]) {
      const budget = this.st.legacyXp || { day, used: {}, last: {} };
      if (day < budget.day) return null;
      const [cooldown, cap] = limits[kind];
      if (budget.last[kind] != null && this.wallNow() - budget.last[kind] < cooldown * 1000) return null;
      amount = Math.min(amount, cap - (day === budget.day ? budget.used[kind] || 0 : 0)); if (amount <= 0) return null;
    }
    const previous = this.st, beforeLevel = this.nivel;
    this.st = structuredClone(previous);
    if (limits[kind]) {
      const budget = this.st.legacyXp ||= { day, used: {}, last: {} };
      if (day > budget.day) { budget.day = day; budget.used = {}; }
      budget.last[kind] = this.wallNow(); budget.used[kind] = (budget.used[kind] || 0) + amount;
    }
    const sequence = this.st.legacyRewardSeq = (this.st.legacyRewardSeq || 0) + 1;
    const labels = { gesto: 'Carinho e interação', chat: 'Conversa', estimulo: 'Interação', poseNova: 'Nova animação descoberta', jogoVitoria: 'Mini-jogo concluído', jogoParticipacao: 'Participação no mini-jogo', foco: 'Bloco de foco', missao: 'Missão cumprida', diaNovo: 'Novo dia de atividade' };
    try { this.award({ id: `legacy:${day}:${sequence}`, amount, source: 'interaction', day, label: labels[kind] || 'Atividade do JoJo', atividade: kind }); }
    catch (e) { this.st = previous; throw e; }
    return this.nivel > beforeLevel ? { subiu: true, nivel: this.nivel, nome: this.nomeNivel } : null;
  }

  /** Recompensa externa identificada: confirmação durável antes de notificar a UI. */
  award({ id, amount, source, day, label = '', atividade = null }) {
    if (typeof id !== 'string' || id.length > 500 || !id || !Number.isInteger(amount) || amount < 0 || amount > 500 || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Recompensa inválida.');
    if (this.st.rewards?.ids?.[id]) return { duplicate: true, amount: 0 };
    if (!this.clockHealthy()) throw new Error('O relógio mudou; não confirmei XP com um intervalo inválido.');
    const before = this.st; const level = this.nivel;
    this.st = structuredClone(before);
    this.st.rewards ||= { ids: {}, history: [], sequence: 0 };
    // Valor nominal da fonte × escala: o crédito e o histórico já saem na escala nova.
    // Bônus vão para a coleção (xpBonus) e não aceleram o nível: o ritmo é o da 0.47.0.
    const credito = amount * this.escala;
    if (source === 'bonus') this.st.xpBonus = (this.st.xpBonus || 0) + credito;
    else this.st.xp += credito;
    const event = { id, amount: credito, source, day, label: String(label).slice(0, 200), at: this.now(), sequence: ++this.st.rewards.sequence, level: this.nivel, levelUp: this.nivel > level };
    if (atividade) event.atividade = String(atividade).slice(0, 40);
    this.st.rewards.ids[id] = true;
    this.st.rewards.history.push(event);
    this.st.rewards.history = this.st.rewards.history.slice(-500);
    try { this.save(this.st, { immediate: true }); }
    catch (e) { this.st = before; throw e; }
    this.onAward?.(event);
    if (event.levelUp) { try { this.onLevelUp?.(event); } catch { /* o aviso nunca derruba a recompensa */ } }
    if (source !== 'bonus') this._bonusDepois(atividade || source, day);
    return event;
  }

  // ------------------------------------------------------------ bônus de XP

  /** Todos os bônus com nome próprio: cada regra do catálogo para cada atividade. */
  get bonusCatalogo() {
    const b = this.data?.bonus;
    if (!b) return [];
    return this._bonusCat ||= b.regras.flatMap((r) => Object.entries(b.atividades).map(([a, nome]) => ({ id: `${r.id}:${a}`, regra: r, atividade: a, nome: r.nome.replace('{A}', nome), xp: r.xp })));
  }

  /**
   * Conta a atividade e escolhe no máximo um bônus para ela: o de maior valor
   * entre os que casam e ainda cabem no teto do dia. Muda só this.st.bonus.
   */
  _escolherBonus(atividade, day) {
    const b = this.data.bonus;
    const agora = new Date(this.wallNow());
    const st = this.st.bonus ||= { dia: null, n: {}, qtd: 0, xp: 0, feitos: {}, vistos: {}, total: {}, ultimoDia: {}, seq: {}, ultimo: null };
    if (st.dia !== day) Object.assign(st, { dia: day, n: {}, qtd: 0, xp: 0, feitos: {} });
    const nHoje = st.n[atividade] = (st.n[atividade] || 0) + 1;
    const total = st.total[atividade] = (st.total[atividade] || 0) + 1;
    if (nHoje === 1) {
      const ontem = dayKey(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1));
      st.seq[atividade] = st.ultimoDia[atividade] === ontem ? (st.seq[atividade] || 0) + 1 : 1;
      st.ultimoDia[atividade] = day;
    }
    const combo = !!st.ultimo && st.ultimo.atividade !== atividade && this.wallNow() - st.ultimo.at <= b.limites.comboMin * 60e3;
    st.ultimo = { atividade, at: this.wallNow() };
    const h = agora.getHours(), dow = agora.getDay();
    const casa = (q) => (q.nDoDia == null || q.nDoDia === nHoje)
      && (q.janela == null || (h >= q.janela[0] && h < q.janela[1]))
      && (q.diasSemana == null || q.diasSemana.includes(dow))
      && (q.sequencia == null || (nHoje === 1 && st.seq[atividade] === q.sequencia))
      && (q.marco == null || total === q.marco)
      && (!q.combo || combo);
    const porDia = Math.max(b.limites.porDia, this.bonusPorDia?.() || 0); // Bônus Ampliado (loja)
    if (st.qtd >= porDia) return null;
    const cabe = b.limites.xpPorDia - st.xp;
    const opcoes = this.bonusCatalogo.filter((c) => c.atividade === atividade && c.xp <= cabe && !st.feitos[c.id] && !(c.regra.quando.marco && st.vistos[c.id]) && casa(c.regra.quando));
    if (!opcoes.length) return null;
    const escolhido = opcoes.reduce((m, c) => (c.xp > m.xp ? c : m));
    st.feitos[escolhido.id] = true;
    st.vistos[escolhido.id] ||= day;
    st.qtd += 1;
    st.xp += escolhido.xp;
    return escolhido;
  }

  /** Depois de uma recompensa: conta a atividade e, se couber, credita um bônus. Nunca derruba a recompensa original. */
  _bonusDepois(atividade, day) {
    if (!this.data?.bonus?.atividades?.[atividade]) return;
    const antes = this.st;
    let escolhido;
    try { this.st = structuredClone(antes); escolhido = this._escolherBonus(atividade, day); } catch { this.st = antes; return; }
    try {
      if (!escolhido) { this.save(this.st); return; }
      const id = escolhido.regra.quando.marco ? `bonus:marco:${escolhido.id}` : `bonus:${day}:${escolhido.id}`;
      this.award({ id, amount: escolhido.xp, source: 'bonus', day, label: `Bônus: ${escolhido.nome}` });
    } catch { this.st = antes; }
  }

  /** Conta um evento e devolve as conquistas novas. */
  count(kind, n = 1, absolute = false) {
    const c = this.st.contas;
    c[kind] = absolute ? n : (c[kind] || 0) + n;
    const novas = [];
    for (const q of this.data.conquistas) {
      if (q.conta === kind && !Object.hasOwn(this.st.conquistas, q.id) && c[kind] >= q.n) {
        this.st.conquistas[q.id] = this.now();
        novas.push(q);
      }
    }
    this.save(this.st);
    return novas;
  }

  /** Pose (animação) vista pela primeira vez entra na coleção; raras vão pro álbum. */
  seePose(item) {
    if (!item || this.st.poses.includes(item.id)) return [];
    this.st.poses.push(item.id);
    if (item.frequencia !== 'comum') {
      this.st.album.push({ id: item.id, nome: item.nome, quando: this.now() });
      if (this.st.album.length > 60) this.st.album.shift();
    }
    this.xp('poseNova');
    const novas = this.count('poses', this.st.poses.length, true);
    if (item.frequencia === 'easter') novas.push(...this.count('easter'));
    return novas;
  }

  /** Carta colecionável: cada fala ambiente nova vira uma carta. */
  seeCard(line) {
    if (!line) return [];
    const key = line.t.slice(0, 60);
    if (this.st.cartas.includes(key)) return [];
    this.st.cartas.push(key);
    return this.count('cartas', this.st.cartas.length, true);
  }

  /** Área do aquário (temporada) visitada. */
  visitArea(id) {
    if (!id || this.st.areas.includes(id)) return false;
    this.st.areas.push(id);
    this.save(this.st);
    return true;
  }

  /** Missões do dia: 3 pequenas e opcionais, sorteadas uma vez por dia. */
  missoes(date = new Date()) {
    const day = dayKey(date);
    if (!this.st.missoes || this.st.missoes.dia !== day) {
      const pool = [...this.data.missoes];
      const itens = [];
      while (itens.length < 3 && pool.length) itens.push({ ...pool.splice(Math.floor(this.rng() * pool.length), 1)[0], feito: 0 });
      this.st.missoes = { dia: day, itens };
      this.save(this.st);
    }
    return this.st.missoes.itens;
  }

  /** Evento que pode cumprir missão. Devolve a missão concluída agora (ou null). */
  missionEvent(evento, date = new Date()) {
    for (const m of this.missoes(date)) {
      if (m.evento !== evento || m.ok) continue;
      m.feito += 1;
      if (m.feito >= (m.n || 1)) {
        m.ok = true;
        this.xp('missao');
        this.count('missoes');
        return m;
      }
      this.save(this.st);
    }
    return null;
  }

  /**
   * Poderes da loja de JOJOcoins. Idempotentes pelo id do efeito (`loja:<tx>`): aplicar de
   * novo devolve true sem mudar nada. Só mexem nas missões de hoje; XP continua igual.
   */
  trocarMissao(efeitoId, date = new Date()) {
    const itens = this.missoes(date);
    const usados = this.st.missoes.loja ||= [];
    if (usados.includes(efeitoId)) return true;
    const i = itens.findIndex((m) => !m.ok);
    const pool = this.data.missoes.filter((m) => !itens.some((x) => x.id === m.id));
    if (i < 0 || !pool.length) return false;
    itens[i] = { ...pool[Math.floor(this.rng() * pool.length) % pool.length], feito: 0 };
    usados.push(efeitoId);
    this.save(this.st);
    return true;
  }

  missaoExtra(efeitoId, date = new Date()) {
    const itens = this.missoes(date);
    const usados = this.st.missoes.loja ||= [];
    if (usados.includes(efeitoId)) return true;
    const pool = this.data.missoes.filter((m) => !itens.some((x) => x.id === m.id));
    if (!pool.length) return false;
    itens.push({ ...pool[Math.floor(this.rng() * pool.length) % pool.length], feito: 0, extra: true });
    usados.push(efeitoId);
    this.save(this.st);
    return true;
  }

  /** Diário do tubarão: o que aconteceu hoje (resumo no fim do dia). */
  log(tipo, date = new Date()) {
    const day = dayKey(date);
    if (!this.st.diario || this.st.diario.dia !== day) this.st.diario = { dia: day, c: {} };
    this.st.diario.c[tipo] = (this.st.diario.c[tipo] || 0) + 1;
    this.save(this.st);
  }

  resumoDia(date = new Date()) {
    const d = this.st.diario && this.st.diario.dia === dayKey(date) ? this.st.diario.c : {};
    const parts = [];
    if (d.foco) parts.push(`${d.foco} bloco${d.foco > 1 ? 's' : ''} de foco`);
    if (d.vitoria) parts.push(`${d.vitoria} vitória${d.vitoria > 1 ? 's' : ''}`);
    if (d.jogo) parts.push(`${d.jogo} mini-jogo${d.jogo > 1 ? 's' : ''}`);
    if (d.chat) parts.push(`${d.chat} mensage${d.chat > 1 ? 'ns' : 'm'}`);
    if (d.pose) parts.push(`${d.pose} pose${d.pose > 1 ? 's' : ''} minha${d.pose > 1 ? 's' : ''}`);
    if (d.musica) parts.push(`${d.musica} música${d.musica > 1 ? 's' : ''}`);
    const missoes = (this.st.missoes && this.st.missoes.dia === dayKey(date) ? this.st.missoes.itens : []).filter((m) => m.ok).length;
    if (missoes) parts.push(`${missoes} missão${missoes > 1 ? 'ões' : ''}`);
    if (!parts.length) return 'Hoje foi tranquilo. Amanhã a gente aperta.';
    return `Resumo do dia: ${parts.join(', ')}. Nível ${this.nivel} (${this.nomeNivel}). Orgulhoso. Sério.`;
  }

  /** Horários em que ela mais interage (para o motor de variedade). */
  noteHour(date = new Date()) {
    const h = String(date.getHours());
    this.st.horas[h] = (this.st.horas[h] || 0) + 1;
    this.save(this.st);
  }

  /** Peso extra para animações na hora em que ela costuma interagir (1 a 1,6). */
  hourBoost(date = new Date()) {
    const v = Object.values(this.st.horas);
    if (!v.length) return 1;
    const max = Math.max(...v);
    return 1 + 0.6 * ((this.st.horas[String(date.getHours())] || 0) / max);
  }

  snapshot(date = new Date()) {
    return {
      quiet: this.getQuiet(),
      nivel: this.nivel,
      nomeNivel: this.nomeNivel,
      xp: this.st.xp,
      proximo: this.threshold(this.nivel + 1),
      percentXP: this.nivel >= this.data.niveis.length ? 100 : Math.max(0, Math.min(100, (this.st.xp - this.threshold(this.nivel)) / (this.threshold(this.nivel + 1) - this.threshold(this.nivel)) * 100)),
      maximo: this.nivel >= this.data.niveis.length,
      conquistas: this.data.conquistas.map((q) => ({ ...q, ok: Object.hasOwn(this.st.conquistas, q.id) })),
      poses: this.st.poses.length,
      // Só o que já foi liberado: nada bloqueado sai daqui para a tela.
      acessorios: this.acessorios.map((a) => ({ ...a, ok: true })),
      album: this.st.album.slice(-12).reverse(),
      cartas: this.st.cartas.length,
      areas: this.data.areas.map((a) => ({ ...a, ok: this.st.areas.includes(a.id) })),
      missoes: this.missoes(date),
      resumo: this.resumoDia(date),
      streak: (this.st.contas.streak || 0),
      reward: this.st.rewards?.history?.at(-1) || null,
      rewardHistory: this.st.rewards?.history?.slice(-30).reverse() || [],
      xpPorNivel: this.data.xpPorNivel,
      niveisTotal: this.data.niveis.length,
      bonus: this.data.bonus ? {
        descobertos: Object.keys(this.st.bonus?.vistos || {}).length,
        total: this.bonusCatalogo.length,
        hoje: this.st.bonus?.dia === dayKey(date) ? this.st.bonus.qtd : 0,
        porDia: this.data.bonus.limites.porDia,
        xp: this.st.xpBonus || 0,
      } : null,
    };
  }
}

// ---------------------------------------------------------------- rotinas e mini-histórias

/** Escolhe a próxima rotina (sem repetir a anterior; peso por frequência e horário). */
export function pickRoutine(rotinas, st, { rng = Math.random, period = null, freq = { comum: 10, rara: 2.5, easter: 0.35 } } = {}) {
  const recent = st.recentes || [];
  const w = rotinas.map((r) => {
    if (recent[recent.length - 1] === r.id) return 0;
    let v = freq[r.frequencia] ?? 10;
    if (recent.includes(r.id)) v *= 0.2;
    if (r.horario) v *= r.horario.includes(period) ? 2 : 0.3;
    return v;
  });
  const total = w.reduce((a, b) => a + b, 0);
  if (!total) return null;
  let x = rng() * total;
  for (let i = 0; i < rotinas.length; i++) {
    x -= w[i];
    if (x <= 0) return rotinas[i];
  }
  return rotinas[rotinas.length - 1];
}

/** Passos concretos da rotina (troca {etapa} e {episodio}); atualiza o progresso. */
export function routineSteps(r, st, date = new Date()) {
  st.recentes = [...(st.recentes || []), r.id].slice(-8);
  let etapa = null;
  if (r.progresso) {
    const day = dayKey(date);
    const p = st.progresso[r.id] && st.progresso[r.id].dia === day ? st.progresso[r.id] : { dia: day, n: 0 };
    p.n = Math.min(r.progresso, p.n + 1);
    st.progresso[r.id] = p;
    etapa = p.n;
  }
  let episodio = null;
  if (r.episodios) {
    episodio = r.episodios[(st.episodio || 0) % r.episodios.length];
    st.episodio = (st.episodio || 0) + 1;
  }
  return r.passos.map((p) => ({ anim: p.anim, fala: p.fala ? p.fala.replace('{etapa}', etapa).replace('{episodio}', episodio) : null }));
}

// ---------------------------------------------------------------- mini-jogos de conversa

/**
 * Estados de mini-jogos jogados no chat. `start` devolve {game, text, anim};
 * `answer(game, texto)` devolve {text, done, win, anim}.
 */
// Rodadas por jogo de conversa (placar no fim; ganha com a maioria).
const RODADAS = { quiz: 5, curiosidade: 5, emocao: 4, mandou: 6 };
const SAIR = '(escreve "sair" pra parar)';

/** Letra/opção escolhida no quiz ("b", "letra b", "é a b", "b)", o texto da opção) ou -1. */
export function quizChoice(text, opts) {
  const n = norm(text);
  const m = n.match(/^(?:(?:e|eh|letra|opcao|alternativa|resposta|a resposta e|acho que e|acho que|e a|vou de|chuto)\s+)*([abc])$/);
  if (m) return 'abc'.indexOf(m[1]);
  const idx = opts.findIndex((o) => norm(o) === n);
  if (idx >= 0) return idx;
  return opts.findIndex((o) => norm(o).length >= 3 && n.includes(norm(o)));
}

export class Games {
  constructor({ data, rng = Math.random }) {
    this.data = data;
    this.rng = rng;
    this.byId = new Map(data.jogos.map((j) => [j.id, j]));
  }

  find(text) {
    const n = norm(text);
    let best = null;
    for (const j of this.data.jogos) {
      for (const f of j.frases) if (n.includes(norm(f)) && (!best || f.length > best.len)) best = { j, len: f.length };
      if (n.includes(norm(j.nome))) best = { j, len: 99 };
    }
    return best ? best.j : null;
  }

  random(last = null) {
    const opts = this.data.jogos.filter((j) => j.id !== last);
    return pickOne(opts, this.rng);
  }

  /** Sorteia um item ainda não usado nesta partida. */
  _fresh(list, g) {
    g.usados = g.usados || [];
    const free = list.filter((_, i) => !g.usados.includes(i));
    const item = pickOne(free.length ? free : list, this.rng);
    g.usados.push(list.indexOf(item));
    return item;
  }

  _quizText(g) {
    return `Pergunta ${g.rodada + 1}/${g.total}: ${g.q.p}\na) ${g.q.o[0]}   b) ${g.q.o[1]}   c) ${g.q.o[2]}`;
  }

  _emocaoRound(g) {
    const r = this.rng;
    g.q = this._fresh(this.data.emocoes, g);
    g.opts = [g.q, ...this.data.emocoes.filter((e) => e !== g.q).sort(() => r() - 0.5).slice(0, 2)].sort(() => r() - 0.5).map((o) => o.nome);
    return `Rodada ${g.rodada + 1}/${g.total}: que emoção é essa? ${g.opts.join(', ')}?`;
  }

  _mandouRound(g) {
    g.palavra = pickOne(this.data.mandou || ['SUPINO'], this.rng);
    g.mandou = this.rng() < 0.6;
    return `${g.rodada + 1}/${g.total} — ${g.mandou ? 'O JoJo mandou: escreve' : 'Escreve'} ${g.palavra}.`;
  }

  _grid(word) {
    const r = this.rng;
    const size = Math.max(7, word.length + 1);
    const letters = 'ABCDEFGHIJLMNOPRSTUV';
    const cells = Array.from({ length: size }, () => Array.from({ length: size }, () => letters[Math.floor(r() * letters.length)]));
    const vertical = r() < 0.4;
    const a = Math.floor(r() * size);
    const b = Math.floor(r() * (size - word.length + 1));
    for (let k = 0; k < word.length; k++) {
      if (vertical) cells[b + k][a] = word[k];
      else cells[a][b + k] = word[k];
    }
    return { rows: cells.map((row) => row.join(' ')), vertical };
  }

  start(jogo) {
    const g = { id: jogo.id, tipo: jogo.tipo, nome: jogo.nome, rodada: 0, pontos: 0, total: RODADAS[jogo.tipo] || 1 };
    const r = this.rng;
    switch (jogo.tipo) {
      case 'quiz': {
        g.q = this._fresh(this.data.quiz, g);
        return { game: g, text: `Quiz, ${g.total} perguntas. Responde a, b ou c ${SAIR}.\n${this._quizText(g)}`, anim: 'pensando' };
      }
      case 'curiosidade': {
        g.q = this._fresh(this.data.curiosidades, g);
        return { game: g, text: `Verdade ou mentira, ${g.total} rodadas ${SAIR}.\n1/${g.total}: ${g.q.p}`, anim: 'sobrancelha' };
      }
      case 'emocao':
        return { game: g, text: `Olha a minha cara. ${this._emocaoRound(g)}`, anim: null, emocao: true };
      case 'ppn':
        g.placar = [0, 0];
        return { game: g, text: `Pedra, papel ou nadadeira, melhor de 3 ${SAIR}. Nadadeira corta papel, papel embrulha pedra, pedra amassa nadadeira. Escolhe!`, anim: 'quedaBraco' };
      case 'memoria': {
        g.seq = [pickOne(this.data.poses, r), pickOne(this.data.poses, r), pickOne(this.data.poses, r)];
        g.recorde = 0;
        return { game: g, text: `Memória: vou fazer ${g.seq.length} poses. Depois escreve na ordem, separado por vírgula. Poses: ${this.data.poses.map((p) => p.nome).join(', ')}. Olha!`, sequence: g.seq.map((p) => p.anim) };
      }
      case 'mandou':
        return { game: g, text: `O JoJo mandou: só obedece quando eu disser "O JoJo mandou". Se eu não disser, escreve "não". ${SAIR}\n${this._mandouRound(g)}`, anim: 'apontar' };
      case 'cacaPalavras': {
        g.word = pickOne(this.data.palavras, r);
        const { rows } = this._grid(g.word);
        return { game: g, text: `Caça-palavras: tem uma palavra de treino/estudo escondida (horizontal ou vertical). ${g.word.length} letras. Escreve qual é.\n${rows.join('\n')}`, anim: 'lendo' };
      }
      case 'repeticoes':
        g.n = 1;
        return { game: g, text: `Série em dupla: eu falo os ímpares, você os pares, até 20. ${SAIR}\n1!`, anim: 'contarRepeticoes' };
      case 'reflexo':
        return { game: g, text: jogo.id === 'corrida' ? 'Corrida de nado: quando eu disser JÁ, escreve qualquer coisa e manda. Se mandar antes, queimou. Prepara…' : 'Equilíbrio: quando eu disser AGORA, escreve qualquer coisa pra me segurar. Antes disso, nada. Prepara…', anim: jogo.id === 'corrida' ? 'nadarCirculos' : 'balancar', timer: 'reflexo' };
      case 'esconde':
        return { game: g, text: `Esconde-esconde: conta até 3… Me ache e clique em mim (eu fico camuflado em algum canto). ${jogo.duracao} s.`, anim: 'espiarUmOlho' };
      case 'pega':
        g.pegos = 0;
        return { game: g, text: `Pega-pega: me pega 3 vezes clicando em mim. Eu fujo, e cada vez mais rápido. ${jogo.duracao} s.`, anim: 'pular' };
      case 'cabo':
        g.tentativas = 0;
        return { game: g, text: 'Cabo de guerra: me arrasta pra longe (mais de 250 px) e solta. Eu puxo de volta. 3 tentativas.', anim: 'quedaBraco' };
      case 'cliques':
        return { game: g, text: 'Clique rápido: clica em mim o máximo que der em 10 s. Valendo!', anim: 'encarar' };
      case 'bolhas':
        return { game: g, text: 'Caça às bolhas: estoura o máximo de bolhas em 15 s!', anim: 'soprarBolhas' };
      default:
        return { game: g, text: 'Bora jogar.', anim: 'convidar' };
    }
  }

  /** Próxima rodada ou fim com placar. */
  _next(g, acertou, feedback, roundText) {
    if (acertou) g.pontos++;
    g.rodada++;
    if (g.rodada >= g.total) {
      const win = g.pontos * 2 > g.total;
      const final = g.pontos === g.total ? 'Gabaritou. Respeito.' : win ? 'Ganhou. Dessa vez.' : 'Perdeu. Treina esse cérebro.';
      return { text: `${feedback} Placar: ${g.pontos}/${g.total}. ${final}`, done: true, win, score: g.pontos, anim: win ? 'aplaudir' : 'sabiaQueIaErrar' };
    }
    return { text: `${feedback}\n${roundText()}`, done: false, anim: acertou ? 'sorrisoSuave' : 'linguaVitoria' };
  }

  answer(g, text, { now = 0 } = {}) {
    const n = norm(text);
    const r = this.rng;
    switch (g.tipo) {
      case 'quiz': {
        const idx = quizChoice(text, g.q.o);
        if (idx < 0) return { text: 'Responde a, b ou c.', done: false };
        const win = idx === g.q.r;
        const fb = win ? pickOne(['Acertou.', 'Isso.', 'Cérebro de campeã.'], r) : `Errou. Era ${'abc'[g.q.r]}) ${g.q.o[g.q.r]}.`;
        return this._next(g, win, fb, () => {
          g.q = this._fresh(this.data.quiz, g);
          return this._quizText(g);
        });
      }
      case 'curiosidade': {
        const v = /\b(verdade|verdadeiro|v|sim|s|true|real|e sim)\b/.test(n) ? true : /\b(mentira|falso|m|f|nao|n|false|fake)\b/.test(n) ? false : null;
        if (v === null) return { text: 'Verdade ou mentira?', done: false };
        const win = v === g.q.r;
        const fb = win ? pickOne(['Isso. Sabe das coisas.', 'Certa.', 'Acertou.'], r) : `Nope. É ${g.q.r ? 'verdade' : 'mentira'}.`;
        return this._next(g, win, fb, () => {
          g.q = this._fresh(this.data.curiosidades, g);
          return `${g.rodada + 1}/${g.total}: ${g.q.p}`;
        });
      }
      case 'emocao': {
        const pick = g.opts.find((o) => n.includes(norm(o)) || (n.length >= 4 && norm(o).startsWith(n.slice(0, 4))));
        if (!pick) return { text: `É ${g.opts.join(', ')}?`, done: false };
        const win = norm(pick) === norm(g.q.nome);
        const res = this._next(g, win, win ? 'Isso. Você me lê fácil.' : `Era ${g.q.nome}. Sou um mistério.`, () => this._emocaoRound(g));
        if (!res.done) res.anim = g.q.anim;
        return res;
      }
      case 'ppn': {
        const opts = ['pedra', 'papel', 'nadadeira'];
        const me = opts.find((o) => n.includes(o)) || ({ tesoura: 'nadadeira', barbatana: 'nadadeira' }[n] || null);
        if (!me) return { text: 'Pedra, papel ou nadadeira?', done: false };
        const jo = pickOne(opts, r);
        const beats = { pedra: 'nadadeira', papel: 'pedra', nadadeira: 'papel' };
        if (me === jo) return { text: `Eu: ${jo}. Empate! De novo. (${g.placar[0]} x ${g.placar[1]})`, done: false, anim: 'surpreso' };
        const win = beats[me] === jo;
        g.placar[win ? 0 : 1]++;
        const [a, b] = g.placar;
        if (a === 2 || b === 2) return { text: `Eu: ${jo}. ${a === 2 ? 'Você levou a melhor de 3' : 'Ganhei a melhor de 3. Óbvio'}. (${a} x ${b})`, done: true, win: a === 2, score: a, anim: a === 2 ? 'aplausoLento' : 'dancaVitoria' };
        return { text: `Eu: ${jo}. ${win ? 'Ponto seu.' : 'Ponto meu.'} (${a} x ${b}) Próxima!`, done: false, anim: win ? 'chocado' : 'linguaVitoria' };
      }
      case 'memoria': {
        const want = g.seq.map((p) => norm(p.nome));
        const tokens = n.split(/[\s,;-]+/).filter((x) => x && x !== 'e');
        const ok = want.length === tokens.length && want.every((w, i) => tokens[i].startsWith(w.slice(0, 3)));
        if (!ok) return { text: `Era: ${g.seq.map((p) => p.nome).join(', ')}. Você lembrou ${g.recorde} pose${g.recorde === 1 ? '' : 's'} seguidas.`, done: true, win: g.recorde >= 4, score: g.recorde, anim: 'sabiaQueIaErrar' };
        g.recorde = g.seq.length;
        if (g.seq.length >= 8) return { text: '8 poses! Memória de elefante. De tubarão, no caso.', done: true, win: true, score: 8, anim: 'comemorar' };
        g.seq.push(pickOne(this.data.poses, r));
        return { text: `Certo! Agora ${g.seq.length} poses. Olha de novo.`, done: false, sequence: g.seq.map((p) => p.anim) };
      }
      case 'mandou': {
        const obedeceu = n.replace(/\s/g, '') === norm(g.palavra);
        const certo = g.mandou ? obedeceu : !obedeceu;
        const fb = certo ? pickOne(['Boa.', 'Esperta.', 'Isso.'], r) : g.mandou ? `Eu mandei! Era ${g.palavra}.` : 'Eu não mandei! Caiu.';
        return this._next(g, certo, fb, () => this._mandouRound(g));
      }
      case 'cacaPalavras': {
        const win = n.replace(/\s/g, '') === norm(g.word).replace(/\s/g, '');
        if (!win && g.rodada++ < 2) return { text: g.rodada === 2 ? `Não. Dica: começa com ${g.word[0]}.` : 'Não é essa. Tenta de novo.', done: false };
        return { text: win ? `${g.word}! Achou.` : `Era ${g.word}.`, done: true, win, score: win ? 3 - g.rodada : 0, anim: win ? 'comemorar' : 'ombros' };
      }
      case 'repeticoes': {
        const v = Number(n);
        if (!Number.isFinite(v) || !n) return { text: `Número! Agora é ${g.n + 1}.`, done: false };
        if (v !== g.n + 1) {
          const feitos = g.n;
          g.n = 1;
          return { text: `Errou a conta (era ${feitos + 1}). Recomeça: 1!`, done: false, anim: 'chocado' };
        }
        if (v >= 20) return { text: '20! Série completa. Toca aqui.', done: true, win: true, score: 20, anim: 'highFive' };
        g.n = v + 1;
        return { text: `${g.n}!`, done: false, anim: 'contarRepeticoes' };
      }
      case 'reflexo': {
        if (!g.goAt) return { text: 'Queimou a largada! Espera eu dizer.', done: true, win: false, anim: 'linguaVitoria' };
        const ms = Math.max(0, now - g.goAt);
        const win = ms < 2500;
        return { text: win ? `${(ms / 1000).toFixed(2).replace('.', ',')} s. Rápida.` : `${(ms / 1000).toFixed(1).replace('.', ',')} s. Lenta igual tartaruga.`, done: true, win, score: ms, menorMelhor: true, anim: win ? 'aplaudir' : 'dancaVitoria' };
      }
      case 'esconde':
        return { text: /\b(achei|te achei|ali|ta ai|esta ai)\b/.test(n) ? 'Achou? Então clica em mim pra provar.' : 'Tô escondido. Procura e clica.', done: false };
      default:
        return { text: 'Esse é com clique, não com texto.', done: false };
    }
  }
}
