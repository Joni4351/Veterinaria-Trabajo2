namespace VeterinariaAPI.Services;

public static class AppointmentStates
{
    public static readonly string[] All = ["Pendiente", "Confirmada", "En Curso", "Completada", "Atendida", "Cancelada"];
    public static bool CanTransition(string previous, string next) => previous == next || previous switch {
        "Pendiente" => next is "Confirmada" or "Cancelada",
        "Confirmada" => next is "En Curso" or "Cancelada",
        "En Curso" => next is "Completada" or "Atendida",
        _ => false
    };
}
