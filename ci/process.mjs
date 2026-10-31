import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { redact } from './policy.mjs';

// Sem shell: argumentos nao sao reinterpretados como comandos. Logs sao filtrados antes de gravar.
export function execute(command, args, { cwd, env = process.env, log, timeoutMs = 600000, signal } = {}) {
  if (signal?.aborted) {
    fs.writeFileSync(log, 'Cancelado antes de iniciar a ferramenta\n');
    return Promise.resolve({ exitCode: 1, timedOut: false, cancelled: true, durationMs: 0 });
  }
  const secrets = Object.entries(env).filter(([key]) => /TOKEN|SECRET|PASSWORD|CREDENTIAL|(?:^|_)KEY$/i.test(key)).map(([, value]) => value);
  const stream = fs.createWriteStream(log, { flags: 'w' });
  return new Promise((resolve) => {
    const started = Date.now();
    let timedOut = false, launchError = false, cancelled = false;
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const stop = () => {
      if (!child.pid || child.exitCode !== null) return;
      if (process.platform === 'win32') spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      else child.kill('SIGTERM'); // somente para testes de log/orquestracao no host
    };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    const cancel = () => { cancelled = true; stop(); };
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    for (const output of [child.stdout, child.stderr]) {
      if (!output) continue;
      let buffer = '', dropping = false;
      output.setEncoding('utf8');
      output.on('data', (chunk) => {
        buffer += chunk;
        let end;
        while ((end = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
          if (!dropping) stream.write(redact(line, secrets) + '\n');
          dropping = false;
        }
        if (buffer.length > 65536) { stream.write('[linha longa omitida]\n'); buffer = ''; dropping = true; }
      });
      output.on('end', () => { if (buffer && !dropping) stream.write(redact(buffer, secrets) + '\n'); });
    }
    child.on('error', () => { launchError = true; stream.write('Nao foi possivel iniciar a ferramenta\n'); });
    child.on('close', (code) => {
      clearTimeout(timer); signal?.removeEventListener('abort', cancel);
      stream.end(() => resolve({ exitCode: launchError || cancelled ? 1 : code ?? 1, timedOut, cancelled, durationMs: Date.now() - started }));
    });
  });
}
