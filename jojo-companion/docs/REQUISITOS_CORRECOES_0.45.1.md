# CODEX — CORREÇÃO CRÍTICA DO JOJO COMPANION
## Restaurar o personagem original, corrigir tela cheia, animações, Steam e identificação de jogos

### OBJETIVO

Assuma autonomamente a correção dos defeitos identificados no Jojo Companion instalado no computador de Emanuele.

**Repositório privado:** `oaovito/oao-companion-`

**Branch efetiva do aplicativo:** `codex/living-companion`

**Repositório público de distribuição:** `oaovito/jojo-companion-releases`

A branch `main` do repositório privado contém principalmente o controle operacional. Não a utilize como base do código do aplicativo.

A versão 0.45.0 já foi publicada. Não modifique essa release nem suas versões anteriores.

Estas correções são prioritárias sobre novas funcionalidades.

O usuário exige que funcionalidades existentes realmente funcionem, em vez de apenas parecerem implementadas.

---

# 1. RESTAURAR IMEDIATAMENTE A ESTÉTICA ORIGINAL

**ATENÇÃO: O CONCEITO VISUAL DO JOJO FOI MODIFICADO SEM AUTORIZAÇÃO.**

O usuário esclareceu que a aparência anterior possuía **pernas e não a cauda introduzida na versão atual**.

A direção artística recente que exige cauda e proíbe pernas está revogada.

### Ações obrigatórias

1. Investigar o histórico Git e identificar a última versão do modelo original com pernas.
2. Recuperar os recursos gráficos originais.
3. Restaurar proporções, silhueta, anatomia, cores e detalhes desse modelo.
4. Remover a cauda introduzida posteriormente.
5. Restaurar as pernas e respectivas animações originais.
6. Preservar a aparência muscular e a identidade visual anteriores.
7. Não substituir o modelo por outro personagem.
8. Não inventar uma terceira versão estética.
9. Não modificar o conceito artístico por iniciativa própria.
10. Verificar visualmente o resultado antes de integrar.

### Arquivos a investigar

- `assets/character/jojo.rig.json`
- `src/renderer/shared/rig-renderer.js`
- `src/renderer/shared/animator.js`
- `src/core/rig-metrics.js`
- `assets/animations/`
- `assets/catalog/`
- `test/unit/shark-anatomy.test.js`

Investigar também versões anteriores desses arquivos no histórico Git.

### Atenção especial aos testes

O teste atual `shark-anatomy.test.js` exige uma anatomia sem pernas.

Esse teste não representa mais a especificação vigente.

Atualizá-lo para validar o personagem original restaurado.

Não manter testes antigos que obriguem o aplicativo a continuar utilizando um desenho rejeitado pelo usuário.

### Compatibilidade das animações

Restaurar a anatomia sem destruir o catálogo existente.

Adaptar animações novas às pernas e à estrutura original.

Validar:

- Caminhada.
- Movimentação.
- Reações.
- Alimentação.
- Necessidades.
- Animações de memes.
- Profissões.
- Darkest Dungeon.
- Guarda-roupa.
- Animações de XP.

Nenhuma animação deve produzir membros desconectados, deformações, cortes ou posições impossíveis.

O modelo base deve permanecer esteticamente consistente em todas as cenas.

**REGRA PERMANENTE: nenhuma mudança futura de anatomia, silhueta ou estilo do Jojo é autorizada sem solicitação explícita do usuário.**

Registrar essa regra no arquivo de instruções do projeto e atualizar documentos que contenham diretrizes contraditórias, preservando o histórico.

---

# 2. CORRIGIR DEFINITIVAMENTE A DETECÇÃO DE TELA CHEIA

## DEFEITO REPRODUZIDO

Quando Emanuele solicita:

- "Encena Buff de café"
- "Encena Protagonista do prazo"
- "Encena Policial"

O Jojo responde repetidamente:

