// Registro central de comandos e menu "/": lista completa, com descrição curta,
// rolagem e filtro enquanto ela digita, nas duas telas (chat do pet e Central).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMANDS, commandMenu, parseCommand } from '../../src/core/conversations.js';
import { filterCommands } from '../../src/renderer/shared/command-filter.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const MENU = commandMenu({ petVisible: true });

test('registro: cada comando tem id, nome, descrição curta e uso; nomes não se repetem', () => {
  const nomes = COMMANDS.flatMap((c) => [c.cmd, ...c.aliases]);
  assert.equal(new Set(nomes).size, nomes.length, 'nome ou apelido repetido');
  assert.equal(new Set(COMMANDS.map((c) => c.id)).size, COMMANDS.length, 'id repetido');
  for (const c of COMMANDS) {
    assert.match(c.cmd, /^\/[a-z-]+$/, c.cmd);
    assert.ok(c.label && c.hint, c.id);
    assert.ok(c.desc && c.desc.length <= 40, `${c.id}: descrição curta (${c.desc})`);
    for (const n of [c.cmd, ...c.aliases]) assert.equal(parseCommand(`${n} algo`), c.id, n);
  }
  assert.equal(parseCommand('/naoexiste'), 'unknown');
  assert.equal(parseCommand('oi'), null);
});

test('menu: mostra todos os comandos do registro (menos os de compatibilidade), inclusive os que antes ficavam de fora', () => {
  assert.deepEqual(MENU.map((c) => c.cmd), COMMANDS.filter((c) => !c.oculto).map((c) => c.cmd));
  for (const cmd of ['/colecao', '/revisar', '/resumir', '/tutorial', '/discord', '/lembrete']) assert.ok(MENU.some((c) => c.cmd === cmd), cmd);
  assert.equal(MENU.some((c) => c.cmd === '/nova'), false);
  assert.ok(MENU.every((c) => c.desc), 'todo item do menu tem descrição curta');
  assert.equal(commandMenu({ petVisible: false })[0].label, 'Wake Pet');
});

test('filtro: "/" mostra tudo; filtra por nome, apelido, título e descrição enquanto ela digita', () => {
  assert.equal(filterCommands(MENU, '/').length, MENU.length);
  assert.equal(filterCommands(MENU, '  /').length, MENU.length);
  assert.deepEqual(filterCommands(MENU, '/tr').map((c) => c.cmd).slice(0, 2), ['/trabalho', '/treino']);
  assert.equal(filterCommands(MENU, '/notas')[0].cmd, '/nota', 'apelido acha o comando');
  assert.equal(filterCommands(MENU, '/ajuda')[0].cmd, '/tutorial');
  assert.ok(filterCommands(MENU, '/agua').some((c) => c.cmd === '/lembrete'), 'acha pela descrição');
  assert.ok(filterCommands(MENU, '/ÁGUA').some((c) => c.cmd === '/lembrete'), 'sem diferença de acento e maiúscula');
  assert.ok(filterCommands(MENU, '/discord').some((c) => c.cmd === '/discord'));
  assert.deepEqual(filterCommands(MENU, '/zzzz'), []);
  assert.deepEqual(filterCommands(MENU, 'oi'), []);
  assert.deepEqual(filterCommands(MENU, '/foco 25').map((c) => c.cmd), ['/foco'], 'com argumento, só o comando digitado');
});

test('telas: as duas usam o filtro do registro, mostram a descrição curta e têm rolagem', () => {
  const overlay = read('src/renderer/overlay/overlay.js');
  const app = read('src/renderer/app/app.js');
  for (const js of [overlay, app]) {
    assert.match(js, /import \{ filterCommands \} from '\.\.\/shared\/command-filter\.js'/);
    assert.match(js, /filterCommands\(/);
    assert.match(js, /scrollIntoView\(\{ block: 'nearest' \}\)/);
    assert.match(js, /c\.desc/);
  }
  assert.doesNotMatch(overlay, /c\.cmd\.startsWith\(typed\)/, 'o filtro antigo só por prefixo saiu');
  const css = read('src/renderer/overlay/overlay.css');
  const bloco = css.slice(css.indexOf('#cmdMenu {'), css.indexOf('}', css.indexOf('#cmdMenu {')));
  assert.match(bloco, /max-height: \d+px/);
  assert.match(bloco, /overflow-y: auto/);
  assert.match(read('src/renderer/app/app.css'), /\.cmd-menu \{[^}]*max-height:[^}]*overflow-y: auto/);
  assert.match(read('src/main/main.js'), /commands: commandMenu\(/);
});
