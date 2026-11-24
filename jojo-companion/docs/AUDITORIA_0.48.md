# Matriz de auditoria — 0.48 (24/11/2026)

Base auditada: `d1b23bd` (0.47.5 com timers), código em `jojo-companion/`.
Estados: **IV** implementada e validada · **ID** implementada com defeitos · **P** parcial ·
**D** implementada mas desconectada · **Doc** apenas documentada · **N** não implementada ·
**I** inacessível à usuária · **?** inconclusiva, precisa de validação.

Testes citados: `test/unit/rpg.test.js` (26), `test/unit/rpg-service.test.js` (7),
`test/unit/needs.test.js`, `test/unit/auditoria.test.js`, `test/unit/comandos-registro.test.js`.
Tudo rodado aqui no Linux (Node 22). **Nada disto foi executado no Windows ainda**: isso
acontece no CI oficial quando a versão entrar na fila de publicação.

## Tamagotchi

| Nome | Descrição | Local | Antes | Evidência | Problemas | Depende de | Impacto UX | Impacto desempenho | Correção | Aceitação | Depois | Testes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fome/saciedade | Saciedade cai com uso ativo | `core/needs.js` | IV | needs.test | — | Progress | central | 1 tick/min | — | não cair com app fechado | IV | needs.test |
| Sede | Hidratação própria | `core/rpg/vida.js` | N | — | não existia | cardápio, lembrete de água | pedidos de água | dentro do tick do RPG | criada, 12 bebidas, água do lembrete | sobe ao beber, cai só com uso ativo, piso | IV | rpg.test "vida" |
| Energia | Cansaço e recuperação | `vida.js` | N | — | só o estado de sono | vigília 6h–21h | — | idem | criada; recupera no Trabalho (repouso) e no sono noturno | nunca força dormir de dia | IV | rpg.test "regra do sono" |
| Felicidade/humor | Humor do JoJo | `needs.js` | IV | — | — | — | — | — | preservado | — | IV | needs.test |
| Saúde e doenças | Saúde e mal-estar | `needs.js`, `vida.js` | P | só "ill" genérico | sem doenças distintas | comida, sede, energia | — | — | 7 doenças com causa e cura (indigestão, desidratação, resfriado, coceira, exaustão, enjoo, taquicardia) | curam com cuidado/comida/tempo, sem morte | IV | rpg.test "vida" |
| Higiene e sujeira (≥6) | Depósitos no aquário | `needs.js`, `needs-balance.json` | IV | 6+ tipos | — | — | — | — | coceira se higiene baixa | — | IV | needs.test |
| Sono | Dormir 21h–6h | `behavior.js`, `vida.js` | IV | canSleep | — | — | — | — | `podeDormir` igual à vigília | nunca 6h–21h | IV | rpg.test |
| Tédio, carinho, confiança, satisfação | Estados emocionais | `vida.js` | N | — | não existiam | eventos reais | pedidos espontâneos raros | — | criados e ligados aos eventos | sobem/descem com interações reais; pisos | IV | rpg.test, rpg-service.test |
| Relacionamento | Evolução do vínculo | `mundo.js` NIVEIS_VINCULO | N | — | — | eventos | — | — | 20 níveis não românticos, teto diário | cresce com convivência, sem "dona"/romance | IV | rpg.test |
| ≥50 alimentos distintos | Cardápio | `assets/catalog/foods.json` | IV (56) | 56 itens | sem bebidas | — | — | — | +12 bebidas com arte SVG própria (68) | 50 comidas + 12 bebidas, todas com efeito na vida | IV | needs.test, rpg.test "68 alimentos" |
| Ausência sem punição | Nada degrada fechado | `vida.passarTempo` | IV (needs) | — | — | — | — | — | salto > 90 s descartado | 0 perda ao reabrir após dias | IV | rpg.test, sims 30/90/365 |
| Persistência | Estado entre sessões | `rpg.json` (AtomicState) | — | — | — | — | — | 1 gravação/min (~36 KB após 1 ano) | migração `validarRpg` | reabrir mantém tudo | IV | rpg-service.test "reabrir" |

## RPG

