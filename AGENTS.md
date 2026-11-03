# JoJo Companion — instruções permanentes do Codex

## Correção crítica vigente — 02/11/2026, candidata 0.45.1

O pedido em `jojo-companion/docs/REQUISITOS_CORRECOES_0.45.1.md` REVOGA a direção
artística com cauda/sem pernas. Restaurar os recursos originais com pernas e
musculatura do histórico anterior a `2847e41`; remover a cauda conforme pedido.
Nenhuma mudança futura de anatomia, silhueta ou estilo é autorizada sem solicitação
explícita do usuário. Não redesenhar o personagem. Os trechos históricos abaixo
não impõem a anatomia rejeitada. Testes e documentos devem refletir esta correção.

Prioridade: tela cheia real da janela ativa, todas as janelas próprias, estados
frescos/recuperáveis; cenas explícitas com causas/fila limitada e confirmação do
renderer; Steam/bibliotecas/metadados/processos locais e DD1 AppID 262060, com
estados desconhecidos sem XP. Requisitos cumulativos, agenda só por link e
privacidade/silêncio mantidos. Validar visualmente no Windows oficial, auditar
as 1.268 animações e executar todos os gates antes de nova publicação.
0.45.0 e anteriores são imutáveis. Não alegar jogo/Steam comercial ou PC da usuária
comprovados por fixtures. Fonte permanece em `codex/living-companion`.

## Diretriz mais recente — agenda somente por link (02/11/2026)

O usuário corrigiu explicitamente: “A agenda só deve precisar do link da agenda
não log senha de nada”. Esta instrução SUPERA os trechos antigos sobre CalDAV
com ID Apple/senha, conta autorizada e gate icloud-live, inclusive o prompt mestre.
Agenda usa somente link iCal Google/iCloud (webcal/HTTPS), somente leitura, sem
formulário de conta/senha. Nunca solicitar JOJO_ICLOUD_USER/APP_PASSWORD para
usar, testar ou publicar o JoJo. Validar o fluxo de link e preservar todos os
demais gates Windows/artefatos/atualizador. Histórico anterior abaixo não é bloqueio
vigente. Estado corrente no início do HANDOFF e docs/MISSAO_ATIVA.md.


## Missão e continuidade

Responsabilidade técnica: desenvolver, testar, corrigir, versionar e distribuir o JoJo,
com autonomia para operações rotineiras já autorizadas. Respostas e documentação em pt-BR.
Não presumir execução em segundo plano. Cada sessão deve ler este arquivo, `CLAUDE.md`
(referência histórica/técnica preservada), `jojo-companion/HANDOFF.md`, `PRODUCT_SPEC.md`,
`ARCHITECTURE.md`, `CHANGELOG.md`, `package.json` e os workflows antes de alterar código.
Consultar branches/commits e releases no GitHub: nunca pressupor que `main` tem o app.
Usar o checkout isolado existente; não criar worktree sem solicitação explícita.
Preservar alterações locais e histórico; nunca fazer force-push ou reset destrutivo.

## Repositórios e branch

- Desenvolvimento **privado**: `oaovito/oao-companion-`. Código em `jojo-companion/`.
- Distribuição **pública**: `oaovito/jojo-companion-releases`. Só binários oficiais e notas
  incrementais/metadados de release. Nunca enviar fonte privada, testes, docs internas ou segredos.
- Base recuperada: `claude/jeff-companion-v0.1`, commit `018bd492a46d70f688187394f0ce60759c20d737`.
- Branch da transferência: `codex/operational-handoff`. Correção de conversa em `codex/conversation-coherence`. Futuras branches `codex/**`
  partem da branch efetiva mais recente; verificar ambas no remoto antes de começar.
- `main` contém só README na transferência. Não iniciar um novo app nela.
- MNE_Lab é externo: não acessar/modificar seu repositório, infraestrutura ou distribuição.
  Referências já presentes no JoJo não autorizam trabalho naquele projeto.

