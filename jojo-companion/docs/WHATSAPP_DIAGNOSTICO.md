# WhatsApp — diagnóstico de 12/11/2026

Revisão pedida pela usuária: não dava para saber se o JoJo estava conectado,
aparecia "erro de conexão" sem explicação, contatos se confundiam pelo nome e
faltava uma tela própria para o QR code e para os contatos.

## Etapa 1 — o que foi feito antes

Commits `e4ece4d` (feat: mensagens programadas no WhatsApp), `ca6b5a6`
(docs, CI com 616 testes) e `e3519ce` (preparação da 0.47.0), na branch
`codex/living-companion`. Arquivos: `src/core/whatsapp.js` (datas, agenda e
relógio), `src/main/whatsapp-service.js` (processo principal, agenda, contatos e
envio), `src/main/whatsapp-worker.mjs` (processo isolado com Baileys),
`src/main/whatsapp-window.js`, `src/preload/whatsapp-preload.cjs`,
`src/renderer/whatsapp/*`, falas `wa_*` em `assets/dialogue/pt-BR.json`, etapa
`whatsapp` do tutorial e `test/unit/whatsapp.test.js` (14 testes).

| Pedido | Situação encontrada |
|---|---|
| Conectar por QR como aparelho conectado | Funciona, mas o estado não fica claro (ver abaixo) |
| Sessão salva só no PC; desconectar apaga | Funciona |
| Agendar pela conversa e pela janela (uma vez, diária, semanal, dias) | Funciona |
| Aviso 5 min antes, envio na hora, 3 tentativas, atrasadas só perguntam | Funciona na lógica; motivo das falhas pouco claro |
| Nome e número da conta conectada | **Incompleto**: só o número cru, sem nome |
| Lista de contatos | **Quebrado**: só nome, sem número; homônimos indistinguíveis |
| QR code | **Incompleto**: pequeno, sem contagem, sem renovação visível |
| Mensagens de erro | **Quebrado**: motivos trocados e frases genéricas |

## Etapa 2 — linha de base

`npm test` antes de qualquer alteração: **620 testes, 619 aprovados, 1 pulado
(ponte de navegador simulada, só Windows), 0 falhas**; `npm run lint` ok.
Lista nominal guardada para comparação no fim.

Funções fora do WhatsApp que precisam continuar iguais (conferidas pela suíte
unitária e pelos E2E Windows do CI): overlay click-through, desvio do cursor,
tela cheia, modo de interação, Central e conversa única, motor local e
programado, lembretes, Modo Trabalho, foco, tarefas, agenda por link, clima,
pesquisa, guarda-roupa, coleção, cuidados, Darkest Dungeon, Steam, Discord,
tutorial, atualização, autostart, bandeja e silêncio absoluto.

## Biblioteca

`@whiskeysockets/baileys` **7.0.0-rc14**, a última publicada no npm (tag
`latest`), versão fixa. Configuração: navegador `Windows / JoJo Companion`,
sem ficar online, sem histórico completo. A versão do WhatsApp Web vem embutida
(`2.3000.1043857760`) e nunca é atualizada; quando o WhatsApp exige uma versão
mais nova ele recusa a conexão com código 405, e o app não tinha como sair disso.

## Reprodução real (servidor do WhatsApp, sem vincular nada)

O worker foi executado com a mesma configuração, só até o QR code:

```
0.0s connecting
0.9s QR 1          (vale 60 s)
60.9s QR 2         (cada novo vale 20 s)
...
141.0s QR 6
161.3s close  "QR refs attempts ended"  status=408
(repetido com ganchos de exceção: nenhuma exceção não tratada; o processo continua vivo)
```

## Causa do "erro de conexão"

O worker decide o motivo de cada queda lendo o **texto** do erro com
expressões regulares e ignora o **código** que o WhatsApp manda
(`src/main/whatsapp-worker.mjs`, função `erroDe`, linhas 17–22, usada na linha 83):

1. **QR code não lido a tempo** (`408 "QR refs attempts ended"`): nenhuma
   expressão casa, vira `falha_envio`. A janela mostra
   "Reconectando… · o WhatsApp recusou" e o worker gera um QR novo a cada
   ~3 minutos para sempre, mesmo com a janela fechada (linha 82–84).
2. **Logo depois de escanear** o WhatsApp exige reiniciar a conexão
   (`515 "Stream Errored (restart required)"`, comportamento normal). Também
   vira `falha_envio`: a usuária escaneia e vê "o WhatsApp recusou" — parece erro.
3. **Conexão substituída** (440), **sessão estragada** (500), **conta
   recusada** (403), **serviço fora** (503) e **versão antiga** (405) caem no
   mesmo balaio (`falha_envio` ou "Connection Failure" → `sessao_desconectada`),
   com reconexão infinita e a frase "o WhatsApp está desconectado".
4. **Travamento**: se `conectar()` falha numa reconexão, o worker manda
   `erro` e para de tentar, mas guarda o socket antigo; o botão "Conectar" manda
   `start`, que é ignorado porque `sock` não é nulo (linha 126). Fica
   "Sem conexão" até fechar o app.
