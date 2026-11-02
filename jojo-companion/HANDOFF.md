# HANDOFF — JoJo Companion

## Missão ativa: 0.45.0 em implementação

Branch `codex/living-companion`, baseada em `4193c2b`. A 0.44.0 continua publicada;
nenhuma publicação 0.45.0 foi autorizada pelo pipeline ou realizada. Requisitos
cumulativos, estado e pendências em [MISSAO_ATIVA](docs/MISSAO_ATIVA.md), incluindo
o prompt mestre, Darkest Dungeon e a lista de tarefas. Não encerrar após apenas P0.
Clima/CalDAV/To-Do/Darkest/cuidados/50 alimentos novos/50 cenas/Discord/atalho foram
implementados. Evidências Windows anteriores: run 41363120886 passou 6/7 casos;
falha restante era comparação de XP total (descoberta legítima +1), agora verifica
somente a fonte de tarefas. DPAPI real, detector DD1 de fixture, cuidados e três
casos de tarefas passaram nesse run. Não extrapolar esse resultado ao código novo.

Runs 41366600620 e 41367076224 aprovaram os 10 cenários novos Windows.
A auditoria 41367076224 aprovou 1.268 animações (0 erros/recortes/paradas/órfãs,
0,44 ms por desenho); medidas reais importadas com hash conferido.
404/404 testes puros locais passaram após novas regressões de contexto/acolhimento. Total E2E esperado no pipeline integral: 39.
Catálogo agora tem 1.268 animações. A medição desta arte foi importada: não inventar limites em futuras mudanças
nem remover a verificação. Ainda faltam os gates integrais do novo commit. `assets_only` no workflow original mede arte e
roda os cenários novos; `measure_assets=false` testa apenas interfaces primeiro.

Publicação 0.45 exige também autenticação/leitura real iCloud. Novo passo isolado,
depois dos demais gates, recebe apenas os secrets JOJO_ICLOUD_USER e
JOJO_ICLOUD_APP_PASSWORD por canal seguro. Sem conta, relatório permanece reprovado,
sem alterar a evidência histórica 0.44. Não passar essas credenciais ao npm/build/testes.
Conversa engine: 31/31 com Gemma real passou em 41373138263 /55d1b7a.
Central falhou no segundo turno porque cuidados interceptava “você está bem?”;
roteamento corrigido para consultar atributos somente quando explicitamente pedidos.
Regressão também evita refeição antiga reaparecer após entrar/sair rapidamente do
Foco/Trabalho, suspensão/tela cheia. Não enfraquecer o ensaio real nem aceitar
fallback como inferência. Detalhes: CUIDADOS.md, CENAS_E_FOCO.md, AGENDA_ICLOUD.md
 e MISSAO_ATIVA.md. Ainda faltam gates integrais e autenticação iCloud real.

## Estado atual e decisão definitiva

- Desenvolvimento privado: **oaovito/oao-companion-**, fonte em `jojo-companion/`.
  O nome sem hífen final informado em pedidos retorna 404; não criar outro app/repositório.
- Branch de fonte: **codex/conversation-coherence**. Base desta tarefa: `dd8b558`,
  sucessora de `3f637fe`. Histórico Claude preservado (`018bd492a46d70f688187394f0ce60759c20d737`).
- Versão pública: **0.44.0**, canal **oaovito/jojo-companion-releases**.
  Publicada e verificada; tag privada `v0.44.0` no commit `98307814426c79ac7e187c3564d94f9a57a2ecf6`.
  Nenhuma release pendente. Não recriar nem mover essa tag/release.
- **GitHub Actions original é o único CI/CD.** Só runners oficiais hospedados pelo GitHub.
  Azure, CircleCI, runners externos/locais, bootstrap independente e agente de polling
  removidos depois de verificar ausência de dependência no aplicativo. Histórico Git preservado.
- `main` era somente README. O commit `cdea8bb` instalou apenas o controle necessário
  ao cron na branch padrão, preservando README/histórico. O aplicativo continua na Codex.
