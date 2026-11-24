// Eventos secretos do JoJo (0.48). Nada disso aparece em menu antes de
// acontecer: a coleção mostra "???" até a descoberta. Elegibilidade por
// horário, data, clima, nível, vínculo, app em primeiro plano, histórico e
// sorte; controle de repetição (cooldown por evento, intervalo global, teto
// por dia); nunca no Modo Trabalho, foco ou tela cheia (o serviço confere).
//
// chance: probabilidade por checagem elegível (o motor checa a cada ~10 min ativos).
// desfechos: sorteados por peso (Sorte e efeitos aumentam o peso dos "bom: true").

const S = (o) => Object.freeze({ cd: 72, chance: 0.02, unico: false, ...o });
const D = (o) => Object.freeze({ peso: 1, xp: 0, moedas: 0, ...o });

export const SEGREDOS = Object.freeze([
  // ---- horário
  S({ id: 'meiaNoite', nome: 'Badalada da Meia-Noite', cond: { hora: [0, 1] }, chance: 0.25, anim: 'fantasma', desfechos: [D({ txt: 'Meia-noite. O JoJo ouviu um "plim" vindo da lixeira. Fingiu que não.', xp: 15, bom: true }), D({ txt: 'Meia-noite. Um ícone piscou sozinho. O JoJo flexionou para assustar. Funcionou.', xp: 10 })] }),
  S({ id: 'horaDoCafe', nome: 'Café das 15h', cond: { hora: [15, 16] }, chance: 0.04, anim: 'cafeOlhando', desfechos: [D({ txt: 'Três da tarde: o JoJo achou café esquecido no recife. Energia de volta.', xp: 8, vida: { energia: 15 }, bom: true })] }),
  S({ id: 'auroraDoRecife', nome: 'Aurora do Recife', cond: { hora: [6, 7] }, chance: 0.08, anim: 'espreguicar', desfechos: [D({ txt: 'Seis da manhã. O recife brilhou laranja por um segundo. O JoJo viu e não contou pra ninguém. Contou pra você.', xp: 12, fragmento: true, bom: true })] }),
  S({ id: 'horaEspelhada', nome: 'Hora Espelhada', cond: { horaMinuto: ['11:11', '22:22', '12:21', '21:12'] }, chance: 0.5, cd: 24, anim: 'brilhoOlhos', desfechos: [D({ txt: 'Hora espelhada. O JoJo fez um pedido: mais proteína. Ganhou uma escama.', xp: 10, material: 'escama', bom: true })] }),
  // ---- datas
  S({ id: 'sextaTreze', nome: 'Sexta-Feira 13', cond: { sexta13: true }, chance: 0.5, cd: 240, anim: 'assustado', desfechos: [D({ txt: 'Sexta-feira 13. O JoJo quebrou um espelho imaginário. Sete anos de bulking.', xp: 20, bom: true }), D({ txt: 'Sexta-feira 13. Um gato preto de pixel cruzou a barra de tarefas. O JoJo devorou.', xp: 25, artefatoRegiao: 'lixeira' })] }),
  S({ id: 'diaDoTubarao', nome: 'Dia do Tubarão', cond: { mes: 7, dia: 14 }, chance: 0.6, cd: 300, anim: 'poseEpica', desfechos: [D({ txt: 'Dia Internacional do Tubarão. O JoJo exige respeito e recebe um dente ancestral.', xp: 40, material: 'denteAncestral', bom: true })] }),
  S({ id: 'anoNovoLunar', nome: 'Lua Cheia no Recife', cond: { luaCheia: true, hora: [20, 24] }, chance: 0.15, cd: 240, anim: 'olharRedor', desfechos: [D({ txt: 'Lua cheia. A maré do desktop subiu e trouxe uma pérola.', xp: 15, material: 'perola', bom: true }), D({ txt: 'Lua cheia. O JoJo uivou. Tubarão não uiva. Ele não liga.', xp: 10 })] }),
  S({ id: 'primeiroDoMes', nome: 'Folha Nova', cond: { dia: 1 }, chance: 0.2, cd: 600, anim: 'tarefaConcluida', desfechos: [D({ txt: 'Primeiro dia do mês. O JoJo rasgou a folha velha do calendário com os dentes.', xp: 15, bom: true })] }),
  // ---- clima (quando a localização/clima estiver ligada)
  S({ id: 'tempestade', nome: 'Tempestade no Aquário', cond: { clima: ['tempestade'] }, chance: 0.2, cd: 48, anim: 'assustado', desfechos: [D({ txt: 'Trovão lá fora. O JoJo fingiu coragem e escondeu um cristal debaixo da barra de tarefas.', xp: 15, material: 'cristalCache', bom: true }), D({ txt: 'Trovão. O JoJo pulou. Negou depois.', xp: 8 })] }),
  S({ id: 'chuvaDeEscamas', nome: 'Chuva de Escamas', cond: { clima: ['chuva', 'garoa'] }, chance: 0.06, anim: 'chuva', desfechos: [D({ txt: 'Chuva lá fora, chuva de escamas aqui dentro. Material de graça.', xp: 10, material: 'escama', bom: true })] }),
  S({ id: 'calorao', nome: 'Calorão do Recife', cond: { clima: ['calor'] }, chance: 0.06, anim: 'calor', desfechos: [D({ txt: 'Calor absurdo. O JoJo suou proteína e pediu água. Beba você também.', xp: 8, vida: { sede: -10 } })] }),
  // ---- nível e vínculo
  S({ id: 'sussurroDoAncestral', nome: 'Sussurro do Ancestral', cond: { nivelMin: 25 }, chance: 0.01, cd: 168, anim: 'aura', desfechos: [D({ txt: 'Um sussurro grave veio do fundo do desktop: "continue treinando". O JoJo arrepiou as guelras.', xp: 25, fragmento: true, bom: true })] }),
  S({ id: 'presenteDoJojo', nome: 'Presente Inesperado', cond: { vinculoMin: 6 }, chance: 0.015, cd: 168, anim: 'tesouro', desfechos: [D({ txt: 'O JoJo deixou um presente no canto da tela: um artefato que ele achou e não quis ficar. Do jeito dele.', xp: 20, artefatoAleatorio: true, bom: true })] }),
  S({ id: 'confissao', nome: 'Confissão do Tubarão', cond: { vinculoMin: 10 }, chance: 0.01, cd: 336, anim: 'confissao', desfechos: [D({ txt: 'O JoJo confessou: ele lê as abas esquecidas quando você sai. E julga.', xp: 30, vida: { confianca: 10 }, bom: true })] }),
  S({ id: 'portalDoKernel', nome: 'Portal do Kernel', cond: { nivelMin: 50 }, chance: 0.008, cd: 168, anim: 'teleporte', desfechos: [D({ txt: 'Um portal abriu atrás do JoJo e cuspiu um núcleo quente.', xp: 40, material: 'nucleo', bom: true }), D({ txt: 'Um portal abriu, o JoJo meteu a cabeça e voltou com cheiro de queimado.', xp: 20 })] }),
  S({ id: 'ecoDoMegalodon', nome: 'Eco do Megalodon', cond: { nivelMin: 100 }, chance: 0.006, cd: 336, anim: 'evolucao', desfechos: [D({ txt: 'O chão do desktop tremeu. O Megalodon disse o nome do JoJo. Ele chorou por dentro (só por dentro).', xp: 60, fragmento: true, bom: true })] }),
  // ---- aplicativos (categoria real, só com percepção ligada)
  S({ id: 'bugNaFossa', nome: 'Bug na Fossa', cond: { categoria: ['codigo'] }, chance: 0.03, anim: 'morderIcone', desfechos: [D({ txt: 'O JoJo mordeu um bug que nadava no seu editor. Crocante. Mentira, ele não mexeu em nada.', xp: 12, material: 'fragmentoCodigo', bom: true })] }),
  S({ id: 'planilhaViva', nome: 'Planilha Viva', cond: { categoria: ['escritorio'] }, chance: 0.03, anim: 'chocado', desfechos: [D({ txt: 'Uma célula da planilha piscou para o JoJo. Ele piscou de volta. Agora são amigos.', xp: 10, material: 'papiro', bom: true })] }),
  S({ id: 'abaFantasma', nome: 'Aba Fantasma', cond: { categoria: ['navegador'] }, chance: 0.02, anim: 'fantasma', desfechos: [D({ txt: 'Uma aba fechada há meses voltou como fantasma. O JoJo exorcizou com um arroto.', xp: 12, artefatoRegiao: 'navegador', bom: true }), D({ txt: 'Uma aba fantasma passou. O JoJo fingiu que não viu.', xp: 6 })] }),
  S({ id: 'speedrun', nome: 'Speedrun do JoJo', cond: { categoria: ['jogo'] }, chance: 0.03, cd: 48, anim: 'nadarParaTela', desfechos: [D({ txt: 'Enquanto você jogava, o JoJo fez speedrun do recife. Recorde mundial de um competidor só.', xp: 15, material: 'moedaPixel', bom: true })] }),
  S({ id: 'creditosFinais', nome: 'Créditos Finais', cond: { categoria: ['video'] }, chance: 0.03, anim: 'aplausoLento', desfechos: [D({ txt: 'O JoJo assistiu aos créditos inteiros. Só para achar a cena pós-créditos. Achou uma pérola.', xp: 10, material: 'perola', bom: true })] }),
  // ---- histórico de convivência
  S({ id: 'saudade', nome: 'Volta para Casa', cond: { ausenciaHoras: 48 }, chance: 1, cd: 48, anim: 'voltou', desfechos: [D({ txt: 'Você sumiu dois dias. O JoJo não sentiu falta. Ele contou os minutos por tédio.', xp: 15, vida: { carinho: 10, tedio: -20 }, bom: true })] }),
  S({ id: 'aniversarioConvivencia', nome: 'Aniversário de Aquário', cond: { diasMultiplo: 100 }, chance: 1, cd: 2000, anim: 'aniversario', desfechos: [D({ txt: 'Cem dias a mais de convivência. O JoJo fingiu que esqueceu. Não esqueceu.', xp: 50, artefatoAleatorio: true, bom: true })] }),
  S({ id: 'sequenciaDeFerro', nome: 'Sequência de Ferro', cond: { streakMin: 7 }, chance: 0.2, cd: 168, anim: 'orgulhoso', desfechos: [D({ txt: 'Sete dias seguidos. O JoJo bateu continência. É raro.', xp: 30, bom: true })] }),
  // ---- aleatórios e extremamente raros
  S({ id: 'peixeDourado', nome: 'Peixe Dourado', cond: {}, chance: 0.004, cd: 168, anim: 'devorar', desfechos: [D({ txt: 'Um peixe dourado passou pela tela. O JoJo comeu. Agora ele brilha um pouco.', xp: 25, moedas: 30, bom: true })] }),
  S({ id: 'arcoIrisDuplo', nome: 'Arco-Íris Duplo', cond: {}, chance: 0.002, cd: 336, anim: 'estrelas', desfechos: [D({ txt: 'Arco-íris duplo no fundo do mar. O JoJo achou piegas e tirou foto.', xp: 30, buff: { sorteLoot: 0.05 }, horas: 12, bom: true })] }),
  S({ id: 'cometaDePixel', nome: 'Cometa de Pixel', cond: {}, chance: 0.0008, cd: 720, unico: true, anim: 'aura', desfechos: [D({ txt: 'Um cometa de pixel cruzou o desktop. Isso acontece uma vez na vida de um tubarão. Aconteceu.', xp: 100, artefatoRaridade: 'lendario', bom: true })] }),
  S({ id: 'tubaraoBranco', nome: 'Visita do Primo Branco', cond: {}, chance: 0.0015, cd: 720, anim: 'acenar', desfechos: [D({ txt: 'O primo tubarão-branco passou para dar oi. Ficou com inveja do braço do JoJo e foi embora.', xp: 40, bom: true }), D({ txt: 'O primo tubarão-branco passou, pediu dinheiro emprestado e sumiu.', xp: 20 })] }),
  S({ id: 'garrafaNoMar', nome: 'Mensagem na Garrafa', cond: {}, chance: 0.005, cd: 120, anim: 'lendo', desfechos: [D({ txt: 'Uma garrafa boiou com um bilhete: "beba água". Assinado: o futuro.', xp: 15, fragmento: true, bom: true }), D({ txt: 'Uma garrafa boiou. Dentro, um cupom expirado. Clássico.', xp: 8, artefato: 'cupomExpirado' })] }),
]);

