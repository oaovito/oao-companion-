// Notas rápidas: guardar, listar, buscar e apagar pela conversa ou por /nota.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv } from './helpers.js';
import { Notes, parseNoteRequest, parseNoteCommand, sanitizeNotes, NOTE_LIMITS } from '../../src/core/notes.js';

function started() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  e.companion.enterInteraction('test');
  return e;
}

test('pedidos de nota em linguagem natural; frases parecidas que não são nota ficam de fora', () => {
  assert.deepEqual(parseNoteRequest('anota: comprar creatina'), { tipo: 'guardar', texto: 'comprar creatina' });
  assert.deepEqual(parseNoteRequest('JoJo, anota que a prova é dia 12'), { tipo: 'guardar', texto: 'a prova é dia 12' });
  assert.deepEqual(parseNoteRequest('Anota aí pra mim: senha do wifi é Tubarao123'), { tipo: 'guardar', texto: 'senha do wifi é Tubarao123' });
  assert.deepEqual(parseNoteRequest('nota: ligar pro dentista'), { tipo: 'guardar', texto: 'ligar pro dentista' });
  assert.deepEqual(parseNoteRequest('guarda essa ideia: app de treino'), { tipo: 'guardar', texto: 'app de treino' });
  assert.deepEqual(parseNoteRequest('anota'), { tipo: 'guardar', texto: '' });
  assert.deepEqual(parseNoteRequest('minhas notas'), { tipo: 'listar' });
  assert.deepEqual(parseNoteRequest('o que eu anotei?'), { tipo: 'listar' });
  assert.deepEqual(parseNoteRequest('procura nas notas creatina'), { tipo: 'buscar', busca: 'creatina' });
  assert.deepEqual(parseNoteRequest('o que eu anotei sobre a prova?'), { tipo: 'buscar', busca: 'a prova' });
  assert.deepEqual(parseNoteRequest('apaga a nota 2'), { tipo: 'apagar', numero: 2 });
  assert.deepEqual(parseNoteRequest('apaga a nota sobre creatina'), { tipo: 'apagar', busca: 'creatina' });
  for (const t of ['nota 10 pra você', 'guarda o pet', 'se guarda', 'salva o arquivo', 'tirei nota boa', 'anotei tudo hoje', 'apaga a luz', 'oi']) assert.equal(parseNoteRequest(t), null, t);
});

test('comando /nota e /notas', () => {
  assert.deepEqual(parseNoteCommand(''), { tipo: 'listar' });
  assert.deepEqual(parseNoteCommand('comprar creatina'), { tipo: 'guardar', texto: 'comprar creatina' });
  assert.deepEqual(parseNoteCommand('buscar creatina'), { tipo: 'buscar', busca: 'creatina' });
  assert.deepEqual(parseNoteCommand('apagar 3'), { tipo: 'apagar', numero: 3 });
  assert.deepEqual(parseNoteCommand('apagar creatina'), { tipo: 'apagar', busca: 'creatina' });
});

test('guardar, listar (mais novas primeiro), buscar sem acento, apagar por número e por palavra; limites', () => {
  const saved = [];
  const n = new Notes({ save: (s) => saved.push(s.length), today: () => new Date(2026, 9, 30, 15) });
  assert.equal(n.apply({ tipo: 'listar' }).fala, 'notaNenhuma');
  assert.equal(n.apply({ tipo: 'guardar', texto: '' }).fala, 'notaVazia');
  assert.deepEqual(n.apply({ tipo: 'guardar', texto: 'Comprar creatina' }).vars, { n: 1, total: 1 });
  n.apply({ tipo: 'guardar', texto: 'Prova de bioquímica dia 12' });
  n.apply({ tipo: 'guardar', texto: 'Creatina: 3 g por dia' });
  const lista = n.apply({ tipo: 'listar' });
  assert.equal(lista.fala, 'notaLista');
  assert.deepEqual(lista.itens, ['3. Creatina: 3 g por dia (30/10)', '2. Prova de bioquímica dia 12 (30/10)', '1. Comprar creatina (30/10)']);
  assert.deepEqual(n.apply({ tipo: 'buscar', busca: 'bioquimica' }).itens, ['2. Prova de bioquímica dia 12 (30/10)']);
  assert.equal(n.apply({ tipo: 'buscar', busca: 'whey' }).fala, 'notaBuscaNada');
  const qual = n.apply({ tipo: 'apagar', busca: 'creatina' });
  assert.equal(qual.fala, 'notaApagarQual', 'duas notas com a palavra: não apaga no chute');
  assert.equal(n.st.length, 3);
  assert.equal(n.apply({ tipo: 'apagar', numero: 9 }).fala, 'notaNaoAchei');
  const ap = n.apply({ tipo: 'apagar', numero: 1 });
  assert.deepEqual([ap.fala, ap.itens], ['notaApagada', ['Comprar creatina']]);
  assert.equal(n.apply({ tipo: 'apagar', busca: 'prova' }).fala, 'notaApagada');
  assert.deepEqual(n.st.map((x) => x.texto), ['Creatina: 3 g por dia']);
  assert.deepEqual(saved, [1, 2, 3, 2, 1]);
  for (let i = n.st.length; i < NOTE_LIMITS.total; i++) n.apply({ tipo: 'guardar', texto: `nota ${i}` });
  assert.equal(n.apply({ tipo: 'guardar', texto: 'uma a mais' }).fala, 'notaCheia');
  assert.equal(n.apply({ tipo: 'listar' }).itens.length, NOTE_LIMITS.lista + 1, 'lista as últimas e avisa das antigas');
  assert.deepEqual(sanitizeNotes([{ texto: '  a\n b ' }, { texto: '' }, null, { texto: 'x'.repeat(999), dia: 'ontem' }]).map((x) => [x.texto.length, x.dia]), [[3, null], [NOTE_LIMITS.texto, null]]);
});

test('na conversa: guarda, lista, busca e apaga, com fala do arquivo de falas e dados salvos no progresso', async () => {
  const e = started();
  let r = await chatAdv(e, 'anota: comprar creatina');
  assert.equal(r.intent, 'notas');
  assert.match(r.text, /[Nn]ota 1/);
  r = await chatAdv(e, '/nota prova de bioquímica dia 12');
  assert.match(r.text, /[Nn]ota 2/);
  assert.deepEqual(e.companion.progress.st.notas.map((x) => x.texto), ['comprar creatina', 'prova de bioquímica dia 12']);
  r = await chatAdv(e, 'minhas notas');
  assert.match(r.text, /2\. prova de bioquímica dia 12/);
  assert.match(r.text, /1\. comprar creatina/);
  r = await chatAdv(e, 'procura nas notas creatina');
  assert.match(r.text, /1\. comprar creatina/);
  assert.doesNotMatch(r.text, /bioquímica/);
  r = await chatAdv(e, '/notas apagar 1');
  assert.match(r.text, /comprar creatina/);
  assert.equal(e.companion.notes.st.length, 1);
  r = await chatAdv(e, 'anota');
  assert.match(r.text, /anota:/);
});
