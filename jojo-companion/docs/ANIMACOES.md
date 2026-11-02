# Catálogo de animações do JoJo

Gerado por `scripts/catalog-doc.mjs` a partir de `assets/catalog/animacoes.json` (270 animações únicas, cada uma em 3 intensidades: discreta, normal e exagerada).

## Como disparar

- **Qualquer animação:** no chat, `/anim <nome ou id>` (ex.: `/anim selfie`, `/anim modo fera`).
- **Por frase:** frases listadas em “Gatilho” (ex.: “faz uma dancinha”, “selfie”, “modo fera”) ou “faz/mostra <nome>”.
- **Sozinho:** as marcadas com “sorteio ambiente” entram no motor de variedade (Configurações → Animações e estímulos).
- **Eventos:** cliques, arrasto, conversa, lembretes, ausência etc., como indicado.
- **Movimento reduzido:** todas viram quadro estático (o quadro do meio da animação).

Frequência: comum (peso 10), rara (2.5), easter egg (0.35). Para mudar a frequência de uma animação, troque `frequencia` no JSON; para tirar do sorteio, `gatilho.ambiente: false`.

## Estados base

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Idle respirando** (`idle`) | Base 1; Ambiente 1 | sorteio ambiente; /anim idle | — | não | comum |
| **Piscar** (`piscar`) | Base 2 | sorteio ambiente; /anim piscar | 1,2 s | não | comum |
| **Piscar lentamente** (`piscarLento`) | Ambiente 3 | sorteio ambiente; /anim piscarLento | 1,8 s | não | comum |
| **Olhar ao redor** (`olharRedor`) | Base 3 | sorteio ambiente; /anim olharRedor | — | não | comum |
| **Bocejar mostrando todos os dentes** (`bocejar`) | Base 4; Sem pudor 50; Ambiente 33, 101 | sorteio ambiente (tarde, noite); /anim bocejar | 2,8 s | não | comum |
| **Cochilar** (`cochilar`) | Base 5 | sorteio ambiente (tarde, noite, madrugada); /anim cochilar | 5,2 s | não | comum |
| **Dormir profundo** (`dormirProfundo`) | Base 6 | /anim dormirProfundo | — | não | comum |
| **Acordar** (`acordar`) | Base 7 | /anim acordar | — | não | comum |
| **Espreguiçar** (`espreguicar`) | Base 8; Ambiente 34 | sorteio ambiente (manha); /anim espreguicar | 3,0 s | não | comum |
| **Balançar suavemente** (`balancar`) | Base 9 | sorteio ambiente; /anim balancar | 4,0 s | sim | comum |
| **Flutuar parado respirando fundo** (`flutuar`) | Base 10; Ambiente 1 | sorteio ambiente; /anim flutuar | 4,0 s | sim | comum |
| **Balançar os pés devagar** (`caudaDevagar`) | Ambiente 2 | sorteio ambiente; /anim caudaDevagar | 4,0 s | não | comum |
| **Mexer as guelras** (`guelras`) | Ambiente 4 | sorteio ambiente; /anim guelras | 3,0 s | não | comum |
| **Girar o corpo de leve** (`giroLeve`) | Ambiente 5 | sorteio ambiente; /anim giroLeve | 3,0 s | não | comum |
| **Soltar bolhas ocasionais** (`bolhas`) | Ambiente 6 | sorteio ambiente; /anim bolhas | 3,0 s | não | comum |

## Atenção e processamento

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Ouvindo** (`ouvindo`) | Base 11 | abrir a conversa; /anim ouvindo | 2,6 s | não | comum |
| **Pensando** (`pensando`) | Base 12 | resposta demorando; /anim pensando | 2,6 s | não | comum |
| **Processando** (`processando`) | Base 13 | processando; /anim processando | 3,0 s | sim | comum |
| **Escrevendo/digitando** (`digitando`) | Base 14 | sorteio ambiente; /anim digitando | 3,2 s | não | comum |
| **Fingir que está trabalhando também** (`fingirTrabalhar`) | Ambiente 46 | sorteio ambiente; /anim fingirTrabalhar | 3,6 s | não | comum |
| **Pesquisando** (`pesquisando`) | Base 15 | pesquisa na internet; /anim pesquisando | 3,0 s | não | comum |
| **Lendo** (`lendo`) | Base 16, 95 | sorteio ambiente; “le um livro”; “vai ler”; “ler um livro”; /anim lendo | 4,2 s | não | comum |
| **Tarefa concluída** (`tarefaConcluida`) | Base 17 | resposta da pesquisa; /anim tarefaConcluida | 2,2 s | não | comum |
| **Confuso** (`confuso`) | Base 18 | sorteio ambiente; /anim confuso | 2,4 s | não | comum |
| **Curioso (inclinar a cabeça)** (`curioso`) | Base 19; Ambiente 13 | sorteio ambiente; /anim curioso | — | não | comum |
| **Seguir o cursor com o olhar** (`seguirOlhar`) | Base 20; Ambiente 12 | sorteio ambiente; /anim seguirOlhar | 3,0 s | não | comum |
| **Parar e encarar o usuário** (`encarar`) | Ambiente 10 | sorteio ambiente; /anim encarar | 3,0 s | não | comum |
| **Olhar para a tela como se lesse junto** (`lerJunto`) | Ambiente 11 | sorteio ambiente; /anim lerJunto | 3,6 s | não | comum |