/** Códigos secretos: frase exata (normalizada) no chat. Cada um vale uma vez. */
export const CODIGOS = Object.freeze([
  { id: 'cod_konami', frases: ['cima cima baixo baixo esquerda direita esquerda direita b a', 'konami'], txt: 'Código Konami. +30 vidas. Mentira: +1 escama dourada.', xp: 30, material: 'pixelDourado', anim: 'modoPoder' },
  { id: 'cod_sharknado', frases: ['sharknado'], txt: 'SHARKNADO! O JoJo girou feito tornado e derrubou três ícones imaginários.', xp: 25, anim: 'girar' },
  { id: 'cod_bau', frases: ['abre o bau do megalodon', 'abre-te sesamo', 'abre te sesamo'], txt: 'O baú abriu. Dentro: uma runa e um bilhete escrito "treina perna".', xp: 30, material: 'runaAntiga', anim: 'tesouro' },
  { id: 'cod_42', frases: ['42', 'qual a resposta para tudo'], txt: '42. O JoJo sabia. Ele sempre sabe.', xp: 15, anim: 'pensando' },
  { id: 'cod_iddqd', frases: ['iddqd'], txt: 'Modo deus ativado. Brincadeira: Deus aqui é o João. O JoJo só flexionou.', xp: 20, anim: 'duploBiceps' },
  { id: 'cod_naodorme', frases: ['o tubarao nunca dorme'], txt: 'Exato. Tubarão nunca para de nadar. Só medita às vezes.', xp: 20, vida: { energia: 20 }, anim: 'calma' },
  { id: 'cod_xyzzy', frases: ['xyzzy'], txt: 'Nada acontece. Ou acontece? Um pixel dourado caiu do teto.', xp: 20, material: 'pixelDourado', anim: 'surpreso' },
  { id: 'cod_tubarao', frases: ['tubarao fisiculturista'], txt: 'Esse sou eu. Obrigado por notar. Toma um cristal.', xp: 15, material: 'cristalCache', anim: 'poseEpica' },
]);