- Não acessar/modificar MNE_Lab. Nenhum projeto externo é parte deste trabalho.
- Ler `../AGENTS.md`, `../CLAUDE.md`, `PRODUCT_SPEC.md`, `ARCHITECTURE.md`, `CHANGELOG.md`,
  package.json e [GITHUB_ACTIONS.md](docs/GITHUB_ACTIONS.md).

## Produto preservado — versão 0.44.0 publicada

Somente Windows 11 x64, Electron 44/ESM, koffi isolado, personagem tubarão fisiculturista
em recorte de papel. Preservar click-through, fuga, tela cheia, múltiplos monitores,
Modo Trabalho, personalidade, privacidade/offline, autostart, recuperação e atualização.

A versão publicada contém conversa única com avisos/lembretes no mesmo histórico; fila/deduplicação;
segurança cancela fala atrasada; identidade/João protegidos; perguntas/negações não viram
comandos; reações/boca/óculos acompanham o assunto sem interromper fuga/tela cheia/trabalho.
Primeira pergunta depois da inatividade aguarda recarga breve do modelo sem bloquear urgência.
Modelo local **Gemma 3 4B** (`gemma3:4b-it-q4_K_M`, alias equivalente `gemma3:4b`), contexto
2.048, lote 128. Manifesto `68ceab7e468a31c988b44d5a4984a0e21f58c4f7158c6ce29c1804babac38df7`.
Seleção/migração preservam preferências/dados e não usam nuvem silenciosa.
Runtime Windows Ollama 0.40.13 com SHA-256 antes da extração. Builder 26.18.0.

## Infraestrutura restaurada

- `.github/workflows/jojo-windows.yml`: todos os gates originais + melhorias reunidos
  em `scripts/actions-windows.mjs`, no mesmo job `windows-latest`. Node 22.23.4,
  cache npm, hashes, log privado, TAP/JUnit/JSON, NSIS real, artefatos com retenção de um dia.
- `.github/workflows/jojo-conversation-windows.yml`: avaliação preservada, somente manual;
  não duplica ensaio real em cada push do pipeline completo.
- `.github/workflows/jojo-recovery.yml`: `17 * * * *`, 60 min, minuto 17 UTC. Controle
  leve de API no Ubuntu oficial, timeout 3 min, sem aplicativo Linux ou serviço externo.
  Também verifica alterações REAIS nos arquivos de controle na main, sem commits artificiais.
- Concorrência global protege validação/publicação. Controle não dispara se há build ativo,
  não repete falha técnica do mesmo commit/cancelamento/sucesso sem publicação verificada.
  Startup/billing pode ser tentado na hora seguinte; cooldown de 55 min contra jitter/duplicação.
- Release existente com os três metadados corretos: não recriar. Rascunho/incompleta:
  inspecionar, não substituir. Nenhum loop de build, alteração financeira ou provedor paralelo.
- Após gates aprovados da candidata 0.44.0 autorizada, confere commit/arquivos e branch
  atual; cria NOVA tag privada com GITHUB_TOKEN sem acionar novo build; publica com
  RELEASES_TOKEN no passo final. Tag existente divergente nunca é movida.
- Publicador exige `github-hosted` Windows, checkout limpo, tag e relatório do MESMO run,
  SHA-256 ainda iguais; valida uploads, downloads anônimos e UpdateChecker nos dois modos.
  Não depende de sucesso do upload opcional de artefatos CI para publicar no mesmo job.

## Custo e bloqueios efetivamente observados

