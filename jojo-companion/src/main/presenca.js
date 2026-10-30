// Presença permanente: o JoJo não fica fechado sem ela querer.
// - Vigia: processo mínimo que reabre o JoJo se ele encerrar sem ser pela bandeja
//   (crash, erro, processo morto) e confere a volta depois de uma atualização.
// - Atalho na área de trabalho para abrir na mão, caso algo dê muito errado.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
export function garantirAtalho({ app, shell, log, env = process.env, platform = process.platform }) {
  if (platform !== 'win32' || !app.isPackaged || env.JOJO_TEST === '1') return false;
  try {
    const alvo = alvoDoApp({ env });
    const lnk = path.join(app.getPath('desktop'), 'JoJo Companion.lnk');
    let atual = null;
    try {
      atual = shell.readShortcutLink(lnk);
    } catch {
      atual = null;
    }
    if (atual && atual.target && atual.target.toLowerCase() === alvo.toLowerCase()) return true;
    const ok = shell.writeShortcutLink(lnk, atual ? 'replace' : 'create', {
      target: alvo,
      cwd: path.dirname(alvo),
      description: 'Abrir o JoJo',
      icon: alvo,
      iconIndex: 0,
      appUserModelId: 'com.jojocompanion.app',
    });
    log('info', `Atalho na área de trabalho ${ok ? 'pronto' : 'não criado'}: ${lnk}`);
    return ok;
  } catch (e) {
    log('warn', `Atalho na área de trabalho: ${e.message}`);
    return false;
  }
}
