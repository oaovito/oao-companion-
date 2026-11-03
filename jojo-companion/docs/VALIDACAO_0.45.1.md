# Validação da candidata JoJo Companion 0.45.1 — rascunho privado

Registro iniciado em 02/11/2026, retomado em 03/11/2026. **A candidata 0.45.1 ainda NÃO foi publicada e não tem
aprovação integral de release.** A versão pública continua 0.45.0; suas tags,
arquivos e notas, assim como as demais releases históricas, permanecem imutáveis.

Fonte: branch `codex/living-companion`. Corte deste rascunho:
`f28503223f0ca9453ffce1e4a31d8ade48ac36b3`. As evidências Windows abaixo pertencem
aos commits indicados em cada execução; não comprovam automaticamente as correções
posteriores. Requisitos vigentes: [REQUISITOS_CORRECOES_0.45.1.md](REQUISITOS_CORRECOES_0.45.1.md)
e [HANDOFF](../HANDOFF.md).

## Causas identificadas e correções

| Área | Causa comprovada no código ou nos ensaios | Correção na candidata |
| --- | --- | --- |
| Anatomia | A mudança anterior substituiu pernas, mãos e musculatura do modelo histórico por nadadeiras/cauda, contrariando a direção vigente. Os testes também impunham essa anatomia rejeitada. | Restaurados recursos históricos com pernas e musculatura; removida a cauda; testes passam a comparar as peças históricas, métricas, rosto e cores. Canais legados movimentam as pernas sem redesenhar uma cauda. |
| Falso fullscreen | Estados globais de `SHQueryUserNotificationState` eram usados como prova de tela cheia, inclusive após Alt+Tab; somente o handle do overlay era registrado como próprio. | Decisão pela janela ativa, visibilidade, minimização, moldura e geometria física. Busy/D3D/apresentação não bastam para bloquear. Todas as `BrowserWindow` próprias são registradas e excluídas. |
| DPI e monitores | O primeiro diagnóstico falhou em reconhecer fullscreen a 150%. A revisão também reproduziu uma janela que cobre um monitor menor, embora a maior interseção escolhida pelo Windows esteja coberta apenas parcialmente. | Geometria nativa física, contexto de DPI, limites DWM e comparação com os monitores físicos. Verificação de todos os monitores integralmente cobertos antes do retorno negativo. Janelas próprias, minimizadas e maximização comum continuam excluídas. |
| Cenas explícitas | Bloqueios distintos retornavam uma justificativa genérica; pedidos podiam se perder ou permanecer atrás de uma conversa antiga. | Resultados específicos, contexto atualizado, prioridade de pedidos explícitos, deduplicação e fila de até quatro pedidos com expiração de 20 segundos. Cooldown, foco, fullscreen, asset ausente e falha de desenho têm causas próprias. Execução só é registrada após confirmação do renderer. |
| Recuperação do renderer | Estados de fuga/arrasto/captura e atividade visual podiam sobreviver ao crash. A janela podia parecer pronta antes dos assets e reaparecer mesmo após ser ocultada durante a recriação. | Limpeza dos estados transitórios, invalidação de pedidos antigos e disponibilidade somente após o handshake `renderer-ready`. Carregamento retorna `renderer_loading` e aguarda na fila limitada; falha real continua `renderer_error`. A recriação respeita ocultação, Trabalho, Foco e fullscreen. |
| Descoberta Steam | Faltava uma descoberta reutilizável de bibliotecas/metadados locais. Na revisão, uma falha EACCES de leitura substituía o inventário anterior por um parcial vazio conhecido. | Registro Windows, processo do cliente, `libraryfolders.vdf` e manifestos em worker separado. Falha ou leitura incompleta preserva jogos anteriores como desconhecidos, informa diagnóstico e envia `known:false` ao detector. Zero jogos confirmado permanece distinto de falha. |
| Custo da identificação | `identifyGame` normalizava/comparava todas as raízes com `path.relative` e ordenava resultados para cada processo. A carga sintética de 5.000 jogos ×300 processos ultrapassou o timeout de 1,5 s do detector. | Raízes normalizadas em cache por objeto, invalidado quando a raiz muda; imagem normalizada uma vez, contenção com separador e preferência pela raiz mais específica, mantendo exclusão de launchers. |
| Darkest Dungeon | A validação de `Darkest.exe` exigia exatamente um subdiretório `_windows`; falha de detecção não tinha estado desconhecido explícito. | Validação local do AppID `262060`, manifesto e contenção na instalação, sem exigir esse subdiretório. Processo identificado por PID e horário de criação; primeiro plano é distinto de execução em background. Estado desconhecido pausa a amostra sem inventar encerramento, tempo ou XP. |

