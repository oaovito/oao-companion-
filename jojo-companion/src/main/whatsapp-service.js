// Mensagens programadas no WhatsApp, lado do processo principal: liga o
// processo isolado do WhatsApp (whatsapp-worker.mjs), guarda agenda, contatos e
// fotos só neste PC, mantém o estado único da conexão e roda o relógio dos
// envios. Tudo é injetável para os testes usarem um WhatsApp simulado (nenhum
// teste conecta de verdade).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { AtomicState } from '../core/atomic-state.js';
import { WhatsAppAgenda, sanitizeItem, numeroParaJid, descreverQuando, WA_LIMITES } from '../core/whatsapp.js';
import { estadoVisivel, WA_QR, WA_MOTIVOS_ACAO } from '../core/whatsapp-conexao.js';
import { contatoDoDisco, prepararContatos, formatarNumero, numeroDoJid, iniciais } from '../core/whatsapp-contatos.js';

export const WA_TICK_MS = 20e3;
export const WA_PRIMEIRO_TICK_MS = 15e3;
export const WA_WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'whatsapp-worker.mjs');
export const WA_FOTOS = Object.freeze({ validadeMs: 7 * 864e5, porPedido: 60, intervaloMs: 400, reinicios: 2 });

const ESTADOS = ['desligado', 'conectando', 'qr', 'pareando', 'conectado', 'reconectando', 'erro'];
const limparContatos = (lista, tipo) => (Array.isArray(lista) ? lista : []).map((c) => contatoDoDisco(c, tipo)).filter(Boolean)
  .filter((c) => tipo === 'grupo' || c.nomeAgenda || c.nomePerfil || numeroDoJid(c.jid)).slice(0, tipo === 'grupo' ? 500 : 5000);

