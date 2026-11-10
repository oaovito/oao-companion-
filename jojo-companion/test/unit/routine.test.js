// Rotina diária: montar por conversa ou comando, regra do sono, avisos na hora
// de cada bloco e acompanhamento do que foi cumprido.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv } from './helpers.js';
import { Routine, parseRoutineRequest, parseRoutineCommand, extractBlocks, sanitizeRoutine, sonoPermitido } from '../../src/core/routine.js';
import { Habits } from '../../src/core/habits.js';

const HOJE = '2026-10-30';
const at = (h, m = 0) => new Date(2026, 9, 30, h, m);

function started() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  e.companion.reminders.apply({ tipo: 'agua', ativo: false });
  return e;
}

test('horários dos blocos saem do texto, em vários jeitos de escrever', () => {
  assert.deepEqual(extractBlocks('acordar 7h, estudar 14:00, treino 18h30, dormir 22:30'), { manha: '07:00', estudo: '14:00', treino: '18:30', sono: '22:30' });
  assert.deepEqual(extractBlocks('manha 6:45 estudo 9 treino 5 da tarde sono 11 da noite'), { manha: '06:45', estudo: '09:00', treino: '17:00', sono: '23:00' });
  assert.deepEqual(extractBlocks('treinar às 19h'), { treino: '19:00' });
  assert.deepEqual(extractBlocks('estudar 25h'), {});
  assert.equal(sonoPermitido('22:30'), true);
  assert.equal(sonoPermitido('05:30'), true);
  assert.equal(sonoPermitido('20:59'), false);
  assert.equal(sonoPermitido('14:00'), false);
});

test('pedidos e comandos da rotina; a frase fixa antiga de /rotina continua fora daqui', () => {
  assert.deepEqual(parseRoutineRequest('monta minha rotina: acordar 7h, estudar 14h, treinar 18h, dormir 22h30'), { tipo: 'montar', blocos: { manha: '07:00', estudo: '14:00', treino: '18:00', sono: '22:30' } });
  assert.deepEqual(parseRoutineRequest('muda minha rotina, treino 19h'), { tipo: 'montar', blocos: { treino: '19:00' } });
  assert.deepEqual(parseRoutineRequest('minha rotina'), { tipo: 'ver' });
  assert.deepEqual(parseRoutineRequest('como tá minha rotina?'), { tipo: 'ver' });
  assert.deepEqual(parseRoutineRequest('apaga minha rotina'), { tipo: 'limpar' });
  assert.deepEqual(parseRoutineRequest('acordei'), { tipo: 'feito', bloco: 'manha', natural: true });
  for (const t of ['odeio rotina', 'minha rotina de skincare é longa', 'oi', 'vou dormir']) assert.equal(parseRoutineRequest(t)?.tipo === 'montar' || parseRoutineRequest(t)?.tipo === 'limpar' ? 'x' : null, null, t);
  assert.deepEqual(parseRoutineCommand('ver'), { tipo: 'ver' });
  assert.deepEqual(parseRoutineCommand('montar manha 7:00 estudo 14:00'), { tipo: 'montar', blocos: { manha: '07:00', estudo: '14:00' } });
  assert.deepEqual(parseRoutineCommand('feito treino'), { tipo: 'feito', bloco: 'treino' });
  assert.deepEqual(parseRoutineCommand('limpar'), { tipo: 'limpar' });
  assert.equal(parseRoutineCommand('bom dia: Bom dia, campeã'), null);
  assert.equal(parseRoutineCommand(''), null);
});

test('montar, ver, cumprir e virar o dia; sono fora de 21h–6h é recusado sem derrubar o resto', () => {
  const habits = new Habits();
  const saved = [];
  const r = new Routine({ habits, save: (s) => saved.push(JSON.stringify(s)) });
  assert.equal(r.apply({ tipo: 'ver' }, HOJE).fala, 'rotinaVazia');
  assert.equal(r.apply({ tipo: 'montar', blocos: {} }, HOJE).fala, 'rotinaAjuda');
  assert.equal(r.apply({ tipo: 'montar', blocos: { sono: '15:00' } }, HOJE).fala, 'rotinaSonoCedo');
  assert.deepEqual(r.st.blocos, {});
  const m = r.apply({ tipo: 'montar', blocos: { manha: '07:00', estudo: '14:00', treino: '18:00', sono: '20:00' } }, HOJE);
  assert.equal(m.fala, 'rotinaMontadaSemSono');
  assert.deepEqual(r.st.blocos, { manha: '07:00', estudo: '14:00', treino: '18:00' });
  assert.equal(r.apply({ tipo: 'montar', blocos: { sono: '22:30' } }, HOJE).fala, 'rotinaMontada');
  assert.deepEqual(r.apply({ tipo: 'ver' }, HOJE).itens, ['07:00 Manhã', '14:00 Estudo', '18:00 Treino', '22:30 Sono']);
  r.apply({ tipo: 'feito', bloco: 'manha' }, HOJE);
  assert.equal(r.apply({ tipo: 'feito', bloco: 'treino' }, HOJE).fala, 'rotinaFeito');
  assert.equal(habits.has('treino', HOJE), true, 'treino cumprido conta no hábito');
  habits.log('estudo', HOJE);
  assert.deepEqual(r.apply({ tipo: 'ver' }, HOJE).itens, ['07:00 Manhã ✓', '14:00 Estudo ✓', '18:00 Treino ✓', '22:30 Sono']);
  assert.deepEqual(r.apply({ tipo: 'ver' }, '2026-10-31').itens, ['07:00 Manhã', '14:00 Estudo', '18:00 Treino', '22:30 Sono'], 'dia novo recomeça');
  assert.equal(r.apply({ tipo: 'limpar' }, '2026-10-31').fala, 'rotinaLimpa');
  assert.deepEqual(r.st.blocos, {});
  assert.ok(saved.length >= 5);
  assert.deepEqual(sanitizeRoutine({ blocos: { manha: '7h', estudo: '14:00', sono: '15:00', xadrez: '10:00' }, dia: 'hoje', avisados: ['estudo'], manhaFeita: true }), { blocos: { estudo: '14:00' }, dia: null, avisados: [], manhaFeita: false });
});

