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

## Próximos gates

1. Diagnóstico oficial assets_only/measure_assets=false: 10 cenários novos Windows.
2. Medir/auditar toda a arte com measure_assets=true; recuperar JSON com SHA-256
   conferido dos logs se o upload falhar. Importar somente a medida real.
3. Testes puros completos, lint e pipeline integral Windows (39 E2E, 16 integração,
   31 engine +12 Central Gemma real, build NSIS/portátil/ZIP, instalação, desempenho,
   hashes, atualizador e notas incrementais).
4. Ensaio autenticado iCloud com conta autorizada, secrets por canal seguro.
   Passo final isolado exige isso e bloqueia relatório/publicação sem prova real.
5. Somente após TODOS os requisitos/gates, habilitar a candidata na política de
   publicação oficial. Nunca publicar parte da missão nem reescrever as 18 releases.

A API apresentou 401 transitório nesta sessão; Git e API voltaram a responder.
Nenhuma senha/token foi solicitado no chat ou gravado no projeto. MNE_Lab intocado.