## Produto e arquitetura

**Somente Windows 11 x64.** Não desenvolver nem manter versão de Linux/macOS,
compilação cruzada, Wine, Xvfb ou E2E gráficos fora do Windows. O host do editor
pode executar testes de lógica pura em Node, sem preparar um aplicativo para outro sistema.

Electron 44, JavaScript ESM, sem framework de UI; `koffi` para
integração nativa isolada em `utilityProcess`; Playwright para E2E; electron-builder
para portátil, NSIS e ZIP x64. `src/core/` contém lógica pura; `src/main/` integra
Windows/Electron; `src/preload/` expõe IPC mínimo; `src/renderer/` desenha overlay,
Central e configurações; `assets/` guarda rig, animações, falas e personalidade.

JoJo é o tubarão fisiculturista em recorte de papel, com humor seco, sério e mandão;
Emanuele/Manu é a usuária. Preservar falas, reações, animações, personalidade e fluxos
atuais. Arte ainda provisória. Não acrescentar serviços pagos sem autorização.

Requisitos irredutíveis:
- Click-through real fora da interação (`setIgnoreMouseEvents(true)`), sem simular cliques;
  desvio do cursor estável; overlay transparente, sem foco/barra de tarefas, sempre por cima.
- Tela cheia é intocável: ocultar tudo, inclusive interação; não ir para monitor ocupado;
  suportar monitores/DPI, suspensão e recuperação de posição.
- Central, motor de intenções, conversa programada offline e conversa local via
  Ollama/Gemma 3 4B no próprio PC; personalidade preservada e fallback programado.
- Modo Trabalho silencioso com prioridade; silêncio de áudio absoluto; persistência,
  autostart habilitado por padrão, vigia de crash e saída explícita pela bandeja respeitada.
- Sem captura de tela, microfone, telemetria ou registro de teclas/cliques. Detecção local
  opcional de janela/Spotify/LoL/categoria mantém os limites atuais de privacidade.
  Rede só para integrações existentes habilitadas: agenda, pesquisa, motor local e atualização.
- Renderer isolado/sandbox/CSP, IPC validado; nunca gravar valores de tokens em logs/docs.
- Atualização continua pública, sem login do usuário, com preservação de dados/configurações,
  conferência de tamanho/SHA-256, troca/reabertura e recuperação após falha.

Documentos antigos contêm trechos superados (por exemplo, auto-update fora do escopo,
sons e autostart desligado). Usar as instruções atuais do usuário, código/testes recentes
 e changelog como evidência, sem apagar requisitos válidos ou regredir o produto.

## Implementação e validação

ESM, 2 espaços, aspas simples, textos/comentários em pt-BR; seguir o estilo existente.
Toda mudança relevante exige regressão adequada; Electron requer E2E e CI Windows.
READMEs permanecem apenas `descubra 🦈`. Não desativar testes para obter verde.
No diretório `jojo-companion/`:

```sh
npm ci
npm test
npm run test:e2e
npm start
node scripts/measure.mjs
npm run build:win
node scripts/publish-release.mjs --artifacts
```

CI usa Node **22.23.4** fixado em `actions/setup-node` para build, E2E, integração, medição e modelo real.
`npm run test:windows` executa entrada nativa e processos do vigia; `npm run test:e2e`
executa a aplicação Windows. `npm run build:win` usa Node, sem Bash.
Não instalar runtimes gráficos/modelos de outro sistema no host do editor.
Respeitar proxy/CA e verificações de assinatura/checksum.
`test/unit/helpers.js` fixa Date numa data não festiva para isolar a simulação do
calendário real; testes de feriados devem fornecer datas explícitas.

