# Assets do Jeff Companion

**Procedência:** todos os assets deste diretório foram criados para este projeto
(fan-made, não oficial) — desenhados como vetores à mão em código/JSON e falas
escritas originalmente. Nenhuma arte oficial da Marvel foi copiada. Ícones são
renderizados a partir do próprio rig (`scripts/make-icons.mjs`).

**Direção de arte (v0.3):** estética de **recorte de papel no estilo South Park**
(apenas o estilo; nenhum personagem da série é copiado): Jeff de frente, cabeça
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

## `character/jeff.rig.json` (formato `jeff-rig/1`)

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
    `pivot` [x,y], `rot` (canal de rotação em graus), `lift` (canal de elevação px), `alpha`.
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

## `animations/jeff.animations.json` (formato `jeff-anim/1`)

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
- Nomes usados pela máquina de estados: ver `STATES` em `src/core/behavior.js`
  (o teste `assets: toda animação usada…` garante que existam).

Para trocar por sprites no futuro: implemente um renderer alternativo com a mesma
interface de `RigRenderer.draw(ctx, pose, opts)` e selecione-o em `overlay.js`.

## `dialogue/pt-BR.json` (formato `jeff-phrases/1`)

`categories.<nome>` com `kind` (`speech` | `thought` | `sleep`) e `lines`.
`{atalho}` é substituído pelo atalho configurado.

## `icons/`

`app.ico`/`app.png` (aplicativo/instalador), `tray.ico`/`tray.png` (bandeja).
Regenerar: `xvfb-run -a npx electron scripts/make-icons.mjs` (Linux) ou
`npx electron scripts/make-icons.mjs` (Windows).
