// WhatsApp simulado para o E2E do Windows: fala o mesmo protocolo do
// whatsapp-worker.mjs, mas nunca abre conexão nem envia nada. O teste manda
// comandos escrevendo uma lista em JOJO_TEST_WA_CONTROLE; os envios pedidos
// ficam em "<controle>.enviados.json" para conferência.
import fs from 'node:fs';
import path from 'node:path';

const port = process.parentPort;
const CONTROLE = process.env.JOJO_TEST_WA_CONTROLE;
const ENVIADOS = `${CONTROLE}.enviados.json`;
let dir = null, feitos = 0, falhaEnvio = null, conta = null, contatos = [], grupos = [];
const post = (m) => port.postMessage(m);
const credsArq = () => path.join(dir, 'creds.json');

function conectar() {
  post({ type: 'status', estado: 'conectando' });
  if (fs.existsSync(credsArq())) {
    // Sessão salva: volta sem QR, com a mesma conta.
    const salvo = JSON.parse(fs.readFileSync(credsArq(), 'utf8'));
    conta = salvo.conta;
    abrir(salvo);
    return;
  }
  post({ type: 'qr', qr: 'QR-JOJO-TESTE-1', validadeMs: 60e3, renovacao: 0 });
}

function abrir({ conta: c, contatos: lista = [], grupos: gs = [] }) {
  conta = c;
  contatos = lista.length ? lista : contatos;
  grupos = gs.length ? gs : grupos;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(credsArq(), JSON.stringify({ registered: true, conta, contatos, grupos }));
  post({ type: 'status', estado: 'conectado', numero: conta.numero, nome: conta.nome, confirmadoEm: Date.now() });
  post({ type: 'contatos', lista: contatos });
  post({ type: 'grupos', lista: grupos });
}

function executar(c) {
  if (c.acao === 'qr') post({ type: 'qr', qr: c.qr, validadeMs: c.validadeMs || 20e3, renovacao: c.renovacao || 1 });
  else if (c.acao === 'lido') post({ type: 'status', estado: 'pareando' });
  else if (c.acao === 'abrir') abrir(c);
  else if (c.acao === 'cair') post({ type: 'status', estado: 'reconectando', motivo: c.motivo, esperaMs: c.esperaMs, tentativa: 1 });
  else if (c.acao === 'erro') post({ type: 'status', estado: 'erro', motivo: c.motivo, codigo: c.codigo });
  else if (c.acao === 'falharEnvio') falhaEnvio = c.erro || null;
}

// Processo novo (reabriu o app ou reconectou): só os comandos escritos daqui em diante.
try { feitos = JSON.parse(fs.readFileSync(CONTROLE, 'utf8')).length; } catch { feitos = 0; }

// Comandos novos do teste, na ordem.
setInterval(() => {
  let lista = [];
  try { lista = JSON.parse(fs.readFileSync(CONTROLE, 'utf8')); } catch { return; }
  while (feitos < lista.length) executar(lista[feitos++]);
}, 100);

port.on('message', (e) => {
  const m = e.data || {};
  if (m.type === 'start') { dir = path.resolve(String(m.dir)); conectar(); }
  else if (m.type === 'send') {
    if (falhaEnvio) { post({ type: 'result', ok: false, erro: falhaEnvio, id: m.id }); return; }
    const enviados = fs.existsSync(ENVIADOS) ? JSON.parse(fs.readFileSync(ENVIADOS, 'utf8')) : [];
    enviados.push({ jid: m.jid, texto: m.texto });
    fs.writeFileSync(ENVIADOS, JSON.stringify(enviados));
    post({ type: 'result', ok: true, mensagem: `M${enviados.length}`, id: m.id });
  } else if (m.type === 'check') post({ type: 'result', ok: true, jid: `${String(m.numero).replace(/\D/g, '')}@s.whatsapp.net`, id: m.id });
  else if (m.type === 'foto') post({ type: 'result', ok: true, foto: null, id: m.id });
  else if (m.type === 'logout') {
    fs.rmSync(dir, { recursive: true, force: true });
    post({ type: 'status', estado: 'desligado', motivo: null });
    post({ type: 'result', ok: true, id: m.id });
  } else if (m.type === 'stop') process.exit(0);
});
post({ type: 'ready' });
