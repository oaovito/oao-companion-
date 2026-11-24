// Localização real e clima (0.47.6): fontes com autorização, intervalo, fallback por rede
// marcado como aproximado, só a última localização, fuso, clima com cache e reações
// opcionais que respeitam Trabalho/foco/tela cheia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, loadJSON, chatAdv } from './helpers.js';
import {
  GerenciadorLocalizacao, LocErro, normalizarLoc, nivelDePrecisao, mudancas, fusoParaOApp, nomeDoLugar,
  lerSaidaWindows, lerRespostaRede, lerRespostaNome, INTERVALOS_LOC, CASAS_LOC,
} from '../../src/core/localizacao.js';
import { condicaoDoClima, deveReagir, registrarReacao, luzDeNoite, ANIMS_POR_CONDICAO, FALAS_CLIMA, MAX_POR_DIA } from '../../src/core/clima-ambiente.js';
import { ANIMS_CLIMA, itensClima, rigComClima, climaDaAnim } from '../../src/core/clima-anims.js';
import { WeatherService } from '../../src/core/weather.js';
import { pedidoLocalizacao } from '../../src/core/companion-clima.js';
import { expandCatalog } from '../../src/core/catalog/recipes.js';
import { fullCatalog } from '../../src/core/catalog/load.js';
import { Animator } from '../../src/renderer/shared/animator.js';
import { sanitize } from '../../src/core/settings-schema.js';

const MIN = 60e3;
const GUARAPUAVA = { lat: -25.39518, lon: -51.45812, precisaoM: 30 };

function gerenciador({ cfg = {}, windows = async () => GUARAPUAVA, rede = null, manual = null, nomear = async () => ({ cidade: 'Guarapuava', regiao: 'Paraná', pais: 'Brasil', paisCodigo: 'BR', fuso: 'America/Sao_Paulo' }), salvo = null } = {}) {
  const r = { wall: Date.UTC(2026, 10, 24, 15), mono: 0, salvos: [], chamadas: { windows: 0, rede: 0, manual: 0, nomear: 0 }, mudancas: [], cfg: { localizacaoModo: 'automatico', localizacaoIntervalo: 60, ...cfg } };
  const conta = (k, fn) => fn && (async (...a) => { r.chamadas[k]++; return fn(...a); });
  r.g = new GerenciadorLocalizacao({
    fontes: { windows: conta('windows', windows), rede: conta('rede', rede), manual: conta('manual', manual) },
    nomear: conta('nomear', nomear), getConfig: () => r.cfg, now: () => r.wall, mono: () => r.mono,
    load: () => salvo, save: (x) => r.salvos.push(x), onMudanca: (m) => r.mudancas.push(m),
  });
  r.andar = (ms) => { r.wall += ms; r.mono += ms; };
  return r;
}

test('localização: normaliza, arredonda (~1 km) e nunca chama rede/IP de exata', () => {
  const n = normalizarLoc({ ...GUARAPUAVA, fonte: 'windows', em: 1 });
  assert.deepEqual([n.lat, n.lon], [-25.4, -51.46]);
  assert.equal(CASAS_LOC, 2);
  assert.equal(n.nivel, 'exata');
  assert.equal(normalizarLoc({ lat: 0, lon: 0, fonte: 'windows' }), null, 'ilha nula não vale');
  assert.equal(normalizarLoc({ lat: 91, lon: 0, fonte: 'windows' }), null);
  assert.equal(normalizarLoc({ lat: 1, lon: 1, fonte: 'gps-falso' }), null);
  assert.equal(nivelDePrecisao(10, 'rede'), 'cidade', 'IP nunca vira exata');
  assert.equal(nivelDePrecisao(500e3, 'rede'), 'regiao');
  assert.deepEqual([nivelDePrecisao(50, 'windows'), nivelDePrecisao(800, 'windows'), nivelDePrecisao(20e3, 'windows'), nivelDePrecisao(90e3, 'windows')], ['exata', 'bairro', 'cidade', 'regiao']);
  assert.equal(nomeDoLugar({ cidade: 'Guarapuava', regiao: 'Paraná' }), 'Guarapuava, Paraná');
  assert.deepEqual(INTERVALOS_LOC, [15, 30, 60, 180, 360, 720]);
});