## Emoções positivas

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Feliz** (`feliz`) | Base 21 | sorteio ambiente; /anim feliz | — | não | comum |
| **Animado** (`animado`) | Base 22 | sorteio ambiente; /anim animado | 2,4 s | não | comum |
| **Pulo de alegria** (`puloAlegria`) | Base 23 | sorteio ambiente; /anim puloAlegria | 2,0 s | não | comum |
| **Risada** (`risada`) | Base 24 | sorteio ambiente; /anim risada | 2,4 s | não | comum |
| **Sorriso suave** (`sorrisoSuave`) | Base 25 | sorteio ambiente; /anim sorrisoSuave | 2,4 s | não | comum |
| **Orgulhoso** (`orgulhoso`) | Base 26 | sorteio ambiente; /anim orgulhoso | 2,8 s | não | comum |
| **Apaixonado** (`apaixonado`) | Base 27 | sorteio ambiente; /anim apaixonado | 3,2 s | não | comum |
| **Grato** (`grato`) | Base 28 | “obrigad”; “valeu jojo”; /anim grato | 2,4 s | não | comum |
| **Aplaudir** (`aplaudir`) | Base 29; Ambiente 98 | sorteio ambiente; "consegui", "terminei"…; /anim aplaudir | 2,2 s | não | comum |
| **Comemorar** (`comemorar`) | Base 30 | atualização instalada; “comemora”; “bora comemorar”; /anim comemorar | 2,6 s | não | comum |
| **Dancinha** (`dancinha`) | Base 31 | sorteio ambiente; “dancinha”; “danca”; “dança”; /anim dancinha | 3,6 s | não | comum |
| **Brilho nos olhos** (`brilhoOlhos`) | Base 32 | sorteio ambiente; /anim brilhoOlhos | 2,2 s | não | comum |
| **Contentamento** (`contente`) | Base 33 | sorteio ambiente; /anim contente | 3,2 s | sim | comum |
| **Aliviado** (`aliviado`) | Base 34 | —; /anim aliviado | 2,4 s | não | comum |
| **Empolgado** (`empolgado`) | Base 35 | sorteio ambiente; /anim empolgado | 2,6 s | não | comum |

## Emoções negativas e suaves

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Triste** (`triste`) | Base 36 | /anim triste | — | não | comum |
| **Chorar cachoeira** (`chorando`) | Base 37; Sem pudor 68 | sorteio ambiente; /anim chorando | 3,4 s | não | rara |
| **Decepcionado** (`decepcionado`) | Base 38 | /anim decepcionado | 2,6 s | não | comum |
| **Preocupado** (`preocupado`) | Base 39; Ambiente 106 | 90 min sem parar; /anim preocupado | 2,8 s | não | comum |
| **Ansioso** (`ansioso`) | Base 40 | /anim ansioso | 2,6 s | não | comum |
| **Nervoso** (`nervoso`) | Base 41 | /anim nervoso | 2,4 s | não | comum |
| **Envergonhado** (`envergonhado`) | Base 42 | /anim envergonhado | 2,6 s | não | comum |
| **Entediado** (`entediado`) | Base 43 | sorteio ambiente; /anim entediado | 3,6 s | não | comum |
| **Irritado leve** (`irritadoLeve`) | Base 44 | /anim irritadoLeve | 2,6 s | não | comum |
| **Frustrado** (`frustrado`) | Base 45 | erro na conversa; /anim frustrado | 2,6 s | não | comum |
| **Assustado** (`assustado`) | Base 46 | /anim assustado | 1,8 s | não | comum |
| **Surpreso** (`surpreso`) | Base 47 | /anim surpreso | — | não | comum |
| **Chocado** (`chocado`) | Base 48 | /anim chocado | 2,0 s | não | comum |
| **Cansado** (`cansado`) | Base 49 | sorteio ambiente (noite, madrugada); /anim cansado | 2,8 s | não | comum |
| **Solitário** (`solitario`) | Base 50 | 45 min sem interagir (no máximo a cada 2 h); /anim solitario | 3,4 s | não | comum |

## Social e gestos

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Acenar (oi)** (`acenar`) | Base 51 | cumprimento; /anim acenar | — | não | comum |
| **Tchau** (`tchau`) | Base 52 | despedida; /anim tchau | 2,0 s | não | comum |
| **Abraço** (`abraco`) | Base 53 | “abraco”; “abraço”; “me abraca”; “me abraça”; /anim abraco | 3,0 s | não | comum |
| **Coração com as mãos** (`coracao`) | Base 54; Sem pudor 22 | sorteio ambiente; “manda um coracao”; “manda coração”; “faz um coracao”; “faz coração”; /anim coracao | 2,6 s | não | rara |
| **High five** (`highFive`) | Base 55 | “high five”; “toca aqui”; “bate aqui”; /anim highFive | 1,8 s | não | comum |
| **Piscadinha** (`piscadinha`) | Base 56; Sem pudor 10; Ambiente 62 | sorteio ambiente; /anim piscadinha | 1,8 s | não | comum |
| **Assentir (sim)** (`assentir`) | Base 57 | /anim assentir | — | não | comum |
| **Negar (não)** (`negar`) | Base 58; Sem pudor 54 | “faz isso”; “faz pra mim”; /anim negar | 2,0 s | não | comum |
| **Dar de ombros** (`ombros`) | Base 59 | sorteio ambiente; /anim ombros | 1,8 s | não | comum |
| **Apontar** (`apontar`) | Base 60 | /anim apontar | 1,8 s | não | comum |
| **Convidar para algo** (`convidar`) | Base 61 | sorteio ambiente; /anim convidar | 2,2 s | não | comum |
| **Pedir desculpas** (`desculpas`) | Base 62 | “pede desculpa”; “pede perdao”; “pede perdão”; /anim desculpas | 2,4 s | não | comum |
| **Agradecer** (`agradecer`) | Base 63 | /anim agradecer | 2,2 s | não | comum |
| **Cumprimentar** (`cumprimentar`) | Base 64 | abrir de manhã; /anim cumprimentar | 2,0 s | não | comum |
| **Consolar o usuário** (`consolar`) | Base 65 | /anim consolar | — | não | comum |