**GitHub Actions original é a ÚNICA infraestrutura oficial.** Somente runners
`windows-latest` hospedados pelo GitHub para o aplicativo; Ubuntu oficial apenas para
controle leve por API. Proibidos Azure, CircleCI, runners externos/locais ou self-hosted.
Workflows restaurados em `.github/workflows/`; alternativas e agentes removidos, histórico
preservado no Git. Helpers `ci/policy.mjs`, `ci/process.mjs`, `ci/validation.mjs` são
bibliotecas dos gates do Actions e testes, não outra infraestrutura de execução.

`jojo-windows.yml` usa `scripts/actions-windows.mjs` para reunir as suítes originais no
mesmo job e preservar hashes/relatórios/instalador. Só aceita `github-hosted` Windows x64.
`jojo-conversation-windows.yml` roda por dispatch ou marcadores explícitos
`[jojo-ui]`, `[jojo-qa]` e `[jojo-net]` na living; pushes comuns não repetem esse
diagnóstico. Esses marcadores excluem o pipeline integral/publicador; somente
push normal ou dispatch integral pode completar a validação e publicar a candidata.
`jojo-recovery.yml` agenda `17 * * * *` na branch padrão, com concorrência e idempotência.
main guarda somente controle (não usar como fonte do aplicativo); o worker faz checkout
da branch correta. Mudanças do controle devem ser sincronizadas na main, preservando
README/histórico e sem force-push. Não criar commits artificiais nem loops de polling.

Orçamento adicional **R$ 0**. Não alterar limites/cartões/planos nem contornar bloqueios.
A instrução posterior do usuário, **"Só tenta fazer como faria normalmente"**, autoriza
retomar o fluxo normal sob os controles já existentes no GitHub, sem a trava adicional
de confirmação manual criada anteriormente pelo agente. Os `if: false` foram removidos.
`ci/actions-cost-policy.json` registra essa autorização separadamente da configuração
financeira: APIs de faturamento/variáveis seguem negadas (403), logo o limite pago zero
NÃO está confirmado. Nunca inventar essa confirmação nem afirmar custo real sem evidência.
Cron ainda pode ser impedido pelo faturamento; só declarar monitor operacional após
observar a verificação executada. Jobs pulados não comprovam disponibilidade de runner.

Todos os gates continuam obrigatórios: preflight, lint, instalação, unitários, build,
NSIS instalado/iniciado/desinstalado em perfil isolado, portátil, vigia, integração,
E2E, 1.268 animações, medição, conversa REAL (32 engine + 12 Central), artefatos,
compatibilidade do atualizador e notas. Pesquisa web/GPU permanecem diagnósticos opcionais.
O pipeline integral preserva as44falas na branch privada de evidência do mesmo run
e aguarda revisão técnica de Codex, vinculada a SHA/run/tentativa/digest, antes do
build. Rejeição, ausência em5min ou integridade inválida bloqueiam publicação.
Não é um pedido de confirmação manual da usuária.
Logs privados filtram credenciais; TAP/JUnit/JSON e hashes são retidos localmente (três
execuções/14 dias). Cache confere SHA-256 do bootstrap/runtime e integridade npm.
Não alegar teste em Windows físico: runner Windows Server de um monitor não comprova
Windows 11 doméstico, DPI misto, suspensão física ou troca real do instalador.

## Versionamento e distribuição

Versão recuperada na transferência: **0.43.1**. Publicada atual: **0.45.0**; consultar novamente em cada sessão.
Não incrementar para demonstrar transferência. Registrar mudanças não lançadas em
`CHANGELOG.md` sem reescrever entradas históricas. Para release autorizada e justificada:
1. Comparar commits desde a versão anterior, atualizar package.json/package-lock.json e
   seção exata da nova versão no CHANGELOG, somente mudanças reais.
2. Manter versão, tag `vX.Y.Z`, nomes e metadados consistentes. Preservar
   `scripts/release-notes.mjs`; seções aplicáveis: Novidades, Melhorias, Correções,
   Remoções e Como testar. Sem seção válida, publicação deve falhar.
