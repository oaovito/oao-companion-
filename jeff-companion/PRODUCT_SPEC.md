# PRODUCT_SPEC — Jeff Companion

Referência dos requisitos atuais (v0.1). Mudanças futuras chegam por prompts
elaborados pelo usuário; preserve o que está aqui salvo substituição explícita.

## 1. Visão

Companion animado para Windows 11, inspirado no Jeff, o Tubarão Terrestre
(fan-made, não oficial). Fica sobre as janelas, fundo transparente, personalidade
carinhosa, balões de quadrinhos em pt-BR, **sem atrapalhar o uso do computador**.

## 2. Requisito prioritário: não obstruir o mouse

| ID | Requisito | Critério de aceitação |
|---|---|---|
| R1 | Desvio automático | Cursor a menos da margem (padrão 100 px lógicos, ajustável 40–300) da área visível do Jeff → fuga imediata para destino dentro da área útil de monitor permitido, a ≥ 2× margem do cursor |
| R2 | Trajeto | Caminho (Bézier) escolhido para não cruzar o cursor; previsão de 220 ms da posição do cursor |
| R3 | Re-planejamento | Se o cursor vai ao destino, re-planeja (mín. 140 ms entre re-planejamentos não urgentes; urgentes sem espera) |
| R4 | Anti-oscilação | Histerese (sai do alerta só além de 1,6× margem), estabilização de 350 ms após chegar, penalidade de inversão de direção; estabilização nunca bloqueia desvio |
| R5 | Cantos/sem espaço | Candidatos em grade cobrem toda a área; sem destino seguro → recolhe balão e fica quase transparente (ou invisível) até o cursor se afastar por 1,2 s |
| R6 | Perseguição | ≥ 5 fugas em 4 s → modo discreto |
| R7 | Balão | Balão a menos da margem do cursor é recolhido; balão não nasce sobre o cursor |
| C1 | Click-through real | Fora do modo de interação: `setIgnoreMouseEvents(true)` (WS_EX_TRANSPARENT) sempre, inclusive durante animações; watchdog reaplica a cada tick |
| C2 | Sem simulação | O app nunca simula/encaminha cliques |
| C3 | Sem bloqueio | A janela tem o tamanho do Jeff + anexos visíveis; partes transparentes não bloqueiam |
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
regiões interativas (Jeff, barra, painel) via `forward: true`; indicação discreta
(anel tracejado + barra). Carinho, comer, brincar, arrastar, conversar. Esc
encerra (só quando o overlay tem foco; sem atalho global de Esc). Clique fora
encerra. Saída automática por inatividade (padrão 45 s, 10–600). Ao sair:
click-through e desvio restaurados imediatamente, inclusive em erro. Falha no
registro do atalho é exibida nas configurações; bandeja continua funcionando.

## 5. Aparência e animações

Tubarãozinho azul e branco, patas curtas, olhos grandes, dentinhos, contorno
escuro de quadrinhos. Animações distintas: idle (respira), piscar, olhar ao redor,
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

## 9. Privacidade e desempenho

Sem captura de tela, leitura de janelas, microfone, telemetria ou keylogging.
Loop por timers adaptativos (sem busy loop); renderer limita FPS por estado
(8–60) e para quando oculto.

## 10. Fora do escopo atual

Arte final, sons gravados, assinatura de código, auto-update, idiomas além de pt-BR,
IA real.
