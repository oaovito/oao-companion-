# Testes movem mouse/teclado e instalam o app: exigir sessao isolada sem JoJo do usuario.
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or -not [Environment]::UserInteractive) { throw 'Exige sessao Windows interativa desbloqueada e dedicada aos testes' }
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class JoJoCiInputDesktop {
  [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
  [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool GetUserObjectInformation(IntPtr handle, int index, StringBuilder value, uint size, out uint needed);
  [DllImport("user32.dll")] public static extern bool CloseDesktop(IntPtr handle);
}
'@
$inputDesktop = [JoJoCiInputDesktop]::OpenInputDesktop(0, $false, 1)
if ($inputDesktop -eq [IntPtr]::Zero) { throw 'Desktop de entrada indisponivel; aguardar desbloqueio autorizado' }
try {
  $desktopName = New-Object Text.StringBuilder(256)
  $needed = 0
  $read = [JoJoCiInputDesktop]::GetUserObjectInformation($inputDesktop, 2, $desktopName, 512, [ref]$needed)
  if (-not $read -or $desktopName.ToString() -ne 'Default') { throw 'Desktop bloqueado/seguro; nao executar entrada automatica' }
} finally { [JoJoCiInputDesktop]::CloseDesktop($inputDesktop) | Out-Null }
foreach ($dir in @((Join-Path $env:APPDATA 'JoJo Companion'), (Join-Path $env:APPDATA 'jojo-companion'))) {
  if (Test-Path $dir) { throw 'Perfil JoJo existente preservado; usar conta de teste isolada' }
}
if (Get-Process -Name 'JoJoCompanion', 'JoJo Companion' -ErrorAction SilentlyContinue) { throw 'JoJo ja esta em uso; nao interromper' }
$desktop = [Environment]::GetFolderPath('Desktop')
if (Test-Path (Join-Path $desktop 'JoJo Companion.lnk')) { throw 'Atalho JoJo existente preservado; conta nao esta isolada' }
$startup = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -ErrorAction SilentlyContinue
foreach ($property in $startup.PSObject.Properties) {
  if ($property.Name -match 'JoJo.*Companion' -or [string]$property.Value -match 'JoJo.?Companion\.exe') { throw 'Inicializacao JoJo existente preservada; usar conta isolada' }
}
foreach ($root in @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall', 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall', 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall')) {
  foreach ($key in @(Get-ChildItem $root -ErrorAction SilentlyContinue)) {
    $entry = Get-ItemProperty $key.PSPath -ErrorAction SilentlyContinue
    if ($entry.DisplayName -like '*JoJo*Companion*') { throw 'Instalacao existente preservada; usar conta/VM de teste isolada' }
  }
}
Write-Output 'Preflight Windows: perfil sem instalacao/dados JoJo e sessao interativa.'