Na recuperação do inventário, o detector descarta processos/provas em cache e
amostras de gerações anteriores. O serviço aguarda nova observação para voltar a
exibir atividade. DD preserva sessão e resultados duráveis; encerramento conhecido
registra histórico, e a outbox com recompensas idempotentes impede XP duplicado.
Os marcos, limites, conquista e sugestão diária entre 06:00 e 21:00 permanecem.

## Origem da restauração e comparação visual

Fonte histórica utilizada: **`a3240e4976736eee5c319b71a249a0b87ad6e132`**, anterior
à mudança anatômica de `2847e41`. A fixture histórica é
`test/fixtures/jojo-0.44.0.rig.json`. Foram preservadas as peças originais com
pernas, braços, mãos, musculatura, proporções, rosto e cores; as peças de cauda
foram removidas conforme o pedido, mantendo os adereços e o catálogo posterior.
Nenhuma nova direção artística está autorizada.

Comparação renderizada no Windows: [original histórico / 0.45.0 rejeitado / restaurado](evidencias/restauracao-0.45.1.png),
nas poses de repouso, caminhada e aceno. Contato das 75 cenas novas, incluindo
DD, cuidados, profissões e memes: [cenas restauradas](evidencias/cenas-restauradas-0.45.1.png).
As imagens foram recuperadas dos logs oficiais e inspecionadas visualmente.

Auditoria completa: [AUDITORIA_ANIMACOES.md](AUDITORIA_ANIMACOES.md),
[resumo JSON](auditoria-animacoes.json) e [contato visual](auditoria-animacoes.png).
O catálogo preserva **1.268 animações**. Os ícones foram exportados do rig
restaurado pelo Chromium Windows no segundo diagnóstico e importados; o hash do
rig usado na origem é normalizado para LF, sem mudança da imagem.

## Evidências Windows já executadas

Somente GitHub Actions oficial, em Windows hospedado pelo GitHub. Estes foram
diagnósticos parciais; nenhum deles equivale ao pipeline integral da candidata.

