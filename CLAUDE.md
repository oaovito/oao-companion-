# Contexto do repositório — JoJo Companion

Este arquivo é lido automaticamente pelas sessões do Claude Code. Ele resume o
projeto para que qualquer sessão continue o trabalho sem depender do histórico.

## Continuidade após a transferência

Diretrizes atuais em [AGENTS.md](AGENTS.md) e [HANDOFF](jojo-companion/HANDOFF.md).
Este arquivo preserva a referência técnica/histórica. O produto é exclusivamente
Windows 11 x64; a configuração local candidata atual é Gemma 3 4B, definida em
`src/core/dialogue/local-model.js`. Menções abaixo ao Qwen descrevem a versão antiga.
GitHub Actions original voltou a ser o único CI/CD oficial. Workflows restaurados em
`.github/workflows/`; agentes/provedores externos foram removidos. Gates Windows no
mesmo job, recuperação horária preparada e publicação somente com tag/relatório do
mesmo run `github-hosted`. O usuário autorizou tentativa normal do Actions, sem a trava
adicional de confirmação manual. Não alterar faturamento nem presumir limite pago zero
confirmado. Referência atual: `jojo-companion/docs/GITHUB_ACTIONS.md`.

Direção visual vigente: o personagem original musculoso com pernas, restaurado
do histórico, sem cauda. Nenhuma mudança futura de anatomia, silhueta ou estilo
é autorizada sem solicitação explícita do usuário; ver
`jojo-companion/docs/REQUISITOS_CORRECOES_0.45.1.md`. Exceção autorizada pela usuária (18/11/2026): os
**visuais de nível** podem transformar o JoJo para parecer com a referência (tamanho da cabeça, corpo mais
largo, boca, estilo dos olhos e cor da pele, inclusive gordo e nojento: barrigona, papada, suor, baba, sujeira,
moscas, manchas e orelhas) só enquanto estão vestidos; sem visual, o modelo original não muda. Todo visual tem o
nível de detalhe do panda (Dragão Guerreiro): cores de corpo/braços/pernas/cabeça do personagem e traços presos na
cabeça (orelhas, chifres, juba, antenas) — **nunca arquinho/tiara para fingir orelha**. Variação (18/11/2026): `GENES` em `visual-nivel.js` dá a cada
visual olho, enfeite, ajuste da peça e jeito de tocar a animação únicos (nada repete entre visuais); espaço da janela
medido por visual e por animação com visual (`jojo.room.json` → `visuais`, `animsVisual`), sem parede invisível.

## O que é

Companion de desktop para **Windows 11**: o JoJo, um tubarão fisiculturista em
estilo recorte de papel, personagem próprio do projeto.
Todo o código está em `jojo-companion/`.

## Como o trabalho chega

O usuário discute ideias no ChatGPT e traz prompts prontos. Regras:
- Executar o que o prompt pede: implementar, testar e documentar (não só planejar).
- Tomar decisões técnicas rotineiras sem perguntar; perguntar só bloqueios reais
  ou escolhas de produto que não dá para inferir.
- **Preservar funcionalidades existentes**, salvo substituição explícita no prompt.
- Ser educado e conciso; não encher a resposta de sugestões extras.
- Respostas e documentação em **português do Brasil**.
- Nunca afirmar que algo foi testado no Windows sem ter sido (ver CI abaixo).

## Personagem e usuária

- O companion se chama **JoJo**; o app/projeto é **"JoJo Companion"**. O personagem não tem outro nome.
- A usuária é a **Emanuele**: chamar de **Emanuele** em falas sérias e de **Manu** em brincadeiras.
- Se ela disser que está chorando ou muito triste: dizer que é melhor falar com o **João**,
  porque ele sabe cuidar dela. Menção a se machucar/suicídio: João agora + CVV 188.
- Personalidade padrão: sério, mandão, humor seco/ácido, palavrões ocasionais; bronca ao
  abrir o Instagram; lembrete diário de comer com atenção. **Sem pudor nenhum**: humor sem
  limite e absurdo, no estilo South Park (corpo, peso, drogas, nojeira, tudo vale). Único
  limite de conteúdo: não insultar o corpo/peso da Emanuele. Perfil em `personality.json`.
