// Interface dos provedores de diálogo.
//
// Um provedor recebe a mensagem do usuário e devolve uma resposta. O app só
// depende desta interface; hoje existe apenas o provedor programado (offline).
// Integrações futuras (modelo local, API de IA) devem implementar a mesma
// interface e ser opcionais — nenhuma é necessária para o funcionamento básico.
//
// Contrato:
//   id: string único
//   label: texto exibido na interface (ex.: "Respostas programadas")
//   kind: 'scripted' | 'local-model' | 'remote-api'
//   isAvailable(): Promise<boolean>
//   reply({ text, history, context }): Promise<DialogueReply>
//
// DialogueReply:
//   { text: string, kind?: 'speech'|'thought'|'sleep', action?: string|null, intent?: string }
//   action: comando opcional para o JoJo (sleep | eat | play | pet | wake | lookAround | happy | quiet | flex | scare | judge)
//   context.persona: instruções livres do perfil de personalidade (para provedores de IA futuros)

export const ALLOWED_ACTIONS = new Set(['sleep', 'eat', 'play', 'pet', 'wake', 'lookAround', 'happy', 'curious', 'sit', 'quiet', 'flex', 'scare', 'judge', 'wave', 'nod', 'comfort', 'lecture', 'angry', 'sad', 'bench', 'squat', 'moon', 'smitten', 'poop', 'dressDown', 'dressUp', 'avc']);

export class DialogueProvider {
  constructor({ id, label, kind }) {
    this.id = id;
    this.label = label;
    this.kind = kind;
  }

  async isAvailable() {
    return false;
  }

  // eslint-disable-next-line no-unused-vars
  async reply(_input) {
    throw new Error('Não implementado');
  }
}

/** Valida/normaliza respostas de qualquer provedor (inclusive futuros). */
export function normalizeReply(r) {
  const text = typeof r?.text === 'string' ? r.text.trim().slice(0, 400) : '';
  const kind = ['speech', 'thought', 'sleep'].includes(r?.kind) ? r.kind : 'speech';
  const action = ALLOWED_ACTIONS.has(r?.action) ? r.action : null;
  const tone = r?.tone === 'brincadeira' ? 'brincadeira' : 'serio';
  return { text: text || '...', kind, action, tone, intent: typeof r?.intent === 'string' ? r.intent : null };
}

/**
 * Exemplo de esqueleto para integração futura (NÃO habilitado):
 *
 *   class LocalModelProvider extends DialogueProvider {
 *     constructor(cfg) { super({ id: 'local', label: 'Modelo local', kind: 'local-model' }); this.cfg = cfg; }
 *     async isAvailable() { ...verificar endpoint local configurado pelo usuário... }
 *     async reply({ text, history }) { ...chamar o modelo local... return { text }; }
 *   }
 *
 * Regras: chaves/credenciais nunca no código; configuração explícita do usuário;
 * em caso de falha, o DialogueEngine volta ao provedor programado.
 */
