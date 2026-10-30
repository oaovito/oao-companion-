// Correções vindas do uso real: agenda sem internet não vira "Bloqueado" com código técnico;
// resposta do modelo fora do assunto é trocada pela pesquisa; mensagem reenviada não duplica.
import test from 'node:test';
import assert from 'node:assert/strict';
import { erroDeRede, mensagemAgenda, falhaAgenda, AGENDA_AVISO_APOS_MS } from '../../src/core/calendar.js';
import { respostaFalaDoAssunto, classificarSeriedade } from '../../src/core/dialogue/professor.js';
import { DialogueEngine } from '../../src/core/dialogue/engine.js';
import { makeEnv } from './helpers.js';

test('agenda: queda de internet tenta de novo calada e só avisa depois de 1 h, sem código técnico', () => {
  assert.ok(erroDeRede('net::ERR_NAME_NOT_RESOLVED'));
  assert.ok(erroDeRede('net::ERR_INTERNET_DISCONNECTED'));
  assert.equal(erroDeRede('HTTP 404'), false);
  const st = {};
  let f = falhaAgenda(st, 'net::ERR_NAME_NOT_RESOLVED', 0);
  assert.equal(f.avisar, false);
  assert.equal(f.proximaMs, 30e3);
  f = falhaAgenda(st, 'net::ERR_NAME_NOT_RESOLVED', AGENDA_AVISO_APOS_MS + 1);
  assert.equal(f.avisar, true);
  assert.doesNotMatch(mensagemAgenda('net::ERR_NAME_NOT_RESOLVED'), /ERR_|net::/);
  assert.match(mensagemAgenda('HTTP 404'), /link/);
  assert.equal(falhaAgenda({}, 'HTTP 404', 0).avisar, true, 'link quebrado avisa na hora');
});

test('pergunta médica de conhecimento: modo cientista e resposta precisa falar do assunto', () => {
  assert.equal(classificarSeriedade('o que é a diabetes mellitus 2?'), 'cientifico');
  assert.equal(respostaFalaDoAssunto('o que é a diabetes mellitus 2?', 'Bem-vindo ao João: meu Deus, você está com fome e chateada por não ter café da manhã ou almoço? Não, não.'), false);
  assert.ok(respostaFalaDoAssunto('o que é a diabetes mellitus 2?', 'Erm. Diabetes tipo 2 é resistência à insulina.'));
});

test('modelo fora do assunto: vale a pesquisa (com fonte) e o motor não é pausado', async () => {
  const llm = { isAvailable: async () => true, timeoutMs: 1000, reply: async () => ({ text: 'Bem-vindo ao João: meu Deus, você está com fome? Não, não.', kind: 'speech' }) };
  const pesquisa = { pesquisar: async () => ({ consulta: 'diabetes mellitus 2', tipo: 'geral', confianca: 'media', trechos: [{ fonte: 'Wikipédia', titulo: 'Diabetes mellitus tipo 2', url: null, texto: 'Diabetes mellitus tipo 2 é uma doença metabólica caracterizada por glicose alta, resistência à insulina e deficiência relativa de insulina.' }], fontes: [{ fonte: 'Wikipédia' }] }) };
  const e = new DialogueEngine({ llm, pesquisa, searchEnabled: () => true });
  const out = await e.reply('o que é a diabetes mellitus 2?');
  assert.equal(out.intent, 'web');
  assert.match(out.web.extract, /resistência à insulina/);
  assert.equal(e.llmPauseUntil, 0, 'motor não pausado');
});

test('mensagem reenviada enquanto ele responde não duplica', async () => {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.dateNow = () => new Date(2026, 9, 30, 15);
  e.companion.start();
  let chamadas = 0;
  const orig = e.companion.dialogue.reply.bind(e.companion.dialogue);
  e.companion.dialogue.reply = (...a) => (chamadas++, orig(...a));
  const p1 = e.companion.chat('qual a capital da França?');
  const p2 = e.companion.chat('qual a capital da França?');
  for (let i = 0; i < 40; i++) {
    e.clock.advance(200);
    await Promise.resolve();
  }
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1, r2);
  assert.equal(chamadas, 1);
  const msgs = e.companion.conversations.current().messages.filter((m) => m.from === 'user' || m.role === 'user' || m.author === 'user');
  assert.ok(msgs.length <= 1, `mensagens dela: ${msgs.length}`);
});
