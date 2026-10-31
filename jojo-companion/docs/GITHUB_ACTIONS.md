# GitHub Actions — CI/CD oficial e recuperação

## Decisão atual

Somente runners oficiais hospedados pelo GitHub. Azure, CircleCI, outros provedores,
agentes de consulta e runners locais foram abandonados. Configurações/instaladores
alternativos foram removidos depois de confirmar que não são importados pelo aplicativo.
O histórico Git preserva o trabalho anterior.

Desenvolvimento privado: `oaovito/oao-companion-`, branch `codex/conversation-coherence`.
Público: `oaovito/jojo-companion-releases`, exclusivamente os três binários e notas.
Candidata **0.44.0**; publicada **0.43.1**, com 17 releases históricas imutáveis.

## Workflows restaurados

- `.github/workflows/jojo-windows.yml`: workflow Windows oficial. Reutiliza as suítes,
  build e publicador originais; `scripts/actions-windows.mjs` apenas reúne os gates e
  relatórios no MESMO job. Recusa execução fora de `github-hosted` Windows x64.
- `.github/workflows/jojo-conversation-windows.yml`: avaliação de modelo preservada,
  somente por dispatch explícito. Não duplica o ensaio real do CI oficial por push.
- `.github/workflows/jojo-recovery.yml`: controle leve, cron **`17 * * * *`**, a cada
  60 minutos, no minuto 17 UTC. Usa apenas API/Node no runner oficial Ubuntu, sem
  compilar ou executar o aplicativo nesse sistema. Timeout de três minutos.

GitHub só agenda cron da branch padrão. `main` recebe SOMENTE os arquivos de controle
(workflows, helper, política e instruções); o README/histórico são preservados. O código
completo continua na branch Codex. Dispatch de `main` faz checkout da branch correta.
Mudanças futuras no controle precisam ser sincronizadas na branch padrão, sem copiar
código privado para o repositório público. Nenhum commit de polling é criado.

## Gates que continuam obrigatórios

Preflight de sessão isolada; lint JS/JSON; instalação com lockfile; todos os unitários
(mínimo **323**, incluindo os 312 anteriores); build portátil/NSIS/ZIP; instalação,
inicialização e desinstalação NSIS; smoke portátil; vigia/crash/atalho; 16 integrações
nativas; 29 E2E; 1.043 animações no renderer; desempenho; 30 cenários do engine e dez
da Central com Ollama/modelo reais; nomes/MZ/PK/tamanhos/SHA-256; compatibilidade do
atualizador; changelog incremental. Nenhuma suíte foi removida ou substituída por Linux.
Pesquisa real e comparação GPU permanecem diagnósticos opcionais como no workflow original.

Node 22.23.4 fixado em `actions/setup-node`; cache npm original reaproveitado. Mantidos
SHA-256 do runtime, cache no job, logs filtrados, TAP/JUnit/JSON, fonte/commit/run ID e
hashes dos artefatos. Relatório de publicação só é aceito no MESMO run oficial GitHub.
Upload de artefatos do CI é opcional, retenção de um dia; não depende dele para publicar
os binários validados no mesmo job. Não remover artefatos/releases antigos para obter cota.

## Recuperação e idempotência

O controle consulta a release 0.44.0, a versão/atualizador na branch de desenvolvimento
e o histórico do workflow Windows. Não baixa executáveis a cada hora.

- Release já existente com os três metadados esperados: não recriar. Rascunho/release
  incompleta exige inspeção; nunca substituir arquivos, notas ou tags existentes.
- Pipeline ativo/na fila: não disparar outro. Grupo de concorrência único serializa
  validação/publicação; o GitHub substitui pendências redundantes, sem interromper publicação.
- Falha antes de iniciar runner: pode tentar na próxima hora, com intervalo mínimo de
  55 minutos para evitar sobreposição/jitter do cron. Sem loops ou polling agressivo.
- Falha técnica do mesmo commit após começar os passos: não repetir builds pesados a
  cada hora; requer correção real/commit novo. Cancelamento explícito é preservado.
- Sucesso sem release verificada: inspecionar, não reconstruir/publicar às cegas.
- Commit novo pode executar. Correções de código são feitas pelo Codex quando houver
  sessão e logs acessíveis; não existe agente IA contínuo ou serviço pago no workflow.

Depois dos gates verdes, a versão pendente 0.44.0 já autorizada pelo usuário pode ser
publicada automaticamente. O helper confere relatório/arquivos e que a branch não
avançou; cria a NOVA tag privada com `GITHUB_TOKEN`. Essa criação não aciona outro
build, evitando duplicação. Tag existente divergente nunca é movida. O publicador usa
`RELEASES_TOKEN` somente no passo final, valida uploads em rascunho e depois downloads
anônimos/SHA-256 e UpdateChecker nos dois modos. Outra versão exige nova autorização
e atualização da política de versão pendente; push genérico não autoriza outra release.

## Custo adicional R$ 0 e limite técnico do agendamento

Não foram cadastrados cartões, alterados limites ou contratados planos. As APIs de
faturamento/uso retornaram **403**. A anotação antiga é ambígua:

> The job was not started because recent account payments have failed or your spending limit needs to be increased.

Isso NÃO permite concluir se é franquia esgotada, orçamento atingido ou pagamento
recusado. O classificador só distingue causas quando a mensagem for inequívoca.
Não presumir liberação automática caso haja pendência financeira.

Um cron privado também precisa de runner e pode consumir minutos. Por isso os jobs
possuem `COST_GATE` antes da alocação, atualmente fechado, e
`ci/actions-cost-policy.json` registra `paidUsageBlockedConfirmed=false`. As permissões
atuais também não permitem gerenciar variáveis de repositório (403).

Falta confirmação única de que a CONTA realmente bloqueia TODO gasto pago de Actions
em zero (incluindo runners/armazenamento). A autorização de gastar R$ 0, sozinha,
não informa a configuração financeira efetiva. Foi solicitada essa informação ao
titular; não criar confirmação fictícia ou abrir o gate por decurso de tempo.

Quando houver confirmação confiável, registrar a evidência na política e habilitar
os três `COST_GATE`, sincronizando o controle na `main`. Não alterar o orçamento real.
Depois disso não se exige intervenção recorrente: o GitHub tentará no cron quando
aceitar execuções, sempre sujeito ao bloqueio financeiro e à franquia disponível.

**Enquanto o gate ou o próprio GitHub estiver bloqueado, a rotina NÃO está operacional.**
Cron é best effort: pode atrasar/deixar de rodar. Não há mecanismo GitHub sem runner
que consulte APIs de faturamento por hora; não afirmar monitoramento ativo antes de
observar uma verificação executada. Dispatch com jobs pulados só verifica o registro
do workflow, não a disponibilidade de Windows nem a qualidade do aplicativo.

## Validação e continuidade

- Testes locais de lógica: **323/323**, sem falhas/pulos; 11 novos casos de recuperação,
  idempotência, custo e proteção de tags/releases. Não equivalem a Windows.
- Workflows validados com `actionlint` 1.7.12, download com SHA-256 conferido.
- Ainda pendentes: primeira execução efetiva dos gates Windows, build 0.44.0 e publicação.
- Consultar HANDOFF para commits, resultado do primeiro dispatch e estado da instalação
  do controle na branch padrão. Não declarar a transferência/release concluída sem isso.
