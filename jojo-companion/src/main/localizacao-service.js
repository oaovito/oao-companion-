// Localização real no Windows (0.47.6). Entrega ao companion:
// - fontes: Windows (System.Device GeoCoordinateWatcher via PowerShell, uma leitura e para),
//   rede/IP (GeoJS, só como alternativa marcada como aproximada), cidade escrita (Open-Meteo
//   geocoding, já usado pela previsão) e nome do lugar (BigDataCloud, coordenada arredondada);
// - cofre: só a última localização, cifrada com o safeStorage do Windows (DPAPI). Sem
//   cifra disponível, fica só na memória (nada em texto puro no disco);
// - fuso: quando a localização confiável está noutro fuso, o processo principal passa a
//   usar esse fuso (process.env.TZ); lembretes, vigília e timers seguem o horário de lá.
import fs from 'node:fs';
import path from 'node:path';
import { execFile as nodeExecFile } from 'node:child_process';
import { LocErro, lerSaidaWindows, lerRespostaRede, lerRespostaNome, SCRIPT_WINDOWS_LOC, CASAS_LOC } from '../core/localizacao.js';

const TZ_ORIGINAL = process.env.TZ;

export function createLocalizacaoService({ userData, companion, fetch, safeStorage, ipcMain = null, fromSettings = () => true, notify = () => {}, execFile = nodeExecFile, platform = process.platform, log = () => {} }) {
  const arquivo = path.join(userData, 'localizacao.json');
  const json = async (url) => {
    let res;
    try { res = await fetch(url, { signal: AbortSignal.timeout(9000), redirect: 'error', headers: { Accept: 'application/json' } }); } catch { throw new LocErro('rede'); }
    if (!res.ok) throw new LocErro('rede');
    try { return await res.json(); } catch { throw new LocErro('rede'); }
  };
  const c = (v) => Number(v).toFixed(CASAS_LOC);

  const fontes = {
    windows: () => new Promise((resolve, reject) => {
      if (platform !== 'win32') return reject(new LocErro('indisponivel'));
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', SCRIPT_WINDOWS_LOC], { windowsHide: true, timeout: 25e3, maxBuffer: 64 * 1024 }, (err, stdout) => {
        if (err && !stdout) return reject(new LocErro(err.killed ? 'tempo' : 'indisponivel'));
        try { resolve(lerSaidaWindows(stdout)); } catch (e) { reject(e); }
      });
    }),
    rede: async () => lerRespostaRede(await json('https://get.geojs.io/v1/ip/geo.json')),
    manual: async (cidade) => {
      if (!companion.weather) throw new LocErro('indisponivel');
      let l;
      try { l = await companion.weather.locate(cidade); } catch (e) { throw new LocErro(e?.code === 'connection' ? 'rede' : 'cidade'); }
      return { lat: l.latitude, lon: l.longitude, precisaoM: null, cidade: l.name, regiao: l.admin1 || '', pais: l.country || '', paisCodigo: l.country_code || '', fuso: l.timezone };
    },
    nomear: async (lat, lon) => lerRespostaNome(await json(`https://api.bigdatacloud.net/data/reverse-geocode-client?${new URLSearchParams({ latitude: c(lat), longitude: c(lon), localityLanguage: 'pt' })}`)),
  };

  const cifra = () => { try { return safeStorage?.isEncryptionAvailable?.() === true; } catch { return false; } };
  let naMemoria = null;
  const cofre = {
    ler() {
      if (!cifra()) return naMemoria;
      try {
        const x = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
        if (x?.versao !== 1 || typeof x.cifrado !== 'string') return null;
        return JSON.parse(safeStorage.decryptString(Buffer.from(x.cifrado, 'base64')));
      } catch { return null; }
    },
    gravar(loc) {
      naMemoria = loc;
      try {
        if (!loc) { fs.rmSync(arquivo, { force: true }); fs.rmSync(`${arquivo}.tmp`, { force: true }); return; }
        if (!cifra()) return;
        const cifrado = safeStorage.encryptString(JSON.stringify(loc)).toString('base64');
        fs.writeFileSync(`${arquivo}.tmp`, JSON.stringify({ versao: 1, cifrado }));
        fs.renameSync(`${arquivo}.tmp`, arquivo);
      } catch (e) { log('warn', `Localização: não consegui salvar (${e.message}).`); }
    },
  };

  companion.locFontes = fontes;
  companion.locCofre = cofre;
  companion.fusoSistema = Intl.DateTimeFormat().resolvedOptions().timeZone;
  companion.onFuso = (fuso) => {
    if (fuso) process.env.TZ = fuso;
    else if (TZ_ORIGINAL === undefined) delete process.env.TZ;
    else process.env.TZ = TZ_ORIGINAL;
    log('info', fuso ? 'Fuso do app segue a localização.' : 'Fuso do app segue o Windows.');
  };
  companion.onLocalizacao = () => notify();

  ipcMain?.handle('localizacao:request', async (e, acao) => {
    if (!fromSettings(e)) return null;
    if (acao === 'atualizar') await companion._locTick({ forcar: true });
    else if (acao === 'esquecer') { companion.localizacao.esquecer(); companion._aplicarFuso(); }
    notify();
    return companion.localizacaoInfo();
  });

  return { fontes, cofre };
}
