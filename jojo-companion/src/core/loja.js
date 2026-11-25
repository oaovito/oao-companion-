// Carteira de JOJOcoins e loja do JoJo: ganho, compra, inventário, uso e efeitos.
// Lógica pura e testável. Cada operação muda uma cópia do estado e só vale depois da
// gravação confirmada (`save`); se gravar falhar, o estado anterior volta inteiro.
// Ganho: as recompensas confirmadas da progressão (rewards.history, sequência
// monotônica) viram JOJOcoins por reconciliação — um travamento entre salvar o XP e
// salvar a carteira se resolve sozinho na abertura seguinte, sem crédito duplicado.
// Nome da moeda: sempre JOJOcoins (regra irredutível do João, 24/11/2026).
import { ITENS, item as itemDoCatalogo, NOME_MOEDA } from './loja-catalogo.js';
import { DECOR } from './loja-arte.js';

export const VERSAO_LOJA = 1;

export const LOJA_LIMITES = Object.freeze({
  tetoDia: 1200,          // JOJOcoins ganhos por dia (antifarm; não limita compras)
  txGuardadas: 2000,      // transações lembradas para idempotência
  historico: 300,
  pendentes: 50,
  maxQtd: 20,             // por compra
  creditosGuardados: 20000, // ids de créditos externos lembrados
});

// Fator de conversão por fonte (XP nominal → JOJOcoins). Fontes com tetos diários altos
// (cuidados, tarefas, masmorra) rendem menos por ponto para equilibrar com a conversa.
export const FATOR_FONTE = Object.freeze({ interaction: 1, bonus: 1, feeding: 0.5, cleanup: 0.5, care: 0.5, todo: 0.3, darkest: 0.3 });

// Requisitos legítimos de nível por faixa (o nível é do personagem; o direito de uso é da compra).
export const NIVEL_MINIMO = Object.freeze({ acessivel: 1, comum: 1, incomum: 1, raro: 3, epico: 8, lendario: 15, extraordinario: 25 });

const RECURSOS_ALTERNAVEIS = new Set(['aura', 'rastro', 'holofote']);

export function lojaVazia() {
  return {
    version: VERSAO_LOJA, saldo: 0, ganhoTotal: 0, gastoTotal: 0, ultimaSeq: 0,
    dia: { dia: null, ganho: 0 }, inventario: {}, ativos: { decor: { esquerda: null, direita: null, fundo: null }, aura: false, rastro: false, holofote: false },
    buffs: [], escudos: 0, cooldowns: {}, tx: {}, txOrdem: [], creditos: {}, creditosOrdem: [], historico: [], pendentes: [], marcos: {}, destaque: null,
  };
}

const inteiro = (n) => Number.isSafeInteger(n) && n >= 0;

/** Valida e normaliza um estado salvo; lança erro se estiver corrompido. */
export function validarLoja(valor) {
  const st = migrarLoja(valor);
  if (!inteiro(st.saldo) || !inteiro(st.ganhoTotal) || !inteiro(st.gastoTotal) || !inteiro(st.ultimaSeq)) throw new Error('Carteira de JOJOcoins inválida.');
  if (!st.inventario || typeof st.inventario !== 'object' || Array.isArray(st.inventario)) throw new Error('Inventário inválido.');
  for (const [id, e] of Object.entries(st.inventario)) {
    if (!itemDoCatalogo(id) || !e || !inteiro(e.qtd)) throw new Error('Item de inventário inválido.');
  }
  for (const k of ['buffs', 'txOrdem', 'historico', 'pendentes']) if (!Array.isArray(st[k])) throw new Error('Registro da loja inválido.');
  return st;
}

/**
 * Migrações versionadas. Cada degrau tem ida (`up`) e volta (`down`) para permitir
 * rollback: a volta da v1 devolve null (o app antigo não conhece a loja e ignora o
 * arquivo; nada do resto do save muda). Grafias antigas do nome da moeda em saves
 * (jojocoins/Jojocoins/JojoCoins) são lidas como saldo, preservando o valor.
 */
