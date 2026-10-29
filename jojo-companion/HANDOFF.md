# HANDOFF — estado atual (v0.12.0, 2026-10-29)

Leia também: `PRODUCT_SPEC.md` (requisitos e uso), `ARCHITECTURE.md`
(organização), `assets/README.md` (formatos), `CLAUDE.md` na raiz (regras de trabalho).

## Onde verificar

| Ambiente | O que roda | Comando |
|---|---|---|
| Linux (sessão de desenvolvimento) | 107 testes unitários/simulação, 13 E2E com Electron real sob Xvfb, medição | `npm test`, `npm run test:e2e`, `node scripts/measure.mjs` |
| Windows real (GitHub Actions `windows-latest`) | unitários, build do instalador, 8 testes de integração com mouse/teclado reais do sistema, E2E, medição | workflow `.github/workflows/jojo-windows.yml` |

## Verificado

### Windows real (CI `windows-latest`, Windows Server, 1 monitor, escala 100%)
- 62/62 unitários e 10/10 E2E passando.
- Instalador NSIS e ZIP gerados no próprio Windows (artefato `JoJoCompanion-windows-x64`).
- Clique real (mouse_event) sobre o JoJo parado chega à janela de trás.
- Cliques reais **durante a fuga** chegam à janela de trás.
- O JoJo falando, fugindo e se movendo não tira o foco da janela do usuário (GetForegroundWindow).
- Atalho global real Ctrl+Alt+J entra no modo de interação; Esc real sai e restaura click-through/foco.
- Detecção de tela cheia (utilityProcess + koffi) oculta o JoJo com janela em tela cheia e o reexibe.
- O executável empacotado inicia, carrega assets e o detector nativo.
- No modo de interação, hover real sobre a barra captura o mouse e o clique aciona o botão;
  clique real numa área transparente do overlay passa para a janela de trás.
- "Iniciar com o Windows" desligado por padrão, liga e desliga (registro de login do usuário).

### Linux/Xvfb (indicativo, não substitui Windows)
- Overlay sem foco, sempre por cima, canto transparente, sem erros no renderer.
- Desvio real com janela se movendo; interação, conversa, Esc; arrastar; todas as animações;
  configurações persistidas; arquivo inválido recuperado; instância única; ocultar/pausar;
  suspensão simulada; nenhuma requisição de rede.
- Medição (Linux/Xvfb, renderização por software, CPU = % de um núcleo somando processos):
  ocioso ≈ 2,9% (máx 6,5%), cursor perseguindo ≈ 3,4%, oculto ≈ 0,2%; memória (working set
  somado) ≈ 525–550 MB; renderer estabiliza em ~194 MB após ~2 min (sem crescimento contínuo
  em 4 min de teste com falas e fugas).

## Implementado, mas ainda não verificado no Windows

- Vários monitores com DPI diferente e coordenadas negativas (lógica testada em simulação;
  o runner tem um monitor só).
- Desconexão física de monitor e mudança de resolução (simulação + eventos do Electron).
- Suspensão e retomada reais, bloqueio de tela (eventos `powerMonitor`; testado chamando os handlers).
- Ícone e menu da bandeja (criados sem erro; menu não inspecionado visualmente).
- Arrastar com o mouse real e carinho por "esfregar" com hover real.
- Aparência no Windows 11 (transparência sem halo, nitidez em 125–200%) — precisa de olho humano.
- Barra de tarefas cobrindo o JoJo (mitigado reafirmando topmost a cada 8 s).

## Pendente / limitado

- v0.10.0: supino desenhado com o rig de frente girado (leitura de desenho
  animado, não anatômica). O efeito "ligadão" é piada de desenho; desligar o
  humor com drogas troca por pré-treino.

- Pesquisa (v0.9.0): resposta montada a partir do resumo da fonte (não é IA; não
  "entende" a pergunta). Perguntas muito específicas podem cair num artigo
  genérico. Neste ambiente de desenvolvimento a internet externa é bloqueada; a
  pesquisa real é conferida no CI do Windows (`scripts/check-web-search.mjs`).
- Portátil: descompacta a cada início (alguns segundos a mais); SmartScreen avisa
  por não ser assinado.

- Pet/atividades (v0.8.0): conversas só em memória (somem ao encerrar). Movimento
  reduzido do Windows lido via `prefers-reduced-motion`; não conferido numa máquina
  com "Efeitos de animação" desligado.

