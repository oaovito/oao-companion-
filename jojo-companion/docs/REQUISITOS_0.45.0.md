> Adendo posterior do usuário — 02/11/2026: “A agenda só deve precisar do link da agenda não log senha de nada”.
> Essa diretriz substitui os requisitos abaixo sobre autenticação CalDAV, ID Apple,
> senha específica e teste com conta autorizada. A agenda deve usar somente o link
> iCal compartilhado (Google/iCloud), sem solicitar credenciais. O texto original
> permanece como histórico; os demais requisitos continuam válidos.

# PROMPT MESTRE PARA CODEX — JOJO COMPANION
## Correções críticas, sistema de sobrevivência, progressão de XP, animações e integração com Windows

Assuma autonomamente o desenvolvimento do Jojo Companion e implemente integralmente as funcionalidades descritas abaixo.

### REPOSITÓRIOS
- **oao companion:** repositório de desenvolvimento.
- **jojo companion releases:** repositório público exclusivamente destinado à distribuição das versões e atualizações automáticas.

Esses repositórios têm responsabilidades distintas. Não confunda o Jojo Companion com o MNE_Lab.

Você deve investigar o código existente, implementar as alterações, executar testes, corrigir regressões e preparar a distribuição sem exigir comandos manuais do usuário.

Não substituir funcionalidades existentes por protótipos, placeholders, respostas simuladas ou interfaces sem implementação.

---

# PRIORIDADE 0 — CORRIGIR A INTELIGÊNCIA E AS INTEGRAÇÕES

## 1. PROBLEMA CRÍTICO: RESPOSTAS INACEITÁVEIS

Atualmente, o Jojo apresenta comportamentos como:

**Pergunta:**
"Como vai estar o tempo hoje em Guarapuava?"

**Resposta inadequada:**
"Não tenho informações específicas sobre a previsão do tempo. A Wikipédia indica que Larissa Manoela é uma atriz brasileira..."

**Pergunta:**
"Qual é minha agenda de hoje?"

**Resposta inadequada:**
"Nada mais hoje. Sem desculpa para não treinar."

**Pergunta:**
"A minha agenda está linkada?"

**Resposta inadequada:**
"Nada mais hoje. Sem desculpa para não treinar."

Essas respostas são absolutamente inaceitáveis.

Investigue e corrija a causa raiz.

O Jojo não pode confundir ferramentas, misturar dados irrelevantes, inventar compromissos ou responder sobre uma integração sem verificar seu funcionamento real.

### Implementar

1. Roteamento robusto de intenções para ferramentas.
2. Validação da relevância dos resultados de pesquisas.
3. Consulta obrigatória de fontes apropriadas quando a pergunta depender de informações externas.
4. Tratamento estruturado de erros.
5. Detecção de respostas desconectadas da pergunta.
6. Gerenciamento de contexto entre mensagens.
7. Respostas específicas sobre o estado real das integrações.
8. Testes automatizados de regressão utilizando as perguntas problemáticas da captura de tela.

**Nunca apresentar uma resposta genérica como se fosse resultado de consulta real.**

## 2. METEOROLOGIA REAL

Integrar o Open-Meteo ou serviço gratuito equivalente.

Implementar:

- Temperatura atual.
- Sensação térmica, quando disponível.
- Precipitação.
- Probabilidade de chuva.
- Umidade.
- Velocidade do vento.
- Previsões diárias.
- Previsões para os próximos dias.
- Identificação de cidades.
- Cidade padrão configurável.
- Respeito aos fusos horários.
- Cache com atualização adequada.
- Tratamento de falhas de conexão.

A cidade explicitamente mencionada pelo usuário sempre deve prevalecer sobre a cidade padrão.

O Jojo deve conseguir responder sobre Guarapuava, Paraná, utilizando dados meteorológicos verdadeiros.

Não usar Wikipédia como fonte meteorológica.

## 3. INTEGRAÇÃO COM ICLOUD CALENDAR

Corrigir ou implementar uma integração funcional utilizando CalDAV e os métodos de autenticação suportados pelo iCloud.

O Jojo deve conseguir:

