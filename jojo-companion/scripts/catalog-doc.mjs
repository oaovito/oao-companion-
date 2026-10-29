// Gera docs/ANIMACOES.md a partir de assets/catalog/animacoes.json e das falas ambientes.
// Uso: node scripts/catalog-doc.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/catalog/animacoes.json'), 'utf8'));
const lines = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/dialogue/falas-ambientes.json'), 'utf8'));
const LISTA = { base: 'Base', semPudor: 'Sem pudor', ambiente: 'Ambiente' };
const CATS = {
  base: 'Estados base', atencao: 'Atenção e processamento', positivas: 'Emoções positivas', negativas: 'Emoções negativas e suaves',
  social: 'Social e gestos', eventos: 'Reações a eventos', interacao: 'Interação direta', acoes: 'Ações e idle extras', especiais: 'Especiais',
  descarado: 'Atitude descarada', flerte: 'Flerte e charme', vaidade: 'Vaidade e fisiculturismo', preguica: 'Preguiça e descaso',
  corpo: 'Sons e corpo engraçados', drama: 'Drama exagerado', travessuras: 'Travessuras', provocacao: 'Provocação', comida: 'Comida e bagunça',
  presenca: 'Presença constante', reacoes: 'Reações do chat',
};
const EVENTOS = {
  conversaAberta: 'abrir a conversa', pensando: 'resposta demorando', pesquisando: 'pesquisa na internet', processando: 'processando', respostaPronta: 'resposta da pesquisa',
  tarefaFinalizada: '"consegui", "terminei"…', sucesso: 'atualização instalada', erro: 'erro na conversa', sequencia: 'dias seguidos usando', aniversario: 'aniversário',
  bomDia: 'abrir de manhã', boaNoite: 'abrir à noite', lembrete: 'lembretes (refeições, treino)', pausa: '90 min sem parar', trabalhoLongo: '90 min sem parar',
  foco: 'modo foco', parabens: '"parabéns"', notificacao: 'atividade nova "Precisa de você"', mensagemNova: 'mensagem nova', ausente: 'PC parado 2 min', voltou: 'volta depois de parado',
  semInteracao: '45 min sem interagir (no máximo a cada 2 h)', clique: 'clique no JoJo', duploClique: 'duplo clique', segurar: 'segurar o clique', cocegas: 'esfregar rápido',
  carinho: 'esfregar devagar', arrastar: 'arrastar', soltar: 'soltar', jogar: 'arrastar rápido e soltar', aparecer: 'ao aparecer', pet: '/pet (acordar)', oi: 'cumprimento', tchau: 'despedida',
  venceu: 'mini-jogo vencido', usuarioErrou: 'mini-jogo', nivel: 'subir de nível', alivio: '—',
};
const ms = (v) => (v ? `${(v / 1000).toFixed(1).replace('.', ',')} s` : '—');
function gatilho(it) {
  const g = it.gatilho || {};
  const out = [];
  if (g.ambiente) out.push('sorteio ambiente' + (g.horario ? ` (${g.horario.join(', ')})` : ''));
  for (const e of g.eventos || []) out.push(EVENTOS[e] || e);
  for (const f of g.frases || []) out.push(`“${f}”`);
  out.push(`/anim ${it.id}`);
  return out.join('; ');
}
let md = `# Catálogo de animações do JoJo\n\nGerado por \`scripts/catalog-doc.mjs\` a partir de \`assets/catalog/animacoes.json\` (${cat.itens.length} animações únicas, cada uma em 3 intensidades: discreta, normal e exagerada).\n\n`;
md += `## Como disparar\n\n- **Qualquer animação:** no chat, \`/anim <nome ou id>\` (ex.: \`/anim selfie\`, \`/anim modo fera\`).\n- **Por frase:** frases listadas em “Gatilho” (ex.: “faz uma dancinha”, “selfie”, “modo fera”) ou “faz/mostra <nome>”.\n- **Sozinho:** as marcadas com “sorteio ambiente” entram no motor de variedade (Configurações → Animações e estímulos).\n- **Eventos:** cliques, arrasto, conversa, lembretes, ausência etc., como indicado.\n- **Movimento reduzido:** todas viram quadro estático (o quadro do meio da animação).\n\n`;
md += `Frequência: comum (peso ${cat.frequencias.comum}), rara (${cat.frequencias.rara}), easter egg (${cat.frequencias.easter}). Para mudar a frequência de uma animação, troque \`frequencia\` no JSON; para tirar do sorteio, \`gatilho.ambiente: false\`.\n\n`;
const groups = {};
for (const it of cat.itens) (groups[it.categoria] ||= []).push(it);
for (const [c, items] of Object.entries(groups)) {
  md += `## ${CATS[c] || c}\n\n| Animação | Listas | Gatilho | Duração | Loop | Frequência |\n|---|---|---|---|---|---|\n`;
  for (const it of items) {
    const listas = Object.entries(it.listas).map(([k, v]) => `${LISTA[k]} ${v.join(', ')}`).join('; ') || '—';
    md += `| **${it.nome}** (\`${it.id}\`) | ${listas} | ${gatilho(it)} | ${ms(it.duracao)} | ${it.loop ? 'sim' : 'não'} | ${it.frequencia} |\n`;
  }
  md += '\n';
}
md += `## Itens que são do sistema\n\n- **Versão estática de cada estado** (Base 120, Sem pudor 116, Ambiente 114): redução de movimento do Windows ou “Reduzir movimento”; o renderer usa o quadro estático de toda animação.\n- **Balão de status animado** (Base 118): o balão de atividades do pet.\n\n`;
md += `## Falas ambientes\n\n${lines.falas.length} falas em \`assets/dialogue/falas-ambientes.json\` (até 80 caracteres). Cada animação aponta uma categoria em \`fala\`; o motor escolhe uma fala dessa categoria, combinando com a animação, o período do dia e a temporada da semana, sem repetir em sequência.\n\n| Categoria | Falas | Exemplo |\n|---|---|---|\n`;
const byCat = {};
for (const l of lines.falas) (byCat[l.cat] ||= []).push(l);
for (const [c, ls] of Object.entries(byCat)) md += `| ${c} | ${ls.length} | ${ls[0].t} |\n`;
md += `\nDesligadas por contradizer a regra de o JoJo ser contra dormir: ${lines.falas.filter((l) => l.freq === 'desligada').map((l) => `#${l.n} “${l.t}”`).join(', ')}.\n`;
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/ANIMACOES.md'), md);
console.log('docs/ANIMACOES.md gerado:', cat.itens.length, 'animações');
