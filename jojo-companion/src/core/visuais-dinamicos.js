// Troca dinâmica de visuais: o JoJo escolhe sozinho, pelo contexto, qual visual
// AUTORIZADO usar agora. Lógica pura, orientada a eventos, sem LLM e sem sorteio.
//
// Três conceitos separados (nunca misturar):
// - nível do personagem (progressão) → libera visuais de nível;
// - direito de uso (compra na loja, guarda-roupa) → autoriza looks da loja;
// - aparência momentânea (este motor) → só escolhe ENTRE os autorizados e nunca grava
//   nada no visual salvo dela (visualNivel/guardaRoupa ficam intactos).
//
// Estabilidade: sinais de contexto decaem com o tempo; trocar exige vantagem clara
// (histerese), permanência mínima, intervalo entre trocas, proibição de voltar ao look
// anterior logo em seguida (sem pingue-pongue) e uma janela segura (sem animação,
// fala, arrasto, foco, trabalho ou tela cheia). Desligável e fixável pela usuária.

export const CONTEXTOS = Object.freeze([
  'ciencia', 'estudo', 'pesquisa', 'saude', 'cuidado', 'explicacao', 'programacao', 'trabalho', 'noite', 'reuniao', 'foco',
  'refeicao', 'cozinha', 'treino', 'timer', 'manha', 'conquista', 'provocacao', 'curiosidade', 'espaco', 'investigacao',
  'julgamento', 'procrastinacao', 'nivel', 'celebracao', 'jogo', 'lazer', 'musica', 'festa', 'sono', 'cansaco', 'descanso',
  'fimDeSemana', 'ocioso', 'calor', 'churrasco', 'cultura', 'erro', 'urgencia', 'humor', 'piada', 'discreto', 'descoberta',
  'anime', 'cinema', 'meme', 'praia', 'aventura', 'terror', 'tarde',
]);
const CTX = new Set(CONTEXTOS);

export const MOTOR_PADRAO = Object.freeze({
  meiaVidaMs: 15 * 60e3,     // um sinal perde metade do peso em 15 min
  permanenciaMs: 12 * 60e3,  // fica pelo menos 12 min num look escolhido
  intervaloMs: 4 * 60e3,     // nunca duas trocas em menos de 4 min
  reusoMs: 45 * 60e3,        // não volta a um look usado há menos de 45 min
  histerese: 0.35,           // o desafiante precisa ser 35% melhor que o atual
  limiar: 1.2,               // pontuação mínima para sair do look dela
  pendenteMs: 2 * 60e3,      // troca adiada espera no máximo 2 min pela janela segura
  sinalMax: 6,
});

const RE_CONTEXTO = [
  [/tubar|shark|mar\b|praia|surf|marinh|nemo|aquá|oceano/i, ['praia', 'lazer']],
  [/médic|doutor|cient|laborat|professor|nerd|óculos|einstein|sherlock|detetive/i, ['estudo', 'ciencia', 'investigacao']],
  [/natal|noel|carnaval|festa|disco|baile|party/i, ['festa', 'celebracao']],
  [/vampir|drácula|terror|zumbi|halloween|caveira|morte|fantasma/i, ['noite', 'terror']],
  [/chef|cozinh|comida|pizza|burger|sushi|churras|bolo/i, ['refeicao', 'cozinha']],
  [/treino|academia|boxe|luta|rocky|lutador|halter|fisicul|ninja|karat|samurai/i, ['treino']],
  [/rock|músic|guitarr|\bdj\b|cantor|banda|fone/i, ['musica']],
  [/\brei\b|coroa|campe|ouro|troféu|medalha|imperador|rainha/i, ['conquista', 'celebracao']],
  [/pirat|aventur|explor|indiana|safári/i, ['aventura', 'jogo']],
  [/espaç|astronaut|nasa|galáx|estrel|alien/i, ['espaco', 'curiosidade']],
  [/pijama|sono|dormir|travesseiro/i, ['noite', 'descanso']],
  [/hacker|matrix|código|program/i, ['programacao']],
];

const POR_TIPO = { jogo: ['jogo'], anime: ['anime', 'lazer'], filme: ['cinema', 'lazer'], serie: ['cinema', 'lazer'], meme: ['meme', 'humor', 'piada'], desenho: ['lazer', 'humor'] };
const POR_PARTE = { aura: ['celebracao', 'conquista'] };

