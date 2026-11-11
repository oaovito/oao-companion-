// Bloqueio do Discord: o que fazer quando ele aparece. Puro: o sistema (ler
// processos, encerrar, desinstalar) e as falas chegam por funções injetadas,
// então os testes usam processos e abas simulados e nunca desinstalam nada.
//
// Regras:
// - Chave desligada: nenhuma detecção e nenhuma ação.
// - Remove só o aplicativo, pelo desinstalador que o próprio Discord registrou
//   no Windows. Nenhuma pasta é apagada à mão; dados de conta ficam intactos.
// - No navegador, fecha só a aba do Discord (quem fecha é a extensão).
// - Desinstalação falhou: o processo é encerrado, o erro é registrado e a
//   usuária é avisada. A nova tentativa espera `retryMs`.
// - Tudo o que foi detectado e feito entra no histórico, com data e hora.
import { uninstallCommand, variantById, BROWSERS } from './discord-detect.js';

export const HISTORY_MAX = 200;
export const ACOES = Object.freeze(['encerrado', 'falha_encerrar', 'desinstalado', 'falha_desinstalar', 'aba_fechada', 'falha_aba']);
const ERROS = Object.freeze(['desinstalador_desconhecido', 'permissao_negada', 'tempo_esgotado', 'ainda_instalado', 'processo_resistiu', 'erro_do_desinstalador', 'conferencia_indisponivel', 'aba_nao_fechou']);

function sanitizeEntry(e) {
  if (!e || typeof e !== 'object') return null;
  const em = typeof e.em === 'string' && !Number.isNaN(Date.parse(e.em)) ? e.em : null;
  const origem = e.origem === 'aba' ? 'aba' : e.origem === 'app' ? 'app' : null;
  if (!em || !origem || !ACOES.includes(e.acao)) return null;
  const alvo = origem === 'app' ? (variantById(e.alvo) ? e.alvo : null) : (Object.hasOwn(BROWSERS, e.alvo) ? e.alvo : null);
  if (!alvo) return null;
  const out = { em, origem, alvo, acao: e.acao };
  if (Number.isInteger(e.n) && e.n > 0 && e.n <= 50) out.n = e.n;
  if (ERROS.includes(e.erro)) out.erro = e.erro;
  return out;
}

export function sanitizeHistory(list) {
  return (Array.isArray(list) ? list : []).map(sanitizeEntry).filter(Boolean).slice(-HISTORY_MAX);
}

/** Histórico visível à usuária: data, hora, o que foi detectado e o que foi feito. */
export class DiscordHistory {
  constructor({ load = () => [], save = () => {} } = {}) {
    this.save = save;
    this.items = sanitizeHistory(load());
  }

  add(entry) {
    const e = sanitizeEntry(entry);
    if (!e) return null;
    this.items.push(e);
    if (this.items.length > HISTORY_MAX) this.items.splice(0, this.items.length - HISTORY_MAX);
    this.save(this.items.slice());
    return e;
  }

  /** Mais recentes primeiro. */
  list(limit = HISTORY_MAX) {
    return this.items.slice(-limit).reverse();
  }
}

const erroDe = (e) => (ERROS.includes(e) ? e : 'erro_do_desinstalador');

export class DiscordBlocker {
  /**
   * @param sys {running, installed, kill, uninstall} — acesso ao sistema (real ou simulado)
   * @param enabled () => boolean — a chave das configurações
   * @param history DiscordHistory
   * @param onScold async ({origem, alvos}) — primeira fala (bronca)
   * @param onResult async (resultado) — segunda fala (confirmação ou aviso de falha)
   */
  constructor({ sys, enabled, history, now = () => Date.now(), onScold = async () => {}, onResult = async () => {}, log = () => {}, retryMs = 30 * 60e3, installCheckMs = 5 * 60e3 }) {
    Object.assign(this, { sys, enabled, history, now, onScold, onResult, log, retryMs, installCheckMs });
    this.busy = false;
    this.failedAt = new Map();
    this.installedAt = -Infinity;
    this.installedCache = null;
  }

  _record(entry) {
    return this.history.add({ em: new Date(this.now()).toISOString(), ...entry });
  }

  /** Esquece o que sabia (a chave foi ligada ou desligada). */
  reset() {
    this.failedAt.clear();
    this.installedAt = -Infinity;
    this.installedCache = null;
  }

