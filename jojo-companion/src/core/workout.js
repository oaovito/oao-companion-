// Apoio ao treino: guarda as fichas (A, B, C…), registra as cargas e diz qual
// é o treino do dia (a ficha seguinte à última feita). Puro: estado salvo é
// injetado. Só organiza o que ela informou: não prescreve treino nem carga.

export const WORKOUT_LIMITS = Object.freeze({ fichas: 8, exercicios: 15, nome: 40, historico: 600, cargaMax: 999 });
const DIA = /^\d{4}-\d{2}-\d{2}$/;

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => semAcento(s).replace(/[^a-z0-9.,\s]/g, ' ').replace(/\s+/g, ' ').trim();
const chave = (s) => semAcento(s).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const limpa = (s, max) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const numero = (s) => Number(String(s).replace(',', '.'));
const fmt = (n) => String(Math.round(n * 100) / 100).replace('.', ',');

/** "supino 4x10 40kg" → {nome, series, reps, carga}. Nome obrigatório; o resto é opcional. */
export function parseExercise(text) {
  let t = limpa(text, 120);
  if (!t) return null;
  let series = null, reps = null, carga = null;
  let m = t.match(/(\d{1,2})\s*x\s*(\d{1,3})/i);
  if (m) { series = Number(m[1]); reps = Number(m[2]); t = t.replace(m[0], ' '); }
  m = t.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*kg\b/i) || t.match(/\bcom\s+(\d{1,3}(?:[.,]\d{1,2})?)\b/i);
  if (m) { carga = numero(m[1]); t = t.replace(m[0], ' '); }
  const nome = limpa(t.replace(/\b(com|de|x)\s*$/i, '').replace(/[-–:]+\s*$/, ''), WORKOUT_LIMITS.nome);
  if (nome.length < 2 || !/[a-zà-ú]/i.test(nome)) return null;
  if (carga != null && !(carga >= 0 && carga <= WORKOUT_LIMITS.cargaMax)) carga = null;
  return { nome, series, reps, carga };
}

/** Lista de exercícios separada por ponto e vírgula, quebra de linha ou vírgula seguida de nome. */
export function parseExerciseList(text) {
  return String(text || '').split(/;|\n|,(?=\s*[a-zà-ú])/i).map(parseExercise).filter(Boolean).slice(0, WORKOUT_LIMITS.exercicios);
}

export function sanitizeWorkout(input) {
  const src = input && typeof input === 'object' ? input : {};
  const fichas = {};
  for (const [id, lista] of Object.entries(src.fichas && typeof src.fichas === 'object' ? src.fichas : {})) {
    if (!/^[A-H]$/.test(id) || !Array.isArray(lista) || Object.keys(fichas).length >= WORKOUT_LIMITS.fichas) continue;
    const exs = [];
    for (const e of lista) {
      const nome = e && typeof e.nome === 'string' ? limpa(e.nome, WORKOUT_LIMITS.nome) : '';
      if (!nome || exs.length >= WORKOUT_LIMITS.exercicios) continue;
      const int = (v, max) => (Number.isInteger(v) && v > 0 && v <= max ? v : null);
      exs.push({ nome, series: int(e.series, 20), reps: int(e.reps, 200), carga: Number.isFinite(e.carga) && e.carga >= 0 && e.carga <= WORKOUT_LIMITS.cargaMax ? e.carga : null });
    }
    if (exs.length) fichas[id] = exs;
  }
  const historico = [];
  for (const h of Array.isArray(src.historico) ? src.historico : []) {
    if (!h || !DIA.test(h.dia || '') || typeof h.exercicio !== 'string' || !Number.isFinite(h.carga)) continue;
    historico.push({ dia: h.dia, exercicio: limpa(h.exercicio, WORKOUT_LIMITS.nome), carga: h.carga });
  }
  const ultimo = src.ultimo && DIA.test(src.ultimo.dia || '') && fichas[src.ultimo.ficha] ? { dia: src.ultimo.dia, ficha: src.ultimo.ficha } : null;
  return { fichas, historico: historico.slice(-WORKOUT_LIMITS.historico), ultimo };
}

