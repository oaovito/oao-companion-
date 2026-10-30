# Pacotes de reação

50 reações em 5 pacotes (`assets/catalog/pacotes.json`), cada uma com animação real gerada pelas receitas do catálogo (`src/core/catalog/recipes.js`), efeitos visuais silenciosos (`src/renderer/shared/fx-pacotes.js`; os de fundo são desenhados atrás do JoJo), falas próprias, raridade e intervalo mínimo. Reconhecimento de intenção em `src/core/pacotes.js`; reprodução e eventos em `Companion.playPack`/`packEvent`.

- **Testar cada uma**: Central → 🎭 Reações, ou `/reacao <nome>` (pedido manual ignora raridade, intervalo e pacote desligado).
- **Configurações → Pacotes de reação**: ligar/desligar cada pacote, reações espontâneas e a intensidade da comida (1 sarcasmo, 2 indignação, 3 fúria cinematográfica, 4 apocalipse; 1–2 sem efeitos).
- **Modo Trabalho** bloqueia todas; **silêncio absoluto**: nenhuma tem som.
- Reações automáticas não atropelam outra animação especial nem emendam uma na outra (15 s).
- Comida: só intenção de comer/pedir; "não quero", "ontem comi", "quantas calorias" não ativam; "docinho" continua com a reação original. Nunca fala do corpo/peso dela.
- João: ficção teatral (Deus Supremo); outro João não conta; se ele a magoar, o JoJo acolhe sério (sem piada, sem mandar falar com ele; violência: 190/180; CVV 188).

