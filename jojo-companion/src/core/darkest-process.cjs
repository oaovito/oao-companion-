// Prova local da instalação Steam. Sem credenciais, rede ou leitura do conteúdo do jogo.
const path = require('node:path').win32;
function verifyDarkestImage(image, readFile) {
  if (typeof image !== 'string' || path.basename(image).toLowerCase() !== 'darkest.exe') return false;
  const normalized = path.normalize(image); const lower = normalized.toLowerCase();
  const marker = '\\steamapps\\common\\'; const index = lower.lastIndexOf(marker);
  if (index < 0) return false;
  const relative = normalized.slice(index + marker.length).split('\\');
  if (relative.length !== 3 || relative[1].toLowerCase() !== '_windows') return false;
  const manifestPath = path.join(normalized.slice(0, index + '\\steamapps'.length), 'appmanifest_262060.acf');
  try {
    const manifest = readFile(manifestPath);
    if (typeof manifest !== 'string' || manifest.length > 256000) return false;
    const appId = manifest.match(/"appid"\s*"(\d+)"/i)?.[1];
    const directory = manifest.match(/"installdir"\s*"([^"\r\n]+)"/i)?.[1];
    return appId === '262060' && directory && !/[\\/]/.test(directory) && directory !== '..' && directory.toLowerCase() === relative[0].toLowerCase();
  } catch { return false; }
}
module.exports = { verifyDarkestImage };