- Conectar uma conta autorizada.
- Verificar se a conta realmente está conectada.
- Consultar compromissos.
- Informar a agenda de hoje.
- Consultar dias específicos.
- Consultar a semana.
- Identificar o próximo compromisso.
- Interpretar eventos recorrentes.
- Reconhecer calendários diferentes.
- Sincronizar automaticamente.
- Atualizar manualmente.
- Informar erros de autenticação.
- Mostrar a data da última sincronização válida.

Utilizar armazenamento seguro de credenciais no Windows.

### Estados obrigatórios

**CONECTADO:** autenticação válida e consulta disponível.

**DESCONECTADO:** nenhuma conta autorizada.

**ERRO:** conexão ou autenticação falhou.

**SINCRONIZANDO:** consulta em andamento.

**SEM EVENTOS:** consulta real concluída e nenhum compromisso encontrado.

Jamais confundir esses estados.

Se a agenda estiver desconectada, o Jojo deve explicar como conectá-la.

Se estiver conectada e vazia, pode informar que não há eventos.

Se a consulta falhar, deve explicar o erro.

Nunca inventar eventos.

---

# PRIORIDADE 1 — SISTEMA DE FOME, SAÚDE E HUMOR

## 4. IMPLEMENTAR SISTEMA COMPLETO DE NECESSIDADES

O Jojo deve funcionar como um companion virtual com necessidades persistentes.

Criar indicadores de:

- Fome.
- Saúde.
- Humor.
- Higiene.
- Experiência (XP).
- Nível.

Os indicadores devem ser persistidos localmente e sobreviver a reinicializações, atualizações e encerramentos normais.

### Sistema de fome

O Jojo deve sentir fome progressivamente enquanto estiver ativo.

Estados:

1. Saciado.
2. Satisfeito.
3. Com fome.
4. Muito faminto.
5. Irritado pela fome.
6. Doente por falta de alimento.

A transição deve ser gradual, com temporizadores razoáveis e configuráveis.

### Reações comportamentais

Quando estiver com fome, o Jojo deve:

- Reclamar.
- Ficar impaciente.
- Olhar para o usuário com desaprovação.
- Exigir comida de maneira sarcástica.
- Apresentar animações de estômago roncando.
- Ficar progressivamente mais irritado.

Quando atingir fome extrema:

- Apresentar fraqueza.
- Nadar mais devagar.
- Demonstrar mal-estar.
- Alterar expressões faciais.
- Recusar temporariamente determinadas brincadeiras.
- Reagir dramaticamente quando finalmente receber comida.

A personalidade deve continuar predominantemente séria, mandona e sarcástica.

A doença é uma mecânica cômica de jogo, não uma representação médica real.

Não criar degradação permanente, punições desproporcionais ou situações que obriguem o usuário a abrir o aplicativo constantemente.

O Jojo deve conseguir recuperar sua saúde quando for alimentado e receber cuidados.

---

# PRIORIDADE 2 — SISTEMA DE COCÔS E HIGIENE

## 5. SISTEMA DE NECESSIDADES FISIOLÓGICAS

O Jojo deve eventualmente fazer cocô pela área do companion.

Implementar objetos animados reais que permaneçam na tela até serem limpos.

Os cocôs devem:

- Ter sprites próprios.
- Possuir física e animações leves.
- Ser visualmente distintos.
- Poder ser clicados e removidos.
- Produzir efeitos visuais cômicos.
- Conceder XP ao serem limpos.
- Interagir com o sistema de higiene.
- Persistir adequadamente quando necessário.
- Não bloquear a utilização do Windows.

### Seis tipos obrigatórios

| Tipo | Aparência | Raridade sugerida | XP por limpeza |
|---|---|---|---|
| 1. Cocô comum | Pequeno, marrom, simples | Comum | +5 XP |
| 2. Cocô gigante | Grande, volumoso, exagerado | Comum | +12 XP |
| 3. Cocô radioativo | Verde, brilho fluorescente | Incomum | +25 XP |
| 4. Cocô flamejante | Vermelho/alaranjado, efeitos de fogo | Raro | +50 XP |
| 5. Cocô dourado | Dourado, partículas brilhantes | Épico | +100 XP |
| 6. Cocô lendário | Multicolorido, aura especial e efeitos únicos | Lendário | +250 XP |