| Execução privada | Fonte | Resultado confirmado | Pendência ou falha |
| --- | --- | --- | --- |
| [41477698374 — arte e interfaces](https://github.com/oaovito/oao-companion-/actions/runs/41477698374) | `56e40a445d7423ac45d308b6bf41d47a7d096006` | Medidas 434 bases; auditadas 1.268 animações, zero erros/cortes/paradas/órfãs; desenho médio 0,45654 ms por quadro. Os três comandos produziram quadros diferentes. Interfaces: **12/14**. | Recuperação pós-crash retornou `queued` onde o teste esperava `executed`; cenário de fullscreen a 150% excedeu a espera. Diagnóstico global reprovado. |
| [41483917417 — interfaces e ícones](https://github.com/oaovito/oao-companion-/actions/runs/41483917417) | `161398946439af0442030b2eefbbebf7f7347f11` | Interfaces: **13/14**. Passaram os três comandos, recuperação do renderer/detector e fullscreen físico com escala Electron 1,5. Ícones exportados no Windows. | Única falha no preparo da fixture Steam: `rename` presumiu a presença de `electron.exe` no destino e retornou ENOENT antes de abrir o aplicativo. Diagnóstico global reprovado. |
| [41483923275 — conversa real](https://github.com/oaovito/oao-companion-/actions/runs/41483923275) | `161398946439af0442030b2eefbbebf7f7347f11` | **31/32 casos engine** com o modelo local real. | O novo caso “Você tem pernas ou cauda?” recebeu “Não tenho, Manu. Só braços fortes…”, contradizendo as pernas restauradas. Os **12 casos da Central não executaram**, pois a etapa depende da aprovação do engine. Diagnóstico reprovado. |

Digest registrado para o conteúdo da medição de espaço das 434 bases:
`c4925755df8c7931c20c588893ccae71f5e708871d7e8d2f6c84d1794f35bc5d`.
É o digest do conteúdo serializado da medição, não do arquivo JSON formatado.
A auditoria foi feita no renderer real, Electron 44.9.3, Windows 10.0.26100,
com amostragem a 24 qps. Zero cortes na amostragem não dispensa a revisão visual.

A falha de setup Steam não comprova um defeito Unicode do produto. A fixture foi
corrigida para copiar explicitamente o executável retornado pelo pacote Electron,
mantendo cliente Unicode registrado no Windows e biblioteca em outra unidade.
Esse patch e as correções adicionais de inventário/recuperação ainda precisam do
próximo diagnóstico Windows.

Após o ensaio de conversa, o prompt passou a reforçar a anatomia antropomórfica
somente quando perguntada; o verificador foi ajustado para aceitar a negação
correta de cauda. São mudanças de código com regressões locais; a qualidade da
nova resposta depende de repetir a inferência real e ler todas as saídas.

### Os três comandos exigidos

No run `41483917417`, cada comando foi enviado pela Central; o teste confirmou a
animação correspondente e comparou duas capturas separadas por 700 ms. Todos
registraram `framesDiffer:true`. SHA-256 do segundo quadro:

| Comando | Cena | SHA-256 |
| --- | --- | --- |
| Encena Buff de café | `living_buffCafe` | `5fc3d2404707097bd389d64a62a8eaf7dc8255e97af38931522d47cbe6a5af16` |
| Encena Protagonista do prazo | `living_mainCharacter` | `01e99d992d0cfe879bdfd19a6daca0d886f5164b7a026b4b1447d57c653137fe` |
| Encena Policial | `living_policial` | `039f12482d4c5277e915bd4d4328661ac1251d9a365afcb1beb379721e6af98a` |

Os hashes identificam os quadros daquela execução. O fluxo alterado posteriormente,
incluindo pedido enfileirado durante crash e ocultação na recuperação, precisa ser
revalidado no commit candidato atual.

## Verificações locais após as correções adicionais

Estado incorporado em `f285032`: **445/445 unitários**, zero falhas e zero pulos,
Node **22.23.4**; lint de **210 arquivos**, `actionlint` e `git diff --check`
aprovados. O teste dos ícones compara o hash do rig com normalização LF, evitando
divergência apenas por CRLF do checkout Windows. Esses testes locais são de lógica
e não comprovam execução gráfica ou integração nativa Windows.

Regressões novas cobrem biblioteca EACCES/parcial, zero jogos legítimo, recuperação
sem amostra antiga, invalidação de provas de DD, mudança da raiz em cache,
contenção/normalização de caminhos, monitor menor integralmente coberto, descarte
de tickets antigos, renderer ainda carregando, fila atravessando crash e corrida
de ocultação. A versão anterior desta execução local teve uma divergência de hash
rig/ícones; o resultado final **445/445** é o registrado após corrigir a
normalização, sem enfraquecer a verificação da anatomia.

Benchmark puro de identificação de jogos, Node 22.23.4 no host Linux:

| Jogos × processos | Antes | Depois |
| --- | ---: | ---: |
| 1.000 ×300 | 548,17 ms | 32,62 ms |
| 5.000 ×300 | 2.795,62 ms | 56,09 ms |

A carga usa caminhos sintéticos na mesma unidade, sem correspondências. Mede
somente `identifyGame`, não a enumeração nativa nem o desempenho global Windows.

Logs locais privados em `/workspace/work/jojo-critical/`: `diag1.log`, `ui2.log`,
`qa2.log`, `unit-445.tap`, `native-regressions.tap`, `steam-review-unit.tap`,
`scene-readiness-after.log`, `native-steam-lint-final.log` e
`steam-identify-benchmark.json`. A quota de artefatos recusou uploads dos
diagnósticos; as evidências citadas foram preservadas nos logs e nas imagens
importadas, sem pressupor artefatos de download disponíveis.

## Arquivos principais alterados

- Arte: `assets/character/jojo.rig.json`, `assets/animations/jojo.room.json`,
  `assets/catalog/animacoes.json`, `assets/icons/`, `src/renderer/shared/rig-renderer.js`,
  `scripts/make-icons.mjs`, auditoria e fixtures/testes de anatomia.
- Foreground/fullscreen: `src/core/fullscreen-policy.cjs`, `foreground-sample.js`,
  `src/main/fullscreen-worker.cjs`, `fullscreen-monitor.js`, `main.js` e testes nativos.
- Cenas/renderer: `src/core/companion.js`, `src/main/living-service.js`,
  `overlay-window.js`, preload/renderer do overlay e testes de cenas/recuperação.
- Steam/DD: `src/core/steam-library.cjs`, `darkest-process.cjs`, `darkest-dungeon.js`,
  `src/main/steam-inventory-worker.cjs`, `steam-service.js`, `darkest-service.js`,
  interface/preload da Central e testes unitários/Windows.
- Identidade na conversa: `src/core/dialogue/llm-provider.js`,
  `scripts/check-conversation.mjs` e regressões correspondentes.

Commits da correção: `56e40a4` (restauração e correções iniciais), `1613989`
(renderer/DPI e arte medida) e `f285032` (recuperação, inventário, otimização,
ícones e identidade). Documentação, versão e controles oficiais acompanham a
candidata; fonte privada não deve ser enviada ao repositório público de binários.

## Limites efetivos da evidência

- Steam/DD Windows usam processos, manifestos e bibliotecas de fixture. Isso
  verifica mecanismos locais reais, mas não uma instalação comercial do jogo nem
  o computador da Emanuele. DD em background/foreground/encerramento passou no
  diagnóstico; a fixture Steam ampliada com Unicode/outra unidade ainda precisa
  executar após o ajuste de setup.
- Fullscreen a 150% passou em um runner; duas telas com DPI misto, desconexão
  física e suspensão real em Windows 11 doméstico não estão comprovadas.
  A regressão de dois monitores desta revisão é pura, com geometria sintética.
- Não há evidência específica de uso real de Google Meet compartilhando a tela
  ou de Steam/DD comerciais. Estados globais/apresentação têm testes de lógica;
  não equivalem à validação de todos esses aplicativos.
- O resultado mais recente da conversa continua em 31/32 engine, sem
  execução da Central. A correção do prompt não recebeu aprovação real posterior
  neste corte. O último diagnóstico geral de interfaces continua em 13/14.
- Instalador, portátil, vigia, dados, atualizador e desempenho da versão 0.45.0
  têm evidências históricas próprias; elas não aprovam esses gates para 0.45.1.
- Agenda permanece somente por link iCal, sem login/senha; silêncio, privacidade,
  Trabalho/Foco e demais funcionalidades cumulativas continuam obrigatórios.
  MNE_Lab não foi acessado nem modificado.

## Diagnóstico adicional e revisão manual — 41521403707 /41521410154

Fonte `f28503223f0ca9453ffce1e4a31d8ade48ac36b3`:

- [Interfaces41521403707](https://github.com/oaovito/oao-companion-/actions/runs/41521403707):
  **13/14 passaram**. Passaram os três comandos, a cena aguardando durante crash,
  recuperação do detector/renderer, ocultação durante recriação e fullscreen a150%.
  Steam falhou com `Process failed to launch!` ao iniciar processo de fixture;
  o log não identifica qual inicialização falhou. Não comprova defeito do cliente
  Steam real. Os ícones reexportados conferem byte a byte com os importados.
- [Conversa41521410154](https://github.com/oaovito/oao-companion-/actions/runs/41521410154):
  verificações automáticas **32/32 engine +12/12 Central**, sem erro de renderer.
  Digest do relatório `6f8bd7dc8822606595e7774a74c96fbe7b6e46d650654c98d9cd09cc3bbedc8e`.
  **Revisão manual reprovada**: anatomia reconhecida, mas a pergunta foi chamada de
  “idiota”; houve ironia sobre a memória da usuária e invenção de uma preferência
  por algas marinhas. Evidência integral e motivos em
  [conversa-windows-41521410154.json](evidencias/conversa-windows-41521410154.json).

As três cenas tiveram novamente dois quadros diferentes. Capturas privadas:
[Buff de café](evidencias/living_buffCafe-0.45.1.png),
[Protagonista do prazo](evidencias/living_mainCharacter-0.45.1.png),
[Policial](evidencias/living_policial-0.45.1.png).
Hashes respectivos: `88074bad8ef2aa4c1c38112236c8a406cb0f8820204b84608ef60268a8932adf`,
`bda164a285240573e9988a558b4fb21456da20a0715e64ad1aed0007cc0ccae3`,
`ce9d4d0182c7e765ec26937f7874fff2457b132603331a16591fa547c836dcee`.

Próximo: corrigir o preparo de processos da fixture Steam com diagnóstico limitado
por fase e ajustar a conversa para não insultar perguntas, ironizar memória ou
inventar preferências. Repetir ambos no Windows e ler cada saída antes dos gates
integrais. Um resultado automático verde não substitui essa revisão.

## Pipeline integral e publicação — a atualizar

**Ainda não concluído para 0.45.1.** Após os diagnósticos, executar os gates
obrigatórios no mesmo commit/run Windows oficial e preencher:

| Gate ou entrega | Estado neste rascunho |
| --- | --- |
| Preflight, instalação, lint e unitários no Windows | Pendente para o commit final |
| Integração nativa, E2E e recuperação | Pendente para o commit final |
| Conversa real engine +Central e revisão semântica | Pendente |
| Arte/auditoria de 1.268 animações e vínculo com o commit final | Auditoria anterior disponível; gate integral pendente |
| Build, NSIS instalado/iniciado/desinstalado, portátil e ZIP | Pendente |
| Vigia, desempenho e preservação de dados/atalhos | Pendente |
| Atualizações, compatibilidade, nomes/tamanhos/SHA-256 e notas | Pendente |
| Relatório integral, tag privada e três arquivos oficiais | Pendente |
| Publicação pública e verificação anônima do atualizador | **Não publicada** |

Somente após todos os gates obrigatórios aprovados pode ser preparada a nova
publicação. Preservar as 19 releases existentes; não mover tags nem substituir
arquivos da 0.45.0 ou anteriores. Atualizar este relatório com os resultados reais,
incluindo falhas e limites, antes de declarar a entrega concluída.
