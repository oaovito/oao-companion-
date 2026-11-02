import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createSteamService } from '../../src/main/steam-service.js';
const { parseVdf, discoverSteam, identifyGame } = createRequire(import.meta.url)('../../src/core/steam-library.cjs');
const root = 'D:\\Apps\\Steam', secondary = 'E:\\Jogos da Manú';
function fixture({ broken = false } = {}) {
  const files = new Map([
    [`${root}\\steam.exe`, ''], [`${root}\\steamapps\\libraryfolders.vdf`, String.raw`"libraryfolders" { "0" { "path" "D:\\Apps\\Steam" } "1" { "path" "E:\\Jogos da Manú" "apps" { "262060" "1" } } }`],
    [`${secondary}\\steamapps\\appmanifest_262060.acf`, broken ? '"AppState" {' : '"AppState" { "appid" "262060" "installdir" "Darkest Dungeon" "name" "Darkest Dungeon" }'],
    [`${root}\\steamapps\\appmanifest_123.acf`, '"AppState" { "appid" "123" "installdir" "Outro Jogo" "name" "Outro Jogo" }'],
  ]);
  const dirs = new Set([`${root}\\steamapps`, `${secondary}\\steamapps`, `${secondary}\\steamapps\\common\\Darkest Dungeon`, `${root}\\steamapps\\common\\Outro Jogo`]);
  return { roots: [root], exists: p => files.has(p) || dirs.has(p), readFile: p => { if (!files.has(p)) throw new Error('missing'); return files.get(p); }, readdir: p => [...files.keys()].filter(f => f.startsWith(`${p}\\`) && !f.slice(p.length + 1).includes('\\')).map(f => f.slice(p.length + 1)) };
}
test('Steam: biblioteca customizada e secundária localizadas pelos metadados, sem disco C ou autenticação', () => {
  const found = discoverSteam(fixture()); assert.equal(found.roots[0], root); assert.equal(found.libraries.length, 2);
  assert.deepEqual(found.games.map(g => g.appId).sort(), ['123', '262060']);
  assert.equal(found.games.find(g => g.appId === '262060').root, `${secondary}\\steamapps\\common\\Darkest Dungeon`);
});
test('Steam: VDF legado, comentário, aspas escapadas, sintaxe e limites; manifesto inválido não inventa jogo', () => {
  assert.equal(parseVdf('"LibraryFolders" { // teste\n "1" "E:\\\\Biblioteca" }').libraryfolders['1'], 'E:\\Biblioteca');
  for (const text of ['"AppState" {', '"x" "a" "x" "b"', '}'.repeat(30), 'a'.repeat(2097153)]) assert.throws(() => parseVdf(text));
  const found = discoverSteam(fixture({ broken: true })); assert.equal(found.games.length, 1); assert.ok(found.diagnostics.includes('manifest_invalid'));
  const fake = fixture(); const read = fake.readFile; fake.readFile = p => read(p).replace('"Darkest Dungeon" "name"', '"..\\\\Escape" "name"');
  assert.equal(discoverSteam(fake).games.length, 1);
});
test('Steam: processo só pertence ao jogo pelo caminho validado, não pelo título, nome semelhante ou launcher', () => {
  const games = discoverSteam(fixture()).games;
  const game = games.find(g => g.appId === '262060');
  assert.equal(identifyGame(`${game.root}\\bin\\Darkest.exe`, games)?.appId, '262060');
  assert.equal(identifyGame(`${game.root}\\Darkest.exe`.toLowerCase(), games)?.appId, '262060');
  for (const image of [`${game.root}Fake\\Darkest.exe`, 'C:\\Temp\\Darkest.exe', `${game.root}\\steamwebhelper.exe`, `${game.root}\\Launcher.exe`, `${game.root}\\crash_reporter.exe`]) assert.equal(identifyGame(image, games), null, image);
});
test('Steam serviço: instalada/fechada, aberta, jogo em background, foreground e erro são estados distintos sem caminhos públicos', async () => {
  let fail = false, scans = 0; const inventory = discoverSteam(fixture());
  const service = createSteamService({ getDetector: () => ({ steamRoots: async () => [], setGameInventory() {} }), scan: async () => { scans++; if (fail) throw new Error('E:\\Dados privados'); return inventory; } });
  await Promise.all([service.refresh(), service.refresh()]); assert.equal(scans, 1);
  service.observe({ known: true, checkedAt: 100, steamRunning: false, games: [] }); assert.equal(service.snapshot().status, 'closed'); assert.equal(service.snapshot().installed, true);
  service.observe({ known: true, steamRunning: true, games: [{ appId: '262060', active: false }] });
  assert.equal(service.snapshot().status, 'open'); assert.equal(service.snapshot().games.find(g => g.appId === '262060').state, 'background');
  service.observe({ known: true, steamRunning: true, games: [{ appId: '262060', active: false }, { appId: '262060', active: true }] }); assert.equal(service.snapshot().games.find(g => g.appId === '262060').state, 'active');
  service.observe({ known: false }); assert.equal(service.snapshot().status, 'unavailable'); assert.equal(service.snapshot().games[0].state, 'unknown');
  fail = true; await service.refresh(); assert.equal(service.snapshot().status, 'unavailable'); assert.ok(!JSON.stringify(service.snapshot()).includes('E:\\'));
  service.dispose();
});

test('Steam: títulos com chaves e aspas são texto, não estrutura VDF', () => {
  assert.equal(parseVdf('"name" "{Jogo}"').name, '{Jogo}');
  assert.equal(parseVdf('"name" "}"').name, '}');
});
test('Steam: download incompleto não vira instalação confirmada', () => {
  const fake = fixture(), read = fake.readFile;
  fake.readFile = p => read(p).replace('"appid" "262060"', '"appid" "262060" "StateFlags" "1026"');
  assert.deepEqual(discoverSteam(fake).games.map(g => g.appId), ['123']);
});
