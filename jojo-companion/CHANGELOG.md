# CHANGELOG

## 0.12.0 — 2026-10-29

### Adicionado
- "Vai tomar no cu" (também "vtnc") no chat: o JoJo responde e faz por **5 s** a
  pose do meme — de costas, curvado, olhando por cima do ombro e abrindo as
  nádegas com as mãos — e depois volta ao normal. Vista de costas própria no rig
  (grupos com `showIf`/`hideIf` no canal `mooning`).

## 0.11.0 — 2026-10-29

### Alterado
- O projeto agora se chama **JoJo Companion**: pasta `jojo-companion/`, executável
  `JoJoCompanion.exe`, workflow `jojo-windows.yml`, identificadores e textos sem o
  nome antigo. O JoJo é personagem próprio do projeto.
- READMEs reduzidos a "descubra 🦈".
- Configurações passam a ficar em `%APPDATA%\JoJo Companion` (as da versão
  anterior não são migradas).

## 0.10.0 — 2026-10-29

### Adicionado
- **PC parado** (5 min por padrão, `ociosidade.minutos`): o JoJo senta no chão e
  cheira uma carreira de pó (animação `snort`, carreira no chão, nuvem de pó). Fica
  sentado ligadão até a volta. Na volta, **5 min** (`ociosidade.efeitoMin`) de
  efeito: pó no focinho, olhos arregalados, tom pálido, suor, mandíbula rangendo,
  tremedeira, variações "ligadão" de parado/andar/falar/olhar, fala muito mais,
  anda 1,7× mais rápido e não senta nem dorme. Sem o humor com drogas: toma
  pré-treino (`chug`), mesmo efeito sem pó. Ociosidade lida só como contador do
  sistema (`powerMonitor.getSystemIdleTime`), sem teclas ou cliques.
- **Objetivo: fazer a Emanuele sorrir** (`objetivo` no perfil): piadas espontâneas
  e exibições de **supino** (deitado no banco, anilha na mão) e **agachamento**
  (barra nos ombros), sozinhas ou pelo chat ("faz supino", "agachamento").
- **Legends**: uma vez por semana, em momento aleatório (10h–22h), "jogar Legends
  é ideia burra".
- Adereços no rig com `showIf` (banco, barra, carreira de pó, coqueteleira, pó no
  focinho). 100 animações.
- Publicação: tag `v*` gera uma Release do GitHub com o `JoJoCompanion.exe`.

### Alterado
- Pesquisa: escolhe, entre os 3 primeiros artigos, o que cita mais palavras da pergunta.

## 0.9.0 — 2026-10-29

### Adicionado
- **85 animações** (eram 33). As mais comuns ganharam variações sorteadas, sem
  repetir a anterior: parado, andando, falando, alegria, julgamento, bronca e
  raiva com 4; interação, sentado, dormindo, correndo, olhar em volta, curioso,
  aceno, aceno de cabeça, acolhimento, carinho e tristeza com 3; as demais com 2.
  Animações paradas/sentadas trocam de variação a cada 2 ciclos.
- **Cor por emoção**: raiva avermelha (bronca do Instagram, julgamento, susto,
  arrastado), tristeza acinzenta (acolhimento, rejeição), medo empalidece (fuga,
  esconderijo), alegria aviva, sono escurece, vergonha rosa. Sobrancelha de raiva.
- Estados novos **raiva** e **tristeza**: xingar o JoJo deixa ele bravo; rejeitar
  ("não gosto de você", "vou te desinstalar") deixa triste; a 3ª entrada no
  Instagram em 20 min vira bronca com raiva.
- **Pesquisa na internet** para perguntas de conhecimento sem resposta programada:
  Wikipédia em português (DuckDuckGo de reserva), resumo de até 3 frases, aberto e
  fechado por falas no jeito do JoJo filtradas pelo perfil, com a fonte. Sem
  internet: aviso e conversa *Bloqueado*. Pedidos contra as diretrizes (drogas,
  dieta extrema) não são pesquisados. Desligável em Configurações.
- **`JoJoCompanion.exe` portátil**: um único executável que abre sem instalar
  nada. "Iniciar com o Windows" aponta para o próprio `.exe`. O CI do Windows abre
  o portátil e confere que ele fica pronto sem erros.

### Alterado
- Selo da conversa: "Respostas programadas + pesquisa na internet · não é IA"
  quando a pesquisa está ligada.
- "como funciona" só abre a ajuda quando é sobre o JoJo ("como você funciona").

## 0.8.0 — 2026-10-29

### Adicionado
- **Sistema de pet**: o JoJo flutua sobre a área de trabalho, arrastável no modo de
  interação, com posição salva entre sessões (já existente, mantido).
