// Cérebro local do JoJo: Ollama + Qwen 3.5 2B no próprio PC dela, baixados e
// instalados sozinhos pela internet (nunca precisa baixar nada à mão).
// Pensado para notebook fraco:
//   - só baixa se a conversa online estiver ligada, em segundo plano;
//   - o Ollama só roda quando ela conversa (sobe na primeira mensagem) e é
//     encerrado depois de alguns minutos sem conversa (RAM volta toda);
//   - prioridade baixa no Windows, um modelo, uma conversa por vez, contexto curto;
//   - escuta só em 127.0.0.1 (nada exposto na rede).
// Se ela já tiver um Ollama com o Qwen 3.5 2B rodando, usa ele.
// Dependências injetáveis (testável sem Electron).
import path from 'node:path';

export const MODELO = 'qwen3.5:2b-q4_K_M';
export const MODELO_ALT = 'qwen3.5:2b';
export const PORTA = 11439; // própria do JoJo (não briga com um Ollama já instalado)
export const OLLAMA_ZIP = 'https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.zip';
export const OCIOSO_MS = 10 * 60e3;
// Espaço livre mínimo para baixar Ollama + modelo com folga.
export const ESPACO_MIN = 6 * 2 ** 30;

/** Ambiente enxuto do Ollama do JoJo. */
export function ambienteOllama(dir) {
  return {
    OLLAMA_HOST: `127.0.0.1:${PORTA}`,
    OLLAMA_MODELS: path.join(dir, 'modelos'),
    OLLAMA_MAX_LOADED_MODELS: '1',
    OLLAMA_NUM_PARALLEL: '1',
    OLLAMA_MAX_QUEUE: '4',
    OLLAMA_CONTEXT_LENGTH: '4096',
    OLLAMA_KEEP_ALIVE: '5m',
    OLLAMA_NO_CLOUD: '1',
    OLLAMA_NOPRUNE: '1',
  };
}

/** Nome do modelo instalado que serve (a variante pedida ou outra quantização do MESMO 2B). */
export function escolherModelo(nomes) {
  return nomes.find((n) => n === MODELO) || nomes.find((n) => /^qwen3\.5:2b(\b|-)/.test(n)) || null;
}

/**
 * @param deps {
 *   dir: pasta do cérebro (userData/cerebro),
 *   platform, fetch(url, opts), fs (promises + existsSync), spawn(cmd, args, opts),
 *   extract(zip, dest), freeBytes(dir), setLowPriority(pid), log, now
 * }
 */
