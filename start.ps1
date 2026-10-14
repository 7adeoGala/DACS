# Arranque reproducible del entorno local. No borra datos ni reemplaza secretos.
param(
    [switch]$Dev,
    [switch]$Demo,
    [switch]$InstallDependencies
)
$ErrorActionPreference = 'Stop'
# Los programas nativos informan fallos mediante exit code, que se comprueba abajo.
$PSNativeCommandUseErrorActionPreference = $false
function Invoke-Step {
    param([string]$Executable, [string[]]$Arguments)
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Executable termino con codigo $LASTEXITCODE." }
}
function Get-DockerType {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $kind = & docker.exe info --format '{{.OSType}}' 2> .local/docker-start.log
        if ($LASTEXITCODE -eq 0) { return "$kind" }
        return ''
    } finally { $ErrorActionPreference = $previousPreference }
}

Push-Location $PSScriptRoot
try {
    foreach ($command in @('docker.exe', 'node.exe', 'npm.cmd')) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "Falta $command. Consultar docs/arranque.md."
        }
    }
    foreach ($file in @('.env', 'infra/certs/generated/dacs2026.local.cer',
        'infra/certs/generated/dacs2026.local.pem', 'infra/certs/generated/dacs2026.local.key',
        'infra/certs/generated/dacs2026.local.p12')) {
        if (-not (Test-Path -LiteralPath $file)) {
            throw "Falta $file. Completar la inicializacion de docs/arranque.md."
        }
    }
    $addresses = [Net.Dns]::GetHostAddresses('dacs2026.local') | ForEach-Object { $_.IPAddressToString }
    if ('127.0.0.1' -notin $addresses) {
        throw 'Configurar hosts con scripts/setup-hosts.ps1 como administrador. Ver docs/arranque.md.'
    }
    $certificate = New-Object Security.Cryptography.X509Certificates.X509Certificate2 -ArgumentList (Join-Path $PSScriptRoot 'infra/certs/generated/dacs2026.local.cer')
    if ($certificate.NotAfter -lt (Get-Date)) { throw 'El certificado local vencio. Revisar docs/arranque.md.' }
    if (-not (Test-Path "Cert:\CurrentUser\Root\$($certificate.Thumbprint)") -and
        -not (Test-Path "Cert:\LocalMachine\Root\$($certificate.Thumbprint)")) {
        throw 'Confiar en el certificado con scripts/trust-browser-cert.ps1 y aceptar la confirmacion de Windows. Ver docs/arranque.md.'
    }

    Write-Host 'Comprobando Docker Desktop...'
    # Redirigir stderr a archivo evita que Windows PowerShell lo trate como excepcion.
    New-Item -ItemType Directory -Path '.local' -Force | Out-Null
    $dockerType = Get-DockerType
    if (-not $dockerType) {
        $desktop = Join-Path $env:ProgramFiles 'Docker/Docker/Docker Desktop.exe'
        if (-not (Test-Path -LiteralPath $desktop)) { throw 'Iniciar Docker Desktop en modo Linux y repetir.' }
        Start-Process -FilePath $desktop -WindowStyle Hidden
        $deadline = (Get-Date).AddMinutes(3)
        do {
            Start-Sleep -Seconds 2
            $dockerType = Get-DockerType
            if ($dockerType) { break }
        } while ((Get-Date) -lt $deadline)
        if (-not $dockerType) { throw 'Docker no inicio en 3 minutos. Revisar Docker Desktop y .local/docker-start.log.' }
    }
    if ($dockerType -ne 'linux') { throw 'Docker Desktop debe usar contenedores Linux.' }
    Invoke-Step 'docker.exe' @('compose', 'config', '--quiet')

    $lockHash = (Get-FileHash 'frontend/apexpredict/package-lock.json' -Algorithm SHA256).Hash
    $hashPath = Join-Path $PSScriptRoot '.local/frontend-dependencies.sha256'
    $savedHash = if (Test-Path -LiteralPath $hashPath) { (Get-Content -LiteralPath $hashPath -Raw).Trim() } else { '' }
    Push-Location 'frontend/apexpredict'
    try {
        if ($InstallDependencies -or $savedHash -ne $lockHash -or -not (Test-Path 'node_modules/@angular/cli/bin/ng.js')) {
            $frontendPath = (Get-Location).Path
            $runningAngular = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
                Where-Object { $_.CommandLine -and $_.CommandLine.Contains($frontendPath) -and $_.CommandLine -match '\bserve\b' }
            if ($runningAngular) {
                throw 'Cerrar el ng serve de este proyecto con Ctrl+C antes de reinstalar dependencias. Luego repetir start.ps1.'
            }
            Write-Host 'Instalando dependencias con npm 11.6.2...'
            Invoke-Step 'npm.cmd' @('exec', '--yes', '--package=npm@11.6.2', '--', 'npm', 'ci', '--no-fund', '--no-audit')
            Set-Content -LiteralPath $hashPath -Value $lockHash
        }
        Write-Host 'Compilando Angular...'
        Invoke-Step 'npm.cmd' @('run', 'build', '--', '--configuration=production', '--base-href=/apexpredict/')
    } finally { Pop-Location }
    Invoke-Step 'node.exe' @('scripts/publish-frontend.mjs')

    Write-Host 'Levantando los 7 servicios: PostgreSQL, Keycloak, pgAdmin, Domain-Service, F1-Connector, BFF y Nginx...'
    Invoke-Step 'docker.exe' @('compose', 'up', '-d', '--build', '--wait', '--wait-timeout', '240')
    $keycloakArgs = @('scripts/configure-keycloak.mjs')
    if ($Demo) { $keycloakArgs += '--demo' }
    Invoke-Step 'node.exe' $keycloakArgs
    Invoke-Step 'node.exe' @('scripts/smoke-test.mjs')
    Write-Host ''
    Write-Host 'ApexPredict listo: https://dacs2026.local/apexpredict/' -ForegroundColor Green
    Write-Host 'Crear cuenta desde la portada o desde Iniciar sesion > Registrarse.'
    Write-Host 'Para detener los servicios: docker compose stop'

    if ($Dev) {
        Write-Host 'Iniciando Angular en http://localhost:4200/ (Ctrl+C detiene solo Angular).'
        Push-Location 'frontend/apexpredict'
        try { Invoke-Step 'npm.cmd' @('start', '--', '--host', 'localhost') }
        finally { Pop-Location }
    }
} finally { Pop-Location }
