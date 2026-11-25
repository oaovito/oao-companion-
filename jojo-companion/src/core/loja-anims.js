// Animações da loja de JOJOcoins: 15 com objetos interativos (ob01–ob15),
// 15 animações especiais (la01–la15) e as cenas das atividades e dos lendários.
// Itens do catálogo com `loja: <id do item>`: só tocam se o item foi comprado
// (companion.playCatalog e VarietyEngine conferem). Receitas em camadas como as
// demais, com faixas próprias para o objeto (canais ljo*) e o braço que o segura.

const L = (pts) => pts.map(([t, v, e]) => (e ? [t, v, e] : [t, v]));
// Alterna a e b n vezes entre `de` e `ate`, repousando em `r` nas pontas.
function vai(a, b, n, r = 0, de = 0.1, ate = 0.9) {
  const k = [[0, r]];
  for (let i = 0; i <= n; i++) k.push([de + ((ate - de) * i) / n, i % 2 ? b : a]);
  k.push([1, r]);
  return k;
}
const segura = (v, r = 0) => [[0, r], [0.1, v], [0.9, v], [1, r]];
// Braço direito perto do repouso (a arte dos objetos foi desenhada na mão em repouso).
const MAO_REPOUSO = { legFR: segura(8, 6), elbowR: segura(14, 12) };

