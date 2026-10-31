import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { assertSourceRemote, assertValidation } from './policy.mjs';

export function git(root, args) {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
  catch { throw new Error('Git nao conseguiu verificar a origem/commit/tag'); }
}

export function sourceCommit(root) {
  assertSourceRemote(git(root, ['remote', 'get-url', 'origin']));
  if (git(root, ['status', '--porcelain'])) throw new Error('Checkout precisa estar limpo; nao descartar alteracoes');
  return git(root, ['rev-parse', 'HEAD']);
}

export function verifyPublication(root, { reportPath, tag, version, files, platform = process.platform }) {
  if (platform !== 'win32') throw new Error('Publicacao exige executor Windows nativo');
  if (tag !== `v${version}`) throw new Error('Publicacao exige tag oficial igual a versao');
  const commit = sourceCommit(root);
  if (git(root, ['rev-parse', `${tag}^{commit}`]) !== commit) throw new Error('Tag oficial aponta para outro commit');
  if (!reportPath) throw new Error('Relatorio integral de validacao obrigatorio');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assertValidation(report, { version, commit, files });
  return report;
}
