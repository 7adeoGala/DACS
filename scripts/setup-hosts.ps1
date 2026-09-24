param([string]$HostsPath = "$env:SystemRoot\System32\drivers\etc\hosts")
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$text = [IO.File]::ReadAllText($HostsPath)
$found = $false
foreach ($line in ($text -split '\r?\n')) {
    $entry = ($line -split '#', 2)[0].Trim()
    if (-not $entry) { continue }
    $parts = $entry -split '\s+'
    if ($parts.Length -gt 1 -and $parts[1..($parts.Length - 1)] -contains 'dacs2026.local') {
        if ($parts[0] -ne '127.0.0.1') { throw 'Ya existe dacs2026.local con otra IP. Revisar hosts antes de continuar.' }
        $found = $true
    }
}
if ($found) { Write-Host 'hosts ya contiene 127.0.0.1 dacs2026.local.'; exit 0 }
$backupDir = Join-Path $root '.local/backups'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$backup = Join-Path $backupDir ('hosts.' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '.bak')
Copy-Item -LiteralPath $HostsPath -Destination $backup
$prefix = if ($text.EndsWith("`n")) { '' } else { "`r`n" }
[IO.File]::AppendAllText($HostsPath, ($prefix + "127.0.0.1 dacs2026.local`r`n"), (New-Object Text.UTF8Encoding $false))
Write-Host "Dominio agregado. Backup: $backup"

