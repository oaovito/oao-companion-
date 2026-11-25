// Minijogos que faltavam (0.48): ritmo, enigma, raciocínio, quebra-cabeça,
// velocidade, caça ao tesouro na tela, treino do JoJo e sorte (só virtual).
// Mesmo contrato dos jogos de conversa de Games: start(jogo, g, ctx) →
// {game,text,anim,timer?}; answer(g, texto, {now}) → {text,done,win,score,anim}.
// Dificuldade progressiva: ctx.dificuldade (1..5, pelo nível do JoJo e pelo
// recorde). Todos encerram com "sair", como os outros.

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const pick = (l, r) => l[Math.floor(r() * l.length) % l.length];

export const MINIJOGOS_EXTRA = Object.freeze([
  { id: 'ritmo', nome: 'Ritmo do Supino', n: 61, tipo: 'ritmo', duracao: 180, nivel: 3, frases: ['jogo de ritmo', 'ritmo do supino', 'batida'] },
  { id: 'enigma', nome: 'Enigma do Abismo', n: 62, tipo: 'enigma', duracao: 240, nivel: 4, frases: ['enigma', 'charada', 'adivinha'] },
  { id: 'sequencia', nome: 'Sequência Lógica', n: 63, tipo: 'sequencia', duracao: 240, nivel: 6, frases: ['sequencia logica', 'raciocinio', 'sequência lógica'] },
  { id: 'anagrama', nome: 'Quebra-Cabeça de Letras', n: 64, tipo: 'anagrama', duracao: 180, nivel: 5, frases: ['anagrama', 'quebra cabeca', 'quebra-cabeça'] },
  { id: 'digitacao', nome: 'Desafio de Velocidade', n: 65, tipo: 'digitacao', duracao: 60, nivel: 7, frases: ['desafio de velocidade', 'digitar rapido', 'velocidade'] },
  { id: 'tesouro', nome: 'Caça ao Tesouro na Tela', n: 66, tipo: 'tesouro', duracao: 240, nivel: 2, frases: ['caca ao tesouro', 'caça ao tesouro', 'tesouro escondido'] },
  { id: 'treinoJojo', nome: 'Treino do JoJo', n: 67, tipo: 'treino', duracao: 180, nivel: 2, frases: ['treina o jojo', 'treino do jojo', 'treinar o jojo'] },
  { id: 'dados', nome: 'Dados do Tubarão', n: 68, tipo: 'dados', duracao: 120, nivel: 8, frases: ['dados do tubarao', 'jogo de dados', 'maior ou menor'] },
]);

const ENIGMAS = [
  { p: 'Tenho dentes mas não mordo. O que sou?', r: ['pente'], d: 'Fica no banheiro.' },
  { p: 'Quanto mais tiro, maior fico. O que sou?', r: ['buraco'], d: 'Pá ajuda.' },
  { p: 'Tenho teclas mas não abro portas. O que sou?', r: ['teclado', 'piano'], d: 'Você está usando um agora.' },
  { p: 'Corro sem pernas e tenho margem sem ser estrada. O que sou?', r: ['rio'], d: 'Tubarão de água doce odeia.' },
  { p: 'Quanto mais seco, mais molhada fico. O que sou?', r: ['toalha'], d: 'Depois do banho.' },
  { p: 'Sou cheio de buracos mas seguro água. O que sou?', r: ['esponja'], d: 'Bob sabe.' },
  { p: 'Tenho cabeça e cauda, mas não tenho corpo. O que sou?', r: ['moeda', 'jojocoin', 'JOJOcoins'.toLowerCase()], d: 'Cara ou coroa.' },
  { p: 'Quebro sem ser tocado quando dizem meu nome. O que sou?', r: ['silencio'], d: 'Shhh.' },
  { p: 'Tenho cidades sem casas e mares sem água. O que sou?', r: ['mapa'], d: 'Explorador usa.' },
  { p: 'Subo e nunca desço. O que sou?', r: ['idade'], d: 'Aniversário.' },
  { p: 'Quanto mais você tem, menos você vê. O que sou?', r: ['escuridao', 'escuro'], d: 'Apaga a luz.' },
  { p: 'Tenho um olho só e não enxergo. O que sou?', r: ['agulha'], d: 'Costura.' },
];
const PALAVRAS = ['SUPINO', 'TUBARAO', 'PROTEINA', 'AQUARIO', 'RECIFE', 'ESTUDO', 'FOCO', 'TREINO', 'AGACHAMENTO', 'BARBATANA', 'ESCAMA', 'DESKTOP', 'TECLADO', 'PLANILHA', 'MERGULHO', 'TESOURO'];
const BATIDAS = ['TUM', 'PA'];
const EXERCICIOS = ['supino', 'agachamento', 'rosca', 'remada', 'flexao', 'prancha'];
const CASAS = ['canto superior esquerdo', 'topo', 'canto superior direito', 'lado esquerdo', 'centro', 'lado direito', 'canto inferior esquerdo', 'embaixo', 'canto inferior direito'];

