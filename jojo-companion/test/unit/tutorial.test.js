// Tutorial conduzido pelo JoJo: cobertura (falha se uma função, um comando ou
// uma configuração ficar sem passo), percurso completo com os exemplos reais,
// navegação, progresso salvo, primeiro uso e movimento reduzido.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEnv, chatAdv } from './helpers.js';
import { DEFAULTS } from '../../src/core/settings-schema.js';
import { commandMenu, parseCommand, COMMANDS } from '../../src/core/conversations.js';
import { Tutorial, tutorialCoverage, parseTutorialNav, parseTutorialCommand, sanitizeTutorial } from '../../src/core/tutorial.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const DATA = JSON.parse(read('assets/tutorial/pt-BR.json'));
const COB = tutorialCoverage(DATA);
const VARS = { nome: 'Emanuele', companion: 'JoJo', apoio: 'João', atalho: 'Ctrl + Alt + J', vocativo: ', Emanuele' };

// As 12 utilidades e os itens que o tutorial precisa cobrir sempre.
const OBRIGATORIAS = ['lembretes', 'tarefas', 'rotina', 'foco', 'quebrar', 'habitos', 'estudo', 'treino', 'notas', 'resumoDia', 'checkin', 'duvidas',
  'pet', 'balao', 'movimentoReduzido', 'focoAnimacoes', 'discord', 'conversa', 'tutorial'];

test('cobertura: toda função obrigatória, todo comando e toda configuração têm passo no tutorial', () => {
  for (const id of OBRIGATORIAS) assert.ok(COB.ids.includes(id), `função sem tutorial: ${id}`);
  assert.equal(new Set(COB.ids).size, COB.ids.length, 'ids repetidos');

  // Comandos do menu "/" (o que ela vê ao digitar a barra).
  for (const c of commandMenu({ petVisible: true })) assert.ok(COB.comandos.has(c.cmd), `comando do menu sem passo no tutorial: ${c.cmd}`);
  // Todo comando que o app reconhece (registro central), mesmo fora do menu.
  const reconhecidos = new Set(COMMANDS.map((c) => c.id));
  assert.ok(reconhecidos.size >= 29, `registro de comandos incompleto (${reconhecidos.size})`);
  for (const c of COMMANDS) for (const nome of [c.cmd, ...c.aliases]) assert.equal(parseCommand(nome), c.id, nome);
  const ensinados = new Set([...COB.comandos].map((c) => parseCommand(c)));
  for (const id of reconhecidos) assert.ok(ensinados.has(id), `comando reconhecido sem passo no tutorial: ${id}`);
  for (const c of COB.comandos) assert.notEqual(parseCommand(c), 'unknown', `o tutorial ensina um comando que não existe: ${c}`);

  // Configurações: tudo que tem campo na tela de Configurações.
  const html = read('src/renderer/settings/index.html');
  const campos = new Set([...html.matchAll(/name="(\w+)"/g)].map((m) => m[1]));
  assert.ok(campos.size >= 36);
  for (const k of campos) assert.ok(COB.configuracoes.has(k), `configuração sem passo no tutorial: ${k}`);
  for (const k of COB.configuracoes) assert.ok(k in DEFAULTS, `o tutorial cita uma configuração que não existe: ${k}`);
});

