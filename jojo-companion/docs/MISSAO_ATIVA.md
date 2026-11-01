# Missao ativa — JoJo Companion 0.45.0

Estado: EM IMPLEMENTACAO. Base 0.44.0 publicada, commit 4193c2b.
Branch privada codex/living-companion. Sem publicacao nova.
Prompt mestre + Darkest Dungeon + To-Do sao cumulativos, nao substituem pedidos.
Nao tratar itens pendentes como entregues.

## Evidencias e codigo em curso

Agenda verificava so agendaUrl, ignorava falhas/sync e dizia lista vazia = dia livre.
Pesquisa aceitava resultados sem assunto correspondente (atriz em pergunta de clima).
Nao havia meteorologia dedicada nem CalDAV autenticado.

WeatherService Open-Meteo implementado: roteamento antes de acoes/modelo, cidade
explicita/default, timezone, cache, erros e regressao da captura. API real respondeu
em 01/11/2026: Guarapuava, America/Sao_Paulo, observacao 16:30, 22,4 C, sensacao
23,5 C, umidade 72%, vento 9,6 km/h, precipitacao 0,1 mm. GUI/configuracao pendente.
Agenda agora distingue desconectada/configurada/sync/erro/consulta valida/vazia;
lastSync nao avanca em falha; negativas nao desconectam.
Relevancia agora obrigatoria. Crossref generico da fixture antiga passou a ser
excluido; esperado corrigido para manter apenas fontes pertinentes.
Nova suite live-tools.test.js tem 6 testes. Total confirmado 336/336, zero pulos;
log /workspace/jojo-living-p0-tests.tap. Nao comprova teste Windows da candidata.

To-Do implementada e integrada: modelos, persistencia/backup, XP compartilhado,
chat, Central, configuracoes e painel Windows opcional. Detalhes em TAREFAS.md.
15 testes novos passaram isoladamente; total 351/351 antes do ultimo ajuste.
Quatro cenarios Electron Windows adicionados, ainda nao executados. Fazer CI e
corrigir causas reais antes de marcar entrega validada. Demais sistemas abaixo
continuam pendentes: nao publicar uma entrega parcial.

Actions 41345465266 (17ea015): preflight/lint/install/351 unitarios Windows passaram;
conversa real falhou 30/31 por confirmar maca em vez de manga na correcao pessoal.
Build e E2E nao iniciaram. Correcao literal geral implementada com regressao pt/en,
preservando o historico. Nao remover nem enfraquecer a verificacao.
Darkest: modelo/Windows worker/Steam manifest/UI/XP/16 falas/5 receitas com desenho
vetorial implementados; 9 testes puros passaram. Icone original gerado pela ferramenta
image_gen e exportado PNG/ICO. Faltam medidas Windows das 5 novas animacoes (o teste
de cobertura falha corretamente ate importar a medicao), prova nativa do detector,
anatomia sem membros humanos e gates finais. Diagnostico manual assets_only no
workflow original mede room/audita desenho e roda somente os 4 E2E de tarefas;
NAO substitui pipeline completo nem tem etapa de publicacao.

Run diagnostico 41346571613, a3240e4: medicao Windows passou, auditoria real 1.058
animacoes passou (0 erros/recortes/paradas/orfas, media 0,21 ms); os primeiros dois
E2E To-Do passaram. Terceiro travou ao encerrar com painel: handler de close vetava
app.quit antes do will-quit. Run cancelado para parar consumo; corrigido para fechar
no before-quit. Testes agora tem timeout e falham se precisar matar processo. Nao
alegar que os 4 passaram; arquivo room ainda precisa ser recuperado/regenerado.

Depois dessa medicao, anatomia foi adaptada para nadadeiras SEM membros humanos,
preservando IDs/canais como ancoras de aderecos. Requer NOVA medicao/auditoria Windows.
CalDAV/GUI/DPAPI e iCalendar (fusos/DST/excecoes) implementados, suites novas passam.
Ver AGENDA_ICLOUD.md; script de ensaio live existe e BLOQUEIA sem credencial segura.
Adicionados cenarios Windows DPAPI e detector DD1 com processo/manifesto Steam de
fixture, explicitamente nao equivalentes a uma partida comercial. Total E2E esperado
35 (29 anteriores, 4 tarefas, 1 DPAPI, 1 detector). Repetir diagnostico antes de build.

