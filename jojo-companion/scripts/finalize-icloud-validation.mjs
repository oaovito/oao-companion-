// Credencial existe apenas neste passo, depois de TODOS os gates do aplicativo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execute } from '../../ci/process.mjs';
import { requiredSteps, requiresIcloud, assertIcloudEvidence, assertValidation } from '../../ci/policy.mjs';
import { sourceCommit } from '../../ci/validation.mjs';
import { conferirArtefatos } from './publish-release.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), app = path.join(root, 'jojo-companion');
if (process.platform !== 'win32' || process.arch !== 'x64' || process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_ENVIRONMENT !== 'github-hosted') throw new Error('Evidencia final exige Windows x64 oficial do GitHub');
const reportPath = process.env.VALIDATION_REPORT;
if (!reportPath || !path.resolve(reportPath).startsWith(path.join(app, 'out', 'windows-ci') + path.sep)) throw new Error('Relatorio deve pertencer ao diretorio privado de validacao');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const version = JSON.parse(fs.readFileSync(path.join(app, 'package.json'))).version, commit = sourceCommit(root);
if (!requiresIcloud(version)) throw new Error('Nao revalidar nem reescrever versao historica');
if (report.commit !== commit || report.version !== version || report.runId !== process.env.GITHUB_RUN_ID || report.status !== 'awaiting-icloud') throw new Error('Relatorio de outra execucao/commit ou nao aguarda iCloud');
for (const id of requiredSteps(version).filter(id => id !== 'icloud-live')) {
  const steps = report.steps.filter(s => s.id === id);
  if (steps.length !== 1 || steps[0].status !== 'passed' || steps[0].exitCode !== 0 || steps[0].timedOut || steps[0].cancelled) throw new Error(`Gate anterior nao aprovado: ${id}`);
}
const log = path.join(path.dirname(reportPath), 'icloud-live.log');
const result = await execute(process.execPath, ['scripts/check-icloud-live.mjs'], { cwd: app, log, timeoutMs: 120000 });
const output = fs.readFileSync(log, 'utf8');
report.steps.push({ id: 'icloud-live', ...result, status: result.exitCode === 0 && !result.timedOut && !result.cancelled ? 'passed' : 'failed' });
try {
  if (result.exitCode || result.timedOut || result.cancelled) throw new Error(result.exitCode === 2 ? 'BLOQUEADO: conta iCloud autorizada e credencial por canal seguro ausentes.' : 'Autenticacao/leitura iCloud real nao aprovada.');
  const evidence = JSON.parse(output.trim()); assertIcloudEvidence(evidence); report.icloud = evidence;
  report.status = 'passed';
  const files = conferirArtefatos(path.join(app, 'dist'), version).map(({ name, size, digest }) => ({ name, size, digest }));
  assertValidation(report, { version, commit, files });
} catch (error) { report.status = 'failed'; report.error = error.message; process.exitCode = 1; console.error(error.message); }
report.finishedAt = new Date().toISOString();
const saved = JSON.stringify(report, null, 2);
fs.writeFileSync(reportPath, saved); fs.writeFileSync(path.join(app, 'out/windows-ci/summary/validation.json'), saved);
fs.copyFileSync(log, path.join(app, 'out/windows-ci/summary/icloud-live.log'));
if (report.status === 'passed') console.log('iCloud: autenticacao e leitura reais aprovadas; evidencia integral concluida, sem dados pessoais.');
