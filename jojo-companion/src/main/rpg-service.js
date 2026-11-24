// Serviço do RPG (0.48): liga o motor puro (src/core/rpg/motor.js) ao app.
// Observa eventos que já existem (XP confirmado, comida, limpeza, cuidado,
// fim de minijogo, água/alongamento, pesquisa) sem mudar como eles funcionam,
// passa o tempo por minuto (só com uso ativo), entrega XP/JOJOcoins pela fila
// idempotente e conversa por comandos determinísticos (nenhum vai ao modelo).
// Trabalho, foco e tela cheia: nada de fala ou animação; expedições seguem quietas.
import path from 'node:path';
import { AtomicState } from '../core/atomic-state.js';
import { xpVisivel } from '../core/xp-escala.js';
import { Rpg, rpgVazio, validarRpg } from '../core/rpg/motor.js';
import { ATRIBUTOS } from '../core/rpg/atributos.js';
import { HABILIDADES } from '../core/rpg/habilidades.js';
import { ESPECIALIZACOES, ESP_POR_ID, HABILIDADES_ESP } from '../core/rpg/especializacoes.js';
import { REGIOES, RECEITAS, MATERIAIS } from '../core/rpg/mundo.js';

const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[!?.,;:]+/g, ' ').replace(/\s+/g, ' ').trim();
const porNome = (lista, alvo) => { const n = norm(alvo); return n ? lista.find((x) => norm(x.nome) === n || x.id.toLowerCase() === n) || lista.find((x) => n.length >= 4 && norm(x.nome).includes(n)) : null; };
const TODAS_HAB = [...HABILIDADES, ...HABILIDADES_ESP];
const JOGOS_ESTUDO = new Set(['quiz', 'curiosidade', 'enigma', 'sequencia', 'anagrama']);

