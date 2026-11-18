# Sistema antitédio do JoJo

O JoJo não pode parecer repetitivo, parado ou previsível demais. Ao mesmo tempo, ela precisa de controle total sobre intensidade e surpresas. O sistema funciona por **camadas**: se uma fica repetitiva, as outras sustentam a variedade. Tudo respeita "Reduzir movimento", pode ser desligado e é interrompido por clique, arrasto ou `/pet`.

As camadas usam o personagem original restaurado, com braços e pernas, sem cauda.
Identificadores legados de cauda permanecem por compatibilidade; seus movimentos
foram adaptados aos pés. Anatomia, silhueta e estilo só podem mudar por solicitação
explícita do usuário.

## Onde está cada coisa

| Camada | Arquivo (conteúdo editável) | Lógica |
|---|---|---|
| Animações (270, em 3 intensidades) | `assets/catalog/animacoes.json` | `src/core/catalog/recipes.js` |
| Falas ambientes (até 80 caracteres) | `assets/dialogue/falas-ambientes.json` | `src/core/catalog/variety.js` (`pickLine`) |
| Motor de variedade | — | `src/core/catalog/variety.js` (`VarietyEngine`) |
| Rotinas e mini-histórias | `assets/catalog/rotinas.json` | `src/core/catalog/antitedio.js` (`pickRoutine`, `routineSteps`) |
| Mini-jogos (perguntas, palavras, poses) | `assets/catalog/minijogos.json` | `antitedio.js` (`Games`) + `companion.js` (cliques/bolhas) |
| Progressão, coleções, missões | `assets/catalog/progressao.json` | `antitedio.js` (`Progress`) |
| Integração (quando e como tocar) | — | `src/core/companion.js` (seção "antitédio") |
| Controles | Configurações → Animações e estímulos | `src/core/settings-schema.js` |
| Memória salva (por PC) | `<dados do app>/variedade.json` | — |

## Lógica de sorteio (motor de variedade)

Peso de cada animação ambiente = frequência (comum 10, rara 2,5, easter egg 0,35), multiplicado por:

- **Memória das últimas 30:** a última nunca repete (peso 0); as outras 29 recentes valem × 0,15.
- **Tempo sem aparecer:** × (1 + minutos desde a última vez ÷ 60), até × 4.
- **Humor/energia do momento** (`energia` do item igual à energia atual): × 2,5. A energia muda a cada 15–40 min e é puxada pelo período do dia e pelo modo escolhido (calmo ou pilhado).
- **Período do dia** (`gatilho.horario`): × 2,5 no período certo, × 0,35 fora dele.
- **Temporada da semana** (treino, estudo, descaro, praia, caverna, aquário gamer, comilança): × 1,8 nas categorias do tema.
- **Adaptação:** × (1 + 0,2 por "curti", até 5); ÷ (1 + 0,3 por "ignorei", até 5). Duas vezes "não gosto dessa" desliga a animação.
- **Tédio alto** (repetições e tela parada): × 3 para o que ainda não apareceu hoje.
- **Controles:** sem surpresas → só as comuns; sem animações pesadas → nada de giro, confete, tremida e afins.

Por cima do sorteio:

- 12 % das vezes (35 % com tédio alto) sai uma **rotina inteira** em vez de uma animação solta.
- Na energia **caótica**, às vezes ele emenda mais uma reação.
- Cada animação ganha camadas extras: intensidade (discreta, normal ou exagerada, pelo humor), lado (vira para um lado ou outro), acessório liberado (óculos ou medalha) e fala da categoria da animação.

## Como ajustar

- **Frequência geral:** Configurações → Animações e estímulos → "Animações sozinho" (desligadas, poucas, normais, muitas). Os pesos ficam em `AMBIENT_WEIGHTS` (`settings-schema.js`).
- **Frequência de um item:** `frequencia` no JSON (comum, rara, easter). Para tirar do sorteio, `gatilho.ambiente: false`.
- **Pesos das frequências:** `frequencias` em `animacoes.json`.
- **Intensidade:** Configurações → Intensidade (pelo humor, discreta, normal, exagerada). Também dá para usar `intensidade` na receita.
- **Energia:** Configurações → Energia (varia ao longo do dia, modo calmo, modo pilhado).
- **Falas:** `freq` em `falas-ambientes.json` (comum, rara, easter ou desligada).

