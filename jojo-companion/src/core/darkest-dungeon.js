import { civilParts, shiftDay, validDay } from './civil-time.js';

const clone = x => structuredClone(x);
export const DD_BALANCE = Object.freeze({ start: 15, firstDay: 50, milestones: [[15, 25], [30, 40], [60, 80]], dailyCap: 300, validSeconds: 60, maxStartsPerDay: 3, idleSeconds: 120 });
export function emptyDarkest() {
  return { version: 1, daily: {}, session: null, sessions: 0, activeMs: 0, days: [], highDay: null, history: [], outbox: [], lastPhrase: -1, suggestion: null, achievement: false, pendingVisuals: [], lastVisualAt: 0 };
}
export function validateDarkest(s) {
  if (!s || s.version !== 1 || !s.daily || !Array.isArray(s.days) || !Array.isArray(s.history) || !Array.isArray(s.outbox)) throw new Error('Registro de Darkest Dungeon inválido.');
  const state = { ...emptyDarkest(), ...clone(s) };
  if (!Array.isArray(state.pendingVisuals) || state.pendingVisuals.length > 3 || !state.pendingVisuals.every(id => ['ddXp', 'ddConquista', 'ddDesespero'].includes(id)) || !Number.isFinite(state.lastVisualAt) || state.lastVisualAt < 0) throw new Error('Reação pendente inválida.');
  return state;
}
export class DarkestDungeon {
  constructor({ state, balance = DD_BALANCE, lines = [], save = () => {}, award = () => ({ pending: true }), now = () => Date.now(), monotonic = () => performance.now(), rng = Math.random, zone = () => 'local', changed = () => {} } = {}) {
    this.st = state ? validateDarkest(state) : emptyDarkest(); this.balance = { ...DD_BALANCE, ...balance };
    Object.assign(this, { lines, save, award, now, monotonic, rng, zone, changed });
    this.sample = null; this.running = false; this.active = false; this.drain();
    this.lastSavedAt = this.monotonic();
  }
  day() { const p = civilParts(this.now(), this.zone()); return `${p.year}-${p.month}-${p.day}`; }
  mutate(fn, { defer = false } = {}) {
    const before = clone(this.st); let result;
    try {
      result = fn();
      if (!defer || this.monotonic() - this.lastSavedAt >= 5000 || this.st.outbox.length !== before.outbox.length || this.st.session?.valid !== before.session?.valid || this.st.days.length !== before.days.length) {
        this.save(this.st); this.lastSavedAt = this.monotonic();
      }
    } catch (e) { this.st = before; this.sample = null; throw e; }
    this.changed(); return result;
  }
  daily(day) { return this.st.daily[day] ||= { activeMs: 0, sessions: 0, starts: 0, xp: 0, rewarded: [], valid: false }; }
  queueVisual(id) { if (!this.st.pendingVisuals.includes(id)) this.st.pendingVisuals.push(id); }
  takeVisual({ allowed = false, play = () => false } = {}) {
    if (!allowed || this.running || this.st.outbox.length || this.now() - this.st.lastVisualAt < 10000) return null;
    const id = ['ddConquista', 'ddXp', 'ddDesespero'].find(id => this.st.pendingVisuals.includes(id));
    if (!id || !play(id)) return null;
    this.mutate(() => { this.st.pendingVisuals = this.st.pendingVisuals.filter(v => v !== id); this.st.lastVisualAt = this.now(); });
    return id;
  }
  reward(id, amount, day, label) {
    const d = this.daily(day); if (d.rewarded.includes(id) || (this.st.highDay && day < this.st.highDay)) return;
    d.rewarded.push(id); amount = Math.max(0, Math.min(amount, this.balance.dailyCap - d.xp));
    if (!amount) return; d.xp += amount; this.queueVisual('ddXp');
    this.st.outbox.push({ id: `darkest:${id}`, amount, day, label, source: 'darkest' });
  }
  drain() {
    while (this.st.outbox.length) {
      let r; try { r = this.award(this.st.outbox[0]); } catch { return; }
      if (!r || r.pending) return;
      this.mutate(() => { this.st.outbox.shift(); if (r.levelUp) this.queueVisual('ddConquista'); });
    }
  }
  observe({ running = false, active = false, processKey = null, idleSeconds = Infinity, suspended = false, known = true, installed = null, executable = false, verified = false, reason = null, checkedAt = null } = {}) {
    this.detection = { known, installed, executable, verified, reason, checkedAt };
    if (!known) { this.running = null; this.active = false; this.sample = null; this.changed(); return; }
    const at = this.monotonic(); const day = this.day();
    this.running = running && typeof processKey === 'string' && processKey.length > 0 && processKey.length < 160;
    this.active = this.running && active && !suspended && Number.isFinite(idleSeconds) && idleSeconds >= 0 && idleSeconds <= this.balance.idleSeconds;
    const previous = this.sample;
    const elapsed = previous && previous.active && this.active && previous.processKey === processKey && previous.day === day ? at - previous.at : 0;
    const delta = elapsed > 0 && elapsed <= 5000 ? elapsed : 0; // suspensão/gaps/reinício não concedem tempo
    this.sample = { at, day, active: this.active, processKey };
    if (!this.running && !this.st.session) return;
    if (this.st.session?.key !== processKey && !this.active && this.running) return;
    if (!this.running || (this.active && this.st.session?.key !== processKey)) {
      this.mutate(() => {
        const old = this.st.session;
        if (old) {
          if (old.valid) this.queueVisual('ddDesespero');
          this.st.history.push({ type: 'session', start: old.started, end: this.now(), activeMs: old.activeMs, valid: !!old.valid }); this.st.history = this.st.history.slice(-500);
        }
        this.st.session = this.active ? { key: processKey, started: this.now(), activeMs: 0, valid: false, milestones: [] } : null;
      });
    }
    if (!delta || !this.st.session || !this.active) return;
    this.mutate(() => {
      const session = this.st.session; const d = this.daily(day);
      this.st.highDay = this.st.highDay && this.st.highDay > day ? this.st.highDay : day;
      session.activeMs += delta; d.activeMs += delta; this.st.activeMs += delta;
      if (!session.valid && session.activeMs >= this.balance.validSeconds * 1000) {
        session.valid = true; this.st.sessions++; d.sessions++;
        if (d.starts < this.balance.maxStartsPerDay) { d.starts++; this.reward(`${session.key}:start`, this.balance.start, day, 'Sessão válida de Darkest Dungeon'); }
      }
      if (session.valid && d.activeMs >= this.balance.validSeconds * 1000 && !d.valid && day >= this.st.highDay) {
        d.valid = true; if (!this.st.days.includes(day)) this.st.days.push(day);
        this.reward(`${day}:first`, this.balance.firstDay, day, 'Primeira sessão válida do dia');
        if (this.st.days.length >= 7 && !this.st.achievement) { this.st.achievement = true; this.queueVisual('ddConquista'); }
      }
      for (const [minutes, xp] of this.balance.milestones) {
        if (session.valid && session.activeMs >= minutes * 60000 && !session.milestones.includes(minutes)) {
          session.milestones.push(minutes); this.reward(`${session.key}:minute:${minutes}`, xp, day, `${minutes} minutos ativos de Darkest Dungeon`);
        }
      }
    }, { defer: true });
    this.drain();
  }
  flush() { this.save(this.st); this.lastSavedAt = this.monotonic(); }
  suggest({ focus = false, fullscreen = false, important = false, canSpeak = true } = {}) {
    if (this.detection?.known === false) return null;
    const day = this.day(); const p = civilParts(this.now(), this.zone()); const minute = Number(p.hour) * 60 + Number(p.minute);
    if (!this.st.suggestion || this.st.suggestion.day < day) this.mutate(() => {
      this.st.suggestion = { day, minute: 360 + Math.min(899, Math.floor(Math.max(0, this.rng()) * 900)), delivered: false };
    });
    const s = this.st.suggestion;
    if (s.day !== day || s.delivered || minute < s.minute || minute >= 1260 || minute < 360 || focus || fullscreen || important || !canSpeak || this.running || !this.lines.length) return null;
    return this.mutate(() => {
      const choices = this.lines.map((_, i) => i).filter(i => i !== this.st.lastPhrase);
      const index = choices[Math.min(choices.length - 1, Math.floor(Math.max(0, this.rng()) * choices.length))] ?? 0;
      s.delivered = true; this.st.lastPhrase = index;
      return { text: this.lines[index], animation: !this.daily(day).valid && index % 2 ? 'ddFurioso' : 'ddAventureiro' };
    });
  }
  snapshot() {
    const day = this.day(); const d = this.st.daily[day]; const days = this.st.days.filter(validDay).sort();
    let streak = 0, key = days.includes(day) ? day : shiftDay(day, -1);
    while (days.includes(key)) { streak++; key = shiftDay(key, -1); }
    return { detection: this.detection || { known: false }, running: this.running, active: this.active, activeMs: this.st.activeMs, todayMs: d?.activeMs || 0,
      sessionMs: this.st.session?.activeMs || 0, sessionValid: this.st.session?.valid || false,
      sessions: this.st.sessions, todaySessions: d?.sessions || 0, playedToday: !!d?.valid,
      days: days.length, streak, xpToday: d?.xp || 0, xpTotal: Object.values(this.st.daily).reduce((n, x) => n + x.xp, 0),
      achievement: this.st.achievement, cap: this.balance.dailyCap, pendingXp: this.st.outbox.reduce((n, a) => n + a.amount, 0), history: clone(this.st.history.slice(-20).reverse()) };
  }
  chat(raw) {
    const n = String(raw).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const game = /darkest(?: dungeon)?\b/.test(n); const s = this.snapshot();
    if (!game && !/ja joguei hoje|quanto xp (?:eu )?ganhei jogando|quanto tempo (?:eu )?joguei/.test(n)) return null;
    if (/darkest dungeon (?:ii|2)\b/.test(n)) return 'O meu registro de atividade acompanha Darkest Dungeon original (Steam 262060). Darkest Dungeon II não entra nessa contagem.';
    if (/\b(xp|experiencia)\b/.test(n)) return `Registrei ${s.xpToday} XP de Darkest Dungeon hoje e ${s.xpTotal} XP no total${s.pendingXp ? `; ${s.pendingXp} XP aguardam confirmação no disco` : ''}. Limite: ${s.cap} XP por dia.`;
    if (/quanto tempo|tempo jogado/.test(n)) return `Registrei ${Math.floor(s.todayMs / 60000)} minuto(s) ativo(s) hoje e ${Math.floor(s.activeMs / 60000)} no total. Só conto o jogo verificado em primeiro plano, sem inatividade prolongada.`;
    if (/ja joguei|joguei hoje|sessoes|sequencia/.test(n)) return `${s.playedToday ? 'Sim, há uma sessão válida registrada hoje.' : 'Ainda não há sessão válida registrada hoje.'} ${s.sessions} sessão(ões) no total; sequência atual de ${s.streak} dia(s). Abrir o jogo ou dizer que jogou não gera XP.`;
    if (/\b(vou|quero|vamos|bora|jogar)\b/.test(n)) return 'Pode ir, Manu. Eu verifico o Darkest Dungeon original da Steam em primeiro plano e conto o tempo ativo. A sessão vale depois de um minuto; clicar aqui não concede XP. Leva uma tocha.';
    return 'A atividade de Darkest Dungeon fica na Central: sessões, tempo ativo verificado e XP. Quer saber quanto jogou ou se já tem uma sessão válida hoje?';
  }
}
