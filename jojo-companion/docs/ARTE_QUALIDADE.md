# Padrão de qualidade artística

Regra permanente do projeto. Vale para toda arte nova ou alterada. A checagem automática está em
`test/unit/moeda-arte.test.js` e roda no `npm test` (falhou = arte fora do padrão, não publica).

## Regras

1. **Arte desenhada, não gerada em tempo real.** Nada de IA generativa no app e nenhuma chamada ao
   modelo de linguagem para gráficos. A arte é vetor (SVG/paths do rig), gerada por código determinístico
   e versionada.
2. **Paleta canônica por elemento.** A JOJOcoin usa só `OURO` (`src/core/moeda-arte.js`): luz `#fff3b0`,
   claro `#ffd84d`, médio `#f2b51e`, profundo `#c98a0b`, reflexo `#fffbe6`, relevo `#9a6206`, borda
   `#6e4304`, contorno `#4a2c02`, em ordem decrescente de luminância. Nenhuma representação da moeda usa
   outra cor de ouro.
3. **Uma geometria-mestre.** Todas as vistas da moeda (frente, giro, lateral, cima, baixo, pilhas,
   composições, a moeda na mão do JoJo e a estátua dourada) saem da mesma geometria do tubarão
   (`TUBARAO`, `PEITORAL`, `PELVICA`, `OLHO`). Não redesenhar à parte.
4. **Simplificação óptica por tamanho.** 64 px ou mais: mestre (serrilha, louros, losango, relevo). 32 a
   48 px: médio. 12 a 24 px: micro (sem serrilha, aro grosso, silhueta do tubarão com a mordida; sem
   louros até 16 px). Nunca reduzir a mestre por escala.
5. **Tamanhos oficiais**: 12, 16, 20, 24, 32, 48, 64, 128, 256 e 512 px, PNG RGBA com fundo transparente,
   mais o SVG. Telas usam `srcset` 1x / 1,5x / 2x para o DPI do Windows.
6. **Legível nos dois fundos.** Conferir em fundo claro e escuro, a 100%, 150% e 200%
   (`docs/evidencias/moeda/matriz-*.png`).
7. **Valores sem pular o layout.** Número com algarismos tabulares e largura reservada
   (`larguraValor`): o saldo reserva "1.000.000" e os preços reservam o maior preço.
8. **Nome oficial**: JOJOcoins. Nenhuma outra grafia em código, texto ou documentação.
9. **Personagem preservado.** Itens não mudam a anatomia do JoJo; só os visuais transformam enquanto
   vestidos (regra do CLAUDE.md). Objetos ficam presos à mão, decorações ao chão.
10. **SVG limpo.** Sem atributo repetido na mesma tag, sem imagem externa e sem script.

## Checagens automáticas

| Checagem | Falha quando |
|---|---|
| Nome e paleta | `NOME_MOEDA` ou o manifesto saem de "JOJOcoins"; a paleta do manifesto difere de `OURO`; a ordem de luz quebra |
| Manifesto | Arquivo listado não existe, tamanho ou hash (sha256) diferente do gerado, ou arquivo fora do manifesto |
| Tamanhos | Falta um tamanho oficial, PNG não é quadrado, não é RGBA de 8 bits, ou o micro não é mais simples que o mestre |
| Giro e vistas | Atlas do giro sem 24 quadros, perspectiva, pilha ou composição ausente |
| SVG | Atributo repetido, `<image>` ou `<script>`, ícone sem item ou fora de 64×64 |
| Cobertura | Item da loja sem arte, ou visual da loja sem espaço medido na janela |
| Layout | Valor de 0 a 1.000.000 muda a largura reservada |
| Grafia | Qualquer grafia diferente de JOJOcoins (outras maiúsculas, com espaço) em `src`, `docs`, `scripts`, `test` ou catálogos |

Regerar a arte da moeda: `node scripts/moeda-assets.mjs` (Chromium do Playwright; reescreve
`assets/moeda/` e o manifesto). Regerar espaço da janela dos itens da loja: `node scripts/anim-room-loja.mjs`.

## Animações oficiais da moeda

| Animação | Onde |
|---|---|
| Giro (24 quadros, 15° cada) | Atlas `giro-{32,64,128}.png`, usado por todas as moedas do overlay |
| Queda com dois quiques | Chuva e festa de JOJOcoins |
| Coleta (sobe girando, brilha e some) | Todo ganho |
| Compra (moedas saem para os lados) | Toda compra |
| Pilha (caem uma a uma e empilham, brilho no topo) | Ganho grande (40 ou mais) e nível novo |
| JoJo com a moeda (gira entre os dedos) | Cena de compra e chuva de JOJOcoins |

Movimento reduzido do Windows: o saldo muda sem moedas voando.

## Auditoria feita (loja, 24/11/2026)

Revisada por renderização toda a arte nova: 30 visuais, 15 objetos, 17 decorações, 42 animações, ícones e
a moeda em todas as vistas. Problemas encontrados e corrigidos: paleta da forma Megalodon com chaves
erradas, estátua dourada deslocada, verso da moeda espelhado no giro, três ícones quebrados por
atributo repetido, brilhos invisíveis em fundo claro, nome do card colorido pela raridade. Não havia
arte antiga da moeda no app (nenhum emoji ou ícone anterior). Os visuais de nível anteriores à loja não
foram reauditados nesta etapa.
