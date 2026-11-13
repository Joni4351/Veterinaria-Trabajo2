-- Despliegue puntual de 20261113155901_HistoricoInventarioFactura sobre
-- una base Supabase existente, creada fuera de Entity Framework.
-- Ejecutar TODO el archivo, tras respaldar la tabla. No repetir si ya se aplicó.
-- No crea ni rellena __EFMigrationsHistory: las migraciones anteriores
-- requieren una conciliación independiente del esquema real.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public."DetallesFactura" IN ACCESS EXCLUSIVE MODE;
ALTER TABLE public."DetallesFactura" ADD COLUMN "Cantidad" integer NULL;
ALTER TABLE public."DetallesFactura" ADD COLUMN "PrecioUnitario" numeric(10,2) NULL;
-- Solo los servicios representan una atención. No inferir cantidades de
-- productos antiguos a partir del precio actual del inventario.
UPDATE public."DetallesFactura"
SET "Cantidad" = 1, "PrecioUnitario" = "Subtotal"
WHERE "InsumoId" IS NULL;
ALTER TABLE public."DetallesFactura"
ADD CONSTRAINT "CK_DetallesFacturas_Cantidad" CHECK ("Cantidad" IS NULL OR "Cantidad" > 0);
ALTER TABLE public."DetallesFactura"
ADD CONSTRAINT "CK_DetallesFacturas_Precio" CHECK ("PrecioUnitario" IS NULL OR "PrecioUnitario" >= 0);
COMMIT;

