// Estado da conexão do WhatsApp: por que a conexão caiu (pelo código que o
// WhatsApp manda, nunca pelo texto do erro), se tenta de novo sozinho e o que a
// tela mostra. Puro: o processo isolado (whatsapp-worker.mjs) decide com
// `classificarFechamento` e a janela mostra o resultado de `estadoVisivel`.

/** Códigos de fechamento do Baileys (DisconnectReason) usados aqui. */
export const WA_CODIGOS = Object.freeze({
  conexaoFechada: 428, conexaoPerdida: 408, substituida: 440, sessaoEncerrada: 401, sessaoRuim: 500,
  reiniciar: 515, multiAparelho: 411, proibido: 403, versao: 405, indisponivel: 503,
});

/** Validade do QR code: o primeiro vale 60 s e cada renovação 20 s (padrão do WhatsApp Web). */
export const WA_QR = Object.freeze({ primeiroMs: 60e3, renovacaoMs: 20e3, ciclosAutomaticos: 3 });

/** Espera antes de tentar de novo: 3 s, 6 s, 12 s… até 60 s. */
export const esperaReconexao = (tentativa) => Math.min(60e3, 3e3 * 2 ** Math.max(0, tentativa));

const ERRO_REDE = /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|ENETDOWN|getaddrinfo|socket hang up/i;

/**
 * Decide o que fazer quando a conexão fecha.
 * `codigo`: statusCode do WhatsApp; `mensagem`: texto do erro (só para rede);
 * `registrado`: já existe aparelho conectado (sessão salva) ou ainda é QR code;
 * `tentativas`: quantas reconexões seguidas já falharam.
 * Devolve { motivo, reconectar, esperaMs, apagarSessao, atualizarVersao }.
 */
export function classificarFechamento({ codigo = null, mensagem = '', registrado = false, tentativas = 0 } = {}) {
  const c = Number(codigo) || null;
  const texto = String(mensagem || '');
  const de = (motivo, extra = {}) => ({ motivo, reconectar: false, esperaMs: 0, apagarSessao: false, atualizarVersao: false, codigo: c, ...extra });
  const tentar = (motivo, extra = {}) => de(motivo, { reconectar: true, esperaMs: esperaReconexao(tentativas), ...extra });
  // Depois de ler o QR o WhatsApp sempre pede para reabrir a conexão: é o caminho normal.
  if (c === WA_CODIGOS.reiniciar) return de('reiniciar', { reconectar: true });
  if (c === WA_CODIGOS.sessaoEncerrada) return de('sessao_encerrada', { apagarSessao: true });
  if (c === WA_CODIGOS.sessaoRuim || c === WA_CODIGOS.multiAparelho) return de('sessao_invalida', { apagarSessao: true });
  if (c === WA_CODIGOS.substituida) return de('outra_sessao');
  if (c === WA_CODIGOS.proibido) return de('conta_recusada');
  if (c === WA_CODIGOS.versao) return tentativas < 1 ? de('versao', { reconectar: true, atualizarVersao: true }) : de('versao');
  if (ERRO_REDE.test(texto)) return tentar('sem_internet');
  // O QR code expirou sem ninguém ler: não fica gerando código novo sozinho para sempre.
  if (!registrado && /QR refs/i.test(texto)) return de('qr_expirado');
  if (c === WA_CODIGOS.indisponivel) return tentar('servico_fora');
  if (c === WA_CODIGOS.conexaoPerdida || c === WA_CODIGOS.conexaoFechada) return tentar('conexao_caiu');
  return tentar('desconhecido');
}

/**
 * O que aconteceu e o que fazer, em uma frase, com o botão certo.
 * acao: 'conectar' (abre um QR novo ou reconecta a sessão salva) | 'tentar' (tenta já).
 */
export const WA_MOTIVOS_CONEXAO = Object.freeze({
  sem_internet: { frase: 'Este PC está sem internet. Confira o Wi-Fi; eu tento de novo sozinho.', acao: 'tentar', rotulo: 'Tentar agora' },
  conexao_caiu: { frase: 'A conexão com o WhatsApp caiu. Eu tento de novo sozinho.', acao: 'tentar', rotulo: 'Tentar agora' },
  servico_fora: { frase: 'Os servidores do WhatsApp não estão respondendo agora. Eu tento de novo sozinho.', acao: 'tentar', rotulo: 'Tentar agora' },
  sem_resposta: { frase: 'O WhatsApp não confirmou a conta a tempo. Eu tento de novo sozinho.', acao: 'tentar', rotulo: 'Tentar agora' },
  desconhecido: { frase: 'O WhatsApp fechou a conexão sem dizer o motivo (código {codigo}). Eu tento de novo sozinho.', acao: 'tentar', rotulo: 'Tentar agora' },
  versao: { frase: 'O WhatsApp pediu uma versão mais nova da conexão e recusou de novo. Toque em Tentar de novo; se repetir, atualize o JoJo.', acao: 'tentar', rotulo: 'Tentar de novo' },
  qr_expirado: { frase: 'O QR code expirou sem ser lido. Gere um novo e escaneie com o celular.', acao: 'conectar', rotulo: 'Gerar novo QR code' },
  qr_falhou: { frase: 'Não consegui desenhar o QR code na tela. Gere um novo.', acao: 'conectar', rotulo: 'Gerar novo QR code' },
  sessao_encerrada: { frase: 'Este PC foi desconectado pelo celular. Escaneie o QR code de novo para voltar.', acao: 'conectar', rotulo: 'Escanear de novo' },
  sessao_invalida: { frase: 'A conexão salva neste PC não vale mais e foi apagada. Escaneie o QR code de novo.', acao: 'conectar', rotulo: 'Escanear de novo' },
  outra_sessao: { frase: 'Esta conexão foi aberta em outro lugar. Toque em Conectar aqui para voltar a usar neste PC.', acao: 'conectar', rotulo: 'Conectar aqui' },
  conta_recusada: { frase: 'O WhatsApp recusou esta conta. Abra o WhatsApp no celular para ver o aviso e depois tente de novo.', acao: 'conectar', rotulo: 'Tentar de novo' },
  processo_parou: { frase: 'A parte do JoJo que fala com o WhatsApp parou. Toque em Tentar de novo.', acao: 'conectar', rotulo: 'Tentar de novo' },
  nao_iniciou: { frase: 'Não consegui abrir a conexão do WhatsApp neste PC. Toque em Tentar de novo; se repetir, reinicie o JoJo.', acao: 'conectar', rotulo: 'Tentar de novo' },
});

