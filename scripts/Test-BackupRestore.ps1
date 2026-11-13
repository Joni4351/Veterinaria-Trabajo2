param([string]$Project = 'vetclinic-review', [string]$EnvFile = '.env.review')
$ErrorActionPreference = 'Stop'
if ($Project -notmatch '^[a-z0-9-]+$') { throw 'Nombre de proyecto no válido.' }
$base = @('compose', '-p', $Project)
if ($EnvFile) { $base += @('--env-file', $EnvFile) }
function Invoke-Compose([string[]]$CommandArgs) {
    $result = & docker @base @CommandArgs
    if ($LASTEXITCODE -ne 0) { throw 'Falló la operación de respaldo o restauración local.' }
    return $result
}
$suffix = [Guid]::NewGuid().ToString('N')
$restoreDb = "restore_check_$suffix"
$dump = "/tmp/vetclinic-$suffix.dump"
$created = $false
try {
    Invoke-Compose @('exec','-T','database','sh','-c','PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$1"','sh',$dump)
    Invoke-Compose @('exec','-T','database','sh','-c','PGPASSWORD="$POSTGRES_PASSWORD" createdb -U "$POSTGRES_USER" "$1"','sh',$restoreDb)
    $created = $true
    Invoke-Compose @('exec','-T','database','sh','-c','PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" --no-owner --exit-on-error -d "$1" "$2"','sh',$restoreDb,$dump)
    $sql = 'SELECT (SELECT count(*) FROM public."Pacientes")::text || '','' || (SELECT count(*) FROM public."Citas")::text || '','' || (SELECT count(*) FROM public."Facturas")::text;'
    $source = Invoke-Compose @('exec','-T','database','sh','-c','PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$1"','sh',$sql)
    $restored = Invoke-Compose @('exec','-T','database','sh','-c','PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$1" -Atc "$2"','sh',$restoreDb,$sql)
    if (($source -join '').Trim() -ne ($restored -join '').Trim()) { throw 'La restauración no conserva los conteos de pacientes, citas y facturas.' }
    Write-Host "Respaldo pg_dump y restauración pg_restore verificados. Conteos pacientes,citas,facturas: $source"
} finally {
    if ($created) { Invoke-Compose @('exec','-T','database','sh','-c','PGPASSWORD="$POSTGRES_PASSWORD" dropdb -U "$POSTGRES_USER" "$1"','sh',$restoreDb) | Out-Null }
    Invoke-Compose @('exec','-T','database','rm','-f',$dump) | Out-Null
}
