# Mensagens programadas no WhatsApp

O JoJo envia, no horário marcado, mensagens que a Emanuele agendou, a partir do
WhatsApp dela. Nada sai sem ela ter agendado e confirmado.

## Integração escolhida

**Baileys** (`@whiskeysockets/baileys`, versão fixa 7.0.0-rc14), num processo
isolado (`src/main/whatsapp-worker.mjs`, `utilityProcess`). Conecta como
"aparelho conectado" pelo QR code, sem navegador embutido; JavaScript com
WebAssembly embutido, funciona de dentro do `app.asar`.

Alternativas descartadas:
- **whatsapp-web.js**: abre um Chrome inteiro escondido (Puppeteer), uns 170 MB a
  mais e mais memória, com o mesmo risco de bloqueio.
- **Link wa.me**: oficial e sem risco, mas não envia sozinho (ela teria de tocar
  em enviar), então não cumpre o envio no horário.

### Riscos e limites

- Biblioteca **não oficial**; o uso vai contra os termos do WhatsApp e **pode
  levar ao bloqueio do número**. A janela avisa isso antes de conectar.
- Versão "release candidate": mudanças do WhatsApp podem quebrar o envio até a
  biblioteca ser atualizada.
- Nomes de contatos chegam pela sincronização do WhatsApp e podem demorar na
  primeira conexão; número com DDD sempre funciona.

O que reduz o risco: só envia o que ela agendou; intervalo mínimo de 15 s entre
envios; no máximo 40 por dia; nada em massa; não fica "online" ao conectar; não
lê, não guarda e não repassa conversas.

## Conexão

Estado único, sempre visível no topo da janela (`src/core/whatsapp-conexao.js`):

| Estado | Quando | O que a tela mostra |
|---|---|---|
| Desconectado | Sem sessão, QR expirado sem leitura, desconectado pelo celular | Frase do motivo e "Conectar WhatsApp" / "Gerar novo QR code" / "Escanear de novo" |
| Aguardando QR code | QR na tela | Código grande, 4 passos, contagem (60 s, depois 20 s por renovação), aviso de código novo |
| Conectando | Abrindo, QR lido, ou reconectando depois de uma queda | Frase do motivo, próxima tentativa e "Tentar agora" |
| Conectado | Só depois de uma consulta respondida pelo servidor com a conta aberta | Nome e número da conta, hora da confirmação, "Desconectar este PC" |
| Erro | Precisa de uma ação dela | O que aconteceu e o que fazer, em uma frase, com o botão certo |

Cada queda é decidida pelo **código** que o WhatsApp manda (`classificarFechamento`):

| Código | Motivo | O que acontece |
|---|---|---|
| 515 | QR lido, reinício obrigatório | Reabre na hora, sem erro na tela |
| 401 | Desconectado pelo celular | Apaga a sessão; "Escanear de novo" |
| 500, 411 | Sessão salva inválida | Apaga a sessão; "Escanear de novo" |
| 440 | Conexão aberta em outro lugar | Para; "Conectar aqui" |
| 403 | Conta recusada | Para; "Tentar de novo" |
| 405 | Versão antiga | Busca a versão atual do WhatsApp Web e tenta uma vez |
| 408 "QR refs" | QR não lido (~3 min) | Com a janela aberta renova até 3 ciclos; depois "Gerar novo QR code" |
| rede, 408, 428, 503 | Sem internet, queda, serviço fora | Tenta sozinho: 3 s, 6 s, 12 s… até 60 s |

A sessão fica em `<userData>/whatsapp/sessao` e é restaurada ao abrir o JoJo. Se o
processo isolado cair, ele volta sozinho até duas vezes antes de pedir ação. O
registro do app guarda só estado, motivo e código (nunca nomes ou números).

## Contatos

Nome pela prioridade: nome salvo na agenda do celular > nome do perfil > número
formatado (`src/core/whatsapp-contatos.js`). Um evento parcial nunca apaga o nome
salvo; contatos que chegam só com LID ganham o número pelo mapeamento do WhatsApp; a
própria conta não aparece. Na tela: nome em destaque, número logo abaixo, "No perfil:"
quando é diferente, selo "mesmo nome" para homônimos, Pessoas e Grupos separados e
busca por nome ou número. Fotos de perfil só dos contatos que aparecem na tela, uma de
cada vez, guardadas por 7 dias em `<userData>/whatsapp/fotos`; sem foto, iniciais.

