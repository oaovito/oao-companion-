# HANDOFF — JoJo Companion

## Funeral do shape (não lançado), 18/11/2026

Pedido do usuário: comida fora da dieta → slide de funeral com fotos de uma personagem gerada
no ChatGPT (ele mostrou o print da geração; `assets/funeral/foto01–12.jpg`, 360 px). Detecção
na intenção `docinho` (`COMIDA_GORDA` em `scripted-provider.js`), que agora vence o pacote de
comida; `_doChatAction('nojo')` → `Companion._funeral` (11 s, 6 fotos sorteadas, legenda);
layout no lugar do balão (`funeral` no estado do overlay, `#funeral` sem clique). Testes:
`pacotes.test.js` e E2E em `needs.windows.mjs` (47 E2E).

## Visuais por nível (não lançado), 18/11/2026

REGRA IRREDUTÍVEL (pedido de 18/11): títulos = referências de filme, anime, série, jogo e
cultura pop, sem repetir obra (teste em `visual-nivel.test.js`), todas as clássicas de
tubarão presentes (Tubarão 2, 3 e 4 entram como filmes próprios); `extras` = 20 visuais de
South Park (ids `sp01`–`sp20`, níveis 10, 20 … 200) e 50 de memes do Twitter (`tw01`–`tw50`,
níveis 4, 8 … 200, sem pudor), fora dos títulos, separados pelo campo `colecao`; peça, fala e reação de cada nível vêm da
referência. Dados em `progressao.json` → `referencias` (titulo, obra, tipo, parte, forma,
peca, cores, fala, anim, reacao?), alinhado com `niveis`. Formas desenhadas em
`visual-nivel.js` (FORMAS, PINTURA, AURA, MAO); brilhos de acabamento no grupo
`nivelBrilho`. A seção abaixo descreve a primeira versão (títulos marinhos), substituída.
Transformações (18/11, autorizadas pela usuária só para visuais): `transforma` em cada
referência/extra (`cabeca`, `corpo`, `boca` — fatores; `olhos` — estilo em `OLHOS`; `pele` —
corpo/barriga/musculo/cabeca/olho/esclera). Renderer: canais `nvCabeca` (escala no pivô do
pescoço, partes `headRot` e rosto), `nvCorpo` (partes marcadas `corpoX`; braços `ladoX`),
`nvBoca`, `nvOlhos` (`_olhoEstilo`) e paleta `costume_pele<id>` (cabeça usa `nvCabecaPele`).
A peça mais recente vence cada transformação. Exagero (18/11): `barrigona` (fator),
`papada`, `manchasOlhos`/`orelhasRedondas` (cor), `suor`, `baba`, `sujeira`, `moscas` viram
partes (`partesDoCorpo`, grupo `nivelCorpo`); `pele.membros` pinta braços e pernas (`nvMembros`).
Detalhe do panda em todos (18/11): `pele.bracos`/`pele.pernas` (`nvBracos`/`nvPernas`; `membros`
pinta os dois), traços `orelhas` (ogro, gato, cachorro, coelho, elfo, totoro, pequenas; cor =
pele da cabeça ou `corOrelhas`), `chifres` (inseto, diabo), `juba`, `antenas`, `serraCabeca`,
`tenis`, `pintas`; forma `transformacao` = só o corpo, sem objeto. Arquinho de orelha removido.
Movimento: partes usam `scaleBy`/`dx`/`dy` com canais `nvBarriga`, `nvPapada`, `nvMoscaX/Y`,
`nvSuor`, `nvBaba`, `nvAura`, `nvBolhas`, `nvBrilho/2`, calculados por quadro em
`movimentoVisual` (overlay; desligado no movimento reduzido). `Companion._animDoVisual`:
18% das escolhas de repouso tocam a animação de uma referência vestida. Janela ganha espaço extra em cima/dos lados.
Avisos (18/11): `visualNivel.avisar` guarda o que o JoJo ainda não anunciou (abertura,
nível novo; repetido a cada minuto se não deu para falar) e `novas` o que a Central
ainda não mostrou (selo "Novo", contador no botão; `app:visuais-vistos` limpa). Na
Central, liberado = nome + obra + fala; trancado = só `{nivel}` → cadeado.

Pedido: a cada nível uma melhoria de aparência coerente com o título, o nível N+1
melhor que o N, tudo liberado equipável à vontade e nada bloqueado visível.
`src/core/visual-nivel.js` gera 199 peças (níveis 2–200) a partir dos títulos de
`progressao.json`: parte por nível (`parteDoNivel`), cor por palavra do título
(`temaDoTitulo`), detalhe crescente por faixa e por nível (`t`). Só peças por cima
do desenho: `rigComVisuais` acrescenta partes com `showIf` próprio (`nv_nvNNN`;
bermuda por `costume_bermudaNvNNN`) e dois grupos sem contorno (`nivelAura` atrás de
tudo, `nivelPintura` após `armDetail`), sem tocar nas partes originais. Estado em
`visualNivel` ({pecas, visto}); `Progress.onLevelUp` → `Companion._syncVisual` veste a
peça nova e avisa; a parte ocupada por roupa/fantasia fica com elas (`canaisVisual`).
Central recebe só `visualSnapshot` (liberadas). Testes: `test/unit/visual-nivel.test.js`
e E2E em `test/e2e/needs.windows.mjs`; contagens do CI 667 unitários e 46 E2E.
Vai na 0.47.2 junto com o WhatsApp.