test('localização: desligada não consulta nada; manual usa a cidade escrita, sem o Windows', async () => {
  const r = gerenciador({ cfg: { localizacaoModo: 'desligado' } });
  assert.equal(await r.g.atualizar({ forcar: true }), null);
  assert.equal(r.g.proximaEmMs(), null, 'desligada: não agenda');
  assert.deepEqual(r.chamadas, { windows: 0, rede: 0, manual: 0, nomear: 0 });

  const m = gerenciador({ cfg: { localizacaoModo: 'manual', climaCidade: 'Guarapuava, PR' }, manual: async () => ({ lat: -25.39, lon: -51.46, cidade: 'Guarapuava', regiao: 'Paraná', fuso: 'America/Sao_Paulo' }) });
  const loc = await m.g.atualizar();
  assert.equal(loc.fonte, 'manual');
  assert.equal(loc.nivel, 'cidade');
  assert.equal(m.chamadas.windows, 0, 'manual nunca pede ao Windows');
  m.andar(2 * MIN);
  await m.g.atualizar();
  assert.equal(m.chamadas.manual, 1, 'mesma cidade: não consulta de novo');
  const vazio = gerenciador({ cfg: { localizacaoModo: 'manual', climaCidade: '' } });
  assert.equal(await vazio.g.atualizar(), null);
  assert.equal(vazio.g.erro, 'sem_cidade');
});

test('localização: automática respeita o intervalo, reusa a última e aceita atualização manual', async () => {
  const r = gerenciador();
  const a = await r.g.atualizar();
  assert.equal(a.fonte, 'windows');
  assert.equal(a.cidade, 'Guarapuava');
  assert.equal(r.chamadas.nomear, 1);
  r.andar(30 * MIN);
  await r.g.atualizar();
  assert.equal(r.chamadas.windows, 1, 'dentro do intervalo: usa a última');
  assert.equal(r.g.proximaEmMs(), 30 * MIN);
  r.cfg.localizacaoIntervalo = 15;
  assert.equal(r.g.proximaEmMs(), MIN, 'intervalo vencido: mínimo de 1 min');
  await r.g.atualizar();
  assert.equal(r.chamadas.windows, 2);
  assert.equal(r.chamadas.nomear, 1, 'não andou 3 km: não pergunta o nome de novo');
  await r.g.atualizar({ forcar: true });
  assert.equal(r.chamadas.windows, 2, 'nem a pedido: no máximo uma consulta por minuto');
  r.andar(MIN);
  await r.g.atualizar({ forcar: true });
  assert.equal(r.chamadas.windows, 3, 'a pedido, depois de 1 min, consulta');
  // Duas chamadas ao mesmo tempo: uma consulta só.
  r.andar(2 * MIN);
  await Promise.all([r.g.atualizar({ forcar: true }), r.g.atualizar({ forcar: true })]);
  assert.equal(r.chamadas.windows, 4);
});

test('localização: Windows negado cai na rede (aproximada); sem rede mantém a última sem inventar', async () => {
  let negar = true;
  const r = gerenciador({ windows: async () => { if (negar) throw new LocErro('sem_permissao'); return GUARAPUAVA; }, rede: async () => lerRespestaRedeFake() });
  const a = await r.g.atualizar();
  assert.equal(a.fonte, 'rede');
  assert.ok(a.precisaoM >= 25e3, 'raio do IP nunca menor que 25 km');
  assert.equal(r.g.resumo().aproximada, true);
  assert.equal(r.g.resumo().erroWindows, 'sem_permissao');
  assert.equal(r.chamadas.nomear, 0, 'a rede já traz a cidade');

  const s = gerenciador({ cfg: { localizacaoRede: false }, windows: async () => { throw new LocErro('sem_permissao'); } });
  assert.equal(await s.g.atualizar(), null);
  assert.equal(s.g.erro, 'sem_permissao');
  assert.equal(s.chamadas.rede, 0, 'rede desligada: não usa');

  // Tinha uma boa e o Windows falhou depois: fica a última, sem trocar por chute.
  negar = false;
  const t = gerenciador({ windows: async () => { if (negar) throw new LocErro('tempo'); return GUARAPUAVA; }, rede: null });
  const boa = await t.g.atualizar();
  negar = true;
  t.andar(61 * MIN);
  const depois = await t.g.atualizar();
  assert.deepEqual(depois, boa);
  assert.equal(t.g.erro, 'tempo');
});
const lerRespestaRedeFake = () => lerRespostaRede({ latitude: '-25.0950', longitude: '-50.1619', city: 'Ponta Grossa', region: 'Parana', country: 'Brazil', country_code: 'BR', timezone: 'America/Sao_Paulo', accuracy: 5 });

