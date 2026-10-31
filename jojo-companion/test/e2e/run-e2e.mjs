// Executa os testes oficiais de aplicação/integração somente no Windows.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireWindows } from '../../src/main/windows-only.js';

requireWindows();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const files = process.argv.includes('--integration')
  ? [path.join('test', 'e2e', 'windows.e2e.mjs'), path.join('test', 'e2e', 'presenca.windows.mjs')]
  : [path.join('test', 'e2e', 'app.e2e.mjs')];
const nodeArgs = ['--test', '--test-concurrency=1', ...files];
const r = spawnSync(process.execPath, nodeArgs, { cwd: ROOT, stdio: 'inherit' });
process.exit(r.status ?? 1);
