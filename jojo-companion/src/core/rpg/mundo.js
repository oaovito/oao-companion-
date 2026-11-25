// O universo do JoJo é o computador da Emanuele (0.48). Regiões = categorias
// reais de aplicativo (só a categoria do executável, quando a percepção está
// ligada; nada de título, tela ou teclado). Aqui ficam os dados: regiões,
// materiais, artefatos, receitas de fabricação e níveis de vínculo.

export const RARIDADES = Object.freeze([
  { id: 'comum', nome: 'Comum', peso: 60, mult: 1 },
  { id: 'incomum', nome: 'Incomum', peso: 25, mult: 1.6 },
  { id: 'raro', nome: 'Raro', peso: 10, mult: 2.5 },
  { id: 'epico', nome: 'Épico', peso: 4, mult: 4 },
  { id: 'lendario', nome: 'Lendário', peso: 1, mult: 7 },
]);
export const ORDEM_RARIDADE = RARIDADES.map((r) => r.id);

// tipo do desafio → atributo e efeito de sucesso que pesam.
export const DESAFIOS = Object.freeze({
  fisico: { atributo: 'forca', efeito: 'sucessoFisico', nome: 'desafio físico' },
  mental: { atributo: 'inteligencia', efeito: 'sucessoMental', nome: 'desafio intelectual' },
  sobrevivencia: { atributo: 'resistencia', efeito: 'sucessoSobrevivencia', nome: 'desafio de sobrevivência' },
  social: { atributo: 'carisma', efeito: 'sucessoSocial', nome: 'negociação' },
  furtivo: { atributo: 'agilidade', efeito: 'fuga', nome: 'fuga' },
});

const R = (o) => Object.freeze(o);
// categoria: categoria real do executável em primeiro plano (worker de tela cheia).
export const REGIOES = Object.freeze([
  R({ id: 'recife', nome: 'Recife da Área de Trabalho', categoria: 'outro', nivel: 1, dificuldade: 1, duracao: 20, desafio: 'fisico', materiais: ['escama', 'alga'], anim: 'nadarCirculos', desc: 'Ícones esquecidos, papéis de parede e um atalho que ninguém abre desde 2023.' }),
  R({ id: 'navegador', nome: 'Oceano da Rede', categoria: 'navegador', nivel: 3, dificuldade: 2, duracao: 30, desafio: 'furtivo', materiais: ['coral', 'pixelDourado'], anim: 'olharRedor', desc: 'Correntes de abas abertas, cookies à deriva e pop-ups predadores.' }),
  R({ id: 'escritorio', nome: 'Arquipélago dos Documentos', categoria: 'escritorio', nivel: 5, dificuldade: 2, duracao: 30, desafio: 'mental', materiais: ['papiro', 'alga'], anim: 'lendo', desc: 'Ilhas de planilhas, PDFs náufragos e o temido "versão final (3)".' }),
  R({ id: 'codigo', nome: 'Fossa do Código', categoria: 'codigo', nivel: 8, dificuldade: 3, duracao: 40, desafio: 'mental', materiais: ['fragmentoCodigo', 'cristalCache'], anim: 'digitando', desc: 'Onde bugs bioluminescentes vivem e ponto-e-vírgula faltando assombra.' }),
  R({ id: 'video', nome: 'Cine-Abismo', categoria: 'video', nivel: 10, dificuldade: 3, duracao: 40, desafio: 'social', materiais: ['perola', 'pixelDourado'], anim: 'cafeOlhando', desc: 'Telas gigantes no escuro, maratonas e o "só mais um episódio".' }),
  R({ id: 'jogo', nome: 'Arena dos Jogos', categoria: 'jogo', nivel: 12, dificuldade: 4, duracao: 45, desafio: 'fisico', materiais: ['moedaPixel', 'cristalCache'], anim: 'modoFera', desc: 'Chefões, respawns e a honra de quem não dá rage quit.' }),
  R({ id: 'launcher', nome: 'Porto das Lojas', categoria: 'launcher', nivel: 15, dificuldade: 3, duracao: 35, desafio: 'social', materiais: ['moedaPixel', 'coral'], anim: 'apostar', desc: 'Mercadores de promoções, bibliotecas infinitas de jogos não jogados.' }),
  R({ id: 'lixeira', nome: 'Cemitério da Lixeira', categoria: null, nivel: 20, dificuldade: 4, duracao: 50, desafio: 'sobrevivencia', materiais: ['sucata', 'fragmentoCodigo'], anim: 'espiarUmOlho', desc: 'Arquivos apagados que ainda sussurram. Ninguém esvazia isso aqui.' }),
  R({ id: 'nuvem', nome: 'Corrente da Nuvem', categoria: null, nivel: 30, dificuldade: 5, duracao: 60, desafio: 'furtivo', materiais: ['vapor', 'cristalCache'], anim: 'flutuar', desc: 'Sincronizações eternas e fotos de 2016 flutuando para sempre.' }),
  R({ id: 'kernel', nome: 'Abismo do Kernel', categoria: null, nivel: 50, dificuldade: 7, duracao: 75, desafio: 'sobrevivencia', materiais: ['nucleo', 'sucata'], anim: 'aura', desc: 'Onde o sistema respira. Um erro aqui e é tela azul.' }),
  R({ id: 'bios', nome: 'Trincheira do BIOS', categoria: null, nivel: 80, dificuldade: 8, duracao: 90, desafio: 'mental', materiais: ['nucleo', 'runaAntiga'], anim: 'pensando', desc: 'Antes de tudo existir, havia o BIOS. E um bipe.' }),
  R({ id: 'megalodon', nome: 'Santuário do Megalodon', categoria: null, nivel: 120, dificuldade: 10, duracao: 120, desafio: 'fisico', materiais: ['denteAncestral', 'runaAntiga'], anim: 'evolucao', desc: 'O lugar onde o ancestral do JoJo dorme. Ou finge.' }),
]);
export const REGIAO_POR_ID = new Map(REGIOES.map((r) => [r.id, r]));
export const REGIAO_POR_CATEGORIA = new Map(REGIOES.filter((r) => r.categoria).map((r) => [r.categoria, r]));

