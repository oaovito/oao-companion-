// Bloqueio do Discord, parte de configuração: a chave (desligada por padrão),
// o guardião que liga detecção e reação, o histórico visível e o /discord.
// O sistema é simulado: nada é encerrado, registrado ou desinstalado de verdade.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEnv, chatAdv } from './helpers.js';
import { DEFAULTS } from '../../src/core/settings-schema.js';
import { commandMenu, parseCommand } from '../../src/core/conversations.js';
import { createDiscordGuard, DISCORD_CHECK_MS } from '../../src/main/discord-guard.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const settle = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r)); };

function fakeSystem(pc = { abertas: [], instaladas: [] }) {
  const calls = [];
  let handler = null;
  return {
    calls, pc, bridge: (msg) => handler(msg), get listening() { return !!handler; },
    running: async () => { calls.push('running'); return [...pc.abertas]; },
    installed: async () => { calls.push('installed'); return pc.instaladas.map((e) => ({ ...e })); },
    kill: async () => { calls.push('kill'); pc.abertas = []; return { detected: 1, remaining: 0 }; },
    uninstall: async (cmd) => { calls.push(`uninstall:${cmd.variante}`); pc.instaladas = pc.instaladas.filter((e) => e.variante !== cmd.variante); return { ok: true }; },
    installBridge: async () => { calls.push('installBridge'); return { ok: true, registradas: 3 }; },
    removeBridge: async () => { calls.push('removeBridge'); },
    listen: (fn) => { calls.push('listen'); handler = fn; },
    close: () => { calls.push('close'); handler = null; },
    extensionDir: 'C:\\dados\\discord-ponte\\extensao',
  };
}

function setup({ on = false, pc } = {}) {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } }, settings: { discordBloqueio: on } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  e.companion.dialogue.llm = null;
  const sys = fakeSystem(pc);
  const timers = [];
  let notified = 0;
  const guard = createDiscordGuard({ userData: e.dir, root: ROOT, companion: e.companion, store: e.store, system: sys, notify: () => { notified++; },
    setTimer: (fn, ms) => { const t = { fn, ms, on: true }; timers.push(t); return t; }, clearTimer: (t) => { t.on = false; } });
  return { ...e, sys, guard, timers, notified: () => notified };
}

test('chave: existe, vem desligada, aceita só verdadeiro/falso e atualização nunca liga sozinha', () => {
  assert.equal(DEFAULTS.discordBloqueio, false);
  const antigo = makeEnv({});
  assert.equal(antigo.store.get().discordBloqueio, false, 'instalação que nunca viu a chave: desligada');
  antigo.store.update({ discordBloqueio: 'sim' });
  assert.equal(antigo.store.get().discordBloqueio, false);
  antigo.store.update({ discordBloqueio: true });
  assert.equal(antigo.store.get().discordBloqueio, true);
  antigo.store.reset();
  assert.equal(antigo.store.get().discordBloqueio, false, 'restaurar padrões desliga');
  // As chaves antigas do foco continuam como eram.
  assert.equal(DEFAULTS.discordCloseOnFocus, true);
  assert.equal(DEFAULTS.discordForceClose, false);
});

test('guardião desligado: não confere processo, não lê registro, não abre canal nem registra a ponte', async () => {
  const s = setup({ on: false, pc: { abertas: ['discord'], instaladas: [{ variante: 'discord', hive: 'HKCU', nome: 'Discord', uninstall: '"C:\\u\\Discord\\Update.exe" --uninstall' }] } });
  await s.guard.apply();
  await s.guard.check();
  await settle();
  assert.deepEqual(s.sys.calls, []);
  assert.deepEqual(s.timers, []);
  assert.deepEqual(s.guard.snapshot(), { ativo: false, ponte: false, pastaExtensao: null, historico: [] });
  assert.equal(s.guard.extensionDir, null);
});

