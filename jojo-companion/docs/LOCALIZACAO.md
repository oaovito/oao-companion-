# Localização real e clima (0.47.6)

## Modos (Configurações → Localização e clima)

| Modo | O que faz |
| --- | --- |
| Manual (padrão) | Usa a cidade escrita. Não pede nada ao Windows. |
| Automática | Pede a posição ao serviço de localização do Windows. Só liga depois de ela confirmar o aviso; o Windows também precisa permitir apps da área de trabalho. |
| Desligada | Nada é consultado nem guardado; a última localização é apagada. |

Intervalo da automática: 15 min, 30 min, 1 h (padrão), 3 h, 6 h ou 12 h. Também ao abrir (20 s depois), ao
voltar da suspensão (30 s depois) e a pedido ("Atualizar agora", "atualiza minha localização"). No máximo uma
consulta por minuto, mesmo a pedido. Entre verificações, vale a última.

## Fontes e precisão

- Windows: `System.Device.Location.GeoCoordinateWatcher` via PowerShell (uma leitura, até 15 s, e para).
  Precisão pelo raio que o Windows informa: exata (até 100 m), bairro (até 2 km), cidade, região.
- Rede/IP (GeoJS), só como alternativa e desligável: nunca passa de "cidade", raio mínimo de 25 km, e nunca
  muda o fuso (pode ser VPN).
- Manual: geocodificação da Open-Meteo (a mesma da previsão).
- Nome do lugar: BigDataCloud, com coordenada arredondada, só quando ela anda mais de 3 km.
- Sem fonte: fica a última válida; sem nenhuma, nada é inventado (a previsão pede a cidade).

## Privacidade

- Só a última localização, cifrada pelo Windows (`safeStorage`, em `<userData>/localizacao.json`). Sem
  cifra disponível, fica só na memória. Sem histórico e sem trajeto.
- Coordenadas guardadas e enviadas com 2 casas (cerca de 1 km).
- Balões e tela mostram no máximo cidade e estado.

## Usos

- Previsão sem cidade na pergunta.
- Fuso: localização confiável num fuso diferente do Windows → o processo principal segue o fuso do lugar
  (`process.env.TZ`), então lembretes, vigília, timers e o dia do XP seguem o horário de lá. Desligável.
- Mudança de cidade, estado, país ou fuso: aviso único.
- Clima ambiente (Open-Meteo, coordenadas): no máximo 1 consulta por hora, cache de 30 min. Dado com mais de
  3 h não vale.

## Reações (opcionais)

`src/core/clima-anims.js`: `cat_cl01`–`cat_cl12` (chuva 3, frio 2, calor 3, tempestade 2, neve 1, noite 1),
adereços `cl_*` numa cópia do rig. Reage quando a condição muda; a mesma condição só depois de 3 h; até 4 por
dia. Luz de noite: tom azulado sobre o JoJo (`luzNoite` no estado do overlay). Nada no Modo Trabalho, foco,
tela cheia, JoJo escondido ou pausado.

## Arquivos

`src/core/localizacao.js`, `src/core/clima-ambiente.js`, `src/core/clima-anims.js`,
`src/core/companion-clima.js`, `src/main/localizacao-service.js`, `test/unit/localizacao-clima.test.js`.

## Limites conhecidos

- Precisa de teste manual no Windows: permissão negada/concedida, sem GPS (Wi-Fi), PowerShell bloqueado por
  política da empresa e troca de fuso com o app aberto.
- Este ambiente não alcança os serviços de localização: as fontes foram testadas com respostas simuladas.