test('localização: guarda só a última (sem histórico) e avisa mudança de cidade e de fuso', async () => {
  const pontos = [GUARAPUAVA, { lat: 40.71, lon: -74.0, precisaoM: 40 }];
  const nomes = [{ cidade: 'Guarapuava', regiao: 'Paraná', paisCodigo: 'BR', fuso: 'America/Sao_Paulo' }, { cidade: 'New York', regiao: 'New York', paisCodigo: 'US', fuso: 'America/New_York' }];
  let i = 0;
  const r = gerenciador({ windows: async () => pontos[i], nomear: async () => nomes[i] });
  await r.g.atualizar();
  i = 1; r.andar(61 * MIN);
  await r.g.atualizar();
  assert.ok(r.salvos.every((x) => x && !Array.isArray(x) && !('historico' in x)), 'só um objeto por vez');
  assert.equal(r.salvos.at(-1).cidade, 'New York');
  assert.equal(r.mudancas.length, 1);
  assert.ok(r.mudancas[0].cidade && r.mudancas[0].fuso && r.mudancas[0].pais);
  r.g.esquecer();
  assert.equal(r.salvos.at(-1), null, 'esquecer apaga a última');
  assert.equal(r.g.atual(), null);
  const m = mudancas({ cidade: 'A', fuso: 'America/Sao_Paulo' }, { cidade: 'A', fuso: 'America/Sao_Paulo' });
  assert.equal(m.alguma, false);
});

test('fuso: só segue a localização confiável (Windows/manual) quando difere do Windows', () => {
  const ny = { fonte: 'windows', fuso: 'America/New_York' };
  assert.equal(fusoParaOApp(ny, {}, 'America/Sao_Paulo'), 'America/New_York');
  assert.equal(fusoParaOApp(ny, {}, 'America/New_York'), null, 'igual ao Windows: nada muda');
  assert.equal(fusoParaOApp({ ...ny, fonte: 'rede' }, {}, 'America/Sao_Paulo'), null, 'IP pode ser VPN');
  assert.equal(fusoParaOApp(ny, { localizacaoFuso: false }, 'America/Sao_Paulo'), null);
  assert.equal(fusoParaOApp(ny, { localizacaoModo: 'desligado' }, 'America/Sao_Paulo'), null);
  assert.equal(fusoParaOApp({ ...ny, fuso: 'Lua/Base' }, {}, 'America/Sao_Paulo'), null);
});

test('fontes: saída do Windows, da rede e do nome do lugar', () => {
  assert.deepEqual(lerSaidaWindows('{"status":"Ready","permission":"Granted","unknown":false,"lat":-25.39,"lon":-51.45,"acc":35}'), { lat: -25.39, lon: -51.45, precisaoM: 35 });
  assert.throws(() => lerSaidaWindows('{"status":"Disabled","permission":"Denied","unknown":true}'), (e) => e.code === 'sem_permissao');
  assert.throws(() => lerSaidaWindows('{"status":"Disabled","permission":"Unknown","unknown":true}'), (e) => e.code === 'desligada');
  assert.throws(() => lerSaidaWindows('{"status":"NoData","permission":"Granted","unknown":true}'), (e) => e.code === 'tempo');
  assert.throws(() => lerSaidaWindows('lixo'), (e) => e.code === 'indisponivel');
  const r = lerRespestaRedeFake();
  assert.equal(r.precisaoM, 25e3);
  assert.equal(r.cidade, 'Ponta Grossa');
  const n = lerRespostaNome({ city: 'Guarapuava', principalSubdivision: 'Paraná', countryName: 'Brasil', countryCode: 'BR', localityInfo: { informative: [{ name: 'America/Sao_Paulo', description: 'time zone' }] } });
  assert.deepEqual([n.cidade, n.regiao, n.fuso], ['Guarapuava', 'Paraná', 'America/Sao_Paulo']);
});

test('clima: condição atual → chuva, tempestade, neve, frio, calor e noite', () => {
  const c = (o) => condicaoDoClima({ temperature_2m: 20, apparent_temperature: 20, weather_code: 1, is_day: 1, ...o });
  assert.equal(c({ weather_code: 63 }).tipo, 'chuva');
  assert.equal(c({ weather_code: 95 }).tipo, 'tempestade');
  assert.equal(c({ weather_code: 73 }).tipo, 'neve');
  assert.equal(c({ apparent_temperature: 8 }).tipo, 'frio');
  assert.equal(c({ apparent_temperature: 33 }).tipo, 'calor');
  assert.equal(c({}).tipo, null);
  assert.equal(c({ is_day: 0 }).noite, true);
  assert.equal(c({ weather_code: 1, rain: 1.2 }).tipo, 'chuva', 'chovendo mesmo com código de nuvem');
  for (const [k, ids] of Object.entries(ANIMS_POR_CONDICAO)) {
    assert.ok(ids.length && ids.every((id) => ANIMS_CLIMA.some((a) => a.id === id)), k);
    assert.ok(FALAS_CLIMA[k]?.length, `${k}: tem fala`);
  }
  // Fala nunca traz coordenada nem endereço.
  assert.ok(Object.values(FALAS_CLIMA).flat().every(([t]) => !/\d+[.,]\d+|rua |avenida|cep/i.test(t)));
});

