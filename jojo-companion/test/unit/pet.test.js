// Sistema de pet: atividades das conversas, comandos "/", Central e movimento reduzido.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv } from './helpers.js';
import { ConversationManager, commandMenu, parseCommand, ACTIVITY_LABELS } from '../../src/core/conversations.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { loadJSON } from './helpers.js';

function started(opts) {
  const e = makeEnv(opts);
  e.companion.start();
  e.clock.advance(2000);
  return e;
}

test('conversas: status, prioridade das atividades e "pronto" vira visto ao abrir', () => {
  let t = 0;
  const m = new ConversationManager({ now: () => ++t });
  const a = m.create({ title: 'A' });
  const b = m.create({ title: 'B' });
  const c = m.create({ title: 'C' });
  const d = m.create({ title: 'D' });
  m.setStatus(a.id, 'running');
  m.setStatus(b.id, 'ready');
  m.setStatus(c.id, 'blocked', 'erro');
  m.setStatus(d.id, 'needsInput');
  assert.deepEqual(m.activities().map((x) => x.status), ['blocked', 'needsInput', 'ready', 'running']);
  assert.equal(m.activities()[0].label, ACTIVITY_LABELS.blocked);
  m.setViewing(b.id, true);
  assert.equal(m.get(b.id).status, 'idle', 'abrir a conversa marca "pronto" como visto');
  m.setStatus(b.id, 'ready');
  assert.equal(m.get(b.id).status, 'idle', 'concluída com a conversa aberta já conta como vista');
  m.setViewing(b.id, false);
  m.setStatus(b.id, 'ready');
  assert.equal(m.get(b.id).status, 'ready');
});

test('comandos: /pet alterna Wake Pet / Tuck Away Pet', () => {
  assert.equal(parseCommand('/pet'), 'pet');
  assert.equal(parseCommand('/PET agora'), 'pet');
  assert.equal(parseCommand('oi'), null);
  assert.equal(parseCommand('/xyz'), 'unknown');
  assert.equal(commandMenu({ petVisible: true })[0].label, 'Tuck Away Pet');
  assert.equal(commandMenu({ petVisible: false })[0].label, 'Wake Pet');

  const e = started();
  assert.equal(e.overlay.visible, true);
  let r = e.companion.runCommand('pet');
  assert.equal(e.overlay.visible, false, '/pet guarda o pet');
  assert.match(r.text, /Tuck Away Pet/);
  assert.equal(e.store.get().visible, false, 'estado persistido');
  r = e.companion.runCommand('pet');
  assert.equal(e.overlay.visible, true, '/pet acorda o pet');
  assert.match(r.text, /Wake Pet/);
});

test('/pet digitado no chat é comando, não mensagem', async () => {
  const e = started();
  const r = await e.companion.chat('/pet');
  assert.equal(r.command, 'pet');
  assert.equal(e.overlay.visible, false);
  assert.equal(e.companion.conversations.current().messages.length, 0);
});

test('conversa: em andamento → pronto; pergunta → precisa de você', async () => {
  const e = started();
  const p = e.companion.chat('consegui terminar');
  const id = e.companion.conversations.current().id;
  assert.equal(e.companion.conversations.get(id).status, 'running');
  e.clock.advance(300);
  for (let k = 0; k < 6; k++) await Promise.resolve();
  e.clock.advance(800);
  for (let k = 0; k < 6; k++) await Promise.resolve();
  await p;
  assert.equal(e.companion.conversations.get(id).status, 'ready');
  e.clock.advance(100);
  assert.equal(e.companion.conversations.activities()[0].status, 'ready');
  // Pergunta do JoJo deixa a conversa esperando a usuária.
  e.companion.conversations.setStatus(id, 'idle');
  await chatAdv(e, 'qual seu nome');
  const st = e.companion.conversations.get(id).status;
  assert.ok(['ready', 'needsInput'].includes(st));
});

test('falha do provedor de IA marca a conversa como bloqueada', async () => {
  const e = started();
  e.companion.dialogue.register({ id: 'quebrado', label: 'Quebrado', kind: 'local', isAvailable: async () => true, reply: async () => { throw new Error('offline'); } });
  e.companion.dialogue.activeId = 'quebrado';
  const r = await chatAdv(e, 'oi');
  assert.ok(r.text);
  const c = e.companion.conversations.get(r.conversationId);
  assert.equal(c.status, 'blocked');
  assert.match(c.detail, /offline/);
});

test('erro de sistema vira atividade "Bloqueado" e some quando resolvido', () => {
  const e = started();
  e.companion.reportSystem('atalho', 'Atalho', 'Atalho em uso por outro programa.');
  e.clock.advance(100);
  const it = e.companion.conversations.activities(8).find((x) => x.id === 'sistema-atalho');
  assert.equal(it.status, 'blocked');
  e.companion.reportSystem('atalho', 'Atalho', null);
  e.clock.advance(100);
  assert.equal(e.companion.conversations.activities(8).some((x) => x.id === 'sistema-atalho'), false);
});

test('clique no pet / numa atividade abre a Central na conversa certa', () => {
  const e = started();
  const opened = [];
  e.companion.onOpenApp = (id) => opened.push(id);
  const c = e.companion.conversations.newChat();
  e.companion.openApp(null);
  e.companion.openApp(c.id);
  assert.deepEqual(opened, [null, c.id]);
  assert.equal(e.companion.conversations.current().id, c.id);
});

test('sem barra de status ao lado do pet (atividades só na Central)', () => {
  const e = started();
  e.companion.reportSystem('detector', 'Detector', 'Falhou.');
  e.clock.advance(100);
  assert.equal('activities' in e.overlay.state, false);
  e.companion.enterInteraction('test');
  e.clock.advance(100);
  assert.equal('activities' in e.overlay.state, false);
  assert.ok(e.companion.conversations.activities(8).some((x) => x.id === 'sistema-detector'));
});

test('crise emocional: manda falar com o João', async () => {
  const e = started();
  for (const msg of ['to em crise', 'estou emocionalmente mal', 'tô chorando muito']) {
    const r = await chatAdv(e, msg);
    assert.match(r.text, /João/, msg);
    assert.match(r.text, /Emanuele/, msg);
    assert.equal(r.action, 'comfort');
  }
});

test('movimento reduzido: sem passeios e fuga instantânea', () => {
  const e = started({ settings: { activity: 1 } });
  e.companion.setReducedMotion(true);
  assert.equal(e.overlay.state.reducedMotion, true);
  let walked = false;
  for (let i = 0; i < 600; i++) {
    e.clock.advance(1000);
    if (e.companion.mover.active && e.companion.mover.kind === 'walk') walked = true;
  }
  assert.equal(walked, false);
});

test('animator: quadro estático determinístico para movimento reduzido', () => {
  const an = new Animator(loadJSON('assets/animations/jojo.animations.json'));
  an.play('happy', 0);
  const a = an.sampleStatic();
  const b = an.sampleStatic();
  assert.deepEqual(a.pose, b.pose);
  assert.equal(a.flags.hearts, false);
  assert.equal(a.flags.dust, false);
});