## Reações a eventos

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Tarefa finalizada** (`tarefaFinalizada`) | Base 66 | "consegui", "terminei"…; /anim tarefaFinalizada | 2,6 s | não | comum |
| **Erro ocorrido** (`erro`) | Base 67 | erro na conversa; /anim erro | 2,2 s | não | comum |
| **Sucesso** (`sucesso`) | Base 68 | atualização instalada; /anim sucesso | 2,2 s | não | comum |
| **Sequência (streak) mantida** (`sequencia`) | Base 69 | dias seguidos usando; /anim sequencia | 3,0 s | não | comum |
| **Aniversário** (`aniversario`) | Base 70 | aniversário; /anim aniversario | 4,0 s | não | comum |
| **Bom dia animado** (`bomDia`) | Base 71; Ambiente 99 | abrir de manhã; /anim bomDia | 3,2 s | não | comum |
| **Boa noite** (`boaNoite`) | Base 72 | abrir à noite; /anim boaNoite | 2,6 s | não | comum |
| **Lembrete** (`lembrete`) | Base 73 | lembretes (refeições, treino); /anim lembrete | 2,6 s | não | comum |
| **Hora da pausa** (`horaPausa`) | Base 74; Ambiente 92 | 90 min sem parar; /anim horaPausa | 2,8 s | não | comum |
| **Modo foco** (`modoFoco`) | Base 75 | modo foco; /anim modoFoco | 2,6 s | não | comum |
| **Parabéns** (`parabens`) | Base 76 | "parabéns"; “parabens”; “parabéns”; /anim parabens | 2,6 s | não | comum |
| **Notificação recebida** (`notificacao`) | Base 77 | atividade nova "Precisa de você"; /anim notificacao | 1,6 s | não | comum |
| **Mensagem nova** (`mensagemNova`) | Base 78 | mensagem nova; /anim mensagemNova | 2,0 s | não | comum |
| **Usuário ausente (esperando)** (`ausente`) | Base 79 | PC parado 2 min; /anim ausente | 4,2 s | sim | comum |
| **Usuário voltou (reencontro)** (`voltou`) | Base 80; Ambiente 105 | volta depois de parado; /anim voltou | 2,4 s | não | comum |

## Interação direta

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Clique simples** (`clique`) | Base 81 | clique no JoJo; /anim clique | 0,9 s | não | comum |
| **Carinho** (`carinho`) | Base 82 | esfregar devagar; /anim carinho | — | não | comum |
| **Cócegas** (`cocegas`) | Base 83 | esfregar rápido; “cocegas”; “cócegas”; /anim cocegas | 2,2 s | não | comum |
| **Ser pego (arrastar)** (`pego`) | Base 84 | arrastar; /anim pego | — | não | comum |
| **Ser solto** (`solto`) | Base 85 | soltar; /anim solto | — | não | comum |
| **Ser jogado** (`jogado`) | Base 86 | arrastar rápido e soltar; /anim jogado | 1,4 s | não | comum |
| **Duplo clique** (`duploClique`) | Base 87 | duplo clique; /anim duploClique | 1,2 s | não | comum |
| **Segurar** (`segurar`) | Base 88 | segurar o clique; /anim segurar | 1,8 s | não | comum |
| **Ser empurrado** (`empurrado`) | Base 89 | “te empurro”; “empurra”; /anim empurrado | 1,4 s | não | comum |
| **Seguir o usuário** (`seguir`) | Base 90 | “me segue”; “vem comigo”; “vem aqui”; /anim seguir | 3,0 s | não | comum |
| **Esconder-se** (`esconder`) | Base 91 | “se esconde”; “esconde”; /anim esconder | 2,4 s | não | comum |
| **Espiar da borda da tela** (`espiarBorda`) | Base 92; Ambiente 65 | sorteio ambiente; /anim espiarBorda | 4,0 s | não | rara |

## Ações e idle extras

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Comer** (`comer`) | Base 93 | /anim comer | — | não | comum |
| **Ouvir música** (`ouvirMusica`) | Base 96 | sorteio ambiente; /anim ouvirMusica | 4,0 s | não | comum |
| **Observar estrelas** (`estrelas`) | Base 97 | sorteio ambiente (noite, madrugada); /anim estrelas | 4,6 s | não | comum |
| **Soprar bolhas** (`soprarBolhas`) | Base 98 | sorteio ambiente; /anim soprarBolhas | 3,0 s | não | comum |
| **Brincar com um objeto** (`brincar`) | Base 99; Ambiente 74 | /anim brincar | — | não | comum |
| **Perseguir algo** (`perseguir`) | Base 100 | sorteio ambiente; /anim perseguir | 4,0 s | não | comum |
| **Pular** (`pular`) | Base 101 | sorteio ambiente; /anim pular | 1,6 s | não | comum |
| **Rolar** (`rolar`) | Base 102 | sorteio ambiente; “rola”; “rolar”; /anim rolar | 1,8 s | não | comum |
| **Girar** (`girar`) | Base 103 | sorteio ambiente; “gira”; “girar”; /anim girar | 1,8 s | não | comum |
| **Sentar** (`sentar`) | Base 104 | sorteio ambiente; /anim sentar | — | não | comum |
| **Deitar** (`deitar`) | Base 105 | sorteio ambiente; /anim deitar | — | não | comum |
| **Esconder-se atrás da borda/janela** (`escondeBorda`) | Base 106; Ambiente 67 | sorteio ambiente; /anim escondeBorda | 4,4 s | não | rara |
| **Sentir frio** (`frio`) | Base 107 | sorteio ambiente; /anim frio | 3,0 s | não | rara |
| **Sentir calor** (`calor`) | Base 108 | sorteio ambiente; /anim calor | 3,0 s | não | rara |
| **Reagir à chuva** (`chuva`) | Base 109 | sorteio ambiente; /anim chuva | 3,4 s | não | rara |
| **Reagir ao vento** (`vento`) | Base 110 | sorteio ambiente; /anim vento | 3,0 s | não | rara |
| **Abrir um baú do tesouro** (`tesouro`) | — | sorteio ambiente; /anim tesouro | 3,0 s | não | rara |

