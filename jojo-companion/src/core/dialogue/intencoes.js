// Entende pedidos de comando ditos de qualquer jeito ("pare com a sessão de foco",
// "chega de estudar", "some daqui", "volta", "fica quieto um pouco"…) e os
// transforma em ações do app, sem precisar do "/". Funciona offline; a conversa
// online usa os mesmos ids (campo "comando" da resposta). Puro e testável.

/** Ações que podem ser pedidas por frase (ou pela conversa online). */
export const COMANDOS = ['trabalho_iniciar', 'trabalho_parar', 'foco_iniciar', 'foco_parar', 'jogo', 'jogo_parar', 'calma', 'ritmo', 'bolhas', 'estimulo', 'parar_atividade', 'resumo', 'colecao', 'guarda_roupa', 'pausar', 'retomar', 'esconder', 'mostrar', 'silencio_ligar', 'silencio_desligar', 'configuracoes', 'nova_conversa'];

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Palavras de enchimento que podem vir antes do verbo ("jojo, por favor, pode parar…").
const FILLER = new Set(['jojo', 'ei', 'oi', 'hey', 'pode', 'podes', 'consegue', 'por', 'favor', 'pf', 'pfv', 'agora', 'ja', 'entao', 'tipo', 'so', 'vai', 'eu', 'quero', 'queria', 'preciso', 'vamos', 'bora', 'da', 'pra', 'me', 'faz', 'o', 'a', 'e', 'ai', 'cara', 'mano', 'amigo', 'aí', 'manu', 'tu', 'voce', 'vc', 'vou', 'vamo', 'acho', 'que', 'melhor', 'hora', 'de']);
// Depois de "para" (que também é preposição), só estas palavras fazem dele um verbo.
const PARA_VERBO = /^(com|de|o|a|os|as|agora|ai|tudo|isso|jojo|por|ja|pf|pfv|esse|essa|esses|essas|um|uma)$/;

// Raízes de verbos (qualquer conjugação) e expressões.
const STOP = /^(par[aeo]r?|paramos|parou|encerr\w*|termin\w*|acab\w*|finaliz\w*|cancel\w*|interromp\w*|desist\w*|chega|basta|stop|larg\w*|desliga\w*|desativ\w*|sai|sair|saia|para$)$/;
const START = /^(comec\w*|inici\w*|inicia|bora|vamos|faz|faca|fazer|liga|ligar|ativ\w*|abr\w*|abre|mostra\w*|quero|start|bota|coloca|poe|partiu)$/;

const OBJ = {
  foco: /\b(foco|focar|focando|sessao|sessoes|pomodoro|estudo|estudar|estudando|concentra\w*|bloco|modo foco|treino junto|treinar junto)\b/,
  jogo: /\b(jogo|jogar|jogando|partida|quiz|minijogo|mini jogo|brincadeira|desafio)\b/,
  calma: /\b(calma|cardume|relaxa\w*|respira\w*)\b/,
  ritmo: /\b(ritmo|marcha|contagem)\b/,
  bolhas: /\b(bolhas?)\b/,
};

function tokens(n) {
  return n.split(' ').filter(Boolean);
}

/** Índice do primeiro verbo de parar no começo da frase (depois de enchimento), ou -1. */
function stopAt(toks) {
  for (let i = 0; i < Math.min(toks.length, 6); i++) {
    if (toks[i] === 'para' && toks[i + 1] && !PARA_VERBO.test(toks[i + 1]) && !objIn(toks.slice(i + 1).join(' '))) return -1;
    if (toks[i] === 'para' && /^(o|a|os|as)$/.test(toks[i + 1] || '') && !objIn(toks.slice(i + 1).join(' '))) return -1;
    if (STOP.test(toks[i]) || (toks[i] === 'nao' && /^(quero|aguento)$/.test(toks[i + 1] || '') && /^(mais)$/.test(toks[i + 2] || ''))) return i;
    if (!FILLER.has(toks[i])) return -1;
  }
  return -1;
}

