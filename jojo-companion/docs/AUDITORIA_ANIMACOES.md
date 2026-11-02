# Auditoria das animações e reações

Gerado por `scripts/auditoria-animacoes.mjs` em 2026-11-02 (Windows 10.0.26100, Electron 44.9.3, renderer real, amostragem a 24 qps).
Todos os números abaixo foram medidos nesta execução; nada é estimado.

## Resumo

| Item | Resultado |
|---|---|
| Animações auditadas (feitas à mão + catálogo × intensidades + pacotes) | 1268 |
| Tocaram do início ao fim sem erro | 1268 |
| Com erro | 0 |
| Passam do espaço reservado (seriam cortadas) | 0 |
| Não se mexem (quadro parado) | 0 |
| Só alcançáveis por /anim (sem gatilho natural) | 0 |
| Tempo médio de desenho por quadro | 0.46 ms (orçamento a 30 qps: 33 ms) |

## Mais pesadas (tempo médio de desenho por quadro)

| Animação | Média (ms) | Máx. (ms) |
|---|---|---|
| standUp | 1.86 | 13.90 |
| cat_ajeitarPostura~exagerado | 1.66 | 32.30 |
| cat_devorar~exagerado | 1.58 | 32.30 |
| cat_puxarCursor~exagerado | 1.52 | 33.50 |
| cat_horaDaVerdade~exagerado | 1.44 | 32.10 |
| cat_selfie~suave | 1.35 | 41.30 |
| cat_fugirBolhas~exagerado | 1.26 | 28.20 |
| cat_olharRelogio~exagerado | 1.16 | 33.60 |
| cat_beberShake | 1.16 | 19.10 |
| cat_solucar | 1.11 | 29.10 |

## Matriz completa