function sequencia(d, r) {
  const a = 1 + Math.floor(r() * 5), b = 2 + Math.floor(r() * 3);
  const tipos = [
    () => ({ s: [a, a + b, a + 2 * b, a + 3 * b], x: a + 4 * b }),
    () => ({ s: [a, a * 2, a * 4, a * 8], x: a * 16 }),
    () => ({ s: [1, 1, 2, 3, 5], x: 8 }),
    () => ({ s: [a, a + 1, a + 3, a + 6], x: a + 10 }),
    () => ({ s: [a * a, (a + 1) ** 2, (a + 2) ** 2], x: (a + 3) ** 2 }),
    () => ({ s: [b, b * 3, b * 9], x: b * 27 }),
  ];
  return tipos[Math.min(tipos.length - 1, Math.floor(r() * Math.min(tipos.length, 2 + d)))]();
}
function embaralhar(w, r) {
  const a = [...w];
  for (let k = 0; k < 6 && a.join('') === w; k++) for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.join('');
}
const RODADAS = { ritmo: 5, enigma: 3, sequencia: 5, anagrama: 4, treino: 6, dados: 5 };

/** Começa um minijogo extra. ctx: {rng, dificuldade 1..5, dicas} */
export function iniciarExtra(jogo, g, { rng = Math.random, dificuldade = 1, dicas = 0 } = {}) {
  const d = Math.max(1, Math.min(5, dificuldade | 0));
  Object.assign(g, { dificuldade: d, dicas, total: RODADAS[jogo.tipo] || 1 });
  switch (jogo.tipo) {
    case 'ritmo':
      g.seq = Array.from({ length: 2 + d }, () => pick(BATIDAS, rng));
      return { game: g, text: `Ritmo: eu bato, você repete (TUM ou PA, separado por espaço). ${g.total} rodadas, cada uma mais longa. Escreve "sair" pra parar.\n1/${g.total}: ${g.seq.join(' ')}`, anim: 'ritmo' };
    case 'enigma':
      g.q = pick(ENIGMAS, rng); g.usados = [ENIGMAS.indexOf(g.q)]; g.tent = 0;
      return { game: g, text: `Enigma do Abismo, ${g.total} charadas, 2 chances cada${dicas ? ` (você tem ${dicas} dica${dicas > 1 ? 's' : ''}: escreve "dica")` : ''}.\n1/${g.total}: ${g.q.p}`, anim: 'pensando' };
    case 'sequencia':
      g.q = sequencia(d, rng);
      return { game: g, text: `Sequência lógica: qual o próximo número? ${g.total} rodadas.\n1/${g.total}: ${g.q.s.join(', ')}, ?`, anim: 'pensando' };
    case 'anagrama':
      g.w = pick(PALAVRAS.filter((p) => p.length <= 4 + 2 * d), rng); g.mix = embaralhar(g.w, rng);
      return { game: g, text: `Quebra-cabeça: desembaralha a palavra (treino, estudo ou aquário). ${g.total} rodadas.\n1/${g.total}: ${g.mix}`, anim: 'lendo' };
    case 'digitacao':
      g.w = pick(PALAVRAS.filter((p) => p.length >= 4 + d), rng) || 'SUPINO';
      g.goText = `JÁ! Digita: ${g.w}`;
      return { game: g, text: 'Velocidade: quando eu disser JÁ, digita a palavra que eu mostrar, certinha, e manda. Antes disso, nada. Prepara…', anim: 'encarar', timer: 'reflexo' };
    case 'tesouro':
      g.alvo = Math.floor(rng() * 9); g.tent = 0; g.max = 6 - Math.min(2, Math.floor(d / 2));
      return { game: g, text: `Escondi um tesouro em um lugar da sua tela: ${CASAS.join(', ')}. Chuta onde está. Eu digo quente ou frio. ${g.max} chutes.`, anim: 'tesouro' };
    case 'treino':
      g.ex = pick(EXERCICIOS, rng);
      return { game: g, text: `Treino do JoJo: eu falo o exercício, você responde o mesmo na hora. Se eu disser "descansa", escreve "descanso". ${g.total} séries.\n1/${g.total}: ${g.ex.toUpperCase()}!`, anim: 'halteres' };
    case 'dados':
      g.atual = 1 + Math.floor(rng() * 6); g.placar = 0;
      return { game: g, text: `Dados do Tubarão (só diversão: nada de dinheiro, nem JOJOcoins apostados). Saiu ${g.atual}. O próximo vai ser maior ou menor? ${g.total} jogadas.`, anim: 'apostar' };
    default:
      return null;
  }
}