## Vaidade e fisiculturismo

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Beber shake de proteína** (`beberShake`) | Base 94; Sem pudor 44; Ambiente 25 | sorteio ambiente; “bebe shake”; “toma shake”; “shake”; /anim beberShake | 2,8 s | não | comum |
| **Admirar-se no espelho** (`espelho`) | Sem pudor 31 | sorteio ambiente; “espelho”; /anim espelho | 3,2 s | não | comum |
| **Posar para selfie** (`selfie`) | Sem pudor 32; Ambiente 28 | sorteio ambiente; “selfie”; “tira uma foto”; /anim selfie | 2,8 s | não | comum |
| **Desfile de passarela submarina** (`desfile`) | Sem pudor 33, 38; Ambiente 109 | sorteio ambiente; “desfile”; “desfila”; /anim desfile | 4,4 s | não | rara |
| **Se achar o máximo** (`seAcharMaximo`) | Sem pudor 34; Ambiente 31 | sorteio ambiente; /anim seAcharMaximo | 2,8 s | não | comum |
| **Flexionar bíceps** (`flexionarBiceps`) | Sem pudor 35; Ambiente 16 | sorteio ambiente; “flexiona”; “biceps”; “bíceps”; “mostra o braco”; “mostra o braço”; /anim flexionarBiceps | 2,4 s | não | comum |
| **Pose de fisiculturista (duplo bíceps)** (`duploBiceps`) | Sem pudor 36; Ambiente 17, 27 | sorteio ambiente; “duplo biceps”; “duplo bíceps”; “faz pose”; /anim duploBiceps | 2,8 s | não | comum |
| **Receber aplausos imaginários** (`aplausosImaginarios`) | Sem pudor 37 | sorteio ambiente; /anim aplausosImaginarios | 3,0 s | não | rara |
| **Agradecer a plateia** (`agradecerPlateia`) | Sem pudor 38 | sorteio ambiente; /anim agradecerPlateia | 2,6 s | não | rara |
| **Fingir modéstia** (`fingirModestia`) | Sem pudor 39 | sorteio ambiente; /anim fingirModestia | 2,4 s | não | comum |
| **Pedir elogios** (`pedirElogios`) | Sem pudor 40 | sorteio ambiente; /anim pedirElogios | 2,4 s | não | comum |
| **Mostrar o abdômen e dar tapinha** (`tapinhaAbdomen`) | Sem pudor 41; Ambiente 19 | sorteio ambiente; /anim tapinhaAbdomen | 2,4 s | não | comum |
| **Levantar halteres** (`halteres`) | Sem pudor 42; Ambiente 21 | sorteio ambiente; “halter”; “levanta peso”; /anim halteres | 3,6 s | não | comum |
| **Fazer flexões flutuando** (`flexoes`) | Sem pudor 43; Ambiente 20 | sorteio ambiente; “flexao”; “flexão”; “flexoes”; “flexões”; /anim flexoes | 3,6 s | não | comum |
| **Cara de "eu sei que sou incrível"** (`incrivel`) | Sem pudor 45 | sorteio ambiente; /anim incrivel | 2,4 s | não | comum |
| **Treinar, suar e se secar com toalha** (`toalha`) | Sem pudor 46; Ambiente 26 | sorteio ambiente; /anim toalha | 3,2 s | não | comum |
| **Admirar os próprios músculos** (`admirarMusculos`) | Ambiente 18 | sorteio ambiente; /anim admirarMusculos | 2,8 s | não | comum |
| **Agachamento de nado** (`agachamentoNado`) | Ambiente 22 | sorteio ambiente; /anim agachamentoNado | 3,4 s | não | comum |
| **Alongar o corpo todo** (`alongar`) | Ambiente 23, 91 | sorteio ambiente; “alonga”; “alongar”; /anim alongar | 3,2 s | não | comum |
| **Treinar com elástico** (`elastico`) | Ambiente 24 | sorteio ambiente; /anim elastico | 3,2 s | não | comum |
| **Posar para espelho invisível** (`espelhoInvisivel`) | Ambiente 27 | sorteio ambiente; /anim espelhoInvisivel | 2,6 s | não | comum |
| **Soprar um beijo para o próprio bíceps** (`beijoBiceps`) | Ambiente 29 | sorteio ambiente; /anim beijoBiceps | 2,6 s | não | comum |
| **Contar repetições em um balão** (`contarRepeticoes`) | Ambiente 30 | sorteio ambiente; /anim contarRepeticoes | 5,0 s | não | comum |

## Especiais

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Aparecer (spawn)** (`aparecer`) | Base 111 | ao aparecer; /anim aparecer | — | não | comum |
| **Desaparecer** (`desaparecer`) | Base 112 | “some”; “desaparece”; /anim desaparecer | 2,4 s | não | comum |
| **Teleporte** (`teleporte`) | Base 113 | sorteio ambiente; “teleporta”; “teleporte”; /anim teleporte | 2,0 s | não | rara |
| **Brilho/aura** (`aura`) | Base 114 | sorteio ambiente; /anim aura | 3,6 s | não | rara |
| **Transformação/evolução** (`evolucao`) | Base 115 | sorteio ambiente; subir de nível; /anim evolucao | 3,2 s | não | rara |
| **Modo poder** (`modoPoder`) | Base 116 | sorteio ambiente; “modo poder”; /anim modoPoder | 3,2 s | não | rara |
| **Reação ao comando /pet** (`pet`) | Base 117 | /pet (acordar); /anim pet | 1,8 s | não | comum |
| **Pose épica de capa de revista** (`poseEpica`) | Base 119; Sem pudor 115; Ambiente 108 | sorteio ambiente; /anim poseEpica | 3,6 s | não | easter |
| **Modo "sem filtro" (combinação aleatória)** (`semFiltro`) | Sem pudor 108 | sorteio ambiente; “sem filtro”; /anim semFiltro | 1,0 s | não | rara |
| **Confissão constrangedora** (`confissao`) | Sem pudor 109; Ambiente 96 | sorteio ambiente; /anim confissao | 3,0 s | não | rara |
| **Hora da verdade (segredo bobo)** (`horaDaVerdade`) | Sem pudor 110 | sorteio ambiente; “segredo”; “me conta um segredo”; /anim horaDaVerdade | 3,0 s | não | rara |
| **Surto de carência** (`surtoCarencia`) | Sem pudor 111; Ambiente 104, 112 | sorteio ambiente; 45 min sem interagir (no máximo a cada 2 h); /anim surtoCarencia | 3,2 s | não | rara |
| **Dancinha viral** (`dancinhaViral`) | Sem pudor 112; Ambiente 58 | sorteio ambiente; “dancinha viral”; “trend”; /anim dancinhaViral | 3,2 s | não | comum |
| **Crise de riso** (`criseRiso`) | Sem pudor 113; Ambiente 111 | sorteio ambiente; /anim criseRiso | 3,6 s | não | rara |
| **Modo fera: olhos fixos, dentes à mostra, aura de predador** (`modoFera`) | Sem pudor 114; Ambiente 107 | sorteio ambiente; “modo fera”; /anim modoFera | 3,6 s | não | rara |
| **Tubarão fantasma (silhueta passando ao fundo)** (`fantasma`) | Ambiente 110 | sorteio ambiente (noite, madrugada); /anim fantasma | 5,0 s | não | easter |
| **Show de talentos com nado sincronizado** (`nadoSincronizado`) | Ambiente 113 | sorteio ambiente; /anim nadoSincronizado | 4,0 s | não | easter |

