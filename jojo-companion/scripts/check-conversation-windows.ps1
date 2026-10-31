# Inferencia e interface reais no Windows, com cache verificado e sem dependencia de Actions.
param([string]$WorkDirectory = '', [string]$CacheDirectory = '')
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'Exige Windows nativo' }
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
if (-not $WorkDirectory) { $WorkDirectory = Join-Path ([IO.Path]::GetTempPath()) ('jojo-qa-' + [Guid]::NewGuid().ToString('N')) }
if (-not $CacheDirectory) { $CacheDirectory = Join-Path $env:LOCALAPPDATA 'JoJoCompanionCI\cache' }
New-Item -ItemType Directory -Force $WorkDirectory, $CacheDirectory | Out-Null
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()
$env:OLLAMA_HOST = "127.0.0.1:$port"
$env:JOJO_LLM_BASE = "http://127.0.0.1:$port"
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_NUM_PARALLEL = '1'
$env:OLLAMA_MAX_LOADED_MODELS = '1'
$env:OLLAMA_MODELS = Join-Path $CacheDirectory 'ollama-models'
if (-not $env:JOJO_QA_MODEL) {
  $env:JOJO_QA_MODEL = node --input-type=module -e "import {LOCAL_MODEL} from './src/core/dialogue/local-model.js'; console.log(LOCAL_MODEL)"
  if ($LASTEXITCODE -ne 0) { throw 'Modelo oficial indisponivel' }
}
node -e "const os=require('node:os'); console.log(JSON.stringify({platform:process.platform,release:os.release(),ramBytes:os.totalmem(),cpus:os.cpus().length}))"
$runtime = node --input-type=module -e "import {OLLAMA_ZIP,OLLAMA_SHA256} from './src/main/cerebro-local.js'; console.log(JSON.stringify({url:OLLAMA_ZIP,sha256:OLLAMA_SHA256}))" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Configuracao do runtime indisponivel' }
$zip = Join-Path $CacheDirectory ('ollama-' + $runtime.sha256 + '.zip')
$root = Join-Path $WorkDirectory 'ollama'
if ((-not (Test-Path $zip)) -or (Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant() -ne $runtime.sha256) {
  $part = $zip + '.part'
  curl.exe --fail --location --retry 3 --output $part $runtime.url
  if ($LASTEXITCODE -ne 0) { throw 'Falha no download do Ollama Windows' }
  if ((Get-FileHash -Algorithm SHA256 $part).Hash.ToLowerInvariant() -ne $runtime.sha256) { Remove-Item $part; throw 'SHA-256 do runtime invalido' }
  Move-Item -Force $part $zip
}
Expand-Archive -LiteralPath $zip -DestinationPath $root -Force
$stderr = Join-Path $WorkDirectory 'ollama.err.log'
$server = Start-Process -FilePath (Join-Path $root 'ollama.exe') -ArgumentList 'serve' -RedirectStandardOutput (Join-Path $WorkDirectory 'ollama.out.log') -RedirectStandardError $stderr -PassThru
$qaExit = 1
try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    if ($server.HasExited) { throw 'Ollama encerrou antes de iniciar' }
    try {
      $version = Invoke-RestMethod -Uri "$env:JOJO_LLM_BASE/api/version" -TimeoutSec 1
      Write-Output "Ollama Windows $($version.version)"
      $ready = $true
      break
    } catch { Start-Sleep -Milliseconds 500 }
  }
  if (-not $ready) { throw 'Ollama Windows nao iniciou' }
  # Pull valida os blobs e reaproveita os pesos do cache, sem baixar 3 GB novamente.
  $body = @{ model = $env:JOJO_QA_MODEL; stream = $false } | ConvertTo-Json -Compress
  $result = Invoke-RestMethod -Uri "$env:JOJO_LLM_BASE/api/pull" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 660
  if ($result.error -or $result.status -ne 'success') { throw 'Download/verificacao do modelo nao concluiu' }
  foreach ($file in @('out/conversa-real-windows.json', 'out/conversa-interface-windows.json', 'out/conversa-interface-windows.png')) {
    if (Test-Path $file) { Remove-Item -LiteralPath $file }
  }
  node scripts/check-conversation.mjs out/conversa-real-windows.json
  $qaExit = $LASTEXITCODE
  if ($qaExit -eq 0) {
    node --test --test-reporter=tap test/e2e/conversation-real.windows.mjs
    $qaExit = $LASTEXITCODE
  }
} finally {
  if (-not $server.HasExited) { taskkill.exe /PID $server.Id /T /F | Out-Null }
  Get-Content -Tail 60 $stderr
  Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
}
exit $qaExit