export const MIGRACOES = Object.freeze([
  {
    de: 0, para: 1,
    up: (v) => {
      const base = lojaVazia();
      const antigo = ['JOJOcoins', 'jojocoins', 'Jojocoins', 'JojoCoins', 'moedas'].map((k) => v?.[k]).find((n) => inteiro(n));
      if (antigo != null) base.saldo = antigo;
      return base;
    },
    // Volta ao formato v0 (só o saldo), que a subida lê de novo: ida e volta preserva o saldo.
    down: (v) => ({ version: 0, JOJOcoins: v.saldo }),
  },
]);

export function migrarLoja(valor) {
  if (valor == null || typeof valor !== 'object') throw new Error('Carteira de JOJOcoins ausente.');
  let st = structuredClone(valor);
  let versao = Number.isInteger(st.version) ? st.version : 0;
  if (versao > VERSAO_LOJA) throw new Error('Carteira de uma versão mais nova.');
  while (versao < VERSAO_LOJA) {
    const m = MIGRACOES.find((x) => x.de === versao);
    st = m.up(st); versao = m.para;
  }
  const base = lojaVazia();
  return { ...base, ...st, dia: { ...base.dia, ...st.dia }, ativos: { ...base.ativos, ...st.ativos, decor: { ...base.ativos.decor, ...st.ativos?.decor } } };
}

/** Rollback de uma versão para outra anterior (usado pelo script de reversão). */
export function rebaixarLoja(valor, alvo = 0) {
  let st = structuredClone(valor); let versao = st?.version ?? 0;
  while (st && versao > alvo) {
    const m = MIGRACOES.find((x) => x.para === versao);
    st = m.down(st); versao = m.de;
  }
  return st;
}

export class Loja {
  /**
   * @param {object} o
   * @param {object} [o.state] estado salvo (validado aqui)
   * @param {(st:object)=>void} [o.save] gravação atômica; lança em falha
   * @param {()=>number} [o.now]
   * @param {(ms:number)=>string} [o.dia] dia lógico (AAAA-MM-DD)
   * @param {number} [o.escala] escala de XP da progressão (crédito = nominal × escala)
   */
  constructor({ state, save = () => {}, now = () => Date.now(), dia = (ms) => new Date(ms).toISOString().slice(0, 10), escala = 10 } = {}) {
    this.st = state ? validarLoja(state) : lojaVazia();
    Object.assign(this, { save, now, dia, escala });
    this.changed = () => {};
  }

  /** Muda uma cópia e só troca o estado se a gravação confirmar. */
  _mutar(fn) {
    const antes = this.st; this.st = structuredClone(antes);
    let r;
    try { r = fn(this.st); this.save(this.st); } catch (e) { this.st = antes; throw e; }
    try { this.changed(); } catch { /* a interface nunca derruba a transação */ }
    return r;
  }

  _registrar(st, ev) {
    st.historico.push({ ...ev, at: this.now(), saldo: st.saldo });
    if (st.historico.length > LOJA_LIMITES.historico) st.historico = st.historico.slice(-LOJA_LIMITES.historico);
  }

  _lembrarTx(st, txId, resultado) {
    st.tx[txId] = resultado; st.txOrdem.push(txId);
    while (st.txOrdem.length > LOJA_LIMITES.txGuardadas) delete st.tx[st.txOrdem.shift()];
  }

  // ------------------------------------------------------------------ ganho

  /** JOJOcoins que um evento de recompensa rende, antes do teto do dia. */
  moedasDoEvento(ev, mods = this.mods()) {
    if (!ev || !inteiro(ev.amount)) return 0;
    const nominal = ev.amount / this.escala;
    const fator = FATOR_FONTE[ev.source] ?? 1;
    let n = nominal * fator * (mods.moedas || 1);
    if (ev.atividade === 'missao' || /^Missão/.test(ev.label || '')) n *= mods.moedasMissao || 1;
    return Math.max(0, Math.floor(n + 1e-9));
  }

