// Regressao do controlador/gates. Fixtures NAO equivalem a validacao Windows real.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REQUIRED_STEPS, SOURCE_REPO, assertValidation, assertSourceRemote, pipelineArgs, tapTotals, redact } from '../../../ci/policy.mjs';
import { execute } from '../../../ci/process.mjs';
import { verifyPublication } from '../../../ci/validation.mjs';
import { verificarAtualizadorPublicado } from '../../scripts/publish-release.mjs';

const files = ['JoJoCompanion.exe', 'JoJoCompanion-Setup-0.44.0.exe', 'JoJoCompanion-0.44.0-win-x64.zip'].map((name) => ({ name, size: 1024, digest: `sha256:${'a'.repeat(64)}` }));
const fixture = () => ({ schema: 1, source: SOURCE_REPO, version: '0.44.0', tag: 'v0.44.0', commit: 'a'.repeat(40), platform: 'win32', arch: 'x64', executor: 'github-hosted', runId: '123', status: 'passed', steps: REQUIRED_STEPS.map((id) => ({ id, status: 'passed', exitCode: 0, timedOut: false })), files: structuredClone(files) });
const expected = { version: '0.44.0', commit: 'a'.repeat(40), files };

test('CI: cada gate obrigatorio precisa passar; skip, timeout e saida nao zero bloqueiam', () => {
  assert.doesNotThrow(() => assertValidation(fixture(), expected));
  for (const id of REQUIRED_STEPS) {
    for (const change of [{ status: 'skipped' }, { timedOut: true }, { cancelled: true }, { exitCode: 1 }]) {
      const report = fixture(); Object.assign(report.steps.find((s) => s.id === id), change);
      assert.throws(() => assertValidation(report, expected));
    }
    const missing = fixture(); missing.steps = missing.steps.filter((s) => s.id !== id);
    assert.throws(() => assertValidation(missing, expected));
  }
});

test('CI: nao reutiliza evidencias de outro commit, versao, origem ou plataforma', () => {
  for (const patch of [{ commit: 'b'.repeat(40) }, { version: '0.43.1' }, { source: 'outro/repo' }, { platform: 'linux' }, { arch: 'arm64' }, { tag: 'v0.43.1' }, { status: 'running' }, { executor: 'self-hosted' }, { runId: '' }]) assert.throws(() => assertValidation({ ...fixture(), ...patch }, expected));
  assert.throws(() => assertSourceRemote('https://github.com/oaovito/jojo-companion-releases.git'));
  assert.throws(() => assertSourceRemote('https://credential@example.org/oaovito/oao-companion-'));
  assert.doesNotThrow(() => assertSourceRemote('git@github.com:oaovito/oao-companion-.git'));
});

test('CI: alterar ou omitir um binario apos a validacao impede publicar', () => {
  const report = fixture(); report.files[0].digest = `sha256:${'b'.repeat(64)}`;
  assert.throws(() => assertValidation(report, expected));
  assert.throws(() => assertValidation({ ...fixture(), files: files.slice(1) }, expected));
  const duplicate = fixture(); duplicate.steps.push(duplicate.steps[0]);
  assert.throws(() => assertValidation(duplicate, expected));
});

test('CI: argumentos e TAP nao permitem publicar implicito ou passar suite vazia/pulada', () => {
  assert.deepEqual(pipelineArgs([]), { publishing: false, tag: '' });
  assert.deepEqual(pipelineArgs(['--publish', '--tag', 'v0.44.0']), { publishing: true, tag: 'v0.44.0' });
  for (const args of [['--fake'], ['--publish'], ['--tag'], ['--tag', '--publish'], ['--tag', 'v0.44.0; echo token']]) assert.throws(() => pipelineArgs(args));
  const tap = '# tests 303\n# pass 303\n# fail 0\n# skipped 0\n';
  assert.equal(tapTotals(tap, 303).pass, 303);
  for (const bad of ['', tap.replace('skipped 0', 'skipped 1'), tap.replace('pass 303', 'pass 302')]) assert.throws(() => tapTotals(bad, 303));
});

