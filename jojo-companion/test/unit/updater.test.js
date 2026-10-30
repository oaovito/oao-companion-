// Atualização automática: versões, escolha do arquivo e consulta às Releases.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVersion, isNewer, pickAsset, UpdateChecker, portableSwapScript } from '../../src/core/updater.js';
import { detectMode } from '../../src/main/auto-update.js';

const RELEASE = {
  tag_name: 'v0.17.0',
  draft: false,
  prerelease: false,
  body: 'novidades',
  assets: [
    { name: 'JoJoCompanion.exe', browser_download_url: 'https://x/JoJoCompanion.exe', size: 100, digest: 'sha256:' + 'a'.repeat(64) },
    { name: 'JoJoCompanion-Setup-0.17.0.exe', browser_download_url: 'https://x/setup.exe', size: 90 },
    { name: 'JoJoCompanion-0.17.0-win-x64.zip', browser_download_url: 'https://x/z.zip', size: 80 },
  ],
};

test('versões: compara corretamente', () => {
  assert.deepEqual(parseVersion('v1.2.3'), [1, 2, 3]);
  assert.deepEqual(parseVersion('0.10'), [0, 10, 0]);
  assert.equal(parseVersion('abc'), null);
  assert.equal(isNewer('0.10.0', '0.9.9'), true);
  assert.equal(isNewer('v0.16.0', '0.16.0'), false);
  assert.equal(isNewer('0.15.9', '0.16.0'), false);
  assert.equal(isNewer('1.0.0', '0.99.99'), true);
});

test('arquivo certo para cada tipo de instalação', () => {
  assert.equal(pickAsset(RELEASE, 'portable').name, 'JoJoCompanion.exe');
  assert.equal(pickAsset(RELEASE, 'portable').sha256, 'a'.repeat(64));
  assert.equal(pickAsset(RELEASE, 'installer').name, 'JoJoCompanion-Setup-0.17.0.exe');
  assert.equal(pickAsset(RELEASE, 'installer').sha256, null);
  assert.equal(pickAsset(RELEASE, null), null);
  assert.equal(pickAsset({ assets: [] }, 'portable'), null);
});

function fakeFetch(status, body, calls = []) {
  return async (url, opts) => {
    calls.push({ url, opts });
    return { ok: status === 200, status, json: async () => body };
  };
}

test('consulta a última versão e só oferece se for mais nova', async () => {
  const calls = [];
  let c = new UpdateChecker({ fetch: fakeFetch(200, RELEASE, calls), owner: 'o', repo: 'r', current: '0.16.0', mode: 'portable' });
  const r = await c.check();
  assert.equal(r.version, '0.17.0');
  assert.equal(r.asset.name, 'JoJoCompanion.exe');
  assert.equal(calls[0].url, 'https://api.github.com/repos/o/r/releases/latest');
  assert.ok(calls[0].opts.headers['User-Agent']);

  c = new UpdateChecker({ fetch: fakeFetch(200, RELEASE), owner: 'o', repo: 'r', current: '0.17.0', mode: 'portable' });
  assert.equal(await c.check(), null, 'mesma versão: nada');
  c = new UpdateChecker({ fetch: fakeFetch(200, { ...RELEASE, prerelease: true }), owner: 'o', repo: 'r', current: '0.1.0', mode: 'portable' });
  assert.equal(await c.check(), null, 'pré-lançamento: ignora');
  c = new UpdateChecker({ fetch: fakeFetch(404, {}), owner: 'o', repo: 'r', current: '0.1.0', mode: 'portable' });
  await assert.rejects(() => c.check(), /privado|nenhuma versão/);
  const calls2 = [];
  c = new UpdateChecker({ fetch: fakeFetch(200, RELEASE, calls2), owner: 'o', repo: 'r', current: '0.1.0', mode: null });
  assert.equal(await c.check(), null, 'ZIP/desenvolvimento: não consulta');
  assert.equal(calls2.length, 0);
});

test('script de troca do portátil: espera liberar, move e reabre', () => {
  const s = portableSwapScript({ newPath: 'C:\\u\\updates\\JoJoCompanion.exe', targetPath: 'D:\\Downloads\\JoJoCompanion.exe' });
  assert.match(s, /move \/y "C:\\u\\updates\\JoJoCompanion.exe" "D:\\Downloads\\JoJoCompanion.exe"/);
  assert.match(s, /goto retry/);
  assert.match(s, /start "" "D:\\Downloads\\JoJoCompanion.exe"/);
  assert.ok(s.includes('\r\n'), 'quebras de linha do Windows');
  assert.ok(!s.includes('%~f0'), 'não se apaga enquanto roda (cmd daria erro)');
  assert.match(s, /exit \/b 0\r\n$/);
  assert.ok(!portableSwapScript({ newPath: 'a"b', targetPath: 'c' }).includes('a"b'), 'sem aspas soltas');
});

test('tipo de instalação detectado', () => {
  const app = { isPackaged: true, getName: () => 'JoJo Companion' };
  assert.equal(detectMode({ app, env: { PORTABLE_EXECUTABLE_FILE: 'x' }, platform: 'win32' }), 'portable');
  assert.equal(detectMode({ app, env: {}, platform: 'win32', exists: () => true }), 'installer');
  assert.equal(detectMode({ app, env: {}, platform: 'win32', exists: () => false }), null);
  assert.equal(detectMode({ app, env: {}, platform: 'linux' }), null);
  assert.equal(detectMode({ app: { ...app, isPackaged: false }, env: {}, platform: 'win32' }), null);
});

test('atualização com o JoJo aberto: avisa que já volta (no Modo Trabalho, em silêncio)', async () => {
  const { makeEnv } = await import('./helpers.js');
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  const ditas = [];
  const orig = e.companion.say.bind(e.companion);
  e.companion.say = (t, k, o) => (ditas.push(t), orig(t, k, o));
  assert.equal(e.companion.avisarAtualizacao('9.9.9'), true);
  assert.match(ditas.pop(), /Já volto/);
  e.companion.startWork();
  assert.equal(e.companion.avisarAtualizacao('9.9.9'), false);
});