/** Combinações de interações (detectadas pelo motor com janela curta). */
export const COMBINACOES = Object.freeze([
  { id: 'cmb_carinhoComida', nome: 'Mimo Completo', seq: ['carinho', 'comida', 'carinho'], s: 60, txt: 'Carinho, comida, carinho. O JoJo entendeu a estratégia e gostou.', xp: 15, vida: { carinho: 10, satisfacao: 5 }, anim: 'contente' },
  { id: 'cmb_triatlo', nome: 'Triatlo do Aquário', seq: ['agua', 'treino', 'comida'], s: 600, txt: 'Água, treino, comida: triatlo de atleta. Respeito.', xp: 20, vida: { energia: 10 }, anim: 'comemorar' },
  { id: 'cmb_estudoFoco', nome: 'Combo Nerd', seq: ['estudo', 'foco'], s: 1800, txt: 'Estudo seguido de foco. Combo nerd. Óculos imaginários ativados.', xp: 15, anim: 'pensando' },
  { id: 'cmb_jogoVitoria3', nome: 'Invicta', seq: ['vitoria', 'vitoria', 'vitoria'], s: 1800, txt: 'Três vitórias seguidas. Invicta. Por enquanto.', xp: 20, anim: 'aplaudir' },
]);

/** Diário do Megalodon: 7 páginas achadas em eventos com `fragmento`. */
export const DIARIO = Object.freeze([
  'Página 1: "Antes do desktop, era tudo oceano. E antes do oceano, era tudo BIOS."',
  'Página 2: "Meu neto vai ser fisiculturista. Eu sinto isso nos dentes."',
  'Página 3: "Quem esquece de beber água vira peixe seco. Lembre-se."',
  'Página 4: "A lixeira guarda o que todos fingem esquecer."',
  'Página 5: "O kernel é quente, mas o coração de um tubarão é mais."',
  'Página 6: "Há um Deus acima de todos os tubarões. Ele se chama João."',
  'Página 7: "Se você está lendo isso, o aquário está em boas mãos. Agora vai treinar."',
]);
