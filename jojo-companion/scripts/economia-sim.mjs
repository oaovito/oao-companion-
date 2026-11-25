#!/usr/bin/env node
// Simulação da economia de JOJOcoins (docs/LOJA.md). Usa as classes REAIS do app:
// Progress (XP, nível, bônus com tetos) e Loja (conversão por fonte, teto do dia,
// compras com requisito de nível). Só o uso de cada perfil é suposição, declarada abaixo.
//   node scripts/economia-sim.mjs            → tabela em Markdown
//   node scripts/economia-sim.mjs --json F   → também grava o resultado em F
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Progress } from '../src/core/catalog/antitedio.js';
import { Loja, LOJA_LIMITES } from '../src/core/loja.js';
import { ITENS, TAXA_HORA } from '../src/core/loja-catalogo.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/catalog/progressao.json'), 'utf8'));

/**
 * Perfis de uso (XP nominal por dia, por fonte, já dentro dos tetos de cada fonte).
 * `horas`: tempo ativo com o JoJo no dia; `dias`: dias de uso por semana.
 * Fontes `xp:*` passam por Progress.xp (com cooldown e teto do dia reais).
 * `consumo`: [quantos, a cada N dias ativos] de cada tipo de consumível usado.
 */
export const PERFIS = {
  casual: { nome: 'Casual', horas: 0.5, dias: 5,
    xp: { gesto: 5, chat: 6, jogoParticipacao: 2, jogoVitoria: 1, diaNovo: 1, poseNova: 2 },
    eventos: [['feeding', 15, 2], ['cleanup', 10, 1], ['care', 10, 1], ['todo', 10, 2], ['interaction', 5, 1, 'timer']],
    consumo: { comida: [1, 2], cuidado: [1, 3], poder: [1, 7] } },
  moderado: { nome: 'Moderado', horas: 1.5, dias: 6,
    xp: { gesto: 15, chat: 10, estimulo: 2, jogoParticipacao: 5, jogoVitoria: 3, foco: 2, missao: 2, diaNovo: 1, poseNova: 4 },
    eventos: [['feeding', 20, 4], ['cleanup', 15, 2], ['care', 15, 2], ['todo', 30, 3], ['darkest', 40, 1], ['interaction', 7, 2, 'timer']],
    consumo: { comida: [1, 1], cuidado: [1, 2], poder: [1, 4] } },
  intenso: { nome: 'Intenso', horas: 4, dias: 7,
    xp: { gesto: 20, chat: 10, estimulo: 2, jogoParticipacao: 17, jogoVitoria: 10, foco: 6, missao: 3, diaNovo: 1, poseNova: 10 },
    eventos: [['feeding', 40, 5], ['cleanup', 25, 3], ['care', 25, 3], ['todo', 50, 8], ['darkest', 100, 3], ['interaction', 9, 3, 'timer']],
    consumo: { comida: [2, 1], cuidado: [1, 1], poder: [1, 3] } },
};

export const HORIZONTES = [1, 7, 30, 90, 180, 365];
const DIA_MS = 86400e3;
const diaDe = (ms) => new Date(ms).toISOString().slice(0, 10);
function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

/** Compra: o mais barato liberado que falta (permanente ainda não comprado ou consumível sem estoque). */
function comprarO_que_der(loja, nivel, tx) {
  const faltam = ITENS.filter((i) => (i.consumivel ? loja.qtd(i.id) < 1 : !loja.possui(i.id))).sort((a, b) => a.preco - b.preco);
  for (const it of faltam) {
    const r = loja.comprar({ txId: `sim${tx.n++}`, id: it.id, nivel });
    if (!r.ok && r.motivo === 'saldo') break;
  }
}

/** Consumo do perfil: usa o que tem em estoque (o que acabou é recomprado depois). */
function consumir(loja, tx, rng, diaAtivo, consumo) {
  for (const [tipo, [n, cada]] of Object.entries(consumo)) {
    if (diaAtivo % cada) continue;
    for (let k = 0; k < n; k++) {
      const tem = ITENS.filter((i) => i.tipo === tipo && i.consumivel && loja.qtd(i.id) > 0);
      if (!tem.length) break;
      loja.usar({ txId: `uso${tx.n++}`, id: tem[Math.floor(rng() * tem.length)].id });
    }
  }
  loja.drenar(() => true);
}

/**
 * Roda um perfil por `dias`. `xpInicial` permite começar num nível alto (ex.: 200).
 * Devolve uma linha por horizonte e o dia em que o catálogo inteiro ficou comprado.
 */
