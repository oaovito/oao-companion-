import fs from 'node:fs';
import { AtomicState } from '../core/atomic-state.js';
import { requireWindows } from './windows-only.js';
export class CredentialError extends Error {
  constructor(code) { super(code); this.code = code; }
}
export class CredentialVault {
  constructor(file, safeStorage, platform = process.platform) {
    requireWindows(platform); this.file = file; this.safeStorage = safeStorage;
    this.disk = new AtomicState(file, { defaults: () => null, validate: x => {
      if (!x || x.version !== 1 || typeof x.encrypted !== 'string' || !/^[a-zA-Z0-9+/]+=*$/.test(x.encrypted) || x.encrypted.length > 65536) throw new CredentialError('format');
      return x;
    } });
  }
  available() { return this.safeStorage.isEncryptionAvailable(); }
  read() {
    if (!this.available()) throw new CredentialError('encryption');
    const data = this.disk.load(); if (!data) return null;
    try { const account = JSON.parse(this.safeStorage.decryptString(Buffer.from(data.encrypted, 'base64'))); if (!account?.username || !account?.password) throw new Error(); return account; }
    catch { throw new CredentialError('locked'); }
  }
  write(account) {
    if (!this.available()) throw new CredentialError('encryption');
    const encrypted = this.safeStorage.encryptString(JSON.stringify(account));
    if (!encrypted?.length) throw new CredentialError('encryption');
    this.disk.write({ version: 1, encrypted: encrypted.toString('base64') });
  }
  remove() { for (const suffix of ['', '.bak', '.tmp']) fs.rmSync(`${this.file}${suffix}`, { force: true }); }
}
