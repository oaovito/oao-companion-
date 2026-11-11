// Bloqueio do Discord, parte de reação: bronca, fechamento, desinstalação pelo
// desinstalador oficial, segunda fala e histórico. Processos, registro e abas
// são simulados: nenhum teste encerra ou desinstala nada de verdade.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEnv } from './helpers.js';
import { DiscordBlocker, DiscordHistory, sanitizeHistory, HISTORY_MAX, buildScoldPrompt, acceptScold } from '../../src/core/discord-blocker.js';
import { createDiscordSystem } from '../../src/main/discord-system.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REG = (pasta = 'Discord', hive = 'HKCU') => ({ variante: { Discord: 'discord', DiscordPTB: 'ptb', DiscordCanary: 'canary' }[pasta], hive, nome: pasta, uninstall: `"C:\\Users\\m\\AppData\\Local\\${pasta}\\Update.exe" --uninstall` });

/** PC simulado: processos abertos e programas instalados de mentira. */
function fakePc({ abertas = [], instaladas = [], uninstallOk = true, removeOnUninstall = true, killWorks = true } = {}) {
  const pc = { abertas: [...abertas], instaladas: [...instaladas], calls: [], uninstallOk, removeOnUninstall, killWorks, failRunning: false };
  pc.sys = {
    running: async () => { pc.calls.push('running'); if (pc.failRunning) throw new Error('detector_unavailable'); return [...pc.abertas]; },
    installed: async () => { pc.calls.push('installed'); return pc.instaladas.map((e) => ({ ...e })); },
    kill: async () => { pc.calls.push('kill'); const detected = pc.abertas.length; if (pc.killWorks) pc.abertas = []; return { detected, remaining: pc.abertas.length }; },
    uninstall: async (cmd) => {
      pc.calls.push(`uninstall:${cmd.file} ${cmd.args.join(' ')}`);
      if (pc.uninstallOk instanceof Error) throw pc.uninstallOk;
      if (!pc.uninstallOk) return { ok: false, erro: 'erro_do_desinstalador' };
      if (pc.removeOnUninstall) pc.instaladas = pc.instaladas.filter((e) => e.variante !== cmd.variante);
      return { ok: true };
    },
  };
  return pc;
}

function blocker(pc, { on = true, t0 = Date.UTC(2026, 10, 11, 14, 30) } = {}) {
  const st = { on, t: t0, events: [], saved: null };
  const history = new DiscordHistory({ save: (items) => { st.saved = items; } });
  const b = new DiscordBlocker({
    sys: pc.sys, enabled: () => st.on, history, now: () => st.t,
    onScold: async (x) => { st.events.push(['bronca', x.origem, ...x.alvos]); pc.calls.push('bronca'); },
    onResult: async (r) => { st.events.push(['resultado', r]); pc.calls.push('resultado'); },
  });
  return { b, st, history };
}

test('chave desligada: nenhuma detecção e nenhuma ação, nem no app nem nas abas', async () => {
  const pc = fakePc({ abertas: ['discord'], instaladas: [REG()] });
  const { b, st, history } = blocker(pc, { on: false });
  assert.equal(await b.check(), null);
  assert.deepEqual(await b.onBridge({ t: 'abas', n: 2, nav: 'chrome' }), { t: 'desligado' });
  assert.deepEqual(await b.onBridge({ t: 'fechadas', n: 2, falhas: 0, nav: 'chrome' }), { t: 'desligado' });
  assert.deepEqual(pc.calls, [], 'nem a lista de processos é lida');
  assert.deepEqual(st.events, []);
  assert.deepEqual(history.list(), []);
});