export function simular(perfilId, { dias = 365, xpInicial = 0, seed = 7, horizontes = HORIZONTES } = {}) {
  const p = PERFIS[perfilId];
  let t = Date.UTC(2027, 0, 4, 12);
  const rng = seeded(seed);
  const prog = new Progress({ data, rng, now: () => t, wallNow: () => t, monotonicNow: () => t });
  prog.st.xp = xpInicial;
  const loja = new Loja({ now: () => t, dia: diaDe, escala: prog.escala });
  const tx = { n: 0 };
  const linhas = []; let completo = null; let ativos = 0; let seq = 0;
  for (let d = 1; d <= dias; d++) {
    const dia = diaDe(t);
    const ativo = (d - 1) % 7 < p.dias;
    if (ativo) {
      ativos++;
      for (const [kind, vezes] of Object.entries(p.xp)) {
        for (let i = 0; i < vezes; i++) {
          if (['foco', 'missao', 'diaNovo'].includes(kind)) {
            prog.award({ id: `${kind}:${dia}:${i}`, amount: data.xp[kind], source: 'interaction', day: dia, label: kind === 'missao' ? 'Missão cumprida' : kind, atividade: kind });
          } else { t += 61e3; prog.xp(kind); }
        }
      }
      for (const [source, amount, vezes, atividade] of p.eventos) {
        for (let i = 0; i < vezes; i++) prog.award({ id: `${source}:${dia}:${i}:${seq++}`, amount, source, day: dia, label: source, atividade: atividade || null });
      }
      loja.reconciliar(prog.st.rewards.history);
      // Só para a simulação caber em segundos: os ids do dia não se repetem nos dias seguintes.
      prog.st.rewards.ids = {}; prog.st.rewards.history = prog.st.rewards.history.slice(-5);
      consumir(loja, tx, rng, ativos, p.consumo);
      comprarO_que_der(loja, prog.nivel, tx);
      // Recibos antigos não mudam o resultado; podar só acelera a simulação.
      loja.st.tx = {}; loja.st.txOrdem = []; loja.st.historico = loja.st.historico.slice(-10);
    }
    if (!completo && ITENS.every((i) => loja.st.inventario[i.id])) completo = d;
    if (horizontes.includes(d)) {
      const perm = ITENS.filter((i) => !i.consumivel);
      linhas.push({ dias: d, nivel: prog.nivel, ganho: loja.st.ganhoTotal, gasto: loja.st.gastoTotal, saldo: loja.st.saldo,
        mediaDiaAtivo: Math.round(loja.st.ganhoTotal / Math.max(1, ativos)),
        porHora: Math.round(loja.st.ganhoTotal / Math.max(1, ativos) / p.horas),
        permanentes: perm.filter((i) => loja.possui(i.id)).length, totalPermanentes: perm.length,
        itens: ITENS.filter((i) => loja.st.inventario[i.id]).length });
    }
    t += DIA_MS - (t % DIA_MS) + 12 * 3600e3;
  }
  return { perfil: perfilId, linhas, catalogoCompletoNoDia: completo };
}

/** Custo médio por dia ativo do consumo de cada perfil (preço médio de cada tipo). */
export function cestaDiaria(perfilId) {
  const media = (tipo) => { const l = ITENS.filter((i) => i.tipo === tipo && i.consumivel); return l.reduce((s, i) => s + i.preco, 0) / l.length; };
  return Math.round(Object.entries(PERFIS[perfilId].consumo).reduce((s, [tipo, [n, cada]]) => s + media(tipo) * n / cada, 0));
}

export function relatorio({ dias = 365 } = {}) {
  const perfis = Object.keys(PERFIS).map((id) => ({ ...simular(id, { dias: Math.max(dias, 1500), horizontes: HORIZONTES.filter((h) => h <= dias) }), horas: PERFIS[id].horas, diasSemana: PERFIS[id].dias }));
  const xp200 = new Progress({ data, now: () => 0, wallNow: () => 0, monotonicNow: () => 0 }).threshold(200);
  const pos200 = Object.keys(PERFIS).map((id) => ({ perfil: id, ...simular(id, { dias: 1500, xpInicial: xp200, horizontes: [30, 90, 365] }) }));
  const total = ITENS.reduce((s, i) => s + i.preco, 0);
  return { taxaHora: TAXA_HORA, tetoDia: LOJA_LIMITES.tetoDia, precoCatalogo: total, cesta: Object.fromEntries(Object.keys(PERFIS).map((id) => [id, cestaDiaria(id)])), perfis, pos200 };
}

function markdown(r) {
  const n = (x) => new Intl.NumberFormat('pt-BR').format(x);
  const out = [`Catálogo inteiro (1 de cada): ${n(r.precoCatalogo)} JOJOcoins · teto de ganho: ${n(r.tetoDia)}/dia · taxa de preço: ${n(r.taxaHora)}/h`, ''];
  out.push('| Perfil | Dias | Nível | Ganho total | Média/dia ativo | Por hora | Permanentes | Itens (de 150) | Saldo |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const p of r.perfis) for (const l of p.linhas) out.push(`| ${PERFIS[p.perfil].nome} | ${l.dias} | ${l.nivel} | ${n(l.ganho)} | ${n(l.mediaDiaAtivo)} | ${n(l.porHora)} | ${l.permanentes}/${l.totalPermanentes} | ${l.itens} | ${n(l.saldo)} |`);
  out.push('', '| Perfil | Horas/dia (suposto) | Dias/semana | Consumo/dia ativo | Catálogo inteiro comprado no dia |', '|---|---:|---:|---:|---:|');
  for (const p of r.perfis) out.push(`| ${PERFIS[p.perfil].nome} | ${p.horas} | ${p.diasSemana} | ~${n(r.cesta[p.perfil])} | ${p.catalogoCompletoNoDia ?? 'depois de 1500'} |`);
  out.push('', 'Começando no nível 200 com a carteira vazia:', '', '| Perfil | Dias | Ganho total | Itens (de 150) | Catálogo inteiro no dia |', '|---|---:|---:|---:|---:|');
  for (const p of r.pos200) for (const l of p.linhas) out.push(`| ${PERFIS[p.perfil].nome} | ${l.dias} | ${n(l.ganho)} | ${l.itens} | ${p.catalogoCompletoNoDia ?? 'depois de 1500'} |`);
  return out.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const r = relatorio();
  console.log(markdown(r));
  const i = process.argv.indexOf('--json');
  if (i > 0 && process.argv[i + 1]) fs.writeFileSync(process.argv[i + 1], JSON.stringify(r, null, 2) + '\n');
}
