// Catálogo da loja de JOJOcoins (0.48.0): 150 itens, cada um com função real no app.
// O preço NÃO é escolhido à mão: sai do índice de valor percebido (13 fatores de 0 a 5,
// ver `indiceValor`) convertido em tempo de obtenção numa sessão normal e depois em
// JOJOcoins pela taxa auditada (`TAXA_HORA`, docs/LOJA.md). Puro e testável.

export const NOME_MOEDA = 'JOJOcoins';

/**
 * JOJOcoins por hora de uma sessão normal (moderada). Auditoria da geração real
 * (scripts/economia-sim.mjs): 1 JOJOcoin por ponto nominal de XP creditado, com os
 * tetos diários que já existem; a sessão moderada rende ~120/h.
 */
export const TAXA_HORA = 120;

export const CATEGORIAS = Object.freeze([
  { id: 'visual', nome: 'Visuais', icone: '👔' },
  { id: 'comida', nome: 'Comidas e bebidas', icone: '🍣' },
  { id: 'objeto', nome: 'Objetos interativos', icone: '🪀' },
  { id: 'decoracao', nome: 'Decoração', icone: '🪸' },
  { id: 'animacao', nome: 'Animações', icone: '🕺' },
  { id: 'poder', nome: 'Poderes', icone: '⚡' },
  { id: 'atividade', nome: 'Atividades', icone: '🎬' },
  { id: 'cuidado', nome: 'Cuidado', icone: '🧴' },
  { id: 'colecionavel', nome: 'Colecionáveis', icone: '🦷' },
  { id: 'lendario', nome: 'Lendários', icone: '👑' },
]);

export const RARIDADES = Object.freeze([
  { id: 'acessivel', nome: 'Acessível', horas: [0, 0.25] },
  { id: 'comum', nome: 'Comum', horas: [0.25, 0.75] },
  { id: 'incomum', nome: 'Incomum', horas: [0.75, 2] },
  { id: 'raro', nome: 'Raro', horas: [2, 5] },
  { id: 'epico', nome: 'Épico', horas: [5, 12] },
  { id: 'lendario', nome: 'Lendário', horas: [12, 24] },
  { id: 'extraordinario', nome: 'Extraordinário', horas: [24, Infinity] },
]);

// Fatores do índice (ordem do vetor `v` de cada item) e o peso de cada um.
export const FATORES = Object.freeze([
  ['satisfacao', 'Satisfação proporcionada', 1.6],
  ['utilidade', 'Utilidade prática', 1.0],
  ['visual', 'Qualidade visual', 1.0],
  ['complexidade', 'Complexidade da interação', 0.8],
  ['conteudo', 'Quantidade de conteúdo', 1.0],
  ['variedade', 'Variedade de situações de uso', 0.8],
  ['frequencia', 'Frequência potencial de uso', 0.8],
  ['raridade', 'Raridade legítima', 0.6],
  ['exclusividade', 'Exclusividade', 0.6],
  ['duracao', 'Duração do benefício', 1.0],
  ['novas', 'Novas experiências', 1.0],
  ['gameplay', 'Impacto na jogabilidade', 0.8],
  ['colecao', 'Valor colecionável', 0.6],
]);
const PESO_TOTAL = FATORES.reduce((s, [, , w]) => s + w, 0);

/** Índice de valor percebido (0–100). */
export function indiceValor(v) {
  return Math.round((FATORES.reduce((s, [, , w], i) => s + w * (v[i] || 0), 0) / (5 * PESO_TOTAL)) * 1000) / 10;
}

/**
 * Tempo de obtenção (h) que o índice justifica: exponencial, de minutos a dias.
 * Índice 30 ≈ 6 min; cada +6,84 pontos multiplica o tempo por e (índice 69 ≈ 30 h).
 */
export function horasDoIndice(indice) {
  return 0.1 * Math.exp((indice - 30) / 6.84);
}

const redondo = (n) => (n < 100 ? Math.max(5, Math.round(n / 5) * 5) : n < 1000 ? Math.round(n / 10) * 10 : Math.round(n / 50) * 50);

export function raridadeDasHoras(h) {
  return RARIDADES.find((r) => h >= r.horas[0] && h < r.horas[1]) || RARIDADES.at(-1);
}

/** Justificativa econômica: os três fatores que mais pesam no índice do item. */
export function justificativa(v) {
  const top = FATORES.map(([id, nome, w], i) => ({ nome, peso: w * (v[i] || 0) })).sort((a, b) => b.peso - a.peso).slice(0, 3).map((x) => x.nome.toLowerCase());
  return `Índice puxado por ${top.join(', ')}.`;
}

// ------------------------------------------------------------------ itens

// v = [satisfação, utilidade, visual, complexidade, conteúdo, variedade, frequência,
//      raridade, exclusividade, duração, novas experiências, gameplay, coleção]
const I = (id, tipo, nome, desc, fala, v, efeito, extra = {}) => ({ id, tipo, nome, desc, fala, v, efeito, ...extra });

