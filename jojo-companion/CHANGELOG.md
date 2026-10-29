# CHANGELOG

## 0.32.0 — 2026-10-29

### Adicionado
- **Entende pedidos ditos de qualquer jeito** (regra geral): "pare com a sessão de foco", "chega de
  estudar", "cansei" (com o foco ativo), "some daqui", "volta", "pausa", "para de falar", "abre as
  configurações", "vamos estudar 40 minutos"… viram a ação certa, sem "/" (`src/core/dialogue/intencoes.js`,
  funciona offline). A conversa online também interpreta o que ela quis dizer e devolve um comando
  validado de uma lista fechada. "para" como preposição e perguntas não viram comando; segurança vem antes.

### Corrigido
- Encerrar o foco para na hora a animação de estudar/treinar junto.

## 0.31.2 — 2026-10-29

### Corrigido
- **Bronca do Instagram em qualquer atividade**: interrompe animação, rotina, jogo, supino, sono,
  chat aberto e também o foco junto (antes, no foco, virava só um lembrete gentil). A fala não é
  mais atropelada (ex.: pelo "acordei") e, se o JoJo estiver fugindo do cursor ou escondido, a bronca
  sai na próxima checagem em vez de esperar 2 min. Modo silencioso continua sem bronca.

## 0.31.1 — 2026-10-29

### Adicionado
- Easter egg: a cada escolha do repouso, **1 chance em 1 bilhão** de o JoJo fazer sozinho a
  animação do "vai tomar no cu" (vira, rebola e desvira), sem nenhum comando (`MOON_IDLE_CHANCE`).

## 0.31.0 — 2026-10-29

### Adicionado
- **Agenda do iCloud**: além da Google Agenda, o JoJo conecta o calendário do iCloud pelo link de
  "Calendário Público" (o `webcal://` que o iPhone copia vira `https://`). "conectar agenda" pergunta
  se é Google ou iCloud e guia o passo a passo de cada um; avisos, "o que tenho hoje?" e
  desconectar funcionam igual. Configurações: seção "Agenda (Google ou iCloud)".

## 0.30.0 — 2026-10-29

### Adicionado
- **Guarda-roupa** (brincar de boneca, opcional): painel "👗 Guarda-roupa" na Central com peças
  por parte do corpo (cabeça, rosto, pescoço, corpo, na mão e cor da bermuda), 46 peças, look
  surpresa e "tirar tudo". Clicar veste na hora; clicar de novo tira. O JoJo se olha no espelho e
  comenta. A roupa fica salva e vale mais que a fantasia da data festiva; a peça da mão some
  enquanto a animação usa outro objeto. Também por `/vestir` (`/vestir coroa`, `/vestir surpresa`,
  `/vestir tirar`) e por frases como "vamos brincar de boneca".

## 0.29.2 — 2026-10-29

### Alterado
- **Dormir depois das 21h é permitido**: das 21h às 6h, falar em dormir/sono/cama no chat faz o
  JoJo reafirmar que agora pode (boa noite, também em inglês e na conversa online); antes das 21h
  ele continua furioso e contra. Falas ambientes de dormir só aparecem depois das 21h (`apos`).

### Corrigido
- Teste do Legends determinístico (o sorteio podia cair num horário que a checagem horária pulava).

## 0.29.1 — 2026-10-29

### Corrigido
- Aviso "já estou aberto" (segunda execução) se perdia quando o JoJo estava fugindo do cursor; agora tenta de novo depois da fuga.

## 0.29.0 — 2026-10-29

### Adicionado
- **Sistema antitédio** completo (`docs/ANTITEDIO.md`): rotinas e mini-histórias (15, com
  progresso no dia e história em episódios), 15 mini-jogos (quiz, verdade ou mentira, pedra-papel-
  nadadeira, repetições em dupla, caça-palavras, memória, siga o líder, reflexo, esconde-esconde,
  pega-pega, cabo de guerra, clique rápido, caça às bolhas…), progressão (10 níveis do shape,
  conquistas, acessórios, álbum, cartas de frases, áreas do aquário, missões diárias opcionais,
  diário com resumo do dia), **foco junto** (`/foco 25`, `/foco 25 treino`), estímulos (💪 fidget
  de bíceps com contador, ✨ estímulo, `/calma` com cardume e cores suaves, `/ritmo`, `/bolhas`,
  ondinhas no cursor) e adaptação (horários, curtiu/ignorou, humor do dia, dia quieto,
  interesses, `/rotina bom dia: …`).