function proxima(g, acertou, fb, rodada, anim) {
  if (acertou) g.pontos++;
  g.rodada++;
  if (g.rodada >= g.total) {
    const win = g.pontos * 2 > g.total;
    return { text: `${fb} Placar: ${g.pontos}/${g.total}. ${g.pontos === g.total ? 'Perfeito. Respeito.' : win ? 'Ganhou.' : 'Perdeu. Treina mais.'}`, done: true, win, score: g.pontos, anim: win ? 'aplaudir' : 'sabiaQueIaErrar' };
  }
  return { text: `${fb}\n${rodada()}`, done: false, anim: anim || (acertou ? 'sorrisoSuave' : 'linguaVitoria') };
}

/** Responde a um minijogo extra (null se o tipo não é daqui). */
export function responderExtra(g, texto, { now = 0, rng = Math.random } = {}) {
  const n = norm(texto);
  switch (g.tipo) {
    case 'ritmo': {
      const toks = n.toUpperCase().split(/[\s,.-]+/).filter(Boolean);
      const ok = toks.length === g.seq.length && toks.every((t, i) => t === g.seq[i]);
      return proxima(g, ok, ok ? 'No tempo!' : `Atravessou. Era ${g.seq.join(' ')}.`, () => {
        g.seq = Array.from({ length: g.seq.length + (ok ? 1 : 0) }, () => pick(BATIDAS, rng));
        return `${g.rodada + 1}/${g.total}: ${g.seq.join(' ')}`;
      }, 'ritmo');
    }
    case 'enigma': {
      if (/^dica\b/.test(n)) {
        if (!g.dicas) return { text: 'Sem dicas. Inteligência baixa? Treina.', done: false };
        g.dicas--; return { text: `Dica: ${g.q.d}`, done: false, anim: 'piscadinha' };
      }
      const ok = g.q.r.some((r) => n.split(' ').includes(r) || n === r);
      if (!ok && ++g.tent < 2) return { text: 'Não. Mais uma chance.', done: false, anim: 'negar' };
      return proxima(g, ok, ok ? 'Acertou.' : `Era ${g.q.r[0]}.`, () => {
        const livres = ENIGMAS.filter((_, i) => !g.usados.includes(i));
        g.q = pick(livres.length ? livres : ENIGMAS, rng); g.usados.push(ENIGMAS.indexOf(g.q)); g.tent = 0;
        return `${g.rodada + 1}/${g.total}: ${g.q.p}`;
      });
    }
    case 'sequencia': {
      const v = Number(n.replace(/\s/g, ''));
      if (!Number.isFinite(v) || !n) return { text: 'Número.', done: false };
      const ok = v === g.q.x;
      return proxima(g, ok, ok ? 'Certo.' : `Era ${g.q.x}.`, () => { g.q = sequencia(g.dificuldade, rng); return `${g.rodada + 1}/${g.total}: ${g.q.s.join(', ')}, ?`; });
    }
    case 'anagrama': {
      const ok = n.replace(/\s/g, '').toUpperCase() === g.w;
      return proxima(g, ok, ok ? `${g.w}! Isso.` : `Era ${g.w}.`, () => {
        g.w = pick(PALAVRAS.filter((p) => p.length <= 5 + 2 * g.dificuldade && p !== g.w), rng); g.mix = embaralhar(g.w, rng);
        return `${g.rodada + 1}/${g.total}: ${g.mix}`;
      });
    }
    case 'digitacao': {
      if (!g.goAt) return { text: 'Queimou a largada! Espera o JÁ.', done: true, win: false, anim: 'linguaVitoria' };
      const ms = Math.max(0, now - g.goAt);
      if (n.replace(/\s/g, '').toUpperCase() !== g.w) return { text: `Digitou errado. Era ${g.w}.`, done: true, win: false, anim: 'sabiaQueIaErrar' };
      const limite = 6000 - 600 * g.dificuldade;
      const win = ms <= limite;
      return { text: `${(ms / 1000).toFixed(2).replace('.', ',')} s. ${win ? 'Dedos de atleta.' : 'Lenta. Aquece esses dedos.'}`, done: true, win, score: ms, menorMelhor: true, anim: win ? 'aplaudir' : 'dancaVitoria' };
    }
    case 'tesouro': {
      const casa = CASAS.findIndex((c) => n.includes(norm(c)));
      const alt = casa >= 0 ? casa : ['superior esquerdo', 'cima', 'superior direito', 'esquerda', 'meio', 'direita', 'inferior esquerdo', 'baixo', 'inferior direito'].findIndex((c) => n.includes(c));
      if (alt < 0) return { text: `Onde? ${CASAS.join(', ')}.`, done: false };
      g.tent++;
      if (alt === g.alvo) return { text: `Achou! O tesouro estava no ${CASAS[g.alvo]}. ${g.tent} chute${g.tent > 1 ? 's' : ''}.`, done: true, win: true, score: g.max - g.tent + 1, anim: 'tesouro' };
      if (g.tent >= g.max) return { text: `Acabaram os chutes. Estava no ${CASAS[g.alvo]}.`, done: true, win: false, score: 0, anim: 'linguaVitoria' };
      const dist = Math.abs((alt % 3) - (g.alvo % 3)) + Math.abs(Math.floor(alt / 3) - Math.floor(g.alvo / 3));
      return { text: `${dist === 1 ? 'Quente!' : dist === 2 ? 'Morno.' : 'Frio.'} Chutes: ${g.tent}/${g.max}.`, done: false, anim: dist === 1 ? 'animado' : 'ombros' };
    }
    case 'treino': {
      const esperado = g.ex === 'descansa' ? 'descanso' : g.ex;
      const ok = n.includes(esperado);
      return proxima(g, ok, ok ? pick(['Boa série.', 'Isso, carga!', 'Sem roubar.'], rng) : `Errou o exercício: era ${esperado}.`, () => {
        g.ex = rng() < 0.2 ? 'descansa' : pick(EXERCICIOS, rng);
        return `${g.rodada + 1}/${g.total}: ${g.ex === 'descansa' ? 'DESCANSA!' : `${g.ex.toUpperCase()}!`}`;
      }, ok ? 'flexionarBiceps' : null);
    }
    case 'dados': {
      const maior = /\bmaior|mais\b/.test(n), menor = /\bmenor|menos\b/.test(n);
      if (maior === menor) return { text: 'Maior ou menor?', done: false };
      const novo = 1 + Math.floor(rng() * 6);
      const ok = novo === g.atual ? false : (novo > g.atual) === maior;
      const fb = `Saiu ${novo}. ${novo === g.atual ? 'Empate conta como erro. Regra do tubarão.' : ok ? 'Acertou.' : 'Errou.'}`;
      g.atual = novo;
      return proxima(g, ok, fb, () => `${g.rodada + 1}/${g.total}: está em ${g.atual}. Maior ou menor?`, 'apostar');
    }
    default:
      return null;
  }
}

export const TIPOS_EXTRA = new Set(MINIJOGOS_EXTRA.map((j) => j.tipo));
