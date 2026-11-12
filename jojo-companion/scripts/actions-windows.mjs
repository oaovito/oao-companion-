// Gates oficiais, executados exclusivamente em runner Windows hospedado pelo GitHub.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execute } from '../../ci/process.mjs';
import { REQUIRED_STEPS, SOURCE_REPO, tapTotals, pipelineArgs } from '../../ci/policy.mjs';
import { sourceCommit } from '../../ci/validation.mjs';
import { conferirArtefatos } from './publish-release.mjs';
import { createPrivateEvidence } from './ci-evidence.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const app = path.join(root, 'jojo-companion');
const { publishing } = pipelineArgs(process.argv.slice(2));
if (publishing) throw new Error('Publicacao e tag sao controladas pelo workflow oficial depois dos gates');
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_ENVIRONMENT !== 'github-hosted') throw new Error('Exige runner oficial hospedado pelo GitHub');
if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Exige Windows x64 nativo; nenhuma validacao foi executada');
const tools = JSON.parse(fs.readFileSync(path.join(root, 'ci/windows-toolchain.json')));
if (process.versions.node !== tools.node.version) throw new Error('Node deve corresponder a versao fixada no actions/setup-node');
const version = JSON.parse(fs.readFileSync(path.join(app, 'package.json'))).version;
const commit = sourceCommit(root);
const cache = path.resolve(process.env.JOJO_CI_CACHE || path.join(process.env.LOCALAPPDATA, 'JoJoCompanionCI/cache'));
fs.mkdirSync(cache, { recursive: true });
const lock = path.join(os.tmpdir(), 'jojo-companion-windows-ci.lock');
try {
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid }), { flag: 'wx' });
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  const previous = JSON.parse(fs.readFileSync(lock));
  let alive = true;
  try { process.kill(previous.pid, 0); } catch (e) { if (e.code === 'ESRCH') alive = false; }
  if (alive) throw new Error('Outro executor JoJo esta ativo nesta maquina');
  fs.unlinkSync(lock);
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid }), { flag: 'wx' });
}
const base = path.join(app, 'out/windows-ci');
const run = path.join(base, `${commit.slice(0, 12)}-${Date.now()}`);
const summary = path.join(base, 'summary');
fs.mkdirSync(run, { recursive: true });
fs.mkdirSync(summary, { recursive: true });
const reportPath = path.join(run, 'validation.json');
const report = { schema: 1, source: SOURCE_REPO, version, tag: `v${version}`, commit,
  platform: process.platform, arch: process.arch, node: process.versions.node, windows: os.release(),
  executor: process.env.RUNNER_ENVIRONMENT, runId: process.env.GITHUB_RUN_ID,
  startedAt: new Date().toISOString(), status: 'running', steps: [], files: [] };
const save = () => {
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  fs.copyFileSync(reportPath, path.join(summary, 'validation.json'));
};
const controller = new AbortController();
process.on('SIGINT', () => controller.abort());
process.on('SIGTERM', () => controller.abort());
const env = { ...process.env, CI: 'true', CSC_IDENTITY_AUTO_DISCOVERY: 'false',
  JOJO_VALIDATED_COMMIT: commit,
  ELECTRON_CACHE: path.join(cache, 'electron'),
  ELECTRON_BUILDER_CACHE: path.join(cache, 'builder'), JOJO_CI_CACHE: cache,
  JOJO_TEST_REPORT_DIR: path.join(run, 'junit'), JOJO_ANIMATION_REPORT_DIR: path.join(run, 'animations') };