## Em andamento — revisão do WhatsApp (não lançada), 13/11/2026

Branch `claude/dreamy-allen-4mtm7j`, baseada em `codex/living-companion` (`8abfe20`,
0.47.0 publicada) por merge que mantém a árvore do app. Commits: `5174d7a`
(diagnóstico), `61ba36a` (conexão), `d30e325` (QR), `a2f8343` (contatos), `8e6b84e`
(serviços), `76fe2ae` (E2E). Diagnóstico em `docs/WHATSAPP_DIAGNOSTICO.md`; uso e
estados em `docs/WHATSAPP.md`; CHANGELOG em "Não lançado — WhatsApp revisado".

Causa do "erro de conexão": o worker classificava cada queda pelo texto do erro e
ignorava o código do WhatsApp (QR expirado e o reinício normal 515 viravam
"o WhatsApp recusou", com reconexão em laço e travamento). Achado extra: envio
confirmado era tratado como falha (id do pedido sobrescrito) e podia repetir a
mensagem até três vezes. Ambos corrigidos e cobertos por testes.

Validação: 644/644 unitários locais (linha de base 620: 619 + 1 pulado só fora do
Windows) e 644/644 no Windows (run 43343803676, tentativas 1 e 2). Conversa real:
tentativa 1 reprovou 1/32 ("Which animal…", variação do modelo, motor de conversa não
alterado); tentativa 2 passou 32/32 + 12/12, mas a revisão semântica não foi gravada
nos 5 min. Tentativa 3 ficou na fila sem runner desde 02:26 UTC; a verificação horária
também parou de rodar depois de 01:51 (indício de bloqueio de minutos/faturamento,
não verificável pela API). Build, NSIS, integração e os 44 E2E (inclui
`test/e2e/whatsapp.windows.mjs`) ainda NÃO rodaram no Windows. Conexão real até o
QR verificada contra o servidor do WhatsApp; leitura do QR com celular real e envio
real não verificados. Nenhuma versão nova, tag ou release.

Atualização 13/11: diagnóstico de interfaces 43443034819 (Windows real) passou 15/15
E2E, incluindo `whatsapp.windows.mjs`. O pipeline integral segue parando no ensaio de
conversa real por variação do modelo (frase de desdém recusada pela guarda de
`coherence.js`, fora do WhatsApp; a usuária pediu para não alterar a conversa). Novo
relato: o celular recusava o QR ("Verifique sua conexão"); causa e correção no adendo
de `docs/WHATSAPP_DIAGNOSTICO.md` (identidade Chrome e `companion_reg_refresh`).

