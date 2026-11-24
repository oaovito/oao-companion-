// 16 especializações do JoJo (0.48). Não são troca de roupa: cada uma tem
// fontes próprias de progresso (eventos reais), efeito por rank, duas
// habilidades exclusivas, missões semanais próprias, região favorita nas
// expedições, animação com adereço que já existe no rig e falas.
// Nenhuma muda a personalidade: o JoJo continua o mesmo, só com outro ofício.
// Médico e Cientista são educacionais: nunca credencial real nem diagnóstico.

export const RANK_MAX = 10;
/** XP de especialização para chegar ao rank r (1..10). */
export const limiarRank = (r) => (r <= 1 ? 0 : 40 * (r - 1) * r);

const E = (o) => Object.freeze({ aviso: null, ...o });

export const ESPECIALIZACOES = Object.freeze([
  E({ id: 'cientista', nome: 'Cientista', nivel: 5, atributos: ['inteligencia', 'percepcao'], fontes: { estudo: 3, quiz: 2, pesquisa: 4, segredo: 2 }, efeito: { xpEstudo: 0.01, chanceSegredo: 0.02 }, regiao: 'codigo', prop: 'living_cientista', aviso: 'Explicações científicas são educativas, com fonte quando houver; nada aqui é laudo.',
    habilidades: [{ id: 'esp_hipotese', nome: 'Hipótese Testável', tipo: 'passiva', efeito: { sucessoMental: 0.05 }, desc: 'Desafios intelectuais +5%.' }, { id: 'esp_experimento', nome: 'Experimento Controlado', tipo: 'ativa', acao: 'experimento', cd: 24, desc: 'Fabrica uma poção sem gastar materiais raros.' }],
    missoes: [{ id: 'cientista1', txt: 'Estude ou faça quiz 5 vezes', evento: 'estudo', n: 5 }, { id: 'cientista2', txt: 'Descubra um segredo', evento: 'segredo', n: 1 }],
    falas: ['Hipótese: você vai procrastinar. Vamos testar.', 'Ciência é errar com método. Você já tem metade.', 'Anotei. Dados não mentem, só você.'] }),
  E({ id: 'medico', nome: 'Médico', nivel: 8, atributos: ['vitalidade', 'sabedoria'], fontes: { cuidado: 3, comida: 1, agua: 2, alongar: 2, cura: 4 }, efeito: { cura: 0.03, xpCuidado: 0.01 }, regiao: 'escritorio', prop: 'living_medico', aviso: 'Orientações de saúde são educativas; sintoma sério é com profissional de verdade (emergência: 192).',
    habilidades: [{ id: 'esp_triagem', nome: 'Triagem', tipo: 'passiva', efeito: { resistenciaDoenca: 0.1 }, desc: 'Doenças pegam 10% menos.' }, { id: 'esp_plantao', nome: 'Plantão', tipo: 'ativa', acao: 'banquete', cd: 8, desc: 'Cura uma doença do JoJo na hora.' }],
    missoes: [{ id: 'medico1', txt: 'Beba água 6 vezes nesta semana', evento: 'agua', n: 6 }, { id: 'medico2', txt: 'Cuide do JoJo 5 vezes', evento: 'cuidado', n: 5 }],
    falas: ['Água. Agora. É prescrição de tubarão, não de CRM.', 'Alongou hoje? Seu pescoço manda lembranças.', 'Sintoma estranho é com médico de verdade. Eu sou de recorte de papel.'] }),
  E({ id: 'professor', nome: 'Professor', nivel: 10, atributos: ['inteligencia', 'carisma'], fontes: { quiz: 3, estudo: 3, chat: 0.2 }, efeito: { xpEstudo: 0.015, vinculoGanho: 0.01 }, regiao: 'escritorio', prop: 'living_professor',
    habilidades: [{ id: 'esp_didatica', nome: 'Didática Brutal', tipo: 'passiva', efeito: { dicasQuiz: 1 }, desc: 'Uma dica extra no quiz.' }, { id: 'esp_provaSurpresa', nome: 'Prova Surpresa', tipo: 'ativa', acao: 'aula', cd: 12, desc: 'Abre um quiz que vale XP de estudo dobrado no próximo acerto.' }],
    missoes: [{ id: 'professor1', txt: 'Vença 3 quizzes', evento: 'vitoriaQuiz', n: 3 }, { id: 'professor2', txt: 'Estude 4 blocos', evento: 'estudo', n: 4 }],
    falas: ['Pergunta de prova: você revisou? Resposta certa: não.', 'Explico de novo. Mais devagar. Com desenho, se precisar.', 'Nota dez em esforço. Em resultado, a gente vê.'] }),
  E({ id: 'guerreiro', nome: 'Guerreiro', nivel: 12, atributos: ['forca', 'resistencia'], fontes: { treino: 3, vitoria: 2, expedicaoFisica: 4 }, efeito: { sucessoFisico: 0.02 }, regiao: 'jogo', prop: 'halter',
    habilidades: [{ id: 'esp_gritoDeGuerra', nome: 'Grito de Guerra', tipo: 'passiva', atributo: { forca: 5 }, desc: '+5 de Força.' }, { id: 'esp_investida', nome: 'Investida', tipo: 'ativa', acao: 'furia', cd: 36, desc: 'Próxima expedição física com sucesso garantido.' }],
    missoes: [{ id: 'guerreiro1', txt: 'Vença 4 minijogos', evento: 'vitoria', n: 4 }, { id: 'guerreiro2', txt: 'Conclua 2 expedições físicas', evento: 'expedicaoFisica', n: 2 }],
    falas: ['Guerra é igual treino: quem aquece, vence.', 'Inimigo derrotado. Era um pop-up, mas conta.', 'Escudo? Eu tenho peitoral.'] }),
  E({ id: 'explorador', nome: 'Explorador', nivel: 6, atributos: ['agilidade', 'percepcao'], fontes: { expedicao: 4, exploracao: 0.05, segredo: 1 }, efeito: { duracaoExp: 0.02, sorteLoot: 0.005 }, regiao: 'navegador', prop: 'living_marinheiro',
    habilidades: [{ id: 'esp_bussola', nome: 'Bússola Interna', tipo: 'passiva', efeito: { duracaoExp: 0.08 }, desc: 'Expedições 8% mais curtas.' }, { id: 'esp_atalho', nome: 'Atalho Secreto', tipo: 'ativa', acao: 'sprint', cd: 18, desc: 'Conclui a expedição em andamento agora.' }],
    missoes: [{ id: 'explorador1', txt: 'Conclua 3 expedições', evento: 'expedicao', n: 3 }, { id: 'explorador2', txt: 'Explore 2 regiões diferentes', evento: 'regiaoNova', n: 2 }],
    falas: ['Mapeei a sua área de trabalho. Tem um arquivo "final_final2" lá. Vergonha.', 'Toda pasta é uma caverna. Toda caverna tem tesouro. Ou lixo.', 'Explorar é só procrastinar com bússola.'] }),
  E({ id: 'alquimista', nome: 'Alquimista', nivel: 18, atributos: ['inteligencia', 'sorte'], fontes: { fabricacao: 5, expedicao: 1 }, efeito: { sorteLoot: 0.005, materialExtra: 0.03 }, regiao: 'nuvem', prop: 'living_quimico',
    habilidades: [{ id: 'esp_transmutacao', nome: 'Transmutação', tipo: 'passiva', efeito: { materialExtra: 0.15 }, desc: '15% de chance de material extra nas expedições.' }, { id: 'esp_pedraFilosofal', nome: 'Pedra Filosofal', tipo: 'ativa', acao: 'experimento', cd: 24, desc: 'Fabrica uma poção sem gastar materiais raros.' }],
    missoes: [{ id: 'alquimista1', txt: 'Fabrique 2 itens', evento: 'fabricacao', n: 2 }, { id: 'alquimista2', txt: 'Conclua 2 expedições', evento: 'expedicao', n: 2 }],
    falas: ['Misturei whey com alga. Ou virei gênio, ou vou passar mal.', 'Ouro a partir de chumbo? Fácil. Disciplina a partir de você? Impossível.', 'Toda poção tem efeito colateral. Essa causa arrogância.'] }),
  E({ id: 'comerciante', nome: 'Comerciante', nivel: 15, atributos: ['carisma', 'sorte'], fontes: { moedas: 0.05, expedicao: 1, fabricacao: 1 }, efeito: { moedasExp: 0.02 }, regiao: 'launcher', prop: 'living_economista',
    habilidades: [{ id: 'esp_pechincha', nome: 'Pechincha', tipo: 'passiva', efeito: { moedasExp: 0.1 }, desc: '+10% de JOJOcoins achados nas expedições.' }, { id: 'esp_feira', nome: 'Feira do Recife', tipo: 'ativa', acao: 'feira', cd: 48, desc: 'Vende o material comum que sobrou por JOJOcoins.' }],
    missoes: [{ id: 'comerciante1', txt: 'Ganhe JOJOcoins em 3 expedições', evento: 'expedicao', n: 3 }, { id: 'comerciante2', txt: 'Venda materiais na feira', evento: 'feira', n: 1 }],
    falas: ['Tudo tem preço. Seu foco, por exemplo, está em promoção.', 'Lucro é só sobra de disciplina.', 'Compro barato, vendo caro, treino sempre.'] }),
  E({ id: 'estrategista', nome: 'Estrategista', nivel: 20, atributos: ['sabedoria', 'disciplina'], fontes: { tarefa: 3, timer: 2, missao: 2 }, efeito: { xpMissao: 0.015, escolhaSabia: 0.01 }, regiao: 'escritorio', prop: 'lista',
    habilidades: [{ id: 'esp_planoB', nome: 'Plano B', tipo: 'passiva', efeito: { escolhaSabia: 0.08 }, desc: 'Escolhas nas aventuras 8% mais seguras.' }, { id: 'esp_xequeMate', nome: 'Xeque-Mate', tipo: 'ativa', acao: 'olhoTempestade', cd: 24, desc: 'Por 2 horas o tédio não sobe e o foco rende mais.' }],
    missoes: [{ id: 'estrategista1', txt: 'Conclua 6 tarefas da lista', evento: 'tarefa', n: 6 }, { id: 'estrategista2', txt: 'Conclua 3 timers', evento: 'timer', n: 3 }],
    falas: ['Plano: você faz, eu supervisiono. Genial.', 'Estratégia sem execução é só desenho bonito.', 'Três passos à frente. Você ainda está no primeiro.'] }),
  E({ id: 'investigador', nome: 'Investigador', nivel: 14, atributos: ['percepcao', 'inteligencia'], fontes: { segredo: 5, pista: 2, expedicao: 1 }, efeito: { chanceSegredo: 0.04, pista: 0.02 }, regiao: 'lixeira', prop: 'living_detetive',
    habilidades: [{ id: 'esp_lupa', nome: 'Lupa Afiada', tipo: 'passiva', efeito: { pista: 0.1 }, desc: 'Pistas aparecem 10% mais.' }, { id: 'esp_interrogatorio', nome: 'Interrogatório', tipo: 'ativa', acao: 'faro', cd: 18, desc: 'Dá uma pista concreta de um segredo.' }],
    missoes: [{ id: 'investigador1', txt: 'Descubra 2 segredos', evento: 'segredo', n: 2 }, { id: 'investigador2', txt: 'Explore a Lixeira', evento: 'regiao_lixeira', n: 1 }],
    falas: ['O culpado é você. O crime? Não beber água.', 'Elementar: abriu o Instagram de novo.', 'Toda pista leva a uma aba esquecida.'] }),
  E({ id: 'treinador', nome: 'Treinador', nivel: 9, atributos: ['disciplina', 'forca'], fontes: { treino: 3, foco: 2, alongar: 2 }, efeito: { xpTreino: 0.02, xpFoco: 0.005 }, regiao: 'recife', prop: 'living_treinador',
    habilidades: [{ id: 'esp_apito', nome: 'Apito', tipo: 'passiva', atributo: { disciplina: 5 }, desc: '+5 de Disciplina.' }, { id: 'esp_serieExtra', nome: 'Série Extra', tipo: 'ativa', acao: 'segundoFolego', cd: 18, desc: 'Recupera energia e sede do JoJo.' }],
    missoes: [{ id: 'treinador1', txt: 'Treine ou alongue 5 vezes', evento: 'treino', n: 5 }, { id: 'treinador2', txt: 'Faça 4 blocos de foco', evento: 'foco', n: 4 }],
    falas: ['Mais uma série. Sempre mais uma.', 'Dor é fraqueza saindo. Preguiça é fraqueza ficando.', 'Hidratação, postura, foco. Nessa ordem.'] }),
  E({ id: 'cozinheiro', nome: 'Cozinheiro', nivel: 7, atributos: ['vitalidade', 'carisma'], fontes: { comida: 2, comidaNova: 4, fabricacao: 1 }, efeito: { comidaBonus: 0.03 }, regiao: 'recife', prop: 'living_chef',
    habilidades: [{ id: 'esp_tempero', nome: 'Tempero Secreto', tipo: 'passiva', efeito: { comidaBonus: 0.15 }, desc: 'Comida rende 15% mais satisfação e energia.' }, { id: 'esp_banquete', nome: 'Banquete do Chef', tipo: 'ativa', acao: 'banquete', cd: 10, desc: 'Cura uma doença na hora.' }],
    missoes: [{ id: 'cozinheiro1', txt: 'Dê 4 comidas diferentes', evento: 'comidaNova', n: 4 }, { id: 'cozinheiro2', txt: 'Alimente o JoJo 8 vezes', evento: 'comida', n: 8 }],
    falas: ['Isso está cru. Perfeito.', 'Cozinha é química com fome.', 'Proteína primeiro, sobremesa nunca.'] }),
  E({ id: 'guardiao', nome: 'Guardião', nivel: 25, atributos: ['resistencia', 'sabedoria'], fontes: { foco: 2, trabalho: 0.02, timer: 1 }, efeito: { quedaVida: 0.01, confiancaPiso: 1 }, regiao: 'kernel', prop: 'ddManto',
    habilidades: [{ id: 'esp_vigilia', nome: 'Vigília', tipo: 'passiva', efeito: { quedaVida: 0.05 }, desc: 'Sede e energia caem 5% mais devagar.' }, { id: 'esp_muralha', nome: 'Muralha', tipo: 'ativa', acao: 'presenca', cd: 24, desc: 'Satisfação, carinho e confiança sobem de uma vez.' }],
    missoes: [{ id: 'guardiao1', txt: 'Proteja 3 blocos de foco', evento: 'foco', n: 3 }, { id: 'guardiao2', txt: 'Conclua 2 timers', evento: 'timer', n: 2 }],
    falas: ['Ninguém entra no seu foco. Nem o Instagram.', 'Guardo o portão. Você guarda o prazo.', 'Silêncio é a melhor defesa.'] }),
  E({ id: 'colecionador', nome: 'Colecionador', nivel: 16, atributos: ['sorte', 'percepcao'], fontes: { artefato: 4, pose: 0.3, segredo: 2 }, efeito: { sorteLoot: 0.006 }, regiao: 'lixeira', prop: 'bau',
    habilidades: [{ id: 'esp_olhoClinico', nome: 'Olho Clínico', tipo: 'passiva', efeito: { sorteLoot: 0.04 }, desc: '+4% de achados raros.' }, { id: 'esp_vitrine', nome: 'Vitrine', tipo: 'passiva', efeito: { slotArtefato: 1 }, desc: '+1 espaço de artefato equipado.' }],
    missoes: [{ id: 'colecionador1', txt: 'Encontre 3 artefatos', evento: 'artefato', n: 3 }, { id: 'colecionador2', txt: 'Descubra um segredo', evento: 'segredo', n: 1 }],
    falas: ['Esse aqui eu não vendo nem por mil JOJOcoins.', 'Coleção incompleta é dor física.', 'Tudo tem valor. Menos aquele seu pen drive.'] }),
  E({ id: 'filosofo', nome: 'Filósofo', nivel: 22, atributos: ['sabedoria', 'carisma'], fontes: { chat: 0.4, segredo: 1, missao: 1 }, efeito: { escolhaSabia: 0.01, vinculoGanho: 0.01 }, regiao: 'nuvem', prop: 'livro',
    habilidades: [{ id: 'esp_maieutica', nome: 'Maiêutica', tipo: 'passiva', efeito: { escolhaSabia: 0.06, vinculoGanho: 0.04 }, desc: 'Escolhas mais sábias e vínculo mais rápido.' }, { id: 'esp_contemplacao', nome: 'Contemplação', tipo: 'ativa', acao: 'meditacao', cd: 5, desc: '+25 de energia e −25 de tédio.' }],
    missoes: [{ id: 'filosofo1', txt: 'Converse 30 mensagens', evento: 'chat', n: 30 }, { id: 'filosofo2', txt: 'Faça uma escolha numa aventura', evento: 'escolha', n: 1 }],
    falas: ['Penso, logo treino.', 'Só sei que nada sei. E que você não bebeu água.', 'O sentido da vida? Proteína e descanso.'] }),
  E({ id: 'pesquisador', nome: 'Pesquisador', nivel: 30, atributos: ['inteligencia', 'disciplina'], fontes: { pesquisa: 4, estudo: 2, exploracao: 0.03 }, efeito: { xpEstudo: 0.01, xpFoco: 0.01 }, regiao: 'codigo', prop: 'living_pesquisador',
    habilidades: [{ id: 'esp_revisaoPares', nome: 'Revisão por Pares', tipo: 'passiva', efeito: { sucessoMental: 0.06, xpEstudo: 0.03 }, desc: 'Desafios mentais e estudo mais fortes.' }, { id: 'esp_metanalise', nome: 'Metanálise', tipo: 'ativa', acao: 'faro', cd: 24, desc: 'Dá uma pista concreta de um segredo.' }],
    missoes: [{ id: 'pesquisador1', txt: 'Estude 5 blocos', evento: 'estudo', n: 5 }, { id: 'pesquisador2', txt: 'Explore a Fossa do Código', evento: 'regiao_codigo', n: 1 }],
    falas: ['Fonte? Sem fonte não vale.', 'N amostral pequeno, mas a conclusão é: você precisa dormir às 21h. Eu não.', 'Pesquisa boa começa com pergunta chata.'] }),
  E({ id: 'mestre', nome: 'Mestre', nivel: 150, requisitoRanks: { quantas: 8, rank: 5 }, atributos: ['sabedoria', 'forca'], fontes: { missao: 2, expedicao: 2, segredo: 2, foco: 1, estudo: 1, cuidado: 1 }, efeito: { xpMissao: 0.01, sorteLoot: 0.004, escolhaSabia: 0.01 }, regiao: 'megalodon', prop: 'ddCoroa',
    habilidades: [{ id: 'esp_ensinamento', nome: 'Ensinamento', tipo: 'passiva', efeito: { xpMissao: 0.08, xpEstudo: 0.05, xpFoco: 0.05 }, desc: 'Missões, estudo e foco rendem mais.' }, { id: 'esp_caminhoDoMestre', nome: 'Caminho do Mestre', tipo: 'ativa', acao: 'despertar', cd: 96, desc: 'Por 1 hora: XP turbinado e energia/sede travadas.' }],
    missoes: [{ id: 'mestre1', txt: 'Conclua 5 missões de qualquer tipo', evento: 'missao', n: 5 }, { id: 'mestre2', txt: 'Conclua uma expedição no Santuário', evento: 'regiao_megalodon', n: 1 }],
    falas: ['O mestre não ensina. O mestre manda.', 'Já fui aluno. Hoje sou lenda.', 'Disciplina é a única arte marcial que importa.'] }),
]);

export const ESP_POR_ID = new Map(ESPECIALIZACOES.map((e) => [e.id, e]));

/** Habilidades das especializações no formato das gerais (árvore = esp). */
export const HABILIDADES_ESP = Object.freeze(ESPECIALIZACOES.flatMap((e) => e.habilidades.map((h) => Object.freeze({ ranks: 1, custo: 0, requer: [], efeito: {}, atributo: {}, ...h, arvore: `esp:${e.id}`, esp: e.id, nivel: e.nivel }))));

export function rankDe(xp) {
  let r = 1;
  while (r < RANK_MAX && xp >= limiarRank(r + 1)) r++;
  return r;
}
