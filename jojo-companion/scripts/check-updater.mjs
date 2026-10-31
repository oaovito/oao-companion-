// Integracao complementar com metadados derivados dos binarios reais, sem inventar release publicada.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { conferirArtefatos, REPO } from './publish-release.mjs';
import { UpdateChecker } from '../src/core/updater.js';
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const previous = [...fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').matchAll(/^## (\d+\.\d+\.\d+)/gm)][1]?.[1];
assert.ok(previous);
assert.equal(`${pkg.jojoUpdate.owner}/${pkg.jojoUpdate.repo}`, REPO);
const files = conferirArtefatos(fileURLToPath(new URL('../dist/', import.meta.url)), pkg.version);
const release = { tag_name: `v${pkg.version}`, assets: files.map(({ name, size, digest }) => ({ name, size, digest, browser_download_url: `https://github.com/${REPO}/releases/download/v${pkg.version}/${name}` })) };
for (const mode of ['portable', 'installer']) {
  const checker = new UpdateChecker({ fetch: async () => ({ ok: true, json: async () => release }), ...pkg.jojoUpdate, current: previous, mode });
  const update = await checker.check();
  assert.equal(update.version, pkg.version); assert.ok(update.asset.sha256);
  checker.current = pkg.version; assert.equal(await checker.check(), null);
}
console.log('Candidato detectavel em metadados de teste derivados dos tres binarios; canal publico preservado. Nao comprova publicacao.');
