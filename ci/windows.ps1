# Bootstrap Windows x64, sem instaladores globais, PowerShell 7 ou GitHub Actions.
param(
  [ValidateSet('validate', 'release', 'watch')][string]$Mode = 'validate',
  [string]$Tag = '',
  [string]$CacheDirectory = ''
)
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or -not [Environment]::Is64BitOperatingSystem) { throw 'Exige Windows x64 nativo' }
$repo = Split-Path $PSScriptRoot -Parent
$tools = Get-Content -Raw (Join-Path $PSScriptRoot 'windows-toolchain.json') | ConvertFrom-Json
if (-not $CacheDirectory) { $CacheDirectory = Join-Path $env:LOCALAPPDATA 'JoJoCompanionCI\cache' }
$CacheDirectory = [IO.Path]::GetFullPath($CacheDirectory)
New-Item -ItemType Directory -Force $CacheDirectory | Out-Null
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$toolDirectory = Join-Path ([IO.Path]::GetTempPath()) ('jojo-ci-tools-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $toolDirectory | Out-Null
$mutex = New-Object Threading.Mutex($false, 'Local\JoJoCompanionCI-bootstrap')
$locked = $false
try {
  try { $locked = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked = $true }
  if (-not $locked) { throw 'Outro bootstrap JoJo esta em andamento' }
  foreach ($tool in @(@{name='node'; spec=$tools.node}, @{name='git'; spec=$tools.git})) {
    if ($tool.name -eq 'git') {
      $installed = Get-Command git.exe -ErrorAction SilentlyContinue
      if ($installed) {
        $version = & $installed.Source --version
        if ($LASTEXITCODE -ne 0 -or $version -notmatch '^git version (\d+)\.(\d+)') { throw 'Git instalado nao foi identificado' }
        if ([int]$Matches[1] -lt 2 -or ([int]$Matches[1] -eq 2 -and [int]$Matches[2] -lt 39)) { throw 'Git instalado precisa ser pelo menos 2.39' }
        $gitDirectory = Split-Path $installed.Source -Parent
        continue
      }
    }
    $dir = Join-Path $toolDirectory $tool.name
    $zip = Join-Path $CacheDirectory ($tool.name + '-' + $tool.spec.sha256 + '.zip')
    if ((-not (Test-Path $zip)) -or (Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant() -ne $tool.spec.sha256) {
      $part = $zip + '.part'
      Invoke-WebRequest -UseBasicParsing -Uri $tool.spec.url -OutFile $part -TimeoutSec 300
      if ((Get-FileHash -Algorithm SHA256 $part).Hash.ToLowerInvariant() -ne $tool.spec.sha256) { Remove-Item $part; throw 'Checksum do bootstrap invalido' }
      Move-Item -Force $part $zip
    }
    # Extracao privada por processo: nao sobrescrever executavel usado pelo agente.
    Expand-Archive -LiteralPath $zip -DestinationPath $dir -Force
    if ($tool.name -eq 'node') { $nodeDirectory = Join-Path $dir $tool.spec.directory }
    else { $gitDirectory = Join-Path $dir 'cmd' }
  }
} finally {
  if ($locked) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$env:PATH = $nodeDirectory + ';' + $gitDirectory + ';' + $env:PATH
$env:JOJO_CI_CACHE = $CacheDirectory
Set-Location $repo
try {
if ($Mode -eq 'watch') {
  & (Join-Path $nodeDirectory 'node.exe') ci/watch-windows.mjs
} else {
  $arguments = @('ci/windows.mjs')
  if ($Mode -eq 'release') {
    if ($Tag -notmatch '^v\d+\.\d+\.\d+$') { throw 'Release exige tag oficial explicita' }
    $arguments += @('--publish', '--tag', $Tag)
  }
  & (Join-Path $nodeDirectory 'node.exe') @arguments
}
$runExit = $LASTEXITCODE
} finally {
  Remove-Item -LiteralPath $toolDirectory -Recurse -Force -ErrorAction SilentlyContinue
}
exit $runExit
