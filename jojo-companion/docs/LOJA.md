# Loja de JOJOcoins

A moeda se chama **JOJOcoins** (regra irredutível: nenhuma outra grafia, nem com outras maiúsculas).
O teste `test/unit/moeda-arte.test.js` varre código, docs, scripts e catálogos atrás de grafias erradas.
Só a migração da carteira lê chaves antigas com outra grafia, para não perder saldo.

## Onde está

| Parte | Arquivo |
|---|---|
| Catálogo (150 itens), índice de valor e preço | `src/core/loja-catalogo.js` |
| Carteira, ganho, compras, uso, migração | `src/core/loja.js` |
| Arte dos itens (visuais, objetos, decoração, aura, peles) | `src/core/loja-arte.js` |
| Animações e cenas da loja (42) | `src/core/loja-anims.js` |
| Ícones 64×64 (comidas, poderes, atividades, cuidados, colecionáveis, lendários) | `src/core/loja-icones.js` |
| Ligação com o JoJo (reações, troca de visual, efeitos) | `src/core/companion-loja.js` |
| Serviço no processo principal e canal da Central | `src/main/loja-service.js` |
| Tela da loja na Central | `src/renderer/shared/loja-view.js` |
| Moedas, pilha, decoração, aura e rastro no overlay | `src/renderer/overlay/loja-fx.js` |
| Arte oficial da moeda | `src/core/moeda-arte.js`, `scripts/moeda-assets.mjs`, `assets/moeda/` (ver [ARTE_QUALIDADE.md](ARTE_QUALIDADE.md)) |
| Troca dinâmica de visuais | `src/core/visuais-dinamicos.js` (ver [VISUAIS_DINAMICOS.md](VISUAIS_DINAMICOS.md)) |
| Simulação da economia | `scripts/economia-sim.mjs` |
| Comparação de desempenho | `scripts/bench-loja.mjs` |

## Como se ganha

Toda recompensa de XP já confirmada pela progressão (`Progress.award`) vira JOJOcoins por reconciliação,
em ordem de sequência, inclusive as que chegaram com o app fechado. Reprocessar o mesmo histórico não
credita de novo. Se o progresso for reiniciado, a carteira só reajusta a sequência, sem crédito.

- 1 JOJOcoin por ponto nominal de XP, vezes o fator da fonte: interação e bônus 1; alimentar, limpar e
  cuidar 0,5; tarefas e Darkest Dungeon 0,3. Fontes novas (ex.: `rpg`) valem 1.
- Teto de **1.200 JOJOcoins por dia** (antifarm). Não limita compras.
- Outras partes do app creditam por `companion.loja.creditar({ id, valor, origem, rotulo })`:
  idempotente por `id` (repetido devolve `duplicado: true`), valor inteiro de 0 a 5.000, passa pelos
  mesmos modificadores e pelo teto do dia. Se a gravação falhar, lança erro e quem chamou mantém a
  recompensa na própria fila. O RPG usa esse contrato com ids `rpg:<chave>`.

## Como o preço é calculado

O preço não é escolhido à mão.

1. Cada item recebe notas de 0 a 5 em 13 fatores ponderados: satisfação (1,6), utilidade, qualidade visual,
   quantidade de conteúdo, duração do benefício e novas experiências (1,0 cada), complexidade, variedade,
   frequência de uso e impacto na jogabilidade (0,8 cada), raridade legítima, exclusividade e valor
   colecionável (0,6 cada). A média ponderada vira o **índice de valor** (0 a 100).
2. O índice vira **tempo de obtenção**: `horas = 0,1 × e^((índice − 30) / 6,84)`.
3. O tempo vira preço pela taxa medida na simulação: **190 JOJOcoins por hora** de uso moderado
   (`TAXA_HORA`), arredondado.
4. A raridade sai do tempo: acessível até 15 min, comum 15 a 45 min, incomum 45 min a 2 h, raro 2 a 5 h,
   épico 5 a 12 h, lendário 12 a 24 h, extraordinário acima de 24 h.

Requisito de nível por raridade (o nível é do personagem; o direito de uso é da compra): acessível,
comum e incomum desde o nível 1, raro 3, épico 8, lendário 15, extraordinário 25.

Distribuição: 17 acessíveis, 30 comuns, 44 incomuns, 31 raros, 18 épicos, 9 lendários, 1 extraordinário.
Preços de 20 a 9.900. O catálogo inteiro (1 de cada) custa 95.280.

## Sem mecânica predatória

- Sem dinheiro real, sem caixa de sorte, sem oferta por tempo limitado, sem desconto relâmpago, sem
  contagem regressiva para comprar e sem preço que muda por perfil. Preço fixo e público.
- Toda compra pede confirmação, mostra o preço e o saldo depois da compra, e fica no histórico.
- Nenhum poder rende mais do que custa: o Ímã (200) dá +25% por 3 h, cerca de 140 a mais no ritmo
  moderado; Missões em Dobro (50) dobra as moedas de missões, que rendem 10 cada.
- Item permanente não se compra duas vezes; consumível respeita estoque máximo.
- O JoJo comemora a compra uma vez e não cobra nem insiste para ela comprar.

## Transações