"Não vou interromper a tela cheia, uma fuga ou outra atividade para fazer essa cena. Peça quando houver espaço."

Isso também acontece após sair da tela cheia, com a janela do Jojo aberta.

Esse comportamento é inaceitável.

### Arquivos prioritários

- `src/main/fullscreen-worker.cjs`
- `src/main/fullscreen-monitor.js`
- `src/main/main.js`
- `src/core/companion.js`
- `src/main/living-service.js`

### Problema técnico a investigar

O detector atual combina geometria da janela ativa com estados globais de `SHQueryUserNotificationState`.

Esses estados precisam ser interpretados corretamente e não podem gerar bloqueios persistentes.

Também é necessário verificar o registro de janelas pertencentes ao Jojo, pois o código observado registra o handle do overlay, mas não todas as demais janelas próprias relevantes.

### Implementar

1. Identificar corretamente a janela em primeiro plano.
2. Diferenciar tela cheia real de maximização comum.
3. Diferenciar jogo em segundo plano de jogo ocupando a tela ativa.
4. Reconhecer todas as janelas pertencentes ao Jojo.
5. Verificar corretamente monitores múltiplos.
6. Respeitar diferentes escalas de DPI.
7. Detectar transições `Alt+Tab`.
8. Detectar minimização e restauração.
9. Detectar saída de jogos.
10. Detectar encerramento de aplicativos em tela cheia.
11. Limpar imediatamente estados antigos de bloqueio.
12. Evitar decisões baseadas em informações desatualizadas.
13. Tratar falhas do detector nativo sem bloquear permanentemente as animações.

### Regra principal

Se Emanuele estiver utilizando a janela do Jojo e não houver uma situação que realmente impeça a animação, **a solicitação explícita deve funcionar**.

Não interpretar um jogo aberto em segundo plano como impedimento automático.

Não interpretar a própria janela do Jojo como aplicativo externo em tela cheia.

Não desativar indiscriminadamente a proteção de tela cheia.

Quando o usuário estiver efetivamente jogando em tela cheia, preservar a regra de não sobrepor o jogo com animações espontâneas.

Quando a condição de bloqueio terminar, recuperar automaticamente o funcionamento normal.

---

# 3. CORRIGIR O SISTEMA DE EXECUÇÃO DE ANIMAÇÕES

## PROBLEMA IDENTIFICADO NO CÓDIGO

O serviço `living-service.js` utiliza várias condições de bloqueio e retorna uma mensagem genérica quando a execução falha.

O usuário não consegue distinguir:

- Tela cheia.
- Modo Trabalho.
- Animação anterior.
- Estado de fuga.
- Cooldown.
- Erro de renderização.
- Falha do catálogo.
- Temporizador inconsistente.

### Correção obrigatória

Refatorar o fluxo de autorização e execução.

Separar claramente:

**Animações espontâneas:** executadas automaticamente quando o contexto permite.

**Animações solicitadas:** executadas diretamente por comando do usuário, respeitando apenas restrições reais de segurança, modo de trabalho e impossibilidade técnica.

Não aplicar indiscriminadamente regras de interrupções espontâneas aos pedidos explícitos.

### Nova estrutura de resultado

A execução deve retornar um estado estruturado, equivalente a:

- `executed`
- `queued`
- `fullscreen_blocked`
- `focus_blocked`
- `animation_busy`
- `cooldown`
- `missing_asset`
- `renderer_error`

O usuário deve receber uma resposta correspondente à causa verdadeira.

Uma falha por cooldown jamais pode ser apresentada como bloqueio de tela cheia.

### Recuperação automática

Quando uma animação solicitada não puder começar imediatamente:

- Executar assim que possível, quando apropriado.
- Evitar perder a solicitação.
- Impedir duplicações.
- Cancelar pedidos obsoletos.
- Priorizar comandos explícitos.
- Não manter filas eternas.
- Informar quando uma ação for definitivamente impossível.

