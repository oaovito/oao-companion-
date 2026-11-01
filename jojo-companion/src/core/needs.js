import { randomUUID } from 'node:crypto';
import { logicalDay } from './civil-time.js';
const clone = x => structuredClone(x);
const clamp = v => Math.max(0, Math.min(100, v));
export function emptyNeeds() {
  return { version: 1, hunger: 70, health: 100, mood: 75, hygiene: 100, activeMs: 0, objects: [], digestion: [],
    daily: {}, highDay: null, lastCare: 0, history: [], outbox: [], foods: {}, cleanCount: 0, interactionMemory: [], cooldowns: {} };
}
export function validateNeeds(value) {
  if (!value || value.version !== 1) throw new Error('Necessidades em formato incompatível.');
  const st = { ...emptyNeeds(), ...clone(value) };
  for (const k of ['hunger', 'health', 'mood', 'hygiene']) if (!Number.isFinite(st[k]) || st[k] < 0 || st[k] > 100) throw new Error('Indicador inválido.');
  for (const k of ['objects', 'digestion', 'history', 'outbox']) if (!Array.isArray(st[k])) throw new Error('Registro de necessidades inválido.');
  return st;
}
export class Needs {
  constructor({ state, balance, foods = [], save = () => {}, award = () => ({ pending: true }), now = () => Date.now(), monotonic = () => performance.now(), rng = Math.random, id = randomUUID, clockHealthy = () => true } = {}) {
    this.st = state ? validateNeeds(state) : emptyNeeds(); Object.assign(this, { balance, foods, save, award, now, monotonic, rng, id, clockHealthy });
    this.sample = null; this.changed = () => {}; this.drain();
  }
  mutate(fn) {
    const before = clone(this.st); let result;
    try { result = fn(); this.save(this.st); } catch (e) { this.st = before; throw e; }
    this.changed(); return result;
  }
  day() { return logicalDay(this.now()); }
  daily() { return this.st.daily[this.day()] ||= { xp: 0, feed: 0, care: 0 }; }
  reward(key, amount, source, label) {
    if (!this.clockHealthy()) return;
    const day = this.day(); if (this.st.highDay && day < this.st.highDay) return;
    this.st.highDay = day; const daily = this.daily(); amount = Math.max(0, Math.min(amount, this.balance.dailyXp - daily.xp));
    if (!amount) return; daily.xp += amount; this.st.outbox.push({ id: `needs:${day}:${key}`, amount, source, day, label });
  }
  drain() {
    while (this.st.outbox.length) {
      let result; try { result = this.award(this.st.outbox[0]); } catch { return; }
      if (!result || result.pending) return; this.mutate(() => this.st.outbox.shift());
    }
  }
  hungerState() {
    const h = this.st.hunger;
    return h >= 80 ? 'Saciado' : h >= 55 ? 'Satisfeito' : h >= 30 ? 'Com fome' : h >= 15 ? 'Muito faminto' : h >= 5 ? 'Irritado pela fome' : 'Doente por falta de alimento';
  }
  tick({ active = true } = {}) {
    const at = this.monotonic(); const elapsed = this.sample && active && this.sample.active ? at - this.sample.at : 0;
    this.sample = { at, active };
    if (elapsed <= 0 || elapsed > 90000) return { elapsed: 0, spawned: [] };
    return this.mutate(() => {
      const s = this.st, hours = elapsed / 3600000, spawned = [];
      s.activeMs += elapsed;
      s.hunger = clamp(s.hunger - this.balance.hungerPerHour * hours);
      s.hygiene = clamp(s.hygiene - (this.balance.hygienePerHour + Math.min(8, s.objects.length * 1.5)) * hours);
      if (s.hunger < 10 || s.hygiene < 15) { s.health = Math.max(25, s.health - this.balance.healthDecayPerHour * hours); s.mood = clamp(s.mood - 5 * hours); }
      else if (s.hunger > 40 && s.hygiene > 40) { s.health = clamp(s.health + 2 * hours); s.mood = clamp(s.mood + hours); }
      for (const item of s.digestion) item.remaining -= elapsed;
      while (s.objects.length < this.balance.maxObjects && s.digestion.some(d => d.remaining <= 0)) {
        const index = s.digestion.findIndex(d => d.remaining <= 0); s.digestion.splice(index, 1);
        const total = this.balance.types.reduce((n, t) => n + t.weight, 0); let roll = Math.min(0.999999, Math.max(0, this.rng())) * total;
        const type = this.balance.types.find(t => (roll -= t.weight) < 0) || this.balance.types[0];
        const object = { id: this.id(), type: type.id, createdAt: this.now(), slot: [0, 1, 2, 3, 4, 5].find(slot => !s.objects.some(o => o.slot === slot)), egg: null };
        // Logos são habilitados somente se houver recurso/licença validado no catálogo.
        if (this.balance.licensedEggs?.length && this.rng() < 0.025) object.egg = this.balance.licensedEggs[Math.floor(this.rng() * this.balance.licensedEggs.length) % this.balance.licensedEggs.length];
        s.objects.push(object); spawned.push(object); s.hygiene = clamp(s.hygiene - 4);
      }
      return { elapsed, spawned };
    });
  }
  feed(foodId) {
    const food = this.foods.find(f => f.id === foodId); if (!food) throw new Error('Alimento não encontrado.');
    if (this.st.hunger >= 95) return { fed: false, text: 'Já estou saciado, Manu. Meu estômago não é um depósito de XP.' };
    const result = this.mutate(() => {
      const before = this.st.hunger; const key = this.id();
      this.st.hunger = clamp(before + food.hunger); this.st.health = clamp(Math.max(25, this.st.health + food.health));
      this.st.mood = clamp(this.st.mood + food.mood);
      if (this.st.digestion.length < this.balance.maxObjects) this.st.digestion.push({ id: key, remaining: this.balance.digestMinutes * 60000 });
      this.st.foods[foodId] = (this.st.foods[foodId] || 0) + 1;
      const day = this.daily(); const xp = Math.max(0, Math.min(food.xp, this.balance.feedXpCap - day.feed));
      if (before <= 80 && this.st.hunger - before >= 8 && xp) { this.reward(`feed:${key}`, xp, 'feeding', food.name); day.feed += xp; }
      this.st.history.push({ kind: 'feed', food: foodId, name: food.name, at: this.now() }); this.st.history = this.st.history.slice(-200);
      return { fed: true, food, text: food.phrase, animation: food.preference === 'favorite' ? 'needsFavorita' : food.preference === 'dislike' ? 'needsDesgosto' : 'needsComer' };
    });
    this.drain(); return result;
  }
  clean(id) {
    const object = this.st.objects.find(o => o.id === id); if (!object) return { cleaned: false, duplicate: true };
    const result = this.mutate(() => {
      const type = this.balance.types.find(t => t.id === object.type); if (!type) throw new Error('Objeto inválido.');
      this.st.objects = this.st.objects.filter(o => o.id !== id); this.st.hygiene = clamp(this.st.hygiene + 15); this.st.mood = clamp(this.st.mood + 3); this.st.cleanCount++;
      this.reward(`clean:${id}`, type.xp, 'cleanup', `Limpeza: ${type.name}`);
      this.st.history.push({ kind: 'cleanup', type: type.id, at: this.now() }); this.st.history = this.st.history.slice(-200);
      return { cleaned: true, type, text: type.id === 'legendary' ? 'Limpou uma anomalia cósmica. Finalmente uma contribuição à ciência.' : 'Limpo. O ar voltou a ser um direito básico.' };
    }); this.drain(); return result;
  }
  care() {
    if (!this.clockHealthy()) return { cared: false, text: 'O relógio mudou durante a sessão. Vou preservar seus cuidados sem criar um intervalo de recompensa falso.' };
    if (this.st.health >= 99 && this.st.hygiene >= 99) return { cared: false, text: 'Estou bem cuidado. Pode reservar o drama para a masmorra.' };
    if (this.now() - this.st.lastCare < this.balance.careCooldownMinutes * 60000) return { cared: false, text: 'O cuidado já foi registrado. Eu não melhoro mais rápido clicando sem parar.' };
    const result = this.mutate(() => {
      this.st.health = clamp(this.st.health + 10); this.st.hygiene = clamp(this.st.hygiene + 8); this.st.mood = clamp(this.st.mood + 5); this.st.lastCare = this.now();
      const daily = this.daily(); const xp = Math.min(5, this.balance.careXpCap - daily.care);
      if (this.st.hunger >= 30 && xp > 0) { this.reward(`care:${this.id()}`, xp, 'care', 'Cuidado e recuperação'); daily.care += xp; }
      return { cared: true, text: 'Melhorando. Um tubarão precisa de manutenção, não de um plantão de pânico.' };
    }); this.drain(); return result;
  }
  snapshot() {
    return { hunger: Math.round(this.st.hunger), health: Math.round(this.st.health), mood: Math.round(this.st.mood), hygiene: Math.round(this.st.hygiene), hungerState: this.hungerState(),
      ill: this.st.hunger < 5 || this.st.health < 45 || this.st.hygiene < 10, weak: this.st.hunger < 15, objects: clone(this.st.objects), cleanCount: this.st.cleanCount,
      foods: clone(this.st.foods), xpToday: this.st.daily[this.day()]?.xp || 0, history: clone(this.st.history.slice(-30).reverse()) };
  }
}
