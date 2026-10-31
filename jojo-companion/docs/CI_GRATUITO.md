# CI Windows sem dependência do GitHub Actions

## Estado verificado em 2026-10-31

**Diretriz vigente: execução exclusivamente em nuvem. O computador do usuário está
excluído.** As referências ao agente próprio abaixo descrevem infraestrutura preservada;
ela só pode ser aproveitada em Windows em nuvem já autorizado e sem custo incremental.

Código privado: `oaovito/oao-companion-`, branch `codex/conversation-coherence`.
O endereço sem hífen final fornecido na missão retorna 404. Base preservada: `c0e07f8`.
Versão candidata **0.44.0**; publicada **0.43.1**. Nenhuma nova tag/release criada.

**Infraestrutura implementada, execução Windows ainda bloqueada por falta de acesso.**
Não foi criada conta, ativado trial/plano, anexada assinatura/cartão ou contratado serviço.
Não há execução em segundo plano nesta sessão: o agente descrito abaixo NÃO foi instalado.

| Prioridade | Disponibilidade efetivamente inspecionada | Resultado |
|---|---|---|
| Azure | Manifesto de identidades vazio, sem perfil/CLI Azure ou organização autenticada | Franquia real não pode ser consultada; template não ativado |
| CircleCI Free | Sem credencial/integração autenticada nesta sessão | Plano público compatível; conta/franquia real ainda não verificadas |
| Windows já existente em nuvem | Sem ambiente Windows selecionado ou conexão de identidade autorizada | Nenhuma execução nativa acessível; PC do usuário excluído |
| GitHub | Acesso ao código privado e canal público; consulta de webhooks negada com 403 | Não permite inferir existência/ausência de contas CI externas |

O ambiente permite GitHub e HTTPS, mas isso não concede identidade Azure/CircleCI nem
acesso a Windows em nuvem. Não ler arquivos secretos, reutilizar credencial GitHub como login
de outro serviço ou solicitar senhas/tokens no chat.

## Pesquisa das opções gratuitas

Fontes oficiais consultadas por HTTPS nesta sessão:

