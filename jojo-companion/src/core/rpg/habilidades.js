// Habilidades, poderes e poderes lendários do JoJo (0.48). Cinco árvores
// gerais + habilidades próprias das especializações. Passivas evoluem por
// rank; ativas têm ação real (motor.usarHabilidade) e recarga; poderes
// lendários exigem nível alto e pré-requisitos. Animações: só itens que já
// existem no catálogo (nada inventado sem desenho).

export const ARVORES = Object.freeze([
  { id: 'corpo', nome: 'Corpo de Aço', desc: 'Força, treino e resistência física.' },
  { id: 'mente', nome: 'Mente Abissal', desc: 'Estudo, foco e raciocínio.' },
  { id: 'vinculo', nome: 'Laço do Aquário', desc: 'Convivência com a Emanuele e cuidados.' },
  { id: 'sobrevivencia', nome: 'Sobrevivência', desc: 'Expedições, perigos e recuperação.' },
  { id: 'fortuna', nome: 'Fortuna das Profundezas', desc: 'Sorte, tesouros e segredos.' },
]);

// efeito: chave → valor por rank (somado aos efeitos dos atributos, com teto no motor).
// atributo: atributo → bônus por rank.
const H = (o) => Object.freeze({ ranks: 1, custo: 1, requer: [], efeito: {}, atributo: {}, ...o });

