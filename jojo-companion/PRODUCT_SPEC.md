# PRODUCT_SPEC — JoJo Companion

Referência dos requisitos atuais (v0.1). Mudanças futuras chegam por prompts
elaborados pelo usuário; preserve o que está aqui salvo substituição explícita.

## 1. Visão

Companion animado para Windows 11: o JoJo, um tubarão fisiculturista em estilo
recorte de papel (personagem próprio). Fica sobre as janelas, fundo transparente, personalidade
carinhosa, balões de quadrinhos em pt-BR, **sem atrapalhar o uso do computador**.

## 2. Requisito prioritário: não obstruir o mouse

| ID | Requisito | Critério de aceitação |
|---|---|---|
| R1 | Desvio automático | Cursor a menos da margem (padrão 100 px lógicos, ajustável 40–300) da área visível do JoJo → fuga imediata para destino dentro da área útil de monitor permitido, a ≥ 2× margem do cursor |
| R2 | Trajeto | Caminho (Bézier) escolhido para não cruzar o cursor; previsão de 220 ms da posição do cursor |
| R3 | Re-planejamento | Se o cursor vai ao destino, re-planeja (mín. 140 ms entre re-planejamentos não urgentes; urgentes sem espera) |
| R4 | Anti-oscilação | Histerese (sai do alerta só além de 1,6× margem), estabilização de 350 ms após chegar, penalidade de inversão de direção; estabilização nunca bloqueia desvio |
| R5 | Cantos/sem espaço | Candidatos em grade cobrem toda a área; sem destino seguro → recolhe balão e fica quase transparente (ou invisível) até o cursor se afastar por 1,2 s |
| R6 | Perseguição | ≥ 5 fugas em 4 s → modo discreto |
| R7 | Balão | Balão a menos da margem do cursor é recolhido; balão não nasce sobre o cursor |
| C1 | Click-through real | Fora do modo de interação: `setIgnoreMouseEvents(true)` (WS_EX_TRANSPARENT) sempre, inclusive durante animações; watchdog reaplica a cada tick |
| C2 | Sem simulação | O app nunca simula/encaminha cliques |
| C3 | Sem bloqueio | A janela tem o tamanho do JoJo + anexos visíveis; partes transparentes não bloqueiam |
| C4 | Detecção contínua | Posição global do cursor consultada por polling adaptativo (16–140 ms), sem registrar cliques/teclas |

## 3. Overlay

Transparente, sem moldura, sem barra de título, sempre por cima, sem foco
(focusable=false, showInactive), fora da barra de tarefas (skipTaskbar + tipo
toolbar), bandeja (mostrar/ocultar, pausar, silencioso, interação, configurações,
sobre, encerrar), iniciar com o Windows (off por padrão), persistência e
restauração de posição válida, instância única, múltiplos monitores com
coordenadas negativas e DPI misto, recuperação ao desconectar monitor/mudar
resolução, suspensão/retomada e bloqueio de tela, ocultar/pausar em tela cheia.
Sem injeção em processos; sem promessa sobre tela cheia exclusiva/telas protegidas.

## 4. Modo de interação

Ctrl+Alt+J (configurável) ou bandeja. Desvio suspenso; captura de mouse só nas
regiões interativas (JoJo, barra, painel) via `forward: true`; indicação discreta
(anel tracejado + barra). Carinho, comer, brincar, arrastar, conversar. Esc
encerra (só quando o overlay tem foco; sem atalho global de Esc). Clique fora
encerra. Saída automática por inatividade (padrão 45 s, 10–600). Ao sair:
click-through e desvio restaurados imediatamente, inclusive em erro. Falha no
registro do atalho é exibida nas configurações; bandeja continua funcionando.

## 5. Aparência e animações