/** Contextos de um visual de nível, inferidos da própria referência (tipo, obra, nome, parte). */
export function inferirContextos(p) {
  const out = new Set(POR_TIPO[p.tipo] || ['lazer']);
  for (const c of POR_PARTE[p.parte] || []) out.add(c);
  const txt = `${p.nome || ''} ${p.obra || ''} ${p.titulo || ''}`;
  for (const [re, cs] of RE_CONTEXTO) if (re.test(txt)) cs.forEach((c) => out.add(c));
  if (/^(sp|tw|br)/.test(p.id)) { out.add('humor'); out.add('piada'); }
  return [...out].filter((c) => CTX.has(c));
}

const RARIDADE_PESO = { acessivel: 0, comum: 0.02, incomum: 0.04, raro: 0.06, epico: 0.08, lendario: 0.1, extraordinario: 0.12 };

/**
 * Catálogo de visuais AUTORIZADOS agora, com metadados. Nunca inclui o que não está
 * liberado: visuais de nível só até o nível atual (lista já filtrada por quem chama),
 * looks da loja só se comprados.
 * @param {object} o
 * @param {Array} o.liberados peças de nível liberadas (visuaisLiberados)
 * @param {Array} o.lojaLooks itens de visual da loja comprados (do catálogo da loja)
 */
export function catalogarVisuais({ liberados = [], lojaLooks = [] } = {}) {
  const out = [];
  for (const p of liberados) {
    out.push({
      id: p.id, origem: 'nivel', parte: p.parte, nome: p.nome, colecao: p.colecao || 'niveis', nivel: p.nivel,
      contextos: inferirContextos(p), raridade: p.extra ? 'raro' : 'comum', prioridade: p.fantasia ? 1.1 : 1,
      inteiro: !!p.fantasia, incompat: p.fantasia ? ['*'] : [p.parte], horario: null,
    });
  }
  for (const it of lojaLooks) {
    const horario = (it.contextos || []).includes('noite') && /só à noite/i.test(it.desc || '') ? [19, 6] : null;
    out.push({
      id: it.efeito.look, item: it.id, origem: 'loja', parte: 'inteiro', nome: it.nome, colecao: 'loja',
      contextos: (it.contextos || []).filter((c) => CTX.has(c)), raridade: it.raridade, prioridade: 1.2, inteiro: true, incompat: ['*'], horario,
    });
  }
  return out;
}

const dentroHorario = (h, [ini, fim]) => (ini <= fim ? h >= ini && h < fim : h >= ini || h < fim);

export class MotorVisual {
  constructor({ now = () => Date.now(), hora = () => new Date().getHours(), opcoes = {}, estado = null } = {}) {
    this.now = now; this.hora = hora;
    this.o = { ...MOTOR_PADRAO, ...opcoes };
    this.sinais = new Map();       // contexto → { peso, at }
    this.atual = null;             // id do look momentâneo (null = o visual dela)
    this.desde = -Infinity;        // quando entrou no atual
    this.ultimaTroca = -Infinity;
    this.anterior = null;
    this.usos = {};                // id → { n, ultimo }
    this.pendente = null;          // { id, ate }
    this.destaque = null;          // { id, ate } look recém-comprado
    this.trocas = 0;
    if (estado) this.restaurar(estado);
  }

  /** Registra um sinal de contexto (soma com decaimento; teto para não dominar). */
  sinal(ctx, peso = 1) {
    if (!CTX.has(ctx) || !(peso > 0)) return;
    const atual = this.peso(ctx);
    this.sinais.set(ctx, { peso: Math.min(this.o.sinalMax, atual + peso), at: this.now() });
  }

  /** Peso atual de um contexto (decaimento exponencial). */
  peso(ctx, agora = this.now()) {
    const s = this.sinais.get(ctx);
    if (!s) return 0;
    const p = s.peso * 0.5 ** ((agora - s.at) / this.o.meiaVidaMs);
    if (p < 0.02) { this.sinais.delete(ctx); return 0; }
    return p;
  }

  /** Look comprado agora: prioridade temporária (sem forçar troca fora da janela segura). */
  destacar(id, ms = 30 * 60e3) { this.destaque = { id, ate: this.now() + ms }; this.sinal('celebracao', 1.5); }