- **Atômicas**: toda mudança é feita numa cópia e só vale se a gravação em disco confirmar
  (`AtomicState`: arquivo temporário, fsync, renomeação, cópia anterior em `.bak`). Se falhar, o
  estado volta e a Central mostra "Seu saldo não mudou".
- **Idempotentes**: compra e uso levam `txId`; repetir o mesmo `txId` devolve o resultado guardado
  (últimos 2.000). Créditos externos são idempotentes por `id` (últimos 20.000).
- **À prova de queda**: o efeito de um consumível (necessidades, missões) entra numa fila `pendentes`
  gravada junto com a baixa do estoque e é aplicado depois, de forma idempotente (id `loja:<txId>`).
  Se o app cair no meio, o efeito é aplicado ao reabrir, uma vez só.
- **Migrações versionadas e reversíveis**: `MIGRACOES` (v0 → v1 lê saldos de formatos antigos, com
  qualquer grafia da moeda), `migrarLoja` e `rebaixarLoja`. Carteira de versão mais nova é recusada
  sem apagar nada.

## Simulação da economia

`node scripts/economia-sim.mjs` roda as classes reais (`Progress` com cooldowns, tetos e bônus;
`Loja` com fatores, teto do dia e requisito de nível). A estratégia simulada compra sempre o item
liberado mais barato que falta, recompra consumível que acabou e consome conforme o perfil.
**O uso de cada perfil é suposição**, declarada no script:

| Perfil | Horas por dia (suposto) | Dias por semana | Consumo por dia ativo |
|---|---:|---:|---:|
| Casual | 0,5 | 5 | ~67 |
| Moderado | 1,5 | 6 | ~123 |
| Intenso | 4 | 7 | ~231 |

| Perfil | Dias | Nível | Ganho total | Média por dia ativo | Permanentes (de 106) | Itens (de 150) | Saldo |
|---|---:|---:|---:|---:|---:|---:|---:|
| Casual | 1 | 2 | 93 | 93 | 0 | 3 | 23 |
| Casual | 7 | 10 | 465 | 93 | 0 | 12 | 35 |
| Casual | 30 | 14 | 2.053 | 93 | 0 | 29 | 53 |
| Casual | 90 | 19 | 6.044 | 93 | 7 | 45 | 19 |
| Casual | 180 | 24 | 12.076 | 93 | 19 | 60 | 141 |
| Casual | 365 | 30 | 24.259 | 93 | 29 | 72 | 104 |
| Moderado | 1 | 8 | 287 | 287 | 0 | 10 | 2 |
| Moderado | 7 | 14 | 1.729 | 288 | 0 | 30 | 24 |
| Moderado | 30 | 21 | 7.501 | 289 | 18 | 58 | 6 |
| Moderado | 90 | 32 | 22.512 | 289 | 44 | 87 | 162 |
| Moderado | 180 | 41 | 44.702 | 288 | 68 | 111 | 582 |
| Moderado | 365 | 55 | 90.230 | 288 | 94 | 137 | 590 |
| Intenso | 1 | 12 | 766 | 766 | 0 | 21 | 1 |
| Intenso | 7 | 21 | 5.387 | 770 | 13 | 53 | 82 |
| Intenso | 30 | 34 | 23.051 | 768 | 51 | 94 | 156 |
| Intenso | 90 | 54 | 69.046 | 767 | 91 | 134 | 676 |
| Intenso | 180 | 73 | 138.038 | 767 | 105 | 149 | 9.028 |
| Intenso | 365 | 101 | 279.852 | 767 | 106 | 150 | 97.377 |

Catálogo inteiro comprado: intenso no dia 182, moderado no dia 661, casual depois do dia 1.500.

Começando no nível 200 com a carteira vazia, os números são iguais aos de cima: o requisito de nível
só segura itens nas primeiras semanas, então o nível alto não encurta nada. A loja continua relevante
depois do nível 200 porque o ganho continua igual e há o que comprar por meses (moderado) ou anos
(casual).

**Limite encontrado**: quem joga no ritmo intenso completa o catálogo em cerca de 6 meses. Depois disso,
o consumo (~231 por dia) usa só cerca de 30% do que ele ganha e o saldo acumula. No ritmo intenso,
o nível 200 só chega depois de vários anos, quando tudo já foi comprado. Nesse ponto, as JOJOcoins só
servem para consumíveis.

Refinamentos feitos com a simulação (2 de no máximo 5 ciclos):
1. A taxa usada nos preços era 120 por hora, mas a simulação mediu ~190 no perfil moderado. A taxa
   passou para 190, e os preços subiram na mesma proporção, para as faixas de tempo valerem de verdade.
2. O consumo passou a ser por perfil. Antes, a mesma cesta para todos fazia o casual gastar tudo em
   comida e nunca comprar um item permanente.

## Desempenho

Linha de base: commit `d1b23bd` (antes da loja). Mesma máquina, versões medidas alternadas.

- **Lógica do JoJo** (`node --expose-gc scripts/bench-loja.mjs <raiz>`: Companion real com relógio
  falso, 10 min simulados em quadros de 16 ms, cursor rondando, 15 repetições, 3 rodadas alternadas).
  A primeira medição mostrou **+16%** (mínimo de ~125 para ~145 ms): as 126 animações novas da loja
  entraram no catálogo, e o sorteio do repouso relia as preferências (que varrem o catálogo inteiro)
  uma vez por item, o que dá custo quadrático. A correção (`variety.js`: preferências lidas uma vez
  por sorteio e lista de repouso em cache) deixou a versão nova **mais rápida que a linha de base**:
  mínimo de 128 a 141 ms antes e de 88 a 97 ms depois.