## Como usar

- **Conectar**: `/whatsapp` (ou Central → "Mensagens no WhatsApp") abre a janela;
  "Conectar WhatsApp" mostra o QR code; no celular, Aparelhos conectados → Conectar um aparelho.
- **Agendar pela janela**: Nova mensagem → Escolher contato (ou número com DDD) →
  texto, dia, hora e repetição → tela de confirmação com foto, nome, número, texto e
  quando → "Confirmar e agendar". Sem conexão, a janela leva à tela de conexão.
- **Agendar pela conversa**: "manda 'bom dia' pra minha mãe amanhã às 8h" ou
  `/agendar Mãe | amanhã às 8h | bom dia`. Repetição: "todo dia", "toda segunda",
  "de segunda a sexta", "toda segunda, quarta e sexta".
  O JoJo mostra o que entendeu, com o número do contato, e pergunta: "sim" (exatamente
  como ela escreveu), "reescreve" (ele reescreve e mostra para aprovar: "sim",
  "original" ou "não"), "reescreve com seu jeito" ou "não". Nomes iguais aparecem com
  o número na escolha. Sem WhatsApp conectado ele não agenda: abre a tela de conexão e
  continua o pedido sozinho quando conectar (ou quando ela disser "pronto").
- **Listar e apagar**: `/agendados` e `/cancelar 2`. Na janela, cada mensagem mostra
  contato, texto, quando e status (Agendada, Tentando de novo, Atrasada, Falhou,
  Enviada); falha mostra o motivo e "Tentar de novo" (ou "Editar" para número sem WhatsApp).

## No horário

| Momento | O que acontece |
|---|---|
| 5 min antes | Aviso no balão e na conversa; "cancela" segura este envio |
| Na hora | Envio; confirmação no balão |
| Falha | Motivo no balão; nova tentativa em 1 min, até 3 vezes |
| Número sem WhatsApp, limite diário | Sem nova tentativa; motivo registrado |
| App fechado ou PC desligado na hora | Ao voltar, o JoJo lista as atrasadas e pergunta "manda" ou "descarta". Nunca envia sozinho |

Modo Trabalho e tela cheia: o envio acontece; as falas ficam só na conversa,
sem balão. Sem som em nenhuma etapa.

## Dados

Tudo em `<userData>/whatsapp/`: `sessao/` (credenciais do aparelho conectado),
`agendamentos.json`, `contatos.json` (só nomes e números) e `fotos/` (miniaturas de
perfil). Desconectar apaga a sessão, os contatos e as fotos; as mensagens programadas ficam, mas não saem até conectar
de novo. Nada é enviado para outro lugar além do próprio WhatsApp.

## Testes

Tudo com WhatsApp simulado; nenhum teste conecta, envia ou abre sessão de verdade:
`test/unit/whatsapp.test.js` (agenda e conversa), `whatsapp-conexao.test.js` (cada
código de queda, estados visíveis, o processo isolado real com o Baileys simulado de
`fake-baileys.mjs`, sessão restaurada, reconexão, QR), `whatsapp-contatos.test.js`
(prioridade do nome, homônimos, grupos, busca, fotos), `whatsapp-servicos.test.js`
(conexão antes de agendar, status, falha e "Tentar de novo") e `whatsapp-telas.test.js`
(barra, contagem do QR, estrutura da janela). No Windows, `test/e2e/whatsapp.windows.mjs`
abre a janela no app com um processo do WhatsApp simulado (`JOJO_TEST_WA_WORKER`).

Verificado contra o servidor real (sem vincular conta): a conexão gera o QR e o ciclo
de 6 códigos termina em 408 "QR refs attempts ended". Não verificado: leitura do QR
com um celular real, envio real e o app instalado no PC da Emanuele.
Diagnóstico completo da revisão: `docs/WHATSAPP_DIAGNOSTICO.md`.
