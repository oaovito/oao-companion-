// Sistema antitédio (camadas por cima do motor de variedade): progressão e
// coleções, missões diárias, diário, rotinas/mini-histórias e mini-jogos de
// conversa. Puro: estado salvo, relógio e sorteio são injetados. Tudo é
// opcional e sem cobrança — nada aqui interrompe o trabalho dela.

import { dayKey } from '../personality.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

function pickOne(list, rng) {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function emptyProgress() {
  return { xp: 0, contas: {}, conquistas: {}, poses: [], cartas: [], album: [], areas: [], missoes: null, diario: null, rotinas: { recentes: [], progresso: {}, episodio: 0 }, jogos: { ultimo: null }, interesses: [], rotinaFixa: {}, horas: {}, diasQuietos: null, humorDia: null };
}

// ---------------------------------------------------------------- progressão e coleções

export class Progress {
  constructor({ data, state, save = () => {}, rng = Math.random, now = () => Date.now() }) {
    this.data = data;
    this.st = { ...emptyProgress(), ...(state || {}) };
    this.save = save;
    this.rng = rng;
    this.now = now;
  }

  get nivel() {
    return Math.min(this.data.niveis.length, 1 + Math.floor(this.st.xp / this.data.xpPorNivel));
  }

  get nomeNivel() {
    return this.data.niveis[this.nivel - 1];
  }

  /** Acessórios liberados até o nível atual. */
  get acessorios() {
    return this.data.acessorios.filter((a) => a.nivel <= this.nivel);
  }

  /** Soma XP; devolve {subiu, nivel} quando passa de nível. */
  xp(kind) {
    const before = this.nivel;
    this.st.xp += this.data.xp[kind] || 0;
    this.save(this.st);
    return this.nivel > before ? { subiu: true, nivel: this.nivel, nome: this.nomeNivel } : null;
  }

  /** Conta um evento e devolve as conquistas novas. */
  count(kind, n = 1, absolute = false) {
    const c = this.st.contas;
    c[kind] = absolute ? n : (c[kind] || 0) + n;
    const novas = [];
    for (const q of this.data.conquistas) {
      if (q.conta === kind && !this.st.conquistas[q.id] && c[kind] >= q.n) {
        this.st.conquistas[q.id] = this.now();
        novas.push(q);
      }
    }
    this.save(this.st);
    return novas;
  }

  /** Pose (animação) vista pela primeira vez entra na coleção; raras vão pro álbum. */
  seePose(item) {
    if (!item || this.st.poses.includes(item.id)) return [];
    this.st.poses.push(item.id);
    if (item.frequencia !== 'comum') {
      this.st.album.push({ id: item.id, nome: item.nome, quando: this.now() });
      if (this.st.album.length > 60) this.st.album.shift();
    }
    this.xp('poseNova');
    const novas = this.count('poses', this.st.poses.length, true);
    if (item.frequencia === 'easter') novas.push(...this.count('easter'));
    return novas;
  }

  /** Carta colecionável: cada fala ambiente nova vira uma carta. */
  seeCard(line) {
    if (!line) return [];
    const key = line.t.slice(0, 60);
    if (this.st.cartas.includes(key)) return [];
    this.st.cartas.push(key);
    return this.count('cartas', this.st.cartas.length, true);
  }

  /** Área do aquário (temporada) visitada. */
  visitArea(id) {
    if (!id || this.st.areas.includes(id)) return false;
    this.st.areas.push(id);
    this.save(this.st);
    return true;
  }

  /** Missões do dia: 3 pequenas e opcionais, sorteadas uma vez por dia. */
  missoes(date = new Date()) {
    const day = dayKey(date);
    if (!this.st.missoes || this.st.missoes.dia !== day) {
      const pool = [...this.data.missoes];
      const itens = [];
      while (itens.length < 3 && pool.length) itens.push({ ...pool.splice(Math.floor(this.rng() * pool.length), 1)[0], feito: 0 });
      this.st.missoes = { dia: day, itens };
      this.save(this.st);
    }
    return this.st.missoes.itens;
  }

  /** Evento que pode cumprir missão. Devolve a missão concluída agora (ou null). */
  missionEvent(evento, date = new Date()) {
    for (const m of this.missoes(date)) {
      if (m.evento !== evento || m.ok) continue;
      m.feito += 1;
      if (m.feito >= (m.n || 1)) {
        m.ok = true;
        this.xp('missao');
        this.count('missoes');
        return m;
      }
      this.save(this.st);
    }
    return null;
  }

  /** Diário do tubarão: o que aconteceu hoje (resumo no fim do dia). */
  log(tipo, date = new Date()) {
    const day = dayKey(date);
    if (!this.st.diario || this.st.diario.dia !== day) this.st.diario = { dia: day, c: {} };
    this.st.diario.c[tipo] = (this.st.diario.c[tipo] || 0) + 1;
    this.save(this.st);
  }

  resumoDia(date = new Date()) {
    const d = this.st.diario && this.st.diario.dia === dayKey(date) ? this.st.diario.c : {};
    const parts = [];
    if (d.foco) parts.push(`${d.foco} bloco${d.foco > 1 ? 's' : ''} de foco`);
    if (d.vitoria) parts.push(`${d.vitoria} vitória${d.vitoria > 1 ? 's' : ''}`);
    if (d.jogo) parts.push(`${d.jogo} mini-jogo${d.jogo > 1 ? 's' : ''}`);
    if (d.chat) parts.push(`${d.chat} mensage${d.chat > 1 ? 'ns' : 'm'}`);
    if (d.pose) parts.push(`${d.pose} pose${d.pose > 1 ? 's' : ''} minha${d.pose > 1 ? 's' : ''}`);
    if (d.musica) parts.push(`${d.musica} música${d.musica > 1 ? 's' : ''}`);
    const missoes = (this.st.missoes && this.st.missoes.dia === dayKey(date) ? this.st.missoes.itens : []).filter((m) => m.ok).length;
    if (missoes) parts.push(`${missoes} missão${missoes > 1 ? 'ões' : ''}`);
    if (!parts.length) return 'Hoje foi tranquilo. Amanhã a gente aperta.';
    return `Resumo do dia: ${parts.join(', ')}. Nível ${this.nivel} (${this.nomeNivel}). Orgulhoso. Sério.`;
  }

  /** Horários em que ela mais interage (para o motor de variedade). */
  noteHour(date = new Date()) {
    const h = String(date.getHours());
    this.st.horas[h] = (this.st.horas[h] || 0) + 1;
    this.save(this.st);
  }

  /** Peso extra para animações na hora em que ela costuma interagir (1 a 1,6). */
  hourBoost(date = new Date()) {
    const v = Object.values(this.st.horas);
    if (!v.length) return 1;
    const max = Math.max(...v);
    return 1 + 0.6 * ((this.st.horas[String(date.getHours())] || 0) / max);
  }

  snapshot(date = new Date()) {
    return {
      nivel: this.nivel,
      nomeNivel: this.nomeNivel,
      xp: this.st.xp,
      proximo: this.nivel * this.data.xpPorNivel,
      conquistas: this.data.conquistas.map((q) => ({ ...q, ok: !!this.st.conquistas[q.id] })),
      poses: this.st.poses.length,
      acessorios: this.data.acessorios.map((a) => ({ ...a, ok: a.nivel <= this.nivel })),
      album: this.st.album.slice(-12).reverse(),
      cartas: this.st.cartas.length,
      areas: this.data.areas.map((a) => ({ ...a, ok: this.st.areas.includes(a.id) })),
      missoes: this.missoes(date),
      resumo: this.resumoDia(date),
      streak: (this.st.contas.streak || 0),
    };
  }
}

// ---------------------------------------------------------------- rotinas e mini-histórias

/** Escolhe a próxima rotina (sem repetir a anterior; peso por frequência e horário). */
export function pickRoutine(rotinas, st, { rng = Math.random, period = null, freq = { comum: 10, rara: 2.5, easter: 0.35 } } = {}) {
  const recent = st.recentes || [];
  const w = rotinas.map((r) => {
    if (recent[recent.length - 1] === r.id) return 0;
    let v = freq[r.frequencia] ?? 10;
    if (recent.includes(r.id)) v *= 0.2;
    if (r.horario) v *= r.horario.includes(period) ? 2 : 0.3;
    return v;
  });
  const total = w.reduce((a, b) => a + b, 0);
  if (!total) return null;
  let x = rng() * total;
  for (let i = 0; i < rotinas.length; i++) {
    x -= w[i];
    if (x <= 0) return rotinas[i];
  }
  return rotinas[rotinas.length - 1];
}

/** Passos concretos da rotina (troca {etapa} e {episodio}); atualiza o progresso. */
export function routineSteps(r, st, date = new Date()) {
  st.recentes = [...(st.recentes || []), r.id].slice(-8);
  let etapa = null;
  if (r.progresso) {
    const day = dayKey(date);
    const p = st.progresso[r.id] && st.progresso[r.id].dia === day ? st.progresso[r.id] : { dia: day, n: 0 };
    p.n = Math.min(r.progresso, p.n + 1);
    st.progresso[r.id] = p;
    etapa = p.n;
  }
  let episodio = null;
  if (r.episodios) {
    episodio = r.episodios[(st.episodio || 0) % r.episodios.length];
    st.episodio = (st.episodio || 0) + 1;
  }
  return r.passos.map((p) => ({ anim: p.anim, fala: p.fala ? p.fala.replace('{etapa}', etapa).replace('{episodio}', episodio) : null }));
}

// ---------------------------------------------------------------- mini-jogos de conversa

/**
 * Estados de mini-jogos jogados no chat. `start` devolve {game, text, anim};
 * `answer(game, texto)` devolve {text, done, win, anim}.
 */
export class Games {
  constructor({ data, rng = Math.random }) {
    this.data = data;
    this.rng = rng;
    this.byId = new Map(data.jogos.map((j) => [j.id, j]));
  }

  find(text) {
    const n = norm(text);
    let best = null;
    for (const j of this.data.jogos) {
      for (const f of j.frases) if (n.includes(norm(f)) && (!best || f.length > best.len)) best = { j, len: f.length };
      if (n.includes(norm(j.nome))) best = { j, len: 99 };
    }
    return best ? best.j : null;
  }

  random(last = null) {
    const opts = this.data.jogos.filter((j) => j.id !== last);
    return pickOne(opts, this.rng);
  }

  start(jogo) {
    const g = { id: jogo.id, tipo: jogo.tipo, nome: jogo.nome, rodada: 0, pontos: 0 };
    const r = this.rng;
    switch (jogo.tipo) {
      case 'quiz': {
        g.q = pickOne(this.data.quiz, r);
        return { game: g, text: `${g.q.p} ${g.q.o.map((o, i) => `${'abc'[i]}) ${o}`).join('  ')}`, anim: 'pensando' };
      }
      case 'curiosidade': {
        g.q = pickOne(this.data.curiosidades, r);
        return { game: g, text: `Verdade ou mentira? ${g.q.p}`, anim: 'sobrancelha' };
      }
      case 'emocao': {
        g.q = pickOne(this.data.emocoes, r);
        const opts = [g.q, ...this.data.emocoes.filter((e) => e !== g.q).sort(() => r() - 0.5).slice(0, 2)].sort(() => r() - 0.5);
        g.opts = opts.map((o) => o.nome);
        return { game: g, text: `Que emoção é essa? ${g.opts.join(', ')}?`, anim: g.q.anim };
      }
      case 'ppn':
        return { game: g, text: 'Pedra, papel ou nadadeira? Escolhe. (Nadadeira corta papel, pedra amassa nadadeira.)', anim: 'quedaBraco' };
      case 'memoria':
      case 'lider': {
        g.seq = [...this.data.poses].sort(() => r() - 0.5).slice(0, 3);
        return { game: g, text: jogo.tipo === 'lider' ? `Repete o que eu faço: ${g.seq.map((p) => p.nome).join(', ')}. Escreve na ordem.` : 'Presta atenção nas três poses. Depois escreve na ordem.', sequence: g.seq.map((p) => p.anim) };
      }
      case 'cacaPalavras': {
        g.word = pickOne(this.data.palavras, r);
        const size = Math.max(6, g.word.length);
        const letters = 'ABCDEFGHIJLMNOPRSTUV';
        const rows = [];
        const row = Math.floor(r() * size);
        const col = Math.floor(r() * (size - g.word.length + 1));
        for (let y = 0; y < size; y++) {
          let line = '';
          for (let x = 0; x < size; x++) line += y === row && x >= col && x < col + g.word.length ? g.word[x - col] : letters[Math.floor(r() * letters.length)];
          rows.push(line.split('').join(' '));
        }
        return { game: g, text: `Ache a palavra (na horizontal):\n${rows.join('\n')}`, anim: 'lendo' };
      }
      case 'repeticoes':
        g.n = 1;
        return { game: g, text: 'Repetições em dupla: eu falo os ímpares, você os pares. 1!', anim: 'contarRepeticoes' };
      case 'reflexo':
        return { game: g, text: jogo.id === 'corrida' ? 'Corrida de nado: quando eu disser JÁ, escreve qualquer coisa. Prepara…' : 'Equilíbrio: quando eu disser AGORA, escreve qualquer coisa pra me segurar. Prepara…', anim: jogo.id === 'corrida' ? 'nadarCirculos' : 'balancar', timer: 'reflexo' };
      case 'esconde':
        return { game: g, text: 'Me acha! Clica em mim (modo de interação) ou escreve "achei" quando me ver.', anim: 'escondeBorda' };
      case 'pega':
        return { game: g, text: 'Pega-pega: tenta clicar em mim. Eu fujo devagar.', anim: 'pulinho' };
      case 'cabo':
        return { game: g, text: 'Cabo de guerra: me arrasta pra longe (mais de 250 px). Eu puxo de volta.', anim: 'quedaBraco' };
      case 'cliques':
        return { game: g, text: 'Clique rápido: clica em mim o máximo que der em 10 s. Valendo!', anim: 'encarar' };
      case 'bolhas':
        return { game: g, text: 'Caça às bolhas: estoura o máximo de bolhas em 15 s!', anim: 'soprarBolhas' };
      default:
        return { game: g, text: 'Bora jogar.', anim: 'convidar' };
    }
  }

  answer(g, text, { now = 0 } = {}) {
    const n = norm(text);
    const r = this.rng;
    switch (g.tipo) {
      case 'quiz': {
        const idx = /^[abc]$/.test(n) ? 'abc'.indexOf(n) : g.q.o.findIndex((o) => norm(o) === n || n.includes(norm(o)));
        if (idx < 0) return { text: 'Responde a, b ou c.', done: false };
        const win = idx === g.q.r;
        return { text: win ? 'Acertou. Cérebro de campeã.' : `Errou. Era "${g.q.o[g.q.r]}". Sabia que você ia errar.`, done: true, win, anim: win ? 'aplaudir' : 'sabiaQueIaErrar' };
      }
      case 'curiosidade': {
        const v = /\b(verdade|v|sim|true)\b/.test(n) ? true : /\b(mentira|m|nao|false)\b/.test(n) ? false : null;
        if (v === null) return { text: 'Verdade ou mentira?', done: false };
        const win = v === g.q.r;
        return { text: win ? 'Isso. Sabe das coisas.' : `Nope. É ${g.q.r ? 'verdade' : 'mentira'}.`, done: true, win, anim: win ? 'aplaudir' : 'linguaVitoria' };
      }
      case 'emocao': {
        const win = n.includes(norm(g.q.nome));
        return { text: win ? 'Isso. Você me lê fácil.' : `Era ${g.q.nome}. Eu sou um mistério.`, done: true, win, anim: win ? 'feliz' : 'sorrisoCanto' };
      }
      case 'ppn': {
        const opts = ['pedra', 'papel', 'nadadeira'];
        const me = opts.find((o) => n.includes(o));
        if (!me) return { text: 'Pedra, papel ou nadadeira?', done: false };
        const jo = pickOne(opts, r);
        const beats = { pedra: 'nadadeira', papel: 'pedra', nadadeira: 'papel' };
        if (me === jo) return { text: `${jo}! Empate. De novo: pedra, papel ou nadadeira?`, done: false };
        const win = beats[me] === jo;
        return { text: `Eu: ${jo}. ${win ? 'Você ganhou. Dessa vez.' : 'Ganhei. Óbvio.'}`, done: true, win, anim: win ? 'aplausoLento' : 'dancaVitoria' };
      }
      case 'memoria':
      case 'lider': {
        const want = g.seq.map((p) => norm(p.nome));
        const tokens = n.split(/[\s,;-]+/).filter((x) => x && x !== 'e');
        const win = want.every((w, i) => tokens[i] && tokens[i].startsWith(w.slice(0, 3)));
        return { text: win ? 'Memória de elefante. De tubarão, no caso.' : `Era: ${g.seq.map((p) => p.nome).join(', ')}.`, done: true, win, anim: win ? 'aplaudir' : 'sabiaQueIaErrar' };
      }
      case 'cacaPalavras': {
        const win = n.replace(/\s/g, '') === norm(g.word).replace(/\s/g, '');
        if (!win && g.rodada++ < 2) return { text: 'Não é essa. Tenta de novo.', done: false };
        return { text: win ? `${g.word}! Achou.` : `Era ${g.word}.`, done: true, win, anim: win ? 'comemorar' : 'ombros' };
      }
      case 'repeticoes': {
        const v = Number(n);
        if (v !== g.n + 1) return { text: `Errou a conta. Era ${g.n + 1}. Recomeça: 1!`, done: (g.n = 1, false), anim: 'chocado' };
        if (v >= 10) return { text: '10! Série completa. Toca aqui.', done: true, win: true, anim: 'highFive' };
        g.n = v + 1;
        return { text: `${g.n}!`, done: false, anim: 'contarRepeticoes' };
      }
      case 'reflexo': {
        if (!g.goAt) return { text: 'Queimou a largada! Espera eu dizer.', done: true, win: false, anim: 'linguaVitoria' };
        const ms = Math.max(0, now - g.goAt);
        const win = ms < 2500;
        return { text: win ? `${(ms / 1000).toFixed(2).replace('.', ',')} s. Rápida.` : `${(ms / 1000).toFixed(1).replace('.', ',')} s. Lenta igual tartaruga.`, done: true, win, anim: win ? 'aplaudir' : 'dancaVitoria' };
      }
      case 'esconde': {
        const win = /\b(achei|te achei|ali|ta ai|esta ai)\b/.test(n);
        return win ? { text: 'Me achou. Tubarão desse tamanho não se esconde bem.', done: true, win, anim: 'feliz' } : { text: 'Tô escondido. Procura.', done: false };
      }
      default:
        return { text: 'Isso é com clique, não com texto.', done: false };
    }
  }
}
