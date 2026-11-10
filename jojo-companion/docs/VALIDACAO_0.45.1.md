# Validação JoJo Companion 0.45.1 — rascunho privado

**Ainda não publicada.** Retomada em 10/11/2026, a fonte é a branch privada
`codex/living-companion`, cada ensaio corresponde ao commit indicado na sua evidência.
A release pública vigente é 0.45.0. Nenhum diagnóstico parcial abaixo aprova
automaticamente o pipeline integral da candidata ou o computador da Emanuele.

Requisitos: [REQUISITOS_CORRECOES_0.45.1.md](REQUISITOS_CORRECOES_0.45.1.md).
Desenvolvimento: `oaovito/oao-companion-`; distribuição de binários:
`oaovito/jojo-companion-releases`. `main` permanece controle operacional.

### Último diagnóstico de entrada — fonte 95343cb

No run [42865725982](https://github.com/oaovito/oao-companion-/actions/runs/42865725982),
o caso de clique transparente passou: alvo correto sob o cursor, captura nativa
zero, `WS_EX_TRANSPARENT` e entrega de um único clique real comprovados.
A integração terminou **15/16**, sem testes pulados, pela falha do caso9:
o overlay continuou visível. O caso10 de fullscreen durante interação passou.
A causa do caso9 ainda não está demonstrada: faltavam foreground Win32 real,
geometria física da fixture e última amostra. Não atribuir isso ao detector.

O próximo diagnóstico corrige somente essa preparação de teste: expõe a fixture
sem ativar outras janelas, ativa-a com um único clique real e exige foreground
correto/cobertura do monitor antes de observar o aplicativo. Mantém os4500ms,
a amostra real e a exigência de ocultação e reexibição. Sem alteração funcional,
sem pedido de refresh ao detector e sem repetir o ensaio de conversa ainda ativo.
E2E, auditoria e medição seguem sem execução nesse diagnóstico incompleto.

Conversa [42865726035](https://github.com/oaovito/oao-companion-/actions/runs/42865726035)
concluiu **32/32 motor e 12/12 Central** com o histórico correto na validação.
Zero erros do renderer/avisos. As44falas,30respostas brutas e2baselines foram
lidos e aprovados para esta amostra por revisão principal e independente, com
ressalvas sobre humor próprio ambíguo e simplificação de exemplo hipotético.
Nenhum fato pessoal inventado ou prescrição individual foi identificado. O próximo
commit de diagnóstico altera somente testes/documentação/workflow, sem repetir
esta conversa. O run integral final exigirá nova leitura das suas próprias44falas.

No modo parcial `input-only`, E2E, auditoria e desempenho passarão a coletar seus
resultados mesmo após outra suíte falhar, desde que o build esteja aprovado e
não haja cancelamento. Cada falha continua reprovando o job; modo normal e
publicador integral preservam a sequência/gates. Isso evita ocultar falhas
independentes atrás do primeiro teste, sem aprovar uma execução incompleta.

### Diagnósticos anteriores — fonte 3b54a94

No run [42863401910](https://github.com/oaovito/oao-companion-/actions/runs/42863401910),
a integração concluiu **15/16**, sem testes pulados. O registro Win32 comprovou
que o overlay estava com `WS_EX_TRANSPARENT`, captura main/renderer falsa e
captura nativa zero. Antes do clique, o HWND sob o cursor era outra janela,
diferente da fixture de destino. Essa outra janela ficou em primeiro plano após
pressionar; a fixture não recebeu eventos. A falha estava na pré-condição de
ordem das janelas do ensaio, sem evidência de captura indevida pelo aplicativo.

O próximo diagnóstico prepara somente a fixture abaixo do overlay sem ativá-la,
confere que o foco permaneceu igual e exige o HWND do alvo sob o ponto antes do
único clique real. Corpo/interface/pixels transparentes e entrega ao alvo seguem
obrigatórios. Nenhum código de captura do produto foi alterado. Novo Windows
continua necessário; E2E, auditoria e medição não executaram nesse run.

Conversa [42863402143](https://github.com/oaovito/oao-companion-/actions/runs/42863402143):
**32/32 motor**. A Central coletou cinco falas e parou na quinta; quatro casos
concluíram e sete não executaram. A resposta “Verde é a sua cor preferida” era
fundamentada na terceira mensagem, mas a asserção extra do teste chamou a guarda
sem histórico. Replay puro confirmou rejeição sem contexto e aprovação com o
histórico anterior real. O harness agora usa um snapshot de `dialogue.history`
anterior ao envio, sem fundamentar a resposta em si mesma. A regressão Aurora/
Alvorada preserva rejeição sem histórico ou só com fala do assistente.
**34/34 testes de coerência** passaram após o ajuste; a suíte completa de
**486 testes puros** passou na fonte anterior. Isso não comprova novo Windows.

Próximo commit repete os diagnósticos de conversa e entrada: mesmos 32+12 casos,
16 integrações, 43 E2E, auditoria e medição. Nenhum modelo, guarda, prazo ou código
funcional mudou neste ajuste de harness. Os 16 gates integrais continuam pendentes.

### Resultados anteriores — fonte b90aab5

Conversa [42837051036](https://github.com/oaovito/oao-companion-/actions/runs/42837051036):
**32/32 motor e 12/12 Central**, zero erros do renderer/avisos. As 44 falas,
30 respostas brutas e dois baselines foram lidos. Preferências e correções foram
lembradas corretamente. A revisão independente considerou esta amostra aprovável
com ressalvas; a revisão principal solicitou orientação mais direta para perguntas
factuais e distinção entre relato e resultado desconhecido: “teclado fora de uso”
não foi informado pela usuária, e “Não precisa me lembrar” soou brusco.
Humor sobre a memória do próprio JoJo continua permitido. Isso não aprova release.

Entrada nativa [42837051742](https://github.com/oaovito/oao-companion-/actions/runs/42837051742):
**15/16**, sem testes pulados. O novo ponto ficou fora do corpo e da interface,
com alpha zero e captura local do renderer falsa, mas nenhum clique chegou ao
alvo. A causa ainda não está comprovada: faltam captura no main/Win32 e HWND
receptor. O próximo diagnóstico apenas observa esses estados, sem forçar foco,
captura, margem maior ou repetição de clique. E2E, auditoria e medição não executaram.

Próximo ensaio preparado: perguntas de retomada solicitam uma frase factual,
sem responder ao pedido com comentários adicionais. A conversa comum mantém o
humor próprio; perguntas causais, de habilidade e piadas não entram nessa rota.
Relatos reais distinguem fatos informados de consequências possíveis. O prefixo
técnico, modelo oficial, prazos e guardas permanecem iguais. **486/486 testes
puros** passaram, sem falhas/pulos; novo Windows ainda pendente neste corte.
O diagnóstico de mouse observa os estados main/Win32, o HWND sob o cursor,
a captura por thread e os eventos antes/durante/depois de um único clique real.

### Corte anterior — 10/11/2026, diagnósticos concluídos

Comparação **42724504309**, fonte `56112c4`: Gemma **28/32 engine** e
Ministral3B **23/32 engine**. A Central não executou em nenhum dos dois jobs.
A leitura das32linhas, raw replies e baselines reprovou ambos: preferências e
histórico inventados, comentários de memória e, no candidato, confusão entre
falas do assistente e fatos da usuária. Ministral teve seis descartes por tamanho
e dois timeouts próximos de25s. **Gemma permanece oficial**; nenhum candidato
foi adotado. [Evidência](evidencias/conversa-windows-42724504309.json).

Diagnóstico nativo3 **42723059182**, fonte `5421e2a`, concluído: build dos três
formatos, NSIS com Koffi3.3.3 carregado do pacote, Steam empacotada closed/known,
três atualizações, portátil e vigia passaram. Integração **15/16**: falhou a
asserção de clique na área transparente no modo de interação. E2E43, auditoria
1.268, desempenho e etapas seguintes não executaram. Isso não é aprovação
integral. [Evidência](evidencias/nativo-windows-42723059182.json).

Corrigido também um vazamento comprovado no filtro de contexto: termos
citados somente pelo assistente não selecionam um assunto independente.
Referências explícitas, seguimentos e correções literais preservam o histórico.
Três regressões cobrem termos novos e os papéis reais do payload.

Preparadas correção da geometria do ponto transparente no teste, sem
alterar a política de entrada do produto, e instrução casual de138palavras com
limite explícito de25palavras/240caracteres. Casos32+12, guardas, modelo oficial
e timeouts preservados. O próximo diagnóstico `[input-only]` compila diretório
desempacotado e executa integração16, E2E43, auditoria e desempenho; não publica
e não substitui os16gates do mesmo run integral final. **Novo Windows ainda não
executado neste corte.**

**484/484 testes puros**, zero falhas/pulos, Node22.23.4, e actionlint dos quatro
workflows aprovados. Isso valida lógica/sintaxe, sem inferência ou gráficos no
Linux. Release0.45.1 continua não publicada; releases antigas preservadas.

## Registros anteriores

As seções abaixo preservam os cortes anteriores e seus próximos passos da época;
o estado atual é o registrado acima.

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

**Local:**484/484 testes de lógica, zero falhas/pulos, Node 22.23.4; lint sintático,
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

Diagnósticos do commit `1e0bf9e`: conversa
[42642784960](https://github.com/oaovito/oao-companion-/actions/runs/42642784960)
automaticamente32+12, mas revisão reprovada por preferências inventadas e ironia
de memória. [Saídas completas](evidencias/conversa-windows-42642784960.json).
Nativo[42642784947](https://github.com/oaovito/oao-companion-/actions/runs/42642784947)
compilou três formatos, mas o app instalado retornou detector indisponível;
demais testes pulados. [Estado](evidencias/nativo-windows-42642784947.json).

A inspeção estática do ZIP público0.45.0, sem executar binários no Linux,
confirmou Koffi index.cjs com require('./src/static.cjs') e esse arquivo ausente
no app.asar, embora o módulo nativo@koromix exista. A exclusão de fonte C++ removeu
também runtimeJS. [Prova/sha](evidencias/koffi-publicado-0.45.0.json).
A correção do pacote e a captura do erro de inicialização ainda dependem de novo
NSIS Windows; o próximo candidato8B precisa passar inferência antes de adoção.

Patch de embalagem preserva static.cjs e mantém exclusão apenas de fontes C++;
monitor agora reconhece falha de init semid e limpa estado sem expor paths.
O NSIS exigirá carregamento REAL do Koffi/versão/módulo nativo instalado antes de
Steamclosedknown.473/473unitários locais passaram; novo Windows instalado pendente.
Candidato Llama3.1 8B será avaliado pelos mesmos32+12casos/timeouts; oficial ainda
Gemma. EOS oficiais conservados conforme [metadata](evidencias/llama-3.1-eos-metadata.json),
sem download de pesos ou inferência no Linux.

Llama8B reprovado no[42721691138](https://github.com/oaovito/oao-companion-/actions/runs/42721691138):
27/32engine,5timeouts,citaçõespessoaisinventadas;Centralnãoexecutou.Nãoadotado.
[Saídas/revisão](evidencias/conversa-windows-42721691138.json).
Próximacomparação explícita Gemma/Ministral3B usamesmos32+12/prazos comorientação
que separa usuáriareal daficção doJoJo.474unitários locaispassaram;qualidadereal
aindapendente,oficialinalterado. [MetadataMinistral](evidencias/ministral-3b-metadata.json)
lidasempesos/inferênciaLinux. O diagnóstico nativo **42723059182** concluiu NSIS/Koffi/Steam, três atualizações,
portátil e vigia com sucesso; integração15/16 falhou no clique transparente.
E2E/auditoria/desempenho e etapas seguintes não executaram. Não é aprovação integral.

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
