import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePersonality, phraseFilter, InstagramWatcher, dailyReminder, profileVars, PERSONALITY_DEFAULTS } from '../../src/core/personality.js';
import { PhraseBook } from '../../src/core/phrases.js';
import { detectIntent } from '../../src/core/dialogue/scripted-provider.js';
import { makeEnv, loadJSON, seededRng } from './helpers.js';
import { chatAdv } from './helpers.js';

const PHRASES = loadJSON('assets/dialogue/pt-BR.json');
const settle = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

test('perfil: padrões e validação', () => {
  const { settings, issues } = sanitizePersonality({ version: 2, palavroes: 'muitos', instagram: { ativo: false, intervaloMinSeg: 1 }, lembreteComida: { inicio: 22, fim: 8 } });
  assert.equal(settings.palavroes, 'ocasional');
  assert.equal(settings.instagram.ativo, false);
  assert.equal(settings.instagram.intervaloMinSeg, 10);
  assert.equal(settings.lembreteComida.inicio, 10);
  assert.equal(settings.lembreteComida.fim, 21);
  assert.ok(issues.length >= 2);
  assert.equal(PERSONALITY_DEFAULTS.instagram.intervaloMinSeg, 120);
  const P = PERSONALITY_DEFAULTS;
  assert.equal(P.nomeCompanion, 'JoJo');
  assert.deepEqual(profileVars(P, 'serio'), { nome: 'Emanuele', vocativo: ', Emanuele', companion: 'JoJo', apoio: 'João' });
  assert.equal(profileVars(P, 'brincadeira').nome, 'Manu');
  // Perfil de versão antiga (menu Personalidade saiu da tela): volta ao padrão do desenvolvedor,
  // mantendo só o estado interno (ex.: fantasia escolhida no chat).
  const old = sanitizePersonality({ version: 1, nomeSerio: 'Mel', humorDrogas: false, instrucoes: 'outra', festas: { estilo: 'comportada' } }).settings;
  assert.equal(old.nomeSerio, 'Emanuele');
  assert.equal(old.humorDrogas, true);
  assert.equal(old.instrucoes, P.instrucoes);
  assert.equal(old.festas.estilo, 'comportada');
  assert.match(P.instrucoes, /quatro vezes por dia/);
  assert.match(P.instrucoes, /treinar é essencial/);
});

test('frases: sem palavrões nem humor com drogas quando desligados; lembrete de comida não insulta o corpo dela', () => {
  const pb = new PhraseBook(PHRASES, { rng: seededRng(2), filter: phraseFilter({ palavroes: 'nenhum', humorDrogas: false }) });
  const bad = /porra|caralho|merda|puta|escobar|scarface|cheir|cocaína/i;
  for (const cat of Object.keys(PHRASES.categories)) {
    for (let i = 0; i < 20; i++) {
      const p = pb.pick(cat, { vocativo: '', nome: 'você', atalho: 'Ctrl', companion: 'JoJo', apoio: 'João' });
      if (p) assert.ok(!bad.test(p.text), `${cat}: ${p.text}`);
    }
  }
  const all = JSON.stringify(PHRASES.categories);
  // Sem pudor no geral; só o lembrete de comida (dirigido a ela) não insulta corpo/peso.
  const lembrete = JSON.stringify(loadJSON('assets/dialogue/pt-BR.json').categories.foodReminder);
  assert.ok(!/gord|magr|barriga|peso|engord/i.test(lembrete), 'lembrete não insulta o corpo da Emanuele');
  for (const c of ['instagram', 'foodReminder', 'achievement', 'quietAck', 'scare']) assert.ok(PHRASES.categories[c], c);
});

test('fiscal do Instagram: ao abrir e enquanto continua usando, com intervalo mínimo', () => {
  const w = new InstagramWatcher();
  const cfg = { ativo: true, intervaloMinSeg: 120 };
  assert.equal(w.update(0, true, cfg), true, 'abriu');
  assert.equal(w.update(1000, true, cfg), false, 'continua aberto: não repete logo');
  assert.equal(w.update(2000, false, cfg), false);
  assert.equal(w.update(30000, true, cfg), false, 'voltou antes de 2 min');
  assert.equal(w.update(125000, true, cfg), true, 'continua usando depois do intervalo: bronca de novo');
  assert.equal(new InstagramWatcher().update(0, true, { ativo: false }), false, 'desligado');
  // Não podia falar na hora (pausado/fugindo): a bronca fica pendente.
  const p = new InstagramWatcher();
  assert.equal(p.update(0, true, cfg, false), false);
  assert.equal(p.update(3000, true, cfg, true), true, 'sai assim que puder');
});

