// Lado do sistema do bloqueio do Discord (somente Windows): lê os processos
// abertos, o registro de programas instalados e recebe o aviso de abas vindo da
// extensão do navegador. Tudo é injetável para os testes usarem processos e
// abas simulados. Nada aqui roda com a chave do bloqueio desligada: quem chama
// é o guardião, que só existe ligado.
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { execFile as nodeExecFile } from 'node:child_process';
import { runningVariants, parseInstalled, uninstallCommand, sanitizeBridgeMessage, bridgePipe, hostManifest, hostBat, NATIVE_HOST, NATIVE_HOST_KEYS } from '../core/discord-detect.js';

// Só .NET embutido do PowerShell 5.1: lê as três chaves de desinstalação do
// Discord nos dois lugares em que o Windows registra programas.
const REGISTRY_SCRIPT = [
  '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)',
  '$r = @()',
  "foreach ($h in @('HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall')) {",
  "  foreach ($k in @('Discord','DiscordPTB','DiscordCanary')) {",
  '    $p = Join-Path $h $k',
  '    if (Test-Path -LiteralPath $p) { $i = Get-ItemProperty -LiteralPath $p; $r += [pscustomobject]@{ hive = $h.Substring(0,4); chave = $k; nome = [string]$i.DisplayName; uninstall = [string]$i.UninstallString } }',
  '  }',
  '}',
  'ConvertTo-Json -Compress -InputObject @($r)',
].join('; ').replace(/\{; /g, '{ ').replace(/; \}/g, ' }');

const EXTENSION_FILES = ['manifest.json', 'fundo.js'];

