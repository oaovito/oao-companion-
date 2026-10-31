// Motor de intenções em linguagem natural do JoJo. Ela fala normal ("vou
// trabalhar, fica pequenininho no canto e depois me ajuda com o programa do
// João") e o motor devolve uma lista de ações VALIDADAS do registro central.
// Camadas (da mais segura para a mais esperta):
//   1. pergunta sobre uma função ≠ pedido ("você tem modo trabalho?" explica);
//   2. negação e futuro incerto não executam ("não ativa", "talvez amanhã");
//   3. várias ações numa mensagem (separadas por "e", vírgula, "depois"…);
//   4. contexto: "mais um pouco", "volta ao normal", "não era isso", "faz de novo",
//      respostas a uma pergunta curta pendente ("os dois", "diminui", "o primeiro");
//   5. pedidos indiretos ("tá gigante", "tô entediada", "não aguento essas animações");
//   6. o Qwen (conversa online) devolve "acoes" no mesmo formato, validadas aqui.
// O motor só INTERPRETA; o companion executa (Companion.runActions). Puro e testável.
import { interpretCommand, COMANDOS } from './intencoes.js';

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s,;.!?]/g, ' ').replace(/\s+/g, ' ').trim();
}
const limpo = (s) => norm(s).replace(/[,;.!?]/g, ' ').replace(/\s+/g, ' ').trim();

// ------------------------------------------------------------------ registro central

const CANTOS = ['inferiorDireito', 'inferiorEsquerdo', 'superiorDireito', 'superiorEsquerdo'];

/**
 * Tudo o que o JoJo sabe fazer por pedido. `risco: 'alto'` exige confirmação.
 * Só entra aqui o que existe de verdade (cada id tem executor no companion).
 */
export const ACOES = {
  trabalho_iniciar: { desc: 'Modo Trabalho (medita quieto no canto)', params: { perfil: ['trabalho', 'deep', 'invisivel'], min: 'numero' } },
  trabalho_parar: { desc: 'sair do Modo Trabalho' },
  foco_iniciar: { desc: 'foco junto (estuda/treina do lado)', params: { min: 'numero', tipo: ['estudo', 'treino'] } },
  foco_parar: { desc: 'encerrar o foco junto' },
  jogo: { desc: 'começar um mini-jogo', params: { nome: 'texto' } },
  menu_jogos: { desc: 'mostrar os mini-jogos para escolher' },
  jogo_parar: { desc: 'encerrar o mini-jogo' },
  calma: { desc: 'padrão calmante' },
  ritmo: { desc: 'sequência rítmica' },
  bolhas: { desc: 'bolhas para estourar' },
  estimulo: { desc: 'animação surpresa' },
  parar_atividade: { desc: 'parar calma/ritmo/bolhas' },
  resumo: { desc: 'resumo do dia' },
  colecao: { desc: 'abrir coleção e conquistas' },
  guarda_roupa: { desc: 'abrir o guarda-roupa' },
  reacoes: { desc: 'explicar que as reações vêm da conversa (sem menu)' },
  reacoes_pausar: { desc: 'parar as reações espontâneas (memes, anime, comida…)' },
  reacoes_voltar: { desc: 'voltar com as reações espontâneas' },
  pausar: { desc: 'pausar o JoJo' },
  retomar: { desc: 'tirar da pausa' },
  esconder: { desc: 'sumir da tela' },
  mostrar: { desc: 'aparecer de novo' },
  silencio_ligar: { desc: 'modo silencioso (sem falas sozinho nem broncas)' },
  silencio_desligar: { desc: 'voltar a falar' },
  configuracoes: { desc: 'abrir as configurações' },
  nova_conversa: { desc: 'começar conversa nova' },
  tamanho: { desc: 'mudar o tamanho do JoJo', params: { valor: ['menor', 'maior', 'minimo', 'normal'] } },
  posicao: { desc: 'mudar o JoJo de lugar', params: { lugar: [...CANTOS, 'esquerda', 'direita', 'longe'] } },
  animacoes_frequencia: { desc: 'mais ou menos animações sozinho', params: { valor: ['menos', 'mais', 'normal'] } },
  animacao: { desc: 'fazer uma animação/reação pelo nome ou descrição', params: { id: 'texto' } },
  restaurar: { desc: 'voltar ao normal (desfaz o último ajuste)' },
  desfazer: { desc: 'desfazer a última ação' },
};