export function criarCerebroLocal(deps) {
  const { dir, platform = process.platform, fetch, fs, spawn, extract, freeBytes = async () => Infinity, setLowPriority = () => {}, log = () => {}, now = () => Date.now(), onStatus = () => {} } = deps;
  const exe = path.join(dir, 'ollama', platform === 'win32' ? 'ollama.exe' : 'ollama');
  let estado = { fase: 'parado', progresso: 0, erro: null, base: null, modelo: null };
  let preparando = null;
  let filho = null;
  let ultimoUso = 0;
  let timerOcioso = null;

  const muda = (patch) => {
    estado = { ...estado, ...patch };
    onStatus({ ...estado });
  };

  async function vivo(base) {
    try {
      const r = await fetch(`${base}/api/tags`);
      if (!r.ok) return null;
      const j = await r.json();
      return (j.models || []).map((m) => m.name || m.model);
    } catch {
      return null;
    }
  }

  async function baixar(url, destino, fase) {
    const r = await fetch(url, { headers: { 'User-Agent': 'JoJoCompanion' } });
    if (!r.ok) throw new Error(`download HTTP ${r.status}`);
    const total = Number(r.headers.get('content-length')) || 0;
    const tmp = `${destino}.parcial`;
    const out = await fs.open(tmp, 'w');
    let feito = 0;
    try {
      const reader = r.body.getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        await out.write(value);
        feito += value.length;
        if (total) muda({ fase, progresso: Math.floor((feito / total) * 100) });
      }
    } finally {
      await out.close();
    }
    await fs.rename(tmp, destino);
  }

  async function instalarOllama() {
    if (fs.existsSync(exe)) return;
    if (platform !== 'win32') throw new Error('instalação automática só no Windows');
    if ((await freeBytes(dir)) < ESPACO_MIN) throw new Error('pouco espaço em disco (precisa de uns 6 GB livres)');
    await fs.mkdir(dir, { recursive: true });
    const zip = path.join(dir, 'ollama.zip');
    muda({ fase: 'baixando', progresso: 0 });
    await baixar(OLLAMA_ZIP, zip, 'baixando');
    muda({ fase: 'instalando', progresso: 0 });
    await extract(zip, path.join(dir, 'ollama'));
    await fs.rm(zip, { force: true });
    if (!fs.existsSync(exe)) throw new Error('instalação do Ollama incompleta');
  }

  async function subir() {
    const base = `http://127.0.0.1:${PORTA}`;
    if (await vivo(base)) return base;
    filho = spawn(exe, ['serve'], { env: { ...process.env, ...ambienteOllama(dir) }, windowsHide: true, stdio: 'ignore' });
    filho.on && filho.on('exit', () => {
      filho = null;
      if (estado.fase === 'pronto') muda({ fase: 'parado' });
    });
    if (filho.pid) setLowPriority(filho.pid);
    for (let i = 0; i < 60; i++) {
      if (await vivo(base)) return base;
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('o Ollama não respondeu');
  }

  async function baixarModelo(base) {
    const nomes = (await vivo(base)) || [];
    const ja = escolherModelo(nomes);
    if (ja) return ja;
    muda({ fase: 'baixandoModelo', progresso: 0 });
    for (const nome of [MODELO, MODELO_ALT]) {
      const r = await fetch(`${base}/api/pull`, { method: 'POST', body: JSON.stringify({ model: nome, stream: true }) });
      if (!r.ok) continue;
      let ok = false;
      let erro = null;
      const txt = r.body && r.body.getReader ? null : await r.text();
      const linhas = [];
      if (txt != null) linhas.push(...txt.split('\n'));
      const tratar = (l) => {
        if (!l.trim()) return;
        let j;
        try {
          j = JSON.parse(l);
        } catch {
          return;
        }
        if (j.error) erro = j.error;
        if (j.total && j.completed) muda({ fase: 'baixandoModelo', progresso: Math.floor((j.completed / j.total) * 100) });
        if (j.status === 'success') ok = true;
      };
      if (txt != null) linhas.forEach(tratar);
      else {
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            tratar(buf.slice(0, i));
            buf = buf.slice(i + 1);
          }
        }
        tratar(buf);
      }
      if (ok) return nome;
      log('warn', `Modelo ${nome}: ${erro || 'falhou'}`);
    }
    throw new Error('não consegui baixar o Qwen 3.5 2B');
  }

  function agendarDesligar() {
    clearTimeout(timerOcioso);
    timerOcioso = setTimeout(() => {
      if (now() - ultimoUso >= OCIOSO_MS) parar('ocioso');
      else agendarDesligar();
    }, OCIOSO_MS);
    if (timerOcioso.unref) timerOcioso.unref();
  }

  /** Garante tudo pronto (instala/baixa na primeira vez). Devolve {base, modelo}. */
  async function preparar() {
    if (estado.fase === 'pronto' && estado.base && (await vivo(estado.base))) return { base: estado.base, modelo: estado.modelo };
    if (preparando) return preparando;
    preparando = (async () => {
      try {
        // Ollama que ela já tenha, com o Qwen 3.5 2B: usa ele (nada a instalar).
        const proprio = await vivo('http://127.0.0.1:11434');
        const doProprio = proprio && escolherModelo(proprio);
        if (doProprio) {
          muda({ fase: 'pronto', base: 'http://127.0.0.1:11434', modelo: doProprio, erro: null, progresso: 100 });
          return { base: estado.base, modelo: doProprio };
        }
        await instalarOllama();
        muda({ fase: 'ligando', progresso: 0 });
        const base = await subir();
        const modelo = await baixarModelo(base);
        muda({ fase: 'pronto', base, modelo, erro: null, progresso: 100 });
        return { base, modelo };
      } catch (e) {
        muda({ fase: 'erro', erro: e.message });
        throw e;
      } finally {
        preparando = null;
      }
    })();
    return preparando;
  }

  function parar(motivo = 'parar') {
    clearTimeout(timerOcioso);
    if (filho) {
      log('info', `Cérebro local desligado (${motivo}).`);
      try {
        filho.kill();
      } catch {
        /* já saiu */
      }
      filho = null;
    }
    if (estado.fase === 'pronto' && estado.base && estado.base.endsWith(`:${PORTA}`)) muda({ fase: 'parado' });
  }

  return {
    get estado() {
      return { ...estado };
    },
    preparar,
    /** Chamado a cada conversa: mantém ligado e reinicia a contagem para desligar. */
    usar() {
      ultimoUso = now();
      agendarDesligar();
    },
    pronto: () => estado.fase === 'pronto',
    parar,
    exe,
  };
}