// Eventos do meio da expedição: a escolha muda o desafio (e a narrativa).
export const ENCRUZILHADAS = Object.freeze([
  { id: 'popup', txt: 'Um pop-up predador bloqueou a passagem.', opcoes: [{ id: 'a', txt: 'Morder o X', desafio: 'fisico' }, { id: 'b', txt: 'Contornar pelas abas', desafio: 'furtivo' }] },
  { id: 'enigma', txt: 'Uma porta pede a senha. Tem uma charada escrita em Comic Sans.', opcoes: [{ id: 'a', txt: 'Resolver a charada', desafio: 'mental' }, { id: 'b', txt: 'Arrombar no ombro', desafio: 'fisico' }] },
  { id: 'mercador', txt: 'Um mercador de cookies oferece um atalho em troca de dados.', opcoes: [{ id: 'a', txt: 'Negociar sem dar nada', desafio: 'social' }, { id: 'b', txt: 'Recusar e seguir nadando', desafio: 'sobrevivencia' }] },
  { id: 'corrente', txt: 'Uma corrente de atualização puxa tudo para o fundo.', opcoes: [{ id: 'a', txt: 'Nadar contra a corrente', desafio: 'sobrevivencia' }, { id: 'b', txt: 'Se esconder atrás de um ícone', desafio: 'furtivo' }] },
  { id: 'bug', txt: 'Um bug bioluminescente gigante encara o JoJo.', opcoes: [{ id: 'a', txt: 'Encarar de volta e flexionar', desafio: 'fisico' }, { id: 'b', txt: 'Debugar com calma', desafio: 'mental' }] },
  { id: 'npc', txt: 'Um ícone de impressora jura que sabe onde fica um tesouro.', opcoes: [{ id: 'a', txt: 'Conversar e arrancar a verdade', desafio: 'social' }, { id: 'b', txt: 'Ignorar: impressora sempre mente', desafio: 'mental' }] },
]);

export const MATERIAIS = Object.freeze({
  escama: 'Escama solta', alga: 'Alga de pixel', coral: 'Coral de cache', pixelDourado: 'Pixel dourado', papiro: 'Papiro de PDF',
  fragmentoCodigo: 'Fragmento de código', cristalCache: 'Cristal de cache', perola: 'Pérola de streaming', moedaPixel: 'Moeda de pixel',
  sucata: 'Sucata digital', vapor: 'Vapor de nuvem', nucleo: 'Núcleo de kernel', runaAntiga: 'Runa do BIOS', denteAncestral: 'Dente ancestral',
});
export const MATERIAIS_COMUNS = ['escama', 'alga', 'coral', 'papiro', 'sucata'];