export const ACOES_IDS = Object.keys(ACOES);

/** Valida uma ação vinda de fora (Qwen): id do registro e parâmetros do tipo certo. */
export function validarAcao(a) {
  if (!a || typeof a !== 'object') return null;
  const id = String(a.acao || a.intent || '').trim();
  const def = ACOES[id];
  if (!def) return null;
  const params = {};
  const p = a.parametros || a.params || {};
  for (const [k, tipo] of Object.entries(def.params || {})) {
    const v = p[k];
    if (v == null || v === '') continue;
    if (Array.isArray(tipo)) {
      if (tipo.includes(v)) params[k] = v;
    } else if (tipo === 'numero') {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0 && n <= 600) params[k] = Math.round(n);
    } else if (tipo === 'texto') params[k] = String(v).replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 40);
  }
  return { acao: id, params };
}

// ------------------------------------------------------------------ explicações (pergunta ≠ pedido)

export const EXPLICA = {
  trabalho: 'Modo Trabalho: eu vou pro canto, fico pequeno e medito quieto, sem falas, broncas nem animações. Diga "vou trabalhar" pra ligar e "terminei" pra eu voltar.',
  jogos: 'Tenho quiz, verdade ou mentira, pedra-papel-nadadeira, memória, O JoJo mandou, caça-palavras, corrida, pega-pega, esconde-esconde e mais. Diga "bora jogar".',
  tamanho: 'Diga "fica menor", "maior" ou "volta ao normal" que eu mudo de tamanho. "Vai pro canto" eu mudo de lugar.',
  guardaRoupa: 'Guarda-roupa: você me veste peça por peça. Diga "vou te vestir" ou abra na Central.',
  reacoes: 'Tenho 50 reações (memes, anime, comida, namorado e João) e uso conforme a conversa. Também dá pra pedir pela cara: "faz uma cara de julgamento", "faz aquela dos olhos vermelhos".',
  cientista: 'Pergunta de ciência ou medicina e eu ponho os óculos de nerd e explico direito. Saúde sua é sério: sem diagnóstico, e emergência é 192.',
  silencio: 'Modo silencioso: eu paro de falar sozinho e de dar bronca. "Pode voltar a falar" desliga.',
};

function pergunta(n) {
  // "você tem X?", "como funciona X?", "o que é o modo X?", "por que você ficou menor?"
  if (/\bpor que (voce|vc|tu) (ficou|ta|esta) (menor|maior|pequeno|grande)\b/.test(n)) return { explicar: 'estadoTamanho' };
  if (!/^(jojo )?(voce|vc|tu)? ?(tem|sabe|consegue|faz)\b.*\?|^(jojo )?(como (que )?funciona|como (eu )?(uso|ligo|ativo)|o que (e|faz) o|pra que serve)\b/.test(n)) return null;
  if (/trabalho|concentra|foco/.test(n)) return { explicar: 'trabalho' };
  if (/jog/.test(n)) return { explicar: 'jogos' };
  if (/tamanho|menor|maior|canto/.test(n)) return { explicar: 'tamanho' };
  if (/roupa|vestir/.test(n)) return { explicar: 'guardaRoupa' };
  if (/reac|meme|anime/.test(n)) return { explicar: 'reacoes' };
  if (/ciencia|cientista|medic|nerd/.test(n)) return { explicar: 'cientista' };
  if (/silencio|quieto/.test(n)) return { explicar: 'silencio' };
  return null;
}

// ------------------------------------------------------------------ detectores novos (por trecho)