/** Pedido de treino em linguagem natural. Devolve a ação ou null. */
export function parseWorkoutRequest(text, { exercicios = [] } = {}) {
  const original = String(text || '').replace(/^\s*jojo[,!:]?\s*/i, '').trim().replace(/[.!]+$/, '');
  const n = norm(original);
  if (!n || original.length > 400) return null;
  let m = original.match(/^(?:minha\s+|a\s+)?ficha\s+([a-h])\s*(?:[ée]|:|=|-)\s*:?\s*(.+)$/i);
  if (m) return { tipo: 'ficha', ficha: m[1].toUpperCase(), exercicios: parseExerciseList(m[2]) };
  if (/^(qual (e |eh )?(o |meu )?treino (de |do dia de )?hoje|treino de hoje|o que (eu )?treino hoje|qual (a )?ficha de hoje|minhas? fichas?( de treino)?|ver (a |minha )?ficha)\??$/.test(n)) return { tipo: 'hoje' };
  m = n.match(/^(?:historico|evolucao|progresso) (?:de |do |da )?(?:carga (?:de |do |da )?)?(.+)$/);
  if (m) return { tipo: 'historico', exercicio: m[1] };
  // Carga: "fiz supino com 45kg", "registra agachamento 62,5 kg", ou "<exercício da ficha> 45kg".
  m = original.match(/^(?:fiz|fiz o|fiz a|registra|registre|anota|anote|marca|marque)\s+(?:a\s+carga\s+(?:de|do|da)\s+)?(.+?)\s+(?:com\s+|de\s+|=\s*)?(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:kg|quilos?)\b/i);
  if (m) return { tipo: 'carga', exercicio: limpa(m[1].replace(/^(o|a)\s+/i, ''), WORKOUT_LIMITS.nome), carga: numero(m[2]) };
  m = original.match(/^(.+?)\s+(?:com\s+)?(\d{1,3}(?:[.,]\d{1,2})?)\s*kg$/i);
  if (m && exercicios.some((e) => chave(e) === chave(m[1]))) return { tipo: 'carga', exercicio: limpa(m[1], WORKOUT_LIMITS.nome), carga: numero(m[2]) };
  return null;
}

/** Comando "/treino …". */
export function parseWorkoutCommand(arg) {
  const original = String(arg || '').trim();
  const n = norm(original);
  if (!n || /^(hoje|ver|ficha|fichas)$/.test(n)) return { tipo: 'hoje' };
  let m = original.match(/^ficha\s+([a-h])\s*:?\s*(.*)$/i);
  if (m) return m[2].trim() ? { tipo: 'ficha', ficha: m[1].toUpperCase(), exercicios: parseExerciseList(m[2]) } : { tipo: 'verFicha', ficha: m[1].toUpperCase() };
  m = original.match(/^(?:apagar|remover|excluir)\s+(?:ficha\s+)?([a-h])$/i);
  if (m) return { tipo: 'apagar', ficha: m[1].toUpperCase() };
  m = original.match(/^carga\s+(.+?)\s+(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:kg)?$/i);
  if (m) return { tipo: 'carga', exercicio: limpa(m[1], WORKOUT_LIMITS.nome), carga: numero(m[2]) };
  m = original.match(/^(?:historico|hist[oó]rico|evolu[cç][aã]o)\s+(.+)$/i);
  if (m) return { tipo: 'historico', exercicio: m[1].trim() };
  if (/^(feito|fiz|ok|concluido)$/.test(n)) return { tipo: 'feito' };
  return { tipo: 'ajuda' };
}

export class Workout {
  /** @param habits acompanhamento de hábitos (treino feito conta lá) */
  constructor({ state = null, save = () => {}, habits = null } = {}) {
    this.st = sanitizeWorkout(state);
    this.save = save;
    this.habits = habits;
  }

  get ids() {
    return Object.keys(this.st.fichas).sort();
  }

  /** Nomes de todos os exercícios das fichas (para reconhecer "supino 45kg"). */
  get exercicios() {
    return this.ids.flatMap((id) => this.st.fichas[id].map((e) => e.nome));
  }

  /** Ficha do dia: a de hoje se ela já treinou hoje; senão a seguinte à última feita. */
  doDia(day) {
    const ids = this.ids;
    if (!ids.length) return null;
    const u = this.st.ultimo;
    if (!u || !ids.includes(u.ficha)) return { ficha: ids[0], feito: false };
    if (u.dia === day) return { ficha: u.ficha, feito: true };
    return { ficha: ids[(ids.indexOf(u.ficha) + 1) % ids.length], feito: false };
  }

  _linhas(id) {
    return this.st.fichas[id].map((e) => `${e.nome}${e.series ? ` ${e.series}x${e.reps}` : ''}${e.carga != null ? ` · ${fmt(e.carga)} kg` : ''}`);
  }

