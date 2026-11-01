// Ensaio real opt-in por credencial injetada de forma segura; nunca imprimir conta ou senha.
import { IcloudCaldav } from '../src/core/caldav.js';
const username = process.env.JOJO_ICLOUD_USER;
const password = process.env.JOJO_ICLOUD_APP_PASSWORD;
if (!username || !password) {
  console.error('BLOQUEADO: não há conta iCloud de teste autorizada com credenciais injetadas pelo canal seguro. Nenhuma autenticação real foi testada.');
  process.exitCode = 2;
} else {
  try {
    const client = new IcloudCaldav({ fetch, username, password });
    const calendars = await client.discover();
    if (!calendars.length) throw new Error('no_calendars');
    const now = new Date(); const end = new Date(now.getTime() + 7 * 86400e3);
    const events = await client.events(calendars.map(c => c.id), { from: now, to: end });
    console.log(JSON.stringify({ status: 'passed', readOnly: true, calendars: calendars.length, events: events.length, checkedAt: new Date().toISOString() }));
  } catch (e) {
    console.error(`Autenticação/leitura iCloud real não aprovada (${/^[a-z_]+$/.test(e.code || e.message) ? e.code || e.message : 'response'}). Nenhum dado pessoal foi incluído no relatório.`);
    process.exitCode = 1;
  }
}
