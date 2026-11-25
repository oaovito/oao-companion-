// Necessidades novas do JoJo (0.48), por cima das que já existem em
// needs.js (fome, saúde, humor, higiene e os 6 tipos de sujeira, que
// continuam intocados): sede, energia, tédio, carinho, confiança,
// satisfação (derivada), vínculo com a Emanuele e doenças leves.
//
// Regras de bem-estar (pedido do João): nada cai com o app fechado ou no
// Modo Trabalho/foco; pisos impedem estado "morto"; doença é leve, curável
// e nunca bloqueia o uso do computador. Não dorme das 6h às 21h: fora desse
// horário a energia volta por meditação/descanso, nunca por sono.

import { NIVEIS_VINCULO, limiarVinculo } from './mundo.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export function vidaVazia() {
  return { sede: 80, energia: 80, tedio: 20, carinho: 60, confianca: 50, vinculoXp: 0, doencas: [], recentes: [], sedeBaixaMs: 0, energiaBaixaMs: 0, ultimaInteracao: 0, vinculoDia: { dia: null, n: 0 }, confiancaDia: null };
}

// Tipos de comida: efeitos extras por cima dos de needs.js (fome/humor/saúde).
const GRUPOS = {
  marinho: ['peixe', 'foca', 'lula', 'tartaruga', 'pinguim', 'salmao', 'atum', 'sardinha', 'tilapia', 'bacalhau', 'camarao', 'polvo', 'siri', 'lagosta', 'mexilhao'],
  japones: ['sushi', 'sashimi', 'temaki', 'onigiri', 'ramen', 'yakisoba', 'gyoza'],
  carne: ['frangoAssado', 'churrasco', 'picanha', 'costela', 'humano'],
  besteira: ['hamburguer', 'cheeseburger', 'pizza', 'cachorroQuente', 'batataFrita', 'nuggets', 'coxinha', 'pastel', 'donut'],
  caseira: ['feijoada', 'arrozFeijao', 'macarrao', 'lasanha', 'estrogonofe', 'omelete', 'ovoCozido', 'tapioca', 'paoQueijo', 'sanduicheNatural'],
  fruta: ['banana', 'maca', 'morango', 'melancia', 'manga', 'abacaxi'],
  doce: ['sorvete', 'chocolate', 'bolo', 'pudim'],
};
const EFEITO_GRUPO = {
  marinho: { energia: 10, sede: -3 },
  japones: { energia: 8, sede: -6 },
  carne: { energia: 12, sede: -8 },
  besteira: { energia: 4, sede: -10, risco: 'indigestao' },
  caseira: { energia: 10, sede: -4 },
  fruta: { energia: 4, sede: 12 },
  doce: { energia: 6, sede: -6, risco: 'indigestao' },
};
export const GRUPO_DA_COMIDA = Object.freeze(Object.fromEntries(Object.entries(GRUPOS).flatMap(([g, ids]) => ids.map((id) => [id, g]))));

/** Bebidas novas (entram no cardápio de needs.js; o efeito de sede vem daqui). */
export const BEBIDAS = Object.freeze({
  agua: { sede: 40, energia: 0 },
  aguaCoco: { sede: 40, energia: 4, cura: ['indigestao', 'desidratacao'] },
  isotonico: { sede: 35, energia: 8, cura: ['desidratacao'] },
  shakeWhey: { sede: 15, energia: 14 },
  cafe: { sede: 5, energia: 22 },
  chaVerde: { sede: 25, energia: 8, cura: ['indigestao'] },
  sucoLaranja: { sede: 30, energia: 6, cura: ['resfriado'] },
  leite: { sede: 20, energia: 6 },
  caldoPeixe: { sede: 20, energia: 10, cura: ['resfriado', 'enjoo'] },
  kombucha: { sede: 25, energia: 4, cura: ['indigestao'] },
  refrigerante: { sede: 10, energia: 8, risco: 'indigestao' },
  energetico: { sede: 5, energia: 30, risco: 'taquicardia' },
});