test('vencimento: avisa na hora, só uma vez, não avisa bloco cumprido nem depois de uma hora', () => {
  const habits = new Habits();
  const r = new Routine({ habits });
  r.apply({ tipo: 'montar', blocos: { manha: '07:00', estudo: '14:00', treino: '18:00', sono: '22:30' } }, HOJE);
  assert.deepEqual(r.due(at(6, 59), HOJE), []);
  assert.deepEqual(r.due(at(7, 0), HOJE), [{ bloco: 'manha', hora: '07:00' }]);
  r.markWarned('manha', HOJE);
  assert.deepEqual(r.due(at(7, 5), HOJE), []);
  habits.log('estudo', HOJE);
  assert.deepEqual(r.due(at(14, 0), HOJE), [], 'estudo já feito não é cobrado');
  assert.deepEqual(r.due(at(18, 30), HOJE), [{ bloco: 'treino', hora: '18:00' }]);
  assert.deepEqual(r.due(at(19, 1), HOJE), [], 'passou de uma hora, não avisa mais hoje');
  assert.deepEqual(r.due(at(22, 30), HOJE), [{ bloco: 'sono', hora: '22:30' }]);
});

test('na conversa e no comando: monta, mostra e marca; /rotina bom dia continua igual', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, 'monta minha rotina: acordar 7h, estudar 14h, treinar 18h, dormir 22h30');
  assert.equal(r.intent, 'rotina');
  assert.match(r.text, /07:00 Manhã/);
  assert.match(r.text, /22:30 Sono/);
  assert.deepEqual(e.companion.progress.st.rotinaDiaria.blocos, { manha: '07:00', estudo: '14:00', treino: '18:00', sono: '22:30' });
  r = await chatAdv(e, '/rotina feito treino');
  assert.equal(e.companion.habits.has('treino', HOJE), true);
  r = await chatAdv(e, '/rotina ver');
  assert.match(r.text, /18:00 Treino ✓/);
  r = await chatAdv(e, '/rotina montar sono 15:00');
  assert.match(r.text, /21h/);
  assert.equal(e.companion.routine.st.blocos.sono, '22:30', 'o sono válido de antes continua');
  r = await chatAdv(e, '/rotina bom dia: Bom dia, campeã');
  assert.match(r.text, /^Fechado\. bom dia vai ser sempre: "Bom dia, campeã"$/);
  assert.equal(e.companion.progress.st.rotinaFixa.bomDia, 'Bom dia, campeã');
  r = await chatAdv(e, '/rotina');
  assert.match(r.text, /^Use: \/rotina bom dia: texto/);
});

test('aviso do bloco: balão com o horário e animação; silêncio no foco; uma vez por dia', () => {
  const e = started();
  e.companion.routine.apply({ tipo: 'montar', blocos: { estudo: '14:00', treino: '18:00' } }, HOJE);
  const said = [];
  const orig = e.companion.say.bind(e.companion);
  e.companion.say = (t, k, o) => (said.push(t), orig(t, k, o));
  assert.equal(e.companion.checkRoutine(at(13, 59)), null);
  e.companion.startFocus(30, 'estudo');
  assert.equal(e.companion.checkRoutine(at(14, 0)), null, 'no foco não interrompe');
  e.companion._endFocus(false);
  said.length = 0;
  const item = e.companion.checkRoutine(at(14, 2));
  assert.deepEqual(item, { bloco: 'estudo', hora: '14:00' });
  assert.ok(said.some((t) => /14:00/.test(t)), said.join(' | '));
  assert.match(e.companion.behavior.anim || '', /^cat_focoLerPagina/);
  assert.equal(e.companion.checkRoutine(at(14, 3)), null);
  e.companion.habits.log('treino', HOJE);
  assert.equal(e.companion.checkRoutine(at(18, 0)), null, 'treino já feito hoje');
});