test('conteúdo: toda função explica, mostra como ativar e manda testar um exemplo real, em passos curtos', () => {
  const fill = (t) => String(t).replace(/\{(\w+)\}/g, (m, k) => VARS[k] ?? m);
  for (const f of DATA.funcoes) {
    assert.ok(f.titulo && f.grupo && Array.isArray(f.comandos) && Array.isArray(f.configuracoes), f.id);
    assert.ok(f.passos.length >= 1 && f.passos.length <= 4, `${f.id}: de 1 a 4 passos`);
    assert.ok(f.passos.some((p) => p.tente), `${f.id}: nenhum passo manda testar`);
    for (const [i, p] of f.passos.entries()) {
      const onde = `${f.id} passo ${i + 1}`;
      assert.ok(p.texto.length >= 40 && p.texto.length <= 280, `${onde}: ${p.texto.length} caracteres`);
      assert.doesNotMatch(fill(p.texto), /\{\w+\}/, `${onde}: variável sem valor`);
      assert.doesNotMatch(p.texto, /\b(Manu)\b/, `${onde}: tom sério usa o nome sério`);
      if (p.espera) {
        assert.ok(p.tente, `${onde}: espera sem exemplo`);
        const chaves = Object.keys(p.espera);
        assert.equal(chaves.length, 1, onde);
        assert.ok(['comando', 'intent', 'config', 'evento', 'qualquer'].includes(chaves[0]), onde);
        if (p.espera.comando) assert.equal(parseCommand(p.tente), p.espera.comando, `${onde}: o exemplo não é o comando esperado`);
        if (p.espera.config) assert.ok(p.espera.config in DEFAULTS, onde);
      }
      if (p.tente && p.tente.startsWith('/')) {
        assert.notEqual(parseCommand(p.tente), 'unknown', `${onde}: exemplo com comando inexistente`);
        assert.ok(f.comandos.some((c) => parseCommand(c) === parseCommand(p.tente)) || ['settings', 'foco', 'habito', 'nota', 'tutorial'].includes(parseCommand(p.tente)), `${onde}: exemplo de comando que a função não declara`);
      }
    }
  }
  for (const [k, v] of Object.entries(DATA.textos)) for (const t of [].concat(v)) assert.ok(t.length > 3 && t.length <= 300, `texto ${k}`);
  assert.deepEqual(fs.readdirSync(path.join(ROOT, 'assets/tutorial')), ['pt-BR.json'], 'tutorial é só texto: nenhum arquivo de som');
  assert.doesNotMatch(read('src/core/tutorial.js'), /Audio|speechSynthesis|\.play\(|beep/i);
});

test('motor: avançar, voltar, pular, pausar e retomar com o progresso salvo', () => {
  let disco = null;
  const novo = () => new Tutorial({ data: DATA, state: disco, save: (s) => { disco = JSON.parse(JSON.stringify(s)); }, vars: () => VARS });
  let t = novo();
  assert.equal(t.st.estado, 'novo');
  assert.match(t.open(), /Primeira vez aqui\. Eu sou o JoJo/);
  assert.match(t.next(), /^Conversar comigo \(1 de 31\), passo 1 de 2\.\n.*Ctrl \+ Alt \+ J.*\nTente: oi$/s);
  assert.match(t.next(), /passo 2 de 2/);
  assert.match(t.back(), /passo 1 de 2/);
  assert.match(t.back(), /Já estamos no começo/);
  t.next();
  assert.match(t.next(), /^Me mostrar e me esconder \(2 de 31\), passo 1 de 2/);
  assert.deepEqual(disco.vistas, ['conversa']);
  assert.match(t.back(), /^Conversar comigo \(1 de 31\), passo 2 de 2/, 'voltar no primeiro passo cai no fim da função anterior');
  t.next();
  assert.match(t.skip(), /^Pulei "Me mostrar e me esconder"\. Dá pra ver depois com \/tutorial pet\.\nBalão de status \(3 de 31\)/);
  assert.deepEqual(disco.puladas, ['pet']);
  assert.match(t.pause(), /pausado em "Balão de status"\. Seu progresso está salvo/);
  assert.equal(t.next(), DATA.textos.semTutorial, 'pausado não anda');

  // Fechou e reabriu o app: continua do mesmo passo.
  t = novo();
  assert.deepEqual([t.st.estado, t.st.funcao, t.st.passo], ['pausado', 'balao', 0]);
  assert.match(t.start(), /^Voltando de onde paramos\.\nBalão de status \(3 de 31\), passo 1 de 2/);
  // Fechou sem pausar: reabre pausado, sem perder o lugar.
  t.next();
  t = novo();
  assert.deepEqual([t.st.estado, t.st.funcao, t.st.passo], ['pausado', 'balao', 1]);

  // Até o fim: conta o que foi visto e lembra do que foi pulado.
  t.start();
  let fim = '';
  for (let i = 0; i < 200 && t.ativo; i++) fim = t.next();
  assert.equal(t.st.estado, 'concluido');
  assert.match(fim, /Fim do tutorial\. Você viu 30 de 31 funções e pulou: Me mostrar e me esconder/);
  assert.match(t.startOne('pet'), /^Me mostrar e me esconder/);
  t.next();
  assert.match(t.next(), /Era isso sobre "Me mostrar e me esconder"/);
  assert.deepEqual([t.st.estado, t.st.vistas.length, t.st.puladas.length], ['concluido', 31, 0]);
  assert.match(t.start(), /Fim do tutorial\. Você viu 31 de 31 funções\./);
  assert.match(t.restart(), /Do zero, então.*\nConversar comigo \(1 de 31\)/s);
  assert.deepEqual(disco.vistas, []);
});

test('motor: abrir direto uma função não bagunça o tutorial inteiro; busca por nome; estado inválido é corrigido', () => {
  const t = new Tutorial({ data: DATA, vars: () => VARS });
  t.open(); t.next(); t.next(); // conversa, passo 2
  assert.match(t.startOne('foco'), /^Timer de foco \(9 de 31\), passo 1 de 3/);
  assert.equal(t.st.avulso, true);
  t.next(); t.next();
  assert.match(t.next(), /Era isso sobre "Timer de foco"\. Pra seguir o tutorial inteiro: \/tutorial/);
  assert.deepEqual([t.st.estado, t.st.funcao, t.st.passo, t.st.avulso], ['pausado', 'conversa', 1, false]);
  assert.match(t.start(), /Conversar comigo \(1 de 31\), passo 2 de 2/);
  t.next();
  assert.ok(!t.pendentes().some((f) => f.id === 'foco'), 'o que já foi visto por fora não se repete');
  assert.equal(t.find('lista de tarefas').id, 'tarefas');
  assert.equal(t.find('Hábitos').id, 'habitos');
  assert.equal(t.find('discord').id, 'discord');
  assert.equal(t.find('bitcoin'), null);
  assert.equal(t.startOne('bitcoin'), DATA.textos.naoAchei);
  assert.match(t.list(), /✓ Conversar comigo \(\/tutorial conversa\)\n· Me mostrar e me esconder/);
  assert.match(t.list(), /Utilidades:\n/);

  assert.deepEqual(sanitizeTutorial({ estado: 'voando', funcao: 'nada', passo: -3, vistas: ['foco', 'foco', 'x'], puladas: ['foco', 'pet'] }, { ids: COB.ids, existente: true }),
    { estado: 'antigo', funcao: null, passo: 0, vistas: ['foco'], puladas: ['pet'], avulso: false, intro: false, retorno: null, versaoVista: 0, conhecidas: [] });
  assert.equal(sanitizeTutorial(null, { ids: COB.ids }).estado, 'novo');
  for (const [txt, nav] of [['próximo', 'proximo'], ['Próxima!', 'proximo'], ['voltar', 'voltar'], ['pula', 'pular'], ['pausar', 'pausar'], ['pronto', null], ['não', null], ['adiciona', null], ['próximo exercício é qual?', null], ['3', null]]) assert.equal(parseTutorialNav(txt), nav, txt);
  assert.deepEqual(parseTutorialCommand(''), { tipo: 'iniciar' });
  assert.deepEqual(parseTutorialCommand('lista'), { tipo: 'lista' });
  assert.deepEqual(parseTutorialCommand('Timer de Foco'), { tipo: 'funcao', busca: 'timer de foco' });
  assert.deepEqual(parseTutorialCommand('recomeçar'), { tipo: 'recomecar' });
});

function env({ auto = true, xp = 0, settings = {} } = {}) {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } }, settings });
  e.companion.tutorialData = DATA;
  e.companion.tutorialAuto = auto;
  if (xp) e.companion.progress.st.xp = xp;
  // Lista de tarefas simulada (no app ela vem do serviço de tarefas).
  e.companion.todoChat = { model: { add() {}, st: { tasks: [] } }, reply: (t) => (/^(adiciona|marca)\b/i.test(t) ? 'Anotado.' : null) };
  e.companion.dialogue.llm = null;
  const said = [];
  const orig = e.companion.say.bind(e.companion);
  e.companion.say = (t, k, o) => { const ok = orig(t, k, o); if (ok) said.push(t); return ok; };
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.companion.reminders.apply({ tipo: 'agua', ativo: false });
  return { ...e, said, tut: () => e.companion.tutorial };
}
const conversa = (e) => e.companion.conversations.current().messages.map((m) => m.text);

