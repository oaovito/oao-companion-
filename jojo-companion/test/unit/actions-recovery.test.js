// Fixtures de API/relatorio: testam o controle, NAO simulam aprovacao Windows real.
import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseState, classifyFailure, recoveryDecision, recover, prepareRelease } from '../../../ci/actions-recovery.mjs';
import { REQUIRED_STEPS } from '../../../ci/policy.mjs';

const sha = 'a'.repeat(40);
const policy = { paidUsageBlockedConfirmed: true, confirmation: 'fixture de teste', pendingVersion: '0.44.0', sourceBranch: 'codex/conversation-coherence' };
const names = ['JoJoCompanion.exe', 'JoJoCompanion-Setup-0.44.0.exe', 'JoJoCompanion-0.44.0-win-x64.zip'];
const files = names.map((name) => ({ name, size: 1024, digest: `sha256:${'a'.repeat(64)}` }));
const published = () => ({ tag_name: 'v0.44.0', draft: false, prerelease: false, assets: files.map((f) => ({ ...f, browser_download_url: `https://github.com/oaovito/jojo-companion-releases/releases/download/v0.44.0/${f.name}` })) });
const report = () => ({ schema: 1, source: 'oaovito/oao-companion-', platform: 'win32', arch: 'x64', executor: 'github-hosted', runId: '123', version: '0.44.0', tag: 'v0.44.0', commit: sha, status: 'passed', files, steps: REQUIRED_STEPS.map((id) => ({ id, status: 'passed', exitCode: 0, timedOut: false })) });
const now = Date.parse('2026-10-31T18:00:00Z');
const run = (patch = {}) => ({ id: 10, head_sha: sha, status: 'completed', conclusion: 'failure', created_at: '2026-10-31T16:50:00Z', ...patch });
const ambiguous = 'The job was not started because recent account payments have failed or your spending limit needs to be increased.';

function client({ runs = [], jobs = [], tag = null, branch = sha } = {}) {
  const writes = [];
  return { writes, rest: {
    git: {
      getRef: async ({ ref }) => {
        if (ref.startsWith('heads/')) return { data: { object: { sha: branch, type: 'commit' } } };
        if (tag) return { data: { object: { sha: tag, type: 'commit' } } };
        throw Object.assign(new Error('not found'), { status: 404 });
      },
      createRef: async (args) => { writes.push(args); return { data: {} }; },
    },
    repos: { getContent: async () => ({ data: { content: Buffer.from(JSON.stringify({ version: '0.44.0', private: true, jojoUpdate: { owner: 'oaovito', repo: 'jojo-companion-releases' } })).toString('base64') } }) },
    actions: {
      listWorkflowRuns: async () => ({ data: { workflow_runs: runs } }),
      listJobsForWorkflowRun: async () => ({ data: { jobs } }),
      createWorkflowDispatch: async (args) => { writes.push(args); },
    },
    checks: { listAnnotations: async () => ({ data: [{ message: ambiguous }] }) },
  } };
}
const absent = async () => ({ status: 404 });

test('recuperacao: sem autorizacao explicita bloqueia antes de chamar API ou alocar build', async () => {
  const blocked = { ...policy, paidUsageBlockedConfirmed: false };
  const result = await recover({ policy: blocked, github: null, fetchFn: () => { throw new Error('nao consultar'); } });
  assert.equal(result.reason, 'execution_not_authorized');
});

test('recuperacao: tentativa normal autorizada nao inventa confirmacao de faturamento', async () => {
  const authorized = { ...policy, paidUsageBlockedConfirmed: false, confirmation: null, normalExecutionAuthorized: true, executionAuthorization: 'Tentar o fluxo normal, sem alterar faturamento' };
  const github = client();
  const result = await recover({ policy: authorized, github, fetchFn: absent, now });
  assert.equal(result.action, 'dispatch');
  assert.equal(github.writes.length, 1);
  assert.equal(authorized.paidUsageBlockedConfirmed, false);
  assert.equal(authorized.confirmation, null);
  const tagged = client();
  assert.equal((await prepareRelease({ github: tagged, policy: authorized, report: report(), version: '0.44.0', commit: sha, files, fetchFn: absent })).publish, true);
  assert.equal(tagged.writes.length, 1);
});

test('recuperacao: flag normal sem registro da autorizacao nao libera execucao', async () => {
  const unauthorized = { ...policy, paidUsageBlockedConfirmed: false, normalExecutionAuthorized: true, executionAuthorization: '' };
  const result = await recover({ policy: unauthorized, github: null, fetchFn: () => { throw new Error('nao consultar'); } });
  assert.equal(result.reason, 'execution_not_authorized');
  await assert.rejects(prepareRelease({ github: null, policy: unauthorized, version: '0.44.0' }), /nao esta autorizada/);
});

