// Ponte entre a extensão do navegador e o JoJo (mensagens nativas do Chrome,
// Edge e Brave). O navegador inicia este arquivo; ele repassa cada mensagem ao
// JoJo por um canal local e devolve a resposta. Sem dependências: é copiado para
// a pasta de dados e roda com o próprio executável do JoJo.
//
// Se o JoJo estiver fechado ou a chave do bloqueio estiver desligada, o canal
// não existe e a resposta é "desligado": a extensão não faz nada.
const net = require('node:net');

const pipe = process.argv[2] || '';
const MAX = 65536;
let buf = Buffer.alloc(0), pending = 0, ended = false;

function send(obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  const head = Buffer.alloc(4);
  head.writeUInt32LE(body.length, 0);
  process.stdout.write(Buffer.concat([head, body]));
}

function done() {
  pending--;
  if (ended && pending <= 0) process.exit(0);
}

function relay(msg) {
  pending++;
  let answered = false, text = '';
  const answer = (obj) => { if (answered) return; answered = true; clearTimeout(timer); send(obj); sock.destroy(); done(); };
  const sock = net.connect(pipe);
  const timer = setTimeout(() => answer({ t: 'desligado' }), 4000);
  sock.setEncoding('utf8');
  sock.on('connect', () => sock.write(`${JSON.stringify(msg)}\n`));
  sock.on('data', (chunk) => {
    text += chunk;
    if (text.length > 4096) return answer({ t: 'desligado' });
    const end = text.indexOf('\n');
    if (end < 0) return;
    try { answer(JSON.parse(text.slice(0, end))); } catch { answer({ t: 'desligado' }); }
  });
  sock.on('error', () => answer({ t: 'desligado' }));
  sock.on('close', () => answer({ t: 'desligado' }));
}

process.stdin.on('data', (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  while (buf.length >= 4) {
    const len = buf.readUInt32LE(0);
    if (len > MAX) return process.exit(1);
    if (buf.length < 4 + len) break;
    const body = buf.subarray(4, 4 + len);
    buf = buf.subarray(4 + len);
    let msg = null;
    try { msg = JSON.parse(body.toString('utf8')); } catch { /* mensagem inválida: ignora */ }
    if (msg && pipe) relay(msg); else send({ t: 'desligado' });
  }
});
process.stdin.on('end', () => { ended = true; if (pending <= 0) process.exit(0); });
