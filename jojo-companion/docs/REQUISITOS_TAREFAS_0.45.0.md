# CODEX — IMPLEMENTAR TO-DO LIST INTELIGENTE NO JOJO COMPANION

## OBJETIVO

Implementar um sistema completo de lista de tarefas no Jojo Companion, desenvolvido especialmente para Emanuele.

A lista deve funcionar como um organizador diário de atividades, totalmente configurável pela própria usuária.

O sistema deve ser simples, bonito, intuitivo, persistente e integrado à personalidade e ao sistema de XP do Jojo.

Realizar toda a implementação autonomamente no repositório de desenvolvimento **oao companion**, preservando todas as funcionalidades existentes.

## 1. LISTA DE TAREFAS

Implementar uma interface na qual Emanuele possa:

- Criar tarefas ilimitadas.
- Editar tarefas existentes.
- Excluir tarefas.
- Marcar tarefas como concluídas.
- Desmarcar tarefas.
- Reorganizar por arrastar e soltar.
- Definir prioridades.
- Criar categorias personalizadas.
- Adicionar descrições.
- Definir horários e prazos opcionais.
- Criar tarefas recorrentes.
- Consultar tarefas pendentes e concluídas.
- Visualizar o progresso diário.

A marcação deve ser imediata, com feedback visual discreto e animação fluida.

Ao concluir uma tarefa, ela deve apresentar um indicador de conclusão, mas não desaparecer permanentemente.

Permitir ocultar ou recolher tarefas concluídas.

## 2. RESET AUTOMÁTICO DIÁRIO

**Comportamento padrão:**

Todos os dias, às 00:00, no horário local de Emanuele:

1. As tarefas recorrentes diariamente voltam ao estado pendente.
2. Todas as conclusões anteriores são registradas no histórico.
3. As tarefas cadastradas permanecem disponíveis.
4. O progresso diário recomeça em 0%.
5. A lista fica pronta para um novo dia.

O reset não pode apagar títulos, descrições, categorias ou configurações.

### Personalização

Emanuele deve poder configurar:

- Horário do reset.
- Fuso horário.
- Reset automático ativado/desativado.
- Frequência individual de cada tarefa.
- Dias específicos da semana.
- Tarefas que nunca resetam.
- Tarefas únicas.
- Arquivamento de tarefas concluídas.
- Retenção do histórico.
- Confirmação opcional para alterações destrutivas.

Exemplos:

- Beber água — diariamente.
- Treinar — segunda a sábado.
- Estudar — segunda, quarta e sexta.
- Limpar a casa — semanalmente.
- Comprar determinado produto — tarefa única.

A recorrência deve respeitar o calendário e não criar tarefas duplicadas.

Se o computador estiver desligado no horário do reset, aplicar corretamente a transição na próxima inicialização.

## 3. CONFIGURAÇÕES COMPLETAS

Criar uma seção chamada **Lista de Tarefas** nas configurações do Jojo.

Emanuele deve ter controle sobre:

### Aparência
- Exibir ou ocultar a lista.
- Escolher tamanho e posição.
- Configurar transparência quando suportada.
- Escolher cores disponíveis no tema.
- Exibir porcentagem de progresso.
- Exibir ou ocultar tarefas concluídas.
- Escolher ordenação.
- Ativar/desativar animações.

### Funcionamento
- Horário de reinício diário.
- Recorrência das tarefas.
- Notificações.
- Lembretes individuais.
- Sons desativados permanentemente, respeitando as regras do Jojo.
- Confirmação de exclusão.
- Histórico de conclusões.
- Ativar/desativar XP por tarefas.
- Quantidade de XP por categoria ou tarefa, dentro dos limites de balanceamento.

Todas as configurações devem produzir efeitos reais e ser salvas automaticamente.

## 4. INTEGRAÇÃO COM XP DO JOJO

Integrar a To-Do List ao sistema de progressão existente.

Valores iniciais sugeridos:

| Ação | XP |
|---|---:|
| Concluir tarefa simples | +5 |
| Concluir tarefa normal | +10 |
| Concluir tarefa importante | +20 |
| Concluir todas as tarefas previstas para o dia | +50 |
| Concluir a rotina por 7 dias distintos | +150 |

A barra de XP deve animar quando houver recompensa.

