using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VeterinariaAPI.Migrations
{
    /// <inheritdoc />
    public partial class FlujoCitasSql : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE FUNCTION public.vetclinic_cita_transition() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                  IF OLD."Estado" IS DISTINCT FROM NEW."Estado" AND NOT (
                    (OLD."Estado" = 'Pendiente' AND NEW."Estado" IN ('Confirmada','Cancelada')) OR
                    (OLD."Estado" = 'Confirmada' AND NEW."Estado" IN ('En Curso','Cancelada')) OR
                    (OLD."Estado" = 'En Curso' AND NEW."Estado" IN ('Completada','Atendida'))
                  ) THEN RAISE EXCEPTION 'Transición de cita no permitida' USING ERRCODE = '23514'; END IF;
                  RETURN NEW;
                END; $$;
                CREATE TRIGGER vetclinic_cita_transition BEFORE UPDATE OF "Estado" ON public."Citas"
                FOR EACH ROW EXECUTE FUNCTION public.vetclinic_cita_transition();
                CREATE FUNCTION public.vetclinic_consulta_patient() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                  IF NEW."CitaId" IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public."Citas" c WHERE c."Id" = NEW."CitaId" AND (c."PacienteId" <> NEW."PacienteId" OR c."Estado" = 'Cancelada')
                  ) THEN RAISE EXCEPTION 'La cita debe ser del paciente y no estar cancelada' USING ERRCODE = '23514'; END IF;
                  RETURN NEW;
                END; $$;
                CREATE TRIGGER vetclinic_consulta_patient BEFORE INSERT OR UPDATE ON public."Consultas"
                FOR EACH ROW EXECUTE FUNCTION public.vetclinic_consulta_patient();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TRIGGER IF EXISTS vetclinic_consulta_patient ON public."Consultas";
                DROP FUNCTION IF EXISTS public.vetclinic_consulta_patient();
                DROP TRIGGER IF EXISTS vetclinic_cita_transition ON public."Citas";
                DROP FUNCTION IF EXISTS public.vetclinic_cita_transition();
                """);
        }
    }
}
