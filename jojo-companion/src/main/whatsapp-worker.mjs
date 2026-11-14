// Processo utilitário isolado que fala com o WhatsApp (biblioteca Baileys, não
// oficial). Se ele cair, só o WhatsApp para; o JoJo continua.
//
// Faz só o necessário: conectar como aparelho conectado (QR code), manter a
// sessão em uma pasta local, listar nomes de contatos e grupos e enviar o texto
// que ela agendou. Não lê, não guarda e não repassa conversas.
import fs from 'node:fs';
import path from 'node:path';

const port = process.parentPort;
let baileys = null, sock = null, dir = null, parando = false, tentativasReconexao = 0, timerReconexao = null;
const contatos = new Map();

const post = (msg) => port?.postMessage(msg);
const silencioso = { level: 'silent', child() { return silencioso; }, trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {} };

function erroDe(e) {
  const t = String((e && (e.message || e.code)) || e || '');
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|network|socket hang up|Connection Closed|timed out/i.test(t)) return 'sem_internet';
  if (/not-authorized|logged ?out|Connection Failure|401/i.test(t)) return 'sessao_desconectada';
  return 'falha_envio';
}

function guardarContato(c) {
  if (!c || typeof c.id !== 'string') return;
  const jid = /@s\.whatsapp\.net$/.test(c.id) ? c.id : typeof c.phoneNumber === 'string' && /@s\.whatsapp\.net$/.test(c.phoneNumber) ? c.phoneNumber : null;
  const nome = String(c.name || c.notify || c.verifiedName || '').trim();
  if (!jid || !nome) return;
  contatos.set(jid, nome.slice(0, 80));
}

let envioContatos = null;
function avisarContatos() {
  clearTimeout(envioContatos);
  envioContatos = setTimeout(() => post({ type: 'contatos', lista: [...contatos].map(([jid, nome]) => ({ jid, nome, tipo: 'contato' })).slice(0, 5000) }), 800);
}

async function avisarGrupos() {
  try {
    const grupos = await sock.groupFetchAllParticipating();
    post({ type: 'grupos', lista: Object.values(grupos).map((g) => ({ jid: g.id, nome: String(g.subject || '').slice(0, 80), tipo: 'grupo' })).filter((g) => g.nome).slice(0, 500) });
  } catch { /* sem grupos agora: tenta na próxima conexão */ }
}

async function conectar() {
  clearTimeout(timerReconexao);
  baileys ||= await import('@whiskeysockets/baileys');
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = baileys;
  fs.mkdirSync(dir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  post({ type: 'status', estado: 'conectando' });
  sock = makeWASocket({
    auth: state, logger: silencioso, browser: Browsers.windows('JoJo Companion'),
    markOnlineOnConnect: false, syncFullHistory: false, generateHighQualityLinkPreview: false,
    getMessage: async () => undefined,
  });
  const atual = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('contacts.upsert', (lista) => { for (const c of lista) guardarContato(c); avisarContatos(); });
  sock.ev.on('contacts.update', (lista) => { for (const c of lista) guardarContato(c); avisarContatos(); });
  // Só os contatos da sincronização inicial; as mensagens são ignoradas.
  sock.ev.on('messaging-history.set', ({ contacts: lista = [] }) => { for (const c of lista) guardarContato(c); avisarContatos(); });
  sock.ev.on('connection.update', (u) => {
    if (atual !== sock) return;
    if (u.qr) post({ type: 'qr', qr: u.qr });
    if (u.connection === 'open') {
      tentativasReconexao = 0;
      const numero = String(sock.user?.id || '').split(/[:@]/)[0];
      post({ type: 'status', estado: 'conectado', numero });
      avisarGrupos();
    }
    if (u.connection === 'close') {
      const codigo = u.lastDisconnect?.error?.output?.statusCode;
      if (parando) return;
      if (codigo === DisconnectReason.loggedOut) {
        // Ela desconectou pelo celular: a sessão local não vale mais.
        sock = null;
        fs.rmSync(dir, { recursive: true, force: true });
        post({ type: 'status', estado: 'desligado', motivo: 'sessao_desconectada' });
        return;
      }
      const espera = codigo === DisconnectReason.restartRequired ? 0 : Math.min(60e3, 5e3 * 2 ** tentativasReconexao++);
      post({ type: 'status', estado: 'reconectando', motivo: erroDe(u.lastDisconnect?.error) });
      timerReconexao = setTimeout(() => { conectar().catch((e) => post({ type: 'status', estado: 'erro', motivo: erroDe(e) })); }, espera);
    }
  });
}

async function enviar({ jid, texto }) {
  if (!sock || !sock.user) return { ok: false, erro: 'sessao_desconectada' };
  if (/@s\.whatsapp\.net$/.test(jid)) {
    const [r] = await sock.onWhatsApp(jid.split('@')[0]).catch(() => []);
    if (!r || !r.exists) return { ok: false, erro: 'contato_nao_encontrado' };
  }
  try {
    const m = await sock.sendMessage(jid, { text: String(texto).slice(0, 1000) });
    return { ok: true, id: m?.key?.id || null };
  } catch (e) {
    return { ok: false, erro: erroDe(e) };
  }
}

async function checar({ numero }) {
  if (!sock || !sock.user) return { ok: false, erro: 'sessao_desconectada' };
  const d = String(numero || '').replace(/\D/g, '');
  const [r] = await sock.onWhatsApp(d).catch(() => []);
  return r && r.exists ? { ok: true, jid: r.jid } : { ok: false, erro: 'contato_nao_encontrado' };
}

async function sair() {
  parando = true;
  clearTimeout(timerReconexao);
  try { await sock?.logout(); } catch { /* sem conexão: basta apagar a sessão local */ }
  sock = null;
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
      if (!sock) await conectar();
    } else if (msg.type === 'send') post({ type: 'result', id: msg.id, ...(await enviar(msg)) });
    else if (msg.type === 'check') post({ type: 'result', id: msg.id, ...(await checar(msg)) });
    else if (msg.type === 'logout') post({ type: 'result', id: msg.id, ...(await sair()) });
    else if (msg.type === 'stop') { parando = true; clearTimeout(timerReconexao); try { sock?.end(undefined); } catch { /* já fechado */ } process.exit(0); }
  } catch (err) {
    if (msg.id != null) post({ type: 'result', id: msg.id, ok: false, erro: erroDe(err) });
    else post({ type: 'status', estado: 'erro', motivo: erroDe(err) });
  }
});
post({ type: 'ready' });
