// WhatsApp no app real do Windows, com o processo do WhatsApp simulado
// (fake-whatsapp-worker.mjs): nada conecta nem envia de verdade. Percorre o
// que a Emanuele faz: conectar pelo QR, ver a confirmação, contatos, agendar
// com confirmação, envio, falha e "Tentar de novo", queda e reconexão, fechar e
// reabrir com a sessão restaurada, erro com ação e desconectar.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, waitFor, quit } from './feature-helpers.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CONTA = { nome: 'Emanuele', numero: '5542999990000' };
const CONTATOS = [
  { jid: '5542999990002@s.whatsapp.net', numero: '5542999990002', nomeAgenda: 'Ana', nomePerfil: '' },
  { jid: '5541988880002@s.whatsapp.net', numero: '5541988880002', nomeAgenda: 'Ana', nomePerfil: 'Ana Souza' },
  { jid: '5542999990001@s.whatsapp.net', numero: '5542999990001', nomeAgenda: 'Mãe', nomePerfil: 'Maria' },
];
const GRUPOS = [{ jid: '120363000000000001@g.us', nome: 'Facul Bioquímica', participantes: 38 }];

function controle() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-wa-e2e-'));
  const arq = path.join(dir, 'controle.json');
  fs.writeFileSync(arq, '[]');
  const mandar = (c) => fs.writeFileSync(arq, JSON.stringify([...JSON.parse(fs.readFileSync(arq, 'utf8')), c]));
  const enviados = () => (fs.existsSync(`${arq}.enviados.json`) ? JSON.parse(fs.readFileSync(`${arq}.enviados.json`, 'utf8')) : []);
  return { arq, mandar, enviados, env: { JOJO_TEST_WA_WORKER: path.join(AQUI, 'fake-whatsapp-worker.mjs'), JOJO_TEST_WA_CONTROLE: arq } };
}

async function abrirJanela(app) {
  const aberta = app.waitForEvent('window');
  await app.evaluate(() => globalThis.__jojo.whatsappWin.open());
  const page = await aberta;
  await page.waitForSelector('#barraTitulo');
  return page;
}

const titulo = (page) => page.locator('#barraTitulo').textContent();
const ate = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });

/** Força o horário da mensagem para agora (o relógio real não é adiantado no teste). */
async function enviarAgora(app, texto) {
  await app.evaluate(async (_e, t) => {
    const w = globalThis.__jojo.whatsapp;
    const i = w.adaptador.agenda.ativas().find((x) => x.texto === t);
    Object.assign(i, { proximo: Date.now(), avisado: Date.now(), retryEm: i.retryEm ? Date.now() : null });
    w.adaptador.agenda.envios = [];
    await w.tick();
  }, texto);
}

