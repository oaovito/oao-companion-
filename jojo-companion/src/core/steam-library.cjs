// Metadados locais Valve KeyValues. Nenhum login, título de janela ou rede.
const path = require('node:path').win32;
function parseVdf(text) {
  if (typeof text !== 'string' || text.length > 2097152) throw new Error('metadata_size');
  const tokens = []; const re = /\s+|\/\/[^\r\n]*|"((?:\\.|[^"\\])*)"|([{}])|([^\s{}"]+)/gy;
  let at = 0;
  while (at < text.length) {
    re.lastIndex = at; const m = re.exec(text); if (!m) throw new Error('metadata_syntax'); at = re.lastIndex;
    if (m[1] !== undefined) tokens.push({ value: m[1].replace(/\\([\\"])/g, '$1') });
    else if (m[2]) tokens.push({ brace: m[2] });
    else if (m[3]) tokens.push({ value: m[3] });
    if (tokens.length > 200000) throw new Error('metadata_size');
  }
  let i = 0;
  function object(depth = 0, nested = false) {
    if (depth > 12) throw new Error('metadata_depth'); const out = Object.create(null);
    while (i < tokens.length) {
      const token = tokens[i++], key = token.value;
      if (token.brace === '}') { if (!nested) throw new Error('metadata_syntax'); return out; }
      if (key === undefined || i >= tokens.length || Object.hasOwn(out, key.toLowerCase())) throw new Error('metadata_syntax');
      const value = tokens[i++];
      if (value.brace === '}') throw new Error('metadata_syntax');
      out[key.toLowerCase()] = value.brace === '{' ? object(depth + 1, true) : value.value;
    }
    if (nested) throw new Error('metadata_syntax'); return out;
  }
  return object();
}
const localRoot = value => typeof value === 'string' && /^[a-z]:[\\/]/i.test(value) && !/[\x00-\x1f]/.test(value) ? path.normalize(value).replace(/\\+$/, '') : null;
const within = (file, root) => {
  const rel = path.relative(root.toLowerCase(), file.toLowerCase());
  return !!rel && rel !== '..' && !rel.startsWith('..\\') && !path.isAbsolute(rel);
};
function installedGame(text, file, library) {
  const s = parseVdf(text).appstate;
  if (!s || typeof s !== 'object' || !/^\d{1,10}$/.test(s.appid || '') || path.basename(file).toLowerCase() !== `appmanifest_${s.appid}.acf`) throw new Error('manifest_invalid');
  if (s.stateflags != null && (!/^\d+$/.test(s.stateflags) || !(Number(s.stateflags) & 4))) throw new Error('game_incomplete');
  const dir = s.installdir;
  if (typeof dir !== 'string' || !dir.trim() || dir === '.' || dir === '..' || /[. ]$/.test(dir) || /[\\/:\x00-\x1f]/.test(dir)) throw new Error('manifest_directory');
  const root = path.join(library, 'steamapps', 'common', dir);
  return { appId: s.appid, name: String(s.name || (s.appid === '262060' ? 'Darkest Dungeon' : `Jogo Steam ${s.appid}`)).replace(/[\x00-\x1f]/g, '').slice(0, 160), root };
}
function discoverSteam({ roots = [], readFile, exists, readdir }) {
  const verifiedRoots = [], libraries = new Map(), games = new Map(), diagnostics = new Set();
  let incomplete = false;
  const unavailable = reason => { incomplete = true; diagnostics.add(reason); };
  const add = value => {
    const root = localRoot(value); if (!root) { unavailable('library_metadata_invalid'); return; }
    if (!libraries.has(root.toLowerCase()) && libraries.size >= 32) { unavailable('inventory_limit'); return; }
    libraries.set(root.toLowerCase(), root);
  };
  if (roots.length > 32) unavailable('inventory_limit');
  for (const candidate of roots.slice(0, 32)) {
    const root = localRoot(candidate); if (!root) continue;
    if (!exists(path.join(root, 'steam.exe'))) continue;
    verifiedRoots.push(root); add(root);
    let folders, metadataFailed = false;
    for (const file of [path.join(root, 'steamapps', 'libraryfolders.vdf'), path.join(root, 'config', 'libraryfolders.vdf')]) {
      if (!exists(file)) continue;
      let text;
      try { text = readFile(file); } catch { diagnostics.add('library_unreadable'); metadataFailed = true; continue; }
      try {
        folders = parseVdf(text).libraryfolders;
        if (!folders || typeof folders !== 'object') throw new Error('library_metadata_invalid');
        break;
      } catch { folders = null; diagnostics.add('library_metadata_invalid'); metadataFailed = true; }
    }
    if (metadataFailed) incomplete = true;
    if (folders && typeof folders === 'object') for (const [key, entry] of Object.entries(folders)) if (/^\d+$/.test(key)) add(typeof entry === 'string' ? entry : entry?.path);
  }
  const detected = [];
  for (const library of libraries.values()) {
    const steamapps = path.join(library, 'steamapps'); if (!exists(steamapps)) continue;
    detected.push(library);
    let entries; try { entries = readdir(steamapps); } catch { unavailable('library_unreadable'); continue; }
    if (entries.length > 10000) unavailable('inventory_limit');
    for (const file of entries.slice(0, 10000).filter(name => /^appmanifest_\d+\.acf$/i.test(name))) {
      let text;
      try { text = readFile(path.join(steamapps, file)); } catch { unavailable('manifest_unreadable'); continue; }
      let game;
      try {
        game = installedGame(text, file, library);
      } catch (error) {
        if (['metadata_size', 'metadata_depth'].includes(error.message)) unavailable('inventory_limit');
        else diagnostics.add('manifest_invalid');
        continue;
      }
      try {
        if (exists(game.root)) { if (!games.has(game.appId)) games.set(game.appId, game); }
        else diagnostics.add('game_directory_missing');
      } catch { unavailable('library_unreadable'); }
    }
  }
  return { known: !incomplete, roots: [...new Set(verifiedRoots)], libraries: detected, games: [...games.values()], diagnostics: [...diagnostics] };
}
const excluded = /^(?:steam|steamwebhelper|steamservice|gameoverlayui|setup|unins\d*|uninstall|.*(?:crash|launcher|updater|redist|webhelper).*|UnityCrashHandler\d*|easyanticheat.*|beservice)\.exe$/i;
const gameRoots = new WeakMap();
function identifyGame(image, games = []) {
  const full = localRoot(image); if (!full || excluded.test(path.basename(full)) || path.extname(full).toLowerCase() !== '.exe') return null;
  const normalized = full.toLowerCase(); let found = null, longest = -1;
  for (const game of games) {
    if (!game || typeof game !== 'object') continue;
    let cached = gameRoots.get(game);
    if (!cached || cached.raw !== game.root) {
      const root = localRoot(game.root);
      cached = { raw: game.root, prefix: root ? `${root.toLowerCase()}\\` : null };
      gameRoots.set(game, cached);
    }
    // A normalização remove travessias; o separador impede aceitar pastas irmãs.
    if (cached.prefix && cached.prefix.length > longest && normalized.startsWith(cached.prefix)) {
      found = game; longest = cached.prefix.length;
    }
  }
  return found;
}
module.exports = { parseVdf, localRoot, within, installedGame, discoverSteam, identifyGame };
