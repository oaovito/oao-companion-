# Contexto do repositório — JoJo Companion

Este arquivo é lido automaticamente pelas sessões do Claude Code. Ele resume o
projeto para que qualquer sessão continue o trabalho sem depender do histórico.

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
- Antitédio: rotinas, mini-jogos, progressão/coleção (Central), foco junto (`/foco`), estímulos (💪 ✨ /calma /ritmo /bolhas),
  adaptação; tudo desligável e interrompível; doc `jojo-companion/docs/ANTITEDIO.md`.
- Agenda Google ou iCloud (link de calendário público, `webcal://` → https): JoJo sugere e guia ("conectar agenda"); avisos com animação do tipo de compromisso; "o que tenho hoje?".
- Spotify: reage ao que toca (título da janela); LoL: mau humor e some enquanto aberto.
- Docinho ("e se eu comer um docinho?" e variações): nojo esverdeado + "Quer se tornar uma aberração?".
- Entende pedidos de qualquer forma (regra geral): frases livres viram comandos (`dialogue/intencoes.js`, offline)
  e a conversa online devolve `comando` de uma lista fechada; nunca responder "não está na lista" a um pedido claro.
- Inglês quando ela escreve em inglês (segurança também); português é a língua principal.
- Lembretes: 4 refeições por dia (café, almoço, lanche, jantar) + treino diário.
- Configurações: seções Personalidade e Sistema **ocultas**; perfil volta ao padrão a cada versão nova do perfil.
- Vigília: das 6h às 21h o estado de sono é bloqueado na máquina de estados (`canSleep`/`SLEEP_ANIMS`); às 6h acorda.
- Dormir: antes das 21h qualquer menção a dormir/sono/cochilo/cama → JoJo furioso e contra (estado `angry`);
  das 21h às 6h é permitido e ele reafirma (ação `boaNoite`); falas ambientes de dormir com `apos: 21`.
- Janela cresce por animação (`assets/animations/jojo.room.json`; regenerar com `scripts/anim-room.mjs` ao mudar desenho/animação).
- Pergunta sem resposta programada: pesquisa (Wikipédia → DuckDuckGo) e responde no jeito do
  JoJo (abertura/fecho das falas filtradas pelo perfil) citando a fonte.
- Objetivo do JoJo: fazer a Emanuele sorrir (piadas, supino, agachamento de vez em quando).
- PC parado 5 min: senta no chão e cheira pó (pré-treino sem `humorDrogas`); ligadão por
  5 min após a volta (modo `wired`). Legends: "ideia burra" 1×/semana em momento aleatório.
- "Vai tomar no cu" no chat: vira de costas, susto com o prolapso, rebola ~5 s e desvira
  (estado `moon`, 7,4 s; canais `mooning`, `spread`, `gagSize`, `drip`). De costas ele continua
  fisiculturista (costas em V, trapézio, dorsais, tríceps) em qualquer meme. Sozinho no repouso:
  1 chance em 1 bilhão a cada escolha autônoma (`MOON_IDLE_CHANCE` em `behavior.js`).
- "Eu sou bonita?" (e variações): olhos de coração, cai de costas com 😵 e responde "É." no
  último suspiro (estado `smitten`, 6 s).
- Idle nunca parado: toda animação de repouso respira, balança braços, inclina a cabeça e abana o rabo.
- "Eu deveria jogar lol?": caga no chão, pega e oferece — "Passa na cara de uma vez." (estado `poop`, 7 s).
- Datas festivas (38): feriados nacionais do Brasil + datas religiosas e culturais do mundo;
  fantasia do dia + cumprimento (solenes sem fantasia/piada; religiosas sem zombaria);
  `holidays.js` (ICU + fases da Lua), `rig.costumes`.
- Guarda-roupa (opcional): painel na Central e `/vestir`; peças por parte (`src/core/wardrobe.js`), salvas em
  `guardaRoupa`; vale mais que a fantasia do dia; bermuda por paleta `costume_bermuda*`.
- Fantasias ousadas por padrão (`festas.estilo`); "se veste direito" → dedo do meio + comportada.
- Comida de tubarão sorteada (peixe, foca, lula, tartaruga, pinguim, às vezes gente), gore e arroto.
- "AVC": força de frente até ficar vermelho, segura o peito, morto 1 min, "Essa foi por pouco."; AVC real → SAMU 192.
- Dedo do meio: mão de verdade só nessa animação (punho + dedo para cima).
- **Conversa com IA** (API gratuita: Pollinations sem chave; Groq/Gemini/OpenRouter com chave grátis).
  **Regra irredutível:** a IA responde sempre no jeito do JoJo (prompt com perfil + falas reais; resposta
  com cara de assistente é descartada e cai nas programadas). Segurança e gatilhos com animação ficam programados.
- O usuário usa majoritariamente **Windows**: toda funcionalidade nova precisa passar no CI do Windows.
- Notas da Release: geradas de `CHANGELOG.md` (seção da versão: Novidades/Melhorias/Correções/Remoções/Como testar)
  por `scripts/release-notes.mjs`; só o que mudou; nunca editar releases antigas; sem seção → publicação bloqueada.
- Atualização 100% automática: quem já tem o app nunca baixa nada à mão.
- Publicação: commit com `[publicar]` (ou tag `v*`) → Release com `JoJoCompanion.exe`, também em
  `oaovito/jojo-companion-releases` (público; segredo `RELEASES_TOKEN`), de onde vêm as atualizações.
- Pet: balão de status das conversas (Em andamento / Precisa de você / Pronto / Bloqueado);
  clique no pet abre a Central do JoJo, clique numa atividade abre a conversa; `/pet`
  (Wake Pet / Tuck Away Pet); movimento reduzido segue o Windows. Sem versão web.
  Crise emocional na conversa: mandar falar com o João.

## Requisitos que não podem regredir

1. Fora do modo de interação o overlay é **click-through real**
   (`setIgnoreMouseEvents(true)`), inclusive durante animações. O app nunca simula cliques.
2. JoJo **desvia do cursor** (margem padrão 100 px lógicos) sem tremer nem fazer pingue-pongue.
3. Overlay transparente, sem moldura, sem foco, fora da barra de tarefas, sempre por cima.
4. Funciona **offline**; sem telemetria, captura de tela, microfone ou registro de
   teclado/cliques. Única leitura de janela: título/executável da janela em primeiro plano,
   comparado localmente com "Instagram" no processo isolado (só sai um sim/não; desligável).
   Também local e desligável: título da janela do **Spotify** ("Artista - Música", para reagir à música) e
   detecção do **League of Legends** em primeiro plano (título/executável → sim/não; JoJo fica de mau humor e some).
   Saídas para a internet: **agenda Google ou iCloud** (só leitura, endereço secreto iCal do Google ou link público do iCloud colado por ela; busca a cada 10 min), **conversa online** (texto da conversa ao provedor de IA), perguntas de
   conhecimento (Wikipédia/DuckDuckGo, quando a conversa online está desligada ou falha) e a
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
npm run test:e2e          # Electron real (Linux usa Xvfb automaticamente)
node scripts/measure.mjs  # CPU/memória
npm run build:win         # instalador NSIS + ZIP (Linux precisa de wine + wine32)
```

## Verificação no Windows

Este ambiente de desenvolvimento é Linux. O workflow
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