5. **Sem registro**: o worker roda com `stdio: 'ignore'` e não manda nenhum
   log; a queda do processo vira "Sem conexão · o WhatsApp está desconectado"
   (`whatsapp-service.js`, linha 76) sem motivo em lugar nenhum.

6. **Envio confirmado que vira falha** (achado ao testar o worker com o
   Baileys simulado): o resultado de um envio bem-sucedido traz o `id` da
   mensagem do WhatsApp, e `post({ type: 'result', id: msg.id, ...resultado })`
   (linhas 97 e 127) troca o `id` do pedido por ele. O serviço nunca reconhece a
   resposta, espera 30 s, registra "sem internet" e tenta de novo: a mesma
   mensagem pode chegar **até três vezes** ao contato.

O rótulo do estado `erro` na janela é "Sem conexão"
(`src/renderer/whatsapp/whatsapp.js`, linha 9) e o motivo exibido vem da
tabela `MOTIVOS`, pensada para falhas de envio, não de conexão.

## Por que o estado da conexão não fica claro

- Seis estados internos (`desligado`, `conectando`, `qr`, `conectado`,
  `reconectando`, `erro`) aparecem crus num chip pequeno, com motivos de envio.
- "Conectado" mostra só o número sem formatação; o nome da conta não é lido.
- Depois de escanear não há passo "Lido, conectando"; o QR some e aparece
  "Reconectando… · o WhatsApp recusou" (causa 2).
- A sessão (`<userData>/whatsapp/sessao/creds.json`) é restaurada ao abrir o
  app, mas a reconexão automática não aparece de forma compreensível.

## Por que os nomes dos contatos confundem

`guardarContato` (worker, linhas 24–30):

- Guarda **um único nome** por contato, `name || notify || verifiedName`. Cada
  evento parcial **sobrescreve** o anterior: o nome do perfil (pushname) que
  chega depois apaga o nome salvo na agenda ("Mãe" vira "Maria 🌸").
- Contatos que o WhatsApp manda só com identificador `@lid` (Baileys 7) e sem
  número são **descartados**, e os mapeamentos LID → número
  (`lid-mapping.update`) são ignorados.
- Contato sem nome é descartado em vez de aparecer pelo número.
- A janela usa um `<datalist>` só com o nome: dois "Ana" ficam iguais e
  `destinoDoCampo` (renderer, linha 104) escolhe **o primeiro**, podendo
  agendar para a pessoa errada.
- Grupos aparecem misturados, só com o sufixo "(grupo)".
- Nenhum número na lista nem na confirmação da conversa; nenhuma foto.

## Plano de correção, por prioridade

1. Worker classifica cada queda pelo **código** (tabela pura e testada), não
   reconecta em laço quando não deve, atualiza a versão do WhatsApp Web,
   confirma a conta com uma consulta real ao servidor e manda nome + número.
2. Estado único com cinco estados visíveis — Desconectado, Aguardando QR code,
   Conectando (inclui "reconectando"), Conectado, Erro — cada erro com uma
   frase (o que houve + o que fazer) e um botão para a ação certa.
3. Tela do QR dedicada: código grande, passos numerados, contagem até expirar,
   renovação automática com aviso, "Lido, conectando" e confirmação de sucesso.
4. Contatos: nome da agenda > nome do perfil > número formatado; número sempre
   abaixo; foto (sob demanda, em cache local) ou iniciais; grupos separados;
   busca por nome ou número; confirmação com nome, número e foto.
5. Serviços: conferir conexão antes de agendar ou enviar e levar à tela de
   conexão; status visível de cada programada; motivo da falha e "Tentar de
   novo"; tutorial e ajuda atualizados.
6. Registro de diagnóstico sem dados pessoais e testes com WhatsApp simulado.

## Adendo de 13/11/2026 — celular recusa ao ler o QR

Relato com foto: ao ler o QR do JoJo (versão 0.47.0) o celular mostra "Verifique sua
conexão e tente novamente" e não conecta. Duas causas, ambas dentro do WhatsApp:

1. **Identidade fora do padrão.** O worker usava `Browsers.windows('JoJo Companion')`.
   No Baileys 7 o QR leva o tipo de cliente: com um nome próprio vira `9` ("outro
   cliente web"), enquanto o registro do aparelho declara Chrome. QR real conferido:
   terminava em `,9`. Agora `Browsers.windows('Chrome')`: o QR termina em `,1`,
   coerente com o registro (o celular lista "Chrome (Windows)").
2. **Segredo do QR aposentado.** Depois da leitura o servidor pode mandar
   `companion_reg_refresh`; o Baileys 7.0.0-rc14 ignora o aviso e nem consegue
   respondê-lo antes do pareamento, então o celular lê um código com segredo vencido
   (Baileys issues #2737 e #2679; correção ainda não publicada no npm). O worker
   agora troca o segredo, salva, responde o aviso e redesenha o mesmo código; as
   renovações do Baileys passam a usar sempre o segredo atual.

A versão desatualizada do WhatsApp Web (outra causa conhecida do mesmo sintoma) já
estava corrigida: o worker busca a versão atual antes de conectar.
