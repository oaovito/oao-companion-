// Evidências sintéticas permanecem no repositório privado; nenhum ref de fonte é movido.
import { createHash } from 'node:crypto';
import { SOURCE_REPO } from '../../ci/policy.mjs';

const DIRECTORY = 'jojo-companion/docs/evidencias';
const MAX_BYTES = 1024 * 1024;
const REVIEW_TIMEOUT_MS = 5 * 60000, REVIEW_POLL_MS = 5000;
export function createPrivateEvidence({ commit, runId, attempt, token, fetch: fetchFn = fetch, now = () => performance.now(), sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  runId = String(runId || ''); attempt = String(attempt || '');
  if (!/^[0-9a-f]{40}$/.test(commit || '') || !/^[1-9]\d*$/.test(runId) || !/^[1-9]\d*$/.test(attempt)) throw new Error('Metadados de evidencia privada invalidos');
  if (typeof token !== 'string' || !token.trim()) throw new Error('GITHUB_TOKEN ausente para preservar evidencias privadas');
  const branch = `codex/ci-evidence-${runId}-${attempt}`;
  const conversationPath = `${DIRECTORY}/conversation-live.json`, validationPath = `${DIRECTORY}/validation-live.json`, reviewPath = `${DIRECTORY}/semantic-review.json`;
  const shas = new Map(); let initialized = false, conversationSaved = false, conversationDigest;
  async function request(method, suffix, body, phase, { pending404 = false, timeoutMs = 20000 } = {}) {
    let response;
    try {
      response = await fetchFn(`https://api.github.com/repos/${SOURCE_REPO}${suffix}`, {
        method, redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'JoJo-private-evidence', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new Error(`Evidencia privada (${phase}): falha de rede`); }
    if (pending404 && response.status === 404) return null;
    if (!response.ok) throw new Error(`Evidencia privada (${phase}): HTTP ${Number.isInteger(response.status) ? response.status : 'invalido'}`);
    try { return await response.json(); }
    catch { throw new Error(`Evidencia privada (${phase}): resposta invalida`); }
  }
  async function initialize() {
    if (initialized) return;
    const repo = await request('GET', '', null, 'repositorio');
    if (repo.private !== true) throw new Error('Evidencias exigem o repositorio privado de desenvolvimento');
    const ref = await request('POST', '/git/refs', { ref: `refs/heads/${branch}`, sha: commit }, 'branch');
    if (ref.ref !== `refs/heads/${branch}` || ref.object?.sha !== commit) throw new Error('Branch de evidencia privada divergente');
    initialized = true;
  }
  async function put(file, value) {
    const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
    if (bytes.length > MAX_BYTES) throw new Error('Evidencia privada excede o limite de tamanho');
    const expected = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    const previous = shas.get(file);
    const result = await request('PUT', `/contents/${file}`, {
      branch, message: `ci: preservar ${file.endsWith('conversation-live.json') ? 'conversa' : 'validacao'} do run ${runId}/${attempt} [skip ci]`,
      content: bytes.toString('base64'), ...(previous ? { sha: previous } : {}),
    }, file.endsWith('conversation-live.json') ? 'conversa' : 'validacao');
    if (result.content?.sha !== expected) throw new Error('Hash da evidencia privada nao confere');
    shas.set(file, expected);
  }
  const reviewError = (message, status) => Object.assign(new Error(message), { semanticReviewStatus: status });
  function approvedReview(file) {
    let review, bytes;
    try {
      if (file.encoding !== 'base64' || typeof file.content !== 'string' || file.content.length > MAX_BYTES * 2) throw new Error();
      const encoded = file.content.replace(/\s/g, '');
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw new Error();
      bytes = Buffer.from(encoded, 'base64');
      if (!bytes.length || bytes.length > MAX_BYTES) throw new Error();
      const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
      if (file.sha !== sha) throw new Error();
      review = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch { throw reviewError('Revisao semantica: arquivo invalido', 'invalid'); }
    if (review?.schema !== 1 || review.commit !== commit || String(review.runId) !== runId || String(review.attempt) !== attempt || review.digest !== conversationDigest || review.reviewedBy !== 'Codex' || typeof review.note !== 'string' || !review.note.trim() || review.note.length > 4000 || !['approved', 'rejected'].includes(review.status)) throw reviewError('Revisao semantica: identidade ou digest divergente', 'invalid');
    if (review.status === 'rejected') throw reviewError('Revisao semantica rejeitada para esta execucao', 'rejected');
    return { schema: 1, commit, runId, attempt, digest: conversationDigest, status: 'approved', reviewedBy: review.reviewedBy, note: review.note, blobSha: file.sha };
  }
  return Object.freeze({ branch, conversationPath, validationPath, reviewPath,
    async writeConversation(data) {
      if (conversationSaved) throw new Error('Conversa desta tentativa ja foi preservada; nao sobrescrever');
      if (!Array.isArray(data?.engine?.rows) || data.engine.rows.length !== 32 || data.engine.rows.some(row => row.errors?.length !== 0) || !Array.isArray(data?.ui?.rows) || data.ui.rows.length !== 12 || !Array.isArray(data.ui.rendererErrors) || data.ui.rendererErrors.length !== 0) throw new Error('Conversa completa aprovada exigida para evidencia privada');
      const digest = createHash('sha256').update(JSON.stringify(data)).digest('hex');
      await initialize();
      await put(conversationPath, { schema: 1, commit, runId, attempt, digest, data });
      conversationSaved = true; conversationDigest = digest;
    },
    async writeValidation(report) {
      if (!conversationSaved || report?.commit !== commit || String(report.runId) !== runId || !['running', 'passed', 'failed'].includes(report.status)) throw new Error('Validacao de evidencia privada divergente');
      await put(validationPath, report);
    },
    async awaitSemanticReview() {
      if (!conversationSaved) throw reviewError('Conversa ainda nao preservada para revisao', 'invalid');
      const started = now(), deadline = started + REVIEW_TIMEOUT_MS;
      for (let checks = 0; checks < 61; checks++) {
        const at = now(), remaining = deadline - at;
        if (!Number.isFinite(at) || at < started) throw reviewError('Relogio da revisao semantica invalido', 'invalid');
        if (remaining <= 0) break;
        const file = await request('GET', `/contents/${reviewPath}?ref=${encodeURIComponent(branch)}`, null, 'revisao semantica', { pending404: true, timeoutMs: Math.max(1, Math.min(20000, Math.ceil(remaining))) });
        if (file) {
          if (now() > deadline) break;
          return { ...approvedReview(file), waitMs: Math.max(0, now() - started) };
        }
        const delay = Math.min(REVIEW_POLL_MS, deadline - now());
        if (delay > 0) await sleep(delay);
      }
      throw reviewError('Revisao semantica nao registrada em cinco minutos', 'missing');
    },
  });
}
