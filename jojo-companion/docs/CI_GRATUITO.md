# CI Windows sem dependência do GitHub Actions

## Estado verificado em 2026-10-31

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
| Windows próprio | Sem ambiente Windows selecionado, VPN, configuração SSH ou agente SSH | Máquina não acessível; nenhuma execução nativa possível |
| GitHub | Acesso ao código privado e canal público; consulta de webhooks negada com 403 | Não permite inferir existência/ausência de contas CI externas |

O ambiente permite GitHub e HTTPS, mas isso não concede identidade Azure/CircleCI nem
acesso ao PC Windows. Não ler arquivos secretos, reutilizar credencial GitHub como login
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

Em máquina Windows já autorizada e com autenticação Git existente,
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

**Dependência restante:** conectar um executor Windows gratuito autorizado — conta
CircleCI Free autenticada, organização Azure com franquia já habilitada, ou máquina
Windows própria acessível com sessão isolada. Não falta comando manual do usuário.
Sem essa conexão, manter a versão 0.44.0 bloqueada. Não declarar missão concluída nem
publicar usando os testes anteriores ou os testes complementares do host.
