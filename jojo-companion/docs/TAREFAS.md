# Lista de Tarefas — candidata 0.45.0

Implementação em `codex/living-companion`. Ainda não distribuída. A 0.44.0 continua
sendo a versão pública. Os resultados Windows serão registrados após o Actions.

## Uso

Na Central, abrir **Lista de Tarefas**. Criar/editar pelo título ou por `⋯`;
concluir pela caixa, arrastar linhas em ordenação manual, filtrar por categoria,
estado, texto ou data. Tarefas concluídas continuam acessíveis. O diálogo de edição
oferece prioridade, descrição, categoria, recorrência, dias, prazo, horário, lembrete,
XP opcional e arquivamento. Categorias têm nome e XP opcional. A lista é paginada
(50 por página); não existe limite de quantidade de tarefas cadastradas.

Configurações → **Lista de Tarefas** controla aparência, painel separado, dimensão,
posição, opacidade Windows, tema, ordenação, conclusões, animações, reset, fuso,
recorrência padrão, lembretes, confirmação, retenção e gamificação. O painel separado
é opcional e começa desligado; o botão fechar desliga sua exibição. Foco, suspensão
e tela cheia o ocultam; acesso manual na Central continua permitido. Não há sons.

## Calendário e dados

Padrão: reset diário 00:00 no fuso local do Windows. `zone` aceita `local` ou nome
IANA, por exemplo `America/Sao_Paulo`. Períodos seguem datas civis, inclusive DST;
o aplicativo não usa um timer de 24 horas. A primeira leitura após ficar desligado
aplica a transição. Sem reset automático, o período fica congelado. Semanal reinicia
no dia da semana da criação ou do prazo; tarefas únicas e sem reinício preservam
a conclusão. Retrocesso do relógio não reabre dias já contabilizados.

`tasks.json` fica no userData existente, com gravação temporária, fsync, rename e
backup anterior `tasks.json.bak`. Uma gravação que falha não confirma a alteração.
O backup é tentado quando o principal está inválido. Dados permanecem nas atualizações.
Exportação/importação JSON usa o diálogo nativo, sem acesso arbitrário a caminhos
pelo renderer. Importar mescla por IDs, preserva tarefas existentes e não importa
XP/outbox de outra instalação. Conteúdo de tarefas usa textContent, nunca HTML.
Nenhum título/descrição é enviado à rede pela funcionalidade.

## Progressão

5 XP simples, 10 normal, 20 importante; categoria/tarefa pode substituir por 0–50.
Rotina completa: +50, sete dias distintos de rotina: +150 uma vez. Teto: 500 XP/dia
incluindo bônus. IDs/períodos e títulos normalizados impedem remarcação, edição e
recriação no mesmo dia; tarefas únicas também mantêm um registro permanente.
Desligar gamificação não acumula recompensa retroativa. Reset não retira XP.

Outbox em tarefas + registro idempotente na progressão única confirmam o crédito
em dois arquivos sem duplicá-lo após crash. Barra e aviso aparecem na Central e no
painel, com destaque de nível. Foco suprime o aviso espontâneo e a reação do pet.
O histórico visível de XP guarda as últimas 500 recompensas; IDs concedidos continuam
preservados. Histórico de tarefas segue a retenção configurada (7–3650 dias).

## Conversa

Respostas consultam o modelo local de tarefas, antes da IA: adicionar à lista,
colocar diariamente, marcar/desmarcar, excluir por título, consultas de pendências,
concluídas, progresso, amanhã e horário de reset. Exclusão ambígua pede o título;
com confirmação habilitada, “confirmo”/“cancela” vale por dois minutos. Perguntas e
negativas não autorizam mutação. A segurança da conversa tem prioridade.

## Validação

15 testes novos de lógica cobrem CRUD, paginação, reset/fuso/DST, desligamento,
recorrência, XP/limite/deduplicação, recuperação, importação, foco/lembretes,
linguagem natural e preservação do XP anterior. Quatro cenários Electron Windows
foram acrescentados à suíte oficial: interface/arraste/XP, reinício/reset, painel
nativo/foco e chat/IPC/HTML. Estes cenários ainda precisam ser executados no Actions;
não representam teste feito no PC físico da usuária.
