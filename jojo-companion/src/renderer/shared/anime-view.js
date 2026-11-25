// Central do JoJo → Animes: calendário inteligente, listas, filtros, cartões com contagem e
// recompensa, sessão, histórico (com correção), estatísticas e configurações dos alertas.
// Tudo vem do processo principal (anime:request); texto de fora entra só por textContent.
import { quandoTexto, contagem, FUSO_PADRAO } from '../../core/anime-tempo.js';

const LISTAS = [
  ['hoje', 'Hoje'], ['amanha', 'Amanhã'], ['semana', 'Semana'], ['mes', 'Mês'], ['transmissao', 'Em transmissão'],
  ['favoritos', 'Favoritos'], ['aguardando', 'Nova temporada'], ['pausados', 'Pausados'], ['concluidos', 'Concluídos'],
  ['pendentes', 'Não assistidos'], ['calendario', 'Todos os lançamentos'], ['historico', 'Histórico'], ['estatisticas', 'Estatísticas'], ['config', 'Alertas'],
];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const ALERTAS = [['mes', '1 mês antes'], ['semana', '1 semana antes'], ['dia', '1 dia antes'], ['manha', 'Na manhã'], ['h3', '3 h antes'], ['h1', '1 h antes'], ['m30', '30 min antes'], ['m15', '15 min antes'], ['m5', '5 min antes'], ['horario', 'No horário'], ['apos', 'Depois, se não assistiu']];
const SITUACAO = { emTransmissao: 'Em transmissão', aguardando: 'Aguardando', pausado: 'Pausado', concluido: 'Concluído', finalizado: 'Finalizado', emAndamento: 'Em andamento', semData: 'Sem data', arquivado: 'Arquivado' };

const el = (tag, attrs = {}, ...filhos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn); else if (v != null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat()) if (f != null && f !== false) e.append(f instanceof Node ? f : String(f));
  return e;
};

