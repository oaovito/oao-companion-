// Rotina diária: quatro blocos (manhã, estudo, treino e sono) com horário
// definido por ela. O JoJo avisa na hora de cada um (sempre visual) e mostra o
// que já foi cumprido no dia. Puro: estado salvo é injetado. Estudo, treino e
// sono cumpridos vêm dos hábitos; a manhã é marcada aqui.

export const ROUTINE_BLOCKS = Object.freeze({ manha: 'Manhã', estudo: 'Estudo', treino: 'Treino', sono: 'Sono' });
export const ROUTINE_IDS = Object.keys(ROUTINE_BLOCKS);
const JANELA_AVISO_MIN = 60; // depois disso o aviso do bloco não sai mais naquele dia
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => semAcento(s).replace(/[^a-z0-9:\s]/g, ' ').replace(/\s+/g, ' ').trim();
const hhmm = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const minutos = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));

/** Regra do projeto: dormir só entre 21h e 6h. */
export function sonoPermitido(hora) {
  const m = minutos(hora);
  return m >= 21 * 60 || m < 6 * 60;
}

export function sanitizeRoutine(input) {
  const src = input && typeof input === 'object' ? input : {};
  const blocos = {};
  for (const id of ROUTINE_IDS) {
    const hora = src.blocos && src.blocos[id];
    if (typeof hora === 'string' && HORA.test(hora) && (id !== 'sono' || sonoPermitido(hora))) blocos[id] = hora;
  }
  const dia = DIA.test(src.dia || '') ? src.dia : null;
  const lista = (v) => (Array.isArray(v) ? v.filter((id) => ROUTINE_IDS.includes(id)) : []);
  return { blocos, dia, avisados: dia ? lista(src.avisados) : [], manhaFeita: dia ? src.manhaFeita === true : false };
}

const PALAVRAS = { manha: /(?:manha|acordar|acordo|levantar|levanto)/, estudo: /(?:estudo|estudar|estudos)/, treino: /(?:treino|treinar|academia|malhar)/, sono: /(?:sono|dormir|durmo|cama|deitar)/ };

/** Extrai "bloco horário" do texto: "acordar 7h, estudar 14:00, treino 18h30, dormir 22:30". */
export function extractBlocks(text) {
  const n = norm(text);
  const out = {};
  for (const id of ROUTINE_IDS) {
    const m = n.match(new RegExp(`\\b${PALAVRAS[id].source}\\b(?:\\s+(?:as|a|de|da|do|no|na|pela|ate|comeca|as)){0,3}\\s+(\\d{1,2})(?:(?::|h)\\s*(\\d{2}))?(?:\\s*(?:hs|horas?|h)\\b)?(?:\\s+da\\s+(manha|tarde|noite)\\b)?`));
    if (!m) continue;
    let h = Number(m[1]);
    const min = Number(m[2] || 0);
    if (/(tarde|noite)/.test(m[3] || '') && h < 12) h += 12;
    if (h > 23 || min > 59) continue;
    out[id] = hhmm(h, min);
  }
  return out;
}

/** Pedido sobre a rotina em linguagem natural. Devolve a ação ou null. */
export function parseRoutineRequest(text) {
  const n = norm(String(text || '').replace(/^\s*jojo[,!:]?\s*/i, ''));
  if (!n || n.length > 240 || !/\brotina\b/.test(n)) {
    if (/^(acordei|levantei|ja acordei|ja levantei|to de pe|estou de pe)\b/.test(n)) return { tipo: 'feito', bloco: 'manha', natural: true };
    return null;
  }
  if (/^(minha rotina|qual (e |eh )?(a )?minha rotina|ver (a |minha )?rotina|mostra\w* (a |minha )?rotina|rotina de hoje|como (esta|ta|anda|vai) (a )?minha rotina)\b/.test(n)) return { tipo: 'ver' };
  if (/\b(apaga|apague|limpa|limpe|zera|zere|cancela|cancele|tira|tire)\b.*\brotina\b/.test(n)) return { tipo: 'limpar' };
  if (/\b(monta|montar|monte|cria|criar|crie|define|definir|defina|muda|mudar|mude|ajusta|ajustar|ajuste|faz|fazer|faca|quero)\w*\b.*\brotina\b/.test(n) || /^(minha )?rotina\s*:/.test(n)) {
    return { tipo: 'montar', blocos: extractBlocks(text) };
  }
  return null;
}

/**
 * Comando "/rotina …" da rotina diária. Devolve null para os usos antigos
 * ("/rotina bom dia: texto"), que continuam com o tratamento de sempre.
 */