test('Discord aberto e instalado: bronca, encerra, desinstala pelo desinstalador oficial, confirma e registra', async () => {
  const pc = fakePc({ abertas: ['discord'], instaladas: [REG()] });
  const { b, st, history } = blocker(pc);
  const res = await b.check();
  assert.deepEqual(pc.calls, ['running', 'installed', 'bronca', 'kill', 'uninstall:C:\\Users\\m\\AppData\\Local\\Discord\\Update.exe --uninstall', 'installed', 'resultado'], 'bronca antes de agir; confirmação só depois de conferir');
  assert.deepEqual(res, { origem: 'app', encerradas: ['discord'], desinstaladas: ['discord'], falhas: [] });
  assert.deepEqual(st.events[0], ['bronca', 'app', 'discord']);
  assert.deepEqual(history.list().map((h) => [h.em, h.origem, h.alvo, h.acao]), [
    ['2026-11-11T14:30:00.000Z', 'app', 'discord', 'desinstalado'],
    ['2026-11-11T14:30:00.000Z', 'app', 'discord', 'encerrado'],
  ]);
  assert.equal(st.saved.length, 2, 'o histórico é salvo a cada ação');
  // Depois de removido não há mais nada a fazer.
  pc.calls.length = 0;
  assert.equal(await b.check(), null);
  assert.deepEqual(pc.calls, ['running']);
});

test('PTB e Canary instalados sem estar abertos: desinstala cada um; só processo aberto sem instalação: só encerra', async () => {
  let pc = fakePc({ instaladas: [REG('DiscordPTB'), REG('DiscordCanary')] });
  let { b, history } = blocker(pc);
  const res = await b.check();
  assert.deepEqual(res.desinstaladas, ['ptb', 'canary']);
  assert.ok(!pc.calls.includes('kill'), 'sem processo aberto não há o que encerrar');
  assert.deepEqual(pc.calls.filter((c) => c.startsWith('uninstall')), ['uninstall:C:\\Users\\m\\AppData\\Local\\DiscordPTB\\Update.exe --uninstall', 'uninstall:C:\\Users\\m\\AppData\\Local\\DiscordCanary\\Update.exe --uninstall']);
  assert.equal(history.list().length, 2);

  pc = fakePc({ abertas: ['canary'] });
  ({ b, history } = blocker(pc));
  assert.deepEqual(await b.check(), { origem: 'app', encerradas: ['canary'], desinstaladas: [], falhas: [] });
  assert.ok(!pc.calls.some((c) => c.startsWith('uninstall')));
  assert.deepEqual(history.list().map((h) => h.acao), ['encerrado']);
});

test('desinstalação falhou: processo encerrado, erro registrado, usuária avisada, nova tentativa só depois de 30 min', async () => {
  for (const [caso, opts, erro] of [
    ['desinstalador devolveu erro', { uninstallOk: false }, 'erro_do_desinstalador'],
    ['desinstalador lançou erro', { uninstallOk: new Error('permissao_negada') }, 'permissao_negada'],
    ['rodou mas o Windows ainda lista', { removeOnUninstall: false }, 'ainda_instalado'],
  ]) {
    const pc = fakePc({ abertas: ['discord'], instaladas: [REG()], ...opts });
    const { b, st, history } = blocker(pc);
    const res = await b.check();
    assert.deepEqual(res.encerradas, ['discord'], caso);
    assert.deepEqual(res.desinstaladas, [], caso);
    assert.deepEqual(res.falhas, [{ alvo: 'discord', acao: 'falha_desinstalar', erro }], caso);
    assert.deepEqual(history.list()[0], { em: '2026-11-11T14:30:00.000Z', origem: 'app', alvo: 'discord', acao: 'falha_desinstalar', erro }, caso);
    assert.equal(st.events.at(-1)[0], 'resultado', 'o aviso de falha é entregue');

    // Ela reabre o Discord 5 min depois: encerra de novo, mas não martela o desinstalador.
    pc.calls.length = 0; pc.abertas = ['discord']; st.t += 5 * 60e3;
    const de_novo = await b.check();
    assert.deepEqual(de_novo, { origem: 'app', encerradas: ['discord'], desinstaladas: [], falhas: [] }, caso);
    assert.ok(!pc.calls.some((c) => c.startsWith('uninstall')), caso);
    // Sem nada aberto e ainda dentro da espera: silêncio total.
    pc.calls.length = 0; st.t += 5 * 60e3;
    assert.equal(await b.check(), null, caso);
    assert.ok(!pc.calls.includes('bronca'), caso);
    // Passados 30 min da falha, tenta de novo.
    pc.calls.length = 0; st.t += 25 * 60e3; pc.uninstallOk = true; pc.removeOnUninstall = true;
    assert.deepEqual((await b.check()).desinstaladas, ['discord'], caso);
  }
});