Esses valores são a configuração inicial e devem poder ser balanceados por dados, sem modificar o código.

### Easter eggs obrigatórios

Eventualmente, cocôs especiais devem apresentar:

- O ícone de League of Legends.
- O ícone do Discord.

Esses ícones devem aparecer como pequenos elementos visuais integrados ao cocô.

As ocorrências precisam ser raras, aleatórias e não anunciadas previamente.

Não incluir ambos obrigatoriamente ao mesmo tempo.

Utilizar recursos gráficos compatíveis com suas respectivas licenças, sem insinuar associação oficial com as marcas.

### Sistema de higiene

Se o usuário não limpar:

- A higiene do Jojo diminui.
- O Jojo demonstra irritação.
- O personagem eventualmente fica sujo.
- Surgem pequenas animações de mau cheiro.
- A saúde pode diminuir gradualmente.
- O Jojo pode adoecer temporariamente.
- Ele pode reclamar da falta de limpeza.

Não permitir que cocôs se acumulem infinitamente.

Implementar limite de objetos, reciclagem de recursos e controle de memória.

Não sujar fisicamente a área de trabalho, criar arquivos ou interferir nos ícones reais do Windows.

Todos os objetos devem pertencer à janela ou overlay controlado pelo aplicativo.

### Limpeza

O usuário deve conseguir:

- Clicar em cada cocô para removê-lo.
- Receber XP imediatamente.
- Ver a animação de limpeza.
- Visualizar a quantidade de XP recebida.
- Ver a barra de progressão se movimentar.
- Receber recompensas ao subir de nível.

A limpeza também deve melhorar gradualmente a higiene do personagem.

---

# PRIORIDADE 3 — PROGRESSÃO E FARM DE XP

## 6. SISTEMA COMPLETO DE EXPERIÊNCIA

O usuário deve sentir claramente que está evoluindo o Jojo.

Não quero apenas um número de XP escondido.

### Implementar

- Barra visual de XP.
- Nível atual.
- XP acumulado.
- XP necessário para próximo nível.
- Animações de XP recebido.
- Efeitos de level up.
- Histórico resumido de progressão.
- Recompensas desbloqueáveis.
- Conquistas.
- Sistema de raridade.
- Progressão persistente.

### Fontes de XP

- Limpar cocôs.
- Alimentar o Jojo adequadamente.
- Restaurar a saúde.
- Melhorar a higiene.
- Interagir com o personagem.
- Descobrir animações especiais.
- Encontrar easter eggs.
- Concluir pequenas atividades do sistema existente.

### Experiência visual

Ao ganhar XP:

1. Exibir `+XP` perto da interação.
2. Animar o preenchimento da barra.
3. Apresentar feedback visual proporcional à recompensa.
4. Exibir uma animação especial ao subir de nível.
5. Comunicar eventuais desbloqueios.

O sistema deve proporcionar recompensas frequentes no início e uma progressão sustentável posteriormente.

Impedir exploração por spam, cliques repetidos ou manipulação de relógio.

Não recompensar deliberadamente o abandono prolongado do Jojo apenas para gerar cocôs raros ou doenças.

O jogador deve sentir que consegue farmar XP por interações legítimas, não por deixar o animal sofrer.

---

# PRIORIDADE 4 — PELO MENOS 10 NOVAS ANIMAÇÕES DE NECESSIDADES

## 7. ANIMAÇÕES OBRIGATÓRIAS

Implementar pelo menos dez animações verdadeiras, com quadros ou transformações visuais efetivas.

1. **Fome inicial:** Jojo olha para a barriga e demonstra desconforto.
2. **Fome extrema:** Jojo fica furioso e mostra os dentes.
3. **Estômago roncando:** pequena vibração e efeitos visuais.
4. **Fraqueza:** natação lenta e desequilibrada.
5. **Doença:** expressão abatida com animação própria.
6. **Recuperação:** Jojo volta a nadar normalmente.
7. **Preparando cocô:** Jojo interrompe a natação e demonstra esforço.
8. **Fazendo cocô:** objeto surge com uma animação física cômica.
9. **Reação ao mau cheiro:** Jojo se afasta enojado.
10. **Limpeza concluída:** expressão de alívio e efeitos de higiene.

