// Controle leve executado somente pelo GitHub Actions. Sem polling ou commits artificiais.
export const PRIVATE = { owner: 'oaovito', repo: 'oao-companion-' };
export const PUBLIC = { owner: 'oaovito', repo: 'jojo-companion-releases' };
export const WORKFLOW = 'jojo-windows.yml';

export function releaseState(release, version) {
  if (!release) return 'absent';
  if (release.tag_name !== `v${version}` || release.draft || release.prerelease) return 'blocked';
  const names = ['JoJoCompanion.exe', `JoJoCompanion-Setup-${version}.exe`, `JoJoCompanion-${version}-win-x64.zip`];
  return release.assets?.length === 3 && names.every((name) => release.assets.some((a) => a.name === name && a.size >= 1024 && /^sha256:[0-9a-f]{64}$/i.test(a.digest || '') && a.browser_download_url?.startsWith(`https://github.com/${PUBLIC.owner}/${PUBLIC.repo}/releases/download/v${version}/`))) ? 'published' : 'blocked';
}

export function classifyFailure(message) {
  const text = String(message || '').toLowerCase();
  if (/payments?/.test(text) && /\bor\b/.test(text) && /spending|limit|budget/.test(text)) return 'billing_blocked_cause_unknown';
  if (/included.*minutes.*(exhaust|exceed)|minute.*quota.*(exhaust|exceed)/.test(text)) return 'free_quota_exhausted';
  if (/payment.*(fail|declin)|payments.*fail/.test(text)) return 'payment_failed';
  if (/spending limit|budget.*(reach|exceed)/.test(text)) return 'spending_limit_reached';
  return null;
}