const VISUAIS = [
  I('lv01', 'visual', 'Jaleco de Cientista', 'Jaleco, óculos de laboratório e tubo de ensaio no bolso. O JoJo veste sozinho em conversa de ciência.', 'Jaleco. Agora quando eu disser que você está errada, é revisão por pares.', [4, 2, 4, 1, 3, 3, 3, 2, 3, 5, 2, 1, 3], { look: 'lv01' }, { contextos: ['ciencia', 'estudo', 'pesquisa'] }),
  I('lv02', 'visual', 'Plantão Médico', 'Pijama cirúrgico, estetoscópio e crachá. Aparece em assunto de saúde.', 'Plantão aberto. Atendo hipocondria por ordem de chegada.', [4, 2, 4, 1, 3, 2, 3, 2, 3, 5, 2, 1, 3], { look: 'lv02' }, { contextos: ['saude', 'cuidado'] }),
  I('lv03', 'visual', 'Professor Severo', 'Terno de tweed, gravata-borboleta e giz. Para explicação e estudo.', 'Senta. A aula começa quando eu terminar de te julgar.', [4, 2, 4, 1, 3, 3, 3, 2, 3, 5, 2, 1, 3], { look: 'lv03' }, { contextos: ['estudo', 'explicacao', 'ciencia'] }),
  I('lv04', 'visual', 'Programador de Madrugada', 'Jaqueta, boné, fone e código no peito. Combina com editor de código aberto.', 'Compilou de primeira. Óbvio, fui eu que vesti.', [4, 2, 4, 1, 3, 3, 3, 2, 3, 5, 2, 1, 3], { look: 'lv04' }, { contextos: ['programacao', 'trabalho', 'noite'] }),
  I('lv05', 'visual', 'Executivo Implacável', 'Terno escuro, gravata vermelha e relógio de ouro. Para reunião e trabalho.', 'Reunião marcada. Pauta única: eu.', [4, 2, 4, 1, 3, 3, 3, 2, 3, 5, 2, 1, 3], { look: 'lv05' }, { contextos: ['trabalho', 'reuniao', 'foco'] }),
  I('lv06', 'visual', 'Chef Tubarão', 'Dólmã, avental, lenço e chapéu de chef. Aparece na hora de comer.', 'Chef. Hoje o prato do dia é proteína e humilhação.', [4, 2, 4, 1, 3, 2, 3, 2, 3, 5, 2, 1, 3], { look: 'lv06' }, { contextos: ['refeicao', 'cozinha'] }),
  I('lv07', 'visual', 'Personal Trainer', 'Regata, short, boné, apito e cronômetro. Para treino e timer.', 'Mais dez. Eu conto. Eu sempre conto errado pra cima.', [4, 2, 4, 1, 3, 3, 3, 2, 3, 5, 2, 1, 3], { look: 'lv07' }, { contextos: ['treino', 'timer', 'manha'] }),
  I('lv08', 'visual', 'Faixa Preta', 'Quimono branco, faixa preta e bandana vermelha.', 'Faixa preta. Em sarcasmo também.', [4, 1, 4, 1, 3, 2, 2, 2, 3, 5, 2, 1, 3], { look: 'lv08' }, { contextos: ['treino', 'conquista', 'provocacao'] }),
  I('lv09', 'visual', 'Astronauta', 'Macacão espacial, capacete com viseira e bandeira do Brasil.', 'Um pequeno passo para o tubarão. Um passo enorme pra você me admirar.', [4, 1, 5, 1, 3, 2, 2, 3, 3, 5, 2, 1, 4], { look: 'lv09' }, { contextos: ['ciencia', 'curiosidade', 'espaco'] }),
  I('lv10', 'visual', 'Detetive Noir', 'Sobretudo, chapéu fedora, cachimbo e lupa no bolso.', 'Elementar. A culpada pela aba aberta é você.', [4, 1, 4, 1, 3, 2, 2, 2, 3, 5, 2, 1, 3], { look: 'lv10' }, { contextos: ['curiosidade', 'pesquisa', 'investigacao'] }),
  I('lv11', 'visual', 'Juiz Supremo', 'Toga, peruca de tribunal, babado e martelinho.', 'Ordem no tribunal. Réu: sua procrastinação. Sentença: trabalho.', [4, 1, 4, 1, 3, 2, 2, 2, 3, 5, 2, 1, 3], { look: 'lv11' }, { contextos: ['provocacao', 'julgamento', 'procrastinacao'] }),
  I('lv12', 'visual', 'Rei dos Sete Mares', 'Capa azul real, coroa, corrente e broche de tridente.', 'Ajoelha não, que só um tem esse direito. Admira.', [5, 1, 5, 1, 3, 2, 2, 3, 4, 5, 2, 1, 4], { look: 'lv12' }, { contextos: ['conquista', 'nivel', 'celebracao'] }),
  I('lv13', 'visual', 'Capitão Pirata', 'Colete, chapéu de pirata, tapa-olho, bigode e botas.', 'Arr. O tesouro sou eu e o mapa também.', [4, 1, 4, 1, 3, 2, 2, 2, 3, 5, 2, 1, 3], { look: 'lv13' }, { contextos: ['jogo', 'lazer'] }),
  I('lv14', 'visual', 'Cavaleiro de Armadura', 'Armadura, elmo com chifres e brasão.', 'Armadura completa. O dragão que lute.', [4, 1, 5, 1, 3, 2, 2, 3, 3, 5, 2, 1, 4], { look: 'lv14' }, { contextos: ['jogo', 'conquista'] }),
  I('lv15', 'visual', 'Mago Estelar', 'Capa de estrelas, chapéu de bruxo e barba branca.', 'Magia de verdade: transformar sua lista de tarefas em feito.', [4, 1, 5, 1, 3, 2, 2, 3, 3, 5, 2, 1, 4], { look: 'lv15' }, { contextos: ['jogo', 'estudo', 'noite'] }),
  I('lv16', 'visual', 'Rockstar', 'Jaqueta de couro com tachas, cabelo espetado e óculos escuros.', 'Turnê mundial. Uma data só: o seu desktop.', [4, 1, 4, 1, 3, 2, 3, 2, 3, 5, 2, 1, 3], { look: 'lv16' }, { contextos: ['musica', 'lazer', 'festa'] }),
  I('lv17', 'visual', 'Pijama de Estrelas', 'Macacão de pijama, bobs e máscara de dormir na testa. Só à noite.', 'Pijama. Ainda assim mais disciplinado que você às duas da manhã.', [4, 2, 4, 1, 3, 1, 3, 2, 3, 5, 2, 1, 3], { look: 'lv17' }, { contextos: ['noite', 'sono', 'cansaco'] }),
  I('lv18', 'visual', 'Moletom de Domingo', 'Moletom com capuz, short e chinelo. Para descanso e fim de semana.', 'Domingo. Até eu descanso. Por cinco minutos.', [3, 2, 3, 1, 2, 2, 3, 1, 2, 5, 1, 1, 2], { look: 'lv18' }, { contextos: ['descanso', 'fimDeSemana', 'ocioso'] }),
  I('lv19', 'visual', 'Surfista', 'Regata florida, bermuda, chinelo, protetor no focinho e prancha.', 'Onda boa é a de produtividade. Mentira, é a do mar.', [4, 1, 4, 1, 3, 2, 2, 2, 3, 5, 2, 1, 3], { look: 'lv19' }, { contextos: ['lazer', 'calor', 'fimDeSemana'] }),
  I('lv20', 'visual', 'Gaúcho do Churrasco', 'Bombacha, chapéu, lenço vermelho e guaiaca com moedas.', 'Bah. Churrasco é proteína com cultura.', [4, 1, 4, 1, 3, 1, 2, 2, 3, 5, 2, 1, 3], { look: 'lv20' }, { contextos: ['refeicao', 'churrasco', 'cultura'] }),
  I('lv21', 'visual', 'Cangaceiro', 'Chapéu de couro, colete, cartucheira e sandália.', 'Cangaço de escritório. Ninguém mexe na minha planilha.', [4, 1, 4, 1, 3, 1, 2, 2, 3, 5, 2, 1, 3], { look: 'lv21' }, { contextos: ['provocacao', 'cultura'] }),
  I('lv22', 'visual', 'Smoking de Gala', 'Smoking, gravata-borboleta, rosa na lapela e topete.', 'Traje de gala. A ocasião sou eu.', [5, 1, 5, 1, 3, 2, 2, 3, 4, 5, 2, 1, 4], { look: 'lv22' }, { contextos: ['celebracao', 'conquista', 'festa'] }),
  I('lv23', 'visual', 'Bombeiro', 'Uniforme vermelho com faixas refletivas e capacete com brasão.', 'Tudo pegando fogo? Normal. Eu apago e ainda cobro.', [4, 1, 4, 1, 3, 1, 2, 2, 3, 5, 2, 1, 3], { look: 'lv23' }, { contextos: ['erro', 'urgencia'] }),
  I('lv24', 'visual', 'Marinheiro', 'Camisa listrada, quepe, lenço azul e âncora.', 'Marinheiro. O mar sempre foi meu. Só agora tenho uniforme.', [4, 1, 4, 1, 3, 2, 2, 2, 3, 5, 2, 1, 3], { look: 'lv24' }, { contextos: ['lazer', 'manha'] }),
  I('lv25', 'visual', 'Palhaço do Caos', 'Macacão de bolinhas, peruca colorida, nariz vermelho e sapatão.', 'Palhaço. A diferença é que eu cobro e você ri de graça.', [4, 1, 4, 1, 3, 2, 2, 2, 3, 5, 2, 1, 3], { look: 'lv25' }, { contextos: ['humor', 'provocacao', 'piada'] }),
  I('lv26', 'visual', 'Agente Secreto', 'Terno preto, gravata fina, óculos escuros e ponto no ouvido. Discreto no foco.', 'Missão confidencial: você terminar isso. Esta mensagem se autodestrói.', [4, 2, 4, 1, 3, 3, 3, 2, 3, 5, 2, 1, 3], { look: 'lv26' }, { contextos: ['foco', 'trabalho', 'discreto'] }),
  I('lv27', 'visual', 'Explorador', 'Colete de safári, chapéu de palha, binóculo e bússola.', 'Explorando território inexplorado: a sua pasta Downloads.', [4, 1, 4, 1, 3, 2, 2, 2, 3, 5, 2, 1, 3], { look: 'lv27' }, { contextos: ['curiosidade', 'descoberta', 'pesquisa'] }),
  I('lv28', 'visual', 'Mr. Olympia', 'Sunga de palco, colar de ouro, número de atleta e brilho de óleo.', 'Palco. Luz. Pose. O júri já pode ir embora.', [5, 1, 4, 1, 3, 2, 3, 3, 4, 5, 2, 1, 4], { look: 'lv28' }, { contextos: ['treino', 'conquista'] }),
  I('lv29', 'visual', 'Hacker Encapuzado', 'Sobretudo preto, capuz, óculos verdes e chuva de código.', 'Estou dentro. Do seu desktop. Sempre estive.', [4, 1, 4, 1, 3, 2, 2, 2, 3, 5, 2, 1, 3], { look: 'lv29' }, { contextos: ['programacao', 'noite'] }),
  I('lv30', 'visual', 'Imperador Romano', 'Toga com faixa púrpura, coroa de louros e sandália.', 'Ave, eu. Os que vão trabalhar te saúdam.', [5, 1, 5, 1, 3, 2, 2, 3, 4, 5, 2, 1, 4], { look: 'lv30' }, { contextos: ['conquista', 'provocacao', 'celebracao'] }),
];