3. Commit/push no privado; acompanhar Windows no GitHub Actions. A versão **0.44.0**
   já foi publicada após TODOS os gates; não recriar. A política ainda aponta para
   0.44.0 para o controle horário reconhecer a publicação e evitar outro build.
   Para uma nova versão autorizada, só após os gates o helper cria a NOVA tag privada
   com GITHUB_TOKEN, sem disparar build duplicado.
   Tag existente divergente jamais é movida. Outra versão exige nova autorização/política.
   O controle horário não repete build ativo, cancelamento ou falha técnica do mesmo SHA;
   falha anterior ao runner pode ser tentada na próxima hora. Não há IA rodando continuamente.
4. `scripts/publish-release.mjs --tag vX.Y.Z --validation <relatório>` exige Windows real,
   checkout limpo, tag/commit, todos os gates/hashes do MESMO run oficial GitHub
   e RELEASES_TOKEN somente no passo final, tag igual à versão,
   destino público e ausência de release **e tag** públicas existentes. Faz upload em
   rascunho e confere nomes/tamanhos/hashes antes de torná-lo visível ao atualizador.
5. Artefatos exatos: `JoJoCompanion.exe`, `JoJoCompanion-Setup-X.Y.Z.exe`,
   `JoJoCompanion-X.Y.Z-win-x64.zip`. API `/releases/latest` e assets com digest são os
   metadados do atualizador próprio; não inventar `latest.yml` ou mudar de canal.
6. Verificar release pública sem autenticação, hashes/downloads, notas e detecção pelos
   modos portable/installer. Só então declarar distribuição concluída.

É proibido editar/excluir/substituir qualquer release histórica (incluindo v0.32.0),
seus assets ou tags. O script não atualiza releases existentes. Cópia privada de release
não é necessária; o único destino do novo publicador é o canal público.
Token ausente/negado deve falhar explicitamente. Não mostrar nem substituir tokens;
permissão anunciada de push não prova acesso à API de Secrets ou escrita de workflows.

## Recuperação, critérios de conclusão e relato

Investigar causa raiz, corrigir, testar novamente e acompanhar o CI do commit correto.
Sem gates obrigatórios verdes, não publicar. Upload falho pode deixar rascunho público
invisível ao atualizador: inspecionar a execução e o rascunho; nunca apagar versão publicada
para repetir. Corrigir o processo e recuperar apenas rascunhos comprovadamente não publicados.
Se a publicação terminou mas a verificação falhou, inspecionar sem reescrever a release.

Atualizar HANDOFF com branch, versão, decisões, pendências reais, validações e publicação.
Concluir implementação com commit e CI verificado; concluir release só com arquivos públicos
corretos e atualizador detectando. Distinguir testes passados/falhos/não executados e blockers
externos. Relatar status, branch/commit, testes locais/Actions, distribuição, atualização,
autonomia e permissões faltantes. Não exigir operações manuais rotineiras que as ferramentas
podem fazer; pedir apenas autorização/credenciais externas realmente indisponíveis.


## Conversa — requisitos confirmados no uso real

- Somente uma conversa. Atividades mantêm estado interno, mas suas falas aparecem no mesmo chat.
  `/nova` e IPC antigo permanecem compatíveis sem apagar/dividir o histórico.
- Preservar fatos sobre João, sem citá-lo em toda resposta. Nunca permitir ameaças ou incentivar
  autoagressão a partir de provocação dirigida ao personagem. Inglês recebe a mesma proteção.
- Respostas de atalhos também pertencem ao contexto. Serializar turnos; segurança ultrapassa a fila
  e impede resposta antiga de atropelar acolhimento. Reações não podem executar comandos ou interromper fuga/tela cheia.
- Usuário informou **16 GB de RAM ou mais** no PC Windows. Avaliar qualidade e latência reais
  antes de escolher outro tamanho do modelo local. Não trocar para API externa, exigir login ou criar custo.
