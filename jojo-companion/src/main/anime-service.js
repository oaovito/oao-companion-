// Serviço do ecossistema de animes no processo principal: acompanhamento em
// <userData>/animes.json e pacotes compostos em <userData>/anime-pacotes.json (gravação
// atômica com cópia anterior), canal da Central, links oficiais (só por clique dela),
// exportação .ics e a detecção opcional da sessão de mídia do Windows (desligada por padrão).
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { AtomicState } from '../core/atomic-state.js';
import { AcompanhamentoAnime, animesVazio, validarAnimes, sanitizeAlertas } from '../core/anime-acompanhamento.js';
import { RegistroPacotes, auditarCobertura, ORIGEM_ASSETS, CONTEXTOS } from '../core/anime-pacotes.js';
import { TABELA, LIMITES_ANIME } from '../core/anime-recompensas.js';
import { FUSOS_BR } from '../core/anime-tempo.js';
import { mediaSegura, urlSegura, STREAMING_OK } from '../core/anime-calendario.js';
import { SCRIPT_MIDIA } from '../core/anime-deteccao.js';
import { visuaisLiberados } from '../core/visual-nivel.js';
import { exportarIcs } from '../core/anime-ics.js';

const DETECCAO_MS = 30e3;

export function createAnimeService({ userData, companion, ipcMain, fromApp, shell, dialog = null, fetch = null, isWin = process.platform === 'win32', notify = () => {}, log = () => {} }) {
  const disk = new AtomicState(path.join(userData, 'animes.json'), { validate: validarAnimes, defaults: animesVazio, log });
  let estado;
  try { estado = disk.load(); } catch { estado = animesVazio(); }
  const acomp = new AcompanhamentoAnime({ state: estado, save: (st) => disk.write(st), now: () => Date.now(), mono: () => performance.now() });
  const discoPac = new AtomicState(path.join(userData, 'anime-pacotes.json'), { validate: (v) => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Pacotes inválidos.'); return v; }, defaults: () => ({}), log });
  let catalogo;
  try { catalogo = discoPac.load(); } catch { catalogo = {}; }
  const registro = new RegistroPacotes({ visuais: () => (companion._refs ? visuaisLiberados(companion._refs, 99999) : []), catalogo, salvar: (c) => discoPac.write(c) });
  let avisoPendente = null;
  acomp.changed = () => { if (!avisoPendente) avisoPendente = setTimeout(() => { avisoPendente = null; notify(); }, 250); };
  companion.animeConectar({ acomp, registro });

  // ---------------------------------------------------------------- detecção (opcional)
  let detTimer = null; let lendo = false;
  function lerMidia() {
    if (lendo || !isWin) return;
    lendo = true;
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', SCRIPT_MIDIA], { windowsHide: true, timeout: 8000, maxBuffer: 64 * 1024 }, (err, out) => {
      lendo = false;
      if (err) return;
      let info = null;
      try { info = JSON.parse(String(out || '').trim() || '{}'); } catch { info = null; }
      try { companion.animeMidia(info && info.titulo ? info : null); } catch (e) { log('warn', `Detecção de anime: ${e.message}`); }
    });
  }
  function deteccao() {
    const ligada = isWin && acomp.st.config.deteccao && companion.store.get().animeAtivo;
    if (ligada && !detTimer) detTimer = setInterval(lerMidia, DETECCAO_MS);
    if (!ligada && detTimer) { clearInterval(detTimer); detTimer = null; }
  }
  deteccao();

  // ---------------------------------------------------------------- capas (cache local)
  // A Central não acessa a internet (CSP): a capa vem do CDN da AniList pelo processo principal,
  // só de hosts permitidos, até 400 KB, só imagem; fica guardada em <userData>/anime-capas.
  const pastaCapas = path.join(userData, 'anime-capas');
  const capasMem = new Map();
  async function capa(url) {
    const u = urlSegura(url, ['s4.anilist.co', 'img.anili.st']);
    if (!u || !fetch) return null;
    if (capasMem.has(u)) return capasMem.get(u);
    const nome = crypto.createHash('sha1').update(u).digest('hex');
    const arq = path.join(pastaCapas, nome);
    let dados = null;
    try { dados = fs.readFileSync(arq, 'utf8'); } catch { /* ainda não baixada */ }
    if (!dados) {
      const r = await fetch(u, { redirect: 'error' });
      const tipo = r.headers.get('content-type') || '';
      if (!r.ok || !/^image\/(jpeg|png|webp|gif)$/.test(tipo.split(';')[0])) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 400 * 1024) return null;
      dados = `data:${tipo.split(';')[0]};base64,${buf.toString('base64')}`;
      try { fs.mkdirSync(pastaCapas, { recursive: true }); fs.writeFileSync(arq, dados); } catch { /* cache é só conveniência */ }
    }
    if (capasMem.size > 60) capasMem.delete(capasMem.keys().next().value);
    capasMem.set(u, dados);
    return dados;
  }

  // ---------------------------------------------------------------- Central
  const resumo = () => {
    const r = companion.animeResumo();
    return { ...r, fusos: FUSOS_BR, tabela: TABELA, limites: LIMITES_ANIME, contextos: CONTEXTOS.map((c) => c.id), deteccaoDisponivel: isWin, origemArte: ORIGEM_ASSETS };
  };
  const mediaDoPedido = (m) => { try { return m ? mediaSegura(m) : null; } catch { return null; } };
  const id = (v) => (Number.isSafeInteger(v) && v > 0 ? v : null);

  ipcMain.handle('anime:request', async (e, req) => {
    if (!fromApp(e) || !req || typeof req !== 'object') return { error: 'Solicitação indisponível.' };
    try {
      let result = null;
      switch (req.action) {
        case 'resumo': break;
        case 'capa': return { capa: await capa(typeof req.url === 'string' ? req.url : '').catch(() => null) };
        case 'buscar': {
          const q = typeof req.q === 'string' ? req.q.trim().slice(0, 80) : '';
          if (!q || !companion.animeApi) return { error: 'Digite o nome do anime.' };
          result = { resultados: await companion.animeApi.buscarCompleto(q) };
          break;
        }
        case 'calendario': {
          const desde = Math.floor(Date.now() / 1000) - 86400; const ate = desde + 9 * 86400;
          if (!acomp.st.janela || Date.now() - acomp.st.janela.em > 30 * 60e3 || req.forcar) acomp.guardarJanela(await companion.animeApi.janela(desde, ate));
          break;
        }
        case 'seguir': {
          // Só aceita um anime que veio da fonte (id) — o objeto é revalidado.
          let m = mediaDoPedido(req.media);
          if (!m && id(req.id)) m = (await companion.animeApi.detalhes([req.id]))[0] || null;
          if (!m) return { error: 'Anime não encontrado.' };
          result = acomp.seguir(m, { versao: req.versao, favorito: !!req.favorito });
          if (result.ok) { companion._animeLegadoAdicionar(result.anime); companion._animeSyncEm = 0; }
          break;
        }
        case 'deixar': result = acomp.deixar(id(req.id)); if (result.ok) companion._animeLegadoRemover(id(req.id)); break;
        case 'configurar': {
          const p = req.patch || {};
          result = acomp.configurar(id(req.id), { favorito: p.favorito, notificar: p.notificar, futuras: p.futuras, versao: p.versao, alertas: p.alertas === null ? null : sanitizeAlertas(p.alertas) ?? undefined, silencioAte: Number.isFinite(p.silencioAte) ? p.silencioAte : undefined });
          break;
        }
        case 'geral': result = acomp.configurarGeral(req.patch || {}); deteccao(); break;
        case 'iniciar': result = acomp.iniciarSessao({ anime: id(req.id), episodio: id(req.episodio) }); if (result.ok) { const a = acomp.anime(id(req.id)); companion._animeVisita(a, 'inicioSessao', { ms: 8000 }); } break;
        case 'pausar': result = acomp.pausar() ? { ok: true } : { ok: false }; break;
        case 'retomar': result = acomp.retomar() ? { ok: true } : { ok: false }; break;
        case 'interromper': result = acomp.interromper() || { ok: false }; break;
        case 'concluir': {
          const r = acomp.concluirSessao();
          result = r.ok ? { ok: true, texto: companion._animeRespostaRegistro(r) } : r;
          if (r.ok && result.texto) companion.say(result.texto, 'speech');
          break;
        }
        case 'manual': {
          const r = acomp.registrarManual({ anime: id(req.id), episodio: id(req.episodio) });
          result = r.ok ? { ok: true, texto: companion._animeRespostaRegistro(r, { manual: true }) } : r;
          break;
        }
        case 'corrigir': {
          const r = acomp.corrigir(String(req.registro || '').slice(0, 20));
          if (r.ok && companion.loja) for (const x of r.estornos) companion.loja.estornar(x);
          result = r;
          break;
        }
        case 'adiar': result = acomp.adiarAlerta(String(req.chave || '').slice(0, 120), Number(req.min) || 30); break;
        case 'sincronizar': await companion.sincronizarAnime({ forcar: true }); break;
        case 'abrir': {
          // "Assistir agora": só o link oficial guardado do próprio anime, aberto pelo clique dela.
          const a = acomp.anime(id(req.id));
          const link = a?.links?.find((l) => l.url === req.url);
          const url = link ? urlSegura(link.url, STREAMING_OK) : null;
          if (!url) return { error: 'Link indisponível.' };
          await shell.openExternal(url);
          result = { ok: true };
          break;
        }
        case 'ics': {
          // Salva só onde ela escolher (nada sai do PC).
          if (!dialog) return { error: 'Exportação indisponível.' };
          const r = await dialog.showSaveDialog({ title: 'Exportar animes para a agenda', defaultPath: 'animes-jojo.ics', filters: [{ name: 'Agenda (iCalendar)', extensions: ['ics'] }] });
          if (r.canceled || !r.filePath) { result = { ok: false, cancelado: true }; break; }
          fs.writeFileSync(r.filePath, exportarIcs(acomp.acompanhados(), Date.now()), 'utf8');
          result = { ok: true, salvo: true };
          break;
        }
        case 'auditoria': {
          const itens = new Set(companion.catalog?.itens?.map((i) => i.id) || []);
          result = auditarCobertura([...acomp.lista(), ...(acomp.st.janela?.itens || []).map((x) => ({ id: x.id, titulo: x.titulo, generos: x.generos, cor: x.cor }))], registro, itens);
          break;
        }
        default: return { error: 'Operação desconhecida.' };
      }
      return { result, anime: resumo() };
    } catch (err) {
      log('warn', `Animes: ${err.message}`);
      return { error: 'Não consegui confirmar agora. Nada do seu histórico mudou.' };
    }
  });

  return {
    acomp, registro, resumo,
    close() { if (detTimer) clearInterval(detTimer); detTimer = null; if (avisoPendente) clearTimeout(avisoPendente); },
  };
}
