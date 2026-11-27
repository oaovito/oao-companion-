# Originalidade das animações, pé preso na perna e desbloqueios na tela (0.48.3)

Pedido do João (27/11/2026): consertar o pé que bugava, acabar com animações que parecem iguais, usar
palavras na tela (sem copiar as referências) e mostrar todo desbloqueio com animação e fala.

## Pé e calças presos na perna
- `src/core/pernas.js` (`prenderNasPernas`, chamado no construtor do `RigRenderer`): toda peça de roupa/visual
  com subcaminhos na zona dos pés vira cópias `<id>__pL`/`<id>__pR` filhas de `legL`/`legR`; calças viram três
  cópias recortadas (duas pernas e o quadril). Idempotente. Geometria de caminho em `src/core/geometria-path.js`.
- Sapatos dos visuais (`PES` em `memes-br.js`) cobrem o pé inteiro do rig.
- Teste: `test/unit/pernas.test.js` (inclui a auditoria das 1.340 animações).

## Animações que não se repetem
- Métrica em `src/core/repeticao.js`: por canal do corpo, a média do quarto de tempo mais diferente; duas
  animações são diferentes quando algum canal passa de `LIMITE_REPETICAO` (0,25).
- `src/core/originalidade.js`: 39 batidas (`BATIDAS`), 8 climas, coreografia única por animação
  (`escolherCoreografia`), aplicada por cima das faixas (`aplicarCoreografia`) e palavras na tela (`palavrasPara`:
  lousa, grito, legenda, placar, gráfico, seta, pensamento; nunca "HÃ?").
- `node scripts/originalidade.mjs` refaz a auditoria e grava `assets/catalog/originalidade.json`
  (`repetidas` do catálogo e `sal` dos shows). Rodar de novo ao criar ou mudar animações.
- `src/core/conjunto-animacoes.js` (`montarAnimacoes`) monta catálogo + memes + anime + originalidade (usado no
  `main.js` e nas ferramentas). Sobram só as variantes feitas à mão de propósito (walk_*, sleep_*…).
- Desenho das palavras: `src/renderer/shared/palavras-desenho.js`; espaço da janela somado em `main.js`
  (`comEspacoDasPalavras`).

## Desbloqueios na tela
- `src/core/companion-desbloqueio.js`: `celebrarDesbloqueio({ nome, fala, anim, soCarimbo })` toca a animação
  daquilo (ou `cat_desbloqueio`, 5,2 s), o overlay desenha o carimbo DESBLOQUEADO com o nome acima da cabeça e o
  JoJo fala. Sem condição de mostrar (Trabalho, foco, jogo, tela cheia, escondido) guarda numa fila de 12.
- Ligado em nível/título/acessório/minijogo/conquista (`_announceProgress`), visuais (`_avisarVisuais`), relógio
  (`companion-timers.js`), loja, conquistas de anime e RPG (`rpg-service.js`).
- Teste: `test/unit/desbloqueio.test.js`, `test/unit/originalidade.test.js`.
