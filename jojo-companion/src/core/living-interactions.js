// Encenações explícitas e pequenos memes ambientes. Não responde perguntas técnicas.
export const normalizeScene = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export const emptyScenes = () => ({ version: 1, recent: [], cooldowns: {}, lastAmbient: 0, highTime: 0 });
export function validateScenes(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.recent) || !value.recent.every(id => typeof id === 'string') || !value.cooldowns || typeof value.cooldowns !== 'object' || Array.isArray(value.cooldowns)) throw new Error('Memória de cenas inválida.');
  for (const n of [value.highTime, value.lastAmbient, ...Object.values(value.cooldowns)]) if (!Number.isFinite(n) || n < 0) throw new Error('Intervalo de cenas inválido.');
  return { ...emptyScenes(), ...structuredClone(value), recent: value.recent.slice(-12) };
}
export class LivingInteractions {
  constructor({ items, state, save = () => {}, now = () => Date.now(), rng = Math.random }) {
    Object.assign(this, { items, save, now, rng }); this.st = state ? validateScenes(state) : emptyScenes();
  }
  command(item) { return `Encena ${item.nome}`; }
  list() { return this.items.map(item => ({ id: item.id, name: item.nome, category: item.tipo, command: this.command(item) })); }
  match(text) {
    const n = normalizeScene(text);
    const command = n.match(/^(?:jojo )?(?:encena|encene|imita|imite|finge que (?:e|voce e)|finja que (?:e|voce e)|faz a cena|mostra o meme|mostre o meme|faz o meme) (?:um |uma |o |a )?(.+)$/);
    if (!command) return null;
    return this.items.find(it => [it.id.replace('living_', ''), it.alias, it.nome].some(name => normalizeScene(name) === command[1])) || null;
  }
  remaining(item) { return Object.hasOwn(this.st.cooldowns, item.id) ? Math.max(0, this.st.cooldowns[item.id] + item.cooldownMin * 60000 - this.now()) : 0; }
  candidate({ context = 'idle', allowed = false, reducedMotion = false, heavyAllowed = true, isHeavy = () => false } = {}) {
    if (!allowed || this.now() < this.st.highTime || this.now() - this.st.lastAmbient < 25 * 60000) return null;
    const eligible = this.items.filter(it => it.tipo === 'meme' && it.contextos.includes(context) && !this.remaining(it) && !this.st.recent.includes(it.id) && (!reducedMotion && heavyAllowed || !isHeavy(it)));
    return eligible.length ? eligible[Math.min(eligible.length - 1, Math.floor(Math.max(0, this.rng()) * eligible.length))] : null;
  }
  record(item, { ambient = false } = {}) {
    const at = this.now(); if (at < this.st.highTime) return false;
    const previous = this.st; this.st = structuredClone(previous);
    this.st.cooldowns[item.id] = at; this.st.highTime = at;
    if (ambient) this.st.lastAmbient = at;
    this.st.recent = [...this.st.recent.filter(id => id !== item.id), item.id].slice(-12);
    try { this.save(this.st); } catch (e) { this.st = previous; throw e; }
    return true;
  }
}
