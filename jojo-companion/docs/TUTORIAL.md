# Tutorial

O JoJo conduz o tutorial na voz dele, com balão e aceno, sem som. Cada função
tem de 1 a 4 passos curtos e numerados: explica, mostra como ativar e manda
testar com um exemplo real. Quando ela faz o que o passo pede, ele elogia e
segue sozinho; "próximo" sempre avança.

## Fonte única

`assets/tutorial/pt-BR.json`. Cada função declara os comandos (`comandos`) e as
chaves de configuração (`configuracoes`) que ensina. `test/unit/tutorial.test.js`
falha se:

- um comando do menu `/` ou qualquer comando reconhecido em
  `src/core/conversations.js` não estiver em nenhuma função;
- um campo da tela de Configurações não estiver em nenhuma função;
- uma das 12 utilidades, o pet, o balão de status, o movimento reduzido, as
  animações do foco ou o bloqueio do Discord ficar sem função;
- uma função não tiver exemplo para testar, ou o exemplo não funcionar de
  verdade (o teste percorre o tutorial inteiro executando cada exemplo).

Função nova no app: acrescente o comando ou a configuração e uma entrada no JSON.

## Como abre

- **Instalação nova:** abre sozinho uns 9 s depois da saudação, com a conversa aberta.
- **Quem já usava:** recebe um convite, uma vez. Nada abre sozinho.
- Nunca no Modo Trabalho, no foco, em jogo, em tela cheia, em pausa ou no modo
  silencioso: espera a próxima verificação (a cada minuto).
- `/tutorial` (ou `/ajuda`) e bandeja → "Tutorial": começa ou continua.

## Navegação

| Na conversa | Comando | Efeito |
|---|---|---|
| próximo | `/tutorial proximo` | passo seguinte |
| voltar | `/tutorial voltar` | passo anterior (ou fim da função anterior) |
| pular | `/tutorial pular` | pula a função; fica listada para depois |
| pausar | `/tutorial pausar` | guarda o lugar |
| | `/tutorial` | retoma de onde parou |
| | `/tutorial lista` | funções, com ✓ nas já vistas |
| | `/tutorial foco` | só aquela função, sem mexer na ordem geral |
| | `/tutorial sair`, `/tutorial recomeçar` | encerra por agora; começa do zero |

O progresso fica salvo junto do progresso dela. Fechar o app no meio deixa o
tutorial pausado no mesmo passo.

## Limites

- Movimento reduzido: o balão e os passos são iguais; o aceno vira pose.
- Modo Trabalho e tela cheia: os passos ficam na conversa, sem balão.
- O passo do bloqueio do Discord só mostra o estado (`/discord`); o tutorial
  nunca liga a chave.
- Em teste automatizado do app (`JOJO_TEST=1`) a abertura automática fica desligada.
