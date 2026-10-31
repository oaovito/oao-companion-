# HANDOFF — JoJo Companion

## Estado atual

- Desenvolvimento privado: `oaovito/oao-companion-`, aplicativo em `jojo-companion/`.
- Distribuição pública e atualizador: `oaovito/jojo-companion-releases`.
- Branch efetiva: `codex/conversation-coherence`, derivada de `codex/operational-handoff`.
  Ensaios isolados atuais em `qa/conversation-models`, base `e4dee80`; integrar somente
  depois da revisão real, e executar novamente o CI completo na branch Codex.
  Base original preservada: `claude/jeff-companion-v0.1` em `018bd492a46d70f688187394f0ce60759c20d737`.
  `main` contém apenas README; consultar o remoto antes de qualquer trabalho.
- Versão instalada/publicada: **0.43.1**. Não houve nova tag/release durante a transferência.
- Exclusivo para **Windows 11 x64**. Não desenvolver versões de outros sistemas, usar Wine,
  compilação cruzada ou preparar runtimes gráficos/modelos no host de edição.
- Usuário confirmou **16 GB de RAM ou mais** no PC Windows de destino.
- Ler `../AGENTS.md`, `../CLAUDE.md`, `PRODUCT_SPEC.md`, `ARCHITECTURE.md`, `CHANGELOG.md`,
  package.json e workflows. O [histórico técnico](docs/HANDOFF_HISTORICO.md) é referência
  opcional para decisões antigas; não é o roteiro operacional atual.

## Mudanças implementadas, ainda não publicadas

- Central tem uma única conversa; avisos/lembretes aparecem nela. IPC e `/nova` antigos
  continuam compatíveis sem apagar o histórico. O histórico real entregue inclui atalhos.
- Mensagens diferentes são serializadas; reenvios pendentes são deduplicados. Emergências
  cancelam a geração antiga e impedem que resposta/indicador atrasados substituam acolhimento.
- Fatos de identidade/João, limites e provocações protegidos; conversa pessoal não faz busca
  genérica. Bloqueios de ameaças, identidade inventada, nomes trocados e João fora do assunto.
- Prompt local menor, fala em texto puro, comandos só em pedido explícito. Respostas inválidas
  não pausam o modelo por 90 s; timeout cancela inferência em vez de só abandonar a Promise.
- Runtime Windows fixado em Ollama 0.40.13 com SHA-256 antes de extrair; espaço livre
  verificado também ao migrar o modelo. Só anuncia pronto após carregar os pesos; cache
  vencido é reconhecido. Contexto de 2.048 tokens e lote de 128 reduzem memória temporária.
- Perguntas de conhecimento/sintomas não acionam sono/comida/exercício por palavra-chave;
  perguntar como o músculo cresce não muda o tamanho do JoJo.
- Reações/boca acompanham falas; óculos técnicos saem ao mudar de assunto; ações não
  interrompem fuga, arraste, tela cheia ou Modo Trabalho.
- Duração da boca acompanha o texto (máximo 6 s); respostas durante trabalho/tela cheia
  não guardam movimento para depois. Recolher balão cancela também medição pendente.
- Build Windows em Node, sem Bash. Testes reais do vigia movidos para integração Windows;
  unitários são lógica pura. Removidos caminhos de interface/runtime específicos de outros sistemas.
- Auditoria das 1.043 animações adicionada ao CI Windows como gate obrigatório: erros,
  recortes, quadros parados e ausência de gatilho natural devem falhar.
- electron-builder atualizado para 26.18.0: auditoria de produção sem vulnerabilidades;
  15 moderadas restantes na cadeia de desenvolvimento. Não usar audit fix --force.

## Modelo local — avaliação real obrigatória

- Aplicativo ainda usa Qwen 3.5 **2B**. Não afirmar que a qualidade foi resolvida.
- Ensaios reais do 2B, inclusive outra quantização, falharam na revisão semântica.
- Qwen 3.5 4B q4_K_M executou 16 casos em Windows Server com 8 GB e 2 CPUs.
  Mesmo com checagens lexicais verdes, as falas falharam: papéis trocados, número sem
  fonte, assunto antigo contaminando resposta e sarcasmo sem sentido. Não aprovado.
