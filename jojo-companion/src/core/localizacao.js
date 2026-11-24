// Localização real (0.47.6, pedido do João de 19/11/2026). Lógica pura: as fontes
// (serviço de localização do Windows, rede/IP, cidade escrita à mão) e o nome do lugar
// vêm de fora, para testar sem rede e sem Windows.
//
// Regras:
// - Nunca monitora sem parar: uma consulta ao abrir (se autorizada), depois a cada
//   `localizacaoIntervalo` minutos, ou quando ela pede. Entre uma e outra, usa a última.
// - A rede/IP é só alternativa e sempre marcada como aproximada; nunca vira "exata".
// - Guarda só a ÚLTIMA localização (coordenadas arredondadas a ~1 km) e os metadados.
//   Nada de histórico nem trajeto.
// - Fala e tela mostram no máximo cidade e estado; nunca coordenadas nem endereço.

export const INTERVALOS_LOC = Object.freeze([15, 30, 60, 180, 360, 720]);
export const MODOS_LOC = Object.freeze(['desligado', 'manual', 'automatico']);
/** Casas decimais guardadas e enviadas: 2 ≈ 1,1 km. Basta para clima e cidade. */
export const CASAS_LOC = 2;
const arred = (v) => Math.round(Number(v) * 10 ** CASAS_LOC) / 10 ** CASAS_LOC;
const MIN_ENTRE_CONSULTAS = 60e3; // nem a pedido: no máximo uma consulta por minuto
const RAIO_PARA_RENOMEAR_KM = 3;

export class LocErro extends Error {
  constructor(code, detalhe = '') { super(detalhe || code); this.code = code; }
}

/** Distância em km entre dois pontos (haversine). */
export function distanciaKm(a, b) {
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Nível de precisão pelo raio estimado (metros) e pela fonte. Rede nunca passa de "cidade". */
export function nivelDePrecisao(precisaoM, fonte) {
  if (fonte === 'manual') return 'cidade';
  const m = Number(precisaoM);
  if (fonte === 'rede') return Number.isFinite(m) && m > 100e3 ? 'regiao' : 'cidade';
  if (!Number.isFinite(m)) return 'cidade';
  if (m <= 100) return 'exata';
  if (m <= 2000) return 'bairro';
  if (m <= 50e3) return 'cidade';
  return 'regiao';
}
export const TEXTO_NIVEL = Object.freeze({ exata: 'precisa (GPS/Wi-Fi do Windows)', bairro: 'boa (bairro)', cidade: 'aproximada (cidade)', regiao: 'aproximada (região)' });
export const TEXTO_FONTE = Object.freeze({ windows: 'localização do Windows', rede: 'rede (IP), aproximada', manual: 'cidade escolhida' });

/** Fuso IANA válido? */
export function fusoValido(fuso) {
  if (typeof fuso !== 'string' || !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){0,2}$/.test(fuso)) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: fuso }).format(0); return true; } catch { return false; }
}

const texto = (v, n = 80) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n) : '');

