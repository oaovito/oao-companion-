// Motor de variedade (antitédio): escolhe a próxima animação ambiente e a
// próxima fala ambiente sem repetir, com pesos que mudam com o tempo, o humor
// do momento, o período do dia, a temporada da semana e o que ela mais curte.
// Puro: relógio, sorteio e o estado salvo são injetados.

export const PERIODS = Object.freeze({ manha: [6, 12], tarde: [12, 18], noite: [18, 24], madrugada: [0, 6] });

export function periodOf(date) {
  const h = date.getHours();
  for (const [k, [a, b]] of Object.entries(PERIODS)) if (h >= a && h < b) return k;
  return 'noite';
}

// Estados de energia/humor: duram um tempo e mudam o repertório.
export const ENERGIES = ['hiperfoco', 'pilhado', 'zen', 'faminto', 'sonolento', 'convencido', 'curioso', 'carente', 'competitivo', 'caotico'];
const CALM = new Set(['hiperfoco', 'zen', 'sonolento', 'convencido', 'curioso']);
const PERIOD_ENERGY = {
  manha: { pilhado: 2, hiperfoco: 2, convencido: 1.5 },
  tarde: { faminto: 2, sonolento: 1.5, hiperfoco: 1.5 },
  noite: { zen: 2, sonolento: 1.5, carente: 1.3 },
  madrugada: { sonolento: 2.5, zen: 1.5 },
};

// Temporadas semanais: um tema por semana que puxa certas categorias e falas.
export const SEASONS = [
  { id: 'treino', nome: 'Temporada do treino', categorias: ['vaidade'], falas: ['treino'] },
  { id: 'estudo', nome: 'Temporada do estudo', categorias: ['atencao'], falas: ['estudo'] },
  { id: 'descaro', nome: 'Temporada do descaro', categorias: ['descarado', 'corpo'], falas: ['descaro'] },
  { id: 'praia', nome: 'Temporada da praia', categorias: ['base', 'presenca', 'acoes'], falas: ['filosofia'] },
  { id: 'caverna', nome: 'Temporada da caverna', categorias: ['travessuras', 'preguica'], falas: ['especiais'] },
  { id: 'gamer', nome: 'Temporada do aquário gamer', categorias: ['provocacao', 'positivas'], falas: ['motivacao'] },
  { id: 'comilanca', nome: 'Temporada da comilança', categorias: ['comida'], falas: ['fome'] },
];

export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - y0) / 86400000 + 1) / 7);
}

export function seasonOf(date) {
  return SEASONS[(date.getFullYear() * 53 + isoWeek(date)) % SEASONS.length];
}

// Animações "pesadas" (muito movimento ou efeito forte): somem com "sem animações pesadas".
const HEAVY_BODY = new Set(['gira', 'rola', 'pula', 'jogado', 'dancaSemRitmo', 'treme', 'desmaia', 'teleporte', 'evolui', 'circula', 'danca', 'viral', 'dorsalCruza', 'sobeDaBorda']);
const HEAVY_FX = new Set(['confete', 'aura', 'auraFera', 'vento', 'chuva', 'lagrimas', 'velocidade', 'neve']);
export function isHeavy(it) {
  const r = it && it.receita;
  if (!r) return false;
  return [].concat(r.corpo || []).some((c) => HEAVY_BODY.has(c)) || [].concat(r.fx || []).some((f) => HEAVY_FX.has(f));
}

// Animações em que ele dorme/cochila: proibidas entre 6h e 21h (regra de vigília).
export const SLEEP_ANIMS = new Set(['cochilar', 'dormirProfundo', 'fingirDormir', 'cochilarBoiando', 'dormirRonco', 'acordarAssustado']);

export const FREQ_DEFAULT = Object.freeze({ comum: 10, rara: 2.5, easter: 0.35 });
const MEMORY = 30;

export function emptyVarietyState() {
  return { recent: [], lastSeen: {}, likes: {}, ignored: {}, energy: null, boredom: 0, day: null, seenToday: [], lines: [], lineSeen: {}, season: null };
}

export class VarietyEngine {
  /**
   * @param catalog {itens, frequencias}
   * @param lines {falas: [{t, cat, freq, horario?, anims?}]}
   * @param state estado salvo (memória, preferências) — mutado e devolvido por save()
   * @param save (state) => void
   * @param getPrefs () => {modo: 'auto'|'calmo'|'pilhado', surpresas: bool, frequencias?}
   */
  constructor({ catalog, lines = { falas: [] }, state = null, save = () => {}, rng = Math.random, now = () => Date.now(), getPrefs = () => ({}) }) {
    this.catalog = catalog;
    this.lines = lines.falas || [];
    this.state = { ...emptyVarietyState(), ...(state || {}) };
    this.save = save;
    this.rng = rng;
    this.now = now;
    this.getPrefs = getPrefs;
    this.byId = new Map(catalog.itens.map((it) => [it.id, it]));
  }

  get ambientItems() {
    return this.catalog.itens.filter((it) => it.gatilho && it.gatilho.ambiente);
  }

  _freq() {
    return { ...FREQ_DEFAULT, ...(this.catalog.frequencias || {}), ...(this.getPrefs().frequencias || {}) };
  }

  _dayRollover(date) {
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    if (this.state.day !== key) {
      this.state.day = key;
      this.state.seenToday = [];
    }
  }