// Comidas especiais (consumíveis): alimentam pelo sistema de necessidades que já existe.
const COMIDAS = [
  I('lc01', 'comida', 'Banquete de Atum', 'Fome +45, humor +10, saúde +5.', 'Atum inteiro. Finalmente alguém respeita meu porte.', [4, 4, 3, 1, 1, 1, 3, 1, 1, 1, 1, 2, 0], { fome: 45, humor: 10, saude: 5, pref: 'favorite' }),
  I('lc02', 'comida', 'Sushi Omakase', 'Fome +35, humor +15. Escolha do chef.', 'Omakase. Confio no chef porque o chef sou eu.', [4, 3, 3, 1, 1, 1, 2, 2, 1, 1, 1, 2, 0], { fome: 35, humor: 15, saude: 4, pref: 'favorite' }),
  I('lc03', 'comida', 'Poke de Salmão', 'Fome +30, saúde +8, humor +6.', 'Poke. Fibra, proteína e pose.', [3, 4, 3, 1, 1, 1, 3, 1, 1, 1, 1, 2, 0], { fome: 30, humor: 6, saude: 8 }),
  I('lc04', 'comida', 'Shake de Whey', 'Fome +20, saúde +6 e Metabolismo Lento por 2 h.', 'Whey. Não é suplemento, é estilo de vida.', [4, 4, 3, 1, 1, 1, 3, 1, 1, 2, 1, 3, 0], { fome: 20, humor: 5, saude: 6, buff: { id: 'lp01', horas: 2 } }),
  I('lc05', 'comida', 'Café Turbo', 'Humor +12, fome +8 e Humor Blindado por 2 h.', 'Café turbo. Meu coração agora bate em 4/4.', [4, 3, 3, 1, 1, 2, 3, 1, 1, 2, 1, 3, 0], { fome: 8, humor: 12, saude: 0, buff: { id: 'lp11', horas: 2 } }),
  I('lc06', 'comida', 'Açaí na Tigela', 'Fome +28, humor +12.', 'Açaí com granola. Sem leite condensado, que eu não sou bagunça.', [4, 3, 3, 1, 1, 1, 3, 1, 1, 1, 1, 2, 0], { fome: 28, humor: 12, saude: 2 }),
  I('lc07', 'comida', 'Brigadeiro Gourmet', 'Humor +20, fome +10, saúde −2. Doce, mas é seu.', 'Brigadeiro. Uma aberração gourmet. Engulo em protesto.', [4, 1, 3, 1, 1, 1, 2, 1, 1, 1, 1, 1, 0], { fome: 10, humor: 20, saude: -2, pref: 'dislike' }),
  I('lc08', 'comida', 'Pastel de Feira', 'Fome +25, humor +10.', 'Pastel de feira. Vem com caldo de cana e culpa.', [3, 3, 3, 1, 1, 1, 3, 1, 1, 1, 1, 2, 0], { fome: 25, humor: 10, saude: 0 }),
  I('lc09', 'comida', 'Churrasco Completo', 'Fome +50, humor +12. Enche de verdade.', 'Picanha, costela e linguiça. Isso é ciência aplicada.', [5, 4, 3, 1, 1, 1, 2, 2, 1, 1, 1, 2, 0], { fome: 50, humor: 12, saude: 2, pref: 'favorite' }),
  I('lc10', 'comida', 'Moqueca Capixaba', 'Fome +38, saúde +6, humor +8.', 'Moqueca. Peixe tratado com o respeito que eu mereço.', [4, 4, 3, 1, 1, 1, 2, 2, 1, 1, 1, 2, 0], { fome: 38, humor: 8, saude: 6 }),
  I('lc11', 'comida', 'Lagosta Thermidor', 'Fome +32, humor +22. Luxo marinho.', 'Lagosta. Ela não aguentou a pressão. Literalmente.', [5, 3, 4, 1, 1, 1, 1, 3, 2, 1, 1, 2, 1], { fome: 32, humor: 22, saude: 4, pref: 'favorite' }),
  I('lc12', 'comida', 'Ramen Picante', 'Fome +34, humor +8, higiene −3 (suor).', 'Ramen picante. Estou suando e isso é técnica.', [4, 3, 3, 1, 1, 1, 3, 1, 1, 1, 1, 2, 0], { fome: 34, humor: 8, saude: 2, higiene: -3 }),
  I('lc13', 'comida', 'Pizza Família', 'Fome +45, humor +15, saúde −4.', 'Pizza inteira. Funeral do shape às oito.', [4, 3, 3, 1, 1, 1, 2, 1, 1, 1, 1, 2, 0], { fome: 45, humor: 15, saude: -4, pref: 'dislike' }),
  I('lc14', 'comida', 'Bolo de Comemoração', 'Humor +25, fome +15 e confete na hora de comer.', 'Bolo. Hoje a dieta tirou folga e eu também.', [4, 2, 4, 1, 1, 2, 1, 2, 1, 1, 2, 1, 0], { fome: 15, humor: 25, saude: -2, fx: 'confete' }),
  I('lc15', 'comida', 'Picolé de Limão', 'Humor +10, fome +6. Refresca.', 'Picolé. Congelei o cérebro por estratégia.', [3, 2, 3, 1, 1, 1, 3, 1, 1, 1, 1, 1, 0], { fome: 6, humor: 10, saude: 1 }),
  I('lc16', 'comida', 'Sopa Restauradora', 'Saúde +18, fome +18.', 'Sopa. Remédio que a vó aprovaria.', [3, 4, 3, 1, 1, 1, 2, 1, 1, 1, 1, 2, 0], { fome: 18, humor: 4, saude: 18 }),
  I('lc17', 'comida', 'Vitamina de Banana', 'Fome +22, saúde +8, humor +6.', 'Vitamina. Potássio pro bíceps.', [3, 3, 3, 1, 1, 1, 3, 1, 1, 1, 1, 2, 0], { fome: 22, humor: 6, saude: 8 }),
  I('lc18', 'comida', 'Frutos do Mar Gratinados', 'Fome +36, humor +14.', 'Gratinado. Queijo em cima de primo meu. Delícia.', [4, 3, 3, 1, 1, 1, 2, 2, 1, 1, 1, 2, 0], { fome: 36, humor: 14, saude: 3 }),
  I('lc19', 'comida', 'Torta Holandesa', 'Humor +18, fome +16, saúde −2.', 'Torta holandesa. Holanda pede desculpas em forma de doce.', [3, 2, 3, 1, 1, 1, 2, 1, 1, 1, 1, 1, 0], { fome: 16, humor: 18, saude: -2 }),
  I('lc20', 'comida', 'Caviar Beluga', 'Fome +20, humor +35, saúde +10 e brilho dourado. O mais caro do mar.', 'Caviar. Agora sim estou sendo tratado como mereço.', [5, 2, 4, 1, 1, 1, 1, 4, 3, 1, 2, 2, 2], { fome: 20, humor: 35, saude: 10, pref: 'favorite', fx: 'brilho' }),
];