- Central → **Coleção e jogos**. Micromovimentos novos (olhar segue o cursor, dorsal, músculo,
  brilho nas escamas e no dente). Tédio do tubarão e temporada da semana anunciada.
- Configurações: "Animações mais agitadas" e volume dos sons. Comandos `/jogo`, `/foco`,
  `/estimulo`, `/calma`, `/ritmo`, `/bolhas`, `/resumo`, `/rotina`, `/pausa`.

## 0.28.0 — 2026-10-29

### Adicionado
- **Google Agenda** (só leitura): o JoJo sugere conectar (uma vez, depois de 10 min aberto) e guia
  no chat ("conectar agenda"): ela copia o "Endereço secreto no formato iCal" e cola no chat. Ele
  avisa antes de cada compromisso (padrão 10 min) e quando começa, com animação do tipo (treino →
  duplo bíceps, reunião → modo foco, aula → lendo, festa → comemora, médico → lembrete), resume o dia
  de manhã e responde "o que eu tenho hoje/amanhã?". "Desconectar agenda" remove.
  Busca a agenda no Google a cada 10 min; o endereço fica só neste PC. Configurações → Google Agenda.

## 0.27.0 — 2026-10-29

### Adicionado
- **Spotify**: o JoJo reage à música que está tocando (só o título da janela do Spotify, lido
  neste PC): animação que combina com o clima (treino, funk, rock, rap, calma, amor, triste,
  festa), comentário no jeito dele no máximo a cada 4 min e "o que tá tocando?" no chat.
- **League of Legends**: ao abrir, ele fica de mau humor, reclama e some; volta emburrado depois
  que ela sai do jogo. Não mexe no jogo.
- Configurações → Falas e sons: "Reagir ao que toca no Spotify" e "Ficar de mau humor e sumir
  quando o League of Legends abrir" (ligados por padrão).

## 0.26.0 — 2026-10-29

### Adicionado
- **Catálogo de 264 animações** (`assets/catalog/animacoes.json`) cobrindo as três listas
  (base, "sem pudor" e ambientes), geradas por receitas em camadas (corpo + braços + cabeça +
  rosto + cauda + dorsal + objeto + efeito + humor) em `src/core/catalog/recipes.js`, cada uma
  em 3 intensidades e com versão estática. Lista completa e gatilhos: `docs/ANIMACOES.md`.
- 22 objetos novos no boneco (livro, celular, espelho, halter, caneca, pote de peixinhos,
  troféu, microfone, relógio, peixe de borracha, caderno, frango, toalha, óculos escuros,
  palito, medalha, notebook, baú, castelo de areia, torre de pesos, alga, coberta), piscadinha
  de um olho, bochechas de baiacu, guelras mexendo e efeitos (bolhas, notas, lágrimas, chuva,
  vento, confete, vapor, neve, brilho de dente, aura, tubarão fantasma, dorsal cortando a tela).
- **Motor de variedade** (`src/core/catalog/variety.js`): sorteio ponderado com memória das
  últimas 30 ações (nunca repete em sequência), pesos que crescem com o tempo sem aparecer,
  humor/energia do momento, período do dia, temporada da semana, contador de tédio e
  adaptação (mais do que ela curte, menos do que ignora). Estado em `variedade.json`.
- **Animações ambientes** sozinho enquanto ela trabalha e **falas ambientes** (120 da lista +
  apoio, `assets/dialogue/falas-ambientes.json`) ligadas à animação do momento.
- Gatilhos: `/anim <nome>`, frases no chat ("faz uma dancinha", "selfie", "modo fera"…),
  gestos no modo de interação (clique, duplo clique, segurar, cócegas, jogar) e eventos
  (conversa aberta, pensando, pesquisando, erro, sucesso, ausente, voltou, pausa após 90 min,
  carência discreta, notificação, sequência de dias, bom dia/boa noite, lembretes, /pet).
- Configurações → **Animações e estímulos**: frequência, intensidade, energia (calmo/pilhado),
  micromovimentos, falas ambientes, surpresas e aviso antes de algo raro.
- **Docinho**: "e se eu comer um docinho?" (e variações) → nojo (tom esverdeado) e
  "Quer se tornar uma aberração?".
- **Inglês quando necessário**: entende e responde em inglês se ela escrever em inglês
  (segurança com João/CVV também); português continua a língua principal.
