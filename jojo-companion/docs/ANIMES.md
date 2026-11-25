# Ecossistema de animes

Melhoria sobre o calendário de anime da 0.47.2 (`src/core/anime-calendario.js`, `/anime`, `animeAtivo`), sem
duplicá-lo: a busca, a sincronização e a visita continuam no mesmo lugar e ganharam acompanhamento, alertas,
pacotes temáticos, recompensas em JOJOcoins e a aba **📺 Animes** na Central. Sem `animeAcomp` conectado
(testes antigos, falha ao abrir o arquivo), o comportamento antigo segue igual.

## Fonte de dados e limitações

- **AniList** (GraphQL público, grátis, sem login nem chave). Só saem o nome buscado ao seguir e os ids dos
  animes seguidos. Capas vêm do CDN da AniList (`s4.anilist.co`, `img.anili.st`) pelo processo principal, até
  400 KB, só imagem, guardadas em `<userData>/anime-capas`.
- **calendarioanimes.com não é usado**: não tem API pública e o `robots.txt` proíbe `/api/`. Raspar a página
  violaria o uso permitido, então fica registrado como limitação.
- O horário da AniList é o da **exibição no Japão**. No streaming pode sair depois: o app mostra "previsão" e
  nunca afirma que já está disponível no Brasil sem confirmação dela.
- Não existe fonte gratuita de horário de **dublagem**: para "só dublado" não há alerta com hora marcada.
- Plataformas vêm dos links oficiais (`externalLinks`) da AniList; disponibilidade no Brasil nunca é confirmada
  automaticamente.
- Datas e horas sempre no fuso de Brasília (`America/Sao_Paulo`, `src/core/anime-tempo.js`), com opção de outro
  fuso do Brasil na Central. Estimativas são rotuladas como estimativa.

## Acompanhamento (`src/core/anime-acompanhamento.js`)

- Estado em `<userData>/animes.json` (gravação atômica com cópia anterior, `AtomicState`). As listas antigas
  `animes`/`animeAvisados` das configurações migram sozinhas na primeira abertura (os já avisados não avisam de novo).
- Por anime: favorito, notificação, versão (legendado/dublado), alertas (no lançamento, X min antes, véspera),
  silêncio até uma data, episódios vistos, temporadas, histórico e próximo episódio.
- **Alertas** idempotentes (chave por anime + episódio + tipo) numa fila persistente. A entrega espera Modo
  Trabalho, foco, tela cheia, League of Legends, JoJo escondido, a regra de sono e o limite de broncas; nada se
  acumula em rajada (um por vez). "Me lembra em 30 min" adia.
- **Sincronização adaptativa** com recuo em erro: 15 min perto de um lançamento, 2 h com episódio no dia, 6 h
  normal, 24 h sem nada no ar. Offline, usa o último dado guardado.

## Conversa (`src/core/anime-linguagem.js`)