test('primeiro uso: instalação nova abre sozinho, com a conversa aberta e o balão; salva o progresso', () => {
  const e = env();
  e.clock.advance(5000);
  assert.equal(e.tut().st.estado, 'novo', 'espera a saudação passar');
  e.clock.advance(5000);
  assert.equal(e.tut().st.estado, 'ativo');
  assert.equal(e.companion.interaction, true, 'abre a conversa');
  assert.equal(e.companion.chatOpen, true, 'com o painel de conversa aberto na tela');
  assert.equal(e.companion.progress.st.tutorial.versaoVista, DATA.versao, 'só marca depois de abrir na tela');
  assert.ok(e.said.some((t) => /Primeira vez aqui/.test(t)), 'fala no balão');
  assert.ok(conversa(e).some((t) => /Primeira vez aqui/.test(t)));
  assert.equal(e.companion.conversations.get('tutorial').status, 'needsInput');
  assert.equal(e.companion.progress.st.tutorial.estado, 'ativo');
  const antes = e.said.length;
  e.clock.advance(3 * 60e3);
  assert.equal(e.said.filter((t) => /Primeira vez aqui/.test(t)).length, 1, 'não abre de novo');
  assert.ok(antes >= 1);
});

test('convite (correção): quem já usava NÃO recebe nada sozinho; o convite vem na primeira interação e só então conta como visto', async () => {
  const e = env({ xp: 120 });
  e.clock.advance(5 * 60e3);
  assert.equal(e.said.filter((t) => /Tem tutorial novo/.test(t)).length, 0, 'nada de convite solto com ninguém olhando');
  assert.equal(e.tut().st.versaoVista, 0, 'ainda não visto');
  assert.ok(e.tut().pendingInvite());
  // Ela abre a conversa: o convite aparece no painel aberto (e no balão) e só agora é marcado.
  e.companion.enterInteraction('hotkey');
  assert.equal(e.tut().st.versaoVista, 0, 'entrar no modo de interação ainda não mostra a conversa');
  e.companion.setChatOpen(true);
  assert.ok(conversa(e).some((t) => /Tem tutorial novo, Emanuele/.test(t)));
  assert.ok(e.said.some((t) => /Tem tutorial novo/.test(t)));
  assert.equal(e.tut().st.versaoVista, DATA.versao);
  assert.equal(e.tut().st.estado, 'convidado');
  assert.equal(e.tut().ativo, false, 'convite não abre o tutorial');
  // Uma vez só.
  e.companion.setChatOpen(false);
  e.companion.setChatOpen(true);
  assert.equal(conversa(e).filter((t) => /Tem tutorial novo/.test(t)).length, 1);
  // Reabriu o app: continua visto.
  const disco = JSON.parse(JSON.stringify(e.companion.progress.st.tutorial));
  const t2 = new Tutorial({ data: DATA, state: disco, existente: true, vars: () => VARS });
  assert.equal(t2.pendingInvite(), null);
});

