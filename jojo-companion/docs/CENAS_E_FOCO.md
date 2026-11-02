# Cenas, foco e atalhos — candidata 0.45.0

Implementado em `codex/living-companion`; não publicado.

## Cinquenta cenas

`assets/catalog/living-interactions.json` acrescenta 25 memes e 25 profissões,
sem substituir pacotes antigos. Cada conjunto tem fala original, desenho vetorial
próprio no rig, movimentos do personagem e rotação/flutuação do adereço. Anatomia:
corpo de tubarão, nadadeiras e cauda; nenhum membro humano é desenhado.

A Coleção contém os 50 botões. A mesma conversa aceita “encena Médico”, “finge que
é um médico”, “encena Chef” e “mostra o meme aura”. O reconhecimento exige pedido
explícito e completo: perguntas técnicas, sintomas, negativas e emergências não
viram encenação. Profissões são humor, sem substituir explicação técnica ou cuidado.

Memes podem aparecer raramente durante o período permitido, fora de trabalho,
foco, tela cheia, minijogos, conversa pendente, balão ou fuga. Respeitam silêncio,
surpresas, pacotes e movimento reduzido. Intervalo ambiente mínimo de 25 minutos;
memória das 12 cenas recentes e cooldown individual de 20/30 minutos persistem em
`living-interactions.json`, com backup e proteção contra relógio para trás.

## Discord no foco

Trabalho e Foco solicitam `WM_CLOSE` somente aos processos com nome exato
`Discord.exe`, `DiscordPTB.exe` ou `DiscordCanary.exe`. O worker nativo confere
executável, PID e instante de criação antes de agir; não encerra Update.exe,
helpers ou programas de nomes semelhantes. Após a espera, verifica os processos
restantes. Se minimizar para a bandeja, informa que continua aberto.

Encerramento forçado fica DESLIGADO por padrão. A preferência explícita nas
Configurações permite usá-lo após falha do fechamento normal; a interface informa
sobre chamadas/conteúdo não enviado. Sair do foco cancela a operação pendente.
Nenhum dado do Discord é removido e ele não é reaberto ao terminar. O resultado
aparece discretamente na Central/Configurações, sem balão ou som durante o foco.

## Ícones locais discretos

Nenhuma imagem comercial de Discord/League of Legends foi incorporada ao código
ou à distribuição. Quando uma dessas instalações está em execução, o Windows pode
fornecer seu próprio ícone com `app.getFileIcon`. Ele fica somente no perfil local,
sem upload, e pode aparecer em 2,5% dos depósitos do aquário. Sem ícone local, o
easter egg não é fabricado. Não há anúncio nem recompensa extra pelo logotipo.
Isso não constitui alegação de licença para redistribuir marcas/arte de terceiros.
Ícones são transferidos ao overlay apenas quando mudam, fora do estado por quadro.

## Atalho único

NSIS deixa de usar `createDesktopShortcut: always`, preservando a preferência do
instalador em atualizações. O aplicativo verifica as áreas pessoal e pública do
Windows e migra apenas nomes padrão e metadados comprovadamente do JoJo. Mantém
um atalho principal, corrige destino/ícone e remove somente duplicatas comprovadas.
Atalhos personalizados, argumentos próprios, arquivos ilegíveis ou sem propriedade
comprovada são preservados. Sem permissão para remover duplicata, registra bloqueio.

A configuração permite automático, mostrar ou ocultar. A remoção manual não é
revertida em cada inicialização. Estado/versão ficam em `desktop-shortcut.json`.
O atualizador continua no canal público e passa --updated ao NSIS para respeitar
as preferências em atualizações seguintes. Não cria atalhos por conta própria.
O ensaio do instalador verifica três atualizações e preservação dos dados.

## Validação

Testes puros cobrem catálogo, comandos, segurança, variedade/cooldown, persistência,
relógio, fechamento normal/força/cancelamento e migração de atalhos. Novos cenários
Windows usam processos Electron de fixture e arquivos .lnk reais em áreas fictícias;
não operam no computador da usuária. Os 10 cenários novos passaram no Actions 41366600620, commit ea3b09a.
Repetir após as alterações posteriores, junto à
medição/auditoria de TODAS as 1.268 animações, antes de considerar a candidata validada.