/** Objetos interativos: receita + faixas do objeto. */
const OBJ = [
  { id: 'ob01', nome: 'Ioiô', dur: 4200, receita: { corpo: 'respira', cabeca: 'olhaBaixo', rosto: 'focado' },
    faixas: { ...MAO_REPOUSO, ljoIoioY: vai(0, 26, 6), ljoIoioK: vai(1, 1.8, 6, 1), ljoGiro: L([[0, 0], [1, 1440]]) } },
  { id: 'ob02', nome: 'Cubo mágico', dur: 4600, receita: { corpo: 'respira', cabeca: 'olhaBaixo', rosto: 'pensando', fx: ['brilho'] },
    faixas: { ...MAO_REPOUSO, ljoGiro: L([[0, 0], [0.2, 90, 'step'], [0.35, 180, 'step'], [0.5, 270, 'step'], [0.65, 360, 'step'], [0.8, 450, 'step'], [1, 450]]) } },
  { id: 'ob03', nome: 'Basquete', dur: 4200, receita: { corpo: 'pulinho', cabeca: 'olhaBaixo', rosto: 'focado', repeticoes: 4 },
    faixas: { legFR: segura(20, 6), elbowR: vai(20, -10, 8, 12), ljoQuica: vai(0, -22, 8) } },
  { id: 'ob04', nome: 'Guitarra', dur: 5200, receita: { corpo: 'balanca', cabeca: 'assente', rosto: 'canta', fx: ['notas'] },
    faixas: { ...MAO_REPOUSO, legFL: segura(40, 6), elbowL: vai(60, 90, 10, 12) } },
  { id: 'ob05', nome: 'Kettlebell', dur: 4800, receita: { corpo: 'agacha', rosto: 'focado', fx: ['suor'], repeticoes: 3 },
    faixas: { legFR: vai(6, 80, 6, 6), elbowR: segura(14, 12) } },
  { id: 'ob06', nome: 'Corda', dur: 4600, receita: { corpo: 'pulinho', rosto: 'focado', repeticoes: 6, fx: ['suor'] },
    faixas: { ljoCorda: vai(1, -1, 12, 1), legFL: segura(20, 6), legFR: segura(20, 6), elbowL: vai(10, 30, 12, 12), elbowR: vai(10, 30, 12, 12) } },
  { id: 'ob07', nome: 'Videogame', dur: 5000, receita: { corpo: 'respira', cabeca: 'olhaBaixo', rosto: 'focado' },
    faixas: { ...MAO_REPOUSO, ljoPixel: vai(0, 8, 10), moodJoy: L([[0, 0], [0.8, 0], [0.88, 1], [1, 0]]) } },
  { id: 'ob08', nome: 'Pipa', dur: 6000, receita: { corpo: 'balanca', cabeca: 'olhaCima', rosto: 'feliz', fx: ['vento'] },
    faixas: { ...MAO_REPOUSO, ljoPipaK: L([[0, 0.2], [0.25, 1], [0.85, 1], [1, 0.2]]), ljoBalanco: vai(-12, 12, 8) } },
  { id: 'ob09', nome: 'Bambolê', dur: 4800, receita: { corpo: 'balanca', rosto: 'feliz', repeticoes: 10 },
    faixas: { ljoBamboleY: vai(-3, 3, 10), ljoBamboleX: vai(1, 0.92, 10, 1), legFL: segura(60, 6), legFR: segura(60, 6), elbowL: segura(100, 12), elbowR: segura(100, 12) } },
  { id: 'ob10', nome: 'Lupa', dur: 4600, receita: { corpo: 'inclina', cabeca: 'olhaRedor', rosto: 'pensando' },
    faixas: { legFR: vai(6, 30, 4, 6), elbowR: segura(14, 12) } },
  { id: 'ob11', nome: 'Bolhas', dur: 5200, receita: { corpo: 'respira', cabeca: 'olhaCima', rosto: 'assobia', fx: ['bolhas'] },
    faixas: { ...MAO_REPOUSO, ljoBolhaY: L([[0, 0], [0.2, 0], [0.8, -60], [0.81, 0, 'step'], [1, 0]]), ljoBolhaX: L([[0, 0], [0.2, 0], [0.5, 8], [0.8, -6], [1, 0]]) } },
  { id: 'ob12', nome: 'Tambor', dur: 4800, receita: { corpo: 'balanca', cabeca: 'assente', rosto: 'focado', fx: ['notas'] },
    faixas: { ...MAO_REPOUSO, ljoBate: vai(0, 28, 12) } },
  { id: 'ob13', nome: 'Prancheta', dur: 4800, receita: { corpo: 'respira', cabeca: 'olhaBaixo', rosto: 'pensando', bracos: 'escreve' },
    faixas: { legFR: segura(8, 6), elbowR: segura(14, 12) } },
  { id: 'ob14', nome: 'Leque', dur: 4200, receita: { corpo: 'respira', rosto: 'cansado', fx: ['suor'] },
    faixas: { ...MAO_REPOUSO, ljoAbana: vai(-18, 18, 12) } },
  { id: 'ob15', nome: 'Anilha', dur: 5200, receita: { corpo: 'respira', rosto: 'focado', fx: ['suor'] },
    faixas: { legFR: L([[0, 6], [0.1, 8], [0.55, 8], [0.7, 120], [0.85, 120], [1, 6]]), elbowR: L([[0, 12], [0.1, 14], [0.55, 14], [0.7, 30], [0.85, 30], [1, 12]]), ljoGiro: L([[0, 0], [0.1, -40], [0.25, 40], [0.4, -40], [0.55, 0], [1, 0]]) } },
];