const NAO_AGORA = /\b(talvez|quem sabe|amanha|depois eu|mais tarde|semana que vem|nao (vou|quero|precisa|ativa|liga|faz|muda)|nem pensar)\b/;

function detTamanho(n, ctx) {
  const p = n.replace(/^(?:(?:ei|jojo|por favor|pfv|voce|vc|pode|poderia|consegue|agora|acho que|queria que|quero que)\s+)+/, '');
  if (!/^(fica|ficar|fique|deixa|diminui\w*|reduz\w*|encolhe\w*|aumenta\w*|cresce\w*|ta|esta|tamanho|seu tamanho|pequenininho|minusculo|bem pequeno|pequenino|o menor possivel|menor|maior)\b/.test(p)) return null;
  const verbo = p.match(/^(diminui\w*|reduz\w*|encolhe\w*|aumenta\w*|cresce\w*)\b(.*)$/);
  if (verbo && verbo[2].trim().split(' ').filter(Boolean).some((word) => !['um', 'pouco', 'pouquinho', 'mais', 'menor', 'maior', 'pequeno', 'grande', 'por', 'favor', 'pfv', 'ai', 'agora', 'seu', 'sua', 'o', 'a', 'so', 'de', 'tamanho', 'escala'].includes(word))) return null;
  if (/\b(pequenininho|minusculo|bem pequeno|pequenino|o menor possivel)\b/.test(n)) return { acao: 'tamanho', params: { valor: 'minimo' } };
  if (/\b(fica|ficar|fique|deixa|diminui\w*|reduz\w*|encolhe\w*)\b.*\b(menor|pequeno|pequena)\b|\b(diminui|reduz|encolhe)\w*\b|\b(ta|esta|tá) (muito )?(grande|gigante|enorme)\b|\bmenor\b$/.test(n) && !/\b(nao diminui|nao fica menor)\b/.test(n)) return { acao: 'tamanho', params: { valor: 'menor' } };
  if (/\b(fica|ficar|fique|deixa|aumenta\w*|cresce\w*)\b.*\b(maior|grande)\b|\b(aumenta|cresce)\w*\b|\b(ta|esta) (muito )?(pequeno|minusculo)\b|\bmaior\b$/.test(n)) return { acao: 'tamanho', params: { valor: 'maior' } };
  if (/\b(tamanho normal|seu tamanho de sempre|volta (pro|ao) tamanho)\b/.test(n)) return { acao: 'tamanho', params: { valor: 'normal' } };
  return null;
}

function detPosicao(n) {
  const sup = /\b(em cima|de cima|superior|no alto|la em cima)\b/.test(n);
  const esq = /\besquerd\w*\b/.test(n);
  const dir = /\bdireit\w*\b/.test(n);
  if (/\b(sai da frente|sai do meio|ta na frente|ta atrapalhando|me atrapalha|nao me atrapalha|vai pra la)\b/.test(n)) return { acao: 'posicao', params: { lugar: 'longe' } };
  if (/\b(vai|va|fica|fique|ficar|volta|passa|anda|move|ir|muda|corre|nada)\w*\b.*\b(canto|cantinho)\b|^(no|pro|naquele|nesse) (canto|cantinho)\b/.test(n)) return { acao: 'posicao', params: { lugar: `${sup ? 'superior' : 'inferior'}${esq ? 'Esquerdo' : 'Direito'}` } };
  if (/\b(vai|fica|passa|anda|move|muda)\w*\b.*\b(pra|para|a|na|no) (esquerda|direita)\b|\b(pra|para) (a )?(esquerda|direita)\b/.test(n)) return { acao: 'posicao', params: { lugar: esq ? 'esquerda' : 'direita' } };
  if (dir && !esq && /\b(vai|fica|passa|move)\b/.test(n)) return { acao: 'posicao', params: { lugar: 'direita' } };
  return null;
}

