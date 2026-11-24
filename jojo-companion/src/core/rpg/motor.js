// Motor do RPG do JoJo (0.48): junta atributos, habilidades, especializações,
// necessidades novas, missões, expedições, fabricação, segredos e endgame num
// estado só (rpg.json), sem tocar no estado dos sistemas que já existem.
//
// Contratos com o resto do app (injetados, nada global):
// - award(recompensa): Progress.award — XP com id idempotente (vira JOJOcoins na
//   carteira da loja por reconciliação; por isso o RPG nunca credita moeda
//   para o mesmo feito que já deu XP).
// - creditar({id,valor,origem,rotulo}): carteira da loja, só para moedas
//   achadas (tesouros, feira, marcos de nível). Ausente/pendente → outbox.
// - nivel()/xpTotal()/threshold(n): leitura do Progress.
// Tudo é puro e determinístico com relógio e sorteio injetados. Nenhuma
// chamada ao modelo de linguagem: o RPG nunca disputa a conversa.

import { ATRIBUTOS, IDS_ATRIBUTOS, BASE_ATRIBUTO, TETO_ATRIBUTO, valorAtributo, efeitosDosAtributos } from './atributos.js';
import { HABILIDADES, HAB_POR_ID, COMBOS, MAESTRIAS, ARVORES } from './habilidades.js';
import { ESPECIALIZACOES, ESP_POR_ID, HABILIDADES_ESP, rankDe, limiarRank, RANK_MAX } from './especializacoes.js';
import { REGIOES, REGIAO_POR_ID, REGIAO_POR_CATEGORIA, ENCRUZILHADAS, DESAFIOS, MATERIAIS, MATERIAIS_COMUNS, ARTEFATOS, ARTEFATO_POR_ID, RARIDADES, ORDEM_RARIDADE, RECEITAS, RECEITA_POR_ID, NIVEIS_VINCULO, limiarVinculo } from './mundo.js';
import { SEMANAIS, ESPECIAIS, CADEIAS, SECRETAS, DESAFIOS_LONGOS } from './jornada.js';
import { SEGREDOS, CODIGOS, COMBINACOES, DIARIO } from './segredos.js';
import { vidaVazia, passarTempo, comer, curar, ganharVinculo, fecharDia, nivelVinculo, satisfacao, DOENCAS, adoecer } from './vida.js';
import { recompensaDoNivel, NIVEL_MAX, slotsArtefato, expedicoesSimultaneas, nivelParagon, recompensaParagon, nomeEstrela } from './niveis.js';

