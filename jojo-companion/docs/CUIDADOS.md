# Cuidados, alimentação e progressão — correções 0.45.1

Correções 0.45.1 em validação; os registros 0.45.0 abaixo são históricos e não
substituem a nova medição/auditoria da arte restaurada.
As medidas reais do renderer Windows foram importadas do run 41367076224.
A auditoria aprovou as 1.268 animações, incluindo as 20 receitas de necessidades.

`Needs` guarda saciedade/saúde/humor/higiene, digestão, seis objetos no máximo,
consumo, histórico e outbox em `needs.json`, com arquivo atômico e backup. Timer
original de rotina foi reutilizado. Só tempo monotônico amostrado conta, sem
catch-up offline/suspensão e sem degradação no foco/tela cheia/noite. Não há morte
permanente. Alimentação/cuidado/limpeza recuperam os indicadores gradualmente.

O overlay possui HUD e objetos dentro da própria janela, sem criar arquivos ou
tocar nos ícones do Windows. Clicar para limpar requer modo de interação; fora
dele os cliques continuam atravessando a janela. A Central também permite limpar
manualmente. Os seis sprites SVG originais têm animação leve de queda e brilho;
movimento reduzido é respeitado. Os valores e raridades ficam em
`assets/catalog/needs-balance.json` (5/12/25/50/100/250 XP). Não há acúmulo infinito
nem geração de raridade por abandono. Easter eggs usam somente ícones obtidos
da instalação local pelo Windows, sem redistribuição; ver CENAS_E_FOCO.md.

`assets/catalog/foods.json` tem 56 opções: seis anteriores preservadas e exatamente
50 novas. A lista pedida já continha lula, existente; mantida uma única vez. Assim,
as outras 49 opções pedidas e mexilhão completam 50 novas sem apagar/duplicar nada.
Cada uma tem SVG original, nome, efeitos, XP, preferência, fala e consumo animado.
Imagens próprias de novos alimentos aparecem durante a mastigação; frutas não
soltam sangue nem osso. Alimentar quando saciado não concede XP; cuidados têm
cooldown e tetos. Não há som.

Vinte receitas novas de necessidades usam desenho vetorial real do rig, expressões,
corpo, braços, pernas, expressões e efeitos do modelo original restaurado.
A direção de nadadeiras sem pernas da 0.45.0 é histórica e foi revogada; os
recursos anteriores foram recuperados, sem cauda, por pedido explícito.
IDs e canais antigos permanecem compatíveis. O catálogo
antigo permanece presente. Medição/auditoria Windows 2847e41 passou para os 1.058
itens então existentes; isto não valida as 20 receitas acrescentadas depois.

A progressão é única: XP existente preservado; outbox e ledger idempotente para
novos créditos. Dez níveis/limiares anteriores não mudaram; há 40 patamares novos
com exigência crescente, configurada em dados. Barra usa limiar real, mostra nível,
XP e feedback; coleção mostra histórico e conquistas. Gestos/chat/estímulos agora
têm cooldown/tetos e saltos grandes de relógio durante a sessão suspendem XP. O
resume conhecido reancora o relógio, sem punir suspensão normal. Dados locais não
pretendem ser um serviço de antifraude contra edição arbitrária dos próprios arquivos.

Testes puros cobrem catálogo/imagens, efeitos, fome, tempo ativo, foco, persistência,
capacidade, higiene, caps, outbox, relógio e níveis. Cenário Electron Windows de
cardápio/limpeza/HUD/XP passou no run 41363120886 (6ea26c7). Mudanças posteriores
exigem nova execução antes da publicação.
