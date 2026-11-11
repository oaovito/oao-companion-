# Bloqueio do Discord

Chave opcional, **desligada por padrão**, em Configurações → Bloqueio do Discord.
A tela mostra o que ela faz antes da chave e pede confirmação ao ligar.
Atualizações e "restaurar padrões" nunca ligam a chave. Com ela desligada não há
detecção nem ação: sem conferência de processos, sem leitura do registro, sem canal
para a extensão e sem ponte registrada no navegador.

O fechamento do Discord ao iniciar Trabalho/Foco (`discordCloseOnFocus`,
`docs/CENAS_E_FOCO.md`) é outro recurso e continua igual.

## O que acontece com a chave ligada

1. **Detecção** (a cada 15 s): processo `Discord.exe`, `DiscordPTB.exe` ou
   `DiscordCanary.exe` aberto, ou uma dessas edições instalada (chave de
   desinstalação que o próprio Discord registra no Windows). No navegador, a
   extensão avisa quando há aba do Discord.
2. **Bronca**: balão e animação `broncaDiscord`. O texto é escrito pelo modelo
   local e validado (curto, cita o Discord, sem ofensa, diferente da anterior);
   se o modelo não responder em 4 s ou sair do personagem, entra uma fala de
   `discordBronca`/`discordBroncaAba` em `assets/dialogue/pt-BR.json`.
3. **Ação**: pede o fechamento normal do Discord, encerra o processo se ele não
   fechar e roda o desinstalador oficial registrado (`...\Discord\Update.exe --uninstall`).
   No navegador, a extensão fecha só as abas do Discord pela API de abas.
4. **Confirmação**: segunda fala (`discordRemovido`, `discordEncerrado`,
   `discordAbaFechada`) com a animação `discordResolvido`, depois de conferir de
   novo o registro do Windows.
5. **Histórico**: cada ação fica em `discord-historico.json` (pasta de dados),
   com data, hora, o que foi visto e o que foi feito. Aparece nas Configurações e
   em `/discord`. Guarda no máximo 200 registros; nunca guarda endereço ou título.

Sem som em nenhuma etapa. Movimento reduzido: as duas animações usam a
intensidade suave e o quadro estático (`estatico`). Modo Trabalho, tela cheia,
modo silencioso e pausa: ele age calado (sem balão nem animação); as falas ficam
na conversa.

## Limites

- Só o desinstalador oficial é executado. O comando lido do registro precisa ser
  exatamente `Update.exe --uninstall` dentro da pasta `Discord`, `DiscordPTB` ou
  `DiscordCanary`; qualquer outro formato é recusado e vira falha registrada.
- Nenhuma pasta é apagada pelo JoJo. Dados de conta (`%APPDATA%\discord`), outros
  programas e arquivos da usuária não são tocados.
- Instalação para todos os usuários: o pedido de administrador é o do Windows
  (UAC), visível. Recusado: o processo é encerrado, o erro vai para o histórico
  e ele avisa.
- Desinstalação falhou: processo encerrado, erro registrado, aviso na voz dele
  (`discordFalha`), nova tentativa só depois de 30 min. Se ela reabrir o Discord
  antes disso, o processo é encerrado de novo.
- Sem leitura confiável dos processos (detector indisponível), nada é feito.

## Extensão do navegador

Arquivos em `assets/extensao-discord/` (Manifest V3). Ao ligar a chave, o JoJo
copia a extensão e a ponte para `discord-ponte/` na pasta de dados e registra a
ponte (`com.jojo.companion.discord`) no registro do próprio usuário para Chrome,
Edge e Brave. Ao desligar, o registro é removido. A instalação da extensão é
manual, uma vez por navegador: página de extensões → "Modo do desenvolvedor" →
"Carregar sem compactação" → pasta aberta pelo botão das Configurações.

- Permissões: `nativeMessaging`, `alarms` e acesso de site **só** a
  `discord.com`, `discordapp.com` e subdomínios. Sem histórico, sem leitura de
  páginas, sem script injetado.
- Do navegador para o JoJo saem apenas a quantidade de abas e o nome do
  navegador, por um canal local (named pipe) deste usuário. Nada vai para a internet.
- JoJo fechado ou chave desligada: a ponte responde "desligado" e a extensão não
  fecha nada.

## Por sistema e navegador

| Onde | Situação |
|---|---|
| Windows 11, app Discord / PTB / Canary | Detecta processo e instalação; encerra e desinstala |
| Chrome, Edge, Brave (Windows) | Fecha só a aba do Discord, com a extensão instalada à mão |
| Firefox, Opera, Vivaldi, Arc | Não atendidos: a aba não é detectada nem fechada |
| Discord como aplicativo instalado pelo navegador (PWA) | Tratado como aba do navegador que o instalou, se a extensão estiver nele |
| macOS, Linux | O JoJo Companion é só para Windows |

## Testes

`test/unit/discord-deteccao.test.js`, `discord-reacao.test.js` e
`discord-config.test.js` usam processos, registro, navegador e abas simulados.
Nenhum teste encerra processo real nem executa desinstalador; com `JOJO_TEST=1`
o app também não executa. Não validado ainda: Discord real instalado e os três
navegadores reais.
