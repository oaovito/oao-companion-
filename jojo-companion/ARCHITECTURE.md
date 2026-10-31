# ARCHITECTURE — JoJo Companion

## Stack e justificativa

**Electron 44 + JavaScript (ESM), sem framework de UI.**

- `BrowserWindow` transparente/sem moldura e `setIgnoreMouseEvents(true)` dão
  click-through real no Windows (WS_EX_TRANSPARENT) — requisito central.
  `forward: true` permite detectar hover nas regiões interativas sem capturar o resto.
- Bandeja, atalho global, instância única, iniciar com o sistema, eventos de
  energia e de monitores, DPI por monitor: tudo nativo da API.
- Gera portátil, instalador NSIS e ZIP x64 nativamente no Windows; `scripts/build-win.mjs`.
- Aplicativo, ferramentas gráficas, medições e E2E são exclusivos para Windows.
- Custo: memória maior que Tauri/nativo. Mitigado com polling adaptativo,
  FPS limitado por estado e parada total quando oculto.
- `koffi` (FFI com binários prontos) apenas para a detecção de tela cheia, rodando
  em `utilityProcess` isolado.

Alternativas descartadas: Tauri (transparência do WebView2 menos previsível),
WPF/.NET (sem SDK no ambiente inicial), Win32 nativo (custo de UI muito alto).

## Organização

```
jojo-companion/
  src/core/            lógica pura, sem Electron (testável em Node)
    companion.js       orquestrador: tick, desvio, movimento, falas, interação, layout
    avoidance.js       proximidade, histerese, planejamento de fuga, modo discreto
    motion.js          movimento em Bézier com easing
    behavior.js        máquina de estados + prioridades + escolha autônoma
    layout.js          posição de balão/barra/painel e limites da janela
    displays.js        monitores: recuperação, permitidos, tela cheia ↔ display
    geometry.js        utilitários geométricos
    rig-metrics.js     dimensões do personagem (do asset)
    phrases.js         frases sem repetição, tempo de leitura
    settings-schema.js padrões, validação, migração (version)
    settings-store.js  JSON atômico + backup de arquivo inválido (usado também pelo perfil)
    conversations.js   conversas em memória, status das atividades, comandos "/"
    personality.js     perfil de personalidade, filtro/peso de frases, fiscal do Instagram, lembrete diário
    dialogue/          interface DialogueProvider, provedor programado, engine com fallback,
                       web-search.js (pesquisa Wikipédia/DuckDuckGo com fetch injetado)
  src/main/            integração com Windows/Electron
    main.js            bootstrap, IPC validado, bandeja, atalho, energia, monitores, autostart
    overlay-window.js  janela overlay = adaptador "overlay" do Companion
    settings-window.js janela de configurações
    app-window.js      Central do JoJo (conversas, atividades, comandos)
    tray.js            menu da bandeja
    fullscreen-monitor.js + fullscreen-worker.cjs   detecção de tela cheia isolada
    logger.js          log local com rotação
  src/preload/         pontes contextBridge mínimas (sandbox)
  src/renderer/
    overlay/           canvas do JoJo, balões (DOM), barra, conversa, hover/arraste
    settings/          formulário de configurações
    app/               Central do JoJo
    shared/            animator.js, rig-renderer.js, effects.js (puros, usados em scripts)
  assets/              personagem, animações, falas, ícones (ver assets/README.md)
  test/unit/           node:test (lógica + simulação completa com relógio falso)
  test/e2e/            Playwright + Electron real; windows.e2e.mjs usa input real do Windows
  scripts/             build, ícones, folha de animações, medição
```

## Fluxo

1. `main.js` cria `OverlayWindow`, `SettingsStore`, `DialogueEngine` e o `Companion`
   com adaptadores `platform` (cursor e monitores via `screen`), `overlay` e `clock`.
2. `Companion.tick()` (timer adaptativo): amostra cursor → movimento → desvio →
   máquina de estados → falas → interação → layout. O próximo tick é calculado pelo
   tempo que um cursor a 4000 px/s levaria para alcançar a margem (16–140 ms),
   16 ms em movimento, e nada quando oculto/suspenso.
3. Layout: retângulos do JoJo (caixa e área visível), balão/barra/painel via
   `placeAround`; a janela é a união deles (`composeWindow`). Só mudanças vão ao
   renderer (`jojo:state`); posição muda com `setPosition`.
4. Renderer: `Animator` (quadros-chave + blend + piscar), `RigRenderer` (Path2D,
   contorno unificado por grupo), `Effects`; virar = escala horizontal contínua.
   FPS: limitado ao `style.stepFps` da animação (12, estilo recorte de papel); 8 pausado, 0 oculto.
   A janela continua sendo movida pelo processo principal a até 60 Hz (desvio suave).