O sistema deve recuperar estados de animação após erros do renderer ou mudança de janela.

### Testes obrigatórios

Executar os três comandos da captura fornecida.

Confirmar visualmente que as três animações realmente acontecem.

Testar com:

- Darkest Dungeon aberto em segundo plano.
- Darkest Dungeon minimizado.
- Darkest Dungeon em primeiro plano.
- Jojo em primeiro plano.
- Troca rápida entre aplicativos.
- Tela cheia encerrada.
- Google Meet com compartilhamento de tela.
- Discord aberto.
- Dois monitores.

---

# 4. CORRIGIR IDENTIFICAÇÃO DA STEAM

Atualmente, a identificação da Steam e dos jogos parece não funcionar corretamente no computador de Emanuele.

Investigar a implementação de detecção de processos e instalações Steam.

### Implementar identificação local confiável

O Jojo deve distinguir:

1. Steam instalada.
2. Steam aberta.
3. Steam fechada.
4. Biblioteca Steam localizada.
5. Jogo instalado.
6. Jogo em execução.
7. Jogo ativo em primeiro plano.
8. Jogo minimizado ou em segundo plano.
9. Jogo encerrado.
10. Estado desconhecido por falha de detecção.

Não confundir esses estados.

### Descoberta das bibliotecas

Inspecionar de forma segura:

- Local de instalação da Steam.
- Configurações pertinentes do Registro do Windows.
- `libraryfolders.vdf`.
- Manifestos `appmanifest_*.acf`.
- Bibliotecas em outras unidades.
- Instalações em diretórios personalizados.

Não exigir que os jogos estejam instalados no disco C:.

Não depender exclusivamente de nomes de janela.

Não depender de títulos localizados dos jogos.

Utilizar identificação de executáveis, caminhos, processos e metadados locais confiáveis.

Não solicitar senha, token ou autenticação da Steam para detectar jogos locais.

### Interface

Adicionar indicadores reais:

**Steam:** instalada / aberta / fechada / indisponível.

**Bibliotecas:** detectadas / não detectadas.

**Jogos:** quantidade realmente identificada, quando houver inventário.

**Última verificação:** horário.

Permitir atualização manual pelo usuário.

Exibir mensagens de diagnóstico úteis quando uma instalação legítima não for identificada.

---

# 5. CORRIGIR DARKEST DUNGEON

## IDENTIFICAÇÃO DO JOGO ORIGINAL

Darkest Dungeon original utiliza o Steam AppID `262060`.

Investigar prioritariamente:

- `src/core/darkest-process.cjs`
- `src/main/fullscreen-worker.cjs`
- `src/main/darkest-service.js`
- `src/core/darkest-dungeon.js`
- `test/e2e/darkest.windows.mjs`

### Problema potencial

A função `verifyDarkestImage` atual exige uma estrutura de diretórios específica para validar `Darkest.exe`.

Avaliar se isso está rejeitando uma instalação legítima da Steam.

Corrigir a identificação utilizando evidências confiáveis da instalação, sem aceitar indiscriminadamente qualquer executável com nome semelhante.

### Requisitos

Quando Darkest Dungeon estiver aberto:

- Reconhecer a execução.
- Identificar se está em primeiro plano.
- Registrar corretamente o tempo ativo.
- Diferenciar jogo ativo de jogo apenas aberto.
- Registrar o início e o fim das sessões.
- Atualizar a interface.
- Conceder XP conforme os marcos existentes.
- Persistir os resultados.
- Impedir XP duplicado.

Quando estiver fechado, o estado deve mudar corretamente.

Quando estiver aberto em segundo plano, não contabilizar automaticamente todo o tempo como jogo ativo.

### Diagnóstico

Exibir de maneira compreensível:

- Jogo encontrado.
- Executável identificado.
- Instalação Steam validada.
- Sessão ativa.
- Tempo ativo registrado.
- XP concedido.
- Causa de eventual falha de detecção.