  /**
   * Credita as recompensas ainda não convertidas, em ordem de sequência. Idempotente:
   * reprocessar o mesmo histórico não credita de novo. Devolve o total creditado.
   */
  reconciliar(historico = []) {
    const novos = historico.filter((e) => e && Number.isInteger(e.sequence) && e.sequence > this.st.ultimaSeq).sort((a, b) => a.sequence - b.sequence);
    const maior = historico.reduce((m, e) => Math.max(m, e?.sequence || 0), 0);
    if (!novos.length) {
      // Progresso reiniciado (sequência voltou atrás): rebase sem crédito.
      if (historico.length && maior < this.st.ultimaSeq) this._mutar((st) => { st.ultimaSeq = maior; });
      return 0;
    }
    return this._mutar((st) => {
      let total = 0; const mods = this.mods();
      for (const ev of novos) {
        const dia = ev.day || this.dia(this.now());
        if (st.dia.dia !== dia) st.dia = { dia, ganho: 0 };
        const n = Math.min(this.moedasDoEvento(ev, mods), LOJA_LIMITES.tetoDia - st.dia.ganho);
        st.ultimaSeq = ev.sequence;
        if (n <= 0) continue;
        st.saldo += n; st.ganhoTotal += n; st.dia.ganho += n; total += n;
        this._registrar(st, { tipo: 'ganho', valor: n, origem: String(ev.label || ev.source || '').slice(0, 80), seq: ev.sequence });
      }
      return total;
    });
  }

  /**
   * Crédito de outra parte do app (missões, aventuras, eventos): { id, valor, origem, rotulo }.
   * Idempotente por `id` (o mesmo id nunca credita duas vezes; devolve duplicado: true).
   * Passa pelos mesmos modificadores (Ímã; origem 'missao' recebe Missões em Dobro) e pelo
   * teto do dia. Lança erro se a gravação falhar: quem chamou mantém a recompensa na fila.
   */
  creditar({ id, valor, origem = 'externo', rotulo = '' } = {}) {
    if (typeof id !== 'string' || !id || id.length > 200 || !Number.isSafeInteger(valor) || valor < 0 || valor > 5000) throw new Error('Crédito de JOJOcoins inválido.');
    if (this.st.creditos?.[id]) return { ok: true, duplicado: true, creditado: 0, saldo: this.st.saldo };
    return this._mutar((st) => {
      const mods = this.mods();
      let n = valor * (mods.moedas || 1) * (origem === 'missao' ? mods.moedasMissao || 1 : 1);
      const dia = this.dia(this.now());
      if (st.dia.dia !== dia) st.dia = { dia, ganho: 0 };
      n = Math.max(0, Math.min(Math.floor(n + 1e-9), LOJA_LIMITES.tetoDia - st.dia.ganho));
      st.creditos ||= {}; st.creditosOrdem ||= [];
      st.creditos[id] = dia; st.creditosOrdem.push(id);
      while (st.creditosOrdem.length > LOJA_LIMITES.creditosGuardados) delete st.creditos[st.creditosOrdem.shift()];
      if (n > 0) {
        st.saldo += n; st.ganhoTotal += n; st.dia.ganho += n;
        this._registrar(st, { tipo: 'ganho', valor: n, origem: String(rotulo || origem).slice(0, 80), credito: id });
      }
      return { ok: true, creditado: n, saldo: st.saldo };
    });
  }

