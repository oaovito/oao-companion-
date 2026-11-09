# Validação JoJo Companion 0.45.1 — rascunho privado

**Ainda não publicada.** Retomada em 09/11/2026, a fonte é a branch privada
`codex/living-companion`, última fonte executada `106ba27d7287f41c2ef38fdcb5cf441f8d119304`.
A release pública vigente é 0.45.0. Nenhum diagnóstico parcial abaixo aprova
automaticamente o pipeline integral da candidata ou o computador da Emanuele.

Requisitos: [REQUISITOS_CORRECOES_0.45.1.md](REQUISITOS_CORRECOES_0.45.1.md).
Desenvolvimento: `oaovito/oao-companion-`; distribuição de binários:
`oaovito/jojo-companion-releases`. `main` permanece controle operacional.

## Causas comprovadas e comportamento corrigido

| Área | Causa identificada | Alteração na candidata |
| --- | --- | --- |
| Personagem | A alteração anterior substituiu recursos do personagem com pernas por nadadeiras/cauda; testes impunham a direção rejeitada. | Recursos históricos recuperados, cauda removida e testes comparando peças, proporções, rosto, cores e hierarquia originais. Canais legados adaptados às pernas; catálogo preservado. |
| Tela cheia | Estado global de notificações/apresentação era tratado como tela cheia; nem todas as janelas próprias eram reconhecidas. | Decisão pela janela ativa, visível e não minimizada, moldura e geometria física. Todas as janelas próprias excluídas. Jogo em background ou maximização comum não bastam para bloquear. |
| DPI e recuperação | O primeiro ensaio a150% falhou; amostras antigas podiam sobreviver a alterações do ambiente. | Limites DWM, contexto de DPI e verificação de monitores cobertos; validade temporal/geração das amostras e descarte após troca de janela, monitor, falha ou reinício do detector. |
| Cenas explícitas | Resposta genérica escondia a causa; pedidos podiam ficar atrás de conversa antiga ou se perder durante indisponibilidade do renderer. | Causas distintas, prioridade explícita, fila de4 com TTL20s, deduplicação e cancelamento de pedidos obsoletos. Cooldown somente após confirmação de quadros pelo renderer. |
| Renderer | Fuga/arrasto/captura podiam deixar estado visual transitório após crash; recriação podia reabrir janela ocultada. | Limpeza dos estados, handshake dos assets, espera limitada durante carregamento e recuperação respeitando ocultação, Trabalho/Foco e fullscreen. |
| Steam | Descoberta não cobria bibliotecas locais de forma reutilizável; falha parcial de leitura podia substituir inventário conhecido por vazio. | Registro, diretórios do cliente, libraryfolders e manifestos em worker separado. Atualização manual e indicadores reais na Central. Falha preserva jogos como desconhecidos e invalida amostras antigas. |
| Jogos e DD | DD exigia subdiretório fixo `_windows`; desconhecido não era distinguido suficientemente de encerrado. | AppID262060, manifesto e executável contido na instalação válida, sem subdiretório obrigatório. PID/criação identificam sessão; desconhecido pausa tempo/XP sem inventar encerramento. Background não conta como tempo ativo. |
| Identificação e custo | Normalização e ordenação de raízes repetiam trabalho para cada processo. | Cache de raízes normalizadas com invalidação, contenção com separador e raiz mais específica; launchers e webhelper não viram jogos. |
| Conversa | Ensaios reais revelaram insultos, ironia sobre memória e preferências inventadas; uma abertura depreciativa vinha do Companion após validar o modelo. | Guardas dirigidas aos desvios observados, instrução positiva para correção literal e substituição daquela abertura por “Vamos aos fatos.”. Sem modelo alternativo, resposta de demonstração ou inferência fictícia. |

Steam continua sem senha/token/autenticação. DD preserva marcos, limites,
conquista, sugestão06–21, sessão persistente e recompensas idempotentes.
Agenda permanece somente por link iCal, sem login/senha. To-Do, XP, cuidados,
comidas, clima, coleção, guarda-roupa, Discord, atalhos, atualização, silêncio e
privacidade seguem no escopo de regressão obrigatório.

## Restauração histórica e revisão visual

