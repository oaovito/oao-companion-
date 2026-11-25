// Missões além das diárias que já existem (Progress.missoes): semanais,
// especiais (datas), encadeadas (histórias em capítulos) e secretas (só
// aparecem depois de cumpridas). Todas avançam por eventos reais do app.
// Desafios de longa duração (endgame) também ficam aqui.

export const SEMANAIS = Object.freeze([
  { id: 'sem_foco', txt: 'Complete 5 blocos de foco', evento: 'foco', n: 5, xp: 40, cat: 'produtividade' },
  { id: 'sem_comidas', txt: 'Dê 5 comidas diferentes ao JoJo', evento: 'comidaNova', n: 5, xp: 30, cat: 'cuidados' },
  { id: 'sem_expedicoes', txt: 'Conclua 2 expedições', evento: 'expedicao', n: 2, xp: 35, cat: 'aventura', nivel: 2 },
  { id: 'sem_jogos', txt: 'Vença 4 minijogos', evento: 'vitoria', n: 4, xp: 30, cat: 'jogos' },
  { id: 'sem_agua', txt: 'Registre água 10 vezes', evento: 'agua', n: 10, xp: 30, cat: 'cuidados' },
  { id: 'sem_tarefas', txt: 'Conclua 8 tarefas da lista', evento: 'tarefa', n: 8, xp: 45, cat: 'produtividade' },
  { id: 'sem_limpeza', txt: 'Limpe 6 depósitos do aquário', evento: 'limpeza', n: 6, xp: 25, cat: 'cuidados' },
  { id: 'sem_conversa', txt: 'Converse 40 mensagens com o JoJo', evento: 'chat', n: 40, xp: 25, cat: 'convivencia' },
  { id: 'sem_timers', txt: 'Conclua 4 timers', evento: 'timer', n: 4, xp: 30, cat: 'produtividade' },
  { id: 'sem_carinho', txt: 'Faça carinho 10 vezes', evento: 'carinho', n: 10, xp: 20, cat: 'convivencia' },
  { id: 'sem_estudo', txt: 'Estude ou faça quiz 4 vezes', evento: 'estudo', n: 4, xp: 40, cat: 'estudo' },
  { id: 'sem_alongar', txt: 'Alongue ou treine 5 vezes', evento: 'treino', n: 5, xp: 30, cat: 'cuidados' },
  { id: 'sem_cuidado', txt: 'Cuide do JoJo 4 vezes', evento: 'cuidado', n: 4, xp: 25, cat: 'cuidados' },
  { id: 'sem_fabricar', txt: 'Fabrique 2 itens', evento: 'fabricacao', n: 2, xp: 30, cat: 'aventura', nivel: 4 },
  { id: 'sem_escolhas', txt: 'Decida 2 encruzilhadas nas expedições', evento: 'escolha', n: 2, xp: 30, cat: 'aventura', nivel: 3 },
]);

// Especiais: ativas só na janela da data (mês 1–12, dias inclusive).
export const ESPECIAIS = Object.freeze([
  { id: 'esp_anoNovo', nome: 'Promessas de Ano Novo', mes: 1, de: 1, ate: 10, objetivos: [{ evento: 'foco', n: 5 }, { evento: 'agua', n: 10 }], xp: 80, artefato: null },
  { id: 'esp_carnaval', nome: 'Bloco do Tubarão', mes: 2, de: 10, ate: 28, objetivos: [{ evento: 'vitoria', n: 5 }, { evento: 'carinho', n: 10 }], xp: 70 },
  { id: 'esp_pascoa', nome: 'Caça aos Ovos do Recife', mes: 4, de: 1, ate: 25, objetivos: [{ evento: 'expedicao', n: 3 }], xp: 70 },
  { id: 'esp_junina', nome: 'Arraiá do Fundo do Mar', mes: 6, de: 1, ate: 30, objetivos: [{ evento: 'comidaNova', n: 6 }, { evento: 'vitoria', n: 3 }], xp: 80 },
  { id: 'esp_semanaTubarao', nome: 'Semana do Tubarão', mes: 7, de: 20, ate: 31, objetivos: [{ evento: 'expedicao', n: 4 }, { evento: 'treino', n: 5 }], xp: 100 },
  { id: 'esp_estudante', nome: 'Mês do Estudante', mes: 8, de: 1, ate: 31, objetivos: [{ evento: 'estudo', n: 8 }], xp: 80 },
  { id: 'esp_halloween', nome: 'Noite das Abas Assombradas', mes: 10, de: 20, ate: 31, objetivos: [{ evento: 'segredo', n: 1 }, { evento: 'expedicao', n: 2 }], xp: 90 },
  { id: 'esp_natal', nome: 'Natal no Aquário', mes: 12, de: 1, ate: 31, objetivos: [{ evento: 'comida', n: 10 }, { evento: 'tarefa', n: 6 }], xp: 90 },
]);

