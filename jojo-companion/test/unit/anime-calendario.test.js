// Calendário de anime (pedido de 18/11/2026): segue animes, avisa episódio novo e cumprimenta
// com um visual ligado ao anime. AniList simulado (nada sai para a internet nos testes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, chatAdv } from './helpers.js';
import { AnimeCalendario, episodiosNovos, visualDoAnime, sanitizeAnimes, ANILIST } from '../../src/core/anime-calendario.js';
import { sanitize, DEFAULTS } from '../../src/core/settings-schema.js';

const H = 3600e3;
function aniList({ agora, saiu = [] } = {}) {
  const chamadas = [];
  const fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    chamadas.push({ url, body });
    let data;
    if (/search/.test(body.query)) {
      const s = body.variables.s.toLowerCase();
      const lista = [
        { id: 171018, title: { romaji: 'Dandadan', english: 'DAN DA DAN' }, status: 'RELEASING', coverImage: { color: '#e4a15d' }, nextAiringEpisode: { episode: 9, airingAt: Math.floor((agora + 26 * H) / 1000) } },
        { id: 21, title: { romaji: 'ONE PIECE', english: 'ONE PIECE' }, status: 'RELEASING', coverImage: { color: '#e4a15d' }, nextAiringEpisode: { episode: 1181, airingAt: Math.floor((agora + 3 * H) / 1000) } },
        { id: 999, title: { romaji: 'Kimi ni Todoke', english: 'From Me to You' }, status: 'FINISHED', coverImage: { color: null }, nextAiringEpisode: null },
      ].filter((m) => `${m.title.romaji} ${m.title.english}`.toLowerCase().replace(/\s+/g, '').includes(s.replace(/\s+/g, '')));
      data = { Page: { media: lista } };
    } else {
      data = { ja: { airingSchedules: saiu.filter((e) => body.variables.ids.includes(e.mediaId)) }, prox: { media: [] } };
    }
    return { ok: true, status: 200, json: async () => ({ data }) };
  };
  return { fetch, chamadas };
}

test('AniList: só o nome buscado e os ids seguidos saem; sem chave nem login', async () => {
  const agora = Date.UTC(2026, 10, 18, 15);
  const { fetch, chamadas } = aniList({ agora, saiu: [{ mediaId: 21, episode: 1180, airingAt: Math.floor((agora - H) / 1000) }] });
  const cal = new AnimeCalendario({ fetch, now: () => agora });
  const [op] = await cal.buscar('one piece');
  assert.equal(op.id, 21);
  assert.equal(op.proximo.episodio, 1181);
  const ag = await cal.agenda([21]);
  assert.deepEqual(ag.saiu, [{ id: 21, episodio: 1180, quando: agora - H }]);
  assert.ok(chamadas.every((c) => c.url === ANILIST));
  assert.deepEqual(chamadas[1].body.variables.ids, [21]);
  assert.ok(chamadas.every((c) => !/authorization|token/i.test(JSON.stringify(c))));
});

test('episódios novos: um por anime, só os que já saíram, não repetidos e dos últimos 3 dias', () => {
  const agora = Date.UTC(2026, 10, 18, 15);
  const seguidos = [{ id: 21, titulo: 'ONE PIECE' }, { id: 1, titulo: 'X' }];
  const saiu = [
    { id: 21, episodio: 1179, quando: agora - 30 * H },
    { id: 21, episodio: 1180, quando: agora - H },
    { id: 1, episodio: 5, quando: agora - 5 * 24 * H },
    { id: 2, episodio: 3, quando: agora - H },
  ];
  assert.deepEqual(episodiosNovos(saiu, seguidos, [], agora).map((e) => [e.id, e.episodio]), [[21, 1180]]);
  assert.deepEqual(episodiosNovos(saiu, seguidos, ['21:1180'], agora).map((e) => [e.id, e.episodio]), [[21, 1179]]);
});

test('visual do anime: o liberado cuja obra é o anime; nada bloqueado', () => {
  const liberados = [{ id: 'nv013', nivel: 13, obra: 'One Piece', nome: 'Chapéu de palha' }, { id: 'an050', nivel: 100, obra: 'Dandadan', nome: 'X' }];
  assert.equal(visualDoAnime({ titulo: 'ONE PIECE', romaji: 'ONE PIECE' }, liberados).id, 'nv013');
  assert.equal(visualDoAnime({ titulo: 'DAN DA DAN', romaji: 'Dandadan' }, liberados.slice(0, 1)), null, 'bloqueado não entra');
  assert.equal(visualDoAnime({ titulo: 'Kimi ni Todoke' }, liberados), null);
});

