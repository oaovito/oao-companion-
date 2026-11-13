// Processo utilitário isolado que fala com o WhatsApp (biblioteca Baileys, não
// oficial). Se ele cair, só o WhatsApp para; o JoJo continua.
//
// Faz só o necessário: conectar como aparelho conectado (QR code), manter a
// sessão em uma pasta local, listar nomes de contatos e grupos, buscar a foto de
// perfil que a tela pedir e enviar o texto que ela agendou. Não lê, não guarda e
// não repassa conversas.
//
// Cada queda é decidida pelo código que o WhatsApp manda (classificarFechamento):
// reabrir depois de ler o QR, tentar de novo com espera crescente, ou parar e
// pedir uma ação dela. "Conectado" só sai depois de uma consulta respondida pelo
// servidor com a conta já aberta.
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { classificarFechamento, qrComSegredo, WA_QR } from '../core/whatsapp-conexao.js';
import { ContatosWA, jidPessoa, numeroDoJid } from '../core/whatsapp-contatos.js';

const port = process.parentPort;
const CONFIRMAR_MS = 20e3;
const FOTO_MAX = 300e3;
let baileys = null, sock = null, dir = null, parando = false, tentativas = 0, timerReconexao = null;
let versao = null, versaoAtualizada = false, qrRenovacao = 0, aberta = false, qrAtual = null;
let contatos = new ContatosWA();

const post = (msg) => port?.postMessage(msg);
const log = (nivel, texto) => post({ type: 'log', nivel, texto: String(texto).slice(0, 300) });
const silencioso = { level: 'silent', child() { return silencioso; }, trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {} };

process.on('unhandledRejection', (e) => log('warn', `Promessa sem tratamento no WhatsApp: ${e?.message || e}`));
process.on('uncaughtException', (e) => log('error', `Erro no processo do WhatsApp: ${e?.message || e}`));

/** Erros de envio (mensagens programadas). */
function erroEnvio(e) {
  const codigo = e?.output?.statusCode || e?.data?.statusCode;
  const t = String((e && (e.message || e.code)) || e || '');
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH|socket hang up|Connection Closed|Connection was lost|Timed Out/i.test(t) || codigo === 408 || codigo === 428) return 'sem_internet';
  if (codigo === 401 || /not-authorized|logged ?out/i.test(t)) return 'sessao_desconectada';
  return 'falha_envio';
}

let envioContatos = null;
function avisarContatos() {
  clearTimeout(envioContatos);
  envioContatos = setTimeout(() => post({ type: 'contatos', lista: contatos.lista().slice(0, 5000) }), 800);
}

/** Contatos que chegaram só com LID: tenta achar o número no mapeamento local do Baileys. */
async function resolverLids() {
  const lids = contatos.lidsSemNumero().slice(0, 1000);
  if (!lids.length || !sock?.signalRepository?.lidMapping) return;
  try {
    const pares = await sock.signalRepository.lidMapping.getPNsForLIDs(lids);
    let mudou = false;
    for (const p of pares || []) mudou = contatos.mapear(p.lid, p.pn) || mudou;
    if (mudou) avisarContatos();
  } catch (e) { log('warn', `Números dos contatos (LID): ${e.message}`); }
}

async function avisarGrupos(s) {
  try {
    const grupos = await s.groupFetchAllParticipating();
    if (s !== sock) return;
    post({ type: 'grupos', lista: Object.values(grupos).map((g) => ({ jid: g.id, nome: String(g.subject || '').slice(0, 80), participantes: g.size || g.participants?.length || null })).filter((g) => g.nome).slice(0, 500) });
  } catch (e) { log('warn', `Lista de grupos indisponível agora: ${e.message}`); }
}

function contaAtual(s) {
  const me = s?.user || s?.authState?.creds?.me || {};
  return { numero: numeroDoJid(String(me.id || '').replace(/:\d+@/, '@')), nome: String(me.name || me.verifiedName || me.notify || '').trim().slice(0, 80) || null };
}