test('ligar a chave: prepara a ponte, abre o canal, confere a cada 15 s e age; desligar desfaz tudo', async () => {
  const pc = { abertas: ['discord'], instaladas: [{ variante: 'discord', hive: 'HKCU', nome: 'Discord', uninstall: '"C:\\u\\Discord\\Update.exe" --uninstall' }] };
  const s = setup({ on: false, pc });
  s.store.update({ discordBloqueio: true });
  await s.guard.apply();
  await settle();
  assert.deepEqual(s.sys.calls.slice(0, 2), ['installBridge', 'listen']);
  assert.deepEqual(s.timers.map((t) => [t.ms, t.on]), [[DISCORD_CHECK_MS, true]]);
  assert.equal(DISCORD_CHECK_MS, 15000);
  assert.ok(s.sys.calls.includes('kill') && s.sys.calls.includes('uninstall:discord'), s.sys.calls.join(','));
  const snap = s.guard.snapshot();
  assert.deepEqual([snap.ativo, snap.ponte, snap.pastaExtensao], [true, true, 'C:\\dados\\discord-ponte\\extensao']);
  assert.equal(snap.historico.length, 2);
  assert.match(snap.historico[0].texto, /Desinstalei pelo desinstalador do próprio aplicativo/);
  assert.match(snap.historico[0].quando, /\d{2}\/\d{2}\/\d{4}/);
  assert.ok(s.notified() >= 2, 'a tela de configurações é avisada a cada registro');
  // O histórico fica em disco e volta ao reabrir.
  const disk = JSON.parse(fs.readFileSync(path.join(s.dir, 'discord-historico.json'), 'utf8'));
  assert.deepEqual((disk.itens || disk.data?.itens).map((h) => h.acao), ['encerrado', 'desinstalado']);

  // Aba pela extensão.
  assert.deepEqual(await s.sys.bridge({ t: 'abas', n: 1, nav: 'chrome' }), { t: 'fechar' });
  assert.deepEqual(await s.sys.bridge({ t: 'fechadas', n: 1, falhas: 0, nav: 'chrome' }), { t: 'ok' });
  assert.match(s.guard.snapshot().historico[0].texto, /Chrome/);

  // Conferência periódica: Discord reaberto é encerrado de novo.
  pc.abertas = ['discord']; s.sys.calls.length = 0;
  s.clock.advance(25e3);
  await s.timers[0].fn();
  assert.ok(s.sys.calls.includes('kill'));

  // Desligar.
  s.sys.calls.length = 0;
  s.store.update({ discordBloqueio: false });
  await s.guard.apply();
  assert.deepEqual(s.sys.calls, ['close', 'removeBridge']);
  assert.equal(s.timers[0].on, false);
  assert.equal(s.sys.listening, false);
  pc.abertas = ['discord']; s.sys.calls.length = 0;
  await s.guard.check();
  assert.deepEqual(s.sys.calls, [], 'desligado: a conferência não lê nada');
  assert.equal(s.guard.snapshot().historico.length, 4, 'o histórico continua visível depois de desligar');
});

test('/discord: mostra o estado e o histórico; não liga nem desliga nada', async () => {
  assert.ok(commandMenu({ petVisible: true }).some((c) => c.cmd === '/discord' && /Configurações/.test(c.hint)));
  assert.equal(parseCommand('/discord'), 'discord');
  const s = setup({ on: false });
  s.companion.enterInteraction('test');
  let r = await chatAdv(s, '/discord');
  assert.match(r.text, /desligado/i);
  assert.match(r.text, /não detecto nem faço nada|Sem detecção e sem ação/);
  assert.match(r.text, /Nenhum registro|Histórico vazio/);
  r = await chatAdv(s, '/discord ligar');
  assert.equal(s.store.get().discordBloqueio, false, 'a chave só muda nas Configurações');

  s.store.update({ discordBloqueio: true });
  s.sys.pc.abertas = ['canary'];
  await s.guard.apply();
  await settle();
  r = await chatAdv(s, '/discord');
  assert.match(r.text, /ligado/i);
  assert.match(r.text, /\d{2}\/\d{2}\/\d{4}.*Vi o Discord Canary aberto\. Encerrei o processo\./);
});

test('tela de configurações: a explicação vem antes da chave, a chave pede confirmação e o histórico aparece', () => {
  const html = read('src/renderer/settings/index.html');
  const bloco = html.slice(html.indexOf('id="discordBlock"'), html.indexOf('<legend>Modo Trabalho</legend>'));
  assert.ok(bloco.indexOf('id="discordOQueFaz"') < bloco.indexOf('name="discordBloqueio"'), 'o que ela faz aparece antes da chave');
  for (const trecho of [/Discord PTB/, /Discord Canary/, /desinstalo o aplicativo/, /desinstalador do próprio Discord/, /só a aba do Discord/, /histórico/i, /não apago pastas/i, /conta do Discord/, /permissão de administrador/, /Com a chave desligada, eu não detecto nem faço nada/, /desligado por padrão/, /Firefox não é atendido/]) assert.match(bloco, trecho);
  assert.match(bloco, /id="discordHistory"/);
  const js = read('src/renderer/settings/settings.js');
  assert.match(js, /el\.name === 'discordBloqueio' && el\.checked && !confirm\(/);
  assert.match(js, /el\.checked = false;\s+return;/);
  assert.match(read('src/preload/settings-preload.cjs'), /openDiscordExtension/);
  const main = read('src/main/main.js');
  assert.match(main, /changed\.includes\('discordBloqueio'\)\) discordGuard\?\.apply\(\)/);
  assert.match(main, /discord: discordGuard\?\.snapshot\(\)/);
});
