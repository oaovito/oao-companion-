// Desbloqueios na tela (pedido do João, 27/11/2026: "quando algo é desbloqueável deve ser
// desbloqueado mostrando na tela a animação com as falas"). Instalado no protótipo do Companion.
//
// Todo desbloqueio (visual de nível, título de nível, conquista, acessório e minijogo do nível,
// aparência de timer, habilidade/região/especialização e segredo do RPG, conquista de anime,
// item comprado na loja) passa por `celebrarDesbloqueio`: o JoJo toca a animação daquilo (ou a
// cerimônia própria `cat_desbloqueio`), o carimbo DESBLOQUEADO bate na tela com o nome numa
// etiqueta (desenhado pelo overlay, renderer/shared/palavras-desenho.js) e ele fala a frase.
// Se agora não dá (Modo Trabalho, foco, tela cheia, escondido, outra fala), guarda e mostra depois:
// nada liberado passa batido.

export const DESBLOQUEIO_MS = 5200;
const FILA_MAX = 12;
const NOME_MAX = 48;

/** Cerimônia própria (5,2 s): agacha, pula com os braços abertos, apresenta e aponta o carimbo. */
export const ITEM_DESBLOQUEIO = Object.freeze({
  id: 'desbloqueio', nome: 'Cerimônia de desbloqueio', categoria: 'eventos', listas: {}, gatilho: { eventos: ['desbloqueio'] }, frequencia: 'rara', duracao: DESBLOQUEIO_MS, entrada: 160,
  receita: { rosto: 'sorrisao', fx: ['brilho'] },
  faixas: {
    squashY: [[0, 1], [0.06, 0.86], [0.12, 1.1], [0.18, 0.97], [0.22, 1], [0.88, 1], [0.92, 1.04], [1, 1]],
    rootY: [[0, 0], [0.06, 4], [0.13, -26], [0.2, 0], [0.24, -4], [0.27, 0], [1, 0]],
    legFL: [[0, 0], [0.06, -10], [0.14, 150], [0.3, 150], [0.4, 60], [0.62, 60], [0.7, 20], [0.84, 20], [1, 0]],
    legFR: [[0, 0], [0.06, -10], [0.14, 150], [0.3, 150], [0.4, 100], [0.62, 100], [0.7, 82], [0.84, 82], [1, 0]],
    elbowL: [[0, 0], [0.3, 0], [0.4, 40], [0.62, 40], [0.7, 130], [0.84, 130], [1, 0]],
    elbowR: [[0, 0], [0.3, 0], [0.4, 30], [0.62, 30], [0.7, -6], [0.84, -6], [1, 0]],
    legBL: [[0, 0], [0.12, 18], [0.2, 0], [1, 0]],
    legBR: [[0, 0], [0.12, -12], [0.2, 0], [1, 0]],
    headRot: [[0, 0], [0.3, -6], [0.4, 0], [0.5, 8], [0.6, -8], [0.7, 6], [0.84, 6], [1, 0]],
    happyEyes: [[0, 0], [0.12, 1, 'step'], [0.9, 1], [1, 0, 'step']],
    jaw: [[0, 0.3], [0.13, 1], [0.3, 0.8], [0.45, 0.5], [0.7, 0.9], [0.9, 0.4], [1, 0.3]],
  },
});

const limpo = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, NOME_MAX);