// Objetos interativos: ficam com o JoJo; "Usar" toca a animação com o objeto e ele brinca
// sozinho de vez em quando no repouso.
const OBJETOS = [
  I('ob01', 'objeto', 'Ioiô Profissional', 'O JoJo faz truques de ioiô quando você pede e às vezes sozinho.', 'Ioiô. Sobe e desce igual sua motivação.', [3, 1, 3, 3, 2, 2, 3, 1, 2, 5, 3, 1, 2], { anim: 'ob01' }),
  I('ob02', 'objeto', 'Cubo Mágico', 'Ele resolve (ou finge) o cubo mágico em segundos.', 'Resolvido. Eu nem olhei. Mentira, olhei muito.', [3, 1, 3, 3, 2, 2, 3, 1, 2, 5, 3, 1, 2], { anim: 'ob02' }),
  I('ob03', 'objeto', 'Bola de Basquete', 'Quica a bola no chão do desktop com ritmo.', 'Quica, quica. Arremesso só no cesto do lixo.', [3, 1, 3, 3, 2, 2, 3, 1, 2, 5, 3, 1, 2], { anim: 'ob03' }),
  I('ob04', 'objeto', 'Guitarra Elétrica', 'Solo de guitarra muda (o JoJo é silencioso, como sempre).', 'Solo sem som. A plateia imagina e eu recebo os aplausos.', [4, 1, 4, 3, 2, 2, 3, 2, 2, 5, 3, 1, 3], { anim: 'ob04' }),
  I('ob05', 'objeto', 'Kettlebell', 'Série de swings com kettlebell.', 'Kettlebell. A bola de ferro mais honesta do mundo.', [3, 1, 3, 3, 2, 2, 3, 1, 2, 5, 3, 1, 2], { anim: 'ob05' }),
  I('ob06', 'objeto', 'Corda de Pular', 'Pula corda com a corda passando em volta do corpo.', 'Corda. Cardio que nem dá pra fingir.', [3, 1, 3, 3, 2, 2, 3, 1, 2, 5, 3, 1, 2], { anim: 'ob06' }),
  I('ob07', 'objeto', 'Videogame Portátil', 'Joga uma partida rápida no portátil e comemora.', 'Recorde. O jogo pediu desculpas.', [3, 1, 3, 3, 2, 2, 3, 1, 2, 5, 3, 1, 2], { anim: 'ob07' }),
  I('ob08', 'objeto', 'Pipa', 'Empina pipa com a linha esticando até o alto.', 'Pipa no alto. Cortei a dos vizinhos imaginários.', [4, 1, 4, 3, 2, 2, 2, 2, 2, 5, 3, 1, 2], { anim: 'ob08' }),
  I('ob09', 'objeto', 'Bambolê', 'Rebola o bambolê na cintura.', 'Bambolê. Core de aço, quadril de seda.', [3, 1, 3, 3, 2, 2, 3, 1, 2, 5, 3, 1, 2], { anim: 'ob09' }),
  I('ob10', 'objeto', 'Lupa Gigante', 'Examina coisas imaginárias com a lupa.', 'Lupa. Investigando seu histórico de produtividade. Vazio.', [3, 1, 3, 3, 2, 2, 3, 1, 2, 5, 3, 1, 2], { anim: 'ob10' }),
  I('ob11', 'objeto', 'Varinha de Bolhas', 'Sopra bolhas de sabão que flutuam.', 'Bolhas. Delicadeza também é força.', [4, 1, 4, 3, 2, 2, 3, 1, 2, 5, 3, 1, 2], { anim: 'ob11' }),
  I('ob12', 'objeto', 'Tambor de Maracatu', 'Batuca a alfaia no ritmo (sem som).', 'Batuque. Você ouve com o coração, porque eu sou mudo.', [3, 1, 4, 3, 2, 2, 3, 1, 2, 5, 3, 1, 2], { anim: 'ob12' }),
  I('ob13', 'objeto', 'Prancheta de Técnico', 'Desenha a jogada da sua tarefa na prancheta.', 'Esquema tático: você foca, eu grito.', [3, 2, 3, 3, 2, 2, 3, 1, 2, 5, 3, 1, 2], { anim: 'ob13' }),
  I('ob14', 'objeto', 'Leque de Papel', 'Se abana com o leque, dramático.', 'Leque. Calor de quem trabalha. Ou de quem é eu.', [3, 1, 3, 3, 2, 2, 3, 1, 2, 5, 3, 1, 2], { anim: 'ob14' }),
  I('ob15', 'objeto', 'Anilha Olímpica', 'Gira a anilha como volante e depois levanta.', 'Anilha de vinte. Volante do meu carro imaginário.', [3, 1, 3, 3, 2, 2, 3, 1, 2, 5, 3, 1, 2], { anim: 'ob15' }),
];

