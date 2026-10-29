# CHANGELOG

## 0.1.0 — 2026-10-29

Primeira versão funcional.

### Adicionado
- Overlay Electron transparente, sem moldura, sempre por cima, sem foco e fora da barra de tarefas.
- Click-through real fora do modo de interação, com watchdog e restauração em erros.
- Desvio do cursor com margem configurável (100 px), histerese, estabilização,
  re-planejamento, caminhos que evitam cruzar o cursor, saída de cantos, modo
  discreto quando não há espaço ou o cursor persegue o Jeff.
- Máquina de estados com prioridades; comportamentos autônomos com pesos por atividade e sonolência.
- Rig vetorial articulado **provisório** e 26 animações por quadros-chave; virar
  procedural; efeitos (corações, Zzz, poeira, brilhos, peixe, bola, "!"/"?").
- Balões de fala, pensamento e sono; posicionamento nas bordas; tempo de leitura; recolhimento perto do cursor.
- Modo de interação (Ctrl+Alt+J/bandeja): carinho, comer, brincar, arrastar, conversa, Esc, clique fora, timeout.
- Conversa offline com respostas programadas e interface de provedores para integrações futuras.
- Bandeja, configurações completas, persistência versionada com recuperação, instância única,
  iniciar com o Windows (off), multi-monitor/DPI/coordenadas negativas, recuperação de monitores,
  suspensão/bloqueio, detecção de tela cheia isolada em utilityProcess.
- Testes unitários, simulação, E2E com Electron (Xvfb) e integração no Windows via GitHub Actions.
- Scripts de build (NSIS + ZIP), ícones, folha de animações e medição de CPU/memória.
- Documentação: README, PRODUCT_SPEC, ARCHITECTURE, HANDOFF, assets/README; CLAUDE.md na raiz.

### Corrigido durante a verificação
- Boca aberta desenhava o contorno da língua em vez do lábio (Path2D).
- Destino da fuga deixava a caixa da janela 4 px fora da área útil.
- Renderer continuava desenhando com o Jeff oculto.
- Consulta de "iniciar com o Windows" em modo de desenvolvimento.
- Caminhos de teste no Windows (`URL.pathname` → `fileURLToPath`).