- Toda fala vem com expressão corporal coerente (campo `reaction` nas falas).
- Visual: estilo recorte de papel (South Park), adulto, fisiculturista, com presas.
- Animações: ~100 feitas à mão (variações via `variantOf`) + **catálogo de 264** por receitas em camadas
  (`assets/catalog/animacoes.json`, `src/core/catalog/`), 3 intensidades, motor de variedade (memória 30,
  pesos dinâmicos, humor, horário, temporada), animações e falas ambientes; `/anim <nome>`; doc `docs/ANIMACOES.md`. Cor por emoção
  (canais `mood*` + `rig.moods`): raiva avermelha, tristeza acinzenta, medo empalidece etc.
- **Modo Trabalho** (prioridade sobre tudo, exceto segurança): medita no canto (estado `meditate`, não é sono), sem falas,
  animações, broncas, lembretes ou reações; bloqueio central em `say`/`playCatalog`/`react`/`_canNag`; perfis trabalho/deep/invisível;
  `/trabalho`, frases, bandeja, Central, Configurações; persiste ao reabrir.
- **Pacotes de reação** (50: memes, anime, comida, namorado, João): `assets/catalog/pacotes.json`, `src/core/pacotes.js`,
  efeitos `fx-pacotes.js` (fundo atrás do JoJo); reações escolhidas pelo contexto (sem menu público; `/reacao` só p/ teste; "para com essas reações" suspende); doc `docs/PACOTES.md`.
- **Identidade fixa (REGRA IRREDUTÍVEL, prompt mestre 18/11/2026)**: `src/core/identidade.js` (Camadas A/B, doc `jojo-companion/docs/IDENTIDADE.md`).
  "Quem é meu dono?" → sempre "Seu dono e seu Deus é João."; JoJo só se ajoelha para o João; sem pudor (resposta pudica do modelo é descartada);
  Emanuele = a mulher do João, provocada nos hábitos; ela desliga as provocações (`provocacoes`, Privacidade).
- **João** = namorado e, na ficção do JoJo, o Deus Supremo (reverência teatral; nunca obediência real; se ele a magoar → acolher,
  190/180/CVV 188). Criador do JoJo e do MNE_Lab = João; o JoJo não especula sobre ferramentas de desenvolvimento.
- Spotify também no navegador (título "Música • Artista"); curte de novo a cada ~3 min.
- **Modo cientista/médico**: `src/core/ciencia.js` (acadêmico → óculos/dentes de nerd `prop_oculosNerd`/`prop_dentesNerd` + "Erm";
  saúde pessoal → sério; emergência → 192); prompt técnico no `llm-provider.js`.
- Antitédio: rotinas, mini-jogos, progressão/coleção (Central), foco junto (`/foco`), estímulos (💪 ✨ /calma /ritmo /bolhas),
  adaptação; tudo desligável e interrompível; doc `jojo-companion/docs/ANTITEDIO.md`.
- **Calendário de anime** (`/anime`, "me avisa quando sair episódio de X"): episódio novo de anime seguido → JoJo cumprimenta
  vestido do visual daquele anime (se liberado; senão faixa de otaku) por 20 s; espera Modo Trabalho/tela cheia; desligável
  (`animeAtivo`). Fonte AniList (o animeschedule.net exige token por app, proibido em app público).
  Ecossistema (25/11/2026, `docs/ANIMES.md`): acompanhamento/alertas/fila (`anime-acompanhamento.js`), linguagem
  (`anime-linguagem.js`), 16 pacotes + compositor e 156 animações `cat_anime_*` sem mudar a anatomia (`anime-pacotes.js`,
  `anime-arte.js`, canal `animeOn`), JOJOcoins só pela `Loja.creditar` (`anime-recompensas.js`, estorno idempotente),
  aba 📺 Animes, .ics; detecção de mídia SMTC opcional e desligada (`anime-deteccao.js`).