test('clima: reage na mudança, não repete a mesma condição por 3 h e para em 4 por dia', () => {
  const chuva = { tipo: 'chuva', noite: false };
  let mem = {};
  const t0 = Date.UTC(2026, 10, 24, 12);
  assert.equal(deveReagir(chuva, mem, { agora: t0, dia: 'd' }), 'chuva');
  mem = registrarReacao(mem, 'chuva', { agora: t0, dia: 'd' });
  assert.equal(deveReagir(chuva, mem, { agora: t0 + 60 * MIN, dia: 'd' }), null, 'mesma chuva: não repete logo');
  assert.equal(deveReagir(chuva, mem, { agora: t0 + 181 * MIN, dia: 'd' }), 'chuva');
  assert.equal(deveReagir({ tipo: null, noite: true }, mem, { agora: t0 + 60 * MIN, dia: 'd' }), 'noite');
  for (let i = 0; i < MAX_POR_DIA; i++) mem = registrarReacao(mem, `x${i}`, { agora: t0, dia: 'd' });
  assert.equal(deveReagir({ tipo: 'calor' }, mem, { agora: t0 + 300 * MIN, dia: 'd' }), null, 'teto diário');
  assert.equal(deveReagir({ tipo: 'calor' }, mem, { agora: t0 + 300 * MIN, dia: 'outro' }), 'calor');
  // Luz de noite: pelo clima válido; sem ele, pelo relógio local.
  assert.ok(luzDeNoite({ cond: { noite: true }, validoAte: t0 + 1, agora: t0 }) > 0);
  assert.equal(luzDeNoite({ cond: { noite: false }, validoAte: t0 + 1, agora: t0 }), 0);
  assert.ok(luzDeNoite({ cond: null, hora: 22 }) > 0);
  assert.equal(luzDeNoite({ cond: null, hora: 10 }), 0);
});

test('clima: consulta por coordenadas com cache de 30 min e uma consulta por vez', async () => {
  let n = 0, agora = 0, urls = [];
  const fetch = async (url) => { n++; urls.push(String(url)); return { ok: true, json: async () => ({ timezone: 'America/Sao_Paulo', current_units: { temperature_2m: '°C' }, current: { time: '2026-11-24T12:00', temperature_2m: 31, apparent_temperature: 34, weather_code: 1, is_day: 1 } }) }; };
  const w = new WeatherService({ fetch, now: () => agora });
  const [a, b] = await Promise.all([w.atual({ lat: -25.4, lon: -51.46 }), w.atual({ lat: -25.4, lon: -51.46 })]);
  assert.equal(n, 1);
  assert.equal(a.timezone, 'America/Sao_Paulo');
  assert.ok(b.current);
  agora = 29 * MIN;
  await w.atual({ lat: -25.4, lon: -51.46 });
  assert.equal(n, 1, 'cache');
  agora = 31 * MIN;
  await w.atual({ lat: -25.4, lon: -51.46 });
  assert.equal(n, 2);
  assert.ok(urls.every((u) => /latitude=-25\.40&longitude=-51\.46/.test(u)), 'só coordenada arredondada sai');
});

test('animações do clima: 12, adereços só durante e a aparência volta ao normal', () => {
  const ANIMS = expandCatalog(loadJSON('assets/animations/jojo.animations.json'), fullCatalog(loadJSON));
  const base = loadJSON('assets/character/jojo.rig.json');
  const rig = rigComClima(base);
  assert.notEqual(rig, base);
  assert.equal(rigComClima(rig), rig, 'idempotente');
  assert.ok(!base.groups.some((g) => g.id.startsWith('cl_')));
  assert.equal(ANIMS_CLIMA.length, 12);
  const room = loadJSON('assets/animations/jojo.room.json');
  for (const it of itensClima()) {
    const nome = `cat_${it.id}`;
    assert.ok(ANIMS.animations[nome], nome);
    assert.equal(climaDaAnim(nome), it.id);
    assert.ok(room.anims[nome] && room.animsVisual[nome], `${nome}: espaço medido`);
    const an = new Animator(ANIMS);
    an.play(nome, 0, { restart: true });
    let viu = false;
    for (let ms = 0; ms <= it.duracao; ms += 100) if (Object.entries(an.sample(ms).pose).some(([k, v]) => k.startsWith('cl_') && v >= 0.5)) viu = true;
    const fim = an.sample(it.duracao + 500).pose;
    const ligado = Object.entries(fim).filter(([k, v]) => k.startsWith('cl_') && v >= 0.5).map(([k]) => k);
    assert.deepEqual(ligado, [], `${nome}: adereço some no fim`);
    if (ANIMS_CLIMA.find((a) => a.id === it.id).pecas) assert.ok(viu, `${nome}: adereço aparece`);
  }
  assert.equal(climaDaAnim('cat_clique'), null);
});