  /**
   * Estorno de um crédito dado por engano (correção do histórico de anime): { id, valor, motivo }.
   * Idempotente pelo `id` do crédito original (estornar duas vezes não desconta de novo) e
   * nunca deixa o saldo negativo: desconta no máximo o que existe. Lança se a gravação falhar.
   */
  estornar({ id, valor, motivo = '' } = {}) {
    if (typeof id !== 'string' || !id || id.length > 200 || !Number.isSafeInteger(valor) || valor < 0 || valor > 5000) throw new Error('Estorno de JOJOcoins inválido.');
    const chave = `estorno:${id}`;
    if (this.st.creditos?.[chave]) return { ok: true, duplicado: true, estornado: 0, saldo: this.st.saldo };
    return this._mutar((st) => {
      const n = Math.max(0, Math.min(valor, st.saldo));
      st.creditos ||= {}; st.creditosOrdem ||= [];
      st.creditos[chave] = this.dia(this.now()); st.creditosOrdem.push(chave);
      while (st.creditosOrdem.length > LOJA_LIMITES.creditosGuardados) delete st.creditos[st.creditosOrdem.shift()];
      if (n > 0) { st.saldo -= n; this._registrar(st, { tipo: 'estorno', valor: n, origem: String(motivo || 'Correção').slice(0, 80), credito: id }); }
      return { ok: true, estornado: n, saldo: st.saldo };
    });
  }

  // ------------------------------------------------------------------ consultas

  possui(id) { return (this.st.inventario[id]?.qtd || 0) > 0 || !!this.st.inventario[id]?.permanente; }
  qtd(id) { return this.st.inventario[id]?.qtd || 0; }

  /** Itens permanentes comprados de um tipo de efeito (look, anim, decor, recurso). */
  comprados(chave) {
    return Object.keys(this.st.inventario).map(itemDoCatalogo).filter((it) => it && this.st.inventario[it.id].permanente && it.efeito[chave] != null);
  }
  looks() { return this.comprados('look').map((it) => it.efeito.look); }
  animacoes() { return this.comprados('anim').map((it) => it.efeito.anim); }
  temRecurso(nome) { return this.comprados('recurso').some((it) => it.efeito.recurso === nome); }

  /** Modificadores dos poderes ativos agora (multiplicadores e pisos). */
  mods(agora = this.now()) {
    const m = {};
    for (const b of this.st.buffs) {
      if (b.ate <= agora) continue;
      if (['fome', 'higiene'].includes(b.mod)) m[b.mod] = Math.min(m[b.mod] ?? 1, b.valor);
      else if (b.mod === 'saude') m.saude = 1;
      else if (b.mod === 'humorMin') m.humorMin = Math.max(m.humorMin || 0, b.valor);
      else m[b.mod] = Math.max(m[b.mod] || 0, b.valor);
    }
    return m;
  }

