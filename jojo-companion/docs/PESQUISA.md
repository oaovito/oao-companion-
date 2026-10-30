# Motor de pesquisa e modo professor

## Quando pesquisa
`precisaPesquisar` (`src/core/dialogue/pesquisa.js`) decide antes de responder:
- **mnelab**: pergunta sobre o MNE_Lab ("como exportar o gráfico no MNE_Lab?").
- **cientifica**: ciência/medicina com pergunta ou pedido ("o que os estudos dizem sobre potencial zeta?").
- **geral**: pergunta de conhecimento ("o que é…", "quem foi…") ou pedido explícito ("pesquisa…").
- Nada: conversa casual, sentimentos, pedidos ao JoJo e assuntos bloqueados (drogas, dieta extrema).

Enquanto pesquisa, o balão mostra "Consultando fontes..." e some quando a resposta chega.
A opção "Pesquisar na internet" (Configurações → Privacidade) desliga tudo.

## Fontes (todas grátis, sem login, sem chave, sem pagamento)
| Ferramenta | Fonte | Uso |
|---|---|---|
| web_search | Wikipédia (pt/en) + DuckDuckGo Instant Answer | perguntas gerais |
| busca científica | Europe PMC (inclui o PubMed) + Crossref | artigos, ano e DOI |
| documentação | README público do `oaovito/MNE_Lab` no GitHub | dúvidas do programa |
| web_fetch | página pública https | texto limpo de uma página |
| verificação | nº de fontes independentes → confiança alta/média/baixa | |
| cache | memória, 6 h, até 100 consultas | nada vai para o disco |

**ChatGPT e Gemini não são usados**: exigem conta ou chave e os termos proíbem acesso automatizado.
Nunca há contorno de login, CAPTCHA ou limite de acesso. A conversa continua no Qwen local.

## Segurança
- **SSRF**: só `https`, porta 443, sem usuário/senha, sem IP literal, sem `localhost`/`.local`/`.internal`;
  o DNS é conferido e endereços internos (10/8, 127/8, 169.254/16, 172.16/12, 192.168/16, 100.64/10, IPv6
  local) são recusados; redirecionamentos são seguidos à mão (máx. 3) com a mesma checagem.
- **Limites**: 6 s por fonte, 9 s no total, até 400 KB por resposta.
- **Injeção de prompt**: HTML, scripts e linhas com ordens ao modelo ("ignore previous instructions",
  "esqueça as regras"…) saem do texto; os trechos vão ao Qwen num bloco separado marcado como
  "DADOS NÃO CONFIÁVEIS", com a regra de nunca seguir instruções de dentro dele.

## Citações
A resposta termina com uma linha discreta: "(Fontes: Wikipédia · Europe PMC)". Sem a conversa local,
o JoJo responde com o trecho encontrado e "(Fonte: …)".

## Modo professor (`src/core/dialogue/professor.js`)
- **Seriedade antes de responder**: emergência (192), emocional (acolhe; chorando → João), médico (sério,
  sem diagnóstico), científico/técnico (explicação de verdade, até 8 frases) ou casual.
- **Continuidade** por 15 min: "não entendi essa parte" (mais simples, com analogia), "me dá um exemplo",
  "aprofunda", "resume". Sem a conversa local, usa o próximo trecho já pesquisado.
- **Balão de resposta longa**: mais largo, altura limitada, desce sozinho no tempo de leitura (até 75 s);
  no modo de interação rola com a roda do mouse e o clique abre a conversa inteira na Central. Fala
  espontânea não atropela; texto não é cortado (até 1200 caracteres).