test('desinstalador que não é o oficial nunca é executado; processo que resiste vira falha registrada', async () => {
  let pc = fakePc({ abertas: ['discord'], instaladas: [{ variante: 'discord', hive: 'HKCU', nome: 'Discord', uninstall: 'cmd.exe /c rmdir /s /q "C:\\Users\\m\\AppData\\Local\\Discord"' }] });
  let { b, history } = blocker(pc);
  let res = await b.check();
  assert.ok(!pc.calls.some((c) => c.startsWith('uninstall')), 'nada de apagar pasta na mão');
  assert.deepEqual(res.falhas, [{ alvo: 'discord', acao: 'falha_desinstalar', erro: 'desinstalador_desconhecido' }]);
  assert.deepEqual(res.encerradas, ['discord']);

  pc = fakePc({ abertas: ['ptb'], killWorks: false });
  ({ b, history } = blocker(pc));
  res = await b.check();
  assert.deepEqual(res.falhas, [{ alvo: 'ptb', acao: 'falha_encerrar', erro: 'processo_resistiu' }]);
  assert.deepEqual(history.list().map((h) => [h.acao, h.erro]), [['falha_encerrar', 'processo_resistiu']]);
});

test('sem leitura confiável dos processos não age; desligar no meio interrompe; duas conferências não se atropelam', async () => {
  let pc = fakePc({ abertas: ['discord'], instaladas: [REG()] });
  pc.failRunning = true;
  let { b, st } = blocker(pc);
  assert.equal(await b.check(), null);
  assert.deepEqual(pc.calls, ['running']);

  pc = fakePc({ abertas: ['discord'], instaladas: [REG()] });
  ({ b, st } = blocker(pc));
  b.onScold = async () => { st.on = false; };
  assert.equal(await b.check(), null);
  assert.ok(!pc.calls.includes('kill') && !pc.calls.some((c) => c.startsWith('uninstall')));

  pc = fakePc({ abertas: ['discord'], instaladas: [REG()] });
  ({ b, st } = blocker(pc));
  const [a, c] = await Promise.all([b.check(), b.check()]);
  assert.ok(a && c === null);
  assert.equal(pc.calls.filter((x) => x === 'kill').length, 1);
});

test('abas: manda fechar e dá a bronca; o fechamento confirmado entra no histórico com o navegador', async () => {
  const pc = fakePc();
  const { b, st, history } = blocker(pc);
  assert.deepEqual(await b.onBridge({ t: 'abas', n: 2, nav: 'edge' }), { t: 'fechar' });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(st.events, [['bronca', 'aba', 'edge']]);
  assert.deepEqual(history.list(), [], 'só registra o que foi feito de fato');
  assert.deepEqual(await b.onBridge({ t: 'fechadas', n: 1, falhas: 1, nav: 'edge' }), { t: 'ok' });
  assert.deepEqual(history.list().map((h) => [h.origem, h.alvo, h.acao, h.n, h.erro]), [['aba', 'edge', 'falha_aba', 1, 'aba_nao_fechou'], ['aba', 'edge', 'aba_fechada', 1, undefined]]);
  assert.deepEqual(st.events.at(-1), ['resultado', { origem: 'aba', nav: 'edge', fechadas: 1, falhas: 1 }]);
  assert.deepEqual(pc.calls.filter((c) => c !== 'bronca' && c !== 'resultado'), [], 'aba não encerra processo nem desinstala nada');
});

