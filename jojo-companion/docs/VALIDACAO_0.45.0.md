# Validação e publicação — JoJo Companion 0.45.0

Publicada em 02/11/2026: https://github.com/oaovito/jojo-companion-releases/releases/tag/v0.45.0
Fonte/tag privada: **9c213f494602329f4ebc7bbf9f8fa719a1368f1a**, branch codex/living-companion.
Actions integral: https://github.com/oaovito/oao-companion-/actions/runs/41383430244

## Resultados reais

GitHub-hosted Windows x64 10.0.26100, Node 22.23.4. TODOS os gates obrigatórios
passaram no mesmo run/commit: preflight, lint, instalação, **411 unitários**,
**31 engine +12 Central com Gemma 3 4B real**, build, NSIS instalado/iniciado/
desinstalado e três atualizações (atalho/dados preservados), portátil, vigia,
**16 integrações nativas**, **40 E2E**, **1.268 animações**, desempenho,
nomes/tamanhos/hashes, compatibilidade do atualizador e notas incrementais.
GPU/pesquisa opcionais também passaram. Nenhuma suíte obrigatória pulada.

As 43 falas foram recuperadas dos logs, digest conferido e lidas. Evidências:
[evidencias/windows-41383430244.json](evidencias/windows-41383430244.json) e
[evidencias/conversa-windows-41383430244.json](evidencias/conversa-windows-41383430244.json).
Digest do conteúdo da conversa: **939b0ec5032e8ae84f81763783f5ceb37a0a7049f1a1c801ea7cf8ebac491005**.
Isso comprova esses cenários, não perfeição geral, precisão clínica ou teste em PC
físico Windows 11/múltiplos monitores. DD foi testado com fixture nativa, não com
uma instalação comercial do jogo. Medição real desta arte está importada no rig.

## Agenda somente por link

Correção explícita do usuário substituiu autenticação: sem ID Apple, senha ou
secrets iCloud. Link iCal Google/iCloud nas Configurações ou no chat, GET sem
Authorization/cookies; último sucesso persistente, erros e vazia distintos,
coalescência e respostas antigas descartadas após desconexão. Sete regressões novas
e cenário completo na interface Windows. Diagnóstico **41383073847** aprovou os
11 cenários novos antes do pipeline integral. HTTP de agenda usa servidor local
com eventos sintéticos; não foi acessada a agenda pessoal de alguém.

## Distribuição e atualização

O publicador verificou upload/nomes/tamanhos/SHA-256, concluiu o rascunho somente
com os três arquivos e baixou os três anonimamente para conferir integridade.
Depois confirmou o UpdateChecker nos modos portable/installer. Uma segunda
consulta independente ao endpoint público sem cabeçalho de login confirmou
**0.44.0 → 0.45.0** nos dois modos, com o nome/hash correto do executável.
Não significa que a atualização já tenha sido instalada no PC da usuária.

| Arquivo | Bytes | SHA-256 |
| --- | ---: | --- |
| JoJoCompanion.exe | 103505584 | ab442cab7463d9a5e2cb82f8f407f10476f73058602eaccbbd10c00c792923ea |
| JoJoCompanion-Setup-0.45.0.exe | 113305067 | d7099f82b3f4df78f6e66c4520bec2f1e274f45c6f859f8ecaea975ea745a201 |
| JoJoCompanion-0.45.0-win-x64.zip | 144233512 | 5368b3c603ed7af8e69721f12c5009c66f158cf9d47c8221c2cdb0876b167bbf |

Notas públicas conferem exatamente com a seção incremental 0.45.0 do changelog.
Existem 19 releases; as **18 anteriores** foram comparadas com o snapshot anterior
(ID/tag/nome/texto/publicação/destino e IDs/nomes/tamanhos/digests/datas dos assets):
permanecem iguais. Nenhuma release ou tag histórica reescrita. Público contém
somente os três binários e notas; código permanece no repositório privado.

## Automação, custos e limites

Política oficial e controle na main: 0.45.0 /codex/living-companion, cron 17 * * * *.
Controle **82519f8** preserva main como controle; fonte continua na Codex.
Run de controle **41383548680** reconheceu pipeline ativo e não duplicou o build.
Somente GitHub oficial; MNE_Lab intocado. Não existe IA contínua em segundo plano.

API timing deste run: WINDOWS total_ms=0; duração 2.233.000 ms. Nenhum serviço,
plano, cartão ou limite foi alterado. A API financeira segue inacessível; isso
não equivale a consultar a fatura ou confirmar orçamento pago zero.
A quota de artefatos CI continua esgotada (zero uploads retidos), mas os arquivos
OFICIAIS estão íntegros no canal público. Relatório/hashes estão nos logs privados
e nos arquivos acima. Nenhum armazenamento contratado/artefato histórico apagado.
