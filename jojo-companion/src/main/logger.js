// Log local simples (sem telemetria). Registra apenas eventos do app — nunca
// posição do mouse, cliques, teclas ou conteúdo de janelas.
import fs from 'node:fs';
import path from 'node:path';

const MAX_BYTES = 512 * 1024;

export function createLogger(dir, { echo = false } = {}) {
  let file = null;
  try {
    fs.mkdirSync(dir, { recursive: true });
    file = path.join(dir, 'jojo.log');
  } catch {
    file = null;
  }
  function rotate() {
    try {
      if (file && fs.existsSync(file) && fs.statSync(file).size > MAX_BYTES) {
        fs.renameSync(file, path.join(dir, 'jojo.old.log'));
      }
    } catch {
      /* ignora */
    }
  }
  rotate();
  const log = (level, msg) => {
    const line = `${new Date().toISOString()} [${level}] ${msg}\n`;
    if (echo) process.stdout.write(line);
    if (!file) return;
    try {
      fs.appendFileSync(file, line);
    } catch {
      /* ignora */
    }
  };
  log.file = file;
  log.rotate = rotate;
  return log;
}
