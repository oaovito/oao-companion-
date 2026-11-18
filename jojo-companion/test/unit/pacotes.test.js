// Pacotes de reação: memes, anime, comida, namorado e o Divino João.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv, loadJSON } from './helpers.js';
import { detectComida, detectNamorado, packItems, comidaVariante, findReacao } from '../../src/core/pacotes.js';
import { expandCatalog } from '../../src/core/catalog/recipes.js';
import { fullCatalog } from '../../src/core/catalog/load.js';
import { ScriptedProvider } from '../../src/core/dialogue/scripted-provider.js';
import { buildSystemPrompt } from '../../src/core/dialogue/llm-provider.js';

const DATA = loadJSON('assets/catalog/pacotes.json');

test('50 reações, 10 por pacote, cada uma com animação real, falas e duração', () => {
  assert.equal(DATA.reacoes.length, 50);
  for (const p of ['memes', 'anime', 'comida', 'namorado', 'joao']) assert.equal(DATA.reacoes.filter((r) => r.pacote === p).length, 10, p);
  const cat = fullCatalog(loadJSON);
  const anims = expandCatalog(loadJSON('assets/animations/jojo.animations.json'), cat).animations;
  for (const r of DATA.reacoes) {
    assert.ok(anims[`cat_${r.id}`] && anims[`cat_${r.id}~exagerado`], r.id);
    assert.ok(r.falas.length >= 3 || (r.pacote === 'memes' && r.falas.length >= 3) || r.falas.length >= 3, r.id);
    assert.ok(r.duracao >= 3000 && r.duracao <= 15000, r.id);
  }
  // Comida: versão leve (sem efeitos) para os níveis 1–2.
  assert.equal(packItems(DATA).filter((i) => i.leve).length, 10);
  assert.deepEqual(comidaVariante('pk_traicao', 1), { id: 'pk_traicao_leve', intensity: 'suave' });
  assert.deepEqual(comidaVariante('pk_traicao', 4), { id: 'pk_traicao', intensity: 'exagerado' });
  assert.equal(findReacao(packItems(DATA), 'bankai').id, 'pk_bankai');
});

test('comida: intenção ativa; negação, passado e pergunta de informação não ativam', () => {
  const casos = {
    'Vou pedir pizza.': 'pk_traicao',
    'Que tal pedir uma pizza?': 'pk_traicao',
    'Quero tomar sorvete': 'pk_nuclear',
    'tô com vontade de sorvete': 'pk_nuclear',
    'Vou comer um hambúrguer com batata frita': 'pk_furiaFritas',
    'Vou comprar chocolate': 'pk_decepcao',
    'Só hoje vou comer besteira': 'pk_semDesculpas',
    'Quero comer bolo': 'pk_milAnos',
    'Vamos pedir fast food': 'pk_chefeFinal',
    'quero um doce': 'pk_crise',
    'vou comer brigadeiro': 'pk_crise',
    'Vou pedir sobremesa': 'pk_interrogatorio',
    'Vou comer pizza, sorvete e chocolate': 'pk_colapso',
  };
  for (const [t, id] of Object.entries(casos)) assert.equal(detectComida(t), id, t);
  for (const t of ['Não quero pizza.', 'Quanto custa uma pizza?', 'Ontem comi sorvete.', 'Pizza tem quantas calorias?', 'Não tenho vontade de doce.', 'e se eu comer um docinho?', 'a pizza de ontem estava boa']) assert.equal(detectComida(t), null, t);
});

test('namorado e João: contexto certo, sem confundir outro João, acolhe quando ele a magoa', () => {
  const casos = {
    'João me chamou': 'pk_jMensagem',
    'o joão me mandou mensagem': 'pk_jMensagem',
    'vou ver meu namorado': 'pk_operacao',
    'vou pra cidade do joão': 'pk_jPeregrinacao',
    'Estou com saudade do João': 'pk_jSaudade',
    'João disse que me ama': 'pk_jElogio',
    'Quero morar com o João': 'pk_mudanca',
    'João está chegando': 'pk_jChegando',
    'Tô com tesão no João': 'pk_jDevocao',
    'tô com muito tesão': 'pk_libido',
    'João é o amor da minha vida': 'pk_jApoteose',
    'será que vou engravidar dele?': 'pk_inseminacao',
    'vou arrumar minha mala': 'pk_checklist',
    'vou dormir na casa dele': 'pk_quarto',
    'voltei da viagem': 'pk_relatorio',
    'o joão ficou chateado comigo': 'pk_jJulgamento',
  };
  for (const [t, id] of Object.entries(casos)) assert.equal((detectNamorado(t) || {}).id, id, t);
  assert.equal(detectNamorado('Outro João me ligou'), null, 'outro João');
  assert.equal(detectNamorado('o joão do trabalho mandou mensagem'), null);
  assert.deepEqual(detectNamorado('João me magoou'), { cuidado: true, violencia: false });
  assert.equal(detectNamorado('o joão me bateu').violencia, true);
  assert.equal(detectNamorado('falei do joão hoje', { jaMencionou: false }), null, 'menção não pode substituir a conversa');
  assert.equal(detectNamorado('João', { jaMencionou: false }).id, 'pk_jMencao');
  assert.equal(detectNamorado('falei do joão hoje', { jaMencionou: true }), null);
});

