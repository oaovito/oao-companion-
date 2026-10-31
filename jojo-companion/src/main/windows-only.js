// O produto é exclusivo para Windows. Lógica pura pode ser testada em Node.
export function requireWindows(platform = process.platform) {
  if (platform !== 'win32') throw new Error('JoJo Companion é exclusivo para Windows 11. Execute esta operação no Windows ou no CI Windows.');
}