test('histórico: guarda só entradas válidas, no máximo 200, mais recentes primeiro, e sobrevive a reabrir', () => {
  let disk = [{ em: '2026-11-10T10:00:00.000Z', origem: 'app', alvo: 'discord', acao: 'encerrado' }, { em: 'ontem', origem: 'app', alvo: 'discord', acao: 'encerrado' }, { em: '2026-11-10T10:00:00.000Z', origem: 'app', alvo: 'spotify', acao: 'encerrado' }, { em: '2026-11-10T10:00:00.000Z', origem: 'aba', alvo: 'chrome', acao: 'formatar_disco' }, null, 'x'];
  const h = new DiscordHistory({ load: () => disk, save: (items) => { disk = items; } });
  assert.equal(h.list().length, 1);
  assert.equal(h.add({ em: '2026-11-11T09:00:00.000Z', origem: 'aba', alvo: 'brave', acao: 'aba_fechada', n: 3, url: 'https://discord.com/segredo' }).url, undefined, 'nenhum endereço é guardado');
  assert.equal(h.add({ origem: 'aba', alvo: 'brave', acao: 'aba_fechada' }), null);
  for (let i = 0; i < HISTORY_MAX + 20; i++) h.add({ em: new Date(Date.UTC(2026, 10, 12, 0, 0, i)).toISOString(), origem: 'app', alvo: 'canary', acao: 'encerrado' });
  assert.equal(h.list().length, HISTORY_MAX);
  assert.equal(h.list()[0].em, new Date(Date.UTC(2026, 10, 12, 0, 0, HISTORY_MAX + 19)).toISOString());
  assert.equal(new DiscordHistory({ load: () => disk }).list().length, HISTORY_MAX);
  assert.deepEqual(sanitizeHistory('lixo'), []);
});

test('bronca do modelo: pedido pede variação; resposta fora do combinado é recusada', () => {
  const p = buildScoldPrompt({ origem: 'app', nome: 'Emanuele', ultima: 'Discord de novo?', angulo: 'treino' });
  assert.match(p, /desinstalar o aplicativo/);
  assert.match(p, /Não repita esta: "Discord de novo\?"/);
  assert.match(p, /puxe para: treino/);
  assert.match(buildScoldPrompt({ origem: 'aba', nome: 'Emanuele' }), /fechar só essa aba/);
  assert.equal(acceptScold('  "Discord aberto e o caderno fechado. Inverte isso."  '), 'Discord aberto e o caderno fechado. Inverte isso.');
  for (const t of ['', 'Não.', 'Vai estudar agora, sem conversa.', 'Discord? Sua burra, fecha isso.', 'Discord 😡 fecha isso agora mesmo.', 'Olha https://discord.com e fecha o Discord.', `Discord ${'a'.repeat(200)}`]) assert.equal(acceptScold(t), null, t);
  assert.equal(acceptScold('Discord de novo? Fecha.', { ultima: 'discord de novo? fecha.' }), null, 'não repete a anterior');
});

function started(extra = {}) {
  const e = makeEnv({ profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } }, ...extra });
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  e.companion.reminders.apply({ tipo: 'agua', ativo: false });
  const said = [];
  const orig = e.companion.say.bind(e.companion);
  e.companion.say = (t, k, o) => { const ok = orig(t, k, o); if (ok) said.push(t); return ok; };
  return { ...e, said };
}
const chatDe = (e) => e.companion.conversations.current().messages.map((m) => m.text);

