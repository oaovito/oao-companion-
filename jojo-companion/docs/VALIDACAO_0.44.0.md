# Validação e distribuição — v0.44.0

Publicada em 01/11/2026, 01h41 de Brasília.
[Release pública](https://github.com/oaovito/jojo-companion-releases/releases/tag/v0.44.0).
[Execução Windows](https://github.com/oaovito/oao-companion-/actions/runs/41272098380).
Fonte/tag privada: `98307814426c79ac7e187c3564d94f9a57a2ecf6`,
branch `codex/conversation-coherence`, Node 22.23.4, Windows x64 em GitHub-hosted (2 CPUs/8 GB).

## Resultados efetivos

- 330 unitários, 16 integrações Windows e 29 E2E aprovados, sem pulos.
- Gemma 3 4B real: 31 cenários no engine + 12 na Central, sem erros de renderer.
- 1.043 animações: zero erros, recortes, paradas e gatilhos ausentes; 0,3253 ms/quadro.
- NSIS instalado, aplicativo aberto e desinstalado em perfil isolado. Portátil, vigia,
  desempenho, arquivos, notas e compatibilidade do atualizador aprovados.
- Capturas da Central e de poses intermediárias inspecionadas; única conversa preservada.
- Downloads públicos sem login: nomes, tamanhos, MZ/PK e SHA-256 conferidos novamente
  em 2026-11-01T12:39:16.118Z (UTC), além da verificação feita pelo publicador Windows.
- UpdateChecker consultou API pública nos modos portable/installer: 0.43.1 detecta
  0.44.0 com hash correto; 0.44.0 não recebe novamente a mesma versão.
- IDs, notas e IDs/nomes/tamanhos/digests de assets das 17 releases anteriores
  iguais ao snapshot inicial. Nenhuma edição histórica; agora são 18 releases.

## Arquivos publicados

| Arquivo | Bytes | SHA-256 |
| --- | ---: | --- |
| JoJoCompanion.exe | 102180344 | `9f0bd3a35def257596e3c369b99d453e15fd66c2c1b990bfc3816bb6fb5144c9` |
| JoJoCompanion-Setup-0.44.0.exe | 111696992 | `56e6a73bb898aadd22a13975c20f47905ff82bf47807238eb23195840e840aa0` |
| JoJoCompanion-0.44.0-win-x64.zip | 142509427 | `b234c07b1a72a73756fd15d5fd83474c3bd771f1193612168f0511a59b680f7d` |

## Automação e custo observado

GitHub Actions oficial é o único CI/CD. Recuperação `17 * * * *`, com concorrência
e idempotência. [Run agendado 41292825226](https://github.com/oaovito/oao-companion-/actions/runs/41292825226)
passou sem reconstruir/republicar a versão existente; GitHub pode atrasar cron.
As APIs `/timing` do Windows final e desse controle informaram zero ms faturáveis.
Não foram alterados limites/planos/cartões ou contratados serviços. API de faturamento
negada por 403; não alegar auditoria da fatura inteira nem inventar limite confirmado.

## Limites da evidência

As 43 falas foram lidas para conferir continuidade, correções, identidade, negativas
e reações. Exemplos técnicos são explicações resumidas de um modelo generativo;
checagens lexicais e esta revisão não provam perfeição semântica ou precisão clínica
universais. No runner de duas CPUs, definição/exemplo com fonte: 21,684/17,262 s;
exemplo na Central sem fonte: 24,276 s. Não prometer latência idêntica em outro PC.

Não foi teste em Windows 11 físico: DPI misto, suspensão, desconexão de monitores
e troca de instalação no computador do usuário não foram exercitados nesta sessão.
Nenhum acesso/modificação ao MNE_Lab foi feito. Código segue privado; o público
recebeu somente os três binários e as notas incrementais da nova versão.