## Atitude descarada

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Encarar sem piscar com sorriso cheio de dentes** (`encararDentes`) | Sem pudor 1 | sorteio ambiente; /anim encararDentes | 3,2 s | não | comum |
| **Sorriso de canto mostrando um dente** (`sorrisoCanto`) | Sem pudor 2; Ambiente 61 | sorteio ambiente; /anim sorrisoCanto | 2,2 s | não | comum |
| **Levantar uma sobrancelha** (`sobrancelha`) | Sem pudor 3 | sorteio ambiente; /anim sobrancelha | 1,6 s | não | comum |
| **Revirar os olhos** (`revirarOlhos`) | Sem pudor 4; Ambiente 44 | sorteio ambiente; /anim revirarOlhos | 1,8 s | não | comum |
| **Dar de ombros com deboche** (`ombrosDeboche`) | Sem pudor 5 | sorteio ambiente; /anim ombrosDeboche | 2,0 s | não | comum |
| **Cruzar os braços com superioridade** (`superioridade`) | Sem pudor 6 | sorteio ambiente; /anim superioridade | 2,6 s | não | comum |
| **Fingir que não fez nada** (`naoFuiEu`) | Sem pudor 7; Ambiente 60 | sorteio ambiente; /anim naoFuiEu | 2,8 s | não | comum |
| **Assobiar disfarçando (com bolhas)** (`assobiar`) | Sem pudor 8; Ambiente 59 | sorteio ambiente; /anim assobiar | 3,0 s | não | comum |
| **Olhar para o lado inocentemente** (`olharLado`) | Sem pudor 9 | sorteio ambiente; /anim olharLado | 2,2 s | não | comum |
| **Mandar beijo exagerado** (`beijoExagerado`) | Sem pudor 11; Ambiente 63 | sorteio ambiente; “manda um beijo”; “me manda beijo”; “beijo”; /anim beijoExagerado | 2,4 s | não | rara |
| **Pose de vilão com a dorsal em destaque** (`poseVilao`) | Sem pudor 12; Ambiente 32, 95 | sorteio ambiente; /anim poseVilao | 3,0 s | não | comum |
| **Rir da própria piada** (`rirPropriaPiada`) | Sem pudor 13 | sorteio ambiente; /anim rirPropriaPiada | 2,6 s | não | comum |
| **Fazer "hmpf" e virar o rosto** (`hmpf`) | Sem pudor 14 | sorteio ambiente; /anim hmpf | 2,0 s | não | comum |
| **Circular o usuário como presa** (`circularPresa`) | Sem pudor 15 | sorteio ambiente; /anim circularPresa | 4,0 s | não | rara |

## Flerte e charme

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Fazer charme balançando os pés** (`charmeCauda`) | Sem pudor 16; Ambiente 64 | sorteio ambiente; /anim charmeCauda | 3,0 s | não | comum |
| **Ajeitar a pose e brilhar os dentes** (`brilharDentes`) | Sem pudor 17 | sorteio ambiente; /anim brilharDentes | 2,6 s | não | comum |
| **Olhar apaixonado demais** (`olharApaixonado`) | Sem pudor 18 | sorteio ambiente; /anim olharApaixonado | 3,0 s | não | rara |
| **Corar de propósito** (`corar`) | Sem pudor 19 | sorteio ambiente; /anim corar | 2,2 s | não | comum |
| **Fingir timidez escondendo o rosto** (`fingirTimidez`) | Sem pudor 20 | sorteio ambiente; /anim fingirTimidez | 2,4 s | não | comum |
| **Soprar um beijo** (`soprarBeijo`) | Sem pudor 21 | sorteio ambiente; /anim soprarBeijo | 2,2 s | não | comum |
| **Nadar devagar em direção à tela** (`nadarParaTela`) | Sem pudor 23 | sorteio ambiente; /anim nadarParaTela | 3,4 s | não | rara |
| **Sussurrar com balão de fala** (`sussurrar`) | Sem pudor 24 | sorteio ambiente; /anim sussurrar | 2,8 s | não | rara |
| **Elogiar o usuário com exagero** (`elogiarExagero`) | Sem pudor 25; Ambiente 88 | sorteio ambiente; /anim elogiarExagero | 2,6 s | não | comum |
| **Ficar ciumento** (`ciumento`) | Sem pudor 26 | sorteio ambiente; “outro tubarao”; “outro tubarão”; /anim ciumento | 2,6 s | não | rara |
| **Drama de ciúmes rangendo os dentes** (`dramaCiumes`) | Sem pudor 27 | sorteio ambiente; /anim dramaCiumes | 2,8 s | não | rara |
| **Declarar amor eterno de forma teatral** (`amorEterno`) | Sem pudor 28 | sorteio ambiente; /anim amorEterno | 3,6 s | não | easter |
| **Cantada ruim de tubarão** (`cantadaRuim`) | Sem pudor 29 | sorteio ambiente; “cantada”; “me da uma cantada”; “me dá uma cantada”; /anim cantadaRuim | 2,4 s | não | rara |
| **Abraço apertado demais, de quebrar costela** (`abracoApertado`) | Sem pudor 30 | “abraco apertado”; “abraço apertado”; /anim abracoApertado | 3,0 s | não | comum |