test('CI: logs ocultam segredos mesmo divididos entre chunks e URL autenticada', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-ci-log-'));
  try {
    const log = path.join(dir, 'step.log');
    const result = await execute(process.execPath, ['-e', "process.stdout.write('segredo-'); setTimeout(()=>console.log('sintetico https://user:password@example.invalid'),20)"], { log, env: { ...process.env, RELEASES_TOKEN: 'segredo-sintetico' } });
    assert.equal(result.exitCode, 0);
    const output = fs.readFileSync(log, 'utf8');
    assert.doesNotMatch(output, /segredo-sintetico|user:password/);
    assert.match(output, /REDACTED/);
    assert.equal(redact('Authorization: Bearer nao-exibir'), 'Authorization: Bearer [REDACTED]');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('CI: timeout e ferramenta ausente retornam falha em vez de sucesso artificial', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-ci-timeout-'));
  try {
    const timeout = await execute(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { log: path.join(dir, 'timeout.log'), timeoutMs: 100 });
    assert.equal(timeout.timedOut, true); assert.notEqual(timeout.exitCode, 0);
    const missing = await execute('jojo-ferramenta-inexistente', [], { log: path.join(dir, 'missing.log') });
    assert.notEqual(missing.exitCode, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('CI: cancelamento anterior ao passo nao inicia a ferramenta nem aprova o gate', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-ci-cancel-'));
  try {
    const marker = path.join(dir, 'nao-criar');
    const controller = new AbortController(); controller.abort();
    const result = await execute(process.execPath, ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)},'executou')`], { log: path.join(dir, 'cancel.log'), signal: controller.signal });
    assert.equal(result.cancelled, true); assert.notEqual(result.exitCode, 0);
    assert.equal(fs.existsSync(marker), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('publicador: relatorio completo nao substitui a tag nem checkout limpo', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-ci-git-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    git('init'); git('config', 'user.email', 'fixture@example.invalid'); git('config', 'user.name', 'JoJo CI fixture');
    git('remote', 'add', 'origin', 'https://github.com/oaovito/oao-companion-.git');
    fs.writeFileSync(path.join(dir, 'source.txt'), 'fixture'); git('add', '.'); git('commit', '-m', 'fixture');
    git('tag', 'v0.44.0');
    const report = fixture(); report.commit = git('rev-parse', 'HEAD');
    const saved = path.join(os.tmpdir(), `jojo-report-${process.pid}-${Date.now()}.json`);
    fs.writeFileSync(saved, JSON.stringify(report));
    try {
      const args = { version: '0.44.0', tag: 'v0.44.0', reportPath: saved, files, platform: 'win32', execution: { githubActions: 'true', runner: 'github-hosted', runId: '123' } };
      assert.doesNotThrow(() => verifyPublication(dir, args));
      assert.throws(() => verifyPublication(dir, { ...args, execution: { ...args.execution, runner: 'self-hosted' } }));
      assert.throws(() => verifyPublication(dir, { ...args, execution: { ...args.execution, runId: '456' } }));
      assert.throws(() => verifyPublication(dir, { ...args, platform: 'linux' }));
      fs.writeFileSync(path.join(dir, 'source.txt'), 'changed');
      assert.throws(() => verifyPublication(dir, args));
    } finally { fs.rmSync(saved, { force: true }); }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('publicador: atualizador precisa detectar a versao correta e os hashes sem login', async () => {
  const release = { tag_name: 'v0.44.0', assets: files.map((f) => ({ ...f, browser_download_url: `https://github.com/oaovito/jojo-companion-releases/releases/download/v0.44.0/${f.name}` })) };
  const fetch = async (url, opts) => {
    assert.equal(opts.headers.Authorization, undefined);
    assert.equal(url, 'https://api.github.com/repos/oaovito/jojo-companion-releases/releases/latest');
    return { ok: true, json: async () => release };
  };
  await verificarAtualizadorPublicado({ fetch, version: '0.44.0', previous: '0.43.1', files });
  release.assets[0].digest = `sha256:${'b'.repeat(64)}`;
  await assert.rejects(verificarAtualizadorPublicado({ fetch, version: '0.44.0', previous: '0.43.1', files }));
});
