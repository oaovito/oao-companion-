// Loja de JOJOcoins na Central: categorias, busca, filtros, ordenação, pré-visualização
// com o próprio JoJo, compra com confirmação, inventário, histórico e a troca dinâmica de
// visuais. Só gasta recurso aberta: miniaturas desenham quando aparecem na tela e a
// pré-visualização anima só enquanto a loja está visível.
import { node } from './todo-view.js';
import { RigRenderer } from './rig-renderer.js';
import { Animator } from './animator.js';
import { ITENS, CATEGORIAS, RARIDADES, NOME_MOEDA, RESERVA_SALDO, larguraValor } from '../../core/loja-catalogo.js';
import { NIVEL_MINIMO } from '../../core/loja.js';
import { rigComLoja, rigDecor, poseDecor, canaisLook, canalObjeto, poseAura, CANAIS_MEGALODON } from '../../core/loja-arte.js';
import { itensLoja, animDoItem } from '../../core/loja-anims.js';
import { buildAnimation } from '../../core/catalog/recipes.js';
import { iconeItem } from '../../core/loja-icones.js';

const TAMANHOS_MOEDA = [12, 16, 20, 24, 32, 48, 64, 128];
const tamanhoMoeda = (px) => TAMANHOS_MOEDA.find((t) => t >= px) || 128;
const MOEDA_ICONE = (px) => `../../../assets/moeda/jojocoin-${tamanhoMoeda(px)}.png`;
const POR_PAGINA = 30;
const RESERVA_PRECO = larguraValor(Math.max(...ITENS.map((i) => i.preco)));
const fmt = new Intl.NumberFormat('pt-BR');
const ORDEM_RARIDADE = Object.fromEntries(RARIDADES.map((r, i) => [r.id, i]));
const MOTIVOS = { saldo: 'JOJOcoins insuficientes.', nivel: 'Nível do JoJo ainda baixo para este item.', possui: 'Você já tem este item.', estoque: 'Estoque cheio.', quantidade: 'Quantidade inválida.', inexistente: 'Item indisponível.', semEstoque: 'Acabou o estoque.', naoConsumivel: 'Este item não se usa assim.', intervalo: 'Ainda em intervalo. Volte mais tarde.', agora: 'Agora não dá: espere o JoJo ficar livre.', ocupado: 'Aguarde um instante.', naoPossui: 'Compre o item primeiro.' };

/** Valor com o ícone da moeda; largura fixa por número de dígitos (sem pular o layout). */
export function valorMoeda(n, { px = 16, classe = '', reserva = 0 } = {}) {
  const box = node('span', `moeda-valor ${classe}`);
  const img = node('img'); img.src = MOEDA_ICONE(px); img.width = px; img.height = px; img.alt = '';
  img.srcset = `${MOEDA_ICONE(px)} 1x, ${MOEDA_ICONE(px * 1.5)} 1.5x, ${MOEDA_ICONE(px * 2)} 2x`;
  const txt = node('span', 'moeda-num', fmt.format(n)); txt.style.minWidth = `${larguraValor(n, reserva)}ch`;
  box.title = `${fmt.format(n)} ${NOME_MOEDA}`; box.setAttribute('aria-label', `${fmt.format(n)} ${NOME_MOEDA}`);
  box.append(img, txt); return box;
}

/**
 * Anima a moeda quando o saldo muda: a JOJOcoin gira pelo atlas oficial (pula no ganho, treme e
 * gira ao contrário no gasto), o número conta até o novo valor e um "+N"/"−N" sobe e some.
 * `box` contém a <img> da moeda; `num` (opcional) é o texto que conta. Movimento reduzido do
 * Windows: só troca o número e mostra a diferença parada.
 */
