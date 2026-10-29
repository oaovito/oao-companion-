# ARCHITECTURE — Jeff Companion

## Stack e justificativa

**Electron 44 + JavaScript (ESM), sem framework de UI.**

- `BrowserWindow` transparente/sem moldura e `setIgnoreMouseEvents(true)` dão
  click-through real no Windows (WS_EX_TRANSPARENT) — requisito central.
  `forward: true` permite detectar hover nas regiões interativas sem capturar o resto.
- Bandeja, atalho global, instância única, iniciar com o sistema, eventos de
  energia e de monitores, DPI por monitor: tudo nativo da API.
- Gera instalador NSIS e ZIP a partir do Windows ou do Linux (com Wine).
- Custo: memória maior que Tauri/nativo. Mitigado com polling adaptativo,
  FPS limitado por estado e parada total quando oculto.
- `koffi` (FFI com binários prontos) apenas para a detecção de tela cheia, rodando
  em `utilityProcess` isolado.

Alternativas descartadas: Tauri (cross-build para Windows a partir do Linux
experimental, transparência do WebView2 menos previsível), WPF/.NET (sem SDK no
ambiente e impossível validar aqui), Win32 nativo (custo de UI muito alto).

## Organização

```
jeff-companion/
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
    personality.js     perfil de personalidade, filtro/peso de frases, fiscal do Instagram, lembrete diário
    dialogue/          interface DialogueProvider, provedor programado, engine com fallback
  src/main/            integração com Windows/Electron
    main.js            bootstrap, IPC validado, bandeja, atalho, energia, monitores, autostart
    overlay-window.js  janela overlay = adaptador "overlay" do Companion
    settings-window.js janela de configurações
    tray.js            menu da bandeja
    fullscreen-monitor.js + fullscreen-worker.cjs   detecção de tela cheia isolada
    logger.js          log local com rotação
  src/preload/         pontes contextBridge mínimas (sandbox)
  src/renderer/
    overlay/           canvas do Jeff, balões (DOM), barra, conversa, hover/arraste
    settings/          formulário de configurações
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
3. Layout: retângulos do Jeff (caixa e área visível), balão/barra/painel via
   `placeAround`; a janela é a união deles (`composeWindow`). Só mudanças vão ao
   renderer (`jeff:state`); posição muda com `setPosition`.
4. Renderer: `Animator` (quadros-chave + blend + piscar), `RigRenderer` (Path2D,
   contorno unificado por grupo), `Effects`; virar = escala horizontal contínua.
   FPS: limitado ao `style.stepFps` da animação (12, estilo recorte de papel); 8 pausado, 0 oculto.
   A janela continua sendo movida pelo processo principal a até 60 Hz (desvio suave).

## Click-through e modo de interação

- Normal: `setIgnoreMouseEvents(true)` + `setFocusable(false)`. O watchdog no tick
  reaplica se algo mudar o modo. Pedidos de captura vindos do renderer fora do
  modo de interação são recusados.
- Interação: `setFocusable(true)`, `focus()`, `setIgnoreMouseEvents(true, {forward:true})`.
  O renderer recebe `mousemove` encaminhado e pede captura só sobre Jeff/barra/painel.
  No Linux (sem forward) a janela inteira captura — só afeta desenvolvimento.
- Saída (Esc, ✕, blur, timeout, erro, ocultar, suspender): volta ao modo normal antes de qualquer outra coisa.
- `uncaughtException` também força o modo normal.

## Desvio (avoidance.js)

Estados `clear → alert → fleeing → settling`, e `hidden` (discreto).
Candidatos: 16 direções × 4 distâncias + grade 7×5 por monitor permitido
(áreas encolhidas para a caixa inteira caber). Custo = exposição do caminho ao
cursor ×6 + distância ×0,12 − afastamento + troca de monitor + inversão de direção
recente + destino à frente do movimento do cursor. Caminho: melhor entre reta e
curvas laterais.

## Assets

`assets/character/jeff.rig.json`, `assets/animations/jeff.animations.json`,
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
- `test/e2e/app.e2e.mjs`: Electron real (Xvfb no Linux).
- `test/e2e/windows.e2e.mjs`: Windows real com SetCursorPos/mouse_event/keybd_event.