- **Desenho do overlay** (Chromium sem tela, `RigRenderer` com toda a cadeia de peças do overlay,
  1.500 quadros do repouso, 9 repetições, 3 rodadas alternadas). Média das medianas: 11.389 ms antes e
  11.487 ms depois (+0,9%). Média dos mínimos: 10.516 ms antes e 10.537 ms depois (+0,2%). A variação
  entre rodadas da mesma versão foi de até ~8%, então a diferença fica dentro do ruído.
- CPU e memória do app real no Windows (`scripts/measure.mjs`) só rodam no CI do Windows. Ainda não
  rodaram com esta mudança.
- A loja só gasta recurso aberta: miniaturas desenham quando aparecem na tela, a pré-visualização anima
  só enquanto está visível, e sem loja ligada o overlay não roda nada de `loja-fx`.

## Reverter

1. Reverter o commit da loja. As versões anteriores não leem `<userData>/loja.json`, que pode ficar
   (ou ser apagado, sem efeito no resto).
2. Campos novos ficam inofensivos nas versões anteriores: `lojaAplicados` nas necessidades (a
   validação anterior preserva campos extras, conferido em `d1b23bd`) e `visualAuto`, `visualFixo` e
   `lojaReacoes` nas configurações.
3. A carteira desce de formato com `rebaixarLoja(estado, 0)`: v1 → v0 guarda o saldo
   (`{ version: 0, JOJOcoins }`), e subir de novo devolve o mesmo saldo (testado). Inventário e
   histórico não existiam na v0 e não descem.

## Catálogo completo

Tempo de obtenção = preço ÷ 190 (ritmo moderado).

