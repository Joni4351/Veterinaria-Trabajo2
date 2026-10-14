using System.ComponentModel.DataAnnotations;

namespace VeterinariaAPI.Extensions
{
    public static class ValidationExtensions
    {
        public static Dictionary<string, string[]> Validar<T>(this T dto) where T : class
        {
            var contexto = new ValidationContext(dto);
            var resultados = new List<ValidationResult>();

            Validator.TryValidateObject(dto, contexto, resultados, validateAllProperties: true);

            return resultados
                .GroupBy(r => r.MemberNames.FirstOrDefault() ?? string.Empty)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(r => r.ErrorMessage ?? "Dato inválido.").ToArray()
                );
        }
    }
}