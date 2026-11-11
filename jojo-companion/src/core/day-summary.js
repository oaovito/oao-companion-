// Resumo do dia: de manhã, o que há para fazer; à noite, o que foi feito.
// Puro: recebe os dados já lidos (tarefas, rotina, treino, remédios, hábitos,
// foco) e devolve linhas. O tom vem da fala que acompanha.

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => semAcento(s).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const titulos = (tasks, max = 3) => {
  const nomes = tasks.slice(0, max).map((t) => String(t.title).slice(0, 60));
  return nomes.join('; ') + (tasks.length > max ? `; e mais ${tasks.length - max}` : '');
};

/** Pedido de resumo da manhã ou da noite. "como foi meu dia" continua com o /resumo de sempre. */
export function parseDaySummaryRequest(text) {
  const n = norm(String(text || '').replace(/^\s*jojo[,!:]?\s*/i, ''));
  if (!n || n.length > 100) return null;
  if (/^(meu dia|plano do dia|plano de hoje|como (e|vai ser|esta|ta) (o )?meu dia( hoje)?|resumo da manha|o que (eu )?tenho (pra|para) fazer hoje no total|qual (e )?(o )?plano (de|pra|para) hoje)$/.test(n)) return { tipo: 'manha' };
  if (/^(resumo da noite|fechamento do dia|fecha(r)? o dia|o que eu cumpri hoje|o que ficou (pendente|faltando) hoje|balanco do dia)$/.test(n)) return { tipo: 'noite' };
  return null;
}

/** Subcomando de "/resumo": manha | noite. Null = o /resumo de sempre. */
export function parseDaySummaryCommand(arg) {
  const n = norm(arg);
  if (/^(manha|hoje|plano|dia)$/.test(n)) return { tipo: 'manha' };
  if (/^(noite|fechamento|feito)$/.test(n)) return { tipo: 'noite' };
  return null;
}

/**
 * Linhas da manhã.
 * @param tarefas {pending, tasks:[{title, completed}]} | null
 * @param ontem tarefas que ficaram de ontem (lista de títulos) | []
 * @param rotina linhas da rotina ("07:00 Manhã") | []
 * @param treino {ficha, feito} | null
 * @param remedios [{nome, hora}]
 */
export function morningLines({ tarefas = null, ontem = [], rotina = [], treino = null, remedios = [] } = {}) {
  const out = [];
  if (tarefas && tarefas.total) {
    const pend = tarefas.tasks.filter((t) => !t.completed);
    out.push(pend.length ? `Tarefas: ${plural(pend.length, 'pendente', 'pendentes')} — ${titulos(pend)}` : `Tarefas: as ${tarefas.total} de hoje já estão feitas`);
  }
  if (ontem.length) out.push(`Ficou de ontem: ${titulos(ontem.map((title) => ({ title })))}`);
  if (rotina.length) out.push(`Rotina: ${rotina.join(' · ')}`);
  if (treino && !treino.feito) out.push(`Treino: ficha ${treino.ficha}`);
  if (remedios.length) out.push(`Remédios: ${remedios.map((r) => `${r.nome} ${r.hora}`).join(', ')}`);
  return out;
}

/**
 * Linhas da noite.
 * @param tarefas {total, completed, tasks} | null
 * @param habitos {treino, estudo, sono}: feito hoje?
 * @param rotina {feitos, total} | null
 * @param foco blocos de foco concluídos hoje
 */
export function nightLines({ tarefas = null, habitos = null, rotina = null, foco = 0 } = {}) {
  const out = [];
  if (tarefas && tarefas.total) {
    const pend = tarefas.tasks.filter((t) => !t.completed);
    out.push(`Tarefas: ${tarefas.completed} de ${tarefas.total} feitas${pend.length ? ` — ficou: ${titulos(pend)}` : ''}`);
  }
  if (habitos && (habitos.treino || habitos.estudo || habitos.sono)) out.push(`Hábitos: ${['treino', 'estudo', 'sono'].map((h) => `${h} ${habitos[h] ? '✓' : '—'}`).join(' · ')}`);
  if (rotina && rotina.total) out.push(`Rotina: ${rotina.feitos} de ${plural(rotina.total, 'bloco', 'blocos')}`);
  if (foco > 0) out.push(`Foco: ${plural(foco, 'bloco', 'blocos')}`);
  return out;
}
