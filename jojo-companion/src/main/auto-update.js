// Atualização automática no Windows: verifica as Releases, baixa a versão nova
// em segundo plano e troca o executável quando o PC fica parado (ou ao
// encerrar). Executável portátil: troca o próprio JoJoCompanion.exe. Instalado:
// roda o instalador novo em modo silencioso.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { UpdateChecker, portableSwapScript } from '../core/updater.js';

const FIRST_CHECK_MS = 60e3;
const CHECK_EVERY_MS = 6 * 3600e3;
const APPLY_IDLE_SEC = 120;

/** Tipo de instalação: 'portable' | 'installer' | null. */
export function detectMode({ app, env = process.env, platform = process.platform, exists = fs.existsSync }) {
  if (env.JOJO_TEST === '1' && env.JOJO_UPDATE_MODE) return env.JOJO_UPDATE_MODE;
  if (platform !== 'win32' || !app.isPackaged) return null;
  if (env.PORTABLE_EXECUTABLE_FILE) return 'portable';
  const dir = path.dirname(process.execPath);
  if (exists(path.join(dir, `Uninstall ${app.getName()}.exe`))) return 'installer';
  return null; // ZIP ou desenvolvimento: sem atualização automática
}

export function createAutoUpdater({ app, net, store, log, feed, onUpdated = () => {}, env = process.env }) {
  const mode = detectMode({ app, env });
  const dir = path.join(app.getPath('userData'), 'updates');
  const testBase = env.JOJO_TEST === '1' && env.JOJO_UPDATE_BASE ? env.JOJO_UPDATE_BASE : null;
  const checker = new UpdateChecker({
    fetch: (url, opts) => net.fetch(url, opts),
    owner: feed.owner,
    repo: feed.repo,
    current: app.getVersion(),
    mode,
    apiBase: testBase || 'https://api.github.com',
    userAgent: `JoJoCompanion/${app.getVersion()}`,
  });
  const state = { mode, status: mode ? 'idle' : 'disabled', version: null, file: null, error: null, lastCheck: 0 };
  let timer = null;
  let busy = false;

  // Depois de atualizar: avisa uma vez e limpa o script de troca.
  try {
    fs.rmSync(path.join(dir, 'trocar.cmd'), { force: true });
    const mark = path.join(app.getPath('userData'), 'last-version.txt');
    const prev = fs.existsSync(mark) ? fs.readFileSync(mark, 'utf8').trim() : null;
    if (prev && prev !== app.getVersion()) setTimeout(() => onUpdated(app.getVersion(), prev), 4000);
    fs.writeFileSync(mark, app.getVersion());
  } catch {
    /* sem disco: ignora */
  }

  async function download(found) {
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, found.asset.name);
    const tmp = `${dest}.download`;
    const res = await net.fetch(found.asset.url, { headers: { 'User-Agent': `JoJoCompanion/${app.getVersion()}`, Accept: 'application/octet-stream' } });
    if (!res.ok || !res.body) throw new Error(`download HTTP ${res.status}`);
    const hash = crypto.createHash('sha256');
    const out = fs.createWriteStream(tmp);
    let size = 0;
    try {
      for await (const chunk of res.body) {
        const buf = Buffer.from(chunk);
        size += buf.length;
        hash.update(buf);
        if (!out.write(buf)) await new Promise((r) => out.once('drain', r));
      }
    } finally {
      await new Promise((r) => out.end(r));
    }
    if (found.asset.size && size !== found.asset.size) throw new Error(`tamanho inesperado (${size} ≠ ${found.asset.size})`);
    if (found.asset.sha256 && hash.digest('hex') !== found.asset.sha256) throw new Error('hash SHA-256 não confere');
    fs.renameSync(tmp, dest);
    return dest;
  }

  async function check() {
    if (busy || !mode || !store.get().autoUpdate || state.status === 'ready') return state;
    busy = true;
    state.lastCheck = Date.now();
    try {
      const found = await checker.check();
      if (!found) {
        state.status = 'idle';
        state.error = null;
        return state;
      }
      state.status = 'downloading';
      state.version = found.version;
      log('info', `Atualização ${found.version} encontrada; baixando ${found.asset.name}.`);
      state.file = await download(found);
      state.status = 'ready';
      state.error = null;
      log('info', `Atualização ${found.version} pronta; aplica quando o PC ficar parado ou ao encerrar.`);
    } catch (e) {
      state.status = 'error';
      state.error = e.message;
      log('warn', `Atualização automática: ${e.message}`);
    } finally {
      busy = false;
    }
    return state;
  }

  /** Inicia o processo que troca/instala a versão nova (o app deve encerrar logo depois). */
  function launchApply({ relaunch = true } = {}) {
    if (state.status !== 'ready' || !state.file) return false;
    try {
      if (mode === 'portable') {
        const target = env.PORTABLE_EXECUTABLE_FILE;
        if (!target) return false;
        const script = path.join(dir, 'trocar.cmd');
        fs.writeFileSync(script, portableSwapScript({ newPath: state.file, targetPath: target }).replace(/^start .*$/m, relaunch ? '$&' : 'rem sem reabrir'));
        spawn('cmd.exe', ['/d', '/c', script], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
      } else if (mode === 'installer') {
        spawn(state.file, relaunch ? ['/S', '--force-run'] : ['/S'], { detached: true, stdio: 'ignore' }).unref();
      } else return false;
      state.status = 'applying';
      log('info', `Aplicando atualização ${state.version} (${mode}).`);
      return true;
    } catch (e) {
      state.status = 'error';
      state.error = e.message;
      log('warn', `Falha ao aplicar atualização: ${e.message}`);
      return false;
    }
  }

  return {
    state,
    check,
    /** Chamado com a ociosidade do sistema: aplica sem atrapalhar. */
    onIdle(idleSec, { busyNow = false } = {}) {
      if (state.status !== 'ready' || busyNow || idleSec < APPLY_IDLE_SEC) return false;
      return launchApply({ relaunch: true });
    },
    /** Ao encerrar: aplica sem reabrir. */
    onQuit() {
      return launchApply({ relaunch: false });
    },
    start() {
      if (!mode) {
        log('info', 'Atualização automática indisponível neste tipo de instalação.');
        return;
      }
      setTimeout(check, env.JOJO_TEST === '1' ? 0 : FIRST_CHECK_MS);
      timer = setInterval(check, CHECK_EVERY_MS);
    },
    stop() {
      clearInterval(timer);
    },
  };
}