- Fiscal do Instagram: só Windows e só pelo título da janela/nome do executável
  (se o navegador mostrar outro título na aba, não detecta). iPhone exigiria
  integração separada (não implementada).

- **Arte provisória**: rig vetorial de frente no estilo recorte de papel (South Park), versão adulta fisiculturista com presas e cotovelos articulados, feito à mão
  a partir da referência do usuário (`"provisional": true`). Falta arte final; o visual ainda não
  passou por revisão do usuário no Windows.
- Instalador **não assinado** (SmartScreen avisa).
- Jogos em tela cheia exclusiva e telas protegidas ficam por cima — limitação aceita.
- Sons: apenas bipes sintetizados (WebAudio), desligados por padrão.
- No Linux o modo de interação captura a janela inteira (sem `forward`) — só desenvolvimento.
- Sob Wine o executável Windows inicia mas trava na criação da janela (limitação do Wine;
  não usar Wine como verificação).
- Memória típica de Electron; se for problema, avaliar `app.disableHardwareAcceleration()`
  (removeria o processo de GPU) após testar transparência no Windows.

## Checklist manual sugerido (máquina Windows 11)

1. Instalar pelo `JoJoCompanion-Setup-*.exe`; confirmar ícone na bandeja e nenhuma janela na barra de tarefas.
2. Aproximar o mouse pelos quatro lados e pelos cantos; clicar rápido onde o JoJo estava.
3. Perseguir o JoJo; confirmar modo discreto e retorno.
4. Ctrl+Alt+J: carinho (esfregar), comer, brincar, arrastar, conversa, Esc, clique fora, timeout.
4b. Clique no pet abre a Central; clique numa atividade abre a conversa; `/pet` guarda/acorda;
    "Efeitos de animação" desligado deixa o pet estático.
5. Dois monitores com escalas diferentes (ex.: 100% e 150%), um à esquerda do principal.
6. Desconectar o monitor onde o JoJo está; mudar resolução.
7. Suspender e retomar; bloquear e desbloquear.
8. Vídeo em tela cheia (YouTube/VLC) e apresentação.
9. Ativar "Iniciar com o Windows", reiniciar, desativar.

## Próximos passos sugeridos

- Arte final (sprites ou rig refinado) mantendo `assets/README.md`.
- Assinatura de código e auto-update (decisão do usuário).
- Provedor de diálogo opcional (modelo local/API) implementando `DialogueProvider`.

## Resultado da última execução do CI

Run #14 (v0.9.0, https://github.com/oaovito/oao-companion-/actions/runs/40812808265): **sucesso**.
Portátil abriu sem instalação em 21,9 s; pesquisa real na Wikipédia respondeu às 3
perguntas; integração Windows 9/9; E2E 12/12. Ocioso 2,3% CPU, 371 MB.

Run #13 (v0.8.0, https://github.com/oaovito/oao-companion-/actions/runs/40810888984): **sucesso**.

Runs #11 (v0.6.0) e #12 (v0.7.0, https://github.com/oaovito/oao-companion-/actions/runs/40809682449):
**sucesso**. O resultado da v0.8.0 sai no próximo run do workflow.

Histórico:

Run #4 (`c4e7d4c`, https://github.com/oaovito/oao-companion-/actions/runs/40802636763): **sucesso**.
Unitários 62/62, integração Windows 8/8, E2E 10/10, instalador + ZIP gerados.
O run #2 havia falhado em 2 testes; corrigidos no run #3: o teste usava SetCursorPos
(que não gera eventos de hook de mouse) e a consulta de "iniciar com o Windows" não
passava o mesmo caminho/argumentos do registro.

Medição no Windows (Windows Server 10.0.26100, 2 vCPUs AMD EPYC, sem GPU dedicada, 20 s por cenário):

| Cenário | CPU média | CPU máx | Memória (working set somado) |
|---|---|---|---|
| Ocioso | 3,4% | 4,9% | 351 MB |
| Cursor perseguindo | 6,2% | 11,0% | 349 MB |
| Oculto | 0,3% | 1,6% | 309 MB |

Processos: principal ~98 MB, GPU ~45–52 MB, utilitários ~86–107 MB (inclui o detector de
tela cheia), renderer ~83–109 MB. Runner de CI, não um PC Windows 11 doméstico.