Linguagem natural com erro de digitação, apelidos ("jjk", "kny", "op", "snk", "mha"…), desambiguação ("qual
deles?", 5 min) e contexto (o anime da conversa vale por 10 min). Exemplos: "segue Frieren", "quando sai o
próximo de jjk?", "tem episódio hoje?", "comecei a assistir One Piece", "tô assistindo o ep 5 de Naruto",
"terminei o episódio 12", "marca o 3 de Haikyuu como visto", "silencia Bleach", "quanto ganhei hoje?",
"contagem pro próximo de Solo Leveling" (cria um timer espelho no relógio do JoJo, `fonte: 'anime'`).
"Terminei" sem nome e sem contexto não é tratado como anime. Falas: 130 em `src/core/anime-falas.js`.

## Visuais temáticos (`src/core/anime-pacotes.js`, `src/core/anime-arte.js`)

- O JoJo veste o tema **sem mudar a anatomia**: as peças ficam em grupos espelho `animeKit_<grupo>` presos ao
  rig, ligados pelo canal `animeOn` (desligados, custam zero no desenho). A paleta do pacote entra por `rig.extra`.
- **16 pacotes curados**: Black Clover, One Piece, Boruto, Naruto, Jujutsu Kaisen, Bleach, Demon Slayer, Dragon
  Ball, Solo Leveling, Haikyuu!!, Frieren, Attack on Titan, Chainsaw Man, JoJo's Bizarre Adventure, My Hero
  Academia e One Punch Man. Os demais animes ganham um pacote **composto** (gêneros, tags sem spoiler e cor da
  capa → estilo, cores e peças), guardado em `<userData>/anime-pacotes.json`. Sem tags, o pacote é provisório.
- **12 contextos por pacote** (aviso no dia, aviso próximo, contagem, disponível, adiamento, nova temporada,
  lembrete, encerramento, início de sessão, conclusão, moedas, conquista) × 13 estilos = **156 animações**
  `cat_anime_*` (geradas em 3 intensidades pelo catálogo). Efeito extra (aura, ondas, fumaça…) só nos clímax;
  objeto da moeda temático (baú, grimório, esfera de energia), pipoca no início da sessão.
- Troca **temporária**: durante a visita o guarda-roupa e a fantasia do dia somem e voltam exatamente como
  estavam no fim. Visual de nível liberado tem prioridade, como antes.
- **Auditor** (Central → Animes → Configurações → "Auditar visuais"): mostra quais animes seguidos e da semana
  têm pacote curado, composto ou provisório.
- Espaço da janela medido por animação (`jojo.room.json`, `scripts/anim-room-anime.mjs`) e por pacote (`ak:<id>`).

## Recompensas em JOJOcoins (`src/core/anime-recompensas.js`)

Só a carteira oficial: cada recompensa é um crédito idempotente `Loja.creditar({ id: 'anime:…' })`, com o Ímã e
o teto geral de 1.200/dia da loja. Não existe moeda paralela.

| Atividade | JOJOcoins |
|---|---|
| Episódio curto (até 10 min) | 4 |
| Episódio convencional (11–34 min) | 12 |
| Episódio longo (35–59 min) | 20 |
| OVA / especial | 16 |
| Filme (60 min ou mais) | 50 |
| Primeiro episódio de um anime novo | +8 (uma vez) |
| Temporada completa | +40 (uma vez) |
| Obra concluída (sem sequência) | +80 (uma vez) |
| Retomada (parado há 30+ dias) | +8 |
| Revisita (depois de 7 dias, até 3/dia) | 20% do valor |

Tetos próprios: 300/dia de episódios e 250/dia de bônus (o que passar não é pago depois). 14 conquistas novas em
`progressao.json` (`animeEp1` … `animeRetomada`).

### Antifraude

- Sessão no app só conclui com **~85% do tempo efetivo** (episódios de 20 min+ aceitam pular abertura e
  créditos, até 4,5 min; filmes, 8 min). O tempo conta pelo relógio monotônico e só enquanto toca; cada tique
  vale no máximo 10 min, então mexer no relógio do Windows não adianta.
- Registro manual (TV/celular): recompensado até **8 h de tela por 24 h**; acima disso fica no histórico sem moedas.
- O mesmo episódio nunca paga duas vezes; corrigir o histórico **estorna** (`Loja.estornar`, idempotente, saldo
  nunca negativo).
- Toda gravação é atômica; crédito pendente fica na fila e é drenado de novo se o app fechar no meio.

### Simulação (`node scripts/economia-anime-sim.mjs`, classes reais do app)

| Perfil | Dias | JOJOcoins | por dia | por hora de anime | maior dia |
|---|---|---|---|---|---|
| Casual (1 ep, 4 dias/sem) | 180 | 1.768 | 9,8 | 42,5 | 132 |
| Moderado (2 eps, 6 dias, 1 filme/mês) | 180 | 6.244 | 34,7 | 46,9 | 144 |
| Maratonista (6 eps/dia, 2 filmes/mês) | 180 | 21.608 | 120,0 | 47,6 | 256 |
| Abuso (30 manuais/dia) | 180 | 67.030 | 372,4 | 31,0 | 490 |

A hora ativa com o JoJo rende 190 na precificação da loja; anime fica em ~25% disso. O abuso é contido pelo teto
de episódios e pelo limite manual (580 registros sem moedas em 180 dias) e fica abaixo do teto geral.

## Detecção de mídia (opcional, desligada por padrão)

Central → Animes → Configurações → "Detectar o que está tocando". Só no Windows: a cada 30 s um PowerShell lê
a **sessão de mídia do sistema** (SMTC: título e estado de reprodução que o próprio player publica). Não captura
tela, não lê abas, não contorna DRM. Título casado com um anime seguido (pontuação ≥ 0,78) abre uma sessão
automática; o resto é ignorado. **Não testado no Windows nesta sessão** (depende do CI/uso real). Sem detecção,
o registro manual e o botão "Comecei" fazem o mesmo papel.

## Central (aba 📺 Animes)

Listas: hoje, amanhã, semana, mês, em transmissão, favoritos, nova temporada, pausados, concluídos, não
assistidos, todos os lançamentos, histórico, estatísticas e alertas. Filtros por gênero, plataforma, dia, nota e
status. Card com capa, contagem ao vivo, recompensa, pacote e botões (seguir, comecei/pausar/terminei, marcar
visto, alertas, **Assistir agora** — abre só o link oficial guardado, pelo clique dela). Corrigir histórico,
alertas padrão, fuso, detecção, exportar **.ics** (salva onde ela escolher; nada é enviado) e auditoria.

## Desempenho (Linux, Node; mediana de 7 repetições)

| Medida | Antes | Depois |
|---|---|---|
| Lógica, 10 min simulados, sem anime | 58–68 ms (1,6–1,8 µs/quadro) | 69,8 ms (1,9 µs) |
| Lógica, com alertas ativos | — | 85,3 ms (2,3 µs) |
| Montagem do catálogo | 11,6 ms (1.761 animações) | ~13,5 ms (2.229) |
| Desenho de um quadro | ~0,51 ms | ~0,53 ms sem pacote, ~0,79 ms com pacote |

`node scripts/bench-anime.mjs` (`BENCH_LONGE=1` para sem alertas). `scripts/measure.mjs` só roda no Windows (CI).

## Relatório (seção 36)

- Feito e testado (unitários, `test/unit/animes.test.js`, 29 testes; suíte: 1.006 passam, 0 falhas, 1 pulado;
  lint ok): acompanhamento, fila de alertas, linguagem, fuso, pacotes/compositor/auditor, 156 animações,
  recompensas, antifraude, estorno, simulação, .ics, detecção (parser), Central.
- Corrigido no caminho: `airingAt` da AniList passava do limite de validação (o "próximo episódio" ficava sempre
  vazio); tags não eram guardadas (pacote composto perdia peças).
- Não verificado: Windows real (E2E, medição, PowerShell da detecção, aparência na tela). Revisão visual feita
  só em folhas de prévia (`node scripts/preview-anime.mjs`).
- Limitações: fonte sem horário de dublagem e sem confirmação BR; calendarioanimes.com sem API permitida;
  bônus acima do teto se perdem; pacote composto sem tags é provisório.
