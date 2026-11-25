// Detecção de sessão de anime pela sessão de mídia do Windows (opcional, DESLIGADA por padrão).
// O que chega aqui: título da mídia, app de origem, estado (tocando/pausado), posição e
// duração, lidos pelo próprio Windows (os mesmos dados do controle de mídia da barra do
// sistema). Nada de captura de tela, DRM, cookies, login ou leitura de página: se o serviço
// não publica o título, não há detecção e o registro manual continua valendo.
// Só o resultado da comparação local sai daqui (anime e episódio); o título não é guardado.
import { acharNaLista, normAnime } from './anime-linguagem.js';

const TEXTO_MAX = 300;

/** Limpa o que veio do sistema (texto de terceiros: nunca executado, só comparado). */
export function midiaSegura(m) {
  if (!m || typeof m !== 'object') return null;
  const txt = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, TEXTO_MAX).trim() : '');
  const num = (v) => (Number.isFinite(v) && v >= 0 && v < 1e6 ? v : null);
  const titulo = txt(m.titulo);
  if (!titulo) return null;
  const status = ['Playing', 'Paused', 'Stopped', 'Closed', 'Opened', 'Changing'].includes(m.status) ? m.status : 'Unknown';
  return { titulo, app: txt(m.app).slice(0, 120), status, posicaoS: num(m.pos), duracaoS: num(m.dur) };
}

/** Número do episódio no título ("Episódio 12", "E12", "EP 12", "S2 E05", "- 12"). */
export function episodioDoTitulo(t) {
  const n = normAnime(t);
  const m = n.match(/\b(?:episodio|episode|ep|e)\s*\.?\s*(\d{1,4})\b/) || n.match(/\bs\d{1,2}\s*e(\d{1,4})\b/) || n.match(/(?:^|\s)[-–—:]\s*(\d{1,4})(?:\s|$)/);
  return m ? Number(m[1]) : null;
}

/**
 * Compara a mídia com a lista dela: { anime, episodio, tocando, posicaoS } ou null.
 * Exige nome bem parecido com um anime acompanhado (nota alta) para não confundir com outra coisa.
 */
export function interpretarMidia(m, lista) {
  const x = midiaSegura(m);
  if (!x) return null;
  const nome = normAnime(x.titulo).replace(/\b(?:episodio|episode|ep|e)\s*\.?\s*\d{1,4}\b.*$/, '').replace(/\bs\d{1,2}\s*e\d{1,4}\b.*$/, '').replace(/\s+[-–—:|].*$/, '').trim();
  if (nome.length < 3) return null;
  const ach = acharNaLista(nome, (lista || []).filter((a) => a.pref?.acompanhando !== false));
  if (!ach.length || ach[0].nota < 0.78 || (ach[1] && ach[0].nota - ach[1].nota < 0.08)) return null;
  return { anime: ach[0].anime.id, episodio: episodioDoTitulo(x.titulo), tocando: x.status === 'Playing', posicaoS: x.posicaoS, duracaoS: x.duracaoS };
}

/**
 * Script do PowerShell (Windows 10/11) que lê a sessão de mídia atual pelo WinRT
 * (GlobalSystemMediaTransportControlsSessionManager) e imprime um JSON curto.
 */
export const SCRIPT_MIDIA = [
  "$ErrorActionPreference='Stop'",
  'Add-Type -AssemblyName System.Runtime.WindowsRuntime',
  "$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]",
  'function Esperar($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(5000) | Out-Null; $task.Result }',
  '[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null',
  '$g = Esperar ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])',
  '$s = $g.GetCurrentSession()',
  "if ($s -eq $null) { '{}'; exit }",
  '$p = Esperar ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])',
  '$i = $s.GetPlaybackInfo(); $tl = $s.GetTimelineProperties()',
  '@{ app = $s.SourceAppUserModelId; titulo = $p.Title; status = [string]$i.PlaybackStatus; pos = $tl.Position.TotalSeconds; dur = $tl.EndTime.TotalSeconds } | ConvertTo-Json -Compress',
].join('; ');
