// Guarda-roupa: a Emanuele veste o JoJo como quiser (brincar de boneca), peça
// por peça, se quiser. Uma peça por parte do corpo; a escolha fica salva e vale
// mais que a fantasia da data festiva. Puro: só o catálogo e as regras.

export const WARDROBE_SLOTS = [
  { id: 'cabeca', nome: 'Cabeça' },
  { id: 'rosto', nome: 'Rosto' },
  { id: 'pescoco', nome: 'Pescoço' },
  { id: 'corpo', nome: 'Corpo' },
  { id: 'mao', nome: 'Na nadadeira' },
  { id: 'bermuda', nome: 'Bermuda' },
];

// canal: canal de pose que liga a peça no desenho (costume_*, prop_*, sexy).
export const WARDROBE_ITEMS = [
  { id: 'gorroNatal', slot: 'cabeca', nome: 'Gorro de Papai Noel', canal: 'costume_natal' },
  { id: 'chapeuFesta', slot: 'cabeca', nome: 'Chapéu de festa', canal: 'costume_anoNovo' },
  { id: 'orelhasCoelho', slot: 'cabeca', nome: 'Orelhas de coelho', canal: 'costume_pascoa' },
  { id: 'cocar', slot: 'cabeca', nome: 'Cocar de plumas', canal: 'costume_carnaval' },
  { id: 'chapeuPalha', slot: 'cabeca', nome: 'Chapéu de palha', canal: 'costume_festaJunina' },
  { id: 'boneHelice', slot: 'cabeca', nome: 'Boné de hélice', canal: 'costume_criancas' },
  { id: 'coroa', slot: 'cabeca', nome: 'Coroa', canal: 'costume_coroa' },
  { id: 'tiaraCoracoes', slot: 'cabeca', nome: 'Tiara de corações', canal: 'costume_coracoes' },
  { id: 'cartolaVerde', slot: 'cabeca', nome: 'Cartola verde', canal: 'costume_chapeuVerde' },
  { id: 'coroaFolhas', slot: 'cabeca', nome: 'Coroa de folhas', canal: 'costume_folhas' },
  { id: 'coroaFlores', slot: 'cabeca', nome: 'Coroa de flores', canal: 'costume_calendulas' },
  { id: 'capacete', slot: 'cabeca', nome: 'Capacete de obra', canal: 'costume_capacete' },
  { id: 'chapeuPeregrino', slot: 'cabeca', nome: 'Chapéu de peregrino', canal: 'costume_peregrino' },
  { id: 'oculos', slot: 'rosto', nome: 'Óculos escuros', canal: 'prop_oculos' },
  { id: 'palito', slot: 'rosto', nome: 'Palito na boca', canal: 'prop_palito' },
  { id: 'gravata', slot: 'pescoco', nome: 'Gravata', canal: 'costume_gravata' },
  { id: 'cachecol', slot: 'pescoco', nome: 'Cachecol', canal: 'costume_cachecol' },
  { id: 'medalha', slot: 'pescoco', nome: 'Medalha de ouro', canal: 'prop_medalha' },
  { id: 'capa', slot: 'corpo', nome: 'Capa de vampiro', canal: 'costume_halloween' },
  { id: 'tinta', slot: 'corpo', nome: 'Pintura colorida', canal: 'costume_tinta' },
  { id: 'arrastao', slot: 'corpo', nome: 'Meia arrastão', canal: 'sexy' },
  { id: 'flor', slot: 'mao', nome: 'Flor', canal: 'costume_flor' },
  { id: 'maca', slot: 'mao', nome: 'Maçã', canal: 'costume_maca' },
  { id: 'lanterna', slot: 'mao', nome: 'Lanterna chinesa', canal: 'costume_lanternaChinesa' },
  { id: 'fanous', slot: 'mao', nome: 'Lanterna fanous', canal: 'costume_fanous' },
  { id: 'diya', slot: 'mao', nome: 'Lamparina', canal: 'costume_diya' },
  { id: 'lotus', slot: 'mao', nome: 'Flor de lótus', canal: 'costume_lotus' },
  { id: 'arcoIris', slot: 'mao', nome: 'Bandeira arco-íris', canal: 'costume_arcoIris' },
  { id: 'bandeira', slot: 'mao', nome: 'Kit torcedor', canal: 'costume_patriota' },
  { id: 'cafe', slot: 'mao', nome: 'Caneca de café', canal: 'prop_cafe' },
  { id: 'microfone', slot: 'mao', nome: 'Microfone', canal: 'prop_microfone' },
  { id: 'espelho', slot: 'mao', nome: 'Espelho', canal: 'prop_espelho' },
  { id: 'patinho', slot: 'mao', nome: 'Peixe de borracha', canal: 'prop_peixeBorracha' },
  { id: 'halter', slot: 'mao', nome: 'Halter', canal: 'prop_halter' },
  { id: 'livro', slot: 'mao', nome: 'Livro', canal: 'prop_livro' },
  { id: 'celular', slot: 'mao', nome: 'Celular', canal: 'prop_celular' },
  { id: 'trofeu', slot: 'mao', nome: 'Troféu', canal: 'prop_trofeu' },
  { id: 'frango', slot: 'mao', nome: 'Coxa de frango', canal: 'prop_frango' },
  { id: 'toalha', slot: 'mao', nome: 'Toalha', canal: 'prop_toalha' },
  // Bermuda: só troca a cor (paleta `bermuda_*` em rig.costumes).
  { id: 'bermudaBranca', slot: 'bermuda', nome: 'Branca', canal: 'costume_bermudaBranca', cor: '#f2f2ec' },
  { id: 'bermudaVermelha', slot: 'bermuda', nome: 'Vermelha', canal: 'costume_bermudaVermelha', cor: '#c62828' },
  { id: 'bermudaRosa', slot: 'bermuda', nome: 'Rosa', canal: 'costume_bermudaRosa', cor: '#ff5c9a' },
  { id: 'bermudaAzul', slot: 'bermuda', nome: 'Azul', canal: 'costume_bermudaAzul', cor: '#2f5fa8' },
  { id: 'bermudaVerde', slot: 'bermuda', nome: 'Verde', canal: 'costume_bermudaVerde', cor: '#1b8a3c' },
  { id: 'bermudaDourada', slot: 'bermuda', nome: 'Dourada', canal: 'costume_bermudaDourada', cor: '#d4a72c' },
  { id: 'bermudaLaranja', slot: 'bermuda', nome: 'Laranja', canal: 'costume_bermudaLaranja', cor: '#fb8c00' },
  // Sem bermuda: pelado com tudo à mostra (canal `nuJojo` no rig, modelo da Tigresa, sempre em repouso).
  { id: 'semBermuda', slot: 'bermuda', nome: 'Sem bermuda (pelado)', canal: 'nuJojo', semRoupa: true },
];