function detSilencio(n) {
  if (/\b(fica|fique|ficar) (quiet\w*|caladinho|calado|mudo)\b|\bseria bom (voce|vc) ficar quiet\w*\b/.test(n) && !/\bnao fica\b/.test(n)) return { acao: 'silencio_ligar', params: {} };
  return null;
}

function detFrequencia(n) {
  if (/\b(nao aguento mais|chega de|para com|menos|diminui|reduz)\w*\b.*\b(animac\w*|dancinha\w*|graca\w*|palhacad\w*|mexendo|se mexer)\b|\b(animac\w*) (toda hora|demais|o tempo todo)\b/.test(n)) return { acao: 'animacoes_frequencia', params: { valor: 'menos' } };
  if (/\b(mais animac\w*|anima mais|se mexe mais|faz mais coisa)\b/.test(n)) return { acao: 'animacoes_frequencia', params: { valor: 'mais' } };
  return null;
}

function detReacoes(n) {
  if (/\b(chega|para|pare|parar|chega de|cansei)\b.*\b(reac\w*|memes?|referencias? de anime)\b|\bsem (reac\w*|memes)\b|\bdesliga (as )?reac\w*\b/.test(n) && !/\b(volta|pode voltar|liga)\b/.test(n)) return { acao: 'reacoes_pausar', params: {} };
  if (/\b(volta|voltar|pode voltar|liga|religa|libera)\b.*\b(reac\w*|memes?)\b/.test(n)) return { acao: 'reacoes_voltar', params: {} };
  return null;
}

function detJogos(n) {
  if (/\b(bora|vamos|vamo|quero|queria|que tal|tem algum|me mostra os)\b.*\b(jogar|jogo|jogos)\b|\b(to|tou|estou) (entediad\w*|de bobeira)\b/.test(n) && !/\b(lol|league|valorant|fortnite|minecraft)\b/.test(n)) {
    // Nome de jogo junto ("bora jogar quiz") fica para o comando antigo.
    if (/\b(quiz|memoria|corrida|pega|esconde|bolhas|clique|repeticoes|caca|pedra|verdade|mandou|cabo|equilibrio|emocao)\b/.test(n)) return null;
    return { acao: 'menu_jogos', params: {} };
  }
  return null;
}

/** Busca uma animação/reação por descrição ("olhos vermelhos", "aquela do trono"…). */
const DESCRICOES = [
  ['pk_sharingan', /\b(olho|olhos) vermelh\w*|sharingan\b/],
  ['pk_berserker', /\b(olho|olhos) vermelh\w*|furia|berserk\w*\b/],
  ['pk_jApoteose', /\btrono\b|\bapoteose\b/],
  ['pk_jMencao', /\b(aureola|halo|anjinho)\b/],
  ['pk_chefeFinal', /\b(chefe final|barra de (chefe|vida))\b/],
  ['pk_sixSeven', /\b(seis e sete|6 e 7|numeros? (6|seis))\b/],
  ['pk_arise', /\b(sombras?|tubaroes sombrios)\b/],
  ['pk_rumbling', /\b(titas?|gigantes)\b/],
  ['pk_dominio', /\b(dominio|universo roxo)\b/],
  ['pk_ultraInstinto', /\b(aura prateada|instinto)\b/],
  ['pk_sideEye', /\b(olhar de lado|side eye|olhadinha de lado|cara de (julgamento|julgador|deboche|desdem)|olhar de julgamento)\b/],
  ['pk_chillGuy', /\b(chill|tranquilao|de boa)\b/],
  ['pk_npc', /\b(npc|robozinho|presentes? de live)\b/],
  ['pk_demure', /\b(demure|discreto e elegante)\b/],
];

function detAnimacao(n) {
  if (!/\b(faz|faca|fazer|mostra|repete|aquela|aquele|a do|o do|a dos|o dos|me mostra|manda)\b/.test(n)) return null;
  const hits = [...new Set(DESCRICOES.filter(([, re]) => re.test(n)).map(([id]) => id))];
  if (!hits.length) return null;
  if (hits.length === 1) return { acao: 'animacao', params: { id: hits[0] } };
  return { perguntar: 'animacao', opcoes: hits };
}