// Credencial de publicacao nao e necessaria nos processos de testes/build.
for (const key of ['RELEASES_TOKEN', 'GH_TOKEN', 'GITHUB_TOKEN', 'SYSTEM_ACCESSTOKEN', 'CIRCLE_TOKEN', 'AZURE_DEVOPS_EXT_PAT', 'JOJO_QA_MODEL', 'JOJO_QA_UI_ONLY']) delete env[key];
const node = process.execPath;
// O workflow original usa PowerShell 7. Nao herdar PSModulePath do pwsh em powershell.exe 5.
const powershell = 'pwsh.exe';
const npm = path.join(path.dirname(node), 'node_modules/npm/bin/npm-cli.js');
async function cleanupShortcut() {
  const result = await execute(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', '../ci/cleanup-windows-shortcut.ps1', '-ExpectedTarget', path.join(app, 'dist/JoJoCompanion.exe')], { cwd: app, env, log: path.join(run, 'shortcut-cleanup.log'), timeoutMs: 30000 });
  if (result.exitCode || result.timedOut) throw new Error('Limpeza do atalho de teste nao concluiu');
}
async function step(id, command, commandArgs, minutes = 10, check = null, stepEnv = env, optional = false) {
  const log = path.join(run, `${id}.log`);
  console.log(`Iniciando ${id}`);
  console.log(`::notice title=JoJo gate::started ${id}`);
  const result = await execute(command, commandArgs, { cwd: app, env: stepEnv, log, timeoutMs: minutes * 60000, signal: controller.signal });
  const entry = { id, ...result, optional, status: result.exitCode === 0 && !result.timedOut ? 'passed' : 'failed' };
  report.steps.push(entry); save();
  if (id === 'conversation') for (const line of fs.readFileSync(log, 'utf8').split('\n')) {
    if (/^JOJO_CONVERSATION_(REPORT|PREVIEW):/.test(line)) console.log(line);
  }
  if (id === 'e2e') for (const line of fs.readFileSync(log, 'utf8').split('\n')) {
    if (/JOJO_(CRITICAL_EVIDENCE|DPI_EVIDENCE|STEAM_EVIDENCE):/.test(line)) console.log(line);
  }
  if (id === 'installer') for (const line of fs.readFileSync(log, 'utf8').split('\n')) {
    if (/^JOJO_PACKAGED_STEAM:/.test(line)) console.log(line);
  }
  fs.copyFileSync(log, path.join(summary, `${id}.log`));
  if (entry.status !== 'passed') {
    if (optional) { console.log(`${id}: diagnostico opcional falhou; log preservado`); return; }
    // O arquivo ja foi filtrado por execute; manter a causa visivel mesmo sem artefato CI.
    console.error(fs.readFileSync(log, 'utf8').split('\n').filter(line => !/^JOJO_CONVERSATION_(REPORT|PREVIEW):/.test(line)).slice(-80).join('\n'));
    throw new Error(`Falha em ${id}; consultar log privado`);
  }
  try {
    if (check) {
      const validation = check(fs.readFileSync(log, 'utf8'));
      if (validation) { entry.validation = validation; save(); }
    }
  }
  catch (error) { entry.status = 'failed'; save(); throw error; }
  console.log(`${id}: aprovado (${Math.round(result.durationMs / 1000)} s)`);
  console.log(`::notice title=JoJo gate::passed ${id} (${Math.round(result.durationMs / 1000)} s)`);
}
try {
  for (const name of fs.readdirSync(summary)) if (name !== 'validation.json') fs.rmSync(path.join(summary, name), { recursive: true, force: true });
  save();
  const evidence = createPrivateEvidence({ commit, runId: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT, token: process.env.GITHUB_TOKEN });
  report.evidence = { branch: evidence.branch, conversationPath: evidence.conversationPath, validationPath: evidence.validationPath, reviewPath: evidence.reviewPath }; save();
  for (const name of ['conversa-real-windows.json', 'conversa-interface-windows.json', 'conversa-interface-windows.png']) fs.rmSync(path.join(app, 'out', name), { force: true });
  await step('preflight', powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', '../ci/preflight-windows.ps1'], 1);
  await step('lint', node, ['scripts/lint.mjs']);
  await step('install', node, [npm, 'ci', '--prefer-offline', '--no-audit', '--no-fund']);
  fs.mkdirSync(env.JOJO_TEST_REPORT_DIR, { recursive: true });
  const tests = fs.readdirSync(path.join(app, 'test/unit')).filter((f) => f.endsWith('.test.js')).sort().map((f) => `test/unit/${f}`);
  await step('unit', node, ['--test', '--test-reporter=tap', '--test-reporter=junit', '--test-reporter-destination=stdout', `--test-reporter-destination=${path.join(env.JOJO_TEST_REPORT_DIR, 'unit.xml')}`, ...tests], 5, (text) => tapTotals(text, 628));
  // Validar modelo/interface antes do build caro: mesmas suites, sem repeticao.
  await step('conversation', powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', 'scripts/check-conversation-windows.ps1', '-WorkDirectory', path.join(run, 'runtime'), '-CacheDirectory', cache], 25, () => {
    const qa = JSON.parse(fs.readFileSync(path.join(app, 'out/conversa-real-windows.json')));
    const ui = JSON.parse(fs.readFileSync(path.join(app, 'out/conversa-interface-windows.json')));
    if (qa.digest !== tools.modelDigest || qa.rows.length !== 32 || qa.rows.some((r) => r.errors.length) || ui.rows.length !== 12 || ui.rendererErrors.length) throw new Error('Conversa real incompleta/reprovada');
    // Anotações privadas ficam disponíveis enquanto os demais gates continuam.
    // Só falas sintéticas: permitem revisão da execução atual antes da publicação.
    const rows = [...qa.rows.map(row => ({ source: 'engine', ...row })), ...ui.rows.map(row => ({ source: 'central', ...row }))];
    for (let offset = 0; offset < rows.length; offset += 8) {
      const message = JSON.stringify({ commit, offset, total: rows.length, rows: rows.slice(offset, offset + 8) }).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
      console.log(`::notice title=JoJo conversa::${message}`);
    }
    for (const name of ['conversa-real-windows.json', 'conversa-interface-windows.json', 'conversa-interface-windows.png']) {
      if (fs.existsSync(path.join(app, 'out', name))) fs.copyFileSync(path.join(app, 'out', name), path.join(run, name));
    }
    return { engineCases: qa.rows.length, uiCases: ui.rows.length, modelDigest: qa.digest };
  });
  await evidence.writeConversation({ engine: JSON.parse(fs.readFileSync(path.join(app, 'out/conversa-real-windows.json'))), ui: JSON.parse(fs.readFileSync(path.join(app, 'out/conversa-interface-windows.json'))) });
  const conversationStep = report.steps.find(entry => entry.id === 'conversation');
  conversationStep.status = 'running';
  conversationStep.validation.semanticReview = { status: 'pending', branch: evidence.branch, path: evidence.reviewPath }; save();
  console.log(`Evidencias privadas disponiveis na branch ${evidence.branch}; aguardando revisao em ${evidence.reviewPath} por ate cinco minutos.`);
  try {
    await evidence.writeValidation(report);
    conversationStep.validation.semanticReview = await evidence.awaitSemanticReview();
    conversationStep.status = 'passed'; save();
    await evidence.writeValidation(report);
    console.log('Revisao semantica desta execucao aprovada e registrada.');
  } catch (error) {
    conversationStep.status = 'failed';
    conversationStep.validation.semanticReview = { status: error.semanticReviewStatus || 'failed', branch: evidence.branch, path: evidence.reviewPath };
    report.status = 'failed'; save();
    try { await evidence.writeValidation(report); } catch { console.error('Nao foi possivel preservar o estado de falha da revisao privada.'); }
    throw error;
  }
  await step('build', node, ['scripts/build-win.mjs'], 15);
  await step('installer', node, ['scripts/smoke-installer.mjs'], 5, text => {
    const match = text.match(/^JOJO_PACKAGED_STEAM:(.+)$/m);
    if (!match) throw new Error('Evidencia do inventario Steam instalado ausente');
    const proof = JSON.parse(match[1]);
    if (!proof.isPackaged || !proof.archive || !proof.workerUnpacked || !proof.coreUnpacked || !proof.known || !proof.installed || !proof.fixtureFound || proof.count !== 1 || proof.libraries < 1 || proof.status !== 'closed') throw new Error('Worker Steam instalado nao validado');
    return proof;
  });
  await evidence.writeValidation(report);
  await step('portable', node, ['scripts/smoke-portable.mjs', 'dist/JoJoCompanion.exe'], 3);
  await cleanupShortcut();
  await step('presence', node, ['scripts/presenca-windows.mjs', 'dist/JoJoCompanion.exe'], 6);
  await cleanupShortcut();
  await step('windows', node, ['test/e2e/run-e2e.mjs', '--integration'], 8, (text) => tapTotals(text, 16));
  await step('e2e', node, ['test/e2e/run-e2e.mjs'], 8, (text) => tapTotals(text, 43));
  await evidence.writeValidation(report);
  await step('animations', node, [npm, 'run', 'audit:animations'], 10, () => {
    const audit = JSON.parse(fs.readFileSync(path.join(env.JOJO_ANIMATION_REPORT_DIR, 'auditoria-animacoes.json')));
    if (audit.total < 1268 || audit.erros.length || audit.fora.length || audit.paradas.length || audit.semGatilho) throw new Error('Auditoria de animacoes incompleta/reprovada');
    return { total: audit.total, errors: audit.erros.length, cuts: audit.fora.length, stopped: audit.paradas.length, orphaned: audit.semGatilho };
  });
  await step('performance', node, ['scripts/measure.mjs'], 3, text => {
    const match = text.match(/^JOJO_PERFORMANCE_EVIDENCE:(.+)$/m);
    if (!match) throw new Error('Medicao de desempenho ausente');
    const proof = JSON.parse(match[1]);
    for (const name of ['ocioso', 'cursorPerseguindo', 'modoTrabalho', 'oculto']) {
      const sample = proof.resultados?.[name];
      if (!sample || ![sample.cpuAvg, sample.cpuMax, sample.memMB].every(Number.isFinite) || sample.cpuAvg < 0 || sample.cpuMax < sample.cpuAvg || sample.memMB <= 0) throw new Error('Medicao de desempenho incompleta');
    }
    return proof;
  }, { ...env, MEASURE_SECONDS: '20' });
  await evidence.writeValidation(report);
  await step('performance-gpu', node, ['scripts/measure.mjs'], 3, null, { ...env, MEASURE_SECONDS: '20', JOJO_GPU: '1' }, true);
  await step('web-search', node, ['scripts/check-web-search.mjs'], 2, null, env, true);
  await step('artifacts', node, ['scripts/publish-release.mjs', '--artifacts'], 3);
  await step('updater', node, ['scripts/check-updater.mjs'], 2);
  await step('notes', node, ['scripts/release-notes.mjs', path.join(run, 'RELEASE_NOTES.md')], 2);
  if (sourceCommit(root) !== commit) throw new Error('Codigo alterado durante a validacao');
  report.files = conferirArtefatos(path.join(app, 'dist'), version).map(({ name, size, digest }) => ({ name, size, digest }));
  if (REQUIRED_STEPS.some((id) => !report.steps.some((s) => s.id === id && s.status === 'passed'))) throw new Error('Gates incompletos');
  report.status = 'passed'; report.finishedAt = new Date().toISOString(); save();
  try { await evidence.writeValidation(report); }
  catch (error) { report.status = 'failed'; throw error; }
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `report_path=${reportPath}\nvalidated_sha=${commit}\nversion=${version}\n`);
  for (const name of ['animations', 'junit', 'conversa-real-windows.json', 'conversa-interface-windows.json', 'conversa-interface-windows.png', 'RELEASE_NOTES.md']) {
    if (fs.existsSync(path.join(run, name))) fs.cpSync(path.join(run, name), path.join(summary, name), { recursive: true });
  }

} catch (error) {
  if (report.status !== 'passed') report.status = 'failed';
  report.error = error.message; save();
  console.error(error.message); process.exitCode = 1;
} finally {
  if (report.steps.some((s) => s.id === 'preflight' && s.status === 'passed')) {
    try { await cleanupShortcut(); } catch { console.error('Atalho inesperado preservado para inspecao.'); process.exitCode = 1; }
  }
  // Preservar tambem resultados de suites que falharam, sem copiar dados do runtime/cache.
  for (const name of ['conversa-real-windows.json', 'conversa-interface-windows.json', 'conversa-interface-windows.png']) {
    if (fs.existsSync(path.join(app, 'out', name))) fs.copyFileSync(path.join(app, 'out', name), path.join(run, name));
  }
  for (const name of ['animations', 'junit', 'conversa-real-windows.json', 'conversa-interface-windows.json', 'conversa-interface-windows.png']) {
    if (fs.existsSync(path.join(run, name))) fs.cpSync(path.join(run, name), path.join(summary, name), { recursive: true });
  }
  // Retencao local: tres execucoes, ate 14 dias. Nunca limpar cache, fonte ou releases.
  const dirs = fs.readdirSync(base).filter((name) => /^[0-9a-f]{12}-\d+$/.test(name)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const [i, name] of dirs.entries()) if (name !== path.basename(run) && (i >= 3 || Date.now() - Number(name.split('-')[1]) > 14 * 86400000)) fs.rmSync(path.join(base, name), { recursive: true, force: true });
  fs.unlinkSync(lock);
}
