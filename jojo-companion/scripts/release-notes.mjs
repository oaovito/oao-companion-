// Gera a descrição da Release só com o que mudou desde a versão anterior,
// a partir da seção da versão atual no CHANGELOG.md. Releases antigas não são
// tocadas. Sai com erro (bloqueia a publicação) se a versão não tiver seção
// no CHANGELOG ou se a seção estiver vazia.
// Uso: node scripts/release-notes.mjs [saida.md]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Seções do CHANGELOG → seções da Release, na ordem obrigatória.
const MAPA = [
  ['Novidades', /^(adicionado|novidades?)$/i],
  ['Melhorias', /^(alterado|melhorias?|mudado)$/i],
  ['Correções', /^(corrigido|corre[cç][oõ]es)$/i],
  ['Remoções', /^(removido|remo[cç][oõ]es)$/i],
  ['Como testar', /^como testar$/i],
];

/** Seção da versão no CHANGELOG: {titulo: [linhas]} ou null. */
export function secaoDaVersao(changelog, versao) {
  const linhas = changelog.replace(/\r\n/g, '\n').split('\n');
  const ini = linhas.findIndex((l) => new RegExp(`^## ${versao.replace(/\./g, '\\.')}(\\s|$)`).test(l));
  if (ini < 0) return null;
  let fim = linhas.findIndex((l, i) => i > ini && /^## /.test(l));
  if (fim < 0) fim = linhas.length;
  const partes = {};
  let atual = null;
  for (const l of linhas.slice(ini + 1, fim)) {
    const m = l.match(/^### (.+)$/);
    if (m) {
      atual = m[1].trim();
      partes[atual] = [];
    } else if (atual) partes[atual].push(l);
  }
  return partes;
}

/** Texto da Release no formato obrigatório (omite seções vazias). */
export function notasDaRelease(changelog, versao) {
  const partes = secaoDaVersao(changelog, versao);
  if (!partes) throw new Error(`CHANGELOG sem a seção da versão ${versao}`);
  const out = [`# Jojo v${versao}`, ''];
  let algo = false;
  for (const [titulo, re] of MAPA) {
    const linhas = Object.entries(partes).filter(([k]) => re.test(k)).flatMap(([, v]) => v);
    const texto = linhas.join('\n').trim();
    if (!texto) continue;
    if (titulo !== 'Como testar') algo = true;
    out.push(`## ${titulo}`, '', texto, '');
  }
  if (!algo) throw new Error(`A seção ${versao} do CHANGELOG não lista nenhuma mudança`);
  out.push('---', '', 'Quem já tem o JoJo instalado recebe esta versão sozinho (atualização automática). Primeira vez: baixe `JoJoCompanion.exe` abaixo e abra.', '');
  return out.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const versao = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const saida = process.argv[2] || path.join(ROOT, 'dist', 'RELEASE_NOTES.md');
  try {
    const md = notasDaRelease(changelog, versao);
    fs.mkdirSync(path.dirname(saida), { recursive: true });
    fs.writeFileSync(saida, md);
    console.log(`Notas da v${versao} em ${saida}`);
  } catch (e) {
    console.error(`Publicação bloqueada: ${e.message}`);
    process.exit(1);
  }
}