export function animarMoeda(box, de, para, { px = 16, num = null } = {}) {
  if (!box || de === para) return;
  const sobe = para > de;
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  clearTimeout(box._moedaFim); cancelAnimationFrame(box._moedaRaf);
  box.querySelectorAll('.moeda-giro, .moeda-delta').forEach((n) => n.remove());
  box.classList.remove('moeda-sobe', 'moeda-gasta', 'animando');
  void box.offsetWidth; // reinicia a animação CSS se vier outra mudança logo em seguida
  const delta = node('span', `moeda-delta ${sobe ? 'sobe' : 'gasta'}`, `${sobe ? '+' : '−'}${fmt.format(Math.abs(para - de))}`);
  delta.setAttribute('aria-hidden', 'true');
  box.append(delta);
  box.classList.add(sobe ? 'moeda-sobe' : 'moeda-gasta');
  if (!reduzido) {
    const img = box.querySelector('img');
    if (img) {
      const giro = node('span', 'moeda-giro'); giro.style.setProperty('--px', `${px}px`);
      giro.style.left = `${img.offsetLeft}px`; giro.style.top = `${img.offsetTop}px`;
      box.append(giro); box.classList.add('animando');
    }
    if (num) {
      const t0 = performance.now(), dur = 800;
      const passo = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3;
        num.textContent = fmt.format(Math.round(de + (para - de) * e));
        if (k < 1) box._moedaRaf = requestAnimationFrame(passo);
      };
      box._moedaRaf = requestAnimationFrame(passo);
    }
  } else if (num) num.textContent = fmt.format(para);
  box._moedaFim = setTimeout(() => {
    box.querySelectorAll('.moeda-giro, .moeda-delta').forEach((n) => n.remove());
    box.classList.remove('moeda-sobe', 'moeda-gasta', 'animando');
    if (num) num.textContent = fmt.format(para);
  }, 1500);
}

export class LojaView {
  constructor(root, api, { onAberta = () => {} } = {}) {
    Object.assign(this, { root, api, onAberta });
    this.f = { cat: 'todas', busca: '', raridade: '', so: '', ordem: 'preco' };
    this.pagina = 1; this.sel = null; this.estado = null; this.arte = null; this.carregando = false; this.raf = 0;
    this._montar();
  }

  _montar() {
    const topo = node('div', 'card loja-topo');
    this.saldoEl = node('div', 'loja-saldo'); this.saldoEl.setAttribute('aria-live', 'polite');
    this.ganhoEl = node('p', 'muted');
    topo.append(node('h2', '', 'Loja do JoJo'), this.saldoEl, this.ganhoEl, node('p', 'muted', `Ganhe ${NOME_MOEDA} usando o JoJo: conversa, cuidados, missões, foco, tarefas e jogos. Sem compras com dinheiro e sem sorteio.`));
    this.cats = node('div', 'loja-cats'); this.cats.setAttribute('role', 'tablist');
    const filtros = node('div', 'loja-filtros');
    const busca = node('input'); busca.type = 'search'; busca.placeholder = 'Buscar na loja'; busca.setAttribute('aria-label', 'Buscar item');
    busca.addEventListener('input', () => { this.f.busca = busca.value.toLocaleLowerCase('pt-BR'); this._lista(true); });
    const sel = (label, opts, chave) => { const s = node('select'); s.setAttribute('aria-label', label); for (const [v, t] of opts) { const o = node('option', '', t); o.value = v; s.append(o); } s.addEventListener('change', () => { this.f[chave] = s.value; this._lista(true); }); return s; };
    filtros.append(busca,
      sel('Raridade', [['', 'Toda raridade'], ...RARIDADES.map((r) => [r.id, r.nome])], 'raridade'),
      sel('Mostrar', [['', 'Todos'], ['meus', 'Meus itens'], ['posso', 'Posso comprar'], ['faltam', 'Ainda não tenho']], 'so'),
      sel('Ordenar', [['preco', 'Menor preço'], ['precoDesc', 'Maior preço'], ['raridade', 'Raridade'], ['nome', 'Nome']], 'ordem'));
    this.feedback = node('p', 'loja-feedback'); this.feedback.setAttribute('role', 'status');
    this.grade = node('div', 'loja-grade'); this.mais = node('button', 'chipbtn', 'Mostrar mais'); this.mais.type = 'button';
    this.mais.addEventListener('click', () => { this.pagina++; this._lista(false); });
    this.painel = node('aside', 'card loja-painel');
    this.visual = node('details', 'card'); this.visual.append(node('summary', '', 'Troca automática de visual'));
    this.inv = node('details', 'card'); this.inv.append(node('summary', '', 'Inventário'));
    this.hist = node('details', 'card'); this.hist.append(node('summary', '', 'Histórico de JOJOcoins'));
    const corpo = node('div', 'loja-corpo'); const col = node('div', 'loja-col');
    col.append(this.cats, filtros, this.feedback, this.grade, this.mais);
    corpo.append(col, this.painel);
    this.root.append(topo, corpo, this.visual, this.inv, this.hist);
    this.obs = new IntersectionObserver((ents) => { for (const e of ents) if (e.isIntersecting) { this.obs.unobserve(e.target); this._miniatura(e.target); } }, { root: this.root });
  }

