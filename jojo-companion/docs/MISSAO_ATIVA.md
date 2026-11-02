# Missão ativa — JoJo Companion 0.45.0

Estado: EM VALIDAÇÃO, sem publicação nova. Branch codex/living-companion.
Base: 4193c2b; publicada 0.44.0, histórica e imutável. Os três pedidos são cumulativos.

## Implementação atual

Clima dedicado Open-Meteo com erros/cache/cidade/fuso; agenda com estados reais e
CalDAV iCloud somente leitura/seleção/DPAPI; To-Do completa; Darkest Dungeon DD1
Steam com tempo ativo/XP/histórico; cuidados persistentes, seis raridades, 50 comidas
novas/56 totais; 20 animações de necessidades; 50 cenas novas de memes/profissões;
anatomia de nadadeiras/cauda; ícone novo; atalhos conservadores; Discord no foco.

Documentação: TAREFAS.md, AGENDA_ICLOUD.md, CUIDADOS.md e CENAS_E_FOCO.md.
Continuidade das implementações anteriores no Git, sem sobrescrever trabalho.

## Evidências verificadas e limites

- 41345465266 /17ea015: 351 unitários Windows passaram. Conversa real 30/31,
  falha manga/maçã; correção literal com regressões implementada, ensaio real pendente.
- 41348359021 /2847e41: 1.058 animações com anatomia de nadadeiras auditadas;
  zero erros/recortes/paradas/órfãs, média 0,31 ms. Não valida a arte posterior.
- 41349371481 /e449b57: 4 To-Do + detector DD1 nativo de fixture passaram.
  DPAPI falhou no import dinâmico do harness, corrigido para usar factory de teste.
- 41363120886 /6ea26c7: 6/7 passaram, incluindo DPAPI Windows REAL, DD1,
  cuidados/56 alimentos/HUD e 3 casos To-Do. O caso restante comparava XP total
  após descoberta legítima +1; agora exige exatamente 10 XP da fonte todo e
  idempotência dessa fonte. Repetir o cenário após a correção.
- Cenários novos de Discord (.exe de fixture), atalhos (.lnk real em diretórios
  fictícios) e 50 cenas preparados. Não afirmar que passaram antes de observar CI.
- Catálogo atual: 1.268 animações. Medidas de 75 receitas-base novas ainda faltam
  em jojo.room.json; gate de cobertura falha por isso, sem mascarar ou inventar limites.
- Quota de artefatos CI esgotada; uploads opcionais e medidas/preview têm fallback
  em logs privados. Sem alteração financeira ou remoção de releases históricas.

- 41366167751 /3ec3bcf: 8/10 novos cenários passaram. Discord precisava
  limitar WM_CLOSE às janelas visíveis e aguardar saída assíncrona; atalhos tinham
  comparação textual de caminho DOS 8.3 versus caminho longo. Causas corrigidas.
- 41366600620 /ea3b09a: TODOS os 10 cenários novos Windows passaram, sem pulos.
  Inclui fechamento normal/força opt-in/cancelamento do Discord e .lnk reais.
  Depois disso foram acrescentados preview das 75 receitas, silêncio do XP no Foco
  e ensaio NSIS com três atualizações; ainda exigem validação do novo commit.
- Atualizador agora passa --updated ao NSIS, necessário para preservar preferências
  de atalhos em instalações com diretório configurável. Teste puro de aplicação passou.
- Última suíte completa local: 397 testes, 396 passaram; único reprovado foi medida
  Windows ausente. Com o novo teste NSIS, total esperado 398. Não ignorar a falha.

- 41367076224 /474bff2: medição real de 434 bases e auditoria das 1.268 animações
  PASSARAM; zero erros/recortes/paradas/órfãs, média 0,43985 ms. Os 10 cenários
  Windows também passaram. JSON recuperado dos logs privados e hash conferido:
  45a74560433377127ddabb567e8d22753d5bed2d2942c023423b2b0c38976287.
