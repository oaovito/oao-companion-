import { node } from './todo-view.js';
export class CareView {
  constructor(root, api, onProgress = () => {}) {
    this.root = root; this.api = api; this.onProgress = onProgress; this.filter = '';
    this.feedback = node('p', 'care-feedback'); this.feedback.setAttribute('role', 'status');
    this.stats = node('div', 'care-stats'); this.objects = node('div', 'care-objects'); this.foods = node('div', 'care-foods');
    const title = node('div', 'card'); title.append(node('h2', '', 'Cuidados com o JoJo'), node('p', 'muted', 'Fome, higiene e saúde só avançam enquanto estou ativo, fora de foco e tela cheia. Não há punição por fechar o aplicativo.'));
    const care = node('button', 'chipbtn', 'Cuidar e recuperar'); care.type = 'button'; care.addEventListener('click', () => this.request('care'));
    const search = node('input'); search.type = 'search'; search.placeholder = 'Buscar no cardápio'; search.setAttribute('aria-label', 'Buscar alimento'); search.addEventListener('input', () => { this.filter = search.value.toLocaleLowerCase('pt-BR'); this.renderFoods(); });
    this.hunger = node('p', 'muted'); this.history = node('details', 'card'); this.history.append(node('summary', '', 'Histórico de cuidados'));
    root.append(title, this.stats, this.hunger, care, this.feedback, node('h3', '', 'Limpeza do aquário'), this.objects, node('h3', '', 'Cardápio'), search, this.foods, this.history);
  }
  async request(action, id = undefined) {
    const result = await this.api.needs({ action, id });
    this.feedback.textContent = result?.error || result?.result?.text || '';
    if (result?.needs) { this.render({ ...result.needs, foods: result.foods, types: result.types }); this.onProgress(result.progress); }
  }
  async refresh() { const result = await this.api.needs({ action: 'snapshot' }); if (result?.needs) this.render({ ...result.needs, foods: result.foods, types: result.types }); }
  render(s) {
    this.state = s; this.stats.replaceChildren();
    for (const [label, value] of [['Saciedade', s.hunger], ['Saúde', s.health], ['Humor', s.mood], ['Higiene', s.hygiene]]) {
      const box = node('div', 'card'); const bar = node('progress'); bar.max = 100; bar.value = value; bar.setAttribute('aria-label', label);
      box.append(node('b', '', `${label} ${value}/100`), bar); this.stats.append(box);
    }
    this.hunger.textContent = `${s.hungerState}${s.ill ? ' · Mal-estar temporário: alimentação e cuidados ajudam a recuperar.' : ''}. ${s.cleanCount} limpeza(s) registradas.`;
    this.objects.replaceChildren();
    if (!s.objects.length) this.objects.append(node('p', 'muted', 'Aquário limpo. A civilização venceu esta rodada.'));
    for (const item of s.objects) {
      const type = s.types.find(t => t.id === item.type); const button = node('button', 'care-object'); button.type = 'button'; button.dataset.id = item.id;
      const image = node('img'); image.src = `../../../assets/litter/${item.type}.svg`; image.alt = ''; image.width = 50; image.height = 50;
      button.append(image, node('span', '', `${type?.name || item.type} · ${type?.rarity || ''}`), node('small', '', `Limpar · até +${type?.xp || 0} XP`));
      button.addEventListener('click', () => this.request('clean', item.id)); this.objects.append(button);
    }
    this.renderFoods();
    while (this.history.children.length > 1) this.history.lastElementChild.remove();
    for (const h of s.history || []) this.history.append(node('p', 'muted', `${h.kind === 'feed' ? `Alimentação: ${h.name}` : 'Limpeza do aquário'} · ${new Date(h.at).toLocaleString('pt-BR')}`));
  }
  renderFoods() {
    this.foods.replaceChildren();
    for (const food of this.state?.foods || []) {
      if (this.filter && !food.name.toLocaleLowerCase('pt-BR').includes(this.filter)) continue;
      const button = node('button', 'care-food'); button.type = 'button'; button.dataset.food = food.id;
      const image = node('img'); image.src = `../../../${food.image}`; image.alt = ''; image.width = 56; image.height = 56; image.loading = 'lazy';
      const pref = food.preference === 'favorite' ? 'Favorita' : food.preference === 'dislike' ? 'Ele torce o nariz' : 'Aceita';
      button.append(image, node('b', '', food.name), node('small', '', `${pref} · saciedade +${food.hunger}`));
      button.title = `Saúde ${food.health >= 0 ? '+' : ''}${food.health} · humor ${food.mood >= 0 ? '+' : ''}${food.mood} · até ${food.xp} XP`;
      button.addEventListener('click', () => this.request('feed', food.id)); this.foods.append(button);
    }
  }
}