- Testes simulados não comprovam inteligência. Executar `scripts/check-conversation.mjs` com o modelo real,
  ler cada saída e registrar falhas semânticas, mesmo que as verificações lexicais passem.
- Alteração oficial de modelo, se necessária e comprovada por ensaio, exige atualizar seleção/migração,
  documentação, testes e inicialização local; nunca usar modelos externos como fallback silencioso.

## Estado após restauração do Actions — 2026-10-31

Base encontrada: `dd8b558` (pedido citava `3f637fe`). Código candidato **0.44.0**,
branch `codex/conversation-coherence`; público **0.43.1**. As 17 releases históricas
permanecem imutáveis. Nenhum código do MNE_Lab deve ser acessado/modificado.
**323/323** testes locais passaram (312 anteriores + 11 de recuperação); `actionlint`
validou os workflows. Isso NÃO comprova Windows nem conclusão da release.
A última anotação financeira é ambígua (pagamento falhou OU limite de gasto); a API
não permite distinguir causa/saldo. Nunca alegar que regularização ocorrerá sozinha.
Estado do primeiro disparo/default branch e próximos passos: HANDOFF e
`jojo-companion/docs/GITHUB_ACTIONS.md`. Nenhum outro provedor é necessário/autorizado.

## Estado atual — 0.44.0 publicada em 01/11/2026

Entrega publicada e downloads/atualizador verificados em `oaovito/jojo-companion-releases`.
Tag privada `v0.44.0`: **98307814426c79ac7e187c3564d94f9a57a2ecf6**.
Windows Actions **41272098380** passou: 330 unitários, 16 integração, 29 E2E,
31 cenários engine + 12 Central com Gemma real, NSIS/portátil/ZIP, vigia,
1.043 animações, desempenho, hashes e publicação. Cron **41292825226** executou
por `schedule` e passou. Controle na main, fonte na Codex; sem outros provedores.
17 releases anteriores preservadas; a 0.44.0 também é histórica e imutável agora.
Relato/hashes/limites em HANDOFF e `jojo-companion/docs/VALIDACAO_0.44.0.md`.
Não confundir sucesso dos cenários com perfeição de toda conversa ou teste físico
de Windows 11. Não repetir builds/publicação para demonstrar trabalho já concluído.

## Missao ativa — 0.45.0 em desenvolvimento

Branch: `codex/living-companion`, baseada em `4193c2b` (0.44.0 publicada).
Requisitos completos: `jojo-companion/docs/REQUISITOS_0.45.0.md` e
`jojo-companion/docs/REQUISITOS_TAREFAS_0.45.0.md`; inclui tambem Darkest Dungeon
(diario 06–21 local, 15 falas, 5 animacoes, Steam app 262060, so tempo ativo,
XP 15 inicio +50 primeira sessao/dia +25/40/80 aos 15/30/60 min, limites,
7 dias distintos = O Herdeiro da Ruina). Todos os pedidos sao cumulativos.
A diretriz anatômica dessa missão é HISTÓRICA E REVOGADA. Vigora a restauração
original com pernas e sem cauda, determinada no topo deste arquivo; preservar
o catálogo e adaptar seus movimentos. Silencio/foco/tela cheia/desvio/privacidade continuam prioritarios.
Novos sistemas: clima real, CalDAV iCloud/credenciais Windows, necessidades e seis
raridades de coco, XP compartilhado, 50 comidas NOVAS, 25 memes +25 profissoes,
atalho unico, icone novo, Discord no foco, Darkest Dungeon e To-Do completa.
Nenhum segredo no chat/repositorio/log. Teste real iCloud exige conta autorizada
e credencial por canal seguro, nunca presumir autenticacao. Sem conta, preparar
protocolo/UI reais e registrar somente essa validacao pendente apos fazer o restante.
Branch nova valida CI mas NAO publica automaticamente: politica continua 0.44.0
no controle oficial. Nova publicacao somente apos requisitos e gates; nao publicar
parte do pedido nem modificar as 18 releases existentes.
Continuidade/checklist em `jojo-companion/docs/MISSAO_ATIVA.md`.