test('JoJo: bronca do modelo quando é válida, fala do arquivo quando não é; animação de bronca; nunca duas seguidas', async () => {
  const e = started();
  const pedidos = [];
  e.companion.dialogue.llm = { tarefa: async (p) => { pedidos.push(p); return '{"texto":"Discord, Emanuele? Fecha isso e abre o caderno. Eu espero.","acao":"angry","tom":"serio"}'; } };
  const fala = await e.companion.discordScold({ origem: 'app' });
  assert.equal(fala, 'Discord, Emanuele? Fecha isso e abre o caderno. Eu espero.');
  assert.deepEqual(e.said, [fala]);
  assert.match(e.companion.behavior.anim, /^cat_broncaDiscord/);
  assert.match(pedidos[0].system, /tubarão/, 'a personalidade vem da definição única do projeto');
  assert.match(pedidos[0].user, /Discord aberto no computador/);
  assert.ok(chatDe(e).includes(fala));
  assert.equal(await e.companion.discordScold({ origem: 'app' }), null, 'menos de 20 s: não empilha bronca');

  // Modelo fora do personagem, quebrado ou ausente: fala do arquivo de falas.
  const linhas = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/dialogue/pt-BR.json'), 'utf8'));
  const cats = linhas.categories || linhas.categorias || linhas;
  const doArquivo = (cat) => (cats[cat] || Object.values(linhas).find((v) => v && v[cat])[cat]).lines.map((l) => (typeof l === 'string' ? l : l.t).replace('{nome}', 'Emanuele'));
  for (const llm of [{ tarefa: async () => '{"texto":"Como uma IA, posso ajudar você a fechar o Discord."}' }, { tarefa: async () => '{"texto":"Vai estudar."}' }, { tarefa: async () => { throw new Error('tempo esgotado'); } }, null]) {
    e.clock.advance(21e3);
    e.companion.dialogue.llm = llm;
    const t = await e.companion.discordScold({ origem: 'aba' });
    assert.ok(doArquivo('discordBroncaAba').includes(t), t);
  }
  // Variação: várias broncas do arquivo, sem repetir a anterior.
  const vistas = [];
  for (let i = 0; i < 8; i++) { e.clock.advance(21e3); vistas.push(await e.companion.discordScold({ origem: 'app' })); }
  assert.ok(new Set(vistas).size >= 3, vistas.join(' | '));
  for (let i = 1; i < vistas.length; i++) assert.notEqual(vistas[i], vistas[i - 1]);
});

test('JoJo: segunda fala confirma depois da bronca; falha é avisada sem fingir sucesso', async () => {
  const e = started();
  e.companion.dialogue.llm = null;
  const bronca = await e.companion.discordScold({ origem: 'app' });
  const ok = e.companion.discordResult({ origem: 'app', encerradas: ['discord'], desinstaladas: ['discord'], falhas: [] });
  assert.match(ok, /Discord/);
  assert.match(ok, /desinstal/i);
  assert.deepEqual(e.said, [bronca], 'a confirmação espera a bronca ser lida');
  e.clock.advance(5000);
  assert.deepEqual(e.said, [bronca, ok]);
  assert.match(e.companion.behavior.anim, /^cat_discordResolvido/);

  e.clock.advance(30e3);
  const falha = e.companion.discordResult({ origem: 'app', encerradas: ['ptb'], desinstaladas: [], falhas: [{ alvo: 'ptb', acao: 'falha_desinstalar', erro: 'permissao_negada' }] });
  assert.match(falha, /Discord PTB/);
  assert.match(falha, /não (concluiu|consegui)/i);
  assert.doesNotMatch(falha, /desinstalei|fora do PC/i);
  assert.equal(e.said.at(-1), falha);

  e.clock.advance(30e3);
  assert.match(e.companion.discordResult({ origem: 'aba', nav: 'brave', fechadas: 1, falhas: 0 }), /Brave/);
  assert.match(e.companion.discordResult({ origem: 'aba', nav: 'chrome', fechadas: 0, falhas: 1 }), /Chrome.*não fechou|Não consegui fechar.*Chrome/);
  assert.match(e.companion.discordResult({ origem: 'app', encerradas: ['canary'], desinstaladas: [], falhas: [] }), /Discord Canary/);
  assert.match(e.companion.discordResult({ origem: 'app', encerradas: [], desinstaladas: [], falhas: [{ alvo: 'discord', acao: 'falha_encerrar', erro: 'processo_resistiu' }] }), /não fechou|resistiu/);
});