export function parseRoutineCommand(arg) {
  const n = norm(arg);
  if (/^(ver|hoje|status)$/.test(n)) return { tipo: 'ver' };
  if (/^(limpar|apagar|zerar)$/.test(n)) return { tipo: 'limpar' };
  let m = n.match(/^(?:feito|feita|fiz|ok)\s+(manha|estudo|treino|sono)$/);
  if (m) return { tipo: 'feito', bloco: m[1] };
  m = n.match(/^(?:montar|definir|criar)\s*(.*)$/);
  if (m) return { tipo: 'montar', blocos: extractBlocks(m[1]) };
  return null;
}

export class Routine {
  /** @param habits acompanhamento de hábitos (estudo, treino e sono cumpridos vêm de lá) */
  constructor({ state = null, save = () => {}, habits = null } = {}) {
    this.st = sanitizeRoutine(state);
    this.save = save;
    this.habits = habits;
  }

  _virar(day) {
    if (this.st.dia === day) return;
    this.st.dia = day;
    this.st.avisados = [];
    this.st.reforcados = [];
    this.st.manhaFeita = false;
  }

  /** O bloco já foi cumprido hoje? */
  feito(id, day) {
    this._virar(day);
    if (id === 'manha') return this.st.manhaFeita;
    return this.habits ? this.habits.has(id, day) : false;
  }

  /** Linhas de dados: bloco, horário e se foi cumprido hoje. */
  lines(day) {
    return ROUTINE_IDS.filter((id) => this.st.blocos[id]).map((id) => `${this.st.blocos[id]} ${ROUTINE_BLOCKS[id]}${this.feito(id, day) ? ' ✓' : ''}`).sort();
  }

  /** Aplica a ação. Devolve {fala, vars, itens?}. */
  apply(a, day) {
    if (!a) return null;
    this._virar(day);
    if (a.tipo === 'montar') {
      const pedidos = Object.entries(a.blocos || {});
      if (!pedidos.length) return { fala: 'rotinaAjuda', vars: {} };
      const recusado = a.blocos.sono && !sonoPermitido(a.blocos.sono);
      for (const [id, hora] of pedidos) if (id !== 'sono' || !recusado) this.st.blocos[id] = hora;
      this.save(this.st);
      if (recusado && pedidos.length === 1) return { fala: 'rotinaSonoCedo', vars: { hora: a.blocos.sono } };
      return { fala: recusado ? 'rotinaMontadaSemSono' : 'rotinaMontada', vars: { hora: a.blocos.sono || '' }, itens: this.lines(day) };
    }
    if (a.tipo === 'ver') {
      const itens = this.lines(day);
      return itens.length ? { fala: 'rotinaVer', vars: {}, itens } : { fala: 'rotinaVazia', vars: {} };
    }
    if (a.tipo === 'limpar') {
      this.st.blocos = {};
      this.st.avisados = [];
      this.save(this.st);
      return { fala: 'rotinaLimpa', vars: {} };
    }
    if (a.tipo === 'feito') {
      if (a.bloco === 'manha') this.st.manhaFeita = true;
      else if (this.habits) this.habits.log(a.bloco, day);
      this.save(this.st);
      return { fala: 'rotinaFeito', vars: { bloco: ROUTINE_BLOCKS[a.bloco].toLowerCase() } };
    }
    return null;
  }

  /** Blocos cuja hora chegou e que ainda não foram avisados nem cumpridos hoje. */
  due(date, day) {
    this._virar(day);
    const agora = date.getHours() * 60 + date.getMinutes();
    const out = [];
    for (const id of ROUTINE_IDS) {
      const hora = this.st.blocos[id];
      if (!hora || this.st.avisados.includes(id) || this.feito(id, day)) continue;
      const atraso = agora - minutos(hora);
      if (atraso >= 0 && atraso <= JANELA_AVISO_MIN) out.push({ bloco: id, hora });
    }
    return out;
  }

  /**
   * Reforço (só no dia de energia alta): bloco de estudo ou treino já avisado,
   * ainda não cumprido, 30 a 60 min depois da hora. No máximo um reforço por bloco.
   */
  dueAgain(date, day) {
    this._virar(day);
    const agora = date.getHours() * 60 + date.getMinutes();
    const out = [];
    for (const id of ['estudo', 'treino']) {
      const hora = this.st.blocos[id];
      if (!hora || !this.st.avisados.includes(id) || (this.st.reforcados || []).includes(id) || this.feito(id, day)) continue;
      const atraso = agora - minutos(hora);
      if (atraso >= 30 && atraso <= JANELA_AVISO_MIN) out.push({ bloco: id, hora });
    }
    return out;
  }

  markReinforced(id, day) {
    this._virar(day);
    this.st.reforcados = [...new Set([...(this.st.reforcados || []), id])];
    this.save(this.st);
  }

  markWarned(id, day) {
    this._virar(day);
    if (!this.st.avisados.includes(id)) this.st.avisados.push(id);
    this.save(this.st);
  }
}
