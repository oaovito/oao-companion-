// Silêncio absoluto: nenhum caminho de áudio no app, nenhuma opção de som.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.js';
import { DEFAULTS, sanitize } from '../../src/core/settings-schema.js';

function arquivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? arquivos(path.join(dir, d.name)) : [path.join(dir, d.name)]));
}

test('silêncio: o código não cria áudio (AudioContext, <audio>, voz sintetizada, beep)', () => {
  const proibido = /\b(AudioContext|webkitAudioContext|new Audio\(|speechSynthesis|SpeechSynthesisUtterance|<audio|<video|shell\.beep|createOscillator)\b/;
  for (const f of arquivos(path.join(ROOT, 'src')).filter((f) => /\.(js|cjs|mjs|html)$/.test(f))) {
    assert.doesNotMatch(fs.readFileSync(f, 'utf8'), proibido, path.relative(ROOT, f));
  }
  const assets = arquivos(path.join(ROOT, 'assets'));
  assert.equal(assets.filter((f) => /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f)).length, 0, 'sem arquivos de som');
});

test('silêncio: sem opção de som/volume nas configurações; arquivo antigo com sons ligados é ignorado', () => {
  assert.equal('sounds' in DEFAULTS, false);
  assert.equal('volume' in DEFAULTS, false);
  const html = fs.readFileSync(path.join(ROOT, 'src/renderer/settings/index.html'), 'utf8');
  assert.doesNotMatch(html, /name="(sounds|volume)"/);
  const { settings } = sanitize({ sounds: true, volume: 100 });
  assert.equal(settings.sounds, undefined);
  assert.equal(settings.volume, undefined);
});

test('silêncio: toda janela do Electron nasce mutada', () => {
  const main = fs.readFileSync(path.join(ROOT, 'src/main/main.js'), 'utf8');
  assert.match(main, /web-contents-created[\s\S]{0,80}setAudioMuted\(true\)/);
});
