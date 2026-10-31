# Auditoria das animações e reações — Windows

Última execução Windows verificável: [41206258451](https://github.com/oaovito/oao-companion-/actions/runs/41206258451),
código `e4dee80`. A etapa da auditoria passou, embora o workflow completo tenha falhado
em uma asserção E2E de maiúscula/minúscula corrigida posteriormente.

| Item | Resultado medido |
|---|---|
| Animações (feitas à mão, catálogo nas intensidades e pacotes) | 1.043 |
| Erros | 0 |
| Recortadas | 0 |
| Quadros parados | 0 |
| Sem gatilho natural | 0 |
| Desenho médio por quadro (valor arredondado no log) | 0,31 ms |

[Amostra visual Windows](auditoria-animacoes.png): nove animações em três fases,
recuperadas do log do renderer e inspecionadas. Os números antigos de outra execução
foram retirados da versão corrente deste relatório; o histórico Git os preserva.
Não há dados disponíveis por animação desta execução para inventar uma nova matriz.

A auditoria completa é gate obrigatório no CI: `npm run audit:animations`, somente
Windows. Gera matriz/JSON/PNG e cópia comprimida no log (`JOJO_ANIMATION_REPORT`),
sem depender da cota de artefatos. A próxima execução deve substituir este resumo
com as medições completas do código final.

CI final bloqueado pelo faturamento do GitHub antes de iniciar o runner. Estes valores
não comprovam todas as alterações posteriores do controlador, a física de monitores/DPI
ou a velocidade do modelo de conversa. Nenhuma execução gráfica foi feita no host do editor.
