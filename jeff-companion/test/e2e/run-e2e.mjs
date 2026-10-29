// Executa os testes E2E. No Linux sem DISPLAY, usa xvfb-run automaticamente.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const files = [path.join('test', 'e2e', 'app.e2e.mjs')];
const nodeArgs = ['--test', '--test-concurrency=1', ...files];
let cmd = process.execPath;
let args = nodeArgs;
if (process.platform === 'linux' && !process.env.DISPLAY) {
  cmd = 'xvfb-run';
  args = ['-a', '-s', '-screen 0 1920x1080x24', process.execPath, ...nodeArgs];
}
const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
process.exit(r.status ?? 1);