test('JoJo: Modo Trabalho e modo silencioso agem calados (fica na conversa, sem balão); movimento reduzido usa a versão suave', async () => {
  const e = started();
  e.companion.dialogue.llm = { tarefa: async () => { throw new Error('não deveria chamar o modelo sem poder falar'); } };
  e.companion.startWork({ perfil: 'trabalho' });
  e.clock.advance(2000);
  e.said.length = 0;
  const fala = await e.companion.discordScold({ origem: 'app' });
  assert.ok(fala);
  assert.deepEqual(e.said, [], 'nenhum balão no Modo Trabalho');
  assert.ok(chatDe(e).includes(fala), 'mas a fala fica registrada na conversa');
  assert.doesNotMatch(e.companion.behavior.anim || '', /broncaDiscord/);

  const q = started({ settings: { quietMode: true } });
  q.companion.dialogue.llm = null;
  const calado = await q.companion.discordScold({ origem: 'aba' });
  assert.deepEqual(q.said, []);
  assert.ok(chatDe(q).includes(calado));

  const r = started();
  r.companion.dialogue.llm = null;
  r.companion.setReducedMotion(true);
  await r.companion.discordScold({ origem: 'app' });
  assert.match(r.companion.behavior.anim, /^cat_broncaDiscord/);
  assert.match(r.companion.behavior.anim, /suave/i, 'movimento reduzido: intensidade suave');
});

test('JoJo: histórico em texto, na voz dele, com data e hora', () => {
  const e = started();
  const linhas = e.companion.discordHistoryLines([
    { em: '2026-11-11T14:30:00.000Z', origem: 'app', alvo: 'ptb', acao: 'falha_desinstalar', erro: 'permissao_negada' },
    { em: '2026-11-11T14:30:00.000Z', origem: 'app', alvo: 'discord', acao: 'desinstalado' },
    { em: '2026-11-11T14:29:00.000Z', origem: 'aba', alvo: 'edge', acao: 'aba_fechada', n: 2 },
  ]);
  assert.match(linhas[0].quando, /\d{2}\/\d{2}\/\d{4}.*\d{2}:\d{2}/);
  assert.match(linhas[0].texto, /Discord PTB instalado\. A desinstalação falhou: o Windows pediu permissão de administrador/);
  assert.equal(linhas[0].ok, false);
  assert.match(linhas[1].texto, /Vi o Discord instalado\. Desinstalei pelo desinstalador do próprio aplicativo\./);
  assert.match(linhas[2].texto, /Edge \(abas: 2\)/);
  assert.ok(linhas.every((l) => !/\{\w+\}/.test(l.texto)), 'nenhuma variável sem preencher');
});

test('catálogo: as duas animações do bloqueio existem, com quadro para movimento reduzido e espaço medido', () => {
  const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/catalog/discord-animations.json'), 'utf8'));
  assert.deepEqual(cat.itens.map((i) => i.id), ['broncaDiscord', 'discordResolvido']);
  const room = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/animations/jojo.room.json'), 'utf8')).anims;
  for (const it of cat.itens) {
    assert.ok(it.estatico > 0 && it.estatico < 1, it.id);
    assert.equal(it.loop, false);
    assert.equal(it.som, undefined);
    assert.ok(room[`cat_${it.id}`], `${it.id} sem espaço medido`);
  }
});