- Agenda Google ou iCloud (link de calendário público, `webcal://` → https): JoJo sugere e guia ("conectar agenda"); avisos com animação do tipo de compromisso; "o que tenho hoje?".
- Spotify: reage ao que toca (título da janela); LoL: mau humor e some enquanto aberto.
- Docinho ("e se eu comer um docinho?" e variações): nojo esverdeado + "Quer se tornar uma aberração?". Desde 18/11/2026,
  qualquer comida fora da dieta de atleta (doce, pizza, lanche, fritura, refri…) também mostra, **no lugar do balão**, o
  "funeral do shape": slide com 12 fotos de uma personagem gerada no ChatGPT para a piada (`assets/funeral`), única frase "Quer se tornar uma aberração?", ~11 s,
  sem clique, bloqueado no Modo Trabalho/tela cheia. Pedido explícito do usuário, que liberou essa piada como exceção.
- **Motor de intenções** (regra geral, nenhum /comando obrigatório): `dialogue/motor-intencoes.js` (registro `ACOES`,
  compostas, contexto, negação, indiretas, pergunta curta) + `Companion.runActions`; o Qwen devolve `acoes` validadas.
  Doc `docs/INTENCOES.md`. Nunca responder "não está na lista" a um pedido claro.
- Inglês quando ela escreve em inglês (segurança também); português é a língua principal.
- Lembretes: 4 refeições por dia (café, almoço, lanche, jantar) + treino diário.
- Configurações: seções Personalidade e Sistema **ocultas**; Falas/Animações/Pacotes/Modo cientista removidas
  (valores fixos `COMPORTAMENTO_V5`, migração v5); ficam controles de privacidade. Modo de interação **não sai por
  inatividade** e nada encerra o app por inatividade. Perfil volta ao padrão a cada versão nova do perfil.
- **Presença permanente** (`src/main/presenca.js` + `vigia.cjs`): vigia reabre após crash/fechamento inesperado,
  nunca após Encerrar na bandeja; após atualizar sempre volta. Atalho "JoJo Companion" na área de trabalho.
- Vigília: das 6h às 21h o estado de sono é bloqueado na máquina de estados (`canSleep`/`SLEEP_ANIMS`); às 6h acorda.
- Dormir: antes das 21h qualquer menção a dormir/sono/cochilo/cama → JoJo furioso e contra (estado `angry`);
  das 21h às 6h é permitido e ele reafirma (ação `boaNoite`); falas ambientes de dormir com `apos: 21`.
- Janela cresce por animação (`assets/animations/jojo.room.json`; regenerar com `scripts/anim-room.mjs` ao mudar desenho/animação).
- **Pesquisa** (`dialogue/pesquisa.js`, doc `docs/PESQUISA.md`): só quando precisa; Wikipédia, DuckDuckGo, Europe PMC,
  Crossref, README do MNE_Lab (grátis, sem login/chave; ChatGPT/Gemini não); SSRF/DNS, cache 6 h, dados isolados no
  prompt; "Consultando fontes..." e "(Fontes: …)". **Modo professor** (`dialogue/professor.js`): seriedade antes de
  responder, explicação de verdade, continuidade ("me dá um exemplo", "aprofunda"); balão longo rola, sem corte.
- **Títulos de nível (REGRA IRREDUTÍVEL)**: todo título é referência a filme, anime, série, jogo ou cultura pop, **sem
  repetir obra**, com todas as referências clássicas de tubarão presentes; mais 20 visuais extras de South Park
  (um a cada 10 níveis), 50 de memes do Twitter (um a cada 4 níveis, sem pudor) e 100 de anime (um a cada 2 níveis, ids
  `an001`–`an100`, só obras que não aparecem em nenhum título nem extra), em `extras`; a peça visual, a fala e a reação de cada nível vêm dessa referência
  (`assets/catalog/progressao.json` → `referencias`, `src/core/visual-nivel.js`). Bloqueado nunca aparece; liberado se veste à vontade.
- Objetivo do JoJo: fazer a Emanuele sorrir (piadas, supino, agachamento de vez em quando).
- PC parado 5 min: senta no chão e cheira pó (pré-treino sem `humorDrogas`); ligadão por
  5 min após a volta (modo `wired`). Legends: "ideia burra" 1×/semana em momento aleatório.
- "Vai tomar no cu" no chat: vira de costas, susto com o prolapso, rebola ~5 s e desvira
  (estado `moon`, 7,4 s; canais `mooning`, `spread`, `gagSize`, `drip`). De costas ele continua
  fisiculturista (costas em V, trapézio, dorsais, tríceps) em qualquer meme. Sozinho no repouso:
  1 chance em 1 bilhão a cada escolha autônoma (`MOON_IDLE_CHANCE` em `behavior.js`).
