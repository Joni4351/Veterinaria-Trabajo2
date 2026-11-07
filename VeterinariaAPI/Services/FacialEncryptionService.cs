using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace VeterinariaAPI.Services;

// The key is deliberately independent of JWT and is never sent to the browser.
public class FacialEncryptionService(IConfiguration configuration)
{
    public string Encrypt(double[] descriptor, int usuarioId)
    {
        byte[] key;
        try { key = Convert.FromBase64String(configuration["Biometrics:EncryptionKey"] ?? ""); }
        catch (FormatException) { throw new InvalidOperationException("Cifrado biométrico no configurado."); }
        if (key.Length != 32) throw new InvalidOperationException("Cifrado biométrico no configurado.");
        var plaintext = JsonSerializer.SerializeToUtf8Bytes(descriptor);
        try
        {
            var nonce = RandomNumberGenerator.GetBytes(12);
            var ciphertext = new byte[plaintext.Length];
            var tag = new byte[16];
            using var aes = new AesGcm(key, 16);
            aes.Encrypt(nonce, plaintext, ciphertext, tag, Encoding.UTF8.GetBytes($"VetClinic:face:v1:{usuarioId}"));
            return JsonSerializer.Serialize(new
            {
                version = 1, algorithm = "A256GCM", model = "face-api.js-0.22.2/faceRecognitionNet",
                nonce = Convert.ToBase64String(nonce), ciphertext = Convert.ToBase64String(ciphertext),
                tag = Convert.ToBase64String(tag)
            });
        }
        finally
        {
            CryptographicOperations.ZeroMemory(key);
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }
}