  _achar(nome) {
    const k = chave(nome);
    for (const id of this.ids) {
      const e = this.st.fichas[id].find((x) => chave(x.nome) === k) || (k.length >= 3 ? this.st.fichas[id].find((x) => chave(x.nome).includes(k)) : null);
      if (e) return e;
    }
    return null;
  }

  /** Aplica a ação. Devolve {fala, vars, itens?}. */
  apply(a, day) {
    if (!a) return null;
    if (a.tipo === 'ficha') {
      if (!a.exercicios || !a.exercicios.length) return { fala: 'treinoFichaVazia', vars: { ficha: a.ficha } };
      if (!this.st.fichas[a.ficha] && this.ids.length >= WORKOUT_LIMITS.fichas) return { fala: 'treinoLimite', vars: { total: WORKOUT_LIMITS.fichas } };
      this.st.fichas[a.ficha] = a.exercicios;
      this.save(this.st);
      return { fala: 'treinoFichaSalva', vars: { ficha: a.ficha, total: a.exercicios.length }, itens: this._linhas(a.ficha) };
    }
    if (a.tipo === 'verFicha') {
      if (!this.st.fichas[a.ficha]) return { fala: 'treinoSemFicha', vars: { ficha: a.ficha } };
      return { fala: 'treinoFicha', vars: { ficha: a.ficha }, itens: this._linhas(a.ficha) };
    }
    if (a.tipo === 'hoje') {
      const d = this.doDia(day);
      if (!d) return { fala: 'treinoVazio', vars: {} };
      return { fala: d.feito ? 'treinoHojeFeito' : 'treinoHoje', vars: { ficha: d.ficha }, itens: this._linhas(d.ficha) };
    }
    if (a.tipo === 'apagar') {
      if (!this.st.fichas[a.ficha]) return { fala: 'treinoSemFicha', vars: { ficha: a.ficha } };
      delete this.st.fichas[a.ficha];
      if (this.st.ultimo && this.st.ultimo.ficha === a.ficha) this.st.ultimo = null;
      this.save(this.st);
      return { fala: 'treinoFichaApagada', vars: { ficha: a.ficha } };
    }
    if (a.tipo === 'carga') {
      if (!(a.carga >= 0 && a.carga <= WORKOUT_LIMITS.cargaMax)) return { fala: 'treinoAjuda', vars: {} };
      const e = this._achar(a.exercicio);
      const nome = e ? e.nome : a.exercicio;
      const anteriores = this.st.historico.filter((h) => chave(h.exercicio) === chave(nome));
      const recorde = anteriores.length ? Math.max(...anteriores.map((h) => h.carga)) : null;
      const ultima = anteriores.length ? anteriores[anteriores.length - 1].carga : e && e.carga != null ? e.carga : null;
      this.st.historico = [...this.st.historico, { dia: day, exercicio: nome, carga: a.carga }].slice(-WORKOUT_LIMITS.historico);
      if (e) e.carga = a.carga;
      this.save(this.st);
      const vars = { exercicio: nome, carga: fmt(a.carga), antes: ultima != null ? fmt(ultima) : '' };
      if (recorde != null && a.carga > recorde) return { fala: 'treinoCargaRecorde', vars };
      if (ultima != null && a.carga < ultima) return { fala: 'treinoCargaMenor', vars };
      return { fala: ultima == null ? 'treinoCargaPrimeira' : 'treinoCarga', vars };
    }
    if (a.tipo === 'historico') {
      const e = this._achar(a.exercicio);
      const k = chave(e ? e.nome : a.exercicio);
      const lista = this.st.historico.filter((h) => chave(h.exercicio) === k).slice(-6);
      if (!lista.length) return { fala: 'treinoSemHistorico', vars: { exercicio: e ? e.nome : a.exercicio } };
      return { fala: 'treinoHistorico', vars: { exercicio: lista[0].exercicio }, itens: lista.map((h) => `${h.dia.slice(8, 10)}/${h.dia.slice(5, 7)}: ${fmt(h.carga)} kg`) };
    }
    if (a.tipo === 'feito') {
      const d = this.doDia(day);
      if (!d) return { fala: 'treinoVazio', vars: {} };
      this.st.ultimo = { dia: day, ficha: d.ficha };
      this.save(this.st);
      const dias = this.habits ? this.habits.log('treino', day).dias : 1;
      return { fala: 'treinoFeito', vars: { ficha: d.ficha, dias } };
    }
    return { fala: 'treinoAjuda', vars: {} };
  }
}