export const DOENCAS = Object.freeze({
  indigestao: { nome: 'Indigestão', horas: 3, anim: 'barrigaRoncando', fala: 'Muita besteira. Meu estômago abriu um processo trabalhista.', energiaQueda: 1.5 },
  desidratacao: { nome: 'Desidratação', horas: 2, anim: 'cansado', fala: 'Peixe seco. Eu. Água, Manu. Pra mim e pra você.', energiaQueda: 1.6 },
  resfriado: { nome: 'Resfriado', horas: 6, anim: 'espirrar', fala: 'Atchim. Tubarão resfriado. Isso nem devia ser possível.', energiaQueda: 1.3 },
  coceira: { nome: 'Coceira nas escamas', horas: 3, anim: 'autoCocegas', fala: 'Coça tudo. O aquário precisa de faxina.', energiaQueda: 1.1 },
  exaustao: { nome: 'Exaustão', horas: 2, anim: 'esparramado', fala: 'Sem bateria. Preciso meditar um pouco.', energiaQueda: 1 },
  enjoo: { nome: 'Enjoo de maré', horas: 2, anim: 'careta', fala: 'A expedição balançou demais. Enjoei. Não conta pra ninguém.', energiaQueda: 1.2 },
  taquicardia: { nome: 'Coração acelerado', horas: 1, anim: 'nervoso', fala: 'Energético demais. Meu coração está fazendo HIIT sozinho.', energiaQueda: 1.2 },
});

export function nivelVinculo(xp) {
  let n = 1;
  while (n < NIVEIS_VINCULO.length && xp >= limiarVinculo(n + 1)) n++;
  return n;
}

/** Satisfação (0–100): média ponderada do que ele sente agora. */
export function satisfacao(v, needs = {}) {
  const fome = needs.hunger ?? 70, higiene = needs.hygiene ?? 80;
  const doente = v.doencas.length ? 12 : 0;
  return Math.round(clamp(0.2 * fome + 0.15 * higiene + 0.15 * v.sede + 0.15 * v.energia + 0.15 * (100 - v.tedio) + 0.2 * v.carinho - doente));
}

/** Dorme permitido só das 21h às 6h (regra existente da vigília). */
export const podeDormir = (hora) => hora >= 21 || hora < 6;

/**
 * Passa o tempo (só tempo ATIVO entra aqui).
 * ctx: { hora, repouso (meditando/descanso/Trabalho), dormindo, efeitos, needs, rng, agora }
 * Devolve { novas: [doenças que começaram], curadas: [] }.
 */
export function passarTempo(v, ms, ctx) {
  const h = ms / 3600000, e = ctx.efeitos || {}, out = { novas: [], curadas: [] };
  if (!(h > 0)) return out;
  const fixa = e.energiaFixa > 0;
  const queda = Math.max(0.4, 1 - (e.quedaVida || 0));
  const fatorDoenca = v.doencas.reduce((m, d) => Math.max(m, DOENCAS[d.id]?.energiaQueda || 1), 1);
  const repouso = ctx.repouso || (ctx.dormindo && podeDormir(ctx.hora));
  if (fixa) v.energia = 100;
  else if (repouso) v.energia = clamp(v.energia + (ctx.dormindo ? 25 : 14) * (1 + (e.energiaRecupera || 0)) * h);
  else v.energia = clamp(v.energia - 6 * queda * fatorDoenca * h, 3);
  if (e.sedeFixa > 0) v.sede = 100;
  else v.sede = clamp(v.sede - 10 * queda * h, 2);
  const semInteracao = ctx.agora - (v.ultimaInteracao || 0) > 20 * 60e3;
  if (!(e.tedioTravado > 0)) v.tedio = clamp(v.tedio + (semInteracao ? 9 : 2) * Math.max(0.3, 1 - (e.tedioSobe || 0)) * h);
  v.carinho = clamp(v.carinho - 3 * h, 15);
  // Doenças: duração em tempo ativo; vitalidade encurta.
  const cura = 1 + (e.cura || 0);
  for (const d of v.doencas) d.restaMs -= ms * cura;
  const ficam = v.doencas.filter((d) => d.restaMs > 0);
  out.curadas = v.doencas.filter((d) => d.restaMs <= 0).map((d) => d.id);
  v.doencas = ficam;
  // Gatilhos lentos (só com tempo ativo acumulado; chance reduzida por resistência).
  v.sedeBaixaMs = v.sede < 10 ? v.sedeBaixaMs + ms : 0;
  v.energiaBaixaMs = v.energia < 6 ? v.energiaBaixaMs + ms : 0;
  if (v.sedeBaixaMs > 30 * 60e3) { if (adoecer(v, 'desidratacao', e, ctx.rng, 1)) out.novas.push('desidratacao'); v.sedeBaixaMs = 0; }
  if (v.energiaBaixaMs > 30 * 60e3) { if (adoecer(v, 'exaustao', e, ctx.rng, 1)) out.novas.push('exaustao'); v.energiaBaixaMs = 0; }
  if ((ctx.needs?.hygiene ?? 100) < 15 && ctx.rng() < 0.08 * h && adoecer(v, 'coceira', e, ctx.rng, 1)) out.novas.push('coceira');
  if (ctx.frio && ctx.rng() < 0.03 * h && adoecer(v, 'resfriado', e, ctx.rng, 1)) out.novas.push('resfriado');
  return out;
}