export function instalarDesbloqueio(Companion) {
  const P = Companion.prototype;

  /** Dá para mostrar agora? (mesmas regras de fala e animação). */
  P._podeDesbloqueio = function () {
    return this.started && !this.quitting && !this.userHidden && !this.ghost && !this.lolHidden && !this.work && !this.focus && !this.game && !this.fullscreenHidden && !this.fullscreenIds?.length;
  };

  /**
   * Mostra um desbloqueio: animação + carimbo com o nome + fala. `anim` é o id do catálogo da
   * animação daquilo que foi liberado (ou a cerimônia própria). Devolve true se mostrou agora.
   */
  P.celebrarDesbloqueio = function ({ nome, fala = null, anim = null, soCarimbo = false } = {}) {
    const n = limpo(nome);
    if (!n) return false;
    const guardar = () => {
      this._desbloqueiosPendentes = [...(this._desbloqueiosPendentes || []), { nome: n, fala, anim, soCarimbo }].slice(-FILA_MAX);
      this._agendarDesbloqueio(3000);
      return false;
    };
    if (!this._podeDesbloqueio() || (this.desbloqueio && this.clock.now() < this.desbloqueio.ate)) return guardar();
    // Só o carimbo: a animação daquilo já está tocando (show do visual, nível, conquista, compra).
    if (!soCarimbo) {
      const tocou = (anim && this.catalogById?.has(anim) && this.playCatalog(anim, { source: 'evento', speak: false })) || this.playCatalog('desbloqueio', { source: 'evento', speak: false });
      if (!tocou) return guardar();
    }
    const agora = this.clock.now();
    this.desbloqueio = { nome: n, desde: Date.now(), dur: DESBLOQUEIO_MS, ate: agora + DESBLOQUEIO_MS };
    if (fala) this.say(fala, 'speech');
    this.clock.setTimeout(() => { if (this.desbloqueio && this.clock.now() >= this.desbloqueio.ate) { this.desbloqueio = null; this._applyLayout?.(true); } this._agendarDesbloqueio(400); }, DESBLOQUEIO_MS + 50);
    this._applyLayout?.(true);
    return true;
  };

  P._agendarDesbloqueio = function (ms) {
    if (this._desbloqueioTimer || !(this._desbloqueiosPendentes || []).length) return;
    this._desbloqueioTimer = this.clock.setTimeout(() => { this._desbloqueioTimer = null; this._mostrarPendente(); }, ms);
  };

  /** Mostra o próximo desbloqueio guardado (chamado também a cada minuto da rotina). */
  P._mostrarPendente = function () {
    const fila = this._desbloqueiosPendentes || [];
    if (!fila.length) return false;
    if (this.desbloqueio && this.clock.now() < this.desbloqueio.ate) { this._agendarDesbloqueio(1000); return false; }
    if (!this._podeDesbloqueio() || (this.bubble && !fila[0].soCarimbo)) { this._agendarDesbloqueio(5000); return false; }
    const [prox, ...resto] = fila;
    this._desbloqueiosPendentes = resto;
    return this.celebrarDesbloqueio(prox);
  };

  /** Carimbo DESBLOQUEADO + nome por cima da animação que já está tocando (fila se ocupado). */
  P._carimbo = function (nome, fala = null) {
    return this.celebrarDesbloqueio({ nome, fala, soCarimbo: true });
  };

  /** O que um progresso liberou: título do nível, acessórios e minijogos desses níveis, conquistas. */
  P._liberadosNoProgresso = function (lvl, novas = []) {
    const out = [];
    if (lvl?.nivel) {
      const de = Math.min(lvl.nivel - 1, this._nivelCarimbado ?? lvl.nivel - 1);
      this._nivelCarimbado = lvl.nivel;
      out.push(`Nível ${lvl.nivel}: ${lvl.nome}`);
      const entre = (x) => Number.isInteger(x?.nivel) && x.nivel > de && x.nivel <= lvl.nivel;
      for (const a of this.progress?.data?.acessorios || []) if (entre(a)) out.push(`Acessório: ${a.nome}`);
      for (const j of this.games?.data?.jogos || []) if (entre(j)) out.push(`Minijogo: ${j.nome}`);
    }
    for (const q of novas || []) if (q?.nome) out.push(`Conquista: ${q.nome}`);
    return out;
  };

  /** Estado do carimbo para o overlay (null quando não há). */
  P._estadoDesbloqueio = function () {
    const d = this.desbloqueio;
    if (!d || this.clock.now() >= d.ate) return null;
    return { nome: d.nome, desde: d.desde, dur: d.dur };
  };
}