- Medidas reais importadas; 401/401 testes locais passaram, sem pulos.
- Depois da medição: filas persistentes de celebração DD (adiadas até fechar jogo,
  sem invadir foco), ícone local antes de encerrar Discord, recuperação de atalho
  após permissão e preservação de ícone personalizado/casing Windows. Testes de
  regressão passaram; pipeline integral do próximo commit ainda necessário.
- API timing do run 41367076224 informa WINDOWS total_ms=0. Não foi alterado
  plano, cartão ou limite. APIs financeiras não permitem confirmar a configuração
  de cobrança da conta; não extrapolar esse resultado observado a todo consumo.

- Pipeline integral 41369897754 /727166a: preflight/lint/install/401 unitários
  Windows passaram. Conversa 30/31: a correção manga estava correta, mas um
  atalho impediu inferência nesse turno, exigida pelo teste. Fluxo corrigido para
  executar o modelo com dados explícitos de termo afirmado/negado e fallback
  identificado como programado se falhar. O teste real continua exigindo IA,
  sem aceitar o fallback como inferência. 401/401 testes locais passaram.
- Evidência de conversa agora também é compactada/hasheada nos logs privados,
  permitindo recuperar todas as falas apesar da cota de artefatos.

- 41371161554 /34f68f4: 401 unitários Windows passaram, conversa 30/31.
  Desta vez Gemma respondeu “Manga, confirmado. Sua memória é impressionante.”
  corretamente, mas o classificador tratou QUALQUER menção a memória como dúvida.
  Corrigido para diferenciar reconhecimento de contestação, com testes positivos
  e negativos PT/EN. Teste real continua obrigatório e sem aceitar fallback como IA.
- Novas regressões reproduziram alimentação atrasada sobre acolhimento e novo turno.
  Corrigidas por contexto visual e proteção temporária da conversa importante,
  cancelando comida/balão anterior, poses automáticas e notificações de XP.
  Dados e recompensas reais permanecem registrados; foco também não exibe comida.
  403/403 testes locais passaram. Cenário nativo de cuidados estendido para isso.
- Não houve cancelamento do run 41371161554: ele já estava concluído com falha
  quando a solicitação de cancelamento foi feita. Não confundir com run cancelado.

- 41373138263 /55d1b7a: 403 unitários Windows e TODOS os 31 cenários engine
  com Gemma real passaram. Falas recuperadas dos logs privados e lidas. A Central
  falhou no segundo turno: cuidados interceptava “você está bem?” como atributos.
  Roteamento agora só intercepta perguntas explícitas sobre fome/saúde/higiene/humor.
  Perguntas sociais continuam no modelo. Teste real não foi alterado.
- Regressão adicional reproduziu refeição antiga voltando após entrar/sair rapidamente
  do Foco. Transições para Foco/Trabalho/suspensão/tela cheia invalidam contexto visual
  antigo e limpam efeitos. Nenhuma perda de consumo/XP. Suíte atual: 404 testes.

## Próximos gates

1. Concluir pipeline INTEGRAL no novo commit: 404 unitários, 39 E2E, 16 integração,
   31 engine +12 Central Gemma real, build NSIS/portátil/ZIP, instalação e três
   atualizações, desempenho, hashes, atualizador e notas incrementais.
2. Ensaio autenticado iCloud com conta autorizada, secrets por canal seguro.
   Passo final isolado exige isso e bloqueia relatório/publicação sem prova real.
3. Somente após TODOS os requisitos/gates, habilitar a candidata na política de
   publicação oficial. Nunca publicar parte da missão nem reescrever as 18 releases.

Medição e diagnóstico de dez cenários já concluídos; NÃO repetir sem mudar arte.

A API apresentou 401 transitório nesta sessão; Git e API voltaram a responder.
Nenhuma senha/token foi solicitado no chat ou gravado no projeto. MNE_Lab intocado.