/** Versão atual do WhatsApp Web; sem rede ou sem resposta fica a embutida na biblioteca. */
async function versaoWeb() {
  if (versao && !versaoAtualizada) return versao;
  versaoAtualizada = false;
  try {
    const r = await baileys.fetchLatestWaWebVersion({ signal: AbortSignal.timeout(8e3) });
    if (r?.isLatest && Array.isArray(r.version)) { versao = r.version; return versao; }
  } catch { /* fica a embutida */ }
  versao = null;
  return undefined;
}

function encerrarSocket() {
  const s = sock;
  sock = null;
  aberta = false;
  if (!s) return;
  try { s.ev.removeAllListeners(); } catch { /* já fechado */ }
  try { s.end(undefined); } catch { /* já fechado */ }
}

function agendarReconexao(ms) {
  clearTimeout(timerReconexao);
  timerReconexao = setTimeout(() => { conectar().catch(falhaAoConectar); }, ms);
}

function falhaAoConectar(e) {
  log('error', `Não abriu a conexão: ${e?.message || e}`);
  encerrarSocket();
  post({ type: 'status', estado: 'erro', motivo: 'nao_iniciou' });
}

/** Pergunta ao servidor pela própria conta: só com resposta é "conectado". */
async function confirmarConta(s) {
  const { numero } = contaAtual(s);
  if (!numero) throw new Error('sem número da conta');
  await Promise.race([
    s.onWhatsApp(numero),
    new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('sem resposta do WhatsApp'), { semResposta: true })), CONFIRMAR_MS)),
  ]);
}