export function createDiscordSystem({ userData, root, exe = process.execPath, getDetector = () => null, execFile = nodeExecFile, log = () => {}, allowUninstall = process.env.JOJO_TEST !== '1', wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  const dir = path.join(userData, 'discord-ponte');
  const pipe = bridgePipe(userData);
  const run = (file, args, opts = {}) => new Promise((resolve) => {
    try {
      execFile(file, args, { windowsHide: true, timeout: 8000, encoding: 'utf8', ...opts }, (error, stdout) => resolve({ error: error || null, stdout: String(stdout || '') }));
    } catch (error) { resolve({ error, stdout: '' }); }
  });
  let server = null;

  /** Edições do Discord com processo aberto agora. */
  async function running() {
    const detector = getDetector();
    if (!detector?.available || !detector.discordRunning) throw new Error('detector_unavailable');
    return runningVariants(await detector.discordRunning());
  }

  /** Edições instaladas, com o desinstalador que o próprio Discord registrou. */
  async function installed() {
    const { error, stdout } = await run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', REGISTRY_SCRIPT]);
    if (error) throw new Error('registry_unavailable');
    return parseInstalled(stdout);
  }

  /** Encerra o Discord: pede o fechamento normal e, se não bastar, encerra o processo. */
  async function kill() {
    const detector = getDetector();
    if (!detector?.available || !detector.closeDiscord) throw new Error('detector_unavailable');
    return detector.closeDiscord({ force: true });
  }

  /**
   * Roda o desinstalador oficial (validado de novo por uninstallCommand). Nenhuma
   * pasta é apagada aqui. Instalação para todos os usuários: o pedido de
   * administrador é o do próprio Windows (UAC), visível; recusado, vira falha.
   * Em ambiente de teste (JOJO_TEST=1) nunca executa.
   */
  async function uninstall(cmd) {
    if (!allowUninstall) return { ok: false, erro: 'erro_do_desinstalador' };
    const again = cmd && uninstallCommand({ variante: cmd.variante, hive: cmd.admin ? 'HKLM' : 'HKCU', uninstall: `"${cmd.file}" ${(cmd.args || []).join(' ')}` });
    if (!again) return { ok: false, erro: 'desinstalador_desconhecido' };
    const r = again.admin
      ? await run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '$p = Start-Process -FilePath $env:JOJO_DISCORD_FILE -ArgumentList $env:JOJO_DISCORD_ARGS -Verb RunAs -Wait -PassThru; exit $p.ExitCode'],
        { timeout: 180000, env: { ...process.env, JOJO_DISCORD_FILE: again.file, JOJO_DISCORD_ARGS: again.args.join(' ') } })
      : await run(again.file, again.args, { timeout: 120000 });
    if (r.error) {
      const code = r.error.code;
      return { ok: false, erro: r.error.killed ? 'tempo_esgotado' : again.admin || code === 'EACCES' || code === 'EPERM' ? 'permissao_negada' : 'erro_do_desinstalador' };
    }
    // O desinstalador pode terminar de limpar o registro alguns segundos depois de sair.
    for (let i = 0; i < 6; i++) {
      let still = true;
      try { still = (await installed()).some((e) => e.variante === again.variante); } catch { break; }
      if (!still) break;
      await wait(2000);
    }
    return { ok: true };
  }

  /**
   * Prepara a ponte com o navegador: copia a extensão e a ponte para a pasta de
   * dados do JoJo e registra a ponte para Chrome, Edge e Brave (registro do
   * próprio usuário, sem administrador). A extensão é instalada à mão.
   */
  async function installBridge() {
    const ext = path.join(dir, 'extensao');
    fs.mkdirSync(ext, { recursive: true });
    for (const f of EXTENSION_FILES) fs.writeFileSync(path.join(ext, f), fs.readFileSync(path.join(root, 'assets', 'extensao-discord', f)));
    const script = path.join(dir, 'ponte.cjs');
    fs.writeFileSync(script, fs.readFileSync(path.join(root, 'src', 'main', 'discord-host.cjs')));
    const bat = path.join(dir, 'ponte.bat');
    fs.writeFileSync(bat, hostBat({ exe, script, pipe }), 'utf8');
    const manifest = path.join(dir, `${NATIVE_HOST}.json`);
    fs.writeFileSync(manifest, JSON.stringify(hostManifest(bat), null, 2));
    let ok = 0;
    for (const key of NATIVE_HOST_KEYS) {
      const r = await run('reg.exe', ['add', key, '/ve', '/t', 'REG_SZ', '/d', manifest, '/f']);
      if (r.error) log('warn', 'Não consegui registrar a ponte do navegador para o bloqueio do Discord.'); else ok++;
    }
    return { ok: ok > 0, registradas: ok, pasta: ext };
  }

  /** Desfaz o registro da ponte: sem ele, a extensão não fala com ninguém. */
  async function removeBridge() {
    for (const key of NATIVE_HOST_KEYS) await run('reg.exe', ['delete', key, '/f']);
    for (const f of ['ponte.bat', `${NATIVE_HOST}.json`]) { try { fs.unlinkSync(path.join(dir, f)); } catch { /* já não existia */ } }
  }

  /**
   * Abre o canal local que recebe os avisos da extensão. `handler(msg)` recebe
   * só mensagens válidas ({t:'abas'|'fechadas', n, nav}) e devolve a resposta.
   */
  function listen(handler) {
    close();
    const srv = net.createServer((sock) => {
      let text = '';
      sock.setEncoding('utf8');
      const timer = setTimeout(() => sock.destroy(), 5000);
      sock.on('error', () => {});
      sock.on('close', () => clearTimeout(timer));
      sock.on('data', async (chunk) => {
        text += chunk;
        if (text.length > 4096) return sock.destroy();
        const end = text.indexOf('\n');
        if (end < 0) return;
        const line = text.slice(0, end);
        text = '';
        let reply = { t: 'desligado' };
        try {
          const msg = sanitizeBridgeMessage(JSON.parse(line));
          if (msg) reply = (await handler(msg)) || reply;
        } catch { /* mensagem inválida: responde desligado */ }
        sock.end(`${JSON.stringify(reply)}\n`);
      });
    });
    srv.on('error', () => log('warn', 'O canal local das abas do Discord não abriu.'));
    srv.listen(pipe);
    server = srv;
    return srv;
  }

  function close() {
    if (server) { try { server.close(); } catch { /* já fechado */ } server = null; }
  }

  return { running, installed, kill, uninstall, installBridge, removeBridge, listen, close, pipe, extensionDir: path.join(dir, 'extensao') };
}