Além dessas, criar animações de:

- Comer.
- Mastigar.
- Satisfação.
- Comida favorita.
- Comida desagradável.
- Cocô raro.
- Cocô lendário.
- Ganho de XP.
- Subida de nível.
- Descoberta de conquista.

As animações devem ser realmente renderizadas, não apenas definidas em código sem serem exibidas.

### Regra anatômica permanente

Jojo é um tubarão musculoso que nada pela tela.

Ele **não possui braços nem pernas**.

Não introduzir membros artificiais para executar as animações.

Adaptar os movimentos ao corpo, nadadeiras, cauda, cabeça, boca e expressões do personagem.

---

# PRIORIDADE 5 — 50 NOVAS OPÇÕES DE COMIDA

## 8. EXPANDIR O SISTEMA DE ALIMENTAÇÃO

Adicionar exatamente 50 novas opções distintas, além das que já existem.

Catálogo inicial:

1. Salmão.
2. Atum.
3. Sardinha.
4. Tilápia.
5. Bacalhau.
6. Camarão.
7. Lula.
8. Polvo.
9. Siri.
10. Lagosta.
11. Sushi.
12. Sashimi.
13. Temaki.
14. Onigiri.
15. Ramen.
16. Yakisoba.
17. Gyoza.
18. Hambúrguer.
19. Cheeseburger.
20. Pizza.
21. Cachorro-quente.
22. Batata frita.
23. Nuggets.
24. Frango assado.
25. Churrasco.
26. Picanha.
27. Costela.
28. Feijoada.
29. Arroz com feijão.
30. Macarrão.
31. Lasanha.
32. Estrogonofe.
33. Coxinha.
34. Pastel.
35. Pão de queijo.
36. Tapioca.
37. Sanduíche natural.
38. Omelete.
39. Ovo cozido.
40. Banana.
41. Maçã.
42. Morango.
43. Melancia.
44. Manga.
45. Abacaxi.
46. Sorvete.
47. Chocolate.
48. Bolo.
49. Pudim.
50. Donut.

Cada alimento precisa possuir:

- Identificador próprio.
- Nome.
- Representação gráfica.
- Efeito sobre a fome.
- Efeito sobre o humor.
- Efeito apropriado sobre a saúde.
- Valor de XP de interação.
- Preferência do Jojo.
- Animação de consumo.
- Reação verbal contextual.

O Jojo deve ter comidas favoritas e comidas de que não gosta.

Reações e valores devem variar de acordo com o alimento.

Não permitir alimentação infinita para gerar XP ilimitado.

A alimentação deve funcionar com cliques reais e gerar mudanças visíveis no personagem.

Não remover alimentos preexistentes nem duplicar entradas do catálogo.

---

# PRIORIDADE 6 — 50 NOVAS INTERAÇÕES DE MEMES E PROFISSÕES

## 9. SISTEMA DE FALAS E ANIMAÇÕES CONTEXTUAIS

Criar no mínimo **50 novos conjuntos de interação**, cada um contendo:

- Uma fala original.
- Uma reação visual ou variação animada específica.
- Um gatilho contextual.
- Uma categoria.
- Uma condição de repetição.
- Uma personalidade coerente com o Jojo.

Distribuição mínima:

**25 interações de memes e humor contemporâneo.**

Incluir humor Gen Z, humor absurdo, referências de cultura da internet, jogos, situações de trabalho, procrastinação e acontecimentos cotidianos.

As referências precisam ser coerentes, não simplesmente palavras aleatórias.

**25 interações envolvendo profissões e personagens temáticos.**

Incluir:

