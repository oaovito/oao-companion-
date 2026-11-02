// Prova local da instalação Steam. Sem credenciais, rede ou leitura do conteúdo do jogo.
const path = require('node:path').win32;
const { installedGame, within } = require('./steam-library.cjs');
function verifyDarkestImage(image, readFile) {
  if (typeof image !== 'string' || path.basename(image).toLowerCase() !== 'darkest.exe') return false;
  const normalized = path.normalize(image); const lower = normalized.toLowerCase();
  const marker = '\\steamapps\\common\\'; const index = lower.lastIndexOf(marker);
  if (index < 0) return false;
  const relative = normalized.slice(index + marker.length).split('\\');
  if (relative.length < 2) return false;
  const manifestPath = path.join(normalized.slice(0, index + '\\steamapps'.length), 'appmanifest_262060.acf');
  try {
    const manifest = readFile(manifestPath);
    if (typeof manifest !== 'string' || manifest.length > 256000) return false;
    const game = installedGame(manifest, 'appmanifest_262060.acf', normalized.slice(0, index));
    return game.appId === '262060' && within(normalized, game.root);
  } catch { return false; }
}
module.exports = { verifyDarkestImage };