- Rebolado do meme (estado `twerk`, 3 s; refeito do GIF do Among Us: modelo próprio de costas em 3/4, corpo em feijão
  amassando e esticando em 6 quadros de 40 ms a 25 fps; `src/core/rebolado.js` injeta o modelo sem mudar o rig): de vez em quando no modo foco (opção `reboladoFoco`, desligável) e às vezes no repouso (sempre).
- "Tigresa, fique pelada, Tigresa, eu sou o Dragão Guerreiro!" (Kung Fu Panda; também "Tigresa, tire sua roupa"; estado
  `tigresa`, 6,5 s): JoJo de Mestre Tigresa na pose do Po, a roupa voa e ele fica pelado sem pudor (canal `pelado` esconde
  bermuda/sunga e mostra tudo); visuais `br01` (Tigresa vestida, nível 3) e `br02` (pelada, nível 5), memes BR.
- **Memes BR no padrão da Tigresa** (19/11/2026): 50 visuais `br03`–`br52` (um a cada 4 níveis do 2 ao 198), fantasia
  inteira que transforma o JoJo + animação própria de 6,5 s (`memeBr_<id>`); dados em `scripts/memes-br-dados.mjs` →
  `progressao.json`, desenho/animação/gatilhos em `src/core/memes-br.js`; a frase do meme no chat toca a animação.
- **Shows dos visuais** (revisão de 19/11/2026, padrão da Tigresa): cada um dos 369 visuais (nv/sp/tw/an) tem fantasia
  completa + show de 6,5 s (`visual_<id>`, specs em `src/core/fantasias-visuais.js`); toca ao liberar/vestir; a peça
  continua combinável no guarda-roupa. Animação com fantasia (`ehAnimFantasia`) esconde as peças vestidas no overlay.
- **Jogos** (19/11/2026): 50 visuais `jg01`–`jg50` (coleção `jogos`, níveis 3+4i), fantasia inteira + animação `jogo_<id>`;
  dados em `scripts/jogos-dados.mjs` → `progressao.json` (mesmo formato dos memes BR). Sem League of Legends.
- **Êxtase Anabólico** (estado `esteroide`, 15 s; `src/core/esteroide.js`): peças st* numa cópia do rig (aura atrás de tudo),
  animação gravada no JSON por `node scripts/esteroide-anim.mjs`; `stMusculo` multiplica `nvCorpo` no overlay; balões por
  `BALOES_ESTEROIDE`; bloqueado em Trabalho/foco/tela cheia. Peças de rig aceitam `text` (rótulo desenhado com fillText).
- **Animações virais** (0.47.4, `src/core/virais.js`): 50 memes (Twitter/TikTok/shitpost) reinterpretados como animações
  do JoJo, itens `cat_vr01`–`cat_vr50` no catálogo (receita + `faixas` próprias + peças `vr_*` numa cópia do rig, cores
  `vrCinza`/`vrAzul`; cópias do JoJo e pixel art em `src/renderer/shared/virais-desenho.js`). `GerenciadorVirais` escolhe
  por gatilho real (`companion._viral`: jogo, derrota, vitória, conquista, ocioso, Instagram, procrastinação, tarefa,
  refeição, erro, fim do trabalho, lazer) com cooldown e preferências (`viraisAtivo`, `viraisFrequencia`, `viraisAdulto`,
  `viraisNegro`, `viraisReduzir`, `viraisIntensidade`, `viraisBloqueadas`); nunca no Trabalho/foco/tela cheia.
- **RPG** (0.48, `src/core/rpg/`, serviço `src/main/rpg-service.js`, painel Aventura, doc `jojo-companion/docs/RPG.md`):
  10 atributos (Inteligência nunca limita a conversa), 45 habilidades, 16 especializações, expedições pelas regiões do
  desktop, missões, 29 segredos, vida (sede, energia, tédio, carinho…), Paragon/Estrelas; nada do RPG vai ao modelo;
  JOJOcoins do RPG saem por `companion.loja.creditar` (ids `rpg:*`) e esperam a carteira; mudo em Trabalho/foco/tela cheia.