test('lembrete diário: uma vez por dia, dentro da faixa, horário sorteado', () => {
  const cfg = { ativo: true, inicio: 10, fim: 21, ultimoDia: null, horarioDeHoje: null };
  let state = { ...cfg };
  let fired = 0;
  let firedAt = null;
  for (let m = 0; m < 24 * 60; m += 5) {
    const d = new Date(2026, 9, 29, Math.floor(m / 60), m % 60);
    const r = dailyReminder(d, state, seededRng(m + 1));
    state = { ...state, ...r.state };
    if (r.due) {
      fired++;
      firedAt = d.getHours();
    }
  }
  assert.equal(fired, 1);
  assert.ok(firedAt >= 10 && firedAt < 21, `disparou às ${firedAt}h`);
  // No dia seguinte dispara de novo.
  const r2 = dailyReminder(new Date(2026, 9, 30, 20, 59), state, () => 0);
  assert.equal(r2.due, true);
  assert.equal(dailyReminder(new Date(2026, 9, 31, 9, 0), { ...cfg, ativo: false }).due, false);
});

test('companion: Instagram aberto → bronca com olhar de julgamento; silêncio respeitado', async () => {
  const e = makeEnv();
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  e.companion.hideBubble();
  assert.equal(e.companion.onForeground({ instagram: true }), true);
  await settle();
  e.clock.advance(50);
  assert.ok(['judge', 'lecture'].includes(e.companion.behavior.state), e.companion.behavior.state);
  const esc = (t) => t.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}|\{\w+\}/g, '.*');
  const patterns = PHRASES.categories.instagram.lines.map((l) => new RegExp(`^${esc(typeof l === 'string' ? l : l.t)}$`));
  const said = e.companion.bubble && e.companion.bubble.text;
  assert.ok(said && patterns.some((re) => re.test(said)), `fala: ${said}`);
  // Continua no Instagram: nada novo.
  assert.equal(e.companion.onForeground({ instagram: true }), false);
  // Modo silencioso: não dá bronca.
  const q = makeEnv({ settings: { quietMode: true } });
  q.companion.start();
  q.clock.advance(3000);
  assert.equal(q.companion.onForeground({ instagram: true }), false);
});

test('companion: 4 refeições por dia (café, almoço, lanche, jantar) + treino, cada uma uma vez', async () => {
  const e = makeEnv();
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  const cats = [];
  const orig = e.companion._nag.bind(e.companion);
  e.companion._nag = (c, now) => {
    cats.push(c);
    return orig(c, now);
  };
  for (let m = 6 * 60; m < 23 * 60; m += 1) {
    e.companion.checkDailyReminder(new Date(2026, 9, 29, Math.floor(m / 60), m % 60));
    e.clock.advance(10);
  }
  assert.deepEqual(cats.filter((c) => c.startsWith('refeicao_')), ['refeicao_cafe', 'refeicao_almoco', 'refeicao_lanche', 'refeicao_jantar']);
  assert.equal(cats.filter((c) => c === 'treinoLembrete').length, 1);
  const st = e.personality.get().lembreteComida.refeicoes;
  for (const id of ['cafe', 'almoco', 'lanche', 'jantar']) assert.equal(st[id].ultimoDia, '2026-10-29', id);
  // Os lembretes dirigidos a ela não insultam o corpo.
  const P = loadJSON('assets/dialogue/pt-BR.json').categories;
  for (const c of ['refeicao_cafe', 'refeicao_almoco', 'refeicao_lanche', 'refeicao_jantar', 'treinoLembrete']) {
    assert.ok(!/gord|magr|barriga|peso|engord/i.test(JSON.stringify(P[c])), c);
  }
});

test('conversa: silêncio liga o modo silencioso; conquista flexiona; susto teatral', async () => {
  assert.equal(detectIntent('fica quieto'), 'quiet');
  assert.equal(detectIntent('consegui terminar o relatório'), 'achievement');
  assert.equal(detectIntent('me assusta'), 'scare');
  assert.equal(detectIntent('treino de perna hoje'), 'gym');
  const e = makeEnv();
  e.companion.start();
  e.clock.advance(2000);
  e.companion.enterInteraction();
  let r = await chatAdv(e, 'consegui!');
  assert.equal(r.action, 'flex');
  // Conquista: animação "Tarefa finalizada" do catálogo (flexiona com confete).
  assert.equal(e.companion.behavior.state, 'act');
  assert.match(e.companion.behavior.anim, /^cat_tarefaFinalizada/);
  r = await chatAdv(e, 'me assusta');
  assert.equal(e.companion.behavior.state, 'scare');
  r = await chatAdv(e, 'silêncio');
  assert.equal(r.action, 'quiet');
  assert.equal(e.store.get().quietMode, true);
});