const A = (o) => Object.freeze({ efeito: {}, atributo: {}, ...o });
// Artefatos: achados nas expedições e segredos; equipados dão efeito permanente pequeno.
export const ARTEFATOS = Object.freeze([
  A({ id: 'iconeFossil', nome: 'Ícone Fóssil', raridade: 'comum', regiao: 'recife', atributo: { percepcao: 1 }, desc: 'Um atalho do Windows XP petrificado.' }),
  A({ id: 'papelDeParede', nome: 'Papel de Parede Ancestral', raridade: 'comum', regiao: 'recife', atributo: { sabedoria: 1 }, desc: 'Aquela colina verde. Todo mundo lembra.' }),
  A({ id: 'cursorQuebrado', nome: 'Cursor Quebrado', raridade: 'incomum', regiao: 'recife', atributo: { agilidade: 2 }, desc: 'Ainda aponta para o lado errado.' }),
  A({ id: 'abaPerdida', nome: 'Aba Perdida', raridade: 'comum', regiao: 'navegador', atributo: { percepcao: 1 }, desc: 'Aberta desde março. Ninguém lembra por quê.' }),
  A({ id: 'cookieFossil', nome: 'Cookie Fossilizado', raridade: 'incomum', regiao: 'navegador', atributo: { sorte: 2 }, desc: 'Aceitou todos os termos em 2019.' }),
  A({ id: 'captchaDourado', nome: 'Captcha Dourado', raridade: 'raro', regiao: 'navegador', efeito: { sucessoMental: 0.03 }, desc: 'Prova que o JoJo não é um robô. Mentira.' }),
  A({ id: 'clipesDoOffice', nome: 'Clipe Conselheiro', raridade: 'incomum', regiao: 'escritorio', atributo: { sabedoria: 2 }, desc: '"Parece que você está escrevendo uma carta."' }),
  A({ id: 'planilhaInfinita', nome: 'Planilha Infinita', raridade: 'raro', regiao: 'escritorio', efeito: { xpMissao: 0.02 }, desc: 'A coluna ZZ existe e ela tem fórmula.' }),
  A({ id: 'versaoFinal', nome: '"versão final (3).docx"', raridade: 'comum', regiao: 'escritorio', atributo: { disciplina: 1 }, desc: 'Não é a final. Nunca é.' }),
  A({ id: 'pontoEVirgula', nome: 'Ponto-e-Vírgula Perdido', raridade: 'incomum', regiao: 'codigo', atributo: { inteligencia: 2 }, desc: 'Quebrou um sistema inteiro. Sente orgulho.' }),
  A({ id: 'patoDeBorracha', nome: 'Pato de Borracha Debugger', raridade: 'raro', regiao: 'codigo', efeito: { sucessoMental: 0.04 }, desc: 'Ouve tudo, julga em silêncio.' }),
  A({ id: 'stackOverflow', nome: 'Pergunta Duplicada', raridade: 'comum', regiao: 'codigo', atributo: { sabedoria: 1 }, desc: 'Marcada como duplicada de uma de 2011.' }),
  A({ id: 'pipocaEterna', nome: 'Pipoca Eterna', raridade: 'incomum', regiao: 'video', efeito: { tedioSobe: 0.03 }, desc: 'Nunca acaba. Nunca esfria.' }),
  A({ id: 'controleSemPilha', nome: 'Controle Sem Pilha', raridade: 'comum', regiao: 'video', atributo: { carisma: 1 }, desc: 'Funciona se bater duas vezes.' }),
  A({ id: 'legendaDessincronizada', nome: 'Legenda Fora de Sincronia', raridade: 'raro', regiao: 'video', atributo: { percepcao: 3 }, desc: 'Sempre dois segundos à frente. Spoiler garantido.' }),
  A({ id: 'cartuchoSoprado', nome: 'Cartucho Soprado', raridade: 'incomum', regiao: 'jogo', atributo: { sorte: 2 }, desc: 'Soprou, funcionou. Ciência.' }),
  A({ id: 'trofeuPlatina', nome: 'Troféu de Platina', raridade: 'epico', regiao: 'jogo', efeito: { xpJogo: 0.06 }, atributo: { forca: 3 }, desc: '100% de conquistas num jogo que ninguém conhece.' }),
  A({ id: 'savePoint', nome: 'Save Point Portátil', raridade: 'raro', regiao: 'jogo', atributo: { vitalidade: 3 }, desc: 'Cura tudo. Só não salva o progresso da vida real.' }),
  A({ id: 'cupomExpirado', nome: 'Cupom Expirado', raridade: 'comum', regiao: 'launcher', atributo: { carisma: 1 }, desc: '90% de desconto. Ontem.' }),
  A({ id: 'bibliotecaIntocada', nome: 'Jogo Nunca Aberto', raridade: 'incomum', regiao: 'launcher', efeito: { moedasExp: 0.03 }, desc: 'Comprado na promoção, nunca instalado.' }),
  A({ id: 'chaveDeAtivacao', nome: 'Chave de Ativação Rara', raridade: 'raro', regiao: 'launcher', efeito: { sorteLoot: 0.02 }, desc: 'XXXXX-XXXXX-JOJOO.' }),
  A({ id: 'arquivoFantasma', nome: 'Arquivo Fantasma', raridade: 'incomum', regiao: 'lixeira', atributo: { percepcao: 2 }, desc: 'Foi apagado, mas ainda ocupa 4 GB de saudade.' }),
  A({ id: 'tmpEterno', nome: 'Arquivo .tmp Imortal', raridade: 'raro', regiao: 'lixeira', atributo: { resistencia: 3 }, desc: 'Sobreviveu a três formatações.' }),
  A({ id: 'cartaDeAmorDeletada', nome: 'Rascunho Nunca Enviado', raridade: 'epico', regiao: 'lixeira', efeito: { chanceSegredo: 0.1 }, desc: 'O JoJo não leu. Mentira. Leu e riu.' }),
  A({ id: 'fotoDe2016', nome: 'Foto de 2016', raridade: 'incomum', regiao: 'nuvem', atributo: { carisma: 2 }, desc: 'Filtro de cachorro. Ninguém precisa ver.' }),
  A({ id: 'sincronizacaoPerfeita', nome: 'Sincronização Perfeita', raridade: 'epico', regiao: 'nuvem', efeito: { duracaoExp: 0.05 }, desc: 'Nenhum conflito. Um milagre registrado.' }),
  A({ id: 'nuvemDeChuva', nome: 'Nuvem de Chuva Engarrafada', raridade: 'raro', regiao: 'nuvem', atributo: { vitalidade: 3 }, desc: 'Hidratação premium.' }),
  A({ id: 'processoZumbi', nome: 'Processo Zumbi', raridade: 'raro', regiao: 'kernel', atributo: { resistencia: 3 }, desc: 'Morto, mas ainda consome 2% de CPU.' }),
  A({ id: 'nucleoQuente', nome: 'Núcleo a 95 °C', raridade: 'epico', regiao: 'kernel', atributo: { forca: 5 }, desc: 'Fritou um ovo. E um GPU.' }),
  A({ id: 'telaAzulDomada', nome: 'Tela Azul Domada', raridade: 'lendario', regiao: 'kernel', efeito: { resistenciaDoenca: 0.15, sucessoSobrevivencia: 0.05 }, desc: 'Quem olha para ela e sorri não tem mais medo de nada.' }),
  A({ id: 'bipeAncestral', nome: 'Bipe Ancestral', raridade: 'epico', regiao: 'bios', atributo: { sabedoria: 5 }, desc: 'Um bipe longo, dois curtos. Significa respeito.' }),
  A({ id: 'pilhaCmos', nome: 'Pilha CMOS', raridade: 'raro', regiao: 'bios', atributo: { disciplina: 4 }, desc: 'Guarda a hora certa desde sempre.' }),
  A({ id: 'runaDoBoot', nome: 'Runa do Boot', raridade: 'lendario', regiao: 'bios', efeito: { xpEstudo: 0.05, xpFoco: 0.05 }, desc: 'F12 gravado em pedra.' }),
  A({ id: 'denteDoMegalodon', nome: 'Dente do Megalodon', raridade: 'lendario', regiao: 'megalodon', atributo: { forca: 8, resistencia: 5 }, desc: 'Do tamanho do JoJo. Herança de família.' }),
  A({ id: 'coroaAbissal', nome: 'Coroa Abissal', raridade: 'lendario', regiao: 'megalodon', efeito: { sorteLoot: 0.04, desfechoBom: 0.05 }, desc: 'Só serve na cabeça de quem nunca pulou dia de perna.' }),
  A({ id: 'escamaPrimordial', nome: 'Escama Primordial', raridade: 'epico', regiao: 'megalodon', atributo: { vitalidade: 5 }, desc: 'Brilha quando alguém fala em dieta.' }),
  // Únicos de missões encadeadas e segredos (não caem no sorteio).
  A({ id: 'diarioDoMegalodon', nome: 'Diário do Megalodon', raridade: 'lendario', regiao: null, unico: true, efeito: { chanceSegredo: 0.15, escolhaSabia: 0.05 }, desc: 'Sete páginas, uma lenda inteira.' }),
  A({ id: 'pixelPerdido', nome: 'O Pixel Perdido', raridade: 'epico', regiao: null, unico: true, atributo: { percepcao: 5 }, desc: 'Um pixel morto que voltou à vida.' }),
  A({ id: 'halterDeOuro', nome: 'Halter de Ouro', raridade: 'epico', regiao: null, unico: true, atributo: { forca: 4, disciplina: 2 }, desc: 'Prêmio da Academia Abissal.' }),
  A({ id: 'livroAfundado', nome: 'Livro Afundado', raridade: 'epico', regiao: null, unico: true, atributo: { inteligencia: 4, sabedoria: 2 }, desc: 'Molhado, mas ainda legível.' }),
  A({ id: 'panelaDoAbismo', nome: 'Panela do Abismo', raridade: 'epico', regiao: null, unico: true, efeito: { comidaBonus: 0.1 }, desc: 'Tudo que sai dela é proteína.' }),
]);
export const ARTEFATO_POR_ID = new Map(ARTEFATOS.map((a) => [a.id, a]));