1. Médico.
2. Cientista.
3. Físico.
4. Químico.
5. Biólogo.
6. Programador.
7. Engenheiro.
8. Professor.
9. Advogado.
10. Juiz.
11. Policial.
12. Bombeiro.
13. Piloto.
14. Astronauta.
15. Chef.
16. Psicólogo.
17. Veterinário.
18. Detetive.
19. Jornalista.
20. Mecânico.
21. Arquiteto.
22. Economista.
23. Personal trainer.
24. Marinheiro.
25. Pesquisador.

### Interações por profissão

Cada profissão deve possuir elementos visuais contextualizados.

Exemplos:

**Médico:** Jojo usa um estetoscópio adaptado ao corpo e faz um diagnóstico absurdo e claramente humorístico sobre a própria fome.

**Cientista:** Jojo aparece com óculos e faz uma análise dramática da raridade de um cocô.

**Programador:** Jojo demonstra irritação com bugs imaginários.

**Chef:** Jojo julga um alimento recebido como se estivesse em um programa de culinária.

**Detetive:** Jojo investiga o desaparecimento de uma comida.

**Astronauta:** Jojo simula natação em gravidade zero.

Criar reações variadas, criativas e realmente animadas.

Não transformar o personagem permanentemente nem prejudicar sua anatomia.

Quando estiver no modo cientista, preservar a exigência já existente de explicações técnicas sérias e fundamentadas quando o usuário fizer perguntas científicas.

Não inventar fatos científicos ou funcionalidades do MNE_Lab.

### Sistema de variedade

- Evitar repetir frequentemente as mesmas falas.
- Utilizar pesos de seleção.
- Implementar cooldown por interação.
- Considerar humor, saúde e fome.
- Permitir reações surpresa.
- Não revelar antecipadamente todos os easter eggs.
- Não interromper tarefas importantes do usuário.

O Jojo continua sem voz ou sons. Todas as falas devem aparecer nos balões visuais já existentes.

---

# PRIORIDADE 7 — CORRIGIR DUPLICAÇÃO DE ÍCONES NA ÁREA DE TRABALHO

## 10. BUG DO SISTEMA DE ATUALIZAÇÃO

Atualmente, cada atualização pode resultar em dois ícones do Jojo na área de trabalho.

Identificar e corrigir definitivamente a causa.

Investigar:

- Instalador.
- Atualizador automático.
- Scripts de instalação.
- Criação de atalhos.
- Atualizações de executáveis.
- Atalhos criados por usuário.
- Atalhos globais.
- Caminhos antigos.
- Reinstalações.
- Identificadores inconsistentes do aplicativo.

### Resultado obrigatório

Deve existir **um único atalho principal do Jojo Companion**, respeitando a preferência de instalação do usuário.

Atualizações não podem criar novos atalhos duplicados.

Implementar lógica idempotente de criação e migração de atalhos.

Remover apenas atalhos comprovadamente obsoletos do próprio Jojo, preservando atalhos personalizados ou de terceiros.

Verificar os diretórios de área de trabalho do usuário, área de trabalho pública e mecanismos usados pelo instalador.

Testar múltiplas atualizações consecutivas.

---

# PRIORIDADE 8 — NOVO ÍCONE SOFISTICADO

## 11. REDESENHAR O ÍCONE DO JOJO COMPANION

Criar um ícone novo, profissional e visualmente sofisticado.

### Direção artística

- Tubarão musculoso.
- Aparência adulta.
- Expressão confiante e levemente intimidadora.
- Identidade própria e reconhecível.
- Silhueta limpa.
- Boa legibilidade em tamanhos pequenos.
- Estilo premium de aplicativo desktop.
- Iluminação e profundidade bem trabalhadas.
- Compatível com o modelo visual real do Jojo.
- Sem braços ou pernas.
- Sem aspecto excessivamente infantil.

O ícone deve permanecer reconhecível em 16×16, 32×32, 48×48 e 256×256 pixels.

Produzir os recursos gráficos necessários e um arquivo `.ico` multirresolução adequado ao Windows.

Integrar o ícone em:

- Executável.
- Instalador.
- Atalho da área de trabalho.
- Menu Iniciar.
- Barra de tarefas.
- Interface do aplicativo, quando apropriado.

Verificar cache de ícones, caminhos antigos e identidade do aplicativo.

