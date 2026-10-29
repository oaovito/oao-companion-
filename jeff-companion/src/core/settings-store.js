// Persistência das configurações em JSON com escrita atômica e recuperação
// de arquivo inválido (o arquivo ruim é preservado como backup).
import fs from 'node:fs';
import path from 'node:path';
import { sanitize, applyPatch, DEFAULTS } from './settings-schema.js';

export class SettingsStore {
  constructor(dir, { fileName = 'settings.json', log = () => {} } = {}) {
    this.dir = dir;
    this.file = path.join(dir, fileName);
    this.log = log;
    this.settings = { ...DEFAULTS };
    this.listeners = [];
    this._timer = null;
    this.loadIssues = [];
  }

  load() {
    let raw = null;
    try {
      raw = fs.readFileSync(this.file, 'utf8');
    } catch (e) {
      if (e.code !== 'ENOENT') this.log('warn', `Falha ao ler configurações: ${e.message}`);
      this.settings = { ...DEFAULTS };
      return this.settings;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      this._backupInvalid(raw, 'json inválido');
      this.settings = { ...DEFAULTS };
      this.loadIssues = ['arquivo inválido; padrões restaurados'];
      this.saveNow();
      return this.settings;
    }
    const { settings, issues } = sanitize(parsed);
    this.settings = settings;
    this.loadIssues = issues;
    if (issues.length) {
      this.log('warn', `Campos inválidos corrigidos: ${issues.join(', ')}`);
      this._backupInvalid(raw, 'campos inválidos');
      this.saveNow();
    }
    return this.settings;
  }

  _backupInvalid(raw, why) {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const bak = path.join(this.dir, `settings.invalid-${Date.now()}.json`);
      fs.writeFileSync(bak, raw);
      this.log('warn', `Configurações (${why}) preservadas em ${bak}`);
    } catch (e) {
      this.log('error', `Não foi possível salvar backup: ${e.message}`);
    }
  }

  get() {
    return this.settings;
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  /** Atualiza (validando) e agenda gravação. Retorna as chaves alteradas. */
  update(patch, { silent = false, debounceMs = 400 } = {}) {
    const prev = this.settings;
    const { settings } = applyPatch(prev, patch);
    const changed = Object.keys(settings).filter((k) => JSON.stringify(settings[k]) !== JSON.stringify(prev[k]));
    if (!changed.length) return [];
    this.settings = settings;
    this.scheduleSave(debounceMs);
    if (!silent) for (const l of this.listeners) l(settings, changed, prev);
    return changed;
  }

  reset() {
    const keep = { position: this.settings.position };
    const prev = this.settings;
    this.settings = { ...DEFAULTS, ...keep };
    const changed = Object.keys(this.settings).filter((k) => JSON.stringify(this.settings[k]) !== JSON.stringify(prev[k]));
    this.saveNow();
    for (const l of this.listeners) l(this.settings, changed, prev);
    return changed;
  }

  scheduleSave(ms = 400) {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.saveNow(), ms);
    if (this._timer.unref) this._timer.unref();
  }

  saveNow() {
    clearTimeout(this._timer);
    this._timer = null;
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.settings, null, 2));
      fs.renameSync(tmp, this.file);
      return true;
    } catch (e) {
      this.log('error', `Falha ao salvar configurações: ${e.message}`);
      return false;
    }
  }

  flush() {
    if (this._timer) this.saveNow();
  }
}
