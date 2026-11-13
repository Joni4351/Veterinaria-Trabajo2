namespace VeterinariaAPI.Tests;

// External database access must be explicitly configured by the person running tests.
public sealed class ExternalDatabaseFactAttribute : FactAttribute
{
    public ExternalDatabaseFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("VETCLINIC_TEST_POSTGRES_CONNECTION")))
            Skip = "Integración externa omitida: configure VETCLINIC_TEST_POSTGRES_CONNECTION para habilitarla.";
    }
}
