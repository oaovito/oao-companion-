// Varredura limitada fora da thread da UI e do detector de foreground.
const { parentPort } = require('node:worker_threads');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { discoverSteam } = require('../core/steam-library.cjs');
parentPort.on('message', ({ roots = [] }) => {
  try {
    for (const [key, value] of [['HKCU\\Software\\Valve\\Steam', 'SteamPath'], ['HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'], ['HKLM\\SOFTWARE\\Valve\\Steam', 'InstallPath']]) {
      try {
        const data = execFileSync('reg.exe', ['query', key, '/v', value], { encoding: 'utf8', timeout: 1500, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
        const match = data.match(/REG_(?:EXPAND_)?SZ\s+([^\r\n]+)/i); if (match) roots.push(match[1].trim().replace(/%([^%]+)%/g, (_, k) => process.env[k] || `%${k}%`));
      } catch { /* ausência da chave é normal; outros locais continuam */ }
    }
    for (const base of [process.env['ProgramFiles(x86)'], process.env.ProgramFiles]) if (base) roots.push(path.join(base, 'Steam'));
    const inventory = discoverSteam({ roots, exists: file => { try { fs.statSync(file); return true; } catch (e) { if (['ENOENT', 'ENOTDIR'].includes(e.code)) return false; throw e; } }, readdir: p => fs.readdirSync(p), readFile: file => {
      if (fs.statSync(file).size > 2097152) throw new Error('metadata_size'); return fs.readFileSync(file, 'utf8');
    } });
    parentPort.postMessage({ ok: true, inventory });
  } catch { parentPort.postMessage({ ok: false, reason: 'scan_failed' }); }
});