Implementar proteção contra farm artificial:

- Não permitir ganhar XP repetidamente desmarcando e remarcando a mesma tarefa.
- Não conceder XP adicional por editar ou recriar artificialmente tarefas.
- Impor limites diários configurados pelo sistema.
- Utilizar identificadores persistentes.
- Não retirar XP já concedido por um reset automático.
- Permitir desativar a gamificação.

O usuário deve perceber claramente a progressão sem que a lista se torne inconveniente.

## 5. INTERAÇÃO NATURAL COM JOJO

O Jojo deve compreender perguntas como:

- "Jojo, o que tenho que fazer hoje?"
- "O que ainda falta?"
- "Marca estudar como concluído."
- "Adiciona lavar o cabelo na lista."
- "Tira essa tarefa."
- "Quais tarefas já completei?"
- "Quanto falta para terminar tudo?"
- "Mostra minha lista de amanhã."
- "Coloca academia todos os dias."
- "Muda o reset para as 6 da manhã."

As operações devem utilizar o banco de dados real da To-Do List.

Não inventar tarefas nem responder com dados desatualizados.

Solicitar esclarecimento quando uma edição ou exclusão for ambígua.

## 6. PERSONALIDADE DO JOJO

Criar pelo menos 10 novas falas contextualizadas relacionadas à organização diária.

O Jojo pode:

- Parabenizar Emanuele por concluir atividades.
- Demonstrar impaciência de maneira cômica com tarefas pendentes.
- Comemorar quando a lista estiver completa.
- Incentivar a organização.
- Fazer comentários sarcásticos leves sobre procrastinação.

Evitar comentários repetitivos ou ofensivos.

Não interromper Emanuele constantemente.

No Modo Trabalho/Foco, preservar silêncio, discrição e ausência de notificações espontâneas, sem impedir o acesso manual à lista.

## 7. INTERFACE

A To-Do List deve ser acessível em uma área própria do Jojo Companion, sem comprometer a interface de conversa.

Criar:

- Lista organizada de tarefas.
- Caixas de seleção.
- Botão para adicionar.
- Edição rápida.
- Indicadores de prioridade.
- Barra de progresso diário.
- Contador de tarefas concluídas e pendentes.
- Filtros e categorias.
- Acesso direto às configurações.

Design moderno, sofisticado e consistente com o aplicativo existente.

Não sobrecarregar a tela com botões desnecessários.

## 8. PERSISTÊNCIA E SEGURANÇA

- Salvar tarefas localmente.
- Preservar os dados após reinicialização.
- Preservar os dados após atualizações.
- Não exigir internet.
- Implementar migrações seguras.
- Evitar perda de dados em encerramentos inesperados.
- Manter cópia de segurança ou mecanismo de recuperação apropriado.
- Permitir exportar e importar tarefas em formato estruturado.
- Não enviar informações pessoais para serviços externos sem autorização.

## 9. TESTES OBRIGATÓRIOS

Validar:

1. Criação de tarefas.
2. Edição e exclusão.
3. Marcação e desmarcação.
4. Reordenação.
5. Persistência após reiniciar.
6. Reset à meia-noite.
7. Reset em horário personalizado.
8. Reset após computador desligado.
9. Tarefas recorrentes.
10. Tarefas únicas.
11. Histórico de conclusão.
12. XP concedido corretamente.
13. Proteção contra XP duplicado.
14. Integração com linguagem natural.
15. Configurações persistentes.
16. Compatibilidade com Modo Foco.
17. Ausência de regressões nas outras funcionalidades.

## 10. ENTREGA

Implemente a funcionalidade completa, execute testes e integre ao aplicativo real.

Não criar apenas uma interface demonstrativa.

Não apagar dados existentes.

Não modificar releases antigas.

Preparar a atualização pelo fluxo existente e documentar exclusivamente alterações reais.

Ao finalizar, apresentar relatório com arquivos modificados, funcionalidades implementadas, testes executados, resultados e eventuais pendências.

**RESULTADO ESPERADO:** Emanuele deve conseguir administrar integralmente sua rotina pelo Jojo Companion. Todos os dias, sua lista recorrente deve estar pronta para ser concluída novamente, preservando as tarefas, registrando seu histórico e permitindo evoluir o Jojo com XP.