## Checklist integral

- [ ] Clima real: Open-Meteo, cidades/datas/timezone/cache, GUI/configuracao, teste live.
- [ ] CalDAV iCloud: descoberta/auth/calendarios/recorrencia/fusos, sync auto/manual,
  estados, DPAPI nativo e teste com conta autorizada.
- [ ] Necessidades persistentes fome/saude/humor/higiene, equilibradas sem punir offline/foco.
- [ ] Seis cocos clicaveis, XP 5/12/25/50/100/250, efeitos/limite/persistencia/easter eggs licenciados.
- [ ] XP unico: barra/efeitos/historico/recompensas, ledger antifarm e migracoes.
- [ ] >=10 novas animacoes necessidades + comer/XP/recompensas realmente renderizadas.
- [ ] Anatomia sem membros humanos, retarget de catalogo legado sem apagar funcionalidades.
- [ ] Exatamente 50 NOVAS comidas (preservar seis antigas; lula ja existe, nao duplicar).
- [ ] >=50 conjuntos novos: 25 memes +25 profissoes com props/gatilhos/cooldown.
- [ ] Atalho Windows unico: usuario/publico/instalador/portatil, migracao e updates repetidos.
- [ ] Icone novo profissional multirresolucao via ferramenta de imagem; integrar no Windows.
- [ ] Discord: encerrar normalmente e verificar; forca so opt-in; demais apps preservados.
- [ ] DD1 Steam: processo correto, foreground/idle, tempo monotono, XP/limites/dedup,
  sugestao diaria 06–21 sem repeticao/foco/fullscreen; 15 falas +5 animacoes.
- [ ] DD XP 15 inicio valido, 50 primeira sessao/dia, 25/40/80 aos 15/30/60 min;
  stats/sessoes/tempo/streak persistentes; 7 dias distintos = O Herdeiro da Ruina.
- [ ] To-Do CRUD ilimitado/paginado, DND, categorias/descricao/prioridade/prazos.
- [ ] To-Do recorrencia/reset local customizado/DST/PC desligado, historico,
  import/export/backup, XP 5/10/20 +50 tudo +150 sete dias, antifarm e gamificacao opcional.
- [ ] To-Do UI completa/settings/dock real (tamanho/posicao/opacidade/cores),
  comandos naturais com esclarecimento de ambiguidade, 10 falas, sem sons/notificacoes no foco.
- [ ] Preservar overlay click-through, fuga/tela cheia/multimonitor/personalidade/privacidade/offline.
- [ ] Unitarios/regressoes, Windows real/E2E/render/anatomia/performance/artefatos/updater.
- [ ] Changelog incremental somente fatos; versao/lock/tag/3 arquivos consistentes.
- [ ] Publicar so apos todos os requisitos/gates; preservar 18 historicas e MNE_Lab.

## Proximas operacoes

1. Terminar P0 e validar testes existentes/novos.
2. Instalar deps ical.js 2.2.1 e saxes 6.0.0 (versoes consultadas no npm),
   --ignore-scripts no editor para nao baixar Electron Linux; lockfile reprodutivel.
3. Implementar CalendarService CalDAV + credenciais DPAPI/GUI, recorrencia/fusos reais.
4. XP compartilhado e modelos puros Survival/Darkest/Todo; integrar IPC/render/Windows.
5. Conteudo/arte/anatomia/icone/licencas; testes reais Windows e publicacao condicionada.

## Dependencias externas reais

Nao ha credencial/conta iCloud autorizada no ambiente (status sem bindings/identidades).
Nao pedir senha no chat nem fingir autenticacao. Preparar integracao completa antes de
explicar a dependencia externa. DD comercial pode nao existir no runner; fixtures
Steam de processos nao equivalem a partida comercial real. Nao contratar/usar trials,
nao depender do PC do usuario. So runners GitHub oficiais.