| Id | Nome | Categoria | Preço | Raridade | Índice | Tempo de obtenção | Benefício | Justificativa |
|---|---|---|---:|---|---:|---:|---|---|
| lv01 | Jaleco de Cientista | Visuais | 1.100 | Épico | 57.9 | 5,8 h | Jaleco, óculos de laboratório e tubo de ensaio no bolso. O JoJo veste sozinho em conversa de ciência. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv02 | Plantão Médico | Visuais | 930 | Raro | 56.6 | 4,9 h | Pijama cirúrgico, estetoscópio e crachá. Aparece em assunto de saúde. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv03 | Professor Severo | Visuais | 1.100 | Épico | 57.9 | 5,8 h | Terno de tweed, gravata-borboleta e giz. Para explicação e estudo. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv04 | Programador de Madrugada | Visuais | 1.100 | Épico | 57.9 | 5,8 h | Jaqueta, boné, fone e código no peito. Combina com editor de código aberto. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv05 | Executivo Implacável | Visuais | 1.100 | Épico | 57.9 | 5,8 h | Terno escuro, gravata vermelha e relógio de ouro. Para reunião e trabalho. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv06 | Chef Tubarão | Visuais | 930 | Raro | 56.6 | 4,9 h | Dólmã, avental, lenço e chapéu de chef. Aparece na hora de comer. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv07 | Personal Trainer | Visuais | 1.100 | Épico | 57.9 | 5,8 h | Regata, short, boné, apito e cronômetro. Para treino e timer. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv08 | Faixa Preta | Visuais | 580 | Raro | 53.4 | 3,1 h | Quimono branco, faixa preta e bandana vermelha. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv09 | Astronauta | Visuais | 1.000 | Épico | 57.2 | 5,3 h | Macacão espacial, capacete com viseira e bandeira do Brasil. | Índice puxado por satisfação proporcionada, qualidade visual, duração do benefício. |
| lv10 | Detetive Noir | Visuais | 580 | Raro | 53.4 | 3,1 h | Sobretudo, chapéu fedora, cachimbo e lupa no bolso. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv11 | Juiz Supremo | Visuais | 580 | Raro | 53.4 | 3,1 h | Toga, peruca de tribunal, babado e martelinho. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv12 | Rei dos Sete Mares | Visuais | 1.750 | Épico | 61 | 9,2 h | Capa azul real, coroa, corrente e broche de tridente. | Índice puxado por satisfação proporcionada, qualidade visual, duração do benefício. |
| lv13 | Capitão Pirata | Visuais | 580 | Raro | 53.4 | 3,1 h | Colete, chapéu de pirata, tapa-olho, bigode e botas. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv14 | Cavaleiro de Armadura | Visuais | 1.000 | Épico | 57.2 | 5,3 h | Armadura, elmo com chifres e brasão. | Índice puxado por satisfação proporcionada, qualidade visual, duração do benefício. |
| lv15 | Mago Estelar | Visuais | 1.000 | Épico | 57.2 | 5,3 h | Capa de estrelas, chapéu de bruxo e barba branca. | Índice puxado por satisfação proporcionada, qualidade visual, duração do benefício. |
| lv16 | Rockstar | Visuais | 710 | Raro | 54.8 | 3,7 h | Jaqueta de couro com tachas, cabelo espetado e óculos escuros. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv17 | Pijama de Estrelas | Visuais | 760 | Raro | 55.2 | 4 h | Macacão de pijama, bobs e máscara de dormir na testa. Só à noite. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv18 | Moletom de Domingo | Visuais | 180 | Incomum | 45.5 | 57 min | Moletom com capuz, short e chinelo. Para descanso e fim de semana. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| lv19 | Surfista | Visuais | 580 | Raro | 53.4 | 3,1 h | Regata florida, bermuda, chinelo, protetor no focinho e prancha. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv20 | Gaúcho do Churrasco | Visuais | 480 | Raro | 52.1 | 2,5 h | Bombacha, chapéu, lenço vermelho e guaiaca com moedas. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv21 | Cangaceiro | Visuais | 480 | Raro | 52.1 | 2,5 h | Chapéu de couro, colete, cartucheira e sandália. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv22 | Smoking de Gala | Visuais | 1.750 | Épico | 61 | 9,2 h | Smoking, gravata-borboleta, rosa na lapela e topete. | Índice puxado por satisfação proporcionada, qualidade visual, duração do benefício. |
| lv23 | Bombeiro | Visuais | 480 | Raro | 52.1 | 2,5 h | Uniforme vermelho com faixas refletivas e capacete com brasão. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv24 | Marinheiro | Visuais | 580 | Raro | 53.4 | 3,1 h | Camisa listrada, quepe, lenço azul e âncora. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv25 | Palhaço do Caos | Visuais | 580 | Raro | 53.4 | 3,1 h | Macacão de bolinhas, peruca colorida, nariz vermelho e sapatão. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv26 | Agente Secreto | Visuais | 1.100 | Épico | 57.9 | 5,8 h | Terno preto, gravata fina, óculos escuros e ponto no ouvido. Discreto no foco. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv27 | Explorador | Visuais | 580 | Raro | 53.4 | 3,1 h | Colete de safári, chapéu de palha, binóculo e bússola. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv28 | Mr. Olympia | Visuais | 1.700 | Épico | 60.7 | 8,9 h | Sunga de palco, colar de ouro, número de atleta e brilho de óleo. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv29 | Hacker Encapuzado | Visuais | 580 | Raro | 53.4 | 3,1 h | Sobretudo preto, capuz, óculos verdes e chuva de código. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lv30 | Imperador Romano | Visuais | 1.750 | Épico | 61 | 9,2 h | Toga com faixa púrpura, coroa de louros e sandália. | Índice puxado por satisfação proporcionada, qualidade visual, duração do benefício. |
| lc01 | Banquete de Atum | Comidas e bebidas | 80 | Comum | 40 | 25 min | Fome +45, humor +10, saúde +5. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lc02 | Sushi Omakase | Comidas e bebidas | 60 | Comum | 37.9 | 19 min | Fome +35, humor +15. Escolha do chef. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lc03 | Poke de Salmão | Comidas e bebidas | 55 | Comum | 37.2 | 17 min | Fome +30, saúde +8, humor +6. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lc04 | Shake de Whey | Comidas e bebidas | 130 | Comum | 43.1 | 41 min | Fome +20, saúde +6 e Metabolismo Lento por 2 h. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lc05 | Café Turbo | Comidas e bebidas | 120 | Comum | 42.8 | 38 min | Humor +12, fome +8 e Humor Blindado por 2 h. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lc06 | Açaí na Tigela | Comidas e bebidas | 65 | Comum | 38.3 | 21 min | Fome +28, humor +12. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lc07 | Brigadeiro Gourmet | Comidas e bebidas | 25 | Acessível | 32.1 | 8 min | Humor +20, fome +10, saúde −2. Doce, mas é seu. | Índice puxado por satisfação proporcionada, qualidade visual, frequência potencial de uso. |
| lc08 | Pastel de Feira | Comidas e bebidas | 40 | Acessível | 35.5 | 13 min | Fome +25, humor +10. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lc09 | Churrasco Completo | Comidas e bebidas | 120 | Comum | 42.4 | 38 min | Fome +50, humor +12. Enche de verdade. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lc10 | Moqueca Capixaba | Comidas e bebidas | 80 | Comum | 39.7 | 25 min | Fome +38, saúde +6, humor +8. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lc11 | Lagosta Thermidor | Comidas e bebidas | 150 | Incomum | 44.1 | 47 min | Fome +32, humor +22. Luxo marinho. | Índice puxado por satisfação proporcionada, qualidade visual, utilidade prática. |
| lc12 | Ramen Picante | Comidas e bebidas | 65 | Comum | 38.3 | 21 min | Fome +34, humor +8, higiene −3 (suor). | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lc13 | Pizza Família | Comidas e bebidas | 50 | Comum | 36.9 | 16 min | Fome +45, humor +15, saúde −4. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lc14 | Bolo de Comemoração | Comidas e bebidas | 65 | Comum | 38.3 | 21 min | Humor +25, fome +15 e confete na hora de comer. | Índice puxado por satisfação proporcionada, qualidade visual, utilidade prática. |
| lc15 | Picolé de Limão | Comidas e bebidas | 25 | Acessível | 32.4 | 8 min | Humor +10, fome +6. Refresca. | Índice puxado por satisfação proporcionada, qualidade visual, frequência potencial de uso. |
| lc16 | Sopa Restauradora | Comidas e bebidas | 45 | Acessível | 35.9 | 14 min | Saúde +18, fome +18. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lc17 | Vitamina de Banana | Comidas e bebidas | 40 | Acessível | 35.5 | 13 min | Fome +22, saúde +8, humor +6. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lc18 | Frutos do Mar Gratinados | Comidas e bebidas | 60 | Comum | 37.9 | 19 min | Fome +36, humor +14. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lc19 | Torta Holandesa | Comidas e bebidas | 20 | Acessível | 31 | 6 min | Humor +18, fome +16, saúde −2. | Índice puxado por satisfação proporcionada, qualidade visual, utilidade prática. |
| lc20 | Caviar Beluga | Comidas e bebidas | 230 | Incomum | 47.2 | 1,2 h | Fome +20, humor +35, saúde +10 e brilho dourado. O mais caro do mar. | Índice puxado por satisfação proporcionada, qualidade visual, raridade legítima. |
| ob01 | Ioiô Profissional | Objetos interativos | 350 | Incomum | 50 | 1,8 h | O JoJo faz truques de ioiô quando você pede e às vezes sozinho. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| ob02 | Cubo Mágico | Objetos interativos | 350 | Incomum | 50 | 1,8 h | Ele resolve (ou finge) o cubo mágico em segundos. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| ob03 | Bola de Basquete | Objetos interativos | 350 | Incomum | 50 | 1,8 h | Quica a bola no chão do desktop com ritmo. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| ob04 | Guitarra Elétrica | Objetos interativos | 930 | Raro | 56.6 | 4,9 h | Solo de guitarra muda (o JoJo é silencioso, como sempre). | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| ob05 | Kettlebell | Objetos interativos | 350 | Incomum | 50 | 1,8 h | Série de swings com kettlebell. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| ob06 | Corda de Pular | Objetos interativos | 350 | Incomum | 50 | 1,8 h | Pula corda com a corda passando em volta do corpo. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| ob07 | Videogame Portátil | Objetos interativos | 350 | Incomum | 50 | 1,8 h | Joga uma partida rápida no portátil e comemora. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| ob08 | Pipa | Objetos interativos | 640 | Raro | 54.1 | 3,4 h | Empina pipa com a linha esticando até o alto. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| ob09 | Bambolê | Objetos interativos | 350 | Incomum | 50 | 1,8 h | Rebola o bambolê na cintura. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| ob10 | Lupa Gigante | Objetos interativos | 350 | Incomum | 50 | 1,8 h | Examina coisas imaginárias com a lupa. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| ob11 | Varinha de Bolhas | Objetos interativos | 680 | Raro | 54.5 | 3,6 h | Sopra bolhas de sabão que flutuam. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| ob12 | Tambor de Maracatu | Objetos interativos | 450 | Raro | 51.7 | 2,4 h | Batuca a alfaia no ritmo (sem som). | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| ob13 | Prancheta de Técnico | Objetos interativos | 450 | Raro | 51.7 | 2,4 h | Desenha a jogada da sua tarefa na prancheta. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| ob14 | Leque de Papel | Objetos interativos | 350 | Incomum | 50 | 1,8 h | Se abana com o leque, dramático. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| ob15 | Anilha Olímpica | Objetos interativos | 350 | Incomum | 50 | 1,8 h | Gira a anilha como volante e depois levanta. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| dc01 | Planta de Aquário | Decoração | 130 | Comum | 43.4 | 41 min | Alga verde que balança ao lado do JoJo. | Índice puxado por duração do benefício, satisfação proporcionada, frequência potencial de uso. |
| dc02 | Baú do Tesouro | Decoração | 230 | Incomum | 47.2 | 1,2 h | Baú de madeira com JOJOcoins brilhando. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| dc03 | Castelo de Aquário | Decoração | 180 | Incomum | 45.2 | 57 min | Castelinho clássico com torre e telhado vermelho. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| dc04 | Concha com Pérola | Decoração | 230 | Incomum | 47.2 | 1,2 h | Concha rosa aberta com pérola que brilha. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| dc05 | Coral Rosa | Decoração | 130 | Comum | 43.4 | 41 min | Coral ramificado com pontas claras. | Índice puxado por duração do benefício, satisfação proporcionada, frequência potencial de uso. |
| dc06 | Estrela-do-Mar | Decoração | 130 | Comum | 43.4 | 41 min | Estrela-do-mar sentada, olhando para você. | Índice puxado por duração do benefício, satisfação proporcionada, frequência potencial de uso. |
| dc07 | Âncora Antiga | Decoração | 130 | Comum | 43.4 | 41 min | Âncora com ferrugem e argola. | Índice puxado por duração do benefício, satisfação proporcionada, frequência potencial de uso. |
| dc08 | Mini Farol | Decoração | 230 | Incomum | 47.2 | 1,2 h | Farol listrado com luz pulsando. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| dc09 | Kit de Yoga | Decoração | 130 | Comum | 43.4 | 41 min | Tapete enrolado e garrafinha de água. | Índice puxado por duração do benefício, satisfação proporcionada, frequência potencial de uso. |
| dc10 | Banco de Supino | Decoração | 310 | Incomum | 49 | 1,6 h | Banco com barra e anilhas vermelhas. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| dc11 | Luminária de Lava | Decoração | 180 | Incomum | 45.2 | 57 min | Luminária roxa com bolhas de lava pulsando. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| dc12 | Toca-Discos | Decoração | 230 | Incomum | 47.2 | 1,2 h | Vitrola com disco e nota musical (sem som). | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| dc13 | Pilha de Livros | Decoração | 130 | Comum | 43.4 | 41 min | Três livros e um troféu em cima. | Índice puxado por duração do benefício, satisfação proporcionada, frequência potencial de uso. |
| dc14 | Aquário Redondo | Decoração | 350 | Incomum | 50 | 1,8 h | Aquário com um peixinho laranja nadando. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| dc15 | Bandeira do Clube | Decoração | 280 | Incomum | 48.3 | 1,5 h | Bandeira azul com a barbatana do JoJo, atrás dele. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| la01 | Moonwalk | Animações | 390 | Raro | 50.7 | 2,1 h | Desliza para trás no passo mais famoso do mundo. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| la02 | Flexão de Um Braço | Animações | 340 | Incomum | 49.7 | 1,8 h | Série de flexões com um braço nas costas. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| la03 | Dança do Robô | Animações | 340 | Incomum | 49.7 | 1,8 h | Movimentos travados em quadros, estilo robô. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| la04 | Capa de Revista | Animações | 500 | Raro | 52.4 | 2,6 h | Sequência de poses com brilho, como numa sessão de capa. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| la05 | Saudação Samurai | Animações | 220 | Incomum | 46.9 | 1,2 h | Reverência lenta e firme de samurai. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| la06 | Mortal para Trás | Animações | 930 | Raro | 56.6 | 4,9 h | Pulo, giro completo para trás e aterrissagem. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| la07 | Beatbox Silencioso | Animações | 220 | Incomum | 46.9 | 1,2 h | Mandíbula no ritmo e cabeça balançando (sem som). | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| la08 | Air Guitar | Animações | 340 | Incomum | 49.7 | 1,8 h | Solo de guitarra invisível com cabeçadas. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| la09 | Desfile de Passarela | Animações | 340 | Incomum | 49.7 | 1,8 h | Atravessa a passarela, gira e faz pose final. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| la10 | Meditação Flutuante | Animações | 640 | Raro | 54.1 | 3,4 h | Flutua de olhos fechados com bolhas subindo. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| la11 | Discurso de Vitória | Animações | 340 | Incomum | 49.7 | 1,8 h | Aponta para a plateia e ergue os braços. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| la12 | Pouso de Super-Herói | Animações | 930 | Raro | 56.6 | 4,9 h | Cai do alto num pouso com o punho no chão. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| la13 | Dab | Animações | 110 | Comum | 42.1 | 35 min | O dab, com a seriedade de quem sabe que é antigo. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| la14 | Truque de Mágica | Animações | 620 | Raro | 53.8 | 3,3 h | Some num estalo e reaparece com brilho. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| la15 | Rotina do Mr. Olympia | Animações | 1.200 | Épico | 58.3 | 6,3 h | Sequência oficial de poses de fisiculturismo. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lp01 | Metabolismo Lento | Poderes | 110 | Comum | 41.7 | 35 min | Por 24 h a fome cai 40% mais devagar. | Índice puxado por satisfação proporcionada, utilidade prática, impacto na jogabilidade. |
| lp02 | Escamas Autolimpantes | Poderes | 110 | Comum | 41.7 | 35 min | Por 24 h a higiene cai pela metade da velocidade. | Índice puxado por satisfação proporcionada, utilidade prática, impacto na jogabilidade. |
| lp03 | Imunidade de Tubarão | Poderes | 120 | Comum | 42.8 | 38 min | Por 24 h a saúde não cai, nem com fome ou sujeira. | Índice puxado por satisfação proporcionada, utilidade prática, impacto na jogabilidade. |
| lp04 | Digestão Discreta | Poderes | 85 | Comum | 40.3 | 27 min | Por 24 h a digestão demora o dobro (menos sujeira no aquário). | Índice puxado por satisfação proporcionada, utilidade prática, duração do benefício. |
| lp05 | Ímã de JOJOcoins | Poderes | 200 | Incomum | 46.2 | 1,1 h | Por 3 h toda recompensa rende 25% a mais de JOJOcoins. | Índice puxado por satisfação proporcionada, utilidade prática, impacto na jogabilidade. |
| lp06 | Sorte do Aquário | Poderes | 220 | Incomum | 46.6 | 1,2 h | Por 24 h as sujeiras raras (radioativa, flamejante, dourada, lendária) aparecem 3× mais. | Índice puxado por satisfação proporcionada, impacto na jogabilidade, utilidade prática. |
| lp07 | Troca de Missão | Poderes | 30 | Acessível | 33.4 | 9 min | Troca uma missão do dia ainda não cumprida por outra. | Índice puxado por satisfação proporcionada, utilidade prática, impacto na jogabilidade. |
| lp08 | Missão Extra | Poderes | 25 | Acessível | 31.7 | 8 min | Acrescenta uma quarta missão ao dia de hoje. | Índice puxado por satisfação proporcionada, utilidade prática, impacto na jogabilidade. |
| lp09 | Escudo de Sequência | Poderes | 70 | Comum | 39 | 22 min | Se você ficar um dia sem abrir o JoJo, a sequência de dias não zera (uma vez). | Índice puxado por satisfação proporcionada, utilidade prática, impacto na jogabilidade. |
| lp10 | Bônus Ampliado | Poderes | 60 | Comum | 37.9 | 19 min | Por 24 h cabem 9 bônus de XP no dia em vez de 6 (vão para a coleção). | Índice puxado por satisfação proporcionada, utilidade prática, duração do benefício. |
| lp11 | Humor Blindado | Poderes | 65 | Comum | 38.6 | 21 min | Por 24 h o humor do JoJo nunca fica abaixo de 60. | Índice puxado por satisfação proporcionada, utilidade prática, duração do benefício. |
| lp12 | Recuperação Express | Poderes | 30 | Acessível | 33.4 | 9 min | Cuidado imediato sem esperar o intervalo: saúde +25, higiene +10. | Índice puxado por satisfação proporcionada, utilidade prática, impacto na jogabilidade. |
| lp13 | Sensor de Conquistas | Poderes | 370 | Incomum | 50.3 | 1,9 h | Para sempre: a Coleção mostra quanto falta para cada conquista. | Índice puxado por duração do benefício, satisfação proporcionada, utilidade prática. |
| lp14 | Radar de Bônus | Poderes | 370 | Incomum | 50.3 | 1,9 h | Para sempre: a Coleção mostra quais atividades ainda têm bônus hoje. | Índice puxado por duração do benefício, satisfação proporcionada, utilidade prática. |
| lp15 | Missões em Dobro | Poderes | 50 | Comum | 36.9 | 16 min | Por 24 h cada missão cumprida rende o dobro de JOJOcoins. | Índice puxado por satisfação proporcionada, utilidade prática, duração do benefício. |
| lt01 | Sessão de Fotos | Atividades | 620 | Raro | 53.8 | 3,3 h | Três poses com flash e comentário do fotógrafo (ele mesmo). | Índice puxado por satisfação proporcionada, duração do benefício, novas experiências. |
| lt02 | Show de Stand-up | Atividades | 620 | Raro | 53.8 | 3,3 h | Três piadas do repertório do JoJo com reação da plateia (você). | Índice puxado por satisfação proporcionada, duração do benefício, novas experiências. |
| lt03 | Treino Guiado | Atividades | 1.200 | Épico | 58.3 | 6,3 h | Circuito de 90 s: flexão, rosca, agachamento e alongamento. Humor +8 uma vez por dia. | Índice puxado por satisfação proporcionada, duração do benefício, novas experiências. |
| lt04 | Desfile de Moda | Atividades | 2.050 | Épico | 62.1 | 10,8 h | Passarela com até quatro visuais seus em sequência. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lt05 | Karaokê Mudo | Atividades | 620 | Raro | 53.8 | 3,3 h | Microfone, notas musicais e a pior dublagem do aquário. | Índice puxado por satisfação proporcionada, duração do benefício, novas experiências. |
| lt06 | Meditação Guiada | Atividades | 970 | Épico | 56.9 | 5,1 h | Um minuto de respiração com o JoJo. Humor +10 uma vez por dia. | Índice puxado por satisfação proporcionada, duração do benefício, utilidade prática. |
| lt07 | Noite de Cinema | Atividades | 620 | Raro | 53.8 | 3,3 h | O JoJo assiste a um filme imaginário e comenta. | Índice puxado por satisfação proporcionada, duração do benefício, novas experiências. |
| lt08 | Maratona de Quiz | Atividades | 350 | Incomum | 50 | 1,8 h | Abre direto o quiz do JoJo na conversa. | Índice puxado por duração do benefício, satisfação proporcionada, quantidade de conteúdo. |
| lt09 | Aula de Ciência | Atividades | 1.000 | Épico | 57.2 | 5,3 h | Três curiosidades científicas com o JoJo de professor. | Índice puxado por satisfação proporcionada, duração do benefício, novas experiências. |
| lt10 | Caça às Bolhas | Atividades | 280 | Incomum | 48.3 | 1,5 h | Abre o mini-jogo de bolhas em volta do JoJo. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| lk01 | Sabonete de Algas | Cuidado | 40 | Acessível | 35.5 | 13 min | Higiene +35. | Índice puxado por satisfação proporcionada, utilidade prática, frequência potencial de uso. |
| lk02 | Spa Completo | Cuidado | 150 | Incomum | 44.1 | 47 min | Higiene vai a 100, humor +20, saúde +10. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lk03 | Primeiros Socorros | Cuidado | 35 | Acessível | 34.1 | 11 min | Saúde +35. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lk04 | Vitaminas do Mar | Cuidado | 35 | Acessível | 33.8 | 11 min | Saúde +15, humor +5. | Índice puxado por satisfação proporcionada, utilidade prática, frequência potencial de uso. |
| lk05 | Massagem nas Barbatanas | Cuidado | 50 | Comum | 36.6 | 16 min | Humor +25. | Índice puxado por satisfação proporcionada, utilidade prática, frequência potencial de uso. |
| lk06 | Escova de Dentes Turbo | Cuidado | 40 | Acessível | 35.5 | 13 min | Higiene +20 e brilho nos dentes. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lk07 | Soneca Restauradora | Cuidado | 25 | Acessível | 32.4 | 8 min | Saúde +20, humor +10 (de dia ele medita em vez de dormir). | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lk08 | Hidratante de Escamas | Cuidado | 35 | Acessível | 33.8 | 11 min | Higiene +25, saúde +5. | Índice puxado por satisfação proporcionada, utilidade prática, frequência potencial de uso. |
| lk09 | Aromaterapia Marinha | Cuidado | 35 | Acessível | 33.8 | 11 min | Humor +15, higiene +10. | Índice puxado por satisfação proporcionada, utilidade prática, frequência potencial de uso. |
| lk10 | Desinfetante de Aquário | Cuidado | 35 | Acessível | 34.1 | 11 min | Limpa todas as sujeiras de uma vez (sem XP das limpezas) e higiene +10. | Índice puxado por satisfação proporcionada, utilidade prática, qualidade visual. |
| lx01 | Dente de Megalodon | Colecionáveis | 160 | Incomum | 44.5 | 51 min | Fóssil de um dente do meu bisavô. Tamanho família. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| lx02 | Figurinha Holográfica do JoJo | Colecionáveis | 280 | Incomum | 48.3 | 1,5 h | A figurinha mais rara do álbum: eu, brilhando. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| lx03 | Concha Dourada | Colecionáveis | 160 | Incomum | 44.5 | 51 min | Concha banhada a ouro de praia que não existe no mapa. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| lx04 | Garrafa com Mensagem | Colecionáveis | 110 | Comum | 41.7 | 35 min | Garrafa antiga com um bilhete enrolado dentro. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| lx05 | Medalha de Atlântida | Colecionáveis | 160 | Incomum | 44.5 | 51 min | Medalha cunhada na cidade perdida. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| lx06 | Medalha Olímpica de Natação | Colecionáveis | 160 | Incomum | 44.5 | 51 min | Ouro nos 100 m livres, categoria tubarão. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| lx07 | Fóssil de Trilobita | Colecionáveis | 120 | Comum | 42.8 | 38 min | Fóssil de 400 milhões de anos. Mais velho que meus planos. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| lx08 | Pérola Negra | Colecionáveis | 180 | Incomum | 45.5 | 57 min | Pérola negra rara, brilho de petróleo. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| lx09 | Halter de Ouro em Miniatura | Colecionáveis | 160 | Incomum | 44.5 | 51 min | Réplica de troféu de campeonato de fisiculturismo. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| lx10 | Bússola do Capitão | Colecionáveis | 160 | Incomum | 44.5 | 51 min | Bússola de latão que sempre aponta para o JoJo. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| ll01 | Aura Lendária | Lendários | 3.600 | Lendário | 65.9 | 18,9 h | Aura dourada pulsando atrás do JoJo. Liga e desliga quando quiser. | Índice puxado por satisfação proporcionada, qualidade visual, duração do benefício. |
| ll02 | Trono de Ouro | Lendários | 2.950 | Lendário | 64.5 | 15,5 h | Trono de ouro com veludo vermelho atrás do JoJo. | Índice puxado por satisfação proporcionada, qualidade visual, duração do benefício. |
| ll03 | Forma Megalodon | Lendários | 2.300 | Lendário | 62.8 | 12,1 h | Por 30 min o JoJo vira um megalodon: maior, mais largo e com a pele antiga. | Índice puxado por satisfação proporcionada, qualidade visual, novas experiências. |
| ll04 | Festa no Desktop | Lendários | 9.900 | Extraordinário | 72.8 | 52,1 h | Festa de 30 s: dança, confete e chuva de JOJOcoins. Uma vez a cada 20 h. | Índice puxado por satisfação proporcionada, qualidade visual, duração do benefício. |
| ll05 | Chuva de JOJOcoins | Lendários | 4.000 | Lendário | 66.6 | 21,1 h | JOJOcoins douradas caem em volta do JoJo enquanto ele comemora. Uma vez a cada 12 h. | Índice puxado por satisfação proporcionada, qualidade visual, duração do benefício. |
| ll06 | Rastro de Brilho | Lendários | 2.800 | Lendário | 64.1 | 14,7 h | Quando anda, o JoJo deixa um rastro de brilhos dourados. Liga e desliga. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| ll07 | Holofote de Campeão | Lendários | 2.400 | Lendário | 63.1 | 12,6 h | A cada nível ou conquista, holofote e aura por 12 s com pose de campeão. | Índice puxado por satisfação proporcionada, duração do benefício, qualidade visual. |
| ll08 | Cofre do Tubarão | Lendários | 3.400 | Lendário | 65.5 | 17,9 h | Painel de estatísticas da sua economia com o monte de JOJOcoins desenhado pelo seu saldo. | Índice puxado por duração do benefício, satisfação proporcionada, qualidade visual. |
| ll09 | Tubarão Dourado | Lendários | 3.250 | Lendário | 65.2 | 17,1 h | Visual secreto: pele de ouro, capa vermelha e coroa. | Índice puxado por satisfação proporcionada, qualidade visual, duração do benefício. |
| ll10 | Estátua do Campeão | Lendários | 2.950 | Lendário | 64.5 | 15,5 h | Estátua dourada do tubarão da JOJOcoin num pedestal, ao lado do JoJo. | Índice puxado por satisfação proporcionada, qualidade visual, duração do benefício. |
