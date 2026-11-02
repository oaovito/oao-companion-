// Varredura limitada fora da thread da UI e do detector de foreground.
const { parentPort } = require('node:worker_threads');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { discoverSteam } = require('../core/steam-library.cjs');
parentPort.on('message', ({ roots = [] }) => {
  try {
    let registryAvailable = true;
    try {
      // Só .NET embutido: funciona no PowerShell 5.1 do Windows 11, sem módulos
      // herdados do pwsh nem perda de acentos na saída OEM de reg.exe.
      const script = `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); foreach ($entry in @(@('HKEY_CURRENT_USER\\Software\\Valve\\Steam','SteamPath'), @('HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Valve\\Steam','InstallPath'), @('HKEY_LOCAL_MACHINE\\SOFTWARE\\Valve\\Steam','InstallPath'))) { try { $value = [Microsoft.Win32.Registry]::GetValue($entry[0], $entry[1], $null); if ($value) { [Console]::WriteLine([Environment]::ExpandEnvironmentVariables([string]$value)) } } catch {} }`;
      const output = execFileSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', timeout: 5000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
      roots.push(...output.split(/[\r\n]+/).map(value => value.trim()).filter(Boolean));
    } catch { registryAvailable = false; }
    for (const base of [process.env['ProgramFiles(x86)'], process.env.ProgramFiles]) if (base) roots.push(path.join(base, 'Steam'));
    const inventory = discoverSteam({ roots, exists: file => { try { fs.statSync(file); return true; } catch (e) { if (['ENOENT', 'ENOTDIR'].includes(e.code)) return false; throw e; } }, readdir: p => fs.readdirSync(p), readFile: file => {
      if (fs.statSync(file).size > 2097152) throw new Error('metadata_size'); return fs.readFileSync(file, 'utf8');
    } });
    if (!registryAvailable && !inventory.roots.length) parentPort.postMessage({ ok: false, reason: 'registry_unavailable' });
    else { if (!registryAvailable) inventory.diagnostics.push('registry_unavailable'); parentPort.postMessage({ ok: true, inventory }); }
  } catch { parentPort.postMessage({ ok: false, reason: 'scan_failed' }); }
});