- **Quatro lembretes de refeição** por dia (café da manhã, almoço, lanche, jantar) e lembrete
  diário de que treinar é essencial.

### Alterado
- Configurações: as seções **Personalidade** e **Sistema** não aparecem mais. O perfil volta ao
  padrão do desenvolvedor ao atualizar (versão do perfil 2), com o novo texto de comportamento.
- **Instagram**: a bronca não se perde mais quando o JoJo não podia falar na hora e volta a cada
  intervalo enquanto ela continua usando.
- Aviso de falha da conversa online não menciona IA.

## 0.25.0 — 2026-10-29

### Corrigido
- **Balão de fala** não fica mais por cima do painel de conversa, da barra ou do próprio
  JoJo: quando o lado preferido está ocupado ele pula o obstáculo; sem lugar livre com a
  conversa aberta, a fala fica só no painel.
- **Sem "parede invisível"**: a janela cresce o necessário para cada animação e efeito
  (medidas em `assets/animations/jojo.room.json`, geradas por `scripts/anim-room.mjs`),
  sem invadir outro monitor.
- **Supino** refeito: deitado de lado no banco comprido, só o braço de perto, anilha de
  verdade e a perna apoiada no chão. **Agachamento** refeito: barra nos ombros por cima
  das mãos, joelhos dobrados para fora e pés no chão (sem afundar no piso).
- **Respostas mais rápidas**: espera máxima da conversa online de 8 s (era 20 s); depois
  de uma falha a conversa responde na hora por 90 s; Wikipédia e DuckDuckGo em paralelo;
  balão "…" de pensamento quando a resposta demora.

### Alterado
- **Dormir**: qualquer menção a dormir, sono, cochilo, soneca ou cama, em qualquer
  horário, deixa o JoJo furioso e contra a ideia (nunca dorme pelo chat, não pesquisa).

## 0.24.0 — 2026-10-29

### Alterado
- **Mais leve**: o JoJo é desenhado sem aceleração de vídeo (canvas pequeno). Menos
  memória (no Linux o processo de vídeo caiu de ~123 MB para ~52 MB) e, no Windows, sem a
  cópia da placa de vídeo para a janela transparente a cada quadro. `JOJO_GPU=1` religa.
- Pacote só com os idiomas pt-BR e en-US do Chromium (download e extração menores).
- Desenho do rig sem alocação por quadro nos grupos ocultáveis.
- CI do Windows mede também com aceleração ligada, para comparação.

## 0.23.2 — 2026-10-29

### Corrigido
- Testes do Windows mais estáveis em máquinas lentas do CI: Instagram, conversa
  online e comida esperam o resultado com folga em vez de tempo fixo.

## 0.23.1 — 2026-10-29

### Corrigido
- Atualização do executável portátil no Windows: o script de troca não se apaga
  mais enquanto roda (o cmd encerrava com "arquivo em lote não encontrado"); o app
  remove o script na próxima abertura.
- Testes do Windows: a ociosidade real do runner não dispara mais o pó durante os
  testes; o teste de "iniciar com o Windows" considera o padrão ligado.

## 0.23.0 — 2026-10-29

### Adicionado
- **Conversa natural**: o JoJo entende o que a Emanuele diz e responde de forma
  orgânica, sem repetir, por API gratuita (Pollinations, sem chave; Groq, Gemini
  ou OpenRouter com chave grátis, só pelo arquivo de configurações). Histórico da
  conversa vai junto e as respostas trazem a expressão corporal.
- **Personalidade irredutível**: instruções com o perfil do JoJo + falas reais
  dele como modelo; respostas com cara de assistente ("como IA", "desculpe",
  "posso ajudar"…) ou longas são descartadas e caem nas respostas programadas.
- Segurança (tristeza → João, crise → CVV 188, AVC real → SAMU 192) e gatilhos com
  animação própria continuam sempre programados. Sem internet: respostas programadas.
- "Veste uma roupa" é o gatilho principal da troca para a fantasia comportada.

### Alterado
- Nada na tela menciona IA ou "respostas programadas"; tudo vem pré-configurado. As
  Configurações mantêm só "Conversa online" (com o aviso de que o texto vai para um
  serviço online).

## 0.22.0 — 2026-10-29