/** Tenta adoecer (resistência a doenças reduz). Nunca duplica a mesma doença. */
export function adoecer(v, id, e = {}, rng = Math.random, chance = 1) {
  if (!DOENCAS[id] || v.doencas.some((d) => d.id === id) || v.doencas.length >= 2) return false;
  if (rng() >= chance * Math.max(0.05, 1 - (e.resistenciaDoenca || 0))) return false;
  v.doencas.push({ id, restaMs: DOENCAS[id].horas * 3600e3 });
  return true;
}

export function curar(v, ids = null) {
  const antes = v.doencas.map((d) => d.id);
  v.doencas = ids ? v.doencas.filter((d) => !ids.includes(d.id)) : v.doencas.slice(1);
  return antes.filter((id) => !v.doencas.some((d) => d.id === id));
}

/** Comeu/bebeu: efeitos extras + riscos (3 besteiras em 4 h → chance de indigestão). */
export function comer(v, foodId, ctx) {
  const e = ctx.efeitos || {}, bonus = 1 + (e.comidaBonus || 0);
  const bebida = BEBIDAS[foodId];
  const efeito = bebida || EFEITO_GRUPO[GRUPO_DA_COMIDA[foodId]] || { energia: 6, sede: -4 };
  v.sede = clamp(v.sede + (efeito.sede || 0) * (efeito.sede > 0 ? bonus : 1));
  v.energia = clamp(v.energia + (efeito.energia || 0) * bonus);
  v.recentes = [...(v.recentes || []).filter((r) => ctx.agora - r.at < 4 * 3600e3), { id: foodId, at: ctx.agora }].slice(-20);
  const out = { novas: [], curadas: [] };
  if (bebida?.cura) out.curadas = curar(v, bebida.cura);
  const risco = efeito.risco;
  if (risco === 'indigestao') {
    const besteiras = v.recentes.filter((r) => ['besteira', 'doce'].includes(GRUPO_DA_COMIDA[r.id]) || BEBIDAS[r.id]?.risco === 'indigestao').length;
    if (besteiras >= 3 && adoecer(v, 'indigestao', e, ctx.rng, 0.45)) out.novas.push('indigestao');
  } else if (risco === 'taquicardia') {
    const n = v.recentes.filter((r) => r.id === 'energetico').length;
    if (n >= 3 && adoecer(v, 'taquicardia', e, ctx.rng, 0.6)) out.novas.push('taquicardia');
  }
  return out;
}

/** Vínculo: teto diário para não virar grind; satisfação alta rende mais. */
export function ganharVinculo(v, pontos, { dia, efeitos = {}, needs = {} } = {}) {
  if (!(pontos > 0)) return 0;
  if (v.vinculoDia.dia !== dia) v.vinculoDia = { dia, n: 0 };
  const fator = (1 + (efeitos.vinculoGanho || 0)) * (0.7 + satisfacao(v, needs) / 200);
  const ganho = Math.max(0, Math.min(Math.round(pontos * fator * 10) / 10, 120 - v.vinculoDia.n));
  v.vinculoDia.n += ganho;
  v.vinculoXp += ganho;
  return ganho;
}

/** Confiança muda uma vez por dia: cuidado no dia sobe; abandono total desce pouco. */
export function fecharDia(v, { dia, cuidouHoje, criticoHoje, efeitos = {} }) {
  if (v.confiancaDia === dia) return;
  v.confiancaDia = dia;
  if (cuidouHoje) v.confianca = clamp(v.confianca + 2);
  else if (criticoHoje) v.confianca = clamp(v.confianca - 1);
  v.confianca = Math.max(v.confianca, 20 + (efeitos.confiancaPiso || 0));
}