export function recoveryDecision({ policy, release, sha, runs = [], jobs = [], annotation = '', now = Date.now() }) {
  if (policy.paidUsageBlockedConfirmed !== true || !policy.confirmation) return { action: 'stop', reason: 'zero_paid_usage_unverified' };
  const published = releaseState(release, policy.pendingVersion);
  if (published !== 'absent') return { action: 'stop', reason: published === 'published' ? 'already_published_metadata_valid' : 'existing_release_needs_inspection' };
  if (runs.some((r) => ['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(r.status))) return { action: 'stop', reason: 'pipeline_already_active' };
  const last = runs.find((r) => r.head_sha === sha);
  if (!last) return { action: 'dispatch', reason: 'new_commit' };
  if (last.conclusion === 'cancelled') return { action: 'stop', reason: 'cancelled_run_preserved' };
  const skipped = jobs.length > 0 && jobs.every((j) => j.conclusion === 'skipped');
  if (last.conclusion === 'success' && !skipped) return { action: 'stop', reason: 'successful_run_without_release_needs_inspection' };
  const financial = classifyFailure(annotation);
  const started = jobs.some((j) => j.runner_name || j.steps?.some((s) => s.started_at));
  if (!financial && started && !skipped) return { action: 'stop', reason: 'technical_failure_same_commit' };
  if (now - Date.parse(last.created_at) < 55 * 60000) return { action: 'stop', reason: 'hourly_cooldown' };
  return { action: 'dispatch', reason: financial || (skipped ? 'previous_cost_lock' : 'runner_startup_failure') };
}

export async function readPublicRelease(version, token, fetchFn = fetch) {
  const res = await fetchFn(`https://api.github.com/repos/${PUBLIC.owner}/${PUBLIC.repo}/releases/tags/v${version}`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'JoJo-Actions-recovery', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(15000), redirect: 'error',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Consulta de distribuicao recusada: HTTP ${res.status}`);
  return res.json();
}

export async function recover({ github, policy, releasesToken, now = Date.now(), fetchFn = fetch }) {
  if (policy.paidUsageBlockedConfirmed !== true || !policy.confirmation) return recoveryDecision({ policy });
  const release = await readPublicRelease(policy.pendingVersion, releasesToken, fetchFn);
  if (release) return recoveryDecision({ policy, release });
  const ref = await github.rest.git.getRef({ ...PRIVATE, ref: `heads/${policy.sourceBranch}` });
  const sha = ref.data.object.sha;
  const content = await github.rest.repos.getContent({ ...PRIVATE, path: 'jojo-companion/package.json', ref: sha });
  const pkg = JSON.parse(Buffer.from(content.data.content, 'base64'));
  if (pkg.version !== policy.pendingVersion || pkg.private !== true || `${pkg.jojoUpdate?.owner}/${pkg.jojoUpdate?.repo}` !== `${PUBLIC.owner}/${PUBLIC.repo}`) throw new Error('Origem, versao ou atualizador divergente');
  const result = await github.rest.actions.listWorkflowRuns({ ...PRIVATE, workflow_id: WORKFLOW, per_page: 100 });
  const runs = result.data.workflow_runs;
  if (runs.some((r) => ['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(r.status))) return { ...recoveryDecision({ policy, release, sha, runs, now }), sha };
  const last = runs.find((r) => r.head_sha === sha && r.status === 'completed');
  let jobs = [], annotation = '';
  if (last) {
    jobs = (await github.rest.actions.listJobsForWorkflowRun({ ...PRIVATE, run_id: last.id, per_page: 100 })).data.jobs;
    for (const job of jobs.filter((j) => j.conclusion === 'failure' && !j.runner_name)) {
      try {
        const data = await github.rest.checks.listAnnotations({ ...PRIVATE, check_run_id: job.id, per_page: 20 });
        annotation += data.data.map((a) => a.message).join('\n');
      } catch { /* Sem anotacao, nao presumir pagamento recusado ou franquia esgotada. */ }
    }
  }
  const decision = recoveryDecision({ policy, release, sha, runs, jobs, annotation, now });
  if (decision.action === 'dispatch') await github.rest.actions.createWorkflowDispatch({ ...PRIVATE, workflow_id: WORKFLOW, ref: policy.sourceBranch, inputs: { recovery: 'true' } });
  return { ...decision, sha, previousRun: last?.html_url || null, billing: classifyFailure(annotation) };
}

// Executada no MESMO job Windows depois de todos os gates. Tag gerada com GITHUB_TOKEN
// nao dispara outro build; a publicacao usa apenas RELEASES_TOKEN no passo seguinte.
export async function prepareRelease({ github, policy, report, version, commit, files, releasesToken, fetchFn = fetch }) {
  if (!policy.paidUsageBlockedConfirmed || !policy.confirmation || version !== policy.pendingVersion) throw new Error('Recuperacao desta versao nao esta autorizada');
  const { assertValidation } = await import('./policy.mjs');
  assertValidation(report, { version, commit, files });
  const current = await readPublicRelease(version, releasesToken, fetchFn);
  if (current) {
    if (releaseState(current, version) !== 'published') throw new Error('Release existente preservada; precisa inspecao');
    return { publish: false, reason: 'already_published' };
  }
  const branch = await github.rest.git.getRef({ ...PRIVATE, ref: `heads/${policy.sourceBranch}` });
  if (branch.data.object.sha !== commit) throw new Error('Branch avancou durante a validacao; aguardar o commit novo');
  let existing;
  try { existing = (await github.rest.git.getRef({ ...PRIVATE, ref: `tags/v${version}` })).data.object; }
  catch (e) { if (e.status !== 404) throw e; }
  if (existing) {
    if (existing.type === 'tag') existing = (await github.rest.git.getTag({ ...PRIVATE, tag_sha: existing.sha })).data.object;
    if (existing.sha !== commit) throw new Error('Tag existente aponta para outro commit; nunca mover');
  } else await github.rest.git.createRef({ ...PRIVATE, ref: `refs/tags/v${version}`, sha: commit });
  return { publish: true, tag: `v${version}` };
}
