# Missão ativa — JoJo Companion 0.45.0

Estado: EM VALIDAÇÃO, sem publicação nova.

**Correção vigente do usuário (02/11): agenda somente por link, sem login/senha.**
Substitui a exigência anterior de conta autorizada e o gate icloud-live. Nenhuma
credencial externa é necessária agora. Campo de link/GET sem autenticação,
persistência, sincronização, erros e desconexão implementados; sete testes novos
de lógica e cenário Windows completo pela interface preparados. Suíte esperada:
411 unitários, 40 E2E. As evidências abaixo anteriores a essa correção são históricas.
Não solicitar os secrets iCloud; continuar pela validação do novo fluxo e publicação. Política da candidata 0.45.0
aponta à branch codex/living-companion; só cria tag e publica se TODOS os gates
Windows do MESMO run passarem. O cron na main será sincronizado após publicação,
sem iniciar validações pesadas duplicadas.

 Branch codex/living-companion.
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

## Validação integral da aplicação — 02/11/2026

Run **41374307060**, fonte **502ba0fd385131dae1ea31512448416d67969162**,
GitHub-hosted Windows x64/Node 22.23.4. Todos os gates anteriores à conta iCloud
PASSARAM no mesmo commit/run: preflight, lint, npm ci, **404 unitários**, conversa
**31 engine +12 Central com Gemma 3 4B real**, build dos três formatos, NSIS
instalado/iniciado/desinstalado e três atualizações com atalho/dados preservados,
portátil, vigia, **16 integrações nativas**, **39 E2E**, **1.268 animações**,
desempenho, GPU/pesquisa opcionais, integridade dos arquivos, compatibilidade do
atualizador e notas incrementais. Sem pulos nas suítes obrigatórias.

Todas as 43 falas reais foram recuperadas, hash conferido e lidas; screenshot da
Central revisado. Evidência sintética, sem conta ou dados pessoais:
`evidencias/conversa-windows-41374307060.json`, digest do conteúdo
`4abf120254848b6f5cbfe8dab009deff0ad2df4d96921c13020e6961ecc41546`.
Isso comprova esses cenários, não perfeição geral do modelo nem teste físico no PC.
A detecção DD foi validada com fixture nativa, não com uma cópia comercial do jogo.

**Resultado global: BLOQUEADO** no último passo `icloud-live` exclusivamente por
JOJO_ICLOUD_USER/JOJO_ICLOUD_APP_PASSWORD ausentes no job. Nenhuma autenticação
Apple real ocorreu. Exigência do próprio pedido: REQUISITOS_0.45.0.md, linha 798.
Não remover o gate, fingir conta ou solicitar senha no chat. Necessária conta de
teste autorizada, com senha específica de aplicativo pelos secrets seguros do
repositório. As credenciais só chegam ao passo final isolado, não ao npm/build.

**Armazenamento CI também esgotado**: upload recusado por `Artifact storage quota
has been hit`; API confirma zero artefatos preservados nesse run. Os três binários
foram gerados/validados no runner, mas NÃO estão disponíveis para baixar e NÃO foram
publicados. Não apagar releases/artefatos históricos nem comprar armazenamento.
Resumo do run está no GitHub; o workflow agora também imprime o JSON sanitizado
em logs privados, para preservar status/hashes mesmo sem upload em futuras execuções.
Essa última mudança é de relatório, não altera o aplicativo validado em 502ba0f.

API timing: WINDOWS total_ms=0, duração total 1.812.000 ms. Nenhum plano/cartão/limite
foi alterado. A configuração financeira da conta segue sem acesso pela API; esse
resultado não equivale a verificar a fatura ou confirmar orçamento pago zero.

## Continuidade necessária

1. Disponibilizar a conta iCloud autorizada por canal seguro. A API de Secrets não
   está autorizada para o Codex; não pode criar valor que não foi fornecido.
2. Com essa dependência resolvida, retomar o workflow oficial e verificar o ensaio
   real. Regerar os binários no MESMO run que possa publicar; não reaproveitar
   hashes de outra execução nem simular o resultado ausente. Upload CI é opcional
   e não bloqueia a publicação direta dos três binários validados no mesmo job.
3. Somente com TODOS os gates/requisitos aprovados, atualizar a política oficial de
   publicação para 0.45.0/branch de fonte correta, integrar/publish pelo mecanismo
   existente e verificar downloads públicos/anônimos + atualizador. A política
   horária continua em 0.44.0; não haverá tentativa pesada recorrente sem credencial.
4. As **18 releases permanecem iguais** ao snapshot inicial (ID, tag, texto,
   publicação e IDs/nomes/tamanhos/digests/updated_at dos assets); última v0.44.0.
   Nenhuma tag/release 0.45.0 criada. MNE_Lab intocado; somente GitHub oficial.

Não repetir desenvolvimento, medição ou builds enquanto a dependência externa não
mudar. Código da aplicação validado: 502ba0f; commit posterior só registra evidências
 e melhora retenção do relatório. Não prometer execução contínua do Codex.

A API apresentou 401 transitório nesta sessão; Git e API voltaram a responder.
Nenhuma senha/token foi solicitado no chat ou gravado no projeto. MNE_Lab intocado.
