$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $root '.env'
if (Test-Path -LiteralPath $destination) {
    Write-Host '.env ya existe; se conserva sin cambios.'
    exit 0
}
$content = [IO.File]::ReadAllText((Join-Path $root '.env.example'))
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
    foreach ($name in @('POSTGRES_PASSWORD', 'APP_DB_PASSWORD', 'KEYCLOAK_DB_PASSWORD', 'KEYCLOAK_ADMIN_PASSWORD', 'PGADMIN_PASSWORD', 'CERT_PASSWORD')) {
        $bytes = New-Object byte[] 24
        $rng.GetBytes($bytes)
        $secret = [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
        $content = [regex]::Replace($content, "(?m)^$name=.*$", "$name=$secret")
    }
    [IO.File]::WriteAllText($destination, $content, (New-Object Text.UTF8Encoding $false))
} finally { $rng.Dispose() }
Write-Host '.env creado con secretos aleatorios locales (excluido de Git).'