### Alterado
- Dedo do meio com **mão de verdade** (estilo South Park): punho, polegar, dedos
  dobrados e o dedo do meio esticado para cima, com dobras e unha; a barbatana da
  mão some só nessa animação.
- **AVC** sem a vista de costas: ele faz força de frente até ficar vermelho e
  suado, segura o peito, cai morto 1 min e volta ("Essa foi por pouco.").
- **Sem pudor**: a personalidade gira em torno da falta de pudor — humor sem
  limite e absurdo (corpo, peso, nojeira, drogas). Falas novas nesse tom. Só o
  lembrete de comida não insulta o corpo da Emanuele.
- **Inicia com o Windows** por padrão (desmarcável em Configurações). Configurações
  antigas com o padrão anterior migram para ligado (formato de configurações v2).

## 0.21.0 — 2026-10-29

### Adicionado
- **Fantasias ousadas** por padrão: sunga mínima nas cores da fantasia, meia
  arrastão, liga com laço e colarinho com gravata-borboleta. "Se veste direito" (e
  variações): o JoJo acha ruim, mostra o **dedo do meio** e veste a versão
  comportada (lembra da escolha); "pode voltar a fantasia ousada" desfaz. Datas
  islâmicas, judaicas, hindus e budistas: só a versão comportada.
- **Comida de tubarão**: a cada refeição sorteia peixe, foca, lula, tartaruga,
  pinguim ou, de vez em quando, **gente** (perna de turista com tênis). Mordidas
  ensanguentadas, sangue pingando, osso (ou tênis) caindo e **sempre um arroto**
  no fim ("BUUURP!" com nuvem verde).
- **"AVC"** no chat: vira de costas fazendo força até ficar vermelho, vira
  segurando o peito, cai morto (olhos em X, moscas) por **1 minuto** e volta à
  vida dizendo **"Essa foi por pouco."**. Morto ele não foge do cursor. Sintomas de
  AVC de verdade ("tô tendo um AVC", "boca torta") dão resposta séria: SAMU 192 e o João.

## 0.20.0 — 2026-10-29

### Adicionado
- **Datas festivas do mundo todo** (38): todos os feriados nacionais do Brasil;
  cristãs (Reis, Sexta-feira Santa, Páscoa, Corpus Christi, Todos os Santos,
  Finados, Natal); islâmicas (início do Ramadã, Eid al-Fitr, Eid al-Adha, Ano Novo
  islâmico); judaicas (Purim, Pessach, Rosh Hashaná, Yom Kippur, Hanukkah); hindus
  (Holi, Diwali); budista (Vesak); Ano Novo Chinês; e culturais (Namorados 14/2 e
  12/6, Dia da Mulher, St. Patrick, Dia da Terra, Dia do Trabalho, Mães, Pais,
  Orgulho LGBTQIA+, Festa Junina, Dia das Crianças, Halloween, Día de Muertos,
  Ação de Graças). Datas móveis pelos calendários islâmico, hebraico e chinês do
  sistema (ICU) e por fases da Lua (Meeus) para Holi, Diwali e Vesak.
- 18 fantasias novas (coroa, tiara de corações, chapéu verde, coroa de folhas,
  capacete, calêndulas, chapéu de peregrino, faixa e bandeira do Brasil, tinta do
  Holi, gravata, cachecol, lanternas, flor, diya, lótus, maçã, bandeira arco-íris).
- Datas solenes (Sexta-feira Santa, Yom Kippur, Finados, Corpus Christi,
  Consciência Negra): sem fantasia e sem piada. Religiosas: ele deseja, sem zombar.
  Seculares: às vezes se recusa a desejar.
- Windows: testes reais da troca do executável na atualização (cmd.exe) e dos
  calendários no Electron.

### Alterado
- A Release no repositório do código não derruba mais a execução (as atualizações
  vêm do repositório público).

## 0.19.0 — 2026-10-29

### Adicionado
- **Datas festivas**: o JoJo veste a fantasia do dia e cumprimenta uma vez — às
  vezes deseja, às vezes se recusa, no jeito dele. Natal (gorro torto, bermuda
  vermelha), Ano Novo (chapéu de festa, bermuda branca, brilhos), Páscoa (orelhas
  de coelho, uma caída), Carnaval (coroa de penas, bermuda dourada, brilhos),
  Festa Junina (chapéu de palha remendado, sardas, bermuda xadrez), Dia das
  Crianças (boné de hélice) e Halloween (capa de vampiro). Páscoa e Carnaval
  calculados por ano. Desligável no perfil (`festas.ativo`).