- **Balão de status** ao lado do pet com as atividades de cada conversa:
  *Em andamento*, *Precisa de você*, *Pronto* (concluída e ainda não vista) e
  *Bloqueado* (falha do provedor ou erro de sistema, como atalho em uso ou detector
  de tela cheia indisponível). Fora do modo de interação o balão é click-through e
  some por 4 s quando o cursor chega perto.
- **Central do JoJo** (janela do app): lista de conversas com status, conversa,
  comandos e botão *Wake Pet / Tuck Away Pet*. Clicar no pet traz a Central para
  frente; clicar numa atividade abre aquela conversa. Também pela bandeja
  (*Abrir JoJo* e submenu *Atividades*).
- **Comando `/pet`** (e menu "/" no chat do pet e da Central): *Wake Pet* / *Tuck
  Away Pet*; também `/silencio`, `/nova`, `/config`. Botão equivalente nas
  Configurações.
- **Movimento reduzido**: segue o "Efeitos de animação" do Windows
  (`prefers-reduced-motion`) ou a configuração *Reduzir movimento*
  (sistema/ligado/desligado). Pose estática por animação, sem partículas, sem
  piscar, sem passeios e com fuga instantânea do cursor.
- Crise emocional na conversa ("crise", "ansiedade", "emocionalmente mal",
  "não aguento mais"…): manda a Emanuele falar com o **João** agora, porque ele
  sabe cuidar dela, com postura de acolhimento.

### Alterado
- Clique rápido no pet (modo de interação) agora abre a Central; o carinho continua
  pelo botão 🤚 e esfregando o mouse sobre ele.
- A resposta do chat tem um "digitando…" curto (650 ms) para o status *Em andamento*.

### Não aplicável
- Versão web: o projeto é só desktop (Electron/Windows); não há versão web.

## 0.7.0 — 2026-10-29

### Adicionado
- O companion se chama **JoJo** (bandeja, Sobre, configurações, conversa; editável).
- Tratamento por tom: **Emanuele** em falas sérias, **Manu** em brincadeiras.
- Tristeza na conversa ("chorando", "muito triste", "na bad"…): "é melhor falar com
  o **João**, ele sabe cuidar de você", com postura de acolhimento. Menção a se
  machucar/suicídio: falar com o João agora e CVV 188.
- **Expressão corporal coerente**: cada fala e resposta toca uma reação (aceno,
  aceno de cabeça, julgamento, dedo em riste, acolhimento, duplo bíceps, susto).
  Novos estados/animações: `wave`, `nod`, `lecture`, `comfort`; canal `mouthClose`.
- Perfil: `nomeCompanion`, `nomeSerio`, `nomeBrincadeira`, `pessoaApoio`
  (migração automática do antigo `tratamento`).

## 0.6.0 — 2026-10-29

### Adicionado
- **Perfil de personalidade** separado da aparência (`personality.json`), editável
  em Configurações → Personalidade. Padrão: sério, mandão, humor seco e ácido,
  palavrões ocasionais, carinho discreto, tom de treinador.
- **Fiscal do Instagram** (Windows, navegador ou app): bronca curta com animação de
  julgamento a cada entrada, intervalo mínimo de 2 min, sem repetir enquanto aberto.
  Detecção pelo título da janela/nome do executável no processo isolado; só um
  sim/não sai dele.
- **Lembrete diário** para comer com atenção em horário aleatório (10h–21h), sem
  usar peso ou corpo como insulto.
- Falas reescritas no novo tom, com marcações de palavrão e de humor ácido
  (referências a cocaína sem incentivar uso), filtradas pelo perfil.
- Estados e animações novos: **julgamento** (braços cruzados, olhar de lado) e
  **susto teatral**. Conversa: "silêncio" liga o modo silencioso, "consegui" faz o
  duplo bíceps, "me assusta" dá o bote, "treino" responde como treinador.
- Instruções livres do perfil passadas aos provedores de diálogo (`context.persona`).

## 0.5.0 — 2026-10-29

### Alterado
- Físico de **fisiculturista**: trapézio e ombros enormes, cintura fina em V,
  peitoral, abdômen e serrátil definidos, deltoides e bíceps marcados, coxas grossas.
- Braços articulados no **cotovelo** (canais `elbowL`/`elbowR`; peça `parent` no rig):
  comemoração = pose de **duplo bíceps**; brincar = flexões alternadas; carinho =
  braços cruzados; comer = punhos à boca; curioso = mão no queixo; corrida com
  braços dobrados; aceno com o antebraço.