Não mostrar caminhos pessoais completos ou dados sensíveis em relatórios públicos.

Preservar a sugestão diária entre 06:00 e 21:00, conquistas e progressão já implementadas.

Não conceder XP fictício apenas para os testes passarem.

---

# 6. CORRIGIR IDENTIFICAÇÃO DE OUTROS JOGOS

Além de Darkest Dungeon, revisar o reconhecimento de aplicativos e jogos instalados e executados pela Steam.

Criar uma camada de detecção reutilizável para jogos locais, sem depender de reconhecimento por IA.

O Jojo deve conseguir reconhecer jogos instalados na biblioteca local quando seus metadados estiverem disponíveis.

### Regras

- Não presumir que a Steam esteja aberta porque existe um processo `steamwebhelper.exe`.
- Não confundir launcher com jogo.
- Não inventar jogos instalados.
- Não reportar atividade de um jogo apenas pela existência de seu manifesto.
- Não inferir que o usuário está jogando apenas porque um processo existe.
- Não permitir que o detector de jogos provoque falsos positivos de tela cheia.

Preservar privacidade: sem capturas de tela, keylogging ou coleta de conteúdo pessoal.

---

# 7. RESTAURAÇÃO DE ESTADO E CORREÇÃO DE BUGS PERSISTENTES

Investigar estados que permanecem bloqueados após alterações no ambiente.

Isso inclui:

- Tela cheia.
- Modo Foco.
- Modo Trabalho.
- Fuga do cursor.
- Animação em andamento.
- Movimento.
- Interação manual.
- Renderização.
- Jogo ativo.
- Steam aberta.
- Aplicativos externos.

Criar transições de estado verificáveis.

Nenhum estado transitório deve permanecer indefinidamente sem uma condição real que o justifique.

Implementar recuperação após:

- Alt+Tab.
- Reinicialização do renderer.
- Reinicialização do detector nativo.
- Fechamento inesperado do jogo.
- Troca de monitor.
- Suspensão do Windows.
- Retorno da suspensão.
- Reinicialização do aplicativo.

Evitar tentativas infinitas e loops que consumam CPU.

---

# 8. TESTES REAIS NO WINDOWS

Utilizar a infraestrutura Windows já estabelecida no GitHub Actions.

Não configurar plataformas adicionais nem introduzir serviços pagos.

### Testes obrigatórios

**Tela cheia**
- Detecção correta de fullscreen.
- Saída de fullscreen.
- Janela do Jojo em primeiro plano.
- Jogo em segundo plano.
- Duas telas.
- DPI variável.
- Estados globais do Windows.

**Cenas**
- Execução explícita.
- Bloqueio espontâneo.
- Recuperação após bloqueio.
- Cooldown.
- Fila de execução.
- Falha de animação.
- Resposta contextual correta.

**Steam**
- Biblioteca padrão.
- Biblioteca secundária.
- Diretório personalizado.
- Manifesto válido.
- Manifesto inválido.
- Steam fechada.
- Steam aberta.
- Jogo instalado.
- Jogo em execução.

**Darkest Dungeon**
- Detecção do jogo.
- Tempo ativo.
- Tempo em segundo plano.
- XP.
- Persistência.
- Encerramento.
- Reconhecimento após reinicialização.

**Estética**
- Personagem original com pernas.
- Ausência da cauda rejeitada.
- Integridade do modelo.
- Compatibilidade do guarda-roupa.
- Animações sem cortes.
- Todas as animações existentes preservadas ou corretamente adaptadas.

Realizar também testes end-to-end e avaliação visual real no Windows.

Testes simulados não substituem a validação do aplicativo renderizado.

Se o ambiente não possuir uma instalação real de Steam/Darkest Dungeon, declarar explicitamente essa limitação e não afirmar que a detecção no computador de Emanuele foi comprovada.

