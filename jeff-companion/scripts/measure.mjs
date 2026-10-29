// Mede CPU e memória do app real (todos os processos Electron) em três cenários:
// ocioso (cursor longe), cursor rondando/perseguindo e oculto.
// Uso: node scripts/measure.mjs   (no Linux sem tela usa xvfb-run automaticamente)
// Requer Playwright disponível globalmente ou no projeto.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (process.platform === 'linux' && !process.env.DISPLAY) {
  const r = spawnSync('xvfb-run', ['-a', '-s', '-screen 0 1920x1080x24', process.execPath, fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

const { _electron } = (() => {
  try {
    return require('playwright-core');
  } catch {
    return require('playwright');
  }
})();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SECONDS = Number(process.env.MEASURE_SECONDS || 30);

async function sample(app, seconds, during) {
  const rows = [];
  // A primeira leitura de CPU do Electron é sempre 0; descarta.
  await app.evaluate(({ app: a }) => a.getAppMetrics());
  for (let i = 0; i < seconds; i++) {
    if (during) await during(i);
    else await sleep(1000);
    rows.push(await app.evaluate(({ app: a }) => a.getAppMetrics().map((m) => ({ type: m.type, cpu: m.cpu.percentCPUUsage, mem: m.memory.workingSetSize }))));
  }
  const cpu = rows.map((r) => r.reduce((s, m) => s + m.cpu, 0));
  const mem = rows.map((r) => r.reduce((s, m) => s + m.mem, 0));
  const byType = {};
  for (const m of rows[rows.length - 1]) byType[m.type] = (byType[m.type] || 0) + Math.round(m.mem / 1024);
  return {
    cpuAvg: +(cpu.reduce((a, b) => a + b, 0) / cpu.length).toFixed(2),
    cpuMax: +Math.max(...cpu).toFixed(2),
    memMB: Math.round(mem[mem.length - 1] / 1024),
    memByTypeMB: byType,
  };
}

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'jeff-measure-'));
const app = await _electron.launch({
  executablePath: require('electron'),
  args: ['--no-sandbox', ROOT],
  env: { ...process.env, JEFF_TEST: '1', JEFF_USER_DATA: userData },
});
await app.firstWindow();
await sleep(4000);
await app.evaluate(() => globalThis.__jeff.setCursor({ x: 5, y: 5 }));
await app.evaluate(() => globalThis.__jeff.store.update({ speechFrequency: 'off' }));
await sleep(2000);

const results = {};
results.ocioso = await sample(app, SECONDS);
results.cursorPerseguindo = await sample(app, SECONDS, async () => {
  for (let k = 0; k < 20; k++) {
    await app.evaluate(() => {
      const j = globalThis.__jeff;
      const v = j.companion.debugState().visual;
      j.setCursor({ x: v.x + v.width / 2 + (Math.random() - 0.5) * 40, y: v.y + v.height / 2 });
    });
    await sleep(50);
  }
});
await app.evaluate(() => globalThis.__jeff.setCursor({ x: 5, y: 5 }));
await app.evaluate(() => globalThis.__jeff.store.update({ visible: false }));
await sleep(1500);
results.oculto = await sample(app, Math.min(15, SECONDS));
const stats = await app.evaluate(() => globalThis.__jeff.companion.debugState().stats);

const info = {
  data: new Date().toISOString(),
  ambiente: `${os.type()} ${os.release()}, ${os.cpus()[0].model} x${os.cpus().length}, Electron ${await app.evaluate(() => process.versions.electron)}, DISPLAY=${process.env.DISPLAY}`,
  observacao: 'Medido no ambiente de desenvolvimento (Linux/Xvfb, renderização por software). Não representa o Windows 11. CPU em % de um núcleo somada entre processos.',
  segundosPorCenario: SECONDS,
  resultados: results,
  contadores: stats,
};
console.log(JSON.stringify(info, null, 2));
await app.evaluate(() => globalThis.__jeff.quit()).catch(() => {});
await sleep(2500);
try {
  await app.close();
} catch {
  /* já encerrado */
}
