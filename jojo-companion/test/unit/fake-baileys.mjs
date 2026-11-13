// Baileys simulado para testar o processo isolado do WhatsApp sem rede: cada
// socket criado fica em globalThis.__waFake.sockets e o teste dispara os eventos
// que o WhatsApp mandaria. Nada conecta nem envia de verdade.
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';

const fake = globalThis.__waFake ||= { sockets: [], versao: null, enviados: [], fotos: {}, semWhats: new Set(), confirmar: 'ok', lids: {} };

export const Browsers = { windows: (nome) => ['Windows', nome, '10'] };

export async function fetchLatestWaWebVersion() {
  return fake.versao ? { version: fake.versao, isLatest: true } : { version: [2, 3000, 1], isLatest: false };
}

export async function useMultiFileAuthState(dir) {
  const arq = path.join(dir, 'creds.json');
  let creds = { registered: false, me: null, advSecretKey: 'ADV0' };
  try { creds = JSON.parse(fs.readFileSync(arq, 'utf8')); } catch { /* sessão nova */ }
  const state = { creds, keys: {} };
  return { state, saveCreds: async () => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(arq, JSON.stringify(state.creds)); } };
}

export default function makeWASocket(config) {
  const ev = new EventEmitter();
  const ws = new EventEmitter();
  const s = {
    config, ev, ws, encerrado: false, saiu: false, nos: [],
    async sendNode(no) { s.nos.push(no); },
    authState: config.auth,
    get user() { return config.auth.creds.me; },
    end() { s.encerrado = true; },
    async logout() { s.saiu = true; },
    async onWhatsApp(numero) {
      if (fake.confirmar === 'erro') throw new Error('Connection Closed');
      return fake.semWhats.has(String(numero)) ? [] : [{ jid: `${numero}@s.whatsapp.net`, exists: true }];
    },
    async sendMessage(jid, conteudo) {
      if (fake.falhaEnvio) { const e = new Error(fake.falhaEnvio.msg); e.output = { statusCode: fake.falhaEnvio.codigo }; throw e; }
      fake.enviados.push({ jid, texto: conteudo.text });
      return { key: { id: `m${fake.enviados.length}` } };
    },
    async profilePictureUrl(jid) {
      const f = fake.fotos[jid];
      if (f === undefined) { const e = new Error('item-not-found'); e.output = { statusCode: 404 }; throw e; }
      return f;
    },
    async groupFetchAllParticipating() { return fake.grupos || {}; },
    signalRepository: { lidMapping: { getPNsForLIDs: async (lids) => lids.filter((l) => fake.lids[l]).map((l) => ({ lid: l, pn: fake.lids[l] })) } },
    /** Teste: abre a conexão como o WhatsApp faria depois de logar. */
    abrir(me = { id: '5542999990000:7@s.whatsapp.net', name: 'Emanuele' }) {
      config.auth.creds.registered = true;
      config.auth.creds.me = me;
      ev.emit('connection.update', { connection: 'open' });
    },
    /** Teste: QR como o Baileys desenha (segredo capturado no início do fluxo). */
    qr(ref, segredo = 'ADV0') {
      ev.emit('connection.update', { qr: `https://wa.me/settings/linked_devices#${ref},NK,IK,${segredo},1` });
    },
    fechar(codigo, mensagem = 'Connection Closed') {
      const error = new Error(mensagem);
      error.output = { statusCode: codigo };
      ev.emit('connection.update', { connection: 'close', lastDisconnect: { error } });
    },
  };
  fake.sockets.push(s);
  return s;
}
