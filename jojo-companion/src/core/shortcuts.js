// Migração conservadora: só nomes padrão e metadados comprovadamente do JoJo.
export const JOJO_APP_ID = 'com.jojocompanion.app';
export const SHORTCUT_NAMES = ['JoJo Companion.lnk', 'JoJoCompanion.lnk', 'JoJo Companion (1).lnk', 'JoJo Companion (2).lnk'];
export const isStandardShortcutName = name => /^(?:JoJo Companion|JoJoCompanion)(?: \([1-9][0-9]{0,3}\))?\.lnk$/i.test(String(name || ''));
const normalize = value => String(value || '').replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
const basename = value => normalize(value).split('\\').at(-1);
export function shortcutOwned(link, { name, target, owned = [] } = {}) {
  if (!link || !isStandardShortcutName(name)) return false;
  const exe = basename(link.target);
  if (!['jojocompanion.exe', 'jojo companion.exe'].includes(exe)) return false;
  if (String(link.args || '').trim()) return false;
  if (link.iconIndex && link.iconIndex !== 0) return false;
  if (link.icon && normalize(link.icon) !== normalize(link.target) && !['jojocompanion.exe', 'jojo companion.exe'].includes(basename(link.icon))) return false;
  if (link.description && !['Abrir o JoJo', 'JoJo Companion', 'JoJo Companion: companion de desktop com o JoJo, um tubarão fisiculturista.'].includes(link.description)) return false;
  return link.appUserModelId === JOJO_APP_ID || (normalize(link.target) === normalize(target) && (link.description === 'Abrir o JoJo' || name === SHORTCUT_NAMES[0])) || owned.some(p => normalize(p) === normalize(link.path));
}
export function migrateShortcuts({ entries, canonical, target, mode = 'portable', preference = 'auto', version = '', previous = {}, write, remove }) {
  const report = { ready: true, present: false, removed: [], preserved: [], blocked: [], canonical: null, state: { ...previous, seen: !!previous.seen, version } };
  const owned = entries.filter(e => shortcutOwned({ ...e.link, path: e.path }, { name: e.name, target, owned: previous.owned || [] }));
  report.preserved = entries.filter(e => !owned.includes(e)).map(e => e.path);
  if (preference === 'hide') {
    for (const e of owned) { try { remove(e.path); report.removed.push(e.path); } catch { report.blocked.push(e.path); } }
    report.ready = !report.blocked.length; report.state.enabled = false; report.state.seen = true; report.state.owned = []; return report;
  }
  const existing = owned.find(e => normalize(e.path) === normalize(canonical)) || owned.find(e => normalize(e.name) === normalize(SHORTCUT_NAMES[0])) || owned[0];
  if (!existing && preference !== 'show' && (mode === 'installer' || previous.seen)) { report.state.enabled = false; report.state.seen = true; return report; }
  let destination = normalize(existing?.name) === normalize(SHORTCUT_NAMES[0]) ? existing.path : canonical;
  const occupied = entries.find(e => normalize(e.path) === normalize(destination) && !owned.includes(e));
  if (occupied) { report.ready = false; report.blocked.push(destination); return report; }
  const selected = owned.find(e => normalize(e.path) === normalize(destination));
  if (!selected || previous.version !== version || normalize(selected.link.target) !== normalize(target) || (selected.link.icon && normalize(selected.link.icon) !== normalize(target))) {
    if (!write(destination, selected ? 'replace' : 'create')) { report.ready = false; report.blocked.push(destination); return report; }
  }
  report.present = true; report.canonical = destination;
  for (const entry of owned) if (normalize(entry.path) !== normalize(destination)) {
    try { remove(entry.path); report.removed.push(entry.path); }
    catch { report.ready = false; report.blocked.push(entry.path); }
  }
  report.state.seen = true; report.state.enabled = true; report.state.target = target; report.state.owned = [destination];
  return report;
}
