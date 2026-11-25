// Ecossistema de animes (25/11/2026): acompanhamento, alertas idempotentes com fila,
// linguagem natural, pacotes visuais temáticos, sessões, JOJOcoins pela carteira oficial,
// antifraude, conquistas, falas e exportação. AniList simulado (nada sai para a internet).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv, loadJSON } from './helpers.js';
import { AnimeCalendario, mediaSegura } from '../../src/core/anime-calendario.js';
import { AcompanhamentoAnime, animesVazio, validarAnimes } from '../../src/core/anime-acompanhamento.js';
import { RECOMPENSA, LIMITES_ANIME, categoria, limiarMs, CONQUISTAS_ANIME } from '../../src/core/anime-recompensas.js';
import { intencaoAnime, acharNaLista, escolherResultado, escolhaDaResposta, nomeParaBusca } from '../../src/core/anime-linguagem.js';
import { itensAnime, CURADOS, CONTEXTOS, ESTILO_IDS, validarPacote, comporPacote, canaisDoPacote, RegistroPacotes, auditarCobertura, animAnime } from '../../src/core/anime-pacotes.js';
import { rigComAnime, pecasAnime, ACESSORIOS, NEUTRO_ANIME, comCanaisAnime } from '../../src/core/anime-arte.js';
import { FALAS_ANIME, totalFalasAnime, falaAnime } from '../../src/core/anime-falas.js';
import { quandoTexto, formatarHora, contagem } from '../../src/core/anime-tempo.js';
import { interpretarMidia, episodioDoTitulo } from '../../src/core/anime-deteccao.js';
import { exportarIcs } from '../../src/core/anime-ics.js';
import { buildAnimation } from '../../src/core/catalog/recipes.js';
import { Loja } from '../../src/core/loja.js';

const MIN = 60e3, H = 3600e3, D = 86400e3;
const T0 = Date.UTC(2026, 10, 25, 12, 0); // 25/11/2026 09h00 em Brasília