- [Azure: parallel jobs](https://learn.microsoft.com/en-us/azure/devops/pipelines/licensing/concurrent-jobs?view=azure-devops):
  franquia privada de um job, 1.800 minutos/mês e 60 min/job quando habilitada. A documentação
  atual associa a concessão a uma organização com assinatura Azure vinculada/billing.
  **Não fazer essa vinculação nesta missão.** Só aproveitar se já disponível e autorizada.
- [CircleCI: preços](https://circleci.com/pricing/), [planos](https://circleci.com/docs/guides/plans-pricing/plan-overview/)
  e [créditos](https://circleci.com/docs/guides/plans-pricing/credits/): Free permanente,
  sem cartão, 30.000 créditos/mês para uso não público; interrompe jobs ao esgotar.
  Inclui Windows. Franquias de transferência/armazenamento também consomem créditos;
  não confundir com minutos Linux ou assumir plano real sem autenticação.
- [CircleCI Windows](https://circleci.com/docs/guides/execute/using-windows/):
  `windows-server-2022-gui:current`, `windows.medium`, quatro CPUs/16 GB.
- [AppVeyor](https://www.appveyor.com/pricing/): gratuito apenas para projetos públicos;
  privado exige plano pago ou trial de 14 dias. Excluído.

Nenhuma opção externa foi declarada operacional sem login e execução. Templates em
`ci/providers/` estão fora da descoberta automática e têm autorização padrão **false**.
Não habilitar dois provedores ao mesmo tempo. Não usar trials, VMs novas pagas ou tornar
o código público. Quando houver autorização externa, o Codex consulta o plano real,
configura a integração privada/retencão e habilita gatilhos de branch/tag autonomamente.

## Executor único, já implementado

`ci/windows.cmd` inicia `ci/windows.ps1`, que prepara Node **22.23.4** por usuário,
com ZIP/SHA-256 oficiais fixados em `ci/windows-toolchain.json`. Usa Git existente
identificável (mínimo 2.39, preservando seu gerenciador de credenciais) ou MinGit
portátil verificado. Não instala ferramentas globais, serviços, Wine ou PowerShell 7.
A política RemoteSigned é por processo; não altera políticas corporativas/máquina.

`ci/windows.mjs` faz, uma única vez e sequencialmente:

1. Preflight: sessão Windows x64 interativa, conta de testes isolada, sem instalação,
   dados, atalho ou processo JoJo anterior. Não automatizar testes de mouse na sessão
   em que alguém está trabalhando; o agente não desbloqueia o Windows nem cria contas.
2. Lint sintático JavaScript/JSON e `npm ci` com lockfile/integridade npm.
3. Todos os unitários (mínimo 312, sem falhas/pulos), com TAP e JUnit.
4. Build portátil/NSIS/ZIP; instalação silenciosa NSIS em destino temporário,
   inicialização real e desinstalação; smoke portátil e vigia/crash/atalho.
5. As 16 integrações Windows e 29 E2E, sem pulos; auditoria das 1.043 animações.
6. Medição CPU/memória; comparação GPU e pesquisa real continuam diagnósticos opcionais,
   como no pipeline anterior, com resultado/log preservado.
7. Ollama Windows verificado, pesos reais e 30 casos no motor mais dez pela Central.
   Mesmos testes e modelo do aplicativo; relatório/digest obrigatório. Ler cada fala:
   checagem lexical não comprova perfeição semântica.
8. Nomes/MZ/PK/tamanhos/SHA-256 dos três arquivos, compatibilidade do atualizador com
   metadados de teste derivados dos binários e notas incrementais da versão.

O produto em `src/` não foi alterado para facilitar testes. Os scripts existentes
foram reutilizados. Mudanças de teste são saída TAP/JUnit, diretório de relatório,
cache/porta isolada e limpeza restrita aos PIDs/arquivos criados pelo próprio teste.
As definições anteriores estão em `ci/legacy/github-actions/`, sem gatilhos ativos.

## Cache, concorrência e evidências

- Cache privado local: npm, Electron, builder, ZIP Ollama e pesos. ZIPs conferidos
  antes de extrair; pull verifica/reutiliza blobs. Porta loopback de CI é temporária,
  sem alterar a porta do aplicativo. Não apagar modelos/dados da usuária.
- Bootstrap usa mutex; executores usam lock por máquina, com PID e recuperação de
  processo encerrado. Timeouts encerram somente a árvore do processo iniciado.
- Logs filtram credenciais antes de gravar, inclusive texto dividido entre chunks.
  Testes/build não recebem o token de publicação. Nunca publicar relatórios/fonte no
  canal público; apenas os três binários e notas incrementais.
- `jojo-companion/out/windows-ci/<commit>-<tempo>/`: logs, TAP/JUnit, JSON, animações,
  conversa, notas e `validation.json`, com commit/versão/plataforma/gates/hashes.
  `summary/` guarda resultados atuais, inclusive falhas. Retenção local: três execuções,
  no máximo 14 dias. Binários permanecem em `dist/`; relatórios não são builds fictícios.
- Templates publicam relatórios somente no projeto privado. Retenção remota depende
  da configuração da conta ainda não conectada. CircleCI não envia os 5 GB de runtime/
  pesos ao cache remoto, respeitando melhor a franquia de armazenamento.

## Automação própria e publicação

Em Windows EM NUVEM já autorizado, sem custo incremental e com autenticação Git existente,
`ci/register-windows-agent.ps1` registra tarefa do usuário, sem elevação, acionada no
logon interativo. Não substitui tarefa existente. O Codex pode instalar/operar isso
quando tiver acesso à máquina; não depende de runner registrado no Actions.

O agente consulta o Git privado a cada 120 s em clone próprio, sem reset/force-push
ou descarte de alterações. Valida novos commits e identifica tags novas acima da
versão pública. Guarda tentativas para não repetir publicação parcial. Reutiliza
validação anterior somente se commit/tag/checkout/artefatos ainda corresponderem;
caso contrário exige nova execução. Não considerar o agente ativo antes de instalá-lo.

Modo padrão: **validate**. Modo **release**: tag explícita `v0.44.0`, já criada no
commit validado, e autorização de escrita no canal público fornecida por mecanismo
seguro do executor (`RELEASES_TOKEN`). O segredo existente no Actions não é extraível
nem automaticamente transferido. O acesso GitHub atual anuncia escrita no público;
a mesma autoridade precisa estar disponível de forma segura no executor escolhido.

O publicador exige Windows real, checkout limpo/origem correta, tag/commit, relatório
com todos os gates aprovados e SHA-256 dos arquivos ainda iguais. Ignora variáveis de
referência do Actions; não permite publicação somente por definir GITHUB_REF_TYPE.
Release/tag pública existente continua proibida. Faz uploads em rascunho, confere os
três assets, publica e baixa anonimamente para conferir hashes; depois consulta o
UpdateChecker com a versão anterior, nos modos portable/installer, e com a nova versão.
Nada altera as 17 releases históricas.

## Verificação efetivamente feita

- **312/312** testes de lógica, sem falhas/pulos, no Node **22.23.4**, com TAP/JUnit
  gerados. Isso é validação complementar no host, sem executar o aplicativo Linux.
- Lint sintático JavaScript/JSON, YAML dos templates e parser dos cinco scripts
  PowerShell passaram. O parser não executa APIs Windows/NSIS/Agendador.
- Bootstrap/toolchain tiveram URLs/checksums conferidos em fontes oficiais.
- **Não executados nesta missão:** instalação Windows, integração/E2E gráficos,
  modelo Windows, empacotamento final, publicação e atualização instalada real.

**Dependência restante:** conectar um executor Windows gratuito autorizado EM NUVEM — conta
CircleCI Free autenticada, organização Azure com franquia já habilitada, ou Windows
em nuvem já existente/autorizado com sessão isolada e custo incremental zero.
Não usar o computador do usuário. Não falta comando manual do usuário.
Sem essa conexão, manter a versão 0.44.0 bloqueada. Não declarar missão concluída nem
publicar usando os testes anteriores ou os testes complementares do host.

## Retomada cloud-only a partir de 3f637fe

A investigação Azure/CircleCI/AppVeyor acima foi reaproveitada: mesma data e nenhuma
mudança de credenciais ou de plano observável. Não foram repetidos testes, downloads
de toolchain ou desenvolvimento do aplicativo. Foram rechecados apenas o HEAD remoto,
o estado atual das identidades e as opções que faltavam na pesquisa anterior.

### Disponibilidade atual, sem assumir autorização a partir de arquivos

- Ambiente com `observations_current=true`, sem capacidades Windows, identidades
  externas, segredos CI ou conexões no manifesto. VPN não configurada.
- Há variáveis/arquivos padrão AWS/GCP, mas nenhum vínculo de identidade pronto ou
  alias autorizado; não foram lidos segredos nem enumeradas contas/VMs desconhecidas.
  A existência de um caminho de credenciais não prova acesso autorizado a uma nuvem.
- CircleCI `/api/v2/me` e GitLab `/api/v4/user` retornaram **401**, sem credenciais
  enviadas. Sem login, não é possível consultar plano, saldo, verificação da conta ou
  capacidade real de executar. O GitHub autenticado não autoriza login em outro serviço.
- `3f637fe` não tem check runs nem statuses externos. Isso não prova que o titular não
  tenha contas CI; apenas não fornece uma integração operacional acessível nesta sessão.

### Provedores adicionais consultados

| Opção | Windows / franquia documentada | Autenticação/cartão / decisão |
|---|---|---|
| GitLab.com | Windows 2022 **Free**, Beta, `saas-windows-medium-amd64`, 2 CPUs/7,5 GB; 400 minutos de compute/mês, fator Windows 1 | Sem conta autenticada/saldo verificável. Verificação pode exigir email, telefone ou cartão conforme risco. Integração direta de repositórios externos é Premium/Ultimate; não habilitar plano pago nem criar espelho do código por iniciativa própria |
| AWS CodeBuild | Franquia de 100 minutos em `general1.small`/`arm1.small` e franquia Lambda; Windows usa Medium/Large ou superiores | Os tipos Windows necessários não estão nessa franquia. Reserved Capacity não tem Free Tier. Sem identidade AWS pronta; não criar recursos/assinatura |
| Travis CI | Windows existe, mas não há franquia privada permanente confirmada na documentação consultada | Página marca Free Trial indisponível e descreve créditos de trial de 14 dias/cartão; não elegível e sem autenticação disponível |
| Bitrise | Hobby anuncia um app privado, 300 créditos/mês, 90 min/build, sem cartão; catálogo consultado menciona macOS/Linux | Windows nativo não foi confirmado. Não tratar Free como prova de executor Windows; não selecionado |
| Cirrus CI | Não foi possível validar a documentação nesta rede | Acesso ao FAQ recebeu 403 no proxy; não contornar o bloqueio nem assumir franquia compatível |
| TeamCity Cloud | Não foi possível confirmar franquia permanente Windows privada nas páginas recuperadas | Página de preços sem tabela extraível; URL de licenciamento retornou 404. Não afirmar disponibilidade nem iniciar trial |

Fontes novas, consultadas por HTTPS:

- [GitLab Windows](https://docs.gitlab.com/ci/runners/hosted_runners/windows/),
  [compute](https://docs.gitlab.com/ci/pipelines/compute_minutes/),
  [identidade](https://docs.gitlab.com/security/identity_verification/) e
  [integração externa](https://docs.gitlab.com/ci/ci_cd_for_external_repos/).
- [CodeBuild preços](https://aws.amazon.com/codebuild/pricing/) e
  [tipos de compute](https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-compute-types.html).
- [Travis billing](https://docs.travis-ci.com/user/billing-overview/),
  [Bitrise preços](https://bitrise.io/pricing),
  [Cirrus FAQ](https://cirrus-ci.org/faq/) e [TeamCity preços](https://www.jetbrains.com/teamcity/buy/).

### Autorização externa indispensável

Primeiro, acesso autenticado a uma organização Azure DevOps cuja franquia Windows já
esteja habilitada, com permissão de consultá-la e configurar/executar o pipeline privado.
Se não estiver disponível, a opção mais viável já preparada é **CircleCI Free**:
conexão autenticada que permita consultar plano/saldo reais, administrar o projeto CI e
autorizar a integração GitHub apenas para `oaovito/oao-companion-`. O canal público precisa
de autorização de escrita segura para o publicador, sem revelar valores de credenciais.

Essa é uma autorização de conta/integração externa, não um comando técnico manual.
Sem ela, o Codex não pode comprovar a franquia da conta, alocar Windows ou ativar o
template legitimamente. O template CircleCI continua em `ci/providers/circleci.yml`,
fora da descoberta automática e com `free_windows_authorized=false`; Azure também
permanece desativado. Nada foi contratado, nenhuma VM foi criada e nenhum serviço pago
foi ativado. Não há pipeline Windows nem agente remoto em execução.

Os 312 testes e toda a implementação de `3f637fe` foram preservados. Nenhuma nova
execução Windows, build ou publicação foi declarada; a versão pública segue v0.43.1.
