# Somente leitura; usado pelo ensaio NSIS em conta isolada, nunca segue links.
$ErrorActionPreference = 'Stop'
$shell = New-Object -ComObject WScript.Shell
try {
  $result = @()
  $dirs = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('CommonDesktopDirectory')) | Select-Object -Unique
  foreach ($dir in $dirs) {
    if (-not $dir -or -not (Test-Path -LiteralPath $dir)) { continue }
    foreach ($name in @('JoJo Companion.lnk', 'JoJoCompanion.lnk', 'JoJo Companion (1).lnk', 'JoJo Companion (2).lnk')) {
      $file = Join-Path $dir $name
      if (Test-Path -LiteralPath $file) {
        $link = $shell.CreateShortcut($file)
        $result += @{ path = $file; target = $link.TargetPath; arguments = $link.Arguments }
      }
    }
  }
  ConvertTo-Json -InputObject @($result) -Compress
} finally { [Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null }