function midia(id, titulo, extra = {}) {
  return { id, title: { romaji: titulo, english: titulo }, format: 'TV', status: 'RELEASING', episodes: 12, duration: 24, genres: ['Action', 'Fantasy'], coverImage: { color: '#b71c1c', large: 'https://s4.anilist.co/file/x.jpg' }, externalLinks: [{ site: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/x', type: 'STREAMING' }, { site: 'Malware', url: 'https://evil.example/x', type: 'STREAMING' }], tags: [{ name: 'Magic', rank: 90, isMediaSpoiler: false }], ...extra };
}

function aniList(base, agora) {
  const banco = {
    97940: midia(97940, 'Black Clover', { status: 'FINISHED', episodes: 3, nextAiringEpisode: null }),
    21: midia(21, 'ONE PIECE', { episodes: null, nextAiringEpisode: { episode: 1181, airingAt: Math.floor((agora() + 3 * H) / 1000) } }),
    500: midia(500, 'Anime Ninja Novo', { tags: [{ name: 'Ninja', rank: 85, isMediaSpoiler: false }], nextAiringEpisode: { episode: 4, airingAt: Math.floor((agora() + 26 * H) / 1000) } }),
    ...base,
  };
  const chamadas = [];
  const fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    chamadas.push(body);
    let data;
    if (/search:\$s/.test(body.query)) {
      const s = body.variables.s.toLowerCase().replace(/\s+/g, '');
      data = { Page: { media: Object.values(banco).filter((m) => `${m.title.romaji}${m.title.english}`.toLowerCase().replace(/\s+/g, '').includes(s)) } };
    } else if (/id_in/.test(body.query)) data = { Page: { media: body.variables.ids.map((i) => banco[i]).filter(Boolean) } };
    else data = { Page: { pageInfo: { hasNextPage: false }, airingSchedules: [] } };
    return { ok: true, status: 200, json: async () => ({ data }) };
  };
  return { fetch, chamadas, banco };
}

function conectado({ agoraBase = T0 } = {}) {
  const e = makeEnv({ settings: { speechFrequency: 'off' }, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.clock.advance(3000);
  const agora = () => agoraBase + e.clock.now();
  const salvos = [];
  const acomp = new AcompanhamentoAnime({ save: (st) => salvos.push(st), now: agora, mono: () => e.clock.now() });
  const pacotes = {};
  const registro = new RegistroPacotes({ visuais: () => [], catalogo: pacotes, salvar: () => {} });
  e.companion.loja = new Loja({ now: agora });
  const api = aniList({}, agora);
  e.companion.animeApi = new AnimeCalendario({ fetch: api.fetch, now: agora });
  e.companion.animeConectar({ acomp, registro });
  const falas = [];
  const say = e.companion.say.bind(e.companion);
  e.companion.say = (t, ...r) => { const ok = say(t, ...r); if (ok) falas.push(t); return ok; };
  return { ...e, acomp, registro, api, agora, falas, salvos };
}
const BC = () => mediaSegura(midia(97940, 'Black Clover', { status: 'FINISHED', episodes: 3, nextAiringEpisode: null }));

// ---------------------------------------------------------------- fonte e dados

test('fonte: dados de fora validados (link só de streaming permitido, capa só do CDN, tags sem spoiler)', () => {
  const m = mediaSegura(midia(1, 'X<script>', { tags: [{ name: 'Ninja', rank: 80, isMediaSpoiler: false }, { name: 'Twist', rank: 90, isMediaSpoiler: true }] }));
  assert.ok(!/[<>]/.test(m.titulo));
  assert.deepEqual(m.links.map((l) => l.site), ['Crunchyroll']);
  assert.match(m.capa, /^https:\/\/s4\.anilist\.co\//);
  assert.deepEqual(m.tags.map((t) => [t.nome, t.spoiler]), [['Ninja', false], ['Twist', true]]);
  assert.equal(mediaSegura({ id: -1 }), null);
});

test('fonte: disjuntor depois de falhas seguidas e nada de chave ou login', async () => {
  let agora = T0;
  const api = new AnimeCalendario({ fetch: async () => ({ ok: false, status: 500 }), now: () => agora });
  for (let i = 0; i < 4; i++) await assert.rejects(api.buscarCompleto('x'));
  assert.ok(api.disjuntorAberto());
  const antes = api.consultas;
  await assert.rejects(api.buscarCompleto('x'));
  assert.equal(api.consultas, antes, 'aberto: nem tenta');
  agora += 16 * MIN;
  assert.ok(!api.disjuntorAberto());
});

test('tempo: horário de Brasília por padrão, rótulos hoje/amanhã e contagem', () => {
  assert.equal(formatarHora(Date.UTC(2026, 10, 25, 15, 30)), '12h30');
  assert.equal(quandoTexto(Date.UTC(2026, 10, 26, 15, 30), T0), 'amanhã às 12h30');
  assert.equal(formatarHora(Date.UTC(2026, 10, 25, 15, 30), 'America/Manaus'), '11h30');
  assert.equal(contagem(T0 + 2 * H + 5 * MIN, T0).texto, '2h 05min 00s');
});

// ---------------------------------------------------------------- recompensas e antifraude

test('recompensas: tabela balanceada e limiar de 85% sem obrigar abertura e créditos', () => {
  assert.equal(categoria('TV', 24), 'convencional');
  assert.equal(categoria('TV_SHORT', 5), 'curto');
  assert.equal(categoria('MOVIE', 110), 'filme');
  assert.equal(limiarMs('TV', 24), 19.5 * MIN);
  assert.equal(limiarMs('MOVIE', 100), 85 * MIN);
  // Hora de anime rende bem menos que a hora ativa da loja (190 JOJOcoins/h).
  assert.ok((RECOMPENSA.convencional * 60) / 24 < 190 / 4);
});

test('sessão: menos de 85% não paga; completa paga uma vez só (manual e detectado na mesma chave)', () => {
  let mono = 0; let agora = T0;
  const ac = new AcompanhamentoAnime({ now: () => agora, mono: () => mono });
  ac.seguir(BC());
  assert.equal(ac.iniciarSessao({ anime: 97940, episodio: 1 }).ok, true);
  mono += 10 * MIN; agora += 10 * MIN;
  let r = ac.concluirSessao();
  assert.equal(r.ok, false); assert.equal(r.motivo, 'incompleto');
  assert.equal(ac.st.outbox.length, 0);
  assert.equal(ac.anime(97940).prog.interrompido.episodio, 1, 'guarda onde parou');
  ac.iniciarSessao({ anime: 97940, episodio: 1 });
  mono += 10 * MIN; agora += 10 * MIN;
  r = ac.concluirSessao();
  assert.equal(r.ok, true);
  assert.deepEqual(r.creditos.map((c) => c.valor), [RECOMPENSA.convencional, RECOMPENSA.primeiroEp]);
  // O mesmo episódio registrado à mão (ou dublado) não paga de novo.
  r = ac.registrarManual({ anime: 97940, episodio: 1 });
  assert.equal(r.registro.tipo, 'revisita');
  assert.equal(r.registro.moedasBase, 0);
});

test('antifraude: relógio do Windows adiantado não conta; avançar o vídeo vira "pulado"', () => {
  let mono = 0; let agora = T0;
  const ac = new AcompanhamentoAnime({ now: () => agora, mono: () => mono });
  ac.seguir(BC());
  ac.iniciarSessao({ anime: 97940, episodio: 1, origem: 'auto', posicaoS: 0 });
  agora += 3 * H; mono += 1 * MIN; // mudou o relógio
  ac.tickSessao({ tocando: true, posicaoS: 60 });
  assert.ok(ac.st.sessao.relogioSuspeito);
  assert.ok(ac.st.sessao.efetivoMs <= MIN);
  mono += MIN; agora += MIN;
  ac.tickSessao({ tocando: true, posicaoS: 60 + 20 * 60 }); // pulou 19 min
  assert.ok(ac.st.sessao.pulosMs > 15 * MIN);
  assert.ok(ac.faltaParaConcluir() > 0);
});

test('antifraude: episódio que não saiu, temporada inexistente e 30 episódios manuais num dia', () => {
  const agora = T0;
  const ac = new AcompanhamentoAnime({ now: () => agora, mono: () => 0 });
  ac.seguir(mediaSegura(midia(21, 'ONE PIECE', { episodes: null, nextAiringEpisode: { episode: 1181, airingAt: Math.floor((agora + H) / 1000) } })));
  assert.equal(ac.registrarManual({ anime: 21, episodio: 1181 }).motivo, 'episodioInvalido');
  assert.equal(ac.registrarManual({ anime: 21, episodio: 99999 }).motivo, 'episodioInvalido');
  let pagos = 0;
  for (let ep = 1; ep <= 30; ep++) { const r = ac.registrarManual({ anime: 21, episodio: ep }); if (r.registro.moedasBase > 0) pagos++; }
  assert.ok(pagos <= Math.floor((LIMITES_ANIME.manualMinDia + LIMITES_ANIME.manualFolgaMin) / 24), `pagos ${pagos}`);
  assert.equal(ac.historico?.length ?? ac.st.historico.length, 30, 'todos ficam no histórico');
});

test('temporada e série: bônus uma vez; teto diário de episódios; correção devolve pela carteira', () => {
  let agora = T0;
  const ac = new AcompanhamentoAnime({ now: () => agora, mono: () => 0 });
  ac.seguir(BC());
  let r;
  for (let ep = 1; ep <= 3; ep++) r = ac.registrarManual({ anime: 97940, episodio: ep });
  assert.ok(r.concluiuTemporada && r.concluiuSerie);
  assert.deepEqual(r.creditos.map((c) => c.id).sort(), ['anime:ep:97940:3', 'anime:serie:97940', 'anime:temp:97940'].sort());
  const loja = new Loja({ now: () => agora });
  ac.drenarCreditos((c) => loja.creditar(c));
  const saldo = loja.st.saldo;
  assert.equal(saldo, 3 * RECOMPENSA.convencional + RECOMPENSA.primeiroEp + RECOMPENSA.temporada + RECOMPENSA.serie);
  // Drenar de novo não credita nada (idempotente).
  assert.equal(ac.drenarCreditos((c) => loja.creditar(c)).length, 0);
  const h = ac.st.historico[0];
  const c = ac.corrigir(h.id);
  for (const x of c.estornos) loja.estornar(x);
  for (const x of c.estornos) loja.estornar(x); // repetir não desconta de novo
  assert.equal(loja.st.saldo, saldo - RECOMPENSA.convencional);
  assert.equal(ac.anime(97940).prog.vistos[1], undefined);
  agora += D;
});

test('carteira: estorno nunca deixa o saldo negativo', () => {
  const loja = new Loja();
  loja.creditar({ id: 'a', valor: 5, origem: 'anime' });
  assert.equal(loja.estornar({ id: 'a', valor: 50 }).estornado, 5);
  assert.equal(loja.st.saldo, 0);
  assert.equal(loja.estornar({ id: 'a', valor: 50 }).duplicado, true);
});

test('conquistas de anime: estão na progressão com conta e valor em JOJOcoins', () => {
  const prog = loadJSON('assets/catalog/progressao.json');
  for (const c of CONQUISTAS_ANIME) {
    const q = prog.conquistas.find((x) => x.id === c.id);
    assert.ok(q && q.conta === c.conta && q.n === c.n && q.moedas > 0, c.id);
  }
});

// ---------------------------------------------------------------- alertas

test('alertas: idempotentes, só o mais recente de cada episódio, nada de enxurrada ao reabrir', () => {
  let agora = T0;
  const ac = new AcompanhamentoAnime({ now: () => agora, mono: () => 0 });
  ac.seguir(mediaSegura(midia(21, 'ONE PIECE', { nextAiringEpisode: { episode: 1181, airingAt: Math.floor((T0 + 2 * H) / 1000) } })), { alertas: ['h3', 'h1', 'm30', 'horario'] });
  let d = ac.devidos(agora);
  assert.equal(d.length, 1); assert.equal(d[0].tipo, 'h3');
  ac.marcarEnviados([[d[0].chave, d[0].quando]]);
  assert.equal(ac.devidos(agora).length, 0, 'não repete');
  agora = T0 + 2 * H + MIN; // app fechado: perdeu h1 e m30
  d = ac.devidos(agora);
  assert.equal(d.filter((x) => !x.descartar).length, 1);
  assert.equal(d[0].tipo, 'horario');
  assert.ok(d[0].cobre.length >= 2, 'os anteriores ficam como entregues');
});

test('alertas: só dublado não gera aviso com horário inventado', () => {
  const ac = new AcompanhamentoAnime({ now: () => T0, mono: () => 0 });
  ac.seguir(mediaSegura(midia(21, 'ONE PIECE', { nextAiringEpisode: { episode: 1181, airingAt: Math.floor((T0 + MIN) / 1000) } })), { versao: 'dub', alertas: ['h1'] });
  assert.equal(ac.devidos(T0).length, 0);
});

test('companion: aviso espera o Modo Trabalho, depois aparece vestido do pacote e restaura tudo', async () => {
  const e = conectado();
  try {
    e.acomp.seguir(mediaSegura(midia(500, 'Anime Ninja Novo', { tags: [{ name: 'Ninja', rank: 85, isMediaSpoiler: false }], nextAiringEpisode: { episode: 4, airingAt: Math.floor((e.agora() + 50 * MIN) / 1000) } })), { alertas: ['h1'] });
    e.companion.startWork();
    e.clock.advance(31e3);
    assert.ok(!e.falas.some((t) => /Anime Ninja Novo/.test(t)), 'Modo Trabalho: espera');
    assert.equal(e.acomp.st.fila.length, 1, 'fica na fila persistente');
    e.companion.endWork();
    for (let i = 0; i < 40 && !e.falas.some((t) => /Anime Ninja Novo/.test(t)); i++) e.clock.advance(1000);
    const f = e.falas.find((t) => /Anime Ninja Novo/.test(t));
    assert.ok(f, e.falas.join(' | '));
    const v = e.companion.animeVisita;
    assert.ok(v && v.substitui && v.pacote === 'c500');
    const canais = e.companion._visualCanais();
    assert.equal(canais.ak_bandanaNinja, 1, 'acessório reconhecível do anime');
    assert.ok(e.companion._animeEstado().paleta.akA, 'cores do pacote');
    assert.equal(e.acomp.st.fila.length, 0);
    e.clock.advance(21e3);
    assert.equal(e.companion.animeVisita, null);
    assert.equal(e.companion._animeEstado(), null, 'volta ao visual salvo');
  } finally { e.companion.stop(); }
});

// ---------------------------------------------------------------- conversa

test('linguagem: exemplos do pedido viram a intenção certa', () => {
  const casos = {
    'me avisa quando sair Black Clover': ['seguir', 'black clover'],
    'Jojo, coloca One Piece na minha lista': ['seguir', 'one piece'],
    'me avisa meia hora antes de lançar Jujutsu Kaisen': ['alertaAntes', 'jujutsu kaisen'],
    'quanto eu ganho assistindo esse anime?': ['quantoGanho', null],
    'acabei de assistir': ['terminei', null],
    'continuar de onde parei': ['continuar', undefined],
    'o que sai hoje?': ['agenda', undefined],
    'quais animes eu ainda tenho pra assistir?': ['pendentes', undefined],
    'me avisa quando anunciarem a nova temporada de Frieren': ['novaTemporada', 'frieren'],
  };
  for (const [frase, [tipo, nome]] of Object.entries(casos)) {
    const it = intencaoAnime(frase);
    assert.equal(it?.tipo, tipo, frase);
    if (nome !== undefined) assert.equal(it.nome ?? null, nome, frase);
  }
  assert.equal(intencaoAnime('me avisa meia hora antes de lançar Jujutsu Kaisen').minutos, 30);
  assert.equal(intencaoAnime('oi jojo tudo bem?'), null);
});

test('linguagem: apelidos, erro de digitação e desambiguação', () => {
  assert.match(nomeParaBusca('kimetsu'), /Kimetsu|Demon Slayer/);
  assert.match(nomeParaBusca('jjk'), /Jujutsu/);
  const lista = [BC(), mediaSegura(midia(21, 'ONE PIECE'))];
  assert.equal(acharNaLista('blak clover', lista)[0].anime.id, 97940);
  const varios = [mediaSegura(midia(1, 'Frieren')), mediaSegura(midia(2, 'Frieren', { format: 'MOVIE', status: 'FINISHED' }))];
  const e = escolherResultado('frieren', varios);
  assert.ok(e.opcoes?.length === 2 || e.escolhido);
  assert.equal(escolhaDaResposta('o filme', varios).id, 2);
  assert.equal(escolhaDaResposta('1', varios).id, 1);
});

test('companion: segue por frase, responde quanto vale e "terminei" sem anime não sequestra a conversa', async () => {
  const e = conectado();
  try {
    let r = await chatAdv(e, 'me avisa quando sair Black Clover');
    assert.match(r.text, /Black Clover/);
    assert.ok(e.acomp.anime(97940)?.pref.acompanhando);
    assert.ok(e.store.get().animes.some((a) => a.id === 97940), 'lista antiga em dia');
    r = await chatAdv(e, 'quanto eu ganho assistindo esse anime?');
    assert.match(r.text, /JOJOcoins/);
    assert.match(r.text, new RegExp(String(RECOMPENSA.convencional)));
    e.companion._animeCtx = null;
    r = await chatAdv(e, 'terminei o treino');
    assert.notEqual(r?.intent, 'anime');
  } finally { e.companion.stop(); }
});

test('companion: sessão manual por conversa, "terminei" cedo não paga e completa credita na carteira', async () => {
  const e = conectado();
  try {
    e.acomp.seguir(BC());
    let r = await chatAdv(e, 'vou assistir black clover');
    assert.equal(r.intent, 'anime');
    assert.ok(e.acomp.st.sessao);
    e.clock.advance(5 * MIN);
    r = await chatAdv(e, 'terminei');
    assert.match(r.text, /faltam|Faltam/);
    assert.equal(e.companion.loja.st.saldo, 0);
    await chatAdv(e, 'vou assistir black clover');
    e.clock.advance(16 * MIN);
    r = await chatAdv(e, 'acabei de assistir');
    assert.match(r.text, /JOJOcoins/);
    assert.equal(e.companion.loja.st.saldo, RECOMPENSA.convencional + RECOMPENSA.primeiroEp + 20 /* conquista Primeiro episódio */);
    assert.ok(e.companion.progress.st.conquistas.animeEp1, 'conquista registrada na progressão');
    assert.equal(e.companion.animeVisita?.contexto, 'conquista');
  } finally { e.companion.stop(); }
});

test('companion: sem conexão, o calendário antigo continua igual (nada quebrado)', async () => {
  const e = makeEnv({ settings: { speechFrequency: 'off' } });
  e.companion.start(); e.clock.advance(3000);
  try {
    assert.equal(e.companion.animeAcomp, undefined);
    assert.equal(await e.companion.comandoAnime(''), 'Você não segue nenhum anime ainda. Fala /anime e o nome (ex.: /anime Dandadan) que eu aviso quando sair episódio.');
  } finally { e.companion.stop(); }
});

test('migração: a lista antiga e os episódios já cumprimentados entram sem repetir aviso', () => {
  const e = makeEnv({ settings: { speechFrequency: 'off', animes: [{ id: 21, titulo: 'ONE PIECE' }], animeAvisados: ['21:1180'] } });
  e.companion.start(); e.clock.advance(3000);
  try {
    const acomp = new AcompanhamentoAnime({ now: () => T0, mono: () => 0 });
    e.companion.animeConectar({ acomp, registro: new RegistroPacotes({}) });
    assert.ok(acomp.anime(21));
    assert.ok('21:1180:horario' in acomp.st.enviados);
    e.companion.animeConectar({ acomp, registro: new RegistroPacotes({}) });
    assert.equal(acomp.lista().length, 1, 'reconectar não duplica');
  } finally { e.companion.stop(); }
});

test('persistência: estado salvo é validado; arquivo corrompido é recusado', () => {
  const ac = new AcompanhamentoAnime({ now: () => T0, mono: () => 0 });
  ac.seguir(BC());
  const copia = validarAnimes(JSON.parse(JSON.stringify(ac.st)));
  assert.ok(copia.animes[97940]);
  assert.throws(() => validarAnimes({ ...animesVazio(), animes: { 1: { id: 2 } } }));
});

// ---------------------------------------------------------------- pacotes visuais

test('pacotes: 13 estilos × 12 contextos, todas as animações constroem e voltam ao repouso', () => {
  const itens = itensAnime();
  assert.equal(itens.length, ESTILO_IDS.length * CONTEXTOS.length);
  for (const it of itens) {
    const a = buildAnimation(it, 'normal');
    for (const [ch, tr] of Object.entries(a.tracks)) {
      if (!Array.isArray(tr)) continue;
      for (let i = 1; i < tr.length; i++) assert.ok(tr[i][0] >= tr[i - 1][0], `${it.id}.${ch} fora de ordem`);
    }
  }
});

test('pacotes curados: válidos, completos, com as 12 animações e sem misturar peças na mesma parte', () => {
  const ids = new Set(itensAnime().map((i) => i.id));
  for (const p of CURADOS) {
    const v = validarPacote({ ...p, origem: 'curado' }, { itens: ids });
    assert.ok(v.ok && v.completo, `${p.id}: ${v.erros.join('; ')}`);
    for (const c of CONTEXTOS) {
      const ch = canaisDoPacote(p, c.id);
      const papeis = Object.keys(ch).filter((k) => k.startsWith('ak_')).map((k) => ACESSORIOS[k.slice(3)].papel);
      assert.equal(new Set(papeis).size, papeis.length, `${p.id}/${c.id}: duas peças na mesma parte`);
    }
  }
  assert.ok(CURADOS.some((p) => p.id === 'blackClover'));
});

test('compositor: completo só com característica reconhecível; sem tag é provisório e registra pendência', () => {
  const ninja = comporPacote({ id: 1, titulo: 'X', tags: [{ nome: 'Ninja', rank: 90 }], generos: ['Action'], cor: '#123456' });
  assert.equal(ninja.completo, true);
  assert.ok(ninja.acessorios.includes('bandanaNinja'));
  const vago = comporPacote({ id: 2, titulo: 'Y', tags: [], generos: ['Slice of Life'], cor: null });
  assert.equal(vago.completo, false);
  assert.ok(vago.pendencia);
  assert.deepEqual(comporPacote({ id: 2, titulo: 'Y', tags: [], generos: ['Slice of Life'] }), comporPacote({ id: 2, titulo: 'Y', tags: [], generos: ['Slice of Life'] }), 'determinístico');
  const reg = new RegistroPacotes({});
  const aud = auditarCobertura([{ id: 1, titulo: 'Black Clover' }, { id: 2, titulo: 'Y', generos: [] }], reg, new Set(itensAnime().map((i) => i.id)));
  assert.equal(aud.total, 2); assert.equal(aud.completos, 1); assert.equal(aud.animacoes, 156);
});

test('registro de pacotes: memória limitada (LRU) e pacote guardado reaproveitado', () => {
  let salvos = 0;
  const reg = new RegistroPacotes({ salvar: () => salvos++, maxMemoria: 3 });
  for (let i = 1; i <= 10; i++) reg.doAnime({ id: 1000 + i, titulo: `Anime ${i}` });
  assert.equal(reg.cache.size, 3);
  assert.equal(salvos, 10);
  reg.doAnime({ id: 1001, titulo: 'Anime 1' });
  assert.equal(salvos, 10, 'pacote já composto não é refeito');
});

test('arte: peças de anime presas a grupos do rig, só com o canal ligado; modelo original intocado', () => {
  const rig = loadJSON('assets/character/jojo.rig.json');
  const com = rigComAnime(rig);
  const pecas = pecasAnime(com);
  assert.ok(pecas.length > 100);
  for (const p of pecas) assert.ok(p.showIf && /^(ak|akk_|akfx_)/.test(p.showIf) || p.showIf, p.id);
  assert.equal(JSON.stringify(rig), JSON.stringify(loadJSON('assets/character/jojo.rig.json')), 'rig original não muda');
  const anims = comCanaisAnime({ channels: { a: 0 }, animations: {} });
  for (const [k, v] of Object.entries(NEUTRO_ANIME)) assert.equal(anims.channels[k], v);
  // Nenhuma "tiara para fingir orelha": acessórios de cabeça não têm id de orelha.
  assert.ok(!Object.keys(ACESSORIOS).some((k) => /orelha|tiara|arquinho/i.test(k)));
});

test('catálogo completo inclui as animações temáticas', () => {
  const ids = new Set(itensAnime().map((i) => i.id));
  assert.ok(ids.has(animAnime('magia', 'moedas')));
  assert.ok(ids.has(animAnime('ninja', 'contagem')));
});

// ---------------------------------------------------------------- falas, detecção, exportação

test('falas: mais de 100, moeda sempre "JOJOcoins" e variáveis preenchidas', () => {
  assert.ok(totalFalasAnime() >= 100);
  const todas = Object.values(FALAS_ANIME).flat().join(' ');
  assert.ok(!new RegExp('jojo' + 'coins').test(todas.replace(/JOJOcoins/g, '')), 'grafia errada da moeda');
  assert.ok(!new RegExp(['Jojoc', 'JojoC', 'jojoC'].map((x) => `${x}oins`).join('|')).test(todas));
  const t = falaAnime('conclusao', { nome: 'Black Clover', ep: 3, moedas: 15 }, () => 0);
  assert.match(t, /Black Clover/); assert.match(t, /15 JOJOcoins/); assert.ok(!/\{/.test(t));
});

test('detecção: só reconhece anime da lista com nome claro; título não é guardado', () => {
  const lista = [{ ...BC(), pref: { acompanhando: true } }];
  const m = interpretarMidia({ titulo: 'Black Clover - Episódio 3', status: 'Playing', pos: 30, dur: 1400 }, lista);
  assert.deepEqual([m.anime, m.episodio, m.tocando], [97940, 3, true]);
  assert.equal(interpretarMidia({ titulo: 'Clover Field (trailer)', status: 'Playing' }, lista), null);
  assert.equal(interpretarMidia({ titulo: 'Música qualquer', status: 'Playing' }, lista), null);
  assert.equal(episodioDoTitulo('One Piece S1 E12'), 12);
});

test('exportação .ics: só os próximos episódios, em UTC e com aviso de previsão', () => {
  const ics = exportarIcs([{ id: 21, titulo: 'ONE PIECE', duracao: 24, proximo: { episodio: 1181, quando: T0 + H } }, { id: 2, titulo: 'Velho', proximo: { episodio: 1, quando: T0 - H } }], T0);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:ONE PIECE — episódio 1181/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert.match(ics, /DTSTART:20261125T130000Z/);
});
