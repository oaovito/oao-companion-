# JoJo Companion — instruções permanentes do Codex

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
`jojo-conversation-windows.yml` fica somente manual para evitar repetir o ensaio por push.
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
E2E, 1.043 animações, medição, conversa REAL (31 engine + 12 Central), artefatos,
compatibilidade do atualizador e notas. Pesquisa web/GPU permanecem diagnósticos opcionais.
Logs privados filtram credenciais; TAP/JUnit/JSON e hashes são retidos localmente (três
execuções/14 dias). Cache confere SHA-256 do bootstrap/runtime e integridade npm.
Não alegar teste em Windows físico: runner Windows Server de um monitor não comprova
Windows 11 doméstico, DPI misto, suspensão física ou troca real do instalador.

## Versionamento e distribuição

Versão recuperada na transferência: **0.43.1**. Publicada atual: **0.44.0**; consultar novamente em cada sessão.
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
