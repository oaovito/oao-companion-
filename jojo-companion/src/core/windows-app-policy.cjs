const basename = value => String(value || '').split(/[\\/]/).at(-1).toLowerCase();
function isDiscord(value) { return ['discord.exe', 'discordptb.exe', 'discordcanary.exe'].includes(basename(value)); }
function brandFor(value) {
  if (isDiscord(value)) return 'discord';
  if (/^(leagueclient|leagueclientux|league of legends)\.exe$/.test(basename(value))) return 'lol';
  return null;
}
module.exports = { isDiscord, brandFor };