Fonte original: **`a3240e4976736eee5c319b71a249a0b87ad6e132`**, anterior à
mudança `2847e41`. Fixture: `test/fixtures/jojo-0.44.0.rig.json`.
Preservadas pernas, braços, mãos, pés, musculatura, proporções, rosto e cores;
removida a cauda conforme pedido, mantendo adereços e catálogo posterior.
Nenhuma mudança futura de anatomia, silhueta ou estilo está autorizada sem pedido
explícito; regra registrada nas instruções e especificação.

Renderização Windows inspecionada:
[histórico / versão rejeitada / restaurado](evidencias/restauracao-0.45.1.png) e
[75 cenas restauradas](evidencias/cenas-restauradas-0.45.1.png).
Ícones exportados pelo Chromium Windows a partir do rig restaurado e importados;
origem conferida com normalização CRLF→LF, sem alterar a imagem.

Run [41477698374](https://github.com/oaovito/oao-companion-/actions/runs/41477698374):
434 bases medidas, **1.268 animações**, zero erros/cortes/paradas/órfãs,
desenho médio0,45654ms na amostragem. Digest da medição serializada:
`c4925755df8c7931c20c588893ccae71f5e708871d7e8d2f6c84d1794f35bc5d`.
Isso é evidência da arte daquele commit; o gate integral ainda precisa vincular
arte, executável e relatório ao mesmo commit final.

## Evidência dos três comandos

Em [41521403707](https://github.com/oaovito/oao-companion-/actions/runs/41521403707),
os três comandos foram enviados pela Central, iniciaram suas cenas e produziram
dois quadros diferentes separados por700ms. Capturas privadas importadas:

| Comando | Captura | SHA-256 do quadro |
| --- | --- | --- |
| Encena Buff de café | [Buff de café](evidencias/living_buffCafe-0.45.1.png) | `88074bad8ef2aa4c1c38112236c8a406cb0f8820204b84608ef60268a8932adf` |
| Encena Protagonista do prazo | [Protagonista](evidencias/living_mainCharacter-0.45.1.png) | `bda164a285240573e9988a558b4fb21456da20a0715e64ad1aed0007cc0ccae3` |
| Encena Policial | [Policial](evidencias/living_policial-0.45.1.png) | `ce9d4d0182c7e765ec26937f7874fff2457b132603331a16591fa547c836dcee` |

O mesmo diagnóstico aprovou fila durante crash, ocultação durante recriação e
fullscreen a150%, mas terminou13/14 por falha no preparo da fixture Steam.
Não somar diagnósticos separados como aprovação integral.

## Verificações executadas e problemas encontrados

**Local:**470/470 testes de lógica, zero falhas/pulos, Node 22.23.4; lint de 222 arquivos,
actionlint e diff-check aprovados. Esses resultados não são testes gráficos.

| Execução Windows | Evidência efetiva | Resultado/ação |
| --- | --- | --- |
| [41477698374](https://github.com/oaovito/oao-companion-/actions/runs/41477698374) | Arte acima; interfaces12/14 | Crash/DPI falharam, corrigidos depois. |
| [41521403707](https://github.com/oaovito/oao-companion-/actions/runs/41521403707) | Interfaces13/14; três cenas e recuperação passaram | Setup Steam falhou; diagnóstico posterior revelou `locales` ausente na cópia Unicode. Cópia substituída por recursão explícita e conferência de todos os arquivos. |
| [41651499749](https://github.com/oaovito/oao-companion-/actions/runs/41651499749) | Steam isolado1/1: Registro Unicode, outra unidade, webhelper ignorado, fechada→aberta→fechada e jogo encontrado | Passou. Cliente/jogo são fixtures nativas; não prova Steam comercial. [JSON](evidencias/steam-windows-41651499749.json). |
| [41521410154](https://github.com/oaovito/oao-companion-/actions/runs/41521410154) e [41652278031](https://github.com/oaovito/oao-companion-/actions/runs/41652278031) |32engine+12Central automáticos verdes | Revisão semântica reprovou insulto/ironia/preferência inventada. Correções posteriores exigem novo ensaio real. |
| [41655112676](https://github.com/oaovito/oao-companion-/actions/runs/41655112676) |32/32engine;9Central passaram;10º fallbackunknown;2não executaram | Causa do descarte científico não comprovada. Revisão detectou chuva externa inventada; guarda corrigida. Instrumentação do ensaio agora preserva raw/warnings. |
| [41660524964](https://github.com/oaovito/oao-companion-/actions/runs/41660524964) |UI isolada:1passou/1falhou/10não executaram | Raw/warning comprovaram timeout da primeira geração; `ui_only` omitia pré-carga. Preparo corrigido sem aumentar timeout. |
| [41724376443](https://github.com/oaovito/oao-companion-/actions/runs/41724376443) |0cenários executados | `/api/pull` excedeu660s antes dos testes; runtime baixou/iniciou. Não é resultado de conversa. [JSON](evidencias/model-download-41724376443.json). |
| [41727762420](https://github.com/oaovito/oao-companion-/actions/runs/41727762420) |Manifesto HTTP200; Range1MiB HTTP206 em1246ms | Passou, sem inferência/download completo. Justifica uma tentativa limitada. [JSON](evidencias/model-network-41727762420.json). |
| [41728621830](https://github.com/oaovito/oao-companion-/actions/runs/41728621830) |Central isolada com pré-carga corrigida | 12/12automáticos, zero warnings/erros do renderer; revisão reprovou preferência não informada (“água fria, como você gosta”). Exemplo científico respondeu sem fallback. Comparações implícitas agora exigem o mesmo assunto em preferência afirmativa da usuária; saudação orienta o próprio humor.35/35focados e462/462locais passaram; nova inferência pendente. |

O pipeline integral [41730444087](https://github.com/oaovito/oao-companion-/actions/runs/41730444087)
aprovou preflight/lint/instalação e462/462unitários no Windows. Parou em29/32engine:
três respostas omitiram os assuntos esperados (café/teclado, chefe/prazo, cat).
A leitura encontrou também “o sol está forte hoje” sem dado informado. Os12casos
da Central e gates seguintes NÃO executaram. Evidência:
[conversa completa e revisão](evidencias/conversa-windows-41730444087.json).
Prompt casual compactado de 256 para 147 palavras, com tarefa final após perfil/dados,
e guarda meteorológica ampliada.52/52 testes focados,29/29 de coerência e464/464
unitários locais passaram. Essas correções ainda dependem de nova inferência real.

Em [41804545246](https://github.com/oaovito/oao-companion-/actions/runs/41804545246),
fonte `9d9f883`,464/464unitários Windows passaram, engine30/32; Central não executou.
A guarda rejeitou preferência inventada no café; prazo permaneceu genérico. Leitura
reprovou ainda Borges favorito inventado e repetição anatômica sem histórico.
[Saídas e revisão](evidencias/conversa-windows-41804545246.json). Próximo passo:
avaliar candidato local Qwen4B Instruct2507 no ensaio diagnóstico, sem alterar o
modelo oficial antes da evidência real e sem trocar infraestrutura ou critérios.

O candidato Qwen3 4B Instruct2507 foi **reprovado** no
[41806190187](https://github.com/oaovito/oao-companion-/actions/runs/41806190187):
29/32engine e Central não executada. Anatomia excedeu25s; café/cat retornaram
fallback. Leitura reprovou falas depreciativas e citações em assuntos pessoais.
[JSON completo](evidencias/conversa-windows-41806190187.json). Modelo oficial
permanece Gemma. Auditoria de payload reproduziu histórico científico irrelevante
no contexto casual e tema médico reativado após mudança para assunto pessoal;
a próxima correção trata a implementação e preserva continuidade pertinente.

Correção de contexto validada em470/470unitários locais e55/55focados. O request
capturado preserva fontes em seguimento técnico direto e exclui o tema médico
antigo após assunto pessoal. A seleção por assunto preserva correções reais,
referências claras e histórico visível; sua relevância lexical não pretende
resolver sinônimos universais. O ensaio real oficial Gemma32+12 e o diagnóstico
nativo parcial serão executados em paralelo, sem publicar. Todos os16gates do
run integral final continuam obrigatórios.

O ensaio NSIS foi ampliado para abrir o executável instalado e comprovar
`app.isPackaged`, worker/core desempacotados do app.asar, inventário da fixture e
saída normal antes das três atualizações. **Essa ampliação ainda não passou no
pipeline integral.**

Benchmark puro de `identifyGame` no host Linux/Node22,5.000jogos×300processos:
2.795,62→56,09ms;1.000×300:548,17→32,62ms. Mede apenas a função com caminhos
sintéticos, não o monitoramento Windows ou desempenho global.

## Versionamento e arquivos principais

Histórico preservado sem reset/force. Recuperação registrada em `cff4e1d`;
implementação principal em `56e40a4`, `1613989`, `f285032`, `5297759`, `467b475`,
`60336df`, `81b287a` e `dfc2dc4`; evidência/revisão técnica em `6496fe6`,
`49005d4` e `da199bb`. CLI `gh` retornou401; conector GitHub permaneceu funcional.
Git Data API conferiu blobs/árvore/commit e atualizou a ref com lease, preservando
histórico e sincronizando checkout sem substituir credenciais.

- Arte: `assets/character/jojo.rig.json`, `assets/animations/jojo.room.json`,
  catálogo/ícones, `rig-renderer.js`, gerador e testes históricos de anatomia.
- Windows: `fullscreen-policy.cjs`, `foreground-sample.js`, `fullscreen-worker.cjs`,
  `fullscreen-monitor.js`, `main.js`, `overlay-window.js`, preload e renderer.
- Cenas: `companion.js`, `living-service.js` e testes de cenas/recuperação.
- Steam/DD: `steam-library.cjs`, `darkest-process.cjs`, `darkest-dungeon.js`,
  worker/inventário/serviços e interface da Central.
- Conversa: `llm-provider.js`, `ciencia.js`, ensaio real e regressões.
- Validação: workflows oficiais, `actions-windows.mjs`, `ci-evidence.mjs`,
  `measure.mjs`, smoke NSIS e testes Windows.

## Pipeline final e distribuição — preencher somente com evidência

| Campo | Resultado a registrar |
| --- | --- |
| Commit final validado /tag privada nova | **PENDENTE** |
| Run/job/tentativa Windows integral | **PENDENTE** |
|16gates do mesmo run | **PENDENTE**; não preencher com diagnósticos parciais |
| Unitários/integração/E2E efetivamente executados | **PENDENTE** |
|32engine+12Central e leitura de todas as saídas | **PENDENTE** |
| Digest e aprovação semântica do mesmo SHA/run/tentativa | **PENDENTE** |
| Auditoria1.268 e revisão visual final | **PENDENTE** |
| NSIS/portátil/ZIP, vigia, dados, atalhos e três atualizações | **PENDENTE** |
| CPU/memória por cenário Windows | **PENDENTE**; registrar números e escopo, sem inventar limite |
| Três assets públicos, tamanhos e SHA-256 | **PENDENTE** |
| Release nova/notas incrementais e downloads anônimos | **NÃO PUBLICADA** |
| Updater0.45.0→0.45.1 nos dois modos e sem repetição em0.45.1 | **PENDENTE** |
| Comparação das19releases históricas e suas tags/assets | Metadados/assets19inalterados; SHAs19tags públicas/27privadas registrados antes da candidata. Comparação final **PENDENTE** |
| Controle main0.45.1 e verificação horária idempotente | **PENDENTE** após publicação |

O pipeline integral exige evidência privada das44falas e registro técnico em
`semantic-review.json`, vinculados ao mesmo commit/run/tentativa/digest, antes do
build. A ausência, rejeição ou falha de integridade bloqueia publicação. Trata-se
da revisão de Codex; não exige confirmação manual da usuária.

## Limitações e pendências efetivas

- Fixtures Windows verificam mecanismos nativos de Steam/DD e transições de
  atividade; não comprovam instalações comerciais ou o PC da Emanuele.
- Um runner hospedado Windows Server não comprova Windows11 doméstico, duas
  telas físicas com DPI misto, desconexão física ou suspensão real. Há testes
  puros de geometria e um cenário Windows a150%.
- Não foi comprovado compartilhamento real de GoogleMeet no PC da usuária.
- Conversa real e todos os gates finais permanecem pendentes neste corte.
  Verificações lexicais verdes não substituem a leitura das respostas.
- A quota de artefatos CI recusou uploads; evidências recuperáveis permanecem em
  logs/JSON privados. Não foram compradas quotas nem removidos artefatos antigos.
-0.45.0 e versões anteriores são imutáveis. MNE_Lab não foi acessado/modificado.

Após os gates e publicação, substituir os campos pendentes por dados do run
oficial e registrar apenas “nenhuma regressão detectada nos testes executados”,
sem prometer perfeição universal ou validação física não realizada.
