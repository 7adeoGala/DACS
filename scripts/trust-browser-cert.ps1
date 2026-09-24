$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$path = Join-Path $root 'infra/certs/generated/dacs2026.local.cer'
$cert = New-Object Security.Cryptography.X509Certificates.X509Certificate2 -ArgumentList $path
if ($cert.Subject -notmatch 'CN=dacs2026\.local' -or $cert.Subject -ne $cert.Issuer) {
    throw 'El archivo no es el certificado autofirmado local esperado.'
}
$target = 'Cert:\CurrentUser\Root\' + $cert.Thumbprint
if (-not (Test-Path $target)) { Import-Certificate -FilePath $path -CertStoreLocation Cert:\CurrentUser\Root | Out-Null }
Write-Host "Certificado local confiado para el usuario Windows actual: $($cert.Thumbprint)"