  /** Por que não dá para comprar (ou null se dá). */
  bloqueio(id, { qtd = 1, nivel = 1 } = {}) {
    const it = itemDoCatalogo(id);
    if (!it) return 'inexistente';
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > LOJA_LIMITES.maxQtd) return 'quantidade';
    if (!it.consumivel && this.possui(id)) return 'possui';
    if (it.consumivel && this.qtd(id) + qtd > it.maxEstoque) return 'estoque';
    if (nivel < (NIVEL_MINIMO[it.raridade] || 1)) return 'nivel';
    if (this.st.saldo < it.preco * qtd) return 'saldo';
    return null;
  }

  // ------------------------------------------------------------------ transações

  /**
   * Compra atômica e idempotente: débito, inventário, histórico e registro da
   * transação vão na mesma gravação. O mesmo txId devolve o mesmo resultado.
   */
  comprar({ txId, id, qtd = 1, nivel = 1 }) {
    if (typeof txId !== 'string' || !txId || txId.length > 120) throw new Error('Transação sem identificador.');
    if (this.st.tx[txId]) return { ...this.st.tx[txId], repetida: true };
    const motivo = this.bloqueio(id, { qtd, nivel });
    if (motivo) return { ok: false, motivo, saldo: this.st.saldo, preco: itemDoCatalogo(id)?.preco ?? null };
    const it = itemDoCatalogo(id);
    return this._mutar((st) => {
      const custo = it.preco * qtd;
      st.saldo -= custo; st.gastoTotal += custo;
      const e = st.inventario[id] ||= { qtd: 0, compradoEm: this.now(), usados: 0 };
      if (it.consumivel) e.qtd += qtd; else { e.qtd = 1; e.permanente = true; }
      if (it.tipo === 'visual' || it.efeito.look) st.destaque = { look: it.efeito.look, ate: this.now() + 48 * 3600e3 };
      const resultado = { ok: true, id, qtd, custo, saldo: st.saldo, txId };
      this._lembrarTx(st, txId, resultado);
      this._registrar(st, { tipo: 'compra', item: id, qtd, valor: -custo, txId });
      this._marcos(st);
      return resultado;
    });
  }

  /**
   * Usa um consumível (comida, cuidado ou poder): baixa o estoque e registra o efeito.
   * Poderes de modificador ativam na mesma gravação; efeitos externos (necessidades,
   * missões) entram na fila `pendentes` e são aplicados pelo serviço de forma idempotente.
   */
  usar({ txId, id }) {
    if (typeof txId !== 'string' || !txId || txId.length > 120) throw new Error('Transação sem identificador.');
    if (this.st.tx[txId]) return { ...this.st.tx[txId], repetida: true };
    const it = itemDoCatalogo(id);
    if (!it || !it.consumivel) return { ok: false, motivo: 'naoConsumivel' };
    if (this.qtd(id) < 1) return { ok: false, motivo: 'semEstoque' };
    if (this.st.pendentes.length >= LOJA_LIMITES.pendentes) return { ok: false, motivo: 'ocupado' };
    return this._mutar((st) => {
      const e = st.inventario[id]; e.qtd -= 1; e.usados = (e.usados || 0) + 1;
      const agora = this.now(); const ef = it.efeito;
      if (ef.mod) this._buff(st, { id: it.id, mod: ef.mod, valor: ef.valor, ate: agora + ef.horas * 3600e3 });
      if (ef.buff) { const p = itemDoCatalogo(ef.buff.id); this._buff(st, { id: p.id, mod: p.efeito.mod, valor: p.efeito.valor, ate: agora + ef.buff.horas * 3600e3 }); }
      if (ef.acao === 'escudo') st.escudos += 1;
      if (ef.recurso === 'megalodon') st.megalodonAte = agora + (ef.minutos || 30) * 60e3;
      const externo = it.tipo === 'comida' || it.tipo === 'cuidado' || (ef.acao && ef.acao !== 'escudo');
      if (externo) st.pendentes.push({ id: `loja:${txId}`, item: id, tipo: it.tipo, nome: it.nome, efeito: structuredClone(ef), at: agora });
      const resultado = { ok: true, id, txId, restante: e.qtd, pendente: externo ? `loja:${txId}` : null };
      this._lembrarTx(st, txId, resultado);
      this._registrar(st, { tipo: 'uso', item: id, valor: 0, txId });
      return resultado;
    });
  }

  _buff(st, b) {
    const atual = st.buffs.find((x) => x.id === b.id && x.ate > this.now());
    st.buffs = st.buffs.filter((x) => x.ate > this.now() && x.id !== b.id);
    // Reusar o mesmo poder soma a duração restante (nunca perde o que já foi pago).
    if (atual) b = { ...b, ate: b.ate + (atual.ate - this.now()) };
    st.buffs.push(b);
  }

  /**
   * Aplica a fila de efeitos externos em ordem. `aplicar(p)` devolve true quando o efeito
   * foi confirmado no destino (que guarda `p.id` para não aplicar duas vezes). Para no
   * primeiro que falhar; o resto fica para a próxima chamada (inclusive após travamento).
   */
  drenar(aplicar) {
    let n = 0;
    while (this.st.pendentes.length) {
      const p = this.st.pendentes[0]; let ok;
      try { ok = aplicar(structuredClone(p)); } catch { ok = false; }
      if (!ok) break;
      this._mutar((st) => { st.pendentes = st.pendentes.filter((x) => x.id !== p.id); });
      n++;
    }
    return n;
  }

  /** Histórico de uso do motor de visuais (preferência; pequeno e limitado). */
  salvarMotor(estado) {
    if (!estado || typeof estado !== 'object') return;
    this._mutar((st) => { st.motorVisual = estado; });
  }

  /** Gasta um Escudo de Sequência, se houver. */
  usarEscudo() {
    if (this.st.escudos < 1) return false;
    this._mutar((st) => { st.escudos -= 1; this._registrar(st, { tipo: 'escudo', valor: 0 }); });
    return true;
  }

  /** Liga/desliga decoração ou recurso lendário comprado (sem custo). */
  alternar(id, ligado) {
    const it = itemDoCatalogo(id);
    if (!it || !this.possui(id) || it.consumivel) return { ok: false, motivo: 'naoPossui' };
    const ef = it.efeito;
    if (ef.decor) {
      const lado = ladoDecor(ef.decor);
      return this._mutar((st) => { st.ativos.decor[lado] = ligado ? ef.decor : (st.ativos.decor[lado] === ef.decor ? null : st.ativos.decor[lado]); return { ok: true, decor: { ...st.ativos.decor } }; });
    }
    if (RECURSOS_ALTERNAVEIS.has(ef.recurso)) return this._mutar((st) => { st.ativos[ef.recurso] = !!ligado; return { ok: true, [ef.recurso]: !!ligado }; });
    return { ok: false, motivo: 'naoAlternavel' };
  }

  /** Começa uma atividade comprada respeitando o intervalo entre usos. */
  iniciarAtividade(id) {
    const it = itemDoCatalogo(id);
    if (!it || !it.efeito.roteiro || !this.possui(id)) return { ok: false, motivo: 'naoPossui' };
    const agora = this.now(); const livre = this.st.cooldowns[id] || 0;
    if (livre > agora) return { ok: false, motivo: 'intervalo', livreEm: livre };
    return this._mutar((st) => { st.cooldowns[id] = agora + (it.efeito.cooldownH || 1) * 3600e3; return { ok: true, roteiro: it.efeito.roteiro }; });
  }

  /** Marcos de coleção (dez colecionáveis = conquista). */
  _marcos(st) {
    const col = ITENS.filter((i) => i.tipo === 'colecionavel');
    if (!st.marcos.colecaoCompleta && col.every((i) => st.inventario[i.id]?.permanente)) st.marcos.colecaoCompleta = this.now();
  }

  /** Look comprado recentemente recebe prioridade temporária no motor de visuais. */
  destaque(agora = this.now()) { return this.st.destaque && this.st.destaque.ate > agora ? this.st.destaque.look : null; }

  /** Resumo para a interface (cópia; nada mutável sai daqui). */
  resumo(agora = this.now()) {
    const st = this.st;
    return {
      moeda: NOME_MOEDA, saldo: st.saldo, ganhoTotal: st.ganhoTotal, gastoTotal: st.gastoTotal, ganhoHoje: st.dia.dia === this.dia(agora) ? st.dia.ganho : 0, tetoDia: LOJA_LIMITES.tetoDia,
      inventario: Object.fromEntries(Object.entries(st.inventario).map(([k, v]) => [k, { ...v }])),
      ativos: structuredClone(st.ativos), buffs: st.buffs.filter((b) => b.ate > agora).map((b) => ({ ...b })), escudos: st.escudos,
      cooldowns: Object.fromEntries(Object.entries(st.cooldowns).filter(([, v]) => v > agora)), marcos: { ...st.marcos },
      historico: st.historico.slice(-60).reverse(), megalodon: (st.megalodonAte || 0) > agora,
    };
  }
}

/** Lado da decoração no chão (esquerda, direita ou fundo). */
export function ladoDecor(decorId) {
  return DECOR[decorId]?.lado || 'fundo';
}
