// Pacotes de reação: memes Gen Z, referências de anime, reações extremas de
// comida, Operação Namorado e o Protocolo do Divino João. Cada reação vira um
// item do catálogo (animação real por receita + efeitos silenciosos) e aqui
// ficam a conversão e o reconhecimento de intenção (com negação, passado e
// pergunta de informação). Puro e testável.

const RARIDADE_FREQ = { comum: 'comum', incomum: 'rara', rara: 'easter', lendaria: 'easter' };
// Reações que podem aparecer sozinhas (sorteio ambiente, pela raridade); as outras só por contexto ou pedido.
const ESPONTANEAS = new Set(['pk_chillGuy', 'pk_menacing', 'pk_sharingan', 'pk_serio', 'pk_ultraInstinto', 'pk_dominio', 'pk_bankai', 'pk_haki', 'pk_arise', 'pk_sideEye', 'pk_demure', 'pk_npc', 'pk_brainrot']);

export const PACOTE_CONFIG = { memes: 'pacoteMemes', anime: 'pacoteAnime', comida: 'pacoteComida', namorado: 'pacoteNamorado', joao: 'pacoteJoao' };

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Itens de catálogo das reações (comida ganha uma versão "leve", sem efeitos, para os níveis 1–2). */
export function packItems(data) {
  const out = [];
  for (const r of data.reacoes) {
    const base = {
      id: r.id,
      nome: r.nome,
      categoria: `pacote:${r.pacote}`,
      pacote: r.pacote,
      duracao: r.duracao,
      receita: r.receita,
      frequencia: RARIDADE_FREQ[r.raridade] || 'comum',
      raridade: r.raridade,
      cooldownMin: r.cooldownMin,
      falas: r.falas,
      eventos: r.eventos || [],
      gatilho: { ambiente: ESPONTANEAS.has(r.id), frases: r.frases || [], eventos: [] },
    };
    out.push(base);
    if (r.pacote === 'comida') {
      const { fx, ...semFx } = r.receita;
      out.push({ ...base, id: `${r.id}_leve`, nome: `${r.nome} (leve)`, receita: { ...semFx, corpo: 'parado', dorsal: undefined }, gatilho: { ambiente: false, frases: [], eventos: [] }, leve: true });
    }
  }
  return out;
}

/** Animação e intensidade da reação de comida pelo nível (1 sarcasmo … 4 apocalipse). */
export function comidaVariante(id, nivel = 3) {
  if (nivel <= 1) return { id: `${id}_leve`, intensity: 'suave' };
  if (nivel === 2) return { id: `${id}_leve`, intensity: 'normal' };
  if (nivel === 3) return { id, intensity: 'normal' };
  return { id, intensity: 'exagerado' };
}

// ------------------------------------------------------------------ comida

const COMIDAS = [
  ['pk_traicao', /\bpizz\w*\b/],
  ['pk_nuclear', /\b(sorvet\w*|picole\w*|milk ?shake|gelato|acai)\b/],
  ['pk_furiaFritas', /\b(hamburg\w*|burger\w*|x ?(burguer|tudo|salada|bacon)|batata frita|fritas|fritura\w*|coxinha\w*|pastel)\b/],
  ['pk_decepcao', /\b(chocolate\w*|bombo\w*|nutella|kit ?kat|barra de chocolate)\b/],
  ['pk_milAnos', /\b(bolo\w*)\b/],
  ['pk_chefeFinal', /\b(fast ?food|mc ?donald\w*|mequi|bk|burger king|ifood|delivery|subway|kfc)\b/],
  ['pk_crise', /\b(donut\w*|rosquinha\w*|brigadeiro\w*|doces?|sonho\w*|churro\w*|bala\w*|jujuba\w*|pudim|torta doce)\b/],
  ['pk_interrogatorio', /\b(sobremesa\w*)\b/],
];
// Intenção de comer/pedir agora ou em breve.
const QUER = /\b(vou|vamo|vamos|bora|quero|queria|to com vontade|tou com vontade|estou com vontade|com vontade de|deu vontade|me deu vontade|que tal|pensando em|partiu|vou de|mandar ver|atacar|so hoje|hoje eu vou|posso|e se eu|to afim|tou afim|a fim de)\b/;
const VERBO = /\b(comer|come|pedir|pede|tomar|toma|comprar|compra|devorar|atacar)\b/;
const NEGA = /\b(nao|nem|nunca|jamais|sem vontade)\b/;
const PASSADO = /\b(comi|tomei|pedi|comprei|ontem|semana passada|comemos|pedimos)\b/;
const INFO = /\b(quanto|quantas|quantos|caloria\w*|custa|preco|onde|receita|como (se )?faz|engorda|faz mal|tem (quantas|quanto))\b/;

