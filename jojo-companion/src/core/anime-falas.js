// Falas do ecossistema de animes (25/11/2026), no jeito do JoJo: sério, mandão, humor seco,
// palavrão de vez em quando, nada de cara de assistente. Sempre com dados reais (nome do
// anime, episódio, horário, JOJOcoins) por variáveis; nunca insultam o corpo dela.
// Variáveis: {nome} anime, {ep} episódio, {quando} "hoje às 12h30", {falta} "2 h 10 min",
// {moedas} valor creditado, {saldo}, {temp} temporada, {apelido} (Manu/Emanuele), {n}.
// A moeda é sempre JOJOcoins (regra irredutível).

export const FALAS_ANIME = Object.freeze({
  // ---------------------------------------------------------------- calendário e alertas
  avisoMes: [
    'Daqui a um mês sai {nome}. Anotei. Você esquece, eu não.',
    '{nome} volta {quando}. Falta um mês, mas eu já tô contando.',
  ],
  avisoSemana: [
    'Uma semana pro episódio {ep} de {nome}. Organiza a vida.',
    '{nome}, episódio {ep}: {quando}. Sete dias. Nem pense em marcar compromisso.',
    'Semana que vem tem {nome}. Já separei o lugar no sofá.',
  ],
  avisoDia: [
    'Amanhã tem {nome}, episódio {ep}, {quando}. Prepara a pipoca, {apelido}.',
    'Episódio {ep} de {nome} sai amanhã. Dorme cedo hoje, que amanhã é dia sagrado.',
    '{nome} amanhã. Se você assistir spoiler antes, a gente briga.',
  ],
  avisoManha: [
    'Hoje é dia de {nome}. Episódio {ep} {quando}.',
    'Bom dia. Hoje sai o episódio {ep} de {nome}, {quando}. O resto do dia é detalhe.',
    'Hoje tem {nome}. Trabalha direito até lá que depois é recompensa.',
    'Acorda, {apelido}. Episódio {ep} de {nome} hoje, {quando}.',
  ],
  avisoProximo: [
    'Faltam {falta} pro episódio {ep} de {nome}. Vai ao banheiro agora.',
    '{falta} pro {nome}. Pega a água, pega a pipoca, larga o celular.',
    '{nome} em {falta}. Eu já tô sentado. Você que se atrase.',
    'Episódio {ep} de {nome} em {falta}. Não inventa moda.',
    'Contagem: {falta} pro {nome}. Fica esperta.',
  ],
  horario: [
    'Saiu. Episódio {ep} de {nome} no Japão agora. No seu serviço pode demorar um pouco.',
    'É agora: episódio {ep} de {nome}. Se ainda não apareceu aí, é o serviço enrolando, não eu.',
    'Hora do {nome}. Episódio {ep} no ar. Senta.',
  ],
  disponivel: [
    'Episódio {ep} de {nome} confirmado. Bora assistir.',
    'Saiu o {ep} de {nome}, {apelido}! Larga tudo. Tudo mesmo.',
    'Episódio {ep} de {nome} disponível. Vale {moedas} JOJOcoins se assistir inteiro.',
    'Tá lá: {nome}, episódio {ep}. Eu já vesti a roupa, então nem adianta enrolar.',
  ],
  apos: [
    'O episódio {ep} de {nome} saiu e você nem viu. Decepcionante.',
    '{nome} episódio {ep} parado aí esperando. Igual eu.',
    'Ainda não assistiu o {ep} de {nome}? Tá esperando convite formal?',
  ],
  adiamento: [
    '{nome} adiou o episódio {ep}. Agora é {quando}. Merda de estúdio.',
    'Adiaram {nome}. Novo horário: {quando}. Eu também tô puto.',
    'O episódio {ep} de {nome} mudou pra {quando}. Atualizei tudo, os alertas vão no horário novo.',
  ],
  pausa: [
    '{nome} entrou em pausa. Sem data de volta. Fica o luto.',
    'Pausa em {nome}. Eu aviso quando voltar, pode ficar tranquila.',
  ],
  retorno: [
    '{nome} voltou! Episódio {ep} {quando}.',
    'Acabou a pausa de {nome}. Episódio {ep} {quando}. Finalmente.',
  ],
  novaTemporada: [
    'NOVA TEMPORADA DE {nome}. {quando}. Eu sabia.',
    'Anunciaram {nome}, temporada nova, {quando}. Já tô vestido pra isso.',
    'Temporada nova de {nome} confirmada. Começa {quando}. Respira.',
  ],
  novaTemporadaSemData: [
    'Temporada nova de {nome} anunciada, mas sem data. Eu fico de olho.',
  ],
  encerrado: [
    'A temporada de {nome} acabou. Foi bom enquanto durou.',
    'Último episódio de {nome} exibido. Segura o choro.',
  ],
  semData: [
    '{nome} não tem episódio novo com data. Quando aparecer, eu aviso.',
    'Nada marcado pra {nome} ainda. Calendário vazio, paciência cheia.',
  ],
  estimado: [
    'Isso é previsão, não confirmação. Se mudar, eu aviso.',
  ],
  filaDepois: [
    'Enquanto você trabalhava saiu coisa: {lista}. Agora pode.',
    'Guardei os avisos pra não atrapalhar: {lista}.',
  ],

  // ---------------------------------------------------------------- seguir e configurar
  seguir: [
    'Seguindo {nome}. {prox}',
    'Anotado: {nome}. {prox}',
    '{nome} na lista. {prox} Eu aviso, você assiste.',
  ],
  jaSegue: ['Já sigo {nome} com você.', '{nome} já tá na lista, {apelido}. Memória de peixinho dourado?'],
  deixar: ['Parei de seguir {nome}. Episódio novo dele eu não aviso mais.', '{nome} fora da lista. Decisão sua.'],
  naoSegue: ['Esse eu nem seguia.', 'Não tô seguindo esse aí.'],
  favoritar: ['{nome} nos favoritos. Bom gosto, pra variar.', 'Favoritado: {nome}.'],
  alertaAntes: ['Fechado: aviso {antes} antes de {nome}.', 'Aviso {antes} antes do {nome}. Anotado.'],
  silenciar: ['{nome} silenciado. Eu fico quieto sobre ele.', 'Sem avisos de {nome}. Mas eu continuo julgando.'],
  silenciarTudo: ['Avisos de anime silenciados até {quando}. Depois eu volto.'],
  soDublado: ['Só dublado em {nome}, então. Mas a AniList não publica horário de dublagem: sem horário confirmado eu não invento alerta.'],
  soLegendado: ['Legendado em {nome}. Aviso no horário da exibição.'],
  naoAchei: ['Não achei anime com esse nome: {q}.', 'Procurei {q} e nada. Escreve de outro jeito.'],
  qualDeles: ['Achei mais de um: {lista}. Qual?', 'Qual deles? {lista}. Fala o número.'],
  fonteFora: ['O calendário não respondeu agora. Tenta daqui a pouco.', 'Fonte fora do ar. Uso o que eu já tinha guardado.'],
  desligado: ['O calendário de anime está desligado nas Configurações (Privacidade). Liga lá que eu aviso cada episódio.'],
  vazio: ['Você não segue nenhum anime ainda. Fala "me avisa quando sair" e o nome que eu cuido.'],
  agendaVazia: ['Nada {quando} nos seus animes. Dia de descanso.', 'Nenhum episódio {quando}. Vai treinar.'],
  disponivelBR: ['No Brasil eu não confirmo horário de serviço: o que eu tenho é a exibição no Japão ({quando}). Costuma aparecer um pouco depois.'],

  // ---------------------------------------------------------------- sessão
  inicioSessao: [
    'Sessão de {nome} ligada. Episódio {ep}. Pipoca na mão, boca fechada.',
    'Episódio {ep} de {nome}. Eu fico quietinho no canto. Juro.',
    'Bora: {nome}, episódio {ep}. Celular longe.',
    'Começou {nome}. Se eu falar durante o episódio pode me jogar no mar.',
  ],
  sessaoJaAberta: ['Já tem uma sessão de {nome} aberta. Termina ela primeiro.'],
  pausar: ['Pausei {nome}. O relógio também.', 'Pausado. Vai lá, eu espero.'],
  retomar: ['Voltando pro {nome}. Senta.', 'Retomado. Faltam uns {falta}.'],
  continuar: ['Você parou no episódio {ep} de {nome}. Bora continuar?', 'Próximo: {nome}, episódio {ep}. Diz "comecei" que eu ligo o relógio.'],
  nadaPraContinuar: ['Não tem nada pela metade. Escolhe um anime novo.'],
  cedoDemais: [
    'Já? Faltam {falta} pra contar. Episódio de verdade, não trailer.',
    'Calma: faltam {falta} de episódio. Pular abertura pode, pular o episódio não.',
  ],
  interrompida: ['A sessão de {nome} ficou pela metade. Quando voltar, ela continua de onde parou.'],

  // ---------------------------------------------------------------- recompensas
  conclusao: [
    'Episódio {ep} de {nome} assistido. +{moedas} JOJOcoins.',
    'Fechou o {ep} de {nome}. {moedas} JOJOcoins na carteira. Mérito duvidoso, mas conta.',
    'Mais um: {nome}, episódio {ep}. +{moedas} JOJOcoins. Otaku profissional.',
    '+{moedas} JOJOcoins por {nome}. Isso que é investimento.',
  ],
  primeiroEp: [
    'Primeiro episódio de {nome}! +{moedas} JOJOcoins de boas-vindas.',
    'Anime novo: {nome}. Bônus de {moedas} JOJOcoins pra começar.',
  ],
  retomada: ['Voltou pro {nome} depois de semanas. +{moedas} JOJOcoins de bônus. Lealdade paga.'],
  temporada: [
    'TEMPORADA COMPLETA de {nome}. +{moedas} JOJOcoins. Respeito.',
    'Você assistiu {nome} inteiro. +{moedas} JOJOcoins. Eu tô quase orgulhoso.',
  ],
  serie: [
    'Acabou {nome}. De vez. +{moedas} JOJOcoins. Pode chorar, eu deixo.',
    'Série concluída: {nome}. +{moedas} JOJOcoins. Agora o vazio existencial.',
  ],
  revisita: ['Reassistindo {nome}? Vale {moedas} JOJOcoins, só um pouquinho. Nostalgia é barata.'],
  semRecompensa: [
    'Esse episódio já rendeu JOJOcoins. Ficou registrado, sem pagar de novo.',
    'Já contei esse. Assistir de novo é amor, não salário.',
  ],
  tetoDia: [
    'Hoje já rendeu o máximo de JOJOcoins com anime. Assiste por amor agora.',
    'Teto do dia de anime batido. O episódio fica no histórico, as moedas amanhã.',
  ],
  manualSuspeito: ['Isso não cabe no dia, {apelido}. Registrei como autodeclarado, sem moedas.'],
  manual: ['Anotado como autodeclarado: {nome}, episódio {ep}. +{moedas} JOJOcoins.', 'Registrado: {nome} {ep}. Confio em você. Mais ou menos.'],
  quantoGanho: [
    'Episódio de {nome} vale {moedas} JOJOcoins. {extra}',
    '{nome}: {moedas} JOJOcoins por episódio inteiro. {extra}',
  ],
  quantoGanhei: [
    'Hoje anime rendeu {moedas} JOJOcoins. No total, {total}.',
    'Com anime: {moedas} JOJOcoins hoje, {total} desde sempre. Saldo: {saldo}.',
  ],
  moedas: ['+{moedas} JOJOcoins.', 'JOJOcoins na conta: +{moedas}.'],
  estorno: ['Corrigi o histórico e devolvi {moedas} JOJOcoins. Honestidade.', 'Desfeito: -{moedas} JOJOcoins.'],

  // ---------------------------------------------------------------- conquistas e resumo
  conquista: [
    'Conquista: {titulo}! +{moedas} JOJOcoins.',
    '{titulo}. Desbloqueado. +{moedas} JOJOcoins. Eu tô emocionado e não vou admitir.',
    'Conquista nova: {titulo}. Isso vai pro seu currículo de otaku.',
  ],
  resumo: [
    'Hoje: {lista}.',
    'Resumo de anime de hoje: {lista}.',
  ],
  resumoVazio: ['Hoje não tem nada dos seus animes. Dia livre.'],
  pendentes: ['Pendentes: {lista}.', 'Você deve: {lista}. Vergonha.'],
  semPendentes: ['Tudo em dia. Milagre.', 'Nenhum episódio pendente. Tô chocado.'],
  vergonha: ['{n} episódios de {nome} atrasados. Já virou dívida.'],
  provocacaoMaratona: [
    'Terceiro episódio seguido. Levanta, bebe água e volta.',
    'Maratona boa, mas teu corpo também precisa de alongamento. Dois minutos.',
  ],
  noite: ['Episódio de {nome} às {hora}. Assiste e dorme, não emenda mais cinco.'],
});

/** Sorteia uma fala e preenche as variáveis (as que faltam viram vazio, nunca "{x}"). */
export function falaAnime(chave, vars = {}, rng = Math.random) {
  const lista = FALAS_ANIME[chave];
  if (!lista?.length) return '';
  const f = lista[Math.floor(rng() * lista.length) % lista.length];
  return f.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k]))).replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
}

/** Total de falas (o pedido exige pelo menos 100). */
export const totalFalasAnime = () => Object.values(FALAS_ANIME).reduce((n, l) => n + l.length, 0);