  /** Estado de energia atual (muda a cada 15–40 min, puxado pelo período do dia e pelo modo escolhido). */
  energy(date = new Date()) {
    const t = this.now();
    const e = this.state.energy;
    if (e && t < e.until) return e.name;
    const prefs = this.getPrefs();
    const per = PERIOD_ENERGY[periodOf(date)] || {};
    const w = {};
    for (const name of ENERGIES) {
      let v = per[name] || 1;
      if (prefs.modo === 'calmo') v *= CALM.has(name) ? 1.5 : 0;
      if (prefs.modo === 'pilhado') v *= CALM.has(name) ? 0.5 : 2;
      if (e && e.name === name) v *= 0.3; // muda de humor
      w[name] = v;
    }
    const name = pick(w, this.rng);
    this.state.energy = { name, until: t + (15 + this.rng() * 25) * 60e3 };
    this.save(this.state);
    return name;
  }

  /** Peso de um item agora (exposto para testes e para a Central). */
  weight(it, { date = new Date(), energy = this.energy(date), season = seasonOf(date) } = {}) {
    const prefs = this.getPrefs();
    const freq = this._freq();
    if (prefs.surpresas === false && it.frequencia !== 'comum') return 0;
    if (prefs.semPesadas && isHeavy(it)) return 0;
    if (prefs.semSono && SLEEP_ANIMS.has(it.id)) return 0;
    let w = freq[it.frequencia] ?? freq.comum;
    if (w <= 0) return 0;
    const t = this.now();
    const recent = this.state.recent;
    if (recent[recent.length - 1] === it.id) return 0; // nunca repete em sequência
    if (recent.includes(it.id)) w *= 0.15; // memória das últimas 30
    // Quanto mais tempo sem aparecer, maior a chance de voltar.
    const since = this.state.lastSeen[it.id] ? (t - this.state.lastSeen[it.id]) / 60e3 : 240;
    w *= 1 + Math.min(3, since / 60);
    if (it.energia && it.energia.includes(energy)) w *= 2.5;
    const per = periodOf(date);
    if (it.gatilho.horario) w *= it.gatilho.horario.includes(per) ? 2.5 : 0.35;
    if (season && season.categorias.includes(it.categoria)) w *= 1.8;
    // Adaptação: mais do que ela clica/curte, menos do que ela ignora ou desliga.
    w *= 1 + 0.2 * Math.min(5, this.state.likes[it.id] || 0);
    w /= 1 + 0.3 * Math.min(5, this.state.ignored[it.id] || 0);
    if ((prefs.desligadas || []).includes(it.id)) return 0;
    // Tédio alto: prioriza o que ainda não apareceu hoje.
    if (this.state.boredom >= 3 && !this.state.seenToday.includes(it.id)) w *= 3;
    return w;
  }

  /** Próxima animação ambiente. */
  pickAmbient({ date = new Date(), filter = null } = {}) {
    this._dayRollover(date);
    const energy = this.energy(date);
    const season = seasonOf(date);
    const w = {};
    for (const it of this.ambientItems) {
      if (filter && !filter(it)) continue;
      // Animação da loja de JOJOcoins: só entra no sorteio do repouso depois de comprada.
      if (it.loja && !(this.liberado && this.liberado(it))) continue;
      const v = this.weight(it, { date, energy, season });
      if (v > 0) w[it.id] = v;
    }
    const id = pick(w, this.rng);
    if (!id) return null;
    this.note(id);
    return this.byId.get(id);
  }

  /** Registra que um item tocou (memória, tédio, visto hoje). */
  note(id) {
    const s = this.state;
    s.recent.push(id);
    if (s.recent.length > MEMORY) s.recent.splice(0, s.recent.length - MEMORY);
    s.lastSeen[id] = this.now();
    s.boredom = s.seenToday.includes(id) ? s.boredom + 1 : Math.max(0, s.boredom - 1);
    if (!s.seenToday.includes(id)) s.seenToday.push(id);
    this.save(s);
  }

  /** Tela parada sem novidade: o tédio do tubarão sobe e dispara algo novo. */
  tickBoredom(by = 1) {
    this.state.boredom += by;
    this.save(this.state);
    return this.state.boredom;
  }

  like(id) {
    this.state.likes[id] = (this.state.likes[id] || 0) + 1;
    this.save(this.state);
  }

  ignore(id) {
    this.state.ignored[id] = (this.state.ignored[id] || 0) + 1;
    this.save(this.state);
  }

  /**
   * Próxima fala ambiente: combina com a animação (categoria da fala do item),
   * o período do dia e a temporada; nunca repete em sequência (memória de 30).
   */
  pickLine({ item = null, date = new Date(), categories = null } = {}) {
    const per = periodOf(date);
    const season = seasonOf(date);
    const freq = this._freq();
    const prefs = this.getPrefs();
    const want = categories || (item && item.fala ? [item.fala] : null);
    const w = {};
    this.lines.forEach((l, idx) => {
      if (l.freq === 'desligada') return;
      if (prefs.surpresas === false && l.freq === 'easter') return;
      if (want && !want.includes(l.cat)) return;
      if (l.horario && !l.horario.includes(per)) return;
      // Falas de dormir: só depois das 21h (até as 6h).
      if (l.apos && !(date.getHours() >= l.apos || date.getHours() < 6)) return;
      const key = String(idx);
      if (this.state.lines[this.state.lines.length - 1] === key) return;
      let v = freq[l.freq] ?? freq.comum;
      if (this.state.lines.includes(key)) v *= 0.1;
      if (!want && season.falas.includes(l.cat)) v *= 1.8;
      if (item && l.anims && l.anims.includes(item.id)) v *= 3;
      w[key] = v;
    });
    const key = pick(w, this.rng);
    if (key == null) return null;
    this.state.lines.push(key);
    if (this.state.lines.length > MEMORY) this.state.lines.splice(0, this.state.lines.length - MEMORY);
    this.save(this.state);
    return this.lines[Number(key)];
  }
}

function pick(weights, rng) {
  const entries = Object.entries(weights).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!entries.length || total <= 0) return null;
  let r = rng() * total;
  for (const [k, v] of entries) {
    r -= v;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}
