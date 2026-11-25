// Clima de verdade em volta do JoJo (0.47.7): condição atual pela localização real →
// reação visual opcional (guarda-chuva, tremedeira, leque, susto com trovão) e luz de noite.
// Lógica pura; a consulta (Open-Meteo, cache de 30 min) e o relógio vêm de fora.
// Nada aqui muda a aparência permanente do JoJo: tudo é animação que termina ou luz que sai.

/** Limites da sensação térmica (°C). */
export const LIMITES_CLIMA = Object.freeze({ frio: 13, calor: 29 });
/** Consulta do clima ambiente: no máximo uma vez por hora (com cache de 30 min no serviço). */
export const CLIMA_INTERVALO_MS = 60 * 60e3;
/** Dado de clima mais velho que isto não vale para reação nem para a luz de noite. */
export const CLIMA_VALIDADE_MS = 3 * 60 * 60e3;
/** A mesma condição só ganha outra reação depois de 3 h; no máximo 4 reações por dia. */
export const REPETE_MS = 3 * 60 * 60e3;
export const MAX_POR_DIA = 4;

const TEMPESTADE = new Set([95, 96, 99]);
const NEVE = new Set([71, 73, 75, 77, 85, 86]);
const CHUVA = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);

/**
 * Condição do Open-Meteo (`current`) → { tipo, noite, forte }.
 * tipo: 'tempestade' | 'chuva' | 'neve' | 'frio' | 'calor' | null (nada a reagir).
 */
export function condicaoDoClima(current) {
  if (!current || typeof current !== 'object') return null;
  const code = Number(current.weather_code);
  const sens = Number.isFinite(Number(current.apparent_temperature)) ? Number(current.apparent_temperature) : Number(current.temperature_2m);
  const chuvaMm = [current.rain, current.showers, current.precipitation].map(Number).filter(Number.isFinite).reduce((a, b) => Math.max(a, b), 0);
  const neveCm = Number(current.snowfall) || 0;
  const noite = Number(current.is_day) === 0;
  let tipo = null, forte = false;
  if (TEMPESTADE.has(code)) { tipo = 'tempestade'; forte = code !== 95; }
  else if (NEVE.has(code) || neveCm > 0) { tipo = 'neve'; forte = [75, 86].includes(code); }
  else if (CHUVA.has(code) || chuvaMm >= 0.3) { tipo = 'chuva'; forte = [65, 67, 82].includes(code) || chuvaMm >= 4; }
  else if (Number.isFinite(sens) && sens <= LIMITES_CLIMA.frio) { tipo = 'frio'; forte = sens <= 5; }
  else if (Number.isFinite(sens) && sens >= LIMITES_CLIMA.calor) { tipo = 'calor'; forte = sens >= 35; }
  const vento = Number(current.wind_gusts_10m) >= 55 || Number(current.wind_speed_10m) >= 40;
  return { tipo, noite, forte, vento, sensacao: Number.isFinite(sens) ? Math.round(sens) : null, codigo: Number.isFinite(code) ? code : null };
}

/** Animações por condição (ids do catálogo sem o `cat_`). */
export const ANIMS_POR_CONDICAO = Object.freeze({
  chuva: ['cl01', 'cl02', 'cl03'],
  tempestade: ['cl09', 'cl10'],
  neve: ['cl11', 'cl04'],
  frio: ['cl04', 'cl05'],
  calor: ['cl06', 'cl07', 'cl08'],
  noite: ['cl12'],
});

/** Falas curtas (sem lugar nem endereço; ela vê a reação, não um boletim). */
export const FALAS_CLIMA = Object.freeze({
  chuva: [['Chovendo aí fora. Guarda-chuva na mão, rotina no lugar.', 'smirk'], ['Chuva não cancela treino, Manu. Só muda o caminho.', 'flex'], ['Choveu. Bom dia pra treinar em casa e beber água.', 'nod']],
  tempestade: [['Trovão! Não fui eu, foi o céu.', 'shock'], ['Tempestade lá fora. Tira o carregador da tomada se o raio cair perto.', 'think']],
  neve: [['Neve?! Tubarão não foi feito pra isso.', 'shock']],
  frio: [['Tá frio. Casaco agora, reclamação depois.', 'nod'], ['Que frio do caralho. Pelo menos o músculo não derrete.', 'smirk']],
  calor: [['Calor do inferno. Água, Manu. Agora.', 'angry'], ['Tô derretendo. Bebe água antes de mim.', 'think'], ['Esse calor é treino de sauna grátis.', 'smirk']],
  noite: [['Anoiteceu. Desacelera um pouco.', 'nod']],
});

/**
 * Decide se reage agora. `memoria` guarda só a última condição, o horário da última
 * reação por tipo e a contagem do dia (nada de histórico do clima).
 */
export function deveReagir(cond, memoria = {}, { agora = Date.now(), dia = '' } = {}) {
  if (!cond) return null;
  const alvo = cond.tipo || (cond.noite && !memoria.noite ? 'noite' : null);
  if (!alvo) return null;
  if (memoria.dia === dia && (memoria.n || 0) >= MAX_POR_DIA) return null;
  const ult = memoria.ultimo?.[alvo] || 0;
  const mudou = memoria.tipo !== alvo;
  if (!mudou && agora - ult < REPETE_MS) return null;
  if (mudou && agora - ult < 45 * 60e3) return null; // vai e volta (chuva fraca): sem repetir logo
  return alvo;
}

/** Registra a reação na memória (devolve uma memória nova). */
export function registrarReacao(memoria = {}, alvo, { agora = Date.now(), dia = '' } = {}) {
  const n = memoria.dia === dia ? (memoria.n || 0) + 1 : 1;
  return { ...memoria, tipo: alvo, noite: alvo === 'noite' ? true : memoria.noite, dia, n, ultimo: { ...(memoria.ultimo || {}), [alvo]: agora } };
}

/** Atualiza só a condição vista (sem reagir): a noite acaba de dia, a chuva para etc. */
export function verCondicao(memoria = {}, cond) {
  if (!cond) return memoria;
  const out = { ...memoria };
  if (!cond.noite) out.noite = false;
  if (!cond.tipo && memoria.tipo && memoria.tipo !== 'noite') out.tipo = null;
  return out;
}

/** Luz de noite no overlay: 0 (nada) a ~0.22. Sem dado válido, usa o relógio local. */
export function luzDeNoite({ cond = null, validoAte = 0, agora = Date.now(), hora = new Date(agora).getHours() } = {}) {
  const noite = cond && agora <= validoAte ? cond.noite : hora >= 19 || hora < 6;
  if (!noite) return 0;
  return cond?.tipo === 'tempestade' || cond?.tipo === 'chuva' ? 0.22 : 0.16;
}