| # | Pacote | Reação | Duração | Raridade | Gatilho |
|---|---|---|---|---|---|
| 1 | Memes Gen Z | Bombastic side eye (`pk_sideEye`) | 4,2 s | comum | instagram, erro; Instagram, erro, ociosidade, conquista, atividade, frases ("side eye", "aura farming"…) |
| 2 | Memes Gen Z | Chill guy (`pk_chillGuy`) | 5,6 s | comum | ocioso, notificacoes; Instagram, erro, ociosidade, conquista, atividade, frases ("side eye", "aura farming"…) |
| 3 | Memes Gen Z | Aura farming (`pk_auraFarming`) | 6,5 s | incomum | conquista, tarefaConcluida, treino; Instagram, erro, ociosidade, conquista, atividade, frases ("side eye", "aura farming"…) |
| 4 | Memes Gen Z | Let him cook (`pk_letHimCook`) | 5,0 s | comum | atividade; Instagram, erro, ociosidade, conquista, atividade, frases ("side eye", "aura farming"…) |
| 5 | Memes Gen Z | Bro is cooked (`pk_broCooked`) | 4,8 s | comum | erroRepetido, derrota; Instagram, erro, ociosidade, conquista, atividade, frases ("side eye", "aura farming"…) |
| 6 | Memes Gen Z | Six seven (6-7) (`pk_sixSeven`) | 3,2 s | comum | sixSeven; Instagram, erro, ociosidade, conquista, atividade, frases ("side eye", "aura farming"…) |
| 7 | Memes Gen Z | Italian brainrot (`pk_brainrot`) | 6,8 s | rara | absurdo; Instagram, erro, ociosidade, conquista, atividade, frases ("side eye", "aura farming"…) |
| 8 | Memes Gen Z | NPC streaming (`pk_npc`) | 7,0 s | comum | repetitivo; Instagram, erro, ociosidade, conquista, atividade, frases ("side eye", "aura farming"…) |
| 9 | Memes Gen Z | Very demure, very mindful (`pk_demure`) | 5,0 s | comum | instagram; Instagram, erro, ociosidade, conquista, atividade, frases ("side eye", "aura farming"…) |
| 10 | Memes Gen Z | We got this before GTA 6 (`pk_gta6`) | 5,5 s | incomum | conquistaImprovavel, tarefaConcluida; Instagram, erro, ociosidade, conquista, atividade, frases ("side eye", "aura farming"…) |
| 11 | Referências de anime | Menacing (`pk_menacing`) | 6,5 s | comum | provocacao, instagramRepetido; provocação repetida, Instagram reincidente, nível novo, conquistas, sorteio raro, frases ("bankai"…) |
| 12 | Referências de anime | Ultra instinto (`pk_ultraInstinto`) | 8,0 s | incomum | desafioDificil; provocação repetida, Instagram reincidente, nível novo, conquistas, sorteio raro, frases ("bankai"…) |
| 13 | Referências de anime | Fúria berserker (`pk_berserker`) | 9,5 s | lendaria | irritacaoExtrema; provocação repetida, Instagram reincidente, nível novo, conquistas, sorteio raro, frases ("bankai"…) |
| 14 | Referências de anime | Expansão de domínio (`pk_dominio`) | 8,5 s | incomum | provocacao, vitoriaEspecial; provocação repetida, Instagram reincidente, nível novo, conquistas, sorteio raro, frases ("bankai"…) |
| 15 | Referências de anime | Sharingan (`pk_sharingan`) | 5,5 s | comum | instagramRepetido, padrao; provocação repetida, Instagram reincidente, nível novo, conquistas, sorteio raro, frases ("bankai"…) |
| 16 | Referências de anime | Haki do conquistador (`pk_haki`) | 7,5 s | rara | conquista, nivel; provocação repetida, Instagram reincidente, nível novo, conquistas, sorteio raro, frases ("bankai"…) |
| 17 | Referências de anime | Bankai (`pk_bankai`) | 8,0 s | incomum | objetivo, nivel; provocação repetida, Instagram reincidente, nível novo, conquistas, sorteio raro, frases ("bankai"…) |
| 18 | Referências de anime | Modo sério (`pk_serio`) | 5,0 s | comum | vitoriaFacil, provocacao; provocação repetida, Instagram reincidente, nível novo, conquistas, sorteio raro, frases ("bankai"…) |
| 19 | Referências de anime | The Rumbling (`pk_rumbling`) | 9,0 s | lendaria | pendencias; provocação repetida, Instagram reincidente, nível novo, conquistas, sorteio raro, frases ("bankai"…) |
| 20 | Referências de anime | Arise (`pk_arise`) | 8,0 s | rara | sequenciaConquistas; provocação repetida, Instagram reincidente, nível novo, conquistas, sorteio raro, frases ("bankai"…) |
| 21 | Reações extremas de comida | Traição absoluta (`pk_traicao`) | 8,5 s | comum | intenção de comer/pedir (com negação, passado e pergunta descartados) |
| 22 | Reações extremas de comida | Emergência nuclear (`pk_nuclear`) | 10,0 s | comum | intenção de comer/pedir (com negação, passado e pergunta descartados) |
| 23 | Reações extremas de comida | Fúria berserker (com fritas) (`pk_furiaFritas`) | 10,0 s | comum | intenção de comer/pedir (com negação, passado e pergunta descartados) |
| 24 | Reações extremas de comida | Decepção infinita (`pk_decepcao`) | 7,5 s | comum | intenção de comer/pedir (com negação, passado e pergunta descartados) |
| 25 | Reações extremas de comida | Expansão de domínio: sem desculpas (`pk_semDesculpas`) | 9,5 s | comum | intenção de comer/pedir (com negação, passado e pergunta descartados) |
| 26 | Reações extremas de comida | O olhar de mil anos (`pk_milAnos`) | 7,0 s | comum | intenção de comer/pedir (com negação, passado e pergunta descartados) |
| 27 | Reações extremas de comida | O chefe final (`pk_chefeFinal`) | 11,0 s | comum | intenção de comer/pedir (com negação, passado e pergunta descartados) |
| 28 | Reações extremas de comida | Crise existencial (`pk_crise`) | 8,5 s | comum | intenção de comer/pedir (com negação, passado e pergunta descartados) |
| 29 | Reações extremas de comida | Interrogatório militar (`pk_interrogatorio`) | 8,5 s | comum | intenção de comer/pedir (com negação, passado e pergunta descartados) |
| 30 | Reações extremas de comida | Colapso da realidade (`pk_colapso`) | 13,0 s | comum | intenção de comer/pedir (com negação, passado e pergunta descartados) |
| 31 | Operação Namorado | Operação: visitar o namorado (`pk_operacao`) | 9,0 s | comum | frases sobre visita, saudade, tesão, mala, volta da viagem… |
| 32 | Operação Namorado | Libido em nível catastrófico (`pk_libido`) | 9,5 s | comum | frases sobre visita, saudade, tesão, mala, volta da viagem… |
| 33 | Operação Namorado | Protocolo inseminação (`pk_inseminacao`) | 10,0 s | comum | frases sobre visita, saudade, tesão, mala, volta da viagem… |
| 34 | Operação Namorado | O namorado está em perigo (`pk_namoradoPerigo`) | 8,5 s | comum | frases sobre visita, saudade, tesão, mala, volta da viagem… |
| 35 | Operação Namorado | Expansão de domínio: quarto do namorado (`pk_quarto`) | 10,0 s | comum | frases sobre visita, saudade, tesão, mala, volta da viagem… |
| 36 | Operação Namorado | Checklist do caos (`pk_checklist`) | 8,0 s | comum | frases sobre visita, saudade, tesão, mala, volta da viagem… |
| 37 | Operação Namorado | Ciúme existencial (`pk_ciumes`) | 9,0 s | comum | frases sobre visita, saudade, tesão, mala, volta da viagem… |
| 38 | Operação Namorado | A noite promete (`pk_noitePromete`) | 9,5 s | comum | frases sobre visita, saudade, tesão, mala, volta da viagem… |
| 39 | Operação Namorado | Relatório pós-viagem (`pk_relatorio`) | 9,0 s | comum | frases sobre visita, saudade, tesão, mala, volta da viagem… |
| 40 | Operação Namorado | Colapso multiversal: visita prolongada (`pk_mudanca`) | 13,0 s | comum | frases sobre visita, saudade, tesão, mala, volta da viagem… |
| 41 | Protocolo do Divino João | A menção divina (`pk_jMencao`) | 6,0 s | comum | menções ao João (nunca outro João) |
| 42 | Protocolo do Divino João | João enviou mensagem (`pk_jMensagem`) | 6,5 s | comum | menções ao João (nunca outro João) |
| 43 | Protocolo do Divino João | A peregrinação sagrada (`pk_jPeregrinacao`) | 9,0 s | comum | menções ao João (nunca outro João) |
| 44 | Protocolo do Divino João | Saudade do deus (`pk_jSaudade`) | 6,5 s | comum | menções ao João (nunca outro João) |
| 45 | Protocolo do Divino João | João está chegando (`pk_jChegando`) | 7,5 s | comum | menções ao João (nunca outro João) |
| 46 | Protocolo do Divino João | Devoção em nível crítico (`pk_jDevocao`) | 8,5 s | comum | menções ao João (nunca outro João) |
| 47 | Protocolo do Divino João | O julgamento divino (`pk_jJulgamento`) | 7,5 s | comum | menções ao João (nunca outro João) |
| 48 | Protocolo do Divino João | Bênção do Supremo (`pk_jElogio`) | 7,0 s | comum | menções ao João (nunca outro João) |
| 49 | Protocolo do Divino João | Heresia contra o Supremo (`pk_jHeresia`) | 7,0 s | comum | menções ao João (nunca outro João) |
| 50 | Protocolo do Divino João | A apoteose de João (`pk_jApoteose`) | 13,0 s | lendaria | menções ao João (nunca outro João) |

Testes: `test/unit/pacotes.test.js` (50 animações geradas, detecção de comida com negação/passado/pergunta, namorado e João, cooldown, pedido manual, pacote desligado, Modo Trabalho) e `test/e2e/app.e2e.mjs` (reação tocando no renderer com efeitos).
