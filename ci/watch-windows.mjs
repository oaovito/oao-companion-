// Agente independente: consulta somente o Git privado do JoJo e Releases publicas.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { execute } from './process.mjs';
import { SOURCE_REPO } from './policy.mjs';
import { isNewer } from '../jojo-companion/src/core/updater.js';
import { verifyPublication } from './validation.mjs';
import { conferirArtefatos } from '../jojo-companion/scripts/publish-release.mjs';
const own = process.platform === 'win32' && process.arch === 'x64';
if (!own) throw new Error('Agente exige Windows x64 nativo');
const directory = path.join(process.env.LOCALAPPDATA, 'JoJoCompanionCI/agent');
const checkout = path.join(directory, 'checkout');
const stateFile = path.join(directory, 'state.json');
fs.mkdirSync(directory, { recursive: true });
const owner = path.join(directory, 'owner.json');
if (fs.existsSync(checkout) && !fs.existsSync(owner)) throw new Error('Pasta existente sem propriedade do agente; nao modificar');
if (fs.existsSync(owner) && JSON.parse(fs.readFileSync(owner)).source !== SOURCE_REPO) throw new Error('Pasta do agente pertence a outra origem; preservar');
fs.writeFileSync(owner, JSON.stringify({ source: SOURCE_REPO }));
const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
function git(args) {
  const result = spawnSync('git', args, { cwd: fs.existsSync(checkout) ? checkout : directory, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
  if (result.status !== 0) throw new Error('Git privado indisponivel ou checkout alterado; nenhuma alteracao descartada');
  return result.stdout.trim();
}
if (!fs.existsSync(checkout)) git(['clone', '--branch', 'codex/conversation-coherence', `https://github.com/${SOURCE_REPO}.git`, checkout]);
const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile)) : { attempted: {} };
const save = () => { fs.writeFileSync(stateFile + '.tmp', JSON.stringify(state, null, 2)); fs.renameSync(stateFile + '.tmp', stateFile); };
console.log('Agente Windows ativo. Fonte privada JoJo; consulta a cada 120 s; nenhum servico pago.');
while (true) {
  try {
    if (git(['status', '--porcelain'])) throw new Error('Checkout do agente alterado; nao descartar arquivos');
    git(['fetch', '--no-force', '--tags', 'origin', 'refs/heads/codex/conversation-coherence:refs/remotes/origin/codex/conversation-coherence']);
    const response = await fetch('https://api.github.com/repos/oaovito/jojo-companion-releases/releases/latest', { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'JoJo-private-windows-agent' } });
    if (!response.ok) throw new Error('Nao foi possivel consultar a versao publica');
    const latest = (await response.json()).tag_name;
    const tags = git(['tag', '--list', 'v*', '--sort=-version:refname']).split('\n').filter((t) => /^v\d+\.\d+\.\d+$/.test(t));
    const tag = tags.find((t) => isNewer(t, latest) && !state.attempted[`release:${t}:${git(['rev-parse', `${t}^{commit}`])}`]);
    const commit = git(['rev-parse', tag ? `${tag}^{commit}` : 'refs/remotes/origin/codex/conversation-coherence']);
    const key = tag ? `release:${tag}:${commit}` : `validate:${commit}`;
    if (!state.attempted[key]) {
      git(['checkout', '--detach', commit]);
      const desktop = await execute('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', 'ci/preflight-windows.ps1'], { cwd: checkout, env, log: path.join(directory, 'preflight.log'), timeoutMs: 30000 });
      if (desktop.exitCode || desktop.timedOut) {
        console.log('Sessao/conta de teste indisponivel; aguardando sem marcar commit como testado.');
        await new Promise((resolve) => setTimeout(resolve, 30000));
        continue;
      }
      // Registrar ANTES de qualquer escrita publica: nunca repetir publicacao parcial automaticamente.
      state.attempted[key] = { success: false, status: 'running', at: new Date().toISOString() }; save();
      let reused = false;
      const oldReport = state.validated?.[commit];
      let reusable = false;
      if (tag && oldReport && fs.existsSync(oldReport)) {
        try {
          const version = JSON.parse(fs.readFileSync(path.join(checkout, 'jojo-companion/package.json'))).version;
          verifyPublication(checkout, { reportPath: oldReport, tag, version, files: conferirArtefatos(path.join(checkout, 'jojo-companion/dist'), version) });
          reusable = true;
        } catch { /* artefato alterado/ausente exige nova validacao integral */ }
      }
      if (reusable) {
        // O publicador verifica novamente commit/tag, checkout limpo, todos os gates e hashes.
        const result = await execute(process.execPath, ['scripts/publish-release.mjs', '--tag', tag, '--validation', oldReport], { cwd: path.join(checkout, 'jojo-companion'), env, log: path.join(directory, 'publication.log'), timeoutMs: 900000 });
        if (result.exitCode === 0 && !result.timedOut) reused = true;
        else throw new Error('Publicacao de validacao anterior falhou; inspecionar antes de repetir');
      }
      let success = reused;
      if (!reused) {
        const result = await execute('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', 'ci/windows.ps1', ...(tag ? ['-Mode', 'release', '-Tag', tag] : [])], { cwd: checkout, env, log: path.join(directory, 'executor.log'), timeoutMs: 3600000 });
        success = result.exitCode === 0 && !result.timedOut;
      }
      state.attempted[key] = { success, at: new Date().toISOString() };
      const summary = path.join(checkout, 'jojo-companion/out/windows-ci/summary/validation.json');
      if (success && fs.existsSync(summary)) {
        const report = JSON.parse(fs.readFileSync(summary));
        if (report.status === 'passed' && report.commit === commit) {
          state.validated ||= {};
          const copy = path.join(directory, `${commit}.json`);
          fs.copyFileSync(summary, copy); state.validated[commit] = copy;
        }
      }
      save(); console.log(`${key}: ${success ? 'aprovado' : 'falhou; consultar relatorio privado'}`);
    }
  } catch (error) { console.error(error.message); }
  await new Promise((resolve) => setTimeout(resolve, 120000));
}
