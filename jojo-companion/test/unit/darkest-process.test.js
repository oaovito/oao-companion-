import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { verifyDarkestImage } = createRequire(import.meta.url)('../../src/core/darkest-process.cjs');
const image = 'D:\\SteamLibrary\\steamapps\\common\\DarkestDungeon\\_windows\\Darkest.exe';
const manifest = '"AppState" { "appid" "262060" "installdir" "DarkestDungeon" }';
test('Steam DD1: exige executável, diretório e manifesto do app 262060, não DDII', () => {
  let requested;
  assert.equal(verifyDarkestImage(image, f => { requested = f; return manifest; }), true);
  assert.equal(requested, 'D:\\SteamLibrary\\steamapps\\appmanifest_262060.acf');
  assert.equal(verifyDarkestImage(image.replace('Darkest.exe', 'Darkest Dungeon II.exe'), () => manifest), false);
  assert.equal(verifyDarkestImage(image, () => manifest.replace('262060', '1940340')), false);
  assert.equal(verifyDarkestImage(image, () => manifest.replace('DarkestDungeon', 'OtherGame')), false);
  assert.equal(verifyDarkestImage('C:\\Temp\\Darkest.exe', () => manifest), false);
  assert.equal(verifyDarkestImage(image.replace('_windows', '_windowsnosteam'), () => manifest), true, 'manifesto Steam válido é a prova; o subdiretório não precisa ter nome fixo');
  assert.equal(verifyDarkestImage(image.replace('\\_windows', ''), () => manifest), true, 'executável na raiz da instalação validada');
  assert.equal(verifyDarkestImage(image, () => { throw new Error('ausente'); }), false);
  assert.equal(verifyDarkestImage(image.toLowerCase(), () => manifest), true);
});