/** Normaliza uma localização vinda de qualquer fonte (ou do disco). Inválida → null. */
export function normalizarLoc(x) {
  if (!x || typeof x !== 'object') return null;
  const lat = Number(x.lat), lon = Number(x.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  if (lat === 0 && lon === 0) return null; // "ilha nula": serviço sem resposta de verdade
  const fonte = ['windows', 'rede', 'manual'].includes(x.fonte) ? x.fonte : null;
  if (!fonte) return null;
  const precisaoM = Number.isFinite(Number(x.precisaoM)) && Number(x.precisaoM) > 0 ? Math.round(Number(x.precisaoM)) : null;
  const out = {
    lat: arred(lat), lon: arred(lon), precisaoM, fonte, nivel: nivelDePrecisao(precisaoM, fonte),
    cidade: texto(x.cidade), regiao: texto(x.regiao), pais: texto(x.pais), paisCodigo: texto(x.paisCodigo, 2).toUpperCase(),
    fuso: fusoValido(x.fuso) ? x.fuso : '', em: Number.isFinite(Number(x.em)) ? Number(x.em) : 0,
  };
  return out;
}

/** Nome curto para fala e tela: só cidade e estado (nunca coordenadas ou endereço). */
export function nomeDoLugar(loc) {
  if (!loc) return '';
  return [loc.cidade, loc.regiao && loc.regiao !== loc.cidade ? loc.regiao : ''].filter(Boolean).join(', ') || loc.pais || '';
}

/** O que mudou entre duas localizações (cidade, estado, país, fuso). */
export function mudancas(antes, depois) {
  if (!antes || !depois) return { cidade: false, regiao: false, pais: false, fuso: false, alguma: false };
  const n = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const m = {
    cidade: !!(antes.cidade && depois.cidade && n(antes.cidade) !== n(depois.cidade)),
    regiao: !!(antes.regiao && depois.regiao && n(antes.regiao) !== n(depois.regiao)),
    pais: !!(antes.paisCodigo && depois.paisCodigo && antes.paisCodigo !== depois.paisCodigo),
    fuso: !!(antes.fuso && depois.fuso && antes.fuso !== depois.fuso),
  };
  return { ...m, alguma: m.cidade || m.regiao || m.pais || m.fuso };
}

/**
 * Fuso que o app deve seguir. Só troca o do Windows quando a localização é confiável
 * (Windows ou cidade escolhida; a rede pode ser VPN) e ela deixou ligado.
 */
export function fusoParaOApp(loc, cfg = {}, fusoSistema = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  if (cfg.localizacaoFuso === false || !loc || !fusoValido(loc.fuso) || loc.fonte === 'rede') return null;
  if (cfg.localizacaoModo === 'desligado') return null;
  return loc.fuso !== fusoSistema ? loc.fuso : null;
}

/**
 * Gerenciador da última localização. Nada de timer próprio: quem usa chama
 * `atualizar()` quando `proximaEmMs()` manda (e ao abrir, voltar da suspensão ou a pedido).
 */
export class GerenciadorLocalizacao {
  constructor({ fontes = {}, nomear = null, getConfig = () => ({}), now = () => Date.now(), mono = () => Date.now(), load = () => null, save = () => {}, onMudanca = () => {}, log = () => {} } = {}) {
    Object.assign(this, { fontes, nomear, getConfig, now, mono, save, onMudanca, log });
    this.ultima = normalizarLoc(load());
    this.erro = null; // último motivo de falha (código), para a tela
    this.pendente = null;
    this.ultimaConsultaMono = -Infinity;
  }

  get modo() { const m = this.getConfig().localizacaoModo; return MODOS_LOC.includes(m) ? m : 'manual'; }
  get intervaloMs() {
    const v = Number(this.getConfig().localizacaoIntervalo);
    return (INTERVALOS_LOC.includes(v) ? v : 60) * 60e3;
  }
  get cidadeManual() { return texto(this.getConfig().climaCidade, 120); }

  /** Última localização válida (ou null). A manual vale só se ainda é a cidade escolhida. */
  atual() {
    if (this.modo === 'desligado') return null;
    const u = this.ultima;
    if (!u) return null;
    if (this.modo === 'manual' && (u.fonte !== 'manual' || !this.cidadeManual)) return null;
    return u;
  }

  idadeMs() { return this.ultima ? Math.max(0, this.now() - this.ultima.em) : Infinity; }

  /** Quanto falta para a próxima consulta automática (mínimo 1 min; desligado → null). */
  proximaEmMs() {
    if (this.modo === 'desligado') return null;
    if (this.modo === 'manual') return this.cidadeManual && !(this.ultima?.fonte === 'manual' && this._manualKey === this.cidadeManual) ? MIN_ENTRE_CONSULTAS : null;
    return Math.max(MIN_ENTRE_CONSULTAS, this.intervaloMs - this.idadeMs());
  }

  /**
   * Atualiza se precisa (ou se `forcar`). Devolve a localização em uso (ou null) e nunca
   * lança: o motivo da falha fica em `this.erro`.
   */
  async atualizar({ forcar = false } = {}) {
    const modo = this.modo;
    if (modo === 'desligado') { this.erro = null; return null; }
    if (modo === 'manual' && !this.cidadeManual) { this.erro = 'sem_cidade'; return null; }
    if (this.pendente) return this.pendente;
    const fresca = modo === 'manual'
      ? this.ultima?.fonte === 'manual' && this._manualKey === this.cidadeManual
      : this.ultima && this.ultima.fonte !== 'manual' && this.idadeMs() < this.intervaloMs;
    if (fresca && !forcar) return this.atual();
    if (this.mono() - this.ultimaConsultaMono < MIN_ENTRE_CONSULTAS && this.ultima) return this.atual();
    this.ultimaConsultaMono = this.mono();
    this.pendente = this._consultar(modo).finally(() => { this.pendente = null; });
    return this.pendente;
  }

  async _consultar(modo) {
    let nova = null;
    try {
      if (modo === 'manual') {
        const cidade = this.cidadeManual;
        if (!cidade) throw new LocErro('sem_cidade');
        if (!this.fontes.manual) throw new LocErro('indisponivel');
        nova = { ...(await this.fontes.manual(cidade)), fonte: 'manual' };
        this._manualKey = cidade;
      } else {
        nova = await this._automatica();
      }
    } catch (e) {
      this.erro = e?.code || 'indisponivel';
      this.log('warn', `Localização: sem atualização (${this.erro}).`);
      return this.atual(); // fallback seguro: a última válida, sem inventar precisão
    }
    nova = normalizarLoc({ ...nova, em: this.now() });
    if (!nova) { this.erro = 'resposta_invalida'; return this.atual(); }
    // Nome do lugar: a fonte manual/rede já traz; do Windows, só quando andou mais de 3 km.
    const antes = this.ultima;
    if (!nova.cidade && antes?.cidade && distanciaKm(antes, nova) < RAIO_PARA_RENOMEAR_KM) {
      nova = { ...nova, cidade: antes.cidade, regiao: antes.regiao, pais: antes.pais, paisCodigo: antes.paisCodigo, fuso: nova.fuso || antes.fuso };
    } else if (!nova.cidade && this.nomear) {
      try {
        const nome = await this.nomear(nova.lat, nova.lon);
        nova = normalizarLoc({ ...nova, ...nome, fuso: nova.fuso || nome?.fuso, lat: nova.lat, lon: nova.lon, fonte: nova.fonte, precisaoM: nova.precisaoM, em: nova.em }) || nova;
      } catch { /* sem nome: ainda serve para o clima */ }
    }
    this.erro = null;
    this.ultima = nova;
    this._salvar();
    const m = mudancas(antes, nova);
    if (m.alguma) this.onMudanca({ ...m, antes, depois: nova });
    return this.atual();
  }

  /** Windows primeiro (se ela autorizou); a rede só como alternativa marcada. */
  async _automatica() {
    const cfg = this.getConfig();
    let erroWin = null;
    if (this.fontes.windows) {
      try { return { ...(await this.fontes.windows()), fonte: 'windows' }; } catch (e) { erroWin = e; }
    } else erroWin = new LocErro('indisponivel');
    if (cfg.localizacaoRede !== false && this.fontes.rede) {
      const r = await this.fontes.rede();
      this.erroWindows = erroWin?.code || null;
      return { ...r, fonte: 'rede' };
    }
    throw erroWin;
  }

  /** O fuso veio de outro lugar (ex.: o serviço de clima com `timezone=auto`). */
  definirFuso(fuso) {
    if (!this.ultima || !fusoValido(fuso) || this.ultima.fuso === fuso) return false;
    const antes = this.ultima;
    this.ultima = { ...antes, fuso };
    this._salvar();
    if (antes.fuso) this.onMudanca({ ...mudancas(antes, this.ultima), antes, depois: this.ultima });
    return true;
  }

  /** Apaga a última localização (desligou ou pediu para esquecer). */
  esquecer() {
    this.ultima = null; this.erro = null; this._manualKey = null;
    this._salvar();
  }

  _salvar() { try { this.save(this.ultima ? { ...this.ultima } : null); } catch { /* disco: na próxima */ } }

  /** Resumo para a tela e para a conversa (sem coordenadas). */
  resumo() {
    const u = this.atual();
    return {
      modo: this.modo, ativa: !!u, lugar: nomeDoLugar(u), fonte: u ? TEXTO_FONTE[u.fonte] : '', nivel: u ? TEXTO_NIVEL[u.nivel] : '',
      aproximada: !!u && (u.fonte === 'rede' || u.nivel === 'regiao'), fuso: u?.fuso || '', em: u?.em || 0, erro: this.erro, erroWindows: this.erroWindows || null,
    };
  }
}

/** Mensagens de falha para a tela (nunca inventam lugar). */
export const TEXTO_ERRO_LOC = Object.freeze({
  sem_permissao: 'O Windows não deixou ler a localização. Em Configurações do Windows → Privacidade e segurança → Localização, ligue "Serviços de localização" e "Permitir que aplicativos da área de trabalho acessem sua localização".',
  desligada: 'Os serviços de localização do Windows estão desligados.',
  tempo: 'O Windows não respondeu a tempo. Eu tento de novo na próxima verificação.',
  indisponivel: 'Localização indisponível agora.',
  rede: 'Sem internet para a localização aproximada.',
  sem_cidade: 'Escreva a cidade padrão para usar a localização manual.',
  cidade: 'Não encontrei essa cidade. Escreva cidade e estado.',
  resposta_invalida: 'O serviço devolveu uma localização inválida; mantive a última.',
});

// ------------------------------------------------------------------ leitura das fontes

/**
 * Saída do script do Windows (GeoCoordinateWatcher) → { lat, lon, precisaoM } ou LocErro.
 * O script devolve JSON com status, permission, lat, lon, acc, unknown.
 */
export function lerSaidaWindows(stdout) {
  let o;
  try { o = JSON.parse(String(stdout || '').trim().split(/\r?\n/).filter(Boolean).at(-1) || ''); } catch { throw new LocErro('indisponivel'); }
  if (!o || typeof o !== 'object') throw new LocErro('indisponivel');
  if (/denied/i.test(o.permission || '')) throw new LocErro('sem_permissao');
  if (/disabled/i.test(o.status || '')) throw new LocErro('desligada');
  if (o.unknown || o.lat == null || o.lon == null) throw new LocErro(/nodata|initializing/i.test(o.status || '') ? 'tempo' : 'indisponivel');
  const lat = Number(o.lat), lon = Number(o.lon), acc = Number(o.acc);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new LocErro('indisponivel');
  return { lat, lon, precisaoM: Number.isFinite(acc) && acc > 0 ? acc : null };
}

/** Script do PowerShell: uma leitura, até 15 s, e para o sensor. Sem rede, sem disco. */
export const SCRIPT_WINDOWS_LOC = [
  '$ErrorActionPreference = "Stop"',
  'Add-Type -AssemblyName System.Device',
  '$w = New-Object System.Device.Location.GeoCoordinateWatcher([System.Device.Location.GeoPositionAccuracy]::High)',
  '$null = $w.TryStart($false, [TimeSpan]::FromSeconds(10))',
  '$fim = (Get-Date).AddSeconds(15)',
  'while ((Get-Date) -lt $fim -and "$($w.Permission)" -ne "Denied" -and "$($w.Status)" -ne "Disabled" -and $w.Position.Location.IsUnknown) { Start-Sleep -Milliseconds 250 }',
  '$p = $w.Position.Location',
  '$o = @{ status = "$($w.Status)"; permission = "$($w.Permission)"; unknown = [bool]$p.IsUnknown; lat = $null; lon = $null; acc = $null }',
  'if (-not $p.IsUnknown) { $o.lat = $p.Latitude; $o.lon = $p.Longitude; if (-not [double]::IsNaN($p.HorizontalAccuracy)) { $o.acc = $p.HorizontalAccuracy } }',
  '$w.Stop(); $w.Dispose()',
  '$o | ConvertTo-Json -Compress',
].join('; ');

/** Resposta do GeoJS (https://get.geojs.io/v1/ip/geo.json) → localização aproximada. */
export function lerRespostaRede(j) {
  if (!j || typeof j !== 'object') throw new LocErro('rede');
  const lat = Number(j.latitude), lon = Number(j.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new LocErro('rede');
  // O raio do IP é grosseiro: nunca menos de 25 km, mesmo que o serviço diga outra coisa.
  const raioKm = Number(j.accuracy);
  return {
    lat, lon, precisaoM: Math.max(25e3, Number.isFinite(raioKm) ? raioKm * 1000 : 50e3),
    cidade: texto(j.city), regiao: texto(j.region), pais: texto(j.country), paisCodigo: texto(j.country_code, 2), fuso: fusoValido(j.timezone) ? j.timezone : '',
  };
}

/** Resposta do BigDataCloud (reverse-geocode-client) → cidade, estado, país e fuso. */
export function lerRespostaNome(j) {
  if (!j || typeof j !== 'object') throw new LocErro('rede');
  const fuso = (j.localityInfo?.informative || []).map((x) => x?.name).find((n) => fusoValido(n) && n.includes('/')) || '';
  const cidade = texto(j.city) || texto(j.locality);
  if (!cidade && !texto(j.principalSubdivision)) throw new LocErro('rede');
  return { cidade, regiao: texto(j.principalSubdivision), pais: texto(j.countryName), paisCodigo: texto(j.countryCode, 2), fuso };
}
