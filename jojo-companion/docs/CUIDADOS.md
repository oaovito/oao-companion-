# Cuidados, alimentação e progressão — candidata 0.45.0

Implementados em código; validação completa Windows/render/build ainda pendente.
As novas medidas de animação não foram inventadas: o gate de cobertura permanece
falhando até importar as medidas do renderer Windows.

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
nem geração de raridade por abandono. **Easter eggs de marcas ainda pendentes**;
não foram incluídos logos sem origem/uso definidos.

`assets/catalog/foods.json` tem 56 opções: seis anteriores preservadas e exatamente
50 novas. A lista pedida já continha lula, existente; mantida uma única vez. Assim,
as outras 49 opções pedidas e mexilhão completam 50 novas sem apagar/duplicar nada.
Cada uma tem SVG original, nome, efeitos, XP, preferência, fala e consumo animado.
Imagens próprias de novos alimentos aparecem durante a mastigação; frutas não
soltam sangue nem osso. Alimentar quando saciado não concede XP; cuidados têm
cooldown e tetos. Não há som.

Vinte receitas novas de necessidades usam desenho vetorial real do rig, expressões,
corpo/nadadeiras/cauda e efeitos. A anatomia foi retargetada sem membros humanos;
IDs de canais antigos permanecem como âncoras de compatibilidade. O catálogo
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
cardápio/limpeza/HUD/XP foi preparado e ainda precisa passar no Actions.