---

# 9. NÃO QUEBRAR O QUE JÁ FUNCIONA

Preservar integralmente:

- To-Do List.
- Reset diário de tarefas.
- XP.
- Sistema de fome.
- Saúde e higiene.
- Seis tipos de cocô.
- Alimentação.
- Coleção e jogos.
- Profissões e memes.
- Previsão meteorológica.
- Agenda por link iCal, sem exigir login ou senha.
- Integração de Darkest Dungeon.
- Sistema de atualização.
- Atalho único no desktop.
- Modo Trabalho/Foco.
- Fechamento do Discord no modo previsto.
- Conversa natural.
- Personalidade do Jojo.
- Silêncio absoluto, sem voz ou sons.

Não substituir funcionalidades reais por respostas programadas de demonstração.

Não modificar o MNE_Lab.

---

# 10. PUBLICAÇÃO

Depois de corrigir tudo:

1. Executar testes unitários.
2. Executar integração Windows.
3. Executar testes E2E.
4. Validar visualmente o personagem restaurado.
5. Auditar as animações existentes.
6. Validar regressões de Steam e tela cheia.
7. Verificar instalador e atualizador.
8. Preservar dados e configurações existentes.
9. Preparar uma nova versão conforme o fluxo oficial.
10. Publicar somente se todos os gates obrigatórios estiverem aprovados.

Não alterar a release 0.45.0 nem qualquer release histórica.

Não declarar aprovação de testes que não foram executados.

---

# 11. CRITÉRIOS DE ACEITAÇÃO

O trabalho só estará concluído quando:

- [ ] O Jojo voltar a apresentar sua estética original com pernas, sem a cauda introduzida posteriormente.
- [ ] Nenhum teste ou documento continuar impondo o modelo rejeitado.
- [ ] As animações existentes funcionarem no modelo restaurado.
- [ ] O Jojo identificar corretamente quando há ou não tela cheia.
- [ ] Sair da tela cheia eliminar o bloqueio correspondente.
- [ ] Com o Jojo em primeiro plano, cenas explícitas permitidas funcionarem.
- [ ] Os três comandos demonstrados na imagem executarem animações verdadeiras.
- [ ] As mensagens de erro distinguirem suas causas reais.
- [ ] A Steam ser identificada corretamente quando instalada.
- [ ] Bibliotecas Steam em outros discos serem reconhecidas.
- [ ] Darkest Dungeon original ser detectado corretamente.
- [ ] Tempo ativo e XP funcionarem sem registros fictícios.
- [ ] O monitoramento não aumentar desnecessariamente o consumo de recursos.
- [ ] A aplicação continuar funcionando no Windows 11.
- [ ] As funcionalidades anteriores permanecerem operacionais.

## RELATÓRIO FINAL

Apresentar:

1. Causa raiz comprovada de cada defeito.
2. Versão histórica utilizada para restaurar a arte.
3. Comparação visual antes/depois.
4. Arquivos alterados.
5. Alterações na identificação da Steam.
6. Alterações na detecção de tela cheia.
7. Resultados dos testes reais.
8. Evidências de funcionamento das três cenas.
9. Estado da detecção de Darkest Dungeon.
10. Branch e commits.
11. Status da release.
12. Limitações e pendências efetivas.

**INSTRUÇÃO FINAL**

Não quero outro redesenho do Jojo. Quero o personagem original restaurado.

Não quero que o aplicativo afirme existir uma tela cheia quando ela não existe.

Não quero que a Steam ou os jogos deixem de ser identificados por verificações incorretas.

Não quero que todas as falhas de animação resultem na mesma justificativa genérica.

Corrija a implementação existente, elimine as causas reais dos defeitos e valide os resultados antes de declarar sucesso.

Execute autonomamente todas as etapas tecnicamente possíveis, sem depender de comandos manuais do usuário.
