# Chamado apenas pelo executor apos preflight provar que NAO existia atalho JoJo.
param([Parameter(Mandatory=$true)][string]$ExpectedTarget)
$ErrorActionPreference = 'Stop'
$link = Join-Path ([Environment]::GetFolderPath('Desktop')) 'JoJo Companion.lnk'
if (Test-Path $link) {
  $shell = New-Object -ComObject WScript.Shell
  try {
    $target = $shell.CreateShortcut($link).TargetPath
    if ([IO.Path]::GetFullPath($target) -ne [IO.Path]::GetFullPath($ExpectedTarget)) { throw 'Atalho nao pertence ao teste; preservar e inspecionar' }
    Remove-Item -LiteralPath $link
  } finally { [Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null }
}
# Smoke/presenca exercitam o autostart real. Remover somente a entrada criada pelo teste.
$run = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$startup = Get-ItemProperty $run -ErrorAction SilentlyContinue
foreach ($property in $startup.PSObject.Properties) {
  if ($property.Name -match 'JoJo.*Companion' -or [string]$property.Value -match 'JoJo.?Companion\.exe') {
    if (([string]$property.Value).IndexOf($ExpectedTarget, [StringComparison]::OrdinalIgnoreCase) -lt 0) { throw 'Autostart nao pertence ao teste; preservar e inspecionar' }
    Remove-ItemProperty -LiteralPath $run -Name $property.Name
  }
}
