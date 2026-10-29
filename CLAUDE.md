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
  abrir o Instagram; lembrete diário de comer com atenção (nunca usar peso/corpo como insulto;
  humor com drogas sem incentivar uso). Perfil editável em `personality.json`.
- Toda fala vem com expressão corporal coerente (campo `reaction` nas falas).
- Visual: estilo recorte de papel (South Park), adulto, fisiculturista, com presas.
- Animações: 85 (variações sorteadas via `variantOf`; as comuns têm 3–4). Cor por emoção
  (canais `mood*` + `rig.moods`): raiva avermelha, tristeza acinzenta, medo empalidece etc.
- Pergunta sem resposta programada: pesquisa (Wikipédia → DuckDuckGo) e responde no jeito do
  JoJo (abertura/fecho das falas filtradas pelo perfil) citando a fonte.
- Objetivo do JoJo: fazer a Emanuele sorrir (piadas, supino, agachamento de vez em quando).
- PC parado 5 min: senta no chão e cheira pó (pré-treino sem `humorDrogas`); ligadão por
  5 min após a volta (modo `wired`). Legends: "ideia burra" 1×/semana em momento aleatório.
- "Vai tomar no cu" no chat: vira de costas, susto com o prolapso, rebola ~5 s e desvira
  (estado `moon`, 7,4 s; canais `mooning`, `spread`, `gagSize`, `drip`). De costas ele continua
  fisiculturista (costas em V, trapézio, dorsais, tríceps) em qualquer meme.
- Publicação: tag `v*` → Release com `JoJoCompanion.exe` (workflow do Windows).
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
   Única saída para a internet: **perguntas de conhecimento sem resposta programada** vão à
   Wikipédia/DuckDuckGo (só o texto da pergunta; desligável em Configurações). Conversa comum
   nunca acessa a rede. Integrações de IA só opcionais.
5. Sons e "iniciar com o Windows" desligados por padrão.
6. Conversa marcada como **respostas programadas** (+ pesquisa na internet quando ativa; não é IA).
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