export const HABILIDADES = Object.freeze([
  // ---- Corpo de Aço
  H({ id: 'musculoDeAco', nome: 'Músculo de Aço', arvore: 'corpo', tipo: 'passiva', nivel: 2, ranks: 3, atributo: { forca: 2 }, desc: '+2 de Força por rank.' }),
  H({ id: 'pulmaoDeGuelra', nome: 'Pulmão de Guelra', arvore: 'corpo', tipo: 'passiva', nivel: 4, ranks: 3, atributo: { resistencia: 2 }, desc: '+2 de Resistência por rank.' }),
  H({ id: 'supinoMental', nome: 'Supino Mental', arvore: 'corpo', tipo: 'passiva', nivel: 8, ranks: 3, requer: ['musculoDeAco'], efeito: { sucessoFisico: 0.03 }, desc: '+3% de sucesso em desafios físicos por rank.' }),
  H({ id: 'segundoFolego', nome: 'Segundo Fôlego', arvore: 'corpo', tipo: 'ativa', nivel: 10, requer: ['pulmaoDeGuelra'], acao: 'segundoFolego', cd: 24, anim: 'duploBiceps', desc: 'Recupera 40 de energia e 30 de sede na hora.' }),
  H({ id: 'treinoDeSangue', nome: 'Treino de Sangue', arvore: 'corpo', tipo: 'passiva', nivel: 15, ranks: 3, requer: ['supinoMental'], efeito: { xpTreino: 0.05 }, desc: '+5% de XP de treino e cabo de guerra por rank.' }),
  H({ id: 'peleDeTubarao', nome: 'Pele de Tubarão', arvore: 'corpo', tipo: 'especial', nivel: 25, requer: ['treinoDeSangue'], efeito: { resistenciaDoenca: 0.25 }, desc: 'Doenças pegam 25% menos.' }),
  H({ id: 'poseEpica', nome: 'Pose Épica', arvore: 'corpo', tipo: 'ativa', nivel: 30, requer: ['peleDeTubarao'], acao: 'poseEpica', cd: 8, anim: 'poseEpica', desc: '+15 de satisfação e +10 de confiança; ele se exibe sem vergonha.' }),
  H({ id: 'furiaDoMegalodon', nome: 'Fúria do Megalodon', arvore: 'corpo', tipo: 'poder', nivel: 60, requer: ['poseEpica'], acao: 'furia', cd: 48, anim: 'modoFera', desc: 'Próxima expedição física com sucesso garantido.' }),

  // ---- Mente Abissal
  H({ id: 'leituraDinamica', nome: 'Leitura Dinâmica', arvore: 'mente', tipo: 'passiva', nivel: 2, ranks: 3, atributo: { inteligencia: 2 }, desc: '+2 de Inteligência por rank.' }),
  H({ id: 'focoDeCacador', nome: 'Foco de Caçador', arvore: 'mente', tipo: 'passiva', nivel: 4, ranks: 3, atributo: { disciplina: 2 }, desc: '+2 de Disciplina por rank.' }),
  H({ id: 'memoriaDeElefante', nome: 'Memória de Elefante', arvore: 'mente', tipo: 'passiva', nivel: 8, ranks: 3, requer: ['leituraDinamica'], efeito: { xpEstudo: 0.03, dicasQuiz: 0.34 }, desc: '+3% XP de estudo por rank; no rank 3 ganha uma dica extra no quiz.' }),
  H({ id: 'meditacaoProfunda', nome: 'Meditação Profunda', arvore: 'mente', tipo: 'ativa', nivel: 10, requer: ['focoDeCacador'], acao: 'meditacao', cd: 6, anim: 'calma', desc: '+25 de energia e −25 de tédio.' }),
  H({ id: 'aulaRelampago', nome: 'Aula Relâmpago', arvore: 'mente', tipo: 'ativa', nivel: 14, requer: ['memoriaDeElefante'], acao: 'aula', cd: 12, anim: 'pensando', desc: 'Abre um quiz e o próximo acerto vale XP de estudo dobrado.' }),
  H({ id: 'estrategiaFria', nome: 'Estratégia Fria', arvore: 'mente', tipo: 'especial', nivel: 25, requer: ['aulaRelampago'], efeito: { sucessoMental: 0.08, escolhaSabia: 0.05 }, desc: 'Desafios intelectuais e escolhas nas aventuras mais seguras.' }),
  H({ id: 'disciplinaDeFerro', nome: 'Disciplina de Ferro', arvore: 'mente', tipo: 'passiva', nivel: 35, ranks: 3, requer: ['estrategiaFria'], efeito: { xpFoco: 0.04 }, desc: '+4% XP de foco e timers por rank.' }),
  H({ id: 'olhoDaTempestade', nome: 'Olho da Tempestade', arvore: 'mente', tipo: 'poder', nivel: 65, requer: ['disciplinaDeFerro'], acao: 'olhoTempestade', cd: 24, anim: 'modoFoco', desc: 'Por 2 horas o tédio não sobe e o foco rende +10% de XP.' }),

  // ---- Laço do Aquário
  H({ id: 'charmeDeEscamas', nome: 'Charme de Escamas', arvore: 'vinculo', tipo: 'passiva', nivel: 2, ranks: 3, atributo: { carisma: 2 }, desc: '+2 de Carisma por rank.' }),
  H({ id: 'radarDeHumor', nome: 'Radar de Humor', arvore: 'vinculo', tipo: 'passiva', nivel: 5, ranks: 3, atributo: { percepcao: 1, sabedoria: 1 }, desc: '+1 de Percepção e Sabedoria por rank.' }),
  H({ id: 'cuidadoDeMestre', nome: 'Cuidado de Mestre', arvore: 'vinculo', tipo: 'passiva', nivel: 9, ranks: 3, requer: ['charmeDeEscamas'], efeito: { xpCuidado: 0.05, vinculoGanho: 0.04 }, desc: '+5% XP de cuidados e +4% de vínculo por rank.' }),
  H({ id: 'abracoDeUrso', nome: 'Abraço de Tubarão', arvore: 'vinculo', tipo: 'ativa', nivel: 12, requer: ['radarDeHumor'], acao: 'abraco', cd: 8, anim: 'abracoApertado', desc: '+15 de carinho e −15 de tédio. Sem melação.' }),
  H({ id: 'lealdadeAbissal', nome: 'Lealdade Abissal', arvore: 'vinculo', tipo: 'especial', nivel: 28, requer: ['cuidadoDeMestre'], efeito: { confiancaPiso: 15 }, desc: 'A confiança nunca cai abaixo de 35.' }),
  H({ id: 'parceiroDeTreino', nome: 'Parceiro de Treino', arvore: 'vinculo', tipo: 'passiva', nivel: 40, ranks: 3, requer: ['lealdadeAbissal'], efeito: { xpMissao: 0.04 }, desc: '+4% XP de missões por rank.' }),
  H({ id: 'presencaReconfortante', nome: 'Presença Reconfortante', arvore: 'vinculo', tipo: 'poder', nivel: 70, requer: ['parceiroDeTreino'], acao: 'presenca', cd: 24, anim: 'consolar', desc: 'Satisfação, carinho e confiança sobem 20 de uma vez.' }),

  // ---- Sobrevivência
  H({ id: 'nadadeirasLigeiras', nome: 'Nadadeiras Ligeiras', arvore: 'sobrevivencia', tipo: 'passiva', nivel: 3, ranks: 3, atributo: { agilidade: 2 }, desc: '+2 de Agilidade por rank.' }),
  H({ id: 'estomagoBlindado', nome: 'Estômago Blindado', arvore: 'sobrevivencia', tipo: 'passiva', nivel: 6, ranks: 3, atributo: { vitalidade: 2 }, efeito: { resistenciaDoenca: 0.05 }, desc: '+2 de Vitalidade e −5% de chance de doença por rank.' }),
  H({ id: 'mapaMental', nome: 'Mapa Mental', arvore: 'sobrevivencia', tipo: 'passiva', nivel: 10, ranks: 3, requer: ['nadadeirasLigeiras'], efeito: { duracaoExp: 0.04 }, desc: 'Expedições 4% mais curtas por rank.' }),
  H({ id: 'sprintAbissal', nome: 'Sprint Abissal', arvore: 'sobrevivencia', tipo: 'ativa', nivel: 16, requer: ['mapaMental'], acao: 'sprint', cd: 24, anim: 'nadarParaTela', desc: 'Conclui a expedição em andamento agora.' }),
  H({ id: 'instintoDeSobrevivencia', nome: 'Instinto de Sobrevivência', arvore: 'sobrevivencia', tipo: 'especial', nivel: 26, requer: ['estomagoBlindado'], efeito: { sucessoSobrevivencia: 0.08, fuga: 0.05 }, desc: 'Escapa melhor dos perigos.' }),
  H({ id: 'banqueteRestaurador', nome: 'Banquete Restaurador', arvore: 'sobrevivencia', tipo: 'ativa', nivel: 32, requer: ['instintoDeSobrevivencia'], acao: 'banquete', cd: 12, anim: 'devorar', desc: 'Cura uma doença na hora.' }),
  H({ id: 'cartografo', nome: 'Cartógrafo do Desktop', arvore: 'sobrevivencia', tipo: 'poder', nivel: 75, requer: ['sprintAbissal', 'banqueteRestaurador'], efeito: { exploracao: 0.5 }, desc: 'Exploração das regiões rende 50% mais.' }),

  // ---- Fortuna das Profundezas
  H({ id: 'trevoDeAlga', nome: 'Trevo de Alga', arvore: 'fortuna', tipo: 'passiva', nivel: 3, ranks: 3, atributo: { sorte: 2 }, desc: '+2 de Sorte por rank.' }),
  H({ id: 'olhoDeLince', nome: 'Olho de Lince', arvore: 'fortuna', tipo: 'passiva', nivel: 6, ranks: 3, atributo: { percepcao: 2 }, desc: '+2 de Percepção por rank.' }),
  H({ id: 'faroDeSangue', nome: 'Faro de Sangue', arvore: 'fortuna', tipo: 'ativa', nivel: 12, requer: ['olhoDeLince'], acao: 'faro', cd: 24, anim: 'curioso', desc: 'Dá uma pista concreta de um segredo ainda não descoberto.' }),
  H({ id: 'cacadorDeTesouros', nome: 'Caçador de Tesouros', arvore: 'fortuna', tipo: 'passiva', nivel: 18, ranks: 3, requer: ['trevoDeAlga'], efeito: { sorteLoot: 0.02, moedasExp: 0.05 }, desc: '+2% de achados raros e +5% de JOJOcoins em expedições por rank.' }),
  H({ id: 'mapaDoTesouro', nome: 'Mapa do Tesouro', arvore: 'fortuna', tipo: 'ativa', nivel: 30, requer: ['cacadorDeTesouros'], acao: 'mapa', cd: 72, anim: 'tesouro', desc: 'A próxima expedição traz um artefato raro ou melhor.' }),
  H({ id: 'sextoSentido', nome: 'Sexto Sentido', arvore: 'fortuna', tipo: 'especial', nivel: 45, requer: ['faroDeSangue'], efeito: { chanceSegredo: 0.3 }, desc: 'Eventos secretos aparecem 30% mais.' }),
  H({ id: 'midasDasProfundezas', nome: 'Midas das Profundezas', arvore: 'fortuna', tipo: 'poder', nivel: 80, requer: ['mapaDoTesouro', 'sextoSentido'], efeito: { sorteLoot: 0.05, desfechoBom: 0.05 }, desc: 'Achados lendários e desfechos bons ficam mais prováveis.' }),

  // ---- Poderes lendários (nível alto, pré-requisitos de várias árvores)
  H({ id: 'despertarDoMegalodon', nome: 'Despertar do Megalodon', arvore: 'corpo', tipo: 'lendario', nivel: 100, custo: 3, requer: ['furiaDoMegalodon'], acao: 'despertar', cd: 72, anim: 'evolucao', desc: 'Por 1 hora: +20% XP de cuidados, foco e missões, energia e sede travadas no máximo.' }),
  H({ id: 'mentePrimordial', nome: 'Mente Primordial', arvore: 'mente', tipo: 'lendario', nivel: 110, custo: 3, requer: ['olhoDaTempestade'], efeito: { xpEstudo: 0.1, sucessoMental: 0.1 }, atributo: { inteligencia: 10, sabedoria: 10 }, desc: '+10 de Inteligência e Sabedoria, estudo e desafios mentais mais fortes.' }),
  H({ id: 'coracaoDoOceano', nome: 'Coração do Oceano', arvore: 'vinculo', tipo: 'lendario', nivel: 120, custo: 3, requer: ['presencaReconfortante'], efeito: { vinculoGanho: 0.15, confiancaPiso: 15 }, desc: 'Vínculo cresce bem mais rápido; a confiança nunca cai abaixo de 50.' }),
  H({ id: 'imortalDoRecife', nome: 'Imortal do Recife', arvore: 'sobrevivencia', tipo: 'lendario', nivel: 130, custo: 3, requer: ['cartografo'], efeito: { resistenciaDoenca: 0.4, quedaVida: 0.1 }, desc: 'Quase imune a doenças; sede e energia caem 10% mais devagar.' }),
  H({ id: 'reiDosSegredos', nome: 'Rei dos Segredos', arvore: 'fortuna', tipo: 'lendario', nivel: 140, custo: 3, requer: ['midasDasProfundezas'], efeito: { chanceSegredo: 0.5, pista: 0.2 }, desc: 'Segredos e pistas aparecem muito mais.' }),
  H({ id: 'tempestadeDeDentes', nome: 'Tempestade de Dentes', arvore: 'corpo', tipo: 'lendario', nivel: 160, custo: 4, requer: ['despertarDoMegalodon', 'imortalDoRecife'], efeito: { sucessoFisico: 0.1, sucessoSobrevivencia: 0.1 }, atributo: { forca: 15, resistencia: 15 }, desc: '+15 de Força e Resistência e desafios físicos dominados.' }),
  H({ id: 'olharDoAbismo', nome: 'Olhar do Abismo', arvore: 'fortuna', tipo: 'lendario', nivel: 180, custo: 4, requer: ['reiDosSegredos', 'mentePrimordial'], acao: 'olharAbismo', cd: 168, anim: 'aura', desc: 'Uma vez por semana revela e dispara um segredo raro elegível.' }),
  H({ id: 'lendaViva', nome: 'Lenda Viva', arvore: 'vinculo', tipo: 'lendario', nivel: 200, custo: 5, requer: ['coracaoDoOceano', 'tempestadeDeDentes'], atributo: { forca: 10, inteligencia: 10, agilidade: 10, resistencia: 10, carisma: 10, sorte: 10, vitalidade: 10, sabedoria: 10, disciplina: 10, percepcao: 10 }, desc: '+10 em todos os atributos. O topo da cadeia alimentar.' }),
]);

