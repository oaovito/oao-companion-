# Contexto do repositório — Jeff Companion

Este arquivo é lido automaticamente pelas sessões do Claude Code. Ele resume o
projeto para que qualquer sessão continue o trabalho sem depender do histórico.

## O que é

Companion de desktop para **Windows 11** inspirado no Jeff, o Tubarão Terrestre
(Marvel). **Projeto de fã, não oficial** — nunca alegar vínculo com a Marvel/Disney.
Todo o código está em `jeff-companion/`.

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

- O companion se chama **JoJo** (inspirado no Jeff; o app/projeto é "Jeff Companion").
- A usuária é a **Emanuele**: chamar de **Emanuele** em falas sérias e de **Manu** em brincadeiras.
- Se ela disser que está chorando ou muito triste: dizer que é melhor falar com o **João**,
  porque ele sabe cuidar dela. Menção a se machucar/suicídio: João agora + CVV 188.
- Personalidade padrão: sério, mandão, humor seco/ácido, palavrões ocasionais; bronca ao
  abrir o Instagram; lembrete diário de comer com atenção (nunca usar peso/corpo como insulto;
  humor com drogas sem incentivar uso). Perfil editável em `personality.json`.
- Toda fala vem com expressão corporal coerente (campo `reaction` nas falas).
- Visual: estilo recorte de papel (South Park), adulto, fisiculturista, com presas.

## Requisitos que não podem regredir

1. Fora do modo de interação o overlay é **click-through real**
   (`setIgnoreMouseEvents(true)`), inclusive durante animações. O app nunca simula cliques.
2. Jeff **desvia do cursor** (margem padrão 100 px lógicos) sem tremer nem fazer pingue-pongue.
3. Overlay transparente, sem moldura, sem foco, fora da barra de tarefas, sempre por cima.
4. Funciona **100% offline**; sem telemetria, captura de tela, microfone ou registro de
   teclado/cliques. Única leitura de janela: título/executável da janela em primeiro plano,
   comparado localmente com "Instagram" no processo isolado (só sai um sim/não; desligável).
   Integrações de IA só opcionais.
5. Sons e "iniciar com o Windows" desligados por padrão.
6. Conversa marcada como **respostas programadas** (não é IA).
7. Arte atual é **provisória** — não declarar arte final sem que exista.

Requisitos completos e critérios de aceitação: `jeff-companion/PRODUCT_SPEC.md`.

## Stack e mapa

Electron 44 + JavaScript ESM (sem framework de UI); `koffi` só para detecção de
tela cheia, isolado em `utilityProcess`.

- `src/core/` — lógica pura testável (desvio, movimento, estados, layout, falas, configurações, diálogo)
- `src/main/` — integração Windows/Electron (overlay, bandeja, atalho, energia, monitores)
- `src/renderer/` — canvas do Jeff, balões, modo de interação, configurações
- `assets/` — rig, animações e falas em JSON (formato em `assets/README.md`)

Detalhes: `jeff-companion/ARCHITECTURE.md`. Estado e pendências: `jeff-companion/HANDOFF.md`.
Histórico: `jeff-companion/CHANGELOG.md` (atualizar a cada mudança).

## Comandos (em `jeff-companion/`)

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
`.github/workflows/jeff-windows.yml` roda em `windows-latest`: testes unitários,
build do instalador, integração com entrada real de mouse/teclado
(`test/e2e/windows.e2e.mjs`), E2E e medição; os instaladores ficam como artefato
`JeffCompanion-windows-x64`. Use o resultado desse CI ao relatar o que foi
verificado no Windows. Multi-monitor com DPI misto, suspensão real e desconexão
física de monitor exigem teste manual em uma máquina Windows.

## Convenções

- Comentários e textos de interface em pt-BR; código no estilo existente (ESM, 2 espaços, aspas simples).
- Toda mudança de comportamento vem com teste em `test/unit` e, se tocar Electron, em `test/e2e`.
- Commits em branch `claude/...`; não criar PR sem pedido do usuário.
