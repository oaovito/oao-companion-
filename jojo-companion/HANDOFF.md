# HANDOFF — JoJo Companion

## Estado atual e decisão definitiva

- Desenvolvimento privado: **oaovito/oao-companion-**, fonte em `jojo-companion/`.
  O nome sem hífen final informado em pedidos retorna 404; não criar outro app/repositório.
- Branch de fonte: **codex/conversation-coherence**. Base desta tarefa: `dd8b558`,
  sucessora de `3f637fe`. Histórico Claude preservado (`018bd492a46d70f688187394f0ce60759c20d737`).
- Versão pública: **0.43.1**, canal **oaovito/jojo-companion-releases**.
  Candidata **0.44.0**, sem nova tag/release até validação real completa.
- **GitHub Actions original é o único CI/CD.** Só runners oficiais hospedados pelo GitHub.
  Azure, CircleCI, runners externos/locais, bootstrap independente e agente de polling
  removidos depois de verificar ausência de dependência no aplicativo. Histórico Git preservado.
- `main` era somente README. Receberá apenas o controle necessário ao cron, que só roda
  na branch padrão. Não iniciar desenvolvimento nela nem trocar a fonte por main vazia.
- Não acessar/modificar MNE_Lab. Nenhum projeto externo é parte deste trabalho.
- Ler `../AGENTS.md`, `../CLAUDE.md`, `PRODUCT_SPEC.md`, `ARCHITECTURE.md`, `CHANGELOG.md`,
  package.json e [GITHUB_ACTIONS.md](docs/GITHUB_ACTIONS.md).

## Produto preservado, candidato ainda não publicado

Somente Windows 11 x64, Electron 44/ESM, koffi isolado, personagem tubarão fisiculturista
em recorte de papel. Preservar click-through, fuga, tela cheia, múltiplos monitores,
Modo Trabalho, personalidade, privacidade/offline, autostart, recuperação e atualização.

A candidata contém conversa única com avisos/lembretes no mesmo histórico; fila/deduplicação;
segurança cancela fala atrasada; identidade/João protegidos; perguntas/negações não viram
comandos; reações/boca/óculos acompanham o assunto sem interromper fuga/tela cheia/trabalho.
Primeira pergunta depois da inatividade aguarda recarga breve do modelo sem bloquear urgência.
Modelo local **Gemma 3 4B** (`gemma3:4b-it-q4_K_M`, alias equivalente `gemma3:4b`), contexto
2.048, lote 128. Manifesto `68ceab7e468a31c988b44d5a4984a0e21f58c4f7158c6ce29c1804babac38df7`.
Seleção/migração preservam preferências/dados e não usam nuvem silenciosa.
Runtime Windows Ollama 0.40.13 com SHA-256 antes da extração. Builder 26.18.0.

## Infraestrutura restaurada

- `.github/workflows/jojo-windows.yml`: todos os gates originais + melhorias reunidos
  em `scripts/actions-windows.mjs`, no mesmo job `windows-latest`. Node 22.23.4,
  cache npm, hashes, log privado, TAP/JUnit/JSON, NSIS real, artefatos com retenção de um dia.
- `.github/workflows/jojo-conversation-windows.yml`: avaliação preservada, somente manual;
  não duplica ensaio real em cada push do pipeline completo.
- `.github/workflows/jojo-recovery.yml`: `17 * * * *`, 60 min, minuto 17 UTC. Controle
  leve de API no Ubuntu oficial, timeout 3 min, sem aplicativo Linux ou serviço externo.
  Também verifica alterações REAIS nos arquivos de controle na main, sem commits artificiais.
- Concorrência global protege validação/publicação. Controle não dispara se há build ativo,
  não repete falha técnica do mesmo commit/cancelamento/sucesso sem publicação verificada.
  Startup/billing pode ser tentado na hora seguinte; cooldown de 55 min contra jitter/duplicação.
- Release existente com os três metadados corretos: não recriar. Rascunho/incompleta:
  inspecionar, não substituir. Nenhum loop de build, alteração financeira ou provedor paralelo.