| Nome | Descrição | Local | Antes | Evidência | Problemas | Depende de | Impacto UX | Impacto desempenho | Correção | Aceitação | Depois | Testes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| XP e curva 1→200 | Progressão | `catalog/antitedio.js` | IV | 200 níveis, escala ×10 | — | — | — | — | preservada; RPG soma por `award` com id único | sem XP duplicado | IV | rpg.test "idempotente" |
| XP por cuidados/produtividade/estudo/jogos/missões/descobertas | Fontes | serviço + motor | P | só XP base | sem estudo/descobertas/expedições | Progress | — | — | eventos reais + bônus dos atributos; teto 250/dia | nenhum loop de XP | IV | rpg-service.test |
| Antifraude não invasivo | Limites | `motor.js` INTERVALO/TETO | N | — | — | — | — | — | intervalo por tipo e teto diário | spam não rende | IV | rpg.test "antifraude" |
| 10 atributos com efeito | Força…Percepção | `atributos.js` | N | — | — | — | — | cache 60 s | cada um com efeito mensurável | efeito cresce com o valor | IV | rpg.test "atributos" |
| Inteligência nunca limita a IA | Regra | `dialogue/*` | — | — | — | — | — | — | RPG fora do prompt | dialogue não importa rpg | IV | rpg.test |
| Pontos, árvores, ativas, passivas, especiais, poderes, lendários, evolução (ranks) | Habilidades | `habilidades.js` | N | — | — | níveis | Central | — | 45 + 32 de especialização, 5 árvores | aprender/usar com recarga real | IV | rpg.test "habilidades" |
| Combinações e maestrias | Sinergias | `habilidades.js`, `segredos.js` | N | — | — | — | — | — | 8 combos de habilidade, 4 de eventos, 8 maestrias | combo de eventos não quebra com evento alheio | IV | rpg-service.test "Invicta" |
| Títulos, marcos, recompensa em todo nível | Níveis | `niveis.js` | P | só visuais/títulos de referência | sem recompensa funcional | visuais | — | — | todo nível dá ponto; marcos dão títulos, espaços, regiões | 199 recompensas, nenhuma vazia; visuais intactos | IV | rpg.test "200 níveis" |
| Conquistas e estatísticas | Coleção | `antitedio.js` + `contas` | IV / N | — | estatísticas RPG não existiam | — | — | — | contas, histórico e relatórios na Central | — | IV | rpg.test |

## Economia (JOJOcoins)

| Nome | Descrição | Local | Antes | Evidência | Problemas | Depende de | Impacto UX | Impacto desempenho | Correção | Aceitação | Depois | Testes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Carteira, loja ≥150, inventário, arte da moeda, troca de visuais | Economia | outra frente ("Criar visuais dinâmicos e loja de JOJOcoins") | N | — | — | — | — | — | **não feito nesta frente** (combinado: não duplicar) | — | N (aqui) | — |
| Recompensas em JOJOcoins do RPG | Níveis, expedições, segredos, feira | `motor._moedas` + `creditar` | N | — | — | contrato da loja | — | — | fila idempotente `rpg:*`; espera a carteira | sem duplicar, sem perder | IV | rpg.test "carteira", rpg-service.test |
| Fabricação, artefatos, raridades | Itens funcionais do RPG | `mundo.js` | N | — | — | expedições | Central | — | 14 materiais, 8 receitas, 41 artefatos (5 únicos) | efeitos reais e equipáveis por espaço | IV | rpg.test "fabricação" |

## Aventuras, eventos, minijogos, especializações, endgame

