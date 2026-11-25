#!/usr/bin/env node
// Simulação da economia de anime (docs/ANIMES.md). Usa as classes REAIS do app:
// AcompanhamentoAnime (episódios, bônus, revisitas, teto do dia, regras do registro manual)
// e Loja (crédito idempotente, Ímã, teto geral de 1.200/dia). Só o hábito de cada perfil é
// suposição, declarada abaixo. Compara com o ganho ativo da loja (TAXA_HORA = 190/h).
//   node scripts/economia-anime-sim.mjs            → tabela em Markdown
//   node scripts/economia-anime-sim.mjs --json F   → também grava o resultado em F
import fs from 'node:fs';
import { AcompanhamentoAnime } from '../src/core/anime-acompanhamento.js';
import { Loja } from '../src/core/loja.js';
import { TAXA_HORA, ITENS } from '../src/core/loja-catalogo.js';

const MIN = 60e3, D = 86400e3;
const T0 = Date.UTC(2026, 11, 1, 15); // 01/12/2026, meio-dia em Brasília

/**
 * Perfis: episódios por dia de uso (24 min), dias por semana, filmes por mês,
 * fração registrada à mão (TV/celular), revisitas por semana e o "abusador" que tenta
 * marcar episódio sem assistir (manual em massa).
 */
export const PERFIS = {
  casual: { nome: 'Casual', eps: 1, dias: 4, filmesMes: 0, manual: 0.3, revisitasSemana: 0 },
  moderado: { nome: 'Moderado', eps: 2, dias: 6, filmesMes: 1, manual: 0.3, revisitasSemana: 1 },
  maratona: { nome: 'Maratonista', eps: 6, dias: 7, filmesMes: 2, manual: 0.2, revisitasSemana: 3 },
  abuso: { nome: 'Tentativa de abuso (30 manuais/dia)', eps: 30, dias: 7, filmesMes: 0, manual: 1, revisitasSemana: 20 },
};

function simular(perfil, dias) {
  let agora = T0; let mono = 0;
  const ac = new AcompanhamentoAnime({ now: () => agora, mono: () => mono });
  const loja = new Loja({ now: () => agora, dia: (ms) => new Date(ms - 3 * 3600e3).toISOString().slice(0, 10) });
  // Biblioteca: séries de 12 e 24 episódios já encerradas (sem sequência) e um filme por mês.
  let proxId = 1;
  const nova = (eps, formato = 'TV', duracao = 24) => { const id = proxId++; ac.seguir({ id, titulo: `Anime ${id}`, formato, status: 'FINISHED', episodios: eps, duracao, generos: [['Action', 'Drama', 'Comedy', 'Romance', 'Fantasy', 'Sports', 'Mystery', 'Sci-Fi', 'Horror'][id % 9]], relacoes: [] }); return id; };
  let atual = nova(12); let ep = 1;
  let horasAnime = 0; const porDia = [];
  // O app avança a sessão a cada 30 s (aqui, a cada minuto): só reprodução real conta.
  const assistir = (min) => { for (let m = 0; m < min; m++) { mono += MIN; agora += MIN; ac.tickSessao({ tocando: true }); } };
  for (let d = 0; d < dias; d++) {
    agora = T0 + d * D;
    const ativo = (d % 7) < perfil.dias;
    const saldo0 = loja.st.saldo;
    if (ativo) {
      for (let i = 0; i < perfil.eps; i++) {
        if (ep > ac.anime(atual).episodios) { atual = nova(d % 3 ? 12 : 24); ep = 1; }
        const manual = (i / Math.max(1, perfil.eps)) < perfil.manual;
        if (manual) ac.registrarManual({ anime: atual, episodio: ep });
        else {
          ac.iniciarSessao({ anime: atual, episodio: ep });
          assistir(23);
          ac.concluirSessao();
        }
        horasAnime += 24 / 60; ep++;
      }
      if (perfil.filmesMes && d % Math.round(30 / perfil.filmesMes) === 0) {
        const f = nova(1, 'MOVIE', 110);
        ac.iniciarSessao({ anime: f, episodio: 1 }); assistir(100); ac.concluirSessao();
        horasAnime += 110 / 60;
      }
      for (let r = 0; r < Math.round(perfil.revisitasSemana / 7 * (d % 7 === 0 ? 7 : 0)); r++) ac.registrarManual({ anime: 1, episodio: 1 + (r % 12) });
    }
    ac.drenarCreditos((c) => loja.creditar(c));
    porDia.push(loja.st.saldo - saldo0);
  }
  const total = loja.st.saldo;
  return { total, porDia: total / dias, porHora: horasAnime ? total / horasAnime : 0, horas: horasAnime, maxDia: Math.max(...porDia), eps: ac.st.stats.eps, semMoedas: ac.st.historico.filter((h) => !h.moedasBase).length };
}

const precos = ITENS.map((i) => i.preco).sort((a, b) => a - b);
const mediana = precos[Math.floor(precos.length / 2)];
const res = {};
const linhas = ['| Perfil | Dias | JOJOcoins | por dia | por hora de anime | maior dia | episódios | registros sem moedas | itens medianos (' + mediana + ') |', '|---|---|---|---|---|---|---|---|---|'];
for (const [k, p] of Object.entries(PERFIS)) {
  for (const dias of [30, 90, 180]) {
    const r = simular(p, dias);
    res[`${k}:${dias}`] = r;
    linhas.push(`| ${p.nome} | ${dias} | ${r.total} | ${r.porDia.toFixed(1)} | ${r.porHora.toFixed(1)} | ${r.maxDia} | ${r.eps} | ${r.semMoedas} | ${(r.total / mediana).toFixed(1)} |`);
  }
}
console.log(linhas.join('\n'));
console.log(`\nReferência: hora ATIVA com o JoJo rende ${TAXA_HORA} JOJOcoins na precificação da loja; o anime precisa ficar abaixo disso por hora.`);
const i = process.argv.indexOf('--json');
if (i > 0 && process.argv[i + 1]) fs.writeFileSync(process.argv[i + 1], JSON.stringify(res, null, 1));