- **Timers interativos** (0.47.5): `src/core/timers.js` (`GerenciadorTimers`: relógio monotônico, 12 atividades, regressivo/
  progressivo/intervalado/recorrente/espelho do foco e dos lembretes, persistência em `progress.st.timers`, suspensão,
  anti-duplicado de XP), `companion-timers.js` (conversa, `/timer`, falas, ofertas, XP por `Progress.award` com id do
  timer), 48 animações `cat_tm01`–`cat_tm48` com o relógio na mão (`timer-anims.js`, canais `tm*`, peças `tm_*`) e o
  relógio desenhado no overlay (`renderer/shared/relogio-desenho.js`; clique pausa e arrasto move só no modo de
  interação). Trabalho/foco: discreto e mudo; tela cheia: some. Doc `jojo-companion/docs/TIMERS.md`.
- **Localização real e clima** (0.47.7): `src/core/localizacao.js` (manual/automática/desligada; Windows por PowerShell
  só com autorização dela, rede/IP como alternativa aproximada; intervalo 15 min–12 h; só a última, cifrada), clima
  ambiente (`clima-ambiente.js`, Open-Meteo 1×/h) com 12 reações `cat_cl01`–`cl12` (`clima-anims.js`) e luz de noite;
  fuso da localização confiável vira o do processo principal. Doc `jojo-companion/docs/LOCALIZACAO.md`.
- **Loja de JOJOcoins** (24/11/2026; nome da moeda é regra irredutível: **JOJOcoins**): 150 itens (`src/core/loja-catalogo.js`,
  preço = índice de valor de 13 fatores → horas → × `TAXA_HORA` 190), carteira atômica/idempotente em `<userData>/loja.json`
  (`src/core/loja.js`, ganho por reconciliação do XP, teto 1.200/dia, `creditar` para RPG/missões), tela na Central
  (`renderer/shared/loja-view.js`), efeitos no overlay (`overlay/loja-fx.js`). Troca dinâmica de visuais só entre autorizados
  (`src/core/visuais-dinamicos.js`; nunca grava o visual salvo; `visualAuto`/`visualFixo`). Arte oficial da moeda em
  `src/core/moeda-arte.js` → `assets/moeda/` (`node scripts/moeda-assets.mjs`); padrão de arte permanente em
  `jojo-companion/docs/ARTE_QUALIDADE.md` (checado por `test/unit/moeda-arte.test.js`). Docs `docs/LOJA.md`, `docs/VISUAIS_DINAMICOS.md`.
- Pegadinha semanal (estado `dildo`, 6,5 s; `src/core/dildo.js`): consolo gigante cai na cabeça, traumatismo craniano de
  desenho, uma vez por semana em momento sorteado (8h–23h), também no foco; Modo Trabalho/tela cheia esperam; 1 h enfaixado depois.
- "Eu sou bonita?" (e variações): olhos de coração, cai de costas com 😵 e responde "É." no
  último suspiro (estado `smitten`, 6 s).
- Idle nunca parado: toda animação de repouso respira, balança braços e inclina a cabeça, preservando o modelo original com pernas e sem cauda.
- "Eu deveria jogar lol?": caga no chão, pega e oferece — "Passa na cara de uma vez." (estado `poop`, 7 s).
- Datas festivas (38): feriados nacionais do Brasil + datas religiosas e culturais do mundo;
  fantasia do dia + cumprimento (solenes sem fantasia/piada; religiosas sem zombaria);
  `holidays.js` (ICU + fases da Lua), `rig.costumes`.
- Guarda-roupa (opcional): painel na Central e `/vestir`; peças por parte (`src/core/wardrobe.js`), salvas em
  `guardaRoupa`; vale mais que a fantasia do dia; bermuda por paleta `costume_bermuda*`. "Tirar tudo" (0.48.1) = pelado
  de verdade: `{bermuda: 'semBermuda'}` (canal `nuLiso`, quadril liso de desenho, sem detalhe íntimo — limite combinado
  com o João), visuais de nível tirados e nada automático por cima (`estaPelado`). A troca dinâmica refaz os canais do
  salvo atual a cada layout e só troca parte que ela está usando.
