# Agenda por link — Google e iCloud

Diretriz vigente do usuário em 02/11/2026: a agenda só precisa do link, sem login
ou senha. Substitui o experimento de conexão autenticada, ainda não publicado.

Configurações → Agenda: colar o link e clicar Conectar agenda. Também é possível
colar no único chat. iCloud: link do Calendário Público (webcal:// ou HTTPS).
Google: endereço iCal público ou secreto da agenda. Quem possui o link pode ler
os compromissos; o JoJo só faz leitura. Não pede ID Apple, senha ou credenciais Steam.

Somente GET, sem Authorization/cookies. Destinos e redirecionamentos são restritos
aos provedores de calendário existentes, com timeout e limite de 8 MiB.
Não usar um link de página HTML/login em lugar do link iCal.

Sincronização a cada dez minutos, após retomada e manualmente pelo botão ou chat.
Pedidos concorrentes são reunidos. Desconectar/trocar o link invalida respostas
antigas. Falha não vira “agenda vazia” e não avança o último sucesso. O link válido
anterior é preservado se uma tentativa nova falhar. A última sincronização é
persistida no perfil local, mas eventos precisam ser consultados após reiniciar.

Leitura iCalendar com fusos, recorrências e exceções continua em ical.js. Links
salvos da versão 0.44.0 permanecem compatíveis. Nenhum compromisso remoto é alterado.

Sete novos testes de lógica cobrem transporte sem autenticação, destino/redirect,
limites, configuração/persistência, falha e concorrência/desconexão. Cenário Windows
exercita Configurações, HTTP local real, reinício, erro, vazia e desconexão. Fixtures
são agendas sintéticas, não representam acesso à agenda pessoal de alguém.
Não há gate de conta externa; todos os gates Windows da aplicação permanecem.

## Entrega verificada

Publicada na 0.45.0. Diagnóstico 41383073847 aprovou os 11 cenários novos e o
pipeline integral 41383430244 aprovou 411 unitários/40 E2E, incluindo este fluxo.
Sem conta Apple ou credenciais de usuário. Detalhes em VALIDACAO_0.45.0.md.