  /** Pontuação de um candidato agora. */
  pontuar(c, agora = this.now()) {
    if (c.horario && !dentroHorario(this.hora(), c.horario)) return -Infinity;
    let s = 0;
    for (const ctx of c.contextos) s += this.peso(ctx, agora);
    if (s <= 0 && !(this.destaque && this.destaque.id === c.id && this.destaque.ate > agora)) return 0;
    s *= c.prioridade || 1;
    s += RARIDADE_PESO[c.raridade] || 0;
    if (this.destaque && this.destaque.id === c.id && this.destaque.ate > agora) s += 2;
    // Variedade sem sorteio: quem foi muito usado perde um pouco.
    const u = this.usos[c.id];
    if (u) s -= Math.min(0.5, u.n * 0.03);
    return s;
  }

  /**
   * Decide a aparência agora.
   * @param {object} o
   * @param {Array} o.candidatos catálogo autorizado (catalogarVisuais)
   * @param {boolean} o.seguro janela segura para trocar
   * @param {boolean} [o.auto=true] troca automática ligada
   * @param {string|null} [o.fixo] look fixado pela usuária (id) — vence tudo se autorizado
   * @returns {{id: string|null, trocou: boolean, motivo: string}}
   */
  decidir({ candidatos = [], seguro = true, auto = true, fixo = null } = {}) {
    const agora = this.now();
    const ids = new Set(candidatos.map((c) => c.id));
    // Look atual deixou de ser autorizado (nível, compra desfeita, horário): volta já para o dela.
    if (this.atual && !ids.has(this.atual)) return this._trocar(null, agora, 'desautorizado');
    if (fixo) return ids.has(fixo) ? (this.atual === fixo ? this._fica('fixo') : this._trocar(fixo, agora, 'fixo')) : (this.atual ? this._trocar(null, agora, 'fixoInvalido') : this._fica('fixoInvalido'));
    if (!auto) return this.atual ? this._trocar(null, agora, 'desligado') : this._fica('desligado');

    const atualC = candidatos.find((c) => c.id === this.atual);
    if (atualC && atualC.horario && !dentroHorario(this.hora(), atualC.horario)) return seguro ? this._trocar(null, agora, 'horario') : this._fica('aguardando');
    let melhor = null, melhorS = 0;
    for (const c of candidatos) {
      if (c.id === this.atual) continue;
      if (c.id === this.anterior && agora - this.ultimaTroca < this.o.reusoMs) continue; // sem pingue-pongue
      const u = this.usos[c.id];
      if (u && agora - u.ultimo < this.o.reusoMs && c.id !== this.destaque?.id) continue;
      const s = this.pontuar(c, agora);
      if (s > melhorS || (s === melhorS && melhor && (this.usos[c.id]?.ultimo || 0) < (this.usos[melhor.id]?.ultimo || 0))) { melhor = c; melhorS = s; }
    }
    const atualS = atualC ? this.pontuar(atualC, agora) : this.o.limiar;
    // Sem contexto que sustente o look momentâneo: depois da permanência mínima, volta para o dela.
    if (atualC && atualS < this.o.limiar * 0.5 && (!melhor || melhorS < this.o.limiar) && agora - this.desde >= this.o.permanenciaMs) {
      return seguro ? this._trocar(null, agora, 'semContexto') : this._adiar(null, agora);
    }
    if (!melhor || melhorS < this.o.limiar || melhorS < atualS * (1 + this.o.histerese)) return this._fica('estavel');
    if (agora - this.ultimaTroca < this.o.intervaloMs) return this._fica('intervalo');
    if (this.atual && agora - this.desde < this.o.permanenciaMs) return this._fica('permanencia');
    if (!seguro) return this._adiar(melhor.id, agora);
    return this._trocar(melhor.id, agora, 'contexto');
  }

  _fica(motivo) { return { id: this.atual, trocou: false, motivo }; }

  _adiar(id, agora) {
    if (!this.pendente || this.pendente.id !== id) this.pendente = { id, ate: agora + this.o.pendenteMs };
    else if (agora > this.pendente.ate) this.pendente = null; // contexto passou: desiste sem trocar
    return { id: this.atual, trocou: false, motivo: 'aguardando' };
  }

  _trocar(id, agora, motivo) {
    this.pendente = null;
    if (id === this.atual) return this._fica(motivo);
    this.anterior = this.atual; this.atual = id; this.desde = agora; this.ultimaTroca = agora; this.trocas += 1;
    if (id) { const u = this.usos[id] ||= { n: 0, ultimo: 0 }; u.n += 1; u.ultimo = agora; }
    return { id, trocou: true, motivo };
  }

