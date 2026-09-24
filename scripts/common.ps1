$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot

function Import-LocalEnvironment {
    $path = Join-Path $ProjectRoot '.env'
    if (-not (Test-Path -LiteralPath $path)) {
        throw 'Falta .env. Ejecutar scripts/setup-env.ps1 primero.'
    }
    foreach ($line in Get-Content -LiteralPath $path) {
        if ($line -match '^([A-Z][A-Z0-9_]*)=(.*)$') {
            $name = $Matches[1]
            $value = $Matches[2].Trim()
            if ($value.Length -ge 2 -and $value.StartsWith("'" ) -and $value.EndsWith("'")) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) {
                [Environment]::SetEnvironmentVariable($name, $value, 'Process')
            }
        }
    }
}

function Invoke-Checked {
    param([string]$Executable, [string[]]$Arguments)
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Executable termino con codigo $LASTEXITCODE." }
}

function Find-OpenSSL {
    if ($env:OPENSSL_EXE) {
        if (-not (Test-Path -LiteralPath $env:OPENSSL_EXE)) { throw 'OPENSSL_EXE no existe.' }
        return $env:OPENSSL_EXE
    }
    $command = Get-Command openssl.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    foreach ($path in @('C:\Program Files\Git\usr\bin\openssl.exe', 'C:\Program Files\OpenSSL-Win64\bin\openssl.exe')) {
        if (Test-Path -LiteralPath $path) { return $path }
    }
    throw 'OpenSSL no encontrado. Configurar OPENSSL_EXE o PATH.'
}

function Find-JavaHome {
    param([string]$RequestedHome)
    if ($RequestedHome) { return $RequestedHome }
    if ($env:JAVA_HOME) { return $env:JAVA_HOME }
    $command = Get-Command keytool.exe -ErrorAction SilentlyContinue
    if ($command) { return Split-Path -Parent (Split-Path -Parent $command.Source) }
    $homes = @()
    foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
        foreach ($vendor in @('Java', 'Eclipse Adoptium', 'Microsoft')) {
            $folder = Join-Path $base $vendor
            if (Test-Path -LiteralPath $folder) {
                $homes += Get-ChildItem -LiteralPath $folder -Directory | Where-Object {
                    Test-Path -LiteralPath (Join-Path $_.FullName 'bin/keytool.exe')
                } | ForEach-Object { $_.FullName }
            }
        }
    }
    if ($homes.Count -eq 1) { return $homes[0] }
    throw 'No se pudo elegir una instalacion Java. Configurar JAVA_HOME o pasar -JavaHome.'
}

