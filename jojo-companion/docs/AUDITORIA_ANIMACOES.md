# Auditoria das animações e reações

Gerado por `scripts/auditoria-animacoes.mjs` em 2026-10-30 (Electron 44.9.3, renderer real, 24 qps, desenho em CPU).
Todos os números abaixo foram medidos nesta execução; nada é estimado.

## Resumo

| Item | Resultado |
|---|---|
| Animações auditadas (feitas à mão + catálogo × intensidades + pacotes) | 1043 |
| Tocaram do início ao fim sem erro | 1043 |
| Com erro | 0 |
| Passam do espaço reservado (seriam cortadas) | 0 |
| Não se mexem (quadro parado) | 0 |
| Só alcançáveis por /anim (sem gatilho natural) | 0 |
| Tempo médio de desenho por quadro | 2.98 ms (orçamento a 30 qps: 33 ms) |

## Mais pesadas (tempo médio de desenho por quadro)

| Animação | Média (ms) | Máx. (ms) |
|---|---|---|
| cat_voltou | 34.44 | 71.90 |
| cat_voltou~exagerado | 29.16 | 60.20 |
| cat_aplausoLento~exagerado | 27.19 | 317.10 |
| cat_clique~suave | 27.07 | 41.20 |
| cat_modoFoco~suave | 25.65 | 65.80 |
| cat_caudaDevagar~exagerado | 21.57 | 71.50 |
| cat_ombrosDeboche~exagerado | 20.25 | 42.50 |
| cat_ouvirMusica~exagerado | 19.84 | 173.80 |
| cat_mensagemNova~suave | 19.02 | 47.10 |
| cat_superioridade~suave | 16.44 | 250.20 |

## Matriz completa