// Decorações: ficam no chão ao lado do JoJo (até uma de cada lado e uma atrás).
const DECORACOES = [
  I('dc01', 'decoracao', 'Planta de Aquário', 'Alga verde que balança ao lado do JoJo.', 'Alga. O único ser vivo que não me irrita.', [3, 1, 3, 1, 1, 2, 5, 1, 2, 5, 1, 0, 2], { decor: 'dc01' }),
  I('dc02', 'decoracao', 'Baú do Tesouro', 'Baú de madeira com JOJOcoins brilhando.', 'Baú. É onde guardo meu ego. Está cheio.', [3, 1, 4, 1, 1, 2, 5, 2, 2, 5, 1, 0, 3], { decor: 'dc02' }),
  I('dc03', 'decoracao', 'Castelo de Aquário', 'Castelinho clássico com torre e telhado vermelho.', 'Castelo. Meu imóvel de veraneio.', [3, 1, 4, 1, 1, 2, 5, 1, 2, 5, 1, 0, 2], { decor: 'dc03' }),
  I('dc04', 'decoracao', 'Concha com Pérola', 'Concha rosa aberta com pérola que brilha.', 'Pérola. Rara como uma tarefa sua terminada.', [3, 1, 4, 1, 1, 2, 5, 2, 2, 5, 1, 0, 3], { decor: 'dc04' }),
  I('dc05', 'decoracao', 'Coral Rosa', 'Coral ramificado com pontas claras.', 'Coral. Decoração com consciência ambiental.', [3, 1, 3, 1, 1, 2, 5, 1, 2, 5, 1, 0, 2], { decor: 'dc05' }),
  I('dc06', 'decoracao', 'Estrela-do-Mar', 'Estrela-do-mar sentada, olhando para você.', 'Estrela. Ela me julga. Respeito.', [3, 1, 3, 1, 1, 2, 5, 1, 2, 5, 1, 0, 2], { decor: 'dc06' }),
  I('dc07', 'decoracao', 'Âncora Antiga', 'Âncora com ferrugem e argola.', 'Âncora. Me prende ao desktop por vontade própria.', [3, 1, 3, 1, 1, 2, 5, 1, 2, 5, 1, 0, 2], { decor: 'dc07' }),
  I('dc08', 'decoracao', 'Mini Farol', 'Farol listrado com luz pulsando.', 'Farol. Pra você achar o caminho de volta ao trabalho.', [3, 1, 4, 1, 1, 2, 5, 2, 2, 5, 1, 0, 3], { decor: 'dc08' }),
  I('dc09', 'decoracao', 'Kit de Yoga', 'Tapete enrolado e garrafinha de água.', 'Yoga. Alongo a paciência que tenho com você.', [3, 1, 3, 1, 1, 2, 5, 1, 2, 5, 1, 0, 2], { decor: 'dc09' }),
  I('dc10', 'decoracao', 'Banco de Supino', 'Banco com barra e anilhas vermelhas.', 'Supino. O altar do peitoral.', [4, 1, 4, 1, 1, 2, 5, 1, 2, 5, 1, 0, 3], { decor: 'dc10' }),
  I('dc11', 'decoracao', 'Luminária de Lava', 'Luminária roxa com bolhas de lava pulsando.', 'Lava. Vibe de quarto de 2003. Aprovado.', [3, 1, 4, 1, 1, 2, 5, 1, 2, 5, 1, 0, 2], { decor: 'dc11' }),
  I('dc12', 'decoracao', 'Toca-Discos', 'Vitrola com disco e nota musical (sem som).', 'Vinil. Toca em silêncio absoluto, como manda a casa.', [3, 1, 4, 1, 1, 2, 5, 2, 2, 5, 1, 0, 3], { decor: 'dc12' }),
  I('dc13', 'decoracao', 'Pilha de Livros', 'Três livros e um troféu em cima.', 'Livros. Li todos. As capas.', [3, 1, 3, 1, 1, 2, 5, 1, 2, 5, 1, 0, 2], { decor: 'dc13' }),
  I('dc14', 'decoracao', 'Aquário Redondo', 'Aquário com um peixinho laranja nadando.', 'Peixinho. Não é lanche. Ainda.', [4, 1, 4, 1, 1, 2, 5, 2, 2, 5, 1, 0, 3], { decor: 'dc14' }),
  I('dc15', 'decoracao', 'Bandeira do Clube', 'Bandeira azul com a barbatana do JoJo, atrás dele.', 'Bandeira do clube. Sócio único, presidente vitalício.', [3, 1, 4, 1, 1, 2, 5, 2, 3, 5, 1, 0, 3], { decor: 'dc15' }),
];

// Animações especiais (permanentes): entram no repertório e tocam quando você pede.
const ANIMACOES = [
  I('la01', 'animacao', 'Moonwalk', 'Desliza para trás no passo mais famoso do mundo.', 'Moonwalk. A gravidade pediu autógrafo.', [4, 0, 3, 2, 2, 3, 3, 2, 2, 5, 3, 0, 2], { anim: 'la01' }),
  I('la02', 'animacao', 'Flexão de Um Braço', 'Série de flexões com um braço nas costas.', 'Um braço só. O outro está de férias.', [4, 0, 3, 2, 2, 3, 3, 1, 2, 5, 3, 0, 2], { anim: 'la02' }),
  I('la03', 'animacao', 'Dança do Robô', 'Movimentos travados em quadros, estilo robô.', 'Modo robô. Processando: você ainda não terminou.', [4, 0, 3, 2, 2, 3, 3, 1, 2, 5, 3, 0, 2], { anim: 'la03' }),
  I('la04', 'animacao', 'Capa de Revista', 'Sequência de poses com brilho, como numa sessão de capa.', 'Capa da revista. Edição especial: eu.', [4, 0, 4, 2, 2, 3, 3, 2, 2, 5, 3, 0, 2], { anim: 'la04' }),
  I('la05', 'animacao', 'Saudação Samurai', 'Reverência lenta e firme de samurai.', 'Reverência. Ao meu reflexo.', [3, 0, 3, 2, 2, 3, 3, 1, 2, 5, 3, 0, 2], { anim: 'la05' }),
  I('la06', 'animacao', 'Mortal para Trás', 'Pulo, giro completo para trás e aterrissagem.', 'Mortal. Dez do júri. O júri sou eu.', [5, 0, 4, 3, 2, 3, 3, 2, 2, 5, 3, 0, 2], { anim: 'la06' }),
  I('la07', 'animacao', 'Beatbox Silencioso', 'Mandíbula no ritmo e cabeça balançando (sem som).', 'Beatbox mudo. Tum, tss. Você ouviu na cabeça.', [3, 0, 3, 2, 2, 3, 3, 1, 2, 5, 3, 0, 2], { anim: 'la07' }),
  I('la08', 'animacao', 'Air Guitar', 'Solo de guitarra invisível com cabeçadas.', 'Guitarra invisível. Afinada como sempre.', [4, 0, 3, 2, 2, 3, 3, 1, 2, 5, 3, 0, 2], { anim: 'la08' }),
  I('la09', 'animacao', 'Desfile de Passarela', 'Atravessa a passarela, gira e faz pose final.', 'Passarela. Pisei, girei, humilhei.', [4, 0, 3, 2, 2, 3, 3, 1, 2, 5, 3, 0, 2], { anim: 'la09' }),
  I('la10', 'animacao', 'Meditação Flutuante', 'Flutua de olhos fechados com bolhas subindo.', 'Levitação. Chakra calibrado, ego também.', [4, 1, 4, 2, 2, 3, 3, 2, 2, 5, 3, 0, 2], { anim: 'la10' }),
  I('la11', 'animacao', 'Discurso de Vitória', 'Aponta para a plateia e ergue os braços.', 'Obrigado, obrigado. Eu sei. Eu sei.', [4, 0, 3, 2, 2, 3, 3, 1, 2, 5, 3, 0, 2], { anim: 'la11' }),
  I('la12', 'animacao', 'Pouso de Super-Herói', 'Cai do alto num pouso com o punho no chão.', 'Pouso de herói. Ruim pro joelho, ótimo pra foto.', [5, 0, 4, 3, 2, 3, 3, 2, 2, 5, 3, 0, 2], { anim: 'la12' }),
  I('la13', 'animacao', 'Dab', 'O dab, com a seriedade de quem sabe que é antigo.', 'Dab. Irônico. Ou não.', [3, 0, 3, 1, 1, 3, 3, 1, 2, 5, 2, 0, 2], { anim: 'la13' }),
  I('la14', 'animacao', 'Truque de Mágica', 'Some num estalo e reaparece com brilho.', 'Sumi. Voltei. Você piscou e perdeu.', [4, 0, 4, 3, 2, 3, 3, 2, 2, 5, 3, 0, 2], { anim: 'la14' }),
  I('la15', 'animacao', 'Rotina do Mr. Olympia', 'Sequência oficial de poses de fisiculturismo.', 'Duplo bíceps, dorsal, abdômen. Pode chorar.', [5, 0, 4, 3, 3, 3, 3, 2, 2, 5, 3, 0, 2], { anim: 'la15' }),
];