- Após gates aprovados da candidata 0.44.0 autorizada, confere commit/arquivos e branch
  atual; cria NOVA tag privada com GITHUB_TOKEN sem acionar novo build; publica com
  RELEASES_TOKEN no passo final. Tag existente divergente nunca é movida.
- Publicador exige `github-hosted` Windows, checkout limpo, tag e relatório do MESMO run,
  SHA-256 ainda iguais; valida uploads, downloads anônimos e UpdateChecker nos dois modos.
  Não depende de sucesso do upload opcional de artefatos CI para publicar no mesmo job.

## Custo e bloqueios efetivamente observados

Orçamento adicional autorizado **R$ 0**. Nenhum cartão/plano/limite foi alterado.
APIs de faturamento/uso e variáveis do repositório retornaram **403**. A anotação de
[41217012984](https://github.com/oaovito/oao-companion-/actions/runs/41217012984), sem runner
ou passos iniciados, diz que pagamentos recentes falharam **OU** limite precisa aumentar.
Não é possível distinguir saldo/franquia, orçamento ou pagamento recusado com esses dados.
Não presumir que alguma pendência financeira se resolverá automaticamente.

`ci/actions-cost-policy.json` registra custo não confirmado. Os três `COST_GATE` estão
fechados ANTES de alocar runners. Foi solicitada ao titular confirmação ÚNICA de que
TODO gasto pago do Actions está efetivamente bloqueado em zero. Sem resposta confiável,
não habilitar por decurso de tempo. Isso preserva R$ 0; não é teste Windows aprovado.

Cron depende do próprio Actions e pode não iniciar sob bloqueio financeiro. Mesmo
registrado, gate fechado não consulta APIs por hora. Não declarar monitor operacional
antes de observar execução real da verificação. Não existe check de API sem runner.
Após confirmação confiável, habilitar gates + política, sincronizar main e deixar
GitHub tentar automaticamente. Sem intervenção manual recorrente; sem mudar faturamento.

## Verificação

- **323/323** testes de lógica locais: 312 anteriores preservados + 11 novos testes de
  recuperação/idempotência/custo/tags/releases. Sem falhas ou pulos. Não são Windows.
- `actionlint` 1.7.12 validou os três workflows, binário conferido por SHA-256.
- [41167799466](https://github.com/oaovito/oao-companion-/actions/runs/41167799466), código
  `034133d`: 292 unitários, 16 integração e 29 E2E Windows passaram; três formatos gerados,
  portátil abriu/vigia/atalho funcionaram. É evidência anterior, não valida o HEAD atual.
- [41206258451](https://github.com/oaovito/oao-companion-/actions/runs/41206258451), `e4dee80`:
  1.043 animações Windows sem erros/recortes/quadros parados/falta de gatilho, média
  0,31 ms/quadro; E2E teve uma asserção de maiúscula corrigida depois.
- [41214891976](https://github.com/oaovito/oao-companion-/actions/runs/41214891976), `6d8d45d`:
  30 cenários engine + dez Central com modelo REAL passaram. Falas lidas; ainda houve
  ajustes posteriores de recusa/tempo/retomada, que exigem nova execução Windows.
- Detalhes de conversa: `docs/CONVERSA_WINDOWS.md`. Não afirmar perfeição semântica
  universal ou teste Windows 11 físico/DPI/suspensão a partir de runner de um monitor.

## Continuidade

1. Finalizar instalação do controle na branch padrão preservando README/histórico.
2. Registrar tentativa de dispatch, sem alocar runner com custo não confirmado.
3. Após confirmação do limite pago zero e quando GitHub aceitar jobs, deixar o controle
   disparar a validação real, corrigir falhas técnicas com evidências quando houver sessão
   Codex e publicar só depois de TODOS os gates. Não há agente IA contínuo no Actions.
4. Confirmar três arquivos públicos 0.44.0, hashes/notas incrementais/atualizador e as
   17 releases históricas intactas. Até lá a release permanece bloqueada.

Resultado da instalação/primeira tentativa deve ser acrescentado ao fim deste documento.
