// Painel "Aventura" da Central (0.48): ficha, vida, atributos, árvores de
// habilidade, especializações, missões, expedições, oficina, artefatos,
// segredos e diário. Tudo vem do processo principal já filtrado: segredo
// não descoberto chega como "???" e nunca é revelado aqui.
import { node } from './todo-view.js';
import { xpVisivel } from '../../core/xp-escala.js';

const btn = (label, action, cls = 'chipbtn', disabled = false, title = '') => {
  const b = node('button', cls, label); b.type = 'button'; b.disabled = !!disabled; if (title) b.title = title;
  b.addEventListener('click', action); return b;
};
const barra = (label, valor, max = 100) => {
  const box = node('div', 'badge ok'); const p = node('progress'); p.max = max; p.value = Math.max(0, Math.min(max, valor)); p.setAttribute('aria-label', label);
  box.append(node('b', '', `${label} ${valor}/${max}`), p); return box;
};
const EVENTOS = { foco: 'blocos de foco', agua: 'copos de água', vitoria: 'vitórias', carinho: 'carinhos', expedicao: 'expedições', treino: 'treinos', estudo: 'estudos', comida: 'refeições', tarefa: 'tarefas', segredo: 'segredos', cuidado: 'cuidados', chat: 'conversas', missao: 'missões' };
const det = (titulo, aberto, ...filhos) => { const d = node('details', 'card'); d.open = !!aberto; d.append(node('summary', '', titulo), ...filhos.filter(Boolean)); return d; };

