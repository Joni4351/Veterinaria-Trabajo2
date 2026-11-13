$ErrorActionPreference = 'Stop'
$project = 'vetclinic-review'
$envFile = '.env.review'
if (!(Test-Path -LiteralPath $envFile)) { throw 'Falta el archivo privado .env.review para el entorno aislado.' }
& docker desktop start --timeout 30
for ($i = 0; $i -lt 20; $i++) {
    & docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 2
}
if ($LASTEXITCODE -ne 0) { throw 'El motor Docker no está disponible.' }
& docker compose --env-file $envFile -p $project up --build --detach --wait --wait-timeout 240
if ($LASTEXITCODE -ne 0) { throw 'La composición no inició correctamente.' }
$base = 'http://127.0.0.1:15175'
$login = Invoke-RestMethod "$base/api/v1/usuarios/login" -Method Post -ContentType 'application/json' -Body '{"email":"admin@veterinaria.com","password":"Admin123*"}'
$headers = @{ Authorization = 'Bearer ' + $login.token }
$payload = '{"dataset":"vetclinic-historico-v1","confirmado":true}'
$first = Invoke-RestMethod "$base/api/v1/admin/datos-prueba/historico" -Method Post -Headers $headers -ContentType 'application/json' -Body $payload
$second = Invoke-RestMethod "$base/api/v1/admin/datos-prueba/historico" -Method Post -Headers $headers -ContentType 'application/json' -Body $payload
if (($second.creados.PSObject.Properties.Value | Measure-Object -Sum).Sum -ne 0) { throw 'La carga histórica no fue idempotente.' }
$today = [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow,'America/Santiago').ToString('yyyy-MM-dd')
$from = ([DateTime]::Parse($today)).AddYears(-1).ToString('yyyy-MM-dd')
$summary = Invoke-RestMethod "$base/api/v1/admin/reportes/gerencial?desde=$from&hasta=$today" -Headers $headers
if ($summary.total -lt 12 -or $summary.totales.'1' -lt 500) { throw 'No se verificaron doce meses y al menos quinientas facturas.' }
$folder = Join-Path (Get-Location) 'frontend/test-results/review-live'
New-Item -ItemType Directory -Force -Path $folder | Out-Null
foreach ($type in @('operativo','gerencial','periodo')) {
    foreach ($format in @('csv','pdf','xlsx')) {
        Invoke-WebRequest "$base/api/v1/admin/reportes/$type/exportar/${format}?desde=$from&hasta=$today" -Headers $headers -OutFile (Join-Path $folder "$type.$format")
    }
}
$vet = Invoke-RestMethod "$base/api/v1/usuarios/login" -Method Post -ContentType 'application/json' -Body '{"email":"vet@veterinaria.com","password":"Vet123*"}'
$denied = Invoke-WebRequest "$base/api/v1/admin/reportes/operativo" -Headers @{Authorization='Bearer '+$vet.token} -SkipHttpErrorCheck
if ([int]$denied.StatusCode -ne 403) { throw 'Un rol no administrativo pudo consultar reportes.' }
$sql = 'INSERT INTO public."Insumos" ("NombreProducto","Tipo","StockActual","PrecioUnitario") VALUES (''INVALID TEST'',''TEST'',-1,10);'
$constraintOutput = & docker compose --env-file $envFile -p $project exec -T database psql -U vetclinic -d vetclinic -c $sql 2>&1
if ($LASTEXITCODE -eq 0 -or ($constraintOutput -join '') -notmatch 'CK_Insumos_Stock') { throw 'La base no rechazó stock negativo.' }
$sql = 'UPDATE public."Citas" SET "Estado" = ''Pendiente'' WHERE "Id" = (SELECT "Id" FROM public."Citas" WHERE "Estado" = ''Completada'' LIMIT 1);'
$constraintOutput = & docker compose --env-file $envFile -p $project exec -T database psql -U vetclinic -d vetclinic -c $sql 2>&1
if ($LASTEXITCODE -eq 0 -or ($constraintOutput -join '') -notmatch 'Transición de cita no permitida') { throw 'La base no rechazó la transición de un estado final.' }
& "$PSScriptRoot/Test-BackupRestore.ps1" -Project $project -EnvFile $envFile
Write-Host "Verificado PostgreSQL real: $($summary.total) meses; $($summary.totales.'1') facturas; nueve archivos; permisos; restricciones; idempotencia; respaldo y restauración."
