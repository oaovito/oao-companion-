import { shiftDay } from './civil-time.js';
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

export class TodoChat {
  constructor(model, { now = () => Date.now() } = {}) { this.model = model; this.now = now; this.confirmation = null; }
  find(title) {
    const n = norm(title);
    const exact = this.model.st.tasks.filter(t => !t.archived && norm(t.title) === n);
    return exact.length ? exact : this.model.st.tasks.filter(t => !t.archived && n.length >= 3 && norm(t.title).includes(n));
  }
  reply(raw) {
    const s = String(raw).replace(/^\s*jojo[,!:]?\s*/i, '').trim(); const n = norm(s);
    if (this.confirmation && this.confirmation.until < this.now()) this.confirmation = null;
    if (this.confirmation && /^(sim|confirmo|pode excluir|pode apagar)$/.test(n)) {
      const { id, title } = this.confirmation; this.confirmation = null;
      try { this.model.remove(id, true); return `Removi “${title}”. O histórico e o XP anterior continuam preservados.`; }
      catch { return 'Essa tarefa já não está na lista.'; }
    }
    if (this.confirmation && /^(nao|cancela|cancelar)$/.test(n)) { this.confirmation = null; return 'Exclusão cancelada. A tarefa continua na lista.'; }
    // Negativas e perguntas não são autorização para alterar tarefas.
    if (/\b(nao|nunca)\s+(?:quero\s+)?(?:adicion|coloc|marc|tir|remov|apag|mud|reset)/.test(n)) return 'Certo. Não alterei sua lista.';
    let m = s.match(/^(?:adiciona|adicione|coloca|coloque|inclua|incluir)\s+(.+?)(?:\s+(?:na|minha|a minha)\s+lista)?[.!]?$/i);
    if (m) {
      let title = m[1].replace(/\s+(?:na|minha|a minha)\s+lista$/i, '').trim();
      const daily = /\s+todos os dias[.!]?$/i.test(title); title = title.replace(/\s+todos os dias[.!]?$/i, '');
      // “coloca” só atua com contexto de lista/recorrência; não interceptar outros comandos.
      if (/^coloc/i.test(s) && !daily && !/\blista\b/.test(n)) return null;
      if (this.find(title).some(t => norm(t.title) === norm(title))) return `“${title}” já está na lista. Não criei uma cópia.`;
      this.model.add({ title, ...(daily ? { frequency: 'daily' } : {}) });
      return `${this.model.line('added')} “${title}”${daily ? ', diariamente' : ''}.`;
    }
    m = s.match(/^(?:marca|marque|conclua|concluir|desmarca|desmarque)\s+(.+?)(?:\s+como\s+(?:conclu[ií]d[ao]|feit[ao]|pendente))?[.!]?$/i);
    if (m) {
      const title = m[1].replace(/\s+como\s+(conclu[ií]d[ao]|feit[ao]|pendente)$/i, '');
      const found = this.find(title); if (found.length !== 1) return this.clarify(found);
      const complete = !/^desmar/i.test(s) && !/como pendente/i.test(s);
      this.model.complete(found[0].id, complete);
      return `${complete ? this.model.line(this.model.snapshot().pending === 0 ? 'all' : 'done') : 'Voltou a ficar pendente. Remarcar não concede XP duplicado.'} “${found[0].title}”.`;
    }
    m = s.match(/^(?:tira|tire|remove|remova|apaga|apague|exclua)\s+(.+?)(?:\s+(?:da|minha)\s+lista)?[.!]?$/i);
    if (m && (/\b(tarefa|lista)\b/.test(n) || this.find(m[1]).length)) {
      const title = m[1].replace(/\s+da lista$/i, '').replace(/^(?:a tarefa|tarefa)\s+/i, '');
      const found = /^(essa|esta|aquela)( tarefa)?$/i.test(title) ? [] : this.find(title);
      if (found.length !== 1) return this.clarify(found);
      const t = found[0]; const result = this.model.remove(t.id);
      if (result.needsConfirmation) { this.confirmation = { id: t.id, title: t.title, until: this.now() + 120000 }; return `Excluir “${t.title}”? Responda “confirmo” ou “cancela”.`; }
      return `Removi “${t.title}”.`;
    }
    m = n.match(/^(?:muda|mude|altera|altere) (?:o )?(?:reset|reinicio) (?:para|pras|as) (?:as )?(\d{1,2})(?::(\d{2}))?(?: (?:horas|h|da manha|da tarde|da noite))?$/);
    if (m) {
      let h = Number(m[1]); if (/(tarde|noite)/.test(n) && h < 12) h += 12;
      const resetTime = `${String(h).padStart(2, '0')}:${m[2] || '00'}`;
      try { this.model.configure({ resetTime }); return `Reinício das tarefas às ${resetTime}, no fuso ${this.model.st.settings.zone === 'local' ? 'local do Windows' : this.model.st.settings.zone}. Títulos e histórico ficam preservados.`; }
      catch { return 'Qual horário válido de reinício? Pode dizer “muda o reset para 06:00”.'; }
    }
    const query = /(?:o que (?:eu )?tenho (?:que|pra|para) fazer|o que (?:ainda )?falta|quais tarefas|quanto falta (?:para|pra) terminar|(?:mostra|mostrar|ver|abre|abrir) (?:a |minha )?lista|lista de tarefas|tarefas (?:de hoje|pendentes|concluidas)|minhas tarefas)/.test(n);
    if (!query) return null;
    const day = /amanha/.test(n) ? shiftDay(this.model.sync(), 1) : this.model.sync();
    const filter = /(?:ja completei|concluidas|completas|ja fiz)/.test(n) ? 'completed' : /(?:falta|pendentes)/.test(n) ? 'pending' : 'all';
    const snap = this.model.snapshot({ day, filter });
    if (!snap.total) return `${day === this.model.st.day ? 'Hoje' : 'Amanhã'} não há tarefas previstas na sua lista. Posso adicionar uma quando você pedir.`;
    const prefix = `${snap.completed}/${snap.total} concluídas (${snap.percent}%). ${snap.pending} pendente${snap.pending === 1 ? '' : 's'}.`;
    if (/quanto falta/.test(n)) return prefix;
    return `${prefix}\n${snap.tasks.map(t => `${t.completed ? '✓' : '○'} ${t.title}${t.time ? ` — ${t.time}` : ''}`).join('\n')}${snap.count > snap.tasks.length ? `\nMais ${snap.count - snap.tasks.length} na área Lista de Tarefas.` : ''}`;
  }
  clarify(found) {
    return found.length ? `Qual delas? ${found.slice(0, 5).map(t => `“${t.title}”`).join(', ')}. Não alterei nada.` : 'Qual é o título da tarefa? Não alterei nada sem identificar a tarefa.';
  }
}