test('sistema: o desinstalador roda exatamente como registrado; admin passa pelo pedido do Windows; em teste nunca executa', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-discord-'));
  const calls = [];
  let fail = null, reg = '[]';
  const execFile = (file, args, opts, cb) => { calls.push({ file, args, env: opts.env }); if (file === 'powershell.exe' && /Uninstall'/.test(args.at(-1))) return cb(null, reg); cb(fail, ''); };
  const mk = (extra = {}) => createDiscordSystem({ userData: dir, root: ROOT, execFile, wait: async () => {}, allowUninstall: true, getDetector: () => ({ available: true, closeDiscord: async (o) => ({ detected: 1, remaining: 0, forced: o.force ? 1 : 0 }) }), ...extra });
  const cmd = { variante: 'discord', file: 'C:\\Users\\m\\AppData\\Local\\Discord\\Update.exe', args: ['--uninstall'], admin: false };

  assert.deepEqual(await mk().uninstall(cmd), { ok: true });
  assert.deepEqual([calls[0].file, calls[0].args], [cmd.file, ['--uninstall']]);
  assert.ok(!calls.some((c) => /rmdir|Remove-Item|del |rd /i.test([c.file, ...c.args].join(' '))), 'nenhuma pasta apagada à mão');

  calls.length = 0;
  assert.deepEqual(await mk().uninstall({ variante: 'ptb', file: 'C:\\Program Files\\DiscordPTB\\Update.exe', args: ['--uninstall'], admin: true }), { ok: true });
  assert.equal(calls[0].file, 'powershell.exe');
  assert.match(calls[0].args.at(-1), /-Verb RunAs/, 'pedido de administrador pelo fluxo do Windows');
  assert.doesNotMatch(calls[0].args.at(-1), /Hidden|Bypass|schtasks|DiscordPTB/i, 'sem esconder o pedido e sem caminho colado no comando');
  assert.equal(calls[0].env.JOJO_DISCORD_FILE, 'C:\\Program Files\\DiscordPTB\\Update.exe');
  assert.equal(calls[0].env.JOJO_DISCORD_ARGS, '--uninstall');
  fail = Object.assign(new Error('recusado'), { code: 1 });
  assert.deepEqual(await mk().uninstall({ variante: 'ptb', file: 'C:\\Program Files\\DiscordPTB\\Update.exe', args: ['--uninstall'], admin: true }), { ok: false, erro: 'permissao_negada' });
  fail = Object.assign(new Error('demorou'), { killed: true });
  assert.deepEqual(await mk().uninstall(cmd), { ok: false, erro: 'tempo_esgotado' });
  fail = null;

  // Comando adulterado depois da validação: recusado sem executar.
  calls.length = 0;
  for (const bad of [{ ...cmd, file: 'C:\\Windows\\System32\\cmd.exe' }, { ...cmd, args: ['--uninstall', '&', 'del'] }, { ...cmd, variante: 'canary' }, null]) assert.deepEqual(await mk().uninstall(bad), { ok: false, erro: 'desinstalador_desconhecido' });
  assert.deepEqual(calls, []);
  // Ambiente de teste do app: nunca executa.
  assert.deepEqual(await mk({ allowUninstall: false }).uninstall(cmd), { ok: false, erro: 'erro_do_desinstalador' });
  assert.deepEqual(calls, []);

  // Encerrar: pede o fechamento normal e autoriza encerrar o processo.
  assert.deepEqual(await mk().kill(), { detected: 1, remaining: 0, forced: 1 });
  await assert.rejects(mk({ getDetector: () => ({ available: false }) }).kill(), /detector_unavailable/);
  // Espera o registro ser limpo antes de dizer que terminou.
  reg = JSON.stringify([{ hive: 'HKCU', chave: 'Discord', nome: 'Discord', uninstall: '"C:\\Users\\m\\AppData\\Local\\Discord\\Update.exe" --uninstall' }]);
  let waits = 0;
  await mk({ wait: async () => { if (++waits === 2) reg = '[]'; } }).uninstall(cmd);
  assert.equal(waits, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});
