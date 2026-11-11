// Bloqueio do Discord, parte de detecção: aplicativo (processo e instalação) e
// abas do navegador. Tudo com processos, registro e abas simulados.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  DISCORD_VARIANTS, variantOfExe, runningVariants, parseInstalled, uninstallCommand, isDiscordUrl, DISCORD_TAB_PATTERNS,
  sanitizeBridgeMessage, encodeFrame, FrameReader, FRAME_MAX, hostBat, hostManifest, bridgePipe, NATIVE_HOST, NATIVE_HOST_KEYS, EXTENSION_ID,
} from '../../src/core/discord-detect.js';
import { createDiscordSystem } from '../../src/main/discord-system.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXT = path.join(ROOT, 'assets', 'extensao-discord');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-discord-'));
const WIN = process.platform === 'win32';

test('processo: reconhece Discord, PTB e Canary pelo executável e ignora o resto', () => {
  assert.deepEqual(DISCORD_VARIANTS.map((v) => v.id), ['discord', 'ptb', 'canary']);
  assert.equal(variantOfExe('C:\\Users\\m\\AppData\\Local\\Discord\\app-1.0\\Discord.exe').id, 'discord');
  assert.equal(variantOfExe('DISCORDPTB.EXE').id, 'ptb');
  assert.equal(variantOfExe('DiscordCanary.exe').id, 'canary');
  for (const n of ['discord-helper.exe', 'NotDiscord.exe', 'chrome.exe', 'Discord', '', null]) assert.equal(variantOfExe(n), null, String(n));
  assert.deepEqual(runningVariants(['Discord.exe', 'chrome.exe', 'Discord.exe', 'DiscordCanary.exe']), ['discord', 'canary']);
  assert.deepEqual(runningVariants([]), []);
  assert.deepEqual(runningVariants(null), []);
});

test('instalação: lê só as chaves do Discord e só aceita o desinstalador oficial', () => {
  const reg = JSON.stringify([
    { hive: 'HKCU', chave: 'Discord', nome: 'Discord', uninstall: '"C:\\Users\\manu\\AppData\\Local\\Discord\\Update.exe" --uninstall' },
    { hive: 'HKLM', chave: 'DiscordPTB', nome: 'Discord PTB', uninstall: '"C:\\Program Files\\DiscordPTB\\Update.exe" --uninstall -s' },
    { hive: 'HKCU', chave: 'Spotify', nome: 'Spotify', uninstall: '"C:\\x\\Spotify\\Update.exe" --uninstall' },
    { hive: 'HKXX', chave: 'Discord', nome: 'Discord', uninstall: '"C:\\x\\Discord\\Update.exe" --uninstall' },
    { hive: 'HKCU', chave: 'DiscordCanary', nome: 'Canary', uninstall: '' },
    'lixo', null,
  ]);
  const found = parseInstalled(reg);
  assert.deepEqual(found.map((f) => `${f.hive}:${f.variante}`), ['HKCU:discord', 'HKLM:ptb']);
  assert.deepEqual(uninstallCommand(found[0]), { variante: 'discord', file: 'C:\\Users\\manu\\AppData\\Local\\Discord\\Update.exe', args: ['--uninstall'], admin: false });
  assert.deepEqual(uninstallCommand(found[1]), { variante: 'ptb', file: 'C:\\Program Files\\DiscordPTB\\Update.exe', args: ['--uninstall', '-s'], admin: true });
  // Um objeto só (PowerShell às vezes não devolve lista) e respostas quebradas.
  assert.equal(parseInstalled(JSON.stringify({ hive: 'HKCU', chave: 'Discord', uninstall: '"C:\\a\\Discord\\Update.exe" --uninstall' })).length, 1);
  for (const t of ['', '[]', 'não é json', '{"a":1}', 'null']) assert.deepEqual(parseInstalled(t), [], t);

  const bad = (uninstall, variante = 'discord') => uninstallCommand({ variante, hive: 'HKCU', uninstall });
  for (const u of [
    'cmd.exe /c rmdir /s /q C:\\Users',                                   // outro programa
    '"C:\\Windows\\System32\\cmd.exe" --uninstall',                       // não é o Update.exe
    '"C:\\Users\\m\\AppData\\Local\\Spotify\\Update.exe" --uninstall',    // pasta de outro programa
    '"C:\\Users\\m\\AppData\\Local\\Discord\\Update.exe"',                // sem --uninstall
    '"C:\\Users\\m\\AppData\\Local\\Discord\\Update.exe" --uninstall & del x', // argumento a mais
    '"C:\\Users\\m\\AppData\\Local\\Discord\\Update.exe" --uninstall --processStart cmd.exe',
    '"Discord\\Update.exe" --uninstall',                                  // caminho relativo
    '"%LOCALAPPDATA%\\Discord\\Update.exe" --uninstall',                  // variável não resolvida
    'MsiExec.exe /X{1234}',
    '',
  ]) assert.equal(bad(u), null, u);
  assert.equal(bad('"C:\\a\\Discord\\Update.exe" --uninstall', 'ptb'), null, 'pasta de uma edição não serve para outra');
  assert.equal(uninstallCommand(null), null);
  assert.equal(uninstallCommand({ variante: 'outra', hive: 'HKCU', uninstall: '"C:\\a\\Discord\\Update.exe" --uninstall' }), null);
});