/** Combinações: com as duas habilidades, um bônus extra (é a "sinergia" da árvore). */
export const COMBOS = Object.freeze([
  { id: 'atletaCompleto', nome: 'Atleta Completo', requer: ['musculoDeAco', 'nadadeirasLigeiras'], efeito: { sucessoFisico: 0.04, duracaoExp: 0.03 } },
  { id: 'professorTubarao', nome: 'Professor Tubarão', requer: ['memoriaDeElefante', 'charmeDeEscamas'], efeito: { xpEstudo: 0.04, vinculoGanho: 0.03 } },
  { id: 'cacadorNato', nome: 'Caçador Nato', requer: ['olhoDeLince', 'mapaMental'], efeito: { pista: 0.05, sorteLoot: 0.02 } },
  { id: 'monge', nome: 'Monge do Recife', requer: ['meditacaoProfunda', 'focoDeCacador'], efeito: { tedioSobe: 0.08, xpFoco: 0.03 } },
  { id: 'enfermeiroDeAco', nome: 'Enfermeiro de Aço', requer: ['cuidadoDeMestre', 'estomagoBlindado'], efeito: { cura: 0.1, xpCuidado: 0.03 } },
  { id: 'sortudoDisciplinado', nome: 'Sorte Fabricada', requer: ['trevoDeAlga', 'disciplinaDeFerro'], efeito: { desfechoBom: 0.05 } },
  { id: 'tanque', nome: 'Tanque Abissal', requer: ['peleDeTubarao', 'instintoDeSobrevivencia'], efeito: { resistenciaDoenca: 0.1, sucessoSobrevivencia: 0.04 } },
  { id: 'sabioDasMares', nome: 'Sábio das Marés', requer: ['estrategiaFria', 'parceiroDeTreino'], efeito: { escolhaSabia: 0.06, xpMissao: 0.03 } },
]);