// Fabricação (alquimia): materiais → poções (buffs temporários) e amuletos.
export const RECEITAS = Object.freeze([
  { id: 'pocaoFolego', nome: 'Poção de Fôlego', nivel: 4, custo: { alga: 2, escama: 1 }, buff: { energiaFixa: 1 }, horas: 1, uso: { energia: 35 }, desc: '+35 de energia e energia travada por 1 h.' },
  { id: 'aguaDeCoral', nome: 'Água de Coral', nivel: 4, custo: { coral: 2, alga: 1 }, uso: { sede: 45 }, desc: '+45 de sede saciada.' },
  { id: 'elixirFoco', nome: 'Elixir de Foco', nivel: 8, custo: { papiro: 2, cristalCache: 1 }, buff: { xpFoco: 0.15, tedioSobe: 0.5 }, horas: 2, desc: 'Foco rende +15% de XP e o tédio quase não sobe por 2 h.' },
  { id: 'tonicoEscamas', nome: 'Tônico de Escamas', nivel: 10, custo: { escama: 3, perola: 1 }, uso: { curar: 1 }, desc: 'Cura uma doença.' },
  { id: 'amuletoSorte', nome: 'Amuleto da Sorte', nivel: 15, custo: { pixelDourado: 2, moedaPixel: 2 }, buff: { sorteLoot: 0.05, desfechoBom: 0.05 }, horas: 24, desc: 'Achados raros e desfechos bons mais prováveis por 24 h.' },
  { id: 'oleoDeBug', nome: 'Óleo de Bug', nivel: 20, custo: { fragmentoCodigo: 3, sucata: 2 }, buff: { sucessoMental: 0.1 }, horas: 6, desc: 'Desafios intelectuais +10% por 6 h.' },
  { id: 'bussolaNuvem', nome: 'Bússola de Nuvem', nivel: 30, custo: { vapor: 2, cristalCache: 2 }, buff: { duracaoExp: 0.25 }, horas: 12, desc: 'Expedições 25% mais curtas por 12 h.' },
  { id: 'elixirAncestral', nome: 'Elixir Ancestral', nivel: 60, custo: { nucleo: 2, runaAntiga: 1, denteAncestral: 1 }, buff: { xpMissao: 0.2, xpCuidado: 0.2 }, horas: 3, desc: 'Missões e cuidados rendem +20% de XP por 3 h.' },
]);
export const RECEITA_POR_ID = new Map(RECEITAS.map((r) => [r.id, r]));

// Relacionamento (vínculo) com a Emanuele: nunca romântico (ela é a mulher do João).
export const NIVEIS_VINCULO = Object.freeze([
  'Visita no aquário', 'Conhecida de vista', 'Colega de aquário', 'Companhia tolerada', 'Parceira de cardápio',
  'Aliada de foco', 'Parceira de treino', 'Confidente de sarcasmo', 'Cúmplice de piada', 'Dupla de missão',
  'Guardiã do aquário', 'Comandante da rotina', 'Sócia do recife', 'Lenda da convivência', 'Família de aquário',
  'Escudo contra a preguiça', 'Parceira de expedição', 'Veterana do recife', 'Inseparável (do jeito dele)', 'Lenda eterna do aquário',
]);
export const limiarVinculo = (n) => 30 * (n - 1) * n; // n = 1..20
