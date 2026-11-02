# Recuperação verificável — 02/11/2026

Verificação concluída às **12h32 de Brasília**. O novo ambiente começou em
`offline/starting`, sem terminal utilizável. Uma espera pela inicialização retornou
`ready`; a consulta posterior confirmou `connected/running`, observações atuais
e política de rede aplicada. O executor anterior não foi utilizado.

## Repositório e preservação

- Desenvolvimento privado: `oaovito/oao-companion-`, com hífen final.
- Branch padrão: `main`, somente controle, commit `1edd84f`.
- Fonte efetiva: `codex/living-companion`, commit `fd20a52c56ddd7a1dc20e6462ee7f06c9c69c2c2`.
- Registro desta recuperação: `codex/recovery-validation-20261102`, no checkout
  existente em `/workspace/oao-companion-`. A branch local `work` foi preservada.
- Estado inicial limpo, sem arquivos pendentes ou stashes. Fetch preservou todas
  as branches/tags. Não houve reset destrutivo, force-push ou novo worktree.
- `claude/jeff-companion-v0.1`, `codex/operational-handoff`,
  `codex/conversation-coherence` e `qa/conversation-models` não têm commits
  exclusivos ausentes em `codex/living-companion`.
- Fonte, assets, package.json e lockfile são idênticos à tag validada `v0.45.0`,
  commit `9c213f494602329f4ebc7bbf9f8fa719a1368f1a`.

Foram consultados AGENTS, CLAUDE, HANDOFF, missão ativa, especificação, arquitetura,
changelog, package.json, workflows, branches, histórico, issues, PRs e releases.
Buscas e listagens REST retornaram **zero issues e zero PRs**. O registro ativo
declara a entrega 0.45.0 concluída, e a release/pipeline confirmam essa situação.
Não foi encontrada correção pendente para reaplicar. Esta recuperação altera
somente documentação/evidência; identidade, personalidade e funcionalidades ficam
preservadas. MNE_Lab não foi acessado ou modificado.

## Verificações executadas nesta sessão

Terminal, Git **2.52.0**, npm **11.9.0**, GitHub CLI e leitura remota funcionaram.
Host Linux x64, Node padrão 24.19.0; testes e lint usaram explicitamente o Node
**22.23.4**, igual ao CI oficial. Dependências de produção instaladas com
`npm ci --ignore-scripts --omit=dev`; nenhum runtime gráfico/modelo Linux instalado.

| Verificação | Resultado |
| --- | --- |
| Suíte completa de lógica `test/unit/*.test.js` | 411 aprovados; 0 falhas, cancelamentos ou pulos |
| `scripts/lint.mjs` | 197 arquivos JavaScript/JSON aprovados |
| Fonte/assets/dependências versus `v0.45.0` | Idênticos |
| Download dos três binários públicos | Tamanho e SHA-256 idênticos à evidência Windows |
| UpdateChecker com consulta pública real via HTTP | 0.44.0→0.45.0, portátil e instalador, nomes/hashes corretos |
| Notas da release versus gerador/changelog | Correspondem |
| Snapshot das releases antes/depois | 19 releases com metadados/assets preservados |

Evidência estruturada: [recuperacao-20261102.json](evidencias/recuperacao-20261102.json).
TAP/JUnit/lint completos foram salvos com hashes nesse JSON e entregues com o
relatório da sessão. Nenhuma regressão foi detectada nas verificações executadas.

## Windows e distribuição já concluídos

A API reconfirmou `success` no [pipeline Windows 41383430244](https://github.com/oaovito/oao-companion-/actions/runs/41383430244),
com o commit/tag exato da release. A evidência versionada registra 411 unitários,
16 integrações, 40 E2E, 31+12 conversas com Gemma real, 1.268 animações,
NSIS/três atualizações, portátil/ZIP/vigia/desempenho/hashes e publicação.
Esses resultados são da execução anterior; não foram repetidos nesta sessão.
O comando de leitura de logs via CLI retornou arquivo vazio; status/passos foram
conferidos pela API, e os relatórios versionados foram preservados.

O [controle horário 41407998784](https://github.com/oaovito/oao-companion-/actions/runs/41407998784)
também aparece concluído com sucesso por evento `schedule`, na `main`/`1edd84f`.
Nenhum novo pipeline pesado ou publicação foi solicitado por esta recuperação.

Canal público: [v0.45.0](https://github.com/oaovito/jojo-companion-releases/releases/tag/v0.45.0),
release ID `431060770`. Somente binários/notas permanecem no público; fonte e
evidência interna permanecem no privado. Nenhuma release, asset ou tag histórica
foi criada, editada, substituída ou excluída nesta sessão.

| Arquivo | Bytes | SHA-256 conferido após download |
| --- | ---: | --- |
| JoJoCompanion.exe | 103505584 | ab442cab7463d9a5e2cb82f8f407f10476f73058602eaccbbd10c00c792923ea |
| JoJoCompanion-Setup-0.45.0.exe | 113305067 | d7099f82b3f4df78f6e66c4520bec2f1e274f45c6f859f8ecaea975ea745a201 |
| JoJoCompanion-0.45.0-win-x64.zip | 144233512 | 5368b3c603ed7af8e69721f12c5009c66f158cf9d47c8221c2cdb0876b167bbf |

## Pendências e limites

Não há implementação pendente documentada da 0.45.0 nem bloqueio atual de
terminal/Git/acesso de leitura. A agenda vigente usa somente link iCal, sem
login/senha; a exigência histórica de credenciais iCloud foi superada.

A quota de artefatos CI estava esgotada no registro anterior; não foi reavaliada
por upload nesta sessão, e armazenamento/faturamento não foram alterados.
Isso não impede o download dos binários oficiais já publicados e aqui conferidos.

Continuam sem comprovação física: Windows 11 doméstico, monitores com DPI misto,
suspensão real, jogo comercial instalado e agenda pessoal. Testes puros neste
host e o runner Windows anterior não substituem essas verificações.
Não afirmar ausência universal de regressões ou instalação no PC da usuária.
Não incrementar versão/republicar a 0.45.0 para demonstrar recuperação.