export function createWhatsAppService({ userData, companion, spawn, toDataURL, log = () => {}, notify = () => {}, notifyFotos = () => {}, now = () => Date.now(),
  setTimer = (fn, ms) => setInterval(fn, ms), clearTimer = (t) => clearInterval(t), later = (fn, ms) => setTimeout(fn, ms), requestTimeoutMs = 30e3,
  querQr = () => false, workerPath = WA_WORKER }) {
  const base = path.join(userData, 'whatsapp');
  const sessao = path.join(base, 'sessao');
  const fotosDir = path.join(base, 'fotos');
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
  let preparada = null; // lista da tela, refeita só quando os contatos mudam
  const temSessao = () => fs.existsSync(path.join(sessao, 'creds.json'));
  let conexao = { estado: 'desligado', qr: null, numero: null, nome: null, motivo: null, codigo: null };
  let child = null, seq = 0, timer = null, enviando = false, pediuConexao = false, fechado = false;
  let ciclosQr = 0, renovandoQr = false, reinicios = 0, qrSeq = 0;
  const pendentes = new Map();
  const evento = (ev) => { try { companion.whatsappEvento?.(ev); } catch (e) { log('warn', `Aviso do WhatsApp falhou: ${e.message}`); } };
  const setConexao = (patch) => {
    const antes = conexao.estado;
    conexao = { ...conexao, ...patch };
    // Registro de diagnóstico: só estado, motivo e código; nunca nome ou número.
    if (conexao.estado !== antes || patch.motivo) log('info', `WhatsApp: ${antes} → ${conexao.estado}${conexao.motivo ? ` (${conexao.motivo}${conexao.codigo ? ` ${conexao.codigo}` : ''})` : ''}`);
    mudou();
  };
  const contatosMudaram = () => { preparada = null; mudou(); };
  const apagarLocais = () => {
    lista = { contatos: [], grupos: [] };
    contatosDisk.write(lista);
    fs.rmSync(fotosDir, { recursive: true, force: true });
    fotosMem.clear();
    preparada = null;
  };

  function onMessage(c, m) {
    if (c !== child || !m || typeof m !== 'object') return;
    if (m.type === 'ready') c.postMessage({ type: 'start', dir: sessao });
    else if (m.type === 'log') log(['info', 'warn', 'error'].includes(m.nivel) ? m.nivel : 'info', `WhatsApp: ${String(m.texto || '').slice(0, 300)}`);
    else if (m.type === 'qr' && typeof m.qr === 'string') {
      const validade = Number.isFinite(m.validadeMs) && m.validadeMs > 0 ? m.validadeMs : WA_QR.primeiroMs;
      const renovacao = qrSeq++;
      Promise.resolve(toDataURL(m.qr))
        .then((qr) => { renovandoQr = false; setConexao({ estado: 'qr', qr, qrExpiraEm: now() + validade, qrValidadeMs: validade, qrRenovacao: renovacao, motivo: null, codigo: null }); })
        .catch((e) => { log('warn', `QR code não desenhado: ${e.message}`); setConexao({ estado: 'erro', qr: null, motivo: 'qr_falhou' }); });
    } else if (m.type === 'conta') {
      setConexao({ nome: m.nome || conexao.nome, numero: m.numero || conexao.numero });
    } else if (m.type === 'status' && ESTADOS.includes(m.estado)) {
      // Renovação automática do QR: a tela continua no QR até o código novo chegar.
      if (renovandoQr && m.estado === 'conectando') return;
      renovandoQr = false;
      const antes = conexao.estado;
      if (m.estado === 'desligado' && m.motivo === 'qr_expirado' && querQr() && ciclosQr < WA_QR.ciclosAutomaticos - 1) {
        ciclosQr++;
        renovandoQr = true;
        c.postMessage({ type: 'start', dir: sessao });
        return;
      }
      const conectado = m.estado === 'conectado';
      setConexao({
        estado: m.estado, motivo: m.motivo || null, codigo: m.codigo ?? null,
        numero: conectado ? m.numero || conexao.numero : m.estado === 'desligado' ? null : conexao.numero,
        nome: conectado ? m.nome || conexao.nome : m.estado === 'desligado' ? null : conexao.nome,
        confirmadoEm: conectado ? m.confirmadoEm || now() : conexao.confirmadoEm,
        proximaEm: m.estado === 'reconectando' && Number.isFinite(m.esperaMs) ? now() + m.esperaMs : null,
        tentativa: m.tentativa || null,
        ...(m.estado !== 'qr' ? { qr: null, qrExpiraEm: null } : {}),
      });
      if (conectado) { ciclosQr = 0; reinicios = 0; }
      if (conectado && antes !== 'conectado' && pediuConexao) { pediuConexao = false; evento({ tipo: 'conectado', nome: conexao.nome, numero: conexao.numero }); }
      if (m.estado === 'desligado' && (m.motivo === 'sessao_desconectada' || m.motivo === 'sessao_encerrada' || m.motivo === 'sessao_invalida')) {
        apagarLocais();
        evento({ tipo: 'desconectado', motivo: 'sessao_desconectada' });
      } else if (m.estado === 'erro' && antes !== 'erro' && WA_MOTIVOS_ACAO.includes(m.motivo)) {
        evento({ tipo: 'erroConexao', motivo: m.motivo });
      }
    } else if (m.type === 'contatos' || m.type === 'grupos') {
      const chave = m.type === 'contatos' ? 'contatos' : 'grupos';
      lista = { ...lista, [chave]: limparContatos(m.lista, m.type === 'contatos' ? 'contato' : 'grupo') };
      contatosDisk.write(lista);
      contatosMudaram();
    } else if (m.type === 'result') {
      const p = pendentes.get(m.id);
      if (p) { pendentes.delete(m.id); p(m); }
    }
  }

  function startWorker() {
    if (child) return;
    let c;
    try {
      c = spawn(workerPath);
    } catch (e) {
      log('warn', `WhatsApp não iniciou: ${e.message}`);
      setConexao({ estado: 'erro', motivo: 'nao_iniciou' });
      return;
    }
    child = c;
    setConexao({ estado: 'conectando', motivo: null, codigo: null });
    c.on('message', (m) => onMessage(c, m));
    c.on('exit', (codigo) => {
      if (child !== c) return; // um processo antigo, já trocado por outro
      child = null;
      for (const p of pendentes.values()) p({ ok: false, erro: 'sessao_desconectada' });
      pendentes.clear();
      if (fechado || conexao.estado === 'desligado') return;
      log('warn', `WhatsApp: processo isolado encerrou (código ${codigo ?? '?'})`);
      // Caiu sozinho: volta sozinho algumas vezes antes de pedir uma ação dela.
      if (temSessao() && reinicios < WA_FOTOS.reinicios) {
        reinicios++;
        setConexao({ estado: 'reconectando', qr: null, motivo: 'conexao_caiu', proximaEm: now() + 3e3 });
        later(() => { if (!child && !fechado && conexao.estado === 'reconectando') startWorker(); }, 3e3);
        return;
      }
      setConexao({ estado: 'erro', qr: null, motivo: 'processo_parou' });
      evento({ tipo: 'erroConexao', motivo: 'processo_parou' });
    });
  }

  function request(type, payload = {}) {
    if (!child) return Promise.resolve({ ok: false, erro: 'sessao_desconectada' });
    const id = ++seq;
    const c = child;
    return new Promise((resolve) => {
      const t = later(() => { if (pendentes.delete(id)) resolve({ ok: false, erro: 'sem_internet' }); }, requestTimeoutMs);
      pendentes.set(id, (r) => { clearTimeout(t); resolve(r); });
      c.postMessage({ type, id, ...payload });
    });
  }

  async function enviarItem(item) {
    const bloqueio = agenda.podeEnviar(now());
    if (bloqueio === 'aguardar') return false;
    let r;
    if (bloqueio === 'limite_diario') r = { ok: false, erro: 'limite_diario' };
    // Antes de qualquer envio: só pelo WhatsApp conectado e confirmado.
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

  // ----------------------------------------------------------- contatos
  function contatosTela() {
    preparada ||= prepararContatos(lista.contatos, lista.grupos);
    return preparada;
  }
  /** Para a conversa: na ordem em que chegaram, com o nome já escolhido e o número. */
  function contatosConversa() {
    const { pessoas, grupos } = prepararContatos(lista.contatos, lista.grupos, { ordenar: false });
    return [...pessoas, ...grupos];
  }

  // -------------------------------------------------------------- fotos
  const fotosMem = new Map(); // jid → { foto: dataURL | null, em }
  const fila = [];
  let buscandoFotos = false;
  const arquivoFoto = (jid) => path.join(fotosDir, `${crypto.createHash('sha1').update(jid).digest('hex')}.txt`);
  function fotoSalva(jid) {
    if (fotosMem.has(jid)) return fotosMem.get(jid);
    try {
      const f = arquivoFoto(jid);
      const st = fs.statSync(f);
      const texto = fs.readFileSync(f, 'utf8');
      const r = { foto: /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(texto) ? texto : null, em: st.mtimeMs };
      fotosMem.set(jid, r);
      return r;
    } catch { return null; }
  }
  async function proximaFoto() {
    if (buscandoFotos) return;
    buscandoFotos = true;
    try {
      while (fila.length && conexao.estado === 'conectado' && !fechado) {
        const jid = fila.shift();
        const r = await request('foto', { jid });
        if (!r.ok) { if (r.erro === 'sessao_desconectada') break; continue; }
        const foto = typeof r.foto === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(r.foto) ? r.foto : null;
        try { fs.mkdirSync(fotosDir, { recursive: true }); fs.writeFileSync(arquivoFoto(jid), foto || ''); } catch (e) { log('warn', `Foto não salva: ${e.message}`); }
        fotosMem.set(jid, { foto, em: now() });
        try { notifyFotos({ [jid]: foto }); } catch { /* janela fechada */ }
        if (fila.length) await new Promise((res) => later(res, WA_FOTOS.intervaloMs));
      }
    } finally {
      buscandoFotos = false;
    }
  }

  const adaptador = {
    agenda,
    conexao: () => ({ ...conexao }),
    contatos: contatosConversa,
    checarNumero: (jid) => request('check', { numero: String(jid).split('@')[0] }),
    mudou,
  };
  companion.whatsapp = adaptador;

  const destinoTela = (d) => ({ ...d, numeroFormatado: d.tipo === 'grupo' ? '' : formatarNumero(numeroDoJid(d.jid)), iniciais: iniciais(d.nome) });

  return {
    adaptador,
    tick,
    /** Liga o relógio e, se já existe sessão salva, reconecta sozinho. */
    start() {
      if (temSessao()) startWorker();
      timer = setTimer(() => { tick().catch((e) => log('warn', `Relógio do WhatsApp: ${e.message}`)); }, WA_TICK_MS);
      later(() => { tick().catch(() => {}); }, WA_PRIMEIRO_TICK_MS);
    },
    /**
     * Conectar, gerar QR novo, escanear de novo ou tentar agora: uma ação só.
     * Se já está conectado, mostrando QR ou confirmando a conta, não reinicia nada.
     */
    connect() {
      pediuConexao = true;
      ciclosQr = 0;
      renovandoQr = false;
      qrSeq = 0;
      if (child && ['conectado', 'qr', 'pareando', 'conectando'].includes(conexao.estado)) return { ...conexao };
      if (child) {
        setConexao({ estado: 'conectando', motivo: null, codigo: null, qr: null, proximaEm: null });
        child.postMessage({ type: 'start', dir: sessao });
      } else {
        reinicios = 0;
        startWorker();
      }
      return { ...conexao };
    },
    async disconnect() {
      pediuConexao = false;
      if (child) await request('logout');
      fs.rmSync(sessao, { recursive: true, force: true });
      apagarLocais();
      const c = child;
      child = null;
      c?.postMessage({ type: 'stop' });
      setConexao({ estado: 'desligado', qr: null, numero: null, nome: null, motivo: null, codigo: null, confirmadoEm: null });
      return { ...conexao };
    },
    state() {
      const agora = new Date(now());
      const fmt = (i) => ({ ...i, destino: destinoTela(i.destino), quandoTexto: descreverQuando(i, agora), proximoTexto: i.proximo ? new Date(i.proximo).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '' });
      const { pessoas, grupos } = contatosTela();
      const visivel = estadoVisivel(conexao, now());
      return {
        conexao: { ...conexao },
        visivel,
        jojo: companion.waFalaTela?.(visivel.chave, conexao.motivo) || '',
        itens: agenda.ativas().map(fmt),
        historico: agenda.itens.filter((i) => ['enviada', 'cancelada'].includes(i.estado)).sort((a, b) => (b.enviadaEm || 0) - (a.enviadaEm || 0)).slice(0, 20).map(fmt),
        pessoas, grupos,
        limites: { porDia: WA_LIMITES.porDia, avisoMin: WA_LIMITES.avisoMs / 60e3 },
      };
    },
    /** Fotos já salvas destes contatos; as que faltam (ou velhas) vão para a fila. */
    fotos(jids) {
      const out = {};
      const validos = (Array.isArray(jids) ? jids : []).filter((j) => typeof j === 'string' && /^[\w.:-]+@(s\.whatsapp\.net|g\.us)$/.test(j)).slice(0, WA_FOTOS.porPedido);
      for (const jid of validos) {
        const s = fotoSalva(jid);
        if (s) out[jid] = s.foto;
        if ((!s || now() - s.em > WA_FOTOS.validadeMs) && !fila.includes(jid)) fila.push(jid);
      }
      if (fila.length > WA_FOTOS.porPedido * 2) fila.splice(0, fila.length - WA_FOTOS.porPedido * 2);
      if (fila.length && conexao.estado === 'conectado') proximaFoto().catch((e) => log('warn', `Fotos do WhatsApp: ${e.message}`));
      return out;
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
        const conhecido = contatosConversa().find((x) => x.jid === jid);
        destino = { jid, nome: String(d.destino.nome || conhecido?.nome || formatarNumero(numeroDoJid(jid))).slice(0, 80), tipo: 'contato' };
      } else {
        const c = contatosConversa().find((x) => x.jid === d.destino?.jid);
        if (!c) return { ok: false, erro: 'contato_nao_encontrado' };
        destino = { jid: c.jid, nome: c.nome, tipo: c.tipo };
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
    /** Envio que falhou: tenta de novo agora, só com o WhatsApp conectado. */
    tentarDeNovo(id) {
      if (conexao.estado !== 'conectado') return { ok: false, erro: 'desconectado' };
      const r = agenda.tentarDeNovo(String(id), now());
      if (r) tick().catch(() => {});
      return { ok: !!r };
    },
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
      const c = child;
      child = null;
      c?.postMessage({ type: 'stop' });
    },
  };
}
