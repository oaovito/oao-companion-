// Cenários reais do aplicativo no Windows; dados de teste ficam em perfil isolado.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { requireWindows } from '../../src/main/windows-only.js';
requireWindows();
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ELECTRON = require('electron');
const { _electron } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
import { launch, waitFor, quit } from './feature-helpers.mjs';

async function tasksCentral(app) {
  const opened = app.waitForEvent('window');
  await app.evaluate(() => globalThis.__jojo.companion.openApp('tarefas'));
  const page = await opened; await page.waitForSelector('#tarefas .todo-primary'); return page;
}

test('tarefas Windows: interface real cria/edita/reordena/conclui e anima XP sem novo chat', { timeout: 120000 }, async () => {
  const { app, errors } = await launch();
  try {
    const page = await tasksCentral(app);
    page.on('pageerror', e => errors.push(e.message));
    await page.locator('#tarefas').getByRole('button', { name: '+ Adicionar tarefa' }).click();
    await page.locator('dialog').getByLabel('Título', { exact: true }).fill('Estudar física');
    await page.locator('dialog').getByLabel('Descrição', { exact: true }).fill('Ondas e óptica');
    await page.locator('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
    await page.waitForSelector('.todo-task[data-id]');
    await page.evaluate(() => window.appApi.todo({ action: 'add', data: { title: 'Treinar' } }));
    await page.waitForFunction(() => document.querySelectorAll('#tarefas .todo-task').length === 2);
    const rows = page.locator('#tarefas .todo-task');
    await rows.nth(1).dragTo(rows.nth(0));
    await page.waitForFunction(() => document.querySelector('#tarefas .todo-task-title')?.textContent === 'Treinar');
    await page.getByRole('checkbox', { name: 'Concluir Estudar física', exact: true }).check();
    await page.waitForFunction(() => document.querySelector('.jojo-xp-feedback')?.textContent.includes('+10 XP'));
    const xp = await app.evaluate(() => globalThis.__jojo.companion.progress.st.xp);
    await page.getByRole('checkbox', { name: 'Concluir Estudar física', exact: true }).uncheck();
    await page.getByRole('checkbox', { name: 'Concluir Estudar física', exact: true }).check();
    assert.equal(await app.evaluate(() => globalThis.__jojo.companion.progress.st.xp), xp);
    await page.getByRole('button', { name: 'Estudar física', exact: true }).click();
    await page.locator('dialog').getByLabel('Título', { exact: true }).fill('Estudar óptica');
    await page.locator('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
    await page.waitForSelector('.todo-task-title:text-is("Estudar óptica")');
    assert.equal(await page.locator('#list .item').count(), 1);
    assert.equal(await page.locator('#form').isVisible(), false);
    const report = process.env.JOJO_TEST_REPORT_DIR;
    if (report) {
      const screenshot = await page.screenshot({ path: path.join(report, 'tarefas-central-windows.png') });
      if (process.env.GITHUB_ACTIONS) for (const part of screenshot.toString('base64').match(/.{1,4000}/g)) console.log(`JOJO_TASKS_PREVIEW:${part}`);
    }
    assert.deepEqual(errors, []);
  } finally { await quit(app); }
});

test('tarefas Windows: arquivo durável, reinício e recuperação do reset após desligamento', { timeout: 120000 }, async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jojo-tasks-restart-'));
  let { app } = await launch({ userData });
  let id, day;
  try {
    const page = await tasksCentral(app);
    const r = await page.evaluate(() => window.appApi.todo({ action: 'add', data: { title: 'Beber água', description: 'Garrafa azul', frequency: 'daily' } }));
    id = r.result.id; day = r.snapshot.day;
    await page.evaluate(id => window.appApi.todo({ action: 'complete', id, data: true }), id);
    const data = JSON.parse(fs.readFileSync(path.join(userData, 'tasks.json'), 'utf8'));
    assert.ok(data.tasks[0].completed[day]);
  } finally { await quit(app); }
  ({ app } = await launch({ userData }));
  try {
    const page = await tasksCentral(app);
    assert.equal((await page.evaluate(() => window.appApi.todo({ action: 'snapshot' }))).snapshot.completed, 1);
    assert.match(await page.locator('.todo-description').textContent(), /Garrafa azul/);
  } finally { await quit(app); }
  // Simula desligado desde ontem no arquivo real; relógio do Windows não é alterado.
  const file = path.join(userData, 'tasks.json'); const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const yesterday = new Date(Date.parse(`${day}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
  data.day = yesterday; data.highDay = yesterday;
  data.tasks[0].completed = { [yesterday]: Date.now() - 86400000 }; fs.writeFileSync(file, JSON.stringify(data));
  ({ app } = await launch({ userData }));
  try {
    const page = await tasksCentral(app); const result = await page.evaluate(() => window.appApi.todo({ action: 'snapshot' }));
    assert.equal(result.snapshot.completed, 0); assert.equal(result.snapshot.total, 1); assert.equal(result.snapshot.tasks[0].id, id);
  } finally { await quit(app); }
});

test('tarefas Windows: configurações afetam painel nativo; foco oculta sem impedir acesso manual', { timeout: 120000 }, async () => {
  const { app, errors } = await launch();
  try {
    const page = await tasksCentral(app); const opened = app.waitForEvent('window');
    await page.evaluate(() => window.appApi.todo({ action: 'settings', data: { visible: true, width: 380, height: 460, position: 'left', opacity: 0.8, theme: 'plum' } }));
    const dock = await opened; await dock.waitForSelector('#tasks .todo-primary');
    dock.on('pageerror', e => errors.push(e.message));
    await waitFor(app, () => globalThis.__jojo.todoService.dock.win.isVisible());
    const native = await app.evaluate(() => { const w = globalThis.__jojo.todoService.dock.win; return { bounds: w.getBounds(), opacity: w.getOpacity() }; });
    assert.equal(native.bounds.width, 380); assert.equal(native.bounds.height, 460); assert.ok(Math.abs(native.opacity - 0.8) < 0.02);
    assert.equal(await dock.locator('#tasks').getAttribute('data-theme'), 'plum');
    await app.evaluate(() => globalThis.__jojo.companion.startWork());
    await waitFor(app, () => !globalThis.__jojo.todoService.dock.win.isVisible());
    const r = await page.evaluate(() => window.appApi.todo({ action: 'add', data: { title: 'Acesso no foco' } }));
    assert.equal(r.result.title, 'Acesso no foco');
    assert.ok(await page.locator('#tarefas').isVisible()); assert.deepEqual(errors, []);
  } finally { await quit(app); }
});

test('tarefas Windows: chat usa lista real; HTML não executa e IPC rejeita emissor indevido', { timeout: 120000 }, async () => {
  const { app, errors } = await launch();
  try {
    const page = await tasksCentral(app);
    await page.evaluate(() => window.appApi.todo({ action: 'add', data: { title: '<script>window.invadiu=true</script>' } }));
    await page.waitForFunction(() => document.querySelector('.todo-task-title')?.textContent.includes('<script>'));
    assert.equal(await page.evaluate(() => window.invadiu), undefined);
    const created = await app.evaluate(() => globalThis.__jojo.companion.chat('Coloca academia todos os dias.'));
    assert.match(created.text, /academia/);
    const completed = await app.evaluate(() => globalThis.__jojo.companion.chat('Marca academia como concluído.'));
    assert.ok(completed.text.includes('academia'));
    const query = await app.evaluate(() => globalThis.__jojo.companion.chat('Quais tarefas já completei?'));
    assert.match(query.text, /✓ academia/);
    const untrusted = await app.evaluate(async ({ ipcMain }) => {
      // Emissor de uma janela que não é Central/configuração/painel é recusado.
      const listener = ipcMain._invokeHandlers?.get('todo:request');
      if (!listener) throw new Error('Handler de tarefas não registrado.');
      return listener({ sender: globalThis.__jojo.overlay.win.webContents }, { action: 'add', data: { title: 'Invasão' } });
    });
    assert.ok(untrusted.error);
    assert.deepEqual(errors, []);
  } finally { await quit(app); }
});

test('iCloud Windows: DPAPI real protege credencial e configuração não a expõe', { timeout: 60000 }, async () => {
  const { app, userData } = await launch();
  try {
    const file = path.join(userData, 'native-dpapi-fixture.json');
    const result = await app.evaluate((_electron, file) => {
      const vault = globalThis.__jojo.credentialVault(file);
      const available = vault.available(); if (!available) throw new Error('DPAPI não está disponível neste runner.');
      vault.write({ username: 'fixture@example.invalid', password: 'only-a-native-test-fixture' });
      const account = vault.read();
      return { available, same: account.username === 'fixture@example.invalid' && account.password === 'only-a-native-test-fixture', settings: globalThis.__jojo.settingsInfo().settings };
    }, file);
    assert.equal(result.available, true); assert.equal(result.same, true);
    const raw = fs.readFileSync(file, 'utf8');
    assert.equal(raw.includes('only-a-native-test-fixture'), false); assert.equal(raw.includes('fixture@example.invalid'), false);
    assert.equal(JSON.stringify(result.settings).includes('only-a-native-test-fixture'), false);
  } finally { await quit(app); }
});
