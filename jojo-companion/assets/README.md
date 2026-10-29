# Assets do JoJo Companion

**Procedência:** todos os assets deste diretório foram criados para este projeto —
o JoJo é um personagem próprio, desenhado como vetores à mão em código/JSON, com
falas escritas originalmente. Ícones são
renderizados a partir do próprio rig (`scripts/make-icons.mjs`).

**Direção de arte (v0.3):** estética de **recorte de papel no estilo South Park**
(apenas o estilo; nenhum personagem da série é copiado): JoJo de frente, cabeça
grande e redonda, cores chapadas, contorno fino, olhos ovais brancos encostados
com pupilas de ponto, pálpebras da cor do corpo, sobrancelhas em traço reto.
Elementos da referência enviada pelo usuário: tubarão **bípede** azul-ardósia,
focinho/barriga/rabo com recortes **creme serrilhados**, sorriso com muitos
dentinhos, barbatana no alto da cabeça, rabo bifurcado e **bermuda preta com
faixas cinza**. A imagem de referência não foi copiada nem incluída.

**Animação estilo South Park:** `style.stepFps` = 12 quadros por segundo,
interpolação linear, mudanças secas (`step`), boca que abre e fecha em degraus,
saltinhos ao andar, virada de lado instantânea (`style.turnMs` = 0).

**Estado:** a arte é **PROVISÓRIA** (`"provisional": true` no rig). Substitua
mantendo os formatos abaixo; o código não precisa mudar.

## `character/jojo.rig.json` (formato `jojo-rig/1`)

- `metrics.box` — caixa do personagem (180×170) olhando para a direita.
- `metrics.visual` — área visível protegida pelo desvio do cursor. Mantenha-a
  centralizada na horizontal (`2*x + width = box.width`) para o espelhamento.
- `metrics.head` — ponto para onde apontam as caudas dos balões.
- `metrics.ground` — linha do chão (pivô de squash e sombra).
- `metrics.rootPivot` — pivô da rotação do corpo inteiro (`rootRot`); `metrics.shadowRx` — raio da sombra.
- `metrics.mouth` — ponto da boca (efeito de comida).
- `faceAfter` — id do grupo depois do qual o rosto é desenhado.

- `palette` — cores nomeadas usadas pelas partes.
- `groups[]` — desenhados em ordem; `outline: true` desenha o contorno de todas as
  partes do grupo antes do preenchimento (contorno único, sem costuras).
  - `parts[]`: `id`, `path` (SVG `d`), `fill` (chave da paleta), opcionais
    `pivot` [x,y], `rot` (canal de rotação em graus), `rotSign`, `lift` (canal de elevação px),
    `alpha`, `parent` (id de outra peça cuja transformação é aplicada antes — ex.: antebraço
    segue o braço; cotovelo com `elbowL`/`elbowR`, positivo = flexionar para fora/cima,
    negativo = dobrar para dentro).
- `face` — `eyes[]` (x, y, rx, ry, scale), `brows[]`, boca (Bézier x1,y1 → cx,cy → x2,y2),
  `teeth` (posições 0–1 ao longo do sorriso), `toothSize`, guelras, bochecha,
  `nostrils[]`; giram com `headRot` em torno de `face.pivot`. (Rigs antigos com
  `eye`/`brow`/`nostril` únicos continuam aceitos.)

**Mapeamento dos canais (rig de frente):** `legFL`/`legFR` = braço esquerdo/direito,
`legBL`/`legBR` = perna esquerda/direita (`legLiftF/B` idem). Partes com `rotSign`
espelham a rotação: valor positivo = membro para fora/levantar, negativo = para dentro.
`face.style: "sp"` usa olhos/sobrancelhas no estilo recorte (`eyes[].pupil`, `pupilOffset`);
`face.blush` pode ser lista.
Expressão adulta (v0.4): `restingLid` (pálpebra pesada 0–1), `browAlways` +
`browFrown` (sobrancelhas sempre visíveis e franzidas, px), `restJaw` (boca sempre
entreaberta), `mouthDepth` (px de abertura com jaw=1), `teeth`/`toothSize`
(presas de cima), `lowerTeeth`/`lowerToothSize` (presas de baixo), `toothWidth`
(largura relativa ao espaçamento; menor = mais espaço escuro entre os dentes).