async function conectar() {
  clearTimeout(timerReconexao);
  encerrarSocket();
  baileys ||= await import('@whiskeysockets/baileys');
  const { default: makeWASocket, useMultiFileAuthState, Browsers } = baileys;
  fs.mkdirSync(dir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const registrado = !!state.creds.registered;
  const eu = jidPessoa(String(state.creds.me?.id || '').replace(/:\d+@/, '@'));
  if (!eu || contatos.eu !== eu) contatos = new ContatosWA({ eu });
  post({ type: 'status', estado: 'conectando', motivo: null });
  const version = await versaoWeb();
  if (parando) return;
  qrRenovacao = 0;
  qrAtual = null;
  const s = makeWASocket({
    // Identidade padrão (Chrome no Windows): com um nome próprio o Baileys 7 grava
    // "outro cliente web" no QR e "Chrome" no registro, e o celular recusa a leitura.
    auth: state, logger: silencioso, browser: Browsers.windows('Chrome'),
    markOnlineOnConnect: false, syncFullHistory: false, generateHighQualityLinkPreview: false,
    getMessage: async () => undefined, ...(version ? { version } : {}),
  });
  sock = s;
  s.ev.on('creds.update', async (u) => {
    await saveCreds();
    if (aberta && u?.me?.name && s === sock) post({ type: 'conta', ...contaAtual(s) });
  });
  // Depois da leitura o WhatsApp pode aposentar o segredo do QR (companion_reg_refresh).
  // O Baileys 7.0.0-rc14 ignora o aviso e não consegue responder antes do pareamento:
  // o celular mostra "Verifique sua conexão". Aqui o segredo é trocado, salvo, o aviso é
  // respondido e o mesmo código volta para a tela com o segredo novo.
  s.ws?.on?.('CB:notification,type:companion_reg_refresh', (node) => {
    if (s !== sock) return;
    const filhos = Array.isArray(node?.content) ? node.content.map((c) => c?.tag) : [];
    if (!filhos.some((t) => t === 'companion_reg_refresh' || t === 'pair-device-rotate-qr')) { log('warn', 'Aviso de troca do QR sem conteúdo esperado; ignorado'); return; }
    if (state.creds.me) return; // já pareado: o segredo atual é o que vale
    state.creds.advSecretKey = randomBytes(32).toString('base64');
    saveCreds().catch((e) => log('warn', `Segredo novo do QR não salvo: ${e.message}`));
    s.sendNode?.({ tag: 'ack', attrs: { id: node.attrs.id, to: node.attrs.from, class: 'notification', ...(node.attrs.type ? { type: node.attrs.type } : {}) } })
      .catch((e) => log('warn', `Resposta ao aviso do QR falhou: ${e.message}`));
    log('info', 'WhatsApp pediu segredo novo para o QR; código redesenhado');
    if (qrAtual) {
      const restante = Math.max(1e3, qrAtual.fim - Date.now());
      post({ type: 'qr', qr: qrComSegredo(qrAtual.qr, state.creds.advSecretKey), validadeMs: restante, renovacao: qrAtual.renovacao });
    }
  });
  const receber = (lista) => { let mudou = false; for (const c of lista || []) mudou = contatos.aplicar(c) || mudou; if (mudou) avisarContatos(); if (contatos.lidsSemNumero().length) resolverLids(); };
  s.ev.on('contacts.upsert', receber);
  s.ev.on('contacts.update', receber);
  s.ev.on('lid-mapping.update', ({ lid, pn } = {}) => { if (contatos.mapear(lid, pn)) avisarContatos(); });
  // Só os contatos e os pares LID ↔ número da sincronização inicial; as mensagens são ignoradas.
  s.ev.on('messaging-history.set', ({ contacts: lista = [], lidPnMappings = [] }) => {
    for (const m of lidPnMappings) contatos.mapear(m.lid, m.pn);
    receber(lista);
  });
  s.ev.on('connection.update', async (u) => {
    if (s !== sock) return;
    if (u.qr) {
      const validade = qrRenovacao === 0 ? WA_QR.primeiroMs : WA_QR.renovacaoMs;
      // As renovações do Baileys reaproveitam o segredo antigo: sempre o atual.
      const qr = qrComSegredo(u.qr, state.creds.advSecretKey);
      qrAtual = { qr: u.qr, fim: Date.now() + validade, renovacao: qrRenovacao };
      post({ type: 'qr', qr, validadeMs: validade, renovacao: qrRenovacao });
      qrRenovacao++;
    }
    if (u.isNewLogin) post({ type: 'status', estado: 'pareando' });
    if (u.connection === 'open') {
      try {
        await confirmarConta(s);
      } catch (e) {
        if (s !== sock) return;
        const motivo = e.semResposta ? 'sem_resposta' : 'conexao_caiu';
        log('warn', `Conta não confirmada: ${e.message}`);
        encerrarSocket();
        const espera = Math.min(60e3, 3e3 * 2 ** tentativas++);
        post({ type: 'status', estado: 'reconectando', motivo, esperaMs: espera, tentativa: tentativas });
        agendarReconexao(espera);
        return;
      }
      if (s !== sock) return;
      tentativas = 0;
      aberta = true;
      const conta = contaAtual(s);
      if (contatos.definirEu(`${conta.numero}@s.whatsapp.net`)) avisarContatos();
      post({ type: 'status', estado: 'conectado', numero: conta.numero, nome: conta.nome, confirmadoEm: Date.now() });
      avisarGrupos(s);
      resolverLids();
    }
    if (u.connection === 'close') {
      const erro = u.lastDisconnect?.error;
      const codigo = erro?.output?.statusCode ?? null;
      if (parando) return;
      const d = classificarFechamento({ codigo, mensagem: `${erro?.message || ''} ${erro?.data?.code || ''}`, registrado: registrado || !!state.creds.registered, tentativas });
      log('info', `Conexão fechada: código ${codigo ?? 'nenhum'} → ${d.motivo}`);
      encerrarSocket();
      if (d.apagarSessao) fs.rmSync(dir, { recursive: true, force: true });
      // 405: busca a versão atual do WhatsApp Web e tenta uma vez na hora.
      if (d.atualizarVersao) { versaoAtualizada = true; tentativas++; agendarReconexao(0); return; }
      if (d.motivo === 'reiniciar') { agendarReconexao(0); return; }
      if (d.reconectar) {
        tentativas++;
        post({ type: 'status', estado: 'reconectando', motivo: d.motivo, codigo, esperaMs: d.esperaMs, tentativa: tentativas });
        agendarReconexao(d.esperaMs);
        return;
      }
      tentativas = 0;
      const desligou = ['qr_expirado', 'sessao_encerrada', 'sessao_invalida'].includes(d.motivo);
      post({ type: 'status', estado: desligou ? 'desligado' : 'erro', motivo: d.motivo, codigo });
    }
  });
}

async function enviar({ jid, texto }) {
  if (!sock || !aberta) return { ok: false, erro: 'sessao_desconectada' };
  if (/@s\.whatsapp\.net$/.test(jid)) {
    const [r] = await sock.onWhatsApp(jid.split('@')[0]).catch(() => []);
    if (!r || !r.exists) return { ok: false, erro: 'contato_nao_encontrado' };
  }
  try {
    const m = await sock.sendMessage(jid, { text: String(texto).slice(0, 1000) });
    return { ok: true, mensagem: m?.key?.id || null };
  } catch (e) {
    log('warn', `Envio falhou: ${e?.output?.statusCode || ''} ${e?.message || e}`);
    return { ok: false, erro: erroEnvio(e) };
  }
}

async function checar({ numero }) {
  if (!sock || !aberta) return { ok: false, erro: 'sessao_desconectada' };
  const d = String(numero || '').replace(/\D/g, '');
  const [r] = await sock.onWhatsApp(d).catch(() => []);
  return r && r.exists ? { ok: true, jid: r.jid } : { ok: false, erro: 'contato_nao_encontrado' };
}

/** Foto de perfil pequena (a da lista), como data URL. null: sem foto ou privada. */
async function foto({ jid }) {
  if (!sock || !aberta) return { ok: false, erro: 'sessao_desconectada' };
  let url = null;
  try { url = await sock.profilePictureUrl(jid, 'preview', 10e3); } catch (e) {
    const c = e?.output?.statusCode || e?.data;
    // 404/401: a pessoa não tem foto ou não mostra para você.
    if (c === 404 || c === 401 || /item-not-found|not-authorized/i.test(String(e?.message))) return { ok: true, foto: null };
    return { ok: false, erro: erroEnvio(e) };
  }
  if (!url) return { ok: true, foto: null };
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10e3) });
    if (!r.ok) return { ok: true, foto: null };
    const tipo = /^image\/(jpeg|png|webp)$/.exec(r.headers.get('content-type') || '')?.[0] || 'image/jpeg';
    const b = Buffer.from(await r.arrayBuffer());
    return { ok: true, foto: b.length && b.length <= FOTO_MAX ? `data:${tipo};base64,${b.toString('base64')}` : null };
  } catch (e) {
    return { ok: false, erro: erroEnvio(e) };
  }
}

