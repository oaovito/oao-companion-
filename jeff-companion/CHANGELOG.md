# CHANGELOG

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
- Jeff mais **adulto e intimidador**, mantendo o estilo recorte de papel: cabeça
  proporcionalmente menor, ombros largos, peitoral e bíceps marcados, braços mais
  longos com garras, olhos menores com pálpebras pesadas, sobrancelhas sempre franzidas.
- **Dentes assustadores**: sorriso sempre entreaberto com duas fileiras de presas
  grandes e espaçadas (superior e inferior) e o fundo escuro da boca aparecendo.
- Animações menos infantis: sem quique no repouso, comemoração contida, rubor só no carinho.
- Rig: `face.restingLid`, `browAlways`, `browFrown`, `restJaw`, `mouthDepth`,
  `lowerTeeth`, `lowerToothSize`, `toothWidth`.

## 0.3.0 — 2026-10-29

### Alterado
- Estética e animações no **estilo South Park** (recorte de papel): Jeff de frente,
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
- Novo visual do Jeff: versão **chibi bípede** baseada na referência do usuário
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
  discreto quando não há espaço ou o cursor persegue o Jeff.
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
- Renderer continuava desenhando com o Jeff oculto.
- Consulta de "iniciar com o Windows" em modo de desenvolvimento.
- Caminhos de teste no Windows (`URL.pathname` → `fileURLToPath`).