/** "Tirar tudo": nenhuma peça e sem bermuda. */
export const PELADO = Object.freeze({ bermuda: 'semBermuda' });

const BY_ID = new Map(WARDROBE_ITEMS.map((it) => [it.id, it]));
const SLOT_IDS = new Set(WARDROBE_SLOTS.map((s) => s.id));

export function wardrobeItem(id) {
  return BY_ID.get(id) || null;
}

/** Roupa salva válida: {slot: itemId}, uma peça por parte, só peças conhecidas. */
export function sanitizeOutfit(v) {
  const out = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const [slot, id] of Object.entries(v)) {
    const it = BY_ID.get(id);
    if (SLOT_IDS.has(slot) && it && it.slot === slot) out[slot] = id;
  }
  return out;
}

/** Veste uma peça (troca a que estava na mesma parte); a mesma peça de novo tira. */
export function wear(outfit, id) {
  const it = BY_ID.get(id);
  if (!it) return { outfit: sanitizeOutfit(outfit), item: null, removed: false };
  const o = sanitizeOutfit(outfit);
  if (o[it.slot] === id) {
    delete o[it.slot];
    return { outfit: o, item: it, removed: true };
  }
  o[it.slot] = id;
  return { outfit: o, item: it, removed: false };
}

/** JoJo pelado (sem bermuda): nada de visual automático por cima. */
export function estaPelado(outfit) {
  return sanitizeOutfit(outfit).bermuda === 'semBermuda';
}