async function sair() {
  parando = true;
  clearTimeout(timerReconexao);
  try { await sock?.logout(); } catch { /* sem conexão: basta apagar a sessão local */ }
  encerrarSocket();
  fs.rmSync(dir, { recursive: true, force: true });
  post({ type: 'status', estado: 'desligado', motivo: null });
  return { ok: true };
}

port?.on('message', async (e) => {
  const msg = e.data || {};
  try {
    if (msg.type === 'start') {
      dir = path.resolve(String(msg.dir));
      parando = false;
      // Já aberta: nada a fazer. Esperando, travada ou fechada: tenta de novo agora.
      if (!(sock && aberta)) { tentativas = 0; await conectar(); }
    // O id do pedido vem por último: nenhum campo da resposta pode trocá-lo.
    } else if (msg.type === 'send') post({ type: 'result', ...(await enviar(msg)), id: msg.id });
    else if (msg.type === 'check') post({ type: 'result', ...(await checar(msg)), id: msg.id });
    else if (msg.type === 'foto') post({ type: 'result', ...(await foto(msg)), id: msg.id });
    else if (msg.type === 'logout') post({ type: 'result', ...(await sair()), id: msg.id });
    else if (msg.type === 'stop') { parando = true; clearTimeout(timerReconexao); encerrarSocket(); process.exit(0); }
  } catch (err) {
    if (msg.id != null) post({ type: 'result', id: msg.id, ok: false, erro: erroEnvio(err) });
    else falhaAoConectar(err);
  }
});
post({ type: 'ready' });
