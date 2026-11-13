-- Run once in the Supabase SQL editor as the table owner, before using the module.
-- Only modifies the existing public."ReconocimientoFacial" table. No rows are deleted.
BEGIN;
ALTER TABLE public."ReconocimientoFacial"
  ADD COLUMN IF NOT EXISTS "FechaActualizacion" timestamptz,
  ADD COLUMN IF NOT EXISTS "ConsentimientoFecha" timestamptz,
  ADD COLUMN IF NOT EXISTS "ConsentimientoAdministradorId" integer,
  ADD COLUMN IF NOT EXISTS "ConsentimientoVersion" text;

-- Replace the old 128-element plaintext-array constraint with an encrypted envelope.
DO $$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public."ReconocimientoFacial"'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%"DescriptorFacial"%'
  LOOP
    EXECUTE format('ALTER TABLE public."ReconocimientoFacial" DROP CONSTRAINT %I', item.conname);
  END LOOP;
END $$;

ALTER TABLE public."ReconocimientoFacial"
  ADD CONSTRAINT "ReconocimientoFacial_DescriptorCifrado_check" CHECK (COALESCE(
    jsonb_typeof("DescriptorFacial") = 'object'
    AND "DescriptorFacial"->>'version' = '1'
    AND "DescriptorFacial"->>'algorithm' = 'A256GCM'
    AND "DescriptorFacial"->>'model' = 'face-api.js-0.22.2/faceRecognitionNet'
    AND jsonb_typeof("DescriptorFacial"->'nonce') = 'string'
    AND jsonb_typeof("DescriptorFacial"->'tag') = 'string'
    AND jsonb_typeof("DescriptorFacial"->'ciphertext') = 'string'
    AND length("DescriptorFacial"->>'nonce') = 16
    AND length("DescriptorFacial"->>'tag') = 24
    AND length("DescriptorFacial"->>'ciphertext') > 0, false)) NOT VALID;

-- NOT VALID preserves any legacy plaintext rows, but all new/updated rows must be encrypted.
-- Re-register each legacy user with renewed consent, then VALIDATE the constraint (see docs).
ALTER TABLE public."ReconocimientoFacial" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."ReconocimientoFacial" FROM PUBLIC, anon, authenticated;
-- JWT roles in this app belong to the .NET API, not Supabase Auth.
-- The backend must connect as a trusted server-only role with appropriate RLS bypass/ownership.
COMMIT;