  /**
   * Uma conferência do aplicativo. Devolve null quando não havia nada a fazer
   * (inclusive com a chave desligada) ou o resultado da ação.
   */
  async check() {
    if (this.busy || !this.enabled()) return null;
    this.busy = true;
    try {
      let abertas;
      try { abertas = await this.sys.running(); } catch { return null; } // sem leitura confiável: não age
      const t = this.now();
      let instaladas = this.installedCache;
      if (abertas.length || !instaladas || t - this.installedAt >= this.installCheckMs) {
        try { instaladas = await this.sys.installed(); this.installedCache = instaladas; this.installedAt = t; } catch { instaladas = instaladas || []; }
      }
      const chave = (e) => `${e.hive}:${e.variante}`;
      const pendentes = instaladas.filter((e) => t - (this.failedAt.get(chave(e)) ?? -Infinity) >= this.retryMs);
      if (!abertas.length && !pendentes.length) return null;
      if (!this.enabled()) return null; // desligaram no meio: para aqui

      await this.onScold({ origem: 'app', alvos: [...new Set([...abertas, ...pendentes.map((e) => e.variante)])] });
      if (!this.enabled()) return null;

      const res = { origem: 'app', encerradas: [], desinstaladas: [], falhas: [] };
      const encerrar = async (lista) => {
        let k;
        try { k = await this.sys.kill(); } catch { k = { remaining: 1 }; }
        for (const v of lista) {
          if (k.remaining) { this._record({ origem: 'app', alvo: v, acao: 'falha_encerrar', erro: 'processo_resistiu' }); res.falhas.push({ alvo: v, acao: 'falha_encerrar', erro: 'processo_resistiu' }); }
          else { this._record({ origem: 'app', alvo: v, acao: 'encerrado' }); res.encerradas.push(v); }
        }
      };
      if (abertas.length) await encerrar(abertas);

      const tentativas = [];
      for (const e of pendentes) {
        const cmd = uninstallCommand(e);
        let r;
        if (!cmd) r = { ok: false, erro: 'desinstalador_desconhecido' };
        else { try { r = await this.sys.uninstall(cmd); } catch (err) { r = { ok: false, erro: erroDe(err && err.message) }; } }
        tentativas.push({ e, r });
      }
      if (tentativas.length) {
        // Só afirma que removeu depois de conferir de novo o registro do Windows.
        let depois = null;
        try { depois = await this.sys.installed(); this.installedCache = depois; this.installedAt = this.now(); } catch { /* sem conferência */ }
        for (const { e, r } of tentativas) {
          const ainda = depois ? depois.some((d) => chave(d) === chave(e)) : true;
          if (r && r.ok && !ainda) { this._record({ origem: 'app', alvo: e.variante, acao: 'desinstalado' }); res.desinstaladas.push(e.variante); this.failedAt.delete(chave(e)); continue; }
          const erro = r && r.ok ? (depois ? 'ainda_instalado' : 'conferencia_indisponivel') : erroDe(r && r.erro);
          this.failedAt.set(chave(e), this.now());
          this._record({ origem: 'app', alvo: e.variante, acao: 'falha_desinstalar', erro });
          res.falhas.push({ alvo: e.variante, acao: 'falha_desinstalar', erro });
          this.log('warn', `Desinstalação do Discord não concluiu (${erro}).`);
        }
        // Falhou: garante ao menos o processo encerrado.
        if (res.falhas.some((f) => f.acao === 'falha_desinstalar')) {
          let de_novo = [];
          try { de_novo = await this.sys.running(); } catch { /* sem leitura */ }
          if (de_novo.length) await encerrar(de_novo);
        }
      }
      await this.onResult(res);
      return res;
    } finally {
      this.busy = false;
    }
  }

  /** Aviso vindo da extensão do navegador. Devolve a resposta para ela. */
  async onBridge(msg) {
    if (!msg || !this.enabled()) return { t: 'desligado' };
    if (msg.t === 'abas') {
      // A bronca não segura o fechamento: a aba fecha enquanto ele fala.
      Promise.resolve().then(() => this.onScold({ origem: 'aba', alvos: [msg.nav], n: msg.n })).catch(() => {});
      return { t: 'fechar' };
    }
    if (msg.t === 'fechadas') {
      const res = { origem: 'aba', nav: msg.nav, fechadas: msg.n, falhas: msg.falhas };
      if (msg.n) this._record({ origem: 'aba', alvo: msg.nav, acao: 'aba_fechada', n: msg.n });
      if (msg.falhas) this._record({ origem: 'aba', alvo: msg.nav, acao: 'falha_aba', n: msg.falhas, erro: 'aba_nao_fechou' });
      await this.onResult(res);
      return { t: 'ok' };
    }
    return { t: 'desligado' };
  }
}

// ----------------------------------------------------------------- bronca

/** Pedido ao modelo local: uma bronca curta e diferente a cada vez. */
export function buildScoldPrompt({ origem, nome, ultima = '', angulo = '' }) {
  const onde = origem === 'aba' ? 'numa aba do navegador' : 'no computador';
  const acao = origem === 'aba' ? 'fechar só essa aba' : 'fechar o Discord e desinstalar o aplicativo';
  return [
    `SITUAÇÃO (não é uma mensagem dela): você acabou de ver o Discord aberto ${onde} da ${nome}. Você vai ${acao}.`,
    'Dê UMA bronca curta, de 1 ou 2 frases, até 140 caracteres, do seu jeito: mandão, humor seco, carinho discreto, puxando para estudo ou treino.',
    angulo ? `Desta vez, puxe para: ${angulo}.` : '',
    'A fala precisa citar o Discord. Não xingue ela, não ameace, não fale de outro assunto, não use emoji.',
    ultima ? `Não repita esta: "${ultima.slice(0, 140)}".` : '',
  ].filter(Boolean).join('\n');
}

/** Valida a bronca do modelo. Devolve o texto ou null (aí entra a fala do arquivo). */
export function acceptScold(text, { ultima = '' } = {}) {
  const t = String(text || '').replace(/\s+/g, ' ').trim().replace(/^["“”']+|["“”']+$/g, '');
  if (t.length < 12 || t.length > 180) return null;
  if (/https?:|www\.|[{}[\]<>]|\p{Extended_Pictographic}/u.test(t)) return null;
  if (!/discord/i.test(t)) return null; // precisa ser sobre o que aconteceu
  if (/\b(mat(o|ar|a)|morr|burra|idiota|imbecil|in[uú]til|gorda|feia|odeio voc[eê]|te odeio)\b/i.test(t)) return null;
  if (ultima && t.toLowerCase() === String(ultima).toLowerCase()) return null;
  return t;
}
