# Modo foco: timer, ciclos e animações

## Como usar

- `/foco 25` ou `/foco treino`: um bloco único, como sempre.
- `/foco pomodoro`: 4 ciclos de 25 min com 5 min de pausa.
- `/foco 30 x3 pausa 10` ou `/foco 30 pausa 10 3 ciclos`: ciclos e pausa escolhidos (2 a 8 ciclos, pausa de 1 a 30 min).
- `/foco parar`: encerra o bloco ou cancela a pausa do plano.

Tudo é visual: balão, animação e o estado na Central. Nenhum som.

## Animações

Fonte: `assets/catalog/foco-animations.json` (mesmo formato do catálogo geral,
receitas em `src/core/catalog/recipes.js`, adereços no rig). Cada bloco começa
pela animação de sempre (`estudarJunto` ou `treinarJunto`). A cada `trocaMin`
minutos (4) o JoJo troca por outra do conjunto do bloco, nunca a mesma em
sequência: foco de estudo usa Estudando + Ritmo e respiração; foco de treino usa
Treinando + Ritmo e respiração. A fala curta de cada uma vem de
`assets/dialogue/pt-BR.json` (categorias `foco_<id>`).

| Grupo | Animação | Id | Ciclo | Movimento reduzido |
|---|---|---|---|---|
| Estudando | Lendo e virando a página | `focoLerPagina` | 7,0 s | quadro estático (25 %) |
| Estudando | Escrevendo no caderno | `focoEscrever` | 5,0 s | quadro estático (25 %) |
| Estudando | Digitando no notebook | `focoDigitar` | 4,0 s | quadro estático (25 %) |
| Estudando | Marcando o texto com marca-texto | `focoMarcaTexto` | 6,0 s | quadro estático (50 %) |
| Estudando | Ajustando os óculos e voltando a ler | `focoOculos` | 7,0 s | quadro estático (30 %) |
| Estudando | Coçando o queixo e tendo a ideia | `focoIdeia` | 8,0 s | quadro estático (30 %) |
| Estudando | Riscando um item da lista de tarefas | `focoRiscarLista` | 7,0 s | quadro estático (60 %) |
| Treinando | Elevação lateral com halter | `focoElevacaoLateral` | 5,0 s | quadro estático (50 %) |
| Treinando | Flexão de braço em ritmo constante | `focoFlexao` | 5,0 s | quadro estático (25 %) |
| Treinando | Prancha firme, com leve tremor | `focoPrancha` | 6,0 s | quadro estático (50 %) |
| Treinando | Agachamento lento | `focoAgachamento` | 6,0 s | quadro estático (50 %) |
| Treinando | Alongando os braços e o pescoço | `focoAlongar` | 9,0 s | quadro estático (25 %) |
| Ritmo e respiração | Respiração profunda | `focoRespirar` | 6,0 s | quadro estático (50 %) |
| Ritmo e respiração | Meditando de olhos fechados | `focoMeditar` | 8,0 s | quadro estático (50 %) |
| Ritmo e respiração | Nadando no lugar, em ciclo calmo | `focoNadar` | 5,0 s | quadro estático (50 %) |
| Ritmo e respiração | Olhando a ampulheta enquanto a areia cai | `focoAmpulheta` | 14,0 s | quadro estático (40 %) |
| Incentivo (metade do bloco) | Aceno curto de aprovação | `focoAceno` | 2,6 s, uma vez | quadro estático (32 %) |
| Incentivo (metade do bloco) | Bíceps rápido e de volta ao trabalho | `focoBicepsRapido` | 2,8 s, uma vez | quadro estático (40 %) |
| Incentivo (pausa entre ciclos) | Bebendo água da garrafa | `focoBeberAgua` | 3,6 s, uma vez | quadro estático (45 %) |
| Incentivo (conclusão) | Punho fechado em comemoração contida | `focoPunho` | 2,8 s, uma vez | quadro estático (50 %) |

Durações na intensidade normal; no foco elas tocam na intensidade suave (30 % mais
lentas). A rosca com halter pedida no grupo Treinando já existia como
`treinarJunto`; no lugar dela entrou a elevação lateral.

As animações em laço fecham sem salto (último quadro igual ao primeiro). A
ampulheta fecha por equivalência visual: vira 180° com a areia toda embaixo, que
é o mesmo desenho do começo. Nenhuma usa efeito de partícula, corte seco ou
mudança de opacidade.

## Rebolado no foco

De vez em quando (a partir do 2º minuto do bloco, chance de 20 % por minuto, no máximo
um a cada 6 min) o JoJo rebola 3 s como no meme: estado `twerk`, animação `twerk`
(refeita do GIF: modelo próprio de costas em 3/4, corpo em feijão que amassa até cobrir as
pernas e estica de novo, 6 quadros de 40 ms, `stepFps` 25; canais `rebolando`, `rbSx`,
`rbSy`, `rbDown`, `rbHead`) e volta ao foco sozinho. O modelo entra em
tempo de execução por `src/core/rebolado.js` (o rig do personagem não muda).
Configuração `reboladoFoco` (Movimento e mouse) tira só o do foco; no repouso ele
continua rebolando às vezes (5 % das escolhas autônomas, no máximo um a cada 20 min).
Nunca no Modo Trabalho, tela cheia, modo de interação, pausa ou movimento reduzido.
Testes: `test/unit/rebolado.test.js`.

## Ao mudar o desenho

Rodar `npx electron scripts/anim-room.mjs` (espaço por animação) e
`npm run audit:animations` no Windows. Testes: `test/unit/foco-animacoes.test.js`
e `test/unit/foco-ciclos.test.js`.