test('configurações: modo, intervalo e opções saneados; padrão sem acesso ao Windows', () => {
  const d = sanitize({}).settings;
  assert.equal(d.localizacaoModo, 'manual', 'automática só com autorização');
  assert.equal(d.localizacaoIntervalo, 60);
  assert.equal(sanitize({ localizacaoIntervalo: 7 }).settings.localizacaoIntervalo, 60);
  assert.equal(sanitize({ localizacaoIntervalo: '720' }).settings.localizacaoIntervalo, 720);
  assert.equal(sanitize({ localizacaoModo: 'gps' }).settings.localizacaoModo, 'manual');
  assert.equal(sanitize({ climaReacoes: false }).settings.climaReacoes, false);
});

test('conversa: "onde eu estou?" mostra só cidade e precisão; nunca coordenadas', async () => {
  assert.equal(pedidoLocalizacao('onde eu estou?'), 'onde');
  assert.equal(pedidoLocalizacao('atualiza minha localização'), 'atualizar');
  assert.equal(pedidoLocalizacao('esquece minha localização'), 'esquecer');
  assert.equal(pedidoLocalizacao('vou estudar agora'), null);
  const e = makeEnv({ settings: { speechFrequency: 'off', localizacaoModo: 'automatico' }, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  const c = e.companion;
  c.locFontes = { windows: async () => GUARAPUAVA, nomear: async () => ({ cidade: 'Guarapuava', regiao: 'Paraná', paisCodigo: 'BR', fuso: 'America/Sao_Paulo' }) };
  c.start();
  try {
    const r = await chatAdv(e, 'atualiza minha localização');
    assert.match(r.text, /Guarapuava, Paraná/);
    assert.doesNotMatch(r.text, /-?\d+\.\d+/, 'sem coordenadas');
    e.store.update({ localizacaoModo: 'desligado' });
    c._climaConfig(['localizacaoModo']);
    const r2 = await chatAdv(e, 'onde eu estou?');
    assert.match(r2.text, /desligada/);
    assert.equal(c.localizacao.ultima, null, 'desligar esquece');
  } finally { c.stop(); }
});

test('companion: reação ao clima só fora do Trabalho/foco/tela cheia; luz de noite some no trabalho', async () => {
  const e = makeEnv({ settings: { speechFrequency: 'off', localizacaoModo: 'manual', climaCidade: 'Guarapuava, PR' }, profile: { lembreteComida: { ativo: false }, lembreteTreino: { ativo: false } } });
  const c = e.companion;
  c.locFontes = { manual: async () => ({ lat: -25.39, lon: -51.46, cidade: 'Guarapuava', regiao: 'Paraná', fuso: 'America/Sao_Paulo' }) };
  let consultas = 0;
  c.weather = { atual: async () => { consultas++; return { current: { temperature_2m: 18, apparent_temperature: 18, weather_code: 63, is_day: 0 }, timezone: 'America/Sao_Paulo' }; } };
  c.start();
  e.clock.advance(3000);
  try {
    c.startWork();
    await c._locTick({ forcar: true });
    assert.equal(consultas, 1);
    assert.ok(!/^cat_cl/.test(c.behavior.anim || ''), 'Modo Trabalho: sem reação');
    assert.equal(c._climaLuz(), 0, 'Modo Trabalho: sem luz de noite');
    c.endWork();
    e.clock.advance(5000);
    assert.ok(c._climaLuz() > 0, 'de noite: luz');
    c.climaMemoria = {};
    c.fullscreenHidden = true;
    assert.equal(c._climaReagir({ tipo: 'chuva', noite: true }), null, 'tela cheia: nada');
    c.fullscreenHidden = false;
    c.interaction = false;
    const id = c._climaReagir({ tipo: 'chuva', noite: true });
    assert.ok(['cl01', 'cl02', 'cl03'].includes(id), `reagiu à chuva (${id})`);
    e.store.update({ climaReacoes: false });
    c.climaMemoria = {};
    assert.equal(c._climaReagir({ tipo: 'calor' }), null, 'desligado nas Configurações');
  } finally { c.stop(); }
});
