// Portão do servidor da conversa do JoJo (roda no computador que tem o Ollama,
// NÃO no notebook dela). Só deixa passar quem tem a chave, só as duas rotas que
// o JoJo usa (/api/chat e /api/tags) e uma conversa por vez: o Ollama fica
// escutando apenas em 127.0.0.1 e nunca é exposto direto.
//
// Uso:  node jojo-gateway.mjs            (lê a chave de JOJO_CHAVE ou do arquivo jojo-chave.txt)
// Rede: escuta em JOJO_HOST:JOJO_PORT (padrão 0.0.0.0:11435). Use pela rede privada
//       do Tailscale; não abra essa porta para a internet no roteador.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OLLAMA = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const HOST = process.env.JOJO_HOST || '0.0.0.0';
const PORT = Number(process.env.JOJO_PORT || 11435);
const MAX_BODY = 64 * 1024; // mensagens do JoJo são curtas
const MAX_FILA = 4;
const ROTAS = new Set(['POST /api/chat', 'GET /api/tags']);

function lerChave() {
  if (process.env.JOJO_CHAVE) return process.env.JOJO_CHAVE.trim();
  const f = path.join(DIR, 'jojo-chave.txt');
  if (!fs.existsSync(f)) {
    fs.writeFileSync(f, crypto.randomBytes(24).toString('base64url'), { mode: 0o600 });
    console.log(`Chave nova criada em ${f} (cole nas Configurações do JoJo → Chave do servidor).`);
  }
  return fs.readFileSync(f, 'utf8').trim();
}

/** Comparação em tempo constante (não vaza a chave por tempo de resposta). */
export function chaveOk(header, chave) {
  const m = /^Bearer (.+)$/.exec(String(header || ''));
  if (!m || !chave) return false;
  const a = Buffer.from(m[1]);
  const b = Buffer.from(chave);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function criarPortao({ chave, ollama = OLLAMA, log = console.log } = {}) {
  let ocupado = false;
  const fila = [];
  const proximo = () => {
    ocupado = false;
    const f = fila.shift();
    if (f) f();
  };
  return http.createServer((req, res) => {
    const rota = `${req.method} ${req.url.split('?')[0]}`;
    if (!ROTAS.has(rota)) return res.writeHead(404).end();
    if (!chaveOk(req.headers.authorization, chave)) return res.writeHead(401).end();
    const corpo = [];
    let tam = 0;
    req.on('data', (c) => {
      tam += c.length;
      if (tam > MAX_BODY) req.destroy();
      else corpo.push(c);
    });
    req.on('end', () => {
      const ir = () => {
        ocupado = true;
        const t0 = Date.now();
        const up = http.request(`${ollama}${req.url}`, { method: req.method, headers: { 'Content-Type': 'application/json' } }, (r) => {
          res.writeHead(r.statusCode, { 'Content-Type': r.headers['content-type'] || 'application/json' });
          r.pipe(res);
          r.on('end', () => {
            if (rota === 'POST /api/chat') log(`chat ${Date.now() - t0} ms`);
            proximo();
          });
        });
        up.on('error', (e) => {
          if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Ollama indisponível: ${e.message}` }));
          proximo();
        });
        res.on('close', () => up.destroy()); // cancelou do lado do JoJo: para de gerar
        up.end(Buffer.concat(corpo));
      };
      if (rota === 'GET /api/tags' || !ocupado) return ir();
      if (fila.length >= MAX_FILA) return res.writeHead(429).end();
      fila.push(ir);
    });
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const chave = lerChave();
  criarPortao({ chave }).listen(PORT, HOST, () => console.log(`Portão do JoJo em http://${HOST}:${PORT} → ${OLLAMA}`));
}
