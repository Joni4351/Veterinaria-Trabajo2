using VeterinariaAPI.Models;
using Microsoft.AspNetCore.Identity;

namespace VeterinariaAPI.Services
{
    public class AuthService
    {
        private readonly PasswordHasher<Usuario> hasher = new();

        public string HashPassword(Usuario usuario, string password)
        {
            return hasher.HashPassword(usuario, password);
        }

        public bool VerifyPassword(Usuario usuario, string passwordIntento)
        {
            if (string.IsNullOrEmpty(usuario.PasswordHash))
                return false;

            try
            {
                var result = hasher.VerifyHashedPassword(usuario, usuario.PasswordHash, passwordIntento);
                return result != PasswordVerificationResult.Failed;
            }
            catch (FormatException)
            {
                // Imported plaintext is not a password hash; it must be reset explicitly.
                return false;
            }
        }
    }
}