function startAt(toks) {
  for (let i = 0; i < Math.min(toks.length, 5); i++) {
    if (START.test(toks[i])) return i;
    if (!FILLER.has(toks[i])) return -1;
  }
  return -1;
}

function objIn(text) {
  for (const [k, re] of Object.entries(OBJ)) if (re.test(text)) return k;
  return null;
}

/**
 * Interpreta um pedido de comando. Retorna {cmd, arg} ou null (não é comando).
 * @param ctx {foco, jogo, calma, ritmo, bolhas, pausado, escondido, silencio}: o que está ativo agora
 */
export function interpretCommand(text, ctx = {}) {
  const n = norm(text);
  if (!n || n.length > 140) return null;
  const toks = tokens(n);
  // Perguntas de conhecimento ("o que é foco?") não são comandos.
  if (/^(o que|oque|que|qual|quais|quem|quando|onde|por que|porque|pq)\b/.test(n) && !/\b(foco|jogo|pausa)\b.*\b(parar|encerrar|acabar|terminar)\b/.test(n)) return null;

  // Modo Trabalho: entrar e sair (vem antes de tudo: "pode voltar" com o modo ligado é sair dele).
  if (ctx.trabalho && /^(jojo )?(pode voltar|volta|voltar|terminei|acabei|sai do modo trabalho|desliga o modo trabalho|fim do trabalho|terminei de trabalhar|acabei de trabalhar|chega de trabalhar|pode sair)\b/.test(n)) return { cmd: 'trabalho_parar' };
  if (/\b(sai|desliga|encerra|termina)\w* (do |o )?modo trabalho\b|\bterminei de (trabalhar|estudar)\b/.test(n)) return { cmd: 'trabalho_parar' };
  if (/\b(vou trabalhar|modo trabalho|preciso (me )?concentrar|preciso focar|hora de estudar|vou estudar sozinha|deep focus|modo invisivel|work mode|modo foco|me deixa (me )?concentrar|nao quero distrac\w*|sem distrac\w*|fica na sua|vou fazer (minha|a) pesquisa|preciso terminar (um|o|meu|esse) (relatorio|trabalho|artigo)|preciso estudar)\b/.test(n) && !/\bnao (vou|quero) (trabalhar|estudar|focar)\b|\bnao (ativa|liga|entra)\b/.test(n)) {
    return { cmd: 'trabalho_iniciar', arg: `${/deep focus|profundo/.test(n) ? 'deep' : /invisivel/.test(n) ? 'invisivel' : ''} ${(n.match(/\b(\d{1,3})\s*(min|minutos?|h)\b/) || [])[1] || ''}`.trim() };
  }

  // Esconder vem antes de "parar" ("sai da tela", "vai embora").
  if (/\b(some|sumir|suma|desaparece|desaparecer|se esconde|esconde|esconder|vai embora|sai da tela|se guarda|guarda o (jojo|pet)|tuck away)\b/.test(n) && !/\bnao\b/.test(n)) return { cmd: 'esconder' };

  const s = stopAt(toks);
  if (s >= 0) {
    const rest = toks.slice(s).join(' ');
    const obj = objIn(rest);
    if (obj === 'foco') return { cmd: 'foco_parar' };
    if (obj === 'jogo') return { cmd: 'jogo_parar' };
    if (obj === 'calma' || obj === 'ritmo' || obj === 'bolhas') return { cmd: 'parar_atividade' };
    if (/\b(falar|fala|tagarel\w*|barulho|broncas?|conversa)\b/.test(rest)) return { cmd: 'silencio_ligar' };
    if (/\b(silencio|modo silencioso|mudo)\b/.test(rest)) return { cmd: 'silencio_desligar' };
    if (/\b(pausa|pausado)\b/.test(rest)) return { cmd: 'retomar' };
    // Sem objeto ("para", "chega", "pode parar", "cansei"): encerra o que estiver ativo.
    if (toks.length - s <= 4 && !/\b(de|com)\b\s+\w{4,}/.test(rest.replace(/\bcom isso\b/, ''))) {
      if (ctx.foco) return { cmd: 'foco_parar' };
      if (ctx.jogo) return { cmd: 'jogo_parar' };
      if (ctx.calma || ctx.ritmo || ctx.bolhas) return { cmd: 'parar_atividade' };
    }
    return null;
  }
  if (/^(cansei|ja deu|deu por hoje|to cansada de (estudar|focar)|acabei|terminei|chega por hoje)\b/.test(n)) {
    if (ctx.foco) return { cmd: 'foco_parar' };
    if (ctx.jogo) return { cmd: 'jogo_parar' };
  }

  // Pausar / continuar o JoJo.
  if (/^(jojo )?(pausa|pausar|pausado|congela|congelar|fica parado|para tudo)\b/.test(n) || /\b(se pausa|pausa (o )?jojo|pausa (voce|vc|ai))\b/.test(n)) return { cmd: 'pausar' };
  if (ctx.pausado && /^(jojo )?(volta|voltar|continua|continuar|retoma|retomar|despausa|despausar|pode voltar|pode continuar|se mexe|acorda)\b/.test(n)) return { cmd: 'retomar' };

  // Mostrar o pet de novo.
  if (ctx.escondido && /\b(aparece|aparecer|volta|voltar|cade (voce|vc)|vem ca|mostra|wake)\b/.test(n)) return { cmd: 'mostrar' };

  // Modo silencioso.
  if (/\b(modo silencioso|fica (calado|mudo)|sem falar|para de falar|pare de falar|cala (a )?boca)\b/.test(n) && !/\b(desliga|tira|sai)\w* (o )?(modo silencioso|silencio)\b/.test(n)) return { cmd: 'silencio_ligar' };
  if (/\b(desliga|tira|sai|desativa)\w* (do |o )?(modo silencioso|silencio|mudo)\b|\bpode (voltar a )?falar\b/.test(n)) return { cmd: 'silencio_desligar' };

  // Abrir telas.
  if (/\b(abr\w*|abre|mostra\w*|ve|ver|quero ver)\b.*\b(configurac\w*|ajustes|opcoes|preferencias)\b/.test(n)) return { cmd: 'configuracoes' };
  if (/\b(abr\w*|mostra\w*|ve|ver|quero ver|cade)\b.*\b(colecao|conquistas|meu nivel|progresso|medalhas)\b/.test(n)) return { cmd: 'colecao' };
  if (/\b(nova conversa|conversa nova|comeca(r)? (de novo|outra conversa)|limpa(r)? (a )?conversa)\b/.test(n)) return { cmd: 'nova_conversa' };
  if (/\b(resumo do (meu )?dia|como foi (o )?meu dia|o que (eu )?fiz hoje)\b/.test(n)) return { cmd: 'resumo' };

  // Começar atividades.
  const st = startAt(toks);
  const obj = objIn(n);
  if (st >= 0 && obj) {
    const min = (n.match(/\b(\d{1,3})\s*(min|minutos?|m)\b/) || [])[1];
    if (obj === 'foco' && !ctx.foco) return { cmd: 'foco_iniciar', arg: `${min || 25}${/\btreino\b|\btreinar\b/.test(n) ? ' treino' : ''}` };
    if (obj === 'jogo' && !ctx.jogo && !/\b(lol|league|valorant|fortnite|minecraft)\b/.test(n)) return { cmd: 'jogo', arg: n };
    if (obj === 'calma') return { cmd: 'calma' };
    if (obj === 'ritmo') return { cmd: 'ritmo' };
    if (obj === 'bolhas') return { cmd: 'bolhas' };
  }
  return null;
}
