# HANDOFF — JoJo Companion

## Estado atual

- Desenvolvimento privado: `oaovito/oao-companion-`, aplicativo em `jojo-companion/`.
- Distribuição pública e atualizador: `oaovito/jojo-companion-releases`.
- Branch efetiva: `codex/conversation-coherence`, derivada de `codex/operational-handoff`.
  Ensaios isolados atuais em `qa/conversation-models`, base `e4dee80`; ensaios revisados foram integrados por fast-forward
  na branch Codex. CI completo da configuração final obrigatório antes da tag.
  Base original preservada: `claude/jeff-companion-v0.1` em `018bd492a46d70f688187394f0ce60759c20d737`.
  `main` contém apenas README; consultar o remoto antes de qualquer trabalho.
- Versão pública: **0.43.1**. Código candidato: **0.44.0**; nenhuma nova tag/release criada.
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
- Retomada após inatividade aguarda até 20 s por pesos já preparados, preservando a
  primeira pergunta. Download inicial continua em segundo plano; emergência segue
  imediata e cancela o turno antigo também durante recarga (regressão verificada).
- Duração da boca acompanha o texto (máximo 6 s); respostas durante trabalho/tela cheia
  não guardam movimento para depois. Recolher balão cancela também medição pendente.
- Build Windows em Node, sem Bash. Testes reais do vigia movidos para integração Windows;
  unitários são lógica pura. Removidos caminhos de interface/runtime específicos de outros sistemas.
- Auditoria das 1.043 animações adicionada ao CI Windows como gate obrigatório: erros,
  recortes, quadros parados e ausência de gatilho natural devem falhar.
- electron-builder atualizado para 26.18.0: auditoria de produção sem vulnerabilidades;
  15 moderadas restantes na cadeia de desenvolvimento. Não usar audit fix --force.

## Modelo local — avaliação real obrigatória

- Configuração consolidada para validação final: **Gemma 3 4B**, `gemma3:4b-it-q4_K_M`;
  alias `gemma3:4b`. Manifestos comparados e equivalentes:
  `sha256:68ceab7e468a31c988b44d5a4984a0e21f58c4f7158c6ce29c1804babac38df7`.
  Download total de aproximadamente 3,35 GB. Usuária confirmou 16 GB de RAM ou mais.
- Escolha fundamentada em inferência real no Windows. Qwen 3.5 2B/4B, Qwen 3 4B,
  Ministral 3B, Llama 3.2 3B e Phi-4-mini falharam na leitura semântica; modelos
  de 8/9B excederam o limite de tempo no runner de 8 GB/2 CPUs. Não afirmar que
  resultados lexicais verdes de candidatos anteriores comprovaram coerência.
- [Ensaio 41214482175](https://github.com/oaovito/oao-companion-/actions/runs/41214482175):
  Gemma passou 30/30 no engine. Falas lidas: contexto, preferências, correção,
  inglês, diabetes e exemplo coerentes, sem narração corporal ou ameaça. Ainda
  há limitações de humor e naturalidade; não declarar perfeição geral.
- O teste pela Central encontrou reação neutra em exemplo técnico sem pesquisa.
  Causa: seriedade calculada só pela nova mensagem; agora herda o assunto em andamento.
  Regressão unitária aprovada. Nova execução [41214891976](https://github.com/oaovito/oao-companion-/actions/runs/41214891976)
  concluída com sucesso: 30 turnos no engine e dez pela interface/IPC/modelo reais.
  Todas as falas foram lidas. Preload 10,985 s; mediana de resposta do modelo no engine
  10,770 s, maior 24,945 s no runner de 8 GB/2 CPUs. Não são medições do PC da usuária.
  A proximidade do teto de 25 s motivou encurtar explicações mantendo o mecanismo;
  a recusa explícita de treino agora tem confirmação direta. Exige novo CI completo.
- Seleção aceita somente variante avaliada/alias; nomes antigos migram ao novo padrão
  sem religar conversa, pesquisa, autostart ou atualização desligados. Modelos/dados
  antigos não são apagados. UI usa o nome do contrato compartilhado.
- `scripts/check-conversation-windows.ps1` baixa runtime Windows com SHA-256,
  executa modelo em loopback e publica relatório no resumo/log. Mesmo ensaio exigido
  no CI oficial antes da publicação; workflow separado fica só na branch de avaliação.
- Não há nova release: **0.43.1 pública ainda usa o Qwen antigo**. Aprovar distribuição
  somente depois de ler as saídas do novo ensaio e do CI completo da configuração final.

## Evidências verificadas

- Unitários locais atuais: **303/303**, sem pulos; host executa apenas lógica pura em Node.
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