export const VERSAO_RPG = 1;
const HABS = [...HABILIDADES, ...HABILIDADES_ESP];
const HAB = new Map(HABS.map((h) => [h.id, h]));
const clone = (x) => structuredClone(x);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const pad = (n) => String(n).padStart(2, '0');
const diaDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function semanaDe(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return diaDe(x);
}
// Lua cheia aproximada (ciclo sinódico a partir de uma lua nova conhecida).
export function luaCheia(ms) {
  const fase = (((ms - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) % 29.530588 + 29.530588) % 29.530588;
  return fase >= 13.8 && fase <= 15.8;
}

// Antifraude não invasivo: intervalo mínimo por tipo e teto diário.
const INTERVALO = { chat: 15e3, carinho: 8e3, comida: 20e3, agua: 60e3, alongar: 60e3, cuidado: 30e3, estimulo: 10e3 };
const TETO_EVENTO_DIA = 300;
const TETO_XP_RPG_DIA = 250; // XP nominal do RPG por dia (missões, expedições, segredos, bônus de atributo)
const TETOS = { xp: 0.5, duracaoExp: 0.5, quedaVida: 0.6, sorteLoot: 0.4, chanceSegredo: 3, resistenciaDoenca: 0.9, sucesso: 0.45, tedioSobe: 0.8, cura: 1, vinculoGanho: 0.8, moedasExp: 1, desfechoBom: 0.5, escolhaSabia: 0.5, pista: 0.6 };
function tetoDe(k) {
  if (k.startsWith('xp')) return TETOS.xp;
  if (k.startsWith('sucesso')) return TETOS.sucesso;
  return TETOS[k] ?? Infinity;
}

export function rpgVazio() {
  return {
    versao: VERSAO_RPG, auto: true, investidos: Object.fromEntries(IDS_ATRIBUTOS.map((id) => [id, 0])), pontos: { atributo: 0, habilidade: 0 },
    nivelVisto: 1, paragonVisto: 0, estrelas: 0, habilidades: {}, cds: {}, buffs: [], flags: {},
    esp: { atual: null, xp: {}, trocaEm: 0 }, missoes: { semana: null, especiais: {}, cadeias: {}, secretas: {}, longos: {} },
    expedicoes: [], regioes: {}, materiais: {}, artefatos: {}, equipados: [], segredos: {}, codigos: {}, diario: 0, combos: {},
    ultimoSegredo: 0, segredosDia: { dia: null, n: 0 }, titulos: [], tituloAtivo: null, maestrias: {},
    contas: {}, contasDia: { dia: null, c: {}, comidas: {} }, rate: {}, eventosRecentes: [], vida: vidaVazia(),
    xpDia: { dia: null, n: 0 }, outbox: [], seq: 0, historico: [], ultimoDia: null, ultimaSessao: 0, relatorios: [],
  };
}

/** Valida e migra um estado salvo; nunca apaga progresso (campos novos entram com padrão). */
export function validarRpg(valor) {
  if (!valor || typeof valor !== 'object') throw new Error('Estado do RPG inválido.');
  if (valor.versao !== VERSAO_RPG) throw new Error('Versão do RPG desconhecida.');
  const base = rpgVazio();
  const st = { ...base, ...clone(valor) };
  st.investidos = { ...base.investidos, ...(st.investidos || {}) };
  st.vida = { ...vidaVazia(), ...(st.vida || {}) };
  st.missoes = { ...base.missoes, ...(st.missoes || {}) };
  st.esp = { ...base.esp, ...(st.esp || {}) };
  for (const k of ['buffs', 'expedicoes', 'equipados', 'titulos', 'outbox', 'historico', 'eventosRecentes', 'relatorios']) if (!Array.isArray(st[k])) st[k] = [];
  for (const id of IDS_ATRIBUTOS) if (!Number.isFinite(st.investidos[id]) || st.investidos[id] < 0) st.investidos[id] = 0;
  for (const k of ['atributo', 'habilidade']) if (!Number.isFinite(st.pontos?.[k]) || st.pontos[k] < 0) st.pontos = { ...st.pontos, [k]: 0 };
  for (const k of ['sede', 'energia', 'tedio', 'carinho', 'confianca']) if (!Number.isFinite(st.vida[k])) st.vida[k] = vidaVazia()[k]; else st.vida[k] = clamp(st.vida[k], 0, 100);
  st.equipados = st.equipados.filter((id) => ARTEFATO_POR_ID.has(id) && (st.artefatos[id] || 0) > 0);
  st.habilidades = Object.fromEntries(Object.entries(st.habilidades || {}).filter(([id, r]) => HAB.has(id) && Number.isInteger(r) && r > 0).map(([id, r]) => [id, Math.min(r, HAB.get(id).ranks)]));
  return st;
}

export class Rpg {
  constructor({ state = null, save = () => {}, award = () => ({ pending: true }), creditar = null, nivel = () => 1, xpTotal = () => 0, threshold = (n) => n * 1000, now = () => Date.now(), rng = Math.random, clockHealthy = () => true } = {}) {
    Object.assign(this, { save, award, creditar, nivel, xpTotal, threshold, now, rng, clockHealthy });
    this.st = state ? validarRpg(state) : rpgVazio();
    this.mudou = () => {};
    this._cacheEfeitos = null;
  }

  // ------------------------------------------------------------ infraestrutura

  /** Toda mudança passa aqui: grava atômico ou desfaz (nunca fica meio-aplicada). */
  mutar(fn) {
    const antes = clone(this.st);
    let r;
    try { r = fn(); this.save(this.st); } catch (e) { this.st = antes; this._cacheEfeitos = null; throw e; }
    this._cacheEfeitos = null;
    try { this.mudou(); } catch { /* aviso de UI nunca derruba o estado */ }
    return r;
  }
  data() { return new Date(this.now()); }
  dia() { return diaDe(this.data()); }
  _hist(tipo, txt) { this.st.historico.push({ tipo, txt: String(txt).slice(0, 240), em: this.now() }); this.st.historico = this.st.historico.slice(-120); }

  /** XP do RPG: limitado por dia, com id único; vai para a fila e sai no drain. */
  _xp(chave, nominal, rotulo, atividade = 'rpg') {
    if (!this.clockHealthy()) return 0;
    const dia = this.dia();
    if (this.st.xpDia.dia !== dia) this.st.xpDia = { dia, n: 0 };
    const v = Math.max(0, Math.min(Math.round(nominal), TETO_XP_RPG_DIA - this.st.xpDia.n, 500));
    if (!v) return 0;
    this.st.xpDia.n += v;
    this.st.outbox.push({ tipo: 'xp', id: `rpg:${dia}:${chave}:${++this.st.seq}`, amount: v, day: dia, label: rotulo, atividade });
    return v;
  }
  _moedas(chave, valor, origem, rotulo) {
    const v = Math.max(0, Math.min(5000, Math.round(valor)));
    if (!v) return 0;
    this.st.outbox.push({ tipo: 'moedas', id: `rpg:${chave}`, valor: v, origem, rotulo });
    return v;
  }
  /** Entrega o que está na fila. Falha/pendente: fica para a próxima. */
  drain() {
    let entregues = 0;
    while (this.st.outbox.length) {
      const item = this.st.outbox[0];
      let r;
      try {
        if (item.tipo === 'xp') r = this.award({ id: item.id, amount: item.amount, source: 'rpg', day: item.day, label: item.label, atividade: item.atividade });
        else r = this.creditar ? this.creditar({ id: item.id, valor: item.valor, origem: item.origem, rotulo: item.rotulo }) : { pending: true };
      } catch { return entregues; }
      if (!r || r.pending) return entregues;
      this.mutar(() => this.st.outbox.shift());
      entregues++;
    }
    return entregues;
  }
  _conta(k, n = 1) { this.st.contas[k] = (this.st.contas[k] || 0) + n; return this.st.contas[k]; }

  // ------------------------------------------------------------ atributos e efeitos

  _bonusAtributos() {
    const b = {};
    const soma = (obj, m = 1) => { for (const [k, v] of Object.entries(obj || {})) b[k] = (b[k] || 0) + v * m; };
    for (const [id, r] of Object.entries(this.st.habilidades)) soma(HAB.get(id)?.atributo, r);
    for (const id of this.st.equipados) soma(ARTEFATO_POR_ID.get(id)?.atributo);
    const esp = ESP_POR_ID.get(this.st.esp.atual);
    if (esp) for (const a of esp.atributos) b[a] = (b[a] || 0) + Math.floor(this.rankEsp(esp.id) / 2);
    return b;
  }
  atributos() {
    const bonus = this._bonusAtributos();
    return Object.fromEntries(IDS_ATRIBUTOS.map((id) => [id, valorAtributo(id, this.st.investidos, bonus)]));
  }
  /** Todos os efeitos somados (atributos + habilidades + combos + maestrias + especialização + artefatos + buffs), com teto. */
  efeitos() {
    const agora = this.now();
    if (this._cacheEfeitos && this._cacheEfeitos.ate > agora) return this._cacheEfeitos.v;
    const e = { ...efeitosDosAtributos(this.atributos()) };
    const soma = (obj, m = 1) => { for (const [k, v] of Object.entries(obj || {})) e[k] = (e[k] || 0) + v * m; };
    for (const [id, r] of Object.entries(this.st.habilidades)) soma(HAB.get(id)?.efeito, r);
    for (const c of COMBOS) if (c.requer.every((id) => this.st.habilidades[id])) soma(c.efeito);
    for (const m of MAESTRIAS) soma(m.efeito, this.st.maestrias[m.id] || 0);
    const esp = ESP_POR_ID.get(this.st.esp.atual);
    if (esp) soma(esp.efeito, this.rankEsp(esp.id));
    for (const id of this.st.equipados) soma(ARTEFATO_POR_ID.get(id)?.efeito);
    let proximo = Infinity;
    for (const b of this.st.buffs) if (b.ate > agora) { soma(b.efeito); proximo = Math.min(proximo, b.ate); }
    for (const k of Object.keys(e)) e[k] = Math.min(e[k], tetoDe(k));
    e.dicasQuiz = Math.floor(e.dicasQuiz || 0);
    this._cacheEfeitos = { v: e, ate: Math.min(proximo, agora + 60e3) };
    return e;
  }

  investir(id, n = 1) {
    if (!IDS_ATRIBUTOS.includes(id)) return { ok: false, motivo: 'Atributo desconhecido.' };
    n = Math.max(1, Math.floor(n));
    if (this.st.pontos.atributo < n) return { ok: false, motivo: 'Sem pontos de atributo livres.' };
    if (this.st.investidos[id] + n > TETO_ATRIBUTO) return { ok: false, motivo: 'Esse atributo já está no teto.' };
    return this.mutar(() => { this.st.pontos.atributo -= n; this.st.investidos[id] += n; return { ok: true, valor: this.atributos()[id] }; });
  }

  // ------------------------------------------------------------ habilidades

  podeAprender(id) {
    const h = HAB.get(id); if (!h) return 'Habilidade desconhecida.';
    const rank = this.st.habilidades[id] || 0;
    if (h.esp) return this.st.esp.atual === h.esp || this.rankEsp(h.esp) >= 3 ? (rank ? 'Já aprendida.' : null) : 'É da especialização: escolha ela antes.';
    if (rank >= h.ranks) return 'Já está no rank máximo.';
    if (this.nivel() < h.nivel) return `Precisa do nível ${h.nivel}.`;
    if (!h.requer.every((r) => this.st.habilidades[r])) return `Precisa antes: ${h.requer.map((r) => HAB.get(r)?.nome).join(', ')}.`;
    if (this.st.pontos.habilidade < h.custo) return 'Sem pontos de habilidade suficientes.';
    return null;
  }
  aprender(id) {
    const erro = this.podeAprender(id);
    if (erro) return { ok: false, motivo: erro };
    const h = HAB.get(id);
    return this.mutar(() => {
      this.st.pontos.habilidade -= h.custo;
      this.st.habilidades[id] = (this.st.habilidades[id] || 0) + 1;
      this._hist('habilidade', `${h.nome} ${this.st.habilidades[id] > 1 ? `rank ${this.st.habilidades[id]}` : 'aprendida'}.`);
      return { ok: true, habilidade: h, rank: this.st.habilidades[id] };
    });
  }
  /** Habilidades das especializações ficam liberadas a partir do rank 1 (custo 0). */
  _liberarHabEsp(espId) {
    for (const h of HABILIDADES_ESP) if (h.esp === espId && !this.st.habilidades[h.id]) this.st.habilidades[h.id] = 1;
  }

  usarHabilidade(id) {
    const h = HAB.get(id);
    if (!h || !h.acao) return { ok: false, motivo: 'Essa não é uma habilidade de usar.' };
    if (!this.st.habilidades[id]) return { ok: false, motivo: 'Ainda não aprendida.' };
    const pronto = (this.st.cds[id] || 0) + (h.cd || 0) * 3600e3;
    if (this.now() < pronto) return { ok: false, motivo: `Recarregando: faltam ${Math.ceil((pronto - this.now()) / 60e3)} min.` };
    const teste = this._acaoPossivel(h.acao);
    if (teste) return { ok: false, motivo: teste };
    return this.mutar(() => {
      const r = this._acao(h.acao, h);
      if (r.ok === false) return r;
      if (r.concluir) r.expedicoes = this.st.expedicoes.filter((x) => x.restaMs <= 0).map((ex) => this._concluirExpedicao(ex));
      this.st.cds[id] = this.now();
      this._conta('habilidadesUsadas');
      this._hist('habilidade', `${h.nome}: ${r.texto}`);
      return { ok: true, habilidade: h, anim: h.anim || null, ...r };
    });
  }
  /** Pré-checagem sem efeito colateral: recusa não gasta recarga. */
  _acaoPossivel(acao) {
    if (acao === 'sprint' && !this.st.expedicoes.length) return 'Nenhuma expedição em andamento.';
    if (acao === 'banquete' && !this.st.vida.doencas.length) return 'Ele não está doente.';
    if (acao === 'faro' && !SEGREDOS.some((s) => !this.st.segredos[s.id])) return 'Nada para farejar: você já achou tudo.';
    if (acao === 'experimento' && this.nivel() < 4) return 'Fabricação libera no nível 4.';
    if (acao === 'feira' && !MATERIAIS_COMUNS.some((m) => (this.st.materiais[m] || 0) > 3)) return 'Nada sobrando para vender (ele guarda 3 de cada).';
    if (acao === 'olharAbismo' && !this.elegiveis({}).some((s) => s.chance <= 0.02)) return 'O abismo não tem nada novo a mostrar agora.';
    return null;
  }
  _buff(id, efeito, horas) { this.st.buffs = this.st.buffs.filter((b) => b.id !== id && b.ate > this.now()); this.st.buffs.push({ id, efeito, ate: this.now() + horas * 3600e3 }); }
  _acao(acao) {
    const v = this.st.vida;
    switch (acao) {
      case 'segundoFolego': v.energia = clamp(v.energia + 40, 0, 100); v.sede = clamp(v.sede + 30, 0, 100); return { texto: 'Segundo fôlego. Energia e sede recuperadas.' };
      case 'poseEpica': v.carinho = clamp(v.carinho + 15, 0, 100); v.confianca = clamp(v.confianca + 10, 0, 100); return { texto: 'Pose épica executada. Admire.' };
      case 'furia': this.st.flags.furia = true; return { texto: 'Fúria acumulada: a próxima expedição não falha.' };
      case 'meditacao': v.energia = clamp(v.energia + 25, 0, 100); v.tedio = clamp(v.tedio - 25, 0, 100); return { texto: 'Meditação profunda. Mente limpa, guelras calmas.' };
      case 'aula': this._buff('aula', { xpEstudo: 0.5 }, 0.5); return { texto: 'Aula relâmpago: o próximo quiz vale bem mais XP.', abrirJogo: 'quiz' };
      case 'olhoTempestade': this._buff('olhoTempestade', { tedioTravado: 1, xpFoco: 0.1 }, 2); return { texto: 'Olho da tempestade: duas horas de foco sem tédio.' };
      case 'abraco': v.carinho = clamp(v.carinho + 15, 0, 100); v.tedio = clamp(v.tedio - 15, 0, 100); return { texto: 'Abraço de tubarão. Rápido, firme, sem melação.' };
      case 'presenca': for (const k of ['carinho', 'confianca']) v[k] = clamp(v[k] + 20, 0, 100); v.tedio = clamp(v.tedio - 10, 0, 100); return { texto: 'Presença reconfortante. Ele ficou do lado, quieto.' };
      case 'sprint': {
        const ex = this.st.expedicoes[0];
        if (!ex) return { ok: false, motivo: 'Nenhuma expedição em andamento.' };
        ex.restaMs = 0; return { texto: 'Sprint abissal: a expedição termina agora.', concluir: true };
      }
      case 'banquete': {
        const curadas = curar(v);
        if (!curadas.length) return { ok: false, motivo: 'Ele não está doente.' };
        this._conta('curas');
        return { texto: `Curado: ${curadas.map((id) => DOENCAS[id].nome).join(', ')}.`, evento: 'cura' };
      }
      case 'faro': {
        const p = this.pista(true);
        return p ? { texto: p, evento: 'pista' } : { ok: false, motivo: 'Nada para farejar agora: você já achou tudo o que está ao alcance.' };
      }
      case 'mapa': this.st.flags.mapa = true; return { texto: 'Mapa do tesouro marcado: a próxima expedição traz artefato raro ou melhor.' };
      case 'despertar': this._buff('despertar', { xpCuidado: 0.2, xpFoco: 0.2, xpMissao: 0.2, energiaFixa: 1, sedeFixa: 1 }, 1); return { texto: 'O Megalodon despertou. Uma hora no modo lenda.' };
      case 'olharAbismo': {
        const s = this._checarSegredos({ forcar: true, raro: true });
        return s ? { texto: s.texto, segredo: s } : { ok: false, motivo: 'O abismo não tem nada novo a mostrar agora.' };
      }
      case 'experimento': {
        const r = RECEITAS.filter((x) => x.nivel <= this.nivel()).sort((a, b) => b.nivel - a.nivel)[0];
        if (!r) return { ok: false, motivo: 'Nenhuma receita liberada.' };
        const out = this._aplicarReceita(r);
        this._conta('fabricacoes');
        return { texto: `Experimento controlado: ${r.nome} sem gastar material. ${out}`, evento: 'fabricacao' };
      }
      case 'feira': {
        let n = 0;
        for (const m of MATERIAIS_COMUNS) { const q = Math.max(0, (this.st.materiais[m] || 0) - 3); n += q; if (q) this.st.materiais[m] -= q; }
        if (!n) return { ok: false, motivo: 'Nada sobrando para vender (ele guarda 3 de cada).' };
        const valor = this._moedas(`feira:${this.dia()}:${++this.st.seq}`, n * 3, 'rpg', 'Feira do recife');
        return { texto: `Vendeu ${n} materiais comuns na feira: ${valor} JOJOcoins.`, evento: 'feira' };
      }
      default: return { ok: false, motivo: 'Ação desconhecida.' };
    }
  }

  // ------------------------------------------------------------ especializações

  rankEsp(id) { return rankDe(this.st.esp.xp[id] || 0); }
  podeEspecializar(id) {
    const e = ESP_POR_ID.get(id);
    if (!e) return 'Especialização desconhecida.';
    if (this.nivel() < Math.max(5, e.nivel)) return `Libera no nível ${Math.max(5, e.nivel)}.`;
    if (e.requisitoRanks) {
      const n = ESPECIALIZACOES.filter((x) => x.id !== 'mestre' && this.rankEsp(x.id) >= e.requisitoRanks.rank).length;
      if (n < e.requisitoRanks.quantas) return `Precisa de ${e.requisitoRanks.quantas} especializações no rank ${e.requisitoRanks.rank} (tem ${n}).`;
    }
    if (this.st.esp.atual === id) return 'Já é a atual.';
    if (this.st.esp.atual && this.now() - this.st.esp.trocaEm < 12 * 3600e3) return 'Troca de especialização só a cada 12 horas.';
    return null;
  }
  especializar(id) {
    const erro = this.podeEspecializar(id);
    if (erro) return { ok: false, motivo: erro };
    const e = ESP_POR_ID.get(id);
    return this.mutar(() => {
      this.st.esp.atual = id; this.st.esp.trocaEm = this.now();
      this.st.esp.xp[id] ||= 0;
      this._liberarHabEsp(id);
      this._hist('especializacao', `Agora é ${e.nome}. O progresso das outras fica guardado.`);
      return { ok: true, esp: e, fala: e.falas[0] };
    });
  }

  // ------------------------------------------------------------ níveis, paragon e prestígio

  /** Entrega as recompensas dos níveis ainda não vistos (idempotente: cada nível uma vez). */
  sincronizarNivel() {
    const nivel = this.nivel();
    const p = nivel >= NIVEL_MAX ? nivelParagon(this.xpTotal(), this.threshold) : 0;
    if (nivel <= this.st.nivelVisto && p <= this.st.paragonVisto) return [];
    return this.mutar(() => {
      const ganhos = [];
      for (let n = this.st.nivelVisto + 1; n <= nivel; n++) {
        const r = recompensaDoNivel(n);
        this.st.pontos.atributo += r.pontosAtributo; this.st.pontos.habilidade += r.pontosHabilidade;
        this._moedas(`nivel:${n}`, r.moedas, 'nivel', `Nível ${n}`);
        if (r.titulo && !this.st.titulos.includes(r.titulo)) this.st.titulos.push(r.titulo);
        this._hist('nivel', `Nível ${n}: +${r.pontosAtributo} atributo, +${r.pontosHabilidade} habilidade${r.desbloqueios.length ? `, ${r.desbloqueios.map((d) => d.nome).join(', ')}` : ''}.`);
        ganhos.push(r);
      }
      this.st.nivelVisto = Math.max(this.st.nivelVisto, nivel);
      for (let q = this.st.paragonVisto + 1; q <= p; q++) {
        const r = recompensaParagon(q);
        this.st.pontos.atributo += r.pontosAtributo; this.st.pontos.habilidade += r.pontosHabilidade;
        this._moedas(`paragon:${q}`, r.moedas, 'nivel', `Paragon ${q}`);
        if (r.estrela) { this.st.estrelas += 1; const t = `Estrela ${nomeEstrela(this.st.estrelas)}`; if (!this.st.titulos.includes(t)) this.st.titulos.push(t); }
        this._hist('paragon', `Paragon ${q}${r.estrela ? ` e Estrela ${nomeEstrela(this.st.estrelas)}` : ''}.`);
        ganhos.push(r);
      }
      this.st.paragonVisto = Math.max(this.st.paragonVisto, p);
      if (this.st.auto) this._autoDistribuir();
      return ganhos;
    });
  }

  /** Distribuição automática (ligada por padrão; ela pode desligar e escolher). */
  _autoDistribuir() {
    const esp = ESP_POR_ID.get(this.st.esp.atual);
    const pref = esp ? esp.atributos : [];
    let guarda = 0;
    while (this.st.pontos.atributo > 0 && guarda++ < 2000) {
      const ordem = [...IDS_ATRIBUTOS].filter((id) => this.st.investidos[id] < TETO_ATRIBUTO)
        .sort((a, b) => (this.st.investidos[a] - (pref.includes(a) ? 6 : 0)) - (this.st.investidos[b] - (pref.includes(b) ? 6 : 0)));
      if (!ordem.length) break;
      this.st.investidos[ordem[0]]++; this.st.pontos.atributo--;
    }
    guarda = 0;
    while (this.st.pontos.habilidade > 0 && guarda++ < 400) {
      const prox = HABILIDADES.filter((h) => !this.podeAprender(h.id)).sort((a, b) => a.nivel - b.nivel || a.custo - b.custo)[0];
      if (!prox) break;
      this.st.pontos.habilidade -= prox.custo; this.st.habilidades[prox.id] = (this.st.habilidades[prox.id] || 0) + 1;
    }
  }
  setAuto(v) { return this.mutar(() => { this.st.auto = !!v; if (this.st.auto) this._autoDistribuir(); return this.st.auto; }); }
  setTitulo(t) { if (t !== null && !this.st.titulos.includes(t)) return false; this.mutar(() => { this.st.tituloAtivo = t; }); return true; }

  // ------------------------------------------------------------ eventos do app

  /**
   * Evento real do app (chat, carinho, foco, comida…). Antifraude: intervalo
   * mínimo e teto diário por tipo. Devolve o que aconteceu para o serviço falar/animar.
   */
  evento(tipo, n = 1, ctx = {}) {
    if (!tipo || typeof tipo !== 'string') return null;
    const agora = this.now(), dia = this.dia();
    const ult = this.st.rate[tipo] || 0;
    if (INTERVALO[tipo] && agora - ult < INTERVALO[tipo]) return null;
    if (this.st.contasDia.dia !== dia) this.st.contasDia = { dia, c: {}, comidas: {} };
    if ((this.st.contasDia.c[tipo] || 0) >= TETO_EVENTO_DIA) return null;
    return this.mutar(() => {
      const out = { missoes: [], cadeias: [], secretas: [], combos: [], rankEsp: null, vinculo: 0, doencas: [], curadas: [], longos: [] };
      this.st.rate[tipo] = agora;
      this.st.contasDia.c[tipo] = (this.st.contasDia.c[tipo] || 0) + n;
      this._novoDia(dia);
      const v = this.st.vida, e = this.efeitos();
      // Vida: interação real mexe no tédio/carinho/vínculo.
      const VIDA = { chat: [-2, 1, 0.5], carinho: [-5, 6, 2], jogo: [-15, 2, 2], vitoria: [-5, 1, 1], comida: [-3, 2, 2], cuidado: [-3, 4, 3], limpeza: [-2, 1, 1], expedicao: [-20, 0, 4], segredo: [-10, 2, 2], missao: [-5, 2, 5], foco: [0, 0, 2], estudo: [-5, 0, 2], treino: [-8, 0, 2], tarefa: [-3, 0, 2], agua: [0, 0, 1] };
      if (VIDA[tipo]) {
        const [t, c, vin] = VIDA[tipo];
        v.tedio = clamp(v.tedio + t, 0, 100); v.carinho = clamp(v.carinho + c, 0, 100);
        out.vinculo = ganharVinculo(v, vin * n, { dia, efeitos: e, needs: ctx.needs });
      }
      if (['chat', 'carinho', 'jogo', 'comida', 'cuidado', 'agua', 'limpeza', 'estudo', 'treino'].includes(tipo)) v.ultimaInteracao = agora;
      if (tipo === 'agua') { v.sede = clamp(v.sede + 25, 0, 100); }
      if (tipo === 'comida' && ctx.comida) {
        const r = comer(v, ctx.comida, { efeitos: e, agora, rng: this.rng });
        out.doencas = r.novas; out.curadas = r.curadas;
        this.st.contasDia.comidas[ctx.comida] = (this.st.contasDia.comidas[ctx.comida] || 0) + 1;
      }
      if (tipo === 'cuidado') { const c = curar(v); if (c.length) { out.curadas.push(...c); this._conta('curas'); } }
      // Contadores permanentes (maestrias, desafios longos, secretas).
      const CONTA = { expedicao: 'expedicoes', cuidado: 'cuidados', estudo: 'estudos', foco: 'focos', vitoria: 'vitorias', segredo: 'segredos', fabricacao: 'fabricacoes', missao: 'missoes', artefato: 'artefatos', tarefa: 'tarefas', comida: 'comidas', chat: 'mensagens' };
      if (CONTA[tipo]) this._conta(CONTA[tipo], n);
      this._maestrias(out);
      // Especialização ativa ganha XP pelas fontes dela.
      const esp = ESP_POR_ID.get(this.st.esp.atual);
      if (esp && esp.fontes[tipo]) {
        const antes = this.rankEsp(esp.id);
        this.st.esp.xp[esp.id] = Math.min(limiarRank(RANK_MAX) + 1, (this.st.esp.xp[esp.id] || 0) + esp.fontes[tipo] * n);
        const depois = this.rankEsp(esp.id);
        if (depois > antes) { out.rankEsp = { esp, rank: depois }; this._hist('especializacao', `${esp.nome} chegou ao rank ${depois}.`); }
      }
      // Bônus real dos atributos/habilidades sobre XP que outro sistema já deu.
      if (ctx.xpBase > 0) {
        const chave = { estudo: 'xpEstudo', foco: 'xpFoco', timer: 'xpFoco', cuidado: 'xpCuidado', comida: 'xpCuidado', limpeza: 'xpCuidado', vitoria: 'xpJogo', treino: 'xpTreino' }[tipo];
        const bonus = chave ? Math.floor(ctx.xpBase * (e[chave] || 0)) : 0;
        if (bonus > 0) out.xpBonus = this._xp(`bonus:${tipo}`, bonus, `Bônus de ${ATRIBUTOS.find((a) => a.efeito === chave)?.nome || 'habilidade'}`);
      }
      // Missões.
      this._avancarMissoes(tipo, n, out, ctx);
      // Combinações.
      this.st.eventosRecentes = [...this.st.eventosRecentes.filter((x) => agora - x.at < 3600e3), { t: tipo, at: agora }].slice(-12);
      for (const c of COMBINACOES) {
        const ult = this.st.eventosRecentes.slice(-c.seq.length);
        if (ult.length === c.seq.length && ult.every((x, i) => x.t === c.seq[i]) && agora - ult[0].at <= c.s * 1000 && agora - (this.st.combos[c.id] || 0) > 6 * 3600e3) {
          this.st.combos[c.id] = agora;
          this._aplicarDesfecho(c, `combo:${c.id}`);
          out.combos.push(c);
          this.st.eventosRecentes = [];
        }
      }
      this._secretas(tipo, out, ctx);
      this._longos(out);
      return out;
    });
  }

  _novoDia(dia) {
    if (this.st.ultimoDia === dia) return;
    const anterior = this.st.ultimoDia;
    this.st.ultimoDia = dia;
    this._conta('dias');
    if (anterior) fecharDia(this.st.vida, { dia: anterior, cuidouHoje: !!this.st.flags.cuidouOntem, criticoHoje: !!this.st.flags.criticoOntem, efeitos: this.efeitos() });
    this.st.flags.cuidouOntem = false; this.st.flags.criticoOntem = false;
  }

  _maestrias(out) {
    for (const m of MAESTRIAS) {
      const nivel = m.niveis.filter((x) => (this.st.contas[m.conta] || 0) >= x).length;
      if (nivel > (this.st.maestrias[m.id] || 0)) { this.st.maestrias[m.id] = nivel; (out.maestrias ||= []).push({ ...m, nivel }); this._hist('maestria', `${m.nome} ${'I'.repeat(nivel)}.`); }
    }
  }

  // ------------------------------------------------------------ missões

  semanaAtual() {
    const semana = semanaDe(this.data());
    if (this.st.missoes.semana?.chave === semana) return this.st.missoes.semana;
    const pool = SEMANAIS.filter((m) => (m.nivel || 1) <= this.nivel());
    const itens = [];
    while (itens.length < 3 && pool.length) itens.push({ ...pool.splice(Math.floor(this.rng() * pool.length) % pool.length, 1)[0], feito: 0, ok: false });
    const esp = ESP_POR_ID.get(this.st.esp.atual);
    if (esp) itens.push({ ...esp.missoes[Math.floor(this.rng() * esp.missoes.length) % esp.missoes.length], xp: 45, cat: 'especializacao', esp: esp.id, feito: 0, ok: false });
    this.st.missoes.semana = { chave: semana, itens };
    return this.st.missoes.semana;
  }
  especiaisAtivas() {
    const d = this.data();
    return ESPECIAIS.filter((m) => d.getMonth() + 1 === m.mes && d.getDate() >= m.de && d.getDate() <= m.ate);
  }
  cadeiasDisponiveis() { return CADEIAS.filter((c) => this.nivel() >= c.nivel); }

  _concluir(chave, xp, rotulo, out, extra = {}) {
    const mult = 1 + (this.efeitos().xpMissao || 0);
    const ganho = this._xp(`missao:${chave}`, xp * mult, rotulo, 'missao');
    this._conta('missoes');
    this._hist('missao', `${rotulo} (+${ganho} XP).`);
    out.missoes.push({ chave, rotulo, xp: ganho, ...extra });
  }

  _avancarMissoes(tipo, n, out) {
    if (this.nivel() >= 3) {
      const sem = this.semanaAtual();
      for (const m of sem.itens) {
        if (m.ok || m.evento !== tipo) continue;
        m.feito = Math.min(m.n, m.feito + n);
        if (m.feito >= m.n) { m.ok = true; this._concluir(`sem:${sem.chave}:${m.id}`, m.xp, `Missão semanal: ${m.txt}`, out); }
      }
    }
    const ano = this.data().getFullYear();
    for (const m of this.especiaisAtivas()) {
      const k = `${m.id}:${ano}`;
      const p = this.st.missoes.especiais[k] ||= { feito: m.objetivos.map(() => 0), ok: false };
      if (p.ok) continue;
      m.objetivos.forEach((o, i) => { if (o.evento === tipo) p.feito[i] = Math.min(o.n, p.feito[i] + n); });
      if (m.objetivos.every((o, i) => p.feito[i] >= o.n)) { p.ok = true; this._concluir(`esp:${k}`, m.xp, `Missão especial: ${m.nome}`, out); }
    }
    for (const c of this.cadeiasDisponiveis()) {
      const p = this.st.missoes.cadeias[c.id] ||= { cap: 0, feito: 0, ok: false };
      if (p.ok) continue;
      const cap = c.capitulos[p.cap];
      if (cap.evento !== tipo) continue;
      p.feito = Math.min(cap.n, p.feito + n);
      if (p.feito < cap.n) continue;
      p.cap += 1; p.feito = 0;
      this._concluir(`cad:${c.id}:${p.cap}`, 20 + 5 * p.cap, `${c.nome}, capítulo ${p.cap}`, out, { historia: cap.txt });
      out.cadeias.push({ cadeia: c, capitulo: p.cap, final: p.cap >= c.capitulos.length, proximo: c.capitulos[p.cap]?.txt || null });
      if (p.cap >= c.capitulos.length) {
        p.ok = true;
        this._ganharArtefato(c.artefato, out);
        if (!this.st.titulos.includes(c.titulo)) this.st.titulos.push(c.titulo);
        this._concluir(`cadfim:${c.id}`, 80, `História concluída: ${c.nome}`, out);
      }
    }
  }

  _secretas(tipo, out, ctx) {
    const d = this.data(), h = d.getHours();
    for (const s of SECRETAS) {
      if (this.st.missoes.secretas[s.id]) continue;
      const c = s.cond;
      let ok = false;
      if (c.evento && c.hora) ok = tipo === c.evento && h >= c.hora[0] && h < c.hora[1];
      else if (c.contaDia) ok = (this.st.contasDia.c[c.contaDia] || 0) >= c.n;
      else if (c.comidaDia) ok = (this.st.contasDia.comidas[c.comidaDia] || 0) >= c.n;
      else if (c.conta) ok = (this.st.contas[c.conta] || 0) >= c.n;
      else if (c.rodizio) ok = tipo === 'comida' && new Set(this.st.vida.recentes.filter((r) => this.now() - r.at <= 600e3).map((r) => r.id)).size >= c.rodizio;
      else if (c.rajada) ok = tipo === c.rajada && this.st.eventosRecentes.filter((x) => x.t === c.rajada && this.now() - x.at <= c.s * 1000).length + 1 >= c.n;
      else if (c.artefatosDiferentes) ok = Object.keys(this.st.artefatos).length >= c.artefatosDiferentes;
      else if (c.regioesConcluidas) ok = Object.values(this.st.regioes).filter((r) => r.concluidas > 0).length >= c.regioesConcluidas;
      if (!ok) continue;
      this.st.missoes.secretas[s.id] = this.now();
      this._concluir(`sec:${s.id}`, s.xp, `Missão secreta: ${s.nome}`, out, { secreta: true, desc: s.desc });
      out.secretas.push(s);
    }
    void ctx;
  }

  _longos(out) {
    for (const d of DESAFIOS_LONGOS) {
      if (this.st.missoes.longos[d.id]) continue;
      let ok = false;
      if (d.conta) ok = (this.st.contas[d.conta] || 0) >= d.n;
      else if (d.esp) ok = ESPECIALIZACOES.filter((e) => this.rankEsp(e.id) >= d.esp.rank).length >= d.esp.quantas;
      else if (d.artefatosRaridade) ok = Object.keys(this.st.artefatos).filter((id) => ARTEFATO_POR_ID.get(id)?.raridade === d.artefatosRaridade.raridade).length >= d.artefatosRaridade.n;
      if (!ok) continue;
      this.st.missoes.longos[d.id] = this.now();
      if (!this.st.titulos.includes(d.titulo)) this.st.titulos.push(d.titulo);
      this._concluir(`longo:${d.id}`, d.xp, `Desafio de longa duração: ${d.nome}`, out);
      out.longos.push(d);
    }
  }

  // ------------------------------------------------------------ expedições

  regioesLiberadas() { return this.nivel() < 2 ? [] : REGIOES.filter((r) => this.nivel() >= r.nivel); }
  podeExpedicao(regiaoId) {
    const r = REGIAO_POR_ID.get(regiaoId);
    if (this.nivel() < 2) return 'Expedições liberam no nível 2.';
    if (!r) return 'Região desconhecida.';
    if (this.nivel() < r.nivel) return `${r.nome} libera no nível ${r.nivel}.`;
    if (this.st.expedicoes.length >= expedicoesSimultaneas(this.nivel())) return 'Ele já está numa expedição.';
    if (this.st.expedicoes.some((x) => x.regiao === regiaoId)) return 'Já tem uma expedição nessa região.';
    if (this.st.vida.energia < 20) return 'Energia baixa demais. Comida, água ou meditação antes.';
    if (this.st.vida.doencas.some((d) => d.id === 'exaustao')) return 'Exausto. Precisa descansar antes.';
    return null;
  }
  /** Escolhe uma região: a pedida, a do app em foco (se liberada) ou a menos explorada. */
  sugerirRegiao(categoria = null) {
    const lib = this.regioesLiberadas().filter((r) => !this.st.expedicoes.some((x) => x.regiao === r.id));
    if (!lib.length) return null;
    const doApp = categoria && REGIAO_POR_CATEGORIA.get(categoria);
    if (doApp && lib.includes(doApp)) return doApp;
    const esp = ESP_POR_ID.get(this.st.esp.atual);
    if (esp && lib.some((r) => r.id === esp.regiao) && this.rng() < 0.4) return REGIAO_POR_ID.get(esp.regiao);
    return lib.sort((a, b) => (this.st.regioes[a.id]?.concluidas || 0) - (this.st.regioes[b.id]?.concluidas || 0) || b.nivel - a.nivel)[0];
  }
  iniciarExpedicao(regiaoId = null, ctx = {}) {
    const r = regiaoId ? REGIAO_POR_ID.get(regiaoId) : this.sugerirRegiao(ctx.categoria);
    const erro = this.podeExpedicao(r?.id || regiaoId || 'recife');
    if (erro) return { ok: false, motivo: erro };
    const e = this.efeitos();
    const ms = Math.round(r.duracao * 60e3 * (1 - Math.min(0.5, e.duracaoExp || 0)));
    const enc = ENCRUZILHADAS[Math.floor(this.rng() * ENCRUZILHADAS.length) % ENCRUZILHADAS.length];
    return this.mutar(() => {
      this.st.vida.energia = clamp(this.st.vida.energia - (8 + 2 * r.dificuldade), 0, 100);
      this.st.vida.sede = clamp(this.st.vida.sede - 8, 0, 100);
      const ex = { id: `${this.dia()}:${++this.st.seq}`, regiao: r.id, totalMs: ms, restaMs: ms, desafio: r.desafio, encruzilhada: enc.id, escolha: null, inicio: this.now(), furia: !!this.st.flags.furia, mapa: !!this.st.flags.mapa };
      this.st.flags.furia = false; this.st.flags.mapa = false;
      this.st.expedicoes.push(ex);
      this._hist('expedicao', `Partiu para ${r.nome}.`);
      return { ok: true, regiao: r, minutos: Math.round(ms / 60e3), anim: r.anim, texto: `Partindo para ${r.nome}. ${r.desc} Volto em ~${Math.round(ms / 60e3)} min de computador ligado.` };
    });
  }
  /** Encruzilhada pendente (metade da expedição, sem escolha ainda). */
  encruzilhadaPendente() {
    const ex = this.st.expedicoes.find((x) => !x.escolha && x.restaMs <= x.totalMs / 2);
    if (!ex) return null;
    const enc = ENCRUZILHADAS.find((x) => x.id === ex.encruzilhada);
    return { expedicao: ex.id, regiao: REGIAO_POR_ID.get(ex.regiao), ...enc };
  }
  escolher(opcaoId, { auto = false } = {}) {
    const p = this.encruzilhadaPendente();
    if (!p) return { ok: false, motivo: 'Nenhuma decisão pendente.' };
    let op = p.opcoes.find((o) => o.id === opcaoId || norm(o.txt) === norm(opcaoId));
    if (!op && auto) {
      const at = this.atributos();
      op = [...p.opcoes].sort((a, b) => at[DESAFIOS[b.desafio].atributo] - at[DESAFIOS[a.desafio].atributo])[0];
    }
    if (!op) return { ok: false, motivo: `Escolha: ${p.opcoes.map((o) => `${o.id}) ${o.txt}`).join(' ou ')}.` };
    return this.mutar(() => {
      const ex = this.st.expedicoes.find((x) => x.id === p.expedicao);
      ex.escolha = op.id; ex.desafio = op.desafio; ex.escolhaTxt = op.txt; ex.escolhaAuto = auto;
      const out = { missoes: [], cadeias: [], secretas: [], combos: [], longos: [] };
      if (!auto) { this._avancarMissoes('escolha', 1, out); this._conta('escolhas'); }
      return { ok: true, opcao: op, texto: auto ? `O JoJo decidiu sozinho: ${op.txt}.` : `Anotado: ${op.txt}.`, ...out };
    });
  }
  chanceSucesso(ex) {
    const r = REGIAO_POR_ID.get(ex.regiao), d = DESAFIOS[ex.desafio], e = this.efeitos(), at = this.atributos();
    const base = 0.6 + (e[d.efeito] || 0) + 0.002 * (at[d.atributo] - BASE_ATRIBUTO) - 0.05 * (r.dificuldade - 1) + (ex.escolha && !ex.escolhaAuto ? (e.escolhaSabia || 0) : 0) - (this.st.vida.doencas.length ? 0.1 : 0) + Math.min(0.1, (this.nivel() - r.nivel) * 0.005);
    return ex.furia ? 1 : clamp(base, 0.15, 0.95);
  }
  _rolarRaridade(minimo = 'comum') {
    const e = this.efeitos();
    const pesos = RARIDADES.map((r, i) => (ORDEM_RARIDADE.indexOf(minimo) > i ? 0 : r.peso * (i === 0 ? 1 : 1 + 6 * (e.sorteLoot || 0) * i)));
    let x = this.rng() * pesos.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pesos.length; i++) { x -= pesos[i]; if (x <= 0 && pesos[i] > 0) return RARIDADES[i].id; }
    return RARIDADES[pesos.findLastIndex((p) => p > 0)].id;
  }
  _ganharArtefato(id, out) {
    const a = ARTEFATO_POR_ID.get(id);
    if (!a) return null;
    const novo = !this.st.artefatos[id];
    this.st.artefatos[id] = (this.st.artefatos[id] || 0) + 1;
    this._conta('artefatosAchados');
    if (novo && this.st.equipados.length < this._slots()) this.st.equipados.push(id);
    (out.artefatos ||= []).push({ ...a, novo });
    this._avancarMissoes('artefato', 1, out);
    this._conta('artefatos');
    const esp = ESP_POR_ID.get(this.st.esp.atual);
    if (esp?.fontes.artefato) this.st.esp.xp[esp.id] = (this.st.esp.xp[esp.id] || 0) + esp.fontes.artefato;
    return a;
  }
  _artefatoAleatorio({ regiao = null, raridade = null } = {}) {
    const rar = raridade || this._rolarRaridade();
    let pool = ARTEFATOS.filter((a) => !a.unico && a.raridade === rar && (!regiao || a.regiao === regiao));
    if (!pool.length) pool = ARTEFATOS.filter((a) => !a.unico && (!regiao || a.regiao === regiao) && ORDEM_RARIDADE.indexOf(a.raridade) >= ORDEM_RARIDADE.indexOf(rar));
    if (!pool.length) pool = ARTEFATOS.filter((a) => !a.unico && (!regiao || a.regiao === regiao));
    return pool[Math.floor(this.rng() * pool.length) % pool.length]?.id || null;
  }
  _slots() { return slotsArtefato(this.nivel()) + (this.efeitos().slotArtefato || 0); }

  _concluirExpedicao(ex) {
    const r = REGIAO_POR_ID.get(ex.regiao), e = this.efeitos();
    if (!ex.escolha) { const p = ENCRUZILHADAS.find((x) => x.id === ex.encruzilhada); const at = this.atributos(); const op = [...p.opcoes].sort((a, b) => at[DESAFIOS[b.desafio].atributo] - at[DESAFIOS[a.desafio].atributo])[0]; ex.escolha = op.id; ex.desafio = op.desafio; ex.escolhaTxt = op.txt; ex.escolhaAuto = true; }
    const chance = this.chanceSucesso(ex);
    const sucesso = this.rng() < chance;
    const out = { missoes: [], cadeias: [], secretas: [], combos: [], longos: [], artefatos: [], materiais: {}, doencas: [] };
    const reg = this.st.regioes[r.id] ||= { concluidas: 0, sucessos: 0, exploracaoMin: 0 };
    const primeira = !reg.concluidas;
    reg.concluidas++; if (sucesso) reg.sucessos++;
    const qtd = sucesso ? 1 + Math.floor(this.rng() * 3) + (this.rng() < (e.materialExtra || 0) ? 1 : 0) : 1;
    for (let i = 0; i < qtd; i++) { const m = r.materiais[Math.floor(this.rng() * r.materiais.length) % r.materiais.length]; this.st.materiais[m] = (this.st.materiais[m] || 0) + 1; out.materiais[m] = (out.materiais[m] || 0) + 1; }
    const xp = this._xp(`exp:${ex.id}`, (sucesso ? 10 + 5 * r.dificuldade : 5 + 2 * r.dificuldade) * (1 + (e.xpMissao || 0) / 2), `Expedição: ${r.nome}`, 'expedicao');
    let moedas = 0;
    if (sucesso) moedas = this._moedas(`exp:${ex.id}`, (6 + 4 * r.dificuldade) * (1 + (e.moedasExp || 0)), 'expedicao', `Tesouro: ${r.nome}`);
    if (sucesso && (ex.mapa || this.rng() < 0.22 + (e.sorteLoot || 0) + 0.02 * r.dificuldade)) {
      const id = this._artefatoAleatorio({ regiao: r.id, raridade: ex.mapa ? this._rolarRaridade('raro') : null });
      if (id) this._ganharArtefato(id, out);
    }
    if (!sucesso && this.rng() < 0.3 * (1 - (e.fuga || 0)) && adoecer(this.st.vida, 'enjoo', e, this.rng, 1)) out.doencas.push('enjoo');
    this.st.expedicoes = this.st.expedicoes.filter((x) => x.id !== ex.id);
    for (const t of ['expedicao', `regiao_${r.id}`, ...(ex.desafio === 'fisico' ? ['expedicaoFisica'] : []), ...(primeira ? ['regiaoNova'] : [])]) {
      this._avancarMissoesEvento(t, out);
    }
    const mats = Object.entries(out.materiais).map(([m, q]) => `${q}× ${MATERIAIS[m]}`).join(', ');
    const texto = `Voltei de ${r.nome}. ${ENCRUZILHADAS.find((x) => x.id === ex.encruzilhada).txt} ${ex.escolhaAuto ? 'Decidi sozinho' : 'Você mandou'}: ${ex.escolhaTxt.toLowerCase()}. ${sucesso ? 'Deu certo, óbvio.' : 'Deu errado. Acontece até com lenda.'} Trouxe ${mats}${out.artefatos.length ? ` e ${out.artefatos.map((a) => `${a.nome} (${RARIDADES.find((x) => x.id === a.raridade).nome})`).join(', ')}` : ''}${moedas ? `, ${moedas} JOJOcoins` : ''}. +${xp} XP.`;
    const rel = { id: ex.id, regiao: r.id, nome: r.nome, sucesso, chance: Math.round(chance * 100), escolha: ex.escolhaTxt, auto: ex.escolhaAuto, materiais: out.materiais, artefatos: out.artefatos.map((a) => a.id), moedas, xp, em: this.now(), texto };
    this.st.relatorios = [...this.st.relatorios, rel].slice(-20);
    this._hist('expedicao', texto);
    return { ...out, relatorio: rel, texto, anim: sucesso ? 'comemorar' : 'cansado', sucesso };
  }
  /** Evento interno (expedição/artefato) sem passar pelo antifraude de taxa. */
  _avancarMissoesEvento(tipo, out) {
    const CONTA = { expedicao: 'expedicoes' };
    if (CONTA[tipo]) this._conta(CONTA[tipo]);
    const esp = ESP_POR_ID.get(this.st.esp.atual);
    if (esp && esp.fontes[tipo]) {
      const antes = this.rankEsp(esp.id);
      this.st.esp.xp[esp.id] = (this.st.esp.xp[esp.id] || 0) + esp.fontes[tipo];
      if (this.rankEsp(esp.id) > antes) out.rankEsp = { esp, rank: this.rankEsp(esp.id) };
    }
    if (tipo === 'expedicao') { const v = this.st.vida; v.tedio = clamp(v.tedio - 20, 0, 100); ganharVinculo(v, 4, { dia: this.dia(), efeitos: this.efeitos() }); }
    this._avancarMissoes(tipo, 1, out);
    this._maestrias(out);
    this._secretas(tipo, out, {});
    this._longos(out);
  }

  // ------------------------------------------------------------ fabricação e artefatos

  receitasLiberadas() { return this.nivel() < 4 ? [] : RECEITAS.filter((r) => r.nivel <= this.nivel()); }
  _aplicarReceita(r) {
    const v = this.st.vida;
    if (r.uso?.energia) v.energia = clamp(v.energia + r.uso.energia, 0, 100);
    if (r.uso?.sede) v.sede = clamp(v.sede + r.uso.sede, 0, 100);
    let txt = r.desc;
    if (r.uso?.curar) { const c = curar(v); txt = c.length ? `Curou: ${c.map((id) => DOENCAS[id].nome).join(', ')}.` : 'Ele nem estava doente, mas tomou mesmo assim.'; }
    if (r.buff) this._buff(r.id, r.buff, r.horas || 1);
    return txt;
  }
  fabricar(id) {
    const r = RECEITA_POR_ID.get(id);
    if (!r) return { ok: false, motivo: 'Receita desconhecida.' };
    if (this.nivel() < Math.max(4, r.nivel)) return { ok: false, motivo: `Libera no nível ${Math.max(4, r.nivel)}.` };
    const falta = Object.entries(r.custo).filter(([m, q]) => (this.st.materiais[m] || 0) < q);
    if (falta.length) return { ok: false, motivo: `Falta: ${falta.map(([m, q]) => `${q - (this.st.materiais[m] || 0)}× ${MATERIAIS[m]}`).join(', ')}.` };
    return this.mutar(() => {
      for (const [m, q] of Object.entries(r.custo)) this.st.materiais[m] -= q;
      const txt = this._aplicarReceita(r);
      const out = { missoes: [], cadeias: [], secretas: [], combos: [], longos: [] };
      this._conta('fabricacoes');
      this._avancarMissoesEvento('fabricacao', out);
      this._hist('fabricacao', `${r.nome}: ${txt}`);
      return { ok: true, receita: r, texto: `${r.nome} pronto. ${txt}`, anim: 'beberShake', ...out };
    });
  }
  equipar(id) {
    if (!this.st.artefatos[id]) return { ok: false, motivo: 'Ele não tem esse artefato.' };
    if (this.st.equipados.includes(id)) return { ok: false, motivo: 'Já está equipado.' };
    if (this.st.equipados.length >= this._slots()) return { ok: false, motivo: `Espaços cheios (${this._slots()}). Tire um antes.` };
    return this.mutar(() => { this.st.equipados.push(id); return { ok: true }; });
  }
  desequipar(id) {
    if (!this.st.equipados.includes(id)) return { ok: false, motivo: 'Não está equipado.' };
    return this.mutar(() => { this.st.equipados = this.st.equipados.filter((x) => x !== id); return { ok: true }; });
  }

  // ------------------------------------------------------------ segredos

  _condSegredo(s, ctx) {
    const c = s.cond, d = this.data(), h = d.getHours();
    if (c.hora && !(h >= c.hora[0] && h < c.hora[1])) return false;
    if (c.horaMinuto && !c.horaMinuto.includes(`${pad(h)}:${pad(d.getMinutes())}`)) return false;
    if (c.sexta13 && !(d.getDay() === 5 && d.getDate() === 13)) return false;
    if (c.mes && d.getMonth() + 1 !== c.mes) return false;
    if (c.dia && d.getDate() !== c.dia) return false;
    if (c.luaCheia && !luaCheia(this.now())) return false;
    if (c.clima && !c.clima.includes(ctx.clima)) return false;
    if (c.nivelMin && this.nivel() < c.nivelMin) return false;
    if (c.vinculoMin && nivelVinculo(this.st.vida.vinculoXp) < c.vinculoMin) return false;
    if (c.categoria && !c.categoria.includes(ctx.categoria)) return false;
    if (c.ausenciaHoras && !((ctx.ausenciaHoras || 0) >= c.ausenciaHoras)) return false;
    if (c.diasMultiplo && !((this.st.contas.dias || 0) > 0 && (this.st.contas.dias % c.diasMultiplo === 0))) return false;
    if (c.streakMin && !((ctx.streak || 0) >= c.streakMin)) return false;
    return true;
  }
  elegiveis(ctx = {}) {
    const agora = this.now();
    return SEGREDOS.filter((s) => !(s.unico && this.st.segredos[s.id]) && agora - (this.st.segredos[s.id]?.ultimo || 0) >= s.cd * 3600e3 && this._condSegredo(s, ctx));
  }
  /**
   * Checagem periódica (o serviço chama a cada ~10 min de uso ativo, nunca em
   * Trabalho/foco/tela cheia). Intervalo global de 40 min e até 3 por dia.
   */
  checarSegredos(ctx = {}) {
    return this.mutar(() => this._checarSegredos(ctx));
  }
  _checarSegredos(ctx = {}) {
    const agora = this.now(), dia = this.dia();
    if (this.st.segredosDia.dia !== dia) this.st.segredosDia = { dia, n: 0 };
    if (!ctx.forcar && (this.st.segredosDia.n >= 3 || agora - this.st.ultimoSegredo < 40 * 60e3)) return null;
    let lista = this.elegiveis(ctx);
    if (ctx.raro) lista = lista.filter((s) => s.chance <= 0.02);
    const mult = 1 + (this.efeitos().chanceSegredo || 0);
    lista.sort(() => this.rng() - 0.5);
    const s = ctx.forcar ? lista[0] : lista.find((x) => this.rng() < Math.min(1, x.chance * mult));
    if (!s) return null;
    this.st.ultimoSegredo = agora; this.st.segredosDia.n++;
    const r = this._aplicarDesfecho(s, `seg:${s.id}:${this.dia()}`, true);
    const reg = this.st.segredos[s.id] ||= { n: 0, primeiro: agora, desfechos: [] };
    reg.n++; reg.ultimo = agora; if (!reg.desfechos.includes(r.indice)) reg.desfechos.push(r.indice);
    const out = { missoes: [], cadeias: [], secretas: [], combos: [], longos: [] };
    this._conta('segredos');
    this._avancarMissoes('segredo', 1, out);
    const esp = ESP_POR_ID.get(this.st.esp.atual);
    if (esp?.fontes.segredo) this.st.esp.xp[esp.id] = (this.st.esp.xp[esp.id] || 0) + esp.fontes.segredo;
    this._maestrias(out); this._longos(out);
    this._hist('segredo', `${s.nome}: ${r.texto}`);
    return { segredo: s, texto: r.texto, anim: s.anim, novo: reg.n === 1, ...r, ...out };
  }
  _aplicarDesfecho(fonte, chave, sorteia = false) {
    let d = fonte, indice = 0;
    if (sorteia && fonte.desfechos) {
      const e = this.efeitos();
      const pesos = fonte.desfechos.map((x) => x.peso * (x.bom ? 1 + (e.desfechoBom || 0) * 3 : 1));
      let x = this.rng() * pesos.reduce((a, b) => a + b, 0);
      indice = pesos.findIndex((p) => (x -= p) <= 0); if (indice < 0) indice = 0;
      d = fonte.desfechos[indice];
    }
    const out = { artefatos: [] };
    let texto = d.txt;
    if (d.xp) this._xp(chave, d.xp, fonte.nome || 'Descoberta', 'segredo');
    if (d.moedas > 0) this._moedas(chave, d.moedas, 'segredo', fonte.nome || 'Descoberta');
    if (d.material) this.st.materiais[d.material] = (this.st.materiais[d.material] || 0) + 1;
    if (d.vida) for (const [k, v] of Object.entries(d.vida)) if (k in this.st.vida) this.st.vida[k] = clamp(this.st.vida[k] + v, 0, 100);
    if (d.buff) this._buff(`seg:${fonte.id}`, d.buff, d.horas || 6);
    const art = d.artefato || (d.artefatoRegiao && this._artefatoAleatorio({ regiao: d.artefatoRegiao })) || (d.artefatoAleatorio && this._artefatoAleatorio()) || (d.artefatoRaridade && this._artefatoAleatorio({ raridade: d.artefatoRaridade }));
    if (art) { const a = this._ganharArtefato(art, out); if (a) texto += ` Ganhou: ${a.nome}.`; }
    if (d.fragmento && this.st.diario < DIARIO.length) {
      texto += ` ${DIARIO[this.st.diario]}`;
      this.st.diario++;
      if (this.st.diario === DIARIO.length) { this._ganharArtefato('diarioDoMegalodon', out); texto += ' O Diário do Megalodon está completo.'; }
    }
    return { texto, indice, ...out };
  }
  /** Código secreto no chat (frase exata). Cada um vale uma vez. */
  codigo(texto) {
    const n = norm(texto);
    const c = CODIGOS.find((x) => x.frases.some((f) => norm(f) === n));
    if (!c) return null;
    if (this.st.codigos[c.id]) return { repetido: true, texto: 'Esse código você já usou. O JoJo não cai duas vezes.', anim: 'sobrancelha' };
    return this.mutar(() => {
      this.st.codigos[c.id] = this.now();
      const r = this._aplicarDesfecho(c, `cod:${c.id}`);
      this._conta('segredos');
      const out = { missoes: [], cadeias: [], secretas: [], combos: [], longos: [] };
      this._avancarMissoes('segredo', 1, out);
      this._hist('segredo', `Código: ${r.texto}`);
      return { texto: r.texto, anim: c.anim, ...out };
    });
  }
  /** Pista concreta de um segredo ainda não visto (Faro de Sangue / Percepção). */
  pista(forcar = false) {
    const naoVistos = SEGREDOS.filter((s) => !this.st.segredos[s.id]);
    if (!naoVistos.length || (!forcar && this.rng() > (this.efeitos().pista || 0))) return null;
    const s = naoVistos[Math.floor(this.rng() * naoVistos.length) % naoVistos.length], c = s.cond;
    const partes = [];
    if (c.hora) partes.push(`entre ${c.hora[0]}h e ${c.hora[1]}h`);
    if (c.horaMinuto) partes.push('numa hora espelhada');
    if (c.mes) partes.push(`no mês ${c.mes}${c.dia ? `, dia ${c.dia}` : ''}`);
    else if (c.dia) partes.push(`no dia ${c.dia}`);
    if (c.sexta13) partes.push('numa sexta-feira 13');
    if (c.luaCheia) partes.push('em noite de lua cheia');
    if (c.clima) partes.push(`com ${c.clima[0]} lá fora`);
    if (c.categoria) partes.push(`enquanto você usa ${REGIAO_POR_CATEGORIA.get(c.categoria[0])?.nome || c.categoria[0]}`);
    if (c.nivelMin) partes.push(`a partir do nível ${c.nivelMin}`);
    if (c.vinculoMin) partes.push(`quando o vínculo chegar a "${NIVEIS_VINCULO[c.vinculoMin - 1]}"`);
    if (c.ausenciaHoras) partes.push('quando você voltar de um sumiço');
    if (c.streakMin) partes.push(`depois de ${c.streakMin} dias seguidos`);
    return `Pista: algo chamado "${s.nome}" acontece ${partes.length ? partes.join(', ') : 'quando menos se espera, com muita sorte'}.`;
  }

  // ------------------------------------------------------------ tempo

  /**
   * Passagem de tempo. ms = tempo com o app rodando desde a última chamada
   * (o serviço já descarta saltos > 90 s, suspensão e relógio mexido).
   * ctx: { ativo (uso ativo fora de Trabalho/foco), repouso, dormindo, hora, needs, categoria, frio, percepcao }
   */
  tick(ms, ctx = {}) {
    if (!(ms > 0) || ms > 90e3) return null;
    return this.mutar(() => {
      const out = { doencas: [], curadas: [], expedicoes: [], encruzilhada: null };
      const e = this.efeitos();
      this._novoDia(this.dia());
      if (ctx.ativo || ctx.repouso) {
        const r = passarTempo(this.st.vida, ms, { hora: ctx.hora ?? this.data().getHours(), repouso: !!ctx.repouso, dormindo: !!ctx.dormindo, efeitos: e, needs: ctx.needs, rng: this.rng, agora: this.now(), frio: !!ctx.frio });
        out.doencas = r.novas; out.curadas = r.curadas;
      }
      if (ctx.needs && (ctx.needs.hunger < 10 || ctx.needs.hygiene < 10)) this.st.flags.criticoOntem = true;
      // Exploração metafórica: minutos do app em foco viram exploração da região (só com percepção ligada).
      const reg = ctx.ativo && ctx.categoria ? REGIAO_POR_CATEGORIA.get(ctx.categoria) : null;
      if (reg && this.nivel() >= reg.nivel) {
        const r = this.st.regioes[reg.id] ||= { concluidas: 0, sucessos: 0, exploracaoMin: 0 };
        const antes = Math.floor(r.exploracaoMin / 60);
        r.exploracaoMin += (ms / 60e3) * (1 + (e.exploracao || 0));
        if (Math.floor(r.exploracaoMin / 60) > antes) {
          const m = reg.materiais[Math.floor(this.rng() * reg.materiais.length) % reg.materiais.length];
          this.st.materiais[m] = (this.st.materiais[m] || 0) + 1;
          out.exploracao = { regiao: reg, material: m, horas: Math.floor(r.exploracaoMin / 60) };
          const esp = ESP_POR_ID.get(this.st.esp.atual);
          if (esp?.fontes.exploracao) this.st.esp.xp[esp.id] = (this.st.esp.xp[esp.id] || 0) + esp.fontes.exploracao * 60;
        }
      }
      // Expedições avançam com o computador ligado (também no Trabalho, em silêncio).
      for (const ex of [...this.st.expedicoes]) {
        ex.restaMs -= ms;
        if (ex.restaMs <= 0) out.expedicoes.push(this._concluirExpedicao(ex));
      }
      out.encruzilhada = this.encruzilhadaPendente();
      // Encruzilhada esquecida: perto do fim, o JoJo decide sozinho (sem punição).
      for (const ex of this.st.expedicoes) if (!ex.escolha && ex.restaMs <= ex.totalMs * 0.1) {
        const p = ENCRUZILHADAS.find((x) => x.id === ex.encruzilhada); const at = this.atributos();
        const op = [...p.opcoes].sort((a, b) => at[DESAFIOS[b.desafio].atributo] - at[DESAFIOS[a.desafio].atributo])[0];
        Object.assign(ex, { escolha: op.id, desafio: op.desafio, escolhaTxt: op.txt, escolhaAuto: true });
      }
      this.st.buffs = this.st.buffs.filter((b) => b.ate > this.now());
      return out;
    });
  }
  /** Usa a habilidade de expedição pendente (Sprint) concluindo de verdade. */
  concluirAgora() {
    return this.mutar(() => this.st.expedicoes.filter((x) => x.restaMs <= 0).map((ex) => this._concluirExpedicao(ex)));
  }
  marcarCuidado() { this.st.flags.cuidouOntem = true; }

  // ------------------------------------------------------------ leitura

  snapshot() {
    const nivel = this.nivel(), e = this.efeitos(), at = this.atributos(), v = this.st.vida;
    const sem = this.nivel() >= 3 ? this.semanaAtual() : null;
    const vin = nivelVinculo(v.vinculoXp);
    return {
      nivel, paragon: this.st.paragonVisto, estrelas: this.st.estrelas, estrela: nomeEstrela(this.st.estrelas), auto: this.st.auto,
      pontos: { ...this.st.pontos },
      atributos: ATRIBUTOS.map((a) => ({ ...a, valor: at[a.id], investidos: this.st.investidos[a.id] })),
      efeitos: Object.fromEntries(Object.entries(e).filter(([, x]) => x)),
      vida: { sede: Math.round(v.sede), energia: Math.round(v.energia), tedio: Math.round(v.tedio), carinho: Math.round(v.carinho), confianca: Math.round(v.confianca), satisfacao: satisfacao(v), doencas: v.doencas.map((d) => ({ id: d.id, nome: DOENCAS[d.id]?.nome, minutos: Math.ceil(d.restaMs / 60e3) })) },
      vinculo: { nivel: vin, nome: NIVEIS_VINCULO[vin - 1], xp: Math.floor(v.vinculoXp), proximo: vin < NIVEIS_VINCULO.length ? limiarVinculo(vin + 1) : null },
      arvores: ARVORES.map((t) => ({ ...t, habilidades: HABILIDADES.filter((h) => h.arvore === t.id).map((h) => this._hab(h)) })),
      habilidadesEsp: HABILIDADES_ESP.filter((h) => this.st.habilidades[h.id]).map((h) => this._hab(h)),
      combos: COMBOS.map((c) => ({ ...c, ativo: c.requer.every((id) => this.st.habilidades[id]) })),
      maestrias: MAESTRIAS.map((m) => ({ ...m, nivel: this.st.maestrias[m.id] || 0, conta: this.st.contas[m.conta] || 0 })),
      especializacao: this.st.esp.atual,
      especializacoes: ESPECIALIZACOES.map((x) => ({ id: x.id, nome: x.nome, nivel: x.nivel, rank: this.rankEsp(x.id), xp: Math.floor(this.st.esp.xp[x.id] || 0), proximo: limiarRank(Math.min(RANK_MAX, this.rankEsp(x.id) + 1)), liberada: !this.podeEspecializar(x.id) || this.st.esp.atual === x.id, motivo: this.st.esp.atual === x.id ? null : this.podeEspecializar(x.id), aviso: x.aviso, atributos: x.atributos })),
      semana: sem ? sem.itens.map((m) => ({ id: m.id, txt: m.txt, n: m.n, feito: m.feito, ok: m.ok, xp: m.xp })) : [],
      especiais: this.especiaisAtivas().map((m) => ({ id: m.id, nome: m.nome, objetivos: m.objetivos, feito: this.st.missoes.especiais[`${m.id}:${this.data().getFullYear()}`]?.feito || m.objetivos.map(() => 0), ok: !!this.st.missoes.especiais[`${m.id}:${this.data().getFullYear()}`]?.ok })),
      cadeias: this.cadeiasDisponiveis().map((c) => { const p = this.st.missoes.cadeias[c.id] || { cap: 0, feito: 0, ok: false }; return { id: c.id, nome: c.nome, capitulo: p.cap, total: c.capitulos.length, ok: p.ok, atual: p.ok ? null : { ...c.capitulos[p.cap], feito: p.feito } }; }),
      secretas: SECRETAS.map((s) => (this.st.missoes.secretas[s.id] ? { id: s.id, nome: s.nome, desc: s.desc, ok: true } : { id: s.id, nome: '???', ok: false })),
      longos: DESAFIOS_LONGOS.map((d) => ({ id: d.id, nome: d.nome, ok: !!this.st.missoes.longos[d.id], progresso: d.conta ? Math.min(d.n, this.st.contas[d.conta] || 0) : null, n: d.n || null })),
      expedicoes: this.st.expedicoes.map((x) => ({ id: x.id, regiao: x.regiao, nome: REGIAO_POR_ID.get(x.regiao)?.nome, minutos: Math.max(0, Math.ceil(x.restaMs / 60e3)), progresso: Math.round(100 * (1 - Math.max(0, x.restaMs) / x.totalMs)), escolha: x.escolhaTxt || null, chance: Math.round(this.chanceSucesso(x) * 100) })),
      encruzilhada: this.encruzilhadaPendente(),
      regioes: REGIOES.map((r) => ({ id: r.id, nome: r.nome, nivel: r.nivel, liberada: nivel >= r.nivel && nivel >= 2, desc: r.desc, ...(this.st.regioes[r.id] || { concluidas: 0, sucessos: 0, exploracaoMin: 0 }), exploracaoMin: Math.floor(this.st.regioes[r.id]?.exploracaoMin || 0) })),
      relatorios: this.st.relatorios.slice(-5).reverse(),
      materiais: Object.entries(this.st.materiais).filter(([, q]) => q > 0).map(([id, q]) => ({ id, nome: MATERIAIS[id], q })),
      receitas: RECEITAS.map((r) => ({ ...r, liberada: nivel >= Math.max(4, r.nivel), pode: nivel >= Math.max(4, r.nivel) && Object.entries(r.custo).every(([m, q]) => (this.st.materiais[m] || 0) >= q), custoTxt: Object.entries(r.custo).map(([m, q]) => `${q}× ${MATERIAIS[m]}`).join(', ') })),
      artefatos: Object.entries(this.st.artefatos).map(([id, q]) => ({ ...ARTEFATO_POR_ID.get(id), q, equipado: this.st.equipados.includes(id) })).filter((a) => a.id),
      artefatosTotal: ARTEFATOS.length, slots: this._slots(),
      segredos: SEGREDOS.map((s) => (this.st.segredos[s.id] ? { id: s.id, nome: s.nome, n: this.st.segredos[s.id].n } : { id: s.id, nome: '???' })),
      segredosDescobertos: Object.keys(this.st.segredos).length + Object.keys(this.st.codigos).length, segredosTotal: SEGREDOS.length + CODIGOS.length,
      diario: DIARIO.slice(0, this.st.diario),
      buffs: this.st.buffs.filter((b) => b.ate > this.now()).map((b) => ({ id: b.id, minutos: Math.ceil((b.ate - this.now()) / 60e3) })),
      titulos: [...this.st.titulos], tituloAtivo: this.st.tituloAtivo,
      contas: { ...this.st.contas },
      historico: this.st.historico.slice(-20).reverse(),
      xpRpgHoje: this.st.xpDia.dia === this.dia() ? this.st.xpDia.n : 0, xpRpgTeto: TETO_XP_RPG_DIA,
      pendentes: this.st.outbox.length,
    };
  }
  _hab(h) {
    const rank = this.st.habilidades[h.id] || 0;
    const cdAte = h.cd ? (this.st.cds[h.id] || 0) + h.cd * 3600e3 : 0;
    return { id: h.id, nome: h.nome, tipo: h.tipo, desc: h.desc, nivel: h.nivel, ranks: h.ranks, rank, custo: h.custo, requer: h.requer, ativa: !!h.acao, recarga: cdAte > this.now() ? Math.ceil((cdAte - this.now()) / 60e3) : 0, motivo: this.podeAprender(h.id) };
  }
}