Não simplesmente renomear ou ampliar o ícone antigo.

Se não houver ferramenta disponível para gerar um novo recurso gráfico adequado, registrar a limitação em vez de utilizar uma imagem temporária como solução final.

---

# PRIORIDADE 9 — MODO TRABALHO/FOCO E DISCORD

## 12. FECHAMENTO AUTOMÁTICO DO DISCORD

Ao ativar o Modo Trabalho/Foco, o Jojo deve fechar o aplicativo Discord no Windows.

### Comportamento

1. Detectar se o Discord está aberto.
2. Solicitar encerramento normal do aplicativo.
3. Verificar se o processo realmente encerrou.
4. Tratar instâncias comuns, PTB e Canary quando instaladas.
5. Não encerrar processos de aplicativos não relacionados.
6. Não comprometer o funcionamento do próprio Jojo.
7. Não reiniciar o Discord ao sair do Modo Foco.

Evitar encerramento forçado sem necessidade. Se o Discord não encerrar normalmente, informar ao usuário ou seguir a preferência explícita de encerramento forçado.

Não apagar dados, configurações ou arquivos do Discord.

### Comportamento do Jojo em foco

Preservar integralmente as regras existentes:

- Meditar discretamente em um canto.
- Não emitir sons.
- Não falar espontaneamente.
- Não mostrar animações chamativas.
- Não interromper o usuário.
- Não abrir jogos ou memes.
- Não cobrir conteúdos importantes.
- Permanecer sob controle do usuário.
- Não exibir estado de sono entre 06:00 e 21:00.

Os sistemas de fome, doença e higiene não podem produzir interrupções visuais durante o Modo Trabalho/Foco.

Suspender animações e notificações espontâneas desses sistemas nesse modo, preservando o estado de forma equilibrada.

---

# PRIORIDADE 10 — PERFORMANCE E ESTABILIDADE

## 13. OTIMIZAÇÃO

Todos os novos sistemas devem ser compatíveis com computadores modestos.

Priorizar:

- Baixo consumo de RAM.
- Baixa utilização de CPU.
- Ausência de carga gráfica desnecessária.
- Reutilização de sprites e texturas.
- Animações leves.
- Limitação de objetos simultâneos.
- Suspensão de animações quando apropriado.
- Persistência eficiente.
- Prevenção de memory leaks.
- Ausência de timers duplicados.
- Inicialização rápida.
- Funcionamento estável após atualizações.

O Jojo não deve ficar com animações cortadas, lentas ou travadas.

Garantir que todo o corpo e os efeitos permaneçam dentro dos limites corretos de renderização.

O overlay não deve interceptar cliques fora das regiões interativas.

Não modificar desnecessariamente o motor de IA.

Não introduzir custos recorrentes obrigatórios.

---

# PRIORIDADE 11 — TESTES E QUALIDADE

## 14. TESTES OBRIGATÓRIOS

Criar testes automatizados e executar validações reais quando o ambiente permitir.

### Inteligência
- Perguntas sobre clima.
- Perguntas sobre agenda.
- Estado real das integrações.
- Respostas contextuais.
- Erros e ausência de dados.
- Detecção de informações irrelevantes.

### Sobrevivência
- Consumo de fome.
- Alimentação.
- Recuperação de saúde.
- Doença.
- Queda de higiene.
- Persistência dos estados.

### Cocôs
- Seis tipos distintos.
- Probabilidades de raridade.
- Limpeza.
- XP correto.
- Easter eggs.
- Limite de objetos.
- Persistência.
- Renderização.

### Progressão
- Acúmulo de XP.
- Subida de nível.
- Recompensas.
- Barra animada.
- Proteção contra exploração.
- Persistência entre versões.

### Conteúdo
- 50 novas comidas válidas.
- 50 conjuntos de interação.
- Ausência de duplicatas.
- Pelo menos 10 animações de necessidades.
- Recursos gráficos realmente disponíveis.
- Falas associadas aos gatilhos corretos.

