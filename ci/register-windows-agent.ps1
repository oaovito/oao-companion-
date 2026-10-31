# So executar quando uma maquina Windows autorizada estiver conectada.
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'Exige Windows' }
$entry = Join-Path $PSScriptRoot 'windows.ps1'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoLogo -NoProfile -NonInteractive -ExecutionPolicy RemoteSigned -File "' + $entry + '" -Mode watch')
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable
if (Get-ScheduledTask -TaskName 'JoJoCompanion-FreeWindowsCI' -ErrorAction SilentlyContinue) { throw 'Tarefa existente preservada; inspecionar antes de substituir' }
Register-ScheduledTask -TaskName 'JoJoCompanion-FreeWindowsCI' -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null
Start-ScheduledTask -TaskName 'JoJoCompanion-FreeWindowsCI'