export function createRpgService({ userData, companion, needsService = null, ipcMain, fromApp, fromOverlay = () => false, notify = () => {}, log = () => {}, rng = Math.random }) {
  const p = companion.progress;
  const disk = new AtomicState(path.join(userData, 'rpg.json'), { validate: validarRpg, defaults: rpgVazio, log });
  const canExpress = (related = false) => companion._canNag() && !companion.focus && !companion.work && !companion.game && !companion.fullscreenIds?.length && !companion.fullscreenHidden
    && !(companion.bubble && !related) && !companion.chatQueue && !companion.dragging && !['fleeing', 'hidden'].includes(companion.avoid?.state);
  const award0 = p.award.bind(p);
  const rpg = new Rpg({
    state: disk.load(), save: (s) => disk.write(s), rng,
    award: (r) => award0(r),
    // Carteira da loja (outra frente): enquanto não existir, as JOJOcoins esperam na fila.
    creditar: (x) => (companion.loja?.creditar ? companion.loja.creditar(x) : { pending: true }),
    nivel: () => p.nivel, xpTotal: () => p.st.xp, threshold: (n) => p.threshold(n), clockHealthy: () => p.clockHealthy(),
  });
  // Sessão anterior: base dos segredos de "voltou de um sumiço".
  const ausenciaHoras = rpg.st.ultimaSessao ? Math.max(0, (Date.now() - rpg.st.ultimaSessao) / 3600e3) : 0;
  let ausenciaUsada = false;

  // ------------------------------------------------------------ fala e animação

  const falar = (texto, anim = null, { related = false, spontaneous = true } = {}) => {
    if (!texto || !canExpress(related)) return false;
    if (anim) companion.playCatalog(anim, { source: 'evento', speak: false });
    companion.say(texto, 'speech', spontaneous ? { spontaneous: true, category: 'rpg' } : undefined);
    return true;
  };
  const anim = (id) => { if (id && canExpress(true)) companion.playCatalog(id, { source: 'evento', speak: false }); };
  /** Resume o que um evento rendeu (missão, cadeia, secreta, combo, rank, doença) numa frase. */
  function resumo(out) {
    if (!out) return null;
    const partes = [];
    for (const m of out.missoes || []) partes.push(`${m.rotulo}${m.xp ? ` (+${xpVisivel(m.xp)} XP)` : ''}.${m.historia ? ` ${m.historia}` : ''}`);
    for (const c of out.combos || []) partes.push(`${c.nome}! ${c.txt}`);
    if (out.rankEsp) partes.push(`${out.rankEsp.esp.nome} subiu para o rank ${out.rankEsp.rank}.`);
    for (const a of out.artefatos || []) partes.push(`Artefato novo: ${a.nome}.`);
    return partes.length ? partes.join(' ') : null;
  }
  function animDe(out) {
    if (!out) return null;
    if (out.secretas?.length || out.combos?.length) return 'rpg_segredo';
    if (out.rankEsp) return 'rpg_rank';
    if (out.artefatos?.length) return 'rpg_artefato';
    if (out.missoes?.length || out.cadeias?.length || out.longos?.length) return 'rpg_missao';
    if (out.doencas?.length) return 'rpg_doente';
    if (out.curadas?.length) return 'rpg_curado';
    return null;
  }

  // ------------------------------------------------------------ eventos reais

  function evento(tipo, n = 1, ctx = {}) {
    let out = null;
    try { out = rpg.evento(tipo, n, { needs: companion.needs, ...ctx }); } catch { log('warn', 'RPG: evento não confirmado no disco.'); return null; }
    entregar();
    const txt = resumo(out);
    if (txt) falar(txt, animDe(out));
    else if (out?.doencas?.length) falar(`Ficou com ${out.doencas.join(', ')}. Água, comida boa e cuidado resolvem.`, 'rpg_doente');
    return out;
  }
  // XP confirmado por outros sistemas vira evento do RPG (sem dar XP de novo; só o bônus dos atributos).
  function observar(reward, r) {
    if (!r || r.duplicate || !r.amount || ['rpg', 'bonus'].includes(reward.source)) return;
    const xpBase = Number(reward.amount) || 0;
    if (reward.source === 'todo') return void evento('tarefa', 1, { xpBase });
    if (reward.source === 'darkest') return void evento('jogo');
    if (reward.source !== 'interaction') return;
    const a = reward.atividade;
    if (a === 'gesto') evento('carinho');
    else if (a === 'chat') evento('chat');
    else if (a === 'foco') evento('foco', 1, { xpBase });
    else if (a === 'missao') evento('missao');
    else if (a === 'timer') { evento('timer', 1, { xpBase }); if (/exerc|along|treino|flex|agach/i.test(reward.label || '')) evento('treino'); }
  }
  p.award = (reward) => {
    const r = award0(reward);
    try { observar(reward, r); } catch { /* o RPG nunca derruba a recompensa original */ }
    if (r?.levelUp) queueMicrotask(sincronizar);
    return r;
  };
  const missao0 = p.missionEvent.bind(p);
  p.missionEvent = (ev, date) => {
    const r = missao0(ev, date);
    if (ev === 'agua' || ev === 'alongar') { try { evento(ev === 'agua' ? 'agua' : 'treino'); } catch { /* idem */ } }
    return r;
  };
  if (needsService?.model) {
    const m = needsService.model;
    const feed0 = m.feed.bind(m), clean0 = m.clean.bind(m), care0 = m.care.bind(m);
    m.feed = (id) => {
      const nova = !m.st.foods?.[id];
      const r = feed0(id);
      if (r?.fed) { evento('comida', 1, { comida: id }); if (nova) evento('comidaNova'); }
      return r;
    };
    m.clean = (id) => { const r = clean0(id); if (r?.cleaned) evento('limpeza'); return r; };
    m.care = () => {
      const r = care0();
      if (r?.cared) { try { rpg.mutar(() => rpg.marcarCuidado()); } catch { /* segue */ } evento('cuidado'); }
      return r;
    };
  }
  companion.onGameEnd = (g, win) => {
    if (!g) return;
    if (!win) return void evento('jogo');
    if (JOGOS_ESTUDO.has(g.tipo)) { evento('estudo'); if (g.tipo === 'quiz') evento('vitoriaQuiz'); }
    if (g.tipo === 'treino' || g.tipo === 'cabo') evento('treino');
    evento('vitoria');
  };
  companion.onPesquisa = () => evento('pesquisa');
  // Minijogos: dificuldade cresce com o nível; dicas vêm da Inteligência (nunca limita a conversa).
  companion.rpgJogoContexto = () => {
    let e = {}; try { e = rpg.efeitos(); } catch { /* sem bônus */ }
    return { dificuldade: 1 + Math.floor(Math.min(200, p.nivel) / 45), dicas: e.dicasQuiz || 0 };
  };

  // ------------------------------------------------------------ fila, níveis e tempo

  function entregar() {
    try { if (rpg.drain()) update(); } catch { /* a fila tenta de novo no próximo minuto */ }
  }
  function sincronizar() {
    let ganhos = [];
    try { ganhos = rpg.sincronizarNivel(); } catch { log('warn', 'RPG: recompensa de nível não confirmada; tento de novo.'); return; }
    entregar();
    if (!ganhos.length) return;
    const ult = ganhos[ganhos.length - 1];
    const desb = ganhos.flatMap((g) => g.desbloqueios || []);
    if (ult.estrela) falar(`Estrela de Prestígio ${rpg.snapshot().estrela}. Nada apagado: tudo somado.`, 'rpg_estrela');
    else if (desb.some((d) => d.tipo === 'habilidade' && /lend/i.test(d.nome))) falar(`${desb.map((d) => d.nome).join('. ')}.`, 'rpg_lendario');
    else if (desb.length) falar(`Liberado: ${desb.slice(0, 3).map((d) => d.nome).join(', ')}.`, 'rpg_habilidade');
    update();
  }
  let ultimoMono = companion.clock.now(), minutosAtivos = 0, ultimoPedido = 0;
  const beforeTick = companion.onRoutineTick;
  companion.onRoutineTick = () => {
    beforeTick?.();
    const agora = companion.clock.now(), ms = agora - ultimoMono; ultimoMono = agora;
    if (!p.clockHealthy() || companion.suspended || companion.paused) return;
    const tela = !!(companion.fullscreenHidden || companion.fullscreenIds?.length);
    const ativo = !companion.work && !companion.focus && !tela;
    const hora = new Date().getHours();
    try {
      rpg.st.ultimaSessao = Date.now();
      const out = rpg.tick(ms, { ativo, repouso: !!companion.work, dormindo: companion.behavior?.state === 'sleep', hora, needs: companion.needs, categoria: companion.appCategoria || null, frio: false });
      if (!out) return;
      entregar(); sincronizar();
      for (const ex of out.expedicoes) falar(ex.texto, ex.sucesso ? 'rpg_volta' : 'rpg_falha', { related: true });
      if (out.encruzilhada && !rpg.st.flags.avisada?.[out.encruzilhada.expedicao]) {
        if (falar(`${out.encruzilhada.regiao.nome}: ${out.encruzilhada.txt} ${out.encruzilhada.opcoes.map((o) => `${o.id}) ${o.txt}`).join(' ou ')}? Responde "a" ou "b" (ou eu decido sozinho).`, 'rpg_encruzilhada')) {
          rpg.mutar(() => { rpg.st.flags.avisada = { [out.encruzilhada.expedicao]: true }; });
        }
      }
      if (out.doencas?.length) falar('Não estou nos meus melhores dias. Água, comida de verdade e um cuidado na Central.', 'rpg_doente');
      if (out.exploracao) falar(`Explorando ${out.exploracao.regiao.nome} enquanto você trabalha nela: achei ${MATERIAIS[out.exploracao.material] || out.exploracao.material}.`, null);
      if (ativo) {
        minutosAtivos++;
        if (minutosAtivos % 10 === 0) {
          const s = rpg.checarSegredos({ categoria: companion.appCategoria || null, clima: companion.climaAgora || null, ausenciaHoras: ausenciaUsada ? 0 : ausenciaHoras, streak: p.st.contas?.streak || 0 });
          ausenciaUsada = true;
          if (s) { entregar(); falar(`${s.novo ? 'Segredo! ' : ''}${s.segredo.nome}: ${s.texto}${resumo(s) ? ` ${resumo(s)}` : ''}`, s.anim || 'rpg_segredo'); }
        }
        pedido(hora);
      }
      update();
    } catch { log('warn', 'RPG: passagem de tempo não confirmada no disco.'); }
  };
  // Pedidos espontâneos raros (uma vez a cada 45 min no máximo), nunca no Trabalho/foco/tela cheia.
  function pedido(hora) {
    const agora = Date.now();
    if (agora - ultimoPedido < 45 * 60e3 || !canExpress()) return;
    const v = rpg.st.vida;
    let t = null, a = null;
    if (v.sede < 25) { t = 'Sede. Um tubarão desidratado é só um peixe triste. Água no cardápio, e bebe você também.'; a = 'rpg_sede'; }
    else if (v.energia < 15 && hora >= 6 && hora < 21) { t = 'Energia no fim. Dormir? De dia, nunca. Comida e água resolvem.'; a = 'rpg_energia'; }
    else if (v.tedio > 75) { t = 'Tédio no talo. Um minijogo, uma expedição ou uma conversa. Escolhe.'; a = 'rpg_entediado'; }
    else if (v.carinho < 20) { t = 'Ninguém me dá atenção. Não que eu precise. Um clique não mata.'; a = 'rpg_carente'; }
    else if (rpg.st.esp.atual && rng() < 0.2) { const e = ESP_POR_ID.get(rpg.st.esp.atual); t = e.falas[Math.floor(rng() * e.falas.length) % e.falas.length]; }
    if (t && falar(t, a)) ultimoPedido = agora;
  }

  // ------------------------------------------------------------ ações (IPC e conversa)

  function resultado(r, { falarOk = true } = {}) {
    if (r?.ok && falarOk) {
      const txt = [r.texto || r.fala, resumo(r)].filter(Boolean).join(' ');
      if (txt) falar(txt, r.anim || animDe(r) || null, { related: true, spontaneous: false });
    }
    entregar(); update(); return r;
  }
  const ACOES = {
    investir: (q) => rpg.investir(q.id, q.n || 1),
    aprender: (q) => rpg.aprender(q.id),
    usar: (q) => {
      const r = rpg.usarHabilidade(q.id);
      if (r.ok && r.abrirJogo && !companion.game && canExpress(true)) companion.clock.setTimeout(() => { if (!companion.game) companion.say(companion.startGame(r.abrirJogo), 'speech'); }, 2500);
      if (r.ok && r.expedicoes) for (const ex of r.expedicoes) companion.clock.setTimeout(() => falar(ex.texto, ex.sucesso ? 'rpg_volta' : 'rpg_falha', { related: true }), 3000);
      return r;
    },
    especializar: (q) => { const r = rpg.especializar(q.id); if (r.ok) anim(`rpg_esp_${q.id}`); return r; },
    expedicao: (q) => { const r = rpg.iniciarExpedicao(q.regiao || null, { categoria: companion.appCategoria || null }); if (r.ok) r.anim = 'rpg_partida'; return r; },
    escolher: (q) => rpg.escolher(q.opcao),
    fabricar: (q) => { const r = rpg.fabricar(q.id); if (r.ok) r.anim = 'rpg_fabricar'; return r; },
    equipar: (q) => rpg.equipar(q.id),
    desequipar: (q) => rpg.desequipar(q.id),
    auto: (q) => ({ ok: true, auto: rpg.setAuto(!!q.valor) }),
    titulo: (q) => ({ ok: rpg.setTitulo(q.titulo ?? null) }),
  };
  function agir(acao, q = {}) {
    if (!ACOES[acao]) return { ok: false, motivo: 'Operação desconhecida.' };
    try { return resultado(ACOES[acao](q)); } catch { return { ok: false, motivo: 'Não consegui confirmar no disco. Nada foi gasto.' }; }
  }

  function ficha() {
    const s = rpg.snapshot();
    const top = [...s.atributos].sort((a, b) => b.valor - a.valor).slice(0, 3).map((a) => `${a.nome} ${a.valor}`).join(', ');
    const esp = s.especializacao ? ESP_POR_ID.get(s.especializacao).nome : 'nenhuma';
    return `Nível ${s.nivel}${s.paragon ? ` (Paragon ${s.paragon})` : ''}${s.tituloAtivo ? `, ${s.tituloAtivo}` : ''}. Especialização: ${esp}. Melhores atributos: ${top}. Pontos livres: ${s.pontos.atributo} de atributo, ${s.pontos.habilidade} de habilidade. Vínculo: ${s.vinculo.nome}.`;
  }
  function vida() {
    const s = rpg.snapshot(), v = s.vida;
    return `Sede ${v.sede}/100, energia ${v.energia}/100, tédio ${v.tedio}/100, carinho ${v.carinho}/100, confiança ${v.confianca}/100, satisfação ${v.satisfacao}/100.${v.doencas.length ? ` Doente: ${v.doencas.map((d) => d.nome).join(', ')}.` : ''}`;
  }
  const textoDe = (r, ok) => (r.ok ? ([r.texto || r.fala || ok, resumo(r)].filter(Boolean).join(' ')) : r.motivo);

  companion.rpgChat = (texto) => {
    const n = norm(texto).replace(/^jojo /, '');
    if (!n || n.length > 90) return null;
    // Códigos secretos: frase exata, uma vez cada.
    try {
      const c = rpg.codigo(texto);
      if (c) { entregar(); anim(c.anim); update(); return [c.texto, resumo(c)].filter(Boolean).join(' '); }
    } catch { return 'Não consegui registrar o código agora. Tenta de novo daqui a pouco.'; }
    // Encruzilhada pendente: "a"/"b" ou o texto da opção (fora de minijogo).
    const enc = rpg.encruzilhadaPendente();
    if (enc && !companion.game) {
      const m = n.match(/^(?:opcao |escolho |vai de |vai pela |vai pelo )?([ab])$/);
      const op = m ? m[1] : enc.opcoes.find((o) => norm(o.txt) === n)?.id;
      if (op) { const r = agir('escolher', { opcao: op }); return textoDe(r); }
    }
    if (/^(?:abre|abrir|mostra|mostrar) (?:a |o |minha |sua )?(?:aventura|rpg|ficha|arvore de habilidades|expedicoes)$/.test(n)) { companion.openApp('aventura'); return 'Aventura aberta na Central: atributos, habilidades, expedições e segredos.'; }
    if (/^(?:minha |sua |a )?ficha(?: do rpg)?$|^(?:meus |seus |os )?atributos$|^status do rpg$/.test(n)) return ficha();
    if (/^(?:como (?:esta|ta|vai) (?:sua|a sua) (?:sede|energia)|voce (?:ta|esta) com sede|ta com sede|esta com sede|voce (?:ta|esta) entediado|como (?:esta|ta) seu vinculo)$/.test(n)) return vida();
    if (/^(?:missoes|missao) (?:da semana|semanais?)$/.test(n)) {
      const s = rpg.snapshot();
      return s.semana.length ? s.semana.map((m) => `${m.ok ? 'Feita' : `${m.feito}/${m.n}`}: ${m.txt}`).join(' | ') : 'Missões semanais liberam no nível 3.';
    }
    if (/^(?:me da uma |da uma |tem alguma )?pista$/.test(n)) {
      let e = {}; try { e = rpg.efeitos(); } catch { /* idem */ }
      return (e.pista ? rpg.pista() : null) || 'Sem pista agora. Percepção mais alta ou a habilidade Faro de Sangue ajudam.';
    }
    let m = n.match(/^(?:como (?:esta|ta) a |status da )expedicao$/);
    if (m) {
      const s = rpg.snapshot();
      return s.expedicoes.length ? s.expedicoes.map((x) => `${x.nome}: ${x.progresso}% (faltam ~${x.minutos} min), chance ${x.chance}%${x.escolha ? `, escolha: ${x.escolha}` : ''}.`).join(' ') : 'Nenhuma expedição em andamento.';
    }
    m = n.match(/^(?:vai |faz |faca |parte |partir |comeca |começa )?(?:uma |numa |pra uma |para uma )?expedicao(?: (?:em|no|na|para|pra|pro|ao|a) (?:o |a )?(.+))?$/);
    if (m) {
      let regiao = null;
      if (m[1]) { const r = porNome(REGIOES, m[1]); if (!r) return `Não conheço essa região. Tem: ${REGIOES.map((x) => x.nome).join(', ')}.`; regiao = r.id; }
      return textoDe(agir('expedicao', { regiao }));
    }
    m = n.match(/^(?:usa|usar|use|ativa|ativar) (?:a |o )?(?:habilidade |poder )?(.+)$/);
    if (m) { const h = porNome(TODAS_HAB.filter((x) => x.acao), m[1]); if (h) return textoDe(agir('usar', { id: h.id })); }
    m = n.match(/^(?:aprende|aprender|aprenda) (?:a |o )?(?:habilidade |poder )?(.+)$/);
    if (m) { const h = porNome(HABILIDADES, m[1]); if (h) return textoDe(agir('aprender', { id: h.id }), `Aprendido: ${h.nome}.`); }
    m = n.match(/^(?:especializa(?:r|-se)?|especializacao|vira|virar|seja) (?:em |como |o |a |um |uma )?(.+)$/);
    if (m) { const e = porNome(ESPECIALIZACOES, m[1]); if (e && norm(e.nome) === norm(m[1]).replace(/^(?:o|a) /, '')) return textoDe(agir('especializar', { id: e.id })); }
    m = n.match(/^(?:fabrica|fabricar|fabrique|prepara|preparar) (?:a |o |uma |um )?(.+)$/);
    if (m) { const r = porNome(RECEITAS, m[1]); if (r) return textoDe(agir('fabricar', { id: r.id })); }
    m = n.match(/^(?:investe|investir|invista|bota|coloca) (?:(\d{1,3}) )?(?:pontos? )?(?:em|na|no) (.+)$/);
    if (m) { const a = porNome(ATRIBUTOS, m[2]); if (a) return textoDe(agir('investir', { id: a.id, n: Number(m[1] || 1) }), `${a.nome} reforçado.`); }
    return null;
  };

  // ------------------------------------------------------------ Central

  function snapshot() { return { ...rpg.snapshot(), carteira: !!companion.loja }; }
  function update() { notify(); }
  rpg.mudou = () => update();
  ipcMain.handle('rpg:request', (e, q) => {
    if ((!fromApp(e) && !fromOverlay(e)) || !q || typeof q !== 'object' || typeof q.action !== 'string') return { error: 'Solicitação indisponível.' };
    if (q.action === 'snapshot') return { rpg: snapshot() };
    const r = agir(q.action, q);
    return { result: r, rpg: snapshot() };
  });
  companion.rpg = { motor: rpg, snapshot, agir, evento };
  sincronizar(); entregar();
  return { rpg, snapshot, agir, evento, sincronizar, update, close: () => ipcMain.removeHandler('rpg:request') };
}
