// Pedido de 14/11/2026: o painel do aquário ao lado do JoJo não pode sair cortado,
// e as seções "Lista de Tarefas" e "Bloqueio do Discord" não aparecem para a
// usuária nas Configurações, mantendo os valores salvos. Medidas reais no
// E2E do Windows (test/e2e/needs.windows.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ler = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('Configurações: Lista de Tarefas e Bloqueio do Discord ocultas, com os campos ainda carregados', () => {
  const html = ler('src/renderer/settings/index.html');
  assert.match(html, /<fieldset id="todoSettings" hidden>/);
  assert.match(html, /<fieldset id="discordBlock" hidden>/);
  assert.match(html, /<fieldset id="personality" hidden>/, 'mesmo padrão das seções já ocultas');
  assert.match(html, /name="discordBloqueio"/, 'a chave continua no formulário: o valor salvo não se perde');
  const js = ler('src/renderer/settings/settings.js');
  assert.doesNotMatch(js, /discordBlock'\)[\s\S]{0,40}hidden = /, 'nada reexibe a seção do Discord');
  assert.doesNotMatch(js, /todoSettings'\)[\s\S]{0,40}hidden = /);
  const tut = JSON.parse(ler('assets/tutorial/pt-BR.json')).funcoes;
  const textos = tut.filter((f) => ['tarefas', 'discord'].includes(f.id)).flatMap((f) => f.passos.map((p) => p.texto)).join(' ');
  assert.doesNotMatch(textos, /Configurações, "?Lista de Tarefas|Configurações, Bloqueio do Discord/, 'o tutorial não manda para uma seção oculta');
  const falas = JSON.stringify(JSON.parse(ler('assets/dialogue/pt-BR.json')).categories.discordStatusDesligado);
  assert.doesNotMatch(falas, /Configurações/);
});

test('painel do aquário: duas linhas sem quebra, botão Cuidados na linha do nível e espaço suficiente', () => {
  const html = ler('src/renderer/overlay/index.html');
  assert.match(html, /<div class="needs-linha" id="needsNumbers"><\/div>\s*<div class="needs-linha"><div id="needsXp"><\/div><button id="openCare"/);
  const css = ler('src/renderer/overlay/needs.css');
  assert.match(css, /#needsHud \.needs-linha \{[^}]*white-space: nowrap/);
  assert.match(css, /#needsHud \{[^}]*box-sizing: border-box/);
  assert.doesNotMatch(css, /#openCare \{[^}]*float/, 'botão não flutua por cima do texto');
  const js = ler('src/renderer/overlay/overlay.js');
  assert.match(js, /\['Saciedade', panel\.hunger\], \['Saúde', panel\.health\], \['Higiene', panel\.hygiene\]/);
  assert.match(ler('src/core/companion.js'), /placeAround\(r\.visual, \{ width: 250, height: this\.needs\.objects\.length \? 120 : 66 \}/);
});
