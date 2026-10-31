# Inferência e interface reais, exclusivamente no Windows. Usado pela avaliação e pelo CI oficial.
$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw 'Este ensaio exige Windows e PowerShell 7' }
if (-not $env:RUNNER_TEMP) { throw 'O ensaio exige um diretório temporário do runner' }
$env:OLLAMA_HOST = '127.0.0.1:11439'
$env:JOJO_LLM_BASE = 'http://127.0.0.1:11439'
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_NUM_PARALLEL = '1'
$env:OLLAMA_MAX_LOADED_MODELS = '1'
$env:OLLAMA_MODELS = Join-Path $env:RUNNER_TEMP 'jojo-models'
if (-not $env:JOJO_QA_MODEL) {
  $env:JOJO_QA_MODEL = node --input-type=module -e "import {LOCAL_MODEL} from './src/core/dialogue/local-model.js'; console.log(LOCAL_MODEL)"
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível ler o modelo oficial' }
}
node -e "const os=require('node:os'); console.log(JSON.stringify({platform:process.platform,release:os.release(),ramBytes:os.totalmem(),cpus:os.cpus().length}))"
$zip = Join-Path $env:RUNNER_TEMP 'ollama-windows-amd64.zip'
$root = Join-Path $env:RUNNER_TEMP 'jojo-ollama'
$runtime = node --input-type=module -e "import {OLLAMA_ZIP,OLLAMA_SHA256} from './src/main/cerebro-local.js'; console.log(JSON.stringify({url:OLLAMA_ZIP,sha256:OLLAMA_SHA256}))" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível ler a configuração do runtime' }
curl.exe --fail --location --retry 3 --output $zip $runtime.url
if ($LASTEXITCODE -ne 0) { throw 'Falha no download do Ollama Windows' }
$hash = (Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant()
if ($hash -ne $runtime.sha256) { throw 'SHA-256 do Ollama Windows não confere' }
Expand-Archive -LiteralPath $zip -DestinationPath $root -Force
$server = Start-Process -FilePath (Join-Path $root 'ollama.exe') -ArgumentList 'serve' -RedirectStandardOutput (Join-Path $env:RUNNER_TEMP 'jojo-ollama.out.log') -RedirectStandardError (Join-Path $env:RUNNER_TEMP 'jojo-ollama.err.log') -PassThru
$qaExit = 1
try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $version = Invoke-RestMethod -Uri "$env:JOJO_LLM_BASE/api/version" -TimeoutSec 1
      Write-Output "Ollama Windows $($version.version)"
      $ready = $true
      break
    } catch { Start-Sleep -Milliseconds 500 }
  }
  if (-not $ready) { throw 'Ollama Windows não iniciou' }
  $body = @{ model = $env:JOJO_QA_MODEL; stream = $false } | ConvertTo-Json -Compress
  $result = Invoke-RestMethod -Uri "$env:JOJO_LLM_BASE/api/pull" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 660
  if ($result.error -or $result.status -ne 'success') { throw "Download do modelo não concluiu: $($result.error)" }
  node scripts/check-conversation.mjs out/conversa-real-windows.json
  $qaExit = $LASTEXITCODE
  if ($qaExit -eq 0) {
    node --test test/e2e/conversation-real.windows.mjs
    $qaExit = $LASTEXITCODE
  }
} finally {
  if (-not $server.HasExited) { taskkill.exe /PID $server.Id /T /F | Out-Null }
  Get-Content -Tail 60 (Join-Path $env:RUNNER_TEMP 'jojo-ollama.err.log')
  foreach ($report in @('out/conversa-real-windows.json', 'out/conversa-interface-windows.json')) {
    if ((Test-Path $report) -and $env:GITHUB_STEP_SUMMARY) {
      Add-Content -Path $env:GITHUB_STEP_SUMMARY -Value "## $report — ler as falas reais antes de autorizar uma release"
      Add-Content -Path $env:GITHUB_STEP_SUMMARY -Value '```json'
      Get-Content -Raw -Encoding utf8 $report | Add-Content -Path $env:GITHUB_STEP_SUMMARY
      Add-Content -Path $env:GITHUB_STEP_SUMMARY -Value '```'
    }
  }
}
exit $qaExit