## Como adicionar conteúdo

- **Animação nova:** copie um item de `animacoes.json`, troque `id`, `nome` e a `receita`. Os primitivos de cada camada estão em `recipes.js` (`PRIMITIVES`). Depois rode `node scripts/catalog-doc.mjs` e `xvfb-run -a npx electron --no-sandbox scripts/anim-room.mjs`.
- **Fala:** acrescente `{t, cat, freq}` em `falas-ambientes.json`. A `cat` liga a fala às animações que usam `fala: cat`.
- **Rotina:** acrescente em `rotinas.json` uma lista de `passos` (`anim` + `fala` opcional).
- **Mini-jogo de perguntas:** acrescente em `quiz`, `curiosidades` ou `palavras` (`minijogos.json`).
- **Conquista ou missão:** acrescente em `progressao.json` (`conta` + `n`; ou `evento`).

## Os 110 itens

Na coluna "Peso / não repetir": "memória 30" quer dizer que o item entra no sorteio ponderado e nunca sai duas vezes seguidas.

| # | Item | Gatilho | Duração | Peso / não repetir |
|---|---|---|---|---|
| 1 | Sorteio com memória de 30 | todo sorteio ambiente | — | última com peso 0; recentes × 0,15 |
| 2 | Pesos dinâmicos | idem | — | até × 4 pelo tempo sem aparecer |
| 3 | Combinação de camadas | idem | — | corpo, braços, pernas, cabeça, rosto, dorsal, objeto, efeito, humor + fala + acessório + lado |
| 4 | Velocidade, direção e posição | idem | ± 15–30 % | intensidade, lado sorteado, itens com deslocamento (borda, cantos, cursor) |
| 5 | Intensidade pelo humor | energia atual | — | discreta (zen, sono, foco) / exagerada (pilhado, caótico, competitivo) |
| 6 | Temporadas semanais | semana ISO | 1 semana | anúncio uma vez por semana; × 1,8 no tema |
| 7 | Eventos raros com aviso | item raro ou easter | 1,8 s de aviso | balão "…!" e olhar ao redor antes (desligável) |
| 8 | Easter eggs com dicas | falas "dicas" (raras) | — | memória de falas (30) |
| 9 | Linha do tempo do dia | período | — | × 2,5 / × 0,35 |
| 10 | Tédio do tubarão | 6 min sem novidade com ela ativa | — | tédio ≥ 3 → rotina ou item inédito do dia |
| 11–20 | Micromovimentos | sempre (exceto movimento reduzido ou desligado) | contínuo | respiração e piscar (idle), pés, guelras, bolhas (18–48 s), olhar segue o cursor, contração de músculo (a cada 23 s), tremidinha da dorsal, brilho no dente ou nas escamas (26–66 s), sombra |
| 21–30 | Estados de energia | troca a cada 15–40 min | 15–40 min | nunca a mesma energia duas vezes seguidas (× 0,3); caótico emenda reações |
| 31–45 | Rotinas e mini-histórias | 12 % dos sorteios ou tédio | 3–5 passos | não repete a anterior; recentes × 0,2; torre e truque progridem no dia; história em 8 episódios |
| 46–60 | Mini-jogos | ela pede (Central, `/jogo`, "bora jogar") | 10–90 s | `/jogo` sorteado nunca repete o último |
| 61 | Conquistas | contadores | — | cada uma uma vez |
| 62 | Poses desbloqueáveis | primeira vez que cada animação toca | — | — |
| 63 | Acessórios | nível 2–7 | — | aparecem como camada às vezes (25 %) |
| 64 | Álbum de momentos | animações raras e easter | — | últimas 60 |
| 65 | Níveis do shape | XP ×10 com a curva da 0.47.0 (600 por nível até o 10; depois 1.200·k(k+3)/2) | — | 200 níveis com título próprio, de Sardinha a Megalodon Supremo; 238 bônus de XP com nome (máx. 1 por ação e 6 por dia; XP de bônus é coleção e não acelera o nível); visual novo a cada nível (199 peças em `src/core/visual-nivel.js`, só as liberadas aparecem e podem ser vestidas) |
| 66 | Medalhas por constância | 3, 7 e 30 dias seguidos | — | uma vez |
| 67 | Missões diárias | 3 sorteadas por dia | o dia | opcionais, sem cobrança |
| 68 | Mapa do aquário | temporadas visitadas | — | 7 áreas |
| 69 | Cartas de frases | cada fala ambiente nova | — | — |
| 70 | Diário do tubarão | contadores do dia | — | resumo às 21h (uma vez) ou `/resumo` |
| 71 | Bolhas que estouram | `/bolhas` ou Central | 30 s | sem placar |
| 72 | Fidget de bíceps | botão 💪 | 0,9 s | contador total |
| 73 | Padrão calmante | `/calma` | 2 min | sem falas |
| 74 | Ondinhas no cursor | mexer o mouse no modo de interação | 0,9 s cada | no máximo 8 juntas |
| 75 | Contador satisfatório | 💪 | — | — |
| 76 | Sequência rítmica | `/ritmo` | 30 s | contagem 1-2-3-4 a cada 1,5 s |
| 77 | Texturas animadas | micromovimentos | — | escamas e bolhas |
| 78 | Ciclo de cor suave | `/calma` | 2 min | cor muda devagar (sem piscar) |
| 79 | Peixinhos hipnóticos | `/calma` | 2 min | cardume num oito lento |
| 80 | Me dá estímulo | botão ✨, `/estimulo`, "tô entediada" | 1–6 s | sorteio com memória |
| 81 | Estudar junto | `/foco N` | N min | — |
| 82 | Treinar junto | `/foco N treino` | N min | marca as séries |
| 83 | Pomodoro | `/foco 25` | 25 min | — |
| 84 | Comemorar o bloco | fim do foco | — | conquista e XP |
| 85 | Pausa com humor | fim do foco | 5 min | — |
| 86–87 | Água e alongar | lembretes, pausa e falas de cuidado | — | memória de falas |
| 88 | Retomar foco sem cobrança | Instagram durante o foco | — | no lugar da bronca |
| 89 | Pequenas vitórias | "consegui", foco, jogos | — | diário |
| 90 | Resumo do dia | 21h ou `/resumo` | — | uma vez por dia |
| 91 | Horários em que ela interage | hora de cada mensagem | — | × até 1,6 nesses horários |
| 92 | O que ela mais clica | gesto até 15 s depois de uma animação; "adorei" | — | curtir |
| 93 | O que ela ignora | "não gosto dessa", "para com isso" | — | ignorar; 2× desliga |
| 94, 99 | Energia do dia | "tô cansada" / "tô animada" | o dia | modo calmo ou pilhado no automático |
| 95 | Modo calmo ou pilhado | Configurações → Energia | — | — |
| 96 | Interesses | "eu gosto de X" | — | aparece às vezes (12 % das falas soltas) |
| 97 | Constância sem cobrança | falas "constancia" | — | memória de falas |
| 98 | Rotinas previsíveis | `/rotina bom dia: texto` | — | sempre igual |
| 100 | Dia sem vontade | "hoje não quero conversa" | o dia | sem falas espontâneas; animações × 0,4 |
| 101 | Painel de intensidade | Configurações → Animações e estímulos | — | — |
| 102 | Silencioso e sem pesadas | modo silencioso; "Animações mais agitadas" | — | — |
| 103 | Pausa instantânea | `/pausa`, bandeja | — | — |
| 104 | Aviso antes do raro | "Avisar antes de algo raro" | 1,8 s | — |
| 105 | Sem flashes | aura e cores mudam devagar (segundos) | — | — |
| 106 | Sons e volume | desligados por padrão; volume nas Configurações | — | — |
| 107 | Desativar surpresas | "Surpresas" | — | só as comuns |
| 108 | Transições suaves | `entrada` (ms) de cada animação; saída sempre volta ao repouso | — | — |
| 109 | Movimento reduzido | todas as camadas (quadro estático, sem micromovimentos, menos animações) | — | — |
| 110 | Tudo interrompível | clique, arrasto, `/pet`, conversa | — | prioridade maior que a do ambiente |

Os mini-jogos de clique (rápido, bolhas, pega-pega, cabo de guerra, esconde-esconde) usam o modo de interação: o JoJo para de fugir, e fora dele o overlay continua deixando os cliques passarem.