test('configuração: animeAtivo ligado por padrão; lista e avisados sanitizados', () => {
  assert.equal(DEFAULTS.animeAtivo, true);
  assert.deepEqual(DEFAULTS.animes, []);
  const { settings } = sanitize({ animes: [{ id: 21, titulo: 'ONE PIECE', cor: '#e4a15d' }, { id: 'x' }, { id: 21, titulo: 'dup' }], animeAvisados: ['21:1180', 'lixo'] });
  assert.deepEqual(settings.animes.map((a) => a.id), [21]);
  assert.deepEqual(settings.animeAvisados, ['21:1180']);
  assert.equal(sanitizeAnimes(Array.from({ length: 60 }, (_, i) => ({ id: i + 1, titulo: `A${i}` }))).length, 40);
});

function started() {
  const e = makeEnv({ settings: { speechFrequency: 'off' }, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  e.companion.start();
  e.clock.advance(3000);
  return e;
}

test('companion: /anime segue, lista e para; frase "me avisa quando sair episódio de X" também', async () => {
  const e = started();
  try {
    const agora = Date.now();
    e.companion.animeApi = new AnimeCalendario(aniList({ agora }));
    let r = await chatAdv(e, '/anime one piece');
    assert.match(r.text, /Seguindo ONE PIECE\. Próximo: episódio 1181/);
    assert.deepEqual(e.store.get().animes.map((a) => a.id), [21]);
    r = await chatAdv(e, 'me avisa quando sair episódio de dandadan');
    assert.match(r.text, /Seguindo DAN DA DAN/);
    r = await chatAdv(e, '/anime');
    assert.match(r.text, /ONE PIECE: episódio 1181.*DAN DA DAN: episódio 9/);
    r = await chatAdv(e, '/anime parar dandadan');
    assert.match(r.text, /Parei de seguir/);
    assert.deepEqual(e.store.get().animes.map((a) => a.id), [21]);
    e.store.update({ animeAtivo: false });
    r = await chatAdv(e, '/anime one piece');
    assert.match(r.text, /desligado nas Configurações/);
  } finally {
    e.companion.stop();
  }
});

test('episódio novo: cumprimenta com o visual do anime (ou a faixa de otaku), uma vez, e espera o Modo Trabalho', async () => {
  const e = started();
  try {
    const agora = Date.now();
    const falas = [];
    const say = e.companion.say.bind(e.companion);
    e.companion.say = (t, ...rest) => { const ok = say(t, ...rest); if (ok) falas.push(t); return ok; };
    // Nível alto o bastante para o visual de One Piece estar liberado.
    const op = e.companion._refs.referencias.findIndex((r) => r.obra === 'One Piece') + 1;
    e.companion.progress.st.xp = e.companion.progress.threshold(op);
    e.store.update({ animes: [{ id: 21, titulo: 'ONE PIECE', romaji: 'ONE PIECE', english: 'ONE PIECE' }, { id: 999, titulo: 'Kimi ni Todoke', romaji: 'Kimi ni Todoke' }] });
    e.companion.animeApi = new AnimeCalendario(aniList({ agora, saiu: [{ mediaId: 21, episode: 1180, airingAt: Math.floor((agora - H) / 1000) }, { mediaId: 999, episode: 3, airingAt: Math.floor((agora - 2 * H) / 1000) }] }));
    e.companion.startWork();
    const novos = await e.companion.sincronizarAnime();
    assert.equal(novos.length, 2);
    assert.ok(!falas.some((t) => /Saiu o episódio/.test(t)), 'no Modo Trabalho espera');
    e.companion.endWork();
    e.clock.advance(61e3);
    const f1 = falas.find((t) => /Saiu o episódio/.test(t));
    assert.ok(f1, falas.join(' | '));
    const v = e.companion.animeVisita;
    if (/ONE PIECE/.test(f1)) assert.ok(v.visual && Object.keys(e.companion._visualCanais()).some((k) => k === `nv_${v.visual}`), 'veste o visual do anime');
    e.clock.advance(26e3);
    assert.ok(falas.filter((t) => /Saiu o episódio/.test(t)).length === 2, 'o segundo também, depois');
    assert.equal(e.companion.animeVisita.visual, null, 'anime sem visual liberado: faixa de otaku');
    assert.equal(e.companion._visualCanais().animeFa, 1);
    e.clock.advance(21e3);
    assert.equal(e.companion._visualCanais()?.animeFa, undefined, 'tira depois de 20 s');
    assert.deepEqual([...e.store.get().animeAvisados].sort(), ['21:1180', '999:3']);
    // Já avisados: não repete.
    assert.equal((await e.companion.sincronizarAnime()).length, 0);
  } finally {
    e.companion.stop();
  }
});
