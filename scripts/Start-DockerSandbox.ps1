param([ValidateRange(1024, 65535)][int]$Port = 15173)

$ErrorActionPreference = 'Stop'
$repoPath = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $repoPath '.env.sandbox'

function New-RandomBase64 {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes); return [Convert]::ToBase64String($bytes) }
    finally { $rng.Dispose() }
}

if (-not (Test-Path -LiteralPath $configPath)) {
    $jwt = New-RandomBase64
    $biometrics = New-RandomBase64
    $password = New-RandomBase64
    $lines = @(
        '# Local Docker sandbox only. Keep this file private and preserve its keys.'
        'ConnectionStrings__miconexion=Host=database;Database=vetclinic;Username=vetclinic'
        "Jwt__Key='$jwt'"
        'Jwt__Issuer=VeterinariaAPI'
        'Jwt__Audience=VeterinariaAPI'
        'Jwt__ExpireMinutes=60'
        "Biometrics__EncryptionKey='$biometrics'"
        "FRONTEND_PORT=$Port"
        "SANDBOX_DB_PASSWORD='$password'"
    )
    [IO.File]::WriteAllLines($configPath, $lines, [Text.UTF8Encoding]::new($false))
    Write-Host 'Se creó .env.sandbox con claves locales aleatorias. No se utiliza Supabase.'
} else {
    Write-Host 'Se conserva .env.sandbox existente, incluidas sus claves y puerto.'
}

Push-Location $repoPath
$previousProfiles = $env:COMPOSE_PROFILES
try {
    $env:COMPOSE_PROFILES = 'local'
    $composeArgs = @('compose', '--env-file', '.env.sandbox', '-p', 'vetclinic-sandbox', '-f', 'compose.yaml', '-f', 'compose.sandbox.yaml')
    & docker @composeArgs config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'La configuración de Docker no es válida.' }
    & docker @composeArgs up --build --detach --wait --wait-timeout 180
    if ($LASTEXITCODE -ne 0) { throw 'No fue posible iniciar todos los contenedores; revise docker compose logs.' }
    & docker @composeArgs ps
} finally { $env:COMPOSE_PROFILES = $previousProfiles; Pop-Location }