Orçamento adicional autorizado **R$ 0**. Nenhum cartão/plano/limite foi alterado.
APIs de faturamento/uso e variáveis do repositório retornaram **403**. A anotação de
[41217012984](https://github.com/oaovito/oao-companion-/actions/runs/41217012984), sem runner
ou passos iniciados, diz que pagamentos recentes falharam **OU** limite precisa aumentar.
Não é possível distinguir saldo/franquia, orçamento ou pagamento recusado com esses dados.
Não presumir que alguma pendência financeira se resolverá automaticamente.

O usuário instruiu posteriormente: **"Só tenta fazer como faria normalmente"**.
Essa autorização substitui a trava adicional de confirmação manual criada pelo agente:
os três `if: false` foram removidos para tentar o Actions normal, sem mudar controles
financeiros. `ci/actions-cost-policy.json` registra `normalExecutionAuthorized=true`
e a instrução, mantendo `paidUsageBlockedConfirmed=false`/`confirmation=null`.
Autorização para tentar não comprova configuração financeira; não inventar esse dado.

Cron depende do próprio Actions e pode não iniciar sob bloqueio financeiro. Não declarar
monitor operacional antes de observar execução real da verificação. Não existe consulta
de API sem runner. Sincronizar controle na main e deixar GitHub tentar normalmente,
sem intervenção manual recorrente ou mudança de faturamento. Gates técnicos continuam
obrigatórios; não publicar com validação Windows ausente ou falha.

## Verificação

- **330/330** testes de lógica locais e Windows aprovados no commit publicado, sem
  falhas/pulos. Mais 16 integrações, 29 E2E e 43 cenários reais no Windows; ver resultado
  final abaixo. Os 312 testes anteriores foram preservados e a suíte ampliada.
- `actionlint` 1.7.12 validou os três workflows, binário conferido por SHA-256.
- [41167799466](https://github.com/oaovito/oao-companion-/actions/runs/41167799466), código
  `034133d`: 292 unitários, 16 integração e 29 E2E Windows passaram; três formatos gerados,
  portátil abriu/vigia/atalho funcionaram. É evidência anterior, não valida o HEAD atual.
- [41206258451](https://github.com/oaovito/oao-companion-/actions/runs/41206258451), `e4dee80`:
  1.043 animações Windows sem erros/recortes/quadros parados/falta de gatilho, média
  0,31 ms/quadro; E2E teve uma asserção de maiúscula corrigida depois.
- [41214891976](https://github.com/oaovito/oao-companion-/actions/runs/41214891976), `6d8d45d`:
  30 cenários engine + dez Central com modelo REAL passaram. Falas lidas; ainda houve
  ajustes posteriores de recusa/tempo/retomada, que exigem nova execução Windows.
- Detalhes de conversa: `docs/CONVERSA_WINDOWS.md`. Não afirmar perfeição semântica
  universal ou teste Windows 11 físico/DPI/suspensão a partir de runner de um monitor.

## Continuidade

1. Controle instalado na branch padrão; seis arquivos conferidos iguais aos da branch
   de fonte. Não repetir instalação nem criar commits de polling.
2. A instrução posterior autoriza tentativa normal; os gates financeiros adicionais do
   agente foram removidos. Preservar limites reais do GitHub e registrar o resultado.
3. O GitHub já aceitou os jobs. Manter o controle e os gates; corrigir falhas técnicas
   com evidências quando houver sessão
   Codex e publicar só depois de TODOS os gates. Não há agente IA contínuo no Actions.
4. A entrega 0.44.0 foi concluída e verificada abaixo. Não repetir publicação nem
   mover tags. As 17 versões anteriores e a própria 0.44.0 agora são imutáveis.
5. Em tarefa futura, recuperar o estado real, desenvolver no privado e só publicar
   nova versão autorizada após todos os gates; não reaplicar correções já entregues.

## Resultado da instalação — 31/10/2026

- Fonte: `3728e8c62262693f9b52a49ae590af4171251b76`, restauração dos workflows,
  remoção das alternativas e recuperação idempotente. Enviado à branch Codex.
- Controle: `cdea8bb347e6bbe085f2d83c3fe89c16101860e3`, enviado à `main` sem
  force-push. README original preservado; nenhum código do aplicativo foi movido.
- Workflow horário registrado pelo GitHub como ativo, ID `402983614`. Isso comprova
  registro, não execução do monitor. Nenhum evento `schedule` aparecia na consulta
  das 18h22 de Brasília (21h22 UTC); não afirmar que a rotina já está funcionando.
- Primeiro push da fonte: [41232280595](https://github.com/oaovito/oao-companion-/actions/runs/41232280595),
  Windows pulado pelo gate, nenhum runner/passos, **0 ms Windows faturáveis** na API.
- Primeiro push do controle: [41232316669](https://github.com/oaovito/oao-companion-/actions/runs/41232316669),
  recuperação pulada pelo gate, nenhum runner/passos, **0 ms Ubuntu faturáveis** na API.
  Ambos são tentativas aceitas com jobs pulados; não comprovam liberação financeira.
- Agenda: minuto 17 de cada hora, também em Brasília; GitHub pode atrasar/omitir cron.
  Gate fechado ou bloqueio financeiro impede a verificação efetiva. Não manter sessão
  Codex aberta à espera do horário; continuidade está versionada.
- Node 22.23.4: **323/323** unitários, sem falhas/pulos; lint de 138 arquivos e
  `actionlint` dos três workflows passaram. Windows/build/instalador atuais não executados.
- API pública reconferida: **17 releases inalteradas**, comparando IDs, notas e
  IDs/nomes/tamanhos/digests dos assets ao início da tarefa. Última segue **v0.43.1**;
  nenhuma v0.44.0 publicada. Atualizador permanece em `oaovito/jojo-companion-releases`.
- Naquela instalação os gates estavam fechados. A instrução posterior autoriza uma
  tentativa normal (ver seção de custo atual), sem afirmar confirmação financeira.
  Não mudar plano, orçamento, cartão ou provedor. Registrar o novo run após o push.

## Retomada normal autorizada — 01/11/2026

Instrução: **"Só tenta fazer como faria normalmente"**. Removida a trava adicional
do agente nos três workflows e registrada autorização de execução normal separada
da configuração financeira não verificável. Não repetir a pergunta de confirmação
como requisito para tentar o pipeline normal; manter todos os controles do GitHub.

Node 22.23.4: **325/325** testes passaram, sem falhas/pulos (323 preservados + dois
de autorização normal sem inventar confirmação de faturamento). Lint: 138 arquivos;
`actionlint` 1.7.12: três workflows aprovados. Mínimo obrigatório Windows subiu para 325.
Fonte enviada em `a26ef38`, controle na main em `7e7b5ac`. Publicação só após todos
os gates Windows, conferência dos três binários e detecção pelo atualizador.

- [41269001215](https://github.com/oaovito/oao-companion-/actions/runs/41269001215):
  controle executou em runner oficial, passou e evitou build duplicado porque havia
  pipeline ativo. A rotina já executou uma verificação real; cron futuro depende do GitHub.
- [41268993281](https://github.com/oaovito/oao-companion-/actions/runs/41268993281):
  runner Windows oficial iniciou normalmente; RELEASES_TOKEN autenticou e anunciou
  escrita no canal público, sem expor valor. Passaram 325 unitários, três builds,
  instalação/início/desinstalação NSIS, portátil, vigia, 16 integrações, 29 E2E,
  auditoria de animações, desempenho e pesquisa. Não é teste de Windows 11 físico.
- Falha real no gate de conversa: o driver chamou `powershell.exe` antigo, herdando
  ambiente do pwsh; `Get-FileHash` não foi encontrado após o download do runtime.
  Nenhuma inferência desse run foi aprovada e nenhuma tag/release foi criada.
- Correção: usar `pwsh.exe` 7, o host do workflow original, com verificação antecipada
  de Get-FileHash/Expand-Archive/Invoke-RestMethod. Hashes continuam obrigatórios.
  Ensaio de conversa movido para depois dos unitários, antes do build, sem duplicar
  nem remover suítes. Falhas agora mostram o fim do log já filtrado, além do artefato.
  Executar novamente todos os gates no novo commit e registrar o resultado.

## Correcao encontrada pelo modelo real

[41270720172](https://github.com/oaovito/oao-companion-/actions/runs/41270720172),
`db4c657`: PowerShell 7 e verificacao de SHA-256 passaram; motor real respondeu
29/30 casos. Falha preservada: "Eu disse manga, nao maca" recebeu "Voce tem certeza?
A memoria as vezes falha". A Central e os builds nao foram repetidos apos essa falha.

Correcao do aplicativo: esclarecimentos das proprias palavras recebem instrucao
explicita de reconhecimento, sem questionar a memoria e sem converter afirmacoes
medicas em fatos. Contestacoes da certeza/memoria nesse contexto sao descartadas.
Nao foi criada resposta fixa nem simulado intent de IA para fazer o teste passar.
Quatro regressoes unitarias cobrem portugues/ingles, relato de terceiros, prompt,
rejeicao da fala incorreta e continuidade do contexto. Ensaio real ampliado para
**31 cenarios engine + 12 Central**, mantendo os 30 + dez anteriores.
Todos os gates precisam passar novamente antes de criar/publicar v0.44.0.

[41271319506](https://github.com/oaovito/oao-companion-/actions/runs/41271319506),
`a5c3871`: o modelo aceitou a correcao ("Manga, entao") e reteve a informacao
("Manga. Sem duvidas"). Houve 29/31 aprovados: definicao de diabetes e exemplo
excederam 25 s no runner de 2 CPUs/8 GB. O prazo e a exigencia de inferencia real
foram mantidos. Otimizacao: instrucoes tecnicas compactas; tarefa variavel depois
das fontes para compartilhar o prefixo ja processado; definicao/exemplo concisos,
aprofundamento ainda pode ampliar. Fonte e barreira contra instrucao externa intactas.
Nova regressao confere reutilizacao do contexto e preservacao de fontes/assunto;
minimo obrigatorio passa a 330 unitarios. Validar novamente no Windows.

## Publicação e verificação final — 01/11/2026

- [v0.44.0 pública](https://github.com/oaovito/jojo-companion-releases/releases/tag/v0.44.0),
  publicada às **01h41 de Brasília**; release ID `430365808`.
- [Windows 41272098380](https://github.com/oaovito/oao-companion-/actions/runs/41272098380):
  **sucesso**, fonte/tag privada em `98307814426c79ac7e187c3564d94f9a57a2ecf6`,
  Node 22.23.4, Windows x64 real em runner oficial GitHub, 2 CPUs/8 GB.
  **330/330 unitários, 16 integrações, 29 E2E, 31 cenários engine + 12 Central**;
  todas as etapas obrigatórias, build dos três formatos, NSIS, vigia e medições passaram.
- Auditoria de **1.043 animações**: zero erros, recortes, paradas ou gatilhos ausentes;
  média 0,3253 ms/quadro. Capturas de Central/animações inspecionadas.
- Downloads públicos dos três arquivos reconferidos sem credencial, com tamanho,
  MZ/PK e SHA-256 iguais à API e aos binários validados. Notas iguais à seção incremental.
- UpdateChecker real consultou a API pública: 0.43.1 recebe 0.44.0 nos modos portable
  e installer; quem já está em 0.44.0 não recebe novamente. Não foi teste de troca
  física num PC doméstico. Os IDs/notas/assets das **17 releases anteriores** conferem
  com o snapshot inicial. Agora existem 18 releases; nenhuma histórica foi alterada.
- [Cron 41292825226](https://github.com/oaovito/oao-companion-/actions/runs/41292825226),
  evento `schedule`, executou e passou às 06h21 de Brasília. Não gerou outro build
  ou release depois da publicação. Frequência configurada: `17 * * * *`, best effort.
- `/timing` dos runs Windows final e controle agendado informou **0 ms faturáveis**.
  Nenhum serviço contratado ou plano/limite/cartão alterado. APIs financeiras seguem
  sem acesso, portanto essa evidência de uso não representa auditoria da fatura da conta.
- Leitura manual das 43 falas verificou preferências/correções, identidade, contexto,
  negativas, expressões e proteção de crise. Os ensaios não provam perfeição semântica
  universal nem precisão clínica; respostas científicas do modelo permanecem resumidas.
  No runner de duas CPUs, definição/exemplo com fonte levaram 21,684 s/17,262 s;
  exemplo na Central sem fonte, 24,276 s. Não prometer resposta instantânea em todo PC.
- Evidência persistente e hashes: [VALIDACAO_0.44.0.md](docs/VALIDACAO_0.44.0.md).
  Não há bloqueio de publicação remanescente; Windows 11 físico, DPI misto,
  suspensão/troca de monitores físicos não foram testados nesta nuvem.
