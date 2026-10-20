using System;
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace VeterinariaAPI.Extensions
{
    /// <summary>
    /// Atributo de validación para verificar la validez de un RUT chileno usando el algoritmo Módulo 11.
    /// </summary>
    [AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter, AllowMultiple = false)]
    public class RutChilenoAttribute : ValidationAttribute
    {
        public RutChilenoAttribute() : base("El RUT ingresado no es un RUT chileno válido (debe cumplir formato y dígito verificador Módulo 11).")
        {
        }

        public override bool IsValid(object? value)
        {
            if (value is null) return true; // Si es requerido, se complementa con [Required]
            var rutStr = value.ToString()?.Trim();
            if (string.IsNullOrWhiteSpace(rutStr)) return true;

            return ValidarRut(rutStr);
        }

        public static bool ValidarRut(string rutCompleto)
        {
            if (string.IsNullOrWhiteSpace(rutCompleto)) return false;

            // Limpiar puntos, espacios y convertir a mayúsculas
            var limpio = rutCompleto.Replace(".", "").Replace(" ", "").Replace("-", "").ToUpper();

            // Debe tener entre 8 y 9 caracteres (7 u 8 dígitos de cuerpo + 1 dígito verificador)
            if (limpio.Length < 8 || limpio.Length > 9) return false;

            var cuerpo = limpio.Substring(0, limpio.Length - 1);
            var dvIngresado = limpio.Substring(limpio.Length - 1, 1);

            // El cuerpo debe ser estrictamente numérico
            if (!long.TryParse(cuerpo, out _)) return false;

            // Algoritmo oficial de Módulo 11
            int suma = 0;
            int multiplicador = 2;

            for (int i = cuerpo.Length - 1; i >= 0; i--)
            {
                suma += (cuerpo[i] - '0') * multiplicador;
                multiplicador = multiplicador == 7 ? 2 : multiplicador + 1;
            }

            int resto = suma % 11;
            int digitoEsperado = 11 - resto;

            string dvCalculado = digitoEsperado switch
            {
                11 => "0",
                10 => "K",
                _ => digitoEsperado.ToString()
            };

            return dvIngresado == dvCalculado;
        }
    }
}