// Encadeadas: capítulos em ordem; cada um tem objetivo, texto de história e recompensa.
export const CADEIAS = Object.freeze([
  { id: 'academia', nome: 'Academia Abissal', nivel: 4, capitulos: [
    { txt: 'O JoJo quer abrir uma academia no recife. Primeiro, provar que treina: alongue ou treine 3 vezes.', evento: 'treino', n: 3 },
    { txt: 'Um aluno precisa de foco. Complete 3 blocos de foco para dar o exemplo.', evento: 'foco', n: 3 },
    { txt: 'A academia precisa de reputação: vença 3 minijogos.', evento: 'vitoria', n: 3 },
    { txt: 'Inauguração! Conclua uma expedição física para buscar o equipamento.', evento: 'expedicaoFisica', n: 1 },
  ], artefato: 'halterDeOuro', titulo: 'Fundador da Academia Abissal' },
  { id: 'biblioteca', nome: 'A Biblioteca Afundada', nivel: 8, capitulos: [
    { txt: 'Um livro boiou até o aquário. Estude 2 vezes para decifrar a capa.', evento: 'estudo', n: 2 },
    { txt: 'O livro aponta para o Arquipélago dos Documentos. Conclua uma expedição lá.', evento: 'regiao_escritorio', n: 1 },
    { txt: 'As páginas estão em código. Vença 2 quizzes.', evento: 'vitoriaQuiz', n: 2 },
    { txt: 'A última página pede paciência: complete 4 blocos de foco.', evento: 'foco', n: 4 },
  ], artefato: 'livroAfundado', titulo: 'Bibliotecário do Abismo' },
  { id: 'cozinha', nome: 'Cozinha do Fundo do Mar', nivel: 6, capitulos: [
    { txt: 'O JoJo decidiu virar crítico gastronômico. Dê 3 comidas diferentes.', evento: 'comidaNova', n: 3 },
    { txt: 'Crítico precisa de água. Registre água 5 vezes.', evento: 'agua', n: 5 },
    { txt: 'Ingrediente secreto no recife: conclua 2 expedições.', evento: 'expedicao', n: 2 },
    { txt: 'O prato final: fabrique um item.', evento: 'fabricacao', n: 1 },
  ], artefato: 'panelaDoAbismo', titulo: 'Chef das Profundezas' },
  { id: 'pixel', nome: 'O Caso do Pixel Perdido', nivel: 14, capitulos: [
    { txt: 'Um pixel sumiu da sua tela. O JoJo jura que viu. Explore o Oceano da Rede.', evento: 'regiao_navegador', n: 1 },
    { txt: 'Testemunhas dizem que ele foi para a lixeira. Explore o Cemitério da Lixeira.', evento: 'regiao_lixeira', n: 1 },
    { txt: 'Pistas não mentem: descubra um segredo.', evento: 'segredo', n: 1 },
    { txt: 'Confronto final: decida 2 encruzilhadas.', evento: 'escolha', n: 2 },
  ], artefato: 'pixelPerdido', titulo: 'Detetive do Pixel' },
  { id: 'megalodon', nome: 'A Lenda do Megalodon', nivel: 40, capitulos: [
    { txt: 'O JoJo sonhou com o ancestral. Encontre 3 artefatos para provar que não foi sonho.', evento: 'artefato', n: 3 },
    { txt: 'O caminho passa pelo Abismo do Kernel. Conclua uma expedição lá.', evento: 'regiao_kernel', n: 1 },
    { txt: 'O ancestral só respeita quem tem disciplina: conclua 10 missões.', evento: 'missao', n: 10 },
    { txt: 'Um segredo raro abre o santuário. Descubra 2 segredos.', evento: 'segredo', n: 2 },
    { txt: 'Fique frente a frente com o Megalodon: conclua uma expedição no Santuário.', evento: 'regiao_megalodon', n: 1 },
  ], artefato: 'diarioDoMegalodon', titulo: 'Herdeiro do Megalodon' },
]);