## Preguiça e descaso

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Deitar esparramado no fundo** (`esparramado`) | Sem pudor 47; Ambiente 40 | sorteio ambiente; /anim esparramado | 4,6 s | não | comum |
| **Ignorar o usuário de propósito** (`ignorar`) | Sem pudor 48 | sorteio ambiente; /anim ignorar | 3,0 s | não | comum |
| **Fingir que está dormindo** (`fingirDormir`) | Sem pudor 49 | sorteio ambiente; /anim fingirDormir | 4,2 s | não | comum |
| **Cutucar o dente com palito** (`palito`) | Sem pudor 51; Ambiente 39 | sorteio ambiente; /anim palito | 3,0 s | não | comum |
| **Coçar a barriga sem cerimônia** (`cocarBarriga`) | Sem pudor 52; Ambiente 38, 52 | sorteio ambiente; /anim cocarBarriga | 2,8 s | não | comum |
| **Rolar de preguiça** (`rolarPreguica`) | Sem pudor 53; Ambiente 41 | sorteio ambiente; /anim rolarPreguica | 3,0 s | não | comum |
| **Dizer "depois eu faço" e virar de lado** (`depoisEuFaco`) | Sem pudor 55 | sorteio ambiente; “depois eu faco”; “depois eu faço”; /anim depoisEuFaco | 3,2 s | não | comum |
| **Se esconder sob uma alga** (`escondeAlga`) | Sem pudor 56; Ambiente 42 | sorteio ambiente; /anim escondeAlga | 4,0 s | não | rara |
| **Se esconder sob a coberta** (`escondeCoberta`) | Sem pudor 56 | sorteio ambiente; /anim escondeCoberta | 4,0 s | não | rara |
| **Suspirar entediado** (`suspirar`) | Ambiente 43 | sorteio ambiente; /anim suspirar | 2,4 s | não | comum |
| **Olhar para o relógio** (`olharRelogio`) | Ambiente 45, 93 | sorteio ambiente; /anim olharRelogio | 2,8 s | não | comum |
| **Acordar assustado e fingir que não dormiu** (`acordarAssustado`) | Ambiente 37 | sorteio ambiente; /anim acordarAssustado | 2,6 s | não | comum |
| **Cochilar boiando** (`cochilarBoiando`) | Ambiente 35 | sorteio ambiente (tarde, noite); /anim cochilarBoiando | 5,0 s | não | comum |
| **Dormir de barriga para cima com bolhas de ronco** (`dormirRonco`) | Ambiente 36, 102 | sorteio ambiente (noite, madrugada); /anim dormirRonco | 5,6 s | não | comum |
| **Modo madrugada: olhos pesados e bolhas lentas** (`madrugada`) | Ambiente 103 | sorteio ambiente (madrugada); /anim madrugada | 4,8 s | não | comum |

## Sons e corpo engraçados

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Arrotar bolhas** (`arrotar`) | Sem pudor 57; Ambiente 47 | sorteio ambiente; /anim arrotar | 2,0 s | não | comum |
| **Soluçar** (`solucar`) | Sem pudor 58; Ambiente 48 | sorteio ambiente; /anim solucar | 3,0 s | não | comum |
| **Espirrar com jato de bolhas** (`espirrar`) | Sem pudor 59; Ambiente 49 | sorteio ambiente; /anim espirrar | 2,0 s | não | comum |
| **Peidinho fofo com efeito de bolhas** (`peidinho`) | Sem pudor 60; Ambiente 50 | sorteio ambiente; /anim peidinho | 2,6 s | não | rara |
| **Barriga roncando** (`barrigaRoncando`) | Sem pudor 61; Ambiente 51, 94, 100 | sorteio ambiente (tarde); /anim barrigaRoncando | 2,4 s | não | comum |
| **Fazer careta** (`careta`) | Sem pudor 62; Ambiente 53 | sorteio ambiente; “careta”; /anim careta | 2,0 s | não | comum |
| **Mostrar a língua** (`lingua`) | Sem pudor 63; Ambiente 54 | sorteio ambiente; “mostra a lingua”; “mostra a língua”; /anim lingua | 1,8 s | não | comum |
| **Bochechas infladas como baiacu** (`bochechas`) | Sem pudor 64; Ambiente 55 | sorteio ambiente; “baiacu”; “bochecha”; /anim bochechas | 2,2 s | não | comum |
| **Estalar o pescoço e os braços** (`estalar`) | Sem pudor 65; Ambiente 15 | sorteio ambiente; /anim estalar | 2,4 s | não | comum |
| **Fazer cócegas em si mesmo** (`autoCocegas`) | Sem pudor 66 | sorteio ambiente; /anim autoCocegas | 2,4 s | não | rara |

