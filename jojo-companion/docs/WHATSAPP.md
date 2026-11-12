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

## Como usar

- **Conectar**: `/whatsapp` (ou Central → "Mensagens no WhatsApp") abre a janela;
  "Conectar" mostra o QR code; no celular, Aparelhos conectados → Conectar um aparelho.
- **Agendar pela conversa**: "manda 'bom dia' pra minha mãe amanhã às 8h" ou
  `/agendar Mãe | amanhã às 8h | bom dia`. Repetição: "todo dia", "toda segunda",
  "de segunda a sexta", "toda segunda, quarta e sexta".
  O JoJo mostra o que entendeu e pergunta: "sim" (exatamente como ela escreveu),
  "reescreve" (ele reescreve e mostra para aprovar: "sim", "original" ou "não"),
  "reescreve com seu jeito" (com a personalidade dele) ou "não".
  Vários contatos parecidos: lista numerada para escolher. Nenhum: pede o número.
- **Listar e apagar**: `/agendados` e `/cancelar 2`. Editar e apagar também pela janela.

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
`agendamentos.json` e `contatos.json` (só nomes e números). Desconectar apaga
a sessão e os contatos; as mensagens programadas ficam, mas não saem até conectar
de novo. Nada é enviado para outro lugar além do próprio WhatsApp.

## Testes

`test/unit/whatsapp.test.js` usa um WhatsApp simulado (nenhum teste conecta ou
envia de verdade). Verificado à mão: o processo isolado gera o QR code dentro do
Electron, também de dentro de um `app.asar`. Não verificado: conexão com uma
conta real, envio real e o app instalado.