// Poderes: modificadores reais de jogo (temporários ou permanentes). Nenhum acelera o nível
// (o ritmo de XP combinado com o João não muda); mexem nas necessidades, nas JOJOcoins,
// nas missões, na sequência e no que a Central mostra.
const PODERES = [
  I('lp01', 'poder', 'Metabolismo Lento', 'Por 24 h a fome cai 40% mais devagar.', 'Metabolismo lento. Digiro até suas desculpas.', [3, 4, 2, 1, 1, 2, 2, 1, 1, 3, 1, 4, 0], { mod: 'fome', valor: 0.6, horas: 24 }),
  I('lp02', 'poder', 'Escamas Autolimpantes', 'Por 24 h a higiene cai pela metade da velocidade.', 'Escamas autolimpantes. Cheiro de vitória.', [3, 4, 2, 1, 1, 2, 2, 1, 1, 3, 1, 4, 0], { mod: 'higiene', valor: 0.5, horas: 24 }),
  I('lp03', 'poder', 'Imunidade de Tubarão', 'Por 24 h a saúde não cai, nem com fome ou sujeira.', 'Imunidade. Vírus nenhum encara um tubarão.', [3, 4, 2, 1, 1, 2, 2, 2, 1, 3, 1, 4, 0], { mod: 'saude', valor: 1, horas: 24 }),
  I('lp04', 'poder', 'Digestão Discreta', 'Por 24 h a digestão demora o dobro (menos sujeira no aquário).', 'Digestão discreta. Classe até no intestino.', [3, 4, 2, 1, 1, 2, 2, 1, 1, 3, 1, 3, 0], { mod: 'digestao', valor: 2, horas: 24 }),
  I('lp05', 'poder', 'Ímã de JOJOcoins', 'Por 3 h toda recompensa rende 25% a mais de JOJOcoins.', 'Ímã ligado. Dinheiro atrai dinheiro, e eu atraio tudo.', [4, 4, 2, 1, 1, 3, 2, 2, 2, 2, 1, 4, 0], { mod: 'moedas', valor: 1.25, horas: 3 }),
  I('lp06', 'poder', 'Sorte do Aquário', 'Por 24 h as sujeiras raras (radioativa, flamejante, dourada, lendária) aparecem 3× mais.', 'Sorte. Até meu cocô vai brilhar.', [4, 3, 2, 1, 1, 2, 2, 2, 2, 3, 2, 4, 0], { mod: 'sorte', valor: 3, horas: 24 }),
  I('lp07', 'poder', 'Troca de Missão', 'Troca uma missão do dia ainda não cumprida por outra.', 'Missão trocada. Covardia estratégica.', [3, 4, 1, 1, 1, 2, 2, 1, 1, 0, 1, 3, 0], { acao: 'trocarMissao' }),
  I('lp08', 'poder', 'Missão Extra', 'Acrescenta uma quarta missão ao dia de hoje.', 'Mais uma missão. Gosto de você ocupada.', [3, 3, 1, 1, 1, 2, 2, 1, 1, 0, 1, 3, 0], { acao: 'missaoExtra' }),
  I('lp09', 'poder', 'Escudo de Sequência', 'Se você ficar um dia sem abrir o JoJo, a sequência de dias não zera (uma vez).', 'Escudo. Sua constância agora tem seguro.', [4, 4, 1, 1, 1, 1, 1, 2, 2, 2, 1, 3, 0], { acao: 'escudo' }),
  I('lp10', 'poder', 'Bônus Ampliado', 'Por 24 h cabem 9 bônus de XP no dia em vez de 6 (vão para a coleção).', 'Bônus ampliado. Mais medalha no peito.', [3, 3, 1, 1, 1, 2, 2, 1, 1, 3, 1, 3, 1], { mod: 'bonus', valor: 9, horas: 24 }),
  I('lp11', 'poder', 'Humor Blindado', 'Por 24 h o humor do JoJo nunca fica abaixo de 60.', 'Humor blindado. Nem você me tira do sério. Talvez.', [3, 3, 2, 1, 1, 2, 2, 1, 1, 3, 1, 3, 0], { mod: 'humorMin', valor: 60, horas: 24 }),
  I('lp12', 'poder', 'Recuperação Express', 'Cuidado imediato sem esperar o intervalo: saúde +25, higiene +10.', 'Recuperação express. Pulei a fila do SUS do aquário.', [3, 4, 1, 1, 1, 2, 2, 1, 1, 0, 1, 3, 0], { acao: 'cuidadoExpress' }),
  I('lp13', 'poder', 'Sensor de Conquistas', 'Para sempre: a Coleção mostra quanto falta para cada conquista.', 'Sensor instalado. Agora você sabe o quanto está longe.', [3, 4, 2, 1, 2, 3, 4, 1, 2, 5, 1, 2, 1], { recurso: 'sensorConquistas' }),
  I('lp14', 'poder', 'Radar de Bônus', 'Para sempre: a Coleção mostra quais atividades ainda têm bônus hoje.', 'Radar de bônus. Caçar XP com método.', [3, 4, 2, 1, 2, 3, 4, 1, 2, 5, 1, 2, 1], { recurso: 'radarBonus' }),
  I('lp15', 'poder', 'Missões em Dobro', 'Por 24 h cada missão cumprida rende o dobro de JOJOcoins.', 'Missões em dobro. Agora vale a pena me obedecer.', [3, 3, 1, 1, 1, 2, 2, 1, 1, 3, 1, 3, 0], { mod: 'moedasMissao', valor: 2, horas: 24 }),
];

