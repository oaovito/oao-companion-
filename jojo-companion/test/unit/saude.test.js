// Regra de saúde: sinal de que ela precisa de médico → João (médico de verdade);
// sinal de emergência → SAMU 192 e o João. Vale na conversa programada e no prompt do modelo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv } from './helpers.js';
import { situacaoSaude } from '../../src/core/saude.js';

test('detecção: sintoma, dor, machucado e remédio pedem médico; emergência é separada; estudo e terceiros não', () => {
  for (const t of ['estou com dor de cabeça', 'to com febre', 'tô passando mal', 'me machuquei no treino', 'torci o pé', 'cortei o dedo', 'posso tomar dipirona?', 'tomei dois comprimidos de dorflex', 'tô com ansiedade', 'não consigo dormir', 'enxaqueca de novo', 'tô enjoada', 'minha garganta tá doendo'])
    assert.equal(situacaoSaude(t), 'medico', t);
  for (const t of ['dor no peito', 'estou com falta de ar', 'não consigo respirar', 'desmaiei agora', 'tô sangrando muito', 'tomei muitos comprimidos', 'acho que vou desmaiar'])
    assert.equal(situacaoSaude(t), 'emergencia', t);
  for (const t of ['o que é diabetes?', 'quais os sintomas de gripe?', 'fiz supino hoje', 'minha mãe tá com dor', 'tô com sono', 'vamos estudar fisiologia da dor', 'ajusta a dose do treino', '', null])
    assert.equal(situacaoSaude(t), null, String(t));
});

function env() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.clock.advance(2000);
  e.companion.reminders.apply({ tipo: 'agua', ativo: false });
  e.companion.dialogue.llm = { reply: async () => { throw new Error('saúde não pode ir para o modelo'); } };
  e.companion.enterInteraction('test');
  return e;
}

test('conversa: precisa de médico → João, médico de verdade, na voz dele; nada de dose nem diagnóstico', async () => {
  const e = env();
  const vistas = new Set();
  for (const t of ['estou com dor de cabeça', 'me machuquei no treino', 'posso tomar dipirona com ibuprofeno?', 'tô passando mal', 'torci o pé']) {
    const r = await chatAdv(e, t);
    assert.equal(r.intent, 'saude', t);
    assert.match(r.text, /João/, t);
    assert.match(r.text, /médico de verdade/, t);
    assert.match(r.text, /cuida|cuidar/, t);
    assert.doesNotMatch(r.text, /\b\d+ ?mg\b|tome|tomar \d|diagn/i, t);
    vistas.add(r.text);
  }
  assert.ok(vistas.size >= 2, 'as falas variam');
});

test('conversa: emergência → SAMU 192 e o João; crise → SAMU 192, João e CVV 188; tristeza → João médico', async () => {
  const e = env();
  for (const t of ['estou com dor no peito', 'to com falta de ar', 'desmaiei agora', 'tô sangrando muito']) {
    const r = await chatAdv(e, t);
    assert.equal(r.intent, 'emergencia', t);
    assert.match(r.text, /SAMU no 192/, t);
    assert.match(r.text, /João/, t);
    assert.match(r.text, /médico de verdade/, t);
  }
  let r = await chatAdv(e, 'quero morrer');
  assert.match(r.text, /192/);
  assert.match(r.text, /188/);
  assert.match(r.text, /João: ele é médico de verdade/);
  r = await chatAdv(e, 'estou chorando');
  assert.match(r.text, /João/);
  assert.match(r.text, /[Mm]édico de verdade/);
});

test('conversa: lembrete de remédio continua lembrete; pergunta de estudo continua estudo', async () => {
  const e = env();
  let r = await chatAdv(e, 'me lembra de tomar o remédio Vitamina D às 08:00');
  assert.notEqual(r.intent, 'saude');
  assert.ok(e.companion.reminders.st.remedios.some((x) => /Vitamina D/i.test(x.nome)), r.text);
  e.companion.dialogue.llm = { reply: async () => ({ text: 'Diabetes tipo 2 é resistência à insulina. Senta que eu explico.', action: 'lecture', tone: 'serio' }), isAvailable: async () => true };
  r = await chatAdv(e, 'o que é diabetes?');
  assert.notEqual(r.intent, 'saude');
});
