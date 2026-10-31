# Conversa real no Windows — evidências da avaliação

[Execução 41214891976](https://github.com/oaovito/oao-companion-/actions/runs/41214891976),
código `6d8d45d`: **30 cenários no engine e dez na Central aprovados**. Modelo real:
Gemma 3 4B (`gemma3:4b-it-q4_K_M`), manifesto
`68ceab7e468a31c988b44d5a4984a0e21f58c4f7158c6ce29c1804babac38df7`.
Não era o modelo padrão daquele commit: o ensaio selecionou explicitamente o candidato.
Relatório com todas as falas: [JSON](conversa-windows-41214891976.json).

Windows runner 10.0.26100, aproximadamente 8 GB de RAM e duas CPUs. Pesos carregados
em 10,985 s; respostas livres no engine: mediana 10,770 s, faixa 3,469–24,945 s.
Não são medições do PC da usuária, que informou 16 GB ou mais. Respostas protegidas
(identidade, criador, provocações e segurança) são programadas, como exige o produto;
as demais conversas exigiram o modelo real, sem servidor simulado ou alternativa em nuvem.

## Revisão das falas

Foram lidas as 40 saídas. Identidade/João não contaminaram os outros assuntos;
preferências e correções recentes foram lembradas, português/inglês respeitados,
ciência e exemplo abordaram o mecanismo da glicose/insulina, e provocações não
geraram ameaças. Reações corresponderam a tristeza, sucesso, falha e assunto técnico.
Uma rodada anterior detectou exemplo sem expressão técnica; a correção foi verificada
nesta execução pela interface e pelo engine.

Ainda houve linguagem pouco natural em uma recusa de treino (“sem formalidades”),
resolvida depois com confirmação direta da negativa. A definição científica chegou perto
do limite de 25 s; explicações posteriores foram encurtadas. O último ajuste também
preserva a primeira pergunta durante retomada do modelo após inatividade e mantém
urgências imediatas. Essas mudanças finais têm regressões locais, mas **ainda aguardam
CI Windows e nova revisão do texto real**. Não usar as contagens deste documento para
afirmar perfeição geral ou aprovação integral do HEAD/versão 0.44.0.

## Bloqueio de execução final

[41216548528](https://github.com/oaovito/oao-companion-/actions/runs/41216548528) não iniciou
runner. Anotação do GitHub: “The job was not started because recent account payments
have failed or your spending limit needs to be increased. Please check the 'Billing &
plans' section in your settings”. Regularização depende do titular da conta.

Nenhuma nova tag/release criada; público permanece em 0.43.1. Depois da liberação,
reexecutar os gates Windows no código final, ler as falas e só então seguir a publicação
por tag. Não gerar binários Linux, renomear binários antigos ou reduzir gates para contornar.