| Nome | Descrição | Local | Antes | Evidência | Problemas | Depende de | Impacto UX | Impacto desempenho | Correção | Aceitação | Depois | Testes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Missões diárias | 3 por dia | `antitedio.js` | IV | — | — | — | — | — | preservadas | — | IV | existentes |
| Semanais, especiais, secretas, encadeadas, longa duração | Missões | `jornada.js` | N | — | — | eventos | — | — | 15 + 8 + 12 + 5 histórias + 8 | avançam só por evento real | IV | rpg.test "missões", "cadeia" |
| Expedições e exploração do desktop | Regiões = categorias de app | `mundo.js`, `motor.tick` | N | — | — | percepção (opcional) | relatório na fala e Central | ~0,24 ms/min | 12 regiões, encruzilhada a/b, desafio por atributo, relatório | avança em Trabalho em silêncio; esquecida decide sozinha | IV | rpg.test "expedição", rpg-service.test |
| Eventos secretos | Hora, data, lua, clima, nível, vínculo, app, ausência | `segredos.js` | N | — | — | clima da 0.47.6 | sem spam (40 min, 3/dia) | — | 29 segredos, múltiplos desfechos, diário em 7 páginas, 8 códigos | elegibilidade e repetição controladas | IV (clima: ?) | rpg.test "segredos" |
| Minijogos | Reflexo, memória, quiz etc. | `minijogos.json` (15) | IV | — | faltavam ritmo, enigma, quebra-cabeça, velocidade, caça na tela, treino, sorte virtual | nível | — | — | +8 com dificuldade pelo nível e dicas pela Inteligência | ganhar e perder de verdade | IV | rpg.test "minijogos" |
| 16 especializações | Cientista…Mestre | `especializacoes.js` | N | — | — | atributos | — | — | fontes de XP, rank 1–10, 2 habilidades, região, adereço, falas, animação | troca sem apagar; Médico educativo com 192 | IV | rpg.test "especializações" |
| Endgame | Paragon, Estrelas, lendários | `niveis.js` | N | — | — | — | — | — | Paragon infinito, estrela a cada 10, nada apagado | prestígio só soma | IV | rpg.test "paragon" |

## Integração, IA, desktop, produtividade, visual

| Nome | Descrição | Local | Antes | Evidência | Problemas | Depende de | Impacto UX | Impacto desempenho | Correção | Aceitação | Depois | Testes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Integração entre sistemas | Eventos reais → RPG | `main/rpg-service.js` | N | — | — | Progress, Needs, jogos, timers, tarefas, pesquisa | — | sem polling novo (usa o tick de 1 min) | observadores sem mudar os sistemas | evento conta uma vez | IV | rpg-service.test |
| Conversa determinística do RPG | Comandos sem modelo | `rpgChat` | N | — | — | — | respostas imediatas | 0 chamadas ao modelo | ficha, expedição, a/b, usar, códigos… | frase comum segue para o modelo | IV | rpg-service.test |
| Painel Aventura e `/aventura` | Central | `renderer/shared/rpg-view.js` | N | — | — | IPC `rpg:request` | — | render sob demanda | painel completo, segredos em "???" | sem erro no Chromium | IV (Chromium, não Windows) | captura de tela local |
| IA (latência, qualidade, memória) | Gemma 3 4B local | `dialogue/*` | ? | — | não medível neste container | Windows/Ollama | — | — | **não alterada** | sem regressão | ? | não executado |
| Modo Trabalho, foco, tela cheia | Silêncio | serviço | IV | — | — | — | — | — | RPG mudo nesses modos | 0 falas do RPG | IV | rpg-service.test |
| Clima nos segredos | `companion.climaAgora` | — | N | — | — | 0.47.6 | — | — | lido se existir | — | ? (aguarda 0.47.6) | — |
| Animações novas | 34 por receita | `rpg-animations.json` | N | — | — | catálogo, room | — | espaço medido | medidas no Chromium | todas constroem e têm espaço | IV (Linux) | auditoria.test, rpg.test |
| Arte das bebidas | 12 SVG | `assets/foods/` | N | — | — | — | — | — | desenhadas no estilo do cardápio | sem emoji/placeholder | IV | needs.test |

## Totais (diagnóstico original, só as linhas desta matriz)

39 funcionalidades auditadas. Antes: 10 completas, 5 parciais, 23 ausentes, 0 desconectadas,
0 defeituosas, 0 só documentadas, 1 inconclusiva (IA, sem Windows aqui).
Depois: 36 implementadas e validadas aqui (Linux/Chromium); 1 ausente nesta frente
(carteira/loja/arte da moeda, que é da outra frente); 2 inconclusivas (IA e clima até a 0.47.6).