/** Pedidos indiretos que pedem só uma pergunta curta. */
function detSugestao(n) {
  if (/\b(tenho (muita|um monte de) coisa (pra|para) fazer|to (cheia|lotada) de coisa|preciso produzir|prova amanha)\b/.test(n)) return { perguntar: 'trabalho' };
  if (/\b(ta|esta|voce ta|vc ta) (ocupando|tomando) (muito )?(espaco|a tela)\b|\b(atrapalhando a tela)\b/.test(n)) return { perguntar: 'espaco' };
  return null;
}

// Trechos de uma mensagem composta.
function trechos(texto) {
  return norm(texto)
    .split(/\s*(?:[,;.!]| e depois | depois | e tambem | e | mas | entao )\s*/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * Interpreta a mensagem. Devolve {acoes: [{acao, params}], perguntar?, opcoes?, explicar?, futuro?}.
 * @param ctx {trabalho, foco, jogo, ..., ultima: {acao, params}, pendente: {tipo, opcoes}}
 */
export function interpretar(texto, ctx = {}) {
  const n0 = norm(texto);
  const n = limpo(texto);
  const out = { acoes: [] };
  if (!n || n.length > 400) return out;

  // Resposta a uma pergunta curta pendente.
  if (ctx.pendente) {
    const r = resolverPendente(n, ctx.pendente);
    if (r) return r;
  }

  // Pergunta sobre uma função: explicar, nunca executar.
  const q = pergunta(n0);
  if (q) return { ...out, ...q };

  // Contexto da última ação.
  if (ctx.ultima) {
    const u = ctx.ultima;
    if (/^(jojo )?(mais um pouco|mais|um pouco mais|ainda (ta|esta) grande|menor ainda|mais um pouquinho)$/.test(n) && u.acao === 'tamanho') return { acoes: [{ acao: 'tamanho', params: { valor: u.params.valor === 'maior' ? 'maior' : 'menor' } }] };
    if (/^(jojo )?(nao era isso|nao foi isso|errado|desfaz|desfaca|volta como (tava|estava)|cancela isso|nao faz isso|para com isso|nao faca isso)$/.test(n)) return { acoes: [{ acao: 'desfazer', params: {} }] };
    if (/^(faz de novo|de novo isso|repete|mais uma vez|outra vez)$/.test(n) && u.acao === 'animacao') return { acoes: [{ ...u }] };
  }
  if (/^(jojo )?(volta ao normal|volta ao que era|tudo normal de novo|reseta|normaliza)$/.test(n)) return { acoes: [{ acao: 'restaurar', params: {} }] };

  // Mensagem composta: cada trecho pode ser uma ação.
  const partes = trechos(texto);
  const visto = new Set();
  let futuro = null;
  for (const t of partes.length > 1 ? partes : [n]) {
    // "depois me ajuda com o programa do João": fica de contexto, sem agendar nada.
    if (/^(me )?(ajuda|ajude|explica)\b/.test(t) && /\bdepois\b/.test(n) && partes.length > 1) {
      futuro = t;
      continue;
    }
    if (NAO_AGORA.test(t) && !/\bnao me atrapalha\b|\bnao quero distrac/.test(t)) continue;
    const achados = [];
    const cmd = interpretCommand(t, ctx);
    // Pedido de ajuda/explicação junto ("…e me ajuda a entender essa ANOVA"): vai para a resposta.
    if (cmd?.cmd !== 'resumo' && /^(me )?(ajuda|ajude|explica|explique|me explica)\b|^(jojo )?(como|o que|qual|quais|quem|quando|onde|por que|quantas?|quantos?)\b|\bentender\b|\?$/.test(t)) {
      out.resto = out.resto ? `${out.resto}. ${t}` : t;
      continue;
    }
    if (cmd) achados.push({ acao: cmd.cmd, params: cmd.arg ? argParaParams(cmd.cmd, cmd.arg) : {} });
    for (const d of [detTamanho, detPosicao, detFrequencia, detJogos, detSilencio, detReacoes]) {
      const a = d(t, ctx);
      if (a) achados.push(a);
    }
    const an = detAnimacao(t);
    if (an && an.perguntar) return { ...out, perguntar: 'animacao', opcoes: an.opcoes };
    if (an) achados.push(an);
    for (const a of achados) {
      const key = `${a.acao}:${JSON.stringify(a.params)}`;
      if (!visto.has(key)) {
        visto.add(key);
        out.acoes.push(a);
      }
    }
  }
  // Conflitos: Modo Trabalho já é silêncio e já vai pro canto pequeno; não emenda outras coisas contraditórias.
  if (out.acoes.some((a) => a.acao === 'trabalho_iniciar')) {
    out.acoes = out.acoes.filter((a) => !['silencio_ligar', 'esconder', 'pausar'].includes(a.acao) && !(a.acao === 'posicao' && a.params.lugar === 'longe'));
    // "fica pequenininho naquele canto": vira o perfil do Modo Trabalho.
  }
  if (out.acoes.some((a) => a.acao === 'menu_jogos')) out.acoes = out.acoes.filter((a) => a.acao !== 'jogo');
  if (futuro) out.futuro = futuro;
  if (!out.acoes.length) {
    const s = detSugestao(n);
    if (s) return { ...out, ...s };
  }
  return out;
}

function argParaParams(cmd, arg) {
  const n = norm(arg);
  if (cmd === 'trabalho_iniciar') {
    const p = {};
    if (/deep/.test(n)) p.perfil = 'deep';
    if (/invisivel/.test(n)) p.perfil = 'invisivel';
    const m = n.match(/\d+/);
    if (m) p.min = Number(m[0]);
    return p;
  }
  if (cmd === 'foco_iniciar') {
    const m = n.match(/\d+/);
    return { min: m ? Number(m[0]) : 25, tipo: /treino/.test(n) ? 'treino' : 'estudo' };
  }
  if (cmd === 'jogo') return { nome: arg };
  return {};
}

function resolverPendente(n, p) {
  if (/^(nao|nada|deixa|esquece|deixa pra la|nenhum)$/.test(n)) return { acoes: [], cancelado: true };
  if (p.tipo === 'trabalho' && /^(sim|quero|pode|bora|liga|ativa|isso|por favor)\b/.test(n)) return { acoes: [{ acao: 'trabalho_iniciar', params: {} }] };
  if (p.tipo === 'espaco') {
    const acoes = [];
    if (/\b(os dois|ambos|tudo|as duas)\b/.test(n) || /\b(diminui|menor|pequeno|encolhe|tamanho)\b/.test(n)) acoes.push({ acao: 'tamanho', params: { valor: 'menor' } });
    if (/\b(os dois|ambos|tudo|as duas)\b/.test(n) || /\b(canto|lugar|muda|sai|vai pra)\b/.test(n)) acoes.push({ acao: 'posicao', params: { lugar: 'inferiorDireito' } });
    if (acoes.length) return { acoes };
  }
  if (p.tipo === 'animacao' && Array.isArray(p.opcoes)) {
    const idx = /\b(primeir\w*|1|um)\b/.test(n) ? 0 : /\b(segund\w*|2|dois|outr\w*)\b/.test(n) ? 1 : -1;
    const porNome = p.opcoes.findIndex((id, i) => (p.nomes && p.nomes[i] && n.includes(norm(p.nomes[i]).split(' ')[0])) || n.includes(id.replace(/^pk_/, '').toLowerCase()));
    const i = porNome >= 0 ? porNome : idx;
    if (i >= 0 && p.opcoes[i]) return { acoes: [{ acao: 'animacao', params: { id: p.opcoes[i] } }] };
  }
  if (p.tipo === 'jogo') return { acoes: [{ acao: 'jogo', params: { nome: n } }] };
  return null;
}

export { COMANDOS };
