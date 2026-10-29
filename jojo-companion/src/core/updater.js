// Atualização automática: consulta a última versão publicada (Releases do
// GitHub), compara com a versão atual e escolhe o arquivo certo para o tipo de
// instalação. Puro: `fetch` é injetado; nada aqui toca disco ou processos.

/** "v1.2.3" | "1.2.3" → [1, 2, 3] (partes ausentes = 0). */
export function parseVersion(v) {
  const m = String(v || '').trim().replace(/^v/i, '').match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  return m ? [Number(m[1]), Number(m[2] || 0), Number(m[3] || 0)] : null;
}

/** `a` é mais nova que `b`? */
export function isNewer(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return false;
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] > y[i];
  }
  return false;
}

/**
 * Arquivo da release para o tipo de instalação:
 *   'portable'  → JoJoCompanion.exe (executável único)
 *   'installer' → JoJoCompanion-Setup-<versão>.exe (instalação por usuário)
 */
export function pickAsset(release, mode) {
  const assets = (release && Array.isArray(release.assets) ? release.assets : []).filter((a) => a && a.name && a.browser_download_url);
  const match = mode === 'portable' ? (n) => n === 'JoJoCompanion.exe' : mode === 'installer' ? (n) => /^JoJoCompanion-Setup-.*\.exe$/.test(n) : () => false;
  const a = assets.find((x) => match(x.name));
  if (!a) return null;
  const digest = typeof a.digest === 'string' && /^sha256:[0-9a-f]{64}$/i.test(a.digest) ? a.digest.slice(7).toLowerCase() : null;
  return { name: a.name, url: a.browser_download_url, size: Number(a.size) || null, sha256: digest };
}

export class UpdateChecker {
  /**
   * @param fetch função compatível com fetch
   * @param owner/repo origem das versões (Releases do GitHub)
   * @param current versão atual do app
   * @param mode 'portable' | 'installer' | null (sem atualização automática)
   */
  constructor({ fetch, owner, repo, current, mode, apiBase = 'https://api.github.com', userAgent = 'JoJoCompanion', timeoutMs = 15000 } = {}) {
    this.fetch = fetch;
    this.owner = owner;
    this.repo = repo;
    this.current = current;
    this.mode = mode;
    this.apiBase = apiBase.replace(/\/$/, '');
    this.userAgent = userAgent;
    this.timeoutMs = timeoutMs;
  }

  get enabled() {
    return !!(this.mode && this.owner && this.repo && this.fetch);
  }

  /** Retorna {version, asset, notes} se houver versão mais nova; senão null. */
  async check() {
    if (!this.enabled) return null;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let release;
    try {
      const res = await this.fetch(`${this.apiBase}/repos/${this.owner}/${this.repo}/releases/latest`, {
        signal: ctrl.signal,
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': this.userAgent },
      });
      if (res.status === 404) throw new Error('nenhuma versão publicada visível (repositório privado ou sem releases)');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      release = await res.json();
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'tempo esgotado' : e.message);
    } finally {
      clearTimeout(t);
    }
    if (!release || release.draft || release.prerelease) return null;
    const version = String(release.tag_name || '').replace(/^v/i, '');
    if (!isNewer(version, this.current)) return null;
    const asset = pickAsset(release, this.mode);
    if (!asset) return null;
    return { version, asset, notes: typeof release.body === 'string' ? release.body.slice(0, 2000) : '' };
  }
}

/**
 * Script (cmd do Windows) que troca o executável portátil depois que o app
 * fecha: tenta mover o novo por cima do antigo até o arquivo ser liberado e
 * abre a versão nova. Caminhos entre aspas; sem entrada de terceiros.
 */
export function portableSwapScript({ newPath, targetPath, tries = 60 }) {
  const q = (p) => `"${String(p).replace(/"/g, '')}"`;
  return [
    '@echo off',
    'setlocal',
    'set /a n=0',
    ':retry',
    'ping -n 2 127.0.0.1 >nul',
    `move /y ${q(newPath)} ${q(targetPath)} >nul 2>&1`,
    'if not errorlevel 1 goto ok',
    'set /a n+=1',
    `if %n% lss ${tries} goto retry`,
    'exit /b 1',
    ':ok',
    `start "" ${q(targetPath)}`,
    'del "%~f0"',
    '',
  ].join('\r\n');
}