/** Maestrias: marcos de uso que dão bônus permanente (contadores do motor). */
export const MAESTRIAS = Object.freeze([
  { id: 'mestreExplorador', nome: 'Maestria: Explorador', conta: 'expedicoes', niveis: [10, 50, 150], efeito: { duracaoExp: 0.02, sorteLoot: 0.01 } },
  { id: 'mestreCuidador', nome: 'Maestria: Cuidador', conta: 'cuidados', niveis: [25, 150, 600], efeito: { xpCuidado: 0.02, vinculoGanho: 0.02 } },
  { id: 'mestreEstudioso', nome: 'Maestria: Estudioso', conta: 'estudos', niveis: [20, 120, 500], efeito: { xpEstudo: 0.02 } },
  { id: 'mestreFocado', nome: 'Maestria: Foco', conta: 'focos', niveis: [20, 120, 500], efeito: { xpFoco: 0.02, tedioSobe: 0.02 } },
  { id: 'mestreJogador', nome: 'Maestria: Minijogos', conta: 'vitorias', niveis: [15, 100, 400], efeito: { xpJogo: 0.03 } },
  { id: 'mestreCacador', nome: 'Maestria: Segredos', conta: 'segredos', niveis: [5, 20, 45], efeito: { chanceSegredo: 0.1, pista: 0.02 } },
  { id: 'mestreAlquimista', nome: 'Maestria: Fabricação', conta: 'fabricacoes', niveis: [5, 40, 150], efeito: { sorteLoot: 0.01 } },
  { id: 'mestreMissoes', nome: 'Maestria: Missões', conta: 'missoes', niveis: [10, 80, 300], efeito: { xpMissao: 0.02 } },
]);

export const HAB_POR_ID = new Map(HABILIDADES.map((h) => [h.id, h]));
