# Timers interativos do JoJo (0.47.5)

O relógio é um objeto físico ao lado do JoJo. Ele tira, segura, gira, sacode e comemora com ele.
Nada aqui cria janela nova, ícone na bandeja ou som.

## Como pedir

| Pedido | O que faz |
| --- | --- |
| "timer de 10 minutos", "me avisa em 15 min" | contagem regressiva |
| "timer de 25 min pra estudar", "pomodoro" | usa o foco junto que já existe (o relógio só espelha) |
| "cronometra a tarefa relatório" | cronômetro ligado à tarefa da lista; para quando ela é marcada como feita |
| "descanso entre séries de 90 segundos 4 séries" | intervalado (série 45 s + descanso) |
| "timer de 20 min a cada" / "recorrente" | recorrente (cada rodada no histórico, sem XP) |
| "quanto falta pra água" | mostra quanto falta para o lembrete de água |
| "pausa / continua / reinicia / cancela o timer" | ações no timer destacado |
| "esconde / mostra o relógio" | só a imagem; a contagem continua |
| "quanto falta", "meus timers", "histórico dos timers" | status, lista e estatísticas |
| `/timer` (`lista`, `pausar`, `continuar`, `reiniciar`, `cancelar [nome]`, `destacar nome`, `historico`, `ajuda`, `10`, `exercicio x4`) | o mesmo por comando |

Sem pedir timer/cronômetro, nada liga ("vou estudar agora" é conversa comum).

## Arquitetura

- `src/core/timers.js` — `GerenciadorTimers`, sem `setTimeout` próprio: o companion chama `tick()` quando
  `proximoEventoMs()` manda (entre 250 ms e 60 s). Conta pelo relógio monotônico (`clock.now()`); o relógio
  de parede só serve para salvar e recuperar. Estado em `progress.st.timers` (timers, histórico de 200,
  estatísticas, teto diário de XP).
- `src/core/companion-timers.js` — conversa, `/timer`, falas, ofertas, notificação (relógio piscando em 0:00
  por 6 s), confirmação "fiz", recompensa e o layout do relógio.
- `src/core/timer-anims.js` — 48 animações (`cat_tm01`–`cat_tm48`) com canais `tm*` (mistura, mão, posição,
  rotação, escala, tremor, frente/atrás, sumir) e peças `tm_*` numa cópia do rig. `alvoDoRelogio(pose)` calcula
  a mão pela pose, então o relógio acompanha o gesto.
- `src/renderer/shared/relogio-desenho.js` — desenho das 9 aparências e leitura do tempo por âncora de
  relógio de parede (o estado não é reenviado a cada segundo).
- Overlay: clique no relógio = pausa/continua; arrastar = muda o lugar (`timersOffset`). Só no modo de
  interação; fora dele a janela continua click-through.

## Regras

- Tipos: regressivo, progressivo (cronômetro), intervalado, recorrente e espelho (foco, água, pausa).
- Reabrir o app: regressivo continua pelo tempo real; progressivo pausa; relógio do Windows voltou no tempo
  ou pulou mais de 7 dias → pausa. O que acabou fechado avisa uma vez, vai para o histórico e não rende XP.
- Suspensão: regressivo soma o tempo dormindo (fim marcado como "suspenso", sem XP); progressivo pausa e volta.
- Vários timers (1 a 5, padrão 3); só o destacado aparece e anima.
- Modo Trabalho e foco: relógio pequeno, minimalista, sem rótulo, sem fala, sem animação. Tela cheia ou JoJo
  escondido: nada aparece e não há área de clique.
- XP (`Progress.award`, id `timer:<id>`): só atividades com XP, 5+ min, 80% com o app aberto, sem suspensão,
  até 6 por dia; exercício, alongamento e hábito pedem "fiz" em até 15 min. Conquistas `timer1`, `timer10`,
  `timer50`, `timerHoras10`; missão `timer`; bônus "Sessão de timer".

## Limites conhecidos

- DPI misto, multi-monitor e suspensão real precisam de teste manual no Windows.
- O arrasto fica dentro da janela do overlay (o relógio não sai para longe do JoJo).
- Não há sistema de desafios diários além da missão do dia.
