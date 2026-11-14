// Executa os testes oficiais de aplicação/integração somente no Windows.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireWindows } from '../../src/main/windows-only.js';

requireWindows();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const files = process.argv.includes('--integration')
  ? [path.join('test', 'e2e', 'windows.e2e.mjs'), path.join('test', 'e2e', 'presenca.windows.mjs')]
  : [path.join('test', 'e2e', 'app.e2e.mjs'), path.join('test', 'e2e', 'todo.windows.mjs'), path.join('test', 'e2e', 'darkest.windows.mjs'), path.join('test', 'e2e', 'needs.windows.mjs'), path.join('test', 'e2e', 'focus-apps.windows.mjs'), path.join('test', 'e2e', 'shortcuts.windows.mjs'), path.join('test', 'e2e', 'living.windows.mjs'), path.join('test', 'e2e', 'calendar-link.windows.mjs'), path.join('test', 'e2e', 'critical.windows.mjs'), path.join('test', 'e2e', 'steam.windows.mjs')];
const reports = process.env.JOJO_TEST_REPORT_DIR;
const reporters = ['--test-reporter=tap'];
if (reports) {
  fs.mkdirSync(reports, { recursive: true });
  reporters.push('--test-reporter=junit', '--test-reporter-destination=stdout', `--test-reporter-destination=${path.join(reports, process.argv.includes('--integration') ? 'windows.xml' : 'e2e.xml')}`);
}
const nodeArgs = ['--test', '--test-concurrency=1', ...reporters, ...files];
const r = spawnSync(process.execPath, nodeArgs, { cwd: ROOT, stdio: 'inherit' });
process.exit(r.status ?? 1);
