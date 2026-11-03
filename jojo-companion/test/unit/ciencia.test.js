// Modo cientista/médico: óculos e dentes de nerd no assunto acadêmico;
// sério em saúde pessoal; emergência → SAMU 192.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv, loadJSON } from './helpers.js';
import { modoCiencia, ABERTURAS } from '../../src/core/ciencia.js';
import { buildSystemPrompt } from '../../src/core/dialogue/llm-provider.js';

test('detecção: acadêmico, pessoal e emergência; academia/whey não ativam', () => {
  for (const t of ['O que é potencial zeta?', 'Como interpretar DLS?', 'Minha ANOVA está correta?', 'Qual a fisiopatologia da asma?', 'Qual o mecanismo de ação da metformina?', 'Como interpretar esse hemograma?']) assert.equal(modoCiencia(t), 'academico', t);
  for (const t of ['estou com dor de cabeça há 3 dias e febre', 'meu exame de hemograma deu leucócitos altos', 'posso tomar ibuprofeno com dipirona?']) assert.equal(modoCiencia(t), 'pessoal', t);
  for (const t of ['to com dor no peito forte', 'não consigo respirar', 'tomei muitos comprimidos']) assert.equal(modoCiencia(t), 'emergencia', t);
  for (const t of ['tomei whey proteína hoje', 'vou na academia', 'oi jojo']) assert.equal(modoCiencia(t), null, t);
});

test('peças do visual existem no boneco (temporárias, sem mudar o resto)', () => {
  const rig = JSON.stringify(loadJSON('assets/character/jojo.rig.json'));
  assert.match(rig, /"showIf":\s*"prop_oculosNerd"/);
  assert.match(rig, /"showIf":\s*"prop_dentesNerd"/);
});

function started() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.dateNow = () => new Date(2026, 9, 30, 15);
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

test('companion: pergunta de ciência põe óculos e dentes, mantém abertura científica e tira depois; emergência → 192', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  const r = await chatAdv(e, 'o que é potencial zeta?');
  assert.match(r.text, /^(Erm|Vamos)/);
  e.companion._applyLayout(true);
  assert.equal(e.overlay.state.outfit.prop_oculosNerd, 1);
  assert.equal(e.overlay.state.outfit.prop_dentesNerd, 1);
  e.clock.advance(4 * 60e3);
  e.companion._applyLayout(true);
  assert.equal(e.overlay.state.outfit, null, 'acessórios somem quando o assunto acaba');
  const em = await chatAdv(e, 'to com dor no peito forte');
  assert.match(em.text, /192/);
  e.store.update({ cienciaDentes: false });
  await chatAdv(e, 'como interpretar DLS?');
  e.companion._applyLayout(true);
  assert.equal(e.overlay.state.outfit.prop_dentesNerd, undefined);
  // Modo Trabalho: sem visual.
  e.companion.startWork();
  await chatAdv(e, 'qual a fisiopatologia da asma?');
  e.companion._applyLayout(true);
  assert.equal(e.overlay.state.outfit, null);
});

test('abertura acrescentada após o engine preserva conteúdo e visual sem depreciar a pergunta entregue', async () => {
  const input = 'o que é diabetes tipo 2?';
  const answer = 'Diabetes tipo 2 envolve resistência à insulina e pode ter produção insuficiente desse hormônio.';
  for (const [index, opening] of ABERTURAS.entries()) {
    const e = started();
    e.companion.rng = () => (index + 0.5) / ABERTURAS.length;
    e.companion.dialogue.llm = { isAvailable: async () => true, reply: async () => ({ text: answer, action: 'lecture' }) };
    const delivered = await chatAdv(e, input);
    assert.equal(delivered.intent, 'ia');
    assert.equal(delivered.text, `${opening} ${answer}`);
    assert.doesNotMatch(delivered.text, /pergunta.{0,40}(?:neur[oô]nios|burra|idiota|intelig[eê]ncia)/i);
    assert.equal(e.companion.conversations.current().messages.at(-1).text, delivered.text);
    e.companion._applyLayout(true);
    assert.equal(e.overlay.state.outfit.prop_oculosNerd, 1);
    assert.equal(e.overlay.state.outfit.prop_dentesNerd, 1);
  }
});

test('prompt técnico: especialista rigoroso, sem inventar, sério em saúde pessoal', () => {
  const p = buildSystemPrompt({ nomeSerio: 'Emanuele', pessoaApoio: 'João' }, {}, [], { tecnico: true });
  assert.match(p, /Erm, na verdade/);
  assert.match(p, /potencial zeta/);
  assert.match(p, /Nunca invente dados, estudos ou referências/);
  assert.match(p, /sem diagnóstico nem prescrição/);
});
