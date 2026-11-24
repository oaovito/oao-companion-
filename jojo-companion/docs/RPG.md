# RPG do JoJo (0.48)

O desktop vira o mundo do JoJo. Tudo é determinístico e local: nenhuma regra do RPG
passa pelo modelo de linguagem, e nada do RPG entra no prompt da conversa.

## Onde está

| Parte | Arquivo |
|---|---|
| Atributos (10) e efeitos | `src/core/rpg/atributos.js` |
| Árvores, habilidades (45 + 32 de especialização), combinações (8), maestrias (8) | `src/core/rpg/habilidades.js` |
| Especializações (16, rank 1–10) | `src/core/rpg/especializacoes.js` |
| Regiões (12), encruzilhadas, materiais, artefatos (41), receitas (8), vínculo (20 níveis) | `src/core/rpg/mundo.js` |
| Missões semanais (15), especiais por data (8), histórias (5), secretas (12), longa duração (8) | `src/core/rpg/jornada.js` |
| Segredos (29), códigos (8), combinações de eventos (4), Diário do Megalodon (7 páginas) | `src/core/rpg/segredos.js` |
| Vida: sede, energia, tédio, carinho, confiança, satisfação, 7 doenças, 12 bebidas | `src/core/rpg/vida.js` |
| Recompensas dos níveis 2–200, Paragon e Estrelas de Prestígio | `src/core/rpg/niveis.js` |
| 8 minijogos novos | `src/core/rpg/minijogos.js` |
| Motor (estado, eventos, tempo, fila de recompensas) | `src/core/rpg/motor.js` |
| Serviço no app (observadores, conversa, IPC, avisos) | `src/main/rpg-service.js` |
| Painel "Aventura" da Central | `src/renderer/shared/rpg-view.js` |
| 34 animações por receita (`rpg_*`) | `assets/catalog/rpg-animations.json` |

Estado salvo em `<userData>/rpg.json` (gravação atômica com cópia `.bak`, validação e
migração sem apagar nada: `validarRpg`). Toda mudança passa por `mutar`: grava ou desfaz.

## Regras que não podem regredir

- **Inteligência nunca limita a conversa.** Ela só mexe em estudo, quiz, dicas e desafios
  mentais. Teste: os módulos de `dialogue/` não importam nada de `rpg/`.
- **Sem punição por ausência.** A vida só muda com o app aberto e uso ativo; o salto entre
  minutos acima de 90 s é descartado (suspensão, relógio mexido). Valores têm piso.
- **Dormir só das 21h às 6h** (`podeDormir`), igual à vigília da máquina de estados.
- **Modo Trabalho, foco e tela cheia:** nada de fala ou animação do RPG. Expedições
  continuam em silêncio e o resultado fica no relatório.
- **XP sem duplicar.** XP do RPG sai com id único `rpg:<dia>:<chave>:<seq>` por
  `Progress.award` (fonte `rpg`), com teto de 250 nominais por dia. O XP que outros
  sistemas já deram não é repetido: o RPG só soma o bônus real dos atributos.
- **JOJOcoins sem duplicar.** Sempre com esse nome. Saem por `companion.loja.creditar({ id, valor,
  origem, rotulo })` com id `rpg:<chave>` (origens `nivel`, `expedicao`, `segredo`, `rpg`).
  Sem loja ativa, ficam na fila do RPG e entram depois, uma vez cada.
- **Antifraude não invasivo:** intervalo mínimo por tipo de evento e teto diário. Nada de
  leitura de teclado, tela ou processos além do que o app já tinha.
- **Médico e Cientista são educativos.** O aviso do Médico manda sintoma sério para
  profissional e emergência para o 192.

## Eventos que alimentam o RPG

O serviço observa o que já existe, sem mudar esses sistemas:

| Origem | Evento do RPG |
|---|---|
| Carinho/gesto, conversa, foco, missão do dia (XP confirmado) | `carinho`, `chat`, `foco`, `missao` |
| Timer concluído (exercício/alongamento também vira `treino`) | `timer` |
| Tarefa concluída | `tarefa` |
| Atividade de jogo da Steam | `jogo` |
| Comida e bebida do cardápio (primeira vez: `comidaNova`) | `comida` |
| Limpeza e "Cuidar e recuperar" | `limpeza`, `cuidado` |
| Minijogo: derrota `jogo`; vitória `vitoria`; quiz e jogos de raciocínio também `estudo` | |
| Lembrete de água / alongamento cumprido | `agua`, `treino` |
| Resposta com pesquisa e fontes | `pesquisa` |
| Minuto com o app em primeiro plano (só com percepção ligada) | exploração da região daquela categoria |

## Conversa (sem modelo)

`ficha`, `atributos`, `missões da semana`, `expedição`, `expedição no código`,
`como está a expedição`, `a`/`b` na encruzilhada, `usa <habilidade>`, `aprende <habilidade>`,
`especializar em <nome>`, `fabrica <receita>`, `investe 2 em sorte`, `pista`,
`tá com sede?`, `abre a aventura`, `/aventura` (`/rpg`) e os códigos secretos.

## Pendências conhecidas

- Clima nos segredos: o serviço lê `companion.climaAgora` (`tempestade`, `chuva`, `garoa`,
  `calor`). Quem preenche é a 0.47.6 (localização e clima); até lá esses três segredos não aparecem.
- A carteira e a loja de JOJOcoins são da frente "visuais dinâmicos e loja".