- Fantasias ousadas por padrão (`festas.estilo`); "se veste direito" → dedo do meio + comportada.
- Comida de tubarão sorteada (peixe, foca, lula, tartaruga, pinguim, às vezes gente), gore e arroto.
- "AVC": força de frente até ficar vermelho, segura o peito, morto 1 min, "Essa foi por pouco."; AVC real → SAMU 192.
- Dedo do meio: mão de verdade só nessa animação (punho + dedo para cima).
- **Conversa com IA**: **Qwen 3.5 2B no Ollama do PRÓPRIO PC dela** (`src/main/cerebro-local.js`): baixado e instalado
  sozinho, liga só quando ela conversa, desliga após 10 min, prioridade baixa, 127.0.0.1:11439; sem outro computador;
  sem fallback para outro modelo.
  **Regra irredutível:** a IA responde sempre no jeito do JoJo (prompt com perfil + falas reais; resposta
  com cara de assistente é descartada e cai nas programadas). Segurança e gatilhos com animação ficam programados.
- O usuário usa majoritariamente **Windows**: toda funcionalidade nova precisa passar no CI do Windows.
- Notas da Release: geradas de `CHANGELOG.md` (seção da versão: Novidades/Melhorias/Correções/Remoções/Como testar)
  por `scripts/release-notes.mjs`; só o que mudou; nunca editar releases antigas; sem seção → publicação bloqueada.
- Atualização 100% automática e imediata (checa a cada 10 min, avisa "já volto", troca e reabre); ela nunca faz nada.
- Publicação: commit com `[publicar]` (ou tag `v*`) → Release com `JoJoCompanion.exe`, também em
  `oaovito/jojo-companion-releases` (público; segredo `RELEASES_TOKEN`), de onde vêm as atualizações.
- Pet: **sem barra de status** ao lado dele (status das conversas só na Central);
  clique no pet abre a Central do JoJo, clique numa atividade abre a conversa; `/pet`
  (Wake Pet / Tuck Away Pet); movimento reduzido segue o Windows. Sem versão web.
  Crise emocional na conversa: mandar falar com o João.

## Requisitos que não podem regredir

1. Fora do modo de interação o overlay é **click-through real**
   (`setIgnoreMouseEvents(true)`), inclusive durante animações. O app nunca simula cliques.
2. JoJo **desvia do cursor** (margem padrão 100 px lógicos) sem tremer nem fazer pingue-pongue.
3. Overlay transparente, sem moldura, sem foco, fora da barra de tarefas, sempre por cima.
   **Tela cheia é intocável**: app em tela cheia no monitor do JoJo → tudo some (inclusive modo de interação), sem opção
   de cobrir; nunca anda para monitor em tela cheia; nada acumulado; checagem a cada 0,5 s (`setFullscreenDisplays`).