function started() {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.dateNow = () => new Date(2026, 9, 30, 15);
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  return e;
}

test('companion: "vou pedir pizza" → funeral do shape no lugar do balão (pedido de 18/11/2026)', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  const r = await chatAdv(e, 'vou pedir pizza');
  assert.equal(r.intent, 'docinho', 'comida fora da dieta vai para o funeral, não para o pacote de comida');
  e.clock.advance(300);
  const st = e.overlay.state;
  assert.ok(st.funeral, 'slide de funeral na tela');
  assert.equal(st.funeral.fotos.length, 6);
  assert.ok(st.funeral.fotos.every((f) => /assets\/funeral\/foto\d{2}\.jpg$/.test(f)));
  assert.equal(new Set(st.funeral.fotos).size, 6, 'sem foto repetida no mesmo funeral');
  assert.equal(st.bubble, null, 'no lugar do balão');
  assert.ok(st.funeral.legenda.length > 5);
  e.clock.advance(12000);
  assert.equal(e.overlay.state.funeral, null, 'some sozinho');
  // "que vontade de comer uma pizza" (exemplo do pedido) também abre o funeral.
  await chatAdv(e, 'que vontade de comer uma pizza');
  e.clock.advance(300);
  assert.ok(e.overlay.state.funeral, 'vontade de pizza → funeral');
  e.clock.advance(12000);
  // Comida de atleta não dispara.
  await chatAdv(e, 'vou comer frango com batata doce');
  assert.equal(e.overlay.state.funeral, null);
  // Modo Trabalho bloqueia o funeral.
  e.companion.startWork();
  await chatAdv(e, 'quero tomar sorvete');
  assert.equal(e.overlay.state.funeral, null);
});

test('companion: João magoou → acolhimento sério (sem mandar falar com ele); "quem te criou?" → João', async () => {
  const e = started();
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, 'o João me magoou, tô chorando');
  assert.equal(r.intent, 'cuidado');
  assert.doesNotMatch(r.text, /fala com o João/i);
  assert.match(r.text, /188/);
  r = await chatAdv(e, 'quem te criou?');
  assert.match(r.text, /João/);
  const r2 = await new ScriptedProvider().reply({ text: 'quem fez o MNE_Lab?' });
  assert.match(r2.text, /\{apoio\}|João/);
});

test('pedido manual toca qualquer reação; pacote desligado não reage sozinho; Modo Trabalho bloqueia tudo', async () => {
  const e = started();
  const c = e.companion;
  assert.ok(c.playPack('pk_berserker', { source: 'comando' }), 'lendária pelo pedido');
  e.clock.advance(15000);
  e.store.update({ pacoteComida: false });
  assert.equal(c.playPack('pk_traicao'), null);
  assert.ok(c.playPack('pk_traicao', { source: 'comando' }), 'manual ignora o desligado');
  e.clock.advance(15000);
  c.startWork();
  assert.equal(c.playPack('pk_sideEye', { source: 'comando' }), null);
  assert.equal(c.packEvent('instagram', { sobrepor: true }), null);
});

test('conversa online conhece João (namorado e figura divina, ficção) e a autoria sem especular', () => {
  const p = buildSystemPrompt({ nomeSerio: 'Emanuele', pessoaApoio: 'João' });
  assert.match(p, /Deus Supremo/);
  assert.match(p, /nunca justifique se João a magoar/);
  assert.match(p, /Não especule sobre ferramentas/);
});

test('reação natural pelo contexto (sem menu): Instagram, chefe, julgamento, João e "para com essas reações"', async () => {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.dateNow = () => new Date(2026, 9, 30, 15);
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, 'Passei o dia inteiro no Instagram');
  assert.equal(r.intent, 'pacote:pk_sideEye');
  assert.match(r.text, /dia inteiro/);
  e.clock.advance(20e3);
  r = await chatAdv(e, 'perdi pra esse chefe dez vezes');
  assert.equal(r.intent, 'pacote:pk_broCooked');
  e.clock.advance(20e3);
  r = await chatAdv(e, 'O João vem amanhã');
  assert.equal(r.intent, 'pacote:pk_jChegando');
  e.clock.advance(20e3);
  r = await chatAdv(e, 'faz uma cara de julgamento');
  assert.match(e.companion.behavior.anim, /^cat_pk_sideEye/);
  e.clock.advance(20e3);
  r = await chatAdv(e, 'agora chega, para com essas reações');
  assert.equal(e.companion.reacoesPausadas, true);
  e.clock.advance(20 * 60e3);
  r = await chatAdv(e, 'vou pedir pizza');
  assert.notEqual(r.intent, 'pacote:pk_traicao', 'pausado: sem reação por contexto');
  assert.ok(e.companion.packEvent('derrota', { sobrepor: true }) === null);
  r = await chatAdv(e, 'pode voltar com as reações');
  assert.equal(e.companion.reacoesPausadas, false);
  // Sem menu público: /reacao sem nome só explica.
  r = await e.companion.chat('/reacao');
  assert.match(r.text, /Não tem menu/);
});
