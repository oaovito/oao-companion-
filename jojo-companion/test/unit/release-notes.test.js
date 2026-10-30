// Notas de Release só com o que mudou na versão (seção do CHANGELOG).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { notasDaRelease } from '../../scripts/release-notes.mjs';
import { ROOT } from './helpers.js';

const CL = `# CHANGELOG

## 1.2.0 — 2026-10-30

### Adicionado
- Coisa nova.

### Corrigido
- Bug X.

### Como testar
- Faça Y.

## 1.1.0 — 2026-10-29

### Adicionado
- Coisa antiga.
`;

test('notas da Release: só a versão atual, seções na ordem certa, sem repetir o passado', () => {
  const md = notasDaRelease(CL, '1.2.0');
  assert.match(md, /^# Jojo v1\.2\.0/);
  assert.ok(md.indexOf('## Novidades') < md.indexOf('## Correções'));
  assert.ok(md.indexOf('## Correções') < md.indexOf('## Como testar'));
  assert.doesNotMatch(md, /Coisa antiga/);
  assert.doesNotMatch(md, /## Melhorias/, 'seção vazia é omitida');
  assert.throws(() => notasDaRelease(CL, '9.9.9'), /sem a seção/);
  assert.throws(() => notasDaRelease('## 2.0.0\n\n### Como testar\n- x\n', '2.0.0'), /nenhuma mudança/);
});

test('notas da Release: a versão do package.json tem seção no CHANGELOG (senão a publicação bloqueia)', () => {
  const v = JSON.parse(fs.readFileSync(`${ROOT}/package.json`, 'utf8')).version;
  assert.match(notasDaRelease(fs.readFileSync(`${ROOT}/CHANGELOG.md`, 'utf8'), v), new RegExp(`v${v}`));
});
