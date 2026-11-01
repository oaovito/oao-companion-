// Um arquivo confirmado e uma cópia anterior; uma gravação falha nunca vira sucesso.
import fs from 'node:fs';
import path from 'node:path';

export class AtomicState {
  constructor(file, { validate = x => x, defaults = () => ({}), log = () => {} } = {}) {
    this.file = file;
    this.validate = validate;
    this.defaults = defaults;
    this.log = log;
    this.recovered = false;
  }
  load() {
    for (const candidate of [this.file, `${this.file}.bak`]) {
      try {
        const data = this.validate(JSON.parse(fs.readFileSync(candidate, 'utf8')));
        this.recovered = candidate !== this.file;
        return data;
      } catch (e) {
        if (e.code !== 'ENOENT') this.log('warn', 'Estado local inválido; tentando cópia de segurança.');
      }
    }
    return this.defaults();
  }
  write(data) {
    const text = JSON.stringify(this.validate(data));
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    let fd;
    try {
      fd = fs.openSync(tmp, 'w', 0o600);
      fs.writeFileSync(fd, text, 'utf8');
      fs.fsyncSync(fd);
    } finally { if (fd != null) fs.closeSync(fd); }
    // Não substituir o backup bom por um arquivo corrompido após recuperação.
    if (fs.existsSync(this.file) && !this.recovered) {
      try { this.validate(JSON.parse(fs.readFileSync(this.file, 'utf8'))); fs.copyFileSync(this.file, `${this.file}.bak`); }
      catch { /* o backup válido permanece */ }
    }
    fs.renameSync(tmp, this.file);
    this.recovered = false;
    return true;
  }
}