- `d050dd9` corrigiu papéis/exemplos. Ensaio [41203843825](https://github.com/oaovito/oao-companion-/actions/runs/41203843825)
  passou 16/16 automaticamente, mas leitura das falas ainda reprovou qualidade livre.
- `6ab2600` reduz humor forçado e esclarece personagem/interlocutora. O ensaio 9B
  [41204166232](https://github.com/oaovito/oao-companion-/actions/runs/41204166232) falhou:
  o runner Windows de 8 GB demorou 118 s na primeira chamada e acionou fallback.
  Isso não comprova a qualidade do 9B no PC de 16 GB; não foi aprovado para distribuição.
- Qwen 3 4B Instruct 2507 foi testado: falas ainda fantasiosas e explicação excedendo
  limite de tempo. Não aprovado. Comparação seguinte: Gemma 3 4B, Ministral 3 3B e
  Qwen 3.5 4B. Primeira rodada atingiu timeout no primeiro carregamento e limitou os
  turnos seguintes por backoff; não confundir isso com prova de qualidade de cada modelo.
- Ensaios seguintes usam carregamento explícito do app, medem preload e respostas-base
  sem personagem, respeitam backoff entre casos e registram diagnóstico do servidor.
  Modelo oficial do aplicativo permanece 2B até haver qualidade realmente verificada.
- Qwen 3.5 4B e Ministral 3B também falharam com preload na leitura semântica.
  Llama 3.1 8B e Qwen 3 8B excederam limites de tempo no runner de 8 GB/2 CPUs.
  Gemma 3 4B com prompt técnico compacto respondeu ciência em 23 s e foi mais coerente,
  porém repetiu a definição ao pedir exemplo; não aprovado como solução final.
- Ensaio de 30 casos em `f1716f3`: Gemma **26/30**, Llama 3.2 **23/30**, Phi-4-mini
  **18/30**; todos reprovados. Problemas reais: exemplo incompleto/lento, desprezo à
  usuária, inglês respondido em português e invenções sobre a conversa.
- Nova rodada: Gemma 3 4B e Qwen 3 4B Instruct. Instruções internas em inglês com
  idioma de resposta explícito; identidade física só quando pertinente; objetivo de
  fazer companhia antes do humor; histórico menor para assuntos novos. Nomes conhecidos
  têm resposta protegida imediata, como os fatos sobre o criador. Não trocar o modelo
  oficial antes de ler cada fala real.
- Acrescentado `test/e2e/conversation-real.windows.mjs`: dez turnos pela Central/IPC,
  controlador e modelo reais, além do ensaio do engine. Só é executado quando os
  30 casos de backend passam; falha bloqueia o job. Ainda aguarda execução.
- `.github/workflows/jojo-conversation-windows.yml` baixa Ollama Windows com SHA-256
  verificado e roda `scripts/check-conversation.mjs` contra inferência real, somente loopback,
  sem nuvem/login/custo. Resultados no resumo/logs do Actions, sem depender da cota de artefatos.
- Troca oficial exige atualizar seleção/migração, configuração, UI, documentação e testes;
  preservar dados/modelos antigos e o funcionamento offline. Não trocar silenciosamente por API externa.

## Evidências verificadas

- Unitários locais atuais: **298/298**, sem pulos; host executa apenas lógica pura em Node.
- [CI Windows 41167799466](https://github.com/oaovito/oao-companion-/actions/runs/41167799466),
  código `034133d`: **292 unitários, 16 integração nativa/processos, 29 E2E**, todos passaram,
  sem pulos. Portátil/instalador/ZIP gerados e conferidos por nome/tamanho/SHA-256;
  portátil abriu, crash reabriu, bandeja encerrou, atalho criado, medições concluídas.
- [CI Windows 41206258451](https://github.com/oaovito/oao-companion-/actions/runs/41206258451),
  `e4dee80`: **296 unitários e 16 integração** passaram. E2E: **28/29**; único erro foi
  asserção sensível a maiúscula em "Humor seco". Corrigido para ignorar caixa, sem remover
  a verificação de personalidade. Exige nova execução no código final.
- Nesse CI as **1.043 animações** passaram no renderer Windows: zero erros, recortes,
  quadros parados ou falta de gatilho; média medida **0,31 ms/quadro**. Amostra visual de
  nove animações em três fases recuperada do log e revisada. Relatório final deve refletir
  execução Windows; não comparar este custo de desenho com tempo de conversa do modelo.
- Runner Windows Server de um monitor não comprova Windows 11 físico, DPI misto,
  suspensão real ou troca de instalação NSIS/portátil com dados reais. Não alegar esses testes.

## Publicação e recuperação

- Push comum/dispatch só validam; CI reconhece `codex/**`. Só nova tag oficial publica
  após gates Windows. Não criar release artificial para demonstrar transferência.
- `scripts/publish-release.mjs` impede tag/versão divergente e alteração de release/tag pública
  existente; exige RELEASES_TOKEN, envia os três formatos em rascunho, verifica hashes/tamanhos,
  publica e consulta anonimamente `/releases/latest` e downloads.
- Token auditado no CI com autenticação e permissão push anunciada. API Secrets não permite
  listar (403), o que não significa token ausente. Nunca exibir/alterar token.
- Atualizador preservado: `package.json.jojoUpdate` público; 0.43.1 detectada a partir de
  0.43.0 nos modos portable/installer com metadados reais; três arquivos públicos baixados e
  hashes conferidos. Nenhum arquivo privado foi enviado ao canal público.
- Cota de artefatos Actions cheia em 41167799466. Upload opcional falhou; geração dos arquivos
  está comprovada nos logs. Releases recebem upload direto e não dependem dessa cota.
  Não apagar arquivos/artefatos históricos para contornar o limite.
- Nunca reescrever notas, assets ou tags já publicados, incluindo v0.32.0.
- Nenhum projeto externo foi acessado/modificado. MNE_Lab não pertence a esta missão.

## Comandos e conclusão

No Windows, em `jojo-companion/`: `npm ci`, `npm test`, `npm run test:windows`,
`npm run test:e2e`, `npm run audit:animations`, `npm run build:win`.
No host de edição, somente testes de lógica pura (`npm test`).

Continuar corrigindo qualidade livre e validando modelo/reação/latência reais. Depois validar
CI no commit exato, consolidar changelog incremental desde 0.43.1 e preparar versão apenas
se houver alteração justificável. Release só concluída com os três arquivos públicos íntegros,
notas incrementais reais e atualização detectável. Não declarar perfeição geral por testes lexicais.