export class RpgView {
  constructor(root, api) {
    this.root = root; this.api = api; this.s = null; this.abertos = new Set(['vida', 'expedicoes']);
    this.feedback = node('p', 'care-feedback'); this.feedback.setAttribute('role', 'status');
  }
  async request(action, extra = {}) {
    const r = await this.api.rpg({ action, ...extra });
    if (r?.error) this.feedback.textContent = r.error;
    else if (r?.result) this.feedback.textContent = r.result.ok === false ? r.result.motivo : (r.result.texto || r.result.fala || 'Feito.');
    if (r?.rpg) this.render(r.rpg);
  }
  async refresh() { const r = await this.api.rpg({ action: 'snapshot' }); if (r?.rpg) this.render(r.rpg); }
  _det(id, titulo, ...filhos) {
    const d = det(titulo, this.abertos.has(id), ...filhos);
    d.addEventListener('toggle', () => (d.open ? this.abertos.add(id) : this.abertos.delete(id)));
    return d;
  }
  render(s) {
    this.s = s; const lista = [];
    // Ficha.
    const esp = s.especializacoes.find((e) => e.id === s.especializacao);
    const ficha = node('div', 'card');
    ficha.append(node('h2', '', `Nível ${s.nivel}${s.paragon ? ` · Paragon ${s.paragon}` : ''}${s.estrela ? ` · Estrela ${s.estrela}` : ''}`));
    ficha.append(node('p', '', `Especialização: ${esp ? `${esp.nome} (rank ${esp.rank})` : 'nenhuma ainda'} · Vínculo: ${s.vinculo.nome} (${s.vinculo.nivel}/20)`));
    ficha.append(node('p', 'muted', `XP de aventura hoje: ${xpVisivel(s.xpRpgHoje)}/${xpVisivel(s.xpRpgTeto)} · Pontos livres: ${s.pontos.atributo} de atributo, ${s.pontos.habilidade} de habilidade.`));
    if (s.pendentes && !s.carteira) ficha.append(node('p', 'muted', `${s.pendentes} recompensa(s) em JOJOcoins guardadas: entram na carteira assim que a loja estiver ativa. Nada se perde.`));
    const auto = btn(s.auto ? 'Distribuição automática: ligada' : 'Distribuição automática: desligada', () => this.request('auto', { valor: !s.auto }), `chipbtn${s.auto ? ' on' : ''}`);
    const titulos = node('select'); titulos.setAttribute('aria-label', 'Título exibido');
    titulos.append(new Option('Sem título', ''));
    for (const t of s.titulos) titulos.append(new Option(t, t, false, t === s.tituloAtivo));
    titulos.addEventListener('change', () => this.request('titulo', { titulo: titulos.value || null }));
    const linha = node('div', 'buttons'); linha.append(auto, titulos); ficha.append(linha, this.feedback);
    lista.push(ficha);

    // Vida.
    const v = s.vida, grade = node('div', 'grid');
    for (const [k, l] of [['sede', 'Hidratação'], ['energia', 'Energia'], ['carinho', 'Carinho'], ['confianca', 'Confiança'], ['satisfacao', 'Satisfação']]) grade.append(barra(l, v[k]));
    grade.append(barra('Tédio', v.tedio));
    lista.push(this._det('vida', 'Vida do JoJo', grade,
      node('p', 'muted', v.doencas.length ? `Doente: ${v.doencas.map((d) => `${d.nome} (~${d.minutos} min)`).join(', ')}. Água, comida boa e "Cuidar e recuperar" ajudam.` : 'Sem doenças. Só o tempo com você usando o PC conta; fechar o app não pune ninguém.'),
      s.buffs.length ? node('p', 'muted', `Efeitos ativos: ${s.buffs.map((b) => `${b.id} (${b.minutos} min)`).join(', ')}`) : null));

    // Atributos.
    const at = node('div', 'grid');
    for (const a of s.atributos) {
      const b = node('div', 'badge ok'); b.title = a.desc || '';
      b.append(node('b', '', `${a.nome} ${a.valor}`), node('small', '', a.desc || ''));
      if (!s.auto) b.append(btn('+1', () => this.request('investir', { id: a.id }), 'chipbtn', !s.pontos.atributo));
      at.append(b);
    }
    lista.push(this._det('atributos', `Atributos (${s.pontos.atributo} livres)`, s.auto ? node('p', 'muted', 'Com a distribuição automática ligada, os pontos vão para onde a especialização pede. Desligue para escolher.') : null, at,
      node('p', 'muted', 'Inteligência melhora estudo, quizzes e dicas. Ela nunca limita a conversa com o JoJo.')));

    // Habilidades.
    const arv = [];
    for (const t of s.arvores) {
      const g = node('div', 'grid');
      for (const h of t.habilidades) {
        const b = node('div', `badge${h.rank ? ' ok' : ''}`); b.title = h.desc;
        b.append(node('b', '', `${h.nome}${h.ranks > 1 ? ` ${h.rank}/${h.ranks}` : h.rank ? ' ✓' : ''}`), node('small', '', `${h.tipo} · nível ${h.nivel} · custo ${h.custo}`), node('small', '', h.desc));
        if (!h.motivo) b.append(btn('Aprender', () => this.request('aprender', { id: h.id })));
        else if (!h.rank) b.append(node('small', '', h.motivo));
        if (h.ativa && h.rank) b.append(btn(h.recarga ? `Recarga ${h.recarga} min` : 'Usar', () => this.request('usar', { id: h.id }), 'chipbtn', !!h.recarga));
        g.append(b);
      }
      arv.push(node('h4', '', `${t.nome}${t.desc ? ` · ${t.desc}` : ''}`), g);
    }
    if (s.habilidadesEsp.length) {
      const g = node('div', 'grid');
      for (const h of s.habilidadesEsp) {
        const b = node('div', 'badge ok'); b.append(node('b', '', h.nome), node('small', '', h.desc));
        if (h.ativa) b.append(btn(h.recarga ? `Recarga ${h.recarga} min` : 'Usar', () => this.request('usar', { id: h.id }), 'chipbtn', !!h.recarga));
        g.append(b);
      }
      arv.push(node('h4', '', 'Das especializações'), g);
    }
    const combos = s.combos.filter((c) => c.ativo).map((c) => c.nome);
    const maes = s.maestrias.filter((m) => m.nivel).map((m) => `${m.nome} ${m.nivel}`);
    lista.push(this._det('habilidades', `Habilidades (${s.pontos.habilidade} pontos)`, ...arv,
      node('p', 'muted', `Combinações ativas: ${combos.length ? combos.join(', ') : 'nenhuma ainda'}. Maestrias: ${maes.length ? maes.join(', ') : 'nenhuma ainda'}.`)));

    // Especializações.
    const eg = node('div', 'grid');
    for (const e of s.especializacoes) {
      const atual = e.id === s.especializacao;
      const b = node('div', `badge${atual || e.rank > 1 ? ' ok' : ''}`);
      b.append(node('b', '', `${e.nome}${atual ? ' (atual)' : ''}`), node('small', '', `Rank ${e.rank}/10 · ${e.xp} XP · libera no ${e.nivel}`));
      if (e.aviso) b.append(node('small', '', e.aviso));
      if (!atual) b.append(e.motivo ? node('small', '', e.motivo) : btn('Escolher', () => this.request('especializar', { id: e.id })));
      eg.append(b);
    }
    lista.push(this._det('especializacoes', 'Especializações', node('p', 'muted', 'Trocar não apaga nada: o rank de cada uma fica guardado. Troca a cada 12 horas.'), eg));

    // Missões.
    const ms = [];
    if (s.semana.length) ms.push(node('h4', '', 'Da semana'), ...s.semana.map((m) => node('p', m.ok ? 'ok' : '', `${m.ok ? '✓' : `${m.feito}/${m.n}`} ${m.txt} · ${xpVisivel(m.xp)} XP`)));
    else ms.push(node('p', 'muted', 'Missões semanais liberam no nível 3.'));
    for (const m of s.especiais) ms.push(node('p', m.ok ? 'ok' : '', `Especial: ${m.nome} ${m.ok ? '✓' : m.objetivos.map((o, i) => `${m.feito[i]}/${o.n} ${EVENTOS[o.evento] || o.evento}`).join(' · ')}`));
    if (s.cadeias.length) ms.push(node('h4', '', 'Histórias'), ...s.cadeias.map((c) => node('p', c.ok ? 'ok' : '', `${c.nome}: ${c.ok ? 'concluída ✓' : `capítulo ${c.capitulo + 1}/${c.total} · ${c.atual.txt} (${c.atual.feito}/${c.atual.n})`}`)));
    ms.push(node('h4', '', 'Secretas'), node('p', '', s.secretas.map((x) => (x.ok ? `✓ ${x.nome}` : '???')).join(' · ')));
    ms.push(node('h4', '', 'Longa duração'), ...s.longos.map((d) => node('p', d.ok ? 'ok' : '', `${d.ok ? '✓' : d.progresso != null ? `${d.progresso}/${d.n}` : '…'} ${d.nome}`)));
    lista.push(this._det('missoes', 'Missões', ...ms));

    // Expedições.
    const ex = [];
    for (const x of s.expedicoes) ex.push(node('p', '', `${x.nome}: ${x.progresso}% · ~${x.minutos} min · chance ${x.chance}%${x.escolha ? ` · ${x.escolha}` : ''}`));
    if (s.encruzilhada) {
      const e = s.encruzilhada, l = node('div', 'buttons');
      for (const o of e.opcoes) l.append(btn(`${o.id}) ${o.txt}`, () => this.request('escolher', { opcao: o.id })));
      ex.push(node('p', '', `${e.regiao.nome}: ${e.txt}`), l);
    }
    const rg = node('div', 'grid');
    for (const r of s.regioes) {
      const b = node('div', `badge${r.liberada ? ' ok' : ''}`); b.title = r.desc;
      b.append(node('b', '', r.liberada ? r.nome : `${r.nome} (nível ${r.nivel})`), node('small', '', r.liberada ? `${r.concluidas} expedições · ${r.exploracaoMin} min explorados` : 'Trancada'));
      if (r.liberada) b.append(btn('Explorar', () => this.request('expedicao', { regiao: r.id })));
      rg.append(b);
    }
    ex.push(node('h4', '', 'Regiões do desktop'), rg);
    if (s.relatorios.length) ex.push(node('h4', '', 'Relatórios'), ...s.relatorios.map((r) => node('p', 'muted', r.texto)));
    lista.push(this._det('expedicoes', `Expedições${s.expedicoes.length ? ` (${s.expedicoes.length} em andamento)` : ''}`, ...ex));

    // Oficina e artefatos.
    const of = [node('p', '', s.materiais.length ? `Materiais: ${s.materiais.map((m) => `${m.q}× ${m.nome}`).join(', ')}` : 'Sem materiais. Expedições e exploração trazem.')];
    const rec = node('div', 'grid');
    for (const r of s.receitas) {
      const b = node('div', `badge${r.liberada ? ' ok' : ''}`);
      b.append(node('b', '', r.nome), node('small', '', r.liberada ? r.custoTxt : `Nível ${Math.max(4, r.nivel)}`), node('small', '', r.desc || ''));
      if (r.liberada) b.append(btn('Fabricar', () => this.request('fabricar', { id: r.id }), 'chipbtn', !r.pode));
      rec.append(b);
    }
    of.push(node('h4', '', 'Receitas'), rec);
    const arts = node('div', 'grid');
    for (const a of s.artefatos) {
      const b = node('div', 'badge ok'); b.title = a.desc || '';
      b.append(node('b', '', `${a.nome}${a.q > 1 ? ` ×${a.q}` : ''}`), node('small', '', `${a.raridade} · ${a.desc || ''}`));
      b.append(a.equipado ? btn('Tirar', () => this.request('desequipar', { id: a.id })) : btn('Equipar', () => this.request('equipar', { id: a.id })));
      arts.append(b);
    }
    of.push(node('h4', '', `Artefatos (${s.artefatos.length}/${s.artefatosTotal}) · ${s.artefatos.filter((a) => a.equipado).length}/${s.slots} equipados`), s.artefatos.length ? arts : node('p', 'muted', 'Nenhum artefato ainda.'));
    lista.push(this._det('oficina', 'Oficina e artefatos', ...of));

    // Segredos e diário.
    lista.push(this._det('segredos', `Segredos (${s.segredosDescobertos}/${s.segredosTotal})`,
      node('p', '', s.segredos.map((x) => (x.nome === '???' ? '???' : `${x.nome}${x.n > 1 ? ` ×${x.n}` : ''}`)).join(' · ')),
      node('p', 'muted', 'Alguns segredos dependem de hora, data, lua, clima, vínculo ou do que você está fazendo. Percepção alta dá pistas. Há também códigos para digitar na conversa.'),
      s.diario.length ? node('h4', '', 'Diário do Megalodon') : null, ...s.diario.map((d) => node('p', 'muted', d))));

    // Histórico.
    lista.push(this._det('historico', 'Histórico', ...s.historico.map((h) => node('p', 'muted', `${new Date(h.em).toLocaleString('pt-BR')} · ${h.txt}`))));
    this.root.replaceChildren(...lista);
  }
}
