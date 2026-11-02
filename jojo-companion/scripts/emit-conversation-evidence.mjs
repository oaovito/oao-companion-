// Apenas conversa sintética de QA no runner Windows; nenhuma conta pessoal é lida.
import { requireWindows } from '../src/main/windows-only.js';
import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
requireWindows();
if (process.env.GITHUB_ACTIONS === 'true') {
  const read = name => { const url = new URL(`../out/${name}`, import.meta.url); return fs.existsSync(url) ? JSON.parse(fs.readFileSync(url, 'utf8')) : null; };
  const data = { engine: read('conversa-real-windows.json'), ui: read('conversa-interface-windows.json') };
  const png = new URL('../out/conversa-interface-windows.png', import.meta.url);
  if (fs.existsSync(png)) for (const part of fs.readFileSync(png).toString('base64').match(/.{1,4000}/g)) console.log(`JOJO_CONVERSATION_PREVIEW:${part}`);
  const digest = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const payload = gzipSync(Buffer.from(JSON.stringify({ commit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID, digest, data }))).toString('base64');
  for (const part of payload.match(/.{1,4000}/g)) console.log(`JOJO_CONVERSATION_REPORT:${part}`);
}