Estética de recorte de papel no estilo South Park, versão fofa do JoJo da
referência do usuário: de frente, cabeça grande e redonda, olhos ovais brancos
com pupilas de ponto, cores chapadas e contorno fino; tubarão bípede azul-ardósia
com recortes creme serrilhados (focinho, barriga, rabo), sorriso com muitos
dentinhos, barbatana na cabeça, rabo bifurcado, bermuda preta com faixas cinza.
Versão adulta e intimidadora com físico de fisiculturista: trapézio e ombros
enormes, cintura fina em V, peitoral/abdômen definidos, braços com bíceps e
cotovelo articulado (pose de duplo bíceps ao comemorar), olhos de pálpebra pesada, sobrancelhas franzidas e sorriso
entreaberto com duas fileiras de presas assustadoras. Animação também no estilo: 12 quadros por segundo, movimentos secos, saltinhos ao
andar, boca abrindo e fechando ao falar, virada instantânea. Só o estilo é
imitado; nenhum personagem da série é copiado. Animações distintas: idle (respira), piscar, olhar ao redor,
andar, correr/fugir, virar (procedural), sentar/levantar, deitar, adormecer,
dormir (Zzz), acordar, falar, feliz, carinho (corações), comer (peixe), brincar
(bola), curioso (?), surpreso (!), arrastado, pouso (poeira), aparecer, despedir,
modo discreto. Transições por blend a partir da pose anterior. Assets separados
do código (JSON), formato documentado. Arte atual **provisória**.

## 6. Comportamento

Máquina de estados com prioridades: 1 desvio > 2 comandos > 3 interações/falas >
4 autônomo. Alterna descanso, olhar, passeio e sono com pesos ajustados pela
atividade e sonolência (noite/inatividade). Evita repetição. Sem punição/culpa.

## 7. Balões

pt-BR; fala (cauda triangular), pensamento (bolinhas, itálico), sono (tracejado).
Quebra de linha, tamanho ajustável, posicionamento adaptado às bordas, tempo de
leitura proporcional (2,4–9,5 s), no máximo um por vez, intervalo configurável
(raro/normal/frequente/desligado) com intervalo mínimo global entre falas espontâneas.

## 8. Conversa

Offline, respostas programadas por intenção (cumprimentar, dormir, acordar,
comer, brincar, carinho, agradecer, como vai, nome, ajuda). Interface marca
"Respostas programadas · offline · não é IA". `DialogueProvider` permite
integrar modelo local ou API no futuro, sempre opcional e com fallback.

## 8b. Pet, atividades e Central

| # | Requisito | Critério de aceitação |
|---|---|---|
| A1 | Pet flutuante | Sempre por cima, arrastável no modo de interação, posição salva |
| A2 | Balão de status | Ao lado do pet, lista conversas com *Em andamento*, *Precisa de você*, *Pronto* (não vista) ou *Bloqueado* (falha/erro de sistema); click-through fora do modo de interação |
| A3 | Abrir o app | Clique no pet traz a Central do JoJo para frente; clique numa atividade abre aquela conversa |
| A4 | `/pet` | Alterna mostrar/ocultar; menu "/" e Configurações mostram *Wake Pet* / *Tuck Away Pet* |
| A5 | Movimento reduzido | Respeita `prefers-reduced-motion` do sistema (ou a configuração): quadros estáticos, sem partículas, sem passeio |
| A6 | Crise | Se a Emanuele disser que está em crise/emocionalmente mal, mandar falar com o João para cuidar dela |
| A7 | Versão web | Não aplicável (app só desktop) |

## 8c. Perguntas, animações e emoções (v0.9)

| # | Requisito | Critério de aceitação |
|---|---|---|
| Q1 | Pergunta sem resposta | Pergunta de conhecimento sem resposta programada → pesquisa (Wikipédia, depois DuckDuckGo) e resposta no jeito do JoJo, coerente com o perfil (palavrões/humor filtrados), com a fonte |
| Q2 | Rede mínima | Só o texto da pergunta sai; conversa comum, crise e pedidos contra as diretrizes não acessam a rede; desligável (`webSearch`) |
| Q3 | Falha | Sem internet: aviso e conversa *Bloqueado* |
| N1 | Animações | ≥ 2× a v0.8 (33 → 85); comuns com 3–4 variações coerentes com o motivo |
| N2 | Emoção e cor | Raiva avermelha, tristeza acinzenta (também medo, alegria, sono, vergonha) |
| M1 | Meme | "Vai tomar no cu" → vira de costas, susto com o prolapso saltando, rebola mostrando por ~5 s, desvira |
| M2 | Bonita | "Eu sou bonita?" → olhos de coração, cai de costas com 😵, responde "É." no último suspiro e levanta |
| U1 | Atualização automática | Baixa a versão nova das Releases e troca sozinho (PC parado ou ao encerrar); desligável |
| M3 | LoL | "Eu deveria jogar lol?" → caga no chão, pega e oferece dizendo "Passa na cara de uma vez." |
| F1 | Datas festivas | 38 datas: feriados nacionais do Brasil e datas religiosas/culturais do mundo; fantasia + cumprimento uma vez por dia; solenes sem fantasia |
| M4 | Fantasia ousada | Padrão ousado; "se veste direito" → dedo do meio + versão comportada |
| M5 | Comida | Comida de tubarão sorteada (às vezes gente), gore e arroto no fim |
| M6 | AVC | "AVC" → força de frente, segura o peito, morto 1 min, "Essa foi por pouco."; sintomas reais → SAMU 192 |
| C1 | Conversa natural | Entende e responde de forma orgânica no jeito do JoJo (API gratuita); personalidade irredutível; sem menção a IA na tela; volta às programadas sem internet |
| X1 | Distribuição | `JoJoCompanion.exe` portátil abre sem instalar nada (verificado no CI do Windows) |