/** Motivos que pedem uma ação dela (não se resolvem sozinhos). */
export const WA_MOTIVOS_ACAO = Object.freeze(['qr_expirado', 'qr_falhou', 'sessao_encerrada', 'sessao_invalida', 'outra_sessao', 'conta_recusada', 'versao', 'processo_parou', 'nao_iniciou']);

/** Os cinco estados que a usuária vê. */
export const WA_ESTADOS_VISIVEIS = Object.freeze({
  desconectado: 'Desconectado', qr: 'Aguardando QR code', conectando: 'Conectando', conectado: 'Conectado', erro: 'Erro',
});

const fraseDe = (motivo, codigo) => (WA_MOTIVOS_CONEXAO[motivo]?.frase || '').replace('{codigo}', String(codigo ?? '?'));

/**
 * Estado interno do serviço → o que a tela mostra: um dos cinco estados, uma
 * frase objetiva e no máximo um botão. `agora` serve para a contagem.
 */
export function estadoVisivel(c = {}, agora = Date.now()) {
  const estado = c.estado || 'desligado';
  const acaoDe = (motivo) => (WA_MOTIVOS_CONEXAO[motivo] ? { id: WA_MOTIVOS_CONEXAO[motivo].acao, rotulo: WA_MOTIVOS_CONEXAO[motivo].rotulo } : null);
  const v = (chave, frase, acao = null, extra = {}) => ({ chave, titulo: WA_ESTADOS_VISIVEIS[chave], frase, acao, ...extra });
  if (estado === 'conectado') {
    return v('conectado', 'Conta confirmada com o WhatsApp. As mensagens programadas saem na hora marcada.', null, { conta: { nome: c.nome || null, numero: c.numero || null }, confirmadoEm: c.confirmadoEm || null });
  }
  if (estado === 'qr') {
    const restante = c.qrExpiraEm ? Math.max(0, Math.ceil((c.qrExpiraEm - agora) / 1000)) : null;
    return v('qr', 'Escaneie o código com o celular.', null, { restanteSeg: restante, renovacao: c.qrRenovacao || 0 });
  }
  if (estado === 'pareando') return v('conectando', 'QR code lido. Confirmando a conta com o WhatsApp.');
  if (estado === 'conectando') return v('conectando', c.motivo === 'reiniciar' ? 'QR code lido. Confirmando a conta com o WhatsApp.' : 'Abrindo a conexão com o WhatsApp.');
  if (estado === 'reconectando') {
    const espera = c.proximaEm ? Math.max(0, Math.ceil((c.proximaEm - agora) / 1000)) : null;
    const base = fraseDe(c.motivo, c.codigo) || WA_MOTIVOS_CONEXAO.conexao_caiu.frase;
    return v('conectando', espera ? `${base} Nova tentativa em ${espera} s.` : base, { id: 'tentar', rotulo: 'Tentar agora' }, { reconectando: true, restanteSeg: espera });
  }
  if (estado === 'erro') {
    const motivo = WA_MOTIVOS_CONEXAO[c.motivo] ? c.motivo : 'processo_parou';
    return v('erro', fraseDe(motivo, c.codigo), acaoDe(motivo));
  }
  // desligado
  if (c.motivo === 'sessao_encerrada' || c.motivo === 'sessao_desconectada') return v('desconectado', WA_MOTIVOS_CONEXAO.sessao_encerrada.frase, acaoDe('sessao_encerrada'));
  if (WA_MOTIVOS_CONEXAO[c.motivo]) return v('desconectado', fraseDe(c.motivo, c.codigo), acaoDe(c.motivo));
  return v('desconectado', 'Conecte o WhatsApp deste PC para eu mandar as mensagens programadas.', { id: 'conectar', rotulo: 'Conectar WhatsApp' });
}
