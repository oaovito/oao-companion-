// Recompensas FUNCIONAIS dos 200 níveis (0.48). Elas somam às recompensas
// visuais que já existem (título, visual de nível, memes BR, jogos, shows):
// nada aqui substitui ou esconde um visual. Todo nível dá pelo menos 1 ponto
// de atributo; marcos dão habilidade, JOJOcoins, espaços de artefato,
// desbloqueios de região/especialização/habilidade e títulos de marco.
// Depois do 200: níveis de Paragon (infinitos) e Estrelas de Prestígio,
// sem apagar nada (o prestígio só soma).

import { REGIOES } from './mundo.js';
import { ESPECIALIZACOES } from './especializacoes.js';
import { HABILIDADES } from './habilidades.js';
import { MINIJOGOS_EXTRA } from './minijogos.js';

export const NIVEL_MAX = 200;

const MARCOS = Object.freeze({
  10: 'Calouro do Recife', 25: 'Tubarão de Respeito', 50: 'Predador Veterano', 75: 'Terror do Desktop', 100: 'Centurião Abissal',
  125: 'Mestre das Marés', 150: 'Soberano do Recife', 175: 'Titã das Profundezas', 200: 'Lenda Viva do Aquário',
});

/** Espaços de artefato equipado por nível. */
export const slotsArtefato = (nivel) => 2 + (nivel >= 20) + (nivel >= 60) + (nivel >= 100) + (nivel >= 150);
/** Expedições simultâneas: 1, e 2 a partir do 90. */
export const expedicoesSimultaneas = (nivel) => (nivel >= 90 ? 2 : 1);

/** Recompensa funcional do nível n (2..200). Pura e determinística. */
export function recompensaDoNivel(n) {
  if (!Number.isInteger(n) || n < 2 || n > NIVEL_MAX) return null;
  const r = { nivel: n, pontosAtributo: 1, pontosHabilidade: 0, moedas: 10 + 2 * n, desbloqueios: [], titulo: null, slotArtefato: false };
  if (n % 2 === 0) r.pontosHabilidade += 1;
  if (n % 10 === 0) { r.pontosAtributo += 2; r.pontosHabilidade += 1; r.moedas += 5 * n; }
  if (n % 25 === 0) r.pontosAtributo += 3;
  if (MARCOS[n]) r.titulo = MARCOS[n];
  if (slotsArtefato(n) > slotsArtefato(n - 1)) { r.slotArtefato = true; r.desbloqueios.push({ tipo: 'slot', id: `slot${slotsArtefato(n)}`, nome: `Espaço de artefato ${slotsArtefato(n)}` }); }
  if (expedicoesSimultaneas(n) > expedicoesSimultaneas(n - 1)) r.desbloqueios.push({ tipo: 'expedicao', id: 'dupla', nome: 'Duas expedições ao mesmo tempo' });
  for (const g of REGIOES) if (g.nivel === n) r.desbloqueios.push({ tipo: 'regiao', id: g.id, nome: `Região: ${g.nome}` });
  for (const e of ESPECIALIZACOES) if (e.nivel === n) r.desbloqueios.push({ tipo: 'especializacao', id: e.id, nome: `Especialização: ${e.nome}` });
  for (const h of HABILIDADES) if (h.nivel === n) r.desbloqueios.push({ tipo: 'habilidade', id: h.id, nome: `${h.tipo === 'lendario' ? 'Poder lendário' : h.tipo === 'poder' ? 'Poder' : 'Habilidade'}: ${h.nome}` });
  for (const j of MINIJOGOS_EXTRA) if (j.nivel === n) r.desbloqueios.push({ tipo: 'minijogo', id: j.id, nome: `Minijogo: ${j.nome}` });
  for (const [nivel, nome] of Object.entries(DESBLOQUEIOS_FIXOS)) if (Number(nivel) === n) r.desbloqueios.push({ tipo: 'sistema', id: nome.id, nome: nome.nome });
  return r;
}

const DESBLOQUEIOS_FIXOS = Object.freeze({
  2: { id: 'expedicoes', nome: 'Expedições pelo desktop' },
  3: { id: 'semanais', nome: 'Missões semanais' },
  4: { id: 'fabricacao', nome: 'Fabricação de poções' },
  5: { id: 'especializacoes', nome: 'Especializações' },
  12: { id: 'paragonVisivel', nome: 'Painel de maestrias' },
  35: { id: 'combos', nome: 'Combinações de habilidades' },
});

// ---------------------------------------------------------------- endgame

/** XP (escala atual) para cada nível de Paragon depois do 200: o mesmo passo do 199→200. */
export function passoParagon(threshold) {
  return Math.max(1, threshold(NIVEL_MAX) - threshold(NIVEL_MAX - 1));
}
export function nivelParagon(xp, threshold) {
  const base = threshold(NIVEL_MAX);
  return xp < base ? 0 : Math.floor((xp - base) / passoParagon(threshold));
}
/** Recompensa de Paragon: ponto de atributo extra; a cada 10, uma Estrela de Prestígio. */
export function recompensaParagon(p) {
  return { paragon: p, pontosAtributo: 1, pontosHabilidade: p % 5 === 0 ? 1 : 0, moedas: 300 + 10 * Math.min(p, 100), estrela: p % 10 === 0 };
}
export const NOMES_ESTRELA = Object.freeze(['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Abissal', 'Megalodon']);
export const nomeEstrela = (n) => (n <= 0 ? null : `${NOMES_ESTRELA[Math.min(n, NOMES_ESTRELA.length) - 1]}${n > NOMES_ESTRELA.length ? ` ${n - NOMES_ESTRELA.length + 1}` : ''}`);