## Continuidade da candidata — 02/11/2026

Implementados em código os 50 conjuntos de memes/profissões, integração de Discord
no Trabalho/Foco (força opt-in), migração conservadora de atalhos e ícones locais
sem redistribuição de marcas. Ver `docs/CENAS_E_FOCO.md`. Catálogo: 1.268 animações.
Toda esta arte foi medida no Windows e importada (evidência abaixo); futuras
alterações de desenho exigem nova medição e não podem desligar a cobertura. Esperados 39 E2E no pipeline integral.
O workflow tem passo iCloud isolado DEPOIS dos demais gates; secrets só nesse
passo, nunca no npm/build/testes. Candidatas >=0.45 exigem `icloud-live` e evidência
somente de contagens/horário. Sem conta autorizada, NÃO finalizar/publicar.
Não confundir os diagnósticos `assets_only` com aprovação integral do pipeline.

Medição/auditoria 41367076224 (474bff2) passou: 1.268 animações, 434 bases,
zero erros/recortes/paradas/órfãs, média 0,44 ms. JSON real importado, SHA-256
45a74560433377127ddabb567e8d22753d5bed2d2942c023423b2b0c38976287.
401/401 testes puros passaram depois da importação. Não repetir medição sem mudar
arte; continuar pelo pipeline INTEGRAL e ensaio iCloud real. Reações de DD agora
ficam em fila persistente e só tocam após fechar o jogo, fora de foco/tela cheia.

## Validação integral da candidata — 02/11/2026

Fonte **502ba0f**, Actions **41374307060**: TODOS os gates do aplicativo passaram
no mesmo Windows oficial: 404 unitários, 31+12 conversa real, build/NSIS e três
atualizações, portátil/vigia, 16 integração, 39 E2E, 1.268 animações, desempenho,
hashes, atualizador e notas. Resultado global bloqueado SOMENTE no passo final
icloud-live por secrets JOJO_ICLOUD_USER/JOJO_ICLOUD_APP_PASSWORD ausentes.
O pedido exige conta autorizada (REQUISITOS_0.45.0.md:798); não remover o gate.
Armazenamento CI também recusou upload; zero artefatos retidos, nenhum binário novo
publicado. Não apagar evidências antigas/comprar cota. Conta autorizada por canal
seguro é dependência externa; depois retomar fluxo oficial no mesmo run de publicação.
Não repetir implementação ou testes pesados enquanto a dependência não mudar.
Evidências/limites/continuidade em HANDOFF e docs/MISSAO_ATIVA.md. 18 releases intactas.

## Entrega atual — 0.45.0 publicada em 02/11/2026

Tag/fonte **9c213f494602329f4ebc7bbf9f8fa719a1368f1a**, branch efetiva
**codex/living-companion**. Actions **41383430244** aprovou TODOS os gates e publicou:
411 unitários, 31+12 conversa real, 16 integração, 40 E2E, 1.268 animações,
NSIS/três atualizações, portátil/ZIP/vigia/desempenho/hashes/notas. Downloads públicos
verificados; UpdateChecker detecta 0.44→0.45 nos dois modos sem login. 18 releases
anteriores intactas. Política/controle main: 0.45.0/living (**82519f8**).
Agenda SOMENTE por link, sem ID Apple/senha ou gate de conta: instrução posterior
do usuário superou o bloqueio antigo descrito no histórico acima. Sem pendência
externa bloqueando esta entrega. NÃO repetir pedido de secrets ou build/publicação.
CI sem quota para upload, mas release pública está íntegra. Não comprar cota/apagar
histórico. Detalhes/evidência/limites em HANDOFF, docs/VALIDACAO_0.45.0.md e MISSAO_ATIVA.