PUBLICADA 18/11: a 0.47.1 saiu SEM o WhatsApp (pedido "Publica tudo menos o que envolve
WhatsApp"), da árvore `codex/living-companion` @ `69af7c5`, run 44203264231 tentativa 2
(conversa aprovada; release pública e atualizador verificados pelo próprio run). Conteúdo:
200 títulos, curva da 0.47.0 ×10, 238 bônus (coleção, não aceleram nível), painel sem
corte, seções de Tarefas e Discord ocultas. O WhatsApp desta branch precisa sair como
0.47.2 (versão, CHANGELOG e `ci/actions-cost-policy.json` a ajustar na próxima publicação).

Publicação 0.47.1 (13/11, autorizada pela usuária): versão, CHANGELOG e política
preparados em `dd50b99`, `codex/living-companion` avançada por fast-forward. Run oficial
43471126958, tentativas 1–5: preflight, lint, instalação e 644/644 unitários passaram em
todas; o ensaio de conversa real reprovou em todas. Padrão: o modelo acerta a memória
(verde, manga, cat) mas acrescenta "Não precisa perguntar de novo" / "It's a simple
question", e a guarda de desdém (`src/core/dialogue/coherence.js:143`, commit `8abfe20`)
descarta a resposta inteira; às vezes também omite o prazo do chefe. Nada publicado,
nenhuma tag criada. Decisão pendente da usuária em `docs/PROXIMA_SESSAO_WHATSAPP.md`.

14/11: a pedido da usuária, painel do aquário ao lado do JoJo refeito (largura 250,
duas linhas sem quebra; antes o texto quebrava e "Cuidados" saía cortado) e seções
"Lista de Tarefas" e "Bloqueio do Discord" ocultas nas Configurações (`hidden`, como
Personalidade e Sistema; valores salvos mantidos). Tutorial e fala do /discord deixam
de mandar para essas seções. Testes: `test/unit/interface-oculta.test.js` e novo E2E em
`test/e2e/needs.windows.mjs` (medidas reais do painel no Windows). Entra na 0.47.1.

14/11: progressão ×10 a pedido da usuária (plano escolhido: números ×10, ritmo igual).
200 níveis com título próprio (`assets/catalog/progressao.json`; 17/11: de 100 para 200), escala `escalaXp: 10`
aplicada só no crédito (`Progress.award`); fontes (tarefas, cuidados, Darkest) seguem com
valores e tetos nominais e as telas mostram ×10 via `src/core/xp-escala.js`. XP guardado
e histórico convertidos uma vez (`st.escalaXp`). Limiares = curva da 0.47.0 ×10 em todos
os níveis (17/11: tirado o teto do nível 30; o tempo de progressão é o da 0.47.0). 238 bônus
(17 regras × 14 atividades), máx. 1 por ação, 6 e 60 nominais (600 na tela) por dia; o XP
de bônus vai para `st.xpBonus` (coleção) e não conta para o nível. Testes: `test/unit/progressao-xp10.test.js`; três testes
antigos tiveram só o número esperado ×10 (needs, darkest-dungeon, E2E de tarefas/cuidados).

Próximo passo: com runner disponível, reexecutar o run (ou novo push), revisar as 44
falas em `codex/ci-evidence-<run>-<tentativa>/…/semantic-review.json` dentro de 5 min
e conferir os 44 E2E.

## Entrega atual — 0.46.0 publicada em 11/11/2026

Tag/fonte **f0899e1f7b2bc0880b35b78890b2ffd1d8e13dae**, branch `codex/living-companion`
(trabalho feito em `claude/utilidades-tutorial`, mesma ponta). Run
[43084257627](https://github.com/oaovito/oao-companion-/actions/runs/43084257627)
aprovou todos os gates no mesmo job e publicou
[v0.46.0](https://github.com/oaovito/jojo-companion-releases/releases/tag/v0.46.0):
586 unitários, conversa real com revisão das 44 falas, build, NSIS, portátil,
16 integrações, 43 E2E, auditoria de animações, artefatos, atualizador e notas.
API pública `/releases/latest` conferida sem token: v0.46.0 com os três arquivos.

| Arquivo | Bytes | SHA-256 |
|---|---:|---|
| `JoJoCompanion-Setup-0.46.0.exe` | 111974532 | `6c61833c6276d70f3f46797aa8a8091bf510dea33375616d44c9e0d02fabfc35` |
| `JoJoCompanion-0.46.0-win-x64.zip` | 143017958 | `9bde2ef315e576bca70cfa4b40eaa3d67cb065e8bfe37084206ae09d029527b0` |
| `JoJoCompanion.exe` | 102455290 | `17c9712d5fd18ce0fd5cec928b31cce35f1950c6aec1adda638430a5a784e454` |

O que entrou: doze utilidades de rotina (lembretes, notas, quebra de tarefas,
hábitos, rotina, treino, estudo, resumo do dia, check-in, foco em ciclos), vinte
animações do foco (`docs/FOCO.md`), bloqueio opcional do Discord, desligado por
padrão (`docs/DISCORD.md`), e tutorial com cobertura obrigatória (`docs/TUTORIAL.md`).

Pendências reais, nada disto foi observado em uso: desinstalação com Discord
instalado; extensão carregada em Chrome/Edge/Brave; bronca e funções de estudo
com o modelo local; tutorial e Configurações no app aberto; atualização no PC
da Emanuele. Decisões em aberto com o João: lembrete de água e check-in ligados
por padrão; "me ajuda a começar X" acionando a quebra de tarefas; rótulos em
inglês do `/pet`; painéis na Central para as utilidades novas. Na revisão das
falas o modelo tratou a usuária no masculino em uma fala ("meu caro").
Não repetir build/publicação desta versão.

## Entrega anterior — 0.45.1 publicada em 10/11/2026

Tag/fonte **eedac8f6e330d2e072ac20fd668cc1bb529becba**, branch `codex/living-companion`.
Run [42895990176](https://github.com/oaovito/oao-companion-/actions/runs/42895990176)
aprovou os 16 gates no mesmo job e publicou
[v0.45.1](https://github.com/oaovito/jojo-companion-releases/releases/tag/v0.45.1):
486 unitários, conversa real 32 motor + 12 Central com revisão das 44 falas,
build, NSIS, portátil, vigia, 16 integrações, 43 E2E, 1.268 animações, desempenho,
artefatos, atualizador e notas; GPU e pesquisa web (opcionais) também passaram.
API pública `/releases/latest` conferida sem o token de publicação: v0.45.1 com os
três arquivos e digests iguais ao relatório. Releases anteriores intactas.
Detalhes, hashes e limites em [docs/VALIDACAO_0.45.1.md](docs/VALIDACAO_0.45.1.md).

Pendências reais: atualização não observada no PC físico da Emanuele; cota de
artefatos do Actions esgotada (zero artefatos retidos, evidência na pasta
`docs/evidencias`); o ensaio do motor (32 casos) ainda exige `intent: ia` e pode
reprovar por variação do modelo; `main` (controle horário) ainda registra 0.45.0.
Não repetir build/publicação desta versão. As seções abaixo são históricas.

## Missão anterior — correções críticas 0.45.1 (histórico até a publicação)

O novo pedido revogou a anatomia de nadadeiras/cauda: restaurar o rig histórico
com pernas, sem cauda; proibir mudanças futuras de conceito sem pedido explícito.
Requisitos integrais em `docs/REQUISITOS_CORRECOES_0.45.1.md`. Base: `fd20a52`,
branch `codex/living-companion`; recuperação anterior preservada em `cff4e1d`.

Implementação em validação: rig anterior a `2847e41`, cenas com resultados/fila
limitada/confirmação do desenho, fullscreen por foreground/geometria, janelas
próprias e expiração de amostras, inventário Steam em worker separado e DD sem
exigir nome fixo de subdiretório. Não confundir implementação com gates aprovados.
Última release pública continua 0.45.0; não alterá-la ou publicar sem todos os gates.
O estado de entrega concluída nas seções abaixo descreve a versão anterior.

### Validação integral — tentativas em 3a78ce8 e ajuste do ensaio da Central

Run [42872504850](https://github.com/oaovito/oao-companion-/actions/runs/42872504850):
tentativa 1 passou preflight, lint, instalação, 486 unitários e conversa 32+12,
mas a revisão das 44 falas não foi registrada em cinco minutos (sessão do Codex
interrompida). Tentativa 2 reprovou na Central: em “Não consegui terminar meu
projeto.” o modelo respondeu com tom de assistente (“posso ajudar”), a guarda
descartou a fala e o aplicativo usou a resposta programada `setback`/`comfort`,
como manda a regra do personagem. O ensaio exigia `intent: ia` mesmo assim.

Ajuste somente do harness `test/e2e/conversation-real.windows.mjs`: nos casos de
modelo, aceita a resposta programada apenas quando o diagnóstico comprova modelo
chamado sem erro e aviso “fora do personagem” para aquela entrada, no máximo uma
vez por ensaio; coerência, padrão e ação continuam exigidos. Nenhum código do
produto, guarda, modelo ou prompt mudou. O ensaio do motor (32 casos) mantém a
exigência original. Continuidade feita pelo Claude Code após a migração; a revisão
das 44 falas do run integral é registrada no campo existente `reviewedBy: Codex`,
com a autoria real descrita na nota. **0.45.1 ainda não publicada.**

### Diagnóstico Windows concluído — preparado para validação integral

Fonte **d7e9801**, run [42868110149](https://github.com/oaovito/oao-companion-/actions/runs/42868110149):
**16/16 integrações, 43/43 E2E, zero testes pulados**, e **1.268 animações**
sem erros, cortes, paradas ou falta de gatilhos. Média de desenho **0,4244 ms**.
Os três comandos produziram quadros diferentes; imagens atuais inspecionadas
confirmam a anatomia original restaurada. Steam isolada: Registro Unicode,
bibliotecas em outra unidade, webhelper ignorado e closed→open→closed.
Escala de 1,5 entrou/saiu de fullscreen e recuperou o overlay.

| Cenário de 20 s | CPU média (% de um núcleo) | Working set somado Electron |
| --- | ---: | ---: |
| Ocioso | 4,63 | 435 MB |
| Cursor perseguindo | 11,60 | 431 MB |
| Trabalho | 3,55 | 399 MB |
| Oculto | 0,74 | 336 MB |

Essas métricas não incluem Ollama inferindo; o runner Windows Server não
comprova o PC Windows 11 físico, jogos comerciais ou DPI misto real.
Evidência permanente: [relatório nativo](docs/evidencias/nativo-windows-42868110149.json)
e [matriz completa](docs/evidencias/animacoes-42868110149.json), com **121.788 quadros** amostrados.

Conversa da fonte `95343cb` aprovada como amostra: **32/32 motor + 12/12 Central**;
44 falas, 30 respostas brutas e dois baselines lidos pela revisão principal e independente.
O próximo commit comum inicia os **16 gates integrais do mesmo SHA/run**,
incluindo nova conversa/revisão antes do build, NSIS, portátil, vigia, atualização,
artefatos e notas. **0.45.1 ainda não publicada.** Nenhuma release antiga alterada.

### Histórico — fonte 95343cb

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
foi adotado. [Evidência](docs/evidencias/conversa-windows-42724504309.json).

Diagnóstico nativo3 **42723059182**, fonte `5421e2a`, concluído: build dos três
formatos, NSIS com Koffi3.3.3 carregado do pacote, Steam empacotada closed/known,
três atualizações, portátil e vigia passaram. Integração **15/16**: falhou a
asserção de clique na área transparente no modo de interação. E2E43, auditoria
1.268, desempenho e etapas seguintes não executaram. Isso não é aprovação
integral. [Evidência](docs/evidencias/nativo-windows-42723059182.json).

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

### Histórico dos diagnósticos anteriores

As seções abaixo preservam os cortes anteriores e seus próximos passos da época;
o estado atual é o registrado acima.

### Ajuste do ensaio NSIS — 42721691143

Fonte `627b082`: build3formatos aprovado; NSIS parou ANTES de conferir Koffi,
porque o callback de avaliação Playwright não permite import() dinâmico.
Etapas seguintes puladas; isso não comprova falha nova do produto ou sucesso do
pacote. O ensaio agora obtém fs/path/createRequire por process.getBuiltinModule,
confirmado em probe puro Node22. Todas asserções Koffi3.3.3/asar/static/.node e
Steamclosedknown mantidas. Próximo commit somente `[jojo-native]` repete nativo,
sem duplicar o ensaio Llama8B42721691138 ainda ativo e sem publicação.

### Empacotamento nativo corrigido — novos ensaios ainda pendentes

**473/473 unitários** locais passaram, zero falhas/pulos, Node22.23.4.
18/18transporteOllama e9/9fullscreen-native passaram. O pacote preserva static.cjs
removendo somente extensões de fonte C++; erro de init semid agora desativa estado
nativo honestamente, limpa amostras e rejeita esperadores com diagnóstico limitado.
NSIS exige require('koffi') REAL dentro do app.asar, versão3.3.3, loader e.node
físico, antes da Steamclosedknown;3atualizações/desinstalação mantidas.
Isso ainda precisa passar no aplicativo instalado Windows; não antecipar resultado.

O próximo ensaio avalia SOMENTE `llama3.1:8b-instruct-q4_K_M`, no Windows oficial,
com os mesmos32+12casos/timeouts. Default/oficial permanece Gemma. EOS de Llama
confirmados no manifesto+params oficiais (96bytes), sem pesos no Linux; transporte
preserva EOS e não apaga stops upstream de famílias desconhecidas. Metadata em
`docs/evidencias/llama-3.1-eos-metadata.json`. Só escolher novo oficial após
qualidade/latência reais, migração conservadora e novo pipeline integral.
Marcadores do próximo commit: `[jojo-qa] [llama8] [jojo-native]`; NÃO publicam.

### Diagnósticos 1e0bf9e — falhas reais e próximas verificações

Conversa **42642784960** passou32/32engine+12/12Central automaticamente, mas
leitura integral REPROVOU preferências inventadas (café/cerveja/vinho/chá) e
comentários de memória. Contexto científico deixou de vazar para assunto pessoal;
qualidade do modelo oficial ainda não aprovada. Próximo ensaio avaliará apenas
Llama3.1 8B Q4, mantendo casos/timeouts e sem trocar o oficial antes da evidência.

Nativo **42642784947** compilou3formatos, mas NSIS falhou com detector indisponível,
embora o inventário tivesse1jogo. Etapas posteriores NÃO executaram. Leitura do
ZIP público0.45.0 provou: Koffi index.cjs exige src/static.cjs, ausente no app.asar;
a exclusão ampla de fonte no package.json removia esse runtime JavaScript.
A biblioteca nativa@koromix.node está presente. Também há erro de init sem id
ignorado pelo monitor, mascarando o motivo. Corrigir pacote e diagnóstico de init;
manter exigência de statusclosed/known no aplicativo instalado.

Evidências versionadas por run em docs/evidencias. Nenhuma release alterada.

### Contexto corrigido e diagnósticos preparados

**470/470 unitários** locais passaram, zero falhas/pulos, Node22.23.4.55/55
focados, lint e actionlint dos quatro workflows passaram. Seis regressões novas
capturam o request do transporte simulado: ciência→exemplo mantém fontes;
janela/projeto→exemplo mantém só o assunto recente, sem diabetes/[1]. O histórico
visível permanece íntegro; maçã→manga→consulta da fruta mantém a correção.
Vocativos não ligam assuntos independentes; segurança e comandos externos limpam
um tema técnico anterior. Isso prova o encaminhamento do contexto, não inferência.

Próximo commit com `[jojo-qa] [jojo-native]` executa em paralelo o ensaio32+12
com Gemma oficial e um diagnóstico nativo parcial: build/NSIS/Steam empacotada,
portátil/vigia, integração16, E2E43, auditoria1268, desempenho e atualizador.
O marcador nativo exclui o publicador e o job tem somente leitura. Resultados
parciais nunca substituem os16gates do mesmo run integral de publicação.
Nova inferência e testes nativos ainda pendentes; nenhuma tag/release nova.

### Retomada — candidato reprovado e falhas de contexto reproduzidas

Fonte `a033435`, diagnóstico **41806190187**, Qwen3 4B Instruct2507:29/32engine;
Central NÃO executou. Anatomia excedeu25s, café/cat retornaram fallback. Leitura
reprovou depreciação de coragem, citações científicas em respostas pessoais e
alegações inventadas. Candidato NÃO adotado; oficial continua Gemma3 4B.
Evidência completa em `docs/evidencias/conversa-windows-41806190187.json`.

Auditoria de payload (transporte simulado, sem inferência no Linux) reproduziu
duas falhas de implementação: contexto casual enviava duas trocas científicas
com[1] como falas anteriores; tema técnico não era limpo ao mudar para assunto
pessoal. Um exemplo após falar de projeto reativava diabetes/fontes antigas.
Corrigir filtragem de contexto e expiração por mudança de assunto, preservando
histórico visível, fatos pessoais e seguimento técnico direto. Revalidar32+12 com
o modelo oficial, sem alterar casos, timeouts ou simular respostas de aprovação.
Nenhuma tag/release0.45.1 criada;19releases históricas preservadas.

### Avaliação de candidato local — 04/11/2026

Fonte `9d9f883`, run **41804545246**:464/464unitários Windows passaram; conversa
30/32engine, Central e gates seguintes NÃO executaram. Café caiu em fallback
após preferência inventada; prazo ficou genérico. Leitura detectou livro de
Borges favorito inventado e alegação de repetição anatômica sem histórico.
Compactar prompt não estabilizou o conjunto. Evidência em
`docs/evidencias/conversa-windows-41804545246.json`.

Próximo ensaio diagnóstico avalia SOMENTE `qwen3:4b-instruct-2507-q4_K_M`, já
permitido pelo verificador, no mesmo Windows oficial e nos mesmos32+12casos.
Marcadores `[jojo-qa] [qwen4]` selecionam o candidato; dispatch também permite
escolha explícita. Isso NÃO altera o modelo oficial Gemma nem publica. Somente
qualidade/latência reais aprovadas autorizam integrar uma seleção nova, com digest
real, migração conservadora, documentação e novo pipeline integral do commit final.
Sem inferência/download de pesos no Linux, API externa ou infraestrutura nova.

### Retomada em 04/11/2026 — alterações preservadas e prontas para novo Windows

Ambiente reiniciou e retornou; terminal/Git funcionais. **464/464 unitários**
locais, zero falhas/pulos, Node 22.23.4; lint de 222 arquivos, actionlint e diff-check aprovados.
Prompt casual compactado de 256 para 147 palavras, com prioridade final ao assunto
atual, preferências informadas e humor ficcional próprio. Não altera modelo,
transporte, histórico, fontes/prefixo técnico ou limites de tempo. Guarda de clima
ampliada para sol/temperatura ambiente sem dado informado, preservando objetos
frios/quentes, hipóteses, perguntas e fatos científicos. Teste de transporte usa
assunto novo (samambaia), sem respostas prontas nem alteração dos32+12cenários.
Novo pipeline integral deve provar essas mudanças; nada publicado até o momento.

### Retomada em 03/11/2026 — ainda sem publicação

Estado atual: fonte `106ba27`, branch local/remota `codex/living-companion`
sincronizada por Git Data API/CAS; **462/462 unitários** locais, lint221 e
actionlint aprovados. Token do `gh` expirado (401); conector GitHub continua com
escrita. Não substituir credenciais injetadas nem pedir comandos manuais.

O run **41724376443** falhou ANTES dos cenários: `/api/pull` excedeu660segundos
baixando os pesos. Engine e Central NÃO executaram; runtime Ollama baixou/iniciou.
Diagnóstico limitado **41727762420** passou no Windows: manifesto HTTP200 e
1MiB HTTP206 em1246ms, sem download integral/inferência. Evidência em
`docs/evidencias/model-network-41727762420.json`. Isso justifica UMA nova tentativa
limitada da Central; não prova que o bloqueio da transferência completa acabou.

Central **41728621830**, fonte `da199bb`:12/12cenários automáticos passaram,
zero warnings do motor e zero erros do renderer. Pré-carga45,6s; primeira geração
24,5s. Exemplo científico respondeu por inferência real em19,8s, sem fallback.
Leitura das12falas reprovou “água fria, como você gosta”: preferência implícita
não fornecida. Correção limita comparações implícitas ao assunto de uma preferência afirmada
pela usuária; saudações pedem somente o próprio humor do JoJo, sem resposta fixa,
troca de modelo ou relaxamento dos cenários. Três regressões novas passaram;
próximo ensaio é o pipeline integral, ainda sem aprovação da nova inferência. Evidência em
`docs/evidencias/conversa-windows-41728621830.json`.
Referências documentais de cauda ainda ativas foram corrigidas, preservando
histórico e marcando descrições antigas como revogadas, sem mudar a arte.

UI isolada **41660524964** reprovou no2º caso por timeout comprovado: `ui_only`
omitia a pré-carga feita pelo engine; modelo frio mais `baseOverride` consumiu a
janela de resposta. Pré-carga original adicionada, sem aumentar timeout.
`[jojo-ui]` roda12 cenários da Central; `[jojo-qa]` roda32engine+12Central.
São diagnósticos de pré-build; Windows integral/publicador não roda nesses commits.
Push normal na living preserva todos os gates obrigatórios antes da publicação.

Pipeline integral **41730444087**, fonte `106ba27`: preflight, lint, instalação
e462/462unitários Windows passaram. Conversa ficou29/32engine: respostas genéricas
omitiram café/teclado, chefe/prazo e cat. Leitura também detectou sol forte hoje
sem contexto meteorológico. Central e demais gates NÃO executaram; nenhuma
branch de revisão, tag ou release nova criada. Evidência integral privada em
`docs/evidencias/conversa-windows-41730444087.json`. Próxima correção compacta
prioridades do prompt casual e amplia a guarda das observações meteorológicas;
não muda casos/padrões/modelo/timeouts. Revalidar antes de publicar.

O pipeline integral salva conversa/progresso na branch privada
`codex/ci-evidence-<runId>-<attempt>` e aguarda revisão técnica das44falas em
`semantic-review.json` (mesmo SHA/run/tentativa/digest), antes do build.
Codex registra a leitura; não exige confirmação manual da usuária. Rejeição,
ausência em5min ou falha de integridade bloqueiam publicação. Nenhuma release nova.

Último ensaio completo da conversa: fonte `81b287a`; implementação em revisão.
**450/450 unitários** locais passaram, lint215. Steam nativo isolado1/1 aprovado.
Conversa **41655112676**:32/32 engine; Central passou9 cenários e falhou no10º
(exemplo científico→fallbackunknown); dois não executaram. A revisão detectou
chuva inventada na resposta de bem-estar. Motivo do fallback não está nos logs,
não chamar de timeout. Próximo diagnóstico preserva raw/warnings somente no ensaio
sintético da Central; `ui_only=true` é parcial, nunca gate de publicação.
Todos os gates Windows/NSIS/desempenho/atualização seguem pendentes para0.45.1.

Novo ambiente conectado; terminal/Git/rede funcionais e alterações locais intactas.
Fonte `f285032`: interfaces **41521403707** ficaram em13/14; passaram três cenas,
fila durante crash, ocultação durante recriação e DPI150%. Steam falhou ao iniciar
processo de fixture com mensagem genérica do Playwright. O preparo agora confere
os recursos copiados e usa processos dummy sem depurador, confirmação de janela
carregada e encerramento normal, preservando Unicode/HKCU/biblioteca em outro disco.
Se falhar, informa fase/código/stderr limitado; causa original específica não provada.

Conversa **41521410154** passou automaticamente32 engine +12 Central, mas a leitura
reprovou insulto à pergunta, ironia da memória e preferência inventada. Não usar
esse verde automático como aprovação semântica. Relatório integral preservado em
`docs/evidencias/conversa-windows-41521410154.json`; conversa será corrigida e
repetida com inferência real. Relatório principal em `docs/VALIDACAO_0.45.1.md`.
Prompt e coerência agora rejeitam os quatro desvios observados sem resposta pronta
nem fingir inferência quando há fallback. Regressões novas preservam humor sobre
o próprio personagem, preferências informadas e hipóteses. **448/448 unitários**
locais passaram, Node 22.23.4; lint210, actionlint e diff-check aprovados.
Pipeline integral ainda pendente. As19 releases históricas continuam imutáveis.

Interfaces **41650512337**, fonte `5297759`:13/14 passaram. O preparo Steam agora
revelou a causa do runtime incompleto: diretório `locales` ausente após `fs.cpSync`
no caminho Unicode. Cópia substituída por recursão explícita mkdir/readdir/copyFile,
com conferência de todos os arquivos preservada. Próximo diagnóstico roda somente
Steam (`assets_only=true`, `measure_assets=false`, `steam_only=true`), sem alterar
os gates integrais. NSIS ampliado para confirmar inventário pelo worker do app.asar
real instalado, arquivos desempacotados e encerramento normal antes das3 atualizações.
Essas novas verificações Windows ainda não passaram; sintaxe/actionlint aprovados.

Steam isolado **41651499749**, fonte `467b475`: **1/1 passou**, com Registro Unicode,
biblioteca em outra unidade, webhelper excluído e fechada→aberta→fechada confirmados.
O teste isolado não equivale a14 interfaces ou ao pipeline integral. O NSIS ampliado
continua pendente. Evidência em `docs/evidencias/steam-windows-41651499749.json`.
Conversa **41650519051**, fonte `5297759`: **30/32 engine**, Central não executou.
Falharam assunto de prazo e preferência cat; leitura também detectou crítica à
repetição e “Don't overthink it” em perguntas de memória. Nova correção pede resposta
concreta ao assunto antes da piada, reconhece a preferência dela e rejeita esses
desvios sem alterar/remover os32 casos ou padrões exigidos. Repetir inferência real.

### Diagnóstico da arte e interfaces — 41477698374

Fonte `56e40a4`: medição Windows de 434 bases importada, digest
`c4925755df8c7931c20c588893ccae71f5e708871d7e8d2f6c84d1794f35bc5d`.
Auditoria: 1.268 animações, zero erros/cortes/paradas/órfãs, média 0,4565 ms.
Comparação histórica e 75 cenas inspecionadas; imagens em docs/evidencias.
Os três comandos exigidos produziram quadros reais diferentes com hashes conferidos.

Diagnóstico global REPROVADO: 12/14 interfaces passaram; recuperação pós-crash
retornou pedido na fila e o cenário a 150% não reconheceu fullscreen. Corrigir e
repetir a interface; não confundir auditoria da arte com gates integrais/release.
Patch posterior limpa arrasto/captura/fuga, solicita estado após o renderer
carregar e usa geometria física por monitor, sem confundir borda com título.
Ícones serão exportados do rig restaurado no Windows; a fonte rejeitada foi
removida do gerador atual, preservada no Git histórico. Prompt local corrigido.
Ensaio real ampliado a 32 engine +12 Central, sem remover os 31 casos existentes.
Próximo: diagnóstico de interface/ícones (sem repetir medição), conversa real,
ler todas as saídas, importar os ícones e só então rodar o pipeline integral.

### Diagnósticos seguintes e correções verificadas

Fonte `1613989`, interfaces **41483917417**: 13/14 passaram, incluindo recuperação
do renderer, os três comandos e fullscreen físico a 150%. Única falha no preparo
da fixture Steam, antes de abrir o aplicativo: cópia presumiu `electron.exe`.
Corrigido para usar o caminho real do pacote, com cliente Unicode no Registro e
biblioteca em outra unidade. Ícones exportados nesse Windows foram importados e
inspecionados; hash do rig normalizado para LF, sem alterar a imagem.

Conversa real **41483923275**: 31/32 engine passaram; Central não executou porque
o modelo negou as pernas. Prompt reforça os fatos do personagem antropomórfico
apenas em perguntas sobre sua anatomia. O verificador agora aceita a negação
correta de cauda. Repetir inferência real e ler todas as respostas antes do build.

Revisão adicional corrigiu estado fantasma após reset de fuga, corrida entre
recriação/ocultação da janela e pedido antigo atrás da fila de conversa. Renderer
só fica pronto após o handshake dos assets; carregamento aguarda na fila limitada.
Inventário Steam incompleto preserva jogos conhecidos como desconhecidos, invalida
caches/amostras e pausa XP até recuperar. Fullscreen considera todos os monitores
integralmente cobertos, mesmo se o maior não estiver coberto. Comparação de caminhos
Steam usa cache normalizado: benchmark puro Node, 5.000 jogos ×300 processos,
2.796→56 ms (host Linux; não equivale a medição de desempenho Windows).

Estado local após correções: **445/445 unitários**, zero pulos, Node 22.23.4;
lint210 arquivos, actionlint e diff-check aprovados. Próximo: novos diagnósticos
Windows de interface e conversa, depois todos os gates oficiais no mesmo commit.
Nenhuma release nova publicada; as 19 releases existentes permanecem preservadas.

## Recuperação do ambiente — 02/11/2026

Novo executor conectado, terminal/Git/rede funcionais. Checkout limpo recuperado
de `main`/controle para a fonte `fd20a52`, preservando a referência local `work`.
Branch de registro: `codex/recovery-validation-20261102`, no mesmo checkout.
Não foi acessado o executor anterior nem o MNE_Lab.

Regressão desta sessão: **411/411 unitários**, sem falhas/pulos, Node **22.23.4**;
lint de **197 arquivos** aprovado. Fonte/assets/dependências idênticos à tag
`v0.45.0`; nenhum commit exclusivo nas outras quatro branches de desenvolvimento/QA.
Nenhuma issue/PR ou correção pendente no registro ativo foi encontrada.

Os três downloads públicos foram novamente conferidos por tamanho/SHA-256;
UpdateChecker reconheceu 0.44→0.45 em portátil/instalador com metadados públicos
reais. Notas conferem com o changelog; as **19 releases** mantêm metadados/assets.
Windows **41383430244** continua aprovado na API; seus testes são evidência anterior,
não uma nova execução Windows. Sem alteração funcional, não repetir build/release.
Detalhes, limites e hashes das evidências: [RECUPERACAO_2026-11-02](docs/RECUPERACAO_2026-11-02.md).

## Estado atual — 0.45.0 publicada e atualização verificada

Versão pública: **0.45.0**, publicada em 02/11/2026 no canal oficial
**oaovito/jojo-companion-releases**. Fonte/tag privada **9c213f494602329f4ebc7bbf9f8fa719a1368f1a**,
branch efetiva **codex/living-companion**; commits posteriores só documentam a entrega.
Actions **41383430244** passou e publicou: 411 unitários, 31+12 conversa com modelo
real, 16 integração, 40 E2E, 1.268 animações, NSIS e três atualizações, portátil/ZIP,
vigia/desempenho/hashes/notas. Atualizador detectou 0.44 →0.45 sem login nos dois
modos; downloads públicos e hashes conferidos. 18 releases anteriores preservadas.

**Agenda exige SOMENTE o link iCal**, sem login/senha, conforme correção do usuário.
Campo e botões nas Configurações, conexão pelo chat, sincronização, último sucesso,
falha/vazia e reinício validados. A exigência antiga de conta/gate iCloud foi
substituída, não é bloqueio nem próxima tarefa. Não pedir secrets iCloud.

To-Do/DD/cuidados/XP/50 alimentos novos/50 cenas/anatomia/ícone/Discord/atalhos/clima
entregues nesta versão. Relatório, hashes e limites: [VALIDACAO_0.45.0](docs/VALIDACAO_0.45.0.md).
Controle na main **82519f8**, política 0.45.0/fonte living; cron horário preservado.
Quota CI segue cheia, mas não impede a release pública já conferida; não comprar
armazenamento nem remover histórico. Sem pendência externa bloqueando esta entrega.
MNE_Lab intocado. Não repetir desenvolvimento/build/publicação para demonstrar conclusão.

## Histórico anterior à correção do usuário

## Missão ativa: 0.45.0 implementada; publicação bloqueada

Branch `codex/living-companion`, base `4193c2b`. Aplicativo validado no commit
**502ba0fd385131dae1ea31512448416d67969162**, Actions **41374307060**.
Todos os gates da aplicação passaram no mesmo run Windows oficial: 404 unitários,
31 engine +12 Central com Gemma real, build portátil/NSIS/ZIP, instalador e três
atualizações/atalho/dados, vigia, 16 integrações, 39 E2E, 1.268 animações,
desempenho, integridade/hashes, metadados do atualizador e notas. As 43 respostas
reais foram lidas; evidência hasheada em docs/evidencias/conversa-windows-41374307060.json.
Não confundir esses cenários com perfeição de qualquer conversa/Windows 11 físico.

O último passo iCloud FALHOU por ausência de JOJO_ICLOUD_USER e
JOJO_ICLOUD_APP_PASSWORD. Conta autorizada é requisito explícito do pedido (linha
798 de docs/REQUISITOS_0.45.0.md). Credenciais somente pelos secrets seguros e
somente no último passo; jamais solicitar senha no chat. DPAPI e CalDAV de fixture
passaram, mas não comprovam autenticação Apple real. Não remover esse gate.

Quota de armazenamento CI recusou o upload; API confirma zero artefatos retidos.
Binários foram gerados/validados no runner, não estão disponíveis para download.
Workflow posterior imprime resumo sanitizado em logs para preservar hashes/status;
não muda o app validado. Não repetir build pesado sem resolver a conta externa.

0.44.0 segue publicada; as 18 releases históricas e assets continuam iguais.
Não há tag/release 0.45.0; política de publicação/cron continua em 0.44.0.
Detalhes, escopo cumulativo e próximos passos: [MISSAO_ATIVA](docs/MISSAO_ATIVA.md).
Clima/CalDAV/To-Do/DD/cuidados/50 alimentos novos/50 cenas/Discord/atalho/ícone
implementados; docs TAREFAS.md, AGENDA_ICLOUD.md, CUIDADOS.md, CENAS_E_FOCO.md.
Arte já medida no Windows e importada; não repetir se não alterar o desenho.
API timing deste run: WINDOWS total_ms=0; não foram alterados plano/cartão/limites.
Não extrapolar para fatura/orçamento, que a API não permite consultar.

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