## Drama exagerado

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Desmaiar dramaticamente** (`desmaio`) | Sem pudor 67 | sorteio ambiente; /anim desmaio | 3,6 s | não | rara |
| **Cair de joelhos** (`cairJoelhos`) | Sem pudor 69 | sorteio ambiente; /anim cairJoelhos | 3,0 s | não | rara |
| **Pedir perdão de forma teatral** (`perdaoTeatral`) | Sem pudor 70 | “me pede perdao”; “me pede perdão”; /anim perdaoTeatral | 3,2 s | não | comum |
| **Fingir estar machucado** (`fingirMachucado`) | Sem pudor 71 | sorteio ambiente; /anim fingirMachucado | 3,0 s | não | rara |
| **Falsa morte boiando** (`falsaMorte`) | Sem pudor 72 | sorteio ambiente; /anim falsaMorte | 4,4 s | não | rara |
| **Ressuscitar com pose épica** (`ressuscitar`) | Sem pudor 73 | sorteio ambiente; /anim ressuscitar | 2,8 s | não | rara |
| **Gritar para a superfície** (`gritarSuperficie`) | Sem pudor 74 | sorteio ambiente; /anim gritarSuperficie | 2,6 s | não | rara |
| **Revolta cômica** (`revolta`) | Sem pudor 75 | sorteio ambiente; /anim revolta | 2,8 s | não | rara |
| **Ficar de birra** (`birra`) | Sem pudor 76 | sorteio ambiente; /anim birra | 3,6 s | não | rara |

## Travessuras

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Esconder algo atrás das costas** (`esconderAtras`) | Sem pudor 77 | sorteio ambiente; /anim esconderAtras | 2,6 s | não | comum |
| **Puxar o cursor com a boca (só de mentira)** (`puxarCursor`) | Sem pudor 78; Ambiente 68 | sorteio ambiente; /anim puxarCursor | 2,2 s | não | rara |
| **Derrubar um objeto de propósito** (`derrubarObjeto`) | Sem pudor 79; Ambiente 69 | sorteio ambiente; /anim derrubarObjeto | 2,6 s | não | rara |
| **Fugir depois de aprontar, deixando rastro de bolhas** (`fugirBolhas`) | Sem pudor 80; Ambiente 70 | sorteio ambiente; /anim fugirBolhas | 2,4 s | não | rara |
| **Rir escondido** (`rirEscondido`) | Sem pudor 81; Ambiente 71 | sorteio ambiente; /anim rirEscondido | 2,4 s | não | comum |
| **Espiar com um olho só** (`espiarUmOlho`) | Sem pudor 82 | sorteio ambiente; /anim espiarUmOlho | 2,4 s | não | comum |
| **Dar um susto saindo da borda da tela** (`sustoBorda`) | Sem pudor 83; Ambiente 72 | sorteio ambiente; /anim sustoBorda | 2,2 s | não | rara |
| **Aparecer só com a nadadeira dorsal cortando a tela** (`dorsalTela`) | Sem pudor 84; Ambiente 7, 66 | sorteio ambiente; /anim dorsalTela | 5,0 s | não | rara |
| **Pregar peça** (`pregarPeca`) | Sem pudor 85 | sorteio ambiente; /anim pregarPeca | 2,6 s | não | rara |
| **Roubar o foco da tela (só de mentira)** (`roubarFoco`) | Sem pudor 86; Ambiente 78 | sorteio ambiente; /anim roubarFoco | 2,6 s | não | easter |
| **Bagunçar a janela (só de mentira)** (`baguncarJanela`) | Sem pudor 87 | sorteio ambiente; /anim baguncarJanela | 2,4 s | não | rara |
| **Perseguir uma bolha** (`perseguirBolha`) | Ambiente 73 | sorteio ambiente; /anim perseguirBolha | 3,2 s | não | comum |
| **Brincar com um peixinho de borracha** (`peixeBorracha`) | Ambiente 75 | sorteio ambiente; /anim peixeBorracha | 3,0 s | não | comum |
| **Bater na borda da tela e fingir que não foi nada** (`baterBorda`) | Ambiente 76 | sorteio ambiente; /anim baterBorda | 2,6 s | não | rara |
| **Tentar morder o ícone mais próximo (só de mentira)** (`morderIcone`) | Ambiente 77 | sorteio ambiente; /anim morderIcone | 2,2 s | não | rara |

## Provocação

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Zombar com carinho** (`zombar`) | Sem pudor 88 | sorteio ambiente; /anim zombar | 2,2 s | não | comum |
| **Imitar o usuário** (`imitar`) | Sem pudor 89 | sorteio ambiente; “me imita”; /anim imitar | 2,8 s | não | comum |
| **Dar língua após vencer** (`linguaVitoria`) | Sem pudor 90 | mini-jogo vencido; /anim linguaVitoria | 2,0 s | não | comum |
| **Dançar vitória provocando** (`dancaVitoria`) | Sem pudor 91 | mini-jogo vencido; /anim dancaVitoria | 3,0 s | não | comum |
| **"Sabia que você ia errar"** (`sabiaQueIaErrar`) | Sem pudor 92 | mini-jogo; /anim sabiaQueIaErrar | 2,4 s | não | comum |
| **Apostar com o usuário** (`apostar`) | Sem pudor 93 | sorteio ambiente; “aposta”; “apostar”; /anim apostar | 2,4 s | não | comum |
| **Desafiar para queda de braço** (`quedaBraco`) | Sem pudor 94 | sorteio ambiente; “queda de braco”; “queda de braço”; /anim quedaBraco | 2,8 s | não | comum |
| **Fingir surpresa sarcástica** (`surpresaSarcastica`) | Sem pudor 95 | sorteio ambiente; /anim surpresaSarcastica | 2,4 s | não | comum |
| **Aplauso lento sarcástico** (`aplausoLento`) | Sem pudor 96 | sorteio ambiente; /anim aplausoLento | 3,2 s | não | comum |
| **Dar "tchau" irônico** (`tchauIronico`) | Sem pudor 97 | sorteio ambiente; /anim tchauIronico | 2,2 s | não | comum |