test('abas: só endereços do Discord contam', () => {
  for (const u of ['https://discord.com/app', 'https://discord.com/channels/@me', 'https://ptb.discord.com/login', 'https://canary.discord.com/', 'http://discordapp.com/x', 'https://cdn.discordapp.com/a']) assert.equal(isDiscordUrl(u), true, u);
  for (const u of ['https://notdiscord.com/', 'https://discord.com.evil.com/', 'https://example.com/?next=https://discord.com/app', 'https://google.com/search?q=discord', 'discord', '', null]) assert.equal(isDiscordUrl(u), false, String(u));
});

test('extensão: só pede acesso a endereços do Discord, tem identidade fixa e nenhum som', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.host_permissions, [...DISCORD_TAB_PATTERNS]);
  assert.deepEqual(manifest.permissions, ['nativeMessaging', 'alarms'], 'nada de histórico, leitura de páginas, downloads ou "tabs" geral');
  assert.equal(manifest.content_scripts, undefined, 'não injeta nada em página nenhuma');
  const der = Buffer.from(manifest.key, 'base64');
  const id = [...createHash('sha256').update(der).digest('hex').slice(0, 32)].map((h) => String.fromCharCode(97 + parseInt(h, 16))).join('');
  assert.equal(id, EXTENSION_ID, 'a ponte só aceita esta extensão');
  assert.deepEqual(hostManifest('C:\\x\\ponte.bat'), { name: NATIVE_HOST, description: 'JoJo Companion: abas do Discord', path: 'C:\\x\\ponte.bat', type: 'stdio', allowed_origins: [`chrome-extension://${EXTENSION_ID}/`] });
  const code = fs.readFileSync(path.join(EXT, 'fundo.js'), 'utf8');
  assert.ok(code.includes(`'${NATIVE_HOST}'`));
  for (const p of DISCORD_TAB_PATTERNS) assert.ok(code.includes(`'${p}'`), p);
  assert.doesNotMatch(code, /fetch\(|XMLHttpRequest|WebSocket|new Audio|AudioContext|tts|executeScript|history|cookies/i);
  assert.deepEqual(fs.readdirSync(EXT).sort(), ['fundo.js', 'manifest.json']);
});