### Alterado
- Atualização automática passa a buscar as versões no repositório público
  `oaovito/jojo-companion-releases`; o workflow publica lá quando o segredo
  `RELEASES_TOKEN` existe.

## 0.18.0 — 2026-10-29

### Adicionado
- "Eu deveria jogar lol?" (e variações: "devo jogar lol?", "posso jogar league of
  legends?", "bora de lol"): o JoJo olha pros lados, agacha vermelho de força
  tremendo, solta um cocô no chão (com milho, poça, brilho molhado), suspira
  aliviado, pega com a mão — pingando, com moscas e mau cheiro verde — e oferece
  dizendo **"Passa na cara de uma vez."** (7 s).
- Efeitos: linhas de mau cheiro e moscas (`stink`).

## 0.17.0 — 2026-10-29

### Adicionado
- **Atualização automática**: 1 min após abrir e a cada 6 h, consulta a última
  Release (`package.json` → `jojoUpdate`), baixa a versão nova em segundo plano
  (confere tamanho e SHA-256), e troca quando o PC fica parado por 2 min ou ao
  encerrar. Portátil: substitui o próprio `JoJoCompanion.exe` e reabre.
  Instalado: roda o instalador novo em silêncio. Depois de atualizar o JoJo avisa.
  Desligável em Configurações ("Atualizar automaticamente"). ZIP não se atualiza.

## 0.16.0 — 2026-10-29

### Alterado
- Repouso sempre animado: todas as animações de idle (em pé, sentado, deitado,
  modo de interação, variações e modo ligadão) ganharam respiração, sobe-desce,
  braços balançando, cabeça inclinando, rabo abanando e troca de peso. Nada fica
  parado (o movimento reduzido do Windows continua usando quadros estáticos).

## 0.15.0 — 2026-10-29

### Adicionado
- "Eu sou bonita?" (e variações: "sou linda?", "tô bonita hoje?", "você me acha
  bonita?"): o JoJo fica com **olhos de coração**, corado, cambaleia, **cai de
  costas** com a cara de 😵 (olhos em X, língua de fora) e, no último suspiro,
  responde **"É."** — depois levanta e volta ao normal (6 s).
- Rig: olhos de coração (`heartEyes`) e em X (`eyeX`).

## 0.14.0 — 2026-10-29

### Alterado
- Vista de costas (usada nas animações de meme) redesenhada como fisiculturista:
  costas em V com trapézio e dorsais largos, coluna marcada, deltoides posteriores,
  tríceps grandes, glúteos e posteriores da coxa definidos, panturrilhas.

## 0.13.0 — 2026-10-29

### Alterado
- Meme do "vai tomar no cu" virou animação completa (7,4 s): o JoJo **vira de
  costas** (giro de recorte de papel), curva o corpo e abre as nádegas de uma vez —
  **susto** com zoom e o prolapso saltando grande —, **rebola** de um lado pro
  outro por ~5 s mostrando tudo e **desvira**. Prolapso bem nojento no traço do
  desenho: maior, pulsando, com dobras, veias, brilho molhado e gosma escorrendo e
  pingando.
- Rig: peças podem deslizar (`dx`/`dy`) e crescer (`scaleBy`) por canal.

## 0.12.0 — 2026-10-29

### Adicionado
- "Vai tomar no cu" (também "vtnc") no chat: o JoJo responde e faz por **5 s** a
  pose do meme — de costas, curvado, olhando por cima do ombro e abrindo as
  nádegas com as mãos — e depois volta ao normal. Vista de costas própria no rig
  (grupos com `showIf`/`hideIf` no canal `mooning`).

## 0.11.0 — 2026-10-29

### Alterado
- O projeto agora se chama **JoJo Companion**: pasta `jojo-companion/`, executável
  `JoJoCompanion.exe`, workflow `jojo-windows.yml`, identificadores e textos sem o
  nome antigo. O JoJo é personagem próprio do projeto.
- READMEs reduzidos a "descubra 🦈".
- Configurações passam a ficar em `%APPDATA%\JoJo Companion` (as da versão
  anterior não são migradas).

## 0.10.0 — 2026-10-29

### Adicionado
- **PC parado** (5 min por padrão, `ociosidade.minutos`): o JoJo senta no chão e
  cheira uma carreira de pó (animação `snort`, carreira no chão, nuvem de pó). Fica
  sentado ligadão até a volta. Na volta, **5 min** (`ociosidade.efeitoMin`) de
  efeito: pó no focinho, olhos arregalados, tom pálido, suor, mandíbula rangendo,
  tremedeira, variações "ligadão" de parado/andar/falar/olhar, fala muito mais,
  anda 1,7× mais rápido e não senta nem dorme. Sem o humor com drogas: toma
  pré-treino (`chug`), mesmo efeito sem pó. Ociosidade lida só como contador do
  sistema (`powerMonitor.getSystemIdleTime`), sem teclas ou cliques.
- **Objetivo: fazer a Emanuele sorrir** (`objetivo` no perfil): piadas espontâneas
  e exibições de **supino** (deitado no banco, anilha na mão) e **agachamento**
  (barra nos ombros), sozinhas ou pelo chat ("faz supino", "agachamento").
- **Legends**: uma vez por semana, em momento aleatório (10h–22h), "jogar Legends
  é ideia burra".
- Adereços no rig com `showIf` (banco, barra, carreira de pó, coqueteleira, pó no
  focinho). 100 animações.
- Publicação: tag `v*` gera uma Release do GitHub com o `JoJoCompanion.exe`.

### Alterado
- Pesquisa: escolhe, entre os 3 primeiros artigos, o que cita mais palavras da pergunta.

## 0.9.0 — 2026-10-29

### Adicionado
- **85 animações** (eram 33). As mais comuns ganharam variações sorteadas, sem
  repetir a anterior: parado, andando, falando, alegria, julgamento, bronca e
  raiva com 4; interação, sentado, dormindo, correndo, olhar em volta, curioso,
  aceno, aceno de cabeça, acolhimento, carinho e tristeza com 3; as demais com 2.
  Animações paradas/sentadas trocam de variação a cada 2 ciclos.
- **Cor por emoção**: raiva avermelha (bronca do Instagram, julgamento, susto,
  arrastado), tristeza acinzenta (acolhimento, rejeição), medo empalidece (fuga,
  esconderijo), alegria aviva, sono escurece, vergonha rosa. Sobrancelha de raiva.
- Estados novos **raiva** e **tristeza**: xingar o JoJo deixa ele bravo; rejeitar
  ("não gosto de você", "vou te desinstalar") deixa triste; a 3ª entrada no
  Instagram em 20 min vira bronca com raiva.
- **Pesquisa na internet** para perguntas de conhecimento sem resposta programada:
  Wikipédia em português (DuckDuckGo de reserva), resumo de até 3 frases, aberto e
  fechado por falas no jeito do JoJo filtradas pelo perfil, com a fonte. Sem
  internet: aviso e conversa *Bloqueado*. Pedidos contra as diretrizes (drogas,
  dieta extrema) não são pesquisados. Desligável em Configurações.
- **`JoJoCompanion.exe` portátil**: um único executável que abre sem instalar
  nada. "Iniciar com o Windows" aponta para o próprio `.exe`. O CI do Windows abre
  o portátil e confere que ele fica pronto sem erros.

### Alterado
- Selo da conversa: "Respostas programadas + pesquisa na internet · não é IA"
  quando a pesquisa está ligada.
- "como funciona" só abre a ajuda quando é sobre o JoJo ("como você funciona").

## 0.8.0 — 2026-10-29

### Adicionado
- **Sistema de pet**: o JoJo flutua sobre a área de trabalho, arrastável no modo de
  interação, com posição salva entre sessões (já existente, mantido).
- **Balão de status** ao lado do pet com as atividades de cada conversa:
  *Em andamento*, *Precisa de você*, *Pronto* (concluída e ainda não vista) e
  *Bloqueado* (falha do provedor ou erro de sistema, como atalho em uso ou detector
  de tela cheia indisponível). Fora do modo de interação o balão é click-through e
  some por 4 s quando o cursor chega perto.
- **Central do JoJo** (janela do app): lista de conversas com status, conversa,
  comandos e botão *Wake Pet / Tuck Away Pet*. Clicar no pet traz a Central para
  frente; clicar numa atividade abre aquela conversa. Também pela bandeja
  (*Abrir JoJo* e submenu *Atividades*).
- **Comando `/pet`** (e menu "/" no chat do pet e da Central): *Wake Pet* / *Tuck
  Away Pet*; também `/silencio`, `/nova`, `/config`. Botão equivalente nas
  Configurações.
- **Movimento reduzido**: segue o "Efeitos de animação" do Windows
  (`prefers-reduced-motion`) ou a configuração *Reduzir movimento*
  (sistema/ligado/desligado). Pose estática por animação, sem partículas, sem
  piscar, sem passeios e com fuga instantânea do cursor.
- Crise emocional na conversa ("crise", "ansiedade", "emocionalmente mal",
  "não aguento mais"…): manda a Emanuele falar com o **João** agora, porque ele
  sabe cuidar dela, com postura de acolhimento.

### Alterado
- Clique rápido no pet (modo de interação) agora abre a Central; o carinho continua
  pelo botão 🤚 e esfregando o mouse sobre ele.
- A resposta do chat tem um "digitando…" curto (650 ms) para o status *Em andamento*.

### Não aplicável
- Versão web: o projeto é só desktop (Electron/Windows); não há versão web.

## 0.7.0 — 2026-10-29

### Adicionado
- O companion se chama **JoJo** (bandeja, Sobre, configurações, conversa; editável).
- Tratamento por tom: **Emanuele** em falas sérias, **Manu** em brincadeiras.
- Tristeza na conversa ("chorando", "muito triste", "na bad"…): "é melhor falar com
  o **João**, ele sabe cuidar de você", com postura de acolhimento. Menção a se
  machucar/suicídio: falar com o João agora e CVV 188.
- **Expressão corporal coerente**: cada fala e resposta toca uma reação (aceno,
  aceno de cabeça, julgamento, dedo em riste, acolhimento, duplo bíceps, susto).
  Novos estados/animações: `wave`, `nod`, `lecture`, `comfort`; canal `mouthClose`.
- Perfil: `nomeCompanion`, `nomeSerio`, `nomeBrincadeira`, `pessoaApoio`
  (migração automática do antigo `tratamento`).

## 0.6.0 — 2026-10-29

### Adicionado
- **Perfil de personalidade** separado da aparência (`personality.json`), editável
  em Configurações → Personalidade. Padrão: sério, mandão, humor seco e ácido,
  palavrões ocasionais, carinho discreto, tom de treinador.
- **Fiscal do Instagram** (Windows, navegador ou app): bronca curta com animação de
  julgamento a cada entrada, intervalo mínimo de 2 min, sem repetir enquanto aberto.
  Detecção pelo título da janela/nome do executável no processo isolado; só um
  sim/não sai dele.
- **Lembrete diário** para comer com atenção em horário aleatório (10h–21h), sem
  usar peso ou corpo como insulto.
- Falas reescritas no novo tom, com marcações de palavrão e de humor ácido
  (referências a cocaína sem incentivar uso), filtradas pelo perfil.
- Estados e animações novos: **julgamento** (braços cruzados, olhar de lado) e
  **susto teatral**. Conversa: "silêncio" liga o modo silencioso, "consegui" faz o
  duplo bíceps, "me assusta" dá o bote, "treino" responde como treinador.
- Instruções livres do perfil passadas aos provedores de diálogo (`context.persona`).

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
- JoJo mais **adulto e intimidador**, mantendo o estilo recorte de papel: cabeça
  proporcionalmente menor, ombros largos, peitoral e bíceps marcados, braços mais
  longos com garras, olhos menores com pálpebras pesadas, sobrancelhas sempre franzidas.
- **Dentes assustadores**: sorriso sempre entreaberto com duas fileiras de presas
  grandes e espaçadas (superior e inferior) e o fundo escuro da boca aparecendo.
- Animações menos infantis: sem quique no repouso, comemoração contida, rubor só no carinho.
- Rig: `face.restingLid`, `browAlways`, `browFrown`, `restJaw`, `mouthDepth`,
  `lowerTeeth`, `lowerToothSize`, `toothWidth`.

## 0.3.0 — 2026-10-29

### Alterado
- Estética e animações no **estilo South Park** (recorte de papel): JoJo de frente,
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
- Novo visual do JoJo: versão **chibi bípede** baseada na referência do usuário
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
  discreto quando não há espaço ou o cursor persegue o JoJo.
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
- Renderer continuava desenhando com o JoJo oculto.
- Consulta de "iniciar com o Windows" em modo de desenvolvimento.
- Caminhos de teste no Windows (`URL.pathname` → `fileURLToPath`).