/** Reação de comida para a frase, ou null (na dúvida, nada). "docinho" fica com a reação original. */
export function detectComida(text) {
  const n = norm(text);
  if (!n || /\bdocinho\w*\b/.test(n)) return null;
  if (INFO.test(n) || PASSADO.test(n)) return null;
  if (!QUER.test(n) && !VERBO.test(n)) return null;
  // Negação antes da intenção ("não quero pizza", "não tenho vontade de doce").
  const q = n.search(QUER) >= 0 ? n.search(QUER) : n.search(VERBO);
  const neg = n.search(NEGA);
  if (neg >= 0 && neg <= q + 4) return null;
  if (/\bso hoje\b/.test(n) && /\b(besteira|porcaria|junk|bobagem)\b/.test(n)) return 'pk_semDesculpas';
  const achados = COMIDAS.filter(([, re]) => re.test(n)).map(([id]) => id);
  if (!achados.length) return null;
  if (achados.length >= 3) return 'pk_colapso';
  return achados[0];
}

// ------------------------------------------------------------------ namorado e João

/** O "João" da frase é o namorado dela? (outro João, chefe, primo… não). */
export function eOJoao(n, nome = 'joao') {
  const j = norm(nome) || 'joao';
  if (!new RegExp(`\\b${j}\\b`).test(n)) return false;
  return !new RegExp(`\\b(outro|um|uma|o tal|meu chefe|meu primo|meu tio|meu irmao|meu pai|meu colega|professor|doutor|dr|seu) ${j}\\b|\\b${j} (da|do|de) (escola|trabalho|faculdade|academia|rua|padaria|predio|condominio)\\b`).test(n);
}

/**
 * Reação do namorado/João para a frase: {id} ou {cuidado: true} (João a magoou:
 * acolher, sem piada e sem justificar) ou null.
 */
export function detectNamorado(text, { joao = 'João', jaMencionou = false } = {}) {
  const n = norm(text);
  if (!n) return null;
  const j = norm(joao) || 'joao';
  const ehJoao = eOJoao(n, j);
  const nam = ehJoao || /\b(meu namorado|meu amor|meu mozao|meu bebe|meu boy|o boy)\b/.test(n);
  const ele = nam || /\b(ele|dele|com ele)\b/.test(n);
  // Ele a magoou / agrediu: nada de piada nem "fala com o João".
  if (nam && /\b(me magoou|me machucou|me bateu|me agrediu|me empurrou|me ameacou|me xingou|me humilhou|me traiu|terminou comigo|brigou comigo)\b/.test(n)) return { cuidado: true, violencia: /\b(bateu|agrediu|empurrou|ameacou)\b/.test(n) };
  if (/\b(to gravida|estou gravida|tou gravida|teste deu positivo|positivo no teste)\b/.test(n)) return null;
  if (ele && /\b(engravid\w*|insemina\w*|ter (um )?filho|fazer (um )?filho|fazer (um )?bebe|bebe com ele|reproduzir|reproducao)\b/.test(n)) return { id: 'pk_inseminacao' };
  if (nam && /\b(e|eh) (o )?(amor da minha vida|tudo pra mim|meu tudo)\b|\bamo (muito |demais )?o\b.{0,8}\b(joao|meu namorado)\b|\bamo (muito |demais )?(o )?joao\b/.test(n)) return { id: 'pk_jApoteose' };
  if (nam && /\b(me elogiou|disse que me ama|falou que me ama|disse que eu sou linda|me chamou de linda|disse que me adora)\b/.test(n)) return { id: 'pk_jElogio' };
  if (nam && /\b(mandou|me mandou|enviou|respondeu) (uma )?(mensagem|msg|zap|audio|foto)\b|\b(me chamou|me ligou)\b/.test(n)) return { id: 'pk_jMensagem' };
  if (nam && /\b(ta|esta|tá) chegando\b|\b(chegou|vai chegar|vem pra ca|ta vindo)\b|\b(vem|chega|volta) (amanha|hoje|aqui|me ver|no fim de semana|nesse fim de semana|sabado|domingo|sexta)\b/.test(n)) return { id: 'pk_jChegando' };
  if (nam && /\b(ta|esta|ficou) (chateado|bravo|puto|irritado|magoado) comigo|\b(ta|esta|ficou) (chateado|bravo|puto|irritado)\b/.test(n)) return { id: 'pk_jJulgamento' };
  if (ehJoao && /\b(e|eh) (burro|chato|feio|idiota|lixo|um bosta|horroroso|otario)\b/.test(n)) return { id: 'pk_jHeresia' };
  if (/\b(tesao|com fogo|morrendo de vontade dele|louca por ele|segundas intencoes)\b/.test(n) && (ele || /\btesao\b/.test(n))) return { id: ehJoao ? 'pk_jDevocao' : 'pk_libido' };
  if (/\b(nao vejo a hora de (ver|encontrar) (ele|o joao|meu namorado))\b/.test(n)) return { id: 'pk_libido' };
  if (ele && /\b(vou agarrar|ele que me aguarde|vou atacar ele|vou pular nele)\b/.test(n)) return { id: 'pk_namoradoPerigo' };
  if (/\b(dormir (na casa dele|com (ele|o joao|meu namorado))|ficar sozinhos|vamos ficar sozinhos|a ?sos)\b/.test(n)) return { id: 'pk_quarto' };
  if (/\b(arrumar|fazer|arrumando) (a |minha )?mala\b/.test(n)) return { id: 'pk_checklist' };
  if (ele && /\b(ficar mais (uns )?dias|nao quero voltar|morar com|morar junto)\b/.test(n)) return { id: 'pk_mudanca' };
  if (ele && /\b(prefiro ficar com|passar o fim de semana com|fim de semana com|o findi com)\b/.test(n)) return { id: 'pk_ciumes' };
  if (/\b(hoje vai ter|a gente vai aproveitar muito|vamos aproveitar muito|to cheia de segundas)\b/.test(n)) return { id: 'pk_noitePromete' };
  if (/\bvoltei da (casa|cidade|viagem)\b/.test(n) || (nam && /\bvoltei\b/.test(n))) return { id: 'pk_relatorio' };
  if (/\b(vou|vou viajar|indo|vou pra|vou para) (visitar|ver|encontrar)?\s?(o )?(joao|meu namorado)\b|\b(pra|para) (a )?(cidade|casa) (dele|do joao|do meu namorado)\b/.test(n)) return { id: ehJoao ? 'pk_jPeregrinacao' : 'pk_operacao' };
  if (nam && /\bsaudade\b/.test(n)) return { id: 'pk_jSaudade' };
  if (ehJoao && !jaMencionou) return { id: 'pk_jMencao' };
  return null;
}