/** Animações especiais (só o corpo do JoJo, receitas e faixas). */
const ESP = [
  { id: 'la01', nome: 'Moonwalk', dur: 4400, receita: { cabeca: 'reto', rosto: 'sobrancelha' }, faixas: { rootX: L([[0, 0], [0.85, -46], [1, 0]]), legLiftB: vai(0, 5, 12), rootRot: vai(-2, 2, 6) } },
  { id: 'la02', nome: 'Flexão de um braço', dur: 4600, receita: { corpo: 'flexoes', rosto: 'focado', fx: ['suor'], repeticoes: 5 }, faixas: { legFL: segura(-60, 6), elbowL: segura(-100, 12) } },
  { id: 'la03', nome: 'Robô', dur: 4400, receita: { rosto: 'neutro', semPiscar: true }, faixas: { legFL: L([[0, 6], [0.2, 90, 'step'], [0.4, 90, 'step'], [0.6, 0, 'step'], [0.8, 45, 'step'], [1, 6]]), elbowL: L([[0, 12], [0.2, 90, 'step'], [0.5, 0, 'step'], [0.8, 90, 'step'], [1, 12]]), legFR: L([[0, 6], [0.3, 45, 'step'], [0.5, 90, 'step'], [0.7, 0, 'step'], [1, 6]]), elbowR: L([[0, 12], [0.3, 0, 'step'], [0.6, 90, 'step'], [0.9, 0, 'step'], [1, 12]]), headRot: L([[0, 0], [0.25, 12, 'step'], [0.5, -12, 'step'], [0.75, 0, 'step'], [1, 0]]) } },
  { id: 'la04', nome: 'Capa de revista', dur: 5200, receita: { bracos: 'flexDuplo', cabeca: 'inclina', rosto: 'sobrancelha', fx: ['brilho', 'estrelas'] } },
  { id: 'la05', nome: 'Saudação samurai', dur: 4200, receita: { bracos: 'reza', rosto: 'zen', semPiscar: true }, faixas: { pupilY: L([[0, 0], [0.3, 0], [0.45, 0.9], [0.75, 0.9], [0.9, 0], [1, 0]]), squashY: L([[0, 1], [0.3, 1], [0.45, 0.93], [0.75, 0.93], [0.9, 1], [1, 1]]), rootY: L([[0, 0], [0.45, 4], [0.75, 4], [1, 0]]) } },
  { id: 'la06', nome: 'Mortal', dur: 3200, receita: { rosto: 'focado', fx: ['poeira'] }, faixas: { rootY: L([[0, 0], [0.15, 6], [0.25, -40], [0.55, -40], [0.7, 0], [0.78, 4], [1, 0]]), rootRot: L([[0, 0], [0.25, 0], [0.6, -360], [0.61, 0, 'step'], [1, 0]]), squashY: L([[0, 1], [0.15, 0.9], [0.25, 1.05], [0.7, 1], [0.78, 0.92], [1, 1]]) } },
  { id: 'la07', nome: 'Beatbox', dur: 4400, receita: { cabeca: 'assente', rosto: 'canta', fx: ['notas'] }, faixas: { legFR: segura(60, 6), elbowR: segura(150, 12), rootY: vai(0, -2, 12) } },
  { id: 'la08', nome: 'Air guitar', dur: 4600, receita: { corpo: 'balanca', cabeca: 'assente', rosto: 'canta', fx: ['notas', 'velocidade'] }, faixas: { legFL: segura(50, 6), elbowL: segura(70, 12), legFR: segura(20, 6), elbowR: vai(30, 90, 14, 12) } },
  { id: 'la09', nome: 'Passarela', dur: 5600, receita: { corpo: 'desfile', rosto: 'sobrancelha', fx: ['brilho'] }, faixas: { squashX: L([[0, 1], [0.6, 1], [0.66, -1], [0.72, 1], [1, 1]]) } },
  { id: 'la10', nome: 'Meditação flutuante', dur: 6000, receita: { corpo: 'flutua', bracos: 'reza', rosto: 'zen', fx: ['bolhas', 'aura'], semPiscar: true } },
  { id: 'la11', nome: 'Discurso de vitória', dur: 4800, receita: { cabeca: 'olhaRedor', rosto: 'orgulhoso', fx: ['confete'] }, faixas: { legFR: L([[0, 6], [0.15, 70], [0.4, 70], [0.55, 150], [0.9, 150], [1, 6]]), elbowR: L([[0, 12], [0.15, 0], [0.4, 0], [0.55, 20], [0.9, 20], [1, 12]]), legFL: L([[0, 6], [0.55, 6], [0.6, 150], [0.9, 150], [1, 6]]), elbowL: L([[0, 12], [0.55, 12], [0.6, 20], [0.9, 20], [1, 12]]) } },
  { id: 'la12', nome: 'Pouso de herói', dur: 3800, receita: { rosto: 'fera', fx: ['poeira', 'velocidade'] }, faixas: { rootY: L([[0, -120], [0.2, 0], [0.25, 14], [0.75, 14], [1, 0]]), squatPose: L([[0, 0], [0.2, 1], [0.75, 1], [1, 0]]), legFR: L([[0, 6], [0.2, -40], [0.75, -40], [1, 6]]), elbowR: L([[0, 12], [0.2, -20], [0.75, -20], [1, 12]]), alpha: L([[0, 0], [0.05, 1], [1, 1]]) } },
  { id: 'la13', nome: 'Dab', dur: 3000, receita: { rosto: 'neutro' }, faixas: { legFR: L([[0, 6], [0.25, 130], [0.75, 130], [1, 6]]), elbowR: L([[0, 12], [0.25, 0], [0.75, 0], [1, 12]]), legFL: L([[0, 6], [0.25, 120], [0.75, 120], [1, 6]]), elbowL: L([[0, 12], [0.25, 150], [0.75, 150], [1, 12]]), headRot: L([[0, 0], [0.25, 22], [0.75, 22], [1, 0]]) } },
  { id: 'la14', nome: 'Mágica', dur: 4200, receita: { corpo: 'some', bracos: 'estala', rosto: 'piscadinha', fx: ['estrelas', 'brilho'] } },
  { id: 'la15', nome: 'Mr. Olympia', dur: 7200, receita: { rosto: 'orgulhoso', fx: ['brilho', 'suor'] }, faixas: {
    legFL: L([[0, 6], [0.08, 92], [0.3, 92], [0.36, 22], [0.62, 22], [0.68, -20], [0.9, -20], [1, 6]]), elbowL: L([[0, 12], [0.08, 125], [0.3, 125], [0.36, -55], [0.62, -55], [0.68, -60], [0.9, -60], [1, 12]]),
    legFR: L([[0, 6], [0.08, 92], [0.3, 92], [0.36, 22], [0.62, 22], [0.68, -20], [0.9, -20], [1, 6]]), elbowR: L([[0, 12], [0.08, 125], [0.3, 125], [0.36, -55], [0.62, -55], [0.68, -60], [0.9, -60], [1, 12]]),
    squashX: L([[0, 1], [0.36, 1], [0.4, 1.12], [0.62, 1.12], [0.66, 1], [1, 1]]), scale: L([[0, 1], [0.08, 1.04], [0.9, 1.04], [1, 1]]) } },
];

