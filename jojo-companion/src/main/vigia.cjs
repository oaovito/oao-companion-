// Vigia do JoJo: processo mínimo (Node embutido no próprio app) que espera o JoJo
// encerrar e decide se reabre. Encerrar de propósito (bandeja) → não reabre.
// Atualização → confere depois e reabre se a troca não reabriu. Qualquer outro fim
// (crash, erro, processo morto) → reabre. Nada de rede, nada de teclado/tela.
// Uso: node vigia.cjs <config.json>
'use strict';
const fs = require('fs');
const { spawn } = require('child_process');

const cfg = require.main === module ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : {};
const intervalo = cfg.intervaloMs || 1000;
// O vigia roda como Node; o JoJo reaberto precisa voltar a ser app.
delete process.env.ELECTRON_RUN_AS_NODE;

function vivo(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

function lerJson(p, padrao) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return padrao;
  }
}

function registrar(msg) {
  if (!cfg.log) return;
  try {
    fs.appendFileSync(cfg.log, `${new Date().toISOString()} [vigia] ${msg}\n`);
  } catch {
    /* ignora */
  }
}

/** Decide o que fazer quando o JoJo some. Pura (exportada para os testes). */
function decidir({ marcador, pid, historico = [], agora = Date.now(), limite = 3, janelaMs = 10 * 60e3 }) {
  const m = marcador && marcador.pid === pid ? marcador.motivo : null;
  if (m === 'manual' || m === 'desligamento') return 'nada';
  if (m === 'atualizacao') return 'conferir';
  const recentes = historico.filter((t) => agora - t < janelaMs);
  if (recentes.length >= limite) return 'desistir';
  return 'reabrir';
}

// Abre o alvo depois de `esperaMs` e sai NA HORA: no Windows quem espera é o cmd, para
// o vigia não segurar arquivos do app (o portátil reextrai na pasta temporária).
function abrirDepois(esperaMs, extra = []) {
  const args = [...(cfg.args || []), ...extra];
  try {
    if (process.platform === 'win32') {
      const q = (x) => `"${String(x).replace(/"/g, '')}"`;
      const seg = Math.max(1, Math.round(esperaMs / 1000));
      const linha = `ping -n ${seg + 1} 127.0.0.1 >nul & start "" ${q(cfg.alvo)} ${args.map(q).join(' ')}`;
      spawn('cmd.exe', ['/d', '/s', '/c', `"${linha}"`], { detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true }).unref();
      process.exit(0);
    }
    setTimeout(() => {
      registrar(`reabrindo: ${cfg.alvo} ${args.join(' ')}`);
      spawn(cfg.alvo, args, { detached: true, stdio: 'ignore' }).unref();
      process.exit(0);
    }, esperaMs);
  } catch (e) {
    registrar(`falha ao reabrir: ${e.message}`);
    process.exit(1);
  }
}

function aoSumir() {
  const marcador = lerJson(cfg.marcador, null);
  const historico = lerJson(cfg.historico, []);
  const acao = decidir({ marcador, pid: cfg.pid, historico });
  registrar(`JoJo (pid ${cfg.pid}) encerrou; motivo ${(marcador && marcador.pid === cfg.pid && marcador.motivo) || 'inesperado'} → ${acao}`);
  if (acao === 'reabrir') {
    try {
      fs.writeFileSync(cfg.historico, JSON.stringify([...historico.filter((t) => Date.now() - t < 10 * 60e3), Date.now()]));
    } catch {
      /* ignora */
    }
    abrirDepois(cfg.esperaReabrirMs ?? 1500);
  } else if (acao === 'conferir') {
    // A troca reabre sozinha; se não reabriu, abre. Se já estiver aberto, a cópia
    // nova vê a instância única e fecha calada (--vigia).
    abrirDepois(cfg.esperaAtualizacaoMs ?? 120e3, ['--vigia']);
  } else process.exit(0);
}

if (require.main === module) {
  const t = setInterval(() => {
    if (!vivo(cfg.pid)) {
      clearInterval(t);
      aoSumir();
    }
  }, intervalo);
}

module.exports = { decidir };
