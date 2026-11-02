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
  const found = discoverSteam(fixture()); assert.equal(found.known, true); assert.equal(found.roots[0], root); assert.equal(found.libraries.length, 2);
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
test('Steam: identificação normaliza imagem e raiz, preserva contenção e escolhe instalação mais específica', () => {
  const broad = { appId: '1', root: 'D:/SteamLibrary/steamapps/common/./Game/' };
  const nested = { appId: '2', root: 'd:\\SteamLibrary\\steamapps\\common\\Game\\unused\\..\\Nested' };
  const games = [broad, nested];
  assert.equal(identifyGame('D:\\STEAMLIBRARY\\steamapps\\common\\Game\\Nested\\bin\\..\\Game.exe', games), nested);
  assert.equal(identifyGame('D:\\SteamLibrary\\steamapps\\common\\Game\\Other.exe', games), broad);
  for (const image of ['D:\\SteamLibrary\\steamapps\\common\\GameFake\\Game.exe', 'D:\\SteamLibrary\\steamapps\\common\\Game\\..\\Other\\Game.exe', 'C:\\SteamLibrary\\steamapps\\common\\Game\\Game.exe', 'D:Game\\Game.exe', '\\\\server\\Game\\Game.exe']) assert.equal(identifyGame(image, games), null, image);
  for (const root of ['Game', 'D:Game', '\\\\server\\Game']) assert.equal(identifyGame('D:\\Game\\Game.exe', [{ appId: '3', root }]), null, root);
  assert.equal(identifyGame('D:\\SteamLibrary\\steamapps\\common\\Game\\Nested\\Launcher.exe', games), null);
});
test('Steam: cache da raiz acompanha mudança do mesmo objeto sem herdar identificação antiga', () => {
  const game = { appId: '1', root: 'D:\\Games\\Original' };
  assert.equal(identifyGame('D:\\Games\\Original\\Game.exe', [game]), game);
  game.root = 'E:\\Games\\Moved';
  assert.equal(identifyGame('D:\\Games\\Original\\Game.exe', [game]), null);
  assert.equal(identifyGame('E:\\Games\\Moved\\Game.exe', [game]), game);
  game.root = '..\\Original';
  assert.equal(identifyGame('E:\\Games\\Moved\\Game.exe', [game]), null);
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

test('Steam: biblioteca sem permissão e leitura parcial não afirmam inventário completo', () => {
  const denied = fixture(), readdir = denied.readdir;
  denied.readdir = p => { if (p === `${secondary}\\steamapps`) throw Object.assign(new Error('negado'), { code: 'EACCES' }); return readdir(p); };
  const found = discoverSteam(denied);
  assert.equal(found.known, false); assert.deepEqual(found.games.map(g => g.appId), ['123']);
  assert.ok(found.diagnostics.includes('library_unreadable'));
  const unreadable = fixture(), read = unreadable.readFile;
  unreadable.readFile = p => { if (p.endsWith('appmanifest_262060.acf')) throw new Error('EIO'); return read(p); };
  assert.equal(discoverSteam(unreadable).known, false);
  assert.ok(discoverSteam(unreadable).diagnostics.includes('manifest_unreadable'));
});

test('Steam: metadados de bibliotecas inválidos e limites não se confundem com zero jogos', () => {
  for (const metadata of ['"libraryfolders" {', '"libraryfolders" "inválido"', '"libraryfolders" { "1" { "path" "relativo" } }']) {
    const broken = fixture(), read = broken.readFile;
    broken.readFile = p => p.endsWith('libraryfolders.vdf') ? metadata : read(p);
    const found = discoverSteam(broken);
    assert.equal(found.known, false); assert.ok(found.diagnostics.includes('library_metadata_invalid'));
  }
  const fallback = fixture(), exists = fallback.exists, read = fallback.readFile;
  fallback.exists = p => p === `${root}\\config\\libraryfolders.vdf` || exists(p);
  fallback.readFile = p => p === `${root}\\config\\libraryfolders.vdf` ? '"libraryfolders" {}' : p.endsWith('libraryfolders.vdf') ? '"libraryfolders" {' : read(p);
  assert.equal(discoverSteam(fallback).known, false, 'fallback legado não comprova completude quando o índice atual falhou');
  const limited = fixture(), readdir = limited.readdir;
  limited.readdir = p => [...readdir(p), ...Array(10001).fill('temporário')];
  const found = discoverSteam(limited);
  assert.equal(found.known, false); assert.ok(found.diagnostics.includes('inventory_limit'));
  const empty = fixture(); empty.readdir = () => [];
  assert.equal(discoverSteam(empty).known, true); assert.equal(discoverSteam(empty).games.length, 0);
  const absent = fixture(); absent.roots = [];
  assert.equal(discoverSteam(absent).known, true); assert.equal(discoverSteam(absent).games.length, 0);
  assert.equal(discoverSteam(fixture({ broken: true })).known, true, 'manifesto lido e inválido não confirma uma instalação');
});

test('Steam serviço: falha parcial preserva inventário como desconhecido, pausa o detector e recupera', async () => {
  const inventory = discoverSteam(fixture()), sent = []; let mode = 'ok';
  const service = createSteamService({ getDetector: () => ({ steamRoots: async () => [], setGameInventory: value => sent.push(value) }), scan: async () => {
    if (mode === 'error') throw new Error('EACCES');
    return mode === 'partial' ? { ...inventory, known: false, games: [], diagnostics: ['library_unreadable'] } : inventory;
  } });
  assert.equal(service.inventory().known, false, 'detector reiniciado antes da leitura começa desconhecido');
  await service.refresh(); service.observe({ known: true, steamRunning: true, games: [{ appId: '262060', active: true }] });
  assert.equal(sent.at(-1).known, true); assert.equal(service.snapshot().count, 2);
  mode = 'partial'; await service.refresh();
  const failed = service.snapshot();
  assert.equal(failed.status, 'unavailable'); assert.equal(failed.reason, 'inventory_unavailable'); assert.equal(failed.count, 2);
  assert.ok(failed.games.every(game => game.state === 'unknown')); assert.ok(failed.diagnostics.includes('library_unreadable'));
  assert.equal(sent.at(-1).known, false); assert.equal(sent.at(-1).games.length, 2, 'parcial vazio não apaga jogos conhecidos');
  assert.equal(service.inventory().known, false, 'reinício do detector preserva o bloqueio de atividade/XP');
  mode = 'error'; await service.refresh(); assert.equal(sent.at(-1).known, false); assert.equal(service.snapshot().count, 2);
  mode = 'ok'; await service.refresh();
  assert.equal(sent.at(-1).known, true); assert.equal(service.inventory().known, true);
  assert.equal(service.snapshot().status, 'unavailable'); assert.equal(service.snapshot().reason, 'inventory_changed');
  assert.ok(service.snapshot().games.every(game => game.state === 'unknown'), 'recuperação não revive foreground de antes da falha');
  service.observe({ known: true, steamRunning: false, games: [] });
  assert.equal(service.snapshot().status, 'closed'); assert.ok(service.snapshot().games.every(game => game.state === 'installed'));
  assert.deepEqual(service.snapshot().diagnostics, []);
  service.dispose();
});
