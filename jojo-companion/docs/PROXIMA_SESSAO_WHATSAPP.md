# Prompt para a próxima sessão — WhatsApp do JoJo

Cole o bloco abaixo numa sessão nova. Ele separa o que já foi feito do que depende
de você (Emanuele/João) e diz exatamente o que a sessão deve fazer em cada caso.

```
Você está no projeto JoJo Companion (repositório oaovito/oao-companion-, código em
jojo-companion/). Leia AGENTS.md, CLAUDE.md, jojo-companion/HANDOFF.md (seção
"revisão do WhatsApp"), jojo-companion/docs/WHATSAPP.md e
jojo-companion/docs/WHATSAPP_DIAGNOSTICO.md antes de qualquer coisa.

ESTADO
- A revisão completa do WhatsApp (conexão, QR, contatos, mensagens programadas e o
  QR recusado pelo celular) está em codex/living-companion e claude/dreamy-allen-4mtm7j,
  versão 0.47.1. Testes: 644 unitários; 15 E2E de interface no Windows real passaram,
  incluindo test/e2e/whatsapp.windows.mjs (WhatsApp simulado).
- O pipeline integral do Windows (jojo-windows.yml) costuma parar no ensaio de
  conversa real com o modelo local: o modelo varia (ora acrescenta uma frase de
  desdém recusada pela guarda de src/core/dialogue/coherence.js, ora não cita o
  assunto, ora demora). Isso é fora do WhatsApp: só pode ser alterado conforme a
  decisão da usuária marcada abaixo; nada além disso na conversa.
- Quando a conversa passa, o CI espera em até 5 minutos a revisão das 44 falas em
  codex/ci-evidence-<run>-<tentativa>/jojo-companion/docs/evidencias/semantic-review.json
  (formato e exemplos nas branches codex/ci-evidence-43235150092-1 e -43223128036-1).

- 13/11: a 0.47.1 NÃO foi publicada. O run 43471126958 reprovou 5 vezes só no ensaio
  de conversa. Em quase todas as falhas o modelo acertou ("Você disse que sua cor
  preferida é verde", "Sua fruta preferida é manga", "You mentioned a cat") mas
  acrescentou "Não precisa perguntar de novo" / "It's a simple question", e a guarda
  de desdém (coherence.js:143, commit 8abfe20) descartou a resposta inteira.

MINHA DECISÃO SOBRE A CONVERSA (marque uma)
[ ] A) Pode ajustar a guarda: em vez de descartar a resposta inteira, tirar só a frase
       de desdém e manter o resto (mesmo jeito usado antes para "Você tem certeza").
       Assim a resposta certa chega sem a provocação. Mexe só nessa guarda, com teste.
[ ] B) Não mexer na conversa: só reexecutar o pipeline até o modelo responder sem a
       frase (já foram 5 tentativas sem sucesso; pode levar muitas mais).
[ ] C) Pode deixar a frase de desdém passar (remover essa parte da guarda).

- 14/11: também entram na 0.47.1 o painel ao lado do JoJo sem corte e as seções
  "Lista de Tarefas" e "Bloqueio do Discord" ocultas nas Configurações (valores mantidos).

- 14/11: a 0.47.1 também traz a progressão ×10: 200 títulos próprios, 238 bônus de XP
  e números ×10 com o mesmo ritmo (o XP já ganho foi convertido).

O QUE EU (USUÁRIA) JÁ FIZ OU VOU FAZER
[ ] Instalei a 0.47.1 (ou mais nova) no PC e li o QR com o celular.
    Resultado: ____________________ (ex.: "Conectado com meu nome e número" ou o
    texto exato do erro no celular + foto).
[ ] Conferi o painel ao lado do JoJo (inteiro, sem corte) e que Configurações não
    mostra mais "Lista de Tarefas" nem "Bloqueio do Discord".
    Resultado: ____________________
[ ] Conferi que meu nível continuou o mesmo, agora com título próprio e XP ×10, e que
    os bônus aparecem sem virar enxurrada (no máximo 6 por dia).
    Resultado: ____________________
[ ] Mandei uma mensagem agendada de teste para mim mesma ou para alguém de confiança.
    Resultado: ____________________

O QUE VOCÊ (SESSÃO) DEVE FAZER
0. Aplicar a minha decisão sobre a conversa (A, B ou C acima), com teste, sem mexer
   em mais nada da conversa; rodar a suíte inteira e comparar com a anterior.
1. Se a 0.47.1 ainda não estiver publicada em oaovito/jojo-companion-releases:
   disparar jojo-windows.yml em codex/living-companion (workflow_dispatch), vigiar a
   branch de evidência e revisar as 44 falas dentro de 5 minutos; reexecutar só os
   jobs com falha quando a conversa reprovar por variação do modelo. Não alterar a
   conversa além do item 0, não desativar testes, não mover tags nem editar releases existentes.
   Publicação só pelo passo oficial do mesmo run.
2. Se eu informei que o QR conectou: registrar no HANDOFF e encerrar o assunto.
3. Se eu informei erro ao ler o QR: comparar o texto do erro com
   docs/WHATSAPP_DIAGNOSTICO.md (adendo de 13/11), reproduzir a conexão real até o QR
   (sem vincular conta) e verificar se o Baileys publicou versão nova que trate
   companion_reg_refresh (issues #2737 e #2679); corrigir só dentro do WhatsApp, com
   testes, e repetir o fluxo de publicação.
4. Nunca enviar mensagens de verdade nos testes; nunca pedir senha ou login.
```
- 18/11: a 0.47.1 foi publicada sem o WhatsApp. A revisão do WhatsApp sai como 0.47.2:
  subir a versão, criar a seção 0.47.2 no CHANGELOG e ajustar `pendingVersion` na política.