| Animação | Gatilho | Toca | Quadros | Média (ms) | Cabe | Se mexe |
|---|---|---|---|---|---|---|
| idle | estado/código | sim | 73 | 0.42 | sim | sim |
| interactIdle | estado/código | sim | 22 | 0.43 | sim | sim |
| lookAround | estado/código | sim | 63 | 0.42 | sim | sim |
| curious | estado/código | sim | 53 | 0.49 | sim | sim |
| surprised | estado/código | sim | 22 | 0.61 | sim | sim |
| walk | estado/código | sim | 12 | 0.43 | sim | sim |
| run | estado/código | sim | 8 | 0.53 | sim | sim |
| sitDown | estado/código | sim | 10 | 0.44 | sim | sim |
| sit | estado/código | sim | 73 | 0.41 | sim | sim |
| standUp | estado/código | sim | 10 | 1.86 | sim | sim |
| lieDown | estado/código | sim | 15 | 0.39 | sim | sim |
| lie | estado/código | sim | 73 | 0.42 | sim | sim |
| fallAsleep | estado/código | sim | 34 | 0.41 | sim | sim |
| meditate | estado/código | sim | 144 | 0.36 | sim | sim |
| sleep | estado/código | sim | 73 | 0.63 | sim | sim |
| wake | estado/código | sim | 36 | 0.44 | sim | sim |
| talk | estado/código | sim | 15 | 0.33 | sim | sim |
| happy | estado/código | sim | 39 | 0.38 | sim | sim |
| petted | estado/código | sim | 53 | 0.39 | sim | sim |
| eat | estado/código | sim | 68 | 0.33 | sim | sim |
| play | estado/código | sim | 82 | 0.30 | sim | sim |
| dragged | estado/código | sim | 17 | 0.96 | sim | sim |
| land | estado/código | sim | 15 | 0.29 | sim | sim |
| appear | estado/código | sim | 32 | 0.32 | sim | sim |
| goodbye | estado/código | sim | 34 | 0.31 | sim | sim |
| hide | estado/código | sim | 48 | 0.41 | sim | sim |
| hidden | estado/código | sim | 25 | 0.54 | sim | sim |
| judge | estado/código | sim | 77 | 0.35 | sim | sim |
| scare | estado/código | sim | 36 | 0.35 | sim | sim |
| wave | estado/código | sim | 39 | 0.36 | sim | sim |
| nod | estado/código | sim | 25 | 0.47 | sim | sim |
| lecture | estado/código | sim | 63 | 0.35 | sim | sim |
| comfort | estado/código | sim | 109 | 0.50 | sim | sim |
| angry | estado/código | sim | 58 | 0.44 | sim | sim |
| sad | estado/código | sim | 77 | 0.34 | sim | sim |
| idle_flex | variação de idle | sim | 73 | 0.33 | sim | sim |
| idle_crack | variação de idle | sim | 73 | 0.29 | sim | sim |
| idle_tap | variação de idle | sim | 73 | 0.47 | sim | sim |
| interactIdle_cross | variação de interactIdle | sim | 22 | 0.29 | sim | sim |
| interactIdle_bounce | variação de interactIdle | sim | 22 | 0.29 | sim | sim |
| walk_swagger | variação de walk | sim | 12 | 0.31 | sim | sim |
| walk_stomp | variação de walk | sim | 12 | 0.34 | sim | sim |
| walk_march | variação de walk | sim | 12 | 0.29 | sim | sim |
| run_arms | variação de run | sim | 8 | 0.31 | sim | sim |
| run_panic | variação de run | sim | 8 | 0.39 | sim | sim |
| talk_point | variação de talk | sim | 15 | 1.04 | sim | sim |
| talk_shrug | variação de talk | sim | 15 | 0.29 | sim | sim |
| talk_fist | variação de talk | sim | 15 | 0.30 | sim | sim |
| lookAround_up | variação de lookAround | sim | 63 | 0.31 | sim | sim |
| lookAround_behind | variação de lookAround | sim | 63 | 0.37 | sim | sim |
| curious_lean | variação de curious | sim | 53 | 0.47 | sim | sim |
| curious_squint | variação de curious | sim | 53 | 0.30 | sim | sim |
| sit_flex | variação de sit | sim | 73 | 0.32 | sim | sim |
| sit_sway | variação de sit | sim | 73 | 0.30 | sim | sim |
| lie_tail | variação de lie | sim | 73 | 0.38 | sim | sim |
| sleep_snore | variação de sleep | sim | 73 | 0.38 | sim | sim |
| sleep_twitch | variação de sleep | sim | 73 | 0.39 | sim | sim |
| happy_jump | variação de happy | sim | 39 | 0.39 | sim | sim |
| happy_fist | variação de happy | sim | 39 | 0.34 | sim | sim |
| happy_dance | variação de happy | sim | 39 | 0.37 | sim | sim |
| judge_glare | variação de judge | sim | 77 | 0.61 | sim | sim |
| judge_tap | variação de judge | sim | 77 | 0.34 | sim | sim |
| judge_headshake | variação de judge | sim | 77 | 0.49 | sim | sim |
| lecture_both | variação de lecture | sim | 63 | 0.37 | sim | sim |
| lecture_slam | variação de lecture | sim | 63 | 0.36 | sim | sim |
| lecture_point | variação de lecture | sim | 63 | 0.46 | sim | sim |
| wave_salute | variação de wave | sim | 39 | 0.34 | sim | sim |
| wave_both | variação de wave | sim | 39 | 0.30 | sim | sim |
| nod_double | variação de nod | sim | 25 | 0.30 | sim | sim |
| nod_thumb | variação de nod | sim | 25 | 0.70 | sim | sim |
| comfort_hug | variação de comfort | sim | 109 | 0.32 | sim | sim |
| comfort_bow | variação de comfort | sim | 109 | 0.32 | sim | sim |
| petted_shy | variação de petted | sim | 53 | 0.33 | sim | sim |
| petted_wiggle | variação de petted | sim | 53 | 0.53 | sim | sim |
| eat_gulp | variação de eat | sim | 68 | 0.30 | sim | sim |
| play_kick | variação de play | sim | 82 | 0.30 | sim | sim |
| scare_roar | variação de scare | sim | 36 | 0.80 | sim | sim |
| surprised_jump | variação de surprised | sim | 22 | 0.35 | sim | sim |
| dragged_flail | variação de dragged | sim | 17 | 0.32 | sim | sim |
| land_pose | variação de land | sim | 15 | 0.33 | sim | sim |
| wake_stretch | variação de wake | sim | 36 | 0.32 | sim | sim |
| angry_steam | variação de angry | sim | 58 | 0.64 | sim | sim |
| angry_stomp | variação de angry | sim | 58 | 0.36 | sim | sim |
| sad_sigh | variação de sad | sim | 77 | 0.31 | sim | sim |
| sad_slump | variação de sad | sim | 77 | 0.48 | sim | sim |
| angry_fists | variação de angry | sim | 58 | 0.33 | sim | sim |
| benchPress | estado/código | sim | 125 | 0.28 | sim | sim |
| benchPress_grunt | variação de benchPress | sim | 125 | 0.43 | sim | sim |
| squat | estado/código | sim | 106 | 0.36 | sim | sim |
| squat_deep | variação de squat | sim | 106 | 0.49 | sim | sim |
| snort | estado/código | sim | 101 | 0.48 | sim | sim |
| chug | estado/código | sim | 101 | 0.33 | sim | sim |
| sitWired | estado/código | sim | 29 | 0.32 | sim | sim |
| idle_wired | variação de idle | sim | 73 | 0.38 | sim | sim |
| idle_wired_pace | variação de idle | sim | 73 | 0.33 | sim | sim |
| walk_wired | variação de walk | sim | 9 | 0.33 | sim | sim |
| talk_wired | variação de talk | sim | 15 | 0.43 | sim | sim |
| interactIdle_wired | variação de interactIdle | sim | 22 | 0.34 | sim | sim |
| lookAround_wired | variação de lookAround | sim | 63 | 0.37 | sim | sim |
| curious_wired | variação de curious | sim | 53 | 0.32 | sim | sim |
| happy_wired | variação de happy | sim | 39 | 0.74 | sim | sim |
| moon | estado/código | sim | 178 | 0.21 | sim | sim |
| smitten | estado/código | sim | 144 | 0.36 | sim | sim |
| poop | estado/código | sim | 168 | 0.45 | sim | sim |
| finger | estado/código | sim | 63 | 0.38 | sim | sim |
| avcStrain | estado/código | sim | 85 | 0.34 | sim | sim |
| avcClutch | estado/código | sim | 39 | 0.75 | sim | sim |
| avcFall | estado/código | sim | 22 | 0.35 | sim | sim |
| avcDead | estado/código | sim | 1441 | 0.39 | sim | sim |
| avcRevive | estado/código | sim | 44 | 0.30 | sim | sim |
| cat_piscar~suave | sozinho (ambiente) | sim | 38 | 0.28 | sim | sim |
| cat_piscar | sozinho (ambiente) | sim | 29 | 0.50 | sim | sim |
| cat_piscar~exagerado | sozinho (ambiente) | sim | 25 | 0.31 | sim | sim |
| cat_piscarLento~suave | sozinho (ambiente) | sim | 57 | 0.33 | sim | sim |
| cat_piscarLento | sozinho (ambiente) | sim | 44 | 0.29 | sim | sim |
| cat_piscarLento~exagerado | sozinho (ambiente) | sim | 37 | 0.33 | sim | sim |
| cat_bocejar~suave | sozinho (ambiente) | sim | 88 | 0.32 | sim | sim |
| cat_bocejar | sozinho (ambiente) | sim | 68 | 0.31 | sim | sim |
| cat_bocejar~exagerado | sozinho (ambiente) | sim | 58 | 0.39 | sim | sim |
| cat_cochilar~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 163 | 0.38 | sim | sim |
| cat_cochilar | sozinho (ambiente), código (conversa/foco/evento) | sim | 125 | 0.58 | sim | sim |
| cat_cochilar~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 107 | 0.34 | sim | sim |
| cat_espreguicar~suave | sozinho (ambiente) | sim | 94 | 0.35 | sim | sim |
| cat_espreguicar | sozinho (ambiente) | sim | 73 | 0.35 | sim | sim |
| cat_espreguicar~exagerado | sozinho (ambiente) | sim | 62 | 0.52 | sim | sim |
| cat_balancar~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 125 | 0.34 | sim | sim |
| cat_balancar | sozinho (ambiente), código (conversa/foco/evento) | sim | 97 | 0.36 | sim | sim |
| cat_balancar~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 0.35 | sim | sim |
| cat_flutuar~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 125 | 0.52 | sim | sim |
| cat_flutuar | sozinho (ambiente), código (conversa/foco/evento) | sim | 97 | 0.29 | sim | sim |
| cat_flutuar~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 0.32 | sim | sim |
| cat_caudaDevagar~suave | sozinho (ambiente) | sim | 125 | 0.37 | sim | sim |
| cat_caudaDevagar | sozinho (ambiente) | sim | 97 | 0.31 | sim | sim |
| cat_caudaDevagar~exagerado | sozinho (ambiente) | sim | 82 | 0.29 | sim | sim |
| cat_guelras~suave | sozinho (ambiente) | sim | 94 | 0.30 | sim | sim |
| cat_guelras | sozinho (ambiente) | sim | 73 | 0.58 | sim | sim |
| cat_guelras~exagerado | sozinho (ambiente) | sim | 62 | 0.30 | sim | sim |
| cat_giroLeve~suave | sozinho (ambiente) | sim | 94 | 0.32 | sim | sim |
| cat_giroLeve | sozinho (ambiente) | sim | 73 | 0.27 | sim | sim |
| cat_giroLeve~exagerado | sozinho (ambiente) | sim | 62 | 0.33 | sim | sim |
| cat_bolhas~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 94 | 0.46 | sim | sim |
| cat_bolhas | sozinho (ambiente), código (conversa/foco/evento) | sim | 73 | 0.31 | sim | sim |
| cat_bolhas~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 62 | 0.35 | sim | sim |
| cat_ouvindo~suave | evento, código (conversa/foco/evento) | sim | 82 | 0.33 | sim | sim |
| cat_ouvindo | evento, código (conversa/foco/evento) | sim | 63 | 0.69 | sim | sim |
| cat_ouvindo~exagerado | evento, código (conversa/foco/evento) | sim | 54 | 0.31 | sim | sim |
| cat_pensando~suave | evento, código (conversa/foco/evento) | sim | 82 | 0.33 | sim | sim |
| cat_pensando | evento, código (conversa/foco/evento) | sim | 63 | 0.32 | sim | sim |
| cat_pensando~exagerado | evento, código (conversa/foco/evento) | sim | 54 | 0.33 | sim | sim |
| cat_processando~suave | evento | sim | 94 | 0.41 | sim | sim |
| cat_processando | evento | sim | 73 | 0.46 | sim | sim |
| cat_processando~exagerado | evento | sim | 62 | 0.47 | sim | sim |
| cat_digitando~suave | sozinho (ambiente) | sim | 100 | 0.32 | sim | sim |
| cat_digitando | sozinho (ambiente) | sim | 77 | 0.29 | sim | sim |
| cat_digitando~exagerado | sozinho (ambiente) | sim | 66 | 0.55 | sim | sim |
| cat_fingirTrabalhar~suave | sozinho (ambiente) | sim | 113 | 0.40 | sim | sim |
| cat_fingirTrabalhar | sozinho (ambiente) | sim | 87 | 0.32 | sim | sim |
| cat_fingirTrabalhar~exagerado | sozinho (ambiente) | sim | 74 | 0.28 | sim | sim |
| cat_pesquisando~suave | evento, código (conversa/foco/evento) | sim | 94 | 0.65 | sim | sim |
| cat_pesquisando | evento, código (conversa/foco/evento) | sim | 73 | 0.32 | sim | sim |
| cat_pesquisando~exagerado | evento, código (conversa/foco/evento) | sim | 62 | 0.31 | sim | sim |
| cat_lendo~suave | sozinho (ambiente), frase | sim | 132 | 0.31 | sim | sim |
| cat_lendo | sozinho (ambiente), frase | sim | 101 | 0.41 | sim | sim |
| cat_lendo~exagerado | sozinho (ambiente), frase | sim | 86 | 0.32 | sim | sim |
| cat_tarefaConcluida~suave | evento, código (conversa/foco/evento) | sim | 69 | 0.36 | sim | sim |
| cat_tarefaConcluida | evento, código (conversa/foco/evento) | sim | 53 | 0.39 | sim | sim |
| cat_tarefaConcluida~exagerado | evento, código (conversa/foco/evento) | sim | 45 | 0.40 | sim | sim |
| cat_confuso~suave | sozinho (ambiente) | sim | 75 | 0.54 | sim | sim |
| cat_confuso | sozinho (ambiente) | sim | 58 | 0.32 | sim | sim |
| cat_confuso~exagerado | sozinho (ambiente) | sim | 49 | 0.34 | sim | sim |
| cat_seguirOlhar~suave | sozinho (ambiente) | sim | 94 | 0.29 | sim | sim |
| cat_seguirOlhar | sozinho (ambiente) | sim | 73 | 0.28 | sim | sim |
| cat_seguirOlhar~exagerado | sozinho (ambiente) | sim | 62 | 0.35 | sim | sim |
| cat_encarar~suave | sozinho (ambiente) | sim | 94 | 0.28 | sim | sim |
| cat_encarar | sozinho (ambiente) | sim | 73 | 0.31 | sim | sim |
| cat_encarar~exagerado | sozinho (ambiente) | sim | 62 | 0.27 | sim | sim |
| cat_lerJunto~suave | sozinho (ambiente) | sim | 113 | 0.29 | sim | sim |
| cat_lerJunto | sozinho (ambiente) | sim | 87 | 0.30 | sim | sim |
| cat_lerJunto~exagerado | sozinho (ambiente) | sim | 74 | 0.28 | sim | sim |
| cat_animado~suave | sozinho (ambiente) | sim | 75 | 0.36 | sim | sim |
| cat_animado | sozinho (ambiente) | sim | 58 | 0.31 | sim | sim |
| cat_animado~exagerado | sozinho (ambiente) | sim | 49 | 0.36 | sim | sim |
| cat_puloAlegria~suave | sozinho (ambiente) | sim | 63 | 0.37 | sim | sim |
| cat_puloAlegria | sozinho (ambiente) | sim | 48 | 0.35 | sim | sim |
| cat_puloAlegria~exagerado | sozinho (ambiente) | sim | 41 | 0.34 | sim | sim |
| cat_risada~suave | sozinho (ambiente) | sim | 75 | 0.34 | sim | sim |
| cat_risada | sozinho (ambiente) | sim | 58 | 0.36 | sim | sim |
| cat_risada~exagerado | sozinho (ambiente) | sim | 49 | 0.35 | sim | sim |
| cat_sorrisoSuave~suave | sozinho (ambiente) | sim | 75 | 0.32 | sim | sim |
| cat_sorrisoSuave | sozinho (ambiente) | sim | 58 | 0.35 | sim | sim |
| cat_sorrisoSuave~exagerado | sozinho (ambiente) | sim | 49 | 0.32 | sim | sim |
| cat_orgulhoso~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 88 | 0.33 | sim | sim |
| cat_orgulhoso | sozinho (ambiente), código (conversa/foco/evento) | sim | 68 | 0.57 | sim | sim |
| cat_orgulhoso~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 58 | 0.34 | sim | sim |
| cat_apaixonado~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 100 | 0.36 | sim | sim |
| cat_apaixonado | sozinho (ambiente), código (conversa/foco/evento) | sim | 77 | 0.47 | sim | sim |
| cat_apaixonado~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 66 | 0.52 | sim | sim |
| cat_grato~suave | frase | sim | 75 | 0.52 | sim | sim |
| cat_grato | frase | sim | 58 | 0.52 | sim | sim |
| cat_grato~exagerado | frase | sim | 49 | 0.53 | sim | sim |
| cat_aplaudir~suave | sozinho (ambiente), evento, código (conversa/foco/evento) | sim | 69 | 0.53 | sim | sim |
| cat_aplaudir | sozinho (ambiente), evento, código (conversa/foco/evento) | sim | 53 | 0.50 | sim | sim |
| cat_aplaudir~exagerado | sozinho (ambiente), evento, código (conversa/foco/evento) | sim | 45 | 0.84 | sim | sim |
| cat_comemorar~suave | frase, evento | sim | 82 | 0.55 | sim | sim |
| cat_comemorar | frase, evento | sim | 63 | 0.40 | sim | sim |
| cat_comemorar~exagerado | frase, evento | sim | 54 | 0.35 | sim | sim |
| cat_dancinha~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 113 | 0.41 | sim | sim |
| cat_dancinha | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 87 | 0.49 | sim | sim |
| cat_dancinha~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 74 | 0.38 | sim | sim |
| cat_brilhoOlhos~suave | sozinho (ambiente) | sim | 69 | 0.29 | sim | sim |
| cat_brilhoOlhos | sozinho (ambiente) | sim | 53 | 0.30 | sim | sim |
| cat_brilhoOlhos~exagerado | sozinho (ambiente) | sim | 45 | 0.34 | sim | sim |
| cat_contente~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 100 | 0.46 | sim | sim |
| cat_contente | sozinho (ambiente), código (conversa/foco/evento) | sim | 77 | 0.36 | sim | sim |
| cat_contente~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 66 | 0.34 | sim | sim |
| cat_aliviado~suave | evento | sim | 75 | 0.33 | sim | sim |
| cat_aliviado | evento | sim | 58 | 0.54 | sim | sim |
| cat_aliviado~exagerado | evento | sim | 49 | 0.33 | sim | sim |
| cat_empolgado~suave | sozinho (ambiente) | sim | 82 | 0.30 | sim | sim |
| cat_empolgado | sozinho (ambiente) | sim | 63 | 0.32 | sim | sim |
| cat_empolgado~exagerado | sozinho (ambiente) | sim | 54 | 0.32 | sim | sim |
| cat_chorando~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 107 | 0.36 | sim | sim |
| cat_chorando | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 0.38 | sim | sim |
| cat_chorando~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 70 | 0.33 | sim | sim |
| cat_decepcionado~suave | código (conversa/foco/evento) | sim | 82 | 0.37 | sim | sim |
| cat_decepcionado | código (conversa/foco/evento) | sim | 63 | 0.31 | sim | sim |
| cat_decepcionado~exagerado | código (conversa/foco/evento) | sim | 54 | 0.36 | sim | sim |
| cat_preocupado~suave | evento | sim | 88 | 0.37 | sim | sim |
| cat_preocupado | evento | sim | 68 | 0.33 | sim | sim |
| cat_preocupado~exagerado | evento | sim | 58 | 0.33 | sim | sim |
| cat_ansioso~suave | código (conversa/foco/evento) | sim | 82 | 0.36 | sim | sim |
| cat_ansioso | código (conversa/foco/evento) | sim | 63 | 0.33 | sim | sim |
| cat_ansioso~exagerado | código (conversa/foco/evento) | sim | 54 | 0.32 | sim | sim |
| cat_nervoso~suave | código (conversa/foco/evento) | sim | 75 | 0.37 | sim | sim |
| cat_nervoso | código (conversa/foco/evento) | sim | 58 | 0.34 | sim | sim |
| cat_nervoso~exagerado | código (conversa/foco/evento) | sim | 49 | 0.34 | sim | sim |
| cat_envergonhado~suave | código (conversa/foco/evento) | sim | 82 | 0.55 | sim | sim |
| cat_envergonhado | código (conversa/foco/evento) | sim | 63 | 0.35 | sim | sim |
| cat_envergonhado~exagerado | código (conversa/foco/evento) | sim | 54 | 0.34 | sim | sim |
| cat_entediado~suave | sozinho (ambiente) | sim | 113 | 0.44 | sim | sim |
| cat_entediado | sozinho (ambiente) | sim | 87 | 0.50 | sim | sim |
| cat_entediado~exagerado | sozinho (ambiente) | sim | 74 | 0.40 | sim | sim |
| cat_irritadoLeve~suave | código (conversa/foco/evento) | sim | 82 | 0.46 | sim | sim |
| cat_irritadoLeve | código (conversa/foco/evento) | sim | 63 | 0.91 | sim | sim |
| cat_irritadoLeve~exagerado | código (conversa/foco/evento) | sim | 54 | 0.43 | sim | sim |
| cat_frustrado~suave | evento | sim | 82 | 0.43 | sim | sim |
| cat_frustrado | evento | sim | 63 | 0.39 | sim | sim |
| cat_frustrado~exagerado | evento | sim | 54 | 0.49 | sim | sim |
| cat_assustado~suave | código (conversa/foco/evento) | sim | 57 | 0.72 | sim | sim |
| cat_assustado | código (conversa/foco/evento) | sim | 44 | 0.37 | sim | sim |
| cat_assustado~exagerado | código (conversa/foco/evento) | sim | 37 | 0.39 | sim | sim |
| cat_chocado~suave | código (conversa/foco/evento) | sim | 63 | 0.44 | sim | sim |
| cat_chocado | código (conversa/foco/evento) | sim | 48 | 0.58 | sim | sim |
| cat_chocado~exagerado | código (conversa/foco/evento) | sim | 41 | 0.51 | sim | sim |
| cat_cansado~suave | sozinho (ambiente) | sim | 88 | 0.82 | sim | sim |
| cat_cansado | sozinho (ambiente) | sim | 68 | 0.45 | sim | sim |
| cat_cansado~exagerado | sozinho (ambiente) | sim | 58 | 0.49 | sim | sim |
| cat_solitario~suave | evento, código (conversa/foco/evento) | sim | 107 | 0.51 | sim | sim |
| cat_solitario | evento, código (conversa/foco/evento) | sim | 82 | 0.65 | sim | sim |
| cat_solitario~exagerado | evento, código (conversa/foco/evento) | sim | 70 | 0.50 | sim | sim |
| cat_tchau~suave | evento | sim | 63 | 0.45 | sim | sim |
| cat_tchau | evento | sim | 48 | 0.34 | sim | sim |
| cat_tchau~exagerado | evento | sim | 41 | 0.36 | sim | sim |
| cat_abraco~suave | frase | sim | 94 | 0.73 | sim | sim |
| cat_abraco | frase | sim | 73 | 0.41 | sim | sim |
| cat_abraco~exagerado | frase | sim | 62 | 0.45 | sim | sim |
| cat_coracao~suave | sozinho (ambiente), frase | sim | 82 | 0.44 | sim | sim |
| cat_coracao | sozinho (ambiente), frase | sim | 63 | 0.46 | sim | sim |
| cat_coracao~exagerado | sozinho (ambiente), frase | sim | 54 | 0.91 | sim | sim |
| cat_highFive~suave | frase | sim | 57 | 0.47 | sim | sim |
| cat_highFive | frase | sim | 44 | 0.40 | sim | sim |
| cat_highFive~exagerado | frase | sim | 37 | 0.39 | sim | sim |
| cat_piscadinha~suave | sozinho (ambiente) | sim | 57 | 0.41 | sim | sim |
| cat_piscadinha | sozinho (ambiente) | sim | 44 | 0.48 | sim | sim |
| cat_piscadinha~exagerado | sozinho (ambiente) | sim | 37 | 0.53 | sim | sim |
| cat_negar~suave | frase | sim | 63 | 0.68 | sim | sim |
| cat_negar | frase | sim | 48 | 0.52 | sim | sim |
| cat_negar~exagerado | frase | sim | 41 | 0.51 | sim | sim |
| cat_ombros~suave | sozinho (ambiente) | sim | 57 | 0.40 | sim | sim |
| cat_ombros | sozinho (ambiente) | sim | 44 | 0.36 | sim | sim |
| cat_ombros~exagerado | sozinho (ambiente) | sim | 37 | 0.36 | sim | sim |
| cat_apontar~suave | código (conversa/foco/evento) | sim | 57 | 0.35 | sim | sim |
| cat_apontar | código (conversa/foco/evento) | sim | 44 | 0.35 | sim | sim |
| cat_apontar~exagerado | código (conversa/foco/evento) | sim | 37 | 0.35 | sim | sim |
| cat_convidar~suave | sozinho (ambiente) | sim | 69 | 0.41 | sim | sim |
| cat_convidar | sozinho (ambiente) | sim | 53 | 0.38 | sim | sim |
| cat_convidar~exagerado | sozinho (ambiente) | sim | 45 | 0.40 | sim | sim |
| cat_desculpas~suave | frase | sim | 75 | 0.61 | sim | sim |
| cat_desculpas | frase | sim | 58 | 0.43 | sim | sim |
| cat_desculpas~exagerado | frase | sim | 49 | 0.49 | sim | sim |
| cat_agradecer~suave | código (conversa/foco/evento) | sim | 69 | 0.50 | sim | sim |
| cat_agradecer | código (conversa/foco/evento) | sim | 53 | 0.48 | sim | sim |
| cat_agradecer~exagerado | código (conversa/foco/evento) | sim | 45 | 0.49 | sim | sim |
| cat_cumprimentar~suave | evento | sim | 63 | 0.63 | sim | sim |
| cat_cumprimentar | evento | sim | 48 | 0.45 | sim | sim |
| cat_cumprimentar~exagerado | evento | sim | 41 | 0.43 | sim | sim |
| cat_tarefaFinalizada~suave | evento, código (conversa/foco/evento) | sim | 82 | 0.53 | sim | sim |
| cat_tarefaFinalizada | evento, código (conversa/foco/evento) | sim | 63 | 0.54 | sim | sim |
| cat_tarefaFinalizada~exagerado | evento, código (conversa/foco/evento) | sim | 54 | 0.82 | sim | sim |
| cat_erro~suave | evento, código (conversa/foco/evento) | sim | 69 | 0.49 | sim | sim |
| cat_erro | evento, código (conversa/foco/evento) | sim | 53 | 0.49 | sim | sim |
| cat_erro~exagerado | evento, código (conversa/foco/evento) | sim | 45 | 0.36 | sim | sim |
| cat_sucesso~suave | evento, código (conversa/foco/evento) | sim | 69 | 0.40 | sim | sim |
| cat_sucesso | evento, código (conversa/foco/evento) | sim | 53 | 0.43 | sim | sim |
| cat_sucesso~exagerado | evento, código (conversa/foco/evento) | sim | 45 | 0.76 | sim | sim |
| cat_sequencia~suave | evento, código (conversa/foco/evento) | sim | 94 | 0.39 | sim | sim |
| cat_sequencia | evento, código (conversa/foco/evento) | sim | 73 | 0.42 | sim | sim |
| cat_sequencia~exagerado | evento, código (conversa/foco/evento) | sim | 62 | 0.37 | sim | sim |
| cat_aniversario~suave | evento | sim | 125 | 0.64 | sim | sim |
| cat_aniversario | evento | sim | 97 | 0.54 | sim | sim |
| cat_aniversario~exagerado | evento | sim | 82 | 0.55 | sim | sim |
| cat_bomDia~suave | evento, código (conversa/foco/evento) | sim | 100 | 0.51 | sim | sim |
| cat_bomDia | evento, código (conversa/foco/evento) | sim | 77 | 0.51 | sim | sim |
| cat_bomDia~exagerado | evento, código (conversa/foco/evento) | sim | 66 | 0.52 | sim | sim |
| cat_boaNoite~suave | evento, código (conversa/foco/evento) | sim | 82 | 0.47 | sim | sim |
| cat_boaNoite | evento, código (conversa/foco/evento) | sim | 63 | 0.70 | sim | sim |
| cat_boaNoite~exagerado | evento, código (conversa/foco/evento) | sim | 54 | 0.46 | sim | sim |
| cat_lembrete~suave | evento, código (conversa/foco/evento) | sim | 82 | 0.46 | sim | sim |
| cat_lembrete | evento, código (conversa/foco/evento) | sim | 63 | 0.46 | sim | sim |
| cat_lembrete~exagerado | evento, código (conversa/foco/evento) | sim | 54 | 0.50 | sim | sim |
| cat_horaPausa~suave | evento | sim | 88 | 0.47 | sim | sim |
| cat_horaPausa | evento | sim | 68 | 0.43 | sim | sim |
| cat_horaPausa~exagerado | evento | sim | 58 | 0.46 | sim | sim |
| cat_modoFoco~suave | evento | sim | 82 | 0.44 | sim | sim |
| cat_modoFoco | evento | sim | 63 | 0.46 | sim | sim |
| cat_modoFoco~exagerado | evento | sim | 54 | 0.74 | sim | sim |
| cat_parabens~suave | frase, evento, código (conversa/foco/evento) | sim | 82 | 0.67 | sim | sim |
| cat_parabens | frase, evento, código (conversa/foco/evento) | sim | 63 | 0.54 | sim | sim |
| cat_parabens~exagerado | frase, evento, código (conversa/foco/evento) | sim | 54 | 0.55 | sim | sim |
| cat_notificacao~suave | evento, código (conversa/foco/evento) | sim | 50 | 0.43 | sim | sim |
| cat_notificacao | evento, código (conversa/foco/evento) | sim | 39 | 0.43 | sim | sim |
| cat_notificacao~exagerado | evento, código (conversa/foco/evento) | sim | 33 | 0.43 | sim | sim |
| cat_mensagemNova~suave | evento | sim | 63 | 0.46 | sim | sim |
| cat_mensagemNova | evento | sim | 48 | 0.36 | sim | sim |
| cat_mensagemNova~exagerado | evento | sim | 41 | 0.43 | sim | sim |
| cat_ausente~suave | evento, código (conversa/foco/evento) | sim | 132 | 0.39 | sim | sim |
| cat_ausente | evento, código (conversa/foco/evento) | sim | 101 | 0.55 | sim | sim |
| cat_ausente~exagerado | evento, código (conversa/foco/evento) | sim | 86 | 0.37 | sim | sim |
| cat_voltou~suave | evento, código (conversa/foco/evento) | sim | 75 | 0.45 | sim | sim |
| cat_voltou | evento, código (conversa/foco/evento) | sim | 58 | 0.50 | sim | sim |
| cat_voltou~exagerado | evento, código (conversa/foco/evento) | sim | 49 | 0.57 | sim | sim |
| cat_clique~suave | evento, código (conversa/foco/evento) | sim | 29 | 0.51 | sim | sim |
| cat_clique | evento, código (conversa/foco/evento) | sim | 22 | 0.50 | sim | sim |
| cat_clique~exagerado | evento, código (conversa/foco/evento) | sim | 19 | 0.50 | sim | sim |
| cat_cocegas~suave | frase, evento, código (conversa/foco/evento) | sim | 69 | 0.55 | sim | sim |
| cat_cocegas | frase, evento, código (conversa/foco/evento) | sim | 53 | 0.51 | sim | sim |
| cat_cocegas~exagerado | frase, evento, código (conversa/foco/evento) | sim | 45 | 0.48 | sim | sim |
| cat_jogado~suave | evento, código (conversa/foco/evento) | sim | 44 | 0.49 | sim | sim |
| cat_jogado | evento, código (conversa/foco/evento) | sim | 34 | 1.00 | sim | sim |
| cat_jogado~exagerado | evento, código (conversa/foco/evento) | sim | 29 | 0.47 | sim | sim |
| cat_duploClique~suave | evento, código (conversa/foco/evento) | sim | 38 | 0.53 | sim | sim |
| cat_duploClique | evento, código (conversa/foco/evento) | sim | 29 | 0.52 | sim | sim |
| cat_duploClique~exagerado | evento, código (conversa/foco/evento) | sim | 25 | 0.49 | sim | sim |
| cat_segurar~suave | evento, código (conversa/foco/evento) | sim | 57 | 0.52 | sim | sim |
| cat_segurar | evento, código (conversa/foco/evento) | sim | 44 | 0.50 | sim | sim |
| cat_segurar~exagerado | evento, código (conversa/foco/evento) | sim | 37 | 0.53 | sim | sim |
| cat_empurrado~suave | frase | sim | 44 | 0.48 | sim | sim |
| cat_empurrado | frase | sim | 34 | 0.99 | sim | sim |
| cat_empurrado~exagerado | frase | sim | 29 | 0.49 | sim | sim |
| cat_seguir~suave | frase | sim | 94 | 0.56 | sim | sim |
| cat_seguir | frase | sim | 73 | 0.45 | sim | sim |
| cat_seguir~exagerado | frase | sim | 62 | 0.45 | sim | sim |
| cat_esconder~suave | frase, código (conversa/foco/evento) | sim | 75 | 0.49 | sim | sim |
| cat_esconder | frase, código (conversa/foco/evento) | sim | 58 | 0.53 | sim | sim |
| cat_esconder~exagerado | frase, código (conversa/foco/evento) | sim | 49 | 0.50 | sim | sim |
| cat_espiarBorda~suave | sozinho (ambiente) | sim | 125 | 0.42 | sim | sim |
| cat_espiarBorda | sozinho (ambiente) | sim | 97 | 0.82 | sim | sim |
| cat_espiarBorda~exagerado | sozinho (ambiente) | sim | 82 | 0.42 | sim | sim |
| cat_beberShake~suave | sozinho (ambiente), frase | sim | 88 | 0.48 | sim | sim |
| cat_beberShake | sozinho (ambiente), frase | sim | 68 | 1.16 | sim | sim |
| cat_beberShake~exagerado | sozinho (ambiente), frase | sim | 58 | 0.46 | sim | sim |
| cat_ouvirMusica~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 125 | 0.52 | sim | sim |
| cat_ouvirMusica | sozinho (ambiente), código (conversa/foco/evento) | sim | 97 | 0.50 | sim | sim |
| cat_ouvirMusica~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 0.52 | sim | sim |
| cat_estrelas~suave | sozinho (ambiente) | sim | 144 | 0.51 | sim | sim |
| cat_estrelas | sozinho (ambiente) | sim | 111 | 0.61 | sim | sim |
| cat_estrelas~exagerado | sozinho (ambiente) | sim | 94 | 0.51 | sim | sim |
| cat_soprarBolhas~suave | sozinho (ambiente) | sim | 94 | 0.45 | sim | sim |
| cat_soprarBolhas | sozinho (ambiente) | sim | 73 | 0.44 | sim | sim |
| cat_soprarBolhas~exagerado | sozinho (ambiente) | sim | 62 | 0.62 | sim | sim |
| cat_perseguir~suave | sozinho (ambiente) | sim | 125 | 0.45 | sim | sim |
| cat_perseguir | sozinho (ambiente) | sim | 97 | 0.45 | sim | sim |
| cat_perseguir~exagerado | sozinho (ambiente) | sim | 82 | 0.44 | sim | sim |
| cat_pular~suave | sozinho (ambiente) | sim | 50 | 0.49 | sim | sim |
| cat_pular | sozinho (ambiente) | sim | 39 | 0.48 | sim | sim |
| cat_pular~exagerado | sozinho (ambiente) | sim | 33 | 0.48 | sim | sim |
| cat_rolar~suave | sozinho (ambiente), frase | sim | 57 | 0.46 | sim | sim |
| cat_rolar | sozinho (ambiente), frase | sim | 44 | 0.55 | sim | sim |
| cat_rolar~exagerado | sozinho (ambiente), frase | sim | 37 | 0.56 | sim | sim |
| cat_girar~suave | sozinho (ambiente), frase | sim | 57 | 0.51 | sim | sim |
| cat_girar | sozinho (ambiente), frase | sim | 44 | 0.54 | sim | sim |
| cat_girar~exagerado | sozinho (ambiente), frase | sim | 37 | 0.49 | sim | sim |
| cat_escondeBorda~suave | sozinho (ambiente) | sim | 138 | 0.44 | sim | sim |
| cat_escondeBorda | sozinho (ambiente) | sim | 106 | 0.51 | sim | sim |
| cat_escondeBorda~exagerado | sozinho (ambiente) | sim | 90 | 0.31 | sim | sim |
| cat_frio~suave | sozinho (ambiente) | sim | 94 | 0.43 | sim | sim |
| cat_frio | sozinho (ambiente) | sim | 73 | 0.66 | sim | sim |
| cat_frio~exagerado | sozinho (ambiente) | sim | 62 | 0.50 | sim | sim |
| cat_calor~suave | sozinho (ambiente) | sim | 94 | 0.48 | sim | sim |
| cat_calor | sozinho (ambiente) | sim | 73 | 0.48 | sim | sim |
| cat_calor~exagerado | sozinho (ambiente) | sim | 62 | 0.70 | sim | sim |
| cat_chuva~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 107 | 0.39 | sim | sim |
| cat_chuva | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 0.43 | sim | sim |
| cat_chuva~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 70 | 0.66 | sim | sim |
| cat_vento~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 94 | 0.64 | sim | sim |
| cat_vento | sozinho (ambiente), código (conversa/foco/evento) | sim | 73 | 0.35 | sim | sim |
| cat_vento~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 62 | 0.34 | sim | sim |
| cat_desaparecer~suave | frase | sim | 75 | 0.36 | sim | sim |
| cat_desaparecer | frase | sim | 58 | 0.51 | sim | sim |
| cat_desaparecer~exagerado | frase | sim | 49 | 0.32 | sim | sim |
| cat_teleporte~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 63 | 0.32 | sim | sim |
| cat_teleporte | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 48 | 0.33 | sim | sim |
| cat_teleporte~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 41 | 0.38 | sim | sim |
| cat_aura~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 113 | 0.45 | sim | sim |
| cat_aura | sozinho (ambiente), código (conversa/foco/evento) | sim | 87 | 0.38 | sim | sim |
| cat_aura~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 74 | 0.39 | sim | sim |
| cat_evolucao~suave | sozinho (ambiente), evento | sim | 100 | 0.37 | sim | sim |
| cat_evolucao | sozinho (ambiente), evento | sim | 77 | 0.37 | sim | sim |
| cat_evolucao~exagerado | sozinho (ambiente), evento | sim | 66 | 0.35 | sim | sim |
| cat_modoPoder~suave | sozinho (ambiente), frase | sim | 100 | 0.38 | sim | sim |
| cat_modoPoder | sozinho (ambiente), frase | sim | 77 | 0.47 | sim | sim |
| cat_modoPoder~exagerado | sozinho (ambiente), frase | sim | 66 | 0.42 | sim | sim |
| cat_pet~suave | evento, código (conversa/foco/evento) | sim | 57 | 0.35 | sim | sim |
| cat_pet | evento, código (conversa/foco/evento) | sim | 44 | 0.35 | sim | sim |
| cat_pet~exagerado | evento, código (conversa/foco/evento) | sim | 37 | 0.76 | sim | sim |
| cat_poseEpica~suave | sozinho (ambiente) | sim | 113 | 0.36 | sim | sim |
| cat_poseEpica | sozinho (ambiente) | sim | 87 | 0.34 | sim | sim |
| cat_poseEpica~exagerado | sozinho (ambiente) | sim | 74 | 0.40 | sim | sim |
| cat_encararDentes~suave | sozinho (ambiente) | sim | 100 | 0.52 | sim | sim |
| cat_encararDentes | sozinho (ambiente) | sim | 77 | 0.33 | sim | sim |
| cat_encararDentes~exagerado | sozinho (ambiente) | sim | 66 | 0.29 | sim | sim |
| cat_sorrisoCanto~suave | sozinho (ambiente) | sim | 69 | 0.30 | sim | sim |
| cat_sorrisoCanto | sozinho (ambiente) | sim | 53 | 0.46 | sim | sim |
| cat_sorrisoCanto~exagerado | sozinho (ambiente) | sim | 45 | 0.76 | sim | sim |
| cat_sobrancelha~suave | sozinho (ambiente) | sim | 50 | 0.44 | sim | sim |
| cat_sobrancelha | sozinho (ambiente) | sim | 39 | 0.34 | sim | sim |
| cat_sobrancelha~exagerado | sozinho (ambiente) | sim | 33 | 0.30 | sim | sim |
| cat_revirarOlhos~suave | sozinho (ambiente) | sim | 57 | 0.37 | sim | sim |
| cat_revirarOlhos | sozinho (ambiente) | sim | 44 | 0.51 | sim | sim |
| cat_revirarOlhos~exagerado | sozinho (ambiente) | sim | 37 | 0.51 | sim | sim |
| cat_ombrosDeboche~suave | sozinho (ambiente) | sim | 63 | 0.88 | sim | sim |
| cat_ombrosDeboche | sozinho (ambiente) | sim | 48 | 0.50 | sim | sim |
| cat_ombrosDeboche~exagerado | sozinho (ambiente) | sim | 41 | 0.47 | sim | sim |
| cat_superioridade~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 0.46 | sim | sim |
| cat_superioridade | sozinho (ambiente), código (conversa/foco/evento) | sim | 63 | 0.41 | sim | sim |
| cat_superioridade~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 54 | 1.07 | sim | sim |
| cat_naoFuiEu~suave | sozinho (ambiente) | sim | 88 | 0.38 | sim | sim |
| cat_naoFuiEu | sozinho (ambiente) | sim | 68 | 0.34 | sim | sim |
| cat_naoFuiEu~exagerado | sozinho (ambiente) | sim | 58 | 0.33 | sim | sim |
| cat_assobiar~suave | sozinho (ambiente) | sim | 94 | 0.35 | sim | sim |
| cat_assobiar | sozinho (ambiente) | sim | 73 | 0.33 | sim | sim |
| cat_assobiar~exagerado | sozinho (ambiente) | sim | 62 | 0.33 | sim | sim |
| cat_olharLado~suave | sozinho (ambiente) | sim | 69 | 0.31 | sim | sim |
| cat_olharLado | sozinho (ambiente) | sim | 53 | 0.29 | sim | sim |
| cat_olharLado~exagerado | sozinho (ambiente) | sim | 45 | 0.32 | sim | sim |
| cat_beijoExagerado~suave | sozinho (ambiente), frase | sim | 75 | 0.64 | sim | sim |
| cat_beijoExagerado | sozinho (ambiente), frase | sim | 58 | 0.36 | sim | sim |
| cat_beijoExagerado~exagerado | sozinho (ambiente), frase | sim | 49 | 0.31 | sim | sim |
| cat_poseVilao~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 94 | 0.34 | sim | sim |
| cat_poseVilao | sozinho (ambiente), código (conversa/foco/evento) | sim | 73 | 0.36 | sim | sim |
| cat_poseVilao~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 62 | 0.53 | sim | sim |
| cat_rirPropriaPiada~suave | sozinho (ambiente) | sim | 82 | 0.38 | sim | sim |
| cat_rirPropriaPiada | sozinho (ambiente) | sim | 63 | 0.35 | sim | sim |
| cat_rirPropriaPiada~exagerado | sozinho (ambiente) | sim | 54 | 0.34 | sim | sim |
| cat_hmpf~suave | sozinho (ambiente) | sim | 63 | 0.38 | sim | sim |
| cat_hmpf | sozinho (ambiente) | sim | 48 | 1.03 | sim | sim |
| cat_hmpf~exagerado | sozinho (ambiente) | sim | 41 | 0.48 | sim | sim |
| cat_circularPresa~suave | sozinho (ambiente) | sim | 125 | 0.51 | sim | sim |
| cat_circularPresa | sozinho (ambiente) | sim | 97 | 0.46 | sim | sim |
| cat_circularPresa~exagerado | sozinho (ambiente) | sim | 82 | 0.68 | sim | sim |
| cat_charmeCauda~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 94 | 0.44 | sim | sim |
| cat_charmeCauda | sozinho (ambiente), código (conversa/foco/evento) | sim | 73 | 0.45 | sim | sim |
| cat_charmeCauda~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 62 | 0.40 | sim | sim |
| cat_brilharDentes~suave | sozinho (ambiente) | sim | 82 | 0.36 | sim | sim |
| cat_brilharDentes | sozinho (ambiente) | sim | 63 | 0.68 | sim | sim |
| cat_brilharDentes~exagerado | sozinho (ambiente) | sim | 54 | 0.39 | sim | sim |
| cat_olharApaixonado~suave | sozinho (ambiente) | sim | 94 | 0.39 | sim | sim |
| cat_olharApaixonado | sozinho (ambiente) | sim | 73 | 0.45 | sim | sim |
| cat_olharApaixonado~exagerado | sozinho (ambiente) | sim | 62 | 0.81 | sim | sim |
| cat_corar~suave | sozinho (ambiente) | sim | 69 | 0.35 | sim | sim |
| cat_corar | sozinho (ambiente) | sim | 53 | 0.37 | sim | sim |
| cat_corar~exagerado | sozinho (ambiente) | sim | 45 | 0.32 | sim | sim |
| cat_fingirTimidez~suave | sozinho (ambiente) | sim | 75 | 0.40 | sim | sim |
| cat_fingirTimidez | sozinho (ambiente) | sim | 58 | 0.40 | sim | sim |
| cat_fingirTimidez~exagerado | sozinho (ambiente) | sim | 49 | 0.35 | sim | sim |
| cat_soprarBeijo~suave | sozinho (ambiente) | sim | 69 | 0.33 | sim | sim |
| cat_soprarBeijo | sozinho (ambiente) | sim | 53 | 0.34 | sim | sim |
| cat_soprarBeijo~exagerado | sozinho (ambiente) | sim | 45 | 0.35 | sim | sim |
| cat_nadarParaTela~suave | sozinho (ambiente) | sim | 107 | 0.33 | sim | sim |
| cat_nadarParaTela | sozinho (ambiente) | sim | 82 | 0.67 | sim | sim |
| cat_nadarParaTela~exagerado | sozinho (ambiente) | sim | 70 | 0.32 | sim | sim |
| cat_sussurrar~suave | sozinho (ambiente) | sim | 88 | 0.42 | sim | sim |
| cat_sussurrar | sozinho (ambiente) | sim | 68 | 0.39 | sim | sim |
| cat_sussurrar~exagerado | sozinho (ambiente) | sim | 58 | 0.62 | sim | sim |
| cat_elogiarExagero~suave | sozinho (ambiente) | sim | 82 | 0.41 | sim | sim |
| cat_elogiarExagero | sozinho (ambiente) | sim | 63 | 0.43 | sim | sim |
| cat_elogiarExagero~exagerado | sozinho (ambiente) | sim | 54 | 0.48 | sim | sim |
| cat_ciumento~suave | sozinho (ambiente), frase | sim | 82 | 0.46 | sim | sim |
| cat_ciumento | sozinho (ambiente), frase | sim | 63 | 0.41 | sim | sim |
| cat_ciumento~exagerado | sozinho (ambiente), frase | sim | 54 | 0.40 | sim | sim |
| cat_dramaCiumes~suave | sozinho (ambiente) | sim | 88 | 0.47 | sim | sim |
| cat_dramaCiumes | sozinho (ambiente) | sim | 68 | 0.44 | sim | sim |
| cat_dramaCiumes~exagerado | sozinho (ambiente) | sim | 58 | 0.51 | sim | sim |
| cat_amorEterno~suave | sozinho (ambiente) | sim | 113 | 0.60 | sim | sim |
| cat_amorEterno | sozinho (ambiente) | sim | 87 | 0.39 | sim | sim |
| cat_amorEterno~exagerado | sozinho (ambiente) | sim | 74 | 0.50 | sim | sim |
| cat_cantadaRuim~suave | sozinho (ambiente), frase | sim | 75 | 0.34 | sim | sim |
| cat_cantadaRuim | sozinho (ambiente), frase | sim | 58 | 0.40 | sim | sim |
| cat_cantadaRuim~exagerado | sozinho (ambiente), frase | sim | 49 | 0.45 | sim | sim |
| cat_abracoApertado~suave | frase | sim | 94 | 0.40 | sim | sim |
| cat_abracoApertado | frase | sim | 73 | 0.55 | sim | sim |
| cat_abracoApertado~exagerado | frase | sim | 62 | 0.75 | sim | sim |
| cat_espelho~suave | sozinho (ambiente), frase | sim | 100 | 0.53 | sim | sim |
| cat_espelho | sozinho (ambiente), frase | sim | 77 | 0.53 | sim | sim |
| cat_espelho~exagerado | sozinho (ambiente), frase | sim | 66 | 0.58 | sim | sim |
| cat_selfie~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 88 | 1.35 | sim | sim |
| cat_selfie | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 68 | 0.49 | sim | sim |
| cat_selfie~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 58 | 0.47 | sim | sim |
| cat_desfile~suave | sozinho (ambiente), frase | sim | 138 | 0.51 | sim | sim |
| cat_desfile | sozinho (ambiente), frase | sim | 106 | 0.61 | sim | sim |
| cat_desfile~exagerado | sozinho (ambiente), frase | sim | 90 | 0.55 | sim | sim |
| cat_seAcharMaximo~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 88 | 0.53 | sim | sim |
| cat_seAcharMaximo | sozinho (ambiente), código (conversa/foco/evento) | sim | 68 | 0.51 | sim | sim |
| cat_seAcharMaximo~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 58 | 0.54 | sim | sim |
| cat_flexionarBiceps~suave | sozinho (ambiente), frase | sim | 75 | 0.50 | sim | sim |
| cat_flexionarBiceps | sozinho (ambiente), frase | sim | 58 | 0.49 | sim | sim |
| cat_flexionarBiceps~exagerado | sozinho (ambiente), frase | sim | 49 | 0.48 | sim | sim |
| cat_duploBiceps~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 88 | 0.45 | sim | sim |
| cat_duploBiceps | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 68 | 0.82 | sim | sim |
| cat_duploBiceps~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 58 | 0.43 | sim | sim |
| cat_aplausosImaginarios~suave | sozinho (ambiente) | sim | 94 | 0.55 | sim | sim |
| cat_aplausosImaginarios | sozinho (ambiente) | sim | 73 | 0.54 | sim | sim |
| cat_aplausosImaginarios~exagerado | sozinho (ambiente) | sim | 62 | 1.06 | sim | sim |
| cat_agradecerPlateia~suave | sozinho (ambiente) | sim | 82 | 0.45 | sim | sim |
| cat_agradecerPlateia | sozinho (ambiente) | sim | 63 | 0.45 | sim | sim |
| cat_agradecerPlateia~exagerado | sozinho (ambiente) | sim | 54 | 0.46 | sim | sim |
| cat_fingirModestia~suave | sozinho (ambiente) | sim | 75 | 0.53 | sim | sim |
| cat_fingirModestia | sozinho (ambiente) | sim | 58 | 0.51 | sim | sim |
| cat_fingirModestia~exagerado | sozinho (ambiente) | sim | 49 | 0.50 | sim | sim |
| cat_pedirElogios~suave | sozinho (ambiente) | sim | 75 | 0.48 | sim | sim |
| cat_pedirElogios | sozinho (ambiente) | sim | 58 | 0.43 | sim | sim |
| cat_pedirElogios~exagerado | sozinho (ambiente) | sim | 49 | 0.43 | sim | sim |
| cat_tapinhaAbdomen~suave | sozinho (ambiente) | sim | 75 | 0.47 | sim | sim |
| cat_tapinhaAbdomen | sozinho (ambiente) | sim | 58 | 0.48 | sim | sim |
| cat_tapinhaAbdomen~exagerado | sozinho (ambiente) | sim | 49 | 0.50 | sim | sim |
| cat_halteres~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 113 | 0.44 | sim | sim |
| cat_halteres | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 87 | 0.46 | sim | sim |
| cat_halteres~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 74 | 0.63 | sim | sim |
| cat_flexoes~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 113 | 0.45 | sim | sim |
| cat_flexoes | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 87 | 0.46 | sim | sim |
| cat_flexoes~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 74 | 0.82 | sim | sim |
| cat_incrivel~suave | sozinho (ambiente) | sim | 75 | 0.43 | sim | sim |
| cat_incrivel | sozinho (ambiente) | sim | 58 | 0.42 | sim | sim |
| cat_incrivel~exagerado | sozinho (ambiente) | sim | 49 | 0.47 | sim | sim |
| cat_toalha~suave | sozinho (ambiente) | sim | 100 | 0.52 | sim | sim |
| cat_toalha | sozinho (ambiente) | sim | 77 | 1.11 | sim | sim |
| cat_toalha~exagerado | sozinho (ambiente) | sim | 66 | 0.52 | sim | sim |
| cat_admirarMusculos~suave | sozinho (ambiente) | sim | 88 | 0.51 | sim | sim |
| cat_admirarMusculos | sozinho (ambiente) | sim | 68 | 0.50 | sim | sim |
| cat_admirarMusculos~exagerado | sozinho (ambiente) | sim | 58 | 0.69 | sim | sim |
| cat_agachamentoNado~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 107 | 0.44 | sim | sim |
| cat_agachamentoNado | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 0.43 | sim | sim |
| cat_agachamentoNado~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 70 | 0.44 | sim | sim |
| cat_alongar~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 100 | 0.65 | sim | sim |
| cat_alongar | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 77 | 0.53 | sim | sim |
| cat_alongar~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 66 | 0.50 | sim | sim |
| cat_elastico~suave | sozinho (ambiente) | sim | 100 | 0.57 | sim | sim |
| cat_elastico | sozinho (ambiente) | sim | 77 | 0.46 | sim | sim |
| cat_elastico~exagerado | sozinho (ambiente) | sim | 66 | 0.42 | sim | sim |
| cat_espelhoInvisivel~suave | sozinho (ambiente) | sim | 82 | 0.44 | sim | sim |
| cat_espelhoInvisivel | sozinho (ambiente) | sim | 63 | 0.61 | sim | sim |
| cat_espelhoInvisivel~exagerado | sozinho (ambiente) | sim | 54 | 0.41 | sim | sim |
| cat_beijoBiceps~suave | sozinho (ambiente) | sim | 82 | 0.49 | sim | sim |
| cat_beijoBiceps | sozinho (ambiente) | sim | 63 | 0.45 | sim | sim |
| cat_beijoBiceps~exagerado | sozinho (ambiente) | sim | 54 | 0.46 | sim | sim |
| cat_contarRepeticoes~suave | sozinho (ambiente) | sim | 156 | 0.44 | sim | sim |
| cat_contarRepeticoes | sozinho (ambiente) | sim | 120 | 0.45 | sim | sim |
| cat_contarRepeticoes~exagerado | sozinho (ambiente) | sim | 103 | 0.44 | sim | sim |
| cat_esparramado~suave | sozinho (ambiente) | sim | 144 | 0.50 | sim | sim |
| cat_esparramado | sozinho (ambiente) | sim | 111 | 0.51 | sim | sim |
| cat_esparramado~exagerado | sozinho (ambiente) | sim | 94 | 0.50 | sim | sim |
| cat_ignorar~suave | sozinho (ambiente) | sim | 94 | 0.51 | sim | sim |
| cat_ignorar | sozinho (ambiente) | sim | 73 | 0.49 | sim | sim |
| cat_ignorar~exagerado | sozinho (ambiente) | sim | 62 | 0.51 | sim | sim |
| cat_fingirDormir~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 132 | 0.57 | sim | sim |
| cat_fingirDormir | sozinho (ambiente), código (conversa/foco/evento) | sim | 101 | 0.54 | sim | sim |
| cat_fingirDormir~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 86 | 0.54 | sim | sim |
| cat_palito~suave | sozinho (ambiente) | sim | 94 | 0.44 | sim | sim |
| cat_palito | sozinho (ambiente) | sim | 73 | 0.44 | sim | sim |
| cat_palito~exagerado | sozinho (ambiente) | sim | 62 | 0.43 | sim | sim |
| cat_cocarBarriga~suave | sozinho (ambiente) | sim | 88 | 0.51 | sim | sim |
| cat_cocarBarriga | sozinho (ambiente) | sim | 68 | 0.77 | sim | sim |
| cat_cocarBarriga~exagerado | sozinho (ambiente) | sim | 58 | 0.47 | sim | sim |
| cat_rolarPreguica~suave | sozinho (ambiente) | sim | 94 | 0.49 | sim | sim |
| cat_rolarPreguica | sozinho (ambiente) | sim | 73 | 0.50 | sim | sim |
| cat_rolarPreguica~exagerado | sozinho (ambiente) | sim | 62 | 0.50 | sim | sim |
| cat_depoisEuFaco~suave | sozinho (ambiente), frase | sim | 100 | 0.49 | sim | sim |
| cat_depoisEuFaco | sozinho (ambiente), frase | sim | 77 | 0.50 | sim | sim |
| cat_depoisEuFaco~exagerado | sozinho (ambiente), frase | sim | 66 | 0.50 | sim | sim |
| cat_escondeAlga~suave | sozinho (ambiente) | sim | 125 | 0.67 | sim | sim |
| cat_escondeAlga | sozinho (ambiente) | sim | 97 | 0.42 | sim | sim |
| cat_escondeAlga~exagerado | sozinho (ambiente) | sim | 82 | 0.41 | sim | sim |
| cat_escondeCoberta~suave | sozinho (ambiente) | sim | 125 | 0.48 | sim | sim |
| cat_escondeCoberta | sozinho (ambiente) | sim | 97 | 0.50 | sim | sim |
| cat_escondeCoberta~exagerado | sozinho (ambiente) | sim | 82 | 0.51 | sim | sim |
| cat_suspirar~suave | sozinho (ambiente) | sim | 75 | 0.65 | sim | sim |
| cat_suspirar | sozinho (ambiente) | sim | 58 | 0.48 | sim | sim |
| cat_suspirar~exagerado | sozinho (ambiente) | sim | 49 | 0.50 | sim | sim |
| cat_olharRelogio~suave | sozinho (ambiente) | sim | 88 | 0.54 | sim | sim |
| cat_olharRelogio | sozinho (ambiente) | sim | 68 | 0.52 | sim | sim |
| cat_olharRelogio~exagerado | sozinho (ambiente) | sim | 58 | 1.16 | sim | sim |
| cat_arrotar~suave | sozinho (ambiente) | sim | 63 | 0.45 | sim | sim |
| cat_arrotar | sozinho (ambiente) | sim | 48 | 0.46 | sim | sim |
| cat_arrotar~exagerado | sozinho (ambiente) | sim | 41 | 0.46 | sim | sim |
| cat_solucar~suave | sozinho (ambiente) | sim | 94 | 0.44 | sim | sim |
| cat_solucar | sozinho (ambiente) | sim | 73 | 1.11 | sim | sim |
| cat_solucar~exagerado | sozinho (ambiente) | sim | 62 | 0.44 | sim | sim |
| cat_espirrar~suave | sozinho (ambiente) | sim | 63 | 0.46 | sim | sim |
| cat_espirrar | sozinho (ambiente) | sim | 48 | 0.46 | sim | sim |
| cat_espirrar~exagerado | sozinho (ambiente) | sim | 41 | 0.46 | sim | sim |
| cat_peidinho~suave | sozinho (ambiente) | sim | 82 | 0.54 | sim | sim |
| cat_peidinho | sozinho (ambiente) | sim | 63 | 0.48 | sim | sim |
| cat_peidinho~exagerado | sozinho (ambiente) | sim | 54 | 0.48 | sim | sim |
| cat_barrigaRoncando~suave | sozinho (ambiente) | sim | 75 | 0.52 | sim | sim |
| cat_barrigaRoncando | sozinho (ambiente) | sim | 58 | 0.50 | sim | sim |
| cat_barrigaRoncando~exagerado | sozinho (ambiente) | sim | 49 | 0.95 | sim | sim |
| cat_careta~suave | sozinho (ambiente), frase | sim | 63 | 0.43 | sim | sim |
| cat_careta | sozinho (ambiente), frase | sim | 48 | 0.43 | sim | sim |
| cat_careta~exagerado | sozinho (ambiente), frase | sim | 41 | 0.43 | sim | sim |
| cat_lingua~suave | sozinho (ambiente), frase | sim | 57 | 0.44 | sim | sim |
| cat_lingua | sozinho (ambiente), frase | sim | 44 | 0.42 | sim | sim |
| cat_lingua~exagerado | sozinho (ambiente), frase | sim | 37 | 0.48 | sim | sim |
| cat_bochechas~suave | sozinho (ambiente), frase | sim | 69 | 0.40 | sim | sim |
| cat_bochechas | sozinho (ambiente), frase | sim | 53 | 0.40 | sim | sim |
| cat_bochechas~exagerado | sozinho (ambiente), frase | sim | 45 | 0.43 | sim | sim |
| cat_estalar~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 75 | 0.44 | sim | sim |
| cat_estalar | sozinho (ambiente), código (conversa/foco/evento) | sim | 58 | 0.69 | sim | sim |
| cat_estalar~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 49 | 0.42 | sim | sim |
| cat_autoCocegas~suave | sozinho (ambiente) | sim | 75 | 0.51 | sim | sim |
| cat_autoCocegas | sozinho (ambiente) | sim | 58 | 0.49 | sim | sim |
| cat_autoCocegas~exagerado | sozinho (ambiente) | sim | 49 | 0.52 | sim | sim |
| cat_desmaio~suave | sozinho (ambiente) | sim | 113 | 0.65 | sim | sim |
| cat_desmaio | sozinho (ambiente) | sim | 87 | 0.43 | sim | sim |
| cat_desmaio~exagerado | sozinho (ambiente) | sim | 74 | 0.44 | sim | sim |
| cat_cairJoelhos~suave | sozinho (ambiente) | sim | 94 | 0.49 | sim | sim |
| cat_cairJoelhos | sozinho (ambiente) | sim | 73 | 0.62 | sim | sim |
| cat_cairJoelhos~exagerado | sozinho (ambiente) | sim | 62 | 0.51 | sim | sim |
| cat_perdaoTeatral~suave | frase | sim | 100 | 0.48 | sim | sim |
| cat_perdaoTeatral | frase | sim | 77 | 0.49 | sim | sim |
| cat_perdaoTeatral~exagerado | frase | sim | 66 | 0.48 | sim | sim |
| cat_fingirMachucado~suave | sozinho (ambiente) | sim | 94 | 0.52 | sim | sim |
| cat_fingirMachucado | sozinho (ambiente) | sim | 73 | 0.54 | sim | sim |
| cat_fingirMachucado~exagerado | sozinho (ambiente) | sim | 62 | 0.51 | sim | sim |
| cat_falsaMorte~suave | sozinho (ambiente) | sim | 138 | 0.44 | sim | sim |
| cat_falsaMorte | sozinho (ambiente) | sim | 106 | 0.44 | sim | sim |
| cat_falsaMorte~exagerado | sozinho (ambiente) | sim | 90 | 0.44 | sim | sim |
| cat_ressuscitar~suave | sozinho (ambiente) | sim | 88 | 0.48 | sim | sim |
| cat_ressuscitar | sozinho (ambiente) | sim | 68 | 0.49 | sim | sim |
| cat_ressuscitar~exagerado | sozinho (ambiente) | sim | 58 | 0.48 | sim | sim |
| cat_gritarSuperficie~suave | sozinho (ambiente) | sim | 82 | 0.50 | sim | sim |
| cat_gritarSuperficie | sozinho (ambiente) | sim | 63 | 0.50 | sim | sim |
| cat_gritarSuperficie~exagerado | sozinho (ambiente) | sim | 54 | 0.49 | sim | sim |
| cat_revolta~suave | sozinho (ambiente) | sim | 88 | 0.49 | sim | sim |
| cat_revolta | sozinho (ambiente) | sim | 68 | 0.50 | sim | sim |
| cat_revolta~exagerado | sozinho (ambiente) | sim | 58 | 0.78 | sim | sim |
| cat_birra~suave | sozinho (ambiente) | sim | 113 | 0.51 | sim | sim |
| cat_birra | sozinho (ambiente) | sim | 87 | 0.51 | sim | sim |
| cat_birra~exagerado | sozinho (ambiente) | sim | 74 | 0.53 | sim | sim |
| cat_esconderAtras~suave | sozinho (ambiente) | sim | 82 | 0.59 | sim | sim |
| cat_esconderAtras | sozinho (ambiente) | sim | 63 | 0.44 | sim | sim |
| cat_esconderAtras~exagerado | sozinho (ambiente) | sim | 54 | 0.42 | sim | sim |
| cat_puxarCursor~suave | sozinho (ambiente) | sim | 69 | 0.48 | sim | sim |
| cat_puxarCursor | sozinho (ambiente) | sim | 53 | 0.49 | sim | sim |
| cat_puxarCursor~exagerado | sozinho (ambiente) | sim | 45 | 1.52 | sim | sim |
| cat_derrubarObjeto~suave | sozinho (ambiente) | sim | 82 | 0.46 | sim | sim |
| cat_derrubarObjeto | sozinho (ambiente) | sim | 63 | 0.47 | sim | sim |
| cat_derrubarObjeto~exagerado | sozinho (ambiente) | sim | 54 | 0.46 | sim | sim |
| cat_fugirBolhas~suave | sozinho (ambiente) | sim | 75 | 0.45 | sim | sim |
| cat_fugirBolhas | sozinho (ambiente) | sim | 58 | 0.48 | sim | sim |
| cat_fugirBolhas~exagerado | sozinho (ambiente) | sim | 49 | 1.26 | sim | sim |
| cat_rirEscondido~suave | sozinho (ambiente) | sim | 75 | 0.51 | sim | sim |
| cat_rirEscondido | sozinho (ambiente) | sim | 58 | 0.50 | sim | sim |
| cat_rirEscondido~exagerado | sozinho (ambiente) | sim | 49 | 0.50 | sim | sim |
| cat_espiarUmOlho~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 75 | 0.47 | sim | sim |
| cat_espiarUmOlho | sozinho (ambiente), código (conversa/foco/evento) | sim | 58 | 0.44 | sim | sim |
| cat_espiarUmOlho~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 49 | 0.85 | sim | sim |
| cat_sustoBorda~suave | sozinho (ambiente) | sim | 69 | 0.52 | sim | sim |
| cat_sustoBorda | sozinho (ambiente) | sim | 53 | 0.50 | sim | sim |
| cat_sustoBorda~exagerado | sozinho (ambiente) | sim | 45 | 0.50 | sim | sim |
| cat_dorsalTela~suave | sozinho (ambiente) | sim | 156 | 0.44 | sim | sim |
| cat_dorsalTela | sozinho (ambiente) | sim | 120 | 0.42 | sim | sim |
| cat_dorsalTela~exagerado | sozinho (ambiente) | sim | 103 | 0.44 | sim | sim |
| cat_pregarPeca~suave | sozinho (ambiente) | sim | 82 | 0.50 | sim | sim |
| cat_pregarPeca | sozinho (ambiente) | sim | 63 | 0.53 | sim | sim |
| cat_pregarPeca~exagerado | sozinho (ambiente) | sim | 54 | 0.47 | sim | sim |
| cat_roubarFoco~suave | sozinho (ambiente) | sim | 82 | 0.47 | sim | sim |
| cat_roubarFoco | sozinho (ambiente) | sim | 63 | 0.46 | sim | sim |
| cat_roubarFoco~exagerado | sozinho (ambiente) | sim | 54 | 0.46 | sim | sim |
| cat_baguncarJanela~suave | sozinho (ambiente) | sim | 75 | 0.47 | sim | sim |
| cat_baguncarJanela | sozinho (ambiente) | sim | 58 | 0.47 | sim | sim |
| cat_baguncarJanela~exagerado | sozinho (ambiente) | sim | 49 | 0.45 | sim | sim |
| cat_perseguirBolha~suave | sozinho (ambiente) | sim | 100 | 0.47 | sim | sim |
| cat_perseguirBolha | sozinho (ambiente) | sim | 77 | 0.46 | sim | sim |
| cat_perseguirBolha~exagerado | sozinho (ambiente) | sim | 66 | 0.46 | sim | sim |
| cat_peixeBorracha~suave | sozinho (ambiente) | sim | 94 | 0.69 | sim | sim |
| cat_peixeBorracha | sozinho (ambiente) | sim | 73 | 0.51 | sim | sim |
| cat_peixeBorracha~exagerado | sozinho (ambiente) | sim | 62 | 0.49 | sim | sim |
| cat_baterBorda~suave | sozinho (ambiente) | sim | 82 | 0.43 | sim | sim |
| cat_baterBorda | sozinho (ambiente) | sim | 63 | 0.62 | sim | sim |
| cat_baterBorda~exagerado | sozinho (ambiente) | sim | 54 | 0.39 | sim | sim |
| cat_morderIcone~suave | sozinho (ambiente) | sim | 69 | 0.51 | sim | sim |
| cat_morderIcone | sozinho (ambiente) | sim | 53 | 0.52 | sim | sim |
| cat_morderIcone~exagerado | sozinho (ambiente) | sim | 45 | 0.50 | sim | sim |
| cat_zombar~suave | sozinho (ambiente) | sim | 69 | 0.45 | sim | sim |
| cat_zombar | sozinho (ambiente) | sim | 53 | 0.68 | sim | sim |
| cat_zombar~exagerado | sozinho (ambiente) | sim | 45 | 0.41 | sim | sim |
| cat_imitar~suave | sozinho (ambiente), frase | sim | 88 | 0.44 | sim | sim |
| cat_imitar | sozinho (ambiente), frase | sim | 68 | 0.45 | sim | sim |
| cat_imitar~exagerado | sozinho (ambiente), frase | sim | 58 | 0.45 | sim | sim |
| cat_linguaVitoria~suave | evento | sim | 63 | 0.47 | sim | sim |
| cat_linguaVitoria | evento | sim | 48 | 0.42 | sim | sim |
| cat_linguaVitoria~exagerado | evento | sim | 41 | 0.43 | sim | sim |
| cat_dancaVitoria~suave | evento, código (conversa/foco/evento) | sim | 94 | 0.44 | sim | sim |
| cat_dancaVitoria | evento, código (conversa/foco/evento) | sim | 73 | 0.42 | sim | sim |
| cat_dancaVitoria~exagerado | evento, código (conversa/foco/evento) | sim | 62 | 1.00 | sim | sim |
| cat_sabiaQueIaErrar~suave | evento, código (conversa/foco/evento) | sim | 75 | 0.47 | sim | sim |
| cat_sabiaQueIaErrar | evento, código (conversa/foco/evento) | sim | 58 | 0.44 | sim | sim |
| cat_sabiaQueIaErrar~exagerado | evento, código (conversa/foco/evento) | sim | 49 | 0.47 | sim | sim |
| cat_apostar~suave | sozinho (ambiente), frase | sim | 75 | 0.46 | sim | sim |
| cat_apostar | sozinho (ambiente), frase | sim | 58 | 0.46 | sim | sim |
| cat_apostar~exagerado | sozinho (ambiente), frase | sim | 49 | 0.98 | sim | sim |
| cat_quedaBraco~suave | sozinho (ambiente), frase | sim | 88 | 0.50 | sim | sim |
| cat_quedaBraco | sozinho (ambiente), frase | sim | 68 | 0.49 | sim | sim |
| cat_quedaBraco~exagerado | sozinho (ambiente), frase | sim | 58 | 0.51 | sim | sim |
| cat_surpresaSarcastica~suave | sozinho (ambiente) | sim | 75 | 0.89 | sim | sim |
| cat_surpresaSarcastica | sozinho (ambiente) | sim | 58 | 0.45 | sim | sim |
| cat_surpresaSarcastica~exagerado | sozinho (ambiente) | sim | 49 | 0.46 | sim | sim |
| cat_aplausoLento~suave | sozinho (ambiente) | sim | 100 | 0.53 | sim | sim |
| cat_aplausoLento | sozinho (ambiente) | sim | 77 | 0.48 | sim | sim |
| cat_aplausoLento~exagerado | sozinho (ambiente) | sim | 66 | 0.46 | sim | sim |
| cat_tchauIronico~suave | sozinho (ambiente) | sim | 69 | 0.44 | sim | sim |
| cat_tchauIronico | sozinho (ambiente) | sim | 53 | 0.44 | sim | sim |
| cat_tchauIronico~exagerado | sozinho (ambiente) | sim | 45 | 0.43 | sim | sim |
| cat_devorar~suave | sozinho (ambiente) | sim | 94 | 0.44 | sim | sim |
| cat_devorar | sozinho (ambiente) | sim | 73 | 0.46 | sim | sim |
| cat_devorar~exagerado | sozinho (ambiente) | sim | 62 | 1.58 | sim | sim |
| cat_lamberDentes~suave | sozinho (ambiente) | sim | 63 | 0.44 | sim | sim |
| cat_lamberDentes | sozinho (ambiente) | sim | 48 | 0.45 | sim | sim |
| cat_lamberDentes~exagerado | sozinho (ambiente) | sim | 41 | 0.47 | sim | sim |
| cat_rostoSujo~suave | sozinho (ambiente) | sim | 88 | 0.47 | sim | sim |
| cat_rostoSujo | sozinho (ambiente) | sim | 68 | 0.73 | sim | sim |
| cat_rostoSujo~exagerado | sozinho (ambiente) | sim | 58 | 0.89 | sim | sim |
| cat_roubarComida~suave | sozinho (ambiente) | sim | 88 | 0.47 | sim | sim |
| cat_roubarComida | sozinho (ambiente) | sim | 68 | 0.46 | sim | sim |
| cat_roubarComida~exagerado | sozinho (ambiente) | sim | 58 | 0.43 | sim | sim |
| cat_engolirTudo~suave | sozinho (ambiente) | sim | 75 | 0.51 | sim | sim |
| cat_engolirTudo | sozinho (ambiente) | sim | 58 | 1.01 | sim | sim |
| cat_engolirTudo~exagerado | sozinho (ambiente) | sim | 49 | 0.51 | sim | sim |
| cat_festaSozinho~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 113 | 0.64 | sim | sim |
| cat_festaSozinho | sozinho (ambiente), código (conversa/foco/evento) | sim | 87 | 0.51 | sim | sim |
| cat_festaSozinho~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 74 | 0.62 | sim | sim |
| cat_dancarSemRitmo~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 107 | 0.37 | sim | sim |
| cat_dancarSemRitmo | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 0.49 | sim | sim |
| cat_dancarSemRitmo~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 70 | 0.52 | sim | sim |
| cat_cantarDesafinado~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 107 | 0.49 | sim | sim |
| cat_cantarDesafinado | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 0.33 | sim | sim |
| cat_cantarDesafinado~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 70 | 0.35 | sim | sim |
| cat_karaoke~suave | sozinho (ambiente), frase | sim | 132 | 0.51 | sim | sim |
| cat_karaoke | sozinho (ambiente), frase | sim | 101 | 0.65 | sim | sim |
| cat_karaoke~exagerado | sozinho (ambiente), frase | sim | 86 | 0.37 | sim | sim |
| cat_puloOndas~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 75 | 0.38 | sim | sim |
| cat_puloOndas | sozinho (ambiente), código (conversa/foco/evento) | sim | 58 | 0.61 | sim | sim |
| cat_puloOndas~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 49 | 0.66 | sim | sim |
| cat_comerPeixinhos~suave | sozinho (ambiente) | sim | 100 | 0.37 | sim | sim |
| cat_comerPeixinhos | sozinho (ambiente) | sim | 77 | 0.33 | sim | sim |
| cat_comerPeixinhos~exagerado | sozinho (ambiente) | sim | 66 | 0.31 | sim | sim |
| cat_beberAquario~suave | sozinho (ambiente) | sim | 88 | 0.54 | sim | sim |
| cat_beberAquario | sozinho (ambiente) | sim | 68 | 0.72 | sim | sim |
| cat_beberAquario~exagerado | sozinho (ambiente) | sim | 58 | 0.41 | sim | sim |
| cat_cafeOlhando~suave | sozinho (ambiente) | sim | 100 | 0.31 | sim | sim |
| cat_cafeOlhando | sozinho (ambiente) | sim | 77 | 0.32 | sim | sim |
| cat_cafeOlhando~exagerado | sozinho (ambiente) | sim | 66 | 0.30 | sim | sim |
| cat_pedirComida~suave | sozinho (ambiente) | sim | 82 | 0.75 | sim | sim |
| cat_pedirComida | sozinho (ambiente) | sim | 63 | 0.33 | sim | sim |
| cat_pedirComida~exagerado | sozinho (ambiente) | sim | 54 | 0.55 | sim | sim |
| cat_semFiltro~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 32 | 0.45 | sim | sim |
| cat_semFiltro | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 25 | 0.51 | sim | sim |
| cat_semFiltro~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 21 | 0.62 | sim | sim |
| cat_confissao~suave | sozinho (ambiente) | sim | 94 | 0.79 | sim | sim |
| cat_confissao | sozinho (ambiente) | sim | 73 | 0.73 | sim | sim |
| cat_confissao~exagerado | sozinho (ambiente) | sim | 62 | 0.55 | sim | sim |
| cat_horaDaVerdade~suave | sozinho (ambiente), frase | sim | 94 | 0.58 | sim | sim |
| cat_horaDaVerdade | sozinho (ambiente), frase | sim | 73 | 0.56 | sim | sim |
| cat_horaDaVerdade~exagerado | sozinho (ambiente), frase | sim | 62 | 1.44 | sim | sim |
| cat_surtoCarencia~suave | sozinho (ambiente), evento | sim | 100 | 0.43 | sim | sim |
| cat_surtoCarencia | sozinho (ambiente), evento | sim | 77 | 0.36 | sim | sim |
| cat_surtoCarencia~exagerado | sozinho (ambiente), evento | sim | 66 | 0.39 | sim | sim |
| cat_dancinhaViral~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 100 | 0.39 | sim | sim |
| cat_dancinhaViral | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 77 | 0.58 | sim | sim |
| cat_dancinhaViral~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 66 | 0.29 | sim | sim |
| cat_criseRiso~suave | sozinho (ambiente) | sim | 113 | 0.38 | sim | sim |
| cat_criseRiso | sozinho (ambiente) | sim | 87 | 0.53 | sim | sim |
| cat_criseRiso~exagerado | sozinho (ambiente) | sim | 74 | 0.44 | sim | sim |
| cat_modoFera~suave | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 113 | 0.33 | sim | sim |
| cat_modoFera | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 87 | 0.36 | sim | sim |
| cat_modoFera~exagerado | sozinho (ambiente), frase, código (conversa/foco/evento) | sim | 74 | 0.34 | sim | sim |
| cat_fantasma~suave | sozinho (ambiente) | sim | 156 | 0.37 | sim | sim |
| cat_fantasma | sozinho (ambiente) | sim | 120 | 0.31 | sim | sim |
| cat_fantasma~exagerado | sozinho (ambiente) | sim | 103 | 0.48 | sim | sim |
| cat_nadoSincronizado~suave | sozinho (ambiente) | sim | 125 | 0.42 | sim | sim |
| cat_nadoSincronizado | sozinho (ambiente) | sim | 97 | 0.33 | sim | sim |
| cat_nadoSincronizado~exagerado | sozinho (ambiente) | sim | 82 | 0.54 | sim | sim |
| cat_acordarAssustado~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 82 | 1.04 | sim | sim |
| cat_acordarAssustado | sozinho (ambiente), código (conversa/foco/evento) | sim | 63 | 0.41 | sim | sim |
| cat_acordarAssustado~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 54 | 0.30 | sim | sim |
| cat_cochilarBoiando~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 156 | 0.41 | sim | sim |
| cat_cochilarBoiando | sozinho (ambiente), código (conversa/foco/evento) | sim | 120 | 0.53 | sim | sim |
| cat_cochilarBoiando~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 103 | 0.38 | sim | sim |
| cat_dormirRonco~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 175 | 0.40 | sim | sim |
| cat_dormirRonco | sozinho (ambiente), código (conversa/foco/evento) | sim | 135 | 0.52 | sim | sim |
| cat_dormirRonco~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 115 | 0.39 | sim | sim |
| cat_madrugada~suave | sozinho (ambiente) | sim | 150 | 0.37 | sim | sim |
| cat_madrugada | sozinho (ambiente) | sim | 116 | 0.40 | sim | sim |
| cat_madrugada~exagerado | sozinho (ambiente) | sim | 98 | 0.34 | sim | sim |
| cat_ajeitarPostura~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 63 | 0.36 | sim | sim |
| cat_ajeitarPostura | sozinho (ambiente), código (conversa/foco/evento) | sim | 48 | 0.50 | sim | sim |
| cat_ajeitarPostura~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 41 | 1.66 | sim | sim |
| cat_nadarCirculos~suave | sozinho (ambiente) | sim | 144 | 0.39 | sim | sim |
| cat_nadarCirculos | sozinho (ambiente) | sim | 111 | 0.35 | sim | sim |
| cat_nadarCirculos~exagerado | sozinho (ambiente) | sim | 94 | 0.48 | sim | sim |
| cat_nadarCanto~suave | sozinho (ambiente) | sim | 113 | 0.36 | sim | sim |
| cat_nadarCanto | sozinho (ambiente) | sim | 87 | 0.34 | sim | sim |
| cat_nadarCanto~exagerado | sozinho (ambiente) | sim | 74 | 0.37 | sim | sim |
| cat_elogioSilencio~suave | sozinho (ambiente) | sim | 75 | 1.02 | sim | sim |
| cat_elogioSilencio | sozinho (ambiente) | sim | 58 | 0.38 | sim | sim |
| cat_elogioSilencio~exagerado | sozinho (ambiente) | sim | 49 | 0.35 | sim | sim |
| cat_motivacaoAcademia~suave | sozinho (ambiente) | sim | 82 | 0.33 | sim | sim |
| cat_motivacaoAcademia | sozinho (ambiente) | sim | 63 | 0.37 | sim | sim |
| cat_motivacaoAcademia~exagerado | sozinho (ambiente) | sim | 54 | 0.49 | sim | sim |
| cat_torcer~suave | sozinho (ambiente) | sim | 75 | 0.40 | sim | sim |
| cat_torcer | sozinho (ambiente) | sim | 58 | 0.31 | sim | sim |
| cat_torcer~exagerado | sozinho (ambiente) | sim | 49 | 0.31 | sim | sim |
| cat_nojo~suave | código (conversa/foco/evento) | sim | 100 | 0.35 | sim | sim |
| cat_nojo | código (conversa/foco/evento) | sim | 77 | 0.84 | sim | sim |
| cat_nojo~exagerado | código (conversa/foco/evento) | sim | 66 | 0.37 | sim | sim |
| cat_tesouro~suave | sozinho (ambiente) | sim | 94 | 0.34 | sim | sim |
| cat_tesouro | sozinho (ambiente) | sim | 73 | 0.31 | sim | sim |
| cat_tesouro~exagerado | sozinho (ambiente) | sim | 62 | 0.38 | sim | sim |
| cat_ritmo~suave | frase, código (conversa/foco/evento) | sim | 125 | 0.51 | sim | sim |
| cat_ritmo | frase, código (conversa/foco/evento) | sim | 97 | 0.30 | sim | sim |
| cat_ritmo~exagerado | frase, código (conversa/foco/evento) | sim | 82 | 0.30 | sim | sim |
| cat_calma~suave | frase, código (conversa/foco/evento) | sim | 188 | 0.44 | sim | sim |
| cat_calma | frase, código (conversa/foco/evento) | sim | 144 | 0.36 | sim | sim |
| cat_calma~exagerado | frase, código (conversa/foco/evento) | sim | 123 | 0.39 | sim | sim |
| cat_fidget~suave | sozinho (ambiente), código (conversa/foco/evento) | sim | 29 | 0.33 | sim | sim |
| cat_fidget | sozinho (ambiente), código (conversa/foco/evento) | sim | 22 | 0.33 | sim | sim |
| cat_fidget~exagerado | sozinho (ambiente), código (conversa/foco/evento) | sim | 19 | 0.34 | sim | sim |
| cat_estudarJunto~suave | código (conversa/foco/evento) | sim | 188 | 0.31 | sim | sim |
| cat_estudarJunto | código (conversa/foco/evento) | sim | 144 | 0.61 | sim | sim |
| cat_estudarJunto~exagerado | código (conversa/foco/evento) | sim | 123 | 0.32 | sim | sim |
| cat_treinarJunto~suave | código (conversa/foco/evento) | sim | 125 | 0.32 | sim | sim |
| cat_treinarJunto | código (conversa/foco/evento) | sim | 97 | 0.47 | sim | sim |
| cat_treinarJunto~exagerado | código (conversa/foco/evento) | sim | 82 | 0.31 | sim | sim |
| cat_pk_sideEye~suave | pacote memes, sozinho (ambiente), frase, evento | sim | 132 | 0.36 | sim | sim |
| cat_pk_sideEye | pacote memes, sozinho (ambiente), frase, evento | sim | 101 | 0.42 | sim | sim |
| cat_pk_sideEye~exagerado | pacote memes, sozinho (ambiente), frase, evento | sim | 86 | 0.49 | sim | sim |
| cat_pk_chillGuy~suave | pacote memes, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 175 | 0.36 | sim | sim |
| cat_pk_chillGuy | pacote memes, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 135 | 0.37 | sim | sim |
| cat_pk_chillGuy~exagerado | pacote memes, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 115 | 0.35 | sim | sim |
| cat_pk_auraFarming~suave | pacote memes, frase, evento | sim | 203 | 0.39 | sim | sim |
| cat_pk_auraFarming | pacote memes, frase, evento | sim | 156 | 0.37 | sim | sim |
| cat_pk_auraFarming~exagerado | pacote memes, frase, evento | sim | 133 | 0.35 | sim | sim |
| cat_pk_letHimCook~suave | pacote memes, frase, evento, código (conversa/foco/evento) | sim | 156 | 0.72 | sim | sim |
| cat_pk_letHimCook | pacote memes, frase, evento, código (conversa/foco/evento) | sim | 120 | 0.48 | sim | sim |
| cat_pk_letHimCook~exagerado | pacote memes, frase, evento, código (conversa/foco/evento) | sim | 103 | 0.51 | sim | sim |
| cat_pk_broCooked~suave | pacote memes, frase, evento | sim | 150 | 0.68 | sim | sim |
| cat_pk_broCooked | pacote memes, frase, evento | sim | 116 | 0.50 | sim | sim |
| cat_pk_broCooked~exagerado | pacote memes, frase, evento | sim | 98 | 0.54 | sim | sim |
| cat_pk_sixSeven~suave | pacote memes, frase, evento | sim | 100 | 0.56 | sim | sim |
| cat_pk_sixSeven | pacote memes, frase, evento | sim | 77 | 0.54 | sim | sim |
| cat_pk_sixSeven~exagerado | pacote memes, frase, evento | sim | 66 | 0.53 | sim | sim |
| cat_pk_brainrot~suave | pacote memes, sozinho (ambiente), frase, evento | sim | 213 | 0.59 | sim | sim |
| cat_pk_brainrot | pacote memes, sozinho (ambiente), frase, evento | sim | 164 | 0.62 | sim | sim |
| cat_pk_brainrot~exagerado | pacote memes, sozinho (ambiente), frase, evento | sim | 139 | 0.74 | sim | sim |
| cat_pk_npc~suave | pacote memes, sozinho (ambiente), frase, evento | sim | 219 | 0.62 | sim | sim |
| cat_pk_npc | pacote memes, sozinho (ambiente), frase, evento | sim | 168 | 0.64 | sim | sim |
| cat_pk_npc~exagerado | pacote memes, sozinho (ambiente), frase, evento | sim | 143 | 0.40 | sim | sim |
| cat_pk_demure~suave | pacote memes, sozinho (ambiente), frase, evento | sim | 156 | 0.45 | sim | sim |
| cat_pk_demure | pacote memes, sozinho (ambiente), frase, evento | sim | 120 | 0.46 | sim | sim |
| cat_pk_demure~exagerado | pacote memes, sozinho (ambiente), frase, evento | sim | 103 | 0.31 | sim | sim |
| cat_pk_gta6~suave | pacote memes, frase, evento | sim | 172 | 0.55 | sim | sim |
| cat_pk_gta6 | pacote memes, frase, evento | sim | 132 | 0.34 | sim | sim |
| cat_pk_gta6~exagerado | pacote memes, frase, evento | sim | 113 | 0.43 | sim | sim |
| cat_pk_menacing~suave | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 203 | 0.82 | sim | sim |
| cat_pk_menacing | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 156 | 0.38 | sim | sim |
| cat_pk_menacing~exagerado | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 133 | 0.54 | sim | sim |
| cat_pk_ultraInstinto~suave | pacote anime, sozinho (ambiente), frase, evento | sim | 250 | 0.39 | sim | sim |
| cat_pk_ultraInstinto | pacote anime, sozinho (ambiente), frase, evento | sim | 192 | 0.44 | sim | sim |
| cat_pk_ultraInstinto~exagerado | pacote anime, sozinho (ambiente), frase, evento | sim | 164 | 0.36 | sim | sim |
| cat_pk_berserker~suave | pacote anime, frase, evento | sim | 297 | 0.52 | sim | sim |
| cat_pk_berserker | pacote anime, frase, evento | sim | 228 | 0.45 | sim | sim |
| cat_pk_berserker~exagerado | pacote anime, frase, evento | sim | 194 | 0.42 | sim | sim |
| cat_pk_dominio~suave | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 266 | 0.40 | sim | sim |
| cat_pk_dominio | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 204 | 0.49 | sim | sim |
| cat_pk_dominio~exagerado | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 174 | 0.33 | sim | sim |
| cat_pk_sharingan~suave | pacote anime, sozinho (ambiente), frase, evento | sim | 172 | 0.48 | sim | sim |
| cat_pk_sharingan | pacote anime, sozinho (ambiente), frase, evento | sim | 132 | 0.31 | sim | sim |
| cat_pk_sharingan~exagerado | pacote anime, sozinho (ambiente), frase, evento | sim | 113 | 0.38 | sim | sim |
| cat_pk_haki~suave | pacote anime, sozinho (ambiente), frase, evento | sim | 234 | 0.47 | sim | sim |
| cat_pk_haki | pacote anime, sozinho (ambiente), frase, evento | sim | 180 | 0.45 | sim | sim |
| cat_pk_haki~exagerado | pacote anime, sozinho (ambiente), frase, evento | sim | 153 | 0.39 | sim | sim |
| cat_pk_bankai~suave | pacote anime, sozinho (ambiente), frase, evento | sim | 250 | 0.51 | sim | sim |
| cat_pk_bankai | pacote anime, sozinho (ambiente), frase, evento | sim | 192 | 0.38 | sim | sim |
| cat_pk_bankai~exagerado | pacote anime, sozinho (ambiente), frase, evento | sim | 164 | 0.48 | sim | sim |
| cat_pk_serio~suave | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 156 | 0.34 | sim | sim |
| cat_pk_serio | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 120 | 0.43 | sim | sim |
| cat_pk_serio~exagerado | pacote anime, sozinho (ambiente), frase, evento, código (conversa/foco/evento) | sim | 103 | 0.56 | sim | sim |
| cat_pk_rumbling~suave | pacote anime, frase, evento | sim | 281 | 0.38 | sim | sim |
| cat_pk_rumbling | pacote anime, frase, evento | sim | 216 | 0.37 | sim | sim |
| cat_pk_rumbling~exagerado | pacote anime, frase, evento | sim | 184 | 0.49 | sim | sim |
| cat_pk_arise~suave | pacote anime, sozinho (ambiente), frase, evento | sim | 250 | 0.35 | sim | sim |
| cat_pk_arise | pacote anime, sozinho (ambiente), frase, evento | sim | 192 | 0.41 | sim | sim |
| cat_pk_arise~exagerado | pacote anime, sozinho (ambiente), frase, evento | sim | 164 | 0.35 | sim | sim |
| cat_pk_traicao~suave | pacote comida | sim | 266 | 0.42 | sim | sim |
| cat_pk_traicao | pacote comida | sim | 204 | 0.42 | sim | sim |
| cat_pk_traicao~exagerado | pacote comida | sim | 174 | 0.37 | sim | sim |
| cat_pk_traicao_leve~suave | pacote comida | sim | 266 | 0.60 | sim | sim |
| cat_pk_traicao_leve | pacote comida | sim | 204 | 0.35 | sim | sim |
| cat_pk_traicao_leve~exagerado | pacote comida | sim | 174 | 0.37 | sim | sim |
| cat_pk_nuclear~suave | pacote comida | sim | 313 | 0.54 | sim | sim |
| cat_pk_nuclear | pacote comida | sim | 241 | 0.47 | sim | sim |
| cat_pk_nuclear~exagerado | pacote comida | sim | 204 | 0.39 | sim | sim |
| cat_pk_nuclear_leve~suave | pacote comida | sim | 313 | 0.42 | sim | sim |
| cat_pk_nuclear_leve | pacote comida | sim | 241 | 0.34 | sim | sim |
| cat_pk_nuclear_leve~exagerado | pacote comida | sim | 204 | 0.36 | sim | sim |
| cat_pk_furiaFritas~suave | pacote comida | sim | 313 | 0.42 | sim | sim |
| cat_pk_furiaFritas | pacote comida | sim | 241 | 0.42 | sim | sim |
| cat_pk_furiaFritas~exagerado | pacote comida | sim | 204 | 0.37 | sim | sim |
| cat_pk_furiaFritas_leve~suave | pacote comida | sim | 313 | 0.37 | sim | sim |
| cat_pk_furiaFritas_leve | pacote comida | sim | 241 | 0.42 | sim | sim |
| cat_pk_furiaFritas_leve~exagerado | pacote comida | sim | 204 | 0.52 | sim | sim |
| cat_pk_decepcao~suave | pacote comida | sim | 234 | 0.37 | sim | sim |
| cat_pk_decepcao | pacote comida | sim | 180 | 0.65 | sim | sim |
| cat_pk_decepcao~exagerado | pacote comida | sim | 153 | 0.38 | sim | sim |
| cat_pk_decepcao_leve~suave | pacote comida | sim | 234 | 0.48 | sim | sim |
| cat_pk_decepcao_leve | pacote comida | sim | 180 | 0.36 | sim | sim |
| cat_pk_decepcao_leve~exagerado | pacote comida | sim | 153 | 0.51 | sim | sim |
| cat_pk_semDesculpas~suave | pacote comida | sim | 297 | 0.35 | sim | sim |
| cat_pk_semDesculpas | pacote comida | sim | 228 | 0.44 | sim | sim |
| cat_pk_semDesculpas~exagerado | pacote comida | sim | 194 | 0.40 | sim | sim |
| cat_pk_semDesculpas_leve~suave | pacote comida | sim | 297 | 0.30 | sim | sim |
| cat_pk_semDesculpas_leve | pacote comida | sim | 228 | 0.37 | sim | sim |
| cat_pk_semDesculpas_leve~exagerado | pacote comida | sim | 194 | 0.29 | sim | sim |
| cat_pk_milAnos~suave | pacote comida | sim | 219 | 0.33 | sim | sim |
| cat_pk_milAnos | pacote comida | sim | 168 | 0.38 | sim | sim |
| cat_pk_milAnos~exagerado | pacote comida | sim | 143 | 0.29 | sim | sim |
| cat_pk_milAnos_leve~suave | pacote comida | sim | 219 | 0.32 | sim | sim |
| cat_pk_milAnos_leve | pacote comida | sim | 168 | 0.53 | sim | sim |
| cat_pk_milAnos_leve~exagerado | pacote comida | sim | 143 | 0.32 | sim | sim |
| cat_pk_chefeFinal~suave | pacote comida | sim | 344 | 0.42 | sim | sim |
| cat_pk_chefeFinal | pacote comida | sim | 265 | 0.53 | sim | sim |
| cat_pk_chefeFinal~exagerado | pacote comida | sim | 225 | 0.53 | sim | sim |
| cat_pk_chefeFinal_leve~suave | pacote comida | sim | 344 | 0.31 | sim | sim |
| cat_pk_chefeFinal_leve | pacote comida | sim | 265 | 0.32 | sim | sim |
| cat_pk_chefeFinal_leve~exagerado | pacote comida | sim | 225 | 0.58 | sim | sim |
| cat_pk_crise~suave | pacote comida | sim | 266 | 0.36 | sim | sim |
| cat_pk_crise | pacote comida | sim | 204 | 0.32 | sim | sim |
| cat_pk_crise~exagerado | pacote comida | sim | 174 | 0.42 | sim | sim |
| cat_pk_crise_leve~suave | pacote comida | sim | 266 | 0.34 | sim | sim |
| cat_pk_crise_leve | pacote comida | sim | 204 | 0.29 | sim | sim |
| cat_pk_crise_leve~exagerado | pacote comida | sim | 174 | 0.41 | sim | sim |
| cat_pk_interrogatorio~suave | pacote comida | sim | 266 | 0.39 | sim | sim |
| cat_pk_interrogatorio | pacote comida | sim | 204 | 0.42 | sim | sim |
| cat_pk_interrogatorio~exagerado | pacote comida | sim | 174 | 0.37 | sim | sim |
| cat_pk_interrogatorio_leve~suave | pacote comida | sim | 266 | 0.53 | sim | sim |
| cat_pk_interrogatorio_leve | pacote comida | sim | 204 | 0.39 | sim | sim |
| cat_pk_interrogatorio_leve~exagerado | pacote comida | sim | 174 | 0.34 | sim | sim |
| cat_pk_colapso~suave | pacote comida | sim | 406 | 0.48 | sim | sim |
| cat_pk_colapso | pacote comida | sim | 313 | 0.52 | sim | sim |
| cat_pk_colapso~exagerado | pacote comida | sim | 266 | 0.38 | sim | sim |
| cat_pk_colapso_leve~suave | pacote comida | sim | 406 | 0.35 | sim | sim |
| cat_pk_colapso_leve | pacote comida | sim | 313 | 0.45 | sim | sim |
| cat_pk_colapso_leve~exagerado | pacote comida | sim | 266 | 0.42 | sim | sim |
| cat_pk_operacao~suave | pacote namorado | sim | 281 | 0.52 | sim | sim |
| cat_pk_operacao | pacote namorado | sim | 216 | 0.37 | sim | sim |
| cat_pk_operacao~exagerado | pacote namorado | sim | 184 | 0.45 | sim | sim |
| cat_pk_libido~suave | pacote namorado | sim | 297 | 0.44 | sim | sim |
| cat_pk_libido | pacote namorado | sim | 228 | 0.39 | sim | sim |
| cat_pk_libido~exagerado | pacote namorado | sim | 194 | 0.60 | sim | sim |
| cat_pk_inseminacao~suave | pacote namorado | sim | 313 | 0.39 | sim | sim |
| cat_pk_inseminacao | pacote namorado | sim | 241 | 0.40 | sim | sim |
| cat_pk_inseminacao~exagerado | pacote namorado | sim | 204 | 0.60 | sim | sim |
| cat_pk_namoradoPerigo~suave | pacote namorado | sim | 266 | 0.37 | sim | sim |
| cat_pk_namoradoPerigo | pacote namorado | sim | 204 | 0.36 | sim | sim |
| cat_pk_namoradoPerigo~exagerado | pacote namorado | sim | 174 | 0.47 | sim | sim |
| cat_pk_quarto~suave | pacote namorado | sim | 313 | 0.38 | sim | sim |
| cat_pk_quarto | pacote namorado | sim | 241 | 0.36 | sim | sim |
| cat_pk_quarto~exagerado | pacote namorado | sim | 204 | 0.52 | sim | sim |
| cat_pk_checklist~suave | pacote namorado | sim | 250 | 0.38 | sim | sim |
| cat_pk_checklist | pacote namorado | sim | 192 | 0.33 | sim | sim |
| cat_pk_checklist~exagerado | pacote namorado | sim | 164 | 0.48 | sim | sim |
| cat_pk_ciumes~suave | pacote namorado | sim | 281 | 0.38 | sim | sim |
| cat_pk_ciumes | pacote namorado | sim | 216 | 0.37 | sim | sim |
| cat_pk_ciumes~exagerado | pacote namorado | sim | 184 | 0.44 | sim | sim |
| cat_pk_noitePromete~suave | pacote namorado | sim | 297 | 0.41 | sim | sim |
| cat_pk_noitePromete | pacote namorado | sim | 228 | 0.36 | sim | sim |
| cat_pk_noitePromete~exagerado | pacote namorado | sim | 194 | 0.38 | sim | sim |
| cat_pk_relatorio~suave | pacote namorado | sim | 281 | 0.35 | sim | sim |
| cat_pk_relatorio | pacote namorado | sim | 216 | 0.33 | sim | sim |
| cat_pk_relatorio~exagerado | pacote namorado | sim | 184 | 0.55 | sim | sim |
| cat_pk_mudanca~suave | pacote namorado | sim | 406 | 0.40 | sim | sim |
| cat_pk_mudanca | pacote namorado | sim | 313 | 0.52 | sim | sim |
| cat_pk_mudanca~exagerado | pacote namorado | sim | 266 | 0.47 | sim | sim |
| cat_pk_jMencao~suave | pacote joao, código (conversa/foco/evento) | sim | 188 | 0.32 | sim | sim |
| cat_pk_jMencao | pacote joao, código (conversa/foco/evento) | sim | 144 | 0.32 | sim | sim |
| cat_pk_jMencao~exagerado | pacote joao, código (conversa/foco/evento) | sim | 123 | 0.36 | sim | sim |
| cat_pk_jMensagem~suave | pacote joao | sim | 203 | 0.43 | sim | sim |
| cat_pk_jMensagem | pacote joao | sim | 156 | 0.52 | sim | sim |
| cat_pk_jMensagem~exagerado | pacote joao | sim | 133 | 0.33 | sim | sim |
| cat_pk_jPeregrinacao~suave | pacote joao | sim | 281 | 0.43 | sim | sim |
| cat_pk_jPeregrinacao | pacote joao | sim | 216 | 0.39 | sim | sim |
| cat_pk_jPeregrinacao~exagerado | pacote joao | sim | 184 | 0.39 | sim | sim |
| cat_pk_jSaudade~suave | pacote joao | sim | 203 | 0.49 | sim | sim |
| cat_pk_jSaudade | pacote joao | sim | 156 | 0.35 | sim | sim |
| cat_pk_jSaudade~exagerado | pacote joao | sim | 133 | 0.42 | sim | sim |
| cat_pk_jChegando~suave | pacote joao | sim | 234 | 0.40 | sim | sim |
| cat_pk_jChegando | pacote joao | sim | 180 | 0.50 | sim | sim |
| cat_pk_jChegando~exagerado | pacote joao | sim | 153 | 0.41 | sim | sim |
| cat_pk_jDevocao~suave | pacote joao | sim | 266 | 0.44 | sim | sim |
| cat_pk_jDevocao | pacote joao | sim | 204 | 0.42 | sim | sim |
| cat_pk_jDevocao~exagerado | pacote joao | sim | 174 | 0.39 | sim | sim |
| cat_pk_jJulgamento~suave | pacote joao | sim | 234 | 0.42 | sim | sim |
| cat_pk_jJulgamento | pacote joao | sim | 180 | 0.34 | sim | sim |
| cat_pk_jJulgamento~exagerado | pacote joao | sim | 153 | 0.39 | sim | sim |
| cat_pk_jElogio~suave | pacote joao | sim | 219 | 0.44 | sim | sim |
| cat_pk_jElogio | pacote joao | sim | 168 | 0.36 | sim | sim |
| cat_pk_jElogio~exagerado | pacote joao | sim | 143 | 0.37 | sim | sim |
| cat_pk_jHeresia~suave | pacote joao | sim | 219 | 0.43 | sim | sim |
| cat_pk_jHeresia | pacote joao | sim | 168 | 0.59 | sim | sim |
| cat_pk_jHeresia~exagerado | pacote joao | sim | 143 | 0.37 | sim | sim |
| cat_pk_jApoteose~suave | pacote joao | sim | 406 | 0.38 | sim | sim |
| cat_pk_jApoteose | pacote joao | sim | 313 | 0.38 | sim | sim |
| cat_pk_jApoteose~exagerado | pacote joao | sim | 266 | 0.34 | sim | sim |
| cat_ddAventureiro~suave | frase, evento | sim | 132 | 0.32 | sim | sim |
| cat_ddAventureiro | frase, evento | sim | 101 | 0.43 | sim | sim |
| cat_ddAventureiro~exagerado | frase, evento | sim | 86 | 0.31 | sim | sim |
| cat_ddFurioso~suave | frase, evento | sim | 132 | 0.36 | sim | sim |
| cat_ddFurioso | frase, evento | sim | 101 | 0.60 | sim | sim |
| cat_ddFurioso~exagerado | frase, evento | sim | 86 | 0.36 | sim | sim |
| cat_ddXp~suave | frase, evento | sim | 132 | 0.39 | sim | sim |
| cat_ddXp | frase, evento | sim | 101 | 0.64 | sim | sim |
| cat_ddXp~exagerado | frase, evento | sim | 86 | 0.39 | sim | sim |
| cat_ddDesespero~suave | frase, evento | sim | 132 | 0.36 | sim | sim |
| cat_ddDesespero | frase, evento | sim | 101 | 0.40 | sim | sim |
| cat_ddDesespero~exagerado | frase, evento | sim | 86 | 0.35 | sim | sim |
| cat_ddConquista~suave | frase, evento | sim | 132 | 0.38 | sim | sim |
| cat_ddConquista | frase, evento | sim | 101 | 0.82 | sim | sim |
| cat_ddConquista~exagerado | frase, evento | sim | 86 | 0.38 | sim | sim |
| cat_needsFome~suave | evento | sim | 113 | 0.35 | sim | sim |
| cat_needsFome | evento | sim | 87 | 0.35 | sim | sim |
| cat_needsFome~exagerado | evento | sim | 74 | 0.36 | sim | sim |
| cat_needsExtrema~suave | evento | sim | 113 | 0.34 | sim | sim |
| cat_needsExtrema | evento | sim | 87 | 0.37 | sim | sim |
| cat_needsExtrema~exagerado | evento | sim | 74 | 0.33 | sim | sim |
| cat_needsRonco~suave | evento | sim | 113 | 0.32 | sim | sim |
| cat_needsRonco | evento | sim | 87 | 0.34 | sim | sim |
| cat_needsRonco~exagerado | evento | sim | 74 | 0.59 | sim | sim |
| cat_needsFraco~suave | evento | sim | 113 | 0.33 | sim | sim |
| cat_needsFraco | evento | sim | 87 | 0.35 | sim | sim |
| cat_needsFraco~exagerado | evento | sim | 74 | 0.72 | sim | sim |
| cat_needsDoente~suave | evento | sim | 113 | 0.34 | sim | sim |
| cat_needsDoente | evento | sim | 87 | 0.36 | sim | sim |
| cat_needsDoente~exagerado | evento | sim | 74 | 0.33 | sim | sim |
| cat_needsRecuperar~suave | evento | sim | 113 | 0.49 | sim | sim |
| cat_needsRecuperar | evento | sim | 87 | 0.35 | sim | sim |
| cat_needsRecuperar~exagerado | evento | sim | 74 | 0.40 | sim | sim |
| cat_needsPreCoco~suave | evento | sim | 113 | 0.50 | sim | sim |
| cat_needsPreCoco | evento | sim | 87 | 0.33 | sim | sim |
| cat_needsPreCoco~exagerado | evento | sim | 74 | 0.28 | sim | sim |
| cat_needsCoco~suave | evento | sim | 113 | 0.73 | sim | sim |
| cat_needsCoco | evento | sim | 87 | 0.32 | sim | sim |
| cat_needsCoco~exagerado | evento | sim | 74 | 0.36 | sim | sim |
| cat_needsFedor~suave | evento | sim | 113 | 0.33 | sim | sim |
| cat_needsFedor | evento | sim | 87 | 0.50 | sim | sim |
| cat_needsFedor~exagerado | evento | sim | 74 | 0.30 | sim | sim |
| cat_needsLimpo~suave | evento | sim | 113 | 0.37 | sim | sim |
| cat_needsLimpo | evento | sim | 87 | 0.54 | sim | sim |
| cat_needsLimpo~exagerado | evento | sim | 74 | 0.61 | sim | sim |
| cat_needsComer~suave | evento | sim | 113 | 0.30 | sim | sim |
| cat_needsComer | evento | sim | 87 | 0.33 | sim | sim |
| cat_needsComer~exagerado | evento | sim | 74 | 0.49 | sim | sim |
| cat_needsMastigar~suave | evento | sim | 113 | 0.43 | sim | sim |
| cat_needsMastigar | evento | sim | 87 | 0.30 | sim | sim |
| cat_needsMastigar~exagerado | evento | sim | 74 | 0.32 | sim | sim |
| cat_needsSatisfeito~suave | evento | sim | 113 | 0.71 | sim | sim |
| cat_needsSatisfeito | evento | sim | 87 | 0.34 | sim | sim |
| cat_needsSatisfeito~exagerado | evento | sim | 74 | 0.36 | sim | sim |
| cat_needsFavorita~suave | evento | sim | 113 | 0.32 | sim | sim |
| cat_needsFavorita | evento | sim | 87 | 0.69 | sim | sim |
| cat_needsFavorita~exagerado | evento | sim | 74 | 0.30 | sim | sim |
| cat_needsDesgosto~suave | evento | sim | 113 | 0.30 | sim | sim |
| cat_needsDesgosto | evento | sim | 87 | 0.35 | sim | sim |
| cat_needsDesgosto~exagerado | evento | sim | 74 | 0.85 | sim | sim |
| cat_needsRaro~suave | evento | sim | 113 | 0.31 | sim | sim |
| cat_needsRaro | evento | sim | 87 | 0.32 | sim | sim |
| cat_needsRaro~exagerado | evento | sim | 74 | 0.36 | sim | sim |
| cat_needsLendario~suave | evento | sim | 113 | 0.63 | sim | sim |
| cat_needsLendario | evento | sim | 87 | 0.36 | sim | sim |
| cat_needsLendario~exagerado | evento | sim | 74 | 0.39 | sim | sim |
| cat_needsXp~suave | evento, código (conversa/foco/evento) | sim | 113 | 0.40 | sim | sim |
| cat_needsXp | evento, código (conversa/foco/evento) | sim | 87 | 0.60 | sim | sim |
| cat_needsXp~exagerado | evento, código (conversa/foco/evento) | sim | 74 | 0.36 | sim | sim |
| cat_needsNivel~suave | evento | sim | 113 | 0.38 | sim | sim |
| cat_needsNivel | evento | sim | 87 | 0.80 | sim | sim |
| cat_needsNivel~exagerado | evento | sim | 74 | 0.56 | sim | sim |
| cat_needsConquista~suave | evento | sim | 113 | 0.35 | sim | sim |
| cat_needsConquista | evento | sim | 87 | 0.38 | sim | sim |
| cat_needsConquista~exagerado | evento | sim | 74 | 0.66 | sim | sim |
| cat_living_medico~suave | evento | sim | 113 | 0.34 | sim | sim |
| cat_living_medico | evento | sim | 87 | 0.30 | sim | sim |
| cat_living_medico~exagerado | evento | sim | 74 | 0.31 | sim | sim |
| cat_living_cientista~suave | evento | sim | 121 | 0.67 | sim | sim |
| cat_living_cientista | evento | sim | 93 | 0.31 | sim | sim |
| cat_living_cientista~exagerado | evento | sim | 79 | 0.30 | sim | sim |
| cat_living_fisico~suave | evento | sim | 128 | 0.51 | sim | sim |
| cat_living_fisico | evento | sim | 99 | 0.41 | sim | sim |
| cat_living_fisico~exagerado | evento | sim | 84 | 0.33 | sim | sim |
| cat_living_quimico~suave | evento | sim | 136 | 0.36 | sim | sim |
| cat_living_quimico | evento | sim | 105 | 0.76 | sim | sim |
| cat_living_quimico~exagerado | evento | sim | 89 | 0.35 | sim | sim |
| cat_living_biologo~suave | evento | sim | 144 | 0.35 | sim | sim |
| cat_living_biologo | evento | sim | 111 | 0.57 | sim | sim |
| cat_living_biologo~exagerado | evento | sim | 94 | 0.35 | sim | sim |
| cat_living_programador~suave | evento | sim | 113 | 0.31 | sim | sim |
| cat_living_programador | evento | sim | 87 | 0.88 | sim | sim |
| cat_living_programador~exagerado | evento | sim | 74 | 0.31 | sim | sim |
| cat_living_engenheiro~suave | evento | sim | 121 | 0.30 | sim | sim |
| cat_living_engenheiro | evento | sim | 93 | 0.30 | sim | sim |
| cat_living_engenheiro~exagerado | evento | sim | 79 | 0.63 | sim | sim |
| cat_living_professor~suave | evento | sim | 128 | 0.34 | sim | sim |
| cat_living_professor | evento | sim | 99 | 0.33 | sim | sim |
| cat_living_professor~exagerado | evento | sim | 84 | 0.52 | sim | sim |
| cat_living_advogado~suave | evento | sim | 136 | 0.33 | sim | sim |
| cat_living_advogado | evento | sim | 105 | 0.36 | sim | sim |
| cat_living_advogado~exagerado | evento | sim | 89 | 0.82 | sim | sim |
| cat_living_juiz~suave | evento | sim | 144 | 0.35 | sim | sim |
| cat_living_juiz | evento | sim | 111 | 0.33 | sim | sim |
| cat_living_juiz~exagerado | evento | sim | 94 | 0.50 | sim | sim |
| cat_living_policial~suave | evento | sim | 113 | 0.32 | sim | sim |
| cat_living_policial | evento | sim | 87 | 0.30 | sim | sim |
| cat_living_policial~exagerado | evento | sim | 74 | 0.34 | sim | sim |
| cat_living_bombeiro~suave | evento | sim | 121 | 0.64 | sim | sim |
| cat_living_bombeiro | evento | sim | 93 | 0.33 | sim | sim |
| cat_living_bombeiro~exagerado | evento | sim | 79 | 0.32 | sim | sim |
| cat_living_piloto~suave | evento | sim | 128 | 0.37 | sim | sim |
| cat_living_piloto | evento | sim | 99 | 0.34 | sim | sim |
| cat_living_piloto~exagerado | evento | sim | 84 | 0.36 | sim | sim |
| cat_living_astronauta~suave | evento | sim | 136 | 0.60 | sim | sim |
| cat_living_astronauta | evento | sim | 105 | 0.45 | sim | sim |
| cat_living_astronauta~exagerado | evento | sim | 89 | 0.36 | sim | sim |
| cat_living_chef~suave | evento | sim | 144 | 0.37 | sim | sim |
| cat_living_chef | evento | sim | 111 | 0.36 | sim | sim |
| cat_living_chef~exagerado | evento | sim | 94 | 0.35 | sim | sim |
| cat_living_psicologo~suave | evento | sim | 113 | 0.30 | sim | sim |
| cat_living_psicologo | evento | sim | 87 | 0.56 | sim | sim |
| cat_living_psicologo~exagerado | evento | sim | 74 | 0.31 | sim | sim |
| cat_living_veterinario~suave | evento | sim | 121 | 0.30 | sim | sim |
| cat_living_veterinario | evento | sim | 93 | 0.29 | sim | sim |
| cat_living_veterinario~exagerado | evento | sim | 79 | 0.74 | sim | sim |
| cat_living_detetive~suave | evento | sim | 128 | 0.34 | sim | sim |
| cat_living_detetive | evento | sim | 99 | 0.37 | sim | sim |
| cat_living_detetive~exagerado | evento | sim | 84 | 0.59 | sim | sim |
| cat_living_jornalista~suave | evento | sim | 136 | 0.41 | sim | sim |
| cat_living_jornalista | evento | sim | 105 | 0.35 | sim | sim |
| cat_living_jornalista~exagerado | evento | sim | 89 | 0.37 | sim | sim |
| cat_living_mecanico~suave | evento | sim | 144 | 0.35 | sim | sim |
| cat_living_mecanico | evento | sim | 111 | 0.33 | sim | sim |
| cat_living_mecanico~exagerado | evento | sim | 94 | 0.68 | sim | sim |
| cat_living_arquiteto~suave | evento | sim | 113 | 0.31 | sim | sim |
| cat_living_arquiteto | evento | sim | 87 | 0.33 | sim | sim |
| cat_living_arquiteto~exagerado | evento | sim | 74 | 0.28 | sim | sim |
| cat_living_economista~suave | evento | sim | 121 | 0.65 | sim | sim |
| cat_living_economista | evento | sim | 93 | 0.30 | sim | sim |
| cat_living_economista~exagerado | evento | sim | 79 | 0.31 | sim | sim |
| cat_living_treinador~suave | evento | sim | 128 | 0.39 | sim | sim |
| cat_living_treinador | evento | sim | 99 | 0.41 | sim | sim |
| cat_living_treinador~exagerado | evento | sim | 84 | 0.36 | sim | sim |
| cat_living_marinheiro~suave | evento | sim | 136 | 0.35 | sim | sim |
| cat_living_marinheiro | evento | sim | 105 | 0.73 | sim | sim |
| cat_living_marinheiro~exagerado | evento | sim | 89 | 0.32 | sim | sim |
| cat_living_pesquisador~suave | evento | sim | 144 | 0.35 | sim | sim |
| cat_living_pesquisador | evento | sim | 111 | 0.47 | sim | sim |
| cat_living_pesquisador~exagerado | evento | sim | 94 | 0.36 | sim | sim |
| cat_living_auraPlanilha~suave | evento | sim | 113 | 0.33 | sim | sim |
| cat_living_auraPlanilha | evento | sim | 87 | 0.32 | sim | sim |
| cat_living_auraPlanilha~exagerado | evento | sim | 74 | 0.32 | sim | sim |
| cat_living_fritou~suave | evento | sim | 121 | 0.32 | sim | sim |
| cat_living_fritou | evento | sim | 93 | 0.31 | sim | sim |
| cat_living_fritou~exagerado | evento | sim | 79 | 0.77 | sim | sim |
| cat_living_deluluContrato~suave | evento | sim | 128 | 0.36 | sim | sim |
| cat_living_deluluContrato | evento | sim | 99 | 0.36 | sim | sim |
| cat_living_deluluContrato~exagerado | evento | sim | 84 | 0.37 | sim | sim |
| cat_living_npcFila~suave | evento | sim | 136 | 0.36 | sim | sim |
| cat_living_npcFila | evento | sim | 105 | 0.33 | sim | sim |
| cat_living_npcFila~exagerado | evento | sim | 89 | 0.50 | sim | sim |
| cat_living_brainrotFaxina~suave | evento | sim | 144 | 0.34 | sim | sim |
| cat_living_brainrotFaxina | evento | sim | 111 | 0.35 | sim | sim |
| cat_living_brainrotFaxina~exagerado | evento | sim | 94 | 0.60 | sim | sim |
| cat_living_rizzCurriculo~suave | evento | sim | 113 | 0.31 | sim | sim |
| cat_living_rizzCurriculo | evento | sim | 87 | 0.31 | sim | sim |
| cat_living_rizzCurriculo~exagerado | evento | sim | 74 | 0.29 | sim | sim |
| cat_living_sigmaSilencio~suave | evento | sim | 121 | 0.40 | sim | sim |
| cat_living_sigmaSilencio | evento | sim | 93 | 0.29 | sim | sim |
| cat_living_sigmaSilencio~exagerado | evento | sim | 79 | 0.32 | sim | sim |
| cat_living_sideQuest~suave | evento | sim | 128 | 0.71 | sim | sim |
| cat_living_sideQuest | evento | sim | 99 | 0.37 | sim | sim |
| cat_living_sideQuest~exagerado | evento | sim | 84 | 0.33 | sim | sim |
| cat_living_mainCharacter~suave | evento | sim | 136 | 0.42 | sim | sim |
| cat_living_mainCharacter | evento | sim | 105 | 0.47 | sim | sim |
| cat_living_mainCharacter~exagerado | evento | sim | 89 | 0.50 | sim | sim |
| cat_living_grama~suave | evento | sim | 144 | 0.64 | sim | sim |
| cat_living_grama | evento | sim | 111 | 0.49 | sim | sim |
| cat_living_grama~exagerado | evento | sim | 94 | 0.53 | sim | sim |
| cat_living_eventoCanonico~suave | evento | sim | 113 | 0.54 | sim | sim |
| cat_living_eventoCanonico | evento | sim | 87 | 0.52 | sim | sim |
| cat_living_eventoCanonico~exagerado | evento | sim | 74 | 0.40 | sim | sim |
| cat_living_skillIssue~suave | evento | sim | 121 | 0.47 | sim | sim |
| cat_living_skillIssue | evento | sim | 93 | 0.57 | sim | sim |
| cat_living_skillIssue~exagerado | evento | sim | 79 | 0.41 | sim | sim |
| cat_living_pressF~suave | evento | sim | 128 | 0.61 | sim | sim |
| cat_living_pressF | evento | sim | 99 | 0.57 | sim | sim |
| cat_living_pressF~exagerado | evento | sim | 84 | 0.79 | sim | sim |
| cat_living_stonks~suave | evento | sim | 136 | 0.51 | sim | sim |
| cat_living_stonks | evento | sim | 105 | 0.53 | sim | sim |
| cat_living_stonks~exagerado | evento | sim | 89 | 0.72 | sim | sim |
| cat_living_taTudoBem~suave | evento | sim | 144 | 0.51 | sim | sim |
| cat_living_taTudoBem | evento | sim | 111 | 0.52 | sim | sim |
| cat_living_taTudoBem~exagerado | evento | sim | 94 | 0.66 | sim | sim |
| cat_living_loading~suave | evento | sim | 113 | 0.53 | sim | sim |
| cat_living_loading | evento | sim | 87 | 0.56 | sim | sim |
| cat_living_loading~exagerado | evento | sim | 74 | 0.55 | sim | sim |
| cat_living_lagMental~suave | evento | sim | 121 | 0.47 | sim | sim |
| cat_living_lagMental | evento | sim | 93 | 0.48 | sim | sim |
| cat_living_lagMental~exagerado | evento | sim | 79 | 0.51 | sim | sim |
| cat_living_plotTwist~suave | evento | sim | 128 | 0.52 | sim | sim |
| cat_living_plotTwist | evento | sim | 99 | 0.55 | sim | sim |
| cat_living_plotTwist~exagerado | evento | sim | 84 | 0.57 | sim | sim |
| cat_living_buffCafe~suave | evento | sim | 136 | 0.64 | sim | sim |
| cat_living_buffCafe | evento | sim | 105 | 0.35 | sim | sim |
| cat_living_buffCafe~exagerado | evento | sim | 89 | 0.41 | sim | sim |
| cat_living_nerfNotificacao~suave | evento | sim | 144 | 0.54 | sim | sim |
| cat_living_nerfNotificacao | evento | sim | 111 | 0.35 | sim | sim |
| cat_living_nerfNotificacao~exagerado | evento | sim | 94 | 0.35 | sim | sim |
| cat_living_sextou~suave | evento | sim | 113 | 0.49 | sim | sim |
| cat_living_sextou | evento | sim | 87 | 0.69 | sim | sim |
| cat_living_sextou~exagerado | evento | sim | 74 | 0.30 | sim | sim |
| cat_living_pov~suave | evento | sim | 121 | 0.42 | sim | sim |
| cat_living_pov | evento | sim | 93 | 0.66 | sim | sim |
| cat_living_pov~exagerado | evento | sim | 79 | 0.31 | sim | sim |
| cat_living_fakeProdutivo~suave | evento | sim | 128 | 0.39 | sim | sim |
| cat_living_fakeProdutivo | evento | sim | 99 | 0.38 | sim | sim |
| cat_living_fakeProdutivo~exagerado | evento | sim | 84 | 0.35 | sim | sim |
| cat_living_cinema~suave | evento | sim | 136 | 0.57 | sim | sim |
| cat_living_cinema | evento | sim | 105 | 0.35 | sim | sim |
| cat_living_cinema~exagerado | evento | sim | 89 | 0.33 | sim | sim |
| cat_living_baixoPerfil~suave | evento | sim | 144 | 0.62 | sim | sim |
| cat_living_baixoPerfil | evento | sim | 111 | 0.39 | sim | sim |
| cat_living_baixoPerfil~exagerado | evento | sim | 94 | 0.36 | sim | sim |