export class AnimeView {
  constructor(root, api) {
    this.root = root; this.api = api;
    this.lista = 'hoje'; this.filtro = { genero: '', plataforma: '', dia: '', nota: 0, situacao: '' };
    this.s = null; this.aberto = false; this.timer = null; this.capas = new Map();
    this.obs = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && this._carregarCapa(e.target)), { root: this.root }) : null;
    api.onAnimeUpdate?.((s) => { if (this.aberto && s?.anime) { this.s = s.anime; this.render(); } });
  }

  async abrir() {
    this.aberto = true;
    await this._pedir({ action: 'resumo' });
    clearInterval(this.timer);
    this.timer = setInterval(() => this._tiqueContagem(), 1000);
  }
  fechar() { this.aberto = false; clearInterval(this.timer); this.timer = null; }

  async _pedir(req) {
    let r;
    try { r = await this.api.anime(req); } catch { r = { error: 'Não consegui falar com o JoJo agora.' }; }
    if (r?.anime) this.s = r.anime;
    this.aviso = r?.error || null;
    this.render();
    return r;
  }

  get tz() { return this.s?.config?.fuso || FUSO_PADRAO; }

  // ---------------------------------------------------------------- listas
  _episodios(desde, ate) {
    const out = [];
    for (const a of this.s.animes.filter((x) => x.pref.acompanhando)) {
      for (const e of [...a.exibidos, ...(a.proximo ? [a.proximo] : [])]) if (e.quando >= desde && e.quando < ate && !out.some((x) => x.a.id === a.id && x.e.episodio === e.episodio)) out.push({ a, e });
    }
    if (this.lista === 'calendario' || this.s.config.todosLancamentos) {
      for (const j of this.s.janela?.itens || []) if (j.quando >= desde && j.quando < ate && !out.some((x) => x.a.id === j.id && x.e.episodio === j.episodio)) out.push({ a: { id: j.id, titulo: j.titulo, capa: j.capa, cor: j.cor, generos: j.generos, nota: j.nota, links: j.links, formato: j.formato, duracao: j.duracao, pref: { acompanhando: false }, prog: { vistos: {} }, situacao: 'emTransmissao' }, e: { episodio: j.episodio, quando: j.quando }, geral: true });
    }
    return out.sort((x, y) => x.e.quando - y.e.quando);
  }

  _filtrar(itens) {
    const f = this.filtro;
    return itens.filter(({ a, e }) => (!f.genero || (a.generos || []).includes(f.genero))
      && (!f.plataforma || (a.links || []).some((l) => l.site === f.plataforma))
      && (!f.nota || (a.nota || 0) >= f.nota)
      && (!f.situacao || a.situacao === f.situacao)
      && (f.dia === '' || new Date(e?.quando || a.proximo?.quando || 0).getDay() === Number(f.dia)));
  }

  render() {
    const r = this.root;
    r.replaceChildren();
    if (!this.s) { r.append(el('p', { class: 'muted' }, this.aviso || 'Carregando…')); return; }
    if (!this.s.ativo) r.append(el('div', { class: 'card' }, el('p', {}, 'O calendário de anime está desligado em Configurações → Privacidade.')));
    if (this.aviso) r.append(el('p', { class: 'aviso' }, this.aviso));
    r.append(this._cabecalho(), this._abas(), this._filtros());
    const corpo = el('div', { class: 'an-corpo' });
    r.append(corpo);
    const agora = Date.now();
    const dia0 = new Date(agora); dia0.setHours(0, 0, 0, 0);
    const D = 86400e3;
    const janela = { hoje: [dia0.getTime(), dia0.getTime() + D], amanha: [dia0.getTime() + D, dia0.getTime() + 2 * D], semana: [dia0.getTime(), dia0.getTime() + 7 * D], mes: [dia0.getTime(), dia0.getTime() + 31 * D], calendario: [dia0.getTime() - D, dia0.getTime() + 8 * D] }[this.lista];
    if (janela) {
      const itens = this._filtrar(this._episodios(...janela));
      if (!itens.length) corpo.append(el('p', { class: 'muted' }, 'Nada nesse período.'));
      for (const x of itens) corpo.append(this._cartao(x.a, x.e, x.geral));
      return;
    }
    const as = this.s.animes;
    const listas = {
      transmissao: as.filter((a) => a.situacao === 'emTransmissao'),
      favoritos: as.filter((a) => a.pref.favorito),
      aguardando: as.filter((a) => a.situacao === 'aguardando'),
      pausados: as.filter((a) => a.situacao === 'pausado' || a.prog.interrompido),
      concluidos: as.filter((a) => a.situacao === 'concluido' || a.situacao === 'finalizado' || a.prog.temporadaConcluida),
    };
    if (listas[this.lista]) {
      const itens = this._filtrar(listas[this.lista].map((a) => ({ a, e: a.proximo })));
      if (!itens.length) corpo.append(el('p', { class: 'muted' }, 'Nenhum anime aqui.'));
      for (const x of itens) corpo.append(this._cartao(x.a, x.e));
      return;
    }
    if (this.lista === 'pendentes') {
      if (!this.s.pendentes.length) corpo.append(el('p', { class: 'muted' }, 'Tudo em dia.'));
      for (const p of this.s.pendentes) {
        const a = as.find((x) => x.id === p.anime);
        corpo.append(el('div', { class: 'card' }, el('h3', {}, p.titulo), el('p', {}, `${p.quantidade} episódio(s): ${p.episodios.slice(0, 20).join(', ')}${p.episodios.length > 20 ? '…' : ''}`),
          el('div', { class: 'buttons' }, el('button', { on: { click: () => this._pedir({ action: 'iniciar', id: a.id, episodio: p.episodios[0] }) } }, `Assistir ep. ${p.episodios[0]}`), el('button', { class: 'ghost', on: { click: () => this._pedir({ action: 'manual', id: a.id, episodio: p.episodios[0] }) } }, 'Já assisti (TV/celular)'))));
      }
      return;
    }
    if (this.lista === 'historico') return this._historico(corpo);
    if (this.lista === 'estatisticas') return this._estatisticas(corpo);
    if (this.lista === 'config') return this._config(corpo);
  }

  _cabecalho() {
    const s = this.s;
    const sess = s.sessao;
    const box = el('div', { class: 'card an-topo' });
    const busca = el('input', { type: 'search', placeholder: 'Seguir anime: digite o nome (ex.: Black Clover)', 'aria-label': 'Buscar anime' });
    const res = el('div', { class: 'an-busca' });
    const buscar = async () => {
      const q = busca.value.trim(); if (!q) return;
      const r = await this._pedir({ action: 'buscar', q });
      res.replaceChildren(...(r?.result?.resultados || []).slice(0, 6).map((m) => el('button', { class: 'ghost', on: { click: async () => { await this._pedir({ action: 'seguir', media: m }); res.replaceChildren(); busca.value = ''; } } }, `${m.titulo}${m.formato === 'MOVIE' ? ' (filme)' : m.ano ? ` (${m.ano})` : ''}`)));
      if (!res.childElementCount) res.append(el('span', { class: 'muted' }, 'Nada encontrado.'));
    };
    busca.addEventListener('keydown', (e) => { if (e.key === 'Enter') buscar(); });
    box.append(el('div', { class: 'an-linha' }, busca, el('button', { on: { click: buscar } }, 'Buscar'), el('button', { class: 'ghost', title: 'Atualizar agora', on: { click: () => this._pedir({ action: 'sincronizar' }) } }, '↻')), res);
    if (sess) {
      const a = s.animes.find((x) => x.id === sess.anime);
      const falta = Math.max(0, Math.ceil((sess.faltaMs || 0) / 60e3));
      box.append(el('div', { class: 'an-sessao' },
        el('strong', {}, `Assistindo: ${a?.titulo || ''} ep. ${sess.episodio}`), ` · ${sess.origem === 'auto' ? 'detectado' : 'manual'}${sess.pausada ? ' · pausado' : ''} · ${falta ? `faltam ${falta} min para contar` : 'pronto para concluir'}`,
        el('div', { class: 'buttons' },
          sess.pausada ? el('button', { on: { click: () => this._pedir({ action: 'retomar' }) } }, 'Retomar') : el('button', { class: 'ghost', on: { click: () => this._pedir({ action: 'pausar' }) } }, 'Pausar'),
          el('button', { on: { click: () => this._pedir({ action: 'concluir' }) } }, 'Terminei'),
          el('button', { class: 'ghost', on: { click: () => this._pedir({ action: 'interromper' }) } }, 'Parar por agora'))));
    }
    const e = s.estatisticas;
    box.append(el('p', { class: 'muted' }, `${s.animes.filter((a) => a.pref.acompanhando).length} acompanhados · ${e.episodios} episódios · ${e.moedasTotal} JOJOcoins com anime${s.saldo != null ? ` · saldo ${s.saldo}` : ''}`));
    return box;
  }

  _abas() {
    return el('div', { class: 'an-abas', role: 'tablist' }, LISTAS.map(([id, nome]) => el('button', { class: id === this.lista ? 'on' : 'ghost', role: 'tab', 'aria-selected': id === this.lista ? 'true' : 'false', on: { click: async () => { this.lista = id; if (id === 'calendario') await this._pedir({ action: 'calendario' }); else this.render(); } } }, nome)));
  }

  _filtros() {
    const as = [...this.s.animes, ...(this.s.janela?.itens || [])];
    const generos = [...new Set(as.flatMap((a) => a.generos || []))].sort();
    const plats = [...new Set(as.flatMap((a) => (a.links || []).map((l) => l.site)))].sort();
    const sel = (k, opcoes, rot) => {
      const s = el('select', { 'aria-label': rot, on: { change: () => { this.filtro[k] = k === 'nota' ? Number(s.value) : s.value; this.render(); } } }, el('option', { value: '' }, rot), opcoes.map(([v, t]) => el('option', { value: v, selected: String(this.filtro[k]) === String(v) }, t)));
      return s;
    };
    return el('div', { class: 'an-filtros' },
      sel('genero', generos.map((g) => [g, g]), 'Gênero'), sel('plataforma', plats.map((p) => [p, p]), 'Plataforma'),
      sel('dia', DIAS.map((d, i) => [i, d]), 'Dia'), sel('nota', [[60, '60+'], [70, '70+'], [80, '80+']], 'Nota'),
      sel('situacao', Object.entries(SITUACAO), 'Situação'));
  }

  _cartao(a, e, geral = false) {
    const agora = Date.now();
    const card = el('div', { class: 'card an-card', style: a.cor ? `border-left: 4px solid ${/^#[0-9a-f]{6}$/i.test(a.cor) ? a.cor : '#d9dde6'}` : null });
    const img = el('img', { class: 'an-capa', alt: '', width: 54, height: 76, 'data-url': a.capa || '' });
    if (a.capa) { if (this.capas.has(a.capa)) img.src = this.capas.get(a.capa); else this.obs?.observe(img); }
    const info = el('div', { class: 'an-info' });
    info.append(el('h3', {}, a.titulo, a.pref?.favorito ? ' ★' : ''));
    if (e?.quando) {
      const passou = e.quando <= agora;
      info.append(el('p', {}, `Episódio ${e.episodio} · ${quandoTexto(e.quando, agora, this.tz)} `, el('span', { class: 'muted' }, passou ? '(exibido no Japão)' : '(previsto)')));
      if (!passou) info.append(el('p', { class: 'an-contagem', 'data-ate': e.quando }, contagem(e.quando, agora).texto));
    } else info.append(el('p', { class: 'muted' }, SITUACAO[a.situacao] || 'Sem data confirmada'));
    if (a.previsao) info.append(el('p', { class: 'an-moedas' }, `Vale ${a.previsao.valor} JOJOcoins${a.previsao.bonus.length ? ` (+${a.previsao.bonus.reduce((t, b) => t + b.valor, 0)} de bônus)` : ''}`));
    if (a.pacote) info.append(el('p', { class: 'muted' }, `Visual: ${a.pacote.nome}${a.pacote.completo ? '' : ' (provisório)'}`));
    const vistos = Object.keys(a.prog?.vistos || {}).length;
    if (a.episodios) info.append(el('div', { class: 'bar', title: `${vistos}/${a.episodios}` }, el('span', { style: `width:${Math.min(100, Math.round((vistos / a.episodios) * 100))}%` })));
    const bt = el('div', { class: 'buttons' });
    if (geral && !a.pref?.acompanhando) bt.append(el('button', { on: { click: () => this._pedir({ action: 'seguir', id: a.id }) } }, 'Acompanhar'));
    else if (a.pref?.acompanhando) {
      const ep = a.proximoAssistir;
      if (ep) bt.append(el('button', { on: { click: () => this._pedir({ action: 'iniciar', id: a.id, episodio: ep }) } }, `Assistir ep. ${ep}`), el('button', { class: 'ghost', on: { click: () => this._pedir({ action: 'manual', id: a.id, episodio: ep }) } }, 'Já assisti'));
      for (const l of (a.links || []).filter((x) => x.tipo === 'STREAMING').slice(0, 2)) bt.append(el('button', { class: 'ghost', on: { click: () => this._pedir({ action: 'abrir', id: a.id, url: l.url }) } }, `Assistir agora (${l.site})`));
      bt.append(el('button', { class: 'ghost', on: { click: () => this._pedir({ action: 'configurar', id: a.id, patch: { favorito: !a.pref.favorito } }) } }, a.pref.favorito ? 'Desfavoritar' : 'Favoritar'));
      bt.append(el('button', { class: 'ghost', on: { click: () => this._pedir({ action: 'configurar', id: a.id, patch: { notificar: !a.pref.notificar } }) } }, a.pref.notificar ? 'Silenciar' : 'Avisar'));
      const versao = el('select', { 'aria-label': 'Versão', on: { change: () => this._pedir({ action: 'configurar', id: a.id, patch: { versao: versao.value } }) } }, [['ambos', 'Leg. e dub.'], ['leg', 'Só legendado'], ['dub', 'Só dublado']].map(([v, t]) => el('option', { value: v, selected: a.pref.versao === v }, t)));
      bt.append(versao, el('button', { class: 'ghost', on: { click: () => this._pedir({ action: 'deixar', id: a.id }) } }, 'Deixar de seguir'));
    }
    info.append(bt);
    card.append(img, info);
    return card;
  }

  async _carregarCapa(img) {
    this.obs?.unobserve(img);
    const url = img.dataset.url;
    if (!url) return;
    const r = await this.api.anime({ action: 'capa', url }).catch(() => null);
    if (r?.capa && /^data:image\//.test(r.capa)) { this.capas.set(url, r.capa); img.src = r.capa; }
  }

  _tiqueContagem() {
    if (!this.aberto) return;
    const agora = Date.now();
    for (const p of this.root.querySelectorAll('.an-contagem')) p.textContent = contagem(Number(p.dataset.ate), agora).texto;
  }

  _historico(corpo) {
    const h = this.s.historico;
    if (!h.length) { corpo.append(el('p', { class: 'muted' }, 'Nenhum episódio registrado ainda.')); return; }
    for (const x of h) {
      corpo.append(el('div', { class: `card an-hist${x.corrigido ? ' corrigido' : ''}` },
        el('p', {}, `${new Date(x.em).toLocaleString('pt-BR')} · ${x.titulo} ep. ${x.episodio} · ${x.tipo === 'revisita' ? 'revisita' : 'episódio'} · ${x.verificado ? 'detectado' : 'autodeclarado'} · ${x.total ? `+${x.total} JOJOcoins` : 'sem JOJOcoins'}${x.corrigido ? ' · corrigido' : ''}`),
        x.corrigido ? null : el('button', { class: 'ghost', on: { click: () => this._pedir({ action: 'corrigir', registro: x.id }) } }, 'Registrei por engano')));
    }
  }

  _estatisticas(corpo) {
    const e = this.s.estatisticas;
    corpo.append(el('div', { class: 'card' },
      el('h3', {}, 'Seus números'),
      el('p', {}, `${e.episodios} episódios (${e.verificados} detectados, ${e.autodeclarados} autodeclarados) · ${Math.round(e.minutos / 60)} h · ${e.filmes} filmes · ${e.temporadas} temporadas · ${e.series} séries concluídas`),
      el('p', {}, `JOJOcoins com anime: ${e.moedasTotal} (7 dias: ${e.moedas7d}; 30 dias: ${e.moedas30d})${e.moedasFila ? ` · ${e.moedasFila} esperando a carteira` : ''}`),
      el('p', {}, `Em andamento: ${e.emAndamento} · parados há 30+ dias: ${e.interrompidos}`),
      el('p', {}, `Gêneros: ${e.generos.map(([g, n]) => `${g} (${n})`).join(', ') || '—'}`)));
    corpo.append(el('div', { class: 'card' }, el('h3', {}, 'Quanto rende'), ...this.s.tabela.map((t) => el('p', {}, `${t.nome}: ${typeof t.valor === 'number' ? `${t.valor} JOJOcoins` : t.valor}`)), el('p', { class: 'muted' }, `Teto de ${this.s.limites.tetoDiaEpisodios} JOJOcoins por dia com episódios. Conta só com ~85% assistido (pular abertura e créditos pode).`)));
    if (e.porAnime.length) corpo.append(el('div', { class: 'card' }, el('h3', {}, 'Por anime'), ...e.porAnime.map((p) => el('p', {}, `${p.titulo}: ${p.eps} ep. · ${p.moedas} JOJOcoins`))));
  }

  _config(corpo) {
    const c = this.s.config;
    const chk = (k, rot, extra = null) => { const i = el('input', { type: 'checkbox', checked: !!c[k], on: { change: () => this._pedir({ action: 'geral', patch: { [k]: i.checked } }) } }); return el('label', { class: 'an-opcao' }, i, ` ${rot}`, extra ? el('span', { class: 'muted' }, ` ${extra}`) : null); };
    const alertas = el('div', { class: 'an-alertas' }, ALERTAS.map(([t, rot]) => { const i = el('input', { type: 'checkbox', checked: c.alertasPadrao.includes(t), on: { change: () => { const set = new Set(this.s.config.alertasPadrao); if (i.checked) set.add(t); else set.delete(t); this._pedir({ action: 'geral', patch: { alertasPadrao: [...set] } }); } } }); return el('label', { class: 'an-opcao' }, i, ` ${rot}`); }));
    const fuso = el('select', { 'aria-label': 'Fuso horário', on: { change: () => this._pedir({ action: 'geral', patch: { fuso: fuso.value } }) } }, this.s.fusos.map((f) => el('option', { value: f.id, selected: f.id === c.fuso }, f.nome)));
    corpo.append(el('div', { class: 'card' }, el('h3', {}, 'Avisos padrão'), alertas, el('p', { class: 'muted' }, 'Só dublado: a fonte não publica o horário da dublagem, então não há aviso com hora inventada.')));
    corpo.append(el('div', { class: 'card' }, el('h3', {}, 'Geral'),
      el('label', { class: 'an-opcao' }, 'Fuso: ', fuso),
      chk('todosLancamentos', 'Mostrar todos os lançamentos (não só os que eu sigo)'),
      chk('mostrarRecompensa', 'Mostrar quanto cada episódio vale'),
      chk('resumoDiario', 'Resumo do dia de manhã'),
      this.s.deteccaoDisponivel ? chk('deteccao', 'Detectar o anime que está tocando (sessão de mídia do Windows)', 'Lê só o título da mídia atual, localmente; sem captura de tela.') : el('p', { class: 'muted' }, 'Detecção automática: só no Windows.'),
      el('div', { class: 'buttons' },
        el('button', { class: 'ghost', on: { click: async () => { const r = await this._pedir({ action: 'ics' }); if (r?.result?.salvo) { this.aviso = 'Arquivo .ics salvo. É só importar na sua agenda.'; this.render(); } } } }, 'Exportar para a agenda (.ics)'),
        el('button', { class: 'ghost', on: { click: async () => { const r = await this._pedir({ action: 'auditoria' }); const x = r?.result; if (x) this.aviso = `Cobertura visual: ${x.completos}/${x.total} completos (${x.cobertura}%); ${x.animacoes} animações temáticas.`; this.render(); } } }, 'Auditar visuais'))));
  }
}