test('WhatsApp no Windows: QR, confirmação com conta, contatos, agendar, enviar, falhar e tentar de novo, reconexão e sessão restaurada', { timeout: 180000 }, async () => {
  const c = controle();
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-e2e-wa-'));
  let { app, errors } = await launch({ userData, env: c.env });
  try {
    let page = await abrirJanela(app);
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', (d) => d.accept());

    // Desconectado: uma frase e um botão.
    assert.equal(await titulo(page), 'Desconectado');
    assert.ok(await page.locator('#c-desconectado').isVisible());
    assert.match(await page.locator('#c-desconectado').textContent(), /risco de bloqueio do número/);
    await page.getByRole('button', { name: 'Conectar WhatsApp' }).click();

    // QR: grande, com passos, contagem e aviso de renovação.
    await page.waitForSelector('#c-qr:not([hidden])');
    assert.equal(await titulo(page), 'Aguardando QR code');
    assert.match(await page.locator('#qr').getAttribute('src'), /^data:image\/png;base64,/);
    assert.equal(await page.locator('.passos li').count(), 4);
    await ate(page, () => /vale por mais \d+ s/.test(document.querySelector('#qrTempo').textContent));
    const largura = await page.locator('#qr').evaluate((img) => img.getBoundingClientRect().width);
    assert.ok(largura >= 280, `QR grande: ${largura}px`);
    c.mandar({ acao: 'qr', qr: 'QR-JOJO-TESTE-2', validadeMs: 20e3, renovacao: 1 });
    await page.waitForSelector('#qrAviso:not([hidden])');

    // Lido no celular → Conectando → Conectado com nome e número.
    c.mandar({ acao: 'lido' });
    await page.waitForSelector('#c-conectando:not([hidden])');
    assert.match(await page.locator('#fraseConectando').textContent(), /QR code lido/);
    c.mandar({ acao: 'abrir', conta: CONTA, contatos: CONTATOS, grupos: GRUPOS });
    await page.waitForSelector('#c-conectado:not([hidden])');
    assert.equal(await titulo(page), 'Conectado');
    assert.equal(await page.locator('#contaNome').textContent(), 'Emanuele');
    assert.equal(await page.locator('#contaNumero').textContent(), '+55 (42) 99999-0000');
    assert.match(await page.locator('#barraConta').textContent(), /Emanuele · \+55 \(42\) 99999-0000/);

    // Contatos: nome e número, homônimos marcados, grupos separados, busca.
    await page.getByRole('button', { name: 'Contatos', exact: true }).click();
    await ate(page, () => document.querySelectorAll('#listaContatos .contato').length === 3);
    assert.equal(await page.locator('.selo-igual').count(), 2);
    for (const n of ['+55 (42) 99999-0002', '+55 (41) 98888-0002', '+55 (42) 99999-0001']) assert.ok(await page.locator('#listaContatos', { hasText: n }).count(), n);
    await page.locator('#buscaContato').fill('98888');
    await ate(page, () => document.querySelectorAll('#listaContatos .contato').length === 1);
    await page.locator('#buscaContato').fill('');
    await page.locator('#filtroGrupos').click();
    await ate(page, () => document.querySelectorAll('#listaContatos .contato').length === 1);
    assert.match(await page.locator('#listaContatos').textContent(), /Facul Bioquímica.*Grupo.*38 participantes/);
    await page.locator('#filtroPessoas').click();

    // Agendar: escolhe a Ana de Curitiba, confirma com nome e número, e envia.
    await page.locator('.contato', { hasText: '98888-0002' }).click();
    await page.waitForSelector('#tela-nova:not([hidden])');
    assert.match(await page.locator('#destinoEscolhido').textContent(), /Ana.*\+55 \(41\) 98888-0002/);
    await page.locator('#texto').fill('Chego às 19h');
    const daqui = new Date(Date.now() + 30 * 60e3);
    await page.locator('#data').fill(`${daqui.getFullYear()}-${String(daqui.getMonth() + 1).padStart(2, '0')}-${String(daqui.getDate()).padStart(2, '0')}`);
    await page.locator('#hora').fill(`${String(daqui.getHours()).padStart(2, '0')}:${String(daqui.getMinutes()).padStart(2, '0')}`);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForSelector('#tela-confirmar:not([hidden])');
    assert.match(await page.locator('#confirmarPara').textContent(), /Ana.*\+55 \(41\) 98888-0002/);
    assert.equal(await page.locator('#confirmarTexto').textContent(), 'Chego às 19h');
    assert.equal(c.enviados().length, 0, 'nada antes de confirmar');
    await page.getByRole('button', { name: 'Confirmar e agendar' }).click();
    await page.waitForSelector('#tela-mensagens:not([hidden])');
    await ate(page, () => /Agendada/.test(document.querySelector('#itens').textContent));
    await enviarAgora(app, 'Chego às 19h');
    await ate(page, () => /Enviada/.test(document.querySelector('#historico').textContent));
    assert.deepEqual(c.enviados(), [{ jid: '5541988880002@s.whatsapp.net', texto: 'Chego às 19h' }], 'uma vez, para a Ana certa');

    // Falha 3 vezes: motivo e "Tentar de novo".
    c.mandar({ acao: 'falharEnvio', erro: 'sem_internet' });
    await sleep(300);
    await app.evaluate(async () => {
      const w = globalThis.__jojo.whatsapp;
      const d = new Date(Date.now() + 40 * 60e3);
      const p = (n) => String(n).padStart(2, '0');
      await w.save({ destino: { jid: '5542999990001@s.whatsapp.net' }, texto: 'Bom dia, mãe', data: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, hora: `${p(d.getHours())}:${p(d.getMinutes())}`, repeticao: { tipo: 'uma', dias: [] } });
    });
    for (let k = 0; k < 3; k++) await enviarAgora(app, 'Bom dia, mãe');
    await ate(page, () => /Falhou/.test(document.querySelector('#itens').textContent));
    assert.match(await page.locator('#itens').textContent(), /sem internet na hora do envio/);
    c.mandar({ acao: 'falharEnvio', erro: null });
    await sleep(300);
    await app.evaluate(() => { globalThis.__jojo.whatsapp.adaptador.agenda.envios = []; });
    await page.getByRole('button', { name: 'Tentar de novo' }).click();
    await ate(page, () => /Bom dia, mãe/.test(document.querySelector('#historico').textContent));
    assert.equal(c.enviados().length, 2);

    // A conexão cai: "Conectando" com o motivo; "Tentar agora" volta.
    c.mandar({ acao: 'cair', motivo: 'sem_internet', esperaMs: 12e3 });
    await ate(page, () => document.querySelector('#barraTitulo').textContent === 'Conectando');
    await page.getByRole('button', { name: 'Conexão', exact: true }).click();
    assert.match(await page.locator('#fraseConectando').textContent(), /sem internet.*(Nova tentativa em \d+ s|Tentando agora)/);
    await page.getByRole('button', { name: 'Tentar agora' }).click();
    await ate(page, () => document.querySelector('#barraTitulo').textContent === 'Conectado');

    // Movimento reduzido: nada gira.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.girando').evaluate((e) => getComputedStyle(e).animationName), 'none');
    assert.equal(await app.evaluate(() => globalThis.__jojo.whatsappWin.win.webContents.isAudioMuted()), true, 'janela sem som');
    assert.deepEqual(errors, []);

    // Fechar e abrir de novo: a sessão volta sozinha, sem QR.
    await quit(app);
    ({ app, errors } = await launch({ userData, env: c.env }));
    await waitFor(app, () => globalThis.__jojo.whatsapp.state().conexao.estado === 'conectado', 15000);
    page = await abrirJanela(app);
    page.on('dialog', (d) => d.accept());
    assert.equal(await titulo(page), 'Conectado');
    assert.match(await page.locator('#barraConta').textContent(), /Emanuele/);
    assert.ok(await page.locator('#tela-mensagens').isVisible(), 'conectado abre nas mensagens');

    // Erro que pede ação: frase e botão certo.
    c.mandar({ acao: 'erro', motivo: 'outra_sessao', codigo: 440 });
    await ate(page, () => document.querySelector('#barraTitulo').textContent === 'Erro');
    await page.getByRole('button', { name: 'Conexão', exact: true }).click();
    assert.match(await page.locator('#fraseErro').textContent(), /aberta em outro lugar/);
    await page.getByRole('button', { name: 'Conectar aqui' }).click();
    await ate(page, () => document.querySelector('#barraTitulo').textContent === 'Conectado');

    // Desconectar: tudo apagado deste PC.
    await page.getByRole('button', { name: 'Desconectar este PC' }).click();
    await ate(page, () => document.querySelector('#barraTitulo').textContent === 'Desconectado');
    assert.equal(fs.existsSync(path.join(userData, 'whatsapp', 'sessao', 'creds.json')), false);
    assert.equal(await app.evaluate(() => globalThis.__jojo.whatsapp.state().pessoas.length), 0);

    // Pedido pela conversa sem WhatsApp: abre a janela na conexão e não agenda.
    await app.evaluate(() => globalThis.__jojo.companion.enterInteraction('test'));
    const r = await app.evaluate(() => globalThis.__jojo.companion.chat("manda 'oi' pra Mãe amanhã às 8h"));
    assert.match(r.text, /não está conectado|Primeiro o WhatsApp conectado/);
    assert.ok(await page.locator('#tela-conexao').isVisible());
    const report = process.env.JOJO_TEST_REPORT_DIR;
    if (report) await page.screenshot({ path: path.join(report, 'whatsapp-windows.png') });
    assert.deepEqual(errors, []);
  } finally { await quit(app); }
});