  /** Abre a loja: catálogo de estado e (uma vez) a arte para as pré-visualizações. */
  async abrir() {
    this.carregando = true; this.feedback.textContent = 'Carregando a loja…';
    const r = await this.api.loja({ action: 'catalogo' });
    this.carregando = false;
    if (!r || r.error) { this.feedback.textContent = r?.error || 'Não consegui abrir a loja agora.'; return; }
    this.feedback.textContent = '';
    this.estado = r.loja; this.visualInfo = r.visual;
    if (!this.arte) {
      const a = await this.api.loja({ action: 'arte' });
      if (a?.rig) {
        const anims = { ...a.anim, animations: { ...a.anim.animations } };
        for (const it of itensLoja()) anims.animations[`cat_${it.id}`] = buildAnimation(it);
        for (const anim of Object.values(anims.animations)) for (const ch of Object.keys(anim.tracks || {})) if (!(ch in anims.channels)) anims.channels[ch] = 0;
        this.arte = { rig: new RigRenderer(rigComLoja(a.rig)), decor: new RigRenderer(rigDecor()), anims };
      }
    }
    this.render();
  }

  fechar() { cancelAnimationFrame(this.raf); this.raf = 0; }

  atualizar(loja) { if (!loja) return; this.estado = { ...this.estado, ...loja }; this._topo(); this._lista(false); this._painel(); this._inventario(); this._historico(); }

  render() { this._topo(); this._categorias(); this._lista(true); this._painel(); this._visual(); this._inventario(); this._historico(); }

  _topo() {
    const e = this.estado; if (!e) return;
    // Saldo mudou com a loja aberta: a moeda gira e o número conta do valor antigo ao novo.
    const antes = this._saldoMostrado; this._saldoMostrado = e.saldo;
    // Mesmo saldo (outra atualização chegando): mantém a moeda como está, sem cortar a animação.
    if (antes === e.saldo && this.saldoEl.firstChild) { this._ganhoTexto(e); return; }
    const box = valorMoeda(e.saldo, { px: 24, classe: 'grande', reserva: RESERVA_SALDO });
    this.saldoEl.replaceChildren(box);
    if (antes != null && antes !== e.saldo) {
      const num = box.querySelector('.moeda-num'); num.textContent = fmt.format(antes);
      animarMoeda(box, antes, e.saldo, { px: 24, num });
    }
    this._ganhoTexto(e);
  }

  _ganhoTexto(e) {
    this.ganhoEl.textContent = `Hoje: +${fmt.format(e.ganhoHoje)} de até ${fmt.format(e.tetoDia)} · total ganho ${fmt.format(e.ganhoTotal)} · gasto ${fmt.format(e.gastoTotal)}${e.escudos ? ` · ${e.escudos} escudo(s) de sequência` : ''}`;
  }