test('convite (correção): pela Central, a primeira mensagem também traz o convite, depois da resposta', async () => {
  const e = env({ xp: 50 });
  e.clock.advance(60e3);
  const r = await chatAdv(e, '/resumo');
  assert.equal(r.command, 'resumo');
  const msgs = conversa(e);
  assert.match(msgs.at(-1), /Tem tutorial novo/);
  assert.equal(e.tut().st.versaoVista, DATA.versao);
  await chatAdv(e, '/resumo');
  assert.equal(conversa(e).filter((t) => /Tem tutorial novo/.test(t)).length, 1);
  // Mensagem de crise não recebe convite.
  const c = env({ xp: 50 });
  await chatAdv(c, 'quero morrer');
  assert.ok(!conversa(c).some((t) => /Tem tutorial novo/.test(t)));
  assert.equal(c.tut().st.versaoVista, 0);
});

test('convite (correção): atualização com conteúdo novo convida de novo, citando o que é novo; sem conteúdo novo, nada', () => {
  const dados = { ...DATA, versao: DATA.versao + 1, funcoes: [...DATA.funcoes, { id: 'novidade', titulo: 'Função nova', grupo: 'Mais', comandos: [], configuracoes: [], passos: [{ texto: 'Passo da função nova, com texto comprido o bastante.' }] }] };
  const antes = { estado: 'concluido', funcao: null, passo: 0, vistas: DATA.funcoes.map((f) => f.id), puladas: [], versaoVista: DATA.versao, conhecidas: DATA.funcoes.map((f) => f.id) };
  const t = new Tutorial({ data: dados, state: antes, existente: true, vars: () => VARS });
  assert.deepEqual(t.pendingInvite().novas.map((f) => f.id), ['novidade']);
  assert.ok(t.invite().startsWith('Tem coisa nova no tutorial, Emanuele: Função nova.'));
  assert.ok(t.invite().includes('/tutorial novidade'));
  t.markInviteSeen();
  assert.equal(t.pendingInvite(), null);
  assert.equal(t.st.estado, 'concluido', 'o convite não mexe no tutorial já concluído');
  assert.match(t.start(), /^Função nova/, '/tutorial continua pela função nova');
  const igual = new Tutorial({ data: DATA, state: { ...antes }, existente: true, vars: () => VARS });
  assert.equal(igual.pendingInvite(), null);
  // Quem rodou /tutorial por conta própria já conhece o conteúdo.
  const sozinha = new Tutorial({ data: DATA, state: null, existente: true, vars: () => VARS });
  sozinha.start();
  assert.equal(sozinha.pendingInvite(), null);
});
test('primeiro uso: nunca no Modo Trabalho, no foco ou no modo silencioso; abre na primeira chance; desligado em teste do app', () => {
  const t = env({ settings: { trabalhoAtivo: true, trabalhoRestaurar: true } });
  t.clock.advance(5 * 60e3);
  assert.equal(t.tut().st.estado, 'novo');
  assert.ok(!t.said.some((x) => /Primeira vez/.test(x)));
  t.companion.endWork();
  t.clock.advance(70e3);
  assert.equal(t.tut().st.estado, 'ativo', 'saiu do Modo Trabalho: abre na verificação seguinte');

  const f = env();
  f.companion.startFocus(30, 'estudo');
  f.clock.advance(5 * 60e3);
  assert.equal(f.tut().st.estado, 'novo');

  const q = env({ settings: { quietMode: true }, xp: 50 });
  q.clock.advance(5 * 60e3);
  assert.equal(q.tut().st.estado, 'antigo', 'modo silencioso: nem convite');

  const off = env({ auto: false });
  off.clock.advance(5 * 60e3);
  assert.equal(off.tut().st.estado, 'novo');
  assert.equal(off.said.filter((x) => /Primeira vez/.test(x)).length, 0);
  assert.match(read('src/main/main.js'), /tutorialAuto: !TEST/);
});