test('falas: tom sério usa Emanuele, brincadeira usa Manu; toda fala com reação existente', async () => {
  const { STATES } = await import('../../src/core/behavior.js');
  const pb = new PhraseBook(PHRASES, { rng: seededRng(5) });
  const vars = (tone) => ({ atalho: 'Ctrl + Alt + J', musica: 'Música', artista: 'Artista', titulo: 'Reunião', hora: '9h', min: '10', pausa: '5', ciclo: '1', total: '4', remedio: 'Vitamina D', n: '3', busca: 'creatina', titulo: 'Reunião', habito: 'treino', dias: '4', bloco: 'treino', ficha: 'A', exercicio: 'supino', carga: '40', antes: '37,5', tema: 'fotossíntese', acertos: '2', energia: '3', ...profileVars(PERSONALITY_DEFAULTS, tone) });
  for (const [cat, def] of Object.entries(PHRASES.categories)) {
    if (def.reaction) assert.ok(STATES[def.reaction], `${cat}: reação ${def.reaction}`);
    for (const l of def.lines) if (typeof l === 'object' && l.reaction) assert.ok(STATES[l.reaction], `${cat}: ${l.reaction}`);
    for (let i = 0; i < 15; i++) {
      const p = pb.pick(cat, vars);
      if (!p) continue;
      assert.ok(!/\{\w+\}/.test(p.text), `variável sem valor: ${p.text}`);
      if (p.tone === 'brincadeira') assert.ok(!p.text.includes('Emanuele') || cat === 'greeting' || cat === 'achievement' || cat === 'instagram', `${cat}: ${p.text}`);
      if (p.tone === 'serio') assert.ok(!p.text.includes('Manu'), `${cat}: ${p.text}`);
    }
  }
});

test('conversa: chorando/triste → falar com o João, Emanuele, com acolhimento; crise → CVV 188', async () => {
  assert.equal(detectIntent('tô chorando'), 'sad');
  assert.equal(detectIntent('estou muito triste hoje'), 'sad');
  assert.equal(detectIntent('to na bad'), 'sad');
  assert.equal(detectIntent('não quero mais viver'), 'crisis');
  assert.equal(detectIntent('tô em crise'), 'distress');
  assert.equal(detectIntent('não aguento mais, tô surtando'), 'distress');
  assert.equal(detectIntent('crise de ansiedade agora'), 'distress');
  const e = makeEnv();
  e.companion.start();
  e.clock.advance(2000);
  e.companion.enterInteraction();
  let r = await chatAdv(e, 'hoje eu chorei muito, tô triste');
  assert.match(r.text, /João/);
  assert.match(r.text, /Emanuele/);
  assert.equal(r.action, 'comfort');
  assert.equal(e.companion.behavior.state, 'comfort');
  r = await chatAdv(e, 'tô em crise, emocionalmente mal');
  assert.match(r.text, /João/);
  assert.match(r.text, /cuidar de você/);
  assert.equal(r.action, 'comfort');
  r = await chatAdv(e, 'quero morrer');
  assert.match(r.text, /João/);
  assert.match(r.text, /188/);
  r = await chatAdv(e, 'vamos brincar');
  assert.match(r.text, /Manu|Cardio/);
  r = await chatAdv(e, 'qual é o seu nome?');
  assert.match(r.text, /JoJo/);
});

test('expressão coerente: bronca do Instagram com julgamento ou dedo em riste; cumprimento acena', async () => {
  const e = makeEnv();
  e.companion.start();
  e.env.cursor = { x: 5, y: 5 };
  e.clock.advance(3000);
  for (let i = 0; i < 6; i++) {
    e.companion.hideBubble();
    e.companion.behavior.request('idle', { now: e.clock.now(), force: true });
    e.companion.sayCategory('instagram');
    assert.ok(['judge', 'lecture'].includes(e.companion.behavior.state), e.companion.behavior.state);
    e.clock.advance(50);
  }
  e.companion.behavior.request('idle', { now: e.clock.now(), force: true });
  e.companion.sayCategory('sadSupport', { force: true });
  assert.equal(e.companion.behavior.state, 'comfort');
  e.companion.behavior.request('idle', { now: e.clock.now(), force: true });
  e.companion.sayCategory('interactEnter', { force: true });
  assert.equal(e.companion.behavior.state, 'wave');
  // Reação não interrompe a fuga.
  e.companion.behavior.request('flee', { now: e.clock.now(), force: true });
  assert.equal(e.companion.react('judge'), false);
});