## Click-through e modo de interação

- Normal: `setIgnoreMouseEvents(true)` + `setFocusable(false)`. O watchdog no tick
  reaplica se algo mudar o modo. Pedidos de captura vindos do renderer fora do
  modo de interação são recusados.
- Interação: `setFocusable(true)`, `focus()`, `setIgnoreMouseEvents(true, {forward:true})`.
  O renderer recebe `mousemove` encaminhado e pede captura só sobre JoJo/barra/painel.
  O encaminhamento é o comportamento do Windows; não existe captura alternativa para outro sistema.
- Saída (Esc, ✕, blur, timeout, erro, ocultar, suspender): volta ao modo normal antes de qualquer outra coisa.
- `uncaughtException` também força o modo normal.

## Desvio (avoidance.js)

Estados `clear → alert → fleeing → settling`, e `hidden` (discreto).
Candidatos: 16 direções × 4 distâncias + grade 7×5 por monitor permitido
(áreas encolhidas para a caixa inteira caber). Custo = exposição do caminho ao
cursor ×6 + distância ×0,12 − afastamento + troca de monitor + inversão de direção
recente + destino à frente do movimento do cursor. Caminho: melhor entre reta e
curvas laterais.

## Pesquisa na internet

`MotorPesquisa` escolhe fontes públicas para perguntas de conhecimento, sem enviar
histórico, perfil ou arquivos. Resultados entram como dados não confiáveis no modelo
local; perguntas pessoais e provocações ao JoJo não disparam pesquisa genérica.
`net.fetch` fica no processo principal; renderers mantêm `connect-src 'none'`.
O modelo explica os fatos e as fontes são citadas. Se a geração falhar, o trecho bruto
é identificado como trecho da fonte. A geração com pesquisa tem limite de 25 s e é
cancelada de fato. Conversa local preparada independe da internet.

## Conversa local e distribuição

`src/core/dialogue/local-model.js` define modelo/alias, contexto de 2.048 tokens e
keep-alive de 5 min. `cerebro-local.js` instala o Ollama Windows com SHA-256, verifica
espaço, baixa o modelo e carrega os pesos antes de anunciar pronto. Reutiliza Ollama
local compatível ou serve somente em 127.0.0.1:11439. Encerra o processo gerenciado
após 10 min sem uso. Não troca silenciosamente para nuvem ou outro modelo.

`ConversationManager` tem uma conversa visível; atividades preservam estado interno.
`Companion` serializa mensagens diferentes e deduplica reenvios pendentes. Segurança
interrompe geração antiga; o engine preserva fatos/limites e seleciona expressões sem
executar ações que não foram pedidas. Texto livre não exige JSON nem narração corporal.

Código e CI vivem somente em `oaovito/oao-companion-` (privado). Nova tag oficial,
após testes, build, auditoria visual e conversa real no Windows, pode publicar os três
binários em `oaovito/jojo-companion-releases` (público). API Releases e assets com SHA-256
são os metadados do atualizador próprio. Push comum não publica; versões históricas,
seus arquivos e tags são imutáveis. `scripts/check-conversation-windows.ps1` é compartilhado
pela avaliação de candidatos e pelo gate obrigatório da publicação.

## Animações: variações e emoção

`Animator.play(nome)` sorteia uma variação (`variantOf`) sem repetir a anterior;
`current.name` continua o nome lógico usado pelos estados. Loops com `rotate`
trocam de variação a cada N ciclos. Canais `mood*` (0..1) tingem a paleta via
`rig.moods` no `RigRenderer` (cache por combinação).

## Assets

`assets/character/jojo.rig.json`, `assets/animations/jojo.animations.json`,
`assets/dialogue/pt-BR.json`. Carregados no main e entregues ao renderer por IPC
(sem fetch de file://). Formatos em `assets/README.md`.

## Segurança

`contextIsolation`, `sandbox`, sem `nodeIntegration`, CSP restritiva, navegação e
`window.open` bloqueados, IPC aceito só do webContents esperado, ações validadas
por lista branca, texto da conversa limitado a 500 caracteres.

## Testes

- `test/unit/*.test.js`: geometria, desvio (4 lados, cantos, perseguição, tremor,
  balão), simulação completa com `FakeClock` (clique durante fuga, interação,
  monitores, suspensão, tela cheia, 30 min de comportamento, falas), estados,
  configurações, diálogo, frases, layout, consistência dos assets.
- `test/e2e/app.e2e.mjs`: Electron real no Windows.
- `test/e2e/presenca.windows.mjs`: processos reais do vigia no Windows.
- `test/e2e/windows.e2e.mjs`: Windows real com SetCursorPos/mouse_event/keybd_event.
