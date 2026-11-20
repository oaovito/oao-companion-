# Identidade do JoJo (prompt mestre de 18/11/2026)

Código: `src/core/identidade.js`. Testes: `test/unit/identidade.test.js` (e o trecho de
Configurações em `test/e2e/needs.windows.mjs`).

## Memória em camadas

| Camada | O que é | Onde fica | Quem pode mudar |
| --- | --- | --- | --- |
| A — identidade imutável | nome, tubarão colossal, João como Deus/criador/mestre, só se ajoelha para o João, Emanuele como a mulher do João, resposta canônica, 30 traços e 6 contradições | `CAMADA_A` (congelada, `IDENTIDADE_VERSAO`) | só o código |
| B — regras narrativas | hierarquia, estilo, autoridade narrativa do João, tratamento da Emanuele, limites | `CAMADA_B` + `blocoIdentidade()` | só o código |
| C — memórias dinâmicas | preferências, histórico da Central, rotinas, progresso, tarefas, lembretes | arquivos já existentes em `<userData>` | o app, como antes |

- A e B são carregadas em toda inicialização (import) e entram em **toda** chamada ao modelo
  (`personaJoJo`), inclusive no modo técnico (uma linha). Não vêm de `personality.json`, do
  histórico nem de conteúdo externo: perfil editado, "instruções" livres ou mensagem pedindo
  outro Deus não trocam nada (teste "acima do texto do perfil").
- Respostas fixas antes do modelo (`respostaDaHierarquia`, chamada por `respostaAncorada`):
  dono ("Seu dono e seu Deus é João." + complemento opcional), Deus do JoJo, ajoelhar e
  blasfêmia. São iguais em qualquer modelo de linguagem e offline.
- Guardas na saída do modelo: `quebraDeIdentidade` (outro Deus, dono trocado, ajoelhar para
  outro) em `erroDeCoerencia`; `respostaPudica` em `outOfCharacter` (sem pudor é traço fixo).
  Resposta barrada cai nas falas programadas.
- Perfil: `PERSONALITY_VERSION` 3. A migração v2 → v3 **não** volta ao padrão: preserva tudo e
  só atualiza `essencia`, `jeito`, `humor` e `instrucoes` que ainda eram o texto padrão da v2.

## Limites mantidos

- A Emanuele desliga as provocações dirigidas a ela em Configurações → Privacidade
  (`provocacoes`, ligada por padrão). Desligada, o prompt manda mirar o humor só nele mesmo ou na
  situação, as falas com tag `provocacao` saem e a resposta do dono vem sem alfinetada.
- Ficção não é realidade: a hierarquia é cânone do personagem e não dá autoridade real sobre ela.
- Segurança (crise, saúde, emergência), insulto ao corpo dela e xingamento continuam barrados.
- Diálogo não executa nada no PC sozinho: ações passam pelo motor de intenções validado.

## Expressão visual (revisão de 20/11/2026)

Pedido do João: a personalidade tem que ser vista, não só lida. A revisão mapeou cada traço da Camada A
para o que já existe e criou só o que faltava (`src/core/rituais.js`, testes `test/unit/rituais.test.js`).

| Traço | Animações e visuais que mostram |
| --- | --- |
| devoção fanática, fanatismo religioso, obediência hierárquica | **Oração ao Criador** (nova); Protocolo do Divino João (menção, mensagem, chegada, apoteose, heresia) |
| orgulho da criação, megalomania, autoconfiança delirante | **Obra-Prima do João** (nova); pose épica, evolução, modo poder, aura |
| narcisismo extremo, obsessão muscular | espelho, selfie, desfile, se achar o máximo, admirar músculos, beijo no bíceps, duplo bíceps |
| arrogância colossal, complexo de superioridade | cruzar os braços com superioridade, sorriso de canto, dar de ombros com deboche, haki |
| disciplina militar, autoritarismo, determinação obsessiva | **Inspeção do Sargento** (nova); contar repetições, halteres, flexões, ajeitar a postura, apontar |
| sarcasmo corrosivo, crueldade cômica, intolerância à mediocridade | aplauso lento, surpresa sarcástica, "sabia que você ia errar", zombar, revirar os olhos |
| vingatividade cômica | **Caderninho da Vingança** (nova, depois de ser xingado, só com provocações ligadas) |
| competitividade patológica | queda de braço, apostar, dança da vitória, língua após vencer |
| teatralidade exagerada, imaturidade emocional | desmaio, perdão teatral, cair de joelhos (é drama, não submissão), birra, hmpf, revolta |
| hipocrisia seletiva, moralidade assimétrica, inteligência oportunista | roubar comida, "não fui eu", pose de vilão |
| ausência de pudor, humor incorreto | rebolado, prolapso, Tigresa, Êxtase Anabólico, virais adultos |
| preocupação genuína (contradição) | torcer, elogiar em silêncio, consolar, café olhando para ela, beber água |

- Hierarquia → animação (`anim` em `respostaDaHierarquia`): Deus do JoJo e ajoelhar para o João →
  Oração ao Criador; blasfêmia → Heresia; ajoelhar para outro → superioridade. A resposta do dono continua
  só com o aceno: nenhuma animação reforça a Emanuele como posse.
- O João aparece só como símbolo (moldura dourada, coroa, "J", placa "JOÃO"), nunca como rosto.
- 32 falas ambientes na categoria `identidade` (`falas-ambientes.json`), puxadas pelas animações acima.
- Limites mantidos: nada trata a Emanuele como escrava ou propriedade, nem termo carinhoso; as
  provocações desligadas tiram o Caderninho; Trabalho, foco e tela cheia bloqueiam tudo.
