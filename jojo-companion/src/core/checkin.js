// Check-in de humor e energia: uma pergunta por dia ("como você tá? energia de
// 1 a 5") e, pela resposta, o ritmo das cobranças do dia. Puro: só interpreta a
// resposta e decide o ritmo. Tristeza, choro e crise NÃO passam por aqui: a
// conversa trata antes, com acolhimento e encaminhamento ao João.

export const CHECKIN = Object.freeze({ horaInicio: 9, horaFim: 20, esperaMs: 15 * 60e3, aposAbrirMs: 10 * 60e3 });

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => semAcento(s).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Ritmo do dia pela energia: 1–2 leve, 3 normal, 4–5 forte. */
export function paceFor(energia) {
  if (!Number.isInteger(energia) || energia < 1 || energia > 5) return 'normal';
  return energia <= 2 ? 'leve' : energia >= 4 ? 'forte' : 'normal';
}

/** Multiplicador dos intervalos de água e pausa: no dia leve ele cobra menos. */
export function paceFactor(pace) {
  return pace === 'leve' ? 1.5 : 1;
}

/**
 * Resposta ao check-in: número de 1 a 5 ou palavras ("cansada", "normal",
 * "animada"). Devolve a energia (1–5) ou null se não parece uma resposta.
 */
export function parseCheckinAnswer(text) {
  const n = norm(String(text || '').replace(/^\s*jojo[,!:]?\s*/i, ''));
  // Só resposta curta conta; frase longa é conversa, não check-in.
  if (!n || n.split(' ').length > 6) return null;
  let m = n.match(/^(?:energia |nota |uns |umas |to (?:com )?|acho que )*([1-5])(?: de 5| e meio)?$/);
  if (m) return Number(m[1]);
  if (/\b(nao|nem) (to|tou|estou) (cansad|exaust|mal|bem|animad|ruim)/.test(n)) m = null;
  else {
    if (/\b(exaust[ao]|esgotad[ao]|destruid[ao]|acabad[ao]|pessim[ao]|morta|morto|sem energia nenhuma|zero energia)\b/.test(n)) return 1;
    if (/\b(cansad[ao]|com sono|sem energia|pouca energia|desanimad[ao]|meio mal|mal|ruim|fraca|fraco|devagar)\b/.test(n)) return 2;
    if (/\b(animad[ao]|empolgad[ao]|pilhad[ao]|otim[ao]|muito bem|super bem|cheia de energia|cheio de energia|voando|no gas|com tudo)\b/.test(n)) return 5;
    if (/\b(bem|boa|bom|disposta|disposto|tranquil[ao]|de boa|firme)\b/.test(n)) return 4;
    if (/\b(normal|ok|mais ou menos|medio|media|indo|levando|na media|regular)\b/.test(n)) return 3;
  }
  return null;
}

/** Comando "/checkin [1-5]". */
export function parseCheckinCommand(arg) {
  const n = norm(arg);
  if (!n) return { tipo: 'perguntar' };
  const energia = parseCheckinAnswer(n);
  return energia ? { tipo: 'responder', energia } : { tipo: 'ajuda' };
}

/** Normaliza o estado salvo. */
export function sanitizeCheckin(input) {
  const s = input && typeof input === 'object' ? input : {};
  const dia = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null);
  return { dia: dia(s.dia), energia: Number.isInteger(s.energia) && s.energia >= 1 && s.energia <= 5 ? s.energia : null, perguntado: dia(s.perguntado) };
}
