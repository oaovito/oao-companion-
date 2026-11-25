// Tempo do calendário de anime: tudo é guardado em UTC (milissegundos) e só vira hora
// local na hora de mostrar. Padrão: horário de Brasília (America/Sao_Paulo); outros fusos
// brasileiros são opcionais. Determinístico (Intl/ICU), sem modelo de linguagem.
//
// Precisão (nunca apresentar previsão como confirmação):
// - 'previsto': data/hora que a AniList dá para o episódio. É o horário da EXIBIÇÃO NO
//   JAPÃO (a AniList entrega um instante absoluto em segundos UTC; não há conversão dupla:
//   o instante é o mesmo em qualquer fuso, só a exibição muda). A chegada ao streaming no
//   Brasil costuma ser perto disso, mas a fonte não confirma: mostramos como previsão.
// - 'exibido': o horário previsto passou e a própria AniList registrou a exibição.
// - 'confirmado': a disponibilidade foi confirmada de verdade (a usuária disse que já está
//   no streaming ou uma sessão de reprodução daquele episódio foi detectada).
// - 'semData': ainda não há data anunciada.

export const FUSO_PADRAO = 'America/Sao_Paulo';

/** Fusos brasileiros oferecidos nas configurações (rótulo curto). */
export const FUSOS_BR = Object.freeze([
  { id: 'America/Sao_Paulo', nome: 'Brasília (UTC−3)' },
  { id: 'America/Manaus', nome: 'Amazonas (UTC−4)' },
  { id: 'America/Cuiaba', nome: 'Mato Grosso (UTC−4)' },
  { id: 'America/Rio_Branco', nome: 'Acre (UTC−5)' },
  { id: 'America/Noronha', nome: 'Fernando de Noronha (UTC−2)' },
]);
const FUSOS_OK = new Set(FUSOS_BR.map((f) => f.id));
export const fusoValido = (tz) => (FUSOS_OK.has(tz) ? tz : FUSO_PADRAO);

export const CONFIANCA = Object.freeze({
  previsto: 'previsão (horário da exibição no Japão)',
  exibido: 'exibido no Japão; chegada ao streaming no Brasil não confirmada',
  confirmado: 'disponível (confirmado)',
  semData: 'sem data anunciada',
});

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const _fmt = new Map();
function formatador(tz) {
  if (!_fmt.has(tz)) {
    _fmt.set(tz, new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }));
  }
  return _fmt.get(tz);
}
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Partes da data no fuso: ano, mes (1–12), dia, hora, minuto, segundo, diaSemana (0 = domingo). */
export function partes(ms, tz = FUSO_PADRAO) {
  const o = {};
  for (const p of formatador(fusoValido(tz)).formatToParts(new Date(ms))) o[p.type] = p.value;
  return { ano: Number(o.year), mes: Number(o.month), dia: Number(o.day), hora: Number(o.hour) % 24, minuto: Number(o.minute), segundo: Number(o.second), diaSemana: WD[o.weekday] };
}

/** Diferença do fuso para o UTC naquele instante, em minutos (Brasília: −180). */
export function offsetMin(ms, tz = FUSO_PADRAO) {
  const p = partes(ms, tz);
  const comoUtc = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  return Math.round((comoUtc - Math.floor(ms / 1000) * 1000) / 60e3);
}

const pad = (n) => String(n).padStart(2, '0');
/** Dia local 'AAAA-MM-DD' (o que conta para "hoje", resumo e recompensas por dia). */
export function diaLocal(ms, tz = FUSO_PADRAO) {
  const p = partes(ms, tz);
  return `${p.ano}-${pad(p.mes)}-${pad(p.dia)}`;
}

/** Instante UTC da meia-noite local do dia que contém `ms` (com `deltaDias` de deslocamento). */
export function inicioDoDia(ms, tz = FUSO_PADRAO, deltaDias = 0) {
  const p = partes(ms, tz);
  const aprox = Date.UTC(p.ano, p.mes - 1, p.dia + deltaDias, 0, 0, 0);
  // Duas passadas resolvem qualquer mudança de offset (horário de verão, se voltar a existir).
  let t = aprox - offsetMin(aprox, tz) * 60e3;
  t = aprox - offsetMin(t, tz) * 60e3;
  return t;
}

/** Instante UTC de uma hora local (h:m) no dia de `ms`. */
export function horaLocal(ms, h, m = 0, tz = FUSO_PADRAO) {
  return inicioDoDia(ms, tz) + (h * 60 + m) * 60e3;
}

/** "12h30" (minutos sempre com dois dígitos; "12h" quando é hora cheia). */
export function formatarHora(ms, tz = FUSO_PADRAO) {
  const p = partes(ms, tz);
  return p.minuto ? `${p.hora}h${pad(p.minuto)}` : `${p.hora}h`;
}

/** "sexta, 28/11". */
export function formatarData(ms, tz = FUSO_PADRAO) {
  const p = partes(ms, tz);
  return `${DIAS[p.diaSemana]}, ${pad(p.dia)}/${pad(p.mes)}`;
}

export const nomeDia = (n) => DIAS[((n % 7) + 7) % 7];

/** "hoje", "amanhã", "ontem" ou "sexta, 28/11" em relação a `agora`. */
export function rotuloDia(ms, agora, tz = FUSO_PADRAO) {
  const d = Math.round((inicioDoDia(ms, tz) - inicioDoDia(agora, tz)) / 86400e3);
  if (d === 0) return 'hoje';
  if (d === 1) return 'amanhã';
  if (d === -1) return 'ontem';
  return formatarData(ms, tz);
}

/** "hoje às 12h30", "amanhã às 0h", "sexta, 28/11 às 23h". */
export const quandoTexto = (ms, agora, tz = FUSO_PADRAO) => `${rotuloDia(ms, agora, tz)} às ${formatarHora(ms, tz)}`;

/** Contagem regressiva: dias, horas, minutos e segundos até `ms` (nunca negativa). */
export function contagem(ms, agora) {
  let s = Math.max(0, Math.floor((ms - agora) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const texto = d ? `${d}d ${h}h ${pad(m)}min` : h ? `${h}h ${pad(m)}min ${pad(s)}s` : `${m}min ${pad(s)}s`;
  return { d, h, m, s, total: Math.max(0, ms - agora), texto };
}

/** Duração falada: "meia hora", "1 hora", "15 minutos", "2 dias". */
export function duracaoTexto(min) {
  if (min === 30) return 'meia hora';
  if (min % 1440 === 0) return min === 1440 ? '1 dia' : `${min / 1440} dias`;
  if (min % 60 === 0) return min === 60 ? '1 hora' : `${min / 60} horas`;
  return `${min} minutos`;
}