/** Tira uma parte ou tudo (tudo = pelado, sem bermuda). */
export function undress(outfit, slot = null) {
  if (!slot) return { ...PELADO };
  const o = sanitizeOutfit(outfit);
  delete o[slot];
  return o;
}

/** Look surpresa: algumas partes sorteadas. */
export function randomOutfit(rng = Math.random) {
  const o = {};
  for (const s of WARDROBE_SLOTS) {
    if (rng() < 0.4) continue;
    const opts = WARDROBE_ITEMS.filter((it) => it.slot === s.id && !it.semRoupa);
    o[s.id] = opts[Math.floor(rng() * opts.length) % opts.length].id;
  }
  if (!Object.keys(o).length) o.cabeca = 'coroa';
  return o;
}

/** Canais de pose ligados pela roupa ({costume_natal: 1, prop_oculos: 1…}). */
export function outfitChannels(outfit, { semMao = false } = {}) {
  const ch = {};
  for (const [slot, id] of Object.entries(sanitizeOutfit(outfit))) {
    if (semMao && slot === 'mao') continue;
    ch[BY_ID.get(id).canal] = 1;
  }
  return ch;
}

/** Acha uma peça pelo nome ou id ("coroa", "óculos escuros", "bermuda rosa"). */
export function findWardrobeItem(q) {
  const n = norm(q);
  if (!n) return null;
  return WARDROBE_ITEMS.find((it) => norm(it.id) === n)
    || WARDROBE_ITEMS.find((it) => norm(it.nome) === n || (it.slot === 'bermuda' && `bermuda ${norm(it.nome)}` === n))
    || WARDROBE_ITEMS.find((it) => norm(it.nome).includes(n) || (n.length >= 4 && n.includes(norm(it.nome))))
    || null;
}

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/** Resumo para a Central: partes, peças e o que está vestido. */
export function wardrobeSnapshot(outfit) {
  const o = sanitizeOutfit(outfit);
  return {
    vestido: o,
    partes: WARDROBE_SLOTS.map((s) => ({ ...s, itens: WARDROBE_ITEMS.filter((it) => it.slot === s.id).map(({ id, nome, cor }) => ({ id, nome, cor: cor || null })) })),
  };
}

// O JoJo comenta cada peça (vaidoso, mandão, sem pudor; nunca sobre o corpo dela).
export const WEAR_LINES = {
  cabeca: ['Ficou bom. Em mim tudo fica bom.', 'Isso aqui realça minha mandíbula.', 'Coloca uma foto disso no seu fundo de tela.'],
  rosto: ['Agora sim, misterioso e perigoso.', 'Estilo. Coisa que sardinha não tem.'],
  pescoco: ['Elegante. Um tubarão de respeito.', 'Pescoço de touro merece acessório.'],
  corpo: ['Ousado. Combina comigo.', 'Eu ficaria bonito até de saco de lixo, mas isso ajuda.'],
  mao: ['Segurando isso com o bíceps, óbvio.', 'Tá, eu seguro. Mas é pelo shape.'],
  bermuda: ['Cor nova, mesmo glúteo de aço.', 'Bermuda nova. As pernas continuam lendárias.'],
  tira: ['Tirou? Tá bom. Ao natural também é obra de arte.', 'Pelado de acessório. Do jeito que a natureza caprichou.'],
  surpresa: ['Você me vestiu no escuro? Ficou ótimo, mesmo assim.', 'Look aleatório. Ainda assim, um ícone.'],
};