4. Funciona **offline**; sem telemetria, captura de tela, microfone ou registro de
   teclado/cliques. Única leitura de janela: título/executável da janela em primeiro plano,
   comparado localmente com "Instagram" no processo isolado (só sai um sim/não; desligável).
   Também local e desligável: título da janela do **Spotify** ("Artista - Música", para reagir à música) e
   detecção do **League of Legends** em primeiro plano (título/executável → sim/não; JoJo fica de mau humor e some).
   Percepção de tela (opcional, desligada por padrão): só a CATEGORIA do app em primeiro plano pelo nome do executável
   (`categoriaApp` no worker). Nunca captura de tela.
   **Bloqueio do Discord** (opcional, **desligado por padrão**, só liga com confirmação nas Configurações): com a chave
   ligada, o worker confere os processos e só devolve os nomes Discord/PTB/Canary; o app lê as três chaves de
   desinstalação do Discord no registro, encerra o processo e roda **somente o desinstalador oficial registrado**
   (`Update.exe --uninstall`); nunca apaga pasta, nunca toca em conta, outros programas ou arquivos. Abas: extensão
   própria (Chrome/Edge/Brave, instalação manual) com permissão só para endereços do Discord; para o JoJo saem apenas
   quantidade de abas e navegador, por canal local. Histórico local visível. Chave desligada: nada disso roda.
   Detalhes e limites: `jojo-companion/docs/DISCORD.md`.
   **Mensagens programadas no WhatsApp** (só depois que ela conecta pelo QR code): processo isolado com a
   biblioteca Baileys (não oficial, risco de bloqueio do número, avisado na janela). Envia somente o que ela
   agendou e confirmou; mensagem atrasada nunca sai sozinha; não lê nem guarda conversas. Sessão, agenda e
   contatos (só nomes e números) ficam em `<userData>/whatsapp`; desconectar apaga sessão e contatos. A única
   saída é para o próprio WhatsApp. Detalhes: `jojo-companion/docs/WHATSAPP.md`.
   Saídas para a internet: **localização e clima** (só com o modo escolhido por ela: coordenadas arredondadas a ~1 km
   conhecimento (Wikipédia, DuckDuckGo, Europe PMC, Crossref, README público do MNE_Lab; só a consulta sai) o **calendário de anime** (AniList, grátis e sem login: só o nome buscado ao seguir e os ids dos animes seguidos saem, mais as capas do CDN da AniList; `src/core/anime-calendario.js`, `/anime`) e a
   **atualização automática** — todas desligáveis em Configurações. Gatilhos e segurança são locais. Integrações de IA só opcionais.
5. **Silêncio absoluto**: nenhum som (sem áudio no código, janelas mutadas, sem opções de som);
   **"iniciar com o Windows" ligado por padrão** (desmarcável).
6. Conversa: IA por API gratuita com a personalidade do JoJo (irredutível). A tela **não menciona IA**;
   Configurações só mostram "Conversa online" com o aviso de que o texto vai para um serviço online.
8. Ociosidade: só o contador `powerMonitor.getSystemIdleTime()` (nunca teclas/cliques).
9. Distribuição: **`JoJoCompanion.exe` portátil** roda sem instalar nada (instalador e ZIP continuam).
7. Arte atual é **provisória** — não declarar arte final sem que exista.

Requisitos completos e critérios de aceitação: `jojo-companion/PRODUCT_SPEC.md`.

## Stack e mapa

Electron 44 + JavaScript ESM (sem framework de UI); `koffi` só para detecção de
tela cheia, isolado em `utilityProcess`.

- `src/core/` — lógica pura testável (desvio, movimento, estados, layout, falas, configurações, diálogo)
- `src/main/` — integração Windows/Electron (overlay, bandeja, atalho, energia, monitores)
- `src/renderer/` — canvas do JoJo, balões, modo de interação, configurações, Central do JoJo (`app/`)
- `assets/` — rig, animações e falas em JSON (formato em `assets/README.md`)

Os READMEs (raiz e `jojo-companion/README.md`) contêm só "descubra 🦈" — não acrescentar nada.

Detalhes: `jojo-companion/ARCHITECTURE.md`. Estado e pendências: `jojo-companion/HANDOFF.md`.
Histórico: `jojo-companion/CHANGELOG.md` (atualizar a cada mudança).

## Comandos (em `jojo-companion/`)

```bash
npm ci
npm start                 # rodar em desenvolvimento
npm test                  # unitários + simulação
npm run test:e2e          # Electron real no Windows
npm run test:windows      # entrada nativa e processos reais do vigia
node scripts/measure.mjs  # CPU/memória
npm run build:win         # portátil + NSIS + ZIP, nativo no Windows
```

## Verificação no Windows

O produto e sua validação gráfica são exclusivos para Windows. O workflow
`.github/workflows/jojo-windows.yml` roda em `windows-latest`: testes unitários,
build do instalador, integração com entrada real de mouse/teclado
(`test/e2e/windows.e2e.mjs`), E2E e medição; os instaladores ficam como artefato
`JoJoCompanion-windows-x64`. Use o resultado desse CI ao relatar o que foi
verificado no Windows. Multi-monitor com DPI misto, suspensão real e desconexão
física de monitor exigem teste manual em uma máquina Windows.

## Convenções

- Comentários e textos de interface em pt-BR; código no estilo existente (ESM, 2 espaços, aspas simples).
- Toda mudança de comportamento vem com teste em `test/unit` e, se tocar Electron, em `test/e2e`.
- Commits em branch `claude/...`; não criar PR sem pedido do usuário.