  /** Estado pequeno para persistir (histórico de uso); sinais são momentâneos e não salvam. */
  salvar() {
    const usos = Object.entries(this.usos).sort((a, b) => b[1].ultimo - a[1].ultimo).slice(0, 200);
    return { usos: Object.fromEntries(usos) };
  }

  restaurar(e) {
    if (!e || typeof e !== 'object' || !e.usos || typeof e.usos !== 'object') return;
    for (const [id, u] of Object.entries(e.usos)) {
      if (typeof id === 'string' && id.length < 40 && u && Number.isFinite(u.n) && Number.isFinite(u.ultimo)) this.usos[id] = { n: Math.max(0, Math.floor(u.n)), ultimo: u.ultimo };
    }
  }
}

// ------------------------------------------------------------------ sinais a partir de eventos reais

const RE_CHAT = [
  [/\b(estud|prova|faculdade|aula|tcc|artigo|matéria|materia)/i, ['estudo']],
  [/\b(ciênci|ciencia|física|fisica|química|quimica|biolog|pesquis)/i, ['ciencia', 'pesquisa']],
  [/\b(treino|academia|malhar|supino|agachamento|corrida)/i, ['treino']],
  [/\b(comer|almoç|almoc|jantar|lanche|café da manhã|fome|comida|receita|cozinh)/i, ['refeicao', 'cozinha']],
  [/\b(churrasco)/i, ['churrasco', 'refeicao']],
  [/\b(jogo|jogar|game|partida|zerar)/i, ['jogo']],
  [/\b(anime|mangá|manga|episódio|episodio)/i, ['anime']],
  [/\b(filme|série|serie|cinema|netflix)/i, ['cinema', 'lazer']],
  [/\b(música|musica|cantar|show|playlist)/i, ['musica']],
  [/\b(festa|aniversário|aniversario|comemora|parabéns|parabens)/i, ['festa', 'celebracao']],
  [/\b(reunião|reuniao|call|chefe|trabalho|planilha|relatório|relatorio)/i, ['trabalho', 'reuniao']],
  [/\b(código|codigo|programa|bug|deploy|javascript|python)/i, ['programacao']],
  [/\b(praia|piscina|calor|sol)\b/i, ['praia', 'calor']],
  [/\b(cansad|exaust|sono|dormir)/i, ['cansaco', 'descanso']],
  [/\b(médico|medico|saúde|saude|remédio|remedio|dor)\b/i, ['saude', 'cuidado']],
  [/\b(espaço|espaco|planeta|estrela|nasa|galáxia|galaxia)/i, ['espaco', 'curiosidade']],
  [/\b(kkk|haha|piada|meme|zoeira)/i, ['humor', 'piada']],
];

/** Contextos sugeridos por uma mensagem (só palavras; nada sai do PC). */
export function contextosDoTexto(texto) {
  const t = String(texto || '').slice(0, 400);
  const out = new Set();
  for (const [re, cs] of RE_CHAT) if (re.test(t)) cs.forEach((c) => out.add(c));
  return [...out];
}

const POR_CATEGORIA_APP = { jogo: ['jogo'], video: ['cinema', 'lazer'], escritorio: ['trabalho'], codigo: ['programacao', 'trabalho'], dev: ['programacao'], musica: ['musica'], estudo: ['estudo'], design: ['cultura'], chat: ['lazer'] };
export const contextosDoApp = (cat) => POR_CATEGORIA_APP[cat] || [];

const POR_VIRAL = { jogo: ['jogo'], derrota: ['jogo', 'erro'], vitoria: ['conquista', 'celebracao'], conquista: ['conquista', 'celebracao'], ocioso: ['ocioso', 'descanso'], instagram: ['provocacao', 'procrastinacao'], procrastinacao: ['procrastinacao', 'provocacao'], tarefa: ['trabalho'], refeicao: ['refeicao'], erro: ['erro', 'urgencia'], fimTrabalho: ['descanso', 'lazer'], lazer: ['lazer'] };
export const contextosDoEvento = (ev) => POR_VIRAL[ev] || [];

/** Contextos do relógio (manhã/tarde/noite, fim de semana). */
export function contextosDoHorario(d = new Date()) {
  const h = d.getHours(), out = [];
  if (h >= 6 && h < 12) out.push('manha'); else if (h >= 12 && h < 18) out.push('tarde'); else out.push('noite');
  if (d.getDay() === 0 || d.getDay() === 6) out.push('fimDeSemana');
  return out;
}
