import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createPrivateEvidence } from '../../scripts/ci-evidence.mjs';

const commit = 'a'.repeat(40), token = 'segredo-sintetico-do-ci';
const metadata = { commit, runId: '123456', attempt: '2', token };
const conversation = () => ({ engine: { rows: Array.from({ length: 32 }, () => ({ input: 'Sintético', text: 'Resposta', errors: [] })) }, ui: { rows: Array.from({ length: 12 }, () => ({ input: 'Sintético', text: 'Resposta' })), rendererErrors: [] } });
const report = () => ({ schema: 1, commit, runId: '123456', status: 'running', steps: [{ id: 'conversation', status: 'passed' }] });
const blobSha = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
function server({ privateRepo = true, branchExists = false } = {}) {
  const calls = [], files = new Map();
  const respond = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
  const fetch = async (url, options) => {
    assert.ok(url.startsWith('https://api.github.com/repos/oaovito/oao-companion-'));
    assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, `Bearer ${token}`);
    const suffix = url.slice('https://api.github.com/repos/oaovito/oao-companion-'.length);
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ method: options.method, suffix, body });
    if (options.method === 'GET' && !suffix) return respond(200, { private: privateRepo });
    if (options.method === 'POST' && suffix === '/git/refs') return branchExists ? respond(422, { message: token }) : respond(201, { ref: body.ref, object: { sha: body.sha } });
    if (options.method === 'PUT' && suffix.startsWith('/contents/')) {
      const path = suffix.slice('/contents/'.length), previous = files.get(path);
      if (previous ? body.sha !== previous.sha : body.sha !== undefined) return respond(409, { message: token });
      const bytes = Buffer.from(body.content, 'base64');
      const saved = { sha: blobSha(bytes), value: JSON.parse(bytes.toString()) }; files.set(path, saved);
      return respond(previous ? 200 : 201, { content: { sha: saved.sha } });
    }
    assert.fail('Requisicao inesperada');
  };
  return { fetch, calls, files };
}

test('evidências CI: conversa exata fica em branch privada do mesmo SHA e validação usa lease', async () => {
  const remote = server(), evidence = createPrivateEvidence({ ...metadata, fetch: remote.fetch }), data = conversation();
  await evidence.writeConversation(data); await evidence.writeValidation(report());
  const first = remote.files.get(evidence.validationPath).sha;
  await evidence.writeValidation({ ...report(), status: 'passed' });
  assert.equal(evidence.branch, 'codex/ci-evidence-123456-2');
  const saved = remote.files.get(evidence.conversationPath).value;
  assert.equal(saved.commit, commit); assert.equal(saved.runId, '123456'); assert.equal(saved.attempt, '2');
  assert.deepEqual(saved.data, data);
  assert.equal(saved.digest, createHash('sha256').update(JSON.stringify(data)).digest('hex'));
  assert.deepEqual(remote.calls[1].body, { ref: `refs/heads/${evidence.branch}`, sha: commit });
  assert.equal(remote.calls.at(-1).body.sha, first);
  assert.ok(remote.calls.filter(c => c.method === 'PUT').every(c => c.body.branch === evidence.branch && !Object.hasOwn(c.body, 'force')));
  const before = remote.calls.length;
  await assert.rejects(evidence.writeConversation(data), /nao sobrescrever/);
  await assert.rejects(evidence.writeValidation({ ...report(), commit: 'b'.repeat(40) }), /divergente/);
  assert.equal(remote.calls.length, before);
});

test('evidências CI: alteração externa do arquivo bloqueia atualização sem rebase ou sobrescrita', async () => {
  const remote = server(), evidence = createPrivateEvidence({ ...metadata, fetch: remote.fetch });
  await evidence.writeConversation(conversation()); await evidence.writeValidation(report());
  const ownSha = remote.files.get(evidence.validationPath).sha;
  const external = { sha: 'b'.repeat(40), value: { external: true } }; remote.files.set(evidence.validationPath, external);
  const before = remote.calls.length;
  await assert.rejects(evidence.writeValidation({ ...report(), status: 'passed' }), /HTTP 409/);
  assert.equal(remote.calls.length, before + 1); assert.equal(remote.calls.at(-1).body.sha, ownSha);
  assert.equal(remote.files.get(evidence.validationPath), external);
});

test('evidências CI: destino público, branch existente e erro remoto falham sem revelar token', async () => {
  for (const options of [{ privateRepo: false }, { branchExists: true }]) {
    const remote = server(options), evidence = createPrivateEvidence({ ...metadata, fetch: remote.fetch });
    await assert.rejects(evidence.writeConversation(conversation()), error => !error.message.includes(token));
    assert.equal(remote.calls.some(c => c.method === 'PUT'), false);
  }
  const broken = createPrivateEvidence({ ...metadata, fetch: async () => { throw new Error(`Authorization: Bearer ${token}`); } });
  await assert.rejects(broken.writeConversation(conversation()), error => /falha de rede/.test(error.message) && !error.message.includes(token));
});

test('evidências CI: metadados ou conversa incompletos não criam refs nem arquivos', async () => {
  for (const change of [{ commit: 'invalid' }, { runId: '../main' }, { attempt: '0' }, { token: '' }]) assert.throws(() => createPrivateEvidence({ ...metadata, ...change }));
  const remote = server(), evidence = createPrivateEvidence({ ...metadata, fetch: remote.fetch });
  await assert.rejects(evidence.writeValidation(report()), /divergente/);
  const partial = conversation(); partial.ui.rows.pop();
  await assert.rejects(evidence.writeConversation(partial), /Conversa completa/);
  const failed = conversation(); failed.engine.rows[0].errors.push('falha real');
  await assert.rejects(evidence.writeConversation(failed), /Conversa completa/);
  assert.equal(remote.calls.length, 0);
});