  _categorias() {
    this.cats.replaceChildren();
    for (const c of [{ id: 'todas', nome: 'Tudo', icone: '★' }, ...CATEGORIAS]) {
      const b = node('button', `loja-cat${this.f.cat === c.id ? ' sel' : ''}`, `${c.icone} ${c.nome}`); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(this.f.cat === c.id));
      b.addEventListener('click', () => { this.f.cat = c.id; this._categorias(); this._lista(true); });
      this.cats.append(b);
    }
  }

  _possui(id) { const v = this.estado?.inventario?.[id]; return !!v && (v.permanente || v.qtd > 0); }

  _filtrados() {
    const e = this.estado, f = this.f;
    let l = ITENS.filter((it) => (f.cat === 'todas' || it.tipo === f.cat) && (!f.raridade || it.raridade === f.raridade)
      && (!f.busca || `${it.nome} ${it.desc}`.toLocaleLowerCase('pt-BR').includes(f.busca)));
    if (f.so === 'meus') l = l.filter((it) => this._possui(it.id));
    if (f.so === 'faltam') l = l.filter((it) => !this._possui(it.id) || it.consumivel);
    if (f.so === 'posso') l = l.filter((it) => it.preco <= e.saldo && e.nivel >= (NIVEL_MINIMO[it.raridade] || 1) && (it.consumivel || !this._possui(it.id)));
    const ord = { preco: (a, b) => a.preco - b.preco, precoDesc: (a, b) => b.preco - a.preco, raridade: (a, b) => ORDEM_RARIDADE[a.raridade] - ORDEM_RARIDADE[b.raridade] || a.preco - b.preco, nome: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR') }[f.ordem];
    return l.sort(ord);
  }

  _lista(reset) {
    if (!this.estado) return;
    if (reset) this.pagina = 1;
    const l = this._filtrados();
    this.grade.replaceChildren();
    if (!l.length) this.grade.append(node('p', 'muted', 'Nada encontrado com esses filtros.'));
    for (const it of l.slice(0, this.pagina * POR_PAGINA)) this.grade.append(this._card(it));
    this.mais.classList.toggle('hidden', l.length <= this.pagina * POR_PAGINA);
  }

  _card(it) {
    const b = node('button', `loja-item rr-${it.raridade}${this.sel === it.id ? ' sel' : ''}${this._possui(it.id) ? ' tem' : ''}`); b.type = 'button'; b.dataset.id = it.id;
    const arte = node('div', 'loja-mini'); arte.dataset.id = it.id;
    b.append(arte, node('b', '', it.nome), node('small', 'loja-rar', RARIDADES.find((r) => r.id === it.raridade).nome));
    const pre = node('span', 'loja-preco'); pre.append(valorMoeda(it.preco, { reserva: RESERVA_PRECO }));
    if (this._possui(it.id)) pre.append(node('small', 'ok', it.consumivel ? ` · ${this.estado.inventario[it.id].qtd} no estoque` : ' · seu'));
    b.append(pre);
    b.addEventListener('click', () => { this.sel = it.id; for (const x of this.grade.querySelectorAll('.loja-item.sel')) x.classList.remove('sel'); b.classList.add('sel'); this._painel(); });
    this.obs.observe(arte);
    return b;
  }

  /** Miniatura: ícone vetorial ou o JoJo parado com o item (só quando aparece na tela). */
  _miniatura(el) {
    const it = ITENS.find((x) => x.id === el.dataset.id); if (!it) return;
    const svg = iconeItem(it.id);
    if (svg) { const img = node('img'); img.alt = ''; img.width = 56; img.height = 56; img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`; el.append(img); return; }
    if (!this.arte) return;
    const cv = node('canvas'); const dpr = window.devicePixelRatio || 1; cv.width = 64 * dpr; cv.height = 64 * dpr; cv.style.width = '56px'; cv.style.height = '56px';
    this._desenhar(cv.getContext('2d'), it, 0.5, 64 * dpr, 64 * dpr);
    el.append(cv);
  }

  _pose(it, t) {
    const a = new Animator(this.arte.anims, { rng: () => 0.5 });
    const anim = it.efeito.anim ? `cat_${animDoItem(it.efeito.anim)}` : 'idle';
    a.play(this.arte.anims.animations[anim] ? anim : 'idle', 0, { variant: anim });
    const dur = this.arte.anims.animations[anim]?.duration || 2000;
    const pose = { ...a.sample(it.efeito.anim ? dur * t : 600).pose };
    if (it.efeito.look) Object.assign(pose, canaisLook(it.efeito.look));
    if (it.efeito.recurso === 'aura') Object.assign(pose, poseAura(t * 4));
    if (it.efeito.recurso === 'megalodon') Object.assign(pose, CANAIS_MEGALODON);
    return pose;
  }

  _desenhar(ctx, it, t, w, h) {
    ctx.clearRect(0, 0, w, h);
    const decor = it.efeito.decor ? [it.efeito.decor] : [];
    const larg = decor.length ? 320 : 200, k = Math.min(w / larg, h / 190);
    const origin = { x: (w - 180 * k) / 2, y: (h - 180 * k) / 2 + 4 * k };
    if (decor.length) this.arte.decor.draw(ctx, poseDecor(decor, t * 3), { origin, scale: k, facing: 1 });
    this.arte.rig.draw(ctx, this._pose(it, t), { origin, scale: k, facing: 1 });
  }

  _painel() {
    cancelAnimationFrame(this.raf); this.raf = 0;
    const p = this.painel; p.replaceChildren();
    const it = ITENS.find((x) => x.id === this.sel);
    if (!it || !this.estado) { p.append(node('p', 'muted', 'Escolha um item para ver como fica.')); return; }
    const svg = iconeItem(it.id);
    if (svg && !it.efeito.recurso?.match(/^(aura|megalodon)$/)) {
      const img = node('img', 'loja-previa'); img.alt = ''; img.width = 160; img.height = 160; img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`; p.append(img);
    } else if (this.arte) {
      const cv = node('canvas', 'loja-previa'); const dpr = window.devicePixelRatio || 1; cv.width = 220 * dpr; cv.height = 220 * dpr; cv.style.width = '220px'; cv.style.height = '220px';
      p.append(cv);
      const ctx = cv.getContext('2d'); const t0 = performance.now();
      const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const quadro = (now) => {
        if (!cv.isConnected || this.root.classList.contains('hidden')) { this.raf = 0; return; }
        const dur = (this.arte.anims.animations[`cat_${animDoItem(it.efeito.anim || '')}`]?.duration || 3000);
        this._desenhar(ctx, it, reduzido ? 0.5 : ((now - t0) % dur) / dur, cv.width, cv.height);
        if (!reduzido && (it.efeito.anim || it.efeito.decor || it.efeito.recurso === 'aura')) this.raf = requestAnimationFrame(quadro);
      };
      this.raf = requestAnimationFrame(quadro);
    }
    const tem = this._possui(it.id), inv = this.estado.inventario[it.id];
    const rar = RARIDADES.find((r) => r.id === it.raridade);
    p.append(node('h3', '', it.nome), node('p', `loja-rar r-${it.raridade}`, `${rar.nome} · cerca de ${it.horas < 1 ? `${Math.round(it.horas * 60)} min` : `${String(Math.round(it.horas * 10) / 10).replace('.', ',')} h`} de uso`), node('p', '', it.desc), node('p', 'muted', `“${it.fala}”`));
    const preco = node('p', 'loja-preco-grande'); preco.append(valorMoeda(it.preco, { px: 20 })); p.append(preco);
    const nivelMin = NIVEL_MINIMO[it.raridade] || 1;
    if (nivelMin > 1) p.append(node('p', this.estado.nivel >= nivelMin ? 'muted' : 'aviso', `Requer nível ${nivelMin} do JoJo (agora: ${this.estado.nivel}).`));
    p.append(node('p', 'muted', it.justificativa));
    const acoes = node('div', 'buttons');
    const botao = (txt, fn, cls = 'chipbtn') => { const b = node('button', cls, txt); b.type = 'button'; b.addEventListener('click', fn); acoes.append(b); return b; };
    if (!tem || it.consumivel) {
      const falta = it.preco - this.estado.saldo;
      const comprar = botao(falta > 0 ? `Faltam ${fmt.format(falta)} ${NOME_MOEDA}` : 'Comprar', () => this._confirmar(it), 'chipbtn primario');
      comprar.disabled = falta > 0 || this.estado.nivel < nivelMin || (it.consumivel && (inv?.qtd || 0) >= it.maxEstoque);
    }
    if (tem && it.consumivel && inv.qtd > 0) botao(`Usar (${inv.qtd})`, () => this._acao('usar', it));
    if (tem && it.efeito.anim) botao('Tocar agora', () => this._acao('tocar', it));
    if (tem && it.efeito.roteiro) {
      const cd = this.estado.cooldowns?.[it.id];
      const b = botao(cd ? `Disponível às ${new Date(cd).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Começar', () => this._acao('atividade', it)); b.disabled = !!cd;
    }
    if (tem && (it.efeito.decor || ['aura', 'rastro', 'holofote'].includes(it.efeito.recurso))) {
      const lig = it.efeito.decor ? Object.values(this.estado.ativos.decor).includes(it.efeito.decor) : this.estado.ativos[it.efeito.recurso];
      botao(lig ? 'Desligar' : 'Ligar', () => this._acao('alternar', it, { ligado: !lig }));
    }
    if (tem && it.efeito.look) botao(this.visualInfo?.fixo === it.efeito.look ? 'Soltar visual' : 'Fixar este visual', () => this._fixar(this.visualInfo?.fixo === it.efeito.look ? null : it.efeito.look));
    if (tem && it.efeito.lore) p.append(node('p', 'loja-lore', it.efeito.lore));
    p.append(acoes);
  }

  _confirmar(it) {
    const box = node('div', 'loja-confirma'); box.setAttribute('role', 'alertdialog'); box.setAttribute('aria-label', 'Confirmar compra');
    const txt = node('p'); txt.append(`Comprar ${it.nome} por `, valorMoeda(it.preco), '?');
    const depois = node('p', 'muted', `Saldo depois: ${fmt.format(this.estado.saldo - it.preco)} ${NOME_MOEDA}.`);
    const sim = node('button', 'chipbtn primario', 'Confirmar'); sim.type = 'button';
    const nao = node('button', 'chipbtn', 'Cancelar'); nao.type = 'button';
    const txId = crypto.randomUUID();
    sim.addEventListener('click', async () => { sim.disabled = true; nao.disabled = true; await this._acao('comprar', it, { txId }); box.remove(); });
    nao.addEventListener('click', () => box.remove());
    box.append(txt, depois, sim, nao); this.painel.append(box); sim.focus();
  }

  async _acao(action, it, extra = {}) {
    this.feedback.textContent = 'Confirmando…';
    const r = await this.api.loja({ action, id: it.id, txId: extra.txId || crypto.randomUUID(), ...extra });
    if (!r || r.error) { this.feedback.textContent = r?.error || 'Falhou. Nada foi cobrado.'; return; }
    const res = r.result || {};
    this.feedback.textContent = res.ok === false ? (MOTIVOS[res.motivo] || 'Não deu agora.') : action === 'comprar' ? `${it.nome} é seu. ${res.repetida ? '(Compra já confirmada antes; nada foi cobrado de novo.)' : ''}` : action === 'usar' ? `${it.nome} usado.` : 'Feito.';
    if (action === 'comprar' && res.ok) this.feedback.classList.add('comprou'), setTimeout(() => this.feedback.classList.remove('comprou'), 1200);
    this.estado = r.loja; this.visualInfo = r.visual;
    this._topo(); this._lista(false); this._painel(); this._visual(); this._inventario(); this._historico();
  }

  async _fixar(fixo) {
    const r = await this.api.loja({ action: 'visualFixo', fixo });
    if (r?.visual) { this.visualInfo = r.visual; this._visual(); this._painel(); }
  }

  _visual() {
    const v = this.visualInfo; if (!v) return;
    while (this.visual.children.length > 1) this.visual.lastElementChild.remove();
    const lab = node('label', 'loja-linha'); const cb = node('input'); cb.type = 'checkbox'; cb.checked = v.auto;
    cb.addEventListener('change', async () => { const r = await this.api.loja({ action: 'visualAuto', ligado: cb.checked }); if (r?.visual) { this.visualInfo = r.visual; this._visual(); } });
    lab.append(cb, ' O JoJo troca sozinho entre os visuais liberados, conforme o que está acontecendo');
    this.visual.append(lab, node('p', 'muted', v.fixo ? `Fixado: ${v.opcoes.find((o) => o.id === v.fixo)?.nome || v.fixo}.` : v.atual ? `Agora: ${v.opcoes.find((o) => o.id === v.atual)?.nome || 'visual de nível'} (momentâneo; o que você escolheu no guarda-roupa continua salvo).` : 'Agora: o visual que você escolheu.'));
    if (v.fixo) { const b = node('button', 'chipbtn', 'Soltar visual fixado'); b.type = 'button'; b.addEventListener('click', () => this._fixar(null)); this.visual.append(b); }
  }

  _inventario() {
    while (this.inv.children.length > 1) this.inv.lastElementChild.remove();
    const meus = ITENS.filter((it) => this._possui(it.id));
    if (!meus.length) { this.inv.append(node('p', 'muted', 'Nada comprado ainda.')); return; }
    const l = node('div', 'loja-inv');
    for (const it of meus) { const b = node('button', 'chipbtn', it.consumivel ? `${it.nome} ×${this.estado.inventario[it.id].qtd}` : it.nome); b.type = 'button'; b.addEventListener('click', () => { this.f = { ...this.f, cat: it.tipo, busca: '' }; this.sel = it.id; this._categorias(); this._lista(true); this._painel(); }); l.append(b); }
    const col = ITENS.filter((it) => it.tipo === 'colecionavel');
    this.inv.append(node('p', 'muted', `Estante: ${col.filter((it) => this._possui(it.id)).length}/${col.length} colecionáveis${this.estado.marcos?.colecaoCompleta ? ' · Coleção completa!' : ''}`), l);
  }

  _historico() {
    while (this.hist.children.length > 1) this.hist.lastElementChild.remove();
    const h = this.estado?.historico || [];
    if (!h.length) { this.hist.append(node('p', 'muted', 'Sem movimentações ainda.')); return; }
    for (const x of h.slice(0, 40)) {
      const it = x.item ? ITENS.find((i) => i.id === x.item) : null;
      const linha = node('p', 'muted'); const quando = new Date(x.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      linha.append(`${quando} · `, x.tipo === 'ganho' ? `+${fmt.format(x.valor)} (${x.origem || 'atividade'})` : x.tipo === 'compra' ? `${fmt.format(x.valor)} · ${it?.nome || x.item}` : x.tipo === 'uso' ? `Usou ${it?.nome || x.item}` : 'Escudo de sequência usado');
      this.hist.append(linha);
    }
  }
}