## Comida e bagunça

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Comer sem modos, devorando tudo** (`devorar`) | Sem pudor 98; Ambiente 79 | sorteio ambiente; /anim devorar | 3,0 s | não | comum |
| **Lamber os dentes** (`lamberDentes`) | Sem pudor 99; Ambiente 80 | sorteio ambiente; /anim lamberDentes | 2,0 s | não | comum |
| **Sujar o rosto de comida** (`rostoSujo`) | Sem pudor 100; Ambiente 81 | sorteio ambiente; /anim rostoSujo | 2,8 s | não | comum |
| **Roubar a comida do usuário** (`roubarComida`) | Sem pudor 101 | sorteio ambiente; /anim roubarComida | 2,8 s | não | rara |
| **Engolir tudo de uma vez** (`engolirTudo`) | Sem pudor 102; Ambiente 82 | sorteio ambiente; /anim engolirTudo | 2,4 s | não | comum |
| **Fazer festa sozinho** (`festaSozinho`) | Sem pudor 103; Ambiente 85 | sorteio ambiente; /anim festaSozinho | 3,6 s | não | rara |
| **Dançar sem ritmo** (`dancarSemRitmo`) | Sem pudor 104; Ambiente 56 | sorteio ambiente; /anim dancarSemRitmo | 3,4 s | não | comum |
| **Cantar desafinado (só com balão)** (`cantarDesafinado`) | Sem pudor 105; Ambiente 57 | sorteio ambiente; /anim cantarDesafinado | 3,4 s | não | comum |
| **Karaokê dramático** (`karaoke`) | Sem pudor 106 | sorteio ambiente; “karaoke”; “karaokê”; “canta”; /anim karaoke | 4,2 s | não | rara |
| **Pular de felicidade, fazendo ondas** (`puloOndas`) | Sem pudor 107 | sorteio ambiente; /anim puloOndas | 2,4 s | não | comum |
| **Comer peixinhos de um pote** (`comerPeixinhos`) | Ambiente 83 | sorteio ambiente; /anim comerPeixinhos | 3,2 s | não | comum |
| **Beber água do aquário** (`beberAquario`) | Ambiente 84, 90 | sorteio ambiente; /anim beberAquario | 2,8 s | não | comum |
| **Tomar café e olhar para o usuário** (`cafeOlhando`) | Ambiente 86 | sorteio ambiente (manha); /anim cafeOlhando | 3,2 s | não | comum |
| **Pedir comida com um balão** (`pedirComida`) | Ambiente 87 | sorteio ambiente; /anim pedirComida | 2,6 s | não | comum |

## Presença constante

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Ajeitar a postura** (`ajeitarPostura`) | Ambiente 14 | sorteio ambiente; /anim ajeitarPostura | 2,0 s | não | comum |
| **Nadar em círculos lentos** (`nadarCirculos`) | Ambiente 8 | sorteio ambiente; /anim nadarCirculos | 4,6 s | não | comum |
| **Nadar de um canto ao outro da tela** (`nadarCanto`) | Ambiente 9 | sorteio ambiente; /anim nadarCanto | 3,6 s | não | comum |
| **Elogiar o usuário em silêncio** (`elogioSilencio`) | Ambiente 88 | sorteio ambiente; /anim elogioSilencio | 2,4 s | não | comum |
| **Balão motivacional de academia** (`motivacaoAcademia`) | Ambiente 89 | sorteio ambiente; /anim motivacaoAcademia | 2,6 s | não | comum |
| **Torcer pelo usuário** (`torcer`) | Ambiente 97 | sorteio ambiente; /anim torcer | 2,4 s | não | comum |

## Reações do chat

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Nojo de doce** (`nojo`) | — | /anim nojo | 3,2 s | não | comum |

## estimulo

| Animação | Listas | Gatilho | Duração | Loop | Frequência |
|---|---|---|---|---|---|
| **Sequência rítmica previsível** (`ritmo`) | — | “ritmo”; /anim ritmo | 4,0 s | sim | comum |
| **Padrão visual calmante (cardume e cores suaves)** (`calma`) | — | “calma”; “me acalma”; /anim calma | 6,0 s | sim | comum |
| **Fidget de bíceps (bombar)** (`fidget`) | — | sorteio ambiente; /anim fidget | 0,9 s | não | comum |
| **Estudar junto, em silêncio** (`estudarJunto`) | — | /anim estudarJunto | 6,0 s | sim | comum |
| **Treinar junto, marcando séries** (`treinarJunto`) | — | /anim treinarJunto | 4,0 s | sim | comum |

## Itens que são do sistema

- **Versão estática de cada estado** (Base 120, Sem pudor 116, Ambiente 114): redução de movimento do Windows ou “Reduzir movimento”; o renderer usa o quadro estático de toda animação.
- **Balão de status animado** (Base 118): o balão de atividades do pet.

## Falas ambientes

148 falas em `assets/dialogue/falas-ambientes.json` (até 80 caracteres). Cada animação aponta uma categoria em `fala`; o motor escolhe uma fala dessa categoria, combinando com a animação, o período do dia e a temporada da semana, sem repetir em sequência.

| Categoria | Falas | Exemplo |
|---|---|---|
| treino | 15 | Mais uma série. Sempre mais uma série. |
| estudo | 15 | Cérebro também é músculo. Treina ele. |
| vaidade | 15 | Sim, eu estou me admirando. E daí? |
| descaro | 15 | Arrotei. Sem remorso. |
| motivacao | 15 | Você está indo bem. Continua. |
| cuidado | 10 | Bebe água. Hidratação é treino também. |
| fome | 6 | Estou com fome. De novo. |
| horario | 11 | Bom dia! Já treinei, já estudei e ainda são 8h. |
| ausencia | 6 | Fiquei treinando enquanto você sumiu. |
| filosofia | 10 | Ser o melhor não é chegar. É continuar. |
| especiais | 5 | Se você está lendo isso, é porque eu quis que lesse. |
| repeticoes | 4 | Um. Dois. Três. Quatro… tá, já sabe como termina. |
| cantada | 4 | Você é tipo proteína: essencial na minha dieta. |
| provocacao | 4 | Sabia que você ia errar. E sabia que ia acertar depois. |
| cantar | 3 | Lá-lá-lá… afinado é para os fracos. |
| dicas | 6 | Dizem que existe uma pose épica escondida. Rara. Muito rara. |
| constancia | 4 | Um pouco todo dia vale mais que muito um dia só. |

Desligadas por contradizer a regra de o JoJo ser contra dormir: .