test('percurso completo: cada exemplo do tutorial funciona de verdade e faz o passo avançar', async () => {
  const e = env({ auto: false });
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, '/tutorial');
  assert.match(r.text, /^Conversar comigo \(1 de 31\), passo 1 de 2/);
  assert.equal(r.command, 'tutorial');
  const t = e.tut();
  let guard = 0;
  while (t.ativo && guard++ < 150) {
    const f = t.func(), p = t.step(), onde = `${f.id} passo ${t.st.passo + 1}`;
    const antes = `${t.st.funcao}:${t.st.passo}`;
    if (p.espera && !p.espera.evento && !p.espera.config) {
      r = await chatAdv(e, p.tente);
      if (p.espera.comando) assert.equal(r.command, p.espera.comando, `${onde}: "${p.tente}"`);
      assert.doesNotMatch(r.text, /comando não existe/, onde);
      e.clock.advance(1300);
      assert.notEqual(`${t.st.funcao}:${t.st.passo}`, antes, `${onde}: o exemplo "${p.tente}" não fez o tutorial avançar (resposta: ${String(r.text).slice(0, 80)})`);
      assert.ok(DATA.textos.acertou.some((a) => conversa(e).at(-1).startsWith(a)), `${onde}: elogio antes do passo seguinte`);
    } else if (p.espera && p.espera.evento === 'movimentoReduzido') {
      e.companion.setReducedMotion(true);
      e.clock.advance(1300);
      assert.notEqual(`${t.st.funcao}:${t.st.passo}`, antes, onde);
      e.companion.setReducedMotion(false);
    } else {
      r = await chatAdv(e, 'próximo');
      assert.equal(r.intent, 'tutorial', onde);
      assert.notEqual(`${t.st.funcao}:${t.st.passo}`, antes, onde);
    }
  }
  assert.equal(t.st.estado, 'concluido');
  assert.equal(t.st.vistas.length, DATA.funcoes.length);
  assert.deepEqual(t.st.puladas, []);
  assert.ok(conversa(e).some((x) => /Fim do tutorial\. Você viu 31 de 31 funções/.test(x)));
  assert.equal(e.companion.conversations.get('tutorial').status, 'idle');
  // Nada ficou ligado por causa do tutorial.
  assert.equal(e.companion.work, null);
  assert.equal(e.companion.focus, null);
  assert.equal(e.store.get().quietMode, false);
  assert.equal(e.companion.userHidden, false);
  assert.equal(e.store.get().discordBloqueio, false, 'o tutorial explica o bloqueio do Discord, mas não liga');
});

