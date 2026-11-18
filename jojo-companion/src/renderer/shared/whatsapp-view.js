// Partes puras da janela do WhatsApp (sem DOM), testadas em Node: barra de
// estado, contagem do QR code, conta conectada e textos das mensagens.
import { formatarNumero } from '../../core/whatsapp-contatos.js';

export const CLASSE_BARRA = Object.freeze({ desconectado: '', qr: 'warn', conectando: 'warn', conectado: 'ok', erro: 'bad' });

/** "Emanuele · +55 (42) 99999-0000" (o que se souber da conta). */
export function contaTexto(conta) {
  if (!conta) return '';
  return [conta.nome, conta.numero ? formatarNumero(conta.numero) : null].filter(Boolean).join(' · ');
}

/** Barra de estado, sempre visível: cor, título objetivo e a conta quando conectado. */
export function barra(v) {
  return { classe: CLASSE_BARRA[v.chave] ?? '', titulo: v.titulo, conta: v.chave === 'conectado' ? contaTexto(v.conta) : '' };
}

/** "14:32" no relógio do PC. */
export function horaCurta(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "hoje às 14:32", "ontem às 09:10" ou "12/11 às 14:32". */
export function quandoFoi(ms, agora = Date.now()) {
  if (!ms) return '';
  const d = new Date(ms), a = new Date(agora);
  const dia = (x) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const ontem = new Date(a.getFullYear(), a.getMonth(), a.getDate() - 1);
  const qual = dia(d) === dia(a) ? 'hoje' : dia(d) === dia(ontem) ? 'ontem' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${qual} às ${horaCurta(ms)}`;
}

/** Contagem do QR: segundos restantes, fração da barra e o texto. */
export function qrInfo(conexao, agora = Date.now()) {
  const fim = conexao?.qrExpiraEm || 0;
  const restante = fim ? Math.max(0, Math.ceil((fim - agora) / 1000)) : 0;
  const total = (conexao?.qrValidadeMs || 60e3) / 1000;
  return {
    restante,
    fracao: Math.max(0, Math.min(1, restante / total)),
    texto: restante > 0 ? `Este código vale por mais ${restante} s.` : 'Este código expirou. Gerando um código novo…',
    expirou: restante <= 0,
  };
}

/** Ao abrir a janela: conectado vai para as mensagens; qualquer outro estado, para a conexão. */
export function telaInicial(chave, pedida = null) {
  if (pedida === 'conexao') return 'conexao';
  if (chave !== 'conectado') return 'conexao';
  return ['mensagens', 'contatos'].includes(pedida) ? pedida : 'mensagens';
}
