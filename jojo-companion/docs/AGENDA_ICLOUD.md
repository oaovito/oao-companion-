# Agenda iCloud — candidata 0.45.0

Conexão CalDAV autenticada implementada em `src/core/caldav.js`, com descoberta do
principal, home, lista de calendários e REPORT por intervalo. Somente PROPFIND e
REPORT são permitidos; nenhum PUT/DELETE/POST é enviado. Hosts HTTPS são restritos
a `caldav.icloud.com` e `pNN-caldav.icloud.com`, inclusive nos redirecionamentos.
XML tem parser com namespaces, limite de tamanho/profundidade e rejeição de DTD.
Falhas de autenticação/rede/resposta não viram consulta válida vazia.

Configurações → Agenda iCloud oferece ID Apple, campo de senha específica de
aplicativo, conectar, selecionar calendários, sincronizar e desconectar. Não enviar
credenciais pelo chat. `safeStorage` no Windows protege o arquivo de credenciais
com DPAPI; se a cifra não estiver disponível, a gravação é recusada. Configurações
normais, respostas IPC de status e logs não contêm a senha.

O timer original de 10 minutos e a retomada da suspensão foram reaproveitados;
sync concorrente de chat, UI e timer é reunido em um pedido. A última consulta
válida fica registrada sem avançar em erro. Um resultado antigo não reconecta a
conta depois de uma desconexão. Feeds públicos Google/iCloud continuam compatíveis.
Reiniciar preserva conexão/calendários/última sincronização; uma nova consulta é
necessária para recuperar os eventos, sem fingir que o cache está atualizado.

iCalendar usa `ical.js` para recorrências, EXDATE/RDATE e exceções canceladas ou
transferidas. TZID IANA sem VTIMEZONE usa a base Intl; VTIMEZONE fornecido é
respeitado. A consulta não termina silenciosamente após 2.000 ocorrências. Limites
de segurança falham explicitamente em vez de declarar calendário vazio.

Testes locais cobrem protocolo com servidor simulado, namespaces, leitura sem
escrita, destinos, falhas, coalescência, DPAPI simulado, fusos/DST/recorrências e
exceções. Um cenário Windows separado exige `safeStorage` real. Isto **não** comprova
autenticação com conta Apple real.

## Dependência externa restante

O ambiente não possui conta iCloud autorizada nem credenciais vinculadas. O ensaio
real `scripts/check-icloud-live.mjs` retorna BLOQUEADO (código 2) nessa situação;
não retorna sucesso por omissão. Precisa de `JOJO_ICLOUD_USER` e
`JOJO_ICLOUD_APP_PASSWORD` por injeção segura autorizada. Não criar conta, pedir
senha no chat, utilizar credencial de terceiros ou alegar que uma fixture é iCloud.
Essa evidência permanece necessária antes da publicação que inclua a integração.
