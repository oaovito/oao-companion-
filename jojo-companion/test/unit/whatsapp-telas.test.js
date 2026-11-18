// Telas do WhatsApp: partes puras (barra de estado, contagem do QR, conta) e a
// estrutura da janela (uma tela por vez, QR grande, passos, movimento reduzido,
// silêncio). Sem DOM real: o E2E do Windows percorre a janela aberta.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { barra, qrInfo, horaCurta, quandoFoi, telaInicial, contaTexto } from '../../src/renderer/shared/whatsapp-view.js';
import { estadoVisivel } from '../../src/core/whatsapp-conexao.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ler = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const T0 = new Date(2026, 9, 30, 14, 32).getTime();

test('tela: barra de estado sempre com título objetivo e a conta só quando conectado', () => {
  assert.deepEqual(barra(estadoVisivel({}, T0)), { classe: '', titulo: 'Desconectado', conta: '' });
  assert.deepEqual(barra(estadoVisivel({ estado: 'qr', qrExpiraEm: T0 + 5e3 }, T0)), { classe: 'warn', titulo: 'Aguardando QR code', conta: '' });
  assert.deepEqual(barra(estadoVisivel({ estado: 'reconectando', motivo: 'sem_internet' }, T0)), { classe: 'warn', titulo: 'Conectando', conta: '' });
  assert.deepEqual(barra(estadoVisivel({ estado: 'erro', motivo: 'outra_sessao' }, T0)), { classe: 'bad', titulo: 'Erro', conta: '' });
  assert.deepEqual(barra(estadoVisivel({ estado: 'conectado', nome: 'Emanuele', numero: '5542999990000' }, T0)), { classe: 'ok', titulo: 'Conectado', conta: 'Emanuele · +55 (42) 99999-0000' });
  assert.equal(contaTexto({ nome: null, numero: '5542999990000' }), '+55 (42) 99999-0000', 'sem nome ainda: só o número');
  assert.equal(horaCurta(T0), '14:32');
  assert.equal(quandoFoi(T0, T0 + 3600e3), 'hoje às 14:32');
  assert.equal(quandoFoi(T0, T0 + 864e5), 'ontem às 14:32');
  assert.equal(quandoFoi(T0, T0 + 3 * 864e5), '30/10 às 14:32');
});

test('tela: contagem do QR em segundos, barra proporcional e aviso quando expira', () => {
  const c = { qrExpiraEm: T0 + 60e3, qrValidadeMs: 60e3 };
  assert.deepEqual(qrInfo(c, T0), { restante: 60, fracao: 1, texto: 'Este código vale por mais 60 s.', expirou: false });
  assert.equal(qrInfo(c, T0 + 45_500).restante, 15);
  assert.equal(qrInfo({ qrExpiraEm: T0 + 10e3, qrValidadeMs: 20e3 }, T0).fracao, 0.5, 'renovação de 20 s');
  const fim = qrInfo(c, T0 + 61e3);
  assert.deepEqual([fim.restante, fim.expirou], [0, true]);
  assert.match(fim.texto, /expirou\. Gerando um código novo/);
});

test('tela: abre na conexão sem WhatsApp conectado; conectado vai para as mensagens', () => {
  assert.equal(telaInicial('desconectado'), 'conexao');
  assert.equal(telaInicial('erro', 'mensagens'), 'conexao', 'qualquer ação sem conexão leva à tela de conexão');
  assert.equal(telaInicial('conectado'), 'mensagens');
  assert.equal(telaInicial('conectado', 'conexao'), 'conexao');
});

test('janela: um bloco por estado, QR grande e nítido, quatro passos, contagem, sem som e com movimento reduzido', () => {
  const html = ler('src/renderer/whatsapp/index.html');
  const css = ler('src/renderer/whatsapp/whatsapp.css');
  for (const k of ['desconectado', 'qr', 'conectando', 'conectado', 'erro']) assert.match(html, new RegExp(`id="c-${k}"`), k);
  assert.match(html, /id="barra" class="barra" role="status" aria-live="polite"/, 'estado sempre visível e anunciado');
  const passos = html.match(/<ol class="passos"[\s\S]*?<\/ol>/)[0];
  assert.equal(passos.match(/<li>/g).length, 4);
  for (const p of [/abra o <strong>WhatsApp/, /Aparelhos conectados/, /Conectar um aparelho/, /Aponte a câmera/]) assert.match(passos, p);
  assert.match(html, /id="qrTempo"/);
  assert.match(html, /Código renovado/);
  assert.match(html, /id="contaNome"[\s\S]*id="contaNumero"/, 'sucesso mostra nome e número');
  assert.match(html, /Desconectar este PC/);
  assert.match(css, /#qr \{[^}]*width: min\(320px, 70vw\)[^}]*image-rendering: pixelated/);
  assert.match(css, /prefers-reduced-motion: no-preference\)[\s\S]*\.girando \{ animation/, 'animação só sem movimento reduzido');
  assert.doesNotMatch(css.replace(/@media \(prefers-reduced-motion: no-preference\)[\s\S]*?\n\}/, ''), /animation:|transition:/, 'fora do bloco: nada se mexe');
  assert.doesNotMatch(html + ler('src/renderer/whatsapp/whatsapp.js'), /<audio|new Audio|\.play\(|AudioContext|speechSynthesis/, 'sem som');
  assert.doesNotMatch(html, /\sname="/);
  assert.doesNotMatch(ler('src/renderer/whatsapp/whatsapp.js'), /Sem conexão|erro de conexão/i, 'nenhum rótulo genérico');
  const main = ler('src/main/main.js');
  assert.match(main, /QRCode\.toDataURL\(texto, \{ margin: 2, width: 560/, 'QR gerado em alta resolução');
});