// Atividades e experiências (permanentes, com intervalo para não virar rotina).
const ATIVIDADES = [
  I('lt01', 'atividade', 'Sessão de Fotos', 'Três poses com flash e comentário do fotógrafo (ele mesmo).', 'Sessão de fotos. Luz a meu favor, como sempre.', [4, 1, 3, 3, 3, 2, 2, 1, 2, 5, 4, 1, 1], { roteiro: 'fotos', cooldownH: 2 }),
  I('lt02', 'atividade', 'Show de Stand-up', 'Três piadas do repertório do JoJo com reação da plateia (você).', 'Stand-up. Se ninguém rir, a culpa é da plateia.', [4, 1, 3, 3, 3, 2, 2, 1, 2, 5, 4, 1, 1], { roteiro: 'standup', cooldownH: 3 }),
  I('lt03', 'atividade', 'Treino Guiado', 'Circuito de 90 s: flexão, rosca, agachamento e alongamento. Humor +8 uma vez por dia.', 'Treino guiado. Eu faço, você assiste e se sente culpada.', [4, 2, 3, 3, 3, 2, 3, 1, 2, 5, 4, 2, 1], { roteiro: 'treino', cooldownH: 4 }),
  I('lt04', 'atividade', 'Desfile de Moda', 'Passarela com até quatro visuais seus em sequência.', 'Desfile. Cada look mais humilhante pra concorrência.', [5, 1, 4, 3, 4, 2, 2, 2, 2, 5, 4, 1, 2], { roteiro: 'desfile', cooldownH: 3 }),
  I('lt05', 'atividade', 'Karaokê Mudo', 'Microfone, notas musicais e a pior dublagem do aquário.', 'Karaokê sem som. Minha voz é perfeita porque ninguém ouve.', [4, 1, 3, 3, 3, 2, 2, 1, 2, 5, 4, 1, 1], { roteiro: 'karaoke', cooldownH: 3 }),
  I('lt06', 'atividade', 'Meditação Guiada', 'Um minuto de respiração com o JoJo. Humor +10 uma vez por dia.', 'Respira. Não, mais devagar. Não tão devagar.', [4, 3, 3, 2, 3, 2, 3, 1, 2, 5, 3, 2, 1], { roteiro: 'meditacao', cooldownH: 6 }),
  I('lt07', 'atividade', 'Noite de Cinema', 'O JoJo assiste a um filme imaginário e comenta.', 'Cinema. Eu comento o filme inteiro e você aguenta.', [4, 1, 3, 3, 3, 2, 2, 1, 2, 5, 4, 1, 1], { roteiro: 'cinema', cooldownH: 6 }),
  I('lt08', 'atividade', 'Maratona de Quiz', 'Abre direto o quiz do JoJo na conversa.', 'Quiz. Erra que eu anoto.', [3, 2, 2, 3, 3, 2, 3, 1, 1, 5, 3, 2, 0], { roteiro: 'quiz', cooldownH: 1 }),
  I('lt09', 'atividade', 'Aula de Ciência', 'Três curiosidades científicas com o JoJo de professor.', 'Aula de ciência. Anota, que cai na prova da vida.', [4, 3, 3, 3, 3, 2, 2, 1, 2, 5, 4, 1, 1], { roteiro: 'ciencia', cooldownH: 3 }),
  I('lt10', 'atividade', 'Caça às Bolhas', 'Abre o mini-jogo de bolhas em volta do JoJo.', 'Bolhas. Estoura antes que eu estoure.', [3, 1, 3, 3, 2, 2, 3, 1, 1, 5, 3, 2, 0], { roteiro: 'bolhas', cooldownH: 1 }),
];

// Cuidado e bem-estar (consumíveis).
const CUIDADOS = [
  I('lk01', 'cuidado', 'Sabonete de Algas', 'Higiene +35.', 'Sabonete de alga. Cheiro de mar, não de aquário.', [3, 4, 2, 1, 1, 1, 3, 1, 1, 1, 1, 2, 0], { higiene: 35 }),
  I('lk02', 'cuidado', 'Spa Completo', 'Higiene vai a 100, humor +20, saúde +10.', 'Spa. Máscara de argila e ego hidratado.', [5, 4, 3, 1, 1, 1, 2, 2, 1, 1, 2, 2, 0], { higiene: 100, humor: 20, saude: 10, fx: 'bolhas' }),
  I('lk03', 'cuidado', 'Primeiros Socorros', 'Saúde +35.', 'Curativo. Sobrevivi a você de novo.', [3, 4, 2, 1, 1, 1, 2, 1, 1, 1, 1, 2, 0], { saude: 35 }),
  I('lk04', 'cuidado', 'Vitaminas do Mar', 'Saúde +15, humor +5.', 'Vitaminas. Cápsula de disciplina.', [3, 3, 2, 1, 1, 1, 3, 1, 1, 1, 1, 2, 0], { saude: 15, humor: 5 }),
  I('lk05', 'cuidado', 'Massagem nas Barbatanas', 'Humor +25.', 'Massagem. Mais forte. Isso. Não para.', [4, 3, 2, 1, 1, 1, 3, 1, 1, 1, 1, 2, 0], { humor: 25 }),
  I('lk06', 'cuidado', 'Escova de Dentes Turbo', 'Higiene +20 e brilho nos dentes.', 'Trezentos dentes escovados. Um por um.', [3, 3, 3, 1, 1, 1, 3, 1, 1, 1, 1, 2, 0], { higiene: 20, fx: 'brilhoDente' }),
  I('lk07', 'cuidado', 'Soneca Restauradora', 'Saúde +20, humor +10 (de dia ele medita em vez de dormir).', 'Soneca. Dez minutos que valem uma noite.', [3, 3, 2, 1, 1, 1, 2, 1, 1, 1, 1, 2, 0], { saude: 20, humor: 10 }),
  I('lk08', 'cuidado', 'Hidratante de Escamas', 'Higiene +25, saúde +5.', 'Hidratante. Escama seca é coisa de peixe amador.', [3, 3, 2, 1, 1, 1, 3, 1, 1, 1, 1, 2, 0], { higiene: 25, saude: 5 }),
  I('lk09', 'cuidado', 'Aromaterapia Marinha', 'Humor +15, higiene +10.', 'Aromaterapia. Cheiro de maresia e superioridade.', [3, 3, 2, 1, 1, 1, 3, 1, 1, 1, 1, 2, 0], { humor: 15, higiene: 10 }),
  I('lk10', 'cuidado', 'Desinfetante de Aquário', 'Limpa todas as sujeiras de uma vez (sem XP das limpezas) e higiene +10.', 'Desinfetante. Limpeza nuclear, cheiro de hospital.', [3, 4, 2, 1, 1, 1, 2, 1, 1, 1, 1, 2, 0], { higiene: 10, limpaTudo: true }),
];

