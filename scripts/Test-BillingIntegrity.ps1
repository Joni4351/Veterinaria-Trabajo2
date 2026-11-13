param(
    [ValidateSet('vetclinic-review','vetclinic-ci')][string]$Project = 'vetclinic-review',
    [string]$EnvFile = '.env.review',
    [string]$BaseUrl = 'http://127.0.0.1:15175'
)
$ErrorActionPreference = 'Stop'
if (([uri]$BaseUrl).Host -notin @('127.0.0.1','localhost')) { throw 'Solo se admite la API Docker local aislada.' }
$compose = @('compose','-p',$Project)
if ($EnvFile) { $compose += @('--env-file',$EnvFile) }
$configuration = (& docker @compose config --format json | ConvertFrom-Json)
if ($LASTEXITCODE -ne 0 -or $configuration.services.api.environment.ConnectionStrings__miconexion -notmatch '(?i)(^|;)Host=database(;|$)') {
    throw 'La API debe estar conectada al servicio PostgreSQL database del entorno aislado.'
}
$published = (& docker @compose port frontend 8080) -join ''
if ($LASTEXITCODE -ne 0 -or $published -notmatch (':' + ([uri]$BaseUrl).Port + '$')) {
    throw 'El puerto de la API no corresponde al frontend del proyecto Docker aislado.'
}
Remove-Variable configuration
function Sql([string]$Query) {
    $result = & docker @compose exec -T database psql -v ON_ERROR_STOP=1 -U vetclinic -d vetclinic -Atc $Query
    if ($LASTEXITCODE -ne 0) { throw 'Falló la comprobación SQL aislada.' }
    return ($result -join "`n").Trim()
}
$login = Invoke-RestMethod "$BaseUrl/api/v1/usuarios/login" -Method Post -ContentType 'application/json' -Body '{"email":"admin@veterinaria.com","password":"Admin123*"}'
$headers = @{Authorization='Bearer '+$login.token}
function Api([string]$Method,[string]$Path,$Body=$null) {
    $args = @{Uri="$BaseUrl/api/v1/$Path"; Method=$Method; Headers=$headers; SkipHttpErrorCheck=$true}
    if ($null -ne $Body) { $args.ContentType='application/json'; $args.Body=($Body | ConvertTo-Json -Depth 8) }
    $response = Invoke-WebRequest @args
    return @{Status=[int]$response.StatusCode; Data=$(if ($response.Content) { $response.Content | ConvertFrom-Json } else { $null })}
}
function Expect($Condition,[string]$Message) { if (!$Condition) { throw $Message } }
function Invoice($Supply,[int]$Quantity) {
    return @{clienteId=1; fechaEmision=[TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow,'America/Santiago').ToString('yyyy-MM-dd'); montoTotal=0; montoImpuestos=0; items=@(@{tipo='insumo'; insumoId=$Supply; cantidad=$Quantity})}
}
$tag = [Guid]::NewGuid().ToString('N')
$invoices = [Collections.Generic.List[int]]::new()
$supplies = [Collections.Generic.List[int]]::new()
try {
    $s = Api POST 'insumos' @{nombreProducto="TEST BILLING $tag"; tipo='Material'; stockActual=5; precioUnitario=1000}
    Expect ($s.Status -eq 201) 'No se pudo crear el insumo aislado.'
    $supply = [int]$s.Data.id; $supplies.Add($supply)
    $payload = Invoice $supply 3
    $r = Api POST 'facturas' $payload; Expect ($r.Status -eq 201) 'No se emitió la factura de prueba.'
    $invoice = [int]$r.Data.id; $invoices.Add($invoice)
    $lines = (Api GET "detallefac?facturaId=$invoice").Data
    $line = [int]$lines[0].id
    Expect ($lines[0].cantidad -eq 3 -and $lines[0].precioUnitario -eq 1000) 'Cantidad/precio histórico incorrectos.'
    Expect ((Api PUT "insumos/$supply" @{nombreProducto="TEST BILLING $tag";tipo='Material';stockActual=2;precioUnitario=2000}).Status -eq 200) 'No se cambió el precio de catálogo.'
    Expect ((Api PUT "facturas/$invoice" $payload).Status -eq 200) 'No se pudo editar la factura.'
    $lines = (Api GET "detallefac?facturaId=$invoice").Data; $line = [int]$lines[0].id
    Expect ($lines[0].cantidad -eq 3 -and $lines[0].precioUnitario -eq 1000 -and $lines[0].subtotal -eq 3000) 'La edición perdió el precio histórico.'
    $auditBefore = Sql 'SELECT count(*) FROM public."Auditoria";'
    Sql @"
CREATE FUNCTION public.review_billing_failure() RETURNS trigger LANGUAGE plpgsql AS '
BEGIN IF NEW."Id" = $invoice THEN RAISE EXCEPTION ''Injected verification failure''; END IF; RETURN NEW; END;';
CREATE TRIGGER review_billing_failure BEFORE UPDATE ON public."Facturas" FOR EACH ROW EXECUTE FUNCTION public.review_billing_failure();
"@ | Out-Null
    Expect ((Api DELETE "detallefac/$line").Status -eq 500) 'No se activó el fallo intermedio de recálculo.'
    Expect ((Sql "SELECT count(*) FROM public.`"DetallesFactura`" WHERE `"Id`"=$line;") -eq '1') 'El fallo eliminó la línea parcialmente.'
    Expect ((Sql "SELECT `"StockActual`" FROM public.`"Insumos`" WHERE `"Id`"=$supply;") -eq '2') 'El fallo alteró el inventario.'
    Expect ((Sql "SELECT `"MontoTotal`"::integer FROM public.`"Facturas`" WHERE `"Id`"=$invoice;") -eq '3570') 'El fallo alteró el total.'
    Expect ((Sql 'SELECT count(*) FROM public."Auditoria";') -eq $auditBefore) 'La auditoría no se revirtió con la operación.'
    Sql 'DROP TRIGGER review_billing_failure ON public."Facturas"; DROP FUNCTION public.review_billing_failure();' | Out-Null

    $invoiceCount = Sql 'SELECT count(*) FROM public."Facturas";'
    Sql @"
CREATE FUNCTION public.review_billing_insert_failure() RETURNS trigger LANGUAGE plpgsql AS '
BEGIN IF NEW."InsumoId" = $supply THEN RAISE EXCEPTION ''Injected detail insert failure''; END IF; RETURN NEW; END;';
CREATE TRIGGER review_billing_insert_failure BEFORE INSERT ON public."DetallesFactura" FOR EACH ROW EXECUTE FUNCTION public.review_billing_insert_failure();
"@ | Out-Null
    Expect ((Api POST 'facturas' (Invoice $supply 1)).Status -eq 500) 'No se activó el fallo posterior a crear la cabecera.'
    Expect ((Sql 'SELECT count(*) FROM public."Facturas";') -eq $invoiceCount) 'Quedó una factura parcial tras el fallo.'
    Expect ((Sql "SELECT `"StockActual`" FROM public.`"Insumos`" WHERE `"Id`"=$supply;") -eq '2') 'La emisión fallida alteró el inventario.'
    Expect ((Sql 'SELECT count(*) FROM public."Auditoria";') -eq $auditBefore) 'Quedó auditoría de la emisión fallida.'
    Sql 'DROP TRIGGER review_billing_insert_failure ON public."DetallesFactura"; DROP FUNCTION public.review_billing_insert_failure();' | Out-Null

    Sql "UPDATE public.`"DetallesFactura`" SET `"Cantidad`"=NULL, `"PrecioUnitario`"=NULL WHERE `"Id`"=$line;" | Out-Null
    Expect ((Api DELETE "detallefac/$line").Status -eq 409) 'Se permitió reponer una cantidad histórica desconocida.'
    Sql "UPDATE public.`"DetallesFactura`" SET `"Cantidad`"=3, `"PrecioUnitario`"=1000 WHERE `"Id`"=$line;" | Out-Null
    Expect ((Api DELETE "detallefac/$line").Status -eq 204) 'No se pudo eliminar la línea con cantidad conocida.'
    Expect ((Sql "SELECT `"StockActual`" FROM public.`"Insumos`" WHERE `"Id`"=$supply;") -eq '5') 'No se repusieron las tres unidades exactas.'
    Expect ((Sql "SELECT `"MontoTotal`"::integer FROM public.`"Facturas`" WHERE `"Id`"=$invoice;") -eq '0') 'No se recalculó el total tras eliminar.'

    $s = Api POST 'insumos' @{nombreProducto="TEST CONCURRENT $tag";tipo='Material';stockActual=1;precioUnitario=1000}
    Expect ($s.Status -eq 201) 'No se creó el insumo de concurrencia.'
    $concurrent = [int]$s.Data.id; $supplies.Add($concurrent)
    Sql @"
CREATE FUNCTION public.review_billing_overlap() RETURNS trigger LANGUAGE plpgsql AS '
BEGIN IF NEW."Id" = $concurrent THEN PERFORM pg_sleep(1); END IF; RETURN NEW; END;';
CREATE TRIGGER review_billing_overlap BEFORE UPDATE ON public."Insumos" FOR EACH ROW EXECUTE FUNCTION public.review_billing_overlap();
"@ | Out-Null
    $http = [Net.Http.HttpClient]::new()
    try {
        $http.DefaultRequestHeaders.Authorization = [Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer',$login.token)
        $json = Invoice $concurrent 1 | ConvertTo-Json -Depth 8
        $a = $http.PostAsync("$BaseUrl/api/v1/facturas",[Net.Http.StringContent]::new($json,[Text.Encoding]::UTF8,'application/json'))
        $b = $http.PostAsync("$BaseUrl/api/v1/facturas",[Net.Http.StringContent]::new($json,[Text.Encoding]::UTF8,'application/json'))
        $results = @($a.GetAwaiter().GetResult(),$b.GetAwaiter().GetResult())
        $statuses = @($results | ForEach-Object { [int]$_.StatusCode })
        foreach ($response in $results) {
            if ([int]$response.StatusCode -eq 201) { $invoices.Add([int](($response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json).id)) }
        }
        Expect (@($statuses | Where-Object { $_ -eq 201 }).Count -eq 1) 'La última unidad se vendió más de una vez o no se pudo vender.'
        Expect (@($statuses | Where-Object { $_ -in @(400,409) }).Count -eq 1) 'La emisión concurrente no rechazó la venta sin existencias.'
        Expect ((Sql "SELECT `"StockActual`" FROM public.`"Insumos`" WHERE `"Id`"=$concurrent;") -eq '0') 'El inventario final no corresponde a la venta única.'
        Write-Host "Concurrencia PostgreSQL: estados HTTP $($statuses -join ','); una sola venta y stock final cero."
    } finally { $http.Dispose() }
    Write-Host 'Verificados: precio/cantidad históricos, reposición exacta, bloqueo de legado ambiguo y rollback de cabecera, detalle, stock, totales y auditoría.'
} finally {
    Sql 'DROP TRIGGER IF EXISTS review_billing_failure ON public."Facturas"; DROP FUNCTION IF EXISTS public.review_billing_failure(); DROP TRIGGER IF EXISTS review_billing_insert_failure ON public."DetallesFactura"; DROP FUNCTION IF EXISTS public.review_billing_insert_failure(); DROP TRIGGER IF EXISTS review_billing_overlap ON public."Insumos"; DROP FUNCTION IF EXISTS public.review_billing_overlap();' | Out-Null
    if ($invoices.Count) {
        $ids = $invoices -join ','
        Sql "DELETE FROM public.`"DetallesFactura`" WHERE `"FacturaId`" IN ($ids); DELETE FROM public.`"Facturas`" WHERE `"Id`" IN ($ids);" | Out-Null
    }
    if ($supplies.Count) { Sql "DELETE FROM public.`"Insumos`" WHERE `"Id`" IN ($($supplies -join ','));" | Out-Null }
}
