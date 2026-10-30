// Modo cientista/médico ("Erm, ackshually"): reconhece conversa de ciência,
// nanopartículas e medicina, separa discussão acadêmica de sintoma pessoal e
// de emergência. Puro e testável. O conteúdo da resposta vem da conversa
// online (prompt técnico) ou da pesquisa; aqui só se decide o modo e o visual.

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Termos técnicos fortes (sozinhos já indicam o assunto).
const FORTES = /\b(potencial zeta|zeta potential|dls|dynamic light scattering|nta|nanoparticle tracking|nanopart\w*|nanoci\w*|nanotecnolog\w*|nanomedic\w*|nanocarread\w*|polidispers\w*|pdi|diametro hidrodinamico|estabilidade coloidal|nanobrook|lightscattering|mne ?lab|anova|p-?valor|intervalo de confianca|desvio padrao|regressao linear|metanalise|meta-analise|revisao sistematica|ensaio clinico|duplo-?cego|fisiopatolog\w*|farmacocinet\w*|farmacodinam\w*|mecanismo de acao|diagnostico diferencial|hemograma|leucocit\w*|hemoglobina|creatinina|plaquetas|glicemia|colesterol ldl|tsh|histolog\w*|imunolog\w*|endocrin\w*|biodistribui\w*|citotoxic\w*|biocompatib\w*|espectroscop\w*|microscopia eletronica|mitocondri\w*|enzima\w*|anticorpo\w*|receptor\w* de)\b/;
// Termos médios: precisam de pergunta/explicação junto.
const MEDIOS = /\b(medicament\w*|remedio\w*|farmaco\w*|doenca\w*|sindrome\w*|diagnostic\w*|tratament\w*|exame\w*|celula\w*|proteina\w*|dna|rna|gene\w*|quimic\w*|fisic\w*|biolog\w*|estatistic\w*|experimento\w*|hipotese\w*|artigo cientifico|evidencia\w*|diretriz\w*|infec\w*|virus|bacteria\w*|hormoni\w*|neuron\w*|cancer|tumor\w*)\b/;
const PERGUNTA = /\b(o que e|o que sao|como funciona|como interpretar|por que|porque|qual a diferenca|explica|explique|me explica|significa|esta correta|esta certo|mecanismo|como (se )?calcula)\b|\?/;

// Emergência: segurança antes de tudo (sem óculos, sem piada).
const EMERGENCIA = /\b(dor no peito (forte|que nao passa)|aperto no peito|falta de ar (forte|muito)|nao consigo respirar|desmaiou|desmaiei|convuls\w*|overdose|tomei (muitos|varios) (remedios|comprimidos)|sangramento (forte|que nao para)|engoli (veneno|produto)|reacao alergica forte|garganta fechando|labios inchados)\b/;
// Sintoma pessoal: sério e cuidadoso (sem sarcasmo).
const PESSOAL = /\b(estou com|to com|tou com|tenho sentido|sinto|senti|meu exame|minha pressao|minha glicemia|estou tomando|to tomando|posso tomar|devo tomar|quanto (eu )?tomo|minha dor|doendo|esta doendo|ta doendo|febre|vomit\w*|diarreia|sangr\w*)\b/;

/** 'emergencia' | 'pessoal' | 'academico' | null */
export function modoCiencia(text) {
  const n = norm(text);
  if (!n) return null;
  if (EMERGENCIA.test(n)) return 'emergencia';
  const tecnico = FORTES.test(n) || (MEDIOS.test(n) && PERGUNTA.test(n));
  if (!tecnico && !PESSOAL.test(n)) return null;
  if (PESSOAL.test(n) && (tecnico || MEDIOS.test(n) || /\b(dor|febre|exame|remedio|pressao|glicemia|posso tomar|devo tomar|quanto (eu )?tomo|estou tomando|to tomando)\b/.test(n))) return 'pessoal';
  return tecnico ? 'academico' : null;
}

export const RESPOSTA_EMERGENCIA = 'Emanuele, isso pode ser emergência. Liga agora pro SAMU no 192 (ou vai ao pronto-socorro). Não espera passar sozinho.';

// Aberturas e fechos do modo "Erm, ackshually" (só em assunto acadêmico).
export const ABERTURAS = ['Erm, na verdade...', 'Erm, tecnicamente...', 'Finalmente uma pergunta que exige neurônios.', 'Vamos separar fato de achismo.'];
export const FECHOS = ['A ciência venceu novamente.', 'Precisão continua sendo uma virtude.', 'Pronto. Agora é cientificamente defensável.'];