// ------------------------------------------------------------------ reação pelo contexto da conversa

/**
 * Reações escolhidas pelo que ela conta (sem menu nem comando): {id, fala} ou null.
 * Ex.: "passei o dia inteiro no Instagram" → olhar de lado; "perdi pra esse chefe dez vezes" → frustração.
 */
export function reacaoDeContexto(text) {
  const n = norm(text);
  if (!n || /\b(nao|nunca|sem) (passei|fiquei|perdi)\b/.test(n)) return null;
  if (/\b(passei|fiquei|gastei|perdi) (o dia|a tarde|a manha|a noite|horas|o dia inteiro|a tarde inteira|a noite inteira)( todo| toda| inteiro| inteira)? (no|na|rolando o|vendo) (insta|instagram|tiktok|reels|celular|feed|twitter|x)\b|\brolei o feed\b/.test(n)) {
    return { id: 'pk_sideEye', fala: 'O dia inteiro. No feed. Que orgulho. Tô anotando no seu prontuário.' };
  }
  if (/\b(perdi|morri|apanhei)\b.*\b(\d+|dez|cinco|tres|mil|varias|mil) vezes\b|\b(perdi|morri) de novo\b|\bnao consigo passar (dess[ae]|do|da)\b|\besse chefe\b.*\b(perdi|morri|impossivel)\b/.test(n)) {
    return { id: 'pk_broCooked', fala: 'De novo? Respira. Esse chefe tá te fazendo de supino. Mais uma e vai.' };
  }
  return null;
}

/** Resposta de acolhimento quando ela conta que o João (ou o namorado) a magoou. */
export function respostaCuidado({ violencia = false, nome = 'Emanuele' } = {}) {
  return violencia
    ? `${nome}, isso não é brincadeira e não é culpa sua. Se você estiver em perigo agora, liga 190. A Central de Atendimento à Mulher é o 180, 24 horas. Fala com alguém de confiança. Eu tô aqui.`
    : `${nome}, sinto muito. O que ele fez não é culpa sua, e o que você sente é válido. Conversa com alguém de confiança. Se pesar demais, o CVV atende no 188, 24 horas. Eu fico aqui.`;
}

/** Reação de meme/anime pedida no chat ("faz o side eye", "/reacao bankai"). */
export function findReacao(items, q) {
  const n = norm(q);
  if (!n) return null;
  return items.find((it) => !it.leve && (it.id.toLowerCase() === n.replace(/\s/g, '') || norm(it.nome) === n))
    || items.find((it) => !it.leve && (it.gatilho.frases || []).some((f) => n.includes(norm(f))))
    || items.find((it) => !it.leve && norm(it.nome).includes(n))
    || null;
}