test('recuperacao: release existente com tres assets evita recriacao; rascunho/incompleta exige inspecao', () => {
  assert.equal(releaseState(published(), '0.44.0'), 'published');
  for (const patch of [{ draft: true }, { prerelease: true }, { assets: published().assets.slice(1) }, { assets: [...published().assets, { name: 'fonte.zip' }] }]) assert.equal(releaseState({ ...published(), ...patch }, '0.44.0'), 'blocked');
  assert.equal(recoveryDecision({ policy, release: published() }).action, 'stop');
});

test('recuperacao: mensagem ambigua de faturamento nao e diagnosticada como pagamento recusado', () => {
  assert.equal(classifyFailure(ambiguous), 'billing_blocked_cause_unknown');
  assert.equal(classifyFailure('Included minutes quota exhausted'), 'free_quota_exhausted');
  assert.equal(classifyFailure('Payment failed'), 'payment_failed');
  assert.equal(classifyFailure('Spending limit reached'), 'spending_limit_reached');
});

test('recuperacao: build ativo impede duplicacao, mesmo que seja de outro commit', async () => {
  const github = client({ runs: [run({ head_sha: 'b'.repeat(40), status: 'in_progress', conclusion: null })] });
  const result = await recover({ github, policy, fetchFn: absent, now });
  assert.equal(result.reason, 'pipeline_already_active'); assert.equal(github.writes.length, 0);
});

test('recuperacao: falha de infraestrutura respeita intervalo horario', () => {
  const data = { policy, sha, runs: [run()], jobs: [{ runner_name: '', steps: [] }], annotation: ambiguous, now };
  assert.equal(recoveryDecision(data).action, 'dispatch');
  assert.equal(recoveryDecision({ ...data, now: now - 30 * 60000 }).reason, 'hourly_cooldown');
});

test('recuperacao: nao repete falha tecnica, cancelamento ou sucesso sem publicacao verificada', () => {
  const data = { policy, sha, runs: [run()], jobs: [{ runner_name: 'GitHub Actions', steps: [{ started_at: '2026-10-31T17:00:00Z' }] }], now };
  assert.equal(recoveryDecision(data).reason, 'technical_failure_same_commit');
  assert.equal(recoveryDecision({ ...data, runs: [run({ conclusion: 'cancelled' })] }).reason, 'cancelled_run_preserved');
  assert.equal(recoveryDecision({ ...data, runs: [run({ conclusion: 'success' })] }).reason, 'successful_run_without_release_needs_inspection');
});

test('recuperacao: commit novo dispara uma vez apenas o workflow privado correto', async () => {
  const github = client(); const result = await recover({ github, policy, fetchFn: absent, now });
  assert.equal(result.action, 'dispatch');
  assert.deepEqual(github.writes, [{ owner: 'oaovito', repo: 'oao-companion-', workflow_id: 'jojo-windows.yml', ref: 'codex/conversation-coherence', inputs: { recovery: 'true' } }]);
});

test('recuperacao: consulta de distribuicao negada falha fechada sem disparar build', async () => {
  const github = client();
  await assert.rejects(recover({ github, policy, fetchFn: async () => ({ status: 403, ok: false }), now }), /403/);
  assert.equal(github.writes.length, 0);
});

test('release: nenhum gate incompleto pode criar tag', async () => {
  const github = client(); const bad = report(); bad.steps[0].status = 'skipped';
  await assert.rejects(prepareRelease({ github, policy, report: bad, version: '0.44.0', commit: sha, files, fetchFn: absent }));
  assert.equal(github.writes.length, 0);
});

test('release: tag so e criada depois da validacao do commit/arquivos e nao aponta para outra branch', async () => {
  const github = client();
  const result = await prepareRelease({ github, policy, report: report(), version: '0.44.0', commit: sha, files, fetchFn: absent });
  assert.equal(result.publish, true);
  assert.deepEqual(github.writes, [{ owner: 'oaovito', repo: 'oao-companion-', ref: 'refs/tags/v0.44.0', sha }]);
  const moved = client({ branch: 'b'.repeat(40) });
  await assert.rejects(prepareRelease({ github: moved, policy, report: report(), version: '0.44.0', commit: sha, files, fetchFn: absent }));
  assert.equal(moved.writes.length, 0);
});

test('release: tag historica divergente e rascunho sao preservados sem alteracao', async () => {
  for (const github of [client({ tag: 'b'.repeat(40) }), client()]) {
    const fetchFn = github.writes.length ? absent : async () => ({ ok: true, json: async () => ({ ...published(), draft: true }) });
    await assert.rejects(prepareRelease({ github, policy, report: report(), version: '0.44.0', commit: sha, files, fetchFn }));
    assert.equal(github.writes.length, 0);
  }
  const github = client({ tag: 'b'.repeat(40) });
  await assert.rejects(prepareRelease({ github, policy, report: report(), version: '0.44.0', commit: sha, files, fetchFn: absent }));
  assert.equal(github.writes.length, 0);
});
