// Presença permanente: o JoJo não fica fechado sem ela querer.
// - Vigia: processo mínimo que reabre o JoJo se ele encerrar sem ser pela bandeja
//   (crash, erro, processo morto) e confere a volta depois de uma atualização.
// - Atalho na área de trabalho para abrir na mão, caso algo dê muito errado.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { AtomicState } from '../core/atomic-state.js';
import { SHORTCUT_NAMES, JOJO_APP_ID, migrateShortcuts } from '../core/shortcuts.js';

const VIGIA_SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'vigia.cjs');

/** O que abrir para trazer o JoJo de volta (o portátil reabre pelo próprio .exe). */
export function alvoDoApp({ env = process.env, execPath = process.execPath } = {}) {
  return env.PORTABLE_EXECUTABLE_FILE || execPath;
}

export function criarPresenca({ app, log, env = process.env, platform = process.platform }) {
  const dir = app.getPath('userData');
  const marcador = path.join(dir, 'saida.json');
  const historico = path.join(dir, 'reaberturas.json');
  // Só no app instalado/portátil do Windows (ou forçado nos testes).
  const ativo = env.JOJO_VIGIA === '1' || (env.JOJO_VIGIA !== '0' && platform === 'win32' && app.isPackaged && env.JOJO_TEST !== '1');

  return {
    ativo,
    /** Ao abrir: limpa o marcador da sessão anterior e arma o vigia deste processo. */
    armar({ alvo = alvoDoApp({ env }), args = [], esperas = {} } = {}) {
      try {
        fs.rmSync(marcador, { force: true });
      } catch {
        /* ignora */
      }
      if (!ativo) return null;
      try {
        // Copia o vigia para fora do pacote: roda sem depender do .asar.
        const script = path.join(dir, 'vigia.cjs');
        fs.writeFileSync(script, fs.readFileSync(VIGIA_SRC));
        const cfgFile = path.join(dir, 'vigia.json');
        fs.writeFileSync(cfgFile, JSON.stringify({ pid: process.pid, alvo, args, marcador, historico, log: log.file, ...esperas }));
        const p = spawn(process.execPath, ['--max-old-space-size=16', script, cfgFile], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
          env: { ...env, ELECTRON_RUN_AS_NODE: '1' },
        });
        p.unref();
        log('info', `Vigia armado (pid ${p.pid}).`);
        return p.pid;
      } catch (e) {
        log('warn', `Não foi possível armar o vigia: ${e.message}`);
        return null;
      }
    },
    /** Encerramento de propósito: 'manual' | 'atualizacao' | 'desligamento'. */
    marcarSaida(motivo) {
      try {
        fs.writeFileSync(marcador, JSON.stringify({ pid: process.pid, motivo, t: Date.now() }));
      } catch {
        /* ignora */
      }
    },
  };
}

/** Atalho "JoJo Companion" na área de trabalho (cria ou corrige; só no Windows empacotado). */
export function garantirAtalho({ app, shell, log, env = process.env, platform = process.platform, preference = 'auto' }) {
  if (platform !== 'win32' || !app.isPackaged || env.JOJO_TEST === '1') return false;
  try {
    const realLocal = file => {
      if (!/^[a-z]:[\\/]/i.test(file || '')) return file;
      try { return fs.realpathSync.native(file); } catch { return file; }
    };
    const alvo = realLocal(alvoDoApp({ env }));
    const desktop = app.getPath('desktop');
    const disk = new AtomicState(path.join(app.getPath('userData'), 'desktop-shortcut.json'), { defaults: () => ({}), log });
    const dirs = [...new Set([desktop, ...(env.PUBLIC ? [path.join(env.PUBLIC, 'Desktop')] : [])])];
    const entries = [];
    for (const dir of dirs) {
      let names = []; try { names = fs.readdirSync(dir).filter(n => SHORTCUT_NAMES.some(s => s.toLowerCase() === n.toLowerCase())); } catch { /* público pode não ser acessível */ }
      if (!names.includes(SHORTCUT_NAMES[0])) names.push(SHORTCUT_NAMES[0]);
      for (const name of names) {
        const file = path.join(dir, name);
        try { const link = shell.readShortcutLink(file); entries.push({ path: file, name, link: { ...link, target: realLocal(link.target), icon: link.icon ? realLocal(link.icon) : link.icon } }); }
        catch { if (fs.existsSync(file)) entries.push({ path: file, name, link: null }); }
      }
    }
    const report = migrateShortcuts({ entries, canonical: path.join(desktop, SHORTCUT_NAMES[0]), target: alvo,
      mode: env.PORTABLE_EXECUTABLE_FILE ? 'portable' : 'installer', preference, version: app.getVersion?.() || '', previous: disk.load(),
      remove: file => fs.unlinkSync(file),
      write: (file, operation) => shell.writeShortcutLink(file, operation, { target: alvo, cwd: path.dirname(alvo), description: 'Abrir o JoJo', icon: alvo, iconIndex: 0, appUserModelId: JOJO_APP_ID }) });
    disk.write(report.state);
    log(report.ready ? 'info' : 'warn', report.present ? `Atalho na área de trabalho ${report.ready ? 'pronto' : 'com duplicata protegida por permissão'}; ${report.removed.length} obsoleto(s) removido(s).` : report.blocked.length ? 'Atalho preservado: arquivo existente protegido ou de propriedade não comprovada.' : 'Atalho na área de trabalho: respeitada a preferência de instalação/remoção.');
    return report.ready;
  } catch (e) {
    log('warn', `Atalho na área de trabalho: ${e.message}`);
    return false;
  }
}
