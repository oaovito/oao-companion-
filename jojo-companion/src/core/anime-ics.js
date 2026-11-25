// Exportação opcional dos próximos episódios acompanhados para um arquivo .ics (iCalendar),
// para ela importar no Google Agenda, iCloud ou Outlook se quiser. Só sai do app quando
// ela pede e salva o arquivo; nada é enviado para lugar nenhum.

const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/[\r\n]+/g, ' ').slice(0, 200);
const utc = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Texto .ics com o próximo episódio de cada anime acompanhado (horário em UTC; o app de agenda converte). */
export function exportarIcs(animes, agora = Date.now()) {
  const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JoJo Companion//Animes//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const a of animes || []) {
    const p = a.proximo;
    if (!p || !(p.quando > agora)) continue;
    const dur = Math.max(5, Math.min(180, a.duracao || 24));
    linhas.push(
      'BEGIN:VEVENT',
      `UID:anime-${a.id}-${p.episodio}@jojo-companion`,
      `DTSTAMP:${utc(agora)}`,
      `DTSTART:${utc(p.quando)}`,
      `DTEND:${utc(p.quando + dur * 60e3)}`,
      `SUMMARY:${esc(`${a.titulo} — episódio ${p.episodio}`)}`,
      `DESCRIPTION:${esc('Previsão da exibição no Japão (AniList). No serviço de streaming pode aparecer um pouco depois.')}`,
      'END:VEVENT',
    );
  }
  linhas.push('END:VCALENDAR');
  return `${linhas.join('\r\n')}\r\n`;
}