// JOJOcoin girando na mão: achata até a borda e volta (n meias-voltas).
const GIRO_MOEDA = (n) => L(vai(1, 0.2, n, 1, 0.15, 0.85));

/** Cenas das atividades e lendários com roteiro próprio (tocadas por companion.lojaAtividade). */
const CENAS = [
  { id: 'ljFotos', nome: 'Sessão de fotos', dur: 6000, receita: { bracos: 'flexDuplo', cabeca: 'inclina', rosto: 'sobrancelha', fx: ['brilho', 'estrelas'] } },
  { id: 'ljStandup', nome: 'Stand-up', dur: 6000, receita: { bracos: 'aponta', cabeca: 'olhaRedor', rosto: 'risada', objeto: 'microfone' } },
  { id: 'ljTreino', nome: 'Treino guiado', dur: 9000, receita: { corpo: 'agacha', bracos: 'rosca', rosto: 'focado', fx: ['suor'], repeticoes: 4 } },
  { id: 'ljDesfile', nome: 'Desfile', dur: 6500, receita: { corpo: 'desfile', rosto: 'sobrancelha', fx: ['brilho'] } },
  { id: 'ljKaraoke', nome: 'Karaokê', dur: 6500, receita: { corpo: 'balanca', bracos: 'segura', cabeca: 'assente', rosto: 'canta', objeto: 'microfone', fx: ['notas'] } },
  { id: 'ljMeditacao', nome: 'Meditação guiada', dur: 12000, loop: false, receita: { corpo: 'respira', bracos: 'reza', rosto: 'zen', fx: ['bolhas'], semPiscar: true } },
  { id: 'ljCinema', nome: 'Cinema', dur: 8000, receita: { corpo: 'respira', bracos: 'pegaComida', rosto: 'mastiga', cabeca: 'reto' } },
  { id: 'ljCiencia', nome: 'Aula de ciência', dur: 7000, receita: { bracos: 'aponta', cabeca: 'olhaLado', rosto: 'pensando', objeto: 'livro' } },
  { id: 'ljFesta', nome: 'Festa no desktop', dur: 10000, receita: { corpo: 'danca', bracos: 'maosAlto', rosto: 'feliz', fx: ['confete', 'estrelas', 'brilho'], repeticoes: 10 } },
  { id: 'ljChuva', nome: 'Chuva de JOJOcoins', dur: 8000, receita: { corpo: 'pulinho', bracos: 'maosAlto', cabeca: 'olhaCima', rosto: 'sorrisao', objeto: 'lj_moeda', fx: ['brilho'], repeticoes: 5 },
    faixas: { ljoMoedaGiro: GIRO_MOEDA(10) } },
  { id: 'ljCampeao', nome: 'Holofote de campeão', dur: 6000, receita: { bracos: 'flexDuplo', rosto: 'orgulhoso', fx: ['brilho', 'aura'] } },
  // Ganho: a JOJOcoin cai do alto, ele pega no ar, gira a moeda e comemora.
  { id: 'ljGanho', nome: 'Ganhou JOJOcoins', dur: 2400, receita: { corpo: 'pulinho', bracos: 'seguraAlto', cabeca: 'olhaCima', rosto: 'sorrisao', objeto: 'lj_moeda', fx: ['brilho'], repeticoes: 1 },
    faixas: { ljoMoedaGiro: GIRO_MOEDA(6) } },
  // Compra: o JoJo pega a JOJOcoin, gira entre os dedos e comemora.
  { id: 'ljCompra', nome: 'Compra na loja', dur: 2600, receita: { corpo: 'pulinho', bracos: 'segura', rosto: 'sorriso', objeto: 'lj_moeda', fx: ['brilho'], repeticoes: 1 },
    faixas: { ljoMoedaGiro: GIRO_MOEDA(4) } },
];

