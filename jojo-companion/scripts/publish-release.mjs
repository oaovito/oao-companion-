// Canal público recebe só binários e notas incrementais; releases existentes são imutáveis.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { notasDaRelease } from './release-notes.mjs';

export const REPO = 'oaovito/jojo-companion-releases';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const nomesDosArtefatos = (version) => [
  'JoJoCompanion.exe', `JoJoCompanion-Setup-${version}.exe`, `JoJoCompanion-${version}-win-x64.zip`,
];

export function conferirArtefatos(dir, version) {
  return nomesDosArtefatos(version).map((name) => {
    const data = fs.readFileSync(path.join(dir, name));
    const magic = name.endsWith('.exe') ? 'MZ' : 'PK';
    if (data.length < 1024 || data.subarray(0, 2).toString() !== magic) throw new Error(`Artefato inválido: ${name}`);
    return { name, data, size: data.length, digest: `sha256:${crypto.createHash('sha256').update(data).digest('hex')}` };
  });
}

export async function preflight({ request, version, tag }) {
  if (!/^\d+\.\d+\.\d+$/.test(version) || tag !== `v${version}`) throw new Error('Tag e package.json não correspondem');
  const repo = await request('GET', `/repos/${REPO}`);
  if (repo.private !== false) throw new Error('Canal de distribuição não é público');
  // 404 é a única resposta que permite criar uma release/tag. 403/rede falham fechados.
  for (const suffix of [`releases/tags/${tag}`, `git/ref/tags/${tag}`]) {
    try { await request('GET', `/repos/${REPO}/${suffix}`); }
    catch (e) { if (e.status === 404) continue; throw e; }
    throw new Error(`Versão ${tag} já existe no canal público; nunca sobrescrever`);
  }
}

export async function publicar({ request, publicRequest, version, tag, files, notes }) {
  await preflight({ request, version, tag });
  const release = await request('POST', `/repos/${REPO}/releases`, { tag_name: tag, name: `JoJo ${tag}`, body: notes, draft: true, prerelease: false });
  const uploads = [];
  for (const file of files) {
    const url = release.upload_url.replace(/\{.*$/, '') + `?name=${encodeURIComponent(file.name)}`;
    uploads.push(await request('POST', url, file.data));
  }
  conferirAssets(uploads, files);
  // Uma falha mantém o rascunho invisível ao atualizador. Nunca editar release publicada.
  const current = await request('GET', `/repos/${REPO}/releases/${release.id}`);
  if (!current.draft) throw new Error('Release deixou de ser rascunho durante o upload');
  await request('PATCH', `/repos/${REPO}/releases/${release.id}`, { draft: false, make_latest: 'true' });
  const visible = await publicRequest('GET', `/repos/${REPO}/releases/latest`);
  if (visible.tag_name !== tag || visible.draft || visible.prerelease) throw new Error('Versão ainda não detectável sem login');
  conferirAssets(visible.assets, files);
  console.log(`Release pública verificada: ${visible.html_url}`);
}

export function conferirAssets(assets, files) {
  for (const file of files) {
    const asset = assets.find((a) => a.name === file.name);
    if (!asset || asset.size !== file.size || asset.digest !== file.digest) throw new Error(`Upload não confere: ${file.name}`);
  }
}

function client(token) {
  return async (method, resource, body) => {
    const url = resource.startsWith('https://') ? resource : `https://api.github.com${resource}`;
    const parsed = new URL(url);
    if (!['api.github.com', 'uploads.github.com'].includes(parsed.hostname)) throw new Error('Destino GitHub inválido');
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'JoJo-release', 'X-GitHub-Api-Version': '2022-11-28' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers['Content-Type'] = Buffer.isBuffer(body) ? 'application/octet-stream' : 'application/json';
    const res = await fetch(url, { method, headers, body: body ? (Buffer.isBuffer(body) ? body : JSON.stringify(body)) : undefined, signal: AbortSignal.timeout(300000), redirect: 'error' });
    if (!res.ok) { const error = new Error(`GitHub ${method} ${parsed.pathname}: HTTP ${res.status}`); error.status = res.status; throw error; }
    return res.json();
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
    const dir = path.join(ROOT, 'dist');
    if (process.argv.includes('--artifacts')) {
      console.log(conferirArtefatos(dir, version).map((f) => `${f.name}: ${f.size} bytes, ${f.digest}`).join('\n'));
    } else {
      if (!process.env.RELEASES_TOKEN) throw new Error('RELEASES_TOKEN ausente: publicação bloqueada');
      if (process.env.GITHUB_REF_TYPE !== 'tag') throw new Error('Publicação exige tag oficial');
      const request = client(process.env.RELEASES_TOKEN);
      const tag = process.env.GITHUB_REF_NAME;
      const notes = notasDaRelease(fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8'), version);
      if (process.argv.includes('--check')) await preflight({ request, version, tag });
      else await publicar({ request, publicRequest: client(), version, tag, files: conferirArtefatos(dir, version), notes });
    }
  } catch (e) { console.error(`Publicação bloqueada: ${e.message}`); process.exitCode = 1; }
}