/** Navegador simulado: abas de mentira e uma ponte que responde o que o teste mandar. */
function fakeBrowser({ tabs, reply, ua = 'Mozilla/5.0 Chrome/130.0', brave = false }) {
  const listeners = {}, sent = [], removed = [], alarms = [];
  const on = (name) => ({ addListener: (fn) => { listeners[name] = fn; } });
  const match = (url) => isDiscordUrl(url);
  const chrome = {
    tabs: {
      onUpdated: on('updated'),
      // Como o navegador real: com permissão só para o Discord, a consulta só devolve essas abas.
      query: async ({ url }) => { assert.deepEqual([...url], [...DISCORD_TAB_PATTERNS]); return tabs.filter((t) => match(t.url) && !removed.includes(t.id)).map((t) => ({ id: t.id })); },
      remove: async (id) => { const t = tabs.find((x) => x.id === id); if (t?.falha) throw new Error('aba presa'); removed.push(id); },
    },
    runtime: { onStartup: on('startup'), onInstalled: on('installed'), sendNativeMessage: async (host, msg) => { msg = JSON.parse(JSON.stringify(msg)); sent.push({ host, msg }); const r = reply(msg); if (r instanceof Error) throw r; return r; } },
    alarms: { onAlarm: on('alarm'), create: (name, opts) => alarms.push({ name, ...opts }) },
  };
  const ctx = vm.createContext({ chrome, navigator: { userAgent: ua, ...(brave ? { brave: {} } : {}) } });
  vm.runInContext(fs.readFileSync(path.join(EXT, 'fundo.js'), 'utf8'), ctx);
  const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };
  return { listeners, sent, removed, alarms, settle };
}

test('extensão com abas simuladas: fecha só a aba do Discord, e só quando o JoJo manda', async () => {
  const tabs = () => [{ id: 1, url: 'https://mail.google.com/' }, { id: 2, url: 'https://discord.com/channels/@me' }, { id: 3, url: 'https://www.youtube.com/' }, { id: 4, url: 'https://ptb.discord.com/app' }];
  // Bloqueio ligado.
  let b = fakeBrowser({ tabs: tabs(), reply: (m) => (m.t === 'abas' ? { t: 'fechar' } : { t: 'ok' }) });
  b.listeners.updated(2, { url: 'https://discord.com/channels/@me' });
  await b.settle();
  assert.deepEqual(b.removed, [2, 4], 'as outras abas ficam abertas');
  assert.deepEqual(b.sent.map((s) => s.msg), [{ t: 'abas', n: 2, nav: 'chrome' }, { t: 'fechadas', n: 2, falhas: 0, nav: 'chrome' }]);
  assert.ok(b.sent.every((s) => s.host === NATIVE_HOST));
  assert.ok(!JSON.stringify(b.sent).includes('http'), 'nenhum endereço sai do navegador');

  // Chave desligada ou JoJo fechado: nada é fechado.
  for (const reply of [() => ({ t: 'desligado' }), () => new Error('ponte ausente'), () => null]) {
    b = fakeBrowser({ tabs: tabs(), reply });
    b.listeners.updated(2, { url: 'https://discord.com/app' });
    await b.settle();
    assert.deepEqual(b.removed, []);
    assert.equal(b.sent.length, 1);
  }

  // Sem aba do Discord: nem pergunta ao JoJo. Mudança sem endereço (outro site) não dispara nada.
  b = fakeBrowser({ tabs: [{ id: 1, url: 'https://mail.google.com/' }], reply: () => ({ t: 'fechar' }) });
  b.listeners.updated(1, { status: 'complete' });
  b.listeners.startup();
  await b.settle();
  assert.deepEqual([b.sent.length, b.removed.length], [0, 0]);

  // Aba que não fecha entra como falha; Edge e Brave são reconhecidos; a conferência periódica existe.
  b = fakeBrowser({ tabs: [{ id: 7, url: 'https://discord.com/app', falha: true }, { id: 8, url: 'https://discord.com/login' }], reply: () => ({ t: 'fechar' }), ua: 'Mozilla/5.0 Chrome/130.0 Edg/130.0' });
  b.listeners.installed();
  await b.settle();
  assert.deepEqual(b.alarms, [{ name: 'conferir', periodInMinutes: 1 }]);
  assert.deepEqual(b.removed, [8]);
  assert.deepEqual(b.sent.at(-1).msg, { t: 'fechadas', n: 1, falhas: 1, nav: 'edge' });
  b = fakeBrowser({ tabs: [{ id: 9, url: 'https://discord.com/app' }], reply: () => ({ t: 'fechar' }), brave: true });
  b.listeners.alarm({ name: 'conferir' });
  await b.settle();
  assert.equal(b.sent[0].msg.nav, 'brave');
});

