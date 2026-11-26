# Monster na dieta do JoJo (0.48.2)

Pedido do João (26/11/2026): energéticos Monster de vários sabores no cardápio, com desenho caprichado, e um
**easter egg**: o favorito do JoJo é o **Monster branco (Ultra)**, recompensado quando a Emanuele dá para ele.

## Sabores

`src/core/monster.js` → `SABORES` (ids `monsterOriginal`, `monsterUltra`, `monsterMangoLoco`,
`monsterPipelinePunch`, `monsterKhaotic`, `monsterUltraViolet`). Entram em `assets/catalog/foods.json` como
bebidas (`bebida: true`) e no RPG (`BEBIDAS` em `rpg/vida.js`): energia como o energético, e três energéticos
(qualquer um, Monster incluído) em 4 h podem dar "coração acelerado".

## Arte

Uma geometria-mestre (`LATA`) gera tudo: o ícone 64×64 do cardápio (`svgLata`, gravado em
`assets/foods/<id>.svg` por `node scripts/monster-assets.mjs`) e a lata na mão do JoJo (peças `mn_*` numa cópia
do rig, `rigComMonster`). Lata alta (proporção `ALTURA`), tampa com anel, aro de alumínio, reflexos, faixa do
rótulo, o "M" de três garras serrilhadas com fio de brilho e a estampa de cada sabor. Na mão, sem textos
(simplificação óptica). O teste confere que o SVG gravado é exatamente o gerado.

## Segredo do favorito

- Nada na interface entrega: no cardápio o branco é "Aceita", igual aos outros; as notas da versão não falam
  dele (o teste `monster.test.js` confere).
- Ela dá o branco → `needs-service` toca `cat_mn01` ("Êxtase do Monster Branco", 9 s): encara a lata de olhos
  arregalados, abre ("PSSHH!"), vira tudo com a cabeça para trás, as garras do Monster rasgam a cena, aura
  branca, olhos brancos brilhando, raios, "É O BRANCO!!!", bíceps e um coração para a lata. Respeita
  Trabalho/foco/tela cheia (sem animação nem fala; a recompensa vale igual).
- Recompensa (`registrarFavorito`, estado em `needs.json` → `segredos.monsterFavorito`): descoberta (1ª vez)
  150 JOJOcoins + 40 XP; depois 25 JOJOcoins + 8 XP uma vez por dia. XP pela fila idempotente das
  necessidades (`needs:monster:*`); JOJOcoins por `Loja.creditar` (ids `monster:favorito:*`), esperando em
  `moedasPendentes` se a carteira ainda não abriu.
- O favorito sempre cabe: mesmo saciado (fome ≥ 95), o JoJo aceita o branco.

## Ferramentas

- `node scripts/preview-monster.mjs saida.png 0.4,2,3.4,5.5,7.9` — prancha de quadros da animação.
- `node scripts/anim-room-monster.mjs` — mede o espaço da janela só dessa animação (`jojo.room.json`).