### Verificado
- CI no Windows real da v0.3.0: unitários, instalador, integração 8/8 (incluindo
  o Esc corrigido) e E2E 10/10.

## 0.4.0 — 2026-10-29

### Alterado
- JoJo mais **adulto e intimidador**, mantendo o estilo recorte de papel: cabeça
  proporcionalmente menor, ombros largos, peitoral e bíceps marcados, braços mais
  longos com garras, olhos menores com pálpebras pesadas, sobrancelhas sempre franzidas.
- **Dentes assustadores**: sorriso sempre entreaberto com duas fileiras de presas
  grandes e espaçadas (superior e inferior) e o fundo escuro da boca aparecendo.
- Animações menos infantis: sem quique no repouso, comemoração contida, rubor só no carinho.
- Rig: `face.restingLid`, `browAlways`, `browFrown`, `restJaw`, `mouthDepth`,
  `lowerTeeth`, `lowerToothSize`, `toothWidth`.

## 0.3.0 — 2026-10-29

### Alterado
- Estética e animações no **estilo South Park** (recorte de papel): JoJo de frente,
  olhos ovais brancos com pupilas de ponto, cores chapadas, contorno fino;
  animação a 12 qps com movimentos secos, saltinhos ao andar, boca em degraus e
  virada instantânea. Todas as 26 animações refeitas.
- Renderer: `rotSign` (membros espelhados), rosto `style: "sp"`, várias bochechas;
  animador com `style.stepFps`, `defaultEase`, `defaultBlendIn`, `turnMs`.
- Renderer limita o desenho aos 12 qps da animação (menos CPU).

### Corrigido
- Esc às vezes não encerrava o modo de interação no Windows (foco não entregue
  à janela ativada por atalho): agora um Esc global é registrado **somente**
  enquanto o modo de interação está ativo. O atalho de interação não remove mais
  outros atalhos ao ser trocado.

## 0.2.0 — 2026-10-29

### Alterado
- Novo visual do JoJo: versão **chibi bípede** baseada na referência do usuário
  (azul-ardósia com recortes creme, sorriso com dentes, barbatana, rabo bifurcado,
  bermuda preta com faixa cinza). Continua marcada como arte provisória.
- Rig com dois olhos, várias sobrancelhas/narinas/dentes, cabeça girando como peça.
- Poses de sentar, deitar/dormir, agachar, espreguiçar e acenar refeitas para bípede.
- Efeitos (poeira, bola, comida) e anel do modo de interação seguem as métricas do rig.
- Ícones, folha de animações e capturas regenerados.

## 0.1.0 — 2026-10-29

Primeira versão funcional.

### Adicionado
- Overlay Electron transparente, sem moldura, sempre por cima, sem foco e fora da barra de tarefas.
- Click-through real fora do modo de interação, com watchdog e restauração em erros.
- Desvio do cursor com margem configurável (100 px), histerese, estabilização,
  re-planejamento, caminhos que evitam cruzar o cursor, saída de cantos, modo
  discreto quando não há espaço ou o cursor persegue o JoJo.
- Máquina de estados com prioridades; comportamentos autônomos com pesos por atividade e sonolência.
- Rig vetorial articulado **provisório** e 26 animações por quadros-chave; virar
  procedural; efeitos (corações, Zzz, poeira, brilhos, peixe, bola, "!"/"?").
- Balões de fala, pensamento e sono; posicionamento nas bordas; tempo de leitura; recolhimento perto do cursor.
- Modo de interação (Ctrl+Alt+J/bandeja): carinho, comer, brincar, arrastar, conversa, Esc, clique fora, timeout.
- Conversa offline com respostas programadas e interface de provedores para integrações futuras.
- Bandeja, configurações completas, persistência versionada com recuperação, instância única,
  iniciar com o Windows (off), multi-monitor/DPI/coordenadas negativas, recuperação de monitores,
  suspensão/bloqueio, detecção de tela cheia isolada em utilityProcess.
- Testes unitários, simulação, E2E com Electron (Xvfb) e integração no Windows via GitHub Actions.
- Scripts de build (NSIS + ZIP), ícones, folha de animações e medição de CPU/memória.
- Documentação: README, PRODUCT_SPEC, ARCHITECTURE, HANDOFF, assets/README; CLAUDE.md na raiz.

### Corrigido durante a verificação
- Boca aberta desenhava o contorno da língua em vez do lábio (Path2D).
- Destino da fuga deixava a caixa da janela 4 px fora da área útil.
- Renderer continuava desenhando com o JoJo oculto.
- Consulta de "iniciar com o Windows" em modo de desenvolvimento.
- Caminhos de teste no Windows (`URL.pathname` → `fileURLToPath`).