// Colecionáveis: peças únicas na Estante da Central, cada uma com história; completar os
// dez dá uma conquista.
const COLECIONAVEIS = [
  I('lx01', 'colecionavel', 'Dente de Megalodon', 'Fóssil de um dente do meu bisavô. Tamanho família.', 'Dente do bisavô. A família toda tinha sorriso assim.', [3, 0, 4, 1, 2, 1, 1, 3, 3, 5, 1, 0, 5], { lore: 'Encontrado no fundo do Pacífico. Dizem que ainda morde.' }),
  I('lx02', 'colecionavel', 'Figurinha Holográfica do JoJo', 'A figurinha mais rara do álbum: eu, brilhando.', 'Holográfica. A mais difícil do álbum, claro.', [4, 0, 4, 1, 2, 1, 1, 3, 4, 5, 1, 0, 5], { lore: 'Tiragem limitada a uma unidade. Esta.' }),
  I('lx03', 'colecionavel', 'Concha Dourada', 'Concha banhada a ouro de praia que não existe no mapa.', 'Concha dourada. Encosta no ouvido: só elogios.', [3, 0, 4, 1, 2, 1, 1, 3, 3, 5, 1, 0, 5], { lore: 'Encosta no ouvido e escuta o mar dizendo meu nome.' }),
  I('lx04', 'colecionavel', 'Garrafa com Mensagem', 'Garrafa antiga com um bilhete enrolado dentro.', 'Garrafa com mensagem. Diz "vai trabalhar". Eu que escrevi.', [3, 0, 3, 1, 2, 1, 1, 2, 3, 5, 1, 0, 5], { lore: 'O bilhete diz: "quem achar, vai trabalhar". Letra do JoJo.' }),
  I('lx05', 'colecionavel', 'Medalha de Atlântida', 'Medalha cunhada na cidade perdida.', 'Atlântida. Afundou, mas a medalha eu salvei.', [3, 0, 4, 1, 2, 1, 1, 3, 3, 5, 1, 0, 5], { lore: 'Cunhada antes do naufrágio. O rosto na medalha é suspeito de ser o meu.' }),
  I('lx06', 'colecionavel', 'Medalha Olímpica de Natação', 'Ouro nos 100 m livres, categoria tubarão.', 'Ouro olímpico. Os outros competidores eram sardinhas.', [3, 0, 4, 1, 2, 1, 1, 3, 3, 5, 1, 0, 5], { lore: 'Prova de 100 metros. Recorde mundial. Os adversários fugiram.' }),
  I('lx07', 'colecionavel', 'Fóssil de Trilobita', 'Fóssil de 400 milhões de anos. Mais velho que meus planos.', 'Trilobita. Mais antigo que a sua lista de pendências. Por pouco.', [3, 0, 3, 1, 2, 1, 1, 3, 3, 5, 1, 0, 5], { lore: 'Viveu 270 milhões de anos sem precisar de produtividade.' }),
  I('lx08', 'colecionavel', 'Pérola Negra', 'Pérola negra rara, brilho de petróleo.', 'Pérola negra. Combina com minha alma.', [3, 0, 4, 1, 2, 1, 1, 4, 3, 5, 1, 0, 5], { lore: 'Uma em dez mil ostras. Eu comi as outras 9.999.' }),
  I('lx09', 'colecionavel', 'Halter de Ouro em Miniatura', 'Réplica de troféu de campeonato de fisiculturismo.', 'Halter de ouro. Pesa pouco. Simbolicamente pesa tudo.', [3, 0, 4, 1, 2, 1, 1, 3, 3, 5, 1, 0, 5], { lore: 'Prêmio do Campeonato Abissal de Fisiculturismo. Categoria: todas.' }),
  I('lx10', 'colecionavel', 'Bússola do Capitão', 'Bússola de latão que sempre aponta para o JoJo.', 'Bússola. Aponta pra mim. Funciona perfeitamente.', [3, 0, 4, 1, 2, 1, 1, 3, 3, 5, 1, 0, 5], { lore: 'Norte magnético descontinuado. Agora o norte sou eu.' }),
];

// Raros, lendários e experiências especiais.
const LENDARIOS = [
  I('ll01', 'lendario', 'Aura Lendária', 'Aura dourada pulsando atrás do JoJo. Liga e desliga quando quiser.', 'Aura. Agora você vê o que eu sempre senti.', [5, 0, 5, 1, 2, 3, 5, 5, 5, 5, 2, 0, 5], { recurso: 'aura' }),
  I('ll02', 'lendario', 'Trono de Ouro', 'Trono de ouro com veludo vermelho atrás do JoJo.', 'Trono. Finalmente o mobiliário à minha altura.', [5, 0, 5, 1, 2, 2, 5, 5, 5, 5, 2, 0, 5], { decor: 'dl05' }),
  I('ll03', 'lendario', 'Forma Megalodon', 'Por 30 min o JoJo vira um megalodon: maior, mais largo e com a pele antiga.', 'Megalodon. Volta à forma original da família.', [5, 0, 5, 2, 2, 3, 2, 5, 5, 2, 4, 1, 5], { recurso: 'megalodon', minutos: 30 }),
  I('ll04', 'lendario', 'Festa no Desktop', 'Festa de 30 s: dança, confete e chuva de JOJOcoins. Uma vez a cada 20 h.', 'Festa. Convidados: eu. Organização: eu. Atração: eu.', [5, 0, 5, 4, 3, 3, 2, 5, 5, 5, 5, 0, 5], { roteiro: 'festa', cooldownH: 20 }),
  I('ll05', 'lendario', 'Chuva de JOJOcoins', 'JOJOcoins douradas caem em volta do JoJo enquanto ele comemora. Uma vez a cada 12 h.', 'Chuva de dinheiro. Não é seu, é decoração.', [5, 0, 5, 3, 2, 2, 2, 5, 5, 5, 4, 0, 5], { roteiro: 'chuva', cooldownH: 12 }),
  I('ll06', 'lendario', 'Rastro de Brilho', 'Quando anda, o JoJo deixa um rastro de brilhos dourados. Liga e desliga.', 'Rastro de brilho. Por onde eu passo, fica a lenda.', [5, 0, 4, 1, 2, 3, 5, 5, 5, 5, 2, 0, 5], { recurso: 'rastro' }),
  I('ll07', 'lendario', 'Holofote de Campeão', 'A cada nível ou conquista, holofote e aura por 12 s com pose de campeão.', 'Holofote. Toda vitória merece iluminação adequada.', [5, 0, 4, 2, 2, 2, 3, 5, 5, 5, 3, 0, 5], { recurso: 'holofote' }),
  I('ll08', 'lendario', 'Cofre do Tubarão', 'Painel de estatísticas da sua economia com o monte de JOJOcoins desenhado pelo seu saldo.', 'Cofre. Contabilidade é o meu cardio mental.', [3, 3, 4, 2, 3, 2, 4, 5, 5, 5, 2, 1, 5], { recurso: 'cofre' }),
  I('ll09', 'lendario', 'Tubarão Dourado', 'Visual secreto: pele de ouro, capa vermelha e coroa.', 'Dourado. Agora o ouro sou eu e a moeda que se cuide.', [5, 0, 5, 1, 3, 2, 3, 5, 5, 5, 3, 0, 5], { look: 'll09' }, { contextos: ['conquista', 'celebracao', 'nivel'] }),
  I('ll10', 'lendario', 'Estátua do Campeão', 'Estátua dourada do tubarão da JOJOcoin num pedestal, ao lado do JoJo.', 'Estátua. Fizeram justiça, finalmente.', [5, 0, 5, 1, 2, 2, 5, 5, 5, 5, 2, 0, 5], { decor: 'dl10' }),
];

const PREFIXO_CAT = { visual: 'lv', comida: 'lc', objeto: 'ob', decoracao: 'dc', animacao: 'la', poder: 'lp', atividade: 'lt', cuidado: 'lk', colecionavel: 'lx', lendario: 'll' };

// Consumíveis: compra soma unidades no inventário; o resto é permanente (compra única).
const CONSUMIVEL = new Set(['comida', 'cuidado']);
const CONSUMIVEL_PODER = new Set(['mod', 'acao']);

function montar(item) {
  const indice = indiceValor(item.v);
  const horas = horasDoIndice(indice);
  const preco = redondo(horas * TAXA_HORA);
  const raridade = raridadeDasHoras(preco / TAXA_HORA);
  const consumivel = CONSUMIVEL.has(item.tipo) || (item.tipo === 'poder' && !item.efeito.recurso) || (item.tipo === 'lendario' && item.efeito.recurso === 'megalodon');
  return Object.freeze({ ...item, categoria: item.tipo, indice, horas: Math.round(horas * 100) / 100, preco, raridade: raridade.id, consumivel, maxEstoque: consumivel ? 99 : 1, justificativa: justificativa(item.v), prefixo: PREFIXO_CAT[item.tipo] });
}

export const ITENS = Object.freeze([...VISUAIS, ...COMIDAS, ...OBJETOS, ...DECORACOES, ...ANIMACOES, ...PODERES, ...ATIVIDADES, ...CUIDADOS, ...COLECIONAVEIS, ...LENDARIOS].map(montar));
export const ITEM_POR_ID = new Map(ITENS.map((it) => [it.id, it]));
export const item = (id) => ITEM_POR_ID.get(id) || null;
void CONSUMIVEL_PODER;
