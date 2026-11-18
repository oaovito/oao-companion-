// Progressão ×10 (pedidos de 14 e 17/11/2026): números de XP ×10, 200 níveis com
// título próprio e ~10× mais jeitos de ganhar XP (bônus com nome), com o tempo de
// progressão idêntico ao da 0.47.0 (bônus não aceleram o nível).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Progress } from '../../src/core/catalog/antitedio.js';
import { XP_ESCALA, xpVisivel } from '../../src/core/xp-escala.js';
import { DD_BALANCE } from '../../src/core/darkest-dungeon.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ler = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const DATA = JSON.parse(ler('assets/catalog/progressao.json'));

/** Progressão com relógio controlado (parede e monotônico andam juntos). */
function prog({ state = null, inicio = '2026-11-16T10:00:00', data = DATA } = {}) {
  const r = { wall: new Date(inicio).getTime(), mono: 1000 };
  const salvos = [];
  const p = new Progress({ data, state, save: (st) => salvos.push(structuredClone(st)), now: () => r.mono, wallNow: () => r.wall, monotonicNow: () => r.mono });
  const passar = (ms) => { r.wall += ms; r.mono += ms; };
  const dia = () => { const d = new Date(r.wall); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  let n = 0;
  const ganhar = (source, amount = 10) => p.award({ id: `t:${++n}`, amount, source, day: dia(), label: 'teste' });
  const bonus = () => p.st.rewards.history.filter((e) => e.source === 'bonus');
  return { p, passar, dia, ganhar, bonus, salvos };
}

test('títulos: 200 níveis, cada um com nome próprio e referência de cultura pop', () => {
  assert.ok(DATA.niveis.length >= 200);
  assert.equal(new Set(DATA.niveis).size, DATA.niveis.length, 'nenhum título repetido');
  assert.ok(DATA.niveis.every((n) => typeof n === 'string' && n.trim() === n && n.length > 0 && n.length <= 40));
  assert.ok(DATA.niveis.every((n) => !/Patamar/.test(n)), 'acabou o "Megalodon — Patamar N"');
  assert.deepEqual(DATA.referencias.map((r) => r.titulo), DATA.niveis, 'uma referência por título');
  assert.equal(DATA.niveis[9], 'Megatubarão');
  assert.equal(DATA.niveis.at(-1), 'Tubarão (1975)');
});

test('escala ×10: mesma constante nas telas e na progressão; limiares da 0.47.0 ×10 em todos os níveis', () => {
  assert.equal(XP_ESCALA, 10);
  assert.equal(DATA.escalaXp, XP_ESCALA);
  assert.equal(xpVisivel(25), 250);
  const { p } = prog();
  // Limiares da 0.47.0 (60 por nível até o 10; depois 120·k(k+3)/2) ×10: o ritmo não muda.
  const antigo = (l) => (l <= 10 ? (l - 1) * 60 : 540 + 120 * (l - 10) * (l - 10 + 3) / 2);
  for (let l = 1; l <= DATA.niveis.length; l++) assert.equal(p.threshold(l), antigo(l) * 10, `nível ${l}`);
  assert.equal(DATA.curve.capFromLevel, undefined, 'sem teto que mude a curva');
  assert.equal(p.threshold(50), 1037400, 'o nível 50 da 0.47.0 (103.740) ×10');
  assert.equal(p.threshold(200), 22007400);
});

test('migração: o XP já ganho vira ×10 uma vez só e ela continua no mesmo nível', () => {
  const antigo = { xp: 2641, rewards: { ids: { a: true }, history: [{ id: 'a', amount: 20, source: 'todo', day: '2026-11-10', label: 'x', sequence: 1 }], sequence: 1 } };
  const { p, salvos } = prog({ state: antigo });
  assert.equal(p.st.xp, 26410);
  assert.equal(p.st.escalaXp, 10);
  assert.equal(p.st.rewards.history[0].amount, 200, 'histórico na escala nova');
  assert.equal(p.nivel, 14, 'mesmo nível de antes (14)');
  assert.equal(p.nomeNivel, DATA.niveis[13]);
  assert.equal(salvos.length, 1, 'gravado na hora');
  const outra = prog({ state: structuredClone(p.st) }).p;
  assert.equal(outra.st.xp, 26410, 'abrir de novo não multiplica outra vez');
  const nova = prog().p;
  assert.equal(nova.st.xp, 0);
  assert.equal(nova.st.escalaXp, 10);
});

test('crédito: a fonte manda o valor nominal e a progressão credita ×10; interação também', () => {
  const { p, ganhar } = prog({ data: { ...DATA, bonus: undefined } });
  const e = ganhar('todo', 20);
  assert.equal(e.amount, 200);
  assert.equal(p.st.xp, 200);
  p.xp('foco');
  assert.equal(p.st.xp, 200 + 150);
});

test('bônus: 238 jeitos novos de ganhar XP, cada um com nome próprio (17 regras × 14 atividades)', () => {
  const { p } = prog();
  const cat = p.bonusCatalogo;
  assert.equal(cat.length, 238);
  assert.equal(new Set(cat.map((c) => c.nome)).size, 238, 'nomes únicos');
  assert.ok(cat.every((c) => !c.nome.includes('{A}') && c.xp > 0 && c.xp <= 30));
  const fontesAntes = Object.keys(DATA.xp).length + ['todo', 'feeding', 'cleanup', 'care', 'darkest'].length + 8;
  assert.ok(cat.length >= fontesAntes * 10, `pelo menos 10× as ~${fontesAntes} fontes de antes`);
});

test('bônus: primeira do dia, trinca, janela, fim de semana, combo e no máximo um por ação', () => {
  const { p, ganhar, bonus, passar } = prog({ inicio: '2026-11-16T10:00:00' }); // segunda-feira, manhã
  ganhar('todo');
  assert.deepEqual(bonus().map((e) => [e.label, e.amount]), [['Bônus: Estreia do dia: Tarefa', 30]], 'a de maior valor entre as que casam');
  ganhar('todo');
  assert.equal(bonus().at(-1).label, 'Bônus: Segunda sem desculpa: Tarefa');
  ganhar('todo');
  assert.equal(bonus().at(-1).label, 'Bônus: Trinca do dia: Tarefa');
  ganhar('todo');
  assert.equal(bonus().at(-1).label, 'Bônus: Maré da manhã: Tarefa');
  ganhar('todo');
  assert.equal(bonus().at(-1).label, 'Bônus: Mão cheia: Tarefa');
  passar(5 * 60e3);
  ganhar('feeding');
  assert.equal(bonus().at(-1).label, 'Bônus: Combo de barbatana: Refeição', 'combo (4) vale mais que a estreia (3)');
  ganhar('todo'); // o teto do dia (6 bônus) já foi atingido: só o XP normal
  assert.equal(bonus().length, 6);
  assert.equal(p.st.bonus.qtd, 6);
  const antes = p.st.xp;
  for (let i = 0; i < 20; i++) ganhar('care', 1);
  assert.equal(p.st.xp - antes, 20 * 10, 'depois do teto, só o XP normal');
  assert.equal(p.snapshot(new Date('2026-11-16T10:10:00')).bonus.hoje, 6);
});

test('bônus: teto de XP por dia, sequência de dias, marcos uma vez na vida e nada de bônus em cima de bônus', () => {
  const { p, ganhar, bonus, passar } = prog({ inicio: '2026-11-17T09:00:00' });
  // Sequência: chat em 3 dias seguidos → "Três marés seguidas" no 3º dia.
  for (let d = 0; d < 3; d++) { ganhar('chat'); passar(864e5); }
  assert.ok(bonus().some((e) => e.label === 'Bônus: Três marés seguidas: Conversa'));
  // Marco 10: uma vez só na vida.
  const marcos = () => bonus().filter((e) => /Dez na conta: Missão/.test(e.label)).length;
  for (let i = 0; i < 30; i++) { ganhar('missao'); if (i % 5 === 4) passar(864e5); }
  assert.equal(marcos(), 1);
  assert.ok(bonus().every((e) => e.amount <= 300));
  assert.ok(p.st.rewards.history.every((e) => e.source !== 'bonus' || !/Bônus: Bônus/.test(e.label)), 'bônus não gera bônus');
  // Teto de XP por dia: nunca passa de 60 nominais (600 na tela).
  const porDia = {};
  for (const e of bonus()) porDia[e.day] = (porDia[e.day] || 0) + e.amount;
  assert.ok(Object.values(porDia).every((v) => v <= DATA.bonus.limites.xpPorDia * 10), JSON.stringify(porDia));
});

test('bônus: falha ao gravar o bônus não derruba a recompensa original', () => {
  let falhar = false;
  const r = { wall: new Date('2026-11-16T10:00:00').getTime(), mono: 1000 };
  const p = new Progress({ data: DATA, save: (_st, o) => { if (falhar && o?.immediate) throw new Error('disco'); }, now: () => r.mono, wallNow: () => r.wall, monotonicNow: () => r.mono });
  p.award({ id: 'a', amount: 10, source: 'todo', day: '2026-11-16', label: 'x' });
  const xp = p.st.xp;
  falhar = true;
  assert.throws(() => p.award({ id: 'b', amount: 10, source: 'todo', day: '2026-11-16', label: 'x' }));
  assert.equal(p.st.xp, xp, 'sem gravar, nada muda');
});

test('ritmo: o tempo de progressão é o da 0.47.0; bônus vão para a coleção e não aceleram o nível', () => {
  const { p, ganhar, bonus } = prog({ inicio: '2026-11-16T10:00:00' });
  // Mesmo XP nominal de antes → mesmo nível de antes, com ou sem bônus no caminho.
  for (let i = 0; i < 40; i++) ganhar('todo', 20);
  assert.ok(bonus().length > 0, 'houve bônus');
  assert.equal(p.st.xp, 40 * 20 * 10, 'só o XP das atividades conta para o nível');
  assert.equal(p.st.xpBonus, bonus().reduce((t, e) => t + e.amount, 0));
  assert.ok(bonus().every((e) => !e.levelUp), 'bônus nunca sobe nível');
  const v047 = (xp) => { let l = 1; while (l < 50 && (l + 1 <= 10 ? l * 60 : 540 + 120 * (l + 1 - 10) * (l + 1 - 10 + 3) / 2) <= xp) l++; return l; };
  assert.equal(p.nivel, v047(40 * 20), 'mesmo nível que a 0.47.0 teria com o mesmo XP');
  assert.equal(p.snapshot().bonus.xp, p.st.xpBonus);
});

test('telas: números de XP das fontes aparecem na escala ×10', () => {
  const care = ler('src/renderer/shared/care-view.js');
  assert.match(care, /até \+\$\{xpVisivel\(type\?\.xp \|\| 0\)\} XP/);
  assert.match(care, /até \$\{xpVisivel\(food\.xp\)\} XP/);
  const todo = ler('src/renderer/shared/todo-view.js');
  assert.match(todo, /Simples · \$\{xpVisivel\(5\)\} XP/);
  assert.match(todo, /\+\$\{xpVisivel\(s\.xpToday\)\} XP hoje/);
  assert.match(todo, /Math\.round\(Number\(xp\.value\) \/ XP_ESCALA\)/, 'XP personalizado digitado na escala nova e guardado no nominal');
  const app = ler('src/renderer/app/app.js');
  assert.match(app, /xpVisivel\(d\.xpToday\)/);
  const [inicio, primeira] = [DD_BALANCE.start, DD_BALANCE.firstDay].map(xpVisivel);
  const marcos = DD_BALANCE.milestones.map(([, x]) => `+${xpVisivel(x)}`).join('/');
  assert.ok(app.includes(`+${inicio} XP, primeira do dia +${primeira}, marcos de 15/30/60 min ${marcos}`), 'regras do Darkest na Central batem com o balanço real');
  assert.match(app, /Bônus de XP descobertos: \$\{c\.bonus\.descobertos\} de \$\{c\.bonus\.total\}/);
  assert.match(app, /o ritmo de nível não muda/);
});
