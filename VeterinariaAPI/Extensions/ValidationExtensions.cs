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
            // Length checks must not count surrounding spaces as meaningful clinical text.
            foreach (var property in dto.GetType().GetProperties())
            {
                if (property.GetValue(dto) is not string text) continue;
                foreach (var attribute in property.GetCustomAttributes(typeof(StringLengthAttribute), true).Cast<StringLengthAttribute>())
                {
                    if (!attribute.IsValid(text.Trim()))
                        resultados.Add(new ValidationResult(attribute.ErrorMessage ?? "Revise la longitud del texto.", [property.Name]));
                }
            }

            return resultados
                .GroupBy(r => r.MemberNames.FirstOrDefault() ?? string.Empty)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(r => r.ErrorMessage ?? "Dato inválido.").Distinct().ToArray()
                );
        }
    }
}
