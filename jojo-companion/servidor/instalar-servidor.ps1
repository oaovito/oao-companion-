# Prepara o computador SERVIDOR da conversa do JoJo (ex.: o PC do João).
# Não rode isto no notebook da Emanuele: lá o JoJo só envia o texto.
# Executar no PowerShell (como o usuário que fica logado no servidor):
#   powershell -ExecutionPolicy Bypass -File .\instalar-servidor.ps1
$ErrorActionPreference = 'Stop'

Write-Host '1/5 Ollama e Node.js'
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) { winget install -e --id Ollama.Ollama --accept-package-agreements --accept-source-agreements }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements }

Write-Host '2/5 Configuração enxuta do Ollama (só local, um modelo, uma conversa por vez)'
$vars = @{
  OLLAMA_HOST = '127.0.0.1:11434'   # nunca exposto direto; o portão é que atende a rede
  OLLAMA_MAX_LOADED_MODELS = '1'
  OLLAMA_NUM_PARALLEL = '1'
  OLLAMA_MAX_QUEUE = '4'
  OLLAMA_CONTEXT_LENGTH = '4096'
  OLLAMA_KEEP_ALIVE = '15m'
  OLLAMA_NO_CLOUD = '1'
}
foreach ($k in $vars.Keys) { [Environment]::SetEnvironmentVariable($k, $vars[$k], 'User') ; Set-Item -Path "Env:$k" -Value $vars[$k] }
Get-Process ollama* -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Process ollama -ArgumentList 'serve' -WindowStyle Hidden
Start-Sleep -Seconds 5

Write-Host '3/5 Modelo Qwen 3.5 2B (quantização leve)'
ollama pull qwen3.5:2b-q4_K_M
if ($LASTEXITCODE -ne 0) { Write-Host 'Variante q4_K_M não encontrada; baixando qwen3.5:2b'; ollama pull qwen3.5:2b }

Write-Host '4/5 Portão com chave (inicia junto com o Windows)'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = (Get-Command node).Source
$acao = New-ScheduledTaskAction -Execute $node -Argument "`"$dir\jojo-gateway.mjs`"" -WorkingDirectory $dir
$gatilho = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName 'JoJo - servidor da conversa' -Action $acao -Trigger $gatilho -Force | Out-Null
Start-ScheduledTask -TaskName 'JoJo - servidor da conversa'
Start-Sleep -Seconds 3

Write-Host '5/5 Pronto. Agora:'
Write-Host '  - Instale o Tailscale neste PC e no notebook dela (mesma conta): https://tailscale.com/download'
Write-Host "  - Endereço para o JoJo: http://$(tailscale ip -4 2>$null):11435  (Configurações → Servidor da conversa)"
Write-Host "  - Chave: $(Get-Content "$dir\jojo-chave.txt")  (Configurações → Chave do servidor)"
Write-Host '  - Medição: node medir.mjs'