// Secretas: invisíveis até acontecer; cond lida pelo motor (contadores e contexto).
export const SECRETAS = Object.freeze([
  { id: 'sec_insone', nome: 'Insone', desc: 'Conversou com o JoJo entre 3h e 4h da manhã.', cond: { evento: 'chat', hora: [3, 4] }, xp: 30 },
  { id: 'sec_maratona', nome: 'Maratona de Foco', desc: '4 blocos de foco no mesmo dia.', cond: { contaDia: 'foco', n: 4 }, xp: 40 },
  { id: 'sec_frutas', nome: 'Vegetariano Relutante', desc: 'Deu banana 3 vezes no mesmo dia (ele odeia).', cond: { comidaDia: 'banana', n: 3 }, xp: 25 },
  { id: 'sec_arqueologo', nome: 'Arqueólogo', desc: '10 expedições concluídas.', cond: { conta: 'expedicoes', n: 10 }, xp: 50 },
  { id: 'sec_hidratado', nome: 'Camelo ao Contrário', desc: '12 registros de água num dia.', cond: { contaDia: 'agua', n: 12 }, xp: 35 },
  { id: 'sec_faxina', nome: 'Faxina Pesada', desc: '6 limpezas num dia.', cond: { contaDia: 'limpeza', n: 6 }, xp: 30 },
  { id: 'sec_rodizio', nome: 'Rodízio', desc: '3 comidas diferentes em 10 minutos.', cond: { rodizio: 3 }, xp: 25 },
  { id: 'sec_carinhoso', nome: 'Overdose de Carinho', desc: '5 carinhos em 30 segundos.', cond: { rajada: 'carinho', n: 5, s: 30 }, xp: 20 },
  { id: 'sec_madrugador', nome: 'Madrugador', desc: 'Concluiu uma tarefa antes das 7h.', cond: { evento: 'tarefa', hora: [4, 7] }, xp: 30 },
  { id: 'sec_colecionador', nome: 'Museu Particular', desc: '15 artefatos diferentes.', cond: { artefatosDiferentes: 15 }, xp: 60 },
  { id: 'sec_explorador', nome: 'Mapa Completo', desc: 'Concluiu expedição em 8 regiões diferentes.', cond: { regioesConcluidas: 8 }, xp: 80 },
  { id: 'sec_fiel', nome: 'Fiel ao Aquário', desc: '30 dias diferentes de convivência.', cond: { conta: 'dias', n: 30 }, xp: 80 },
]);

// Endgame: desafios de longa duração (contadores permanentes do motor).
export const DESAFIOS_LONGOS = Object.freeze([
  { id: 'dl_cemExpedicoes', nome: 'Cem Mergulhos', conta: 'expedicoes', n: 100, xp: 200, titulo: 'Mergulhador Centenário' },
  { id: 'dl_milFocos', nome: 'Mil Horas de Silêncio', conta: 'focos', n: 1000, xp: 300, titulo: 'Monge do Recife' },
  { id: 'dl_anoJunto', nome: 'Um Ano de Aquário', conta: 'dias', n: 365, xp: 400, titulo: 'Veterano do Aquário' },
  { id: 'dl_todosSegredos', nome: 'Sem Segredos', conta: 'segredos', n: 40, xp: 300, titulo: 'Guardião dos Segredos' },
  { id: 'dl_cemFabricacoes', nome: 'Laboratório Lotado', conta: 'fabricacoes', n: 100, xp: 200, titulo: 'Grão-Alquimista' },
  { id: 'dl_quinhentasMissoes', nome: 'Quinhentas Ordens', conta: 'missoes', n: 500, xp: 300, titulo: 'Soldado Exemplar' },
  { id: 'dl_todasEsp', nome: 'Mestre de Ofícios', esp: { quantas: 16, rank: 10 }, xp: 500, titulo: 'Mestre de Todos os Ofícios' },
  { id: 'dl_lendarios', nome: 'Tesouro Lendário', artefatosRaridade: { raridade: 'lendario', n: 5 }, xp: 300, titulo: 'Senhor do Tesouro' },
]);
