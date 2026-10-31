import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { preflight, publicar, conferirArtefatos, nomesDosArtefatos, verificarDownload, REPO } from '../../scripts/publish-release.mjs';

const missing = () => { const e = new Error('404'); e.status = 404; throw e; };
const base = { version: '1.2.3', tag: 'v1.2.3' };
for (const corrupt of [false, true]) {
  test(`download anônimo confere conteúdo SHA-256; corrompido=${corrupt}`, async (t) => {
    const data = Buffer.from('MZ-executavel');
    t.mock.method(globalThis, 'fetch', async (url, opts) => {
      assert.equal(url.origin, 'https://github.com');
      assert.equal(opts.headers, undefined, 'nenhum token no download público');
      return new Response(corrupt ? Buffer.from('MZ-corrompido') : data);
    });
    const result = verificarDownload({ browser_download_url: `https://github.com/${REPO}/releases/download/v1.2.3/JoJoCompanion.exe` },
      { name: 'JoJoCompanion.exe', size: data.length, digest: `sha256:${crypto.createHash('sha256').update(data).digest('hex')}` });
    if (corrupt) await assert.rejects(result, /não confere/);
    else await result;
  });
}
test('publicação recusa tag divergente antes de acessar o GitHub', async () => {
  await assert.rejects(preflight({ ...base, tag: 'v9.0.0', request: () => assert.fail('não deve acessar') }), /não correspondem/);
});
for (const existing of ['releases/tags/', 'git/ref/tags/']) {
  test(`nunca altera versão histórica existente: ${existing}`, async () => {
    await assert.rejects(preflight({ ...base, request: async (method, url) => {
      assert.equal(method, 'GET');
      if (url.endsWith(REPO)) return { private: false };
      if (url.includes(existing)) return { id: 7 };
      return missing();
    } }), /já existe/);
  });
}
test('403 de token não é tratado como ausência de release', async () => {
  await assert.rejects(preflight({ ...base, request: async (_, url) => {
    if (url.endsWith(REPO)) return { private: false };
    const e = new Error('token sem permissão'); e.status = 403; throw e;
  } }), /sem permissão/);
});
test('exige os três nomes exatos e assinaturas binárias, sem incluir código-fonte', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-artifacts-'));
  try {
    for (const name of nomesDosArtefatos(base.version)) {
      const data = Buffer.alloc(2048); data.write(name.endsWith('.exe') ? 'MZ' : 'PK');
      fs.writeFileSync(path.join(dir, name), data);
    }
    assert.equal(conferirArtefatos(dir, base.version).length, 3);
    fs.writeFileSync(path.join(dir, 'JoJoCompanion.exe'), 'erro HTML');
    assert.throws(() => conferirArtefatos(dir, base.version), /Artefato inválido/);
    fs.rmSync(path.join(dir, 'JoJoCompanion.exe'));
    assert.throws(() => conferirArtefatos(dir, base.version), /ENOENT/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
for (const corrupt of [false, true]) {
  test(`upload em rascunho e verificação sem login; corrompido=${corrupt}`, async () => {
    const files = nomesDosArtefatos(base.version).map((name) => ({ name, data: Buffer.from('MZ'), size: 2, digest: 'sha256:abc' }));
    let published = false;
    let anonymous = false;
    let downloads = 0;
    const request = async (method, url, body) => {
      if (method === 'GET') {
        if (url.endsWith(REPO)) return { private: false };
        if (url.endsWith('/releases/7')) return { draft: true };
        return missing();
      }
      if (method === 'PATCH') { assert.equal(body.draft, false); published = true; return {}; }
      if (url.endsWith('/releases')) {
        assert.equal(body.draft, true);
        return { id: 7, upload_url: 'https://uploads.github.com/assets{?name}' };
      }
      const name = new URL(url).searchParams.get('name');
      return { ...files.find((f) => f.name === name), size: corrupt ? 99 : 2 };
    };
    const promise = publicar({ ...base, files, notes: 'mudança real', request, verifyDownload: async (asset, file) => {
      assert.equal(asset.name, file.name); downloads++;
    }, publicRequest: async (method, url) => {
      assert.equal(method, 'GET'); assert.ok(url.endsWith('/releases/latest')); assert.ok(published);
      anonymous = true;
      return { tag_name: base.tag, assets: files, html_url: 'https://github.com/release' };
    } });
    if (corrupt) { await assert.rejects(promise, /Upload não confere/); assert.equal(published, false); }
    else { await promise; assert.ok(anonymous); assert.equal(downloads, 3); }
  });
}