## `animations/jojo.animations.json` (formato `jojo-anim/1`)

- `channels` — canais de pose e valores padrão (rootX/Y, rootRot, squashX/Y, scale,
  alpha, headRot, tailRot, finRot, legFL/FR/BL/BR, legLiftF/B, jaw, eyeOpen,
  eyeScale, pupilX/Y, brow, browShow, blush, happyEyes, tongue).
- `style` — `stepFps` (quadros por segundo escalonados; 0 = contínuo), `defaultBlendIn` (ms),
  `defaultEase` (`linear`/`inOut`), `turnMs` (0 = virada instantânea).
- `poses` — poses base reutilizáveis (`sit`, `lie`, `crouch`).
- `animations.<nome>`: `duration` (ms), `loop`, `base` (pose), `blendIn` (ms de
  transição a partir da pose anterior; padrão 180), `tracks` (`canal: [[t, valor, easing?], …]`,
  t de 0 a 1, easing `inOut` padrão | `in` | `out` | `linear` | `step`),
  flags: `blink`, `z` (Zzz), `dust` (`true` contínuo ou `"burst"`), `sparkle`,
  `hearts`, `mark` (`"!"` ou `"?"`).
- Variações: `variantOf: "<base>"` coloca a animação no sorteio da base (mesma
  `duration`/`loop` da base — o teste garante). `rotate: N` na base troca de
  variação a cada N ciclos (loops).
- Peças do rig podem ter `showIf`/`hideIf` (grupo ou peça), `dx`/`dy` (deslocamento por
  canal, com `dxSign`) e `scaleBy` + `scalePivot` (escala por canal).
- Emoção: canais `moodAngry`, `moodSad`, `moodScared`, `moodJoy`, `moodTired`,
  `moodShy` (0..1) e `browAngry` (sobrancelha de raiva). A cor de cada emoção fica
  em `rig.moods` (`{ max, to: { body, bodyShade, muscle, cream } }`).
- Nomes usados pela máquina de estados: ver `STATES` em `src/core/behavior.js`
  (o teste `assets: toda animação usada…` garante que existam).

Para trocar por sprites no futuro: implemente um renderer alternativo com a mesma
interface de `RigRenderer.draw(ctx, pose, opts)` e selecione-o em `overlay.js`.

## `dialogue/pt-BR.json` (formato `jojo-phrases/3`)

v3: cada categoria tem `tone` (`serio` → {nome} = nome sério, ex. Emanuele;
`brincadeira` → apelido, ex. Manu) e `reaction` (estado de corpo tocado junto da
fala: `wave`, `nod`, `judge`, `lecture`, `comfort`, `happy`, `scare`…); cada frase
pode sobrescrever `tone`/`reaction`. Variáveis novas: `{companion}`, `{apoio}`.


`categories.<nome>` com `kind` (`speech` | `thought` | `sleep`) e `lines`. Cada
frase é texto ou `{ "t": "...", "tags": [...] }`. Tags: `palavrao` (removida com
palavrões = nenhum, mais rara em "ocasional", mais comum em "frequente") e
`drogas` (humor ácido; removida se desligado). Variáveis: `{atalho}`,
`{vocativo}` (", Nome" ou vazio) e `{nome}` (nome ou "você"). Categorias
novas: `instagram`, `foodReminder`, `achievement`, `quietAck`, `scare`,
`sadSupport`, `crisisSupport`.

## `icons/`

`app.ico`/`app.png` (aplicativo/instalador), `tray.ico`/`tray.png` (bandeja).
Regenerar: `xvfb-run -a npx electron scripts/make-icons.mjs` (Linux) ou
`npx electron scripts/make-icons.mjs` (Windows).
