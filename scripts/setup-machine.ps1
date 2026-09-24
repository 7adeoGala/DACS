# Ejecutar como administrador: modifica hosts y el cacerts de Java.
param([string]$JavaHome)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$local = Join-Path $root '.local'
New-Item -ItemType Directory -Path $local -Force | Out-Null
$statusPath = Join-Path $local 'machine-setup.json'
Start-Transcript -Path (Join-Path $local 'machine-setup.log') -Force | Out-Null
try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot/setup-hosts.ps1"
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo configurar hosts.' }
    $arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "$PSScriptRoot/certificates.ps1", '-Action', 'ImportJava')
    if ($JavaHome) { $arguments += @('-JavaHome', $JavaHome) }
    & powershell.exe @arguments
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo importar el certificado en Java.' }
    @{ success = $true; timestamp = (Get-Date -Format o) } | ConvertTo-Json | Set-Content -LiteralPath $statusPath
} catch {
    @{ success = $false; error = $_.Exception.Message; timestamp = (Get-Date -Format o) } | ConvertTo-Json | Set-Content -LiteralPath $statusPath
    throw
} finally { Stop-Transcript | Out-Null }

