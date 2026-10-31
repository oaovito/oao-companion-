// Lint sintatico de JavaScript/JSON, sem dependencias adicionais nem executar Electron.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const result = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
if (result.status !== 0) throw new Error('Nao foi possivel listar os arquivos versionados');
let count = 0;
for (const file of result.stdout.split('\0').filter(Boolean)) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) continue;
  if (/\.(?:js|mjs|cjs)$/.test(file)) {
    const check = spawnSync(process.execPath, ['--check', full], { stdio: 'inherit' });
    if (check.status !== 0) process.exit(check.status || 1);
    count++;
  } else if (file.endsWith('.json')) { JSON.parse(fs.readFileSync(full, 'utf8')); count++; }
}
console.log(`${count} arquivos JavaScript/JSON verificados`);