test('na conversa: próximo, voltar, pular, pausar e /tutorial <função>; fora do tutorial essas palavras são conversa comum', async () => {
  const e = env({ auto: false });
  e.companion.enterInteraction('test');
  let r = await chatAdv(e, 'próximo');
  assert.notEqual(r.intent, 'tutorial', 'sem tutorial ativo não intercepta');
  r = await chatAdv(e, '/tutorial notas');
  assert.match(r.text, /^Notas rápidas \(15 de 31\), passo 1 de 2/);
  assert.ok(e.said.some((x) => /^Notas rápidas/.test(x)), 'o passo aparece no balão');
  r = await chatAdv(e, '/nota comprar creatina');
  e.clock.advance(1300);
  assert.match(conversa(e).at(-1), /passo 2 de 2/);
  r = await chatAdv(e, 'voltar');
  assert.match(r.text, /passo 1 de 2/);
  r = await chatAdv(e, 'pular');
  assert.match(r.text, /Pulei "Notas rápidas"/);
  assert.equal(e.tut().ativo, false);
  r = await chatAdv(e, '/tutorial');
  assert.match(r.text, /Conversar comigo \(1 de 31\)/);
  r = await chatAdv(e, 'pausar');
  assert.match(r.text, /Tutorial pausado/);
  r = await chatAdv(e, '/tutorial lista');
  assert.match(r.text, /Funções do tutorial/);
  r = await chatAdv(e, '/tutorial ajuda');
  assert.match(r.text, /\/tutorial recomeçar/);
  r = await chatAdv(e, '/tutorial xyzabc');
  assert.equal(r.text, DATA.textos.naoAchei);
  r = await chatAdv(e, '/tutorial sair');
  assert.match(r.text, /Tutorial encerrado/);
  // Comando errado no meio do passo não avança.
  await chatAdv(e, '/tutorial foco');
  await chatAdv(e, '/notas');
  e.clock.advance(1300);
  assert.deepEqual([e.tut().st.funcao, e.tut().st.passo], ['foco', 0]);
  await chatAdv(e, '/tutorial sair');
});

test('movimento reduzido e Modo Trabalho: o tutorial continua funcionando; menu de ajuda e comando existem', async () => {
  const e = env({ auto: false });
  e.companion.setReducedMotion(true);
  e.companion.enterInteraction('test');
  const r = await chatAdv(e, '/tutorial movimento reduzido');
  assert.match(r.text, /^Movimento reduzido/);
  assert.ok(e.said.some((x) => /^Movimento reduzido/.test(x)), 'balão aparece com movimento reduzido');
  assert.doesNotMatch(e.companion.behavior.anim || '', /walk|corr|gira/i);
  e.companion.setReducedMotion(false); // ela mexeu na opção do Windows: o passo anda
  e.clock.advance(1300);
  assert.equal(e.tut().st.passo, 1);
  await chatAdv(e, '/tutorial sair');

  // Pela bandeja ("Tutorial").
  const b = env({ auto: false });
  assert.equal(b.companion.openTutorial(), true);
  assert.equal(b.companion.interaction, true);
  assert.ok(b.said.some((x) => /^Conversar comigo/.test(x)));
  assert.match(read('src/main/tray.js'), /label: 'Tutorial', click: \(\) => actions\.tutorial\(\)/);
  assert.match(read('src/main/main.js'), /tutorial: \(\) => companion\.openTutorial\(\)/);
  assert.ok(commandMenu({ petVisible: true }).some((c) => c.cmd === '/tutorial'));
  assert.equal(parseCommand('/ajuda'), 'tutorial');

  // No Modo Trabalho o passo fica na conversa, sem balão.
  const w = env({ auto: false });
  w.companion.enterInteraction('test');
  await chatAdv(w, '/tutorial trabalho');
  await chatAdv(w, '/trabalho');
  w.said.length = 0;
  w.clock.advance(1300);
  assert.equal(w.tut().st.passo, 1);
  assert.deepEqual(w.said.filter((x) => /Modo Trabalho \(/.test(x)), [], 'nenhum balão no Modo Trabalho');
  assert.ok(conversa(w).some((x) => /passo 2 de 3/.test(x)));
});