## 9. Privacidade e desempenho

Sem captura de tela, leitura de janelas, microfone, telemetria ou keylogging.
Rede só para a pesquisa de perguntas (Q2).
Loop por timers adaptativos (sem busy loop); renderer limita FPS por estado
(8–60) e para quando oculto.

## 9b. Personalidade (perfil editável)

Perfil separado da aparência/animações em `personality.json`, validado e versionado.
Padrão: majoritariamente sério, autoritário, mandão e direto; humor seco, ácido e
inconveniente ("fiscal que acha que é engraçado"); frases curtas, ordens claras,
palavrões ocasionais; carinho discreto; tom de treinador exigente sobre academia;
referências ocasionais a cocaína como humor ácido, **sem recomendar consumo, ensinar
uso ou associar a emagrecimento/desempenho**; expressões: olhar de julgamento,
braços cruzados, sobrancelha levantada, dentes à mostra, ataque teatral só sob pedido.

| ID | Requisito | Critério de aceitação |
|---|---|---|
| P1 | Instagram | Bronca curta (animação de julgamento) ao abrir o Instagram (navegador ou app no Windows) e de novo a cada intervalo (padrão 120 s) enquanto ela continua usando; bronca que não pôde sair fica pendente |
| P1b | League of Legends | Em primeiro plano: mau humor, reclama, dá as costas e some; volta emburrado depois de 20 s fora do LoL. Nunca mexe no jogo. Desligável |
| P1c | Spotify | Lê só o título da janela do Spotify ("Artista - Música"), localmente; na troca de música reage com animação do clima (treino, funk, rock, rap, calma, amor, triste, festa) e comenta no máximo a cada 4 min; "o que tá tocando?" no chat. Desligável |
| P2 | Lembrete de comida | Uma vez por dia, horário aleatório na faixa (padrão 10h–21h); firme, sem insultar o corpo/peso da Emanuele (no resto, humor sem limite) |
| P3 | Silêncio | Modo silencioso/pausa suprimem broncas e lembretes; "silêncio" na conversa liga o modo silencioso |
| P4 | Palavrões | nenhum / ocasional / frequente filtra e pondera as falas marcadas |
| P5 | Privacidade | Só título da janela em primeiro plano/nome do executável, comparados localmente; nada é guardado ou enviado; sem bloquear apps, fechar páginas ou impedir cliques |
| P6 | IA futura | `instrucoes` do perfil é passado como `context.persona` aos provedores de diálogo |
| P7 | Nome | O companion se chama **JoJo** (`nomeCompanion`); o app continua "JoJo Companion" |
| P8 | Tratamento | A usuária é chamada de **Emanuele** em falas sérias e **Manu** em brincadeiras (tom por categoria/frase/resposta) |
| P9 | Tristeza | Se ela disser na conversa que está chorando ou muito triste: dizer que é melhor falar com o **João**, porque ele sabe cuidar dela (postura de acolhimento, boca fechada). Menção a se machucar/suicídio: falar com o João agora e CVV 188 |
| P10 | Expressão corporal | Toda fala/resposta traz uma reação coerente: aceno (cumprimento), julgamento/dedo em riste (bronca, lembrete), duplo bíceps (conquista), acolhimento (tristeza), aceno de cabeça (confirmação), susto teatral (pedido) |

## 10. Fora do escopo atual

Arte final, sons gravados, assinatura de código, auto-update, idiomas além de pt-BR,
IA real.
