// Build nativo Windows x64. Não depende de Bash, Wine ou compilação cruzada.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { requireWindows } from '../src/main/windows-only.js';

requireWindows();
const args = process.argv.slice(2);
if (args.some((a) => a !== '--dir')) throw new Error('Uso: node scripts/build-win.mjs [--dir]');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const manifest = require.resolve('electron-builder/package.json');
const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
const cli = path.resolve(path.dirname(manifest), typeof pkg.bin === 'string' ? pkg.bin : pkg.bin['electron-builder']);
const result = spawnSync(process.execPath, [cli, '--win', '--x64', '--publish', 'never', ...args], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' },
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