### Windows
- Um único atalho após instalação.
- Um único atalho após atualização.
- Migração de instalações antigas.
- Novo ícone aplicado corretamente.
- Discord encerrado no Modo Foco.
- Outros processos preservados.

### Regressão
Validar que as funcionalidades anteriores continuam funcionando.

Não considerar um teste aprovado sem executá-lo.

Não considerar uma animação implementada apenas porque existe uma função com seu nome.

Validar renderização, disparo, transição e interação.

---

# PRIORIDADE 12 — PUBLICAÇÃO E RELEASES

## 15. FLUXO DE DISTRIBUIÇÃO

Trabalhar primeiramente no repositório de desenvolvimento.

Depois:

1. Executar validações.
2. Resolver problemas.
3. Verificar compatibilidade das atualizações.
4. Preservar dados de instalações anteriores.
5. Preparar o pacote Windows.
6. Publicar pelo fluxo de releases já estabelecido, quando as permissões e validações permitirem.

Não alterar releases antigas, incluindo suas descrições.

A descrição de uma nova release deve apresentar apenas mudanças verdadeiras em relação à versão anterior.

Não anunciar funcionalidades que não estejam realmente disponíveis.

Se a publicação depender de uma autorização externa, preparar todos os artefatos permitidos e documentar exatamente a etapa bloqueada.

---

# CRITÉRIOS FINAIS DE ACEITAÇÃO

O trabalho somente poderá ser considerado integralmente concluído quando:

- [ ] O Jojo consultar previsão meteorológica real.
- [ ] A integração iCloud Calendar estiver funcional e corretamente testada com uma conta autorizada.
- [ ] O Jojo parar de responder com informações irrelevantes ou falsas.
- [ ] O sistema de fome funcionar.
- [ ] O Jojo ficar irritado e eventualmente doente quando negligenciado.
- [ ] O sistema de higiene e limpeza funcionar.
- [ ] Os seis tipos de cocô existirem visualmente.
- [ ] Cada cocô conceder o XP correto.
- [ ] Os easter eggs de League of Legends e Discord estiverem implementados.
- [ ] Existirem pelo menos 10 novas animações relacionadas às necessidades.
- [ ] A barra de XP e o sistema de níveis funcionarem.
- [ ] O usuário perceber claramente a evolução do personagem.
- [ ] As 50 novas comidas estiverem disponíveis e interativas.
- [ ] As 50 novas interações de memes e profissões estiverem implementadas.
- [ ] O problema dos dois atalhos estiver resolvido.
- [ ] O novo ícone estiver integrado ao Windows.
- [ ] O Discord encerrar ao ativar o Modo Trabalho/Foco.
- [ ] O Jojo permanecer leve e estável.
- [ ] Nenhuma funcionalidade preexistente tiver sido quebrada.
- [ ] Os testes pertinentes tiverem sido executados e aprovados.

## RELATÓRIO OBRIGATÓRIO

Fornecer relatório final contendo:

1. Problemas identificados e respectivas causas.
2. Correções realizadas.
3. Arquivos modificados.
4. Quantidade real de novas animações.
5. Relação das 50 comidas adicionadas.
6. Relação das 50 interações adicionadas.
7. Implementação das seis raridades de cocô.
8. Funcionamento da progressão de XP.
9. Resultados dos testes e limitações.
10. Correção dos atalhos e instalação do novo ícone.
11. Validação do encerramento do Discord.
12. Commits e pull requests.
13. Status de publicação da release.
14. Pendências que realmente exijam intervenção do usuário.

## DIRETRIZ FINAL

A prioridade é transformar o Jojo Companion em um companion virtual vivo, expressivo, interativo e tecnicamente confiável.

Não quero funcionalidades falsas, respostas fabricadas, botões decorativos, animações inexistentes ou configurações que não produzam efeitos reais.

O usuário deve perceber que o Jojo sente fome, reage, fica irritado, adoece, come, faz cocô, precisa de limpeza, ganha XP e evolui.

Tudo isso deve funcionar de verdade, integrado aos sistemas existentes.

**Execute autonomamente todas as etapas tecnicamente possíveis, preservando a arquitetura, a identidade e a estabilidade do Jojo Companion.**