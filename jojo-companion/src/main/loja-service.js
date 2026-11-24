// Serviço da loja de JOJOcoins: carteira em <userData>/loja.json (gravação
// atômica com cópia anterior), ganho por reconciliação das recompensas confirmadas da
// progressão, efeitos idempotentes nas necessidades e nas missões, e o canal da Central.
// Só a Central chama a loja; o overlay apenas desenha o estado.
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AtomicState } from '../core/atomic-state.js';
import { Loja, lojaVazia, validarLoja } from '../core/loja.js';
import { ITENS, CATEGORIAS, RARIDADES, NOME_MOEDA, item as itemLoja } from '../core/loja-catalogo.js';
import { NIVEL_MINIMO } from '../core/loja.js';
import { logicalDay } from '../core/civil-time.js';

export function createLojaService({ userData, companion, needsService, ipcMain, fromApp, readJSON = null, notify = () => {}, log = () => {} }) {
  const disk = new AtomicState(path.join(userData, 'loja.json'), { validate: validarLoja, defaults: lojaVazia, log });
  let estado;
  try { estado = disk.load(); } catch { estado = lojaVazia(); }
  const loja = new Loja({ state: estado, save: (st) => disk.write(st), dia: (ms) => logicalDay(ms), escala: companion.progress.escala || 10 });
  loja.changed = () => { companion._applyLayout?.(true); notify(); };

  // Ganho: toda recompensa confirmada vira JOJOcoins (inclusive as que chegaram com o app fechado).
  const reconciliar = () => {
    let n = 0;
    try { n = loja.reconciliar(companion.progress.st.rewards?.history || []); } catch { log('warn', 'Carteira de JOJOcoins não confirmada no disco; tento de novo na próxima recompensa.'); }
    // Ganho grande vira pilha de moedas; o normal sobe girando com brilho.
    if (n >= 40) companion._lojaMoedas?.('pilha', 10);
    else if (n > 0) companion._lojaMoedas?.('ganho', Math.min(8, Math.ceil(n / 10)));
    return n;
  };
  const antesAward = companion.progress.onAward;
  companion.progress.onAward = (ev) => { antesAward?.(ev); reconciliar(); };
  companion.progress.bonusPorDia = () => loja.mods().bonus || 0;

  // Efeitos dos consumíveis: necessidades (comidas, cuidados) e missões (poderes de ação).
  const model = needsService?.model;
  if (model) model.mods = () => loja.mods();
  const dia = () => logicalDay(Date.now());
  const aplicar = (p) => {
    if (p.tipo === 'comida' || p.tipo === 'cuidado' || p.efeito.acao === 'cuidadoExpress') {
      if (!model) return false;
      const ok = model.aplicarLoja(p); needsService.update(); return ok;
    }
    if (p.efeito.acao === 'trocarMissao') return companion.progress.trocarMissao(p.id);
    if (p.efeito.acao === 'missaoExtra') return companion.progress.missaoExtra(p.id);
    return true;
  };
  companion.lojaHumor = (n, itemId) => { try { model?.aplicarLoja({ id: `atv:${dia()}:${itemId}`, tipo: 'cuidado', nome: itemLoja(itemId)?.nome || '', efeito: { humor: n } }); needsService?.update(); } catch { /* humor é bônus; a atividade continua */ } };

  companion.lojaConectar(loja);
  reconciliar();
  loja.drenar(aplicar);

  const nivel = () => companion.progress.nivel;
  const resumo = () => ({ ...loja.resumo(), nivel: nivel() });
  const catalogo = () => ({ moeda: NOME_MOEDA, categorias: CATEGORIAS, raridades: RARIDADES, nivelMinimo: NIVEL_MINIMO,
    itens: ITENS.map((it) => ({ id: it.id, tipo: it.tipo, nome: it.nome, desc: it.desc, fala: it.fala, preco: it.preco, raridade: it.raridade, consumivel: it.consumivel, maxEstoque: it.maxEstoque, horas: it.horas, indice: it.indice, justificativa: it.justificativa, efeito: it.efeito })) });

  ipcMain.handle('loja:request', (e, req) => {
    if (!fromApp(e) || !req || typeof req !== 'object') return { error: 'Solicitação indisponível.' };
    try {
      const id = typeof req.id === 'string' ? req.id.slice(0, 8) : '';
      const txId = typeof req.txId === 'string' && /^[\w-]{8,80}$/.test(req.txId) ? req.txId : randomUUID();
      let result = null;
      switch (req.action) {
        case 'catalogo': return { catalogo: catalogo(), loja: resumo(), visual: visualInfo() };
        case 'resumo': return { loja: resumo(), visual: visualInfo() };
        // Arte para a pré-visualização da Central (rig e repouso); pedida uma vez, quando a loja abre.
        case 'arte': {
          if (!readJSON) return { error: 'Pré-visualização indisponível.' };
          const a = readJSON('assets/animations/jojo.animations.json');
          return { rig: readJSON('assets/character/jojo.rig.json'), anim: { style: a.style, channels: a.channels, animations: { idle: a.animations.idle } } };
        }
        case 'comprar': {
          const qtd = Number.isInteger(req.qtd) ? req.qtd : 1;
          result = loja.comprar({ txId, id, qtd, nivel: nivel() });
          if (result.ok && !result.repetida) companion.lojaReagirCompra(id);
          break;
        }
        case 'usar': {
          result = loja.usar({ txId, id });
          if (result.ok && !result.repetida) { loja.drenar(aplicar); reacaoUso(id); }
          break;
        }
        case 'alternar': result = loja.alternar(id, !!req.ligado); break;
        case 'tocar': result = companion.lojaTocar(id); break;
        case 'atividade': result = companion.lojaAtividade(id); break;
        case 'visualAuto': companion.store.update({ visualAuto: !!req.ligado }); companion._visualDecidir(); result = { ok: true }; break;
        case 'visualFixo': {
          const fixo = typeof req.fixo === 'string' && /^[a-z]{2}\d{2,3}$/.test(req.fixo) ? req.fixo : null;
          companion.store.update({ visualFixo: fixo }); companion._visualDecidir(); result = { ok: true }; break;
        }
        default: return { error: 'Operação desconhecida.' };
      }
      return { result, loja: resumo(), visual: visualInfo() };
    } catch (err) {
      log('warn', `Loja: ${err.message}`);
      return { error: 'Não consegui confirmar a operação no disco. Seu saldo não mudou.' };
    }
  });

  function reacaoUso(id) {
    const it = itemLoja(id);
    if (!it || !companion._lojaPodeReagir()) return;
    if (it.tipo === 'comida') companion.playCatalog('needsComer', { source: 'evento', speak: false });
    else if (it.tipo === 'cuidado') companion.playCatalog('needsRecuperar', { source: 'evento', speak: false });
    if (it.fala) companion.say(it.fala, 'speech');
  }

  // Troca dinâmica: o que está vestido agora e as opções para fixar (só autorizadas).
  function visualInfo() {
    const cfg = companion.store.get();
    const lista = companion._visuaisAutorizados();
    return { auto: cfg.visualAuto !== false, fixo: cfg.visualFixo || null, atual: companion.visualMomento?.id || null,
      opcoes: lista.filter((c) => c.origem === 'loja' || c.inteiro).map((c) => ({ id: c.id, nome: c.nome, origem: c.origem })).slice(0, 120) };
  }

  return { loja, reconciliar, close: () => ipcMain.removeHandler('loja:request') };
}
