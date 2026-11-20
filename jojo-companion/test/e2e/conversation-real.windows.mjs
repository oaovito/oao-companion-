// Interface, IPC, controlador e inferência local reais no Windows. Só dados sintéticos.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { requireWindows } from '../../src/main/windows-only.js';
import { SETTINGS_VERSION } from '../../src/core/settings-schema.js';
import { PERSONALITY_DEFAULTS } from '../../src/core/personality.js';
import { OLLAMA_MODEL } from '../../src/core/dialogue/llm-provider.js';
import { erroDeCoerencia } from '../../src/core/dialogue/coherence.js';

requireWindows();
const require = createRequire(import.meta.url);
const { _electron } = require('playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = process.env.JOJO_LLM_BASE;
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base || '')) throw new Error('O ensaio usa somente Ollama em loopback');
const model = process.env.JOJO_QA_MODEL || OLLAMA_MODEL;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('Central Windows conversa com modelo real, preserva contexto e liga a expressão ao conteúdo', { timeout: 600000 }, async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-real-ui-'));
  const rows = [], errors = [];
  let app, central;
  const output = path.join(ROOT, 'out', 'conversa-interface-windows.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify({
    version: SETTINGS_VERSION, iaAtivo: true, iaProvedor: 'ollama', iaModelo: model,
    webSearch: false, agendaAtiva: false, speechFrequency: 'off', startWithWindows: false,
  }));
  fs.writeFileSync(path.join(userData, 'personality.json'), JSON.stringify({
    ...PERSONALITY_DEFAULTS,
    lembreteComida: { ativo: false }, lembreteTreino: { ativo: false },
  }));
  try {
    app = await _electron.launch({ executablePath: require('electron'), args: [ROOT], cwd: ROOT,
      env: { ...process.env, JOJO_TEST: '1', JOJO_VIGIA: '0', JOJO_USER_DATA: userData, JOJO_LLM_BASE: base } });
    const overlay = await app.firstWindow();
    overlay.on('pageerror', (error) => errors.push(error.message));
    for (let i = 0; i < 80; i++) {
      if (await app.evaluate(() => !!globalThis.__jojo?.companion.started)) break;
      await sleep(100);
    }
    await app.evaluate(() => {
      globalThis.__jojo.setCursor({ x: 5, y: 5 });
      globalThis.__jojo.companion.dateNow = () => new Date(2026, 9, 30, 15);
      // Instrumentação só deste ensaio sintético. O aplicativo distribuído não
      // recebe ganchos nem passa a registrar o conteúdo das conversas.
      const dialogue = globalThis.__jojo.companion.dialogue;
      const diagnostics = globalThis.__jojoConversationQa = { rawReplies: [], warnings: [], lastInput: null };
      const originalReply = dialogue.llm._replyOllama;
      dialogue.llm._replyOllama = async function (...args) {
        const input = diagnostics.lastInput = String(args[0]?.text || '');
        try {
          const rawContent = await originalReply.apply(this, args);
          diagnostics.rawReplies.push({ input, rawContent });
          return rawContent;
        } catch (error) {
          diagnostics.rawReplies.push({ input, error: { name: String(error?.name || 'Error'), message: String(error?.message || error) } });
          throw error;
        }
      };
      const originalLog = dialogue.log;
      dialogue.log = function (...args) {
        const [level, message] = args;
        if (level === 'warn' || level === 'error') diagnostics.warnings.push({ input: diagnostics.lastInput, level, message: String(message) });
        return originalLog.apply(this, args);
      };
    });
    const opening = app.waitForEvent('window');
    await app.evaluate(() => globalThis.__jojo.companion.openApp());
    central = await opening;
    central.on('pageerror', (error) => errors.push(error.message));
    await central.waitForSelector('#input');
    assert.equal(await central.locator('#newChat').count(), 0);
    const cases = [
      { text: 'quem é o seu chefe?', pattern: /João/ },
      { text: 'você está bem?', model: true },
      { text: 'Minha cor preferida é verde.', model: true },
      { text: 'Qual cor eu acabei de dizer que prefiro?', model: true, pattern: /verde/i },
      { text: 'Eu disse verde, não azul.', model: true, pattern: /verde/i },
      { text: 'Qual cor você deve lembrar agora?', model: true, pattern: /verde/i },
      { text: 'Derrubei café no teclado agora.', model: true, action: 'comfort' },
      { text: 'Não consegui terminar meu projeto.', model: true, action: 'comfort' },
      { text: 'o que é diabetes tipo 2?', model: true, pattern: /insulina/i, action: 'lecture' },
      { text: 'me dá um exemplo', model: true, pattern: /imagine|por exemplo|suponha|considere/i, action: 'lecture' },
      { text: 'esses óculos são feios', pattern: /óculos/i, action: 'judge' },
      { text: 'quero morrer', pattern: /188/, action: 'comfort' },
    ];
    let guardFallbacks = 0;
    for (const c of cases) {
      // Mesma fonte de contexto usada pelo motor: só falas anteriores ao envio,
      // sem promover a resposta atual ou mensagens do JoJo a fatos da usuária.
      const history = await app.evaluate(() => globalThis.__jojo.companion.dialogue.history);
      assert.ok(Array.isArray(history), 'histórico real do motor disponível para a guarda');
      const start = performance.now();
      const reply = await central.evaluate((input) => window.appApi.send(null, input), c.text);
      const row = { input: c.text, text: reply.text, intent: reply.intent, action: reply.action, ms: Math.round(performance.now() - start), ...(reply.error !== undefined ? { error: reply.error } : {}) };
      rows.push(row); console.log('INTERFACE ' + JSON.stringify(row));
      assert.equal(erroDeCoerencia(c.text, reply.text, history), null);
      if (c.model && reply.intent !== 'ia') {
        // Regra irredutível do JoJo: fala do modelo com cara de assistente é descartada
        // e cai na resposta programada. Só esse caminho é aceito, comprovado pelo
        // diagnóstico (modelo chamado de fato + guarda registrada), no máximo uma vez
        // por ensaio; qualquer outro desvio continua reprovando.
        const qa = await app.evaluate(() => globalThis.__jojoConversationQa);
        const raw = qa.rawReplies.filter((r) => r.input === c.text).at(-1);
        // Guardas do JoJo: fora do personagem, ou coerência (insulto, bronca, perspectiva trocada…)
        // nas duas gerações. As respostas recusadas ficam no relatório para revisão.
        const avisos = qa.warnings.filter((w) => w.input === c.text).map((w) => w.message);
        // Coerência: a primeira foi recusada ("gerando de novo") e a segunda também, por guarda,
        // não por falha do motor (tempo esgotado, HTTP, indisponível continuam reprovando).
        const coerencia = avisos.some((m) => /gerando de novo/.test(m))
          && avisos.some((m) => /^IA: .*usando respostas programadas/.test(m) && !/tempo|timeout|HTTP|indispon|abort|vazia/i.test(m));
        const guarded = avisos.some((m) => /fora do personagem/.test(m)) || coerencia;
        const recusadas = qa.rawReplies.filter((r) => r.input === c.text).map((r) => r.rawContent || r.error?.message);
        assert.ok(raw && !raw.error && guarded, `${c.text}: ${reply.text} | modelo: ${JSON.stringify(recusadas)} | guardas: ${JSON.stringify(avisos)}`);
        row.guard = avisos.join(' / ');
        row.recusadas = recusadas;
        guardFallbacks++;
        assert.ok(guardFallbacks <= 1, `guarda de personagem acionada ${guardFallbacks} vezes: ${c.text}`);
      }
      if (c.pattern) assert.match(reply.text, c.pattern);
      if (c.action) assert.equal(reply.action, c.action);
      const state = await central.evaluate(() => window.appApi.state());
      assert.equal(state.conversations.length, 1);
      assert.ok(state.current.messages.some((m) => m.who === 'jojo' && m.text === reply.text));
      await central.waitForFunction((text) => document.querySelector('#log .msg.jojo:last-child')?.textContent === text, reply.text);
    }
    const before = await central.evaluate(() => window.appApi.state());
    const after = await central.evaluate(() => window.appApi.newChat());
    assert.equal(after.currentId, before.currentId);
    assert.deepEqual(after.current.messages, before.current.messages);
    assert.deepEqual(errors, []);
  } finally {
    let diagnostics = { rawReplies: [], warnings: [] };
    if (app) {
      try { diagnostics = await app.evaluate(() => globalThis.__jojoConversationQa || { rawReplies: [], warnings: [] }); }
      catch (error) { diagnostics.collectionError = String(error.message || error); }
    }
    fs.writeFileSync(output, JSON.stringify({ model, platform: process.platform, fixture: 'Interface/IPC/controlador/modelo reais; perfil e conversa sintéticos; pesquisa externa desligada', semantic_review_required: true, rows, rendererErrors: errors, diagnostics }, null, 2));
    if (central && !central.isClosed()) {
      const png = await central.screenshot().catch(() => null);
      if (png) {
        fs.writeFileSync(path.join(ROOT, 'out', 'conversa-interface-windows.png'), png);
        if (process.env.GITHUB_ACTIONS) for (const part of png.toString('base64').match(/.{1,4000}/g)) console.log(`JOJO_CHAT_PREVIEW:${part}`);
      }
    }
    if (app) {
      await app.evaluate(() => globalThis.__jojo.quit()).catch(() => {});
      await app.close().catch(() => {});
    }
    fs.rmSync(userData, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
