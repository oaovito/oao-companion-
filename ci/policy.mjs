// Contrato de evidência compartilhado pelo executor e pelo publicador.
export const REQUIRED_STEPS = Object.freeze(['preflight', 'lint', 'install', 'unit', 'build', 'installer', 'portable', 'presence', 'windows', 'e2e', 'animations', 'performance', 'conversation', 'artifacts', 'updater', 'notes']);
export const SOURCE_REPO = 'oaovito/oao-companion-';

export function pipelineArgs(args) {
  const result = { publishing: false, tag: '' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--publish' && !result.publishing) result.publishing = true;
    else if (args[i] === '--tag' && !result.tag && /^v\d+\.\d+\.\d+$/.test(args[i + 1] || '')) result.tag = args[++i];
    else throw new Error('Argumentos invalidos');
  }
  if (result.publishing && !result.tag) throw new Error('Publicacao exige tag explicita');
  return result;
}

export function assertSourceRemote(remote) {
  if (!/^(?:https:\/\/github\.com\/|git@github\.com:)oaovito\/oao-companion-(?:\.git)?$/.test(remote)) throw new Error('Origem privada do JoJo nao corresponde');
}

export function assertValidation(report, { version, commit, files }) {
  if (report?.schema !== 1 || report.platform !== 'win32' || report.arch !== 'x64' || report.status !== 'passed') throw new Error('Validacao Windows integral ausente');
  // Maquina do GitHub, ou a maquina Windows propria do usuario quando o run pediu (maquinaPropria).
  const executorOk = report.executor === 'github-hosted' || (report.executor === 'self-hosted' && report.maquinaPropria === true);
  if (!executorOk || !/^\d+$/.test(String(report.runId || ''))) throw new Error('Validacao exige runner do GitHub (ou a maquina propria pedida) e identificacao de execucao');
  if (report.source !== SOURCE_REPO || report.version !== version || report.commit !== commit) throw new Error('Validacao de outra origem/versao/commit');
  if (report.tag !== `v${version}`) throw new Error('Tag da validacao nao corresponde');
  for (const id of REQUIRED_STEPS) {
    const steps = report.steps?.filter((s) => s.id === id);
    if (steps?.length !== 1 || steps[0].status !== 'passed' || steps[0].exitCode !== 0 || steps[0].timedOut || steps[0].cancelled) throw new Error(`Gate obrigatorio nao aprovado: ${id}`);
  }
  if (report.files?.length !== 3 || files.length !== 3) throw new Error('Exige os tres formatos');
  for (const file of files) {
    const saved = report.files.find((f) => f.name === file.name);
    if (!saved || saved.size !== file.size || saved.digest !== file.digest) throw new Error('Artefato alterado depois da validacao');
  }
}

export function tapTotals(text, minimum) {
  const number = (key) => Number(text.match(new RegExp(`^# ${key} (\\d+)\\s*$`, 'm'))?.[1] ?? -1);
  const result = { tests: number('tests'), pass: number('pass'), fail: number('fail'), skipped: number('skipped') };
  if (result.tests < minimum || result.pass !== result.tests || result.fail !== 0 || result.skipped !== 0) throw new Error('Suite incompleta, falhou ou pulou testes');
  return result;
}

export function redact(text, values = []) {
  let out = String(text);
  for (const value of [...values].filter((v) => typeof v === 'string' && v.length >= 4).sort((a, b) => b.length - a.length)) out = out.split(value).join('[REDACTED]');
  return out.replace(/https?:\/\/[^\s/@]+:[^\s/@]+@/g, 'https://[REDACTED]@').replace(/(authorization\s*[:=]\s*(?:bearer|token)\s+)\S+/gi, '$1[REDACTED]');
}
