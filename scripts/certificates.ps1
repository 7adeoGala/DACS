param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Make', 'Pem', 'P12', 'Jks', 'ImportJava')]
    [string]$Action,
    [string]$JavaHome,
    [string]$CacertsPath
)
. "$PSScriptRoot/common.ps1"
Import-LocalEnvironment
$certDir = Join-Path $ProjectRoot 'infra/certs/generated'
New-Item -ItemType Directory -Path $certDir -Force | Out-Null
$stem = Join-Path $certDir 'dacs2026.local'
$alias = 'dacs2026.local'

if ($Action -in @('Make', 'Pem', 'P12')) { $openssl = Find-OpenSSL }
if ($Action -in @('P12', 'Jks') -and (-not $env:CERT_PASSWORD -or $env:CERT_PASSWORD.Length -lt 6)) {
    throw 'CERT_PASSWORD debe tener al menos 6 caracteres.'
}
if ($Action -in @('Jks', 'ImportJava')) {
    $selectedJava = Find-JavaHome $JavaHome
    $keytool = Join-Path $selectedJava 'bin/keytool.exe'
    if (-not (Test-Path -LiteralPath $keytool)) { throw "No existe keytool en $selectedJava" }
}

switch ($Action) {
    'Make' {
        $hasKey = Test-Path -LiteralPath "$stem.key"
        $hasCert = Test-Path -LiteralPath "$stem.cer"
        if ($hasKey -xor $hasCert) { throw 'Certificado incompleto. Respaldar y revisar generated antes de regenerar.' }
        if ($hasKey -and $hasCert) {
            Invoke-Checked $openssl @('x509', '-inform', 'DER', '-in', "$stem.cer", '-checkend', '86400', '-noout')
            Invoke-Checked $openssl @('x509', '-inform', 'DER', '-in', "$stem.cer", '-checkhost', 'dacs2026.local', '-noout')
            $keyModulus = & $openssl rsa -in "$stem.key" -noout -modulus
            if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer la clave privada.' }
            $certModulus = & $openssl x509 -inform DER -in "$stem.cer" -noout -modulus
            if ($LASTEXITCODE -ne 0 -or $keyModulus -ne $certModulus) { throw 'La clave privada no corresponde al certificado.' }
            Write-Host 'Certificado y clave existentes conservados.'
            break
        }
        Invoke-Checked $openssl @('req', '-x509', '-newkey', 'rsa:3072', '-sha256', '-nodes', '-days', '365', '-config', (Join-Path $ProjectRoot 'infra/certs/openssl.cnf'), '-keyout', "$stem.key", '-outform', 'DER', '-out', "$stem.cer")
    }
    'Pem' {
        Invoke-Checked $openssl @('x509', '-inform', 'DER', '-in', "$stem.cer", '-outform', 'PEM', '-out', "$stem.pem")
    }
    'P12' {
        Invoke-Checked $openssl @('pkcs12', '-export', '-in', "$stem.pem", '-inkey', "$stem.key", '-name', $alias, '-out', "$stem.p12", '-passout', 'env:CERT_PASSWORD')
    }
    'Jks' {
        Invoke-Checked $keytool @('-importkeystore', '-noprompt', '-srckeystore', "$stem.p12", '-srcstoretype', 'PKCS12', '-srcstorepass:env', 'CERT_PASSWORD', '-srcalias', $alias, '-destkeystore', "$stem.jks", '-deststoretype', 'JKS', '-deststorepass:env', 'CERT_PASSWORD', '-destkeypass:env', 'CERT_PASSWORD')
    }
    'ImportJava' {
        if (-not $CacertsPath) {
            foreach ($relative in @('lib/security/cacerts', 'jre/lib/security/cacerts')) {
                $candidate = Join-Path $selectedJava $relative
                if (Test-Path -LiteralPath $candidate) { $CacertsPath = $candidate; break }
            }
        }
        if (-not $CacertsPath -or -not (Test-Path -LiteralPath $CacertsPath)) { throw 'No se encontro cacerts. Usar -CacertsPath.' }
        if (-not $env:CACERTS_PASSWORD) { $env:CACERTS_PASSWORD = 'changeit' }
        # Validar la contrasena antes de intentar cualquier modificacion.
        Invoke-Checked $keytool @('-list', '-keystore', $CacertsPath, '-storepass:env', 'CACERTS_PASSWORD') | Out-Null
        $oldPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        $existing = (& $keytool -list -rfc -alias $alias -keystore $CacertsPath -storepass:env CACERTS_PASSWORD 2>&1 | Out-String)
        $aliasExists = $LASTEXITCODE -eq 0
        $ErrorActionPreference = $oldPreference
        if ($aliasExists) {
            $match = [regex]::Match($existing, '-----BEGIN CERTIFICATE-----\s*(.*?)\s*-----END CERTIFICATE-----', 'Singleline')
            if (-not $match.Success) { throw 'No se pudo leer el certificado existente.' }
            $current = New-Object Security.Cryptography.X509Certificates.X509Certificate2 -ArgumentList (,[Convert]::FromBase64String($match.Groups[1].Value))
            $expected = New-Object Security.Cryptography.X509Certificates.X509Certificate2 -ArgumentList "$stem.cer"
            if ($current.Thumbprint -ne $expected.Thumbprint) { throw 'El alias existente pertenece a otro certificado; no se reemplaza automaticamente.' }
            Write-Host "El certificado ya esta importado en $CacertsPath"
            break
        }
        $backupDir = Join-Path $ProjectRoot '.local/backups'
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        $backup = Join-Path $backupDir ('cacerts.' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '.bak')
        Copy-Item -LiteralPath $CacertsPath -Destination $backup
        Invoke-Checked $keytool @('-importcert', '-trustcacerts', '-noprompt', '-alias', $alias, '-file', "$stem.cer", '-keystore', $CacertsPath, '-storepass:env', 'CACERTS_PASSWORD')
        Write-Host "Certificado importado en $CacertsPath. Backup: $backup"
    }
}
Write-Host "Certificados: $Action completado."

