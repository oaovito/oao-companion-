// Um único contrato para o cérebro local, o transporte e os ensaios Windows.
export const LOCAL_MODEL = 'gemma3:4b-it-q4_K_M';
export const LOCAL_MODEL_ALIAS = 'gemma3:4b';
export const LOCAL_MODEL_LABEL = 'Gemma 3 4B';
export const LOCAL_CONTEXT = 2048;
export const LOCAL_KEEP_ALIVE = '5m';
// Antecipar o vencimento do keep-alive evita anunciar pronto um modelo já descarregado.
export const LOCAL_READY_MS = 4 * 60e3;