test('mensagens da ponte: só quantidade e navegador passam; quadros com tamanho', () => {
  assert.deepEqual(sanitizeBridgeMessage({ t: 'abas', n: 2, nav: 'edge', url: 'https://discord.com/x', titulo: 'segredo' }), { t: 'abas', n: 2, nav: 'edge' });
  assert.deepEqual(sanitizeBridgeMessage({ t: 'abas', n: 1, nav: 'safari' }), { t: 'abas', n: 1, nav: 'outro' });
  assert.deepEqual(sanitizeBridgeMessage({ t: 'fechadas', n: 0, falhas: 2, nav: 'brave' }), { t: 'fechadas', n: 0, falhas: 2, nav: 'brave' });
  for (const m of [{ t: 'abas', n: 0 }, { t: 'abas', n: 51 }, { t: 'abas', n: '2' }, { t: 'abas', n: 1.5 }, { t: 'fechadas', n: 0, falhas: 0 }, { t: 'desinstalar' }, { t: 'fechar' }, 'abas', null, []]) assert.equal(sanitizeBridgeMessage(m), null, JSON.stringify(m));

  const r = new FrameReader();
  const a = encodeFrame({ t: 'abas', n: 1, nav: 'chrome' }), b = encodeFrame({ t: 'fechadas', n: 1, falhas: 0, nav: 'chrome' });
  const all = Buffer.concat([a, b]);
  assert.deepEqual(r.push(all.subarray(0, 3)), []);
  assert.deepEqual(r.push(all.subarray(3, a.length + 2)), [{ t: 'abas', n: 1, nav: 'chrome' }]);
  assert.deepEqual(r.push(all.subarray(a.length + 2)), [{ t: 'fechadas', n: 1, falhas: 0, nav: 'chrome' }]);
  const big = Buffer.alloc(4); big.writeUInt32LE(FRAME_MAX + 1, 0);
  const r2 = new FrameReader();
  assert.deepEqual(r2.push(big), []);
  assert.equal(r2.broken, true);
  assert.deepEqual(r2.push(a), [], 'depois de um tamanho inválido não lê mais nada');

  assert.equal(hostBat({ exe: 'C:\\App 100%\\JoJo.exe', script: 'C:\\d\\ponte.cjs', pipe: '\\\\.\\pipe\\x' }), '@echo off\r\nset ELECTRON_RUN_AS_NODE=1\r\n"C:\\App 100%%\\JoJo.exe" "C:\\d\\ponte.cjs" "\\\\.\\pipe\\x"\r\n');
  assert.throws(() => hostBat({ exe: 'C:\\a".exe', script: 'b', pipe: 'c' }));
  assert.match(bridgePipe('C:\\Users\\a'), /^\\\\\.\\pipe\\jojo-discord-[0-9a-f]{16}$/);
  assert.notEqual(bridgePipe('C:\\Users\\a'), bridgePipe('C:\\Users\\b'));
});