| Animação | Gatilho | Toca | Quadros | Média (ms) | Cabe | Se mexe |
|---|---|---|---|---|---|---|
| idle | estado/código | sim | 73 | 2.45 | sim | sim |
| interactIdle | estado/código | sim | 22 | 2.68 | sim | sim |
| lookAround | estado/código | sim | 63 | 2.53 | sim | sim |
| curious | estado/código | sim | 53 | 2.73 | sim | sim |
| surprised | estado/código | sim | 22 | 5.19 | sim | sim |
| walk | estado/código | sim | 12 | 2.40 | sim | sim |
| run | estado/código | sim | 8 | 2.68 | sim | sim |
| sitDown | estado/código | sim | 10 | 2.33 | sim | sim |
| sit | estado/código | sim | 73 | 2.47 | sim | sim |
| standUp | estado/código | sim | 10 | 5.77 | sim | sim |
| lieDown | estado/código | sim | 15 | 2.65 | sim | sim |
| lie | estado/código | sim | 73 | 2.57 | sim | sim |
| fallAsleep | estado/código | sim | 34 | 2.66 | sim | sim |
| meditate | estado/código | sim | 144 | 2.43 | sim | sim |
| sleep | estado/código | sim | 73 | 3.35 | sim | sim |
| wake | estado/código | sim | 36 | 2.15 | sim | sim |
| talk | estado/código | sim | 15 | 2.20 | sim | sim |
| happy | estado/código | sim | 39 | 2.40 | sim | sim |
| petted | estado/código | sim | 53 | 2.99 | sim | sim |
| eat | estado/código | sim | 68 | 2.45 | sim | sim |
| play | estado/código | sim | 82 | 2.37 | sim | sim |
| dragged | estado/código | sim | 17 | 2.39 | sim | sim |
| land | estado/código | sim | 15 | 2.54 | sim | sim |
| appear | estado/código | sim | 32 | 2.50 | sim | sim |
| goodbye | estado/código | sim | 34 | 2.22 | sim | sim |
| hide | estado/código | sim | 48 | 3.43 | sim | sim |
| hidden | estado/código | sim | 25 | 2.73 | sim | sim |
| judge | estado/código | sim | 77 | 2.45 | sim | sim |
| scare | estado/código | sim | 36 | 2.23 | sim | sim |
| wave | estado/código | sim | 39 | 2.19 | sim | sim |
| nod | estado/código | sim | 25 | 2.30 | sim | sim |
| lecture | estado/código | sim | 63 | 2.00 | sim | sim |
| comfort | estado/código | sim | 109 | 2.60 | sim | sim |
| angry | estado/código | sim | 58 | 2.45 | sim | sim |
| sad | estado/código | sim | 77 | 3.02 | sim | sim |
| idle_flex | variação de idle | sim | 73 | 2.79 | sim | sim |
| idle_crack | variação de idle | sim | 73 | 2.69 | sim | sim |
| idle_tap | variação de idle | sim | 73 | 2.50 | sim | sim |
| interactIdle_cross | variação de interactIdle | sim | 22 | 2.51 | sim | sim |
| interactIdle_bounce | variação de interactIdle | sim | 22 | 2.48 | sim | sim |
| walk_swagger | variação de walk | sim | 12 | 2.51 | sim | sim |
| walk_stomp | variação de walk | sim | 12 | 2.58 | sim | sim |
| walk_march | variação de walk | sim | 12 | 4.95 | sim | sim |
| run_arms | variação de run | sim | 8 | 2.50 | sim | sim |
| run_panic | variação de run | sim | 8 | 2.51 | sim | sim |
| talk_point | variação de talk | sim | 15 | 2.42 | sim | sim |
| talk_shrug | variação de talk | sim | 15 | 2.61 | sim | sim |
| talk_fist | variação de talk | sim | 15 | 2.54 | sim | sim |
| lookAround_up | variação de lookAround | sim | 63 | 2.63 | sim | sim |
| lookAround_behind | variação de lookAround | sim | 63 | 3.30 | sim | sim |
| curious_lean | variação de curious | sim | 53 | 2.80 | sim | sim |
| curious_squint | variação de curious | sim | 53 | 2.66 | sim | sim |
| sit_flex | variação de sit | sim | 73 | 2.69 | sim | sim |
| sit_sway | variação de sit | sim | 73 | 2.19 | sim | sim |
| lie_tail | variação de lie | sim | 73 | 2.23 | sim | sim |
| sleep_snore | variação de sleep | sim | 73 | 2.83 | sim | sim |
| sleep_twitch | variação de sleep | sim | 73 | 2.72 | sim | sim |
| happy_jump | variação de happy | sim | 39 | 2.37 | sim | sim |
| happy_fist | variação de happy | sim | 39 | 2.42 | sim | sim |
| happy_dance | variação de happy | sim | 39 | 2.36 | sim | sim |
| judge_glare | variação de judge | sim | 77 | 2.43 | sim | sim |
| judge_tap | variação de judge | sim | 77 | 2.36 | sim | sim |
| judge_headshake | variação de judge | sim | 77 | 2.98 | sim | sim |
| lecture_both | variação de lecture | sim | 63 | 2.67 | sim | sim |
| lecture_slam | variação de lecture | sim | 63 | 3.03 | sim | sim |
| lecture_point | variação de lecture | sim | 63 | 2.38 | sim | sim |
| wave_salute | variação de wave | sim | 39 | 3.57 | sim | sim |
| wave_both | variação de wave | sim | 39 | 2.45 | sim | sim |
| nod_double | variação de nod | sim | 25 | 2.47 | sim | sim |
| nod_thumb | variação de nod | sim | 25 | 2.30 | sim | sim |
| comfort_hug | variação de comfort | sim | 109 | 2.48 | sim | sim |
| comfort_bow | variação de comfort | sim | 109 | 2.32 | sim | sim |
| petted_shy | variação de petted | sim | 53 | 2.43 | sim | sim |
| petted_wiggle | variação de petted | sim | 53 | 2.45 | sim | sim |
| eat_gulp | variação de eat | sim | 68 | 2.73 | sim | sim |
| play_kick | variação de play | sim | 82 | 2.29 | sim | sim |
| scare_roar | variação de scare | sim | 36 | 2.41 | sim | sim |
| surprised_jump | variação de surprised | sim | 22 | 2.34 | sim | sim |
| dragged_flail | variação de dragged | sim | 17 | 2.32 | sim | sim |
| land_pose | variação de land | sim | 15 | 2.39 | sim | sim |
| wake_stretch | variação de wake | sim | 36 | 2.35 | sim | sim |
| angry_steam | variação de angry | sim | 58 | 2.41 | sim | sim |
| angry_stomp | variação de angry | sim | 58 | 2.40 | sim | sim |
| sad_sigh | variação de sad | sim | 77 | 2.55 | sim | sim |
| sad_slump | variação de sad | sim | 77 | 2.15 | sim | sim |
| angry_fists | variação de angry | sim | 58 | 2.26 | sim | sim |
| benchPress | estado/código | sim | 125 | 2.84 | sim | sim |
| benchPress_grunt | variação de benchPress | sim | 125 | 2.43 | sim | sim |
| squat | estado/código | sim | 106 | 2.51 | sim | sim |
| squat_deep | variação de squat | sim | 106 | 2.41 | sim | sim |
| snort | estado/código | sim | 101 | 2.22 | sim | sim |
| chug | estado/código | sim | 101 | 2.71 | sim | sim |
| sitWired | estado/código | sim | 29 | 2.15 | sim | sim |
| idle_wired | variação de idle | sim | 73 | 2.23 | sim | sim |
| idle_wired_pace | variação de idle | sim | 73 | 2.70 | sim | sim |
| walk_wired | variação de walk | sim | 9 | 2.46 | sim | sim |
| talk_wired | variação de talk | sim | 15 | 2.26 | sim | sim |
| interactIdle_wired | variação de interactIdle | sim | 22 | 2.18 | sim | sim |
| lookAround_wired | variação de lookAround | sim | 63 | 2.17 | sim | sim |
| curious_wired | variação de curious | sim | 53 | 2.28 | sim | sim |
| happy_wired | variação de happy | sim | 39 | 2.22 | sim | sim |
| moon | estado/código | sim | 178 | 2.39 | sim | sim |
| smitten | estado/código | sim | 144 | 3.02 | sim | sim |
| poop | estado/código | sim | 168 | 2.73 | sim | sim |
| finger | estado/código | sim | 63 | 2.10 | sim | sim |
| avcStrain | estado/código | sim | 85 | 2.56 | sim | sim |
| avcClutch | estado/código | sim | 39 | 3.86 | sim | sim |
| avcFall | estado/código | sim | 22 | 2.65 | sim | sim |
| avcDead | estado/código | sim | 1441 | 2.75 | sim | sim |
| avcRevive | estado/código | sim | 44 | 2.42 | sim | sim |
| cat_piscar~suave | sozinho (ambiente) | sim | 38 | 2.60 | sim | sim |
| cat_piscar | sozinho (ambiente) | sim | 29 | 2.21 | sim | sim |
| cat_piscar~exagerado | sozinho (ambiente) | sim | 25 | 2.19 | sim | sim |
| cat_piscarLento~suave | sozinho (ambiente) | sim | 57 | 2.18 | sim | sim |
| cat_piscarLento | sozinho (ambiente) | sim | 44 | 2.67 | sim | sim |
| cat_piscarLento~exagerado | sozinho (ambiente) | sim | 37 | 2.74 | sim | sim |
| cat_bocejar~suave | sozinho (ambiente) | sim | 88 | 2.32 | sim | sim |
| cat_bocejar | sozinho (ambiente) | sim | 68 | 2.91 | sim | sim |
| cat_bocejar~exagerado | sozinho (ambiente) | sim | 58 | 2.31 | sim | sim |
| cat_cochilar~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 163 | 2.84 | sim | sim |
| cat_cochilar | sozinho (ambiente), código (conversa/foco/evento) | sim | 125 | 2.77 | sim | sim |
| cat_cochilar~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 107 | 2.97 | sim | sim |
| cat_espreguicar~suave | sozinho (ambiente) | sim | 94 | 2.38 | sim | sim |
| cat_espreguicar | sozinho (ambiente) | sim | 73 | 3.08 | sim | sim |
| cat_espreguicar~exagerado | sozinho (ambiente) | sim | 62 | 2.51 | sim | sim |
| cat_balancar~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 125 | 2.76 | sim | sim |
| cat_balancar | sozinho (ambiente), código (conversa/foco/evento) | sim | 97 | 2.32 | sim | sim |
| cat_balancar~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 2.84 | sim | sim |
| cat_flutuar~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 125 | 2.47 | sim | sim |
| cat_flutuar | sozinho (ambiente), código (conversa/foco/evento) | sim | 97 | 2.35 | sim | sim |
| cat_flutuar~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 5.49 | sim | sim |
| cat_caudaDevagar~suave | sozinho (ambiente) | sim | 125 | 2.32 | sim | sim |
| cat_caudaDevagar | sozinho (ambiente) | sim | 97 | 2.73 | sim | sim |
| cat_caudaDevagar~exagerado | sozinho (ambiente) | sim | 82 | 21.57 | sim | sim |
| cat_guelras~suave | sozinho (ambiente) | sim | 94 | 2.49 | sim | sim |
| cat_guelras | sozinho (ambiente) | sim | 73 | 2.15 | sim | sim |
| cat_guelras~exagerado | sozinho (ambiente) | sim | 62 | 2.76 | sim | sim |
| cat_giroLeve~suave | sozinho (ambiente) | sim | 94 | 3.24 | sim | sim |
| cat_giroLeve | sozinho (ambiente) | sim | 73 | 4.10 | sim | sim |
| cat_giroLeve~exagerado | sozinho (ambiente) | sim | 62 | 2.41 | sim | sim |
| cat_bolhas~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 94 | 2.45 | sim | sim |
| cat_bolhas | sozinho (ambiente), código (conversa/foco/evento) | sim | 73 | 2.54 | sim | sim |
| cat_bolhas~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 62 | 14.25 | sim | sim |
| cat_ouvindo~suave | evento, código (conversa/foco/evento) | sim | 82 | 7.23 | sim | sim |
| cat_ouvindo | evento, código (conversa/foco/evento) | sim | 63 | 2.63 | sim | sim |
| cat_ouvindo~exagerado | evento, código (conversa/foco/evento) | sim | 54 | 2.29 | sim | sim |
| cat_pensando~suave | evento, código (conversa/foco/evento) | sim | 82 | 2.43 | sim | sim |
| cat_pensando | evento, código (conversa/foco/evento) | sim | 63 | 2.47 | sim | sim |
| cat_pensando~exagerado | evento, código (conversa/foco/evento) | sim | 54 | 2.57 | sim | sim |
| cat_processando~suave | evento | sim | 94 | 2.67 | sim | sim |
| cat_processando | evento | sim | 73 | 2.53 | sim | sim |
| cat_processando~exagerado | evento | sim | 62 | 2.48 | sim | sim |
| cat_digitando~suave | sozinho (ambiente) | sim | 100 | 2.48 | sim | sim |
| cat_digitando | sozinho (ambiente) | sim | 77 | 9.30 | sim | sim |
| cat_digitando~exagerado | sozinho (ambiente) | sim | 66 | 2.41 | sim | sim |
| cat_fingirTrabalhar~suave | sozinho (ambiente) | sim | 113 | 2.66 | sim | sim |
| cat_fingirTrabalhar | sozinho (ambiente) | sim | 87 | 2.42 | sim | sim |
| cat_fingirTrabalhar~exagerado | sozinho (ambiente) | sim | 74 | 2.64 | sim | sim |
| cat_pesquisando~suave | evento, código (conversa/foco/evento) | sim | 94 | 3.32 | sim | sim |
| cat_pesquisando | evento, código (conversa/foco/evento) | sim | 73 | 2.53 | sim | sim |
| cat_pesquisando~exagerado | evento, código (conversa/foco/evento) | sim | 62 | 2.27 | sim | sim |
| cat_lendo~suave | sozinho (ambiente), frase | sim | 132 | 2.45 | sim | sim |
| cat_lendo | sozinho (ambiente), frase | sim | 101 | 2.60 | sim | sim |
| cat_lendo~exagerado | sozinho (ambiente), frase | sim | 86 | 2.22 | sim | sim |
| cat_tarefaConcluida~suave | evento, código (conversa/foco/evento) | sim | 69 | 2.53 | sim | sim |
| cat_tarefaConcluida | evento, código (conversa/foco/evento) | sim | 53 | 2.73 | sim | sim |
| cat_tarefaConcluida~exagerado | evento, código (conversa/foco/evento) | sim | 45 | 2.72 | sim | sim |
| cat_confuso~suave | sozinho (ambiente) | sim | 75 | 2.56 | sim | sim |
| cat_confuso | sozinho (ambiente) | sim | 58 | 3.65 | sim | sim |
| cat_confuso~exagerado | sozinho (ambiente) | sim | 49 | 2.62 | sim | sim |
| cat_seguirOlhar~suave | sozinho (ambiente) | sim | 94 | 2.15 | sim | sim |
| cat_seguirOlhar | sozinho (ambiente) | sim | 73 | 2.35 | sim | sim |
| cat_seguirOlhar~exagerado | sozinho (ambiente) | sim | 62 | 2.23 | sim | sim |
| cat_encarar~suave | sozinho (ambiente) | sim | 94 | 8.39 | sim | sim |
| cat_encarar | sozinho (ambiente) | sim | 73 | 3.32 | sim | sim |
| cat_encarar~exagerado | sozinho (ambiente) | sim | 62 | 2.46 | sim | sim |
| cat_lerJunto~suave | sozinho (ambiente) | sim | 113 | 2.42 | sim | sim |
| cat_lerJunto | sozinho (ambiente) | sim | 87 | 2.38 | sim | sim |
| cat_lerJunto~exagerado | sozinho (ambiente) | sim | 74 | 2.57 | sim | sim |
| cat_animado~suave | sozinho (ambiente) | sim | 75 | 4.28 | sim | sim |
| cat_animado | sozinho (ambiente) | sim | 58 | 2.83 | sim | sim |
| cat_animado~exagerado | sozinho (ambiente) | sim | 49 | 2.75 | sim | sim |
| cat_puloAlegria~suave | sozinho (ambiente) | sim | 63 | 2.44 | sim | sim |
| cat_puloAlegria | sozinho (ambiente) | sim | 48 | 2.29 | sim | sim |
| cat_puloAlegria~exagerado | sozinho (ambiente) | sim | 41 | 3.87 | sim | sim |
| cat_risada~suave | sozinho (ambiente) | sim | 75 | 2.21 | sim | sim |
| cat_risada | sozinho (ambiente) | sim | 58 | 2.27 | sim | sim |
| cat_risada~exagerado | sozinho (ambiente) | sim | 49 | 2.27 | sim | sim |
| cat_sorrisoSuave~suave | sozinho (ambiente) | sim | 75 | 2.33 | sim | sim |
| cat_sorrisoSuave | sozinho (ambiente) | sim | 58 | 2.22 | sim | sim |
| cat_sorrisoSuave~exagerado | sozinho (ambiente) | sim | 49 | 2.18 | sim | sim |
| cat_orgulhoso~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 88 | 3.18 | sim | sim |
| cat_orgulhoso | sozinho (ambiente), código (conversa/foco/evento) | sim | 68 | 2.61 | sim | sim |
| cat_orgulhoso~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 58 | 2.30 | sim | sim |
| cat_apaixonado~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 100 | 2.41 | sim | sim |
| cat_apaixonado | sozinho (ambiente), código (conversa/foco/evento) | sim | 77 | 3.74 | sim | sim |
| cat_apaixonado~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 66 | 2.24 | sim | sim |
| cat_grato~suave | frase | sim | 75 | 2.44 | sim | sim |
| cat_grato | frase | sim | 58 | 2.33 | sim | sim |
| cat_grato~exagerado | frase | sim | 49 | 2.25 | sim | sim |
| cat_aplaudir~suave | sozinho (ambiente), evento, código (conversa/foco/evento) | sim | 69 | 2.26 | sim | sim |
| cat_aplaudir | sozinho (ambiente), evento, código (conversa/foco/evento) | sim | 53 | 2.45 | sim | sim |
| cat_aplaudir~exagerado | sozinho (ambiente), evento, código (conversa/foco/evento) | sim | 45 | 5.45 | sim | sim |
| cat_comemorar~suave | frase, evento | sim | 82 | 2.50 | sim | sim |
| cat_comemorar | frase, evento | sim | 63 | 2.59 | sim | sim |
| cat_comemorar~exagerado | frase, evento | sim | 54 | 2.38 | sim | sim |
| cat_dancinha~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 113 | 2.70 | sim | sim |
| cat_dancinha | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 87 | 3.68 | sim | sim |
| cat_dancinha~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 74 | 2.52 | sim | sim |
| cat_brilhoOlhos~suave | sozinho (ambiente) | sim | 69 | 2.47 | sim | sim |
| cat_brilhoOlhos | sozinho (ambiente) | sim | 53 | 2.88 | sim | sim |
| cat_brilhoOlhos~exagerado | sozinho (ambiente) | sim | 45 | 2.33 | sim | sim |
| cat_contente~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 100 | 3.05 | sim | sim |
| cat_contente | sozinho (ambiente), código (conversa/foco/evento) | sim | 77 | 2.66 | sim | sim |
| cat_contente~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 66 | 2.47 | sim | sim |
| cat_aliviado~suave | evento | sim | 75 | 2.43 | sim | sim |
| cat_aliviado | evento | sim | 58 | 2.23 | sim | sim |
| cat_aliviado~exagerado | evento | sim | 49 | 2.21 | sim | sim |
| cat_empolgado~suave | sozinho (ambiente) | sim | 82 | 4.11 | sim | sim |
| cat_empolgado | sozinho (ambiente) | sim | 63 | 2.45 | sim | sim |
| cat_empolgado~exagerado | sozinho (ambiente) | sim | 54 | 2.18 | sim | sim |
| cat_chorando~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 107 | 2.20 | sim | sim |
| cat_chorando | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 2.33 | sim | sim |
| cat_chorando~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 70 | 3.67 | sim | sim |
| cat_decepcionado~suave | código (conversa/foco/evento) | sim | 82 | 2.43 | sim | sim |
| cat_decepcionado | código (conversa/foco/evento) | sim | 63 | 2.34 | sim | sim |
| cat_decepcionado~exagerado | código (conversa/foco/evento) | sim | 54 | 2.15 | sim | sim |
| cat_preocupado~suave | evento | sim | 88 | 2.08 | sim | sim |
| cat_preocupado | evento | sim | 68 | 4.50 | sim | sim |
| cat_preocupado~exagerado | evento | sim | 58 | 2.34 | sim | sim |
| cat_ansioso~suave | código (conversa/foco/evento) | sim | 82 | 2.27 | sim | sim |
| cat_ansioso | código (conversa/foco/evento) | sim | 63 | 2.57 | sim | sim |
| cat_ansioso~exagerado | código (conversa/foco/evento) | sim | 54 | 2.45 | sim | sim |
| cat_nervoso~suave | código (conversa/foco/evento) | sim | 75 | 2.47 | sim | sim |
| cat_nervoso | código (conversa/foco/evento) | sim | 58 | 3.73 | sim | sim |
| cat_nervoso~exagerado | código (conversa/foco/evento) | sim | 49 | 2.43 | sim | sim |
| cat_envergonhado~suave | código (conversa/foco/evento) | sim | 82 | 2.41 | sim | sim |
| cat_envergonhado | código (conversa/foco/evento) | sim | 63 | 2.51 | sim | sim |
| cat_envergonhado~exagerado | código (conversa/foco/evento) | sim | 54 | 2.46 | sim | sim |
| cat_entediado~suave | sozinho (ambiente) | sim | 113 | 2.56 | sim | sim |
| cat_entediado | sozinho (ambiente) | sim | 87 | 2.41 | sim | sim |
| cat_entediado~exagerado | sozinho (ambiente) | sim | 74 | 2.33 | sim | sim |
| cat_irritadoLeve~suave | código (conversa/foco/evento) | sim | 82 | 2.39 | sim | sim |
| cat_irritadoLeve | código (conversa/foco/evento) | sim | 63 | 3.36 | sim | sim |
| cat_irritadoLeve~exagerado | código (conversa/foco/evento) | sim | 54 | 2.69 | sim | sim |
| cat_frustrado~suave | evento | sim | 82 | 2.31 | sim | sim |
| cat_frustrado | evento | sim | 63 | 2.37 | sim | sim |
| cat_frustrado~exagerado | evento | sim | 54 | 2.45 | sim | sim |
| cat_assustado~suave | código (conversa/foco/evento) | sim | 57 | 2.68 | sim | sim |
| cat_assustado | código (conversa/foco/evento) | sim | 44 | 2.57 | sim | sim |
| cat_assustado~exagerado | código (conversa/foco/evento) | sim | 37 | 2.75 | sim | sim |
| cat_chocado~suave | código (conversa/foco/evento) | sim | 63 | 2.60 | sim | sim |
| cat_chocado | código (conversa/foco/evento) | sim | 48 | 2.32 | sim | sim |
| cat_chocado~exagerado | código (conversa/foco/evento) | sim | 41 | 2.24 | sim | sim |
| cat_cansado~suave | sozinho (ambiente) | sim | 88 | 3.09 | sim | sim |
| cat_cansado | sozinho (ambiente) | sim | 68 | 2.24 | sim | sim |
| cat_cansado~exagerado | sozinho (ambiente) | sim | 58 | 2.28 | sim | sim |
| cat_solitario~suave | evento, código (conversa/foco/evento) | sim | 107 | 2.21 | sim | sim |
| cat_solitario | evento, código (conversa/foco/evento) | sim | 82 | 2.41 | sim | sim |
| cat_solitario~exagerado | evento, código (conversa/foco/evento) | sim | 70 | 2.46 | sim | sim |
| cat_tchau~suave | evento | sim | 63 | 2.17 | sim | sim |
| cat_tchau | evento | sim | 48 | 2.25 | sim | sim |
| cat_tchau~exagerado | evento | sim | 41 | 2.19 | sim | sim |
| cat_abraco~suave | frase | sim | 94 | 4.01 | sim | sim |
| cat_abraco | frase | sim | 73 | 2.68 | sim | sim |
| cat_abraco~exagerado | frase | sim | 62 | 2.33 | sim | sim |
| cat_coracao~suave | sozinho (ambiente), frase | sim | 82 | 2.78 | sim | sim |
| cat_coracao | sozinho (ambiente), frase | sim | 63 | 2.85 | sim | sim |
| cat_coracao~exagerado | sozinho (ambiente), frase | sim | 54 | 4.19 | sim | sim |
| cat_highFive~suave | frase | sim | 57 | 2.56 | sim | sim |
| cat_highFive | frase | sim | 44 | 2.57 | sim | sim |
| cat_highFive~exagerado | frase | sim | 37 | 2.64 | sim | sim |
| cat_piscadinha~suave | sozinho (ambiente) | sim | 57 | 2.63 | sim | sim |
| cat_piscadinha | sozinho (ambiente) | sim | 44 | 2.79 | sim | sim |
| cat_piscadinha~exagerado | sozinho (ambiente) | sim | 37 | 2.60 | sim | sim |
| cat_negar~suave | frase | sim | 63 | 2.67 | sim | sim |
| cat_negar | frase | sim | 48 | 2.77 | sim | sim |
| cat_negar~exagerado | frase | sim | 41 | 2.81 | sim | sim |
| cat_ombros~suave | sozinho (ambiente) | sim | 57 | 2.27 | sim | sim |
| cat_ombros | sozinho (ambiente) | sim | 44 | 2.18 | sim | sim |
| cat_ombros~exagerado | sozinho (ambiente) | sim | 37 | 3.91 | sim | sim |
| cat_apontar~suave | código (conversa/foco/evento) | sim | 57 | 2.51 | sim | sim |
| cat_apontar | código (conversa/foco/evento) | sim | 44 | 2.45 | sim | sim |
| cat_apontar~exagerado | código (conversa/foco/evento) | sim | 37 | 2.55 | sim | sim |
| cat_convidar~suave | sozinho (ambiente) | sim | 69 | 2.28 | sim | sim |
| cat_convidar | sozinho (ambiente) | sim | 53 | 2.58 | sim | sim |
| cat_convidar~exagerado | sozinho (ambiente) | sim | 45 | 5.18 | sim | sim |
| cat_desculpas~suave | frase | sim | 75 | 2.91 | sim | sim |
| cat_desculpas | frase | sim | 58 | 2.80 | sim | sim |
| cat_desculpas~exagerado | frase | sim | 49 | 2.78 | sim | sim |
| cat_agradecer~suave | código (conversa/foco/evento) | sim | 69 | 2.68 | sim | sim |
| cat_agradecer | código (conversa/foco/evento) | sim | 53 | 4.81 | sim | sim |
| cat_agradecer~exagerado | código (conversa/foco/evento) | sim | 45 | 2.85 | sim | sim |
| cat_cumprimentar~suave | evento | sim | 63 | 2.73 | sim | sim |
| cat_cumprimentar | evento | sim | 48 | 2.55 | sim | sim |
| cat_cumprimentar~exagerado | evento | sim | 41 | 2.62 | sim | sim |
| cat_tarefaFinalizada~suave | evento, código (conversa/foco/evento) | sim | 82 | 3.69 | sim | sim |
| cat_tarefaFinalizada | evento, código (conversa/foco/evento) | sim | 63 | 2.43 | sim | sim |
| cat_tarefaFinalizada~exagerado | evento, código (conversa/foco/evento) | sim | 54 | 2.41 | sim | sim |
| cat_erro~suave | evento, código (conversa/foco/evento) | sim | 69 | 2.37 | sim | sim |
| cat_erro | evento, código (conversa/foco/evento) | sim | 53 | 3.94 | sim | sim |
| cat_erro~exagerado | evento, código (conversa/foco/evento) | sim | 45 | 2.59 | sim | sim |
| cat_sucesso~suave | evento, código (conversa/foco/evento) | sim | 69 | 2.43 | sim | sim |
| cat_sucesso | evento, código (conversa/foco/evento) | sim | 53 | 2.40 | sim | sim |
| cat_sucesso~exagerado | evento, código (conversa/foco/evento) | sim | 45 | 2.35 | sim | sim |
| cat_sequencia~suave | evento, código (conversa/foco/evento) | sim | 94 | 3.26 | sim | sim |
| cat_sequencia | evento, código (conversa/foco/evento) | sim | 73 | 2.44 | sim | sim |
| cat_sequencia~exagerado | evento, código (conversa/foco/evento) | sim | 62 | 2.47 | sim | sim |
| cat_aniversario~suave | evento | sim | 125 | 2.34 | sim | sim |
| cat_aniversario | evento | sim | 97 | 3.35 | sim | sim |
| cat_aniversario~exagerado | evento | sim | 82 | 2.29 | sim | sim |
| cat_bomDia~suave | evento, código (conversa/foco/evento) | sim | 100 | 2.29 | sim | sim |
| cat_bomDia | evento, código (conversa/foco/evento) | sim | 77 | 3.49 | sim | sim |
| cat_bomDia~exagerado | evento, código (conversa/foco/evento) | sim | 66 | 2.72 | sim | sim |
| cat_boaNoite~suave | evento, código (conversa/foco/evento) | sim | 82 | 2.59 | sim | sim |
| cat_boaNoite | evento, código (conversa/foco/evento) | sim | 63 | 2.20 | sim | sim |
| cat_boaNoite~exagerado | evento, código (conversa/foco/evento) | sim | 54 | 2.68 | sim | sim |
| cat_lembrete~suave | evento, código (conversa/foco/evento) | sim | 82 | 4.05 | sim | sim |
| cat_lembrete | evento, código (conversa/foco/evento) | sim | 63 | 3.23 | sim | sim |
| cat_lembrete~exagerado | evento, código (conversa/foco/evento) | sim | 54 | 2.49 | sim | sim |
| cat_horaPausa~suave | evento | sim | 88 | 2.37 | sim | sim |
| cat_horaPausa | evento | sim | 68 | 1.96 | sim | sim |
| cat_horaPausa~exagerado | evento | sim | 58 | 2.94 | sim | sim |
| cat_modoFoco~suave | evento | sim | 82 | 25.65 | sim | sim |
| cat_modoFoco | evento | sim | 63 | 4.43 | sim | sim |
| cat_modoFoco~exagerado | evento | sim | 54 | 2.36 | sim | sim |
| cat_parabens~suave | frase, evento, código (conversa/foco/evento) | sim | 82 | 2.50 | sim | sim |
| cat_parabens | frase, evento, código (conversa/foco/evento) | sim | 63 | 2.88 | sim | sim |
| cat_parabens~exagerado | frase, evento, código (conversa/foco/evento) | sim | 54 | 2.62 | sim | sim |
| cat_notificacao~suave | evento, código (conversa/foco/evento) | sim | 50 | 2.40 | sim | sim |
| cat_notificacao | evento, código (conversa/foco/evento) | sim | 39 | 2.56 | sim | sim |
| cat_notificacao~exagerado | evento, código (conversa/foco/evento) | sim | 33 | 2.42 | sim | sim |
| cat_mensagemNova~suave | evento | sim | 63 | 19.02 | sim | sim |
| cat_mensagemNova | evento | sim | 48 | 3.12 | sim | sim |
| cat_mensagemNova~exagerado | evento | sim | 41 | 2.60 | sim | sim |
| cat_ausente~suave | evento, código (conversa/foco/evento) | sim | 132 | 2.64 | sim | sim |
| cat_ausente | evento, código (conversa/foco/evento) | sim | 101 | 2.59 | sim | sim |
| cat_ausente~exagerado | evento, código (conversa/foco/evento) | sim | 86 | 2.50 | sim | sim |
| cat_voltou~suave | evento, código (conversa/foco/evento) | sim | 75 | 2.92 | sim | sim |
| cat_voltou | evento, código (conversa/foco/evento) | sim | 58 | 34.44 | sim | sim |
| cat_voltou~exagerado | evento, código (conversa/foco/evento) | sim | 49 | 29.16 | sim | sim |
| cat_clique~suave | evento, código (conversa/foco/evento) | sim | 29 | 27.07 | sim | sim |
| cat_clique | evento, código (conversa/foco/evento) | sim | 22 | 9.13 | sim | sim |
| cat_clique~exagerado | evento, código (conversa/foco/evento) | sim | 19 | 2.08 | sim | sim |
| cat_cocegas~suave | frase, evento, código (conversa/foco/evento) | sim | 69 | 2.29 | sim | sim |
| cat_cocegas | frase, evento, código (conversa/foco/evento) | sim | 53 | 2.32 | sim | sim |
| cat_cocegas~exagerado | frase, evento, código (conversa/foco/evento) | sim | 45 | 2.13 | sim | sim |
| cat_jogado~suave | evento, código (conversa/foco/evento) | sim | 44 | 2.09 | sim | sim |
| cat_jogado | evento, código (conversa/foco/evento) | sim | 34 | 2.34 | sim | sim |
| cat_jogado~exagerado | evento, código (conversa/foco/evento) | sim | 29 | 2.42 | sim | sim |
| cat_duploClique~suave | evento, código (conversa/foco/evento) | sim | 38 | 2.39 | sim | sim |
| cat_duploClique | evento, código (conversa/foco/evento) | sim | 29 | 2.25 | sim | sim |
| cat_duploClique~exagerado | evento, código (conversa/foco/evento) | sim | 25 | 2.24 | sim | sim |
| cat_segurar~suave | evento, código (conversa/foco/evento) | sim | 57 | 2.35 | sim | sim |
| cat_segurar | evento, código (conversa/foco/evento) | sim | 44 | 2.04 | sim | sim |
| cat_segurar~exagerado | evento, código (conversa/foco/evento) | sim | 37 | 2.16 | sim | sim |
| cat_empurrado~suave | frase | sim | 44 | 12.53 | sim | sim |
| cat_empurrado | frase | sim | 34 | 2.53 | sim | sim |
| cat_empurrado~exagerado | frase | sim | 29 | 2.53 | sim | sim |
| cat_seguir~suave | frase | sim | 94 | 2.48 | sim | sim |
| cat_seguir | frase | sim | 73 | 2.47 | sim | sim |
| cat_seguir~exagerado | frase | sim | 62 | 2.29 | sim | sim |
| cat_esconder~suave | frase, código (conversa/foco/evento) | sim | 75 | 2.41 | sim | sim |
| cat_esconder | frase, código (conversa/foco/evento) | sim | 58 | 2.46 | sim | sim |
| cat_esconder~exagerado | frase, código (conversa/foco/evento) | sim | 49 | 2.45 | sim | sim |
| cat_espiarBorda~suave | sozinho (ambiente) | sim | 125 | 7.22 | sim | sim |
| cat_espiarBorda | sozinho (ambiente) | sim | 97 | 4.39 | sim | sim |
| cat_espiarBorda~exagerado | sozinho (ambiente) | sim | 82 | 2.36 | sim | sim |
| cat_beberShake~suave | sozinho (ambiente), frase | sim | 88 | 2.43 | sim | sim |
| cat_beberShake | sozinho (ambiente), frase | sim | 68 | 2.10 | sim | sim |
| cat_beberShake~exagerado | sozinho (ambiente), frase | sim | 58 | 2.48 | sim | sim |
| cat_ouvirMusica~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 125 | 2.62 | sim | sim |
| cat_ouvirMusica | sozinho (ambiente), código (conversa/foco/evento) | sim | 97 | 15.39 | sim | sim |
| cat_ouvirMusica~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 19.84 | sim | sim |
| cat_estrelas~suave | sozinho (ambiente) | sim | 144 | 2.62 | sim | sim |
| cat_estrelas | sozinho (ambiente) | sim | 111 | 2.53 | sim | sim |
| cat_estrelas~exagerado | sozinho (ambiente) | sim | 94 | 2.38 | sim | sim |
| cat_soprarBolhas~suave | sozinho (ambiente) | sim | 94 | 2.71 | sim | sim |
| cat_soprarBolhas | sozinho (ambiente) | sim | 73 | 2.40 | sim | sim |
| cat_soprarBolhas~exagerado | sozinho (ambiente) | sim | 62 | 2.36 | sim | sim |
| cat_perseguir~suave | sozinho (ambiente) | sim | 125 | 13.44 | sim | sim |
| cat_perseguir | sozinho (ambiente) | sim | 97 | 2.44 | sim | sim |
| cat_perseguir~exagerado | sozinho (ambiente) | sim | 82 | 2.26 | sim | sim |
| cat_pular~suave | sozinho (ambiente) | sim | 50 | 2.27 | sim | sim |
| cat_pular | sozinho (ambiente) | sim | 39 | 2.27 | sim | sim |
| cat_pular~exagerado | sozinho (ambiente) | sim | 33 | 2.20 | sim | sim |
| cat_rolar~suave | sozinho (ambiente), frase | sim | 57 | 2.24 | sim | sim |
| cat_rolar | sozinho (ambiente), frase | sim | 44 | 2.42 | sim | sim |
| cat_rolar~exagerado | sozinho (ambiente), frase | sim | 37 | 2.36 | sim | sim |
| cat_girar~suave | sozinho (ambiente), frase | sim | 57 | 2.39 | sim | sim |
| cat_girar | sozinho (ambiente), frase | sim | 44 | 2.21 | sim | sim |
| cat_girar~exagerado | sozinho (ambiente), frase | sim | 37 | 2.26 | sim | sim |
| cat_escondeBorda~suave | sozinho (ambiente) | sim | 138 | 3.36 | sim | sim |
| cat_escondeBorda | sozinho (ambiente) | sim | 106 | 2.30 | sim | sim |
| cat_escondeBorda~exagerado | sozinho (ambiente) | sim | 90 | 2.73 | sim | sim |
| cat_frio~suave | sozinho (ambiente) | sim | 94 | 2.80 | sim | sim |
| cat_frio | sozinho (ambiente) | sim | 73 | 2.12 | sim | sim |
| cat_frio~exagerado | sozinho (ambiente) | sim | 62 | 2.12 | sim | sim |
| cat_calor~suave | sozinho (ambiente) | sim | 94 | 2.12 | sim | sim |
| cat_calor | sozinho (ambiente) | sim | 73 | 5.94 | sim | sim |
| cat_calor~exagerado | sozinho (ambiente) | sim | 62 | 5.63 | sim | sim |
| cat_chuva~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 107 | 2.46 | sim | sim |
| cat_chuva | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 2.32 | sim | sim |
| cat_chuva~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 70 | 2.42 | sim | sim |
| cat_vento~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 94 | 2.63 | sim | sim |
| cat_vento | sozinho (ambiente), código (conversa/foco/evento) | sim | 73 | 2.45 | sim | sim |
| cat_vento~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 62 | 2.44 | sim | sim |
| cat_desaparecer~suave | frase | sim | 75 | 2.17 | sim | sim |
| cat_desaparecer | frase | sim | 58 | 2.09 | sim | sim |
| cat_desaparecer~exagerado | frase | sim | 49 | 7.20 | sim | sim |
| cat_teleporte~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 63 | 2.85 | sim | sim |
| cat_teleporte | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 48 | 2.47 | sim | sim |
| cat_teleporte~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 41 | 2.71 | sim | sim |
| cat_aura~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 113 | 2.34 | sim | sim |
| cat_aura | sozinho (ambiente), código (conversa/foco/evento) | sim | 87 | 2.28 | sim | sim |
| cat_aura~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 74 | 2.29 | sim | sim |
| cat_evolucao~suave | sozinho (ambiente), evento | sim | 100 | 2.47 | sim | sim |
| cat_evolucao | sozinho (ambiente), evento | sim | 77 | 2.40 | sim | sim |
| cat_evolucao~exagerado | sozinho (ambiente), evento | sim | 66 | 2.35 | sim | sim |
| cat_modoPoder~suave | sozinho (ambiente), frase | sim | 100 | 7.85 | sim | sim |
| cat_modoPoder | sozinho (ambiente), frase | sim | 77 | 2.48 | sim | sim |
| cat_modoPoder~exagerado | sozinho (ambiente), frase | sim | 66 | 2.26 | sim | sim |
| cat_pet~suave | evento, código (conversa/foco/evento) | sim | 57 | 2.29 | sim | sim |
| cat_pet | evento, código (conversa/foco/evento) | sim | 44 | 2.41 | sim | sim |
| cat_pet~exagerado | evento, código (conversa/foco/evento) | sim | 37 | 2.62 | sim | sim |
| cat_poseEpica~suave | sozinho (ambiente) | sim | 113 | 2.86 | sim | sim |
| cat_poseEpica | sozinho (ambiente) | sim | 87 | 2.37 | sim | sim |
| cat_poseEpica~exagerado | sozinho (ambiente) | sim | 74 | 2.17 | sim | sim |
| cat_encararDentes~suave | sozinho (ambiente) | sim | 100 | 2.38 | sim | sim |
| cat_encararDentes | sozinho (ambiente) | sim | 77 | 4.43 | sim | sim |
| cat_encararDentes~exagerado | sozinho (ambiente) | sim | 66 | 2.42 | sim | sim |
| cat_sorrisoCanto~suave | sozinho (ambiente) | sim | 69 | 2.72 | sim | sim |
| cat_sorrisoCanto | sozinho (ambiente) | sim | 53 | 2.49 | sim | sim |
| cat_sorrisoCanto~exagerado | sozinho (ambiente) | sim | 45 | 2.28 | sim | sim |
| cat_sobrancelha~suave | sozinho (ambiente) | sim | 50 | 2.27 | sim | sim |
| cat_sobrancelha | sozinho (ambiente) | sim | 39 | 2.68 | sim | sim |
| cat_sobrancelha~exagerado | sozinho (ambiente) | sim | 33 | 2.50 | sim | sim |
| cat_revirarOlhos~suave | sozinho (ambiente) | sim | 57 | 2.48 | sim | sim |
| cat_revirarOlhos | sozinho (ambiente) | sim | 44 | 2.78 | sim | sim |
| cat_revirarOlhos~exagerado | sozinho (ambiente) | sim | 37 | 2.45 | sim | sim |
| cat_ombrosDeboche~suave | sozinho (ambiente) | sim | 63 | 2.75 | sim | sim |
| cat_ombrosDeboche | sozinho (ambiente) | sim | 48 | 2.43 | sim | sim |
| cat_ombrosDeboche~exagerado | sozinho (ambiente) | sim | 41 | 20.25 | sim | sim |
| cat_superioridade~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 16.44 | sim | sim |
| cat_superioridade | sozinho (ambiente), código (conversa/foco/evento) | sim | 63 | 2.42 | sim | sim |
| cat_superioridade~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 54 | 2.39 | sim | sim |
| cat_naoFuiEu~suave | sozinho (ambiente) | sim | 88 | 2.49 | sim | sim |
| cat_naoFuiEu | sozinho (ambiente) | sim | 68 | 2.31 | sim | sim |
| cat_naoFuiEu~exagerado | sozinho (ambiente) | sim | 58 | 2.29 | sim | sim |
| cat_assobiar~suave | sozinho (ambiente) | sim | 94 | 2.33 | sim | sim |
| cat_assobiar | sozinho (ambiente) | sim | 73 | 2.57 | sim | sim |
| cat_assobiar~exagerado | sozinho (ambiente) | sim | 62 | 2.66 | sim | sim |
| cat_olharLado~suave | sozinho (ambiente) | sim | 69 | 2.74 | sim | sim |
| cat_olharLado | sozinho (ambiente) | sim | 53 | 2.45 | sim | sim |
| cat_olharLado~exagerado | sozinho (ambiente) | sim | 45 | 2.50 | sim | sim |
| cat_beijoExagerado~suave | sozinho (ambiente), frase | sim | 75 | 10.59 | sim | sim |
| cat_beijoExagerado | sozinho (ambiente), frase | sim | 58 | 2.14 | sim | sim |
| cat_beijoExagerado~exagerado | sozinho (ambiente), frase | sim | 49 | 2.16 | sim | sim |
| cat_poseVilao~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 94 | 2.76 | sim | sim |
| cat_poseVilao | sozinho (ambiente), código (conversa/foco/evento) | sim | 73 | 2.58 | sim | sim |
| cat_poseVilao~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 62 | 2.80 | sim | sim |
| cat_rirPropriaPiada~suave | sozinho (ambiente) | sim | 82 | 2.70 | sim | sim |
| cat_rirPropriaPiada | sozinho (ambiente) | sim | 63 | 2.59 | sim | sim |
| cat_rirPropriaPiada~exagerado | sozinho (ambiente) | sim | 54 | 2.34 | sim | sim |
| cat_hmpf~suave | sozinho (ambiente) | sim | 63 | 2.65 | sim | sim |
| cat_hmpf | sozinho (ambiente) | sim | 48 | 2.71 | sim | sim |
| cat_hmpf~exagerado | sozinho (ambiente) | sim | 41 | 2.72 | sim | sim |
| cat_circularPresa~suave | sozinho (ambiente) | sim | 125 | 4.23 | sim | sim |
| cat_circularPresa | sozinho (ambiente) | sim | 97 | 2.49 | sim | sim |
| cat_circularPresa~exagerado | sozinho (ambiente) | sim | 82 | 2.34 | sim | sim |
| cat_charmeCauda~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 94 | 2.43 | sim | sim |
| cat_charmeCauda | sozinho (ambiente), código (conversa/foco/evento) | sim | 73 | 2.25 | sim | sim |
| cat_charmeCauda~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 62 | 2.47 | sim | sim |
| cat_brilharDentes~suave | sozinho (ambiente) | sim | 82 | 2.24 | sim | sim |
| cat_brilharDentes | sozinho (ambiente) | sim | 63 | 2.50 | sim | sim |
| cat_brilharDentes~exagerado | sozinho (ambiente) | sim | 54 | 2.24 | sim | sim |
| cat_olharApaixonado~suave | sozinho (ambiente) | sim | 94 | 9.52 | sim | sim |
| cat_olharApaixonado | sozinho (ambiente) | sim | 73 | 2.52 | sim | sim |
| cat_olharApaixonado~exagerado | sozinho (ambiente) | sim | 62 | 2.70 | sim | sim |
| cat_corar~suave | sozinho (ambiente) | sim | 69 | 2.45 | sim | sim |
| cat_corar | sozinho (ambiente) | sim | 53 | 2.20 | sim | sim |
| cat_corar~exagerado | sozinho (ambiente) | sim | 45 | 2.30 | sim | sim |
| cat_fingirTimidez~suave | sozinho (ambiente) | sim | 75 | 2.31 | sim | sim |
| cat_fingirTimidez | sozinho (ambiente) | sim | 58 | 2.48 | sim | sim |
| cat_fingirTimidez~exagerado | sozinho (ambiente) | sim | 49 | 2.69 | sim | sim |
| cat_soprarBeijo~suave | sozinho (ambiente) | sim | 69 | 2.66 | sim | sim |
| cat_soprarBeijo | sozinho (ambiente) | sim | 53 | 2.69 | sim | sim |
| cat_soprarBeijo~exagerado | sozinho (ambiente) | sim | 45 | 2.64 | sim | sim |
| cat_nadarParaTela~suave | sozinho (ambiente) | sim | 107 | 4.84 | sim | sim |
| cat_nadarParaTela | sozinho (ambiente) | sim | 82 | 2.42 | sim | sim |
| cat_nadarParaTela~exagerado | sozinho (ambiente) | sim | 70 | 2.37 | sim | sim |
| cat_sussurrar~suave | sozinho (ambiente) | sim | 88 | 2.66 | sim | sim |
| cat_sussurrar | sozinho (ambiente) | sim | 68 | 2.81 | sim | sim |
| cat_sussurrar~exagerado | sozinho (ambiente) | sim | 58 | 2.92 | sim | sim |
| cat_elogiarExagero~suave | sozinho (ambiente) | sim | 82 | 2.95 | sim | sim |
| cat_elogiarExagero | sozinho (ambiente) | sim | 63 | 2.92 | sim | sim |
| cat_elogiarExagero~exagerado | sozinho (ambiente) | sim | 54 | 2.91 | sim | sim |
| cat_ciumento~suave | sozinho (ambiente), frase | sim | 82 | 2.89 | sim | sim |
| cat_ciumento | sozinho (ambiente), frase | sim | 63 | 2.32 | sim | sim |
| cat_ciumento~exagerado | sozinho (ambiente), frase | sim | 54 | 12.53 | sim | sim |
| cat_dramaCiumes~suave | sozinho (ambiente) | sim | 88 | 7.65 | sim | sim |
| cat_dramaCiumes | sozinho (ambiente) | sim | 68 | 2.70 | sim | sim |
| cat_dramaCiumes~exagerado | sozinho (ambiente) | sim | 58 | 2.47 | sim | sim |
| cat_amorEterno~suave | sozinho (ambiente) | sim | 113 | 2.45 | sim | sim |
| cat_amorEterno | sozinho (ambiente) | sim | 87 | 2.48 | sim | sim |
| cat_amorEterno~exagerado | sozinho (ambiente) | sim | 74 | 2.32 | sim | sim |
| cat_cantadaRuim~suave | sozinho (ambiente), frase | sim | 75 | 2.50 | sim | sim |
| cat_cantadaRuim | sozinho (ambiente), frase | sim | 58 | 2.55 | sim | sim |
| cat_cantadaRuim~exagerado | sozinho (ambiente), frase | sim | 49 | 2.24 | sim | sim |
| cat_abracoApertado~suave | frase | sim | 94 | 4.60 | sim | sim |
| cat_abracoApertado | frase | sim | 73 | 2.77 | sim | sim |
| cat_abracoApertado~exagerado | frase | sim | 62 | 2.63 | sim | sim |
| cat_espelho~suave | sozinho (ambiente), frase | sim | 100 | 2.54 | sim | sim |
| cat_espelho | sozinho (ambiente), frase | sim | 77 | 2.53 | sim | sim |
| cat_espelho~exagerado | sozinho (ambiente), frase | sim | 66 | 2.88 | sim | sim |
| cat_selfie~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 88 | 2.67 | sim | sim |
| cat_selfie | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 68 | 2.59 | sim | sim |
| cat_selfie~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 58 | 2.36 | sim | sim |
| cat_desfile~suave | sozinho (ambiente), frase | sim | 138 | 2.54 | sim | sim |
| cat_desfile | sozinho (ambiente), frase | sim | 106 | 2.33 | sim | sim |
| cat_desfile~exagerado | sozinho (ambiente), frase | sim | 90 | 2.45 | sim | sim |
| cat_seAcharMaximo~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 88 | 2.51 | sim | sim |
| cat_seAcharMaximo | sozinho (ambiente), código (conversa/foco/evento) | sim | 68 | 2.40 | sim | sim |
| cat_seAcharMaximo~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 58 | 2.26 | sim | sim |
| cat_flexionarBiceps~suave | sozinho (ambiente), frase | sim | 75 | 2.64 | sim | sim |
| cat_flexionarBiceps | sozinho (ambiente), frase | sim | 58 | 6.31 | sim | sim |
| cat_flexionarBiceps~exagerado | sozinho (ambiente), frase | sim | 49 | 3.11 | sim | sim |
| cat_duploBiceps~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 88 | 2.32 | sim | sim |
| cat_duploBiceps | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 68 | 2.31 | sim | sim |
| cat_duploBiceps~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 58 | 2.39 | sim | sim |
| cat_aplausosImaginarios~suave | sozinho (ambiente) | sim | 94 | 2.32 | sim | sim |
| cat_aplausosImaginarios | sozinho (ambiente) | sim | 73 | 2.24 | sim | sim |
| cat_aplausosImaginarios~exagerado | sozinho (ambiente) | sim | 62 | 2.34 | sim | sim |
| cat_agradecerPlateia~suave | sozinho (ambiente) | sim | 82 | 2.52 | sim | sim |
| cat_agradecerPlateia | sozinho (ambiente) | sim | 63 | 2.65 | sim | sim |
| cat_agradecerPlateia~exagerado | sozinho (ambiente) | sim | 54 | 3.04 | sim | sim |
| cat_fingirModestia~suave | sozinho (ambiente) | sim | 75 | 2.61 | sim | sim |
| cat_fingirModestia | sozinho (ambiente) | sim | 58 | 2.58 | sim | sim |
| cat_fingirModestia~exagerado | sozinho (ambiente) | sim | 49 | 2.62 | sim | sim |
| cat_pedirElogios~suave | sozinho (ambiente) | sim | 75 | 2.26 | sim | sim |
| cat_pedirElogios | sozinho (ambiente) | sim | 58 | 2.22 | sim | sim |
| cat_pedirElogios~exagerado | sozinho (ambiente) | sim | 49 | 2.44 | sim | sim |
| cat_tapinhaAbdomen~suave | sozinho (ambiente) | sim | 75 | 2.28 | sim | sim |
| cat_tapinhaAbdomen | sozinho (ambiente) | sim | 58 | 2.41 | sim | sim |
| cat_tapinhaAbdomen~exagerado | sozinho (ambiente) | sim | 49 | 5.50 | sim | sim |
| cat_halteres~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 113 | 2.68 | sim | sim |
| cat_halteres | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 87 | 2.59 | sim | sim |
| cat_halteres~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 74 | 2.42 | sim | sim |
| cat_flexoes~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 113 | 2.29 | sim | sim |
| cat_flexoes | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 87 | 2.47 | sim | sim |
| cat_flexoes~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 74 | 2.52 | sim | sim |
| cat_incrivel~suave | sozinho (ambiente) | sim | 75 | 2.49 | sim | sim |
| cat_incrivel | sozinho (ambiente) | sim | 58 | 2.24 | sim | sim |
| cat_incrivel~exagerado | sozinho (ambiente) | sim | 49 | 2.33 | sim | sim |
| cat_toalha~suave | sozinho (ambiente) | sim | 100 | 4.55 | sim | sim |
| cat_toalha | sozinho (ambiente) | sim | 77 | 2.55 | sim | sim |
| cat_toalha~exagerado | sozinho (ambiente) | sim | 66 | 2.36 | sim | sim |
| cat_admirarMusculos~suave | sozinho (ambiente) | sim | 88 | 2.30 | sim | sim |
| cat_admirarMusculos | sozinho (ambiente) | sim | 68 | 2.25 | sim | sim |
| cat_admirarMusculos~exagerado | sozinho (ambiente) | sim | 58 | 2.47 | sim | sim |
| cat_agachamentoNado~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 107 | 2.20 | sim | sim |
| cat_agachamentoNado | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 2.29 | sim | sim |
| cat_agachamentoNado~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 70 | 2.56 | sim | sim |
| cat_alongar~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 100 | 2.68 | sim | sim |
| cat_alongar | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 77 | 2.56 | sim | sim |
| cat_alongar~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 66 | 2.75 | sim | sim |
| cat_elastico~suave | sozinho (ambiente) | sim | 100 | 2.72 | sim | sim |
| cat_elastico | sozinho (ambiente) | sim | 77 | 2.31 | sim | sim |
| cat_elastico~exagerado | sozinho (ambiente) | sim | 66 | 2.33 | sim | sim |
| cat_espelhoInvisivel~suave | sozinho (ambiente) | sim | 82 | 2.53 | sim | sim |
| cat_espelhoInvisivel | sozinho (ambiente) | sim | 63 | 2.57 | sim | sim |
| cat_espelhoInvisivel~exagerado | sozinho (ambiente) | sim | 54 | 2.39 | sim | sim |
| cat_beijoBiceps~suave | sozinho (ambiente) | sim | 82 | 4.23 | sim | sim |
| cat_beijoBiceps | sozinho (ambiente) | sim | 63 | 2.21 | sim | sim |
| cat_beijoBiceps~exagerado | sozinho (ambiente) | sim | 54 | 2.19 | sim | sim |
| cat_contarRepeticoes~suave | sozinho (ambiente) | sim | 156 | 2.20 | sim | sim |
| cat_contarRepeticoes | sozinho (ambiente) | sim | 120 | 2.22 | sim | sim |
| cat_contarRepeticoes~exagerado | sozinho (ambiente) | sim | 103 | 2.43 | sim | sim |
| cat_esparramado~suave | sozinho (ambiente) | sim | 144 | 2.49 | sim | sim |
| cat_esparramado | sozinho (ambiente) | sim | 111 | 4.98 | sim | sim |
| cat_esparramado~exagerado | sozinho (ambiente) | sim | 94 | 2.55 | sim | sim |
| cat_ignorar~suave | sozinho (ambiente) | sim | 94 | 2.34 | sim | sim |
| cat_ignorar | sozinho (ambiente) | sim | 73 | 2.32 | sim | sim |
| cat_ignorar~exagerado | sozinho (ambiente) | sim | 62 | 2.29 | sim | sim |
| cat_fingirDormir~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 132 | 2.72 | sim | sim |
| cat_fingirDormir | sozinho (ambiente), código (conversa/foco/evento) | sim | 101 | 2.70 | sim | sim |
| cat_fingirDormir~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 86 | 2.83 | sim | sim |
| cat_palito~suave | sozinho (ambiente) | sim | 94 | 2.54 | sim | sim |
| cat_palito | sozinho (ambiente) | sim | 73 | 2.77 | sim | sim |
| cat_palito~exagerado | sozinho (ambiente) | sim | 62 | 2.87 | sim | sim |
| cat_cocarBarriga~suave | sozinho (ambiente) | sim | 88 | 2.81 | sim | sim |
| cat_cocarBarriga | sozinho (ambiente) | sim | 68 | 2.44 | sim | sim |
| cat_cocarBarriga~exagerado | sozinho (ambiente) | sim | 58 | 2.70 | sim | sim |
| cat_rolarPreguica~suave | sozinho (ambiente) | sim | 94 | 2.53 | sim | sim |
| cat_rolarPreguica | sozinho (ambiente) | sim | 73 | 2.33 | sim | sim |
| cat_rolarPreguica~exagerado | sozinho (ambiente) | sim | 62 | 2.38 | sim | sim |
| cat_depoisEuFaco~suave | sozinho (ambiente), frase | sim | 100 | 2.54 | sim | sim |
| cat_depoisEuFaco | sozinho (ambiente), frase | sim | 77 | 2.72 | sim | sim |
| cat_depoisEuFaco~exagerado | sozinho (ambiente), frase | sim | 66 | 2.82 | sim | sim |
| cat_escondeAlga~suave | sozinho (ambiente) | sim | 125 | 2.57 | sim | sim |
| cat_escondeAlga | sozinho (ambiente) | sim | 97 | 2.49 | sim | sim |
| cat_escondeAlga~exagerado | sozinho (ambiente) | sim | 82 | 2.24 | sim | sim |
| cat_escondeCoberta~suave | sozinho (ambiente) | sim | 125 | 2.39 | sim | sim |
| cat_escondeCoberta | sozinho (ambiente) | sim | 97 | 4.61 | sim | sim |
| cat_escondeCoberta~exagerado | sozinho (ambiente) | sim | 82 | 2.40 | sim | sim |
| cat_suspirar~suave | sozinho (ambiente) | sim | 75 | 2.49 | sim | sim |
| cat_suspirar | sozinho (ambiente) | sim | 58 | 2.46 | sim | sim |
| cat_suspirar~exagerado | sozinho (ambiente) | sim | 49 | 2.44 | sim | sim |
| cat_olharRelogio~suave | sozinho (ambiente) | sim | 88 | 2.33 | sim | sim |
| cat_olharRelogio | sozinho (ambiente) | sim | 68 | 2.31 | sim | sim |
| cat_olharRelogio~exagerado | sozinho (ambiente) | sim | 58 | 2.25 | sim | sim |
| cat_arrotar~suave | sozinho (ambiente) | sim | 63 | 2.38 | sim | sim |
| cat_arrotar | sozinho (ambiente) | sim | 48 | 5.66 | sim | sim |
| cat_arrotar~exagerado | sozinho (ambiente) | sim | 41 | 2.65 | sim | sim |
| cat_solucar~suave | sozinho (ambiente) | sim | 94 | 2.60 | sim | sim |
| cat_solucar | sozinho (ambiente) | sim | 73 | 2.63 | sim | sim |
| cat_solucar~exagerado | sozinho (ambiente) | sim | 62 | 2.66 | sim | sim |
| cat_espirrar~suave | sozinho (ambiente) | sim | 63 | 2.92 | sim | sim |
| cat_espirrar | sozinho (ambiente) | sim | 48 | 2.91 | sim | sim |
| cat_espirrar~exagerado | sozinho (ambiente) | sim | 41 | 2.94 | sim | sim |
| cat_peidinho~suave | sozinho (ambiente) | sim | 82 | 2.88 | sim | sim |
| cat_peidinho | sozinho (ambiente) | sim | 63 | 2.70 | sim | sim |
| cat_peidinho~exagerado | sozinho (ambiente) | sim | 54 | 2.70 | sim | sim |
| cat_barrigaRoncando~suave | sozinho (ambiente) | sim | 75 | 2.94 | sim | sim |
| cat_barrigaRoncando | sozinho (ambiente) | sim | 58 | 3.05 | sim | sim |
| cat_barrigaRoncando~exagerado | sozinho (ambiente) | sim | 49 | 2.44 | sim | sim |
| cat_careta~suave | sozinho (ambiente), frase | sim | 63 | 2.28 | sim | sim |
| cat_careta | sozinho (ambiente), frase | sim | 48 | 2.59 | sim | sim |
| cat_careta~exagerado | sozinho (ambiente), frase | sim | 41 | 2.23 | sim | sim |
| cat_lingua~suave | sozinho (ambiente), frase | sim | 57 | 2.23 | sim | sim |
| cat_lingua | sozinho (ambiente), frase | sim | 44 | 2.55 | sim | sim |
| cat_lingua~exagerado | sozinho (ambiente), frase | sim | 37 | 2.58 | sim | sim |
| cat_bochechas~suave | sozinho (ambiente), frase | sim | 69 | 2.43 | sim | sim |
| cat_bochechas | sozinho (ambiente), frase | sim | 53 | 2.23 | sim | sim |
| cat_bochechas~exagerado | sozinho (ambiente), frase | sim | 45 | 2.48 | sim | sim |
| cat_estalar~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 75 | 5.21 | sim | sim |
| cat_estalar | sozinho (ambiente), código (conversa/foco/evento) | sim | 58 | 2.59 | sim | sim |
| cat_estalar~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 49 | 2.51 | sim | sim |
| cat_autoCocegas~suave | sozinho (ambiente) | sim | 75 | 2.44 | sim | sim |
| cat_autoCocegas | sozinho (ambiente) | sim | 58 | 2.56 | sim | sim |
| cat_autoCocegas~exagerado | sozinho (ambiente) | sim | 49 | 2.63 | sim | sim |
| cat_desmaio~suave | sozinho (ambiente) | sim | 113 | 2.52 | sim | sim |
| cat_desmaio | sozinho (ambiente) | sim | 87 | 2.65 | sim | sim |
| cat_desmaio~exagerado | sozinho (ambiente) | sim | 74 | 2.94 | sim | sim |
| cat_cairJoelhos~suave | sozinho (ambiente) | sim | 94 | 2.89 | sim | sim |
| cat_cairJoelhos | sozinho (ambiente) | sim | 73 | 3.26 | sim | sim |
| cat_cairJoelhos~exagerado | sozinho (ambiente) | sim | 62 | 3.13 | sim | sim |
| cat_perdaoTeatral~suave | frase | sim | 100 | 2.75 | sim | sim |
| cat_perdaoTeatral | frase | sim | 77 | 2.72 | sim | sim |
| cat_perdaoTeatral~exagerado | frase | sim | 66 | 2.63 | sim | sim |
| cat_fingirMachucado~suave | sozinho (ambiente) | sim | 94 | 2.66 | sim | sim |
| cat_fingirMachucado | sozinho (ambiente) | sim | 73 | 2.64 | sim | sim |
| cat_fingirMachucado~exagerado | sozinho (ambiente) | sim | 62 | 2.83 | sim | sim |
| cat_falsaMorte~suave | sozinho (ambiente) | sim | 138 | 4.50 | sim | sim |
| cat_falsaMorte | sozinho (ambiente) | sim | 106 | 2.67 | sim | sim |
| cat_falsaMorte~exagerado | sozinho (ambiente) | sim | 90 | 2.43 | sim | sim |
| cat_ressuscitar~suave | sozinho (ambiente) | sim | 88 | 2.80 | sim | sim |
| cat_ressuscitar | sozinho (ambiente) | sim | 68 | 2.67 | sim | sim |
| cat_ressuscitar~exagerado | sozinho (ambiente) | sim | 58 | 2.13 | sim | sim |
| cat_gritarSuperficie~suave | sozinho (ambiente) | sim | 82 | 2.23 | sim | sim |
| cat_gritarSuperficie | sozinho (ambiente) | sim | 63 | 5.49 | sim | sim |
| cat_gritarSuperficie~exagerado | sozinho (ambiente) | sim | 54 | 2.40 | sim | sim |
| cat_revolta~suave | sozinho (ambiente) | sim | 88 | 2.35 | sim | sim |
| cat_revolta | sozinho (ambiente) | sim | 68 | 2.30 | sim | sim |
| cat_revolta~exagerado | sozinho (ambiente) | sim | 58 | 2.32 | sim | sim |
| cat_birra~suave | sozinho (ambiente) | sim | 113 | 2.39 | sim | sim |
| cat_birra | sozinho (ambiente) | sim | 87 | 2.57 | sim | sim |
| cat_birra~exagerado | sozinho (ambiente) | sim | 74 | 2.30 | sim | sim |
| cat_esconderAtras~suave | sozinho (ambiente) | sim | 82 | 4.28 | sim | sim |
| cat_esconderAtras | sozinho (ambiente) | sim | 63 | 2.50 | sim | sim |
| cat_esconderAtras~exagerado | sozinho (ambiente) | sim | 54 | 2.28 | sim | sim |
| cat_puxarCursor~suave | sozinho (ambiente) | sim | 69 | 2.59 | sim | sim |
| cat_puxarCursor | sozinho (ambiente) | sim | 53 | 2.78 | sim | sim |
| cat_puxarCursor~exagerado | sozinho (ambiente) | sim | 45 | 2.51 | sim | sim |
| cat_derrubarObjeto~suave | sozinho (ambiente) | sim | 82 | 2.26 | sim | sim |
| cat_derrubarObjeto | sozinho (ambiente) | sim | 63 | 2.42 | sim | sim |
| cat_derrubarObjeto~exagerado | sozinho (ambiente) | sim | 54 | 2.46 | sim | sim |
| cat_fugirBolhas~suave | sozinho (ambiente) | sim | 75 | 2.33 | sim | sim |
| cat_fugirBolhas | sozinho (ambiente) | sim | 58 | 2.38 | sim | sim |
| cat_fugirBolhas~exagerado | sozinho (ambiente) | sim | 49 | 5.40 | sim | sim |
| cat_rirEscondido~suave | sozinho (ambiente) | sim | 75 | 2.72 | sim | sim |
| cat_rirEscondido | sozinho (ambiente) | sim | 58 | 2.55 | sim | sim |
| cat_rirEscondido~exagerado | sozinho (ambiente) | sim | 49 | 2.39 | sim | sim |
| cat_espiarUmOlho~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 75 | 2.19 | sim | sim |
| cat_espiarUmOlho | sozinho (ambiente), código (conversa/foco/evento) | sim | 58 | 2.26 | sim | sim |
| cat_espiarUmOlho~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 49 | 2.51 | sim | sim |
| cat_sustoBorda~suave | sozinho (ambiente) | sim | 69 | 2.57 | sim | sim |
| cat_sustoBorda | sozinho (ambiente) | sim | 53 | 2.51 | sim | sim |
| cat_sustoBorda~exagerado | sozinho (ambiente) | sim | 45 | 2.32 | sim | sim |
| cat_dorsalTela~suave | sozinho (ambiente) | sim | 156 | 3.49 | sim | sim |
| cat_dorsalTela | sozinho (ambiente) | sim | 120 | 2.39 | sim | sim |
| cat_dorsalTela~exagerado | sozinho (ambiente) | sim | 103 | 2.33 | sim | sim |
| cat_pregarPeca~suave | sozinho (ambiente) | sim | 82 | 2.65 | sim | sim |
| cat_pregarPeca | sozinho (ambiente) | sim | 63 | 2.61 | sim | sim |
| cat_pregarPeca~exagerado | sozinho (ambiente) | sim | 54 | 2.82 | sim | sim |
| cat_roubarFoco~suave | sozinho (ambiente) | sim | 82 | 2.25 | sim | sim |
| cat_roubarFoco | sozinho (ambiente) | sim | 63 | 2.47 | sim | sim |
| cat_roubarFoco~exagerado | sozinho (ambiente) | sim | 54 | 2.50 | sim | sim |
| cat_baguncarJanela~suave | sozinho (ambiente) | sim | 75 | 4.68 | sim | sim |
| cat_baguncarJanela | sozinho (ambiente) | sim | 58 | 2.24 | sim | sim |
| cat_baguncarJanela~exagerado | sozinho (ambiente) | sim | 49 | 2.55 | sim | sim |
| cat_perseguirBolha~suave | sozinho (ambiente) | sim | 100 | 2.79 | sim | sim |
| cat_perseguirBolha | sozinho (ambiente) | sim | 77 | 2.72 | sim | sim |
| cat_perseguirBolha~exagerado | sozinho (ambiente) | sim | 66 | 2.56 | sim | sim |
| cat_peixeBorracha~suave | sozinho (ambiente) | sim | 94 | 2.82 | sim | sim |
| cat_peixeBorracha | sozinho (ambiente) | sim | 73 | 2.91 | sim | sim |
| cat_peixeBorracha~exagerado | sozinho (ambiente) | sim | 62 | 6.52 | sim | sim |
| cat_baterBorda~suave | sozinho (ambiente) | sim | 82 | 2.30 | sim | sim |
| cat_baterBorda | sozinho (ambiente) | sim | 63 | 2.02 | sim | sim |
| cat_baterBorda~exagerado | sozinho (ambiente) | sim | 54 | 2.04 | sim | sim |
| cat_morderIcone~suave | sozinho (ambiente) | sim | 69 | 2.37 | sim | sim |
| cat_morderIcone | sozinho (ambiente) | sim | 53 | 2.28 | sim | sim |
| cat_morderIcone~exagerado | sozinho (ambiente) | sim | 45 | 2.25 | sim | sim |
| cat_zombar~suave | sozinho (ambiente) | sim | 69 | 2.27 | sim | sim |
| cat_zombar | sozinho (ambiente) | sim | 53 | 2.42 | sim | sim |
| cat_zombar~exagerado | sozinho (ambiente) | sim | 45 | 2.32 | sim | sim |
| cat_imitar~suave | sozinho (ambiente), frase | sim | 88 | 2.22 | sim | sim |
| cat_imitar | sozinho (ambiente), frase | sim | 68 | 5.00 | sim | sim |
| cat_imitar~exagerado | sozinho (ambiente), frase | sim | 58 | 2.52 | sim | sim |
| cat_linguaVitoria~suave | evento | sim | 63 | 2.51 | sim | sim |
| cat_linguaVitoria | evento | sim | 48 | 2.30 | sim | sim |
| cat_linguaVitoria~exagerado | evento | sim | 41 | 2.40 | sim | sim |
| cat_dancaVitoria~suave | evento, código (conversa/foco/evento) | sim | 94 | 2.84 | sim | sim |
| cat_dancaVitoria | evento, código (conversa/foco/evento) | sim | 73 | 2.90 | sim | sim |
| cat_dancaVitoria~exagerado | evento, código (conversa/foco/evento) | sim | 62 | 2.73 | sim | sim |
| cat_sabiaQueIaErrar~suave | evento, código (conversa/foco/evento) | sim | 75 | 2.66 | sim | sim |
| cat_sabiaQueIaErrar | evento, código (conversa/foco/evento) | sim | 58 | 2.73 | sim | sim |
| cat_sabiaQueIaErrar~exagerado | evento, código (conversa/foco/evento) | sim | 49 | 2.52 | sim | sim |
| cat_apostar~suave | sozinho (ambiente), frase | sim | 75 | 5.03 | sim | sim |
| cat_apostar | sozinho (ambiente), frase | sim | 58 | 2.53 | sim | sim |
| cat_apostar~exagerado | sozinho (ambiente), frase | sim | 49 | 2.50 | sim | sim |
| cat_quedaBraco~suave | sozinho (ambiente), frase | sim | 88 | 2.25 | sim | sim |
| cat_quedaBraco | sozinho (ambiente), frase | sim | 68 | 2.21 | sim | sim |
| cat_quedaBraco~exagerado | sozinho (ambiente), frase | sim | 58 | 2.34 | sim | sim |
| cat_surpresaSarcastica~suave | sozinho (ambiente) | sim | 75 | 2.52 | sim | sim |
| cat_surpresaSarcastica | sozinho (ambiente) | sim | 58 | 2.41 | sim | sim |
| cat_surpresaSarcastica~exagerado | sozinho (ambiente) | sim | 49 | 2.51 | sim | sim |
| cat_aplausoLento~suave | sozinho (ambiente) | sim | 100 | 2.66 | sim | sim |
| cat_aplausoLento | sozinho (ambiente) | sim | 77 | 2.47 | sim | sim |
| cat_aplausoLento~exagerado | sozinho (ambiente) | sim | 66 | 27.19 | sim | sim |
| cat_tchauIronico~suave | sozinho (ambiente) | sim | 69 | 2.56 | sim | sim |
| cat_tchauIronico | sozinho (ambiente) | sim | 53 | 2.73 | sim | sim |
| cat_tchauIronico~exagerado | sozinho (ambiente) | sim | 45 | 2.42 | sim | sim |
| cat_devorar~suave | sozinho (ambiente) | sim | 94 | 2.52 | sim | sim |
| cat_devorar | sozinho (ambiente) | sim | 73 | 2.25 | sim | sim |
| cat_devorar~exagerado | sozinho (ambiente) | sim | 62 | 2.37 | sim | sim |
| cat_lamberDentes~suave | sozinho (ambiente) | sim | 63 | 2.36 | sim | sim |
| cat_lamberDentes | sozinho (ambiente) | sim | 48 | 2.31 | sim | sim |
| cat_lamberDentes~exagerado | sozinho (ambiente) | sim | 41 | 2.40 | sim | sim |
| cat_rostoSujo~suave | sozinho (ambiente) | sim | 88 | 2.56 | sim | sim |
| cat_rostoSujo | sozinho (ambiente) | sim | 68 | 2.58 | sim | sim |
| cat_rostoSujo~exagerado | sozinho (ambiente) | sim | 58 | 3.86 | sim | sim |
| cat_roubarComida~suave | sozinho (ambiente) | sim | 88 | 2.55 | sim | sim |
| cat_roubarComida | sozinho (ambiente) | sim | 68 | 2.34 | sim | sim |
| cat_roubarComida~exagerado | sozinho (ambiente) | sim | 58 | 2.65 | sim | sim |
| cat_engolirTudo~suave | sozinho (ambiente) | sim | 75 | 2.26 | sim | sim |
| cat_engolirTudo | sozinho (ambiente) | sim | 58 | 2.52 | sim | sim |
| cat_engolirTudo~exagerado | sozinho (ambiente) | sim | 49 | 2.68 | sim | sim |
| cat_festaSozinho~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 113 | 2.50 | sim | sim |
| cat_festaSozinho | sozinho (ambiente), código (conversa/foco/evento) | sim | 87 | 2.37 | sim | sim |
| cat_festaSozinho~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 74 | 2.39 | sim | sim |
| cat_dancarSemRitmo~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 107 | 2.28 | sim | sim |
| cat_dancarSemRitmo | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 2.27 | sim | sim |
| cat_dancarSemRitmo~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 70 | 2.48 | sim | sim |
| cat_cantarDesafinado~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 107 | 2.51 | sim | sim |
| cat_cantarDesafinado | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 2.58 | sim | sim |
| cat_cantarDesafinado~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 70 | 2.60 | sim | sim |
| cat_karaoke~suave | sozinho (ambiente), frase | sim | 132 | 2.30 | sim | sim |
| cat_karaoke | sozinho (ambiente), frase | sim | 101 | 2.18 | sim | sim |
| cat_karaoke~exagerado | sozinho (ambiente), frase | sim | 86 | 2.36 | sim | sim |
| cat_puloOndas~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 75 | 2.41 | sim | sim |
| cat_puloOndas | sozinho (ambiente), código (conversa/foco/evento) | sim | 58 | 2.57 | sim | sim |
| cat_puloOndas~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 49 | 2.55 | sim | sim |
| cat_comerPeixinhos~suave | sozinho (ambiente) | sim | 100 | 2.39 | sim | sim |
| cat_comerPeixinhos | sozinho (ambiente) | sim | 77 | 2.35 | sim | sim |
| cat_comerPeixinhos~exagerado | sozinho (ambiente) | sim | 66 | 2.37 | sim | sim |
| cat_beberAquario~suave | sozinho (ambiente) | sim | 88 | 2.42 | sim | sim |
| cat_beberAquario | sozinho (ambiente) | sim | 68 | 2.38 | sim | sim |
| cat_beberAquario~exagerado | sozinho (ambiente) | sim | 58 | 2.42 | sim | sim |
| cat_cafeOlhando~suave | sozinho (ambiente) | sim | 100 | 2.35 | sim | sim |
| cat_cafeOlhando | sozinho (ambiente) | sim | 77 | 5.83 | sim | sim |
| cat_cafeOlhando~exagerado | sozinho (ambiente) | sim | 66 | 2.46 | sim | sim |
| cat_pedirComida~suave | sozinho (ambiente) | sim | 82 | 2.64 | sim | sim |
| cat_pedirComida | sozinho (ambiente) | sim | 63 | 3.40 | sim | sim |
| cat_pedirComida~exagerado | sozinho (ambiente) | sim | 54 | 2.90 | sim | sim |
| cat_semFiltro~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 32 | 2.26 | sim | sim |
| cat_semFiltro | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 25 | 2.24 | sim | sim |
| cat_semFiltro~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 21 | 2.22 | sim | sim |
| cat_confissao~suave | sozinho (ambiente) | sim | 94 | 2.34 | sim | sim |
| cat_confissao | sozinho (ambiente) | sim | 73 | 2.89 | sim | sim |
| cat_confissao~exagerado | sozinho (ambiente) | sim | 62 | 2.57 | sim | sim |
| cat_horaDaVerdade~suave | sozinho (ambiente), frase | sim | 94 | 2.46 | sim | sim |
| cat_horaDaVerdade | sozinho (ambiente), frase | sim | 73 | 2.46 | sim | sim |
| cat_horaDaVerdade~exagerado | sozinho (ambiente), frase | sim | 62 | 2.44 | sim | sim |
| cat_surtoCarencia~suave | sozinho (ambiente), evento | sim | 100 | 2.76 | sim | sim |
| cat_surtoCarencia | sozinho (ambiente), evento | sim | 77 | 3.03 | sim | sim |
| cat_surtoCarencia~exagerado | sozinho (ambiente), evento | sim | 66 | 3.03 | sim | sim |
| cat_dancinhaViral~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 100 | 2.37 | sim | sim |
| cat_dancinhaViral | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 77 | 2.40 | sim | sim |
| cat_dancinhaViral~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 66 | 2.36 | sim | sim |
| cat_criseRiso~suave | sozinho (ambiente) | sim | 113 | 2.62 | sim | sim |
| cat_criseRiso | sozinho (ambiente) | sim | 87 | 2.38 | sim | sim |
| cat_criseRiso~exagerado | sozinho (ambiente) | sim | 74 | 5.15 | sim | sim |
| cat_modoFera~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 113 | 2.71 | sim | sim |
| cat_modoFera | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 87 | 2.55 | sim | sim |
| cat_modoFera~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 74 | 2.49 | sim | sim |
| cat_fantasma~suave | sozinho (ambiente) | sim | 156 | 2.35 | sim | sim |
| cat_fantasma | sozinho (ambiente) | sim | 120 | 2.11 | sim | sim |
| cat_fantasma~exagerado | sozinho (ambiente) | sim | 103 | 2.01 | sim | sim |
| cat_nadoSincronizado~suave | sozinho (ambiente) | sim | 125 | 4.22 | sim | sim |
| cat_nadoSincronizado | sozinho (ambiente) | sim | 97 | 2.54 | sim | sim |
| cat_nadoSincronizado~exagerado | sozinho (ambiente) | sim | 82 | 2.34 | sim | sim |
| cat_acordarAssustado~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 2.39 | sim | sim |
| cat_acordarAssustado | sozinho (ambiente), código (conversa/foco/evento) | sim | 63 | 2.30 | sim | sim |
| cat_acordarAssustado~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 54 | 2.30 | sim | sim |
| cat_cochilarBoiando~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 156 | 2.55 | sim | sim |
| cat_cochilarBoiando | sozinho (ambiente), código (conversa/foco/evento) | sim | 120 | 2.77 | sim | sim |
| cat_cochilarBoiando~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 103 | 4.98 | sim | sim |
| cat_dormirRonco~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 175 | 2.73 | sim | sim |
| cat_dormirRonco | sozinho (ambiente), código (conversa/foco/evento) | sim | 135 | 2.71 | sim | sim |
| cat_dormirRonco~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 115 | 2.57 | sim | sim |
| cat_madrugada~suave | sozinho (ambiente) | sim | 150 | 2.09 | sim | sim |
| cat_madrugada | sozinho (ambiente) | sim | 116 | 4.79 | sim | sim |
| cat_madrugada~exagerado | sozinho (ambiente) | sim | 98 | 16.13 | sim | sim |
| cat_ajeitarPostura~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 63 | 2.75 | sim | sim |
| cat_ajeitarPostura | sozinho (ambiente), código (conversa/foco/evento) | sim | 48 | 3.09 | sim | sim |
| cat_ajeitarPostura~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 41 | 2.73 | sim | sim |
| cat_nadarCirculos~suave | sozinho (ambiente) | sim | 144 | 2.42 | sim | sim |
| cat_nadarCirculos | sozinho (ambiente) | sim | 111 | 2.36 | sim | sim |
| cat_nadarCirculos~exagerado | sozinho (ambiente) | sim | 94 | 2.14 | sim | sim |
| cat_nadarCanto~suave | sozinho (ambiente) | sim | 113 | 2.30 | sim | sim |
| cat_nadarCanto | sozinho (ambiente) | sim | 87 | 2.43 | sim | sim |
| cat_nadarCanto~exagerado | sozinho (ambiente) | sim | 74 | 5.21 | sim | sim |
| cat_elogioSilencio~suave | sozinho (ambiente) | sim | 75 | 2.39 | sim | sim |
| cat_elogioSilencio | sozinho (ambiente) | sim | 58 | 2.23 | sim | sim |
| cat_elogioSilencio~exagerado | sozinho (ambiente) | sim | 49 | 2.49 | sim | sim |
| cat_motivacaoAcademia~suave | sozinho (ambiente) | sim | 82 | 2.43 | sim | sim |
| cat_motivacaoAcademia | sozinho (ambiente) | sim | 63 | 2.30 | sim | sim |
| cat_motivacaoAcademia~exagerado | sozinho (ambiente) | sim | 54 | 2.15 | sim | sim |
| cat_torcer~suave | sozinho (ambiente) | sim | 75 | 2.23 | sim | sim |
| cat_torcer | sozinho (ambiente) | sim | 58 | 2.32 | sim | sim |
| cat_torcer~exagerado | sozinho (ambiente) | sim | 49 | 2.40 | sim | sim |
| cat_nojo~suave | código (conversa/foco/evento) | sim | 100 | 2.10 | sim | sim |
| cat_nojo | código (conversa/foco/evento) | sim | 77 | 2.44 | sim | sim |
| cat_nojo~exagerado | código (conversa/foco/evento) | sim | 66 | 2.47 | sim | sim |
| cat_tesouro~suave | sozinho (ambiente) | sim | 94 | 2.30 | sim | sim |
| cat_tesouro | sozinho (ambiente) | sim | 73 | 2.28 | sim | sim |
| cat_tesouro~exagerado | sozinho (ambiente) | sim | 62 | 2.14 | sim | sim |
| cat_ritmo~suave | frase, código (conversa/foco/evento) | sim | 125 | 2.33 | sim | sim |
| cat_ritmo | frase, código (conversa/foco/evento) | sim | 97 | 2.49 | sim | sim |
| cat_ritmo~exagerado | frase, código (conversa/foco/evento) | sim | 82 | 2.36 | sim | sim |
| cat_calma~suave | frase, código (conversa/foco/evento) | sim | 188 | 2.35 | sim | sim |
| cat_calma | frase, código (conversa/foco/evento) | sim | 144 | 2.58 | sim | sim |
| cat_calma~exagerado | frase, código (conversa/foco/evento) | sim | 123 | 2.01 | sim | sim |
| cat_fidget~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 29 | 2.18 | sim | sim |
| cat_fidget | sozinho (ambiente), código (conversa/foco/evento) | sim | 22 | 2.03 | sim | sim |
| cat_fidget~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 19 | 1.95 | sim | sim |
| cat_estudarJunto~suave | código (conversa/foco/evento) | sim | 188 | 2.17 | sim | sim |
| cat_estudarJunto | código (conversa/foco/evento) | sim | 144 | 3.46 | sim | sim |
| cat_estudarJunto~exagerado | código (conversa/foco/evento) | sim | 123 | 2.50 | sim | sim |
| cat_treinarJunto~suave | código (conversa/foco/evento) | sim | 125 | 2.75 | sim | sim |
| cat_treinarJunto | código (conversa/foco/evento) | sim | 97 | 2.67 | sim | sim |
| cat_treinarJunto~exagerado | código (conversa/foco/evento) | sim | 82 | 2.77 | sim | sim |
| cat_pk_sideEye~suave | pacote memes, sozinho (ambiente), frase, evento | sim | 132 | 2.77 | sim | sim |
| cat_pk_sideEye | pacote memes, sozinho (ambiente), frase, evento | sim | 101 | 2.50 | sim | sim |
| cat_pk_sideEye~exagerado | pacote memes, sozinho (ambiente), frase, evento | sim | 86 | 2.31 | sim | sim |
| cat_pk_chillGuy~suave | pacote memes, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 175 | 2.41 | sim | sim |
| cat_pk_chillGuy | pacote memes, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 135 | 2.23 | sim | sim |
| cat_pk_chillGuy~exagerado | pacote memes, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 115 | 2.28 | sim | sim |
| cat_pk_auraFarming~suave | pacote memes, frase, evento | sim | 203 | 2.49 | sim | sim |
| cat_pk_auraFarming | pacote memes, frase, evento | sim | 156 | 3.86 | sim | sim |
| cat_pk_auraFarming~exagerado | pacote memes, frase, evento | sim | 133 | 2.42 | sim | sim |
| cat_pk_letHimCook~suave | pacote memes, frase, evento, código (conversa/foco/evento) | sim | 156 | 2.57 | sim | sim |
| cat_pk_letHimCook | pacote memes, frase, evento, código (conversa/foco/evento) | sim | 120 | 2.37 | sim | sim |
| cat_pk_letHimCook~exagerado | pacote memes, frase, evento, código (conversa/foco/evento) | sim | 103 | 2.29 | sim | sim |
| cat_pk_broCooked~suave | pacote memes, frase, evento | sim | 150 | 2.34 | sim | sim |
| cat_pk_broCooked | pacote memes, frase, evento | sim | 116 | 2.29 | sim | sim |
| cat_pk_broCooked~exagerado | pacote memes, frase, evento | sim | 98 | 2.59 | sim | sim |
| cat_pk_sixSeven~suave | pacote memes, frase, evento | sim | 100 | 2.42 | sim | sim |
| cat_pk_sixSeven | pacote memes, frase, evento | sim | 77 | 2.36 | sim | sim |
| cat_pk_sixSeven~exagerado | pacote memes, frase, evento | sim | 66 | 2.34 | sim | sim |
| cat_pk_brainrot~suave | pacote memes, sozinho (ambiente), frase, evento | sim | 213 | 2.79 | sim | sim |
| cat_pk_brainrot | pacote memes, sozinho (ambiente), frase, evento | sim | 164 | 2.88 | sim | sim |
| cat_pk_brainrot~exagerado | pacote memes, sozinho (ambiente), frase, evento | sim | 139 | 2.55 | sim | sim |
| cat_pk_npc~suave | pacote memes, sozinho (ambiente), frase, evento | sim | 219 | 2.74 | sim | sim |
| cat_pk_npc | pacote memes, sozinho (ambiente), frase, evento | sim | 168 | 3.75 | sim | sim |
| cat_pk_npc~exagerado | pacote memes, sozinho (ambiente), frase, evento | sim | 143 | 2.91 | sim | sim |
| cat_pk_demure~suave | pacote memes, sozinho (ambiente), frase, evento | sim | 156 | 2.47 | sim | sim |
| cat_pk_demure | pacote memes, sozinho (ambiente), frase, evento | sim | 120 | 2.41 | sim | sim |
| cat_pk_demure~exagerado | pacote memes, sozinho (ambiente), frase, evento | sim | 103 | 2.76 | sim | sim |
| cat_pk_gta6~suave | pacote memes, frase, evento | sim | 172 | 2.70 | sim | sim |
| cat_pk_gta6 | pacote memes, frase, evento | sim | 132 | 2.69 | sim | sim |
| cat_pk_gta6~exagerado | pacote memes, frase, evento | sim | 113 | 2.58 | sim | sim |
| cat_pk_menacing~suave | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 203 | 2.57 | sim | sim |
| cat_pk_menacing | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 156 | 2.44 | sim | sim |
| cat_pk_menacing~exagerado | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 133 | 4.08 | sim | sim |
| cat_pk_ultraInstinto~suave | pacote anime, sozinho (ambiente), frase, evento | sim | 250 | 2.49 | sim | sim |
| cat_pk_ultraInstinto | pacote anime, sozinho (ambiente), frase, evento | sim | 192 | 2.37 | sim | sim |
| cat_pk_ultraInstinto~exagerado | pacote anime, sozinho (ambiente), frase, evento | sim | 164 | 2.19 | sim | sim |
| cat_pk_berserker~suave | pacote anime, frase, evento | sim | 297 | 3.25 | sim | sim |
| cat_pk_berserker | pacote anime, frase, evento | sim | 228 | 2.52 | sim | sim |
| cat_pk_berserker~exagerado | pacote anime, frase, evento | sim | 194 | 2.53 | sim | sim |
| cat_pk_dominio~suave | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 266 | 3.17 | sim | sim |
| cat_pk_dominio | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 204 | 2.61 | sim | sim |
| cat_pk_dominio~exagerado | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 174 | 2.53 | sim | sim |
| cat_pk_sharingan~suave | pacote anime, sozinho (ambiente), frase, evento | sim | 172 | 3.97 | sim | sim |
| cat_pk_sharingan | pacote anime, sozinho (ambiente), frase, evento | sim | 132 | 2.64 | sim | sim |
| cat_pk_sharingan~exagerado | pacote anime, sozinho (ambiente), frase, evento | sim | 113 | 2.71 | sim | sim |
| cat_pk_haki~suave | pacote anime, sozinho (ambiente), frase, evento | sim | 234 | 2.16 | sim | sim |
| cat_pk_haki | pacote anime, sozinho (ambiente), frase, evento | sim | 180 | 2.24 | sim | sim |
| cat_pk_haki~exagerado | pacote anime, sozinho (ambiente), frase, evento | sim | 153 | 3.58 | sim | sim |
| cat_pk_bankai~suave | pacote anime, sozinho (ambiente), frase, evento | sim | 250 | 2.54 | sim | sim |
| cat_pk_bankai | pacote anime, sozinho (ambiente), frase, evento | sim | 192 | 2.43 | sim | sim |
| cat_pk_bankai~exagerado | pacote anime, sozinho (ambiente), frase, evento | sim | 164 | 2.31 | sim | sim |
| cat_pk_serio~suave | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 156 | 3.99 | sim | sim |
| cat_pk_serio | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 120 | 2.41 | sim | sim |
| cat_pk_serio~exagerado | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 103 | 2.50 | sim | sim |
| cat_pk_rumbling~suave | pacote anime, frase, evento | sim | 281 | 2.30 | sim | sim |
| cat_pk_rumbling | pacote anime, frase, evento | sim | 216 | 3.55 | sim | sim |
| cat_pk_rumbling~exagerado | pacote anime, frase, evento | sim | 184 | 2.47 | sim | sim |
| cat_pk_arise~suave | pacote anime, sozinho (ambiente), frase, evento | sim | 250 | 2.38 | sim | sim |
| cat_pk_arise | pacote anime, sozinho (ambiente), frase, evento | sim | 192 | 3.29 | sim | sim |
| cat_pk_arise~exagerado | pacote anime, sozinho (ambiente), frase, evento | sim | 164 | 2.57 | sim | sim |
| cat_pk_traicao~suave | pacote comida | sim | 266 | 2.40 | sim | sim |
| cat_pk_traicao | pacote comida | sim | 204 | 2.19 | sim | sim |
| cat_pk_traicao~exagerado | pacote comida | sim | 174 | 2.44 | sim | sim |
| cat_pk_traicao_leve~suave | pacote comida | sim | 266 | 2.44 | sim | sim |
| cat_pk_traicao_leve | pacote comida | sim | 204 | 2.27 | sim | sim |
| cat_pk_traicao_leve~exagerado | pacote comida | sim | 174 | 2.31 | sim | sim |
| cat_pk_nuclear~suave | pacote comida | sim | 313 | 3.27 | sim | sim |
| cat_pk_nuclear | pacote comida | sim | 241 | 2.41 | sim | sim |
| cat_pk_nuclear~exagerado | pacote comida | sim | 204 | 3.36 | sim | sim |
| cat_pk_nuclear_leve~suave | pacote comida | sim | 313 | 2.43 | sim | sim |
| cat_pk_nuclear_leve | pacote comida | sim | 241 | 2.44 | sim | sim |
| cat_pk_nuclear_leve~exagerado | pacote comida | sim | 204 | 3.52 | sim | sim |
| cat_pk_furiaFritas~suave | pacote comida | sim | 313 | 2.66 | sim | sim |
| cat_pk_furiaFritas | pacote comida | sim | 241 | 2.38 | sim | sim |
| cat_pk_furiaFritas~exagerado | pacote comida | sim | 204 | 2.37 | sim | sim |
| cat_pk_furiaFritas_leve~suave | pacote comida | sim | 313 | 2.39 | sim | sim |
| cat_pk_furiaFritas_leve | pacote comida | sim | 241 | 2.43 | sim | sim |
| cat_pk_furiaFritas_leve~exagerado | pacote comida | sim | 204 | 3.14 | sim | sim |
| cat_pk_decepcao~suave | pacote comida | sim | 234 | 2.40 | sim | sim |
| cat_pk_decepcao | pacote comida | sim | 180 | 2.33 | sim | sim |
| cat_pk_decepcao~exagerado | pacote comida | sim | 153 | 2.49 | sim | sim |
| cat_pk_decepcao_leve~suave | pacote comida | sim | 234 | 2.59 | sim | sim |
| cat_pk_decepcao_leve | pacote comida | sim | 180 | 2.49 | sim | sim |
| cat_pk_decepcao_leve~exagerado | pacote comida | sim | 153 | 2.28 | sim | sim |
| cat_pk_semDesculpas~suave | pacote comida | sim | 297 | 2.66 | sim | sim |
| cat_pk_semDesculpas | pacote comida | sim | 228 | 3.66 | sim | sim |
| cat_pk_semDesculpas~exagerado | pacote comida | sim | 194 | 2.71 | sim | sim |
| cat_pk_semDesculpas_leve~suave | pacote comida | sim | 297 | 2.22 | sim | sim |
| cat_pk_semDesculpas_leve | pacote comida | sim | 228 | 3.59 | sim | sim |
| cat_pk_semDesculpas_leve~exagerado | pacote comida | sim | 194 | 2.39 | sim | sim |
| cat_pk_milAnos~suave | pacote comida | sim | 219 | 2.44 | sim | sim |
| cat_pk_milAnos | pacote comida | sim | 168 | 2.38 | sim | sim |
| cat_pk_milAnos~exagerado | pacote comida | sim | 143 | 4.47 | sim | sim |
| cat_pk_milAnos_leve~suave | pacote comida | sim | 219 | 2.54 | sim | sim |
| cat_pk_milAnos_leve | pacote comida | sim | 168 | 2.57 | sim | sim |
| cat_pk_milAnos_leve~exagerado | pacote comida | sim | 143 | 2.52 | sim | sim |
| cat_pk_chefeFinal~suave | pacote comida | sim | 344 | 3.05 | sim | sim |
| cat_pk_chefeFinal | pacote comida | sim | 265 | 2.51 | sim | sim |
| cat_pk_chefeFinal~exagerado | pacote comida | sim | 225 | 2.49 | sim | sim |
| cat_pk_chefeFinal_leve~suave | pacote comida | sim | 344 | 2.73 | sim | sim |
| cat_pk_chefeFinal_leve | pacote comida | sim | 265 | 2.31 | sim | sim |
| cat_pk_chefeFinal_leve~exagerado | pacote comida | sim | 225 | 2.29 | sim | sim |
| cat_pk_crise~suave | pacote comida | sim | 266 | 2.87 | sim | sim |
| cat_pk_crise | pacote comida | sim | 204 | 2.40 | sim | sim |
| cat_pk_crise~exagerado | pacote comida | sim | 174 | 2.54 | sim | sim |
| cat_pk_crise_leve~suave | pacote comida | sim | 266 | 3.04 | sim | sim |
| cat_pk_crise_leve | pacote comida | sim | 204 | 2.30 | sim | sim |
| cat_pk_crise_leve~exagerado | pacote comida | sim | 174 | 2.27 | sim | sim |
| cat_pk_interrogatorio~suave | pacote comida | sim | 266 | 2.50 | sim | sim |
| cat_pk_interrogatorio | pacote comida | sim | 204 | 2.45 | sim | sim |
| cat_pk_interrogatorio~exagerado | pacote comida | sim | 174 | 2.51 | sim | sim |
| cat_pk_interrogatorio_leve~suave | pacote comida | sim | 266 | 2.55 | sim | sim |
| cat_pk_interrogatorio_leve | pacote comida | sim | 204 | 2.46 | sim | sim |
| cat_pk_interrogatorio_leve~exagerado | pacote comida | sim | 174 | 4.25 | sim | sim |
| cat_pk_colapso~suave | pacote comida | sim | 406 | 2.52 | sim | sim |
| cat_pk_colapso | pacote comida | sim | 313 | 3.24 | sim | sim |
| cat_pk_colapso~exagerado | pacote comida | sim | 266 | 2.50 | sim | sim |
| cat_pk_colapso_leve~suave | pacote comida | sim | 406 | 2.99 | sim | sim |
| cat_pk_colapso_leve | pacote comida | sim | 313 | 2.58 | sim | sim |
| cat_pk_colapso_leve~exagerado | pacote comida | sim | 266 | 2.37 | sim | sim |
| cat_pk_operacao~suave | pacote namorado | sim | 281 | 2.44 | sim | sim |
| cat_pk_operacao | pacote namorado | sim | 216 | 2.45 | sim | sim |
| cat_pk_operacao~exagerado | pacote namorado | sim | 184 | 2.36 | sim | sim |
| cat_pk_libido~suave | pacote namorado | sim | 297 | 3.35 | sim | sim |
| cat_pk_libido | pacote namorado | sim | 228 | 2.54 | sim | sim |
| cat_pk_libido~exagerado | pacote namorado | sim | 194 | 2.39 | sim | sim |
| cat_pk_inseminacao~suave | pacote namorado | sim | 313 | 2.58 | sim | sim |
| cat_pk_inseminacao | pacote namorado | sim | 241 | 3.01 | sim | sim |
| cat_pk_inseminacao~exagerado | pacote namorado | sim | 204 | 2.47 | sim | sim |
| cat_pk_namoradoPerigo~suave | pacote namorado | sim | 266 | 3.56 | sim | sim |
| cat_pk_namoradoPerigo | pacote namorado | sim | 204 | 2.58 | sim | sim |
| cat_pk_namoradoPerigo~exagerado | pacote namorado | sim | 174 | 2.53 | sim | sim |
| cat_pk_quarto~suave | pacote namorado | sim | 313 | 3.12 | sim | sim |
| cat_pk_quarto | pacote namorado | sim | 241 | 2.52 | sim | sim |
| cat_pk_quarto~exagerado | pacote namorado | sim | 204 | 2.34 | sim | sim |
| cat_pk_checklist~suave | pacote namorado | sim | 250 | 3.15 | sim | sim |
| cat_pk_checklist | pacote namorado | sim | 192 | 2.81 | sim | sim |
| cat_pk_checklist~exagerado | pacote namorado | sim | 164 | 2.77 | sim | sim |
| cat_pk_ciumes~suave | pacote namorado | sim | 281 | 2.67 | sim | sim |
| cat_pk_ciumes | pacote namorado | sim | 216 | 3.22 | sim | sim |
| cat_pk_ciumes~exagerado | pacote namorado | sim | 184 | 2.29 | sim | sim |
| cat_pk_noitePromete~suave | pacote namorado | sim | 297 | 2.29 | sim | sim |
| cat_pk_noitePromete | pacote namorado | sim | 228 | 3.71 | sim | sim |
| cat_pk_noitePromete~exagerado | pacote namorado | sim | 194 | 2.55 | sim | sim |
| cat_pk_relatorio~suave | pacote namorado | sim | 281 | 2.35 | sim | sim |
| cat_pk_relatorio | pacote namorado | sim | 216 | 2.44 | sim | sim |
| cat_pk_relatorio~exagerado | pacote namorado | sim | 184 | 3.81 | sim | sim |
| cat_pk_mudanca~suave | pacote namorado | sim | 406 | 2.49 | sim | sim |
| cat_pk_mudanca | pacote namorado | sim | 313 | 3.68 | sim | sim |
| cat_pk_mudanca~exagerado | pacote namorado | sim | 266 | 2.47 | sim | sim |
| cat_pk_jMencao~suave | pacote joao, código (conversa/foco/evento) | sim | 188 | 2.27 | sim | sim |
| cat_pk_jMencao | pacote joao, código (conversa/foco/evento) | sim | 144 | 4.22 | sim | sim |
| cat_pk_jMencao~exagerado | pacote joao, código (conversa/foco/evento) | sim | 123 | 2.31 | sim | sim |
| cat_pk_jMensagem~suave | pacote joao | sim | 203 | 2.39 | sim | sim |
| cat_pk_jMensagem | pacote joao | sim | 156 | 2.61 | sim | sim |
| cat_pk_jMensagem~exagerado | pacote joao | sim | 133 | 2.24 | sim | sim |
| cat_pk_jPeregrinacao~suave | pacote joao | sim | 281 | 3.21 | sim | sim |
| cat_pk_jPeregrinacao | pacote joao | sim | 216 | 2.57 | sim | sim |
| cat_pk_jPeregrinacao~exagerado | pacote joao | sim | 184 | 2.61 | sim | sim |
| cat_pk_jSaudade~suave | pacote joao | sim | 203 | 3.66 | sim | sim |
| cat_pk_jSaudade | pacote joao | sim | 156 | 2.50 | sim | sim |
| cat_pk_jSaudade~exagerado | pacote joao | sim | 133 | 2.18 | sim | sim |
| cat_pk_jChegando~suave | pacote joao | sim | 234 | 2.48 | sim | sim |
| cat_pk_jChegando | pacote joao | sim | 180 | 2.56 | sim | sim |
| cat_pk_jChegando~exagerado | pacote joao | sim | 153 | 2.72 | sim | sim |
| cat_pk_jDevocao~suave | pacote joao | sim | 266 | 2.56 | sim | sim |
| cat_pk_jDevocao | pacote joao | sim | 204 | 2.52 | sim | sim |
| cat_pk_jDevocao~exagerado | pacote joao | sim | 174 | 3.95 | sim | sim |
| cat_pk_jJulgamento~suave | pacote joao | sim | 234 | 2.28 | sim | sim |
| cat_pk_jJulgamento | pacote joao | sim | 180 | 2.08 | sim | sim |
| cat_pk_jJulgamento~exagerado | pacote joao | sim | 153 | 2.23 | sim | sim |
| cat_pk_jElogio~suave | pacote joao | sim | 219 | 3.60 | sim | sim |
| cat_pk_jElogio | pacote joao | sim | 168 | 2.31 | sim | sim |
| cat_pk_jElogio~exagerado | pacote joao | sim | 143 | 2.49 | sim | sim |
| cat_pk_jHeresia~suave | pacote joao | sim | 219 | 2.46 | sim | sim |
| cat_pk_jHeresia | pacote joao | sim | 168 | 3.56 | sim | sim |
| cat_pk_jHeresia~exagerado | pacote joao | sim | 143 | 2.63 | sim | sim |
| cat_pk_jApoteose~suave | pacote joao | sim | 406 | 2.43 | sim | sim |
| cat_pk_jApoteose | pacote joao | sim | 313 | 3.12 | sim | sim |
| cat_pk_jApoteose~exagerado | pacote joao | sim | 266 | 2.53 | sim | sim |