export const ROTEIROS = Object.freeze({ fotos: 'ljFotos', standup: 'ljStandup', treino: 'ljTreino', desfile: 'ljDesfile', karaoke: 'ljKaraoke', meditacao: 'ljMeditacao', cinema: 'ljCinema', ciencia: 'ljCiencia', festa: 'ljFesta', chuva: 'ljChuva', quiz: null, bolhas: null });

export const ANIMS_LOJA = Object.freeze([...OBJ.map((a) => ({ ...a, objeto: `lj_${a.id}`, item: a.id })), ...ESP.map((a) => ({ ...a, item: a.id })), ...CENAS]);

/** Itens do catálogo de animações (mesmo formato do resto; `loja` = item que libera). */
export function itensLoja() {
  return ANIMS_LOJA.map((a) => {
    const receita = { ...a.receita };
    if (a.objeto) receita.objeto = a.objeto;
    return {
      id: a.id.startsWith('lj') ? a.id : `lj_${a.id}`, nome: `Loja: ${a.nome}`, categoria: 'loja', listas: {},
      gatilho: a.item ? { ambiente: true } : {}, duracao: a.dur, loop: !!a.loop, entrada: 220, frequencia: 'raro', estatico: 0.5,
      receita, faixas: a.faixas ? structuredClone(a.faixas) : undefined, loja: a.item || null, lojaCena: !a.item,
    };
  });
}

/** Id do item de catálogo de animação de um item da loja (ob01 → lj_ob01). */
export const animDoItem = (id) => `lj_${id}`;
