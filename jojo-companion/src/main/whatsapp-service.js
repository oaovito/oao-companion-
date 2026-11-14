// Mensagens programadas no WhatsApp, lado do processo principal: liga o
// processo isolado do WhatsApp (whatsapp-worker.mjs), guarda agenda e contatos
// só neste PC e roda o relógio dos envios. Tudo é injetável para os testes
// usarem um WhatsApp simulado (nenhum teste conecta de verdade).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AtomicState } from '../core/atomic-state.js';
import { WhatsAppAgenda, sanitizeItem, numeroParaJid, descreverQuando, WA_LIMITES } from '../core/whatsapp.js';

export const WA_TICK_MS = 20e3;
export const WA_PRIMEIRO_TICK_MS = 15e3;
export const WA_WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'whatsapp-worker.mjs');

const contatoValido = (c) => c && typeof c.jid === 'string' && /@(s\.whatsapp\.net|g\.us)$/.test(c.jid) && typeof c.nome === 'string' && c.nome.trim();
const limparContatos = (lista, tipo) => (Array.isArray(lista) ? lista : []).filter(contatoValido).slice(0, 5000).map((c) => ({ jid: c.jid, nome: c.nome.trim().slice(0, 80), tipo }));

export function createWhatsAppService({ userData, companion, spawn, toDataURL, log = () => {}, notify = () => {}, now = () => Date.now(),
  setTimer = (fn, ms) => setInterval(fn, ms), clearTimer = (t) => clearInterval(t), later = (fn, ms) => setTimeout(fn, ms), requestTimeoutMs = 30e3 }) {
  const base = path.join(userData, 'whatsapp');
  const sessao = path.join(base, 'sessao');
  const agendaDisk = new AtomicState(path.join(base, 'agendamentos.json'), { defaults: () => ({ itens: [] }), validate: (d) => {
    if (!d || !Array.isArray(d.itens)) throw new Error('Agenda do WhatsApp inválida.');
    return { itens: d.itens.map(sanitizeItem).filter((i) => i && i.id) };
  } });
  const contatosDisk = new AtomicState(path.join(base, 'contatos.json'), { defaults: () => ({ contatos: [], grupos: [] }), validate: (d) => {
    if (!d || typeof d !== 'object') throw new Error('Contatos do WhatsApp inválidos.');
    return { contatos: limparContatos(d.contatos, 'contato'), grupos: limparContatos(d.grupos, 'grupo') };
  } });
  const mudou = () => { try { notify(); } catch { /* janela fechada */ } };
  const agenda = new WhatsAppAgenda({ load: () => agendaDisk.load().itens, save: (itens) => { agendaDisk.write({ itens }); mudou(); }, now });
  let lista = contatosDisk.load();
  const temSessao = () => fs.existsSync(path.join(sessao, 'creds.json'));
  let conexao = { estado: 'desligado', qr: null, numero: null, motivo: null };
  let child = null, seq = 0, timer = null, enviando = false, pediuConexao = false, fechado = false;
  const pendentes = new Map();
  const evento = (ev) => { try { companion.whatsappEvento?.(ev); } catch (e) { log('warn', `Aviso do WhatsApp falhou: ${e.message}`); } };
  const setConexao = (patch) => { conexao = { ...conexao, ...patch }; mudou(); };

  function onMessage(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'ready') child?.postMessage({ type: 'start', dir: sessao });
    else if (m.type === 'qr' && typeof m.qr === 'string') {
      Promise.resolve(toDataURL(m.qr)).then((qr) => setConexao({ estado: 'qr', qr, motivo: null })).catch(() => setConexao({ estado: 'erro', qr: null, motivo: 'falha_envio' }));
    } else if (m.type === 'status') {
      const antes = conexao.estado;
      setConexao({ estado: m.estado, motivo: m.motivo || null, numero: m.numero || (m.estado === 'conectado' ? conexao.numero : m.estado === 'desligado' ? null : conexao.numero), ...(m.estado !== 'qr' ? { qr: null } : {}) });
      if (m.estado === 'conectado' && antes !== 'conectado' && pediuConexao) { pediuConexao = false; evento({ tipo: 'conectado' }); }
      if (m.estado === 'desligado' && m.motivo === 'sessao_desconectada') { lista = { contatos: [], grupos: [] }; contatosDisk.write(lista); evento({ tipo: 'desconectado', motivo: m.motivo }); }
    } else if (m.type === 'contatos' || m.type === 'grupos') {
      const chave = m.type === 'contatos' ? 'contatos' : 'grupos';
      lista = { ...lista, [chave]: limparContatos(m.lista, m.type === 'contatos' ? 'contato' : 'grupo') };
      contatosDisk.write(lista);
      mudou();
    } else if (m.type === 'result') {
      const p = pendentes.get(m.id);
      if (p) { pendentes.delete(m.id); p(m); }
    }
  }

  function startWorker() {
    if (child) return;
    try {
      child = spawn(WA_WORKER);
    } catch (e) {
      log('warn', `WhatsApp não iniciou: ${e.message}`);
      setConexao({ estado: 'erro', motivo: 'falha_envio' });
      return;
    }
    setConexao({ estado: 'conectando', motivo: null });
    child.on('message', onMessage);
    child.on('exit', () => {
      child = null;
      for (const p of pendentes.values()) p({ ok: false, erro: 'sessao_desconectada' });
      pendentes.clear();
      if (!fechado && conexao.estado !== 'desligado') setConexao({ estado: 'erro', qr: null, motivo: 'sessao_desconectada' });
    });
  }

  function request(type, payload = {}) {
    if (!child) return Promise.resolve({ ok: false, erro: 'sessao_desconectada' });
    const id = ++seq;
    return new Promise((resolve) => {
      const t = later(() => { if (pendentes.delete(id)) resolve({ ok: false, erro: 'sem_internet' }); }, requestTimeoutMs);
      pendentes.set(id, (r) => { clearTimeout(t); resolve(r); });
      child.postMessage({ type, id, ...payload });
    });
  }

  async function enviarItem(item) {
    const bloqueio = agenda.podeEnviar(now());
    if (bloqueio === 'aguardar') return false;
    let r;
    if (bloqueio === 'limite_diario') r = { ok: false, erro: 'limite_diario' };
    else if (conexao.estado !== 'conectado') r = { ok: false, erro: 'sessao_desconectada' };
    else r = await request('send', { jid: item.destino.jid, texto: item.texto });
    if (r.ok) {
      const enviada = { ...item };
      agenda.marcarEnviada(item.id, now());
      evento({ tipo: 'enviada', item: enviada });
    } else {
      const f = agenda.marcarFalha(item.id, r.erro, now());
      if (f) evento({ tipo: 'erro', item: f.item, motivo: f.item.ultimoErro, deNovo: f.deNovo, tentativa: f.tentativa });
    }
    return true;
  }

  /** Um passo do relógio: avisos, atrasadas (só perguntar) e envios em fila. */
  async function tick() {
    const { avisar, enviar, atrasadas } = agenda.tick(now());
    for (const item of avisar) evento({ tipo: 'aviso', item });
    if (atrasadas.length) evento({ tipo: 'atrasadas' });
    if (enviando || !enviar.length) return;
    enviando = true;
    try {
      for (const item of enviar) {
        const atual = agenda.get(item.id);
        if (!atual || atual.estado !== 'agendada') continue;
        if (!(await enviarItem(atual))) break; // intervalo mínimo: o resto vai no próximo passo
      }
    } finally {
      enviando = false;
    }
  }

  const adaptador = {
    agenda,
    conexao: () => ({ ...conexao }),
    contatos: () => [...lista.contatos, ...lista.grupos],
    checarNumero: (jid) => request('check', { numero: String(jid).split('@')[0] }),
    mudou,
  };
  companion.whatsapp = adaptador;

  return {
    adaptador,
    tick,
    /** Liga o relógio e, se já existe sessão salva, reconecta sozinho. */
    start() {
      if (temSessao()) startWorker();
      timer = setTimer(() => { tick().catch((e) => log('warn', `Relógio do WhatsApp: ${e.message}`)); }, WA_TICK_MS);
      later(() => { tick().catch(() => {}); }, WA_PRIMEIRO_TICK_MS);
    },
    connect() {
      pediuConexao = true;
      if (child) child.postMessage({ type: 'start', dir: sessao });
      else startWorker();
      return { ...conexao };
    },
    async disconnect() {
      pediuConexao = false;
      if (child) await request('logout');
      fs.rmSync(sessao, { recursive: true, force: true });
      lista = { contatos: [], grupos: [] };
      contatosDisk.write(lista);
      child?.postMessage({ type: 'stop' });
      child = null;
      setConexao({ estado: 'desligado', qr: null, numero: null, motivo: null });
      return { ...conexao };
    },
    state() {
      const agora = new Date(now());
      const fmt = (i) => ({ ...i, quandoTexto: descreverQuando(i, agora) });
      return {
        conexao: { ...conexao },
        itens: agenda.ativas().map(fmt),
        historico: agenda.itens.filter((i) => ['enviada', 'cancelada'].includes(i.estado)).sort((a, b) => (b.enviadaEm || 0) - (a.enviadaEm || 0)).slice(0, 20).map(fmt),
        contatos: [...lista.contatos, ...lista.grupos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
        limites: { porDia: WA_LIMITES.porDia, avisoMin: WA_LIMITES.avisoMs / 60e3 },
      };
    },
    /** Criar ou editar pela janela. destino: {jid} de um contato/grupo ou {numero}. */
    async save(dados) {
      const d = dados && typeof dados === 'object' ? dados : {};
      let destino = null;
      if (d.destino?.numero) {
        const jid = numeroParaJid(d.destino.numero);
        if (!jid) return { ok: false, erro: 'numero_invalido' };
        if (conexao.estado === 'conectado') {
          const r = await request('check', { numero: jid.split('@')[0] });
          if (r && r.ok === false && r.erro === 'contato_nao_encontrado') return { ok: false, erro: 'contato_nao_encontrado' };
        }
        destino = { jid, nome: String(d.destino.nome || d.destino.numero).slice(0, 80), tipo: 'contato' };
      } else {
        const c = adaptador.contatos().find((x) => x.jid === d.destino?.jid);
        if (!c) return { ok: false, erro: 'contato_nao_encontrado' };
        destino = c;
      }
      const texto = String(d.texto || '').trim();
      if (!texto) return { ok: false, erro: 'texto_vazio' };
      const campos = { destino, texto, data: d.data, hora: d.hora, repeticao: d.repeticao };
      try {
        const item = d.id ? agenda.edit(d.id, campos) : agenda.add(campos);
        return { ok: true, id: item.id };
      } catch (e) {
        return { ok: false, erro: e.message === 'passado' ? 'passado' : e.message === 'limite_itens' ? 'cheio' : 'invalido' };
      }
    },
    remove(id) { return { ok: !!agenda.remove(String(id)) }; },
    resolver(id, acao) { const r = agenda.resolverAtrasada(String(id), acao === 'enviar' ? 'enviar' : 'descartar', now()); if (r && acao === 'enviar') tick().catch(() => {}); return { ok: !!r }; },
    pular(id) { return { ok: !!agenda.pular(String(id)) }; },
    async reescrever(texto, { destino = '', jeitoJoJo = false } = {}) {
      const t = String(texto || '').trim().slice(0, WA_LIMITES.texto);
      if (!t) return { ok: false, erro: 'texto_vazio' };
      const novo = await companion.waReescrever?.(t, { destino, jeitoJoJo: jeitoJoJo === true });
      return novo ? { ok: true, texto: novo } : { ok: false, erro: 'sem_modelo' };
    },
    close() {
      fechado = true;
      if (timer) clearTimer(timer);
      timer = null;
      child?.postMessage({ type: 'stop' });
      child = null;
    },
  };
}
