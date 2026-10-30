# Motor de intenções (linguagem natural)

Ela fala normal; o JoJo entende e age. Nada de `/comando` obrigatório (os comandos com "/" continuam
existindo só como atalho).

- **Registro central de ações** (`src/core/dialogue/motor-intencoes.js`, `ACOES`): cada ação tem
  descrição, parâmetros e executor real no companion (`Companion.runActions`). Só existe o que
  funciona de verdade. Nenhuma ação do registro é destrutiva; tudo é reversível ("não era isso").
- **Camadas**: pergunta sobre função → explica (não executa); negação/futuro incerto → nada; mensagem
  composta → várias ações em ordem (e o trecho de pergunta segue para a resposta); contexto ("mais um
  pouco", "volta ao normal", "não era isso", "faz de novo"); pedido indireto ("tá gigante", "tô
  entediada", "não aguento essas animações"); ambiguidade → pergunta curta ("Sharingan ou Fúria
  berserker?", "Diminuo, mudo de canto ou os dois?") resolvida pela resposta seguinte.
- **Qwen 3.5 2B** (conversa local): devolve `acoes: [{acao, parametros}]` (até 4). Cada uma é validada
  pelo registro (id e tipo dos parâmetros); inventada ou inválida é descartada. O app executa e
  confirma com o resultado real ("Pronto: 80%.").
- **Modo Trabalho**: pedidos diretos dela funcionam; nada espontâneo.
- **Memória**: "lembra daquele assunto sobre DLS?" procura no que foi conversado desde que o app abriu;
  sem registro, ele diz que não lembra (não inventa).

Testes: `test/unit/motor-intencoes.test.js` (mais de mil variações de frases, 31 frases neutras sem
nenhum disparo, compostas, contexto, ambiguidade, validação do Qwen e execução real).