test('sistema simulado: processos pelo detector, instalação pelo registro, ponte registrada para os três navegadores', async () => {
  const dir = tmp();
  const calls = [];
  let regOut = JSON.stringify([{ hive: 'HKCU', chave: 'DiscordCanary', nome: 'Discord Canary', uninstall: '"C:\\u\\DiscordCanary\\Update.exe" --uninstall' }]);
  let regFail = false;
  const execFile = (file, args, opts, cb) => {
    calls.push({ file, args });
    if (file === 'powershell.exe') return cb(regFail ? new Error('sem powershell') : null, regOut);
    cb(null, '');
  };
  let detector = { available: true, discordRunning: async () => ['Discord.exe', 'DiscordPTB.exe', 'Discord.exe'] };
  const sys = createDiscordSystem({ userData: dir, root: ROOT, exe: 'C:\\JoJo\\JoJo Companion.exe', getDetector: () => detector, execFile });

  assert.deepEqual(await sys.running(), ['discord', 'ptb']);
  detector = { available: false };
  await assert.rejects(sys.running(), /detector_unavailable/, 'sem detector não afirma que está fechado');

  assert.deepEqual(await sys.installed(), [{ variante: 'canary', hive: 'HKCU', nome: 'Discord Canary', uninstall: '"C:\\u\\DiscordCanary\\Update.exe" --uninstall' }]);
  const ps = calls.find((c) => c.file === 'powershell.exe');
  assert.ok(ps.args.includes('-NonInteractive'));
  assert.match(ps.args.at(-1), /Uninstall/);
  assert.doesNotMatch(ps.args.at(-1), /Remove-|Set-Item|New-Item|Start-Process|Invoke-/i, 'a leitura do registro só lê');
  regFail = true;
  await assert.rejects(sys.installed(), /registry_unavailable/);

  calls.length = 0;
  const r = await sys.installBridge();
  assert.deepEqual([r.ok, r.registradas], [true, 3]);
  assert.deepEqual(fs.readdirSync(r.pasta).sort(), ['fundo.js', 'manifest.json']);
  const base = path.join(dir, 'discord-ponte');
  const manifest = JSON.parse(fs.readFileSync(path.join(base, `${NATIVE_HOST}.json`), 'utf8'));
  assert.equal(manifest.path, path.join(base, 'ponte.bat'));
  assert.ok(fs.readFileSync(path.join(base, 'ponte.bat'), 'latin1').includes('"C:\\JoJo\\JoJo Companion.exe"'));
  assert.equal(fs.readFileSync(path.join(base, 'ponte.cjs'), 'utf8'), fs.readFileSync(path.join(ROOT, 'src', 'main', 'discord-host.cjs'), 'utf8'));
  assert.deepEqual(calls.map((c) => [c.file, c.args[0], c.args[1]]), NATIVE_HOST_KEYS.map((k) => ['reg.exe', 'add', k]));
  assert.ok(calls.every((c) => c.args[1].startsWith('HKCU\\')), 'só o registro do próprio usuário');

  calls.length = 0;
  await sys.removeBridge();
  assert.deepEqual(calls.map((c) => [c.args[0], c.args[1]]), NATIVE_HOST_KEYS.map((k) => ['delete', k]));
  assert.equal(fs.existsSync(path.join(base, 'ponte.bat')), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ponte de verdade com navegador simulado: a mensagem chega ao JoJo e a resposta volta; sem canal, "desligado"', { skip: !WIN }, async () => {
  const dir = tmp();
  const sys = createDiscordSystem({ userData: dir, root: ROOT, execFile: (f, a, o, cb) => cb(null, '') });
  const got = [];
  const ask = (msg, pipe = sys.pipe) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'src', 'main', 'discord-host.cjs'), pipe], { stdio: ['pipe', 'pipe', 'ignore'] });
    const reader = new FrameReader(); const out = [];
    child.stdout.on('data', (c) => out.push(...reader.push(c)));
    child.on('error', reject);
    child.on('exit', () => resolve(out));
    child.stdin.end(encodeFrame(msg));
  });
  // Sem canal aberto (chave desligada): a ponte responde "desligado".
  assert.deepEqual(await ask({ t: 'abas', n: 1, nav: 'chrome' }), [{ t: 'desligado' }]);

  const server = sys.listen(async (msg) => { got.push(msg); return msg.t === 'abas' ? { t: 'fechar' } : { t: 'ok' }; });
  await new Promise((resolve) => server.once('listening', resolve));
  assert.deepEqual(await ask({ t: 'abas', n: 2, nav: 'edge', url: 'https://discord.com/segredo' }), [{ t: 'fechar' }]);
  assert.deepEqual(await ask({ t: 'fechadas', n: 2, falhas: 0, nav: 'edge' }), [{ t: 'ok' }]);
  assert.deepEqual(got, [{ t: 'abas', n: 2, nav: 'edge' }, { t: 'fechadas', n: 2, falhas: 0, nav: 'edge' }], 'só quantidade e navegador chegam ao JoJo');
  // Mensagem fora do combinado não chega ao JoJo.
  assert.deepEqual(await ask({ t: 'desinstalar', alvo: 'tudo' }), [{ t: 'desligado' }]);
  assert.equal(got.length, 2);
  sys.close();
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepEqual(await ask({ t: 'abas', n: 1, nav: 'chrome' }), [{ t: 'desligado' }], 'canal fechado: volta a "desligado"');
  fs.rmSync(dir, { recursive: true, force: true });
});
