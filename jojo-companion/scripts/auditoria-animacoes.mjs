import { requireWindows } from '../src/main/windows-only.js';
requireWindows();
// Auditoria de 100% das animações e reações: inventário, gatilho (como cada uma é
// alcançada), execução real no renderer (erros, tempo de desenho, se cabe no espaço
// reservado, se se mexe). Gera docs/AUDITORIA_ANIMACOES.md só com resultados medidos.
import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { expandCatalog } from '../src/core/catalog/recipes.js';
import { fullCatalog } from '../src/core/catalog/load.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rj = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

/** Como cada animação é alcançada (estado, código, catálogo, pacote). */
function gatilhos(anims, catalog) {
  const codigo = ['src/core/companion.js', 'src/core/behavior.js', 'src/core/catalog/variety.js', 'src/renderer/overlay/overlay.js']
    .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  const porId = new Map(catalog.itens.map((it) => [`cat_${it.id}`, it]));
  const out = {};
  for (const [name, a] of Object.entries(anims)) {
    const base = name.replace(/~.*$/, '');
    const it = porId.get(base);
    if (it) {
      const g = it.gatilho || {};
      const partes = [];
      if (it.pacote) partes.push(`pacote ${it.pacote}`);
      if (g.ambiente) partes.push('sozinho (ambiente)');
      if ((g.frases || []).length) partes.push('frase');
      if ((g.eventos || []).length || (it.eventos || []).length) partes.push('evento');
      if (g.estado) partes.push(`estado ${g.estado}`);
      if (new RegExp(`['"\`]${it.id}['"\`]`).test(codigo)) partes.push('código (conversa/foco/evento)');
      out[name] = partes.length ? partes.join(', ') : 'só por nome (/anim)';
    } else {
      const ref = (a.variantOf ? [a.variantOf, name] : [name]).some((n) => new RegExp(`['"\`]${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`).test(codigo));
      out[name] = a.variantOf ? `variação de ${a.variantOf}` : ref ? 'estado/código' : 'só por nome (/anim)';
    }
  }
  return out;
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { backgroundThrottling: false } });
  await win.loadFile(path.join(ROOT, 'scripts', 'icon-page', 'auditoria.html'));
  while (!(await win.webContents.executeJavaScript('!!window.ready'))) await new Promise((r) => setTimeout(r, 50));
  const rig = rj('assets/character/jojo.rig.json');
  const catalog = fullCatalog(rj);
  const anims = expandCatalog(rj('assets/animations/jojo.animations.json'), catalog);
  const room = rj('assets/animations/jojo.room.json').anims;
  const nomes = Object.keys(anims.animations);
  const res = {};
  for (let i = 0; i < nomes.length; i += 60) {
    const lote = nomes.slice(i, i + 60);
    Object.assign(res, await win.webContents.executeJavaScript(`window.auditar(${JSON.stringify(rig)}, ${JSON.stringify(anims)}, ${JSON.stringify(room)}, ${JSON.stringify(lote)})`));
  }
  const g = gatilhos(anims.animations, catalog);
  const erros = nomes.filter((n) => !res[n].ok);
  const fora = nomes.filter((n) => res[n].ok && !res[n].cabe);
  const paradas = nomes.filter((n) => res[n].ok && !res[n].mexe);
  const semGatilho = nomes.filter((n) => /^só por nome/.test(g[n]));
  const lentas = [...nomes].filter((n) => res[n].ok).sort((a, b) => res[b].mediaMs - res[a].mediaMs).slice(0, 10);
  const media = nomes.reduce((s, n) => s + (res[n].mediaMs || 0), 0) / nomes.length;
  const f = (x) => x.toFixed(2);
  const linhas = [
    '# Auditoria das animações e reações',
    '',
    `Gerado por \`scripts/auditoria-animacoes.mjs\` em ${new Date().toISOString().slice(0, 10)} (Windows ${process.getSystemVersion()}, Electron ${process.versions.electron}, renderer real, amostragem a 24 qps).`,
    'Todos os números abaixo foram medidos nesta execução; nada é estimado.',
    '',
    '## Resumo',
    '',
    `| Item | Resultado |`,
    `|---|---|`,
    `| Animações auditadas (feitas à mão + catálogo × intensidades + pacotes) | ${nomes.length} |`,
    `| Tocaram do início ao fim sem erro | ${nomes.length - erros.length} |`,
    `| Com erro | ${erros.length}${erros.length ? ` (${erros.join(', ')})` : ''} |`,
    `| Passam do espaço reservado (seriam cortadas) | ${fora.length}${fora.length ? ` (${fora.join(', ')})` : ''} |`,
    `| Não se mexem (quadro parado) | ${paradas.length}${paradas.length ? ` (${paradas.join(', ')})` : ''} |`,
    `| Só alcançáveis por /anim (sem gatilho natural) | ${semGatilho.length} |`,
    `| Tempo médio de desenho por quadro | ${f(media)} ms (orçamento a 30 qps: 33 ms) |`,
    '',
    '## Mais pesadas (tempo médio de desenho por quadro)',
    '',
    '| Animação | Média (ms) | Máx. (ms) |',
    '|---|---|---|',
    ...lentas.map((n) => `| ${n} | ${f(res[n].mediaMs)} | ${f(res[n].maxMs)} |`),
    '',
    '## Matriz completa',
    '',
    '| Animação | Gatilho | Toca | Quadros | Média (ms) | Cabe | Se mexe |',
    '|---|---|---|---|---|---|---|',
    ...nomes.map((n) => {
      const r = res[n];
      return `| ${n} | ${g[n]} | ${r.ok ? 'sim' : `NÃO: ${r.erro}`} | ${r.quadros} | ${f(r.mediaMs)} | ${r.cabe ? 'sim' : `não (+${Math.round(r.excesso)} px)`} | ${r.mexe ? 'sim' : 'não'} |`;
    }),
    '',
  ];
  fs.writeFileSync(path.join(ROOT, 'docs', 'AUDITORIA_ANIMACOES.md'), linhas.join('\n'));
  fs.writeFileSync(path.join(ROOT, 'docs', 'auditoria-animacoes.json'), JSON.stringify({ erros, fora, paradas, semGatilho: semGatilho.length, mediaMs: media }, null, 1) + '\n');
  const png = (await win.webContents.executeJavaScript(`window.contato(${JSON.stringify(rig)}, ${JSON.stringify(anims)})`)).split(',')[1];
  fs.writeFileSync(path.join(ROOT, 'docs', 'auditoria-animacoes.png'), Buffer.from(png, 'base64'));
  // Pequena evidência visual recuperável mesmo quando a cota de artefatos está cheia.
  if (process.env.GITHUB_ACTIONS) {
    for (const part of png.match(/.{1,4000}/g)) console.log(`JOJO_ANIMATION_PREVIEW:${part}`);
    const report = gzipSync(Buffer.from(JSON.stringify({ markdown: linhas.join('\n'), summary: { erros, fora, paradas, semGatilho: semGatilho.length, mediaMs: media }, commit: process.env.GITHUB_SHA }))).toString('base64');
    for (const part of report.match(/.{1,4000}/g)) console.log(`JOJO_ANIMATION_REPORT:${part}`);
  }
  console.log(`Auditadas ${nomes.length}: ${erros.length} com erro, ${fora.length} fora do espaço, ${paradas.length} paradas, ${semGatilho.length} só por /anim, média ${f(media)} ms`);
  await new Promise((resolve) => process.stdout.write('', resolve));
  app.exit(erros.length || fora.length || paradas.length || semGatilho.length ? 1 : 0);
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
