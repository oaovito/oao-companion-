# Troca dinâmica de visuais

O JoJo troca sozinho de visual conforme o contexto, só entre visuais que ela **já tem direito de usar**.
Não é sorteio e não usa o modelo de linguagem: é um motor de pontuação determinístico, movido a eventos.

Código: `src/core/visuais-dinamicos.js` (motor puro) e `src/core/companion-loja.js` (ligação com o JoJo).
Testes: `test/unit/visuais-dinamicos.test.js`.

## Três conceitos separados

| Conceito | O que é | Onde fica |
|---|---|---|
| Nível | O que o personagem alcançou; libera visuais de nível | `progress` |
| Direito de uso | Visual liberado pelo nível ou comprado na loja | `visuaisLiberados` + `loja.looks()` |
| Aparência do momento | O que ele está vestindo agora | `companion.visualMomento` (memória, nunca grava o visual salvo dela) |

O visual que ela escolheu no guarda-roupa (`visualNivel`) nunca é alterado pelo motor. Bloqueado nunca
entra na lista de candidatos (`catalogarVisuais`). Se um visual deixa de ser autorizado, ele sai na hora
(motivo `desautorizado`).

## Metadados de cada visual

`catalogarVisuais({ liberados, lojaLooks })` monta a lista de candidatos com `id`, `nome`, `origem`
(`nivel` ou `loja`), `parte`, `inteiro` (fantasia inteira) e `contextos`. Os contextos (50, lista em
`CONTEXTOS`) vêm de `inferirContextos`, que lê o tipo, a obra, o nome e a parte da referência (ex.:
anime → `anime`; "óculos de cientista" → `ciencia`). Os looks da loja trazem os contextos do catálogo.

## Sinais (eventos)

- Conversa: `contextosDoTexto` (ex.: "vou estudar pra prova de física" → estudo, ciência, pesquisa).
- App em primeiro plano: `contextosDoApp` (só a categoria, nunca a tela).
- Eventos do JoJo: `contextosDoEvento` (jogo, vitória, refeição, fim do trabalho etc.).
- Horário: `contextosDoHorario` (manhã, tarde, noite e fim de semana).
- Nível novo: conquista, nível, celebração.

Cada sinal tem força e decai com meia-vida de 15 min (teto 6 por contexto).

## Estabilidade

`MOTOR_PADRAO`:

| Regra | Valor | Para quê |
|---|---|---|
| Limiar | 1,2 | Contexto fraco não troca nada |
| Histerese | 0,35 | O novo precisa ganhar do atual com folga |
| Intervalo mínimo entre trocas | 4 min | Sem trocas seguidas |
| Permanência mínima | 12 min | Visual novo fica um tempo |
| Reuso | 45 min | Sem pingue-pongue A → B → A |
| Espera por janela segura | até 2 min | Só troca parado, andando ou olhando em volta (nunca no meio de uma animação) |

Sem contexto forte, ele volta ao visual dela (motivo `semContexto`). Visual comprado recebe destaque
temporário no motor (prioridade maior por 30 min, mais um sinal de celebração). O histórico de uso (até 200 visuais) fica na carteira para
variar entre visuais do mesmo contexto.

## Controles dela

Na loja da Central: **Troca automática** liga/desliga (`visualAuto`) e **Fixar visual** escolhe um
(`visualFixo`). Fixar e desligar vencem qualquer contexto. Modo Trabalho, foco e tela cheia seguem as
regras de sempre.

## Verificado por teste

- Só autorizados (nível atual e compras); bloqueado nunca entra.
- Histerese, permanência, intervalo e janela segura.
- Fixar, desligar e visual que deixa de ser autorizado.
- 10 mil pedidos de troca aleatórios: só autorizados, trocas espaçadas, sem pingue-pongue dentro de
  45 min, entre 20 e 2.000 trocas.
- No JoJo de verdade: o visual comprado vira o do momento por contexto, chega ao desenho e o visual
  salvo dela fica intacto; desligar volta ao dela.
